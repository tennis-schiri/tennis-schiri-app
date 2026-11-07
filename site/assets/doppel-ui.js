import {BrowserTournamentStore,todayLocal,uid} from "./storage.js?v=095";
import {demoCountLimits,makeDemoCopy,fillDemoResults} from "./demo-data.js?v=093";
import {scoringRules,scoreModeFields,readScoringFields,assertScoringChangeAllowed} from "./match-scoring.js?v=086";
import {euroCents,euroText,euroInput,clockFor,timeWindow,tournamentSchedule} from "./operations.js?v=091";
import {
  analyzeDoublesSetup,doublesMatchOptions,generateDoublesDraw,verifyDoublesDraw,updateDoublesResult,
  doublesStandings,doublesPlayoffPreview,createDoublesPlayoffs,updateDoublesPlayoffResult,
  doublesPlayoffStatus,updateDoublesPlayoffCourt,doublesPlanRound,doublesPlayoffSize,doublesPlayoffStages,doublesPlayoffSeeding,decideDoublesTie,drawDoublesTieOrder,changeDoublesClock,normalizeDoublesResult
} from "./doubles.js?v=095";
import {
  publicLiveSnapshot,createLiveSecrets,readLiveSecrets,saveLiveSecrets,
  clearLiveSecrets,publishLive,remoteLiveUrl
} from "./remote-live.js?v=095";

const store=new BrowserTournamentStore();
const root=document.getElementById("app");
const dialogRoot=document.getElementById("dialog-root");
const noticeRoot=document.getElementById("toast-region");
let view=store.active()?.type==="doubles"?"overview":"home";
let currentRound=0;
let remoteRequest=null,remoteLastSent=0,remoteStopPending=false,remoteErrorShown=false;
async function pushRemote() {
  if(remoteRequest||remoteStopPending)return;
  const t=active(),keys=t&&readLiveSecrets(t.id);
  if(!t||!keys)return;
  remoteRequest=publishLive(keys,publicLiveSnapshot(t));
  try{
    await remoteRequest;
    remoteLastSent=Date.now();
    remoteErrorShown=false;
  }catch(error){
    if(!remoteErrorShown){remoteErrorShown=true;flash("Fernanzeige: "+error.message,true);}
  }finally{remoteRequest=null;}
}

const esc=value=>String(value??"").replace(/[&<>"']/g,char=>({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
})[char]);
const doublesList=()=>store.list().filter(x=>x.type==="doubles");
const active=()=>store.active()?.type==="doubles"?store.active():doublesList()[0]||null;
const name=team=>team?[team.player1,team.player2].join(" / "):"Noch nicht ermittelt";
const label=(t,id)=>name(t?.doubles?.teams?.find(x=>x.id===id));
const cashTier=(t,tier)=>t.feeCategories.find(x=>x.id===tier)||t.feeCategories[0];
const cashDue=(t,team,number)=>cashTier(t,team["tier"+number]).amountCents;
const cashPaid=(team,n)=>team["paid"+n]||0;
const cashTotals=t=>{
  const all=t.doubles.teams.flatMap(team=>[1,2].map(n=>({
    expected:cashDue(t,team,n),paid:cashPaid(team,n)
  })));
  return {expected:all.reduce((a,x)=>a+x.expected,0),
    received:all.reduce((a,x)=>a+x.paid,0),
    open:all.reduce((a,x)=>a+Math.max(0,x.expected-x.paid),0)};
};
const hasResult=m=>m?.result?.winner===1||m?.result?.winner===2;
const dateText=iso=>{const p=String(iso||"").split("-");return p.length===3?p[2]+"."+p[1]+"."+p[0]:iso;};
const courtName=(t,c)=>t.courtLabels?.[c]||"Platz "+c;
function flash(text,bad=false) {
  const el=document.createElement("div");
  el.className="toast"+(bad?" bad":"");
  el.textContent=text;
  el.setAttribute("role",bad?"alert":"status");
  noticeRoot.replaceChildren(el);
  window.setTimeout(()=>{if(el.parentElement)el.remove();},6000);
}
function run(fn) {
  try{return fn();}
  catch(error){flash(error?.message||"Aktion fehlgeschlagen.",true);return null;}
}
function dIcon(kind) {
  const icons={
    home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
    trophy:'<path d="M8 21h8M12 17v4M7 4h10v7a5 5 0 0 1-10 0V4Z"/><path d="M7 6H4v3a4 4 0 0 0 4 4M17 6h3v3a4 4 0 0 1-4-4"/>',
    users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>',
    court:'<rect x="3" y="5" width="18" height="14" rx="1"/><path d="M12 5v14M3 12h18M7 5v14M17 5v14"/>',
    table:'<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M3 10h18M9 10v10M15 10v10"/>',
    settings:'<path d="M4 7h16M4 17h16"/><circle cx="8" cy="7" r="2"/><circle cx="16" cy="17" r="2"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',
    download:'<path d="M12 3v12m-4-4 4 4 4-4M4 17v4h16v-4"/>',
    upload:'<path d="M12 16V4m-4 4 4-4 4 4M4 18v3h16v-3"/>',
    monitor:'<rect x="2.5" y="3.5" width="19" height="13.5" rx="2"/><path d="M8 21h8M12 17v4"/>'
  };
  return '<svg class="icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'+(icons[kind]||icons.court)+'</svg>';
}
function header() {
  return '<header class="shell-header"><div class="header-inner">'+
    '<a class="brand brand-link" href="./index.html">TENNIS<span>-SCHIRI</span><small> / TURNIERMANAGER</small></a>'+
    '<span class="dev-chip">GESCHÜTZTE TESTVERSION · V0.9.5</span></div></header>';
}
function note() {
  return '<div class="browser-notice"><div><strong>Lokale Testversion</strong>'+
    '<p>Teams, Barzahlungen und Ergebnisse werden im Browser dieses Geräts gespeichert. '+
    'Sichere die Daten regelmäßig als JSON. Eine lesbare Fernanzeige kann ausdrücklich aktiviert und widerrufen werden. Die gemeinsame Bearbeitung des Turniers auf mehreren Geräten ist noch nicht freigeschaltet.</p></div></div>';
}
function livePanel(t) {
  const keys=readLiveSecrets(t.id);
  const url=keys?remoteLiveUrl(keys.channel,window.location.href):null;
  return '<div class="remote-live-panel"><div><strong>Fernanzeige für Monitor, Tablet oder Smart-TV</strong>'+
    '<p>Nur Paarungen, Ergebnisse, Rundenuhr und Teamrangliste. Kein Bar-Nenngeld und keine Anwesenheitslisten. '+
    'Ein separater Zuschauer-Link wird erst nach deiner Freigabe erzeugt.</p></div>'+
    '<div class="remote-live-actions"><button class="btn ghost small" data-act="live-local">Monitor öffnen</button>'+
    (keys?'<button class="btn primary small" data-act="remote-copy">Zuschauer-Link kopieren</button>'+
      '<button class="btn ghost small" data-act="remote-stop">Freigabe beenden</button>':
      '<button class="btn primary small" data-act="remote-start">Fernanzeige aktivieren</button>')+
    (t.liveDisplay?'<button class="btn ghost small" data-act="live-auto">Anzeige automatisch wählen</button>':'')+
    '</div></div>';
}
function home() {
  const all=doublesList();
  return '<main class="wrap welcome double-intro"><div class="eyebrow">Tennis-Schiri / Digitale Turnierorganisation · Doppelturnier</div>'+
    '<h1>Feste Teams.<br><em>Gemeinsame Siege.</em></h1>'+
    '<p class="lead">Doppelturniere mit festen Paarungen, Vorrunde, Livetabelle und frei wählbarer Endrunde organisieren.</p>'+
    '<div class="welcome-actions"><button class="btn primary" data-act="new">'+dIcon("plus")+' Doppelturnier anlegen</button>'+
    '<button class="btn ghost" data-act="demo">Demoturnier laden</button>'+
    '<a class="btn ghost" href="./index.html">Zur Hauptstartseite</a>'+
    '<button class="btn ghost" data-act="import">Sicherung laden</button>'+
    '<input type="file" id="doubles-import" accept=".json,application/json" hidden></div>'+
    (all.length?'<section class="saved-tournaments"><div class="saved-tournaments-heading"><div><div class="eyebrow">HIER GEHT’S WEITER</div>'+
      '<h2>Deine Doppelturniere <span>('+all.length+')</span></h2></div></div><div class="saved-tournaments-grid">'+all.map(t=>
      '<article class="saved-tournament"><div class="saved-tournament-top"><span class="eyebrow">DOPPELTURNIER</span>'+
      '<span class="mini-tag">'+t.doubles.teams.length+' Teams</span></div>'+
      '<h3>'+esc(t.name)+'</h3><p>'+dateText(t.date)+' · '+t.courts.length+' Plätze · Top '+doublesPlayoffSize(t)+'</p>'+
      '<button class="btn primary" data-act="open" data-id="'+esc(t.id)+'">Turnier öffnen</button></article>').join("")+
      '</div></section>':'<div class="double-panel"><h3>Noch kein Doppelturnier angelegt</h3><p>Lege ein Turnier an oder lade ein Beispiel mit acht festen Doppelteams.</p></div>')+
    note()+'</main>';
}

function nav(t) {
  const tabs=[
    ["overview","Übersicht","trophy"],
    ["teams","Check-in & Nenngeld","users"],
    ["draw","Auslosung","court"],
    ["table","Livetabelle","table"],
    ["playoffs","Endrunde","trophy"],
    ["settings","Einstellungen","settings"]
  ];
  return '<aside class="sidebar double-sidebar"><div class="nav-label">DEIN TURNIER</div>'+
    '<div class="tournament-picker"><label class="sr-only" for="doubles-tournament-select">Doppelturnier wählen</label>'+
    '<select id="doubles-tournament-select">'+doublesList().map(x=>
      '<option value="'+esc(x.id)+'" '+(x.id===t.id?"selected":"")+'>'+esc(x.name)+'</option>').join("")+'</select></div>'+
    '<nav class="nav-tabs" aria-label="Turnierbereich">'+
    '<button type="button" data-act="home">'+dIcon("home")+' Startseite</button>'+
    tabs.map(([id,title,icon])=>'<button type="button" data-act="tab" data-tab="'+id+'" class="'+(view===id?"selected":"")+'">'+dIcon(icon)+' '+title+'</button>').join("")+
    '</nav><button type="button" class="btn side-new" data-act="new">'+dIcon("plus")+' Neues Turnier</button>'+
    '<div class="double-sidebar-links"><button class="btn ghost small" data-act="backup">'+dIcon("download")+' Daten sichern</button>'+
    '<button class="btn ghost small" data-act="import">'+dIcon("upload")+' Daten laden</button></div>'+
    '<div class="sidebar-foot">TENNILO · TENNIS-SCHIRI<br><span>TESTBUILD · 2026</span></div></aside>';
}

