import { QualityTier } from './curioQuality';

export interface TomeItem {
  key: string;
  name: string;
  icon: string;
  desc: string;
  cost: number;
  // The curio quality tier this tome boosts a Tutor roll FROM (see
  // tutor_curio RPC — consumed atomically with the roll it boosts).
  boostsTier: QualityTier;
}

// Single-use consumables that boost one Tutor attempt's odds. Stack like
// potions/scrolls in player_inventory (repeatable purchase, unlike the
// one-time cosmetic unlocks in lib/themeShop.ts). Icon colors match the
// quality-glow palette in app/globals.css — each tome is colored like the
// tier it helps you reach, not the tier it boosts.
export const TOME_CATALOG: TomeItem[] = [
  {
    key: 'tome_novice',
    name: 'Tome of Novice Knowledge',
    icon: '/items/green_ribbon_tome_200px.png',
    desc: "Boosts a Normal-quality curio's next Tutor roll (used automatically on that attempt).",
    cost: 40,
    boostsTier: 'normal',
  },
  {
    key: 'tome_adept',
    name: 'Tome of Adept Knowledge',
    icon: '/items/cyan_ribbon_book_200px.png',
    desc: "Boosts a Good-quality curio's next Tutor roll.",
    cost: 90,
    boostsTier: 'good',
  },
  {
    key: 'tome_master',
    name: 'Tome of Master Knowledge',
    icon: '/items/pixel_book_orange_ribbon_200px.png',
    desc: "Boosts an Outstanding-quality curio's next Tutor roll.",
    cost: 180,
    boostsTier: 'outstanding',
  },
];

export function getTomeForTier(tier: QualityTier): TomeItem | undefined {
  return TOME_CATALOG.find(t => t.boostsTier === tier);
}
