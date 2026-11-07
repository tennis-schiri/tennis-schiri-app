// TENNILO Doppelturnier: feste Zweierteams, Vorrunde, Rangliste und wählbare Play-offs.
import {plannedRound,tournamentSchedule} from "./operations.js?v=082";
import {normalizePointResult,scoringRules} from "./match-scoring.js";
// Fachliche Vorlage: "Turniere Verein – Auslosung & Livetabelle", Doppel-Setup,
// Doppel-Auslosung, Doppel-Livetabelle und Doppel-Play-Offs (03.10.2026).
const key = (a,b) => a < b ? a + "|" + b : b + "|" + a;
const maxGames = 99;
const validIndex = (v,max) => Number.isInteger(v) && v>=0 && v<max;
const copy = value => JSON.parse(JSON.stringify(value));
const isWinner = r => r && (r.winner === 1 || r.winner === 2);
const hashSeed = seed => {let x=(Number(seed)||1)>>>0;return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return (x>>>0)/4294967296;};};
const shuffle = (items,rng) => {const result=[...items];for(let i=result.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[result[i],result[j]]=[result[j],result[i]];}return result;};
const presentTeams = t => (t?.doubles?.teams||[]).filter(team=>team.present).map(team=>team.id);
const teamLabel = team => [team.player1,team.player2].filter(Boolean).join(" / ");

export const DOUBLES_PLAYOFF_SIZES = [2,4,8,16];
export function doublesPlayoffSize(t) {
  return DOUBLES_PLAYOFF_SIZES.includes(Number(t?.playoffSize)) ? Number(t.playoffSize) : 8;
}
export function doublesPlayoffStages(t) {
  const size=doublesPlayoffSize(t);
  return [
    ...(size===16?[{id:"roundOf16",title:"Achtelfinale",count:8}]:[]),
    ...(size>=8?[{id:"quarterfinals",title:"Viertelfinale",count:4}]:[]),
    ...(size>=4?[{id:"semifinals",title:"Halbfinale",count:2}]:[]),
    {id:"final",title:"Finale",count:1},
    ...(size>=4?[{id:"thirdPlace",title:"Spiel um Platz 3",count:1}]:[])
  ];
}
// Highest seed faces lowest, the two halves meet only in the final.
// Creates standard 1–16, 8–9 etc. seed pairing for any supported field size.
function seededPositions(size) {
  let positions=[1,2];
  for(let n=4;n<=size;n*=2)positions=positions.flatMap(x=>[x,n+1-x]);
  return positions.map(x=>x-1);
}


export function doublesDrawSignature(t) {
  return JSON.stringify({
    kind:"doubles-v1",
    gamesPerTeam:Number(t.rounds),
    courts:t.courts,
    teams:(t.doubles?.teams||[]).map(x=>[x.id,x.player1,x.player2,!!x.present]).sort((a,b)=>a[0].localeCompare(b[0]))
  });
}

export function normalizeDoublesResult(input,t=null) {
  if(t&&scoringRules(t).mode==="points")return normalizePointResult(input,t);
  if (input === null || input === undefined || input === "") return null;
  if (typeof input !== "object" || Array.isArray(input)) throw Error("Ungültiges Ergebnis.");
  if (input.winner == null || input.winner === "") return null;
  const winner=Number(input.winner);
  if (![1,2].includes(winner)) throw Error("Bitte das Siegerteam auswählen.");
  const games = [input.score1,input.score2].map(x=>{
    if (String(x??"").trim()==="" || !/^\d{1,2}$/.test(String(x).trim())) throw Error("Games bitte für beide Teams eingeben (0–99).");
    const n=Number(x);
    if (n>maxGames)throw Error("Games außerhalb 0–99.");
    return n;
  });
  const points = [input.points1,input.points2];
  const anyPoints = points.some(x => x!==null && x!==undefined && String(x)!=="");
  let p1=null,p2=null;
  if (anyPoints) {
    if (points.some(x => x===null || x===undefined || String(x).trim()==="" || !/^\d{1,3}$/.test(String(x).trim()))) {
      throw Error("Entscheidungspunkte bitte für beide Teams eintragen.");
    }
    p1=Number(points[0]);p2=Number(points[1]);
  }
  if (games[0] !== games[1]) {
    const fromGames = games[0] > games[1] ? 1 : 2;
    if (winner !== fromGames) throw Error("Das Siegerteam muss zum höheren Game-Ergebnis passen.");
  } else {
    if (p1===null || p2===null || p1===p2) throw Error("Bei Game-Gleichstand müssen unterschiedliche Entscheidungspunkte eingetragen werden.");
    const fromPoints = p1 > p2 ? 1 : 2;
    if (winner !== fromPoints) throw Error("Der Sieger muss zu den Entscheidungspunkten passen.");
  }
  return {score1:games[0],score2:games[1],points1:p1,points2:p2,winner};
}

