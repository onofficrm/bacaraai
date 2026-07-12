import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Cell } from 'recharts';
import { RuleData } from '../types';

export default function ProfitTab({ rules }: { rules: RuleData[] }) {
  // Mock data for charts
  const timeData = [
    { time: '10:00', amount: 500000 },
    { time: '11:00', amount: 520000 },
    { time: '12:00', amount: 480000 },
    { time: '13:00', amount: 550000 },
    { time: '14:00', amount: 620000 },
  ];

  const ruleData = rules.map(r => ({
    name: r.name,
    profit: r.currentPnL
  }));

  const aiStats = [
    { name: 'GPT-4o', total: 120, player: 50, banker: 45, wait: 25, error: 0, matchOther: 85, matchUser: 70, time: '1.2s' },
    { name: 'Gemini 1.5', total: 120, player: 48, banker: 42, wait: 28, error: 2, matchOther: 80, matchUser: 65, time: '1.0s' },
    { name: 'Claude 3.5', total: 120, player: 52, banker: 50, wait: 18, error: 0, matchOther: 88, matchUser: 75, time: '1.5s' }
  ];

  const strategies = [
    { name: '항상 Player', pnl: -120000, dd: -250000, streak: 6, avg: 10000, stage: 1 },
    { name: '항상 Banker', pnl: -150000, dd: -300000, streak: 7, avg: 10000, stage: 1 },
    { name: '무작위 선택', pnl: -80000, dd: -200000, streak: 5, avg: 10000, stage: 1 },
    { name: '고정 10,000원', pnl: -20000, dd: -100000, streak: 4, avg: 10000, stage: 1 },
    { name: '내 규칙 (종합)', pnl: 120000, dd: -150000, streak: 4, avg: 25000, stage: 4 },
  ];

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 flex flex-col gap-8 bg-zinc-950">
      
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 shrink-0">
        <SummaryCard label="총 관찰 회차" value="1,245회" />
        <SummaryCard label="실제 선택 회차" value="128회" />
        <SummaryCard label="총 손익" value="+120,000원" color="text-emerald-400" />
        <SummaryCard label="현재 자금" value="620,000원" color="text-amber-400" />
        <SummaryCard label="최대 낙폭" value="-150,000원" color="text-red-400" />
        <SummaryCard label="최대 연속 실패" value="4회" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[300px] shrink-0">
        
        {/* Time Line Chart */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col">
          <h3 className="text-sm font-bold text-zinc-300 mb-4">시간별 자금 변화</h3>
          <div className="flex-1 w-full min-h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" vertical={false} />
                <XAxis dataKey="time" stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `${val/10000}만`} width={40} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', fontSize: '12px' }}
                  itemStyle={{ color: '#fbbf24' }}
                />
                <Line type="monotone" dataKey="amount" stroke="#fbbf24" strokeWidth={2} dot={{ r: 4, fill: '#fbbf24' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Rules Bar Chart */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col">
          <h3 className="text-sm font-bold text-zinc-300 mb-4">규칙별 손익 현황</h3>
          <div className="flex-1 w-full min-h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ruleData} layout="vertical" margin={{ left: 50, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" horizontal={false} />
                <XAxis type="number" stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `${val/10000}만`} />
                <YAxis dataKey="name" type="category" stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} width={100} />
                <RechartsTooltip 
                  cursor={{ fill: '#27272a' }}
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#3f3f46', fontSize: '12px' }}
                />
                <Bar dataKey="profit">
                  {
                    ruleData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.profit >= 0 ? '#34d399' : '#f87171'} />
                    ))
                  }
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 shrink-0">
        
        {/* AI Stats */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col">
          <h3 className="text-sm font-bold text-zinc-300 mb-1">AI별 기록 분석</h3>
          <p className="text-[10px] text-zinc-500 mb-4">AI별 기록은 분석 의견의 과거 결과를 정리한 것이며 향후 결과를 보장하지 않습니다.</p>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-zinc-950 text-zinc-500">
                <tr>
                  <th className="px-3 py-2 font-medium">AI 모델</th>
                  <th className="px-3 py-2 font-medium">전체</th>
                  <th className="px-3 py-2 font-medium">P/B/W</th>
                  <th className="px-3 py-2 font-medium text-amber-500">의견 일치</th>
                  <th className="px-3 py-2 font-medium text-emerald-500">사용자 일치</th>
                  <th className="px-3 py-2 font-medium">응답시간</th>
                  <th className="px-3 py-2 font-medium text-red-400">오류</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {aiStats.map(ai => (
                  <tr key={ai.name} className="hover:bg-zinc-800/30">
                    <td className="px-3 py-3 font-bold text-zinc-300">{ai.name}</td>
                    <td className="px-3 py-3 text-zinc-400">{ai.total}</td>
                    <td className="px-3 py-3 text-zinc-400">{ai.player} / {ai.banker} / {ai.wait}</td>
                    <td className="px-3 py-3 text-amber-500">{ai.matchOther}회</td>
                    <td className="px-3 py-3 text-emerald-500">{ai.matchUser}회</td>
                    <td className="px-3 py-3 font-mono text-zinc-400">{ai.time}</td>
                    <td className={`px-3 py-3 ${ai.error > 0 ? 'text-red-400 font-bold' : 'text-zinc-500'}`}>{ai.error}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Strategy Comparison */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col">
          <h3 className="text-sm font-bold text-zinc-300 mb-4">기준 전략 비교</h3>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-zinc-950 text-zinc-500">
                <tr>
                  <th className="px-3 py-2 font-medium">전략 명칭</th>
                  <th className="px-3 py-2 font-medium text-right">총 손익</th>
                  <th className="px-3 py-2 font-medium text-right">최대 낙폭</th>
                  <th className="px-3 py-2 font-medium text-center">연속 실패</th>
                  <th className="px-3 py-2 font-medium text-right">평균 금액</th>
                  <th className="px-3 py-2 font-medium text-center">마틴</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {strategies.map(st => (
                  <tr key={st.name} className="hover:bg-zinc-800/30">
                    <td className={`px-3 py-3 font-bold ${st.name.includes('내 규칙') ? 'text-amber-400' : 'text-zinc-300'}`}>{st.name}</td>
                    <td className={`px-3 py-3 text-right font-mono font-bold ${st.pnl > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {st.pnl > 0 ? '+' : ''}{st.pnl.toLocaleString()}원
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-red-400">{st.dd.toLocaleString()}원</td>
                    <td className="px-3 py-3 text-center text-zinc-400">{st.streak}회</td>
                    <td className="px-3 py-3 text-right font-mono text-zinc-400">{st.avg.toLocaleString()}원</td>
                    <td className="px-3 py-3 text-center text-zinc-400">{st.stage}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}

function SummaryCard({ label, value, color = "text-white" }: { label: string, value: string, color?: string }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex flex-col gap-1">
      <span className="text-[10px] text-zinc-500 font-medium">{label}</span>
      <span className={`text-lg font-mono font-bold ${color}`}>{value}</span>
    </div>
  );
}
