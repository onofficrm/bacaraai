const fs = require('fs');
let code = fs.readFileSync('src/components/DataInsightCenter.tsx', 'utf8');

const newComponents = `
function RuleConnectionTab() {
  const summary = [
    { title: '분석된 패턴 수', value: '42,150', color: 'text-zinc-200' },
    { title: '저장된 사용자 규칙', value: '18', color: 'text-blue-400' },
    { title: '패턴에 연결된 규칙', value: '12', color: 'text-emerald-400' },
    { title: '섀도 검증 중인 규칙', value: '5', color: 'text-amber-400' },
    { title: '표본 부족 규칙', value: '4', color: 'text-zinc-400' },
    { title: '위험 증가 규칙', value: '2', color: 'text-red-400' }
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <div className="flex flex-col gap-1.5 mb-6">
          <h3 className="text-xl font-bold text-zinc-200">패턴과 규칙 연결</h3>
          <p className="text-sm text-zinc-400">수집된 패턴과 사용자가 만든 규칙을 연결하여 발동 횟수, 가상 손익 및 위험도를 비교합니다.</p>
          <div className="flex items-start gap-2 mt-2 bg-amber-500/10 border border-amber-500/20 text-amber-500/90 text-xs px-3 py-2 rounded-lg w-fit">
            <Info size={14} className="shrink-0 mt-0.5" />
            <span>패턴이 자주 출현하는 것과 해당 규칙의 가상 손익은 서로 다른 지표입니다.</span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {summary.map((item, idx) => (
            <div key={idx} className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 flex flex-col gap-1 text-center">
              <span className="text-xs text-zinc-500 font-medium">{item.title}</span>
              <span className={\`text-xl font-bold \${item.color}\`}>{item.value}</span>
            </div>
          ))}
        </div>

        <h4 className="font-bold text-zinc-200 mb-4">연결된 규칙 목록</h4>
        
        <div className="flex flex-col gap-4">
          {/* Card 1 */}
          <div className="bg-zinc-950 border border-red-500/30 rounded-xl p-5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 -z-10 rounded-bl-full"></div>
            
            <div className="flex flex-col lg:flex-row justify-between gap-6">
              <div className="flex-1 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <span className="bg-zinc-800 text-zinc-300 text-xs px-2 py-1 rounded font-bold">Player 2연속</span>
                  <span className="text-zinc-600 font-medium">연결 됨</span>
                  <span className="font-bold text-white text-lg">규칙 1: 세 번째도 Player</span>
                  <span className="bg-red-500/20 text-red-400 border border-red-500/30 text-xs px-2 py-1 rounded font-bold ml-auto lg:ml-0">위험 증가</span>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-zinc-500">패턴 출현</span>
                    <span className="font-mono text-sm text-zinc-300">82,430회</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-zinc-500">규칙 조건 충족</span>
                    <span className="font-mono text-sm text-zinc-300">4,820회</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-zinc-500">섀도 참여</span>
                    <span className="font-mono text-sm text-zinc-300">4,105회</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-zinc-500">가상 관망</span>
                    <span className="font-mono text-sm text-zinc-300">715회</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-zinc-500">가상 손익</span>
                    <span className="font-mono font-bold text-sm text-red-400">-730,000원</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-zinc-500">최대 낙폭 (MDD)</span>
                    <span className="font-mono text-sm text-red-400">-2,580,000원</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-zinc-500">최대 연속 실패</span>
                    <span className="font-mono text-sm text-amber-400">9회</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-zinc-500">최고 마틴</span>
                    <span className="font-mono text-sm text-amber-400">8단계</span>
                  </div>
                </div>
              </div>
              
              <div className="flex lg:flex-col gap-2 shrink-0">
                <button className="flex-1 lg:flex-none px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium rounded-lg transition-colors">규칙 상세</button>
                <button className="flex-1 lg:flex-none px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium rounded-lg transition-colors">규칙 연구실</button>
                <button className="flex-1 lg:flex-none px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium rounded-lg transition-colors">패턴 상세</button>
                <button className="flex-1 lg:flex-none px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium rounded-lg transition-colors">섀도 기록</button>
                <button className="flex-1 lg:flex-none px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-bold rounded-lg transition-colors">규칙 일시정지</button>
              </div>
            </div>
            
            {/* 데이터 근거 요약 영역 (상세 열었을 때 나오는 부분 시뮬레이션) */}
            <div className="mt-4 pt-4 border-t border-zinc-800/50 flex flex-col gap-3 hidden group-hover:flex transition-all">
              <h5 className="text-xs font-bold text-zinc-400">규칙 발동 데이터 근거</h5>
              <div className="flex flex-wrap gap-2">
                <span className="bg-zinc-900 border border-zinc-800 px-2 py-1 rounded text-[10px] text-zinc-400">최근 30일 발동: <span className="text-zinc-200 font-mono">312회</span></span>
                <span className="bg-zinc-900 border border-zinc-800 px-2 py-1 rounded text-[10px] text-zinc-400">정상 검증 사례: <span className="text-zinc-200 font-mono">298건</span></span>
                <span className="bg-zinc-900 border border-zinc-800 px-2 py-1 rounded text-[10px] text-zinc-400">유사 상황 사례: <span className="text-zinc-200 font-mono">14건</span></span>
                <span className="bg-zinc-900 border border-zinc-800 px-2 py-1 rounded text-[10px] text-zinc-400">기간별 차이: <span className="text-red-400">수익률 하락세</span></span>
                <span className="bg-zinc-900 border border-zinc-800 px-2 py-1 rounded text-[10px] text-zinc-400">테이블 편중: <span className="text-amber-400">스피드 A 높음</span></span>
              </div>
            </div>
          </div>
          
          {/* Card 2 */}
          <div className="bg-zinc-950 border border-emerald-500/30 rounded-xl p-5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 -z-10 rounded-bl-full"></div>
            
            <div className="flex flex-col lg:flex-row justify-between gap-6">
              <div className="flex-1 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <span className="bg-zinc-800 text-zinc-300 text-xs px-2 py-1 rounded font-bold">퐁당 4번</span>
                  <span className="text-zinc-600 font-medium">연결 됨</span>
                  <span className="font-bold text-white text-lg">규칙 2: 퐁당 유지 배팅</span>
                  <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs px-2 py-1 rounded font-bold ml-auto lg:ml-0">사용 가능</span>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-zinc-500">패턴 출현</span>
                    <span className="font-mono text-sm text-zinc-300">68,320회</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-zinc-500">규칙 조건 충족</span>
                    <span className="font-mono text-sm text-zinc-300">3,120회</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-zinc-500">섀도 참여</span>
                    <span className="font-mono text-sm text-zinc-300">2,850회</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-zinc-500">가상 관망</span>
                    <span className="font-mono text-sm text-zinc-300">270회</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-zinc-500">가상 손익</span>
                    <span className="font-mono font-bold text-sm text-emerald-400">+1,420,000원</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-zinc-500">최대 낙폭 (MDD)</span>
                    <span className="font-mono text-sm text-red-400">-450,000원</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-zinc-500">최대 연속 실패</span>
                    <span className="font-mono text-sm text-amber-400">4회</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] text-zinc-500">최고 마틴</span>
                    <span className="font-mono text-sm text-amber-400">5단계</span>
                  </div>
                </div>
              </div>
              
              <div className="flex lg:flex-col gap-2 shrink-0">
                <button className="flex-1 lg:flex-none px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium rounded-lg transition-colors">규칙 상세</button>
                <button className="flex-1 lg:flex-none px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium rounded-lg transition-colors">규칙 연구실</button>
                <button className="flex-1 lg:flex-none px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium rounded-lg transition-colors">패턴 상세</button>
                <button className="flex-1 lg:flex-none px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium rounded-lg transition-colors">섀도 기록</button>
                <button className="flex-1 lg:flex-none px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs font-medium rounded-lg transition-colors">규칙 일시정지</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DataQualityTab() {
  return (
    <div className="flex flex-col gap-6">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <div className="flex flex-col gap-1.5 mb-6">
          <h3 className="text-xl font-bold text-zinc-200">데이터 품질</h3>
          <p className="text-sm text-zinc-400">수집된 결과가 패턴 분석과 AI 참고 의견에 사용 가능한 상태인지 확인합니다.</p>
          <div className="flex items-start gap-2 mt-2 bg-amber-500/10 border border-amber-500/20 text-amber-500/90 text-xs px-3 py-2 rounded-lg w-fit">
            <Info size={14} className="shrink-0 mt-0.5" />
            <span>데이터 품질 점수는 게임 결과의 예측 정확도를 의미하지 않습니다.</span>
          </div>
        </div>

        {/* Quality Score Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 flex flex-col gap-1 text-center border-b-2 border-b-emerald-500">
            <span className="text-xs text-zinc-500 font-medium">전체 데이터 품질</span>
            <span className="text-xl font-bold text-emerald-400">97.8점</span>
          </div>
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 flex flex-col gap-1 text-center">
            <span className="text-xs text-zinc-500 font-medium">정상 판독률</span>
            <span className="text-xl font-bold text-zinc-200">98.6%</span>
          </div>
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 flex flex-col gap-1 text-center">
            <span className="text-xs text-zinc-500 font-medium">AI 분석 완료율</span>
            <span className="text-xl font-bold text-blue-400">96.8%</span>
          </div>
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 flex flex-col gap-1 text-center">
            <span className="text-xs text-zinc-500 font-medium">수동 수정률</span>
            <span className="text-xl font-bold text-amber-400">0.7%</span>
          </div>
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 flex flex-col gap-1 text-center">
            <span className="text-xs text-zinc-500 font-medium">중복 차단률</span>
            <span className="text-xl font-bold text-zinc-400">0.4%</span>
          </div>
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 flex flex-col gap-1 text-center">
            <span className="text-xs text-zinc-500 font-medium">판독 오류율</span>
            <span className="text-xl font-bold text-red-400">0.3%</span>
          </div>
        </div>

        {/* Data Status Classification & Pipeline */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 flex flex-col gap-4">
            <h4 className="font-bold text-zinc-300">데이터 상태 분류</h4>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
              {[
                { label: '검증 완료', count: '1.25M', color: 'bg-emerald-500/20 text-emerald-400' },
                { label: '수동 수정 완료', count: '8.4K', color: 'bg-amber-500/20 text-amber-400' },
                { label: '검토 필요', count: '142', color: 'bg-red-500/20 text-red-400' },
                { label: '판독 충돌', count: '48', color: 'bg-orange-500/20 text-orange-400' },
                { label: '중복으로 제외', count: '5.2K', color: 'bg-zinc-800 text-zinc-400' },
                { label: '표본 부족', count: '1.2K', color: 'bg-zinc-800 text-zinc-400' },
                { label: '조건 미충족', count: '890', color: 'bg-zinc-800 text-zinc-400' },
                { label: '연결 오류', count: '15', color: 'bg-red-500/20 text-red-400' },
                { label: '분석 제외', count: '4.1K', color: 'bg-zinc-800 text-zinc-500' }
              ].map((item, idx) => (
                <button key={idx} className="flex flex-col items-center justify-center p-3 bg-zinc-950 border border-zinc-800 rounded-lg hover:bg-zinc-800 transition-colors">
                  <span className={\`text-xs px-2 py-0.5 rounded-full mb-2 \${item.color}\`}>{item.label}</span>
                  <span className="font-mono text-sm font-bold text-zinc-300">{item.count}</span>
                </button>
              ))}
            </div>
          </div>
          
          <div className="lg:col-span-1 flex flex-col gap-4">
            <h4 className="font-bold text-zinc-300">데이터 업데이트 상태</h4>
            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-zinc-300"><div className="w-2 h-2 rounded-full bg-emerald-500"></div>새 게임 결과 수집</div>
                <span className="text-emerald-400 text-xs font-bold">완료</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-zinc-300"><div className="w-2 h-2 rounded-full bg-emerald-500"></div>중복 및 판독 검증</div>
                <span className="text-emerald-400 text-xs font-bold">완료</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-zinc-300"><div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>패턴 데이터 갱신</div>
                <span className="text-blue-400 text-xs font-bold">진행 중</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-zinc-500"><div className="w-2 h-2 rounded-full bg-zinc-700"></div>유사 상황 인덱스 갱신</div>
                <span className="text-zinc-500 text-xs font-medium">대기</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2 text-zinc-500"><div className="w-2 h-2 rounded-full bg-zinc-700"></div>규칙 가상 결과 갱신</div>
                <span className="text-zinc-500 text-xs font-medium">대기</span>
              </div>
            </div>
          </div>
        </div>

        {/* Charts & Tables placeholder */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-zinc-300">판독 품질 추이</h4>
              <select className="bg-zinc-950 border border-zinc-800 text-xs text-zinc-400 rounded px-2 py-1 outline-none">
                <option>최근 7일</option>
                <option>최근 30일</option>
              </select>
            </div>
            <div className="h-48 border border-zinc-800 rounded-xl bg-zinc-950 flex flex-col justify-end p-4 relative group">
              <div className="absolute top-2 right-2 text-[10px] text-zinc-500 flex gap-2">
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-emerald-500 rounded-full"></span>정상 판독</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-500 rounded-full"></span>오류/수정</span>
              </div>
              {/* Mock Chart */}
              <div className="flex items-end justify-between h-full gap-1 pt-4">
                {[98, 97, 99, 85, 96, 98, 99].map((val, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-1 relative">
                    {val < 90 && <div className="absolute -top-4 text-red-500 text-xs font-bold">!</div>}
                    <div className="w-full bg-emerald-500/80 rounded-t-sm" style={{ height: \`\${val}%\` }}></div>
                    <div className="w-full bg-red-500/80" style={{ height: \`\${100 - val}%\` }}></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="flex flex-col gap-4">
            <h4 className="font-bold text-zinc-300">데이터 수정 이력</h4>
            <div className="flex-1 border border-zinc-800 rounded-xl bg-zinc-950 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-900 text-zinc-500 sticky top-0">
                  <tr>
                    <th className="p-2 font-medium">시간</th>
                    <th className="p-2 font-medium">테이블</th>
                    <th className="p-2 font-medium">수정 내용</th>
                    <th className="p-2 font-medium">상태</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800 text-zinc-300">
                  <tr>
                    <td className="p-2 text-zinc-500">10:42:15</td>
                    <td className="p-2">스피드 바카라 A</td>
                    <td className="p-2 font-mono"><span className="text-red-400 line-through mr-1">B</span> <span className="text-emerald-400">T</span></td>
                    <td className="p-2"><span className="bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">재계산 대기</span></td>
                  </tr>
                  <tr>
                    <td className="p-2 text-zinc-500">10:15:02</td>
                    <td className="p-2">라이트닝 바카라</td>
                    <td className="p-2 font-mono"><span className="text-zinc-500 line-through mr-1">?</span> <span className="text-blue-400">P</span></td>
                    <td className="p-2"><span className="bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">완료</span></td>
                  </tr>
                  <tr>
                    <td className="p-2 text-zinc-500">09:58:33</td>
                    <td className="p-2">스피드 바카라 B</td>
                    <td className="p-2 font-mono text-zinc-500">중복 제외</td>
                    <td className="p-2"><span className="bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">완료</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Table Quality List */}
        <div className="mt-8">
          <h4 className="font-bold text-zinc-300 mb-4">테이블별 데이터 품질</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-zinc-800 rounded-lg overflow-hidden">
              <thead className="bg-zinc-900 text-zinc-400">
                <tr>
                  <th className="p-3 font-medium">테이블명</th>
                  <th className="p-3 font-medium text-right">누적 수집</th>
                  <th className="p-3 font-medium text-right">정상 판독률</th>
                  <th className="p-3 font-medium text-right">수동/충돌</th>
                  <th className="p-3 font-medium">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800 bg-zinc-950 text-zinc-300">
                <tr>
                  <td className="p-3 font-medium text-zinc-200">스피드 바카라 A</td>
                  <td className="p-3 text-right font-mono">142,510</td>
                  <td className="p-3 text-right font-mono text-emerald-400">99.2%</td>
                  <td className="p-3 text-right font-mono text-zinc-500">12 / 2</td>
                  <td className="p-3"><span className="bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded font-medium">정상</span></td>
                </tr>
                <tr>
                  <td className="p-3 font-medium text-zinc-200">라이트닝 바카라</td>
                  <td className="p-3 text-right font-mono">85,204</td>
                  <td className="p-3 text-right font-mono text-emerald-400">98.5%</td>
                  <td className="p-3 text-right font-mono text-zinc-500">45 / 18</td>
                  <td className="p-3"><span className="bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded font-medium">정상</span></td>
                </tr>
                <tr className="bg-red-500/5">
                  <td className="p-3 font-medium text-zinc-200">코리안 스피드 바카라 A</td>
                  <td className="p-3 text-right font-mono">12,450</td>
                  <td className="p-3 text-right font-mono text-red-400">82.4%</td>
                  <td className="p-3 text-right font-mono text-zinc-500">142 / 85</td>
                  <td className="p-3"><span className="bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-1 rounded font-medium">검토 필요</span></td>
                </tr>
                <tr className="opacity-50">
                  <td className="p-3 font-medium text-zinc-200 line-through">VIP 바카라 1</td>
                  <td className="p-3 text-right font-mono">2,150</td>
                  <td className="p-3 text-right font-mono text-amber-400">91.2%</td>
                  <td className="p-3 text-right font-mono text-zinc-500">8 / 0</td>
                  <td className="p-3"><span className="bg-zinc-800 text-zinc-400 px-2 py-1 rounded font-medium">분석 제외</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
`;

code = code.replace(
  `        ) : activeTab === 'similar' ? (
          <SimilarSituationsTab />
        ) : (`,
  `        ) : activeTab === 'similar' ? (
          <SimilarSituationsTab />
        ) : activeTab === 'rules' ? (
          <RuleConnectionTab />
        ) : activeTab === 'quality' ? (
          <DataQualityTab />
        ) : (`
);

fs.writeFileSync('src/components/DataInsightCenter.tsx', code + '\n' + newComponents);
