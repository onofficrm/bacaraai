<?php
/**
 * One-time DB config repair endpoint.
 * Deletes itself after a successful repair.
 */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(array('ok' => false, 'message' => 'POST only'));
    exit;
}

$expected_token = '956c81b6a35030b13237fb225d443ed691d53a2c8143f34f';
$token = isset($_POST['token']) ? (string) $_POST['token'] : '';
if (!hash_equals($expected_token, $token)) {
    http_response_code(403);
    echo json_encode(array('ok' => false, 'message' => 'Forbidden'));
    exit;
}

$host = 'wuk2002.sldb.iwinv.net';
$user = 'bacaraai';
$password = isset($_POST['password']) ? (string) $_POST['password'] : '';
$database = 'bacaraai';

if ($password === '') {
    http_response_code(400);
    echo json_encode(array('ok' => false, 'message' => 'Password is required'));
    exit;
}

mysqli_report(MYSQLI_REPORT_OFF);
$db = @mysqli_connect($host, $user, $password, $database);
if (!$db) {
    http_response_code(400);
    echo json_encode(array(
        'ok' => false,
        'message' => 'DB connection failed',
        'error' => mysqli_connect_error(),
    ), JSON_UNESCAPED_UNICODE);
    exit;
}

$check = @mysqli_query($db, "SELECT COUNT(*) AS cnt FROM `bacaraai` WHERE account='awesome' AND table_name='MD2709'");
if (!$check) {
    http_response_code(400);
    echo json_encode(array(
        'ok' => false,
        'message' => 'DB connected but live table query failed',
        'error' => mysqli_error($db),
    ), JSON_UNESCAPED_UNICODE);
    exit;
}
$check_row = mysqli_fetch_assoc($check);
$live_count = isset($check_row['cnt']) ? (int) $check_row['cnt'] : 0;

$config_path = __DIR__ . '/data/dbconfig.php';
$config = is_file($config_path) ? file_get_contents($config_path) : '';

function db_repair_define($source, $name, $value)
{
    $line = "define('" . $name . "', '" . addcslashes($value, "\\'") . "');";
    $pattern = "/define\\s*\\(\\s*['\\\"]" . preg_quote($name, '/') . "['\\\"]\\s*,\\s*['\\\"][^'\\\"]*['\\\"]\\s*\\)\\s*;/";
    if (preg_match($pattern, $source)) {
        return preg_replace_callback($pattern, function () use ($line) {
            return $line;
        }, $source, 1);
    }
    return rtrim($source) . "\n" . $line . "\n";
}

if ($config === false || trim($config) === '') {
    http_response_code(500);
    echo json_encode(array(
        'ok' => false,
        'message' => 'Existing data/dbconfig.php could not be read; automatic replacement was stopped.',
    ));
    exit;
}

$config = db_repair_define($config, 'G5_MYSQL_HOST', $host);
$config = db_repair_define($config, 'G5_MYSQL_USER', $user);
$config = db_repair_define($config, 'G5_MYSQL_PASSWORD', $password);
$config = db_repair_define($config, 'G5_MYSQL_DB', $database);

$temp_path = $config_path . '.repair';
if (file_put_contents($temp_path, $config, LOCK_EX) === false || !@rename($temp_path, $config_path)) {
    @unlink($temp_path);
    http_response_code(500);
    echo json_encode(array('ok' => false, 'message' => 'data/dbconfig.php is not writable'));
    exit;
}

@chmod($config_path, 0644);
@unlink(__FILE__);

echo json_encode(array(
    'ok' => true,
    'message' => 'DB configuration repaired',
    'live_rows' => $live_count,
), JSON_UNESCAPED_UNICODE);
exit;
