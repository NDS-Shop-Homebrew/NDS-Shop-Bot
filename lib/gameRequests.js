const { GUILD_ID, CHANNELS } = require("../config");
const { norm, baseTitle } = require("./norm");
const prisma = require("./db");

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

// Enregistre le post de demande au threadCreate
async function handleThreadCreate(client, thread) {
  if (!thread.parent || thread.parent.name !== CHANNELS.gameRequests) return;
  try {
    const starter = await thread.fetchStarterMessage().catch(() => null);
    const embed = starter?.embeds?.[0];
    const field = embed?.fields?.find((f) =>
      ["demandeur", "requester"].includes((f.name || "").toLowerCase())
    );
    if (!field?.value) return;

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

    await sendDm(
      client,
      field.value,
      `Ta demande **« ${thread.name} »** a bien été reçue. Elle sera traitée prochainement.\nSuivi : ${threadUrl(thread.parent.id, thread.id)}`
    );
  } catch (err) {
    await botLogSafe(`threadCreate game-request : ${err.message}`);
  }
}

// Notifie le demandeur quand le tag change
async function handleThreadUpdate(client, oldThread, newThread) {
  if (!newThread.parent || newThread.parent.name !== CHANNELS.gameRequests) return;
  try {
    const req = await prisma.gameRequest.findUnique({ where: { threadId: newThread.id } });
    if (!req) return;
    const newTagId = newThread.appliedTags?.[0] || null;
    if (newTagId === req.tagId) return;

    const tagName =
      newThread.parent.availableTags?.find((t) => t.id === newTagId)?.name || "mis à jour";
    const status = tagName.replace(/^\S+\s*/, "") || tagName;

    await prisma.gameRequest.update({
      where: { threadId: newThread.id },
      data: { tagId: newTagId, status },
    });

    const added = /Ajouté/.test(tagName);
    await sendDm(
      client,
      req.discordId,
      added
        ? `Bonne nouvelle : ton jeu **${req.title}** a été ajouté au catalogue !\n${threadUrl(newThread.parent.id, newThread.id)}`
        : `Le statut de ta demande **${req.title}** est passé à : **${tagName}**\n${threadUrl(newThread.parent.id, newThread.id)}`
    );
  } catch (err) {
    await botLogSafe(`threadUpdate game-request : ${err.message}`);
  }
}

// Quand un jeu est ajouté au catalogue, notifie les demandes ouvertes correspondantes
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
          `Bonne nouvelle : ton jeu **${req.title}** a été ajouté au catalogue !\nhttps://db-nds-shop.fr/game/${game.fileName}`
        );
        await prisma.gameRequest.update({
          where: { threadId: req.threadId },
          data: { status: "Ajouté", tagId: addedTag?.id || null },
        });
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

// Changement de statut depuis le dashboard (change le tag → threadUpdate notifie en MP)
const STATUS_TAGS = { "Demandé": "Demandé", "Ajouté": "Ajouté", "Refusé": "Refusé", "Doublon": "Doublon" };

async function setRequestStatus(client, threadId, status) {
  const keyword = STATUS_TAGS[status];
  if (!keyword) throw new Error(`Statut invalide: ${status}`);
  const thread = await client.channels.fetch(threadId).catch(() => null);
  if (!thread?.isThread?.() || !thread.parent?.isThreadOnly?.()) {
    throw new Error("Post introuvable");
  }
  const tag = thread.parent.availableTags?.find((t) => t.name.includes(keyword));
  if (!tag) throw new Error(`Tag "${keyword}" introuvable dans le forum`);
  if (thread.archived) await thread.setArchived(false).catch(() => {});
  await thread.setAppliedTags([tag.id]);
}

// Post supprimé → purge la ligne en base
async function handleThreadDelete(client, thread) {
  try {
    const deleted = await prisma.gameRequest.delete({ where: { threadId: thread.id } });
    await botLogSafe(`Demande supprimée (post retiré) : ${deleted.title}`);
  } catch {}
}

async function botLogSafe(msg) {
  try {
    const { botLog } = require("./botLog");
    await botLog("info", msg);
  } catch {}
}

module.exports = { handleThreadCreate, handleThreadUpdate, handleThreadDelete, notifyAddedGames, setRequestStatus, sendDm };