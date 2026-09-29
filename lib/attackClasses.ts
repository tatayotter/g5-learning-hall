// lib/attackClasses.ts
// Every skill (and Rest) declares one AttackClass — it picks the animation
// sequence the Phaser battle stage plays when the move is used (see
// lib/phaserBattle/BattleStageScene.ts `perform`). Classes describe the
// SHAPE of the move, not its element: the element only recolors it, so a
// fire beam and a light beam share one sequence.
//
// Pick by how the move reaches the target:
//   hits: true  — the move connects; the target's hit reaction, burst, and
//                 damage number are held until the sequence's impact frame.
//   hits: false — the move never touches the enemy (buffs, heals, curses
//                 that carry no damage); no hit reaction or damage number.

export type AttackClass =
  | 'strike' | 'pounce' | 'projectile' | 'barrage' | 'beam' | 'wave' | 'zone' | 'drain'
  | 'power_up' | 'guard' | 'hex' | 'restore';

export const ATTACK_CLASSES: Record<AttackClass, { hits: boolean; summary: string }> = {
  strike:     { hits: true,  summary: 'Wind up, dash in, and hit up close (bites, claws, lashes, tackles).' },
  pounce:     { hits: true,  summary: 'Crouch, leap in an arc, and slam down on the target.' },
  projectile: { hits: true,  summary: 'Stay put and fire one shot that flies across to the target.' },
  barrage:    { hits: true,  summary: 'Stay put and fire a rapid volley of small shots.' },
  beam:       { hits: true,  summary: 'Charge up, then fire a continuous beam straight at the target.' },
  wave:       { hits: true,  summary: 'Stomp or pulse, sending a wave rolling across the ground.' },
  zone:       { hits: true,  summary: 'Call the attack down onto the target\'s spot (lightning, rifts, eruptions).' },
  drain:      { hits: true,  summary: 'Hit the target, then pull its energy back to the attacker.' },
  power_up:   { hits: false, summary: 'Rising aura around the user (Attack, Speed, focus boosts).' },
  guard:      { hits: false, summary: 'A shield forms around the user (Defense boosts).' },
  hex:        { hits: false, summary: 'A sigil falls on the enemy with no damage (enemy Attack/Defense drops).' },
  restore:    { hits: false, summary: 'Soft healing light around the user (heals, cleanses, Rest).' },
};

export function attackClassHits(cls: AttackClass): boolean {
  return ATTACK_CLASSES[cls].hits;
}
