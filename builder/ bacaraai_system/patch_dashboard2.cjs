const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

// I need to find the place right before the closing divs of Dashboard.tsx
// Let's replace the last few divs with the new content + closing divs

const newSections = `
        {/* Bottom Area: AI Status, Rules, Timeline */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          
          {/* 1. 오늘의 AI 분석 현황 */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col gap-4">
            <h3 className="font-bold text-zinc-200 flex items-center gap-2">
              <Zap size={18} className="text-amber-500" />
              오늘의 AI 분석 현황
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="text-zinc-500 border-b border-zinc-800">
                  <tr>
                    <th className="py-2 font-medium">AI</th>
                    <th className="py-2 font-medium text-right">분석</th>
                    <th className="py-2 font-medium text-right text-blue-400">P</th>
                    <th className="py-2 font-medium text-right text-red-400">B</th>
                    <th className="py-2 font-medium text-right">관망</th>
                    <th className="py-2 font-medium text-right">응답</th>
                  </tr>
                </thead>
                <tbody className="text-zinc-300">
                  <tr className="border-b border-zinc-800/50">
                    <td className="py-2 flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>GPT</td>
                    <td className="py-2 text-right font-mono">86</td>
                    <td className="py-2 text-right font-mono">21</td>
                    <td className="py-2 text-right font-mono">18</td>
                    <td className="py-2 text-right font-mono">47</td>
                    <td className="py-2 text-right font-mono">1.2초</td>
                  </tr>
                  <tr className="border-b border-zinc-800/50">
                    <td className="py-2 flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>Gemini</td>
                    <td className="py-2 text-right font-mono">91</td>
                    <td className="py-2 text-right font-mono">26</td>
                    <td className="py-2 text-right font-mono">20</td>
                    <td className="py-2 text-right font-mono">45</td>
                    <td className="py-2 text-right font-mono">0.8초</td>
                  </tr>
                  <tr>
                    <td className="py-2 flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>Claude</td>
                    <td className="py-2 text-right font-mono">84</td>
                    <td className="py-2 text-right font-mono">17</td>
                    <td className="py-2 text-right font-mono">15</td>
                    <td className="py-2 text-right font-mono">52</td>
                    <td className="py-2 text-right font-mono">1.5초</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="bg-zinc-950 rounded-lg p-3 grid grid-cols-2 gap-2 text-xs border border-zinc-800/50">
              <div className="flex justify-between">
                <span className="text-zinc-500">세 AI 모두 일치</span>
                <span className="font-bold text-zinc-200">12회</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">두 AI 일치</span>
                <span className="font-bold text-zinc-200">38회</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">의견 불일치</span>
                <span className="font-bold text-zinc-200">14회</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">AI 토론 실행</span>
                <span className="font-bold text-zinc-200">6회</span>
              </div>
            </div>

            <div className="flex gap-2 mt-auto pt-2">
              <button className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-1.5 rounded text-xs transition-colors">AI 분석 상세</button>
              <button className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-1.5 rounded text-xs transition-colors">API 사용량</button>
              <button className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-1.5 rounded text-xs transition-colors">AI 설정</button>
            </div>
          </div>

          {/* 2. 활성 규칙 현황 */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-zinc-200 flex items-center gap-2">
                <Target size={18} className="text-emerald-500" />
                활성 규칙
              </h3>
              <div className="flex gap-2 text-xs">
                <span className="text-zinc-500">활성 <strong className="text-zinc-200">3</strong></span>
                <span className="text-blue-400">발동 <strong className="font-bold">1</strong></span>
                <span className="text-purple-400">마틴 <strong className="font-bold">1</strong></span>
                <span className="text-red-400">위험 <strong className="font-bold">1</strong></span>
              </div>
            </div>

            <div className="flex flex-col gap-3 overflow-y-auto custom-scrollbar h-64 pr-1">
              
              {/* Rule Card 1 */}
              <div className="bg-zinc-950 border border-blue-500/30 rounded-lg p-3">
                <div className="font-bold text-zinc-200 text-sm mb-2">Player 2연속 후 Player</div>
                <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
                  <div>
                    <span className="text-zinc-500 block mb-0.5">상태</span>
                    <span className="text-blue-400 font-bold">TABLE 03에서 발동</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block mb-0.5">오늘 발동</span>
                    <span className="text-zinc-200 font-mono">8회</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block mb-0.5">현재 마틴</span>
                    <span className="text-zinc-200 font-mono">2 / 8단계</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block mb-0.5">검증 상태</span>
                    <span className="text-emerald-400 font-bold">섀도 관찰 중</span>
                  </div>
                </div>
              </div>

              {/* Rule Card 2 */}
              <div className="bg-zinc-950 border border-purple-500/30 rounded-lg p-3">
                <div className="font-bold text-zinc-200 text-sm mb-2">퐁당 패턴 지속 시 역베팅</div>
                <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
                  <div>
                    <span className="text-zinc-500 block mb-0.5">상태</span>
                    <span className="text-purple-400 font-bold">마틴 진행 중 (TABLE 07)</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block mb-0.5">오늘 발동</span>
                    <span className="text-zinc-200 font-mono">3회</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block mb-0.5">현재 마틴</span>
                    <span className="text-purple-400 font-bold font-mono">4 / 5단계</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block mb-0.5">최근 최대 낙폭</span>
                    <span className="text-red-400 font-mono">-160,000원</span>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* 3. 관망, 위험, 최근 타임라인 요약 */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col gap-4">
            <h3 className="font-bold text-zinc-200 flex items-center gap-2">
              <Clock size={18} className="text-blue-500" />
              최근 진행 타임라인
            </h3>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 relative">
              <div className="absolute left-1.5 top-2 bottom-2 w-px bg-zinc-800"></div>
              
              <div className="flex flex-col gap-4 relative">
                
                {/* Timeline item 1 */}
                <div className="flex gap-3 relative">
                  <div className="w-3 h-3 rounded-full bg-blue-500 mt-1 relative z-10 shrink-0"></div>
                  <div className="flex flex-col gap-1 w-full">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-bold text-blue-400">규칙 발동 (스피드 바카라 A)</span>
                      <span className="text-[10px] text-zinc-500">방금 전</span>
                    </div>
                    <span className="text-[11px] text-zinc-300">"Player 2연속 후 Player" 규칙 조건 충족. 배팅 대기 중.</span>
                    <div className="mt-1 bg-zinc-950 p-1.5 rounded text-[10px] text-zinc-400 border border-zinc-800/50">
                      근거: 최근 12슈에서 해당 패턴 승률 68%, AI 2곳 일치
                    </div>
                  </div>
                </div>

                {/* Timeline item 2 */}
                <div className="flex gap-3 relative">
                  <div className="w-3 h-3 rounded-full bg-zinc-600 mt-1 relative z-10 shrink-0"></div>
                  <div className="flex flex-col gap-1 w-full">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-bold text-zinc-400">관망 차단 (라이트닝 바카라)</span>
                      <span className="text-[10px] text-zinc-500">2분 전</span>
                    </div>
                    <span className="text-[11px] text-zinc-300">AI 의견 불일치 (P:1, B:1, 관망:1)로 배팅 스킵.</span>
                  </div>
                </div>

                {/* Timeline item 3 */}
                <div className="flex gap-3 relative">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 mt-1 relative z-10 shrink-0"></div>
                  <div className="flex flex-col gap-1 w-full">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-bold text-emerald-400">목표 달성 수익 (+45,000원)</span>
                      <span className="text-[10px] text-zinc-500">8분 전</span>
                    </div>
                    <span className="text-[11px] text-zinc-300">테이블 08에서 마틴 2단계 적중.</span>
                  </div>
                </div>
                
                {/* Timeline item 4 */}
                <div className="flex gap-3 relative">
                  <div className="w-3 h-3 rounded-full bg-red-500 mt-1 relative z-10 shrink-0"></div>
                  <div className="flex flex-col gap-1 w-full">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-bold text-red-400">위험 감지 차단</span>
                      <span className="text-[10px] text-zinc-500">15분 전</span>
                    </div>
                    <span className="text-[11px] text-zinc-300">코리안 스피드 A에서 연속 5회 미적중 패턴 발생. 신규 배팅 일시 차단됨.</span>
                  </div>
                </div>

              </div>
            </div>
            
            <button className="w-full text-center text-xs text-zinc-500 hover:text-zinc-300 py-1 transition-colors mt-2">
              전체 로그 보기
            </button>
          </div>

        </div>`;

code = code.replace(/    <\/div>\n  \);\n\}/, newSections + '\n      </div>\n    </div>\n  );\n}');

fs.writeFileSync('src/components/Dashboard.tsx', code);
