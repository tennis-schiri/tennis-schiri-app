import test from "node:test";
import assert from "node:assert/strict";
import {newTournament,normalizeTournament} from "../site/assets/storage.js";
import {
  generateDoublesDraw,updateDoublesResult,doublesStandings,
  doublesPlayoffPreview,createDoublesPlayoffs,decideDoublesTie,drawDoublesTieOrder
} from "../site/assets/doubles.js";
import {makeDemoCopy} from "../site/assets/demo-data.js";
import {readFileSync} from "node:fs";

const fixture=(count,games,size)=>{
  const t=newTournament({type:"doubles",name:"Gleichstands-Test",rounds:games,
    playoffSize:size,courts:[1,2,3],duration:20,breakMinutes:5});
  t.doubles.teams=Array.from({length:count},(_,i)=>({
    id:String.fromCharCode(65+i),player1:"Vorname "+i+" A",player2:"Vorname "+i+" B",
    present:true,tier1:"standard",tier2:"standard",paid1:0,paid2:0
  }));
  t.doubles.draw=generateDoublesDraw(t,{seed:173});
  return t;
};
const complete=(t,scoreForMatch)=> {
  for(let ri=0;ri<t.doubles.draw.rounds.length;ri++)
    for(let mi=0;mi<t.doubles.draw.rounds[ri].matches.length;mi++){
      const m=t.doubles.draw.rounds[ri].matches[mi];
      t.doubles.draw=updateDoublesResult(t,ri,mi,scoreForMatch(m));
    }
};
const fakeCrypto={getRandomValues(target){target[0]=0;return target;}};

test("Direkter Vergleich entscheidet exakt gleiche Gesamtwertung ohne Los",()=>{
  const t=fixture(4,3,4);
  // A und B haben jeweils 2 Siege, 16 Games, +2 Differenz.
  // Der direkte Vergleich A gegen B ging an A.
  const results={
    "A-B":["A",4],"A-C":["C",4],"A-D":["A",4],
    "B-C":["B",4],"B-D":["B",4],"C-D":["C",0]
  };
  complete(t,m=>{
    const key=[m.team1,m.team2].sort().join("-");
    const [winningTeam,low]=results[key];
    assert.ok(winningTeam,"Unbekannte Begegnung "+key);
    return {score1:winningTeam===m.team1?6:low,
      score2:winningTeam===m.team2?6:low,winner:winningTeam===m.team1?1:2};
  });
  const info=doublesStandings(t);
  assert.equal(info.finished,true);
  const ab=info.tieGroups.find(g=>g.ids.join(",")==="A,B");
  assert.ok(ab);
  assert.equal(ab.method,"direct");
  assert.equal(ab.resolved,true);
  assert.deepEqual(ab.order,["A","B"]);
  assert.deepEqual(info.ranking.slice(0,3).map(x=>x.id),["C","A","B"]);
  assert.equal(doublesPlayoffPreview(t).ready,true);
  assert.throws(()=>decideDoublesTie(t,ab.ids,["B","A"],"manual"),/direkten Vergleich/);
});

test("Keine Begegnung: offene Top-2 blockieren Play-offs, Entscheidung wird gespeichert",()=>{
  const t=fixture(4,1,2);
  complete(t,()=>({score1:6,score2:3,winner:1}));
  let info=doublesStandings(t);
  const tied=info.tieGroups.find(g=>g.firstPlace===1);
  assert.ok(tied);
  assert.equal(tied.method,"pending");
  assert.equal(tied.resolved,false);
  assert.equal(doublesPlayoffPreview(t).ready,false);
  assert.equal(doublesPlayoffPreview(t).unresolvedTies.length,1);
  assert.throws(()=>createDoublesPlayoffs(t),/Gleichstand/);
  assert.throws(()=>decideDoublesTie(t,tied.ids,[tied.ids[0],tied.ids[0]],"manual"),/genau einmal/);
  assert.throws(()=>decideDoublesTie(t,tied.ids,["unknown",tied.ids[0]],"manual"),/genau einmal/);
  assert.throws(()=>decideDoublesTie(t,tied.ids,[...tied.ids],"not-allowed"),/Ungültiges Verfahren/);
  const chosen=[...tied.ids].reverse();
  t.doubles.tieBreaks=decideDoublesTie(t,tied.ids,chosen,"onsite");
  info=doublesStandings(t);
  assert.equal(info.tieGroups.find(g=>g.firstPlace===1).method,"onsite");
  assert.deepEqual(info.ranking.slice(0,2).map(x=>x.id),chosen);
  assert.equal(doublesPlayoffPreview(t).ready,true);
  const backup=normalizeTournament(t);
  assert.deepEqual(backup.doubles.tieBreaks,t.doubles.tieBreaks);
  assert.equal(backup.doubles.tieBreaks[0].method,"onsite");
  t.doubles.playoffs=createDoublesPlayoffs(backup);
  assert.deepEqual(t.doubles.playoffs.seeds,chosen);
  assert.throws(()=>decideDoublesTie(t,tied.ids,chosen,"manual"),/Play-offs zurücknehmen/);
});

