import test from "node:test";
import assert from "node:assert/strict";
import {BrowserTournamentStore} from "../site/assets/storage.js";
import {euroCents,euroText,entryDue,feesOverview,plannedRound,clockFor,changeRoundClock} from "../site/assets/operations.js";

const fixture=(duration=20,breakMinutes=10,startTime="10:00")=>({
  duration,breakMinutes,startTime,date:"2026-11-05",entryFeeCents:500,
  participants:[
    {id:"a",name:"Alex",present:true,feeOverrideCents:null,feePaidCents:500},
    {id:"b",name:"Berta",present:false,feeOverrideCents:300,feePaidCents:0},
    {id:"c",name:"Chris",present:true,feeOverrideCents:0,feePaidCents:0}
  ],
  draw:{rounds:[{matches:[]},{matches:[]}],specialRound:{matches:[]}}
});

test("Deutsche Euro-Eingabe wird centgenau geparst",()=>{
  assert.equal(euroCents("5,50"),550);
  assert.equal(euroCents("5.5"),550);
  assert.equal(euroCents("0"),0);
  assert.equal(euroCents("99,99"),9999);
  assert.match(euroText(550),/5,50/);
  for(const value of ["-1","2,345","3e4","5 EUR","100000",""])assert.throws(()=>euroCents(value));
});

test("Bar-Kasse berücksichtigt individuellen Betrag, Freistellung und Abwesende",()=>{
  const t=fixture(),a=feesOverview(t);
  assert.equal(a.expected,800);
  assert.equal(a.received,500);
  assert.equal(a.open,300);
  assert.equal(a.paidCount,1);
  assert.equal(a.openCount,1);
  assert.equal(a.players.find(p=>p.id==="c").status,"frei");
  assert.equal(entryDue(t,t.participants[1]),300);
});

test("Überzahlungen werden ausgewiesen und nicht als negative offene Beträge gerechnet",()=>{
  const t=fixture();
  t.participants[0].feePaidCents=700;
  const a=feesOverview(t);
  assert.equal(a.received,700);
  assert.equal(a.extra,200);
  assert.equal(a.open,300);
});

test("Geplante Start-, End- und Wechselzeiten werden korrekt berechnet",()=>{
  const t=fixture();
  assert.deepEqual(plannedRound(t,0),{start:"10:00",end:"10:20",pauseEnd:"10:30",duration:20,breakMinutes:10});
  assert.equal(plannedRound(t,1).start,"10:30");
  assert.equal(plannedRound(t,2).start,"11:00");
});

test("Plan kann über Mitternacht reichen",()=>{
  const t=fixture(30,10,"23:40");
  assert.equal(plannedRound(t,0).end,"00:10 (+1 Tag)");
  assert.equal(plannedRound(t,1).start,"00:20 (+1 Tag)");
  assert.equal(plannedRound(t,2).pauseEnd,"01:30 (+1 Tag)");
});

test("Nicht gestartete Uhr zeigt die vorgegebene Spieldauer",()=>{
  const t=fixture();
  assert.equal(clockFor(t,0,1000000).display,"20:00");
  assert.equal(clockFor(t,0,1000000).status,"ready");
});

test("Gestartete Uhr läuft über die echte Uhrzeit auch nach einem Reload weiter",()=>{
  const t=fixture(),started=1000000;
  t.roundClocks=changeRoundClock(t,0,"start",started);
  assert.equal(clockFor(t,0,started).display,"20:00");
  assert.equal(clockFor(t,0,started+30000).display,"19:30");
  const restored=JSON.parse(JSON.stringify(t));
  assert.equal(clockFor(restored,0,started+30000).display,"19:30");
  assert.equal(clockFor(restored,0,started+30000).status,"running");
});

test("Pausieren, Fortsetzen und Beenden halten die Zeit korrekt fest",()=>{
  const t=fixture(),start=1000000;
  t.roundClocks=changeRoundClock(t,0,"start",start);
  t.roundClocks=changeRoundClock(t,0,"pause",start+10000);
  assert.equal(clockFor(t,0,start+40000).display,"19:50");
  assert.equal(clockFor(t,0,start+40000).status,"paused");
  t.roundClocks=changeRoundClock(t,0,"resume",start+40000);
  assert.equal(clockFor(t,0,start+45000).display,"19:45");
  t.roundClocks=changeRoundClock(t,0,"finish",start+50000);
  assert.equal(clockFor(t,0,start+90000).display,"19:40");
  assert.equal(clockFor(t,0,start+90000).status,"finished");
});

