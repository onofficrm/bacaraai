import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Hls from 'hls.js';
import { Radio, X, AlertTriangle, Loader2 } from 'lucide-react';
import { playSfx } from '../audio/sfxEngine';
import { fetchTableStreamUrl } from '../api/liveStreams';

type Props = {
  open: boolean;
  tableName: string;
  tableCode: string;
  onClose: () => void;
};

function canNativeHls(video: HTMLVideoElement) {
  return video.canPlayType('application/vnd.apple.mpegurl') !== '';
}

export default function LiveStreamModal({ open, tableName, tableCode, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [streamUrl, setStreamUrl] = useState('');

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

    let cancelled = false;
    const video = videoRef.current;

    const cleanupPlayer = () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (video) {
        video.pause();
        video.removeAttribute('src');
        video.load();
      }
    };

    const start = async () => {
      setLoading(true);
      setError(null);
      setStreamUrl('');
      cleanupPlayer();
      try {
        const info = await fetchTableStreamUrl(tableCode);
        if (cancelled) return;
        if (!info.available || !info.stream_url) {
          setError(
            '이 테이블 라이브 주소가 아직 설정되지 않았습니다. 관리자 설정(data/bacaraai-streams.config.php)을 확인하세요.',
          );
          setLoading(false);
          return;
        }
        setStreamUrl(info.stream_url);
        const el = videoRef.current;
        if (!el) {
          setLoading(false);
          return;
        }

        const onReady = () => {
          if (cancelled) return;
          setLoading(false);
          void el.play().catch(() => {
            /* 자동재생 정책 — 사용자가 재생 버튼 누름 */
          });
        };

        if (Hls.isSupported()) {
          const hls = new Hls({
            enableWorker: true,
            lowLatencyMode: true,
            backBufferLength: 30,
          });
          hlsRef.current = hls;
          hls.loadSource(info.stream_url);
          hls.attachMedia(el);
          hls.on(Hls.Events.MANIFEST_PARSED, onReady);
          hls.on(Hls.Events.ERROR, (_e, data) => {
            if (!data.fatal || cancelled) return;
            setError('라이브 재생에 실패했습니다. 잠시 후 다시 시도해 주세요.');
            setLoading(false);
          });
        } else if (canNativeHls(el)) {
          el.src = info.stream_url;
          el.addEventListener('loadedmetadata', onReady, { once: true });
          el.addEventListener(
            'error',
            () => {
              if (cancelled) return;
              setError('라이브 재생에 실패했습니다.');
              setLoading(false);
            },
            { once: true },
          );
        } else {
          setError('이 브라우저에서는 HLS 라이브를 재생할 수 없습니다.');
          setLoading(false);
        }
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : '스트림을 불러오지 못했습니다.');
        setLoading(false);
      }
    };

    void start();
    return () => {
      cancelled = true;
      cleanupPlayer();
    };
  }, [open, tableCode]);

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
        className="w-full sm:max-w-3xl rounded-t-2xl sm:rounded-2xl border border-zinc-700 bg-zinc-950 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-zinc-800">
          <div className="min-w-0">
            <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-rose-400/90 flex items-center gap-1.5">
              <Radio size={12} className="animate-pulse" />
              LIVE
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
            muted={false}
            autoPlay
          />
          {loading && !error ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/50 text-zinc-200">
              <Loader2 className="animate-spin" size={28} />
              <p className="text-sm">라이브 연결 중…</p>
            </div>
          ) : null}
          {error ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center bg-zinc-950">
              <AlertTriangle className="text-amber-400" size={28} />
              <p className="text-sm text-zinc-200 leading-relaxed max-w-md">{error}</p>
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