function sectionHead(labelText,title,description,actions="") {
  return '<div class="section-header"><div><div class="eyebrow">'+labelText+'</div><h2>'+title+'</h2>'+
    '<p class="section-sub">'+description+'</p></div><div class="double-actions">'+actions+'</div></div>';
}
function stats(t) {
  const totals=cashTotals(t),teams=t.doubles.teams.length,present=t.doubles.teams.filter(x=>x.present).length;
  return '<div class="double-stats">'+[
    ["TEAMS",teams,present+" anwesend"],
    ["PLÄTZE",t.courts.length,"aktuell nutzbar"],
    ["SPIELE JE TEAM",t.rounds,"Vorrunde"],
    ["NENNGELD OFFEN",euroText(totals.open),"Barzahlungen"]
  ].map(([title,value,sub])=>'<div class="double-stat"><small>'+title+'</small><strong>'+value+'</strong><span class="muted">'+sub+'</span></div>').join("")+'</div>';
}
function doublesTimeNote(t){
  if(!t.doubles.draw)return t.endTime?'<p class="double-warning">Endzeit '+esc(t.endTime)+' Uhr vorgemerkt. Die benötigten Zeitblöcke werden anhand der anwesenden Teams geprüft.</p>':"";
  try{
    const plan=tournamentSchedule(t);
    return '<div class="'+(plan.overTarget?"double-warning":"double-success")+'"><strong>Geplantes Turnierende: '+
      esc(plan.end)+' Uhr</strong>'+(t.endTime?' · Ziel: '+esc(t.endTime)+' Uhr':'')+
      (plan.mode==="fit"?' · angepasste Spielzeiten':' · feste Spielzeiten')+
      (t.reservePlayoffs!==false&&t.doubles.teams.filter(x=>x.present).length>=doublesPlayoffSize(t)?
       ' · Top-'+doublesPlayoffSize(t)+'-Play-offs eingeplant':'')+
      (plan.overTarget?' · Zielzeit wird überschritten!':'')+'</div>';
  }catch(e){return '<div class="double-warning">'+esc(e.message)+'</div>';}
}
function doublesOptions(t){
  if(t.doubles.teams.filter(x=>x.present).length<2)return "";
  const options=doublesMatchOptions(t);
  return '<section class="double-panel"><h3>Wie viele Matches pro Team sind machbar?</h3>'+
    '<p class="muted">Geprüft anhand der anwesenden Teams, verfügbaren Plätze, echten Probeauslosungen und – falls gesetzt – der Endzeit. Bei mindestens '+doublesPlayoffSize(t)+' Teams ist die Top-'+doublesPlayoffSize(t)+'-Endrunde standardmäßig mit eingeplant.</p>'+
    '<div class="schedule-option-list">'+options.map(o=>
      '<div class="schedule-option '+(o.possible?"schedule-option-ok":"schedule-option-no")+'">'+
      '<strong>'+o.games+' Match'+(o.games===1?"":"es")+' / Team'+(o.games===t.rounds?' · gewählt':'')+'</strong>'+
      '<span>'+(o.possible?'✓ Machbar · '+o.blocks+' Vorrunden-Blöcke · Ende ca. '+esc(o.plannedEnd)+' Uhr':
        'Nicht machbar · '+esc(o.reason))+'</span></div>').join("")+'</div></section>';
}
function overview(t) {
  const draw=t.doubles.draw,valid=draw?verifyDoublesDraw(t):null;
  let progress=null;
  try{if(valid?.ok)progress=doublesStandings(t);}catch{}
  const stage=t.doubles.playoffs?doublesPlayoffStatus(t):null;
  return sectionHead("DOPPELTURNIER / ZENTRALE","Turnierübersicht",
    "Feste Teams, Vorrunde und die besten "+doublesPlayoffSize(t)+" Teams in den Play-offs.",
    '<button class="btn subtle" data-act="settings">Turniereinstellungen</button>')+
    stats(t)+doublesTimeNote(t)+livePanel(t)+
    '<div class="double-grid"><section class="double-panel"><h3>Turnierstatus</h3>'+
    '<p><strong>Turnier:</strong> '+esc(t.name)+'<br><strong>Datum:</strong> '+dateText(t.date)+
    '<br><strong>Start:</strong> '+esc(t.startTime)+' Uhr<br><strong>Endzeit:</strong> '+(t.endTime?esc(t.endTime)+' Uhr':'offen')+'<br><strong>Zeitmodus:</strong> '+(t.timeMode==="fit"?'An Endzeit anpassen':'Feste Spielzeiten')+'<br><strong>Spieldauer:</strong> '+t.duration+
    ' Minuten + '+t.breakMinutes+' Minuten Wechselpause</p>'+
    '<div class="double-actions">'+
    '<button class="btn primary" data-act="'+(draw?"tab":"draw-generate")+'" data-tab="draw">'+(draw?"Spielplan öffnen":"Vorrunde auslosen")+'</button>'+
    '<button class="btn ghost" data-act="tab" data-tab="teams">Teams bearbeiten</button></div></section>'+
    '<section class="double-panel"><h3>Spielstand</h3>'+
    (valid&&!valid.ok?'<div class="double-warning">'+esc(valid.errors[0])+'</div>':
    progress?'<p>'+progress.complete+' von '+progress.planned+' Vorrundenbegegnungen gespielt.</p>'+
      (progress.finished?'<div class="double-success">Vorrunde abgeschlossen. Play-offs können vorbereitet werden.</div>':
        '<p>Ergebnisse im Spielplan eintragen, dann aktualisiert sich die Livetabelle.</p>'):
      '<p>Noch keine Auslosung. Sobald genügend Teams anwesend sind, kann der Spielplan erstellt werden.</p>')+
    (stage?.champion?'<p><strong>Turniersieger:</strong> '+esc(label(t,stage.champion))+'</p>':'')+
    '<button class="btn ghost" data-act="tab" data-tab="table">Livetabelle ansehen</button></section></div>'+note();
}
function teams(t) {
  const locked=!!t.doubles.draw,all=t.doubles.teams,totals=cashTotals(t);
  const rows=all.map(team=>{
    const expected=cashDue(t,team,1)+cashDue(t,team,2),received=cashPaid(team,1)+cashPaid(team,2);
    return '<tr><td><strong>'+esc(team.player1)+' / '+esc(team.player2)+'</strong>'+
      '<small>'+esc(cashTier(t,team.tier1).name)+' / '+esc(cashTier(t,team.tier2).name)+'</small></td>'+
      '<td><label class="double-checkbox"><input type="checkbox" data-act="presence" data-id="'+esc(team.id)+'" '+(team.present?"checked ":"")+(locked?"disabled ":"")+'aria-label="Anwesenheit '+esc(name(team))+'"> '+(team.present?"Anwesend":"Abwesend")+'</label></td>'+
      '<td>'+euroText(expected)+'</td><td>'+euroText(received)+'</td>'+
      '<td class="'+(received>=expected?"double-okay":"double-open")+'">'+euroText(Math.max(0,expected-received))+'</td>'+
      '<td><div class="double-actions"><button class="btn subtle small" data-act="cash" data-id="'+esc(team.id)+'">Bar erhalten</button>'+
      (!locked?'<button class="btn ghost small" data-act="team-edit" data-id="'+esc(team.id)+'">Bearbeiten</button>'+
      '<button class="btn double-danger small" data-act="team-remove" data-id="'+esc(team.id)+'">Entfernen</button>':'')+
      '</div></td></tr>';
  }).join("");
  return sectionHead("DOPPELTURNIER / CHECK-IN","Teams & Nenngeld",
    "Zwei feste Partner pro Team. Nenngeld pro Spieler, nur tatsächlich bar erhaltene Beträge erfassen.",
    !locked?'<button class="btn primary" data-act="team-add">+ Team hinzufügen</button>':
    '<button class="btn double-outline" data-act="tab" data-tab="draw">Spielplan öffnen</button>')+
    '<div class="double-stats">'+[
      ["TEAMS",all.length,"registriert"],["ANWESEND",all.filter(x=>x.present).length,"für die Auslosung"],
      ["BAR ERHALTEN",euroText(totals.received),"manuell erfasst"],["OFFEN",euroText(totals.open),"noch nicht bezahlt"]
    ].map(([a,b,c])=>'<div class="double-stat"><small>'+a+'</small><strong>'+b+'</strong><span class="muted">'+c+'</span></div>').join("")+'</div>'+
    (locked?'<div class="double-warning">Die Teamzusammenstellung und Anwesenheit sind nach der Auslosung gesperrt. Barzahlungen können weiter korrigiert werden. Für andere Teams die Auslosung vorher zurücknehmen.</div>':'')+
    '<section class="double-panel"><div class="double-table-wrap"><table class="double-table"><thead><tr><th>Doppelteam</th><th>Anwesenheit</th><th>Soll</th><th>Bar erhalten</th><th>Offen</th><th>Aktionen</th></tr></thead>'+
    '<tbody>'+ (rows||'<tr><td colspan="6">Noch keine Teams angelegt. Bitte zwei Namen pro Team erfassen.</td></tr>')+'</tbody></table></div></section>'+
    '<p class="muted">Die Barzahlungen bleiben beim Verein; sie gehören nicht zur späteren TENNILO-Softwarelizenz.</p>';
}
function matchMarkup(t,m,index,{playoff=null,stage="",round=0,pair=null}={}) {
  const a=label(t,m.team1),b=label(t,m.team2),ready=!!(m.team1&&m.team2),result=m.result,has=hasResult(m);
  const planned=ready;
  return '<article class="double-match'+(pair?' po-pair-'+pair.number+' double-po-match':'')+'"><div class="double-match-head"><span>'+
    (pair?'<span class="double-po-pair-chip po-pair-'+pair.number+'">'+esc(pair.label)+' · '+esc(pair.seedLabel)+'</span> · ':'')+
    (!playoff?'Spiel '+(index+1)+' · '+esc(courtName(t,m.court)):
      esc(courtName(t,m.court||t.courts[0])))+'</span>'+
    '<span class="double-tag '+(has?"winner":"pending")+'">'+(has?"Ergebnis gespeichert":"Offen")+'</span></div>'+
    '<div class="double-teams"><div class="double-side '+(has&&result.winner===1?"win":"")+'"><strong>'+esc(a)+'</strong></div>'+
    '<span class="double-versus">'+(has?'<span class="double-score">'+result.score1+':'+result.score2+'</span>':"gegen")+'</span>'+
    '<div class="double-side '+(has&&result.winner===2?"win":"")+'"><strong>'+esc(b)+'</strong></div></div>'+
    (playoff?'<label class="double-po-court-control"><span>'+dIcon("court")+' Spielplatz</span>'+
      '<select data-act="playoff-court" data-stage="'+esc(stage)+'" data-match="'+index+'" '+
      'aria-label="Platz für '+esc((doublesPlayoffStages(t).find(x=>x.id===stage)?.title||"Endrunde")+
        ' Begegnung '+(index+1))+'">'+
      t.courts.map(court=>'<option value="'+court+'" '+(court===m.court?"selected":"")+'>'+
        esc(courtName(t,court))+'</option>').join("")+'</select></label>':'')+
    (has&&result.points1!==null?'<p class="muted" style="margin:6px 0">Entscheidungspunkte: '+result.points1+':'+result.points2+'</p>':'')+
    (planned?'<div class="double-actions" style="margin-top:12px"><button class="btn ghost small" data-act="result" '+
      (playoff? 'data-stage="'+esc(stage)+'" data-match="'+index+'"':
        'data-round="'+round+'" data-match="'+index+'"')+'>'+
      (has?"Ergebnis ändern":"Ergebnis eintragen")+'</button></div>':'<p class="muted">Die Teams ergeben sich aus den vorherigen Begegnungen.</p>')+'</article>';
}
function roundTimer(t,index) {
  const info=doublesPlanRound(t,index),clock=clockFor(t,index);
  const btn=(action,text)=>'<button class="btn subtle small" data-act="clock" data-clock="'+action+'" data-round="'+index+'">'+text+'</button>';
  return '<div class="double-timer"><div class="eyebrow">RUNDENUHR · '+esc(clock.status.toUpperCase())+'</div>'+
    '<div class="clock '+(clock.expired?"over":"")+'" data-clock="'+index+'" role="timer">'+esc(clock.display)+'</div>'+
    '<small>Geplant: '+info.start+'–'+info.end+' Uhr · Pause bis '+info.pauseEnd+'</small>'+
    '<div class="double-actions" style="margin-top:12px">'+
    (clock.status==="ready"?btn("start","Runde starten"):"")+
    (clock.status==="running"?btn("pause","Pausieren")+btn("finish","Beenden"):"")+
    (clock.status==="paused"?btn("resume","Fortsetzen")+btn("finish","Beenden"):"")+
    (clock.status!=="ready"?btn("reset","Uhr zurücksetzen"):"")+
    '</div></div>';
}
function drawPage(t) {
  const setup=analyzeDoublesSetup(t),draw=t.doubles.draw,check=draw?verifyDoublesDraw(t):null;
  const controls='<button class="btn '+(draw?"double-danger":"primary")+'" data-act="'+(draw?"draw-reset":"draw-generate")+'">'+(draw?"Neu auslosen":"Vorrunde auslosen")+'</button>';
  const top=sectionHead("DOPPELTURNIER / VORRUNDE","Spielplan",
    "Jedes anwesende Team erhält "+t.rounds+" Begegnungen ohne Wiederholung. Pro Zeitblock spielt ein Team höchstens einmal.",controls);
  if(!draw)return top+doublesOptions(t)+(setup.ok?'<div class="double-success">'+setup.teams+' anwesende Teams · '+setup.fixtures+' Begegnungen · '+t.courts.length+' Plätze. Auslosung bereit.</div>':
    '<div class="double-warning">'+esc(setup.errors.join(" · "))+'</div>')+
    '<section class="double-panel"><h3>Spielmodus</h3><p>'+ (scoringRules(t).mode==="points"?'Punktspiel bis '+scoringRules(t).target+' Punkte'+(scoringRules(t).winByTwo?', mit zwei Punkten Vorsprung':'')+'. Matchdauer und geplante Endzeit sind unverbindliche Schätzwerte.':'Auf Zeit · Games erfassen; bei Game-Gleichstand Entscheidungspunkte. Rangliste nach Siegen und Game-Differenz.')+'</p></section>';
  if(check&&!check.ok)return top+'<div class="double-warning">'+esc(check.errors.join(" · "))+'</div>';
  const index=Math.min(currentRound,draw.rounds.length-1),r=draw.rounds[index];
  const done=r.matches.filter(hasResult).length;
  const all=draw.rounds.flatMap(x=>x.matches);
  return top+doublesTimeNote(t)+livePanel(t)+'<div class="double-success">'+all.filter(hasResult).length+' von '+all.length+' Begegnungen erfasst. '+draw.rounds.length+' zeitliche Spielblöcke.</div>'+
    '<div class="double-round-list" aria-label="Runde auswählen">'+
    draw.rounds.map((item,i)=>'<button data-act="round" data-round="'+i+'" class="'+(i===index?"active":"")+'">Runde '+(i+1)+
      (item.matches.every(hasResult)?" ✓":"")+'</button>').join("")+'</div>'+
    '<section class="double-panel"><h3>Runde '+(index+1)+' · '+done+' / '+r.matches.length+' Ergebnisse</h3>'+
    '<div class="double-actions"><button class="btn ghost small" data-act="live-round" data-round="'+index+'">Diese Runde auf Monitor zeigen</button></div>'+
    roundTimer(t,index)+r.matches.map((m,i)=>matchMarkup(t,m,i,{round:index})).join("")+'</section>';
}
function tieBreakPanel(t,info) {
  if(!info.tieGroups?.length)return "";
  const locked=!!t.doubles.playoffs,finished=info.finished;
  const methodLabel={direct:"Direkter Vergleich",manual:"Manuell festgelegt",
    onsite:"Los vor Ort",random:"Durch TENNILO ausgelost",pending:"Entscheidung offen"};
  const byId=new Map(info.ranking.map(x=>[x.id,x.name]));
  return '<section class="double-panel double-tie-panel" aria-label="Gleichstände klären">'+
    '<h3>Gleichstände klären</h3>'+
    '<p class="muted">Bei exakt gleicher Anzahl Siege, gleicher Differenz und gleich vielen erzielten '+
    (scoringRules(t).mode==="points"?"Punkten":"Games")+
    ' entscheidet zunächst der direkte Vergleich. Ohne entscheidenden direkten Vergleich kann vor Ort gelost, in TENNILO gelost oder die Reihenfolge festgelegt werden.</p>'+
    info.tieGroups.map((group,i)=>{
      const canChange=finished&&!locked&&group.method!=="direct";
      const rows=group.order.map((id,j)=>'<span class="double-tie-position">'+(group.firstPlace+j)+'. '+esc(byId.get(id)||id)+'</span>').join("");
      return '<article class="double-tie-item '+(!group.resolved?"pending":"resolved")+'">'+
        '<div class="double-tie-row"><div><strong>Rang '+group.firstPlace+(group.lastPlace!==group.firstPlace?"–"+group.lastPlace:"")+
        '</strong><p>'+group.rows.map(x=>esc(x.name)).join(' · ')+'</p></div>'+
        '<span class="double-tie-status '+(group.resolved?"resolved":"pending")+'">'+methodLabel[group.method]+'</span></div>'+
        '<div class="double-tie-positions">'+rows+'</div>'+
        (canChange?'<div class="double-actions">'+
          '<button class="btn subtle small" data-act="tie-onsite" data-tie="'+i+'">Los vor Ort</button>'+
          '<button class="btn subtle small" data-act="tie-random" data-tie="'+i+'">TENNILO losen</button>'+
          '<button class="btn subtle small" data-act="tie-manual" data-tie="'+i+'">Reihenfolge festlegen</button></div>':
          !group.resolved?'<p class="muted">Entscheidung nach vollständiger Vorrunde möglich.</p>':
          '<p class="muted">'+(group.method==="direct"?"Der Sieger des direkten Vergleichs steht oben.":
            "Diese Reihenfolge ist gespeichert.")+'</p>')+
      '</article>';
    }).join("")+'</section>';
}
function tieDecisionDialog(t,index,method) {
  const info=doublesStandings(t);
  const group=info.tieGroups[index];
  if(!group||!info.finished||t.doubles.playoffs||group.method==="direct")
    throw Error("Dieser Gleichstand ist nicht mehr offen oder die Play-offs sind bereits festgelegt.");
  const labelText=method==="onsite"?"Los vor Ort dokumentieren":"Reihenfolge festlegen";
  const teams=group.rows;
  const options='<option value="">Bitte Team wählen</option>'+
    teams.map(row=>'<option value="'+esc(row.id)+'">'+esc(row.name)+'</option>').join("");
  showDialog({eyebrow:"DOPPELTURNIER / GLEICHSTAND",title:labelText,form:"tie-decision",submit:"Reihenfolge speichern",
    body:'<p>'+(method==="onsite"?"Losentscheid vor Ort durchführen und das Ergebnis hier eintragen.":
      "Die Turnierleitung legt die Reihenfolge verbindlich fest.")+'</p>'+
    '<input type="hidden" name="tieIds" value="'+esc(JSON.stringify(group.ids))+'">'+
    '<input type="hidden" name="tieSignature" value="'+esc(group.signature)+'">'+
    '<input type="hidden" name="tieMethod" value="'+esc(method)+'">'+
    '<div class="form-grid">'+teams.map((_,i)=>
      '<label class="field">Rang '+(group.firstPlace+i)+
      '<select name="tieRank'+i+'" required>'+options+'</select></label>').join("")+'</div>'+
    '<p class="muted">Jedes Team darf genau einmal gewählt werden. Die Entscheidung wird mit Verfahren und Zeitpunkt gespeichert.</p>'});
}

