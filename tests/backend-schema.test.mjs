import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const sql=readFileSync(new URL("../backend/migrations/001_accounts_organizations.sql",import.meta.url),"utf8");
const db=readFileSync(new URL("../backend/src/Database.php",import.meta.url),"utf8");
const policy=readFileSync(new URL("../backend/src/AccountPolicy.php",import.meta.url),"utf8");
const migrator=readFileSync(new URL("../backend/bin/migrate.php",import.meta.url),"utf8");
const deploy=readFileSync(new URL("../.github/workflows/deploy.yml",import.meta.url),"utf8");

const required=[
  "schema_migrations","users","organizations","organization_memberships",
  "organization_invitations","email_verification_tokens","password_reset_tokens",
  "auth_sessions","platform_administrators","license_plans",
  "organization_licenses","audit_events"
];
const tables=[...sql.matchAll(/CREATE TABLE IF NOT EXISTS ([a-z_]+)/g)].map(x=>x[1]);

test("Account schema contains all twelve planned tables",()=>{
  assert.deepEqual(tables,required);
  assert.equal(new Set(tables).size,tables.length);
});
test("All tables are InnoDB with utf8mb4",()=>{
  assert.equal((sql.match(/ENGINE=InnoDB DEFAULT CHARSET=utf8mb4/g)||[]).length,required.length);
});
test("Accounts have a unique email and never plaintext password",()=>{
  assert.match(sql,/UNIQUE KEY uq_users_email \(email\)/);
  assert.match(sql,/password_hash VARCHAR\(255\) NOT NULL/);
  assert.doesNotMatch(sql,/\bpassword_plaintext\b|\bcredit_card_number\b/);
});
test("Each organization membership is unique and tenant-scoped",()=>{
  assert.match(sql,/PRIMARY KEY \(organization_id,user_id\)/);
  assert.match(sql,/role ENUM\('owner','organizer','viewer'\)/);
  assert.match(sql,/fk_memberships_org FOREIGN KEY \(organization_id\)/);
  assert.match(sql,/fk_memberships_user FOREIGN KEY \(user_id\)/);
});
test("Every invitation, session, reset and verification token is stored hashed",()=>{
  for(const name of ["organization_invitations","auth_sessions","email_verification_tokens","password_reset_tokens"]){
    const fragment=sql.split("CREATE TABLE IF NOT EXISTS "+name+" (")[1]?.split(") ENGINE=InnoDB")[0];
    assert.ok(fragment,name);
    assert.match(fragment,/token_sha256 CHAR\(64\) NOT NULL/);
    assert.match(fragment,/UNIQUE KEY .*token \(token_sha256\)/);
    assert.match(fragment,/expires_at DATETIME\(6\) NOT NULL/);
    assert.doesNotMatch(fragment,/raw_token/);
  }
});
test("Invitations are not automatically active memberships",()=>{
  assert.match(sql,/organization_invitations/);
  assert.match(sql,/accepted_at DATETIME\(6\) NULL/);
  assert.match(sql,/revoked_at DATETIME\(6\) NULL/);
  assert.match(sql,/role ENUM\('organizer','viewer'\)/);
});
test("License and plan belong to organization, not the human account",()=>{
  assert.match(sql,/CREATE TABLE IF NOT EXISTS organization_licenses/);
  assert.match(sql,/UNIQUE KEY uq_one_license_per_org \(organization_id\)/);
  assert.match(sql,/CREATE TABLE IF NOT EXISTS license_plans/);
  assert.match(sql,/price_cents INT UNSIGNED NULL/);
  assert.match(sql,/is_public TINYINT\(1\) NOT NULL DEFAULT 0/);
});
test("No paid price or subscriptions are silently seeded",()=>{
  assert.doesNotMatch(sql,/INSERT INTO (users|organizations|license_plans|organization_licenses)/i);
  assert.doesNotMatch(sql,/Stripe|Mollie|PayPal/);
});
test("Private DB driver uses environment variables and prepared statements",()=>{
  for(const env of ["TENNILO_DB_HOST","TENNILO_DB_NAME","TENNILO_DB_USER","TENNILO_DB_PASSWORD"]){
    assert.ok(db.includes(env),env);
  }
  assert.match(db,/PDO::ATTR_EMULATE_PREPARES => false/);
  assert.doesNotMatch(db,/(?:\$user\s*=\s*["\x27]root["\x27]|passwort123)/);
});
test("Migration CLI needs explicit approval and records checksums",()=>{
  assert.match(migrator,/PHP_SAPI !== 'cli'/);
  assert.match(migrator,/TENNILO_DB_ALLOW_MIGRATE/);
  assert.match(migrator,/--apply/);
  assert.match(migrator,/sha256/);
  assert.match(migrator,/hash_equals/);
});
test("Current FTPS deploy does not upload private backend, schemas or credentials",()=>{
  assert.doesNotMatch(deploy,/for file in [^\n]*backend\//);
  assert.doesNotMatch(deploy,/for file in [^\n]*\.sql/);
  assert.match(deploy,/if: github.event_name == 'workflow_dispatch'/);
});
test("Application policy separates owner, organizer, viewer and global administrator",()=>{
  assert.match(policy,/'owner'/);
  assert.match(policy,/'organizer'/);
  assert.match(policy,/'viewer'/);
  assert.match(policy,/members.manage/);
  assert.match(policy,/billing.manage/);
  assert.match(policy,/assertOtherActiveOwnerExists/);
  assert.match(sql,/CREATE TABLE IF NOT EXISTS platform_administrators/);
});
