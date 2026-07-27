<?php
/**
 * 관리자 라이브 테이블 제어 API (최고관리자 전용)
 *
 * GET  action=overview|state
 * POST action=add_result|undo_last|new_game|set_shuffle|resume_auto
 */
if (!defined('G5_IS_ADMIN')) {
    define('G5_IS_ADMIN', true);
}

require_once dirname(__FILE__) . '/../../../common.php';
require_once G5_ADMIN_PATH . '/admin.lib.php';
require_once G5_LIB_PATH . '/bacara-wallet.lib.php';
require_once G5_LIB_PATH . '/bacara-live-admin.lib.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

bacara_wallet_install_tables();
bacara_live_admin_install_tables();

if (empty($is_member) || $is_admin !== 'super') {
    http_response_code(403);
    echo json_encode(array(
        'ok' => false,
        'message' => '최고관리자만 접근할 수 있습니다.',
    ), JSON_UNESCAPED_UNICODE);
    exit;
}

$admin_id = isset($member['mb_id']) ? (string) $member['mb_id'] : 'admin';

/** 운영 중인 테이블 코드 목록 */
$known_tables = array(
    'MD2729', 'MD2710', 'MD2711', 'MD2712', 'MD2713', 'MD2714', 'MD2715', 'MD2716',
);

$method = isset($_SERVER['REQUEST_METHOD']) ? strtoupper($_SERVER['REQUEST_METHOD']) : 'GET';
$action = isset($_REQUEST['action']) ? trim((string) $_REQUEST['action']) : 'overview';

if ($method === 'POST') {
    // check_admin_token() 은 실패 시 alert HTML 로 끊기므로 JSON API 용으로 직접 검증
    $token = isset($_POST['token']) ? trim((string) $_POST['token']) : '';
    $session_token = function_exists('get_session') ? (string) get_session('ss_admin_token') : '';
    if (function_exists('set_session')) {
        set_session('ss_admin_token', '');
    }
    if ($token === '' || $session_token === '' || !hash_equals($session_token, $token)) {
        http_response_code(403);
        echo json_encode(array(
            'ok' => false,
            'message' => '관리자 토큰이 유효하지 않습니다. 페이지를 새로고침하세요.',
        ), JSON_UNESCAPED_UNICODE);
        exit;
    }
}

$table_name = isset($_REQUEST['table_name'])
    ? bacara_live_admin_normalize_table($_REQUEST['table_name'])
    : 'MD2729';

switch ($action) {
    case 'overview':
        echo json_encode(array(
            'ok' => true,
            'tables' => bacara_live_admin_overview($known_tables),
        ), JSON_UNESCAPED_UNICODE);
        break;

    case 'state':
        if ($table_name === '') {
            http_response_code(400);
            echo json_encode(array('ok' => false, 'message' => 'table_name 필요'), JSON_UNESCAPED_UNICODE);
            break;
        }
        $ctrl = bacara_live_admin_get_ctrl($table_name, true);
        $manual = (int) $ctrl['manual_mode'] === 1;
        $payload = bacara_live_admin_view_payload($table_name, 800);
        echo json_encode(array(
            'ok' => true,
            'table_name' => $table_name,
            'manual_mode' => $manual,
            'shuffle_active' => (int) $ctrl['shuffle_active'] === 1,
            'payload' => $payload,
            'audit' => bacara_live_admin_recent_audit($table_name, 8),
        ), JSON_UNESCAPED_UNICODE);
        break;

    case 'add_result':
        $result = isset($_POST['result']) ? $_POST['result'] : '';
        $out = bacara_live_admin_add_result($table_name, $result, $admin_id);
        echo json_encode($out, JSON_UNESCAPED_UNICODE);
        break;

    case 'undo_last':
        $out = bacara_live_admin_undo_last($table_name, $admin_id);
        echo json_encode($out, JSON_UNESCAPED_UNICODE);
        break;

    case 'new_game':
        $out = bacara_live_admin_new_game($table_name, $admin_id);
        echo json_encode($out, JSON_UNESCAPED_UNICODE);
        break;

    case 'set_shuffle':
        $active = isset($_POST['active']) && ((string) $_POST['active'] === '1' || $_POST['active'] === true);
        $out = bacara_live_admin_set_shuffle($table_name, $active, $admin_id);
        echo json_encode($out, JSON_UNESCAPED_UNICODE);
        break;

    case 'resume_auto':
        $out = bacara_live_admin_disable_manual($table_name, $admin_id);
        echo json_encode($out, JSON_UNESCAPED_UNICODE);
        break;

    default:
        http_response_code(400);
        echo json_encode(array('ok' => false, 'message' => '알 수 없는 action'), JSON_UNESCAPED_UNICODE);
}
