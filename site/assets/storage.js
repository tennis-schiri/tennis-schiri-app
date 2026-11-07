// Tennis-Schiri v0.2: austauschbare lokale Datenhaltung.
// Eine spätere PHP-/MariaDB-API kann dieselbe fachliche Datenstruktur verwenden.
const STORAGE_KEY = "tennis-schiri-tournaments-v1";
const VERSION = 1;

export const uid = () => typeof crypto !== "undefined" && crypto.randomUUID
  ? crypto.randomUUID() : String(Date.now()) + "-" + Math.random().toString(36).slice(2);

export const todayLocal = () => {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
};

const initial = () => ({ schemaVersion: VERSION, activeId: null, tournaments: [] });
const text = (v, limit = 90) => String(v ?? "").trim().slice(0, limit);
const integer = (v, min, max, fallback) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= min && n <= max ? n : fallback;
};
const MAX_COURTS = 1000; // technische Sicherheitsgrenze, nicht die frühere 7-Plätze-Grenze
const courtsOf = v => {
  const list = Array.isArray(v) ? v.slice(0, MAX_COURTS) : [];
  const numbers = [...new Set(list.map(Number).filter(n => Number.isSafeInteger(n) && n >= 1 && n <= MAX_COURTS))].sort((a,b) => a-b);
  return numbers.length ? numbers : [1, 2, 3, 4, 5, 6];
};
const courtLabelsOf = (v, courts) => {
  const labels = Object.create(null);
  if (!v || typeof v !== "object" || Array.isArray(v)) return labels;
  for (const number of courts) {
    const name = text(v[number], 60);
    if (name && name !== `Platz ${number}`) labels[number] = name;
  }
  return labels;
};

// Organisation: Zahlungen nur als manuell erfasste BAR-Beträge; laufende
// Rundenuhren als echte Zeitstempel für Reload / anderen Browser-Tab sichern.
const money=(v,fallback=0)=>integer(v,0,9999999,fallback);
const normalizeClocks=v=>{
  const clocks=Object.create(null);
  if(!v||typeof v!=="object"||Array.isArray(v))return clocks;
  for(const [key,item] of Object.entries(v).slice(0,500)){
    if(!/^(?:0|[1-9]\d{0,2})$/.test(key)||Number(key)>=500||!item||typeof item!=="object")continue;
    const first=Number(item.firstStartedAt),start=item.startedAt==null?null:Number(item.startedAt);
    const finished=item.finishedAt==null?null:Number(item.finishedAt);
    if(!Number.isSafeInteger(first)||first<=0||
       start!==null&&(!Number.isSafeInteger(start)||start<first)||
       finished!==null&&(!Number.isSafeInteger(finished)||finished<first))continue;
    clocks[key]={
      firstStartedAt:first,
      startedAt:finished===null?start:null,
      finishedAt:finished,
      elapsedMs:integer(item.elapsedMs,0,604800000,0),
      durationMs:integer(item.durationMs,600000,7200000,1200000)
    };
  }
  return clocks;
};

