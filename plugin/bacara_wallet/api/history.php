<?php
/**
 * 회원 본인 베팅 정산/취소 기록
 * GET → { ok, items: GameHistory-like[] }
 */
include_once dirname(__FILE__) . '/../../../common.php';
include_once G5_LIB_PATH . '/bacara-wallet.lib.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(array('ok' => false, 'message' => 'GET only'), JSON_UNESCAPED_UNICODE);
    exit;
}

if (empty($is_member) || empty($member['mb_id'])) {
    http_response_code(401);
    echo json_encode(array(
        'ok' => false,
        'logged_in' => false,
        'items' => array(),
        'message' => '로그인이 필요합니다.',
    ), JSON_UNESCAPED_UNICODE);
    exit;
}

$mb_id = $member['mb_id'];
$limit = isset($_GET['limit']) ? (int) $_GET['limit'] : 100;
if ($limit < 1) {
    $limit = 100;
}
if ($limit > 300) {
    $limit = 300;
}

bacara_wallet_install_tables();
$log_table = bacara_wallet_log_table();
$mb_esc = sql_real_escape_string($mb_id);

$result = sql_query(
    " select id, delta, balance_after, kind, content, created_at
        from `{$log_table}`
       where mb_id = '{$mb_esc}'
         and kind in ('bet_win', 'bet_lose', 'bet_cancel', 'bet')
       order by id desc
       limit {$limit} ",
    false
);

$items = array();
while ($row = sql_fetch_array($result)) {
    $parsed = bacara_wallet_parse_bet_log_row($row);
    if ($parsed === null) {
        continue;
    }
    $items[] = $parsed;
}

echo json_encode(array(
    'ok' => true,
    'logged_in' => true,
    'count' => count($items),
    'items' => $items,
), JSON_UNESCAPED_UNICODE);
exit;

/**
 * @param array $row
 * @return array|null
 */
