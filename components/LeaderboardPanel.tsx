'use client';
// components/LeaderboardPanel.tsx
// Three separate Monster Arena leaderboards, each ranking every known player
// by a different stat: composite Arena Score, monsters collected, and
// highest-level monster owned (see lib/leaderboard.ts). Each shows its #1
// prominently by default; "Show Full Leaderboard" expands that category's
// complete ranked list.
import { useEffect, useState, ReactNode } from 'react';
import { fetchLeaderboard, fetchReactionCounts, sendReaction, LeaderboardEntry, ReactionCounts } from '@/lib/leaderboard';
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

const REACTION_COOLDOWN_MS = 60 * 60 * 1000; // one cheer per target per hour, client-side only

function canReact(fromUserId: string, toUserId: string): boolean {
  if (typeof window === 'undefined') return false;
  const last = Number(localStorage.getItem(`cheer_cd_${fromUserId}_${toUserId}`) || 0);
  return Date.now() - last > REACTION_COOLDOWN_MS;
}

function markReacted(fromUserId: string, toUserId: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`cheer_cd_${fromUserId}_${toUserId}`, String(Date.now()));
}

function CheerButton({ fromUserId, toUserId, count, onSent }: { fromUserId: string; toUserId: string; count: number; onSent: () => void }) {
  const [sending, setSending] = useState(false);
  const [onCooldown, setOnCooldown] = useState(true);

  useEffect(() => {
    setOnCooldown(!canReact(fromUserId, toUserId));
  }, [fromUserId, toUserId]);

  if (fromUserId === toUserId) return null;

  const handleClick = async () => {
    if (sending || onCooldown) return;
    setSending(true);
    const ok = await sendReaction(fromUserId, toUserId);
    setSending(false);
    if (ok) {
      markReacted(fromUserId, toUserId);
      setOnCooldown(true);
      onSent();
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={sending || onCooldown}
      title={onCooldown ? 'Already cheered — come back later' : 'Send a cheer!'}
      className={`flex items-center gap-1 text-xs font-bold rounded-full px-2 py-1 transition-colors flex-shrink-0 ${
        onCooldown ? 'bg-black/20 text-gray-600 cursor-default' : 'bg-black/30 text-amber-300 hover:bg-amber-900/30'
      }`}
    >
      👏 {count}
    </button>
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

function TopCurioChip({ topMonster }: { topMonster: LeaderboardEntry['topMonster'] }) {
  const def = topMonster ? ALL_MONSTERS[topMonster.monster_id] : null;
  const name = topMonster ? (topMonster.nickname || def?.name || topMonster.monster_id) : null;
  return (
    <div className="bg-black/30 rounded-lg px-2 py-2 text-center overflow-hidden">
      {def && (
        <div className="w-8 h-8 mx-auto mb-1">
          <MonsterImage monster={def} className="w-full h-full" emojiClassName="text-xl" />
        </div>
      )}
      {topMonster ? (
        <p className="text-xs font-bold text-white font-mono leading-tight truncate" title={topMonsterLabel(topMonster)}>
          {name} <span className="text-gray-400">Lv.{topMonster.monster_level}</span>
        </p>
      ) : (
        <p className="text-sm font-bold text-white font-mono">—</p>
      )}
      <p className="text-[10px] text-gray-500 uppercase tracking-wide mt-0.5">Top Curio</p>
    </div>
  );
}

interface Highlight {
  emoji: string;
  value: string;
  label: string;
  info?: string;
}

function TopEntryCard({ entry, rank, badge, highlight, currentUserId, reactionCounts, onReactionSent }: { entry: LeaderboardEntry; rank: number; badge: ReactNode; highlight: Highlight; currentUserId: string; reactionCounts: ReactionCounts; onReactionSent: () => void }) {
  return (
    <div className="border-2 border-amber-500 bg-amber-900/10 rounded-2xl p-6">
      <p className="text-center text-xs font-bold text-amber-400 mb-3 flex items-center justify-center gap-1">
        {rank === 1 ? badge : `#${rank}`}
      </p>
      <div className="flex items-center gap-4 mb-4">
        <img
          src={entry.avatar}
          alt={entry.name}
          className="w-16 h-16 rounded-full object-cover border-2 border-amber-500 flex-shrink-0"
          onError={(e) => { (e.target as HTMLImageElement).src = '/userpics/Spr_RS_School_Kid_M.png'; }}
        />
        <div className="flex-1">
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
        <CheerButton
          fromUserId={currentUserId}
          toUserId={entry.userId}
          count={reactionCounts[entry.userId] || 0}
          onSent={onReactionSent}
        />
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4">
        <StatChip label="Level" value={entry.level} />
        <StatChip label="Trainer Wins" value={entry.trainerBattlesWon} />
        <StatChip label="Live Wins" value={entry.liveBattleWins} />
        <StatChip label="Questions" value={entry.questionsAnswered} />
        <StatChip label="Monsters" value={entry.monstersCollected} />
        <TopCurioChip topMonster={entry.topMonster} />
      </div>
      <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Team</p>
      <TeamStrip team={entry.team} />
    </div>
  );
}

function RankRow({ entry, rank, currentUserId, reactionCounts, onReactionSent }: { entry: LeaderboardEntry; rank: number; currentUserId: string; reactionCounts: ReactionCounts; onReactionSent: () => void }) {
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
        <div className="flex items-center gap-1.5">
          {entry.topMonster && ALL_MONSTERS[entry.topMonster.monster_id] && (
            <div className="w-5 h-5 flex-shrink-0">
              <MonsterImage monster={ALL_MONSTERS[entry.topMonster.monster_id]} className="w-full h-full" emojiClassName="text-xs" />
            </div>
          )}
          <div>
            <p className="text-xs text-gray-500">Top Curio</p>
            <p className="text-sm font-mono text-white whitespace-nowrap">{topMonsterLabel(entry.topMonster)}</p>
          </div>
        </div>
        <div>
          <p className="text-xs text-amber-500">Score</p>
          <p className="text-sm font-mono font-bold text-amber-400">{entry.score}</p>
        </div>
      </div>
      <CheerButton
        fromUserId={currentUserId}
        toUserId={entry.userId}
        count={reactionCounts[entry.userId] || 0}
        onSent={onReactionSent}
      />
    </div>
  );
}

interface LeaderboardCategory {
  key: string;
  title: string;
  badge: ReactNode;
  ranked: LeaderboardEntry[];
  highlight: (entry: LeaderboardEntry) => Highlight;
}

function CategorySection({ category, currentUserId, reactionCounts, onReactionSent }: { category: LeaderboardCategory; currentUserId: string; reactionCounts: ReactionCounts; onReactionSent: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [top, ...rest] = category.ranked;
  if (!top) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-white font-display">{category.title}</h3>
      <TopEntryCard
        entry={top}
        rank={1}
        badge={category.badge}
        highlight={category.highlight(top)}
        currentUserId={currentUserId}
        reactionCounts={reactionCounts}
        onReactionSent={onReactionSent}
      />

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
            <RankRow
              key={entry.userId}
              entry={entry}
              rank={i + 2}
              currentUserId={currentUserId}
              reactionCounts={reactionCounts}
              onReactionSent={onReactionSent}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function LeaderboardPanel({ userId }: { userId: string }) {
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
  const [reactionCounts, setReactionCounts] = useState<ReactionCounts>({});

  const loadReactionCounts = () => {
    fetchReactionCounts().then(setReactionCounts);
  };

  useEffect(() => {
    let cancelled = false;
    fetchLeaderboard().then(result => {
      if (!cancelled) setEntries(result);
    });
    loadReactionCounts();
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
        <CategorySection
          key={category.key}
          category={category}
          currentUserId={userId}
          reactionCounts={reactionCounts}
          onReactionSent={loadReactionCounts}
        />
      ))}
    </div>
  );
}
