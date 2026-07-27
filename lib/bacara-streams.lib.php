<?php
/**
 * 바카라 AI — 테이블 라이브 스트림 공통 라이브러리
 *
 * - gameCode(공개) ↔ publish_key(OBS 비밀 경로) 분리
 * - 시청 세션 토큰
 * - 서버측 방송 상태(캐시)
 * - 장애 알림 훅
 */
if (!defined('_GNUBOARD_')) {
    exit;
}

if (!function_exists('bacara_streams_known_codes')) {
    function bacara_streams_known_codes()
    {
        return array(
            'MD2729', 'MD2710', 'MD2711', 'MD2712',
            'MD2713', 'MD2714', 'MD2715', 'MD2716',
        );
    }
}

if (!function_exists('bacara_streams_default_config')) {
    function bacara_streams_default_config()
    {
        return array(
            'enabled' => true,
            'media_origin' => 'https://media.aitablelive.com',
            /** HLS iframe 플레이어 */
            'player_template' => 'https://media.aitablelive.com/{PUBLISH_KEY}/',
            /** HLS playlist */
            'hls_template' => 'https://media.aitablelive.com/{PUBLISH_KEY}/index.m3u8',
            /** WebRTC 플레이어 (MediaMTX WHEP UI, 포트/경로 운영에 맞게 수정) */
            'webrtc_template' => 'https://media.aitablelive.com:8889/{PUBLISH_KEY}/',
            /** 하위 호환 */
            'url_template' => 'https://media.aitablelive.com/{STREAM_KEY}/index.m3u8',
            'tables' => array(),
            /**
             * OBS 송출 경로 키. 비어 있으면 gameCode 와 동일(하위 호환).
             * 운영에서는 무작위 키를 넣고 OBS 서버 URL에만 사용하세요.
             * 'MD2729' => 'pub_a1b2c3d4e5',
             */
            'publish_keys' => array(),
            /** 시청 토큰 HMAC 비밀값 — 비우면 G5 테이블 접두사 기반 파생 */
            'viewer_secret' => '',
            /** 시청 세션 유효(초) */
            'viewer_ttl' => 600,
            /** 상태 캐시(초) — 브라우저 반복 probe 대신 서버 캐시 */
            'status_cache_ttl' => 15,
            /** offline 지속 시 알림 (초) */
            'alert_offline_sec' => 90,
            /** 웹훅 URL (Slack/Telegram 등) — 비우면 로그만 */
            'alert_webhook' => '',
            /** cron 워커 키 */
            'watchdog_key' => '',
            /** MediaMTX HTTP API (선택) 예: http://127.0.0.1:9997 */
            'mediamtx_api' => '',
            /**
             * 시청을 동일 출처 프록시로만 제공 (권장 true)
             * iframe src = /plugin/bacara_wallet/stream/player.php?vt=...
             */
            'use_proxy_player' => true,
            /**
             * MediaMTX authHTTPAddress 연동 시 true
             * read: query vt=시청토큰 검증 / publish: 아래 계정
             */
            'mediamtx_auth_enabled' => false,
            'publish_user' => 'obs',
            'publish_pass' => '',
            /** bytesReceived 정체 시 정지 화면으로 판정 (초) */
            'stall_sec' => 45,
            /** 예상 지연 표시(초) */
            'latency_hls_sec' => 5,
            'latency_webrtc_sec' => 1,
        );
    }
}

if (!function_exists('bacara_streams_config_path')) {
    function bacara_streams_config_path()
    {
        return (defined('G5_DATA_PATH') ? G5_DATA_PATH : '') . '/bacaraai-streams.config.php';
    }
}

if (!function_exists('bacara_streams_invalidate_config')) {
    function bacara_streams_invalidate_config()
    {
        $GLOBALS['bacara_streams_cfg_cache'] = null;
    }
}

if (!function_exists('bacara_streams_load_config')) {
    function bacara_streams_load_config()
    {
        if (isset($GLOBALS['bacara_streams_cfg_cache']) && is_array($GLOBALS['bacara_streams_cfg_cache'])) {
            return $GLOBALS['bacara_streams_cfg_cache'];
        }
        $cfg = bacara_streams_default_config();
        $file = bacara_streams_config_path();
        if ($file && is_file($file)) {
            $loaded = include $file;
            if (is_array($loaded)) {
                $cfg = array_merge($cfg, $loaded);
            }
        }
        $GLOBALS['bacara_streams_cfg_cache'] = $cfg;
        return $cfg;
    }
}

