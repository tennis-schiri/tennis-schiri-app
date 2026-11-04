import { BrowserTournamentStore, todayLocal } from "./storage.js";

const store = new BrowserTournamentStore();
const root = document.getElementById("app");
const dialogRoot = document.getElementById("dialog-root");
const noticeRoot = document.getElementById("toast-region");
let view = "home";
let search = "";

const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[char]);
const dateDisplay = iso => {
  if (!iso) return "Noch nicht festgelegt";
  const [year, month, day] = iso.split("-");
  return `${day}.${month}.${year}`;
};
const groupLabel = group => group === "stark" ? "Stark" : "Schwächer";
const count = t => {
  const present = t.participants.filter(p => p.present);
  return {
    total: t.participants.length,
    present: present.length,
    strong: present.filter(p => p.group === "stark").length,
    weaker: present.filter(p => p.group === "schwaecher").length,
    absent: t.participants.length - present.length
  };
};

function icon(name) {
  const paths = {
    plus: '<path d="M12 5v14M5 12h14"/>',
    home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    settings: '<path d="M4 7h16M4 17h16"/><circle cx="8" cy="7" r="2"/><circle cx="16" cy="17" r="2"/>',
    trophy: '<path d="M8 21h8M12 17v4M7 4h10v7a5 5 0 0 1-10 0V4Z"/><path d="M7 6H4v3a4 4 0 0 0 4 4M17 6h3v3a4 4 0 0 1-4 4"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    court: '<rect x="3" y="5" width="18" height="14" rx="1"/><path d="M12 5v14M3 12h18M7 5v14M17 5v14"/>',
    download: '<path d="M12 3v12m-4-4 4 4 4-4M4 17v4h16v-4"/>',
    upload: '<path d="M12 16V4m-4 4 4-4 4 4M4 18v3h16v-3"/>',
    check: '<path d="m5 12 5 5L20 7"/>',
    alert: '<path d="M12 3 2 21h20L12 3Z"/><path d="M12 9v4M12 17h.01"/>',
    edit: '<path d="m15 5 4 4M4 20l4.5-1 11-11a2.1 2.1 0 0 0-3-3l-11 11L4 20Z"/>',
    trash: '<path d="M4 7h16M10 11v7M14 11v7M6 7l1 14h10l1-14M9 7V4h6v3"/>',
    arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
    arrowleft: '<path d="m12 19-7-7 7-7M5 12h14"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 11v6M12 7h.01"/>'
  };
  return `<svg class="icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[name] || paths.info}</svg>`;
}

function header() {
  return `<header class="shell-header"><div class="header-inner">
    <button type="button" class="brand brand-button" data-action="home" aria-label="Zur Startseite">TENNIS<span>-SCHIRI</span><small> / TURNIERMANAGER</small></button>
    <span class="dev-chip">GESCHÜTZTE TESTVERSION · V0.2</span>
  </div></header>`;
}

function flash(message, type = "good") {
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = message;
  noticeRoot.appendChild(el);
  setTimeout(() => el.remove(), 4700);
}
function run(callback) {
  try { callback(); } catch (error) { flash(error.message || "Speichern fehlgeschlagen.", "bad"); }
}

