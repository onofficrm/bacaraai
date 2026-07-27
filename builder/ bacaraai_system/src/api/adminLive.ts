export const ADMIN_LIVE_API = '/plugin/bacara_wallet/api/admin_live.php';

export type AdminLiveRow = {
  id: number;
  table_name: string;
  game_no?: number | null;
  result: 'P' | 'B' | 'T';
  detected_at: string;
};

export type AdminLivePayload = {
  ok: boolean;
  table_name?: string;
  game_no?: number | null;
  latest_id?: number | null;
  latest_detected_at?: string | null;
  count?: number;
  manual_mode?: boolean;
  shuffle_active?: boolean;
  results?: AdminLiveRow[];
};

export type AdminTableOverview = {
  table_name: string;
  manual_mode: boolean;
  shuffle_active: boolean;
  game_no: number;
  latest_result: 'P' | 'B' | 'T' | null;
  count: number;
  updated_at: string | null;
  updated_by: string;
};

export type AdminAuditRow = {
  action: string;
  detail: string;
  admin_mb_id: string;
  created_at: string;
};

async function readJson<T>(res: Response): Promise<T> {
  const data = (await res.json()) as T & { message?: string };
  if (!res.ok) {
    throw new Error((data as { message?: string }).message || `HTTP ${res.status}`);
  }
  return data;
}

export async function fetchAdminOverview(): Promise<AdminTableOverview[]> {
  const res = await fetch(`${ADMIN_LIVE_API}?action=overview`, {
    credentials: 'same-origin',
    cache: 'no-store',
  });
  const data = await readJson<{ ok: boolean; tables: AdminTableOverview[] }>(res);
  return data.tables || [];
}

export async function fetchAdminState(tableName: string): Promise<{
  shuffle_active: boolean;
  manual_mode: boolean;
  payload: AdminLivePayload;
  audit: AdminAuditRow[];
}> {
  const q = new URLSearchParams({ action: 'state', table_name: tableName });
  const res = await fetch(`${ADMIN_LIVE_API}?${q}`, {
    credentials: 'same-origin',
    cache: 'no-store',
  });
  const data = await readJson<{
    ok: boolean;
    shuffle_active: boolean;
    manual_mode: boolean;
    payload: AdminLivePayload;
    audit: AdminAuditRow[];
  }>(res);
  return {
    shuffle_active: data.shuffle_active,
    manual_mode: data.manual_mode,
    payload: data.payload,
    audit: data.audit || [],
  };
}

export async function postAdminAction(
  action: 'add_result' | 'undo_last' | 'new_game' | 'set_shuffle',
  body: Record<string, string>,
): Promise<{ ok: boolean; message?: string; payload?: AdminLivePayload }> {
  const token =
    typeof window !== 'undefined' && typeof (window as Window & { get_ajax_token?: () => string }).get_ajax_token === 'function'
      ? (window as Window & { get_ajax_token: () => string }).get_ajax_token()
      : '';

  const form = new URLSearchParams({ action, token, ...body });
  const res = await fetch(ADMIN_LIVE_API, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
    body: form.toString(),
  });
  const data = await readJson<{ ok: boolean; message?: string; payload?: AdminLivePayload }>(res);
  if (!data.ok) {
    throw new Error(data.message || '요청 실패');
  }
  return data;
}
