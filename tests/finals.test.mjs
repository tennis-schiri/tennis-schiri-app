import test from "node:test";
import assert from "node:assert/strict";
import { generateRibbonDraw } from "../site/assets/draw.js";
import { updateRibbonMatchResult, ribbonStandings } from "../site/assets/results.js";
import { generateRibbonSpecialRound } from "../site/assets/special.js";
import { ribbonFinalPreview, createRibbonFinals, updateRibbonFinalResult,
  verifyRibbonFinals, resetRibbonFinals } from "../site/assets/finals.js";

function tournament(strong=8,weak=8,target=4,courts=4,size=8){
  return {name:"Finals-Test",rounds:target,finalSize:size,finalOptOut:[],
    courts:Array.from({length:courts},(_,i)=>i+1),
    participants:[
      ...Array.from({length:strong},(_,i)=>({id:`s${i}`,name:`Stark ${i}`,group:"stark",present:true})),
      ...Array.from({length:weak},(_,i)=>({id:`w${i}`,name:`Schwächer ${i}`,group:"schwaecher",present:true}))
    ]};
}
function completed(s=8,w=8,target=4,courts=4,size=8){
  const t=tournament(s,w,target,courts,size);
  t.draw=generateRibbonDraw(t,{seed:28});
  for(let i=0;i<t.draw.rounds.length;i++)for(let j=0;j<t.draw.rounds[i].matches.length;j++){
    t.draw=updateRibbonMatchResult(t,i,j,{winner:(i+j)%2+1});
  }
  if(t.draw.special){
    t.draw=generateRibbonSpecialRound(t,{seed:19});
    for(let j=0;j<t.draw.specialRound.matches.length;j++)
      t.draw=updateRibbonMatchResult(t,t.draw.rounds.length,j,{winner:1});
  }
  return t;
}

test("Endrunde ist vor dem Ende der Vorrunden gesperrt",()=>{
  const t=tournament();
  t.draw=generateRibbonDraw(t,{seed:9});
  assert.equal(ribbonFinalPreview(t).ready,false);
  assert.throws(()=>createRibbonFinals(t),/Vorrunden-Ergebnisse/);
});

test("Acht Teilnehmer: zwei Halbfinale, ein Finale und feste Teams",()=>{
  const t=completed();
  const preview=ribbonFinalPreview(t);
  assert.equal(preview.eligible.length,8);
  t.draw=createRibbonFinals(t,{seed:110});
  assert.deepEqual(t.draw.finals.rounds.map(r=>r.id),["semi","final"]);
  assert.deepEqual(t.draw.finals.rounds.map(r=>r.matches.length),[2,1]);
  assert.equal(new Set(t.draw.finals.rounds[0].matches.flatMap(m=>[...m.team1,...m.team2])).size,8);
  assert.equal(verifyRibbonFinals(t).ok,true);
});

test("Sechzehn Teilnehmer: vier Viertelfinale, zwei Halbfinale, ein Finale",()=>{
  const t=completed(8,8,4,4,16);
  t.draw=createRibbonFinals(t,{seed:33});
  assert.deepEqual(t.draw.finals.rounds.map(r=>r.id),["quarter","semi","final"]);
  assert.deepEqual(t.draw.finals.rounds.map(r=>r.matches.length),[4,2,1]);
  assert.equal(verifyRibbonFinals(t).ok,true);
});

test("Gewinner rücken automatisch weiter bis zum Turniersieg",()=>{
  const t=completed(8,8,4,4,16);
  const initial=ribbonStandings(t).participants.map(p=>[p.id,p.ribbons,p.played]);
  t.draw=createRibbonFinals(t,{seed:15});
  assert.equal(t.draw.finals.rounds[1].matches[0].team1,null);
  for(let round=0;round<t.draw.finals.rounds.length;round++){
    for(let i=0;i<t.draw.finals.rounds[round].matches.length;i++)
      t.draw=updateRibbonFinalResult(t,round,i,{winner:(round+i)%2+1});
  }
  const status=verifyRibbonFinals(t);
  assert.equal(status.ok,true);
  assert.equal(status.complete,true);
  assert.equal(status.champion.length,2);
  assert.ok(status.champion.every(id=>t.draw.finals.selectedIds.includes(id)));
  assert.deepEqual(ribbonStandings(t).participants.map(p=>[p.id,p.ribbons,p.played]),initial);
});

test("Endrunde lässt nur vollständige Paarungen entscheiden",()=>{
  const t=completed();
  t.draw=createRibbonFinals(t);
  assert.throws(()=>updateRibbonFinalResult(t,1,0,{winner:1}),/vorherigen Begegnungen/);
  t.draw=updateRibbonFinalResult(t,0,0,{winner:1});
  assert.throws(()=>updateRibbonFinalResult(t,1,0,{winner:1}),/vorherigen Begegnungen/);
  t.draw=updateRibbonFinalResult(t,0,1,{winner:2});
  assert.ok(t.draw.finals.rounds[1].matches[0].team1);
  assert.ok(t.draw.finals.rounds[1].matches[0].team2);
});

