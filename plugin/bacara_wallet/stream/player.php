<?php
/**
 * 동일 출처 라이브 플레이어 프록시
 *
 * - 로그인 + 시청 토큰(vt) 검증 후에만 MediaMTX iframe 노출
 * - iframe URL에 vt 를 붙여 MediaMTX authHTTPAddress 와 연동 가능
 */
include_once dirname(__FILE__) . '/../../../common.php';
include_once G5_LIB_PATH . '/bacara-streams.lib.php';

header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('X-Frame-Options: SAMEORIGIN');

$vt = isset($_GET['vt']) ? trim((string) $_GET['vt']) : '';
$verified = $vt !== '' ? bacara_streams_verify_viewer_token($vt) : false;

if (empty($is_member) || empty($member['mb_id'])) {
    http_response_code(401);
    echo '<!doctype html><meta charset="utf-8"><title>로그인 필요</title>';
    echo '<body style="margin:0;background:#09090b;color:#fafafa;font:14px/1.5 system-ui;display:flex;align-items:center;justify-content:center;height:100vh">로그인이 필요합니다.</body>';
    exit;
}

if ($verified === false) {
    http_response_code(403);
    echo '<!doctype html><meta charset="utf-8"><title>토큰 오류</title>';
    echo '<body style="margin:0;background:#09090b;color:#fafafa;font:14px/1.5 system-ui;display:flex;align-items:center;justify-content:center;height:100vh;text-align:center;padding:24px">시청 세션이 만료되었거나 유효하지 않습니다.<br>팝업을 닫았다가 다시 열어 주세요.</body>';
    exit;
}

if ((string) $verified['mb_id'] !== (string) $member['mb_id']) {
    http_response_code(403);
    echo '<!doctype html><meta charset="utf-8"><title>권한 없음</title>';
    echo '<body style="margin:0;background:#09090b;color:#fafafa;font:14px/1.5 system-ui;display:flex;align-items:center;justify-content:center;height:100vh">다른 회원 세션 토큰입니다.</body>';
    exit;
}

$code = $verified['table_name'];
$mode = isset($verified['mode']) ? $verified['mode'] : 'hls';
$direct = bacara_streams_resolve_player_url($code, $mode);
if ($direct === '') {
    http_response_code(503);
    echo '<!doctype html><meta charset="utf-8"><title>스트림 없음</title>';
    echo '<body style="margin:0;background:#09090b;color:#fafafa;font:14px/1.5 system-ui;display:flex;align-items:center;justify-content:center;height:100vh">스트림 주소를 만들 수 없습니다.</body>';
    exit;
}

$iframe_src = bacara_streams_append_query($direct, array('vt' => $vt));
$code_esc = htmlspecialchars($code, ENT_QUOTES, 'UTF-8');
$src_esc = htmlspecialchars($iframe_src, ENT_QUOTES, 'UTF-8');
?>
<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title><?php echo $code_esc; ?> LIVE</title>
  <style>
    html, body { margin: 0; height: 100%; background: #000; overflow: hidden; }
    iframe { border: 0; width: 100%; height: 100%; display: block; background: #000; }
  </style>
</head>
<body>
  <iframe
    src="<?php echo $src_esc; ?>"
    allow="autoplay; fullscreen; picture-in-picture; encrypted-media; microphone"
    allowfullscreen
    referrerpolicy="no-referrer-when-downgrade"
    title="<?php echo $code_esc; ?> player"
  ></iframe>
</body>
</html>
