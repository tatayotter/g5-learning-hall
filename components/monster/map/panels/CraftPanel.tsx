'use client';
// A crafting station at the Hideout (lib/craftingConfig.ts): the Kitchen, the Workbench or the
// Compost Bin. Lists the station's recipes (the ones for later steps grey), what each takes
// against what the kid has, then one question to make it (craft_item through lib/crafting.ts).
// The Recipe Book tab shows every recipe in the game and which ones the kid has made. Kitchen food
// goes in the pot after the right answer and is collected on the map once it's cooked.
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { BattleQuestionModal, type BattleQuestion, type GradeResult } from '@/components/battle/shared';
import GameButton from '@/components/GameButton';
import GamePopup from '@/components/game/GamePopup';
import type { GardenBag } from '@/lib/gardenConfig';
import type { TrashCounts } from '@/lib/itemBar';
import { RECIPES, STATIONS, checkRecipe, recipeById, recipesAt, type RecipeDef, type StationId } from '@/lib/craftingConfig';
import { craftItem, fetchMadeRecipes, type CraftResult } from '@/lib/crafting';

interface Props {
  station: StationId;
  userId: string;
  // Stations the kid has built (the Recipe Book says where to make the others).
  built: Set<string>;
  bag: GardenBag;
  trash: TrashCounts;
  gold: number;
  offline: boolean;
  questions: BattleQuestion[];
  gradingUserId: string;
  onAnswered: (answered: BattleQuestion[]) => void;
  /** Something is in this station's pot: nothing else can cook until it's collected. */
  potBusy?: boolean;
  /** After a craft (or food going in the pot): the server's bag, trash and gold. */
  onCrafted: (res: CraftResult) => void;
  /** Closes the panel; `say` is shown over the map, `fly` flies into the bag. */
  onDone: (say?: string, fly?: string[]) => void;
}

const Coin = () => <img src="/icons/rewards/gold_coin.svg" alt="" className="w-3.5 h-3.5 inline-block" />;
const pixel = { imageRendering: 'pixelated' as const };
const STATION_ICON: Record<StationId, string> = {
  kitchen: '/hideout/kitchen.png', workbench: '/hideout/workbench.png', compost: '/hideout/compost_bin.png',
};

