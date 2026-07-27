import { useEffect, useState } from 'react';
import { fetchAllStreamStatuses, type StreamStatus } from '../api/streamStatus';

const POLL_MS = 15_000;

/**
 * 서버 캐시 기반 방송 상태. 브라우저에서 m3u8을 직접 probe 하지 않음.
 */
export default function useStreamStatusMap(enabled = true) {
  const [statuses, setStatuses] = useState<Record<string, StreamStatus>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    const load = async () => {
      try {
        setLoading(true);
        const map = await fetchAllStreamStatuses(false);
        if (cancelled) return;
        setStatuses(map);
        setError(null);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : '상태 조회 실패');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    const id = window.setInterval(() => void load(), POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [enabled]);

  return { statuses, error, loading };
}
