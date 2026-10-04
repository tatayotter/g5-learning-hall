// lib/phaserBattle/prefetch.ts
//
// Starts downloading Phaser and the battle scene before the first battle, so
// BattleCanvas's own import() resolves instantly instead of the battle intro
// waiting on a big download over mobile data. Called when the Curio Arena
// opens (components/MonsterGuild.tsx). Safe to call repeatedly; if it fails,
// the next call (or BattleCanvas's own retrying import) tries again.
let pending: Promise<unknown> | null = null;

export function prefetchBattleStage() {
  if (pending) return;
  pending = Promise.all([
    import('phaser'),
    import('@/lib/phaserBattle/BattleStageScene'),
  ]).catch(() => { pending = null; });
}
