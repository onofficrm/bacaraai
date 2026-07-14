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
                `admin_mb_id` varchar(20) NOT NULL DEFAULT '',
                `created_at` datetime NOT NULL,
                PRIMARY KEY (`id`),
                KEY `mb_id` (`mb_id`),
                KEY `created_at` (`created_at`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 ",
            false
        );
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
     * @param string $kind  grant|set|adjust|session
     * @param string $content
     * @param string $admin_mb_id
     * @return array{ok:bool,balance:int,message:string}
     */
    function bacara_wallet_adjust($mb_id, $delta, $kind = 'grant', $content = '', $admin_mb_id = '')
    {
        global $member;

        $mb_id = trim((string) $mb_id);
        $delta = (int) $delta;
        $kind = preg_replace('/[^a-z_]/', '', (string) $kind);
        if ($kind === '') {
            $kind = 'grant';
        }

        if ($mb_id === '') {
            return array('ok' => false, 'balance' => 0, 'message' => '회원 아이디가 없습니다.');
        }

        if ($admin_mb_id === '' && !empty($member['mb_id'])) {
            $admin_mb_id = $member['mb_id'];
        }

        bacara_wallet_ensure_row($mb_id);

        $table = bacara_wallet_table();
        $log = bacara_wallet_log_table();
        $mb_esc = sql_real_escape_string($mb_id);
        $admin_esc = sql_real_escape_string($admin_mb_id);
        $kind_esc = sql_real_escape_string($kind);
        $content_esc = sql_real_escape_string(cut_str(strip_tags((string) $content), 200));
        $now = G5_TIME_YMDHIS;

        $row = sql_fetch(" select balance from `{$table}` where mb_id = '{$mb_esc}' ");
        $before = isset($row['balance']) ? (int) $row['balance'] : 0;
        $after = $before + $delta;

        if ($after < 0) {
            return array('ok' => false, 'balance' => $before, 'message' => '잔액이 부족합니다.');
        }

        sql_query(
            " update `{$table}` set balance = '{$after}', updated_at = '{$now}' where mb_id = '{$mb_esc}' ",
            false
        );

        sql_query(
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

        return array('ok' => true, 'balance' => $after, 'message' => '처리되었습니다.');
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
