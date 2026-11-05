import {extractMailAction, clearMailFragment} from './konto-client.mjs';

const $ = id => document.getElementById(id);
const content = $('content');
const feedback = $('feedback');
const state = {user: null, clubs: [], members: [], selectedId: null, action: null, view: 'login'};
const roleNames = {owner: 'Besitzer', organizer: 'Organisator', viewer: 'Leser'};
const routeId = id => /^[a-f0-9-]{36}$/.test(String(id)) ? id : '';

function el(tag, text, className) {
  const element = document.createElement(tag);
  if (text !== undefined && text !== null) element.textContent = String(text);
  if (className) element.className = className;
  return element;
}

function flash(message = '', error = false) {
  feedback.hidden = !message;
  feedback.textContent = message;
  feedback.className = 'feedback' + (error ? ' error' : '');
  feedback.setAttribute('role', error ? 'alert' : 'status');
}

function button(text, action, className = 'btn secondary') {
  const control = el('button', text, className);
  control.type = 'button';
  control.addEventListener('click', action);
  return control;
}

function field({name, label, type = 'text', value = '', autocomplete = 'off', hint = '', options, minLength, maxLength, pattern}) {
  const wrapper = el('label', null, 'field');
  wrapper.append(el('span', label));
  let input;
  if (options) {
    input = el('select');
    for (const [optionValue, caption] of options) {
      const opt = el('option', caption);
      opt.value = optionValue;
      input.append(opt);
    }
  } else {
    input = el('input');
    input.type = type;
    input.value = value;
    input.autocomplete = autocomplete;
    if (minLength) input.minLength = minLength;
    if (maxLength) input.maxLength = maxLength;
    if (pattern) input.pattern = pattern;
  }
  input.name = name;
  input.required = true;
  wrapper.append(input);
  if (hint) wrapper.append(el('small', hint, 'hint'));
  return wrapper;
}

function form(fields, submitText, onSubmit) {
  const f = el('form', null, 'form');
  f.noValidate = false;
  fields.forEach(def => f.append(field(def)));
  const submit = el('button', submitText, 'btn primary');
  submit.type = 'submit';
  f.append(submit);
  f.addEventListener('submit', event => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(f).entries());
    run(() => onSubmit(values), submit);
  });
  return f;
}

async function run(action, control) {
  flash();
  if (control) control.disabled = true;
  try {
    await action();
    return true;
  } catch (error) {
    flash(error && error.message ? error.message : 'Aktion fehlgeschlagen.', true);
    return false;
  } finally {
    if (control) control.disabled = false;
  }
}

function csrfCookie() {
  const piece = document.cookie.split(';').map(v => v.trim()).find(v => v.startsWith('__Host-tennilo_csrf='));
  return piece ? piece.slice('__Host-tennilo_csrf='.length) : '';
}

async function api(method, route, payload) {
  const endpoint = new URL('./api/index.php', document.baseURI);
  endpoint.searchParams.set('route', route);
  const headers = {Accept: 'application/json'};
  const options = {
    method, credentials: 'same-origin', headers, cache: 'no-store',
    redirect: 'error', referrerPolicy: 'no-referrer'
  };
  if (method !== 'GET') {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(payload || {});
    const csrf = csrfCookie();
    if (csrf) headers['X-TENNILO-CSRF'] = csrf;
  }
  let response;
  try {
    response = await fetch(endpoint, options);
  } catch {
    throw new Error('Das Testsystem ist nicht erreichbar.');
  }
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error('Unerwartete Serverantwort.');
  }
  if (!response.ok) {
    const error = new Error(data && typeof data.error === 'string' ? data.error : 'Anfrage nicht möglich.');
    error.status = response.status;
    throw error;
  }
  return data;
}

function setView(view) {
  state.view = view;
  draw();
}

function header(title, description) {
  $('view-title').textContent = title;
  $('view-description').textContent = description;
  content.replaceChildren();
  flash();
}

function extraActions(actions) {
  const group = el('div', null, 'split');
  for (const [text, view] of actions) {
    group.append(button(text, () => setView(view), 'link'));
  }
  content.append(group);
}

