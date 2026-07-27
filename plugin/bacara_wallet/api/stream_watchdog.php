<?php
/**
 * 스트림 장애 감시 워커 (cron 권장)
 *
 * 예: */2 * * * * curl -s 'https://SITE/plugin/bacara_wallet/api/stream_watchdog.php?key=SECRET'
 *
 * key 는 data/bacaraai-streams.config.php 의 watchdog_key 와 일치해야 함.
 * (비어 있으면 최고관리자 세션으로만 허용)
 */
include_once dirname(__FILE__) . '/../../../common.php';
include_once G5_LIB_PATH . '/bacara-streams.lib.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$cfg = bacara_streams_load_config();
$expect = isset($cfg['watchdog_key']) ? trim((string) $cfg['watchdog_key']) : '';
$given = isset($_GET['key']) ? trim((string) $_GET['key']) : '';
$admin_ok = isset($is_admin) && $is_admin === 'super';

if ($expect !== '') {
    if ($given === '' || !hash_equals($expect, $given)) {
        http_response_code(403);
        echo json_encode(array('ok' => false, 'message' => 'forbidden'), JSON_UNESCAPED_UNICODE);
        exit;
    }
} elseif (!$admin_ok) {
    http_response_code(403);
    echo json_encode(array('ok' => false, 'message' => 'watchdog_key 또는 관리자 세션 필요'), JSON_UNESCAPED_UNICODE);
    exit;
}

$overview = bacara_streams_admin_overview(true);
$offline = array();
foreach ($overview['tables'] as $row) {
    if (empty($row['online'])) {
        $offline[] = array(
            'table_name' => $row['table_name'],
            'offline_sec' => $row['offline_sec'],
        );
    }
}

echo json_encode(array(
    'ok' => true,
    'checked' => count($overview['tables']),
    'offline' => $offline,
    'at' => time(),
), JSON_UNESCAPED_UNICODE);
exit;
