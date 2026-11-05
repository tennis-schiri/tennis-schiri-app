-- TENNILO B0.2: persistent login and signup throttling.
-- Stores pseudonymized HMAC keys, never raw e-mail/IP. No test or actual customer rows.
CREATE TABLE IF NOT EXISTS auth_rate_limits (
  scope_sha256 CHAR(64) NOT NULL,
  requests INT UNSIGNED NOT NULL DEFAULT 0,
  expires_at DATETIME(6) NOT NULL,
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (scope_sha256),
  KEY idx_auth_rate_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
