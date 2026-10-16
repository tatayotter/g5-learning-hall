// components/nav/GameNav.tsx
//
// The five-tab navigation (Today, Side Quests, Curios, Journal, Vault plus a
// small menu), shown instead of the compass drawer (components/SidebarRail.tsx)
// for kids with the `new_nav` flag. Built from the mockup in
// components/dev/NavRedesignMockup.tsx; docs/nav-redesign.md has the audit
// it has to keep meeting (44px taps, 11px text, one home for every screen).
//
// The tabs map onto Dashboard's existing tab ids, so push links, the tab
// remembered for the session and every screen behind them work unchanged.
// Profile, Codex, Bonus Quests and the full To-Do list open as pages with a
// Back button (no tab lit).
//
// Placement is one rule (navLayoutFor): a left sidebar from 1024px wide, a
// left rail on a phone held sideways, a bottom bar otherwise. The body gets
// `new-nav new-nav-<layout>` and --nav-left / --nav-bottom so the content and
// the map's fixed controls make room (app/globals.css, "New navigation").
'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Nail, woodTextureStyle } from '@/components/battle/MonsterHpPanel';
import { questButtonFontFamily, questButtonLetterSpacing, questTextShadowStyle, questTextStyle } from '@/components/GameButton';
import SoundSettings from '@/components/SoundSettings';
import { LogoutConfirmDialog, SaveStatusRow, TopHud, type SaveStatus, type TopHudProps } from '@/components/SidebarRail';
import { playPageFlip } from '@/lib/sounds';

export type NavLayout = 'bar' | 'rail' | 'sidebar';

export function navLayoutFor(width: number, height: number): NavLayout {
  if (width >= 1024) return 'sidebar';
  if (width > height && height < 500) return 'rail';
  return 'bar';
}

