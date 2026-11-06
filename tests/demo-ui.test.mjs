import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
test("Zufallsteilnehmer und Ergebnisse sind in allen drei Turnieransichten erreichbar",()=>{
  const ribbon=read("site/assets/app.js");
  const doubles=read("site/assets/doppel-ui.js");
  const opc=read("site/assets/one-point-ui.js");
  for(const source of [ribbon,doubles,opc]){
    assert.match(source,/demoCountLimits/);
    assert.match(source,/makeDemoCopy\(.*new FormData\(form\)\.get\("demoCount"\)/);
    assert.match(source,/fillDemoResults\(t\)/);
    assert.match(source,/demoPanel\(t\)/);
  }
  assert.match(ribbon,/data-action="demo-copy"/);
  assert.match(ribbon,/data-action="demo-fill"/);
  assert.match(doubles,/data-act="demo-copy"/);
  assert.match(doubles,/data-act="demo-fill"/);
  assert.match(opc,/data-act="demo-copy"/);
  assert.match(opc,/data-act="demo-fill"/);
});
test("Demomodus bleibt beim Export erhalten und echte Teilnehmer sind ausgeschlossen",()=>{
  const store=read("site/assets/storage.js");
  const module=read("site/assets/demo-data.js");
  assert.match(store,/demoMode:v\.demoMode===true/);
  assert.match(store,/participants: values\.demoMode===true/);
  assert.match(module,/if\(!t\?\.demoMode\)throw/);
  assert.match(module,/feePaidCents:0/);
  assert.match(module,/paid1:0,paid2:0/);
  assert.match(module,/paidCents:0/);
});
test("Neues Demo-Modul wird nur beim manuell freigegebenen App-Upload verteilt",()=>{
  const workflow=read(".github/workflows/deploy.yml");
  const roadmap=read(".github/workflows/roadmap-sync.yml");
  const files=[...workflow.matchAll(/site\/assets\/demo-data\.js/g)];
  assert.equal(files.length,2);
  assert.match(workflow,/if: github\.event_name == 'workflow_dispatch'/);
  assert.match(roadmap,/files=\(site\/roadmap-seed\.json\)/);
  assert.doesNotMatch(roadmap,/files=\(site\/assets\/demo-data\.js\)/);
});