if (!function_exists('bacara_streams_export_config_php')) {
    function bacara_streams_export_config_php($cfg)
    {
        $export = array(
            'enabled' => !empty($cfg['enabled']),
            'media_origin' => isset($cfg['media_origin']) ? (string) $cfg['media_origin'] : '',
            'player_template' => isset($cfg['player_template']) ? (string) $cfg['player_template'] : '',
            'hls_template' => isset($cfg['hls_template']) ? (string) $cfg['hls_template'] : '',
            'webrtc_template' => isset($cfg['webrtc_template']) ? (string) $cfg['webrtc_template'] : '',
            'url_template' => isset($cfg['url_template']) ? (string) $cfg['url_template'] : '',
            'tables' => isset($cfg['tables']) && is_array($cfg['tables']) ? $cfg['tables'] : array(),
            'publish_keys' => isset($cfg['publish_keys']) && is_array($cfg['publish_keys']) ? $cfg['publish_keys'] : array(),
            'viewer_secret' => isset($cfg['viewer_secret']) ? (string) $cfg['viewer_secret'] : '',
            'viewer_ttl' => isset($cfg['viewer_ttl']) ? (int) $cfg['viewer_ttl'] : 600,
            'status_cache_ttl' => isset($cfg['status_cache_ttl']) ? (int) $cfg['status_cache_ttl'] : 12,
            'alert_offline_sec' => isset($cfg['alert_offline_sec']) ? (int) $cfg['alert_offline_sec'] : 90,
            'alert_webhook' => isset($cfg['alert_webhook']) ? (string) $cfg['alert_webhook'] : '',
            'watchdog_key' => isset($cfg['watchdog_key']) ? (string) $cfg['watchdog_key'] : '',
            'mediamtx_api' => isset($cfg['mediamtx_api']) ? (string) $cfg['mediamtx_api'] : '',
            'use_proxy_player' => !empty($cfg['use_proxy_player']),
            'mediamtx_auth_enabled' => !empty($cfg['mediamtx_auth_enabled']),
            'publish_user' => isset($cfg['publish_user']) ? (string) $cfg['publish_user'] : 'obs',
            'publish_pass' => isset($cfg['publish_pass']) ? (string) $cfg['publish_pass'] : '',
            'stall_sec' => isset($cfg['stall_sec']) ? (int) $cfg['stall_sec'] : 45,
            'latency_hls_sec' => isset($cfg['latency_hls_sec']) ? (int) $cfg['latency_hls_sec'] : 5,
            'latency_webrtc_sec' => isset($cfg['latency_webrtc_sec']) ? (int) $cfg['latency_webrtc_sec'] : 1,
        );
        $php = "<?php\n";
        $php .= "/**\n * Auto-saved by admin stream console\n * Do not commit secrets to git.\n */\n";
        $php .= "if (!defined('_GNUBOARD_')) {\n    exit;\n}\n\n";
        $php .= 'return ' . var_export($export, true) . ";\n";
        return $php;
    }
}

if (!function_exists('bacara_streams_save_config')) {
    /**
     * @param array $patch 부분 갱신 (publish_keys 는 병합)
     * @return array{ok:bool,message?:string,path?:string}
     */
    function bacara_streams_save_config($patch)
    {
        if (!is_array($patch)) {
            return array('ok' => false, 'message' => '잘못된 설정');
        }
        $cfg = bacara_streams_load_config();
        $allowed = array(
            'enabled', 'media_origin', 'player_template', 'hls_template', 'webrtc_template',
            'url_template', 'tables', 'publish_keys', 'viewer_secret', 'viewer_ttl',
            'status_cache_ttl', 'alert_offline_sec', 'alert_webhook', 'watchdog_key',
            'mediamtx_api', 'latency_hls_sec', 'latency_webrtc_sec',
            'use_proxy_player', 'mediamtx_auth_enabled', 'publish_user', 'publish_pass', 'stall_sec',
        );
        foreach ($allowed as $key) {
            if (!array_key_exists($key, $patch)) {
                continue;
            }
            if ($key === 'publish_keys' || $key === 'tables') {
                if (!is_array($patch[$key])) {
                    continue;
                }
                $merged = isset($cfg[$key]) && is_array($cfg[$key]) ? $cfg[$key] : array();
                foreach ($patch[$key] as $k => $v) {
                    $code = bacara_streams_norm_code($k);
                    $val = trim((string) $v);
                    if ($val === '' || $val === '__CLEAR__') {
                        unset($merged[$code]);
                    } else {
                        if ($key === 'publish_keys' && !preg_match('/^[A-Za-z0-9_-]{4,64}$/', $val)) {
                            return array('ok' => false, 'message' => 'publish_key 형식 오류: ' . $code);
                        }
                        $merged[$code] = $val;
                    }
                }
                $cfg[$key] = $merged;
            } else {
                $cfg[$key] = $patch[$key];
            }
        }

        $path = bacara_streams_config_path();
        if ($path === '' || !defined('G5_DATA_PATH')) {
            return array('ok' => false, 'message' => 'G5_DATA_PATH 없음');
        }
        $dir = dirname($path);
        if (!is_dir($dir)) {
            @mkdir($dir, 0755, true);
        }
        $php = bacara_streams_export_config_php($cfg);
        $tmp = $path . '.tmp.' . getmypid();
        if (@file_put_contents($tmp, $php, LOCK_EX) === false) {
            return array('ok' => false, 'message' => '설정 파일 쓰기 실패');
        }
        if (!@rename($tmp, $path)) {
            @unlink($tmp);
            return array('ok' => false, 'message' => '설정 파일 교체 실패');
        }
        @chmod($path, 0640);
        bacara_streams_invalidate_config();
        return array('ok' => true, 'path' => $path);
    }
}

if (!function_exists('bacara_streams_generate_publish_key')) {
    function bacara_streams_generate_publish_key()
    {
        try {
            $hex = bin2hex(random_bytes(8));
        } catch (Exception $e) {
            $hex = substr(md5(uniqid((string) mt_rand(), true)), 0, 16);
        }
        return 'pub_' . $hex;
    }
}

