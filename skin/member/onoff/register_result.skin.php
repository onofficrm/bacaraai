<?php
if (!defined('_GNUBOARD_')) exit;

include_once G5_SKIN_PATH . '/_inc/onoff-platform.php';
onoff_platform_member_styles($member_skin_url);

$bacaraai_system_url = onoff_platform_member_login_url('');
?>

<!-- 회원가입결과 시작 { -->
<div class="onoff-platform onoff-platform--member">
<?php onoff_platform_member_top_bar(); ?>
<div id="reg_result" class="register onoff-platform__card">
    <?php onoff_platform_member_brand('회원가입 완료'); ?>

    <p class="reg_result_p">
        <i class="fa fa-check-circle" aria-hidden="true"></i><br>
        <strong><?php echo get_text($mb['mb_name']); ?></strong>님, 회원가입을 환영합니다.
    </p>

    <?php if (is_use_email_certify()) { ?>
    <p class="result_txt">
        입력하신 이메일로 인증 메일이 발송되었습니다.<br>
        인증 완료 후 AI 분석 시스템을 이용할 수 있습니다.
    </p>
    <div id="result_email">
        <span>아이디</span>
        <strong><?php echo $mb['mb_id'] ?></strong>
        <span>이메일 주소</span>
        <strong><?php echo $mb['mb_email'] ?></strong>
    </div>
    <p class="result_txt">
        이메일 주소가 잘못되었다면 사이트 관리자에게 문의해 주세요.
    </p>
    <?php } else { ?>
    <p class="result_txt">
        로그인 후 바로 AI Baccarat Assistant 시스템을 이용할 수 있습니다.
    </p>
    <?php } ?>

    <div class="btn_confirm">
        <a href="<?php echo G5_BBS_URL ?>/login.php?url=<?php echo urlencode($bacaraai_system_url); ?>" class="btn_submit">로그인하고 시스템 입장</a>
        <a href="<?php echo G5_URL; ?>" class="onoff-platform__outline-btn">랜딩 페이지로</a>
    </div>
</div>
<?php onoff_platform_member_footer(); ?>
</div>
<!-- } 회원가입결과 끝 -->
