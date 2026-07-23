import type { SessionConfig } from '../types';
import { computeGauge } from '../hooks/useSession';
import { inferBetSource, loadBetHistory } from './betHistory';

export type RiskLevel = 'info' | 'warn' | 'critical';

export type RiskCoachAlert = {
  id: string;
  level: RiskLevel;
  title: string;
  message: string;
};

/** 세션 손익·마틴·최근 기록으로 실시간 위험 코치 메시지 생성 */
export function buildRiskCoachAlerts(input: {
  status: string;
  pnl: number;
  martinStage: number;
  config: SessionConfig;
  sessionStartedAt?: number | null;
}): RiskCoachAlert[] {
  if (input.status !== 'running' && input.status !== 'paused') return [];

  const alerts: RiskCoachAlert[] = [];
  const { pnl, martinStage, config } = input;
  const gauge = computeGauge(pnl, config.lossCut, config.winCut);
  const maxMartin = Math.max(1, config.maxMartin || 1);
  const stage = Math.min(Math.max(1, martinStage), maxMartin);

  const start = input.sessionStartedAt && input.sessionStartedAt > 0 ? input.sessionStartedAt - 5_000 : 0;
  const history = loadBetHistory().filter((e) => {
    if (e.dataStatus === '접수') return false;
    if (start > 0 && (e.at || 0) > 0 && (e.at || 0) < start) return false;
    return true;
  });

  let consecutiveLosses = 0;
  for (const e of history) {
    if (e.pnl < 0) consecutiveLosses += 1;
    else if (e.pnl > 0) break;
    else continue;
  }

  if (gauge.zone === 'hit_loss') {
    alerts.push({
      id: 'hit_loss',
      level: 'critical',
      title: '로스컷 도달',
      message: '손실 한도에 도달했습니다. 즉시 오토베팅을 종료하세요.',
    });
  } else if (gauge.zone === 'near_loss') {
    const ratio = config.lossCut !== 0 ? Math.abs(pnl / config.lossCut) : 0;
    alerts.push({
      id: 'near_loss',
      level: 'critical',
      title: '손실 한도 근접',
      message: `현재 손실이 한도의 ${Math.round(ratio * 100)}%입니다. 신규 진입을 멈추는 것을 권장합니다.`,
    });
  }

  if (gauge.zone === 'hit_win') {
    alerts.push({
      id: 'hit_win',
      level: 'info',
      title: '윈컷 도달',
      message: '목표 수익에 도달했습니다. 수익 확정을 권장합니다.',
    });
  } else if (gauge.zone === 'near_win') {
    alerts.push({
      id: 'near_win',
      level: 'info',
      title: '목표 수익 근접',
      message: '윈컷에 가까워졌습니다. 무리한 마틴 상향을 피하세요.',
    });
  }

  if (stage >= maxMartin) {
    alerts.push({
      id: 'martin_max',
      level: 'critical',
      title: '마틴 최대 단계',
      message: `마틴 ${stage}/${maxMartin} 단계입니다. 다음 패배 시 한도 위험이 큽니다.`,
    });
  } else if (stage >= Math.max(3, Math.ceil(maxMartin * 0.6))) {
    alerts.push({
      id: 'martin_high',
      level: 'warn',
      title: '마틴 단계 상승',
      message: `현재 마틴 ${stage}단계입니다. 연속 손실 구간에서는 관망을 고려하세요.`,
    });
  }

  if (consecutiveLosses >= 4) {
    alerts.push({
      id: 'loss_streak',
      level: 'critical',
      title: `${consecutiveLosses}연패`,
      message: '연속 패배가 길어졌습니다. 잠시 쉬거나 직접 베팅만 사용하는 것을 권장합니다.',
    });
  } else if (consecutiveLosses >= 3) {
    alerts.push({
      id: 'loss_streak',
      level: 'warn',
      title: `${consecutiveLosses}연패`,
      message: '연속 패배 중입니다. 패턴/AI 진입 조건을 한 번 더 확인하세요.',
    });
  }

  const autoLosses = history.filter((e) => inferBetSource(e) === 'auto' && e.pnl < 0).length;
  const autoWins = history.filter((e) => inferBetSource(e) === 'auto' && e.pnl > 0).length;
  if (autoLosses + autoWins >= 6 && autoLosses >= autoWins * 2) {
    alerts.push({
      id: 'auto_underperform',
      level: 'warn',
      title: '오토 성과 저조',
      message: `오토 승 ${autoWins} / 패 ${autoLosses}. 전략 전환 또는 관망을 검토하세요.`,
    });
  }

  // 우선순위: critical > warn > info, 최대 2개
  const rank = { critical: 0, warn: 1, info: 2 } as const;
  return alerts
    .sort((a, b) => rank[a.level] - rank[b.level])
    .slice(0, 2);
}

export function primaryRiskAlert(alerts: RiskCoachAlert[]): RiskCoachAlert | null {
  return alerts[0] || null;
}
