import { PLATFORM_LINKS } from '../constants';

export type AdminStreamRow = {
  table_name: string;
  online: boolean;
  checked_at: number;
  last_online_at: number | null;
  offline_sec: number;
  method: string;
  http_status: number;
  publish_key_masked: string;
  publish_key_is_public: boolean;
  obs_server_hint: string;
  player_url: string;
  hls_url: string;
  webrtc_url: string;
};

export type AdminStreamOverview = {
  ok: boolean;
  enabled: boolean;
  media_origin: string;
  alert_webhook_set: boolean;
  tables: AdminStreamRow[];
  generated_at: number;
  message?: string;
};

export async function fetchAdminStreamOverview(force = false): Promise<AdminStreamOverview> {
  const q = force ? '?action=overview&force=1' : '?action=overview';
  const res = await fetch(`${PLATFORM_LINKS.adminStreams}${q}`, {
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });
  const data = (await res.json()) as AdminStreamOverview;
  if (!res.ok || !data.ok) {
    throw new Error(data.message || '스트림 관제 정보를 불러오지 못했습니다.');
  }
  return data;
}

export async function refreshAdminStreams(
  token: string,
  tableName?: string,
): Promise<AdminStreamOverview | { ok: boolean; status?: unknown }> {
  const res = await fetch(PLATFORM_LINKS.adminStreams, {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      token,
      action: 'refresh',
      table_name: tableName || '',
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error(data.message || '새로고침 실패');
  }
  return data;
}
