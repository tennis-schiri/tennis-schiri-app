<?php
declare(strict_types=1);

require_once __DIR__ . '/roadmap-lib.php';

/**
 * TENNILO Roadmap API. The surrounding test-site HTTP Basic Auth protects
 * reading. A separate cryptographic invite code is required for commenting;
 * only a private owner code can change statuses and issue/revoke invitations.
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

function rm_basic_user(): ?string {
    // Only trust the identity of an Apache-authenticated request, never a raw Basic header.
    if (strtolower((string) ($_SERVER['AUTH_TYPE'] ?? '')) !== 'basic') return null;
    foreach (['REMOTE_USER','REDIRECT_REMOTE_USER','PHP_AUTH_USER'] as $key) {
        $value = $_SERVER[$key] ?? null;
        if (is_string($value) && trim($value) !== '') return $value;
    }
    return null;
}

function rm_storage(): array {
    // Operator may provide a persistent PRIVATE directory outside any webroot.
    // The default mirrors the existing live-feed's private /tmp storage model;
    // /tmp is test-only and might be purged by the hosting provider.
    $custom = trim((string) (getenv('TENNILO_ROADMAP_STORAGE_DIR') ?: ''));
    if ($custom !== '' && $custom[0] !== '/') {
        rm_error(503, 'Roadmap-Speicherpfad muss absolut sein.');
    }
    $path = $custom !== '' ? rtrim($custom, '/') :
        rtrim(sys_get_temp_dir(), '/') . '/tennilo-roadmap-' .
        substr(hash('sha256', __DIR__), 0, 24);
    if (!is_dir($path) && !@mkdir($path, 0700, true) && !is_dir($path)) {
        rm_error(503, 'Privater Roadmap-Speicher konnte nicht angelegt werden.');
    }
    $real = realpath($path);
    $web = realpath((string) ($_SERVER['DOCUMENT_ROOT'] ?? __DIR__));
    $app = realpath(__DIR__);
    if ($real === false || !is_writable($real) || $app === false ||
        $real === $app || str_starts_with($real, $app . DIRECTORY_SEPARATOR) ||
        ($web !== false && ($real === $web || str_starts_with($real, $web . DIRECTORY_SEPARATOR)))) {
        rm_error(503, 'Roadmap-Speicher muss außerhalb des öffentlich erreichbaren Webverzeichnisses liegen.');
    }
    return [$real, $custom !== ''];
}

function rm_load_state(string $file, array $seed): array {
    if (!is_file($file)) return rm_merge([], $seed);
    $raw = @file_get_contents($file);
    if ($raw === false || strlen($raw) > 3500000) rm_error(503, 'Roadmap-Speicher nicht lesbar.');
    $saved = json_decode($raw, true);
    if (!is_array($saved) || ($saved['schemaVersion'] ?? 1) !== 1) {
        rm_error(503, 'Roadmap-Speicher hat eine ungültige Version.');
    }
    return rm_merge($saved, $seed);
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
    $hash = $_SESSION['roadmapHash'] ?? null;
    if (!is_string($hash)) return ['role'=>'guest', 'label'=>'Gast'];
    if (is_string($state['adminHash']) && hash_equals($state['adminHash'], $hash))
        return ['role'=>'admin','label'=>'Projektleitung'];
    foreach ($state['invites'] as $member) {
        if (is_array($member) && is_string($member['hash'] ?? null) &&
            hash_equals($member['hash'], $hash)) {
            return ['role' => $member['role'] === 'viewer' ? 'viewer' : 'commenter',
                'label'=>$member['label']];
        }
    }
    unset($_SESSION['roadmapHash']);
    return ['role'=>'guest','label'=>'Gast'];
}

function rm_members(array $state): array {
    $list = [];
    foreach ($state['invites'] as $member) {
        $list[] = ['id'=>$member['id'], 'label'=>$member['label'],
            'role'=>$member['role'], 'createdAt'=>$member['createdAt']];
    }
    return $list;
}

try {
    if (!rm_is_https()) rm_error(403, 'Roadmap erfordert HTTPS.');
    if (rm_basic_user() === null) rm_error(403, 'Roadmap benötigt den Passwortschutz der Testseite.');
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
    [$dir, $persistent] = rm_storage();
    $seed = rm_seed(__DIR__ . '/roadmap-seed.json');
    $lock = @fopen($dir . '/.state.lock', 'c');
    if ($lock === false || !flock($lock, LOCK_EX)) rm_error(503, 'Roadmap-Speicherung gesperrt.');
    $state = rm_load_state($dir . '/state.json', $seed);
    $identity = rm_identity($state);

    if ($method === 'GET') {
        if (($_GET['export'] ?? '') === '1') {
            if ($identity['role'] !== 'admin') rm_error(403, 'Nur die Projektleitung kann exportieren.');
            rm_reply(['schemaVersion'=>1,'exportedAt'=>gmdate('c'),
                'items'=>array_map('rm_public_item', $state['items'])]);
        }
        rm_reply([
            'ok'=>true,'items'=>array_map('rm_public_item', $state['items']),
            'session'=>['role'=>$identity['role'],'label'=>$identity['label'],
                'csrf'=>$_SESSION['roadmapCsrf']],
            'bootstrapAvailable'=>$state['adminHash']===null && rm_basic_user()!==null,
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
    $now = gmdate('c');
    $response = ['ok'=>true];

    // Login and bootstrap use the same CSRF and HTTPS checks as all writes.
    if ($action === 'login') {
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
        unset($_SESSION['roadmapHash']);
        session_regenerate_id(true);
    } elseif ($action === 'bootstrap') {
        if ($state['adminHash'] !== null || rm_basic_user() === null)
            rm_error(403, 'Die erstmalige Einrichtung ist nicht verfügbar.');
        $ownerCode = rm_secret();
        $state['adminHash'] = hash('sha256', $ownerCode);
        session_regenerate_id(true);
        $_SESSION['roadmapHash'] = $state['adminHash'];
        $response['ownerCode'] = $ownerCode; // Shown ONCE. Never saved in plaintext.
        rm_write_state($dir, $state);
    } else {
        if (($_SESSION['roadmapLastWrite'] ?? 0) + 2 > time())
            rm_error(429, 'Bitte kurz warten, bevor du erneut etwas speicherst.');
        if (in_array($action, ['idea','comment'], true)) {
            if (!in_array($identity['role'], ['admin','commenter'], true))
                rm_error(403, 'Für Ideen und Kommentare ist ein Schreibzugang nötig.');
            if ($action === 'idea') {
                if (count($state['items']) >= 200) rm_error(422, 'Die Ideensammlung ist voll.');
                $idea = rm_new_item($data, $identity['label'], $now);
                $state['items'][] = $idea;
                $response['itemId'] = $idea['id'];
            } else {
                $id = rm_text($data['itemId'] ?? null, 80, 'Eintrag');
                rm_add_comment($state, $id, $identity['label'], $data['text'] ?? null, $now);
            }
        } else {
            if ($identity['role'] !== 'admin') rm_error(403, 'Nur die Projektleitung kann den Status ändern.');
            if ($action === 'update') {
                $id = rm_text($data['itemId'] ?? null, 80, 'Eintrag');
                rm_update_item($state, $id, $data, $now);
            } elseif ($action === 'delete-comment') {
                rm_delete_comment($state, rm_text($data['itemId'] ?? null, 80, 'Eintrag'),
                    rm_text($data['commentId'] ?? null, 80, 'Kommentar'), $now);
            } elseif ($action === 'rotate-owner') {
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
