<?php
/**
 * 관리자 스트림 관제·설정 API
 *
 * GET  overview|status|settings
 * POST refresh|save_settings|set_publish_key|regen_publish_key|clear_publish_key
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

    if ($action === 'save_settings') {
        $patch = array();
        foreach (array(
            'enabled', 'media_origin', 'player_template', 'hls_template', 'webrtc_template',
            'alert_webhook', 'alert_offline_sec', 'watchdog_key', 'mediamtx_api',
            'latency_hls_sec', 'latency_webrtc_sec',
        ) as $k) {
            if (array_key_exists($k, $body)) {
                $patch[$k] = $body[$k];
            }
        }
        if (isset($patch['enabled'])) {
            $patch['enabled'] = !empty($patch['enabled']);
        }
        if (isset($patch['alert_offline_sec'])) {
            $patch['alert_offline_sec'] = max(30, min(3600, (int) $patch['alert_offline_sec']));
        }
        $result = bacara_streams_save_config($patch);
        if (empty($result['ok'])) {
            http_response_code(500);
            echo json_encode($result, JSON_UNESCAPED_UNICODE);
            exit;
        }
        echo json_encode(array_merge($result, bacara_streams_admin_settings()), JSON_UNESCAPED_UNICODE);
        exit;
    }

    if ($action === 'set_publish_key' || $action === 'regen_publish_key' || $action === 'clear_publish_key') {
        $code = isset($body['table_name']) ? bacara_streams_norm_code($body['table_name']) : '';
        if ($code === '' || !in_array($code, bacara_streams_known_codes(), true)) {
            http_response_code(400);
            echo json_encode(array('ok' => false, 'message' => '잘못된 테이블'), JSON_UNESCAPED_UNICODE);
            exit;
        }
        if ($action === 'clear_publish_key') {
            $key = '__CLEAR__';
        } elseif ($action === 'regen_publish_key') {
            $key = bacara_streams_generate_publish_key();
        } else {
            $key = isset($body['publish_key']) ? trim((string) $body['publish_key']) : '';
            if ($key === '') {
                http_response_code(400);
                echo json_encode(array('ok' => false, 'message' => 'publish_key 필요'), JSON_UNESCAPED_UNICODE);
                exit;
            }
        }
        $result = bacara_streams_save_config(array(
            'publish_keys' => array($code => $key),
        ));
        if (empty($result['ok'])) {
            http_response_code(500);
            echo json_encode($result, JSON_UNESCAPED_UNICODE);
            exit;
        }
        $pub = bacara_streams_publish_key($code);
        echo json_encode(array(
            'ok' => true,
            'table_name' => $code,
            'publish_key' => $pub,
            'obs_server' => 'rtmp://media.aitablelive.com:1935/' . $pub,
            'message' => $action === 'clear_publish_key'
                ? '공개 키(gameCode)로 복원됨. OBS 경로를 확인하세요.'
                : '키가 저장됨. OBS 송출 URL을 새 키로 변경하세요.',
        ), JSON_UNESCAPED_UNICODE);
        exit;
    }

    http_response_code(400);
    echo json_encode(array('ok' => false, 'message' => '알 수 없는 액션'), JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'settings') {
    echo json_encode(bacara_streams_admin_settings(), JSON_UNESCAPED_UNICODE);
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
