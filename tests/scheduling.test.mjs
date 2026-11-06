import test from "node:test";
import assert from "node:assert/strict";
import {newTournament,normalizeTournament} from "../site/assets/storage.js";
import {
  timeWindow,tournamentSchedule,plannedRound,clockFor,changeRoundClock
} from "../site/assets/operations.js";
import {
  analyzeDoublesSetup,doublesMatchOptions,generateDoublesDraw,
  doublesPlanRound,changeDoublesClock
} from "../site/assets/doubles.js";
import {onePointTimePlan} from "../site/assets/one-point.js";

function doubles(teams=8,games=4,courts=4,extra={}){
  const t=newTournament({type:"doubles",name:"D",rounds:games,startTime:"10:00",
    duration:20,breakMinutes:5,courts:Array.from({length:courts},(_,i)=>i+1),...extra});
  t.doubles.teams=Array.from({length:teams},(_,i)=>({
    id:"team-"+i,player1:"A"+i,player2:"B"+i,present:true
  }));
  return t;
}
function cup(players=16,size=16,courts=2,extra={}){
  const t=newTournament({type:"opc",name:"Cup",startTime:"10:00",
    courts:Array.from({length:courts},(_,i)=>i+1),...extra});
  t.opc={...t.opc,fieldSize:size,players:Array.from({length:players},(_,i)=>({
    id:"p"+i,name:"Person "+i,present:true
  }))};
  return t;
}
test("Alte Turniere behalten feste Spielzeiten und haben keine automatische Endzeit",()=>{
  const old=normalizeTournament({name:"Alt",startTime:"10:00",
    draw:{signature:"old",rounds:[{matches:[]},{matches:[]}]},duration:20,breakMinutes:10});
  assert.equal(old.endTime,null);
  assert.equal(old.timeMode,"fixed");
  assert.deepEqual(
    {start:plannedRound(old,1).start,end:plannedRound(old,1).end,
      pauseEnd:plannedRound(old,1).pauseEnd},
    {start:"10:30",end:"10:50",pauseEnd:"11:00"});
});
test("Optionales Enddatum akzeptiert eine Nachtüberschreitung, aber keine Nullzeit",()=>{
  assert.deepEqual(timeWindow({startTime:"23:30",endTime:"00:45"}),{
    start:1410,end:45,minutes:75,overnight:true
  });
  assert.throws(()=>timeWindow({startTime:"12:00",endTime:"12:00"}),/identisch/);
  assert.throws(()=>timeWindow({startTime:"12:99",endTime:"13:00"}),/gültige Uhrzeit/);
});
test("Fixer Modus zeigt Überschreitungen an und ändert keine Spiele",()=>{
  const t=doubles(8,4,4,{endTime:"11:00",timeMode:"fixed"});
  t.doubles.draw=generateDoublesDraw(t,{seed:8});
  const plan=tournamentSchedule(t);
  assert.equal(plan.mode,"fixed");
  assert.equal(plan.overTarget,true);
  assert.equal(plan.rounds[0].duration,20);
  assert.equal(plan.rounds[0].start,"10:00");
});
test("Doppelturnier mit acht Teams und fünf Spielen passt inklusive Play-offs in die Endzeit",()=>{
  const t=doubles(8,5,4,{endTime:"14:00",timeMode:"fit",reservePlayoffs:true});
  const opts=doublesMatchOptions(t,{seed:8});
  assert.equal(opts.find(x=>x.games===4).possible,true);
  assert.equal(opts.find(x=>x.games===5).possible,true);
  assert.equal(opts.find(x=>x.games===8).possible,false);
  t.doubles.draw=generateDoublesDraw(t,{seed:8});
  const plan=tournamentSchedule(t);
  assert.equal(plan.end,"14:00");
  assert.equal(plan.usesFullWindow,true);
  assert.equal(plan.blocks,t.doubles.draw.rounds.length+3);
  assert.ok(plan.rounds.every(r=>r.duration>=10&&r.duration<=120));
  assert.equal(doublesPlanRound(t,0).duration,plan.rounds[0].duration);
});
test("Ungrade Teamzahl: vier Matches möglich, fünf mathematisch unmöglich",()=>{
  const t=doubles(7,4,3,{endTime:"14:00",timeMode:"fit"});
  const options=doublesMatchOptions(t);
  assert.equal(options.find(x=>x.games===4).possible,true);
  assert.equal(options.find(x=>x.games===5).possible,false);
  assert.match(options.find(x=>x.games===5).reason,/ungerader Teamzahl/);
});
test("Wenige Plätze erhöhen den tatsächlichen Zeitbedarf, statt Matches zu verlieren",()=>{
  const t=doubles(8,5,1,{endTime:"14:00",timeMode:"fit"});
  const options=doublesMatchOptions(t);
  const x=options.find(x=>x.games===5);
  assert.equal(x.possible,false);
  assert.match(x.reason,/Endzeit ist zu knapp/);
  const tt=doubles(8,5,4,{endTime:"14:00",timeMode:"fit"});
  assert.ok(doublesMatchOptions(tt).find(x=>x.games===5).possible);
});
test("Änderung auf unpassende Endzeit wird als Fehler zurückgegeben",()=>{
  const t=doubles(8,5,4,{endTime:"11:00",timeMode:"fit",reservePlayoffs:true});
  t.doubles.draw=generateDoublesDraw(t,{seed:8});
  assert.throws(()=>tournamentSchedule(t),/Endzeit ist zu knapp/);
});
test("Minuten werden genau verteilt; Countdown nutzt die geplante Dauer",()=>{
  const t=doubles(8,5,4,{endTime:"14:00",timeMode:"fit",reservePlayoffs:true});
  t.doubles.draw=generateDoublesDraw(t,{seed:8});
  const plan=tournamentSchedule(t);
  const clock=changeDoublesClock(t,0,"start",1000000)["0"];
  assert.equal(clock.durationMs,plan.rounds[0].duration*60000);
  t.roundClocks={"0":clock};
  assert.equal(clockFor(t,0,1000000).durationMs,clock.durationMs);
  assert.equal(clockFor(t,0,1000000).display,String(plan.rounds[0].duration).padStart(2,"0")+":00");
});
test("Schleifchen richtet Runden inklusive optional reservierter Endrunde aus",()=>{
  const t=newTournament({name:"Schleifchen",startTime:"10:00",endTime:"11:10",
    timeMode:"fit",duration:20,breakMinutes:5,rounds:3,courts:[1,2,3,4]});
  t.draw={signature:"test",rounds:[{matches:[]},{matches:[]},{matches:[]}]};
  const plan=tournamentSchedule(t);
  assert.equal(plan.end,"11:10");
  assert.deepEqual(plan.rounds.map(x=>x.duration),[20,20,20]);
  t.reserveFinals=true;
  assert.equal(tournamentSchedule(t).blocks,5);
  assert.equal(tournamentSchedule(t).end,"11:10");
});
test("Die Rundenuhr eines Schleifchenturniers übernimmt die automatisch verteilten Minuten",()=>{
  const t=newTournament({name:"Schleifchen",startTime:"10:00",endTime:"11:10",
    timeMode:"fit",duration:20,breakMinutes:5,courts:[1,2,3,4]});
  t.draw={signature:"test",rounds:[{matches:[]},{matches:[]},{matches:[]}]};
  const clocks=changeRoundClock(t,0,"start",1000000);
  assert.equal(clocks["0"].durationMs,plannedRound(t,0).duration*60000);
});
test("One Point Cup berücksichtigt tatsächliche Matchzahl und parallel nutzbare Plätze",()=>{
  const t=cup(16,16,2,{endTime:"11:00",timeMode:"fit",opcMinutes:3});
  const plan=onePointTimePlan(t);
  assert.equal(plan.blocks,8);
  assert.equal(plan.end,"11:00");
  assert.equal(plan.stages.length,4);
  assert.equal(plan.stages[0].matches,8);
  assert.equal(plan.stages.at(-1).matches,1);
  assert.equal(plan.stages.at(-1).end,"11:00");
});
test("One Point Cup mit 20 Spielern im 32er-Feld zählt Freilose nicht als Match",()=>{
  const t=cup(20,32,2,{opcMinutes:3});
  const plan=onePointTimePlan(t);
  assert.equal(plan.stages[0].matches,4);
  assert.equal(plan.stages.reduce((sum,s)=>sum+s.matches,0),19);
  assert.equal(plan.blocks,11);
});
test("One Point Cup lehnt unrealistische Punktdauer im engen Zeitfenster ab",()=>{
  const t=cup(16,16,1,{endTime:"10:10",timeMode:"fit",opcMinutes:3});
  assert.throws(()=>onePointTimePlan(t),/Endzeit ist zu knapp/);
});
test("JSON-Sicherung bewahrt Endzeit und Modus, einschließlich One Point Cup",()=>{
  const t=cup(16,16,2,{endTime:"14:00",timeMode:"fit",opcMinutes:4});
  const restored=normalizeTournament(JSON.parse(JSON.stringify(t)));
  assert.equal(restored.endTime,"14:00");
  assert.equal(restored.timeMode,"fit");
  assert.equal(restored.opcMinutes,4);
  assert.equal(restored.courts.length,2);
  assert.ok(onePointTimePlan(restored).blocks>0);
});
test("Bei großer Zeitspanne endet das Turnier ggf. vor der Zielzeit statt Matches unzulässig zu strecken",()=>{
  const t=newTournament({name:"Schleifchen",startTime:"07:00",endTime:"23:00",
    timeMode:"fit",duration:20,breakMinutes:5});
  t.draw={signature:"test",rounds:[{matches:[]},{matches:[]}]};
  const plan=tournamentSchedule(t);
  assert.equal(plan.rounds[0].duration,120);
  assert.equal(plan.overTarget,false);
  assert.equal(plan.usesFullWindow,false);
});
