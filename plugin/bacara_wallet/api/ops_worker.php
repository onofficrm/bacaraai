<?php
/**
 * 운영 워커 API — pending 자동 정산 / 타임아웃 환불 / 상태 조회
 *
 * 인증: data/bacaraai-ops.config.php 의 worker_token
 *   GET/POST token=...  또는  Header: X-Bacara-Ops-Token
 *
 * 액션:
 *   action=run|status|reconcile|health  (기본 run)
 *   limit=50  (run 시)
 *   hours=24  (reconcile 시)
 *   table=MD2729 (health 시)
 *
 * cron 예:
 *   * * * * * curl -fsS "https://도메인/plugin/bacara_wallet/api/ops_worker.php?token=SECRET&action=run"
 */
include_once dirname(__FILE__) . '/../../../common.php';
include_once G5_LIB_PATH . '/bacara-ops.lib.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

$token = '';
if (isset($_SERVER['HTTP_X_BACARA_OPS_TOKEN'])) {
    $token = (string) $_SERVER['HTTP_X_BACARA_OPS_TOKEN'];
} elseif (isset($_GET['token'])) {
    $token = (string) $_GET['token'];
} elseif (isset($_POST['token'])) {
    $token = (string) $_POST['token'];
}

if (!bacara_ops_verify_worker_token($token)) {
    http_response_code(401);
    echo json_encode(array(
        'ok' => false,
        'message' => '워커 토큰이 없거나 올바르지 않습니다. 관리자 운영 화면에서 토큰을 설정하세요.',
    ), JSON_UNESCAPED_UNICODE);
    exit;
}

$action = isset($_GET['action'])
    ? (string) $_GET['action']
    : (isset($_POST['action']) ? (string) $_POST['action'] : 'run');
$action = preg_replace('/[^a-z_]/', '', strtolower($action));
if ($action === '') {
    $action = 'run';
}

bacara_wallet_install_tables();

if ($action === 'status') {
    echo json_encode(array(
        'ok' => true,
        'action' => 'status',
        'status' => bacara_ops_status(),
    ), JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'health') {
    $table = isset($_GET['table'])
        ? (string) $_GET['table']
        : (isset($_POST['table']) ? (string) $_POST['table'] : 'MD2729');
    $health = bacara_ops_detector_health($table);
    echo json_encode(array(
        'ok' => !empty($health['ok']),
        'action' => 'health',
        'detector' => $health,
    ), JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'reconcile') {
    $hours = isset($_GET['hours'])
        ? (int) $_GET['hours']
        : (isset($_POST['hours']) ? (int) $_POST['hours'] : 24);
    $recon = bacara_ops_reconcile($hours);
    echo json_encode(array(
        'ok' => !empty($recon['ok']),
        'action' => 'reconcile',
        'reconcile' => $recon,
    ), JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'run') {
    $limit = isset($_GET['limit'])
        ? (int) $_GET['limit']
        : (isset($_POST['limit']) ? (int) $_POST['limit'] : 50);
    $result = bacara_ops_run_worker($limit);
    echo json_encode(array_merge(array('action' => 'run'), $result), JSON_UNESCAPED_UNICODE);
    exit;
}

http_response_code(400);
echo json_encode(array(
    'ok' => false,
    'message' => '알 수 없는 action 입니다. (run|status|reconcile|health)',
), JSON_UNESCAPED_UNICODE);
exit;
