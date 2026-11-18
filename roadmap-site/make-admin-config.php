<?php
declare(strict_types=1);
// Runs only inside GitHub Actions; never commit the resulting config file.
$username = strtolower(trim((string)(getenv('ROADMAP_ADMIN_USERNAME') ?: '')));
$password = (string)(getenv('ROADMAP_ADMIN_PASSWORD') ?: '');
if (!preg_match('/^[a-z0-9][a-z0-9._-]{2,39}$/D', $username) ||
    in_array($username, ['gast','admin','system'], true)) {
    fwrite(STDERR, "ROADMAP_ADMIN_USERNAME fehlt oder ist ungültig (3–40 Zeichen).\n");
    exit(1);
}
if (strlen($password) < 16 || strlen($password) > 72 ||
    preg_match('//u', $password) !== 1 ||
    preg_match('/[\x00-\x1f\x7f]/', $password) === 1) {
    fwrite(STDERR, "ROADMAP_ADMIN_PASSWORD muss 16–72 Bytes lang sein, ohne Steuerzeichen.\n");
    exit(1);
}
$hash = password_hash($password, PASSWORD_DEFAULT);
if ($hash === false) {
    fwrite(STDERR, "Password hashing failed.\n"); exit(1);
}
$src = "<?php\ndeclare(strict_types=1);\n".
    "if (!defined('TENNILO_ROADMAP_INTERNAL_ADMIN')) { http_response_code(404); exit; }\n".
    "return ".var_export(['username'=>$username, 'passwordHash'=>$hash], true).";\n";
$target = __DIR__.'/dist/roadmap-initial-admin.php';
if (!is_dir(dirname($target)) && !mkdir(dirname($target), 0700, true)) exit(1);
if (file_put_contents($target, $src, LOCK_EX) === false) exit(1);
echo "Initial admin configuration created (password not logged).\n";
