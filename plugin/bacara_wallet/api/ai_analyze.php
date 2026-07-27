<?php
/**
 * 바카라 AI 분석 API (섀도 모드)
 *
 * GET table_name=MD2729&force=0
 *     &suggest_scope=side|amount|both
 *     &win_cut=&loss_cut=&bankroll=&initial_bet=&max_bet=&pnl=&martin_stage=
 * - 최신 결과 ID 기준으로 캐시
 * - GPT / Claude / Gemini 병렬 분석 + 결정 엔진
 * - amount|both 는 win_cut>0 && loss_cut<0 일 때만 금액 분석
 * - auto_bet_allowed: ChatGPT+Gemini(및 등록된 Claude) 종합 조건 충족 시 true
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

$ctx = array(
    'suggest_scope' => isset($_GET['suggest_scope']) ? $_GET['suggest_scope'] : 'side',
    'win_cut' => isset($_GET['win_cut']) ? (int) $_GET['win_cut'] : 0,
    'loss_cut' => isset($_GET['loss_cut']) ? (int) $_GET['loss_cut'] : 0,
    'bankroll' => isset($_GET['bankroll']) ? (int) $_GET['bankroll'] : 0,
    'initial_bet' => isset($_GET['initial_bet']) ? (int) $_GET['initial_bet'] : 10000,
    'max_bet' => isset($_GET['max_bet']) ? (int) $_GET['max_bet'] : 0,
    'pnl' => isset($_GET['pnl']) ? (int) $_GET['pnl'] : 0,
    'martin_stage' => isset($_GET['martin_stage']) ? (int) $_GET['martin_stage'] : 1,
);

@set_time_limit(90);

$result = bacara_ai_analyze_table($table_name, $force, $ctx);
if (empty($result['ok'])) {
    http_response_code(isset($result['message']) && strpos($result['message'], '키') !== false ? 400 : 500);
    echo json_encode($result, JSON_UNESCAPED_UNICODE);
    exit;
}

echo json_encode($result, JSON_UNESCAPED_UNICODE);
exit;
