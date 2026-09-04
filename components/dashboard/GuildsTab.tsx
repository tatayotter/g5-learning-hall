// components/dashboard/GuildsTab.tsx
// Extracted from Dashboard.tsx's `activeTab === 'guilds'` block (was ~135
// inline lines) — second slice of splitting that god component apart, same
// approach as VaultTab.tsx. No behavior change from the original.
'use client';

import { motion } from 'framer-motion';
import { UserId } from '@/lib/userSession';
import { CharacterStats } from '@/hooks/useWeeklyData';
import { GuildKey } from '@/lib/dailyChecklist';
import { SubclassProfile } from '@/lib/guildEngine';
import GameButton, { questButtonFontFamily, questButtonLetterSpacing, questTextShadowStyle, questTextStyle } from '@/components/GameButton';
import GuardianSprite from '@/components/guilds/GuardianSprite';
import Lorekeeper from '@/components/guilds/Lorekeeper';
import SpellCaster from '@/components/guilds/SpellCaster';
import NumberRealm from '@/components/guilds/NumberRealm';
import LogicLabyrinth from '@/components/guilds/LogicLabyrinth';
import LexiconArena from '@/components/guilds/LexiconArena';

interface GuildsTabProps {
  activeGuild: GuildKey | null;
  setActiveGuild: (guild: GuildKey | null) => void;
  guildProfile: SubclassProfile | null;
  activeUserId: UserId;
  weekStartingDate: string;
  characterStats: CharacterStats;
  onGuildGoldEarned: (newStats: CharacterStats) => void;
}