export function analyzeDoublesSetup(t) {
  const ids=presentTeams(t), games=Number(t?.rounds), courts=t?.courts||[];
  const errors=[];
  if (!Number.isInteger(games)||games<1||games>8) errors.push("Bitte 1 bis 8 Vorrundenspiele pro Team einstellen.");
  if (ids.length < 2) errors.push("Mindestens zwei anwesende Doppel-Teams erforderlich.");
  if (ids.length > 100) errors.push("Maximal 100 anwesende Teams in dieser Testversion.");
  if (games >= ids.length) errors.push("Für die gewünschte Anzahl Spiele fehlen Gegner ohne Wiederholung.");
  if (ids.length%2===1 && games%2===1) errors.push("Bei ungerader Teamzahl sind nur gerade Spielezahlen je Team möglich.");
  if (!Array.isArray(courts)||!courts.length||courts.length>1000) errors.push("Bitte mindestens einen Platz anlegen.");
  if ((t?.doubles?.teams||[]).some(team=>!team.id || !team.player1 || !team.player2 ||
      team.player1.toLocaleLowerCase("de-DE") === team.player2.toLocaleLowerCase("de-DE"))) {
    errors.push("Alle Teams benötigen zwei unterschiedliche Spielernamen.");
  }
  const normalizedNames=(t?.doubles?.teams||[]).flatMap(x=>[x.player1,x.player2].map(n=>String(n).trim().toLocaleLowerCase("de-DE")));
  if (new Set(normalizedNames).size!==normalizedNames.length)errors.push("Ein Spieler darf nicht in mehreren Teams vorkommen.");
  const allIds=(t?.doubles?.teams||[]).map(x=>x.id);
  if (new Set(allIds).size!==allIds.length)errors.push("Team-IDs sind nicht eindeutig.");
  return {ok:errors.length===0,errors,teams:ids.length,fixtures:ids.length*games/2};
}

function robinFixtures(ids,games) {
  const rotation=[...ids];
  const fixtures=[];
  for(let r=0;r<games;r++){
    const pairing=[];
    for(let k=0;k<rotation.length/2;k++)pairing.push([rotation[k],rotation[rotation.length-1-k]]);
    fixtures.push(pairing);
    const item=rotation.pop();
    rotation.splice(1,0,item);
  }
  return fixtures;
}
function oddFixtures(ids,games) {
  const fixtures=[];
  for(let d=1;d<=games/2;d++){
    const group=[];
    for(let i=0;i<ids.length;i++)group.push([ids[i],ids[(i+d)%ids.length]]);
    fixtures.push(group);
  }
  return fixtures;
}

export function generateDoublesDraw(t,{seed=Date.now()}={}) {
  const status=analyzeDoublesSetup(t);
  if(!status.ok)throw Error(status.errors[0]);
  const rng=hashSeed(seed),ids=shuffle(presentTeams(t),rng),courts=[...t.courts];
  const fixtures=ids.length%2===0 ? robinFixtures(ids,t.rounds):oddFixtures(ids,t.rounds);
  const rounds=[];
  // Each actual time block has unique teams and unique courts. At low court
  // counts, one theoretical pairing round splits into multiple time blocks.
  for(const group of fixtures){
    for(const [a,b] of shuffle(group,rng)){
      let index=rounds.findIndex(round=>round.matches.length<courts.length &&
        !round.matches.some(m=>m.team1===a||m.team2===a||m.team1===b||m.team2===b));
      if(index<0){index=rounds.length;rounds.push({matches:[]});}
      const round=rounds[index];
      round.matches.push({team1:a,team2:b,court:courts[round.matches.length],result:null});
    }
  }
  const draw={format:"doubles-v1",signature:doublesDrawSignature(t),seed:Number(seed)||1,
    rounds,createdAt:new Date().toISOString()};
  const verification=verifyDoublesDraw(t,draw);
  if(!verification.ok)throw Error("Auslosung konnte nicht geprüft werden: "+verification.errors[0]);
  return draw;
}

