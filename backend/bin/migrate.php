<?php
declare(strict_types=1);

/**
 * Administrative CLI only. No web endpoint and no automatic production deploy.
 * Usage: TENNILO_DB_* and TENNILO_DB_ALLOW_MIGRATE=1 php backend/bin/migrate.php --apply
 *        TENNILO_DB_* php backend/bin/migrate.php --check
 *
 * MySQL DDL autocommits. On a partial failure, investigate before retrying.
 * Every CREATE TABLE in 001 is IF NOT EXISTS; store checksum only after success.
 */
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}
require_once dirname(__DIR__) . '/src/Database.php';

use Tennilo\Backend\Database;

const ROOT = __DIR__ . '/../migrations';

function usage(): never
{
    fwrite(STDERR, "Aufruf: php backend/bin/migrate.php --check | --apply\n");
    exit(2);
}
$mode = $argv[1] ?? '';
if (!in_array($mode, ['--check', '--apply'], true) || count($argv) !== 2) {
    usage();
}
if ($mode === '--apply' && getenv('TENNILO_DB_ALLOW_MIGRATE') !== '1') {
    fwrite(STDERR, "Migration gesperrt. TENNILO_DB_ALLOW_MIGRATE=1 explizit setzen.\n");
    exit(2);
}
try {
    $pdo = Database::fromEnvironment();
    // The version table itself is intentionally not a product-facing endpoint.
    $pdo->exec('CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(100) NOT NULL,
        sha256 CHAR(64) NOT NULL,
        applied_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY(version)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci');

    $files = glob(ROOT . '/*.sql');
    if (!$files) {
        throw new RuntimeException('Keine SQL-Migration gefunden.');
    }
    sort($files, SORT_STRING);
    $select = $pdo->prepare('SELECT sha256 FROM schema_migrations WHERE version = ?');
    $record = $pdo->prepare('INSERT INTO schema_migrations (version, sha256) VALUES (?, ?)');
    $pending = 0;
    foreach ($files as $file) {
        $version = basename($file);
        $sql = file_get_contents($file);
        if ($sql === false
            || preg_match('/^[0-9]{3}_[a-z0-9_]+\.sql$/D', $version) !== 1) {
            throw new RuntimeException('Ungültige Migrationsdatei.');
        }
        $digest = hash('sha256', $sql);
        $select->execute([$version]);
        $previous = $select->fetchColumn();
        if (is_string($previous)) {
            if (!hash_equals($previous, $digest)) {
                throw new RuntimeException("Migration {$version} wurde nachträglich verändert.");
            }
            echo "{$version}: bereits angewendet.\n";
            continue;
        }
        $pending++;
        if ($mode === '--check') {
            echo "{$version}: noch nicht angewendet.\n";
            continue;
        }

        // The reviewed SQL migration contains no semicolons within SQL strings.
        // Strip whole-line comments before splitting statements.
        $sqlWithoutComments = preg_replace('/^\s*--[^\r\n]*(?:\r?\n|$)/m', '', $sql);
        if (!is_string($sqlWithoutComments)) {
            throw new RuntimeException('Migration kann nicht verarbeitet werden.');
        }
        $statements = array_filter(array_map('trim', explode(';', $sqlWithoutComments)));
        foreach ($statements as $statement) {
            $pdo->exec($statement);
        }
        // Record success only when ALL DDL statements have executed.
        $record->execute([$version, $digest]);
        echo "{$version}: erfolgreich installiert.\n";
    }
    if ($mode === '--check' && $pending > 0) {
        fwrite(STDERR, "{$pending} Migration(en) sind noch offen.\n");
        exit(1);
    }
    echo "Datenbankschema aktuell.\n";
} catch (Throwable $e) {
    // Do not print passwords/DSNs or SQL values to logs.
    fwrite(STDERR, "Migration fehlgeschlagen (" . get_class($e) . "). Details nur lokal prüfen.\n");
    exit(1);
}
