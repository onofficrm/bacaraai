<?php
/**
 * 바카라 운영 안정성 — 자동 정산 워커 · 회차 고정 · 대사 · 감지기 헬스
 */
if (!defined('_GNUBOARD_')) {
    exit;
}

include_once G5_LIB_PATH . '/bacara-wallet.lib.php';
include_once G5_LIB_PATH . '/bacara-ai-analyze.lib.php';

/** 결과 대기 후 자동 환불 (초) — 클라이언트 LIVE_CANCEL_MS(180s)와 맞춤 */
if (!defined('BACARA_OPS_PENDING_TIMEOUT_SEC')) {
    define('BACARA_OPS_PENDING_TIMEOUT_SEC', 180);
}

/** 감지 공백이 이 초를 넘으면 신규 베팅 차단 */
if (!defined('BACARA_OPS_DETECTOR_STALE_SEC')) {
    define('BACARA_OPS_DETECTOR_STALE_SEC', 90);
}

if (!function_exists('bacara_ops_config_path')) {
    function bacara_ops_config_path()
    {
        return G5_DATA_PATH . '/bacaraai-ops.config.php';
    }
}

if (!function_exists('bacara_ops_config_load')) {
    /**
     * @return array{worker_token:string}
     */
    function bacara_ops_config_load($reload = false)
    {
        static $cfg = null;
        if ($reload) {
            $cfg = null;
        }
        if ($cfg !== null) {
            return $cfg;
        }
        $cfg = array('worker_token' => '');
        $path = bacara_ops_config_path();
        if (!is_file($path)) {
            return $cfg;
        }
        include $path;
        if (isset($bacara_ops_config) && is_array($bacara_ops_config)) {
            if (!empty($bacara_ops_config['worker_token'])) {
                $cfg['worker_token'] = preg_replace('/[^a-zA-Z0-9_-]/', '', (string) $bacara_ops_config['worker_token']);
            }
        }
        return $cfg;
    }
}

if (!function_exists('bacara_ops_config_save')) {
    /**
     * @param array{worker_token?:string} $data
     */
    function bacara_ops_config_save(array $data)
    {
        $current = bacara_ops_config_load();
        if (isset($data['worker_token'])) {
            $current['worker_token'] = preg_replace('/[^a-zA-Z0-9_-]/', '', (string) $data['worker_token']);
        }
        $path = bacara_ops_config_path();
        $export = var_export($current, true);
        $php = "<?php\nif (!defined('_GNUBOARD_')) exit;\n\$bacara_ops_config = {$export};\n";
        $ok = @file_put_contents($path, $php) !== false;
        if ($ok) {
            bacara_ops_config_load(true);
        }
        return $ok;
    }
}

if (!function_exists('bacara_ops_verify_worker_token')) {
    function bacara_ops_verify_worker_token($token)
    {
        $token = preg_replace('/[^a-zA-Z0-9_-]/', '', (string) $token);
        if ($token === '') {
            return false;
        }
        $cfg = bacara_ops_config_load();
        $expected = isset($cfg['worker_token']) ? (string) $cfg['worker_token'] : '';
        if ($expected === '' || strlen($expected) < 16) {
            return false;
        }
        return hash_equals($expected, $token);
    }
}

if (!function_exists('bacara_ops_normalize_table_code')) {
    function bacara_ops_normalize_table_code($table_name)
    {
        $table_name = strtoupper(trim((string) $table_name));
        if (preg_match('/\(([A-Z0-9_-]+)\)/', $table_name, $m)) {
            return strtoupper($m[1]);
        }
        if (preg_match('/^(MD[0-9A-Z_-]+)/', $table_name, $m)) {
            return strtoupper($m[1]);
        }
        return $table_name;
    }
}

if (!function_exists('bacara_ops_settle_credit')) {
    function bacara_ops_settle_credit($side, $amount, $outcome)
    {
        $amount = (int) $amount;
        $side = strtoupper((string) $side);
        $outcome = strtoupper((string) $outcome);

        if ($side === 'TIE') {
            return $outcome === 'T' ? ($amount + ($amount * 8)) : 0;
        }
        if ($outcome === 'T') {
            return $amount;
        }
        $hit = ($side === 'PLAYER' && $outcome === 'P') || ($side === 'BANKER' && $outcome === 'B');
        if (!$hit) {
            return 0;
        }
        if ($side === 'BANKER') {
            return $amount + (int) floor($amount * 0.95);
        }
        return $amount + $amount;
    }
}

