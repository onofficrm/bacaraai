<?php
/**
 * MediaMTX External HTTP Auth
 *
 * mediamtx.yml 예:
 *   authMethod: http
 *   authHTTPAddress: https://YOUR_SITE/plugin/bacara_wallet/api/stream_auth.php
 *
 * read/playback: query vt=시청토큰 필요
 * publish: config publish_user / publish_pass
 *
 * mediamtx_auth_enabled=false 이면 항상 허용(아직 MediaMTX 미연동)
 */
include_once dirname(__FILE__) . '/../../../common.php';
include_once G5_LIB_PATH . '/bacara-streams.lib.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$raw = file_get_contents('php://input');
$payload = json_decode($raw ?: '[]', true);
if (!is_array($payload)) {
    // 일부 버전/프록시는 form 으로 올 수 있음
    $payload = $_POST;
}

$decision = bacara_streams_auth_decide($payload);
if (empty($decision['ok'])) {
    http_response_code(401);
    echo json_encode(array('ok' => false, 'message' => isset($decision['message']) ? $decision['message'] : 'denied'), JSON_UNESCAPED_UNICODE);
    exit;
}

http_response_code(200);
echo json_encode(array('ok' => true), JSON_UNESCAPED_UNICODE);
exit;
