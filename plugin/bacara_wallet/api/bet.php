<?php
/**
 * 가상머니 베팅 차감 / 정산 입금
 *
 * POST JSON or form:
 *   action=place|settle|cancel
 *   amount=100000
 *   side=PLAYER|BANKER|TIE   (settle)
 *   outcome=P|B|T           (settle)
 *   table_name=...
 *   note=...
 */
include_once dirname(__FILE__) . '/../../../common.php';
include_once G5_LIB_PATH . '/bacara-wallet.lib.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(array('ok' => false, 'message' => 'POST only'), JSON_UNESCAPED_UNICODE);
    exit;
}

if (empty($is_member) || empty($member['mb_id'])) {
    http_response_code(401);
    echo json_encode(array(
        'ok' => false,
        'logged_in' => false,
        'message' => '로그인이 필요합니다.',
    ), JSON_UNESCAPED_UNICODE);
    exit;
}

$raw = file_get_contents('php://input');
$json = array();
if ($raw) {
    $decoded = json_decode($raw, true);
    if (is_array($decoded)) {
        $json = $decoded;
    }
}

$action = isset($json['action']) ? (string) $json['action'] : (isset($_POST['action']) ? (string) $_POST['action'] : '');
$action = preg_replace('/[^a-z_]/', '', strtolower($action));

$amount = isset($json['amount']) ? (int) $json['amount'] : (isset($_POST['amount']) ? (int) $_POST['amount'] : 0);
$side = isset($json['side']) ? strtoupper((string) $json['side']) : (isset($_POST['side']) ? strtoupper((string) $_POST['side']) : '');
$outcome = isset($json['outcome']) ? strtoupper((string) $json['outcome']) : (isset($_POST['outcome']) ? strtoupper((string) $_POST['outcome']) : '');
$table_name = isset($json['table_name']) ? trim((string) $json['table_name']) : (isset($_POST['table_name']) ? trim((string) $_POST['table_name']) : '');
$note = isset($json['note']) ? trim((string) $json['note']) : (isset($_POST['note']) ? trim((string) $_POST['note']) : '');
$source_raw = isset($json['source']) ? strtolower((string) $json['source']) : (isset($_POST['source']) ? strtolower((string) $_POST['source']) : '');
$source = ($source_raw === 'auto') ? 'auto' : 'manual';
$round = isset($json['round']) ? (int) $json['round'] : (isset($_POST['round']) ? (int) $_POST['round'] : 0);
$shoe = isset($json['shoe']) ? trim((string) $json['shoe']) : (isset($_POST['shoe']) ? trim((string) $_POST['shoe']) : '');
if ($shoe === '' && isset($json['shoeNumber'])) {
    $shoe = trim((string) $json['shoeNumber']);
}
if ($shoe === '') {
    $shoe = '-';
}

$mb_id = $member['mb_id'];
bacara_wallet_install_tables();

/**
 * 정산 시 입금액 (이미 베팅금이 차감된 상태 기준)
 * - Player 적중: 원금 + 1배 = 2 * amount
 * - Banker 적중: 원금 + 0.95배 (5% 수수료)  → 10만 베팅 시 +195,000 (순익 +95,000)
 * - Tie 적중: 원금 + 8배 = 9 * amount
 * - P/B 베팅 중 타이(푸시): 원금 반환
 * - 패배: 0
 */
function bacara_bet_settle_credit($side, $amount, $outcome)
{
    $amount = (int) $amount;
    $side = strtoupper((string) $side);
    $outcome = strtoupper((string) $outcome);

    if ($side === 'TIE') {
        if ($outcome === 'T') {
            return $amount + ($amount * 8);
        }
        return 0;
    }

    if ($outcome === 'T') {
        return $amount; // push
    }

    $hit = ($side === 'PLAYER' && $outcome === 'P') || ($side === 'BANKER' && $outcome === 'B');
    if (!$hit) {
        return 0;
    }

    if ($side === 'BANKER') {
        $profit = (int) floor($amount * 0.95);
        return $amount + $profit;
    }

    return $amount + $amount; // Player 1:1
}

function bacara_bet_net_pnl($side, $amount, $outcome)
{
    $credit = bacara_bet_settle_credit($side, $amount, $outcome);
    return $credit - (int) $amount;
}

