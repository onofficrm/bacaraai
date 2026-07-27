import { playSfx } from '../audio/sfxEngine';
import type { AiSuggestScope, SessionConfig } from '../types';
import { sessionCutsReadyForAmount } from '../hooks/useSession';

const OPTIONS: Array<{
  id: AiSuggestScope;
  title: string;
  desc: string;
  needsCuts: boolean;
}> = [
  { id: 'side', title: '방향만', desc: 'P/B 추천', needsCuts: false },
  { id: 'amount', title: '금액만', desc: '금액 AI 분석', needsCuts: true },
  { id: 'both', title: '방향+금액', desc: '둘 다 AI', needsCuts: true },
];

type Props = {
  config: Pick<SessionConfig, 'aiSuggestScope' | 'winCut' | 'lossCut'>;
  onChange: (scope: AiSuggestScope) => void;
  compact?: boolean;
};

export default function AiSuggestScopePicker({ config, onChange, compact }: Props) {
  const scope = config.aiSuggestScope || 'side';
  const cutsOk = sessionCutsReadyForAmount(config);
  const needsCuts = scope === 'amount' || scope === 'both';

  return (
    <div className={compact ? 'space-y-1.5' : 'space-y-2'}>
      <p className={`font-bold text-zinc-400 ${compact ? 'text-[11px]' : 'text-xs'}`}>
        AI가 무엇을 추천할까요?
      </p>
      <div className={`grid grid-cols-3 gap-1.5`}>
        {OPTIONS.map((opt) => {
          const locked = opt.needsCuts && !cutsOk;
          const active = scope === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                playSfx('ui');
                onChange(opt.id);
              }}
              className={`rounded-lg border text-center transition-colors ${
                compact ? 'py-2 px-1' : 'py-2.5 px-1.5'
              } ${
                active
                  ? locked
                    ? 'bg-amber-500/15 border-amber-400/60 text-amber-100'
                    : 'bg-indigo-600/30 border-indigo-400 text-indigo-100'
                  : 'bg-zinc-950 border-zinc-700 text-zinc-400 hover:border-zinc-500'
              }`}
            >
              <span className={`block font-bold ${compact ? 'text-[11px]' : 'text-xs'}`}>
                {opt.title}
              </span>
              <span className="block text-[10px] font-medium opacity-80 mt-0.5 leading-tight">
                {opt.desc}
              </span>
            </button>
          );
        })}
      </div>
      {needsCuts && !cutsOk && (
        <p className="text-[11px] text-amber-300/90 leading-relaxed rounded-lg border border-amber-500/30 bg-amber-500/5 px-2.5 py-2">
          금액 제안은 <strong className="text-amber-200">윈컷·로스컷</strong>을 먼저 설정해야
          실제 AI 금액 분석이 돌아갑니다.
        </p>
      )}
      {scope === 'amount' && cutsOk && (
        <p className="text-[11px] text-zinc-500 leading-relaxed">
          방향은 직접 고르고, 금액만 AI가 분석합니다. 오토베팅은 방향을 쓰지 않습니다.
        </p>
      )}
      {scope === 'both' && cutsOk && (
        <p className="text-[11px] text-zinc-500 leading-relaxed">
          방향·금액을 AI가 함께 분석합니다. 오토는 방향+AI 금액을 사용합니다.
        </p>
      )}
      {scope === 'side' && (
        <p className="text-[11px] text-zinc-500 leading-relaxed">
          방향만 AI 추천. 금액은 마틴/단계 설정을 따릅니다.
        </p>
      )}
    </div>
  );
}
