import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {execFileSync} from "node:child_process";

const read=p=>readFileSync(new URL("../"+p, import.meta.url),"utf8");
const page=read("site/roadmap.html");
const ui=read("site/assets/roadmap.js");
const css=read("site/assets/roadmap.css");
const api=read("site/roadmap-api.php");
const lib=read("site/roadmap-lib.php");
const seed=JSON.parse(read("site/roadmap-seed.json"));
const deploy=read(".github/workflows/deploy.yml");
const verify=read(".github/workflows/verify.yml");
const app=read("site/assets/app.js");

test("Roadmap hat eigene geschützte Unterseite und behält TENNILO-Branding",()=>{
  assert.match(page,/noindex,nofollow/);
  assert.match(page,/roadmap-app/);
  assert.match(page,/roadmap\.js\?v=085/);
  assert.match(page,/roadmap\.css\?v=085/);
  assert.match(page,/Content-Security-Policy/);
  assert.match(app,/roadmap\.html/);
});
test("Fünf transparente Status für fertige, geplante und vorgeschlagene Funktionen",()=>{
  assert.deepEqual([...new Set(seed.items.map(x=>x.status))].sort(),
    ["idea","online","planned","progress","test"]);
  assert.match(ui,/Auf Testseite/);
  assert.match(ui,/Code fertig/);
  assert.match(ui,/Ideensammlung/);
  assert.match(ui,/rm-board/);
  assert.match(ui,/rm-list/);
  assert.match(ui,/rm-search/);
  assert.match(ui,/rm-filter-priority/);
  assert.match(ui,/rm-filter-category/);
  assert.match(css,/@media\(max-width:620px\)/);
});
test("Ausführliche Inhalte stehen ausschließlich in der Detailansicht und bleiben bearbeitbar",()=>{
  const fields=["benefit","scope","currentState","openPoints","doneWhen"];
  for(const item of seed.items){
    for(const key of fields){
      assert.equal(typeof item[key],"string",item.id+" fehlt "+key);
      assert.ok(item[key].length>25,item.id+": "+key+" zu knapp beschrieben");
    }
    assert.ok(["high","medium","low"].includes(item.priority),"Priorität ungültig: "+item.id);
  }
  assert.match(ui,/function detailsHtml\(item\)/);
  assert.match(ui,/detailsHtml\(x\)/);
  assert.match(ui,/DETAIL_SECTIONS\.map/);
  assert.match(ui,/Object\.fromEntries\(DETAIL_SECTIONS\.map/);
  assert.match(ui,/data-action="edit"/);
  assert.match(lib,/RM_DETAIL_FIELDS/);
  assert.match(lib,/array_key_exists\(\$field, \$item\)/);
  assert.match(css,/\.rm-details-grid/);
  assert.match(css,/\.rm-detail-section/);
  assert.match(ui,/rm-detail-sources/);
  assert.match(lib,/RM_OFFICIAL_FIELDS/);
  assert.match(lib,/officialBaseline/);
  assert.match(lib,/rm_references/);
  assert.ok(seed.items.length>=25,"Drive-Formatideen und Zählweise im Seed erwartet");
  for(const id of ["score-modes","rr","ko-consolation","updown","stop","eight-v-eight","ladder"])
    assert.ok(seed.items.some(x=>x.id===id),"Roadmap-Thema fehlt: "+id);
  assert.ok(seed.items.filter(x=>Array.isArray(x.references)&&x.references.length).length>=6);

  const overview=ui.split("function card(x)")[1].split("function renderResults()")[0];
  for(const key of fields)assert.equal(overview.includes("x."+key),false,
    "Detailtext darf nicht in der Board-Karte erscheinen");
});

test("Echte getrennte Rechte statt bloßer lokaler Kommentar-Demo",()=>{
  for(const x of ["login","logout","bootstrap","invite","revoke","idea","comment","update","delete-comment","rotate-owner"])
    assert.ok(api.includes("'"+x+"'"),"Fehlende Server-Aktion: "+x);
  assert.match(api,/hash_equals/);
  assert.match(api,/session_regenerate_id/);
  assert.match(api,/httponly/);
  assert.match(api,/samesite.*Strict/);
  assert.match(api,/roadmapCsrf/);
  assert.match(api,/RM_MAX_REQUEST/);
  assert.match(api,/rm_is_https/);
  assert.match(api,/rm_basic_user\(\) === null/);
  assert.match(api,/HTTP_ORIGIN/);
  assert.match(api,/storagePersistent/);
  assert.match(api,/rm_write_state/);
  assert.match(lib,/RM_STATUSES/);
  assert.match(lib,/rm_valid_code/);
});
test("Keine Roh-Tokens im Seed oder außerhalb privaten Serverspeichers",()=>{
  assert.equal(seed.schemaVersion,1);
  assert.ok(seed.items.length>=15);
  assert.equal(seed.items.some(x=>"adminHash" in x||"writer" in x),false);
  assert.doesNotMatch(api,/echo .*\$ownerCode/);
  assert.match(api,/hash\('sha256',\s*\$ownerCode\)/);
  assert.match(api,/sys_get_temp_dir/);
  assert.match(api,/DOCUMENT_ROOT/);
  assert.match(api,/str_starts_with\(\$real, \$web/);
  assert.match(api,/file_put_contents/);
  assert.match(api,/flock/);
});
test("Kommentare und neue Ideen werden niemals ungeprüft als HTML eingefügt",()=>{
  assert.match(ui,/const esc=/);
  assert.match(ui,/esc\(x\.description\)/);
  assert.match(ui,/esc\(c\.text\)/);
  assert.match(ui,/esc\(c\.author\)/);
  assert.match(ui,/textContent=message/);
  assert.match(api,/rm_text\(/);
});
test("Manuelles Deployment umfasst Roadmap und PHPSyntax-Tests, aber keine Backend-API",()=>{
  for(const file of ["site/roadmap.html","site/roadmap-api.php","site/roadmap-lib.php",
    "site/roadmap-seed.json","site/assets/roadmap.js","site/assets/roadmap.css"]){
    assert.ok(deploy.includes(file),"Datei fehlt im FTPS-Workflow: "+file);
  }
  assert.match(deploy,/if: github\.event_name == 'workflow_dispatch'/);
  assert.match(deploy,/php -l site\/roadmap-api\.php/);
  assert.match(deploy,/php tests\/roadmap\.php/);
  assert.match(verify,/php tests\/roadmap\.php/);
  assert.doesNotMatch(deploy,/backend\/public\/index\.php|backend\/src\//);
});
test("JavaScript und PHP der neuen Roadmap sind syntaktisch gültig",()=>{
  execFileSync(process.execPath,["--check",new URL("../site/assets/roadmap.js",import.meta.url).pathname]);
  for(const file of ["site/roadmap-api.php","site/roadmap-lib.php"]){
    execFileSync("php",["-l",new URL("../"+file,import.meta.url).pathname]);
  }
});