if (!function_exists('bacara_streams_admin_settings')) {
    function bacara_streams_admin_settings()
    {
        $cfg = bacara_streams_load_config();
        $keys = isset($cfg['publish_keys']) && is_array($cfg['publish_keys']) ? $cfg['publish_keys'] : array();
        $out_keys = array();
        foreach (bacara_streams_known_codes() as $code) {
            $pub = isset($keys[$code]) ? (string) $keys[$code] : '';
            $out_keys[$code] = array(
                'publish_key' => $pub !== '' ? $pub : $code,
                'is_custom' => $pub !== '',
                'obs_server' => 'rtmp://media.aitablelive.com:1935/' . ($pub !== '' ? $pub : $code),
            );
        }
        return array(
            'ok' => true,
            'enabled' => !empty($cfg['enabled']),
            'media_origin' => isset($cfg['media_origin']) ? $cfg['media_origin'] : '',
            'player_template' => isset($cfg['player_template']) ? $cfg['player_template'] : '',
            'hls_template' => isset($cfg['hls_template']) ? $cfg['hls_template'] : '',
            'webrtc_template' => isset($cfg['webrtc_template']) ? $cfg['webrtc_template'] : '',
            'alert_webhook' => isset($cfg['alert_webhook']) ? $cfg['alert_webhook'] : '',
            'alert_offline_sec' => isset($cfg['alert_offline_sec']) ? (int) $cfg['alert_offline_sec'] : 90,
            'watchdog_key_set' => !empty($cfg['watchdog_key']),
            'mediamtx_api' => isset($cfg['mediamtx_api']) ? $cfg['mediamtx_api'] : '',
            'use_proxy_player' => !array_key_exists('use_proxy_player', $cfg) || !empty($cfg['use_proxy_player']),
            'mediamtx_auth_enabled' => !empty($cfg['mediamtx_auth_enabled']),
            'publish_user' => isset($cfg['publish_user']) ? $cfg['publish_user'] : 'obs',
            'publish_pass_set' => !empty($cfg['publish_pass']),
            'stall_sec' => isset($cfg['stall_sec']) ? (int) $cfg['stall_sec'] : 45,
            'latency_hls_sec' => isset($cfg['latency_hls_sec']) ? (int) $cfg['latency_hls_sec'] : 5,
            'latency_webrtc_sec' => isset($cfg['latency_webrtc_sec']) ? (int) $cfg['latency_webrtc_sec'] : 1,
            'config_file_exists' => is_file(bacara_streams_config_path()),
            'auth_endpoint' => (defined('G5_PLUGIN_URL') ? G5_PLUGIN_URL : '') . '/bacara_wallet/api/stream_auth.php',
            'publish_keys' => $out_keys,
        );
    }
}

if (!function_exists('bacara_streams_norm_code')) {
    function bacara_streams_norm_code($code)
    {
        return strtoupper(trim((string) $code));
    }
}

if (!function_exists('bacara_streams_publish_key')) {
    /**
     * OBS RTMP 경로용 비밀 키. 미설정 시 gameCode 그대로(하위 호환).
     */
    function bacara_streams_publish_key($game_code)
    {
        $code = bacara_streams_norm_code($game_code);
        $cfg = bacara_streams_load_config();
        $keys = isset($cfg['publish_keys']) && is_array($cfg['publish_keys']) ? $cfg['publish_keys'] : array();
        if (isset($keys[$code]) && trim((string) $keys[$code]) !== '') {
            return trim((string) $keys[$code]);
        }
        return $code;
    }
}

if (!function_exists('bacara_streams_apply_template')) {
    function bacara_streams_apply_template($template, $game_code, $publish_key = null)
    {
        $code = bacara_streams_norm_code($game_code);
        if ($publish_key === null || $publish_key === '') {
            $publish_key = bacara_streams_publish_key($code);
        }
        $template = trim((string) $template);
        if ($template === '') {
            return '';
        }
        return str_replace(
            array(
                '{PUBLISH_KEY}', '{publish_key}',
                '{STREAM_KEY}', '{stream_key}',
                '{table}', '{TABLE}',
                '{code}', '{CODE}',
            ),
            array(
                $publish_key, $publish_key,
                $publish_key, $publish_key,
                $code, $code,
                $code, $code,
            ),
            $template
        );
    }
}

if (!function_exists('bacara_streams_resolve_hls_url')) {
    function bacara_streams_resolve_hls_url($game_code)
    {
        $code = bacara_streams_norm_code($game_code);
        $cfg = bacara_streams_load_config();
        if (empty($cfg['enabled'])) {
            return '';
        }
        $tables = isset($cfg['tables']) && is_array($cfg['tables']) ? $cfg['tables'] : array();
        if (isset($tables[$code]) && trim((string) $tables[$code]) !== '') {
            return trim((string) $tables[$code]);
        }
        $tpl = !empty($cfg['hls_template'])
            ? $cfg['hls_template']
            : (isset($cfg['url_template']) ? $cfg['url_template'] : '');
        return bacara_streams_apply_template($tpl, $code);
    }
}

if (!function_exists('bacara_streams_resolve_player_url')) {
    function bacara_streams_resolve_player_url($game_code, $mode = 'hls')
    {
        $code = bacara_streams_norm_code($game_code);
        $cfg = bacara_streams_load_config();
        if (empty($cfg['enabled'])) {
            return '';
        }
        $mode = strtolower(trim((string) $mode));
        if ($mode === 'webrtc') {
            $tpl = isset($cfg['webrtc_template']) ? $cfg['webrtc_template'] : '';
            $url = bacara_streams_apply_template($tpl, $code);
            if ($url !== '') {
                return $url;
            }
        }
        $tpl = isset($cfg['player_template']) ? $cfg['player_template'] : '';
        return bacara_streams_apply_template($tpl, $code);
    }
}

if (!function_exists('bacara_streams_viewer_secret')) {
    function bacara_streams_viewer_secret()
    {
        $cfg = bacara_streams_load_config();
        $secret = isset($cfg['viewer_secret']) ? trim((string) $cfg['viewer_secret']) : '';
        if ($secret !== '') {
            return $secret;
        }
        $salt = defined('G5_MYSQL_PASSWORD') ? G5_MYSQL_PASSWORD : 'bacara';
        $prefix = defined('G5_TABLE_PREFIX') ? G5_TABLE_PREFIX : 'g5_';
        return hash('sha256', 'bacara-stream-viewer|' . $prefix . '|' . $salt);
    }
}

