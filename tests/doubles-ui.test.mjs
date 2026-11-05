import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {execFileSync} from "node:child_process";

const text=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const html=text("site/doppel.html");
const ui=text("site/assets/doppel-ui.js");
const model=text("site/assets/doubles.js");
const store=text("site/assets/storage.js");
const main=text("site/assets/app.js");
const workflow=text(".github/workflows/deploy.yml");

test("Doppelturnier hat eigene, responsiv gestylte Startseite mit Noindex",()=>{
  assert.match(html,/doppel-ui\.js\?v=080/);
  assert.match(html,/doppel\.css\?v=070/);
  assert.match(html,/noindex,nofollow/);
  assert.match(text("site/assets/doppel.css"),/@media\(max-width:730px\)/);
});

test("Doppel ist über TENNILO erreichbar; Schleifchen bleibt unverändert aufrufbar",()=>{
  assert.match(main,/Doppelturnier starten/);
  assert.match(main,/data-action="doppel-new"/);
  assert.match(main,/t\.type==="doubles"/);
  assert.match(main,/doppel\.html/);
  assert.match(store,/type:v\.type==="doubles"\?"doubles":v\.type==="opc"\?"opc":"ribbon"/);
  assert.match(store,/doubles:doublesOf/);
});

test("Doppel-Oberfläche stellt Teamverwaltung, Kasse, Vorrunde, Endrunde und Backups bereit",()=>{
  for(const action of ['team-add','team-edit','team-remove','presence','cash','draw-generate','round',
    'result','playoffs-generate','playoffs-reset','playoff-eligible','clock','backup','edit-courts']) {
    assert.ok(ui.includes('data-act="'+action+'"')||ui.includes('act==="'+action+'"'),
      "UI-Aktion fehlt: "+action);
  }
  assert.match(ui,/function tablePage/);
  assert.match(ui,/function playoffsPage/);
  assert.match(ui,/function cashDialog/);
  assert.match(ui,/normalizeDoublesResult/);
  assert.match(ui,/store\.exportJson\(\)/);
  assert.match(ui,/store\.importJson\(raw\)/);
  assert.match(ui,/id="doubles-import"/);
  assert.match(ui,/file\.size>3000000/);
  assert.match(ui,/window\.addEventListener\("storage"/);
  assert.doesNotMatch(ui,/\bfetch\s*\(/);
  assert.doesNotMatch(ui,/Stripe|Mollie|PayPal/);
});

test("Doppel-Logik ist unabhängig von der Schleifchenwertung und bleibt auf Team-Ebene",()=>{
  assert.match(model,/export function generateDoublesDraw/);
  assert.match(model,/export function verifyDoublesDraw/);
  assert.match(model,/export function doublesStandings/);
  assert.match(model,/export function createDoublesPlayoffs/);
  assert.match(model,/export function changeDoublesClock/);
  assert.doesNotMatch(model,/ribbonStandings|generateRibbonDraw/);
});

test("Manuelles FTPS enthält neue Dateien, aber keine Backend-Konten",()=>{
  for(const path of ["site/doppel.html","site/assets/doppel.css",
    "site/assets/doppel-ui.js","site/assets/doubles.js"]) {
    assert.ok(workflow.includes(path),"FTPS-Whitelist fehlt "+path);
  }
  assert.match(workflow,/workflow_dispatch/);
  assert.match(workflow,/if: github\.event_name == 'workflow_dispatch'/);
  assert.doesNotMatch(workflow,/backend\/public\/index\.php|backend\/src\//);
});

test("Doppel-JavaScript und veränderte Einstiegsmodule sind syntaktisch valide",()=>{
  for(const path of ["site/assets/doppel-ui.js","site/assets/doubles.js",
    "site/assets/storage.js","site/assets/app.js"]) {
    execFileSync(process.execPath,["--check",new URL("../"+path,import.meta.url).pathname]);
  }
});
