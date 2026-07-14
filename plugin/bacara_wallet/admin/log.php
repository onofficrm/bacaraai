<?php
require_once dirname(__FILE__) . '/_bootstrap.php';

$g5['title'] = '가상머니 내역';
include_once G5_ADMIN_PATH . '/admin.head.php';

$mb_id = isset($_GET['mb_id']) ? trim($_GET['mb_id']) : '';
$page = max(1, isset($_GET['page']) ? (int) $_GET['page'] : 1);
$rows = 30;
$from = ($page - 1) * $rows;

$log_table = bacara_wallet_log_table();
$where = ' where 1 ';
if ($mb_id !== '') {
    $where .= " and mb_id = '" . sql_real_escape_string($mb_id) . "' ";
}

$count_row = sql_fetch(" select count(*) as cnt from `{$log_table}` {$where} ");
$total = isset($count_row['cnt']) ? (int) $count_row['cnt'] : 0;
$total_page = max(1, (int) ceil($total / $rows));

$result = sql_query(
    " select * from `{$log_table}` {$where} order by id desc limit {$from}, {$rows} "
);
?>

<div class="bacara-wallet">
    <h2>가상머니 충전 내역</h2>
    <p class="bw-desc">관리자 지급·차감·설정 기록을 확인합니다.</p>

    <?php bacara_wallet_admin_nav('log'); ?>

    <div class="bw-card">
        <form method="get" class="bw-search">
            <input type="text" name="mb_id" value="<?php echo htmlspecialchars($mb_id, ENT_QUOTES, 'UTF-8'); ?>" class="frm_input" placeholder="아이디 필터">
            <button type="submit" class="btn_submit">필터</button>
        </form>

        <?php if ($total < 1) { ?>
            <div class="bw-empty">내역이 없습니다.</div>
        <?php } else { ?>
            <div class="tbl_head01 tbl_wrap">
                <table>
                    <thead>
                        <tr>
                            <th>일시</th>
                            <th>회원</th>
                            <th>변동</th>
                            <th>잔액</th>
                            <th>유형</th>
                            <th>메모</th>
                            <th>처리자</th>
                        </tr>
                    </thead>
                    <tbody>
                    <?php while ($row = sql_fetch_array($result)) {
                        $delta = (int) $row['delta'];
                        $delta_cls = $delta >= 0 ? 'bw-plus' : 'bw-minus';
                        $delta_text = ($delta >= 0 ? '+' : '') . number_format($delta) . '원';
                        ?>
                        <tr>
                            <td><?php echo htmlspecialchars($row['created_at'], ENT_QUOTES, 'UTF-8'); ?></td>
                            <td><?php echo htmlspecialchars($row['mb_id'], ENT_QUOTES, 'UTF-8'); ?></td>
                            <td class="<?php echo $delta_cls; ?>"><?php echo $delta_text; ?></td>
                            <td class="bw-money"><?php echo bacara_wallet_format($row['balance_after']); ?></td>
                            <td><?php echo htmlspecialchars($row['kind'], ENT_QUOTES, 'UTF-8'); ?></td>
                            <td><?php echo htmlspecialchars($row['content'], ENT_QUOTES, 'UTF-8'); ?></td>
                            <td><?php echo htmlspecialchars($row['admin_mb_id'], ENT_QUOTES, 'UTF-8'); ?></td>
                        </tr>
                    <?php } ?>
                    </tbody>
                </table>
            </div>
            <?php
            $q = $mb_id !== '' ? 'mb_id=' . urlencode($mb_id) . '&' : '';
            echo get_paging(G5_IS_MOBILE ? $config['cf_mobile_pages'] : $config['cf_write_pages'], $page, $total_page, bacara_wallet_admin_url('log.php') . '?' . $q . 'page=');
            ?>
        <?php } ?>
    </div>
</div>

<?php
include_once G5_ADMIN_PATH . '/admin.tail.php';
