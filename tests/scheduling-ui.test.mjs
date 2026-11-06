import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const ribbon=read("site/assets/app.js");
const doubles=read("site/assets/doppel-ui.js");
const opc=read("site/assets/one-point-ui.js");
const operations=read("site/assets/operations.js");
const finals=read("site/assets/finals-ui.js");
const liveModel=read("site/assets/live-model.js");
const storage=read("site/assets/storage.js");

test("Alle drei Turnierformulare enthalten Startzeit, optionale Endzeit und anpassbare Zeitplanung",()=>{
  for(const [name,code] of [["Schleifchen",ribbon],["Doppel",doubles],["One Point Cup",opc]]){
    assert.match(code,/name="startTime"/,name+" Startzeit");
    assert.match(code,/name="endTime"/,name+" Endzeit");
    assert.match(code,/name="timeMode"/,name+" Zeitmodus");
    assert.match(code,/value="fit"/,name+" Automatik");
    assert.match(code,/value="fixed"/,name+" Manuell");
    assert.match(code,/timeWindow\(/,name+" Eingabeprüfung");
  }
});
test("Schleifchen und Doppel richten die echte Auslosung gegen die gewünschte Endzeit aus",()=>{
  assert.match(ribbon,/tournamentSchedule\(\{\.\.\.t,draw\}\)/);
  assert.match(doubles,/tournamentSchedule\(\{\.\.\.t,doubles:\{\.\.\.t\.doubles,draw:candidate\}\}\)/);
  assert.match(ribbon,/name="reserveFinals"/);
  assert.match(doubles,/name="reservePlayoffs"/);
  assert.match(doubles,/doublesMatchOptions\(t\)/);
  assert.match(doubles,/Wie viele Matches pro Team sind machbar/);
});
test("One Point Cup nutzt die Anzahl von Ein-Punkt-Blöcken und tatsächlich verfügbaren Plätzen",()=>{
  assert.match(opc,/name="opcMinutes"/);
  assert.match(opc,/name="courtCount"/);
  assert.match(opc,/onePointTimePlan\(/);
  assert.match(opc,/Zeitblöcke an die Endzeit anpassen/);
  assert.match(opc,/onePointTimePlan\(\{\.\.\.t,opc:\{\.\.\.t\.opc,draw:drawData\}\}\)/);
  assert.match(opc,/phasePlan\.start/);
  assert.match(opc,/phasePlan\.end/);
});
test("Reservierte Schleifchen-Endrundenzeiten sind in Turnierleitung und Monitor sichtbar",()=>{
  assert.match(finals,/finalTime\(stageIndex\)/);
  assert.match(liveModel,/plannedStart:stagePlan\?\.start/);
});

test("Zeitplanung wird dauerhaft gespeichert, ohne alte Turnier-Backups umzuschreiben",()=>{
  assert.match(storage,/endTime:/);
  assert.match(storage,/timeMode:/);
  assert.match(storage,/reservePlayoffs:/);
  assert.match(storage,/reserveFinals:/);
  assert.match(storage,/opcMinutes:/);
  assert.match(storage,/const VERSION = 1/);
  assert.match(operations,/export function tournamentSchedule/);
  assert.match(operations,/export function timeWindow/);
  assert.match(operations,/export function scheduleBlockCount/);
});
test("Geänderte Module sind syntaktisch gültig",()=>{
  for(const path of ["site/assets/app.js","site/assets/doppel-ui.js",
    "site/assets/one-point-ui.js","site/assets/doubles.js",
    "site/assets/one-point.js","site/assets/operations.js","site/assets/storage.js",
    "site/assets/live-model.js","site/assets/live.js"]){
    execFileSync(process.execPath,["--check",new URL("../"+path,import.meta.url).pathname]);
  }
});
