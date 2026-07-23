<?php
require_once dirname(__FILE__) . '/_bootstrap.php';
include_once G5_LIB_PATH . '/register.lib.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    alert('올바른 방법으로 이용해 주세요.', bacara_wallet_admin_url());
}

if (function_exists('check_admin_token')) {
    check_admin_token();
} else {
    $posted = isset($_POST['token']) ? (string) $_POST['token'] : '';
    $session_token = get_session('ss_admin_token');
    set_session('ss_admin_token', '');
    if ($posted === '' || $session_token === '' || !hash_equals((string) $session_token, $posted)) {
        alert('올바른 방법으로 이용해 주세요.', bacara_wallet_admin_url());
    }
}

$mode = isset($_POST['mode']) ? preg_replace('/[^a-z_]/', '', $_POST['mode']) : '';

if ($mode === 'create_member') {
    $mb_id = isset($_POST['mb_id']) ? trim($_POST['mb_id']) : '';
    $mb_password = isset($_POST['mb_password']) ? trim($_POST['mb_password']) : '';
    $mb_password_re = isset($_POST['mb_password_re']) ? trim($_POST['mb_password_re']) : '';
    $mb_name = isset($_POST['mb_name']) ? trim($_POST['mb_name']) : '';
    $mb_nick = isset($_POST['mb_nick']) ? trim($_POST['mb_nick']) : '';
    $mb_email = isset($_POST['mb_email']) ? trim($_POST['mb_email']) : '';
    $mb_level = isset($_POST['mb_level']) ? (int) $_POST['mb_level'] : 2;
    $money = isset($_POST['game_money']) ? (int) preg_replace('/[^0-9]/', '', (string) $_POST['game_money']) : 0;
    $money_note = isset($_POST['money_note']) ? trim($_POST['money_note']) : '';

    if ($mb_password !== $mb_password_re) {
        alert('비밀번호 확인이 일치하지 않습니다.');
    }

    $created = bacara_wallet_create_member($mb_id, $mb_password, $mb_name, $mb_nick, $mb_email, $mb_level);
    if (empty($created['ok'])) {
        alert($created['message']);
    }

    if ($money > 0) {
        $note = $money_note !== '' ? $money_note : '회원 생성 시 가상머니 지급';
        $result = bacara_wallet_adjust($created['mb_id'], $money, 'grant', $note);
        if (empty($result['ok'])) {
            alert('회원은 생성되었으나 머니 지급에 실패했습니다: ' . $result['message'], bacara_wallet_admin_url('charge.php', array('mb_id' => $created['mb_id'])));
        }
    }

    alert('회원이 생성되었습니다. 아이디: ' . $created['mb_id'], bacara_wallet_admin_url('index.php', array('stx' => $created['mb_id'])));
}

if ($mode === 'charge') {
    $mb_id = isset($_POST['mb_id']) ? trim($_POST['mb_id']) : '';
    $charge_type = isset($_POST['charge_type']) ? $_POST['charge_type'] : 'grant';
    $amount = isset($_POST['amount']) ? (int) preg_replace('/[^0-9\-]/', '', (string) $_POST['amount']) : 0;
    $content = isset($_POST['content']) ? trim($_POST['content']) : '';

    if ($mb_id === '') {
        alert('회원 아이디를 입력해 주세요.');
    }

    $mb = get_member($mb_id);
    if (empty($mb['mb_id'])) {
        alert('존재하지 않는 회원입니다.');
    }

    if ($charge_type === 'set') {
        if ($amount < 0) {
            alert('설정 잔액은 0 이상이어야 합니다.');
        }
        $result = bacara_wallet_set_balance($mb_id, $amount, $content !== '' ? $content : '관리자 잔액 설정');
    } else {
        if ($amount === 0) {
            alert('증감 금액을 입력해 주세요.');
        }
        if ($charge_type === 'subtract') {
            $amount = -abs($amount);
        } else {
            $amount = abs($amount);
        }
        $result = bacara_wallet_adjust(
            $mb_id,
            $amount,
            $amount >= 0 ? 'grant' : 'adjust',
            $content !== '' ? $content : ($amount >= 0 ? '관리자 가상머니 충전' : '관리자 가상머니 차감')
        );
    }

    if (empty($result['ok'])) {
        alert($result['message']);
    }

    alert(
        '처리 완료. 현재 잔액: ' . bacara_wallet_format($result['balance']),
        bacara_wallet_admin_url('charge.php', array('mb_id' => $mb_id))
    );
}

if ($mode === 'save_ai_keys') {
    include_once G5_LIB_PATH . '/bacara-ai-config.lib.php';

    $clear_keys = array();
    if (!empty($_POST['clear_openai_api_key'])) {
        $clear_keys[] = 'openai_api_key';
    }
    if (!empty($_POST['clear_anthropic_api_key'])) {
        $clear_keys[] = 'anthropic_api_key';
    }
    if (!empty($_POST['clear_gemini_api_key'])) {
        $clear_keys[] = 'gemini_api_key';
    }

    $ok = bacara_ai_config_save(
        array(
            'openai_api_key' => isset($_POST['openai_api_key']) ? (string) $_POST['openai_api_key'] : '',
            'openai_model' => isset($_POST['openai_model']) ? (string) $_POST['openai_model'] : '',
            'anthropic_api_key' => isset($_POST['anthropic_api_key']) ? (string) $_POST['anthropic_api_key'] : '',
            'anthropic_model' => isset($_POST['anthropic_model']) ? (string) $_POST['anthropic_model'] : '',
            'gemini_api_key' => isset($_POST['gemini_api_key']) ? (string) $_POST['gemini_api_key'] : '',
            'gemini_model' => isset($_POST['gemini_model']) ? (string) $_POST['gemini_model'] : '',
            'enabled' => !empty($_POST['enabled']) ? '1' : '0',
            'auto_bet_enabled' => !empty($_POST['auto_bet_enabled']) ? '1' : '0',
        ),
        $clear_keys
    );

    if (!$ok) {
        alert('설정 파일 저장에 실패했습니다. data 폴더 쓰기 권한을 확인해 주세요.', bacara_wallet_admin_url('ai_keys.php'));
    }

    goto_url(bacara_wallet_admin_url('ai_keys.php', array('saved' => '1')));
}

alert('잘못된 요청입니다.', bacara_wallet_admin_url());
