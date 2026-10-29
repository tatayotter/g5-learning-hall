'use client';
// Feeding curios at the Curio Camp (lib/craftingConfig.ts bond hearts): each curio on the team or
// bench, its hearts (one fades every day), and Curio Kibble / Veggie Mash from the Kitchen to feed
// it, twice a day. feed_curio (lib/crafting.ts) does the counting.
import { useState } from 'react';
import { MonsterImage, type UserMonster } from '@/components/battle/shared';
import { getOwnedMonsterDisplay, type MonsterDef } from '@/lib/monsterConfig';
import { gardenItemIcon, gardenItemLabel, type GardenBag } from '@/lib/gardenConfig';
import {
  BOND_BONUS_PER_HEART, CURIO_FOODS, MAX_BOND_HEARTS, bondHeartsNow, bondTitle, feedsLeftToday, nextHeartFadesAt,
} from '@/lib/craftingConfig';
import { feedCurio, type FeedResult } from '@/lib/crafting';
import { manilaToday } from '@/lib/appDay';
import { timeWords } from '@/lib/hideoutConfig';

interface Props {
  userId: string;
  curios: UserMonster[];
  monsterDisplay: Record<string, MonsterDef>;
  bag: GardenBag;
  offline: boolean;
  onFed: (res: FeedResult, name: string) => void;
}

export function BondHearts({ hearts, size = 12 }: { hearts: number; size?: number }) {
  return (
    <span className="inline-flex gap-px" aria-label={`${hearts} of ${MAX_BOND_HEARTS} hearts`}>
      {Array.from({ length: MAX_BOND_HEARTS }, (_, i) => (
        <img key={i} src={i < hearts ? '/craft/heart_full.png' : '/craft/heart_empty.png'} alt="" width={size} height={size} style={{ imageRendering: 'pixelated' }} />
      ))}
    </span>
  );
}

export default function CampFeed({ userId, curios, monsterDisplay, bag, offline, onFed }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  // Hearts just changed: the panel shows them before the curio list reloads.
  const [fresh, setFresh] = useState<Record<string, Partial<UserMonster>>>({});
  const today = manilaToday();
  // When the panel opened, for the hearts and "fades in...".
  const [now] = useState(() => Date.now());
  const foods = CURIO_FOODS.filter(f => (bag[f] ?? 0) > 0);

  return (
    <div className="mb-3" data-testid="camp-feed">
      <p className="text-xs font-bold text-[#2a1505] mb-1">Feed your curios</p>
      <p className="text-[11px] text-[#6b4820] mb-2 leading-tight">
        Each heart makes a curio hit {Math.round(BOND_BONUS_PER_HEART * 100)}% harder and earn more on missions. One heart fades each day, so come back!
        {foods.length === 0 && ' Cook Curio Kibble or Veggie Mash in your Kitchen first.'}
      </p>
      {problem && <p className="text-xs text-red-700 font-bold mb-2">{problem}</p>}
      <div className="space-y-1.5">
        {curios.map(c0 => {
          const c = { ...c0, ...fresh[c0.id] };
          const def = monsterDisplay[c.monster_id];
          const shown = def ? getOwnedMonsterDisplay(def, c.graduation_tier) : null;
          const hearts = bondHeartsNow(c, now);
          const left = feedsLeftToday(c, today);
          const fades = nextHeartFadesAt(c, now);
          const name = c.nickname || shown?.name || 'Your curio';
          return (
            <div key={c.id} className="flex items-center gap-2 bg-white border border-[#c9a87a] rounded-xl px-2 py-1.5" data-testid={`feed-${c.id}`}>
              <div className="w-9 h-9 flex-shrink-0 flex items-center justify-center">{shown && <MonsterImage monster={shown} className="w-9 h-9 object-contain" emojiClassName="text-2xl" />}</div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-[#2a1505] leading-tight truncate">{name}{bondTitle(hearts) && <span className="font-normal text-[#6b4820]"> · {bondTitle(hearts)}</span>}</p>
                <BondHearts hearts={hearts} />
                <p className="text-[10px] text-[#6b4820] leading-tight">
                  {left === 0 ? 'Full for today!' : `Can eat ${left} more today`}
                  {fades && ` · a heart fades in ${timeWords(fades - now)}`}
                </p>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                {foods.map(f => (
                  <button
                    key={f}
                    type="button"
                    disabled={offline || left === 0 || busy !== null}
                    onClick={async () => {
                      setBusy(c.id + f);
                      setProblem(null);
                      const res = await feedCurio(userId, c.id, f);
                      setBusy(null);
                      if (res.status === 'fed' && res.curio) setFresh(m => ({ ...m, [c.id]: res.curio! }));
                      if (res.status === 'fed') onFed(res, name);
                      else setProblem(
                        res.status === 'full' ? `${name} is full! Come back tomorrow.`
                        : res.status === 'no_food' ? 'You have none of that left.'
                        : res.status === 'no_camp' ? 'Build your Curio Camp first.'
                        : "That didn't work. Try again!");
                    }}
                    className="flex flex-col items-center bg-[#f0ddb8] border-2 border-[#c9a87a] hover:border-[#c9781a] rounded-lg px-1.5 py-0.5 disabled:opacity-40"
                    title={`Feed ${gardenItemLabel(f)}`}
                    data-testid={`feed-${c.id}-${f}`}
                  >
                    <img src={gardenItemIcon(f)} alt="" className="w-6 h-6" style={{ imageRendering: 'pixelated' }} />
                    <span className="text-[10px] font-bold text-[#2a1505]">x{bag[f]}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
