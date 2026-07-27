<?php
require_once dirname(__FILE__) . '/_bootstrap.php';

$g5['title'] = '라이브 테이블 제어';
include_once G5_ADMIN_PATH . '/admin.head.php';

$import_dir = G5_PATH . '/plugin/onoff-builder-bridge/imports/bacaraai-admin';
$import_url = G5_PLUGIN_URL . '/onoff-builder-bridge/imports/bacaraai-admin';
$entry_html = $import_dir . '/index.html';
$script_src = '';
$style_href = '';

/**
 * index.html 의 asset 경로 해석
 * - /plugin/... 절대경로 → 사이트 루트 기준 그대로 사용
 * - assets/... 상대경로 → import_url 접두
 * - https://... → 그대로
 */
$bacara_admin_resolve_asset = static function ($ref, $import_url) {
    $ref = trim((string) $ref);
    if ($ref === '') {
        return '';
    }
    if (preg_match('#^https?://#i', $ref)) {
        return $ref;
    }
    if (isset($ref[0]) && $ref[0] === '/') {
        return $ref;
    }
    return rtrim($import_url, '/') . '/' . ltrim($ref, '/');
};

if (is_file($entry_html)) {
    $html = @file_get_contents($entry_html);
    if ($html !== false) {
        if (preg_match('/src="([^"]+\.js)"/', $html, $m)) {
            $script_src = $bacara_admin_resolve_asset($m[1], $import_url);
        }
        if (preg_match('/href="([^"]+\.css)"/', $html, $m)) {
            $style_href = $bacara_admin_resolve_asset($m[1], $import_url);
        }
    }
}
?>

<style>
  #bacara-live-admin-root {
    min-height: calc(100vh - 120px);
    margin: -8px -12px 0;
    background: #09090b;
  }
  #bacara-live-admin-root .bacara-wallet { display: none; }
</style>

<?php if ($script_src === '') { ?>
<?php bacara_wallet_admin_shell_start('라이브 테이블 제어', '관리자 UI 번들이 아직 배포되지 않았습니다.'); ?>
<?php bacara_wallet_admin_nav('live'); ?>
<div class="bw-card">
  <p>빌드 후 <code>plugin/onoff-builder-bridge/imports/bacaraai-admin/</code> 에 업로드해 주세요.</p>
  <pre style="margin-top:12px;padding:12px;background:var(--bw-card-2);border-radius:8px;overflow:auto">cd builder/ bacaraai_system
npm run build:admin</pre>
</div>
<?php bacara_wallet_admin_shell_end(); ?>
<?php } else { ?>
<div id="bacara-live-admin-root">
  <div id="root">
    <p style="margin:0;padding:48px 24px;text-align:center;color:#a1a1aa;font-size:14px">
      라이브 테이블 제어 UI 불러오는 중…
    </p>
  </div>
</div>
<?php if ($style_href !== '') { ?>
<link rel="stylesheet" crossorigin href="<?php echo htmlspecialchars($style_href, ENT_QUOTES, 'UTF-8'); ?>">
<?php } ?>
<script type="module" crossorigin src="<?php echo htmlspecialchars($script_src, ENT_QUOTES, 'UTF-8'); ?>"></script>
<script>
(function () {
  var src = <?php echo json_encode($script_src, JSON_UNESCAPED_SLASHES); ?>;
  window.setTimeout(function () {
    var root = document.getElementById('root');
    if (!root || root.querySelector('.min-h-dvh, [data-bacara-admin-ready]')) return;
    root.innerHTML =
      '<div style="padding:32px 24px;color:#fca5a5;font-size:14px;line-height:1.6;max-width:520px;margin:0 auto">' +
      '<strong style="color:#fecaca">관리자 UI를 불러오지 못했습니다.</strong><br>' +
      '스크립트: <code style="word-break:break-all;color:#fda4af">' +
      String(src).replace(/</g, '&lt;') +
      '</code><br>새로고침하거나, 번들 배포 여부를 확인해 주세요.</div>';
  }, 8000);
})();
</script>
<?php } ?>

<?php
include_once G5_ADMIN_PATH . '/admin.tail.php';
