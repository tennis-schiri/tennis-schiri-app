import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const main=read("site/assets/app.js");
const module=read("site/assets/tournament-advisor.js");
const html=read("site/index.html");
const css=read("site/assets/styles.css");
const deploy=read(".github/workflows/deploy.yml");

test("Startseite hat einen auffindbaren Turnierberater mit eigenen Formular-Eckdaten",()=>{
  assert.match(main,/data-action="advisor-open"/);
  assert.match(main,/function advisorPage\(/);
  assert.match(main,/data-form="advisor"/);
  for(const name of ["participants","courtCount","date","startTime","endTime","goal","teamStyle"])
    assert.ok(main.includes('name="'+name+'"'),"Feld fehlt: "+name);
  assert.match(main,/Geeignete Turniere berechnen/);
  assert.match(main,/data-action="advisor-create"/);
});
test("Eine Empfehlung wird ohne anonymisierte Modellspieler als echtes Turnier angelegt",()=>{
  assert.match(main,/advisorResults=recommendTournamentFormats\(advisorState\)/);
  assert.match(main,/store\.create\(advisorTournamentValues\(advisorState,choice\)\)/);
  assert.match(main,/t\.type==="doubles"/);
  assert.match(main,/t\.type==="opc"/);
  assert.match(main,/view="overview";render\(\)/);
  assert.match(module,/export const FORMAT_ADVISORS=/);
  assert.match(module,/generateRibbonDraw/);
  assert.match(module,/doublesMatchOptions/);
  assert.match(module,/onePointTimePlan/);
});
test("Berater wird responsiv gestaltet und erst nach manueller Freigabe hochgeladen",()=>{
  assert.match(css,/\.advisor-shell/);
  assert.match(css,/\.advisor-result-grid/);
  assert.match(css,/@media\(max-width:700px\).*\.advisor-fields/s);
  assert.match(html,/app\.js\?v=091/);
  assert.match(html,/styles\.css\?v=088/);
  const manualDeploy=deploy.split("\n  deploy:\n")[1]?.split("\n  deploy_once:\n")[0]||"";
  assert.equal((manualDeploy.match(/site\/assets\/tournament-advisor\.js/g)||[]).length,2);
  assert.match(deploy,/if: github\.event_name == 'workflow_dispatch'/);
  assert.doesNotMatch(deploy,/backend\/public\/index\.php|backend\/src\//);
});
test("Geänderte UI-Module sind syntaktisch prüfbar",()=>{
  for(const file of ["site/assets/app.js","site/assets/tournament-advisor.js"])
    execFileSync(process.execPath,["--check",new URL("../"+file,import.meta.url).pathname]);
});
