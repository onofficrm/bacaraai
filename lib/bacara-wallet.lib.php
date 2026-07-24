<?php
/**
 * 바카라 AI 도우미 — 가상 게임머니 (시드) 지갑
 * G5 포인트(mb_point)와 분리해 iCRM 과금과 충돌하지 않음
 */
if (!defined('_GNUBOARD_')) {
    exit;
}

if (!function_exists('bacara_wallet_table')) {
    function bacara_wallet_table()
    {
        return G5_TABLE_PREFIX . 'bacara_wallet';
    }
}

if (!function_exists('bacara_wallet_log_table')) {
    function bacara_wallet_log_table()
    {
        return G5_TABLE_PREFIX . 'bacara_wallet_log';
    }
}

if (!function_exists('bacara_wallet_install_tables')) {
    function bacara_wallet_install_tables()
    {
        $wallet = bacara_wallet_table();
        $log = bacara_wallet_log_table();

        sql_query(
            " CREATE TABLE IF NOT EXISTS `{$wallet}` (
                `mb_id` varchar(20) NOT NULL,
                `balance` bigint NOT NULL DEFAULT 0,
                `updated_at` datetime NOT NULL,
                PRIMARY KEY (`mb_id`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 ",
            false
        );

        sql_query(
            " CREATE TABLE IF NOT EXISTS `{$log}` (
                `id` bigint unsigned NOT NULL AUTO_INCREMENT,
                `mb_id` varchar(20) NOT NULL,
                `delta` bigint NOT NULL DEFAULT 0,
                `balance_after` bigint NOT NULL DEFAULT 0,
                `kind` varchar(20) NOT NULL DEFAULT 'grant',
                `content` varchar(255) NOT NULL DEFAULT '',
                `client_key` varchar(64) NULL DEFAULT NULL,
                `admin_mb_id` varchar(20) NOT NULL DEFAULT '',
                `created_at` datetime NOT NULL,
                PRIMARY KEY (`id`),
                KEY `mb_id` (`mb_id`),
                KEY `created_at` (`created_at`),
                UNIQUE KEY `uq_mb_client_key` (`mb_id`, `client_key`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 ",
            false
        );

        // 기존 설치 마이그레이션: client_key + 유니크
        // (SHOW INDEX … WHERE 는 MySQL 버전별 미지원 → 전체 인덱스 스캔)
        $col = sql_fetch(" SHOW COLUMNS FROM `{$log}` LIKE 'client_key' ", false);
        if (empty($col['Field'])) {
            sql_query(
                " ALTER TABLE `{$log}`
                    ADD `client_key` varchar(64) NULL DEFAULT NULL AFTER `content` ",
                false
            );
        }
        $has_idx = false;
        $idx_res = sql_query(" SHOW INDEX FROM `{$log}` ", false);
        if ($idx_res) {
            while ($idx_row = sql_fetch_array($idx_res)) {
                if (!empty($idx_row['Key_name']) && $idx_row['Key_name'] === 'uq_mb_client_key') {
                    $has_idx = true;
                    break;
                }
            }
        }
        if (!$has_idx) {
            sql_query(
                " ALTER TABLE `{$log}`
                    ADD UNIQUE KEY `uq_mb_client_key` (`mb_id`, `client_key`) ",
                false
            );
        }
    }
}

if (!function_exists('bacara_wallet_normalize_client_key')) {
    /**
     * 베팅 idempotency 키 (영문·숫자·_·- 만, 최대 64자)
     */
    function bacara_wallet_normalize_client_key($key)
    {
        $key = substr(preg_replace('/[^a-zA-Z0-9_\-]/', '', (string) $key), 0, 64);
        return $key;
    }
}

if (!function_exists('bacara_wallet_find_log_by_client_key')) {
    /**
     * @return array|null
     */
    function bacara_wallet_find_log_by_client_key($mb_id, $client_key)
    {
        $mb_id = trim((string) $mb_id);
        $client_key = bacara_wallet_normalize_client_key($client_key);
        if ($mb_id === '' || $client_key === '') {
            return null;
        }
        $log = bacara_wallet_log_table();
        $mb_esc = sql_real_escape_string($mb_id);
        $key_esc = sql_real_escape_string($client_key);
        $row = sql_fetch(
            " select id, delta, balance_after, kind, content, created_at
                from `{$log}`
               where mb_id = '{$mb_esc}' and client_key = '{$key_esc}'
               limit 1 ",
            false
        );
        return !empty($row['id']) ? $row : null;
    }
}

if (!function_exists('bacara_wallet_ensure_row')) {
    function bacara_wallet_ensure_row($mb_id)
    {
        $mb_id = trim((string) $mb_id);
        if ($mb_id === '') {
            return false;
        }

        bacara_wallet_install_tables();

        $table = bacara_wallet_table();
        $mb_esc = sql_real_escape_string($mb_id);
        $row = sql_fetch(" select mb_id from `{$table}` where mb_id = '{$mb_esc}' ");
        if (!empty($row['mb_id'])) {
            return true;
        }

        $now = G5_TIME_YMDHIS;
        return sql_query(
            " insert into `{$table}` set mb_id = '{$mb_esc}', balance = 0, updated_at = '{$now}' ",
            false
        );
    }
}

if (!function_exists('bacara_wallet_get_balance')) {
    function bacara_wallet_get_balance($mb_id)
    {
        $mb_id = trim((string) $mb_id);
        if ($mb_id === '') {
            return 0;
        }

        bacara_wallet_ensure_row($mb_id);
        $table = bacara_wallet_table();
        $mb_esc = sql_real_escape_string($mb_id);
        $row = sql_fetch(" select balance from `{$table}` where mb_id = '{$mb_esc}' ");

        return isset($row['balance']) ? (int) $row['balance'] : 0;
    }
}

if (!function_exists('bacara_wallet_adjust')) {
    /**
     * @param string $mb_id
     * @param int    $delta 양수=충전, 음수=차감
     * @param string $kind  grant|set|adjust|session|bet|bet_cancel|bet_win|bet_lose
     * @param string $content
     * @param string $admin_mb_id
     * @param string $client_key 동일 키 재요청 시 잔액 변동 없이 성공 반환 (idempotent)
     * @return array{ok:bool,balance:int,message:string,idempotent?:bool}
     */
    function bacara_wallet_adjust($mb_id, $delta, $kind = 'grant', $content = '', $admin_mb_id = '', $client_key = '')
    {
        global $member;

        $mb_id = trim((string) $mb_id);
        $delta = (int) $delta;
        $kind = preg_replace('/[^a-z_]/', '', (string) $kind);
        if ($kind === '') {
            $kind = 'grant';
        }
        $client_key = bacara_wallet_normalize_client_key($client_key);

        if ($mb_id === '') {
            return array('ok' => false, 'balance' => 0, 'message' => '회원 아이디가 없습니다.');
        }

        if ($admin_mb_id === '' && !empty($member['mb_id'])) {
            $admin_mb_id = $member['mb_id'];
        }

        bacara_wallet_ensure_row($mb_id);

        // 트랜잭션 밖 선조회 (빠른 경로)
        if ($client_key !== '') {
            $existing = bacara_wallet_find_log_by_client_key($mb_id, $client_key);
            if ($existing) {
                return array(
                    'ok' => true,
                    'balance' => bacara_wallet_get_balance($mb_id),
                    'message' => '이미 처리된 요청입니다.',
                    'idempotent' => true,
                );
            }
        }

        $table = bacara_wallet_table();
        $log = bacara_wallet_log_table();
        $mb_esc = sql_real_escape_string($mb_id);
        $admin_esc = sql_real_escape_string($admin_mb_id);
        $kind_esc = sql_real_escape_string($kind);
        $content_esc = sql_real_escape_string(cut_str(strip_tags((string) $content), 200));
        $now = G5_TIME_YMDHIS;
        $client_sql = $client_key === '' ? 'NULL' : ("'" . sql_real_escape_string($client_key) . "'");
        $has_client_col = !empty(sql_fetch(" SHOW COLUMNS FROM `{$log}` LIKE 'client_key' ", false)['Field']);

        $in_tx = (bool) sql_query(' START TRANSACTION ', false);

        $row = $in_tx
            ? sql_fetch(" select balance from `{$table}` where mb_id = '{$mb_esc}' FOR UPDATE ", false)
            : null;
        if (!$row) {
            // FOR UPDATE 실패·미지원 시 일반 조회로 폴백
            if ($in_tx) {
                sql_query(' ROLLBACK ', false);
                $in_tx = false;
            }
            $row = sql_fetch(" select balance from `{$table}` where mb_id = '{$mb_esc}' ", false);
        }
        if (!$row) {
            if ($in_tx) {
                sql_query(' ROLLBACK ', false);
            }
            return array('ok' => false, 'balance' => 0, 'message' => '지갑을 찾을 수 없습니다.');
        }

        if ($client_key !== '' && $has_client_col) {
            $existing = bacara_wallet_find_log_by_client_key($mb_id, $client_key);
            if ($existing) {
                if ($in_tx) {
                    sql_query(' COMMIT ', false);
                }
                return array(
                    'ok' => true,
                    'balance' => (int) $row['balance'],
                    'message' => '이미 처리된 요청입니다.',
                    'idempotent' => true,
                );
            }
        }

        $before = (int) $row['balance'];
        $after = $before + $delta;

        if ($after < 0) {
            if ($in_tx) {
                sql_query(' ROLLBACK ', false);
            }
            return array('ok' => false, 'balance' => $before, 'message' => '잔액이 부족합니다.');
        }

        $ok_upd = sql_query(
            " update `{$table}` set balance = '{$after}', updated_at = '{$now}' where mb_id = '{$mb_esc}' ",
            false
        );

        if ($has_client_col) {
            $ok_ins = sql_query(
                " insert into `{$log}`
                    set mb_id = '{$mb_esc}',
                        delta = '{$delta}',
                        balance_after = '{$after}',
                        kind = '{$kind_esc}',
                        content = '{$content_esc}',
                        client_key = {$client_sql},
                        admin_mb_id = '{$admin_esc}',
                        created_at = '{$now}' ",
                false
            );
        } else {
            $ok_ins = sql_query(
                " insert into `{$log}`
                    set mb_id = '{$mb_esc}',
                        delta = '{$delta}',
                        balance_after = '{$after}',
                        kind = '{$kind_esc}',
                        content = '{$content_esc}',
                        admin_mb_id = '{$admin_esc}',
                        created_at = '{$now}' ",
                false
            );
        }

        if (!$ok_upd || !$ok_ins) {
            if ($in_tx) {
                sql_query(' ROLLBACK ', false);
            }
            // 레이스: 유니크 충돌이면 이미 처리된 요청으로 간주
            if ($client_key !== '' && $has_client_col) {
                $existing = bacara_wallet_find_log_by_client_key($mb_id, $client_key);
                if ($existing) {
                    return array(
                        'ok' => true,
                        'balance' => bacara_wallet_get_balance($mb_id),
                        'message' => '이미 처리된 요청입니다.',
                        'idempotent' => true,
                    );
                }
            }
            return array(
                'ok' => false,
                'balance' => bacara_wallet_get_balance($mb_id),
                'message' => '잔액 처리에 실패했습니다.',
            );
        }

        if ($in_tx) {
            sql_query(' COMMIT ', false);
        }

        return array('ok' => true, 'balance' => $after, 'message' => '처리되었습니다.', 'idempotent' => false);
    }
}

if (!function_exists('bacara_wallet_set_balance')) {
    function bacara_wallet_set_balance($mb_id, $amount, $content = '', $admin_mb_id = '')
    {
        $amount = max(0, (int) $amount);
        $current = bacara_wallet_get_balance($mb_id);
        $delta = $amount - $current;

        return bacara_wallet_adjust($mb_id, $delta, 'set', $content !== '' ? $content : '잔액 직접 설정', $admin_mb_id);
    }
}

if (!function_exists('bacara_wallet_format')) {
    function bacara_wallet_format($amount)
    {
        return number_format((int) $amount) . '원';
    }
}

if (!function_exists('bacara_wallet_create_member')) {
    /**
     * 최고관리자 전용 — 공개 가입 없이 회원 생성
     *
     * @return array{ok:bool,mb_id:string,message:string}
     */
    function bacara_wallet_create_member($mb_id, $password, $mb_name = '', $mb_nick = '', $mb_email = '', $mb_level = 2)
    {
        global $g5, $config;

        include_once G5_LIB_PATH . '/register.lib.php';

        $mb_id = strtolower(trim((string) $mb_id));
        $password = trim((string) $password);
        $mb_name = trim((string) $mb_name);
        $mb_nick = trim((string) $mb_nick);
        $mb_email = trim((string) $mb_email);
        $mb_level = (int) $mb_level;
        if ($mb_level < 1) {
            $mb_level = 2;
        }
        if ($mb_level > 10) {
            $mb_level = 10;
        }

        if ($msg = empty_mb_id($mb_id)) {
            return array('ok' => false, 'mb_id' => '', 'message' => $msg);
        }
        if ($msg = valid_mb_id($mb_id)) {
            return array('ok' => false, 'mb_id' => '', 'message' => $msg);
        }
        if ($msg = count_mb_id($mb_id)) {
            return array('ok' => false, 'mb_id' => '', 'message' => $msg);
        }
        if ($msg = exist_mb_id($mb_id)) {
            return array('ok' => false, 'mb_id' => '', 'message' => $msg);
        }
        if ($msg = reserve_mb_id($mb_id)) {
            return array('ok' => false, 'mb_id' => '', 'message' => $msg);
        }
        if ($password === '' || strlen($password) < 4) {
            return array('ok' => false, 'mb_id' => '', 'message' => '비밀번호는 4자 이상 입력해 주세요.');
        }

        if ($mb_name === '') {
            $mb_name = $mb_id;
        }
        if ($mb_nick === '') {
            $mb_nick = $mb_id;
        }
        if ($msg = valid_mb_nick($mb_nick)) {
            return array('ok' => false, 'mb_id' => '', 'message' => $msg);
        }
        if ($msg = exist_mb_nick($mb_nick, '')) {
            return array('ok' => false, 'mb_id' => '', 'message' => $msg);
        }

        if ($mb_email === '') {
            $mb_email = $mb_id . '@bacara.local';
        }
        if (!preg_match('/^[^\s@]+@[^\s@]+\.[^\s@]+$/', $mb_email)) {
            return array('ok' => false, 'mb_id' => '', 'message' => '이메일 형식이 올바르지 않습니다.');
        }
        if ($msg = exist_mb_email($mb_email, '')) {
            // generate unique fallback
            $mb_email = $mb_id . '+' . substr(md5(uniqid('', true)), 0, 6) . '@bacara.local';
        }

        $mb_id_esc = sql_real_escape_string($mb_id);
        $mb_name_esc = sql_real_escape_string($mb_name);
        $mb_nick_esc = sql_real_escape_string($mb_nick);
        $mb_email_esc = sql_real_escape_string($mb_email);
        $password_hash = get_encrypt_string($password);
        $now = G5_TIME_YMDHIS;
        $ip = isset($_SERVER['REMOTE_ADDR']) ? sql_real_escape_string($_SERVER['REMOTE_ADDR']) : '';

        $sql = " insert into {$g5['member_table']}
                    set mb_id = '{$mb_id_esc}',
                        mb_password = '{$password_hash}',
                        mb_name = '{$mb_name_esc}',
                        mb_nick = '{$mb_nick_esc}',
                        mb_nick_date = '" . G5_TIME_YMD . "',
                        mb_email = '{$mb_email_esc}',
                        mb_homepage = '',
                        mb_level = '{$mb_level}',
                        mb_sex = '',
                        mb_birth = '',
                        mb_tel = '',
                        mb_hp = '',
                        mb_certify = '',
                        mb_adult = '0',
                        mb_dupinfo = '',
                        mb_zip1 = '',
                        mb_zip2 = '',
                        mb_addr1 = '',
                        mb_addr2 = '',
                        mb_addr3 = '',
                        mb_addr_jibeon = '',
                        mb_signature = '',
                        mb_recommend = '',
                        mb_point = '0',
                        mb_today_login = '{$now}',
                        mb_login_ip = '{$ip}',
                        mb_datetime = '{$now}',
                        mb_ip = '{$ip}',
                        mb_leave_date = '',
                        mb_intercept_date = '',
                        mb_email_certify = '{$now}',
                        mb_email_certify2 = '',
                        mb_memo = '',
                        mb_lost_certify = '',
                        mb_mailling = '0',
                        mb_sms = '0',
                        mb_open = '1',
                        mb_open_date = '" . G5_TIME_YMD . "',
                        mb_profile = '',
                        mb_memo_call = '',
                        mb_memo_cnt = '0',
                        mb_scrap_cnt = '0',
                        mb_marketing_agree = '0',
                        mb_thirdparty_agree = '0',
                        mb_agree_log = '',
                        mb_1 = '',
                        mb_2 = '',
                        mb_3 = '',
                        mb_4 = '',
                        mb_5 = '',
                        mb_6 = '',
                        mb_7 = '',
                        mb_8 = '',
                        mb_9 = '',
                        mb_10 = '' ";

        $ok = sql_query($sql, false);
        if (!$ok) {
            return array('ok' => false, 'mb_id' => '', 'message' => '회원 생성에 실패했습니다. DB를 확인해 주세요.');
        }

        bacara_wallet_ensure_row($mb_id);

        return array('ok' => true, 'mb_id' => $mb_id, 'message' => '회원이 생성되었습니다.');
    }
}
