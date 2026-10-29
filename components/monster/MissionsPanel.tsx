'use client';
// components/monster/MissionsPanel.tsx
// Curio Training Missions — idle expeditions for benched curios.
// 5-column horizontal grid; picker drops below as a full-width panel.
import { useCallback, useEffect, useState } from 'react';
import { MonsterImage, UserMonster } from '@/components/battle/shared';
import { CaughtMonster } from '@/components/monster/types';
import { MonsterDef, getOwnedMonsterDisplay, getScaledStats } from '@/lib/monsterConfig';
import MiniCurioCard from '@/components/monster/MiniCurioCard';
import { getQualityGlowClass } from '@/lib/curioQuality';
import {
  MISSION_TIERS, MISSION_SLOT_LEVELS, MissionTier, CurioMission,
  getUnlockedMissionSlots, fetchActiveMissions, sendOnMission, claimMission,
} from '@/lib/curioMissions';
import { playChime, playPageFlip } from '@/lib/sounds';
import { bondHeartsNow } from '@/lib/craftingConfig';
import { beatsShown, missionStory } from '@/lib/missionStories';
import MissionStory, { MissionStoryCss } from '@/components/monster/MissionStory';

// How many beats of a mission's story the kid has seen on this device (a "new" dot otherwise).
const seenKey = (id: string) => `lh_mission_seen_${id}`;
function readSeen(id: string): number {
  try { return Number(localStorage.getItem(seenKey(id))) || 0; } catch { return 0; }
}
function writeSeen(id: string, n: number) {
  try { localStorage.setItem(seenKey(id), String(n)); } catch { /* private mode */ }
}

// ─── TIER COLORS ─────────────────────────────────────────────────────────────
// One distinct palette per duration tier: card bg, border, progress bar, claim btn.
const TIER_PALETTE: Record<number, {
  card: string;        // idle card background + border
  cardDone: string;    // card when complete
  bar: string;         // progress bar fill
  claim: string;       // claim button
  picker: string;      // picker button in step-1 grid
  pickerHover: string;
  label: string;       // text color for labels inside the card
}> = {
  1: {
    card:        'border-sky-200 bg-sky-50',
    cardDone:    'border-sky-400 bg-sky-100 shadow-sm',
    bar:         'bg-sky-400',
    claim:       'bg-sky-500 hover:bg-sky-400',
    picker:      'border-sky-200 bg-sky-50',
    pickerHover: 'hover:bg-sky-100',
    label:       'text-sky-700',
  },
  2: {
    card:        'border-emerald-200 bg-emerald-50',
    cardDone:    'border-emerald-400 bg-emerald-100 shadow-sm',
    bar:         'bg-emerald-400',
    claim:       'bg-emerald-500 hover:bg-emerald-400',
    picker:      'border-emerald-200 bg-emerald-50',
    pickerHover: 'hover:bg-emerald-100',
    label:       'text-emerald-700',
  },
  4: {
    card:        'border-violet-200 bg-violet-50',
    cardDone:    'border-violet-400 bg-violet-100 shadow-sm',
    bar:         'bg-violet-400',
    claim:       'bg-violet-500 hover:bg-violet-400',
    picker:      'border-violet-200 bg-violet-50',
    pickerHover: 'hover:bg-violet-100',
    label:       'text-violet-700',
  },
  6: {
    card:        'border-orange-200 bg-orange-50',
    cardDone:    'border-orange-400 bg-orange-100 shadow-sm',
    bar:         'bg-orange-400',
    claim:       'bg-orange-500 hover:bg-orange-400',
    picker:      'border-orange-200 bg-orange-50',
    pickerHover: 'hover:bg-orange-100',
    label:       'text-orange-700',
  },
  8: {
    card:        'border-rose-200 bg-rose-50',
    cardDone:    'border-rose-400 bg-rose-100 shadow-sm',
    bar:         'bg-rose-400',
    claim:       'bg-rose-500 hover:bg-rose-400',
    picker:      'border-rose-200 bg-rose-50',
    pickerHover: 'hover:bg-rose-100',
    label:       'text-rose-700',
  },
};

function tierPalette(durationHours: number) {
  return TIER_PALETTE[durationHours] ?? TIER_PALETTE[1];
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function formatTimeRemaining(endsAt: string): string {
  const ms = new Date(endsAt).getTime() - Date.now();
  if (ms <= 0) return 'Ready!';
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h > 0) return `${h}h ${m}m`;
  const s = Math.floor((ms % 60_000) / 1_000);
  return m > 0 ? `${m}m` : `${s}s`;
}

