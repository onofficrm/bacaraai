import React from 'react';
import { Settings, RefreshCw, PowerOff, Play, MonitorPlay, Sparkles } from 'lucide-react';
import ScreenHelpBanner from './ScreenHelpBanner';

interface SettingsViewProps {
  onReplayOnboarding: () => void;
  onStartRealSession: () => void;
  beginnerMode?: boolean;
  onToggleBeginnerMode?: () => void;
}

export default function SettingsView({
  onReplayOnboarding,
  onStartRealSession,
  beginnerMode = true,
  onToggleBeginnerMode,
}: SettingsViewProps) {
  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-zinc-950">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Settings size={24} className="text-zinc-400" />
            설정 및 데모 관리
          </h2>
          <span className="text-[10px] font-normal text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            마지막 업데이트: 방금 전
          </span>
        </div>

        <ScreenHelpBanner screen="settings" beginnerMode={beginnerMode} />

        <div className="grid gap-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="font-bold text-lg text-zinc-100 mb-4 flex items-center gap-2">
              <Sparkles className="text-amber-500" size={20} />
              초보자 모드
            </h3>
            <p className="text-sm text-zinc-400 mb-4 leading-relaxed">
              켜면 화면 안내 배너, 용어 설명(?), AI 추천 행동 문구가 표시됩니다.
              익숙해지면 끄셔도 됩니다. 도움말 탭에서도 바꿀 수 있습니다.
            </p>
            <button
              type="button"
              onClick={onToggleBeginnerMode}
              className={`px-4 py-2 rounded-lg text-sm font-bold border transition-colors ${
                beginnerMode
                  ? 'bg-amber-500 text-zinc-950 border-amber-400'
                  : 'bg-zinc-800 text-zinc-300 border-zinc-700'
              }`}
            >
              초보자 모드 {beginnerMode ? 'ON' : 'OFF'}
            </button>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="font-bold text-lg text-zinc-100 mb-4 flex items-center gap-2">
              <MonitorPlay className="text-amber-500" size={20} />
              데모 모드 관리
            </h3>
            <p className="text-sm text-zinc-400 mb-6">
              현재 데모 데이터(샘플 테이블, 가상 AI 분석)를 사용 중입니다. 실제 카지노 베팅이 아닌 연습 환경입니다.
              가상머니는 관리자가 지급한 연습용 시드입니다.
            </p>
            
            <div className="flex flex-wrap gap-4">
              <button 
                onClick={() => alert('데모가 초기화되었습니다.')}
                className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <RefreshCw size={16} />
                데모 초기화
              </button>
              <button 
                onClick={() => alert('실제 세션 설정 화면은 준비 중입니다.')}
                className="bg-red-950/40 border border-red-900/50 hover:bg-red-900/50 text-red-400 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <PowerOff size={16} />
                데모 종료
              </button>
              <button 
                onClick={onStartRealSession}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <Play size={16} />
                세션 설정 열기
              </button>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="font-bold text-lg text-zinc-100 mb-4">앱 설정</h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-zinc-800/50">
                <div>
                  <div className="text-sm font-medium text-zinc-200">온보딩 다시 보기</div>
                  <div className="text-xs text-zinc-500 mt-1">처음 사용 안내와 안전 수칙을 다시 확인합니다.</div>
                </div>
                <button 
                  onClick={onReplayOnboarding}
                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-4 py-2 rounded-lg text-sm transition-colors"
                >
                  시작하기
                </button>
              </div>
              
              <div className="flex justify-between items-center py-3 border-b border-zinc-800/50">
                <div>
                  <div className="text-sm font-medium text-zinc-200">알림 소리</div>
                  <div className="text-xs text-zinc-500 mt-1">위험 감지 및 마틴 성공 시 소리 재생</div>
                </div>
                <button className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-4 py-1.5 rounded-full text-xs font-bold">
                  켜짐
                </button>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="font-bold text-lg text-zinc-100 mb-4">오류 로그</h3>
            <div className="flex-1 flex items-center justify-center h-24 text-zinc-500 text-sm bg-zinc-950 rounded-lg border border-zinc-800/50">
              기록된 오류 로그가 없습니다.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
