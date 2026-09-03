'use client';
// components/dev/UiGallery.tsx
//
// A static "kitchen sink" of every player-facing UI surface in the game, fed
// mock props instead of live Supabase/session data — so you can iterate on
// styling by editing the ACTUAL component files and see the change reflected
// here via Fast Refresh, without running through login, a real week's data,
// a real battle, or a real event.
//
// Everything below either (a) imports the real component directly with mock
// props, or (b) is a hand-copied static swatch for a pattern that's inlined
// per-screen rather than a standalone component (labeled "SWATCH").
//
// Full-screen modals/ceremonies are toggled one at a time via `activeOverlay`
// instead of all mounting permanently — real usage is one-at-a-time too, and
// stacking 15 fixed-inset-0 layers would make the page unusable. Click a
// "Preview" button to open one; a floating ✕ (top-right) always closes
// whatever's open, as a safety net for the few components that don't expose
// their own dismiss affordance in isolation (BossPersonaFan, BossMistOverlay).
//
// Not linked anywhere in the real app. Safe to extend — add a new <Section>
// or a new overlay case for whatever screen you're about to restyle next.
import { useState } from 'react';
import QuestCard from '@/components/QuestCard';
import GameButton, { questButtonFontFamily, questButtonLetterSpacing, questTextShadowStyle } from '@/components/GameButton';
import InfoTag from '@/components/InfoTag';
import { ActionTile, PlaceholderTile } from '@/components/battle/BattleStage';
import PostBattleSummary, { PostBattleSideInfo } from '@/components/battle/PostBattleSummary';
import MonsterHpPanel from '@/components/battle/MonsterHpPanel';
import { ALL_MONSTERS, ELEMENT_ICON_SRC, NORMAL_SKILL_ICON_SRC } from '@/lib/monsterConfig';

import SidebarRail from '@/components/SidebarRail';
import MapStage from '@/components/MapStage';
import OfflineUnavailable from '@/components/OfflineUnavailable';
import CodexPanel from '@/components/CodexPanel';
import ReferralKeyDisplay from '@/components/ReferralKeyDisplay';
import WelcomeCard from '@/components/WelcomeCard';
import GuardianSprite from '@/components/guilds/GuardianSprite';
import CompendiumPanel from '@/components/monster/CompendiumPanel';

import Toast from '@/components/Toast';
import AchievementToast from '@/components/AchievementToast';
import CritBonusToast from '@/components/CritBonusToast';
import LiveBattleInviteToast from '@/components/LiveBattleInviteToast';
import GraduationCeremonyModal from '@/components/GraduationCeremonyModal';
import GrowthPillCeremonyModal from '@/components/GrowthPillCeremonyModal';
import EggHatchModal from '@/components/EggHatchModal';
import TutorRollModal from '@/components/TutorRollModal';
import DailyBonusModal from '@/components/DailyBonusModal';
import CurioRevealModal from '@/components/CurioRevealModal';
import WildEncounterModal from '@/components/WildEncounterModal';
import EventAnnouncementPopup from '@/components/EventAnnouncementPopup';
import DuplicateCatchModal from '@/components/DuplicateCatchModal';
import CelebrationOverlay from '@/components/CelebrationOverlay';
import BossVictoryPopup from '@/components/monster/BossVictoryPopup';
import BossCutscene from '@/components/BossCutscene';
import BossMistOverlay from '@/components/BossMistOverlay';
import BossPersonaFan from '@/components/monster/BossPersonaFan';
import { BossFightBattle, BossFightLostScreen, BossFightEmptyScreen } from '@/components/monster/BossFightScreen';
import { GauntletBattle, GauntletEmptyScreen, GauntletFinishedScreen } from '@/components/monster/MasteryGauntletScreen';
import { BOSS_PERSONAS } from '@/lib/bossPersonas';
import type { BossQuestion } from '@/lib/bossFightEngine';
import { ACHIEVEMENTS } from '@/lib/achievements';
import {
  playChime, playClash, playCoins, playBlessing, playLevelUp, playPageFlip,
  playFootstepGrass, playFootstepTown, playWallBump, playNearbyWhoosh, playMonsterAppear,
  playAttackWhoosh, playHitThud, playMiss, playVictory, playDefeat,
  playCurioCaught, playCurioLevelUp, playCurioGraduation, playAchievementUnlock, playCheer,
  playItemUse, playPvpChallenge, playShopPurchase, playTeachingScroll, playGuardianDefeatVoice,
  playTradeAccept, playTradeDecline, playEggCrack, playGrowthPillGulp,
  playSkillInscribe, playSkillForget, playRerollSpin, playPvpAccept, playPvpDecline,
  startMainTheme, stopMainTheme, startBattleTheme, stopBattleTheme,
  startTermBossTheme, stopTermBossTheme, startBossFightTheme, stopBossFightTheme,
} from '@/lib/sounds';

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="w-full max-w-5xl">
      <h2 className="text-[#2a1505] font-bold text-xl mb-1">{title}</h2>
      {note && <p className="text-[#6b4820] text-xs mb-4 max-w-2xl">{note}</p>}
      {!note && <div className="mb-4" />}
      <div className="bg-white border border-[#c9a87a] rounded-2xl p-6 shadow-sm">
        {children}
      </div>
    </section>
  );
}