function showLogin() {
  header('Anmelden', 'Melde dich mit deinem bestätigten TENNILO-Konto an.');
  content.append(form([
    {name: 'email', label: 'E-Mail-Adresse', type: 'email', autocomplete: 'username', maxLength: 254},
    {name: 'password', label: 'Passwort', type: 'password', autocomplete: 'current-password'}
  ], 'Anmelden', async data => {
    await api('POST', '/auth/login', data);
    const me = await api('GET', '/auth/me');
    state.user = me.user;
    await loadClubs();
    setView(state.action && state.action.kind === 'invite' ? 'invite' : 'clubs');
  }));
  extraActions([['Passwort vergessen?', 'request'], ['Neues Konto erstellen', 'register']]);
  if (state.action && state.action.kind === 'invite') {
    content.append(el('p', 'Nach dem Anmelden kannst du die Einladung annehmen.', 'muted'));
  }
}

function showRegister() {
  header('Konto erstellen', 'Für Turnierleitungen und Vereinsmitglieder. Die E-Mail muss danach bestätigt werden.');
  content.append(form([
    {name: 'displayName', label: 'Name', autocomplete: 'name', maxLength: 120},
    {name: 'email', label: 'E-Mail-Adresse', type: 'email', autocomplete: 'email', maxLength: 254},
    {name: 'password', label: 'Passwort (mindestens 12 Zeichen)', type: 'password', autocomplete: 'new-password', minLength: 12, hint: 'Verwende ein einzigartiges Passwort.'},
    {name: 'confirm', label: 'Passwort wiederholen', type: 'password', autocomplete: 'new-password', minLength: 12}
  ], 'Registrierung anfordern', async data => {
    if (data.password !== data.confirm) throw new Error('Die Passwörter stimmen nicht überein.');
    await api('POST', '/auth/register', {
      displayName: data.displayName, email: data.email, password: data.password
    });
    setView('resend');
    flash('Falls die Registrierung möglich ist, wurde ein Bestätigungslink per E-Mail versendet.');
  }));
  extraActions([['Bereits registriert? Anmelden', 'login']]);
}

function showResend() {
  header('E-Mail bestätigen', 'Wenn du noch keine Bestätigung erhalten hast, kannst du einen neuen Link anfordern.');
  content.append(form([
    {name: 'email', label: 'E-Mail-Adresse', type: 'email', autocomplete: 'email', maxLength: 254}
  ], 'Bestätigungslink anfordern', async data => {
    await api('POST', '/auth/resend-verification', data);
    flash('Falls möglich, wurde ein neuer Bestätigungslink versendet.');
  }));
  extraActions([['Zur Anmeldung', 'login']]);
}

function showVerify() {
  header('E-Mail bestätigen', 'Schließe die Registrierung mit deinem einmaligen Bestätigungslink ab.');
  if (!state.action || state.action.kind !== 'verify') {
    content.append(el('p', 'Kein gültiger Bestätigungslink vorhanden.', 'muted'));
  } else {
    const confirm = button('E-Mail jetzt bestätigen', () => run(async () => {
      await api('POST', '/auth/verify', {token: state.action.token});
      state.action = null;
      setView(state.user ? 'clubs' : 'login');
      flash('Deine E-Mail ist bestätigt. Du kannst dich anmelden.');
    }, confirm), 'btn primary');
    content.append(confirm);
  }
  extraActions([['Link erneut anfordern', 'resend'], ['Zur Anmeldung', 'login']]);
}

function showRequestReset() {
  header('Passwort zurücksetzen', 'Wir senden dir einen einmaligen Link, falls ein Konto für diese Adresse besteht.');
  content.append(form([
    {name: 'email', label: 'E-Mail-Adresse', type: 'email', autocomplete: 'email', maxLength: 254}
  ], 'Passwort-Link anfordern', async data => {
    await api('POST', '/auth/password/request', data);
    flash('Falls das Konto existiert, wurde ein Link verschickt.');
  }));
  extraActions([['Zur Anmeldung', 'login']]);
}

function showCompleteReset() {
  header('Neues Passwort', 'Der Link ist einmalig und nur begrenzte Zeit gültig.');
  if (!state.action || state.action.kind !== 'reset') {
    content.append(el('p', 'Kein gültiger Passwort-Link vorhanden.', 'muted'));
  } else {
    content.append(form([
      {name: 'newPassword', label: 'Neues Passwort (mindestens 12 Zeichen)', type: 'password', autocomplete: 'new-password', minLength: 12},
      {name: 'confirm', label: 'Neues Passwort wiederholen', type: 'password', autocomplete: 'new-password', minLength: 12}
    ], 'Passwort ändern', async data => {
      if (data.newPassword !== data.confirm) throw new Error('Die Passwörter stimmen nicht überein.');
      await api('POST', '/auth/password/complete', {
        token: state.action.token, newPassword: data.newPassword
      });
      state.action = null;
      state.user = null;
      state.clubs = [];
      state.members = [];
      setView('login');
      flash('Passwort geändert. Bitte melde dich erneut an.');
    }));
  }
  extraActions([['Neuen Link anfordern', 'request'], ['Zur Anmeldung', 'login']]);
}

