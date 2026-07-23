<?php
/**
 * 바카라 AI 분석 API (섀도 모드)
 *
 * GET table_name=MD2729&force=0
 * - 최신 결과 ID 기준으로 캐시
 * - GPT / Claude / Gemini 분석 + 결정 엔진
 * - 자동 베팅에는 아직 사용하지 않음 (auto_bet_allowed=false)
 */
include_once dirname(__FILE__) . '/../../../common.php';
include_once G5_LIB_PATH . '/bacara-ai-analyze.lib.php';

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

$table_name = isset($_GET['table_name']) ? strtoupper(trim($_GET['table_name'])) : 'MD2729';
if (!preg_match('/^[A-Z0-9_-]{1,40}$/', $table_name)) {
    http_response_code(400);
    echo json_encode(array(
        'ok' => false,
        'message' => '올바르지 않은 테이블 코드입니다.',
    ), JSON_UNESCAPED_UNICODE);
    exit;
}

$force = !empty($_GET['force']) && (string) $_GET['force'] === '1';

@set_time_limit(90);

$result = bacara_ai_analyze_table($table_name, $force);
if (empty($result['ok'])) {
    http_response_code(isset($result['message']) && strpos($result['message'], '키') !== false ? 400 : 500);
    echo json_encode($result, JSON_UNESCAPED_UNICODE);
    exit;
}

echo json_encode($result, JSON_UNESCAPED_UNICODE);
exit;
