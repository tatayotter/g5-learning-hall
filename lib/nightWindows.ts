// lib/nightWindows.ts
// Lit windows at night (drawn by lib/phaserMap/TrainingMapScene.ts). Each map with them has two
// map-size overlays made from its own building art, warm where the glass is: the windows on its
// roof layers (drawn with the roofs) and the ones on the walls under the players. `panes` are
// the window boxes in art pixels (x, y, w, h; 32 per tile), each with a soft glow.
// Built by /mnt/project-files/town-map/windows/build_windows.py.

export interface NightWindows {
  upper: string;
  lower: string;
  panes: [number, number, number, number][];
}

export const NIGHT_WINDOWS: Record<string, NightWindows> = {
  town: {
    upper: '/maps-tiled-art/town/town-windows-upper.png',
    lower: '/maps-tiled-art/town/town-windows-lower.png',
    panes: [
      // Lore Keeper's hall
      [930, 87, 11, 14], [959, 87, 11, 14], [978, 87, 11, 14], [924, 110, 73, 68],
      [852, 134, 18, 34], [1049, 134, 18, 34], [852, 198, 18, 37], [1049, 198, 18, 37],
      // Spell Caster's tower
      [152, 186, 18, 37], [214, 186, 19, 37], [151, 262, 82, 64],
      // Realm Guardian's hall
      [443, 140, 14, 26], [493, 140, 14, 26], [537, 140, 15, 26], [582, 140, 15, 26], [631, 140, 15, 26],
      // Lexicon Admiral's hall
      [1347, 111, 56, 39], [1269, 196, 21, 41], [1460, 196, 22, 41],
      // Logic Master's hall
      [1699, 379, 11, 16], [1721, 379, 12, 16], [1745, 379, 12, 16], [1693, 402, 72, 68],
      [1623, 428, 18, 32], [1814, 428, 18, 32], [1623, 490, 18, 35], [1814, 490, 18, 35],
      // The cottages
      [1498, 795, 21, 20], [1446, 795, 28, 20], [1533, 795, 25, 20],
      [1752, 789, 23, 26], [1824, 798, 26, 20],
      [1202, 936, 90, 11], [1244, 991, 19, 20],
      [1477, 1006, 24, 18], [1483, 1052, 19, 18],
      [1763, 985, 44, 40], [1777, 1052, 25, 18],
    ],
  },
};
