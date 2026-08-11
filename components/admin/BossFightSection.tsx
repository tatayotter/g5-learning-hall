'use client';
// components/admin/BossFightSection.tsx
// Admin controls for the Term Exam Boss Fight: the one global on/off toggle,
// per-grade/term final-curio reward config (mirrors EventsSection's curio
// picker), and a read-only pool-readiness panel (mirrors QuestionBankSection's
// PoolCountPanel, but counts draft_questions instead of the sq_* guild tables).
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ALL_MONSTERS } from '@/lib/monsterConfig';
import { callAdminApi } from '@/lib/adminApi';
import { CURRENT_TERM } from '@/lib/guildConfig';
import { getPersonasForGrade } from '@/lib/bossPersonas';
import { fetchBossPoolCounts, POOL_READY_THRESHOLD } from '@/lib/bossFightEngine';

const BOSS_FIGHT_GRADES = [5, 2] as const;

function GlobalToggle({ passcode }: { passcode: string }) {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('boss_fights_status').select('boss_fights_enabled').maybeSingle().then(({ data }) => {
      setEnabled(!!data?.boss_fights_enabled);
      setLoading(false);
    });
  }, []);

  const handleToggle = async () => {
    setSaving(true);
    const next = !enabled;
    const result = await callAdminApi('/api/admin-boss-fights', { passcode, action: 'set_enabled', enabled: next });
    if (!result.success) {
      alert(`❌ Failed: ${result.error}`);
    } else {
      setEnabled(next);
    }
    setSaving(false);
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex items-center justify-between">
      <div>
        <p className="text-white font-bold mb-1">Boss Fights — Global Switch</p>
        <p className="text-gray-500 text-sm">Opens the Term Boss for every Grade 5 and Grade 2 player at once.</p>
      </div>
      <button
        onClick={handleToggle}
        disabled={loading || saving}
        className={`px-6 py-2.5 rounded-lg font-bold text-sm transition-colors disabled:opacity-40 ${
          enabled ? 'bg-green-700 hover:bg-green-600 text-white' : 'bg-neutral-800 hover:bg-neutral-700 text-gray-300'
        }`}
      >
        {loading ? '…' : enabled ? '🟢 Enabled' : '⚪ Disabled'}
      </button>
    </div>
  );
}

