import { supabase } from './supabase';
import { GRADUATION_SCROLL_COST } from './monsterConfig';

export type ItemKey =
  | 'health_potion'
  | 'health_potion_medium'
  | 'health_potion_large'
  | 'attack_scroll'
  | 'iron_shield'
  | 'blessed_charm'
  | 'antidote'
  | 'poison_fang'
  | 'revive_stone'
  | 'graduation_scroll';

export interface ShopItem {
  key: ItemKey;
  name: string;
  icon: string;
  desc: string;
  cost: number;
  effect: string;
}

export const SHOP_CATALOG: ShopItem[] = [
  { key: 'health_potion',        name: 'Health Potion',        icon: '/items/health_potion_100.webp',   cost: 20,  desc: 'Restore 30 HP to your monster mid-battle.',   effect: 'heal_30'  },
  { key: 'health_potion_medium', name: 'Medium Health Potion', icon: '/items/health_potion_m_100.webp', cost: 40,  desc: 'Restore 60 HP to your monster mid-battle.',   effect: 'heal_60'  },
  { key: 'health_potion_large',  name: 'Large Health Potion',  icon: '/items/health_potion_l_100.webp', cost: 80,  desc: 'Restore 120 HP to your monster mid-battle.',  effect: 'heal_120' },
  { key: 'attack_scroll',  name: 'Attack Scroll',  icon: '/items/attack_scroll_100.webp', cost: 30,  desc: 'Boost your monster\'s attack by 1.5x for one turn.', effect: 'atk_boost_1t'  },
  { key: 'iron_shield',    name: 'Iron Shield',    icon: '/items/iron_shield_100.webp', cost: 30,  desc: 'Reduce incoming damage by half for one turn.',        effect: 'def_boost_1t'  },
  { key: 'blessed_charm',  name: 'Blessed Charm',  icon: '/items/blessed_charm_100.webp', cost: 50,  desc: 'Apply the Blessed status to your monster.',           effect: 'apply_blessed' },
  { key: 'antidote',       name: 'Antidote',       icon: '/items/antidote_100.webp', cost: 25,  desc: 'Cure Burn, Paralyze, or Curse from your monster.',    effect: 'cure_status'   },
  { key: 'poison_fang',    name: 'Poison Fang',    icon: '/items/poison_fang_100.webp', cost: 40,  desc: 'Inflict Curse on the enemy monster.',                 effect: 'inflict_curse' },
  { key: 'revive_stone',   name: 'Revive Stone',   icon: '/items/revive_stone_100.webp', cost: 80,  desc: 'Revive your monster once from 0 HP.',                effect: 'revive'        },
  { key: 'graduation_scroll', name: 'Graduation Scroll', icon: '/items/graduation_scroll.svg', cost: GRADUATION_SCROLL_COST, desc: 'Use in the Compendium to graduate an eligible team monster into its next form once it\'s reached the required level.', effect: 'graduate_monster' },
];

// Items given free daily to family players
export const DAILY_FAMILY_ITEMS: { key: ItemKey; qty: number }[] = [
  { key: 'health_potion', qty: 3 },
  { key: 'iron_shield',   qty: 1 },
];

// Keyed on plain strings (not just ItemKey) since scroll ids from
// lib/skillScrolls.ts share this same player_inventory table/map.
export type InventoryMap = Partial<Record<string, number>>;

export async function fetchInventory(userId: string): Promise<InventoryMap> {
  const { data } = await supabase
    .from('player_inventory')
    .select('item_key, quantity')
    .eq('app_user_id', userId);

  const map: InventoryMap = {};
  for (const row of data || []) {
    map[row.item_key] = row.quantity;
  }
  return map;
}

export async function addInventoryItem(userId: string, key: string, qty: number) {
  await supabase.rpc('upsert_inventory', {
    p_user_id: userId,
    p_item_key: key,
    p_quantity_delta: qty,
  });
}

// Atomic gold-debit + item-grant in one DB transaction, so a shop purchase
// can't be split into "call upsert_inventory directly, skip paying" — the
// item is only granted if the gold was actually there and got deducted.
// Cost is looked up server-side from shop_items, not trusted from the caller.
export async function spendGoldAndGrantItem(
  userId: string, weekStartingDate: string, key: string, qty: number = 1
): Promise<{ gold: number; xp: number; level: number } | null> {
  const { data, error } = await supabase.rpc('spend_gold_and_grant_item', {
    p_user_id: userId,
    p_week_starting_date: weekStartingDate,
    p_item_key: key,
    p_quantity: qty,
  });
  if (error) {
    console.error('spend_gold_and_grant_item error:', error);
    return null;
  }
  return data;
}

export async function consumeInventoryItem(userId: string, key: string) {
  await supabase.rpc('upsert_inventory', {
    p_user_id: userId,
    p_item_key: key,
    p_quantity_delta: -1,
  });
}

export async function claimDailyItems(userId: string): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0];

  // Atomic claim-or-noop via the health_potion row's last_daily_claim as a
  // lock — a plain read-then-write here would let two overlapping calls
  // (e.g. the shop component mounting twice in quick succession) both see
  // "not claimed yet" and both grant the daily bundle.
  const { data: claimed } = await supabase.rpc('try_claim_daily_items', {
    p_user_id: userId,
    p_today: today,
  });
  if (!claimed) return false;

  for (const { key, qty } of DAILY_FAMILY_ITEMS) {
    await supabase.rpc('upsert_inventory', {
      p_user_id: userId,
      p_item_key: key,
      p_quantity_delta: qty,
    });
  }
  return true;
}

export async function useInventoryItem(userId: string, key: string): Promise<boolean> {
  // Atomic conditional decrement — a fetch-then-update here would let two
  // overlapping calls (e.g. the same account open in two tabs) both read
  // quantity=1, both pass the >0 check, and both apply the item's effect
  // even though the row can only ever be decremented once.
  const { data, error } = await supabase.rpc('consume_inventory_item', {
    p_user_id: userId,
    p_item_key: key,
  });
  if (error) {
    console.error('consume_inventory_item error:', error);
    return false;
  }
  return !!data;
}