async function loadMembers() {
  if (!state.selectedId) {
    state.members = [];
    return;
  }
  const data = await api('GET', '/clubs/' + routeId(state.selectedId) + '/members');
  state.members = Array.isArray(data.members) ? data.members : [];
}

async function loadClubs(preferredId) {
  const result = await api('GET', '/clubs');
  state.clubs = Array.isArray(result.clubs) ? result.clubs : [];
  const previous = preferredId || state.selectedId;
  const selected = state.clubs.find(club => club.id === previous) || state.clubs[0];
  state.selectedId = selected ? selected.id : null;
  await loadMembers();
}

function showInvite() {
  header('Vereinseinladung', 'Nimm die Einladung mit dem Konto an, an dessen E-Mail-Adresse sie gesendet wurde.');
  if (!state.action || state.action.kind !== 'invite') {
    content.append(el('p', 'Kein gültiger Einladungslink vorhanden.', 'muted'));
  } else if (!state.user) {
    content.append(el('p', 'Bitte melde dich zuerst an. Falls du noch kein Konto hast, registriere dich mit der eingeladenen E-Mail-Adresse.', 'muted'));
    content.append(button('Anmelden', () => setView('login'), 'btn primary'));
    extraActions([['Konto erstellen', 'register']]);
  } else {
    content.append(el('p', 'Angemeldet als ' + state.user.email + '.', 'muted'));
    const accept = button('Einladung annehmen', () => run(async () => {
      const result = await api('POST', '/invitations/accept', {token: state.action.token});
      state.action = null;
      await loadClubs(result.organizationId);
      setView('clubs');
      flash('Du bist dem Verein beigetreten.');
    }, accept), 'btn primary');
    content.append(accept);
    extraActions([['Zur Vereinsübersicht', 'clubs']]);
  }
}

function suggestedSlug(name) {
  return String(name).trim().toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80).replace(/-+$/g, '');
}

function showCreateClub() {
  if (!state.user) { setView('login'); return; }
  header('Verein anlegen', 'Du wirst automatisch Besitzer dieses Vereins. Eine kostenpflichtige Lizenz wird nicht angelegt.');
  const clubForm = form([
    {name: 'name', label: 'Vereins- oder Organisationsname', maxLength: 160, autocomplete: 'organization'},
    {name: 'slug', label: 'Kurzname (für interne URLs)', minLength: 3, maxLength: 80,
      pattern: '[a-z0-9][a-z0-9-]{1,78}[a-z0-9]', hint: 'Kleinbuchstaben, Zahlen und Bindestriche; mindestens 3 Zeichen.'}
  ], 'Verein anlegen', async data => {
    const created = await api('POST', '/clubs', data);
    await loadClubs(created.id);
    setView('clubs');
    flash('Verein erfolgreich angelegt.');
  });
  const nameInput = clubForm.elements.namedItem('name');
  const slugInput = clubForm.elements.namedItem('slug');
  let customized = false;
  slugInput.addEventListener('input', () => { customized = true; });
  nameInput.addEventListener('input', () => {
    if (!customized) slugInput.value = suggestedSlug(nameInput.value);
  });
  content.append(clubForm);
  extraActions([['Zur Vereinsübersicht', 'clubs']]);
}

