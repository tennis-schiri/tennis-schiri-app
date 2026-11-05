import test from "node:test";
import assert from "node:assert/strict";
import {newTournament,normalizeTournament} from "../site/assets/storage.js";
import {
  checkOnePointSetup,drawOnePointCup,checkOnePointDraw,setOnePointWinner,
  onePointProgress,onePointRoundName
} from "../site/assets/one-point.js";

function fixture(n=20,size=32){
  const t=newTournament({type:"opc",name:"One Point Cup"});
  t.opc.fieldSize=size;
  t.opc.players=Array.from({length:n},(_,i)=>({
    id:"p"+i,name:"Spieler "+i,present:true,feeTierId:"standard",paidCents:0
  }));
  return t;
}
function playAll(t){
  let turns=0;
  while(!onePointProgress(t).finished){
    const stage=onePointProgress(t).stages.find(s=>s.matches.some(m=>m.left&&m.right&&!m.winner));
    assert.ok(stage,"Jede unentschiedene Phase muss eine spielbare Partie besitzen.");
    const i=stage.matches.findIndex(m=>m.left&&m.right&&!m.winner);
    t.opc.draw=setOnePointWinner(t,stage.index,i,turns%2?2:1);
    turns++;
    assert.ok(turns<=63);
  }
  return turns;
}
test("One Point Cup ist ein unabhängiger Turniertyp mit 32er Standardfeld",()=>{
  const t=newTournament({type:"opc",name:"OPC"});
  assert.equal(t.type,"opc");
  assert.equal(t.opc.fieldSize,32);
  assert.equal(t.opc.players.length,0);
  assert.equal(normalizeTournament({name:"Alt"}).type,"ribbon");
});
for(const [n,size] of [[2,2],[3,4],[5,8],[9,16],[20,32],[33,64],[64,64]]){
  test("KO-Feld mit "+n+" Spielern / "+size+" Plätzen erzeugt genau "+(n-1)+" echte Duelle",()=>{
    const t=fixture(n,size);
    const draw=drawOnePointCup(t,{seed:19});
    assert.ok(checkOnePointDraw(t,draw).ok);
    assert.equal(draw.rounds.length,Math.log2(size));
    assert.deepEqual(drawOnePointCup(t,{seed:19}).rounds,draw.rounds);
    t.opc.draw=draw;
    assert.equal(playAll(t),n-1);
    assert.ok(onePointProgress(t).finished);
    assert.ok(onePointProgress(t).champion);
  });
}
test("Freilose werden nur in der ersten Runde automatisch vergeben",()=>{
  const t=fixture(5,8);
  t.opc.draw=drawOnePointCup(t,{seed:17});
  const first=t.opc.draw.rounds[0];
  assert.equal(first.filter(m=>m.bye).length,3);
  assert.ok(first.filter(m=>m.bye).every(m=>m.winner===m.left));
  assert.ok(t.opc.draw.rounds[1].some(m=>m.left&&!m.right&&!m.winner||
    m.right&&!m.left&&!m.winner));
  assert.ok(checkOnePointDraw(t).ok);
});
test("Änderung eines Siegers löscht abhängige Ergebnisse bei neuen Paarungen",()=>{
  const t=fixture(8,8);
  t.opc.draw=drawOnePointCup(t,{seed:41});
  playAll(t);
  const previous=t.opc.draw.rounds[0][0].winner;
  const swap=t.opc.draw.rounds[0][0].left===previous?2:1;
  t.opc.draw=setOnePointWinner(t,0,0,swap);
  assert.notEqual(t.opc.draw.rounds[0][0].winner,previous);
  assert.equal(t.opc.draw.rounds[1][0].winner,null);
  assert.equal(t.opc.draw.rounds[2][0].winner,null);
  assert.equal(onePointProgress(t).finished,false);
  assert.ok(checkOnePointDraw(t).ok);
});
test("Ausgelostes Tableau wird bei Änderungen an Anwesenden ungültig",()=>{
  const t=fixture(20,32);
  t.opc.draw=drawOnePointCup(t,{seed:4});
  t.opc.players[0].present=false;
  assert.equal(checkOnePointDraw(t).ok,false);
  assert.throws(()=>setOnePointWinner(t,0,0,1),/passt nicht mehr/);
});
test("Doppelte Spieler und zu große Feldgröße werden bei Auslosung blockiert",()=>{
  const t=fixture(10,32);
  assert.equal(checkOnePointSetup(t).ok,false);
  t.opc.fieldSize=16;
  t.opc.players[1].name=t.opc.players[0].name;
  assert.match(checkOnePointSetup(t).errors.join(" "),/Spielernamen/);
  assert.throws(()=>drawOnePointCup(t),/Spielernamen/);
});
test("Freilos- und noch unbesetzte Spiele dürfen nicht manuell entschieden werden",()=>{
  const t=fixture(5,8);
  t.opc.draw=drawOnePointCup(t,{seed:4});
  const byeIndex=t.opc.draw.rounds[0].findIndex(x=>x.bye);
  assert.throws(()=>setOnePointWinner(t,0,byeIndex,2),/Freilos/);
  const blocked=t.opc.draw.rounds[1].findIndex(m=>!m.left||!m.right);
  assert.ok(blocked>=0);
  assert.throws(()=>setOnePointWinner(t,1,blocked,1),/noch nicht vollständig/);
});
test("Ein Punkt reicht zum Gewinnen; keine Game-Werte im Match nötig",()=>{
  const t=fixture(8,8);
  t.opc.draw=drawOnePointCup(t,{seed:9});
  t.opc.draw=setOnePointWinner(t,0,0,1);
  assert.equal(t.opc.draw.rounds[0][0].winner,t.opc.draw.rounds[0][0].left);
  assert.equal(t.opc.draw.rounds[0][0].score1,undefined);
  assert.equal(onePointProgress(t).current,0);
});
test("JSON-Wiederherstellung bewahrt Feldgröße, Teilnehmer und alle Sieger",()=>{
  const t=fixture(20,32);
  t.opc.players[0].paidCents=350;
  t.opc.draw=drawOnePointCup(t,{seed:88});
  t.opc.draw=setOnePointWinner(t,0,0,1);
  const copy=normalizeTournament(JSON.parse(JSON.stringify(t)));
  assert.equal(copy.type,"opc");
  assert.equal(copy.opc.fieldSize,32);
  assert.equal(copy.opc.players[0].paidCents,350);
  assert.ok(checkOnePointDraw(copy).ok);
  assert.equal(copy.opc.draw.rounds[0][0].winner,t.opc.draw.rounds[0][0].winner);
});
test("Deutsche K.-o.-Rundenbezeichnungen werden sinnvoll gewählt",()=>{
  assert.equal(onePointRoundName(32,0),"Sechzehntelfinale");
  assert.equal(onePointRoundName(32,1),"Achtelfinale");
  assert.equal(onePointRoundName(32,2),"Viertelfinale");
  assert.equal(onePointRoundName(32,3),"Halbfinale");
  assert.equal(onePointRoundName(32,4),"Finale");
});
