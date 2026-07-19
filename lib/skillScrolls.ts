// lib/skillScrolls.ts
// Vault catalog for the skill loadout economy sink. Scroll items share the
// same player_inventory table/keyspace as the consumables in lib/inventory.ts
// (see InventoryMap there) but are sold in their own Vault section and
// consumed only via the learn_monster_skill/unlearn_monster_skill RPCs
// (components/MonsterGuild.tsx's Compendium panel), never in battle.
import { SKILLS, Skill } from './monsterConfig';
import { supabase } from './supabase';

export interface ScrollItem {
  key: string;
  name: string;
  icon: string;
  desc: string;
  cost: number;
  tier: 1 | 2 | 3 | null; // null only for the generic Unlearn Scroll
  category: 'unlearn' | 'base' | 'alt' | 'universal';
  element: Skill['element'];
  skillId?: string; // omitted for the Unlearn Scroll
}

const TIER_COST: Record<'base' | 'alt' | 'universal', Record<1 | 2 | 3, number>> = {
  base:      { 1: 75,  2: 150, 3: 250 },
  alt:       { 1: 150, 2: 300, 3: 500 },
  universal: { 1: 150, 2: 300, 3: 500 },
};

const ELEMENT_SCROLL_ICON: Partial<Record<NonNullable<Skill['element']>, string>> = {
  fire: '/items/fire_scroll_100.webp', water: '/items/leaf_scroll_100.webp', leaf: '/items/water_scroll_100.webp',
  storm: '/items/storm_scroll_100.webp', shadow: '/items/shadow_scroll_100.webp', light: '/items/light_scroll_100.webp',
};

function scrollForSkill(skill: Skill): ScrollItem {
  const category = skill.category ?? 'base';
  return {
    key: `scroll_${skill.id}`,
    name: `${skill.name} Scroll`,
    icon: skill.element ? (ELEMENT_SCROLL_ICON[skill.element] ?? '/items/physical_scroll_100.webp') : '/items/physical_scroll_100.webp',
    desc: `Teach ${skill.name} to a monster: ${skill.description}`,
    cost: TIER_COST[category][skill.tier],
    tier: skill.tier,
    category,
    element: skill.element,
    skillId: skill.id,
  };
}

export const SCROLL_CATALOG: ScrollItem[] = [
  {
    key: 'unlearn_scroll',
    name: 'Unlearn Scroll',
    icon: '/items/unlearn_scroll_100.webp',
    desc: "Empties one of a monster's skill slots so a new skill can be taught into it.",
    cost: 100,
    tier: null,
    category: 'unlearn',
    element: null,
  },
  ...Object.values(SKILLS).map(scrollForSkill),
];

// slotIndex is 1-3 (matches the 1-based Postgres array index used by both
// RPCs against user_monsters.equipped_skills). Both return false (no scroll
// spent) if the precondition fails — wrong slot state or no scroll owned —
// rather than throwing, mirroring lib/inventory.ts's useInventoryItem.
export async function unlearnMonsterSkill(userId: string, monsterRowId: string, slotIndex: number): Promise<boolean> {
  const { data, error } = await supabase.rpc('unlearn_monster_skill', {
    p_user_id: userId,
    p_monster_row_id: monsterRowId,
    p_slot_index: slotIndex,
  });
  if (error) {
    console.error('unlearn_monster_skill error:', error);
    return false;
  }
  return !!data;
}

export async function learnMonsterSkill(userId: string, monsterRowId: string, slotIndex: number, skillId: string, scrollItemKey: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('learn_monster_skill', {
    p_user_id: userId,
    p_monster_row_id: monsterRowId,
    p_slot_index: slotIndex,
    p_skill_id: skillId,
    p_scroll_item_key: scrollItemKey,
  });
  if (error) {
    console.error('learn_monster_skill error:', error);
    return false;
  }
  return !!data;
}
