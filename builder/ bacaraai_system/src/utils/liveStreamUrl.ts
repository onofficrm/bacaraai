/** 운영 중계 origin (표시·문서용 — 실제 재생 URL은 서버 API에서만 발급) */
export const LIVE_MEDIA_ORIGIN = 'https://media.aitablelive.com';

export function normalizeStreamKey(gameCode: string): string {
  return String(gameCode || '')
    .trim()
    .toUpperCase();
}

/** @deprecated 클라이언트에서 직접 쓰지 마세요. stream_viewer API 사용 */
export function buildTablePlayerUrl(gameCode: string): string {
  const key = normalizeStreamKey(gameCode);
  if (!key) return '';
  return `${LIVE_MEDIA_ORIGIN}/${encodeURIComponent(key)}/`;
}

/** @deprecated HLS 직접 재생 금지 — 참고용 */
export function buildTableHlsUrl(gameCode: string): string {
  const key = normalizeStreamKey(gameCode);
  if (!key) return '';
  return `${LIVE_MEDIA_ORIGIN}/${encodeURIComponent(key)}/index.m3u8`;
}

export type StreamPlayMode = 'hls' | 'webrtc';

const MUTE_KEY = 'bacara.live.muted';
const MODE_KEY = 'bacara.live.mode';

export function loadLiveMutePref(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

export function saveLiveMutePref(muted: boolean) {
  try {
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  } catch {
    /* ignore */
  }
}

export function loadLiveModePref(): StreamPlayMode {
  try {
    return localStorage.getItem(MODE_KEY) === 'webrtc' ? 'webrtc' : 'hls';
  } catch {
    return 'hls';
  }
}

export function saveLiveModePref(mode: StreamPlayMode) {
  try {
    localStorage.setItem(MODE_KEY, mode);
  } catch {
    /* ignore */
  }
}
