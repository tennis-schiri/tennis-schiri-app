import {BrowserTournamentStore,uid,todayLocal} from "./storage.js?v=095";
import {demoCountLimits,makeDemoCopy,fillDemoResults} from "./demo-data.js?v=088";
import {euroCents,euroText,euroInput,timeWindow} from "./operations.js?v=082";
import {
  checkOnePointSetup,onePointTimePlan,drawOnePointCup,checkOnePointDraw,
  setOnePointWinner,onePointProgress,onePointRoundName
} from "./one-point.js?v=082";

const store=new BrowserTournamentStore();
const root=document.getElementById("app");
const dialogRoot=document.getElementById("dialog-root");
const noticeRoot=document.getElementById("toast-region");
let view=store.active()?.type==="opc"?"overview":"home";
let selectedRound=0;
const esc=value=>String(value??"").replace(/[&<>"']/g,char=>({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
})[char]);
const list=()=>store.list().filter(x=>x.type==="opc");
const active=()=>store.active()?.type==="opc"?store.active():list()[0]||null;
const feeCategory=(t,id)=>t.feeCategories.find(x=>x.id===id)||t.feeCategories[0];
const due=(t,p)=>feeCategory(t,p.feeTierId).amountCents;
const paid=p=>p.paidCents||0;
const label=(t,id)=>t.opc.players.find(p=>p.id===id)?.name||"Noch nicht ermittelt";
const playerCount=t=>t.opc.players.filter(p=>p.present).length;
const dateLabel=iso=>{const p=String(iso).split("-");return p.length===3?p[2]+"."+p[1]+"."+p[0]:String(iso);};
function flash(message,bad=false) {
  const el=document.createElement("div");
  el.className="toast"+(bad?" bad":"");el.textContent=message;
  el.setAttribute("role",bad?"alert":"status");noticeRoot.replaceChildren(el);
  window.setTimeout(()=>{if(el.parentElement)el.remove();},6000);
}
function run(fn) {try{return fn();}catch(error){flash(error?.message||"Aktion fehlgeschlagen.",true);return null;}}
function header() {
  return '<header class="shell-header"><div class="header-inner">'+
    '<a class="doubles-logo" href="./index.html">TENN<span>I</span>LO <small style="font-size:.48em;letter-spacing:.02em;color:#c9dcda"> / ONE POINT CUP</small></a>'+
    '<span class="dev-chip">GESCHÜTZTE TESTVERSION · V0.9.1</span></div></header>';
}
function hint() {
  return '<div class="browser-notice"><div><strong>Lokaler One Point Cup – Testversion</strong>'+
    '<p>Alle Spieler, Ergebnisse und Barzahlungen bleiben in diesem Browser. Die separate One-Point-Fernanzeige ist noch nicht freigeschaltet. '+
    'JSON-Sicherungen umfassen auch Schleifchen- und Doppelturniere.</p></div></div>';
}
function home() {
  const all=list();
  return '<main class="double-shell opc-home"><div class="eyebrow">TENNILO / TURNIERART 03</div>'+
    '<h1>Ein Punkt.<br><em>Ein Sieger.</em></h1><p>Der One Point Cup: Ein einziger Ballwechsel entscheidet jedes direkte Duell im K.-o.-Tableau.</p>'+
    '<div class="opc-hero-action"><button class="btn primary" data-act="new">One Point Cup anlegen</button>'+
    '<button class="btn ghost" data-act="demo">Demoturnier starten</button>'+
    '<button class="btn ghost" data-act="import-json">Sicherung einlesen</button>'+
    '<input id="opc-import-file" type="file" accept=".json,application/json" hidden>'+
    '<a href="./index.html" class="btn ghost">Zur TENNILO-Startseite</a></div>'+
    (all.length?'<h2>Deine One Point Cups</h2><div class="opc-event-list">'+all.map(t=>
      '<article class="double-saved"><div class="eyebrow">ONE POINT CUP</div><h3>'+esc(t.name)+'</h3>'+
      '<p>'+dateLabel(t.date)+' · '+t.opc.players.length+' Spieler · '+t.opc.fieldSize+'er Feld</p>'+
      '<button class="btn primary small" data-act="open" data-id="'+esc(t.id)+'">Turnier öffnen</button></article>').join("")+
      '</div>':'<section class="double-panel"><h3>Hier beginnt dein Cup</h3><p>Erstelle ein K.-o.-Feld oder lade 16 Beispielspieler.</p></section>')+
    hint()+'</main>';
}
function nav() {
  const tabs=[["overview","Übersicht"],["players","Spieler & Kasse"],["bracket","K.-o.-Tableau"],["settings","Einstellungen"]];
  return '<nav class="double-nav" aria-label="One Point Cup Navigation"><a href="./index.html">← TENNILO Start</a>'+
    '<button data-act="home">Alle One Point Cups</button>'+
    tabs.map(([id,title])=>'<button data-act="tab" data-tab="'+id+'" class="'+(view===id?"active":"")+'">'+title+'</button>').join("")+
    '<hr style="border:0;border-top:1px solid #d6e0d8;width:100%">'+
    '<button data-act="new">+ Neuen Cup anlegen</button>'+
    '<button data-act="backup">JSON-Daten sichern</button>'+
    '<button data-act="import-json">JSON-Sicherung laden</button>'+
    '<input id="opc-import-file" type="file" accept=".json,application/json" hidden></nav>';
}
function section(eyebrow,title,description,buttons="") {
  return '<div class="section-header"><div><div class="eyebrow">'+eyebrow+'</div><h2>'+title+'</h2>'+
    '<p class="section-sub">'+description+'</p></div><div class="double-actions">'+buttons+'</div></div>';
}
function totals(t) {
  return t.opc.players.reduce((result,p)=>{
    result.due+=due(t,p);result.paid+=paid(p);
    result.open+=Math.max(0,due(t,p)-paid(p));
    return result;
  },{due:0,paid:0,open:0});
}
function stats(t) {
  const sum=totals(t);
  return '<div class="double-stats">'+[
    ["SPIELER",t.opc.players.length,"erfasst"],
    ["ANWESEND",playerCount(t),"für die Auslosung"],
    ["FELDGRÖSSE",t.opc.fieldSize,"K.-o.-Tableau"],
    ["BAR OFFEN",euroText(sum.open),"Nenngeld"]
  ].map(([heading,value,sub])=>
    '<div class="double-stat"><small>'+heading+'</small><strong>'+value+'</strong><span class="muted">'+sub+'</span></div>').join("")+'</div>';
}
function opcTimeNote(t) {
  if(!checkOnePointSetup(t).ok)return t.endTime?
    '<div class="opc-import-warning">Wunsch-Endzeit: '+esc(t.endTime)+' Uhr. Bitte erst die Spieler und Feldgröße vollständig festlegen.</div>':"";
  try{
    const plan=onePointTimePlan(t);
    return '<div class="'+(plan.overTarget?"opc-import-warning":"double-success")+'"><strong>Geplantes Cup-Ende: '+
      esc(plan.end)+' Uhr</strong>'+(t.endTime?' · Wunsch-Endzeit: '+esc(t.endTime)+' Uhr':'')+
      ' · '+plan.blocks+' Zeitblöcke auf '+plan.courts+' Platz/Plätzen · '+plan.matchMinutes+
      ' Min. pro Block'+(plan.mode==="fit"?' · automatisch an Endzeit angepasst':'')+
      (plan.overTarget?' · Ende wird überschritten!':'')+'</div>';
  }catch(e){return '<div class="opc-import-warning">'+esc(e.message)+'</div>';}
}
function overview(t) {
  const valid=t.opc.draw?checkOnePointDraw(t):null;
  let state=null;
  if(valid?.ok)state=onePointProgress(t);
  return section("ONE POINT CUP / ÜBERSICHT","Cup-Übersicht",
    "Ein Ballwechsel pro Match · Verlierer scheidet aus · Sieger rückt direkt weiter.",
    '<button class="btn ghost" data-act="settings">Einstellungen</button>')+
    stats(t)+opcTimeNote(t)+(state?.finished?'<section class="opc-award"><span>TURNIERSIEGER</span><strong>'+esc(label(t,state.champion))+'</strong></section>':'')+
    '<div class="double-grid"><section class="double-panel"><h3>Organisation</h3>'+
    '<p><strong>Turnier:</strong> '+esc(t.name)+'<br><strong>Datum:</strong> '+dateLabel(t.date)+
    '<br><strong>Feld:</strong> '+t.opc.fieldSize+' Plätze<br><strong>Start:</strong> '+esc(t.startTime)+' Uhr<br><strong>Ende:</strong> '+(t.endTime?esc(t.endTime)+' Uhr':'offen')+'</p>'+
    '<div class="double-actions"><button class="btn primary" data-act="tab" data-tab="players">Spieler & Bar-Nenngeld</button>'+
    '<button class="btn ghost" data-act="tab" data-tab="bracket">Tableau öffnen</button></div></section>'+
    '<section class="double-panel"><h3>Turnierstatus</h3>'+
    (valid&&!valid.ok?'<div class="double-warning">'+esc(valid.errors[0])+'</div>':
      state?'<p>'+state.stages.reduce((a,r)=>a+r.decided,0)+' Entscheidungen einschließlich Freilosen.</p>'+
        '<p>Aktuelle Phase: <strong>'+esc(state.stages[state.current].roundName)+'</strong></p>'+
        '<p>'+(state.finished?"Der Cup ist abgeschlossen.":"Offene Duelle können direkt im Tableau entschieden werden.")+'</p>':
        '<p>Es liegt noch keine Auslosung vor. Nach Check-in und Wahl der Feldgröße kannst du die Spieler zufällig setzen.</p>')+
    '<button class="btn primary" data-act="tab" data-tab="bracket">'+(t.opc.draw?"Zum Tableau":"Auslosung vorbereiten")+'</button>'+
    '</section></div>'+hint();
}
function players(t) {
  const locked=!!t.opc.draw,rows=t.opc.players.map(p=>{
    const expected=due(t,p),got=paid(p);
    return '<tr><td><strong>'+esc(p.name)+'</strong><small>'+esc(feeCategory(t,p.feeTierId).name)+'</small></td>'+
      '<td><label><input type="checkbox" class="opc-check" data-act="presence" data-id="'+esc(p.id)+'" '+
      (p.present?"checked ":"")+(locked?"disabled ":"")+'aria-label="Anwesend: '+esc(p.name)+'"> '+(p.present?"Ja":"Nein")+'</label></td>'+
      '<td class="opc-cash">'+euroText(expected)+'</td><td class="opc-cash">'+euroText(got)+'</td>'+
      '<td class="opc-cash">'+euroText(Math.max(0,expected-got))+'</td>'+
      '<td><div class="double-actions"><button class="btn ghost small" data-act="cash" data-id="'+esc(p.id)+'">Bar erfassen</button>'+
      (!locked?'<button class="btn ghost small" data-act="player-edit" data-id="'+esc(p.id)+'">Bearbeiten</button>'+
        '<button class="btn double-danger small" data-act="player-remove" data-id="'+esc(p.id)+'">Löschen</button>':'')+
      '</div></td></tr>';
  }).join("");
  const sum=totals(t);
  return section("ONE POINT CUP / SPIELER","Spieler & Nenngeld",
    "Einzelspieler und Anwesenheit. Zahlungen bitte nur nach tatsächlichem Bargelderhalt erfassen.",
    !locked?'<button class="btn primary" data-act="player-add">+ Spieler</button>'+
      '<button class="btn ghost" data-act="player-import">Aus anderem Turnier übernehmen</button>':"")+
    stats(t)+(locked?'<div class="double-warning">Die Spielerliste ist nach der Auslosung gesperrt. Zum Ändern des Check-ins bitte zuerst das Tableau zurücknehmen. Barzahlungen bleiben korrigierbar.</div>':"")+
    '<section class="double-panel"><div class="double-table-wrap"><table class="opc-table">'+
    '<thead><tr><th>Spieler</th><th>Check-in</th><th>Soll</th><th>Bar erhalten</th><th>Offen</th><th>Aktionen</th></tr></thead>'+
    '<tbody>'+ (rows||'<tr><td colspan="6">Noch keine Spieler erfasst.</td></tr>')+'</tbody></table></div></section>'+
    '<p class="muted">Bar erhalten: '+euroText(sum.paid)+' · Offen: '+euroText(sum.open)+'. Die TENNILO-Softwarelizenz wird getrennt behandelt.</p>';
}
function bracket(t) {
  const check=checkOnePointSetup(t),draw=t.opc.draw;
  const head=section("ONE POINT CUP / K.-O.-SYSTEM","Turniertableau",
    "Jeder gewonnene Punkt bedeutet den Einzug in die nächste Runde. Kein Satz und keine Games.",
    draw?'<button class="btn double-danger" data-act="draw-reset">Auslosung zurücknehmen</button>':
      '<button class="btn primary" data-act="draw-generate">Spieler auslosen</button>');
  if(!draw)return head+(check.ok?'<div class="double-success">'+check.selected+' Spieler sind bereit. '+check.byes+
      ' Freilose im '+check.fieldSize+'er-Feld.</div>':
      '<div class="double-warning">'+esc(check.errors.join(" · "))+'</div>')+
      '<section class="double-panel"><p>Standard-Feldgröße 32, maximal 64 Spieler. Damit keine leeren ersten Runden entstehen, muss das Feld zur Teilnehmerzahl passen.</p></section>';
  const valid=checkOnePointDraw(t);
  if(!valid.ok)return head+'<div class="double-warning">'+esc(valid.errors.join(" · "))+'</div>';
  const progress=onePointProgress(t),round=Math.min(selectedRound,progress.stages.length-1),selected=progress.stages[round];
  let phasePlan=null;
  try{phasePlan=onePointTimePlan(t).stages[round];}catch{}
  const stages=progress.stages.map(s=>'<button data-act="stage" data-stage="'+s.index+'" class="'+(s.index===round?"active":"")+'">'+
    esc(s.roundName)+' · '+s.decided+'/'+s.total+'</button>').join("");
  const matches=selected.matches.map((m,i)=>{
    const first=esc(label(t,m.left)),second=esc(label(t,m.right));
    const playable=m.left&&m.right,done=!!m.winner;
    return '<article class="opc-match"><div class="opc-match-top">Spiel '+(i+1)+' · '+esc(selected.roundName)+'</div>'+
      '<div class="opc-player '+(done&&m.winner===m.left?"win":"")+(!m.left?" pending":"")+'"><strong>'+first+'</strong>'+
      (playable?'<button class="btn small '+(m.winner===m.left?"primary":"ghost")+'" data-act="winner" data-stage="'+round+
        '" data-match="'+i+'" data-slot="1">'+(m.winner===m.left?"Sieger ✓":"Punkt gewonnen")+'</button>':"")+'</div>'+
      '<div class="opc-player '+(done&&m.winner===m.right?"win":"")+(!m.right?" pending":"")+'"><strong>'+
      (m.right?second:(m.bye?"Freilos":"Noch nicht ermittelt"))+'</strong>'+
      (playable?'<button class="btn small '+(m.winner===m.right?"primary":"ghost")+'" data-act="winner" data-stage="'+round+
        '" data-match="'+i+'" data-slot="2">'+(m.winner===m.right?"Sieger ✓":"Punkt gewonnen")+'</button>':"")+'</div>'+
      '<div class="opc-match-foot">'+(m.bye?'<span class="opc-bye">Automatischer Aufstieg per Freilos</span>':
        m.winner?'<span class="double-tag winner">Ein Punkt entschieden</span>':
        playable?'<span class="double-tag pending">Punkt offen</span>':
        '<span>Noch nicht besetzt</span>')+
      (playable&&done?'<button class="btn ghost small" data-act="winner-reset" data-stage="'+round+
        '" data-match="'+i+'">Entscheidung zurücknehmen</button>':"")+'</div></article>';
  }).join("");
  return head+opcTimeNote(t)+(progress.finished?'<section class="opc-award"><span>GEWINNER DES ONE POINT CUPS</span><strong>'+
    esc(label(t,progress.champion))+'</strong></section>':"")+
    '<div class="opc-round-nav">'+stages+'</div>'+
    '<section class="double-panel"><h3>'+esc(selected.roundName)+'</h3>'+(
      phasePlan?'<p class="opc-panel-note">Geplantes Zeitfenster: '+esc(phasePlan.start)+'–'+esc(phasePlan.end)+' Uhr · '+phasePlan.slots+' Spielblock'+(phasePlan.slots===1?'':'e')+'</p>':'')+
    '<p class="opc-panel-note">'+
      selected.decided+' von '+selected.total+' Begegnungen entschieden (einschließlich Freilosen).</p>'+
    '<div class="opc-bracket">'+matches+'</div></section>'+
    '<p class="muted">Bei einer geänderten Entscheidung werden ungültige Folgeergebnisse automatisch zurückgenommen.</p>';
}
function settings(t) {
  return section("ONE POINT CUP / EINSTELLUNGEN","Cup konfigurieren",
    "Feldgröße und Nenngeld festlegen. Das Tableau schützt die Teilnehmerliste nach der Auslosung.")+
    '<section class="double-panel">'+opcTimeNote(t)+'<form data-form="settings">'+settingsFields(t)+
    '<div class="double-actions" style="margin-top:20px"><button class="btn primary" type="submit">Einstellungen speichern</button>'+
    '<button class="btn double-danger" type="button" data-act="delete">Cup löschen</button></div></form></section>';
}
function settingsFields(t=null) {
  const cat=t?.feeCategories||[
    {id:"standard",name:"Standard",amountCents:500},
    {id:"jugend",name:"Jugend",amountCents:250}
  ];
  const standard=cat.find(x=>x.id==="standard")?.amountCents??500;
  const youth=cat.find(x=>x.id==="jugend")?.amountCents??250;
  return '<div class="form-grid">'+
    '<label class="field wide">Name des One Point Cups<input name="name" required minlength="2" maxlength="90" value="'+esc(t?.name||"")+'"></label>'+
    '<label class="field">Datum<input name="date" type="date" required value="'+esc(t?.date||todayLocal())+'"></label>'+
    '<label class="field">Startzeit<input name="startTime" type="time" required value="'+esc(t?.startTime||"10:00")+'"></label>'+
    '<label class="field">Endzeit (optional)<input name="endTime" type="time" value="'+esc(t?.endTime||"")+'"></label>'+
    '<label class="field wide">Zeitplanung<select name="timeMode">'+
      '<option value="fixed" '+(t?.timeMode!=="fit"?"selected":"")+'>Feste Minuten je Ein-Punkt-Match</option>'+
      '<option value="fit" '+(t?.timeMode==="fit"?"selected":"")+'>Zeitblöcke an die Endzeit anpassen</option>'+
      '</select><span class="field-hint">Ein Punkt je Duell, nacheinander je Turnierrunde. Automatisch 1–15 Minuten pro Zeitblock; kürzere Zeitfenster werden abgelehnt.</span></label>'+
    '<label class="field">Plätze gleichzeitig<input name="courtCount" type="number" min="1" max="64" required value="'+(t?.courts?.length||1)+'"></label>'+
    '<label class="field">Minuten je Ballwechsel inkl. Wechsel<input name="opcMinutes" type="number" min="1" max="15" required value="'+(t?.opcMinutes??3)+'"></label>'+
    '<label class="field">Feldgröße<select name="fieldSize">'+
      [2,4,8,16,32,64].map(n=>'<option value="'+n+'" '+((t?.opc?.fieldSize??32)===n?"selected":"")+'>'+
        n+'er Feld</option>').join("")+'</select></label>'+
    '<label class="field">Nenngeld Standard (€) · bar<input name="feeStandard" inputmode="decimal" required pattern="[0-9]+([,.][0-9]{1,2})?" value="'+euroInput(standard)+'"></label>'+
    '<label class="field">Nenngeld Jugend (€) · bar<input name="feeYouth" inputmode="decimal" required pattern="[0-9]+([,.][0-9]{1,2})?" value="'+euroInput(youth)+'"></label>'+
    '</div>';
}
function demoPanel(t){
  return '<section class="demo-panel"><div><strong>'+(t.demoMode?"DEMO-MODUS · Testdaten":"Demo-Kopie erstellen")+
    '</strong><p>'+(t.demoMode?"Zufallssieger nur für den Test-Cup; keine simulierten Barzahlungen.":"Neue unabhängige Testkopie mit zufälligen Spielern für die eingestellte Feldgröße.")+
    '</p></div><div class="demo-panel-actions"><button class="btn subtle small" data-act="demo-copy">Zufallsteilnehmer generieren</button>'+
    (t.demoMode?'<button class="btn primary small" data-act="demo-fill" '+(t.opc.draw?"":'disabled title="Bitte zuerst auslosen"')+'>Offene Ergebnisse auswürfeln</button>':"")+'</div></section>';
}
function demoCopyDialog(t){
  const n=demoCountLimits(t);
  showDialog({eyebrow:"DEMO-MODUS",title:"Zufallsteilnehmer generieren",kind:"demo-copy",submit:"Demo-Kopie anlegen",
    body:'<p>Neue Testkopie; bestehende Cup-Daten bleiben unverändert.</p><label class="field">Anzahl Spieler<input type="number" name="demoCount" required min="'+n.min+'" max="'+n.max+'" step="1" value="'+n.defaultCount+'"></label>'+
      '<p class="field-hint">Feldgröße '+t.opc.fieldSize+': '+n.min+'–'+n.max+' Spieler, mit Freilosen falls nötig.</p>'});
}
function draw() {
  if(view==="home"||!active()) {root.innerHTML=header()+home();return;}
  const t=active(),pages={overview,players,bracket,settings};
  root.innerHTML=header()+'<main class="double-shell"><div class="double-hero"><div class="eyebrow opc-kicker">EIN PUNKT ENTSCHEIDET</div>'+
    '<h1>'+esc(t.name)+'</h1><p class="opc-summary">'+dateLabel(t.date)+' · '+t.opc.fieldSize+
    'er Feld · '+playerCount(t)+' anwesend</p></div>'+
    '<div class="double-content">'+nav()+'<section class="double-main">'+demoPanel(t)+(pages[view]||overview)(t)+
    '</section></div><footer class="double-footer">© Tennis-Schiri · One Point Cup v0.9.1 · geschützte Testversion · lokale Speicherung</footer></main>';
}
function showDialog({eyebrow,title,body,kind,submit="Speichern"}) {
  dialogRoot.innerHTML='<dialog class="app-dialog" aria-labelledby="opc-dialog-title">'+
    '<div class="dialog-top"><div><span class="eyebrow">'+esc(eyebrow)+'</span><h2 id="opc-dialog-title">'+
    esc(title)+'</h2></div><button class="close-btn" type="button" data-act="close" aria-label="Schließen">×</button></div>'+
    '<form data-form="'+esc(kind)+'">'+body+
    '<div class="dialog-buttons"><button class="btn ghost" type="button" data-act="close">Abbrechen</button>'+
    '<button class="btn primary" type="submit">'+esc(submit)+'</button></div></form></dialog>';
  const d=dialogRoot.querySelector("dialog");
  d.addEventListener("close",()=>dialogRoot.replaceChildren(),{once:true});
  d.showModal();
}
function closeDialog(){dialogRoot.querySelector("dialog")?.close();}
function playerDialog(t,player=null) {
  if(t.opc.draw)throw Error("Bitte vor dem Bearbeiten die Auslosung zurücknehmen.");
  const options=t.feeCategories.map(c=>'<option value="'+esc(c.id)+'" '+((player?.feeTierId||"standard")===c.id?"selected":"")+'>'+
    esc(c.name)+' · '+euroText(c.amountCents)+'</option>').join("");
  showDialog({eyebrow:"SPIELERLISTE",title:player?"Spieler bearbeiten":"Spieler hinzufügen",kind:"player",
    body:'<input type="hidden" name="playerId" value="'+esc(player?.id||"")+'">'+
      '<div class="form-grid"><label class="field wide">Name<input name="name" required maxlength="80" value="'+esc(player?.name||"")+'"></label>'+
      '<label class="field">Nenngeld-Kategorie<select name="tier">'+options+'</select></label>'+
      '<label class="field checkbox-field"><input type="checkbox" name="present" '+(player?.present===false?"":"checked")+'> Anwesend</label></div>'});
}
function cashDialog(t,p){
  showDialog({eyebrow:"BAR-NENNGELD",title:p.name,kind:"cash",
    body:'<input type="hidden" name="playerId" value="'+esc(p.id)+'">'+
      '<p class="opc-panel-note">Soll: '+euroText(due(t,p))+' · Bitte nur den tatsächlich insgesamt bar erhaltenen Betrag eintragen.</p>'+
      '<label class="field">Bar erhalten (€)<input name="amount" required inputmode="decimal" pattern="[0-9]+([,.][0-9]{1,2})?" value="'+euroInput(paid(p))+'"></label>'});
}
function importPlayersDialog(t) {
  if(t.opc.draw)throw Error("Bitte vor dem Import das Tableau zurücknehmen.");
  const sources=store.list().filter(x=>x.id!==t.id&&(x.type==="ribbon"||x.type==="doubles"));
  if(!sources.length)throw Error("Noch keine Schleifchen- oder Doppelturniere im Browser vorhanden.");
  showDialog({eyebrow:"SPIELERÜBERNAHME",title:"Aus anderem Turnier übernehmen",kind:"player-import",
    submit:"Anwesende Spieler übernehmen",
    body:'<label class="field">Quellturnier<select name="sourceId">'+sources.map(x=>
      '<option value="'+esc(x.id)+'">'+esc(x.name)+' · '+(x.type==="ribbon"?"Schleifchen":"Doppel")+'</option>').join("")+
      '</select></label><div class="opc-import-warning">Es werden nur anwesende Spieler übernommen. Bereits erfasste Namen werden übersprungen. Nenngelder werden nicht übertragen oder doppelt gebucht.</div>'});
}
function saveSettings(t,form,isCreate=false) {
  const d=new FormData(form),name=String(d.get("name")||"").trim(),size=Number(d.get("fieldSize"));
  if(name.length<2||name.length>90)throw Error("Bitte einen Turniernamen mit 2–90 Zeichen eingeben.");
  if(![2,4,8,16,32,64].includes(size))throw Error("Ungültige Feldgröße.");
  if(t?.opc.draw&&t.opc.fieldSize!==size)throw Error("Bitte die Auslosung vor einer Feldgrößenänderung zurücknehmen.");
  const courtCount=Number(d.get("courtCount")),minutes=Number(d.get("opcMinutes"));
  if(!Number.isInteger(courtCount)||courtCount<1||courtCount>64)throw Error("Bitte 1–64 Spielplätze wählen.");
  if(!Number.isInteger(minutes)||minutes<1||minutes>15)throw Error("Bitte 1–15 Minuten je Ballwechsel eintragen.");
  if(t?.opc.draw&&courtCount!==t.courts.length)throw Error("Bitte vor einer Änderung der Platzanzahl das Tableau zurücknehmen.");
  const standard=euroCents(d.get("feeStandard")),youth=euroCents(d.get("feeYouth"));
  const categories=[{id:"standard",name:"Standard",amountCents:standard},
    {id:"jugend",name:"Jugend",amountCents:youth}];
  const values={name,date:String(d.get("date")),startTime:String(d.get("startTime")),
    endTime:String(d.get("endTime")||"")||null,timeMode:d.get("timeMode")==="fit"?"fit":"fixed",
    opcMinutes:minutes,courts:t?.courts?.length===courtCount?t.courts:Array.from({length:courtCount},(_,i)=>i+1),
    entryFeeCents:standard,feeCategories:categories};
  const preview={...(t||{}),...values,type:"opc",opc:t?.opc||{fieldSize:size,players:[],draw:null}};
  timeWindow(preview);
  if(preview.timeMode==="fit"&&!preview.endTime)throw Error("Für die Zeitoptimierung bitte eine Endzeit eingeben.");
  if(t?.opc.draw)onePointTimePlan({...preview,opc:{...t.opc,fieldSize:size}});
  if(isCreate)store.create({...values,type:"opc",opc:{players:[],fieldSize:size,draw:null}});
  else store.editTournament(t.id,{...values,opc:{...t.opc,fieldSize:size}});
  closeDialog();view="overview";draw();flash("One Point Cup gespeichert.");
}
function savePlayer(t,form) {
  if(t.opc.draw)throw Error("Bitte zuerst das Tableau zurücknehmen.");
  const d=new FormData(form),id=String(d.get("playerId")||""),
    name=String(d.get("name")||"").trim(),tier=String(d.get("tier")||"standard");
  if(!name||name.length>80)throw Error("Bitte einen Spielernamen mit maximal 80 Zeichen eintragen.");
  if(t.opc.players.some(p=>p.id!==id&&p.name.toLocaleLowerCase("de-DE")===name.toLocaleLowerCase("de-DE")))
    throw Error("Dieser Spieler ist bereits eingetragen.");
  if(!t.feeCategories.some(c=>c.id===tier))throw Error("Ungültige Nenngeld-Kategorie.");
  const old=t.opc.players.find(p=>p.id===id);
  if(id&&!old)throw Error("Spieler nicht gefunden.");
  if(!id&&t.opc.players.length>=64)throw Error("Maximal 64 Spieler pro One Point Cup.");
  const player={id:id||uid(),name,present:d.has("present"),feeTierId:tier,paidCents:old?.paidCents||0};
  const players=old?t.opc.players.map(p=>p.id===id?player:p):[...t.opc.players,player];
  store.editTournament(t.id,{opc:{...t.opc,players}});
  closeDialog();view="players";draw();flash("Spieler gespeichert.");
}
function saveCash(t,form) {
  const d=new FormData(form),id=String(d.get("playerId")),amount=euroCents(d.get("amount"));
  if(!t.opc.players.some(p=>p.id===id))throw Error("Spieler nicht gefunden.");
  store.editTournament(t.id,{opc:{...t.opc,players:t.opc.players.map(p=>p.id===id?{...p,paidCents:amount}:p)}});
  closeDialog();draw();flash("Bar-Nenngeld aktualisiert.");
}
function saveImport(t,form){
  if(t.opc.draw)throw Error("Bitte zuerst die Auslosung zurücknehmen.");
  const id=String(new FormData(form).get("sourceId")||"");
  const source=store.list().find(x=>x.id===id&&(x.type==="ribbon"||x.type==="doubles"));
  if(!source)throw Error("Quellturnier nicht gefunden.");
  const from=source.type==="ribbon"?
    source.participants.filter(p=>p.present).map(p=>p.name):
    source.doubles.teams.filter(p=>p.present).flatMap(p=>[p.player1,p.player2]);
  const names=new Set(t.opc.players.map(p=>p.name.toLocaleLowerCase("de-DE")));
  const added=[];
  for(const raw of from) {
    const name=String(raw||"").trim(),key=name.toLocaleLowerCase("de-DE");
    if(!name||names.has(key))continue;
    if(t.opc.players.length+added.length>=64)break;
    names.add(key);
    added.push({id:uid(),name:name.slice(0,80),present:true,feeTierId:"standard",paidCents:0});
  }
  store.editTournament(t.id,{opc:{...t.opc,players:[...t.opc.players,...added]}});
  closeDialog();view="players";draw();flash(added.length+" Spieler übernommen; keine Barzahlungen importiert.");
}
function showDemo(){
  const t=store.create({type:"opc",demoMode:true,name:"Demo – One Point Cup",date:todayLocal(),
    startTime:"10:00",courts:[1],entryFeeCents:500,
    feeCategories:[{id:"standard",name:"Standard",amountCents:500},
      {id:"jugend",name:"Jugend",amountCents:250}],
    opc:{fieldSize:16,players:[],draw:null}});
  const players=Array.from({length:16},(_,i)=>({
    id:uid(),name:"Spieler "+(i+1),present:true,
    feeTierId:i<6?"jugend":"standard",paidCents:0
  }));
  store.editTournament(t.id,{opc:{...t.opc,players}});
  view="overview";draw();flash("One Point Cup mit 16 Beispielspielern angelegt.");
}
function backup() {
  const blob=new Blob([store.exportJson()],{type:"application/json"});
  const url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download="tennilo-turniere-"+todayLocal()+".json";
  document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  flash("JSON-Sicherung heruntergeladen.");
}
document.addEventListener("click",event=>{
  const trigger=event.target.closest("[data-act]");
  if(!trigger||trigger.matches('input[type="checkbox"]'))return;
  const act=trigger.dataset.act,t=active();
  if(act==="home"){view="home";draw();return;}
  if(act==="new")return showDialog({eyebrow:"NEUER ONE POINT CUP",title:"One Point Cup anlegen",
    body:settingsFields(),kind:"create",submit:"Cup anlegen"});
  if(act==="demo")return run(showDemo);
  if(act==="demo-copy"&&t)return demoCopyDialog(t);
  if(act==="demo-fill"&&t)return run(()=>{
    const {patch,filled}=fillDemoResults(t);
    if(filled)store.editTournament(t.id,patch);
    draw();flash(filled?filled+" offene Spiele mit Zufallsentscheidungen gefüllt.":"Alle Paarungen bereits entschieden.");
  });
  if(act==="open")return run(()=>{store.setActive(trigger.dataset.id);selectedRound=0;view="overview";draw();});
  if(act==="tab"){view=trigger.dataset.tab;draw();return;}
  if(act==="settings"){view="settings";draw();return;}
  if(act==="close")return closeDialog();
  if(act==="import-json")return document.getElementById("opc-import-file")?.click();
  if(act==="backup")return run(backup);
  if(!t)return;
  if(act==="player-add")return run(()=>playerDialog(t));
  if(act==="player-edit")return run(()=>playerDialog(t,t.opc.players.find(p=>p.id===trigger.dataset.id)));
  if(act==="cash")return run(()=>cashDialog(t,t.opc.players.find(p=>p.id===trigger.dataset.id)));
  if(act==="player-import")return run(()=>importPlayersDialog(t));
  if(act==="player-remove")return run(()=>{
    if(t.opc.draw)throw Error("Bitte zuerst die Auslosung zurücknehmen.");
    const p=t.opc.players.find(x=>x.id===trigger.dataset.id);
    if(p&&confirm("Spieler „"+p.name+"“ wirklich entfernen?")){
      store.editTournament(t.id,{opc:{...t.opc,players:t.opc.players.filter(x=>x.id!==p.id)}});
      draw();
    }
  });
  if(act==="draw-generate")return run(()=>{
    const drawData=drawOnePointCup(t,{seed:Math.floor(Math.random()*2147483647)});
    onePointTimePlan({...t,opc:{...t.opc,draw:drawData}});
    store.editTournament(t.id,{opc:{...t.opc,draw:drawData}});
    selectedRound=0;view="bracket";draw();flash("One Point Cup ausgelost. Ein Punkt pro Begegnung.");
  });
  if(act==="draw-reset")return run(()=>{
    if(!confirm("Das gesamte K.-o.-Tableau mit allen Ergebnissen wirklich zurücknehmen? Bar-Nenngelder bleiben erhalten."))return;
    store.editTournament(t.id,{opc:{...t.opc,draw:null}});
    selectedRound=0;draw();flash("Tableau zurückgenommen.");
  });
  if(act==="stage"){selectedRound=Number(trigger.dataset.stage);draw();return;}
  if(act==="winner"||act==="winner-reset")return run(()=>{
    if(!t.opc.draw)throw Error("Noch keine Auslosung.");
    const stage=Number(trigger.dataset.stage),index=Number(trigger.dataset.match),
      match=t.opc.draw.rounds[stage]?.[index];
    if(!match)throw Error("Begegnung nicht gefunden.");
    const slot=act==="winner-reset"?null:Number(trigger.dataset.slot);
    if(slot!==null&&match.winner===(slot===1?match.left:match.right))return;
    if(match.winner&&!confirm("Siegerentscheidung ändern? Abhängige Folgeergebnisse werden gegebenenfalls gelöscht."))return;
    const updated=setOnePointWinner(t,stage,index,slot);
    store.editTournament(t.id,{opc:{...t.opc,draw:updated}});
    draw();flash(slot===null?"Entscheidung zurückgenommen.":"Punkt entschieden – Sieger rückt weiter.");
  });
  if(act==="delete")return run(()=>{
    if(!confirm("One Point Cup „"+t.name+"“ mit Teilnehmern, Kasse und Ergebnissen endgültig löschen?"))return;
    store.deleteTournament(t.id);view="home";draw();flash("One Point Cup gelöscht.");
  });
});
document.addEventListener("change",event=>{
  const el=event.target,t=active();
  if(el.id==="opc-import-file"&&el.files?.[0]){
    const file=el.files[0];
    el.value="";
    if(file.size>3000000)return flash("Maximal 3 MB für die JSON-Sicherung.",true);
    if(!confirm("Alle aktuell in diesem Browser gespeicherten Turniere durch die JSON-Sicherung ersetzen?"))return;
    file.text().then(raw=>run(()=>{
      store.importJson(raw);view="home";selectedRound=0;draw();
      flash("JSON-Sicherung mit allen Turnierarten wiederhergestellt.");
    })).catch(()=>flash("Sicherungsdatei konnte nicht gelesen werden.",true));
    return;
  }
  if(el.dataset.act==="presence"&&t)return run(()=>{
    if(t.opc.draw)throw Error("Bitte erst das Tableau zurücknehmen.");
    const players=t.opc.players.map(p=>p.id===el.dataset.id?{...p,present:el.checked}:p);
    store.editTournament(t.id,{opc:{...t.opc,players}});draw();
  });
});
document.addEventListener("submit",event=>{
  const form=event.target.closest("form[data-form]");
  if(!form)return;
  event.preventDefault();
  const t=active();
  run(()=>{
    if(form.dataset.form==="demo-copy"){
      if(!t)throw Error("Kein One Point Cup ausgewählt.");
      const copy=store.create(makeDemoCopy(t,new FormData(form).get("demoCount")));
      closeDialog();view="overview";selectedRound=0;draw();flash(copy.name+" erstellt. Jetzt auslosen und Ergebnisse auswürfeln.");return;
    }
    if(form.dataset.form==="create")return saveSettings(null,form,true);
    if(!t)throw Error("Kein One Point Cup gewählt.");
    if(form.dataset.form==="settings")return saveSettings(t,form);
    if(form.dataset.form==="player")return savePlayer(t,form);
    if(form.dataset.form==="cash")return saveCash(t,form);
    if(form.dataset.form==="player-import")return saveImport(t,form);
  });
});
window.addEventListener("storage",event=>{
  if(event.key==="tennis-schiri-tournaments-v1"){
    store.state=store.load();draw();flash("Turnierdaten aus anderem Browser-Tab geladen.");
  }
});
draw();
if(window.location.hash==="#neu"){
  history.replaceState(null,"",window.location.pathname+window.location.search);
  showDialog({eyebrow:"NEUER ONE POINT CUP",title:"One Point Cup anlegen",
    body:settingsFields(),kind:"create",submit:"Cup anlegen"});
}
