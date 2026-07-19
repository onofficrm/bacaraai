<?php
require_once dirname(__FILE__) . '/_bootstrap.php';

$g5['title'] = '가상머니 충전';
include_once G5_ADMIN_PATH . '/admin.head.php';

$mb_id = isset($_GET['mb_id']) ? trim($_GET['mb_id']) : '';
$mb = $mb_id !== '' ? get_member($mb_id) : array();
$balance = !empty($mb['mb_id']) ? bacara_wallet_get_balance($mb['mb_id']) : 0;
?>

<?php bacara_wallet_admin_shell_start('가상머니 충전', '회원에게 가상 게임머니(시드)를 충전·차감하거나 잔액을 직접 설정합니다.'); ?>
<?php bacara_wallet_admin_nav('charge'); ?>

<div class="bw-card">
    <h3>대상 회원 조회</h3>
    <form method="get" action="" class="bw-search">
        <input type="text" name="mb_id" value="<?php echo htmlspecialchars($mb_id, ENT_QUOTES, 'UTF-8'); ?>" class="frm_input" placeholder="회원 아이디" required>
        <button type="submit" class="btn_submit">조회</button>
        <a href="<?php echo htmlspecialchars(bacara_wallet_admin_url('form.php'), ENT_QUOTES, 'UTF-8'); ?>" class="btn_submit bw-ghost">회원 생성</a>
    </form>

    <?php if ($mb_id !== '' && empty($mb['mb_id'])) { ?>
        <div class="bw-empty">회원을 찾을 수 없습니다. 아이디를 다시 확인해 주세요.</div>
    <?php } elseif (!empty($mb['mb_id'])) { ?>
        <div class="bw-balance-box">
            <strong><?php echo htmlspecialchars($mb['mb_id'], ENT_QUOTES, 'UTF-8'); ?></strong>
            <span style="color:#a1a1aa">
                <?php echo htmlspecialchars($mb['mb_name'], ENT_QUOTES, 'UTF-8'); ?>
                / <?php echo htmlspecialchars($mb['mb_nick'], ENT_QUOTES, 'UTF-8'); ?>
            </span>
            <span>현재 잔액</span>
            <span class="bw-money"><?php echo bacara_wallet_format($balance); ?></span>
        </div>

        <form method="post" action="<?php echo htmlspecialchars(bacara_wallet_admin_url('action.php'), ENT_QUOTES, 'UTF-8'); ?>">
            <input type="hidden" name="token" value="">
            <input type="hidden" name="mode" value="charge">
            <input type="hidden" name="mb_id" value="<?php echo htmlspecialchars($mb['mb_id'], ENT_QUOTES, 'UTF-8'); ?>">

            <div class="bw-grid">
                <div>
                    <label for="charge_type">처리 방식</label>
                    <select name="charge_type" id="charge_type">
                        <option value="grant">충전 (+)</option>
                        <option value="subtract">차감 (−)</option>
                        <option value="set">잔액 직접 설정</option>
                    </select>
                </div>
                <div>
                    <label for="amount">금액 (원)</label>
                    <input type="text" name="amount" id="amount" required class="frm_input" inputmode="numeric" placeholder="예: 1000000">
                </div>
            </div>

            <div class="bw-field-full">
                <label for="content">메모</label>
                <input type="text" name="content" id="content" class="frm_input" placeholder="예: 추가 시드 지급">
            </div>

            <div class="bw-actions">
                <button type="submit" class="btn_submit">적용하기</button>
            </div>
        </form>
    <?php } else { ?>
        <div class="bw-empty">충전할 회원 아이디를 입력한 뒤 조회하세요.</div>
    <?php } ?>
</div>

<?php bacara_wallet_admin_shell_end(); ?>

<?php
include_once G5_ADMIN_PATH . '/admin.tail.php';
