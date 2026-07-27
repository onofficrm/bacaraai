import { PLATFORM_LINKS } from '../constants';
import { buildTableHlsUrl, normalizeStreamKey } from '../utils/liveStreamUrl';

export type LiveStreamInfo = {
  stream_url: string;
  available: boolean;
};

type StreamsMapResponse = {
  ok: boolean;
  enabled?: boolean;
  streams?: Record<string, LiveStreamInfo>;
  message?: string;
};

type OneStreamResponse = {
  ok: boolean;
  enabled?: boolean;
  table_name?: string;
  stream_url?: string;
  available?: boolean;
  message?: string;
};

const cache = new Map<string, { at: number; info: LiveStreamInfo }>();
const CACHE_MS = 15_000;

/** API 또는 기본 규칙으로 HLS URL만 조회 (재생은 MediaMTX iframe 사용) */
export async function fetchTableStreamUrl(tableCode: string): Promise<LiveStreamInfo> {
  const code = normalizeStreamKey(tableCode);
  if (!code) return { stream_url: '', available: false };

  const hit = cache.get(code);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.info;

  const fallbackUrl = buildTableHlsUrl(code);

  try {
    const q = new URLSearchParams({ table_name: code });
    const res = await fetch(`${PLATFORM_LINKS.liveStreams}?${q}`, {
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    const data = (await res.json()) as OneStreamResponse;
    const stream_url = (res.ok && data.ok && data.stream_url) || fallbackUrl;
    const info: LiveStreamInfo = {
      stream_url,
      available: Boolean(stream_url),
    };
    cache.set(code, { at: Date.now(), info });
    return info;
  } catch {
    const info: LiveStreamInfo = { stream_url: fallbackUrl, available: Boolean(fallbackUrl) };
    cache.set(code, { at: Date.now(), info });
    return info;
  }
}

export async function fetchAllStreamMap(): Promise<Record<string, LiveStreamInfo>> {
  const res = await fetch(PLATFORM_LINKS.liveStreams, {
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });
  const data = (await res.json()) as StreamsMapResponse;
  if (!res.ok || !data.ok) {
    throw new Error(data.message || '스트림 목록을 불러오지 못했습니다.');
  }
  const map = data.streams || {};
  Object.entries(map).forEach(([code, info]) => {
    cache.set(code, { at: Date.now(), info });
  });
  return map;
}

export function clearStreamUrlCache() {
  cache.clear();
}
