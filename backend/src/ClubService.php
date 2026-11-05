<?php
declare(strict_types=1);

namespace Tennilo\Backend;

use DateTimeImmutable;
use DateTimeZone;
use DomainException;
use PDO;

/**
 * Private, tenant-scoped B0.2 service.
 * Organization creation and its first owner membership are atomic.
 * Last-owner protection is serialized on the organization row.
 */
final class ClubService
{
    public function __construct(
        private readonly PDO $pdo,
        private readonly TokenDelivery $delivery
    ) {}

    private static function name(string $name): string
    {
        $value=trim($name);
        if ($value === '' || strlen($value) > 160 || preg_match('/[\x00-\x1F\x7F]/', $value)) {
            throw new DomainException('Vereinsname ungültig (maximal 160 Zeichen).');
        }
        return $value;
    }

    private function assertActiveUser(string $userId): array
    {
        $q=$this->pdo->prepare(
            "SELECT id,email FROM users
             WHERE id=? AND status='active' AND email_verified_at IS NOT NULL"
        );
        $q->execute([$userId]);
        $user=$q->fetch();
        if (!$user)throw new DomainException('Bestätigtes Benutzerkonto erforderlich.');
        return $user;
    }

    /**
     * A verified user can create an organization, but it has NO paid or trial
     * license until a trusted operator explicitly grants one.
     */
    public function createOrganization(string $userId,string $name,string $slug): string
    {
        $clubName=self::name($name);
        $slug=AccountPolicy::normalizeOrganizationSlug($slug);
        $orgId=AccountPolicy::newUuid();
        $this->pdo->beginTransaction();
        try {
            $this->assertActiveUser($userId);
            $this->pdo->prepare(
                'INSERT INTO organizations (id,name,slug,created_by_user_id)
                 VALUES (?,?,?,?)'
            )->execute([$orgId,$clubName,$slug,$userId]);
            $this->pdo->prepare(
                "INSERT INTO organization_memberships (organization_id,user_id,role)
                 VALUES (?,?,'owner')"
            )->execute([$orgId,$userId]);
            $this->pdo->commit();
            return $orgId;
        } catch (\Throwable $e) {
            if ($this->pdo->inTransaction()) $this->pdo->rollBack();
            throw $e;
        }
    }

    /** @return array<string,mixed> validated tenant membership */
    private function requireMembership(string $userId,string $orgId,string $permission): array
    {
        $q=$this->pdo->prepare(
            'SELECT m.role,m.status AS membership_status,
                    o.status AS organization_status,u.status AS user_status,
                    u.email_verified_at
             FROM organization_memberships m
             JOIN organizations o ON o.id=m.organization_id
             JOIN users u ON u.id=m.user_id
             WHERE m.organization_id=? AND m.user_id=?'
        );
        $q->execute([$orgId,$userId]);
        $m=$q->fetch();
        if (!$m || !AccountPolicy::can(
            (string)$m['role'],$permission,
            $m['user_status']==='active',
            $m['email_verified_at']!==null,
            $m['organization_status']==='active',
            $m['membership_status']==='active'
        )) {
            throw new DomainException('Keine Berechtigung für diesen Verein.');
        }
        return $m;
    }

    public function listOrganizations(string $userId): array
    {
        $this->assertActiveUser($userId);
        $q=$this->pdo->prepare(
            "SELECT o.id,o.name,o.slug,m.role
             FROM organization_memberships m
             JOIN organizations o ON o.id=m.organization_id
             WHERE m.user_id=? AND m.status='active' AND o.status='active'
             ORDER BY o.name"
        );
        $q->execute([$userId]);
        return $q->fetchAll();
    }

    public function members(string $userId,string $orgId): array
    {
        $this->requireMembership($userId,$orgId,'members.view');
        $q=$this->pdo->prepare(
            'SELECT m.user_id,u.email,u.display_name,m.role,m.status
             FROM organization_memberships m JOIN users u ON u.id=m.user_id
             WHERE m.organization_id=? ORDER BY u.display_name'
        );
        $q->execute([$orgId]);
        return $q->fetchAll();
    }

    public function invite(
        string $ownerId,string $orgId,string $email,string $role
    ): void {
        if (!in_array($role,['organizer','viewer'],true)) {
            throw new DomainException('Einladungen sind nur für Organisatoren und Leser möglich.');
        }
        $email=AccountPolicy::normalizeEmail($email);
        $this->requireMembership($ownerId,$orgId,'members.invite');
        $nameQuery=$this->pdo->prepare('SELECT name FROM organizations WHERE id=?');
        $nameQuery->execute([$orgId]);
        $orgName=(string)$nameQuery->fetchColumn();
        $token=AccountPolicy::newToken();
        $hash=AccountPolicy::tokenHash($token);
        $expires=(new DateTimeImmutable('now',new DateTimeZone('UTC')))
            ->modify('+7 days')->format('Y-m-d H:i:s.u');
        $this->pdo->beginTransaction();
        try {
            $already=$this->pdo->prepare(
                "SELECT m.user_id FROM organization_memberships m
                 JOIN users u ON u.id=m.user_id
                 WHERE m.organization_id=? AND u.email=?"
            );
            $already->execute([$orgId,$email]);
            if ($already->fetch()) {
                throw new DomainException('Das Benutzerkonto gehört dem Verein bereits an.');
            }
            $this->pdo->prepare(
                'UPDATE organization_invitations SET revoked_at=UTC_TIMESTAMP(6)
                 WHERE organization_id=? AND invited_email=? AND accepted_at IS NULL
                 AND revoked_at IS NULL'
            )->execute([$orgId,$email]);
            $this->pdo->prepare(
                'INSERT INTO organization_invitations
                 (id,organization_id,invited_email,role,invited_by_user_id,token_sha256,expires_at)
                 VALUES (?,?,?,?,?,?,?)'
            )->execute([
                AccountPolicy::newUuid(),$orgId,$email,$role,$ownerId,$hash,$expires
            ]);
            $this->pdo->commit();
        } catch (\Throwable $e) {
            if ($this->pdo->inTransaction()) $this->pdo->rollBack();
            throw $e;
        }
        $this->delivery->invitation($email,$token,$orgName);
    }

