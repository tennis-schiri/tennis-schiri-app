// TENNILO v0.6.0 – rein lesendes Datenmodell für den zweiten Monitor.
// Nutzt dieselben lokalen Turnierdaten wie die Turnierleitung in einem
// weiteren Fenster desselben Browserprofils; KEIN Geräte-/Serversync.
import {verifyRibbonDraw} from "./draw.js?v=060";
import {normalizeRibbonResult,ribbonStandings} from "./results.js?v=060";
import {verifyRibbonFinals} from "./finals.js?v=060";
import {plannedRound,clockFor} from "./operations.js?v=060";

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
  const result=normalizeRibbonResult(m.result);
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
const stageToDisplay=(t,standing)=>{
  const finals=t.draw.finals;
  const check=verifyRibbonFinals(t);
  if(!check.ok)return {mode:"invalid",message:check.errors[0]};
  const stages=finals.rounds;
  let index=stages.findIndex(stage=>stage.matches.some(m=>!validResult(m.result)));
  if(index<0)index=stages.length-1;
  const stage=stages[index];
  return {
    mode:"finals",title:stage.label,subtitle:"K.-o.-Endrunde · feste Doppel",
    stageIndex:index,stageCount:stages.length,
    progress:stage.matches.filter(m=>validResult(m.result)).length,
    total:stage.matches.length,
    matches:stage.matches.map((m,i)=>normalizeMatch(t,m,{roundFinal:true,number:i+1})),
    ranking:ranking(standing),
    champion:check.complete?check.champion.map(id=>
      t.participants.find(p=>p.id===id)?.name||"Unbekannter Spieler"):null
  };
};
export function buildLiveDisplay(t,now=Date.now()) {
  if(!t)return {mode:"missing",message:"Das Turnier wurde in diesem Browser nicht gefunden."};
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
  return {...base,
    mode:"round",index,title:special?"Auffüllrunde":`Runde ${index+1}`,
    subtitle:special?"Zusätzliche Spiele · Auffüller ohne eigene Wertung":
      "Schleifchenturnier · Vorrunde",
    plannedStart:plan.start,plannedEnd:plan.end,
    timer,progress:matches.filter(m=>m.finished).length,
    total:matches.length,matches,ranking:ranking(standings),
    champion:null
  };
}
