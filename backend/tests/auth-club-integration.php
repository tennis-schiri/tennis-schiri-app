<?php
declare(strict_types=1);

/**
 * End-to-end service integration in disposable CI MariaDB only.
 * No actual emails, web endpoints, SMS or outside infrastructure.
 */
require_once dirname(__DIR__) . '/src/Database.php';
require_once dirname(__DIR__) . '/src/AccountPolicy.php';
require_once dirname(__DIR__) . '/src/TokenDelivery.php';
require_once dirname(__DIR__) . '/src/AuthService.php';
require_once dirname(__DIR__) . '/src/ClubService.php';

use Tennilo\Backend\Database;
use Tennilo\Backend\AccountPolicy;
use Tennilo\Backend\AuthService;
use Tennilo\Backend\ClubService;
use Tennilo\Backend\TokenDelivery;

final class SpyDelivery implements TokenDelivery
{
    /** @var array<string,string> */
    public array $verify = [];
    /** @var array<string,string> */
    public array $reset = [];
    /** @var array<string,array{token:string,org:string}> */
    public array $invites = [];

    public function verification(string $email,string $token): void {
        $this->verify[$email]=$token;
    }
    public function passwordReset(string $email,string $token): void {
        $this->reset[$email]=$token;
    }
    public function invitation(string $email,string $token,string $organizationName): void {
        $this->invites[$email]=['token'=>$token,'org'=>$organizationName];
    }
}
function requireCheck(bool $condition,string $message): void {
    if (!$condition)throw new RuntimeException($message);
}
function deny(callable $f,string $message): void {
    try {$f();}
    catch (\DomainException|\InvalidArgumentException $e) {return;}
    throw new RuntimeException('Verboten, aber erlaubt: '.$message);
}

$db=Database::fromEnvironment();
$name=(string)$db->query('SELECT DATABASE()')->fetchColumn();
if ($name!=='tennilo_ci_test') {
    fwrite(STDERR,"Abbruch: Auth-Integration ausschließlich in tennilo_ci_test.\n");
    exit(2);
}
$mail=new SpyDelivery();
$auth=new AuthService($db,$mail);
$clubs=new ClubService($db,$mail);
$ownerEmail='owner-b02@example.org';
$helperEmail='helper-b02@example.org';
$otherEmail='thirdparty-b02@example.org';
$ownerPassword='Owner-Strong-Test-Password-2026';
$helperPassword='Helper-Strong-Test-Password-2026';

$auth->register($ownerEmail,$ownerPassword,'Vereinsleitung');
requireCheck(isset($mail->verify[$ownerEmail]),'Verifikation wurde nicht versendet');
$pending = $db->prepare('SELECT password_hash,status,email_verified_at FROM users WHERE email=?');
$pending->execute([$ownerEmail]);
$p=$pending->fetch();
requireCheck($p['status']==='pending' && $p['email_verified_at']===null,'Registrierung ist vorzeitig aktiv');
requireCheck($p['password_hash']!==$ownerPassword && password_verify($ownerPassword,$p['password_hash']),'Passwort nicht sicher gespeichert');
deny(fn()=> $auth->login($ownerEmail,$ownerPassword),'Login vor Mailbestätigung');
$auth->register($ownerEmail,$ownerPassword,'Duplikat');
requireCheck(count($mail->verify)===1,'Doppelte Registrierung darf nicht weitere Mail auslösen');

$ownerVerify=$mail->verify[$ownerEmail];
$hashed=$db->prepare('SELECT token_sha256 FROM email_verification_tokens WHERE user_id=(SELECT id FROM users WHERE email=?)');
$hashed->execute([$ownerEmail]);
requireCheck($hashed->fetchColumn()===AccountPolicy::tokenHash($ownerVerify),'Mail-Token nicht gehasht');
$auth->verifyEmail($ownerVerify);
deny(fn()=> $auth->verifyEmail($ownerVerify),'Verifizierungslink darf nicht erneut funktionieren');
deny(fn()=> $auth->login($ownerEmail,'falsches-passwort'),'Falsches Passwort');

$s=$auth->login($ownerEmail,$ownerPassword);
requireCheck(strlen($s['session'])===64 && strlen($s['csrf'])===64,'Zufallstokenlänge');
$me=$auth->requireSession($s['session'],$s['csrf']);
requireCheck($me['email']===$ownerEmail,'Session gehört anderem Konto');
deny(fn()=> $auth->requireSession($s['session'],AccountPolicy::newToken()),'Falscher CSRF-Schutz');
$check=$db->prepare('SELECT token_sha256 FROM auth_sessions WHERE user_id=?');
$check->execute([$me['id']]);
requireCheck($check->fetchColumn()===AccountPolicy::tokenHash($s['session']),'Session wurde im Klartext gespeichert');

