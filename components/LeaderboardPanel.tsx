'use client';
// components/LeaderboardPanel.tsx
// Three separate Monster Arena leaderboards, each ranking every known player
// by a different stat: composite Arena Score, monsters collected, and
// highest-level monster owned (see lib/leaderboard.ts). Each shows its #1
// prominently by default; "Show Full Leaderboard" expands that category's
// complete ranked list.
import { useEffect, useState } from 'react';
import { fetchLeaderboard, LeaderboardEntry } from '@/lib/leaderboard';
import { ALL_MONSTERS } from '@/lib/monsterConfig';
import { MonsterImage } from '@/components/battle/shared';
import { GMBadge } from '@/components/MonsterGuild';
import InfoTag from '@/components/InfoTag';

function TeamStrip({ team }: { team: LeaderboardEntry['team'] }) {
  if (team.length === 0) {
    return <p className="text-xs text-gray-600">No curios yet</p>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {team.map((m, i) => {
        const def = ALL_MONSTERS[m.monster_id];
        if (!def) return null;
        return (
          <div key={i} className="flex items-center gap-1.5 bg-black/30 rounded-lg px-2 py-1">
            <div className="w-6 h-6 flex-shrink-0">
              <MonsterImage monster={def} className="w-full h-full" emojiClassName="text-sm" />
            </div>
            <span className="text-xs text-gray-300">{m.nickname || def.name} Lv.{m.monster_level}</span>
          </div>
        );
      })}
    </div>
  );
}

function StatChip({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-black/30 rounded-lg px-3 py-2 text-center">
      <p className="text-lg font-bold text-white font-mono">{value}</p>
      <p className="text-[10px] text-gray-500 uppercase tracking-wide">{label}</p>
    </div>
  );
}

function topMonsterLabel(topMonster: LeaderboardEntry['topMonster']): string {
  if (!topMonster) return '—';
  const def = ALL_MONSTERS[topMonster.monster_id];
  const name = topMonster.nickname || def?.name || topMonster.monster_id;
  return `${name} Lv.${topMonster.monster_level}`;
}

interface Highlight {
  emoji: string;
  value: string;
  label: string;
  info?: string;
}

function TopEntryCard({ entry, rank, badge, highlight }: { entry: LeaderboardEntry; rank: number; badge: string; highlight: Highlight }) {
  return (
    <div className="border-2 border-amber-500 bg-amber-900/10 rounded-2xl p-6">
      <p className="text-center text-xs font-bold text-amber-400 mb-3">
        {rank === 1 ? badge : `#${rank}`}
      </p>
      <div className="flex items-center gap-4 mb-4">
        <img
          src={entry.avatar}
          alt={entry.name}
          className="w-16 h-16 rounded-full object-cover border-2 border-amber-500 flex-shrink-0"
          onError={(e) => { (e.target as HTMLImageElement).src = '/userpics/Spr_RS_School_Kid_M.png'; }}
        />
        <div>
          <p className="text-white font-bold text-lg flex items-center gap-1.5">
            {entry.name}
            {entry.isFamily && <GMBadge />}
          </p>
          <p className="text-xs text-gray-500">{entry.grade}{!entry.isFamily && ' · Classmate'}</p>
          <p className="text-sm text-amber-400 font-bold font-mono mt-1 flex items-center gap-1">
            {highlight.emoji} {highlight.value}{highlight.label && ` ${highlight.label}`}
            {highlight.info && <InfoTag text={highlight.info} />}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4">
        <StatChip label="Level" value={entry.level} />
        <StatChip label="Trainer Wins" value={entry.trainerBattlesWon} />
        <StatChip label="Live Wins" value={entry.liveBattleWins} />
        <StatChip label="Questions" value={entry.questionsAnswered} />
        <StatChip label="Monsters" value={entry.monstersCollected} />
        <StatChip label="Top Monster" value={topMonsterLabel(entry.topMonster)} />
      </div>
      <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Team</p>
      <TeamStrip team={entry.team} />
    </div>
  );
}

