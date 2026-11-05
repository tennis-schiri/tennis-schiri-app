<?php
declare(strict_types=1);

namespace Tennilo\Backend;

use DateTimeImmutable;
use DateTimeZone;
use DomainException;
use PDO;
use PDOException;

/**
 * Private B0.2 application service. Never expose directly as a web endpoint.
 * Requires rate limiting, CSRF/origin checks and an audited mail transport
 * at a later HTTP boundary. No production mailer is configured here.
 */
final class AuthService
{
    private const VERIFY_HOURS = 24;
    private const RESET_MINUTES = 30;
    private const SESSION_HOURS = 12;

    public function __construct(
        private readonly PDO $pdo,
        private readonly TokenDelivery $delivery
    ) {}

    private static function now(): DateTimeImmutable
    {
        return new DateTimeImmutable('now', new DateTimeZone('UTC'));
    }

    private static function stamp(DateTimeImmutable $time): string
    {
        return $time->format('Y-m-d H:i:s.u');
    }

    private static function name(string $value): string
    {
        $name = trim($value);
        if ($name === '' || strlen($name) > 120 || preg_match('/[\x00-\x1F\x7F]/', $name)) {
            throw new DomainException('Bitte einen Namen mit maximal 120 Zeichen eingeben.');
        }
        return $name;
    }

    /** Generic response to avoid leaking whether an e-mail account exists. */
    public function register(string $email, string $password, string $displayName): void
    {
        $email = AccountPolicy::normalizeEmail($email);
        $name = self::name($displayName);
        $hash = AccountPolicy::passwordHash($password);
        $userId = AccountPolicy::newUuid();
        $token = AccountPolicy::newToken();
        $now = self::now();
        $this->pdo->beginTransaction();
        try {
            $existing = $this->pdo->prepare('SELECT id FROM users WHERE email = ?');
            $existing->execute([$email]);
            if ($existing->fetch()) {
                $this->pdo->rollBack();
                return; // generic public response, no account enumeration
            }
            $this->pdo->prepare(
                "INSERT INTO users (id,email,password_hash,display_name,status)
                 VALUES (?,?,?,?,'pending')"
            )->execute([$userId,$email,$hash,$name]);
            $this->pdo->prepare(
                'INSERT INTO email_verification_tokens (id,user_id,token_sha256,expires_at)
                 VALUES (?,?,?,?)'
            )->execute([
                AccountPolicy::newUuid(), $userId, AccountPolicy::tokenHash($token),
                self::stamp($now->modify('+' . self::VERIFY_HOURS . ' hours'))
            ]);
            $this->pdo->commit();
        } catch (PDOException $e) {
            if ($this->pdo->inTransaction()) $this->pdo->rollBack();
            // Unique-key race: do not distinguish already registered e-mails.
            if ((string)($e->errorInfo[0] ?? '') === '23000') return;
            throw $e;
        } catch (\Throwable $e) {
            if ($this->pdo->inTransaction()) $this->pdo->rollBack();
            throw $e;
        }
        $this->delivery->verification($email,$token);
    }

    /** Re-issue an email link if a new signup lost its first message. */
    public function resendVerification(string $email): void
    {
        $email=AccountPolicy::normalizeEmail($email);
        $q=$this->pdo->prepare(
            "SELECT id FROM users WHERE email=? AND status='pending' AND email_verified_at IS NULL"
        );
        $q->execute([$email]);
        $userId=$q->fetchColumn();
        if (!is_string($userId))return; // generic public response
        $token=AccountPolicy::newToken();
        $expires=self::now()->modify('+' . self::VERIFY_HOURS . ' hours');
        $this->pdo->beginTransaction();
        try {
            $this->pdo->prepare(
                'UPDATE email_verification_tokens SET consumed_at=UTC_TIMESTAMP(6)
                 WHERE user_id=? AND consumed_at IS NULL'
            )->execute([$userId]);
            $this->pdo->prepare(
                'INSERT INTO email_verification_tokens (id,user_id,token_sha256,expires_at)
                 VALUES (?,?,?,?)'
            )->execute([
                AccountPolicy::newUuid(),$userId,AccountPolicy::tokenHash($token),
                self::stamp($expires)
            ]);
            $this->pdo->commit();
        } catch (\Throwable $e) {
            if ($this->pdo->inTransaction())$this->pdo->rollBack();
            throw $e;
        }
        $this->delivery->verification($email,$token);
    }

