<?php
declare(strict_types=1);

namespace Tennilo\Backend;

/**
 * The raw confirmation/reset/invitation token is only passed to this transport.
 * It is never returned by a public API or persisted in plaintext.
 *
 * A real SMTP/provider adapter is intentionally NOT configured yet.
 * This interface has a test-only implementation in CI.
 */
interface TokenDelivery
{
    public function verification(string $email, string $token): void;
    public function passwordReset(string $email, string $token): void;
    public function invitation(string $email, string $token, string $organizationName): void;
}
