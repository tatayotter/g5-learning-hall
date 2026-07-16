import { supabase } from './supabase';

export type ItemKey =
  | 'health_potion'
  | 'attack_scroll'
  | 'iron_shield'
  | 'blessed_charm'
  | 'antidote'
  | 'poison_fang'
  | 'revive_stone';

export interface ShopItem {
  key: ItemKey;
  name: string;
  icon: string;
  desc: string;
  cost: number;
  effect: string;
}

export const SHOP_CATALOG: ShopItem[] = [
  { key: 'health_potion',  name: 'Health Potion',  icon: '🧪', cost: 20,  desc: 'Restore 30 HP to your monster mid-battle.',          effect: 'heal_30'        },
  { key: 'attack_scroll',  name: 'Attack Scroll',  icon: '⚔️', cost: 30,  desc: 'Boost your monster\'s attack by 1.5x for one turn.', effect: 'atk_boost_1t'  },
  { key: 'iron_shield',    name: 'Iron Shield',    icon: '🛡️', cost: 30,  desc: 'Reduce incoming damage by half for one turn.',        effect: 'def_boost_1t'  },
  { key: 'blessed_charm',  name: 'Blessed Charm',  icon: '✨', cost: 50,  desc: 'Apply the Blessed status to your monster.',           effect: 'apply_blessed' },
  { key: 'antidote',       name: 'Antidote',       icon: '💊', cost: 25,  desc: 'Cure Burn, Paralyze, or Curse from your monster.',    effect: 'cure_status'   },
  { key: 'poison_fang',    name: 'Poison Fang',    icon: '💀', cost: 40,  desc: 'Inflict Curse on the enemy monster.',                 effect: 'inflict_curse' },
  { key: 'revive_stone',   name: 'Revive Stone',   icon: '🔄', cost: 80,  desc: 'Revive your monster once from 0 HP.',                effect: 'revive'        },
];

// Items given free daily to family players
export const DAILY_FAMILY_ITEMS: { key: ItemKey; qty: number }[] = [
  { key: 'health_potion', qty: 3 },
  { key: 'iron_shield',   qty: 1 },
];

export type InventoryMap = Partial<Record<ItemKey, number>>;

export async function fetchInventory(userId: string): Promise<InventoryMap> {
  const { data } = await supabase
    .from('player_inventory')
    .select('item_key, quantity')
    .eq('app_user_id', userId);
  
  const map: InventoryMap = {};
  for (const row of data || []) {
    map[row.item_key as ItemKey] = row.quantity;
  }
  return map;
}

export async function addInventoryItem(userId: string, key: ItemKey, qty: number) {
  await supabase.rpc('upsert_inventory', {
    p_user_id: userId,
    p_item_key: key,
    p_quantity_delta: qty,
  });
}

export async function consumeInventoryItem(userId: string, key: ItemKey) {
  await supabase.rpc('upsert_inventory', {
    p_user_id: userId,
    p_item_key: key,
    p_quantity_delta: -1,
  });
}

export async function claimDailyItems(userId: string): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0];
  
  // Check if already claimed today (check health_potion as sentinel)
  const { data } = await supabase
    .from('player_inventory')
    .select('last_daily_claim')
    .eq('app_user_id', userId)
    .eq('item_key', 'health_potion')
    .single();

  if (data?.last_daily_claim === today) return false; // already claimed

  // Grant daily items
  for (const { key, qty } of DAILY_FAMILY_ITEMS) {
    await supabase.rpc('upsert_inventory', {
      p_user_id: userId,
      p_item_key: key,
      p_quantity_delta: qty,
    });
    // Update last_daily_claim
    await supabase
      .from('player_inventory')
      .update({ last_daily_claim: today })
      .eq('app_user_id', userId)
      .eq('item_key', key);
  }
  return true;
}

export async function useInventoryItem(userId: string, key: string) {
  // 1. Fetch current quantity using the correct table and column
  const { data: inventory, error: fetchError } = await supabase
    .from('player_inventory') // Matches your table
    .select('quantity')
    .eq('app_user_id', userId) // Matches your column
    .eq('item_key', key)
    .maybeSingle();

  if (fetchError) {
    console.error("Fetch Error:", fetchError);
    return false;
  }

  if (inventory && inventory.quantity > 0) {
    // 2. Update the quantity
    const { error: updateError } = await supabase
      .from('player_inventory')
      .update({ quantity: inventory.quantity - 1 })
      .eq('app_user_id', userId)
      .eq('item_key', key);
    
    if (updateError) {
      console.error("Update Error:", updateError);
      return false;
    }
    return true; // Success!
  }
  
  console.log("No inventory found or quantity is 0");
  return false;
}