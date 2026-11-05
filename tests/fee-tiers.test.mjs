import test from "node:test";
import assert from "node:assert/strict";
import {BrowserTournamentStore,normalizeTournament} from "../site/assets/storage.js";
import {entryDue,feesOverview,playerTier,feeTiers} from "../site/assets/operations.js";

function setup(fee=1000){
  const memory=new Map();
  globalThis.localStorage={
    getItem(k){return memory.get(k)??null;},
    setItem(k,v){memory.set(k,v);}
  };
  const db=new BrowserTournamentStore();
  const tournament=db.create({name:"Verein",entryFeeCents:fee});
  db.upsertParticipant(tournament.id,{name:"Alex",group:"stark",present:true});
  db.upsertParticipant(tournament.id,{name:"Kim",group:"schwaecher",present:false});
  return {db,id:tournament.id,read:()=>new BrowserTournamentStore().active()};
}

test("Vorhandenes Turnier mit einem Nenngeld wird zu Standard ohne Datenverlust",()=>{
  const legacy=normalizeTournament({name:"Alt",entryFeeCents:1200,participants:[
    {id:"p",name:"Alex",group:"stark",present:true,feePaidCents:500,feeOverrideCents:800}
  ]});
  assert.deepEqual(legacy.feeCategories,[{id:"standard",name:"Standard",amountCents:1200}]);
  assert.equal(legacy.participants[0].feeTierId,"standard");
  assert.equal(legacy.participants[0].feePaidCents,500);
  assert.equal(entryDue(legacy,legacy.participants[0]),800);
});

test("Jugend und Erwachsene als zwei zusätzliche Preis-Kategorien",()=>{
  const {db,id,read}=setup(1000);
  const young=db.upsertFeeCategory(id,{name:"Jugend",amountCents:400});
  const adult=db.upsertFeeCategory(id,{name:"Erwachsene",amountCents:1200});
  assert.equal(read().feeCategories.length,3);
  assert.equal(read().feeCategories.find(c=>c.id===young).amountCents,400);
  assert.equal(read().feeCategories.find(c=>c.id===adult).amountCents,1200);
  db.setParticipantFeeTier(id,read().participants[0].id,young);
  db.setParticipantFeeTier(id,read().participants[1].id,adult);
  const report=feesOverview(read());
  assert.equal(report.expected,1600);
  assert.deepEqual(report.players.map(p=>p.tierName),["Jugend","Erwachsene"]);
});

test("Tarifwechsel lässt Barzahlung bestehen, löst aber individuellen Sonderpreis bewusst ab",()=>{
  const {db,id,read}=setup(1000);
  const young=db.upsertFeeCategory(id,{name:"Jugend",amountCents:500});
  const p=read().participants[0];
  db.recordCashPayment(id,p.id,300);
  db.upsertParticipant(id,{name:p.name,group:p.group,present:true,feeOverrideCents:700},p.id);
  assert.equal(entryDue(read(),read().participants[0]),700);
  db.setParticipantFeeTier(id,p.id,young);
  assert.equal(read().participants[0].feeOverrideCents,null);
  assert.equal(read().participants[0].feePaidCents,300);
  assert.equal(entryDue(read(),read().participants[0]),500);
  assert.equal(feesOverview(read()).open,1200);
});

test("Tarif-Betrag ändern ändert Soll, aber nicht bereits erfassten BAR-Betrag",()=>{
  const {db,id,read}=setup(1000);
  const youth=db.upsertFeeCategory(id,{name:"Jugend",amountCents:500});
  db.setParticipantFeeTier(id,read().participants[0].id,youth);
  db.recordCashPayment(id,read().participants[0].id,500);
  db.upsertFeeCategory(id,{id:youth,name:"Jugend",amountCents:600});
  assert.equal(feesOverview(read()).received,500);
  assert.equal(feesOverview(read()).open,1100);
});