export function verifyDoublesDraw(t,draw=t?.doubles?.draw) {
  const errors=[],setup=analyzeDoublesSetup(t);
  if(!setup.ok)return {ok:false,errors:setup.errors};
  if(!draw || draw.format!=="doubles-v1" || draw.signature!==doublesDrawSignature(t)
    || !Array.isArray(draw.rounds) || draw.rounds.length>500 || draw.rounds.length===0) {
    return {ok:false,errors:["Die Auslosung passt nicht zur aktuellen Team-/Platzliste."]};
  }
  const ids=presentTeams(t),counts=new Map(ids.map(id=>[id,0])),pairs=new Set();
  for(const round of draw.rounds){
    if(!Array.isArray(round.matches)||round.matches.length<1||round.matches.length>t.courts.length) {
      errors.push("Ungültige Runde oder Platzbelegung.");break;
    }
    const used=new Set(),courts=new Set();
    for(const m of round.matches){
      if(!counts.has(m.team1)||!counts.has(m.team2)||m.team1===m.team2)errors.push("Ungültige Teambegegnung.");
      if(used.has(m.team1)||used.has(m.team2))errors.push("Ein Team spielt doppelt in derselben Runde.");
      if(!t.courts.includes(m.court)||courts.has(m.court))errors.push("Ungültige Platzbelegung.");
      if(pairs.has(key(m.team1,m.team2)))errors.push("Ein Gegnerpaar wurde mehrfach ausgelost.");
      used.add(m.team1);used.add(m.team2);courts.add(m.court);pairs.add(key(m.team1,m.team2));
      if(counts.has(m.team1))counts.set(m.team1,counts.get(m.team1)+1);
      if(counts.has(m.team2))counts.set(m.team2,counts.get(m.team2)+1);
      if(m.result!=null){try{normalizeDoublesResult(m.result);}catch(e){errors.push(e.message);}}
    }
  }
  if([...counts.values()].some(count=>count!==Number(t.rounds)))errors.push("Nicht jedes Team hat die gewünschte Zahl von Spielen.");
  if(pairs.size!==setup.fixtures)errors.push("Die Anzahl der Begegnungen ist falsch.");
  return {ok:errors.length===0,errors,fixtures:pairs.size,rounds:draw.rounds.length};
}

export function updateDoublesResult(t,roundIndex,matchIndex,value) {
  if(t?.doubles?.playoffs)throw Error("Bitte zuerst die Play-offs zurücknehmen.");
  const check=verifyDoublesDraw(t);
  if(!check.ok)throw Error(check.errors[0]);
  const rounds=t.doubles.draw.rounds.map((r,i)=>i===roundIndex?{...r,matches:r.matches.map((m,j)=>
    j===matchIndex?{...m,result:normalizeDoublesResult(value,t)}:m)}:r);
  if(!validIndex(roundIndex,rounds.length)||!validIndex(matchIndex,rounds[roundIndex].matches.length))
    throw Error("Begegnung nicht gefunden.");
  return {...t.doubles.draw,rounds};
}

export function doublesStandings(t) {
  const valid=verifyDoublesDraw(t);
  if(!valid.ok)throw Error(valid.errors[0]);
  const rows=new Map((t.doubles.teams||[]).filter(x=>x.present).map(team=>[team.id,{
    id:team.id,name:teamLabel(team),played:0,wins:0,losses:0,gamesFor:0,gamesAgainst:0,gameDiff:0
  }]));
  let complete=0;
  for(const round of t.doubles.draw.rounds){
    for(const match of round.matches){
      const r=match.result;
      if(!isWinner(r))continue;
      const a=rows.get(match.team1),b=rows.get(match.team2);
      if(!a||!b)throw Error("Unbekannte Teams im Spielplan.");
      for(const [row,forGames,againstGames,win] of [[a,r.score1,r.score2,r.winner===1],
        [b,r.score2,r.score1,r.winner===2]]){
        row.played++;row.wins+=Number(win);row.losses+=Number(!win);
        row.gamesFor+=forGames;row.gamesAgainst+=againstGames;row.gameDiff=row.gamesFor-row.gamesAgainst;
      }
      complete++;
    }
  }
  const ranking=[...rows.values()].sort((a,b)=>b.wins-a.wins || b.gameDiff-a.gameDiff ||
    b.gamesFor-a.gamesFor || a.name.localeCompare(b.name,"de"));
  return {ranking,complete,planned:valid.fixtures,finished:complete===valid.fixtures};
}