function tablePage(t) {
  const size=doublesPlayoffSize(t);
  const head=sectionHead("DOPPELTURNIER / RANGLISTE","Livetabelle",
    scoringRules(t).mode==="points"?"Wertung: Siege → Punktedifferenz → erzielte Punkte → Name.":"Wertung: Siege → Game-Differenz → Games + → Name.");
  if(!t.doubles.draw)return head+'<div class="double-warning">Bitte zuerst die Vorrunde auslosen.</div>';
  let info;
  try{info=doublesStandings(t);}catch(e){return head+'<div class="double-warning">'+esc(e.message)+'</div>';}
  const seeding=doublesPlayoffSeeding(t,info.ranking);
  const frozen=!!t.doubles.playoffs;
  return head+'<div class="double-success">'+info.complete+' von '+info.planned+' Begegnungen erfasst.</div>'+
    tieBreakPanel(t,info)+
    '<div class="double-playoff-legend"><span class="double-playoff-swatch" aria-hidden="true"></span>'+
    '<strong>Top '+size+' · Play-off-Plätze</strong> · '+(frozen?"Paarungen festgelegt":
      "Vorläufig: Platzierung und Paarungen ändern sich mit den Vorrundenergebnissen")+
    ' <button class="btn ghost small" data-act="tab" data-tab="playoffs">Play-offs verwalten</button></div>'+
    '<div class="double-po-pairs" aria-label="Play-off-Paarungen nach Setzliste">'+
    seeding.pairs.map(pair=>'<span class="double-po-pair-chip po-pair-'+pair.number+'">'+
      esc(pair.label)+': '+esc(pair.seedLabel)+'</span>').join("")+'</div>'+
    '<section class="double-panel"><div class="double-table-wrap"><table class="double-table double-ranking-table"><thead><tr>'+
    '<th>Rang</th><th>Doppelteam</th><th>Play-off-Paarung</th><th>Sp</th><th>S</th><th>N</th><th>'+
    (scoringRules(t).mode==="points"?"Punkte +":"Games +")+'</th><th>'+
    (scoringRules(t).mode==="points"?"Punkte −":"Games −")+'</th><th>Diff.</th></tr></thead><tbody>'+
    info.ranking.map((x,i)=>{
      const pair=seeding.byTeam.get(x.id);
      return '<tr class="'+(pair?'double-playoff-row po-pair-'+pair.number:'')+'"><td><strong>'+(i+1)+'</strong></td>'+
        '<td><strong>'+esc(x.name)+'</strong>'+(pair?'<span class="double-playoff-label">PO</span>':"")+'</td>'+
        '<td>'+(pair?'<span class="double-po-pair-chip po-pair-'+pair.number+'">'+esc(pair.label)+' · '+esc(pair.seedLabel)+'</span>':
          '<span class="double-po-waiting">–</span>')+'</td>'+
        '<td>'+x.played+'</td><td>'+x.wins+'</td><td>'+x.losses+'</td><td>'+x.gamesFor+'</td>'+
        '<td>'+x.gamesAgainst+'</td><td>'+x.gameDiff+'</td></tr>';
    }).join("")+
    '</tbody></table></div></section><p class="muted">Teams derselben Play-off-Partie sind identisch eingefärbt und über die Paarungsnummer verbunden. Nach Absagen erhält der nächste verfügbare Nachrücker automatisch den freien Platz. Die Setzliste wird erst bei „Paarungen festlegen“ verbindlich.</p>';
}

