import { PLATFORM_LINKS } from '../constants';
import type { StreamPlayMode } from '../utils/liveStreamUrl';
import { normalizeStreamKey } from '../utils/liveStreamUrl';

export type StreamViewerSession = {
  ok: boolean;
  table_name: string;
  mode: StreamPlayMode;
  player_url: string;
  hls_url?: string;
  webrtc_url?: string;
  viewer_token: string;
  expires_at: number;
  ttl: number;
  publish_key_configured?: boolean;
  latency_sec: number;
  status?: {
    online: boolean;
    checked_at: number;
    last_online_at: number | null;
    offline_sec: number;
  };
  sync?: {
    note: string;
    expected_delay_sec: number;
  };
  message?: string;
};

export async function fetchStreamViewerSession(
  tableCode: string,
  mode: StreamPlayMode = 'hls',
): Promise<StreamViewerSession> {
  const code = normalizeStreamKey(tableCode);
  const q = new URLSearchParams({ table_name: code, mode });
  const res = await fetch(`${PLATFORM_LINKS.streamViewer}?${q}`, {
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });
  const data = (await res.json()) as StreamViewerSession;
  if (!res.ok || !data.ok) {
    throw new Error(data.message || '시청 세션을 발급받지 못했습니다.');
  }
  return data;
}
