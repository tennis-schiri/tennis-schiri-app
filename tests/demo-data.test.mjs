import test from "node:test";
import assert from "node:assert/strict";
import {newTournament} from "../site/assets/storage.js";
import {makeDemoCopy,demoCountLimits,randomDemoScore,fillDemoResults} from "../site/assets/demo-data.js";
import {generateRibbonDraw,verifyRibbonDraw} from "../site/assets/draw.js";
import {ribbonStandings} from "../site/assets/results.js";
import {generateDoublesDraw,doublesStandings,createDoublesPlayoffs,doublesPlayoffStatus} from "../site/assets/doubles.js";
import {drawOnePointCup,onePointProgress} from "../site/assets/one-point.js";

const random=()=>0.48;
const makeId=(()=>{let i=0;return ()=>"demo-"+(++i)})();
test("Schleifchen: eigene Demo-Kopie mit balancierten Gruppen, keine Geldbuchungen",()=>{
  const original=newTournament({name:"Clubabend",rounds:4,courts:[1,2,3,4],feeCategories:[{id:"standard",name:"Standard",amountCents:500}]});
  const demo=newTournament(makeDemoCopy(original,16,{random,makeId}));
  assert.equal(original.participants.length,0);
  assert.notEqual(demo.id,original.id);
  assert.equal(demo.demoMode,true);
  assert.equal(demo.participants.filter(p=>p.group==="stark").length,8);
  assert.equal(demo.participants.filter(p=>p.group==="schwaecher").length,8);
  assert(demo.participants.every(p=>p.feePaidCents===0&&p.present));
  const draw=generateRibbonDraw(demo,{seed:51});
  const staged={...demo,draw};
  const {patch,filled}=fillDemoResults(staged,random);
  assert(filled>0);
  assert.equal(verifyRibbonDraw({...staged,...patch},patch.draw).ok,true);
  assert.equal(ribbonStandings({...staged,...patch}).pendingMatches,0);
  assert.equal(draw.rounds.flatMap(r=>r.matches).some(m=>m.result?.winner),false);
  assert.throws(()=>fillDemoResults({...staged,demoMode:false}),/Demo-Kopie/);
  assert.throws(()=>makeDemoCopy(original,15),/gerade Zahl/);
});
test("Doppel: passende Teams, gültige Punkte, Vorrunde und Play-offs",()=>{
  const source=newTournament({type:"doubles",name:"Doppel",rounds:4,courts:[1,2,3,4],matchMode:"points",pointTarget:7,pointWinByTwo:true});
  const demo=newTournament(makeDemoCopy(source,8,{random,makeId}));
  assert.equal(demo.doubles.teams.length,8);
  const draw=generateDoublesDraw(demo,{seed:37});
  let t={...demo,doubles:{...demo.doubles,draw}};
  const round=fillDemoResults(t,random);
  t={...t,...round.patch};
  assert.equal(doublesStandings(t).finished,true);
  assert(t.doubles.draw.rounds.flatMap(r=>r.matches).every(m=>m.result.score1===8&&m.result.score2===6||m.result.score2===8&&m.result.score1===6));
  t={...t,doubles:{...t.doubles,playoffs:createDoublesPlayoffs(t)}};
  const playoff=fillDemoResults(t,random);
  t={...t,...playoff.patch};
  assert.equal(playoff.filled,8);
  assert.equal(doublesPlayoffStatus(t).done,true);
  assert.equal(fillDemoResults(t,random).filled,0);
});
test("One Point Cup: Teilnehmerzahl zur Feldgröße, Freilose und alle Sieger",()=>{
  const source=newTournament({type:"opc",name:"OPC",opc:{fieldSize:16,players:[],draw:null}});
  const demo=newTournament(makeDemoCopy(source,12,{random,makeId}));
  assert.equal(demo.opc.players.length,12);
  assert.throws(()=>makeDemoCopy(source,8),/Bitte 9 bis 16/);
  const t={...demo,opc:{...demo.opc,draw:drawOnePointCup(demo,{seed:9})}};
  const {patch,filled}=fillDemoResults(t,random);
  assert.equal(filled,11);
  assert.equal(onePointProgress({...t,...patch}).finished,true);
  assert.equal(t.opc.draw.rounds.at(-1)[0].winner,null);
});
test("Zufalls-Punktresultat erfüllt das Zwei-Punkte-Vorsprung-Prinzip",()=>{
  const t=newTournament({type:"ribbon",matchMode:"points",pointTarget:99,pointWinByTwo:true});
  const v=randomDemoScore(t,random);
  assert.deepEqual([Math.max(v.score1,v.score2),Math.min(v.score1,v.score2)],[100,98]);
  assert.equal(demoCountLimits(newTournament({type:"opc",opc:{fieldSize:2}})).defaultCount,2);
});

test("Unspielbare Demofelder werden schon bei der Teilnehmergenerierung abgewiesen",()=>{
  const ribbon=newTournament({type:"ribbon",rounds:4,courts:[1]});
  assert.throws(()=>makeDemoCopy(ribbon,500),/mehr als 20 Runden/);
  const double=newTournament({type:"doubles",rounds:7,courts:[1,2]});
  assert.throws(()=>makeDemoCopy(double,9),/ungerader Teamzahl/);
});
