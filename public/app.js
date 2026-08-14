// Dashboard NDS-Shop Bot — thème DSi, dark mode, onglets.
let channels = [];
let ticketsCache = [];
let permMatrix = {};

function $(id) { return document.getElementById(id); }

async function api(path, opts = {}) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (res.status === 401) { showLogin(); throw new Error("Unauthorized"); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.status);
  return data;
}

// ---- Theme ----
function applyTheme(dark) {
  document.documentElement.classList.toggle("dark", dark === "dark");
}
function initTheme() {
  const saved = localStorage.getItem("botTheme") || "dark";
  applyTheme(saved);
}
function toggleTheme() {
  const cur = document.documentElement.classList.contains("dark") ? "light" : "dark";
  localStorage.setItem("botTheme", cur);
  applyTheme(cur);
}

// ---- Auth ----
async function checkSession() {
  try {
    const s = await api("/api/session");
    if (s.user) { showApp(s.user); return true; }
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
  loadTickets("open");
  loadAnnouncements();
  loadGames("");
  loadUsers();
  loadLogs();
  loadSettings();
  loadChannels();
  loadPermissions();
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
      b.classList.remove("bg-[var(--primary)]", "text-white");
      b.classList.add("muted");
    });
    btn.classList.add("bg-[var(--primary)]", "text-white");
    btn.classList.remove("muted");
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.add("hidden"));
    $("tab-" + btn.dataset.tab).classList.remove("hidden");
    if (btn.dataset.tab === "tickets") loadTickets("open");
    if (btn.dataset.tab === "users") loadUsers();
    if (btn.dataset.tab === "permissions") loadPermissions();
    if (btn.dataset.tab === "logs") loadLogs();
  });
});

// ---- Status ----
async function loadStatus() {
  try {
    const s = await api("/api/status");
    $("stBot").textContent = s.bot?.online ? (s.bot?.username || "En ligne") : "Hors ligne";
    $("stBot").className = "text-xl font-bold mt-1 " + (s.bot?.online ? "text-green-500" : "text-red-500");
    $("stGuild").textContent = s.guild?.name || "—";
    $("stMembers").textContent = s.guild?.memberCount ?? "—";
    $("stGames").textContent = s.games ?? "—";
    if (s.bot?.uptime) {
      const u = Math.floor(s.bot.uptime / 1000);
      $("stUptime").textContent = `${Math.floor(u / 86400)}j ${Math.floor((u % 86400) / 3600)}h`;
    }
    // tickets ouverts
    try { $("stTickets").textContent = (await api("/api/tickets?status=open")).length; } catch {}
    try { $("stCommands").textContent = (await api("/api/commands?limit=100")).length; } catch {}
    try { $("stBlacklist").textContent = (await api("/api/blacklist")).length; } catch {}
  } catch {}
}

// ---- Tickets ----
async function loadTickets(status) {
  try {
    const tickets = await api("/api/tickets?status=" + (status || "open"));
    ticketsCache = tickets;
    const list = $("ticketsList");
    list.innerHTML = "";
    if (!tickets.length) { list.innerHTML = '<p class="muted text-sm">Aucun ticket.</p>'; return; }
    tickets.forEach((tk) => {
      const div = document.createElement("div");
      div.className = "card p-4";
      const badge = tk.status === "open" ? "bg-green-500" : "bg-slate-500";
      const last = tk.messages?.[tk.messages.length - 1];
      div.innerHTML = `
        <div class="flex items-center justify-between gap-3">
          <div class="min-w-0">
            <p class="font-semibold truncate">${tk.category} — ${tk.username || tk.userId}
              <span class="text-xs px-2 py-0.5 rounded-full ${badge} text-white ml-1">${tk.status}</span>
            </p>
            <p class="text-xs muted">${new Date(tk.createdAt).toLocaleString()} · <code class="text-[11px]">${tk.id}</code></p>
          </div>
          <div class="flex gap-2 shrink-0">
            ${tk.status === "open"
              ? `<button onclick="replyTicket('${tk.id}')" class="btn-primary px-3 py-1.5 rounded-lg text-xs font-medium">Répondre</button>
                 <button onclick="closeTicket('${tk.id}')" class="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-xs font-medium">Fermer</button>`
              : `<button onclick="reopenTicket('${tk.id}')" class="btn-accent px-3 py-1.5 rounded-lg text-xs font-medium">Rouvrir</button>`}
          </div>
        </div>
        ${tk.messages?.length ? `
          <details class="mt-2"><summary class="text-xs muted cursor-pointer">Conversation (${tk.messages.length})</summary>
            <div class="mt-2 space-y-1 max-h-48 overflow-y-auto text-xs">
              ${tk.messages.map((m) => `<p><b>${m.direction === "staff" ? "🛡️ " : ""}${m.author}</b>: ${m.content}</p>`).join("")}
            </div>
          </details>` : ""}
      `;
      list.appendChild(div);
    });
  } catch {}
}

