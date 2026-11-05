import test from "node:test";
import assert from "node:assert/strict";
import { analyzeRibbonDraw, generateRibbonDraw, verifyRibbonDraw } from "../site/assets/draw.js";
import { generateRibbonSpecialRound, resetRibbonSpecialRound } from "../site/assets/special.js";
import { ribbonStandings, updateRibbonMatchResult } from "../site/assets/results.js";

function fixture(strong=5,weak=5,target=3,courts=3){
  return {rounds:target,courts:Array.from({length:courts},(_,i)=>i+1),participants:[
    ...Array.from({length:strong},(_,i)=>({id:`s${i}`,name:`Stark ${i}`,present:true,group:"stark"})),
    ...Array.from({length:weak},(_,i)=>({id:`w${i}`,name:`Schwächer ${i}`,present:true,group:"schwaecher"}))
  ]};
}
function withNormals(strong=5,weak=5,target=3,courts=3){
  const t=fixture(strong,weak,target,courts);
  t.draw=generateRibbonDraw(t,{seed:17});
  return t;
}
function withResults(strong=5,weak=5,target=3,courts=3){
  const t=withNormals(strong,weak,target,courts);
  for(let round=0;round<t.draw.rounds.length;round++){
    for(let match=0;match<t.draw.rounds[round].matches.length;match++){
      t.draw=updateRibbonMatchResult(t,round,match,{winner:(round+match)%2?1:2});
    }
  }
  return t;
}

test("Auffüllrunde erst nach allen normalen Ergebnissen",()=>{
  const t=withNormals();
  assert.ok(analyzeRibbonDraw(t).special);
  assert.throws(()=>generateRibbonSpecialRound(t),/alle normalen Ergebnisse/);
  t.draw=updateRibbonMatchResult(t,0,0,{winner:1});
  assert.throws(()=>generateRibbonSpecialRound(t),/alle normalen Ergebnisse/);
});

test("Eine gerade besetzte 4er-Gruppe braucht keine Auffüllrunde",()=>{
  const t=withNormals(8,8,4,4);
  assert.equal(analyzeRibbonDraw(t).special,null);
  assert.throws(()=>generateRibbonSpecialRound(t),/keine Auffüllrunde erforderlich/);
});

test("Auffüllrunde auslosen: pro Team 1 Stark und 1 Schwächer, niemand doppelt",()=>{
  const t=withResults();
  t.draw=generateRibbonSpecialRound(t,{seed:42});
  assert.equal(verifyRibbonDraw(t,t.draw).ok,true);
  assert.equal(t.draw.specialRound.number,t.draw.rounds.length+1);
  assert.equal(t.draw.specialRound.matches.length,1);
  const m=t.draw.specialRound.matches[0];
  assert.equal(new Set(m.slots).size,4);
  assert.equal(t.participants.find(p=>p.id===m.slots[0]).group,"stark");
  assert.equal(t.participants.find(p=>p.id===m.slots[1]).group,"schwaecher");
  assert.equal(t.participants.find(p=>p.id===m.slots[2]).group,"stark");
  assert.equal(t.participants.find(p=>p.id===m.slots[3]).group,"schwaecher");
});

test("Auffüller haben volle reguläre Quote und höchstens ein Schleifchen",()=>{
  const t=withResults();
  const before=ribbonStandings(t);
  t.draw=generateRibbonSpecialRound(t,{seed:42});
  const spec=analyzeRibbonDraw(t).special;
  const special=t.draw.specialRound;
  assert.equal(special.matches.reduce((n,m)=>n+m.fillerMask.filter(Boolean).length,0),spec.fillerStrong+spec.fillerWeak);
  for(const m of special.matches)for(let i=0;i<4;i++){
    const p=before.participants.find(p=>p.id===m.slots[i]);
    assert.ok(p);
    if(m.fillerMask[i]){assert.equal(p.played,t.rounds);assert.ok(p.ribbons<=1);}
    else assert.equal(p.played,t.rounds-1);
  }
});

test("Nach Abschluss erhalten nur reguläre Spieler Wertung, Auffüller bleiben unverändert",()=>{
  const t=withResults();
  t.draw=generateRibbonSpecialRound(t,{seed:12});
  const before=ribbonStandings(t);
  const snapshot=new Map(before.participants.map(p=>[p.id,p]));
  const match=t.draw.specialRound.matches[0];
  const round=t.draw.rounds.length;
  t.draw=updateRibbonMatchResult(t,round,0,{score1:6,score2:1,winner:1});
  const after=ribbonStandings(t);
  assert.equal(after.specialProgress.complete,true);
  assert.equal(after.finished,true);
  for(let i=0;i<4;i++){
    const p=after.participants.find(p=>p.id===match.slots[i]);
    const old=snapshot.get(p.id);
    if(match.fillerMask[i]) {
      assert.equal(p.played,old.played);
      assert.equal(p.ribbons,old.ribbons);
      assert.equal(p.losses,old.losses);
    }else{
      assert.equal(p.played,old.played+1);
      assert.equal(p.ribbons,old.ribbons+(i<2?1:0));
      assert.equal(p.losses,old.losses+(i>=2?1:0));
    }
  }
});

