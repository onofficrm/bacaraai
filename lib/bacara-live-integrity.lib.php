<?php
/**
 * 감지 결과 ↔ 표시 결과 무결성 / 동기화 가드
 * - results_fp: 표시 rows 지문 (클라이언트 재계산과 일치해야 함)
 * - 수동 모드 중 감지가 전진하면 자동으로 감지 피드로 복귀
 */
if (!defined('_GNUBOARD_')) {
    exit;
}

if (!function_exists('bacara_live_results_fingerprint')) {
    /**
     * @param array $rows
     */
    function bacara_live_results_fingerprint($rows)
    {
        if (!is_array($rows) || !$rows) {
            return 'empty';
        }
        $parts = array();
        foreach ($rows as $r) {
            if (!is_array($r)) {
                continue;
            }
            $id = isset($r['id']) ? (int) $r['id'] : 0;
            $res = isset($r['result']) ? strtoupper(trim((string) $r['result'])) : '';
            $no = isset($r['game_no']) ? (int) $r['game_no'] : 0;
            if ($res === '') {
                continue;
            }
            $parts[] = $id . ':' . $res . ':' . $no;
        }
        if (!$parts) {
            return 'empty';
        }
        return substr(hash('sha256', implode('|', $parts)), 0, 20);
    }
}

if (!function_exists('bacara_live_manual_baseline_file')) {
    function bacara_live_manual_baseline_file($table_name)
    {
        if (!defined('G5_DATA_PATH')) {
            return '';
        }
        $dir = G5_DATA_PATH . '/cache';
        if (!is_dir($dir)) {
            @mkdir($dir, 0755, true);
        }
        $safe = preg_replace('/[^A-Z0-9_-]/', '', strtoupper((string) $table_name));
        return $dir . '/bacara-live-manual-baseline-' . $safe . '.json';
    }
}

if (!function_exists('bacara_live_manual_baseline_set')) {
    function bacara_live_manual_baseline_set($table_name, $detector_max_id)
    {
        $file = bacara_live_manual_baseline_file($table_name);
        if ($file === '') {
            return;
        }
        $payload = array(
            'table_name' => strtoupper((string) $table_name),
            'detector_max_id' => max(0, (int) $detector_max_id),
            'set_at' => defined('G5_TIME_YMDHIS') ? G5_TIME_YMDHIS : date('Y-m-d H:i:s'),
        );
        @file_put_contents($file, json_encode($payload, JSON_UNESCAPED_UNICODE), LOCK_EX);
    }
}

if (!function_exists('bacara_live_manual_baseline_get')) {
    function bacara_live_manual_baseline_get($table_name)
    {
        $file = bacara_live_manual_baseline_file($table_name);
        if ($file === '' || !is_file($file)) {
            return array('detector_max_id' => 0, 'set_at' => null);
        }
        $raw = @file_get_contents($file);
        $data = $raw ? json_decode($raw, true) : null;
        if (!is_array($data)) {
            return array('detector_max_id' => 0, 'set_at' => null);
        }
        return array(
            'detector_max_id' => isset($data['detector_max_id']) ? (int) $data['detector_max_id'] : 0,
            'set_at' => isset($data['set_at']) ? $data['set_at'] : null,
        );
    }
}

if (!function_exists('bacara_live_manual_baseline_clear')) {
    function bacara_live_manual_baseline_clear($table_name)
    {
        $file = bacara_live_manual_baseline_file($table_name);
        if ($file !== '' && is_file($file)) {
            @unlink($file);
        }
    }
}