const feeCategoriesOf=(list,standardCents)=>{
  const categories=[{id:"standard",name:"Standard",amountCents:standardCents}];
  if(!Array.isArray(list))return categories;
  const usedNames=new Set();
  const standard=list.find(x=>x?.id==="standard");
  if(standard){
    categories[0]={
      id:"standard",
      name:text(standard.name,40)||"Standard",
      amountCents:money(standard.amountCents,standardCents)
    };
  }
  usedNames.add(categories[0].name.toLocaleLowerCase("de-DE"));
  const ids=new Set(["standard"]);
  for(const x of list){
    if(categories.length>=20)break;
    const id=String(x?.id??"");
    const name=text(x?.name,40);
    if(!/^[a-z0-9_-]{1,80}$/i.test(id)||ids.has(id)||!name)continue;
    if(usedNames.has(name.toLocaleLowerCase("de-DE")))continue;
    categories.push({id,name,amountCents:money(x.amountCents)});
    ids.add(id);
    usedNames.add(name.toLocaleLowerCase("de-DE"));
  }
  return categories;
};
// Doppelturniere teilen sich den sicheren Browser-/JSON-Sicherungsmechanismus,
// speichern Teams, Spielplan und Play-offs aber getrennt von Schleifchen-Daten.
const doublesOf=(value,categories)=>{
  const raw=value&&typeof value==="object"&&!Array.isArray(value)?value:{};
  const allowed=new Set(categories.map(c=>c.id));
  const teams=(Array.isArray(raw.teams)?raw.teams:[]).slice(0,100).map(team=>({
    id:text(team?.id,80)||uid(),
    player1:text(team?.player1,80),player2:text(team?.player2,80),
    present:team?.present===true,
    tier1:allowed.has(team?.tier1)?team.tier1:"standard",
    tier2:allowed.has(team?.tier2)?team.tier2:"standard",
    paid1:money(team?.paid1),paid2:money(team?.paid2)
  })).filter(team=>team.player1&&team.player2);
  const draw=raw.draw?.format==="doubles-v1"&&typeof raw.draw.signature==="string"&&
    raw.draw.signature.length<30000&&Array.isArray(raw.draw.rounds)&&raw.draw.rounds.length<=500&&
    raw.draw.rounds.every(r=>Array.isArray(r.matches)&&r.matches.length<=100)?raw.draw:null;
  const p=raw.playoffs;
  const size=Array.isArray(p?.seeds)?p.seeds.length:0;
  const playoffs=[2,4,8,16].includes(size)&&
    (size<16||(Array.isArray(p.roundOf16)&&p.roundOf16.length===8))&&
    (size<8||(Array.isArray(p.quarterfinals)&&p.quarterfinals.length===4))&&
    (size<4||(Array.isArray(p.semifinals)&&p.semifinals.length===2))&&
    p.final&&(size<4||p.thirdPlace)?p:null;
  const tieBreaks=(Array.isArray(raw.tieBreaks)?raw.tieBreaks:[]).slice(-100).map(x=>{
    const ids=Array.isArray(x?.ids)?x.ids.map(id=>text(id,80)):[];
    const order=Array.isArray(x?.order)?x.order.map(id=>text(id,80)):[];
    const signature=typeof x?.signature==="string"?x.signature:"";
    const method=x?.method;
    if(ids.length<2||ids.length>100||new Set(ids).size!==ids.length||
      ids.some(id=>!id)||order.length!==ids.length||new Set(order).size!==ids.length||
      !order.every(id=>ids.includes(id))||signature.length>20000||
      !["onsite","random","manual"].includes(method))return null;
    return {ids,order,signature,method,
      decidedAt:text(x?.decidedAt,40)};
  }).filter(Boolean);
  return {teams,draw,playoffs,tieBreaks,playoffOptOut:Array.isArray(raw.playoffOptOut)?
    [...new Set(raw.playoffOptOut.map(id=>text(id,80)).filter(Boolean))].slice(0,100):[]};
};

// One Point Cup: eigenes Teilnehmerfeld, Freilose und K.-o.-Tableau.
const onePointOf=(value,categories)=>{
  const raw=value&&typeof value==="object"&&!Array.isArray(value)?value:{};
  const allowed=new Set(categories.map(x=>x.id));
  const players=(Array.isArray(raw.players)?raw.players:[]).slice(0,64).map(player=>({
    id:text(player?.id,80)||uid(),
    name:text(player?.name,80),
    present:player?.present===true,
    feeTierId:allowed.has(player?.feeTierId)?player.feeTierId:"standard",
    paidCents:money(player?.paidCents)
  })).filter(player=>player.name);
  const size=[2,4,8,16,32,64].includes(Number(raw.fieldSize))?Number(raw.fieldSize):32;
  const draw=raw.draw?.format==="one-point-v1"&&
    typeof raw.draw.signature==="string"&&raw.draw.signature.length<12000&&
    Array.isArray(raw.draw.rounds)&&raw.draw.rounds.length<=6&&
    raw.draw.rounds.every(r=>Array.isArray(r)&&r.length<=32)?raw.draw:null;
  return {players,fieldSize:size,draw};
};

