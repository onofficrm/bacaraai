/** 운영 중계: STREAM_KEY = 테이블 gameCode */
export const LIVE_MEDIA_ORIGIN = 'https://media.aitablelive.com';

export function normalizeStreamKey(gameCode: string): string {
  return String(gameCode || '')
    .trim()
    .toUpperCase();
}

/** MediaMTX 공식 HLS 플레이어 페이지 (iframe용) */
export function buildTablePlayerUrl(gameCode: string): string {
  const key = normalizeStreamKey(gameCode);
  if (!key) return '';
  return `${LIVE_MEDIA_ORIGIN}/${encodeURIComponent(key)}/`;
}

/** HLS 플레이리스트 (참고/설정용 — 팝업 재생에는 사용하지 않음) */
export function buildTableHlsUrl(gameCode: string): string {
  const key = normalizeStreamKey(gameCode);
  if (!key) return '';
  return `${LIVE_MEDIA_ORIGIN}/${encodeURIComponent(key)}/index.m3u8`;
}
