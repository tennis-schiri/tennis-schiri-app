// TENNILO v0.6.1 – datensparendes Live-Modell für lokale und entfernte Monitore.
// Das Modell kann nach ausdrücklicher Freigabe auch als gefilterter\n// Snapshot an den PHP-Server übertragen werden.
import {verifyRibbonDraw} from "./draw.js?v=061";
import {normalizeRibbonResult,ribbonStandings} from "./results.js?v=086";
import {verifyRibbonFinals} from "./finals.js?v=086";
import {plannedRound,clockFor} from "./operations.js?v=091";
import {verifyDoublesDraw,doublesStandings,doublesPlayoffStatus,doublesPlanRound,doublesPlayoffSize,doublesPlayoffStages,doublesPlayoffSeeding} from "./doubles.js?v=091";

const validResult=r=>r?.winner===1||r?.winner===2;
const sourceRound=(t,index)=>{
  const normal=t.draw?.rounds||[];
  return index===normal.length?t.draw?.specialRound:normal[index];
};
export function selectLiveRound(t) {
  const normal=t.draw?.rounds||[];
  const count=normal.length+(t.draw?.specialRound?1:0);
  if(!count)return null;
  const explicit=t.liveDisplay;
  if(explicit?.mode==="round"&&Number.isInteger(explicit.index)&&
    explicit.index>=0&&explicit.index<count)return explicit.index;
  const clocks=Object.entries(t.roundClocks||{})
    .filter(([key,c])=>Number.isInteger(Number(key))&&Number(key)>=0&&Number(key)<count&&c?.firstStartedAt)
    .map(([key,c])=>({index:Number(key),first:c.firstStartedAt,active:c.startedAt!=null&&c.finishedAt==null}));
  const running=clocks.filter(c=>c.active).sort((a,b)=>b.first-a.first);
  if(running.length)return running[0].index;
  const last=clocks.sort((a,b)=>b.first-a.first)[0];
  if(last)return last.index;
  for(let i=0;i<count;i++){
    const round=sourceRound(t,i);
    if(round?.matches?.some(m=>!validResult(m.result)))return i;
  }
  return count-1;
}
const normalizeMatch=(t,m,{roundFinal=false,number=1}={})=>{
  const players=new Map((t.participants||[]).map(p=>[p.id,p.name]));
  const names=ids=>ids?ids.map(id=>players.get(id)||"Unbekannter Spieler"):
    ["Sieger der vorherigen Runde"];
  const left=roundFinal?names(m.team1):names(m.slots.slice(0,2));
  const right=roundFinal?names(m.team2):names(m.slots.slice(2,4));
  const result=normalizeRibbonResult(m.result,t);
  return {
    number,
    court:t.courtLabels?.[m.court]||`Platz ${m.court}`,
    batch:m.batch||1,
    left,right,
    leftFillers:!roundFinal?m.fillerMask?.slice(0,2)||[false,false]:[],
    rightFillers:!roundFinal?m.fillerMask?.slice(2,4)||[false,false]:[],
    winner:result.winner,score1:result.score1,score2:result.score2,
    finished:result.winner!==null
  };
};
const ranking=standing=>(standing?.participants||[]).slice(0,10)
  .map((p,i)=>({place:i+1,name:p.name,ribbons:p.ribbons,played:p.played}));
const previewRound=(title,matches,start)=>({
  title,plannedStart:start,matches
});
const stageToDisplay=(t,standing)=>{
  const finals=t.draw.finals;
  const check=verifyRibbonFinals(t);
  if(!check.ok)return {mode:"invalid",message:check.errors[0]};
  const stages=finals.rounds;
  let index=stages.findIndex(stage=>stage.matches.some(m=>!validResult(m.result)));
  if(index<0)index=stages.length-1;
  const stage=stages[index];
  const preliminaryBlocks=t.draw.rounds.length+(t.draw.specialRound?1:0);
  let stagePlan=null;
  if(t.reserveFinals)try{stagePlan=plannedRound(t,preliminaryBlocks+index);}catch{}
  const following=stages[index+1];
  const nextRound=following?.matches?.length&&following.matches.every(m=>
    Array.isArray(m.team1)&&m.team1.length===2&&Array.isArray(m.team2)&&m.team2.length===2)?
    previewRound(following.label,following.matches.map((m,i)=>
      normalizeMatch(t,m,{roundFinal:true,number:i+1})),null):null;
  return {
    mode:"finals",title:stage.label,subtitle:"K.-o.-Endrunde · feste Doppel",
    nextRound,stageIndex:index,stageCount:stages.length,
    plannedStart:stagePlan?.start||null,plannedEnd:stagePlan?.end||null,
    progress:stage.matches.filter(m=>validResult(m.result)).length,
    total:stage.matches.length,
    matches:stage.matches.map((m,i)=>normalizeMatch(t,m,{roundFinal:true,number:i+1})),
    ranking:ranking(standing),
    champion:check.complete?check.champion.map(id=>
      t.participants.find(p=>p.id===id)?.name||"Unbekannter Spieler"):null
  };
};

