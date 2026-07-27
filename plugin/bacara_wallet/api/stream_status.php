<?php
/**
 * 서버 기반 방송 상태 API (로그인 회원)
 *
 * GET                 → 전체 테이블 상태
 * GET table_name=CODE → 단일
 * GET force=1         → 캐시 무시(관리/디버그)
 */
include_once dirname(__FILE__) . '/../../../common.php';
include_once G5_LIB_PATH . '/bacara-streams.lib.php';

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

$force = !empty($_GET['force']);
$one = isset($_GET['table_name']) ? bacara_streams_norm_code($_GET['table_name']) : '';

if ($one !== '') {
    if (!preg_match('/^[A-Z0-9_-]{1,40}$/', $one)) {
        http_response_code(400);
        echo json_encode(array('ok' => false, 'message' => '잘못된 테이블 코드'), JSON_UNESCAPED_UNICODE);
        exit;
    }
    $st = bacara_streams_status_for($one, $force);
    echo json_encode(array('ok' => true, 'status' => $st), JSON_UNESCAPED_UNICODE);
    exit;
}

$statuses = array();
foreach (bacara_streams_known_codes() as $code) {
    $statuses[$code] = bacara_streams_status_for($code, $force);
}

echo json_encode(array(
    'ok' => true,
    'statuses' => $statuses,
    'generated_at' => time(),
), JSON_UNESCAPED_UNICODE);
exit;
