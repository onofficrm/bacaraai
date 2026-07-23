<?php
/**
 * 세션 종료 AI 복기
 *
 * POST JSON:
 * {
 *   "pnl": 12345,
 *   "stop_type": "wincut|losscut|manual|error",
 *   "strategy": "ai|pattern",
 *   "martin_stage": 2,
 *   "max_martin": 6,
 *   "win_cut": 1000000,
 *   "loss_cut": -2000000,
 *   "bets": [ { "side":"PLAYER","result":"B","pnl":-10000,"source":"auto","rule":"...","martin":1 } ]
 * }
 */
include_once dirname(__FILE__) . '/../../../common.php';
include_once G5_LIB_PATH . '/bacara-ai-analyze.lib.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

if (empty($is_member) || empty($member['mb_id'])) {
    http_response_code(401);
    echo json_encode(array('ok' => false, 'message' => '로그인이 필요합니다.'), JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(array('ok' => false, 'message' => 'POST 만 허용됩니다.'), JSON_UNESCAPED_UNICODE);
    exit;
}

$raw = file_get_contents('php://input');
$payload = json_decode($raw ?: '', true);
if (!is_array($payload)) {
    http_response_code(400);
    echo json_encode(array('ok' => false, 'message' => '잘못된 요청입니다.'), JSON_UNESCAPED_UNICODE);
    exit;
}

@set_time_limit(60);
$result = bacara_ai_session_retrospective($payload);
if (empty($result['ok'])) {
    http_response_code(400);
    echo json_encode($result, JSON_UNESCAPED_UNICODE);
    exit;
}

echo json_encode($result, JSON_UNESCAPED_UNICODE);
exit;
