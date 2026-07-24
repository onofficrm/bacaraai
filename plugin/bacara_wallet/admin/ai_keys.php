<?php
require_once dirname(__FILE__) . '/_bootstrap.php';
include_once G5_LIB_PATH . '/bacara-ai-config.lib.php';

$g5['title'] = 'AI API 설정';
include_once G5_ADMIN_PATH . '/admin.head.php';

$cfg = bacara_ai_config_load();
$status = bacara_ai_config_status();
$saved = isset($_GET['saved']) && $_GET['saved'] === '1';
?>

<?php bacara_wallet_admin_shell_start('AI API 설정', 'ChatGPT · Claude · Gemini로 실시간 분석합니다. 「AI 자동 베팅」을 켜면 오토베팅의 「AI 추천대로」 모드에서 조건을 충족한 경우 시스템이 자동으로 베팅합니다.'); ?>
<?php bacara_wallet_admin_nav('ai'); ?>

<?php if ($saved) { ?>
    <p class="bw-notice">API 설정이 저장되었습니다.</p>
<?php } ?>

<div class="bw-status-row">
    <span class="bw-pill <?php echo $status['openai'] ? 'is-on' : 'is-off'; ?>">ChatGPT <?php echo $status['openai'] ? '등록됨' : '미등록'; ?></span>
    <span class="bw-pill <?php echo $status['anthropic'] ? 'is-on' : 'is-off'; ?>">Claude <?php echo $status['anthropic'] ? '등록됨' : '미등록'; ?></span>
    <span class="bw-pill <?php echo $status['gemini'] ? 'is-on' : 'is-off'; ?>">Gemini <?php echo $status['gemini'] ? '등록됨' : '미등록'; ?></span>
    <span class="bw-pill <?php echo $status['enabled'] ? 'is-on' : 'is-off'; ?>">분석 <?php echo $status['enabled'] ? '사용 중' : '중지'; ?></span>
    <span class="bw-pill <?php echo !empty($status['auto_bet']) ? 'is-on' : 'is-off'; ?>">자동베팅 <?php echo !empty($status['auto_bet']) ? '허용' : '차단'; ?></span>
</div>

