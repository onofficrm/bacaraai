<?php
/**
 * 로그인 회원의 실시간 바카라 결과 JSON
 *
 * GET table_name=MD2729&limit=800
 *
 * - 현재 슈(shoe) 결과만 반환
 * - game_status 테이블: game(활성) / shuffle(셔플) / lobby(종료)
 *   구버전 stop 은 lobby 로 정규화
 *   SELECT status FROM game_status WHERE account=? AND table_name=?
 *   (매 응답마다 재조회, shuffle 시 shuffle_active=true)
 * - game_no 는 회차 카운터(1,2,3… 후 리셋). 최신 game_no 로 필터하면
 *   과거 슈의 같은 회차까지 섞이므로, 마지막 game_no=1 이후 id 구간을 사용
 * - 슈가 짧으면 슈 시작부터 전부 반환 (앞부분 잘림 방지 — 로드맵 불일치 원인)
 * - 슈가 limit 보다 길면 **최신** limit 건만 반환 + truncated=true
 * - 같은 game_no + 같은 result 재감지만 최신 id 로 교체
 *   (game_no 가 고정된 채 result 만 바뀌면 각각 새 회차로 유지)
 * - 슈 경계: game_no 감소, game_no=1 재시작, 또는 detected_at 긴 공백
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
$force_refresh = isset($_GET['force']) && (string) $_GET['force'] === '1';

if (is_file(G5_LIB_PATH . '/bacara-live-integrity.lib.php')) {
    include_once G5_LIB_PATH . '/bacara-live-integrity.lib.php';
}

// 관리자 수동 모드 — 단, 감지가 수동 전환 이후 새 결과를 내면 즉시 감지 피드로 복귀
$live_sync_healed = false;
if (is_file(G5_LIB_PATH . '/bacara-live-admin.lib.php')) {
    include_once G5_LIB_PATH . '/bacara-live-admin.lib.php';
    bacara_live_admin_install_tables();
    if (bacara_live_admin_is_manual($table_name)) {
        $should_yield = function_exists('bacara_live_manual_should_yield_to_detector')
            && bacara_live_manual_should_yield_to_detector($table_name);
        if ($should_yield) {
            bacara_live_admin_disable_manual($table_name, 'system-sync');
            $live_sync_healed = true;
            // 캐시에 수동 결과가 남아 있으면 감지로 복귀해도 옛 표시가 나갈 수 있음
            if (function_exists('bacara_live_admin_invalidate_cache')) {
                bacara_live_admin_invalidate_cache($table_name);
            }
            // fall through → 감지 DB
        } else {
            $admin_payload = bacara_live_admin_build_payload($table_name, $limit);
            if (is_array($admin_payload) && !empty($admin_payload['ok'])) {
                bacara_live_output_payload($admin_payload, $member['mb_id'], 'admin');
                exit;
            }
        }
    }
}

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
// v4: 15분 공백 슈절단 제거 — game_no 고착 시 로드맵 유지
$live_cache_key = preg_replace('/[^A-Z0-9_-]/', '', $table_name) . '-' . $limit . '-v6';
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
    global $live_sync_healed, $use_live_cfg, $live_link;

    // 결과 캐시와 무관하게 game_status 는 매번 최신 조회 (셔플/스톱 지연 방지)
    $gs_error = '';
    $account = isset($payload['account']) ? trim((string) $payload['account']) : '';
    $table = isset($payload['table_name']) ? strtoupper(trim((string) $payload['table_name'])) : '';
    $game_status = bacara_live_fetch_game_status(
        $table,
        $account,
        !empty($use_live_cfg),
        $live_link,
        $gs_error
    );

    // 최근 감지 결과가 있는데 lobby/stop 고정이면 활성(game)으로 보정
    // (감지기가 status 갱신을 놓치거나, detected_at TZ 어긋나도 슈가 살아 있으면 게임중)
    if ($game_status === 'lobby' || $game_status === 'stop') {
        if (!defined('BACARA_LIVE_STATUS_HEAL_SEC')) {
            define('BACARA_LIVE_STATUS_HEAL_SEC', 900); // 15분
        }
        $latest_at = isset($payload['latest_detected_at'])
            ? trim((string) $payload['latest_detected_at'])
            : '';
        $age = null;
        if ($latest_at !== '') {
            $ts = strtotime($latest_at);
            if ($ts !== false) {
                $age = time() - $ts;
                // TZ 오차로 미래 시각이 되면 방금으로 간주 (최대 12시간)
                if ($age < 0 && $age > -43200) {
                    $age = 0;
                }
            }
        }
        $has_rows = !empty($payload['results']) && is_array($payload['results']);
        if ($age !== null && $age >= 0 && $age <= BACARA_LIVE_STATUS_HEAL_SEC) {
            $game_status = 'game';
        } elseif ($has_rows && ($age === null || $age < 0)) {
            // detected_at 파싱 실패해도 슈 결과가 있으면 활성으로 본다
            $game_status = 'game';
        }
    }

    $payload['game_status'] = $game_status;
    $payload['game_status_error'] = $gs_error !== '' ? $gs_error : null;
    // 수동 모드의 관리자 셔플 플래그 유지, 감지 피드는 game_status 우선
    if (empty($payload['manual_mode'])) {
        $payload['shuffle_active'] = ($game_status === 'shuffle');
    }

    if (function_exists('bacara_live_attach_integrity')) {
        $extra = array('policy' => !empty($payload['manual_mode']) ? 'manual_frozen' : 'detector');
        if (!empty($live_sync_healed)) {
            $extra['healed'] = true;
            $extra['message'] = '감지 새 결과 감지 → 표시를 자동 감지 피드로 복구했습니다.';
            $extra['synced'] = true;
            $extra['policy'] = 'detector';
        }
        $payload = bacara_live_attach_integrity($payload, $extra);
    }
    $payload['logged_in'] = true;
    $payload['member_id'] = $member_id;
    $payload['cache'] = $cache_state;
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
}

/**
 * 감지 프로그램 game_status: game | shuffle | lobby
 * (구 stop → lobby)
 *
 * 조회 (2차 명세):
 *   SELECT status FROM game_status
 *    WHERE account='계정' AND table_name='테이블명'
 */
