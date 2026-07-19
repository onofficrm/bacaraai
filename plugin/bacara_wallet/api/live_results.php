<?php
/**
 * 로그인 회원의 실시간 바카라 결과 JSON
 *
 * GET table_name=MD2729&limit=120
 *
 * - 최신 game_no 결과만 반환 (game_no 변경 = 새 게임)
 * - score account 는 live config 의 account 우선, 없으면 로그인 ID,
 *   그래도 없으면 awesome / 테이블 전체 fallback
 */
include_once dirname(__FILE__) . '/../../../common.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

if (empty($is_member) || empty($member['mb_id'])) {
    http_response_code(401);
    echo json_encode(array(
        'ok' => false,
        'logged_in' => false,
        'message' => '로그인이 필요합니다.',
    ), JSON_UNESCAPED_UNICODE);
    exit;
}

$table_name = isset($_GET['table_name']) ? strtoupper(trim($_GET['table_name'])) : 'MD2729';
if (!preg_match('/^[A-Z0-9_-]{1,40}$/', $table_name)) {
    http_response_code(400);
    echo json_encode(array(
        'ok' => false,
        'message' => '올바르지 않은 테이블 코드입니다.',
    ), JSON_UNESCAPED_UNICODE);
    exit;
}

$limit = isset($_GET['limit']) ? (int) $_GET['limit'] : 120;
$limit = max(1, min(300, $limit));

$live_cfg_file = G5_DATA_PATH . '/bacaraai-live.config.php';
$live_link = null;
$use_live_cfg = false;
$live_cfg = array();

if (is_file($live_cfg_file)) {
    $loaded = include $live_cfg_file;
    if (is_array($loaded)
        && !empty($loaded['host'])
        && !empty($loaded['user'])
        && array_key_exists('password', $loaded)
        && !empty($loaded['database'])
    ) {
        $live_cfg = $loaded;
        mysqli_report(MYSQLI_REPORT_OFF);
        $live_port = !empty($live_cfg['port']) ? (int) $live_cfg['port'] : 3306;
        $live_link = @mysqli_connect(
            $live_cfg['host'],
            $live_cfg['user'],
            $live_cfg['password'],
            $live_cfg['database'],
            $live_port
        );
        if ($live_link) {
            @mysqli_set_charset($live_link, G5_DB_CHARSET);
            $use_live_cfg = true;
        }
    }
}

$safe_table_name = $use_live_cfg
    ? mysqli_real_escape_string($live_link, $table_name)
    : sql_real_escape_string($table_name);

function bacara_live_escape($value, $use_live_cfg, $live_link)
{
    return $use_live_cfg
        ? mysqli_real_escape_string($live_link, $value)
        : sql_real_escape_string($value);
}

function bacara_live_fetch_rows($sql, $use_live_cfg, $live_link, &$query_error)
{
    $rows = array();
    $query_error = '';

    if ($use_live_cfg) {
        $query = @mysqli_query($live_link, $sql);
        if (!$query) {
            $query_error = mysqli_error($live_link);
            return $rows;
        }
        while ($row = mysqli_fetch_assoc($query)) {
            $rows[] = array(
                'id' => (int) $row['id'],
                'account' => isset($row['account']) ? $row['account'] : '',
                'table_name' => $row['table_name'],
                'game_no' => isset($row['game_no']) ? (int) $row['game_no'] : null,
                'result' => $row['result'],
                'detected_at' => $row['detected_at'],
            );
        }
        return $rows;
    }

    $query = sql_query($sql, false);
    if (!$query) {
        $query_error = 'sql_query failed';
        return $rows;
    }
    while ($row = sql_fetch_array($query)) {
        $rows[] = array(
            'id' => (int) $row['id'],
            'account' => isset($row['account']) ? $row['account'] : '',
            'table_name' => $row['table_name'],
            'game_no' => isset($row['game_no']) ? (int) $row['game_no'] : null,
            'result' => $row['result'],
            'detected_at' => $row['detected_at'],
        );
    }
    return $rows;
}

function bacara_live_query_for_account($account, $safe_table_name, $limit, $use_live_cfg, $live_link, &$query_error)
{
    $safe_account = bacara_live_escape($account, $use_live_cfg, $live_link);
    $sql = " select id, account, table_name, game_no, result, detected_at
               from `bacaraai`
              where account = '{$safe_account}'
                and table_name = '{$safe_table_name}'
                and result in ('P', 'B', 'T')
                and game_no = (
                    select game_no
                      from `bacaraai`
                     where account = '{$safe_account}'
                       and table_name = '{$safe_table_name}'
                       and result in ('P', 'B', 'T')
                     order by id desc
                     limit 1
                )
              order by id asc
              limit {$limit} ";
    return bacara_live_fetch_rows($sql, $use_live_cfg, $live_link, $query_error);
}

$account_candidates = array();
if (!empty($live_cfg['account'])) {
    $account_candidates[] = (string) $live_cfg['account'];
}
$account_candidates[] = (string) $member['mb_id'];
$account_candidates[] = 'awesome';
$account_candidates = array_values(array_unique(array_filter($account_candidates)));

$rows = array();
$query_error = '';
$used_account = null;

foreach ($account_candidates as $candidate) {
    $rows = bacara_live_query_for_account(
        $candidate,
        $safe_table_name,
        $limit,
        $use_live_cfg,
        $live_link,
        $query_error
    );
    if ($query_error !== '') {
        break;
    }
    if (count($rows) > 0) {
        $used_account = $candidate;
        break;
    }
}

// 계정 매칭이 안 되면 해당 table_name 의 최신 game_no 전체로 fallback
if ($query_error === '' && count($rows) === 0) {
    $sql = " select id, account, table_name, game_no, result, detected_at
               from `bacaraai`
              where table_name = '{$safe_table_name}'
                and result in ('P', 'B', 'T')
                and game_no = (
                    select game_no
                      from `bacaraai`
                     where table_name = '{$safe_table_name}'
                       and result in ('P', 'B', 'T')
                     order by id desc
                     limit 1
                )
              order by id asc
              limit {$limit} ";
    $rows = bacara_live_fetch_rows($sql, $use_live_cfg, $live_link, $query_error);
    if (count($rows) > 0) {
        $used_account = $rows[0]['account'];
    }
}

if ($query_error !== '') {
    http_response_code(500);
    echo json_encode(array(
        'ok' => false,
        'message' => '실시간 결과 테이블을 조회할 수 없습니다.',
        'error' => $query_error,
    ), JSON_UNESCAPED_UNICODE);
    exit;
}

$latest = count($rows) ? $rows[count($rows) - 1] : null;
$game_no = $latest && isset($latest['game_no']) ? $latest['game_no'] : null;

echo json_encode(array(
    'ok' => true,
    'logged_in' => true,
    'member_id' => $member['mb_id'],
    'account' => $used_account !== null ? $used_account : $member['mb_id'],
    'table_name' => $table_name,
    'game_no' => $game_no,
    'source' => $use_live_cfg ? 'live_config' : 'g5',
    'count' => count($rows),
    'latest_id' => $latest ? $latest['id'] : null,
    'latest_detected_at' => $latest ? $latest['detected_at'] : null,
    'results' => $rows,
), JSON_UNESCAPED_UNICODE);
exit;
