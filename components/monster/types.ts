// Shared between MonsterGuild.tsx and its extracted sub-views
// (TrainingMap, TeamPanel, CompendiumPanel).
import { QualityTier } from '@/lib/curioQuality';

export interface CaughtMonster {
  id: string;
  user_id: string;
  monster_id: string;
  nickname: string | null;
  monster_level: number;
  monster_exp: number;
  caught_at: string;
  quality: QualityTier;
}

export type GuildView = 'map' | 'team' | 'trainers' | 'compendium' | 'battle' | 'live_battle' | 'leaderboard' | 'trade' | 'hatchery';

export interface BattleState {
  id: string;
  user_id: string;
  map_x: number;
  map_y: number;
  defeated_trainers: string[];
  seen_monsters: string[];
  active_monster_slot: number;
  last_sibling_battle: string | null;
  last_pvp_win: string | null;
  last_wild_encounter_win: string | null;
  questions_since_wild_encounter: number;
  // The wild curio the player found but hasn't resolved yet (caught, or out
  // of tries). Saved so it survives map switches, tab switches and reloads,
  // and follows the player between maps. Null when there's none.
  pending_wild_curio?: PendingWildCurio | null;
}

export interface PendingWildCurio {
  monster_id: string;
  level: number;
  quality: QualityTier;
  // Shared between encounter questions and battles: a wrong answer or a
  // battle start each use one; at zero after a miss or a lost battle, it flees.
  attempts_left: number;
  question_id: string | null;
  region: string | null; // where it spawned (analytics only; it follows the player)
  spawned_at: string;
}
