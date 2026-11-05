-- TENNILO Backend Phase B0.1 – MariaDB/MySQL, PHP 8.2+
-- Source only; NOT deployed by the current FTPS workflow.
-- Run once on a dedicated, private test database after backing up.
-- All timestamps are UTC and IDs are application-generated UUID strings.
-- Never store raw reset, invitation, verification or session tokens.
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(100) NOT NULL,
  sha256 CHAR(64) NOT NULL,
  applied_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) NOT NULL,
  email VARCHAR(254) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(120) NOT NULL,
  status ENUM('pending','active','disabled') NOT NULL DEFAULT 'pending',
  email_verified_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS organizations (
  id CHAR(36) NOT NULL,
  name VARCHAR(160) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  billing_email VARCHAR(254) NULL,
  status ENUM('active','suspended','closed') NOT NULL DEFAULT 'active',
  created_by_user_id CHAR(36) NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_organizations_slug (slug),
  KEY idx_organizations_creator (created_by_user_id),
  CONSTRAINT fk_organizations_creator FOREIGN KEY (created_by_user_id)
    REFERENCES users (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Membership is the only authority for an organization's administrative rights.
-- Creating an organization must insert its first owner in the SAME transaction.
CREATE TABLE IF NOT EXISTS organization_memberships (
  organization_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  role ENUM('owner','organizer','viewer') NOT NULL,
  status ENUM('active','suspended') NOT NULL DEFAULT 'active',
  joined_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (organization_id,user_id),
  KEY idx_memberships_user (user_id,status),
  CONSTRAINT fk_memberships_org FOREIGN KEY (organization_id)
    REFERENCES organizations (id) ON DELETE CASCADE,
  CONSTRAINT fk_memberships_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Invitations are NOT memberships. Tokens must be 32 random bytes;
-- only SHA-256 hex digest (never the actual token) is written to the DB.
CREATE TABLE IF NOT EXISTS organization_invitations (
  id CHAR(36) NOT NULL,
  organization_id CHAR(36) NOT NULL,
  invited_email VARCHAR(254) NOT NULL,
  role ENUM('organizer','viewer') NOT NULL,
  invited_by_user_id CHAR(36) NOT NULL,
  token_sha256 CHAR(64) NOT NULL,
  expires_at DATETIME(6) NOT NULL,
  accepted_at DATETIME(6) NULL,
  revoked_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_invitations_token (token_sha256),
  KEY idx_invitations_org_email (organization_id,invited_email),
  KEY idx_invitations_expires (expires_at),
  CONSTRAINT fk_invitations_org FOREIGN KEY (organization_id)
    REFERENCES organizations (id) ON DELETE CASCADE,
  CONSTRAINT fk_invitations_inviter FOREIGN KEY (invited_by_user_id)
    REFERENCES users (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  token_sha256 CHAR(64) NOT NULL,
  expires_at DATETIME(6) NOT NULL,
  consumed_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_email_verify_token (token_sha256),
  KEY idx_email_verify_user (user_id),
  CONSTRAINT fk_email_verify_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  token_sha256 CHAR(64) NOT NULL,
  expires_at DATETIME(6) NOT NULL,
  consumed_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_password_reset_token (token_sha256),
  KEY idx_password_reset_user (user_id),
  CONSTRAINT fk_password_reset_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Browser sends an opaque 32-byte session cookie; only its SHA-256 hash is saved.
-- CSRF secret is stored hashed and is validated by the later HTTP API.
CREATE TABLE IF NOT EXISTS auth_sessions (
  id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  token_sha256 CHAR(64) NOT NULL,
  csrf_sha256 CHAR(64) NOT NULL,
  expires_at DATETIME(6) NOT NULL,
  last_seen_at DATETIME(6) NULL,
  revoked_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_auth_session_token (token_sha256),
  KEY idx_auth_sessions_user (user_id,expires_at),
  CONSTRAINT fk_auth_sessions_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Global support role is not implicitly inherited from any organization.
-- Initial platform admin must be provisioned by a controlled operator process.
CREATE TABLE IF NOT EXISTS platform_administrators (
  user_id CHAR(36) NOT NULL,
  granted_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (user_id),
  CONSTRAINT fk_platform_admins_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Product prices are NOT seeded until approved by the owner.
-- billing_interval 'per_event' enables a future single-tournament option.
CREATE TABLE IF NOT EXISTS license_plans (
  id CHAR(36) NOT NULL,
  code VARCHAR(40) NOT NULL,
  name VARCHAR(100) NOT NULL,
  billing_interval ENUM('free','per_event','monthly','annual','custom') NOT NULL,
  price_cents INT UNSIGNED NULL,
  currency CHAR(3) NOT NULL DEFAULT 'EUR',
  max_tournaments INT UNSIGNED NULL,
  max_organizers INT UNSIGNED NULL,
  is_public TINYINT(1) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_license_plans_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- One CURRENT license slot per organization. Historical events go to audit.
-- Future invoices and payment provider records use separate migrations.
CREATE TABLE IF NOT EXISTS organization_licenses (
  id CHAR(36) NOT NULL,
  organization_id CHAR(36) NOT NULL,
  plan_id CHAR(36) NOT NULL,
  status ENUM('trialing','active','grace','expired','suspended','cancelled') NOT NULL,
  valid_from DATETIME(6) NOT NULL,
  valid_until DATETIME(6) NULL,
  granted_by_user_id CHAR(36) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uq_one_license_per_org (organization_id),
  KEY idx_licenses_plan (plan_id),
  KEY idx_licenses_status_expiry (status,valid_until),
  CONSTRAINT fk_licenses_org FOREIGN KEY (organization_id)
    REFERENCES organizations (id) ON DELETE RESTRICT,
  CONSTRAINT fk_licenses_plan FOREIGN KEY (plan_id)
    REFERENCES license_plans (id) ON DELETE RESTRICT,
  CONSTRAINT fk_licenses_grantor FOREIGN KEY (granted_by_user_id)
    REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  organization_id CHAR(36) NULL,
  actor_user_id CHAR(36) NULL,
  event_type VARCHAR(80) NOT NULL,
  subject_type VARCHAR(40) NOT NULL,
  subject_id CHAR(36) NULL,
  details_json JSON NULL,
  occurred_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  KEY idx_audit_org_created (organization_id,occurred_at),
  KEY idx_audit_actor (actor_user_id),
  CONSTRAINT fk_audit_org FOREIGN KEY (organization_id)
    REFERENCES organizations (id) ON DELETE SET NULL,
  CONSTRAINT fk_audit_actor FOREIGN KEY (actor_user_id)
    REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