if (!function_exists('bacara_streams_make_viewer_token')) {
    function bacara_streams_make_viewer_token($game_code, $mb_id, $mode = 'hls', $ttl = null)
    {
        $cfg = bacara_streams_load_config();
        $ttl = $ttl === null ? (int) $cfg['viewer_ttl'] : (int) $ttl;
        if ($ttl < 60) {
            $ttl = 60;
        }
        if ($ttl > 3600) {
            $ttl = 3600;
        }
        $exp = time() + $ttl;
        $payload = bacara_streams_norm_code($game_code) . '|' . $mode . '|' . $mb_id . '|' . $exp;
        $sig = hash_hmac('sha256', $payload, bacara_streams_viewer_secret());
        return array(
            'token' => rtrim(strtr(base64_encode($payload . '|' . $sig), '+/', '-_'), '='),
            'expires_at' => $exp,
            'ttl' => $ttl,
        );
    }
}

if (!function_exists('bacara_streams_verify_viewer_token')) {
    function bacara_streams_verify_viewer_token($token, $expect_code = '', $expect_mb = '')
    {
        $raw = strtr((string) $token, '-_', '+/');
        $pad = strlen($raw) % 4;
        if ($pad) {
            $raw .= str_repeat('=', 4 - $pad);
        }
        $decoded = base64_decode($raw, true);
        if ($decoded === false) {
            return false;
        }
        $parts = explode('|', $decoded);
        if (count($parts) !== 5) {
            return false;
        }
        list($code, $mode, $mb_id, $exp, $sig) = $parts;
        $payload = $code . '|' . $mode . '|' . $mb_id . '|' . $exp;
        $expect = hash_hmac('sha256', $payload, bacara_streams_viewer_secret());
        if (!hash_equals($expect, $sig)) {
            return false;
        }
        if ((int) $exp < time()) {
            return false;
        }
        if ($expect_code !== '' && bacara_streams_norm_code($expect_code) !== bacara_streams_norm_code($code)) {
            return false;
        }
        if ($expect_mb !== '' && (string) $expect_mb !== (string) $mb_id) {
            return false;
        }
        return array(
            'table_name' => bacara_streams_norm_code($code),
            'mode' => $mode,
            'mb_id' => $mb_id,
            'expires_at' => (int) $exp,
        );
    }
}

if (!function_exists('bacara_streams_cache_dir')) {
    function bacara_streams_cache_dir()
    {
        $dir = (defined('G5_DATA_PATH') ? G5_DATA_PATH : sys_get_temp_dir()) . '/cache';
        if (!is_dir($dir)) {
            @mkdir($dir, 0755, true);
        }
        return $dir;
    }
}

if (!function_exists('bacara_streams_cache_get')) {
    function bacara_streams_cache_get($key, $ttl)
    {
        $row = bacara_streams_cache_read($key);
        if ($row === null) {
            return null;
        }
        if ((time() - (int) $row['at']) > (int) $ttl) {
            return null;
        }
        return $row['value'];
    }
}

if (!function_exists('bacara_streams_cache_read')) {
    /**
     * TTL 무시하고 캐시 원본 읽기 (stale 허용용)
     * @return array{at:int,value:mixed}|null
     */
    function bacara_streams_cache_read($key)
    {
        $file = bacara_streams_cache_dir() . '/stream_' . preg_replace('/[^a-zA-Z0-9_-]/', '_', $key) . '.json';
        if (!is_file($file)) {
            return null;
        }
        $raw = @file_get_contents($file);
        if ($raw === false || $raw === '') {
            return null;
        }
        $data = json_decode($raw, true);
        if (!is_array($data) || !isset($data['at'], $data['value'])) {
            return null;
        }
        return array(
            'at' => (int) $data['at'],
            'value' => $data['value'],
        );
    }
}

if (!function_exists('bacara_streams_cache_set')) {
    function bacara_streams_cache_set($key, $value)
    {
        $file = bacara_streams_cache_dir() . '/stream_' . preg_replace('/[^a-zA-Z0-9_-]/', '_', $key) . '.json';
        $tmp = $file . '.' . getmypid() . '.tmp';
        $ok = @file_put_contents(
            $tmp,
            json_encode(array('at' => time(), 'value' => $value), JSON_UNESCAPED_UNICODE),
            LOCK_EX
        );
        if ($ok === false) {
            @unlink($tmp);
            return;
        }
        @rename($tmp, $file);
    }
}

if (!function_exists('bacara_streams_http_get')) {
    function bacara_streams_http_get($url, $timeout = 3)
    {
        $url = trim((string) $url);
        if ($url === '') {
            return array('ok' => false, 'status' => 0, 'body' => '');
        }
        if (function_exists('curl_init')) {
            $ch = curl_init($url);
            curl_setopt_array($ch, array(
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_FOLLOWLOCATION => true,
                CURLOPT_CONNECTTIMEOUT => $timeout,
                CURLOPT_TIMEOUT => $timeout,
                CURLOPT_USERAGENT => 'BacaraAI-StreamStatus/1.0',
                CURLOPT_HTTPHEADER => array('Accept: */*'),
            ));
            $body = curl_exec($ch);
            $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $err = curl_error($ch);
            curl_close($ch);
            if ($body === false) {
                return array('ok' => false, 'status' => 0, 'body' => '', 'error' => $err);
            }
            return array('ok' => $status >= 200 && $status < 400, 'status' => $status, 'body' => (string) $body);
        }
        $ctx = stream_context_create(array(
            'http' => array(
                'timeout' => $timeout,
                'ignore_errors' => true,
                'header' => "Accept: */*\r\nUser-Agent: BacaraAI-StreamStatus/1.0\r\n",
            ),
        ));
        $body = @file_get_contents($url, false, $ctx);
        $status = 0;
        if (function_exists('http_get_last_response_headers')) {
            $headers = http_get_last_response_headers();
            if (is_array($headers) && isset($headers[0]) && preg_match('/\s(\d{3})\s/', $headers[0], $m)) {
                $status = (int) $m[1];
            }
        }
        if ($body === false) {
            return array('ok' => false, 'status' => $status, 'body' => '');
        }
        return array('ok' => $status === 0 || ($status >= 200 && $status < 400), 'status' => $status, 'body' => (string) $body);
    }
}

