<?php
declare(strict_types=1);
require_once __DIR__ . '/../site/roadmap-lib.php';

function tassert(bool $condition, string $message): void {
    if (!$condition) throw new RuntimeException('Roadmap-Test fehlgeschlagen: ' . $message);
}
function expectedError(callable $action, string $pattern): void {
    try { $action(); } catch (RuntimeException $error) {
        tassert(str_contains($error->getMessage(), $pattern), $pattern);
        return;
    }
    throw new RuntimeException('Roadmap-Test fehlgeschlagen: Fehler nicht ausgelöst.');
}
$seed = rm_seed(__DIR__ . '/../site/roadmap-seed.json');
tassert(count($seed) >= 15, 'Mindestens 15 dokumentierte Roadmap-Einträge');
tassert(count(array_unique(array_column($seed, 'id'))) === count($seed), 'IDs eindeutig');
tassert(count(array_filter($seed, fn($item) => $item['status'] === 'online')) >= 4, 'Veröffentlichte Funktionen klar markiert');
tassert(count(array_filter($seed, fn($item) => $item['status'] === 'test')) >= 2, 'Unveröffentlichte Funktionen markiert');

$state = rm_merge([], $seed);
tassert($state['adminHash'] === null && $state['invites'] === [], 'Keine Zugangscodes im Seed');
tassert(count($state['items']) === count($seed), 'Alle Themen importiert');

$now = '2026-11-06T12:00:00+00:00';
$item = rm_new_item(['title'=>'QR-Code für Paarungen',
    'description'=>'Alle Spielpaarungen als Link im Verein bereitstellen.',
    'category'=>'Produkt & Bedienung'], 'Testverein', $now);
tassert($item['status'] === 'idea' && $item['origin'] === 'Testverein', 'Neue Idee nie bereits freigegeben');
tassert($item['priority'] === 'medium', 'Neue Idee Standardpriorität');
$state['items'][] = $item;
tassert(count($state['items']) === count($seed)+1, 'Neuer Vorschlag übernommen');
$comment = rm_add_comment($state, $item['id'], 'Testverein',
    'Das würde die Kommunikation erleichtern.', $now);
tassert($comment['author'] === 'Testverein', 'Kommentar einem Zugang zugeordnet');
tassert(count(end($state['items'])['comments']) === 1, 'Kommentar am Eintrag gespeichert');

$edit = rm_update_item($state, $item['id'], [
    'status'=>'planned','priority'=>'high','milestone'=>'Roadmap 2027',
    'nextStep'=>'Umsetzung spezifizieren'
], $now);
tassert($edit['status'] === 'planned' && $edit['priority'] === 'high', 'Statusänderung');
tassert($edit['comments'][0]['id'] === $comment['id'], 'Kommentare bleiben bei Statusänderung erhalten');

$merged = rm_merge($state, $seed);
tassert(count($merged['items']) === count($seed)+1, 'Seed-Merge erhält neue Ideen');
tassert(end($merged['items'])['status'] === 'planned', 'Seed-Merge überschreibt Moderation nicht');

$raw = rm_public_item($merged['items'][0] + ['secret'=>'niemals anzeigen']);
tassert(!array_key_exists('secret', $raw), 'Private Felder nicht in öffentlicher Antwort');
tassert(!array_key_exists('adminHash', $raw), 'Admin-Hash nicht öffentlich');

tassert(rm_delete_comment($state, $item['id'], $comment['id'], $now), 'Kommentar löschbar');
tassert(count(end($state['items'])['comments']) === 0, 'Kommentar wirklich gelöscht');

$secret = rm_secret();
tassert(rm_valid_code($secret), '256? nein 192-Bit Code mit 48 Hexzeichen');
tassert(strlen($secret) === 48 && strlen(hash('sha256', $secret)) === 64, 'Nur Hash speichern');
tassert(!rm_valid_code('1234'), 'Kurze Codes abweisen');
expectedError(fn()=>rm_new_item(['title'=>'','description'=>'B','category'=>'Turnierformate'], 'A', $now), 'Titel');
expectedError(fn()=>rm_new_item(['title'=>'Gültig','description'=>'B','category'=>'Unsinn'], 'A', $now), 'Bereich');
expectedError(fn()=>rm_update_item($state,$item['id'],['status'=>'online-ungeprüft'],$now), 'Status');
expectedError(fn()=>rm_add_comment($state, $item['id'], 'A', str_repeat('x', 2001), $now), 'Kommentar');
expectedError(fn()=>rm_delete_comment($state,$item['id'],'nicht-da',$now), 'nicht gefunden');
echo "Roadmap: 20 Prüfungen erfolgreich.\n";
