import { TableData, GameResult, AiModelAnalysis, RuleData, GameHistoryEntry, Notification } from './types';

const defaultAi = {
  gpt: { status: '분석 완료', opinion: 'PLAYER', confidence: 57, responseTime: 1.2, reasons: ['사용자 규칙 1이 발동했습니다.', 'Player가 2회 연속 출현했습니다.', '현재 설정된 위험 한도 안에 있습니다.'] } as AiModelAnalysis,
  gemini: { status: '실시간 관찰 정상', opinion: 'PLAYER', confidence: 52, responseTime: 0.8, reasons: ['최근 화면 결과가 정상 인식되었습니다.', '베팅 마감까지 9초 남았습니다.', 'Player 연속 조건이 충족되었습니다.'] } as AiModelAnalysis,
  claude: { status: '위험 검토 완료', opinion: 'SKIP', confidence: 49, responseTime: 1.5, reasons: ['현재 데이터 표본이 충분하지 않습니다.', '마틴 단계가 증가하고 있습니다.', '이번 회차는 건너뛰는 선택도 고려할 수 있습니다.'] } as AiModelAnalysis,
  consensus: '2/3',
  finalOpinion: 'PLAYER' as const,
  recommendedAmount: 20000,
  finalConfidence: 54,
  appliedRule: '규칙 1'
};

/** seeded pseudo-random so each mock table keeps a stable unique road */
function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function buildRoadmap(results: GameResult[]): GameResult[][] {
  const columns: GameResult[][] = [];
  results.forEach((result) => {
    if (result === 'T') {
      if (!columns.length) columns.push(['T']);
      else columns[columns.length - 1].push('T');
      return;
    }
    const last = columns[columns.length - 1];
    const lastDecisive = last?.find((item) => item !== 'T');
    if (!last || !lastDecisive || lastDecisive !== result) {
      columns.push([result]);
    } else {
      last.push(result);
    }
  });
  return columns.slice(-18);
}

/**
 * P/B/T 카운트·끝 스트릭과 일치하는 결과열 생성.
 * Roadmap 은 recentResults 를 우선 쓰므로 테이블마다 반드시 달라야 함.
 */
function buildMockShoe(opts: {
  seed: number;
  player: number;
  banker: number;
  tie: number;
  streakSide: 'P' | 'B' | 'T';
  streakCount: number;
}): { recentResults: GameResult[]; roadmap: GameResult[][]; currentStreak: string; shoeProgress: number; currentRound: number } {
  const { seed, player, banker, tie, streakSide, streakCount } = opts;
  const rand = mulberry32(seed);
  const rem = { P: player, B: banker, T: tie };

  const tail: GameResult[] = [];
  if (streakSide === 'T') {
    const n = Math.min(streakCount, rem.T);
    for (let i = 0; i < n; i += 1) {
      tail.push('T');
      rem.T -= 1;
    }
  } else {
    const n = Math.min(streakCount, rem[streakSide]);
    for (let i = 0; i < n; i += 1) {
      tail.push(streakSide);
      rem[streakSide] -= 1;
    }
  }

  const head: GameResult[] = [];
  (['P', 'B', 'T'] as const).forEach((side) => {
    for (let i = 0; i < rem[side]; i += 1) head.push(side);
  });
  for (let i = head.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [head[i], head[j]] = [head[j], head[i]];
  }

  // 머리 끝이 스트릭과 같으면 스트릭이 합쳐지므로 다른 쪽으로 교체
  if (streakSide !== 'T' && head.length > 0 && head[head.length - 1] === streakSide) {
    const swapAt = head.findIndex((r) => r !== streakSide && r !== 'T');
    if (swapAt >= 0) {
      const last = head.length - 1;
      [head[swapAt], head[last]] = [head[last], head[swapAt]];
    } else {
      // 교체할 결정적 결과가 없으면 타이 삽입 시도
      const tieAt = head.findIndex((r) => r === 'T');
      if (tieAt >= 0) {
        const last = head.length - 1;
        [head[tieAt], head[last]] = [head[last], head[tieAt]];
      }
    }
  }

  const recentResults = [...head, ...tail];
  const total = recentResults.length;
  const streakLabel =
    streakSide === 'T'
      ? `Tie ${tail.length}연속`
      : `${streakSide === 'P' ? 'Player' : 'Banker'} ${tail.length}연속`;

  return {
    recentResults,
    roadmap: buildRoadmap(recentResults),
    currentStreak: streakLabel,
    shoeProgress: Math.min(100, Math.round((total / 80) * 100)),
    currentRound: total,
  };
}

