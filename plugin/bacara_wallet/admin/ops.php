<?php
require_once dirname(__FILE__) . '/_bootstrap.php';
include_once G5_LIB_PATH . '/bacara-ops.lib.php';

$g5['title'] = '운영 상태';
include_once G5_ADMIN_PATH . '/admin.head.php';

$status = bacara_ops_status();
$recon = bacara_ops_reconcile(24);
$ops_cfg = bacara_ops_config_load();
$worker_url = G5_PLUGIN_URL . '/bacara_wallet/api/ops_worker.php';
$token_set = !empty($ops_cfg['worker_token']) && strlen($ops_cfg['worker_token']) >= 16;
$detector = isset($status['detector']) && is_array($status['detector']) ? $status['detector'] : array();
$saved = isset($_GET['saved']) ? (string) $_GET['saved'] : '';
$ran = isset($_GET['ran']) ? (string) $_GET['ran'] : '';
?>

<?php bacara_wallet_admin_shell_start('운영 상태', '감지기 헬스 · pending 자동 정산 · 지갑/원장 대사를 한곳에서 확인합니다.'); ?>
<?php bacara_wallet_admin_nav('ops'); ?>

<?php if ($saved === '1') { ?>
    <p class="bw-notice">워커 토큰이 저장되었습니다.</p>
<?php } ?>
<?php if ($ran === '1') { ?>
    <p class="bw-notice">워커를 수동 실행했습니다. 아래에서 최신 상태를 확인하세요.</p>
<?php } ?>

<div class="bw-card" style="margin-bottom:16px">
    <h3 style="margin:0 0 14px;font-size:1.05rem">요약</h3>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px">
        <div style="padding:12px;border:1px solid var(--bw-line);border-radius:12px;background:var(--bw-card-2)">
            <div style="color:var(--bw-dim);font-size:0.75rem">감지기</div>
            <div style="margin-top:6px;font-weight:800;color:<?php echo !empty($detector['allowed']) ? '#4ade80' : '#f87171'; ?>">
                <?php echo !empty($detector['allowed']) ? '정상' : '차단/이상'; ?>
            </div>
            <div style="margin-top:4px;color:var(--bw-muted);font-size:0.8rem">
                <?php echo htmlspecialchars(isset($detector['message']) ? $detector['message'] : '-', ENT_QUOTES, 'UTF-8'); ?>
            </div>
        </div>
        <div style="padding:12px;border:1px solid var(--bw-line);border-radius:12px;background:var(--bw-card-2)">
            <div style="color:var(--bw-dim);font-size:0.75rem">Pending</div>
            <div style="margin-top:6px;font-weight:800"><?php echo (int) $status['pending_count']; ?>건</div>
            <div style="margin-top:4px;color:var(--bw-muted);font-size:0.8rem">
                <?php echo bacara_wallet_format((int) $status['pending_stake']); ?>
            </div>
        </div>
        <div style="padding:12px;border:1px solid var(--bw-line);border-radius:12px;background:var(--bw-card-2)">
            <div style="color:var(--bw-dim);font-size:0.75rem">오늘 정산/취소</div>
            <div style="margin-top:6px;font-weight:800">
                <?php echo (int) $status['today_settled']; ?> / <?php echo (int) $status['today_cancelled']; ?>
            </div>
        </div>
        <div style="padding:12px;border:1px solid var(--bw-line);border-radius:12px;background:var(--bw-card-2)">
            <div style="color:var(--bw-dim);font-size:0.75rem">대사 이슈 (24h)</div>
            <div style="margin-top:6px;font-weight:800;color:<?php echo !empty($recon['counts']['critical']) ? '#f87171' : '#4ade80'; ?>">
                <?php echo (int) count($recon['issues']); ?>건
            </div>
            <div style="margin-top:4px;color:var(--bw-muted);font-size:0.8rem">
                critical <?php echo (int) $recon['counts']['critical']; ?>
            </div>
        </div>
    </div>
</div>

<div class="bw-card" style="margin-bottom:16px">
    <h3 style="margin:0 0 10px;font-size:1.05rem">감지기 상세</h3>
    <table class="tbl_head01" style="width:100%">
        <tbody>
            <tr><th style="width:180px">테이블</th><td><?php echo htmlspecialchars(isset($detector['table']) ? $detector['table'] : '-', ENT_QUOTES, 'UTF-8'); ?></td></tr>
            <tr><th>마지막 감지</th><td><?php echo htmlspecialchars(isset($detector['last_detected_at']) ? (string) $detector['last_detected_at'] : '-', ENT_QUOTES, 'UTF-8'); ?></td></tr>
            <tr><th>경과(초)</th><td><?php echo isset($detector['age_sec']) && $detector['age_sec'] !== null ? (int) $detector['age_sec'] : '-'; ?></td></tr>
            <tr><th>마지막 결과 / id</th>
                <td>
                    <?php echo htmlspecialchars(isset($detector['last_result']) ? (string) $detector['last_result'] : '-', ENT_QUOTES, 'UTF-8'); ?>
                    /
                    <?php echo isset($detector['last_id']) ? (int) $detector['last_id'] : '-'; ?>
                </td>
            </tr>
            <tr><th>신규 베팅</th><td><?php echo !empty($detector['allowed']) ? '허용' : '차단'; ?></td></tr>
            <tr><th>타임아웃(초)</th><td><?php echo (int) $status['timeout_sec']; ?> (클라이언트 180초와 동일)</td></tr>
        </tbody>
    </table>
