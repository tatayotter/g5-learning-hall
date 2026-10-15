// lib/itemBar.ts
// The Training Map's bag (up to BAG_SIZE squares, like an MMORPG bag) and
// its 4 item slots (like a game hotbar).
//
// The bag holds the player's Tracking Scrolls (from player_inventory) and the
// trash they pick up (counts per kind, saved on user_battle_state.bag_trash).
// A kind of trash fills one square per TRASH_STACK pieces. A full bag means no
// more trash until the player trades some at the Recycler or throws some away.
//
// A slot points at something in the bag: {item: <inventory key>} or
// {trash: <kind>}; it never holds its own copy. Saved on
// user_battle_state.item_bar, so slots and bag survive map changes, reloads
// and other devices.
import { TRASH_DEFS, TRASH_ORDER, type TrashType } from '@/lib/trashConfig';

export const ITEM_BAR_SIZE = 4;
export const BAG_SIZE = 30;
// Pieces of one kind of trash per bag square.
export const TRASH_STACK = 20;

export type ItemSlot = null | { item: string } | { trash: TrashType };
export type ItemBar = ItemSlot[];

export type TrashCounts = Record<TrashType, number>;

export const emptyItemBar = (): ItemBar => Array.from({ length: ITEM_BAR_SIZE }, () => null);
export const emptyTrash = (): TrashCounts => Object.fromEntries(TRASH_ORDER.map(t => [t, 0])) as TrashCounts;

const isTrashType = (v: unknown): v is TrashType => typeof v === 'string' && v in TRASH_DEFS;

// Whatever the columns hold (a bad write, the older slot-only format where a
// slot carried {trash, n}) becomes a clean bar and bag. Older {trash, n}
// counts move into the bag.
export function normalizeItemBar(rawBar: unknown, rawTrash?: unknown): { bar: ItemBar; trash: TrashCounts } {
  const bar = emptyItemBar();
  const trash = emptyTrash();
  if (rawTrash && typeof rawTrash === 'object') {
    for (const [k, v] of Object.entries(rawTrash as Record<string, unknown>)) {
      if (isTrashType(k) && typeof v === 'number' && v > 0) trash[k] = Math.floor(v);
    }
  }
  if (Array.isArray(rawBar)) {
    for (let i = 0; i < ITEM_BAR_SIZE; i++) {
      const s = rawBar[i] as Record<string, unknown> | null | undefined;
      if (!s || typeof s !== 'object') continue;
      if (typeof s.item === 'string' && s.item) bar[i] = { item: s.item };
      else if (isTrashType(s.trash)) {
        if (typeof s.n === 'number' && s.n > 0) trash[s.trash] += Math.floor(s.n);
        if (!bar.some(x => isTrashSlot(x) && x.trash === s.trash)) bar[i] = { trash: s.trash };
      }
    }
  }
  // A trash slot with no trash of that kind left is empty.
  return { bar: bar.map(s => (isTrashSlot(s) && trash[s.trash] <= 0 ? null : s)), trash };
}

export const isTrashSlot = (s: ItemSlot): s is { trash: TrashType } => !!s && 'trash' in s;
export const isItemSlot = (s: ItemSlot): s is { item: string } => !!s && 'item' in s;

export const trashSquares = (n: number) => Math.ceil(n / TRASH_STACK);

// Squares in use: one per bag item key plus the trash stacks.
export function bagSquaresUsed(itemKeys: string[], trash: TrashCounts): number {
  return itemKeys.length + TRASH_ORDER.reduce((sum, t) => sum + trashSquares(trash[t]), 0);
}

// One more piece of trash, or null when it would need a square the bag doesn't have.
export function addTrash(trash: TrashCounts, type: TrashType, itemKeys: string[]): TrashCounts | null {
  const next = { ...trash, [type]: trash[type] + 1 };
  return bagSquaresUsed(itemKeys, next) > BAG_SIZE ? null : next;
}

// Trades every full bundle for gold (1 gold per bundle, see TRASH_DEFS);
// leftovers stay.
export function tradeTrash(trash: TrashCounts): { trash: TrashCounts; gold: number } {
  let gold = 0;
  const next = emptyTrash();
  for (const t of TRASH_ORDER) {
    const size = TRASH_DEFS[t].bundleSize;
    const bundles = Math.floor(trash[t] / size);
    gold += bundles;
    next[t] = trash[t] - bundles * size;
  }
  return { trash: next, gold };
}

const sameThing = (a: ItemSlot, b: Exclude<ItemSlot, null>) =>
  !!a && (isItemSlot(a) ? isItemSlot(b) && a.item === b.item : isTrashSlot(b) && a.trash === b.trash);

export const slotOf = (bar: ItemBar, thing: Exclude<ItemSlot, null>) => bar.findIndex(s => sameThing(s, thing));

// Puts a bag item or kind of trash into the first empty slot. Null when the
// slots are full or it's already in one.
export function equip(bar: ItemBar, thing: Exclude<ItemSlot, null>): ItemBar | null {
  if (slotOf(bar, thing) !== -1) return null;
  const at = bar.indexOf(null);
  if (at === -1) return null;
  return bar.map((x, i) => (i === at ? thing : x));
}

export const clearSlot = (bar: ItemBar, slot: number): ItemBar => bar.map((x, i) => (i === slot ? null : x));

// Slots whose item ran out (used up elsewhere) or whose trash is gone are freed.
export function dropMissing(bar: ItemBar, inventory: Partial<Record<string, number>>, trash: TrashCounts): ItemBar {
  return bar.map(s => {
    if (isItemSlot(s)) return (inventory[s.item] ?? 0) > 0 ? s : null;
    if (isTrashSlot(s)) return trash[s.trash] > 0 ? s : null;
    return s;
  });
}
