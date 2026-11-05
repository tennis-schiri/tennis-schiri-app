<?php
declare(strict_types=1);

namespace Tennilo\Backend;

use DomainException;
use PDO;

/**
 * Persistent throttling across PHP requests/workers.
 * The database contains HMACs, never plaintext IPs/e-mail addresses.
 * Actual HTTP layer supplies trusted REMOTE_ADDR, never X-Forwarded-For.
 */
final class RateLimiter
{
    public function __construct(
        private readonly PDO $pdo,
        private readonly string $secret
    ) {
        if (strlen($secret) < 32) {
            throw new DomainException('Rate-Limit-Schlüssel fehlt oder ist zu kurz.');
        }
    }

    public function hit(
        string $action,
        string $kind,
        string $value,
        int $maxRequests,
        int $windowSeconds
    ): void {
        if (!in_array($action, ['register','login','reset','verify','resend','invite','accept','club'], true)
            || !in_array($kind, ['ip','email','user'], true)
            || $value === '' || $maxRequests < 1 || $maxRequests > 1000
            || $windowSeconds < 10 || $windowSeconds > 86400) {
            throw new DomainException('Ungültige Schutz-Konfiguration.');
        }

        $scope=hash_hmac('sha256',$action.'|'.$kind.'|'.$value,$this->secret);
        // One atomic insert/upsert prevents concurrent requests from bypassing the counter.
        $q=$this->pdo->prepare(
            'INSERT INTO auth_rate_limits (scope_sha256,requests,expires_at)
             VALUES (?,1,DATE_ADD(UTC_TIMESTAMP(6),INTERVAL ? SECOND))
             ON DUPLICATE KEY UPDATE
               requests=IF(expires_at<=UTC_TIMESTAMP(6),1,requests+1),
               expires_at=IF(expires_at<=UTC_TIMESTAMP(6),
                 DATE_ADD(UTC_TIMESTAMP(6),INTERVAL ? SECOND),expires_at)'
        );
        $q->execute([$scope,$windowSeconds,$windowSeconds]);
        $read=$this->pdo->prepare(
            'SELECT requests FROM auth_rate_limits WHERE scope_sha256=?'
        );
        $read->execute([$scope]);
        if ((int)$read->fetchColumn()>$maxRequests) {
            throw new DomainException('Zu viele Anfragen. Bitte später erneut versuchen.');
        }
    }
}
