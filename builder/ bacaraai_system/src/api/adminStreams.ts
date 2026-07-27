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

export type AdminStreamSettings = {
  ok: boolean;
  enabled: boolean;
  media_origin: string;
  player_template: string;
  hls_template: string;
  webrtc_template: string;
  alert_webhook: string;
  alert_offline_sec: number;
  watchdog_key_set: boolean;
  mediamtx_api: string;
  latency_hls_sec: number;
  latency_webrtc_sec: number;
  config_file_exists: boolean;
  publish_keys: Record<
    string,
    { publish_key: string; is_custom: boolean; obs_server: string }
  >;
  message?: string;
};

async function postAdminStreamAction(
  token: string,
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const res = await fetch(PLATFORM_LINKS.adminStreams, {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token, ...body }),
  });
  const data = (await res.json()) as { ok?: boolean; message?: string };
  if (!res.ok || !data.ok) {
    throw new Error(data.message || '요청 실패');
  }
  return data as Record<string, unknown>;
}

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

export async function fetchAdminStreamSettings(): Promise<AdminStreamSettings> {
  const res = await fetch(`${PLATFORM_LINKS.adminStreams}?action=settings`, {
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });
  const data = (await res.json()) as AdminStreamSettings;
  if (!res.ok || !data.ok) {
    throw new Error(data.message || '설정을 불러오지 못했습니다.');
  }
  return data;
}

export async function refreshAdminStreams(
  token: string,
  tableName?: string,
): Promise<AdminStreamOverview | { ok: boolean; status?: unknown }> {
  return postAdminStreamAction(token, {
    action: 'refresh',
    table_name: tableName || '',
  }) as Promise<AdminStreamOverview>;
}

export async function saveAdminStreamSettings(
  token: string,
  patch: Partial<{
    enabled: boolean;
    webrtc_template: string;
    alert_webhook: string;
    alert_offline_sec: number;
    watchdog_key: string;
    mediamtx_api: string;
    latency_hls_sec: number;
    latency_webrtc_sec: number;
  }>,
): Promise<AdminStreamSettings> {
  return postAdminStreamAction(token, {
    action: 'save_settings',
    ...patch,
  }) as Promise<AdminStreamSettings>;
}

export async function regenAdminPublishKey(
  token: string,
  tableName: string,
): Promise<{ publish_key: string; obs_server: string; message?: string }> {
  const data = await postAdminStreamAction(token, {
    action: 'regen_publish_key',
    table_name: tableName,
  });
  return {
    publish_key: String(data.publish_key || ''),
    obs_server: String(data.obs_server || ''),
    message: data.message ? String(data.message) : undefined,
  };
}

export async function clearAdminPublishKey(
  token: string,
  tableName: string,
): Promise<{ publish_key: string; obs_server: string; message?: string }> {
  const data = await postAdminStreamAction(token, {
    action: 'clear_publish_key',
    table_name: tableName,
  });
  return {
    publish_key: String(data.publish_key || ''),
    obs_server: String(data.obs_server || ''),
    message: data.message ? String(data.message) : undefined,
  };
}

export async function setAdminPublishKey(
  token: string,
  tableName: string,
  publishKey: string,
): Promise<{ publish_key: string; obs_server: string; message?: string }> {
  const data = await postAdminStreamAction(token, {
    action: 'set_publish_key',
    table_name: tableName,
    publish_key: publishKey,
  });
  return {
    publish_key: String(data.publish_key || ''),
    obs_server: String(data.obs_server || ''),
    message: data.message ? String(data.message) : undefined,
  };
}
