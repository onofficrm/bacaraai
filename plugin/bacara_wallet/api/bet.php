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
 *   client_key=...          (필수 · 동일 키 재요청은 잔액 변동 없음)
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

$client_key_raw = isset($json['client_key'])
    ? (string) $json['client_key']
    : (isset($_POST['client_key']) ? (string) $_POST['client_key'] : '');
$client_key = bacara_wallet_normalize_client_key($client_key_raw);
$place_key_raw = isset($json['place_key'])
    ? (string) $json['place_key']
    : (isset($_POST['place_key']) ? (string) $_POST['place_key'] : '');
$place_key = bacara_wallet_normalize_client_key($place_key_raw);

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

function bacara_bet_require_client_key(&$client_key)
{
    if ($client_key === '') {
        // 구버전 클라이언트 호환: 서버에서 키 생성
        $client_key = substr('s' . md5(uniqid((string) mt_rand(), true)), 0, 32);
    }
}

/**
 * 동일 회원의 place/settle/cancel을 DB connection 단위로 직렬화한다.
 * 서로 다른 회원은 각자 다른 lock을 사용하므로 동시에 처리된다.
 */
function bacara_bet_member_lock($mb_id)
{
    $name = 'bacara_bet_' . substr(sha1((string) $mb_id), 0, 32);
    $safe = sql_real_escape_string($name);
    $row = sql_fetch(" select GET_LOCK('{$safe}', 5) as acquired ", false);
    return !empty($row) && isset($row['acquired']) && (int) $row['acquired'] === 1
        ? $name
        : '';
}

function bacara_bet_member_unlock($name)
{
    if ($name === '') {
        return;
    }
    $safe = sql_real_escape_string($name);
    sql_fetch(" select RELEASE_LOCK('{$safe}') as released ", false);
}

function bacara_bet_find_ledger($mb_id, $place_key)
{
    if ($place_key === '') {
        return null;
    }
    $table = bacara_wallet_bet_table();
    $mb_esc = sql_real_escape_string($mb_id);
    $key_esc = sql_real_escape_string($place_key);
    $row = sql_fetch(
        " select id, mb_id, place_key, table_name, side, amount, source,
                 round_no, shoe, status, outcome, placed_at, resolved_at
            from `{$table}`
           where mb_id = '{$mb_esc}' and place_key = '{$key_esc}'
           limit 1 ",
        false
    );
    return !empty($row['id']) ? $row : null;
}

function bacara_bet_insert_ledger($mb_id, $place_key, $table_name, $side, $amount, $source, $round, $shoe)
{
    $table = bacara_wallet_bet_table();
    $mb_esc = sql_real_escape_string($mb_id);
    $key_esc = sql_real_escape_string($place_key);
    $table_esc = sql_real_escape_string(substr($table_name, 0, 80));
    $side_esc = sql_real_escape_string($side);
    $source_esc = sql_real_escape_string($source);
    $shoe_esc = sql_real_escape_string(substr($shoe, 0, 80));
    $amount = (int) $amount;
    $round = (int) $round;
    $now = G5_TIME_YMDHIS;

    return sql_query(
        " insert into `{$table}`
            set mb_id = '{$mb_esc}',
                place_key = '{$key_esc}',
                table_name = '{$table_esc}',
                side = '{$side_esc}',
                amount = '{$amount}',
                source = '{$source_esc}',
                round_no = '{$round}',
                shoe = '{$shoe_esc}',
                status = 'pending',
                placed_at = '{$now}' ",
        false
    );
}

function bacara_bet_resolve_ledger($mb_id, $place_key, $status, $outcome = null)
{
    $table = bacara_wallet_bet_table();
    $mb_esc = sql_real_escape_string($mb_id);
    $key_esc = sql_real_escape_string($place_key);
    $status_esc = $status === 'settled' ? 'settled' : 'cancelled';
    $outcome_sql = $outcome === null
        ? 'NULL'
        : ("'" . sql_real_escape_string($outcome) . "'");
    $now = G5_TIME_YMDHIS;
    return sql_query(
        " update `{$table}`
             set status = '{$status_esc}',
                 outcome = {$outcome_sql},
                 resolved_at = '{$now}'
           where mb_id = '{$mb_esc}'
             and place_key = '{$key_esc}'
             and status = 'pending' ",
        false
    );
}

