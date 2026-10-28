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
import { useBackHandler } from '@/lib/backButton';

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

export type NavTabId = 'board' | 'guilds' | 'monster' | 'journal' | 'vault' | 'curios';
const TABS: { id: NavTabId; label: string; icon: string }[] = [
  { id: 'board',   label: 'Today',       icon: '/nav/today.png' },
  { id: 'guilds',  label: 'Side Quests', icon: '/nav/side-quests.png' },
  { id: 'monster', label: 'Curios',      icon: '/nav/curios.png' },
  { id: 'journal', label: 'Journal',     icon: '/nav/journal.png' },
  { id: 'vault',   label: 'Vault',       icon: '/nav/vault.png' },
];

// The map as the game's home (Rowil 2026-10-28, docs/map-home.md): the Map tab is home and
// Baylan in Inkwell Town gives out the Main Quests, so Today becomes Quests (raised, in the middle)
// and Side Quests moves to the menu (the guild masters give them on the map). Curios opens the
// Curio Arena menu over the map. Out of town the bar steps aside: see CalmButtons.
// No Vault button: the shop opens only from the Shopkeeper in Inkwell Town (Rowil 2026-10-28).
const HOME_TABS: { id: NavTabId; label: string; icon: string }[] = [
  { id: 'monster', label: 'Map',     icon: '/icons/mapicon.png' },
  { id: 'curios',  label: 'Curios',  icon: '/nav/curios.png' },
  { id: 'board',   label: 'Quests',  icon: '/main ui/mainquest.png' },
  { id: 'journal', label: 'Journal', icon: '/nav/journal.png' },
];

/** The map as home: where the kid is and the buttons that only exist then. */
export interface NavHome {
  /** In town (every button), out on another map (a few buttons) or on a page. */
  place: 'town' | 'wild' | 'page';
  /** Today's Main Quest is done (the gold "!" on Quests goes away). */
  questDone: boolean;
  onGoTown: () => void;
  onOpenCurios: () => void;
}

// Opened from the menu as pages with Back; 'todo' is reached from Today's chest
// and from old links.
export const NAV_PAGES = ['profile', 'codex', 'bonus_quests', 'todo'] as const;
type PageId = 'profile' | 'codex' | 'bonus_quests' | 'guilds' | 'journal' | 'vault';
// With the map as home the menu also has Side Quests, and out of town (no bar) Journal.
const SIDE_QUESTS_ITEM = { id: 'guilds' as const, label: 'Side Quests', icon: '/main ui/sidequest.png' };
const CALM_ITEMS: { id: PageId; label: string; icon: string }[] = [
  { id: 'journal', label: 'Journal', icon: '/nav/journal.png' },
];
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

// Today's Main Quest is waiting: the game's one gold "!" (the same as over Baylan's head).
function Bang({ big }: { big?: boolean }) {
  return (
    <span
      aria-hidden
      data-testid="quest-bang"
      className={`absolute flex items-center justify-center rounded-full pointer-events-none font-black text-[#2a1505] bg-[#ffd23f] border-2 border-[#7a4a0f] ${big ? '-top-1.5 -right-1.5 w-6 h-6 text-[15px]' : '-top-1.5 -right-2 w-5 h-5 text-[13px]'}`}
      style={{ boxShadow: '0 0 8px #ffd23f' }}
    >!</span>
  );
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
  /** The map is home (see NavHome); without it, the five tabs with Today. */
  home?: NavHome;
}

