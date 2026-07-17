<?php
/**
 * One-time homepage DB probe + restore.
 * Finds a working G5 connection and rewrites data/dbconfig.php.
 */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(array('ok' => false, 'message' => 'POST only'));
    exit;
}

$expected = '88f28016af2d1d23238f7278afe23184';
$token = isset($_POST['token']) ? (string) $_POST['token'] : '';
if (!hash_equals($expected, $token)) {
    http_response_code(403);
    echo json_encode(array('ok' => false, 'message' => 'Forbidden'));
    exit;
}

$home_pass = isset($_POST['home_password']) ? (string) $_POST['home_password'] : '';
$score_pass = isset($_POST['score_password']) ? (string) $_POST['score_password'] : '';
if ($home_pass === '') {
    http_response_code(400);
    echo json_encode(array('ok' => false, 'message' => 'home_password required'));
    exit;
}

$config_path = __DIR__ . '/data/dbconfig.php';
$live_path = __DIR__ . '/data/bacaraai-live.config.php';

$current = array(
    'exists' => is_file($config_path),
    'readable' => false,
    'host' => null,
    'user' => null,
    'db' => null,
    'password_len' => null,
);

if (is_file($config_path) && is_readable($config_path)) {
    $raw = file_get_contents($config_path);
    $current['readable'] = true;
    if (preg_match("/G5_MYSQL_HOST['\\\"],\\s*['\\\"]([^'\\\"]+)/", $raw, $m)) $current['host'] = $m[1];
    if (preg_match("/G5_MYSQL_USER['\\\"],\\s*['\\\"]([^'\\\"]+)/", $raw, $m)) $current['user'] = $m[1];
    if (preg_match("/G5_MYSQL_DB['\\\"],\\s*['\\\"]([^'\\\"]+)/", $raw, $m)) $current['db'] = $m[1];
    if (preg_match("/G5_MYSQL_PASSWORD['\\\"],\\s*['\\\"]([^'\\\"]*)/", $raw, $m)) $current['password_len'] = strlen($m[1]);
}

$hosts = array('localhost', '127.0.0.1', 'wuk2002.sldb.iwinv.net');
if (!empty($current['host']) && !in_array($current['host'], $hosts, true)) {
    array_unshift($hosts, $current['host']);
}

$users = array('bacaraai');
if (!empty($current['user']) && !in_array($current['user'], $users, true)) {
    array_unshift($users, $current['user']);
}
// Common iwinv account guesses from hostname
$host_hint = isset($_SERVER['HTTP_HOST']) ? preg_replace('/[^a-z0-9]/', '', strtolower($_SERVER['HTTP_HOST'])) : '';
if ($host_hint !== '' && !in_array($host_hint, $users, true)) $users[] = $host_hint;
if (!in_array('farmsky', $users, true)) $users[] = 'farmsky';

$databases = array('bacaraai');
if (!empty($current['db']) && !in_array($current['db'], $databases, true)) {
    array_unshift($databases, $current['db']);
}

$passwords = array($home_pass);
if ($score_pass !== '' && $score_pass !== $home_pass) {
    $passwords[] = $score_pass;
}

function try_connect($host, $user, $password, $database)
{
    mysqli_report(MYSQLI_REPORT_OFF);
    $mysqli = mysqli_init();
    if (!$mysqli) {
        return array(false, 'mysqli_init failed', null);
    }
    @mysqli_options($mysqli, MYSQLI_OPT_CONNECT_TIMEOUT, 4);
    $ok = @mysqli_real_connect($mysqli, $host, $user, $password, $database);
    if (!$ok) {
        $err = mysqli_connect_error();
        return array(false, $err, null);
    }
    @mysqli_set_charset($mysqli, 'utf8');
    return array(true, '', $mysqli);
}

$attempts = array();
$home_hit = null;
$score_hit = null;

