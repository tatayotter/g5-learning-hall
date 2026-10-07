// lib/battleLog.ts
//
// The detailed, hidden battle log. The battle screen shows the player a short log of moves; this
// one records every HP change, with the numbers, for checking. Offline trainer battles send it with
// the battle when it syncs (lib/offlineTrainers.ts), where sync_offline_trainer_battle checks that
// it adds up and keeps it with the result.
//
// `npc` / `curio` are positions in the trainer's team / the player's user_monsters row ids.
export type BattleLogEvent =
  // The player's attack: the questions asked for it, and the trainer curio's HP before and after.
  | { t: 'attack'; curio: string | null; skill: string; questions: string[]; damage: number; npc: number; hpBefore: number; hpAfter: number }
  // The trainer curio's attack on the player's curio.
  | { t: 'npc_hit'; npc: number; curio: string | null; damage: number; hpBefore: number; hpAfter: number }
  // A burn ticking at the end of a round.
  | { t: 'burn'; side: 'npc' | 'player'; npc?: number; curio?: string | null; damage: number; hpBefore: number; hpAfter: number }
  // Skill effects that heal the player's own curio (lifesteal and friends).
  | { t: 'heal'; curio: string | null; hpBefore: number; hpAfter: number; source: string }
  | { t: 'rest'; curio: string | null; hpBefore: number; hpAfter: number }
  | { t: 'item'; key: string; curio: string | null }
  | { t: 'switch'; curio: string | null }
  | { t: 'toss'; playerFirst: boolean }
  | { t: 'surrender' };

export type BattleLogger = (event: BattleLogEvent) => void;
