export interface UserpicItem {
  key: string;
  file: string;
  name: string;
  cost: number;
}

// One-time cosmetic unlocks, sold through the Curio Arena Shop and tracked
// as qty-1 rows in the same player_inventory table as consumables/scrolls.
export const USERPIC_CATALOG: UserpicItem[] = [
  { key: 'userpic_ssb1', file: 'ssb1.png', name: 'Trainer Boy I',    cost: 500 },
  { key: 'userpic_ssb2', file: 'ssb2.png', name: 'Trainer Boy II',   cost: 500 },
  // ssb3 is the default boy avatar — not purchaseable, already owned by all boys
  { key: 'userpic_ssb4', file: 'ssb4.png', name: 'Trainer Boy IV',   cost: 500 },
  { key: 'userpic_ssb5', file: 'ssb5.png', name: 'Trainer Boy V',    cost: 500 },
  { key: 'userpic_ssb6', file: 'ssb6.png', name: 'Trainer Boy VI',   cost: 500 },
  { key: 'userpic_ssg1', file: 'ssg1.png', name: 'Trainer Girl I',   cost: 500 },
  { key: 'userpic_ssg2', file: 'ssg2.png', name: 'Trainer Girl II',  cost: 500 },
  // ssg3 is the default girl avatar — not purchaseable, already owned by all girls
  { key: 'userpic_ssg4', file: 'ssg4.png', name: 'Trainer Girl IV',  cost: 500 },
  { key: 'userpic_ssg5', file: 'ssg5.png', name: 'Trainer Girl V',   cost: 500 },
  { key: 'userpic_ssg6', file: 'ssg6.png', name: 'Trainer Girl VI',  cost: 500 },
  { key: 'userpic_bsp1', file: 'bsp1.png', name: 'Rare Boy Portrait I',   cost: 800 },
  { key: 'userpic_bsp2', file: 'bsp2.png', name: 'Rare Boy Portrait II',  cost: 800 },
  { key: 'userpic_gsp1', file: 'gsp1.png', name: 'Rare Girl Portrait I',  cost: 800 },
  { key: 'userpic_gsp2', file: 'gsp2.png', name: 'Rare Girl Portrait II', cost: 800 },
  { key: 'userpic_premium_boy2',  file: 'premium_boy2.png',  name: 'Legendary Boy Portrait',  cost: 1200 },
  { key: 'userpic_premium_girl1', file: 'premium_girl1.png', name: 'Legendary Girl Portrait', cost: 1200 },
  // Original character sprites
  { key: 'userpic_dynokid',   file: 'dynokid.png',                       name: 'Dynokid',          cost: 600 },
  { key: 'userpic_orig_1',    file: 'Untitled-1_0000_Layer-6.png',       name: 'Original I',       cost: 600 },
  { key: 'userpic_orig_2',    file: 'Untitled-1_0001_Layer-5.png',       name: 'Original II',      cost: 600 },
  { key: 'userpic_orig_3',    file: 'Untitled-1_0002_Layer-4.png',       name: 'Original III',     cost: 600 },
  { key: 'userpic_orig_4',    file: 'Untitled-1_0003_Layer-3.png',       name: 'Original IV',      cost: 600 },
  { key: 'userpic_orig_5',    file: 'Untitled-1_0004_Layer-2.png',       name: 'Original V',       cost: 600 },
  { key: 'userpic_orig_6',    file: 'Untitled-1_0005_Layer-1.png',       name: 'Original VI',      cost: 600 },
];

export function userpicPath(file: string): string {
  return `/userpics/userpics_premium/${file}`;
}