function intro() {
  const tournaments = store.list();
  const savedTournaments = tournaments.length ? `<section class="saved-tournaments" aria-labelledby="saved-tournaments-heading">
    <div class="saved-tournaments-heading"><div><div class="eyebrow">HIER GEHT'S WEITER</div><h2 id="saved-tournaments-heading">Deine Turniere <span>(${tournaments.length})</span></h2></div></div>
    <div class="saved-tournaments-grid">${tournaments.map(t => `<article class="saved-tournament">
      <div class="saved-tournament-top"><span class="eyebrow">SCHLEIFCHENTURNIER</span><span class="mini-tag">${t.participants.length} Teilnehmende</span></div>
      <h3>${escapeHtml(t.name)}</h3>
      <p>${icon("calendar")} ${dateDisplay(t.date)} <span>·</span> ${t.courts.length} Plätze</p>
      <button class="btn primary" data-action="open-tournament" data-id="${escapeHtml(t.id)}">Turnier öffnen ${icon("arrow")}</button>
    </article>`).join("")}</div>
  </section>` : "";
  return `<main class="wrap welcome">
    <div class="eyebrow">Tennis-Schiri / Digitale Turnierorganisation</div>
    <h1>Weniger Orga.<br><em>Mehr Tennis.</em></h1>
    <p class="lead">Organisiere deine Schleifchenturniere, verwalte Teilnehmende und behalte den Überblick. Öffne ein bestehendes Turnier oder lege ein neues an.</p>
    <div class="welcome-actions">
      <button class="btn primary" data-action="new">${icon("plus")} ${tournaments.length ? "Neues Turnier anlegen" : "Erstes Turnier anlegen"}</button>
      <button class="btn ghost" data-action="demo">Beispielturnier laden</button>
    </div>
    ${savedTournaments}
    <div class="format-grid">
      <article class="format-card current"><div class="eyebrow">01 / IN ENTWICKLUNG</div><h2>Schleifchenturnier</h2><p>Teilnehmer, Spielstärken, Anwesenheit und Einstellungen an einem Ort.</p><span>VERSION 0.2</span></article>
      <article class="format-card muted"><div class="eyebrow">02 / GEPLANT</div><h2>Doppelturnier</h2><p>Feste Teams, Spielpläne, Livetabelle und Play-offs.</p><span>FOLGT</span></article>
      <article class="format-card muted"><div class="eyebrow">03 / GEPLANT</div><h2>One Point Cup</h2><p>Schnelle Duelle im K.-o.-System.</p><span>FOLGT</span></article>
    </div>
    ${browserNotice()}
  </main>`;
}

function browserNotice() {
  return `<div class="browser-notice">${icon("info")}<div><strong>Lokale Testversion</strong><p>Deine Eingaben werden nur in diesem Browser auf diesem Gerät gespeichert, nicht online synchronisiert. Nutze „Daten sichern“, um eine Sicherung herunterzuladen. Für echte Turniere mit mehreren Geräten ergänzen wir später eine Datenbank.</p></div></div>`;
}

function sidebar(t) {
  return `<aside class="sidebar">
    <div class="nav-label">DEIN TURNIER</div>
    <div class="tournament-picker"><label for="tournament-select" class="sr-only">Turnier wählen</label>
      <select id="tournament-select">
        ${store.list().map(item => `<option value="${escapeHtml(item.id)}" ${item.id === t.id ? "selected" : ""}>${escapeHtml(item.name)}</option>`).join("")}
      </select>
    </div>
    <nav class="nav-tabs" aria-label="Turnierbereich">
      <button data-action="home">${icon("home")} Startseite</button>
      <button data-action="tab" data-tab="overview" class="${view === "overview" ? "selected" : ""}">${icon("trophy")} Übersicht</button>
      <button data-action="tab" data-tab="participants" class="${view === "participants" ? "selected" : ""}">${icon("users")} Teilnehmende</button>
      <button data-action="tab" data-tab="settings" class="${view === "settings" ? "selected" : ""}">${icon("settings")} Einstellungen</button>
    </nav>
    <button class="btn side-new" data-action="new">${icon("plus")} Neues Turnier</button>
    <div class="sidebar-foot">INSTA TENNIS-SCHIRI<br><span>TESTBUILD · 2026</span></div>
  </aside>`;
}

function appTop(t) {
  return `<div class="toolbar">
    <div class="breadcrumb">TURNIERMANAGER <span>/</span> SCHLEIFCHENTURNIER</div>
    <div class="toolbar-actions"><button class="btn subtle small" data-action="export">${icon("download")} Daten sichern</button>
      <button class="btn subtle small" data-action="import">${icon("upload")} Daten laden</button>
      <input class="sr-only" id="import-file" type="file" accept=".json,application/json" aria-label="Sicherung laden">
    </div>
  </div>
  <div class="hero">
    <div class="hero-body"><span class="hero-mark">01 / SCHLEIFCHENTURNIER</span>
      <h1>${escapeHtml(t.name)}</h1><p>${icon("calendar")} ${dateDisplay(t.date)} <span>·</span> ${icon("clock")} ${escapeHtml(t.startTime)} Uhr <span>·</span> ${t.courts.length} Plätze</p>
    </div>
    <div class="hero-orbit" aria-hidden="true"><div class="tennis-ball"></div></div>
  </div>`;
}

function stat(label, value, sub, type = "") {
  return `<div class="stat ${type}"><span class="stat-label">${label}</span><strong>${value}</strong><span class="stat-sub">${sub}</span></div>`;
}

