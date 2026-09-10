import { useState, useRef, useEffect } from 'react';
import { Icon } from './Icon';
import { useApp } from '../store/AppContext';

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function NotificationBell() {
  const { notifications, unreadCount, markNotificationRead, markAllNotificationsRead } = useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        className="relative rounded-full p-sm text-on-surface hover:bg-surface-container focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
      >
        <Icon name="notifications" size={22} />
        {unreadCount > 0 && (
          <span className="absolute top-[2px] right-[2px] min-w-[16px] h-[16px] px-[3px] rounded-full bg-error text-on-error text-[10px] font-semibold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-sm w-80 max-w-[90vw] rounded-2xl bg-surface-container-lowest border border-outline-variant shadow-xl z-40 max-h-96 overflow-y-auto">
          <div className="flex items-center justify-between px-md py-sm border-b border-outline-variant sticky top-0 bg-surface-container-lowest">
            <span className="text-body-sm font-semibold text-on-surface">Notifications</span>
            {unreadCount > 0 && (
              <button onClick={() => markAllNotificationsRead()} className="text-[11px] text-primary font-medium">
                Mark all read
              </button>
            )}
          </div>
          {notifications.length === 0 ? (
            <p className="text-body-sm text-on-surface-variant px-md py-lg text-center">No notifications yet.</p>
          ) : (
            <ul>
              {notifications.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => !n.read && markNotificationRead(n.id)}
                    className={`w-full text-left px-md py-sm flex items-start gap-sm border-b border-outline-variant last:border-0 ${
                      n.read ? '' : 'bg-primary-container/10'
                    }`}
                  >
                    {!n.read && <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-[6px]" />}
                    <div className={`min-w-0 ${n.read ? 'pl-[16px]' : ''}`}>
                      <p className="text-body-sm font-medium text-on-surface">{n.title}</p>
                      {n.body && <p className="text-[12px] text-on-surface-variant truncate">{n.body}</p>}
                      <p className="text-[11px] text-outline mt-[2px]">{timeAgo(n.createdAt)}</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