if (!function_exists('bacara_ops_net_pnl')) {
    function bacara_ops_net_pnl($side, $amount, $outcome)
    {
        return bacara_ops_settle_credit($side, $amount, $outcome) - (int) $amount;
    }
}

if (!function_exists('bacara_ops_member_lock')) {
    function bacara_ops_member_lock($mb_id)
    {
        $name = 'bacara_bet_' . substr(sha1((string) $mb_id), 0, 32);
        $safe = sql_real_escape_string($name);
        $row = sql_fetch(" select GET_LOCK('{$safe}', 5) as acquired ", false);
        return !empty($row) && isset($row['acquired']) && (int) $row['acquired'] === 1
            ? $name
            : '';
    }
}

if (!function_exists('bacara_ops_member_unlock')) {
    function bacara_ops_member_unlock($name)
    {
        if ($name === '') {
            return;
        }
        $safe = sql_real_escape_string($name);
        sql_fetch(" select RELEASE_LOCK('{$safe}') as released ", false);
    }
}

if (!function_exists('bacara_ops_fetch_next_result')) {
    /**
     * 베팅 이후 첫 라이브 결과 (회차 고정: baseline_result_id 다음 id)
     *
     * @return array{ok:bool,outcome:?string,id:?int,game_no:?int,message:string}
     */
    function bacara_ops_fetch_next_result($table_name, $baseline_result_id = 0, $placed_at = '', $round_no = 0)
    {
        $table_name = bacara_ops_normalize_table_code($table_name);
        if ($table_name === '' || !preg_match('/^[A-Z0-9_-]{1,40}$/', $table_name)) {
            return array(
                'ok' => false,
                'outcome' => null,
                'id' => null,
                'game_no' => null,
                'message' => '테이블 코드가 올바르지 않습니다.',
            );
        }

        $conn = bacara_ai_live_connect();
        if (empty($conn['ok'])) {
            return array(
                'ok' => false,
                'outcome' => null,
                'id' => null,
                'game_no' => null,
                'message' => !empty($conn['error']) ? $conn['error'] : '실시간 DB 연결 실패',
            );
        }

        $use_live = !empty($conn['use_live']);
        $link = $conn['link'];
        $cfg = isset($conn['cfg']) && is_array($conn['cfg']) ? $conn['cfg'] : array();
        $safe_table = bacara_ai_live_escape($table_name, $use_live, $link);
        $baseline_result_id = max(0, (int) $baseline_result_id);
        $round_no = max(0, (int) $round_no);
        $placed_at = trim((string) $placed_at);

        $account_clause = '1=1';
        if (!empty($cfg['account'])) {
            $safe_account = bacara_ai_live_escape((string) $cfg['account'], $use_live, $link);
            $account_clause = "account = '{$safe_account}'";
        }

        if ($baseline_result_id > 0) {
            $sql = " select id, game_no, result, detected_at
                       from `bacaraai`
                      where {$account_clause}
                        and table_name = '{$safe_table}'
                        and result in ('P', 'B', 'T')
                        and id > {$baseline_result_id}
                      order by id asc
                      limit 1 ";
        } else {
            $placed_sql = $placed_at !== ''
                ? ("'" . bacara_ai_live_escape($placed_at, $use_live, $link) . "'")
                : 'NULL';
            $sql = " select id, game_no, result, detected_at
                       from `bacaraai`
                      where {$account_clause}
                        and table_name = '{$safe_table}'
                        and result in ('P', 'B', 'T')
                        and (
                              (" . ($placed_sql === 'NULL' ? '0' : "detected_at >= {$placed_sql}") . ")
                           or (" . ($round_no > 0 ? "game_no > {$round_no}" : '0') . ")
                        )
                      order by id asc
                      limit 1 ";
        }

        $error = '';
        $rows = bacara_ai_live_query_rows($sql, $use_live, $link, $error);
        // 설정 account 스트림에 없으면 테이블 전체에서 회차 고정 조회 (계정 불일치 시 미정산 방지)
        if ($error === '' && !$rows && $account_clause !== '1=1') {
            if ($baseline_result_id > 0) {
                $sql = " select id, game_no, result, detected_at
                           from `bacaraai`
                          where table_name = '{$safe_table}'
                            and result in ('P', 'B', 'T')
                            and id > {$baseline_result_id}
                          order by id asc
                          limit 1 ";
            } else {
                $placed_sql = $placed_at !== ''
                    ? ("'" . bacara_ai_live_escape($placed_at, $use_live, $link) . "'")
                    : 'NULL';
                $sql = " select id, game_no, result, detected_at
                           from `bacaraai`
                          where table_name = '{$safe_table}'
                            and result in ('P', 'B', 'T')
                            and (
                                  (" . ($placed_sql === 'NULL' ? '0' : "detected_at >= {$placed_sql}") . ")
                               or (" . ($round_no > 0 ? "game_no > {$round_no}" : '0') . ")
                            )
                          order by id asc
                          limit 1 ";
            }
            $rows = bacara_ai_live_query_rows($sql, $use_live, $link, $error);
        }
        if ($error !== '') {
            return array(
                'ok' => false,
                'outcome' => null,
                'id' => null,
                'game_no' => null,
                'message' => '실시간 결과 조회 실패',
            );
        }
        if (!$rows) {
            return array(
                'ok' => false,
                'outcome' => null,
                'id' => null,
                'game_no' => null,
                'message' => '아직 정산할 라이브 결과가 없습니다.',
            );
        }

        $row = $rows[0];
        $outcome = strtoupper((string) $row['result']);
        if (!in_array($outcome, array('P', 'B', 'T'), true)) {
            return array(
                'ok' => false,
                'outcome' => null,
                'id' => null,
                'game_no' => null,
                'message' => '라이브 결과 값이 올바르지 않습니다.',
            );
        }

        return array(
            'ok' => true,
            'outcome' => $outcome,
            'id' => isset($row['id']) ? (int) $row['id'] : null,
            'game_no' => isset($row['game_no']) ? (int) $row['game_no'] : null,
            'message' => '',
        );
    }
}

