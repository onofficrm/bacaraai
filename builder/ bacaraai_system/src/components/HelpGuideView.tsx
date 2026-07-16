import {
  BookOpen,
  CircleHelp,
  ListOrdered,
  Shield,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { BEGINNER_FLOW, GLOSSARY } from '../help/glossary';
import HelpTooltip from './HelpTooltip';

type HelpGuideViewProps = {
  beginnerMode: boolean;
  onToggleBeginnerMode: () => void;
  onReplayOnboarding: () => void;
};

export default function HelpGuideView({
  beginnerMode,
  onToggleBeginnerMode,
  onReplayOnboarding,
}: HelpGuideViewProps) {
  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 lg:p-6 bg-zinc-950">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2 mb-2">
            <CircleHelp className="text-amber-400" size={24} />
            도움말 센터
          </h2>
          <p className="text-sm text-zinc-400">
            처음 사용하는 분도 따라하기 쉽게, 핵심 흐름과 용어를 모았습니다.
          </p>
        </div>

        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="font-bold text-zinc-100 flex items-center gap-2">
              <Sparkles size={18} className="text-amber-400" />
              초보자 모드
            </h3>
            <button
              type="button"
              onClick={onToggleBeginnerMode}
              className={`px-3 py-1.5 rounded-lg text-sm font-bold border transition-colors ${
                beginnerMode
                  ? 'bg-amber-500 text-zinc-950 border-amber-400'
                  : 'bg-zinc-800 text-zinc-300 border-zinc-700'
              }`}
            >
              {beginnerMode ? 'ON' : 'OFF'}
            </button>
          </div>
          <p className="text-sm text-zinc-400 leading-relaxed mb-4">
            켜면 화면 상단 안내, 용어 설명, AI 추천 행동 문구가 더 자세히 표시됩니다.
          </p>
          <button
            type="button"
            onClick={onReplayOnboarding}
            className="text-sm font-medium text-amber-400 hover:text-amber-300"
          >
            첫 사용 안내 다시 보기 →
          </button>
        </section>

        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <h3 className="font-bold text-zinc-100 flex items-center gap-2 mb-4">
            <ListOrdered size={18} className="text-blue-400" />
            처음 사용하는 법
          </h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {BEGINNER_FLOW.map((item) => (
              <div
                key={item.step}
                className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4"
              >
                <p className="text-xs font-bold text-amber-400 mb-1">STEP {item.step}</p>
                <p className="text-sm font-bold text-white mb-1">{item.title}</p>
                <p className="text-xs text-zinc-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <h3 className="font-bold text-zinc-100 flex items-center gap-2 mb-4">
            <BookOpen size={18} className="text-emerald-400" />
            용어 설명
          </h3>
          <div className="space-y-3">
            {GLOSSARY.map((term) => (
              <div
                key={term.id}
                className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-4"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <p className="text-sm font-bold text-white">{term.label}</p>
                  <HelpTooltip termId={term.id} />
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">{term.short}</p>
                {term.example && (
                  <p className="text-[11px] text-zinc-500 mt-2 leading-relaxed">{term.example}</p>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <h3 className="font-bold text-zinc-100 flex items-center gap-2 mb-3">
            <Wallet size={18} className="text-amber-400" />
            가상머니 안내
          </h3>
          <ul className="space-y-2 text-sm text-zinc-300 leading-relaxed">
            <li>• 실제 돈이 아닌 연습용 시드입니다.</li>
            <li>• 관리자가 지급한 금액 안에서만 시뮬레이션합니다.</li>
            <li>• 잔액은 헤더의 가상머니에서 확인할 수 있습니다.</li>
            <li>• 세션 종료 후 기록으로 복습할 수 있습니다.</li>
          </ul>
        </section>

        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <h3 className="font-bold text-zinc-100 flex items-center gap-2 mb-3">
            <Shield size={18} className="text-red-400" />
            안전하게 쓰는 법
          </h3>
          <ul className="space-y-2 text-sm text-zinc-300 leading-relaxed">
            <li>• 이 시스템은 결과 예측기가 아니라 판단 보조 도구입니다.</li>
            <li>• AI 의견 일치도가 높아도 수익을 보장하지 않습니다.</li>
            <li>• 로스컷·윈컷을 먼저 정하고, 한도에 가까우면 쉬세요.</li>
            <li>• 데이터가 부족하거나 위험 차단이면 관망이 정답일 수 있습니다.</li>
          </ul>
        </section>

        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <h3 className="font-bold text-zinc-100 mb-3">자주 묻는 질문</h3>
          <div className="space-y-4 text-sm">
            <div>
              <p className="font-bold text-zinc-200 mb-1">회원가입은 어디서 하나요?</p>
              <p className="text-zinc-400 leading-relaxed">
                공개 가입은 받지 않습니다. 관리자가 아이디·비밀번호·가상머니를 발급합니다.
              </p>
            </div>
            <div>
              <p className="font-bold text-zinc-200 mb-1">AI가 틀린 경우는요?</p>
              <p className="text-zinc-400 leading-relaxed">
                가능합니다. AI는 참고 정보만 제공하며, 최종 판단과 책임은 사용자에게 있습니다.
              </p>
            </div>
            <div>
              <p className="font-bold text-zinc-200 mb-1">초보자 모드를 끄면?</p>
              <p className="text-zinc-400 leading-relaxed">
                화면 안내 문구가 줄어들고 숙련자용으로 더 간결해집니다. 언제든 다시 켤 수 있습니다.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
