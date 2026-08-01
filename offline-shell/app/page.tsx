'use client';
// offline-shell/app/page.tsx
//
// Thin guild-hosting shell: reuses the real guild components verbatim
// (components/guilds/*.tsx) — same props, same visuals/animations/sounds —
// wired to data that's already offline-aware (lib/guildEngine.ts,
// hooks/useWeeklyData.ts) from the Phase 2 offline branches. This page only
// supplies the profile lookup + guild picker + gold-earned wiring that
// app/page.tsx normally provides.
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { getActiveUserLocal } from '@/lib/localDataSource';
import { useWeeklyData } from '@/hooks/useWeeklyData';
import { fetchSubclassProfile, SubclassProfile } from '@/lib/guildEngine';
import { markGuildSessionToday, GUILDS } from '@/lib/dailyChecklist';
import type { GuildKey } from '@/lib/dailyChecklist';
import Lorekeeper from '@/components/guilds/Lorekeeper';
import SpellCaster from '@/components/guilds/SpellCaster';
import NumberRealm from '@/components/guilds/NumberRealm';
import LogicLabyrinth from '@/components/guilds/LogicLabyrinth';
import LexiconArena from '@/components/guilds/LexiconArena';
import GuardianSprite, { GuardianGuild } from '@/components/guilds/GuardianSprite';

const GUILD_DISPLAY: { key: GuildKey; guild: GuardianGuild; name: string; desc: string; bg: string; border: string; title: string }[] = [
  { key: 'lorekeeper', guild: 'lorekeeper', name: 'Lorekeeper', desc: 'English guild — Time Attack reading & grammar challenges.', bg: 'bg-[#121a16]', border: 'border-emerald-800 hover:border-emerald-500', title: 'text-emerald-300' },
  { key: 'spellcaster', guild: 'spellcaster', name: 'SpellCaster', desc: 'Typing guild — Real-time speed spelling under the clock.', bg: 'bg-[#13111c]', border: 'border-violet-800 hover:border-violet-500', title: 'text-violet-300' },
  { key: 'number_realm', guild: 'numberrealm', name: 'Number Realm', desc: 'Math guild — Fractions, time, and operations at speed.', bg: 'bg-[#0d0c08]', border: 'border-amber-800 hover:border-amber-500', title: 'text-amber-300' },
  { key: 'logic_labyrinth', guild: 'logiclabyrinth', name: 'Logic Labyrinth', desc: 'IQ guild — Pattern matrices and deduction puzzles.', bg: 'bg-[#0b0d12]', border: 'border-cyan-800 hover:border-cyan-500', title: 'text-cyan-300' },
  { key: 'lexicon_arena', guild: 'lexiconarena', name: 'Lexicon Arena', desc: 'Spelling guild — Read the definition, pick the correct spelling before time runs out.', bg: 'bg-neutral-900', border: 'border-indigo-800 hover:border-indigo-500', title: 'text-indigo-300' },
];

const GUILD_LEVEL_FIELD: Record<GuildKey, keyof SubclassProfile> = {
  lorekeeper: 'lorekeeper_lvl',
  spellcaster: 'spellcaster_lvl',
  number_realm: 'number_realm_lvl',
  logic_labyrinth: 'logic_labyrinth_lvl',
  lexicon_arena: 'lexicon_arena_lvl',
};
const GUILD_TIER_FIELD: Record<GuildKey, keyof SubclassProfile> = {
  lorekeeper: 'lorekeeper_tier',
  spellcaster: 'spellcaster_tier',
  number_realm: 'number_realm_tier',
  logic_labyrinth: 'logic_labyrinth_tier',
  lexicon_arena: 'lexicon_arena_tier',
};

