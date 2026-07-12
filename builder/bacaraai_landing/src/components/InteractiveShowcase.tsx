import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MonitorPlay, Settings2, LineChart, ShieldAlert } from 'lucide-react';
import DashboardMockup from './DashboardMockup';

export default function InteractiveShowcase() {
  const [activeTab, setActiveTab] = useState(0);

  const tabs = [
    {
      id: 0,
      title: '통합 대시보드',
      icon: MonitorPlay,
      description: '8개의 테이블 상태와 AI의 개별 분석 결과를 한눈에 파악할 수 있는 메인 관제 센터입니다.',
      details: ['실시간 테이블 결과 연동', '3개 AI 실시간 의견 표시', '위험 상태 테이블 하이라이트']
    },
    {
      id: 1,
      title: '규칙 연구실',
      icon: Settings2,
      description: '나만의 베팅 조건과 규칙을 설정하고 시스템이 이를 실시간으로 모니터링하도록 구성합니다.',
      details: ['조건부 규칙 생성', 'AI 의견 포함 규칙 설정', '섀도 모드 가상 테스트']
    },
    {
      id: 2,
      title: '데이터 통계',
      icon: LineChart,
      description: '과거 세션의 모든 기록을 시각화하여 나의 승률, 주요 손실 구간, 패턴을 분석합니다.',
      details: ['세션별 손익 그래프', '자주 사용하는 규칙 승률', '최고 마틴 단계 추이']
    },
    {
      id: 3,
      title: '위험 차단',
      icon: ShieldAlert,
      description: '설정한 로스컷이나 마틴 한계에 도달하면 경고를 보내고 강제 관망을 권장합니다.',
      details: ['윈컷/로스컷 실시간 추적', '비정상적 배팅 금액 감지', '감정적 플레이 차단 안내']
    }
  ];

  return (
    <section className="py-24 bg-zinc-950 relative overflow-hidden">
      <div className="absolute top-1/2 left-0 w-full h-[600px] -translate-y-1/2 bg-amber-500/5 blur-[120px] pointer-events-none"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            플랫폼 <span className="text-amber-500">핵심 기능</span> 미리보기
          </h2>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            직관적인 UI와 강력한 데이터 분석 기능을 직접 확인해 보세요.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-12 lg:gap-8 items-center">
          {/* Tabs Menu */}
          <div className="w-full lg:w-1/3 flex flex-col gap-3">
            {tabs.map((tab, idx) => {
              const Icon = tab.icon;
              const isActive = activeTab === idx;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(idx)}
                  className={`flex items-start gap-4 p-5 rounded-2xl border transition-all text-left ${
                    isActive 
                      ? 'bg-zinc-900 border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.1)]' 
                      : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/50'
                  }`}
                >
                  <div className={`p-2 rounded-xl mt-1 flex-shrink-0 transition-colors ${
                    isActive ? 'bg-amber-500/20 text-amber-400' : 'bg-zinc-800 text-zinc-400'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className={`font-bold mb-1 ${isActive ? 'text-white' : 'text-zinc-300'}`}>
                      {tab.title}
                    </h3>
                    <p className={`text-sm line-clamp-2 ${isActive ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      {tab.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Interactive Content Area */}
          <div className="w-full lg:w-2/3">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 md:p-8 min-h-[500px] flex flex-col relative overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  className="flex-1 flex flex-col"
                >
                  <div className="mb-8">
                    <h3 className="text-2xl font-bold text-white mb-4">{tabs[activeTab].title}</h3>
                    <p className="text-zinc-400 mb-6">{tabs[activeTab].description}</p>
                    
                    <div className="flex flex-wrap gap-3">
                      {tabs[activeTab].details.map((detail, i) => (
                        <div key={i} className="px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-full text-xs font-medium text-amber-400/90">
                          {detail}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex-1 bg-zinc-950 rounded-2xl border border-zinc-800 relative overflow-hidden flex items-center justify-center p-4">
                    {/* Simplified mockups based on active tab */}
                    {activeTab === 0 && (
                      <div className="w-full scale-90 sm:scale-100 origin-center">
                        <DashboardMockup />
                      </div>
                    )}
                    
                    {activeTab === 1 && (
                      <div className="w-full max-w-lg space-y-4 opacity-80">
                         <div className="h-12 bg-zinc-900 rounded-lg border border-zinc-800 flex items-center px-4 gap-4">
                            <div className="w-4 h-4 rounded-full bg-blue-500/20 border border-blue-500/50"></div>
                            <div className="h-2 w-16 bg-zinc-700 rounded"></div>
                            <div className="h-2 w-8 bg-zinc-800 rounded"></div>
                         </div>
                         <div className="h-12 bg-zinc-900 rounded-lg border border-amber-500/30 flex items-center px-4 gap-4">
                            <div className="w-4 h-4 rounded-full bg-red-500/20 border border-red-500/50"></div>
                            <div className="h-2 w-24 bg-zinc-700 rounded"></div>
                            <div className="ml-auto px-2 py-1 bg-amber-500/20 text-amber-400 text-[10px] rounded">조건 감지됨</div>
                         </div>
                         <div className="h-12 bg-zinc-900 rounded-lg border border-zinc-800 flex items-center px-4 gap-4">
                            <div className="w-4 h-4 rounded-full bg-green-500/20 border border-green-500/50"></div>
                            <div className="h-2 w-20 bg-zinc-700 rounded"></div>
                         </div>
                      </div>
                    )}

                    {activeTab === 2 && (
                      <div className="w-full max-w-lg h-48 flex items-end justify-between gap-2 px-6 pb-6 opacity-80">
                         {[40, 60, 30, 80, 50, 90, 70].map((h, i) => (
                           <motion.div 
                             key={i} 
                             initial={{ height: 0 }} 
                             animate={{ height: `${h}%` }} 
                             transition={{ duration: 0.5, delay: i * 0.1 }}
                             className={`w-full rounded-t-sm ${h > 60 ? 'bg-amber-500/50' : 'bg-zinc-700'}`}
                           ></motion.div>
                         ))}
                      </div>
                    )}

                    {activeTab === 3 && (
                      <div className="w-full max-w-md bg-zinc-900 border border-red-500/30 rounded-xl p-6 text-center opacity-90">
                         <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4 animate-pulse" />
                         <h4 className="text-white font-bold mb-2">마틴 5단계 도달 경고</h4>
                         <p className="text-xs text-zinc-400 mb-4">설정된 로스컷 한도에 근접했습니다. 다음 게임은 강제 관망을 권장합니다.</p>
                         <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden">
                           <div className="h-full bg-red-500 w-[85%]"></div>
                         </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
