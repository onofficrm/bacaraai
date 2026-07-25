<?php
/**
 * 로그인 회원의 실시간 바카라 결과 JSON
 *
 * GET table_name=MD2729&limit=800
 *
 * - 현재 슈(shoe) 결과만 반환
 * - game_no 는 회차 카운터(1,2,3… 후 리셋). 최신 game_no 로 필터하면
 *   과거 슈의 같은 회차까지 섞이므로, 마지막 game_no=1 이후 id 구간을 사용
 * - 슈가 짧으면 슈 시작부터 전부 반환 (앞부분 잘림 방지 — 로드맵 불일치 원인)
 * - 슈가 limit 보다 길면 **최신** limit 건만 반환 + truncated=true
 * - 같은 game_no 중복 감지 시 최신 id 만 유지
 * - score account 는 live config 의 account 우선, 없으면 로그인 ID,
 *   그래도 없으면 awesome / 테이블 전체 fallback
 *   (여러 계정에 데이터가 있으면 가장 id 가 더 최신인 계정 선택)
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

$limit = isset($_GET['limit']) ? (int) $_GET['limit'] : 800;
$limit = max(1, min(1000, $limit));

/**
 * 모든 로그인 사용자가 같은 라이브 테이블을 조회하므로 짧은 공유 캐시 사용.
 * - fresh 1초: 즉시 반환
 * - 다른 요청이 갱신 중이면 stale(최대 10초)를 즉시 반환
 * 이렇게 하면 동시 사용자 수가 늘어도 외부 live DB 쿼리는 초당 최대 1회다.
 */
$live_cache_dir = G5_DATA_PATH . '/cache';
if (!is_dir($live_cache_dir)) {
    @mkdir($live_cache_dir, 0755, true);
}
$live_cache_key = preg_replace('/[^A-Z0-9_-]/', '', $table_name) . '-' . $limit;
$live_cache_file = $live_cache_dir . '/bacara-live-' . $live_cache_key . '.json';
$live_cache_lock_file = $live_cache_file . '.lock';
$live_cache_lock = null;

function bacara_live_cached_payload($file, $max_age)
{
    if (!is_file($file)) {
        return null;
    }
    $mtime = @filemtime($file);
    if (!$mtime || (time() - $mtime) > $max_age) {
        return null;
    }
    $raw = @file_get_contents($file);
    $data = $raw ? json_decode($raw, true) : null;
    return is_array($data) && !empty($data['ok']) ? $data : null;
}

function bacara_live_output_payload($payload, $member_id, $cache_state)
{
    $payload['logged_in'] = true;
    $payload['member_id'] = $member_id;
    $payload['cache'] = $cache_state;
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
}

$fresh_payload = bacara_live_cached_payload($live_cache_file, 1);
if ($fresh_payload !== null) {
    bacara_live_output_payload($fresh_payload, $member['mb_id'], 'fresh');
    exit;
}

$live_cache_lock = @fopen($live_cache_lock_file, 'c');
if ($live_cache_lock && !@flock($live_cache_lock, LOCK_EX | LOCK_NB)) {
    // 다른 PHP worker가 DB를 갱신 중이면 게임 화면을 기다리게 하지 않는다.
    $stale_payload = bacara_live_cached_payload($live_cache_file, 10);
    if ($stale_payload !== null) {
        @fclose($live_cache_lock);
        bacara_live_output_payload($stale_payload, $member['mb_id'], 'stale');
        exit;
    }
    // 최초 요청만 최대 짧게 대기. 이후에는 생성된 캐시를 사용한다.
    @flock($live_cache_lock, LOCK_EX);
    $fresh_payload = bacara_live_cached_payload($live_cache_file, 10);
    if ($fresh_payload !== null) {
        @flock($live_cache_lock, LOCK_UN);
        @fclose($live_cache_lock);
        bacara_live_output_payload($fresh_payload, $member['mb_id'], 'waited');
        exit;
    }
}

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
        $live_link = @mysqli_init();
        if ($live_link) {
            @mysqli_options($live_link, MYSQLI_OPT_CONNECT_TIMEOUT, 3);
            if (defined('MYSQLI_OPT_READ_TIMEOUT')) {
                @mysqli_options($live_link, MYSQLI_OPT_READ_TIMEOUT, 3);
            }
            $connected = @mysqli_real_connect(
                $live_link,
                $live_cfg['host'],
                $live_cfg['user'],
                $live_cfg['password'],
                $live_cfg['database'],
                $live_port
            );
            if (!$connected) {
                $live_link = null;
            }
        }
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

