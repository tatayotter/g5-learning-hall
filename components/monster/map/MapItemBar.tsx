'use client';
// The 4 item slots on the Training Map (like a game hotbar) plus the bag
// button and the Tracking Scroll's catch meter. State and saving live in
// hooks/useItemBar.ts; this is only the look and the taps.
//
// The slots are map chrome (dark, over game art — see docs/STYLE_GUIDE.md's
// "deliberately still dark" list). The panels they open are parchment
// content panels.
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ALL_MONSTERS, type MonsterDef } from '@/lib/monsterConfig';
import { TRASH_DEFS } from '@/lib/trashConfig';
import { isItemSlot, isTrashSlot, ITEM_BAR_SIZE } from '@/lib/itemBar';
import { TRACKING_GOAL, trackedMonsterId } from '@/lib/curioTracking';
import type { InventoryMap } from '@/lib/inventory';
import type { ItemBarApi } from '@/hooks/useItemBar';
import { MonsterImage } from '@/components/battle/shared';
import GameButton from '@/components/GameButton';
import TrackingScrollIcon from '@/components/monster/TrackingScrollIcon';
import { playPageFlip } from '@/lib/sounds';

interface MapItemBarProps {
  api: ItemBarApi;
  inventory: InventoryMap;
  offline: boolean;
  // Short note shown beside the slots (full slots, meter progress).
  message: string | null;
  onMessage: (text: string) => void;
}