<div class="bw-card">
    <form method="post" action="<?php echo htmlspecialchars(bacara_wallet_admin_url('action.php'), ENT_QUOTES, 'UTF-8'); ?>" autocomplete="off">
        <input type="hidden" name="token" value="">
        <input type="hidden" name="mode" value="save_ai_keys">

        <div class="bw-field-full" style="margin-top:0;margin-bottom:12px">
            <label>
                <input type="checkbox" name="enabled" value="1"<?php echo $cfg['enabled'] === '1' ? ' checked' : ''; ?>>
                AI 분석 사용 (체크 해제 시 키는 유지되고 호출만 중단)
            </label>
        </div>
        <div class="bw-field-full" style="margin-top:0;margin-bottom:20px">
            <label>
                <input type="checkbox" name="auto_bet_enabled" value="1"<?php echo (!isset($cfg['auto_bet_enabled']) || $cfg['auto_bet_enabled'] === '1') ? ' checked' : ''; ?>>
                AI 자동 베팅 허용 (세션이 라이브 + 「AI 추천대로」일 때, 엄격 조건 충족 시에만 실제 베팅)
            </label>
            <p class="bw-hint">조건: ChatGPT+Gemini 정상(Claude 있으면 포함) · 2표 이상 동의 · 신뢰도 65%+ · 표본 30+ · P/B 격차 10%+</p>
        </div>

        <h3>ChatGPT (OpenAI)</h3>
        <div class="bw-grid">
            <div class="bw-field-span">
                <label for="openai_api_key">API Key</label>
                <input type="password" name="openai_api_key" id="openai_api_key" class="frm_input" value="" placeholder="<?php echo $cfg['openai_api_key'] !== '' ? htmlspecialchars(bacara_ai_config_mask_key($cfg['openai_api_key']), ENT_QUOTES, 'UTF-8') : 'sk-...'; ?>" autocomplete="new-password">
                <p class="bw-hint">
                    <?php if ($cfg['openai_api_key'] !== '') { ?>
                        저장됨: <?php echo htmlspecialchars(bacara_ai_config_mask_key($cfg['openai_api_key']), ENT_QUOTES, 'UTF-8'); ?> · 변경 시에만 입력 ·
                        <label class="bw-inline-check"><input type="checkbox" name="clear_openai_api_key" value="1"> 삭제</label>
                    <?php } else { ?>
                        platform.openai.com 에서 발급
                    <?php } ?>
                </p>
            </div>
            <div>
                <label for="openai_model">모델</label>
                <input type="text" name="openai_model" id="openai_model" class="frm_input" value="<?php echo htmlspecialchars($cfg['openai_model'], ENT_QUOTES, 'UTF-8'); ?>" placeholder="gpt-4o-mini">
                <p class="bw-hint">예: gpt-4o-mini, gpt-4o</p>
            </div>
        </div>

        <h3 style="margin-top:28px">Claude (Anthropic)</h3>
        <div class="bw-grid">
            <div class="bw-field-span">
                <label for="anthropic_api_key">API Key</label>
                <input type="password" name="anthropic_api_key" id="anthropic_api_key" class="frm_input" value="" placeholder="<?php echo $cfg['anthropic_api_key'] !== '' ? htmlspecialchars(bacara_ai_config_mask_key($cfg['anthropic_api_key']), ENT_QUOTES, 'UTF-8') : 'sk-ant-...'; ?>" autocomplete="new-password">
                <p class="bw-hint">
                    <?php if ($cfg['anthropic_api_key'] !== '') { ?>
                        저장됨: <?php echo htmlspecialchars(bacara_ai_config_mask_key($cfg['anthropic_api_key']), ENT_QUOTES, 'UTF-8'); ?> · 변경 시에만 입력 ·
                        <label class="bw-inline-check"><input type="checkbox" name="clear_anthropic_api_key" value="1"> 삭제</label>
                    <?php } else { ?>
                        console.anthropic.com 에서 발급
                    <?php } ?>
                </p>
            </div>
            <div>
                <label for="anthropic_model">모델</label>
                <input type="text" name="anthropic_model" id="anthropic_model" class="frm_input" value="<?php echo htmlspecialchars($cfg['anthropic_model'], ENT_QUOTES, 'UTF-8'); ?>" placeholder="claude-sonnet-4-20250514">
                <p class="bw-hint">예: claude-sonnet-4-20250514</p>
            </div>
        </div>

        <h3 style="margin-top:28px">Gemini (Google)</h3>
        <div class="bw-grid">
            <div class="bw-field-span">
                <label for="gemini_api_key">API Key</label>
                <input type="password" name="gemini_api_key" id="gemini_api_key" class="frm_input" value="" placeholder="<?php echo $cfg['gemini_api_key'] !== '' ? htmlspecialchars(bacara_ai_config_mask_key($cfg['gemini_api_key']), ENT_QUOTES, 'UTF-8') : 'AIza...'; ?>" autocomplete="new-password">
                <p class="bw-hint">
                    <?php if ($cfg['gemini_api_key'] !== '') { ?>
                        저장됨: <?php echo htmlspecialchars(bacara_ai_config_mask_key($cfg['gemini_api_key']), ENT_QUOTES, 'UTF-8'); ?> · 변경 시에만 입력 ·
                        <label class="bw-inline-check"><input type="checkbox" name="clear_gemini_api_key" value="1"> 삭제</label>
                    <?php } else { ?>
                        aistudio.google.com 에서 발급
                    <?php } ?>
                </p>
            </div>
            <div>
                <label for="gemini_model">모델</label>
                <input type="text" name="gemini_model" id="gemini_model" class="frm_input" value="<?php echo htmlspecialchars($cfg['gemini_model'], ENT_QUOTES, 'UTF-8'); ?>" placeholder="gemini-2.5-flash">
                <p class="bw-hint">예: gemini-2.5-flash, gemini-2.5-flash-lite (구 2.0/1.5 모델명은 자동 치환)</p>
            </div>
        </div>

        <div class="bw-actions">
            <button type="submit" class="btn_submit">설정 저장</button>
            <a href="<?php echo htmlspecialchars(bacara_wallet_admin_url(), ENT_QUOTES, 'UTF-8'); ?>" class="btn_submit bw-ghost">목록으로</a>
        </div>
    </form>
</div>

<p class="bw-hint" style="margin-top:8px">저장 파일: <code>data/bacaraai-ai.config.php</code> (Git 제외 · 웹 직접 접근 차단)</p>

<?php bacara_wallet_admin_shell_end(); ?>
<?php
include_once G5_ADMIN_PATH . '/admin.tail.php';
