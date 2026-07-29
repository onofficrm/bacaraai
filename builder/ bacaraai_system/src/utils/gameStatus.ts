/** 감지 프로그램 game_status 정규화·표시 */

export type GameStatus = 'game' | 'shuffle' | 'lobby' | 'unknown';

/** lobby→game 보정 창 (서버 BACARA_LIVE_STATUS_HEAL_SEC 와 맞춤) */
export const GAME_STATUS_HEAL_MS = 900_000;

/**
 * DB status → 앱 상태
 * - game: 게임 활성(베팅 가능)
 * - shuffle: 셔플 중
 * - lobby: 게임 종료 (구 stop 포함)
 */
export function parseGameStatus(raw: string | null | undefined): GameStatus | null {
  const s = String(raw || '')
    .trim()
    .toLowerCase();
  if (!s) return null;
  if (s === 'game' || s === 'play' || s === 'playing' || s === '감지') return 'game';
  if (s === 'shuffle' || s === '셔플' || s === 'shuffle_on') return 'shuffle';
  if (
    s === 'lobby' ||
    s === 'stop' ||
    s === '대기' ||
    s === 'idle' ||
    s === 'paused' ||
    s === 'end' ||
    s === 'ended'
  ) {
    return 'lobby';
  }
  return 'unknown';
}

/**
 * 감지 status 가 lobby/unknown 인데 결과가 계속 들어오면 game 으로 보정.
 * wallClockSeenAt = 클라이언트가 해당 latestId 를 처음 본 시각(Date.now)
 */
export function resolveEffectiveGameStatus(
  status: GameStatus | null | undefined,
  opts?: {
    wallClockSeenAt?: number | null;
    latestDetectedAt?: string | null;
    now?: number;
    healMs?: number;
  },
): GameStatus | null {
  const base = status ?? null;
  if (base === 'shuffle' || base === 'game') return base;

  const now = opts?.now ?? Date.now();
  const healMs = opts?.healMs ?? GAME_STATUS_HEAL_MS;

  const wall = opts?.wallClockSeenAt;
  if (typeof wall === 'number' && wall > 0 && now - wall >= 0 && now - wall <= healMs) {
    return 'game';
  }

  const at = opts?.latestDetectedAt ? String(opts.latestDetectedAt).trim() : '';
  if (at) {
    const normalized = at.includes('T') ? at : at.replace(' ', 'T');
    const ts = Date.parse(normalized);
    if (Number.isFinite(ts)) {
      let age = now - ts;
      if (age < 0 && age > -43_200_000) age = 0;
      if (age >= 0 && age <= healMs) return 'game';
    }
  }

  return base;
}

export function isBettingBlockedByGameStatus(
  status: GameStatus | null | undefined,
  shuffleActive?: boolean,
): boolean {
  if (shuffleActive) return true;
  return status === 'lobby' || status === 'shuffle' || status === 'unknown';
}

/** 테이블 카드 한 줄 뱃지용 */
export function gameStatusBadge(status: GameStatus | null | undefined): {
  label: string;
  title: string;
  className: string;
} | null {
  if (status === 'game') {
    return {
      label: '게임중',
      title: '게임 활성 · 결과 후 베팅 가능',
      className:
        'text-[10px] px-1.5 py-0.5 rounded border border-emerald-500/45 bg-emerald-500/15 text-emerald-300 font-bold shrink-0',
    };
  }
  if (status === 'shuffle') {
    return {
      label: '셔플중',
      title: '카드 셔플 중 · 베팅 불가',
      className:
        'text-[10px] px-1.5 py-0.5 rounded border border-amber-400/55 bg-amber-500/15 text-amber-100 font-bold animate-pulse shrink-0',
    };
  }
  if (status === 'lobby') {
    return {
      label: '게임종료',
      title: '로비/대기 · 감지가 시작되면 게임중으로 전환',
      className:
        'text-[10px] px-1.5 py-0.5 rounded border border-zinc-600 bg-zinc-800/90 text-zinc-400 font-bold shrink-0',
    };
  }
  return null;
}