function useNavLayout(): NavLayout {
  const [layout, setLayout] = useState<NavLayout>('bar');
  useEffect(() => {
    const update = () => setLayout(navLayoutFor(window.innerWidth, window.innerHeight));
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return layout;
}

export const RAIL_W = 76;
export const SIDEBAR_W = 210;
const BAR_H = 64;

export type NavTabId = 'board' | 'guilds' | 'monster' | 'journal' | 'vault';
const TABS: { id: NavTabId; label: string; icon: string }[] = [
  { id: 'board',   label: 'Today',       icon: '/nav/today.png' },
  { id: 'guilds',  label: 'Side Quests', icon: '/nav/side-quests.png' },
  { id: 'monster', label: 'Curios',      icon: '/nav/curios.png' },
  { id: 'journal', label: 'Journal',     icon: '/nav/journal.png' },
  { id: 'vault',   label: 'Vault',       icon: '/nav/vault.png' },
];

// Opened from the menu as pages with Back; 'todo' is reached from Today's chest
// and from old links.
export const NAV_PAGES = ['profile', 'codex', 'bonus_quests', 'todo'] as const;
type PageId = 'profile' | 'codex' | 'bonus_quests';
const MENU_ITEMS: { id: PageId; label: string; icon: string }[] = [
  { id: 'profile',      label: 'Profile',      icon: '/main ui/profile.png' },
  { id: 'codex',        label: 'Codex',        icon: '/main ui/codex.png' },
  { id: 'bonus_quests', label: 'Bonus Quests', icon: '/main ui/bonusquest.png' },
];

const DARK_BAR = `linear-gradient(rgba(10,8,7,0.55), rgba(10,8,7,0.55)), ${woodTextureStyle.backgroundImage}`;
const FOCUS_RING = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f5c542]';
const TAB_TEXT = { fontFamily: questButtonFontFamily, letterSpacing: questButtonLetterSpacing } as const;

// Static on purpose (no pulse): a dot means "something new", not "hurry".
function Dot() {
  return <img src="/icons/red_alert.png" alt="" className="absolute -top-1 -right-1.5 w-3.5 h-3.5 object-contain pointer-events-none" />;
}

interface GameNavProps {
  activeTab: string;
  onNavigate: (tab: string) => void;
  badges: Partial<Record<NavTabId, boolean>>;
  // Quizzes, guild runs and battles take the whole screen; the nav steps aside.
  hidden: boolean;
  hud: Omit<TopHudProps, 'isDesktop' | 'isLandscape' | 'left' | 'leading'>;
  online: boolean;
  saveStatus?: SaveStatus;
  onSyncNow?: () => void;
  onLogout: () => void | Promise<void>;
}

export default function GameNav({ activeTab, onNavigate, badges, hidden, hud, online, saveStatus, onSyncNow, onLogout }: GameNavProps) {
  const layout = useNavLayout();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmingLogout, setConfirmingLogout] = useState(false);

  useEffect(() => {
    const cls = document.body.classList;
    cls.add('new-nav', `new-nav-${layout}`);
    cls.toggle('new-nav-hidden', hidden);
    return () => cls.remove('new-nav', `new-nav-${layout}`, 'new-nav-hidden');
  }, [layout, hidden]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const go = (tab: string) => { playPageFlip(); setMenuOpen(false); onNavigate(tab); };
  const label = (t: { id: NavTabId; label: string }) => `${t.label}${badges[t.id] ? ', something new' : ''}`;
  const menuButton = (
    <button
      type="button"
      onClick={() => { playPageFlip(); setMenuOpen(true); }}
      aria-label="Menu"
      aria-haspopup="dialog"
      className={`flex items-center justify-center min-w-[44px] min-h-[44px] active:scale-95 ${FOCUS_RING}`}
    >
      <img src="/nav/menu.png" alt="" className="w-8 h-8 object-contain" />
    </button>
  );

  return (
    <>
      {!hidden && (
        <TopHud
          {...hud}
          isDesktop={layout === 'sidebar'}
          isLandscape={layout !== 'bar'}
          left={layout === 'sidebar' ? SIDEBAR_W : layout === 'rail' ? RAIL_W : 0}
          leading={layout === 'sidebar' ? undefined : menuButton}
        />
      )}

      {!hidden && layout === 'sidebar' && (
        <nav aria-label="Main" className="fixed top-0 bottom-0 left-0 z-[79] flex flex-col" style={{ width: SIDEBAR_W, backgroundImage: DARK_BAR, borderRight: '2px solid #d4a017', boxShadow: '2px 0 8px -1px rgba(0,0,0,0.5)' }}>
          <div className="flex items-center justify-center h-16">
            <img src="/learning_hall_full_logo_optimize.png" alt="Learning Hall" className="h-10 object-contain" />
          </div>
          <div className="flex flex-col gap-1 px-2 pt-2">
            {TABS.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => go(tab.id)}
                  data-tutorial-id={`nav-${tab.id}`}
                  aria-label={label(tab)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`relative flex items-center gap-3 rounded-xl px-3 min-h-[52px] transition-colors ${FOCUS_RING} ${isActive ? 'bg-[#f5c542]/15' : 'hover:bg-[#ffffff]/5'}`}
                  style={{ boxShadow: isActive ? 'inset 0 0 0 1px #d4a017' : undefined }}
                >
                  <span className="relative shrink-0">
                    <img src={tab.icon} alt="" className={`object-contain ${isActive ? 'nav-icon-active' : ''}`} style={{ width: tab.id === 'monster' ? 44 : 36, height: tab.id === 'monster' ? 44 : 36 }} />
                    {badges[tab.id] && <Dot />}
                  </span>
                  <span style={{ ...TAB_TEXT, fontSize: 15, color: isActive ? '#f5c542' : '#e8d0a0' }}>{tab.label}</span>
                </button>
              );
            })}
          </div>
          <div className="flex-1" />
          <div className="flex flex-col gap-0.5 mx-2 px-2 pb-3 pt-2 border-t border-[#ffffff]/10">
            {MENU_ITEMS.map(item => (
              <button key={item.id} type="button" onClick={() => go(item.id)} aria-current={activeTab === item.id ? 'page' : undefined} className={`flex items-center gap-2.5 rounded-lg px-2 min-h-[44px] text-left ${activeTab === item.id ? 'bg-[#f5c542]/15' : 'hover:bg-[#ffffff]/5'} ${FOCUS_RING}`}>
                <img src={item.icon} alt="" className="w-7 h-7 object-contain" />
                <span className="text-[#e8d0a0] text-[14px] font-bold">{item.label}</span>
              </button>
            ))}
            <button type="button" onClick={() => { playPageFlip(); setMenuOpen(true); }} aria-haspopup="dialog" className={`flex items-center gap-2.5 rounded-lg px-2 min-h-[44px] text-left hover:bg-[#ffffff]/5 ${FOCUS_RING}`}>
              <img src="/nav/menu.png" alt="" className="w-7 h-7 object-contain" />
              <span className="text-[#e8d0a0] text-[14px] font-bold">Sound &amp; saving</span>
            </button>
            <button type="button" onClick={() => { playPageFlip(); setConfirmingLogout(true); }} className={`flex items-center gap-2.5 rounded-lg px-2 min-h-[44px] text-left hover:bg-[#ffffff]/5 ${FOCUS_RING}`}>
              <img src="/main ui/logout.png" alt="" className="w-7 h-7 object-contain" />
              <span className="text-[#e8d0a0] text-[14px] font-bold">Log out</span>
            </button>
          </div>
        </nav>
      )}

      {!hidden && layout !== 'sidebar' && (
        <nav
          aria-label="Main"
          className={layout === 'rail'
            ? 'fixed top-0 bottom-0 left-0 z-[79] flex flex-col items-stretch justify-evenly pt-10 pb-1'
            : 'fixed bottom-0 left-0 right-0 z-[79] flex items-start justify-around px-1 pt-1'}
          style={{
            width: layout === 'rail' ? RAIL_W : undefined,
            height: layout === 'bar' ? `calc(${BAR_H}px + env(safe-area-inset-bottom, 0px))` : undefined,
            paddingLeft: layout === 'rail' ? 'env(safe-area-inset-left, 0px)' : undefined,
            backgroundImage: DARK_BAR,
            boxShadow: layout === 'rail' ? '2px 0 8px -1px rgba(0,0,0,0.5)' : '0 -2px 8px -1px rgba(0,0,0,0.5)',
            borderTop: layout === 'bar' ? '2px solid #d4a017' : undefined,
            borderRight: layout === 'rail' ? '2px solid #d4a017' : undefined,
          }}
        >
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            const isCentre = tab.id === 'monster';
            const px = isCentre && layout === 'bar' ? 44 : 30;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => go(tab.id)}
                data-tutorial-id={`nav-${tab.id}`}
                aria-label={label(tab)}
                aria-current={isActive ? 'page' : undefined}
                className={`relative flex flex-col items-center justify-end gap-0.5 min-h-[52px] min-w-[48px] active:scale-95 transition-transform ${FOCUS_RING} ${layout === 'bar' ? 'flex-1' : ''}`}
              >
                <span className="relative" style={{ marginTop: isCentre && layout === 'bar' ? -18 : 0 }}>
                  <img src={tab.icon} alt="" className={`object-contain ${isActive ? 'nav-icon-active' : 'opacity-85'}`} style={{ width: px, height: px, filter: isActive ? undefined : 'saturate(0.75)' }} />
                  {badges[tab.id] && <Dot />}
                </span>
                <span className="text-center leading-[1.05]" style={{ ...TAB_TEXT, fontSize: 11, color: isActive ? '#f5c542' : '#e8d0a0', maxWidth: 70 }}>{tab.label}</span>
                {isActive && (
                  <span aria-hidden className={layout === 'rail' ? 'absolute left-0 top-2 bottom-2 w-1 rounded-r bg-[#f5c542]' : 'absolute -bottom-1 h-1 w-8 rounded-t bg-[#f5c542]'} />
                )}
              </button>
            );
          })}
        </nav>
      )}

      <AnimatePresence>
        {menuOpen && (
          <MenuSheet
            centred={layout !== 'bar'}
            showItems={layout !== 'sidebar'}
            onClose={() => setMenuOpen(false)}
            onItem={go}
            onLogout={() => { setMenuOpen(false); setConfirmingLogout(true); }}
            saveStatus={saveStatus}
            onSyncNow={onSyncNow}
          />
        )}
      </AnimatePresence>

      <LogoutConfirmDialog
        open={confirmingLogout}
        online={online}
        saveStatus={saveStatus}
        onCancel={() => setConfirmingLogout(false)}
        onLogout={onLogout}
      />
    </>
  );
}

