// components/EventPanel.tsx
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { differenceInSeconds } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import { CustomEvent, EventQuest, UserEventProgressRow } from '@/lib/customEvents';
import { ALL_MONSTERS } from '@/lib/monsterConfig';

interface EventPanelProps {
  event: CustomEvent;
  eventQuests: EventQuest[];
  progress: UserEventProgressRow[];
  claimed: boolean;
  onPlayQuest: (eventQuestId: string) => void;
  onNavigateToBoard: () => void;
}

function formatCountdown(secondsLeft: number): string {
  if (secondsLeft <= 0) return 'Expired';
  const days = Math.floor(secondsLeft / 86400);
  const hours = Math.floor((secondsLeft % 86400) / 3600);
  const minutes = Math.floor((secondsLeft % 3600) / 60);
  const seconds = Math.floor(secondsLeft % 60);
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

export default function EventPanel({ event, eventQuests, progress, claimed, onPlayQuest, onNavigateToBoard }: EventPanelProps) {
  const [secondsLeft, setSecondsLeft] = useState(() =>
    differenceInSeconds(new Date(`${event.end_date}T23:59:59`), new Date())
  );
  const [showFullPoster, setShowFullPoster] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft(differenceInSeconds(new Date(`${event.end_date}T23:59:59`), new Date()));
    }, 1000);
    return () => clearInterval(timer);
  }, [event.end_date]);

  const masteredIds = new Set(progress.filter(p => p.is_mastered).map(p => p.event_quest_id));
  const doneCount = eventQuests.filter(q => masteredIds.has(q.id)).length;
  const totalCount = eventQuests.length;
  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  const reward = ALL_MONSTERS[event.reward_monster_id];

  return (
    <div className="bg-[#1a1208] border border-amber-800 rounded-xl p-5 mb-6 text-white overflow-hidden relative">
      {event.banner_url && (
        <button
          type="button"
          onClick={() => setShowFullPoster(true)}
          className="block w-full rounded-lg mb-3 cursor-zoom-in"
          title="View full poster"
        >
          <img src={event.banner_url} alt={event.title} className="w-full h-auto rounded-lg" />
        </button>
      )}

      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-amber-300">🎪 {event.title}</h3>
        <span className="text-[10px] font-mono text-amber-500 bg-amber-900/30 border border-amber-800 px-2 py-0.5 rounded-full whitespace-nowrap">
          ⏳ {formatCountdown(secondsLeft)}
        </span>
      </div>

      {event.details_markdown && (
        <div className="text-xs text-gray-400 mb-3 leading-relaxed">
          <ReactMarkdown>{event.details_markdown}</ReactMarkdown>
        </div>
      )}

      <div className="space-y-1.5 mb-3">
        {eventQuests.map(q => {
          const done = masteredIds.has(q.id);
          return (
            <button
              key={q.id}
              onClick={() => !done && onPlayQuest(q.id)}
              disabled={done}
              className={`w-full flex items-center gap-2 text-sm text-left px-2 py-1 rounded transition-colors ${
                done ? 'cursor-default' : 'hover:bg-amber-900/20'
              }`}
            >
              <span className={done ? 'text-green-500' : 'text-gray-600'}>{done ? '✅' : '⬜'}</span>
              <span className={done ? 'line-through text-gray-500' : 'text-gray-200'}>{q.subject_name}</span>
            </button>
          );
        })}
      </div>

      <div className="mb-3">
        <div className="flex justify-between text-[11px] text-gray-500 mb-1">
          <span>Progress</span>
          <span>{doneCount}/{totalCount}</span>
        </div>
        <div className="w-full bg-neutral-900 rounded-full h-2 overflow-hidden">
          <div className="bg-amber-500 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {reward && (
        <div className="flex items-center gap-2 bg-black/30 border border-neutral-800 rounded-lg p-2">
          <div className="min-w-0">
            <p className="text-xs font-bold text-yellow-400 truncate">Reward: {reward.name} (Event Exclusive Curio)</p>
            {claimed ? (
              <p className="text-[10px] text-green-500"><img src="/icons/rewards/gift.svg" alt="Gift" className="inline w-4 h-4 align-[-2px]" /> Claimed!</p>
            ) : (
              <p className="text-[10px] text-gray-500">Complete all quests to claim</p>
            )}
          </div>
        </div>
      )}

      <AnimatePresence>
        {showFullPoster && event.banner_url && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => { setShowFullPoster(false); onNavigateToBoard(); }}
            className="fixed inset-0 z-[100] bg-black/85 flex items-center justify-center p-6 cursor-pointer"
          >
            <motion.img
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              src={event.banner_url}
              alt={event.title}
              className="max-w-full max-h-full rounded-xl shadow-2xl"
            />
            <button
              onClick={(e) => { e.stopPropagation(); setShowFullPoster(false); }}
              className="absolute top-4 right-4 text-white/80 hover:text-white text-3xl leading-none"
              aria-label="Close"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
