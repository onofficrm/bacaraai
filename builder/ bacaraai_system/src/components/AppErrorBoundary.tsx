import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { error: Error | null };

/**
 * 런타임 오류 시 검은 화면 대신 복구 UI 표시.
 */
export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[bacaraai] render crash', error, info.componentStack);
  }

  clearAndReload = () => {
    try {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i += 1) {
        const k = localStorage.key(i);
        if (k && /^bacara_/i.test(k)) keys.push(k);
      }
      keys.forEach((k) => localStorage.removeItem(k));
    } catch {
      /* ignore */
    }
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-dvh w-full bg-zinc-950 text-zinc-200 flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900/90 p-6 text-center shadow-xl">
          <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-amber-400/90">
            일시적 오류
          </p>
          <h1 className="mt-2 text-lg font-bold text-white">화면을 불러오지 못했습니다</h1>
          <p className="mt-2 text-[13px] text-zinc-400 leading-relaxed">
            브라우저 캐시나 저장된 세션 데이터 문제일 수 있습니다. 아래 버튼으로 초기화 후
            다시 열어 주세요.
          </p>
          <p className="mt-3 text-[11px] font-mono text-zinc-600 break-all line-clamp-3">
            {this.state.error.message}
          </p>
          <button
            type="button"
            onClick={this.clearAndReload}
            className="mt-5 w-full rounded-xl bg-amber-400 py-3 text-sm font-bold text-zinc-950"
          >
            캐시·세션 초기화 후 새로고침
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-2 w-full rounded-xl border border-zinc-700 py-2.5 text-sm text-zinc-300"
          >
            그냥 새로고침
          </button>
        </div>
      </div>
    );
  }
}
