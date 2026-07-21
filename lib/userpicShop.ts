export interface UserpicItem {
  key: string;
  file: string;
  name: string;
  cost: number;
}

// One-time cosmetic unlocks, sold through the Curio Arena Shop and tracked
// as qty-1 rows in the same player_inventory table as consumables/scrolls.
export const USERPIC_CATALOG: UserpicItem[] = [
  { key: 'userpic_ssb1', file: 'ssb1.png', name: 'Trainer Boy I',    cost: 150 },
  { key: 'userpic_ssb2', file: 'ssb2.png', name: 'Trainer Boy II',   cost: 150 },
  { key: 'userpic_ssb3', file: 'ssb3.png', name: 'Trainer Boy III',  cost: 150 },
  { key: 'userpic_ssb4', file: 'ssb4.png', name: 'Trainer Boy IV',   cost: 150 },
  { key: 'userpic_ssb5', file: 'ssb5.png', name: 'Trainer Boy V',    cost: 150 },
  { key: 'userpic_ssb6', file: 'ssb6.png', name: 'Trainer Boy VI',   cost: 150 },
  { key: 'userpic_ssg1', file: 'ssg1.png', name: 'Trainer Girl I',   cost: 150 },
  { key: 'userpic_ssg2', file: 'ssg2.png', name: 'Trainer Girl II',  cost: 150 },
  { key: 'userpic_ssg3', file: 'ssg3.png', name: 'Trainer Girl III', cost: 150 },
  { key: 'userpic_ssg4', file: 'ssg4.png', name: 'Trainer Girl IV',  cost: 150 },
  { key: 'userpic_ssg5', file: 'ssg5.png', name: 'Trainer Girl V',   cost: 150 },
  { key: 'userpic_ssg6', file: 'ssg6.png', name: 'Trainer Girl VI',  cost: 150 },
  { key: 'userpic_bsp1', file: 'bsp1.png', name: 'Rare Boy Portrait I',   cost: 300 },
  { key: 'userpic_bsp2', file: 'bsp2.png', name: 'Rare Boy Portrait II',  cost: 300 },
  { key: 'userpic_gsp1', file: 'gsp1.png', name: 'Rare Girl Portrait I',  cost: 300 },
  { key: 'userpic_gsp2', file: 'gsp2.png', name: 'Rare Girl Portrait II', cost: 300 },
  { key: 'userpic_premium_boy2',  file: 'premium_boy2.png',  name: 'Legendary Boy Portrait',  cost: 500 },
  { key: 'userpic_premium_girl1', file: 'premium_girl1.png', name: 'Legendary Girl Portrait', cost: 500 },
];

export function userpicPath(file: string): string {
  return `/userpics/userpics_premium/${file}`;
}
