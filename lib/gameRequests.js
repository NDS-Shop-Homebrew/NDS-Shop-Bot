// Suivi des demandes de jeu (forum #game-requests) → MP au demandeur.
// - threadCreate : enregistre le post + son demandeur (discordId lu dans l'embed du post,
//   écrit par le backend au moment de la demande).
// - threadUpdate : si le tag change (Demandé → Ajouté/Refusé/Doublon), MP au demandeur.
// - notifyAddedGames : quand un jeu du catalogue correspond à une demande ouverte, MP + tag ✅ Ajouté.
const { GUILD_ID, CHANNELS } = require("../config");
const { norm, baseTitle } = require("./norm");
const prisma = require("./db");

// MP au demandeur (reprend le pattern tickets : client.users.fetch + user.send)
async function sendDm(client, discordId, text) {
  try {
    const user = await client.users.fetch(discordId).catch(() => null);
    if (user) await user.send(text);
    return true;
  } catch {
    return false;
  }
}

const threadUrl = (forumId, threadId) =>
  `https://discord.com/channels/${GUILD_ID}/${forumId}/${threadId}`;

// --- Enregistre un post de demande au threadCreate ---
async function handleThreadCreate(client, thread) {
  if (!thread.parent || thread.parent.name !== CHANNELS.gameRequests) return;
  try {
    // Premier message du post → chercher le champ "Demandeur" écrit par le backend
    const starter = await thread.fetchStarterMessage().catch(() => null);
    const embed = starter?.embeds?.[0];
    const field = embed?.fields?.find((f) => (f.name || "").toLowerCase() === "demandeur");
    if (!field?.value) return; // demande sans compte connecté → pas de suivi

    await prisma.gameRequest.upsert({
      where: { threadId: thread.id },
      update: { discordId: field.value, title: thread.name, tagId: thread.appliedTags?.[0] || null },
      create: {
        threadId: thread.id,
        discordId: field.value,
        title: thread.name,
        tagId: thread.appliedTags?.[0] || null,
        status: "Demandé",
      },
    });
    await botLogSafe(`Demande enregistrée : ${thread.name} (<@${field.value}>)`);
  } catch (err) {
    await botLogSafe(`threadCreate game-request : ${err.message}`);
  }
}

// --- Notifie le demandeur quand le tag change ---
async function handleThreadUpdate(client, oldThread, newThread) {
  if (!newThread.parent || newThread.parent.name !== CHANNELS.gameRequests) return;
  try {
    const req = await prisma.gameRequest.findUnique({ where: { threadId: newThread.id } });
    if (!req) return;
    const newTagId = newThread.appliedTags?.[0] || null;
    if (newTagId === req.tagId) return; // rien n'a changé

    const tagName =
      newThread.parent.availableTags?.find((t) => t.id === newTagId)?.name || "mis à jour";
    const status = tagName.replace(/^\S+\s*/, "") || tagName; // enlève l'emoji "✅ "

    await prisma.gameRequest.update({
      where: { threadId: newThread.id },
      data: { tagId: newTagId, status },
    });

    const added = /Ajouté/.test(tagName);
    await sendDm(
      client,
      req.discordId,
      added
        ? `🎉 Bonne nouvelle ! Ton jeu **${req.title}** a été ajouté au catalogue !\n${threadUrl(newThread.parent.id, newThread.id)}`
        : `📌 Le statut de ta demande **${req.title}** est passé à : **${tagName}**\n${threadUrl(newThread.parent.id, newThread.id)}`
    );
  } catch (err) {
    await botLogSafe(`threadUpdate game-request : ${err.message}`);
  }
}

// --- Quand un jeu est ajouté au catalogue : matche les demandes ouvertes ---
async function notifyAddedGames(client, addedGames) {
  try {
    const open = await prisma.gameRequest.findMany({ where: { status: "Demandé" } });
    if (!open.length || !addedGames.length) return;

    const guild = client.guilds.cache.get(GUILD_ID);
    const forum = guild?.channels.cache.find((c) => c.name === CHANNELS.gameRequests);
    const addedTag = forum?.availableTags?.find((t) => /Ajouté/.test(t.name));

    for (const game of addedGames) {
      const matches = open.filter((r) => baseTitle(r.title) === baseTitle(game.title));
      for (const req of matches) {
        await sendDm(
          client,
          req.discordId,
          `🎉 Bonne nouvelle ! Ton jeu **${req.title}** a été ajouté au catalogue !\nhttps://db-nds-shop.fr/game/${game.fileName}`
        );
        await prisma.gameRequest.update({
          where: { threadId: req.threadId },
          data: { status: "Ajouté", tagId: addedTag?.id || null },
        });
        // Met le tag ✅ Ajouté sur le post (uniquement si le forum est encore là)
        if (forum && addedTag && guild) {
          const thread = forum.threads.cache.get(req.threadId);
          if (thread) await thread.setAppliedTags([addedTag.id]).catch(() => {});
        }
      }
    }
  } catch (err) {
    await botLogSafe(`notifyAddedGames : ${err.message}`);
  }
}

async function botLogSafe(msg) {
  try {
    const { botLog } = require("./botLog");
    await botLog("info", msg);
  } catch {}
}

module.exports = { handleThreadCreate, handleThreadUpdate, notifyAddedGames, sendDm };