    public function verifyEmail(string $token): void
    {
        $digest = AccountPolicy::tokenHash($token);
        $this->pdo->beginTransaction();
        try {
            $find=$this->pdo->prepare(
                'SELECT e.id AS token_id, e.user_id, u.status
                 FROM email_verification_tokens e JOIN users u ON u.id=e.user_id
                 WHERE e.token_sha256=? AND e.consumed_at IS NULL
                 AND e.expires_at > UTC_TIMESTAMP(6) FOR UPDATE'
            );
            $find->execute([$digest]);
            $record=$find->fetch();
            if (!$record || $record['status'] !== 'pending') {
                throw new DomainException('Bestätigungslink ungültig oder abgelaufen.');
            }
            $this->pdo->prepare(
                "UPDATE users SET status='active',email_verified_at=UTC_TIMESTAMP(6) WHERE id=? AND status='pending'"
            )->execute([$record['user_id']]);
            $this->pdo->prepare(
                'UPDATE email_verification_tokens SET consumed_at=UTC_TIMESTAMP(6)
                 WHERE id=? AND consumed_at IS NULL'
            )->execute([$record['token_id']]);
            $this->pdo->commit();
        } catch (\Throwable $e) {
            if ($this->pdo->inTransaction()) $this->pdo->rollBack();
            throw $e;
        }
    }

    /**
     * Raw session and CSRF tokens must only be sent via secure response cookie
     * / same-origin CSRF delivery in a future HTTP gateway. DB stores hashes.
     * @return array{session:string,csrf:string,expiresAt:string}
     */
    public function login(string $email, string $password): array
    {
        $email = AccountPolicy::normalizeEmail($email);
        $lookup=$this->pdo->prepare(
            'SELECT id,password_hash,status,email_verified_at FROM users WHERE email=?'
        );
        $lookup->execute([$email]);
        $user=$lookup->fetch();
        // Run password verification even for nonexistent accounts.
        static $dummyHash=null;
        $dummyHash ??= AccountPolicy::passwordHash('TENNILO-Dummy-Passwort-Niemals-Einloggen-2026');
        $valid=AccountPolicy::verifyPassword($password, $user['password_hash'] ?? $dummyHash);
        if (!$user || !$valid || $user['status'] !== 'active'
            || $user['email_verified_at'] === null) {
            throw new DomainException('Anmeldung fehlgeschlagen.');
        }

        if (AccountPolicy::needsPasswordRehash($user['password_hash'])) {
            $this->pdo->prepare('UPDATE users SET password_hash=? WHERE id=?')
                ->execute([AccountPolicy::passwordHash($password), $user['id']]);
        }
        $session=AccountPolicy::newToken();
        $csrf=AccountPolicy::newToken();
        $expires=self::now()->modify('+' . self::SESSION_HOURS . ' hours');
        $this->pdo->prepare(
            'INSERT INTO auth_sessions (id,user_id,token_sha256,csrf_sha256,expires_at)
             VALUES (?,?,?,?,?)'
        )->execute([
            AccountPolicy::newUuid(),$user['id'],
            AccountPolicy::tokenHash($session),AccountPolicy::tokenHash($csrf),
            self::stamp($expires)
        ]);
        return ['session'=>$session,'csrf'=>$csrf,'expiresAt'=>self::stamp($expires)];
    }

