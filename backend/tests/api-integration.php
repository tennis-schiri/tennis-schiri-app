<?php
declare(strict_types=1);

require_once dirname(__DIR__).'/src/Database.php';
require_once dirname(__DIR__).'/src/AccountPolicy.php';
require_once dirname(__DIR__).'/src/TokenDelivery.php';
require_once dirname(__DIR__).'/src/AuthService.php';
require_once dirname(__DIR__).'/src/ClubService.php';
require_once dirname(__DIR__).'/src/RateLimiter.php';
require_once dirname(__DIR__).'/src/ApiKernel.php';

use Tennilo\Backend\Database;
use Tennilo\Backend\AuthService;
use Tennilo\Backend\ClubService;
use Tennilo\Backend\TokenDelivery;
use Tennilo\Backend\RateLimiter;
use Tennilo\Backend\ApiKernel;

final class ApiMailSpy implements TokenDelivery {
    public array $verify=[];
    public array $reset=[];
    public array $invite=[];
    public function verification(string $e,string $t):void{$this->verify[$e]=$t;}
    public function passwordReset(string $e,string $t):void{$this->reset[$e]=$t;}
    public function invitation(string $e,string $t,string $n):void{$this->invite[$e]=$t;}
}
function checkApi(bool $yes,string $msg):void {if(!$yes)throw new RuntimeException($msg);}
function status(array $result,int $expected,string $msg):void {
    checkApi($result['status']===$expected,$msg.' expected '.$expected.' got '.($result['status']??'none'));
}

$pdo=Database::fromEnvironment();
if ($pdo->query('SELECT DATABASE()')->fetchColumn()!=='tennilo_ci_test') {
    fwrite(STDERR,"Abbruch: API-Integration nur in tennilo_ci_test.\n");exit(2);
}
$mail=new ApiMailSpy();
$api=new ApiKernel(
    new AuthService($pdo,$mail),new ClubService($pdo,$mail),
    new RateLimiter($pdo,'ci-only-32-byte-rate-limit-secret-not-production'),
    'https://app.tennis-schiri.de'
);
$origin=['origin'=>'https://app.tennis-schiri.de'];
$address='198.51.100.4';
$call=static fn(string $method,string $route,array $data=[],array $cookies=[],array $headers=[]) =>
    $api->dispatch($method,$route,$data,$cookies,$headers,$address);

status($call('POST','/auth/register',['email'=>'wrong','password'=>'PasswortSehrSicher1234','displayName'=>'A'],[],$origin),400,'Ungültige E-Mail');
status($call('POST','/auth/register',['email'=>'api-owner@example.org','password'=>'PasswortSehrSicher1234','displayName'=>'Leitung'],[],['origin'=>'https://fremde-seite.de']),403,'Cross-origin blockiert');
status($call('POST','/auth/register',['email'=>'api-owner@example.org','password'=>'PasswortSehrSicher1234','displayName'=>'Leitung'],[],$origin),202,'Registrierung');
checkApi(isset($mail->verify['api-owner@example.org']),'Mail-Bestätigung fehlt');
status($call('POST','/auth/login',['email'=>'api-owner@example.org','password'=>'PasswortSehrSicher1234'],[],$origin),403,'Vor Verifikation kein Login');
$firstVerifyToken=$mail->verify['api-owner@example.org'];
status($call('POST','/auth/resend-verification',['email'=>'api-owner@example.org'],[],$origin),202,'Bestätigung erneut versenden');
checkApi($firstVerifyToken!==$mail->verify['api-owner@example.org'],'Neues Verifikationstoken muss anders sein');
status($call('POST','/auth/verify',['token'=>$firstVerifyToken],[],$origin),403,'Vorheriger Link widerrufen');
status($call('POST','/auth/verify',['token'=>$mail->verify['api-owner@example.org']],[],$origin),200,'E-Mail-Bestätigung');
$logged=$call('POST','/auth/login',['email'=>'api-owner@example.org','password'=>'PasswortSehrSicher1234'],[],$origin);
status($logged,200,'Login nach Bestätigung');
checkApi(isset($logged['cookies']) && count($logged['cookies'])===2,'Session- und CSRF-Cookies fehlen');
checkApi($logged['cookies'][0]['options']['secure']===true &&
    $logged['cookies'][0]['options']['httponly']===true &&
    $logged['cookies'][1]['options']['httponly']===false &&
    $logged['cookies'][0]['options']['samesite']==='Strict',
    'Session-Cookie-Einstellungen nicht sicher');
