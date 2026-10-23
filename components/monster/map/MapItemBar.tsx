'use client';
// The 4 item slots on the Training Map (like a game hotbar), the bag (a
// 30-square grid, like an MMORPG bag) and the Tracking Scroll's catch meter.
// State and saving live in hooks/useItemBar.ts; this is only the look and the
// taps.
//
// The slots are map chrome (dark, over game art — see docs/STYLE_GUIDE.md's
// "deliberately still dark" list). The panels they open are parchment
// content panels.
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ALL_MONSTERS, type MonsterDef } from '@/lib/monsterConfig';
import { TRASH_DEFS, TRASH_ORDER, type TrashType } from '@/lib/trashConfig';
import { isItemSlot, isTrashSlot, slotOf, ITEM_BAR_SIZE, TRASH_STACK, type ItemSlot } from '@/lib/itemBar';
import { TRACKING_GOAL, trackedMonsterId } from '@/lib/curioTracking';
import type { ItemBarApi } from '@/hooks/useItemBar';
import { MonsterImage } from '@/components/battle/shared';
import GameButton from '@/components/GameButton';
import TrackingScrollIcon from '@/components/monster/TrackingScrollIcon';
import { playPageFlip } from '@/lib/sounds';
import { GARDEN_KEYS, GARDEN_STACK, VEGGIE_SELL_PRICE, WOOD_SELL_PRICE, gardenItemIcon, gardenItemLabel, parseGardenKey, type GardenBag } from '@/lib/gardenConfig';

interface MapItemBarProps {
  api: ItemBarApi;
  offline: boolean;
  // Short note shown beside the slots (full bag, meter progress).
  message: string | null;
  onMessage: (text: string) => void;
  // Garden items: veggies, wood, seed packets, saplings. They live in the bag only, not the slots.
  gardenBag?: GardenBag;
}

// What a bag square holds: a Tracking Scroll (by inventory key), a stack of
// one kind of trash, or a stack of one garden item (by bag item key). A
// kind with more than TRASH_STACK (GARDEN_STACK) pieces fills several squares.
type BagPick = { item: string } | { trash: TrashType } | { garden: string };
type BagSquare = { pick: BagPick; n: number; key: string };

type Panel =
  | { kind: 'bag'; pick: BagPick | null }
  | { kind: 'scroll'; slot: number; monsterId: string }
  | { kind: 'trash'; slot: number; type: TrashType }
  | { kind: 'summon'; monsterId: string };

const SLOT_KEYS = ['1', '2', '3', '4'];

function Meter({ value, className = '' }: { value: number; className?: string }) {
  const pct = Math.min(100, Math.round((value / TRACKING_GOAL) * 100));
  return (
    <div className={`h-2 rounded-full bg-black/40 overflow-hidden border border-[#d4a017]/60 ${className}`}>
      <div className="h-full rounded-full bg-gradient-to-r from-[#f5c542] to-[#22c55e] transition-[width] duration-500" style={{ width: `${pct}%` }} />
    </div>
  );
}

