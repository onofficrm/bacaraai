import { Info } from 'lucide-react';

interface MartingaleVisualizerProps {
  currentStage: number;
  maxStages: number;
  baseAmount: number;
}

export default function MartingaleVisualizer({ currentStage, maxStages, baseAmount }: MartingaleVisualizerProps) {
  // Generate stages
  const stages = Array.from({ length: maxStages }).map((_, idx) => {
    const stageNum = idx + 1;
    const amount = baseAmount * Math.pow(2, stageNum - 1);
    const isCurrent = stageNum === currentStage;
    const isPast = stageNum < currentStage;
    
    return {
      stageNum,
      amount,
      isCurrent,
      isPast
    };
  });

  const totalRequired = stages.reduce((acc, stage) => acc + stage.amount, 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-between items-center text-xs">
        <span className="text-zinc-500 font-bold">마틴게일 단계 시각화</span>
        <span className="text-zinc-400">총 필요: <span className="font-mono text-amber-400 font-bold">{totalRequired.toLocaleString()}원</span></span>
      </div>
      
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
        {stages.map((stage) => {
          let boxClass = "flex flex-col items-center justify-center p-1.5 rounded border transition-colors relative overflow-hidden ";
          let numClass = "text-[10px] font-bold ";
          let amtClass = "text-[9px] font-mono ";

          if (stage.isCurrent) {
            boxClass += "bg-amber-500/20 border-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.2)]";
            numClass += "text-amber-400";
            amtClass += "text-amber-300 font-bold";
          } else if (stage.isPast) {
            boxClass += "bg-zinc-800 border-zinc-700 opacity-50";
            numClass += "text-zinc-500";
            amtClass += "text-zinc-600";
          } else {
            boxClass += "bg-zinc-900 border-zinc-800";
            numClass += "text-zinc-400";
            amtClass += "text-zinc-500";
          }

          return (
            <div key={stage.stageNum} className={boxClass} title={`${stage.stageNum}단계: ${stage.amount.toLocaleString()}원`}>
              <span className={numClass}>{stage.stageNum}</span>
              <span className={amtClass}>{stage.amount >= 10000 ? `${stage.amount / 10000}만` : stage.amount}</span>
              
              {/* Highlight bar for current */}
              {stage.isCurrent && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500"></div>
              )}
            </div>
          );
        })}
      </div>
      
      <div className="flex items-start gap-1.5 text-[10px] text-zinc-500 mt-1">
        <Info size={12} className="shrink-0 mt-0.5" />
        패배 시 금액이 2배로 증가하며, 전체 단계 진행에 필요한 누적 자금입니다.
      </div>
    </div>
  );
}
