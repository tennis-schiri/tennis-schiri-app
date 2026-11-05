import {BrowserTournamentStore,todayLocal,uid} from "./storage.js?v=070";
import {euroCents,euroText,euroInput,clockFor} from "./operations.js?v=061";
import {
  analyzeDoublesSetup,generateDoublesDraw,verifyDoublesDraw,updateDoublesResult,
  doublesStandings,doublesPlayoffPreview,createDoublesPlayoffs,updateDoublesPlayoffResult,
  doublesPlayoffStatus,doublesPlanRound,changeDoublesClock,normalizeDoublesResult
} from "./doubles.js?v=070";
import {
  publicLiveSnapshot,createLiveSecrets,readLiveSecrets,saveLiveSecrets,
  clearLiveSecrets,publishLive,remoteLiveUrl
} from "./remote-live.js?v=070";

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
function header() {
  return '<header class="shell-header"><div class="header-inner">'+
    '<a class="doubles-logo" href="./index.html">TENN<span>I</span>LO <small style="font-size:.48em;letter-spacing:.02em;color:#c9dcda"> / DOPPELTURNIER</small></a>'+
    '<span class="dev-chip">GESCHÜTZTE TESTVERSION · V0.7.0</span></div></header>';
}
function note() {
  return '<div class="browser-notice"><div><strong>Lokale Testversion</strong>'+
    '<p>Teams, Barzahlungen und Ergebnisse werden im Browser dieses Geräts gespeichert. '+
    'Sichere die Daten regelmäßig als JSON. Eine öffentliche Fernanzeige und die gemeinsame Bearbeitung auf anderen Geräten sind für diesen Doppelmodus noch nicht freigeschaltet.</p></div></div>';
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
  return '<main class="double-shell double-intro"><div class="eyebrow">TENNILO / TURNIERART 02</div>'+
    '<h1>Feste Teams.<br><em>Gemeinsame Siege.</em></h1>'+
    '<p class="lead">Doppelturniere mit festen Paarungen, Vorrunde, Livetabelle und Top-8-Play-offs organisieren.</p>'+
    '<div class="welcome-actions"><button class="btn primary" data-act="new">Doppelturnier anlegen</button>'+
    '<button class="btn ghost" data-act="demo">Demoturnier laden</button>'+
    '<a class="btn ghost" href="./index.html">Zur Hauptstartseite</a>'+
    '<button class="btn ghost" data-act="import">Sicherung laden</button>'+
    '<input type="file" id="doubles-import" accept=".json,application/json" hidden></div>'+
    (all.length?'<h2>Deine Doppelturniere ('+all.length+')</h2><div class="double-list">'+all.map(t=>
    '<article class="double-saved"><span class="eyebrow">DOPPELTURNIER</span>'+
    '<h3>'+esc(t.name)+'</h3><p>'+dateText(t.date)+' · '+t.doubles.teams.length+' Teams · '+t.courts.length+' Plätze</p>'+
    '<button class="btn primary small" data-act="open" data-id="'+esc(t.id)+'">Turnier öffnen</button></article>').join("")+
    '</div>':'<div class="double-panel"><h3>Noch kein Doppelturnier angelegt</h3><p>Lege ein Turnier an oder lade ein Beispiel mit acht festen Doppelteams.</p></div>')+
    note()+'</main>';
}
function nav(t) {
  const tabs=[["overview","Übersicht"],["teams","Teams & Kasse"],["draw","Spielplan"],["table","Livetabelle"],["playoffs","Play-offs"],["settings","Einstellungen"]];
  return '<nav class="double-nav" aria-label="Doppelturnier Bereiche">'+
    '<a href="./index.html">← TENNILO Start</a>'+
    '<button type="button" data-act="home">Alle Doppelturniere</button>'+
    tabs.map(([id,title])=>'<button type="button" data-act="tab" data-tab="'+id+'" class="'+(view===id?"active":"")+'">'+title+'</button>').join("")+
    '<hr style="border:0;border-top:1px solid #d6e0d8;width:100%">'+
    '<button data-act="new">+ Neues Doppelturnier</button><button data-act="backup">Daten sichern (JSON)</button>'+
    '<button data-act="import">Sicherung laden (JSON)</button>'+
    '<input type="file" id="doubles-import" accept=".json,application/json" hidden></nav>';
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
function overview(t) {
  const draw=t.doubles.draw,valid=draw?verifyDoublesDraw(t):null;
  let progress=null;
  try{if(valid?.ok)progress=doublesStandings(t);}catch{}
  const stage=t.doubles.playoffs?doublesPlayoffStatus(t):null;
  return sectionHead("DOPPELTURNIER / ZENTRALE","Turnierübersicht",
    "Feste Teams, Vorrunde und die besten acht Teams in den Play-offs.",
    '<button class="btn subtle" data-act="settings">Turniereinstellungen</button>')+
    stats(t)+livePanel(t)+
    '<div class="double-grid"><section class="double-panel"><h3>Turnierstatus</h3>'+
    '<p><strong>Turnier:</strong> '+esc(t.name)+'<br><strong>Datum:</strong> '+dateText(t.date)+
    '<br><strong>Start:</strong> '+esc(t.startTime)+' Uhr<br><strong>Spieldauer:</strong> '+t.duration+
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
function matchMarkup(t,m,index,{playoff=null,stage="",round=0}={}) {
  const a=label(t,m.team1),b=label(t,m.team2),ready=!!(m.team1&&m.team2),result=m.result,has=hasResult(m);
  const planned=ready;
  return '<article class="double-match"><div class="double-match-head"><span>'+(!playoff?'Spiel '+(index+1)+' · '+esc(courtName(t,m.court)):
      esc(courtName(t,m.court||t.courts[0])))+'</span>'+
    '<span class="double-tag '+(has?"winner":"pending")+'">'+(has?"Ergebnis gespeichert":"Offen")+'</span></div>'+
    '<div class="double-teams"><div class="double-side '+(has&&result.winner===1?"win":"")+'"><strong>'+esc(a)+'</strong></div>'+
    '<span class="double-versus">'+(has?'<span class="double-score">'+result.score1+':'+result.score2+'</span>':"gegen")+'</span>'+
    '<div class="double-side '+(has&&result.winner===2?"win":"")+'"><strong>'+esc(b)+'</strong></div></div>'+
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
  if(!draw)return top+(setup.ok?'<div class="double-success">'+setup.teams+' anwesende Teams · '+setup.fixtures+' Begegnungen · '+t.courts.length+' Plätze. Auslosung bereit.</div>':
    '<div class="double-warning">'+esc(setup.errors.join(" · "))+'</div>')+
    '<section class="double-panel"><h3>Spielmodus</h3><p>1 Satz · No-Ad · bei Game-Gleichstand Entscheidungspunkte. Rangliste: Siege, danach Game-Differenz, dann gewonnene Games.</p></section>';
  if(check&&!check.ok)return top+'<div class="double-warning">'+esc(check.errors.join(" · "))+'</div>';
  const index=Math.min(currentRound,draw.rounds.length-1),r=draw.rounds[index];
  const done=r.matches.filter(hasResult).length;
  const all=draw.rounds.flatMap(x=>x.matches);
  return top+livePanel(t)+'<div class="double-success">'+all.filter(hasResult).length+' von '+all.length+' Begegnungen erfasst. '+draw.rounds.length+' zeitliche Spielblöcke.</div>'+
    '<div class="double-round-list" aria-label="Runde auswählen">'+
    draw.rounds.map((item,i)=>'<button data-act="round" data-round="'+i+'" class="'+(i===index?"active":"")+'">Runde '+(i+1)+
      (item.matches.every(hasResult)?" ✓":"")+'</button>').join("")+'</div>'+
    '<section class="double-panel"><h3>Runde '+(index+1)+' · '+done+' / '+r.matches.length+' Ergebnisse</h3>'+
    '<div class="double-actions"><button class="btn ghost small" data-act="live-round" data-round="'+index+'">Diese Runde auf Monitor zeigen</button></div>'+
    roundTimer(t,index)+r.matches.map((m,i)=>matchMarkup(t,m,i,{round:index})).join("")+'</section>';
}
function tablePage(t) {
  const head=sectionHead("DOPPELTURNIER / RANGLISTE","Livetabelle",
    "Wertung: Siege → Game-Differenz → Games + → Name.");
  if(!t.doubles.draw)return head+'<div class="double-warning">Bitte zuerst die Vorrunde auslosen.</div>';
  let info;
  try{info=doublesStandings(t);}catch(e){return head+'<div class="double-warning">'+esc(e.message)+'</div>';}
  return head+'<div class="double-success">'+info.complete+' von '+info.planned+' Begegnungen erfasst.</div>'+
    '<section class="double-panel"><div class="double-table-wrap"><table class="double-table"><thead><tr>'+
    '<th>Rang</th><th>Doppelteam</th><th>Sp</th><th>S</th><th>N</th><th>Games +</th><th>Games −</th><th>Diff.</th></tr></thead><tbody>'+
    info.ranking.map((x,i)=>'<tr><td><strong>'+(i+1)+'</strong></td><td><strong>'+esc(x.name)+'</strong></td>'+
      '<td>'+x.played+'</td><td>'+x.wins+'</td><td>'+x.losses+'</td><td>'+x.gamesFor+'</td>'+
      '<td>'+x.gamesAgainst+'</td><td>'+x.gameDiff+'</td></tr>').join("")+
    '</tbody></table></div></section><p class="muted">Bei vollständigem Gleichstand entscheidet vorläufig die alphabetische Reihenfolge. Play-off-Teilnahme kann vor dem Auslosen manuell abgewählt werden.</p>';
}
function playoffStage(t,title,id,matches) {
  return '<section class="double-panel"><h3>'+title+'</h3>'+
    matches.map((m,i)=>matchMarkup(t,m,i,{playoff:true,stage:id})).join("")+'</section>';
}
function playoffsPage(t) {
  const head=sectionHead("DOPPELTURNIER / ENDRUNDE","Top-8-Play-offs",
    "Gesetzt nach der Livetabelle, abwählbare Teams und automatische Nachrücker.");
  if(!t.doubles.draw)return head+'<div class="double-warning">Zuerst die Vorrunde auslosen.</div>';
  let preview;
  try{preview=doublesPlayoffPreview(t);}catch(e){return head+'<div class="double-warning">'+esc(e.message)+'</div>';}
  const stage=doublesPlayoffStatus(t);
  if(t.doubles.playoffs) {
    if(!stage.ready)return head+'<div class="double-warning">'+esc(stage.error||"Play-offs nicht verfügbar.")+'</div>';
    const p=stage.playoffs;
    return head+livePanel(t)+'<div class="double-actions"><button class="btn ghost" data-act="live-playoffs">Play-offs auf Monitor zeigen</button>'+
      '<button class="btn double-danger" data-act="playoffs-reset">Play-offs zurücknehmen</button></div>'+
      (stage.champion?'<div class="double-success"><strong>Turniersieger: '+esc(label(t,stage.champion))+'</strong>'+
        (stage.third?'<br>Platz 3: '+esc(label(t,stage.third)):'')+'</div>':'')+
      '<div class="double-bracket"><div>'+playoffStage(t,"Viertelfinale","quarterfinals",p.quarterfinals)+
      playoffStage(t,"Halbfinale","semifinals",p.semifinals)+'</div><div>'+
      playoffStage(t,"Finale","final",[p.final])+playoffStage(t,"Spiel um Platz 3","thirdPlace",[p.thirdPlace])+'</div></div>'+
      '<p class="muted">Bei Änderung einer früheren Partie werden abhängige Ergebnisse zurückgesetzt, sobald sich eine Paarung ändert.</p>';
  }
  const excluded=new Set(t.doubles.playoffOptOut||[]);
  const selection=preview.ranking.map((x,i)=>'<label class="double-checkbox">'+
    '<input type="checkbox" data-act="playoff-eligible" data-id="'+esc(x.id)+'" '+(!excluded.has(x.id)?"checked":"")+'>'+
    '<span>Rang '+(i+1)+' · '+esc(x.name)+'</span></label>').join("");
  return head+'<div class="'+(preview.ready?"double-success":"double-warning")+'">'+
    (preview.ready?"Play-offs sind bereit. Acht Teams werden nach Rangliste gesetzt.":esc(preview.reason))+'</div>'+
    '<section class="double-panel"><h3>Teilnahme an der Endrunde</h3><p>Häkchen entfernen, falls ein Team nicht teilnehmen kann. Das nächste zugelassene Team rückt nach.</p>'+
    selection+'<div class="double-actions" style="margin-top:17px"><button class="btn primary" data-act="playoffs-generate" '+(preview.ready?"":"disabled")+'>Top 8 auslosen</button></div></section>';
}
function settingsPage(t) {
  return sectionHead("DOPPELTURNIER / EINSTELLUNGEN","Turnier konfigurieren",
    "Platzanzahl und Spielzeit anpassen. Die Paarungen bleiben nach der Auslosung geschützt.")+
    '<section class="double-panel">'+settingsFields(t,true)+
    '<div class="double-actions" style="margin-top:20px"><button class="btn subtle" data-act="edit-courts">Plätze benennen</button>'+
    '<button class="btn double-danger" data-act="delete">Turnier löschen</button></div></section>';
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
function render() {
  const t=active();
  if(view==="home"||!t) {
    root.innerHTML=header()+home();
    return;
  }
  const tabs={overview,teams,draw:drawPage,table:tablePage,playoffs:playoffsPage,settings:settingsPage};
  root.innerHTML=header()+'<main class="double-shell"><div class="double-hero"><div class="eyebrow">FESTE DOPPELPARTNER · TURNIERLEITUNG</div>'+
    '<h1>'+esc(t.name)+'</h1><p>'+dateText(t.date)+' · '+t.courts.length+' Plätze · '+t.rounds+' Spiele pro Team</p></div>'+
    '<div class="double-content">'+nav(t)+'<section class="double-main">'+(tabs[view]||overview)(t)+'</section></div>'+
    '<footer class="double-footer">© Tennis-Schiri · TENNILO Doppelturnier v0.7.0 · Geschützte Testversion · Daten nur lokal</footer></main>';
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
      '<div class="form-grid"><label class="field">Games Team 1<input name="score1" type="number" min="0" max="99" required value="'+(r?.score1??"")+'"></label>'+
      '<label class="field">Games Team 2<input name="score2" type="number" min="0" max="99" required value="'+(r?.score2??"")+'"></label>'+
      '<label class="field">Entscheidungspunkte Team 1 (optional)<input name="points1" type="number" min="0" max="999" value="'+(r?.points1??"")+'"></label>'+
      '<label class="field">Entscheidungspunkte Team 2 (optional)<input name="points2" type="number" min="0" max="999" value="'+(r?.points2??"")+'"></label>'+
      '<label class="field wide">Siegerteam<select name="winner" required><option value="">Bitte wählen</option>'+
      '<option value="1" '+(r?.winner===1?"selected":"")+'>'+esc(label(t,match.team1))+'</option>'+
      '<option value="2" '+(r?.winner===2?"selected":"")+'>'+esc(label(t,match.team2))+'</option></select></label></div>'+
      '<p class="muted">Bei gleichem Game-Stand sind Entscheidungspunkte für beide Teams erforderlich.</p>'+
      (r?'<div class="double-actions" style="margin-top:12px"><button type="button" class="btn double-danger" data-act="reset-result" '+
        (stage?'data-stage="'+esc(stage)+'"':'data-round="'+round+'"')+' data-match="'+index+'">Ergebnis löschen</button></div>':'')});
}
function courtDialog(t) {
  showDialog({eyebrow:"PLATZBEZEICHNUNGEN",title:"Plätze benennen",form:"courts",
    body:'<div class="form-grid">'+t.courts.map(c=>
      '<label class="field">Platz '+c+'<input name="court-'+c+'" maxlength="60" value="'+esc(courtName(t,c))+'"></label>').join("")+'</div>'});
}
function showDemo() {
  const t=store.create({type:"doubles",name:"Demo – Fun-Doppelturnier",date:todayLocal(),
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
  const count=Number(d.get("courtCount")),games=Number(d.get("rounds"));
  if(!Number.isInteger(count)||count<1||count>1000)throw Error("Bitte 1–1000 Tennisplätze einstellen.");
  if(!Number.isInteger(games)||games<1||games>8)throw Error("Bitte 1–8 Spiele je Team einstellen.");
  if(t?.doubles.draw&&(count!==t.courts.length||games!==t.rounds))
    throw Error("Bitte vor Änderungen an Platzanzahl oder Spielanzahl zuerst die Auslosung zurücknehmen.");
  const standard=euroCents(d.get("standardFee")),reduced=euroCents(d.get("reducedFee"));
  const courts=t?.courts.length===count?t.courts:Array.from({length:count},(_,i)=>i+1);
  const cats=[
    {id:"standard",name:"Standard",amountCents:standard},
    {id:"ermaessigt",name:"Ermäßigt",amountCents:reduced}
  ];
  const values={
    name,date:String(d.get("date")),startTime:String(d.get("startTime")),
    duration:Number(d.get("duration")),breakMinutes:Number(d.get("breakMinutes")),
    rounds:games,courts,entryFeeCents:standard,feeCategories:cats
  };
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
  if(!d.get("winner"))throw Error("Bitte ein Siegerteam auswählen.");
  const value={
    score1:d.get("score1"),score2:d.get("score2"),points1:d.get("points1"),points2:d.get("points2"),
    winner:d.get("winner")
  };
  normalizeDoublesResult(value);
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
      throw Error("Bitte zuerst gültige Play-offs auslosen.");
    mutate(t,{liveDisplay:{mode:"finals"}});
    flash("Die Play-offs werden auf dem Live-Monitor gezeigt.");
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
    const draw=generateDoublesDraw(t,{seed:Math.floor(Math.random()*2147483647)});
    store.editTournament(t.id,{doubles:{...t.doubles,draw,playoffs:null},roundClocks:{}});
    currentRound=0;view="draw";render();flash("Vorrunde ausgelost. Alle Begegnungen sind ohne Wiederholung.");
  });
  if(act==="draw-reset")return run(()=>{
    if(!confirm("Vorrunde inklusive Ergebnissen und Play-offs wirklich zurücknehmen? Barzahlungen bleiben erhalten."))return;
    store.editTournament(t.id,{doubles:{...t.doubles,draw:null,playoffs:null},roundClocks:{}});
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
  if(act==="playoffs-generate")return run(()=>{
    if(!confirm("Die besten acht zugelassenen Teams nach Rangliste für die Play-offs setzen?"))return;
    replaceDoubles(t,{playoffs:createDoublesPlayoffs(t)});
    flash("Play-offs ausgelost.");
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
  if(el.dataset.act==="playoff-eligible")return run(()=>{
    if(t.doubles.playoffs)throw Error("Bitte zuerst die Play-offs zurücknehmen.");
    const excluded=new Set(t.doubles.playoffOptOut||[]);
    if(el.checked)excluded.delete(el.dataset.id);else excluded.add(el.dataset.id);
    replaceDoubles(t,{playoffOptOut:[...excluded]});
  });
});
document.addEventListener("submit",event=>{
  const form=event.target.closest("form[data-form]");
  if(!form)return;
  event.preventDefault();
  const t=active(),kind=form.dataset.form;
  run(()=>{
    if(kind==="create")return saveSettings(null,form,true);
    if(!t)throw Error("Kein Doppelturnier gewählt.");
    if(kind==="settings")return saveSettings(t,form,false);
    if(kind==="team")return saveTeam(t,form);
    if(kind==="cash")return saveCash(t,form);
    if(kind==="round-result")return saveResult(t,form);
    if(kind==="playoff-result")return saveResult(t,form,true);
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
