<?php
/**
 * 바카라 AI — API 사용량·요금 기록
 *
 * 응답의 토큰 사용량을 저장하고, 공개 단가표로 USD 추정 요금을 계산합니다.
 * (실제 청구액은 각 벤더 콘솔 기준이며, 여기 값은 운영 참고용 추정입니다.)
 */
if (!defined('_GNUBOARD_')) {
    exit;
}

if (!function_exists('bacara_ai_usage_table')) {
    function bacara_ai_usage_table()
    {
        return G5_TABLE_PREFIX . 'bacara_ai_usage';
    }
}

if (!function_exists('bacara_ai_usage_install_tables')) {
    function bacara_ai_usage_install_tables()
    {
        $table = bacara_ai_usage_table();
        sql_query(
            " CREATE TABLE IF NOT EXISTS `{$table}` (
                `id` bigint unsigned NOT NULL AUTO_INCREMENT,
                `provider` varchar(20) NOT NULL,
                `model` varchar(80) NOT NULL DEFAULT '',
                `purpose` varchar(40) NOT NULL DEFAULT 'analyze',
                `table_name` varchar(40) NOT NULL DEFAULT '',
                `input_tokens` int unsigned NOT NULL DEFAULT 0,
                `output_tokens` int unsigned NOT NULL DEFAULT 0,
                `total_tokens` int unsigned NOT NULL DEFAULT 0,
                `cost_usd` decimal(12,6) NOT NULL DEFAULT 0,
                `ms` int unsigned NOT NULL DEFAULT 0,
                `ok` tinyint NOT NULL DEFAULT 1,
                `error` varchar(255) NOT NULL DEFAULT '',
                `created_at` datetime NOT NULL,
                PRIMARY KEY (`id`),
                KEY `idx_provider_created` (`provider`, `created_at`),
                KEY `idx_created` (`created_at`),
                KEY `idx_purpose` (`purpose`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 ",
            false
        );
    }
}

if (!function_exists('bacara_ai_usage_price_table')) {
    /**
     * USD per 1M tokens (input / output). 관리 참고용 단가.
     */
    function bacara_ai_usage_price_table()
    {
        return array(
            'openai' => array(
                'gpt-4o-mini' => array(0.15, 0.60),
                'gpt-4o' => array(2.50, 10.00),
                'gpt-4.1-mini' => array(0.40, 1.60),
                'gpt-4.1' => array(2.00, 8.00),
                'default' => array(0.15, 0.60),
            ),
            'anthropic' => array(
                'claude-sonnet-4-20250514' => array(3.00, 15.00),
                'claude-sonnet-4' => array(3.00, 15.00),
                'claude-3-5-sonnet' => array(3.00, 15.00),
                'claude-3-haiku' => array(0.25, 1.25),
                'default' => array(3.00, 15.00),
            ),
            'gemini' => array(
                'gemini-2.5-flash' => array(0.30, 2.50),
                'gemini-2.5-flash-lite' => array(0.10, 0.40),
                'gemini-2.0-flash' => array(0.10, 0.40),
                'gemini-2.0-flash-lite' => array(0.075, 0.30),
                'gemini-1.5-flash' => array(0.075, 0.30),
                'default' => array(0.30, 2.50),
            ),
        );
    }
}

if (!function_exists('bacara_ai_usage_estimate_usd')) {
    function bacara_ai_usage_estimate_usd($provider, $model, $input_tokens, $output_tokens)
    {
        $provider = strtolower(trim((string) $provider));
        $model = strtolower(trim((string) $model));
        $input_tokens = max(0, (int) $input_tokens);
        $output_tokens = max(0, (int) $output_tokens);

        $table = bacara_ai_usage_price_table();
        $rates = isset($table[$provider]['default']) ? $table[$provider]['default'] : array(0, 0);

        if (isset($table[$provider]) && is_array($table[$provider])) {
            foreach ($table[$provider] as $key => $pair) {
                if ($key === 'default') {
                    continue;
                }
                if ($model === $key || strpos($model, $key) === 0 || strpos($key, $model) === 0) {
                    $rates = $pair;
                    break;
                }
                // 부분 매칭 (예: claude-sonnet-4-xxxxx)
                if ($model !== '' && (strpos($model, str_replace('-20250514', '', $key)) !== false || strpos($key, explode('-20', $model)[0]) !== false)) {
                    $rates = $pair;
                    break;
                }
            }
            // 더 단순한 포함 매칭
            if ($model !== '') {
                if (strpos($model, 'gpt-4o-mini') !== false) {
                    $rates = $table['openai']['gpt-4o-mini'];
                } elseif (strpos($model, 'gpt-4o') !== false && isset($table['openai']['gpt-4o'])) {
                    $rates = $table['openai']['gpt-4o'];
                } elseif (strpos($model, 'sonnet') !== false && $provider === 'anthropic') {
                    $rates = $table['anthropic']['default'];
                } elseif (strpos($model, 'flash-lite') !== false && $provider === 'gemini') {
                    $rates = isset($table['gemini']['gemini-2.5-flash-lite'])
                        ? $table['gemini']['gemini-2.5-flash-lite']
                        : $table['gemini']['default'];
                } elseif (strpos($model, 'flash') !== false && $provider === 'gemini') {
                    $rates = isset($table['gemini']['gemini-2.5-flash'])
                        ? $table['gemini']['gemini-2.5-flash']
                        : $table['gemini']['default'];
                }
            }
        }

        $in_rate = (float) $rates[0];
        $out_rate = (float) $rates[1];
        return ($input_tokens / 1000000.0) * $in_rate + ($output_tokens / 1000000.0) * $out_rate;
    }
}

if (!function_exists('bacara_ai_usage_extract_tokens')) {
    /**
     * @return array{input:int,output:int,total:int}
     */
    function bacara_ai_usage_extract_tokens($provider, $json)
    {
        $input = 0;
        $output = 0;
        if (!is_array($json)) {
            return array('input' => 0, 'output' => 0, 'total' => 0);
        }

        if ($provider === 'openai') {
            if (isset($json['usage']['prompt_tokens'])) {
                $input = (int) $json['usage']['prompt_tokens'];
            }
            if (isset($json['usage']['completion_tokens'])) {
                $output = (int) $json['usage']['completion_tokens'];
            }
            if (!$input && !$output && isset($json['usage']['total_tokens'])) {
                $input = (int) $json['usage']['total_tokens'];
            }
        } elseif ($provider === 'anthropic') {
            if (isset($json['usage']['input_tokens'])) {
                $input = (int) $json['usage']['input_tokens'];
            }
            if (isset($json['usage']['output_tokens'])) {
                $output = (int) $json['usage']['output_tokens'];
            }
        } else { // gemini
            if (isset($json['usageMetadata']['promptTokenCount'])) {
                $input = (int) $json['usageMetadata']['promptTokenCount'];
            }
            if (isset($json['usageMetadata']['candidatesTokenCount'])) {
                $output = (int) $json['usageMetadata']['candidatesTokenCount'];
            }
            if (!$output && isset($json['usageMetadata']['totalTokenCount']) && $input) {
                $output = max(0, (int) $json['usageMetadata']['totalTokenCount'] - $input);
            }
        }

        return array(
            'input' => $input,
            'output' => $output,
            'total' => $input + $output,
        );
    }
}

if (!function_exists('bacara_ai_usage_log')) {
    /**
     * @param array $opts provider, model, purpose, table_name, input_tokens, output_tokens, ms, ok, error
     */
    function bacara_ai_usage_log(array $opts)
    {
        bacara_ai_usage_install_tables();
        $table = bacara_ai_usage_table();

        $provider = preg_replace('/[^a-z]/', '', strtolower(isset($opts['provider']) ? $opts['provider'] : ''));
        if ($provider === 'gpt') {
            $provider = 'openai';
        }
        if ($provider === 'claude') {
            $provider = 'anthropic';
        }
        if (!in_array($provider, array('openai', 'anthropic', 'gemini'), true)) {
            return false;
        }

        $model = isset($opts['model']) ? substr(trim((string) $opts['model']), 0, 80) : '';
        $purpose = isset($opts['purpose']) ? substr(preg_replace('/[^a-z0-9_]/', '', (string) $opts['purpose']), 0, 40) : 'analyze';
        if ($purpose === '') {
            $purpose = 'analyze';
        }
        $table_name = isset($opts['table_name']) ? substr(strtoupper(trim((string) $opts['table_name'])), 0, 40) : '';
        $input = max(0, isset($opts['input_tokens']) ? (int) $opts['input_tokens'] : 0);
        $output = max(0, isset($opts['output_tokens']) ? (int) $opts['output_tokens'] : 0);
        $total = $input + $output;
        $ms = max(0, isset($opts['ms']) ? (int) $opts['ms'] : 0);
        $ok = empty($opts['ok']) ? 0 : 1;
        $error = isset($opts['error']) ? substr(trim((string) $opts['error']), 0, 255) : '';
        $cost = bacara_ai_usage_estimate_usd($provider, $model, $input, $output);

        $safe_provider = sql_real_escape_string($provider);
        $safe_model = sql_real_escape_string($model);
        $safe_purpose = sql_real_escape_string($purpose);
        $safe_table = sql_real_escape_string($table_name);
        $safe_error = sql_real_escape_string($error);
        $cost_sql = number_format($cost, 6, '.', '');
        $now = G5_TIME_YMDHIS;

        return sql_query(
            " insert into `{$table}`
                 set provider = '{$safe_provider}',
                     model = '{$safe_model}',
                     purpose = '{$safe_purpose}',
                     table_name = '{$safe_table}',
                     input_tokens = {$input},
                     output_tokens = {$output},
                     total_tokens = {$total},
                     cost_usd = {$cost_sql},
                     ms = {$ms},
                     ok = {$ok},
                     error = '{$safe_error}',
                     created_at = '{$now}' ",
            false
        );
    }
}

if (!function_exists('bacara_ai_usage_summary')) {
    /**
     * @param string $from Y-m-d H:i:s
     * @param string $to
     */
    function bacara_ai_usage_summary($from, $to)
    {
        bacara_ai_usage_install_tables();
        $table = bacara_ai_usage_table();
        $safe_from = sql_real_escape_string($from);
        $safe_to = sql_real_escape_string($to);

        $rows = array();
        $q = sql_query(
            " select provider,
                     count(*) as calls,
                     sum(ok) as ok_calls,
                     sum(input_tokens) as input_tokens,
                     sum(output_tokens) as output_tokens,
                     sum(total_tokens) as total_tokens,
                     sum(cost_usd) as cost_usd,
                     avg(ms) as avg_ms
                from `{$table}`
               where created_at >= '{$safe_from}'
                 and created_at <= '{$safe_to}'
               group by provider
               order by field(provider, 'openai', 'anthropic', 'gemini'), provider asc ",
            false
        );
        if ($q) {
            while ($row = sql_fetch_array($q)) {
                $rows[] = array(
                    'provider' => $row['provider'],
                    'calls' => (int) $row['calls'],
                    'ok_calls' => (int) $row['ok_calls'],
                    'input_tokens' => (int) $row['input_tokens'],
                    'output_tokens' => (int) $row['output_tokens'],
                    'total_tokens' => (int) $row['total_tokens'],
                    'cost_usd' => (float) $row['cost_usd'],
                    'avg_ms' => (int) round((float) $row['avg_ms']),
                );
            }
        }
        return $rows;
    }
}

if (!function_exists('bacara_ai_usage_daily')) {
    function bacara_ai_usage_daily($from, $to)
    {
        bacara_ai_usage_install_tables();
        $table = bacara_ai_usage_table();
        $safe_from = sql_real_escape_string($from);
        $safe_to = sql_real_escape_string($to);
        $rows = array();
        $q = sql_query(
            " select date(created_at) as d,
                     provider,
                     count(*) as calls,
                     sum(total_tokens) as total_tokens,
                     sum(cost_usd) as cost_usd
                from `{$table}`
               where created_at >= '{$safe_from}'
                 and created_at <= '{$safe_to}'
               group by date(created_at), provider
               order by d desc, provider asc
               limit 90 ",
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

if (!function_exists('bacara_ai_usage_recent')) {
    function bacara_ai_usage_recent($limit = 50)
    {
        bacara_ai_usage_install_tables();
        $table = bacara_ai_usage_table();
        $limit = max(1, min(200, (int) $limit));
        $rows = array();
        $q = sql_query(
            " select * from `{$table}` order by id desc limit {$limit} ",
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

if (!function_exists('bacara_ai_usage_provider_label')) {
    function bacara_ai_usage_provider_label($provider)
    {
        $map = array(
            'openai' => 'ChatGPT (OpenAI)',
            'anthropic' => 'Claude (Anthropic)',
            'gemini' => 'Gemini (Google)',
        );
        return isset($map[$provider]) ? $map[$provider] : $provider;
    }
}

if (!function_exists('bacara_ai_usage_format_usd')) {
    function bacara_ai_usage_format_usd($amount)
    {
        $amount = (float) $amount;
        if ($amount < 0.0001 && $amount > 0) {
            return '$' . number_format($amount, 6);
        }
        if ($amount < 0.01 && $amount > 0) {
            return '$' . number_format($amount, 4);
        }
        return '$' . number_format($amount, 4);
    }
}

if (!function_exists('bacara_ai_usage_log_http')) {
    function bacara_ai_usage_log_http($provider, $model, $purpose, array $res, $ms = 0, $table_name = '')
    {
        $json = json_decode(isset($res['raw']) ? $res['raw'] : '', true);
        $tok = bacara_ai_usage_extract_tokens($provider, is_array($json) ? $json : array());
        return bacara_ai_usage_log(array(
            'provider' => $provider,
            'model' => $model,
            'purpose' => $purpose,
            'table_name' => $table_name,
            'input_tokens' => $tok['input'],
            'output_tokens' => $tok['output'],
            'ms' => $ms,
            'ok' => !empty($res['ok']) ? 1 : 0,
            'error' => empty($res['ok']) ? (isset($res['error']) ? $res['error'] : 'fail') : '',
        ));
    }
}
