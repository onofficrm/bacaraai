<?php
/**
 * 플러그인 관리자용 CSRF 토큰
 * (표준 /adm/ajax.token.php 는 referer 경로에 /adm/ 이 있어야 해서 플러그인 폼이 실패함)
 */
if (!defined('G5_IS_ADMIN')) {
    define('G5_IS_ADMIN', true);
}

require_once dirname(__FILE__) . '/../../../common.php';
require_once G5_ADMIN_PATH . '/admin.lib.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

if (empty($is_member) || $is_admin !== 'super') {
    die(json_encode(array(
        'error' => '최고관리자만 접근할 수 있습니다.',
        'url' => G5_URL,
    ), JSON_UNESCAPED_UNICODE));
}

set_session('ss_admin_token', '');

$admin_csrf_token_key = isset($_POST['admin_csrf_token_key']) ? (string) $_POST['admin_csrf_token_key'] : '';
if (function_exists('admin_csrf_token_key') && $admin_csrf_token_key !== admin_csrf_token_key(1)) {
    die(json_encode(array(
        'error' => '토큰키 에러!',
        'url' => G5_URL,
    ), JSON_UNESCAPED_UNICODE));
}

$referer = isset($_SERVER['HTTP_REFERER']) ? trim($_SERVER['HTTP_REFERER']) : '';
if ($referer === '') {
    die(json_encode(array(
        'error' => '정보가 올바르지 않습니다.',
        'url' => G5_URL,
    ), JSON_UNESCAPED_UNICODE));
}

$parsed = @parse_url($referer);
$host = preg_replace('/:[0-9]+$/', '', isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : '');
$path = isset($parsed['path']) ? $parsed['path'] : '';

if (empty($parsed['host']) || $host !== $parsed['host']) {
    die(json_encode(array(
        'error' => '올바른 방법으로 이용해 주십시오.',
        'url' => G5_URL,
    ), JSON_UNESCAPED_UNICODE));
}

$admin_dir = defined('G5_ADMIN_DIR') ? G5_ADMIN_DIR : 'adm';
$allowed = (
    stripos($path, '/' . $admin_dir . '/') !== false
    || stripos($path, '/plugin/bacara_wallet/admin/') !== false
);

if (!$allowed) {
    die(json_encode(array(
        'error' => '올바른 방법으로 이용해 주십시오.',
        'url' => G5_URL,
    ), JSON_UNESCAPED_UNICODE));
}

$token = get_admin_token();

die(json_encode(array(
    'error' => '',
    'token' => $token,
    'url' => '',
), JSON_UNESCAPED_UNICODE));
