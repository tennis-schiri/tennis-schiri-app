import test from "node:test";
import assert from "node:assert/strict";
import {
  analyzeDoublesSetup, generateDoublesDraw, verifyDoublesDraw,
  normalizeDoublesResult, updateDoublesResult, doublesStandings, doublesPlayoffPreview,
  createDoublesPlayoffs, updateDoublesPlayoffResult, doublesPlayoffStatus,
  changeDoublesClock, doublesPlanRound
} from "../site/assets/doubles.js";
import {normalizeTournament,newTournament} from "../site/assets/storage.js";

const names=["Anna A","Berta B","Clara C","Dina D","Eva E","Fiona F","Gina G","Hanna H","Ines I","Jana J","Klara K","Lea L"];
const tournament=(count=8,games=4,courtCount=4)=>{
  const t=newTournament({type:"doubles",name:"Doppelturnier Test",rounds:games,
    startTime:"10:00",duration:20,breakMinutes:10,
    courts:Array.from({length:courtCount},(_,i)=>i+1)});
  t.doubles.teams=Array.from({length:count},(_,i)=>({
    id:"team-"+i,player1:"Spieler "+i+" A",player2:"Spieler "+i+" B",
    present:true,tier1:"standard",tier2:"standard",paid1:0,paid2:0
  }));
  return t;
};
const result=(s1,s2,winner)=>({score1:s1,score2:s2,winner});
const scoreAll=(t)=>{
  for(const [ri,r] of t.doubles.draw.rounds.entries()){
    for(const [mi] of r.matches.entries()){
      t.doubles.draw=updateDoublesResult(t,ri,mi,result(6,3,1));
    }
  }
  return t;
};

test("Doppelturnier ist eigene Turnierart und bleibt im Backup-Modell erhalten",()=>{
  const t=tournament();
  t.doubles.teams[0].paid1=500;
  const normalized=normalizeTournament({...t,doubles:{...t.doubles,draw:null}});
  assert.equal(normalized.type,"doubles");
  assert.equal(normalized.doubles.teams.length,8);
  assert.equal(normalized.doubles.teams[0].paid1,500);
  assert.equal(normalizeTournament({id:"old",name:"Alt",participants:[]}).type,"ribbon");
});

for(const [count,games,courts] of [[8,4,4],[6,5,2],[7,4,3],[9,6,1],[20,4,3],[5,2,2],[2,1,1],[8,7,8]]) {
  test("Auslosung "+count+" Teams · "+games+" Spiele/Team · "+courts+" Plätze",()=>{
    const t=tournament(count,games,courts);
    const draw=generateDoublesDraw(t,{seed:12345});
    assert.ok(verifyDoublesDraw(t,draw).ok);
    assert.equal(draw.rounds.flatMap(x=>x.matches).length,count*games/2);
    for(const team of t.doubles.teams){
      assert.equal(draw.rounds.flatMap(r=>r.matches).filter(m=>m.team1===team.id||m.team2===team.id).length,games);
    }
    assert.deepEqual(generateDoublesDraw(t,{seed:12345}).rounds,draw.rounds);
  });
}

test("Ungerade Teamzahl und ungerade Spielezahl ist unmöglich",()=>{
  const t=tournament(7,3,3);
  assert.equal(analyzeDoublesSetup(t).ok,false);
  assert.throws(()=>generateDoublesDraw(t),/ungerader Teamzahl/);
});

test("Zu wenige Gegner, doppelte Teamnamen, unvollständige Teams verhindern Auslosung",()=>{
  const t=tournament(4,4,2);
  assert.equal(analyzeDoublesSetup(t).ok,false);
  t.rounds=2;
  t.doubles.teams[0].player1=t.doubles.teams[1].player1;
  assert.match(analyzeDoublesSetup(t).errors.join(" "),/mehreren Teams/);
  t.doubles.teams[0].player1="andere Person";
  t.doubles.teams[0].player2="";
  assert.equal(analyzeDoublesSetup(t).ok,false);
});

test("Abwesende Teams spielen nicht; Änderungen nach Auslosung machen Plan prüfbar ungültig",()=>{
  const t=tournament(8,4,3);
  t.doubles.teams[0].present=false;
  t.doubles.teams[1].present=false;
  t.doubles.draw=generateDoublesDraw(t,{seed:42});
  assert.equal(t.doubles.draw.rounds.flatMap(r=>r.matches).some(m=>m.team1==="team-0"||m.team2==="team-0"),false);
  t.doubles.teams[0].present=true;
  assert.equal(verifyDoublesDraw(t).ok,false);
});

test("Sieger, Games und Entscheidungspunkte werden konsistent erfasst",()=>{
  assert.deepEqual(normalizeDoublesResult(result("6","3","1")),
    {score1:6,score2:3,points1:null,points2:null,winner:1});
  assert.deepEqual(normalizeDoublesResult({score1:5,score2:5,points1:7,points2:5,winner:1}),
    {score1:5,score2:5,points1:7,points2:5,winner:1});
  assert.throws(()=>normalizeDoublesResult(result(3,6,1)),/höheren Game/);
  assert.throws(()=>normalizeDoublesResult(result(5,5,1)),/Entscheidungspunkte/);
  assert.throws(()=>normalizeDoublesResult({score1:5,score2:5,points1:4,points2:5,winner:1}),/Entscheidungspunkten/);
  assert.equal(normalizeDoublesResult({winner:""}),null);
});

