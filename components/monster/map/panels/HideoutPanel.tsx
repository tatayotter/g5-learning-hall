'use client';
// The Hideout's panels (lib/hideoutConfig.ts), opened by TrainingMap.tsx when a kid uses the
// signpost in Inkwell Town or a plot on their island:
// - deed: buy the Hideout (2,000 gold), then go there;
// - build: a plot not built yet, and the wood it takes;
// - plant: pick seeds (a garden bed) or a sapling (a tree spot), then one question;
// - water: one question with the watering can;
// - info: something growing that's been watered, or the kitchen (coming soon).
// Each action calls its RPC through the Hideout hook (lib/hideout.ts); onDone closes the panel
// and tells the map what to say and what flies into the bag.
import { useMemo, useRef, useState, type ReactNode } from 'react';
import { BattleQuestionModal, type BattleQuestion, type GradeResult } from '@/components/battle/shared';
import GameButton from '@/components/GameButton';
import {
  SEED_ORDER, TREE_ORDER, TREES, VEGGIES, gardenItemIcon, gardenItemLabel, saplingKey, seedsKey, type GardenBag, type TreeId, type VeggieId,
} from '@/lib/gardenConfig';
import {
  HIDEOUT_COST, PLOT_USE, TREE_GROW_MINUTES, GROW_MINUTES, costWords, plantLabel, timeWords, waterAllFor, waterFactorFor,
} from '@/lib/hideoutConfig';
import type { HideoutApi, HideoutCall } from '@/lib/hideout';
import type { HideoutSpot } from '@/hooks/useHideoutMap';

export type HideoutPanelMode = 'deed' | 'build' | 'plant' | 'water' | 'info';

interface Props {
  mode: HideoutPanelMode;
  spot: HideoutSpot;
  api: HideoutApi;
  bag: GardenBag;
  gold: number;
  canTier: number;
  offline: boolean;
  questions: BattleQuestion[];
  gradingUserId: string;
  /** Closes the panel; `say` is shown over the map, `fly` flies into the bag. */
  onDone: (say?: string, fly?: string[]) => void;
  /** Bought: go there now. */
  onTravel: () => void;
  onBought: (res: HideoutCall) => void;
  onAnswered: (answered: BattleQuestion[]) => void;
}

const Coin = () => <img src="/icons/rewards/gold_coin.svg" alt="" className="w-3.5 h-3.5 inline-block" />;
const pixel = { imageRendering: 'pixelated' as const };

