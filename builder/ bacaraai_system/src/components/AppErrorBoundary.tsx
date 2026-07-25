import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode };
type State = { error: Error | null };

/**
 * 런타임 오류 시 검은 화면 대신 복구 UI 표시.
 * 기본 동작은 그냥 새로고침 — localStorage(대기 베팅·기록)를 지우지 않는다.
 */
export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[bacaraai] render crash', error, info.componentStack);
  }

  plainReload = () => {
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
            새로고침하면 대기 베팅·게임 기록은 그대로 유지됩니다.
          </p>
          <p className="mt-3 text-[11px] font-mono text-zinc-600 break-all line-clamp-3">
            {this.state.error.message}
          </p>
          <button
            type="button"
            onClick={this.plainReload}
            className="mt-5 w-full rounded-xl bg-amber-400 py-3 text-sm font-bold text-zinc-950"
          >
            새로고침
          </button>
        </div>
      </div>
    );
  }
}
