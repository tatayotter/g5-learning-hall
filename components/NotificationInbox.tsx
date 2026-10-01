'use client';
// Notification bell + dropdown inbox.
// Drop into any header/nav area — shows unread badge, expands on click.

import { useState } from 'react';
import type { PlayerNotification } from '@/lib/referral';
import { playPageFlip } from '@/lib/sounds';
import { questButtonFontFamily, questButtonLetterSpacing, questButtonDropShadow, questTextShadowStyle, questTextStyle } from '@/components/GameButton';
import { Nail } from '@/components/battle/MonsterHpPanel';

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
    playPageFlip();
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
          {/* Dropdown — same white + gold-ring + top-corner-nail frame as
              SidebarRail's nav drawer it sits beside. */}
          <div
            className="absolute right-0 top-10 z-50 w-80 max-w-[calc(100vw-2rem)] max-h-96 flex flex-col
                       bg-white border-2 border-[#4a2f18] rounded-2xl battle-panel-in"
            // Pin the body font — the HUD this sits in uses the display face.
            style={{ boxShadow: `0 0 0 3px #d4a017, ${questButtonDropShadow}`, fontFamily: 'var(--font-inter), sans-serif', textTransform: 'none', letterSpacing: 'normal' }}
          >
            <Nail className="top-2 left-2" />
            <Nail className="top-2 right-2" />
            <div className="px-6 pt-3 pb-2 border-b-2 border-[#c9a87a] flex items-center justify-between">
              <span className="text-sm" style={{ fontFamily: questButtonFontFamily, letterSpacing: questButtonLetterSpacing }}>
                <span style={{ position: 'relative', display: 'inline-block' }}>
                  <span aria-hidden style={questTextShadowStyle}>Notifications</span>
                  <span style={{ ...questTextStyle, color: '#f5c542' }}>Notifications</span>
                </span>
              </span>
              {unread.length > 0 && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-white bg-red-500 rounded-full px-2 py-0.5">{unread.length} new</span>
              )}
            </div>

            {notifications.length === 0 ? (
              <p className="p-4 text-sm text-[#6b4820] text-center">No notifications yet.</p>
            ) : (
              <ul className="overflow-y-auto min-h-0">
                {notifications.map((n) => (
                  <li
                    key={n.id}
                    className={`px-4 py-3 border-b border-[#e8d0a0] last:border-0
                                ${!n.read ? 'bg-[#c9781a]/10' : ''}`}
                  >
                    <div className="flex gap-3 items-start">
                      <span className="text-xl flex-shrink-0 mt-0.5">{n.icon}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[#2a1505]">{n.title}</p>
                        <p className="text-xs text-[#3a2610] mt-0.5 leading-relaxed">{n.body}</p>
                        <p className="text-[10px] text-[#6b4820] mt-1">
                          {new Date(n.created_at).toLocaleDateString('en-PH', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      {!n.read && (
                        <span className="w-2 h-2 rounded-full bg-[#c9781a] flex-shrink-0 mt-1.5" />
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