function bacara_live_normalize_game_status($raw)
{
    $s = strtolower(trim((string) $raw));
    if ($s === 'game' || $s === 'play' || $s === 'playing' || $s === '감지') {
        return 'game';
    }
    if ($s === 'shuffle' || $s === '셔플' || $s === 'shuffle_on') {
        return 'shuffle';
    }
    if (
        $s === 'lobby'
        || $s === 'stop'
        || $s === '대기'
        || $s === 'idle'
        || $s === 'paused'
        || $s === 'end'
        || $s === 'ended'
    ) {
        return 'lobby';
    }
    return 'unknown';
}

/**
 * game_status 한 행 조회.
 * @return string|null  raw status 또는 행 없음 시 null
 */
function bacara_live_query_game_status_row($table_name, $account, $live_link, &$query_error)
{
    $query_error = '';
    $safe_table = mysqli_real_escape_string($live_link, $table_name);
    if ($account !== '') {
        $safe_acc = mysqli_real_escape_string($live_link, $account);
        // 명세 쿼리: account + table_name
        $sql = " SELECT status
                   FROM `game_status`
                  WHERE account = '{$safe_acc}'
                    AND table_name = '{$safe_table}'
                  LIMIT 1 ";
    } else {
        $sql = " SELECT status
                   FROM `game_status`
                  WHERE table_name = '{$safe_table}'
                  ORDER BY id DESC
                  LIMIT 1 ";
    }

    $q = @mysqli_query($live_link, $sql);
    if (!$q) {
        $query_error = mysqli_error($live_link);
        return null;
    }
    $row = mysqli_fetch_assoc($q);
    if (!$row || !array_key_exists('status', $row)) {
        return null;
    }
    return $row['status'];
}

/**
 * @return string game|shuffle|lobby|unknown
 */