async function replyTicket(id) {
  const msg = prompt("Votre réponse (envoyée en DM à l'utilisateur) :");
  if (!msg) return;
  try {
    await api(`/api/tickets/${id}/reply`, { method: "POST", body: JSON.stringify({ content: msg }) });
    loadTickets();
  } catch (err) { alert(err.message); }
}
async function closeTicket(id) {
  if (!confirm("Fermer ce ticket ?")) return;
  try { await api(`/api/tickets/${id}/close`, { method: "POST" }); loadTickets(); loadStatus(); } catch {}
}
async function reopenTicket(id) {
  try { await api(`/api/tickets/${id}/reopen`, { method: "POST" }); loadTickets(); } catch {}
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
      div.className = "card p-4";
      const badge = a.status === "sent" ? "bg-green-500" : "bg-amber-500";
      div.innerHTML = `
        <div class="flex items-center justify-between gap-3">
          <div class="min-w-0">
            <p class="font-semibold truncate">${a.title} <span class="text-xs px-2 py-0.5 rounded-full ${badge} text-white ml-1">${a.status}</span></p>
            <p class="text-xs muted">#${a.channel} · ${new Date(a.createdAt).toLocaleString()}</p>
          </div>
          <div class="flex gap-2 shrink-0">
            <button onclick="sendAnnouncement('${a.id}')" class="btn-primary px-3 py-1.5 rounded-lg text-xs font-medium">Envoyer</button>
            <button onclick="deleteAnnouncement('${a.id}')" class="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-xs font-medium">Suppr.</button>
          </div>
        </div>
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
      body: JSON.stringify({ title: $("anTitle").value, content: $("anContent").value, channel: $("anChannel").value }),
    });
    $("anTitle").value = ""; $("anContent").value = ""; $("anPreview").innerHTML = "";
    loadAnnouncements();
  } catch (err) { alert(err.message); }
}
async function sendAnnouncement(id) {
  if (!confirm("Envoyer cette annonce sur Discord ?")) return;
  try { await api(`/api/announcements/${id}/send`, { method: "POST" }); loadAnnouncements(); } catch (err) { alert(err.message); }
}
async function deleteAnnouncement(id) {
  if (!confirm("Supprimer ?")) return;
  try { await api(`/api/announcements/${id}`, { method: "DELETE" }); loadAnnouncements(); } catch {}
}

// ---- Games ----
async function searchGames() { loadGames($("gameSearch").value); }
async function loadGames(q) {
  try {
    const games = await api("/api/games?search=" + encodeURIComponent(q || ""));
    const list = $("gamesList");
    list.innerHTML = "";
    games.forEach((g) => {
      const div = document.createElement("div");
      div.className = "card p-4 flex items-center gap-3";
      div.innerHTML = `
        ${g.icon ? `<img src="${g.icon}" class="w-12 h-12 rounded-lg object-contain bg-[var(--muted)]" />` : ""}
        <div class="min-w-0">
          <a class="font-semibold text-sm truncate block hover:text-[var(--primary)]" target="_blank" href="https://db-nds-shop.fr/game/${g.fileName}">${g.title}</a>
          <p class="text-xs muted truncate">${g.author || ""} · ${g.version || ""}</p>
        </div>`;
      list.appendChild(div);
    });
  } catch {}
}

// ---- Users ----
async function loadUsers() {
  try {
    const q = $("userSearch")?.value || "";
    const users = await api("/api/users?search=" + encodeURIComponent(q));
    const list = $("usersList");
    list.innerHTML = "";
    if (!users.length) { list.innerHTML = '<p class="muted text-sm">Aucun profil encore.</p>'; return; }
    users.forEach((u) => {
      const div = document.createElement("div");
      div.className = "card p-3 flex items-center justify-between";
      div.innerHTML = `
        <div>
          <p class="font-medium text-sm">${u.username} <span class="text-xs muted">(${u.discordId})</span></p>
          <p class="text-xs muted">Niveau ${u.level} · ${u.xp} XP · ${u.totalMsgs} messages · ${u.favorites.length} favoris</p>
        </div>`;
      list.appendChild(div);
    });
  } catch {}
}

// ---- Permissions ----
async function loadPermissions() {
  try {
    const d = await api("/api/permissions");
    permMatrix = d.matrix || {};
    const container = $("permMatrix");
    container.innerHTML = "";
    const commands = Object.keys(permMatrix).sort();
    commands.forEach((cmd) => {
      const row = document.createElement("div");
      row.className = "flex items-center gap-2";
      row.innerHTML = `<span class="text-sm font-mono w-40 shrink-0">${cmd}</span>`;
      d.roles.forEach((role) => {
        const label = document.createElement("label");
        label.className = "flex items-center gap-1 text-xs";
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.checked = (permMatrix[cmd] || []).includes(role) || (permMatrix[cmd] || []).includes("*") || (permMatrix[cmd] || []).includes("@everyone");
        cb.dataset.cmd = cmd;
        cb.dataset.role = role;
        cb.addEventListener("change", () => updateMatrix(cmd, role, cb.checked));
        label.appendChild(cb);
        label.appendChild(document.createTextNode(role === "@everyone" ? "tous" : role));
        row.appendChild(label);
      });
      container.appendChild(row);
    });
  } catch {}
}
function updateMatrix(cmd, role, checked) {
  const arr = permMatrix[cmd] || [];
  const idx = arr.indexOf(role);
  if (checked && idx < 0) arr.push(role);
  if (!checked && idx >= 0) arr.splice(idx, 1);
  permMatrix[cmd] = arr;
}
async function savePermissions() {
  try {
    await api("/api/permissions", { method: "PUT", body: JSON.stringify({ matrix: permMatrix }) });
    alert("Matrice enregistrée !");
  } catch (err) { alert(err.message); }
}

// ---- Send ----
async function sendMessage() {
  const channel = channels.find((c) => c.name === $("sendChannel").value);
  if (!channel) return alert("Choisissez un salon");
  try {
    await api("/api/send", { method: "POST", body: JSON.stringify({ channelId: channel.id, content: $("sendContent").value }) });
    $("sendContent").value = "";
  } catch (err) { alert(err.message); }
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
    const lvl = await api("/api/leveling");
    $("setLevel").value = String(lvl.enabled);
  } catch {}
}
async function saveSetting(key, value) {
  try { await api("/api/settings/" + key, { method: "PUT", body: JSON.stringify({ value }) }); } catch (err) { alert(err.message); }
}
async function saveLeveling() {
  try {
    const lvl = await api("/api/leveling");
    lvl.enabled = $("setLevel").value === "true";
    await api("/api/leveling", { method: "PUT", body: JSON.stringify(lvl) });
  } catch (err) { alert(err.message); }
}

// ---- Poll ----
async function triggerPoll() {
  try {
    await api("/api/poll", { method: "POST" });
    alert("Scan des nouveaux jeux déclenché !");
    loadLogs(); loadStatus();
  } catch (err) { alert(err.message); }
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

initTheme();
checkSession();
