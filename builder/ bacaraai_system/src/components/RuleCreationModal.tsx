import { X, Sparkles, RefreshCw, PlayCircle, Save, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import MartingaleVisualizer from './MartingaleVisualizer';

interface RuleCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RuleCreationModal({ isOpen, onClose }: RuleCreationModalProps) {
  const [inputText, setInputText] = useState('플레이어가 두 번 연속 나오면 다음에도 플레이어를 선택하고, 초기 금액은 1만원, 패배하면 두 배로 올리고 최대 8단계까지만 진행해줘. 타이는 무효로 처리해줘.');
  const [isParsing, setIsParsing] = useState(false);
  const [parsed, setParsed] = useState(false);

  if (!isOpen) return null;

  const handleParse = () => {
    setIsParsing(true);
    setParsed(false);
    setTimeout(() => {
      setIsParsing(false);
      setParsed(true);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Sparkles className="text-amber-500" />
            AI로 규칙 만들기
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors bg-zinc-900 hover:bg-zinc-800 p-2 rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 custom-scrollbar">
          
          {/* Input Area */}
          <div className="flex flex-col gap-3">
            <label className="text-sm font-bold text-zinc-400">자연어로 조건 입력</label>
            <div className="relative">
              <textarea 
                className="w-full h-32 bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500/50 resize-none leading-relaxed transition-colors"
                placeholder="예: 뱅커가 3번 나오면 다음은 플레이어에 2만원..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
              />
              <button 
                onClick={handleParse}
                disabled={isParsing || !inputText}
                className="absolute bottom-4 right-4 bg-amber-500 hover:bg-amber-600 text-zinc-950 px-4 py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isParsing ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {isParsing ? '분석 중...' : '규칙 생성'}
              </button>
            </div>
          </div>

          {/* Parsed Result */}
          {parsed && (
            <div className="flex flex-col gap-4 animate-in slide-in-from-bottom-4 duration-300">
              <h3 className="text-sm font-bold text-amber-500 border-b border-amber-500/20 pb-2">AI 구조화 결과</h3>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <ParseItem label="규칙명" value="Player 2연속 추종" />
                <ParseItem label="발동 조건" value="Player 2회 연속 출현 시" />
                <ParseItem label="선택 위치" value="PLAYER" highlight />
                <ParseItem label="초기 금액" value="10,000원" />
                <ParseItem label="배팅 증가 방식" value="패배 시 2배 (마틴게일)" />
                <ParseItem label="최대 단계" value="8단계" highlight />
                <ParseItem label="타이 처리 방식" value="무효 (현재 단계 유지)" />
                <ParseItem label="승리 후 처리" value="1단계로 초기화" />
                <ParseItem label="패배 후 처리" value="다음 단계로 진행" />
                <ParseItem label="슈 변경 시 처리" value="진행 상태 초기화" />
                <ParseItem label="동일 구간 중복" value="1회만 진입" />
              </div>

              {/* Summary & Warning */}
              <div className="mt-2 flex flex-col gap-4">
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-sm text-zinc-300 leading-relaxed">
                  <span className="font-bold text-white mr-2">최종 요약:</span>
                  Player가 2회 연속 나온 직후 Player를 참고 대상으로 표시합니다. 초기 금액은 10,000원이며 패배 시 2배 증가합니다. 최대 8단계까지 진행하며 전체 단계 진행에는 <span className="text-amber-400 font-mono font-bold">최대 2,550,000원</span>이 필요합니다.
                </div>

                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                  <MartingaleVisualizer currentStage={1} maxStages={8} baseAmount={10000} />
                </div>

                <div className="bg-red-950/20 border border-red-900/30 rounded-xl p-4 flex items-start gap-3 text-sm text-red-400">
                  <ShieldAlert size={18} className="shrink-0 mt-0.5" />
                  <p>
                    <strong className="block mb-1">위험 안내</strong>
                    8단계까지 모두 실패하면 설정된 로스컷을 초과할 수 있습니다.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {parsed && (
          <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900/50 flex justify-between items-center">
            <button className="flex items-center gap-2 text-zinc-400 hover:text-white px-3 py-2 rounded-lg hover:bg-zinc-800 transition-colors text-sm">
              <RefreshCw size={16} /> 규칙 다시 해석
            </button>
            <div className="flex gap-2">
              <button className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                수정
              </button>
              <button className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                <PlayCircle size={16} /> 과거 데이터 시뮬레이션
              </button>
              <button 
                onClick={onClose}
                className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-zinc-950 px-6 py-2 rounded-lg text-sm font-bold transition-colors"
              >
                <Save size={16} /> 저장
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function ParseItem({ label, value, highlight = false }: { label: string, value: string, highlight?: boolean }) {
  return (
    <div className="flex flex-col gap-1 bg-zinc-900/50 p-3 rounded-lg border border-zinc-800/50">
      <span className="text-[10px] text-zinc-500">{label}</span>
      <span className={`text-sm font-medium ${highlight ? 'text-amber-400 font-bold' : 'text-zinc-200'}`}>{value}</span>
    </div>
  );
}
