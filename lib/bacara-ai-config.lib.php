<?php
/**
 * 바카라 AI — GPT / Claude / Gemini API 설정
 *
 * 키는 data/bacaraai-ai.config.php 에 저장 (웹에서 직접 접근 차단)
 */
if (!defined('_GNUBOARD_')) {
    exit;
}

if (!function_exists('bacara_ai_config_path')) {
    function bacara_ai_config_path()
    {
        return G5_DATA_PATH . '/bacaraai-ai.config.php';
    }
}

if (!function_exists('bacara_ai_config_defaults')) {
    function bacara_ai_config_defaults()
    {
        return array(
            'openai_api_key' => '',
            'openai_model' => 'gpt-4o-mini',
            'anthropic_api_key' => '',
            'anthropic_model' => 'claude-sonnet-4-20250514',
            'gemini_api_key' => '',
            'gemini_model' => 'gemini-2.0-flash',
            'enabled' => '1',
            /** 1이면 AI 추천 전략에서 조건 충족 시 자동 베팅 허용 */
            'auto_bet_enabled' => '1',
        );
    }
}

if (!function_exists('bacara_ai_config_load')) {
    function bacara_ai_config_load()
    {
        static $cfg = null;
        if ($cfg !== null) {
            return $cfg;
        }

        $cfg = bacara_ai_config_defaults();
        $path = bacara_ai_config_path();
        if (!is_file($path)) {
            return $cfg;
        }

        include $path;
        $map = array(
            'BACARAAI_OPENAI_API_KEY' => 'openai_api_key',
            'BACARAAI_OPENAI_MODEL' => 'openai_model',
            'BACARAAI_ANTHROPIC_API_KEY' => 'anthropic_api_key',
            'BACARAAI_ANTHROPIC_MODEL' => 'anthropic_model',
            'BACARAAI_GEMINI_API_KEY' => 'gemini_api_key',
            'BACARAAI_GEMINI_MODEL' => 'gemini_model',
            'BACARAAI_AI_ENABLED' => 'enabled',
            'BACARAAI_AI_AUTO_BET' => 'auto_bet_enabled',
        );
        foreach ($map as $const => $key) {
            if (!defined($const)) {
                continue;
            }
            $value = trim((string) constant($const));
            if ($value !== '') {
                $cfg[$key] = $value;
            }
        }

        return $cfg;
    }
}

if (!function_exists('bacara_ai_config_get')) {
    function bacara_ai_config_get($key, $default = '')
    {
        $cfg = bacara_ai_config_load();
        if (!array_key_exists($key, $cfg)) {
            return (string) $default;
        }
        $value = trim((string) $cfg[$key]);
        return $value !== '' ? $value : (string) $default;
    }
}

if (!function_exists('bacara_ai_config_is_enabled')) {
    function bacara_ai_config_is_enabled()
    {
        return bacara_ai_config_get('enabled', '1') === '1';
    }
}

if (!function_exists('bacara_ai_config_is_auto_bet_enabled')) {
    function bacara_ai_config_is_auto_bet_enabled()
    {
        return bacara_ai_config_is_enabled()
            && bacara_ai_config_get('auto_bet_enabled', '1') === '1';
    }
}

if (!function_exists('bacara_ai_config_has_key')) {
    function bacara_ai_config_has_key($provider)
    {
        $map = array(
            'openai' => 'openai_api_key',
            'anthropic' => 'anthropic_api_key',
            'claude' => 'anthropic_api_key',
            'gemini' => 'gemini_api_key',
        );
        $key = isset($map[$provider]) ? $map[$provider] : '';
        if ($key === '') {
            return false;
        }
        return bacara_ai_config_get($key, '') !== '';
    }
}

if (!function_exists('bacara_ai_config_mask_key')) {
    function bacara_ai_config_mask_key($key)
    {
        $key = trim((string) $key);
        if ($key === '') {
            return '';
        }
        $len = strlen($key);
        if ($len <= 8) {
            return str_repeat('•', max(4, $len));
        }
        return str_repeat('•', min(24, $len - 4)) . substr($key, -4);
    }
}

if (!function_exists('bacara_ai_config_status')) {
    function bacara_ai_config_status()
    {
        return array(
            'openai' => bacara_ai_config_has_key('openai'),
            'anthropic' => bacara_ai_config_has_key('anthropic'),
            'gemini' => bacara_ai_config_has_key('gemini'),
            'enabled' => bacara_ai_config_is_enabled(),
            'auto_bet' => bacara_ai_config_is_auto_bet_enabled(),
        );
    }
}

if (!function_exists('bacara_ai_config_save')) {
    /**
     * @param array $values 저장할 값. API 키는 빈 문자열이면 기존 유지.
     * @param array $clear_keys 강제로 비울 키 이름 목록 (예: openai_api_key)
     */
    function bacara_ai_config_save(array $values, array $clear_keys = array())
    {
        $cfg = bacara_ai_config_load();
        $defaults = bacara_ai_config_defaults();
        $clear_lookup = array();
        foreach ($clear_keys as $ck) {
            $clear_lookup[(string) $ck] = true;
        }

        foreach ($defaults as $key => $_default) {
            if (isset($clear_lookup[$key])) {
                $cfg[$key] = '';
                continue;
            }
            if (!array_key_exists($key, $values)) {
                continue;
            }
            $incoming = trim((string) $values[$key]);
            // API 키: 비우면 기존 유지
            if (substr($key, -8) === '_api_key' && $incoming === '') {
                continue;
            }
            $cfg[$key] = $incoming;
        }

        if ($cfg['enabled'] !== '0') {
            $cfg['enabled'] = '1';
        }
        if ($cfg['auto_bet_enabled'] !== '0') {
            $cfg['auto_bet_enabled'] = '1';
        }

        $path = bacara_ai_config_path();
        $php = "<?php\nif (!defined('_GNUBOARD_')) exit;\n"
            . "define('BACARAAI_OPENAI_API_KEY', " . var_export($cfg['openai_api_key'], true) . ");\n"
            . "define('BACARAAI_OPENAI_MODEL', " . var_export($cfg['openai_model'], true) . ");\n"
            . "define('BACARAAI_ANTHROPIC_API_KEY', " . var_export($cfg['anthropic_api_key'], true) . ");\n"
            . "define('BACARAAI_ANTHROPIC_MODEL', " . var_export($cfg['anthropic_model'], true) . ");\n"
            . "define('BACARAAI_GEMINI_API_KEY', " . var_export($cfg['gemini_api_key'], true) . ");\n"
            . "define('BACARAAI_GEMINI_MODEL', " . var_export($cfg['gemini_model'], true) . ");\n"
            . "define('BACARAAI_AI_ENABLED', " . var_export($cfg['enabled'], true) . ");\n"
            . "define('BACARAAI_AI_AUTO_BET', " . var_export($cfg['auto_bet_enabled'], true) . ");\n";

        if (@file_put_contents($path, $php, LOCK_EX) === false) {
            return false;
        }
        if (defined('G5_FILE_PERMISSION')) {
            @chmod($path, G5_FILE_PERMISSION);
        }

        // static 캐시 갱신
        $reload = null;
        // force reload on next load by writing a fresh include path — simplest: unset via re-include pattern
        // callers should not rely on mid-request stale cache after save
        return true;
    }
}