function readiness(t) {
  const c = count(t);
  if (c.present === 0) return `<div class="advice warn">${icon("alert")} <div><strong>Noch keine anwesenden Spieler.</strong><span>Erfasse Teilnehmende oder aktiviere ihre Anwesenheit.</span></div></div>`;
  if (c.strong !== c.weaker) return `<div class="advice warn">${icon("alert")} <div><strong>Stärkegruppen sind ungleich verteilt.</strong><span>Aktuell ${c.strong} Stark und ${c.weaker} Schwächer. Die spätere Auslosungslogik muss solche Fälle berücksichtigen.</span></div></div>`;
  if (c.present % 4 !== 0) return `<div class="advice neutral">${icon("info")} <div><strong>Nicht alle können gleichzeitig Doppel spielen.</strong><span>Aktuell sind ${c.present} Spieler anwesend. Pausen und Auffüller werden erst im Auslosungsmodul geplant.</span></div></div>`;
  return `<div class="advice good">${icon("check")} <div><strong>Teilnehmerübersicht ausgeglichen.</strong><span>Die Stärkegruppen sind gleich groß. Eine automatische Auslosung ist in Version 0.2 noch nicht enthalten.</span></div></div>`;
}

function overview(t) {
  const c = count(t);
  return `<section class="screen">
    <div class="section-header"><div><div class="eyebrow">DEIN TURNIER AUF EINEN BLICK</div><h2>Übersicht</h2></div>
      <button class="btn primary" data-action="add-player">${icon("plus")} Teilnehmer hinzufügen</button></div>
    <div class="stats-grid">
      ${stat("ANWESEND", c.present, `${c.total} insgesamt`, "bright")}
      ${stat("STARK", c.strong, "anwesende Spieler")}
      ${stat("SCHWÄCHER", c.weaker, "anwesende Spieler")}
      ${stat("AKTIVE PLÄTZE", t.courts.length, t.courts.join(" · "))}
    </div>
    ${readiness(t)}
    <div class="two-col">
      <section class="panel"><div class="panel-head"><h3>Turniereinstellungen</h3><button class="text-action" data-action="settings">Bearbeiten ${icon("arrow")}</button></div>
        <dl class="detail-list">
          <div><dt>Datum & Start</dt><dd>${dateDisplay(t.date)} · ${escapeHtml(t.startTime)} Uhr</dd></div>
          <div><dt>Spielzeit</dt><dd>${t.duration} Minuten</dd></div>
          <div><dt>Pause / Wechsel</dt><dd>${t.breakMinutes} Minuten</dd></div>
          <div><dt>Wertungsspiele je Spieler</dt><dd>${t.rounds}</dd></div>
          <div><dt>Plätze</dt><dd>${t.courts.join(", ")}</dd></div>
        </dl>
      </section>
      <section class="panel"><div class="panel-head"><h3>Als Nächstes</h3><span class="mini-tag">ROADMAP</span></div>
        <ol class="roadmap">
          <li class="done"><span>${icon("check")}</span><div><strong>Turnier & Teilnehmer</strong><small>Jetzt verfügbar</small></div></li>
          <li><span>2</span><div><strong>Automatische Auslosung</strong><small>In Entwicklung</small></div></li>
          <li><span>3</span><div><strong>Ergebnisse & Livetabelle</strong><small>Geplant</small></div></li>
        </ol>
      </section>
    </div>
  </section>`;
}

function playersMarkup(t) {
  const filtered = t.participants.filter(p => p.name.toLocaleLowerCase("de-DE").includes(search.toLocaleLowerCase("de-DE")))
    .sort((a, b) => Number(b.present) - Number(a.present) || a.name.localeCompare(b.name, "de"));
  if (!filtered.length) return `<div class="empty-players">${icon("users")}<strong>${t.participants.length ? "Keine passenden Teilnehmenden" : "Noch keine Teilnehmenden"}</strong><p>${t.participants.length ? "Versuche einen anderen Suchbegriff." : "Lege den ersten Spieler an, um zu starten."}</p></div>`;
  return `<div class="people-list"><div class="table-head"><span>NAME</span><span>STÄRKE</span><span>ANWESEND</span><span>AKTIONEN</span></div>
    ${filtered.map(p => `<div class="person-row">
      <div class="person-name"><span class="avatar">${escapeHtml(p.name.slice(0, 1).toLocaleUpperCase("de-DE"))}</span><strong>${escapeHtml(p.name)}</strong></div>
      <div><span class="group-pill ${p.group}">${groupLabel(p.group)}</span></div>
      <div><label class="presence"><input type="checkbox" data-action="presence" data-id="${escapeHtml(p.id)}" ${p.present ? "checked" : ""}><span>${p.present ? "Ja" : "Nein"}</span></label></div>
      <div class="row-actions"><button class="icon-btn" title="Teilnehmer bearbeiten" aria-label="${escapeHtml(p.name)} bearbeiten" data-action="edit-player" data-id="${escapeHtml(p.id)}">${icon("edit")}</button><button class="icon-btn danger" title="Teilnehmer entfernen" aria-label="${escapeHtml(p.name)} entfernen" data-action="remove-player" data-id="${escapeHtml(p.id)}">${icon("trash")}</button></div>
    </div>`).join("")}</div>`;
}

