<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/src/AccountPolicy.php';

use Tennilo\Backend\AccountPolicy as A;

function expect(bool $condition, string $message): void {
    if (!$condition) throw new RuntimeException("Fehlgeschlagen: {$message}");
}
function rejects(callable $action, string $message): void {
    try { $action(); }
    catch (\InvalidArgumentException|\DomainException $e) { return; }
    throw new RuntimeException("Erwarteter Fehler fehlt: {$message}");
}

$checks = 0;
$test = static function(string $label, callable $f) use (&$checks): void {
    $f();
    $checks++;
    echo "[OK] {$label}\n";
};

$test('E-Mail wird validiert und case-insensitive normalisiert', function (): void {
    expect(A::normalizeEmail('  Beispiel+Orga@Tennis.de  ') === 'beispiel+orga@tennis.de', 'email');
    foreach (['invalid','a@','',str_repeat('a',245).'@b.de'] as $mail) {
        rejects(static fn() => A::normalizeEmail($mail), 'invalid email');
    }
});
$test('Vereins-Kurzname mit reservierten Wörtern und Grenzen', function (): void {
    expect(A::normalizeOrganizationSlug(' Tennis-Team ') === 'tennis-team','slug');
    foreach (['admin','api','bad space','ab','x'.str_repeat('a',81)] as $slug) {
        rejects(static fn() => A::normalizeOrganizationSlug($slug),'invalid slug');
    }
});
$test('Lange Passwörter sicher gehasht, kein Klartext', function (): void {
    $hash=A::passwordHash('MeinSicheresPasswort2026!');
    expect($hash !== 'MeinSicheresPasswort2026!', 'not plaintext');
    expect(A::verifyPassword('MeinSicheresPasswort2026!',$hash),'valid password');
    expect(!A::verifyPassword('anderes Passwort',$hash),'bad password');
    rejects(static fn() => A::passwordHash('zu-kurz'), 'weak password');
});
$test('UUID v4 kryptographisch random', function (): void {
    $x=A::newUuid();$y=A::newUuid();
    expect($x!==$y,'unique uuid');
    expect(preg_match('/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/D',$x)===1,'uuid v4');
});
$test('Einladung/Sitzung nur als Hash in der Datenbank', function (): void {
    $raw=A::newToken();$hash=A::tokenHash($raw);
    expect(strlen($raw)===64 && strlen($hash)===64 && $raw!==$hash,'token hash');
    expect(A::tokenMatches($raw,$hash),'token accepted');
    expect(!A::tokenMatches(A::newToken(),$hash),'other token rejected');
    expect(!A::tokenMatches('garbage',$hash),'invalid token rejected');
    rejects(static fn()=>A::tokenHash('insecure'), 'bad token format');
});
$test('Besitzer hat Verwaltung und Abrechnung', function (): void {
    foreach (['organization.edit','members.manage','billing.manage','tournaments.manage','live.publish'] as $action) {
        expect(A::can('owner',$action),'owner '.$action);
    }
});
$test('Organisator verwaltet Turniere, aber keine Lizenzen', function (): void {
    expect(A::can('organizer','tournaments.manage'), 'organizer tournament');
    expect(A::can('organizer','live.publish'), 'organizer live');
    expect(!A::can('organizer','billing.manage'), 'cannot bill');
    expect(!A::can('organizer','members.invite'), 'cannot invite');
});
$test('Leser darf nur angemeldete Turnierdaten lesen', function (): void {
    expect(A::can('viewer','tournaments.view'), 'viewer reads');
    expect(!A::can('viewer','tournaments.manage'), 'viewer cannot edit');
    expect(!A::can('viewer','billing.view'), 'viewer cannot see bill');
    expect(!A::can('viewer','live.publish'), 'viewer cannot publish');
});
$test('Unbekannte Rolle und Aktion gewähren niemals Zugriff', function (): void {
    expect(!A::can('admin','billing.manage'), 'admin not implicit');
    expect(!A::can('owner','some.future.privilege'), 'unknown action denied');
    rejects(static fn()=>A::assertCan('viewer','billing.manage'), 'throw forbidden');
});
$test('Unbestätigte, gesperrte und vereinsfremde Konten erhalten keinen Zugriff', function (): void {
    expect(!A::can('owner','tournaments.manage',false), 'disabled user');
    expect(!A::can('owner','tournaments.manage',true,false), 'unverified');
    expect(!A::can('owner','tournaments.manage',true,true,false), 'suspended org');
    expect(!A::can('owner','tournaments.manage',true,true,true,false), 'suspended membership');
});
$test('Letzten aktiven Vereinsbesitzer nicht entfernen', function (): void {
    rejects(static fn()=>A::assertOtherActiveOwnerExists(0), 'last owner');
    A::assertOtherActiveOwnerExists(1);
});
$test('Lizenz ist organisationsbezogen und zeitlich begrenzt', function (): void {
    $now=new DateTimeImmutable('2026-11-05T12:00:00+00:00');
    $start=$now->modify('-1 day');
    $end=$now->modify('+1 day');
    expect(A::licensePermitsUse('active',$start,$end,$now),'active');
    expect(A::licensePermitsUse('trialing',$start,$end,$now),'trial');
    expect(A::licensePermitsUse('grace',$start,$end,$now),'grace');
    expect(!A::licensePermitsUse('expired',$start,$end,$now),'expired status');
    expect(!A::licensePermitsUse('active',$now->modify('+1 minute'),$end,$now),'not yet');
    expect(!A::licensePermitsUse('active',$start,$now,$now),'expiry exclusive');
});
echo "Alle {$checks} Backend-Kontomodell-Prüfungen bestanden.\n";
