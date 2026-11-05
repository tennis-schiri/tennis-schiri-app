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
  for(const [key,item] of Object.entries(v).slice(0,21)){
    if(!/^(?:0|[1-9]\\d?)$/.test(key)||Number(key)>=21||!item||typeof item!=="object")continue;
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

export function normalizeTournament(v) {
  const courts = courtsOf(v.courts);
  return {
    id: text(v.id, 80) || uid(),
    name: text(v.name) || "Unbenanntes Turnier",
    date: /^\d{4}-\d{2}-\d{2}$/.test(v.date ?? "") ? v.date : todayLocal(),
    startTime: /^\d{2}:\d{2}$/.test(v.startTime ?? "") ? v.startTime : "10:00",
    duration: integer(v.duration, 10, 120, 20),
    breakMinutes: integer(v.breakMinutes, 0, 60, 10),
    rounds: integer(v.rounds, 1, 8, 4),
    entryFeeCents: money(v.entryFeeCents),
    roundClocks: normalizeClocks(v.roundClocks),
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
      feeOverrideCents: p.feeOverrideCents==null ? null : money(p.feeOverrideCents),
      feePaidCents: money(p.feePaidCents),
      feePaidAt: typeof p.feePaidAt==="string"&&p.feePaidAt.length<=35 ? p.feePaidAt : null
    })).filter(p => p.name) : []
  };
}

export function newTournament(values = {}) {
  return normalizeTournament({
    id: uid(), name: values.name, date: values.date, startTime: values.startTime,
    duration: values.duration, breakMinutes: values.breakMinutes,
    rounds: values.rounds, courts: values.courts, courtLabels: values.courtLabels,
    finalSize: values.finalSize ?? 8, finalOptOut: [], entryFeeCents: values.entryFeeCents ?? 0,
    roundClocks: {}, draw: null, participants: []
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
    this.save({ ...this.state, tournaments: this.list().map(t => t.id === id
      ? normalizeTournament({ ...t, ...patch, participants: t.participants }) : t) });
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
      feeOverrideCents: values.feeOverrideCents==null ? (old?.feeOverrideCents??null) :
        money(values.feeOverrideCents),
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