foreach ($hosts as $host) {
    foreach ($users as $user) {
        foreach ($passwords as $password) {
            foreach ($databases as $database) {
                list($ok, $err, $link) = try_connect($host, $user, $password, $database);
                $item = array(
                    'host' => $host,
                    'user' => $user,
                    'database' => $database,
                    'password' => ($password === $home_pass ? 'home' : 'score'),
                    'ok' => $ok,
                    'error' => $ok ? '' : $err,
                    'has_g5_config' => false,
                    'has_bacaraai_table' => false,
                );
                if ($ok && $link) {
                    $q1 = @mysqli_query($link, "SHOW TABLES LIKE 'g5_config'");
                    $item['has_g5_config'] = $q1 && mysqli_num_rows($q1) > 0;
                    $q2 = @mysqli_query($link, "SHOW TABLES LIKE 'bacaraai'");
                    $item['has_bacaraai_table'] = $q2 && mysqli_num_rows($q2) > 0;

                    if ($item['has_g5_config'] && $home_hit === null) {
                        $home_hit = array(
                            'host' => $host,
                            'user' => $user,
                            'password' => $password,
                            'database' => $database,
                        );
                    }
                    if ($item['has_bacaraai_table'] && $score_hit === null) {
                        $score_hit = array(
                            'host' => $host,
                            'user' => $user,
                            'password' => $password,
                            'database' => $database,
                        );
                    }
                    @mysqli_close($link);
                }
                $attempts[] = $item;
                // Keep payload small: stop early once homepage found
                if ($home_hit) {
                    break 4;
                }
            }
        }
    }
}

$written_home = false;
$written_live = false;

if ($home_hit) {
    $hp = $home_hit['password'];
    $config = "<?php\n"
        . "if (!defined('_GNUBOARD_')) exit;\n\n"
        . "define('G5_MYSQL_HOST', '" . addcslashes($home_hit['host'], "\\'") . "');\n"
        . "define('G5_MYSQL_USER', '" . addcslashes($home_hit['user'], "\\'") . "');\n"
        . "define('G5_MYSQL_PASSWORD', '" . addcslashes($hp, "\\'") . "');\n"
        . "define('G5_MYSQL_DB', '" . addcslashes($home_hit['database'], "\\'") . "');\n"
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

    $temp = $config_path . '.tmp';
    if (@file_put_contents($temp, $config, LOCK_EX) !== false && @rename($temp, $config_path)) {
        @chmod($config_path, 0644);
        $written_home = true;
    }
    @unlink($temp);
}

if ($score_hit || ($score_pass !== '' && $home_hit)) {
    $target = $score_hit ? $score_hit : array(
        'host' => 'wuk2002.sldb.iwinv.net',
        'user' => 'bacaraai',
        'password' => $score_pass,
        'database' => 'bacaraai',
    );
    // Prefer score password for live config when provided
    if ($score_pass !== '') {
        $target['password'] = $score_pass;
        if (!$score_hit) {
            $target['host'] = 'wuk2002.sldb.iwinv.net';
            $target['user'] = 'bacaraai';
            $target['database'] = 'bacaraai';
        }
    }
    $live = "<?php\n"
        . "if (!defined('_GNUBOARD_')) exit;\n"
        . "return array(\n"
        . "  'host' => '" . addcslashes($target['host'], "\\'") . "',\n"
        . "  'user' => '" . addcslashes($target['user'], "\\'") . "',\n"
        . "  'password' => '" . addcslashes($target['password'], "\\'") . "',\n"
        . "  'database' => '" . addcslashes($target['database'], "\\'") . "',\n"
        . ");\n";
    $temp = $live_path . '.tmp';
    if (@file_put_contents($temp, $live, LOCK_EX) !== false && @rename($temp, $live_path)) {
        @chmod($live_path, 0644);
        $written_live = true;
    }
    @unlink($temp);
}

// Only self-delete on homepage success
if ($written_home) {
    @unlink(__FILE__);
}

echo json_encode(array(
    'ok' => (bool) $written_home,
    'message' => $written_home
        ? 'Homepage DB restored'
        : 'No working homepage DB combination found',
    'server_addr' => isset($_SERVER['SERVER_ADDR']) ? $_SERVER['SERVER_ADDR'] : null,
    'http_host' => isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : null,
    'current_config' => $current,
    'home_hit' => $home_hit ? array(
        'host' => $home_hit['host'],
        'user' => $home_hit['user'],
        'database' => $home_hit['database'],
        'password' => ($home_hit['password'] === $home_pass ? 'home' : 'score'),
    ) : null,
    'written_home' => $written_home,
    'written_live' => $written_live,
    'attempts' => $attempts,
), JSON_UNESCAPED_UNICODE);
exit;