if (!function_exists('bacara_ops_settle_ledger_row')) {
    /**
     * pending 원장 1건을 서버 권위로 정산
     *
     * @return array{ok:bool,action:string,message:string,balance?:int,outcome?:string}
     */
    function bacara_ops_settle_ledger_row(array $ledger)
    {
        bacara_wallet_install_tables();
        $mb_id = (string) $ledger['mb_id'];
        $place_key = (string) $ledger['place_key'];
        if ($mb_id === '' || $place_key === '') {
            return array('ok' => false, 'action' => 'settle', 'message' => '원장 키가 없습니다.');
        }

        $lock = bacara_ops_member_lock($mb_id);
        if ($lock === '') {
            return array('ok' => false, 'action' => 'settle', 'message' => '회원 잠금 실패');
        }

        $table = bacara_wallet_bet_table();
        $mb_esc = sql_real_escape_string($mb_id);
        $key_esc = sql_real_escape_string($place_key);
        $fresh = sql_fetch(
            " select * from `{$table}`
               where mb_id = '{$mb_esc}' and place_key = '{$key_esc}'
               limit 1 ",
            false
        );
        if (empty($fresh['id'])) {
            bacara_ops_member_unlock($lock);
            return array('ok' => false, 'action' => 'settle', 'message' => '원장을 찾을 수 없습니다.');
        }
        if ($fresh['status'] !== 'pending') {
            bacara_ops_member_unlock($lock);
            return array(
                'ok' => true,
                'action' => 'settle',
                'message' => '이미 처리됨',
                'balance' => bacara_wallet_get_balance($mb_id),
                'outcome' => isset($fresh['outcome']) ? (string) $fresh['outcome'] : null,
            );
        }

        $baseline = isset($fresh['baseline_result_id']) ? (int) $fresh['baseline_result_id'] : 0;
        $live = bacara_ops_fetch_next_result(
            $fresh['table_name'],
            $baseline,
            isset($fresh['placed_at']) ? (string) $fresh['placed_at'] : '',
            isset($fresh['round_no']) ? (int) $fresh['round_no'] : 0
        );
        if (empty($live['ok']) || empty($live['outcome'])) {
            bacara_ops_member_unlock($lock);
            return array(
                'ok' => false,
                'action' => 'settle',
                'message' => $live['message'] !== '' ? $live['message'] : '결과 대기',
            );
        }

        $amount = (int) $fresh['amount'];
        $side = (string) $fresh['side'];
        $source = $fresh['source'] === 'auto' ? 'auto' : 'manual';
        $outcome = (string) $live['outcome'];
        $credit = bacara_ops_settle_credit($side, $amount, $outcome);
        $pnl = bacara_ops_net_pnl($side, $amount, $outcome);
        $label = (string) $fresh['table_name'];
        $round = (int) $fresh['round_no'];
        $shoe = (string) $fresh['shoe'];
        $kind = $credit > 0 ? 'bet_win' : 'bet_lose';
        $content = 'SETTLE|' . $source . '|' . $label . '|' . $side . '|' . $outcome . '|'
            . $amount . '|' . $pnl . '|' . $round . '|' . $shoe . '|worker';
        $settle_key = bacara_wallet_normalize_client_key('s_' . $place_key);

        $adj = bacara_wallet_adjust($mb_id, $credit, $kind, $content, 'ops_worker', $settle_key);
        if (empty($adj['ok'])) {
            bacara_ops_member_unlock($lock);
            return array(
                'ok' => false,
                'action' => 'settle',
                'message' => $adj['message'],
                'balance' => isset($adj['balance']) ? (int) $adj['balance'] : bacara_wallet_get_balance($mb_id),
            );
        }

        $outcome_esc = sql_real_escape_string($outcome);
        $now = G5_TIME_YMDHIS;
        sql_query(
            " update `{$table}`
                 set status = 'settled',
                     outcome = '{$outcome_esc}',
                     resolved_at = '{$now}'
               where mb_id = '{$mb_esc}'
                 and place_key = '{$key_esc}'
                 and status = 'pending' ",
            false
        );
        bacara_ops_member_unlock($lock);

        return array(
            'ok' => true,
            'action' => 'settle',
            'message' => !empty($adj['idempotent']) ? '이미 정산됨' : '정산 완료',
            'balance' => (int) $adj['balance'],
            'outcome' => $outcome,
        );
    }
}

