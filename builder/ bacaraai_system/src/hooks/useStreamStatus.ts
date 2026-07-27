import { useEffect, useState } from 'react';
import { fetchAllStreamStatuses, type StreamStatus } from '../api/streamStatus';

/** 서버 맵 캐시(~12–15s)보다 약간 길게 — 불필요 요청 감소 */
const POLL_MS = 25_000;
const JITTER_MS = 5_000;

/**
 * 서버 캐시 기반 방송 상태. 브라우저에서 m3u8을 직접 probe 하지 않음.
 * 요청 시각에 지터를 두어 50명 동시 만료 폭주를 완화합니다.
 */
export default function useStreamStatusMap(enabled = true) {
  const [statuses, setStatuses] = useState<Record<string, StreamStatus>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let intervalId = 0;
    let startTimer = 0;

    const load = async (isFirst = false) => {
      try {
        if (isFirst) setLoading(true);
        const map = await fetchAllStreamStatuses(false);
        if (cancelled) return;
        setStatuses(map);
        setError(null);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : '상태 조회 실패');
      } finally {
        if (!cancelled && isFirst) setLoading(false);
      }
    };

    const jitter = Math.floor(Math.random() * JITTER_MS);
    startTimer = window.setTimeout(() => {
      void load(true);
      intervalId = window.setInterval(() => void load(false), POLL_MS);
    }, jitter);

    return () => {
      cancelled = true;
      window.clearTimeout(startTimer);
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [enabled]);

  return { statuses, error, loading };
}
