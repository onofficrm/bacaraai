import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface StopSessionModalProps {
  type: 'wincut' | 'losscut' | 'error' | null;
  onClose: () => void;
}

export default function StopSessionModal({ type, onClose }: StopSessionModalProps) {
  if (!type) return null;

  let Icon = AlertTriangle;
  let title = '';
  let message = '';
  let color = '';
  let bgClass = '';

  if (type === 'wincut') {
    Icon = CheckCircle;
    title = '목표 수익 달성 (윈컷)';
    message = '설정한 목표 수익에 도달하여 진행이 자동 종료되었습니다. 최종 손익과 상세 기록을 확인하세요.';
    color = 'text-emerald-400';
    bgClass = 'bg-emerald-500/10 border-emerald-500/30';
  } else if (type === 'losscut') {
    Icon = XCircle;
    title = '손실 한도 도달 (로스컷)';
    message = '위험 관리 설정에 따라 손실 한도에 도달하여 모든 진행이 즉시 중단되었습니다. 자동 재시작이 제한됩니다.';
    color = 'text-red-400';
    bgClass = 'bg-red-500/10 border-red-500/30';
  } else {
    Icon = AlertTriangle;
    title = '시스템 오류 발생';
    message = '연결 상태가 불안정하거나 AI 응답이 지연되어 안전을 위해 일시 중단되었습니다.';
    color = 'text-amber-400';
    bgClass = 'bg-amber-500/10 border-amber-500/30';
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className={`border rounded-2xl w-full max-w-md p-6 shadow-2xl flex flex-col items-center text-center ${bgClass} bg-zinc-950`}>
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${color} bg-zinc-900/50`}>
          <Icon size={32} />
        </div>
        
        <h2 className={`text-2xl font-bold mb-2 ${color}`}>{title}</h2>
        <p className="text-zinc-300 text-sm leading-relaxed mb-8">
          {message}
        </p>

        <div className="flex gap-3 w-full">
          <button 
            onClick={onClose}
            className="flex-1 py-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl font-bold transition-colors border border-zinc-800"
          >
            기록 확인
          </button>
          <button 
            onClick={onClose}
            className={`flex-1 py-3 rounded-xl font-bold transition-colors ${
              type === 'wincut' ? 'bg-emerald-500 hover:bg-emerald-600 text-zinc-950' : 
              type === 'losscut' ? 'bg-red-500 hover:bg-red-600 text-white' : 
              'bg-amber-500 hover:bg-amber-600 text-zinc-950'
            }`}
          >
            {type === 'error' ? '재연결 시도' : '세션 종료'}
          </button>
        </div>
      </div>
    </div>
  );
}