test("Abwesende Teilnehmer bleiben in der gemeinsamen Kasse",()=>{
  const {read}=setup(850);
  const report=feesOverview(read());
  assert.equal(report.expected,1700);
  assert.equal(report.players[1].present,false);
  assert.equal(report.players[1].due,850);
});

test("Verwendete Kategorie nicht entfernbar und Standard unveränderlich als ID",()=>{
  const {db,id,read}=setup();
  const tier=db.upsertFeeCategory(id,{name:"Jugend",amountCents:250});
  db.setParticipantFeeTier(id,read().participants[0].id,tier);
  assert.throws(()=>db.removeFeeCategory(id,tier),/noch Spielern zugeordnet/);
  assert.throws(()=>db.removeFeeCategory(id,"standard"),/Standard/);
  db.setParticipantFeeTier(id,read().participants[0].id,"standard");
  db.removeFeeCategory(id,tier);
  assert.equal(read().feeCategories.length,1);
});

test("Doppelte, leere oder zu lange Kategorienamen werden abgelehnt",()=>{
  const {db,id,read}=setup();
  db.upsertFeeCategory(id,{name:"Jugend",amountCents:200});
  assert.throws(()=>db.upsertFeeCategory(id,{name:"jugend",amountCents:100}),/bereits/);
  assert.throws(()=>db.upsertFeeCategory(id,{name:"",amountCents:100}),/Kategorienamen/);
  assert.throws(()=>db.upsertFeeCategory(id,{name:"A".repeat(41),amountCents:100}),/40 Zeichen/);
  assert.throws(()=>db.upsertFeeCategory(id,{name:"Senioren",amountCents:-1}),/Ungültiger/);
});

test("Standardtarif bleibt mit altem Einstellungsformular synchron",()=>{
  const {db,id,read}=setup(1000);
  db.editTournament(id,{entryFeeCents:1500});
  assert.equal(read().feeCategories[0].amountCents,1500);
  db.upsertFeeCategory(id,{id:"standard",name:"Grundbetrag",amountCents:1800});
  assert.equal(read().entryFeeCents,1800);
  assert.equal(feeTiers(read())[0].name,"Grundbetrag");
});

test("Spielerbearbeitung erhält Tarif und tatsächliche Zahlung",()=>{
  const {db,id,read}=setup();
  const tier=db.upsertFeeCategory(id,{name:"Jugend",amountCents:300});
  const p=read().participants[0];
  db.setParticipantFeeTier(id,p.id,tier);
  db.recordCashPayment(id,p.id,100);
  db.upsertParticipant(id,{name:"Alex Neu",group:"schwaecher",present:false},p.id);
  assert.equal(playerTier(read(),read().participants[0]).name,"Jugend");
  assert.equal(read().participants[0].feePaidCents,100);
});

test("JSON-Export und Import erhalten mehrere Tarife, Zuordnung und Barzahlungen",()=>{
  const {db,id,read}=setup(900);
  const category=db.upsertFeeCategory(id,{name:"Jugend",amountCents:450});
  db.setParticipantFeeTier(id,read().participants[0].id,category);
  db.recordCashPayment(id,read().participants[0].id,450);
  const backup=new BrowserTournamentStore().exportJson();
  db.importJson(backup);
  assert.equal(read().feeCategories.length,2);
  assert.equal(read().participants[0].feeTierId,category);
  assert.equal(read().participants[0].feePaidCents,450);
});

test("Ungültige gespeicherte Kategorie führt zum Standard statt Gebührenverlust",()=>{
  const t=normalizeTournament({name:"Legacy",entryFeeCents:600,
    feeCategories:[{id:"standard",name:"Standard",amountCents:600},{id:"bad!",name:"xx",amountCents:500}],
    participants:[{id:"a",name:"A",present:true,feeTierId:"bad!",feePaidCents:200}]
  });
  assert.equal(t.participants[0].feeTierId,"standard");
  assert.equal(entryDue(t,t.participants[0]),600);
  assert.equal(t.participants[0].feePaidCents,200);
});
