import { BrowserTournamentStore, todayLocal } from "./storage.js?v=061";
import { normalizeRibbonResult, updateRibbonMatchResult, ribbonStandings } from "./results.js?v=061";
import { generateRibbonSpecialRound, resetRibbonSpecialRound } from "./special.js?v=061";
import { analyzeRibbonDraw, drawSignature, generateRibbonDraw, verifyRibbonDraw } from "./draw.js?v=061";
import { createRibbonFinals, updateRibbonFinalResult, verifyRibbonFinals, resetRibbonFinals, ribbonFinalPreview } from "./finals.js?v=061";
import { renderRibbonFinals } from "./finals-ui.js?v=061";
import { euroCents,euroText,euroInput,entryDue,feesOverview,plannedRound,clockFor,changeRoundClock } from "./operations.js?v=061";
import { renderFees,cashPaymentBody,renderClockToolbar,refreshClockDisplays } from "./operations-ui.js?v=061";
import {publicLiveSnapshot,createLiveSecrets,readLiveSecrets,saveLiveSecrets,clearLiveSecrets,publishLive,remoteLiveUrl} from "./remote-live.js?v=061";

const store = new BrowserTournamentStore();
let remoteRequest=null;
let remoteLastSent=0;
let remoteStopPending=false;
let remoteErrorShown=false;
async function pushRemote() {
  if(remoteRequest||remoteStopPending)return;
  const t=store.active(),keys=t&&readLiveSecrets(t.id);
  if(!t||!keys)return;
  remoteRequest=publishLive(keys,publicLiveSnapshot(t));
  try{await remoteRequest;remoteLastSent=Date.now();remoteErrorShown=false;}
  catch(e){if(!remoteErrorShown){remoteErrorShown=true;flash("Fernanzeige: "+e.message,"bad");}}
  finally{remoteRequest=null;}
}

const root = document.getElementById("app");
const dialogRoot = document.getElementById("dialog-root");
const noticeRoot = document.getElementById("toast-region");
let view = "home";
let search = "";
let drawOpenRound = 0;
let editingResult = null; // Nur die aktuell geöffnete Bearbeitung, nicht als Turnierdaten speichern.
let editingFinal = null; // Korrekturformular einer Endrunden-Begegnung.

const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[char]);
const dateDisplay = iso => {
  if (!iso) return "Noch nicht festgelegt";
  const [year, month, day] = iso.split("-");
  return `${day}.${month}.${year}`;
};
const groupLabel = group => group === "stark" ? "Stark" : "Schwächer";
const courtName = (t, number) => t.courtLabels?.[number] || `Platz ${number}`;
const courtSummary = t => {
  if (t.courts.length <= 4) return t.courts.map(number => courtName(t, number)).join(" · ");
  const renamed = t.courts.filter(number => t.courtLabels?.[number]).length;
  if (renamed) return `${t.courts.length} Plätze · ${renamed} individuell benannt`;
  const consecutive = t.courts.every((number, index) => number === t.courts[0] + index);
  return consecutive ? `Platz ${t.courts[0]}–${t.courts[t.courts.length - 1]}` : `${t.courts.length} Plätze`;
};
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
    monitor: '<rect x="2.5" y="3.5" width="19" height="13.5" rx="2"/><path d="M8 21h8M12 17v4"/>',
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
    <span class="dev-chip">GESCHÜTZTE TESTVERSION · V0.6.1</span>
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
      <button class="btn ghost" data-action="demo-filler">Auffüllrunde testen</button>
    </div>
    ${savedTournaments}
    <div class="format-grid">
      <article class="format-card current"><div class="eyebrow">01 / IN ENTWICKLUNG</div><h2>Schleifchenturnier</h2><p>Teilnehmer, Spielstärken, Anwesenheit und Einstellungen an einem Ort.</p><span>VERSION 0.6.1</span></article>
      <article class="format-card muted"><div class="eyebrow">02 / GEPLANT</div><h2>Doppelturnier</h2><p>Feste Teams, Spielpläne, Livetabelle und Play-offs.</p><span>FOLGT</span></article>
      <article class="format-card muted"><div class="eyebrow">03 / GEPLANT</div><h2>One Point Cup</h2><p>Schnelle Duelle im K.-o.-System.</p><span>FOLGT</span></article>
    </div>
    ${browserNotice()}
  </main>`;
}

function browserNotice() {
  return `<div class="browser-notice">${icon("info")}<div><strong>Lokale Testversion</strong><p>Die vollständigen Turnier- und Kassendaten bleiben auf diesem Gerät gespeichert. Nur wenn du die Fernanzeige ausdrücklich aktivierst, werden Spielpaarungen, Ergebnisse, Rundenuhr und Schleifchen-Zwischenstand vorübergehend auf dem Server veröffentlicht. Nutze „Daten sichern“ für eine JSON-Sicherung. Die gemeinsame Bearbeitung auf mehreren Geräten ist noch nicht möglich.</p></div></div>`;
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
      <button data-action="tab" data-tab="participants" class="${view === "participants"||view === "fees" ? "selected" : ""}">${icon("users")} Check-in & Nenngeld</button>
      <button data-action="tab" data-tab="draw" class="${view === "draw" ? "selected" : ""}">${icon("court")} Auslosung</button>
      <button data-action="tab" data-tab="finals" class="${view === "finals" ? "selected" : ""}">${icon("trophy")} Endrunde</button>
      <button data-action="tab" data-tab="settings" class="${view === "settings" ? "selected" : ""}">${icon("settings")} Einstellungen</button>
    </nav>
    <button class="btn side-new" data-action="new">${icon("plus")} Neues Turnier</button>
    <div class="sidebar-foot">INSTA TENNIS-SCHIRI<br><span>TESTBUILD · 2026</span></div>
  </aside>`;
}

function remoteShareControls(t) {
  const keys=readLiveSecrets(t.id);
  const url=keys?remoteLiveUrl(keys.channel,window.location.href):null;
  return `<div class="remote-live-panel">
    <div><strong>${icon("monitor")} Fernanzeige für andere Geräte</strong>
      <p>${keys?"Aktiv – Spielstände werden etwa alle drei Sekunden veröffentlicht.":
        "Für einen eigenen Laptop, ein Tablet oder einen Smart-TV. Es werden nur Spielplan, Ergebnisse und Zwischenstand übertragen."}</p>
      <small>Geschützter Testbereich: Am anderen Gerät ist gegebenenfalls das Webspace-Passwort nötig.</small></div>
    <div class="remote-live-actions">
      ${keys?`<button type="button" class="btn primary small" data-action="remote-copy">Live-Link kopieren</button>
        <a class="btn subtle small" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">Fernanzeige öffnen</a>
        <button type="button" class="btn ghost small" data-action="remote-stop">Freigabe beenden</button>`:
        '<button type="button" class="btn primary small" data-action="remote-start">Fernanzeige aktivieren</button>'}
    </div>
  </div>`;
}
function appTop(t) {
  return `<div class="toolbar">
    <div class="breadcrumb">TURNIERMANAGER <span>/</span> SCHLEIFCHENTURNIER</div>
    <div class="toolbar-actions"><a class="btn live-open-link small" href="./live.html?turnier=${encodeURIComponent(t.id)}" target="_blank" rel="noopener" title="Eigenes Fenster für einen zweiten Monitor öffnen">${icon("monitor")} Live-Monitor öffnen</a>
      <button class="btn subtle small" data-action="export">${icon("download")} Daten sichern</button>
      <button class="btn subtle small" data-action="import">${icon("upload")} Daten laden</button>
      <input class="sr-only" id="import-file" type="file" accept=".json,application/json" aria-label="Sicherung laden">
    </div>
  </div>
  <div class="hero">
    <div class="hero-body"><span class="hero-mark">01 / SCHLEIFCHENTURNIER</span>
      <h1>${escapeHtml(t.name)}</h1><p>${icon("calendar")} ${dateDisplay(t.date)} <span>·</span> ${icon("clock")} ${escapeHtml(t.startTime)} Uhr <span>·</span> ${t.courts.length} Plätze</p>
    </div>
    <div class="hero-orbit" aria-hidden="true"><div class="tennis-ball"></div></div>
  </div>${remoteShareControls(t)}`;
}

