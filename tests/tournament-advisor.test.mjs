import test from "node:test";
import assert from "node:assert/strict";
import {newTournament,normalizeTournament} from "../site/assets/storage.js";
import {
  FORMAT_ADVISORS,normalizeAdvisorInput,recommendTournamentFormats,advisorTournamentValues
} from "../site/assets/tournament-advisor.js";

const input=(changes={})=>({
  participants:16,courtCount:4,date:"2026-12-12",
  startTime:"10:00",endTime:"14:00",goal:"many",teamStyle:"any",...changes
});
const by=(items,id)=>items.find(x=>x.id===id);

test("Turnierberater besitzt ein erweiterbares Register aus drei echten Auslosungsadaptern",()=>{
  assert.deepEqual(FORMAT_ADVISORS.map(x=>x.id),["ribbon","doubles","opc"]);
  const results=recommendTournamentFormats(input());
  assert.equal(results.length,3);
  assert.equal(new Set(results.map(x=>x.id)).size,3);
  assert.ok(results.some(x=>x.feasible));
  assert.equal(results[0].rank,1);
});
test("Der Berater empfiehlt feste Doppel bei festem Partnerwunsch",()=>{
  const results=recommendTournamentFormats(input({teamStyle:"fixed"}));
  assert.equal(results[0].id,"doubles");
  assert.equal(results[0].feasible,true);
  assert.equal(results[0].estimate.teamCount,8);
  assert.equal(results[0].estimate.matches,results[0].estimate.teamCount*results[0].estimate.settings.rounds/2);
});
test("Beim geselligen Format haben wechselnde Partner Vorrang",()=>{
  const results=recommendTournamentFormats(input({goal:"social",teamStyle:"rotating"}));
  assert.equal(results[0].id,"ribbon");
  assert.equal(results[0].estimate.perPerson.includes("Spiele je Person"),true);
});
test("Der kurze Einzel-Wettbewerb empfiehlt den One Point Cup",()=>{
  const results=recommendTournamentFormats(input({goal:"quick",teamStyle:"singles"}));
  assert.equal(results[0].id,"opc");
  assert.equal(results[0].estimate.matches,15);
  assert.equal(results[0].estimate.settings.fieldSize,16);
});
test("One Point Cup zählt Freilose nicht als Begegnungen",()=>{
  const c=by(recommendTournamentFormats(input({participants:20,goal:"quick"})),"opc");
  assert.equal(c.feasible,true);
  assert.equal(c.estimate.matches,19);
  assert.equal(c.estimate.settings.fieldSize,32);
  assert.match(c.estimate.detail,/Freilose/);
});
test("Ungerade Personenzahl wird nicht als vollständig gepaartes Doppel vorgetäuscht",()=>{
  const results=recommendTournamentFormats(input({participants:15}));
  assert.equal(by(results,"doubles").feasible,false);
  assert.match(by(results,"doubles").reason,/paarweise/);
  assert.equal(by(results,"opc").feasible,true);
});
test("Enges Zeitfenster wird abgelehnt statt Spielzeit oder Plätze zu erfinden",()=>{
  const results=recommendTournamentFormats(input({
    participants:24,courtCount:1,startTime:"10:00",endTime:"10:20"
  }));
  assert.equal(results.every(x=>!x.feasible),true);
  assert.equal(results.every(x=>typeof x.reason==="string"&&x.reason.length>10),true);
});
test("Die Zeitplanung ohne Endzeit zeigt einen unverbindlichen Endzeitwert",()=>{
  const results=recommendTournamentFormats(input({endTime:null}));
  const possible=results.filter(x=>x.feasible);
  assert.ok(possible.length>0);
  assert.ok(possible.every(x=>/^\d{2}:\d{2}/.test(x.estimate.plannedEnd)));
});
test("Alle Vorschläge verwenden eine bereits vorhandene Turnierart, aber keine Musterspieler bei der Erstellung",()=>{
  const p=input({teamStyle:"fixed"});
  const results=recommendTournamentFormats(p);
  for(const choice of results.filter(x=>x.feasible)){
    const values=advisorTournamentValues(p,choice);
    const created=newTournament(values);
    const restored=normalizeTournament(JSON.parse(JSON.stringify(created)));
    assert.equal(restored.type,choice.id);
    assert.equal(restored.startTime,"10:00");
    assert.equal(restored.endTime,"14:00");
    assert.equal(restored.timeMode,"fit");
    assert.equal(restored.courts.length,4);
    assert.equal(restored.participants.length,0);
    assert.equal(restored.doubles.teams.length,0);
    assert.equal(restored.opc.players.length,0);
    if(choice.id==="opc")assert.equal(restored.opc.fieldSize,choice.estimate.settings.fieldSize);
    if(choice.id==="doubles")assert.equal(restored.rounds,choice.estimate.settings.rounds);
  }
});
test("Ungültige Eckdaten und alte/unmögliche Vorschläge erzeugen keine Turniere",()=>{
  assert.throws(()=>normalizeAdvisorInput(input({participants:3})),/zwischen 4 und 128/);
  assert.throws(()=>normalizeAdvisorInput(input({courtCount:0})),/zwischen 1 und 24/);
  assert.throws(()=>normalizeAdvisorInput(input({endTime:"10:05"})),/mindestens 15 Minuten/);
  assert.throws(()=>normalizeAdvisorInput(input({goal:"unbekannt"})),/Unbekanntes Turnierziel/);
  assert.throws(()=>advisorTournamentValues(input(),{id:"ribbon",feasible:false}),/machbaren/);
  const above64=by(recommendTournamentFormats(input({participants:66})),"opc");
  assert.equal(above64.feasible,false);
  assert.match(above64.reason,/64 Spieler/);
});