function playoffStage(t,title,id,matches,seedPairs=[]) {
  const pairAtIndex=new Map(seedPairs.map(x=>[x.matchIndex,x]));
  const entries=matches.map((match,index)=>({match,index,pair:pairAtIndex.get(index)||null}));
  if(seedPairs.length)entries.sort((a,b)=>(a.pair?.seed1||999)-(b.pair?.seed1||999));
  const currentlyShown=t.liveDisplay?.mode==="finals"&&t.liveDisplay.stage===id;
  return '<section class="double-panel double-po-stage" id="stage-'+esc(id)+'">'+
    '<div class="double-po-stage-head"><h3>'+esc(title)+'</h3>'+
    '<button class="btn '+(currentlyShown?"primary":"subtle")+' small" data-act="live-stage" '+
    'data-stage="'+esc(id)+'" aria-pressed="'+(currentlyShown?"true":"false")+'">'+
    dIcon("monitor")+' '+(currentlyShown?"Auf Live-Monitor ausgewählt":"Auf Live-Monitor anzeigen")+
    '</button></div>'+
    entries.map(({match,index,pair})=>matchMarkup(t,match,index,{playoff:true,stage:id,pair})).join("")+'</section>';
}

function playoffTimeNote(t) {
  if(!t.doubles.draw)return "";
  if(t.reservePlayoffs===false)return '<p class="muted">Play-off-Zeiten sind nicht in der Wunsch-Endzeit enthalten. Bei Bedarf unter Einstellungen aktivieren.</p>';
  const size=doublesPlayoffSize(t);
  if(t.doubles.teams.filter(x=>x.present).length<size)return "";
  try{
    const plan=tournamentSchedule(t),courtCount=t.courts.length;
    let cursor=t.doubles.draw.rounds.length;
    const stageRows=doublesPlayoffStages(t).filter(x=>x.id!=="thirdPlace");
    return '<section class="double-panel"><h3>Reservierte Zeitfenster der Endrunde</h3>'+
      stageRows.map(({id,title,count})=>{
        const matches=id==="final"&&size>=4?2:count;
        const blocks=Math.ceil(matches/courtCount);
        const first=plan.rounds[cursor],last=plan.rounds[cursor+blocks-1];
        cursor+=blocks;
        return '<p><strong>'+(id==="final"&&size>=4?"Finale und Platz 3":title)+
          ':</strong> '+esc(first.start)+'–'+esc(last.end)+' Uhr ('+blocks+' Zeitblock'+(blocks===1?'':'e')+')</p>';
      }).join("")+'</section>';
  }catch(e){return '<div class="double-warning">'+esc(e.message)+'</div>';}
}
function playoffsPage(t) {
  const size=doublesPlayoffSize(t);
  const head=sectionHead("DOPPELTURNIER / ENDRUNDE","Top-"+size+"-Play-offs",
    "Feste Paarungen nach Tabellenrang – keine Zufallsauslosung. Absagen führen zu automatischem Nachrücken.");
  if(!t.doubles.draw)return head+'<div class="double-warning">Zuerst die Vorrunde auslosen.</div>';
  let preview;
  try{preview=doublesPlayoffPreview(t);}catch(e){return head+'<div class="double-warning">'+esc(e.message)+'</div>';}
  const stage=doublesPlayoffStatus(t);
  if(t.doubles.playoffs) {
    if(!stage.ready)return head+'<div class="double-warning">'+esc(stage.error||"Play-offs nicht verfügbar.")+'</div>';
    const p=stage.playoffs;
    const seeding=doublesPlayoffSeeding(t,preview.ranking);
    const firstStage=doublesPlayoffStages(t)[0].id;
    const sections=doublesPlayoffStages(t).map(info=>
      playoffStage(t,info.title,info.id,
        info.id==="final"||info.id==="thirdPlace"?[p[info.id]]:p[info.id],
        info.id===firstStage?seeding.pairs:[])).join("");
    return head+tieBreakPanel(t,preview)+livePanel(t)+playoffTimeNote(t)+'<div class="double-actions"><button class="btn ghost" data-act="live-playoffs">Play-offs auf Monitor zeigen</button>'+
      '<button class="btn double-danger" data-act="playoffs-reset">Play-offs zurücknehmen</button></div>'+
      (stage.champion?'<div class="double-success"><strong>Turniersieger: '+esc(label(t,stage.champion))+'</strong>'+
        (stage.third?'<br>Platz 3: '+esc(label(t,stage.third)):'')+'</div>':'')+
      '<div class="double-bracket">'+sections+'</div>'+
      '<p class="muted">Bei Änderung einer früheren Partie werden abhängige Ergebnisse zurückgesetzt, sobald sich eine Paarung ändert.</p>';
  }
  const excluded=new Set(t.doubles.playoffOptOut||[]);
  const seeding=doublesPlayoffSeeding(t,preview.ranking);
  const selected=new Set(seeding.seeds);
  const selection=preview.ranking.map((x,i)=>{
    const chosen=selected.has(x.id),canceled=excluded.has(x.id);
    const pair=seeding.byTeam.get(x.id);
    return '<label class="double-checkbox double-po-choice '+(chosen?'chosen po-pair-'+pair.number:canceled?'canceled':'reserve')+'">'+
      '<input type="checkbox" data-act="playoff-eligible" data-id="'+esc(x.id)+'" '+
        (chosen?'checked ':'')+(!chosen&&!canceled?'disabled ':'')+
        'aria-label="Endrundenteilnahme '+esc(x.name)+'">'+
      '<span class="double-po-choice-body"><strong>Rang '+(i+1)+' · '+esc(x.name)+'</strong>'+
        '<small>'+(chosen?'<span class="double-po-pair-chip po-pair-'+pair.number+'">'+esc(pair.label)+
          ' · '+esc(pair.seedLabel)+'</span> · Qualifiziert':
          canceled?'Abgesagt · Haken setzen, um Team wieder zuzulassen':
          'Nachrückliste · automatisch, sobald ein Platz frei wird')+'</small></span></label>';
  }).join("");
  return head+tieBreakPanel(t,preview)+playoffTimeNote(t)+'<div class="'+(preview.ready?"double-success":"double-warning")+'">'+
    (preview.ready?"Play-offs bereit: "+size+" Teams sind qualifiziert. Die Paarungen ergeben sich fest aus der Setzliste.":esc(preview.reason))+'</div>'+
    '<section class="double-panel"><h3>Teilnahme an der Endrunde</h3>'+
    '<p>Nur die '+size+' aktuell qualifizierten Teams sind angehakt. Nimm den Haken bei einer Absage weg: Das nächstplatzierte verfügbare Team bekommt ihn automatisch. Kann auch dieses Team nicht, entferne seinen Haken ebenfalls.</p>'+
    '<p class="muted">Abgesagte Teams kannst du wieder zulassen, indem du ihren Haken erneut setzt. Die Paarungen bleiben bis zur Festlegung vorläufig.</p>'+
    '<div class="double-po-pairs">'+seeding.pairs.map(pair=>
      '<span class="double-po-pair-chip po-pair-'+pair.number+'">'+esc(pair.label)+': '+esc(pair.seedLabel)+'</span>').join("")+'</div>'+
    '<div class="double-po-choices">'+selection+'</div>'+
    '<div class="double-actions" style="margin-top:17px"><button class="btn primary" data-act="playoffs-generate" '+
      (preview.ready?"":"disabled")+'>Play-off-Paarungen festlegen</button></div></section>';
}