if (!function_exists('bacara_ops_cancel_ledger_row')) {
    /**
     * @return array{ok:bool,action:string,message:string,balance?:int}
     */
    function bacara_ops_cancel_ledger_row(array $ledger, $reason = 'timeout')
    {
        bacara_wallet_install_tables();
        $mb_id = (string) $ledger['mb_id'];
        $place_key = (string) $ledger['place_key'];
        $lock = bacara_ops_member_lock($mb_id);
        if ($lock === '') {
            return array('ok' => false, 'action' => 'cancel', 'message' => '회원 잠금 실패');
        }

        $table = bacara_wallet_bet_table();
        $mb_esc = sql_real_escape_string($mb_id);
        $key_esc = sql_real_escape_string($place_key);
        $fresh = sql_fetch(
            " select * from `{$table}`
               where mb_id = '{$mb_esc}' and place_key = '{$key_esc}'
               limit 1 ",
            false
        );
        if (empty($fresh['id'])) {
            bacara_ops_member_unlock($lock);
            return array('ok' => false, 'action' => 'cancel', 'message' => '원장 없음');
        }
        if ($fresh['status'] !== 'pending') {
            bacara_ops_member_unlock($lock);
            return array(
                'ok' => true,
                'action' => 'cancel',
                'message' => '이미 처리됨',
                'balance' => bacara_wallet_get_balance($mb_id),
            );
        }

        $amount = (int) $fresh['amount'];
        $source = $fresh['source'] === 'auto' ? 'auto' : 'manual';
        $label = (string) $fresh['table_name'];
        $content = 'CANCEL|' . $source . '|' . $label . '|' . $amount . '|worker|' . $reason;
        $cancel_key = bacara_wallet_normalize_client_key('c_' . $place_key);
        $adj = bacara_wallet_adjust($mb_id, $amount, 'bet_cancel', $content, 'ops_worker', $cancel_key);
        if (empty($adj['ok'])) {
            bacara_ops_member_unlock($lock);
            return array(
                'ok' => false,
                'action' => 'cancel',
                'message' => $adj['message'],
                'balance' => isset($adj['balance']) ? (int) $adj['balance'] : bacara_wallet_get_balance($mb_id),
            );
        }

        $now = G5_TIME_YMDHIS;
        sql_query(
            " update `{$table}`
                 set status = 'cancelled',
                     resolved_at = '{$now}'
               where mb_id = '{$mb_esc}'
                 and place_key = '{$key_esc}'
                 and status = 'pending' ",
            false
        );
        bacara_ops_member_unlock($lock);

        return array(
            'ok' => true,
            'action' => 'cancel',
            'message' => !empty($adj['idempotent']) ? '이미 취소됨' : '자동 환불',
            'balance' => (int) $adj['balance'],
        );
    }
}