export function doublesPlayoffPreview(t) {
  const info=doublesStandings(t);
  const size=doublesPlayoffSize(t);
  const excluded=new Set(t.doubles.playoffOptOut||[]);
  const eligible=info.ranking.filter(x=>!excluded.has(x.id));
  return {...info,eligible,size,ready:info.finished && eligible.length>=size,
    reason:!info.finished?"Zuerst alle Vorrundenergebnisse eintragen.":
      eligible.length<size?"Mindestens "+size+" Teams müssen für die Play-offs zugelassen sein.":null};
}

const newMatch=(team1=null,team2=null,court=null)=>({team1,team2,court,result:null});
const winner=m=>isWinner(m?.result)?m.result.winner===1?m.team1:m.team2:null;
const loser=m=>isWinner(m?.result)?m.result.winner===1?m.team2:m.team1:null;
const preserve=(old,a,b,court)=>({
  team1:a,team2:b,court,
  result:old && old.team1===a && old.team2===b ? old.result : null
});
const matchRows=(matches,teams,courts)=>Array.from({length:teams.length/2},(_,i)=>
  preserve(matches?.[i],teams[i*2],teams[i*2+1],courts[i%courts.length]));

export function rebuildDoublesPlayoffs(t,playoffs) {
  const size=playoffs.seeds.length,courts=t.courts;
  const seedOrder=seededPositions(size).map(i=>playoffs.seeds[i]);
  const base=matchRows(
    size===16?playoffs.roundOf16:size===8?playoffs.quarterfinals:
      size===4?playoffs.semifinals:[playoffs.final],
    seedOrder,courts);
  const r16=size===16?base:[];
  const qf=size===16?matchRows(playoffs.quarterfinals,r16.map(winner),courts):
    size===8?base:[];
  const sf=size===16||size===8?matchRows(playoffs.semifinals,qf.map(winner),courts):
    size===4?base:[];
  const finals=size>=4?sf.map(winner):[];
  const final=size===2?base[0]:preserve(playoffs.final,finals[0],finals[1],courts[0]);
  const third=size===2?null:preserve(playoffs.thirdPlace,loser(sf[0]),loser(sf[1]),
    courts[Math.min(1,courts.length-1)]);
  return {...playoffs,roundOf16:r16,quarterfinals:qf,semifinals:sf,final,thirdPlace:third};
}

export function createDoublesPlayoffs(t) {
  const check=doublesPlayoffPreview(t);
  if(!check.ready)throw Error(check.reason);
  const seeds=check.eligible.slice(0,check.size).map(x=>x.id);
  return rebuildDoublesPlayoffs(t,{
    sourceSignature:t.doubles.draw.signature,
    seeds,
    roundOf16:[],quarterfinals:[],semifinals:[],final:newMatch(),thirdPlace:null
  });
}

export function updateDoublesPlayoffResult(t,stage,index,result) {
  const p=t?.doubles?.playoffs;
  if(!p)throw Error("Play-offs noch nicht ausgelost.");
  const stageInfo=doublesPlayoffStages({playoffSize:p.seeds.length}).find(s=>s.id===stage);
  if(!stageInfo || !validIndex(index,stageInfo.count))
    throw Error("Ungültige Play-off-Begegnung.");
  const fresh=copy(rebuildDoublesPlayoffs(t,p));
  const matches=stage==="final"||stage==="thirdPlace"?[fresh[stage]]:fresh[stage];
  if(!matches[index]?.team1||!matches[index]?.team2)
    throw Error("Diese Begegnung ist noch nicht vollständig besetzt.");
  matches[index].result=normalizeDoublesResult(result,t);
  if(stage==="final"||stage==="thirdPlace")fresh[stage]=matches[0];
  return rebuildDoublesPlayoffs(t,fresh);
}

