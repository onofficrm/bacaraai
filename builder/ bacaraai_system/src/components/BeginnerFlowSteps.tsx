type BeginnerFlowStepsProps = {
  step: 1 | 2 | 3;
  tableName?: string | null;
};

const STEPS = [
  { id: 1 as const, label: '테이블 선택' },
  { id: 2 as const, label: 'AI 의견 확인' },
  { id: 3 as const, label: '금액 확정' },
];

export default function BeginnerFlowSteps({ step, tableName }: BeginnerFlowStepsProps) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/80 px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        {STEPS.map((item, index) => {
          const active = item.id === step;
          const done = item.id < step;
          return (
            <div key={item.id} className="flex items-center gap-2">
              {index > 0 && <span className="text-zinc-700 text-xs">→</span>}
              <div
                className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold border ${
                  active
                    ? 'bg-amber-500 text-zinc-950 border-amber-400'
                    : done
                      ? 'bg-zinc-800 text-zinc-200 border-zinc-700'
                      : 'bg-transparent text-zinc-500 border-zinc-800'
                }`}
              >
                <span className="font-mono">{item.id}</span>
                <span>{item.label}</span>
              </div>
            </div>
          );
        })}
        {tableName && step > 1 && (
          <span className="text-[11px] text-zinc-500 ml-auto">
            선택: <span className="text-zinc-200 font-medium">{tableName}</span>
          </span>
        )}
      </div>
    </div>
  );
}