// Portaled to <body>: the bar sits in a transformed container, which would
// otherwise trap a `fixed` panel inside it.
function PanelFrame({ onClose, wide = false, children }: { onClose: () => void; wide?: boolean; children: React.ReactNode }) {
  return createPortal(
    <div className="fixed inset-0 z-[100] bg-[#0a0807]/70 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className={`relative w-full ${wide ? 'max-w-sm [@media(max-height:500px)]:max-w-xl' : 'max-w-xs'} max-h-[calc(100dvh-2rem)] overflow-y-auto bg-[#f0ddb8] border-2 border-[#8b5e2a] rounded-2xl p-4 text-center shadow-[0_6px_0_#8b5e2a] battle-panel-in`}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

// Dragging (mouse) between the bag and the slots: a bag item, or a slot.
const DRAG_TYPE = 'application/x-lh-bag';
type DragData = { pick: BagPick } | { slot: number };
const readDrag = (e: React.DragEvent): DragData | null => {
  try { return JSON.parse(e.dataTransfer.getData(DRAG_TYPE)) as DragData; } catch { return null; }
};
const startDrag = (e: React.DragEvent, data: DragData) => {
  e.dataTransfer.setData(DRAG_TYPE, JSON.stringify(data));
  e.dataTransfer.effectAllowed = 'move';
};
const allowDrop = (e: React.DragEvent) => {
  if (e.dataTransfer.types.includes(DRAG_TYPE)) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }
};

// What's in a slot, as a picture.
function SlotThing({ s, trash, size }: { s: ItemSlot; trash: Record<TrashType, number>; size: 'sm' | 'lg' }) {
  if (isTrashSlot(s)) {
    return (
      <>
        <TrashIcon type={s.trash} className={size === 'lg' ? 'w-8 h-8 lg:w-10 lg:h-10' : 'w-[80%] h-[80%]'} />
        <span className="absolute bottom-0 right-0.5 text-[10px] font-black text-white leading-none" style={{ textShadow: '0 1px 2px #000' }}>{trash[s.trash]}</span>
      </>
    );
  }
  const id = isItemSlot(s) ? trackedMonsterId(s.item) : null;
  const def = id ? ALL_MONSTERS[id] : undefined;
  return def ? <TrackingScrollIcon monster={def} className={size === 'lg' ? 'w-11 h-11 lg:w-[52px] lg:h-[52px]' : 'w-[92%] h-[92%]'} /> : null;
}

const samePick = (a: BagPick | null, b: BagPick) =>
  !!a && ('item' in a ? 'item' in b && a.item === b.item
    : 'trash' in a ? 'trash' in b && a.trash === b.trash
    : 'garden' in b && a.garden === b.garden);

function GardenIcon({ itemKey, className }: { itemKey: string; className: string }) {
  return <img src={gardenItemIcon(itemKey)} alt="" className={`object-contain ${className}`} style={{ imageRendering: 'pixelated' }} />;
}

function TrashIcon({ type, className }: { type: TrashType; className: string }) {
  return <img src={`/trash/${type}.png`} alt="" className={`object-contain ${className}`} />;
}

export default function MapItemBar({ api, offline, message, onMessage, gardenBag }: MapItemBarProps) {
  const [panel, setPanel] = useState<Panel | null>(null);
  const { bar, trash, activeTracking, progress } = api;

  const activeDef: MonsterDef | undefined = activeTracking ? ALL_MONSTERS[activeTracking] : undefined;
  const activeProgress = activeTracking ? progress[activeTracking] ?? 0 : 0;
  const activeFull = activeProgress >= TRACKING_GOAL;

  // A "+1" pops over the active scroll's slot each time its meter goes up.
  const [pop, setPop] = useState(0);
  const lastProgress = useRef<{ id: string | null; p: number }>({ id: activeTracking, p: activeProgress });
  useEffect(() => {
    const last = lastProgress.current;
    lastProgress.current = { id: activeTracking, p: activeProgress };
    if (last.id !== activeTracking || activeProgress <= last.p) return;
    setPop(n => n + 1);
    const t = setTimeout(() => setPop(0), 1400);
    return () => clearTimeout(t);
  }, [activeTracking, activeProgress]);

  const tapSlot = async (i: number) => {
    playPageFlip();
    const s = bar[i];
    if (!s) { setPanel({ kind: 'bag', pick: null }); return; }
    if (isTrashSlot(s)) { setPanel({ kind: 'trash', slot: i, type: s.trash }); return; }
    const monsterId = trackedMonsterId(s.item);
    if (!monsterId) return;
    if (offline) { onMessage('Tracking Scrolls need internet.'); return; }
    if (monsterId === activeTracking) {
      setPanel(activeFull ? { kind: 'summon', monsterId } : { kind: 'scroll', slot: i, monsterId });
      return;
    }
    const ok = await api.startTracking(monsterId);
    if (ok) onMessage(`Tracking ${ALL_MONSTERS[monsterId]?.name}! Answer map questions right to fill the meter.`);
    else onMessage('That didn\'t work. Try again!');
  };

  // Keys 1-4 tap a slot on a computer.
  const tapSlotRef = useLatest(tapSlot);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      const i = SLOT_KEYS.indexOf(e.key);
      if (i === -1 || document.querySelector('.stage-overlay')) return;
      e.preventDefault();
      void tapSlotRef.current(i);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tapSlotRef]);

  // The bag's squares: scrolls first, then trash stacks, then veggies and seed packets.
  const squares: BagSquare[] = [
    ...api.itemKeys.map(k => ({ pick: { item: k }, n: 1, key: k })),
    ...TRASH_ORDER.flatMap(t => {
      const out: BagSquare[] = [];
      for (let left = trash[t], i = 0; left > 0; left -= TRASH_STACK, i++) {
        out.push({ pick: { trash: t }, n: Math.min(TRASH_STACK, left), key: `${t}-${i}` });
      }
      return out;
    }),
    ...GARDEN_KEYS.flatMap(k => {
      const out: BagSquare[] = [];
      for (let left = gardenBag?.[k] ?? 0, i = 0; left > 0; left -= GARDEN_STACK, i++) {
        out.push({ pick: { garden: k }, n: Math.min(GARDEN_STACK, left), key: `${k}-${i}` });
      }
      return out;
    }),
  ];
  const barFull = !bar.includes(null);
  const bagFull = api.bagUsed >= api.bagSize;
  const bagNearlyFull = api.bagUsed >= api.bagSize - 5;

  const dropOnSlot = (d: DragData | null, slot: number) => {
    if (!d) return;
    playPageFlip();
    if ('slot' in d) api.swap(d.slot, slot);
    else if (!('garden' in d.pick)) api.placeAt(d.pick, slot);
  };
  const dropOnBag = (d: DragData | null) => {
    if (!d || !('slot' in d)) return;
    playPageFlip();
    api.unequip(d.slot);
  };

  return (
    <>
      <div className="relative flex flex-col items-end lg:items-center gap-1 pointer-events-auto select-none" data-testid="map-item-bar">
        {message && (
          <div
            className="absolute right-0 lg:right-auto lg:left-1/2 lg:-translate-x-1/2 bottom-full mb-2 w-56 bg-[#0a0807]/90 border border-[#d4a017] text-[#fde68a] text-xs font-bold px-3 py-1.5 rounded-xl shadow-lg text-center pointer-events-none"
            data-testid="map-bar-message"
            role="status"
          >
            {message}
          </div>
        )}
        {activeDef && (
          <button
            onClick={() => { playPageFlip(); setPanel(activeFull ? { kind: 'summon', monsterId: activeTracking! } : { kind: 'scroll', slot: bar.findIndex(s => isItemSlot(s) && trackedMonsterId(s.item) === activeTracking), monsterId: activeTracking! }); }}
            className={`flex items-center gap-1.5 bg-[#0a0807]/80 border border-[#d4a017] rounded-full pl-1 pr-2.5 py-0.5 text-[11px] font-bold text-white ${activeFull ? 'animate-pulse' : ''}`}
            data-testid="tracking-chip"
          >
            <MonsterImage monster={activeDef} className="w-5 h-5" emojiClassName="text-sm" />
            {activeFull ? <span className="text-[#fde68a]">{activeDef.name}: Tap to summon!</span> : (
              <>
                <span>{activeDef.name}</span>
                <Meter value={activeProgress} className="w-16" />
                <span className="tabular-nums">{activeProgress}/{TRACKING_GOAL}</span>
              </>
            )}
          </button>
        )}
        {/* A column on the right edge; a row on short (landscape phone) screens and desktop. */}
        <div className="flex flex-col [@media(max-height:500px)]:flex-row lg:flex-row items-center gap-1.5 bg-[#0a0807]/60 rounded-xl p-1.5 border border-[#d4a017]/50">
          {Array.from({ length: ITEM_BAR_SIZE }, (_, i) => {
            const s = bar[i];
            const scrollId = isItemSlot(s) ? trackedMonsterId(s.item) : null;
            const def = scrollId ? ALL_MONSTERS[scrollId] : undefined;
            const isActive = !!scrollId && scrollId === activeTracking;
            const p = scrollId ? progress[scrollId] ?? 0 : 0;
            return (
              <button
                key={i}
                onClick={() => void tapSlot(i)}
                draggable={!!s}
                onDragStart={e => startDrag(e, { slot: i })}
                onDragOver={allowDrop}
                onDrop={e => { e.preventDefault(); dropOnSlot(readDrag(e), i); }}
                aria-label={s ? (isTrashSlot(s) ? `${TRASH_DEFS[s.trash].label} ×${trash[s.trash]}` : `Tracking Scroll: ${def?.name}`) : `Empty slot ${i + 1}`}
                data-testid={`item-slot-${i + 1}`}
                className={`relative w-12 h-12 lg:w-14 lg:h-14 rounded-lg border-2 flex items-center justify-center bg-[#1c140c]/85 transition-transform active:scale-95 ${
                  isActive ? 'border-[#fde68a] shadow-[0_0_10px_2px_rgba(253,230,138,0.7)]' : 'border-[#8b5e2a]'
                } ${isActive && p >= TRACKING_GOAL ? 'animate-pulse' : ''}`}
              >
                <span className="absolute top-0 left-0.5 text-[9px] font-bold text-[#e8d0a0]/80 leading-none">{i + 1}</span>
                <SlotThing s={s} trash={trash} size="lg" />
                {def && p > 0 && <Meter value={p} className="absolute bottom-0.5 left-1 right-4 !h-1" />}
                {isActive && pop > 0 && (
                  <span key={pop} className="meter-plus-float absolute left-1/2 top-0 pointer-events-none" data-testid="meter-plus">+1</span>
                )}
              </button>
            );
          })}
          <button
            onClick={() => { playPageFlip(); setPanel({ kind: 'bag', pick: null }); }}
            onDragOver={allowDrop}
            onDrop={e => { e.preventDefault(); dropOnBag(readDrag(e)); }}
            aria-label={bagFull ? 'Open bag (full)' : 'Open bag'}
            data-testid="item-bag"
            className={`relative w-12 h-9 [@media(max-height:500px)]:w-9 [@media(max-height:500px)]:h-12 lg:w-10 lg:h-14 rounded-lg border-2 ${bagFull ? 'border-[#ef4444]' : 'border-[#8b5e2a]'} bg-[#3a2610]/90 flex items-center justify-center text-xl active:scale-95`}
          >
            <img src="/icons/stats/items_100.png" alt="" draggable={false} className="w-8 h-8 object-contain" style={{ imageRendering: 'pixelated' }} />
            {/* Nearly full: how many squares are used. Full: a red FULL tag. */}
            {bagNearlyFull && (
              <span
                className={`absolute -top-1.5 -right-1.5 px-1 rounded-full text-[9px] font-black leading-[14px] tabular-nums ${bagFull ? 'bg-[#ef4444] text-white' : 'bg-[#f5c542] text-[#2a1505]'}`}
                data-testid="bag-badge"
              >
                {bagFull ? 'FULL' : `${api.bagUsed}/${api.bagSize}`}
              </span>
            )}
          </button>
        </div>
      </div>

      {panel?.kind === 'bag' && (
        <PanelFrame wide onClose={() => setPanel(null)}>
          <div className="flex items-center justify-between gap-2 mb-2">
            <h3 className="text-lg font-extrabold text-[#7a4a0f]">Your Bag</h3>
            {/* The 4 slots, here too: tap an item then a slot to put it there, or drag. */}
            <div className="flex gap-1 mx-auto" data-testid="bag-slots">
              {Array.from({ length: ITEM_BAR_SIZE }, (_, i) => {
                const s = bar[i];
                const holdsPick = !!panel.pick && !!s && samePick(panel.pick, s);
                return (
                  <button
                    key={i}
                    onClick={() => {
                      if (panel.pick && 'garden' in panel.pick) { if (s) { playPageFlip(); setPanel({ kind: 'bag', pick: s }); } }
                      else if (panel.pick && !holdsPick) { playPageFlip(); api.placeAt(panel.pick, i); }
                      else if (s) { playPageFlip(); setPanel({ kind: 'bag', pick: s }); }
                    }}
                    draggable={!!s}
                    onDragStart={e => startDrag(e, { slot: i })}
                    onDragOver={allowDrop}
                    onDrop={e => { e.preventDefault(); dropOnSlot(readDrag(e), i); }}
                    aria-label={`Slot ${i + 1}${s ? '' : ', empty'}`}
                    data-testid={`bag-slot-${i + 1}`}
                    className={`relative w-9 h-9 rounded-md bg-[#1c140c] flex items-center justify-center border-2 ${
                      holdsPick ? 'border-white' : panel.pick && !('garden' in panel.pick) ? 'border-[#f5c542] border-dashed' : 'border-[#8b5e2a]'
                    }`}
                  >
                    <span className="absolute top-0 left-0.5 text-[8px] font-bold text-[#e8d0a0]/80 leading-none">{i + 1}</span>
                    <SlotThing s={s} trash={trash} size="sm" />
                  </button>
                );
              })}
            </div>
            <span className="text-xs font-bold text-[#6b4820] tabular-nums" data-testid="bag-count">{api.bagUsed}/{api.bagSize}</span>
          </div>
          {/* 6 x 5; 10 x 3 on short (landscape phone) screens so the buttons below stay in view. */}
          <div
            className="grid grid-cols-6 [@media(max-height:500px)]:grid-cols-10 gap-1.5 bg-[#3a2610] border-2 border-[#8b5e2a] rounded-xl p-1.5"
            data-testid="bag-grid"
            onDragOver={allowDrop}
            onDrop={e => { e.preventDefault(); dropOnBag(readDrag(e)); }}
          >
            {Array.from({ length: Math.max(api.bagSize, squares.length) }, (_, i) => {
              const sq = squares[i];
              if (!sq) return <div key={`empty-${i}`} className="aspect-square rounded-md bg-[#1c140c]/70 border border-[#5a3d1e]" />;
              const garden = 'garden' in sq.pick ? sq.pick.garden : null;
              const slot = 'garden' in sq.pick ? -1 : slotOf(bar, sq.pick);
              const picked = samePick(panel.pick, sq.pick);
              const scrollId = 'item' in sq.pick ? trackedMonsterId(sq.pick.item) : null;
              const def = scrollId ? ALL_MONSTERS[scrollId] : undefined;
              const label = 'trash' in sq.pick ? `${TRASH_DEFS[sq.pick.trash].label} ×${sq.n}`
                : garden ? `${gardenItemLabel(garden)} ×${sq.n}` : `Tracking Scroll: ${def?.name}`;
              return (
                <button
                  key={sq.key}
                  onClick={() => { playPageFlip(); setPanel({ kind: 'bag', pick: sq.pick }); }}
                  draggable={!garden}
                  onDragStart={e => startDrag(e, { pick: sq.pick })}
                  aria-label={`${label}${slot >= 0 ? `, in slot ${slot + 1}` : ''}`}
                  data-testid={`bag-square-${i + 1}`}
                  className={`relative aspect-square rounded-md bg-[#1c140c] flex items-center justify-center border-2 ${
                    slot >= 0 ? 'border-[#f5c542] shadow-[0_0_6px_rgba(245,197,66,0.7)]' : 'border-[#8b5e2a]'
                  } ${picked ? 'ring-2 ring-white ring-offset-1 ring-offset-[#3a2610]' : ''}`}
                >
                  {'trash' in sq.pick
                    ? <TrashIcon type={sq.pick.trash} className="w-[80%] h-[80%]" />
                    : garden ? <GardenIcon itemKey={garden} className="w-[86%] h-[86%]" />
                    : def && <TrackingScrollIcon monster={def} className="w-[92%] h-[92%]" />}
                  {('trash' in sq.pick || garden) && (
                    <span className="absolute bottom-0 right-0.5 text-[10px] font-black text-white leading-none" style={{ textShadow: '0 1px 2px #000' }}>{sq.n}</span>
                  )}
                  {slot >= 0 && (
                    <span className="absolute -top-1 -left-1 w-3.5 h-3.5 rounded-full bg-[#f5c542] text-[#2a1505] text-[9px] font-black leading-[14px]">{slot + 1}</span>
                  )}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-[#6b4820] mt-1.5 mb-2">Gold border = in a slot. Tap an item, then tap a slot up top to put it there.</p>

          {panel.pick && 'garden' in panel.pick && (() => {
            const k = panel.pick.garden;
            const n = gardenBag?.[k] ?? 0;
            const g = parseGardenKey(k);
            if (n <= 0 || !g) return null;
            return (
              <div className="bg-white border-2 border-[#c9a87a] rounded-xl p-3 mb-2 flex items-center gap-3 text-left" data-testid="bag-detail">
                <GardenIcon itemKey={k} className="w-12 h-12 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-extrabold text-[#2a1505]">{gardenItemLabel(k)} ×{n}</p>
                  <p className="text-[11px] text-[#6b4820]">
                    {g.kind === 'veggie'
                      ? `Picked fresh! The Recycler buys veggies for ${VEGGIE_SELL_PRICE} gold each.`
                      : g.kind === 'wood'
                      ? `From a tree on the map. Save it for building, or the Recycler buys it for ${WOOD_SELL_PRICE} gold each.`
                      : g.kind === 'sapling'
                      ? 'A baby tree! Keep it safe. Soon you can plant it at your own Hideout.'
                      : 'Keep these safe. Soon you can plant them in your own garden!'}
                  </p>
                </div>
              </div>
            );
          })()}

          {panel.pick && !('garden' in panel.pick) && (() => {
            const pick = panel.pick;
            const slot = slotOf(bar, pick);
            const putIn = (
              <GameButton
                variant="quest"
                color={slot >= 0 ? '#57534e' : '#c9781a'}
                disabled={slot < 0 && barFull}
                onClick={() => {
                  playPageFlip();
                  if (slot >= 0) api.unequip(slot);
                  else api.equip(pick);
                }}
                className="flex-1"
                style={{ fontSize: 13 }}
              >
                {slot >= 0 ? 'Take out of slot' : barFull ? 'Slots full' : 'Put in slot'}
              </GameButton>
            );
            if ('trash' in pick) {
              const def = TRASH_DEFS[pick.trash];
              if (trash[pick.trash] <= 0) return null;
              return (
                <div className="bg-white border-2 border-[#c9a87a] rounded-xl p-3 mb-2" data-testid="bag-detail">
                  <p className="text-sm font-extrabold text-[#2a1505]">{def.label} ×{trash[pick.trash]}</p>
                  <p className="text-[11px] text-[#6b4820] mb-2">Bring {def.bundleSize} to the Recycler for 1 gold.</p>
                  <div className="flex gap-2">
                    {putIn}
                    <GameButton
                      variant="quest"
                      color="#b91c1c"
                      onClick={() => { api.throwAway(pick.trash); setPanel({ kind: 'bag', pick: null }); onMessage(`Threw away the ${def.label.toLowerCase()}.`); }}
                      className="flex-1"
                      style={{ fontSize: 13 }}
                    >
                      Throw away
                    </GameButton>
                  </div>
                </div>
              );
            }
            const monsterId = trackedMonsterId(pick.item);
            const def = monsterId ? ALL_MONSTERS[monsterId] : undefined;
            if (!def || !api.itemKeys.includes(pick.item)) return null;
            const p = progress[def.id] ?? 0;
            return (
              <div className="bg-white border-2 border-[#c9a87a] rounded-xl p-3 mb-2" data-testid="bag-detail">
                <p className="text-sm font-extrabold text-[#2a1505]">Tracking Scroll: {def.name}</p>
                <div className="flex items-center gap-2 my-1.5">
                  <Meter value={p} className="flex-1 !bg-[#e8d0a0] !border-[#c9a87a]" />
                  <span className="text-xs font-black text-[#2a1505] tabular-nums">{p}/{TRACKING_GOAL}</span>
                </div>
                <p className="text-[11px] text-[#6b4820] mb-2">Put it in a slot, then tap it on the map to start tracking.</p>
                <div className="flex gap-2">{putIn}</div>
              </div>
            );
          })()}

          {squares.length === 0 && (
            <p className="text-xs text-[#3a2610] mb-2">Your bag is empty. Pick up trash on the map, or buy a Tracking Scroll in the Shop!</p>
          )}
          <GameButton variant="quest" onClick={() => setPanel(null)} className="w-full" style={{ fontSize: 14 }}>Close</GameButton>
        </PanelFrame>
      )}

      {panel?.kind === 'scroll' && (() => {
        const def = ALL_MONSTERS[panel.monsterId];
        const p = progress[panel.monsterId] ?? 0;
        return (
          <PanelFrame onClose={() => setPanel(null)}>
            <MonsterImage monster={def} className="w-20 h-20 mx-auto" emojiClassName="text-5xl" />
            <h3 className="text-lg font-extrabold text-[#7a4a0f]">Tracking {def?.name}</h3>
            <div className="flex items-center gap-2 my-2">
              <Meter value={p} className="flex-1 !h-3 !bg-[#e8d0a0] !border-[#c9a87a]" />
              <span className="text-sm font-black text-[#2a1505] tabular-nums">{p}/{TRACKING_GOAL}</span>
            </div>
            <p className="text-xs text-[#3a2610] mb-3">Answer map questions right to fill the meter. Wrong answers don&apos;t take any away. When it&apos;s full, {def?.name} will come to you!</p>
            <div className="flex gap-2">
              {panel.slot >= 0 && (
                <GameButton variant="quest" color="#57534e" onClick={() => { api.unequip(panel.slot); setPanel(null); }} className="flex-1" style={{ fontSize: 13 }}>Put in bag</GameButton>
              )}
              <GameButton variant="quest" onClick={() => setPanel(null)} className="flex-1" style={{ fontSize: 13 }}>OK</GameButton>
            </div>
          </PanelFrame>
        );
      })()}

      {panel?.kind === 'trash' && (() => {
        const n = trash[panel.type];
        if (!(n > 0)) return null;
        const def = TRASH_DEFS[panel.type];
        return (
          <PanelFrame onClose={() => setPanel(null)}>
            <TrashIcon type={panel.type} className="w-16 h-16 mx-auto" />
            <h3 className="text-lg font-extrabold text-[#7a4a0f]">{def.label} ×{n}</h3>
            <p className="text-xs text-[#3a2610] mt-1 mb-3">
              Bring {def.bundleSize} to the Recycler for 1 gold. Throw it away if you need room in your bag.
            </p>
            <div className="flex gap-2">
              <GameButton variant="quest" color="#b91c1c" onClick={() => { api.throwAway(panel.type); setPanel(null); onMessage(`Threw away the ${def.label.toLowerCase()}.`); }} className="flex-1" style={{ fontSize: 13 }}>Throw away</GameButton>
              <GameButton variant="quest" onClick={() => setPanel(null)} className="flex-1" style={{ fontSize: 13 }}>Keep</GameButton>
            </div>
            <button className="mt-2 text-xs font-bold text-[#7a4a0f] underline" onClick={() => { api.unequip(panel.slot); setPanel(null); }}>
              Take out of slot
            </button>
          </PanelFrame>
        );
      })()}

      {panel?.kind === 'summon' && (() => {
        const def = ALL_MONSTERS[panel.monsterId];
        return (
          <PanelFrame onClose={() => setPanel(null)}>
            <MonsterImage monster={def} className="w-24 h-24 mx-auto" emojiClassName="text-6xl" />
            <h3 className="text-xl font-extrabold text-[#7a4a0f]">Summon {def?.name}?</h3>
            <p className="text-xs text-[#3a2610] mt-1 mb-3">It will appear right next to you. Win the battle to catch it! It won&apos;t run away.</p>
            <div className="flex gap-2">
              <GameButton variant="quest" color="#57534e" onClick={() => setPanel(null)} className="flex-1" style={{ fontSize: 13 }}>Not yet</GameButton>
              <GameButton
                variant="quest"
                color="#d97706"
                disabled={api.busy}
                data-testid="summon-confirm"
                onClick={async () => {
                  const res = await api.summon();
                  setPanel(null);
                  if (res.ok) onMessage(`${def?.name} appeared! Walk up to it to battle.`);
                  else if (res.reason === 'curio_waiting') onMessage('A curio is already nearby. Catch it first!');
                  else onMessage('That didn\'t work. Try again!');
                }}
                className="flex-1"
                style={{ fontSize: 13 }}
              >
                Summon!
              </GameButton>
            </div>
          </PanelFrame>
        );
      })()}
    </>
  );
}

// Latest-value ref for event listeners registered once.
function useLatest<T>(value: T) {
  const [ref] = useState(() => ({ current: value }));
  useEffect(() => { ref.current = value; });
  return ref;
}