const doublesTeamNames=(t,id)=>{
  const team=(t.doubles?.teams||[]).find(team=>team.id===id);
  return team?[team.player1,team.player2]:["Sieger der vorherigen Runde"];
};
const doublesVisibleMatch=(t,m,i)=>({
  number:i+1,court:t.courtLabels?.[m.court]||"Platz "+m.court,batch:1,
  left:doublesTeamNames(t,m.team1),right:doublesTeamNames(t,m.team2),
  leftFillers:[],rightFillers:[],winner:validResult(m.result)?m.result.winner:null,
  score1:m.result?.score1??null,score2:m.result?.score2??null,
  finished:validResult(m.result)
});
const doublesRanking=(t,info)=>{
  const size=doublesPlayoffSize(t);
  const seeding=doublesPlayoffSeeding(t,info.ranking);
  return info.ranking.slice(0,Math.max(10,size)).map((row,i)=>{
    const pair=seeding.byTeam.get(row.id);
    return {place:i+1,name:row.name,wins:row.wins,gameDiff:row.gameDiff,
      gamesFor:row.gamesFor,played:row.played,qualified:!!pair,
      pairNumber:pair?.number||0,pairLabel:pair?pair.label+" · "+pair.seedLabel:""};
  });
};
function selectedDoublesRound(t) {
  const rounds=t.doubles.draw.rounds,explicit=t.liveDisplay;
  if(explicit?.mode==="round"&&Number.isInteger(explicit.index)&&
    explicit.index>=0&&explicit.index<rounds.length)return explicit.index;
  const clocks=Object.entries(t.roundClocks||{})
    .map(([key,clock])=>({index:Number(key),clock}))
    .filter(({index,clock})=>Number.isInteger(index)&&index>=0&&index<rounds.length&&clock?.firstStartedAt);
  const running=clocks.filter(x=>x.clock.startedAt!=null&&x.clock.finishedAt==null)
    .sort((a,b)=>b.clock.firstStartedAt-a.clock.firstStartedAt);
  if(running.length)return running[0].index;
  const last=clocks.sort((a,b)=>b.clock.firstStartedAt-a.clock.firstStartedAt)[0];
  if(last)return last.index;
  const open=rounds.findIndex(round=>round.matches.some(m=>!validResult(m.result)));
  return open>=0?open:rounds.length-1;
}
function doublesLiveDisplay(t,now) {
  const base={id:t.id,name:t.name,date:t.date,startTime:t.startTime,now,format:"doubles",scoreUnit:t.matchMode==="points"?"points":"games",playoffSize:doublesPlayoffSize(t)};
  if(!t.doubles?.draw)return {...base,mode:"waiting",message:"Das Doppelturnier ist noch nicht ausgelost."};
  const verification=verifyDoublesDraw(t);
  if(!verification.ok)return {...base,mode:"invalid",message:verification.errors[0]};
  let standing;
  try{standing=doublesStandings(t);}catch(error){
    return {...base,mode:"invalid",message:error.message};
  }
  const ranking=doublesRanking(t,standing);
  if(t.doubles.playoffs&&t.liveDisplay?.mode!=="round"){
    const status=doublesPlayoffStatus(t);
    if(!status.ready)return {...base,mode:"invalid",message:status.error||"Die Play-offs sind ungültig."};
    const stages=doublesPlayoffStages(t).map(({id,title})=>({
      title,
      matches:id==="final"||id==="thirdPlace"?[status.playoffs[id]]:status.playoffs[id]
    }));

    let stage=stages.find(s=>s.matches.some(m=>!validResult(m.result)));
    if(!stage)stage=stages.find(x=>x.title==="Finale")||stages.at(-1);
    const champion=status.champion?doublesTeamNames(t,status.champion):null;
    const next=stages[stages.indexOf(stage)+1];
    const nextRound=next?.matches?.length&&next.matches.every(m=>m.team1&&m.team2)?
      previewRound(next.title,next.matches.map((m,i)=>doublesVisibleMatch(t,m,i)),null):null;
    return {...base,mode:"finals",title:stage.title,nextRound,
      subtitle:"Doppelturnier · feste Teams · Top-"+doublesPlayoffSize(t)+"-Play-offs",
      progress:stage.matches.filter(m=>validResult(m.result)).length,
      total:stage.matches.length,
      matches:stage.matches.map((m,i)=>doublesVisibleMatch(t,m,i)),
      ranking,champion};
  }
  const index=selectedDoublesRound(t);
  const round=t.doubles.draw.rounds[index];
  const plan=doublesPlanRound(t,index),timer=clockFor(t,index,now);
  const following=t.doubles.draw.rounds[index+1];
  const nextRound=following?previewRound("Runde "+(index+2),
    following.matches.map((m,i)=>doublesVisibleMatch(t,m,i)),
    doublesPlanRound(t,index+1).start):null;
  return {...base,mode:"round",index,title:"Runde "+(index+1),nextRound,
    subtitle:"Doppelturnier · feste Teams · Vorrunde",
    plannedStart:plan.start,plannedEnd:plan.end,timer,
    progress:round.matches.filter(m=>validResult(m.result)).length,
    total:round.matches.length,
    matches:round.matches.map((m,i)=>doublesVisibleMatch(t,m,i)),
    ranking,champion:null};
}