export function normalizeTournament(v) {
  const courts = courtsOf(v.courts);
  const categories=feeCategoriesOf(v.feeCategories,money(v.entryFeeCents));
  return {
    id: text(v.id, 80) || uid(),
    type:v.type==="doubles"?"doubles":v.type==="opc"?"opc":"ribbon",
    demoMode:v.demoMode===true,
    doubles:doublesOf(v.doubles,categories),
    opc:onePointOf(v.opc,categories),
    name: text(v.name) || "Unbenanntes Turnier",
    date: /^\d{4}-\d{2}-\d{2}$/.test(v.date ?? "") ? v.date : todayLocal(),
    startTime: /^\d{2}:\d{2}$/.test(v.startTime ?? "") ? v.startTime : "10:00",
    endTime: typeof v.endTime==="string"&&/^([01]\d|2[0-3]):[0-5]\d$/.test(v.endTime)?v.endTime:null,
    timeMode:v.matchMode==="points"&&v.type!=="opc"?"fixed":v.timeMode==="fit"?"fit":"fixed",
    matchMode:v.type==="opc"?"points":v.matchMode==="points"?"points":"time",
    pointTarget:v.type==="opc"?1:integer(v.pointTarget,1,99,7),
    pointWinByTwo:v.type!=="opc"&&v.matchMode==="points"&&v.pointWinByTwo===true,
    reserveFinals:v.reserveFinals===true,
    reservePlayoffs:v.reservePlayoffs!==false,
    playoffSize:[2,4,8,16].includes(Number(v.playoffSize))?Number(v.playoffSize):8,
    opcMinutes:integer(v.opcMinutes,1,15,3),
    duration: integer(v.duration, 10, 120, 20),
    breakMinutes: integer(v.breakMinutes, 0, 60, 10),
    rounds: integer(v.rounds, 1, 8, 4),
    entryFeeCents: categories[0].amountCents,
    feeCategories:categories,
    roundClocks: normalizeClocks(v.roundClocks),
    // Auswahl für ein zweites Fenster desselben Browsers – nicht übertragene Daten.
    liveDisplay:v.liveDisplay?.mode==="finals"?{mode:"finals"}:
      v.liveDisplay?.mode==="round"&&Number.isInteger(v.liveDisplay.index)&&
      v.liveDisplay.index>=0&&v.liveDisplay.index<(v.type==="doubles"?500:21)?
      {mode:"round",index:v.liveDisplay.index}:null,
    courts,
    courtLabels: courtLabelsOf(v.courtLabels, courts),
    // Endrunden-Optionen bleiben unabhängig von der Auslosung im Turnier gespeichert.
    finalSize: [8,16].includes(Number(v.finalSize)) ? Number(v.finalSize) : 8,
    finalOptOut: Array.isArray(v.finalOptOut) ?
      [...new Set(v.finalOptOut.map(id=>text(id,80)).filter(Boolean))].slice(0,500) : [],
    // Auslosungen werden pro Turnier gespeichert. Die Signatur verhindert, dass ein
    // alter Plan nach Teilnehmer-/Platzänderungen als gültig dargestellt wird.
    draw: v.draw && typeof v.draw === "object" && !Array.isArray(v.draw) &&
      typeof v.draw.signature === "string" && Array.isArray(v.draw.rounds) &&
      v.draw.rounds.length <= 20 ? v.draw : null,
    participants: Array.isArray(v.participants) ? v.participants.slice(0, 500).map(p => ({
      id: text(p.id, 80) || uid(),
      name: text(p.name, 80),
      group: p.group === "stark" ? "stark" : "schwaecher",
      present: p.present === true,
      feeTierId:categories.some(x=>x.id===p.feeTierId)?p.feeTierId:"standard",
      feeOverrideCents: p.feeOverrideCents==null ? null : money(p.feeOverrideCents),
      feePaidCents: money(p.feePaidCents),
      feePaidAt: typeof p.feePaidAt==="string"&&p.feePaidAt.length<=35 ? p.feePaidAt : null
    })).filter(p => p.name) : []
  };
}

export function newTournament(values = {}) {
  return normalizeTournament({
    id: uid(), type:values.type, demoMode:values.demoMode===true, doubles:values.doubles, opc:values.opc, name: values.name, date: values.date, startTime: values.startTime,
    endTime:values.endTime,timeMode:values.timeMode,matchMode:values.matchMode,pointTarget:values.pointTarget,pointWinByTwo:values.pointWinByTwo,reserveFinals:values.reserveFinals,reservePlayoffs:values.reservePlayoffs,playoffSize:values.playoffSize,opcMinutes:values.opcMinutes,
    duration: values.duration, breakMinutes: values.breakMinutes,
    rounds: values.rounds, courts: values.courts, courtLabels: values.courtLabels,
    finalSize: values.finalSize ?? 8, finalOptOut: [], entryFeeCents: values.entryFeeCents ?? 0,
    feeCategories:values.feeCategories,
    roundClocks: {}, liveDisplay:null, draw: null,
    // Nur explizite Demo-Kopien dürfen bereits beim Anlegen Testspieler mitbringen.
    participants: values.demoMode===true&&Array.isArray(values.participants)?values.participants:[]
  });
}

