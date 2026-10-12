'use client';
// components/dev/NavRedesignMockup.tsx
//
// MOCKUP ONLY: a proposed replacement for the compass-menu navigation
// (components/SidebarRail.tsx) and the Curio Arena's second floating menu
// (components/MonsterGuild.tsx's ARENA_TABS drawer). Shown in /dev/ui-gallery,
// not wired into the real app. Every device renders inside its own frame
// (absolute, scaled) so nothing takes over the gallery page.
//
// Revised 2026-10-11 from real play history of the two family accounts
// (~60 days each, mostly desktop) plus 30 days of all kids (mostly Android):
// - The To-Do checklist is the real hub, so "Today" (To-Do + Main Quests) is
//   home, and on desktop the To-Do stays pinned on the right.
// - Side Quests (most played) and Journal (near daily) get their own tabs.
// - Side Quests -> Vault -> Side Quests is a gold loop: Vault keeps a tab.
// - Live battles with someone you know get heavy use; trades get none.
// - Red dots are static (no pulse) and bubble up to the visible tab.
//
// Game moments (quiz, guild run, battles, training map, wild encounter):
// the nav steps aside on EVERY device (today only phones hide it, during
// battles), a slim focus bar shows one exit, and leaving asks twice in-page
// (never window.confirm) with the real cost spelled out. Live battles have
// no exit at all, only Surrender, since leaving counts as a disconnect loss.
// Invites become a small non-blocking chip during activities instead of a
// 15-second Accept/Decline toast.

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import GameButton, { QUIZ_OPTION_STYLES, questButtonFontFamily, questButtonLetterSpacing, questTextShadowStyle, questTextStyle } from '@/components/GameButton';
import { Nail, woodTextureStyle } from '@/components/battle/MonsterHpPanel';
import { playPageFlip } from '@/lib/sounds';

type TabId = 'today' | 'sidequests' | 'curios' | 'journal' | 'vault';
type ArenaPanel = 'team' | 'hatchery' | 'compendium' | 'leaderboard' | 'battle';
type DeviceId = 'phone' | 'phoneLandscape' | 'tablet' | 'desktop';
type NavLayout = 'bar' | 'rail' | 'sidebar';
type Moment = 'none' | 'quiz' | 'guild' | 'trainer' | 'live' | 'map' | 'wild' | 'results';

const DEVICES: Record<DeviceId, { label: string; width: number; height: number; scale: number; layout: NavLayout; radius: number; safeBottom: number }> = {
  phone:          { label: 'Phone',           width: 375,  height: 740,  scale: 1,    layout: 'bar',     radius: 34, safeBottom: 14 },
  phoneLandscape: { label: 'Phone landscape', width: 760,  height: 380,  scale: 1,    layout: 'rail',    radius: 34, safeBottom: 0 },
  tablet:         { label: 'Tablet',          width: 768,  height: 1024, scale: 0.66, layout: 'bar',     radius: 28, safeBottom: 14 },
  desktop:        { label: 'Desktop',         width: 1280, height: 800,  scale: 0.7,  layout: 'sidebar', radius: 12, safeBottom: 0 },
};

const MOMENTS: { id: Moment; label: string }[] = [
  { id: 'none', label: 'Browsing' },
  { id: 'quiz', label: 'Main Quest quiz' },
  { id: 'guild', label: 'Side Quest run' },
  { id: 'results', label: 'Side Quest results' },
  { id: 'trainer', label: 'Trainer battle' },
  { id: 'live', label: 'Live battle' },
  { id: 'map', label: 'Training map' },
  { id: 'wild', label: 'Wild encounter' },
];

// What leaving costs, per moment. Checked against the code on 2026-10-11:
// quiz attempts only count on submit; guild gold/XP is saved when the run
// finishes; an in-progress trainer fight isn't saved; leaving a live battle
// is a forfeit_disconnect loss.
const MOMENT_RULES: Record<Exclude<Moment, 'none'>, { title: string; exit: 'confirm' | 'direct' | 'surrender' | 'none'; exitLabel: string; cost: string; note: string }> = {
  quiz:    { title: 'Main Quest',     exit: 'confirm',   exitLabel: 'Leave',      cost: 'Your answers will be cleared. Today\'s attempt is not used up.', note: 'The quiz keeps its own progress bar pinned to the bottom, right where the tab bar sits, so the tab bar has to step aside.' },
  guild:   { title: 'Lexicon Arena',  exit: 'confirm',   exitLabel: 'Retreat',    cost: 'This run\'s gold and XP are only saved at the end, and it won\'t count for today\'s To-Do.', note: 'Full screen on every device, as today. The only change is a visible way out with an honest warning.' },
  results: { title: 'Run complete',   exit: 'direct',    exitLabel: 'Done',       cost: '', note: 'The results screen hands kids straight to their next real step (next guild, Vault, or Today) instead of dropping them back on a hub.' },
  trainer: { title: 'Trainer battle', exit: 'confirm',   exitLabel: 'Retreat',    cost: 'This fight won\'t count, and any gold or items you already used in it are gone.', note: 'Today the compass stays visible during battles on desktop and tablet, so one click on the menu can drop the fight without warning.' },
  live:    { title: 'Live battle',    exit: 'surrender', exitLabel: 'Surrender',  cost: 'Surrendering counts as a loss.', note: 'Leaving a live battle counts as a disconnect and your opponent wins, so there is no nav and no back, only Surrender.' },
  map:     { title: 'The Cinderreach', exit: 'direct',   exitLabel: 'World Map',  cost: '', note: 'The joystick needs the bottom-left corner, so the tab bar hides here too. Back goes straight to the World Map, no warning needed.' },
  wild:    { title: 'Wild encounter', exit: 'direct',    exitLabel: 'Walk away',  cost: '', note: 'A modal over the map. Everything behind it, nav included, is blocked until the kid catches or walks away.' },
};

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'today',      label: 'Today',       icon: '/main ui/todo.png' },
  { id: 'sidequests', label: 'Side Quests', icon: '/main ui/sidequest.png' },
  { id: 'curios',     label: 'Curios',      icon: '/main ui/curioarena.png' },
  { id: 'journal',    label: 'Journal',     icon: '/main ui/journal.png' },
  { id: 'vault',      label: 'Vault',       icon: '/main ui/rewardvault.png' },
];

const GUILDS = [
  { name: 'Lexicon Arena', bg: '/guilds/lex-bg.png' },
  { name: 'SpellCaster', bg: '/guilds/spell-bg.png' },
  { name: 'Logic Labyrinth', bg: '/guilds/logic-bg.png' },
  { name: 'Number Realm', bg: '/guilds/number-bg.png' },
  { name: 'Lorekeeper', bg: '/guilds/lorekeeper-bg.png' },
];

const MENU_ITEMS = [
  { label: 'Profile', icon: '/main ui/profile.png' },
  { label: 'Codex', icon: '/main ui/codex.png' },
  { label: 'Bonus Quests', icon: '/main ui/bonusquest.png' },
  { label: 'Logout', icon: '/main ui/logout.png' },
];

// Style guide button roles (docs/STYLE_GUIDE.md): blue = go, brown =
// secondary, gray = dismiss, red = destructive, default gold = reward/primary.
const BLUE = '#2563eb';
const BROWN = '#8b5e2a';
const GRAY = '#57534e';
const RED = '#dc2626';

// After a "Not now", the sender can't re-invite that kid for this long. In
// the family accounts' history most declines came in bursts: the same
// invite re-sent 2-5 times within two minutes, declined every time.
const INVITE_COOLDOWN_MS = 5 * 60 * 1000;