if (!function_exists('bacara_streams_code_from_publish_path')) {
    function bacara_streams_code_from_publish_path($path)
    {
        $path = trim((string) $path, "/ \t\n\r");
        if ($path === '') {
            return '';
        }
        // MediaMTX path may be "pub_xxx" or "MD2729"
        foreach (bacara_streams_known_codes() as $code) {
            if (bacara_streams_publish_key($code) === $path) {
                return $code;
            }
        }
        $up = bacara_streams_norm_code($path);
        if (in_array($up, bacara_streams_known_codes(), true)) {
            return $up;
        }
        return '';
    }
}

if (!function_exists('bacara_streams_append_query')) {
    function bacara_streams_append_query($url, $params)
    {
        $url = trim((string) $url);
        if ($url === '' || !is_array($params) || !$params) {
            return $url;
        }
        $sep = (strpos($url, '?') === false) ? '?' : '&';
        return $url . $sep . http_build_query($params);
    }
}

if (!function_exists('bacara_streams_proxy_player_url')) {
    function bacara_streams_proxy_player_url($viewer_token)
    {
        $base = defined('G5_PLUGIN_URL')
            ? rtrim(G5_PLUGIN_URL, '/') . '/bacara_wallet/stream/player.php'
            : '/plugin/bacara_wallet/stream/player.php';
        return $base . '?vt=' . rawurlencode((string) $viewer_token);
    }
}

if (!function_exists('bacara_streams_probe_online')) {
    /**
     * 서버에서만 플레이리스트/플레이어 생존 여부 확인 (브라우저 probe 금지 정책과 분리)
     */
    function bacara_streams_probe_online($game_code)
    {
        $code = bacara_streams_norm_code($game_code);
        $cfg = bacara_streams_load_config();
        $publish = bacara_streams_publish_key($code);

        // MediaMTX API 우선
        $api = isset($cfg['mediamtx_api']) ? rtrim(trim((string) $cfg['mediamtx_api']), '/') : '';
        if ($api !== '') {
            $res = bacara_streams_http_get($api . '/v3/paths/get/' . rawurlencode($publish), 2);
            if ($res['ok'] && $res['body'] !== '') {
                $json = json_decode($res['body'], true);
                $ready = false;
                $bytes = null;
                if (is_array($json)) {
                    if (isset($json['bytesReceived'])) {
                        $bytes = (int) $json['bytesReceived'];
                    } elseif (isset($json['bytesReceivedTotal'])) {
                        $bytes = (int) $json['bytesReceivedTotal'];
                    }
                    if (!empty($json['ready'])) {
                        $ready = true;
                    } elseif ($bytes !== null && $bytes > 0) {
                        $ready = true;
                    } elseif (!empty($json['tracks']) && is_array($json['tracks']) && count($json['tracks']) > 0) {
                        $ready = true;
                    }
                }
                return array(
                    'online' => $ready,
                    'method' => 'mediamtx_api',
                    'http_status' => $res['status'],
                    'publish_key_set' => $publish !== $code,
                    'bytes_received' => $bytes,
                );
            }
        }

        $hls = bacara_streams_resolve_hls_url($code);
        $res = bacara_streams_http_get($hls, 3);
        $online = false;
        if ($res['ok'] && strpos($res['body'], '#EXTM3U') !== false) {
            $online = true;
        }
        return array(
            'online' => $online,
            'method' => 'hls_playlist',
            'http_status' => $res['status'],
            'publish_key_set' => $publish !== $code,
            'bytes_received' => null,
        );
    }
}

