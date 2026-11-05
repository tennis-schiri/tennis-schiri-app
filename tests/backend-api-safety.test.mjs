import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const get=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const endpoint=get("backend/public/index.php");
const kernel=get("backend/src/ApiKernel.php");
const limiter=get("backend/src/RateLimiter.php");
const service=get("backend/src/AuthService.php");
const club=get("backend/src/ClubService.php");
const sql=get("backend/migrations/002_auth_request_limits.sql");
const deploy=get(".github/workflows/deploy.yml");

test("API is explicitly disabled without environment flag and HTTPS",()=>{
  assert.match(endpoint,/TENNILO_API_ENABLED/);
  assert.match(endpoint,/!== '1'\) closed\(\)/);
  assert.match(endpoint,/HTTPS/);
  assert.match(endpoint,/function closed\(\): never/);
});
test("Private HTTP entrypoint is not uploaded by existing manual FTPS workflow",()=>{
  assert.doesNotMatch(deploy,/for file in [^\n]*(?:backend\/|public\/index\.php|002_auth_request_limits\.sql)/);
  assert.match(deploy,/if: github.event_name == 'workflow_dispatch'/);
});
test("HTTP surface enforces JSON body, request size, no-store and origin",()=>{
  for(const phrase of ["application/json","8192","Cache-Control","REMOTE_ADDR","HTTP_ORIGIN","TENNILO_APP_ORIGIN"]){
    assert.ok(endpoint.includes(phrase),phrase);
  }
  assert.match(kernel,/Unzulässiger Seitenursprung/);
});
test("Sessions use secure HttpOnly cookies with SameSite and CSRF",()=>{
  assert.match(kernel,/__Host-tennilo_session/);
  assert.match(kernel,/__Host-tennilo_csrf/);
  assert.match(kernel,/'secure'=>true,'httponly'=>true,'samesite'=>'Strict'/);
  assert.match(kernel,/x-tennilo-csrf/);
  assert.match(kernel,/time\(\)-3600/);
});
test("Passwords and email verification are not given to browser on signup/reset",()=>{
  assert.match(service,/AccountPolicy::passwordHash\(\$password\)/);
  assert.match(service,/AccountPolicy::tokenHash\(\$token\)/);
  assert.match(kernel,/Falls möglich, wurde eine Bestätigungsmail versendet/);
  assert.match(kernel,/Falls das Konto existiert, wurde eine E-Mail versendet/);
  assert.doesNotMatch(kernel,/body.*token.*=>.*register/);
});
test("Login limiting uses persistent, pseudonymized HMAC scopes",()=>{
  assert.match(limiter,/hash_hmac\('sha256'/);
  assert.match(limiter,/ON DUPLICATE KEY UPDATE/);
  assert.match(sql,/auth_rate_limits/);
  assert.match(sql,/scope_sha256 CHAR\(64\)/);
  assert.doesNotMatch(sql,/\bip_address\b|raw_email/);
});
test("Club roles are evaluated server-side and last-owner guard is transactional",()=>{
  assert.match(club,/requireMembership\(/);
  assert.match(club,/AccountPolicy::can\(/);
  assert.match(club,/FOR UPDATE/);
  assert.match(club,/assertOtherActiveOwnerExists/);
  assert.match(club,/beginTransaction\(\)/);
});
test("API does not expose tournament cash data or credit-card input",()=>{
  for(const s of [endpoint,kernel]){
    assert.doesNotMatch(s,/creditCard|cvv|feePaidCents|bankAccount|card_number/);
  }
});
