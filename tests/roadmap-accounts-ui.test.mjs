import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const js=read("site/assets/roadmap.js");
const api=read("site/roadmap-api.php");
const lib=read("site/roadmap-lib.php");
const css=read("site/assets/roadmap.css");
const sync=read(".github/workflows/roadmap-sync.yml");
const deploy=read(".github/workflows/deploy.yml");
const seed=JSON.parse(read("site/roadmap-seed.json"));

test("Roadmap zeigt normale Anmeldung und Registrierung statt Einladungscode als Standard",()=>{
  assert.match(js,/function credentialsForm\(/);
  assert.match(js,/credentialsForm\("login-account","Anmelden"\)/);
  assert.match(js,/credentialsForm\("register-invite","Konto erstellen/);
  assert.match(js,/credentialsForm\("bootstrap-account","Projektleitungskonto/);
  assert.match(js,/function upgradeAccountModal\(/);
  assert.match(js,/function profileModal\(/);
  assert.match(js,/Mein Konto/);
  assert.match(js,/Nutzer verwalten/);
  assert.match(js,/Einladungslink erstellen/);
  assert.match(js,/data-action="copy-invite"/);
  assert.match(js,/window\.history\.replaceState\(/);
  assert.match(js,/#einladung=/);
  assert.match(css,/\.rm-account-form/);
});
test("Konten sind serverseitig, Einladungen einmalig und Rollen sperrbar",()=>{
  for(const a of ["login-account","bootstrap-account","register-invite","upgrade-account",
    "change-password","invite-link","set-role","revoke"])assert.ok(api.includes("'"+a+"'"),a);
  assert.match(api,/password_hash\(/);
  assert.match(api,/password_verify\(/);
  assert.match(api,/session_regenerate_id\(true\)/);
  assert.match(api,/inviteHash/);
  assert.match(api,/expiresAt/);
  assert.match(api,/unset\(\$state\['invites'\]\[\$index\]\['inviteHash'\]/);
  assert.match(api,/rm_basic_user\(\) === null/);
  assert.match(api,/hash_equals/);
  assert.match(api,/roadmapCredentialProof/);
  assert.match(lib,/ownerAccount/);
  assert.match(lib,/rm_user_exists/);
  assert.match(lib,/rm_username/);
  assert.match(lib,/rm_password/);
});
test("Automatische Updates ändern nur Seed-Daten; PHP-Login wird weiterhin manuell freigegeben",()=>{
  const auto=sync.split('if [[ "${{ github.event_name }}" == "push" ]]; then')[1];
  assert.ok(auto,"Fehlende Push-/manuell-Unterscheidung");
  assert.match(auto,/files=\(site\/roadmap-seed\.json\)/);
  assert.match(auto,/files=\(site\/roadmap-lib\.php site\/roadmap-api\.php/);
  assert.match(sync,/node --test tests\/\*\.test\.mjs/);
  assert.match(deploy,/if: github\.event_name == 'workflow_dispatch'/);
  assert.doesNotMatch(sync,/backend\/public\/index.php/);
});
test("Anmeldeänderung wird in Roadmap transparent als nicht veröffentlicht ausgewiesen",()=>{
  const item=seed.items.find(x=>x.id==="roadmap-accounts");
  assert.ok(item);
  assert.equal(item.status,"test");
  assert.match(item.currentState,/noch nicht auf dem Server/);
  assert.match(item.scope,/Einladungslink/);
  assert.match(item.openPoints,/privat/);
});
test("Frontend-Roadmap-Datei ist syntaktisch gültig",()=>{
  execFileSync(process.execPath,["--check",new URL("../site/assets/roadmap.js",import.meta.url).pathname]);
});
