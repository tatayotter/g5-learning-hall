// Shared between MonsterGuild.tsx and its extracted sub-views
// (TrainingMap, TeamPanel, CompendiumPanel).
export interface CaughtMonster {
  id: string;
  user_id: string;
  monster_id: string;
  nickname: string | null;
  monster_level: number;
  monster_exp: number;
  caught_at: string;
}

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
}
