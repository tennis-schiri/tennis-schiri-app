// TENNILO Demo-Werkzeuge: ausschließlich für gesonderte Testkopien.
// Keine Live-Turniere, Barzahlungen oder bestehenden Ergebnisse überschreiben.
import {uid} from "./storage.js";
import {scoringRules} from "./match-scoring.js";
import {updateRibbonMatchResult} from "./results.js";
import {updateRibbonFinalResult} from "./finals.js";
import {updateDoublesResult,updateDoublesPlayoffResult} from "./doubles.js";
import {setOnePointWinner} from "./one-point.js";

const FIRST=["Alex","Robin","Kim","Toni","Mika","Luca","Jana","Sam","Chris","Nina","Pat","Max","Lea","Flo","Jules","Elli","Mara","Ben","Sascha","Noah","Lena","Milan","Tara","Nico","Pia","Finn","Mona","Jan","Kira","Tim","Lina","Jonas"];
const LAST=["Bauer","Fischer","Hartmann","Berger","Vogel","Beck","Hoffmann","Keller","Sommer","Seidel","Winter","Schulz","König","Neumann","Meyer","Brandt","Wolf","Richter","Krause","Schwarz","Krüger","Walter","Schmitt","Roth","Busch","Lorenz"];
const rand=(random,max)=>Math.floor(Math.min(0.999999999,Math.max(0,random()))*max);
const randomName=(random,i)=>"Demo "+FIRST[rand(random,FIRST.length)]+" "+LAST[rand(random,LAST.length)]+" "+String(i+1).padStart(2,"0");
const tier=(t,i)=>(t.feeCategories?.[i%(t.feeCategories.length||1)]?.id)||"standard";

export function demoCountLimits(t){
  if(t.type==="opc"){
    const size=t.opc.fieldSize;
    return {min:Math.floor(size/2)+1,max:size,defaultCount:Math.min(size,Math.max(Math.floor(size/2)+1,16)),unit:"Spieler"};
  }
  if(t.type==="doubles"){
    const min=Math.max(2,Number(t.rounds)+1);
    const fallback=Math.max(8,min+(min%2));
    return {min,max:100,defaultCount:fallback,unit:"Teams"};
  }
  return {min:8,max:500,defaultCount:16,unit:"Teilnehmende"};
}

export function makeDemoCopy(source,requested,{random=Math.random,makeId=uid}={}){
  if(!source||!["ribbon","doubles","opc"].includes(source.type))
    throw Error("Unbekanntes Turnierformat.");
  const limits=demoCountLimits(source),count=Number(requested);
  if(!Number.isInteger(count)||count<limits.min||count>limits.max)
    throw Error("Bitte "+limits.min+" bis "+limits.max+" "+limits.unit+" wählen.");
  if(source.type==="ribbon"&&count%2)
    throw Error("Beim Schleifchenturnier eine gerade Zahl für gleich große Stärkegruppen wählen.");
  if(source.type==="doubles"&&count%2&&source.rounds%2)
    throw Error("Bei ungerader Teamzahl muss die Anzahl der Matches pro Team gerade sein.");
  const ids=new Set();
  const nextId=()=>{let id;do{id=String(makeId());}while(!id||ids.has(id));ids.add(id);return id;};
  const players=Array.from({length:source.type==="doubles"?count*2:count},(_,i)=>randomName(random,i));
  const copy={...source,name:("Demo – "+source.name.replace(/^Demo\s*[–-]\s*/i,"")).slice(0,90),
    demoMode:true,draw:null,participants:[],roundClocks:{},liveDisplay:null,
    finalOptOut:[],doubles:{teams:[],draw:null,playoffs:null,playoffOptOut:[]},
    opc:{players:[],fieldSize:source.opc.fieldSize,draw:null}};
  if(source.type==="ribbon"){
    copy.participants=players.map((name,i)=>({id:nextId(),name,
      group:i<count/2?"stark":"schwaecher",present:true,feeTierId:tier(source,i),
      feeOverrideCents:null,feePaidCents:0,feePaidAt:null}));
  }else if(source.type==="doubles"){
    copy.doubles.teams=Array.from({length:count},(_,i)=>({
      id:nextId(),player1:players[i*2],player2:players[i*2+1],present:true,
      tier1:tier(source,i*2),tier2:tier(source,i*2+1),paid1:0,paid2:0
    }));
  }else{
    copy.opc.players=players.map((name,i)=>({
      id:nextId(),name,present:true,feeTierId:tier(source,i),paidCents:0
    }));
  }
  return copy;
}

