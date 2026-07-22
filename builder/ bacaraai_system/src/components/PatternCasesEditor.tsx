import { useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import type { PatternCase, PatternTableScope, SessionConfig, TableData } from '../types';
import { playSfx } from '../audio/sfxEngine';
import PatternSequenceBuilder from './PatternSequenceBuilder';
import {
  createEmptyPatternCase,
  formatPattern,
  normalizePatternCases,
  patternSideLabel,
  patternTotalGames,
} from '../utils/patternMatch';

const MAX_CASES = 8;

type Props = {
  config: SessionConfig;
  onChange: (next: Partial<SessionConfig>) => void;
  tables?: TableData[];
  compact?: boolean;
};

function syncLegacy(cases: PatternCase[]): Pick<
  SessionConfig,
  'patternCases' | 'patternSegments' | 'patternBetSide'
> {
  const normalized = normalizePatternCases({ patternCases: cases });
  return {
    patternCases: normalized.patternCases,
    patternSegments: normalized.patternSegments,
    patternBetSide: normalized.patternBetSide,
  };
}

export default function PatternCasesEditor({
  config,
  onChange,
  tables = [],
  compact = false,
}: Props) {
  const cases =
    Array.isArray(config.patternCases) && config.patternCases.length > 0
      ? config.patternCases
      : normalizePatternCases(config).patternCases;
  const [openId, setOpenId] = useState<string | null>(cases[0]?.id ?? null);

  const patchCases = (nextCases: PatternCase[]) => {
    onChange(syncLegacy(nextCases));
  };

  const updateCase = (id: string, partial: Partial<PatternCase>) => {
    patchCases(cases.map((c) => (c.id === id ? { ...c, ...partial } : c)));
  };

  const addCase = () => {
    if (cases.length >= MAX_CASES) return;
    playSfx('ui');
    const next = createEmptyPatternCase(cases.length + 1);
    patchCases([...cases, next]);
    setOpenId(next.id);
  };

  const removeCase = (id: string) => {
    if (cases.length <= 1) return;
    playSfx('ui');
    const next = cases.filter((c) => c.id !== id);
    patchCases(next);
    if (openId === id) setOpenId(next[0]?.id ?? null);
  };

  const setScope = (scope: PatternTableScope) => {
    playSfx('ui');
    onChange({
      patternTableScope: scope,
      patternTableIds: scope === 'all' ? [] : config.patternTableIds || [],
    });
  };

  const toggleTable = (tableId: string) => {
    playSfx('ui');
    const cur = new Set(config.patternTableIds || []);
    if (cur.has(tableId)) cur.delete(tableId);
    else cur.add(tableId);
    onChange({
      patternTableScope: 'selected',
      patternTableIds: Array.from(cur),
    });
  };

  const scope = config.patternTableScope === 'selected' ? 'selected' : 'all';
  const selectedIds = new Set(config.patternTableIds || []);

  return (
    <div className={`flex flex-col ${compact ? 'gap-2.5' : 'gap-3'}`}>
      <div className="flex items-center justify-between gap-2">
        <p className={`${compact ? 'text-[11px]' : 'text-xs'} font-bold text-zinc-400`}>
          패턴 경우 (여러 개 동시 적용)
        </p>
        <button
          type="button"
          disabled={cases.length >= MAX_CASES}
          onClick={addCase}
          className="inline-flex items-center gap-1 min-h-[36px] px-2.5 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-200 text-[11px] font-bold disabled:opacity-40"
        >
          <Plus size={14} />
          경우 추가
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {cases.map((c, idx) => {
          const open = openId === c.id;
          const games = patternTotalGames(c.patternSegments);
          return (
            <div
              key={c.id}
              className={`rounded-xl border overflow-hidden ${
                c.enabled
                  ? 'border-amber-500/30 bg-zinc-950'
                  : 'border-zinc-800 bg-zinc-950/60 opacity-70'
              }`}
            >
              <div className="flex items-center gap-2 px-2.5 py-2">
                <button
                  type="button"
                  onClick={() => {
                    playSfx('ui');
                    updateCase(c.id, { enabled: !c.enabled });
                  }}
                  className={`shrink-0 w-9 h-7 rounded-md text-[10px] font-bold border ${
                    c.enabled
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                      : 'bg-zinc-900 border-zinc-700 text-zinc-500'
                  }`}
                >
                  {c.enabled ? 'ON' : 'OFF'}
                </button>
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => {
                    playSfx('ui');
                    setOpenId(open ? null : c.id);
                  }}
                >
                  <p className="text-[12px] font-bold text-zinc-100 truncate">
                    {c.label || `경우${idx + 1}`}
                  </p>
                  <p className="text-[10px] text-zinc-500 truncate">
                    {formatPattern(c.patternSegments)} → {patternSideLabel(c.patternBetSide)}
                    {games > 0 ? ` · ${games}게임` : ''}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playSfx('ui');
                    setOpenId(open ? null : c.id);
                  }}
                  className="p-1.5 text-zinc-500 hover:text-zinc-300"
                  aria-label={open ? '접기' : '펼치기'}
                >
                  {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                <button
                  type="button"
                  disabled={cases.length <= 1}
                  onClick={() => removeCase(c.id)}
                  className="p-1.5 text-zinc-600 hover:text-rose-400 disabled:opacity-30"
                  aria-label="경우 삭제"
                >
                  <Trash2 size={15} />
                </button>
              </div>

              {open && (
                <div className="px-2.5 pb-3 pt-1 border-t border-zinc-800/80 flex flex-col gap-2.5">
                  <div>
                    <label className="text-[10px] text-zinc-500 font-bold">이름</label>
                    <input
                      type="text"
                      value={c.label}
                      maxLength={24}
                      onChange={(e) => updateCase(c.id, { label: e.target.value })}
                      className="mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-2 text-sm text-zinc-100 outline-none focus:border-amber-500/50"
                      placeholder={`경우${idx + 1}`}
                    />
                  </div>

                  <PatternSequenceBuilder
                    segments={c.patternSegments}
                    onChange={(patternSegments) => updateCase(c.id, { patternSegments })}
                  />

                  <div>
                    <p className="text-[11px] font-bold text-zinc-400 mb-1.5">
                      이 경우 다음 게임 베팅
                    </p>
                    <div className="flex gap-1.5">
                      {(
                        [
                          {
                            id: 'PLAYER' as const,
                            label: 'Player',
                            on: 'bg-blue-600 border-blue-400 text-white',
                          },
                          {
                            id: 'TIE' as const,
                            label: 'Tie',
                            on: 'bg-emerald-500 border-emerald-400 text-white',
                          },
                          {
                            id: 'BANKER' as const,
                            label: 'Banker',
                            on: 'bg-red-500 border-red-400 text-white',
                          },
                        ] as const
                      ).map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            playSfx('ui');
                            updateCase(c.id, { patternBetSide: opt.id });
                          }}
                          className={`flex-1 min-h-[40px] rounded-lg border text-xs font-bold ${
                            c.patternBetSide === opt.id
                              ? opt.on
                              : 'bg-zinc-900 border-zinc-700 text-zinc-400'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
        <p className={`${compact ? 'text-[11px]' : 'text-xs'} font-bold text-zinc-400 mb-2`}>
          적용 테이블
        </p>
        <div className="grid grid-cols-2 gap-1.5 mb-2">
          <button
            type="button"
            onClick={() => setScope('all')}
            className={`py-2.5 rounded-lg border text-xs font-bold ${
              scope === 'all'
                ? 'bg-amber-500 border-amber-300 text-zinc-950'
                : 'bg-zinc-900 border-zinc-700 text-zinc-400'
            }`}
          >
            전체 적용
          </button>
          <button
            type="button"
            onClick={() => setScope('selected')}
            className={`py-2.5 rounded-lg border text-xs font-bold ${
              scope === 'selected'
                ? 'bg-amber-500 border-amber-300 text-zinc-950'
                : 'bg-zinc-900 border-zinc-700 text-zinc-400'
            }`}
          >
            특정 테이블만
          </button>
        </div>

        {scope === 'selected' && (
          <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto custom-scrollbar">
            {tables.length === 0 ? (
              <p className="text-[11px] text-zinc-500 py-2">선택 가능한 테이블이 없습니다.</p>
            ) : (
              tables.map((t) => {
                const on = selectedIds.has(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleTable(t.id)}
                    className={`flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg border text-left text-[12px] font-bold ${
                      on
                        ? 'border-sky-500/50 bg-sky-500/10 text-sky-200'
                        : 'border-zinc-800 bg-zinc-900 text-zinc-400'
                    }`}
                  >
                    <span className="truncate">{t.name}</span>
                    <span className="text-[10px] font-mono text-zinc-500 shrink-0">
                      {t.gameCode}
                    </span>
                  </button>
                );
              })
            )}
            {tables.length > 0 && selectedIds.size === 0 && (
              <p className="text-[10px] text-rose-300/90 mt-1">
                테이블을 1개 이상 선택해 주세요.
              </p>
            )}
          </div>
        )}

        {scope === 'all' && (
          <p className="text-[10px] text-zinc-500 leading-relaxed">
            감시 중인 테이블 전체에 위 경우들을 적용합니다.
          </p>
        )}
      </div>
    </div>
  );
}