export default function OfflinePracticePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [resolvedProfile, setResolvedProfile] = useState(false);
  const [activeGuild, setActiveGuild] = useState<GuildKey | null>(null);
  const [guildProfile, setGuildProfile] = useState<SubclassProfile | null>(null);

  useEffect(() => {
    getActiveUserLocal().then(active => {
      setUserId(active?.userId ?? null);
      setResolvedProfile(true);
    });
  }, []);

  useEffect(() => {
    if (!userId) return;
    fetchSubclassProfile(userId).then(setGuildProfile);
  }, [userId]);

  // Falls through to a sentinel that matches no cached row while userId is
  // still resolving, so this hook (which must run unconditionally) doesn't
  // fetch/insert against a real user id before we know who's playing.
  const { data, loading, updateStatsAndJournal } = useWeeklyData(userId ?? '__pending__');

  const handleGoldEarned = (newStats: { level: number; xp: number; gold: number }) => {
    if (!activeGuild || !data || !userId) return;
    markGuildSessionToday(userId, activeGuild, format(new Date(), 'yyyy-MM-dd'));
    updateStatsAndJournal(
      newStats, data.journal_logs,
      data.purchased_items, data.mastery_count, data.honor_grants,
      data.quiz_attempts || {}, data.mastered_quizzes || [],
      data.honor_grants,
      (data.guild_sessions_count || 0) + 1,
      data.monster_battles_won || 0,
      data.sibling_battles_won || 0,
      data.perfect_quizzes || 0
    );
  };

  if (!resolvedProfile) return <Centered>Loading…</Centered>;
  if (!userId) {
    return <Centered>No cached profile yet — open Learning Hall online at least once before playing offline.</Centered>;
  }
  if (loading) return <Centered>Loading…</Centered>;
  if (!data) {
    return <Centered>No cached data yet — connect online once so this week's content can download.</Centered>;
  }

  if (activeGuild) {
    const commonProps = {
      userId,
      weekStartingDate: data.week_starting_date,
      currentStats: data.character_stats,
      onGoldEarned: handleGoldEarned,
      onExit: () => setActiveGuild(null),
    };
    switch (activeGuild) {
      case 'lorekeeper': return <Lorekeeper {...commonProps} />;
      case 'spellcaster': return <SpellCaster {...commonProps} />;
      case 'number_realm': return <NumberRealm {...commonProps} />;
      case 'logic_labyrinth': return <LogicLabyrinth {...commonProps} />;
      case 'lexicon_arena': return <LexiconArena {...commonProps} />;
    }
  }

  return (
    <div className="battle-panel-in p-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-2 font-display">Practice Offline</h1>
      <p className="text-gray-400 text-sm mb-8">Pick a guild to practice — progress syncs once you're back online.</p>
      <div className="grid grid-cols-1 gap-6">
        {GUILD_DISPLAY.map(g => (
          <motion.button
            key={g.key}
            onClick={() => setActiveGuild(g.key)}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            className={`${g.bg} border-2 ${g.border} rounded-xl p-6 text-left transition-colors flex items-center gap-4`}
          >
            <div className="w-16 h-16 shrink-0">
              <GuardianSprite guild={g.guild} pose="idle" className="w-full h-full" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className={`text-xl font-bold ${g.title} font-display mb-1`}>{g.name}</h3>
                {typeof guildProfile?.[GUILD_LEVEL_FIELD[g.key]] === 'number' && (
                  <span className={`text-xs font-mono font-bold ${g.title} bg-black/40 rounded-full px-2 py-0.5 shrink-0`}>
                    Lvl {guildProfile![GUILD_LEVEL_FIELD[g.key]]}
                    {typeof guildProfile?.[GUILD_TIER_FIELD[g.key]] === 'number' && (
                      <> · {'★'.repeat(guildProfile![GUILD_TIER_FIELD[g.key]] as number)}</>
                    )}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-400">{g.desc}</p>
              <p className="text-xs text-gray-500 italic mt-1">
                {GUILDS.find(guild => guild.key === g.key)?.lore}
              </p>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-center min-h-screen text-center p-6">
      <p>{children}</p>
    </div>
  );
}