test("Per Knopfdruck ausgeloster Rang ist gleichverteilt bestimmt und bleibt im Backup stabil",()=>{
  const t=fixture(4,1,2);
  complete(t,()=>({score1:6,score2:3,winner:1}));
  const info=doublesStandings(t);
  const tied=info.tieGroups.find(g=>g.firstPlace===1);
  const order=drawDoublesTieOrder(tied.ids,fakeCrypto);
  assert.deepEqual(order,[...tied.ids].reverse());
  assert.deepEqual(tied.ids,[...tied.ids].sort());
  t.doubles.tieBreaks=decideDoublesTie(t,tied.ids,order,"random");
  const saved=normalizeTournament(JSON.parse(JSON.stringify(t)));
  assert.equal(doublesStandings(saved).tieGroups.find(g=>g.firstPlace===1).method,"random");
  assert.deepEqual(doublesStandings(saved).ranking.slice(0,2).map(x=>x.id),order);
  assert.throws(()=>drawDoublesTieOrder(tied.ids,{}),/nicht verfügbar/);
  assert.throws(()=>drawDoublesTieOrder(["A","A"],fakeCrypto),/Ungültige/);
  const demo=makeDemoCopy(saved,4,{makeId:(()=>{let i=0;return ()=>"id"+(++i)})(),
    random:()=>0.3});
  assert.deepEqual(demo.doubles.tieBreaks,[]);
});

test("Nach Änderung der Vorrunde verliert die alte Entscheidung ihre Gültigkeit",()=>{
  const t=fixture(4,1,2);
  complete(t,()=>({score1:6,score2:3,winner:1}));
  const group=doublesStandings(t).tieGroups.find(x=>x.firstPlace===1);
  t.doubles.tieBreaks=decideDoublesTie(t,group.ids,[...group.ids].reverse(),"manual");
  assert.equal(doublesPlayoffPreview(t).ready,true);
  t.doubles.draw=updateDoublesResult(t,0,0,{score1:6,score2:4,winner:1});
  const next=doublesStandings(t);
  assert.equal(next.ranking[0].gameDiff,2);
  assert.ok(t.doubles.tieBreaks.length===1,"Altentscheid bleibt nachvollziehbar gespeichert");
  // Die geänderte Wertung gilt; eine alte Teamentscheidung wird nicht blind übernommen.
  assert.equal(next.ranking[0].id,t.doubles.draw.rounds[0].matches[0].team1);
});

test("Dreifacher Gleichstand ohne vollständigen direkten Vergleich braucht explizite Reihenfolge",()=>{
  const t=fixture(6,1,2);
  complete(t,()=>({score1:6,score2:3,winner:1}));
  const group=doublesStandings(t).tieGroups.find(x=>x.firstPlace===1);
  assert.equal(group.ids.length,3);
  assert.equal(group.resolved,false);
  assert.equal(doublesPlayoffPreview(t).ready,false);
  t.doubles.tieBreaks=decideDoublesTie(t,group.ids,["E","A","C"],"manual");
  assert.deepEqual(doublesStandings(t).ranking.slice(0,3).map(x=>x.id),["E","A","C"]);
  assert.equal(doublesPlayoffPreview(t).ready,true);
});

test("Doppel-UI nennt alle drei Entscheidungswege und schützt die Setzliste",()=>{
  const ui=readFileSync(new URL("../site/assets/doppel-ui.js",import.meta.url),"utf8");
  for(const s of ["tieBreakPanel","Gleichstände klären","Direkter Vergleich","Los vor Ort",
    "TENNILO losen","Reihenfolge festlegen","tie-decision","tieSignature","drawDoublesTieOrder"])
    assert.ok(ui.includes(s),s);
  assert.ok(ui.includes('!info.finished'));
});
