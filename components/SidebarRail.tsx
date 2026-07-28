// components/SidebarRail.tsx
'use client';

import { ReactNode, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';

export type RailTabId = 'board' | 'monster' | 'guilds' | 'vault' | 'codex';
export type RailPanelId = 'todo' | 'journal' | 'profile';

interface RailItem {
  icon: string;
  label: string;
  kind: 'tab' | 'panel';
  target: RailTabId | RailPanelId;
}

const RAIL_ITEMS: RailItem[] = [
  { icon: '/main ui/mainquest.png',   label: 'Main Quest',   kind: 'tab',   target: 'board' },
  { icon: '/main ui/todo.png',        label: 'To-Do',        kind: 'panel', target: 'todo' },
  { icon: '/main ui/curioarena.png',  label: 'Curio Arena',  kind: 'tab',   target: 'monster' },
  { icon: '/main ui/journal.png',     label: 'Journal',      kind: 'panel', target: 'journal' },
  { icon: '/main ui/sidequest.png',   label: 'Side Quests',  kind: 'tab',   target: 'guilds' },
  { icon: '/main ui/rewardvault.png', label: 'Reward Vault', kind: 'tab',   target: 'vault' },
  { icon: '/main ui/codex.png',       label: 'Codex',        kind: 'tab',   target: 'codex' },
  { icon: '/main ui/profile.png',     label: 'Profile',      kind: 'panel', target: 'profile' },
];

interface SidebarRailProps {
  activeTab: string;
  activePanel: RailPanelId | null;
  onNavigate: (tab: RailTabId) => void;
  onOpenPanel: (panel: RailPanelId) => void;
  onClosePanel: () => void;
  onLogout: () => void;
  panelContent: Record<RailPanelId, ReactNode>;
  panelTitles: Record<RailPanelId, string>;
}

export default function SidebarRail({
  activeTab,
  activePanel,
  onNavigate,
  onOpenPanel,
  onClosePanel,
  onLogout,
  panelContent,
  panelTitles,
}: SidebarRailProps) {
  const [confirmingLogout, setConfirmingLogout] = useState(false);

  return (
    <>
      <aside className="rail-aside relative z-[70] w-20 md:w-24 shrink-0 bg-[#211007] flex flex-col items-center overflow-y-auto">
        {RAIL_ITEMS.map((item) => {
          const isActive = item.kind === 'tab' ? activeTab === item.target : activePanel === item.target;
          return (
            <button
              key={item.label}
              onClick={() => {
                if (item.kind === 'tab') onNavigate(item.target as RailTabId);
                else onOpenPanel(item.target as RailPanelId);
              }}
              title={item.label}
              className={`rail-btn w-full flex flex-col items-center gap-1 py-2.5 px-1 transition-colors border-l-2 ${
                isActive ? 'border-l-amber-500 bg-[#0a0807]' : 'border-l-transparent hover:bg-[#0a0807]'
              }`}
            >
              <img src={item.icon} alt="" className="rail-icon w-10 h-10 object-contain" />
              <span className="rail-label text-[9px] font-bold uppercase tracking-wide text-gray-400 text-center leading-tight">
                {item.label}
              </span>
            </button>
          );
        })}

        <div className="flex-1" />

        <button
          onClick={() => setConfirmingLogout(true)}
          title="Logout"
          className="rail-btn w-full flex flex-col items-center gap-1 py-2.5 px-1 border-l-2 border-l-transparent hover:bg-[#0a0807] transition-colors"
        >
          <img src="/main ui/logout.png" alt="" className="rail-icon w-10 h-10 object-contain" />
          <span className="rail-label text-[9px] font-bold uppercase tracking-wide text-gray-400">Logout</span>
        </button>
      </aside>

      <AnimatePresence>
        {activePanel && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClosePanel}
              className="fixed inset-0 bg-black/60 z-40"
            />
            <motion.div
              initial={{ x: -320, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -320, opacity: 0 }}
              transition={{ type: 'tween', duration: 0.2 }}
              className="rail-drawer fixed top-0 left-20 md:left-24 bottom-0 w-full max-w-sm bg-neutral-950 border-r border-neutral-800 z-50 overflow-y-auto p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold font-display text-white">{panelTitles[activePanel]}</h2>
                <button
                  onClick={onClosePanel}
                  className="text-gray-500 hover:text-white w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>
              {panelContent[activePanel]}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmingLogout && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-[80] flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-neutral-950 border border-amber-800 rounded-xl p-6 w-full max-w-xs text-center"
            >
              <p className="text-white font-bold mb-1">Log out of this hero?</p>
              <p className="text-gray-500 text-xs mb-5">You'll return to the hero select screen.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmingLogout(false)}
                  className="flex-1 py-2 rounded-lg font-bold text-sm bg-neutral-800 hover:bg-neutral-700 text-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => { setConfirmingLogout(false); onLogout(); }}
                  className="flex-1 py-2 rounded-lg font-bold text-sm bg-amber-700 hover:bg-amber-600 text-white transition-colors"
                >
                  Logout
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