$org=$clubs->createOrganization($me['id'],'Tennis Verein Test','tennis-verein-ci');
$orgs=$clubs->listOrganizations($me['id']);
requireCheck(count($orgs)===1 && $orgs[0]['role']==='owner','Verein ohne Besitzerrolle');
requireCheck(count($clubs->members($me['id'],$org))===1,'Besitzer-Mitglied fehlt');
deny(fn()=> $clubs->removeMember($me['id'],$org,$me['id']),'Letzten Besitzer entfernen');
deny(fn()=> $clubs->changeRole($me['id'],$org,$me['id'],'viewer'),'Letzten Besitzer herabstufen');

$auth->register($helperEmail,$helperPassword,'Helfer');
$auth->verifyEmail($mail->verify[$helperEmail]);
$helper=$auth->login($helperEmail,$helperPassword);
$helperUser=$auth->requireSession($helper['session'],$helper['csrf']);
$auth->register($otherEmail,'Outsider-Test-Password-2026','Fremdperson');
$auth->verifyEmail($mail->verify[$otherEmail]);
$outsider=$auth->login($otherEmail,'Outsider-Test-Password-2026');
$outsiderUser=$auth->requireSession($outsider['session'],$outsider['csrf']);
deny(fn()=> $clubs->members($outsiderUser['id'],$org),'Anderer Verein sieht Mitgliedschaft');
deny(fn()=> $clubs->createOrganization($outsiderUser['id'],'Bad club','api'),'Reservierter Slug');
deny(fn()=> $clubs->invite($helperUser['id'],$org,'guest@example.org','viewer'),'Nichtmitglied lädt ein');

$clubs->invite($me['id'],$org,$helperEmail,'organizer');
requireCheck(isset($mail->invites[$helperEmail]),'Einladung nicht zugestellt');
requireCheck($mail->invites[$helperEmail]['org']==='Tennis Verein Test','Falscher Vereinsname');
$invitation=$mail->invites[$helperEmail]['token'];
deny(fn()=> $clubs->acceptInvitation($outsiderUser['id'],$invitation),'Token gehört anderem E-Mail-Konto');
$joined=$clubs->acceptInvitation($helperUser['id'],$invitation);
requireCheck($joined===$org,'Einladung landet im falschen Verein');
deny(fn()=> $clubs->acceptInvitation($helperUser['id'],$invitation),'Einladung darf nur einmal benutzt werden');
requireCheck(count($clubs->members($me['id'],$org))===2,'Helfer fehlt in Liste');
deny(fn()=> $clubs->invite($helperUser['id'],$org,'invitee@example.org','viewer'),'Organisator darf keine Einladungen versenden');
deny(fn()=> $clubs->removeMember($helperUser['id'],$org,$me['id']),'Organisator darf Besitzer nicht entfernen');

$clubs->changeRole($me['id'],$org,$helperUser['id'],'viewer');
requireCheck($clubs->members($me['id'],$org)[0]['role']!=='' ,'Mitgliedsstatus fehlt');
deny(fn()=> $clubs->changeRole($helperUser['id'],$org,$me['id'],'viewer'),'Leser darf Rolle nicht ändern');
$clubs->changeRole($me['id'],$org,$helperUser['id'],'owner');
$clubs->changeRole($me['id'],$org,$me['id'],'organizer');
deny(fn()=> $clubs->removeMember($helperUser['id'],$org,$helperUser['id']),'Neuer letzter Besitzer');
$clubs->removeMember($helperUser['id'],$org,$me['id']);
requireCheck(count($clubs->members($helperUser['id'],$org))===1,'Mitglied nicht entfernt');
deny(fn()=> $clubs->members($me['id'],$org),'Entferntes Mitglied hat noch Zugriff');

$auth->requestPasswordReset('unknown-b02@example.org');
requireCheck(!isset($mail->reset['unknown-b02@example.org']),'Unbekanntes Konto erhält Token');
$auth->requestPasswordReset($helperEmail);
$reset=$mail->reset[$helperEmail];
$auth->resetPassword($reset,'Updated-Strong-Password-2026');
deny(fn()=> $auth->resetPassword($reset,'Another-Strong-Password-2026'),'Reset mehrfach nutzbar');
deny(fn()=> $auth->requireSession($helper['session']),'Sitzung nach Reset nicht widerrufen');
deny(fn()=> $auth->login($helperEmail,$helperPassword),'Altes Passwort funktioniert');
$fresh=$auth->login($helperEmail,'Updated-Strong-Password-2026');
$auth->logout($fresh['session'],$fresh['csrf']);
deny(fn()=> $auth->requireSession($fresh['session']),'Abmeldung muss Sitzung sperren');

echo "B0.2: Registrierung, Mailbestätigung, Sessions/CSRF, Vereinsbesitzer, Einladungen, Fremdzugriff, Last-Owner, Passwort-Reset und Logout: erfolgreich.\n";
