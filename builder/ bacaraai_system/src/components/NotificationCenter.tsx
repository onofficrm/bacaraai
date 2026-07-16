import { Bell, AlertTriangle, Info, AlertCircle, CheckCircle, X } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MOCK_NOTIFICATIONS } from '../data';
import { Notification } from '../types';
import { playSfx } from '../audio/sfxEngine';

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [panelStyle, setPanelStyle] = useState<{ top: number; right: number }>({ top: 72, right: 24 });

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    if (!isOpen || !buttonRef.current) {
      return;
    }

    const updatePosition = () => {
      if (!buttonRef.current) {
        return;
      }

      const rect = buttonRef.current.getBoundingClientRect();
      setPanelStyle({
        top: rect.bottom + 8,
        right: Math.max(16, window.innerWidth - rect.right),
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen]);

  const markAllAsRead = () => {
    playSfx('ui');
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const removeNotification = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    playSfx('tick');
    setNotifications(notifications.filter(n => n.id !== id));
  };

  const dropdown = isOpen
    ? createPortal(
        <>
          <div
            className="fixed inset-0 z-[500]"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div
            className="fixed z-[510] w-80 max-w-[calc(100vw-2rem)] bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-top-2 duration-200"
            style={{ top: panelStyle.top, right: panelStyle.right }}
            role="dialog"
            aria-label="알림센터"
          >
            <div className="px-4 py-3 border-b border-zinc-800 flex justify-between items-center bg-zinc-950/50">
              <h3 className="font-bold text-zinc-200 text-sm">알림센터</h3>
              {unreadCount > 0 && (
                <button onClick={markAllAsRead} className="text-[10px] text-zinc-500 hover:text-zinc-300">
                  모두 읽음 처리
                </button>
              )}
            </div>

            <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-zinc-500 text-sm">새로운 알림이 없습니다.</div>
              ) : (
                <div className="flex flex-col">
                  {notifications.map(notification => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onRemove={(e) => removeNotification(notification.id, e)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </>,
        document.body,
      )
    : null;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          const next = !isOpen;
          setIsOpen(next);
          if (next) playSfx(unreadCount > 0 ? 'notification' : 'ui');
        }}
        className="relative p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label="알림센터"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-zinc-950" />
        )}
      </button>
      {dropdown}
    </div>
  );
}

function NotificationItem({
  notification,
  onRemove,
}: {
  notification: Notification;
  onRemove: (e: React.MouseEvent) => void;
}) {
  let Icon = Info;
  let colorClass = 'text-blue-400 bg-blue-500/10 border-blue-500/20';

  if (notification.type === 'warning' || notification.isRiskAlert) {
    Icon = AlertTriangle;
    colorClass = 'text-amber-400 bg-amber-500/10 border-amber-500/20';
  } else if (notification.type === 'error') {
    Icon = AlertCircle;
    colorClass = 'text-red-400 bg-red-500/10 border-red-500/20';
  } else if (notification.type === 'success') {
    Icon = CheckCircle;
    colorClass = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
  }

  return (
    <div
      className={`p-4 border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors flex gap-3 relative group cursor-default ${!notification.read ? 'bg-zinc-800/10' : ''}`}
    >
      <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center border ${colorClass}`}>
        <Icon size={14} />
      </div>
      <div className="flex flex-col gap-1 pr-6 min-w-0">
        <p className={`text-sm break-words ${!notification.read ? 'text-zinc-200 font-medium' : 'text-zinc-400'}`}>
          {notification.message}
        </p>
        <span className="text-[10px] text-zinc-500 font-mono">{notification.time}</span>
      </div>
      {!notification.read && (
        <span className="absolute top-4 right-4 w-1.5 h-1.5 bg-amber-500 rounded-full" />
      )}
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-4 right-4 text-zinc-600 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-900 rounded-full p-1"
        aria-label="알림 삭제"
      >
        <X size={12} />
      </button>
    </div>
  );
}
