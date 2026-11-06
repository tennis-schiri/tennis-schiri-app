<?php
declare(strict_types=1);

/**
 * TENNILO v0.6.1: kurzlebige, schreibgeschützte Spielstands-Snapshots
 * für eigenständige Monitore. Kein Turnier-Backup und keine Zahlungsdaten.
 * Auf dem bestehenden passwortgeschützten ALL-INKL-Webspace betreiben.
 */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Pragma: no-cache');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');

const LIVE_TTL_SECONDS = 86400; // maximal 24h nach letzter Veröffentlichung
const LIVE_MAX_BYTES = 65536;

function fail_live(int $status, string $message): void {
    http_response_code($status);
    echo json_encode(['ok' => false, 'error' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}
function token_live($token): bool {
    return is_string($token) && preg_match('/^[a-f0-9]{48}$/D', $token) === 1;
}
function live_str($v, int $max = 120): string {
    if (!is_string($v)) return '';
    return substr($v, 0, $max);
}
function live_number($v, int $min, int $max, int $fallback = 0): int {
    return is_int($v) && $v >= $min && $v <= $max ? $v : $fallback;
}
function live_bool($v): bool {
    return $v === true;
}
function live_names($v): array {
    if (!is_array($v) || !array_is_list($v)) return [];
    return array_map(static fn($x) => live_str($x, 90), array_slice($v, 0, 2));
}
function live_scores($v): ?int {
    return is_int($v) && $v >= 0 && $v <= 999 ? $v : null;
}

function public_live_matches($matches): array {
    if (!is_array($matches) || !array_is_list($matches) || count($matches) > 64) {
        fail_live(422, 'Ungültige Begegnungsliste.');
    }
    $visible = [];
    foreach ($matches as $m) {
        if (!is_array($m)) fail_live(422, 'Ungültige Begegnung.');
        $winner = $m['winner'] ?? null;
        $visible[] = [
            'number' => live_number($m['number'] ?? null, 1, 64, 1),
            'court' => live_str($m['court'] ?? '', 60),
            'batch' => live_number($m['batch'] ?? null, 1, 64, 1),
            'left' => live_names($m['left'] ?? []),
            'right' => live_names($m['right'] ?? []),
            'leftFillers' => array_map('live_bool', array_slice(
                is_array($m['leftFillers'] ?? null) ? $m['leftFillers'] : [], 0, 2
            )),
            'rightFillers' => array_map('live_bool', array_slice(
                is_array($m['rightFillers'] ?? null) ? $m['rightFillers'] : [], 0, 2
            )),
            'winner' => in_array($winner, [1, 2], true) ? $winner : null,
            'score1' => live_scores($m['score1'] ?? null),
            'score2' => live_scores($m['score2'] ?? null),
            'finished' => ($m['finished'] ?? false) === true
        ];
    }
    return $visible;
}

/**
 * Allowlist: niemals unbemerkt die kompletten Turnierdaten, Teilnehmer-IDs,
 * Nenngelder, Anwesenheit oder Zahlungsvorgänge an Zuschauer ausgeben.
 */
function public_live_payload($input): array {
    if (!is_array($input)) fail_live(422, 'Live-Daten fehlen.');
    $mode = $input['mode'] ?? '';
    if (!in_array($mode, ['missing', 'waiting', 'invalid', 'round', 'finals'], true)) {
        fail_live(422, 'Unbekannter Anzeigemodus.');
    }
    $out = [
        'mode' => $mode,
        'format' => ($input['format'] ?? '') === 'doubles' ? 'doubles' : 'ribbon',
        'name' => live_str($input['name'] ?? '', 90),
        'scoreUnit' => ($input['scoreUnit'] ?? '') === 'points' ? 'points' : 'games',
        'date' => live_str($input['date'] ?? '', 12),
        'startTime' => live_str($input['startTime'] ?? '', 8),
        'message' => live_str($input['message'] ?? '', 240)
    ];
    if ($mode !== 'round' && $mode !== 'finals') return $out;

    $out['title'] = live_str($input['title'] ?? '', 90);
    $out['subtitle'] = live_str($input['subtitle'] ?? '', 180);
    $out['progress'] = live_number($input['progress'] ?? null, 0, 100);
    $out['total'] = live_number($input['total'] ?? null, 0, 100);
    $out['index'] = live_number($input['index'] ?? null, 0, 499);
    $out['plannedStart'] = live_str($input['plannedStart'] ?? '', 30);
    $out['plannedEnd'] = live_str($input['plannedEnd'] ?? '', 30);

    $out['matches'] = public_live_matches($input['matches'] ?? []);
    $next = $input['nextRound'] ?? null;
    if ($next !== null) {
        if (!is_array($next) || !isset($next['matches']) || !is_array($next['matches']) ||
            !array_is_list($next['matches']) || count($next['matches']) < 1) {
            fail_live(422, 'Ungültige nächste Runde.');
        }
        $out['nextRound'] = [
            'title' => live_str($next['title'] ?? '', 90),
            'plannedStart' => live_str($next['plannedStart'] ?? '', 30),
            'matches' => public_live_matches($next['matches'])
        ];
    }
    $ranking = $input['ranking'] ?? [];
    if (!is_array($ranking) || !array_is_list($ranking) || count($ranking) > 10) {
        fail_live(422, 'Ungültige Rangliste.');
    }
    $out['ranking'] = [];
    foreach ($ranking as $p) {
        if (!is_array($p)) fail_live(422, 'Ungültiger Ranglisteneintrag.');
        $row = [
            'place' => live_number($p['place'] ?? null, 1, 100, 1),
            'name' => live_str($p['name'] ?? '', 90),
            'played' => live_number($p['played'] ?? null, 0, 1000)
        ];
        if ($out['format'] === 'doubles') {
            $diff = $p['gameDiff'] ?? null;
            $row['wins'] = live_number($p['wins'] ?? null, 0, 1000);
            $row['gameDiff'] = is_int($diff) && $diff >= -1000 && $diff <= 1000 ? $diff : 0;
            $row['gamesFor'] = live_number($p['gamesFor'] ?? null, 0, 1000);
        } else {
            $row['ribbons'] = live_number($p['ribbons'] ?? null, 0, 1000);
        }
        $out['ranking'][] = $row;
    }
    $out['champion'] = live_names($input['champion'] ?? []);
    if ($mode === 'round') {
        $timer = is_array($input['timer'] ?? null) ? $input['timer'] : [];
        $status = $timer['status'] ?? 'ready';
        $out['timer'] = [
            'status' => in_array($status, ['ready','running','paused','finished'], true) ? $status : 'ready',
            'remainingMs' => live_number($timer['remainingMs'] ?? null, 0, 86400000),
            'overtimeMs' => live_number($timer['overtimeMs'] ?? null, 0, 86400000),
            'durationMs' => live_number($timer['durationMs'] ?? null, 60000, 7200000, 1200000),
            'display' => live_str($timer['display'] ?? '00:00', 20),
            'expired' => live_bool($timer['expired'] ?? false)
        ];
    }
    return $out;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if (!in_array($method, ['GET','POST'], true)) {
    header('Allow: GET, POST');
    fail_live(405, 'Methode nicht erlaubt.');
}
$root = rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR) .
    DIRECTORY_SEPARATOR . 'tennilo-live-' . substr(hash('sha256', __DIR__), 0, 24);
if (!is_dir($root) && !@mkdir($root, 0700, true) && !is_dir($root)) {
    fail_live(503, 'Live-Speicherung ist auf diesem Server nicht verfügbar.');
}
// Keine Snapshot-Dateien unter dem öffentlich erreichbaren App-Verzeichnis.
$serverRoot = realpath($root);
$appRoot = realpath(__DIR__);
if ($serverRoot === false || $appRoot === false ||
    $serverRoot === $appRoot ||
    str_starts_with($serverRoot, $appRoot . DIRECTORY_SEPARATOR)) {
    fail_live(503, 'Privater Speicherort für die Live-Anzeige nicht verfügbar.');
}
if (!is_writable($root)) fail_live(503, 'Live-Speicherung ist nicht beschreibbar.');
if (!is_dir($root)) fail_live(503, 'Live-Speicherung fehlt.');

if ($method === 'GET') {
    $channel = $_SERVER['HTTP_X_TENNILO_CHANNEL'] ?? '';
    if (!token_live($channel)) fail_live(400, 'Ungültiger Live-Link.');
} else {
    if (stripos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') !== 0) {
        fail_live(415, 'JSON erwartet.');
    }
    $length = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
    if ($length > LIVE_MAX_BYTES) fail_live(413, 'Live-Daten zu groß.');
    $raw = file_get_contents('php://input', false, null, 0, LIVE_MAX_BYTES + 1);
    if ($raw === false || strlen($raw) > LIVE_MAX_BYTES) fail_live(413, 'Live-Daten zu groß.');
    $body = json_decode($raw, true);
    if (!is_array($body)) fail_live(400, 'Ungültige JSON-Daten.');
    $channel = $body['channel'] ?? '';
    $writer = $body['writer'] ?? '';
    if (!token_live($channel) || !token_live($writer)) {
        fail_live(400, 'Ungültiger Live-Zugang.');
    }
}
$path = $root . DIRECTORY_SEPARATOR . hash('sha256', $channel) . '.json';
if ($method === 'POST' && random_int(1, 60) === 1) {
    $oldFiles = glob($root . DIRECTORY_SEPARATOR . '*.json');
    foreach (array_slice($oldFiles ?: [], 0, 300) as $oldFile) {
        if (is_file($oldFile) && filemtime($oldFile) < time() - LIVE_TTL_SECONDS) {
            @unlink($oldFile);
        }
    }
}

if ($method === 'GET') {
    if (!is_file($path)) fail_live(404, 'Noch keine Live-Übertragung vorhanden.');
    $content = @file_get_contents($path);
    $record = $content === false ? null : json_decode($content, true);
    if (!is_array($record) || !isset($record['savedAt'], $record['display'])) {
        fail_live(503, 'Live-Daten vorübergehend nicht lesbar.');
    }
    if (time() - (int) floor($record['savedAt'] / 1000) > LIVE_TTL_SECONDS) {
        @unlink($path);
        fail_live(404, 'Dieser Live-Link ist abgelaufen.');
    }
    echo json_encode([
        'ok' => true,
        'display' => $record['display'],
        'savedAt' => $record['savedAt'],
        'serverNow' => (int) round(microtime(true) * 1000)
    ], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

// Schreibzugriff ist zusätzlich zum bestehenden Webspace-Passwort durch
// einen zweiten, nie an Zuschauer ausgelieferten 192-Bit-Token geschützt.
$lockPath = $path . '.lock';
$lock = @fopen($lockPath, 'c');
if ($lock === false || !flock($lock, LOCK_EX)) {
    fail_live(503, 'Live-Speicherung kann nicht gesperrt werden.');
}
$existing = null;
if (is_file($path)) {
    $rawOld = @file_get_contents($path);
    $existing = $rawOld === false ? null : json_decode($rawOld, true);
}
if (is_array($existing) && isset($existing['writerHash']) &&
    !hash_equals($existing['writerHash'], hash('sha256', $writer))) {
    flock($lock, LOCK_UN);
    fclose($lock);
    fail_live(403, 'Dieser Live-Link gehört zu einer anderen Übertragung.');
}
$action = $body['action'] ?? 'publish';
if ($action === 'stop') {
    if (is_file($path)) @unlink($path);
    flock($lock, LOCK_UN);
    fclose($lock);
    echo json_encode(['ok' => true, 'stopped' => true]);
    exit;
}
if ($action !== 'publish') fail_live(400, 'Unbekannte Aktion.');
$display = public_live_payload($body['display'] ?? null);
$newRecord = json_encode([
    'writerHash' => hash('sha256', $writer),
    'savedAt' => (int) round(microtime(true) * 1000),
    'display' => $display
], JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
if ($newRecord === false) fail_live(422, 'Live-Daten nicht lesbar.');
$tmp = @tempnam($root, 'write-');
if ($tmp === false) fail_live(503, 'Live-Daten können nicht gespeichert werden.');
@chmod($tmp, 0600);
$ok = @file_put_contents($tmp, $newRecord, LOCK_EX);
if ($ok === false || !@rename($tmp, $path)) {
    @unlink($tmp);
    fail_live(503, 'Live-Daten konnten nicht gespeichert werden.');
}
@chmod($path, 0600);
flock($lock, LOCK_UN);
fclose($lock);
echo json_encode(['ok' => true, 'published' => true]);
