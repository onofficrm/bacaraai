<?php
/**
 * 관리자 수동 라이브 결과 — 테이블별 P/B/T 입력·셔플·새 게임
 * manual_mode=1 이면 live_results.php 가 외부 DB 대신 이 데이터를 반환한다.
 */
if (!defined('_GNUBOARD_')) {
    exit;
}

if (!function_exists('bacara_live_admin_table_ctrl')) {
    function bacara_live_admin_table_ctrl()
    {
        return G5_TABLE_PREFIX . 'bacara_live_table';
    }
}

if (!function_exists('bacara_live_admin_result_table')) {
    function bacara_live_admin_result_table()
    {
        return G5_TABLE_PREFIX . 'bacara_live_result';
    }
}

if (!function_exists('bacara_live_admin_audit_table')) {
    function bacara_live_admin_audit_table()
    {
        return G5_TABLE_PREFIX . 'bacara_live_audit';
    }
}

if (!function_exists('bacara_live_admin_install_tables')) {
    function bacara_live_admin_install_tables()
    {
        static $checked = false;
        if ($checked) {
            return;
        }
        $checked = true;

        $marker = defined('G5_DATA_PATH')
            ? G5_DATA_PATH . '/.bacara-live-admin-schema-v1'
            : '';
        if ($marker !== '' && is_file($marker)) {
            return;
        }

        $ctrl = bacara_live_admin_table_ctrl();
        $res = bacara_live_admin_result_table();
        $audit = bacara_live_admin_audit_table();

        sql_query(
            " CREATE TABLE IF NOT EXISTS `{$ctrl}` (
                `table_name` varchar(40) NOT NULL,
                `manual_mode` tinyint unsigned NOT NULL DEFAULT 0,
                `shuffle_active` tinyint unsigned NOT NULL DEFAULT 0,
                `shoe_token` varchar(32) NOT NULL DEFAULT '',
                `updated_at` datetime NOT NULL,
                `updated_by` varchar(20) NOT NULL DEFAULT '',
                PRIMARY KEY (`table_name`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 ",
            false
        );

        sql_query(
            " CREATE TABLE IF NOT EXISTS `{$res}` (
                `id` bigint unsigned NOT NULL AUTO_INCREMENT,
                `table_name` varchar(40) NOT NULL,
                `game_no` int unsigned NOT NULL DEFAULT 1,
                `result` char(1) NOT NULL,
                `detected_at` datetime NOT NULL,
                `created_by` varchar(20) NOT NULL DEFAULT '',
                `deleted_at` datetime NULL DEFAULT NULL,
                PRIMARY KEY (`id`),
                KEY `idx_table_live` (`table_name`, `deleted_at`, `id`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 ",
            false
        );

        sql_query(
            " CREATE TABLE IF NOT EXISTS `{$audit}` (
                `id` bigint unsigned NOT NULL AUTO_INCREMENT,
                `table_name` varchar(40) NOT NULL,
                `action` varchar(32) NOT NULL,
                `detail` varchar(500) NOT NULL DEFAULT '',
                `admin_mb_id` varchar(20) NOT NULL DEFAULT '',
                `created_at` datetime NOT NULL,
                PRIMARY KEY (`id`),
                KEY `idx_table_created` (`table_name`, `created_at`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 ",
            false
        );

        if ($marker !== '') {
            @file_put_contents($marker, G5_TIME_YMDHIS . PHP_EOL, LOCK_EX);
        }
    }
}

if (!function_exists('bacara_live_admin_normalize_table')) {
    function bacara_live_admin_normalize_table($table_name)
    {
        $t = strtoupper(trim((string) $table_name));
        if (!preg_match('/^[A-Z0-9_-]{1,40}$/', $t)) {
            return '';
        }
        return $t;
    }
}

if (!function_exists('bacara_live_admin_normalize_result')) {
    function bacara_live_admin_normalize_result($raw)
    {
        $v = strtoupper(trim((string) $raw));
        if ($v === 'P' || $v === 'PLAYER' || $v === '플레이어') {
            return 'P';
        }
        if ($v === 'B' || $v === 'BANKER' || $v === '뱅커') {
            return 'B';
        }
        if ($v === 'T' || $v === 'TIE' || $v === '타이') {
            return 'T';
        }
        return '';
    }
}

if (!function_exists('bacara_live_admin_get_ctrl')) {
    function bacara_live_admin_get_ctrl($table_name, $create = true)
    {
        $table_name = bacara_live_admin_normalize_table($table_name);
        if ($table_name === '') {
            return null;
        }
        $ctrl = bacara_live_admin_table_ctrl();
        $safe = sql_real_escape_string($table_name);
        $row = sql_fetch(" SELECT * FROM `{$ctrl}` WHERE table_name = '{$safe}' LIMIT 1 ", false);
        if (!empty($row['table_name'])) {
            return $row;
        }
        if (!$create) {
            return null;
        }
        $now = G5_TIME_YMDHIS;
        $token = substr(md5($table_name . microtime(true)), 0, 16);
        sql_query(
            " INSERT INTO `{$ctrl}`
                (table_name, manual_mode, shuffle_active, shoe_token, updated_at, updated_by)
              VALUES
                ('{$safe}', 0, 0, '{$token}', '{$now}', '') ",
            false
        );
        return sql_fetch(" SELECT * FROM `{$ctrl}` WHERE table_name = '{$safe}' LIMIT 1 ", false);
    }
}

if (!function_exists('bacara_live_admin_is_manual')) {
    function bacara_live_admin_is_manual($table_name)
    {
        $row = bacara_live_admin_get_ctrl($table_name, false);
        return !empty($row) && (int) $row['manual_mode'] === 1;
    }
}

if (!function_exists('bacara_live_admin_is_shuffle')) {
    function bacara_live_admin_is_shuffle($table_name)
    {
        $row = bacara_live_admin_get_ctrl($table_name, false);
        return !empty($row) && (int) $row['shuffle_active'] === 1;
    }
}

if (!function_exists('bacara_live_admin_fetch_results')) {
    function bacara_live_admin_fetch_results($table_name, $limit = 800)
    {
        $table_name = bacara_live_admin_normalize_table($table_name);
        if ($table_name === '') {
            return array();
        }
        $limit = max(1, min(1000, (int) $limit));
        $res = bacara_live_admin_result_table();
        $safe = sql_real_escape_string($table_name);
        $rows = array();
        $q = sql_query(
            " SELECT id, table_name, game_no, result, detected_at, created_by
                FROM `{$res}`
               WHERE table_name = '{$safe}'
                 AND deleted_at IS NULL
               ORDER BY id ASC
               LIMIT {$limit} ",
            false
        );
        if ($q) {
            while ($row = sql_fetch_array($q)) {
                $r = strtoupper((string) $row['result']);
                if (!in_array($r, array('P', 'B', 'T'), true)) {
                    continue;
                }
                $rows[] = array(
                    'id' => (int) $row['id'],
                    'account' => 'admin',
                    'table_name' => $row['table_name'],
                    'game_no' => (int) $row['game_no'],
                    'result' => $r,
                    'detected_at' => $row['detected_at'],
                );
            }
        }
        return $rows;
    }
}

if (!function_exists('bacara_live_admin_invalidate_cache')) {
    function bacara_live_admin_invalidate_cache($table_name)
    {
        if (!defined('G5_DATA_PATH')) {
            return;
        }
        $table_name = bacara_live_admin_normalize_table($table_name);
        if ($table_name === '') {
            return;
        }
        $dir = G5_DATA_PATH . '/cache';
        if (!is_dir($dir)) {
            return;
        }
        $prefix = 'bacara-live-' . preg_replace('/[^A-Z0-9_-]/', '', $table_name);
        foreach (glob($dir . '/' . $prefix . '-*.json') ?: array() as $file) {
            @unlink($file);
            @unlink($file . '.lock');
        }
    }
}

if (!function_exists('bacara_live_admin_audit')) {
    function bacara_live_admin_audit($table_name, $action, $detail, $admin_id)
    {
        $table_name = bacara_live_admin_normalize_table($table_name);
        if ($table_name === '') {
            return;
        }
        $audit = bacara_live_admin_audit_table();
        $safe_table = sql_real_escape_string($table_name);
        $safe_action = sql_real_escape_string(substr((string) $action, 0, 32));
        $safe_detail = sql_real_escape_string(substr((string) $detail, 0, 500));
        $safe_admin = sql_real_escape_string(substr((string) $admin_id, 0, 20));
        $now = G5_TIME_YMDHIS;
        sql_query(
            " INSERT INTO `{$audit}`
                (table_name, action, detail, admin_mb_id, created_at)
              VALUES
                ('{$safe_table}', '{$safe_action}', '{$safe_detail}', '{$safe_admin}', '{$now}') ",
            false
        );
    }
}

if (!function_exists('bacara_live_admin_build_payload')) {
    function bacara_live_admin_build_payload($table_name, $limit = 800)
    {
        $table_name = bacara_live_admin_normalize_table($table_name);
        if ($table_name === '') {
            return null;
        }
        $ctrl = bacara_live_admin_get_ctrl($table_name, false);
        if (empty($ctrl) || (int) $ctrl['manual_mode'] !== 1) {
            return null;
        }

        $rows = bacara_live_admin_fetch_results($table_name, $limit);
        $latest = count($rows) ? $rows[count($rows) - 1] : null;
        $game_no = $latest ? (int) $latest['game_no'] : null;

        return array(
            'ok' => true,
            'account' => 'admin',
            'account_preferred' => 'admin',
            'account_switched' => false,
            'table_name' => $table_name,
            'game_no' => $game_no,
            'source' => 'admin_manual',
            'count' => count($rows),
            'shoe_count' => count($rows),
            'truncated' => false,
            'deduped' => 0,
            'shoe_start_id' => count($rows) ? (int) $rows[0]['id'] : null,
            'latest_id' => $latest ? (int) $latest['id'] : null,
            'table_max_id' => $latest ? (int) $latest['id'] : null,
            'latest_detected_at' => $latest ? $latest['detected_at'] : null,
            'manual_mode' => true,
            'shuffle_active' => (int) $ctrl['shuffle_active'] === 1,
            'shoe_token' => isset($ctrl['shoe_token']) ? (string) $ctrl['shoe_token'] : '',
            'results' => $rows,
        );
    }
}

if (!function_exists('bacara_live_admin_enable_manual')) {
    function bacara_live_admin_enable_manual($table_name, $admin_id)
    {
        $table_name = bacara_live_admin_normalize_table($table_name);
        if ($table_name === '') {
            return false;
        }
        $ctrl = bacara_live_admin_table_ctrl();
        $safe = sql_real_escape_string($table_name);
        $now = G5_TIME_YMDHIS;
        $admin = sql_real_escape_string(substr((string) $admin_id, 0, 20));
        bacara_live_admin_get_ctrl($table_name, true);
        sql_query(
            " UPDATE `{$ctrl}`
                 SET manual_mode = 1, updated_at = '{$now}', updated_by = '{$admin}'
               WHERE table_name = '{$safe}' ",
            false
        );
        return true;
    }
}

if (!function_exists('bacara_live_admin_add_result')) {
    function bacara_live_admin_add_result($table_name, $result, $admin_id)
    {
        $table_name = bacara_live_admin_normalize_table($table_name);
        $result = bacara_live_admin_normalize_result($result);
        if ($table_name === '' || $result === '') {
            return array('ok' => false, 'message' => '테이블 또는 결과 값이 올바르지 않습니다.');
        }

        $ctrl_row = bacara_live_admin_get_ctrl($table_name, true);
        if ((int) $ctrl_row['shuffle_active'] === 1) {
            return array('ok' => false, 'message' => '셔플 중에는 결과를 추가할 수 없습니다. 셔플을 해제한 뒤 새 게임을 시작하세요.');
        }

        bacara_live_admin_enable_manual($table_name, $admin_id);

        $rows = bacara_live_admin_fetch_results($table_name, 1000);
        $next_no = count($rows) + 1;
        $now = G5_TIME_YMDHIS;
        $res = bacara_live_admin_result_table();
        $safe_table = sql_real_escape_string($table_name);
        $safe_result = sql_real_escape_string($result);
        $safe_admin = sql_real_escape_string(substr((string) $admin_id, 0, 20));

        sql_query(
            " INSERT INTO `{$res}`
                (table_name, game_no, result, detected_at, created_by)
              VALUES
                ('{$safe_table}', {$next_no}, '{$safe_result}', '{$now}', '{$safe_admin}') ",
            false
        );
        $new_id = sql_insert_id();

        bacara_live_admin_audit(
            $table_name,
            'add_result',
            "game_no={$next_no} result={$result} id={$new_id}",
            $admin_id
        );
        bacara_live_admin_invalidate_cache($table_name);

        $payload = bacara_live_admin_build_payload($table_name, 800);
        return array(
            'ok' => true,
            'message' => "{$next_no}회차 {$result} 추가",
            'added' => array(
                'id' => (int) $new_id,
                'game_no' => $next_no,
                'result' => $result,
            ),
            'payload' => $payload,
        );
    }
}

if (!function_exists('bacara_live_admin_undo_last')) {
    function bacara_live_admin_undo_last($table_name, $admin_id)
    {
        $table_name = bacara_live_admin_normalize_table($table_name);
        if ($table_name === '') {
            return array('ok' => false, 'message' => '테이블 코드가 올바르지 않습니다.');
        }
        if (!bacara_live_admin_is_manual($table_name)) {
            return array('ok' => false, 'message' => '수동 관리 중인 테이블이 아닙니다.');
        }

        $res = bacara_live_admin_result_table();
        $safe = sql_real_escape_string($table_name);
        $last = sql_fetch(
            " SELECT id, game_no, result
                FROM `{$res}`
               WHERE table_name = '{$safe}' AND deleted_at IS NULL
               ORDER BY id DESC
               LIMIT 1 ",
            false
        );
        if (empty($last['id'])) {
            return array('ok' => false, 'message' => '삭제할 결과가 없습니다.');
        }

        $now = G5_TIME_YMDHIS;
        $id = (int) $last['id'];
        sql_query(
            " UPDATE `{$res}` SET deleted_at = '{$now}' WHERE id = {$id} LIMIT 1 ",
            false
        );

        bacara_live_admin_audit(
            $table_name,
            'undo_last',
            "removed id={$id} game_no={$last['game_no']} result={$last['result']}",
            $admin_id
        );
        bacara_live_admin_invalidate_cache($table_name);

        return array(
            'ok' => true,
            'message' => "마지막 {$last['game_no']}회차 {$last['result']} 삭제",
            'removed' => array(
                'id' => $id,
                'game_no' => (int) $last['game_no'],
                'result' => $last['result'],
            ),
            'payload' => bacara_live_admin_build_payload($table_name, 800),
        );
    }
}

if (!function_exists('bacara_live_admin_new_game')) {
    function bacara_live_admin_new_game($table_name, $admin_id)
    {
        $table_name = bacara_live_admin_normalize_table($table_name);
        if ($table_name === '') {
            return array('ok' => false, 'message' => '테이블 코드가 올바르지 않습니다.');
        }

        bacara_live_admin_enable_manual($table_name, $admin_id);

        $res = bacara_live_admin_result_table();
        $ctrl = bacara_live_admin_table_ctrl();
        $safe = sql_real_escape_string($table_name);
        $now = G5_TIME_YMDHIS;
        $admin = sql_real_escape_string(substr((string) $admin_id, 0, 20));
        $token = substr(md5($table_name . microtime(true) . mt_rand()), 0, 16);

        sql_query(
            " UPDATE `{$res}`
                 SET deleted_at = '{$now}'
               WHERE table_name = '{$safe}' AND deleted_at IS NULL ",
            false
        );
        sql_query(
            " UPDATE `{$ctrl}`
                 SET shuffle_active = 0,
                     shoe_token = '{$token}',
                     updated_at = '{$now}',
                     updated_by = '{$admin}'
               WHERE table_name = '{$safe}' ",
            false
        );

        bacara_live_admin_audit($table_name, 'new_game', "shoe_token={$token}", $admin_id);
        bacara_live_admin_invalidate_cache($table_name);

        return array(
            'ok' => true,
            'message' => '새 게임(슈)을 시작했습니다.',
            'payload' => bacara_live_admin_build_payload($table_name, 800),
        );
    }
}

if (!function_exists('bacara_live_admin_disable_manual')) {
    function bacara_live_admin_disable_manual($table_name, $admin_id)
    {
        $table_name = bacara_live_admin_normalize_table($table_name);
        if ($table_name === '') {
            return array('ok' => false, 'message' => '테이블 코드가 올바르지 않습니다.');
        }
        $ctrl = bacara_live_admin_table_ctrl();
        $safe = sql_real_escape_string($table_name);
        $now = G5_TIME_YMDHIS;
        $admin = sql_real_escape_string(substr((string) $admin_id, 0, 20));
        bacara_live_admin_get_ctrl($table_name, true);
        sql_query(
            " UPDATE `{$ctrl}`
                 SET manual_mode = 0,
                     shuffle_active = 0,
                     updated_at = '{$now}',
                     updated_by = '{$admin}'
               WHERE table_name = '{$safe}' ",
            false
        );
        bacara_live_admin_audit($table_name, 'resume_auto', 'manual_mode=0', $admin_id);
        bacara_live_admin_invalidate_cache($table_name);

        return array(
            'ok' => true,
            'message' => '자동 감지 결과를 다시 사용합니다.',
            'manual_mode' => false,
            'payload' => bacara_live_admin_view_payload($table_name, 800),
        );
    }
}

if (!function_exists('bacara_live_admin_detector_payload')) {
    /**
     * 감지(라이브) DB 현재 슈를 관리자 화면용 payload 로 변환
     */
    function bacara_live_admin_detector_payload($table_name, $limit = 800)
    {
        $table_name = bacara_live_admin_normalize_table($table_name);
        if ($table_name === '') {
            return null;
        }

        if (!function_exists('bacara_ai_fetch_table_history')) {
            $ai_lib = G5_LIB_PATH . '/bacara-ai-analyze.lib.php';
            if (!is_file($ai_lib)) {
                return null;
            }
            include_once $ai_lib;
        }
        if (!function_exists('bacara_ai_fetch_table_history')) {
            return null;
        }

        $cache_file = '';
        if (defined('G5_DATA_PATH')) {
            $cache_dir = G5_DATA_PATH . '/cache';
            if (!is_dir($cache_dir)) {
                @mkdir($cache_dir, 0755, true);
            }
            $cache_file = $cache_dir . '/bacara-admin-det-'
                . preg_replace('/[^A-Z0-9_-]/', '', $table_name) . '.json';
            if (is_file($cache_file) && (time() - (int) @filemtime($cache_file)) <= 1) {
                $raw = @file_get_contents($cache_file);
                $cached = $raw ? json_decode($raw, true) : null;
                if (is_array($cached) && !empty($cached['ok'])) {
                    return $cached;
                }
            }
        }

        $fetched = bacara_ai_fetch_table_history($table_name, max(200, (int) $limit));
        if (empty($fetched['ok'])) {
            return array(
                'ok' => true,
                'account' => '',
                'table_name' => $table_name,
                'game_no' => null,
                'source' => 'detector',
                'count' => 0,
                'shoe_count' => 0,
                'truncated' => false,
                'latest_id' => null,
                'latest_detected_at' => null,
                'manual_mode' => false,
                'shuffle_active' => false,
                'results' => array(),
                'detector_error' => isset($fetched['error']) ? $fetched['error'] : '감지 데이터 없음',
            );
        }

        $shoe = isset($fetched['shoe']) && is_array($fetched['shoe']) ? $fetched['shoe'] : array();
        if (count($shoe) > $limit) {
            $shoe = array_slice($shoe, -$limit);
        }
        $rows = array();
        foreach ($shoe as $row) {
            $r = isset($row['result']) ? strtoupper(trim((string) $row['result'])) : '';
            if (!in_array($r, array('P', 'B', 'T'), true)) {
                continue;
            }
            $rows[] = array(
                'id' => isset($row['id']) ? (int) $row['id'] : 0,
                'account' => isset($fetched['account']) ? (string) $fetched['account'] : 'detector',
                'table_name' => $table_name,
                'game_no' => isset($row['game_no']) ? (int) $row['game_no'] : null,
                'result' => $r,
                'detected_at' => isset($row['detected_at']) ? $row['detected_at'] : '',
            );
        }
        $latest = count($rows) ? $rows[count($rows) - 1] : null;
        $payload = array(
            'ok' => true,
            'account' => isset($fetched['account']) ? (string) $fetched['account'] : 'detector',
            'table_name' => $table_name,
            'game_no' => $latest && isset($latest['game_no']) ? $latest['game_no'] : null,
            'source' => 'detector',
            'count' => count($rows),
            'shoe_count' => count($rows),
            'truncated' => false,
            'latest_id' => $latest ? (int) $latest['id'] : null,
            'table_max_id' => $latest ? (int) $latest['id'] : null,
            'latest_detected_at' => $latest ? $latest['detected_at'] : null,
            'manual_mode' => false,
            'shuffle_active' => false,
            'results' => $rows,
        );

        if ($cache_file !== '') {
            @file_put_contents($cache_file, json_encode($payload, JSON_UNESCAPED_UNICODE), LOCK_EX);
        }
        return $payload;
    }
}

if (!function_exists('bacara_live_admin_view_payload')) {
    /**
     * 관리자 화면용: 수동 모드면 수동 결과, 아니면 감지 결과
     */
    function bacara_live_admin_view_payload($table_name, $limit = 800)
    {
        if (bacara_live_admin_is_manual($table_name)) {
            $payload = bacara_live_admin_build_payload($table_name, $limit);
            if (is_array($payload)) {
                return $payload;
            }
        }
        $det = bacara_live_admin_detector_payload($table_name, $limit);
        return is_array($det) ? $det : array(
            'ok' => true,
            'table_name' => bacara_live_admin_normalize_table($table_name),
            'source' => 'detector',
            'count' => 0,
            'results' => array(),
            'manual_mode' => false,
            'shuffle_active' => false,
        );
    }
}

if (!function_exists('bacara_live_admin_set_shuffle')) {
    function bacara_live_admin_set_shuffle($table_name, $active, $admin_id)
    {
        $table_name = bacara_live_admin_normalize_table($table_name);
        if ($table_name === '') {
            return array('ok' => false, 'message' => '테이블 코드가 올바르지 않습니다.');
        }

        bacara_live_admin_enable_manual($table_name, $admin_id);

        $ctrl = bacara_live_admin_table_ctrl();
        $safe = sql_real_escape_string($table_name);
        $now = G5_TIME_YMDHIS;
        $admin = sql_real_escape_string(substr((string) $admin_id, 0, 20));
        $flag = $active ? 1 : 0;

        sql_query(
            " UPDATE `{$ctrl}`
                 SET shuffle_active = {$flag}, updated_at = '{$now}', updated_by = '{$admin}'
               WHERE table_name = '{$safe}' ",
            false
        );

        bacara_live_admin_audit(
            $table_name,
            $active ? 'shuffle_on' : 'shuffle_off',
            '',
            $admin_id
        );
        bacara_live_admin_invalidate_cache($table_name);

        return array(
            'ok' => true,
            'message' => $active ? '셔플 중 화면을 표시합니다.' : '셔플 화면을 해제했습니다.',
            'shuffle_active' => (bool) $active,
            'payload' => bacara_live_admin_build_payload($table_name, 800),
        );
    }
}

if (!function_exists('bacara_live_admin_overview')) {
    function bacara_live_admin_overview($tables)
    {
        $out = array();
        foreach ($tables as $code) {
            $code = bacara_live_admin_normalize_table($code);
            if ($code === '') {
                continue;
            }
            $ctrl = bacara_live_admin_get_ctrl($code, false);
            $manual = $ctrl ? (int) $ctrl['manual_mode'] === 1 : false;
            $shuffle = $ctrl ? (int) $ctrl['shuffle_active'] === 1 : false;

            if ($manual) {
                $rows = bacara_live_admin_fetch_results($code, 800);
                $source = 'admin';
            } else {
                $det = bacara_live_admin_detector_payload($code, 800);
                $rows = (is_array($det) && !empty($det['results']) && is_array($det['results']))
                    ? $det['results']
                    : array();
                $source = 'detector';
            }

            $latest = count($rows) ? $rows[count($rows) - 1] : null;
            $player = 0;
            $banker = 0;
            $tie = 0;
            foreach ($rows as $r) {
                if ($r['result'] === 'P') {
                    $player++;
                } elseif ($r['result'] === 'B') {
                    $banker++;
                } elseif ($r['result'] === 'T') {
                    $tie++;
                }
            }

            $out[] = array(
                'table_name' => $code,
                'manual_mode' => $manual,
                'shuffle_active' => $shuffle,
                'source' => $source,
                'game_no' => $latest && isset($latest['game_no']) ? (int) $latest['game_no'] : 0,
                'latest_result' => $latest ? $latest['result'] : null,
                'latest_id' => $latest && isset($latest['id']) ? (int) $latest['id'] : null,
                'latest_detected_at' => $latest && isset($latest['detected_at']) ? $latest['detected_at'] : null,
                'count' => count($rows),
                'player' => $player,
                'banker' => $banker,
                'tie' => $tie,
                'results' => $rows,
                'updated_at' => $ctrl ? $ctrl['updated_at'] : null,
                'updated_by' => $ctrl ? $ctrl['updated_by'] : '',
            );
        }
        return $out;
    }
}

if (!function_exists('bacara_live_admin_recent_audit')) {
    function bacara_live_admin_recent_audit($table_name, $limit = 8)
    {
        $table_name = bacara_live_admin_normalize_table($table_name);
        if ($table_name === '') {
            return array();
        }
        $audit = bacara_live_admin_audit_table();
        $safe = sql_real_escape_string($table_name);
        $limit = max(1, min(50, (int) $limit));
        $rows = array();
        $q = sql_query(
            " SELECT action, detail, admin_mb_id, created_at
                FROM `{$audit}`
               WHERE table_name = '{$safe}'
               ORDER BY id DESC
               LIMIT {$limit} ",
            false
        );
        if ($q) {
            while ($row = sql_fetch_array($q)) {
                $rows[] = $row;
            }
        }
        return $rows;
    }
}
