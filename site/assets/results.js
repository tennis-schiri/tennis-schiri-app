// TENNILO v0.3.1 – Ergebnisse der normalen Schleifchenturnier-Vorrunden.
// Fachquelle: "Schleifchen-Tabelle" und Schleifchen-V7 aus "Turniere Verein – Auslosung & Livetabelle".
// Der Sieger wird wie in der Tabelle ausdrücklich erfasst. Ein Sieg gibt jedem Spieler
// des Siegerteams ein Schleifchen. Game-Zahlen sind optional und nicht die Wertung.
import { analyzeRibbonDraw, verifyRibbonDraw } from "./draw.js";

const integerScore = value => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "string" && !/^(0|[1-9]\d*)$/.test(value.trim())) throw new Error("Bitte ganze, nicht negative Game-Zahlen eingeben.");
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0 || n > 99) throw new Error("Game-Zahlen müssen zwischen 0 und 99 liegen.");
  return n;
};

export function normalizeRibbonResult(value) {
  if (value === undefined || value === null) return {score1:null, score2:null, winner:null};
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Ergebnisdaten sind ungültig.");
  const score1=integerScore(value.score1);
  const score2=integerScore(value.score2);
  const winner=(value.winner === null || value.winner === undefined || value.winner === "") ? null : Number(value.winner);
  if (winner !== null && winner !== 1 && winner !== 2) throw new Error("Bitte Team 1 oder Team 2 als Sieger wählen.");
  if ((score1 === null) !== (score2 === null)) throw new Error("Bitte entweder beide Game-Zahlen eintragen oder beide leer lassen.");
  if ((score1 !== null || score2 !== null) && winner === null) throw new Error("Bitte zu den Game-Zahlen auch das Siegerteam auswählen.");
  // Die Sieger-Spalte der Tabelle ist maßgeblich. Ein Gleichstand der Games kann
  // nach gesonderter Entscheidung trotzdem einen Sieger haben.
  // Bei ungleichen Games darf die eingetragene Gewinnerseite nicht widersprechen.
  if (score1 !== null && score1 !== score2 && winner !== (score1 > score2 ? 1 : 2))
    throw new Error("Das gewählte Siegerteam passt nicht zu den eingetragenen Games.");
  return {score1,score2,winner};
}

function checkedDraw(t) {
  if (!t?.draw) throw new Error("Bitte zuerst die Vorrunde auslosen.");
  const verification=verifyRibbonDraw(t,t.draw);
  if (!verification.ok) throw new Error(verification.errors[0] || "Der Spielplan ist ungültig.");
  return t.draw;
}

export function updateRibbonMatchResult(t,roundIndex,matchIndex,value) {
  const draw=checkedDraw(t);
  if(!Number.isInteger(roundIndex)||!Number.isInteger(matchIndex)||roundIndex<0||matchIndex<0)throw new Error("Ungültige Runde oder Begegnung.");
  const oldRound=draw.rounds[roundIndex], oldMatch=oldRound?.matches?.[matchIndex];
  if(!oldMatch)throw new Error("Begegnung nicht gefunden.");
  const result=normalizeRibbonResult(value);
  const rounds=draw.rounds.map((round,ri)=>ri!==roundIndex?round:{
    ...round, matches:round.matches.map((match,mi)=>mi!==matchIndex?match:{...match, result:result.winner===null?null:result})
  });
  return {...draw,rounds};
}

export function ribbonStandings(t) {
  const draw=checkedDraw(t);
  const spec=analyzeRibbonDraw(t);
  const players=t.participants.filter(p=>p.present);
  const byId=new Map(players.map(p=>[p.id,{id:p.id,name:p.name,group:p.group,
    target:spec.target,scheduled:spec.quotas[p.id],played:0,ribbons:0,losses:0}]));
  let completeMatches=0,totalMatches=0;
  const perRound=[];
  for(const round of draw.rounds){
    let roundComplete=0;
    for(const match of round.matches){
      totalMatches++;
      const result=normalizeRibbonResult(match.result);
      if(result.winner===null)continue;
      completeMatches++;roundComplete++;
      for(const id of match.slots){
        const p=byId.get(id);
        if(!p)throw new Error("Ergebnis enthält einen unbekannten Spieler.");
        p.played++;
      }
      const winnerIds=result.winner===1?match.slots.slice(0,2):match.slots.slice(2,4);
      const loserIds=result.winner===1?match.slots.slice(2,4):match.slots.slice(0,2);
      for(const id of winnerIds)byId.get(id).ribbons++;
      for(const id of loserIds)byId.get(id).losses++;
    }
    perRound.push({number:round.number,complete:roundComplete,total:round.matches.length});
  }
  const participants=[...byId.values()].map(p=>({...p,quote:p.played?p.ribbons/p.played:0}))
    .sort((a,b)=>b.ribbons-a.ribbons||b.played-a.played||a.name.localeCompare(b.name,"de")||a.id.localeCompare(b.id));
  const eligible={strong:[],weak:[]},special=spec.special;
  if(special&&completeMatches===totalMatches){
    const excluded=new Set([...special.regularStrong,...special.regularWeak]);
    for(const p of participants){
      if(excluded.has(p.id)||p.scheduled!==p.target||p.played<p.target||p.ribbons>1)continue;
      (p.group==="stark"?eligible.strong:eligible.weak).push(p);
    }
    for(const group of ["strong","weak"])eligible[group].sort((a,b)=>a.ribbons-b.ribbons||a.name.localeCompare(b.name,"de")||a.id.localeCompare(b.id));
  }
  const fillerReady=!!special&&completeMatches===totalMatches&&
    eligible.strong.length>=special.fillerStrong&&eligible.weak.length>=special.fillerWeak;
  return {participants,perRound,totalMatches,completeMatches,pendingMatches:totalMatches-completeMatches,
    complete:completeMatches===totalMatches,special,eligible,fillerReady};
}
