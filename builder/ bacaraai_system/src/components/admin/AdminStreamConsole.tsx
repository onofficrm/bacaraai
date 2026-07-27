import { useCallback, useEffect, useState } from 'react';
import {
  Radio,
  RefreshCw,
  Copy,
  ExternalLink,
  AlertTriangle,
  KeyRound,
  Settings2,
  RotateCcw,
} from 'lucide-react';
import {
  clearAdminPublishKey,
  fetchAdminStreamOverview,
  fetchAdminStreamSettings,
  regenAdminPublishKey,
  refreshAdminStreams,
  saveAdminStreamSettings,
  type AdminStreamRow,
  type AdminStreamSettings,
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
  const [settings, setSettings] = useState<AdminStreamSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [webhook, setWebhook] = useState('');
  const [offlineSec, setOfflineSec] = useState(90);
  const [webrtcTpl, setWebrtcTpl] = useState('');
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Record<string, string>>({});

  const flash = (text: string) => {
    setMsg(text);
    window.setTimeout(() => setMsg(null), 2800);
  };

  const load = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const [data, st] = await Promise.all([
        fetchAdminStreamOverview(force),
        fetchAdminStreamSettings(),
      ]);
      setRows(data.tables || []);
      setSettings(st);
      setWebhook(st.alert_webhook || '');
      setOfflineSec(st.alert_offline_sec || 90);
      setWebrtcTpl(st.webrtc_template || '');
      const nextReveal: Record<string, string> = {};
      Object.entries(st.publish_keys || {}).forEach(([code, info]) => {
        nextReveal[code] = info.publish_key;
      });
      setRevealed(nextReveal);
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
      flash('전체 상태 강제 갱신 완료');
    } catch (e) {
      setError(e instanceof Error ? e.message : '갱신 실패');
    }
  };

  const copyText = async (text: string) => {
    playSfx('ui');
    try {
      await navigator.clipboard.writeText(text);
      flash('클립보드에 복사됨');
    } catch {
      flash(text);
    }
  };

  const saveSettings = async () => {
    playSfx('ui');
    try {
      const token = await fetchAdminToken();
      await saveAdminStreamSettings(token, {
        alert_webhook: webhook.trim(),
        alert_offline_sec: offlineSec,
        webrtc_template: webrtcTpl.trim(),
      });
      await load(false);
      flash('운영 설정 저장됨');
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장 실패');
    }
  };

  const regenKey = async (code: string) => {
    if (
      !window.confirm(
        `${code} 송출 키를 재발급할까요?\nOBS 스트림 경로를 새 키로 바꿔야 방송이 이어집니다.`,
      )
    ) {
      return;
    }
    playSfx('ui');
    setBusyKey(code);
    try {
      const token = await fetchAdminToken();
      const res = await regenAdminPublishKey(token, code);
      setRevealed((prev) => ({ ...prev, [code]: res.publish_key }));
      await load(false);
      flash(res.message || `${code} 키 재발급`);
      if (res.obs_server) await copyText(res.obs_server);
    } catch (e) {
      setError(e instanceof Error ? e.message : '키 재발급 실패');
    } finally {
      setBusyKey(null);
    }
  };

  const clearKey = async (code: string) => {
    if (!window.confirm(`${code} 비밀 키를 제거하고 gameCode 경로로 되돌릴까요?`)) return;
    playSfx('ui');
    setBusyKey(code);
    try {
      const token = await fetchAdminToken();
      const res = await clearAdminPublishKey(token, code);
      await load(false);
      flash(res.message || '공개 키로 복원');
    } catch (e) {
      setError(e instanceof Error ? e.message : '복원 실패');
    } finally {
      setBusyKey(null);
    }
  };

  const offlineCount = rows.filter((r) => !r.online).length;
  const webhookSet = Boolean(settings?.alert_webhook);

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
            {settings && !settings.config_file_exists ? ' · config 미생성' : ''}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              playSfx('ui');
              setShowSettings((v) => !v);
            }}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold text-zinc-200 border border-zinc-700 hover:bg-zinc-800"
          >
            <Settings2 size={12} />
            설정
          </button>
          <button
            type="button"
            onClick={() => void forceRefresh()}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold text-zinc-200 border border-zinc-700 hover:bg-zinc-800"
          >
            <RefreshCw size={12} />
            갱신
          </button>
        </div>
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

      {showSettings ? (
        <div className="px-3 py-3 border-b border-zinc-800 space-y-2 bg-zinc-950/40">
          <label className="block text-[10px] text-zinc-500 font-bold uppercase tracking-wide">
            Alert webhook
            <input
              value={webhook}
              onChange={(e) => setWebhook(e.target.value)}
              placeholder="https://hooks.slack.com/..."
              className="mt-1 w-full rounded-md bg-zinc-900 border border-zinc-700 px-2 py-1.5 text-xs text-zinc-100"
            />
          </label>
          <label className="block text-[10px] text-zinc-500 font-bold uppercase tracking-wide">
            Offline 알림 (초)
            <input
              type="number"
              min={30}
              max={3600}
              value={offlineSec}
              onChange={(e) => setOfflineSec(Number(e.target.value) || 90)}
              className="mt-1 w-full rounded-md bg-zinc-900 border border-zinc-700 px-2 py-1.5 text-xs text-zinc-100"
            />
          </label>
          <label className="block text-[10px] text-zinc-500 font-bold uppercase tracking-wide">
            WebRTC player template
            <input
              value={webrtcTpl}
              onChange={(e) => setWebrtcTpl(e.target.value)}
              placeholder="https://media…:8889/{PUBLISH_KEY}/"
              className="mt-1 w-full rounded-md bg-zinc-900 border border-zinc-700 px-2 py-1.5 text-xs text-zinc-100 font-mono"
            />
          </label>
          <button
            type="button"
            onClick={() => void saveSettings()}
            className="w-full py-1.5 rounded-md text-xs font-bold bg-amber-500/20 text-amber-200 border border-amber-500/40 hover:bg-amber-500/30"
          >
            설정 저장 (data/bacaraai-streams.config.php)
          </button>
        </div>
      ) : null}

      <ul className="max-h-[360px] overflow-y-auto custom-scrollbar divide-y divide-zinc-800/80">
        {rows.map((row) => {
          const selected = row.table_name === selectedCode;
          const fullKey = revealed[row.table_name] || row.publish_key_masked;
          const obs =
            settings?.publish_keys?.[row.table_name]?.obs_server || row.obs_server_hint;
          return (
            <li
              key={row.table_name}
              className={`px-3 py-2 ${selected ? 'bg-amber-500/5' : ''}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
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
                  <p className="text-[10px] text-zinc-500 mt-0.5 truncate font-mono" title={fullKey}>
                    {fullKey} · 수신 {fmtAge(row.last_online_at)}
                    {!row.online && row.offline_sec > 0 ? ` · OFF ${row.offline_sec}s` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    type="button"
                    title="키 재발급"
                    disabled={busyKey === row.table_name}
                    onClick={() => void regenKey(row.table_name)}
                    className="p-1.5 rounded text-zinc-400 hover:text-amber-300 hover:bg-zinc-800 disabled:opacity-40"
                  >
                    <KeyRound size={13} />
                  </button>
                  {!row.publish_key_is_public ? (
                    <button
                      type="button"
                      title="공개 키로 복원"
                      disabled={busyKey === row.table_name}
                      onClick={() => void clearKey(row.table_name)}
                      className="p-1.5 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-40"
                    >
                      <RotateCcw size={13} />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    title="OBS URL 복사"
                    onClick={() => void copyText(obs)}
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
        키 재발급 후 OBS 서버 URL을 새 경로로 바꿔야 합니다. 설정 저장 시{' '}
        <code className="text-zinc-500">data/bacaraai-streams.config.php</code> 가 생성·갱신됩니다.
      </p>
    </div>
  );
}
