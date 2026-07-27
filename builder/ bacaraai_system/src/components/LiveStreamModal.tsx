import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Radio,
  X,
  RefreshCw,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  AlertTriangle,
  Loader2,
  Gauge,
} from 'lucide-react';
import { playSfx } from '../audio/sfxEngine';
import { fetchStreamViewerSession } from '../api/streamViewer';
import {
  loadLiveModePref,
  loadLiveMutePref,
  saveLiveModePref,
  saveLiveMutePref,
  type StreamPlayMode,
} from '../utils/liveStreamUrl';

type Props = {
  open: boolean;
  tableName: string;
  tableCode: string;
  /** 결과 동기화 표시용 (선택) */
  latestResultLabel?: string;
  onClose: () => void;
};

/**
 * MediaMTX 공식 플레이어 iframe.
 * 재생 URL은 stream_viewer API에서만 발급 (클라이언트에서 gameCode로 조합하지 않음).
 */
export default function LiveStreamModal({
  open,
  tableName,
  tableCode,
  latestResultLabel,
  onClose,
}: Props) {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const [iframeKey, setIframeKey] = useState(0);
  const [mode, setMode] = useState<StreamPlayMode>(() => loadLiveModePref());
  const [mutedHint, setMutedHint] = useState(() => loadLiveMutePref());
  const [playerUrl, setPlayerUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [online, setOnline] = useState<boolean | null>(null);
  const [stalled, setStalled] = useState(false);
  const [latencySec, setLatencySec] = useState(5);
  const [syncNote, setSyncNote] = useState('');
  const [expiresAt, setExpiresAt] = useState(0);
  const [isFs, setIsFs] = useState(false);

  const reloadSession = useCallback(async () => {
    if (!tableCode) return;
    setLoading(true);
    setError(null);
    setIframeLoaded(false);
    try {
      const session = await fetchStreamViewerSession(tableCode, mode);
      setPlayerUrl(session.player_url || '');
      setOnline(session.status?.online ?? null);
      setStalled(Boolean(session.status?.stalled));
      setLatencySec(session.latency_sec || session.sync?.expected_delay_sec || 5);
      setSyncNote(session.sync?.note || '');
      setExpiresAt(session.expires_at || 0);
      setIframeKey((k) => k + 1);
      if (!session.player_url) {
        setError('플레이어 주소를 받지 못했습니다.');
      }
    } catch (e) {
      setPlayerUrl('');
      setError(e instanceof Error ? e.message : '시청 세션 오류');
    } finally {
      setLoading(false);
    }
  }, [tableCode, mode]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (document.fullscreenElement) {
          void document.exitFullscreen();
          return;
        }
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      setPlayerUrl('');
      setError(null);
      return;
    }
    void reloadSession();
  }, [open, tableCode, mode, reloadSession]);

  useEffect(() => {
    const onFs = () => setIsFs(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  // 토큰 만료 임박 시 조용히 재발급 (재생 중 끊김 방지)
  useEffect(() => {
    if (!open || !expiresAt) return;
    const ms = Math.max(5_000, expiresAt * 1000 - Date.now() - 60_000);
    const id = window.setTimeout(() => {
      void reloadSession();
    }, ms);
    return () => window.clearTimeout(id);
  }, [open, expiresAt, reloadSession]);

  const toggleFs = async () => {
    playSfx('ui');
    const el = shellRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) {
        await el.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      /* ignore */
    }
  };

  const switchMode = (next: StreamPlayMode) => {
    if (next === mode) return;
    playSfx('ui');
    saveLiveModePref(next);
    setMode(next);
  };

  const toggleMuteHint = () => {
    playSfx('ui');
    const next = !mutedHint;
    setMutedHint(next);
    saveLiveMutePref(next);
  };

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-black/75 p-0 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={`${tableName} 라이브`}
      onClick={onClose}
    >
      <div
        ref={shellRef}
        className="w-full sm:max-w-3xl rounded-t-2xl sm:rounded-2xl border border-zinc-700 bg-zinc-950 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-zinc-800">
          <div className="min-w-0">
            <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-rose-400/90 flex items-center gap-1.5">
              <Radio size={12} className={online && !stalled ? 'animate-pulse' : ''} />
              {online === false ? 'OFFLINE' : stalled ? 'STALL' : 'LIVE'}
              <span className="ml-1 font-mono normal-case tracking-normal text-zinc-500">
                · {mode.toUpperCase()} · ~{latencySec}s
              </span>
            </p>
            <h2 className="text-sm sm:text-base font-bold text-white truncate">
              {tableName}
              <span className="ml-2 text-xs font-mono font-medium text-zinc-500">{tableCode}</span>
            </h2>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <div className="hidden sm:flex items-center rounded-lg border border-zinc-700 overflow-hidden mr-1">
              <button
                type="button"
                onClick={() => switchMode('hls')}
                className={`px-2 py-1 text-[10px] font-bold ${
                  mode === 'hls' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'
                }`}
              >
                HLS
              </button>
              <button
                type="button"
                onClick={() => switchMode('webrtc')}
                className={`px-2 py-1 text-[10px] font-bold ${
                  mode === 'webrtc' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'
                }`}
                title="저지연 (서버 WebRTC 포트 필요)"
              >
                WebRTC
              </button>
            </div>
            <button
              type="button"
              onClick={toggleMuteHint}
              className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 touch-manipulation"
              aria-label={mutedHint ? '음소거 해제 안내' : '음소거 안내'}
              title={
                mutedHint
                  ? '음소거 선호 저장됨 — 플레이어에서 소리를 켜세요'
                  : '소리 ON 선호 — 플레이어 컨트롤 사용'
              }
            >
              {mutedHint ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <button
              type="button"
              onClick={toggleFs}
              className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 touch-manipulation"
              aria-label="전체 화면"
            >
              {isFs ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
            <button
              type="button"
              onClick={() => {
                playSfx('ui');
                void reloadSession();
              }}
              className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 touch-manipulation"
              aria-label="새로고침"
              title="세션·플레이어 새로고침"
            >
              <RefreshCw size={18} />
            </button>
            <button
              type="button"
              onClick={() => {
                playSfx('ui');
                onClose();
              }}
              className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 touch-manipulation"
              aria-label="닫기"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="relative bg-black aspect-video">
          {playerUrl && !error ? (
            <iframe
              key={iframeKey}
              src={playerUrl}
              title={`${tableName} 라이브 플레이어`}
              className="absolute inset-0 w-full h-full border-0 bg-black"
              allow="autoplay; fullscreen; picture-in-picture; encrypted-media; microphone"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
              onLoad={() => setIframeLoaded(true)}
            />
          ) : null}

          {(loading || (!iframeLoaded && !error && playerUrl)) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 text-zinc-200 pointer-events-none">
              <Loader2 className="animate-spin" size={28} />
              <p className="text-sm">라이브 연결 중…</p>
            </div>
          )}

          {error ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center bg-zinc-950">
              <AlertTriangle className="text-amber-400" size={28} />
              <p className="text-sm text-zinc-200 leading-relaxed max-w-md">{error}</p>
              <button
                type="button"
                onClick={() => void reloadSession()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-100 bg-zinc-800 border border-zinc-600"
              >
                <RefreshCw size={14} />
                다시 시도
              </button>
            </div>
          ) : null}

          {stalled && online !== false && !error ? (
            <div className="absolute top-2 left-2 right-2 sm:right-auto rounded-md bg-amber-500/15 border border-amber-500/40 px-2 py-1 text-[11px] text-amber-100">
              송출은 연결됐지만 프레임이 멈춘 것으로 보입니다(정지 화면 감지)
            </div>
          ) : null}
          {online === false && !error && !stalled ? (
            <div className="absolute top-2 left-2 right-2 sm:right-auto rounded-md bg-amber-500/15 border border-amber-500/40 px-2 py-1 text-[11px] text-amber-100">
              서버 상태: 송출 없음 또는 점검 중 — 플레이어는 유지됩니다
            </div>
          ) : null}
        </div>

        <div className="px-4 py-2.5 border-t border-zinc-800 space-y-1.5">
          <div className="flex items-center justify-between gap-2 text-[11px] text-zinc-500">
            <span className="flex items-center gap-1 min-w-0">
              <Gauge size={12} className="shrink-0" />
              <span className="truncate">
                예상 지연 ~{latencySec}초
                {latestResultLabel ? ` · 감지 최신: ${latestResultLabel}` : ''}
              </span>
            </span>
            <span className="font-mono shrink-0 opacity-60">
              {mode === 'webrtc' ? 'WebRTC' : 'MediaMTX HLS'}
            </span>
          </div>
          {syncNote ? <p className="text-[10px] text-zinc-600 leading-snug">{syncNote}</p> : null}
          <div className="sm:hidden flex gap-1">
            <button
              type="button"
              onClick={() => switchMode('hls')}
              className={`flex-1 py-1.5 rounded text-[11px] font-bold border ${
                mode === 'hls'
                  ? 'border-zinc-500 bg-zinc-800 text-white'
                  : 'border-zinc-700 text-zinc-400'
              }`}
            >
              HLS 안정
            </button>
            <button
              type="button"
              onClick={() => switchMode('webrtc')}
              className={`flex-1 py-1.5 rounded text-[11px] font-bold border ${
                mode === 'webrtc'
                  ? 'border-zinc-500 bg-zinc-800 text-white'
                  : 'border-zinc-700 text-zinc-400'
              }`}
            >
              WebRTC 저지연
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