function missionProgress(mission: CurioMission): number {
  const start = new Date(mission.started_at).getTime();
  const end   = new Date(mission.ends_at).getTime();
  return Math.min(1, (Date.now() - start) / (end - start));
}

function isComplete(mission: CurioMission): boolean {
  return Date.now() >= new Date(mission.ends_at).getTime();
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────

interface MissionsPanelProps {
  playerLevel: number;
  userId: string;
  benchedMonsters: UserMonster[];
  caughtMonsters?: CaughtMonster[];
  monsterDisplay: Record<string, MonsterDef>;
  onMissionLockedIdsChange: (ids: Set<string>) => void;
  onLoadoutChange: () => Promise<void> | void;
}

export default function MissionsPanel({
  playerLevel, userId, benchedMonsters, caughtMonsters = [],
  monsterDisplay, onMissionLockedIdsChange, onLoadoutChange,
}: MissionsPanelProps) {
  const unlockedSlots = getUnlockedMissionSlots(playerLevel);

  const [missions,  setMissions]  = useState<CurioMission[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [busy,      setBusy]      = useState<string | null>(null);

  const [pickerSlot, setPickerSlot] = useState<number | null>(null);
  const [pickerTier, setPickerTier] = useState<MissionTier | null>(null);
  // The mission whose story is open, and how many beats the kid had seen before opening it.
  const [story, setStory] = useState<{ id: string; seen: number } | null>(null);
  const [seenTick, setSeenTick] = useState(0);

  // Tick every 20 s to refresh countdowns
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 20_000);
    return () => clearInterval(id);
  }, []);

  const applyMissions = useCallback((data: Awaited<ReturnType<typeof fetchActiveMissions>>) => {
    setMissions(data);
    setLoading(false);
    onMissionLockedIdsChange(new Set(data.map(m => m.monster_row_id)));
  }, [onMissionLockedIdsChange]);
  const load = async () => applyMissions(await fetchActiveMissions(userId));

  useEffect(() => {
    let cancelled = false;
    fetchActiveMissions(userId).then(data => { if (!cancelled) applyMissions(data); });
    return () => { cancelled = true; };
  }, [userId, applyMissions]);

  const handleSend = async (monsterRowId: string, tier: MissionTier) => {
    setBusy('send');
    const hearts = bondHeartsNow(benchedMonsters.find(m => m.id === monsterRowId));
    const result = await sendOnMission(userId, monsterRowId, tier, hearts);
    setBusy(null);
    if (!result.success) {
      console.error('[MissionsPanel] sendOnMission failed:', result.error);
      alert(`Could not start mission:\n${result.error ?? 'Unknown error'}`);
      return;
    }
    setPickerSlot(null);
    setPickerTier(null);
    await load();
    if (result.snack) await onLoadoutChange();
  };

  const handleClaim = async (mission: CurioMission) => {
    setBusy(mission.id);
    const result = await claimMission(userId, mission);
    setBusy(null);
    if (!result.success) {
      console.error('[MissionsPanel] claimMission failed:', result.error);
      alert(`Could not claim mission:\n${result.error ?? 'Unknown error'}`);
      return;
    }
    playChime();
    await load();
    await onLoadoutChange();
  };

  const lockedIds = new Set(missions.map(m => m.monster_row_id));

  const toggleStory = (id: string, prog: number) => {
    playPageFlip();
    if (story?.id === id) { setStory(null); return; }
    setPickerSlot(null); setPickerTier(null);
    setStory({ id, seen: readSeen(id) });
    writeSeen(id, beatsShown(prog));
    setSeenTick(t => t + 1);
  };

  // Normalise caught monsters to the minimal UserMonster shape needed by the
  // picker (id, monster_id, graduation_tier, quality, monster_level). Wild
  // catches and guild familiars live in user_caught_monsters until promoted;
  // they deserve missions too. claimMission() falls back to that table.
  const normalizedCaught: UserMonster[] = caughtMonsters.map(cm => ({
    id: cm.id,
    user_id: cm.user_id,
    monster_id: cm.monster_id,
    nickname: cm.nickname,
    monster_exp: cm.monster_exp,
    monster_level: cm.monster_level,
    slot: null,
    rest_used: 0,
    equipped_skills: [],
    graduation_tier: 0,
    quality: cm.quality,
  }));

  const owned = [...benchedMonsters, ...normalizedCaught];
  const available = owned.filter(m => !lockedIds.has(m.id));

  if (loading) return null;

  return (
    // ── Outer container box ─────────────────────────────────────────────────
    <div className="rounded-xl border border-stone-200 bg-stone-50 p-3 space-y-3">
      <MissionStoryCss />

      {/* Header — no emoji */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-stone-600 font-bold uppercase tracking-widest">Training Missions</p>
        <p className="text-xs text-stone-400">{missions.length} / {unlockedSlots > 0 ? unlockedSlots : '—'} active</p>
      </div>

      {/* ── 5-column slot grid ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: 5 }, (_, i) => {
          const isUnlocked = i < unlockedSlots;
          const mission    = missions[i] ?? null;
          const isSelected = pickerSlot === i;

          // ── Locked slot ────────────────────────────────────────────────────
          if (!isUnlocked) {
            return (
              <div
                key={`locked-${i}`}
                className="flex flex-col items-center justify-center gap-1 p-2 rounded-xl border border-stone-200 bg-stone-100 opacity-50 min-h-[88px]"
              >
                <span className="text-lg">🔒</span>
                <p className="text-[10px] text-stone-500 text-center leading-tight">Lv.{MISSION_SLOT_LEVELS[i]}</p>
              </div>
            );
          }

          // ── Active / Complete mission ───────────────────────────────────────
          if (mission) {
            const p    = tierPalette(mission.duration_hours);
            const um   = owned.find(m => m.id === mission.monster_row_id);
            const def  = um ? getOwnedMonsterDisplay(monsterDisplay[um.monster_id], um.graduation_tier) : null;
            const done = isComplete(mission);
            const prog = missionProgress(mission);
            const fresh = !done && def && seenTick >= 0 && beatsShown(prog) > readSeen(mission.id);
            const open = story?.id === mission.id;

            return (
              <div
                key={mission.id}
                role={def && !done ? 'button' : undefined}
                tabIndex={def && !done ? 0 : undefined}
                onClick={def && !done ? () => toggleStory(mission.id, prog) : undefined}
                onKeyDown={def && !done ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleStory(mission.id, prog); } } : undefined}
                className={`relative flex flex-col items-center gap-1 p-2 rounded-xl border text-center min-h-[88px] transition-colors ${
                  done ? `${p.cardDone} ms-glow` : p.card
                } ${def && !done ? 'cursor-pointer' : ''} ${open ? 'ring-2 ring-amber-400' : ''}`}
                data-testid={`mission-card-${i}`}
              >
                {fresh && <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-rose-500 border-2 border-white" data-testid={`mission-new-${i}`} aria-label="New story" />}
                {/* Sprite: hops while it's away, waves when it's back */}
                {def && um ? (
                  <div className={`w-9 h-9 flex-shrink-0 ${getQualityGlowClass(um.quality)}`}>
                    <div className={`w-full h-full ${done ? 'ms-wave' : 'ms-hop'}`}>
                      <MonsterImage monster={def} className="w-full h-full" />
                    </div>
                  </div>
                ) : (
                  <div className="w-9 h-9 flex-shrink-0 rounded-full bg-white/60 flex items-center justify-center text-base">🧪</div>
                )}

                {/* Mission name */}
                <p className="text-[10px] font-semibold text-gray-800 leading-tight line-clamp-2 w-full">
                  {mission.mission_name}
                </p>

                {/* Progress + reward OR Claim */}
                {done ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); playPageFlip(); handleClaim(mission); }}
                    disabled={busy === mission.id}
                    className={`mt-auto w-full ${p.claim} disabled:opacity-40 text-white text-[10px] font-bold py-1 rounded-lg transition-colors`}
                  >
                    {busy === mission.id ? '…' : 'Claim!'}
                  </button>
                ) : (
                  <div className="mt-auto w-full space-y-0.5">
                    <div className="w-full bg-white/60 rounded-full h-1">
                      <div
                        className={`h-1 rounded-full ${p.bar} transition-all`}
                        style={{ width: `${prog * 100}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-gray-600 leading-tight">
                      {formatTimeRemaining(mission.ends_at)}
                    </p>
                    <p className={`text-[10px] font-bold leading-tight ${p.label}`}>
                      +{mission.exp_reward} EXP
                    </p>
                  </div>
                )}
              </div>
            );
          }

          // ── Empty unlocked slot ─────────────────────────────────────────────
          return (
            <button
              key={`empty-${i}`}
              onClick={() => {
                playPageFlip();
                setStory(null);
                if (pickerSlot === i) { setPickerSlot(null); setPickerTier(null); }
                else { setPickerSlot(i); setPickerTier(null); }
              }}
              className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl border min-h-[88px] transition-colors ${
                isSelected
                  ? 'border-amber-400 bg-amber-100'
                  : 'border-dashed border-stone-300 bg-white hover:bg-stone-100 hover:border-stone-400'
              }`}
            >
              <span className="text-2xl text-stone-300 leading-none">＋</span>
              <p className="text-[10px] text-stone-400 font-semibold">Send Curio</p>
            </button>
          );
        })}
      </div>

      {/* ── Story of an ongoing mission ─────────────────────────────────────── */}
      {story && pickerSlot === null && (() => {
        const mission = missions.find(m => m.id === story.id);
        const um = mission ? owned.find(m => m.id === mission.monster_row_id) : null;
        const def = um ? getOwnedMonsterDisplay(monsterDisplay[um.monster_id], um.graduation_tier) : null;
        if (!mission || !um || !def) return null;
        const prog = missionProgress(mission);
        const name = um.nickname || def.name;
        return (
          <MissionStory
            def={def}
            curioName={name}
            missionName={mission.mission_name}
            lines={missionStory(mission.mission_name, name, def.element)}
            shown={beatsShown(prog)}
            seen={story.seen}
            progress={prog}
            done={isComplete(mission)}
            timeLeft={formatTimeRemaining(mission.ends_at)}
            onClose={() => { playPageFlip(); setStory(null); }}
          />
        );
      })()}

      {/* ── Picker panel ───────────────────────────────────────────────────── */}
      {pickerSlot !== null && (
        <div className="rounded-xl border border-stone-200 bg-white p-3 space-y-3">
          {!pickerTier ? (
            // Step 1 — pick duration
            <>
              <p className="text-xs font-bold text-stone-600 uppercase tracking-wider">Choose mission length:</p>
              <div className="grid grid-cols-5 gap-1.5">
                {MISSION_TIERS.map(tier => {
                  const p = tierPalette(tier.durationHours);
                  return (
                    <button
                      key={tier.durationHours}
                      onClick={() => { playPageFlip(); setPickerTier(tier); }}
                      className={`flex flex-col items-center gap-0.5 p-2 rounded-lg border ${p.picker} ${p.pickerHover} transition-colors`}
                    >
                      <span className="text-xs font-bold text-gray-800">{tier.label}</span>
                      <span className={`text-[10px] font-semibold ${p.label}`}>+{tier.expReward} EXP</span>
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => { playPageFlip(); setPickerSlot(null); setPickerTier(null); }}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                Cancel
              </button>
            </>
          ) : (
            // Step 2 — pick curio
            <>
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-stone-600 uppercase tracking-wider">
                  {pickerTier.label} · <span className={tierPalette(pickerTier.durationHours).label}>+{pickerTier.expReward} EXP</span> — Choose a Curio:
                </p>
                <button onClick={() => { playPageFlip(); setPickerTier(null); }} className="text-xs text-stone-500 hover:underline">
                  ← Back
                </button>
              </div>

              {available.length === 0 ? (
                <p className="text-xs text-gray-500 italic">
                  All benched Curios are already on missions, or there are none on the bench yet.
                </p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-72 overflow-y-auto p-1">
                  {available.map(um => {
                    const def = getOwnedMonsterDisplay(monsterDisplay[um.monster_id], um.graduation_tier);
                    if (!def) return null;
                    return (
                      <button
                        key={um.id}
                        onClick={() => { playPageFlip(); handleSend(um.id, pickerTier); }}
                        disabled={busy === 'send'}
                        className="relative pt-2 text-left btn-tactile disabled:opacity-40"
                        aria-label={`${def.name} Lv.${um.monster_level}`}
                      >
                        <MiniCurioCard
                          def={def}
                          level={um.monster_level}
                          quality={um.quality}
                          hp={getScaledStats(def, um.monster_level, um.quality).hp}
                          note={busy === 'send' ? 'Sending…' : undefined}
                        />
                      </button>
                    );
                  })}
                </div>
              )}

              <button
                onClick={() => { playPageFlip(); setPickerSlot(null); setPickerTier(null); }}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      )}

      {/* Next locked slot hint */}
      {unlockedSlots < 5 && (
        <p className="text-[10px] text-stone-400 text-center">
          🔒 Slot {unlockedSlots + 1} unlocks at Level {MISSION_SLOT_LEVELS[unlockedSlots]}
        </p>
      )}
    </div>
  );
}
