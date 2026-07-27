import { useCallback, useEffect, useState } from 'react';
import { Radio, RefreshCw, Copy, ExternalLink, AlertTriangle } from 'lucide-react';
import {
  fetchAdminStreamOverview,
  refreshAdminStreams,
  type AdminStreamRow,
} from '../../api/adminStreams';
import { fetchAdminToken } from '../../api/adminLive';
import { playSfx } from '../../audio/sfxEngine';

type Props = {
  selectedCode?: string;
  onPreview: (tableCode: string) => void;
};

function fmtAge(ts: number | null | undefined) {
  if (!ts) return '—';
  const sec = Math.max(0, Math.floor(Date.now() / 1000 - ts));
  if (sec < 60) return `${sec}s 전`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m 전`;
  return `${Math.floor(sec / 3600)}h 전`;
}

export default function AdminStreamConsole({ selectedCode, onPreview }: Props) {
  const [rows, setRows] = useState<AdminStreamRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [webhookSet, setWebhookSet] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminStreamOverview(force);
      setRows(data.tables || []);
      setWebhookSet(Boolean(data.alert_webhook_set));
    } catch (e) {
      setError(e instanceof Error ? e.message : '로드 실패');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(false);
    const id = window.setInterval(() => void load(false), 20_000);
    return () => window.clearInterval(id);
  }, [load]);

  const forceRefresh = async () => {
    playSfx('ui');
    try {
      const token = await fetchAdminToken();
      await refreshAdminStreams(token);
      await load(true);
      setMsg('전체 상태 강제 갱신 완료');
      window.setTimeout(() => setMsg(null), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : '갱신 실패');
    }
  };

  const copyText = async (text: string) => {
    playSfx('ui');
    try {
      await navigator.clipboard.writeText(text);
      setMsg('클립보드에 복사됨');
      window.setTimeout(() => setMsg(null), 1800);
    } catch {
      setMsg(text);
    }
  };

  const offlineCount = rows.filter((r) => !r.online).length;

  return (
    <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
      <div className="px-3 py-2.5 border-b border-zinc-800 flex items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold tracking-[0.16em] uppercase text-rose-400/90 flex items-center gap-1">
            <Radio size={11} />
            스트림 관제
          </p>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            {loading ? '조회 중…' : `ONLINE ${rows.length - offlineCount}/${rows.length}`}
            {webhookSet ? ' · 알림훅 ON' : ' · 알림훅 OFF'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void forceRefresh()}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold text-zinc-200 border border-zinc-700 hover:bg-zinc-800"
        >
          <RefreshCw size={12} />
          강제 갱신
        </button>
      </div>

      {msg ? (
        <div className="px-3 py-1.5 text-[11px] text-emerald-300 bg-emerald-500/10 border-b border-emerald-500/20">
          {msg}
        </div>
      ) : null}
      {error ? (
        <div className="px-3 py-1.5 text-[11px] text-rose-300 bg-rose-500/10 border-b border-rose-500/20 flex items-center gap-1">
          <AlertTriangle size={12} />
          {error}
        </div>
      ) : null}

      <ul className="max-h-[320px] overflow-y-auto custom-scrollbar divide-y divide-zinc-800/80">
        {rows.map((row) => {
          const selected = row.table_name === selectedCode;
          return (
            <li
              key={row.table_name}
              className={`px-3 py-2 ${selected ? 'bg-amber-500/5' : ''}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`inline-block w-1.5 h-1.5 rounded-full ${
                        row.online ? 'bg-emerald-400' : 'bg-zinc-600'
                      }`}
                    />
                    <span className="text-xs font-bold text-zinc-100 font-mono">
                      {row.table_name}
                    </span>
                    <span
                      className={`text-[10px] font-bold ${
                        row.online ? 'text-emerald-400' : 'text-zinc-500'
                      }`}
                    >
                      {row.online ? 'LIVE' : 'OFF'}
                    </span>
                    {row.publish_key_is_public ? (
                      <span className="text-[9px] text-amber-400/90 border border-amber-500/30 rounded px-1">
                        공개키
                      </span>
                    ) : (
                      <span className="text-[9px] text-zinc-500 border border-zinc-700 rounded px-1">
                        비밀키
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-0.5 truncate">
                    키 {row.publish_key_masked} · 수신 {fmtAge(row.last_online_at)}
                    {!row.online && row.offline_sec > 0 ? ` · OFF ${row.offline_sec}s` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    type="button"
                    title="OBS URL 복사"
                    onClick={() => void copyText(row.obs_server_hint)}
                    className="p-1.5 rounded text-zinc-400 hover:text-white hover:bg-zinc-800"
                  >
                    <Copy size={13} />
                  </button>
                  <button
                    type="button"
                    title="미리보기"
                    onClick={() => {
                      playSfx('ui');
                      onPreview(row.table_name);
                    }}
                    className="p-1.5 rounded text-zinc-400 hover:text-rose-300 hover:bg-zinc-800"
                  >
                    <ExternalLink size={13} />
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="px-3 py-2 text-[10px] text-zinc-600 leading-relaxed border-t border-zinc-800">
        publish_keys 를 config에 넣으면 OBS 경로와 공개 gameCode가 분리됩니다. offline{' '}
        {`>`} 설정초면 alert_webhook / 로그로 알림합니다.
      </p>
    </div>
  );
}