export default function GameNav({ activeTab, onNavigate, badges, hidden, hud, online, saveStatus, onSyncNow, onLogout, home }: GameNavProps) {
  const navLayout = useNavLayout();
  // Out on a map away from town: no bar or sidebar, only the calm buttons.
  const calm = home?.place === 'wild';
  const layout: NavLayout = calm && navLayout === 'sidebar' ? 'bar' : navLayout;
  const tabs = home ? HOME_TABS : TABS;
  const menuItems = home ? [SIDE_QUESTS_ITEM, ...(calm ? CALM_ITEMS : []), ...MENU_ITEMS] : MENU_ITEMS;
  // The Map tab is lit on the map; on the Curio Arena's own pages (team, hatchery...) Curios is.
  const litTab = home && activeTab === 'monster' && home.place === 'page' ? 'curios' : activeTab;
  const questBang = !!home && !home.questDone;
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmingLogout, setConfirmingLogout] = useState(false);

  useEffect(() => {
    const cls = document.body.classList;
    cls.add('new-nav', `new-nav-${layout}`);
    cls.toggle('new-nav-hidden', hidden);
    cls.toggle('new-nav-calm', calm);
    return () => cls.remove('new-nav', `new-nav-${layout}`, 'new-nav-hidden', 'new-nav-calm');
  }, [layout, hidden, calm]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  // Back closes the logout question or the menu before it changes the tab.
  useBackHandler(menuOpen || confirmingLogout, 10, () => {
    if (confirmingLogout) { setConfirmingLogout(false); return true; }
    if (menuOpen) { setMenuOpen(false); return true; }
    return false;
  });

  const go = (tab: string) => {
    playPageFlip();
    setMenuOpen(false);
    if (tab === 'curios' && home) home.onOpenCurios();
    else onNavigate(tab);
  };
  const label = (t: { id: NavTabId; label: string }) => `${t.label}${badges[t.id] ? ', something new' : ''}`;
  const openMenu = () => { playPageFlip(); setMenuOpen(true); };
  const menuButton = (
    <button
      type="button"
      onClick={openMenu}
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
          // Out of town the top bar keeps only the kid's name, level and gold.
          {...(calm ? { weekLabel: undefined, playerGrade: undefined } : {})}
          isDesktop={layout === 'sidebar'}
          isLandscape={layout !== 'bar'}
          left={calm ? 0 : layout === 'sidebar' ? SIDEBAR_W : layout === 'rail' ? RAIL_W : 0}
          // With the map as home the menu is in the bar, or with the calm buttons out of town.
          leading={home || layout === 'sidebar' ? undefined : menuButton}
        />
      )}

      {!hidden && calm && home && <CalmButtons questBang={questBang} onQuests={() => go('board')} onTown={() => { playPageFlip(); home.onGoTown(); }} onMenu={openMenu} onCurios={() => go('curios')} />}

      {!hidden && !calm && layout === 'sidebar' && (
        <nav aria-label="Main" className="fixed top-0 bottom-0 left-0 z-[79] flex flex-col" style={{ width: SIDEBAR_W, backgroundImage: DARK_BAR, borderRight: '2px solid #d4a017', boxShadow: '2px 0 8px -1px rgba(0,0,0,0.5)' }}>
          <div className="flex items-center justify-center h-16">
            <img src="/learning_hall_full_logo_optimize.png" alt="Learning Hall" className="h-10 object-contain" />
          </div>
          <div className="flex flex-col gap-1 px-2 pt-2">
            {tabs.map(tab => {
              const isActive = litTab === tab.id;
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
                    {tab.id === 'board' && questBang ? <Bang /> : badges[tab.id] && <Dot />}
                  </span>
                  <span style={{ ...TAB_TEXT, fontSize: 15, color: isActive ? '#f5c542' : '#e8d0a0' }}>{tab.label}</span>
                </button>
              );
            })}
          </div>
          <div className="flex-1" />
          <div className="flex flex-col gap-0.5 mx-2 px-2 pb-3 pt-2 border-t border-[#ffffff]/10">
            {menuItems.map(item => (
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

      {!hidden && !calm && layout !== 'sidebar' && (
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
          {tabs.map(tab => {
            const isActive = litTab === tab.id;
            const isCentre = tab.id === (home ? 'board' : 'monster');
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
                  {tab.id === 'board' && questBang ? <Bang big={isCentre && layout === 'bar'} /> : badges[tab.id] && <Dot />}
                </span>
                <span className="text-center leading-[1.05]" style={{ ...TAB_TEXT, fontSize: 11, color: isActive ? '#f5c542' : '#e8d0a0', maxWidth: 70 }}>{tab.label}</span>
                {isActive && (
                  <span aria-hidden className={layout === 'rail' ? 'absolute left-0 top-2 bottom-2 w-1 rounded-r bg-[#f5c542]' : 'absolute -bottom-1 h-1 w-8 rounded-t bg-[#f5c542]'} />
                )}
              </button>
            );
          })}
          {/* With the map as home the menu sits in the bar, where Vault was (Rowil 2026-10-28). */}
          {home && (
            <button
              type="button"
              onClick={openMenu}
              aria-label="Menu"
              aria-haspopup="dialog"
              className={`relative flex flex-col items-center justify-end gap-0.5 min-h-[52px] min-w-[48px] active:scale-95 transition-transform ${FOCUS_RING} ${layout === 'bar' ? 'flex-1' : ''}`}
            >
              <img src="/nav/menu.png" alt="" className="object-contain opacity-85" style={{ width: 30, height: 30, filter: 'saturate(0.75)' }} />
              <span className="text-center leading-[1.05]" style={{ ...TAB_TEXT, fontSize: 11, color: '#e8d0a0', maxWidth: 70 }}>Menu</span>
            </button>
          )}
        </nav>
      )}

      <AnimatePresence>
        {menuOpen && (
          <MenuSheet
            centred={layout !== 'bar'}
            showItems={layout !== 'sidebar' || calm}
            items={menuItems}
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

function MenuSheet({ centred, showItems, items, onClose, onItem, onLogout, saveStatus, onSyncNow }: { centred: boolean; showItems: boolean; items: { id: PageId; label: string; icon: string }[]; onClose: () => void; onItem: (id: PageId) => void; onLogout: () => void; saveStatus?: SaveStatus; onSyncNow?: () => void }) {
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
            {items.map(item => (
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

// Out on a map away from town (Rowil 2026-10-28: most buttons live in town): Quests, with the
// gold "!" while today's Main Quest waits, and Town, straight home to Baylan. They sit on the right
// above the Curio Arena button; the Menu button stays in the top bar.
function CalmButtons({ questBang, onQuests, onTown, onMenu, onCurios }: { questBang: boolean; onQuests: () => void; onTown: () => void; onMenu: () => void; onCurios: () => void }) {
  const round = `relative flex flex-col items-center justify-center rounded-full border-[3px] active:scale-95 ${FOCUS_RING}`;
  return (
    <div className="home-calm-buttons fixed right-3 z-[80] flex flex-col items-center gap-2.5" style={{ bottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}>
      <button type="button" onClick={onQuests} aria-label={questBang ? "Quests, today's quest is waiting" : 'Quests'} data-testid="calm-quests"
        className={round} style={{ width: 66, height: 66, backgroundImage: DARK_BAR, borderColor: questBang ? '#ffd23f' : '#d4a017', boxShadow: questBang ? '0 0 14px #ffd23f, 0 3px 8px rgba(0,0,0,0.5)' : '0 3px 8px rgba(0,0,0,0.5)' }}>
        <img src="/main ui/mainquest.png" alt="" className="w-9 h-9 object-contain" />
        <span style={{ ...TAB_TEXT, fontSize: 9, color: '#f5c542' }}>Quests</span>
        {questBang && <Bang big />}
      </button>
      <button type="button" onClick={onTown} aria-label="Go to town" data-testid="calm-town"
        className={round} style={{ width: 56, height: 56, backgroundImage: DARK_BAR, borderColor: '#d4a017', boxShadow: '0 3px 8px rgba(0,0,0,0.5)' }}>
        <span aria-hidden className="text-[24px] leading-none">🏘️</span>
        <span style={{ ...TAB_TEXT, fontSize: 9, color: '#e8d0a0' }}>Town</span>
      </button>
      {/* Stands in for the Curio Arena stadium button, which hides out of town (globals.css). */}
      <button type="button" onClick={onCurios} aria-label="Curios" data-testid="calm-curios"
        className={round} style={{ width: 56, height: 56, backgroundImage: DARK_BAR, borderColor: '#d4a017', boxShadow: '0 3px 8px rgba(0,0,0,0.5)' }}>
        <img src="/nav/curios.png" alt="" className="w-7 h-7 object-contain" />
        <span style={{ ...TAB_TEXT, fontSize: 9, color: '#e8d0a0' }}>Curios</span>
      </button>
      <button type="button" onClick={onMenu} aria-label="Menu" aria-haspopup="dialog" data-testid="calm-menu"
        className={round} style={{ width: 56, height: 56, backgroundImage: DARK_BAR, borderColor: '#d4a017', boxShadow: '0 3px 8px rgba(0,0,0,0.5)' }}>
        <img src="/nav/menu.png" alt="" className="w-7 h-7 object-contain" />
        <span style={{ ...TAB_TEXT, fontSize: 9, color: '#e8d0a0' }}>Menu</span>
      </button>
    </div>
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