if (!function_exists('bacara_streams_status_for')) {
    function bacara_streams_status_for($game_code, $force = false)
    {
        $code = bacara_streams_norm_code($game_code);
        $cfg = bacara_streams_load_config();
        $ttl = isset($cfg['status_cache_ttl']) ? (int) $cfg['status_cache_ttl'] : 12;
        if ($ttl < 5) {
            $ttl = 5;
        }
        /** 갱신 중에도 허용하는 stale 최대 수명 */
        $stale_max = max(45, $ttl * 5);

        if (!$force) {
            $hit = bacara_streams_cache_get('status_' . $code, $ttl);
            if (is_array($hit)) {
                $hit['cached'] = true;
                $hit['stale'] = false;
                return $hit;
            }
        }

        $lock_path = bacara_streams_cache_dir() . '/stream_status_' . preg_replace('/[^A-Z0-9_-]/', '_', $code) . '.lock';
        $lock = @fopen($lock_path, 'c+');
        $have_lock = false;
        if ($lock) {
            $have_lock = @flock($lock, LOCK_EX | LOCK_NB);
            if (!$have_lock) {
                // 다른 프로세스가 probe 중 → stale 즉시 반환 (썬더링 헐드 방지)
                $row = bacara_streams_cache_read('status_' . $code);
                if ($row && is_array($row['value']) && (time() - (int) $row['at']) <= $stale_max) {
                    $stale = $row['value'];
                    $stale['cached'] = true;
                    $stale['stale'] = true;
                    @fclose($lock);
                    return $stale;
                }
                // stale 없으면 짧게 대기
                $have_lock = @flock($lock, LOCK_EX);
            }
        }

        if ($have_lock && !$force) {
            $hit = bacara_streams_cache_get('status_' . $code, $ttl);
            if (is_array($hit)) {
                $hit['cached'] = true;
                $hit['stale'] = false;
                @flock($lock, LOCK_UN);
                @fclose($lock);
                return $hit;
            }
        }

        $probe = bacara_streams_probe_online($code);
        $now = time();
        $prev_file = bacara_streams_cache_dir() . '/stream_last_' . $code . '.json';
        $last_online_at = null;
        $offline_since = null;
        $last_bytes = null;
        $last_bytes_at = null;
        $stall_since = null;
        if (is_file($prev_file)) {
            $prev = json_decode((string) @file_get_contents($prev_file), true);
            if (is_array($prev)) {
                $last_online_at = isset($prev['last_online_at']) ? (int) $prev['last_online_at'] : null;
                $offline_since = isset($prev['offline_since']) ? (int) $prev['offline_since'] : null;
                $last_bytes = isset($prev['last_bytes']) ? $prev['last_bytes'] : null;
                $last_bytes_at = isset($prev['last_bytes_at']) ? (int) $prev['last_bytes_at'] : null;
                $stall_since = isset($prev['stall_since']) ? (int) $prev['stall_since'] : null;
            }
        }

        $bytes = array_key_exists('bytes_received', $probe) ? $probe['bytes_received'] : null;
        $stalled = false;
        $stall_need = isset($cfg['stall_sec']) ? (int) $cfg['stall_sec'] : 45;
        if ($stall_need < 15) {
            $stall_need = 15;
        }

        if (!empty($probe['online'])) {
            $last_online_at = $now;
            $offline_since = null;

            if ($bytes !== null) {
                if ($last_bytes !== null && (int) $bytes === (int) $last_bytes) {
                    if ($stall_since === null) {
                        $stall_since = $last_bytes_at ? $last_bytes_at : $now;
                    }
                    if (($now - (int) $stall_since) >= $stall_need) {
                        $stalled = true;
                    }
                } else {
                    $stall_since = null;
                    $last_bytes = $bytes;
                    $last_bytes_at = $now;
                }
            } else {
                $stall_since = null;
            }
        } else {
            if ($offline_since === null) {
                $offline_since = $now;
            }
            $stall_since = null;
            $stalled = false;
        }

        @file_put_contents(
            $prev_file,
            json_encode(array(
                'last_online_at' => $last_online_at,
                'offline_since' => $offline_since,
                'online' => !empty($probe['online']),
                'last_bytes' => $last_bytes,
                'last_bytes_at' => $last_bytes_at,
                'stall_since' => $stall_since,
            ), JSON_UNESCAPED_UNICODE),
            LOCK_EX
        );

        $status = array(
            'table_name' => $code,
            'online' => !empty($probe['online']),
            'stalled' => $stalled,
            'stall_sec' => $stalled && $stall_since ? max(0, $now - (int) $stall_since) : 0,
            'bytes_received' => $bytes,
            'method' => $probe['method'],
            'http_status' => $probe['http_status'],
            'publish_key_set' => !empty($probe['publish_key_set']),
            'checked_at' => $now,
            'last_online_at' => $last_online_at,
            'offline_since' => $offline_since,
            'offline_sec' => $offline_since ? max(0, $now - $offline_since) : 0,
            'latency_hls_sec' => isset($cfg['latency_hls_sec']) ? (int) $cfg['latency_hls_sec'] : 5,
            'latency_webrtc_sec' => isset($cfg['latency_webrtc_sec']) ? (int) $cfg['latency_webrtc_sec'] : 1,
            'cached' => false,
            'stale' => false,
        );

        bacara_streams_cache_set('status_' . $code, $status);
        bacara_streams_maybe_alert($status);

        if ($lock && $have_lock) {
            @flock($lock, LOCK_UN);
        }
        if ($lock) {
            @fclose($lock);
        }
        return $status;
    }
}