    /**
     * Returns the ONLY permitted authenticated account fields. Passing a CSRF
     * token is mandatory for mutations once the HTTP gateway is implemented.
     * @return array{id:string,email:string,displayName:string}
     */
    public function requireSession(string $session, ?string $csrf=null): array
    {
        $hash=AccountPolicy::tokenHash($session);
        $q=$this->pdo->prepare(
            "SELECT s.csrf_sha256,u.id,u.email,u.display_name
             FROM auth_sessions s JOIN users u ON u.id=s.user_id
             WHERE s.token_sha256=? AND s.revoked_at IS NULL
             AND s.expires_at > UTC_TIMESTAMP(6)
             AND u.status='active' AND u.email_verified_at IS NOT NULL"
        );
        $q->execute([$hash]);
        $row=$q->fetch();
        if (!$row) throw new DomainException('Sitzung ist nicht gültig.');
        if ($csrf !== null && !AccountPolicy::tokenMatches($csrf,$row['csrf_sha256'])) {
            throw new DomainException('Ungültiger Formularschutz.');
        }
        return [
            'id'=>$row['id'],
            'email'=>$row['email'],
            'displayName'=>$row['display_name']
        ];
    }

    public function logout(string $session, string $csrf): void
    {
        $user=$this->requireSession($session,$csrf);
        $this->pdo->prepare(
            'UPDATE auth_sessions SET revoked_at=UTC_TIMESTAMP(6)
             WHERE token_sha256=? AND user_id=? AND revoked_at IS NULL'
        )->execute([AccountPolicy::tokenHash($session),$user['id']]);
    }

    /**
     * Generic behavior for unknown/inactive e-mail accounts.
     * Dispatching this action publicly MUST have IP and account rate limits.
     */
    public function requestPasswordReset(string $email): void
    {
        $email=AccountPolicy::normalizeEmail($email);
        $query=$this->pdo->prepare(
            "SELECT id FROM users WHERE email=? AND status='active' AND email_verified_at IS NOT NULL"
        );
        $query->execute([$email]);
        $userId=$query->fetchColumn();
        if (!is_string($userId)) return;
        $token=AccountPolicy::newToken();
        $expires=self::now()->modify('+' . self::RESET_MINUTES . ' minutes');
        $this->pdo->beginTransaction();
        try {
            $this->pdo->prepare(
                'UPDATE password_reset_tokens SET consumed_at=UTC_TIMESTAMP(6)
                 WHERE user_id=? AND consumed_at IS NULL'
            )->execute([$userId]);
            $this->pdo->prepare(
                'INSERT INTO password_reset_tokens (id,user_id,token_sha256,expires_at)
                 VALUES (?,?,?,?)'
            )->execute([
                AccountPolicy::newUuid(),$userId,AccountPolicy::tokenHash($token),
                self::stamp($expires)
            ]);
            $this->pdo->commit();
        } catch (\Throwable $e) {
            if ($this->pdo->inTransaction()) $this->pdo->rollBack();
            throw $e;
        }
        $this->delivery->passwordReset($email,$token);
    }

    public function resetPassword(string $token, string $newPassword): void
    {
        $hash=AccountPolicy::passwordHash($newPassword);
        $digest=AccountPolicy::tokenHash($token);
        $this->pdo->beginTransaction();
        try {
            $q=$this->pdo->prepare(
                "SELECT p.id AS token_id,p.user_id FROM password_reset_tokens p
                 JOIN users u ON u.id=p.user_id
                 WHERE p.token_sha256=? AND p.consumed_at IS NULL
                 AND p.expires_at > UTC_TIMESTAMP(6)
                 AND u.status='active' AND u.email_verified_at IS NOT NULL FOR UPDATE"
            );
            $q->execute([$digest]);
            $tokenRow=$q->fetch();
            if (!$tokenRow)throw new DomainException('Zurücksetzungslink ungültig oder abgelaufen.');
            $this->pdo->prepare('UPDATE users SET password_hash=? WHERE id=?')
                ->execute([$hash,$tokenRow['user_id']]);
            $this->pdo->prepare(
                'UPDATE password_reset_tokens SET consumed_at=UTC_TIMESTAMP(6) WHERE id=?'
            )->execute([$tokenRow['token_id']]);
            $this->pdo->prepare(
                'UPDATE auth_sessions SET revoked_at=UTC_TIMESTAMP(6)
                 WHERE user_id=? AND revoked_at IS NULL'
            )->execute([$tokenRow['user_id']]);
            $this->pdo->commit();
        } catch (\Throwable $e) {
            if ($this->pdo->inTransaction()) $this->pdo->rollBack();
            throw $e;
        }
    }
}
