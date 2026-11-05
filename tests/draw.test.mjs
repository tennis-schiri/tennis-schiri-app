import test from "node:test";
import assert from "node:assert/strict";
import { analyzeRibbonDraw, drawSignature, generateRibbonDraw, verifyRibbonDraw } from "../site/assets/draw.js";

function tournament(strong=8, weak=8, rounds=4, places=4) {
  return {
    name:"Automatischer Test", rounds,
    courts:Array.from({length:places},(_,i)=>i+1),
    participants:[
      ...Array.from({length:strong},(_,i)=>({id:`s-${i}`,name:`Stark ${i}`,group:"stark",present:true})),
      ...Array.from({length:weak},(_,i)=>({id:`w-${i}`,name:`Schwächer ${i}`,group:"schwaecher",present:true}))
    ]
  };
}

for(const [s,w,rounds,places] of [
  [8,8,4,4], [12,12,4,6], [5,5,4,3], [9,9,3,4],
  [6,5,4,3], [11,10,4,6], [8,7,3,4], [2,2,3,1],
  [13,13,4,7], [12,11,3,5], [4,4,4,1]
]) {
  test(`Auslosung: ${s} stark, ${w} schwächer, ${rounds} Spiele, ${places} Plätze`,()=>{
    const t=tournament(s,w,rounds,places);
    const spec=analyzeRibbonDraw(t);
    const draw=generateRibbonDraw(t,{seed:123456});
    const result=verifyRibbonDraw(t,draw);
    assert.equal(result.ok,true,result.errors.join("; "));
    assert.equal(draw.rounds.reduce((sum,round)=>sum+round.matches.length,0),spec.expectedNormalMatches);
    assert.equal(draw.special!==null,spec.special!==null);
    assert.ok(draw.rounds.length>0);
  });
}

test("Spielplan wird bei geänderter Teilnahme ungültig",()=>{
  const t=tournament();
  const draw=generateRibbonDraw(t,{seed:1});
  t.participants[0].present=false;
  assert.notEqual(drawSignature(t),draw.signature);
  assert.equal(verifyRibbonDraw(t,draw).ok,false);
});

test("Einzelner Platz ermöglicht mehrere nacheinander statt gleichzeitig",()=>{
  const t=tournament(4,4,4,1);
  const draw=generateRibbonDraw(t);
  assert.equal(draw.rounds.length,8);
  assert.ok(draw.rounds.every(r=>r.matches.length===1));
});

test("Für die Auffüllrunde bleiben die Spieler bewusst unbestimmt",()=>{
  const t=tournament(6,5,4,3);
  const draw=generateRibbonDraw(t,{seed:5});
  assert.equal(draw.special.fillerWeak,4);
  assert.equal(draw.special.fillerStrong,0);
  assert.equal(draw.status,"auffuellrunde_offen");
  assert.ok(draw.rounds.every(r=>r.matches.every(m=>m.slots.length===4)));
});

test("Nur drei oder vier Wertungsspiele sind aktuell zulässig",()=>{
  assert.throws(()=>analyzeRibbonDraw(tournament(8,8,2,4)),/3 oder 4/);
});

test("Mindestens zwei Personen in jeder Stärkegruppe",()=>{
  assert.throws(()=>analyzeRibbonDraw(tournament(1,8,4,4)),/mindestens zwei/);
});
