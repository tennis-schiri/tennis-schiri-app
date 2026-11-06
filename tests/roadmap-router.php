<?php
// Test router ONLY for php -S in GitHub CI. Not in FTPS deployment.
declare(strict_types=1);
$path=parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
if ($path === '/roadmap-api.php') {
    // Simulate Apache's verified Basic Auth and TLS termination in test only.
    $_SERVER['AUTH_TYPE']='Basic';
    $_SERVER['REMOTE_USER']='ci-test-user';
    $_SERVER['HTTPS']='on';
    $_SERVER['DOCUMENT_ROOT']=realpath(__DIR__ . '/../site');
    require __DIR__ . '/../site/roadmap-api.php';
    return true;
}
return false;
