import { LayoutGrid, FlaskConical, LineChart, Settings, CircleHelp } from 'lucide-react';
import React from 'react';

export type ViewType = 'multitable' | 'lab' | 'insight' | 'settings' | 'help';

interface TopNavProps {
  activeView: ViewType;
  onChangeView: (view: ViewType) => void;
}

export default function TopNav({ activeView, onChangeView }: TopNavProps) {
  const navItems = [
    { id: 'multitable', label: '라이브 테이블', icon: LayoutGrid },
    { id: 'lab', label: '규칙 연구실', icon: FlaskConical },
    { id: 'insight', label: '데이터 및 기록', icon: LineChart },
    { id: 'settings', label: '설정', icon: Settings },
    { id: 'help', label: '도움말', icon: CircleHelp },
  ] as const;

  return (
    <nav className="flex items-center gap-1 overflow-x-auto custom-scrollbar px-3 sm:px-6 bg-zinc-950 border-b border-zinc-800 shrink-0 [-webkit-overflow-scrolling:touch]">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeView === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onChangeView(item.id)}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-3 min-h-[48px] text-xs sm:text-sm font-bold border-b-2 transition-colors whitespace-nowrap touch-manipulation ${
              isActive
                ? 'text-amber-400 border-amber-500 bg-amber-500/5'
                : 'text-zinc-500 border-transparent hover:text-zinc-300 hover:bg-zinc-900/50'
            }`}
          >
            <Icon size={16} />
            <span className="max-sm:max-w-[4.5rem] truncate">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
