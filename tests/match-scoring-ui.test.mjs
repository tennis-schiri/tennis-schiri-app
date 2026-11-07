import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=f=>readFileSync(new URL("../"+f,import.meta.url),"utf8");
const app=read("site/assets/app.js");
const doubles=read("site/assets/doppel-ui.js");
const finals=read("site/assets/finals-ui.js");
const advisor=read("site/assets/tournament-advisor.js");
const entry=read("site/index.html");
const doppelEntry=read("site/doppel.html");
const deploy=read(".github/workflows/deploy.yml");
const sync=read(".github/workflows/roadmap-sync.yml");
const seed=JSON.parse(read("site/roadmap-seed.json"));

test("Schleifchen-Einstellungen bieten Zeit- oder Punktmatches; Endrunde übernimmt Wertung",()=>{
  assert.match(app,/scoreModeFields\(t,escapeHtml\)/);
  assert.match(app,/readScoringFields\(form\)/);
  assert.match(app,/assertScoringChangeAllowed\(store\.active\(\),preview\)/);
  assert.match(app,/scoringRules\(t\)\.mode==="points"\?"PUNKTE":"GAMES"/);
  assert.match(finals,/scoringRules\(t\)\.mode==="points"/);
  assert.match(finals,/Sieger wird automatisch berechnet/);
});
test("Doppel bietet Punktziel, Zwei-Punkte-Vorsprung und automatische Matchsieger auch für Playoffs",()=>{
  assert.match(doubles,/scoreModeFields\(current,esc\)/);
  assert.match(doubles,/readScoringFields\(form\)/);
  assert.match(doubles,/assertScoringChangeAllowed\(t,preview\)/);
  assert.match(doubles,/normalizeDoublesResult\(value,t\)/);
  assert.match(doubles,/Punkte \+/);
  assert.match(doubles,/Sieger wird automatisch ermittelt/);
});
test("Turnierberater übernimmt die Zählweise und der One Point Cup bleibt fest auf einen Punkt",()=>{
  assert.match(app,/name="matchMode"/);
  assert.match(app,/name="pointTarget"/);
  assert.match(advisor,/recommendation\.id==="opc"\?"points":input\.matchMode/);
  assert.match(advisor,/recommendation\.id==="opc"\?1:input\.pointTarget/);
});
test("Neue Scoring-Datei wird nur bei manuellem App-Upload ausgeliefert",()=>{
  assert.match(entry,/app\.js\?v=093/);
  assert.match(doppelEntry,/doppel-ui\.js\?v=093/);
  assert.equal((deploy.match(/site\/assets\/match-scoring\.js/g)||[]).length,2);
  assert.match(deploy,/if: github\.event_name == 'workflow_dispatch'/);
  assert.doesNotMatch(sync,/site\/assets\/app\.js|site\/assets\/doppel-ui\.js|site\/assets\/match-scoring\.js/);
  assert.match(sync,/site\/roadmap-seed\.json/);
  assert.match(sync,/node --test tests\/\*\.test\.mjs/);
});
test("Neue Drive-Formate und Punkt-Zählweise sind in veröffentlichbaren Roadmapdaten enthalten",()=>{
  for(const id of ["score-modes","rr","updown","stop","ko-consolation","eight-v-eight","ladder"])
    assert.ok(seed.items.some(x=>x.id===id),id+" fehlt");
  assert.equal(seed.items.find(x=>x.id==="score-modes").status,"test");
});
