<?php
/**
 * One-time apply of homepage + score DB credentials.
 * Deletes itself after writing configs.
 */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(array('ok' => false, 'message' => 'POST only'));
    exit;
}

$expected = 'ccbcc70096586f1792266e768699d254';
$token = isset($_POST['token']) ? (string) $_POST['token'] : '';
if (!hash_equals($expected, $token)) {
    http_response_code(403);
    echo json_encode(array('ok' => false, 'message' => 'Forbidden'));
    exit;
}

$host = isset($_POST['host']) ? (string) $_POST['host'] : 'wuk2002.sldb.iwinv.net';
$port = isset($_POST['port']) ? (int) $_POST['port'] : 3306;
$user = isset($_POST['user']) ? (string) $_POST['user'] : 'bacaraai';
$password = isset($_POST['password']) ? (string) $_POST['password'] : '';
$database = isset($_POST['database']) ? (string) $_POST['database'] : 'bacaraai';
$force = !isset($_POST['force']) || $_POST['force'] === '1';

if ($password === '') {
    http_response_code(400);
    echo json_encode(array('ok' => false, 'message' => 'password required'));
    exit;
}

mysqli_report(MYSQLI_REPORT_OFF);
$mysqli = mysqli_init();
@mysqli_options($mysqli, MYSQLI_OPT_CONNECT_TIMEOUT, 6);
$connected = @mysqli_real_connect($mysqli, $host, $user, $password, $database, $port);
$connect_error = $connected ? '' : mysqli_connect_error();
$has_g5 = false;
$has_score = false;

if ($connected) {
    $q1 = @mysqli_query($mysqli, "SHOW TABLES LIKE 'g5_config'");
    $has_g5 = $q1 && mysqli_num_rows($q1) > 0;
    $q2 = @mysqli_query($mysqli, "SHOW TABLES LIKE 'bacaraai'");
    $has_score = $q2 && mysqli_num_rows($q2) > 0;
    @mysqli_close($mysqli);
} elseif (!$force) {
    http_response_code(400);
    echo json_encode(array(
        'ok' => false,
        'message' => 'DB connection failed',
        'error' => $connect_error,
        'server_addr' => isset($_SERVER['SERVER_ADDR']) ? $_SERVER['SERVER_ADDR'] : null,
    ), JSON_UNESCAPED_UNICODE);
    exit;
}

$config_path = __DIR__ . '/data/dbconfig.php';
$live_path = __DIR__ . '/data/bacaraai-live.config.php';