if (!function_exists('bacara_live_detector_tip')) {
    /**
     * 감지 DB 최신 tip (가벼운 조회)
     * @param string $table_name
     * @param string $account 비어 있으면 테이블 전체, 있으면 해당 계정만
     * @return array{max_id:int,result:?string,detected_at:?string,account:?string,ok:bool,error:string}
     */
    function bacara_live_detector_tip($table_name, $account = '')
    {
        $out = array(
            'ok' => false,
            'max_id' => 0,
            'result' => null,
            'detected_at' => null,
            'account' => null,
            'error' => '',
        );
        $table_name = strtoupper(trim((string) $table_name));
        if ($table_name === '' || !preg_match('/^[A-Z0-9_-]{1,40}$/', $table_name)) {
            $out['error'] = 'bad_table';
            return $out;
        }

        if (!function_exists('bacara_ai_live_connect')) {
            $ai_lib = G5_LIB_PATH . '/bacara-ai-analyze.lib.php';
            if (is_file($ai_lib)) {
                include_once $ai_lib;
            }
        }
        if (!function_exists('bacara_ai_live_connect')) {
            $out['error'] = 'no_connector';
            return $out;
        }

        $conn = bacara_ai_live_connect();
        if (empty($conn['ok'])) {
            $out['error'] = isset($conn['error']) ? (string) $conn['error'] : 'connect_fail';
            return $out;
        }
        $use_live = !empty($conn['use_live']);
        $link = $conn['link'];
        $safe = function_exists('bacara_ai_live_escape')
            ? bacara_ai_live_escape($table_name, $use_live, $link)
            : addslashes($table_name);

        $account = trim((string) $account);
        $account_sql = '';
        if ($account !== '') {
            $safe_acc = function_exists('bacara_ai_live_escape')
                ? bacara_ai_live_escape($account, $use_live, $link)
                : addslashes($account);
            $account_sql = " and account = '{$safe_acc}' ";
        }

        $sql = " select id, account, result, detected_at
                   from `bacaraai`
                  where table_name = '{$safe}'
                    and result in ('P','B','T')
                    {$account_sql}
                  order by id desc
                  limit 1 ";
        $error = '';
        $rows = function_exists('bacara_ai_live_query_rows')
            ? bacara_ai_live_query_rows($sql, $use_live, $link, $error)
            : array();
        if ($error !== '') {
            $out['error'] = $error;
            return $out;
        }
        if (!$rows) {
            $out['ok'] = true;
            return $out;
        }
        $row = $rows[0];
        $out['ok'] = true;
        $out['max_id'] = isset($row['id']) ? (int) $row['id'] : 0;
        $out['result'] = isset($row['result']) ? strtoupper(trim((string) $row['result'])) : null;
        $out['detected_at'] = isset($row['detected_at']) ? $row['detected_at'] : null;
        $out['account'] = isset($row['account']) ? (string) $row['account'] : null;
        return $out;
    }
}

if (!function_exists('bacara_live_manual_should_yield_to_detector')) {
    /**
     * 수동 표시 중인데 감지가 baseline 이후로 새 결과를 넣으면 true
     */
    function bacara_live_manual_should_yield_to_detector($table_name)
    {
        if (!function_exists('bacara_live_admin_is_manual') || !bacara_live_admin_is_manual($table_name)) {
            return false;
        }
        $tip = bacara_live_detector_tip($table_name);
        if (empty($tip['ok'])) {
            return false;
        }
        $base = bacara_live_manual_baseline_get($table_name);
        $tip_id = (int) $tip['max_id'];
        $base_id = (int) $base['detector_max_id'];
        // 감지가 수동 전환 시점보다 앞선 새 id 를 냈으면 표시를 감지로 강제 복귀
        return $tip_id > 0 && $tip_id > $base_id;
    }
}

