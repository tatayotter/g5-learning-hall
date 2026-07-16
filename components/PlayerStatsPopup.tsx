'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { USERS } from '@/lib/userSession';
import { ALL_MONSTERS } from '@/lib/monsterConfig';
import { MonsterImage } from '@/components/MonsterGuild';

interface TeamMonster {
  slot: number;
  monster_id: string;
  nickname: string | null;
  monster_level: number;
}

interface PlayerStatsPopupProps {
  targetId: string;
  onClose: () => void;
  onWave: (targetId: string) => void;
}

export default function PlayerStatsPopup({ targetId, onClose, onWave }: PlayerStatsPopupProps) {
  const [loading, setLoading] = useState(true);
  const [level, setLevel] = useState<number | null>(null);
  const [team, setTeam] = useState<TeamMonster[]>([]);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);

  const profile = USERS[targetId];

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const [stateRes, monstersRes, weeklyRes] = await Promise.all([
        supabase.from('user_battle_state').select('active_monster_slot').eq('user_id', targetId).single(),
        supabase.from('user_monsters').select('slot, monster_id, nickname, monster_level').eq('user_id', targetId).order('slot'),
        supabase.from('weekly_packages').select('character_stats')
          .eq('user_id', targetId).order('week_starting_date', { ascending: false }).limit(1).maybeSingle(),
      ]);
      if (cancelled) return;
      setActiveSlot(stateRes.data?.active_monster_slot ?? null);
      setTeam(monstersRes.data || []);
      setLevel(weeklyRes.data?.character_stats?.level ?? null);
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [targetId]);

  const activeMonster = team.find(m => m.slot === activeSlot);

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-neutral-900 border border-neutral-700 rounded-2xl p-6 max-w-sm w-full"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">{profile?.isFamily ? '⚔️' : '🎮'}</span>
          <div>
            <p className="text-white font-bold">{profile?.fullName || targetId}</p>
            <p className="text-xs text-gray-500">{profile?.grade}{profile && !profile.isFamily && ' · Classmate'}</p>
          </div>
        </div>

        {loading ? (
          <p className="text-gray-500 text-sm animate-pulse">Loading stats...</p>
        ) : (
          <>
            <div className="bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 mb-3">
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Level</p>
              <p className="text-white font-bold">{level ?? '?'}</p>
            </div>

            <div className="bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 mb-3">
              <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Active Monster</p>
              {activeMonster ? (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 flex-shrink-0">
                    <MonsterImage monster={ALL_MONSTERS[activeMonster.monster_id]} className="w-full h-full" emojiClassName="text-2xl" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-bold">
                      {activeMonster.nickname || ALL_MONSTERS[activeMonster.monster_id]?.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      Lv{activeMonster.monster_level} · {ALL_MONSTERS[activeMonster.monster_id]?.element}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-gray-600 text-sm">No active monster</p>
              )}
            </div>

            {team.length > 0 && (
              <div className="bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 mb-4">
                <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Team</p>
                <div className="space-y-1">
                  {team.map(m => (
                    <div key={m.slot} className="flex items-center gap-1.5 text-xs text-gray-400">
                      <div className="w-4 h-4 flex-shrink-0">
                        <MonsterImage monster={ALL_MONSTERS[m.monster_id]} className="w-full h-full" emojiClassName="text-sm" />
                      </div>
                      <span>{m.nickname || ALL_MONSTERS[m.monster_id]?.name} — Lv{m.monster_level}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => { onWave(targetId); onClose(); }}
            className="flex-1 bg-amber-700 hover:bg-amber-600 text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors"
          >
            👋 Wave
          </button>
          <button
            onClick={onClose}
            className="bg-neutral-800 hover:bg-neutral-700 text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
