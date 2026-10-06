'use client';
// components/dev/FeatureMockups.tsx
// One real game screen per ?scene=, fed entirely by mock data, for marketing video captures
// (marketing/tiktok/engine f01). The Supabase client is patched below so every query/RPC made
// by these components resolves to the mock rows here — nothing reads a real player's data.
// Curriculum content (weekly questions) is loaded from /api/content like the real app, since
// it's public lesson material, not player data.
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import GuildsTab from '@/components/dashboard/GuildsTab';
import TodoTab from '@/components/dashboard/TodoTab';
import VaultTab from '@/components/dashboard/VaultTab';
import JournalTab from '@/components/dashboard/JournalTab';
import BoardMapView from '@/components/dashboard/board/BoardMapView';
import ChildProgressPanel from '@/components/ChildProgressPanel';
import type { GuildKey } from '@/lib/dailyChecklist';
import { USERS } from '@/lib/userSession';
import { markTabTutorialSeen } from '@/lib/tutorial';

const MOCK_USER = 'Juan';
const WEEK = '2026-09-27';
const DAY = 'Wednesday';
const AVATAR = '/userpics/userpics_premium/dynokid.png';
const STATS = { level: 12, xp: 740, gold: 1280 };

const TABLES: Record<string, unknown> = {
  player_progress: { level: 12, xp: 740, mastery_count: 38, perfect_quizzes_total: 21 },
  user_subclass_profiles: {
    lorekeeper_lvl: 6, lorekeeper_xp: 120, lorekeeper_tier: 1,
    spellcaster_lvl: 9, spellcaster_xp: 60, spellcaster_tier: 1,
    number_realm_lvl: 5, number_realm_xp: 200, number_realm_tier: 1,
    logic_labyrinth_lvl: 7, logic_labyrinth_xp: 40, logic_labyrinth_tier: 1,
    lexicon_arena_lvl: 8, lexicon_arena_xp: 90, lexicon_arena_tier: 1,
  },
};

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

const JOURNAL = [
  { entry_date: daysAgo(0), done_today: 'Finished my Math quest and beat Nyxfang!', tomorrow_plan: 'Practice fractions in Number Realm', hardest_challenge: 'Dividing fractions', gratitude: 'My curio leveled up' },
  { entry_date: daysAgo(1), done_today: 'Learned about the Galleon Trade', tomorrow_plan: 'Science quest', hardest_challenge: 'Remembering dates', gratitude: 'Tatay helped me study' },
  { entry_date: daysAgo(2), done_today: 'Spellcaster level 9!', tomorrow_plan: 'Read one story', hardest_challenge: 'Long words', gratitude: 'I got a perfect quiz' },
];

const RPCS: Record<string, unknown> = {
  get_child_last_active: [{ last_active: new Date().toISOString() }],
  get_child_streak: Array.from({ length: 12 }, (_, i) => ({ claim_date: daysAgo(i) })),
  get_child_journal: JOURNAL,
  get_child_weak_topics: [
    { subject: 'Math', wrong_count: 4, total_count: 30, wrong_pct: 13 },
    { subject: 'Science', wrong_count: 2, total_count: 24, wrong_pct: 8 },
  ],
};