test("Ergebnisse und Rangliste: Siege → Game-Differenz → Games+",()=>{
  const t=tournament(8,4,4);
  t.doubles.draw=generateDoublesDraw(t,{seed:222});
  t.doubles.draw=updateDoublesResult(t,0,0,result(6,3,1));
  const standing=doublesStandings(t);
  assert.equal(standing.complete,1);
  assert.equal(standing.ranking[0].wins,1);
  assert.equal(standing.ranking[0].gameDiff,3);
  assert.equal(standing.ranking.at(-1).losses>0,true);
  t.doubles.draw=updateDoublesResult(t,0,0,{winner:""});
  assert.equal(doublesStandings(t).complete,0);
});

test("Play-offs erst nach vollständiger Vorrunde und mit acht zugelassenen Teams",()=>{
  const t=tournament(8,4,4);
  t.doubles.draw=generateDoublesDraw(t,{seed:89});
  assert.equal(doublesPlayoffPreview(t).ready,false);
  scoreAll(t);
  assert.equal(doublesPlayoffPreview(t).ready,true);
  t.doubles.playoffOptOut=["team-0"];
  assert.equal(doublesPlayoffPreview(t).ready,false);
  t.doubles.playoffOptOut=[];
  const p=createDoublesPlayoffs(t);
  assert.equal(p.quarterfinals.length,4);
  assert.equal(p.semifinals.length,2);
  assert.equal(p.seeds.length,8);
});

test("Play-offs leiten Sieger und Verlierer korrekt in Finale und Platz 3",()=>{
  const t=tournament();t.doubles.draw=generateDoublesDraw(t,{seed:54});scoreAll(t);
  t.doubles.playoffs=createDoublesPlayoffs(t);
  for(let i=0;i<4;i++)t.doubles.playoffs=updateDoublesPlayoffResult(t,"quarterfinals",i,result(6,3,1));
  assert.equal(t.doubles.playoffs.semifinals[0].team1,t.doubles.playoffs.quarterfinals[0].team1);
  for(let i=0;i<2;i++)t.doubles.playoffs=updateDoublesPlayoffResult(t,"semifinals",i,result(6,1,1));
  assert.ok(t.doubles.playoffs.final.team1&&t.doubles.playoffs.final.team2);
  assert.ok(t.doubles.playoffs.thirdPlace.team1&&t.doubles.playoffs.thirdPlace.team2);
  t.doubles.playoffs=updateDoublesPlayoffResult(t,"final",0,result(3,6,2));
  t.doubles.playoffs=updateDoublesPlayoffResult(t,"thirdPlace",0,result(6,4,1));
  assert.equal(doublesPlayoffStatus(t).done,true);
  const champion=t.doubles.playoffs.final.team2;
  assert.equal(doublesPlayoffStatus(t).champion,champion);
  t.doubles.playoffs=updateDoublesPlayoffResult(t,"quarterfinals",0,result(2,6,2));
  assert.equal(t.doubles.playoffs.semifinals[0].result,null);
  assert.equal(t.doubles.playoffs.final.result,null);
  assert.equal(t.doubles.playoffs.thirdPlace.result,null);
});

test("Vorrunden-Ergebnisse sind während Play-offs gesperrt",()=>{
  const t=tournament();t.doubles.draw=generateDoublesDraw(t,{seed:1});scoreAll(t);
  t.doubles.playoffs=createDoublesPlayoffs(t);
  assert.throws(()=>updateDoublesResult(t,0,0,result(6,0,1)),/Play-offs zurücknehmen/);
});

test("Rundenzeiten und Rundenuhr funktionieren bei mehr als 20 Blöcken",()=>{
  const t=tournament(9,6,1);t.doubles.draw=generateDoublesDraw(t,{seed:2});
  assert.ok(t.doubles.draw.rounds.length>20);
  assert.match(doublesPlanRound(t,30).start,/\d\d:\d\d/);
  const now=1_700_000_000_000;
  t.roundClocks=changeDoublesClock(t,22,"start",now);
  assert.equal(t.roundClocks["22"].startedAt,now);
  assert.throws(()=>changeDoublesClock(t,23,"start",now+1000),/andere Rundenuhr/);
  t.roundClocks=changeDoublesClock(t,22,"pause",now+5000);
  assert.equal(t.roundClocks["22"].elapsedMs,5000);
  t.roundClocks=changeDoublesClock(t,22,"resume",now+6000);
  t.roundClocks=changeDoublesClock(t,22,"finish",now+8000);
  assert.equal(t.roundClocks["22"].elapsedMs,7000);
  const restored=normalizeTournament(t);
  assert.equal(restored.roundClocks["22"].elapsedMs,7000);
});