function stat(label, value, sub, type = "") {
  return `<div class="stat ${type}"><span class="stat-label">${label}</span><strong>${value}</strong><span class="stat-sub">${sub}</span></div>`;
}

function readiness(t) {
  const c = count(t);
  if (c.present === 0) return `<div class="advice warn">${icon("alert")} <div><strong>Noch keine anwesenden Spieler.</strong><span>Erfasse Teilnehmende oder aktiviere ihre Anwesenheit.</span></div></div>`;
  if (c.strong !== c.weaker) return `<div class="advice warn">${icon("alert")} <div><strong>Stärkegruppen sind ungleich verteilt.</strong><span>Aktuell ${c.strong} Stark und ${c.weaker} Schwächer. Im Bereich „Auslosung“ werden die erforderlichen Auffüller und Spielkontingente geprüft.</span></div></div>`;
  if (c.present % 4 !== 0) return `<div class="advice neutral">${icon("info")} <div><strong>Nicht alle können gleichzeitig Doppel spielen.</strong><span>Aktuell sind ${c.present} Spieler anwesend. Pausen und Auffüller werden erst im Auslosungsmodul geplant.</span></div></div>`;
  return `<div class="advice good">${icon("check")} <div><strong>Teilnehmerübersicht ausgeglichen.</strong><span>Die Stärkegruppen sind gleich groß. Die normale Vorrunde kann im Bereich „Auslosung“ erstellt werden.</span></div></div>`;
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
      ${stat("AKTIVE PLÄTZE", t.courts.length, courtSummary(t))}
    </div>
    <div class="fee-overview-line"><strong>Nenngeld (bar):</strong>
      ${euroText(feesOverview(t).received)} erhalten · ${euroText(feesOverview(t).open)} offen
      <button class="text-action" data-action="tab" data-tab="participants">Check-in & Kasse öffnen ${icon("arrow")}</button></div>
    ${readiness(t)}
    <div class="two-col">
      <section class="panel"><div class="panel-head"><h3>Turniereinstellungen</h3><button class="text-action" data-action="settings">Bearbeiten ${icon("arrow")}</button></div>
        <dl class="detail-list">
          <div><dt>Datum & Start</dt><dd>${dateDisplay(t.date)} · ${escapeHtml(t.startTime)} Uhr</dd></div>
          <div><dt>Spielzeit</dt><dd>${t.duration} Minuten</dd></div>
          <div><dt>Pause / Wechsel</dt><dd>${t.breakMinutes} Minuten</dd></div>
          <div><dt>Wertungsspiele je Spieler</dt><dd>${t.rounds}</dd></div>
          <div><dt>Plätze</dt><dd>${courtSummary(t)}</dd></div>
           <div><dt>Nenngeld</dt><dd>${euroText(t.entryFeeCents||0)} je Person · bar</dd></div>
        </dl>
      </section>
      <section class="panel"><div class="panel-head"><h3>Als Nächstes</h3><span class="mini-tag">ROADMAP</span></div>
        <ol class="roadmap">
          <li class="done"><span>${icon("check")}</span><div><strong>Turnier & Teilnehmer</strong><small>Jetzt verfügbar</small></div></li>
          <li class="done"><span>${icon("check")}</span><div><strong>Normale Vorrunden auslosen</strong><small>Jetzt als Testversion verfügbar</small></div></li>
          <li><span>3</span><div><strong>Ergebnisse & Schleifchenwertung</strong><small>Jetzt als Testversion verfügbar</small></div></li>
          <li><span>4</span><div><strong>Auffüllrunde und Endrunde</strong><small>Geplant</small></div></li>
        </ol>
      </section>
    </div>
  </section>`;
}

function playersMarkup(t) {
  const all=feesOverview(t);
  const payments=new Map(all.players.map(p=>[p.id,p]));
  const tiers=t.feeCategories||[{id:"standard",name:"Standard",amountCents:t.entryFeeCents||0}];
  const filtered=t.participants.filter(p=>p.name.toLocaleLowerCase("de-DE").includes(search.toLocaleLowerCase("de-DE")))
    .sort((a,b)=>Number(b.present)-Number(a.present)||a.name.localeCompare(b.name,"de"));
  if(!filtered.length)return `<div class="empty-players">${icon("users")}<strong>${t.participants.length?"Keine passenden Teilnehmenden":"Noch keine Teilnehmenden"}</strong><p>${t.participants.length?"Bitte andere Suchbegriffe verwenden.":"Lege zuerst einen Spieler an."}</p></div>`;
  return `<div class="draw-table-scroll"><table class="draw-ranking-table unified-players-table">
    <thead><tr><th>Teilnehmer</th><th>Stärke</th><th>Anwesend</th><th>Nenngeld-Kategorie</th><th>Soll</th><th>Bar erhalten</th><th>Offen / Status</th><th>Aktionen</th></tr></thead>
    <tbody>${filtered.map(p=>{
      const fee=payments.get(p.id);
      const status={frei:"Kostenfrei",offen:"Offen",teilweise:"Teilzahlung",bezahlt:"Bar bezahlt",überzahlung:"Überzahlung"}[fee.status];
      return `<tr class="${p.present?"player-is-present":"player-is-absent"}">
        <td><div class="checkin-name"><span class="avatar">${escapeHtml(p.name.slice(0,1).toLocaleUpperCase("de-DE"))}</span><strong>${escapeHtml(p.name)}</strong></div></td>
        <td><span class="group-pill ${p.group}">${groupLabel(p.group)}</span></td>
        <td><label class="presence"><input type="checkbox" data-action="presence" data-id="${escapeHtml(p.id)}" ${p.present?"checked":""}><span>${p.present?"Ja":"Nein"}</span></label></td>
        <td><label class="sr-only" for="tier-${escapeHtml(p.id)}">Nenngeld-Kategorie von ${escapeHtml(p.name)}</label>
          <select id="tier-${escapeHtml(p.id)}" class="player-tier-select" data-action="participant-tier" data-id="${escapeHtml(p.id)}">
            ${tiers.map(c=>`<option value="${escapeHtml(c.id)}" ${(p.feeTierId||"standard")===c.id?"selected":""}>${escapeHtml(c.name)} – ${euroText(c.amountCents)}</option>`).join("")}
          </select>
          ${fee.custom?'<small class="individual-fee-note">Individueller Betrag</small>':""}
        </td>
        <td>${euroText(fee.due)}</td>
        <td>${euroText(fee.paid)}</td>
        <td><div class="checkin-fee-status"><strong>${euroText(fee.open)}</strong><span class="fee-status ${fee.status}">${status}</span></div></td>
        <td><div class="checkin-actions">
          ${fee.open>0?`<button type="button" class="btn subtle small" data-action="fee-full" data-id="${escapeHtml(p.id)}">Rest bar erhalten</button>`:""}
          <button type="button" class="draw-edit-btn" data-action="fee-edit" data-id="${escapeHtml(p.id)}">${icon("edit")} Zahlung</button>
          <button type="button" class="icon-btn" title="Teilnehmer bearbeiten" aria-label="${escapeHtml(p.name)} bearbeiten" data-action="edit-player" data-id="${escapeHtml(p.id)}">${icon("edit")}</button>
          <button type="button" class="icon-btn danger" title="Teilnehmer entfernen" aria-label="${escapeHtml(p.name)} entfernen" data-action="remove-player" data-id="${escapeHtml(p.id)}">${icon("trash")}</button>
        </div></td>
      </tr>`;
    }).join("")}</tbody>
  </table></div>`;
}
function participants(t) {
  const c=count(t),a=feesOverview(t);
  return `<section class="screen">
    <div class="section-header"><div><div class="eyebrow">TEILNEHMER / CHECK-IN / BAR-KASSE</div><h2>Teilnehmende & Nenngeld</h2>
      <p class="section-sub">${c.total} angemeldet · ${c.present} anwesend · ${c.absent} abwesend · Barzahlung vor Ort</p></div>
      <button class="btn primary" data-action="add-player">${icon("plus")} Teilnehmer hinzufügen</button></div>
    <div class="draw-summary checkin-stats">
      ${stat("ANWESEND",c.present,`${c.total} angemeldet`)}
      ${stat("NENNGELD SOLL",euroText(a.expected),"Alle Anmeldungen")}
      ${stat("BAR ERHALTEN",euroText(a.received),`${a.paidCount} vollständig bezahlt`)}
      ${stat("NOCH OFFEN",euroText(a.open),`${a.openCount} offene Beträge`)}
    </div>
    ${a.extra?`<div class="advice warn">${icon("alert")}<div><strong>Überzahlungen prüfen</strong><span>${euroText(a.extra)} über dem fälligen Betrag erfasst.</span></div></div>`:""}
    <section class="panel participants-panel">
      <div class="panel-head checkin-panel-head"><div><h3>Check-in & Kassenliste</h3><p>Anwesenheit, Nenngeld-Kategorie und tatsächliche Barzahlung direkt je Spieler verwalten.</p></div>
        <button type="button" class="btn subtle small" data-action="tab" data-tab="settings">Kategorien verwalten</button></div>
      <div class="filter-row"><label class="search-wrap"><span class="sr-only">Teilnehmende suchen</span><input id="player-search" type="search" autocomplete="off" placeholder="Spieler suchen …" value="${escapeHtml(search)}"></label><span class="panel-count">${c.total} SPIELER</span></div>
      <div id="participant-results">${playersMarkup(t)}</div>
      <p class="draw-table-note">Eine Person kann ihre Anwesenheit und ihre Zahlung unabhängig voneinander haben. Die Kategorie bestimmt den fälligen Betrag, sofern kein individueller Sonderbetrag eingetragen ist.</p>
    </section>
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
        <div><dt>Aktive Plätze</dt><dd>${courtSummary(t)}</dd></div>
         <div><dt>Nenngeld</dt><dd>${euroText(t.entryFeeCents||0)} Standardbetrag · bar</dd></div>
      </dl>
    </section>
    <section class="panel setting-panel fee-categories-panel">
      <div class="panel-head"><div><h3>Nenngeld-Kategorien</h3><p>Beispiele: Jugend, Erwachsene, Mitglieder. Die Kategorien sind unabhängig von der Spielstärke.</p></div>
        <button class="btn subtle small" data-action="fee-category-add">${icon("plus")} Kategorie hinzufügen</button></div>
      <div class="fee-category-list">
        ${(t.feeCategories||[]).map(c=>`<div class="fee-category-row">
          <div><strong>${escapeHtml(c.name)}</strong><small>${c.id==="standard"?"Grundtarif":"Zusätzlicher Tarif"} · ${t.participants.filter(p=>(p.feeTierId||"standard")===c.id).length} Spieler</small></div>
          <strong class="fee-category-price">${euroText(c.amountCents)}</strong>
          <div class="fee-category-actions">
            <button type="button" class="btn subtle small" data-action="fee-category-edit" data-id="${escapeHtml(c.id)}">${icon("edit")} Bearbeiten</button>
            ${c.id!=="standard"?`<button type="button" class="btn ghost small" data-action="fee-category-remove" data-id="${escapeHtml(c.id)}">Entfernen</button>`:""}
          </div>
        </div>`).join("")}
      </div>
      <p class="draw-table-note">Bestehende Barzahlungen bleiben erhalten, wenn du einen Tarif änderst. Kategorien, die noch Spielern zugeordnet sind, können nicht gelöscht werden.</p>
    </section>
    <section class="panel setting-panel court-panel">
      <div class="panel-head court-panel-head"><div><h3>Platzbezeichnungen</h3><p>Standardmäßig Platz 1, Platz 2 usw. Die Namen kannst du beliebig anpassen.</p></div>
        <button class="btn subtle small" data-action="edit-courts">${icon("edit")} Plätze benennen</button></div>
      <div class="court-name-grid">${t.courts.slice(0, 30).map(number => `<div class="court-name-item"><span>#${number}</span><strong>${escapeHtml(courtName(t, number))}</strong></div>`).join("")}</div>
      ${t.courts.length > 30 ? `<p class="court-more-note">Weitere ${t.courts.length - 30} Plätze kannst du über „Plätze benennen“ bearbeiten.</p>` : ""}
    </section>
    <section class="panel danger-panel"><h3>Turnier entfernen</h3><p>Entfernt dieses Turnier samt Spielerlisten aus diesem Browser. Erstelle vorher bei Bedarf eine Sicherung.</p><button class="btn danger-outline" data-action="delete-tournament">${icon("trash")} Turnier löschen</button></section>
  </section>`;
}

function drawPreview(t) {
  const saved=t.draw;
  let spec=null,error=null;
  try{spec=analyzeRibbonDraw(t);}catch(e){error=e.message;}
  const verification=saved ? verifyRibbonDraw(t,saved) : null;
  const valid=verification?.ok===true;
  let standings=null, standingsError=null;
  if(valid)try{standings=ribbonStandings(t);}catch(e){standingsError=e.message;}
  const statline=spec?`<div class="draw-summary">
    ${stat("ANWESEND",spec.strong+spec.weak,`${spec.strong} Stark · ${spec.weak} Schwächer`)}
    ${stat("SPIELE / PERSON",spec.target,"reguläre Wertungsspiele")}
    ${stat("NORMALE MATCHES",spec.expectedNormalMatches,"vor einer möglichen Auffüllrunde")}
    ${stat("SPIELE JE RUNDE",spec.maxMatches,"maximal gleichzeitig")}
  </div>`:"";
  const explanation=error?`<div class="advice warn">${icon("alert")}<div><strong>Auslosung noch nicht möglich</strong><span>${escapeHtml(error)}</span></div></div>`:
    valid ? `<div class="advice good">${icon("check")}<div><strong>Normale Runden geprüft</strong><span>Jeder Spieler hat die geplanten regulären Einsätze; kein Doppel ist innerhalb einer Runde doppelt besetzt.</span></div></div>`:
    saved ? `<div class="advice warn">${icon("alert")}<div><strong>Gespeicherte Auslosung ist nicht mehr gültig</strong><span>${escapeHtml(verification?.errors?.[0]||"Bitte erneut auslosen.")}</span></div></div>`:
    `<div class="advice neutral">${icon("info")}<div><strong>Bereit für die Auslosung</strong><span>Erst beim Klicken wird ein Spielplan erzeugt und im Browser gespeichert.</span></div></div>`;
  const nameById=new Map(t.participants.map(p=>[p.id,p.name]));
  const displayName=id=>escapeHtml(nameById.get(id)||"Unbekannter Spieler");
  const displaySlot=(match,slot)=>{
    const name=displayName(match.slots[slot]);
    return match.fillerMask?.[slot] ?
      `${name} <span class="draw-filler-tag" title="Dieses Zusatzspiel zählt für diese Person nicht als Wertungsspiel oder Schleifchen.">Auffüller · ohne Wertung</span>`
      : name;
  };
  const allRounds=saved?.specialRound?[...saved.rounds,saved.specialRound]:saved?.rounds||[];
  const roundCards=valid && standings ? `<div class="draw-rounds">${allRounds.map((round,index)=>`
    <details class="draw-round" ${index===drawOpenRound?"open":""}>
      <summary><span><strong>${index===saved.rounds.length?"Auffüllrunde":`Runde ${index+1}`}</strong><small>Plan ${plannedRound(t,index).start}–${plannedRound(t,index).end} Uhr · ${standings.perRound[index].complete} von ${round.matches.length} Ergebnissen</small></span><span class="draw-expand">Ansehen</span></summary>
      ${renderClockToolbar(t,index,{icon})}
      <div class="live-round-choice"><button type="button" class="btn ${t.liveDisplay?.mode==="round"&&t.liveDisplay.index===index?"primary":"subtle"} small" data-action="live-round" data-round="${index}">${icon("monitor")} ${t.liveDisplay?.mode==="round"&&t.liveDisplay.index===index?"Auf Live-Monitor ausgewählt":"Diese Runde live zeigen"}</button></div>
      <div class="draw-match-list">${round.matches.map((m,matchIndex)=>{
        const result=normalizeRibbonResult(m.result);
        const finished=result.winner!==null;
        const editing=finished && editingResult?.tournamentId===t.id &&
          editingResult.round===index && editingResult.match===matchIndex;
        const resultLabel=finished && result.score1!==null ? `${result.score1} : ${result.score2}` : "Sieg";
        return `<article class="draw-match ${finished?"draw-match-finished":""}">
          <div class="draw-court">${icon("court")} ${escapeHtml(courtName(t,m.court))} <span class="draw-match-time">${plannedRound(t,index).start}–${plannedRound(t,index).end} Uhr</span> ${finished?'<span class="draw-result-complete">Beendet</span>':''}</div>
          <div class="draw-team ${finished?(result.winner===1?"is-winner":"is-loser"):""}${m.fillerMask?.some(Boolean)?" has-filler":""}">
            <span>TEAM 1 ${result.winner===1?`<span class="draw-winner-pill">${icon("check")} Sieger</span>`:""}</span>
            <strong>${displaySlot(m,0)} <em>+</em> ${displaySlot(m,1)}</strong>
          </div>
          <div class="draw-versus ${finished?"draw-versus-final":""}" ${finished?`aria-label="Ergebnis: ${resultLabel}, Sieger Team ${result.winner}"`:""}>
            ${finished ? result.score1!==null ? `<strong>${result.score1}<span>:</span>${result.score2}</strong><small>GAMES</small>`
             : `<strong class="draw-no-score">${icon("check")}</strong><small>SIEG</small>` : "VS"}
          </div>
          <div class="draw-team ${finished?(result.winner===2?"is-winner":"is-loser"):""}${m.fillerMask?.some(Boolean)?" has-filler":""}">
            <span>TEAM 2 ${result.winner===2?`<span class="draw-winner-pill">${icon("check")} Sieger</span>`:""}</span>
            <strong>${displaySlot(m,2)} <em>+</em> ${displaySlot(m,3)}</strong>
          </div>
          ${finished && !editing ? `<div class="draw-match-controls">
            <button type="button" class="draw-edit-btn" data-action="draw-edit-result" data-round="${index}" data-match="${matchIndex}" ${saved.finals || saved.specialRound && index<saved.rounds.length ? 'disabled title="Bitte zuerst die Auffüllrunde zurücknehmen."' : ""} aria-label="Ergebnis in Runde ${index+1} auf ${escapeHtml(courtName(t,m.court))} ändern">${icon("edit")} Ergebnis ändern</button>
          </div>` : ""}
          ${!finished || editing ? `<form class="draw-result-form" data-form="draw-result" data-round="${index}" data-match="${matchIndex}">
            <label class="draw-score-label">Games Team 1<input name="score1" type="number" min="0" max="99" step="1" inputmode="numeric" placeholder="–" value="${result.score1??""}"></label>
            <label class="draw-score-label">Games Team 2<input name="score2" type="number" min="0" max="99" step="1" inputmode="numeric" placeholder="–" value="${result.score2??""}"></label>
            <label class="draw-winner-label">Siegerteam
              <select name="winner" aria-label="Siegerteam, Runde ${index+1}, Platz ${escapeHtml(courtName(t,m.court))}">
                <option value="" ${result.winner===null?"selected":""}>Noch offen</option>
                <option value="1" ${result.winner===1?"selected":""}>Team 1</option>
                <option value="2" ${result.winner===2?"selected":""}>Team 2</option>
              </select>
            </label>
            <div class="draw-result-actions">
              <button type="submit" class="btn subtle small">Ergebnis speichern</button>
              ${editing ? `<button type="button" class="btn ghost small" data-action="draw-cancel-edit">Abbrechen</button>` : ""}
            </div>
          </form>` : ""}
        </article>`;
      }).join("")}</div>
    </details>`).join("")}</div>`:"";
  const scoreboard=standings ? `<section class="panel draw-ranking" aria-label="Aktueller Schleifchenstand">
    <div class="panel-head"><div><h3>Schleifchen-Zwischenstand</h3><p>${standings.completeMatches} von ${standings.totalMatches} Ergebnissen erfasst</p></div><span class="mini-tag">${standings.complete?"VORRUNDE AUSGEWERTET":"LÄUFT"}</span></div>
    <div class="draw-table-scroll"><table class="draw-ranking-table">
      <thead><tr><th>Rang</th><th>Spieler</th><th>Gruppe</th><th>Spiele</th><th>Schleifen</th><th>Niederlagen</th><th>Quote</th></tr></thead>
      <tbody>${standings.participants.map((p,i)=>`<tr><td>${i+1}.</td><td><strong>${escapeHtml(p.name)}</strong></td>
        <td>${groupLabel(p.group)}</td><td>${p.played} / ${p.target}</td><td class="draw-ribbons">${p.ribbons}</td><td>${p.losses}</td><td>${Math.round(p.quote*100)} %</td></tr>`).join("")}</tbody>
    </table></div>
    <p class="draw-table-note">Reihenfolge wie in der Vorlage: zuerst Schleifen, dann gespielte Partien, dann Name. Ein Schleifchen erhalten beide Personen des Siegerteams.</p>
  </section>`:"";
  const resultProgress=standings ? `<div class="advice ${standings.complete?"good":"neutral"}">${icon(standings.complete?"check":"info")}<div>
    <strong>${standings.complete?"Alle normalen Ergebnisse erfasst":"Ergebnisse können jetzt eingetragen werden"}</strong>
    <span>${standings.completeMatches} von ${standings.totalMatches} Partien entschieden. Siegerteam ausdrücklich wählen; Game-Zahlen sind optional. Bei identischer Game-Zahl muss das Siegerteam gesondert feststehen.</span>
  </div></div>`:"";
  const specialNotice=spec?.special ? `<section class="panel ribbon-filler-panel">
    <div class="panel-head"><div><h3>Auffüllrunde</h3><p>${spec.special.matches} zusätzliche ${spec.special.matches===1?"Begegnung":"Begegnungen"} in der letzten Runde</p></div>
      ${saved?.specialRound?'<span class="mini-tag">AUSGELOST</span>':'<span class="mini-tag">NOCH OFFEN</span>'}</div>
    <div class="ribbon-filler-content">
      <p>${spec.special.fillerStrong} starke und ${spec.special.fillerWeak} schwächere Auffüllspieler kommen zusätzlich zum Einsatz. Diese erhalten dafür <strong>kein zusätzliches Wertungsspiel oder Schleifchen</strong>; die regulären Spieler schließen ihre Spielquote ab.</p>
      ${saved?.specialRound ? `<div class="advice ${standings?.specialProgress?.complete?"good":"neutral"}">${icon("info")}<div>
        <strong>${standings?.specialProgress?.complete?"Auffüllrunde abgeschlossen":"Auffüllrunde wurde ausgelost"}</strong>
        <span>${standings?.specialProgress?.completeMatches??0} von ${standings?.specialProgress?.totalMatches??spec.special.matches} Zusatzspielen entschieden. Reguläre Vorrundenergebnisse sind jetzt gesperrt. Für Korrekturen zuerst die Auffüllrunde zurücknehmen.</span>
      </div></div>
      <button class="btn subtle small" data-action="draw-special-reset" ${saved.finals?'disabled title="Zuerst Endrunde zurücknehmen."':""}>${icon("arrowleft")} Auffüllrunde zurücknehmen</button>`
       : `${standings?.complete ?
         `<div class="advice ${standings.fillerReady?"good":"warn"}">${icon(standings.fillerReady?"check":"alert")}<div><strong>${standings.fillerReady?"Auslosung bereit":"Nicht genügend geeignete Auffüllspieler"}</strong>
          <span>Geeignet mit 0 oder 1 Schleifchen: ${standings.eligible.strong.length} starke (${spec.special.fillerStrong} benötigt), ${standings.eligible.weak.length} schwächere (${spec.special.fillerWeak} benötigt).</span>
        </div></div>`
         : `<div class="advice neutral">${icon("info")}<div><strong>Ergebnisse fehlen noch</strong><span>Die Auffüllrunde kann erst nach allen normalen Vorrundenergebnissen ausgelost werden. Noch ${standings?.pendingMatches??"?"} Ergebnisse offen.</span></div></div>`}
        <button class="btn primary" data-action="draw-special-generate" ${!valid||!standings?.fillerReady?"disabled":""}>${icon("court")} Auffüllrunde auslosen</button>`}
    </div>
  </section>` : valid ? `<div class="advice good">${icon("check")}<div><strong>Keine Auffüllrunde erforderlich</strong><span>Die regulären Wertungsspiele sind vollständig eingeplant.</span></div></div>`:"";
  const resultsError=standingsError?`<div class="advice warn">${icon("alert")}<div><strong>Ergebnisse konnten nicht gelesen werden.</strong><span>${escapeHtml(standingsError)}</span></div></div>`:"";
  return `<section class="screen">
    <div class="section-header"><div><div class="eyebrow">SCHLEIFCHENTURNIER / VORRUNDE</div><h2>Auslosung</h2>
      <p class="section-sub">1 starke + 1 schwächere Person je Doppelteam · 3 oder 4 Wertungsspiele pro Person</p></div>
      <button class="btn primary" data-action="draw-generate" ${error?"disabled":""}>${icon("court")} ${saved?"Neu auslosen":"Normale Runden auslosen"}</button></div>
    <div class="live-auto-choice"><button type="button" class="btn subtle small" data-action="live-auto">${icon("monitor")} ${t.liveDisplay?"Monitor auf Automatik stellen":"Monitor: Automatische Rundenauswahl"}</button></div>
    ${statline}${explanation}${resultsError}${resultProgress}${roundCards}${scoreboard}${specialNotice}
    <div class="browser-notice">${icon("info")}<div><strong>Testversion der Auslosung</strong><p>Die normalen Vorrunden können ausgelost und Ergebnisse sowie Schleifen erfasst werden. Eine lesende Server-Fernanzeige ist nach bewusster Freigabe möglich, aber die Turnierverwaltung bleibt lokal und nicht gemeinsam bearbeitbar. Die Endrunde findest du in einem eigenen Menüpunkt. Auffüller spielen ohne eigene Wertung. Bitte noch nicht für ein echtes Turnier verwenden.</p></div></div>
  </section>`;
}
function render() {
  const t = store.active();
  root.innerHTML = header() + (!t || view === "home" ? intro() : `<div class="app-layout">${sidebar(t)}
    <main class="main-area">${appTop(t)}${view === "participants"||view === "fees" ? participants(t) : view === "settings" ? settings(t) : view === "draw" ? drawPreview(t) : view === "finals" ? renderRibbonFinals(t,{icon,escapeHtml,courtName,groupLabel,editingFinal}) : overview(t)}
      ${browserNotice()}<footer>© Tennis-Schiri · Version 0.6.1 · Private Testversion</footer>
    </main></div>`);
}

function settingsFields(t = {}) {
  const courtCount = t.courts?.length ?? 6;
  return `<div class="form-grid">
    <label class="field wide">Turniername<input name="name" required minlength="2" maxlength="90" value="${escapeHtml(t.name ?? "")}" placeholder="z. B. Sommer-Schleifchenturnier"></label>
    <label class="field">Datum<input name="date" type="date" required value="${escapeHtml(t.date ?? todayLocal())}"></label>
    <label class="field">Startzeit<input name="startTime" type="time" required value="${escapeHtml(t.startTime ?? "10:00")}"></label>
    <label class="field">Spieldauer<input name="duration" type="number" min="10" max="120" required value="${t.duration ?? 20}"></label>
    <label class="field">Wechsel / Pause (Min.)<input name="breakMinutes" type="number" min="0" max="60" required value="${t.breakMinutes ?? 10}"></label>
    <label class="field wide">Standard-Nenngeld (€) · bar
      <input name="entryFee" inputmode="decimal" pattern="[0-9]+([,.][0-9]{1,2})?" required
        value="${euroInput(t.entryFeeCents??0)}" placeholder="0,00">
      <span class="field-hint">Betrag der Standard-Kategorie. Weitere Kategorien (z. B. Jugend, Erwachsene) unter Einstellungen hinzufügen.</span></label>
    <label class="field wide">Wertungsspiele je Spieler<select name="rounds" required>
      <option value="3" ${Number(t.rounds)===3?"selected":""}>3 Wertungsspiele</option>
      <option value="4" ${Number(t.rounds ?? 4)===4?"selected":""}>4 Wertungsspiele</option>
    </select><span class="field-hint">Schleifchenturnier nach unserer Vorlage: 3 oder 4 Wertungsspiele pro Person.</span></label>
    <label class="field wide">Anzahl der Plätze<input name="courtCount" type="number" min="1" max="1000" step="1" inputmode="numeric" required value="${courtCount}"><span class="field-hint">Frei wählbar, auch mehr als 7. Bei neuen Turnieren werden die Plätze fortlaufend ab 1 nummeriert.</span></label>
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
function showCourtNamesDialog(t) {
  showDialog({ eyebrow: "INDIVIDUELLE PLATZNAMEN", title: "Plätze benennen", form: "court-names",
    submit: "Platznamen speichern",
    body: `<p class="court-editor-help">Die Nummer bleibt die interne Kennung des Platzes. Als sichtbaren Namen kannst du z. B. „Center Court“, „Halle 2“ oder „Platz 12“ eintragen. Leere Felder bekommen wieder den Standardnamen.</p>
    <div class="court-editor">${t.courts.map(number => `<label class="court-editor-row"><span>Platz ${number}</span><input name="court-${number}" type="text" maxlength="60" value="${escapeHtml(courtName(t, number))}" placeholder="Platz ${number}" autocomplete="off"></label>`).join("")}</div>` });
}
function readCourtNames(form, t) {
  const data = new FormData(form);
  const labels = {};
  const names = new Set();
  for (const number of t.courts) {
    const name = String(data.get(`court-${number}`) ?? "").trim() || `Platz ${number}`;
    if (name.length > 60) throw new Error("Ein Platzname darf maximal 60 Zeichen haben.");
    const key = name.toLocaleLowerCase("de-DE");
    if (names.has(key)) throw new Error(`Der Platzname „${name}“ wurde mehrfach vergeben.`);
    names.add(key);
    if (name !== `Platz ${number}`) labels[number] = name;
  }
  return labels;
}
function showPlayerDialog(t, p = null) {
  showDialog({ eyebrow: p ? "TEILNEHMER BEARBEITEN" : "SPIELERLISTE ERWEITERN", title: p ? "Teilnehmer bearbeiten" : "Neuen Teilnehmer erfassen",
    form: p ? "edit-player" : "add-player", submit: p ? "Änderungen speichern" : "Teilnehmer hinzufügen",
    body: `<input type="hidden" name="playerId" value="${escapeHtml(p?.id ?? "")}"><div class="form-grid">
      <label class="field wide">Vor- und Nachname<input name="name" required maxlength="80" autocomplete="off" value="${escapeHtml(p?.name ?? "")}" placeholder="z. B. Alex Beispiel"></label>
      <label class="field">Spielstärke<select name="group"><option value="stark" ${p?.group === "stark" ? "selected" : ""}>Stark</option><option value="schwaecher" ${p?.group !== "stark" ? "selected" : ""}>Schwächer</option></select></label>
      <label class="field checkbox-field"><input name="present" type="checkbox" ${p ? (p.present ? "checked" : "") : "checked"}> Ist anwesend</label>
      <label class="field wide">Nenngeld-Kategorie<select name="feeTierId">
        ${(t.feeCategories||[{id:"standard",name:"Standard",amountCents:t.entryFeeCents||0}]).map(c=>
          `<option value="${escapeHtml(c.id)}" ${(p?.feeTierId||"standard")===c.id?"selected":""}>${escapeHtml(c.name)} – ${euroText(c.amountCents)}</option>`).join("")}
      </select></label>
      <label class="field wide">Individuelles Nenngeld (€) · optional
        <input name="feeOverride" inputmode="decimal" pattern="([0-9]+([,.][0-9]{1,2})?)?" placeholder="Standardbetrag" value="${p?.feeOverrideCents==null?"":euroInput(p.feeOverrideCents)}">
        <span class="field-hint">Leer = Standardbetrag · 0,00 € = kostenfrei.</span></label>
    </div>` });
}

function showFeeCategoryDialog(t,id=null) {
  const cat=(t.feeCategories||[]).find(c=>c.id===id);
  showDialog({eyebrow:"BAR-NENNGELD / TARIFE",title:cat?"Kategorie bearbeiten":"Neue Nenngeld-Kategorie",
    form:"fee-category",submit:cat?"Änderungen speichern":"Kategorie hinzufügen",
    body:`<input type="hidden" name="categoryId" value="${escapeHtml(cat?.id||"")}">
      <div class="form-grid">
        <label class="field wide">Kategorie-Bezeichnung
          <input name="categoryName" required maxlength="40" value="${escapeHtml(cat?.name||"")}" placeholder="z. B. Jugend oder Erwachsene"></label>
        <label class="field wide">Nenngeld (€) · nur Barzahlung
          <input name="categoryAmount" required inputmode="decimal" pattern="[0-9]+([,.][0-9]{1,2})?"
            value="${euroInput(cat?.amountCents??0)}"></label>
      </div>`});
}
function readSettings(form) {
  const data = new FormData(form);
  const courtCount = Number(data.get("courtCount"));
  if (!Number.isSafeInteger(courtCount) || courtCount < 1 || courtCount > 1000) {
    throw new Error("Bitte eine ganze Zahl zwischen 1 und 1000 Plätzen eingeben.");
  }
  // Bei unveränderter Platzanzahl die bisherige Auswahl auch bei älteren Turnieren beibehalten.
  const existing = form.dataset.form === "settings" ? store.active()?.courts : null;
  const courts = existing?.length === courtCount
    ? [...existing] : Array.from({length: courtCount}, (_, i) => i + 1);
  return {
    name: String(data.get("name") ?? "").trim(), date: String(data.get("date") ?? ""),
    startTime: String(data.get("startTime") ?? ""), duration: Number(data.get("duration")),
    breakMinutes: Number(data.get("breakMinutes")), rounds: Number(data.get("rounds")), entryFeeCents:euroCents(data.get("entryFee")), courts
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

function showFillerDemo() {
  const t=store.create({name:"Demo – Auffüllrunde",date:todayLocal(),startTime:"10:00",
    duration:20,breakMinutes:10,rounds:3,courts:[1,2,3]});
  for(let i=1;i<=5;i++){
    store.upsertParticipant(t.id,{name:"Stark "+i,group:"stark",present:true});
    store.upsertParticipant(t.id,{name:"Schwächer "+i,group:"schwaecher",present:true});
  }
  view="draw";drawOpenRound=0;editingResult=null;search="";
  render();flash("Demo angelegt. Normale Runden auslosen und Ergebnisse erfassen.");
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
  if (action === "draw-edit-result" && t) {
    const round=Number(trigger.dataset.round),match=Number(trigger.dataset.match);
    const roundItem=round===t.draw?.rounds.length?t.draw.specialRound:t.draw?.rounds?.[round];
    if (!Number.isInteger(round) || !Number.isInteger(match) || !roundItem?.matches?.[match]) return;
    if(t.draw.finals){
      flash("Bitte zuerst die Endrunde zurücknehmen, um Vorrundenergebnisse zu ändern.","bad");
      return;
    }
    if(t.draw.specialRound && round<t.draw.rounds.length){
      flash("Zuerst die Auffüllrunde zurücknehmen, um normale Ergebnisse zu ändern.","bad");
      return;
    }
    editingResult={tournamentId:t.id,round,match};
    drawOpenRound=round;
    render();
    return;
  }
  if (action === "draw-cancel-edit") { editingResult=null; render(); return; }
  if (action === "final-edit-result" && t?.draw?.finals) {
    const stage=Number(trigger.dataset.stage),match=Number(trigger.dataset.match);
    if(!Number.isInteger(stage)||!Number.isInteger(match)||!t.draw.finals.rounds?.[stage]?.matches?.[match])return;
    editingFinal={tournamentId:t.id,stage,match};render();return;
  }
  if (action === "final-cancel-edit") { editingFinal=null;render();return; }
  if (action === "final-size" && t) return run(() => {
    if(t.draw?.finals)throw Error("Bitte zuerst die Endrunde zurücknehmen.");
    const size=Number(trigger.dataset.size);
    if(![8,16].includes(size))throw Error("Für die Endrunde sind 8 oder 16 Spieler vorgesehen.");
    store.editTournament(t.id,{finalSize:size});
    render();
  });
  if (action === "final-generate" && t) return run(() => {
    const preview=ribbonFinalPreview(t);
    if(!preview.ready)throw Error(preview.reason||"Die Endrunde ist noch nicht bereit.");
    const strong=preview.eligible.filter(p=>p.group==="stark").length;
    if(!confirm(`Endrunde für ${preview.size} Spieler auslosen? (${strong} Stark / ${preview.size-strong} Schwächer). Die Doppelpartner bleiben bis zum Finale fest zusammen.`))return;
    const draw=createRibbonFinals(t,{seed:Math.floor(Math.random()*2147483647)});
    store.editTournament(t.id,{draw});
    editingFinal=null;view="finals";render();
    flash("Endrunde ausgelost. Sieger rücken automatisch weiter.");
  });
  if (action === "final-reset" && t?.draw?.finals) return run(() => {
    const scored=t.draw.finals.rounds.some(r=>r.matches.some(m=>m.result?.winner===1||m.result?.winner===2));
    const message=scored?"Endrunde mit allen Endrunden-Ergebnissen zurücknehmen? Die Vorrunden bleiben erhalten.":
      "Endrunde zurücknehmen? Die Vorrunden bleiben erhalten.";
    if(!confirm(message))return;
    store.editTournament(t.id,{draw:resetRibbonFinals(t)});
    editingFinal=null;render();flash("Endrunde zurückgenommen. Vorrunden-Ergebnisse bleiben erhalten.");
  });
  if (action === "close-dialog") return closeDialog();
  if (action === "home") { view = "home"; search = ""; editingResult=null; editingFinal=null; render(); window.scrollTo?.(0, 0); return; }
  if (action === "open-tournament") return run(() => { store.setActive(trigger.dataset.id); view = "overview"; search = ""; editingResult=null; editingFinal=null; render(); window.scrollTo?.(0, 0); });
  if (action === "tab") { view = trigger.dataset.tab==="fees"?"participants":trigger.dataset.tab; search = ""; editingResult=null; editingFinal=null; render(); return; }
  if (action === "new") return showTournamentDialog();
  if (action === "demo") return run(showDemo);
  if (action === "demo-filler") return run(showFillerDemo);
  if (action === "fee-category-add" && t) return showFeeCategoryDialog(t);
  if (action === "fee-category-edit" && t) return showFeeCategoryDialog(t,trigger.dataset.id);
  if (action === "fee-category-remove" && t) return run(() => {
    const c=t.feeCategories.find(c=>c.id===trigger.dataset.id);
    if(!c)throw Error("Kategorie nicht gefunden.");
    if(t.participants.some(p=>(p.feeTierId||"standard")===c.id))
      throw Error("Zuerst die Teilnehmer dieser Nenngeld-Kategorie einer anderen Kategorie zuordnen.");
    if(!confirm(`Die Nenngeld-Kategorie „${c.name}“ wirklich entfernen?`))return;
    store.removeFeeCategory(t.id,c.id);
    render();flash("Nenngeld-Kategorie entfernt.");
  });
  if (action === "fee-full" && t) return run(() => {
    const p=t.participants.find(p=>p.id===trigger.dataset.id);
    if(!p)throw Error("Teilnehmer nicht gefunden.");
    const due=entryDue(t,p);
    if(due<=0)throw Error("Für diesen Teilnehmer ist kein Nenngeld fällig.");
    if(!confirm(`Für ${p.name} insgesamt ${euroText(due)} BAR erhalten und erfassen? Bitte nur bestätigen, wenn das Geld wirklich übergeben wurde.`))return;
    store.recordCashPayment(t.id,p.id,due);
    render();flash(`${p.name}: ${euroText(due)} bar erfasst.`);
  });
  if (action === "fee-edit" && t) {
    const p=t.participants.find(p=>p.id===trigger.dataset.id);
    if(!p)return;
    showDialog({eyebrow:"BARZAHLUNG / KORREKTUR",title:`Nenngeld: ${p.name}`,
      form:"cash-payment",submit:"Barbetrag speichern",
      body:cashPaymentBody(t,p,{escapeHtml})});
    return;
  }
  if (action === "remote-start" && t) {
    if(readLiveSecrets(t.id))return flash("Fernanzeige ist bereits aktiv.");
    let keys;
    try{keys=createLiveSecrets(window.crypto);}catch(e){return flash(e.message,"bad");}
    return publishLive(keys,publicLiveSnapshot(t)).then(()=>{
      saveLiveSecrets(t.id,keys);
      remoteLastSent=Date.now();remoteErrorShown=false;
      render();flash("Fernanzeige aktiviert. Den Zuschauer-Link jetzt kopieren.");
    }).catch(e=>flash("Fernanzeige konnte nicht aktiviert werden: "+e.message,"bad"));
  }
  if (action === "remote-copy" && t) {
    const keys=readLiveSecrets(t.id);
    if(!keys)return flash("Bitte zuerst die Fernanzeige aktivieren.","bad");
    const link=remoteLiveUrl(keys.channel,window.location.href);
    if(navigator.clipboard?.writeText){
      return navigator.clipboard.writeText(link).then(()=>flash("Live-Link kopiert."))
        .catch(()=>window.prompt?.("Live-Link kopieren:",link));
    }
    window.prompt?.("Live-Link kopieren:",link);
    return;
  }
  if (action === "remote-stop" && t) {
    const keys=readLiveSecrets(t.id);
    if(!keys)return;
    if(!confirm("Fernanzeige beenden? Der geteilte Link wird ungültig."))return;
    remoteStopPending=true;
    return (remoteRequest||Promise.resolve()).catch(()=>{})
      .then(()=>publishLive(keys,null,{action:"stop"})).then(()=>{
        clearLiveSecrets(t.id);remoteLastSent=0;remoteErrorShown=false;
        render();flash("Fernanzeige beendet. Der geteilte Link ist ungültig.");
      }).catch(e=>flash("Die Freigabe konnte nicht beendet werden: "+e.message,"bad"))
      .finally(()=>{remoteStopPending=false;});
  }
  if (action === "live-round" && t) return run(() => {
    const index=Number(trigger.dataset.round);
    const count=(t.draw?.rounds?.length||0)+(t.draw?.specialRound?1:0);
    if(!t.draw||!verifyRibbonDraw(t,t.draw).ok||!Number.isInteger(index)||index<0||index>=count)
      throw Error("Diese Runde wurde noch nicht gültig ausgelost.");
    store.editTournament(t.id,{liveDisplay:{mode:"round",index}});
    drawOpenRound=index;render();flash("Runde für den Live-Monitor ausgewählt.");
  });
  if (action === "live-auto" && t) return run(() => {
    store.editTournament(t.id,{liveDisplay:null});
    render();flash("Live-Monitor wählt laufende Runden oder Endrunde jetzt automatisch.");
  });
  if (action === "live-finals" && t) return run(() => {
    if(!t.draw?.finals||!verifyRibbonFinals(t).ok)
      throw Error("Bitte zuerst eine gültige Endrunde auslosen.");
    store.editTournament(t.id,{liveDisplay:{mode:"finals"}});
    view="finals";render();flash("Endrunde für den Live-Monitor ausgewählt.");
  });
  if (action === "round-clock" && t) return run(() => {
    if(!t.draw||!verifyRibbonDraw(t,t.draw).ok)throw Error("Bitte zuerst eine gültige Auslosung erstellen.");
    const index=Number(trigger.dataset.round),operation=trigger.dataset.clockAction;
    if(operation==="reset"&&!confirm("Rundenuhr wirklich zurücksetzen? Der bisherige Zeitverlauf geht verloren."))return;
    if(operation==="finish"&&!confirm("Runde beenden und Uhr anhalten? Ergebnisse bleiben unverändert."))return;
    store.editTournament(t.id,{roundClocks:changeRoundClock(t,index,operation)});
    drawOpenRound=index;render();
    const messages={start:"Runde gestartet – die Uhr läuft.",pause:"Rundenuhr pausiert.",
      resume:"Rundenuhr läuft weiter.",finish:"Runde beendet.",reset:"Rundenuhr zurückgesetzt."};
    flash(messages[operation]||"Rundenuhr aktualisiert.");
  });
  if (action === "draw-special-generate" && t) return run(() => {
    const draw=generateRibbonSpecialRound(t);
    const clocks={...(t.roundClocks||{})};
    delete clocks[String(draw.rounds.length)];
    store.editTournament(t.id,{draw,roundClocks:clocks});
    drawOpenRound=draw.rounds.length;
    editingResult=null;
    render();
    flash("Auffüllrunde ausgelost. Auffüller spielen ohne eigene Wertung.");
  });
  if (action === "draw-special-reset" && t?.draw?.specialRound) return run(() => {
    if(t.draw.finals)throw Error("Bitte zuerst die Endrunde zurücknehmen.");
    const decided=t.draw.specialRound.matches.some(m=>m.result?.winner===1||m.result?.winner===2);
    const message=decided ?
      "Auffüllrunde inklusive ihrer bereits erfassten Ergebnisse zurücknehmen? Die normalen Vorrundenergebnisse bleiben erhalten." :
      "Auffüllrunde zurücknehmen? Die normalen Vorrundenergebnisse bleiben erhalten.";
    if(!confirm(message))return;
    const clocks={...(t.roundClocks||{})};
    delete clocks[String(t.draw.rounds.length)];
    store.editTournament(t.id,{draw:resetRibbonSpecialRound(t),roundClocks:clocks});
    drawOpenRound=Math.max(0,t.draw.rounds.length-1);
    editingResult=null;
    render();
    flash("Auffüllrunde zurückgenommen. Vorrundenergebnisse erhalten.");
  });
  if (action === "draw-generate" && t) return run(() => {
    if (t.draw) {
      let played=0;
      try { if(verifyRibbonDraw(t,t.draw).ok)played=ribbonStandings(t).completeMatches; }
      catch { played=1; } // Auch fehlerhafte importierte Ergebnisse dürfen die Neuauslosung nicht blockieren.
      const warning=t.draw.finals ? "Achtung: Die Endrunde und sämtliche vorherigen Ergebnisse gehen bei einer neuen Auslosung verloren. Wirklich fortfahren?" : played ? `Achtung: Es sind Ergebnisse in diesem Turnier gespeichert. Bei einer erneuten Auslosung gehen alle Ergebnisse und Schleifen verloren. Wirklich neu auslosen?` : "Die bisherige Auslosung dieses Turniers durch einen neuen Spielplan ersetzen?";
      if (!confirm(warning)) return;
    }
    const draw=generateRibbonDraw(t,{seed:Math.floor(Math.random()*2147483647)});
    store.editTournament(t.id,{draw,roundClocks:{},liveDisplay:null});
    view="draw"; drawOpenRound=0; editingResult=null; editingFinal=null; render();
    flash(draw.special ? "Normale Vorrunden ausgelost. Auffüllrunde bleibt offen." : "Vorrunde vollständig ausgelost.");
  });
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
  if (action === "edit-courts" && t) return showCourtNamesDialog(t);
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
  if (target.id === "tournament-select") return run(() => { store.setActive(target.value); search = ""; view = "overview"; editingFinal=null; render(); });
  if (target.matches("input[data-action='final-participation']") && t) return run(() => {
    if(t.draw?.finals)throw Error("Bitte zuerst die Endrunde zurücknehmen.");
    const id=target.dataset.id;
    if(!t.participants.some(p=>p.id===id&&p.present))throw Error("Dieser Spieler ist nicht teilnahmeberechtigt.");
    const excluded=new Set(t.finalOptOut||[]);
    if(target.checked)excluded.delete(id);else excluded.add(id);
    store.editTournament(t.id,{finalOptOut:[...excluded]});
    render();
  });
  if (target.matches("select[data-action='participant-tier']") && t) return run(() => {
    const player=t.participants.find(p=>p.id===target.dataset.id);
    const tier=t.feeCategories.find(c=>c.id===target.value);
    if(!player||!tier)throw Error("Spieler oder Kategorie nicht gefunden.");
    if(player.feeOverrideCents!=null &&
      !confirm(`Für ${player.name} ist ein individueller Betrag eingestellt. Durch die neue Kategorie „${tier.name}“ wird dieser Sonderbetrag aufgehoben. Fortfahren?`)){
      render();return;
    }
    store.setParticipantFeeTier(t.id,player.id,tier.id);
    render();flash(`${player.name}: Nenngeld-Kategorie „${tier.name}“ ausgewählt.`);
  });
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
  if(kind === "fee-category") return run(() => {
    const t=store.active();
    if(!t)throw Error("Turnier nicht gefunden.");
    const data=new FormData(form);
    store.upsertFeeCategory(t.id,{
      id:String(data.get("categoryId")||"")||null,
      name:String(data.get("categoryName")||""),
      amountCents:euroCents(data.get("categoryAmount"))
    });
    closeDialog();view="settings";render();flash("Nenngeld-Kategorie gespeichert.");
  });
  if(kind === "cash-payment") return run(() => {
    const t=store.active();
    if(!t)throw Error("Turnier nicht gefunden.");
    const data=new FormData(form);
    const id=String(data.get("playerId")||""),cents=euroCents(data.get("cashPaid"));
    store.recordCashPayment(t.id,id,cents);
    closeDialog();view="participants";render();
    flash("Barbetrag manuell gespeichert.");
  });
  if(kind === "final-result") return run(() => {
    const t=store.active();
    if(!t)throw Error("Turnier nicht gefunden.");
    const data=new FormData(form);
    const stage=Number(form.dataset.stage),match=Number(form.dataset.match);
    const draw=updateRibbonFinalResult(t,stage,match,{
      score1:data.get("score1"),score2:data.get("score2"),winner:data.get("winner")
    });
    store.editTournament(t.id,{draw});
    editingFinal=null;view="finals";render();
    flash(data.get("winner")?"Endrunden-Ergebnis gespeichert.":"Endrunden-Ergebnis zurückgesetzt.");
  });
  if(kind === "draw-result") return run(() => {
    const t=store.active();
    if(!t)throw Error("Turnier nicht gefunden.");
    const data=new FormData(form);
    const roundIndex=Number(form.dataset.round),matchIndex=Number(form.dataset.match);
    const draw=updateRibbonMatchResult(t,roundIndex,matchIndex,{
      score1:data.get("score1"),score2:data.get("score2"),winner:data.get("winner")
    });
    store.editTournament(t.id,{draw});
    drawOpenRound=roundIndex;
    editingResult=null;
    render();
    flash(data.get("winner") ? "Ergebnis und Schleifen gespeichert." : "Ergebnis zurückgesetzt.");
  });
  run(() => {
    if (kind === "create" || kind === "settings") {
      const values = readSettings(form);
      if (values.name.length < 2) throw new Error("Der Turniername muss mindestens 2 Zeichen haben.");
      if (kind === "create") store.create(values);
      else store.editTournament(store.active().id, values);
      view = "overview";
    } else if (kind === "court-names") {
      const t = store.active();
      if (!t) throw new Error("Turnier nicht gefunden.");
      store.editTournament(t.id, { courtLabels: readCourtNames(form, t) });
      view = "settings";
    } else if (kind === "add-player" || kind === "edit-player") {
      const data = new FormData(form), t = store.active();
      store.upsertParticipant(t.id, {
        name:data.get("name"), group:data.get("group"), present:data.has("present"),feeTierId:String(data.get("feeTierId")||"standard"),
        feeOverrideCents:String(data.get("feeOverride")??"").trim()===""?null:euroCents(data.get("feeOverride"))
      }, kind === "edit-player" ? String(data.get("playerId")) : null);
      view = "participants";
    }
    closeDialog(); render(); flash("Gespeichert.");
  });
});

window.addEventListener("storage", event => { if (event.key === "tennis-schiri-tournaments-v1") { store.state = store.load(); render(); flash("Daten aus einem anderen Tab aktualisiert."); } });
// Nur sichtbare Timer-Texte aktualisieren; Eingabeformulare nicht jede Sekunde neu aufbauen.
if(typeof window.setInterval==="function"){
  window.setInterval(()=>{
    if(view==="draw")refreshClockDisplays(store.active(),document);
    if(Date.now()-remoteLastSent>=3000)pushRemote();
  },1000);
}
window.addEventListener("focus",()=>{ if(view==="draw")refreshClockDisplays(store.active(),document); });
render();
