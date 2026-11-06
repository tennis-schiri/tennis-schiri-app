// TENNILO Roadmap v0.8.4 – shared, private development board.
const root=document.getElementById("roadmap-app");
const modalRoot=document.getElementById("roadmap-modal");
const toastRoot=document.getElementById("roadmap-toast");
const API="./roadmap-api.php";
const STATUS=[
  {key:"idea",title:"Ideensammlung",hint:"Vorschläge und neue Impulse",short:"Idee"},
  {key:"planned",title:"Geplant",hint:"Für die nächsten Schritte vorgesehen",short:"Geplant"},
  {key:"progress",title:"In Arbeit",hint:"Wird aktuell umgesetzt",short:"In Arbeit"},
  {key:"test",title:"Code fertig",hint:"In GitHub, noch in Prüfung",short:"Code fertig"},
  {key:"online",title:"Auf Testseite",hint:"Bereits auf der geschützten Testseite",short:"Online (Test)"}
];
const PRIORITY={high:"Hoch",medium:"Mittel",low:"Niedrig"};
const CATEGORIES=["Turnierformate","Turnierbetrieb","Live & Anzeige","Plattform & Zugang","Produkt & Bedienung"];
let state={items:[],session:{role:"guest",label:"Gast",csrf:""},
  bootstrapAvailable:false,storagePersistent:false,members:[],offline:false};
