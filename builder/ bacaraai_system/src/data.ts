import { TableData, GameResult, AiModelAnalysis, RuleData, GameHistoryEntry, Notification } from './types';

// Helper to generate a random roadmap column
const generateColumn = (length: number, primary: GameResult, secondary: GameResult): GameResult[] => {
  const col: GameResult[] = [];
  for (let i = 0; i < length; i++) {
    col.push(Math.random() > 0.2 ? primary : secondary);
  }
  return col;
};

// Simplified mock roadmap generation
const generateMockRoadmap = (): GameResult[][] => {
  const columns: GameResult[][] = [];
  for (let i = 0; i < 12; i++) {
    const isPlayer = Math.random() > 0.5;
    const length = Math.floor(Math.random() * 4) + 1;
    const col: GameResult[] = [];
    for(let j = 0; j < length; j++) {
      if (Math.random() > 0.9) col.push('T');
      else col.push(isPlayer ? 'P' : 'B');
    }
    columns.push(col);
  }
  return columns;
};

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

const defaultStats = {
  player: 9, banker: 3, tie: 2, currentStreak: 'Player 2연속', shoeProgress: 18,
  shoeNumber: 'SHOE-128', currentRound: 37, recentResults: ['P', 'B', 'P', 'P', 'T', 'P', 'B', 'B', 'P', 'P'] as GameResult[]
};

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

export const MOCK_TABLES: TableData[] = [
  {
    id: 't1',
    name: 'TABLE 01',
    gameCode: 'MD2709',
    status: 'rule_triggered',
    timer: 15,
    roadmap: generateMockRoadmap(),
    stats: { ...defaultStats, player: 9, banker: 3, tie: 2, currentStreak: 'Player 2연속', shoeProgress: 18 },
    ai: { ...defaultAi }
  },
  {
    id: 't2',
    name: 'TABLE 02',
    gameCode: 'MD2710',
    status: 'analyzing',
    timer: 8,
    roadmap: generateMockRoadmap(),
    stats: { ...defaultStats, player: 1, banker: 1, tie: 0, currentStreak: 'Banker 1연속', shoeProgress: 4 },
    ai: { ...defaultAi, finalOpinion: 'SKIP', consensus: '0/3', skipReasons: ['초기 데이터(4회) 부족으로 패턴을 분석하기 어렵습니다.', 'AI 세 가지 모델 모두 관망(SKIP)을 추천했습니다.'], gpt: { ...defaultAi.gpt, opinion: 'SKIP' }, gemini: { ...defaultAi.gemini, opinion: 'SKIP' }, claude: { ...defaultAi.claude, opinion: 'SKIP' } }
  },
  {
    id: 't3',
    name: 'TABLE 03',
    gameCode: 'MD2711',
    status: 'waiting_user',
    timer: 22,
    roadmap: generateMockRoadmap(),
    stats: { ...defaultStats, player: 22, banker: 35, tie: 3, currentStreak: 'Banker 3연속', shoeProgress: 68 },
    ai: { ...defaultAi, finalOpinion: 'BANKER', consensus: '3/3', gpt: { ...defaultAi.gpt, opinion: 'BANKER' }, gemini: { ...defaultAi.gemini, opinion: 'BANKER' }, claude: { ...defaultAi.claude, opinion: 'BANKER' } }
  },
  {
    id: 't4',
    name: 'TABLE 04',
    gameCode: 'MD2712',
    status: 'observing',
    timer: 5,
    roadmap: generateMockRoadmap(),
    stats: { ...defaultStats, player: 3, banker: 10, tie: 1, currentStreak: 'Banker 5연속', shoeProgress: 24 },
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
    roadmap: generateMockRoadmap(),
    stats: { ...defaultStats, player: 9, banker: 8, tie: 2, currentStreak: 'Player 1연속', shoeProgress: 32 },
    ai: { ...defaultAi }
  },
  {
    id: 't6',
    name: 'TABLE 06',
    gameCode: 'MD2714',
    status: 'risk_blocked',
    timer: 3,
    roadmap: generateMockRoadmap(),
    stats: { ...defaultStats, player: 5, banker: 5, tie: 1, currentStreak: 'Tie 1연속', shoeProgress: 15 },
    ai: { ...defaultAi, finalOpinion: 'STOP', skipReasons: ['현재 설정된 로스컷 한도에 도달할 위험이 높습니다.', '연속 패배로 인해 시스템이 베팅을 강제 차단했습니다.'] }
  },
  {
    id: 't7',
    name: 'TABLE 07',
    gameCode: 'MD2715',
    status: 'error',
    timer: 19,
    roadmap: generateMockRoadmap(),
    stats: { ...defaultStats, player: 13, banker: 15, tie: 1, currentStreak: 'Banker 2연속', shoeProgress: 42 },
    ai: { ...defaultAi, finalOpinion: 'DATA_ERROR', skipReasons: ['화면 인식 결과에서 이전 회차와 충돌이 발생했습니다.', 'API 연결 지연으로 실시간 분석을 완료하지 못했습니다.'] }
  },
  {
    id: 't8',
    name: 'TABLE 08',
    gameCode: 'MD2716',
    status: 'paused',
    timer: 2,
    roadmap: generateMockRoadmap(),
    stats: { ...defaultStats, player: 7, banker: 6, tie: 1, currentStreak: 'Player 3연속', shoeProgress: 20 },
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
