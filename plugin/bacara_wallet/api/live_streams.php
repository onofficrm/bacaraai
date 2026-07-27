<?php
/**
 * 테이블 라이브 스트림 URL API (로그인 회원)
 *
 * GET              → 전체 맵
 * GET table_name=MD2729 → 단일
 */
include_once dirname(__FILE__) . '/../../../common.php';

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

$cfg_file = G5_DATA_PATH . '/bacaraai-streams.config.php';
$cfg = array(
    'enabled' => false,
    'url_template' => '',
    'tables' => array(),
);
if (is_file($cfg_file)) {
    $loaded = include $cfg_file;
    if (is_array($loaded)) {
        $cfg = array_merge($cfg, $loaded);
    }
}

$enabled = !empty($cfg['enabled']);
$template = isset($cfg['url_template']) ? trim((string) $cfg['url_template']) : '';
$tables_cfg = isset($cfg['tables']) && is_array($cfg['tables']) ? $cfg['tables'] : array();

$known = array(
    'MD2729', 'MD2710', 'MD2711', 'MD2712', 'MD2713', 'MD2714', 'MD2715', 'MD2716',
);

function bacara_stream_resolve_url($table, $tables_cfg, $template)
{
    $table = strtoupper(trim((string) $table));
    if (isset($tables_cfg[$table]) && trim((string) $tables_cfg[$table]) !== '') {
        return trim((string) $tables_cfg[$table]);
    }
    if ($template !== '') {
        return str_replace(
            array('{table}', '{TABLE}', '{code}', '{CODE}'),
            array($table, $table, $table, $table),
            $template
        );
    }
    return '';
}

$one = isset($_GET['table_name']) ? strtoupper(trim((string) $_GET['table_name'])) : '';
if ($one !== '') {
    if (!preg_match('/^[A-Z0-9_-]{1,40}$/', $one)) {
        http_response_code(400);
        echo json_encode(array('ok' => false, 'message' => '잘못된 테이블 코드'), JSON_UNESCAPED_UNICODE);
        exit;
    }
    $url = $enabled ? bacara_stream_resolve_url($one, $tables_cfg, $template) : '';
    echo json_encode(array(
        'ok' => true,
        'enabled' => $enabled,
        'table_name' => $one,
        'stream_url' => $url,
        'available' => $url !== '',
    ), JSON_UNESCAPED_UNICODE);
    exit;
}

$streams = array();
foreach ($known as $code) {
    $url = $enabled ? bacara_stream_resolve_url($code, $tables_cfg, $template) : '';
    $streams[$code] = array(
        'stream_url' => $url,
        'available' => $url !== '',
    );
}

echo json_encode(array(
    'ok' => true,
    'enabled' => $enabled,
    'streams' => $streams,
), JSON_UNESCAPED_UNICODE);
exit;
