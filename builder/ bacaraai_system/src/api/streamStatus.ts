import { PLATFORM_LINKS } from '../constants';
import { normalizeStreamKey } from '../utils/liveStreamUrl';

export type StreamStatus = {
  table_name: string;
  online: boolean;
  stalled?: boolean;
  stall_sec?: number;
  bytes_received?: number | null;
  method?: string;
  http_status?: number;
  checked_at: number;
  last_online_at: number | null;
  offline_since?: number | null;
  offline_sec: number;
  latency_hls_sec?: number;
  latency_webrtc_sec?: number;
  cached?: boolean;
  publish_key_set?: boolean;
};

type StatusMapResponse = {
  ok: boolean;
  statuses?: Record<string, StreamStatus>;
  message?: string;
  generated_at?: number;
};

type OneStatusResponse = {
  ok: boolean;
  status?: StreamStatus;
  message?: string;
};

export async function fetchAllStreamStatuses(force = false): Promise<Record<string, StreamStatus>> {
  const q = force ? '?force=1' : '';
  const res = await fetch(`${PLATFORM_LINKS.streamStatus}${q}`, {
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });
  const data = (await res.json()) as StatusMapResponse;
  if (!res.ok || !data.ok) {
    throw new Error(data.message || '방송 상태를 불러오지 못했습니다.');
  }
  return data.statuses || {};
}

export async function fetchTableStreamStatus(
  tableCode: string,
  force = false,
): Promise<StreamStatus | null> {
  const code = normalizeStreamKey(tableCode);
  const q = new URLSearchParams({ table_name: code });
  if (force) q.set('force', '1');
  const res = await fetch(`${PLATFORM_LINKS.streamStatus}?${q}`, {
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });
  const data = (await res.json()) as OneStatusResponse;
  if (!res.ok || !data.ok) return null;
  return data.status || null;
}
