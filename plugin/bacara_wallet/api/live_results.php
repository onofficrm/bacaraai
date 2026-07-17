<?php
/**
 * 로그인 회원의 실시간 바카라 결과 JSON
 *
 * GET table_name=MD2709&limit=120
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
$account = sql_real_escape_string($member['mb_id']);
$safe_table_name = sql_real_escape_string($table_name);

// 별도 수집기가 저장하는 원본 테이블명은 `bacaraai`입니다.
$sql = " select id, table_name, result, detected_at
           from `bacaraai`
          where account = '{$account}'
            and table_name = '{$safe_table_name}'
            and result in ('P', 'B', 'T')
          order by id desc
          limit {$limit} ";
$query = sql_query($sql, false);

if (!$query) {
    http_response_code(500);
    echo json_encode(array(
        'ok' => false,
        'message' => '실시간 결과 테이블을 조회할 수 없습니다.',
    ), JSON_UNESCAPED_UNICODE);
    exit;
}

$rows = array();
while ($row = sql_fetch_array($query)) {
    $rows[] = array(
        'id' => (int) $row['id'],
        'table_name' => $row['table_name'],
        'result' => $row['result'],
        'detected_at' => $row['detected_at'],
    );
}

// 클라이언트는 오래된 결과부터 로드맵을 그립니다.
$rows = array_reverse($rows);
$latest = count($rows) ? $rows[count($rows) - 1] : null;

echo json_encode(array(
    'ok' => true,
    'logged_in' => true,
    'account' => $member['mb_id'],
    'table_name' => $table_name,
    'count' => count($rows),
    'latest_id' => $latest ? $latest['id'] : null,
    'latest_detected_at' => $latest ? $latest['detected_at'] : null,
    'results' => $rows,
), JSON_UNESCAPED_UNICODE);
exit;
