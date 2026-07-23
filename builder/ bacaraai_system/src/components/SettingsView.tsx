import React from 'react';
import { Settings, RefreshCw, PowerOff, Play, MonitorPlay, Sparkles, Volume2, Aperture } from 'lucide-react';
import ScreenHelpBanner from './ScreenHelpBanner';
import useSoundSettings from '../hooks/useSoundSettings';
import { previewSfx, type SfxName } from '../audio/sfxEngine';
import { useFxIntensity, type FxIntensity } from '../hooks/useFxIntensity';
import { playSfx } from '../audio/sfxEngine';

interface SettingsViewProps {
  onReplayOnboarding: () => void;
  onStartRealSession: () => void;
  beginnerMode?: boolean;
  onToggleBeginnerMode?: () => void;
}

const PREVIEW_SOUNDS: { id: SfxName; label: string }[] = [
  { id: 'chip', label: '칩' },
  { id: 'chipHeavy', label: '고액 칩' },
  { id: 'betConfirm', label: '베팅 확정' },
  { id: 'sessionStart', label: '오토베팅 시작' },
  { id: 'ruleTrigger', label: '규칙 발동' },
  { id: 'aiReady', label: 'AI 의견' },
  { id: 'notification', label: '알림' },
  { id: 'risk', label: '위험' },
  { id: 'win', label: '윈컷' },
  { id: 'loss', label: '로스컷' },
  { id: 'shuffle', label: '셔플' },
  { id: 'sessionStop', label: '오토베팅 종료' },
];

export default function SettingsView({
  onReplayOnboarding,
  onStartRealSession,
  beginnerMode = true,
  onToggleBeginnerMode,
}: SettingsViewProps) {
  const sound = useSoundSettings();
  const fx = useFxIntensity();
  const fxLevels: { id: FxIntensity; label: string; hint: string }[] = [
    { id: 'low', label: '적음', hint: '필수 피드백만' },
    { id: 'medium', label: '보통', hint: '추천 기본값' },
    { id: 'high', label: '화려함', hint: '파티클·레이더 최대' },
  ];

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
              <Volume2 className="text-amber-500" size={20} />
              사운드 효과
            </h3>
            <p className="text-sm text-zinc-400 mb-5 leading-relaxed">
              칩·베팅·오토베팅·위험·윈컷/로스컷 등 게임형 효과음입니다. 브라우저에서 첫 클릭 후부터 재생됩니다.
            </p>

            <div className="space-y-4 mb-5">
              <div className="flex justify-between items-center py-2 border-b border-zinc-800/50">
                <div>
                  <div className="text-sm font-medium text-zinc-200">효과음</div>
                  <div className="text-xs text-zinc-500 mt-1">버튼·베팅·알림·오토베팅 이벤트 소리</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    sound.toggleEnabled();
                    if (!sound.enabled) previewSfx('toggle');
                  }}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                    sound.enabled
                      ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                      : 'bg-zinc-800 text-zinc-500 border-zinc-700'
                  }`}
                >
                  {sound.enabled ? '켜짐' : '꺼짐'}
                </button>
              </div>

              <div className="flex justify-between items-center gap-4 py-2 border-b border-zinc-800/50">
                <div className="shrink-0">
                  <div className="text-sm font-medium text-zinc-200">볼륨</div>
                  <div className="text-xs text-zinc-500 mt-1">{Math.round(sound.volume * 100)}%</div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(sound.volume * 100)}
                  onChange={(e) => sound.setVolume(Number(e.target.value) / 100)}
                  onMouseUp={() => previewSfx('chip')}
                  onTouchEnd={() => previewSfx('chip')}
                  className="flex-1 accent-amber-500"
                  disabled={!sound.enabled}
                />
              </div>

              <div className="flex justify-between items-center py-2 border-b border-zinc-800/50">
                <div>
                  <div className="text-sm font-medium text-zinc-200">분위기음</div>
                  <div className="text-xs text-zinc-500 mt-1">낮은 배경 톤 + 은은한 테이블 소음</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    sound.toggleAmbient();
                    previewSfx('ui');
                  }}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                    sound.ambient
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                      : 'bg-zinc-800 text-zinc-500 border-zinc-700'
                  }`}
                >
                  {sound.ambient ? '켜짐' : '꺼짐'}
                </button>
              </div>
            </div>

            <div className="text-xs text-zinc-500 mb-3">미리듣기</div>
            <div className="flex flex-wrap gap-2">
              {PREVIEW_SOUNDS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => previewSfx(item.id)}
                  disabled={!sound.enabled}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 disabled:opacity-40 transition-colors"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 className="font-bold text-lg text-zinc-100 mb-4 flex items-center gap-2">
              <Aperture className="text-amber-500" size={20} />
              연출 강도
            </h3>
            <p className="text-sm text-zinc-400 mb-5 leading-relaxed">
              테이블 히트, AI 슬롯, 레이더, 위험 글로우 등 시각 연출의 세기입니다. 사운드와는 별개로 조절됩니다.
            </p>
            <div className="grid grid-cols-3 gap-2">
              {fxLevels.map((level) => (
                <button
                  key={level.id}
                  type="button"
                  onClick={() => {
                    fx.setIntensity(level.id);
                    playSfx('toggle');
                  }}
                  className={`px-3 py-3 rounded-xl border text-center transition-colors ${
                    fx.intensity === level.id
                      ? 'bg-amber-500/15 border-amber-400/50 text-amber-200'
                      : 'bg-zinc-950 border-zinc-700 text-zinc-400 hover:border-zinc-500'
                  }`}
                >
                  <div className="text-sm font-bold">{level.label}</div>
                  <div className="text-[10px] mt-1 opacity-80">{level.hint}</div>
                </button>
              ))}
            </div>
          </div>

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
                onClick={() => alert('오토베팅은 상단 바에서 설정·종료할 수 있습니다.')}
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
                오토베팅 설정 열기
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