function mmss(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const sec = totalSeconds % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

const DARK_BAR = `linear-gradient(rgba(10,8,7,0.55), rgba(10,8,7,0.55)), ${woodTextureStyle.backgroundImage}`;
const HUD_H = 44;
const RAIL_W = 76;
const SIDEBAR_W = 210;
const TODAY_PANEL_W = 300;

interface DayState {
  journalDone: boolean;
  questDone: boolean;
  mapDone: boolean;
  guildsPlayed: number;
  eggReady: boolean;
  classmateOnline: boolean;
}

function QuestText({ children, size, color }: { children: string; size: number; color?: string }) {
  return (
    <span style={{ fontFamily: questButtonFontFamily, letterSpacing: questButtonLetterSpacing, fontSize: size }}>
      <span style={{ position: 'relative', display: 'inline-block' }}>
        <span aria-hidden style={questTextShadowStyle}>{children}</span>
        <span style={{ ...questTextStyle, ...(color ? { color } : null) }}>{children}</span>
      </span>
    </span>
  );
}

// Static on purpose: no pulse/blink.
function RedDot({ small }: { small?: boolean }) {
  return <img src="/icons/red_alert.png" alt="" className={`absolute object-contain pointer-events-none ${small ? 'w-3 h-3 -top-0.5 -right-0.5' : 'w-5 h-5 -top-1.5 -right-1.5'}`} />;
}

function CountPill({ text }: { text: string }) {
  return <span className="absolute -top-1 -right-3 rounded-full bg-[#dc2626] text-[#ffffff] text-[9px] font-black px-1 leading-[14px] pointer-events-none">{text}</span>;
}

function LockGlyph() {
  return (
    <svg viewBox="0 0 16 16" className="w-3 h-3" aria-hidden>
      <path d="M4 7V5a4 4 0 1 1 8 0v2" fill="none" stroke="currentColor" strokeWidth="2" />
      <rect x="2.5" y="7" width="11" height="8" rx="1.5" fill="currentColor" />
    </svg>
  );
}

function ParchmentCard({ children, className = '', highlight }: { children: ReactNode; className?: string; highlight?: boolean }) {
  return (
    <div
      className={`relative bg-[#f0ddb8] border-2 rounded-2xl ${highlight ? 'border-[#c9781a]' : 'border-[#8b5e2a]'} ${className}`}
      style={{ boxShadow: highlight ? '0 3px 0 #c9781a, 0 0 0 3px rgba(245,201,92,.6)' : '0 3px 0 #8b5e2a' }}
    >
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <span className="text-[#7a4a0f] text-xs font-black uppercase tracking-wide px-1">{children}</span>;
}

// Small quest-variant GameButton for inline actions.
function SmallButton({ children, onClick, color = BLUE, size = 11, className = '' }: { children: ReactNode; onClick: () => void; color?: string; size?: number; className?: string }) {
  return (
    <GameButton variant="quest" color={color} onClick={onClick} className={`shrink-0 whitespace-nowrap ${className}`} style={{ fontSize: size }}>
      {children}
    </GameButton>
  );
}

// ─── HUD ────────────────────────────────────────────────────────────────────
function GoldChip({ onClick }: { onClick?: () => void }) {
  return (
    <button onClick={onClick} disabled={!onClick} className="inline-flex items-center gap-1 rounded-full bg-[#0a0807]/60 text-xs px-2 py-1 active:scale-95 transition-transform" style={{ boxShadow: 'inset 0 0 0 1px #d4a017' }} title={onClick ? 'Opens the Vault' : undefined}>
      <img src="/icons/rewards/gold_coin.svg" alt="" className="w-3.5 h-3.5" />
      <span style={{ color: '#f5c542', fontFamily: questButtonFontFamily }}>1,250</span>
    </button>
  );
}

function Hud({ onGold, onName, onMenu, showMenu, left }: { onGold: () => void; onName: () => void; onMenu: () => void; showMenu: boolean; left: number }) {
  return (
    <div className="absolute top-0 right-0 z-30 px-3 flex items-center gap-2" style={{ left, height: HUD_H, backgroundImage: DARK_BAR, boxShadow: '0 2px 8px -1px rgba(0,0,0,0.5)' }}>
      <button onClick={onName} className="flex items-center gap-1.5 active:scale-95 transition-transform" title="Opens your profile">
        <QuestText size={13}>Hero</QuestText>
        <span className="text-amber-400 text-xs leading-none" style={{ fontFamily: questButtonFontFamily }}>Lv.12</span>
      </button>
      <GoldChip onClick={onGold} />
      <span className="inline-flex items-center gap-1 rounded-full bg-[#0a0807]/60 text-xs px-2 py-1" style={{ boxShadow: 'inset 0 0 0 1px #ea580c' }}>
        <img src="/icons/streakicon.png" alt="" className="w-3.5 h-3.5" />
        <span style={{ color: '#fb923c', fontFamily: questButtonFontFamily }}>6</span>
      </span>
      <div className="flex-1" />
      <img src="/icons/notificationbell.png" alt="" className="w-7 h-7 object-contain" />
      {showMenu && (
        <button onClick={onMenu} className="active:scale-95 transition-transform" aria-label="Menu" title="Profile, Codex, Bonus Quests, settings">
          <img src="/compass-menu.png" alt="" className="w-8 h-8 object-contain" />
        </button>
      )}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#0a0807]/90">
        <div className="h-full bg-gradient-to-r from-amber-500 to-[#f5c542]" style={{ width: '62%' }} />
      </div>
    </div>
  );
}

// Focus bar: replaces the HUD + nav during a game moment. One exit on the
// left, the activity name, gold on the right. Leaving asks twice in-page.
function FocusBar({ moment, armed, onExit }: { moment: Exclude<Moment, 'none'>; armed: boolean; onExit: () => void }) {
  const rule = MOMENT_RULES[moment];
  const isSurrender = rule.exit === 'surrender';
  return (
    <div className="absolute top-0 left-0 right-0 z-30 px-2 flex items-center gap-2" style={{ height: HUD_H, backgroundImage: DARK_BAR, boxShadow: '0 2px 8px -1px rgba(0,0,0,0.5)' }}>
      {rule.exit !== 'none' && (
        <SmallButton
          onClick={onExit}
          color={armed || isSurrender ? RED : BROWN}
          size={12}
        >
          {armed ? (isSurrender ? 'Tap again to surrender' : 'Tap again to leave') : rule.exitLabel}
        </SmallButton>
      )}
      <div className="flex-1 min-w-0 text-center truncate"><QuestText size={13}>{rule.title}</QuestText></div>
      <GoldChip />
    </div>
  );
}

// ─── Primary nav: bottom bar / side rail / desktop sidebar ─────────────────
type Badges = Partial<Record<TabId, { dot?: boolean; count?: string }>>;

function tabBarHeight(iconPx: number, safeBottom: number) {
  return Math.max(60, iconPx + 34) + safeBottom;
}

function TabBadge({ badge, small }: { badge?: { dot?: boolean; count?: string }; small?: boolean }) {
  if (!badge) return null;
  if (badge.count) return <CountPill text={badge.count} />;
  if (badge.dot) return <RedDot small={small} />;
  return null;
}

// roomy (tablet): icon and label side by side in a centred group, like iPad
// tab bars, instead of five small icons stretched across a wide screen.
// safeBottom: room for the phone's home indicator (env(safe-area-inset-bottom)
// in the real build; the kid shell has no safe-area handling today).
function TabBar({ active, onSelect, badges, layout, iconPx, roomy, safeBottom }: { active: TabId; onSelect: (t: TabId) => void; badges: Badges; layout: 'bar' | 'rail'; iconPx: number; roomy?: boolean; safeBottom: number }) {
  const vertical = layout === 'rail';
  const centrePx = Math.round(iconPx * 1.45);
  return (
    <nav
      className={vertical
        ? 'absolute bottom-0 left-0 z-30 flex flex-col items-stretch justify-evenly py-1'
        : `absolute bottom-0 left-0 right-0 z-30 flex px-1 ${roomy ? 'items-start justify-center gap-2 pt-1.5' : 'items-start justify-around pt-1'}`}
      style={{
        top: vertical ? HUD_H : undefined,
        width: vertical ? RAIL_W : undefined,
        height: vertical ? undefined : tabBarHeight(iconPx, safeBottom),
        backgroundImage: DARK_BAR,
        boxShadow: vertical ? '2px 0 8px -1px rgba(0,0,0,0.5)' : '0 -2px 8px -1px rgba(0,0,0,0.5)',
        borderTop: vertical ? undefined : '2px solid #d4a017',
        borderRight: vertical ? '2px solid #d4a017' : undefined,
      }}
    >
      {TABS.map(tab => {
        const isActive = active === tab.id;
        const isCentre = tab.id === 'curios';
        const px = isCentre ? centrePx : iconPx;
        return (
          <button
            key={tab.id}
            onClick={() => { playPageFlip(); onSelect(tab.id); }}
            className={`relative flex items-center min-h-[48px] min-w-[48px] active:scale-95 transition-transform ${roomy ? `flex-row gap-2 px-4 rounded-xl ${isActive ? 'bg-[#f5c542]/15' : ''}` : `flex-col justify-end gap-0.5 ${vertical ? '' : 'flex-1'}`}`}
            style={roomy && isActive ? { boxShadow: 'inset 0 0 0 1px #d4a017' } : undefined}
            aria-label={tab.label}
            aria-current={isActive ? 'page' : undefined}
          >
            <span className="relative" style={{ marginTop: isCentre && !vertical && !roomy ? -Math.round(centrePx * 0.45) : 0 }}>
              <img src={tab.icon} alt="" className={`object-contain ${isActive ? 'nav-icon-active' : 'opacity-85'}`} style={{ width: px, height: px, filter: isActive ? undefined : 'saturate(0.75)' }} />
              <TabBadge badge={badges[tab.id]} small />
            </span>
            <span className={roomy ? 'whitespace-nowrap' : 'text-center leading-[1.05]'} style={{ fontFamily: questButtonFontFamily, letterSpacing: questButtonLetterSpacing, fontSize: roomy ? 13 : 10, color: isActive ? '#f5c542' : '#e8d0a0', maxWidth: roomy ? undefined : 64 }}>
              {tab.label}
            </span>
            {isActive && !roomy && (
              <motion.span layoutId={`tab-underline-${layout}`} className={vertical ? 'absolute left-0 top-2 bottom-2 w-1 rounded-r bg-[#f5c542]' : 'absolute -bottom-1 h-1 w-8 rounded-t bg-[#f5c542]'} />
            )}
          </button>
        );
      })}
    </nav>
  );
}

function Sidebar({ active, onSelect, badges, iconPx, onMenuItem }: { active: TabId; onSelect: (t: TabId) => void; badges: Badges; iconPx: number; onMenuItem: (label: string) => void }) {
  return (
    <nav className="absolute top-0 bottom-0 left-0 z-30 flex flex-col" style={{ width: SIDEBAR_W, backgroundImage: DARK_BAR, borderRight: '2px solid #d4a017', boxShadow: '2px 0 8px -1px rgba(0,0,0,0.5)' }}>
      <div className="flex items-center justify-center" style={{ height: HUD_H + 12 }}>
        <img src="/learning_hall_full_logo_optimize.png" alt="Learning Hall" className="h-9 object-contain" />
      </div>
      <div className="flex flex-col gap-1 px-2 pt-2">
        {TABS.map(tab => {
          const isActive = active === tab.id;
          const isCentre = tab.id === 'curios';
          return (
            <button
              key={tab.id}
              onClick={() => { playPageFlip(); onSelect(tab.id); }}
              className={`relative flex items-center gap-3 rounded-xl px-3 transition-colors ${isActive ? 'bg-[#f5c542]/15' : 'hover:bg-[#ffffff]/5'}`}
              style={{ minHeight: 48, boxShadow: isActive ? 'inset 0 0 0 1px #d4a017' : undefined }}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="relative shrink-0">
                <img src={tab.icon} alt="" className={`object-contain ${isActive ? 'nav-icon-active' : ''}`} style={{ width: isCentre ? iconPx + 8 : iconPx, height: isCentre ? iconPx + 8 : iconPx }} />
                <TabBadge badge={badges[tab.id]} small />
              </span>
              <span style={{ fontFamily: questButtonFontFamily, letterSpacing: questButtonLetterSpacing, fontSize: 14, color: isActive ? '#f5c542' : '#e8d0a0' }}>{tab.label}</span>
            </button>
          );
        })}
      </div>
      <div className="flex-1" />
      <div className="flex flex-col gap-0.5 px-2 pb-3 pt-2 border-t border-[#ffffff]/10 mx-2">
        {MENU_ITEMS.map(item => (
          <button key={item.label} onClick={() => { playPageFlip(); onMenuItem(item.label); }} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-[#ffffff]/5 text-left">
            <img src={item.icon} alt="" className="w-5 h-5 object-contain" />
            <span className="text-[#e8d0a0] text-xs font-bold">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

// ─── Today: the checklist hub ───────────────────────────────────────────────
type GoTarget = 'journal' | 'quest' | 'map' | 'guild' | 'hatchery' | 'battle';

function Checklist({ day, onGo, compact }: { day: DayState; onGo: (target: GoTarget) => void; compact?: boolean }) {
  const nextGuild = GUILDS[day.guildsPlayed]?.name;
  const rows: { label: string; done: boolean; action?: string; target: GoTarget }[] = [
    { label: "Fill out today's journal entry", done: day.journalDone, action: 'Write', target: 'journal' },
    { label: "Finish today's Main Quest", done: day.questDone, action: 'Start', target: 'quest' },
    { label: 'Answer a training map question correctly', done: day.mapDone, action: 'Map', target: 'map' },
    { label: `Play every Side Quest guild (${day.guildsPlayed}/${GUILDS.length})`, done: day.guildsPlayed >= GUILDS.length, action: nextGuild ? 'Next' : undefined, target: 'guild' },
  ];
  const doneCount = rows.filter(r => r.done).length;
  const allDone = doneCount === rows.length;
  return (
    <ParchmentCard className="p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[#7a4a0f] text-sm font-black uppercase tracking-wide">Today&apos;s To-Do</span>
        <span className="text-[#6b4820] text-xs font-bold">{doneCount}/{rows.length}</span>
      </div>
      <div className="flex flex-col gap-1.5">
        {rows.map(r => (
          <div key={r.target} className="flex items-center gap-2 bg-[#e8d0a0]/60 rounded-xl px-2.5 py-1.5">
            <span className={`w-4 h-4 rounded border-2 shrink-0 ${r.done ? 'bg-green-600 border-green-700' : 'bg-white border-[#8b5e2a]'}`} />
            <span className={`flex-1 ${compact ? 'text-[12px]' : 'text-[13px]'} font-bold leading-tight ${r.done ? 'text-[#6b4820] line-through' : 'text-[#2a1505]'}`}>
              {r.label}
              {r.target === 'guild' && !r.done && nextGuild && <span className="block text-[11px] font-bold text-[#6b4820]">Next up: {nextGuild}</span>}
            </span>
            {!r.done && r.action && <SmallButton onClick={() => onGo(r.target)}>{r.action}</SmallButton>}
          </div>
        ))}
      </div>
      <div className="mt-2.5" style={{ fontSize: 15 }}>
        <GameButton variant="quest" color={allDone ? undefined : '#a8a29e'} disabled={!allDone} className="w-full">
          {allDone ? 'Claim daily bonus' : 'Finish all to claim'}
        </GameButton>
      </div>
    </ParchmentCard>
  );
}

function MainQuestList({ iconPx, wide, highlight, onStart }: { iconPx: number; wide: boolean; highlight: boolean; onStart: () => void }) {
  const quests = ['Mathematics: Fractions', 'Science: Plant Parts', 'English: Verb Tenses', 'Filipino: Pangngalan'];
  return (
    <>
      <SectionLabel>This week&apos;s Main Quests</SectionLabel>
      <div className={`grid gap-2 ${wide ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {quests.map((q, i) => (
          <ParchmentCard key={q} className="p-3 flex items-center gap-3" highlight={highlight && i === 0}>
            <img src="/main ui/mainquest.png" alt="" className="object-contain" style={{ width: iconPx, height: iconPx }} />
            <span className="flex-1 text-[#2a1505] text-sm font-bold">{q}</span>
            {i === 0
              ? <SmallButton onClick={onStart}>Start</SmallButton>
              : <span className="text-[10px] font-black uppercase rounded-full px-2 py-0.5 bg-[#e8d0a0] text-[#6b4820]">Locked</span>}
          </ParchmentCard>
        ))}
      </div>
    </>
  );
}

function TodayScreen({ day, onGo, iconPx, wide, checklistPinned, questHighlight }: { day: DayState; onGo: (target: GoTarget) => void; iconPx: number; wide: boolean; checklistPinned: boolean; questHighlight: boolean }) {
  return (
    <div className="flex flex-col gap-3 p-3">
      {!checklistPinned && <Checklist day={day} onGo={onGo} />}
      {day.eggReady && (
        <ParchmentCard className="p-3 flex items-center gap-3">
          <img src="/eggs/egg_light_200px.png" alt="" className="w-11 h-11 object-contain" />
          <div className="flex-1 min-w-0">
            <p className="text-[#2a1505] text-sm font-black">Your egg is ready to hatch</p>
            <p className="text-[#6b4820] text-xs">Opens the Hatchery inside Curios.</p>
          </div>
          <SmallButton onClick={() => onGo('hatchery')}>Hatch</SmallButton>
        </ParchmentCard>
      )}
      {/* Only possible once the invite listener and online status run on
          every tab (today they only run inside the Curio Arena). */}
      {day.classmateOnline && (
        <ParchmentCard className="p-3 flex items-center gap-3">
          <img src="/icons/trainericon.png" alt="" className="w-10 h-10 object-contain" />
          <div className="flex-1 min-w-0">
            <p className="text-[#2a1505] text-sm font-black">A classmate is online now</p>
            <p className="text-[#6b4820] text-xs">Challenge them to a live battle.</p>
          </div>
          <SmallButton onClick={() => onGo('battle')}>Battle</SmallButton>
        </ParchmentCard>
      )}
      <MainQuestList iconPx={iconPx} wide={wide} highlight={questHighlight} onStart={() => onGo('quest')} />
    </div>
  );
}

// ─── Side Quests ────────────────────────────────────────────────────────────
function SideQuestsScreen({ day, wide, highlight, onVault, onPlay }: { day: DayState; wide: boolean; highlight: string | null; onVault: () => void; onPlay: () => void }) {
  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="flex items-center gap-2">
        <SectionLabel>Side Quests</SectionLabel>
        <span className="text-[#6b4820] text-xs font-bold">{day.guildsPlayed}/{GUILDS.length} played today</span>
      </div>
      <div className={`grid gap-2 ${wide ? 'grid-cols-3' : 'grid-cols-2'}`}>
        {GUILDS.map((g, i) => {
          const played = i < day.guildsPlayed;
          const isNext = highlight === g.name;
          return (
            <button key={g.name} onClick={() => { playPageFlip(); onPlay(); }} className="relative h-20 rounded-2xl border-2 overflow-hidden bg-cover bg-center text-left active:translate-y-0.5" style={{ backgroundImage: `url('${g.bg}')`, borderColor: isNext ? '#c9781a' : '#8b5e2a', boxShadow: isNext ? '0 3px 0 #c9781a, 0 0 0 3px rgba(245,201,92,.7)' : '0 3px 0 #8b5e2a' }}>
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0807]/75 to-transparent" />
              <span className="absolute bottom-1.5 left-2"><QuestText size={12}>{g.name}</QuestText></span>
              {played && <span className="absolute top-1.5 right-1.5 rounded-full bg-green-600 border-2 border-green-800 text-white text-[9px] font-black px-1.5 leading-[14px]">Done today</span>}
              {isNext && <span className="absolute top-1.5 left-1.5 rounded-md bg-[#f5c542] border border-black text-black text-[9px] font-black px-1 leading-tight">NEXT</span>}
            </button>
          );
        })}
      </div>
      <ParchmentCard className="p-3 flex items-center gap-3">
        <img src="/icons/rewards/gold_coin.svg" alt="" className="w-8 h-8" />
        <div className="flex-1 min-w-0">
          <p className="text-[#2a1505] text-sm font-black">1,250 gold to spend</p>
          <p className="text-[#6b4820] text-xs">Earn here, spend in the Vault, come back for more.</p>
        </div>
        <SmallButton onClick={onVault} color={BROWN}>Vault</SmallButton>
      </ParchmentCard>
    </div>
  );
}

// ─── Curio Arena hub ────────────────────────────────────────────────────────
function EdgeButton({ icon, label, onClick, badge, locked, count, iconPx }: { icon: string; label: string; onClick: () => void; badge?: boolean; locked?: string; count?: number; iconPx: number }) {
  const plate = Math.max(44, iconPx + 14);
  return (
    <button onClick={onClick} className="relative flex flex-col items-center gap-0.5 active:scale-95 transition-transform w-[68px]">
      <span className="relative rounded-xl flex items-center justify-center border-2 border-[#4a2f18]" style={{ width: plate, height: plate, ...woodTextureStyle, boxShadow: '0 0 0 2px #d4a017, 0 3px 0 2px rgba(0,0,0,0.55)' }}>
        <img src={icon} alt="" className={`object-contain ${locked ? 'grayscale opacity-60' : ''}`} style={{ width: iconPx, height: iconPx }} />
        {badge && <RedDot small />}
        {locked && (
          <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 inline-flex items-center gap-0.5 rounded-full bg-[#1a0d05] text-[#e8d0a0] text-[9px] font-black px-1.5 py-0.5 whitespace-nowrap"><LockGlyph />{locked}</span>
        )}
        {count !== undefined && !locked && (
          <span className="absolute -bottom-1.5 -right-1.5 rounded-full bg-[#1a0d05] text-[#f5c542] text-[10px] font-black px-1.5 leading-tight" style={{ boxShadow: 'inset 0 0 0 1px #d4a017' }}>{count}</span>
        )}
      </span>
      <span className="mt-1 rounded bg-[#0a0807]/70 px-1.5" style={{ fontFamily: questButtonFontFamily, fontSize: 10, color: '#ffffff', letterSpacing: questButtonLetterSpacing }}>{label}</span>
    </button>
  );
}

const REGIONS = [
  { name: 'The Cinderreach', x: '50%', y: '22%' },
  { name: 'The Rootbound Wilds', x: '56%', y: '45%' },
  { name: 'The Tidewrit Shallows', x: '46%', y: '66%' },
];

function CuriosScreen({ day, onOpen, onToast, onRegion, iconPx, ranksUnlocked }: { day: DayState; onOpen: (p: ArenaPanel) => void; onToast: (m: string) => void; onRegion: () => void; iconPx: number; ranksUnlocked: boolean }) {
  const open = (p: ArenaPanel) => { playPageFlip(); onOpen(p); };
  return (
    <div className="absolute inset-0">
      <img src="/maps/worldmap_new.webp" alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0807]/25 via-transparent to-[#0a0807]/40" />

      {REGIONS.map((r, i) => (
        <button key={r.name} onClick={() => { playPageFlip(); onRegion(); }} className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center active:scale-95" style={{ left: r.x, top: r.y }}>
          <span className={`w-4 h-4 rotate-45 border-2 border-[#4a2f18] ${!day.mapDone && i === 0 ? 'bg-[#ffffff]' : 'bg-[#f5c542]'}`} />
          <span className="mt-1 rounded bg-[#0a0807]/75 text-[#ffffff] text-[10px] font-black px-1.5 py-0.5 whitespace-nowrap">{r.name}</span>
          {!day.mapDone && i === 0 && <span className="mt-0.5 rounded bg-[#f5c542] border border-black text-black text-[9px] font-black px-1">Today&apos;s map task</span>}
        </button>
      ))}

      <div className="absolute left-2 top-3 flex flex-col gap-2.5">
        <EdgeButton icon="/icons/myteamicon.png" label="Team" iconPx={iconPx} onClick={() => open('team')} />
        <EdgeButton icon="/icons/hatcheryicon.png" label="Hatchery" iconPx={iconPx} onClick={() => open('hatchery')} badge={day.eggReady} />
        <EdgeButton icon="/icons/compendiumicon.png" label="Compendium" iconPx={iconPx} onClick={() => open('compendium')} count={15} />
      </div>
      <div className="absolute right-2 top-3 flex flex-col gap-2.5">
        <EdgeButton icon="/icons/leaderboardicon.png" label="Ranks" iconPx={iconPx} onClick={() => ranksUnlocked ? open('leaderboard') : onToast('Ranks unlock after your first 3 trainer wins')} locked={ranksUnlocked ? undefined : '3 wins'} />
      </div>

      <div className="absolute bottom-3 left-1/2 -translate-x-1/2" style={{ fontSize: 30 }}>
        <GameButton
          variant="quest"
          icon={<img src="/icons/trainericon.png" alt="" className="w-full h-full object-contain" />}
          sub={day.classmateOnline ? 'A classmate is online' : 'Trainers and classmates'}
          onClick={() => onOpen('battle')}
        >
          Battle
        </GameButton>
      </div>
    </div>
  );
}

const PANEL_COPY: Record<ArenaPanel, { title: string; icon: string; body: string }> = {
  team:        { title: 'My Team',    icon: '/icons/myteamicon.png',      body: 'Today\'s Team view, unchanged. Trade lives here now as a button on each curio: it had zero use in 30 days, even for the two family accounts who always have each other to trade with.' },
  hatchery:    { title: 'Hatchery',   icon: '/icons/hatcheryicon.png',    body: 'Eggs and hatching. Its red dot shows on the map edge, on the Curios tab, and as a card on Today.' },
  compendium:  { title: 'Compendium', icon: '/icons/compendiumicon.png',  body: 'The Compendium. The count badge shows how many curios you have caught.' },
  leaderboard: { title: 'Ranks',      icon: '/icons/leaderboardicon.png', body: 'The Leaderboard, also linked from the Battle sheet so ranks sit next to the fights that earn them.' },
  battle:      { title: 'Battle',     icon: '/icons/trainericon.png',     body: '' },
};

function ArenaSheet({ panel, day, ranksUnlocked, onClose, onSwitch, onStart, centred, cooldownLeft }: { panel: ArenaPanel; day: DayState; ranksUnlocked: boolean; onClose: () => void; onSwitch: (p: ArenaPanel) => void; onStart: (m: Moment) => void; centred: boolean; cooldownLeft: number }) {
  const copy = PANEL_COPY[panel];
  const liveSub = cooldownLeft > 0
    ? `They said not now. Try again in ${mmss(cooldownLeft)}`
    : day.classmateOnline ? 'Someone you know is online now' : 'Opens when a classmate is online';
  const live = { title: 'Battle a classmate', sub: liveSub, img: '/trainers/storm_caller.png', color: BLUE, locked: !day.classmateOnline || cooldownLeft > 0, go: () => onStart('live') };
  const trainers = { title: 'Trainers', sub: 'Fight trainers for gold and curio XP', img: '/trainers/ember_acolyte.png', color: undefined, locked: false, go: () => onStart('trainer') };
  const ranks = { title: 'Ranks', sub: ranksUnlocked ? 'See where you stand this week' : 'Unlocks after 3 trainer wins', img: '/icons/leaderboardicon.png', color: BROWN, locked: !ranksUnlocked, go: () => onSwitch('leaderboard') };
  // Live battle leads when someone is around: battling someone you know is
  // one of the most-used things in the arena.
  const rows = day.classmateOnline ? [live, trainers, ranks] : [trainers, live, ranks];
  const motionProps = centred
    ? { initial: { opacity: 0, scale: 0.96 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 0.96 } }
    : { initial: { y: '100%' }, animate: { y: 0 }, exit: { y: '100%' } };
  return (
    <>
      {centred && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-20 bg-[#0a0807]/50" onClick={onClose} />}
      <motion.div
        {...motionProps}
        transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
        className={centred
          ? 'absolute z-20 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[440px] max-h-[85%] bg-white border-2 border-[#4a2f18] rounded-3xl flex flex-col'
          : 'absolute left-0 right-0 bottom-0 top-10 z-20 bg-white border-2 border-b-0 border-[#4a2f18] rounded-t-3xl flex flex-col'}
        style={{ boxShadow: '0 0 0 3px #d4a017' }}
      >
        <Nail className="top-2 left-2" />
        <Nail className="top-2 right-2" />
        <div className="flex items-center gap-2 px-4 pt-4 pb-2">
          <img src={copy.icon} alt="" className="w-9 h-9 object-contain" />
          <QuestText size={18} color="#f5c542">{copy.title}</QuestText>
          <div className="flex-1" />
          <SmallButton onClick={onClose} color={BROWN} size={11}>Back to map</SmallButton>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-3">
          {panel === 'battle' ? rows.map(row => (
            <div key={row.title} style={{ fontSize: 17 }}>
              <GameButton
                variant="quest"
                color={row.color}
                disabled={row.locked}
                className="w-full"
                icon={<img src={row.img} alt="" className={`w-full h-full object-contain ${row.locked ? 'grayscale' : ''}`} />}
                sub={row.sub}
                onClick={row.go}
              >
                {row.title}
              </GameButton>
            </div>
          )) : (
            <div className="bg-[#f5f0e8] border border-[#c9a87a] rounded-xl p-3 text-[#3a2610] text-sm">{copy.body}</div>
          )}
        </div>
      </motion.div>
    </>
  );
}

// ─── Journal, Vault, menu ───────────────────────────────────────────────────
function JournalScreen({ done, onSave, onFocus, keyboardOpen }: { done: boolean; onSave: () => void; onFocus: () => void; keyboardOpen: boolean }) {
  return (
    <div className="p-3 flex flex-col gap-3">
      <SectionLabel>Journal</SectionLabel>
      <ParchmentCard className="p-4">
        <p className="text-[#7a4a0f] text-xs font-black uppercase mb-1">Today&apos;s prompt</p>
        <p className="text-[#2a1505] text-base font-bold mb-3">What was the hardest question today, and how did you figure it out?</p>
        <button onClick={onFocus} className={`w-full text-left bg-white border-2 rounded-xl p-3 min-h-[110px] text-sm ${keyboardOpen ? 'border-[#c9781a] text-[#2a1505]' : 'border-[#c9a87a] text-[#6b4820]'}`}>
          {done ? 'Entry saved for today.' : keyboardOpen ? 'The hardest one was the fraction question because|' : 'Tap to write...'}
        </button>
        {!done && <div className="mt-3 flex justify-end"><SmallButton onClick={onSave} size={13}>Save entry</SmallButton></div>}
      </ParchmentCard>
      {!keyboardOpen && <p className="text-[#6b4820] text-[11px] px-1">Tap the text box on a phone or tablet: the keyboard opens and the tab bar steps aside.</p>}
    </div>
  );
}

function VaultScreen({ wide }: { wide: boolean }) {
  const items = [
    { name: 'Attack Scroll', img: '/items/attack_scroll_100.webp', price: 120 },
    { name: 'Blessed Charm', img: '/items/blessed_charm_100.webp', price: 200 },
    { name: 'Antidote', img: '/items/antidote_100.webp', price: 60 },
    { name: 'Fire Scroll', img: '/items/fire_scroll_100.webp', price: 150 },
  ];
  return (
    <div className="p-3 flex flex-col gap-3">
      <SectionLabel>Reward Vault</SectionLabel>
      <div className={`grid gap-2 ${wide ? 'grid-cols-4' : 'grid-cols-2'}`}>
        {items.map(it => (
          <ParchmentCard key={it.name} className="p-2.5 flex flex-col items-center gap-1.5">
            <img src={it.img} alt="" className="w-12 h-12 object-contain" />
            <span className="text-[#2a1505] text-xs font-black">{it.name}</span>
            <GameButton variant="quest" onClick={() => {}} style={{ fontSize: 11 }}>{`Buy ${it.price}g`}</GameButton>
          </ParchmentCard>
        ))}
      </div>
    </div>
  );
}

function MenuSheet({ onClose, onItem }: { onClose: () => void; onItem: (label: string) => void }) {
  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-40 bg-[#0a0807]/50" onClick={onClose} />
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
        className="absolute left-0 right-0 bottom-0 z-40 bg-white border-2 border-b-0 border-[#4a2f18] rounded-t-3xl px-4 pt-5 pb-6"
        style={{ boxShadow: '0 0 0 3px #d4a017' }}
      >
        <Nail className="top-2 left-2" />
        <Nail className="top-2 right-2" />
        <div className="grid grid-cols-4 gap-2">
          {MENU_ITEMS.map(item => (
            <button key={item.label} onClick={() => { playPageFlip(); onItem(item.label); }} className="flex flex-col items-center gap-1 rounded-xl py-2 hover:bg-[#f0ddb8]">
              <img src={item.icon} alt="" className="w-9 h-9 object-contain" />
              <span className="text-[#2a1505] text-[11px] font-black text-center leading-tight">{item.label}</span>
            </button>
          ))}
        </div>
        <p className="text-[#6b4820] text-[11px] mt-3">Music and sound sliders go here too.</p>
      </motion.div>
    </>
  );
}

// ─── Game moments (focus screens) ───────────────────────────────────────────
function QuizMoment({ safeBottom }: { safeBottom: number }) {
  const [picked, setPicked] = useState<number | null>(null);
  const options = ['3/4', '1', '4/8', '2'];
  return (
    <div className="absolute inset-0 bg-white">
      <style>{QUIZ_OPTION_STYLES}</style>
      <div className="p-4 flex flex-col gap-3 max-w-xl mx-auto">
        <p className="text-[#7a4a0f] text-xs font-black uppercase">Question 4 of 10</p>
        <p className="text-[#2a1505] text-lg font-bold">What is 1/2 + 1/4?</p>
        {options.map((o, i) => (
          <button key={o} className={`qopt ${picked === i ? 'qopt-selected' : ''}`} onClick={() => { playPageFlip(); setPicked(i); }}>
            <span className="qopt-badge">{String.fromCharCode(65 + i)}</span>
            <span className="qopt-text">{o}</span>
          </button>
        ))}
      </div>
      {/* The real QuestModule pins this bar to the bottom edge. */}
      <div className="absolute bottom-0 inset-x-0 bg-[#f0ddb8]/95 border-t-2 border-[#8b5e2a] px-3 pt-2 flex items-center gap-2" style={{ paddingBottom: 8 + safeBottom }}>
        <span className="w-28 h-2.5 rounded-full bg-white border border-[#c9a87a] overflow-hidden"><span className="block h-full bg-[#c9781a]" style={{ width: '30%' }} /></span>
        <span className="text-xs font-mono text-[#6b4820]">3/10 answered</span>
      </div>
    </div>
  );
}

function GuildMoment() {
  return (
    <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/guilds/lex-bg.png')" }}>
      <div className="absolute inset-0 bg-[#0a0807]/35" />
      <div className="relative p-4 flex flex-col items-center gap-3 max-w-md mx-auto pt-10">
        <img src="/sidequests/lexiconarena.webp" alt="" className="h-28 object-contain" />
        <ParchmentCard className="p-4 w-full">
          <p className="text-[#7a4a0f] text-xs font-black uppercase mb-1">Word 6 of 12</p>
          <p className="text-[#2a1505] text-lg font-bold">Spell the word that means &quot;very big&quot;.</p>
          <div className="mt-3 bg-white border border-[#c9a87a] rounded-xl px-3 py-2 text-[#6b4820]">e n o r m _ _ _</div>
        </ParchmentCard>
      </div>
    </div>
  );
}

function ResultsMoment({ day, onNext, onVault, onToday }: { day: DayState; onNext: () => void; onVault: () => void; onToday: () => void }) {
  const left = [day.journalDone, day.questDone, day.mapDone, day.guildsPlayed >= GUILDS.length].filter(x => !x).length;
  const nextGuild = GUILDS[day.guildsPlayed]?.name;
  return (
    <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/guilds/lex-bg.png')" }}>
      <div className="absolute inset-0 bg-[#0a0807]/45" />
      <div className="relative p-4 flex flex-col items-center gap-3 max-w-sm mx-auto pt-8">
        <ParchmentCard className="p-4 w-full flex flex-col items-center gap-2">
          <QuestText size={20} color="#f5c542">Run complete</QuestText>
          <p className="text-[#2a1505] text-sm font-bold">12 correct, 2 wrong</p>
          <div className="flex gap-3 text-sm font-black text-[#7a4a0f]">
            <span className="inline-flex items-center gap-1"><img src="/icons/rewards/gold_coin.svg" alt="" className="w-4 h-4" />+96</span>
            <span>+180 XP</span>
          </div>
          <p className="text-[#6b4820] text-xs">Guilds today: {day.guildsPlayed}/{GUILDS.length}. To-Do: {left} left.</p>
          <div className="w-full flex flex-col gap-2 mt-1" style={{ fontSize: 15 }}>
            {nextGuild && <GameButton variant="quest" color={BLUE} className="w-full" onClick={onNext}>{`Next: ${nextGuild}`}</GameButton>}
            <GameButton variant="quest" color={BROWN} className="w-full" onClick={onVault}>Spend gold in the Vault</GameButton>
            <GameButton variant="quest" className="w-full" onClick={onToday}>{`Back to Today (${left} left)`}</GameButton>
          </div>
        </ParchmentCard>
      </div>
    </div>
  );
}

function BattleMoment({ live }: { live: boolean }) {
  return (
    <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/battleui/battle_bg_normal.webp')" }}>
      <img src="/monsters/bubbloon.webp" alt="" className="absolute object-contain" style={{ right: '14%', top: '16%', height: '24%', transform: 'scaleX(-1)' }} />
      <img src="/monsters/solarch.webp" alt="" className="absolute object-contain" style={{ left: '12%', bottom: '34%', height: '28%' }} />
      <div className="absolute left-2 top-2 rounded-lg bg-[#0a0807]/75 text-[#ffffff] text-[11px] font-black px-2 py-1">{live ? 'Classmate' : 'Ember Acolyte'}: Bubbloon Lv.10</div>
      <div className="absolute inset-x-0 bottom-0 bg-[#f5f0e8] border-t-2 border-[#8b5e2a] p-3 grid grid-cols-2 gap-2" style={{ fontSize: 14 }}>
        {['Flash', 'Sacred Beam', 'Guard', 'Items'].map(m => (
          <GameButton key={m} variant="quest" color={m === 'Items' ? BROWN : undefined} className="w-full" onClick={() => playPageFlip()}>{m}</GameButton>
        ))}
      </div>
    </div>
  );
}

function MapMoment({ onTask }: { onTask: () => void }) {
  return (
    <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/maps/fire_new.webp')" }}>
      <img src="/monsters/solarch.webp" alt="" className="absolute object-contain" style={{ left: '46%', top: '44%', height: 54 }} />
      {/* Joystick: owns the bottom-left corner, which is why the tab bar hides. */}
      <div className="absolute left-4 bottom-4 w-24 h-24 rounded-full border-4 border-[#ffffff]/60 bg-[#0a0807]/30 flex items-center justify-center">
        <div className="w-10 h-10 rounded-full bg-[#ffffff]/70" />
      </div>
      <div className="absolute right-4 bottom-6" style={{ fontSize: 14 }}>
        <GameButton variant="quest" color={BLUE} onClick={onTask}>Answer a question</GameButton>
      </div>
    </div>
  );
}

function WildMoment({ onCatch }: { onCatch: () => void }) {
  return (
    <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/maps/fire_new.webp')" }}>
      <div className="absolute inset-0 bg-[#0a0807]/60 flex items-center justify-center p-4">
        <div className="relative w-full max-w-xs border-2 border-[#4a2f18] rounded-2xl p-4 flex flex-col items-center gap-2" style={{ ...woodTextureStyle, boxShadow: '0 0 0 3px #d4a017' }}>
          <Nail className="top-2 left-2" /><Nail className="top-2 right-2" />
          <QuestText size={16}>A wild curio appears</QuestText>
          <img src="/monsters/brambleon.webp" alt="" className="h-24 object-contain" />
          <div className="bg-white rounded-xl border border-[#c9a87a] p-2 w-full text-center text-[#2a1505] text-sm font-bold">7 x 8 = ?</div>
          <div className="w-full" style={{ fontSize: 14 }}>
            <GameButton variant="quest" color={BLUE} className="w-full" onClick={onCatch}>Answer to catch</GameButton>
          </div>
        </div>
      </div>
    </div>
  );
}

// Invite during an activity: a slim, non-blocking chip instead of the
// 15-second Accept/Decline toast (35 of 71 invites in the family accounts'
// history were declined, likely because they land mid-activity).
function InviteChip({ onLater, onDismiss }: { onLater: () => void; onDismiss: () => void }) {
  return (
    <motion.div initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }} className="absolute z-40 left-2 right-2 flex items-center gap-2 rounded-xl px-2 py-1.5" style={{ top: HUD_H + 6, backgroundImage: DARK_BAR, boxShadow: '0 0 0 2px #d4a017' }}>
      <img src="/icons/trainericon.png" alt="" className="w-6 h-6 object-contain" />
      <span className="flex-1 text-[#ffffff] text-xs font-bold">A classmate wants to battle</span>
      <SmallButton onClick={onLater} size={10}>After this</SmallButton>
      <SmallButton onClick={onDismiss} color={GRAY} size={10}>Not now</SmallButton>
    </motion.div>
  );
}

function InviteToast({ onAccept, onDecline }: { onAccept: () => void; onDecline: () => void }) {
  return (
    <motion.div initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }} className="absolute z-40 left-1/2 -translate-x-1/2 w-[92%] max-w-sm border-2 border-[#4a2f18] rounded-2xl p-3" style={{ top: HUD_H + 8, ...woodTextureStyle, boxShadow: '0 0 0 3px #d4a017' }}>
      <Nail className="top-2 left-2" /><Nail className="top-2 right-2" />
      <p className="text-center text-[#ffffff] text-sm font-black" style={{ textShadow: '0 1px 2px rgba(0,0,0,.9)' }}>A classmate challenges you</p>
      <p className="text-center text-[#e8d0a0] text-[11px] mb-2">&quot;Not now&quot; gives you 5 minutes with no more invites from them.</p>
      <div className="flex gap-2" style={{ fontSize: 13 }}>
        <GameButton variant="quest" color={GRAY} className="flex-1" onClick={onDecline}>Not now</GameButton>
        <GameButton variant="quest" color={BLUE} className="flex-1" onClick={onAccept}>Battle</GameButton>
      </div>
    </motion.div>
  );
}

// Mock on-screen keyboard. While it's open the tab bar hides (real build:
// watch window.visualViewport height), the text box stays in view, and a
// Done button sits on the accessory row.
function KeyboardMock({ height, onDone }: { height: number; onDone: () => void }) {
  const rows = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
  return (
    <motion.div initial={{ y: height }} animate={{ y: 0 }} exit={{ y: height }} transition={{ duration: 0.22 }} className="absolute inset-x-0 bottom-0 z-40 bg-[#d1d5db] flex flex-col" style={{ height }}>
      <div className="flex items-center justify-between px-2 py-1 bg-[#e5e7eb] border-b border-[#9ca3af]">
        <span className="text-[#4b5563] text-[11px] font-bold">Writing in your Journal</span>
        <SmallButton onClick={onDone} size={11}>Done</SmallButton>
      </div>
      <div className="flex-1 flex flex-col justify-evenly px-1 pb-2">
        {rows.map(r => (
          <div key={r} className="flex justify-center gap-1">
            {r.split('').map(k => <span key={k} className="flex-1 max-w-[34px] h-8 rounded-md bg-white text-[#111827] text-sm flex items-center justify-center shadow-sm">{k}</span>)}
          </div>
        ))}
        <div className="flex justify-center gap-1 px-6"><span className="flex-1 h-8 rounded-md bg-white shadow-sm" /></div>
      </div>
    </motion.div>
  );
}

// ─── Device frame ───────────────────────────────────────────────────────────
function DeviceFrame({ device, children }: { device: DeviceId; children: ReactNode }) {
  const d = DEVICES[device];
  const bezel = device === 'desktop' ? 0 : 8;
  const chrome = device === 'desktop' ? 26 : 0;
  const outerW = (d.width + bezel * 2) * d.scale;
  const outerH = (d.height + bezel * 2 + chrome) * d.scale;
  return (
    <div className="shrink-0" style={{ width: outerW, height: outerH }}>
      <div
        className="relative bg-[#1a0d05] overflow-hidden"
        style={{ width: d.width + bezel * 2, height: d.height + bezel * 2 + chrome, borderRadius: d.radius + bezel, padding: bezel, transform: `scale(${d.scale})`, transformOrigin: 'top left' }}
      >
        {chrome > 0 && (
          <div className="flex items-center gap-1.5 px-3" style={{ height: chrome }}>
            <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#22c55e]" />
            <span className="ml-3 text-[#a89c86] text-[11px] font-bold">learninghallph.com</span>
          </div>
        )}
        <div className="relative overflow-hidden bg-white" style={{ width: d.width, height: d.height, borderRadius: device === 'desktop' ? 0 : d.radius }}>
          {children}
          {d.safeBottom > 0 && <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-28 h-1 rounded-full bg-[#ffffff]/70 z-50 pointer-events-none" />}
        </div>
      </div>
    </div>
  );
}

// ─── Controls ───────────────────────────────────────────────────────────────
function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)} className={`text-left px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors ${on ? 'bg-[#c9781a]/20 border-[#c9781a] text-[#2a1505]' : 'bg-white border-[#c9a87a] text-[#6b4820]'}`}>
      {on ? 'On' : 'Off'}: {label}
    </button>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick} className={`px-2.5 py-1 rounded-lg border text-xs font-bold ${active ? 'bg-[#8b5e2a] border-[#8b5e2a] text-white' : 'bg-white border-[#c9a87a] text-[#6b4820]'}`}>
      {children}
    </button>
  );
}

export default function NavRedesignMockup() {
  const [device, setDevice] = useState<DeviceId>('phone');
  const [tab, setTab] = useState<TabId>('today');
  const [history, setHistory] = useState<TabId[]>([]);
  const [panel, setPanel] = useState<ArenaPanel | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [moment, setMoment] = useState<Moment>('none');
  const [armed, setArmed] = useState(false);
  const [invite, setInvite] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [iconPx, setIconPx] = useState(28);
  const [toast, setToast] = useState<string | null>(null);
  const [guildHighlight, setGuildHighlight] = useState<string | null>(null);
  const [questHighlight, setQuestHighlight] = useState(false);
  const [ranksUnlocked, setRanksUnlocked] = useState(false);
  const [day, setDay] = useState<DayState>({ journalDone: false, questDone: false, mapDone: false, guildsPlayed: 2, eggReady: true, classmateOnline: true });
  const patch = (p: Partial<DayState>) => setDay(d => ({ ...d, ...p }));
  const armTimer = useRef<number | null>(null);

  const d = DEVICES[device];
  const layout = d.layout;
  const wide = d.width >= 700;
  const inMoment = moment !== 'none';
  const checklistPinned = layout === 'sidebar' && !inMoment;

  useEffect(() => () => { if (armTimer.current) window.clearTimeout(armTimer.current); }, []);
  useEffect(() => {
    if (!cooldownUntil) return;
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (t >= cooldownUntil) setCooldownUntil(null);
    }, 1000);
    return () => window.clearInterval(id);
  }, [cooldownUntil]);
  const cooldownLeft = cooldownUntil ? Math.max(0, Math.ceil((cooldownUntil - now) / 1000)) : 0;
  const startCooldown = () => { const t = Date.now(); setNow(t); setCooldownUntil(t + INVITE_COOLDOWN_MS); };

  const showToast = (m: string) => { setToast(m); window.setTimeout(() => setToast(t => (t === m ? null : t)), 2400); };
  const goTab = (t: TabId) => {
    if (t !== tab) setHistory(h => [...h, tab].slice(-10));
    setTab(t); setPanel(null); setMenuOpen(false); setGuildHighlight(null); setQuestHighlight(false); setKeyboardOpen(false);
  };
  const startMoment = (m: Moment) => { setPanel(null); setMenuOpen(false); setArmed(false); setMoment(m); };
  const endMoment = (then?: () => void) => { setArmed(false); setMoment('none'); then?.(); };

  // Two-tap leave: first tap arms (button turns red and the cost shows),
  // second tap within 3s leaves. No window.confirm (the browser pane
  // auto-cancels it, and it's jarring for kids).
  const requestExit = () => {
    if (!inMoment) return;
    const rule = MOMENT_RULES[moment];
    if (rule.exit === 'direct') {
      endMoment(moment === 'map' || moment === 'wild' ? () => goTab('curios') : moment === 'results' ? () => goTab('sidequests') : undefined);
      return;
    }
    if (rule.exit === 'none') return;
    if (armed) {
      endMoment(() => { if (moment === 'live') showToast('You surrendered. It counts as a loss.'); });
      return;
    }
    setArmed(true);
    if (armTimer.current) window.clearTimeout(armTimer.current);
    armTimer.current = window.setTimeout(() => setArmed(false), 3000);
  };

  // Android hardware back, simulated. The real kid app has no back handling
  // today, so in the Play app Back leaves the game from any screen.
  const pressBack = () => {
    if (inMoment) {
      if (moment === 'live') { showToast('Back does nothing in a live battle. Use Surrender.'); return; }
      requestExit();
      return;
    }
    if (keyboardOpen) { setKeyboardOpen(false); return; }
    if (menuOpen) { setMenuOpen(false); return; }
    if (panel) { setPanel(null); return; }
    if (history.length > 0) {
      const prev = history[history.length - 1];
      setHistory(h => h.slice(0, -1));
      setTab(prev);
      return;
    }
    showToast('Press back again to close the game');
  };

  const onChecklistGo = (target: GoTarget) => {
    if (target === 'journal') goTab('journal');
    else if (target === 'quest') startMoment('quiz');
    else if (target === 'map') { goTab('curios'); startMoment('map'); }
    else if (target === 'hatchery') { goTab('curios'); setPanel('hatchery'); }
    else if (target === 'battle') { goTab('curios'); setPanel('battle'); }
    else { goTab('sidequests'); setGuildHighlight(GUILDS[day.guildsPlayed]?.name ?? null); }
  };
  const onMenuItem = (label: string) => { setMenuOpen(false); showToast(`${label} opens here`); };

  const todoLeft = [day.journalDone, day.questDone, day.mapDone, day.guildsPlayed >= GUILDS.length].filter(x => !x).length;
  const badges: Badges = {
    today: todoLeft > 0 ? { count: String(todoLeft) } : undefined,
    curios: day.eggReady || !day.mapDone ? { dot: true } : undefined,
    journal: !day.journalDone ? { dot: true } : undefined,
  };

  const keyboardHeight = device === 'phone' ? 250 : device === 'phoneLandscape' ? 160 : device === 'tablet' ? 300 : 0;
  const keyboardActive = keyboardOpen && keyboardHeight > 0 && tab === 'journal' && !inMoment;
  const content = keyboardActive
    ? { top: HUD_H, bottom: keyboardHeight, left: layout === 'rail' ? RAIL_W : 0, right: 0 }
    : layout === 'sidebar'
    ? { top: HUD_H, bottom: 0, left: SIDEBAR_W, right: checklistPinned ? TODAY_PANEL_W : 0 }
    : layout === 'rail'
      ? { top: HUD_H, bottom: 0, left: RAIL_W, right: 0 }
      : { top: HUD_H, bottom: tabBarHeight(iconPx, d.safeBottom), left: 0, right: 0 };

  const rule = inMoment ? MOMENT_RULES[moment] : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[#6b4820] text-xs font-bold mr-1">Device</span>
          {(Object.keys(DEVICES) as DeviceId[]).map(id => (
            <Chip key={id} active={device === id} onClick={() => { setDevice(id); setPanel(null); setMenuOpen(false); setKeyboardOpen(false); }}>{DEVICES[id].label}</Chip>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[#6b4820] text-xs font-bold mr-1">Icon size</span>
          {[24, 28, 32].map(n => <Chip key={n} active={iconPx === n} onClick={() => setIconPx(n)}>{n}px</Chip>)}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[#6b4820] text-xs font-bold mr-1">Game moment</span>
        {MOMENTS.map(m => <Chip key={m.id} active={moment === m.id} onClick={() => (m.id === 'none' ? endMoment() : startMoment(m.id))}>{m.label}</Chip>)}
        <span className="w-px h-5 bg-[#c9a87a] mx-1" />
        <Chip active={false} onClick={pressBack}>Press Android back</Chip>
        <Chip active={invite} onClick={() => setInvite(v => !v)}>Incoming battle invite</Chip>
        <Chip active={cooldownLeft > 0} onClick={() => (cooldownLeft > 0 ? setCooldownUntil(null) : startCooldown())}>{cooldownLeft > 0 ? `Your invite cooldown ${mmss(cooldownLeft)}` : 'Your invite was declined'}</Chip>
        <Chip active={keyboardOpen} onClick={() => { if (keyboardOpen) setKeyboardOpen(false); else { goTab('journal'); setKeyboardOpen(true); } }}>Phone keyboard open</Chip>
      </div>

      <div className="flex flex-wrap gap-6 items-start">
        <div className="max-w-full overflow-x-auto">
          <DeviceFrame device={device}>
            {inMoment && rule ? (
              <>
                <FocusBar moment={moment as Exclude<Moment, 'none'>} armed={armed} onExit={requestExit} />
                <div className="absolute inset-x-0 bottom-0" style={{ top: HUD_H }}>
                  {moment === 'quiz' && <QuizMoment safeBottom={d.safeBottom} />}
                  {moment === 'guild' && <GuildMoment />}
                  {moment === 'results' && (
                    <ResultsMoment
                      day={day}
                      onNext={() => { patch({ guildsPlayed: Math.min(GUILDS.length, day.guildsPlayed + 1) }); startMoment('guild'); }}
                      onVault={() => endMoment(() => goTab('vault'))}
                      onToday={() => endMoment(() => goTab('today'))}
                    />
                  )}
                  {(moment === 'trainer' || moment === 'live') && <BattleMoment live={moment === 'live'} />}
                  {moment === 'map' && <MapMoment onTask={() => startMoment('wild')} />}
                  {moment === 'wild' && <WildMoment onCatch={() => { patch({ mapDone: true }); endMoment(() => { goTab('curios'); showToast('Caught! Map task done.'); }); }} />}
                </div>
                <AnimatePresence>
                  {armed && rule.cost && (
                    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute z-40 left-2 right-2 rounded-xl bg-[#fee2e2] border-2 border-[#b91c1c] text-[#7f1d1d] text-xs font-bold px-3 py-2" style={{ top: HUD_H + 6 }}>
                      {rule.cost}
                    </motion.div>
                  )}
                </AnimatePresence>
                <AnimatePresence>
                  {invite && !armed && moment !== 'live' && moment !== 'wild' && (
                    <InviteChip onLater={() => { setInvite(false); showToast('Saved: the invite waits until you finish'); }} onDismiss={() => { setInvite(false); showToast('They\'ll see you\'re busy for 5 minutes.'); }} />
                  )}
                </AnimatePresence>
              </>
            ) : (
              <>
                <Hud
                  left={layout === 'sidebar' ? SIDEBAR_W : 0}
                  showMenu={layout !== 'sidebar'}
                  onGold={() => { playPageFlip(); goTab('vault'); }}
                  onName={() => { playPageFlip(); showToast('Profile opens here'); }}
                  onMenu={() => { playPageFlip(); setMenuOpen(true); }}
                />

                <div className={`absolute ${tab === 'curios' ? 'overflow-hidden' : 'overflow-y-auto'}`} style={content}>
                  <AnimatePresence mode="wait">
                    <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.16 }} className={tab === 'curios' ? 'absolute inset-0' : ''}>
                      {tab === 'today' && <TodayScreen day={day} onGo={onChecklistGo} iconPx={iconPx} wide={wide} checklistPinned={checklistPinned} questHighlight={questHighlight} />}
                      {tab === 'sidequests' && <SideQuestsScreen day={day} wide={wide} highlight={guildHighlight} onVault={() => goTab('vault')} onPlay={() => startMoment('guild')} />}
                      {tab === 'curios' && <CuriosScreen day={day} iconPx={iconPx} ranksUnlocked={ranksUnlocked} onOpen={setPanel} onToast={showToast} onRegion={() => startMoment('map')} />}
                      {tab === 'journal' && <JournalScreen done={day.journalDone} keyboardOpen={keyboardActive} onFocus={() => { if (keyboardHeight > 0) setKeyboardOpen(true); }} onSave={() => { patch({ journalDone: true }); setKeyboardOpen(false); }} />}
                      {tab === 'vault' && <VaultScreen wide={wide} />}
                    </motion.div>
                  </AnimatePresence>
                  <AnimatePresence>
                    {tab === 'curios' && panel && (
                      <ArenaSheet key={panel} panel={panel} day={day} ranksUnlocked={ranksUnlocked} cooldownLeft={cooldownLeft} centred={layout === 'sidebar'} onClose={() => setPanel(null)} onSwitch={setPanel} onStart={startMoment} />
                    )}
                  </AnimatePresence>
                </div>

                {checklistPinned && (
                  <aside className="absolute right-0 bottom-0 overflow-y-auto p-3 bg-[#f5f0e8] border-l-2 border-[#c9a87a] flex flex-col gap-3" style={{ top: HUD_H, width: TODAY_PANEL_W }}>
                    <Checklist day={day} onGo={onChecklistGo} compact />
                    <p className="text-[#6b4820] text-[11px] px-1">Pinned on wide screens: kids check the To-Do after almost every activity, so it never leaves the screen. It steps aside during game moments.</p>
                  </aside>
                )}

                {layout === 'sidebar'
                  ? <Sidebar active={tab} onSelect={goTab} badges={badges} iconPx={iconPx} onMenuItem={onMenuItem} />
                  : !keyboardActive && <TabBar active={tab} onSelect={goTab} badges={badges} layout={layout} iconPx={iconPx} roomy={wide && layout === 'bar'} safeBottom={d.safeBottom} />}

                <AnimatePresence>
                  {keyboardActive && <KeyboardMock height={keyboardHeight} onDone={() => setKeyboardOpen(false)} />}
                </AnimatePresence>

                <AnimatePresence>
                  {menuOpen && <MenuSheet onClose={() => setMenuOpen(false)} onItem={onMenuItem} />}
                </AnimatePresence>
                <AnimatePresence>
                  {invite && (
                    <InviteToast
                      onAccept={() => { setInvite(false); goTab('curios'); startMoment('live'); }}
                      onDecline={() => { setInvite(false); showToast('They\'ll see you\'re busy. No more invites from them for 5 minutes.'); }}
                    />
                  )}
                </AnimatePresence>
              </>
            )}

            <AnimatePresence>
              {toast && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute z-50 left-1/2 -translate-x-1/2 max-w-[85%] rounded-xl bg-[#1a0d05]/90 text-[#ffffff] text-xs font-bold px-3 py-2 text-center" style={{ top: HUD_H + 56, boxShadow: '0 0 0 2px #d4a017' }}>
                  {toast}
                </motion.div>
              )}
            </AnimatePresence>
          </DeviceFrame>
        </div>

        <div className="flex flex-col gap-2 w-full max-w-xs">
          {rule && (
            <div className="rounded-xl border-2 border-[#c9781a] bg-[#c9781a]/10 p-3 mb-1">
              <p className="text-[#2a1505] text-sm font-black mb-1">During: {MOMENTS.find(m => m.id === moment)?.label}</p>
              <p className="text-[#3a2610] text-xs">{rule.note}</p>
              {rule.cost && <p className="text-[#7f1d1d] text-xs font-bold mt-1">Leaving: {rule.cost}</p>}
            </div>
          )}
          <p className="text-[#2a1505] text-sm font-black">Today&apos;s state</p>
          <Toggle label="Journal written" on={day.journalDone} onChange={v => patch({ journalDone: v })} />
          <Toggle label="Main Quest finished" on={day.questDone} onChange={v => patch({ questDone: v })} />
          <Toggle label="Map question answered" on={day.mapDone} onChange={v => patch({ mapDone: v })} />
          <div className="flex items-center gap-1.5">
            <span className="text-[#6b4820] text-xs font-bold">Guilds played</span>
            {[0, 2, 4, 5].map(n => <Chip key={n} active={day.guildsPlayed === n} onClick={() => patch({ guildsPlayed: n })}>{n}/5</Chip>)}
          </div>
          <Toggle label="Egg ready to hatch" on={day.eggReady} onChange={v => patch({ eggReady: v })} />
          <Toggle label="Classmate online" on={day.classmateOnline} onChange={v => patch({ classmateOnline: v })} />
          <Toggle label="Ranks unlocked" on={ranksUnlocked} onChange={setRanksUnlocked} />

          <p className="text-[#2a1505] text-sm font-black mt-3">Rules during game moments</p>
          <ul className="text-[#3a2610] text-xs list-disc pl-4 flex flex-col gap-1">
            <li>The nav hides on every device. A slim focus bar shows one exit and your gold.</li>
            <li>Leaving takes two taps, and the second tap shows exactly what you lose.</li>
            <li>Live battle: no exit, no back, only Surrender.</li>
            <li>Android back closes the top thing first (sheet, menu, game moment), then goes to the previous tab.</li>
            <li>Invites during an activity show as a small &quot;After this&quot; chip, not a 15-second toast.</li>
            <li>Results screens offer the next real step: next guild, Vault, or Today.</li>
            <li>&quot;Not now&quot; on an invite starts a 5-minute cooldown for that sender, so repeat invites stop.</li>
            <li>Invites and online status work on every tab, not just inside the Curio Arena.</li>
            <li>While the phone keyboard is open, the tab bar hides and Android back closes the keyboard first.</li>
          </ul>

          <p className="text-[#2a1505] text-sm font-black mt-3">Why it looks like this</p>
          <ul className="text-[#3a2610] text-xs list-disc pl-4 flex flex-col gap-1">
            <li>The To-Do is the real hub, so Today is home and it is pinned on desktop.</li>
            <li>The guild to-do had kids bouncing between To-Do and Side Quests. &quot;Next&quot; now opens the next unplayed guild.</li>
            <li>Side Quests (most played) and Journal (near daily) get tabs. Rarely used pages move to the small menu.</li>
            <li>Side Quests to Vault and back is a gold loop, so Vault keeps a tab and the gold chip opens it.</li>
            <li>The family accounts play mostly on desktop; most other kids use Android. Both are first-class.</li>
          </ul>

          <p className="text-[#2a1505] text-sm font-black mt-3">Art that would help</p>
          <ul className="text-[#3a2610] text-xs list-disc pl-4 flex flex-col gap-1">
            <li>Tab icons redrawn to read at 24-28px on a dark bar: bold silhouette, 2-3 colours, thick outline.</li>
            <li>A &quot;Today&quot; icon and a small menu icon (the To-Do scroll and compass stand in).</li>
            <li>A Battle icon (boxing gloves stand in), a square wood plate for map-edge buttons, and a pixel padlock.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
