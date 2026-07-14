<?php
require_once dirname(__FILE__) . '/_bootstrap.php';

$g5['title'] = '가상머니 관리';
include_once G5_ADMIN_PATH . '/admin.head.php';

$stx = isset($_GET['stx']) ? trim($_GET['stx']) : '';
$page = max(1, isset($_GET['page']) ? (int) $_GET['page'] : 1);
$rows = 20;
$from = ($page - 1) * $rows;

$where = " where (mb_leave_date = '' or mb_leave_date is null) and mb_id <> '{$config['cf_admin']}' ";
if ($stx !== '') {
    $stx_esc = sql_real_escape_string($stx);
    $where .= " and (mb_id like '%{$stx_esc}%' or mb_name like '%{$stx_esc}%' or mb_nick like '%{$stx_esc}%') ";
}

$total_row = sql_fetch(" select count(*) as cnt from {$g5['member_table']} {$where} ");
$total = isset($total_row['cnt']) ? (int) $total_row['cnt'] : 0;
$total_page = max(1, (int) ceil($total / $rows));

$sql = " select mb_id, mb_name, mb_nick, mb_level, mb_datetime, mb_today_login
           from {$g5['member_table']}
           {$where}
           order by mb_datetime desc
           limit {$from}, {$rows} ";
$result = sql_query($sql);

$wallet_table = bacara_wallet_table();
?>

<div class="bacara-wallet">
    <h2>회원 · 가상머니 관리</h2>
    <p class="bw-desc">
        공개 회원가입은 막혀 있습니다. 최고관리자가 아이디·비밀번호를 부여하고, 가상 게임머니(시드)를 지급하세요.
    </p>
    <p class="bw-notice">
        가상머니는 그누보드 포인트와 별도입니다. AI 과금 포인트와 섞이지 않습니다.
    </p>

    <?php bacara_wallet_admin_nav('list'); ?>

    <div class="bw-card">
        <form method="get" action="" class="bw-search">
            <input type="text" name="stx" value="<?php echo htmlspecialchars($stx, ENT_QUOTES, 'UTF-8'); ?>" class="frm_input" placeholder="아이디 / 이름 / 닉네임 검색">
            <button type="submit" class="btn_submit">검색</button>
            <a href="<?php echo htmlspecialchars(bacara_wallet_admin_url('form.php'), ENT_QUOTES, 'UTF-8'); ?>" class="btn_submit bw-amber">+ 회원 생성</a>
        </form>

        <?php if ($total < 1) { ?>
            <div class="bw-empty">회원이 없습니다. 먼저 회원을 생성해 주세요.</div>
        <?php } else { ?>
            <div class="tbl_head01 tbl_wrap">
                <table>
                    <thead>
                        <tr>
                            <th>아이디</th>
                            <th>이름 / 닉네임</th>
                            <th>레벨</th>
                            <th>가상머니</th>
                            <th>가입일</th>
                            <th>관리</th>
                        </tr>
                    </thead>
                    <tbody>
                    <?php
                    for ($i = 0; $row = sql_fetch_array($result); $i++) {
                        $balance = bacara_wallet_get_balance($row['mb_id']);
                        ?>
                        <tr>
                            <td><strong><?php echo htmlspecialchars($row['mb_id'], ENT_QUOTES, 'UTF-8'); ?></strong></td>
                            <td>
                                <?php echo htmlspecialchars($row['mb_name'], ENT_QUOTES, 'UTF-8'); ?>
                                <span style="color:#a1a1aa"> / <?php echo htmlspecialchars($row['mb_nick'], ENT_QUOTES, 'UTF-8'); ?></span>
                            </td>
                            <td><?php echo (int) $row['mb_level']; ?></td>
                            <td class="bw-money"><?php echo bacara_wallet_format($balance); ?></td>
                            <td><?php echo substr($row['mb_datetime'], 0, 10); ?></td>
                            <td>
                                <a class="btn_frmline" href="<?php echo htmlspecialchars(bacara_wallet_admin_url('charge.php', array('mb_id' => $row['mb_id'])), ENT_QUOTES, 'UTF-8'); ?>">머니 충전</a>
                                <a class="btn_frmline" href="<?php echo G5_ADMIN_URL; ?>/member_form.php?w=u&amp;mb_id=<?php echo urlencode($row['mb_id']); ?>">회원정보</a>
                            </td>
                        </tr>
                    <?php } ?>
                    </tbody>
                </table>
            </div>

            <?php
            $qstr = $stx !== '' ? '&stx=' . urlencode($stx) : '';
            echo get_paging(G5_IS_MOBILE ? $config['cf_mobile_pages'] : $config['cf_write_pages'], $page, $total_page, bacara_wallet_admin_url('index.php') . '?' . ($qstr ? ltrim($qstr, '&') . '&' : '') . 'page=');
            ?>
        <?php } ?>
    </div>
</div>

<?php
include_once G5_ADMIN_PATH . '/admin.tail.php';