function MenuSheet({ centred, showItems, onClose, onItem, onLogout, saveStatus, onSyncNow }: { centred: boolean; showItems: boolean; onClose: () => void; onItem: (id: PageId) => void; onLogout: () => void; saveStatus?: SaveStatus; onSyncNow?: () => void }) {
  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[90] bg-[#0a0807]/50" onClick={onClose} />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={showItems ? 'Menu' : 'Sound and saving'}
        {...(centred
          ? { initial: { opacity: 0, scale: 0.96 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 0.96 } }
          : { initial: { y: '100%' }, animate: { y: 0 }, exit: { y: '100%' } })}
        transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
        className={centred
          ? 'fixed z-[91] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(440px,calc(100vw-32px))] max-h-[88vh] overflow-y-auto bg-white border-2 border-[#4a2f18] rounded-3xl px-5 pt-6 pb-5'
          : 'fixed z-[91] left-0 right-0 bottom-0 max-h-[88vh] overflow-y-auto bg-white border-2 border-b-0 border-[#4a2f18] rounded-t-3xl px-5 pt-6'}
        style={{ boxShadow: '0 0 0 3px #d4a017', paddingBottom: centred ? undefined : 'calc(1.5rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <Nail className="top-2 left-2" />
        <Nail className="top-2 right-2" />
        <div className="flex items-center justify-between mb-2">
          <span className="text-lg" style={TAB_TEXT}>
            <span style={{ position: 'relative', display: 'inline-block' }}>
              <span aria-hidden style={questTextShadowStyle}>{showItems ? 'Menu' : 'Sound & saving'}</span>
              <span style={{ ...questTextStyle, color: '#f5c542' }}>{showItems ? 'Menu' : 'Sound & saving'}</span>
            </span>
          </span>
          <button type="button" onClick={onClose} className={`min-h-[44px] min-w-[44px] rounded-xl px-3 text-[13px] font-black text-[#57534e] hover:bg-stone-100 ${FOCUS_RING}`}>Close</button>
        </div>
        {showItems && (
          <div className="grid grid-cols-4 gap-2">
            {MENU_ITEMS.map(item => (
              <MenuTile key={item.id} icon={item.icon} label={item.label} onClick={() => onItem(item.id)} />
            ))}
            <MenuTile icon="/main ui/logout.png" label="Log out" onClick={() => { playPageFlip(); onLogout(); }} />
          </div>
        )}
        <div className="mt-3 flex flex-col gap-2">
          {saveStatus && <SaveStatusRow status={saveStatus} onSyncNow={onSyncNow} />}
          <SoundSettings />
        </div>
      </motion.div>
    </>
  );
}

function MenuTile({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }): ReactNode {
  return (
    <button type="button" onClick={onClick} className={`flex flex-col items-center justify-center gap-1 rounded-xl min-h-[72px] py-2 hover:bg-[#f0ddb8] ${FOCUS_RING}`}>
      <img src={icon} alt="" className="w-10 h-10 object-contain" />
      <span className="text-[#2a1505] text-[12px] font-black text-center leading-tight">{label}</span>
    </button>
  );
}

// "Back" for the pages the menu opens (no tab is lit there).
export function NavBackButton({ onBack }: { onBack: () => void }) {
  return (
    <button
      type="button"
      onClick={() => { playPageFlip(); onBack(); }}
      className={`mt-2 mb-1 inline-flex items-center gap-1.5 min-h-[44px] rounded-xl px-3 bg-[#f0ddb8] border-2 border-[#8b5e2a] text-[#2a1505] text-[14px] font-black active:scale-95 ${FOCUS_RING}`}
      style={{ boxShadow: '0 2px 0 #8b5e2a' }}
    >
      <span aria-hidden>←</span> Back
    </button>
  );
}
