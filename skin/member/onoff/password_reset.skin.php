<?php
if (!defined('_GNUBOARD_')) exit;

include_once G5_SKIN_PATH . '/_inc/onoff-platform.php';
onoff_platform_member_styles($member_skin_url);
?>

<!-- 비밀번호 재설정 시작 { -->
<div class="onoff-platform onoff-platform--member">
<?php onoff_platform_member_top_bar(); ?>
<div id="pw_reset" class="new_win onoff-platform__card">
    <?php onoff_platform_member_brand('비밀번호 재설정'); ?>
    <div class="new_win_con">
        <form name="fpasswordreset" action="<?php echo $action_url; ?>" onsubmit="return fpasswordreset_submit(this);" method="post" autocomplete="off">
            <fieldset id="info_fs">
                <p>새로운 비밀번호를 입력해 주세요.</p>
                <b>회원 아이디 : <?php echo get_text($_POST['mb_id']); ?></b>
                <label for="mb_pw" class="sound_only">새 비밀번호<strong class="sound_only">필수</strong></label>
                <input type="password" name="mb_password" id="mb_pw" required class="required frm_input full_input" size="30" placeholder="새 비밀번호">
                <label for="mb_pw2" class="sound_only">새 비밀번호 확인<strong class="sound_only">필수</strong></label>
                <input type="password" name="mb_password_re" id="mb_pw2" required class="required frm_input full_input" size="30" placeholder="새 비밀번호 확인">
            </fieldset>
            <div class="win_btn">
                <button type="submit" class="btn_submit">비밀번호 변경</button>
            </div>
            <a href="<?php echo G5_BBS_URL ?>/login.php" class="onoff-platform__outline-btn">로그인으로 돌아가기</a>
        </form>
    </div>
</div>
<?php onoff_platform_member_footer(); ?>
</div>

<script>
function fpasswordreset_submit(f) {
    if ($("#mb_pw").val() == $("#mb_pw2").val()) {
        alert("비밀번호 변경되었습니다. 다시 로그인해 주세요.");
    } else {
        alert("새 비밀번호와 비밀번호 확인이 일치하지 않습니다.");
        return false;
    }
}
</script>
<!-- } 비밀번호 재설정 끝 -->