if (!function_exists('bacara_streams_status_map')) {
    /**
     * 전체 테이블 상태 — 맵 단위 캐시 + 락으로 동시 갱신 1회만 수행
     *
     * @return array{statuses:array,generated_at:int,cached:bool,stale:bool}
     */
    function bacara_streams_status_map($force = false)
    {
        $cfg = bacara_streams_load_config();
        $ttl = isset($cfg['status_cache_ttl']) ? (int) $cfg['status_cache_ttl'] : 12;
        if ($ttl < 5) {
            $ttl = 5;
        }
        $stale_max = max(60, $ttl * 6);
        $cache_key = 'status_map_all';

        if (!$force) {
            $hit = bacara_streams_cache_get($cache_key, $ttl);
            if (is_array($hit) && isset($hit['statuses']) && is_array($hit['statuses'])) {
                return array(
                    'statuses' => $hit['statuses'],
                    'generated_at' => isset($hit['generated_at']) ? (int) $hit['generated_at'] : time(),
                    'cached' => true,
                    'stale' => false,
                );
            }
        }

        $lock_path = bacara_streams_cache_dir() . '/stream_status_map.lock';
        $lock = @fopen($lock_path, 'c+');
        $have_lock = false;
        if ($lock) {
            $have_lock = @flock($lock, LOCK_EX | LOCK_NB);
            if (!$have_lock) {
                $row = bacara_streams_cache_read($cache_key);
                if ($row && is_array($row['value']) && isset($row['value']['statuses'])
                    && (time() - (int) $row['at']) <= $stale_max) {
                    @fclose($lock);
                    return array(
                        'statuses' => $row['value']['statuses'],
                        'generated_at' => isset($row['value']['generated_at'])
                            ? (int) $row['value']['generated_at']
                            : (int) $row['at'],
                        'cached' => true,
                        'stale' => true,
                    );
                }
                $have_lock = @flock($lock, LOCK_EX);
            }
        }

        if ($have_lock && !$force) {
            $hit = bacara_streams_cache_get($cache_key, $ttl);
            if (is_array($hit) && isset($hit['statuses']) && is_array($hit['statuses'])) {
                if ($lock) {
                    @flock($lock, LOCK_UN);
                    @fclose($lock);
                }
                return array(
                    'statuses' => $hit['statuses'],
                    'generated_at' => isset($hit['generated_at']) ? (int) $hit['generated_at'] : time(),
                    'cached' => true,
                    'stale' => false,
                );
            }
        }

        $statuses = array();
        foreach (bacara_streams_known_codes() as $code) {
            // 맵 갱신자가 이미 락을 쥐고 있으므로 개별 force 로 최신 probe
            $statuses[$code] = bacara_streams_status_for($code, true);
        }
        $payload = array(
            'statuses' => $statuses,
            'generated_at' => time(),
        );
        bacara_streams_cache_set($cache_key, $payload);

        if ($lock && $have_lock) {
            @flock($lock, LOCK_UN);
        }
        if ($lock) {
            @fclose($lock);
        }

        return array(
            'statuses' => $statuses,
            'generated_at' => $payload['generated_at'],
            'cached' => false,
            'stale' => false,
        );
    }
}

if (!function_exists('bacara_streams_maybe_alert')) {
    function bacara_streams_maybe_alert($status)
    {
        if (!is_array($status)) {
            return;
        }
        $cfg = bacara_streams_load_config();
        $code = isset($status['table_name']) ? $status['table_name'] : '';
        if ($code === '') {
            return;
        }

        $kind = '';
        $msg = '';
        if (!empty($status['stalled']) && !empty($status['online'])) {
            $kind = 'stall';
            $msg = '[BacaraAI] 스트림 정지 의심(STALL): ' . $code
                . ' (' . (int) $status['stall_sec'] . 's, bytes 정체)';
        } elseif (empty($status['online'])) {
            $need = isset($cfg['alert_offline_sec']) ? (int) $cfg['alert_offline_sec'] : 90;
            $offline_sec = isset($status['offline_sec']) ? (int) $status['offline_sec'] : 0;
            if ($offline_sec < $need) {
                return;
            }
            $kind = 'offline';
            $msg = '[BacaraAI] 스트림 OFFLINE: ' . $code . ' (' . $offline_sec . 's)';
        } else {
            return;
        }

        $lock = bacara_streams_cache_dir() . '/stream_alert_' . $kind . '_' . $code . '.json';
        $last = 0;
        if (is_file($lock)) {
            $j = json_decode((string) @file_get_contents($lock), true);
            if (is_array($j) && isset($j['at'])) {
                $last = (int) $j['at'];
            }
        }
        if ($last && (time() - $last) < 600) {
            return;
        }
        $log = bacara_streams_cache_dir() . '/stream_alerts.log';
        @file_put_contents($log, date('c') . ' ' . $msg . "\n", FILE_APPEND | LOCK_EX);

        $webhook = isset($cfg['alert_webhook']) ? trim((string) $cfg['alert_webhook']) : '';
        if ($webhook !== '') {
            if (function_exists('curl_init')) {
                $ch = curl_init($webhook);
                curl_setopt_array($ch, array(
                    CURLOPT_POST => true,
                    CURLOPT_RETURNTRANSFER => true,
                    CURLOPT_TIMEOUT => 3,
                    CURLOPT_HTTPHEADER => array('Content-Type: application/json'),
                    CURLOPT_POSTFIELDS => json_encode(array(
                        'text' => $msg,
                        'table' => $code,
                        'kind' => $kind,
                        'offline_sec' => isset($status['offline_sec']) ? (int) $status['offline_sec'] : 0,
                        'stall_sec' => isset($status['stall_sec']) ? (int) $status['stall_sec'] : 0,
                    ), JSON_UNESCAPED_UNICODE),
                ));
                @curl_exec($ch);
                curl_close($ch);
            }
        }
        @file_put_contents($lock, json_encode(array('at' => time(), 'msg' => $msg), JSON_UNESCAPED_UNICODE), LOCK_EX);
    }
}

