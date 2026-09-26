'use client';
// components/dev/BattleStagePlayground.tsx
// /dev/ui-gallery harness for the real BattleStage + Phaser creature layer —
// pick any curio (every graduation/guild stage included) for each side and
// fire the exact prop signals BattleScreen/LiveBattleScreen send, including
// their reset-then-double-rAF animClassName replay pattern.
import { useMemo, useState } from 'react';
import BattleStage, { type BattleStageMonster, makeStageAction, ActionTile } from '@/components/battle/BattleStage';
import { attackClassHits, type AttackClass } from '@/lib/attackClasses';
import { QUALITY_TIERS, type QualityTier } from '@/lib/curioQuality';
import {
  ALL_MONSTERS, SKILLS, getSkillIconSrc, NORMAL_SKILL_ICON_SRC, getGraduatedMonsterDisplay, getGuildMonsterTierDef, getMaxGraduationTier, type MonsterDef, type Element,
} from '@/lib/monsterConfig';

function allCurioForms(): MonsterDef[] {
  const out: MonsterDef[] = [];
  for (const def of Object.values(ALL_MONSTERS)) {
    out.push(def);
    if (def.guildEvolution) out.push(getGuildMonsterTierDef(def, 2), getGuildMonsterTierDef(def, 3));
    for (let t = 1; t <= getMaxGraduationTier(def); t++) out.push(getGraduatedMonsterDisplay(def, t));
  }
  return out;
}

type SideKey = 'left' | 'right';

// Every skill plus Rest (which borrows the curio's own element).
const MOVES: { id: string; name: string; animation: AttackClass; element: Element | null | 'own' }[] = [
  ...Object.values(SKILLS).map(k => ({ id: k.id, name: k.name, animation: k.animation, element: k.element })),
  { id: '__rest__', name: 'Rest', animation: 'restore', element: 'own' },
];