function settingsPage(t) {
  return sectionHead("DOPPELTURNIER / EINSTELLUNGEN","Turnier konfigurieren",
    "Start- und Endzeit, Platzanzahl und Spielzeit anpassen. Die Paarungen bleiben nach der Auslosung geschützt.")+
    '<section class="double-panel">'+settingsFields(t,true)+
    '<div class="double-actions" style="margin-top:20px"><button class="btn subtle" data-act="edit-courts">Plätze benennen</button>'+
    '<button class="btn double-danger" data-act="delete">Turnier löschen</button></div></section>'+
    '<p class="muted">Machbarkeitscheck für die aktuell gespeicherten Einstellungen. Änderungen oben erst speichern.</p>'+
    doublesOptions(t);
}
function settingsFields(t=null,inline=false) {
  const current=t||{},categories=current.feeCategories||[
    {id:"standard",name:"Standard",amountCents:500},{id:"ermaessigt",name:"Ermäßigt",amountCents:250}
  ];
  const normal=categories.find(x=>x.id==="standard")?.amountCents??500;
  const reduced=categories.find(x=>x.id==="ermaessigt")?.amountCents??250;
  const fields='<div class="form-grid">'+
    '<label class="field wide">Turniername<input name="name" required minlength="2" maxlength="90" value="'+esc(current.name||"")+'" placeholder="z. B. Sommer-Doppelturnier"></label>'+
    '<label class="field">Datum<input name="date" type="date" required value="'+esc(current.date||todayLocal())+'"></label>'+
    '<label class="field">Startzeit<input name="startTime" type="time" required value="'+esc(current.startTime||"10:00")+'"></label>'+
    '<label class="field">Endzeit (optional)<input name="endTime" type="time" value="'+esc(current.endTime||"")+'"></label>'+
    '<label class="field wide">Zeitplanung<select name="timeMode">'+
    '<option value="fixed" '+(current.timeMode!=="fit"?"selected":"")+'>Feste Spielzeit und Pausen</option>'+
    '<option value="fit" '+(current.timeMode==="fit"?"selected":"")+'>Spielzeiten bis zur Endzeit anpassen</option></select>'+
    '<span class="field-hint">Berechnet die Dauer pro Zeitblock, ohne die Zahl der Matches zu ändern. Unter 10 Min. je Block nicht machbar.</span></label>'+
    scoreModeFields(current,esc)+
    '<label class="field">Teams in der Endrunde<select name="playoffSize">'+
      [2,4,8,16].map(size=>'<option value="'+size+'" '+(doublesPlayoffSize(current)===size?"selected":"")+'>'+size+' Teams'+(size===2?' · direktes Finale':'')+'</option>').join("")+
    '</select><span class="field-hint">Die besten Teams der Vorrunde qualifizieren sich. Bei 4 oder mehr Teams mit Spiel um Platz 3.</span></label>'+
    '<label class="field wide checkbox-field"><input type="checkbox" name="reservePlayoffs" '+(current.reservePlayoffs!==false?"checked":"")+'> Play-offs im Endzeitplan berücksichtigen</label>'+
    '<label class="field">Spieldauer (Min.)<input name="duration" type="number" min="10" max="120" required value="'+(current.duration??20)+'"></label>'+
    '<label class="field">Wechselpause (Min.)<input name="breakMinutes" type="number" min="0" max="60" required value="'+(current.breakMinutes??10)+'"></label>'+
    '<label class="field">Spiele pro Team<select name="rounds">'+
      Array.from({length:8},(_,i)=>'<option value="'+(i+1)+'" '+((current.rounds??4)===i+1?"selected":"")+'>'+(i+1)+' Spiel'+(i?"e":"")+'</option>').join("")+
    '</select></label>'+
    '<label class="field">Anzahl Tennisplätze<input name="courtCount" type="number" min="1" max="1000" required value="'+(current.courts?.length??4)+'"></label>'+
    '<label class="field">Nenngeld normal (€) · bar<input name="standardFee" inputmode="decimal" required pattern="[0-9]+([,.][0-9]{1,2})?" value="'+euroInput(normal)+'"></label>'+
    '<label class="field">Nenngeld ermäßigt (€) · bar<input name="reducedFee" inputmode="decimal" required pattern="[0-9]+([,.][0-9]{1,2})?" value="'+euroInput(reduced)+'"></label>'+
    '</div>';
  if(!inline)return fields;
  return '<form data-form="settings">'+fields+
    '<p class="muted" style="margin-top:17px">Nach der Auslosung können Platzanzahl und Spiele je Team nur nach Rücknahme des Spielplans verändert werden.</p>'+
    '<div class="double-actions"><button class="btn primary" type="submit">Einstellungen speichern</button></div></form>';
}
function demoPanel(t){
  return '<section class="demo-panel"><div><strong>'+(t.demoMode?"DEMO-MODUS · Testdaten":"Demo-Kopie erstellen")+
    '</strong><p>'+(t.demoMode?"Zufallsergebnisse nur für dieses Testturnier; keine erfundenen Barzahlungen.":"Neue Testkopie mit denselben Turniereinstellungen und zufälligen festen Doppelteams.")+
    '</p></div><div class="demo-panel-actions"><button class="btn subtle small" data-act="demo-copy">Zufallsteams generieren</button>'+
    (t.demoMode?'<button class="btn primary small" data-act="demo-fill" '+(t.doubles.draw?"":'disabled title="Bitte zuerst auslosen"')+'>Offene Ergebnisse auswürfeln</button>':"")+'</div></section>';
}
function demoCopyDialog(t){
  const n=demoCountLimits(t);
  showDialog({eyebrow:"DEMO-MODUS",title:"Zufällige Teams erstellen",form:"demo-copy",submit:"Demo-Kopie anlegen",
    body:'<p>Es entsteht eine separate Kopie. Bisherige Teams, Ergebnisse und die Kasse bleiben unverändert.</p>'+
      '<label class="field">Anzahl Doppelteams<input type="number" name="demoCount" required min="'+n.min+'" max="'+n.max+'" step="1" value="'+n.defaultCount+'"></label>'+
      '<p class="field-hint">Je Team zwei Beispielspieler; Spielanzahl und verfügbare Plätze werden übernommen.</p>'});
}
function render() {
  const t=active();
  if(view==="home"||!t) {
    root.innerHTML=header()+home();
    return;
  }
  const tabs={overview,teams,draw:drawPage,table:tablePage,playoffs:playoffsPage,settings:settingsPage};
  root.innerHTML=header()+'<div class="app-layout double-app-layout">'+nav(t)+
    '<main class="main-area double-main-area">'+
    '<div class="toolbar"><div class="breadcrumb">TURNIERMANAGER <span>/</span> DOPPELTURNIER</div>'+
    '<div class="toolbar-actions">'+
    '<button class="btn live-open-link small" data-act="live-local">'+dIcon("monitor")+' Live-Monitor öffnen</button>'+
    '<button class="btn subtle small" data-act="backup">'+dIcon("download")+' Daten sichern</button>'+
    '<button class="btn subtle small" data-act="import">'+dIcon("upload")+' Daten laden</button>'+
    '</div></div>'+
    '<div class="hero"><div class="hero-body"><span class="hero-mark">02 / DOPPELTURNIER</span>'+
    '<h1>'+esc(t.name)+'</h1><p>'+dateText(t.date)+' · '+esc(t.startTime)+' Uhr · '+
      t.courts.length+' Plätze · '+t.rounds+' Spiele je Team · Top '+doublesPlayoffSize(t)+' Play-offs</p></div>'+
    '<div class="hero-orbit" aria-hidden="true"><div class="tennis-ball"></div></div></div>'+
    '<section class="screen double-main">'+demoPanel(t)+(tabs[view]||overview)(t)+'</section>'+
    '<footer class="double-footer">© Tennis-Schiri · TENNILO Doppelturnier v0.9.5 · Geschützte Testversion · Daten nur lokal</footer>'+
    '<input type="file" id="doubles-import" accept=".json,application/json" hidden></main></div>';
}

