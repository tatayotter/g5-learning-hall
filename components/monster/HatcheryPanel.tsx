'use client';
// Curio Arena's Hatchery tab — lists every egg the player owns and lets
// them resume a stalled one. Hatch reveals themselves are NOT shown here —
// they happen via EggHatchModal, rendered app-wide from app/page.tsx (so
// the ceremony plays even if the player never opens this tab) — so a
// 'hatched' row is just filtered out of this list entirely, it has already
// become a curio in My Team. See docs/curio-egg-mechanism-design.md.
import { useEffect, useState } from 'react';
import { CurioEgg, incubateCurioEgg } from '@/lib/curioEggs';
import { ALL_MONSTERS, EGG_SPRITE_SRC } from '@/lib/monsterConfig';
import { MonsterImage } from '@/components/battle/shared';

interface HatcheryPanelProps {
  userId: string;
  eggs: CurioEgg[];
  onEggsChanged: () => void;
}

const DAYS_TO_HATCH = 5;

// Live countdown to the FULL hatch, not just today's check-in window: the
// time left on today's deadline (last_progress_date + 1 day) plus one more
// full day for every remaining check-in after today's. A warning, not
// itself the trigger — the actual stall/hatch happens server-side in
// sync_egg_progress on the next session, not client-side when this hits 0.
function useTimeToHatch(lastProgressDate: string, streakProgress: number): string {
  const [label, setLabel] = useState('');
  useEffect(() => {
    const nextDeadline = new Date(lastProgressDate + 'T00:00:00Z').getTime() + 24 * 60 * 60 * 1000;
    const checkInsRemaining = DAYS_TO_HATCH - streakProgress; // includes today's
    const tick = () => {
      const msUntilNextDeadline = Math.max(0, nextDeadline - Date.now());
      const msTotal = msUntilNextDeadline + Math.max(0, checkInsRemaining - 1) * 24 * 60 * 60 * 1000;
      const days = Math.floor(msTotal / (24 * 60 * 60 * 1000));
      const hours = Math.floor((msTotal % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
      const mins = Math.floor((msTotal % (60 * 60 * 1000)) / (60 * 1000));
      setLabel(
        days > 0
          ? `${days}d ${hours}h left to hatch`
          : msTotal > 0
            ? `${hours}h ${mins}m left to hatch`
            : 'Check in today to keep it growing'
      );
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [lastProgressDate, streakProgress]);
  return label;
}

// Small preview of what's actually inside — the admin-defined predecessor
// species (egg.egg_species_id), shown right beside the egg sprite so the
// player can see what they're growing.
function HatchlingPreview({ speciesId }: { speciesId: string }) {
  const def = ALL_MONSTERS[speciesId];
  if (!def) return null;
  return (
    <div className="flex flex-col items-center gap-1 flex-shrink-0">
      <div className="w-12 h-12 opacity-90">
        <MonsterImage monster={def} className="w-full h-full" emojiClassName="text-3xl" />
      </div>
      <p className="text-[9px] text-gray-500 text-center leading-tight">{def.name}</p>
    </div>
  );
}

function IncubatingEggCard({ egg }: { egg: CurioEgg }) {
  const timeToHatch = useTimeToHatch(egg.last_progress_date, egg.streak_progress);
  return (
    <div className="p-4 rounded-xl border border-cyan-900 bg-cyan-900/10 flex items-center gap-4">
      <img src={EGG_SPRITE_SRC[egg.element]} alt="" className="w-16 h-16 object-contain flex-shrink-0" />
      <span className="text-gray-600 text-lg flex-shrink-0">→</span>
      <HatchlingPreview speciesId={egg.egg_species_id} />
      <div className="flex-1">
        <p className="font-bold text-white capitalize">{egg.element} Egg</p>
        <div className="w-full bg-neutral-800 rounded-full h-1.5 mt-1.5 max-w-xs">
          <div
            className="h-1.5 rounded-full bg-cyan-400 transition-all"
            style={{ width: `${(egg.streak_progress / DAYS_TO_HATCH) * 100}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-1">{egg.streak_progress} / {DAYS_TO_HATCH} days · {timeToHatch}</p>
      </div>
    </div>
  );
}

function StalledEggCard({ egg, userId, onEggsChanged }: { egg: CurioEgg; userId: string; onEggsChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const handleIncubate = async () => {
    setBusy(true);
    const result = await incubateCurioEgg(userId, egg.id);
    setBusy(false);
    if (!result?.success) {
      alert('Could not resume this egg right now — try again.');
      return;
    }
    onEggsChanged();
  };
  return (
    <div className="p-4 rounded-xl border border-amber-900 bg-amber-900/10 flex items-center gap-4">
      <img src={EGG_SPRITE_SRC[egg.element]} alt="" className="w-16 h-16 object-contain flex-shrink-0 opacity-60 grayscale" />
      <span className="text-gray-600 text-lg flex-shrink-0">→</span>
      <HatchlingPreview speciesId={egg.egg_species_id} />
      <div className="flex-1">
        <p className="font-bold text-white capitalize">{egg.element} Egg</p>
        <p className="text-xs text-amber-400 mt-1">You forgot to check in, egg stopped growing.</p>
      </div>
      <button
        onClick={handleIncubate}
        disabled={busy}
        className="text-xs bg-amber-700 hover:bg-amber-600 disabled:opacity-40 px-4 py-2 rounded-lg text-white font-bold flex-shrink-0"
      >
        {busy ? '...' : 'Incubate'}
      </button>
    </div>
  );
}

export default function HatcheryPanel({ userId, eggs, onEggsChanged }: HatcheryPanelProps) {
  // 'hatched' rows have already become curios in My Team — nothing left to
  // show here for them, see file header comment.
  const activeEggs = eggs.filter(e => e.status !== 'hatched');

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-white font-display">Hatchery</h3>

      {activeEggs.length === 0 ? (
        <div className="p-6 rounded-xl border border-neutral-800 bg-neutral-900 text-center">
          <p className="text-gray-400 text-sm mb-1">No eggs yet.</p>
          <p className="text-gray-600 text-xs">
            Graduate and level up a curio to earn its first egg — check My Team once one's ready.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {activeEggs.map(egg =>
            egg.status === 'stalled'
              ? <StalledEggCard key={egg.id} egg={egg} userId={userId} onEggsChanged={onEggsChanged} />
              : <IncubatingEggCard key={egg.id} egg={egg} />
          )}
        </div>
      )}
    </div>
  );
}
