<?php
declare(strict_types=1);

require_once __DIR__ . '/roadmap-lib.php';

/**
 * TENNILO Roadmap API. Roadmap data is sent only after a verified personal
 * login. Accounts use password_hash/password_verify and one-time registration
 * links. Existing code-based users can migrate safely.
 * This is NOT the unpublished TENNILO account/licensing backend.
 */
const RM_MAX_REQUEST = 12000;
header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: no-store, private, max-age=0');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Referrer-Policy: no-referrer');

function rm_reply(array $payload, int $code=200): never {
    http_response_code($code);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE | JSON_THROW_ON_ERROR);
    exit;
}

function rm_is_https(): bool {
    return (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ||
        (string) ($_SERVER['SERVER_PORT'] ?? '') === '443';
}

function rm_storage(): array {
    // Existing ALL-INKL FTP sibling folder: no SSH and no server env var needed.
    // If the operator intentionally sets a private absolute path, honor it.
    $custom = trim((string) (getenv('TENNILO_ROADMAP_STORAGE_DIR') ?: ''));
    return rm_storage_location(__DIR__, (string) ($_SERVER['DOCUMENT_ROOT'] ?? __DIR__),
        $custom, sys_get_temp_dir());
}

function rm_load_state(string $file, array $seed, array $retiredIds = []): array {
    if (!is_file($file)) return rm_merge([], $seed, $retiredIds);
    $raw = @file_get_contents($file);
    if ($raw === false || strlen($raw) > 3500000) rm_error(503, 'Roadmap-Speicher nicht lesbar.');
    $saved = json_decode($raw, true);
    if (!is_array($saved) || ($saved['schemaVersion'] ?? 1) !== 1) {
        rm_error(503, 'Roadmap-Speicher hat eine ungültige Version.');
    }
    return rm_merge($saved, $seed, $retiredIds);
}

function rm_write_state(string $dir, array $state): void {
    $data = json_encode($state, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE | JSON_THROW_ON_ERROR);
    if (strlen($data) > 3000000) rm_error(413, 'Roadmap-Speicher ist voll.');
    $tmp = tempnam($dir, '.roadmap-write-');
    if ($tmp === false || !@chmod($tmp, 0600) || file_put_contents($tmp, $data) !== strlen($data) ||
        !@rename($tmp, $dir . '/state.json')) {
        if (is_string($tmp)) @unlink($tmp);
        rm_error(503, 'Roadmap konnte nicht gespeichert werden.');
    }
}

function rm_identity(array $state): array {
    $account = $_SESSION['roadmapAccount'] ?? null;
    $proof = $_SESSION['roadmapCredentialProof'] ?? null;
    if (is_string($account) && is_string($proof)) {
        $entry = $account === 'owner' ? ($state['ownerAccount'] ?? null) : null;
        if ($account !== 'owner') foreach ($state['invites'] as $member) {
            if (($member['id'] ?? null) === $account) { $entry = $member; break; }
        }
        if (is_array($entry) && is_string($entry['passwordHash'] ?? null) &&
            hash_equals(hash('sha256',$entry['passwordHash']), $proof)) {
            return ['role'=>$account==='owner'?'admin':
                (($entry['role'] ?? '')==='viewer'?'viewer':'commenter'),
                'label'=>$account==='owner'?'Projektleitung':$entry['label'],
                'account'=>true,'username'=>$entry['username']];
        }
        unset($_SESSION['roadmapAccount'], $_SESSION['roadmapCredentialProof']);
    }
    $hash = $_SESSION['roadmapHash'] ?? null;
    if (!is_string($hash)) return ['role'=>'guest', 'label'=>'Gast','account'=>false];
    if (is_string($state['adminHash']) && hash_equals($state['adminHash'], $hash))
        return ['role'=>'admin','label'=>'Projektleitung','account'=>false];
    foreach ($state['invites'] as $member) {
        if (is_array($member) && is_string($member['hash'] ?? null) &&
            hash_equals($member['hash'], $hash)) {
            return ['role' => $member['role'] === 'viewer' ? 'viewer' : 'commenter',
                'label'=>$member['label'],'account'=>false];
        }
    }
    unset($_SESSION['roadmapHash']);
    return ['role'=>'guest','label'=>'Gast','account'=>false];
}
function rm_account_session(string $id, string $passwordHash): void {
    session_regenerate_id(true);
    unset($_SESSION['roadmapHash']);
    $_SESSION['roadmapAccount'] = $id;
    $_SESSION['roadmapCredentialProof'] = hash('sha256', $passwordHash);
}
function rm_login_rate(?bool $failed, string $dir): void {
    // Persisted rate limiting to prevent bypass simply by clearing session cookies.
    // The private directory is outside the web root.
    $remote = (string)($_SERVER['REMOTE_ADDR'] ?? 'unknown');
    $file = $dir . '/.login-rate-' . hash('sha256', $remote);
    $now = time();
    $entry = is_file($file) ? json_decode((string)@file_get_contents($file),true) : null;
    if (!is_array($entry) || (int)($entry['until']??0) <= $now) {
        $entry = ['until'=>$now+900,'failures'=>0];
    }
    if ((int)$entry['failures'] >= 5) {
        rm_error(429, 'Zu viele Anmeldeversuche. Bitte später erneut versuchen.');
    }
    if ($failed === true) {
        $entry['failures']++;
        if (@file_put_contents($file, json_encode($entry), LOCK_EX) === false ||
            !@chmod($file, 0600)) {
            rm_error(503, 'Anmeldeschutz nicht verfügbar.');
        }
    } elseif ($failed === false) {
        if (is_file($file)) @unlink($file);
    }
}

function rm_members(array $state): array {
    $list = [];
    foreach ($state['invites'] as $member) {
        $list[] = ['id'=>$member['id'], 'label'=>$member['label'],
            'role'=>$member['role'], 'createdAt'=>$member['createdAt'],
            'username'=>$member['username'] ?? null,
            'status'=>isset($member['passwordHash'])?'active':
                (isset($member['inviteHash'])?'invited':'legacy')];
    }
    return $list;
}

try {
    if (!rm_is_https()) rm_error(403, 'Roadmap erfordert HTTPS.');
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    if (!in_array($method, ['GET','POST'], true)) {
        header('Allow: GET, POST');
        rm_error(405, 'Methode nicht erlaubt.');
    }
    session_name('TENNILO_ROADMAP');
    session_set_cookie_params([
        'lifetime'=>0,'path'=>'/','secure'=>true,'httponly'=>true,'samesite'=>'Strict'
    ]);
    if (!session_start()) rm_error(503, 'Sitzung konnte nicht gestartet werden.');
    if (!isset($_SESSION['roadmapCsrf'])) $_SESSION['roadmapCsrf'] = bin2hex(random_bytes(24));
    [$dir, $persistent, $legacyDir] = rm_storage();
    $seedDocument = (static function (): array {
        define('TENNILO_ROADMAP_INTERNAL_SEED', true);
        return require __DIR__ . '/roadmap-seed.php';
    })();
    $seed = $seedDocument['items'] ?? null;
    $retiredIds = $seedDocument['retiredIds'] ?? [];
    if (!is_array($seed) || count($seed) > 250) rm_error(503, 'Roadmap-Daten ungültig.');
    $seen = [];
    foreach ($seed as $item) {
        $id = $item['id'] ?? '';
        if (!is_array($item) || !is_string($id) || !preg_match('/^[a-z0-9-]{2,70}$/D', $id)
            || isset($seen[$id]) || !in_array($item['status'] ?? '', RM_STATUSES, true)) {
            rm_error(503, 'Ungültiger Roadmap-Eintrag.');
        }
        $seen[$id] = true;
    }
    $lock = @fopen($dir . '/.state.lock', 'c');
    if ($lock === false || !flock($lock, LOCK_EX)) rm_error(503, 'Roadmap-Speicherung gesperrt.');
    // First access migrates the complete old private JSON, including accounts,
    // invitations, comments and manual edits. Keep the old file for rollback.
    // This happens before any bootstrap: missing or corrupt legacy data fails closed.
    if ($legacyDir !== null) rm_migrate_legacy_state($dir, $legacyDir);
    $state = rm_load_state($dir . '/state.json', $seed, $retiredIds);

    // Initial owner is created from the password hash generated from GitHub Secrets.
    // Migrated accounts, comments and legacy access codes remain untouched.
    define('TENNILO_ROADMAP_INTERNAL_ADMIN', true);
    $initial = require __DIR__ . '/roadmap-initial-admin.php';
    if (!is_array($initial) ||
        !is_string($initial['username'] ?? null) ||
        !is_string($initial['passwordHash'] ?? null) ||
        !preg_match('/^[a-z0-9][a-z0-9._-]{2,39}$/D', $initial['username']) ||
        strlen($initial['passwordHash']) < 40) {
        rm_error(503, 'Administratorkonto ist nicht sicher eingerichtet.');
    }
    if ($state['ownerAccount'] === null && $state['adminHash'] === null) {
        // First account; never overwrite existing owner, invite or comment records.
        $state['ownerAccount'] = [
            'username' => $initial['username'],
            'passwordHash' => $initial['passwordHash'],
            'createdAt' => gmdate('c')
        ];
        rm_write_state($dir, $state);
    } elseif (is_string($initial['resetVersion'] ?? null) &&
              preg_match('/^[0-9]{1,25}$/D', $initial['resetVersion']) &&
              !hash_equals((string)($state['ownerResetVersion'] ?? ''), $initial['resetVersion'])) {
        // Explicit workflow opt-in: restore administrator access, preserve all
        // roadmap items, comments, invitations, and user roles.
        $state['ownerAccount'] = [
            'username' => $initial['username'],
            'passwordHash' => $initial['passwordHash'],
            'createdAt' => gmdate('c')
        ];
        $state['adminHash'] = null;
        $state['ownerResetVersion'] = $initial['resetVersion'];
        rm_write_state($dir, $state);
    }

    $identity = rm_identity($state);

    if ($method === 'GET') {
        // Do not expose roadmap items or comments before login.
        if ($identity['role'] === 'guest') {
            rm_reply([
                'ok'=>true, 'items'=>[],
                'session'=>['role'=>'guest', 'label'=>'Gast',
                    'csrf'=>$_SESSION['roadmapCsrf'], 'account'=>false],
                'bootstrapAvailable'=>false, 'storagePersistent'=>$persistent,
                'members'=>[]
            ]);
        }
        if (($_GET['export'] ?? '') === '1') {
            if ($identity['role'] !== 'admin') rm_error(403, 'Nur die Projektleitung kann exportieren.');
            rm_reply(['schemaVersion'=>1,'exportedAt'=>gmdate('c'),
                'items'=>array_map('rm_public_item', rm_active_items($state)),
                'deletedItems'=>array_map('rm_public_item', rm_trashed_items($state)),
                'retiredItems'=>array_map('rm_public_item', array_values(array_filter($state['items'],
                    fn($item)=>in_array($item['id']??'', $state['retiredItemIds']??[],true))))]);
        }
        rm_reply([
            'ok'=>true,'items'=>array_map('rm_public_item', rm_active_items($state)),
            'deletedItems'=>$identity['role']==='admin'?
                array_map('rm_public_item',rm_trashed_items($state)):[],
            'session'=>['role'=>$identity['role'],'label'=>$identity['label'],
                'csrf'=>$_SESSION['roadmapCsrf'],'account'=>$identity['account']??false,
                'username'=>$identity['username']??null],
            'bootstrapAvailable'=>false,
            'storagePersistent'=>$persistent,
            'members'=>$identity['role']==='admin'?rm_members($state):[]
        ]);
    }

    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $expected = 'https://' . ($_SERVER['HTTP_HOST'] ?? '');
    if (!is_string($origin) || !hash_equals($expected, $origin) ||
        ($_SERVER['HTTP_SEC_FETCH_SITE'] ?? 'same-origin') === 'cross-site') {
        rm_error(403, 'Nur Anfragen von derselben Testseite sind erlaubt.');
    }
    if (!str_starts_with(strtolower($_SERVER['CONTENT_TYPE'] ?? ''), 'application/json')) {
        rm_error(415, 'JSON erwartet.');
    }
    if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > RM_MAX_REQUEST) rm_error(413, 'Anfrage zu groß.');
    $raw = file_get_contents('php://input', false, null, 0, RM_MAX_REQUEST + 1);
    if ($raw === false || strlen($raw) > RM_MAX_REQUEST) rm_error(413, 'Anfrage zu groß.');
    $data = json_decode($raw, true);
    if (!is_array($data)) rm_error(400, 'Ungültige Anfrage.');
    if (!is_string($data['csrf'] ?? null) ||
        !hash_equals($_SESSION['roadmapCsrf'], $data['csrf'])) {
        rm_error(403, 'Sitzung ungültig. Seite neu laden.');
    }
    $action = $data['action'] ?? '';
    if ($identity['role'] === 'guest' &&
        !in_array($action, ['login-account','register-invite','login'], true)) {
        rm_error(403, 'Bitte zuerst mit deinem persönlichen Konto anmelden.');
    }
    $now = gmdate('c');
    $response = ['ok'=>true];

    // Login and bootstrap use the same CSRF and HTTPS checks as all writes.
    if ($action === 'login-account') {
        rm_login_rate(null, $dir); // Check before verifying credentials.
        $username = rm_username($data['username'] ?? null);
        $password = is_string($data['password'] ?? null) ? $data['password'] : '';
        $id = rm_authenticate($state, $username, $password);
        if ($id === null) {
            rm_login_rate(true, $dir);
            rm_error(403, 'Benutzername oder Passwort nicht korrekt.');
        }
        $entry = $id === 'owner' ? $state['ownerAccount'] :
            current(array_filter($state['invites'], fn($m)=>($m['id']??null)===$id));
        rm_account_session($id, $entry['passwordHash']);
        rm_login_rate(false, $dir);
    } elseif ($action === 'register-invite') {
        $token = $data['token'] ?? null;
        if (!rm_valid_code($token)) rm_error(403, 'Einladungslink ungültig oder abgelaufen.');
        $hash = hash('sha256', $token);
        $index = null;
        foreach ($state['invites'] as $i=>$member) {
            if (is_string($member['inviteHash'] ?? null) &&
                hash_equals($member['inviteHash'], $hash) &&
                strtotime($member['expiresAt'] ?? '') >= time()) {
                $index = $i; break;
            }
        }
        if ($index === null) rm_error(403, 'Einladungslink ungültig oder abgelaufen.');
        $username = rm_username($data['username'] ?? null);
        if (rm_user_exists($state, $username)) rm_error(409, 'Dieser Benutzername ist bereits vergeben.');
        $password = rm_password($data['password'] ?? null);
        $state['invites'][$index]['username'] = $username;
        $state['invites'][$index]['passwordHash'] = password_hash($password, PASSWORD_DEFAULT);
        $state['invites'][$index]['claimedAt'] = $now;
        unset($state['invites'][$index]['inviteHash'],$state['invites'][$index]['expiresAt']);
        rm_account_session($state['invites'][$index]['id'], $state['invites'][$index]['passwordHash']);
        rm_write_state($dir, $state);
    } elseif ($action === 'upgrade-account') {
        if (($identity['role'] ?? 'guest') === 'guest' || ($identity['account'] ?? false))
            rm_error(403, 'Zuerst mit dem bisherigen Zugang anmelden.');
        $username = rm_username($data['username'] ?? null);
        if (rm_user_exists($state, $username)) rm_error(409, 'Dieser Benutzername ist bereits vergeben.');
        $password = rm_password($data['password'] ?? null);
        $passwordHash = password_hash($password, PASSWORD_DEFAULT);
        if ($identity['role']==='admin') {
            $state['ownerAccount'] = ['username'=>$username,
                'passwordHash'=>$passwordHash,'createdAt'=>$now];
            $state['adminHash'] = null; // The old owner code is now invalid.
            rm_account_session('owner', $passwordHash);
        } else {
            $hash = $_SESSION['roadmapHash'] ?? '';
            $found = false;
            foreach ($state['invites'] as &$member) {
                if (is_string($member['hash'] ?? null) && hash_equals($member['hash'],$hash)) {
                    $member['username']=$username;
                    $member['passwordHash']=$passwordHash;
                    $member['claimedAt']=$now;
                    unset($member['hash']);
                    $id=$member['id'];
                    $found = true; break;
                }
            }
            unset($member);
            if (!$found) rm_error(403, 'Bisheriger Zugang nicht gefunden.');
            rm_account_session($id,$passwordHash);
        }
        rm_write_state($dir, $state);
    } elseif ($action === 'change-password') {
        if (!($identity['account']??false)) rm_error(403, 'Bitte zuerst ein Benutzerkonto einrichten.');
        $old = is_string($data['oldPassword'] ?? null) ? $data['oldPassword'] : '';
        $next = rm_password($data['newPassword'] ?? null);
        $id = $_SESSION['roadmapAccount'] ?? null;
        if ($id === 'owner') {
            if (!password_verify($old, $state['ownerAccount']['passwordHash']))
                rm_error(403, 'Das bisherige Passwort ist nicht korrekt.');
            $state['ownerAccount']['passwordHash']=password_hash($next,PASSWORD_DEFAULT);
            rm_account_session('owner',$state['ownerAccount']['passwordHash']);
        } else {
            $found=false;
            foreach ($state['invites'] as &$member) {
                if (($member['id']??null)!==$id)continue;
                if (!password_verify($old,$member['passwordHash']))
                    rm_error(403, 'Das bisherige Passwort ist nicht korrekt.');
                $member['passwordHash']=password_hash($next,PASSWORD_DEFAULT);
                $hash=$member['passwordHash'];$found=true;break;
            }
            unset($member);
            if (!$found)rm_error(403,'Benutzerkonto nicht gefunden.');
            rm_account_session($id,$hash);
        }
        rm_write_state($dir,$state);
    } elseif ($action === 'login') {
        $code = $data['code'] ?? null;
        if (!rm_valid_code($code)) rm_error(403, 'Zugangscode ungültig.');
        $hash = hash('sha256', $code);
        $valid = is_string($state['adminHash']) && hash_equals($state['adminHash'], $hash);
        foreach ($state['invites'] as $member)
            if (is_string($member['hash'] ?? null) && hash_equals($member['hash'], $hash)) $valid = true;
        if (!$valid) rm_error(403, 'Zugangscode ungültig oder widerrufen.');
        session_regenerate_id(true);
        $_SESSION['roadmapHash'] = $hash;
    } elseif ($action === 'logout') {
        unset($_SESSION['roadmapHash'],$_SESSION['roadmapAccount'],$_SESSION['roadmapCredentialProof']);
        session_regenerate_id(true);
    } else {
        if (($_SESSION['roadmapLastWrite'] ?? 0) + 2 > time())
            rm_error(429, 'Bitte kurz warten, bevor du erneut etwas speicherst.');
        if (in_array($action, ['idea','comment'], true)) {
            if (!in_array($identity['role'], ['admin','commenter'], true))
                rm_error(403, 'Für Ideen und Kommentare ist ein Schreibzugang nötig.');
            if ($action === 'idea') {
                if (count($state['items']) >= 400) rm_error(422, 'Die Ideensammlung ist voll.');
                $idea = rm_new_item($data, $identity['label'], $now);
                $state['items'][] = $idea;
                $response['itemId'] = $idea['id'];
            } else {
                $id = rm_text($data['itemId'] ?? null, 80, 'Eintrag');
                if (!rm_is_active_item($state, $id)) rm_error(404, 'Eintrag nicht gefunden.');
                rm_add_comment($state, $id, $identity['label'], $data['text'] ?? null, $now);
            }
        } else {
            if ($identity['role'] !== 'admin') rm_error(403, 'Nur die Projektleitung kann den Status ändern.');
            if ($action === 'update') {
                $id = rm_text($data['itemId'] ?? null, 80, 'Eintrag');
                if (!rm_is_active_item($state, $id)) rm_error(404, 'Eintrag nicht gefunden.');
                rm_update_item($state, $id, $data, $now);
            } elseif ($action === 'delete-item') {
                $id = rm_text($data['itemId'] ?? null, 80, 'Eintrag');
                rm_delete_item($state, $id);
            } elseif ($action === 'restore-item') {
                $id = rm_text($data['itemId'] ?? null, 80, 'Eintrag');
                rm_restore_item($state, $id);
            } elseif ($action === 'delete-comment') {
                $id = rm_text($data['itemId'] ?? null, 80, 'Eintrag');
                if (!rm_is_active_item($state, $id)) rm_error(404, 'Eintrag nicht gefunden.');
                rm_delete_comment($state, $id,
                    rm_text($data['commentId'] ?? null, 80, 'Kommentar'), $now);
            } elseif ($action === 'rotate-owner') {
                if ($state['ownerAccount']!==null)rm_error(403,'Bitte dein Benutzerkonto verwalten.');
                $ownerCode = rm_secret();
                $state['adminHash'] = hash('sha256', $ownerCode);
                $_SESSION['roadmapHash'] = $state['adminHash'];
                $response['ownerCode'] = $ownerCode;
            } elseif ($action === 'invite') {
                if (count($state['invites']) >= 40) rm_error(422, 'Maximal 40 Zugänge.');
                $label = rm_text($data['label'] ?? null, 70, 'Name');
                $role = rm_enum($data['role'] ?? null, ['viewer','commenter'], 'Rolle');
                $code = rm_secret();
                $state['invites'][] = [
                    'id'=>'u-' . bin2hex(random_bytes(8)),
                    'label'=>$label,'role'=>$role,'hash'=>hash('sha256',$code),
                    'createdAt'=>$now
                ];
                $response['inviteCode'] = $code; // Shown once.
            } elseif ($action === 'invite-link') {
                if (count($state['invites']) >= 40) rm_error(422,'Maximal 40 Zugänge.');
                $label=rm_text($data['label']??null,70,'Name');
                $role=rm_enum($data['role']??null,['viewer','commenter'],'Rolle');
                $token=rm_secret();
                $state['invites'][]=[
                    'id'=>'u-'.bin2hex(random_bytes(8)),
                    'label'=>$label,'role'=>$role,
                    'inviteHash'=>hash('sha256',$token),
                    'expiresAt'=>gmdate('c',time()+7*86400),'createdAt'=>$now
                ];
                $response['inviteToken']=$token;
            } elseif ($action === 'set-role') {
                $id=rm_text($data['inviteId']??null,80,'Zugang');
                $role=rm_enum($data['role']??null,['viewer','commenter'],'Rolle');
                $found=false;
                foreach($state['invites'] as &$member){
                    if(($member['id']??'')!==$id)continue;
                    $member['role']=$role;$found=true;break;
                }
                unset($member);
                if(!$found)rm_error(404,'Zugang nicht gefunden.');
            } elseif ($action === 'revoke') {
                $id = rm_text($data['inviteId'] ?? null, 80, 'Zugang');
                $before = count($state['invites']);
                $state['invites'] = array_values(array_filter($state['invites'],
                    fn($member) => $member['id'] !== $id));
                if ($before === count($state['invites'])) rm_error(404, 'Zugang nicht gefunden.');
            } else {
                rm_error(400, 'Unbekannte Aktion.');
            }
        }
        $_SESSION['roadmapLastWrite'] = time();
        rm_write_state($dir, $state);
    }
    $response['session'] = rm_identity($state);
    rm_reply($response);
} catch (Throwable $error) {
    $code = (int) $error->getCode();
    if ($code < 400 || $code > 599) $code = 503;
    rm_reply(['ok'=>false,'error'=>$error->getMessage()], $code);
}