function participants(t) {
  const c = count(t);
  return `<section class="screen">
    <div class="section-header"><div><div class="eyebrow">SPIELERLISTE VERWALTEN</div><h2>Teilnehmende</h2><p class="section-sub">${c.total} erfasst · ${c.present} anwesend · ${c.absent} abwesend</p></div>
      <button class="btn primary" data-action="add-player">${icon("plus")} Teilnehmer hinzufügen</button></div>
    <div class="panel participants-panel">
      <div class="filter-row"><label class="search-wrap"><span class="sr-only">Teilnehmende suchen</span><input id="player-search" type="search" autocomplete="off" placeholder="Spieler suchen …" value="${escapeHtml(search)}"></label><span class="panel-count">${c.total} SPIELER</span></div>
      <div id="participant-results">${playersMarkup(t)}</div>
    </div>
    ${readiness(t)}
  </section>`;
}

function settings(t) {
  return `<section class="screen">
    <div class="section-header"><div><div class="eyebrow">MODUS & KONFIGURATION</div><h2>Einstellungen</h2></div><button class="btn primary" data-action="settings">${icon("edit")} Einstellungen ändern</button></div>
    <section class="panel setting-panel"><h3>Schleifchenturnier</h3>
      <dl class="detail-list">
        <div><dt>Turniername</dt><dd>${escapeHtml(t.name)}</dd></div>
        <div><dt>Datum</dt><dd>${dateDisplay(t.date)}</dd></div>
        <div><dt>Startzeit</dt><dd>${escapeHtml(t.startTime)} Uhr</dd></div>
        <div><dt>Spieldauer</dt><dd>${t.duration} Minuten</dd></div>
        <div><dt>Wechselzeit</dt><dd>${t.breakMinutes} Minuten</dd></div>
        <div><dt>Vorrundenspiele pro Spieler</dt><dd>${t.rounds}</dd></div>
        <div><dt>Aktive Plätze</dt><dd>${t.courts.join(", ")}</dd></div>
      </dl>
    </section>
    <section class="panel danger-panel"><h3>Turnier entfernen</h3><p>Entfernt dieses Turnier samt Spielerlisten aus diesem Browser. Erstelle vorher bei Bedarf eine Sicherung.</p><button class="btn danger-outline" data-action="delete-tournament">${icon("trash")} Turnier löschen</button></section>
  </section>`;
}

function render() {
  const t = store.active();
  root.innerHTML = header() + (!t || view === "home" ? intro() : `<div class="app-layout">${sidebar(t)}
    <main class="main-area">${appTop(t)}${view === "participants" ? participants(t) : view === "settings" ? settings(t) : overview(t)}
      ${browserNotice()}<footer>© Tennis-Schiri · Version 0.2 · Private Testversion</footer>
    </main></div>`);
}

function settingsFields(t = {}) {
  const courts = t.courts ?? [1,2,3,4,5,6];
  return `<div class="form-grid">
    <label class="field wide">Turniername<input name="name" required minlength="2" maxlength="90" value="${escapeHtml(t.name ?? "")}" placeholder="z. B. Sommer-Schleifchenturnier"></label>
    <label class="field">Datum<input name="date" type="date" required value="${escapeHtml(t.date ?? todayLocal())}"></label>
    <label class="field">Startzeit<input name="startTime" type="time" required value="${escapeHtml(t.startTime ?? "10:00")}"></label>
    <label class="field">Spieldauer<input name="duration" type="number" min="10" max="120" required value="${t.duration ?? 20}"></label>
    <label class="field">Wechsel / Pause (Min.)<input name="breakMinutes" type="number" min="0" max="60" required value="${t.breakMinutes ?? 10}"></label>
    <label class="field wide">Wertungsspiele je Spieler<input name="rounds" type="number" min="1" max="8" required value="${t.rounds ?? 4}"></label>
    <fieldset class="court-field wide"><legend>Aktive Plätze</legend><div class="court-grid">${Array.from({length:7}, (_,i) => i+1).map(n => `<label><input type="checkbox" name="courts" value="${n}" ${courts.includes(n) ? "checked" : ""}><span>Platz ${n}</span></label>`).join("")}</div></fieldset>
  </div>`;
}

