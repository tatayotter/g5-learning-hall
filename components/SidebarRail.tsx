// components/SidebarRail.tsx
'use client';

import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Nail } from '@/components/battle/MonsterHpPanel';
import { questButtonDropShadow, questButtonFontFamily, questButtonLetterSpacing, questTextShadowStyle, questTextStyle } from '@/components/GameButton';

function useIsLandscape() {
  const [isLandscape, setIsLandscape] = useState(false);
  useEffect(() => {
    const check = () => setIsLandscape(window.innerWidth > window.innerHeight);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isLandscape;
}

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isDesktop;
}

export type RailTabId = 'board' | 'monster' | 'guilds' | 'vault' | 'codex' | 'journal' | 'todo' | 'profile';

interface RailItem {
  icon: string;
  label: string;
  target: RailTabId;
}

const RAIL_ITEMS: RailItem[] = [
  { icon: '/main ui/mainquest.png',   label: 'Main Quest',   target: 'board' },
  { icon: '/main ui/todo.png',        label: 'To-Do',        target: 'todo' },
  { icon: '/main ui/curioarena.png',  label: 'Curio Arena',  target: 'monster' },
  { icon: '/main ui/journal.png',     label: 'Journal',      target: 'journal' },
  { icon: '/main ui/sidequest.png',   label: 'Side Quests',  target: 'guilds' },
  { icon: '/main ui/rewardvault.png', label: 'Reward Vault', target: 'vault' },
  { icon: '/main ui/codex.png',       label: 'Codex',        target: 'codex' },
  { icon: '/main ui/profile.png',     label: 'Profile',      target: 'profile' },
];

interface SidebarRailProps {
  activeTab: string;
  onNavigate: (tab: RailTabId) => void;
  onLogout: () => void;
  // Small notification dot on a rail icon — currently only used by Curio
  // Arena for an egg-ready-to-claim curio, a stalled egg, or an unrevealed
  // hatch (see docs/curio-egg-mechanism-design.md). Keyed by RailTabId so
  // other tabs could reuse it later without a new prop.
  railBadges?: Partial<Record<RailTabId, boolean>>;
  sfxOn?: boolean;
  musicOn?: boolean;
  onToggleSfx?: () => void;
  onToggleMusic?: () => void;
  // HUD stat bar
  playerName?: string;
  playerGrade?: string;
  playerLevel?: number;
  playerXp?: number;      // XP within current level (remainder after level-up)
  playerGold?: number;
  playerStreak?: number;  // login streak days, from get_daily_checklist_streak (see Dashboard.tsx's loginStreak)
  weekLabel?: string;     // e.g. "Week 10"
}

// Rank title derived from player level — mirrors typical RPG progression.
// Intentionally defined client-side so the HUD shows immediately without a
// server round-trip; the thresholds can be tuned freely without a migration.
function rankForLevel(level: number): string {
  if (level >= 30) return 'Legendary';
  if (level >= 20) return 'Champion';
  if (level >= 15) return 'Master';
  if (level >= 10) return 'Expert';
  if (level >= 6)  return 'Adept';
  if (level >= 3)  return 'Journeyman';
  return 'Apprentice';
}

// Compass icon — pixel-art compass with MENU label, supplied as a static
// asset at /compass-menu.png. Drop the file into public/ to activate it.
function CompassIcon({ large = false }: { large?: boolean }) {
  // 80px mobile / 96px desktop — industry standard for floating menu buttons.
  return (
    <img src="/compass-menu.png" alt="" aria-hidden="true" className={large ? 'w-24 h-24 object-contain' : 'w-20 h-20 object-contain'} />
  );
}

export default function SidebarRail({
  activeTab,
  onNavigate,
  onLogout,
  railBadges,
  sfxOn,
  musicOn,
  onToggleSfx,
  onToggleMusic,
  playerName = 'Hero',
  playerGrade,
  playerLevel = 1,
  playerXp = 0,
  playerGold = 0,
  playerStreak = 0,
  weekLabel,
}: SidebarRailProps) {
  const xpCap = 500 + playerLevel * 100;
  const xpPct = Math.min(100, Math.round((playerXp / xpCap) * 100));
  const [isOpen, setIsOpen] = useState(false);
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const isLandscape = useIsLandscape();
  const isDesktop = useIsDesktop();

  return (
    <>
      {/* ── Floating nav trigger ─────────────────────────────────────────────
          Portrait: fixed bottom-center (thumb-friendly, both hands reach it).
          Landscape: shifts to left-middle via .nav-fab media query in
          globals.css — mirrors where the old sidebar rail lived so muscle
          memory transfers for existing users.                              */}
      {/* Hidden when menu is open — compass re-renders on the sheet edge */}
      {!isOpen && (
        <>
          {/* Floating compass trigger — sits above the stat bar */}
          <button
            onClick={() => setIsOpen(true)}
            className="nav-fab flex items-center justify-center
              hover:-translate-y-1 hover:drop-shadow-lg
              active:translate-y-0 active:scale-95
              transition-all duration-150 ease-out"
            title="Menu"
            aria-label="Open navigation menu"
          >
            <CompassIcon large={isDesktop} />
          </button>

          {/* Full-width HUD stat bar — pinned to the top.
              Deliberately dark regardless of the shell's light/dark theme (a
              persistent overlay bar, same category as a modal scrim) — colors
              below are hardcoded to today's dark-shell values rather than the
              bg-black/text-white/bg-white/NN tokens, so this bar doesn't go
              illegible if the base theme ever flips again. See
              docs/STYLE_GUIDE.md. */}
          <div className={`fixed top-0 left-0 right-0 z-[79] bg-[#0a0807]/85 backdrop-blur-sm border-b border-[#ffffff]/10 select-none pointer-events-none font-display
            ${isDesktop ? 'px-8 py-3' : 'px-5'}
            ${isLandscape ? 'py-2 flex items-center gap-4' : 'pt-3 pb-2 flex flex-col gap-1.5'}`}>

            {isLandscape ? (
              /* ── Landscape / Desktop: single row ── */
              <>
                <span className={`text-amber-500 font-bold leading-none tracking-widest uppercase shrink-0 ${isDesktop ? 'text-sm' : 'text-xs'}`}>⚔ {rankForLevel(playerLevel)}</span>
                <div className={`w-px bg-[#ffffff]/20 shrink-0 ${isDesktop ? 'h-5' : 'h-4'}`} />
                <span className={`text-[#ffffff] font-bold leading-none tracking-wide shrink-0 ${isDesktop ? 'text-base' : 'text-sm'}`}>{playerName}</span>
                <div className={`w-px bg-[#ffffff]/20 shrink-0 ${isDesktop ? 'h-5' : 'h-4'}`} />
                <span className={`text-amber-400 font-bold leading-none shrink-0 ${isDesktop ? 'text-sm' : 'text-xs'}`}>Lv.{playerLevel}</span>
                <div className={`flex-1 min-w-8 rounded-full bg-[#ffffff]/15 overflow-hidden ${isDesktop ? 'h-2' : 'h-1.5'}`}>
                  <div className="h-full bg-amber-400 rounded-full" style={{ width: `${xpPct}%` }} />
                </div>
                <span className={`text-[#f5c542] font-bold leading-none shrink-0 ${isDesktop ? 'text-sm' : 'text-xs'}`}>🪙 {playerGold.toLocaleString()}</span>
                <div className={`w-px bg-[#ffffff]/20 shrink-0 ${isDesktop ? 'h-5' : 'h-4'}`} />
                <span className={`text-orange-400 font-bold leading-none shrink-0 ${isDesktop ? 'text-sm' : 'text-xs'}`}>🔥 {playerStreak}</span>
                <div className={`w-px bg-[#ffffff]/20 shrink-0 ${isDesktop ? 'h-5' : 'h-4'}`} />
                {playerGrade && <span className={`text-[#8a7c66] font-bold leading-none tracking-wide uppercase shrink-0 ${isDesktop ? 'text-sm' : 'text-xs'}`}>{playerGrade}</span>}
                {weekLabel && <span className={`text-[#a89c86] font-bold leading-none tracking-wide uppercase shrink-0 ${isDesktop ? 'text-sm' : 'text-xs'}`}>{weekLabel}</span>}
              </>
            ) : (
              /* ── Portrait: two rows ── */
              <>
                <div className="flex items-center justify-between">
                  <span className="text-amber-500 font-bold text-xs leading-none tracking-widest uppercase">⚔ {rankForLevel(playerLevel)}</span>
                  <div className="flex items-center gap-2">
                    {playerGrade && <span className="text-[#8a7c66] font-bold text-xs leading-none tracking-wide uppercase">{playerGrade}</span>}
                    {weekLabel && <span className="text-[#a89c86] font-bold text-xs leading-none tracking-wide uppercase">{weekLabel}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[#ffffff] font-bold text-sm leading-none tracking-wide shrink-0">{playerName}</span>
                  <div className="w-px h-4 bg-[#ffffff]/20 shrink-0" />
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-amber-400 font-bold text-xs leading-none shrink-0">Lv.{playerLevel}</span>
                    <div className="flex-1 min-w-8 h-1.5 rounded-full bg-[#ffffff]/15 overflow-hidden">
                      <div className="h-full bg-amber-400 rounded-full" style={{ width: `${xpPct}%` }} />
                    </div>
                  </div>
                  <span className="text-[#f5c542] font-bold text-xs leading-none shrink-0">🪙 {playerGold.toLocaleString()}</span>
                  <div className="w-px h-4 bg-[#ffffff]/20 shrink-0" />
                  <span className="text-orange-400 font-bold text-xs leading-none shrink-0">🔥 {playerStreak}</span>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* ── Full-screen overlay nav menu ─────────────────────────────────── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={`fixed inset-0 bg-[#0a0807]/50 z-[90] flex ${isLandscape ? 'items-stretch justify-start' : 'items-end justify-center'}`}
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={isLandscape ? { x: '-100%' } : { y: '100%' }}
              animate={isLandscape ? { x: 0 } : { y: 0 }}
              exit={isLandscape ? { x: '-100%' } : { y: '100%' }}
              transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
              style={{
                ...(isLandscape ? { position: 'absolute', top: 0, left: 0, bottom: 0, width: '24rem' } : {}),
                boxShadow: `0 0 0 3px #d4a017, ${questButtonDropShadow}`,
              }}
              className={`relative bg-white border-2 border-[#4a2f18]
                ${isLandscape
                  ? 'rounded-tr-3xl pt-4 pb-5 pl-6 pr-16 flex flex-col'
                  : 'border-b-0 rounded-t-3xl pt-10 pb-6 px-6 w-full'
                }`}
              onClick={e => e.stopPropagation()}
            >
              {/* Gold nails, top corners only — the bottom edge either runs
                  off the bottom sheet or sits under the compass trigger in
                  the landscape drawer, so nails there wouldn't read (2026-08-29). */}
              <Nail className="top-2 left-2" />
              <Nail className="top-2 right-2" />
              {/* Compass — bottom-sheet: top edge center / drawer: right edge middle */}
              <button
                onClick={() => setIsOpen(false)}
                className={`absolute z-10 active:scale-95 transition-all duration-150 ease-out
                  ${isLandscape
                    ? 'bottom-6 -right-10 hover:opacity-80'
                    : '-top-10 left-1/2 -translate-x-1/2 hover:-translate-y-1 hover:drop-shadow-lg'
                  }`}
                aria-label="Close menu"
              >
                <CompassIcon large={isDesktop} />
              </button>

              {/* "Navigation" label — same Bungee/stroke/shadow text treatment
                  as the quest GameButton's label (2026-08-29), in quest gold
                  instead of the button's white. */}
              <div className={`${isLandscape ? 'mb-3 text-left' : 'mb-5 text-center'}`}>
                <span className="text-xl" style={{ fontFamily: questButtonFontFamily, letterSpacing: questButtonLetterSpacing }}>
                  <span style={{ position: 'relative', display: 'inline-block' }}>
                    <span aria-hidden style={questTextShadowStyle}>Navigation</span>
                    <span style={{ ...questTextStyle, color: '#f5c542' }}>Navigation</span>
                  </span>
                </span>
              </div>

              {/* Nav grid — 3 cols portrait, 4 cols landscape (2 rows, no scroll) */}
              <div className={`grid gap-2 ${isLandscape ? 'grid-cols-4' : 'grid-cols-3'}`}>
                {RAIL_ITEMS.map((item) => {
                  const isActive = activeTab === item.target;
                  return (
                    <button
                      key={item.label}
                      onClick={() => { onNavigate(item.target); setIsOpen(false); }}
                      className={`relative flex flex-col items-center gap-1.5 ${isLandscape ? 'p-2' : 'p-4'} rounded-2xl border transition-all duration-150 ease-out
                        hover:-translate-y-1 hover:drop-shadow-md active:translate-y-0 active:scale-95
                        border-transparent`}
                    >
                      <span className="relative w-14 h-14 flex items-center justify-center shrink-0">
                        <img src={item.icon} alt="" className={`w-14 h-14 object-contain${isActive ? ' nav-icon-active' : ''}`} />
                        {railBadges?.[item.target] && (
                          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500 border-2 border-white animate-pulse" />
                        )}
                      </span>
                      <span className="text-[9px] font-bold uppercase tracking-wide text-gray-500 text-center leading-tight">
                        {item.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Bottom row: logout left · sound toggles right */}
              <div className="mt-4 pt-4 border-t border-stone-200 flex items-center justify-between">
                <button
                  onClick={() => { setIsOpen(false); setConfirmingLogout(true); }}
                  className="flex items-center gap-2 py-2 px-2 rounded-xl transition-all duration-150 ease-out hover:-translate-y-1 hover:drop-shadow-md active:translate-y-0 active:scale-95"
                >
                  <img src="/main ui/logout.png" alt="" className="w-8 h-8 object-contain" />
                  <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500">Logout</span>
                </button>

                {/* Sound toggles */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={onToggleMusic}
                    title={musicOn ? 'Mute music' : 'Unmute music'}
                    className="w-9 h-9 rounded-xl bg-stone-100 hover:bg-stone-200 border border-stone-200 flex items-center justify-center
                      transition-all duration-150 ease-out hover:-translate-y-1 active:translate-y-0 active:scale-95"
                  >
                    <span className="text-sm leading-none">{musicOn ? '🎵' : '🔇'}</span>
                  </button>
                  <button
                    onClick={onToggleSfx}
                    title={sfxOn ? 'Mute sound effects' : 'Unmute sound effects'}
                    className="w-9 h-9 rounded-xl bg-stone-100 hover:bg-stone-200 border border-stone-200 flex items-center justify-center
                      transition-all duration-150 ease-out hover:-translate-y-1 active:translate-y-0 active:scale-95"
                  >
                    <span className="text-sm leading-none">{sfxOn ? '🔊' : '🔈'}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Logout confirmation dialog ───────────────────────────────────── */}
      <AnimatePresence>
        {confirmingLogout && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#0a0807]/70 z-[80] flex items-center justify-center p-6"
          >
            {/* Deliberately dark regardless of the shell's theme — a modal
                scrim + confirm dialog, same treatment as the HUD bar above. */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-neutral-950 border border-amber-800 rounded-xl p-6 w-full max-w-xs text-center"
            >
              <p className="text-[#ffffff] font-bold mb-1">Log out of this hero?</p>
              <p className="text-[#8a7c66] text-xs mb-5">You'll return to the hero select screen.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmingLogout(false)}
                  className="flex-1 py-2 rounded-lg font-bold text-sm bg-[#2a2119] hover:bg-[#3d3225] text-[#c9bfae] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => { setConfirmingLogout(false); onLogout(); }}
                  className="flex-1 py-2 rounded-lg font-bold text-sm bg-amber-700 hover:bg-amber-600 text-[#ffffff] transition-colors"
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