export function doublesPlayoffStatus(t) {
  const p=t?.doubles?.playoffs;
  if(!p)return {ready:false};
  const check=verifyDoublesDraw(t);
  if(!check.ok || p.sourceSignature!==t.doubles.draw.signature ||
    !DOUBLES_PLAYOFF_SIZES.includes(p.seeds?.length) || p.seeds.length!==doublesPlayoffSize(t)) {
    return {ready:false,error:"Ungültige Play-off-Grundlage."};
  }
  const refreshed=rebuildDoublesPlayoffs(t,p);
  const champion=winner(refreshed.final),third=refreshed.thirdPlace?winner(refreshed.thirdPlace):null;
  return {ready:true,playoffs:refreshed,champion,third,
    done:!!(champion&&(p.seeds.length===2||third))};
}

export function doublesPlanRound(t,index) {
  return plannedRound(t,index);
}

// Try each requested match count with the same real draw generator that is used
// for the tournament; avoid claiming a time fit from an optimistic court estimate.
export function doublesMatchOptions(t,{seed=37}={}) {
  const options=[];
  for(let games=1;games<=8;games++){
    const candidate={...t,rounds:games,doubles:{...t.doubles,draw:null,playoffs:null}};
    const setup=analyzeDoublesSetup(candidate);
    if(!setup.ok){
      options.push({games,possible:false,reason:setup.errors[0],blocks:null});continue;
    }
    try{
      const draw=generateDoublesDraw(candidate,{seed});
      const scheduled={...candidate,doubles:{...candidate.doubles,draw}};
      const plan=tournamentSchedule(scheduled);
      options.push({games,possible:!plan.overTarget,
        blocks:draw.rounds.length,totalFixtures:setup.fixtures,
        preliminaryEnd:plannedRound(scheduled,draw.rounds.length-1).end,
        plannedEnd:plan.end,perBlockMinutes:plan.rounds[0].duration,
        reason:plan.overTarget?
          "Der feste Spielplan endet nach der gewünschten Endzeit.":""
      });
    }catch(e){
      options.push({games,possible:false,blocks:null,reason:e.message});
    }
  }
  return options;
}

export function changeDoublesClock(t,index,action,now=Date.now()) {
  if(!validIndex(index,t.doubles?.draw?.rounds.length||0))throw Error("Runde nicht gefunden.");
  const clocks={...(t.roundClocks||{})},key=String(index),previous=clocks[key];
  const running=previous && previous.startedAt!==null && previous.finishedAt===null;
  if(!["start","pause","resume","finish","reset"].includes(action))throw Error("Ungültige Rundenuhr-Aktion.");
  if(action==="reset"){delete clocks[key];return clocks;}
  if(["start","resume"].includes(action) &&
    Object.entries(clocks).some(([id,c])=>id!==key && c.startedAt!=null && c.finishedAt==null))
    throw Error("Eine andere Rundenuhr läuft noch.");
  if(action==="start"){
    if(previous)throw Error("Diese Runde wurde bereits gestartet.");
    clocks[key]={firstStartedAt:now,startedAt:now,finishedAt:null,elapsedMs:0,durationMs:plannedRound(t,index).duration*60000};
  }else if(action==="pause"){
    if(!running)throw Error("Die Rundenuhr läuft nicht.");
    clocks[key]={...previous,startedAt:null,elapsedMs:previous.elapsedMs+now-previous.startedAt};
  }else if(action==="resume"){
    if(!previous||previous.startedAt!==null||previous.finishedAt!==null)throw Error("Rundenuhr kann nicht fortgesetzt werden.");
    clocks[key]={...previous,startedAt:now};
  }else if(action==="finish"){
    if(!previous||previous.finishedAt!==null)throw Error("Diese Runde ist noch nicht gestartet oder wurde bereits beendet.");
    clocks[key]={...previous,elapsedMs:previous.elapsedMs+(running?now-previous.startedAt:0),
      startedAt:null,finishedAt:now};
  }
  return clocks;
}