if ($action === 'place') {
    if ($amount <= 0) {
        http_response_code(400);
        echo json_encode(array('ok' => false, 'message' => '베팅 금액을 입력해 주세요.'), JSON_UNESCAPED_UNICODE);
        exit;
    }

    $label = $table_name !== '' ? $table_name : '테이블';
    $content = $note !== ''
        ? $note
        : ('PLACE|' . $source . '|' . $label . '|' . ($side !== '' ? $side : 'WAIT') . '|' . $amount . '|' . $round . '|' . $shoe);
    $result = bacara_wallet_adjust($mb_id, -$amount, 'bet', $content, $mb_id);

    if (empty($result['ok'])) {
        http_response_code(400);
        echo json_encode(array(
            'ok' => false,
            'message' => $result['message'],
            'balance' => isset($result['balance']) ? (int) $result['balance'] : bacara_wallet_get_balance($mb_id),
        ), JSON_UNESCAPED_UNICODE);
        exit;
    }

    echo json_encode(array(
        'ok' => true,
        'action' => 'place',
        'amount' => $amount,
        'balance' => (int) $result['balance'],
        'balance_text' => bacara_wallet_format($result['balance']),
        'message' => '베팅금이 차감되었습니다.',
    ), JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'cancel') {
    if ($amount <= 0) {
        http_response_code(400);
        echo json_encode(array('ok' => false, 'message' => '반환 금액이 없습니다.'), JSON_UNESCAPED_UNICODE);
        exit;
    }

    $label = $table_name !== '' ? $table_name : '테이블';
    $content = $note !== '' ? $note : ('CANCEL|' . $source . '|' . $label . '|' . $amount);
    $result = bacara_wallet_adjust($mb_id, $amount, 'bet_cancel', $content, $mb_id);

    if (empty($result['ok'])) {
        http_response_code(400);
        echo json_encode(array(
            'ok' => false,
            'message' => $result['message'],
            'balance' => isset($result['balance']) ? (int) $result['balance'] : bacara_wallet_get_balance($mb_id),
        ), JSON_UNESCAPED_UNICODE);
        exit;
    }

    echo json_encode(array(
        'ok' => true,
        'action' => 'cancel',
        'amount' => $amount,
        'balance' => (int) $result['balance'],
        'balance_text' => bacara_wallet_format($result['balance']),
        'message' => '베팅금이 반환되었습니다.',
    ), JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'settle') {
    if ($amount <= 0) {
        http_response_code(400);
        echo json_encode(array('ok' => false, 'message' => '정산 금액이 올바르지 않습니다.'), JSON_UNESCAPED_UNICODE);
        exit;
    }
    if (!in_array($side, array('PLAYER', 'BANKER', 'TIE'), true)) {
        http_response_code(400);
        echo json_encode(array('ok' => false, 'message' => '베팅 사이드가 올바르지 않습니다.'), JSON_UNESCAPED_UNICODE);
        exit;
    }
    if (!in_array($outcome, array('P', 'B', 'T'), true)) {
        http_response_code(400);
        echo json_encode(array('ok' => false, 'message' => '결과가 올바르지 않습니다.'), JSON_UNESCAPED_UNICODE);
        exit;
    }

    $credit = bacara_bet_settle_credit($side, $amount, $outcome);
    $pnl = bacara_bet_net_pnl($side, $amount, $outcome);
    $label = $table_name !== '' ? $table_name : '테이블';
    $kind = $credit > 0 ? 'bet_win' : 'bet_lose';
    // SETTLE|source|table|SIDE|OUT|stake|pnl|round|shoe
    $content = 'SETTLE|' . $source . '|' . $label . '|' . $side . '|' . $outcome . '|' . $amount . '|' . $pnl . '|' . $round . '|' . $shoe;
    if ($note !== '' && strpos($note, 'SETTLE|') !== 0) {
        $content .= '|' . $note;
    }

    // 패배(credit=0)도 반드시 로그에 남겨 게임 기록에 표시
    $result = bacara_wallet_adjust($mb_id, $credit, $kind, $content, $mb_id);
    if (empty($result['ok'])) {
        http_response_code(500);
        echo json_encode(array(
            'ok' => false,
            'message' => $result['message'],
            'balance' => isset($result['balance']) ? (int) $result['balance'] : bacara_wallet_get_balance($mb_id),
        ), JSON_UNESCAPED_UNICODE);
        exit;
    }

    echo json_encode(array(
        'ok' => true,
        'action' => 'settle',
        'side' => $side,
        'outcome' => $outcome,
        'stake' => $amount,
        'credit' => $credit,
        'pnl' => $pnl,
        'balance' => (int) $result['balance'],
        'balance_text' => bacara_wallet_format($result['balance']),
        'message' => $credit > 0
            ? ('정산 입금 ' . number_format($credit) . '원')
            : '패배 — 추가 입금 없음',
    ), JSON_UNESCAPED_UNICODE);
    exit;
}

http_response_code(400);
echo json_encode(array('ok' => false, 'message' => '잘못된 요청입니다.'), JSON_UNESCAPED_UNICODE);
exit;