function bacara_live_fetch_game_status($table_name, $account, $use_live_cfg, $live_link, &$query_error)
{
    global $live_cfg;

    $query_error = '';
    $table_name = strtoupper(trim((string) $table_name));
    $account = trim((string) $account);
    if ($table_name === '' || !preg_match('/^[A-Z0-9_-]{1,40}$/', $table_name)) {
        return 'unknown';
    }
    if (!$use_live_cfg || !$live_link) {
        return 'unknown';
    }

    // 1) 결과 피드 계정
    $raw = bacara_live_query_game_status_row($table_name, $account, $live_link, $query_error);
    if ($query_error !== '') {
        return 'unknown';
    }
    if ($raw !== null) {
        return bacara_live_normalize_game_status($raw);
    }

    // 2) live config 선호 계정 (결과 account 와 다를 때)
    $preferred = !empty($live_cfg['account']) ? trim((string) $live_cfg['account']) : '';
    if ($preferred !== '' && strcasecmp($preferred, $account) !== 0) {
        $raw = bacara_live_query_game_status_row($table_name, $preferred, $live_link, $query_error);
        if ($query_error !== '') {
            return 'unknown';
        }
        if ($raw !== null) {
            return bacara_live_normalize_game_status($raw);
        }
    }

    // 3) 테이블만으로 최신 상태
    if ($account !== '' || $preferred !== '') {
        $raw = bacara_live_query_game_status_row($table_name, '', $live_link, $query_error);
        if ($query_error !== '') {
            return 'unknown';
        }
        if ($raw !== null) {
            return bacara_live_normalize_game_status($raw);
        }
    }

    return 'unknown';
}

/**
 * 캐시가 감지 tip(동일 계정)과 일치할 때만 사용
 */
function bacara_live_cache_matches_detector($payload, $table_max_id, $table_name)
{
    if (!is_array($payload) || empty($payload['ok'])) {
        return false;
    }
    $cached_latest = isset($payload['latest_id']) ? (int) $payload['latest_id'] : 0;
    if ($table_max_id > 0 && $cached_latest < $table_max_id) {
        return false;
    }
    if (!function_exists('bacara_live_detector_tip')) {
        return $table_max_id <= 0 || $cached_latest >= $table_max_id;
    }
    $account = isset($payload['account']) ? trim((string) $payload['account']) : '';
    $tip = bacara_live_detector_tip($table_name, $account);
    if (empty($tip['ok'])) {
        return $table_max_id <= 0 || $cached_latest >= $table_max_id;
    }
    $tip_id = (int) $tip['max_id'];
    if ($tip_id > $cached_latest) {
        return false;
    }
    $tip_res = isset($tip['result']) ? strtoupper(trim((string) $tip['result'])) : '';
    $cached_res = '';
    if (!empty($payload['results']) && is_array($payload['results'])) {
        $last = $payload['results'][count($payload['results']) - 1];
        if (is_array($last) && isset($last['result'])) {
            $cached_res = strtoupper(trim((string) $last['result']));
        }
    }
    if ($tip_id === $cached_latest && $tip_res !== '' && $cached_res !== '' && $tip_res !== $cached_res) {
        return false;
    }
    // game_status 가 바뀌면(셔플 등) 결과 id 가 같아도 캐시 재사용 금지
    // → 실제 상태는 output_payload 에서 매번 재조회하므로, 여기선 tip 만으로도 충분
    return true;
}

// 캐시 히트 전에도 DB에 연결해 MAX(id) 로 신선도를 검증한다.
// (mtime만 보면 새 감지가 들어와도 1~10초 동안 옛 슈가 그대로 나갈 수 있음)
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
                'result' => bacara_live_normalize_result(isset($row['result']) ? $row['result'] : ''),
                'detected_at' => $row['detected_at'],
            );
        }
        return array_values(array_filter($rows, function ($r) {
            return in_array($r['result'], array('P', 'B', 'T'), true);
        }));
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
            'result' => bacara_live_normalize_result(isset($row['result']) ? $row['result'] : ''),
            'detected_at' => $row['detected_at'],
        );
    }
    return array_values(array_filter($rows, function ($r) {
        return in_array($r['result'], array('P', 'B', 'T'), true);
    }));
}