if (!function_exists('bacara_streams_viewer_payload')) {
    function bacara_streams_viewer_payload($game_code, $mb_id, $mode = 'hls')
    {
        $code = bacara_streams_norm_code($game_code);
        $mode = strtolower(trim((string) $mode));
        if ($mode !== 'webrtc') {
            $mode = 'hls';
        }
        $cfg = bacara_streams_load_config();
        $token = bacara_streams_make_viewer_token($code, $mb_id, $mode);
        $direct = bacara_streams_resolve_player_url($code, $mode);
        $use_proxy = !array_key_exists('use_proxy_player', $cfg) || !empty($cfg['use_proxy_player']);
        $player = $use_proxy
            ? bacara_streams_proxy_player_url($token['token'])
            : bacara_streams_append_query($direct, array('vt' => $token['token']));
        $status = bacara_streams_status_for($code);

        return array(
            'ok' => true,
            'table_name' => $code,
            'mode' => $mode,
            'player_url' => $player,
            'proxy' => $use_proxy,
            // 직접 MediaMTX URL은 클라이언트로 내리지 않음 (프록시/토큰 경로만)
            'viewer_token' => $token['token'],
            'expires_at' => $token['expires_at'],
            'ttl' => $token['ttl'],
            'publish_key_configured' => bacara_streams_publish_key($code) !== $code,
            'latency_sec' => $mode === 'webrtc'
                ? (int) $cfg['latency_webrtc_sec']
                : (int) $cfg['latency_hls_sec'],
            'status' => array(
                'online' => !empty($status['online']),
                'stalled' => !empty($status['stalled']),
                'stall_sec' => isset($status['stall_sec']) ? (int) $status['stall_sec'] : 0,
                'checked_at' => $status['checked_at'],
                'last_online_at' => $status['last_online_at'],
                'offline_sec' => $status['offline_sec'],
            ),
            'sync' => array(
                'note' => '영상은 참고용이며 정산은 live_results API가 권위입니다.',
                'expected_delay_sec' => $mode === 'webrtc'
                    ? (int) $cfg['latency_webrtc_sec']
                    : (int) $cfg['latency_hls_sec'],
            ),
        );
    }
}

if (!function_exists('bacara_streams_auth_decide')) {
    /**
     * MediaMTX authHTTPAddress 요청 판정
     * @return array{ok:bool,message?:string}
     */
    function bacara_streams_auth_decide($payload)
    {
        $cfg = bacara_streams_load_config();
        if (empty($cfg['mediamtx_auth_enabled'])) {
            // MediaMTX에 아직 연결 안 된 경우 — 호출되면 허용(개발 편의)
            return array('ok' => true, 'message' => 'auth disabled');
        }
        if (!is_array($payload)) {
            return array('ok' => false, 'message' => 'bad payload');
        }
        $action = isset($payload['action']) ? strtolower((string) $payload['action']) : '';
        $path = isset($payload['path']) ? trim((string) $payload['path'], '/') : '';
        $query = isset($payload['query']) ? (string) $payload['query'] : '';
        $user = isset($payload['user']) ? (string) $payload['user'] : '';
        $password = isset($payload['password']) ? (string) $payload['password'] : '';

        if ($action === 'publish') {
            $expect_user = isset($cfg['publish_user']) ? (string) $cfg['publish_user'] : 'obs';
            $expect_pass = isset($cfg['publish_pass']) ? (string) $cfg['publish_pass'] : '';
            if ($expect_pass === '') {
                return array('ok' => false, 'message' => 'publish_pass not set');
            }
            if (!hash_equals($expect_user, $user) || !hash_equals($expect_pass, $password)) {
                return array('ok' => false, 'message' => 'publish denied');
            }
            return array('ok' => true);
        }

        // read / playback / get 등 시청
        parse_str($query, $q);
        $vt = isset($q['vt']) ? (string) $q['vt'] : '';
        if ($vt === '') {
            return array('ok' => false, 'message' => 'viewer token required');
        }
        $code = bacara_streams_code_from_publish_path($path);
        $verified = bacara_streams_verify_viewer_token($vt, $code);
        if ($verified === false) {
            return array('ok' => false, 'message' => 'invalid token');
        }
        return array('ok' => true);
    }
}

if (!function_exists('bacara_streams_admin_overview')) {
    function bacara_streams_admin_overview($force = false)
    {
        $cfg = bacara_streams_load_config();
        $map = bacara_streams_status_map($force);
        $rows = array();
        foreach (bacara_streams_known_codes() as $code) {
            $st = isset($map['statuses'][$code]) && is_array($map['statuses'][$code])
                ? $map['statuses'][$code]
                : bacara_streams_status_for($code, $force);
            $pub = bacara_streams_publish_key($code);
            $rows[] = array(
                'table_name' => $code,
                'online' => !empty($st['online']),
                'stalled' => !empty($st['stalled']),
                'stall_sec' => isset($st['stall_sec']) ? (int) $st['stall_sec'] : 0,
                'bytes_received' => isset($st['bytes_received']) ? $st['bytes_received'] : null,
                'checked_at' => isset($st['checked_at']) ? $st['checked_at'] : time(),
                'last_online_at' => isset($st['last_online_at']) ? $st['last_online_at'] : null,
                'offline_sec' => isset($st['offline_sec']) ? $st['offline_sec'] : 0,
                'method' => isset($st['method']) ? $st['method'] : '',
                'http_status' => isset($st['http_status']) ? $st['http_status'] : 0,
                'publish_key_masked' => strlen($pub) <= 4
                    ? str_repeat('*', strlen($pub))
                    : substr($pub, 0, 2) . str_repeat('*', max(0, strlen($pub) - 4)) . substr($pub, -2),
                'publish_key_is_public' => ($pub === $code),
                'obs_server_hint' => 'rtmp://media.aitablelive.com:1935/' . $pub,
                'player_url' => bacara_streams_resolve_player_url($code, 'hls'),
                'hls_url' => bacara_streams_resolve_hls_url($code),
                'webrtc_url' => bacara_streams_resolve_player_url($code, 'webrtc'),
            );
        }
        return array(
            'ok' => true,
            'enabled' => !empty($cfg['enabled']),
            'media_origin' => isset($cfg['media_origin']) ? $cfg['media_origin'] : '',
            'alert_webhook_set' => !empty($cfg['alert_webhook']),
            'tables' => $rows,
            'generated_at' => isset($map['generated_at']) ? (int) $map['generated_at'] : time(),
            'cached' => !empty($map['cached']),
            'stale' => !empty($map['stale']),
        );
    }
}