type Panel =
  | { kind: 'bag' }
  | { kind: 'scroll'; slot: number; monsterId: string }
  | { kind: 'trash'; slot: number }
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
function PanelFrame({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return createPortal(
    <div className="fixed inset-0 z-[100] bg-[#0a0807]/70 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="relative w-full max-w-xs bg-[#f0ddb8] border-2 border-[#8b5e2a] rounded-2xl p-4 text-center shadow-[0_6px_0_#8b5e2a] battle-panel-in"
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

export default function MapItemBar({ api, inventory, offline, message, onMessage }: MapItemBarProps) {
  const [panel, setPanel] = useState<Panel | null>(null);
  const { bar, activeTracking, progress } = api;

  const activeDef: MonsterDef | undefined = activeTracking ? ALL_MONSTERS[activeTracking] : undefined;
  const activeProgress = activeTracking ? progress[activeTracking] ?? 0 : 0;
  const activeFull = activeProgress >= TRACKING_GOAL;

  const tapSlot = async (i: number) => {
    playPageFlip();
    const s = bar[i];
    if (!s) { setPanel({ kind: 'bag' }); return; }
    if (isTrashSlot(s)) { setPanel({ kind: 'trash', slot: i }); return; }
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

  // Every Tracking Scroll in the bag, and which slot (if any) holds it.
  const scrolls = Object.entries(inventory)
    .filter(([key, qty]) => (qty ?? 0) > 0 && trackedMonsterId(key))
    .map(([key, qty]) => ({ key, qty: qty ?? 0, monsterId: trackedMonsterId(key)!, slot: bar.findIndex(s => isItemSlot(s) && s.item === key) }));
  const barFull = !bar.includes(null);

  return (
    <>
      <div className="relative flex flex-col items-end gap-1 pointer-events-auto select-none" data-testid="map-item-bar">
        {message && (
          <div
            className="absolute right-0 bottom-full mb-2 w-56 bg-[#0a0807]/90 border border-[#d4a017] text-[#fde68a] text-xs font-bold px-3 py-1.5 rounded-xl shadow-lg text-center pointer-events-none"
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
        {/* A column on the right edge; a row on short (landscape phone) screens. */}
        <div className="flex flex-col [@media(max-height:500px)]:flex-row items-center gap-1.5 bg-[#0a0807]/60 rounded-xl p-1.5 border border-[#d4a017]/50">
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
                aria-label={s ? (isTrashSlot(s) ? `${TRASH_DEFS[s.trash].label} ×${s.n}` : `Tracking Scroll: ${def?.name}`) : `Empty slot ${i + 1}`}
                data-testid={`item-slot-${i + 1}`}
                className={`relative w-12 h-12 rounded-lg border-2 flex items-center justify-center bg-[#1c140c]/85 transition-transform active:scale-95 ${
                  isActive ? 'border-[#fde68a] shadow-[0_0_10px_2px_rgba(253,230,138,0.7)]' : 'border-[#8b5e2a]'
                } ${isActive && p >= TRACKING_GOAL ? 'animate-pulse' : ''}`}
              >
                <span className="absolute top-0 left-0.5 text-[9px] font-bold text-[#e8d0a0]/80 leading-none">{i + 1}</span>
                {isTrashSlot(s) && (
                  <>
                    <img src={`/trash/${s.trash}.png`} alt="" className="w-8 h-8 object-contain" />
                    <span className="absolute bottom-0 right-0.5 text-[11px] font-black text-white leading-none" style={{ textShadow: '0 1px 2px #000' }}>{s.n}</span>
                  </>
                )}
                {def && (
                  <>
                    <TrackingScrollIcon monster={def} className="w-11 h-11" />
                    {p > 0 && <Meter value={p} className="absolute bottom-0.5 left-1 right-4 !h-1" />}
                  </>
                )}
              </button>
            );
          })}
          <button
            onClick={() => { playPageFlip(); setPanel({ kind: 'bag' }); }}
            aria-label="Open bag"
            data-testid="item-bag"
            className="w-12 h-9 [@media(max-height:500px)]:w-9 [@media(max-height:500px)]:h-12 rounded-lg border-2 border-[#8b5e2a] bg-[#3a2610]/90 flex items-center justify-center text-xl active:scale-95"
          >
            🎒
          </button>
        </div>
      </div>

      {panel?.kind === 'bag' && (
        <PanelFrame onClose={() => setPanel(null)}>
          <h3 className="text-lg font-extrabold text-[#7a4a0f] mb-1">Your Bag</h3>
          <p className="text-xs text-[#6b4820] mb-3">Put items in your 4 slots to use them on the map.</p>
          {scrolls.length === 0 ? (
            <p className="text-sm text-[#3a2610] mb-3">No Tracking Scrolls yet. Buy one in the Shop or the Compendium!</p>
          ) : (
            <div className="space-y-2 mb-3 max-h-64 overflow-y-auto text-left">
              {scrolls.map(sc => {
                const def = ALL_MONSTERS[sc.monsterId];
                const p = progress[sc.monsterId] ?? 0;
                return (
                  <div key={sc.key} className="flex items-center gap-2 bg-white border-2 border-[#c9a87a] rounded-xl p-2">
                    {def && <TrackingScrollIcon monster={def} className="w-11 h-11" />}
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-bold text-[#2a1505] leading-tight truncate">{def?.name}{sc.qty > 1 ? ` ×${sc.qty}` : ''}</p>
                      <p className="text-[11px] text-[#6b4820]">Meter {p}/{TRACKING_GOAL}</p>
                    </div>
                    {sc.slot >= 0 ? (
                      <button
                        className="text-[11px] font-bold text-[#7a4a0f] bg-[#f0ddb8] border border-[#c9a87a] rounded-lg px-2 py-1"
                        onClick={() => { playPageFlip(); api.unequip(sc.slot); }}
                      >
                        Take out
                      </button>
                    ) : (
                      <button
                        className="text-[11px] font-bold text-white bg-[#c9781a] border border-[#8b5e2a] rounded-lg px-2 py-1 disabled:opacity-40"
                        disabled={barFull}
                        onClick={() => { playPageFlip(); api.equip(sc.key); }}
                      >
                        {barFull ? 'Slots full' : 'Put in slot'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
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
        const s = bar[panel.slot];
        if (!isTrashSlot(s)) return null;
        const def = TRASH_DEFS[s.trash];
        return (
          <PanelFrame onClose={() => setPanel(null)}>
            <img src={`/trash/${s.trash}.png`} alt="" className="w-16 h-16 object-contain mx-auto" />
            <h3 className="text-lg font-extrabold text-[#7a4a0f]">{def.label} ×{s.n}</h3>
            <p className="text-xs text-[#3a2610] mt-1 mb-3">
              Bring {def.bundleSize} to the Recycler for 1 gold. Throw it away if you need the slot.
            </p>
            <div className="flex gap-2">
              <GameButton variant="quest" color="#b91c1c" onClick={() => { api.throwAway(panel.slot); setPanel(null); onMessage(`Threw away the ${def.label.toLowerCase()}.`); }} className="flex-1" style={{ fontSize: 13 }}>Throw away</GameButton>
              <GameButton variant="quest" onClick={() => setPanel(null)} className="flex-1" style={{ fontSize: 13 }}>Keep</GameButton>
            </div>
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