/**
 * 단일 값 조회 헬퍼
 */
function bacara_live_query_scalar($sql, $use_live_cfg, $live_link, $field, &$query_error)
{
    $query_error = '';
    if ($use_live_cfg) {
        $q = @mysqli_query($live_link, $sql);
        if (!$q) {
            $query_error = mysqli_error($live_link);
            return null;
        }
        $row = mysqli_fetch_assoc($q);
        return $row && isset($row[$field]) ? $row[$field] : null;
    }
    $q = sql_query($sql, false);
    if (!$q) {
        $query_error = 'sql_query failed';
        return null;
    }
    $row = sql_fetch_array($q);
    return $row && isset($row[$field]) ? $row[$field] : null;
}

/**
 * 현재 슈 시작 id: 최근 game_no=1 행. 없으면 null.
 */
function bacara_live_shoe_start_id($account_clause, $safe_table_name, $use_live_cfg, $live_link, &$query_error)
{
    $sql = " select id
               from `bacaraai`
              where {$account_clause}
                and table_name = '{$safe_table_name}'
                and result in ('P', 'B', 'T')
                and game_no = 1
              order by id desc
              limit 1 ";
    $val = bacara_live_query_scalar($sql, $use_live_cfg, $live_link, 'id', $query_error);
    return $val === null ? null : (int) $val;
}

/**
 * 슈 구간 조회.
 * - 슈 길이 ≤ limit → 슈 시작부터 전부 (로드맵이 카지노와 맞도록)
 * - 슈 길이 > limit → 최신 limit 만 + truncated
 */
function bacara_live_query_for_account($account, $safe_table_name, $limit, $use_live_cfg, $live_link, &$query_error, &$meta)
{
    $safe_account = bacara_live_escape($account, $use_live_cfg, $live_link);
    $account_clause = "account = '{$safe_account}'";
    $meta = is_array($meta) ? $meta : array();

    $shoe_start = bacara_live_shoe_start_id(
        $account_clause,
        $safe_table_name,
        $use_live_cfg,
        $live_link,
        $query_error
    );
    if ($query_error !== '') {
        return array();
    }

    if ($shoe_start === null) {
        $fallback_sql = " select greatest(0, coalesce(max(id), 0) - {$limit} + 1) as sid
                            from `bacaraai`
                           where {$account_clause}
                             and table_name = '{$safe_table_name}'
                             and result in ('P', 'B', 'T') ";
        $sid = bacara_live_query_scalar($fallback_sql, $use_live_cfg, $live_link, 'sid', $query_error);
        if ($query_error !== '') {
            return array();
        }
        $shoe_start = $sid === null ? 0 : (int) $sid;
        $meta['shoe_start_mode'] = 'fallback';
    } else {
        $meta['shoe_start_mode'] = 'game_no_1';
    }
    $meta['shoe_start_id'] = $shoe_start;

    $count_sql = " select count(*) as cnt
                     from `bacaraai`
                    where {$account_clause}
                      and table_name = '{$safe_table_name}'
                      and result in ('P', 'B', 'T')
                      and id >= {$shoe_start} ";
    $cnt = bacara_live_query_scalar($count_sql, $use_live_cfg, $live_link, 'cnt', $query_error);
    if ($query_error !== '') {
        return array();
    }
    $shoe_count = $cnt === null ? 0 : (int) $cnt;
    $meta['shoe_count'] = $shoe_count;

    if ($shoe_count > $limit) {
        $meta['truncated'] = true;
        $sql = " select id, account, table_name, game_no, result, detected_at
                   from (
                        select id, account, table_name, game_no, result, detected_at
                          from `bacaraai`
                         where {$account_clause}
                           and table_name = '{$safe_table_name}'
                           and result in ('P', 'B', 'T')
                           and id >= {$shoe_start}
                         order by id desc
                         limit {$limit}
                   ) as recent_shoe
                  order by id asc ";
    } else {
        $meta['truncated'] = false;
        $sql = " select id, account, table_name, game_no, result, detected_at
                   from `bacaraai`
                  where {$account_clause}
                    and table_name = '{$safe_table_name}'
                    and result in ('P', 'B', 'T')
                    and id >= {$shoe_start}
                  order by id asc
                  limit {$limit} ";
    }

    return bacara_live_fetch_rows($sql, $use_live_cfg, $live_link, $query_error);
}

