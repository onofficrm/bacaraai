<?php
/**
 * 로그인 회원의 실시간 바카라 결과 JSON
 *
 * GET table_name=MD2709&limit=120
 *
 * 홈페이지 DB(G5)와 스코어 테이블 접속정보가 다를 수 있어
 * data/bacaraai-live.config.php 가 있으면 그 계정으로 조회합니다.
 */
include_once dirname(__FILE__) . '/../../../common.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

if (empty($is_member) || empty($member['mb_id'])) {
    http_response_code(401);
    echo json_encode(array(
        'ok' => false,
        'logged_in' => false,
        'message' => '로그인이 필요합니다.',
    ), JSON_UNESCAPED_UNICODE);
    exit;
}

$table_name = isset($_GET['table_name']) ? strtoupper(trim($_GET['table_name'])) : 'MD2709';
if (!preg_match('/^[A-Z0-9_-]{1,40}$/', $table_name)) {
    http_response_code(400);
    echo json_encode(array(
        'ok' => false,
        'message' => '올바르지 않은 테이블 코드입니다.',
    ), JSON_UNESCAPED_UNICODE);
    exit;
}

$limit = isset($_GET['limit']) ? (int) $_GET['limit'] : 120;
$limit = max(1, min(300, $limit));
$account = $member['mb_id'];

$live_cfg_file = G5_DATA_PATH . '/bacaraai-live.config.php';
$live_link = null;
$use_live_cfg = false;

if (is_file($live_cfg_file)) {
    $live_cfg = include $live_cfg_file;
    if (is_array($live_cfg)
        && !empty($live_cfg['host'])
        && !empty($live_cfg['user'])
        && array_key_exists('password', $live_cfg)
        && !empty($live_cfg['database'])
    ) {
        mysqli_report(MYSQLI_REPORT_OFF);
        $live_link = @mysqli_connect(
            $live_cfg['host'],
            $live_cfg['user'],
            $live_cfg['password'],
            $live_cfg['database']
        );
        if ($live_link) {
            @mysqli_set_charset($live_link, G5_DB_CHARSET);
            $use_live_cfg = true;
        }
    }
}

$safe_account = $use_live_cfg
    ? mysqli_real_escape_string($live_link, $account)
    : sql_real_escape_string($account);
$safe_table_name = $use_live_cfg
    ? mysqli_real_escape_string($live_link, $table_name)
    : sql_real_escape_string($table_name);

$sql = " select id, table_name, result, detected_at
           from `bacaraai`
          where account = '{$safe_account}'
            and table_name = '{$safe_table_name}'
            and result in ('P', 'B', 'T')
          order by id desc
          limit {$limit} ";

$rows = array();
if ($use_live_cfg) {
    $query = @mysqli_query($live_link, $sql);
    if (!$query) {
        http_response_code(500);
        echo json_encode(array(
            'ok' => false,
            'message' => '스코어 DB 조회에 실패했습니다.',
            'error' => mysqli_error($live_link),
        ), JSON_UNESCAPED_UNICODE);
        exit;
    }
    while ($row = mysqli_fetch_assoc($query)) {
        $rows[] = array(
            'id' => (int) $row['id'],
            'table_name' => $row['table_name'],
            'result' => $row['result'],
            'detected_at' => $row['detected_at'],
        );
    }
} else {
    $query = sql_query($sql, false);
    if (!$query) {
        http_response_code(500);
        echo json_encode(array(
            'ok' => false,
            'message' => '실시간 결과 테이블을 조회할 수 없습니다.',
        ), JSON_UNESCAPED_UNICODE);
        exit;
    }
    while ($row = sql_fetch_array($query)) {
        $rows[] = array(
            'id' => (int) $row['id'],
            'table_name' => $row['table_name'],
            'result' => $row['result'],
            'detected_at' => $row['detected_at'],
        );
    }
}

$rows = array_reverse($rows);
$latest = count($rows) ? $rows[count($rows) - 1] : null;

echo json_encode(array(
    'ok' => true,
    'logged_in' => true,
    'account' => $member['mb_id'],
    'table_name' => $table_name,
    'source' => $use_live_cfg ? 'live_config' : 'g5',
    'count' => count($rows),
    'latest_id' => $latest ? $latest['id'] : null,
    'latest_detected_at' => $latest ? $latest['detected_at'] : null,
    'results' => $rows,
), JSON_UNESCAPED_UNICODE);
exit;
