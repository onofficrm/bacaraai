import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  CircleHelp,
  FlaskConical,
  LayoutGrid,
  LineChart,
  LogOut,
  Maximize2,
  Menu,
  Minimize2,
  Settings,
  ShieldAlert,
  Wallet,
  X,
} from 'lucide-react';
import NotificationCenter from './NotificationCenter';
import { PLATFORM_LINKS } from '../constants';
import useWallet from '../hooks/useWallet';
import HelpTooltip from './HelpTooltip';
import { playSfx } from '../audio/sfxEngine';
import {
  formatElapsed,
  formatMoney,
  modeLabel,
  type SessionMode,
  type SessionStatus,
} from '../hooks/useSession';
import { getTodayBetStats } from '../utils/betHistory';
import type { ViewType } from './TopNav';

export type HeaderLiveStatus = {
  connected: boolean;
  loading: boolean;
  error: string | null;
  latestDetectedAt: string | null;
  tableLabel: string;
};

const NAV_ITEMS: {
  id: ViewType;
  label: string;
  hint: string;
  icon: typeof LayoutGrid;
}[] = [
  { id: 'multitable', label: '라이브 테이블', hint: '플레이 화면', icon: LayoutGrid },
  { id: 'lab', label: '규칙 연구실', hint: '패턴·규칙', icon: FlaskConical },
  { id: 'insight', label: '데이터 및 기록', hint: '기록·통계', icon: LineChart },
  { id: 'settings', label: '설정', hint: '사운드·연출', icon: Settings },
  { id: 'help', label: '도움말', hint: '사용 안내', icon: CircleHelp },
];

interface HeaderProps {
  onEmergencyStop?: () => void;
  activeView?: ViewType;
  activeViewLabel?: string;
  beginnerMode?: boolean;
  onOpenSettings?: () => void;
  onChangeView?: (view: ViewType) => void;
  sessionStatus?: SessionStatus;
  sessionMode?: SessionMode | null;
  sessionElapsedMs?: number;
  onSessionModeChange?: (mode: SessionMode) => void;
  liveStatus?: HeaderLiveStatus | null;
  aiRecommendCount?: number;
}

function isFullscreenActive() {
  return Boolean(
    document.fullscreenElement ||
      (document as Document & { webkitFullscreenElement?: Element }).webkitFullscreenElement,
  );
}

async function enterFullscreen() {
  const el = document.documentElement as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void> | void;
  };
  if (el.requestFullscreen) {
    await el.requestFullscreen();
  } else if (el.webkitRequestFullscreen) {
    await el.webkitRequestFullscreen();
  }
}

async function exitFullscreen() {
  const doc = document as Document & {
    webkitExitFullscreen?: () => Promise<void> | void;
  };
  if (document.exitFullscreen) {
    await document.exitFullscreen();
  } else if (doc.webkitExitFullscreen) {
    await doc.webkitExitFullscreen();
  }
}

