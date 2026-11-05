<?php
declare(strict_types=1);

namespace Tennilo\Backend;

use RuntimeException;

/**
 * Optional mail() transport, never enabled without explicit server setup.
 * No token is logged or returned to the browser. Real delivery, sender
 * reputation/DKIM and templates need a separate staging acceptance test.
 */
final class NativeMailDelivery implements TokenDelivery
{
    public function __construct(
        private readonly string $sender,
        private readonly string $publicUrl
    ) {
        if (filter_var($sender, FILTER_VALIDATE_EMAIL) === false
            || str_contains($sender,"\r") || str_contains($sender,"\n")
            || preg_match('/[\r\n]/',$publicUrl)
            || !str_starts_with($publicUrl,'https://')) {
            throw new RuntimeException('E-Mail-Versand ist nicht sicher eingerichtet.');
        }
        $url=parse_url($publicUrl);
        if (!is_array($url) || empty($url['host']) || isset($url['user']) || isset($url['pass'])) {
            throw new RuntimeException('Unzulässige öffentliche App-Adresse.');
        }
    }

    private function send(string $to,string $subject,string $purpose,string $token): void
    {
        $url=rtrim($this->publicUrl,'/').'/konto.html#'
            .rawurlencode($purpose).'='.rawurlencode($token);
        $message="TENNILO\n\nBitte folgenden Link in einem Browser öffnen:\n"
            .$url."\n\nWenn Sie diese Nachricht nicht angefordert haben, können Sie sie ignorieren.\n";
        $headers=[
            'From' => $this->sender,
            'Content-Type' => 'text/plain; charset=UTF-8',
            'MIME-Version' => '1.0'
        ];
        if (!mail($to,$subject,$message,$headers)) {
            throw new RuntimeException('E-Mail konnte nicht zugestellt werden.');
        }
    }

    public function verification(string $email,string $token): void
    {
        $this->send($email,'TENNILO – E-Mail bestätigen','verify',$token);
    }

    public function passwordReset(string $email,string $token): void
    {
        $this->send($email,'TENNILO – Passwort zurücksetzen','reset',$token);
    }

    public function invitation(string $email,string $token,string $organizationName): void
    {
        $this->send($email,'TENNILO – Vereinseinladung','invite',$token);
    }
}
