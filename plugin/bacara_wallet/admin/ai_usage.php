<?php
require_once dirname(__FILE__) . '/_bootstrap.php';
include_once G5_LIB_PATH . '/bacara-ai-usage.lib.php';

$g5['title'] = 'AI API 요금';
include_once G5_ADMIN_PATH . '/admin.head.php';

bacara_ai_usage_install_tables();

$range = isset($_GET['range']) ? preg_replace('/[^a-z0-9_]/', '', $_GET['range']) : '7d';
$now = time();
switch ($range) {
    case 'today':
        $from_ts = strtotime(date('Y-m-d 00:00:00'));
        $label = '오늘';
        break;
    case '30d':
        $from_ts = $now - 30 * 86400;
        $label = '최근 30일';
        break;
    case 'all':
        $from_ts = strtotime('2020-01-01');
        $label = '전체';
        break;
    case '7d':
    default:
        $range = '7d';
        $from_ts = $now - 7 * 86400;
        $label = '최근 7일';
        break;
}

$from = date('Y-m-d H:i:s', $from_ts);
$to = date('Y-m-d H:i:s', $now);

$summary = bacara_ai_usage_summary($from, $to);
$daily = bacara_ai_usage_daily($from, $to);
$recent = bacara_ai_usage_recent(40);

$total_cost = 0.0;
$total_calls = 0;
$total_tokens = 0;
foreach ($summary as $row) {
    $total_cost += (float) $row['cost_usd'];
    $total_calls += (int) $row['calls'];
    $total_tokens += (int) $row['total_tokens'];
}

$by_provider = array(
    'openai' => null,
    'anthropic' => null,
    'gemini' => null,
);
foreach ($summary as $row) {
    $by_provider[$row['provider']] = $row;
}

$usd_krw = 1350; // 참고 환율(고정). 실제 청구는 USD 기준.
?>

<?php bacara_wallet_admin_shell_start('AI API 요금', '모델별 실호출 토큰·추정 요금입니다. 응답 usage 기준으로 집계하며, 실제 청구액은 각 벤더 콘솔이 최종입니다.'); ?>
<?php bacara_wallet_admin_nav('usage'); ?>

<div class="bw-status-row">
    <?php
    $ranges = array('today' => '오늘', '7d' => '7일', '30d' => '30일', 'all' => '전체');
    foreach ($ranges as $key => $txt) {
        $cls = $range === $key ? 'is-on' : 'is-off';
        $href = htmlspecialchars(bacara_wallet_admin_url('ai_usage.php', array('range' => $key)), ENT_QUOTES, 'UTF-8');
        echo '<a class="bw-pill ' . $cls . '" href="' . $href . '" style="text-decoration:none">' . $txt . '</a>';
    }
    ?>
</div>

<div class="bw-card">
    <h3><?php echo htmlspecialchars($label, ENT_QUOTES, 'UTF-8'); ?> 합계</h3>
    <div class="bw-grid" style="grid-template-columns: repeat(3, minmax(0,1fr));">
        <div>
            <label>추정 요금 (USD)</label>
            <p class="bw-money" style="font-size:1.4rem;margin:0"><?php echo htmlspecialchars(bacara_ai_usage_format_usd($total_cost), ENT_QUOTES, 'UTF-8'); ?></p>
            <p class="bw-hint">참고 원화 ≈ <?php echo number_format((int) round($total_cost * $usd_krw)); ?>원 (환율 <?php echo number_format($usd_krw); ?>)</p>
        </div>
        <div>
            <label>API 호출</label>
            <p class="bw-money" style="font-size:1.4rem;margin:0;color:#fafafa"><?php echo number_format($total_calls); ?>회</p>
        </div>
        <div>
            <label>토큰 합계</label>
            <p class="bw-money" style="font-size:1.4rem;margin:0;color:#fafafa"><?php echo number_format($total_tokens); ?></p>
        </div>
    </div>
</div>