function relativeUpdateLabel(iso: string | null | undefined): string {
  if (!iso) return '—';
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '—';
  const sec = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (sec < 8) return '방금 전';
  if (sec < 60) return `${sec}초 전`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}분 전`;
  return `${Math.floor(min / 60)}시간 전`;
}

export default function Header({
  onEmergencyStop,
  activeView = 'multitable',
  activeViewLabel,
  beginnerMode = true,
  onOpenSettings,
  onChangeView,
  sessionStatus = 'idle',
  sessionMode = null,
  sessionElapsedMs = 0,
  onSessionModeChange,
  liveStatus = null,
  aiRecommendCount = 0,
}: HeaderProps) {
  const wallet = useWallet();
  const moneyText = new Intl.NumberFormat('ko-KR').format(wallet.balance) + '원';
  const [fullscreen, setFullscreen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const isActive = sessionStatus === 'running' || sessionStatus === 'paused';
  const isLiveView = activeView === 'multitable';

  const today = useMemo(() => getTodayBetStats(), [nowTick, isActive]);

  useEffect(() => {
    const sync = () => setFullscreen(isFullscreenActive());
    sync();
    document.addEventListener('fullscreenchange', sync);
    document.addEventListener('webkitfullscreenchange', sync as EventListener);
    return () => {
      document.removeEventListener('fullscreenchange', sync);
      document.removeEventListener('webkitfullscreenchange', sync as EventListener);
    };
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setNowTick(Date.now()), 5000);
    const onHist = () => setNowTick(Date.now());
    window.addEventListener('bacara-bet-history', onHist);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('bacara-bet-history', onHist);
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const toggleFullscreen = async () => {
    try {
      if (isFullscreenActive()) {
        await exitFullscreen();
        playSfx('ui');
      } else {
        await enterFullscreen();
        playSfx('sessionStart');
      }
    } catch {
      playSfx('error');
    }
  };

  const goView = (view: ViewType) => {
    playSfx('nav');
    onChangeView?.(view);
    setMenuOpen(false);
  };

  const liveLabel = !liveStatus
    ? '라이브 대기'
    : liveStatus.error
      ? '수신 오류'
      : liveStatus.loading && !liveStatus.connected
        ? '연결 중…'
        : liveStatus.connected
          ? `${liveStatus.tableLabel} 수신 중`
          : '라이브 끊김';

  const liveDot =
    liveStatus?.connected && !liveStatus.error
      ? 'bg-emerald-500 animate-pulse'
      : liveStatus?.loading
        ? 'bg-amber-400 animate-pulse'
        : 'bg-zinc-600';

  const updateLabel = isActive
    ? '방금 전'
    : relativeUpdateLabel(liveStatus?.latestDetectedAt);

  return (
    <header className="relative z-[200] min-h-[68px] h-auto py-2 bg-zinc-950 border-b border-zinc-800 flex items-center gap-2 sm:gap-3 px-3 sm:px-6 text-zinc-300 shrink-0">
      <div className="flex items-center gap-2 sm:gap-3 shrink-0 min-w-0">
        <div className="flex items-center gap-2 text-amber-500 shrink-0">
          <Activity size={22} className="animate-pulse shrink-0" />
          <h1 className="font-bold text-base lg:text-lg tracking-tight text-white hidden md:block whitespace-nowrap">
            바카라 AI 도우미
          </h1>
        </div>

        <div className="relative shrink-0" ref={menuRef}>
          <button
            type="button"
            onClick={() => {
              playSfx('ui');
              setMenuOpen((v) => !v);
            }}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-colors ${
              menuOpen || !isLiveView
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-zinc-600'
            }`}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            title="화면 메뉴"
          >
            {menuOpen ? <X size={14} /> : <Menu size={14} />}
            <span className="max-w-[6.5rem] truncate">{activeViewLabel || '메뉴'}</span>
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute left-0 top-[calc(100%+6px)] z-[220] w-[min(18rem,calc(100vw-1.5rem))] rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl p-1.5"
            >
              <p className="px-2.5 py-1.5 text-[10px] font-bold text-zinc-500 tracking-wide">
                화면 이동
              </p>
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="menuitem"
                    onClick={() => goView(item.id)}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg text-left transition-colors ${
                      active
                        ? 'bg-amber-500/15 text-amber-300'
                        : 'text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    <Icon size={16} className="shrink-0 opacity-90" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold">{item.label}</span>
                      <span className="block text-[10px] text-zinc-500">{item.hint}</span>
                    </span>
                    {active && (
                      <span className="text-[9px] font-black text-amber-400/80">현재</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {!isLiveView && (
          <button
            type="button"
            onClick={() => goView('multitable')}
            className="shrink-0 inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold hover:bg-emerald-500/15"
          >
            <LayoutGrid size={13} />
            라이브로
          </button>
        )}

        <select
          value={sessionMode ?? ''}
          onChange={(e) => {
            const value = e.target.value as SessionMode;
            if (!value) return;
            playSfx('ui');
            onSessionModeChange?.(value);
          }}
          className={`shrink-0 max-w-[9.5rem] sm:max-w-none bg-zinc-800 border border-zinc-700 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold outline-none cursor-pointer hover:bg-zinc-700 transition-colors ${
            sessionMode === 'shadow'
              ? 'text-indigo-400'
              : sessionMode === 'live'
                ? 'text-amber-400'
                : 'text-emerald-400'
          }`}
        >
          {!sessionMode && <option value="">오토베팅 꺼짐</option>}
          <option value="observe">오토 · 관망</option>
          <option value="live">오토베팅 (AI 자동)</option>
          <option value="shadow">오토 · 섀도</option>
        </select>
      </div>

      <div className="hidden xl:flex flex-1 min-w-0 items-center justify-center">
        <div className="flex items-center gap-3 2xl:gap-5 text-sm bg-zinc-900/50 border border-zinc-800/50 px-3 2xl:px-4 py-1.5 rounded-full max-w-full overflow-x-auto custom-scrollbar whitespace-nowrap">
          <div className="flex items-center gap-1.5 bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded text-xs font-bold border border-amber-500/30 shrink-0">
            <Activity size={12} className="shrink-0" />
            데모 데이터 사용 중
          </div>

          {isActive ? (
            <>
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`w-2 h-2 rounded-full ${
                    sessionStatus === 'running' ? 'bg-blue-500 animate-pulse' : 'bg-amber-400'
                  }`}
                />
                <span
                  className={`font-bold ${
                    sessionStatus === 'running' ? 'text-blue-400' : 'text-amber-400'
                  }`}
                >
                  {sessionStatus === 'running'
                    ? `${modeLabel(sessionMode)} 진행 중`
                    : '오토베팅 일시정지'}
                </span>
              </div>
              <div className="h-4 w-[1px] bg-zinc-800 shrink-0" />
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-zinc-500">진행 시간</span>
                <span className="font-mono font-medium text-zinc-200">
                  {formatElapsed(sessionElapsedMs)}
                </span>
              </div>
              <div className="h-4 w-[1px] bg-zinc-800 shrink-0" />
              <div className="flex items-center gap-2 text-xs shrink-0">
                <span className="text-zinc-500">마지막 업데이트:</span>
                <span className="text-emerald-400">{updateLabel}</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 shrink-0" title={liveStatus?.error || undefined}>
                <span className={`w-2 h-2 rounded-full shrink-0 ${liveDot}`} />
                <span
                  className={`font-bold text-xs sm:text-sm ${
                    liveStatus?.connected && !liveStatus.error
                      ? 'text-emerald-400'
                      : liveStatus?.error
                        ? 'text-rose-400'
                        : 'text-zinc-400'
                  }`}
                >
                  {liveLabel}
                </span>
              </div>
              <div className="h-4 w-[1px] bg-zinc-800 shrink-0" />
              <div className="flex items-center gap-2 text-xs shrink-0">
                <span className="text-zinc-500">오늘</span>
                {today.count === 0 ? (
                  <span className="text-zinc-400">아직 베팅 없음</span>
                ) : (
                  <span className="font-medium">
                    <span className="text-emerald-400">승 {today.wins}</span>
                    <span className="text-zinc-600 mx-1">·</span>
                    <span className="text-rose-400">패 {today.losses}</span>
                    <span className="text-zinc-600 mx-1">·</span>
                    <span
                      className={`font-mono font-bold ${
                        today.pnl > 0
                          ? 'text-emerald-400'
                          : today.pnl < 0
                            ? 'text-rose-400'
                            : 'text-zinc-300'
                      }`}
                    >
                      {formatMoney(today.pnl, true)}
                    </span>
                  </span>
                )}
              </div>
              <div className="h-4 w-[1px] bg-zinc-800 shrink-0" />
              <div className="flex items-center gap-2 text-xs shrink-0">
                <span className="text-zinc-500">결과 갱신:</span>
                <span className={liveStatus?.connected ? 'text-emerald-400' : 'text-zinc-500'}>
                  {updateLabel}
                </span>
                {aiRecommendCount > 0 && (
                  <>
                    <span className="text-zinc-700">·</span>
                    <span className="text-sky-400 font-bold">AI 추천 {aiRecommendCount}</span>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-auto">
        <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs sm:text-sm font-bold whitespace-nowrap">
          <Wallet size={14} className="shrink-0" />
          <span className="hidden sm:inline">가상머니</span>
          {beginnerMode && <HelpTooltip termId="virtual-money" />}
          <span className="font-mono">{wallet.loading ? '...' : moneyText}</span>
        </div>
        <div className="hidden sm:flex items-center gap-3 text-zinc-400">
          <button
            className={`p-2 hover:bg-zinc-800 rounded-lg transition-colors ${
              fullscreen ? 'text-amber-400 bg-amber-500/10' : ''
            }`}
            type="button"
            aria-label={fullscreen ? '전체 화면 종료' : '전체 화면'}
            aria-pressed={fullscreen}
            title={
              fullscreen
                ? '전체 화면 종료 (Esc)'
                : '전체 화면으로 보기 — 테이블을 넓게 모니터링'
            }
            onClick={() => void toggleFullscreen()}
          >
            {fullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </button>
          <NotificationCenter />
          <button
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
            type="button"
            aria-label="설정"
            title="설정"
            onClick={() => {
              playSfx('ui');
              onOpenSettings?.();
            }}
          >
            <Settings size={18} />
          </button>
        </div>
        <a
          href={PLATFORM_LINKS.logout}
          className="flex items-center gap-2 px-3 py-2 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-white text-sm font-medium border border-zinc-800"
          title="로그아웃"
        >
          <LogOut size={16} />
          <span className="hidden sm:inline">로그아웃</span>
        </a>
        <button
          onClick={onEmergencyStop}
          className="flex items-center gap-2 bg-red-950/40 text-red-400 hover:bg-red-900/50 border border-red-900/50 px-4 py-2 rounded-lg font-medium text-sm transition-colors"
        >
          <ShieldAlert size={16} />
          긴급 정지
        </button>
      </div>
    </header>
  );
}