/**
 * 감지기/DB 표기 편차를 P|B|T 로 통일
 */
function bacara_live_normalize_result($raw)
{
    $v = strtoupper(trim((string) $raw));
    if ($v === 'P' || $v === 'B' || $v === 'T') {
        return $v;
    }
    if ($v === 'PLAYER' || $v === '플레이어' || $v === '闲') {
        return 'P';
    }
    if ($v === 'BANKER' || $v === '뱅커' || $v === '庄') {
        return 'B';
    }
    if ($v === 'TIE' || $v === 'DRAW' || $v === '드로우' || $v === '타이' || $v === '和') {
        return 'T';
    }
    // 한글 포함 원문 대비
    $raw_str = (string) $raw;
    if (strpos($raw_str, '플레이어') !== false || stripos($raw_str, 'player') !== false) {
        return 'P';
    }
    if (strpos($raw_str, '뱅커') !== false || stripos($raw_str, 'banker') !== false) {
        return 'B';
    }
    if (strpos($raw_str, '드로우') !== false
        || strpos($raw_str, '타이') !== false
        || strpos($raw_str, '和') !== false
        || stripos($raw_str, 'tie') !== false
        || stripos($raw_str, 'draw') !== false
    ) {
        return 'T';
    }
    return $v;
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

/** 슈 강제 경계(초). game_no 가 같아도 이보다 긴 공백이면 새 슈. */
define('BACARA_LIVE_SHOE_HARD_GAP_SEC', 10800);

/**
 * MySQL DATETIME → unix timestamp (실패 시 null)
 */
function bacara_live_row_ts($row)
{
    if (!is_array($row) || empty($row['detected_at'])) {
        return null;
    }
    $t = strtotime(trim((string) $row['detected_at']));
    return $t === false ? null : (int) $t;
}

/**
 * 재감지 정리:
 * - 같은 game_no + 같은 result 연속 → 최신 id 만 유지 (진짜 재감지)
 * - 같은 game_no + 다른 result → 각각 새 회차로 유지
 *   (2초 병합은 다음 회차 OCR 과 겹치며 결과를 지워 "즉시 반영"이 깨짐)
 */

/**
 * 동일 id 행만 제거 (표시는 DB 행 1:1 유지)
 */
function bacara_live_dedupe_exact_id($rows)
{
    if (!is_array($rows) || count($rows) === 0) {
        return array();
    }
    usort($rows, function ($a, $b) {
        return (int) $a['id'] - (int) $b['id'];
    });
    $out = array();
    $seen = array();
    foreach ($rows as $row) {
        $id = isset($row['id']) ? (int) $row['id'] : 0;
        if ($id > 0 && isset($seen[$id])) {
            continue;
        }
        if ($id > 0) {
            $seen[$id] = true;
        }
        $out[] = $row;
    }
    return $out;
}

function bacara_live_dedupe_game_no($rows)
{
    if (!is_array($rows) || count($rows) === 0) {
        return array();
    }

    usort($rows, function ($a, $b) {
        return (int) $a['id'] - (int) $b['id'];
    });

    $out = array();
    foreach ($rows as $row) {
        $no = isset($row['game_no']) ? (int) $row['game_no'] : 0;
        $res = isset($row['result']) ? strtoupper(trim((string) $row['result'])) : '';
        if ($no > 0 && $res !== '' && count($out) > 0) {
            $prev = $out[count($out) - 1];
            $prev_no = isset($prev['game_no']) ? (int) $prev['game_no'] : 0;
            $prev_res = isset($prev['result']) ? strtoupper(trim((string) $prev['result'])) : '';
            if ($prev_no === $no && $prev_res === $res) {
                $out[count($out) - 1] = $row;
                continue;
            }
        }
        $out[] = $row;
    }
    return $out;
}

/**
 * id 오름차순에서 현재 슈만 남김.
 *
 * 경계:
 * - game_no 감소 또는 1 재시작 (정상 슈 리셋)
 * - 3시간 이상 공백 (강제). 15분 공백으로 자르지 않음
 *   → 감지기 game_no 고착 시 로드맵이 1칸만 남는 문제 방지
 */
function bacara_live_trim_to_current_shoe($rows)
{
    if (!is_array($rows) || count($rows) === 0) {
        return array();
    }

    $start = 0;
    $prev_no = null;
    $prev_ts = null;
    for ($i = 0; $i < count($rows); $i++) {
        $no = isset($rows[$i]['game_no']) ? (int) $rows[$i]['game_no'] : null;
        $ts = bacara_live_row_ts($rows[$i]);

        if ($prev_no !== null && $no !== null && $no > 0 && $prev_no > 0) {
            if ($no < $prev_no || ($no === 1 && $prev_no > 1)) {
                $start = $i;
            }
        }
        if (
            $prev_ts !== null
            && $ts !== null
            && ($ts - $prev_ts) >= BACARA_LIVE_SHOE_HARD_GAP_SEC
        ) {
            $start = $i;
        }

        if ($no !== null && $no > 0) {
            $prev_no = $no;
        }
        if ($ts !== null) {
            $prev_ts = $ts;
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

/**
 * 테이블 전체 최신 id (캐시 무효화용)
 */
function bacara_live_table_max_id($safe_table_name, $use_live_cfg, $live_link, &$query_error)
{
    $sql = " select coalesce(max(id), 0) as max_id
               from `bacaraai`
              where table_name = '{$safe_table_name}'
                and result in ('P', 'B', 'T') ";
    $val = bacara_live_query_scalar($sql, $use_live_cfg, $live_link, 'max_id', $query_error);
    return $val === null ? 0 : (int) $val;
}

/**
 * 계정별 최신 id — 가장 앞선 감지 스트림을 고른다.
 *
 * @return array<int, array{account:string,max_id:int}>
 */
function bacara_live_accounts_by_freshness($safe_table_name, $use_live_cfg, $live_link, &$query_error)
{
    $sql = " select account, max(id) as max_id
               from `bacaraai`
              where table_name = '{$safe_table_name}'
                and result in ('P', 'B', 'T')
                and account is not null
                and account <> ''
              group by account
              order by max_id desc
              limit 20 ";
    $out = array();
    $query_error = '';
    if ($use_live_cfg) {
        $q = @mysqli_query($live_link, $sql);
        if (!$q) {
            $query_error = mysqli_error($live_link);
            return $out;
        }
        while ($row = mysqli_fetch_assoc($q)) {
            $out[] = array(
                'account' => (string) $row['account'],
                'max_id' => (int) $row['max_id'],
            );
        }
        return $out;
    }
    $q = sql_query($sql, false);
    if (!$q) {
        $query_error = 'sql_query failed';
        return $out;
    }
    while ($row = sql_fetch_array($q)) {
        $out[] = array(
            'account' => (string) $row['account'],
            'max_id' => (int) $row['max_id'],
        );
    }
    return $out;
}

$query_error = '';
$table_max_id = bacara_live_table_max_id($safe_table_name, $use_live_cfg, $live_link, $query_error);

// 캐시: 시간이 신선해도 감지 tip/테이블 max 가 앞서거나 결과가 다르면 반드시 재조회
if (!$force_refresh) {
    $fresh_payload = bacara_live_cached_payload($live_cache_file, 1);
    if ($fresh_payload !== null
        && $query_error === ''
        && bacara_live_cache_matches_detector($fresh_payload, $table_max_id, $table_name)
    ) {
        bacara_live_output_payload($fresh_payload, $member['mb_id'], 'fresh');
        exit;
    }
}

$live_cache_lock = @fopen($live_cache_lock_file, 'c');
if ($live_cache_lock && !@flock($live_cache_lock, LOCK_EX | LOCK_NB)) {
    if (!$force_refresh) {
        $stale_payload = bacara_live_cached_payload($live_cache_file, 10);
        if ($stale_payload !== null
            && $query_error === ''
            && bacara_live_cache_matches_detector($stale_payload, $table_max_id, $table_name)
        ) {
            @fclose($live_cache_lock);
            bacara_live_output_payload($stale_payload, $member['mb_id'], 'stale');
            exit;
        }
    }
    @flock($live_cache_lock, LOCK_EX);
    if (!$force_refresh) {
        $fresh_payload = bacara_live_cached_payload($live_cache_file, 10);
        if ($fresh_payload !== null
            && $query_error === ''
            && bacara_live_cache_matches_detector($fresh_payload, $table_max_id, $table_name)
        ) {
            @flock($live_cache_lock, LOCK_UN);
            @fclose($live_cache_lock);
            bacara_live_output_payload($fresh_payload, $member['mb_id'], 'waited');
            exit;
        }
    }
}

// 계정 선택: 테이블에서 id 가 가장 앞선 계정을 사용.
// 설정 account 는 그 계정이 최신 선두와 같을 때만 우선 (뒤처진 고정 스트림 방지).
$account_rank = bacara_live_accounts_by_freshness(
    $safe_table_name,
    $use_live_cfg,
    $live_link,
    $query_error
);
$preferred = !empty($live_cfg['account']) ? (string) $live_cfg['account'] : '';
$account_candidates = array();
$leader_account = '';
$leader_max_id = 0;
if ($query_error === '' && count($account_rank) > 0) {
    $leader_account = $account_rank[0]['account'];
    $leader_max_id = (int) $account_rank[0]['max_id'];
    $preferred_is_leader = false;
    if ($preferred !== '') {
        foreach ($account_rank as $rank) {
            if ($rank['account'] === $preferred && (int) $rank['max_id'] === $leader_max_id) {
                $preferred_is_leader = true;
                break;
            }
        }
    }
    if ($preferred_is_leader) {
        $account_candidates[] = $preferred;
    } else {
        $account_candidates[] = $leader_account;
        if ($preferred !== '' && $preferred !== $leader_account) {
            $account_candidates[] = $preferred;
        }
    }
} elseif ($preferred !== '') {
    $account_candidates[] = $preferred;
} else {
    $account_candidates[] = (string) $member['mb_id'];
    $account_candidates[] = 'awesome';
}
$account_candidates = array_values(array_unique(array_filter($account_candidates)));

$rows = array();
$used_account = null;
$best_latest_id = -1;
$used_meta = array(
    'truncated' => false,
    'shoe_count' => 0,
    'shoe_start_id' => null,
    'shoe_start_mode' => null,
);
$account_switched = false;

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
if ($preferred !== '' && $used_account !== null && $used_account !== $preferred) {
    $account_switched = true;
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
// 표시 = 슈 구간 DB 행 그대로 (재감지 병합 없음 → 디비·표시 1:1)
$db_row_count = count($rows);
// 동일 id 중복만 제거 (정상적으로는 없음)
$rows = bacara_live_dedupe_exact_id($rows);

$latest = count($rows) ? $rows[count($rows) - 1] : null;
$game_no = $latest && isset($latest['game_no']) ? $latest['game_no'] : null;

$payload = array(
    'ok' => true,
    'account' => $used_account !== null ? $used_account : '',
    'account_preferred' => $preferred,
    'account_switched' => !empty($account_switched),
    'table_name' => $table_name,
    'game_no' => $game_no,
    'source' => $use_live_cfg ? 'live_config' : 'g5',
    'count' => count($rows),
    'db_row_count' => $db_row_count,
    'shoe_count' => count($rows),
    'truncated' => !empty($used_meta['truncated']),
    'deduped' => 0,
    'shoe_start_id' => isset($used_meta['shoe_start_id']) ? $used_meta['shoe_start_id'] : null,
    'latest_id' => $latest ? $latest['id'] : null,
    'table_max_id' => $table_max_id,
    'latest_detected_at' => $latest ? $latest['detected_at'] : null,
    'manual_mode' => false,
    'shuffle_active' => false,
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
