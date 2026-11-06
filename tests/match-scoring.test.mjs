import test from "node:test";
import assert from "node:assert/strict";
import {newTournament,normalizeTournament} from "../site/assets/storage.js";
import {scoringRules,normalizePointResult,hasRecordedResults,assertScoringChangeAllowed} from "../site/assets/match-scoring.js";
import {normalizeRibbonResult} from "../site/assets/results.js";
import {normalizeDoublesResult} from "../site/assets/doubles.js";

const points=(target=7,winByTwo=false,type="ribbon")=>({type,matchMode:"points",pointTarget:target,pointWinByTwo:winByTwo});

test("Alte Turniere bleiben zeitbasiert und vorhandene Games-Wertungen kompatibel",()=>{
  const t=normalizeTournament({name:"Vorhanden",type:"ribbon"});
  assert.equal(scoringRules(t).mode,"time");
  assert.equal(t.matchMode,"time");
  assert.equal(t.pointTarget,7);
  assert.deepEqual(normalizeRibbonResult({score1:"6",score2:"4",winner:"1"},t),
    {score1:6,score2:4,winner:1});
});
test("Punktmodus kann unabhängig von Turnierformat gespeichert und wiederhergestellt werden",()=>{
  const t=newTournament({...points(11,true,"doubles"),name:"Punktturnier"});
  const copy=normalizeTournament(JSON.parse(JSON.stringify(t)));
  assert.deepEqual(scoringRules(copy),{mode:"points",target:11,winByTwo:true,automaticWinner:true});
  assert.equal(copy.timeMode,"fixed");
});
test("One Point Cup hat immer einen Punkt und keine Zwei-Punkte-Regel",()=>{
  const t=normalizeTournament({...points(21,true,"opc"),timeMode:"fit"});
  assert.deepEqual(scoringRules(t),{mode:"points",target:1,winByTwo:false,automaticWinner:true});
});
test("Punktmatch ermittelt Sieger aus dem Zielstand",()=>{
  assert.deepEqual(normalizePointResult({score1:"7",score2:"5"},points()),{score1:7,score2:5,points1:null,points2:null,winner:1});
  assert.equal(normalizeRibbonResult({score1:"2",score2:"7"},points()).winner,2);
  assert.equal(normalizeDoublesResult({score1:"7",score2:"0"},points(7,false,"doubles")).winner,1);
});
test("Zwei-Punkte-Vorsprung verhindert falsches vorzeitiges Ergebnis",()=>{
  assert.throws(()=>normalizePointResult({score1:7,score2:6},points(7,true)),/zwei Punkten Vorsprung/);
  assert.equal(normalizePointResult({score1:8,score2:6},points(7,true)).winner,1);
  assert.equal(normalizePointResult({score1:9,score2:7},points(7,true)).winner,1);
  assert.throws(()=>normalizePointResult({score1:9,score2:6},points(7,true)),/zwei Punkten Vorsprung/);
});
test("Punktspiele dürfen nicht unentschieden oder vor Ziel beendet werden",()=>{
  assert.throws(()=>normalizePointResult({score1:6,score2:5},points()),/noch nicht erreicht/);
  assert.throws(()=>normalizePointResult({score1:7,score2:7},points()),/Sieger/);
  assert.throws(()=>normalizePointResult({score1:8,score2:6},points()),/genau 7/);
  assert.throws(()=>normalizePointResult({score1:7,score2:5,winner:2},points()),/stimmt nicht/);
  assert.throws(()=>normalizePointResult({score1:"7",score2:""},points()),/beide Teams/);
  assert.equal(normalizePointResult({score1:"",score2:"",winner:""},points()),null);
});
test("Punktziel 21 und lange Tie-Breaks sind technisch möglich",()=>{
  assert.equal(normalizePointResult({score1:21,score2:19},points(21,true)).winner,1);
  assert.equal(normalizePointResult({score1:100,score2:98},points(21,true)).winner,1);
  assert.throws(()=>normalizePointResult({score1:1000,score2:998},points(21,true)),/0 und 999/);
});
test("Bestehende gewertete Partien schützen Zählweise und Punktziel",()=>{
  const base={...points(),draw:{rounds:[{matches:[{result:{winner:1,score1:7,score2:5}}]}]}};
  assert.equal(hasRecordedResults(base),true);
  assert.throws(()=>assertScoringChangeAllowed(base,{...base,matchMode:"time"}),/zurücknehmen/);
  assert.throws(()=>assertScoringChangeAllowed(base,{...base,pointTarget:11}),/zurücknehmen/);
  assert.doesNotThrow(()=>assertScoringChangeAllowed(base,{...base,duration:30}));
  assert.doesNotThrow(()=>assertScoringChangeAllowed({...base,draw:null},{...base,matchMode:"time"}));
});
test("Auch Play-off-Ergebnisse sind geschützt",()=>{
  const base={...points(7,false,"doubles"),doubles:{playoffs:{final:{result:{winner:1,score1:7,score2:4}}}}};
  assert.equal(hasRecordedResults(base),true);
  assert.throws(()=>assertScoringChangeAllowed(base,{...base,pointWinByTwo:true}),/zurücknehmen/);
});
