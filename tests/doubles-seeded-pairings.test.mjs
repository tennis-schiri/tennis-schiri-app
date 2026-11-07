import test from "node:test";
import assert from "node:assert/strict";
import {newTournament} from "../site/assets/storage.js";
import {doublesPlayoffSeeding} from "../site/assets/doubles.js";
import {readFileSync} from "node:fs";

const ranking=Array.from({length:20},(_,i)=>({id:"seed-"+(i+1),name:"Team "+(i+1)}));
const tour=(size,excluded=[])=>{
  const t=newTournament({type:"doubles",playoffSize:size,name:"Play-off-Setzliste"});
  t.doubles.playoffOptOut=excluded;
  return t;
};
for(const [size,expected] of [
  [2,["1–2"]],
  [4,["1–4","2–3"]],
  [8,["1–8","2–7","3–6","4–5"]],
  [16,["1–16","2–15","3–14","4–13","5–12","6–11","7–10","8–9"]]
]){
  test("Feste Setzliste Top "+size+" ist in Rangfolge und eindeutig markiert",()=>{
    const x=doublesPlayoffSeeding(tour(size),ranking);
    assert.equal(x.size,size);
    assert.deepEqual(x.pairs.map(p=>p.seedLabel),expected);
    assert.deepEqual(x.pairs.map(p=>p.number),Array.from({length:size/2},(_,i)=>i+1));
    assert.equal(new Set(x.pairs.map(p=>p.matchIndex)).size,size/2);
    assert.equal(x.byTeam.size,size);
    for(const pair of x.pairs) {
      assert.equal(x.byTeam.get(pair.team1).number,pair.number);
      assert.equal(x.byTeam.get(pair.team2).number,pair.number);
      assert.equal(x.seeds[pair.seed1-1],pair.team1);
      assert.equal(x.seeds[pair.seed2-1],pair.team2);
    }
    assert.equal(x.byTeam.has("seed-"+(size+1)),false);
  });
}
test("Abgewähltes Team 1 wird durch Platz 9 ersetzt, dann Platz 10; nach Rücknahme wieder Platz 1",()=>{
  const t=tour(8);
  let x=doublesPlayoffSeeding(t,ranking);
  assert.deepEqual(x.seeds,ranking.slice(0,8).map(row=>row.id));
  t.doubles.playoffOptOut.push("seed-1");
  x=doublesPlayoffSeeding(t,ranking);
  assert.equal(x.seeds.includes("seed-1"),false);
  assert.equal(x.seeds.at(-1),"seed-9");
  assert.equal(x.byTeam.get("seed-9").number,1);
  t.doubles.playoffOptOut.push("seed-9");
  x=doublesPlayoffSeeding(t,ranking);
  assert.equal(x.seeds.includes("seed-9"),false);
  assert.equal(x.seeds.at(-1),"seed-10");
  t.doubles.playoffOptOut=t.doubles.playoffOptOut.filter(id=>id!=="seed-1");
  x=doublesPlayoffSeeding(t,ranking);
  assert.deepEqual(x.seeds,ranking.slice(0,8).map(row=>row.id));
  assert.equal(x.byTeam.has("seed-10"),false);
});
test("Nach der Festlegung werden die Paarungen nicht durch neue Rangfolge überschrieben",()=>{
  const t=tour(4);
  const old=doublesPlayoffSeeding(t,ranking);
  t.doubles.playoffs={seeds:[...old.seeds]};
  const next=doublesPlayoffSeeding(t,[...ranking].reverse());
  assert.deepEqual(next.seeds,old.seeds);
  assert.deepEqual(next.pairs.map(p=>p.seedLabel),["1–4","2–3"]);
});
test("Admin hat farbige Paarungschips, kontrollierte Häkchen und kein Play-off-Auslosungswort",()=>{
  const ui=readFileSync(new URL("../site/assets/doppel-ui.js",import.meta.url),"utf8");
  const css=readFileSync(new URL("../site/assets/doppel.css",import.meta.url),"utf8");
  const live=readFileSync(new URL("../site/assets/live-ui.js",import.meta.url),"utf8");
  for(const marker of ["Play-off-Paarungen festlegen","double-po-pair-chip","double-po-choices",
    "seeding.byTeam.get","disabled","playoffOptOut","Nachrücker automatisch qualifiziert"])
    assert.ok(ui.includes(marker),marker);
  assert.doesNotMatch(ui,/Top ['"]?\+size\+['"]? auslosen/);
  for(let i=1;i<=8;i++)assert.ok(css.includes(".po-pair-"+i),i);
  assert.match(live,/pairLabel/);
  assert.match(live,/pairNumber/);
});