function showDialog({eyebrow,title,form,body,submit="Speichern"}) {
  dialogRoot.innerHTML='<dialog class="app-dialog" aria-labelledby="double-dialog-title">'+
    '<div class="dialog-top"><div><span class="eyebrow">'+esc(eyebrow)+'</span><h2 id="double-dialog-title">'+esc(title)+'</h2></div>'+
    '<button class="close-btn" data-act="close" type="button" aria-label="Schließen">×</button></div>'+
    '<form data-form="'+esc(form)+'">'+body+
    '<div class="dialog-buttons"><button type="button" class="btn ghost" data-act="close">Abbrechen</button>'+
    '<button type="submit" class="btn primary">'+esc(submit)+'</button></div></form></dialog>';
  const dialog=dialogRoot.querySelector("dialog");
  dialog.addEventListener("click",e=>{if(e.target===dialog)dialog.close();});
  dialog.addEventListener("close",()=>dialogRoot.replaceChildren(),{once:true});
  dialog.showModal();
}
function closeDialog(){dialogRoot.querySelector("dialog")?.close();}
function newDialog() {
  showDialog({eyebrow:"NEUES DOPPELTURNIER",title:"Doppelturnier anlegen",form:"create",submit:"Turnier anlegen",
    body:settingsFields()});
}
function teamDialog(t,team=null) {
  if(t.doubles.draw)throw Error("Vor dem Bearbeiten der Teams bitte die Auslosung zurücknehmen.");
  const tiers=t.feeCategories.map(c=>[c.id,c.name+" · "+euroText(c.amountCents)]);
  const tierSelect=(n,value)=>'<label class="field">Nenngeld-Kategorie Spieler '+n+'<select name="tier'+n+'">'+
    tiers.map(([id,label])=>'<option value="'+esc(id)+'" '+(id===value?"selected":"")+'>'+esc(label)+'</option>').join("")+'</select></label>';
  showDialog({eyebrow:team?"TEAM BEARBEITEN":"TEAM HINZUFÜGEN",title:team?"Doppelteam bearbeiten":"Neues Doppelteam",
    form:"team",submit:"Team speichern",
    body:'<input name="teamId" type="hidden" value="'+esc(team?.id||"")+'">'+
      '<div class="form-grid"><label class="field wide">Spieler 1<input name="player1" required maxlength="80" autocomplete="off" value="'+esc(team?.player1||"")+'"></label>'+
      '<label class="field wide">Spieler 2<input name="player2" required maxlength="80" autocomplete="off" value="'+esc(team?.player2||"")+'"></label>'+
      tierSelect(1,team?.tier1||"standard")+tierSelect(2,team?.tier2||"standard")+
      '<label class="field checkbox-field wide"><input name="present" type="checkbox" '+(team?.present===false?"":"checked")+'> Anwesend</label></div>'});
}
function cashDialog(t,team) {
  showDialog({eyebrow:"BAR-NENNGELD",title:name(team),form:"cash",submit:"Barzahlungen speichern",
    body:'<input type="hidden" name="teamId" value="'+esc(team.id)+'">'+
      '<p class="section-sub">Beträge sind die jeweils <strong>insgesamt bar erhaltenen</strong> Summen, keine zusätzliche Buchung.</p>'+
      '<div class="form-grid"><label class="field">Spieler 1 · '+esc(team.player1)+
      ' (Soll '+euroText(cashDue(t,team,1))+')<input name="paid1" required inputmode="decimal" pattern="[0-9]+([,.][0-9]{1,2})?" value="'+euroInput(cashPaid(team,1))+'"></label>'+
      '<label class="field">Spieler 2 · '+esc(team.player2)+
      ' (Soll '+euroText(cashDue(t,team,2))+')<input name="paid2" required inputmode="decimal" pattern="[0-9]+([,.][0-9]{1,2})?" value="'+euroInput(cashPaid(team,2))+'"></label></div>'});
}
function resultDialog(t,{round=null,stage=null,index}) {
  const m=stage?t.doubles.playoffs?.[stage]:(t.doubles.draw?.rounds[round]?.matches||[])[index];
  const match=stage?(Array.isArray(m)?m[index]:m):m;
  if(!match || !match.team1||!match.team2)throw Error("Diese Begegnung ist noch nicht bereit.");
  const r=match.result;
  showDialog({eyebrow:stage?"PLAY-OFF-ERGEBNIS":"VORRUNDENERGEBNIS",title:label(t,match.team1)+" gegen "+label(t,match.team2),
    form:stage?"playoff-result":"round-result",submit:"Ergebnis speichern",
    body:'<input name="round" type="hidden" value="'+(round??"")+'"><input name="stage" type="hidden" value="'+esc(stage||"")+
      '"><input name="index" type="hidden" value="'+index+'">'+
      '<div class="form-grid"><label class="field">'+(scoringRules(t).mode==="points"?"Punkte":"Games")+' Team 1<input name="score1" type="number" min="0" max="'+(scoringRules(t).mode==="points"?999:99)+'" required value="'+(r?.score1??"")+'"></label>'+
      '<label class="field">'+(scoringRules(t).mode==="points"?"Punkte":"Games")+' Team 2<input name="score2" type="number" min="0" max="'+(scoringRules(t).mode==="points"?999:99)+'" required value="'+(r?.score2??"")+'"></label>'+
      (scoringRules(t).mode==="points"?
      '<p class="muted">Erstes Team bis '+scoringRules(t).target+' Punkte'+(scoringRules(t).winByTwo?', mit 2 Punkten Vorsprung':'')+'. Sieger wird automatisch ermittelt; Uhrzeit nur geschätzt.</p>':
      '<label class="field">Entscheidungspunkte Team 1 (optional)<input name="points1" type="number" min="0" max="999" value="'+(r?.points1??"")+'"></label>'+
      '<label class="field">Entscheidungspunkte Team 2 (optional)<input name="points2" type="number" min="0" max="999" value="'+(r?.points2??"")+'"></label>'+
      '<label class="field wide">Siegerteam<select name="winner" required><option value="">Bitte wählen</option>'+
      '<option value="1" '+(r?.winner===1?"selected":"")+'>'+esc(label(t,match.team1))+'</option>'+
      '<option value="2" '+(r?.winner===2?"selected":"")+'>'+esc(label(t,match.team2))+'</option></select></label></div>'+
      '<p class="muted">Bei gleichem Game-Stand sind Entscheidungspunkte für beide Teams erforderlich.</p>')+
      (r?'<div class="double-actions" style="margin-top:12px"><button type="button" class="btn double-danger" data-act="reset-result" '+
        (stage?'data-stage="'+esc(stage)+'"':'data-round="'+round+'"')+' data-match="'+index+'">Ergebnis löschen</button></div>':'')});
}
function courtDialog(t) {
  showDialog({eyebrow:"PLATZBEZEICHNUNGEN",title:"Plätze benennen",form:"courts",
    body:'<div class="form-grid">'+t.courts.map(c=>
      '<label class="field">Platz '+c+'<input name="court-'+c+'" maxlength="60" value="'+esc(courtName(t,c))+'"></label>').join("")+'</div>'});
}
function showDemo() {
  const t=store.create({type:"doubles",demoMode:true,name:"Demo – Fun-Doppelturnier",date:todayLocal(),
    startTime:"10:00",duration:20,breakMinutes:10,rounds:4,courts:[1,2,3,4],
    entryFeeCents:500,feeCategories:[{id:"standard",name:"Standard",amountCents:500},
      {id:"ermaessigt",name:"Ermäßigt",amountCents:250}]});
  const players=[
    ["Alex Bauer","Robin Fischer"],["Kim Hartmann","Toni Berger"],["Mika Vogel","Luca Beck"],
    ["Jana Hoffmann","Sam Keller"],["Chris Sommer","Nina Seidel"],["Pat Winter","Max Schulz"],
    ["Lea König","Flo Neumann"],["Jules Meyer","Elli Brandt"]
  ];
  t.doubles.teams=players.map(([player1,player2])=>({
    id:uid(),player1,player2,present:true,tier1:"standard",tier2:"standard",paid1:0,paid2:0
  }));
  store.editTournament(t.id,{doubles:t.doubles});
  view="overview";render();flash("Doppelturnier-Demo mit acht festen Teams angelegt.");
}
function backup() {
  const blob=new Blob([store.exportJson()],{type:"application/json"});
  const url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download="tennilo-turniere-"+todayLocal()+".json";
  document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  flash("JSON-Sicherung heruntergeladen.");
}
function mutate(t,patch) {
  store.editTournament(t.id,patch);
  render();
}
function replaceDoubles(t,patch) {
  mutate(t,{doubles:{...t.doubles,...patch}});
}
function saveSettings(t,form,isCreate) {
  const d=new FormData(form),name=String(d.get("name")||"").trim();
  if(name.length<2||name.length>90)throw Error("Bitte einen Turniernamen mit 2–90 Zeichen eingeben.");
  const count=Number(d.get("courtCount")),games=Number(d.get("rounds")),playoffSize=Number(d.get("playoffSize"));
  if(!Number.isInteger(count)||count<1||count>1000)throw Error("Bitte 1–1000 Tennisplätze einstellen.");
  if(!Number.isInteger(games)||games<1||games>8)throw Error("Bitte 1–8 Spiele je Team einstellen.");
  if(![2,4,8,16].includes(playoffSize))throw Error("Bitte 2, 4, 8 oder 16 Teams für die Endrunde wählen.");
  if(t?.doubles.playoffs && playoffSize!==doublesPlayoffSize(t))
    throw Error("Bitte zuerst die laufenden Play-offs zurücknehmen, bevor die Qualifikationszahl geändert wird.");
  if(t?.doubles.draw&&(count!==t.courts.length||games!==t.rounds))
    throw Error("Bitte vor Änderungen an Platzanzahl oder Spielanzahl zuerst die Auslosung zurücknehmen.");
  const scoring=readScoringFields(form);
  const standard=euroCents(d.get("standardFee")),reduced=euroCents(d.get("reducedFee"));
  const courts=t?.courts.length===count?t.courts:Array.from({length:count},(_,i)=>i+1);
  const cats=[
    {id:"standard",name:"Standard",amountCents:standard},
    {id:"ermaessigt",name:"Ermäßigt",amountCents:reduced}
  ];
  const values={
    name,date:String(d.get("date")),startTime:String(d.get("startTime")),
    endTime:String(d.get("endTime")||"")||null,timeMode:scoring.matchMode==="points"?"fixed":d.get("timeMode")==="fit"?"fit":"fixed",...scoring,
    reservePlayoffs:d.has("reservePlayoffs"),playoffSize,duration:Number(d.get("duration")),breakMinutes:Number(d.get("breakMinutes")),
    rounds:games,courts,entryFeeCents:standard,feeCategories:cats
  };
  const preview={...(t||{}),...values,type:"doubles"};
  timeWindow(preview);
  if(preview.timeMode==="fit"&&!preview.endTime)throw Error("Für die Zeitoptimierung bitte eine Endzeit einstellen.");
  if(t)assertScoringChangeAllowed(t,preview);
  if(t?.doubles.draw)tournamentSchedule(preview);
  if(isCreate) {
    store.create({type:"doubles",...values});
  } else {
    store.editTournament(t.id,values);
  }
  view="overview";closeDialog();render();flash("Turniereinstellungen gespeichert.");
}
function saveTeam(t,form) {
  if(t.doubles.draw)throw Error("Die Teams sind nach der Auslosung gesperrt.");
  const d=new FormData(form),id=String(d.get("teamId")||"");
  const player1=String(d.get("player1")||"").trim(),player2=String(d.get("player2")||"").trim();
  if(!player1||!player2||player1.length>80||player2.length>80||
    player1.toLocaleLowerCase("de-DE")===player2.toLocaleLowerCase("de-DE"))
    throw Error("Ein Team benötigt zwei unterschiedliche Spielernamen.");
  const names=new Set(t.doubles.teams.filter(x=>x.id!==id).flatMap(x=>
    [x.player1.toLocaleLowerCase("de-DE"),x.player2.toLocaleLowerCase("de-DE")]));
  if(names.has(player1.toLocaleLowerCase("de-DE"))||names.has(player2.toLocaleLowerCase("de-DE")))
    throw Error("Ein Spieler gehört bereits einem anderen Team an.");
  if(!id&&t.doubles.teams.length>=100)throw Error("Maximal 100 Teams pro Turnier.");
  const old=t.doubles.teams.find(x=>x.id===id);
  if(id&&!old)throw Error("Team nicht gefunden.");
  const tier1=String(d.get("tier1")),tier2=String(d.get("tier2"));
  if(!t.feeCategories.some(x=>x.id===tier1)||!t.feeCategories.some(x=>x.id===tier2))
    throw Error("Ungültige Nenngeld-Kategorie.");
  const team={id:id||uid(),player1,player2,present:d.has("present"),
    tier1,tier2,paid1:old?.paid1||0,paid2:old?.paid2||0};
  const teams=old?t.doubles.teams.map(x=>x.id===id?team:x):[...t.doubles.teams,team];
  store.editTournament(t.id,{doubles:{...t.doubles,teams}});
  closeDialog();view="teams";render();flash("Doppelteam gespeichert.");
}
function saveCash(t,form) {
  const d=new FormData(form),id=String(d.get("teamId")),team=t.doubles.teams.find(x=>x.id===id);
  if(!team)throw Error("Team nicht gefunden.");
  const paid1=euroCents(d.get("paid1")),paid2=euroCents(d.get("paid2"));
  const teams=t.doubles.teams.map(x=>x.id===id?{...x,paid1,paid2}:x);
  store.editTournament(t.id,{doubles:{...t.doubles,teams}});
  closeDialog();view="teams";render();flash("Barzahlungen aktualisiert.");
}
function saveResult(t,form,playoff=false) {
  const d=new FormData(form),round=Number(d.get("round")),index=Number(d.get("index")),stage=String(d.get("stage")||"");
  if(scoringRules(t).mode!=="points"&&!d.get("winner"))throw Error("Bitte ein Siegerteam auswählen.");
  const value={
    score1:d.get("score1"),score2:d.get("score2"),points1:d.get("points1"),points2:d.get("points2"),
    winner:d.get("winner")
  };
  normalizeDoublesResult(value,t);
  if(playoff)replaceDoubles(t,{playoffs:updateDoublesPlayoffResult(t,stage,index,value)});
  else replaceDoubles(t,{draw:updateDoublesResult(t,round,index,value)});
  closeDialog();
  flash("Ergebnis gespeichert.");
}
document.addEventListener("click",event=>{
  const trigger=event.target.closest("[data-act]");
  if(!trigger||trigger.matches('input[type="checkbox"]'))return;
  const act=trigger.dataset.act,t=active();
  if(act==="home"){view="home";render();return;}
  if(act==="new")return newDialog();
  if(act==="demo")return run(showDemo);
  if(act==="demo-copy"&&t)return demoCopyDialog(t);
  if(act==="demo-fill"&&t)return run(()=>{
    const {patch,filled}=fillDemoResults(t);
    if(filled)store.editTournament(t.id,patch);
    render();flash(filled?filled+" offene Spiele mit Zufallsergebnissen gefüllt.":"Keine offenen Begegnungen vorhanden.");
  });
  if(act==="import")return document.getElementById("doubles-import")?.click();
  if(act==="open")return run(()=>{store.setActive(trigger.dataset.id);view="overview";render();});
  if(act==="tab"){view=trigger.dataset.tab;render();return;}
  if(act==="settings"){view="settings";render();return;}
  if(act==="close")return closeDialog();
  if(!t)return;
  if(act==="live-local") {
    const target=new URL("./live.html",window.location.href);
    target.searchParams.set("turnier",t.id);
    window.open(target.href,"_blank","noopener,noreferrer");
    return;
  }
  if(act==="live-round")return run(()=>{
    const index=Number(trigger.dataset.round);
    if(!t.doubles.draw||!verifyDoublesDraw(t).ok||
      !Number.isInteger(index)||index<0||index>=t.doubles.draw.rounds.length)
      throw Error("Bitte zuerst eine gültige Doppel-Vorrunde auslosen.");
    mutate(t,{liveDisplay:{mode:"round",index}});
    flash("Diese Runde wird auf dem Live-Monitor gezeigt.");
  });
  if(act==="live-playoffs")return run(()=>{
    if(!t.doubles.playoffs||!doublesPlayoffStatus(t).ready)
      throw Error("Bitte zuerst gültige Play-offs festlegen.");
    mutate(t,{liveDisplay:{mode:"finals"}});
    flash("Der Live-Monitor zeigt automatisch die aktuelle Endrunde an.");
  });
  if(act==="live-stage")return run(()=>{
    if(!t.doubles.playoffs||!doublesPlayoffStatus(t).ready)
      throw Error("Bitte zuerst die Play-off-Paarungen festlegen.");
    const stage=trigger.dataset.stage;
    const info=doublesPlayoffStages(t).find(s=>s.id===stage);
    if(!info)throw Error("Unbekannte Endrunde.");
    mutate(t,{liveDisplay:{mode:"finals",stage}});
    flash(info.title+" wird auf dem Live-Monitor angezeigt.");
  });
  if(act==="live-auto")return run(()=>{
    mutate(t,{liveDisplay:null});
    flash("Der Live-Monitor wählt die laufende Runde oder die Play-offs automatisch.");
  });
  if(act==="remote-start") {
    if(readLiveSecrets(t.id))return flash("Fernanzeige ist bereits aktiv.");
    if(!t.doubles.draw||!verifyDoublesDraw(t).ok)
      return flash("Bitte zuerst eine gültige Doppel-Vorrunde auslosen.",true);
    let keys;
    try{keys=createLiveSecrets(window.crypto);}catch(error){return flash(error.message,true);}
    return publishLive(keys,publicLiveSnapshot(t)).then(()=>{
      saveLiveSecrets(t.id,keys);
      remoteLastSent=Date.now();remoteErrorShown=false;
      render();flash("Fernanzeige aktiviert. Den Zuschauer-Link jetzt kopieren.");
    }).catch(error=>flash("Fernanzeige konnte nicht aktiviert werden: "+error.message,true));
  }
  if(act==="remote-copy") {
    const keys=readLiveSecrets(t.id);
    if(!keys)return flash("Bitte zuerst die Fernanzeige aktivieren.",true);
    const link=remoteLiveUrl(keys.channel,window.location.href);
    if(navigator.clipboard?.writeText){
      return navigator.clipboard.writeText(link).then(()=>flash("Live-Link kopiert."))
        .catch(()=>window.prompt?.("Live-Link kopieren:",link));
    }
    window.prompt?.("Live-Link kopieren:",link);
    return;
  }
  if(act==="remote-stop") {
    const keys=readLiveSecrets(t.id);
    if(!keys)return;
    if(!confirm("Fernanzeige beenden? Der geteilte Link wird ungültig."))return;
    remoteStopPending=true;
    return (remoteRequest||Promise.resolve()).catch(()=>{})
      .then(()=>publishLive(keys,null,{action:"stop"})).then(()=>{
        clearLiveSecrets(t.id);remoteLastSent=0;remoteErrorShown=false;
        render();flash("Fernanzeige beendet. Der Zuschauer-Link wurde widerrufen.");
      }).catch(error=>flash("Fernanzeige konnte nicht beendet werden: "+error.message,true))
      .finally(()=>{remoteStopPending=false;});
  }
  if(act==="team-add")return run(()=>teamDialog(t));
  if(act==="team-edit")return run(()=>teamDialog(t,t.doubles.teams.find(x=>x.id===trigger.dataset.id)));
  if(act==="cash")return run(()=>cashDialog(t,t.doubles.teams.find(x=>x.id===trigger.dataset.id)));
  if(act==="edit-courts")return courtDialog(t);
  if(act==="team-remove")return run(()=>{
    if(t.doubles.draw)throw Error("Bitte zuerst die Auslosung zurücknehmen.");
    const team=t.doubles.teams.find(x=>x.id===trigger.dataset.id);
    if(team&&confirm("Team „"+name(team)+"“ wirklich löschen?"))
      replaceDoubles(t,{teams:t.doubles.teams.filter(x=>x.id!==team.id)});
  });
  if(act==="draw-generate")return run(()=>{
    if(t.doubles.draw&&!confirm("Bisherige Auslosung mit allen Ergebnissen ersetzen?"))return;
    let draw=null,reason=null;
    // Random draws may need different block counts. Retry until a valid
    // end-time plan is found; seed 37 mirrors the feasibility preview.
    for(let attempt=0;attempt<8;attempt++){
      const seed=attempt===7?37:Math.floor(Math.random()*2147483647);
      try{
        const candidate=generateDoublesDraw(t,{seed});
        const plan=tournamentSchedule({...t,doubles:{...t.doubles,draw:candidate}});
        if(plan.overTarget&&t.timeMode==="fit")throw Error("Endzeit ist zu knapp.");
        draw=candidate;
        break;
      }catch(e){reason=e;}
    }
    if(!draw)throw reason||Error("Für dieses Zeitfenster ist keine passende Auslosung möglich.");
    store.editTournament(t.id,{doubles:{...t.doubles,draw,playoffs:null,tieBreaks:[]},roundClocks:{}});
    currentRound=0;view="draw";render();flash("Vorrunde ausgelost. Alle Begegnungen sind ohne Wiederholung.");
  });
  if(act==="draw-reset")return run(()=>{
    if(!confirm("Vorrunde inklusive Ergebnissen und Play-offs wirklich zurücknehmen? Barzahlungen bleiben erhalten."))return;
    store.editTournament(t.id,{doubles:{...t.doubles,draw:null,playoffs:null,tieBreaks:[]},roundClocks:{}});
    currentRound=0;render();flash("Auslosung zurückgenommen.");
  });
  if(act==="round"){currentRound=Number(trigger.dataset.round);render();return;}
  if(act==="result")return run(()=>resultDialog(t,{
    round:trigger.dataset.round!==undefined?Number(trigger.dataset.round):null,
    stage:trigger.dataset.stage||null,index:Number(trigger.dataset.match)
  }));
  if(act==="reset-result")return run(()=>{
    if(!confirm("Ergebnis dieser Begegnung wirklich löschen?"))return;
    const i=Number(trigger.dataset.match);
    if(trigger.dataset.stage){
      replaceDoubles(t,{playoffs:updateDoublesPlayoffResult(t,trigger.dataset.stage,i,{winner:""})});
    }else {
      replaceDoubles(t,{draw:updateDoublesResult(t,Number(trigger.dataset.round),i,{winner:""})});
    }
    closeDialog();flash("Ergebnis zurückgesetzt.");
  });
  if(["tie-onsite","tie-manual","tie-random"].includes(act))return run(()=>{
    const index=Number(trigger.dataset.tie);
    if(!Number.isInteger(index)||index<0)throw Error("Gleichstandsgruppe nicht gefunden.");
    if(act==="tie-onsite"||act==="tie-manual")
      return tieDecisionDialog(t,index,act==="tie-onsite"?"onsite":"manual");
    const info=doublesStandings(t),group=info.tieGroups[index];
    if(!group||!info.finished||t.doubles.playoffs||group.method==="direct")
      throw Error("Gleichstandsentscheidung derzeit nicht möglich.");
    if(!confirm("Die Reihenfolge dieser "+group.ids.length+" Teams jetzt per Zufall festlegen und speichern?"))return;
    const order=drawDoublesTieOrder(group.ids,window.crypto);
    replaceDoubles(t,{tieBreaks:decideDoublesTie(t,group.ids,order,"random")});
    flash("Losentscheid gespeichert: "+order.map(id=>label(t,id)).join(" · "));
  });
  if(act==="playoffs-generate")return run(()=>{
    if(!confirm("Die "+doublesPlayoffSize(t)+" qualifizierten Teams nach den festen Tabellenpaarungen (1 gegen "+doublesPlayoffSize(t)+", 2 gegen "+(doublesPlayoffSize(t)-1)+" usw.) in die Endrunde übernehmen?"))return;
    replaceDoubles(t,{playoffs:createDoublesPlayoffs(t)});
    flash("Play-off-Paarungen gemäß Setzliste festgelegt.");
  });
  if(act==="playoffs-reset")return run(()=>{
    if(!confirm("Play-offs und sämtliche Play-off-Ergebnisse zurücknehmen? Die Vorrunde bleibt erhalten."))return;
    replaceDoubles(t,{playoffs:null});flash("Play-offs zurückgenommen.");
  });
  if(act==="clock")return run(()=>{
    const index=Number(trigger.dataset.round),operation=trigger.dataset.clock;
    if(operation==="reset"&&!confirm("Rundenuhr zurücksetzen?"))return;
    if(operation==="finish"&&!confirm("Runde beenden und Rundenuhr anhalten?"))return;
    mutate(t,{roundClocks:changeDoublesClock(t,index,operation)});
    flash("Rundenuhr aktualisiert.");
  });
  if(act==="delete")return run(()=>{
    if(readLiveSecrets(t.id))throw Error("Bitte zuerst die Fernanzeige beenden, damit der Zuschauer-Link widerrufen wird.");
    if(!confirm("Doppelturnier „"+t.name+"“ inklusive aller Daten wirklich löschen?"))return;
    store.deleteTournament(t.id);view="home";render();flash("Turnier gelöscht.");
  });
  if(act==="backup")return run(backup);
});
document.addEventListener("change",event=>{
  const el=event.target,t=active();
  if(el.id==="doubles-tournament-select")return run(()=>{
    store.setActive(el.value);view="overview";currentRound=0;render();
  });
  if(el.id==="doubles-import"&&el.files?.[0]){
    const file=el.files[0];
    if(file.size>3000000){flash("Die Sicherung ist zu groß (maximal 3 MB).",true);el.value="";return;}
    if(!confirm("Alle aktuell in diesem Browser gespeicherten Turniere durch die JSON-Sicherung ersetzen?")){
      el.value="";return;
    }
    file.text().then(raw=>run(()=>{
      store.importJson(raw);
      view="home";currentRound=0;
      render();flash("Sicherung geladen. Doppel- und Schleifchenturniere sind wiederhergestellt.");
    })).catch(()=>flash("Die Sicherungsdatei konnte nicht gelesen werden.",true));
    return;
  }
  if(!t)return;
  if(el.dataset.act==="presence")return run(()=>{
    if(t.doubles.draw)throw Error("Anwesenheit ist nach der Auslosung gesperrt.");
    replaceDoubles(t,{teams:t.doubles.teams.map(x=>x.id===el.dataset.id?{...x,present:el.checked}:x)});
  });
  if(el.dataset.act==="playoff-court")return run(()=>{
    if(!t.doubles.playoffs)throw Error("Bitte zuerst die Endrunde festlegen.");
    const stage=el.dataset.stage,index=Number(el.dataset.match),court=Number(el.value);
    replaceDoubles(t,{playoffs:updateDoublesPlayoffCourt(t,stage,index,court)});
    flash("Platzzuordnung gespeichert: "+courtName(t,court));
  });
  if(el.dataset.act==="playoff-eligible")return run(()=>{
    if(t.doubles.playoffs)throw Error("Bitte zuerst die Play-offs zurücknehmen.");
    const excluded=new Set(t.doubles.playoffOptOut||[]);
    const standing=doublesStandings(t);
    const before=doublesPlayoffSeeding(t,standing.ranking);
    if(el.checked) {
      if(!excluded.has(el.dataset.id))throw Error("Nur abgesagte Teams können auf diesem Weg wieder zugelassen werden.");
      excluded.delete(el.dataset.id);
    }else {
      if(!before.seeds.includes(el.dataset.id))throw Error("Nur aktuell qualifizierte Teams können absagen.");
      excluded.add(el.dataset.id);
    }
    replaceDoubles(t,{playoffOptOut:[...excluded]});
    const next=doublesPlayoffSeeding({...t,doubles:{...t.doubles,playoffOptOut:[...excluded]}},standing.ranking);
    const newcomer=next.seeds.find(id=>!before.seeds.includes(id));
    if(newcomer)flash("Nachrücker automatisch qualifiziert: "+label(t,newcomer));
    else flash(el.checked?"Team wieder zugelassen. Setzliste aktualisiert.":"Absage vermerkt. Setzliste aktualisiert.");
  });
});
document.addEventListener("submit",event=>{
  const form=event.target.closest("form[data-form]");
  if(!form)return;
  event.preventDefault();
  const t=active(),kind=form.dataset.form;
  run(()=>{
    if(kind==="demo-copy"){
      if(!t)throw Error("Kein Doppelturnier gewählt.");
      const copy=store.create(makeDemoCopy(t,new FormData(form).get("demoCount")));
      closeDialog();view="overview";currentRound=0;render();flash(copy.name+" erstellt. Jetzt auslosen und Ergebnisse auswürfeln.");return;
    }
    if(kind==="create")return saveSettings(null,form,true);
    if(!t)throw Error("Kein Doppelturnier gewählt.");
    if(kind==="settings")return saveSettings(t,form,false);
    if(kind==="team")return saveTeam(t,form);
    if(kind==="cash")return saveCash(t,form);
    if(kind==="round-result")return saveResult(t,form);
    if(kind==="playoff-result")return saveResult(t,form,true);
    if(kind==="tie-decision"){
      const d=new FormData(form);
      let ids;
      try{ids=JSON.parse(String(d.get("tieIds")||""));}catch{throw Error("Ungültige Gleichstandsgruppe.");}
      const info=doublesStandings(t);
      const group=info.tieGroups.find(x=>Array.isArray(ids)&&x.ids.length===ids.length&&
        x.ids.every((id,i)=>id===ids[i]));
      if(!group||group.signature!==String(d.get("tieSignature")||""))
        throw Error("Die Ergebnisse haben sich geändert. Bitte den Gleichstand neu öffnen.");
      const order=group.ids.map((_,i)=>String(d.get("tieRank"+i)||""));
      const method=String(d.get("tieMethod")||"");
      replaceDoubles(t,{tieBreaks:decideDoublesTie(t,ids,order,method)});
      closeDialog();flash(method==="onsite"?"Losentscheid vor Ort gespeichert.":"Rangfolge gespeichert.");
      return;
    }
    if(kind==="courts"){
      const d=new FormData(form),labels={},names=new Set();
      for(const court of t.courts){
        const title=String(d.get("court-"+court)||"").trim()||"Platz "+court;
        const key=title.toLocaleLowerCase("de-DE");
        if(title.length>60||names.has(key))throw Error("Bitte eindeutige Platznamen mit maximal 60 Zeichen vergeben.");
        names.add(key);labels[court]=title;
      }
      store.editTournament(t.id,{courtLabels:labels});closeDialog();render();flash("Platznamen gespeichert.");
    }
  });
});
window.addEventListener("storage",event=>{
  if(event.key==="tennis-schiri-tournaments-v1"){
    store.state=store.load();render();flash("Turnierdaten aus einem anderen Browser-Tab aktualisiert.");
  }
});
if(typeof window.setInterval==="function"){
  window.setInterval(()=>{
    if(Date.now()-remoteLastSent>=3000)pushRemote();
    const t=active();
    if(!t||view!=="draw")return;
    for(const element of document.querySelectorAll("[data-clock][role=timer]")){
      const index=Number(element.dataset.clock),clock=clockFor(t,index);
      element.textContent=clock.display;
      element.className="clock"+(clock.expired?" over":"");
    }
  },1000);
}
render();
if(window.location.hash==="#neu"){
  history.replaceState(null,"",window.location.pathname+window.location.search);
  newDialog();
}
