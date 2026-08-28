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
    <div className="bg-[#1c1611] border border-[#2a2119] rounded-xl p-5 flex items-center justify-between">
      <div>
        <p className="text-[#ede4d3] font-bold mb-1">Boss Fights — Global Switch</p>
        <p className="text-[#8a7c66] text-sm">Opens the Term Boss for every Grade 5 and Grade 2 player at once.</p>
      </div>
      <button
        onClick={handleToggle}
        disabled={loading || saving}
        className={`px-6 py-2.5 rounded-lg font-bold text-sm transition-colors disabled:opacity-40 ${
          enabled ? 'bg-[#3f6428] hover:bg-[#4d7a32] text-[#ede4d3]' : 'bg-[#2a2119] hover:bg-[#3d3225] text-[#c9bfae]'
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
        results[g] = await fetchBossPoolCounts(g, CURRENT_TERM);
      }));
      setCounts(results);
      setLoading(false);
    })();
  }, []);

  if (loading) return <p className="text-[#8a7c66] text-sm">Loading pool counts...</p>;

  return (
    <div className="bg-[#1c1611] border border-[#2a2119] rounded-xl p-5">
      <p className="text-xs text-[#8a7c66] uppercase tracking-widest mb-4">Persona Pool Readiness (needs {POOL_READY_THRESHOLD}+ published questions)</p>
      {BOSS_FIGHT_GRADES.map(grade => (
        <div key={grade} className="mb-4 last:mb-0">
          <p className="text-[#ede4d3] font-bold text-sm mb-2">Grade {grade}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {getPersonasForGrade(grade).map(persona => {
              const count = counts[grade]?.[persona.subject] || 0;
              const ready = count >= POOL_READY_THRESHOLD;
              return (
                <div key={persona.subject} className={`rounded-lg border px-3 py-2 ${ready ? 'border-[#33501f] bg-[#223616]/20' : 'border-[#6e1512] bg-[#4a0e0c]/20'}`}>
                  <p className="text-xs text-[#c9bfae] truncate">{persona.subject}</p>
                  <p className={`text-sm font-bold ${ready ? 'text-[#7fae52]' : 'text-[#e0605a]'}`}>{count} q</p>
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
    <div className="bg-[#1c1611] border border-[#2a2119] rounded-xl p-5">
      <p className="text-[#ede4d3] font-bold mb-1">Final Curio — Per Grade/Term</p>
      <p className="text-[#8a7c66] text-sm mb-4">Granted once a player defeats every persona for this grade+term. Distinct per term.</p>

      <div className="flex gap-2 mb-4">
        {BOSS_FIGHT_GRADES.map(g => (
          <button key={g} onClick={() => setGrade(g)} className={`px-4 py-2 rounded-lg text-sm font-bold ${grade === g ? 'bg-[#c9781a] text-[#ede4d3]' : 'bg-[#2a2119] text-[#a89c86]'}`}>
            Grade {g}
          </button>
        ))}
        <input
          type="number" min={1} value={term} onChange={e => setTerm(Number(e.target.value))}
          className="w-20 bg-neutral-950 border border-[#3d3225] rounded-lg px-3 py-2 text-sm text-[#ede4d3] ml-2"
        />
        <span className="text-xs text-[#8a7c66] self-center">Term</span>
      </div>

      <label className="text-xs text-[#8a7c66] block mb-1">
        Curio Reward{rewardMonsterId && ` — selected: ${ALL_MONSTERS[rewardMonsterId]?.name || rewardMonsterId}`}
      </label>
      <input
        value={monsterFilter} onChange={e => setMonsterFilter(e.target.value)} placeholder="Search curios..."
        className="w-full bg-neutral-950 border border-[#3d3225] rounded-lg px-3 py-2 text-sm text-[#ede4d3] mb-2"
      />
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-48 overflow-y-auto bg-neutral-950 border border-[#2a2119] rounded-lg p-2 mb-4">
        {monsterOptions.map(m => (
          <button
            key={m.id} onClick={() => setRewardMonsterId(m.id)} title={m.name}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-center transition-colors ${
              rewardMonsterId === m.id ? 'border-purple-500 bg-purple-900/20' : 'border-[#2a2119] hover:border-neutral-600'
            }`}
          >
            <span className="text-2xl">{m.emoji}</span>
            <span className="text-[10px] text-[#a89c86] truncate w-full">{m.name}</span>
          </button>
        ))}
      </div>

      <label className="text-xs text-[#8a7c66] block mb-1">Reward Lore (markdown)</label>
      <textarea
        value={loreMarkdown} onChange={e => setLoreMarkdown(e.target.value)}
        className="w-full h-20 bg-neutral-950 border border-[#3d3225] rounded-lg p-3 text-xs text-[#c9bfae] font-mono resize-none mb-4"
      />

      <button
        onClick={handleSave} disabled={saving}
        className="bg-purple-700 hover:bg-purple-600 disabled:opacity-40 text-[#ede4d3] font-bold px-6 py-2 rounded-lg transition-colors"
      >
        Save
      </button>
    </div>
  );
}

export default function BossFightSection({ passcode }: { passcode: string }) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-[#ede4d3] mb-1">👹 Term Boss Fight</h2>
      <GlobalToggle passcode={passcode} />
      <PoolReadinessPanel />
      <GauntletRewardEditor passcode={passcode} />
    </div>
  );
}
