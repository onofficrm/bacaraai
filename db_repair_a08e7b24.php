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

$expected_token = 'a08e7b24a6f8aba0c587675486c07bcabe835466d2560972';
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

$check = @mysqli_query(
    $db,
    "SELECT COUNT(*) AS cnt FROM `bacaraai` WHERE account='awesome' AND table_name='MD2709'"
);
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
$config = is_file($config_path) ? file_get_contents($config_path) : false;

function db_repair_define($source, $name, $value, $quote = true)
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

    // Support if (!defined(...)) { define(...); } style
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
} else {
    $config = db_repair_define($config, 'G5_MYSQL_HOST', $host);
    $config = db_repair_define($config, 'G5_MYSQL_USER', $user);
    $config = db_repair_define($config, 'G5_MYSQL_PASSWORD', $password);
    $config = db_repair_define($config, 'G5_MYSQL_DB', $database);
    $config = db_repair_define($config, 'G5_MYSQL_SET_MODE', 'true', false);
}

$temp_path = $config_path . '.repair';
if (@file_put_contents($temp_path, $config, LOCK_EX) === false || !@rename($temp_path, $config_path)) {
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
