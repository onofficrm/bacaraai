import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Hls, { type ErrorData } from 'hls.js';
import { Radio, X, AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { playSfx } from '../audio/sfxEngine';
import { fetchTableStreamUrl } from '../api/liveStreams';
import { buildTableHlsUrl, probeHlsPlaylist } from '../utils/liveStreamUrl';

type Props = {
  open: boolean;
  tableName: string;
  tableCode: string;
  onClose: () => void;
};

type PlayStatus = 'connecting' | 'live' | 'offline' | 'error';

const RETRY_MS = 4000;
const MAX_MEDIA_RECOVERIES = 3;

function canNativeHls(video: HTMLVideoElement) {
  return video.canPlayType('application/vnd.apple.mpegurl') !== '';
}

function createLiveHls(): Hls {
  return new Hls({
    enableWorker: true,
    lowLatencyMode: true,
    backBufferLength: 30,
    liveSyncDurationCount: 3,
    liveMaxLatencyDurationCount: 12,
    maxLiveSyncPlaybackRate: 1.5,
    manifestLoadingTimeOut: 10000,
    manifestLoadingMaxRetry: 2,
    manifestLoadingRetryDelay: 800,
    levelLoadingMaxRetry: 4,
    fragLoadingMaxRetry: 4,
    fragLoadingRetryDelay: 500,
  });
}

export default function LiveStreamModal({ open, tableName, tableCode, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mediaRecoveriesRef = useRef(0);
  const sessionRef = useRef(0);
  const [status, setStatus] = useState<PlayStatus>('connecting');
  const [message, setMessage] = useState<string | null>(null);
  const [streamUrl, setStreamUrl] = useState('');
  const [retryNonce, setRetryNonce] = useState(0);

  const clearRetryTimer = () => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  };

  const destroyPlayer = useCallback(() => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    const el = videoRef.current;
    if (el) {
      el.pause();
      el.removeAttribute('src');
      el.load();
    }
  }, []);

  const scheduleRetry = useCallback((session: number) => {
    clearRetryTimer();
    retryTimerRef.current = setTimeout(() => {
      if (sessionRef.current !== session) return;
      setRetryNonce((n) => n + 1);
    }, RETRY_MS);
  }, []);

  const manualRetry = () => {
    playSfx('ui');
    clearRetryTimer();
    setRetryNonce((n) => n + 1);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
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
    if (!open) return;

    const session = ++sessionRef.current;
    const abort = new AbortController();
    let cancelled = false;
    mediaRecoveriesRef.current = 0;

    const isActive = () => !cancelled && sessionRef.current === session;

    const markOffline = (detail?: string) => {
      if (!isActive()) return;
      destroyPlayer();
      setStatus('offline');
      setMessage(
        detail ||
          '현재 이 테이블 방송이 송출되지 않습니다. OBS 송출이 시작되면 자동으로 다시 연결합니다.',
      );
      scheduleRetry(session);
    };

    const markError = (detail: string, retry = true) => {
      if (!isActive()) return;
      destroyPlayer();
      setStatus('error');
      setMessage(detail);
      if (retry) scheduleRetry(session);
    };

    const tryPlay = async (el: HTMLVideoElement) => {
      try {
        el.muted = true;
        await el.play();
        // 자동재생 확보 후 소리 복구 시도 (정책상 실패해도 영상은 유지)
        el.muted = false;
        await el.play().catch(() => {
          el.muted = true;
        });
      } catch {
        /* controls로 수동 재생 */
      }
    };

    const attachHls = (url: string, el: HTMLVideoElement) => {
      destroyPlayer();
      const hls = createLiveHls();
      hlsRef.current = hls;

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (!isActive()) return;
        setStatus('live');
        setMessage(null);
        void tryPlay(el);
      });

      hls.on(Hls.Events.ERROR, (_evt, data: ErrorData) => {
        if (!isActive() || !data.fatal) return;

        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          const offline =
            data.details === Hls.ErrorDetails.MANIFEST_LOAD_ERROR ||
            data.details === Hls.ErrorDetails.MANIFEST_LOAD_TIMEOUT ||
            data.details === Hls.ErrorDetails.LEVEL_LOAD_ERROR;
          if (offline) {
            markOffline();
            return;
          }
          try {
            hls.startLoad();
          } catch {
            markError('네트워크 오류로 재생이 중단되었습니다.');
          }
          return;
        }

        if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          if (mediaRecoveriesRef.current < MAX_MEDIA_RECOVERIES) {
            mediaRecoveriesRef.current += 1;
            try {
              hls.recoverMediaError();
              return;
            } catch {
              /* fall through */
            }
          }
          markError('미디어 오류가 발생했습니다. 다시 연결합니다.');
          return;
        }

        markError('라이브 재생에 실패했습니다. 다시 연결합니다.');
      });

      hls.loadSource(url);
      hls.attachMedia(el);
    };

    const attachNative = (url: string, el: HTMLVideoElement) => {
      destroyPlayer();
      const onReady = () => {
        if (!isActive()) return;
        setStatus('live');
        setMessage(null);
        void tryPlay(el);
      };
      const onErr = () => {
        if (!isActive()) return;
        markOffline();
      };
      el.addEventListener('loadedmetadata', onReady, { once: true });
      el.addEventListener('error', onErr, { once: true });
      el.src = url;
    };

    const start = async () => {
      clearRetryTimer();
      setStatus('connecting');
      setMessage(null);
      destroyPlayer();

      let url = '';
      try {
        const info = await fetchTableStreamUrl(tableCode);
        if (!isActive()) return;
        url = info.stream_url || '';
        if (!info.available || !url) {
          url = buildTableHlsUrl(tableCode);
        }
      } catch {
        if (!isActive()) return;
        url = buildTableHlsUrl(tableCode);
      }

      if (!url) {
        markError('이 테이블 라이브 주소를 만들 수 없습니다.', false);
        return;
      }

      setStreamUrl(url);

      const probe = await probeHlsPlaylist(url, abort.signal);
      if (!isActive()) return;
      if (!probe.ok) {
        markOffline(
          probe.status === 404
            ? '방송이 아직 송출되지 않습니다(404). OBS에서 해당 테이블로 송출을 시작해 주세요.'
            : undefined,
        );
        return;
      }

      const el = videoRef.current;
      if (!el) {
        markError('플레이어를 초기화하지 못했습니다.');
        return;
      }

      if (Hls.isSupported()) {
        attachHls(url, el);
      } else if (canNativeHls(el)) {
        attachNative(url, el);
      } else {
        markError('이 브라우저에서는 HLS 라이브를 재생할 수 없습니다.', false);
      }
    };

    void start();

    return () => {
      cancelled = true;
      abort.abort();
      clearRetryTimer();
      destroyPlayer();
    };
  }, [open, tableCode, retryNonce, destroyPlayer, scheduleRetry]);

  if (!open) return null;

  const showOverlay = status !== 'live';
  const isConnecting = status === 'connecting';
  const isProblem = status === 'offline' || status === 'error';

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-black/75 p-0 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={`${tableName} 라이브`}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-3xl rounded-t-2xl sm:rounded-2xl border border-zinc-700 bg-zinc-950 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-zinc-800">
          <div className="min-w-0">
            <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-rose-400/90 flex items-center gap-1.5">
              <Radio size={12} className={status === 'live' ? 'animate-pulse' : ''} />
              {status === 'live' ? 'LIVE' : status === 'connecting' ? 'CONNECTING' : 'OFFLINE'}
            </p>
            <h2 className="text-sm sm:text-base font-bold text-white truncate">
              {tableName}
              <span className="ml-2 text-xs font-mono font-medium text-zinc-500">{tableCode}</span>
            </h2>
          </div>
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

        <div className="relative bg-black aspect-video">
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-contain bg-black"
            controls
            playsInline
            autoPlay
          />
          {showOverlay ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center bg-black/70">
              {isConnecting ? (
                <>
                  <Loader2 className="animate-spin text-zinc-200" size={28} />
                  <p className="text-sm text-zinc-200">라이브 연결 중…</p>
                </>
              ) : null}
              {isProblem ? (
                <>
                  <AlertTriangle className="text-amber-400" size={28} />
                  <p className="text-sm text-zinc-200 leading-relaxed max-w-md">{message}</p>
                  <p className="text-[11px] text-zinc-500">수초마다 자동으로 재시도합니다.</p>
                  <button
                    type="button"
                    onClick={manualRetry}
                    className="inline-flex items-center gap-1.5 mt-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-100 bg-zinc-800 border border-zinc-600 hover:bg-zinc-700 touch-manipulation"
                  >
                    <RefreshCw size={14} />
                    지금 다시 시도
                  </button>
                </>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="px-4 py-2.5 border-t border-zinc-800 flex items-center justify-between gap-2 text-[11px] text-zinc-500">
          <span>한 번에 하나의 라이브만 재생됩니다. 닫으면 스트림이 해제됩니다.</span>
          {streamUrl ? (
            <span className="font-mono truncate max-w-[40%] opacity-60" title={streamUrl}>
              HLS
            </span>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