function bacara_bet_lock_error()
{
    http_response_code(503);
    echo json_encode(array(
        'ok' => false,
        'message' => '동시 베팅 처리 중입니다. 잠시 후 다시 시도해 주세요.',
    ), JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'place') {
    bacara_bet_require_client_key($client_key);
    $place_key = $client_key;
    if ($amount <= 0) {
        http_response_code(400);
        echo json_encode(array('ok' => false, 'message' => '베팅 금액을 입력해 주세요.'), JSON_UNESCAPED_UNICODE);
        exit;
    }
    if (!in_array($side, array('PLAYER', 'BANKER', 'TIE'), true)) {
        http_response_code(400);
        echo json_encode(array('ok' => false, 'message' => '베팅 사이드가 올바르지 않습니다.'), JSON_UNESCAPED_UNICODE);
        exit;
    }

    $label = $table_name !== '' ? $table_name : '테이블';
    $content = $note !== ''
        ? $note
        : ('PLACE|' . $source . '|' . $label . '|' . ($side !== '' ? $side : 'WAIT') . '|' . $amount . '|' . $round . '|' . $shoe);

    $member_lock = bacara_bet_member_lock($mb_id);
    if ($member_lock === '') {
        bacara_bet_lock_error();
    }

    $existing_bet = bacara_bet_find_ledger($mb_id, $place_key);
    if ($existing_bet) {
        $balance = bacara_wallet_get_balance($mb_id);
        bacara_bet_member_unlock($member_lock);
        echo json_encode(array(
            'ok' => true,
            'action' => 'place',
            'amount' => (int) $existing_bet['amount'],
            'balance' => $balance,
            'balance_text' => bacara_wallet_format($balance),
            'idempotent' => true,
            'bet_status' => $existing_bet['status'],
            'message' => '이미 접수된 베팅입니다.',
        ), JSON_UNESCAPED_UNICODE);
        exit;
    }

    $result = bacara_wallet_adjust($mb_id, -$amount, 'bet', $content, $mb_id, $client_key);

    if (empty($result['ok'])) {
        bacara_bet_member_unlock($member_lock);
        http_response_code(400);
        echo json_encode(array(
            'ok' => false,
            'message' => $result['message'],
            'balance' => isset($result['balance']) ? (int) $result['balance'] : bacara_wallet_get_balance($mb_id),
        ), JSON_UNESCAPED_UNICODE);
        exit;
    }

    $ledger_ok = bacara_bet_insert_ledger(
        $mb_id,
        $place_key,
        $table_name,
        $side,
        $amount,
        $source,
        $round,
        $shoe
    );
    if (!$ledger_ok) {
        // 차감 후 원장 기록 실패 시 결정적 키로 즉시 보상한다.
        $refund_key = bacara_wallet_normalize_client_key('rollback_' . $place_key);
        bacara_wallet_adjust(
            $mb_id,
            $amount,
            'bet_cancel',
            'PLACE_ROLLBACK|' . $label . '|' . $amount,
            $mb_id,
            $refund_key
        );
        $balance = bacara_wallet_get_balance($mb_id);
        bacara_bet_member_unlock($member_lock);
        http_response_code(500);
        echo json_encode(array(
            'ok' => false,
            'message' => '베팅 원장 기록에 실패해 차감 금액을 복구했습니다.',
            'balance' => $balance,
        ), JSON_UNESCAPED_UNICODE);
        exit;
    }

    bacara_bet_member_unlock($member_lock);
    echo json_encode(array(
        'ok' => true,
        'action' => 'place',
        'amount' => $amount,
        'balance' => (int) $result['balance'],
        'balance_text' => bacara_wallet_format($result['balance']),
        'idempotent' => !empty($result['idempotent']),
        'place_key' => $place_key,
        'bet_status' => 'pending',
        'message' => !empty($result['idempotent'])
            ? '이미 접수된 베팅입니다.'
            : '베팅금이 차감되었습니다.',
    ), JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'cancel') {
    bacara_bet_require_client_key($client_key);
    if ($place_key === '') {
        http_response_code(400);
        echo json_encode(array('ok' => false, 'message' => '원베팅 식별키가 없습니다.'), JSON_UNESCAPED_UNICODE);
        exit;
    }

    $member_lock = bacara_bet_member_lock($mb_id);
    if ($member_lock === '') {
        bacara_bet_lock_error();
    }
    $ledger = bacara_bet_find_ledger($mb_id, $place_key);
    if (!$ledger) {
        bacara_bet_member_unlock($member_lock);
        http_response_code(404);
        echo json_encode(array('ok' => false, 'message' => '접수된 원베팅을 찾을 수 없습니다.'), JSON_UNESCAPED_UNICODE);
        exit;
    }
    if ($ledger['status'] !== 'pending') {
        $balance = bacara_wallet_get_balance($mb_id);
        bacara_bet_member_unlock($member_lock);
        echo json_encode(array(
            'ok' => true,
            'action' => 'cancel',
            'amount' => (int) $ledger['amount'],
            'balance' => $balance,
            'balance_text' => bacara_wallet_format($balance),
            'idempotent' => true,
            'bet_status' => $ledger['status'],
            'message' => $ledger['status'] === 'settled'
                ? '이미 정산된 베팅이라 취소되지 않았습니다.'
                : '이미 취소 처리된 요청입니다.',
        ), JSON_UNESCAPED_UNICODE);
        exit;
    }

    // 금액/테이블은 클라이언트 입력이 아니라 원장의 확정값만 사용한다.
    $amount = (int) $ledger['amount'];
    $table_name = (string) $ledger['table_name'];
    $source = $ledger['source'] === 'auto' ? 'auto' : 'manual';
    $label = $table_name !== '' ? $table_name : '테이블';
    $content = $note !== '' ? $note : ('CANCEL|' . $source . '|' . $label . '|' . $amount);
    $result = bacara_wallet_adjust($mb_id, $amount, 'bet_cancel', $content, $mb_id, $client_key);

    if (empty($result['ok'])) {
        bacara_bet_member_unlock($member_lock);
        http_response_code(400);
        echo json_encode(array(
            'ok' => false,
            'message' => $result['message'],
            'balance' => isset($result['balance']) ? (int) $result['balance'] : bacara_wallet_get_balance($mb_id),
        ), JSON_UNESCAPED_UNICODE);
        exit;
    }

    bacara_bet_resolve_ledger($mb_id, $place_key, 'cancelled');
    bacara_bet_member_unlock($member_lock);
    echo json_encode(array(
        'ok' => true,
        'action' => 'cancel',
        'amount' => $amount,
        'balance' => (int) $result['balance'],
        'balance_text' => bacara_wallet_format($result['balance']),
        'idempotent' => !empty($result['idempotent']),
        'bet_status' => 'cancelled',
        'message' => !empty($result['idempotent'])
            ? '이미 취소 처리된 요청입니다.'
            : '베팅금이 반환되었습니다.',
    ), JSON_UNESCAPED_UNICODE);
    exit;
}

if ($action === 'settle') {
    bacara_bet_require_client_key($client_key);
    if ($place_key === '') {
        http_response_code(400);
        echo json_encode(array('ok' => false, 'message' => '원베팅 식별키가 없습니다.'), JSON_UNESCAPED_UNICODE);
        exit;
    }
    if (!in_array($outcome, array('P', 'B', 'T'), true)) {
        http_response_code(400);
        echo json_encode(array('ok' => false, 'message' => '결과가 올바르지 않습니다.'), JSON_UNESCAPED_UNICODE);
        exit;
    }

    $member_lock = bacara_bet_member_lock($mb_id);
    if ($member_lock === '') {
        bacara_bet_lock_error();
    }
    $ledger = bacara_bet_find_ledger($mb_id, $place_key);
    if (!$ledger) {
        bacara_bet_member_unlock($member_lock);
        http_response_code(404);
        echo json_encode(array('ok' => false, 'message' => '접수된 원베팅을 찾을 수 없습니다.'), JSON_UNESCAPED_UNICODE);
        exit;
    }
    if ($ledger['status'] !== 'pending') {
        $balance = bacara_wallet_get_balance($mb_id);
        bacara_bet_member_unlock($member_lock);
        echo json_encode(array(
            'ok' => true,
            'action' => 'settle',
            'stake' => (int) $ledger['amount'],
            'balance' => $balance,
            'balance_text' => bacara_wallet_format($balance),
            'idempotent' => true,
            'bet_status' => $ledger['status'],
            'message' => $ledger['status'] === 'cancelled'
                ? '이미 취소된 베팅이라 정산되지 않았습니다.'
                : '이미 정산된 요청입니다.',
        ), JSON_UNESCAPED_UNICODE);
        exit;
    }

    // 사이드·금액·테이블은 원장 값을 사용해 변조 및 탭 간 불일치를 차단한다.
    $amount = (int) $ledger['amount'];
    $side = (string) $ledger['side'];
    $table_name = (string) $ledger['table_name'];
    $source = $ledger['source'] === 'auto' ? 'auto' : 'manual';
    $round = (int) $ledger['round_no'];
    $shoe = (string) $ledger['shoe'];

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
    $result = bacara_wallet_adjust($mb_id, $credit, $kind, $content, $mb_id, $client_key);
    if (empty($result['ok'])) {
        bacara_bet_member_unlock($member_lock);
        http_response_code(500);
        echo json_encode(array(
            'ok' => false,
            'message' => $result['message'],
            'balance' => isset($result['balance']) ? (int) $result['balance'] : bacara_wallet_get_balance($mb_id),
        ), JSON_UNESCAPED_UNICODE);
        exit;
    }

    bacara_bet_resolve_ledger($mb_id, $place_key, 'settled', $outcome);
    bacara_bet_member_unlock($member_lock);
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
        'idempotent' => !empty($result['idempotent']),
        'bet_status' => 'settled',
        'message' => !empty($result['idempotent'])
            ? '이미 정산된 요청입니다.'
            : ($credit > 0
                ? ('정산 입금 ' . number_format($credit) . '원')
                : '패배 — 추가 입금 없음'),
    ), JSON_UNESCAPED_UNICODE);
    exit;
}

http_response_code(400);
echo json_encode(array('ok' => false, 'message' => '잘못된 요청입니다.'), JSON_UNESCAPED_UNICODE);
exit;
