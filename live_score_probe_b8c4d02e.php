<?php
/**
 * One-time: set live account + verify MD2729 score rows from web host.
 * Self-deletes after success.
 */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$expected = 'b8c4d02e91a75f36e4d8a1c0b9e7f563';
$token = isset($_REQUEST['token']) ? (string) $_REQUEST['token'] : '';
if (!hash_equals($expected, $token)) {
    http_response_code(403);
    echo json_encode(array('ok' => false, 'message' => 'Forbidden'));
    exit;
}

$account = isset($_REQUEST['account']) ? trim((string) $_REQUEST['account']) : 'awesome';
$table_name = isset($_REQUEST['table_name']) ? strtoupper(trim((string) $_REQUEST['table_name'])) : 'MD2729';
if (!preg_match('/^[A-Za-z0-9_-]{1,40}$/', $account)
    || !preg_match('/^[A-Z0-9_-]{1,40}$/', $table_name)
) {
    http_response_code(400);
    echo json_encode(array('ok' => false, 'message' => 'invalid params'));
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

$wrote = @file_put_contents($live_path, $content);
if ($wrote === false) {
    http_response_code(500);
    echo json_encode(array('ok' => false, 'message' => 'failed to write live config'));
    exit;
}

mysqli_report(MYSQLI_REPORT_OFF);
$mysqli = mysqli_init();
@mysqli_options($mysqli, MYSQLI_OPT_CONNECT_TIMEOUT, 8);
$connected = @mysqli_real_connect($mysqli, $host, $user, $password, $database, $port);
if (!$connected) {
    http_response_code(500);
    echo json_encode(array(
        'ok' => false,
        'message' => 'DB connect failed',
        'error' => mysqli_connect_error(),
        'config_written' => true,
        'account' => $account,
    ), JSON_UNESCAPED_UNICODE);
    exit;
}
@mysqli_set_charset($mysqli, 'utf8mb4');

$safe_account = mysqli_real_escape_string($mysqli, $account);
$safe_table = mysqli_real_escape_string($mysqli, $table_name);

$sql = " select id, account, table_name, game_no, result, detected_at
           from `bacaraai`
          where account = '{$safe_account}'
            and table_name = '{$safe_table}'
            and result in ('P', 'B', 'T')
            and game_no = (
                select game_no
                  from `bacaraai`
                 where account = '{$safe_account}'
                   and table_name = '{$safe_table}'
                   and result in ('P', 'B', 'T')
                 order by id desc
                 limit 1
            )
          order by id asc
          limit 120 ";

$query = @mysqli_query($mysqli, $sql);
$rows = array();
$query_error = '';
if (!$query) {
    $query_error = mysqli_error($mysqli);
} else {
    while ($row = mysqli_fetch_assoc($query)) {
        $rows[] = array(
            'id' => (int) $row['id'],
            'account' => $row['account'],
            'table_name' => $row['table_name'],
            'game_no' => isset($row['game_no']) ? (int) $row['game_no'] : null,
            'result' => $row['result'],
            'detected_at' => $row['detected_at'],
        );
    }
}

@mysqli_close($mysqli);

$api_path = __DIR__ . '/plugin/bacara_wallet/api/live_results.php';
$api_has_fallback = is_file($api_path) && strpos((string) @file_get_contents($api_path), "account_candidates") !== false;

@unlink(__FILE__);

$latest = count($rows) ? $rows[count($rows) - 1] : null;
$counts = array('P' => 0, 'B' => 0, 'T' => 0);
foreach ($rows as $row) {
    if (isset($counts[$row['result']])) {
        $counts[$row['result']]++;
    }
}

echo json_encode(array(
    'ok' => true,
    'config_written' => true,
    'account' => $account,
    'table_name' => $table_name,
    'api_has_fallback' => $api_has_fallback,
    'count' => count($rows),
    'counts' => $counts,
    'game_no' => $latest ? $latest['game_no'] : null,
    'results' => $rows,
    'query_error' => $query_error,
    'self_deleted' => !is_file(__FILE__),
), JSON_UNESCAPED_UNICODE);
exit;
