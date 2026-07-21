import { getResultColor, getResultLabel } from '../utils/colors';
import React, { useEffect, useState } from 'react';
import { RefreshCw, Calendar, Download, Activity, Database, BarChart3, PieChart, Info, History } from 'lucide-react';
import HistoryTab from './HistoryTab';
import { clearBetHistory, loadBetHistory } from '../utils/betHistory';
import type { GameHistoryEntry } from '../types';

export default function DataInsightCenter() {
  const [activeTab, setActiveTab] = useState<'status' | 'analysis' | 'search' | 'similar' | 'rules' | 'quality' | 'history'>('history');
  const [history, setHistory] = useState<GameHistoryEntry[]>(() =>
    typeof localStorage !== 'undefined' ? loadBetHistory() : [],
  );

  useEffect(() => {
    const refresh = () => setHistory(loadBetHistory());
    refresh();
    window.addEventListener('bacara-bet-history', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('bacara-bet-history', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const tabs = [
    { id: 'history', label: '게임 기록' },
    { id: 'status', label: '데이터 현황' },
    { id: 'analysis', label: '패턴 분석' },
    { id: 'search', label: '패턴 검색' },
    { id: 'similar', label: '유사 상황' },
    { id: 'rules', label: '규칙 연결' },
    { id: 'quality', label: '데이터 품질' }
  ] as const;

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar bg-zinc-950 flex flex-col">
      {/* Header */}
      <div className="p-6 lg:px-8 border-b border-zinc-800 bg-zinc-950/80 sticky top-0 z-10 backdrop-blur-md">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
          <div className="flex flex-col gap-1.5">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Database size={24} className="text-blue-500" />
              데이터 인사이트 센터
              <span className="text-xs font-normal text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full ml-2 border border-emerald-500/20">
                내 베팅 기록 {history.length}건
              </span>
            </h2>
            <p className="text-sm text-zinc-400">
              직접 베팅·오토베팅 정산/취소 결과가 여기에 쌓입니다.
            </p>
            <div className="flex items-start gap-2 mt-2 bg-amber-500/10 border border-amber-500/20 text-amber-500/90 text-xs px-3 py-2 rounded-lg max-w-2xl">
              <Info size={14} className="shrink-0 mt-0.5" />
              <span>샘플 데모 기록이 아니라, 이 브라우저에서 진행한 실제 베팅 기록입니다.</span>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setHistory(loadBetHistory())}
              className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-sm font-medium text-zinc-300 transition-colors flex items-center gap-2"
            >
              <RefreshCw size={14} /> 새로고침
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm('저장된 베팅 기록을 모두 지울까요?')) {
                  clearBetHistory();
                  setHistory([]);
                }
              }}
              className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-sm font-medium text-zinc-300 transition-colors flex items-center gap-2"
            >
              기록 비우기
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-bold rounded-lg whitespace-nowrap transition-colors ${
                activeTab === tab.id 
                  ? 'bg-zinc-800 text-white' 
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 lg:p-8 flex flex-col gap-6">
        {activeTab === 'history' ? (
          <HistoryTab history={history} />
        ) : activeTab === 'status' ? (
          <DataStatusTab />
        ) : activeTab === 'analysis' ? (
          <PatternAnalysisTab />
        ) : activeTab === 'search' ? (
          <PatternSearchTab />
        ) : activeTab === 'similar' ? (
          <SimilarSituationsTab />
        ) : activeTab === 'rules' ? (
          <RuleConnectionTab />
        ) : activeTab === 'quality' ? (
          <DataQualityTab />
        ) : (
          <div className="h-64 border border-dashed border-zinc-800 rounded-xl flex items-center justify-center text-zinc-500 bg-zinc-900/20">
            <div className="flex flex-col items-center gap-2">
              <BarChart3 size={32} className="opacity-50 mb-2" />
              <p className="font-medium text-zinc-400">{tabs.find(t => t.id === activeTab)?.label} 화면 준비 중입니다.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DataStatusTab() {
  return (
    <div className="flex flex-col gap-6">
      {/* 1. Core Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <SummaryCard 
          title="누적 수집 회차" 
          value="1,286,420" 
          unit="회" 
          subinfo="전일 대비 +12,480회" 
          trend="up" 
          color="text-blue-400"
        />
        <SummaryCard 
          title="분석 완료 회차" 
          value="1,251,938" 
          unit="회" 
          subinfo="전체 데이터의 97.3%" 
          trend="neutral" 
          color="text-emerald-400"
        />
        <SummaryCard 
          title="수집한 슈" 
          value="18,642" 
          unit="개" 
          subinfo="평균 67.1회차" 
          trend="neutral" 
          color="text-zinc-200"
        />
        <SummaryCard 
          title="분석 테이블" 
          value="38" 
          unit="개" 
          subinfo="현재 연결 8개" 
          trend="neutral" 
          color="text-amber-400"
        />
        <SummaryCard 
          title="데이터 수집 기간" 
          value="2026.01.01 ~ 현재" 
          unit="" 
          subinfo="192일" 
          trend="neutral" 
          color="text-zinc-200"
        />
        <SummaryCard 
          title="정상 데이터 비율" 
          value="98.6" 
          unit="%" 
          subinfo="검증 완료 데이터" 
          trend="up" 
          color="text-emerald-400"
        />
      </div>

      {/* 2. Distributions & Trends */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        
        {/* Left: Overall Result Distribution */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-zinc-200 text-lg flex items-center gap-2">
              <PieChart size={18} className="text-zinc-400" /> 전체 결과 분포
            </h3>
            <select className="bg-zinc-950 border border-zinc-800 text-xs text-zinc-400 rounded px-2 py-1 outline-none">
              <option>전체 기간</option>
              <option>최근 30일</option>
            </select>
          </div>

          <div className="flex-1 flex flex-col md:flex-row gap-8 items-center justify-center p-4">
            {/* Donut Chart Mock */}
            <div className="relative w-48 h-48 shrink-0">
              <svg viewBox="0 0 100 100" className="transform -rotate-90 w-full h-full">
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#18181b" strokeWidth="20" />
                {/* Tie: ~2% */}
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#10b981" strokeWidth="20" strokeDasharray="12 240" strokeDashoffset="0" />
                {/* Banker: ~49% */}
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#ef4444" strokeWidth="20" strokeDasharray="123 251" strokeDashoffset="-12" />
                {/* Player: ~49% */}
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#3b82f6" strokeWidth="20" strokeDasharray="123 251" strokeDashoffset="-135" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xs text-zinc-500 font-medium">전체 회차</span>
                <span className="text-lg font-bold text-zinc-200">1.28M</span>
              </div>
            </div>

            {/* Legend & Stats */}
            <div className="flex-1 flex flex-col gap-4 w-full">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-blue-500"></div>
                  <span className="text-zinc-300 font-bold">Player</span>
                </div>
                <div className="text-right">
                  <span className="font-mono text-zinc-200">624,318회</span>
                  <span className="text-xs text-zinc-500 ml-2">48.5%</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-red-500"></div>
                  <span className="text-zinc-300 font-bold">Banker</span>
                </div>
                <div className="text-right">
                  <span className="font-mono text-zinc-200">635,924회</span>
                  <span className="text-xs text-zinc-500 ml-2">49.4%</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-emerald-500"></div>
                  <span className="text-zinc-300 font-bold">Tie</span>
                </div>
                <div className="text-right">
                  <span className="font-mono text-zinc-200">26,178회</span>
                  <span className="text-xs text-zinc-500 ml-2">2.1%</span>
                </div>
              </div>
              
              {/* Stacked Bar */}
              <div className="h-4 w-full rounded-full overflow-hidden flex mt-2">
                <div className="h-full bg-blue-500" style={{ width: '48.5%' }}></div>
                <div className="h-full bg-red-500" style={{ width: '49.4%' }}></div>
                <div className="h-full bg-emerald-500" style={{ width: '2.1%' }}></div>
              </div>
            </div>
          </div>
          
          <div className="mt-4 text-center">
            <span className="text-[11px] text-zinc-500">전체 출현 비율은 다음 회차 결과를 보장하지 않습니다.</span>
          </div>
        </div>

        {/* Right: Data Accumulation Trend */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col">
          <div className="flex justify-between items-start mb-6 flex-wrap gap-4">
            <h3 className="font-bold text-zinc-200 text-lg flex items-center gap-2">
              <BarChart3 size={18} className="text-zinc-400" /> 데이터 누적 추이
            </h3>
            
            <div className="flex flex-col items-end gap-2">
              <select className="bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 rounded-lg px-3 py-1.5 outline-none font-medium">
                <option>일별 수집 회차</option>
                <option>주별 수집 회차</option>
                <option>월별 누적 회차</option>
                <option>누적 슈 수</option>
                <option>AI 분석 완료 데이터</option>
              </select>
              
              <div className="flex items-center gap-1 text-[11px] bg-zinc-950 rounded p-1 border border-zinc-800/50">
                <button className="px-2 py-1 rounded bg-zinc-800 text-zinc-300">최근 7일</button>
                <button className="px-2 py-1 rounded text-zinc-500 hover:text-zinc-300">최근 30일</button>
                <button className="px-2 py-1 rounded text-zinc-500 hover:text-zinc-300">최근 90일</button>
                <button className="px-2 py-1 rounded text-zinc-500 hover:text-zinc-300">올해</button>
              </div>
            </div>
          </div>

          <div className="flex-1 flex items-end justify-between gap-1 pt-8 pb-4 border-b border-zinc-800 relative group cursor-crosshair h-[180px]">
            {/* Mock Chart Bars */}
            {[10, 15, 12, 18, 24, 20, 35].map((val, i) => (
              <div key={i} className="w-full relative flex flex-col items-center justify-end h-full">
                <div 
                  className="w-4/5 bg-blue-500/80 hover:bg-blue-400 rounded-t-sm transition-all relative"
                  style={{ height: `${val * 2.5}%` }}
                >
                  {/* Mock Tooltip trigger on hover (CSS only for simplicity here) */}
                  <div className="opacity-0 hover:opacity-100 absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-zinc-800 text-white text-xs p-2 rounded shadow-xl whitespace-nowrap z-20 pointer-events-none transition-opacity">
                    <div className="font-bold text-blue-400 mb-1">07.0{i+1}</div>
                    <div className="flex justify-between gap-4">수집량 <span className="font-mono">{(val * 400).toLocaleString()}</span></div>
                    <div className="flex justify-between gap-4 text-emerald-400">정상 <span className="font-mono">{(val * 390).toLocaleString()}</span></div>
                    <div className="flex justify-between gap-4 text-red-400">오류 <span className="font-mono">{(val * 10).toLocaleString()}</span></div>
                  </div>
                </div>
                <span className="text-[10px] text-zinc-500 mt-2">7.{i+1}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Data Processing Status */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <h3 className="font-bold text-zinc-200 text-lg flex items-center gap-2 mb-6">
          <Activity size={18} className="text-zinc-400" /> 데이터 처리 흐름
        </h3>
        
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 relative">
          {/* Connecting line */}
          <div className="hidden md:block absolute top-1/2 left-0 right-0 h-0.5 bg-zinc-800 -translate-y-1/2 z-0"></div>
          
          <ProcessStep step={1} title="원본 결과 수집" value="1,286,420" />
          <ProcessStep step={2} title="중복 검사 통과" value="1,281,272" />
          <ProcessStep step={3} title="결과 판독 검증 완료" value="1,268,310" />
          <ProcessStep step={4} title="AI 분석 완료" value="1,251,938" />
          <ProcessStep step={5} title="패턴 분석 사용 가능" value="1,238,440" isLast />
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ title, value, unit, subinfo, trend, color }: { title: string, value: string, unit: string, subinfo: string, trend: 'up'|'down'|'neutral', color: string }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col justify-between hover:border-zinc-700 transition-colors">
      <div className="flex flex-col gap-1">
        <h4 className="text-xs font-bold text-zinc-500">{title}</h4>
        <div className="flex items-baseline gap-1 mt-1">
          <span className={`text-2xl font-mono font-bold ${color}`}>{value}</span>
          <span className="text-sm text-zinc-400">{unit}</span>
        </div>
      </div>
      
      <div className="flex justify-between items-end mt-4">
        <span className="text-[11px] text-zinc-400">{subinfo}</span>
        {trend === 'up' && (
          <svg width="24" height="12" viewBox="0 0 24 12" className="text-emerald-500 overflow-visible opacity-70">
            <polyline points="0,10 8,4 16,6 24,0" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
        {trend === 'down' && (
          <svg width="24" height="12" viewBox="0 0 24 12" className="text-red-500 overflow-visible opacity-70">
            <polyline points="0,2 8,8 16,6 24,12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>
    </div>
  );
}

function ProcessStep({ step, title, value, isLast = false }: { step: number, title: string, value: string, isLast?: boolean }) {
  return (
    <div className="relative z-10 flex flex-col items-center bg-zinc-900 border border-zinc-800 p-4 rounded-xl w-full md:w-auto md:min-w-[160px] shadow-lg">
      <div className="w-6 h-6 rounded-full bg-zinc-800 text-zinc-400 text-xs font-bold flex items-center justify-center mb-3">
        {step}
      </div>
      <h5 className="text-xs font-medium text-zinc-400 mb-1">{title}</h5>
      <span className={`text-lg font-mono font-bold ${isLast ? 'text-amber-400' : 'text-zinc-200'}`}>
        {value}<span className="text-xs font-sans text-zinc-500 font-normal ml-0.5">회</span>
      </span>
    </div>
  );
}


function PatternAnalysisTab() {
  const patterns = [
    { rank: 1, pattern: 'P-B-P', name: '한 번씩 교차 후 Player', total: 82430, ratio: '6.4%', month: 6218, trend: '+3.2%', isUp: true, sample: '충분' },
    { rank: 2, pattern: 'B-P-B', name: '한 번씩 교차 후 Banker', total: 81920, ratio: '6.3%', month: 6150, trend: '+2.8%', isUp: true, sample: '충분' },
    { rank: 3, pattern: 'P-P-B', name: '플레이어 2번 후 뱅커', total: 76540, ratio: '5.9%', month: 5820, trend: '-1.2%', isUp: false, sample: '충분' },
    { rank: 4, pattern: 'B-B-P', name: '뱅커 2번 후 플레이어', total: 75210, ratio: '5.8%', month: 5740, trend: '-0.8%', isUp: false, sample: '충분' },
    { rank: 5, pattern: 'P-B-P-B', name: '4연속 퐁당', total: 68320, ratio: '5.3%', month: 5120, trend: '+5.1%', isUp: true, sample: '충분' },
    { rank: 6, pattern: 'B-P-B-P', name: '4연속 퐁당 (B시작)', total: 67950, ratio: '5.2%', month: 5080, trend: '+4.8%', isUp: true, sample: '충분' },
    { rank: 7, pattern: 'P-P-P', name: '플레이어 3연속', total: 62140, ratio: '4.8%', month: 4890, trend: '-2.1%', isUp: false, sample: '충분' },
    { rank: 8, pattern: 'B-B-B', name: '뱅커 3연속', total: 61890, ratio: '4.8%', month: 4810, trend: '-1.5%', isUp: false, sample: '충분' },
    { rank: 9, pattern: 'P-P-B-P', name: 'P-P-B 후 꺾임', total: 45210, ratio: '3.5%', month: 3520, trend: '+1.1%', isUp: true, sample: '보통' },
    { rank: 10, pattern: 'B-B-P-B', name: 'B-B-P 후 꺾임', total: 44850, ratio: '3.4%', month: 3480, trend: '+0.9%', isUp: true, sample: '보통' }
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <div className="flex flex-col gap-1.5 mb-6">
          <h3 className="text-xl font-bold text-zinc-200">패턴 분석</h3>
          <p className="text-sm text-zinc-400">수집된 게임 결과에서 반복적으로 등장한 결과 조합과 연속 출현 빈도를 분석합니다.</p>
          <div className="flex items-start gap-2 mt-2 bg-amber-500/10 border border-amber-500/20 text-amber-500/90 text-xs px-3 py-2 rounded-lg w-fit">
            <Info size={14} className="shrink-0 mt-0.5" />
            <span>자주 등장한 패턴이 다음에도 반복된다는 의미는 아닙니다.</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mb-6">
          <select className="bg-zinc-950 border border-zinc-800 text-sm text-zinc-300 rounded-lg px-3 py-2 outline-none">
            <option>최근 7일</option>
            <option>최근 30일</option>
            <option>최근 90일</option>
            <option>올해</option>
            <option>전체 기간</option>
          </select>
          <select className="bg-zinc-950 border border-zinc-800 text-sm text-zinc-300 rounded-lg px-3 py-2 outline-none">
            <option>특정 테이블 (전체)</option>
            <option>스피드 바카라 A</option>
            <option>라이트닝 바카라</option>
          </select>
          <select className="bg-zinc-950 border border-zinc-800 text-sm text-zinc-300 rounded-lg px-3 py-2 outline-none">
            <option>슈 구간 (전체)</option>
            <option>초반 (1~20)</option>
            <option>중반 (21~40)</option>
            <option>후반 (41~)</option>
          </select>
          <select className="bg-zinc-950 border border-zinc-800 text-sm text-zinc-300 rounded-lg px-3 py-2 outline-none">
            <option>Tie 포함 여부 (제외)</option>
            <option>Tie 포함</option>
          </select>
          <select className="bg-zinc-950 border border-zinc-800 text-sm text-zinc-300 rounded-lg px-3 py-2 outline-none">
            <option>최소 표본 수 (10,000 이상)</option>
            <option>5,000 이상</option>
            <option>1,000 이상</option>
          </select>
        </div>

        <h4 className="font-bold text-zinc-200 mb-4 flex items-center gap-2">
          많이 나온 패턴 TOP 10
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {patterns.map(p => (
            <div key={p.rank} className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 flex flex-col relative overflow-hidden group hover:border-zinc-700 transition-colors">
              <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-zinc-800/50 to-transparent -z-10 group-hover:from-zinc-700/50 transition-colors"></div>
              
              <div className="flex justify-between items-start mb-3">
                <span className="text-2xl font-black text-zinc-800 group-hover:text-zinc-700 transition-colors">{p.rank}위</span>
                <span className={`text-xs px-2 py-1 rounded font-medium ${p.sample === '충분' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
                  표본 {p.sample}
                </span>
              </div>
              
              <div className="flex gap-1.5 mb-2">
                {p.pattern.split('-').map((res, i) => (
                  <span key={i} className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${getResultColor(res, 'bg')}`}>
                    {res}
                  </span>
                ))}
              </div>
              
              <p className="text-sm font-medium text-zinc-300 mb-4 h-5">{p.name}</p>
              
              <div className="grid grid-cols-2 gap-y-3 gap-x-2 mt-auto">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-zinc-500">전체 출현</span>
                  <span className="text-sm font-mono text-zinc-200">{p.total.toLocaleString()}회</span>
                </div>
                <div className="flex flex-col gap-0.5 text-right">
                  <span className="text-[10px] text-zinc-500">전체 대비</span>
                  <span className="text-sm font-mono text-zinc-300">{p.ratio}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-zinc-500">최근 30일</span>
                  <span className="text-sm font-mono text-zinc-400">{p.month.toLocaleString()}회</span>
                </div>
                <div className="flex flex-col gap-0.5 text-right">
                  <span className="text-[10px] text-zinc-500">전월 대비</span>
                  <span className={`text-sm font-mono font-medium ${p.isUp ? 'text-emerald-400' : 'text-red-400'}`}>
                    {p.trend}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


function PatternSearchTab() {
  const [pattern, setPattern] = React.useState([]);

  const addResult = (res) => {
    if (pattern.length < 10) setPattern([...pattern, res]);
  };

  const removeLast = () => {
    setPattern(pattern.slice(0, -1));
  };

  const clearAll = () => {
    setPattern([]);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <div className="flex flex-col gap-1.5 mb-6">
          <h3 className="text-xl font-bold text-zinc-200">패턴 검색기</h3>
          <p className="text-sm text-zinc-400">Player, Banker, Tie 결과 조합을 입력하여 과거 출현 횟수와 이후 결과 분포를 확인합니다.</p>
          <div className="flex items-start gap-2 mt-2 bg-amber-500/10 border border-amber-500/20 text-amber-500/90 text-xs px-3 py-2 rounded-lg w-fit">
            <Info size={14} className="shrink-0 mt-0.5" />
            <span>검색 결과는 과거 데이터의 분포이며 다음 결과를 보장하지 않습니다.</span>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Input Area */}
          <div className="flex-1 flex flex-col gap-4">
            <h4 className="font-bold text-zinc-300">시각적 패턴 입력기</h4>
            
            <div className="min-h-[64px] bg-zinc-950 border border-zinc-800 rounded-xl p-4 flex items-center flex-wrap gap-2">
              {pattern.length === 0 ? (
                <span className="text-zinc-500 text-sm">아래 버튼을 눌러 패턴을 입력하세요...</span>
              ) : (
                pattern.map((p, i) => (
                  <React.Fragment key={i}>
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${getResultColor(p, 'bg')}`}>
                      {p}
                    </span>
                    {i < pattern.length - 1 && <span className="text-zinc-600 font-bold">→</span>}
                  </React.Fragment>
                ))
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <button onClick={() => addResult('P')} className="flex-1 py-3 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg font-bold transition-colors">Player</button>
              <button onClick={() => addResult('B')} className="flex-1 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg font-bold transition-colors">Banker</button>
              <button onClick={() => addResult('T')} className="flex-1 py-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg font-bold transition-colors">Tie</button>
            </div>
            
            <div className="flex gap-2">
              <button onClick={removeLast} disabled={pattern.length === 0} className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-300 rounded-lg text-sm font-medium transition-colors">마지막 입력 삭제</button>
              <button onClick={clearAll} disabled={pattern.length === 0} className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-300 rounded-lg text-sm font-medium transition-colors">전체 초기화</button>
            </div>
          </div>

          {/* Result Area */}
          <div className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl p-6">
            <h4 className="font-bold text-zinc-300 mb-6 flex items-center justify-between">
              <span>패턴 검색 결과</span>
              {pattern.length > 0 && <span className="text-xs font-mono text-amber-500 bg-amber-500/10 px-2 py-1 rounded">데이터 1.28M 기준</span>}
            </h4>
            
            {pattern.length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center text-zinc-500 gap-2">
                <BarChart3 size={32} className="opacity-50" />
                <p className="text-sm">패턴을 입력하면 검색 결과가 표시됩니다.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-6 animate-in fade-in duration-300">
                <div className="flex flex-col gap-1">
                  <span className="text-sm text-zinc-400">과거 출현 횟수</span>
                  <span className="text-3xl font-mono font-bold text-zinc-100">{(Math.floor(82430 / Math.pow(1.8, pattern.length))).toLocaleString()}<span className="text-sm text-zinc-500 font-sans ml-1">회</span></span>
                </div>
                
                <div className="flex flex-col gap-3">
                  <span className="text-sm text-zinc-400">이후 결과 분포</span>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                      <span className="w-4 h-4 rounded bg-blue-500 shrink-0"></span>
                      <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500" style={{ width: '42%' }}></div>
                      </div>
                      <span className="w-12 text-right font-mono text-sm text-blue-400">42.0%</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="w-4 h-4 rounded bg-red-500 shrink-0"></span>
                      <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-red-500" style={{ width: '48%' }}></div>
                      </div>
                      <span className="w-12 text-right font-mono text-sm text-red-400">48.0%</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="w-4 h-4 rounded bg-emerald-500 shrink-0"></span>
                      <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500" style={{ width: '10%' }}></div>
                      </div>
                      <span className="w-12 text-right font-mono text-sm text-emerald-400">10.0%</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SimilarSituationsTab() {
  return (
    <div className="flex flex-col gap-6">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
        <div className="flex flex-col gap-1.5 mb-6">
          <h3 className="text-xl font-bold text-zinc-200">유사 상황 검색</h3>
          <p className="text-sm text-zinc-400">현재 게임 상황과 유사한 과거 데이터를 확인하고 분석합니다.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 flex flex-col gap-4">
            <h4 className="font-bold text-zinc-300 text-sm">현재 선택된 테이블</h4>
            <div className="bg-zinc-950 border border-amber-500/30 rounded-xl p-4">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h5 className="font-bold text-white">스피드 바카라 A</h5>
                  <span className="text-xs text-zinc-500">BACC-SPD-A • 68회차</span>
                </div>
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              </div>
              
              <div className="flex flex-col gap-2">
                <span className="text-xs text-zinc-400">최근 흐름 (마지막 5회)</span>
                <div className="flex gap-1">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs text-white bg-blue-500">P</span>
                  <span className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs text-white bg-blue-500">P</span>
                  <span className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs text-white bg-red-500">B</span>
                  <span className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs text-white bg-blue-500">P</span>
                  <span className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs text-white bg-red-500 ring-2 ring-white/20">B</span>
                </div>
              </div>
            </div>
            
            <button className="py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-medium transition-colors">테이블 변경</button>
          </div>

          <div className="lg:col-span-2 flex flex-col gap-4">
            <h4 className="font-bold text-zinc-300 text-sm">유사 과거 상황 분석 결과</h4>
            
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Activity className="text-amber-500" size={24} />
                  <div>
                    <div className="text-sm text-zinc-400">발견된 과거 유사 사례</div>
                    <div className="text-2xl font-mono font-bold text-zinc-200">4,218<span className="text-sm font-sans font-normal text-zinc-500 ml-1">건</span></div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-zinc-400">가장 유력한 다음 결과</div>
                  <div className="text-2xl font-bold text-blue-400">PLAYER</div>
                </div>
              </div>
              
              <div className="h-px bg-zinc-800 w-full"></div>
              
              <div className="flex flex-col gap-4">
                <h5 className="text-sm font-medium text-zinc-300">이후 결과 실제 분포</h5>
                
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-4">
                    <span className="w-16 font-bold text-blue-400">Player</span>
                    <div className="flex-1 h-3 bg-zinc-900 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500" style={{ width: '62.8%' }}></div>
                    </div>
                    <span className="w-16 text-right font-mono text-zinc-300">62.8%</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="w-16 font-bold text-red-400">Banker</span>
                    <div className="flex-1 h-3 bg-zinc-900 rounded-full overflow-hidden">
                      <div className="h-full bg-red-500" style={{ width: '31.2%' }}></div>
                    </div>
                    <span className="w-16 text-right font-mono text-zinc-300">31.2%</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="w-16 font-bold text-emerald-400">Tie</span>
                    <div className="flex-1 h-3 bg-zinc-900 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: '6.0%' }}></div>
                    </div>
                    <span className="w-16 text-right font-mono text-zinc-300">6.0%</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-start gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs px-4 py-3 rounded-lg">
                <Info size={16} className="shrink-0 mt-0.5" />
                <div className="flex flex-col gap-1">
                  <span className="font-bold text-sm">AI 인사이트</span>
                  <p className="text-blue-400/80 leading-relaxed">
                    과거 4,218건의 유사한 맥락(P-P-B-P-B)에서 다음 결과로 Player가 나온 확률이 62.8%로 상당히 높았습니다. 이 흐름은 전형적인 퐁당 전환 패턴으로 분석됩니다.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


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
              <span className={`text-xl font-bold ${item.color}`}>{item.value}</span>
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
                  <span className={`text-xs px-2 py-0.5 rounded-full mb-2 ${item.color}`}>{item.label}</span>
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
                    <div className="w-full bg-emerald-500/80 rounded-t-sm" style={{ height: `${val}%` }}></div>
                    <div className="w-full bg-red-500/80" style={{ height: `${100 - val}%` }}></div>
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
