<?php
require_once dirname(__FILE__) . '/_bootstrap.php';

$g5['title'] = '가상머니 충전';
include_once G5_ADMIN_PATH . '/admin.head.php';

$mb_id = isset($_GET['mb_id']) ? trim($_GET['mb_id']) : '';
$mb = $mb_id !== '' ? get_member($mb_id) : array();
$balance = !empty($mb['mb_id']) ? bacara_wallet_get_balance($mb['mb_id']) : 0;
$token = get_admin_token();
?>

<div class="bacara-wallet">
    <h2>가상머니 충전 / 차감</h2>
    <p class="bw-desc">가상 게임(시드)용 머니입니다. 금액은 원 단위로 입력하세요.</p>

    <?php bacara_wallet_admin_nav('charge'); ?>

    <div class="bw-card">
        <h3>대상 회원</h3>
        <form method="get" action="" class="bw-search">
            <input type="text" name="mb_id" value="<?php echo htmlspecialchars($mb_id, ENT_QUOTES, 'UTF-8'); ?>" class="frm_input" placeholder="회원 아이디" required>
            <button type="submit" class="btn_submit">조회</button>
        </form>

        <?php if ($mb_id !== '' && empty($mb['mb_id'])) { ?>
            <div class="bw-empty">회원을 찾을 수 없습니다.</div>
        <?php } elseif (!empty($mb['mb_id'])) { ?>
            <p>
                <strong><?php echo htmlspecialchars($mb['mb_id'], ENT_QUOTES, 'UTF-8'); ?></strong>
                (<?php echo htmlspecialchars($mb['mb_name'], ENT_QUOTES, 'UTF-8'); ?> / <?php echo htmlspecialchars($mb['mb_nick'], ENT_QUOTES, 'UTF-8'); ?>)
                · 현재 잔액
                <span class="bw-money"><?php echo bacara_wallet_format($balance); ?></span>
            </p>

            <form method="post" action="<?php echo htmlspecialchars(bacara_wallet_admin_url('action.php'), ENT_QUOTES, 'UTF-8'); ?>" style="margin-top:18px">
                <input type="hidden" name="token" value="<?php echo get_text($token); ?>">
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

                <div style="margin-top:14px">
                    <label for="content">메모</label>
                    <input type="text" name="content" id="content" class="frm_input" placeholder="예: 추가 시드 지급">
                </div>

                <div class="bw-actions">
                    <button type="submit" class="btn_submit bw-amber">적용</button>
                </div>
            </form>
        <?php } ?>
    </div>
</div>

<?php
include_once G5_ADMIN_PATH . '/admin.tail.php';
