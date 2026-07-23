<?php
/**
 * 바카라 AI — 통계·멀티 LLM 분석·섀도 예측 저장
 */
if (!defined('_GNUBOARD_')) {
    exit;
}

include_once G5_LIB_PATH . '/bacara-ai-config.lib.php';
if (is_file(G5_LIB_PATH . '/bacara-ai-usage.lib.php')) {
    include_once G5_LIB_PATH . '/bacara-ai-usage.lib.php';
}

if (!function_exists('bacara_ai_prediction_table')) {
    function bacara_ai_prediction_table()
    {
        return G5_TABLE_PREFIX . 'bacara_ai_prediction';
    }
}

if (!function_exists('bacara_ai_install_tables')) {
    function bacara_ai_install_tables()
    {
        $table = bacara_ai_prediction_table();
        sql_query(
            " CREATE TABLE IF NOT EXISTS `{$table}` (
                `id` bigint unsigned NOT NULL AUTO_INCREMENT,
                `table_name` varchar(40) NOT NULL,
                `source_result_id` bigint unsigned NOT NULL,
                `game_no` int DEFAULT NULL,
                `mode` varchar(20) NOT NULL DEFAULT 'shadow',
                `stats_json` mediumtext NOT NULL,
                `gpt_opinion` varchar(16) NOT NULL DEFAULT 'WAIT',
                `gpt_confidence` tinyint unsigned NOT NULL DEFAULT 0,
                `gpt_reasons` text,
                `gpt_ms` int unsigned NOT NULL DEFAULT 0,
                `gpt_error` varchar(255) NOT NULL DEFAULT '',
                `claude_opinion` varchar(16) NOT NULL DEFAULT 'WAIT',
                `claude_confidence` tinyint unsigned NOT NULL DEFAULT 0,
                `claude_reasons` text,
                `claude_ms` int unsigned NOT NULL DEFAULT 0,
                `claude_error` varchar(255) NOT NULL DEFAULT '',
                `gemini_opinion` varchar(16) NOT NULL DEFAULT 'WAIT',
                `gemini_confidence` tinyint unsigned NOT NULL DEFAULT 0,
                `gemini_reasons` text,
                `gemini_ms` int unsigned NOT NULL DEFAULT 0,
                `gemini_error` varchar(255) NOT NULL DEFAULT '',
                `final_opinion` varchar(16) NOT NULL DEFAULT 'WAIT',
                `final_confidence` tinyint unsigned NOT NULL DEFAULT 0,
                `consensus` varchar(16) NOT NULL DEFAULT '0/3',
                `decision_reason` varchar(255) NOT NULL DEFAULT '',
                `actual_result` char(1) DEFAULT NULL,
                `hit` tinyint DEFAULT NULL,
                `created_at` datetime NOT NULL,
                `settled_at` datetime DEFAULT NULL,
                PRIMARY KEY (`id`),
                UNIQUE KEY `uniq_table_source` (`table_name`, `source_result_id`),
                KEY `idx_settle` (`table_name`, `hit`, `source_result_id`),
                KEY `idx_created` (`created_at`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 ",
            false
        );
    }
}

if (!function_exists('bacara_ai_live_connect')) {
    /**
     * @return array{ok:bool,use_live:bool,link:?mysqli,cfg:array,error:string}
     */
    function bacara_ai_live_connect()
    {
        $out = array(
            'ok' => true,
            'use_live' => false,
            'link' => null,
            'cfg' => array(),
            'error' => '',
        );

        $file = G5_DATA_PATH . '/bacaraai-live.config.php';
        if (!is_file($file)) {
            return $out;
        }

        $loaded = include $file;
        if (!is_array($loaded)
            || empty($loaded['host'])
            || empty($loaded['user'])
            || !array_key_exists('password', $loaded)
            || empty($loaded['database'])
        ) {
            return $out;
        }

        mysqli_report(MYSQLI_REPORT_OFF);
        $port = !empty($loaded['port']) ? (int) $loaded['port'] : 3306;
        $link = @mysqli_connect(
            $loaded['host'],
            $loaded['user'],
            $loaded['password'],
            $loaded['database'],
            $port
        );
        if (!$link) {
            $out['ok'] = false;
            $out['error'] = '실시간 DB 연결 실패';
            return $out;
        }

        @mysqli_set_charset($link, G5_DB_CHARSET);
        $out['use_live'] = true;
        $out['link'] = $link;
        $out['cfg'] = $loaded;
        return $out;
    }
}

if (!function_exists('bacara_ai_live_escape')) {
    function bacara_ai_live_escape($value, $use_live, $link)
    {
        return $use_live
            ? mysqli_real_escape_string($link, $value)
            : sql_real_escape_string($value);
    }
}

if (!function_exists('bacara_ai_live_query_rows')) {
    function bacara_ai_live_query_rows($sql, $use_live, $link, &$error)
    {
        $rows = array();
        $error = '';
        if ($use_live) {
            $q = @mysqli_query($link, $sql);
            if (!$q) {
                $error = mysqli_error($link);
                return $rows;
            }
            while ($row = mysqli_fetch_assoc($q)) {
                $rows[] = $row;
            }
            return $rows;
        }

        $q = sql_query($sql, false);
        if (!$q) {
            $error = 'sql_query failed';
            return $rows;
        }
        while ($row = sql_fetch_array($q)) {
            $rows[] = $row;
        }
        return $rows;
    }
}

if (!function_exists('bacara_ai_trim_shoe')) {
    function bacara_ai_trim_shoe(array $rows)
    {
        if (!$rows) {
            return array();
        }
        $start = 0;
        $prev = null;
        for ($i = 0; $i < count($rows); $i++) {
            $no = isset($rows[$i]['game_no']) ? (int) $rows[$i]['game_no'] : 0;
            if ($prev !== null && $no > 0 && $prev > 0 && $no < $prev) {
                $start = $i;
            }
            if ($no > 0) {
                $prev = $no;
            }
        }
        return $start === 0 ? $rows : array_values(array_slice($rows, $start));
    }
}

if (!function_exists('bacara_ai_fetch_table_history')) {
    /**
     * 테이블 최근 이력 + 현재 슈
     *
     * @return array{ok:bool,account:string,history:array,shoe:array,error:string}
     */
    function bacara_ai_fetch_table_history($table_name, $history_limit = 2000)
    {
        $conn = bacara_ai_live_connect();
        if (!$conn['ok']) {
            return array('ok' => false, 'account' => '', 'history' => array(), 'shoe' => array(), 'error' => $conn['error']);
        }

        $use_live = $conn['use_live'];
        $link = $conn['link'];
        $cfg = $conn['cfg'];
        $safe_table = bacara_ai_live_escape(strtoupper(trim($table_name)), $use_live, $link);
        $history_limit = max(100, min(5000, (int) $history_limit));

        global $member;
        $candidates = array();
        if (!empty($cfg['account'])) {
            $candidates[] = (string) $cfg['account'];
        }
        if (!empty($member['mb_id'])) {
            $candidates[] = (string) $member['mb_id'];
        }
        $candidates[] = 'awesome';
        $candidates = array_values(array_unique(array_filter($candidates)));

        $error = '';
        $history = array();
        $used_account = '';

        foreach ($candidates as $account) {
            $safe_account = bacara_ai_live_escape($account, $use_live, $link);
            $sql = " select id, account, table_name, game_no, result, detected_at
                       from `bacaraai`
                      where account = '{$safe_account}'
                        and table_name = '{$safe_table}'
                        and result in ('P','B','T')
                      order by id desc
                      limit {$history_limit} ";
            $history = bacara_ai_live_query_rows($sql, $use_live, $link, $error);
            if ($error !== '') {
                return array('ok' => false, 'account' => '', 'history' => array(), 'shoe' => array(), 'error' => $error);
            }
            if ($history) {
                $used_account = $account;
                break;
            }
        }

        if (!$history) {
            $sql = " select id, account, table_name, game_no, result, detected_at
                       from `bacaraai`
                      where table_name = '{$safe_table}'
                        and result in ('P','B','T')
                      order by id desc
                      limit {$history_limit} ";
            $history = bacara_ai_live_query_rows($sql, $use_live, $link, $error);
            if ($error !== '') {
                return array('ok' => false, 'account' => '', 'history' => array(), 'shoe' => array(), 'error' => $error);
            }
            if ($history) {
                $used_account = isset($history[0]['account']) ? $history[0]['account'] : '';
            }
        }

        $history = array_reverse($history);
        $shoe = bacara_ai_trim_shoe($history);

        // 슈 시작을 game_no=1 기준으로 다시 좁히기
        $shoe_start_id = null;
        for ($i = count($history) - 1; $i >= 0; $i--) {
            if (isset($history[$i]['game_no']) && (int) $history[$i]['game_no'] === 1) {
                $shoe_start_id = (int) $history[$i]['id'];
                break;
            }
        }
        if ($shoe_start_id !== null) {
            $shoe = array();
            foreach ($history as $row) {
                if ((int) $row['id'] >= $shoe_start_id) {
                    $shoe[] = $row;
                }
            }
            $shoe = bacara_ai_trim_shoe($shoe);
        }

        return array(
            'ok' => true,
            'account' => $used_account,
            'history' => $history,
            'shoe' => $shoe,
            'error' => '',
        );
    }
}

if (!function_exists('bacara_ai_decisive')) {
    function bacara_ai_decisive(array $results)
    {
        $out = array();
        foreach ($results as $r) {
            $r = strtoupper((string) $r);
            if ($r === 'P' || $r === 'B') {
                $out[] = $r;
            }
        }
        return $out;
    }
}

if (!function_exists('bacara_ai_build_stats')) {
    function bacara_ai_build_stats(array $shoe_rows, array $history_rows)
    {
        $shoe_results = array();
        foreach ($shoe_rows as $row) {
            $shoe_results[] = strtoupper($row['result']);
        }

        $player = 0;
        $banker = 0;
        $tie = 0;
        foreach ($shoe_results as $r) {
            if ($r === 'P') {
                $player++;
            } elseif ($r === 'B') {
                $banker++;
            } elseif ($r === 'T') {
                $tie++;
            }
        }

        $decisive = bacara_ai_decisive($shoe_results);
        $streak_side = null;
        $streak_count = 0;
        for ($i = count($decisive) - 1; $i >= 0; $i--) {
            if ($streak_side === null) {
                $streak_side = $decisive[$i];
                $streak_count = 1;
                continue;
            }
            if ($decisive[$i] === $streak_side) {
                $streak_count++;
            } else {
                break;
            }
        }

        $pattern_lens = array(2, 3, 4);
        $patterns = array();
        foreach ($pattern_lens as $len) {
            if (count($decisive) < $len) {
                continue;
            }
            $pattern = array_slice($decisive, -$len);
            $key = implode('', $pattern);
            $follow = array('P' => 0, 'B' => 0, 'T' => 0, 'n' => 0);

            $hist_dec = array();
            $hist_full = array();
            foreach ($history_rows as $row) {
                $r = strtoupper($row['result']);
                $hist_full[] = $r;
                if ($r === 'P' || $r === 'B') {
                    $hist_dec[] = array('side' => $r, 'idx' => count($hist_full) - 1);
                }
            }

            for ($i = 0; $i <= count($hist_dec) - $len - 0; $i++) {
                $match = true;
                for ($j = 0; $j < $len; $j++) {
                    if ($hist_dec[$i + $j]['side'] !== $pattern[$j]) {
                        $match = false;
                        break;
                    }
                }
                if (!$match) {
                    continue;
                }
                // 패턴 끝 다음 실제 결과(타이 포함)
                $end_full_idx = $hist_dec[$i + $len - 1]['idx'];
                if ($end_full_idx + 1 >= count($hist_full)) {
                    continue;
                }
                // 현재 슈의 "지금 끝"과 동일한 마지막 구간은 예측 대상이므로 통계에서 제외
                if ($i === count($hist_dec) - $len) {
                    continue;
                }
                $next = $hist_full[$end_full_idx + 1];
                if (!isset($follow[$next])) {
                    continue;
                }
                $follow[$next]++;
                $follow['n']++;
            }

            $n = max(0, (int) $follow['n']);
            $patterns[] = array(
                'pattern' => $key,
                'length' => $len,
                'sample' => $n,
                'next_p' => (int) $follow['P'],
                'next_b' => (int) $follow['B'],
                'next_t' => (int) $follow['T'],
                'p_rate' => $n > 0 ? round($follow['P'] / $n, 4) : null,
                'b_rate' => $n > 0 ? round($follow['B'] / $n, 4) : null,
                't_rate' => $n > 0 ? round($follow['T'] / $n, 4) : null,
            );
        }

        $latest = null;
        if ($shoe_rows) {
            $last = $shoe_rows[count($shoe_rows) - 1];
            $latest = array(
                'id' => (int) $last['id'],
                'result' => strtoupper($last['result']),
                'game_no' => isset($last['game_no']) ? (int) $last['game_no'] : null,
                'detected_at' => isset($last['detected_at']) ? $last['detected_at'] : null,
            );
        }

        return array(
            'shoe_count' => count($shoe_results),
            'player' => $player,
            'banker' => $banker,
            'tie' => $tie,
            'recent' => array_slice($shoe_results, -20),
            'recent_decisive' => array_slice($decisive, -12),
            'streak_side' => $streak_side,
            'streak_count' => $streak_count,
            'patterns' => $patterns,
            'history_sample' => count($history_rows),
            'latest' => $latest,
            'disclaimer' => 'Baccarat hands are near-independent. Patterns are descriptive, not guaranteed edge.',
        );
    }
}

if (!function_exists('bacara_ai_normalize_opinion')) {
    function bacara_ai_normalize_opinion($value)
    {
        $v = strtoupper(trim((string) $value));
        if ($v === 'P' || $v === 'PLAYER') {
            return 'PLAYER';
        }
        if ($v === 'B' || $v === 'BANKER') {
            return 'BANKER';
        }
        return 'WAIT';
    }
}

if (!function_exists('bacara_ai_parse_model_json')) {
    function bacara_ai_parse_model_json($text)
    {
        $text = trim((string) $text);
        if ($text === '') {
            return null;
        }
        // strip markdown fences
        if (preg_match('/```(?:json)?\s*(\{.*?\})\s*```/is', $text, $m)) {
            $text = $m[1];
        } elseif (preg_match('/\{.*\}/s', $text, $m)) {
            $text = $m[0];
        }
        $data = json_decode($text, true);
        if (!is_array($data)) {
            return null;
        }
        $reasons = array();
        if (!empty($data['reasons']) && is_array($data['reasons'])) {
            foreach ($data['reasons'] as $r) {
                $r = trim((string) $r);
                if ($r !== '') {
                    $reasons[] = mb_substr($r, 0, 120);
                }
            }
        }
        $confidence = isset($data['confidence']) ? (int) $data['confidence'] : 0;
        $confidence = max(0, min(100, $confidence));
        $risk = array();
        if (!empty($data['risks']) && is_array($data['risks'])) {
            foreach ($data['risks'] as $r) {
                $r = trim((string) $r);
                if ($r !== '') {
                    $risk[] = mb_substr($r, 0, 80);
                }
            }
        }
        return array(
            'opinion' => bacara_ai_normalize_opinion(isset($data['side']) ? $data['side'] : (isset($data['opinion']) ? $data['opinion'] : 'WAIT')),
            'confidence' => $confidence,
            'reasons' => array_slice($reasons, 0, 4),
            'risks' => array_slice($risk, 0, 3),
            'abstain' => !empty($data['abstain']),
        );
    }
}

if (!function_exists('bacara_ai_prompt_messages')) {
    function bacara_ai_prompt_messages(array $stats)
    {
        $system = 'You are a baccarat decision assistant for a shadow-mode monitor. '
            . 'Hands are nearly independent; do not claim guaranteed prediction. '
            . 'Use ONLY the provided statistics. Prefer WAIT when sample is thin, rates are close, or risks are high. '
            . 'Return ONLY compact JSON: {"side":"PLAYER|BANKER|WAIT","confidence":0-100,"abstain":true|false,"reasons":["..."],"risks":["..."]}. '
            . 'Never bet on TIE. side=WAIT when abstain=true.';

        $user = "Analyze next hand (not Tie).\nSTATS_JSON:\n" . json_encode($stats, JSON_UNESCAPED_UNICODE);
        return array($system, $user);
    }
}

if (!function_exists('bacara_ai_http_json')) {
    function bacara_ai_http_json($url, array $headers, $body, $timeout = 12)
    {
        $ch = curl_init($url);
        curl_setopt_array($ch, array(
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_POSTFIELDS => $body,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_TIMEOUT => $timeout,
        ));
        $raw = curl_exec($ch);
        $errno = curl_errno($ch);
        $error = curl_error($ch);
        $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        return array(
            'ok' => $errno === 0 && $code >= 200 && $code < 300,
            'code' => $code,
            'raw' => $raw === false ? '' : $raw,
            'error' => $errno ? $error : ($code >= 400 ? 'HTTP ' . $code : ''),
        );
    }
}

if (!function_exists('bacara_ai_call_openai')) {
    function bacara_ai_call_openai(array $stats)
    {
        $key = bacara_ai_config_get('openai_api_key');
        $model = bacara_ai_config_get('openai_model', 'gpt-4o-mini');
        if ($key === '') {
            return array('opinion' => 'WAIT', 'confidence' => 0, 'reasons' => array(), 'ms' => 0, 'error' => 'API 키 없음');
        }
        list($system, $user) = bacara_ai_prompt_messages($stats);
        $t0 = microtime(true);
        $payload = json_encode(array(
            'model' => $model,
            'temperature' => 0.2,
            'response_format' => array('type' => 'json_object'),
            'messages' => array(
                array('role' => 'system', 'content' => $system),
                array('role' => 'user', 'content' => $user),
            ),
        ), JSON_UNESCAPED_UNICODE);

        $res = bacara_ai_http_json(
            'https://api.openai.com/v1/chat/completions',
            array(
                'Content-Type: application/json',
                'Authorization: Bearer ' . $key,
            ),
            $payload
        );
        $ms = (int) round((microtime(true) - $t0) * 1000);
        if (!$res['ok']) {
            return array('opinion' => 'WAIT', 'confidence' => 0, 'reasons' => array(), 'ms' => $ms, 'error' => $res['error'] ?: 'OpenAI 호출 실패');
        }
        $json = json_decode($res['raw'], true);
        $text = '';
        if (isset($json['choices'][0]['message']['content'])) {
            $text = $json['choices'][0]['message']['content'];
        }
        $parsed = bacara_ai_parse_model_json($text);
        if (!$parsed) {
            return array('opinion' => 'WAIT', 'confidence' => 0, 'reasons' => array(), 'ms' => $ms, 'error' => '응답 파싱 실패');
        }
        if ($parsed['abstain']) {
            $parsed['opinion'] = 'WAIT';
        }
        return array(
            'opinion' => $parsed['opinion'],
            'confidence' => $parsed['confidence'],
            'reasons' => $parsed['reasons'],
            'ms' => $ms,
            'error' => '',
        );
    }
}

if (!function_exists('bacara_ai_call_anthropic')) {
    function bacara_ai_call_anthropic(array $stats)
    {
        $key = bacara_ai_config_get('anthropic_api_key');
        $model = bacara_ai_config_get('anthropic_model', 'claude-sonnet-4-20250514');
        if ($key === '') {
            return array('opinion' => 'WAIT', 'confidence' => 0, 'reasons' => array(), 'ms' => 0, 'error' => 'API 키 없음');
        }
        list($system, $user) = bacara_ai_prompt_messages($stats);
        $t0 = microtime(true);
        $payload = json_encode(array(
            'model' => $model,
            'max_tokens' => 400,
            'temperature' => 0.2,
            'system' => $system,
            'messages' => array(
                array('role' => 'user', 'content' => $user),
            ),
        ), JSON_UNESCAPED_UNICODE);

        $res = bacara_ai_http_json(
            'https://api.anthropic.com/v1/messages',
            array(
                'Content-Type: application/json',
                'x-api-key: ' . $key,
                'anthropic-version: 2023-06-01',
            ),
            $payload
        );
        $ms = (int) round((microtime(true) - $t0) * 1000);
        if (!$res['ok']) {
            return array('opinion' => 'WAIT', 'confidence' => 0, 'reasons' => array(), 'ms' => $ms, 'error' => $res['error'] ?: 'Claude 호출 실패');
        }
        $json = json_decode($res['raw'], true);
        $text = '';
        if (!empty($json['content']) && is_array($json['content'])) {
            foreach ($json['content'] as $block) {
                if (isset($block['type']) && $block['type'] === 'text' && isset($block['text'])) {
                    $text .= $block['text'];
                }
            }
        }
        $parsed = bacara_ai_parse_model_json($text);
        if (!$parsed) {
            return array('opinion' => 'WAIT', 'confidence' => 0, 'reasons' => array(), 'ms' => $ms, 'error' => '응답 파싱 실패');
        }
        if ($parsed['abstain']) {
            $parsed['opinion'] = 'WAIT';
        }
        return array(
            'opinion' => $parsed['opinion'],
            'confidence' => $parsed['confidence'],
            'reasons' => $parsed['reasons'],
            'ms' => $ms,
            'error' => '',
        );
    }
}

if (!function_exists('bacara_ai_call_gemini')) {
    function bacara_ai_call_gemini(array $stats)
    {
        $key = bacara_ai_config_get('gemini_api_key');
        $model = bacara_ai_config_get('gemini_model', 'gemini-2.0-flash');
        if ($key === '') {
            return array('opinion' => 'WAIT', 'confidence' => 0, 'reasons' => array(), 'ms' => 0, 'error' => 'API 키 없음');
        }
        list($system, $user) = bacara_ai_prompt_messages($stats);
        $t0 = microtime(true);
        $url = 'https://generativelanguage.googleapis.com/v1beta/models/'
            . rawurlencode($model)
            . ':generateContent?key='
            . rawurlencode($key);
        $payload = json_encode(array(
            'systemInstruction' => array(
                'parts' => array(array('text' => $system)),
            ),
            'contents' => array(
                array(
                    'role' => 'user',
                    'parts' => array(array('text' => $user)),
                ),
            ),
            'generationConfig' => array(
                'temperature' => 0.2,
                'responseMimeType' => 'application/json',
            ),
        ), JSON_UNESCAPED_UNICODE);

        $res = bacara_ai_http_json($url, array('Content-Type: application/json'), $payload);
        $ms = (int) round((microtime(true) - $t0) * 1000);
        if (!$res['ok']) {
            return array('opinion' => 'WAIT', 'confidence' => 0, 'reasons' => array(), 'ms' => $ms, 'error' => $res['error'] ?: 'Gemini 호출 실패');
        }
        $json = json_decode($res['raw'], true);
        $text = '';
        if (isset($json['candidates'][0]['content']['parts'][0]['text'])) {
            $text = $json['candidates'][0]['content']['parts'][0]['text'];
        }
        $parsed = bacara_ai_parse_model_json($text);
        if (!$parsed) {
            return array('opinion' => 'WAIT', 'confidence' => 0, 'reasons' => array(), 'ms' => $ms, 'error' => '응답 파싱 실패');
        }
        if ($parsed['abstain']) {
            $parsed['opinion'] = 'WAIT';
        }
        return array(
            'opinion' => $parsed['opinion'],
            'confidence' => $parsed['confidence'],
            'reasons' => $parsed['reasons'],
            'ms' => $ms,
            'error' => '',
        );
    }
}

if (!function_exists('bacara_ai_decide_final')) {
    /**
     * 결정 엔진: 다수결 + 신뢰도 + 표본
     * - final_opinion: 화면 추천 (완화된 기준)
     * - auto_bet_ok: 자동 베팅용 엄격 기준 (3키 정상 · 2/3 · 65% · n≥30 · edge≥10%)
     */
    function bacara_ai_decide_final(array $models, array $stats)
    {
        $votes = array();
        $conf_sum = array('PLAYER' => 0, 'BANKER' => 0, 'WAIT' => 0);
        $ok_count = 0;
        $key_count = 0;
        foreach (array('gpt', 'claude', 'gemini') as $name) {
            if (empty($models[$name])) {
                continue;
            }
            $has_key = empty($models[$name]['error']) || $models[$name]['error'] !== 'API 키 없음';
            // 키가 있는 모델만 카운트
            if (!empty($models[$name]['error']) && $models[$name]['error'] === 'API 키 없음') {
                continue;
            }
            $key_count++;
            $op = bacara_ai_normalize_opinion($models[$name]['opinion']);
            if (!empty($models[$name]['error'])) {
                $op = 'WAIT';
            } else {
                $ok_count++;
            }
            $votes[] = $op;
            $conf = isset($models[$name]['confidence']) ? (int) $models[$name]['confidence'] : 0;
            $conf_sum[$op] += $conf;
        }

        $counts = array_count_values($votes);
        $best = 'WAIT';
        $best_n = 0;
        foreach (array('PLAYER', 'BANKER') as $side) {
            $n = isset($counts[$side]) ? (int) $counts[$side] : 0;
            if ($n > $best_n || ($n === $best_n && $n > 0 && $conf_sum[$side] > $conf_sum[$best])) {
                $best = $side;
                $best_n = $n;
            }
        }

        $agree = $best_n;
        $total = max(1, count($votes));
        $consensus = $agree . '/' . $total;
        $avg_conf = $agree > 0 ? (int) round($conf_sum[$best] / $agree) : 0;

        $best_pattern = null;
        if (!empty($stats['patterns']) && is_array($stats['patterns'])) {
            foreach ($stats['patterns'] as $p) {
                if ($best_pattern === null || $p['sample'] > $best_pattern['sample']) {
                    $best_pattern = $p;
                }
            }
        }
        $sample = $best_pattern ? (int) $best_pattern['sample'] : 0;
        $edge = 0.0;
        if ($best_pattern && $sample > 0) {
            $edge = abs((float) $best_pattern['p_rate'] - (float) $best_pattern['b_rate']);
        }

        $display = array(
            'final_opinion' => 'WAIT',
            'final_confidence' => max($avg_conf, 40),
            'consensus' => $consensus,
            'decision_reason' => '관망',
            'auto_bet_ok' => false,
        );

        if ($agree < 2) {
            $display['decision_reason'] = '모델 의견 불일치 → 관망';
            return $display;
        }
        if ($avg_conf < 55) {
            $display['final_confidence'] = $avg_conf;
            $display['decision_reason'] = '신뢰도 부족(' . $avg_conf . '%) → 관망';
            return $display;
        }
        if ($sample < 20) {
            $display['final_confidence'] = $avg_conf;
            $display['decision_reason'] = '패턴 표본 부족(n=' . $sample . ') → 관망';
            return $display;
        }
        if ($edge < 0.08) {
            $display['final_confidence'] = $avg_conf;
            $display['decision_reason'] = '통계 우위 미미 → 관망';
            return $display;
        }

        $display['final_opinion'] = $best;
        $display['final_confidence'] = min(90, $avg_conf);
        $display['decision_reason'] = '다수결 ' . $consensus . ' · 표본 ' . $sample;

        // 자동 베팅: 3개 키 모두 등록·정상 + 더 엄격한 기준
        $auto_ok = true;
        $auto_reason = '';
        if (!bacara_ai_config_has_key('openai')
            || !bacara_ai_config_has_key('anthropic')
            || !bacara_ai_config_has_key('gemini')
        ) {
            $auto_ok = false;
            $auto_reason = '3개 API 키 모두 필요';
        } elseif ($ok_count < 3) {
            $auto_ok = false;
            $auto_reason = 'AI 호출 일부 실패';
        } elseif ($agree < 2) {
            $auto_ok = false;
            $auto_reason = '다수결 미달';
        } elseif ($avg_conf < 65) {
            $auto_ok = false;
            $auto_reason = '자동베팅 신뢰도 부족(' . $avg_conf . '%<65%)';
        } elseif ($sample < 30) {
            $auto_ok = false;
            $auto_reason = '자동베팅 표본 부족(n=' . $sample . '<30)';
        } elseif ($edge < 0.10) {
            $auto_ok = false;
            $auto_reason = '자동베팅 통계 우위 부족';
        }

        if ($auto_ok && bacara_ai_config_is_auto_bet_enabled()) {
            $display['auto_bet_ok'] = true;
            $display['decision_reason'] .= ' · AI 자동베팅 가능';
        } elseif ($auto_ok && !bacara_ai_config_is_auto_bet_enabled()) {
            $display['decision_reason'] .= ' · 관리자 자동베팅 OFF';
        } else {
            $display['decision_reason'] .= ' · ' . ($auto_reason !== '' ? $auto_reason : '자동베팅 보류');
        }

        return $display;
    }
}

if (!function_exists('bacara_ai_parse_provider_response')) {
    function bacara_ai_parse_provider_response($provider, array $res, $ms)
    {
        $tokens = array('input' => 0, 'output' => 0, 'total' => 0);
        if (!$res['ok']) {
            $label = $provider === 'openai' ? 'OpenAI' : ($provider === 'anthropic' ? 'Claude' : 'Gemini');
            return array(
                'opinion' => 'WAIT',
                'confidence' => 0,
                'reasons' => array(),
                'ms' => $ms,
                'error' => $res['error'] ?: ($label . ' 호출 실패'),
                'tokens' => $tokens,
                'raw_json' => null,
            );
        }
        $json = json_decode($res['raw'], true);
        if (function_exists('bacara_ai_usage_extract_tokens')) {
            $tokens = bacara_ai_usage_extract_tokens($provider, $json);
        }
        $text = '';
        if ($provider === 'openai') {
            if (isset($json['choices'][0]['message']['content'])) {
                $text = $json['choices'][0]['message']['content'];
            }
        } elseif ($provider === 'anthropic') {
            if (!empty($json['content']) && is_array($json['content'])) {
                foreach ($json['content'] as $block) {
                    if (isset($block['type']) && $block['type'] === 'text' && isset($block['text'])) {
                        $text .= $block['text'];
                    }
                }
            }
        } else {
            if (isset($json['candidates'][0]['content']['parts'][0]['text'])) {
                $text = $json['candidates'][0]['content']['parts'][0]['text'];
            }
        }
        $parsed = bacara_ai_parse_model_json($text);
        if (!$parsed) {
            return array(
                'opinion' => 'WAIT',
                'confidence' => 0,
                'reasons' => array(),
                'ms' => $ms,
                'error' => '응답 파싱 실패',
                'tokens' => $tokens,
                'raw_json' => $json,
            );
        }
        if ($parsed['abstain']) {
            $parsed['opinion'] = 'WAIT';
        }
        return array(
            'opinion' => $parsed['opinion'],
            'confidence' => $parsed['confidence'],
            'reasons' => $parsed['reasons'],
            'ms' => $ms,
            'error' => '',
            'tokens' => $tokens,
            'raw_json' => $json,
        );
    }
}

if (!function_exists('bacara_ai_call_models_parallel')) {
    /**
     * GPT / Claude / Gemini 병렬 호출
     *
     * @return array{gpt:array,claude:array,gemini:array}
     */
    function bacara_ai_call_models_parallel(array $stats, $purpose = 'analyze', $table_name = '')
    {
        $empty = array('opinion' => 'WAIT', 'confidence' => 0, 'reasons' => array('키 없음'), 'ms' => 0, 'error' => 'API 키 없음');
        $out = array('gpt' => $empty, 'claude' => $empty, 'gemini' => $empty);
        list($system, $user) = bacara_ai_prompt_messages($stats);

        $jobs = array();
        if (bacara_ai_config_has_key('openai')) {
            $model = bacara_ai_config_get('openai_model', 'gpt-4o-mini');
            $jobs['gpt'] = array(
                'provider' => 'openai',
                'model' => $model,
                'url' => 'https://api.openai.com/v1/chat/completions',
                'headers' => array(
                    'Content-Type: application/json',
                    'Authorization: Bearer ' . bacara_ai_config_get('openai_api_key'),
                ),
                'body' => json_encode(array(
                    'model' => $model,
                    'temperature' => 0.2,
                    'response_format' => array('type' => 'json_object'),
                    'messages' => array(
                        array('role' => 'system', 'content' => $system),
                        array('role' => 'user', 'content' => $user),
                    ),
                ), JSON_UNESCAPED_UNICODE),
            );
        }
        if (bacara_ai_config_has_key('anthropic')) {
            $model = bacara_ai_config_get('anthropic_model', 'claude-sonnet-4-20250514');
            $jobs['claude'] = array(
                'provider' => 'anthropic',
                'model' => $model,
                'url' => 'https://api.anthropic.com/v1/messages',
                'headers' => array(
                    'Content-Type: application/json',
                    'x-api-key: ' . bacara_ai_config_get('anthropic_api_key'),
                    'anthropic-version: 2023-06-01',
                ),
                'body' => json_encode(array(
                    'model' => $model,
                    'max_tokens' => 400,
                    'temperature' => 0.2,
                    'system' => $system,
                    'messages' => array(
                        array('role' => 'user', 'content' => $user),
                    ),
                ), JSON_UNESCAPED_UNICODE),
            );
        }
        if (bacara_ai_config_has_key('gemini')) {
            $model = bacara_ai_config_get('gemini_model', 'gemini-2.0-flash');
            $jobs['gemini'] = array(
                'provider' => 'gemini',
                'model' => $model,
                'url' => 'https://generativelanguage.googleapis.com/v1beta/models/'
                    . rawurlencode($model)
                    . ':generateContent?key='
                    . rawurlencode(bacara_ai_config_get('gemini_api_key')),
                'headers' => array('Content-Type: application/json'),
                'body' => json_encode(array(
                    'systemInstruction' => array(
                        'parts' => array(array('text' => $system)),
                    ),
                    'contents' => array(
                        array(
                            'role' => 'user',
                            'parts' => array(array('text' => $user)),
                        ),
                    ),
                    'generationConfig' => array(
                        'temperature' => 0.2,
                        'responseMimeType' => 'application/json',
                    ),
                ), JSON_UNESCAPED_UNICODE),
            );
        }

        if (!$jobs) {
            return $out;
        }

        $mh = curl_multi_init();
        $handles = array();
        $started = array();
        foreach ($jobs as $name => $job) {
            $ch = curl_init($job['url']);
            curl_setopt_array($ch, array(
                CURLOPT_POST => true,
                CURLOPT_HTTPHEADER => $job['headers'],
                CURLOPT_POSTFIELDS => $job['body'],
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_CONNECTTIMEOUT => 5,
                CURLOPT_TIMEOUT => 14,
            ));
            curl_multi_add_handle($mh, $ch);
            $handles[$name] = $ch;
            $started[$name] = microtime(true);
        }

        $running = null;
        do {
            $status = curl_multi_exec($mh, $running);
            if ($running) {
                curl_multi_select($mh, 1.0);
            }
        } while ($running && $status === CURLM_OK);

        foreach ($handles as $name => $ch) {
            $raw = curl_multi_getcontent($ch);
            $errno = curl_errno($ch);
            $error = curl_error($ch);
            $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $ms = (int) round((microtime(true) - $started[$name]) * 1000);
            curl_multi_remove_handle($mh, $ch);
            curl_close($ch);

            $res = array(
                'ok' => $errno === 0 && $code >= 200 && $code < 300,
                'code' => $code,
                'raw' => $raw === false || $raw === null ? '' : $raw,
                'error' => $errno ? $error : ($code >= 400 ? 'HTTP ' . $code : ''),
            );
            $parsed = bacara_ai_parse_provider_response($jobs[$name]['provider'], $res, $ms);
            $out[$name] = $parsed;

            if (function_exists('bacara_ai_usage_log')) {
                $tok = isset($parsed['tokens']) ? $parsed['tokens'] : array('input' => 0, 'output' => 0);
                bacara_ai_usage_log(array(
                    'provider' => $jobs[$name]['provider'],
                    'model' => isset($jobs[$name]['model']) ? $jobs[$name]['model'] : '',
                    'purpose' => $purpose,
                    'table_name' => $table_name,
                    'input_tokens' => isset($tok['input']) ? $tok['input'] : 0,
                    'output_tokens' => isset($tok['output']) ? $tok['output'] : 0,
                    'ms' => $ms,
                    'ok' => $parsed['error'] === '' ? 1 : 0,
                    'error' => $parsed['error'],
                ));
            }
        }
        curl_multi_close($mh);

        return $out;
    }
}

if (!function_exists('bacara_ai_reasons_to_text')) {
    function bacara_ai_reasons_to_text($reasons)
    {
        if (!is_array($reasons)) {
            return '';
        }
        $clean = array();
        foreach ($reasons as $r) {
            $r = trim((string) $r);
            if ($r !== '') {
                $clean[] = $r;
            }
        }
        return implode("\n", array_slice($clean, 0, 4));
    }
}

if (!function_exists('bacara_ai_reasons_from_text')) {
    function bacara_ai_reasons_from_text($text)
    {
        $text = trim((string) $text);
        if ($text === '') {
            return array();
        }
        return array_values(array_filter(array_map('trim', preg_split("/\r\n|\n|\r/", $text))));
    }
}

if (!function_exists('bacara_ai_get_cached_prediction')) {
    function bacara_ai_get_cached_prediction($table_name, $source_result_id)
    {
        bacara_ai_install_tables();
        $table = bacara_ai_prediction_table();
        $safe_table = sql_real_escape_string(strtoupper(trim($table_name)));
        $sid = (int) $source_result_id;
        return sql_fetch(
            " select * from `{$table}`
               where table_name = '{$safe_table}'
                 and source_result_id = {$sid}
               limit 1 "
        );
    }
}

if (!function_exists('bacara_ai_save_prediction')) {
    function bacara_ai_save_prediction(array $row)
    {
        bacara_ai_install_tables();
        $table = bacara_ai_prediction_table();
        $now = G5_TIME_YMDHIS;

        $safe_table = sql_real_escape_string($row['table_name']);
        $source_id = (int) $row['source_result_id'];
        $game_no = isset($row['game_no']) && $row['game_no'] !== null ? (int) $row['game_no'] : 'NULL';
        $mode = sql_real_escape_string(isset($row['mode']) ? $row['mode'] : 'shadow');
        $stats_json = sql_real_escape_string($row['stats_json']);

        $fields = array('gpt', 'claude', 'gemini');
        $cols = array();
        foreach ($fields as $f) {
            $cols[$f . '_opinion'] = sql_real_escape_string($row[$f . '_opinion']);
            $cols[$f . '_confidence'] = (int) $row[$f . '_confidence'];
            $cols[$f . '_reasons'] = sql_real_escape_string($row[$f . '_reasons']);
            $cols[$f . '_ms'] = (int) $row[$f . '_ms'];
            $cols[$f . '_error'] = sql_real_escape_string($row[$f . '_error']);
        }

        $final_opinion = sql_real_escape_string($row['final_opinion']);
        $final_confidence = (int) $row['final_confidence'];
        $consensus = sql_real_escape_string($row['consensus']);
        $decision_reason = sql_real_escape_string($row['decision_reason']);

        $game_sql = $game_no === 'NULL' ? 'NULL' : $game_no;

        $sql = " insert into `{$table}`
                    set table_name = '{$safe_table}',
                        source_result_id = {$source_id},
                        game_no = {$game_sql},
                        mode = '{$mode}',
                        stats_json = '{$stats_json}',
                        gpt_opinion = '{$cols['gpt_opinion']}',
                        gpt_confidence = {$cols['gpt_confidence']},
                        gpt_reasons = '{$cols['gpt_reasons']}',
                        gpt_ms = {$cols['gpt_ms']},
                        gpt_error = '{$cols['gpt_error']}',
                        claude_opinion = '{$cols['claude_opinion']}',
                        claude_confidence = {$cols['claude_confidence']},
                        claude_reasons = '{$cols['claude_reasons']}',
                        claude_ms = {$cols['claude_ms']},
                        claude_error = '{$cols['claude_error']}',
                        gemini_opinion = '{$cols['gemini_opinion']}',
                        gemini_confidence = {$cols['gemini_confidence']},
                        gemini_reasons = '{$cols['gemini_reasons']}',
                        gemini_ms = {$cols['gemini_ms']},
                        gemini_error = '{$cols['gemini_error']}',
                        final_opinion = '{$final_opinion}',
                        final_confidence = {$final_confidence},
                        consensus = '{$consensus}',
                        decision_reason = '{$decision_reason}',
                        created_at = '{$now}'
                 on duplicate key update
                        game_no = VALUES(game_no),
                        mode = VALUES(mode),
                        stats_json = VALUES(stats_json),
                        gpt_opinion = VALUES(gpt_opinion),
                        gpt_confidence = VALUES(gpt_confidence),
                        gpt_reasons = VALUES(gpt_reasons),
                        gpt_ms = VALUES(gpt_ms),
                        gpt_error = VALUES(gpt_error),
                        claude_opinion = VALUES(claude_opinion),
                        claude_confidence = VALUES(claude_confidence),
                        claude_reasons = VALUES(claude_reasons),
                        claude_ms = VALUES(claude_ms),
                        claude_error = VALUES(claude_error),
                        gemini_opinion = VALUES(gemini_opinion),
                        gemini_confidence = VALUES(gemini_confidence),
                        gemini_reasons = VALUES(gemini_reasons),
                        gemini_ms = VALUES(gemini_ms),
                        gemini_error = VALUES(gemini_error),
                        final_opinion = VALUES(final_opinion),
                        final_confidence = VALUES(final_confidence),
                        consensus = VALUES(consensus),
                        decision_reason = VALUES(decision_reason) ";

        return sql_query($sql, false);
    }
}

if (!function_exists('bacara_ai_settle_open_predictions')) {
    function bacara_ai_settle_open_predictions($table_name, array $history_rows)
    {
        bacara_ai_install_tables();
        $table = bacara_ai_prediction_table();
        $safe_table = sql_real_escape_string(strtoupper(trim($table_name)));

        $by_id = array();
        foreach ($history_rows as $row) {
            $by_id[(int) $row['id']] = strtoupper($row['result']);
        }
        $ids = array_keys($by_id);
        sort($ids, SORT_NUMERIC);

        $open = sql_query(
            " select id, source_result_id, final_opinion
                from `{$table}`
               where table_name = '{$safe_table}'
                 and hit is null
               order by source_result_id asc
               limit 50 ",
            false
        );
        if (!$open) {
            return 0;
        }

        $settled = 0;
        $now = G5_TIME_YMDHIS;
        while ($row = sql_fetch_array($open)) {
            $sid = (int) $row['source_result_id'];
            $actual = null;
            foreach ($ids as $id) {
                if ($id > $sid) {
                    $actual = $by_id[$id];
                    break;
                }
            }
            if ($actual === null) {
                continue;
            }
            // Tie = 무효(적중 판정 제외)
            if ($actual === 'T') {
                $hit = 'NULL';
            } else {
                $predicted = bacara_ai_normalize_opinion($row['final_opinion']);
                if ($predicted === 'WAIT') {
                    $hit = 'NULL';
                } else {
                    $mapped = $predicted === 'PLAYER' ? 'P' : 'B';
                    $hit = ($mapped === $actual) ? '1' : '0';
                }
            }
            $pid = (int) $row['id'];
            $actual_esc = sql_real_escape_string($actual);
            $hit_sql = $hit === 'NULL' ? 'NULL' : $hit;
            sql_query(
                " update `{$table}`
                     set actual_result = '{$actual_esc}',
                         hit = {$hit_sql},
                         settled_at = '{$now}'
                   where id = {$pid} ",
                false
            );
            $settled++;
        }
        return $settled;
    }
}

if (!function_exists('bacara_ai_accuracy_summary')) {
    function bacara_ai_accuracy_summary($table_name = '')
    {
        bacara_ai_install_tables();
        $table = bacara_ai_prediction_table();
        $where = " where hit is not null and final_opinion in ('PLAYER','BANKER') ";
        if ($table_name !== '') {
            $safe = sql_real_escape_string(strtoupper(trim($table_name)));
            $where .= " and table_name = '{$safe}' ";
        }
        $row = sql_fetch(
            " select count(*) as cnt,
                     sum(case when hit = 1 then 1 else 0 end) as hits
                from `{$table}`
                {$where} "
        );
        $cnt = isset($row['cnt']) ? (int) $row['cnt'] : 0;
        $hits = isset($row['hits']) ? (int) $row['hits'] : 0;
        return array(
            'settled' => $cnt,
            'hits' => $hits,
            'rate' => $cnt > 0 ? round($hits / $cnt, 4) : null,
        );
    }
}

if (!function_exists('bacara_ai_row_to_public')) {
    function bacara_ai_row_to_public(array $row, ?array $stats = null, $cached = false)
    {
        $model = function ($prefix) use ($row) {
            $error = isset($row[$prefix . '_error']) ? $row[$prefix . '_error'] : '';
            return array(
                'status' => $error !== '' ? '오류' : '분석 완료',
                'opinion' => bacara_ai_normalize_opinion($row[$prefix . '_opinion']),
                'confidence' => (int) $row[$prefix . '_confidence'],
                'responseTime' => round(((int) $row[$prefix . '_ms']) / 1000, 2),
                'reasons' => bacara_ai_reasons_from_text(isset($row[$prefix . '_reasons']) ? $row[$prefix . '_reasons'] : ''),
                'error' => $error,
            );
        };

        $final = bacara_ai_normalize_opinion($row['final_opinion']);
        $stats_decoded = $stats !== null
            ? $stats
            : (isset($row['stats_json']) ? json_decode($row['stats_json'], true) : null);
        if (!is_array($stats_decoded)) {
            $stats_decoded = array();
        }

        // 캐시 행에서도 자동베팅 가능 여부를 현재 설정·엄격 기준으로 재평가
        $models = array(
            'gpt' => array(
                'opinion' => $row['gpt_opinion'],
                'confidence' => (int) $row['gpt_confidence'],
                'error' => isset($row['gpt_error']) ? $row['gpt_error'] : '',
            ),
            'claude' => array(
                'opinion' => $row['claude_opinion'],
                'confidence' => (int) $row['claude_confidence'],
                'error' => isset($row['claude_error']) ? $row['claude_error'] : '',
            ),
            'gemini' => array(
                'opinion' => $row['gemini_opinion'],
                'confidence' => (int) $row['gemini_confidence'],
                'error' => isset($row['gemini_error']) ? $row['gemini_error'] : '',
            ),
        );
        $reeval = bacara_ai_decide_final($models, $stats_decoded);
        $auto_bet = !empty($reeval['auto_bet_ok'])
            && ($final === 'PLAYER' || $final === 'BANKER');

        $mode = $auto_bet ? 'live' : (isset($row['mode']) ? $row['mode'] : 'shadow');

        return array(
            'ok' => true,
            'cached' => (bool) $cached,
            'mode' => $mode,
            'auto_bet_allowed' => $auto_bet,
            'auto_bet_enabled' => bacara_ai_config_is_auto_bet_enabled(),
            'table_name' => $row['table_name'],
            'source_result_id' => (int) $row['source_result_id'],
            'game_no' => isset($row['game_no']) ? (int) $row['game_no'] : null,
            'stats' => $stats_decoded,
            'gpt' => $model('gpt'),
            'claude' => $model('claude'),
            'gemini' => $model('gemini'),
            'finalOpinion' => $final,
            'finalConfidence' => (int) $row['final_confidence'],
            'consensus' => $row['consensus'],
            'decisionReason' => $row['decision_reason'],
            'appliedRule' => $row['decision_reason'],
            'accuracy' => bacara_ai_accuracy_summary($row['table_name']),
            'created_at' => isset($row['created_at']) ? $row['created_at'] : null,
        );
    }
}

if (!function_exists('bacara_ai_analyze_table')) {
    /**
     * 테이블 분석 (캐시 우선). 조건 충족 시 auto_bet_allowed=true.
     */
    function bacara_ai_analyze_table($table_name, $force = false)
    {
        bacara_ai_install_tables();
        $table_name = strtoupper(trim($table_name));

        if (!bacara_ai_config_is_enabled()) {
            return array(
                'ok' => false,
                'message' => 'AI 분석이 관리자 설정에서 비활성화되어 있습니다.',
            );
        }

        $has_any_key = bacara_ai_config_has_key('openai')
            || bacara_ai_config_has_key('anthropic')
            || bacara_ai_config_has_key('gemini');
        if (!$has_any_key) {
            return array(
                'ok' => false,
                'message' => '등록된 AI API 키가 없습니다. 관리자에서 키를 입력해 주세요.',
            );
        }

        $lock_path = G5_DATA_PATH . '/bacaraai-ai-' . preg_replace('/[^A-Z0-9_-]/', '', $table_name) . '.lock';
        $lock_fp = @fopen($lock_path, 'c');
        if ($lock_fp) {
            if (!flock($lock_fp, LOCK_EX | LOCK_NB)) {
                // 다른 요청이 분석 중이면 잠시 대기 후 캐시 우선
                flock($lock_fp, LOCK_EX);
            }
        }

        try {
            $fetched = bacara_ai_fetch_table_history($table_name, 2000);
            if (!$fetched['ok']) {
                return array('ok' => false, 'message' => $fetched['error'] ?: '이력 조회 실패');
            }
            if (empty($fetched['shoe'])) {
                return array('ok' => false, 'message' => '분석할 결과가 없습니다.');
            }

            bacara_ai_settle_open_predictions($table_name, $fetched['history']);

            $stats = bacara_ai_build_stats($fetched['shoe'], $fetched['history']);
            $latest = $stats['latest'];
            if (!$latest) {
                return array('ok' => false, 'message' => '최신 결과가 없습니다.');
            }

            $source_id = (int) $latest['id'];
            if (!$force) {
                $cached = bacara_ai_get_cached_prediction($table_name, $source_id);
                if ($cached) {
                    return bacara_ai_row_to_public($cached, $stats, true);
                }
            }

            $models = bacara_ai_call_models_parallel($stats, 'analyze', $table_name);
            $gpt = $models['gpt'];
            $claude = $models['claude'];
            $gemini = $models['gemini'];

            $decision = bacara_ai_decide_final($models, $stats);
            $mode = !empty($decision['auto_bet_ok']) ? 'live' : 'shadow';

            $save = array(
                'table_name' => $table_name,
                'source_result_id' => $source_id,
                'game_no' => $latest['game_no'],
                'mode' => $mode,
                'stats_json' => json_encode($stats, JSON_UNESCAPED_UNICODE),
                'gpt_opinion' => $gpt['opinion'],
                'gpt_confidence' => $gpt['confidence'],
                'gpt_reasons' => bacara_ai_reasons_to_text($gpt['reasons']),
                'gpt_ms' => $gpt['ms'],
                'gpt_error' => $gpt['error'],
                'claude_opinion' => $claude['opinion'],
                'claude_confidence' => $claude['confidence'],
                'claude_reasons' => bacara_ai_reasons_to_text($claude['reasons']),
                'claude_ms' => $claude['ms'],
                'claude_error' => $claude['error'],
                'gemini_opinion' => $gemini['opinion'],
                'gemini_confidence' => $gemini['confidence'],
                'gemini_reasons' => bacara_ai_reasons_to_text($gemini['reasons']),
                'gemini_ms' => $gemini['ms'],
                'gemini_error' => $gemini['error'],
                'final_opinion' => $decision['final_opinion'],
                'final_confidence' => $decision['final_confidence'],
                'consensus' => $decision['consensus'],
                'decision_reason' => $decision['decision_reason'],
            );

            bacara_ai_save_prediction($save);
            $row = bacara_ai_get_cached_prediction($table_name, $source_id);
            if (!$row) {
                $row = $save;
                $row['created_at'] = G5_TIME_YMDHIS;
            }

            return bacara_ai_row_to_public($row, $stats, false);
        } finally {
            if ($lock_fp) {
                flock($lock_fp, LOCK_UN);
                fclose($lock_fp);
            }
        }
    }
}

if (!function_exists('bacara_ai_build_session_stats')) {
    function bacara_ai_build_session_stats(array $payload)
    {
        $bets = isset($payload['bets']) && is_array($payload['bets']) ? $payload['bets'] : array();
        $bets = array_slice($bets, 0, 40);

        $wins = 0;
        $losses = 0;
        $ties = 0;
        $auto_w = 0;
        $auto_l = 0;
        $manual_w = 0;
        $manual_l = 0;
        $ai_hits = 0;
        $ai_miss = 0;
        $max_martin = 1;
        $streak = 0;
        $best_streak = 0;
        $worst_streak = 0;
        $cur_win = 0;
        $cur_loss = 0;

        foreach ($bets as $b) {
            $pnl = isset($b['pnl']) ? (int) $b['pnl'] : 0;
            $src = isset($b['source']) ? (string) $b['source'] : '';
            $martin = isset($b['martin']) ? (int) $b['martin'] : 1;
            if ($martin > $max_martin) {
                $max_martin = $martin;
            }
            if ($pnl > 0) {
                $wins++;
                $cur_win++;
                $cur_loss = 0;
                if ($cur_win > $best_streak) {
                    $best_streak = $cur_win;
                }
                if ($src === 'auto') {
                    $auto_w++;
                } elseif ($src === 'manual') {
                    $manual_w++;
                }
            } elseif ($pnl < 0) {
                $losses++;
                $cur_loss++;
                $cur_win = 0;
                if ($cur_loss > $worst_streak) {
                    $worst_streak = $cur_loss;
                }
                if ($src === 'auto') {
                    $auto_l++;
                } elseif ($src === 'manual') {
                    $manual_l++;
                }
            } else {
                $ties++;
            }

            $final = isset($b['final_opinion']) ? strtoupper((string) $b['final_opinion']) : '';
            $actual = isset($b['result']) ? strtoupper((string) $b['result']) : '';
            if (($final === 'PLAYER' || $final === 'BANKER') && ($actual === 'P' || $actual === 'B')) {
                $mapped = $final === 'PLAYER' ? 'P' : 'B';
                if ($mapped === $actual) {
                    $ai_hits++;
                } else {
                    $ai_miss++;
                }
            }
        }

        return array(
            'pnl' => isset($payload['pnl']) ? (int) $payload['pnl'] : 0,
            'stop_type' => isset($payload['stop_type']) ? (string) $payload['stop_type'] : 'manual',
            'strategy' => isset($payload['strategy']) ? (string) $payload['strategy'] : '',
            'martin_stage' => isset($payload['martin_stage']) ? (int) $payload['martin_stage'] : 1,
            'max_martin' => isset($payload['max_martin']) ? (int) $payload['max_martin'] : 6,
            'win_cut' => isset($payload['win_cut']) ? (int) $payload['win_cut'] : 0,
            'loss_cut' => isset($payload['loss_cut']) ? (int) $payload['loss_cut'] : 0,
            'bet_count' => count($bets),
            'wins' => $wins,
            'losses' => $losses,
            'ties' => $ties,
            'auto_wins' => $auto_w,
            'auto_losses' => $auto_l,
            'manual_wins' => $manual_w,
            'manual_losses' => $manual_l,
            'ai_hits' => $ai_hits,
            'ai_miss' => $ai_miss,
            'peak_martin' => $max_martin,
            'best_win_streak' => $best_streak,
            'worst_loss_streak' => $worst_streak,
            'bets' => $bets,
        );
    }
}

if (!function_exists('bacara_ai_session_retrospective')) {
    /**
     * 세션 복기: 서버 통계 + (가능하면) 1개 LLM 요약
     */
    function bacara_ai_session_retrospective(array $payload)
    {
        $stats = bacara_ai_build_session_stats($payload);

        $summary_lines = array();
        $summary_lines[] = '세션 손익 ' . number_format($stats['pnl']) . '원';
        $summary_lines[] = '승 ' . $stats['wins'] . ' / 패 ' . $stats['losses'] . ' (총 ' . $stats['bet_count'] . '건)';
        if ($stats['auto_wins'] + $stats['auto_losses'] > 0) {
            $summary_lines[] = '오토 승패 ' . $stats['auto_wins'] . ':' . $stats['auto_losses'];
        }
        if ($stats['manual_wins'] + $stats['manual_losses'] > 0) {
            $summary_lines[] = '직접 승패 ' . $stats['manual_wins'] . ':' . $stats['manual_losses'];
        }
        if ($stats['ai_hits'] + $stats['ai_miss'] > 0) {
            $hit_rate = round($stats['ai_hits'] / max(1, $stats['ai_hits'] + $stats['ai_miss']) * 100);
            $summary_lines[] = 'AI 방향 적중 ' . $stats['ai_hits'] . '/' . ($stats['ai_hits'] + $stats['ai_miss']) . ' (' . $hit_rate . '%)';
        }
        $summary_lines[] = '최고 마틴 ' . $stats['peak_martin'] . '단계 · 최장 연패 ' . $stats['worst_loss_streak'];

        $tips = array();
        if ($stats['stop_type'] === 'losscut') {
            $tips[] = '로스컷으로 종료되었습니다. 다음 세션은 초기 금액 또는 최대 마틴을 낮춰 보세요.';
        } elseif ($stats['stop_type'] === 'wincut') {
            $tips[] = '윈컷 달성입니다. 같은 한도로 짧게 운영하는 습관을 유지하세요.';
        }
        if ($stats['worst_loss_streak'] >= 3) {
            $tips[] = '연패가 ' . $stats['worst_loss_streak'] . '회까지 이어졌습니다. 연속 패배 시 관망 규칙을 추가하세요.';
        }
        if ($stats['peak_martin'] >= max(3, (int) ceil($stats['max_martin'] * 0.7))) {
            $tips[] = '마틴이 높게 올라갔습니다. 최대 단계를 줄이거나 패턴 조건을 더 엄격히 하세요.';
        }
        if ($stats['auto_losses'] > $stats['auto_wins'] && ($stats['auto_wins'] + $stats['auto_losses']) >= 4) {
            $tips[] = '오토 성과가 저조합니다. AI 추천과 패턴 전략을 비교해 보세요.';
        }
        if ($stats['ai_hits'] + $stats['ai_miss'] >= 5) {
            $rate = $stats['ai_hits'] / max(1, $stats['ai_hits'] + $stats['ai_miss']);
            if ($rate < 0.45) {
                $tips[] = '이번 세션 AI 방향 적중률이 낮습니다. 자동 베팅보다 참고용으로만 쓰는 것이 안전합니다.';
            } elseif ($rate >= 0.55) {
                $tips[] = 'AI 방향 적중률이 양호했습니다. 다만 표본이 적으면 다음 세션에도 검증이 필요합니다.';
            }
        }
        if (!$tips) {
            $tips[] = '기록이 충분해지면 더 구체적인 개선안을 제안할 수 있습니다.';
        }

            $ai_text = '';
            $ai_provider = '';
            if (bacara_ai_config_is_enabled() && $stats['bet_count'] > 0) {
            $prompt_stats = $stats;
            unset($prompt_stats['bets']);
            $prompt_stats['recent_bets'] = array_slice($stats['bets'], 0, 15);

            $system = 'You are a baccarat session coach for Korean users. '
                . 'Be concise, practical, and cautious. Do not promise future wins. '
                . 'Return ONLY JSON: {"headline":"...","analysis":["..."],"next_actions":["..."]} '
                . 'Use Korean. Max 3 analysis bullets and 3 next_actions.';
            $user = "SESSION_STATS:\n" . json_encode($prompt_stats, JSON_UNESCAPED_UNICODE);

            $call = null;
            if (bacara_ai_config_has_key('openai')) {
                $key = bacara_ai_config_get('openai_api_key');
                $model = bacara_ai_config_get('openai_model', 'gpt-4o-mini');
                $body = json_encode(array(
                    'model' => $model,
                    'temperature' => 0.3,
                    'response_format' => array('type' => 'json_object'),
                    'messages' => array(
                        array('role' => 'system', 'content' => $system),
                        array('role' => 'user', 'content' => $user),
                    ),
                ), JSON_UNESCAPED_UNICODE);
                $res = bacara_ai_http_json(
                    'https://api.openai.com/v1/chat/completions',
                    array('Content-Type: application/json', 'Authorization: Bearer ' . $key),
                    $body,
                    20
                );
                if (function_exists('bacara_ai_usage_log_http')) {
                    bacara_ai_usage_log_http('openai', $model, 'session_review', $res);
                }
                if ($res['ok']) {
                    $json = json_decode($res['raw'], true);
                    $text = isset($json['choices'][0]['message']['content']) ? $json['choices'][0]['message']['content'] : '';
                    $parsed = json_decode($text, true);
                    if (!is_array($parsed) && preg_match('/\{.*\}/s', $text, $m)) {
                        $parsed = json_decode($m[0], true);
                    }
                    if (is_array($parsed)) {
                        $call = $parsed;
                        $ai_provider = 'openai';
                    }
                }
            } elseif (bacara_ai_config_has_key('anthropic')) {
                $key = bacara_ai_config_get('anthropic_api_key');
                $model = bacara_ai_config_get('anthropic_model', 'claude-sonnet-4-20250514');
                $body = json_encode(array(
                    'model' => $model,
                    'max_tokens' => 500,
                    'temperature' => 0.3,
                    'system' => $system,
                    'messages' => array(array('role' => 'user', 'content' => $user)),
                ), JSON_UNESCAPED_UNICODE);
                $res = bacara_ai_http_json(
                    'https://api.anthropic.com/v1/messages',
                    array(
                        'Content-Type: application/json',
                        'x-api-key: ' . $key,
                        'anthropic-version: 2023-06-01',
                    ),
                    $body,
                    20
                );
                if (function_exists('bacara_ai_usage_log_http')) {
                    bacara_ai_usage_log_http('anthropic', $model, 'session_review', $res);
                }
                if ($res['ok']) {
                    $json = json_decode($res['raw'], true);
                    $text = '';
                    if (!empty($json['content']) && is_array($json['content'])) {
                        foreach ($json['content'] as $block) {
                            if (isset($block['text'])) {
                                $text .= $block['text'];
                            }
                        }
                    }
                    $parsed = json_decode($text, true);
                    if (!is_array($parsed) && preg_match('/\{.*\}/s', $text, $m)) {
                        $parsed = json_decode($m[0], true);
                    }
                    if (is_array($parsed)) {
                        $call = $parsed;
                        $ai_provider = 'claude';
                    }
                }
            } elseif (bacara_ai_config_has_key('gemini')) {
                $key = bacara_ai_config_get('gemini_api_key');
                $model = bacara_ai_config_get('gemini_model', 'gemini-2.0-flash');
                $url = 'https://generativelanguage.googleapis.com/v1beta/models/'
                    . rawurlencode($model) . ':generateContent?key=' . rawurlencode($key);
                $body = json_encode(array(
                    'systemInstruction' => array('parts' => array(array('text' => $system))),
                    'contents' => array(array('role' => 'user', 'parts' => array(array('text' => $user)))),
                    'generationConfig' => array('temperature' => 0.3, 'responseMimeType' => 'application/json'),
                ), JSON_UNESCAPED_UNICODE);
                $res = bacara_ai_http_json($url, array('Content-Type: application/json'), $body, 20);
                if (function_exists('bacara_ai_usage_log_http')) {
                    bacara_ai_usage_log_http('gemini', $model, 'session_review', $res);
                }
                if ($res['ok']) {
                    $json = json_decode($res['raw'], true);
                    $text = isset($json['candidates'][0]['content']['parts'][0]['text'])
                        ? $json['candidates'][0]['content']['parts'][0]['text']
                        : '';
                    $parsed = json_decode($text, true);
                    if (!is_array($parsed) && preg_match('/\{.*\}/s', $text, $m)) {
                        $parsed = json_decode($m[0], true);
                    }
                    if (is_array($parsed)) {
                        $call = $parsed;
                        $ai_provider = 'gemini';
                    }
                }
            }

            if (is_array($call)) {
                if (!empty($call['headline'])) {
                    $ai_text = trim((string) $call['headline']);
                }
                if (!empty($call['analysis']) && is_array($call['analysis'])) {
                    foreach ($call['analysis'] as $line) {
                        $line = trim((string) $line);
                        if ($line !== '') {
                            $summary_lines[] = $line;
                        }
                    }
                }
                if (!empty($call['next_actions']) && is_array($call['next_actions'])) {
                    $tips = array();
                    foreach ($call['next_actions'] as $line) {
                        $line = trim((string) $line);
                        if ($line !== '') {
                            $tips[] = $line;
                        }
                    }
                    if (!$tips) {
                        $tips[] = '다음 세션도 손절·익절 한도를 지켜 주세요.';
                    }
                }
            }
        }

        return array(
            'ok' => true,
            'headline' => $ai_text !== '' ? $ai_text : (
                $stats['pnl'] > 0 ? '수익으로 마감한 세션입니다' : (
                    $stats['pnl'] < 0 ? '손실로 마감한 세션입니다' : '손익 없는 세션입니다'
                )
            ),
            'summary' => array_slice($summary_lines, 0, 8),
            'tips' => array_slice($tips, 0, 4),
            'stats' => $stats,
            'provider' => $ai_provider,
        );
    }
}
