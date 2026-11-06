<?php
declare(strict_types=1);
require_once __DIR__ . '/../site/roadmap-lib.php';
function check(bool $value, string $message): void {
    if (!$value) throw new RuntimeException($message);
}
function fails(callable $action, string $part): void {
    try { $action(); } catch (RuntimeException $e) {
        check(str_contains($e->getMessage(), $part), 'Unerwarteter Fehler: ' . $e->getMessage());
        return;
    }
    throw new RuntimeException('Verweigerung erwartet: ' . $part);
}
$base = sys_get_temp_dir() . '/tennilo-storage-check-' . bin2hex(random_bytes(8));
$app = $base . '/app.tennis-schiri.de';
$private = $base . '/tennilo-roadmap-private';
$legacy = $base . '/old-private';
try {
    check(mkdir($base, 0700) && mkdir($app, 0700) &&
        mkdir($private, 0700) && mkdir($legacy, 0700), 'Verzeichnisse anlegen');
    fails(fn()=>rm_storage_location($app,$app,'', $base), '.htaccess');
    file_put_contents($private . '/.htaccess', "Require all denied\n");
    $resolved = rm_storage_location($app,$app,'',$base);
    check($resolved[0] === realpath($private) && $resolved[1] === true, 'Geschützter, persistenter Nachbarordner');
    check($resolved[2] === $base . '/tennilo-roadmap-' .
        substr(hash('sha256', realpath($app)), 0, 24), 'Altes temporäres Verzeichnis korrekt erkannt');
    fails(fn()=>rm_storage_location($app,$base,'',$base), 'außerhalb');
    chmod($private, 0755);
    fails(fn()=>rm_storage_location($app,$app,'',$base), '0700');
    chmod($private, 0700);
    fails(fn()=>rm_storage_location($app,$app,'relative/path',$base), 'absolut');
    $explicit = rm_storage_location($app,$app,$legacy,$base);
    check($explicit[0] === realpath($legacy) && $explicit[2] === null, 'Expliziter Testpfad ohne Migration');

    $state = ['schemaVersion'=>1,'adminHash'=>'example-hash',
        'ownerAccount'=>null,'invites'=>[['hash'=>'hashed','label'=>'A']],
        'items'=>[['id'=>'x','comments'=>[['text'=>'Erhalten']]]]];
    file_put_contents($legacy . '/state.json', json_encode($state, JSON_THROW_ON_ERROR));
    check(rm_migrate_legacy_state($private,$legacy), 'Vorhandene Daten migrieren');
    check(file_exists($legacy . '/state.json'), 'Original bleibt als Sicherung erhalten');
    $migrated = json_decode(file_get_contents($private . '/state.json'),true);
    check($migrated === $state, 'Alle Daten unverändert kopiert');
    check((fileperms($private . '/state.json') & 0077) === 0, 'Migration nur für Besitzer lesbar');
    check(!rm_migrate_legacy_state($private,$legacy), 'Bestand wird nicht überschrieben');
    check(json_decode(file_get_contents($private . '/state.json'),true) === $state, 'Bestand bleibt erhalten');
    unlink($private . '/state.json');
    file_put_contents($legacy . '/state.json', '{not json');
    fails(fn()=>rm_migrate_legacy_state($private,$legacy), 'ungültig');
    check(!file_exists($private . '/state.json'), 'Ungültige Altdatei erzeugt keinen leeren Neubestand');
    echo "Roadmap-Speicher & Migration: OK\n";
} finally {
    foreach ([$private,$legacy] as $folder) {
        if (is_dir($folder)) foreach (scandir($folder) as $item) {
            if ($item !== '.' && $item !== '..') @unlink($folder . '/' . $item);
        }
        if (is_dir($folder)) @rmdir($folder);
    }
    if (is_dir($app)) @rmdir($app);
    if (is_dir($base)) @rmdir($base);
}
