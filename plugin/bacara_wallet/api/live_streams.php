<?php
/**
 * 테이블 라이브 스트림 URL API (로그인 회원) — 하위 호환
 *
 * GET              → 전체 맵
 * GET table_name=  → 단일
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

$cfg = bacara_streams_load_config();
$enabled = !empty($cfg['enabled']);

$one = isset($_GET['table_name']) ? bacara_streams_norm_code($_GET['table_name']) : '';
if ($one !== '') {
    if (!preg_match('/^[A-Z0-9_-]{1,40}$/', $one)) {
        http_response_code(400);
        echo json_encode(array('ok' => false, 'message' => '잘못된 테이블 코드'), JSON_UNESCAPED_UNICODE);
        exit;
    }
    $url = $enabled ? bacara_streams_resolve_hls_url($one) : '';
    echo json_encode(array(
        'ok' => true,
        'enabled' => $enabled,
        'table_name' => $one,
        'stream_url' => $url,
        'player_url' => $enabled ? bacara_streams_resolve_player_url($one, 'hls') : '',
        'available' => $url !== '',
        'publish_key_configured' => bacara_streams_publish_key($one) !== $one,
    ), JSON_UNESCAPED_UNICODE);
    exit;
}

$streams = array();
foreach (bacara_streams_known_codes() as $code) {
    $url = $enabled ? bacara_streams_resolve_hls_url($code) : '';
    $streams[$code] = array(
        'stream_url' => $url,
        'player_url' => $enabled ? bacara_streams_resolve_player_url($code, 'hls') : '',
        'available' => $url !== '',
        'publish_key_configured' => bacara_streams_publish_key($code) !== $code,
    );
}

echo json_encode(array(
    'ok' => true,
    'enabled' => $enabled,
    'streams' => $streams,
), JSON_UNESCAPED_UNICODE);
exit;
