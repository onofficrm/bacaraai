<?php
/**
 * 라이브 시청 세션 API (로그인 회원)
 *
 * GET table_name=MD2729&mode=hls|webrtc
 * → player_url, viewer_token, status, sync meta
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

$code = isset($_GET['table_name']) ? bacara_streams_norm_code($_GET['table_name']) : '';
if ($code === '' || !preg_match('/^[A-Z0-9_-]{1,40}$/', $code)) {
    http_response_code(400);
    echo json_encode(array('ok' => false, 'message' => '잘못된 테이블 코드'), JSON_UNESCAPED_UNICODE);
    exit;
}

$mode = isset($_GET['mode']) ? strtolower(trim((string) $_GET['mode'])) : 'hls';
if ($mode !== 'webrtc') {
    $mode = 'hls';
}

$payload = bacara_streams_viewer_payload($code, (string) $member['mb_id'], $mode);
echo json_encode($payload, JSON_UNESCAPED_UNICODE);
exit;
