import test from "node:test";
import assert from "node:assert/strict";
import { generateRibbonDraw } from "../site/assets/draw.js";
import { normalizeRibbonResult, ribbonStandings, updateRibbonMatchResult } from "../site/assets/results.js";

function fixture(s=8,w=8,rounds=4,courts=4){
  return {name:"Test",rounds,courts:Array.from({length:courts},(_,i)=>i+1),
    participants:[
      ...Array.from({length:s},(_,i)=>({id:`s${i}`,name:`Stark ${i}`,group:"stark",present:true})),
      ...Array.from({length:w},(_,i)=>({id:`w${i}`,name:`Schwächer ${i}`,group:"schwaecher",present:true}))
    ]};
}
function drawn(s=8,w=8,r=4,c=4){
  const t=fixture(s,w,r,c);t.draw=generateRibbonDraw(t,{seed:17});return t;
}

test("Leere Ergebnisse sind erlaubt",()=>{
  assert.deepEqual(normalizeRibbonResult(null),{score1:null,score2:null,winner:null});
});

test("Siegerteam wird ausdrücklich erfasst, Game-Zahlen sind optional",()=>{
  assert.deepEqual(normalizeRibbonResult({winner:"1",score1:"",score2:""}),{score1:null,score2:null,winner:1});
  assert.deepEqual(normalizeRibbonResult({winner:"2",score1:"2",score2:"6"}),{score1:2,score2:6,winner:2});
});

test("Gleicher Game-Stand benötigt eine gesonderte Siegerentscheidung",()=>{
  assert.deepEqual(normalizeRibbonResult({winner:"1",score1:"4",score2:"4"}),{score1:4,score2:4,winner:1});
  assert.throws(()=>normalizeRibbonResult({winner:"",score1:"4",score2:"4"}),/Siegerteam/);
});

test("Unpassende Siege, unvollständige oder negative Game-Zahlen abweisen",()=>{
  assert.throws(()=>normalizeRibbonResult({winner:"2",score1:"6",score2:"4"}),/passt nicht/);
  assert.throws(()=>normalizeRibbonResult({winner:"2",score1:"6",score2:""}),/beide/);
  assert.throws(()=>normalizeRibbonResult({winner:"1",score1:"-1",score2:"2"}),/Game-Zahlen/);
  assert.throws(()=>normalizeRibbonResult({winner:"1",score1:"1.5",score2:"2"}),/Game-Zahlen/);
  assert.throws(()=>normalizeRibbonResult({winner:"1",score1:"100",score2:"2"}),/99/);
});

test("Ein Sieg vergibt genau ein Schleifchen an beide Sieger",()=>{
  let t=drawn();
  const m=t.draw.rounds[0].matches[0];
  t.draw=updateRibbonMatchResult(t,0,0,{winner:"1",score1:"6",score2:"2"});
  const a=ribbonStandings(t);
  assert.equal(a.completeMatches,1);
  assert.equal(a.pendingMatches,a.totalMatches-1);
  for(const id of m.slots.slice(0,2)){
    const p=a.participants.find(p=>p.id===id);assert.equal(p.ribbons,1);assert.equal(p.played,1);assert.equal(p.losses,0);
  }
  for(const id of m.slots.slice(2)){
    const p=a.participants.find(p=>p.id===id);assert.equal(p.ribbons,0);assert.equal(p.played,1);assert.equal(p.losses,1);
  }
});

test("Ergebnisse können geändert und gelöscht werden, ohne andere Matches anzutasten",()=>{
  let t=drawn(); const other=t.draw.rounds[0].matches[1];
  t.draw=updateRibbonMatchResult(t,0,0,{winner:"1",score1:"",score2:""});
  t.draw=updateRibbonMatchResult(t,0,1,{winner:"2",score1:"",score2:""});
  assert.equal(ribbonStandings(t).completeMatches,2);
  t.draw=updateRibbonMatchResult(t,0,0,{winner:"2",score1:"",score2:""});
  assert.equal(ribbonStandings(t).completeMatches,2);
  t.draw=updateRibbonMatchResult(t,0,0,{winner:"",score1:"",score2:""});
  assert.equal(ribbonStandings(t).completeMatches,1);
  assert.equal(t.draw.rounds[0].matches[1].result.winner,2);
  assert.equal(other.result,undefined);
});

test("Unveränderte Spiele und Ergebnisse bleiben in JSON-Sicherung erhalten",()=>{
  let t=drawn();
  t.draw=updateRibbonMatchResult(t,0,0,{winner:"2",score1:"0",score2:"5"});
  const copy=JSON.parse(JSON.stringify(t));
  assert.equal(ribbonStandings(copy).completeMatches,1);
  assert.deepEqual(copy.draw.rounds[0].matches[0].result,{score1:0,score2:5,winner:2});
});

test("Veraltete Auslosungen erlauben keine Ergebnisänderung",()=>{
  const t=drawn();
  t.participants[0].present=false;
  assert.throws(()=>updateRibbonMatchResult(t,0,0,{winner:"1"}),/Teilnehmer/);
  assert.throws(()=>ribbonStandings(t),/Teilnehmer/);
});

test("Ungültige Runde und Begegnung werden abgewehrt",()=>{
  const t=drawn();
  assert.throws(()=>updateRibbonMatchResult(t,900,0,{winner:"1"}),/Begegnung/);
  assert.throws(()=>updateRibbonMatchResult(t,0,-1,{winner:"1"}),/Ungültige/);
});

test("Füllrunde wird nicht ohne alle regulären Ergebnisse als bereit markiert",()=>{
  const t=drawn(9,9,3,4);
  assert.ok(t.draw.special);
  const s=ribbonStandings(t);
  assert.equal(s.complete,false);
  assert.equal(s.fillerReady,false);
  assert.deepEqual(s.eligible.strong,[]);
});

test("Nach allen regulären Ergebnissen sind Gruppenauswahl und Schleifen verfügbar",()=>{
  const t=drawn(9,9,3,4);
  for(let r=0;r<t.draw.rounds.length;r++){
    for(let m=0;m<t.draw.rounds[r].matches.length;m++){
      t.draw=updateRibbonMatchResult(t,r,m,{winner:r%2?2:1});
    }
  }
  const s=ribbonStandings(t);
  assert.equal(s.complete,true);
  assert.equal(s.completeMatches,s.totalMatches);
  assert.equal(s.participants.reduce((n,p)=>n+p.ribbons,0),s.totalMatches*2);
  assert.ok(s.eligible.strong.every(p=>p.ribbons<=1&&p.played===p.target));
  assert.ok(s.eligible.weak.every(p=>p.ribbons<=1&&p.played===p.target));
});