export default function HideoutPanel({ mode, spot, api, bag, gold, canTier, offline, questions, gradingUserId, onDone, onTravel, onBought, onAnswered }: Props) {
  const def = spot.plot;
  const [busy, setBusy] = useState(false);
  const [bought, setBought] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  // Plant: the seeds or sapling picked, then the question.
  const [picked, setPicked] = useState<string | null>(null);
  // The last answer's full result (the question only knows right or wrong).
  const lastRes = useRef<HideoutCall | null>(null);
  // When the panel opened, for "ready in about...".
  const [openedAt] = useState(() => Date.now());

  const choices = useMemo(() => {
    if (!def) return [];
    if (def.kind === 'bed') return SEED_ORDER.filter(v => (bag[seedsKey(v)] ?? 0) > 0 && GROW_MINUTES[v]).map(v => ({ item: v as string, key: seedsKey(v), mins: GROW_MINUTES[v]! }));
    if (def.kind === 'grove') return TREE_ORDER.filter(t => (bag[saplingKey(t)] ?? 0) > 0).map(t => ({ item: t as string, key: saplingKey(t), mins: TREE_GROW_MINUTES }));
    return [];
  }, [def, bag]);

  const header = (icon: string, title: string, sub: string) => (
    <div className="flex items-center gap-3 mb-3 bg-[#e8d0a0]/60 border border-[#c9a87a] rounded-xl px-3 py-2">
      <img src={icon} alt="" className="w-10 h-10 flex-shrink-0 object-contain" style={pixel} />
      <div className="min-w-0">
        <p className="text-[#2a1505] font-bold text-sm leading-tight">{title}</p>
        <p className="text-xs text-[#6b4820] leading-tight">{sub}</p>
      </div>
    </div>
  );
  const leave = (words = 'Close') => (
    <GameButton variant="quest" color="#57534e" onClick={() => onDone()} className="w-full mt-3" style={{ fontSize: 13 }} data-testid="hideout-leave">
      {words}
    </GameButton>
  );
  const offlineNote = offline && <p className="text-xs text-red-700 font-bold mb-2">Your Hideout needs internet right now. Try again when you are back online.</p>;
  const problemNote = problem && <p className="text-xs text-red-700 font-bold mb-2" data-testid="hideout-problem">{problem}</p>;

  let body: ReactNode = null;

  if (mode === 'deed') {
    const owned = api.state.owned || bought;
    body = (
      <>
        {header('/hideout/signpost.png', owned ? 'Your Hideout' : 'A Hideout of your own!', owned ? 'Your own island. Cross the bridge to go there.' : 'Your own little island, just for you.')}
        {!owned && (
          <ul className="text-xs text-[#3a2610] space-y-1 mb-3 pl-1">
            <li>Grow veggies from the seeds you find.</li>
            <li>Plant saplings that grow into trees and drop wood.</li>
            <li>Send your curios on missions from the Curio Camp.</li>
            <li>Comes with a free Watering Can!</li>
          </ul>
        )}
        {offlineNote}{problemNote}
        {owned ? (
          <GameButton variant="quest" color="#2563eb" onClick={onTravel} className="w-full" style={{ fontSize: 14 }} data-testid="hideout-go">
            Go to My Hideout
          </GameButton>
        ) : (
          <GameButton
            variant="quest"
            color={gold >= HIDEOUT_COST ? '#d97706' : '#57534e'}
            disabled={busy || offline || gold < HIDEOUT_COST}
            onClick={async () => {
              setBusy(true);
              setProblem(null);
              const res = await api.buy();
              setBusy(false);
              if (res.status === 'ok') { setBought(true); onBought(res); }
              else setProblem(res.status === 'gold' ? `You need ${HIDEOUT_COST} gold.` : res.status === 'owned' ? 'You already have one!' : "That didn't work. Try again!");
            }}
            className="w-full"
            style={{ fontSize: 14 }}
            data-testid="hideout-buy"
          >
            {busy ? 'Buying…' : <span className="inline-flex items-center gap-1">Buy for {HIDEOUT_COST} <Coin /></span>}
          </GameButton>
        )}
        {!owned && gold < HIDEOUT_COST && <p className="text-[11px] text-[#6b4820] mt-2 text-center">You have {gold} gold. Keep playing quests to save up!</p>}
        {leave(owned ? 'Not now' : 'Close')}
      </>
    );
  } else if (mode === 'build' && def) {
    const enough = Object.entries(def.cost).every(([k, n]) => (bag[k] ?? 0) >= n);
    body = (
      <>
        {header(gardenItemIcon('wood'), `Build a ${def.name}`, PLOT_USE[def.kind])}
        <div className="flex flex-wrap gap-2 mb-3">
          {Object.entries(def.cost).map(([k, n]) => (
            <span key={k} className={`inline-flex items-center gap-1.5 text-xs font-bold rounded-full px-2.5 py-1 border ${(bag[k] ?? 0) >= n ? 'bg-green-100 border-green-600 text-green-800' : 'bg-red-100 border-red-500 text-red-700'}`}>
              <img src={gardenItemIcon(k)} alt="" className="w-4 h-4" style={pixel} />
              {bag[k] ?? 0} / {n} {gardenItemLabel(k)}
            </span>
          ))}
        </div>
        {!enough && <p className="text-xs text-[#6b4820] mb-2">Chop trees on the map with your axe to get wood.</p>}
        {offlineNote}{problemNote}
        <GameButton
          variant="quest"
          color={enough ? '#d97706' : '#57534e'}
          disabled={busy || offline || !enough}
          onClick={async () => {
            setBusy(true);
            setProblem(null);
            const res = await api.build(def.id);
            setBusy(false);
            if (res.status === 'ok') onDone(`You built a ${def.name}!`);
            else setProblem(res.status === 'items' ? `You need ${costWords(def.cost)}.` : "That didn't work. Try again!");
          }}
          className="w-full"
          style={{ fontSize: 14 }}
          data-testid="hideout-build"
        >
          {busy ? 'Building…' : `Build with ${costWords(def.cost)}`}
        </GameButton>
        {leave()}
      </>
    );
  } else if (mode === 'plant' && def && !picked) {
    const isBed = def.kind === 'bed';
    body = (
      <>
        {header(isBed ? '/hideout/garden_bed.png' : '/hideout/tree_spot.png', isBed ? 'What will you plant?' : 'Which tree will you plant?', isBed ? 'Pick seeds from your bag.' : 'Pick a sapling from your bag.')}
        {choices.length === 0 ? (
          <p className="text-xs text-[#3a2610] mb-2" data-testid="hideout-none">
            {isBed ? 'You have no seeds yet. Pick wild veggies on the map. Sometimes you find seeds too!' : 'You have no saplings yet. Chop trees on the map. Sometimes you find a sapling!'}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2 mb-1">
            {choices.map(c => (
              <button
                key={c.item}
                type="button"
                disabled={offline}
                onClick={() => setPicked(c.item)}
                className="flex items-center gap-2 bg-white border-2 border-[#c9a87a] hover:border-[#c9781a] hover:bg-[#f0ddb8] rounded-xl px-2 py-1.5 text-left disabled:opacity-50"
                data-testid={`hideout-pick-${c.item}`}
              >
                <img src={gardenItemIcon(c.key)} alt="" className="w-8 h-8 flex-shrink-0" style={pixel} />
                <span className="min-w-0">
                  <span className="block text-xs font-bold text-[#2a1505] leading-tight">{plantLabel(def.kind, c.item)}</span>
                  <span className="block text-[11px] text-[#6b4820] leading-tight">x{bag[c.key]} · grows in {timeWords(c.mins * 60000)}</span>
                </span>
              </button>
            ))}
          </div>
        )}
        {offlineNote}
        {leave()}
      </>
    );
  } else if ((mode === 'plant' && def && picked) || (mode === 'water' && def)) {
    const planting = mode === 'plant';
    const label = planting ? plantLabel(def!.kind, picked!) : plantLabel(def!.kind, spot.item ?? '');
    const icon = planting
      ? gardenItemIcon(def!.kind === 'bed' ? seedsKey(picked as VeggieId) : saplingKey(picked as TreeId))
      : canTier > 0 ? `/gear/can_${Math.min(canTier, 4)}.png` : '/gear/can_1.png';
    const off = Math.round((1 - waterFactorFor(canTier)) * 100);
    const grade = async (q: BattleQuestion, selected: string): Promise<GradeResult> => {
      const res = planting ? await api.plant(def!.id, picked!, q.id, selected) : await api.water(def!.id, q.id, selected);
      if (res.status === 'failed') return { correct: false, correctAnswer: null, failed: true };
      lastRes.current = res;
      return { correct: !!res.correct, correctAnswer: res.correctAnswer };
    };
    body = (
      <>
        {header(icon, planting ? `Plant ${label}` : `Water the ${label}`,
          planting ? 'Answer right to plant it.' : `Answer right to water it. It will grow ${off}% faster${waterAllFor(canTier) ? ', and so will everything else growing' : ''}.`)}
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
            if (res.status === 'planted') onDone(def!.kind === 'bed' ? `You planted ${label}! Come back when it's ripe.` : `You planted a ${label}! It grows in a day.`);
            else if (res.status === 'watered') onDone(res.watered.length > 1 ? `You watered ${res.watered.length} plants!` : `You watered the ${label}! It will be ready sooner.`);
            else if (res.status === 'wrong') onDone('Not quite! Try again for another question.');
            else onDone("That can't be done right now.");
          }}
        />
        {leave('Leave it for now')}
      </>
    );
  } else {
    // Info: growing and watered already, the kitchen, or a tree that gave its wood today.
    const ready = spot.readyAt ? Math.max(0, spot.readyAt - openedAt) : 0;
    const name = def?.kind === 'bed' ? VEGGIES[spot.item as VeggieId]?.label : spot.item ? `${TREES[spot.item as TreeId]?.label} Tree` : def?.name;
    const text = spot.phase === 'soon' ? 'Cooking is coming soon! Save your veggies for it.'
      : spot.phase === 'collected' ? 'This tree gave its wood today. Come back tomorrow for more!'
      : `Ready in about ${timeWords(ready)}. ${spot.watered ? 'You watered it already!' : ''}`;
    body = (
      <>
        {header(spot.icon, name ?? 'Your Hideout', text)}
        {leave('OK')}
      </>
    );
  }

  return (
    <div className="w-full max-w-xl bg-[#f0ddb8] border-2 border-[#8b5e2a] rounded-2xl p-4 max-h-full overflow-y-auto battle-panel-in" data-testid="hideout-panel" data-mode={mode}>
      {body}
    </div>
  );
}
