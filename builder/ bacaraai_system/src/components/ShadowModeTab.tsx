import { Info, Play } from 'lucide-react';
import { RuleData } from '../types';

interface ShadowModeTabProps {
  rules: RuleData[];
}

export default function ShadowModeTab({ rules }: ShadowModeTabProps) {
  const activeRules = rules.filter(r => r.active).length;

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 flex flex-col gap-6 bg-zinc-950">
      
      {/* Header Info */}
      <div className="bg-indigo-950/30 border border-indigo-500/30 rounded-xl p-4 flex items-start gap-3">
        <Info className="text-indigo-400 shrink-0 mt-0.5" size={20} />
        <div className="flex flex-col gap-1">
          <h3 className="text-indigo-400 font-bold">섀도 모드 (가상 시뮬레이션)</h3>
          <p className="text-sm text-indigo-300/80 leading-relaxed">
            현재 섀도 모드로 <strong className="text-indigo-300">{activeRules}개의 규칙</strong>을 가상 검증 중입니다.<br/>
            사용자가 실제로 베팅하지 않아도 AI가 백그라운드에서 의견을 내고 가상의 손익을 기록합니다.
          </p>
        </div>
      </div>

      {/* Rules Performance Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
          <h4 className="text-sm font-bold text-zinc-300">규칙별 가상 손익 현황</h4>
          <span className="text-xs text-zinc-500">실제 금액과 무관한 시뮬레이션 결과입니다</span>
        </div>
        
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-zinc-950/50 text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">규칙명</th>
                <th className="px-4 py-3 font-medium text-center">누적 횟수</th>
                <th className="px-4 py-3 font-medium text-center">승률</th>
                <th className="px-4 py-3 font-medium text-right">가상 손익(마틴)</th>
                <th className="px-4 py-3 font-medium text-right">최대 낙폭(MDD)</th>
                <th className="px-4 py-3 font-medium text-center">안정성 점수</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {rules.map((rule) => {
                const winRate = rule.triggerCount > 0 ? Math.round((rule.hitCount / rule.triggerCount) * 100) : 0;
                let safetyScore = 100 - (rule.maxConsecutiveFails * 10);
                if (safetyScore < 0) safetyScore = 0;
                
                let scoreColor = 'text-emerald-400';
                if (safetyScore < 70) scoreColor = 'text-amber-400';
                if (safetyScore < 40) scoreColor = 'text-red-400';

                return (
                  <tr key={rule.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${rule.active ? 'bg-indigo-500' : 'bg-zinc-700'}`}></div>
                        <span className="font-bold text-zinc-300">{rule.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-zinc-400">{rule.triggerCount}회</td>
                    <td className="px-4 py-3 text-center font-mono">
                      <span className={winRate >= 50 ? 'text-emerald-400' : 'text-amber-400'}>
                        {winRate}%
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-right font-mono font-bold ${rule.currentPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {rule.currentPnL > 0 ? '+' : ''}{rule.currentPnL.toLocaleString()}원
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-zinc-400">
                      -{Math.abs(rule.currentPnL * 2.5).toLocaleString()}원
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-mono font-bold ${scoreColor}`}>{safetyScore}점</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs transition-colors flex items-center gap-1.5 ml-auto">
                        <Play size={12} />
                        시뮬레이션 재생
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