export default function BattleStagePlayground() {
  const forms = useMemo(() => allCurioForms(), []);
  const [pick, setPick] = useState<Record<SideKey, number>>(() => ({
    left: Math.max(0, forms.findIndex(f => f.name === 'Emberpaw')),
    right: Math.max(0, forms.findIndex(f => f.name === 'Infernabrax')),
  }));
  const [hp, setHp] = useState<Record<SideKey, number>>({ left: 100, right: 100 });
  const [anim, setAnim] = useState<Record<SideKey, string>>({ left: '', right: '' });
  const [popup, setPopup] = useState<Record<SideKey, BattleStageMonster['damagePopup']>>({ left: null, right: null });
  const [banner, setBanner] = useState<{ text: string; iconSrc: string | null } | null>(null);
  const [introKey, setIntroKey] = useState(0);
  const [layout, setLayout] = useState<'auto' | 'landscape' | 'portrait'>('auto');
  const [quality, setQuality] = useState<Record<SideKey, QualityTier>>({ left: 'outstanding', right: 'perfect' });
  const [move, setMove] = useState<Record<SideKey, number>>({ left: 0, right: 1 });
  const [action, setAction] = useState<Record<SideKey, BattleStageMonster['action']>>({ left: null, right: null });

  const triggerAnim = (side: SideKey, name: string) => {
    setAnim(a => ({ ...a, [side]: '' }));
    requestAnimationFrame(() => requestAnimationFrame(() => {
      setAnim(a => ({ ...a, [side]: name }));
      setTimeout(() => setAnim(a => ({ ...a, [side]: '' })), 600);
    }));
  };

  const strike = (attacker: SideKey, missed: boolean, finisher = false) => {
    const target: SideKey = attacker === 'left' ? 'right' : 'left';
    const m = MOVES[move[attacker]];
    const element = m.element === 'own' ? forms[pick[attacker]].element : m.element;
    const dmg = missed ? 0 : finisher ? hp[attacker === 'left' ? 'right' : 'left'] : 18 + Math.floor(Math.random() * 12);
    setBanner({ text: `${forms[pick[attacker]].name} used ${m.name}!`, iconSrc: null });
    setTimeout(() => setBanner(null), 1400);
    setAction(a => ({ ...a, [attacker]: makeStageAction({ animation: m.animation, element }) }));
    if (!attackClassHits(m.animation)) return;
    if (!missed) {
      triggerAnim(target, 'battle-hit');
      setHp(h => ({ ...h, [target]: Math.max(0, h[target] - dmg) }));
    }
    setPopup(p => ({ ...p, [target]: { key: Date.now(), value: dmg, missed } }));
  };

  const burn = (side: SideKey) => {
    triggerAnim(side, 'battle-hit');
    setHp(h => ({ ...h, [side]: Math.max(0, h[side] - 8) }));
    setPopup(p => ({ ...p, [side]: { key: Date.now(), value: 8, missed: false } }));
  };

  const mon = (side: SideKey): BattleStageMonster => {
    const def = forms[pick[side]];
    return {
      name: def.name, level: 12, def, currentHp: hp[side], maxHp: 100, status: null,
      animClassName: anim[side], action: action[side], damagePopup: popup[side], quality: quality[side],
    };
  };

  const picker = (side: SideKey) => (
    <label className="flex items-center gap-2 text-sm">
      <span className="font-bold capitalize">{side}</span>
      <select
        value={pick[side]}
        onChange={e => { setPick(p => ({ ...p, [side]: Number(e.target.value) })); setHp(h => ({ ...h, [side]: 100 })); }}
        className="border rounded px-2 py-1 bg-white text-[#2a1505]"
      >
        {forms.map((f, i) => <option key={`${f.id}-${i}`} value={i}>{f.name} ({f.size}{f.floats ? ', floats' : ''})</option>)}
      </select>
    </label>
  );

  const movePicker = (side: SideKey) => (
    <label className="flex items-center gap-2 text-sm">
      <span className="font-bold capitalize">{side} move</span>
      <select
        value={move[side]}
        onChange={e => setMove(m => ({ ...m, [side]: Number(e.target.value) }))}
        className="border rounded px-2 py-1 bg-white text-[#2a1505]"
      >
        {MOVES.map((m, i) => <option key={m.id} value={i}>{m.name} ({m.animation}, {m.element === 'own' ? 'curio element' : m.element ?? 'no element'})</option>)}
      </select>
    </label>
  );

  const qualityPicker = (side: SideKey) => (
    <label className="flex items-center gap-2 text-sm">
      <span className="font-bold capitalize">{side} quality</span>
      <select
        value={quality[side]}
        onChange={e => setQuality(q => ({ ...q, [side]: e.target.value as QualityTier }))}
        className="border rounded px-2 py-1 bg-white text-[#2a1505]"
      >
        {QUALITY_TIERS.map(t => <option key={t} value={t}>{t}</option>)}
      </select>
    </label>
  );

  const btn = 'px-3 py-1.5 rounded-lg border border-[#c9a87a] bg-white text-[#2a1505] text-sm font-bold hover:bg-[#f0ddb8]';
  return (
    <div className="w-full">
      <div className="flex flex-wrap gap-4 mb-3">{picker('left')}{picker('right')}</div>
      <div className="flex flex-wrap gap-4 mb-3">{movePicker('left')}{movePicker('right')}</div>
      <div className="flex flex-wrap gap-4 mb-3">
        {qualityPicker('left')}{qualityPicker('right')}
        <label className="flex items-center gap-2 text-sm">
          <span className="font-bold">Layout</span>
          <select value={layout} onChange={e => setLayout(e.target.value as typeof layout)} className="border rounded px-2 py-1 bg-white text-[#2a1505]">
            <option value="auto">auto (phone portrait → portrait)</option>
            <option value="landscape">landscape</option>
            <option value="portrait">portrait</option>
          </select>
        </label>
      </div>
      <div className="flex flex-wrap gap-2 mb-3">
        <button className={btn} onClick={() => strike('left', false)}>Left uses move</button>
        <button className={btn} onClick={() => strike('right', false)}>Right uses move</button>
        <button className={btn} onClick={() => strike('left', true)}>Left misses</button>
        <button className={btn} onClick={() => strike('left', false, true)}>Left finishing blow</button>
        <button className={btn} onClick={() => burn('left')}>Burn tick (left)</button>
        <button className={btn} onClick={() => setHp({ left: 100, right: 100 })}>Heal both</button>
        <button className={btn} onClick={() => setIntroKey(k => k + 1)}>Replay intro</button>
      </div>
      <BattleStage
        key={introKey}
        leftName="Test Trainer"
        rightName="Rival"
        leftMon={mon('left')}
        rightMon={mon('right')}
        leftTeam={[{ fainted: hp.left <= 0, active: true }, { fainted: false, active: false }, { fainted: true, active: false }]}
        rightTeam={[{ fainted: true, active: false }, { fainted: hp.right <= 0, active: true }, { fainted: false, active: false }, { fainted: false, active: false }]}
        roundBadge="Round 1"
        log={['Battle started!']}
        banner={banner}
        layout={layout}
        actionPanel={(() => {
          // Same markup shape as BattleScreen's real panel (.bstage-moves +
          // .bstage-utils), so the portrait CSS is previewed faithfully.
          const kit = forms[pick.left].skills.map(id => SKILLS[id]);
          return (
            <>
              <div className="bstage-moves">
                {kit.map(k => (
                  <ActionTile key={k.id} variant="quest" element={k.element}
                    icon={<img src={getSkillIconSrc(k)} alt="" className="w-full h-full object-contain" />}
                    title={k.name} sub={`Tier ${k.tier} · ${k.questionCount} Q`} />
                ))}
              </div>
              <div className="bstage-utils mt-[7px]">
                <ActionTile variant="quest" icon={<img src={NORMAL_SKILL_ICON_SRC} alt="" className="w-full h-full object-contain" />} title="Rest" sub="Heal 20% HP" />
                <ActionTile variant="quest" color="#4f46e5" icon={<img src="/icons/stats/items.svg" alt="" className="w-full h-full object-contain" />} title="Items" sub="Use an item" />
                <ActionTile variant="quest" color="#0f766e" icon={<img src="/icons/stats/items.svg" alt="" className="w-full h-full object-contain" />} title="Switch" sub="Change curio" />
                <ActionTile variant="quest" danger icon={<img src="/icons/stats/items.svg" alt="" className="w-full h-full object-contain" />} title="Surrender" sub="Forfeit" />
              </div>
            </>
          );
        })()}
      />
    </div>
  );
}