function PoolReadinessPanel() {
  const [counts, setCounts] = useState<Record<number, Record<string, number>>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const results: Record<number, Record<string, number>> = {};
      await Promise.all(BOSS_FIGHT_GRADES.map(async g => {
        results[g] = await fetchBossPoolCounts(g);
      }));
      setCounts(results);
      setLoading(false);
    })();
  }, []);

  if (loading) return <p className="text-gray-500 text-sm">Loading pool counts...</p>;

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
      <p className="text-xs text-gray-500 uppercase tracking-widest mb-4">Persona Pool Readiness (needs {POOL_READY_THRESHOLD}+ published questions)</p>
      {BOSS_FIGHT_GRADES.map(grade => (
        <div key={grade} className="mb-4 last:mb-0">
          <p className="text-white font-bold text-sm mb-2">Grade {grade}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {getPersonasForGrade(grade).map(persona => {
              const count = counts[grade]?.[persona.subject] || 0;
              const ready = count >= POOL_READY_THRESHOLD;
              return (
                <div key={persona.subject} className={`rounded-lg border px-3 py-2 ${ready ? 'border-green-800 bg-green-900/20' : 'border-red-800 bg-red-900/20'}`}>
                  <p className="text-xs text-gray-300 truncate">{persona.subject}</p>
                  <p className={`text-sm font-bold ${ready ? 'text-green-400' : 'text-red-400'}`}>{count} q</p>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function GauntletRewardEditor({ passcode }: { passcode: string }) {
  const [grade, setGrade] = useState<number>(5);
  const [term, setTerm] = useState<number>(CURRENT_TERM);
  const [rewardMonsterId, setRewardMonsterId] = useState('');
  const [loreMarkdown, setLoreMarkdown] = useState('');
  const [monsterFilter, setMonsterFilter] = useState('');
  const [saving, setSaving] = useState(false);
  const [existing, setExisting] = useState<Record<string, { reward_monster_id: string; reward_lore_markdown: string | null }>>({});

  useEffect(() => {
    supabase.from('boss_gauntlet_rewards').select('grade, term, reward_monster_id, reward_lore_markdown').then(({ data }) => {
      const map: typeof existing = {};
      for (const row of data || []) {
        map[`${row.grade}_${row.term}`] = { reward_monster_id: row.reward_monster_id, reward_lore_markdown: row.reward_lore_markdown };
      }
      setExisting(map);
    });
  }, []);

  useEffect(() => {
    const row = existing[`${grade}_${term}`];
    setRewardMonsterId(row?.reward_monster_id || '');
    setLoreMarkdown(row?.reward_lore_markdown || '');
  }, [grade, term, existing]);

  const monsterOptions = Object.values(ALL_MONSTERS).filter(m =>
    m.name.toLowerCase().includes(monsterFilter.toLowerCase())
  );

  const handleSave = async () => {
    if (!rewardMonsterId) {
      alert('Pick a curio reward first.');
      return;
    }
    setSaving(true);
    const result = await callAdminApi('/api/admin-boss-fights', {
      passcode, action: 'upsert_gauntlet_reward', grade, term,
      reward_monster_id: rewardMonsterId, reward_lore_markdown: loreMarkdown,
    });
    if (!result.success) {
      alert(`❌ Save failed: ${result.error}`);
    } else {
      setExisting(prev => ({ ...prev, [`${grade}_${term}`]: { reward_monster_id: rewardMonsterId, reward_lore_markdown: loreMarkdown } }));
      alert('✅ Gauntlet reward saved!');
    }
    setSaving(false);
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
      <p className="text-white font-bold mb-1">Final Curio — Per Grade/Term</p>
      <p className="text-gray-500 text-sm mb-4">Granted once a player defeats every persona for this grade+term. Distinct per term.</p>

      <div className="flex gap-2 mb-4">
        {BOSS_FIGHT_GRADES.map(g => (
          <button key={g} onClick={() => setGrade(g)} className={`px-4 py-2 rounded-lg text-sm font-bold ${grade === g ? 'bg-blue-600 text-white' : 'bg-neutral-800 text-gray-400'}`}>
            Grade {g}
          </button>
        ))}
        <input
          type="number" min={1} value={term} onChange={e => setTerm(Number(e.target.value))}
          className="w-20 bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white ml-2"
        />
        <span className="text-xs text-gray-500 self-center">Term</span>
      </div>

      <label className="text-xs text-gray-500 block mb-1">
        Curio Reward{rewardMonsterId && ` — selected: ${ALL_MONSTERS[rewardMonsterId]?.name || rewardMonsterId}`}
      </label>
      <input
        value={monsterFilter} onChange={e => setMonsterFilter(e.target.value)} placeholder="Search curios..."
        className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white mb-2"
      />
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-48 overflow-y-auto bg-neutral-950 border border-neutral-800 rounded-lg p-2 mb-4">
        {monsterOptions.map(m => (
          <button
            key={m.id} onClick={() => setRewardMonsterId(m.id)} title={m.name}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-center transition-colors ${
              rewardMonsterId === m.id ? 'border-purple-500 bg-purple-900/20' : 'border-neutral-800 hover:border-neutral-600'
            }`}
          >
            <span className="text-2xl">{m.emoji}</span>
            <span className="text-[10px] text-gray-400 truncate w-full">{m.name}</span>
          </button>
        ))}
      </div>

      <label className="text-xs text-gray-500 block mb-1">Reward Lore (markdown)</label>
      <textarea
        value={loreMarkdown} onChange={e => setLoreMarkdown(e.target.value)}
        className="w-full h-20 bg-neutral-950 border border-neutral-700 rounded-lg p-3 text-xs text-gray-300 font-mono resize-none mb-4"
      />

      <button
        onClick={handleSave} disabled={saving}
        className="bg-purple-700 hover:bg-purple-600 disabled:opacity-40 text-white font-bold px-6 py-2 rounded-lg transition-colors"
      >
        Save
      </button>
    </div>
  );
}

export default function BossFightSection({ passcode }: { passcode: string }) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white mb-1">👹 Term Boss Fight</h2>
      <GlobalToggle passcode={passcode} />
      <PoolReadinessPanel />
      <GauntletRewardEditor passcode={passcode} />
    </div>
  );
}
