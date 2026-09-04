'use client';
// Notification bell + dropdown inbox.
// Drop into any header/nav area — shows unread badge, expands on click.

import { useState } from 'react';
import type { PlayerNotification } from '@/lib/referral';

interface NotificationInboxProps {
  notifications: PlayerNotification[];
  onMarkRead: () => void;
}

export default function NotificationInbox({
  notifications,
  onMarkRead,
}: NotificationInboxProps) {
  const [open, setOpen] = useState(false);

  const unread = notifications.filter((n) => !n.read);

  function handleOpen() {
    setOpen((o) => !o);
    if (!open && unread.length > 0) {
      onMarkRead();
    }
  }

  return (
    <div className="relative">
      <button
        onClick={handleOpen}
        aria-label={`Notifications${unread.length > 0 ? ` (${unread.length} unread)` : ''}`}
        className="relative p-2 rounded-lg hover:-translate-y-1 hover:drop-shadow-lg active:translate-y-0 active:scale-95 transition-all duration-150 ease-out"
      >
        <img src="/icons/notificationbell.png" alt="" className="w-6 h-6 object-contain" />
        {unread.length > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1
                           bg-red-500 text-white text-[10px] font-bold rounded-full
                           flex items-center justify-center leading-none">
            {unread.length > 9 ? '9+' : unread.length}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          {/* Dropdown */}
          <div className="absolute right-0 top-10 z-50 w-80 max-h-96 overflow-y-auto
                          bg-gray-900 border border-gray-700 rounded-xl shadow-2xl">
            <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
              <span className="text-sm font-semibold text-white">Notifications</span>
              {unread.length > 0 && (
                <span className="text-xs text-gray-400">{unread.length} new</span>
              )}
            </div>

            {notifications.length === 0 ? (
              <p className="p-4 text-sm text-gray-500 text-center">No notifications yet.</p>
            ) : (
              <ul>
                {notifications.map((n) => (
                  <li
                    key={n.id}
                    className={`px-4 py-3 border-b border-gray-800 last:border-0
                                ${!n.read ? 'bg-amber-950/30' : ''}`}
                  >
                    <div className="flex gap-3 items-start">
                      <span className="text-xl flex-shrink-0 mt-0.5">{n.icon}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white">{n.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{n.body}</p>
                        <p className="text-[10px] text-gray-600 mt-1">
                          {new Date(n.created_at).toLocaleDateString('en-PH', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      {!n.read && (
                        <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0 mt-1.5" />
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