</div>

<div class="bw-card" style="margin-bottom:16px">
    <h3 style="margin:0 0 10px;font-size:1.05rem">자동 정산 워커</h3>
    <p style="color:var(--bw-muted);font-size:0.9rem;line-height:1.55;margin:0 0 14px">
        cron 또는 외부 스케줄러가 30~60초마다 워커 URL을 호출하면, 클라이언트가 끊겨도 pending 원장을 서버가 정산·환불합니다.
        토큰은 16자 이상 영문·숫자·_- 만 사용하세요.
    </p>

    <form method="post" action="<?php echo htmlspecialchars(bacara_wallet_admin_url('action.php'), ENT_QUOTES, 'UTF-8'); ?>" style="margin-bottom:14px">
        <input type="hidden" name="token" value="<?php echo htmlspecialchars(bacara_wallet_admin_token(), ENT_QUOTES, 'UTF-8'); ?>">
        <input type="hidden" name="mode" value="ops_save_token">
        <label style="display:block;margin-bottom:6px;color:var(--bw-dim);font-size:0.8rem">Worker Token</label>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
            <input type="text" name="worker_token" class="frm_input" style="flex:1;min-width:220px"
                   value="<?php echo htmlspecialchars($ops_cfg['worker_token'], ENT_QUOTES, 'UTF-8'); ?>"
                   placeholder="예: 랜덤 32자 토큰" autocomplete="off">
            <button type="submit" class="btn_submit">토큰 저장</button>
            <button type="submit" name="generate" value="1" class="btn_submit bw-ghost">랜덤 생성·저장</button>
        </div>
        <p style="margin:8px 0 0;color:<?php echo $token_set ? '#4ade80' : '#f87171'; ?>;font-size:0.85rem">
            <?php echo $token_set ? '토큰 설정됨 — 워커 호출 가능' : '토큰 미설정 — 워커 API는 401을 반환합니다'; ?>
        </p>
    </form>

    <form method="post" action="<?php echo htmlspecialchars(bacara_wallet_admin_url('action.php'), ENT_QUOTES, 'UTF-8'); ?>" style="margin-bottom:14px">
        <input type="hidden" name="token" value="<?php echo htmlspecialchars(bacara_wallet_admin_token(), ENT_QUOTES, 'UTF-8'); ?>">
        <input type="hidden" name="mode" value="ops_run_worker">
        <button type="submit" class="btn_submit">지금 워커 실행</button>
    </form>

    <?php if ($token_set) { ?>
        <div style="padding:12px;border:1px dashed var(--bw-line);border-radius:12px;background:var(--bw-card-2);font-size:0.82rem;color:var(--bw-muted);word-break:break-all">
            <div style="margin-bottom:6px;color:var(--bw-dim)">cron 예시</div>
            <code>* * * * * curl -fsS "<?php echo htmlspecialchars($worker_url, ENT_QUOTES, 'UTF-8'); ?>?token=YOUR_TOKEN&amp;action=run&amp;limit=50"</code>
        </div>
    <?php } ?>
</div>

<div class="bw-card">
    <h3 style="margin:0 0 10px;font-size:1.05rem">대사(Reconciliation) — 최근 24시간</h3>
    <?php if (empty($recon['issues'])) { ?>
        <div class="bw-empty">불일치 항목이 없습니다.</div>
    <?php } else { ?>
        <div class="tbl_head01 tbl_wrap">
            <table>
                <thead>
                    <tr>
                        <th>심각도</th>
                        <th>유형</th>
                        <th>회원</th>
                        <th>place_key</th>
                        <th>금액</th>
                        <th>메시지</th>
                    </tr>
                </thead>
                <tbody>
                <?php foreach ($recon['issues'] as $issue) { ?>
                    <tr>
                        <td style="color:<?php echo $issue['severity'] === 'critical' ? '#f87171' : '#fbbf24'; ?>">
                            <?php echo htmlspecialchars($issue['severity'], ENT_QUOTES, 'UTF-8'); ?>
                        </td>
                        <td><?php echo htmlspecialchars($issue['type'], ENT_QUOTES, 'UTF-8'); ?></td>
                        <td><?php echo htmlspecialchars($issue['mb_id'], ENT_QUOTES, 'UTF-8'); ?></td>
                        <td style="font-size:0.78rem;word-break:break-all"><?php echo htmlspecialchars($issue['place_key'], ENT_QUOTES, 'UTF-8'); ?></td>
                        <td class="bw-money"><?php echo bacara_wallet_format((int) $issue['amount']); ?></td>
                        <td><?php echo htmlspecialchars($issue['message'], ENT_QUOTES, 'UTF-8'); ?></td>
                    </tr>
                <?php } ?>
                </tbody>
            </table>
        </div>
    <?php } ?>
</div>

<?php bacara_wallet_admin_shell_end(); ?>
<?php include_once G5_ADMIN_PATH . '/admin.tail.php'; ?>