/**
 * 같은 game_no 가 여러 번 감지되면 최신 id 만 남김 (재감지·오탐 보정).
 */
function bacara_live_dedupe_game_no($rows)
{
    if (!is_array($rows) || count($rows) === 0) {
        return array();
    }

    $best = array();
    $passthrough = array();
    foreach ($rows as $row) {
        $no = isset($row['game_no']) ? (int) $row['game_no'] : 0;
        if ($no <= 0) {
            $passthrough[] = $row;
            continue;
        }
        if (!isset($best[$no]) || (int) $row['id'] > (int) $best[$no]['id']) {
            $best[$no] = $row;
        }
    }

    $out = array_merge(array_values($best), $passthrough);
    usort($out, function ($a, $b) {
        return (int) $a['id'] - (int) $b['id'];
    });
    return $out;
}

/**
 * id 오름차순에서 슈 경계(game_no 감소)를 찾아 마지막 슈만 남김.
 */
function bacara_live_trim_to_current_shoe($rows)
{
    if (!is_array($rows) || count($rows) === 0) {
        return array();
    }

    $start = 0;
    $prev_no = null;
    for ($i = 0; $i < count($rows); $i++) {
        $no = isset($rows[$i]['game_no']) ? (int) $rows[$i]['game_no'] : null;
        if ($prev_no !== null && $no !== null && $no > 0 && $prev_no > 0 && $no < $prev_no) {
            $start = $i;
        }
        if ($no !== null && $no > 0) {
            $prev_no = $no;
        }
    }

    if ($start === 0) {
        return $rows;
    }
    return array_values(array_slice($rows, $start));
}

function bacara_live_latest_id($rows)
{
    if (!is_array($rows) || count($rows) === 0) {
        return 0;
    }
    $last = $rows[count($rows) - 1];
    return isset($last['id']) ? (int) $last['id'] : 0;
}

$account_candidates = array();
if (!empty($live_cfg['account'])) {
    // 운영 감지 계정이 명시되면 모든 사용자가 같은 단일 결과 스트림을 본다.
    // 로그인 회원 ID를 추가 후보로 섞으면 첫 캐시 요청자의 개인 데이터가
    // 전체 사용자에게 노출되거나 서로 다른 슈가 선택될 수 있다.
    $account_candidates[] = (string) $live_cfg['account'];
} else {
    $account_candidates[] = (string) $member['mb_id'];
    $account_candidates[] = 'awesome';
}
$account_candidates = array_values(array_unique(array_filter($account_candidates)));

$rows = array();
$query_error = '';
$used_account = null;
$best_latest_id = -1;
$used_meta = array(
    'truncated' => false,
    'shoe_count' => 0,
    'shoe_start_id' => null,
    'shoe_start_mode' => null,
);

foreach ($account_candidates as $candidate) {
    $candidate_meta = array();
    $candidate_rows = bacara_live_query_for_account(
        $candidate,
        $safe_table_name,
        $limit,
        $use_live_cfg,
        $live_link,
        $query_error,
        $candidate_meta
    );
    if ($query_error !== '') {
        break;
    }
    if (count($candidate_rows) === 0) {
        continue;
    }
    $candidate_latest = bacara_live_latest_id($candidate_rows);
    if ($candidate_latest > $best_latest_id) {
        $rows = $candidate_rows;
        $best_latest_id = $candidate_latest;
        $used_account = $candidate;
        $used_meta = $candidate_meta;
    }
}

