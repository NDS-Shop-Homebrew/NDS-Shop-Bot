// Dashboard NDS-Shop Bot — logique front.
let channels = [];

function $(id) { return document.getElementById(id); }

async function api(path, opts = {}) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (res.status === 401) {
    showLogin();
    throw new Error("Unauthorized");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.status);
  return data;
}

// ---- Auth ----
async function checkSession() {
  try {
    const s = await api("/api/session");
    if (s.user) {
      showApp(s.user);
      return true;
    }
  } catch {}
  showLogin();
  return false;
}

function showLogin() {
  $("login").classList.remove("hidden");
  $("login").classList.add("flex");
  $("app").classList.add("hidden");
}

function showApp(user) {
  $("login").classList.add("hidden");
  $("login").classList.remove("flex");
  $("app").classList.remove("hidden");
  $("userName").textContent = user.username || user.email;
  loadStatus();
  loadAnnouncements();
  loadGames("");
  loadLogs();
  loadSettings();
  loadChannels();
}

async function logout() {
  await fetch("/api/auth/sign-out", { method: "POST" }).catch(() => {});
  showLogin();
}

$("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  $("loginError").classList.add("hidden");
  try {
    const res = await fetch("/api/auth/sign-in/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: $("email").value, password: $("password").value }),
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.message || "Identifiants invalides");
    await checkSession();
  } catch (err) {
    $("loginError").textContent = err.message;
    $("loginError").classList.remove("hidden");
  }
});

// ---- Tabs ----
document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => {
      b.classList.remove("bg-slate-800", "text-white");
      b.classList.add("text-slate-400");
    });
    btn.classList.add("bg-slate-800", "text-white");
    btn.classList.remove("text-slate-400");
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.add("hidden"));
    $("tab-" + btn.dataset.tab).classList.remove("hidden");
  });
});

// ---- Status ----
async function loadStatus() {
  try {
    const s = await api("/api/status");
    const online = s.bot?.online;
    $("botStatusBadge").textContent = online ? "En ligne" : "Hors ligne";
    $("botStatusBadge").className = "text-xs px-2 py-0.5 rounded-full " + (online ? "bg-emerald-600 text-white" : "bg-red-600 text-white");
    $("stBot").textContent = s.bot?.username || "—";
    $("stGuild").textContent = s.guild?.name || "—";
    $("stMembers").textContent = s.guild?.memberCount ?? "—";
    $("stGames").textContent = s.games ?? "—";
  } catch {}
}

// ---- Channels ----
async function loadChannels() {
  try {
    channels = await api("/api/channels");
    const opts = (sel) => {
      sel.innerHTML = "";
      channels.forEach((c) => {
        const o = document.createElement("option");
        o.value = c.name;
        o.textContent = `${c.parent} / #${c.name}`;
        sel.appendChild(o);
      });
    };
    opts($("anChannel"));
    opts($("sendChannel"));
  } catch {}
}

// ---- Announcements ----
async function loadAnnouncements() {
  try {
    const items = await api("/api/announcements");
    const list = $("announcementsList");
    list.innerHTML = "";
    items.forEach((a) => {
      const div = document.createElement("div");
      div.className = "bg-slate-900 rounded-xl p-4 border border-slate-800";
      const badge = a.status === "sent" ? "bg-emerald-600" : "bg-amber-600";
      div.innerHTML = `
        <div class="flex items-center justify-between gap-3">
          <div class="min-w-0">
            <p class="font-semibold truncate">${a.title} <span class="text-xs px-2 py-0.5 rounded-full ${badge} text-white ml-1">${a.status}</span></p>
            <p class="text-xs text-slate-400">#${a.channel} · ${new Date(a.createdAt).toLocaleString()}${a.sentAt ? " · envoyée " + new Date(a.sentAt).toLocaleString() : ""}</p>
          </div>
          <div class="flex gap-2 shrink-0">
            <button onclick="sendAnnouncement('${a.id}')" class="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-medium">Envoyer</button>
            <button onclick="deleteAnnouncement('${a.id}')" class="px-3 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/40 text-red-400 text-xs font-medium">Suppr.</button>
          </div>
        </div>
        <details class="mt-2">
          <summary class="text-xs text-slate-400 cursor-pointer">Voir le contenu</summary>
          <pre class="mt-2 text-xs whitespace-pre-wrap bg-slate-800 rounded p-3">${escapeHtml(a.content)}</pre>
        </details>
      `;
      list.appendChild(div);
    });
  } catch {}
}

