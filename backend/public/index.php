<?php
declare(strict_types=1);

/**
 * TENNILO future HTTP API entrypoint.
 *
 * DISABLED unless explicitly enabled with TENNILO_API_ENABLED=1.
 * This file must NEVER be deployed together with public app assets before
 * staging mail, database, origin, rate-limit secret and security review.
 * Keep backend/ private; publish only this entrypoint through an audited
 * separate staging deploy when authorized.
 */
declare(ticks=0);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');
header("Content-Security-Policy: default-src 'none'; frame-ancestors 'none'");
header('X-Frame-Options: DENY');

function closed(): never {
    http_response_code(503);
    echo json_encode(['error'=>'TENNILO-Benutzerkonten sind noch nicht freigeschaltet.']);
    exit;
}
if (getenv('TENNILO_API_ENABLED') !== '1') closed();
if (($_SERVER['HTTPS'] ?? '') !== 'on' && ($_SERVER['HTTPS'] ?? '') !== '1') closed();

$origin=getenv('TENNILO_APP_ORIGIN');
$publicUrl=getenv('TENNILO_PUBLIC_URL');
$sender=getenv('TENNILO_MAIL_FROM');
$secret=getenv('TENNILO_RATE_HMAC_KEY');
if (!is_string($origin) || !str_starts_with($origin,'https://')
    || !is_string($publicUrl) || !str_starts_with($publicUrl,'https://')
    || !is_string($sender) || $sender==='' || !is_string($secret)
    || strlen($secret)<32) closed();

$method=$_SERVER['REQUEST_METHOD']??'GET';
if (!in_array($method,['GET','POST','PATCH','DELETE'],true)) {
    header('Allow: GET, POST, PATCH, DELETE');
    http_response_code(405);
    echo json_encode(['error'=>'Nicht unterstützte Anfrage.']);
    exit;
}

$body=[];
if ($method==='POST' || $method==='PATCH') {
    if (!str_starts_with(strtolower($_SERVER['CONTENT_TYPE']??''),'application/json')) {
        http_response_code(415);
        echo json_encode(['error'=>'JSON erwartet.']);
        exit;
    }
    if ((int)($_SERVER['CONTENT_LENGTH']??0)>8192) {
        http_response_code(413);
        echo json_encode(['error'=>'Anfrage zu groß.']);
        exit;
    }
    $raw=file_get_contents('php://input',false,null,0,8193);
    if (!is_string($raw) || strlen($raw)>8192) {
        http_response_code(413);
        echo json_encode(['error'=>'Anfrage zu groß.']);
        exit;
    }
    $decoded=json_decode($raw,false);
    if (!($decoded instanceof \stdClass)) {
        http_response_code(400);
        echo json_encode(['error'=>'Ungültiges JSON-Objekt.']);
        exit;
    }
    $body=(array)$decoded;
}

require_once dirname(__DIR__).'/src/Database.php';
require_once dirname(__DIR__).'/src/AccountPolicy.php';
require_once dirname(__DIR__).'/src/TokenDelivery.php';
require_once dirname(__DIR__).'/src/NativeMailDelivery.php';
require_once dirname(__DIR__).'/src/AuthService.php';
require_once dirname(__DIR__).'/src/ClubService.php';
require_once dirname(__DIR__).'/src/RateLimiter.php';
require_once dirname(__DIR__).'/src/ApiKernel.php';

try {
    $pdo=\Tennilo\Backend\Database::fromEnvironment();
    $delivery=new \Tennilo\Backend\NativeMailDelivery($sender,$publicUrl);
    $api=new \Tennilo\Backend\ApiKernel(
        new \Tennilo\Backend\AuthService($pdo,$delivery),
        new \Tennilo\Backend\ClubService($pdo,$delivery),
        new \Tennilo\Backend\RateLimiter($pdo,$secret),
        $origin
    );
    $route=$_GET['route']??'';
    if (!is_string($route) || strlen($route)>220 || !str_starts_with($route,'/')) {
        http_response_code(404);
        echo json_encode(['error'=>'API-Aktion unbekannt.']);
        exit;
    }
    $response=$api->dispatch($method,$route,$body,$_COOKIE,[
        'origin'=>$_SERVER['HTTP_ORIGIN']??null,
        'x-tennilo-csrf'=>$_SERVER['HTTP_X_TENNILO_CSRF']??null
    ],$_SERVER['REMOTE_ADDR']??'');
    foreach ($response['cookies']??[] as $cookie) {
        setcookie($cookie['name'],$cookie['value'],$cookie['options']);
    }
    http_response_code($response['status']);
    echo json_encode($response['body'],JSON_UNESCAPED_UNICODE);
} catch (\Throwable $e) {
    // Secrets and SQL diagnostics must never reach a browser response.
    http_response_code(503);
    echo json_encode(['error'=>'Dienst momentan nicht verfügbar.']);
}
