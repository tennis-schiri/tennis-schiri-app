<?php
declare(strict_types=1);
// No content may be served by strategie.php without a validated owner/invite session.
if (!defined('TENNILO_ROADMAP_INTERNAL_STRATEGY')) { http_response_code(404); exit; }
require_once __DIR__ . '/roadmap-lib.php';
$https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
    || (string)($_SERVER['SERVER_PORT'] ?? '') === '443';
if (!$https) { http_response_code(403); exit('HTTPS erforderlich.'); }
session_name('TENNILO_ROADMAP');
session_set_cookie_params([
    'lifetime'=>0,'path'=>'/','secure'=>true,'httponly'=>true,'samesite'=>'Strict'
]);
if (!session_start()) { http_response_code(503); exit('Sitzung nicht verfügbar.'); }
$account = $_SESSION['roadmapAccount'] ?? null;
$proof = $_SESSION['roadmapCredentialProof'] ?? null;
$ok = false;
if (is_string($account) && is_string($proof)) {
    try {
        [$private] = rm_storage_location(
            __DIR__, (string)($_SERVER['DOCUMENT_ROOT'] ?? __DIR__),
            trim((string)(getenv('TENNILO_ROADMAP_STORAGE_DIR') ?: '')),
            sys_get_temp_dir()
        );
        $stateFile = $private . '/state.json';
        $data = is_file($stateFile) ? json_decode((string)file_get_contents($stateFile),true) : null;
        if (is_array($data)) {
            $entry = $account === 'owner' ? ($data['ownerAccount'] ?? null) : null;
            if ($account !== 'owner') {
                foreach (($data['invites'] ?? []) as $member) {
                    if (($member['id'] ?? '') === $account) { $entry=$member; break; }
                }
            }
            $ok = is_array($entry) && is_string($entry['passwordHash'] ?? null)
                && hash_equals(hash('sha256',$entry['passwordHash']),$proof);
        }
    } catch (Throwable $error) {
        $ok = false;
    }
}
if (!$ok) {
    header('Cache-Control: private, no-store, max-age=0');
    header('Location: ./index.php?login=1', true, 303);
    exit;
}