$config = "<?php\n"
    . "if (!defined('_GNUBOARD_')) exit;\n\n"
    . "define('G5_MYSQL_HOST', '" . addcslashes($host, "\\'") . "');\n"
    . "define('G5_MYSQL_USER', '" . addcslashes($user, "\\'") . "');\n"
    . "define('G5_MYSQL_PASSWORD', '" . addcslashes($password, "\\'") . "');\n"
    . "define('G5_MYSQL_DB', '" . addcslashes($database, "\\'") . "');\n"
    . "define('G5_MYSQL_SET_MODE', true);\n\n"
    . "define('G5_TABLE_PREFIX', 'g5_');\n"
    . "define('G5_TOKEN_ENCRYPTION_KEY', '4f8b63ad7291c0e5');\n\n"
    . "\$g5['write_prefix'] = G5_TABLE_PREFIX.'write_';\n"
    . "\$g5['auth_table'] = G5_TABLE_PREFIX.'auth';\n"
    . "\$g5['config_table'] = G5_TABLE_PREFIX.'config';\n"
    . "\$g5['group_table'] = G5_TABLE_PREFIX.'group';\n"
    . "\$g5['group_member_table'] = G5_TABLE_PREFIX.'group_member';\n"
    . "\$g5['board_table'] = G5_TABLE_PREFIX.'board';\n"
    . "\$g5['board_file_table'] = G5_TABLE_PREFIX.'board_file';\n"
    . "\$g5['board_good_table'] = G5_TABLE_PREFIX.'board_good';\n"
    . "\$g5['board_new_table'] = G5_TABLE_PREFIX.'board_new';\n"
    . "\$g5['login_table'] = G5_TABLE_PREFIX.'login';\n"
    . "\$g5['mail_table'] = G5_TABLE_PREFIX.'mail';\n"
    . "\$g5['member_table'] = G5_TABLE_PREFIX.'member';\n"
    . "\$g5['member_auto_login_table'] = G5_TABLE_PREFIX.'member_auto_login';\n"
    . "\$g5['memo_table'] = G5_TABLE_PREFIX.'memo';\n"
    . "\$g5['poll_table'] = G5_TABLE_PREFIX.'poll';\n"
    . "\$g5['poll_etc_table'] = G5_TABLE_PREFIX.'poll_etc';\n"
    . "\$g5['point_table'] = G5_TABLE_PREFIX.'point';\n"
    . "\$g5['popular_table'] = G5_TABLE_PREFIX.'popular';\n"
    . "\$g5['scrap_table'] = G5_TABLE_PREFIX.'scrap';\n"
    . "\$g5['visit_table'] = G5_TABLE_PREFIX.'visit';\n"
    . "\$g5['visit_sum_table'] = G5_TABLE_PREFIX.'visit_sum';\n"
    . "\$g5['uniqid_table'] = G5_TABLE_PREFIX.'uniqid';\n"
    . "\$g5['autosave_table'] = G5_TABLE_PREFIX.'autosave';\n"
    . "\$g5['cert_history_table'] = G5_TABLE_PREFIX.'cert_history';\n"
    . "\$g5['qa_config_table'] = G5_TABLE_PREFIX.'qa_config';\n"
    . "\$g5['qa_content_table'] = G5_TABLE_PREFIX.'qa_content';\n"
    . "\$g5['content_table'] = G5_TABLE_PREFIX.'content';\n"
    . "\$g5['faq_table'] = G5_TABLE_PREFIX.'faq';\n"
    . "\$g5['faq_master_table'] = G5_TABLE_PREFIX.'faq_master';\n"
    . "\$g5['new_win_table'] = G5_TABLE_PREFIX.'new_win';\n"
    . "\$g5['menu_table'] = G5_TABLE_PREFIX.'menu';\n"
    . "\$g5['social_profile_table'] = G5_TABLE_PREFIX.'member_social_profiles';\n"
    . "\$g5['member_cert_history_table'] = G5_TABLE_PREFIX.'member_cert_history';\n";

$live = "<?php\n"
    . "if (!defined('_GNUBOARD_')) exit;\n"
    . "return array(\n"
    . "  'host' => '" . addcslashes($host, "\\'") . "',\n"
    . "  'user' => '" . addcslashes($user, "\\'") . "',\n"
    . "  'password' => '" . addcslashes($password, "\\'") . "',\n"
    . "  'database' => '" . addcslashes($database, "\\'") . "',\n"
    . "  'port' => " . (int) $port . ",\n"
    . ");\n";

$tmp1 = $config_path . '.tmp';
$tmp2 = $live_path . '.tmp';
$ok1 = @file_put_contents($tmp1, $config, LOCK_EX) !== false && @rename($tmp1, $config_path);
$ok2 = @file_put_contents($tmp2, $live, LOCK_EX) !== false && @rename($tmp2, $live_path);
@unlink($tmp1);
@unlink($tmp2);
if ($ok1) @chmod($config_path, 0644);
if ($ok2) @chmod($live_path, 0644);

@unlink(__FILE__);

echo json_encode(array(
    'ok' => ($ok1 && $ok2),
    'connected' => (bool) $connected,
    'connect_error' => $connect_error,
    'has_g5_config' => $has_g5,
    'has_score_table' => $has_score,
    'written_dbconfig' => (bool) $ok1,
    'written_live_config' => (bool) $ok2,
    'server_addr' => isset($_SERVER['SERVER_ADDR']) ? $_SERVER['SERVER_ADDR'] : null,
), JSON_UNESCAPED_UNICODE);
exit;