$cookie=[
    '__Host-tennilo_session'=>$logged['cookies'][0]['value'],
    '__Host-tennilo_csrf'=>$logged['cookies'][1]['value']
];
$write=$origin+['x-tennilo-csrf'=>$cookie['__Host-tennilo_csrf']];
status($call('GET','/auth/me',[],$cookie),200,'Aktive Sitzung');
status($call('GET','/clubs',[],$cookie),200,'Vereine abrufen');
status($call('POST','/clubs',['name'=>'Testverein','slug'=>'testverein-api'], $cookie,$origin),403,'Kein CSRF');
status($call('POST','/clubs',['name'=>'Testverein','slug'=>'testverein-api'], $cookie,$write),201,'Vereinsanlage');
$clubs=$call('GET','/clubs',[],$cookie);
checkApi(count($clubs['body']['clubs'])===1 &&
    $clubs['body']['clubs'][0]['role']==='owner','Besitzer fehlt');
$org=$clubs['body']['clubs'][0]['id'];
status($call('GET','/clubs/'.$org.'/members',[],$cookie),200,'Mitgliederliste');
status($call('POST','/clubs/'.$org.'/invitations',[
    'email'=>'api-helper@example.org','role'=>'organizer'
],$cookie,$write),202,'Einladungsversand');
checkApi(isset($mail->invite['api-helper@example.org']),'Einladungstoken fehlt');

$otherIp='198.51.100.5';
$helperCall=static fn(string $method,string $route,array $data=[],array $cookies=[],array $headers=[]) =>
    $api->dispatch($method,$route,$data,$cookies,$headers,$otherIp);
status($helperCall('POST','/auth/register',[
    'email'=>'api-helper@example.org','password'=>'AnderesSicheresPasswort1234','displayName'=>'Helfer'
],[],$origin),202,'Helfer registriert');
status($helperCall('POST','/auth/verify',['token'=>$mail->verify['api-helper@example.org']],[],$origin),200,'Helfer bestätigt');
$helperLogin=$helperCall('POST','/auth/login',[
    'email'=>'api-helper@example.org','password'=>'AnderesSicheresPasswort1234'
],[],$origin);
status($helperLogin,200,'Helfer Login');
$hc=['__Host-tennilo_session'=>$helperLogin['cookies'][0]['value'],
    '__Host-tennilo_csrf'=>$helperLogin['cookies'][1]['value']];
$hw=$origin+['x-tennilo-csrf'=>$hc['__Host-tennilo_csrf']];
status($helperCall('GET','/clubs/'.$org.'/members',[],$hc),403,'Vor Einladung keine Mitgliedschaft');
status($helperCall('POST','/invitations/accept',[
    'token'=>$mail->invite['api-helper@example.org']
],$hc,$hw),200,'Einladung annehmen');
status($helperCall('GET','/clubs/'.$org.'/members',[],$hc),200,'Nach Einladung Zugriff');
status($helperCall('POST','/clubs/'.$org.'/invitations',[
    'email'=>'api-third@example.org','role'=>'viewer'
],$hc,$hw),403,'Organisator kann nicht einladen');
status($helperCall('PATCH','/clubs/'.$org.'/members/'.$hc['__Host-tennilo_session'].'/role',[
    'role'=>'owner'
],$hc,$hw),404,'Nicht existente Route bleibt gesperrt');

$badCookie=['__Host-tennilo_session'=>'invalid'];
status($call('GET','/auth/me',[],$badCookie),400,'Manipulierte Sitzung');
status($call('POST','/auth/logout',[],$cookie,$write),200,'Logout');
$loggedOut=$call('POST','/auth/logout',[],$cookie,$write);
status($loggedOut,403,'Sitzung nach Logout ungültig');

$rate=new RateLimiter($pdo,'ci-only-another-secret-of-adequate-length');
$rate->hit('login','ip','192.0.2.19',2,60);
$rate->hit('login','ip','192.0.2.19',2,60);
$denied=false;
try{$rate->hit('login','ip','192.0.2.19',2,60);}
catch(DomainException $e){$denied=true;}
checkApi($denied,'Rate Limiter lässt dritte Anfrage durch');
$rows=$pdo->query('SELECT scope_sha256 FROM auth_rate_limits LIMIT 1')->fetchAll(PDO::FETCH_COLUMN);
checkApi(!empty($rows) && strlen($rows[0])===64,'Limit-Key nicht pseudonymisiert');

echo "B0.2-API: Origin/CSRF, HTTP-Cookies, Registrierung/Bestätigung, Vereine, Einladungen, Rollen, Logout und Rate-Limit bestanden.\n";