test("Ausgeloste Auffüllrunde sperrt normale Ergebnisse; Zusatz-Ergebnis bleibt editierbar",()=>{
  const t=withResults();
  t.draw=generateRibbonSpecialRound(t);
  assert.throws(()=>updateRibbonMatchResult(t,0,0,{winner:2}),/Auffüllrunde zurücknehmen/);
  const index=t.draw.rounds.length;
  t.draw=updateRibbonMatchResult(t,index,0,{winner:1});
  t.draw=updateRibbonMatchResult(t,index,0,{winner:2});
  assert.equal(t.draw.specialRound.matches[0].result.winner,2);
});

test("Nach dem Zurücknehmen bleiben alle normalen Ergebnisse erhalten",()=>{
  const t=withResults();
  const before=ribbonStandings(t);
  t.draw=generateRibbonSpecialRound(t);
  t.draw=updateRibbonMatchResult(t,t.draw.rounds.length,0,{winner:1});
  t.draw=resetRibbonSpecialRound(t);
  assert.equal(t.draw.specialRound,undefined);
  assert.equal(verifyRibbonDraw(t,t.draw).ok,true);
  assert.equal(ribbonStandings(t).completeMatches,before.completeMatches);
  assert.equal(ribbonStandings(t).specialProgress,null);
  t.draw=updateRibbonMatchResult(t,0,0,{winner:2});
  assert.equal(ribbonStandings(t).complete,true);
});

test("JSON-Sicherung erhält maskierte Auffüller und Ergebnis",()=>{
  const t=withResults();
  t.draw=generateRibbonSpecialRound(t);
  t.draw=updateRibbonMatchResult(t,t.draw.rounds.length,0,{winner:1,score1:6,score2:4});
  const saved=JSON.parse(JSON.stringify(t));
  assert.equal(verifyRibbonDraw(saved,saved.draw).ok,true);
  assert.deepEqual(saved.draw.specialRound.matches[0].result,{score1:6,score2:4,winner:1});
  assert.ok(saved.draw.specialRound.matches[0].fillerMask.some(Boolean));
});

test("Änderungen regulärer Resultate machen gespeicherte Auffüllrunde ungültig",()=>{
  const t=withResults();
  t.draw=generateRibbonSpecialRound(t);
  const first=t.draw.rounds[0].matches[0];
  first.result={...first.result,winner:first.result.winner===1?2:1};
  assert.equal(verifyRibbonDraw(t,t.draw).ok,false);
  assert.throws(()=>ribbonStandings(t),/Vorrundenergebnisse/);
});

test("Manipulierte Besetzung und falsche Auffüller-Markierungen werden abgewiesen",()=>{
  const t=withResults();
  t.draw=generateRibbonSpecialRound(t);
  const invalid=JSON.parse(JSON.stringify(t.draw));
  invalid.specialRound.matches[0].slots[0]=invalid.specialRound.matches[0].slots[1];
  assert.equal(verifyRibbonDraw(t,invalid).ok,false);
  const wrongMask=JSON.parse(JSON.stringify(t.draw));
  wrongMask.specialRound.matches[0].fillerMask=[false,false,false,false];
  assert.equal(verifyRibbonDraw(t,wrongMask).ok,false);
});

test("Zu wenige 0/1-Schleifchen-Spieler führen zu nachvollziehbarer Fehlermeldung",()=>{
  const t=withResults(6,5,4,3);
  const standing=ribbonStandings(t);
  assert.equal(standing.special.fillerWeak,4);
  assert.ok(standing.eligible.weak.length<standing.special.fillerWeak);
  assert.throws(()=>generateRibbonSpecialRound(t),/Nicht genügend schwächere Auffüllspieler/);
  assert.equal(t.draw.specialRound,undefined);
});

test("Weitere Auffüllrunde bei identischem Ergebnisstand ist reproduzierbar",()=>{
  const t=withResults(7,7,3,4);
  const a=generateRibbonSpecialRound(t,{seed:136});
  const b=generateRibbonSpecialRound(t,{seed:136});
  assert.deepEqual(a.specialRound.matches,b.specialRound.matches);
  assert.equal(verifyRibbonDraw(t,a).ok,true);
});