export default function GuildsTab({
  activeGuild,
  setActiveGuild,
  guildProfile,
  activeUserId,
  weekStartingDate,
  characterStats,
  onGuildGoldEarned,
}: GuildsTabProps) {
  if (activeGuild === null) {
    return (
      <div className="battle-panel-in" data-tutorial-id="guilds-welcome">
        {/* Same Bungee/stroke/shadow text treatment as the quest
            GameButton's label (2026-08-29), in quest gold instead
            of the button's white. */}
        <h1 className="text-2xl lg:text-3xl mt-4 mb-4" style={{ fontFamily: questButtonFontFamily, letterSpacing: questButtonLetterSpacing }}>
          <span style={{ position: 'relative', display: 'inline-block' }}>
            <span aria-hidden style={questTextShadowStyle}>Side Quest Guilds</span>
            <span style={{ ...questTextStyle, color: '#f5c542' }}>Side Quest Guilds</span>
          </span>
        </h1>
        <p className="text-gray-500 mb-4 text-sm">Five guilds, five skills — pick one below to earn extra XP and Gold.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {([
            { key: 'lorekeeper' as GuildKey, guild: 'lorekeeper' as const, name: 'Lorekeeper', desc: 'English guild — Time Attack reading & grammar challenges.', border: 'border-[#251616] hover:border-[#3a2020]', titleColor: '#34d399', badge: 'bg-emerald-50 text-emerald-700', contentBg: 'bg-emerald-50', bg: '/guilds/lorekeeper-bg.png', lvl: guildProfile?.lorekeeper_lvl, tier: guildProfile?.lorekeeper_tier },
            { key: 'spellcaster' as GuildKey, guild: 'spellcaster' as const, name: 'SpellCaster', desc: 'Typing guild — Real-time speed spelling under the clock.', border: 'border-[#251616] hover:border-[#3a2020]', titleColor: '#a78bfa', badge: 'bg-violet-50 text-violet-700', contentBg: 'bg-violet-50', bg: '/guilds/spell-bg.png', lvl: guildProfile?.spellcaster_lvl, tier: guildProfile?.spellcaster_tier },
            { key: 'number_realm' as GuildKey, guild: 'numberrealm' as const, name: 'Number Realm', desc: 'Math guild — Fractions, time, and operations at speed.', border: 'border-[#251616] hover:border-[#3a2020]', titleColor: '#fbbf24', badge: 'bg-amber-50 text-amber-700', contentBg: 'bg-amber-50', bg: '/guilds/number-bg.png', lvl: guildProfile?.number_realm_lvl, tier: guildProfile?.number_realm_tier },
            { key: 'logic_labyrinth' as GuildKey, guild: 'logiclabyrinth' as const, name: 'Logic Labyrinth', desc: 'IQ guild — Pattern matrices and deduction puzzles.', border: 'border-[#251616] hover:border-[#3a2020]', titleColor: '#22d3ee', badge: 'bg-cyan-50 text-cyan-700', contentBg: 'bg-cyan-50', bg: '/guilds/logic-bg.png', lvl: guildProfile?.logic_labyrinth_lvl, tier: guildProfile?.logic_labyrinth_tier },
            { key: 'lexicon_arena' as GuildKey, guild: 'lexiconarena' as const, name: 'Lexicon Arena', desc: 'Spelling guild — Read the definition, pick the correct spelling before time runs out.', border: 'border-[#251616] hover:border-[#3a2020]', titleColor: '#818cf8', badge: 'bg-indigo-50 text-indigo-700', contentBg: 'bg-indigo-50', bg: '/guilds/lex-bg.png', lvl: guildProfile?.lexicon_arena_lvl, tier: guildProfile?.lexicon_arena_tier },
          ]).map((g, i) => (
            <motion.div
              key={g.key}
              onClick={() => setActiveGuild(g.key)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setActiveGuild(g.key); }}
              role="button"
              tabIndex={0}
              whileHover="hover"
              whileTap={{ scale: 0.98 }}
              variants={{ hover: {} }}
              data-tutorial-id={i === 0 ? 'guilds-first-tile' : undefined}
              className={`overflow-hidden bg-white border-2 ${g.border} rounded-2xl text-center transition-colors flex flex-col items-center shadow-sm cursor-pointer`}
            >
              {/* Sprite zone — bg image only here */}
              <div className="relative overflow-hidden w-full flex justify-center pt-5 pb-3 px-5">
                {g.bg && (
                  <motion.img
                    src={g.bg}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                    initial={{ scale: 1.08 }}
                    variants={{ hover: { scale: 1.0 } }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                  />
                )}
                <div className="relative z-10 w-32 h-32">
                  <GuardianSprite guild={g.guild} pose="idle" className="w-full h-full" />
                </div>
              </div>
              {/* Content zone — always plain white */}
              <div className={`w-full flex flex-col items-center gap-1.5 px-5 pb-5 pt-3 ${g.contentBg}`}>
                <div className="flex items-center gap-2">
                  {/* Same Bungee/stroke/shadow text treatment as the quest
                      GameButton's label, but keeping each guild's own theme
                      hue as the fill instead of the button's white
                      (2026-08-29) — reuses GameButton's exported style
                      constants rather than re-deriving the em ratios. */}
                  <h3 className="text-xl font-extrabold" style={{ fontFamily: questButtonFontFamily, letterSpacing: questButtonLetterSpacing }}>
                    <span style={{ position: 'relative', display: 'inline-block' }}>
                      <span aria-hidden style={questTextShadowStyle}>{g.name}</span>
                      <span style={{ position: 'relative', color: g.titleColor, WebkitTextStroke: '0.0952em #000', paintOrder: 'stroke fill' as const, textTransform: 'uppercase' as const }}>{g.name}</span>
                    </span>
                  </h3>
                  {typeof g.lvl === 'number' && (
                    <span className={`text-xs font-mono font-bold ${g.badge} rounded-full px-2 py-0.5 shrink-0`}>
                      Lvl {g.lvl}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-600 font-medium">{g.desc}</p>
                <div className="mt-1">
                  <GameButton variant="quest" style={{ fontSize: 15 }}>Enter</GameButton>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="relative -mx-4 lg:-mx-8">
      <img
        src={({ lorekeeper: '/guilds/lorekeeper-bg.png', spellcaster: '/guilds/spell-bg.png', number_realm: '/guilds/number-bg.png', logic_labyrinth: '/guilds/logic-bg.png', lexicon_arena: '/guilds/lex-bg.png' } as Record<string, string>)[activeGuild] ?? ''}
        alt=""
        className="fixed inset-0 w-full h-full object-cover pointer-events-none"
        style={{ zIndex: 0, filter: 'blur(6px)', transform: 'scale(1.05)' }}
      />
      <div className="relative px-4 lg:px-8 pt-6 pb-12">
        {activeGuild === 'lorekeeper' ? (
          <Lorekeeper
            userId={activeUserId}
            weekStartingDate={weekStartingDate}
            currentStats={characterStats}
            onGoldEarned={onGuildGoldEarned}
            onExit={() => setActiveGuild(null)}
          />
        ) : activeGuild === 'spellcaster' ? (
          <SpellCaster
            userId={activeUserId}
            weekStartingDate={weekStartingDate}
            currentStats={characterStats}
            onGoldEarned={onGuildGoldEarned}
            onExit={() => setActiveGuild(null)}
          />
        ) : activeGuild === 'number_realm' ? (
          <NumberRealm
            userId={activeUserId}
            weekStartingDate={weekStartingDate}
            currentStats={characterStats}
            onGoldEarned={onGuildGoldEarned}
            onExit={() => setActiveGuild(null)}
          />
        ) : activeGuild === 'logic_labyrinth' ? (
          <LogicLabyrinth
            userId={activeUserId}
            weekStartingDate={weekStartingDate}
            currentStats={characterStats}
            onGoldEarned={onGuildGoldEarned}
            onExit={() => setActiveGuild(null)}
          />
        ) : activeGuild === 'lexicon_arena' ? (
          <LexiconArena
            userId={activeUserId}
            weekStartingDate={weekStartingDate}
            currentStats={characterStats}
            onGoldEarned={onGuildGoldEarned}
            onExit={() => setActiveGuild(null)}
          />
        ) : null}
      </div>
    </div>
  );
}
