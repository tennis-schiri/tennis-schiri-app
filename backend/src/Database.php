<?php
declare(strict_types=1);

namespace Tennilo\Backend;

use InvalidArgumentException;
use PDO;
use PDOException;

/**
 * Private PHP database connector. Keep this directory OUTSIDE site/ web root.
 * Never commit real credentials, .env files or generated configuration.
 */
final class Database
{
    public static function fromEnvironment(): PDO
    {
        $host = self::required('TENNILO_DB_HOST');
        $name = self::required('TENNILO_DB_NAME');
        $user = self::required('TENNILO_DB_USER');
        $pass = self::required('TENNILO_DB_PASSWORD');
        $port = getenv('TENNILO_DB_PORT') ?: '3306';
        if (preg_match('/^[a-zA-Z0-9._-]{1,253}$/D', $host) !== 1
            || preg_match('/^[a-zA-Z0-9_]{1,64}$/D', $name) !== 1
            || preg_match('/^[0-9]{2,5}$/D', $port) !== 1
            || (int) $port < 1 || (int) $port > 65535) {
            throw new InvalidArgumentException('Ungültige Datenbank-Konfiguration.');
        }

        return new PDO(
            "mysql:host={$host};port={$port};dbname={$name};charset=utf8mb4",
            $user,
            $pass,
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::ATTR_TIMEOUT => 5,
            ]
        );
    }

    private static function required(string $key): string
    {
        $value = getenv($key);
        if (!is_string($value) || $value === '') {
            throw new InvalidArgumentException("Umgebungsvariable {$key} fehlt.");
        }
        return $value;
    }
}