function showDialog({ title, eyebrow, body, form = null, submit = "Speichern", destructive = false }) {
  dialogRoot.innerHTML = `<dialog class="app-dialog" aria-labelledby="dialog-title">
    <div class="dialog-top"><div><div class="eyebrow">${eyebrow}</div><h2 id="dialog-title">${title}</h2></div><button type="button" class="close-btn" data-action="close-dialog" aria-label="Schließen">×</button></div>
    ${form ? `<form data-form="${form}">${body}<div class="dialog-buttons"><button type="button" class="btn ghost" data-action="close-dialog">Abbrechen</button><button type="submit" class="btn ${destructive ? "danger-solid" : "primary"}">${submit}</button></div></form>` : body}
  </dialog>`;
  const dialog = dialogRoot.querySelector("dialog");
  dialog.addEventListener("click", event => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener("close", () => dialogRoot.replaceChildren(), { once:true });
  dialog.showModal();
}
function closeDialog() { dialogRoot.querySelector("dialog")?.close(); }
function showTournamentDialog(existing = null) {
  showDialog({ eyebrow: existing ? "TURNIER ANPASSEN" : "NEUES TURNIER", title: existing ? "Einstellungen ändern" : "Schleifchenturnier anlegen",
    form: existing ? "settings" : "create", submit: existing ? "Änderungen speichern" : "Turnier anlegen", body: settingsFields(existing ?? {}) });
}
function showPlayerDialog(t, p = null) {
  showDialog({ eyebrow: p ? "TEILNEHMER BEARBEITEN" : "SPIELERLISTE ERWEITERN", title: p ? "Teilnehmer bearbeiten" : "Neuen Teilnehmer erfassen",
    form: p ? "edit-player" : "add-player", submit: p ? "Änderungen speichern" : "Teilnehmer hinzufügen",
    body: `<input type="hidden" name="playerId" value="${escapeHtml(p?.id ?? "")}"><div class="form-grid">
      <label class="field wide">Vor- und Nachname<input name="name" required maxlength="80" autocomplete="off" value="${escapeHtml(p?.name ?? "")}" placeholder="z. B. Alex Beispiel"></label>
      <label class="field">Spielstärke<select name="group"><option value="stark" ${p?.group === "stark" ? "selected" : ""}>Stark</option><option value="schwaecher" ${p?.group !== "stark" ? "selected" : ""}>Schwächer</option></select></label>
      <label class="field checkbox-field"><input name="present" type="checkbox" ${p ? (p.present ? "checked" : "") : "checked"}> Ist anwesend</label>
    </div>` });
}

function readSettings(form) {
  const data = new FormData(form);
  const courts = data.getAll("courts").map(Number);
  if (!courts.length) throw new Error("Bitte mindestens einen Platz auswählen.");
  return {
    name: String(data.get("name") ?? "").trim(), date: String(data.get("date") ?? ""),
    startTime: String(data.get("startTime") ?? ""), duration: Number(data.get("duration")),
    breakMinutes: Number(data.get("breakMinutes")), rounds: Number(data.get("rounds")), courts
  };
}
function showDemo() {
  const t = store.create({ name:"Demo – Sommer-Schleifchenturnier", date:todayLocal(), startTime:"10:00", duration:20, breakMinutes:10, rounds:4, courts:[1,2,3,4] });
  const strong = ["Alex Bauer","Robin Fischer","Kim Hartmann","Toni Berger","Mika Vogel","Luca Beck","Jana Hoffmann","Sam Keller"];
  const weak = ["Chris Sommer","Nina Seidel","Pat Winter","Max Schulz","Lea König","Flo Neumann","Jules Meyer","Elli Brandt"];
  for (const name of strong) store.upsertParticipant(t.id, {name,group:"stark",present:true});
  for (const name of weak) store.upsertParticipant(t.id, {name,group:"schwaecher",present:true});
  view = "overview"; search = ""; render(); flash("Beispielturnier mit 16 Teilnehmenden angelegt.");
}

function downloadBackup() {
  const blob = new Blob([store.exportJson()], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "tennis-schiri-sicherung-" + todayLocal() + ".json";
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  flash("Sicherung heruntergeladen.");
}

document.addEventListener("click", event => {
  const trigger = event.target.closest("[data-action]");
  if (!trigger || trigger.matches("input[type=checkbox]")) return;
  const action = trigger.dataset.action, t = store.active();
  if (action === "close-dialog") return closeDialog();
  if (action === "home") { view = "home"; search = ""; render(); window.scrollTo?.(0, 0); return; }
  if (action === "open-tournament") return run(() => { store.setActive(trigger.dataset.id); view = "overview"; search = ""; render(); window.scrollTo?.(0, 0); });
  if (action === "tab") { view = trigger.dataset.tab; search = ""; render(); return; }
  if (action === "new") return showTournamentDialog();
  if (action === "demo") return run(showDemo);
  if (action === "add-player" && t) return showPlayerDialog(t);
  if (action === "edit-player" && t) {
    const p = t.participants.find(p => p.id === trigger.dataset.id);
    if (p) showPlayerDialog(t, p);
    return;
  }
  if (action === "remove-player" && t) {
    const p = t.participants.find(p => p.id === trigger.dataset.id);
    if (p && confirm(`„${p.name}“ aus diesem Turnier entfernen?`)) run(() => {
      store.removeParticipant(t.id, p.id); render(); flash("Teilnehmer entfernt.");
    });
    return;
  }
  if (action === "settings" && t) return showTournamentDialog(t);
  if (action === "delete-tournament" && t) {
    if (confirm(`Turnier „${t.name}“ samt allen Teilnehmenden unwiderruflich aus diesem Browser löschen?`)) run(() => {
      store.deleteTournament(t.id); view = "overview"; render(); flash("Turnier gelöscht.");
    });
    return;
  }
  if (action === "export") return run(downloadBackup);
  if (action === "import") return document.getElementById("import-file")?.click();
});

document.addEventListener("change", event => {
  const target = event.target, t = store.active();
  if (target.id === "tournament-select") return run(() => { store.setActive(target.value); search = ""; view = "overview"; render(); });
  if (target.matches("input[data-action='presence']") && t) return run(() => {
    store.toggleParticipant(t.id, target.dataset.id); render();
  });
  if (target.id === "import-file" && target.files?.[0]) {
    const file = target.files[0];
    if (file.size > 3000000) return flash("Die Sicherung ist zu groß (maximal 3 MB).", "bad");
    if (!confirm("Alle aktuell in diesem Browser gespeicherten Turniere durch die Sicherung ersetzen?")) {
      target.value = ""; return;
    }
    file.text().then(raw => run(() => { store.importJson(raw); view = "overview"; search = ""; render(); flash("Sicherung erfolgreich geladen."); }))
      .catch(() => flash("Datei konnte nicht gelesen werden.", "bad"));
  }
});

document.addEventListener("input", event => {
  if (event.target.id === "player-search") {
    search = event.target.value;
    const el = document.getElementById("participant-results"), t = store.active();
    if (el && t) el.innerHTML = playersMarkup(t);
  }
});

document.addEventListener("submit", event => {
  const form = event.target.closest("form[data-form]");
  if (!form) return;
  event.preventDefault();
  const kind = form.dataset.form;
  run(() => {
    if (kind === "create" || kind === "settings") {
      const values = readSettings(form);
      if (values.name.length < 2) throw new Error("Der Turniername muss mindestens 2 Zeichen haben.");
      if (kind === "create") store.create(values);
      else store.editTournament(store.active().id, values);
      view = "overview";
    } else if (kind === "add-player" || kind === "edit-player") {
      const data = new FormData(form), t = store.active();
      store.upsertParticipant(t.id, { name:data.get("name"), group:data.get("group"), present:data.has("present") }, kind === "edit-player" ? String(data.get("playerId")) : null);
      view = "participants";
    }
    closeDialog(); render(); flash("Gespeichert.");
  });
});

window.addEventListener("storage", event => { if (event.key === "tennis-schiri-tournaments-v1") { store.state = store.load(); render(); flash("Daten aus einem anderen Tab aktualisiert."); } });
render();