export class BrowserTournamentStore {
  constructor() {
    this.state = this.load();
  }
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return initial();
      const parsed = JSON.parse(raw);
      if (parsed.schemaVersion !== VERSION || !Array.isArray(parsed.tournaments)) return initial();
      const tournaments = parsed.tournaments.slice(0, 100).map(normalizeTournament);
      const activeId = tournaments.some(t => t.id === parsed.activeId) ? parsed.activeId : (tournaments[0]?.id ?? null);
      return { schemaVersion: VERSION, activeId, tournaments };
    } catch {
      return initial();
    }
  }
  save(next) {
    // Erst persistent schreiben; danach im UI aktualisieren.
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    this.state = next;
  }
  list() { return this.state.tournaments; }
  active() { return this.state.tournaments.find(t => t.id === this.state.activeId) ?? null; }
  setActive(id) {
    if (!this.list().some(t => t.id === id)) return;
    this.save({ ...this.state, activeId: id });
  }
  create(values) {
    const tournament = newTournament(values);
    this.save({ ...this.state, activeId: tournament.id, tournaments: [tournament, ...this.list()] });
    return tournament;
  }
  editTournament(id, patch) {
    this.save({ ...this.state, tournaments: this.list().map(t => {
      if(t.id!==id)return t;
      // Das bisherige Standard-Nenngeld bleibt in älteren Formularen bearbeitbar.
      const categories=Object.prototype.hasOwnProperty.call(patch,"entryFeeCents")&&
        !Object.prototype.hasOwnProperty.call(patch,"feeCategories")?
        t.feeCategories.map(x=>x.id==="standard"?{...x,amountCents:patch.entryFeeCents}:x):
        (patch.feeCategories??t.feeCategories);
      return normalizeTournament({ ...t, ...patch,feeCategories:categories,participants:t.participants });
    }) });
  }
  upsertFeeCategory(tournamentId,{id=null,name,amountCents}){
    const current=this.list().find(t=>t.id===tournamentId);
    if(!current)throw Error("Turnier nicht gefunden.");
    const title=text(name,40);
    if(!title||String(name??"").trim().length>40)throw Error("Bitte einen Kategorienamen mit maximal 40 Zeichen eingeben.");
    if(!Number.isSafeInteger(amountCents)||amountCents<0||amountCents>9999999)
      throw Error("Ungültiger Nenngeldbetrag.");
    const categories=current.feeCategories;
    if(categories.some(c=>c.id!==id&&c.name.toLocaleLowerCase("de-DE")===title.toLocaleLowerCase("de-DE")))
      throw Error("Eine Nenngeld-Kategorie mit diesem Namen gibt es bereits.");
    const found=id&&categories.find(c=>c.id===id);
    if(id&&!found)throw Error("Nenngeld-Kategorie nicht gefunden.");
    if(!id&&categories.length>=20)throw Error("Maximal 20 Nenngeld-Kategorien pro Turnier.");
    const nextId=id||("tier_"+uid().replace(/[^a-zA-Z0-9_-]/g,"").slice(0,70));
    const next=found?categories.map(c=>c.id===id?{...c,name:title,amountCents}:c):
      [...categories,{id:nextId,name:title,amountCents}];
    this.editTournament(tournamentId,{feeCategories:next,entryFeeCents:next[0].amountCents});
    return nextId;
  }
  removeFeeCategory(tournamentId,id){
    const current=this.list().find(t=>t.id===tournamentId);
    if(!current)throw Error("Turnier nicht gefunden.");
    if(!id||id==="standard")throw Error("Die Standard-Kategorie kann nicht entfernt werden.");
    if(!current.feeCategories.some(c=>c.id===id))throw Error("Kategorie nicht gefunden.");
    if(current.participants.some(p=>p.feeTierId===id))
      throw Error("Diese Kategorie ist noch Spielern zugeordnet. Bitte zuerst deren Nenngeld-Kategorie ändern.");
    this.editTournament(tournamentId,{feeCategories:current.feeCategories.filter(c=>c.id!==id)});
  }
  setParticipantFeeTier(tournamentId,participantId,tierId){
    const current=this.list().find(t=>t.id===tournamentId);
    if(!current?.feeCategories.some(c=>c.id===tierId))throw Error("Nenngeld-Kategorie nicht gefunden.");
    if(!current.participants.some(p=>p.id===participantId))throw Error("Teilnehmer nicht gefunden.");
    this.save({...this.state,tournaments:this.list().map(t=>t.id!==tournamentId?t:{
      ...t,participants:t.participants.map(p=>p.id!==participantId?p:{
        ...p,feeTierId:tierId,feeOverrideCents:null
      })
    })});
  }
  deleteTournament(id) {
    const tournaments = this.list().filter(t => t.id !== id);
    this.save({ ...this.state, tournaments, activeId: this.state.activeId === id
      ? (tournaments[0]?.id ?? null) : this.state.activeId });
  }
  upsertParticipant(tournamentId, values, participantId = null) {
    const name = text(values.name, 80);
    if (!name) throw new Error("Bitte einen Namen eingeben.");
    const current = this.list().find(t => t.id === tournamentId);
    if (!current) throw new Error("Turnier nicht gefunden.");
    if (current.participants.some(p => p.id !== participantId && p.name.toLocaleLowerCase("de-DE") === name.toLocaleLowerCase("de-DE"))) {
      throw new Error("Dieser Name ist im Turnier bereits vorhanden.");
    }
    if (!participantId && current.participants.length >= 500) throw new Error("Maximal 500 Teilnehmende pro Turnier.");
    const old=current.participants.find(p=>p.id===participantId);
    const player = {
      id: participantId || uid(),
      name,
      group: values.group === "stark" ? "stark" : "schwaecher",
      present: values.present === true,
      feeTierId:Object.prototype.hasOwnProperty.call(values,"feeTierId")?
        (current.feeCategories.some(c=>c.id===values.feeTierId)?values.feeTierId:"standard"):
        (old?.feeTierId||"standard"),
      feeOverrideCents: Object.prototype.hasOwnProperty.call(values,"feeOverrideCents")
        ? (values.feeOverrideCents==null ? null : money(values.feeOverrideCents))
        : (old?.feeOverrideCents??null),
      feePaidCents: old?.feePaidCents||0,
      feePaidAt: old?.feePaidAt||null
    };
    const participants = participantId
      ? current.participants.map(p => p.id === participantId ? player : p)
      : [...current.participants, player];
    const amended = this.list().map(t => t.id === tournamentId ? { ...t, participants } : t);
    this.save({ ...this.state, tournaments: amended });
  }
  recordCashPayment(tournamentId,participantId,paidCents) {
    if(!Number.isInteger(paidCents)||paidCents<0||paidCents>9999999)
      throw Error("Ungültiger Barbetrag.");
    const tournament=this.list().find(t=>t.id===tournamentId);
    if(!tournament?.participants.some(p=>p.id===participantId))throw Error("Teilnehmer nicht gefunden.");
    this.save({...this.state,tournaments:this.list().map(t=>t.id!==tournamentId?t:{
      ...t,participants:t.participants.map(p=>p.id!==participantId?p:{
        ...p,feePaidCents:paidCents,feePaidAt:paidCents>0?new Date().toISOString():null
      })
    })});
  }
  removeParticipant(tournamentId, participantId) {
    this.save({ ...this.state, tournaments: this.list().map(t => t.id === tournamentId
      ? { ...t, participants: t.participants.filter(p => p.id !== participantId) } : t) });
  }
  toggleParticipant(tournamentId, participantId) {
    this.save({ ...this.state, tournaments: this.list().map(t => t.id === tournamentId
      ? { ...t, participants: t.participants.map(p => p.id === participantId ? { ...p, present: !p.present } : p) } : t) });
  }
  exportJson() { return JSON.stringify(this.state, null, 2); }
  importJson(raw) {
    let parsed;
    try { parsed = JSON.parse(raw); } catch { throw new Error("Die Datei enthält kein gültiges JSON."); }
    if (parsed?.schemaVersion !== VERSION || !Array.isArray(parsed.tournaments) || parsed.tournaments.length > 100) {
      throw new Error("Keine gültige Tennis-Schiri-Sicherung (Version 1).");
    }
    for (const t of parsed.tournaments) {
      if (!t || typeof t.name !== "string" || !Array.isArray(t.participants) || t.participants.length > 500) {
        throw new Error("Die Sicherung enthält ungültige Turnierdaten.");
      }
    }
    const tournaments = parsed.tournaments.map(normalizeTournament);
    const ids = new Set(tournaments.map(t => t.id));
    if (ids.size !== tournaments.length) throw new Error("Die Sicherung enthält doppelte Turnierkennungen.");
    const activeId = ids.has(parsed.activeId) ? parsed.activeId : (tournaments[0]?.id ?? null);
    this.save({ schemaVersion: VERSION, activeId, tournaments });
  }
}