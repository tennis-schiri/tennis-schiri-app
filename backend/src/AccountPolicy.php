<?php
declare(strict_types=1);

namespace Tennilo\Backend;

use DomainException;
use InvalidArgumentException;

/**
 * Pure account/club rules. No database, HTTP or external dependencies.
 * Actual authorization MUST be checked again on every API request after
 * loading the authenticated user, organization and membership from the DB.
 */
final class AccountPolicy
{
    private const ACTIONS = [
        'organization.view',
        'organization.edit',
        'members.view',
        'members.invite',
        'members.manage',
        'billing.view',
        'billing.manage',
        'tournaments.view',
        'tournaments.manage',
        'live.publish',
    ];

    /** @return list<string> */
    public static function roles(): array
    {
        return ['owner', 'organizer', 'viewer'];
    }

    public static function normalizeEmail(string $email): string
    {
        $candidate = trim($email);
        if ($candidate === '' || strlen($candidate) > 254
            || filter_var($candidate, FILTER_VALIDATE_EMAIL) === false) {
            throw new InvalidArgumentException('Bitte eine gültige E-Mail-Adresse angeben.');
        }
        // The initial account model deliberately accepts valid ASCII mailboxes.
        // DB collation utf8mb4_unicode_ci makes uniqueness case-insensitive.
        return strtolower($candidate);
    }

    public static function normalizeOrganizationSlug(string $slug): string
    {
        $candidate = strtolower(trim($slug));
        if (preg_match('/^[a-z0-9][a-z0-9-]{1,78}[a-z0-9]$/D', $candidate) !== 1
            || in_array($candidate, ['admin','api','app','support','login','register','www'], true)) {
            throw new InvalidArgumentException('Ungültiger Vereins-Kurzname (3–80 Zeichen).');
        }
        return $candidate;
    }

    public static function assertPasswordAcceptable(string $password): void
    {
        $length = strlen($password);
        if ($length < 12 || $length > 1024) {
            throw new InvalidArgumentException('Passwörter müssen 12–1024 Bytes umfassen.');
        }
    }

    public static function passwordHash(string $password): string
    {
        self::assertPasswordAcceptable($password);
        $hash = password_hash($password, PASSWORD_DEFAULT);
        if (!is_string($hash)) {
            throw new DomainException('Passwort konnte nicht sicher gehasht werden.');
        }
        return $hash;
    }

    public static function verifyPassword(string $password, string $hash): bool
    {
        return password_verify($password, $hash);
    }

    public static function needsPasswordRehash(string $hash): bool
    {
        return password_needs_rehash($hash, PASSWORD_DEFAULT);
    }

    public static function newUuid(): string
    {
        $b = random_bytes(16);
        $b[6] = chr((ord($b[6]) & 0x0f) | 0x40);
        $b[8] = chr((ord($b[8]) & 0x3f) | 0x80);
        $hex = bin2hex($b);
        return substr($hex,0,8) . '-' . substr($hex,8,4) . '-' .
            substr($hex,12,4) . '-' . substr($hex,16,4) . '-' . substr($hex,20,12);
    }

    /**
     * Raw token only goes to an intended recipient once; DB stores tokenHash().
     * This helper generates 256 bits of cryptographically secure entropy.
     */
    public static function newToken(): string
    {
        return bin2hex(random_bytes(32));
    }

    public static function tokenHash(string $token): string
    {
        if (preg_match('/^[a-f0-9]{64}$/D', $token) !== 1) {
            throw new InvalidArgumentException('Ungültiges Zugangs-Token.');
        }
        return hash('sha256', $token);
    }

    public static function tokenMatches(string $rawToken, string $storedHash): bool
    {
        try {
            $computed = self::tokenHash($rawToken);
        } catch (InvalidArgumentException) {
            return false;
        }
        return preg_match('/^[a-f0-9]{64}$/D', $storedHash) === 1
            && hash_equals($storedHash, $computed);
    }

    /**
     * This policy is not a replacement for verifying tenant membership in DB.
     * $verified means email_verified_at != NULL on the authenticated user.
     */
    public static function can(
        string $role,
        string $action,
        bool $userActive = true,
        bool $verified = true,
        bool $organizationActive = true,
        bool $membershipActive = true
    ): bool {
        if (!$userActive || !$verified || !$organizationActive || !$membershipActive
            || !in_array($action, self::ACTIONS, true)) {
            return false;
        }

        if ($role === 'owner') {
            return true;
        }
        if ($role === 'organizer') {
            return in_array($action, [
                'organization.view','members.view',
                'tournaments.view','tournaments.manage','live.publish'
            ], true);
        }
        if ($role === 'viewer') {
            return in_array($action, [
                'organization.view','members.view','tournaments.view'
            ], true);
        }
        return false;
    }

    public static function assertCan(string $role, string $action): void
    {
        if (!self::can($role, $action)) {
            throw new DomainException('Diese Aktion ist nicht freigegeben.');
        }
    }

    /** Prevent removing or demoting the last active club owner. */
    public static function assertOtherActiveOwnerExists(int $otherActiveOwners): void
    {
        if ($otherActiveOwners < 1) {
            throw new DomainException('Ein Verein benötigt mindestens einen aktiven Besitzer.');
        }
    }

    /**
     * License is organization-scoped, never bound to an individual user.
     * Paid checkout/webhooks are deliberately not implemented yet.
     */
    public static function licensePermitsUse(
        string $status,
        ?\DateTimeImmutable $validFrom,
        ?\DateTimeImmutable $validUntil,
        \DateTimeImmutable $now
    ): bool {
        if (!in_array($status, ['trialing','active','grace'], true) || $validFrom === null
            || $now < $validFrom) {
            return false;
        }
        return $validUntil === null || $now < $validUntil;
    }
}