if (!function_exists('bacara_ops_run_worker')) {
    /**
     * pending 원장을 순회해 정산 또는 타임아웃 환불
     *
     * @return array{ok:bool,settled:int,cancelled:int,skipped:int,errors:array,items:array}
     */
    function bacara_ops_run_worker($limit = 50)
    {
        bacara_wallet_install_tables();
        $limit = max(1, min(200, (int) $limit));
        $table = bacara_wallet_bet_table();
        $timeout = (int) BACARA_OPS_PENDING_TIMEOUT_SEC;

        $q = sql_query(
            " select *
                from `{$table}`
               where status = 'pending'
               order by id asc
               limit {$limit} ",
            false
        );

        $settled = 0;
        $cancelled = 0;
        $skipped = 0;
        $errors = array();
        $items = array();

        while ($row = sql_fetch_array($q)) {
            $placed_ts = !empty($row['placed_at']) ? strtotime($row['placed_at']) : 0;
            $age = $placed_ts > 0 ? (time() - $placed_ts) : 0;

            $live = bacara_ops_fetch_next_result(
                $row['table_name'],
                isset($row['baseline_result_id']) ? (int) $row['baseline_result_id'] : 0,
                isset($row['placed_at']) ? (string) $row['placed_at'] : '',
                isset($row['round_no']) ? (int) $row['round_no'] : 0
            );

            if (!empty($live['ok']) && !empty($live['outcome'])) {
                $res = bacara_ops_settle_ledger_row($row);
                if (!empty($res['ok'])) {
                    $settled += 1;
                    $items[] = array(
                        'place_key' => $row['place_key'],
                        'mb_id' => $row['mb_id'],
                        'action' => 'settle',
                        'outcome' => isset($res['outcome']) ? $res['outcome'] : null,
                    );
                } else {
                    $errors[] = $row['place_key'] . ': ' . $res['message'];
                }
                continue;
            }

            if ($age >= $timeout) {
                $res = bacara_ops_cancel_ledger_row($row, 'timeout');
                if (!empty($res['ok'])) {
                    $cancelled += 1;
                    $items[] = array(
                        'place_key' => $row['place_key'],
                        'mb_id' => $row['mb_id'],
                        'action' => 'cancel',
                        'reason' => 'timeout',
                    );
                } else {
                    $errors[] = $row['place_key'] . ': ' . $res['message'];
                }
                continue;
            }

            $skipped += 1;
        }

        return array(
            'ok' => count($errors) === 0,
            'settled' => $settled,
            'cancelled' => $cancelled,
            'skipped' => $skipped,
            'errors' => $errors,
            'items' => $items,
        );
    }
}

