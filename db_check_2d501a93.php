<?php
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(array('ok' => false, 'message' => 'POST only'));
    exit;
}

$token = isset($_POST['token']) ? (string) $_POST['token'] : '';
if (!hash_equals('2d501a932bf7e3df892e409c', $token)) {
    http_response_code(403);
    echo json_encode(array('ok' => false, 'message' => 'Forbidden'));
    exit;
}

$host = isset($_POST['host']) ? (string) $_POST['host'] : 'wuk2002.sldb.iwinv.net';
$user = isset($_POST['user']) ? (string) $_POST['user'] : 'bacaraai';
$password = isset($_POST['password']) ? (string) $_POST['password'] : '';
$database = isset($_POST['database']) ? (string) $_POST['database'] : 'bacaraai';

mysqli_report(MYSQLI_REPORT_OFF);
$mysqli = mysqli_init();
@mysqli_options($mysqli, MYSQLI_OPT_CONNECT_TIMEOUT, 5);
$ok = @mysqli_real_connect($mysqli, $host, $user, $password, $database);

$result = array(
    'ok' => (bool) $ok,
    'server_addr' => isset($_SERVER['SERVER_ADDR']) ? $_SERVER['SERVER_ADDR'] : null,
    'http_host' => isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : null,
    'target_host' => $host,
    'target_user' => $user,
    'target_db' => $database,
);

if ($ok) {
    $result['message'] = 'connected';
    $q = @mysqli_query($mysqli, "SHOW TABLES LIKE 'g5_config'");
    $result['has_g5_config'] = $q && mysqli_num_rows($q) > 0;
    @mysqli_close($mysqli);
    @unlink(__FILE__);
} else {
    $result['message'] = 'connection failed';
    $result['error'] = mysqli_connect_error();
    $result['errno'] = mysqli_connect_errno();
}

echo json_encode($result, JSON_UNESCAPED_UNICODE);
exit;