export default function CraftPanel({ station, userId, built, bag, trash, gold, offline, questions, gradingUserId, potBusy = false, onAnswered, onCrafted, onDone }: Props) {
  const [tab, setTab] = useState<'make' | 'book'>('make');
  const [picked, setPicked] = useState<string | null>(null);
  const [made, setMade] = useState<Record<string, number>>({});
  const lastRes = useRef<CraftResult | null>(null);
  const entryId = useRef<string>(crypto.randomUUID());

  useEffect(() => {
    if (offline) return;
    let gone = false;
    void fetchMadeRecipes(userId).then(m => { if (m && !gone) setMade(m); });
    return () => { gone = true; };
  }, [userId, offline]);

  const st = STATIONS[station];
  const list = useMemo(() => recipesAt(station), [station]);
  const recipe = picked ? recipeById(picked) : null;

  const chips = (r: RecipeDef) => {
    const c = checkRecipe(r, bag, trash, gold);
    return (
      <div className="flex flex-wrap gap-1.5 mt-1">
        {c.lines.map(l => (
          <span key={l.key} className={`inline-flex items-center gap-1 text-[11px] font-bold rounded-full px-2 py-0.5 border ${l.have >= l.need ? 'bg-green-100 border-green-600 text-green-800' : 'bg-red-100 border-red-500 text-red-700'}`}>
            <img src={l.icon} alt="" className="w-3.5 h-3.5" style={pixel} />
            {Math.min(l.have, 999)} / {l.need} {l.label}
          </span>
        ))}
        {r.gold > 0 && (
          <span className={`inline-flex items-center gap-1 text-[11px] font-bold rounded-full px-2 py-0.5 border ${c.enoughGold ? 'bg-green-100 border-green-600 text-green-800' : 'bg-red-100 border-red-500 text-red-700'}`}>
            <Coin /> {r.gold}
          </span>
        )}
      </div>
    );
  };

  let body: ReactNode;
  // The pop-up's header (components/game/GamePopup.tsx): what's open now.
  let head = { icon: STATION_ICON[station], title: st.name, sub: st.use };
  if (recipe) {
    head = { icon: recipe.icon, title: `${st.verb} ${recipe.name}`, sub: 'Answer right to make it.' };
    const grade = async (q: BattleQuestion, selected: string): Promise<GradeResult> => {
      const res = await craftItem(userId, recipe.id, q.id, selected, entryId.current);
      if (res.status === 'failed') return { correct: false, correctAnswer: null, failed: true };
      entryId.current = crypto.randomUUID();
      lastRes.current = res;
      if (res.status === 'crafted' || res.status === 'cooking') onCrafted(res);
      return { correct: !!res.correct, correctAnswer: res.correctAnswer };
    };
    body = (
      <>
        <BattleQuestionModal
          questions={questions}
          count={1}
          embedded={true}
          gradingUserId={gradingUserId}
          gradeOverride={grade}
          onComplete={(_n, answered) => {
            onAnswered(answered);
            const res = lastRes.current;
            if (!res) { onDone("That didn't work. Try again!"); return; }
            if (res.status === 'crafted') {
              const n = res.outputQty;
              const what = n > 1 ? `${n} ${recipe.name}` : `a ${recipe.name}`;
              onDone(`${res.first ? 'New recipe! ' : ''}You made ${what}!${recipe.outputTo === 'inventory' ? ' Find it in your items for battle.' : ''}`,
                Array(Math.min(n, 5)).fill(recipe.icon));
            } else if (res.status === 'cooking') {
              onDone(`${res.first ? 'New recipe! ' : ''}Your ${recipe.name} is cooking! Come back in ${recipe.cookSeconds ?? 30} seconds to take it.`);
            } else if (res.status === 'busy') onDone('Something is already cooking. Take it out first!');
            else if (res.status === 'wrong') onDone('Not quite! Your things are safe. Try again.');
            else if (res.status === 'items') onDone("You don't have enough for that yet.");
            else if (res.status === 'gold') onDone(`You need ${recipe.gold} gold.`);
            else onDone("That can't be done right now.");
          }}
        />
      </>
    );
  } else if (tab === 'book') {
    head = { icon: '/craft/recipe_book.png', title: 'Recipe Book', sub: `You have made ${RECIPES.filter(r => made[r.id]).length} of ${RECIPES.length} recipes.` };
    body = (
      <>
        <div className="space-y-1.5" data-testid="craft-book">
          {RECIPES.map(r => {
            const n = made[r.id] ?? 0;
            return (
              <div key={r.id} className={`flex items-center gap-2 rounded-xl border px-2 py-1.5 ${n ? 'bg-white border-[#c9a87a]' : 'bg-[#e8d0a0]/40 border-[#d8c098]'} ${r.soon ? 'opacity-60' : ''}`}>
                <img src={r.icon} alt="" className={`w-8 h-8 flex-shrink-0 ${n || r.soon ? '' : 'grayscale'}`} style={pixel} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-[#2a1505] leading-tight">{r.name} <span className="font-normal text-[#6b4820]">· {STATIONS[r.station].name}</span></p>
                  <p className="text-[11px] text-[#6b4820] leading-tight">{r.soon ?? r.does}</p>
                </div>
                <span className="text-[11px] font-bold text-[#6b4820] flex-shrink-0">
                  {r.soon ? 'Soon' : n ? `Made ${n}x` : built.has(r.station) ? 'New!' : `Build a ${STATIONS[r.station].name}`}
                </span>
              </div>
            );
          })}
        </div>
        <GameButton variant="quest" color="#2563eb" onClick={() => setTab('make')} className="w-full mt-3" style={{ fontSize: 13 }} data-testid="craft-book-back">
          Back to {st.name}
        </GameButton>
      </>
    );
  } else {
    body = (
      <>
        {offline && <p className="text-xs text-red-700 font-bold mb-2">Your Hideout needs internet right now. Try again when you are back online.</p>}
        {potBusy && <p className="text-xs text-amber-800 font-bold mb-2" data-testid="craft-pot-busy">Something is cooking in the pot. Take it out first!</p>}
        <div className="space-y-2" data-testid="craft-list">
          {list.map(r => {
            const c = checkRecipe(r, bag, trash, gold);
            const ok = !r.soon && c.enoughItems && c.enoughGold && !offline && !(potBusy && r.cookSeconds);
            return (
              <div key={r.id} className={`rounded-xl border-2 px-2.5 py-2 ${r.soon ? 'bg-[#e8d0a0]/40 border-[#d8c098] opacity-60' : 'bg-white border-[#c9a87a]'}`} data-testid={`recipe-${r.id}`}>
                <div className="flex items-center gap-2">
                  <img src={r.icon} alt="" className="w-9 h-9 flex-shrink-0" style={pixel} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-[#2a1505] leading-tight">
                      {r.name}{!r.soon && !made[r.id] && <span className="ml-1 text-[10px] text-amber-700">New!</span>}
                    </p>
                    <p className="text-[11px] text-[#6b4820] leading-tight">{r.soon ?? r.does}</p>
                    {!r.soon && r.cookSeconds ? <p className="text-[11px] font-bold text-[#9a3412] leading-tight">Cooks in {r.cookSeconds} seconds</p> : null}
                  </div>
                  {!r.soon && (
                    <GameButton
                      variant="quest"
                      color={ok ? '#d97706' : '#57534e'}
                      disabled={!ok}
                      onClick={() => { setPicked(r.id); }}
                      style={{ fontSize: 12 }}
                      data-testid={`craft-${r.id}`}
                    >
                      {st.verb}
                    </GameButton>
                  )}
                </div>
                {!r.soon && chips(r)}
              </div>
            );
          })}
        </div>
        <button type="button" onClick={() => setTab('book')} className="w-full mt-3 text-xs font-bold text-[#6b4820] underline" data-testid="craft-open-book">
          Open Recipe Book
        </button>
      </>
    );
  }

  return (
    <GamePopup
      inline
      title={head.title}
      subtitle={head.sub}
      icon={<img src={head.icon} alt="" className="w-11 h-11 mt-1.5 object-contain" style={pixel} />}
      onClose={() => onDone()}
      testId="craft-panel"
      data={{ station }}
    >
      {body}
    </GamePopup>
  );
}
