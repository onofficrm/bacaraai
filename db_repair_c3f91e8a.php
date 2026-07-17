<?php
/**
 * One-time homepage DB config repair.
 * Deletes itself after success.
 */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(array('ok' => false, 'message' => 'POST only'));
    exit;
}

$expected_token = 'c3f91e8a72b04d6e9a15f0c8d47b2a6190e3c5d8f1a2467b';
$token = isset($_POST['token']) ? (string) $_POST['token'] : '';
if (!hash_equals($expected_token, $token)) {
    http_response_code(403);
    echo json_encode(array('ok' => false, 'message' => 'Forbidden'));
    exit;
}

$host = isset($_POST['host']) ? (string) $_POST['host'] : 'wuk2002.sldb.iwinv.net';
$user = isset($_POST['user']) ? (string) $_POST['user'] : 'bacaraai';
$password = isset($_POST['password']) ? (string) $_POST['password'] : '';
$database = isset($_POST['database']) ? (string) $_POST['database'] : 'bacaraai';

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
        'message' => 'Homepage DB connection failed',
        'error' => mysqli_connect_error(),
        'host' => $host,
        'user' => $user,
        'database' => $database,
    ), JSON_UNESCAPED_UNICODE);
    exit;
}

$tables_ok = @mysqli_query($db, "SHOW TABLES LIKE 'g5_config'");
$has_g5 = $tables_ok && mysqli_num_rows($tables_ok) > 0;

$config_path = __DIR__ . '/data/dbconfig.php';
$live_path = __DIR__ . '/data/bacaraai-live.config.php';
$config = is_file($config_path) ? file_get_contents($config_path) : false;

function repair_define($source, $name, $value, $quote = true)
{
    if ($quote) {
        $line = "define('" . $name . "', '" . addcslashes($value, "\\'") . "');";
        $pattern = "/define\\s*\\(\\s*['\\\"]" . preg_quote($name, '/') . "['\\\"]\\s*,\\s*['\\\"][^'\\\"]*['\\\"]\\s*\\)\\s*;/";
    } else {
        $line = "define('" . $name . "', " . $value . ");";
        $pattern = "/define\\s*\\(\\s*['\\\"]" . preg_quote($name, '/') . "['\\\"]\\s*,\\s*(true|false|[0-9]+)\\s*\\)\\s*;/";
    }

    if (preg_match($pattern, $source)) {
        return preg_replace($pattern, $line, $source, 1);
    }

    $block = "/if\\s*\\(\\s*!\\s*defined\\s*\\(\\s*['\\\"]" . preg_quote($name, '/') . "['\\\"]\\s*\\)\\s*\\)\\s*\\{\\s*define\\s*\\(\\s*['\\\"]" . preg_quote($name, '/') . "['\\\"]\\s*,\\s*[^;]+;\\s*\\}/s";
    if (preg_match($block, $source)) {
        $replacement = "if (!defined('" . $name . "')) {\n    " . $line . "\n}";
        return preg_replace($block, $replacement, $source, 1);
    }

    return rtrim($source) . "\n" . $line . "\n";
}

if ($config === false || trim((string) $config) === '') {
    $config = "<?php\n"
        . "if (!defined('_GNUBOARD_')) exit;\n\n"
        . "if (!defined('G5_MYSQL_HOST')) {\n    define('G5_MYSQL_HOST', '" . addcslashes($host, "\\'") . "');\n}\n"
        . "if (!defined('G5_MYSQL_USER')) {\n    define('G5_MYSQL_USER', '" . addcslashes($user, "\\'") . "');\n}\n"
        . "if (!defined('G5_MYSQL_PASSWORD')) {\n    define('G5_MYSQL_PASSWORD', '" . addcslashes($password, "\\'") . "');\n}\n"
        . "if (!defined('G5_MYSQL_DB')) {\n    define('G5_MYSQL_DB', '" . addcslashes($database, "\\'") . "');\n}\n"
        . "if (!defined('G5_MYSQL_SET_MODE')) {\n    define('G5_MYSQL_SET_MODE', true);\n}\n\n"
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
} else {
    $config = repair_define($config, 'G5_MYSQL_HOST', $host);
    $config = repair_define($config, 'G5_MYSQL_USER', $user);
    $config = repair_define($config, 'G5_MYSQL_PASSWORD', $password);
    $config = repair_define($config, 'G5_MYSQL_DB', $database);
    $config = repair_define($config, 'G5_MYSQL_SET_MODE', 'true', false);
}

$temp = $config_path . '.repair';
if (@file_put_contents($temp, $config, LOCK_EX) === false || !@rename($temp, $config_path)) {
    @unlink($temp);
    http_response_code(500);
    echo json_encode(array('ok' => false, 'message' => 'data/dbconfig.php is not writable'));
    exit;
}
@chmod($config_path, 0644);

$live_password = isset($_POST['live_password']) ? (string) $_POST['live_password'] : '';
$live_written = false;
if ($live_password !== '') {
    $live_host = isset($_POST['live_host']) ? (string) $_POST['live_host'] : $host;
    $live_user = isset($_POST['live_user']) ? (string) $_POST['live_user'] : $user;
    $live_db = isset($_POST['live_database']) ? (string) $_POST['live_database'] : $database;
    $live_php = "<?php\n"
        . "if (!defined('_GNUBOARD_')) exit;\n"
        . "return array(\n"
        . "  'host' => '" . addcslashes($live_host, "\\'") . "',\n"
        . "  'user' => '" . addcslashes($live_user, "\\'") . "',\n"
        . "  'password' => '" . addcslashes($live_password, "\\'") . "',\n"
        . "  'database' => '" . addcslashes($live_db, "\\'") . "',\n"
        . ");\n";
    $live_temp = $live_path . '.repair';
    if (@file_put_contents($live_temp, $live_php, LOCK_EX) !== false && @rename($live_temp, $live_path)) {
        @chmod($live_path, 0644);
        $live_written = true;
    }
    @unlink($live_temp);
}

@unlink(__FILE__);

echo json_encode(array(
    'ok' => true,
    'message' => 'Homepage DB configuration repaired',
    'has_g5_config' => $has_g5,
    'live_config_written' => $live_written,
), JSON_UNESCAPED_UNICODE);
exit;
