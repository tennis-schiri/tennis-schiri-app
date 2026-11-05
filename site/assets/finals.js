// TENNILO v0.4.0 – Schleifchen-Endrunde (8 oder 16 Einzelspieler, feste Doppel).
// Fachquelle: Google-Tabelle "Turniere Verein – Auslosung & Livetabelle":
// Top 8/16 nach Schleifchenzahl; Abwahl und Nachrücker; gemischte Teams bevorzugen;
// bei ungleichen Stärkegruppen gleichgruppige Restpaare; feste Teams bis zum Finale.
import { verifyRibbonDraw, ribbonNormalResultsKey, ribbonStableHash } from "./draw.js";
import { normalizeRibbonResult, ribbonStandings } from "./results.js";

const hasWinner = r => r?.winner === 1 || r?.winner === 2;
const sameTeam=(a,b)=>Array.isArray(a)&&Array.isArray(b)&&a.length===2&&b.length===2&&a[0]===b[0]&&a[1]===b[1];
const shuffled=(items,rng)=>{
  const a=[...items];
  for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
  return a;
};
const seeded=seed=>{
  let a=seed>>>0;
  return ()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};
};
const sizeOf=t=>Number(t?.finalSize)===16?16:8;
export function ribbonFinalSourceKey(draw) {
  return JSON.stringify({
    signature:draw?.signature,
    normal:ribbonNormalResultsKey(draw),
    special:draw?.specialRound ? {
      slots:draw.specialRound.matches.map(m=>[m.slots,m.fillerMask]),
      results:draw.specialRound.matches.map(m=>m.result??null)
    } : null
  });
}
export function ribbonFinalPreview(t) {
  if(!t?.draw)throw Error("Zuerst die Vorrunden auslosen.");
  const verify=verifyRibbonDraw(t,t.draw);
  if(!verify.ok)throw Error(verify.errors[0]||"Die Vorrunden sind ungültig.");
  const standing=ribbonStandings(t);
  const size=sizeOf(t);
  const optedOut=new Set(t.finalOptOut||[]);
  const available=standing.participants.filter(p=>!optedOut.has(p.id));
  const eligible=available.slice(0,size);
  const reserves=available.slice(size);
  const complete=standing.finished;
  const ready=complete&&eligible.length===size;
  const byId=new Map(eligible.map((p,i)=>[p.id,i+1]));
  const reserveById=new Map(reserves.map((p,i)=>[p.id,i+1]));
  const rows=standing.participants.map((p,i)=>({
    ...p,rank:i+1,
    wantsFinal:!optedOut.has(p.id),
    qualified:byId.has(p.id),
    reserveRank:reserveById.get(p.id)||null
  }));
  const reason=!complete?
    "Zuerst alle Vorrunden-Ergebnisse einschließlich einer eventuell nötigen Auffüllrunde erfassen.":
    eligible.length<size ? `Für ${size} Endrundenspieler fehlen noch ${size-eligible.length} spielbereite Personen.` : null;
  return {size,complete,ready,reason,eligible,reserves,rows};
}
function buildStage(id,label,matchCount,courts,initialTeams=null){
  return {id,label,matches:Array.from({length:matchCount},(_,i)=>({
    team1:initialTeams?.[i*2]||null,
    team2:initialTeams?.[i*2+1]||null,
    court:courts[i%courts.length],
    batch:Math.floor(i/courts.length)+1,
    result:null
  }))};
}
const winnerTeam=m=>{
  if(!m||!hasWinner(m.result)||!m.team1||!m.team2)return null;
  return m.result.winner===1?m.team1:m.team2;
};
export function rebuildRibbonFinalProgression(finals) {
  const rounds=finals.rounds.map(r=>({
    ...r,matches:r.matches.map(m=>({...m,team1:m.team1?[...m.team1]:null,team2:m.team2?[...m.team2]:null}))
  }));
  for(let i=1;i<rounds.length;i++){
    const source=rounds[i-1];
    rounds[i]={...rounds[i],matches:rounds[i].matches.map((old,j)=>{
      const a=winnerTeam(source.matches[j*2]),b=winnerTeam(source.matches[j*2+1]);
      const unchanged=(a===null&&old.team1===null||sameTeam(a,old.team1))&&
        (b===null&&old.team2===null||sameTeam(b,old.team2));
      return {...old,team1:a,team2:b,result:unchanged?old.result:null};
    })};
  }
  return {...finals,rounds};
}
export function verifyRibbonFinals(t) {
  const errors=[],finals=t?.draw?.finals;
  if(!finals)return {ok:false,errors:["Die Endrunde ist noch nicht ausgelost."]};
  try {
    const preview=ribbonFinalPreview(t);
    if(!preview.ready)errors.push(preview.reason||"Die Vorrunde ist nicht vollständig.");
    if(finals.size!==preview.size)errors.push("Endrundengröße wurde geändert.");
    if(finals.sourceKey!==ribbonFinalSourceKey(t.draw))errors.push("Vorrundenergebnisse wurden nach der Endrunden-Auslosung verändert.");
    if(!Array.isArray(finals.selectedIds)||finals.selectedIds.length!==finals.size||
      finals.selectedIds.some((id,i)=>id!==preview.eligible[i]?.id))errors.push("Endrunden-Auswahl hat sich verändert.");
    const expectedStages=finals.size===16?["quarter","semi","final"]:["semi","final"];
    if(!Array.isArray(finals.rounds)||finals.rounds.length!==expectedStages.length||
      finals.rounds.some((r,i)=>r?.id!==expectedStages[i]||!Array.isArray(r.matches)||
        r.matches.length!==[finals.size===16?4:2,finals.size===16?2:1,1][i])){
      return {ok:false,errors:[...errors,"Die Endrunden-Struktur ist ungültig."]};
    }
    const first=finals.rounds[0];
    const listed=first.matches.flatMap(m=>[...(m.team1||[]),...(m.team2||[])]);
    if(listed.length!==finals.size||new Set(listed).size!==finals.size||
       listed.some(id=>!finals.selectedIds.includes(id)))errors.push("Spieler in der Endrunde sind nicht eindeutig oder nicht qualifiziert.");
    for(const stage of finals.rounds)for(const m of stage.matches){
      if(!t.courts.includes(m.court)||!Number.isInteger(m.batch)||m.batch<1)errors.push("Ungültige Platzplanung in der Endrunde.");
      if(m.team1!==null&&(!Array.isArray(m.team1)||m.team1.length!==2)||m.team2!==null&&(!Array.isArray(m.team2)||m.team2.length!==2))
        errors.push("Ein Endrunden-Team ist ungültig.");
      try{
        const r=normalizeRibbonResult(m.result);
        if(r.winner!==null&&(!m.team1||!m.team2))errors.push("Ein Endrunden-Ergebnis hat noch keine vollständigen Teams.");
      }catch(e){errors.push(e.message);}
    }
    const rebuilt=rebuildRibbonFinalProgression(finals);
    for(let i=1;i<finals.rounds.length;i++)for(let j=0;j<finals.rounds[i].matches.length;j++){
      const a=finals.rounds[i].matches[j],b=rebuilt.rounds[i].matches[j];
      if(!(a.team1===null&&b.team1===null||sameTeam(a.team1,b.team1))||
         !(a.team2===null&&b.team2===null||sameTeam(a.team2,b.team2)))
        errors.push("Die Halbfinal-/Finalbegegnungen entsprechen nicht den Vorrunden-Siegern.");
    }
    const champion=winnerTeam(finals.rounds.at(-1)?.matches?.[0]);
    return {ok:errors.length===0,errors,champion,complete:!!champion,rounds:finals.rounds};
  } catch(e){return {ok:false,errors:[...errors,e.message]};}
}
export function createRibbonFinals(t,{seed}={}) {
  if(t?.draw?.finals)throw Error("Die Endrunde wurde bereits ausgelost. Bitte zuerst zurücknehmen.");
  const preview=ribbonFinalPreview(t);
  if(!preview.ready)throw Error(preview.reason||"Die Endrunde ist noch nicht bereit.");
  const base=Number.isSafeInteger(seed)?seed:ribbonStableHash(ribbonFinalSourceKey(t.draw)+JSON.stringify(preview.eligible.map(p=>p.id)));
  const rng=seeded(base);
  const strong=shuffled(preview.eligible.filter(p=>p.group==="stark").map(p=>p.id),rng);
  const weak=shuffled(preview.eligible.filter(p=>p.group==="schwaecher").map(p=>p.id),rng);
  const teams=[];
  while(strong.length&&weak.length)teams.push([strong.pop(),weak.pop()]);
  const rest=shuffled([...strong,...weak],rng);
  if(rest.length%2)throw Error("Die verbleibenden Spieler können nicht paarweise zugeordnet werden.");
  for(let i=0;i<rest.length;i+=2)teams.push([rest[i],rest[i+1]]);
  const ordered=shuffled(teams,rng);
  const stages=preview.size===16?
    [buildStage("quarter","Viertelfinale",4,t.courts,ordered),
      buildStage("semi","Halbfinale",2,t.courts),
      buildStage("final","Finale",1,t.courts)]:
    [buildStage("semi","Halbfinale",2,t.courts,ordered),
      buildStage("final","Finale",1,t.courts)];
  const finals={
    size:preview.size,sourceKey:ribbonFinalSourceKey(t.draw),
    selectedIds:preview.eligible.map(p=>p.id),
    rounds:stages,createdAt:new Date().toISOString()
  };
  const next={...t.draw,finals};
  const checked=verifyRibbonFinals({...t,draw:next});
  if(!checked.ok)throw Error(checked.errors[0]||"Die Endrunde konnte nicht geprüft werden.");
  return next;
}
export function updateRibbonFinalResult(t,stageIndex,matchIndex,value){
  const check=verifyRibbonFinals(t);
  if(!check.ok)throw Error(check.errors[0]);
  const finals=t.draw.finals;
  const match=finals.rounds?.[stageIndex]?.matches?.[matchIndex];
  if(!match)throw Error("Endrunden-Begegnung nicht gefunden.");
  if(!match.team1||!match.team2)throw Error("Beide vorherigen Begegnungen müssen zunächst entschieden sein.");
  const result=normalizeRibbonResult(value);
  const rounds=finals.rounds.map((stage,i)=>i!==stageIndex?stage:{
    ...stage,matches:stage.matches.map((m,j)=>j!==matchIndex?m:{...m,result:result.winner===null?null:result})
  });
  const progressed=rebuildRibbonFinalProgression({...finals,rounds});
  const draw={...t.draw,finals:progressed};
  const checked=verifyRibbonFinals({...t,draw});
  if(!checked.ok)throw Error(checked.errors[0]);
  return draw;
}
export function resetRibbonFinals(t){
  if(!t?.draw?.finals)throw Error("Es wurde noch keine Endrunde ausgelost.");
  const {finals,...draw}=t.draw;
  return draw;
}