function mockTableStats(
  seed: number,
  player: number,
  banker: number,
  tie: number,
  streakSide: 'P' | 'B' | 'T',
  streakCount: number,
  shoeNumber: string,
) {
  const shoe = buildMockShoe({ seed, player, banker, tie, streakSide, streakCount });
  return {
    stats: {
      player,
      banker,
      tie,
      currentStreak: shoe.currentStreak,
      shoeProgress: shoe.shoeProgress,
      shoeNumber,
      currentRound: shoe.currentRound,
      recentResults: shoe.recentResults,
    },
    roadmap: shoe.roadmap,
  };
}

export const MOCK_RULES: RuleData[] = [
  {
    id: 'r1',
    name: 'Player 2연속 추종',
    active: true,
    triggerCondition: 'Player가 2회 연속 나온 경우',
    targetSide: 'PLAYER',
    initialAmount: 10000,
    increaseMethod: '패배 시 2배',
    maxStages: 8,
    tieHandling: '현재 단계 유지',
    triggerCount: 42,
    hitCount: 38,
    currentPnL: 150000,
    maxConsecutiveFails: 4,
    lastTriggerTime: '방금 전'
  },
  {
    id: 'r2',
    name: 'Banker 2연속 후 Player',
    active: false,
    triggerCondition: 'Banker가 2회 연속 나온 경우',
    targetSide: 'PLAYER',
    initialAmount: 10000,
    increaseMethod: '패배 시 2배',
    maxStages: 8,
    tieHandling: '현재 단계 유지',
    triggerCount: 28,
    hitCount: 21,
    currentPnL: -30000,
    maxConsecutiveFails: 6,
    lastTriggerTime: '12분 전',
    description: 'Banker가 2회 연속 나와도 다음 선택은 Player입니다.'
  }
];

const t1 = mockTableStats(101, 9, 3, 2, 'P', 2, 'SHOE-128');
const t2 = mockTableStats(202, 1, 1, 0, 'B', 1, 'SHOE-041');
const t3 = mockTableStats(303, 22, 35, 3, 'B', 3, 'SHOE-082');
const t4 = mockTableStats(404, 3, 10, 1, 'B', 5, 'SHOE-055');
const t5 = mockTableStats(505, 9, 8, 2, 'P', 1, 'SHOE-063');
const t6 = mockTableStats(606, 5, 5, 1, 'T', 1, 'SHOE-019');
const t7 = mockTableStats(707, 13, 15, 1, 'B', 2, 'SHOE-071');
const t8 = mockTableStats(808, 7, 6, 1, 'P', 3, 'SHOE-044');

