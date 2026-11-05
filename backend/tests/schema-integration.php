<?php
declare(strict_types=1);

require_once dirname(__DIR__) . '/src/Database.php';
require_once dirname(__DIR__) . '/src/AccountPolicy.php';

use Tennilo\Backend\Database;
use Tennilo\Backend\AccountPolicy as A;

/**
 * Run ONLY against a fresh disposable MariaDB test database.
 * The GitHub verification workflow supplies temporary CI credentials.
 */
$pdo = Database::fromEnvironment();
$name = (string) $pdo->query('SELECT DATABASE()')->fetchColumn();
if ($name !== 'tennilo_ci_test') {
    fwrite(STDERR, "Abbruch: Nur die Wegwerf-Testdatenbank tennilo_ci_test ist erlaubt.\n");
    exit(2);
}
$required = [
    'schema_migrations','users','organizations','organization_memberships',
    'organization_invitations','email_verification_tokens','password_reset_tokens',
    'auth_sessions','platform_administrators','license_plans',
    'organization_licenses','audit_events'
];
$tables = $pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);
foreach ($required as $table) {
    if (!in_array($table, $tables, true)) {
        throw new RuntimeException("Tabelle {$table} fehlt.");
    }
}

function rejectsSql(callable $work, string $label): void {
    try { $work(); }
    catch (PDOException $e) { return; }
    throw new RuntimeException("Datenbank muss Operation sperren: {$label}");
}

$u1=A::newUuid();
$u2=A::newUuid();
$org=A::newUuid();
$orgOther=A::newUuid();
$plan=A::newUuid();
$firstLicense=A::newUuid();
$now='2026-11-05 12:00:00.000000';
$expires='2027-11-05 12:00:00.000000';
$pdo->beginTransaction();
try {
    $insertUser=$pdo->prepare(
        'INSERT INTO users (id,email,password_hash,display_name,status,email_verified_at)
         VALUES (?,?,?,?,"active",?)'
    );
    $hash=A::passwordHash('TenniloTestOnlyPasswort2026');
    $insertUser->execute([$u1,'test-owner@example.org',$hash,'Vereinsbesitzer',$now]);
    $insertUser->execute([$u2,'test-helper@example.org',$hash,'Turnierhilfe',$now]);
    rejectsSql(
        static fn()=> $insertUser->execute([A::newUuid(),'test-owner@example.org',$hash,'Doppelt',$now]),
        'doppelte E-Mail'
    );
    $pdo->prepare('INSERT INTO organizations (id,name,slug,created_by_user_id) VALUES (?,?,?,?)')
        ->execute([$org,'Demoverein','demoverein',$u1]);
    $pdo->prepare('INSERT INTO organizations (id,name,slug,created_by_user_id) VALUES (?,?,?,?)')
        ->execute([$orgOther,'Anderer Verein','anderer-verein',$u2]);

    $member=$pdo->prepare(
        'INSERT INTO organization_memberships (organization_id,user_id,role) VALUES (?,?,?)'
    );
    $member->execute([$org,$u1,'owner']);
    $member->execute([$org,$u2,'organizer']);
    $member->execute([$orgOther,$u2,'owner']);
    rejectsSql(static fn()=> $member->execute([$org,$u2,'viewer']), 'doppelte Mitgliedschaft');
    rejectsSql(static fn()=> $member->execute([$org,A::newUuid(),'viewer']), 'fremder Benutzer');

    $query=$pdo->prepare(
        'SELECT role FROM organization_memberships
         WHERE organization_id = ? AND user_id = ? AND status = "active"'
    );
    $query->execute([$org,$u1]);
    if ($query->fetchColumn() !== 'owner')throw new RuntimeException('Besitzerrolle fehlt.');
    $query->execute([$orgOther,$u1]);
    if ($query->fetchColumn() !== false)throw new RuntimeException('Falscher Zugriff auf anderen Verein.');

    $insertPlan=$pdo->prepare(
        'INSERT INTO license_plans (id,code,name,billing_interval,price_cents,is_public)
         VALUES (?,?,"Testlizenz","free",NULL,0)'
    );
    $insertPlan->execute([$plan,'ci-demo']);
    $license=$pdo->prepare(
        'INSERT INTO organization_licenses
         (id,organization_id,plan_id,status,valid_from,valid_until,granted_by_user_id)
         VALUES (?,?,?,"trialing",?,?,?)'
    );
    $license->execute([$firstLicense,$org,$plan,$now,$expires,$u1]);
    rejectsSql(
        static fn()=> $license->execute([A::newUuid(),$org,$plan,$now,$expires,$u1]),
        'zweite aktuelle Lizenz desselben Vereins'
    );

    $token=A::newToken();
    $stored=A::tokenHash($token);
    $pdo->prepare(
        'INSERT INTO email_verification_tokens (id,user_id,token_sha256,expires_at)
         VALUES (?,?,?,?)'
    )->execute([A::newUuid(),$u1,$stored,$expires]);
    $readToken=$pdo->prepare('SELECT token_sha256 FROM email_verification_tokens WHERE user_id=?');
    $readToken->execute([$u1]);
    $saved=(string) $readToken->fetchColumn();
    if ($saved === $token || !A::tokenMatches($token,$saved)) {
        throw new RuntimeException('Token wird nicht korrekt gehasht gespeichert.');
    }
    echo "MariaDB: 12 Tabellen, Foreign Keys, Organisationsgrenze, Kontosicherheit und Lizenz-Eindeutigkeit OK.\n";
} finally {
    if ($pdo->inTransaction())$pdo->rollBack();
}
