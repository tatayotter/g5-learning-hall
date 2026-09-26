// lib/curioBody.ts
// How a curio's art occupies the battle stage — shared by every MonsterDef
// (and every graduation/guild evolution stage, since each stage is new art)
// via the required `size` + `floats` fields in lib/monsterConfig.ts.
//
// Size is a class, not a per-curio pixel number, so relative scale stays
// consistent as new curios are added: pick the class that matches the
// creature's in-world size (a baby fox is 'small', a magma kaiju is 'huge').
// Heights are for the TRIMMED art (transparent padding is cut away at load
// time by the battle scene), measured in battle-stage pixels (896x504 stage).

export type CurioSize = 'tiny' | 'small' | 'medium' | 'large' | 'huge';

export const CURIO_SIZE_HEIGHT_PX: Record<CurioSize, number> = {
  tiny: 70,
  small: 95,
  medium: 125,
  large: 160,
  huge: 200,
};

// Wide art (coiled serpents, spread wings) is capped so it never reaches the
// middle of the stage, whatever its size class.
export const CURIO_MAX_WIDTH_PX = 270;

// Floaters hover this far above their platform and bob by FLOAT_BOB_PX.
export const FLOAT_LIFT_PX = 18;
export const FLOAT_BOB_PX = 7;

// Relative "weight" of a size class — heavier curios get knocked back less,
// hit harder (bigger burst + screen shake), and lunge more slowly.
export const CURIO_SIZE_WEIGHT: Record<CurioSize, number> = {
  tiny: 0.6,
  small: 0.8,
  medium: 1,
  large: 1.2,
  huge: 1.45,
};
