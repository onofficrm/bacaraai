export const ADMIN_LIVE_API = '/plugin/bacara_wallet/api/admin_live.php';
export const ADMIN_TOKEN_API = '/plugin/bacara_wallet/admin/ajax.token.php';

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
  source?: string;
  manual_mode?: boolean;
  shuffle_active?: boolean;
  results?: AdminLiveRow[];
  detector_error?: string;
};

export type AdminTableOverview = {
  table_name: string;
  manual_mode: boolean;
  shuffle_active: boolean;
  source?: 'admin' | 'detector' | string;
  game_no: number;
  latest_result: 'P' | 'B' | 'T' | null;
  latest_id?: number | null;
  latest_detected_at?: string | null;
  count: number;
  player?: number;
  banker?: number;
  tie?: number;
  results?: AdminLiveRow[];
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
  const text = await res.text();
  let data: T & { message?: string; error?: string };
  try {
    data = JSON.parse(text) as T & { message?: string; error?: string };
  } catch {
    throw new Error(
      res.ok
        ? '응답을 해석할 수 없습니다.'
        : `요청 실패 (HTTP ${res.status}) — 로그인/권한을 확인하세요.`,
    );
  }
  if (!res.ok) {
    throw new Error(data.message || data.error || `HTTP ${res.status}`);
  }
  return data;
}

export async function fetchAdminToken(): Promise<string> {
  if (typeof window === 'undefined') return '';

  const w = window as Window & {
    get_ajax_token?: () => string;
    g5_admin_csrf_token_key?: string;
  };

  // 그누보드/부트스트랩 동기 토큰 우선
  if (typeof w.get_ajax_token === 'function') {
    try {
      const t = w.get_ajax_token();
      if (t) return t;
    } catch {
      /* fall through */
    }
  }

  const key =
    typeof w.g5_admin_csrf_token_key === 'string' ? w.g5_admin_csrf_token_key : '';
  const body = new URLSearchParams({ admin_csrf_token_key: key });
  const res = await fetch(ADMIN_TOKEN_API, {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: body.toString(),
    cache: 'no-store',
  });
  const data = await readJson<{ error?: string; token?: string }>(res);
  if (data.error) {
    throw new Error(data.error);
  }
  return data.token || '';
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
  action: 'add_result' | 'undo_last' | 'new_game' | 'set_shuffle' | 'resume_auto',
  body: Record<string, string>,
): Promise<{ ok: boolean; message?: string; payload?: AdminLivePayload }> {
  const token = await fetchAdminToken();
  if (!token) {
    throw new Error('관리자 토큰을 받지 못했습니다. 페이지를 새로고침하세요.');
  }

  const form = new URLSearchParams({ action, token, ...body });
  const res = await fetch(ADMIN_LIVE_API, {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: form.toString(),
  });
  const data = await readJson<{ ok: boolean; message?: string; payload?: AdminLivePayload }>(
    res,
  );
  if (!data.ok) {
    throw new Error(data.message || '요청 실패');
  }
  return data;
}
