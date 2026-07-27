import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Radio, X, RefreshCw } from 'lucide-react';
import { playSfx } from '../audio/sfxEngine';
import { buildTablePlayerUrl } from '../utils/liveStreamUrl';

type Props = {
  open: boolean;
  tableName: string;
  tableCode: string;
  onClose: () => void;
};

/**
 * MediaMTX 공식 HLS HTML 플레이어를 iframe으로 표시.
 * 자체 HLS.js / m3u8 probe / 자동 재연결은 사용하지 않음.
 */
export default function LiveStreamModal({ open, tableName, tableCode, onClose }: Props) {
  const [iframeKey, setIframeKey] = useState(0);

  const playerUrl = useMemo(() => buildTablePlayerUrl(tableCode), [tableCode]);

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

  // 팝업을 새로 열 때만 iframe을 한 번 마운트 (자동 재생성 없음)
  useEffect(() => {
    if (open) setIframeKey((k) => k + 1);
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
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => {
                playSfx('ui');
                setIframeKey((k) => k + 1);
              }}
              className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 touch-manipulation"
              aria-label="새로고침"
              title="플레이어 새로고침"
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
          {playerUrl ? (
            <iframe
              key={iframeKey}
              src={playerUrl}
              title={`${tableName} 라이브 플레이어`}
              className="absolute inset-0 w-full h-full border-0 bg-black"
              allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-zinc-400">
              테이블 코드를 확인할 수 없습니다.
            </div>
          )}
        </div>

        <div className="px-4 py-2.5 border-t border-zinc-800 flex items-center justify-between gap-2 text-[11px] text-zinc-500">
          <span>한 번에 하나의 라이브만 재생됩니다. 닫으면 스트림이 해제됩니다.</span>
          <span className="font-mono truncate max-w-[40%] opacity-60" title={playerUrl}>
            MediaMTX
          </span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