function showClubs() {
  if (!state.user) { setView('login'); return; }
  header('Deine Vereine', 'Wähle einen Verein, verwalte Mitglieder oder lege eine Organisation an.');
  const head = el('div', null, 'account-head');
  head.append(el('strong', state.user.displayName), el('span', state.user.email));
  head.append(button('Abmelden', () => run(async () => {
    await api('POST', '/auth/logout');
    state.user = null;
    state.clubs = [];
    state.members = [];
    state.selectedId = null;
    setView('login');
    flash('Du bist abgemeldet.');
  }), 'link'));
  content.append(head);

  const list = el('div', null, 'club-list');
  for (const club of state.clubs) {
    const selected = club.id === state.selectedId;
    const item = button('', () => run(async () => {
      const previousId = state.selectedId;
      try {
        state.selectedId = club.id;
        await loadMembers();
        setView('clubs');
      } catch (error) {
        state.selectedId = previousId;
        throw error;
      }
    }), 'club-button' + (selected ? ' selected' : ''));
    const name = el('span');
    name.append(el('strong', club.name), el('small', club.slug));
    item.append(name, el('span', roleNames[club.role] || club.role, 'tag'));
    list.append(item);
  }
  content.append(list);
  if (!state.clubs.length) content.append(el('p', 'Noch kein Verein vorhanden. Lege deinen ersten Verein an.', 'muted'));
  content.append(button('Neuen Verein anlegen', () => setView('create'), 'btn primary'));

  const active = state.clubs.find(club => club.id === state.selectedId);
  if (!active) return;
  content.append(el('div', null, 'divider'));
  content.append(el('h3', 'Mitglieder · ' + active.name, 'subhead'));
  const members = el('ul', null, 'member-list');
  for (const member of state.members) {
    const item = el('li');
    const name = el('div', null, 'member-name');
    name.append(el('strong', member.display_name || member.email));
    name.append(el('small', member.email + ' · ' + (roleNames[member.role] || member.role)));
    item.append(name);
    if (active.role === 'owner' && member.user_id !== state.user.id) {
      const actions = el('div', null, 'member-actions');
      const roleSelect = el('select');
      roleSelect.setAttribute('aria-label', 'Rolle von ' + (member.display_name || member.email));
      for (const role of ['owner', 'organizer', 'viewer']) {
        const opt = el('option', roleNames[role]);
        opt.value = role;
        if (member.role === role) opt.selected = true;
        roleSelect.append(opt);
      }
      roleSelect.addEventListener('change', () => {
        const next = roleSelect.value;
        if (!confirm('Rolle dieses Mitglieds wirklich ändern?')) {
          roleSelect.value = member.role;
          return;
        }
        run(async () => {
          await api('PATCH', '/clubs/' + routeId(active.id) + '/members/' + routeId(member.user_id), {role: next});
          await loadMembers();
          setView('clubs');
          flash('Rolle aktualisiert.');
        }, roleSelect).then(success => { if (!success) roleSelect.value = member.role; });
      });
      actions.append(roleSelect);
      actions.append(button('Entfernen', () => {
        if (!confirm('Dieses Mitglied wirklich aus dem Verein entfernen?')) return;
        run(async () => {
          await api('DELETE', '/clubs/' + routeId(active.id) + '/members/' + routeId(member.user_id));
          await loadMembers();
          setView('clubs');
          flash('Mitglied entfernt.');
        });
      }, 'btn small danger'));
      item.append(actions);
    } else {
      item.append(el('span', roleNames[member.role] || member.role, 'tag'));
    }
    members.append(item);
  }
  content.append(members);
  if (active.role !== 'owner') {
    content.append(el('p', 'Nur Besitzer können Mitglieder einladen oder Rollen ändern.', 'muted'));
    return;
  }
  content.append(el('h3', 'Mitglied einladen', 'subhead'));
  content.append(form([
    {name: 'email', label: 'E-Mail-Adresse', type: 'email', autocomplete: 'off', maxLength: 254},
    {name: 'role', label: 'Rolle', options: [['organizer', 'Organisator'], ['viewer', 'Leser']]}
  ], 'Einladung versenden', async data => {
    await api('POST', '/clubs/' + routeId(active.id) + '/invitations', data);
    flash('Wenn die Einladung zugestellt werden konnte, erhält die Person einen Link.');
  }));
}

function draw() {
  const pages = {
    login: showLogin, register: showRegister, resend: showResend, verify: showVerify,
    request: showRequestReset, reset: showCompleteReset, invite: showInvite,
    create: showCreateClub, clubs: showClubs
  };
  (pages[state.view] || showLogin)();
}

async function initialize() {
  const fragment = window.location.hash;
  state.action = extractMailAction(fragment);
  clearMailFragment(window.location, window.history);
  let startupError = '';
  try {
    const result = await api('GET', '/auth/me');
    state.user = result.user;
    await loadClubs();
  } catch (error) {
    if (error.status !== 400 && error.status !== 403) {
      startupError = 'Die Konto-API ist noch nicht verfügbar. Diese Seite ist nur für die spätere gesicherte Testumgebung vorgesehen.';
    }
  }
  if (state.action) {
    state.view = state.action.kind === 'verify' ? 'verify' : state.action.kind === 'reset' ? 'reset' : 'invite';
  } else {
    state.view = state.user ? 'clubs' : 'login';
  }
  draw();
  if (startupError) flash(startupError, true);
  else if (fragment && !state.action) flash('Der aufgerufene Link ist ungültig.', true);
}

initialize();