function Swatch({ label, className }: { label: string; className: string }) {
  return (
    <div className={`rounded-lg p-3 border text-xs font-mono ${className}`}>
      {label}
    </div>
  );
}

function PreviewButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="text-left px-3 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-gray-200 text-xs font-bold transition-colors"
    >
      {label}
    </button>
  );
}

// ─── Palette tokens (docs/STYLE_GUIDE.md) ───────────────────────────────────
const BG_TOKENS = [
  { name: 'Main card fill', className: 'bg-[#f0ddb8] text-[#2a1505] border-[#c9a87a]' },
  { name: 'Nested inset', className: 'bg-[#e8d0a0]/60 text-[#2a1505] border-[#c9a87a]' },
  { name: 'Pure white panel', className: 'bg-white text-[#2a1505] border-[#c9a87a]' },
  { name: 'Soft cream inset', className: 'bg-[#f5f0e8] text-[#2a1505] border-[#c9a87a]' },
  { name: 'Success panel', className: 'bg-[#e8f5e0] text-green-800 border-green-700' },
  { name: 'Pending panel', className: 'bg-[#f0ddb8] text-[#2a1505] border-[#8b5e2a]' },
];
const TEXT_TOKENS = [
  { name: 'Primary text', className: 'text-[#2a1505]' },
  { name: 'Strongest emphasis', className: 'text-[#1a0d05]' },
  { name: 'Body text', className: 'text-[#3a2610]' },
  { name: 'Muted/label', className: 'text-[#6b4820]' },
  { name: 'Accent heading', className: 'text-[#7a4a0f]' },
  { name: 'Gold accent', className: 'text-[#c9781a]' },
];

// ─── Answer-option states — inlined per quiz/battle question screen rather
// than a shared component (QuestModule.tsx, BattleQuestionModal in
// components/battle/shared.tsx). Classes quoted verbatim from
// docs/STYLE_GUIDE.md's semantic-feedback table.
function AnswerSwatch({ state, label }: { state: 'default' | 'selected' | 'correct' | 'wrong'; label: string }) {
  const classes = {
    default: 'bg-white border-[#c9a87a] hover:border-[#c9781a] hover:bg-[#f0ddb8]',
    selected: 'bg-[#c9781a]/20 border-[#c9781a]',
    correct: 'bg-green-100 border-green-600',
    wrong: 'bg-red-100 border-red-500 text-red-700',
  }[state];
  return (
    <div className={`border-2 rounded-lg px-4 py-3 text-sm font-bold text-[#2a1505] ${classes}`}>
      {label}
    </div>
  );
}

type OverlayKey =
  | 'toast' | 'achievementToast' | 'critBonusToast' | 'liveBattleInvite'
  | 'graduation' | 'growthPill' | 'eggHatch' | 'tutorSuccess' | 'tutorFail'
  | 'dailyBonus' | 'curioReveal' | 'wildEncounter' | 'eventAnnouncement'
  | 'duplicateCatch' | 'bossVictory' | 'bossCutscene' | 'bossMist' | 'bossPersonaFan';