test("Ein geänderter Halbfinal-Sieger setzt das bereits erfasste Finale zurück",()=>{
  const t=completed();
  t.draw=createRibbonFinals(t,{seed:29});
  t.draw=updateRibbonFinalResult(t,0,0,{winner:1});
  t.draw=updateRibbonFinalResult(t,0,1,{winner:1});
  t.draw=updateRibbonFinalResult(t,1,0,{winner:1});
  assert.equal(verifyRibbonFinals(t).complete,true);
  t.draw=updateRibbonFinalResult(t,0,0,{winner:2});
  assert.equal(t.draw.finals.rounds[1].matches[0].result,null);
  assert.equal(verifyRibbonFinals(t).complete,false);
});

test("Abwahl der Spitzenplatzierten führt zu automatischem Nachrücken",()=>{
  const t=completed(8,8,4,4,8);
  const base=ribbonFinalPreview(t);
  t.finalOptOut=[base.eligible[0].id];
  const newPreview=ribbonFinalPreview(t);
  assert.equal(newPreview.ready,true);
  assert.ok(!newPreview.eligible.some(p=>p.id===base.eligible[0].id));
  assert.equal(newPreview.eligible.at(-1).id,base.reserves[0].id);
  t.draw=createRibbonFinals(t,{seed:4});
  assert.equal(verifyRibbonFinals(t).ok,true);
});

test("Zu viele abgewählte Spieler verhindern die Auslosung",()=>{
  const t=completed(8,8,4,4,8);
  t.finalOptOut=t.participants.slice(0,9).map(p=>p.id);
  const preview=ribbonFinalPreview(t);
  assert.equal(preview.ready,false);
  assert.match(preview.reason,/fehlen/);
  assert.throws(()=>createRibbonFinals(t),/fehlen/);
});

test("Ungleiche Gruppen werden so weit möglich gemischt, Rest innerhalb derselben Gruppe",()=>{
  const t=completed(8,8,4,4,8);
  const selected=[...t.participants.filter(p=>p.group==="stark").slice(0,6),
    ...t.participants.filter(p=>p.group==="schwaecher").slice(0,2)];
  t.finalOptOut=t.participants.filter(p=>!selected.some(q=>q.id===p.id)).map(p=>p.id);
  t.draw=createRibbonFinals(t,{seed:2});
  const roster=new Map(t.participants.map(p=>[p.id,p.group]));
  const teams=t.draw.finals.rounds[0].matches.flatMap(m=>[m.team1,m.team2]);
  assert.equal(teams.filter(team=>roster.get(team[0])!==roster.get(team[1])).length,2);
  assert.equal(teams.filter(team=>roster.get(team[0])===roster.get(team[1])).length,2);
});

test("Zu wenige Plätze führen zu gekennzeichneten aufeinanderfolgenden Spielblöcken",()=>{
  const t=completed(8,8,4,1,16);
  t.draw=createRibbonFinals(t,{seed:5});
  assert.deepEqual(t.draw.finals.rounds[0].matches.map(m=>m.batch),[1,2,3,4]);
  assert.ok(t.draw.finals.rounds[0].matches.every(m=>m.court===1));
});

test("Endrundenergebnis kann korrigiert und zurückgesetzt werden",()=>{
  const t=completed();
  t.draw=createRibbonFinals(t);
  t.draw=updateRibbonFinalResult(t,0,0,{winner:1,score1:6,score2:2});
  t.draw=updateRibbonFinalResult(t,0,0,{winner:2,score1:3,score2:6});
  assert.equal(t.draw.finals.rounds[0].matches[0].result.winner,2);
  t.draw=updateRibbonFinalResult(t,0,0,{winner:"",score1:"",score2:""});
  assert.equal(t.draw.finals.rounds[0].matches[0].result,null);
});

test("Turnier kann seine Endrunde zurücknehmen, Vorrunden bleiben",()=>{
  const t=completed();
  const old=ribbonStandings(t).completeMatches;
  t.draw=createRibbonFinals(t);
  assert.throws(()=>updateRibbonMatchResult(t,0,0,{winner:1}),/Endrunde zurücknehmen/);
  t.draw=resetRibbonFinals(t);
  assert.equal(t.draw.finals,undefined);
  assert.equal(ribbonStandings(t).completeMatches,old);
  assert.doesNotThrow(()=>updateRibbonMatchResult(t,0,0,{winner:1}));
});

test("Manipulierte Teams und veränderte Vorrundenergebnisse werden erkannt",()=>{
  const t=completed();
  t.draw=createRibbonFinals(t);
  const tampered=JSON.parse(JSON.stringify(t));
  tampered.draw.finals.rounds[0].matches[0].team1[0]=tampered.draw.finals.rounds[0].matches[0].team2[0];
  assert.equal(verifyRibbonFinals(tampered).ok,false);
  const changed=JSON.parse(JSON.stringify(t));
  changed.draw.rounds[0].matches[0].result.winner=2;
  assert.equal(verifyRibbonFinals(changed).ok,false);
});

test("Endrunde bleibt nach JSON-Sicherung gültig",()=>{
  const t=completed();
  t.draw=createRibbonFinals(t,{seed:10});
  t.draw=updateRibbonFinalResult(t,0,0,{winner:1,score1:6,score2:4});
  const saved=JSON.parse(JSON.stringify(t));
  assert.equal(verifyRibbonFinals(saved).ok,true);
  assert.equal(saved.draw.finals.rounds[0].matches[0].result.winner,1);
});