test("Abgelaufene Spielzeit wird als Überzeit angezeigt und nicht automatisch beendet",()=>{
  const t=fixture(),start=1000000;
  t.roundClocks=changeRoundClock(t,0,"start",start);
  const c=clockFor(t,0,start+20*60000+91000);
  assert.equal(c.status,"running");
  assert.equal(c.display,"+01:31");
  assert.equal(c.expired,true);
});

test("Zwei Runden dürfen nicht gleichzeitig laufen",()=>{
  const t=fixture();
  t.roundClocks=changeRoundClock(t,0,"start",1000000);
  assert.throws(()=>changeRoundClock(t,1,"start",1001000),/läuft noch/);
  t.roundClocks=changeRoundClock(t,0,"pause",1002000);
  t.roundClocks=changeRoundClock(t,1,"start",1003000);
  assert.equal(clockFor(t,1,1003000).status,"running");
  assert.throws(()=>changeRoundClock(t,0,"resume",1004000),/andere Rundenuhr/);
});

test("Nur vorhandene Runden können gestartet werden",()=>{
  const t=fixture();
  assert.throws(()=>changeRoundClock(t,3,"start",1000000),/noch nicht ausgelost/);
  assert.throws(()=>changeRoundClock({...t,draw:null},0,"start",1000000),/noch nicht ausgelost/);
});

test("Uhr zurücksetzen betrifft nur die gewählte Runde",()=>{
  const t=fixture();
  t.roundClocks=changeRoundClock(t,0,"start",1000000);
  t.roundClocks=changeRoundClock(t,0,"pause",1001000);
  t.roundClocks=changeRoundClock(t,1,"start",1002000);
  t.roundClocks=changeRoundClock(t,0,"reset",1003000);
  assert.equal(clockFor(t,0,1003000).status,"ready");
  assert.equal(clockFor(t,1,1003000).status,"running");
});

test("Die bei Start gültige Zeitvorgabe bleibt für die laufende Uhr gespeichert",()=>{
  const t=fixture();
  t.roundClocks=changeRoundClock(t,0,"start",1000000);
  t.duration=30;
  assert.equal(clockFor(t,0,1000000).display,"20:00");
  assert.equal(plannedRound(t,0).end,"10:30");
});

test("Barzahlungen und Uhren überstehen Bearbeiten, Reload und JSON-Sicherung",()=>{
  const items=new Map();
  globalThis.localStorage={getItem(k){return items.get(k)||null},setItem(k,v){items.set(k,v)}};
  const db=new BrowserTournamentStore();
  const t=db.create({name:"Bar-Kasse",entryFeeCents:750,rounds:3,courts:[1,2,3]});
  db.upsertParticipant(t.id,{name:"Alex",group:"stark",present:true,feeOverrideCents:550});
  const p=db.active().participants[0];
  db.recordCashPayment(t.id,p.id,200);
  db.upsertParticipant(t.id,{name:"Alex neu",group:"stark",present:true,feeOverrideCents:550},p.id);
  assert.equal(db.active().participants[0].feePaidCents,200);
  assert.equal(db.active().participants[0].feeOverrideCents,550);
  const clock={firstStartedAt:1000000,startedAt:1000000,finishedAt:null,elapsedMs:0,durationMs:1200000};
  db.editTournament(t.id,{roundClocks:{"0":clock}});
  const again=new BrowserTournamentStore();
  assert.deepEqual(again.active().roundClocks["0"],clock);
  assert.equal(again.active().participants[0].feePaidCents,200);
  again.importJson(db.exportJson());
  assert.equal(again.active().entryFeeCents,750);
  assert.equal(again.active().roundClocks["0"].durationMs,1200000);
});

test("Alte Turniere ohne Nenngeld und Rundenuhren bleiben kompatibel",()=>{
  const items=new Map();
  globalThis.localStorage={getItem(k){return items.get(k)||null},setItem(k,v){items.set(k,v)}};
  const db=new BrowserTournamentStore();
  const t=db.create({name:"Altbestand"});
  const old=JSON.parse(db.exportJson());
  for(const tournament of old.tournaments){
    delete tournament.entryFeeCents;delete tournament.roundClocks;
  }
  db.importJson(JSON.stringify(old));
  assert.equal(db.active().entryFeeCents,0);
  assert.deepEqual(Object.keys(db.active().roundClocks),[]);
});
