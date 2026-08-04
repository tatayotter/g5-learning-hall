export interface ThemeItem {
  key: string;
  name: string;
  // CSS class applied to <html> when equipped; null for the free default
  // (default has no class — it's the app's base styling).
  cssClass: string | null;
  cost: number;
  // 3-4 representative hex colors shown as a swatch preview in the shop/picker.
  swatch: string[];
  description: string;
}

// One-time cosmetic unlocks, sold through the Curio Arena Shop and tracked
// as qty-1 rows in the same player_inventory table as consumables/scrolls/
// userpics (see lib/userpicShop.ts). theme_default is never bought/owned as
// a row — every account has it for free by construction.
export const THEME_CATALOG: ThemeItem[] = [
  {
    key: 'theme_default',
    name: 'Dungeon (Default)',
    cssClass: null,
    cost: 0,
    swatch: ['#1c1611', '#0a0807', '#7a4a0f', '#c9781a'],
    description: 'The original dark dungeon look. Free for everyone.',
  },
  {
    key: 'theme_tala',
    name: "Tala's Bloom",
    cssClass: 'theme-tala',
    cost: 600,
    swatch: ['#fdf0f7', '#f9ddf0', '#ec4899', '#be185d'],
    description: 'A soft pink princess-and-stars theme.',
  },
  {
    key: 'theme_ember',
    name: 'Emberheart',
    cssClass: 'theme-ember',
    cost: 600,
    swatch: ['#1a0f0a', '#3a180f', '#ff6b35', '#c1440e'],
    description: 'Molten fire-element theme — charcoal and glowing embers.',
  },
  {
    key: 'theme_verdant',
    name: 'Verdant Grove',
    cssClass: 'theme-verdant',
    cost: 600,
    swatch: ['#0f1a12', '#1b4332', '#95d5b2', '#40916c'],
    description: 'A leaf-element forest theme — deep green and moss gold.',
  },
  {
    key: 'theme_umbra',
    name: 'Umbra Veil',
    cssClass: 'theme-umbra',
    cost: 900,
    swatch: ['#0d0818', '#1a1030', '#a78bfa', '#c4b5fd'],
    description: 'A shadow-element cosmic theme — void purple and starlight.',
  },
];

export const THEME_CLASSES = THEME_CATALOG
  .map(t => t.cssClass)
  .filter((c): c is string => c !== null);

export function getThemeItem(key: string): ThemeItem | undefined {
  return THEME_CATALOG.find(t => t.key === key);
}
