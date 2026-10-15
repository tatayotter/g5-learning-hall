// lib/itemBar.ts
// The 4 item slots on the Training Map (like a hotbar). A slot holds either
// an item from the player's bag (by inventory key, e.g. a Tracking Scroll;
// the item itself stays in player_inventory, the slot just carries it) or a
// stack of one kind of trash. Trash only lives in the slots, so a full bar
// means no more trash until the player trades some at the Recycler or throws
// some away. Saved on user_battle_state.item_bar, so it survives map changes,
// reloads and other devices.
import { TRASH_DEFS, TRASH_ORDER, type TrashType } from '@/lib/trashConfig';

export const ITEM_BAR_SIZE = 4;

export type ItemSlot = null | { item: string } | { trash: TrashType; n: number };
export type ItemBar = ItemSlot[];

export type TrashCounts = Record<TrashType, number>;

export const emptyItemBar = (): ItemBar => Array.from({ length: ITEM_BAR_SIZE }, () => null);

// Whatever the column holds (older rows, a bad write) becomes a clean bar.
export function normalizeItemBar(raw: unknown): ItemBar {
  const bar = emptyItemBar();
  if (!Array.isArray(raw)) return bar;
  for (let i = 0; i < ITEM_BAR_SIZE; i++) {
    const s = raw[i] as Record<string, unknown> | null | undefined;
    if (!s || typeof s !== 'object') continue;
    if (typeof s.item === 'string' && s.item) bar[i] = { item: s.item };
    else if (typeof s.trash === 'string' && s.trash in TRASH_DEFS && typeof s.n === 'number' && s.n > 0) {
      bar[i] = { trash: s.trash as TrashType, n: Math.floor(s.n) };
    }
  }
  return bar;
}

export const isTrashSlot = (s: ItemSlot): s is { trash: TrashType; n: number } => !!s && 'trash' in s;
export const isItemSlot = (s: ItemSlot): s is { item: string } => !!s && 'item' in s;

export function trashCounts(bar: ItemBar): TrashCounts {
  const counts = Object.fromEntries(TRASH_ORDER.map(t => [t, 0])) as TrashCounts;
  for (const s of bar) if (isTrashSlot(s)) counts[s.trash] += s.n;
  return counts;
}

// Adds one piece of trash: onto its own stack, else into the first empty
// slot. Null when there's no room.
export function addTrash(bar: ItemBar, type: TrashType): ItemBar | null {
  const stack = bar.findIndex(s => isTrashSlot(s) && s.trash === type);
  if (stack !== -1) {
    const s = bar[stack] as { trash: TrashType; n: number };
    return bar.map((x, i) => (i === stack ? { trash: type, n: s.n + 1 } : x));
  }
  const empty = bar.indexOf(null);
  if (empty === -1) return null;
  return bar.map((x, i) => (i === empty ? { trash: type, n: 1 } : x));
}

// Trades every full bundle for gold (1 gold per bundle, see TRASH_DEFS);
// leftovers stay, and an emptied stack frees its slot.
export function tradeTrash(bar: ItemBar): { bar: ItemBar; gold: number } {
  let gold = 0;
  const next = bar.map(s => {
    if (!isTrashSlot(s)) return s;
    const size = TRASH_DEFS[s.trash].bundleSize;
    const bundles = Math.floor(s.n / size);
    gold += bundles;
    const left = s.n - bundles * size;
    return left > 0 ? { trash: s.trash, n: left } : null;
  });
  return { bar: next, gold };
}

// Puts a bag item into the first empty slot (or `slot`). Null when full or
// already on the bar.
export function equipItem(bar: ItemBar, key: string, slot?: number): ItemBar | null {
  if (bar.some(s => isItemSlot(s) && s.item === key)) return null;
  const at = slot ?? bar.indexOf(null);
  if (at < 0 || at >= ITEM_BAR_SIZE || bar[at] !== null) return null;
  return bar.map((x, i) => (i === at ? { item: key } : x));
}

export const clearSlot = (bar: ItemBar, slot: number): ItemBar => bar.map((x, i) => (i === slot ? null : x));

// Slots whose bag item ran out (used up elsewhere) are freed.
export function dropMissingItems(bar: ItemBar, inventory: Partial<Record<string, number>>): ItemBar {
  return bar.map(s => (isItemSlot(s) && !((inventory[s.item] ?? 0) > 0) ? null : s));
}
