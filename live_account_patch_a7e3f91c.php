<?php
/**
 * One-time: set score collector account on live config.
 * Deletes itself after success.
 */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(array('ok' => false, 'message' => 'POST only'));
    exit;
}

$expected = 'a7e3f91c2d84b650e1c9a0d6f5b8c472';
$token = isset($_POST['token']) ? (string) $_POST['token'] : '';
if (!hash_equals($expected, $token)) {
    http_response_code(403);
    echo json_encode(array('ok' => false, 'message' => 'Forbidden'));
    exit;
}

$account = isset($_POST['account']) ? trim((string) $_POST['account']) : 'awesome';
if (!preg_match('/^[A-Za-z0-9_-]{1,40}$/', $account)) {
    http_response_code(400);
    echo json_encode(array('ok' => false, 'message' => 'invalid account'));
    exit;
}

$live_path = __DIR__ . '/data/bacaraai-live.config.php';
if (!is_file($live_path)) {
    http_response_code(500);
    echo json_encode(array('ok' => false, 'message' => 'live config missing'));
    exit;
}

$live = include $live_path;
if (!is_array($live) || empty($live['host']) || empty($live['user']) || !array_key_exists('password', $live) || empty($live['database'])) {
    http_response_code(500);
    echo json_encode(array('ok' => false, 'message' => 'live config invalid'));
    exit;
}

$host = $live['host'];
$user = $live['user'];
$password = $live['password'];
$database = $live['database'];
$port = !empty($live['port']) ? (int) $live['port'] : 3306;

$content = "<?php\n"
    . "if (!defined('_GNUBOARD_')) exit;\n"
    . "return array(\n"
    . "  'host' => '" . addcslashes($host, "\\'") . "',\n"
    . "  'user' => '" . addcslashes($user, "\\'") . "',\n"
    . "  'password' => '" . addcslashes($password, "\\'") . "',\n"
    . "  'database' => '" . addcslashes($database, "\\'") . "',\n"
    . "  'port' => {$port},\n"
    . "  'account' => '" . addcslashes($account, "\\'") . "',\n"
    . ");\n";

if (@file_put_contents($live_path, $content) === false) {
    http_response_code(500);
    echo json_encode(array('ok' => false, 'message' => 'failed to write live config'));
    exit;
}

@unlink(__FILE__);

echo json_encode(array(
    'ok' => true,
    'account' => $account,
    'self_deleted' => !is_file(__FILE__),
), JSON_UNESCAPED_UNICODE);
exit;