function RankRow({ entry, rank }: { entry: LeaderboardEntry; rank: number }) {
  return (
    <div className="flex items-center gap-3 bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3">
      <p className="w-6 text-center text-sm font-bold text-gray-500 flex-shrink-0">#{rank}</p>
      <img
        src={entry.avatar}
        alt={entry.name}
        className="w-9 h-9 rounded-full object-cover border border-neutral-600 flex-shrink-0"
        onError={(e) => { (e.target as HTMLImageElement).src = '/userpics/Spr_RS_School_Kid_M.png'; }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-bold flex items-center gap-1 truncate">
          {entry.name}
          {entry.isFamily && <GMBadge />}
        </p>
        <div className="mt-1">
          <TeamStrip team={entry.team} />
        </div>
      </div>
      <div className="flex gap-3 text-right flex-shrink-0">
        <div>
          <p className="text-xs text-gray-500">Lv</p>
          <p className="text-sm font-mono text-white">{entry.level}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">🏆 Trainer</p>
          <p className="text-sm font-mono text-white">{entry.trainerBattlesWon}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">⚔️ Live</p>
          <p className="text-sm font-mono text-white">{entry.liveBattleWins}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">❓ Qs</p>
          <p className="text-sm font-mono text-white">{entry.questionsAnswered}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">👾 Mons</p>
          <p className="text-sm font-mono text-white">{entry.monstersCollected}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">🌟 Top</p>
          <p className="text-sm font-mono text-white whitespace-nowrap">{topMonsterLabel(entry.topMonster)}</p>
        </div>
        <div>
          <p className="text-xs text-amber-500">Score</p>
          <p className="text-sm font-mono font-bold text-amber-400">{entry.score}</p>
        </div>
      </div>
    </div>
  );
}

interface LeaderboardCategory {
  key: string;
  title: string;
  badge: string;
  ranked: LeaderboardEntry[];
  highlight: (entry: LeaderboardEntry) => Highlight;
}

function CategorySection({ category }: { category: LeaderboardCategory }) {
  const [expanded, setExpanded] = useState(false);
  const [top, ...rest] = category.ranked;
  if (!top) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-white font-display">{category.title}</h3>
      <TopEntryCard entry={top} rank={1} badge={category.badge} highlight={category.highlight(top)} />

      {rest.length > 0 && (
        <button
          onClick={() => setExpanded(v => !v)}
          className="w-full text-center text-sm text-indigo-400 hover:text-indigo-300 font-bold py-2"
        >
          {expanded ? '▲ Hide Full Leaderboard' : `▼ Show Full Leaderboard (${category.ranked.length} players)`}
        </button>
      )}

      {expanded && (
        <div className="space-y-2">
          {rest.map((entry, i) => (
            <RankRow key={entry.userId} entry={entry} rank={i + 2} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function LeaderboardPanel() {
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchLeaderboard().then(result => {
      if (!cancelled) setEntries(result);
    });
    return () => { cancelled = true; };
  }, []);

  if (!entries) {
    return <p className="text-center py-10 text-gray-500 animate-pulse">Loading leaderboard...</p>;
  }

  if (entries.length === 0) {
    return <p className="text-center py-10 text-gray-500">No arena stats yet.</p>;
  }

  // entries arrives sorted by score (see fetchLeaderboard); the other two
  // categories need their own sort, each falling back to score to break ties.
  const arenaRanked = entries;
  const collectorRanked = [...entries].sort((a, b) => b.monstersCollected - a.monstersCollected || b.score - a.score);
  const tamerRanked = [...entries].sort((a, b) =>
    (b.topMonster?.monster_level ?? -1) - (a.topMonster?.monster_level ?? -1) || b.score - a.score
  );

  const categories: LeaderboardCategory[] = [
    {
      key: 'arena',
      title: '🏆 Arena Leaderboard',
      badge: '🏆 #1 ARENA CHAMPION',
      ranked: arenaRanked,
      highlight: entry => ({
        emoji: '⭐',
        value: String(entry.score),
        label: 'Arena Score',
        info: 'Score = Level×5 + Trainer Wins×10 + Live Battle Wins×25 + Questions Answered×1.',
      }),
    },
    {
      key: 'collector',
      title: '📚 Collector Leaderboard',
      badge: '📚 #1 TOP COLLECTOR',
      ranked: collectorRanked,
      highlight: entry => ({
        emoji: '👾',
        value: String(entry.monstersCollected),
        label: 'Curios Collected',
      }),
    },
    {
      key: 'tamer',
      title: '🐲 Curio Tamer Leaderboard',
      badge: '🐲 #1 TOP CURIO TAMER',
      ranked: tamerRanked,
      highlight: entry => ({
        emoji: '🌟',
        value: topMonsterLabel(entry.topMonster),
        label: '',
      }),
    },
  ];

  return (
    <div className="space-y-10">
      {categories.map(category => (
        <CategorySection key={category.key} category={category} />
      ))}
    </div>
  );
}