if (!function_exists('bacara_ops_detector_health')) {
    /**
     * @return array{ok:bool,stale:bool,allowed:bool,table:string,last_detected_at:?string,age_sec:?int,message:string}
     */
    function bacara_ops_detector_health($table_name = 'MD2729')
    {
        $table_name = bacara_ops_normalize_table_code($table_name);
        $conn = bacara_ai_live_connect();
        if (empty($conn['ok'])) {
            return array(
                'ok' => false,
                'stale' => true,
                'allowed' => false,
                'table' => $table_name,
                'last_detected_at' => null,
                'age_sec' => null,
                'message' => !empty($conn['error']) ? $conn['error'] : '실시간 DB 연결 실패',
            );
        }

        $use_live = !empty($conn['use_live']);
        $link = $conn['link'];
        $cfg = isset($conn['cfg']) && is_array($conn['cfg']) ? $conn['cfg'] : array();
        $safe_table = bacara_ai_live_escape($table_name, $use_live, $link);
        $account_clause = '1=1';
        if (!empty($cfg['account'])) {
            $safe_account = bacara_ai_live_escape((string) $cfg['account'], $use_live, $link);
            $account_clause = "account = '{$safe_account}'";
        }

        $sql = " select id, result, detected_at, game_no
                   from `bacaraai`
                  where {$account_clause}
                    and table_name = '{$safe_table}'
                    and result in ('P', 'B', 'T')
                  order by id desc
                  limit 1 ";
        $error = '';
        $rows = bacara_ai_live_query_rows($sql, $use_live, $link, $error);
        if (($error !== '' || !$rows) && $account_clause !== '1=1') {
            $sql = " select id, result, detected_at, game_no
                       from `bacaraai`
                      where table_name = '{$safe_table}'
                        and result in ('P', 'B', 'T')
                      order by id desc
                      limit 1 ";
            $rows = bacara_ai_live_query_rows($sql, $use_live, $link, $error);
        }
        if ($error !== '' || !$rows) {
            return array(
                'ok' => false,
                'stale' => true,
                'allowed' => false,
                'table' => $table_name,
                'last_detected_at' => null,
                'age_sec' => null,
                'message' => $error !== '' ? $error : '감지 결과가 없습니다.',
            );
        }

        $last = $rows[0];
        $detected = isset($last['detected_at']) ? (string) $last['detected_at'] : '';
        $ts = $detected !== '' ? strtotime($detected) : 0;
        $age = $ts > 0 ? max(0, time() - $ts) : null;
        $stale = $age === null || $age > (int) BACARA_OPS_DETECTOR_STALE_SEC;

        return array(
            'ok' => true,
            'stale' => $stale,
            'allowed' => !$stale,
            'table' => $table_name,
            'last_detected_at' => $detected !== '' ? $detected : null,
            'last_result' => isset($last['result']) ? (string) $last['result'] : null,
            'last_id' => isset($last['id']) ? (int) $last['id'] : null,
            'game_no' => isset($last['game_no']) ? (int) $last['game_no'] : null,
            'age_sec' => $age,
            'stale_threshold_sec' => (int) BACARA_OPS_DETECTOR_STALE_SEC,
            'message' => $stale
                ? ('감지 공백 ' . ($age === null ? '?' : $age) . '초 — 신규 베팅 차단')
                : '감지 정상',
        );
    }
}

if (!function_exists('bacara_ops_betting_allowed')) {
    function bacara_ops_betting_allowed($table_name = 'MD2729')
    {
        $health = bacara_ops_detector_health($table_name);
        return !empty($health['allowed']);
    }
}