// A thenable that swallows any builder chain (.select().eq().gte().maybeSingle() ...).
function chain(result: { data: unknown; error: null; count?: number }) {
  const target = function () {} as unknown as object;
  const proxy: unknown = new Proxy(target, {
    get(_t, key) {
      if (key === 'then') return (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => Promise.resolve(result).then(res, rej);
      return () => proxy;
    },
    apply() { return proxy; },
  });
  return proxy;
}

let patched = false;
function patchSupabase() {
  if (patched) return;
  patched = true;
  // Public players are registered into USERS at login (lib/userSession.ts); do the same for the mock one.
  // Skip the first-visit tab tutorials (spotlight + dim overlay) so captures show the plain screen.
  for (const tab of ['board', 'todo', 'guilds', 'vault', 'journal', 'monster', 'codex', 'profile']) markTabTutorialSeen(tab, MOCK_USER);
  USERS[MOCK_USER] = { id: MOCK_USER, name: 'Juan', fullName: 'Juan Dela Cruz', grade: 'Grade 5', avatar: AVATAR, theme: 'theme_default', gender: 'boy', showCrown: false };
  const s = supabase as unknown as Record<string, unknown>;
  s.from = (table: string) => chain({ data: TABLES[table] ?? null, error: null, count: table === 'user_completed_questions' ? 64 : 0 });
  s.rpc = (fn: string) => chain({ data: RPCS[fn] ?? null, error: null });
  s.channel = () => chain({ data: null, error: null });
}

const noop = () => {};
const SCENES = ['board', 'guilds', 'checklist', 'vault', 'journal', 'parent'] as const;

export default function FeatureMockups() {
  patchSupabase();
  const scene = (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('scene')) || 'board';
  const [pkg, setPkg] = useState<Record<string, unknown> | null>(null);
  const [activeGuild, setActiveGuild] = useState<GuildKey | null>(null);

  // Parent view: open the Journal section like a parent would, so the capture shows entries.
  useEffect(() => {
    if (scene !== 'parent') return;
    const t = setInterval(() => {
      const btn = [...document.querySelectorAll('button')].find((b) => b.textContent?.includes('Journal'));
      if (btn) { btn.click(); clearInterval(t); }
    }, 300);
    return () => clearInterval(t);
  }, [scene]);

  useEffect(() => {
    fetch(`/api/content?grade=5&week=${WEEK}`).then((r) => r.json()).then((j) => setPkg(j.content ?? {})).catch(() => setPkg({}));
  }, []);

  const journalLogs = { Monday: JOURNAL[2], Tuesday: JOURNAL[1], [DAY]: JOURNAL[0] };

  let body: React.ReactNode = null;
  if (scene === 'guilds') {
    body = <GuildsTab activeGuild={activeGuild} setActiveGuild={setActiveGuild} guildProfile={TABLES.user_subclass_profiles as never}
      activeUserId={MOCK_USER} weekStartingDate={WEEK} characterStats={STATS} onGuildGoldEarned={noop} />;
  } else if (scene === 'checklist') {
    body = pkg && <TodoTab activeUserId={MOCK_USER} weekStartingDate={WEEK} currentDayName={DAY} mainQuestPackageData={pkg}
      journalLogs={journalLogs} masteredQuizzes={['Monday_Mathematics', 'Monday_English']} applyGoldDelta={noop as never}
      todoCount={{ done: 3, total: 5 }} onTodoCountChange={noop} setActiveTab={noop} setActiveGuild={noop} setActiveQuest={noop} />;
  } else if (scene === 'vault') {
    body = <VaultTab activeUserId={MOCK_USER} showCrown={false} characterStats={STATS} onSpendGold={noop} onThemeChange={noop}
      handleClaimReward={noop} claimingKey={null} myClaims={[]} />;
  } else if (scene === 'journal') {
    body = <JournalTab activeUserId={MOCK_USER} journalLogs={journalLogs} characterStats={STATS} weekStartingDate={WEEK} onSave={noop as never} />;
  } else if (scene === 'parent') {
    body = <ChildProgressPanel childId={MOCK_USER} grade="Grade 5" isPremium coinBalance={500} onCoinsAwarded={noop} />;
  } else {
    body = pkg && <BoardMapView activeUserId={MOCK_USER} loginStreak={12} totalQuests={48} masteredQuizzes={['Monday_Mathematics', 'Monday_English', 'Tuesday_Filipino', 'Tuesday_Science']}
      dailyQuestAttempts={{}} dashReferralKey={null} activeEvent={null} eventClaimed={false} claimedMonsterId={null}
      onViewClaimedInCompendium={noop} eventQuests={[]} eventProgress={[]} onEnterEventQuest={noop}
      bossEventActive={false} bossGradeLevel={5} bossDefeated={new Set()} bossPoolCounts={{}} onChallengeBoss={noop}
      bossTerm={2} bossPersonas={[]} bossSealedCurio={null} bossSealedCurioClaimed={false} bossEndsAt={null}
      onClaimSealedCurio={async () => false} onReplayBossStory={noop}
      currentDayName={DAY} weekStartingDate={WEEK} mainQuestPackageData={pkg} gauntletDayPools={{}} gauntletDaysDone={new Set()}
      onEnterGauntletDay={noop} openTutorialDayName={null} onEnterQuest={noop} />;
  }

  return (
    <>
    {/* Hide the Next.js dev indicator so it doesn't end up in captures. */}
    <style>{'nextjs-portal{display:none!important} html,body{background:#fff!important}'}</style>
    <div data-scene={SCENES.includes(scene as never) ? scene : 'board'} style={{ width: 'min(1280px, 100vw)', minHeight: 1100, margin: '0 auto', padding: typeof window !== 'undefined' && window.innerWidth < 700 ? 12 : 32, boxSizing: 'border-box', background: '#fff' }}>
      {body}
    </div>
    </>
  );
}
