import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {extractMailAction, clearMailFragment} from '../backend/staging-ui/konto-client.mjs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const html = read('backend/staging-ui/konto.html');
const ui = read('backend/staging-ui/konto.mjs');
const styles = read('backend/staging-ui/konto.css');
const deployment = read('.github/workflows/deploy.yml');
const api = read('backend/src/ApiKernel.php');

test('B0.2 one-time links accept only known purposes and 256-bit lowercase hex tokens', () => {
  const token = 'a'.repeat(64);
  assert.deepEqual(extractMailAction('#verify=' + token), {kind: 'verify', token});
  assert.deepEqual(extractMailAction('#reset=' + token), {kind: 'reset', token});
  assert.deepEqual(extractMailAction('#invite=' + token), {kind: 'invite', token});
  for (const invalid of ['#verify=123', '#unknown=' + token, '#invite=' + token.toUpperCase(), '#reset=' + token + '&extra=1', '', '#verify=' + token + '%0A']) {
    assert.equal(extractMailAction(invalid), null);
  }
});

test('B0.2 mail token fragment is removed from the browser URL', () => {
  const changes = [];
  const loc = {pathname: '/konto.html', search: '?from=mail', hash: '#verify=' + 'a'.repeat(64)};
  clearMailFragment(loc, {replaceState: (...args) => changes.push(args)});
  assert.deepEqual(changes, [[null, '', '/konto.html?from=mail']]);
  changes.length = 0;
  clearMailFragment({...loc, hash: ''}, {replaceState: (...args) => changes.push(args)});
  assert.deepEqual(changes, []);
});

test('B0.2 staging files are syntactically valid JavaScript modules', () => {
  for (const name of ['konto.mjs', 'konto-client.mjs']) {
    const file = new URL('../backend/staging-ui/' + name, import.meta.url);
    execFileSync(process.execPath, ['--check', file.pathname]);
  }
});

test('B0.2 staging page is noindexed, same-origin only and has no inline scripts', () => {
  assert.match(html, /noindex,nofollow,noarchive/);
  assert.match(html, /Content-Security-Policy/);
  assert.match(html, /connect-src 'self'/);
  assert.match(html, /referrer" content="no-referrer"/);
  assert.match(html, /type="module" src="\.\/konto\.mjs"/);
  assert.doesNotMatch(html, /<script(?![^>]*src=)/i);
  assert.match(styles, /--navy:#082b35/);
});

test('B0.2 UI uses the implemented server routes and no persistent credential storage', () => {
  const routes = [
    '/auth/register', '/auth/resend-verification', '/auth/verify',
    '/auth/login', '/auth/me', '/auth/logout',
    '/auth/password/request', '/auth/password/complete',
    '/clubs', '/invitations/accept'
  ];
  for (const route of routes) {
    assert.ok(ui.includes("'" + route + "'"), 'Missing account UI route ' + route);
    assert.ok(api.includes("'" + route + "'"), 'Missing API route ' + route);
  }
  assert.match(ui, /credentials: 'same-origin'/);
  assert.match(ui, /X-TENNILO-CSRF/);
  assert.match(ui, /textContent/);
  assert.doesNotMatch(ui, /(?:localStorage|sessionStorage|innerHTML)/);
  assert.doesNotMatch(ui, /console\.log/);
});

test('B0.2 staging UI is not part of the manually published FTPS allowlist', () => {
  assert.doesNotMatch(deployment, /backend\/staging-ui/);
  assert.doesNotMatch(deployment, /konto\.html|konto\.mjs|konto\.css/);
  assert.match(deployment, /workflow_dispatch/);
});