<div class="bw-card">
    <h3>모델(벤더)별</h3>
    <div class="tbl_head01 tbl_wrap">
        <table>
            <thead>
                <tr>
                    <th>모델</th>
                    <th>호출</th>
                    <th>성공</th>
                    <th>입력 토큰</th>
                    <th>출력 토큰</th>
                    <th>추정 요금</th>
                    <th>평균 지연</th>
                </tr>
            </thead>
            <tbody>
            <?php
            $order = array('openai', 'anthropic', 'gemini');
            foreach ($order as $provider) {
                $row = $by_provider[$provider];
                if (!$row) {
                    ?>
                    <tr>
                        <td><strong><?php echo htmlspecialchars(bacara_ai_usage_provider_label($provider), ENT_QUOTES, 'UTF-8'); ?></strong></td>
                        <td colspan="6" style="color:#71717a">해당 기간 호출 없음</td>
                    </tr>
                    <?php
                    continue;
                }
                ?>
                <tr>
                    <td><strong><?php echo htmlspecialchars(bacara_ai_usage_provider_label($provider), ENT_QUOTES, 'UTF-8'); ?></strong></td>
                    <td><?php echo number_format($row['calls']); ?></td>
                    <td><?php echo number_format($row['ok_calls']); ?></td>
                    <td><?php echo number_format($row['input_tokens']); ?></td>
                    <td><?php echo number_format($row['output_tokens']); ?></td>
                    <td class="bw-money"><?php echo htmlspecialchars(bacara_ai_usage_format_usd($row['cost_usd']), ENT_QUOTES, 'UTF-8'); ?></td>
                    <td><?php echo number_format($row['avg_ms']); ?>ms</td>
                </tr>
            <?php } ?>
            </tbody>
        </table>
    </div>
    <p class="bw-hint" style="margin-top:12px">
        단가 참고(1M 토큰): GPT-4o-mini $0.15/$0.60 · Claude Sonnet $3/$15 · Gemini 2.0 Flash $0.10/$0.40 (입력/출력). 설정 모델명에 맞게 추정합니다.
    </p>
</div>

<?php if ($daily) { ?>
<div class="bw-card">
    <h3>일별 내역</h3>
    <div class="tbl_head01 tbl_wrap">
        <table>
            <thead>
                <tr>
                    <th>날짜</th>
                    <th>모델</th>
                    <th>호출</th>
                    <th>토큰</th>
                    <th>추정 요금</th>
                </tr>
            </thead>
            <tbody>
            <?php foreach ($daily as $row) { ?>
                <tr>
                    <td><?php echo htmlspecialchars($row['d'], ENT_QUOTES, 'UTF-8'); ?></td>
                    <td><?php echo htmlspecialchars(bacara_ai_usage_provider_label($row['provider']), ENT_QUOTES, 'UTF-8'); ?></td>
                    <td><?php echo number_format((int) $row['calls']); ?></td>
                    <td><?php echo number_format((int) $row['total_tokens']); ?></td>
                    <td class="bw-money"><?php echo htmlspecialchars(bacara_ai_usage_format_usd($row['cost_usd']), ENT_QUOTES, 'UTF-8'); ?></td>
                </tr>
            <?php } ?>
            </tbody>
        </table>
    </div>
</div>
<?php } ?>

<div class="bw-card">
    <h3>최근 호출</h3>
    <?php if (!$recent) { ?>
        <div class="bw-empty">아직 기록된 API 호출이 없습니다. 실시간 분석이 한 번 돌면 여기에 쌓입니다.</div>
    <?php } else { ?>
        <div class="tbl_head01 tbl_wrap">
            <table>
                <thead>
                    <tr>
                        <th>시각</th>
                        <th>모델</th>
                        <th>용도</th>
                        <th>테이블</th>
                        <th>토큰(입/출)</th>
                        <th>요금</th>
                        <th>상태</th>
                    </tr>
                </thead>
                <tbody>
                <?php foreach ($recent as $row) { ?>
                    <tr>
                        <td><?php echo htmlspecialchars(substr($row['created_at'], 5, 14), ENT_QUOTES, 'UTF-8'); ?></td>
                        <td>
                            <?php echo htmlspecialchars(bacara_ai_usage_provider_label($row['provider']), ENT_QUOTES, 'UTF-8'); ?>
                            <div class="bw-hint" style="margin:0"><?php echo htmlspecialchars($row['model'], ENT_QUOTES, 'UTF-8'); ?></div>
                        </td>
                        <td><?php echo htmlspecialchars($row['purpose'], ENT_QUOTES, 'UTF-8'); ?></td>
                        <td><?php echo $row['table_name'] !== '' ? htmlspecialchars($row['table_name'], ENT_QUOTES, 'UTF-8') : '-'; ?></td>
                        <td><?php echo number_format((int) $row['input_tokens']); ?> / <?php echo number_format((int) $row['output_tokens']); ?></td>
                        <td class="bw-money"><?php echo htmlspecialchars(bacara_ai_usage_format_usd($row['cost_usd']), ENT_QUOTES, 'UTF-8'); ?></td>
                        <td>
                            <?php if ((int) $row['ok'] === 1) { ?>
                                <span style="color:#34d399">OK</span>
                            <?php } else { ?>
                                <span style="color:#f87171" title="<?php echo htmlspecialchars($row['error'], ENT_QUOTES, 'UTF-8'); ?>">오류</span>
                            <?php } ?>
                            <span class="bw-hint" style="margin:0;display:inline"><?php echo (int) $row['ms']; ?>ms</span>
                        </td>
                    </tr>
                <?php } ?>
                </tbody>
            </table>
        </div>
    <?php } ?>
</div>

<?php bacara_wallet_admin_shell_end(); ?>
<?php
include_once G5_ADMIN_PATH . '/admin.tail.php';