    public function acceptInvitation(string $userId,string $rawToken): string
    {
        $hash=AccountPolicy::tokenHash($rawToken);
        $this->pdo->beginTransaction();
        try {
            $user=$this->assertActiveUser($userId);
            $q=$this->pdo->prepare(
                "SELECT i.id,i.organization_id,i.invited_email,i.role
                 FROM organization_invitations i
                 JOIN organizations o ON o.id=i.organization_id
                 WHERE i.token_sha256=? AND i.accepted_at IS NULL AND i.revoked_at IS NULL
                 AND i.expires_at > UTC_TIMESTAMP(6) AND o.status='active'
                 FOR UPDATE"
            );
            $q->execute([$hash]);
            $invite=$q->fetch();
            if (!$invite || !hash_equals((string)$invite['invited_email'],(string)$user['email'])) {
                throw new DomainException('Einladung ist ungültig oder gehört einem anderen Konto.');
            }
            $this->pdo->prepare(
                'INSERT INTO organization_memberships (organization_id,user_id,role)
                 VALUES (?,?,?)'
            )->execute([$invite['organization_id'],$userId,$invite['role']]);
            $this->pdo->prepare(
                'UPDATE organization_invitations SET accepted_at=UTC_TIMESTAMP(6) WHERE id=?'
            )->execute([$invite['id']]);
            $this->pdo->commit();
            return (string)$invite['organization_id'];
        } catch (\Throwable $e) {
            if ($this->pdo->inTransaction()) $this->pdo->rollBack();
            throw $e;
        }
    }

    /** Owners can promote another member, but can never demote the last owner. */
    public function changeRole(
        string $ownerId,string $orgId,string $memberId,string $newRole
    ): void {
        if (!in_array($newRole,AccountPolicy::roles(),true)) {
            throw new DomainException('Ungültige Rolle.');
        }
        $this->pdo->beginTransaction();
        try {
            $this->lockAndAuthorizeOwner($ownerId,$orgId);
            $current=$this->lockTargetMember($orgId,$memberId);
            if ($current['role']==='owner' && $newRole!=='owner' && $current['status']==='active') {
                $this->assertHasOtherOwner($orgId,$memberId);
            }
            $this->pdo->prepare(
                'UPDATE organization_memberships SET role=? WHERE organization_id=? AND user_id=?'
            )->execute([$newRole,$orgId,$memberId]);
            $this->pdo->commit();
        } catch (\Throwable $e) {
            if ($this->pdo->inTransaction()) $this->pdo->rollBack();
            throw $e;
        }
    }

    public function removeMember(string $ownerId,string $orgId,string $memberId): void
    {
        $this->pdo->beginTransaction();
        try {
            $this->lockAndAuthorizeOwner($ownerId,$orgId);
            $target=$this->lockTargetMember($orgId,$memberId);
            if ($target['role']==='owner' && $target['status']==='active') {
                $this->assertHasOtherOwner($orgId,$memberId);
            }
            $this->pdo->prepare(
                'DELETE FROM organization_memberships WHERE organization_id=? AND user_id=?'
            )->execute([$orgId,$memberId]);
            $this->pdo->commit();
        } catch (\Throwable $e) {
            if ($this->pdo->inTransaction()) $this->pdo->rollBack();
            throw $e;
        }
    }

    private function lockAndAuthorizeOwner(string $ownerId,string $orgId): void
    {
        // Lock the club row before counting owners; all role changes use it.
        $lock=$this->pdo->prepare('SELECT id FROM organizations WHERE id=? FOR UPDATE');
        $lock->execute([$orgId]);
        if (!$lock->fetch())throw new DomainException('Verein nicht gefunden.');
        $this->requireMembership($ownerId,$orgId,'members.manage');
    }

    private function lockTargetMember(string $orgId,string $memberId): array
    {
        $q=$this->pdo->prepare(
            'SELECT role,status FROM organization_memberships
             WHERE organization_id=? AND user_id=? FOR UPDATE'
        );
        $q->execute([$orgId,$memberId]);
        $m=$q->fetch();
        if (!$m)throw new DomainException('Mitgliedschaft nicht gefunden.');
        return $m;
    }

    private function assertHasOtherOwner(string $orgId,string $targetId): void
    {
        $q=$this->pdo->prepare(
            "SELECT COUNT(*) FROM organization_memberships m
             JOIN users u ON u.id=m.user_id
             WHERE m.organization_id=? AND m.user_id<>? AND m.role='owner'
             AND m.status='active' AND u.status='active'
             AND u.email_verified_at IS NOT NULL"
        );
        $q->execute([$orgId,$targetId]);
        AccountPolicy::assertOtherActiveOwnerExists((int)$q->fetchColumn());
    }
}
