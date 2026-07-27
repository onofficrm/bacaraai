import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Radio,
  X,
  RefreshCw,
  Maximize2,
  Minimize2,
  AlertTriangle,
  Loader2,
  Info,
} from 'lucide-react';
import { playSfx } from '../audio/sfxEngine';
import { fetchStreamViewerSession } from '../api/streamViewer';

type Props = {
  open: boolean;
  tableName: string;
  tableCode: string;
  /** 결과 동기화 표시용 (선택) */
  latestResultLabel?: string;
  onClose: () => void;
};

/**
 * MediaMTX 공식 플레이어 iframe (HLS 안정 재생 전용).
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
      const session = await fetchStreamViewerSession(tableCode, 'hls');
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
  }, [tableCode]);

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
  }, [open, tableCode, reloadSession]);

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
              <span className="ml-1 font-medium normal-case tracking-normal text-zinc-500">
                · 약 {latencySec}초 지연
              </span>
            </p>
            <h2 className="text-sm sm:text-base font-bold text-white truncate">
              {tableName}
              <span className="ml-2 text-xs font-mono font-medium text-zinc-500">{tableCode}</span>
            </h2>
          </div>
          <div className="flex items-center gap-1 shrink-0">
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
          <p className="flex items-start gap-1.5 text-[11px] text-zinc-400 leading-snug">
            <Info size={13} className="shrink-0 mt-0.5 text-zinc-500" />
            <span>
              중계는 실제보다 약 {latencySec}초 늦을 수 있어요. 경기 결과에는 영향 없고, 참고용으로
              봐 주세요.
              {latestResultLabel ? (
                <span className="text-zinc-600"> · 감지 최신: {latestResultLabel}</span>
              ) : null}
            </span>
          </p>
          {syncNote ? <p className="text-[10px] text-zinc-600 leading-snug pl-[19px]">{syncNote}</p> : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