if (!function_exists('bacara_ops_reconcile')) {
    /**
     * 지갑 로그 ↔ 원장 불일치 탐지
     *
     * @return array{ok:bool,issues:array,counts:array}
     */
    function bacara_ops_reconcile($hours = 24)
    {
        bacara_wallet_install_tables();
        $hours = max(1, min(168, (int) $hours));
        $bet = bacara_wallet_bet_table();
        $log = bacara_wallet_log_table();
        $issues = array();

        // 1) 오래된 pending
        $timeout = (int) BACARA_OPS_PENDING_TIMEOUT_SEC;
        $q = sql_query(
            " select mb_id, place_key, table_name, amount, placed_at,
                     timestampdiff(second, placed_at, now()) as age_sec
                from `{$bet}`
               where status = 'pending'
                 and placed_at < date_sub(now(), interval {$timeout} second)
               order by id asc
               limit 100 ",
            false
        );
        while ($row = sql_fetch_array($q)) {
            $issues[] = array(
                'type' => 'stale_pending',
                'severity' => 'high',
                'mb_id' => $row['mb_id'],
                'place_key' => $row['place_key'],
                'amount' => (int) $row['amount'],
                'message' => '대기 초과 pending (' . (int) $row['age_sec'] . '초)',
            );
        }

        // 2) PLACE 로그는 있는데 원장이 없는 경우 (최근)
        $q = sql_query(
            " select l.id, l.mb_id, l.client_key, l.delta, l.content, l.created_at
                from `{$log}` l
               where l.kind = 'bet'
                 and l.created_at >= date_sub(now(), interval {$hours} hour)
                 and l.client_key is not null
                 and l.client_key <> ''
                 and not exists (
                      select 1 from `{$bet}` b
                       where b.mb_id = l.mb_id
                         and b.place_key = l.client_key
                 )
               order by l.id desc
               limit 100 ",
            false
        );
        while ($row = sql_fetch_array($q)) {
            $issues[] = array(
                'type' => 'place_without_ledger',
                'severity' => 'critical',
                'mb_id' => $row['mb_id'],
                'place_key' => $row['client_key'],
                'amount' => abs((int) $row['delta']),
                'message' => '차감 로그는 있으나 원장 없음',
                'log_id' => (int) $row['id'],
            );
        }

        // 3) pending 인데 settle/cancel 로그가 이미 있는 경우 (상태 불일치)
        $q = sql_query(
            " select b.mb_id, b.place_key, b.amount, b.status, b.placed_at
                from `{$bet}` b
               where b.status = 'pending'
                 and exists (
                      select 1 from `{$log}` l
                       where l.mb_id = b.mb_id
                         and (
                              l.client_key = concat('s_', b.place_key)
                           or l.client_key = concat('c_', b.place_key)
                         )
                 )
               order by b.id asc
               limit 100 ",
            false
        );
        while ($row = sql_fetch_array($q)) {
            $issues[] = array(
                'type' => 'pending_already_resolved_log',
                'severity' => 'critical',
                'mb_id' => $row['mb_id'],
                'place_key' => $row['place_key'],
                'amount' => (int) $row['amount'],
                'message' => '원장은 pending인데 정산/취소 로그 존재',
            );
        }

        $counts = array(
            'stale_pending' => 0,
            'place_without_ledger' => 0,
            'pending_already_resolved_log' => 0,
            'critical' => 0,
            'high' => 0,
        );
        foreach ($issues as $issue) {
            if (isset($counts[$issue['type']])) {
                $counts[$issue['type']] += 1;
            }
            if ($issue['severity'] === 'critical') {
                $counts['critical'] += 1;
            }
            if ($issue['severity'] === 'high') {
                $counts['high'] += 1;
            }
        }

        return array(
            'ok' => $counts['critical'] === 0,
            'issues' => $issues,
            'counts' => $counts,
            'hours' => $hours,
        );
    }
}

if (!function_exists('bacara_ops_status')) {
    /**
     * 운영 대시보드용 요약
     */
    function bacara_ops_status()
    {
        bacara_wallet_install_tables();
        $bet = bacara_wallet_bet_table();
        $log = bacara_wallet_log_table();

        $pending = sql_fetch(
            " select count(*) as cnt, coalesce(sum(amount),0) as stake
                from `{$bet}` where status = 'pending' ",
            false
        );
        $today = sql_fetch(
            " select
                 sum(status = 'settled') as settled,
                 sum(status = 'cancelled') as cancelled,
                 sum(status = 'pending') as pending
                from `{$bet}`
               where placed_at >= curdate() ",
            false
        );
        $wallet_users = sql_fetch(
            " select count(*) as cnt from `" . bacara_wallet_table() . "` where balance > 0 ",
            false
        );
        $recent_err = sql_fetch(
            " select count(*) as cnt
                from `{$log}`
               where created_at >= date_sub(now(), interval 1 hour)
                 and kind in ('bet', 'bet_win', 'bet_lose', 'bet_cancel') ",
            false
        );

        $health = bacara_ops_detector_health('MD2729');
        $recon = bacara_ops_reconcile(24);

        return array(
            'ok' => !empty($health['allowed']) && empty($recon['counts']['critical']),
            'pending_count' => isset($pending['cnt']) ? (int) $pending['cnt'] : 0,
            'pending_stake' => isset($pending['stake']) ? (int) $pending['stake'] : 0,
            'today_settled' => isset($today['settled']) ? (int) $today['settled'] : 0,
            'today_cancelled' => isset($today['cancelled']) ? (int) $today['cancelled'] : 0,
            'active_wallets' => isset($wallet_users['cnt']) ? (int) $wallet_users['cnt'] : 0,
            'hour_bet_logs' => isset($recent_err['cnt']) ? (int) $recent_err['cnt'] : 0,
            'detector' => $health,
            'reconcile' => array(
                'ok' => $recon['ok'],
                'counts' => $recon['counts'],
                'issue_count' => count($recon['issues']),
            ),
            'timeout_sec' => (int) BACARA_OPS_PENDING_TIMEOUT_SEC,
            'generated_at' => G5_TIME_YMDHIS,
        );
    }
}
