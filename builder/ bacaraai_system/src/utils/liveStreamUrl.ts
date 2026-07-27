/** 운영 중계: STREAM_KEY = 테이블 gameCode */
export const LIVE_MEDIA_ORIGIN = 'https://media.aitablelive.com';

export function normalizeStreamKey(gameCode: string): string {
  return String(gameCode || '')
    .trim()
    .toUpperCase();
}

/** https://media.aitablelive.com/{gameCode}/index.m3u8 */
export function buildTableHlsUrl(gameCode: string): string {
  const key = normalizeStreamKey(gameCode);
  if (!key) return '';
  return `${LIVE_MEDIA_ORIGIN}/${encodeURIComponent(key)}/index.m3u8`;
}

/** 플레이리스트가 실제로 응답하는지 확인 (OBS 송출 여부) */
export async function probeHlsPlaylist(
  url: string,
  signal?: AbortSignal,
): Promise<{ ok: boolean; status: number }> {
  if (!url) return { ok: false, status: 0 };
  try {
    const res = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      cache: 'no-store',
      signal,
      headers: { Accept: 'application/vnd.apple.mpegurl,application/x-mpegURL,*/*' },
    });
    if (!res.ok) return { ok: false, status: res.status };
    const text = await res.text();
    const ok = text.includes('#EXTM3U');
    return { ok, status: res.status };
  } catch {
    return { ok: false, status: 0 };
  }
}
