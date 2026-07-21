export type GameResult = 'P' | 'B' | 'T';
export type AiOpinion = 'PLAYER' | 'BANKER' | 'WAIT' | 'SKIP' | 'PAUSE' | 'STOP' | 'ERROR' | 'DATA_ERROR';
export type TableStatus = 'observing' | 'analyzing' | 'rule_triggered' | 'waiting_user' | 'checking_result' | 'paused' | 'error' | 'risk_blocked' | 'betting' | 'waiting';

export interface AiAnalysisResult {
  action: 'BET' | 'WAIT' | 'STOP';
  side: 'PLAYER' | 'BANKER' | 'NONE';
  amount: number;
  confidence: number;
  reasons: string[];
  triggeredRules: string[];
  riskFlags: string[];
}

export interface AiModelAnalysis {
  status: string;
  opinion: AiOpinion;
  confidence: number;
  responseTime: number;
  reasons: string[];
}

export interface TableStats {
  player: number;
  banker: number;
  tie: number;
  currentStreak: string;
  shoeProgress: number;
  shoeNumber: string;
  currentRound: number;
  recentResults: GameResult[];
}

export interface TableData {
  id: string;
  name: string;
  gameCode: string;
  status: TableStatus;
  timer: number;
  live?: {
    connected: boolean;
    loading: boolean;
    latestId: number | null;
    latestDetectedAt: string | null;
    error: string | null;
    gameNo?: number | null;
  };
  roadmap: GameResult[][]; // 2D array for columns
  stats: TableStats;
  ai: {
    gpt: AiModelAnalysis;
    gemini: AiModelAnalysis;
    claude: AiModelAnalysis;
    consensus: string; // e.g., "2/3"
    finalOpinion: AiOpinion;
    recommendedAmount: number;
    finalConfidence: number;
    appliedRule: string;
    finalResult?: AiAnalysisResult;
    skipReasons?: string[];
    discussionSummary?: string;
  };
}

export interface RuleData {
  id: string;
  name: string;
  active: boolean;
  triggerCondition: string;
  targetSide: 'PLAYER' | 'BANKER' | 'TIE';
  initialAmount: number;
  increaseMethod: string;
  maxStages: number;
  tieHandling: string;
  triggerCount: number;
  hitCount: number;
  currentPnL: number;
  maxConsecutiveFails: number;
  lastTriggerTime: string;
  description?: string;
}

export interface GameHistoryEntry {
  id: string;
  time: string;
  tableName: string;
  shoeNumber: string;
  round: number;
  previousResult: string;
  gptOpinion: AiOpinion;
  geminiOpinion: AiOpinion;
  claudeOpinion: AiOpinion;
  finalOpinion: AiOpinion;
  userSelection: AiOpinion;
  amount: number;
  actualResult: GameResult | 'NONE';
  pnl: number;
  martingaleStage: number;
  appliedRule: string;
  dataStatus: string;
}

export interface Notification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  message: string;
  time: string;
  read: boolean;
  isRiskAlert?: boolean;
}

/** 오토베팅 진입 방식 */
export type AutoBetStrategy = 'ai' | 'pattern';
/** 금액 진행 방식 */
export type AmountProgressMode = 'martin' | 'custom';

export interface SessionConfig {
  seed: number;
  winCut: number;
  lossCut: number;
  initialBet: number;
  maxMartin: number;
  maxBet: number;
  maxTables: number;
  maxTime: number; // in minutes
  /** AI 추천 vs 사용자 패턴 */
  strategy: AutoBetStrategy;
  /** 사용자 패턴: 버튼으로 쌓은 결과 시퀀스 (예: B B B B P) */
  patternSequence: GameResult[];
  /** 패턴 일치 후 베팅할 사이드 */
  patternBetSide: 'PLAYER' | 'BANKER' | 'TIE';
  /** 마틴(2배) 또는 단계별 직접 금액 */
  amountMode: AmountProgressMode;
  /** amountMode=custom 일 때 단계별 금액 (index 0 = 1단계) */
  customSteps: number[];
}