export const MOCK_TABLES: TableData[] = [
  {
    id: 't1',
    name: 'TABLE1(MD2729)',
    gameCode: 'MD2729',
    status: 'rule_triggered',
    timer: 15,
    roadmap: t1.roadmap,
    stats: t1.stats,
    ai: { ...defaultAi }
  },
  {
    id: 't2',
    name: 'TABLE 02',
    gameCode: 'MD2710',
    status: 'analyzing',
    timer: 8,
    roadmap: t2.roadmap,
    stats: t2.stats,
    ai: { ...defaultAi, finalOpinion: 'SKIP', consensus: '0/3', skipReasons: ['초기 데이터(4회) 부족으로 패턴을 분석하기 어렵습니다.', 'AI 세 가지 모델 모두 관망(SKIP)을 추천했습니다.'], gpt: { ...defaultAi.gpt, opinion: 'SKIP' }, gemini: { ...defaultAi.gemini, opinion: 'SKIP' }, claude: { ...defaultAi.claude, opinion: 'SKIP' } }
  },
  {
    id: 't3',
    name: 'TABLE 03',
    gameCode: 'MD2711',
    status: 'waiting_user',
    timer: 22,
    roadmap: t3.roadmap,
    stats: t3.stats,
    ai: { ...defaultAi, finalOpinion: 'BANKER', consensus: '3/3', gpt: { ...defaultAi.gpt, opinion: 'BANKER' }, gemini: { ...defaultAi.gemini, opinion: 'BANKER' }, claude: { ...defaultAi.claude, opinion: 'BANKER' } }
  },
  {
    id: 't4',
    name: 'TABLE 04',
    gameCode: 'MD2712',
    status: 'observing',
    timer: 5,
    roadmap: t4.roadmap,
    stats: t4.stats,
    ai: { 
      ...defaultAi, 
      finalOpinion: 'SKIP', 
      consensus: 'AI 의견 불일치', 
      skipReasons: ['GPT, Gemini, Claude 의견이 일치하지 않습니다.', '최근 동일 조건의 표본이 충분하지 않습니다.'],
      discussionSummary: 'GPT는 Banker 강세를 이어갈 것으로 예측했으나, Claude와 Gemini는 이전 슈의 통계를 근거로 Player로의 전환 가능성을 더 높게 평가했습니다. 의견 대립이 팽팽하므로 이번 회차는 관망을 강력히 권장합니다.'
    }
  },
  {
    id: 't5',
    name: 'TABLE 05',
    gameCode: 'MD2713',
    status: 'checking_result',
    timer: 12,
    roadmap: t5.roadmap,
    stats: t5.stats,
    ai: { ...defaultAi }
  },
  {
    id: 't6',
    name: 'TABLE 06',
    gameCode: 'MD2714',
    status: 'risk_blocked',
    timer: 3,
    roadmap: t6.roadmap,
    stats: t6.stats,
    ai: { ...defaultAi, finalOpinion: 'STOP', skipReasons: ['현재 설정된 로스컷 한도에 도달할 위험이 높습니다.', '연속 패배로 인해 시스템이 베팅을 강제 차단했습니다.'] }
  },
  {
    id: 't7',
    name: 'TABLE 07',
    gameCode: 'MD2715',
    status: 'error',
    timer: 19,
    roadmap: t7.roadmap,
    stats: t7.stats,
    ai: { ...defaultAi, finalOpinion: 'DATA_ERROR', skipReasons: ['화면 인식 결과에서 이전 회차와 충돌이 발생했습니다.', 'API 연결 지연으로 실시간 분석을 완료하지 못했습니다.'] }
  },
  {
    id: 't8',
    name: 'TABLE 08',
    gameCode: 'MD2716',
    status: 'paused',
    timer: 2,
    roadmap: t8.roadmap,
    stats: t8.stats,
    ai: { ...defaultAi, finalOpinion: 'PAUSE', skipReasons: ['사용자가 일시정지를 요청했습니다.', '위험 관리 시스템 점검 중입니다.'] }
  }
];

export const MOCK_NOTIFICATIONS: Notification[] = [
  { id: 'n1', type: 'warning', message: '로스컷까지 20% 남았습니다.', time: '방금 전', read: false, isRiskAlert: true },
  { id: 'n2', type: 'info', message: 'TABLE 03에서 규칙 1이 발동했습니다.', time: '2분 전', read: false },
  { id: 'n3', type: 'error', message: 'AI 의견이 일치하지 않습니다.', time: '5분 전', read: true },
  { id: 'n4', type: 'info', message: '새로운 슈가 시작되었습니다.', time: '12분 전', read: true }
];

export const MOCK_HISTORY: GameHistoryEntry[] = [
  {
    id: 'h1',
    time: '14:32:05',
    tableName: 'TABLE 01',
    shoeNumber: 'SHOE-128',
    round: 36,
    previousResult: 'Player 2연속',
    gptOpinion: 'PLAYER',
    geminiOpinion: 'PLAYER',
    claudeOpinion: 'SKIP',
    finalOpinion: 'PLAYER',
    userSelection: 'PLAYER',
    amount: 10000,
    actualResult: 'P',
    pnl: 10000,
    martingaleStage: 1,
    appliedRule: '규칙 1',
    dataStatus: '정상'
  },
  {
    id: 'h2',
    time: '14:30:12',
    tableName: 'TABLE 03',
    shoeNumber: 'SHOE-082',
    round: 22,
    previousResult: 'Banker 3연속',
    gptOpinion: 'BANKER',
    geminiOpinion: 'BANKER',
    claudeOpinion: 'BANKER',
    finalOpinion: 'BANKER',
    userSelection: 'BANKER',
    amount: 20000,
    actualResult: 'P',
    pnl: -20000,
    martingaleStage: 2,
    appliedRule: '규칙 2',
    dataStatus: '정상'
  },
  {
    id: 'h3',
    time: '14:28:45',
    tableName: 'TABLE 01',
    shoeNumber: 'SHOE-128',
    round: 35,
    previousResult: 'Player 1연속',
    gptOpinion: 'SKIP',
    geminiOpinion: 'PLAYER',
    claudeOpinion: 'SKIP',
    finalOpinion: 'SKIP',
    userSelection: 'SKIP',
    amount: 0,
    actualResult: 'P',
    pnl: 0,
    martingaleStage: 1,
    appliedRule: '-',
    dataStatus: '정상'
  }
];