export function buildLiveDisplay(t,now=Date.now()) {
  if(!t)return {mode:"missing",message:"Das Turnier wurde in diesem Browser nicht gefunden."};
  if(t.type==="doubles")return doublesLiveDisplay(t,now);
  const base={id:t.id,name:t.name,date:t.date,startTime:t.startTime,now};
  if(!t.draw)return {...base,mode:"waiting",message:"Die Auslosung ist noch nicht erstellt."};
  const valid=verifyRibbonDraw(t,t.draw);
  if(!valid.ok)return {...base,mode:"invalid",message:valid.errors[0]||"Der Spielplan ist ungültig."};
  let standings;
  try{standings=ribbonStandings(t);}catch(e){return {...base,mode:"invalid",message:e.message};}
  const explicit=t.liveDisplay;
  if(t.draw.finals&&explicit?.mode!=="round"){
    return {...base,...stageToDisplay(t,standings)};
  }
  const index=selectLiveRound(t);
  if(index===null)return {...base,mode:"waiting",message:"Es ist noch keine Runde ausgelost."};
  const round=sourceRound(t,index);
  if(!round)return {...base,mode:"waiting",message:"Die ausgewählte Runde existiert nicht mehr."};
  const special=index===t.draw.rounds.length;
  const plan=plannedRound(t,index);
  const timer=clockFor(t,index,now);
  const matches=round.matches.map((m,i)=>normalizeMatch(t,m,{number:i+1}));
  const following=sourceRound(t,index+1);
  const nextRound=following?previewRound(
    index+1===t.draw.rounds.length?"Auffüllrunde":"Runde "+(index+2),
    following.matches.map((m,i)=>normalizeMatch(t,m,{number:i+1})),
    plannedRound(t,index+1).start):null;
  return {...base,
    mode:"round",index,title:special?"Auffüllrunde":`Runde ${index+1}`,nextRound,
    subtitle:special?"Zusätzliche Spiele · Auffüller ohne eigene Wertung":
      "Schleifchenturnier · Vorrunde",
    plannedStart:plan.start,plannedEnd:plan.end,
    timer,progress:matches.filter(m=>m.finished).length,
    total:matches.length,matches,ranking:ranking(standings),
    champion:null
  };
}
