export const RESULT_COLORS = {
  PLAYER: "#2563EB",
  P: "#2563EB",
  BANKER: "#EF4444",
  B: "#EF4444",
  TIE: "#10B981",
  T: "#10B981",
  DATA_ERROR: "#991B1B",
  WAIT: "#f59e0b",
  SKIP: "#f59e0b",
};

export function getResultColor(result: string, type: 'bg' | 'text' | 'border' = 'bg') {
  if (!result) return type === 'bg' ? 'bg-zinc-700' : type === 'text' ? 'text-zinc-500' : 'border-zinc-700';
  const upper = result.toUpperCase();
  
  if (upper === 'PLAYER' || upper === 'P') {
    if (type === 'bg') return 'bg-blue-600';
    if (type === 'text') return 'text-blue-400';
    if (type === 'border') return 'border-blue-500';
  }
  if (upper === 'BANKER' || upper === 'B') {
    if (type === 'bg') return 'bg-red-500';
    if (type === 'text') return 'text-red-400';
    if (type === 'border') return 'border-red-500';
  }
  if (upper === 'TIE' || upper === 'T') {
    if (type === 'bg') return 'bg-emerald-500';
    if (type === 'text') return 'text-emerald-400';
    if (type === 'border') return 'border-emerald-500';
  }
  if (upper === 'DATA_ERROR' || upper === 'CONFLICT' || upper === 'ERROR') {
    if (type === 'bg') return 'bg-red-900';
    if (type === 'text') return 'text-red-800';
    if (type === 'border') return 'border-red-900';
  }
  if (upper === 'WAIT' || upper === 'SKIP' || upper === 'OBSERVE' || upper === 'PAUSE') {
    if (type === 'bg') return 'bg-zinc-600'; // Gray or amber, let's use zinc-600 as requested "회색 또는 앰버"
    if (type === 'text') return 'text-zinc-400';
    if (type === 'border') return 'border-zinc-500';
  }
  
  return type === 'bg' ? 'bg-zinc-700' : type === 'text' ? 'text-zinc-500' : 'border-zinc-700';
}

export function getResultLabel(result: string, friendly = false) {
  if (!result) return '-';
  const upper = result.toUpperCase();
  if (upper === 'PLAYER' || upper === 'P') return friendly ? 'Player(P)' : 'P';
  if (upper === 'BANKER' || upper === 'B') return friendly ? 'Banker(B)' : 'B';
  if (upper === 'TIE' || upper === 'T') return friendly ? 'Tie(T)' : 'T';
  if (upper === 'WAIT' || upper === 'SKIP' || upper === 'OBSERVE') return '관망';
  if (upper === 'PAUSE') return '일시정지';
  if (upper === 'STOP') return '중단';
  if (upper === 'DATA_ERROR' || upper === 'CONFLICT' || upper === 'ERROR') return '오류';
  return result;
}
