<?php
require_once dirname(__FILE__) . '/_bootstrap.php';

$g5['title'] = '회원 생성';
include_once G5_ADMIN_PATH . '/admin.head.php';

?>

<?php bacara_wallet_admin_shell_start('회원 생성', '공개 가입 없이 관리자가 아이디·비밀번호를 부여하고 초기 가상머니(시드)를 함께 지급합니다.'); ?>
<?php bacara_wallet_admin_nav('create'); ?>

<div class="bw-card">
    <h3>새 회원 정보</h3>
    <form method="post" action="<?php echo htmlspecialchars(bacara_wallet_admin_url('action.php'), ENT_QUOTES, 'UTF-8'); ?>" autocomplete="off">
        <input type="hidden" name="token" value="">
        <input type="hidden" name="mode" value="create_member">

        <div class="bw-grid">
            <div>
                <label for="mb_id">아이디 (필수)</label>
                <input type="text" name="mb_id" id="mb_id" required class="frm_input" maxlength="20" placeholder="영문·숫자·_">
                <p class="bw-hint">최소 3자 · 영문/숫자/_ 만 가능</p>
            </div>
            <div>
                <label for="mb_name">이름</label>
                <input type="text" name="mb_name" id="mb_name" class="frm_input" placeholder="비우면 아이디와 동일">
            </div>
            <div>
                <label for="mb_password">비밀번호 (필수)</label>
                <input type="text" name="mb_password" id="mb_password" required class="frm_input" minlength="4" placeholder="회원에게 전달할 비밀번호">
            </div>
            <div>
                <label for="mb_password_re">비밀번호 확인</label>
                <input type="text" name="mb_password_re" id="mb_password_re" required class="frm_input" minlength="4">
            </div>
            <div>
                <label for="mb_nick">닉네임</label>
                <input type="text" name="mb_nick" id="mb_nick" class="frm_input" placeholder="비우면 아이디와 동일">
            </div>
            <div>
                <label for="mb_email">이메일 (선택)</label>
                <input type="email" name="mb_email" id="mb_email" class="frm_input" placeholder="비우면 자동 생성">
            </div>
            <div>
                <label for="mb_level">회원 레벨</label>
                <select name="mb_level" id="mb_level">
                    <?php for ($lv = 2; $lv <= 9; $lv++) { ?>
                        <option value="<?php echo $lv; ?>"<?php echo $lv === 2 ? ' selected' : ''; ?>><?php echo $lv; ?></option>
                    <?php } ?>
                </select>
            </div>
            <div>
                <label for="game_money">초기 가상머니 (원)</label>
                <input type="text" name="game_money" id="game_money" class="frm_input" value="4000000" inputmode="numeric">
                <p class="bw-hint">예: 4000000 · 0이면 머니 없이 생성</p>
            </div>
        </div>

        <div class="bw-field-full">
            <label for="money_note">머니 지급 메모 (선택)</label>
            <input type="text" name="money_note" id="money_note" class="frm_input" placeholder="예: 체험 계정 초기 시드">
        </div>

        <div class="bw-actions">
            <button type="submit" class="btn_submit">회원 생성 + 머니 지급</button>
            <a href="<?php echo htmlspecialchars(bacara_wallet_admin_url(), ENT_QUOTES, 'UTF-8'); ?>" class="btn_submit bw-ghost">목록으로</a>
        </div>
    </form>
</div>

<?php bacara_wallet_admin_shell_end(); ?>

<?php
include_once G5_ADMIN_PATH . '/admin.tail.php';
