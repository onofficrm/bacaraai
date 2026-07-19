<?php
/**
 * One-time verify MD2729 scores. Self-deletes after success.
 */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$expected = 'c9d5e13f02b86a47f5e9b2d1c0a8g674';
$token = isset($_REQUEST['token']) ? (string) $_REQUEST['token'] : '';
// token uses hex only
$expected = 'c9d5e13f02b86a47f5e9b2d1c0a8f674';
if (!hash_equals($expected, $token)) {
    http_response_code(403);
    echo json_encode(array('ok' => false, 'message' => 'Forbidden'));
    exit;
}

if (!defined('_GNUBOARD_')) {
    define('_GNUBOARD_', true);
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
    echo json_encode(array('ok' => false, 'message' => 'live config invalid', 'keys' => is_array($live) ? array_keys($live) : null));
    exit;
}

$account = !empty($live['account']) ? (string) $live['account'] : 'awesome';
$table_name = 'MD2729';
$host = $live['host'];
$user = $live['user'];
$password = $live['password'];
$database = $live['database'];
$port = !empty($live['port']) ? (int) $live['port'] : 3306;

mysqli_report(MYSQLI_REPORT_OFF);
$mysqli = mysqli_init();
@mysqli_options($mysqli, MYSQLI_OPT_CONNECT_TIMEOUT, 8);
$connected = @mysqli_real_connect($mysqli, $host, $user, $password, $database, $port);
if (!$connected) {
    http_response_code(500);
    echo json_encode(array('ok' => false, 'message' => 'DB connect failed', 'error' => mysqli_connect_error()), JSON_UNESCAPED_UNICODE);
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
                select game_no from `bacaraai`
                 where account = '{$safe_account}' and table_name = '{$safe_table}'
                   and result in ('P', 'B', 'T')
                 order by id desc limit 1
            )
          order by id asc limit 120 ";
$query = @mysqli_query($mysqli, $sql);
$rows = array();
$query_error = $query ? '' : mysqli_error($mysqli);
if ($query) {
    while ($row = mysqli_fetch_assoc($query)) {
        $rows[] = array(
            'id' => (int) $row['id'],
            'result' => $row['result'],
            'game_no' => isset($row['game_no']) ? (int) $row['game_no'] : null,
            'detected_at' => $row['detected_at'],
        );
    }
}
@mysqli_close($mysqli);

$api_path = __DIR__ . '/plugin/bacara_wallet/api/live_results.php';
$api_src = is_file($api_path) ? (string) @file_get_contents($api_path) : '';
$api_has_fallback = strpos($api_src, 'account_candidates') !== false;

$counts = array('P' => 0, 'B' => 0, 'T' => 0);
foreach ($rows as $row) {
    if (isset($counts[$row['result']])) $counts[$row['result']]++;
}

@unlink(__FILE__);

echo json_encode(array(
    'ok' => true,
    'live_account' => $account,
    'api_has_fallback' => $api_has_fallback,
    'count' => count($rows),
    'counts' => $counts,
    'game_no' => count($rows) ? $rows[count($rows) - 1]['game_no'] : null,
    'sequence' => implode('', array_map(function ($r) { return $r['result']; }, $rows)),
    'query_error' => $query_error,
    'self_deleted' => !is_file(__FILE__),
), JSON_UNESCAPED_UNICODE);
exit;
