<?php
/**
 * 관리자 스트림 관제 API
 *
 * GET  overview|status
 * POST refresh (force probe) — admin token 필요
 */
include_once dirname(__FILE__) . '/../../../common.php';
include_once G5_LIB_PATH . '/bacara-streams.lib.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

$is_admin_ok = isset($is_admin) && $is_admin === 'super';
if (!$is_admin_ok) {
    http_response_code(403);
    echo json_encode(array('ok' => false, 'message' => '최고관리자만 접근할 수 있습니다.'), JSON_UNESCAPED_UNICODE);
    exit;
}

$method = isset($_SERVER['REQUEST_METHOD']) ? strtoupper($_SERVER['REQUEST_METHOD']) : 'GET';
$action = isset($_GET['action']) ? trim((string) $_GET['action']) : 'overview';

if ($method === 'POST') {
    $raw = file_get_contents('php://input');
    $body = json_decode($raw ?: '[]', true);
    if (!is_array($body)) {
        $body = array();
    }
    $token = isset($body['token']) ? (string) $body['token'] : '';
    $ss = get_session('ss_admin_token');
    if ($token === '' || !$ss || !hash_equals((string) $ss, $token)) {
        http_response_code(403);
        echo json_encode(array('ok' => false, 'message' => '토큰이 올바르지 않습니다.'), JSON_UNESCAPED_UNICODE);
        exit;
    }
    $action = isset($body['action']) ? trim((string) $body['action']) : 'refresh';
    if ($action === 'refresh') {
        $code = isset($body['table_name']) ? bacara_streams_norm_code($body['table_name']) : '';
        if ($code !== '') {
            $st = bacara_streams_status_for($code, true);
            echo json_encode(array('ok' => true, 'status' => $st), JSON_UNESCAPED_UNICODE);
            exit;
        }
        echo json_encode(bacara_streams_admin_overview(true), JSON_UNESCAPED_UNICODE);
        exit;
    }
    http_response_code(400);
    echo json_encode(array('ok' => false, 'message' => '알 수 없는 액션'), JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'status') {
    $code = isset($_GET['table_name']) ? bacara_streams_norm_code($_GET['table_name']) : '';
    if ($code === '') {
        http_response_code(400);
        echo json_encode(array('ok' => false, 'message' => 'table_name 필요'), JSON_UNESCAPED_UNICODE);
        exit;
    }
    echo json_encode(array(
        'ok' => true,
        'status' => bacara_streams_status_for($code, !empty($_GET['force'])),
    ), JSON_UNESCAPED_UNICODE);
    exit;
}

echo json_encode(bacara_streams_admin_overview(!empty($_GET['force'])), JSON_UNESCAPED_UNICODE);
exit;
