<?php
/**
 * 로그인 회원 가상머니 잔액 JSON
 */
include_once dirname(__FILE__) . '/../../../common.php';
include_once G5_LIB_PATH . '/bacara-wallet.lib.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

if (empty($is_member) || empty($member['mb_id'])) {
    echo json_encode(array(
        'ok' => false,
        'logged_in' => false,
        'balance' => 0,
        'message' => '로그인이 필요합니다.',
    ), JSON_UNESCAPED_UNICODE);
    exit;
}

bacara_wallet_install_tables();
$balance = bacara_wallet_get_balance($member['mb_id']);

echo json_encode(array(
    'ok' => true,
    'logged_in' => true,
    'mb_id' => $member['mb_id'],
    'mb_nick' => isset($member['mb_nick']) ? $member['mb_nick'] : '',
    'balance' => $balance,
    'balance_text' => bacara_wallet_format($balance),
), JSON_UNESCAPED_UNICODE);
exit;