function bacara_wallet_parse_bet_log_row($row)
{
    $kind = isset($row['kind']) ? (string) $row['kind'] : '';
    $content = isset($row['content']) ? (string) $row['content'] : '';
    $delta = isset($row['delta']) ? (int) $row['delta'] : 0;
    $id = isset($row['id']) ? (int) $row['id'] : 0;
    $created = isset($row['created_at']) ? (string) $row['created_at'] : '';

    $time = $created;
    if (preg_match('/\s(\d{2}:\d{2}:\d{2})$/', $created, $m)) {
        $time = $m[1];
    }

    // 접수(차감) — 과거 패배는 정산 로그가 없을 수 있어 표시
    if ($kind === 'bet') {
        $tableName = '-';
        $side = 'WAIT';
        if (preg_match('/·\s*(.+?)\s*·\s*(PLAYER|BANKER|TIE)/u', $content, $m)) {
            $tableName = trim($m[1]);
            $side = $m[2];
        } elseif (preg_match('/베팅 차감\s*·\s*(.+)$/u', $content, $m)) {
            $tableName = trim($m[1]);
        }
        $amount = abs($delta);
        return array(
            'id' => 'wlog_' . $id,
            'time' => $time,
            'tableName' => $tableName,
            'shoeNumber' => '-',
            'round' => 0,
            'previousResult' => $content,
            'gptOpinion' => 'WAIT',
            'geminiOpinion' => 'WAIT',
            'claudeOpinion' => 'WAIT',
            'finalOpinion' => $side === 'WAIT' ? 'WAIT' : $side,
            'userSelection' => $side === 'WAIT' ? 'SKIP' : $side,
            'amount' => $amount,
            'actualResult' => 'NONE',
            'pnl' => 0,
            'martingaleStage' => 1,
            'appliedRule' => '베팅 접수',
            'dataStatus' => '접수',
            'createdAt' => $created,
        );
    }

    $tableName = '-';
    $side = 'WAIT';
    $outcome = 'NONE';
    $amount = abs($delta);
    $pnl = 0;
    $dataStatus = '정상';
    $appliedRule = '가상머니 베팅';

    // 구조화 메모: SETTLE|table|SIDE|OUT|stake|pnl
    if (preg_match('/^SETTLE\|([^|]*)\|(PLAYER|BANKER|TIE)\|(P|B|T)\|(\d+)\|(-?\d+)/', $content, $m)) {
        $tableName = $m[1] !== '' ? $m[1] : '-';
        $side = $m[2];
        $outcome = $m[3];
        $amount = (int) $m[4];
        $pnl = (int) $m[5];
        $appliedRule = '직접/오토 베팅';
    } elseif (preg_match('/^CANCEL\|([^|]*)\|(\d+)/', $content, $m)) {
        $tableName = $m[1] !== '' ? $m[1] : '-';
        $amount = (int) $m[2];
        $pnl = 0;
        $outcome = 'NONE';
        $dataStatus = '취소';
        $appliedRule = '베팅 취소';
        $side = 'SKIP';
    } else {
        // 구 메모 파싱
        if (preg_match('/베팅 취소|시드 반환/', $content)) {
            $dataStatus = '취소';
            $appliedRule = '베팅 취소';
            $pnl = 0;
            $outcome = 'NONE';
            $side = 'SKIP';
            if (preg_match('/·\s*(.+)$/u', $content, $tm)) {
                $tableName = trim($tm[1]);
            }
            $amount = abs($delta);
        } elseif ($kind === 'bet_lose') {
            $pnl = $delta !== 0 ? $delta : -abs($amount);
            // delta 0 lose log: amount in content
            if (preg_match('/베팅\s*([\d,]+)/u', $content, $am)) {
                $amount = (int) str_replace(',', '', $am[1]);
                $pnl = -$amount;
            }
            if (preg_match('/손익\s*(-?[\d,]+)/u', $content, $pm)) {
                $pnl = (int) str_replace(',', '', $pm[1]);
            }
            if (preg_match('/(PLAYER|BANKER|TIE|Player|Banker|Tie)/', $content, $sm)) {
                $side = strtoupper($sm[1]);
                if ($side === 'PLAYER' || $side === 'BANKER' || $side === 'TIE') {
                    /* ok */
                } elseif ($sm[1] === 'Player') {
                    $side = 'PLAYER';
                } elseif ($sm[1] === 'Banker') {
                    $side = 'BANKER';
                } else {
                    $side = 'TIE';
                }
            }
            if (preg_match('/결과\s*(P|B|T|Player|Banker|Tie)/u', $content, $om)) {
                $o = $om[1];
                $outcome = ($o === 'Player' || $o === 'P') ? 'P' : (($o === 'Banker' || $o === 'B') ? 'B' : 'T');
            }
            if (preg_match('/·\s*([^·]+)\s*·/u', $content, $tm)) {
                $tableName = trim($tm[1]);
            }
        } elseif ($kind === 'bet_win') {
            if (preg_match('/입금\s*([\d,]+)/u', $content, $cm)) {
                $credit = (int) str_replace(',', '', $cm[1]);
                // credit = stake + profit for P; stake+0.95 for B; etc. Approximate pnl from delta
                $pnl = $delta; // not exact stake; better use structured
            }
            $pnl = $delta; // fallback wrong
            // Prefer: 손익 in content
            if (preg_match('/손익\s*(-?[\d,]+)/u', $content, $pm)) {
                $pnl = (int) str_replace(',', '', $pm[1]);
            }
            if (preg_match('/베팅\s*([\d,]+)/u', $content, $am)) {
                $amount = (int) str_replace(',', '', $am[1]);
            } elseif ($delta > 0 && $pnl !== 0) {
                // Player win credit = 2*stake, pnl = stake → amount ≈ delta/2
                $amount = (int) round($delta / 2);
            }
            if (preg_match('/(PLAYER|BANKER|TIE)/', $content, $sm)) {
                $side = $sm[1];
            } elseif (preg_match('/(Player|Banker|Tie)/', $content, $sm)) {
                $side = $sm[1] === 'Player' ? 'PLAYER' : ($sm[1] === 'Banker' ? 'BANKER' : 'TIE');
            }
            if (preg_match('/결과\s*(P|B|T|Player|Banker|Tie)/u', $content, $om)) {
                $o = $om[1];
                $outcome = ($o === 'Player' || $o === 'P') ? 'P' : (($o === 'Banker' || $o === 'B') ? 'B' : 'T');
            }
            if (preg_match('/정산\s*·\s*([^·\/]+)/u', $content, $tm)) {
                $tableName = trim($tm[1]);
            }
        } else {
            return null;
        }
    }

    $userSelection = $side;
    if ($side === 'SKIP') {
        $userSelection = 'SKIP';
    }

    return array(
        'id' => 'wlog_' . $id,
        'time' => $time,
        'tableName' => $tableName,
        'shoeNumber' => '-',
        'round' => 0,
        'previousResult' => $content,
        'gptOpinion' => 'WAIT',
        'geminiOpinion' => 'WAIT',
        'claudeOpinion' => 'WAIT',
        'finalOpinion' => $userSelection === 'SKIP' ? 'SKIP' : $side,
        'userSelection' => $userSelection,
        'amount' => $amount,
        'actualResult' => $outcome,
        'pnl' => $pnl,
        'martingaleStage' => 1,
        'appliedRule' => $appliedRule,
        'dataStatus' => $dataStatus,
        'createdAt' => $created,
    );
}