export default function UiGallery() {
  const monsterList = Object.values(ALL_MONSTERS);
  const [leftMon, rightMon, thirdMon] = [monsterList[0], monsterList[1] ?? monsterList[0], monsterList[2] ?? monsterList[0]];
  const personas = Object.values(BOSS_PERSONAS).slice(0, 5);

  const [outcome, setOutcome] = useState<'win' | 'loss' | 'draw'>('win');
  const [celebration, setCelebration] = useState<{ type: 'levelup' | 'perfect' | 'curio'; key: number } | null>(null);
  const [activeOverlay, setActiveOverlay] = useState<OverlayKey | null>(null);
  const close = () => setActiveOverlay(null);

  const leftTeam = [leftMon, rightMon, thirdMon].map((def, i) => ({
    def, level: 12 - i, currentHp: i === 1 ? 0 : 40, maxHp: 60, status: null, statusTurns: 0, restUsed: 0,
  }));
  const rightTeam = [rightMon, thirdMon, leftMon].map((def, i) => ({
    def, level: 10 - i, currentHp: i === 0 ? 0 : 35, maxHp: 55, status: null, statusTurns: 0, restUsed: 0,
  }));
  const left: PostBattleSideInfo = {
    avatarSrc: '/avatars/avatar_1.webp',
    avatarFallbackEmoji: '🧑',
    name: 'You',
    subtitle: 'Level 12',
    mon: { def: leftMon, level: 12, currentHp: outcome === 'win' ? 34 : 0, maxHp: 60, status: null, statusTurns: 0, restUsed: 0 },
    team: leftTeam,
    isWinner: outcome === 'win',
  };
  const right: PostBattleSideInfo = {
    avatarSrc: '/trainers/forest_scout.png',
    avatarFallbackEmoji: '🌿',
    name: 'Forest Scout',
    subtitle: 'Wild Trainer',
    mon: { def: rightMon, level: 10, currentHp: outcome === 'loss' ? 40 : 0, maxHp: 55, status: null, statusTurns: 0, restUsed: 0 },
    team: rightTeam,
    isWinner: outcome === 'loss',
  };

  const mockEvent = {
    id: 'demo-event',
    title: 'The Tarsipling Festival',
    banner_url: null,
    details_markdown: 'A rare curio has appeared near the old banyan tree...',
    reward_lore_markdown: null,
    reward_monster_id: leftMon.id,
    start_date: '2026-08-01',
    end_date: '2026-08-31',
    status: 'active' as const,
    content_source: 'authored' as const,
    gauntlet_term: null,
  };

  const mockQuestion = {
    id: 'demo-q1',
    choice_a: '12', choice_b: '14', choice_c: '16', choice_d: '18',
    correct_choice: 'b',
  };

  const mockAchievements = ACHIEVEMENTS.slice(0, 2);

  // BossFightScreen / MasteryGauntletScreen both take a real BossQuestion[]
  // pool — three is plenty to see the layout, and answering doesn't need to
  // work (grading hits Supabase) since this is styling-only.
  const mockBossPool: BossQuestion[] = [
    { id: 'demo-boss-1', week_starting_date: '2026-08-24', grade: 5, subject: 'Mathematics', tier: 1, topic: 'Fractions', question: 'What is 3/4 + 1/4?', options: ['1', '1/2', '4/8', '2'] },
    { id: 'demo-boss-2', week_starting_date: '2026-08-24', grade: 5, subject: 'Mathematics', tier: 1, topic: 'Fractions', question: 'Which fraction is equivalent to 1/2?', options: ['2/4', '1/3', '3/5', '2/3'] },
    { id: 'demo-boss-3', week_starting_date: '2026-08-24', grade: 5, subject: 'Mathematics', tier: 2, topic: 'Decimals', question: 'What is 0.5 as a fraction?', options: ['1/2', '1/5', '5/10th', '2/5'] },
  ];
  const bossPersona = BOSS_PERSONAS['Mathematics'];

  function renderOverlay() {
    switch (activeOverlay) {
      case 'toast':
        return <Toast message="Quest completed! +200 EXP" show onClose={close} />;
      case 'achievementToast':
        return <AchievementToast userId="demo" newlyUnlocked={mockAchievements} onDismissAll={close} />;
      case 'critBonusToast':
        return <CritBonusToast event={{ bonus: 25, nonce: Date.now() }} />;
      case 'liveBattleInvite':
        return <LiveBattleInviteToast fromName="Miguel" onAccept={close} onDecline={close} />;
      case 'graduation':
        return <GraduationCeremonyModal fromDef={leftMon} toDef={rightMon} monsterLevel={20} quality="normal" userId="demo" onGoToCompendium={close} />;
      case 'growthPill':
        return <GrowthPillCeremonyModal def={leftMon} fromLevel={15} toLevel={20} quality="normal" userId="demo" onDismiss={close} />;
      case 'eggHatch':
        return <EggHatchModal speciesId={leftMon.id} element={leftMon.element} quality="outstanding" userId="demo" onClose={close} />;
      case 'tutorSuccess':
        return (
          <TutorRollModal
            outcome={{ success: true, rolled_tier: 'perfect', previous_quality: 'normal', new_quality: 'perfect', gold_spent: 500 }}
            monsterName={leftMon.name}
            def={leftMon}
            monsterLevel={15}
            userId="demo"
            onClose={close}
          />
        );
      case 'tutorFail':
        return (
          <TutorRollModal
            outcome={{ success: false, rolled_tier: 'fail', previous_quality: 'normal', gold_spent: 500 }}
            monsterName={leftMon.name}
            def={leftMon}
            monsterLevel={15}
            userId="demo"
            onClose={close}
          />
        );
      case 'dailyBonus':
        return <DailyBonusModal streak={3} gold={150} userId="demo" onClose={close} />;
      case 'curioReveal':
        return <CurioRevealModal monster={leftMon} userId="demo" onClose={close} />;
      case 'wildEncounter':
        return <WildEncounterModal monster={leftMon} level={5} question={mockQuestion} attemptsLeft={2} onCorrect={close} onWrong={close} />;
      case 'eventAnnouncement':
        return <EventAnnouncementPopup event={mockEvent} onDismiss={close} />;
      case 'duplicateCatch':
        return <DuplicateCatchModal monsterName={leftMon.name} goldValue={80} userId="demo" onKeep={close} onConvert={close} />;
      case 'bossVictory':
        return <BossVictoryPopup personaName={personas[0]?.name ?? 'The Forgetting'} artUrl={personas[0]?.artUrl ?? ''} glowColor={personas[0]?.glowColor ?? '#a855f7'} xp={300} gold={100} onDismiss={close} />;
      case 'bossCutscene':
        return <BossCutscene personas={personas} onDismiss={close} />;
      case 'bossMist':
        return <BossMistOverlay defeated={2} total={5} />;
      case 'bossPersonaFan':
        return <BossPersonaFan personas={personas} defeated={new Set([personas[0]?.subject])} readySubjects={new Set(personas.map(p => p.subject))} onChallenge={close} />;
      default:
        return null;
    }
  }

  return (
    <div className="min-h-screen bg-[#ffffff] flex flex-col items-center gap-10 p-6 sm:p-10 pb-32">
      <header className="w-full max-w-5xl">
        <h1 className="text-[#2a1505] font-extrabold text-2xl">UI Gallery — no live data</h1>
        <p className="text-[#6b4820] text-sm mt-1 max-w-2xl">
          Real components fed mock props, for restyling without a live session. Read{' '}
          <code className="text-[#7a4a0f]">docs/STYLE_GUIDE.md</code> first — this page mirrors the
          real shell's current default (light, as of 2026-08-28) so it looks the way the real app does.
        </p>
      </header>

      <Section title="Palette — backgrounds" note="docs/STYLE_GUIDE.md § Backgrounds">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {BG_TOKENS.map(t => <Swatch key={t.name} label={t.name} className={t.className} />)}
        </div>
      </Section>

      <Section title="Palette — text" note="docs/STYLE_GUIDE.md § Text">
        <div className="bg-[#f0ddb8] rounded-xl p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {TEXT_TOKENS.map(t => <div key={t.name} className={`text-sm font-bold ${t.className}`}>{t.name}</div>)}
        </div>
      </Section>

      <Section title="Buttons" note="docs/STYLE_GUIDE.md § Buttons + components/GameButton.tsx — Start Quiz/Return to Map/Go Back now use the quest-variant shape, colored per their STYLE_GUIDE role (primary CTA blue, secondary brown, ghost neutral) instead of separate flat button styles.">
        <div className="flex flex-wrap gap-4 items-center" style={{ fontSize: 22 }}>
          <GameButton variant="quest" color="#3b82f6" onClick={() => {}}>Start Quiz</GameButton>
          <GameButton variant="quest" color="#8b5e2a" onClick={() => {}}>Return to Map</GameButton>
          <GameButton variant="quest" color="#d4d4d4" onClick={() => {}}>← Go back</GameButton>
          <GameButton className="px-6 py-2.5 rounded-lg font-extrabold uppercase text-sm bg-yellow-400 text-black border-2 border-black shadow-[3px_3px_0_0_#000]">
            GameButton (tap/hover motion)
          </GameButton>
        </div>
      </Section>

      <Section
        title="GameButton — quest variant"
        note="components/GameButton.tsx, variant=&quot;quest&quot; — built directly from the Photoshop layer styles (Stroke, two Inner Shadows, Drop Shadow on both the shape and the text), not eyeballed. Opt-in per call site; the default 'plain' variant (above) is unchanged for every existing GameButton usage."
      >
        <div style={{ fontSize: 40 }}>
          <GameButton variant="quest" onClick={() => {}}>START QUEST</GameButton>
        </div>
      </Section>

      <Section title="Quest cards" note="components/QuestCard.tsx — both variants">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <QuestCard subjectName="Mathematics" completed={false} xp={200} gold={50} onEnter={() => {}} />
          <QuestCard subjectName="Mathematics" completed={true} xp={200} gold={50} onEnter={() => {}} />
          <div>
            <QuestCard subjectName="Demo Subject" subtitle="No SUBJECT_STYLE entry" completed={false} onEnter={() => {}} />
            <p className="text-[10px] text-[#6b4820] mt-2">Unassigned subject — falls back to DEFAULT_STYLE, which now reuses the Weekly Review art instead of a separate dark-panel look (2026-08-29).</p>
          </div>
        </div>
      </Section>

      <Section title="Answer / question states" note="SWATCH — inlined per-screen in QuestModule.tsx & battle/shared.tsx, not a shared component.">
        <div className="bg-white rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
          <AnswerSwatch state="default" label="Unanswered option" />
          <AnswerSwatch state="selected" label="Selected (before grading)" />
          <AnswerSwatch state="correct" label="Correct answer" />
          <AnswerSwatch state="wrong" label="Wrong answer" />
        </div>
      </Section>

      <Section
        title="Battle action tiles + HP card"
        note="components/battle/BattleStage.tsx, components/battle/MonsterHpPanel.tsx — ActionTile's variant=&quot;quest&quot;, approved 2026-08-29 and now wired into the real move/utility grids (BattleScreen.tsx, LiveBattleScreen.tsx). BossFightScreen/MasteryGauntletScreen still use the default 'panel' look below (ActionTile reused there as a plain answer-option list, not a skill grid)."
      >
        <div className="bg-[#f5f0e8] rounded-xl p-4 grid grid-cols-2 sm:grid-cols-3 gap-2 max-w-2xl mb-4" style={{ fontSize: 15 }}>
          {(['fire', 'water', 'leaf', 'storm', 'shadow', 'light'] as const).map(el => (
            <ActionTile key={el} variant="quest" icon={<img src={ELEMENT_ICON_SRC[el]} alt="" className="w-full h-full object-contain" />} title={`${el[0].toUpperCase()}${el.slice(1)} Strike`} sub="Tier 1 · 1 Q" element={el} />
          ))}
          <ActionTile variant="quest" icon={<img src={NORMAL_SKILL_ICON_SRC} alt="" className="w-full h-full object-contain" />} title="Rest" sub="Heal 20% HP" element={null} />
          <ActionTile variant="quest" color="#4f46e5" icon={<img src="/icons/stats/items.svg" alt="" className="w-full h-full object-contain" />} title="Items" sub="Use items from inventory" />
          <ActionTile variant="quest" color="#0d9488" icon={<img src="/icons/stats/switch.svg" alt="" className="w-full h-full object-contain" />} title="Switch" sub="Change your curio" />
          <ActionTile variant="quest" danger icon={<img src="/icons/stats/surrender.svg" alt="" className="w-full h-full object-contain" />} title="Surrender" sub="Forfeit the match" />
          <PlaceholderTile title="Locked" sub="Reach Lv. 5" />
        </div>
        <div className="max-w-[220px]">
          <MonsterHpPanel name={leftMon.name} level={12} currentHp={34} maxHp={60} status="burn" />
        </div>
      </Section>

      <Section
        title="Battle action tiles — previous pastel style (retired)"
        note="components/battle/BattleStage.tsx — ActionTile's default variant=&quot;panel&quot;. Still used by BossFightScreen.tsx and MasteryGauntletScreen.tsx for their multiple-choice answer lists, which is a different job from the skill grid above — kept as-is on purpose."
      >
        <div className="bg-[#f5f0e8] rounded-xl p-4 grid grid-cols-2 sm:grid-cols-3 gap-2 max-w-2xl">
          {(['fire', 'water', 'leaf', 'storm', 'shadow', 'light'] as const).map(el => (
            <ActionTile key={el} icon={<span className="text-xl">⚔️</span>} title={`${el[0].toUpperCase()}${el.slice(1)} Strike`} sub="Tier 1 · 1 Q" element={el} />
          ))}
          <ActionTile icon={<span className="text-xl">🛌</span>} title="Rest" sub="Heal 20% HP" element={null} />
        </div>
      </Section>

      <Section
        title="Boss Fight & Mastery Gauntlet screens"
        note="components/monster/BossFightScreen.tsx, components/monster/MasteryGauntletScreen.tsx — real components, mock 3-question pool. Answering won't grade correctly (grading hits Supabase) but every layout state is live here for restyling. BossVictoryPopup is previewable above via the 'BossVictoryPopup' overlay button."
      >
        <div className="space-y-3">
          <p className="text-xs font-bold text-[#6b4820] uppercase tracking-wide">Boss Fight — in combat</p>
          <div className="max-w-lg">
            <BossFightBattle
              pool={mockBossPool}
              personaName={bossPersona.name}
              artUrl={bossPersona.artUrl}
              glowColor={bossPersona.glowColor}
              otherPersonas={Object.values(BOSS_PERSONAS).slice(1, 4)}
              onWon={() => {}}
              onLost={() => {}}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          <div className="space-y-3">
            <p className="text-xs font-bold text-[#6b4820] uppercase tracking-wide">Boss Fight — lost</p>
            <BossFightLostScreen personaName={bossPersona.name} onRetry={() => {}} onExit={() => {}} />
          </div>
          <div className="space-y-3">
            <p className="text-xs font-bold text-[#6b4820] uppercase tracking-wide">Boss Fight — not enough questions</p>
            <BossFightEmptyScreen onExit={() => {}} />
          </div>
        </div>

        <div className="space-y-3 mt-6">
          <p className="text-xs font-bold text-[#6b4820] uppercase tracking-wide">Mastery Gauntlet — in progress</p>
          <div className="max-w-lg">
            <GauntletBattle pool={mockBossPool} eventTitle="The Tarsipling Festival" userId="demo" grade={5} term={1} onFinished={() => {}} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          <div className="space-y-3">
            <p className="text-xs font-bold text-[#6b4820] uppercase tracking-wide">Gauntlet — no questions this day</p>
            <GauntletEmptyScreen day="Monday" onExit={() => {}} />
          </div>
          <div className="space-y-3">
            <p className="text-xs font-bold text-[#6b4820] uppercase tracking-wide">Gauntlet — day complete</p>
            <GauntletFinishedScreen day="Monday" onExit={() => {}} />
          </div>
        </div>
      </Section>

      <Section title="Info tag" note="components/InfoTag.tsx">
        <p className="text-[#2a1505] text-sm flex items-center gap-2">
          Arena Score combines wins, level, and collection size.
          <InfoTag text="This is the hover tooltip text — same one-line hint pattern used across guild badges." />
        </p>
      </Section>

      <Section title="Post-battle summary" note="components/battle/PostBattleSummary.tsx — real monster art via ALL_MONSTERS">
        <div className="flex gap-3 mb-4">
          {(['win', 'loss', 'draw'] as const).map(o => (
            <button key={o} onClick={() => setOutcome(o)} className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase border-2 ${outcome === o ? 'bg-[#c9781a] text-white border-[#c9781a]' : 'bg-white text-[#6b4820] border-[#c9a87a]'}`}>
              {o}
            </button>
          ))}
        </div>
        <PostBattleSummary
          outcome={outcome}
          reasonLabel={outcome === 'win' ? 'Victory!' : outcome === 'loss' ? 'Defeated...' : 'Draw'}
          left={left}
          right={right}
          log={['You used Flamethrower!', 'Forest Scout used Vine Whip!', 'Critical hit!']}
          expEarned={outcome === 'win' ? 120 : undefined}
          goldEarned={outcome === 'win' ? 40 : undefined}
          onContinue={() => {}}
        />
      </Section>

      <Section
        title="Side Quest guild cards"
        note="SWATCH — inlined in Dashboard.tsx's 'guilds' tab (the guild picker grid), not a standalone component. Uses the real GuardianSprite. Edit Dashboard.tsx's guild array/markup, not this file, to change the real screen."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {([
            { key: 'lorekeeper', guild: 'lorekeeper' as const, name: 'Lorekeeper', desc: 'English guild — Time Attack reading & grammar challenges.', titleColor: '#34d399', badge: 'bg-emerald-50 text-emerald-700', contentBg: 'bg-emerald-50', bg: '/guilds/lorekeeper-bg.png', lvl: 4 },
            { key: 'number_realm', guild: 'numberrealm' as const, name: 'Number Realm', desc: 'Math guild — Fractions, time, and operations at speed.', titleColor: '#fbbf24', badge: 'bg-amber-50 text-amber-700', contentBg: 'bg-amber-50', bg: '/guilds/number-bg.png', lvl: 2 },
          ]).map(g => (
            <div
              key={g.key}
              role="button"
              tabIndex={0}
              className="overflow-hidden bg-white border-2 border-[#251616] hover:border-[#3a2020] rounded-2xl text-center transition-colors flex flex-col items-center shadow-sm cursor-pointer"
            >
              <div className="relative overflow-hidden w-full flex justify-center pt-5 pb-3 px-5">
                <img src={g.bg} alt="" className="absolute inset-0 w-full h-full object-cover pointer-events-none" />
                <div className="relative z-10 w-32 h-32">
                  <GuardianSprite guild={g.guild} pose="idle" className="w-full h-full" />
                </div>
              </div>
              <div className={`w-full flex flex-col items-center gap-1.5 px-5 pb-5 pt-3 ${g.contentBg}`}>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-extrabold" style={{ fontFamily: questButtonFontFamily, letterSpacing: questButtonLetterSpacing }}>
                    <span style={{ position: 'relative', display: 'inline-block' }}>
                      <span aria-hidden style={questTextShadowStyle}>{g.name}</span>
                      <span style={{ position: 'relative', color: g.titleColor, WebkitTextStroke: '0.0952em #000', paintOrder: 'stroke fill' as const, textTransform: 'uppercase' as const }}>{g.name}</span>
                    </span>
                  </h3>
                  <span className={`text-xs font-mono font-bold ${g.badge} rounded-full px-2 py-0.5 shrink-0`}>
                    Lvl {g.lvl}
                  </span>
                </div>
                <p className="text-xs text-gray-600 font-medium">{g.desc}</p>
                <div className="mt-1">
                  <GameButton variant="quest" style={{ fontSize: 15 }}>Enter</GameButton>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Navigation drawer" note="components/SidebarRail.tsx — the game's hamburger menu. Click the compass to open it (bottom-center portrait / left-middle landscape). Includes the inline logout-confirm dialog (Logout → confirm).">
        <div className="relative h-24 bg-neutral-950 rounded-xl border border-neutral-800 flex items-center justify-center text-gray-500 text-xs">
          (HUD stat bar renders pinned to the real page top — scroll up after opening the menu)
        </div>
        <SidebarRail
          activeTab="board"
          onNavigate={() => {}}
          onLogout={() => {}}
          sfxOn musicOn
          onToggleSfx={() => {}}
          onToggleMusic={() => {}}
          playerName="Hero"
          playerGrade="Grade 5"
          playerLevel={12}
          playerXp={340}
          playerGold={1250}
          playerStreak={6}
          weekLabel="Week 10"
          railBadges={{ monster: true }}
        />
      </Section>

      <Section title="Welcome card" note="components/WelcomeCard.tsx — dismissible Dashboard-top banner">
        <WelcomeCard playerName="Hero" loginStreak={6} totalQuests={7} completedQuests={4} />
      </Section>

      <Section title="Referral key display" note="components/ReferralKeyDisplay.tsx — compact variant only (the full variant fetches live referral stats on mount)">
        <ReferralKeyDisplay referralKey="HERO4821" compact />
      </Section>

      <Section title="Guardian sprite" note="components/guilds/GuardianSprite.tsx — one per guild, idle pose">
        <div className="grid grid-cols-5 gap-3 bg-neutral-950 rounded-xl p-4">
          {(['lorekeeper', 'spellcaster', 'numberrealm', 'logiclabyrinth', 'lexiconarena'] as const).map(g => (
            <div key={g} className="text-center">
              <GuardianSprite guild={g} pose="idle" className="w-16 h-16 mx-auto" />
              <p className="text-[10px] text-gray-500 mt-1">{g}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Map stage shell" note="components/MapStage.tsx — generic 16:9 map frame w/ collapsible info drawer, used by WorldMap + TrainingMap">
        <MapStage
          leftTag="Region: Ember Hills"
          rightTag="Lv. 12"
          frame={<div className="w-full h-full bg-gradient-to-br from-orange-900 to-amber-700 flex items-center justify-center text-white/70 text-sm">(map art)</div>}
          controls={<div className="bg-black/60 rounded-full px-3 py-1 text-white text-xs">🕹 joystick</div>}
          drawerLabel="Legend"
          drawer={<p className="text-gray-300 text-xs">Mock drawer content — team roster, online players, region list, etc.</p>}
        />
      </Section>

      <Section title="Offline placeholder" note="components/OfflineUnavailable.tsx — shown for online-only tabs in the Android offline shell">
        <OfflineUnavailable feature="Live Battle" />
      </Section>

      <Section title="Monster compendium" note="components/monster/CompendiumPanel.tsx — species dex, real data via ALL_MONSTERS">
        <CompendiumPanel
          userMonsters={[{ id: '1', user_id: 'demo', monster_id: leftMon.id, nickname: null, monster_exp: 0, monster_level: 12, slot: 0, rest_used: 0, equipped_skills: [null, null, null], graduation_tier: 0, quality: 'normal' }]}
          caughtMonsters={[]}
          seenMonsterIds={[leftMon.id, rightMon.id, thirdMon.id]}
          monsterDisplay={ALL_MONSTERS}
          subclassProfile={{
            lorekeeper_lvl: 3, lorekeeper_xp: 40, lorekeeper_tier: 2,
            spellcaster_lvl: 1, spellcaster_xp: 10, spellcaster_tier: 2,
            number_realm_lvl: 5, number_realm_xp: 90, number_realm_tier: 3,
            logic_labyrinth_lvl: 2, logic_labyrinth_xp: 20, logic_labyrinth_tier: 2,
            lexicon_arena_lvl: 1, lexicon_arena_xp: 5, lexicon_arena_tier: 2,
          }}
        />
      </Section>

      <Section title="Celebration particle overlay" note="components/CelebrationOverlay.tsx — fires once per click, no backdrop, safe to layer">
        <div className="flex gap-3">
          <button onClick={() => setCelebration({ type: 'levelup', key: Date.now() })} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold">🎉 Level Up</button>
          <button onClick={() => setCelebration({ type: 'perfect', key: Date.now() })} className="px-4 py-2 rounded-lg bg-green-600 text-white text-xs font-bold">🎉 Perfect Score</button>
          <button onClick={() => setCelebration({ type: 'curio', key: Date.now() })} className="px-4 py-2 rounded-lg bg-purple-600 text-white text-xs font-bold">🎉 Curio Caught</button>
        </div>
        {celebration && <CelebrationOverlay key={celebration.key} userId="demo" trigger type={celebration.type} onComplete={() => setCelebration(null)} />}
      </Section>

      <Section
        title="Sound effects"
        note="lib/sounds.ts — click to play. Synthesized cues are generated live (no license risk). Recorded clips load from public/sounds/*; curio_caught/curio_level_up/achievement/pvp_challenge were confirmed Pokémon-derived and have been replaced with original AI-generated clips — the remaining ⚠ is still unreviewed, listen critically before reusing its role."
      >
        <div className="space-y-4">
          <div>
            <h3 className="text-xs font-bold text-[#6b4820] mb-2 uppercase tracking-wide">Synthesized (Web Audio, original)</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <PreviewButton label="Chime (correct)" onClick={playChime} />
              <PreviewButton label="Clash (wrong)" onClick={playClash} />
              <PreviewButton label="Coins" onClick={playCoins} />
              <PreviewButton label="Blessing" onClick={playBlessing} />
              <PreviewButton label="Level up" onClick={playLevelUp} />
              <PreviewButton label="Page flip" onClick={playPageFlip} />
              <PreviewButton label="Footstep (grass)" onClick={playFootstepGrass} />
              <PreviewButton label="Footstep (town)" onClick={playFootstepTown} />
              <PreviewButton label="Wall bump" onClick={playWallBump} />
              <PreviewButton label="Nearby whoosh" onClick={playNearbyWhoosh} />
              <PreviewButton label="Monster appear" onClick={playMonsterAppear} />
              <PreviewButton label="Attack whoosh" onClick={playAttackWhoosh} />
              <PreviewButton label="Hit thud" onClick={playHitThud} />
              <PreviewButton label="Miss" onClick={playMiss} />
              <PreviewButton label="Victory" onClick={playVictory} />
              <PreviewButton label="Defeat" onClick={playDefeat} />
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold text-[#6b4820] mb-2 uppercase tracking-wide">Recorded clips (public/sounds/*)</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <PreviewButton label="Curio caught" onClick={playCurioCaught} />
              <PreviewButton label="Curio level up" onClick={playCurioLevelUp} />
              <PreviewButton label="⚠ Curio graduation" onClick={playCurioGraduation} />
              <PreviewButton label="Achievement unlock" onClick={playAchievementUnlock} />
              <PreviewButton label="Cheer" onClick={playCheer} />
              <PreviewButton label="Item use" onClick={playItemUse} />
              <PreviewButton label="PvP challenge" onClick={playPvpChallenge} />
              <PreviewButton label="Shop purchase" onClick={playShopPurchase} />
              <PreviewButton label="Teaching scroll" onClick={playTeachingScroll} />
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold text-[#6b4820] mb-2 uppercase tracking-wide">New original clips (public/sounds/*, filling prior gaps)</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <PreviewButton label="Trade accept" onClick={playTradeAccept} />
              <PreviewButton label="Trade decline" onClick={playTradeDecline} />
              <PreviewButton label="Egg crack" onClick={playEggCrack} />
              <PreviewButton label="Growth pill gulp" onClick={playGrowthPillGulp} />
              <PreviewButton label="Skill inscribe" onClick={playSkillInscribe} />
              <PreviewButton label="Skill forget" onClick={playSkillForget} />
              <PreviewButton label="Reroll spin" onClick={playRerollSpin} />
              <PreviewButton label="PvP accept" onClick={playPvpAccept} />
              <PreviewButton label="PvP decline" onClick={playPvpDecline} />
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold text-[#6b4820] mb-2 uppercase tracking-wide">Guardian defeat voice lines (random variant per click)</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <PreviewButton label="Lexicon Arena" onClick={() => playGuardianDefeatVoice('lexiconarena')} />
              <PreviewButton label="Logic Labyrinth" onClick={() => playGuardianDefeatVoice('logiclabyrinth')} />
              <PreviewButton label="Lorekeeper" onClick={() => playGuardianDefeatVoice('lorekeeper')} />
              <PreviewButton label="Number Realm" onClick={() => playGuardianDefeatVoice('numberrealm')} />
              <PreviewButton label="Spellcaster" onClick={() => playGuardianDefeatVoice('spellcaster')} />
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold text-[#6b4820] mb-2 uppercase tracking-wide">Music loops (⚠ start = play, click again to stop)</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <PreviewButton label="⚠ Main theme: start" onClick={startMainTheme} />
              <PreviewButton label="Main theme: stop" onClick={stopMainTheme} />
              <PreviewButton label="⚠ Battle theme: start" onClick={startBattleTheme} />
              <PreviewButton label="Battle theme: stop" onClick={stopBattleTheme} />
              <PreviewButton label="Term boss theme: start" onClick={startTermBossTheme} />
              <PreviewButton label="Term boss theme: stop" onClick={stopTermBossTheme} />
              <PreviewButton label="Boss fight theme: start" onClick={startBossFightTheme} />
              <PreviewButton label="Boss fight theme: stop" onClick={stopBossFightTheme} />
            </div>
          </div>
        </div>
      </Section>

      <Section
        title="Full-screen overlays / ceremonies / toasts"
        note="One at a time — click to preview, ✕ top-right (or the component's own dismiss) to close."
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <PreviewButton label="Toast" onClick={() => setActiveOverlay('toast')} />
          <PreviewButton label="AchievementToast" onClick={() => setActiveOverlay('achievementToast')} />
          <PreviewButton label="CritBonusToast" onClick={() => setActiveOverlay('critBonusToast')} />
          <PreviewButton label="LiveBattleInviteToast" onClick={() => setActiveOverlay('liveBattleInvite')} />
          <PreviewButton label="GraduationCeremonyModal" onClick={() => setActiveOverlay('graduation')} />
          <PreviewButton label="GrowthPillCeremonyModal" onClick={() => setActiveOverlay('growthPill')} />
          <PreviewButton label="EggHatchModal" onClick={() => setActiveOverlay('eggHatch')} />
          <PreviewButton label="TutorRollModal (success)" onClick={() => setActiveOverlay('tutorSuccess')} />
          <PreviewButton label="TutorRollModal (fail)" onClick={() => setActiveOverlay('tutorFail')} />
          <PreviewButton label="DailyBonusModal" onClick={() => setActiveOverlay('dailyBonus')} />
          <PreviewButton label="CurioRevealModal" onClick={() => setActiveOverlay('curioReveal')} />
          <PreviewButton label="WildEncounterModal" onClick={() => setActiveOverlay('wildEncounter')} />
          <PreviewButton label="EventAnnouncementPopup" onClick={() => setActiveOverlay('eventAnnouncement')} />
          <PreviewButton label="DuplicateCatchModal" onClick={() => setActiveOverlay('duplicateCatch')} />
          <PreviewButton label="BossVictoryPopup" onClick={() => setActiveOverlay('bossVictory')} />
          <PreviewButton label="BossCutscene" onClick={() => setActiveOverlay('bossCutscene')} />
          <PreviewButton label="BossMistOverlay" onClick={() => setActiveOverlay('bossMist')} />
          <PreviewButton label="BossPersonaFan" onClick={() => setActiveOverlay('bossPersonaFan')} />
        </div>
      </Section>

      {activeOverlay && (
        <>
          {renderOverlay()}
          <button
            onClick={close}
            className="fixed top-3 right-3 z-[999] w-9 h-9 rounded-full bg-black/80 border border-white/20 text-white font-bold hover:bg-black"
            aria-label="Close preview"
          >
            ✕
          </button>
        </>
      )}
    </div>
  );
}