if (!function_exists('bacara_live_attach_integrity')) {
    /**
     * 모든 live payload 에 공통 무결성 블록 부착
     */
    function bacara_live_attach_integrity(array $payload, array $extra = array())
    {
        $rows = isset($payload['results']) && is_array($payload['results']) ? $payload['results'] : array();
        $fp = bacara_live_results_fingerprint($rows);
        $latest = count($rows) ? $rows[count($rows) - 1] : null;
        $source = isset($payload['source']) ? (string) $payload['source'] : '';
        $manual = !empty($payload['manual_mode']);

        $integrity = array(
            'version' => 1,
            'results_fp' => $fp,
            'count' => count($rows),
            'latest_id' => $latest && isset($latest['id']) ? (int) $latest['id'] : null,
            'latest_result' => $latest && isset($latest['result'])
                ? strtoupper((string) $latest['result'])
                : null,
            'latest_game_no' => $latest && isset($latest['game_no']) ? (int) $latest['game_no'] : null,
            'source' => $source,
            'manual_mode' => $manual,
            'synced' => true,
            'policy' => $manual ? 'manual_frozen' : 'detector',
            'detector_max_id' => null,
            'detector_result' => null,
            'message' => null,
            'healed' => false,
        );

        foreach ($extra as $k => $v) {
            $integrity[$k] = $v;
        }

        // 감 tip — 표시와 같은 계정 기준으로 교차검증 (다른 계정 tip 은 오탐)
        $display_account = isset($payload['account']) ? trim((string) $payload['account']) : '';
        if ($integrity['detector_max_id'] === null && !empty($payload['table_name'])) {
            $tip = bacara_live_detector_tip($payload['table_name'], $display_account);
            if (!empty($tip['ok'])) {
                $integrity['detector_max_id'] = (int) $tip['max_id'];
                $integrity['detector_result'] = $tip['result'];
                $integrity['detector_account'] = isset($tip['account']) ? $tip['account'] : $display_account;
            }
        }

        // 자동 모드: 동일 계정 tip 과 표시 latest 가 반드시 일치
        // tip id 가 앞서도 결과가 같으면(재감지 병합) synced 로 본다
        if (!$manual
            && $integrity['detector_max_id']
            && $integrity['latest_id']
        ) {
            $tip_id = (int) $integrity['detector_max_id'];
            $disp_id = (int) $integrity['latest_id'];
            $tip_res = isset($integrity['detector_result'])
                ? strtoupper(trim((string) $integrity['detector_result']))
                : '';
            $disp_res = isset($integrity['latest_result'])
                ? strtoupper(trim((string) $integrity['latest_result']))
                : '';

            if ($disp_id > $tip_id) {
                $integrity['synced'] = false;
                $integrity['message'] = '표시 latest_id 가 감지 tip 보다 앞섭니다.';
            } elseif ($tip_id > $disp_id) {
                if ($tip_res !== '' && $disp_res !== '' && $tip_res === $disp_res) {
                    // 같은 결과의 재감지 id 만 앞선 경우 — 표시는 최신 결과와 일치
                    $integrity['synced'] = true;
                } else {
                    $integrity['synced'] = false;
                    $integrity['message'] = '감지가 표시보다 앞섭니다. 재동기화가 필요합니다.';
                }
            } elseif ($tip_res !== '' && $disp_res !== '' && $tip_res !== $disp_res) {
                $integrity['synced'] = false;
                $integrity['message'] = '감지 결과(' . $tip_res . ')와 표시 결과(' . $disp_res . ')가 다릅니다.';
            }
        }

        // 수동 모드: 감지가 baseline 을 넘지 않았으면 synced (의도적 동결)
        if ($manual && !empty($payload['table_name'])) {
            $base = bacara_live_manual_baseline_get($payload['table_name']);
            $integrity['manual_baseline_id'] = (int) $base['detector_max_id'];
            if ($integrity['detector_max_id'] !== null
                && (int) $integrity['detector_max_id'] > (int) $base['detector_max_id']
            ) {
                $integrity['synced'] = false;
                $integrity['message'] = '감지 결과가 수동 표시보다 앞서 있습니다. 자동 복귀가 필요합니다.';
            }
        }

        $payload['integrity'] = $integrity;
        $payload['results_fp'] = $fp;
        return $payload;
    }
}