let view="board",query="",filterStatus="all",filterCategory="all",filterPriority="all";
let activeItem=null;
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const statusOf=id=>STATUS.find(x=>x.key===id)||STATUS[0];
const canComment=()=>["admin","commenter"].includes(state.session.role);
const isAdmin=()=>state.session.role==="admin";
const itemById=id=>state.items.find(x=>x.id===id);
const niceDate=value=>{
  const date=new Date(value||"");
  return Number.isFinite(date.getTime())?
    new Intl.DateTimeFormat("de-DE",{day:"2-digit",month:"short",year:"numeric"}).format(date):
    "noch offen";
};
function toast(message,error=false){
  toastRoot.textContent=message;
  toastRoot.className="roadmap-toast visible"+(error?" is-error":"");
  clearTimeout(toast.timer);
  toast.timer=setTimeout(()=>{toastRoot.className="roadmap-toast";},4500);
}
function formValue(name,value,choices){
  return '<select name="'+name+'">'+choices.map(([key,label])=>
    '<option value="'+esc(key)+'"'+(value===key?' selected':'')+'>'+esc(label)+'</option>').join("")+'</select>';
}
function categorySelect(value="Turnierformate"){
  return formValue("category",value,CATEGORIES.map(x=>[x,x]));
}
function summary(){
  const counts=Object.fromEntries(STATUS.map(s=>[s.key,state.items.filter(x=>x.status===s.key).length]));
  const total=state.items.length,done=counts.online;
  return '<div class="rm-summary"><div class="rm-overview-stat"><span>Gesamte Themen</span><strong>'+total+'</strong><small>Einträge in der Ideensammlung</small></div>'+
    '<div class="rm-overview-stat"><span>Auf Testseite</span><strong>'+done+'</strong><small>Bereits verfügbar</small></div>'+
    '<div class="rm-overview-stat"><span>In Arbeit / Prüfung</span><strong>'+(counts.progress+counts.test)+'</strong><small>In der aktiven Entwicklung</small></div>'+
    '<div class="rm-overview-stat"><span>Geplant / Ideen</span><strong>'+(counts.planned+counts.idea)+'</strong><small>Für später vorgemerkt</small></div></div>'+
    '<div class="rm-progress" aria-label="'+done+' von '+total+' Themen auf der Testseite"><span></span></div>';
}
function controls(){
  return '<div class="rm-controls"><div class="rm-control-title"><div><h2>Entwicklungsübersicht</h2><p>Klicke einen Punkt an, um Details, Kommentare und nächste Schritte zu sehen.</p></div>'+
    '<div class="rm-view-switch" role="group" aria-label="Ansicht wechseln">'+
    '<button type="button" data-action="view" data-view="board" class="'+(view==="board"?"active":"")+'">Board</button>'+
    '<button type="button" data-action="view" data-view="list" class="'+(view==="list"?"active":"")+'">Liste</button></div></div>'+
    '<div class="rm-filter-bar">'+
    '<label class="rm-search"><span class="sr-only">Roadmap durchsuchen</span><input id="rm-search" type="search" placeholder="Themen und Ideen suchen …" value="'+esc(query)+'"></label>'+
    '<label><span>Status</span><select id="rm-filter-status">'+[['all','Alle Status'],...STATUS.map(x=>[x.key,x.short])].map(([v,t])=>'<option value="'+esc(v)+'"'+(filterStatus===v?" selected":"")+'>'+esc(t)+'</option>').join("")+'</select></label>'+
    '<label><span>Bereich</span><select id="rm-filter-category">'+[['all','Alle Bereiche'],...CATEGORIES.map(x=>[x,x])].map(([v,t])=>'<option value="'+esc(v)+'"'+(filterCategory===v?" selected":"")+'>'+esc(t)+'</option>').join("")+'</select></label>'+
    '<label><span>Priorität</span><select id="rm-filter-priority">'+[['all','Alle Prioritäten'],['high','Hoch'],['medium','Mittel'],['low','Niedrig']].map(([v,t])=>'<option value="'+v+'"'+(filterPriority===v?" selected":"")+'>'+t+'</option>').join("")+'</select></label>'+
    '</div></div>';
}
function itemsFiltered(){
  const q=query.toLocaleLowerCase("de-DE").trim();
  return state.items.filter(x=>
    (filterStatus==="all"||x.status===filterStatus)&&
    (filterCategory==="all"||x.category===filterCategory)&&
    (filterPriority==="all"||x.priority===filterPriority)&&
    (!q||[x.title,x.description,x.category,x.milestone,x.nextStep].join(" ").toLocaleLowerCase("de-DE").includes(q))
  );
}
function card(x){
  const comments=Array.isArray(x.comments)?x.comments.length:0;
  return '<button type="button" class="rm-card" data-action="detail" data-id="'+esc(x.id)+'" aria-label="'+esc(x.title)+' öffnen">'+
    '<div class="rm-card-top"><span class="rm-category">'+esc(x.category)+'</span>'+
    '<span class="rm-priority '+esc(x.priority)+'" title="Priorität '+esc(PRIORITY[x.priority]||"Offen")+'">'+esc(PRIORITY[x.priority]||"Offen")+'</span></div>'+
    '<strong>'+esc(x.title)+'</strong>'+
    '<p>'+esc(x.description)+'</p>'+
    '<div class="rm-card-foot"><span>'+esc(x.milestone||"Noch offen")+'</span><span>◌ '+comments+'</span></div></button>';
}
function renderResults(){
  const items=itemsFiltered();
  const target=document.getElementById("rm-results");
  if(!target)return;
  if(!items.length){
    target.innerHTML='<div class="rm-empty"><strong>Keine passenden Themen gefunden</strong><p>Filter ändern oder eine neue Idee einreichen.</p></div>';
    return;
  }
  if(view==="board"){
    target.innerHTML='<div class="rm-board" aria-label="Roadmap nach Entwicklungsstatus">'+STATUS.map(s=>{
      const subset=items.filter(x=>x.status===s.key);
      return '<section class="rm-column column-'+s.key+'"><div class="rm-column-header"><div><h3>'+s.title+'</h3><p>'+s.hint+'</p></div><b>'+subset.length+'</b></div>'+
        '<div class="rm-column-cards">'+(subset.length?subset.map(card).join(""):'<p class="rm-column-empty">Zurzeit keine Einträge</p>')+'</div></section>';
    }).join("")+'</div>';
  }else{
    const sorted=[...items].sort((a,b)=>
      STATUS.findIndex(s=>s.key===b.status)-STATUS.findIndex(s=>s.key===a.status)||
      ["high","medium","low"].indexOf(a.priority)-["high","medium","low"].indexOf(b.priority));
    target.innerHTML='<div class="rm-list">'+sorted.map(x=>
      '<div class="rm-list-row"><span class="rm-status-chip status-'+esc(x.status)+'">'+esc(statusOf(x.status).short)+'</span>'+
      '<div class="rm-list-main"><strong>'+esc(x.title)+'</strong><small>'+esc(x.category)+' · '+esc(x.milestone||"Offen")+'</small></div>'+
      '<span class="rm-list-priority">'+esc(PRIORITY[x.priority]||"")+'</span>'+
      '<button class="btn ghost small" type="button" data-action="detail" data-id="'+esc(x.id)+'">Ansehen</button></div>').join("")+'</div>';
  }
}
function render(){
  const role=state.session.role;
  const user=role==="admin"?"Projektleitung":role==="commenter"?"Mitwirkend":role==="viewer"?"Nur lesen":"Lesemodus";
  root.innerHTML='<main class="rm-container"><div class="rm-top"><a href="./index.html" class="rm-back">← Zur TENNILO-App</a>'+
    '<div class="rm-access"><span class="rm-role-dot '+role+'"></span><span>'+esc(user)+(role!=="guest"?" · "+esc(state.session.label):"")+'</span>'+
    (role==="guest"?'<button class="btn subtle small" data-action="login">Zugangscode</button>':
      '<button class="btn subtle small" data-action="logout">Abmelden</button>')+
    (isAdmin()?'<button class="btn ghost small" data-action="members">Zugänge verwalten</button>':'')+'</div></div>'+
    '<section class="rm-hero"><div><div class="rm-hero-kicker">TENNILO / ROADMAP & IDEEN</div>'+
    '<h1>Was kommt als <em>Nächstes?</em></h1>'+
    '<p>Entwicklung verfolgen, Prioritäten erkennen und gemeinsam Ideen sammeln. Jeder Punkt zeigt den aktuellen Stand – vom ersten Gedanken bis zur Testversion.</p>'+
    '<div class="rm-hero-actions">'+(canComment()?
      '<button class="btn rm-lime" data-action="idea">+ Neue Idee einreichen</button>':
      '<button class="btn rm-lime" data-action="login">Idee oder Kommentar einreichen</button>')+
    '<a class="btn rm-outline" href="./index.html">Zur Turnier-App</a></div></div>'+
    '<div class="rm-hero-decoration" aria-hidden="true"><span></span><span></span><span></span></div></section>'+
    summary()+
    (state.offline?'<div class="rm-alert"><strong>Nur vorläufige Ansicht.</strong> Der gemeinsame Kommentarserver ist gerade nicht erreichbar. Änderungen sind momentan nicht möglich.</div>':'')+
    (!state.storagePersistent&&!state.offline?'<div class="rm-data-note"><strong>Testbetrieb:</strong> Die Beiträge liegen derzeit in einem privaten Server-Temp-Verzeichnis. Für eine dauerhaft verlässliche Ideensammlung muss ein persistenter privater Speicherpfad auf dem Hosting eingerichtet werden.</div>':'')+
    (state.bootstrapAvailable?'<div class="rm-setup"><div><strong>Einmalige Einrichtung</strong><p>Die Projektleitung muss den Administrator-Zugang einmal einrichten. Dafür ist der bestehende Passwortschutz der Testseite erforderlich.</p></div><button class="btn primary" data-action="bootstrap">Admin-Zugang einrichten</button></div>':'')+
    controls()+'<section id="rm-results" class="rm-results"></section>'+
    '<div class="rm-foot"><p><strong>Was bedeuten die Status?</strong> „Code fertig“ heißt: in GitHub implementiert, aber noch nicht auf der Testseite. „Auf Testseite“ bedeutet veröffentlicht und weiter im Praxistest.</p>'+
    '<p>Der Entwicklungsstatus wird redaktionell gepflegt. Ideen und Kommentare sind Beiträge der eingeladenen Testgruppe, keine verbindlichen Funktionszusagen.</p></div>'+
    '</main>';
  renderResults();
  const progress=document.querySelector('.rm-progress span');
  if(progress)progress.style.width=Math.round(state.items.length?state.items.filter(x=>x.status==='online').length*100/state.items.length:0)+'%';
}
function showModal(title,body,{wide=false}={}){
  modalRoot.innerHTML='<dialog class="rm-dialog'+(wide?' wide':'')+'" aria-label="'+esc(title)+'">'+
    '<div class="rm-dialog-head"><h2>'+esc(title)+'</h2><button type="button" data-action="close" aria-label="Schließen">×</button></div>'+
    '<div class="rm-dialog-body">'+body+'</div></dialog>';
  const dialog=modalRoot.querySelector("dialog");
  dialog.addEventListener("click",e=>{if(e.target===dialog)dialog.close()});
  dialog.addEventListener("close",()=>{if(modalRoot.contains(dialog)){modalRoot.innerHTML="";activeItem=null;}},{once:true});
  dialog.showModal();
}
function closeModal(){modalRoot.querySelector("dialog")?.close()}
const DETAIL_SECTIONS=[
  ["benefit","Ziel & Nutzen","Warum ist dieser Punkt sinnvoll?"],
  ["scope","Funktionsumfang","Was soll die Funktion konkret leisten?"],
  ["currentState","Aktueller Umsetzungsstand","Was ist schon vorhanden?"],
  ["openPoints","Noch offen / Voraussetzungen","Was fehlt für den nächsten Schritt?"],
  ["doneWhen","Fertig, wenn …","Woran erkennen wir, dass es funktioniert?"]
];
function detailsHtml(item){
  const available=DETAIL_SECTIONS.filter(([key])=>String(item[key]||"").trim().length);
  if(!available.length)return '<div class="rm-detail-awaiting"><strong>Details werden noch ergänzt.</strong>'+
    '<p>Dieser Vorschlag wurde eingereicht. Die Projektleitung kann Ziel, Umfang und konkrete Prüfpunkte noch ausarbeiten.</p></div>';
  return '<div class="rm-details-grid">'+available.map(([key,title,hint])=>
    '<section class="rm-detail-section detail-'+key+'"><div class="rm-detail-section-title">'+
    '<span class="rm-detail-section-marker" aria-hidden="true"></span>'+
    '<div><h3>'+title+'</h3><small>'+hint+'</small></div></div>'+
    '<p>'+esc(item[key])+'</p></section>').join("")+'</div>';
}
function detail(id){
  const x=itemById(id);
  if(!x)return;
  activeItem=x.id;
  const comments=Array.isArray(x.comments)?x.comments:[];
  let body='<div class="rm-detail-meta"><span class="rm-status-chip status-'+esc(x.status)+'">'+esc(statusOf(x.status).short)+'</span>'+
    '<span class="rm-priority '+esc(x.priority)+'">'+esc(PRIORITY[x.priority]||"Offen")+'</span>'+
    '<span>'+esc(x.category)+'</span></div>'+
    '<div class="rm-detail-intro"><span class="rm-detail-eyebrow">KURZBESCHREIBUNG</span><p class="rm-detail-description">'+esc(x.description)+'</p></div>'+
    '<div class="rm-detail-facts"><div><small>Meilenstein</small><strong>'+esc(x.milestone||"Offen")+'</strong></div>'+
    '<div><small>Nächster Schritt</small><strong>'+esc(x.nextStep||"Noch nicht festgelegt")+'</strong></div>'+
    '<div><small>Aktualisiert</small><strong>'+esc(niceDate(x.updatedAt))+'</strong></div></div>'+    detailsHtml(x)+
    (isAdmin()?'<div class="rm-detail-admin"><button class="btn subtle small" data-action="edit" data-id="'+esc(id)+'">Status und Details bearbeiten</button></div>':'')+
    '<div class="rm-comments"><div class="rm-comments-head"><h3>Diskussion</h3><span>'+comments.length+' Kommentar'+(comments.length===1?'':'e')+'</span></div>'+
    (comments.length?comments.map(c=>'<article class="rm-comment"><div><strong>'+esc(c.author)+'</strong><small>'+esc(niceDate(c.createdAt))+'</small>'+
      (isAdmin()?'<button type="button" class="rm-remove" data-action="delete-comment" data-id="'+esc(id)+'" data-comment="'+esc(c.id)+'" aria-label="Kommentar löschen">Entfernen</button>':'')+
      '</div><p>'+esc(c.text)+'</p></article>').join(""):'<p class="rm-no-comments">Noch keine Kommentare. Starte die Diskussion.</p>')+
    (canComment()?'<form data-form="comment"><label class="rm-field">Kommentar hinzufügen<textarea name="text" maxlength="2000" rows="4" required placeholder="Gedanken, Hinweise oder konkrete Wünsche …"></textarea></label>'+
      '<button class="btn primary" type="submit">Kommentar speichern</button></form>':
      '<p class="rm-readonly">Zum Kommentieren benötigst du einen persönlichen Schreibzugang.</p>')+'</div>';
  showModal(x.title,body,{wide:true});
}
function loginModal(){
  showModal("Zugangscode eingeben",'<p class="rm-modal-note">Die Roadmap ist für alle Personen mit Zugang zur geschützten Testseite lesbar. Für eigene Ideen und Kommentare benötigst du zusätzlich einen persönlichen Einladungscode.</p>'+
    '<form data-form="login"><label class="rm-field">Persönlicher Zugangscode<input name="code" type="password" autocomplete="off" pattern="[a-f0-9]{48}" minlength="48" maxlength="48" required></label>'+
    '<button class="btn primary" type="submit">Zugang freischalten</button></form>');
}
function ideaModal(){
  showModal("Neue Idee einreichen",'<p class="rm-modal-note">Gib deinem Vorschlag einen klaren Titel und beschreibe den Nutzen für die Turnierleitung. Neue Ideen starten im Status „Ideensammlung“ und können anschließend priorisiert werden.</p>'+
    '<form data-form="idea"><label class="rm-field">Titel<input name="title" maxlength="140" minlength="3" required placeholder="z. B. QR-Code für die Spielpaarungen"></label>'+
    '<label class="rm-field">Bereich'+categorySelect()+'</label>'+
    '<label class="rm-field">Beschreibung<textarea name="description" maxlength="2500" rows="5" required placeholder="Was soll das können? Wer profitiert davon?"></textarea></label>'+
    '<button class="btn primary" type="submit">Vorschlag einreichen</button></form>');
}
function editModal(id){
  const x=itemById(id);if(!x||!isAdmin())return;
  showModal("Eintrag bearbeiten: "+x.title,'<form data-form="edit" data-id="'+esc(id)+'">'+
    '<label class="rm-field">Titel<input name="title" maxlength="140" required value="'+esc(x.title)+'"></label>'+
    '<label class="rm-field">Kurzbeschreibung (Board & Liste)<textarea name="description" maxlength="2500" required rows="4">'+esc(x.description)+'</textarea></label>'+
    '<div class="rm-form-grid"><label class="rm-field">Status'+formValue("status",x.status,STATUS.map(v=>[v.key,v.title]))+'</label>'+
    '<label class="rm-field">Priorität'+formValue("priority",x.priority,[["high","Hoch"],["medium","Mittel"],["low","Niedrig"]])+'</label></div>'+
    '<label class="rm-field">Bereich'+categorySelect(x.category)+'</label>'+
    '<label class="rm-field">Meilenstein<input name="milestone" maxlength="140" required value="'+esc(x.milestone)+'"></label>'+
    '<label class="rm-field">Nächster Schritt<textarea name="nextStep" rows="3" maxlength="500" required>'+esc(x.nextStep)+'</textarea></label>'+
    '<div class="rm-edit-details-head"><h3>Ausführliche Details</h3><p>Diese Felder erscheinen ausschließlich nach dem Öffnen eines Roadmap-Punktes. Sie sind optional und können jederzeit erweitert werden.</p></div>'+
    DETAIL_SECTIONS.map(([key,title,hint])=>
      '<label class="rm-field">'+title+'<small>'+hint+'</small>'+
      '<textarea name="'+key+'" rows="'+(key==="scope"||key==="openPoints"?5:4)+'" maxlength="'+({benefit:900,scope:1400,currentState:1400,openPoints:1400,doneWhen:1000}[key])+'" placeholder="Hier die ausführlichen Informationen eintragen …">'+esc(x[key]||"")+'</textarea></label>').join("")+
    '<button class="btn primary" type="submit">Änderungen speichern</button></form>',{wide:true});
}
function membersModal(){
  if(!isAdmin())return;
  showModal("Zugänge verwalten",'<p class="rm-modal-note">Jede eingeladene Person bekommt einen eigenen Code. Du kannst ihn jederzeit widerrufen. Der bestehende Passwortschutz der Testseite gilt zusätzlich.</p>'+
    '<div class="rm-members">'+(state.members.length?state.members.map(m=>
      '<div class="rm-member"><div><strong>'+esc(m.label)+'</strong><small>'+(m.role==="commenter"?"Kommentare und Ideen":"Nur lesen")+' · seit '+esc(niceDate(m.createdAt))+'</small></div>'+
      '<button type="button" class="btn ghost small" data-action="revoke" data-id="'+esc(m.id)+'">Widerrufen</button></div>').join(""):
      '<p class="rm-no-comments">Noch keine persönlichen Zugänge.</p>')+'</div>'+
    '<h3>Person einladen</h3><form data-form="invite"><label class="rm-field">Name / Bezeichnung<input name="label" maxlength="70" required placeholder="z. B. Testteam Verein A"></label>'+
    '<label class="rm-field">Berechtigung'+formValue("role","commenter",[["commenter","Ideen und Kommentare"],["viewer","Nur lesen"]])+'</label>'+
    '<button type="submit" class="btn primary">Einladungscode erstellen</button></form>'+
    '<div class="rm-export"><a href="./roadmap-api.php?export=1" rel="nofollow">Roadmap inklusive Kommentare als JSON sichern</a></div>'+
    '<div class="rm-export"><button type="button" class="btn ghost small" data-action="rotate-owner">Projektleitungs-Code erneuern</button></div>',{wide:true});
}
function codeModal(title,code){
  showModal(title,'<p class="rm-token-warning"><strong>Nur einmal sichtbar.</strong> Diesen Code jetzt sicher kopieren und aufbewahren. Er wird ausschließlich als Hash auf dem Server gespeichert.</p>'+
    '<label class="rm-field">Geheimer Zugangscode<textarea class="rm-code" id="rm-secret" readonly rows="2">'+esc(code)+'</textarea></label>'+
    '<button type="button" class="btn primary" data-action="copy-secret">Code kopieren</button>');
}
async function load(){
  try{
    const response=await fetch(API,{credentials:"same-origin",cache:"no-store"});
    const data=await response.json();
    if(!response.ok||!data.ok)throw Error(data.error||"Roadmap-Service nicht erreichbar.");
    state={...data,offline:false};
  }catch(error){
    try{
      const fallback=await fetch("./roadmap-seed.json",{cache:"no-store",credentials:"same-origin"});
      if(!fallback.ok)throw Error("Auch die vorläufigen Daten sind nicht erreichbar.");
      const seed=await fallback.json();
      state={items:seed.items||[],session:{role:"guest",label:"Gast",csrf:""},
        members:[],storagePersistent:false,bootstrapAvailable:false,offline:true};
    }catch{
      root.innerHTML='<main class="rm-container"><div class="rm-alert"><strong>Roadmap gerade nicht erreichbar.</strong><p>'+esc(error.message)+'</p><a href="./index.html">Zur TENNILO-App</a></div></main>';
      return;
    }
  }
  render();
}
async function post(action,body={}){
  if(state.offline)throw Error("Der gemeinsame Kommentarservice ist nicht erreichbar.");
  const response=await fetch(API,{method:"POST",credentials:"same-origin",cache:"no-store",
    headers:{"Content-Type":"application/json"},body:JSON.stringify({action,csrf:state.session.csrf,...body})});
  const data=await response.json();
  if(!response.ok||!data.ok)throw Error(data.error||"Speichern fehlgeschlagen.");
  await load();
  return data;
}
async function run(action,body,onSuccess){
  try{
    const result=await post(action,body);
    if(onSuccess)onSuccess(result);
    else toast("Gespeichert.");
  }catch(error){toast(error.message||"Aktion fehlgeschlagen.",true);}
}
document.addEventListener("click",event=>{
  const b=event.target.closest("[data-action]");
  if(!b)return;
  const act=b.dataset.action,id=b.dataset.id;
  if(act==="view"){view=b.dataset.view;render();return;}
  if(act==="detail"){detail(id);return;}
  if(act==="close"){closeModal();return;}
  if(act==="login"){loginModal();return;}
  if(act==="idea"){if(canComment())ideaModal();else loginModal();return;}
  if(act==="edit"){editModal(id);return;}
  if(act==="members"){membersModal();return;}
  if(act==="bootstrap")return run("bootstrap",{},result=>{
    if(result.ownerCode)codeModal("Dein Projektleitungs-Zugang",result.ownerCode);
  });
  if(act==="logout")return run("logout",{},()=>toast("Abgemeldet."));
  if(act==="copy-secret"){
    const value=document.getElementById("rm-secret")?.value;
    if(!value)return;
    if(navigator.clipboard?.writeText)navigator.clipboard.writeText(value).then(()=>toast("Code kopiert.")).catch(()=>toast("Bitte Code manuell markieren."));
    else toast("Bitte Code manuell markieren.");
    return;
  }
  if(act==="delete-comment"){
    if(!confirm("Kommentar endgültig entfernen?"))return;
    return run("delete-comment",{itemId:id,commentId:b.dataset.comment},()=>{detail(id);toast("Kommentar entfernt.");});
  }
  if(act==="revoke"){
    if(!confirm("Diesen persönlichen Zugang widerrufen?"))return;
    return run("revoke",{inviteId:id},()=>{membersModal();toast("Zugang widerrufen.");});
  }
  if(act==="rotate-owner"){
    if(!confirm("Projektleitungs-Code ersetzen? Der bisherige Code wird sofort ungültig."))return;
    return run("rotate-owner",{},result=>codeModal("Neuer Projektleitungs-Code",result.ownerCode));
  }
});
document.addEventListener("input",event=>{
  if(event.target.id==="rm-search"){
    query=event.target.value;renderResults();
  }
});
document.addEventListener("change",event=>{
  if(event.target.id==="rm-filter-status")filterStatus=event.target.value;
  else if(event.target.id==="rm-filter-category")filterCategory=event.target.value;
  else if(event.target.id==="rm-filter-priority")filterPriority=event.target.value;
  else return;
  renderResults();
});
document.addEventListener("submit",event=>{
  const form=event.target.closest("form[data-form]");if(!form)return;
  event.preventDefault();
  const kind=form.dataset.form,d=new FormData(form);
  if(kind==="login")return run("login",{code:String(d.get("code")||"")},()=>{closeModal();toast("Zugang freigeschaltet.");});
  if(kind==="idea")return run("idea",{title:d.get("title"),description:d.get("description"),category:d.get("category")},
    result=>{closeModal();filterStatus="all";query="";render();detail(result.itemId);toast("Idee eingereicht.");});
  if(kind==="comment"){
    const id=activeItem;
    return run("comment",{itemId:id,text:d.get("text")},()=>{closeModal();detail(id);toast("Kommentar gespeichert.");});
  }
  if(kind==="edit")return run("update",{itemId:form.dataset.id,
    title:d.get("title"),description:d.get("description"),status:d.get("status"),
    priority:d.get("priority"),category:d.get("category"),
    milestone:d.get("milestone"),nextStep:d.get("nextStep"),
    ...Object.fromEntries(DETAIL_SECTIONS.map(([key])=>[key,d.get(key)]))},
    ()=>{closeModal();detail(form.dataset.id);toast("Status und Details aktualisiert.");});
  if(kind==="invite")return run("invite",{label:d.get("label"),role:d.get("role")},
    result=>{if(result.inviteCode)codeModal("Persönlicher Einladungscode",result.inviteCode);});
});
load();