$("anContent").addEventListener("input", () => {
  $("anPreview").innerHTML = marked.parse($("anContent").value || "*Aperçu…*");
});

async function saveAnnouncement() {
  try {
    await api("/api/announcements", {
      method: "POST",
      body: JSON.stringify({
        title: $("anTitle").value,
        content: $("anContent").value,
        channel: $("anChannel").value,
      }),
    });
    $("anTitle").value = "";
    $("anContent").value = "";
    $("anPreview").innerHTML = "";
    loadAnnouncements();
  } catch (err) {
    alert(err.message);
  }
}

async function sendAnnouncement(id) {
  if (!confirm("Envoyer cette annonce sur Discord ?")) return;
  try {
    await api(`/api/announcements/${id}/send`, { method: "POST" });
    loadAnnouncements();
  } catch (err) {
    alert(err.message);
  }
}

async function deleteAnnouncement(id) {
  if (!confirm("Supprimer cette annonce ?")) return;
  try {
    await api(`/api/announcements/${id}`, { method: "DELETE" });
    loadAnnouncements();
  } catch {}
}

// ---- Games ----
async function searchGames() {
  const q = $("gameSearch").value;
  loadGames(q);
}

async function loadGames(q) {
  try {
    const games = await api("/api/games?search=" + encodeURIComponent(q || ""));
    const list = $("gamesList");
    list.innerHTML = "";
    games.forEach((g) => {
      const div = document.createElement("div");
      div.className = "bg-slate-900 rounded-xl p-4 border border-slate-800 flex items-center gap-3";
      div.innerHTML = `
        ${g.icon ? `<img src="${g.icon}" class="w-12 h-12 rounded-lg object-contain bg-slate-800" />` : ""}
        <div class="min-w-0">
          <a class="font-semibold text-sm truncate block hover:text-indigo-400" target="_blank" href="https://db-nds-shop.fr/game/${g.fileName}">${g.title}</a>
          <p class="text-xs text-slate-400 truncate">${g.author || ""} · ${g.version || ""}</p>
        </div>
      `;
      list.appendChild(div);
    });
  } catch {}
}

// ---- Send ----
async function sendMessage() {
  const channel = channels.find((c) => c.name === $("sendChannel").value);
  if (!channel) return alert("Choisissez un salon");
  try {
    await api("/api/send", {
      method: "POST",
      body: JSON.stringify({ channelId: channel.id, content: $("sendContent").value }),
    });
    $("sendContent").value = "";
  } catch (err) {
    alert(err.message);
  }
}

// ---- Logs ----
async function loadLogs() {
  try {
    const logs = await api("/api/logs?limit=100");
    const list = $("logsList");
    list.innerHTML = "";
    logs.forEach((l) => {
      const color = l.level === "error" ? "text-red-400" : l.level === "warn" ? "text-amber-400" : "text-slate-400";
      const div = document.createElement("div");
      div.className = color;
      div.textContent = `[${new Date(l.createdAt).toLocaleString()}] ${l.message}`;
      list.appendChild(div);
    });
  } catch {}
}

// ---- Settings ----
async function loadSettings() {
  try {
    const s = await api("/api/settings");
    $("setWelcome").value = s.welcomeMessage || "";
    $("setPoll").value = s.pollInterval || 300000;
  } catch {}
}

async function saveSetting(key, value) {
  try {
    await api("/api/settings/" + key, { method: "PUT", body: JSON.stringify({ value }) });
  } catch (err) {
    alert(err.message);
  }
}

// ---- Poll ----
async function triggerPoll() {
  try {
    await api("/api/poll", { method: "POST" });
    alert("Scan des nouveaux jeux déclenché !");
    loadLogs();
  } catch (err) {
    alert(err.message);
  }
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

checkSession();
