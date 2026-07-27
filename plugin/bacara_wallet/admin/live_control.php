<?php
require_once dirname(__FILE__) . '/_bootstrap.php';

$g5['title'] = '라이브 테이블 제어';
include_once G5_ADMIN_PATH . '/admin.head.php';

$import_dir = G5_PATH . '/plugin/onoff-builder-bridge/imports/bacaraai-admin';
$import_url = G5_PLUGIN_URL . '/onoff-builder-bridge/imports/bacaraai-admin';
$entry_html = $import_dir . '/index.html';
$script_src = '';
$style_href = '';

if (is_file($entry_html)) {
    $html = @file_get_contents($entry_html);
    if ($html !== false) {
        if (preg_match('/src="([^"]+\.js)"/', $html, $m)) {
            $script_src = $import_url . '/' . ltrim($m[1], '/');
        }
        if (preg_match('/href="([^"]+\.css)"/', $html, $m)) {
            $style_href = $import_url . '/' . ltrim($m[1], '/');
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
  <div id="root"></div>
</div>
<?php if ($style_href !== '') { ?>
<link rel="stylesheet" crossorigin href="<?php echo htmlspecialchars($style_href, ENT_QUOTES, 'UTF-8'); ?>">
<?php } ?>
<script type="module" crossorigin src="<?php echo htmlspecialchars($script_src, ENT_QUOTES, 'UTF-8'); ?>"></script>
<?php } ?>

<?php
include_once G5_ADMIN_PATH . '/admin.tail.php';