export function randomDemoScore(t,random=Math.random){
  const winningSide=rand(random,2)+1;
  const rules=scoringRules(t);
  let high,low;
  if(rules.mode==="points"){
    high=rules.target+(rules.winByTwo?1:0);
    low=rules.winByTwo?rules.target-1:rand(random,rules.target);
  }else{
    low=rand(random,8);
    high=Math.min(99,low+1+rand(random,5));
  }
  return {score1:winningSide===1?high:low,score2:winningSide===2?high:low,winner:winningSide};
}

// Liefert einen Patch für einen einzigen atomaren Store-Write.
// Bereits entschiedene Partien bleiben unverändert. Vorhandene Auslosung nötig.
export function fillDemoResults(t,random=Math.random){
  if(!t?.demoMode)throw Error("Zufallsergebnisse sind nur in einer Demo-Kopie erlaubt.");
  let working=t,filled=0;
  if(t.type==="opc"){
    if(!t.opc.draw)throw Error("Bitte zuerst das K.-o.-Tableau auslosen.");
    for(let round=0;round<working.opc.draw.rounds.length;round++){
      for(let i=0;i<working.opc.draw.rounds[round].length;i++){
        const m=working.opc.draw.rounds[round][i];
        if(!m.left||!m.right||m.winner)continue;
        const updated=setOnePointWinner(working,round,i,rand(random,2)+1);
        working={...working,opc:{...working.opc,draw:updated}};
        filled++;
      }
    }
    return {patch:{opc:working.opc},filled};
  }
  if(t.type==="doubles"){
    if(!t.doubles.draw)throw Error("Bitte zuerst die Vorrunde auslosen.");
    if(t.doubles.playoffs){
      for(const stage of ["quarterfinals","semifinals","final","thirdPlace"]){
        const list=stage==="final"||stage==="thirdPlace"?[working.doubles.playoffs[stage]]:working.doubles.playoffs[stage];
        for(let i=0;i<list.length;i++){
          const m=stage==="final"||stage==="thirdPlace"?working.doubles.playoffs[stage]:working.doubles.playoffs[stage][i];
          if(!m?.team1||!m?.team2||m.result?.winner)continue;
          const updated=updateDoublesPlayoffResult(working,stage,i,randomDemoScore(t,random));
          working={...working,doubles:{...working.doubles,playoffs:updated}};
          filled++;
        }
      }
    }else{
      for(let round=0;round<working.doubles.draw.rounds.length;round++)
        for(let i=0;i<working.doubles.draw.rounds[round].matches.length;i++){
          if(working.doubles.draw.rounds[round].matches[i].result?.winner)continue;
          const updated=updateDoublesResult(working,round,i,randomDemoScore(t,random));
          working={...working,doubles:{...working.doubles,draw:updated}};
          filled++;
        }
    }
    return {patch:{doubles:working.doubles},filled};
  }
  if(!t.draw)throw Error("Bitte zuerst die Schleifchen-Vorrunde auslosen.");
  if(t.draw.finals){
    for(let stage=0;stage<working.draw.finals.rounds.length;stage++){
      for(let i=0;i<working.draw.finals.rounds[stage].matches.length;i++){
        const m=working.draw.finals.rounds[stage].matches[i];
        if(!m.team1||!m.team2||m.result?.winner)continue;
        const updated=updateRibbonFinalResult(working,stage,i,randomDemoScore(t,random));
        working={...working,draw:updated};filled++;
      }
    }
  }else{
    const roundCount=working.draw.rounds.length+(working.draw.specialRound?1:0);
    for(let round=0;round<roundCount;round++){
      const matches=round===working.draw.rounds.length?working.draw.specialRound.matches:working.draw.rounds[round].matches;
      for(let i=0;i<matches.length;i++){
        const m=round===working.draw.rounds.length?working.draw.specialRound.matches[i]:working.draw.rounds[round].matches[i];
        if(m.result?.winner)continue;
        const updated=updateRibbonMatchResult(working,round,i,randomDemoScore(t,random));
        working={...working,draw:updated};filled++;
      }
    }
  }
  return {patch:{draw:working.draw},filled};
}