// 계정 매칭이 안 되면 해당 table_name 의 현재 슈로 fallback
if ($query_error === '' && count($rows) === 0) {
    $account_clause = '1=1';
    $shoe_start = bacara_live_shoe_start_id(
        $account_clause,
        $safe_table_name,
        $use_live_cfg,
        $live_link,
        $query_error
    );
    if ($query_error === '') {
        if ($shoe_start === null) {
            $fallback_sql = " select greatest(0, coalesce(max(id), 0) - {$limit} + 1) as sid
                                from `bacaraai`
                               where table_name = '{$safe_table_name}'
                                 and result in ('P', 'B', 'T') ";
            $sid = bacara_live_query_scalar($fallback_sql, $use_live_cfg, $live_link, 'sid', $query_error);
            $shoe_start = $sid === null ? 0 : (int) $sid;
            $used_meta['shoe_start_mode'] = 'fallback';
        } else {
            $used_meta['shoe_start_mode'] = 'game_no_1';
        }
        $used_meta['shoe_start_id'] = $shoe_start;

        $count_sql = " select count(*) as cnt
                         from `bacaraai`
                        where table_name = '{$safe_table_name}'
                          and result in ('P', 'B', 'T')
                          and id >= {$shoe_start} ";
        $cnt = bacara_live_query_scalar($count_sql, $use_live_cfg, $live_link, 'cnt', $query_error);
        $shoe_count = $cnt === null ? 0 : (int) $cnt;
        $used_meta['shoe_count'] = $shoe_count;
        $used_meta['truncated'] = $shoe_count > $limit;

        if ($shoe_count > $limit) {
            $sql = " select id, account, table_name, game_no, result, detected_at
                       from (
                            select id, account, table_name, game_no, result, detected_at
                              from `bacaraai`
                             where table_name = '{$safe_table_name}'
                               and result in ('P', 'B', 'T')
                               and id >= {$shoe_start}
                             order by id desc
                             limit {$limit}
                       ) as recent_shoe
                      order by id asc ";
        } else {
            $sql = " select id, account, table_name, game_no, result, detected_at
                       from `bacaraai`
                      where table_name = '{$safe_table_name}'
                        and result in ('P', 'B', 'T')
                        and id >= {$shoe_start}
                      order by id asc
                      limit {$limit} ";
        }
        $rows = bacara_live_fetch_rows($sql, $use_live_cfg, $live_link, $query_error);
        if (count($rows) > 0) {
            $used_account = $rows[0]['account'];
        }
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

$rows = bacara_live_trim_to_current_shoe($rows);
$before_dedupe = count($rows);
$rows = bacara_live_dedupe_game_no($rows);

$latest = count($rows) ? $rows[count($rows) - 1] : null;
$game_no = $latest && isset($latest['game_no']) ? $latest['game_no'] : null;

$payload = array(
    'ok' => true,
    'account' => $used_account !== null ? $used_account : '',
    'table_name' => $table_name,
    'game_no' => $game_no,
    'source' => $use_live_cfg ? 'live_config' : 'g5',
    'count' => count($rows),
    'shoe_count' => isset($used_meta['shoe_count']) ? (int) $used_meta['shoe_count'] : count($rows),
    'truncated' => !empty($used_meta['truncated']),
    'deduped' => $before_dedupe - count($rows),
    'shoe_start_id' => isset($used_meta['shoe_start_id']) ? $used_meta['shoe_start_id'] : null,
    'latest_id' => $latest ? $latest['id'] : null,
    'latest_detected_at' => $latest ? $latest['detected_at'] : null,
    'results' => $rows,
);

// 완성된 정상 응답만 원자적으로 캐시에 교체한다.
$cache_tmp = $live_cache_file . '.' . getmypid() . '.tmp';
@file_put_contents($cache_tmp, json_encode($payload, JSON_UNESCAPED_UNICODE), LOCK_EX);
@rename($cache_tmp, $live_cache_file);
if ($live_cache_lock) {
    @flock($live_cache_lock, LOCK_UN);
    @fclose($live_cache_lock);
}

bacara_live_output_payload($payload, $member['mb_id'], 'miss');
exit;
