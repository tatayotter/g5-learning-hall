// lib/intro/introCues.ts
// Sound design for the voiced intros (the first-curio intro and the Term Boss
// intro): each story moment ("cue") pairs
// existing game sounds (lib/sounds.ts — battle SFX, curio fanfares, scroll /
// inscribe / egg-crack clips) with a battle-style visual from the Phaser
// effects layer (lib/intro/IntroFxScene.ts, via introFxRegistry). Music is
// handled here too: the main theme for wonder, the term-boss theme (the
// Forgetting's own track) while the mist is in, back to the main theme when
// the world is re-inked.
//
// Positions are screen fractions matching where the art puts things.
import {
  isMainThemeActive, isTermBossThemeActive, playBattleSfx, preloadBattleSfx, playChime, playCurioCaught,
  playCurioGraduation, playEggCrack, playMonsterAppear, playSkillInscribe, playTeachingScroll,
  startMainTheme, startTermBossTheme, stopMainTheme, stopTermBossTheme,
} from '@/lib/sounds';
import { introFx } from '@/lib/intro/introFxRegistry';
import { FX_TINTS } from '@/lib/intro/fxTints';

export type Cue =
  | 'openLedger' | 'crack' | 'solarchAppear' | 'welcomeSolarch' | 'builders' | 'guildsDone'
  | 'forgettingIn' | 'holdOn' | 'letter' | 'letterWrong' | 'nameSpelled' | 'stairsWrong' | 'reink'
  | 'roar' | 'understand' | 'pledge' | 'oathDone' | 'readyToFight' | 'startQuiz'
  // Term Boss intro
  | 'omen' | 'toLedger' | 'protectPages' | 'whisperIn' | 'letGo' | 'never' | 'flipCard' | 'shadowsAll'
  | 'strikeHit' | 'strikeMiss' | 'partnerReady' | 'sealGlow' | 'setFree' | 'charge';

export interface ScreenPoint { x: number; y: number }

const later = (ms: number, fn: () => void) => { setTimeout(fn, ms); };

// Music the intro owns: main theme while the story plays (unless the game
// already has it running), the Forgetting's theme during the mist beats.
// Only what the intro itself started gets stopped (see stopIntroMusic).
let introStartedMainTheme = false;
let introStartedBossTheme = false;

// Where the characters sit in the art / overlay (screen fractions).
const BOOK = { x: 0.5, y: 0.38 };
const SOLARCH_ON_TALA = { x: 0.47, y: 0.24 };
const SOLARCH_OVERLAY = { x: 0.5, y: 0.3 };
const SOLARCH_ROARING = { x: 0.5, y: 0.34 };
const GUILD_KNOT = { x: 0.5, y: 0.16 };
// Term Boss intro: the sealed crystal in tb_sealed.webp.
const SEAL = { x: 0.5, y: 0.3 };

export function playCue(cue: Cue, at?: ScreenPoint) {
  const fx = introFx();
  switch (cue) {
    case 'openLedger':
      playTeachingScroll();
      playBattleSfx('el_light', { delayMs: 150 });
      fx?.flash(0xfff1a8, 0.35, 220);
      fx?.burst(BOOK.x, BOOK.y, FX_TINTS.light, 1.1);
      fx?.aura(BOOK.x, BOOK.y + 0.05, FX_TINTS.light, 900, 220);
      break;
    case 'crack':
      playEggCrack();
      later(260, playChime);
      fx?.flash(0xffffff, 0.75, 140);
      fx?.shake(240, 0.007);
      fx?.burst(0.5, 0.35, FX_TINTS.light, 1.4);
      break;
    case 'solarchAppear':
      playMonsterAppear();
      playBattleSfx('entrance', { delayMs: 120 });
      fx?.rings(SOLARCH_ON_TALA.x, SOLARCH_ON_TALA.y + 0.06, FX_TINTS.light, 2);
      fx?.aura(SOLARCH_ON_TALA.x, SOLARCH_ON_TALA.y + 0.04, FX_TINTS.light, 800, 90);
      break;
    case 'welcomeSolarch':
      playCurioCaught();
      fx?.burst(SOLARCH_ON_TALA.x, SOLARCH_ON_TALA.y, FX_TINTS.light, 0.9);
      break;
    case 'builders':
      playBattleSfx('cast_guard');
      playBattleSfx('hit_heavy', { delayMs: 220 });
      fx?.shake(220, 0.008);
      fx?.rings(0.5, 0.62, FX_TINTS.normal, 3);
      break;
    case 'guildsDone':
      playBattleSfx('cast_power_up');
      playBattleSfx('blessed', { delayMs: 320 });
      fx?.flash(0xfff1a8, 0.4, 260);
      fx?.burst(GUILD_KNOT.x, GUILD_KNOT.y, FX_TINTS.normal, 1.4);
      break;
    case 'forgettingIn':
      if (!isTermBossThemeActive()) { startTermBossTheme(); introStartedBossTheme = true; }
      playBattleSfx('cast_hex');
      playBattleSfx('hex_land', { delayMs: 380 });
      fx?.darkPulse(0.6, 1100);
      break;
    case 'holdOn':
      playBattleSfx('cast_guard');
      fx?.shield(0.5, 0.36, FX_TINTS.light, 130);
      break;
    case 'letter':
      playBattleSfx('el_light');
      fx?.burst(SOLARCH_OVERLAY.x, SOLARCH_OVERLAY.y, FX_TINTS.light, 0.45);
      break;
    case 'letterWrong':
    case 'stairsWrong':
      playBattleSfx('miss_dodge');
      fx?.shake(110, 0.004);
      break;
    case 'nameSpelled':
      playBattleSfx('revive');
      fx?.aura(SOLARCH_OVERLAY.x, SOLARCH_OVERLAY.y + 0.06, FX_TINTS.light, 900, 80);
      fx?.rings(SOLARCH_OVERLAY.x, SOLARCH_OVERLAY.y + 0.12, FX_TINTS.light, 2);
      break;
    case 'reink':
      if (introStartedBossTheme) { stopTermBossTheme(); introStartedBossTheme = false; }
      playBattleSfx('cast_wave');
      playBattleSfx('cast_restore', { delayMs: 260 });
      fx?.flash(0xffffff, 0.8, 200);
      fx?.shake(320, 0.012);
      fx?.inkSplash(0.5, 0.55);
      break;
    case 'roar':
      playBattleSfx('cast_power_up');
      playBattleSfx('entrance', { delayMs: 200 });
      fx?.flash(0xfff1a8, 0.5, 260);
      fx?.shake(380, 0.01);
      fx?.aura(SOLARCH_ROARING.x, SOLARCH_ROARING.y + 0.08, FX_TINTS.light, 1300, 170);
      fx?.rings(SOLARCH_ROARING.x, SOLARCH_ROARING.y + 0.14, FX_TINTS.light, 3);
      break;
    case 'understand':
      playBattleSfx('blessed');
      fx?.burst(0.5, 0.45, FX_TINTS.normal, 0.8);
      break;
    case 'pledge':
      playSkillInscribe();
      if (at) fx?.burst(at.x, at.y, FX_TINTS.normal, 0.55);
      break;
    case 'oathDone':
      playCurioGraduation();
      fx?.flash(0xfff1a8, 0.55, 300);
      fx?.burst(0.5, 0.45, FX_TINTS.light, 1.6);
      fx?.rings(0.5, 0.5, FX_TINTS.normal, 3);
      break;
    case 'readyToFight':
      playBattleSfx('cast_power_up');
      break;
    case 'startQuiz':
      playBattleSfx('battle_start');
      break;

    // ── Term Boss intro ──
    case 'omen':
      playBattleSfx('cast_hex');
      fx?.darkPulse(0.5, 1200);
      later(500, () => fx?.flash(0xfff1a8, 0.18, 120));
      break;
    case 'toLedger':
      playTeachingScroll();
      fx?.burst(BOOK.x, BOOK.y, FX_TINTS.light, 0.7);
      break;
    case 'protectPages':
      playBattleSfx('cast_guard');
      fx?.shield(0.5, 0.4, FX_TINTS.light, 140);
      break;
    case 'whisperIn':
      playBattleSfx('cast_hex');
      playBattleSfx('hex_land', { delayMs: 420 });
      fx?.darkPulse(0.7, 1500);
      break;
    case 'letGo':
      playBattleSfx('hex_land');
      fx?.shake(160, 0.005);
      if (at) fx?.burst(at.x, at.y, FX_TINTS.ink, 0.7);
      break;
    case 'never':
      playBattleSfx('cast_power_up');
      playBattleSfx('blessed', { delayMs: 300 });
      fx?.flash(0xfff1a8, 0.6, 280);
      fx?.shake(320, 0.01);
      fx?.burst(at?.x ?? 0.5, at?.y ?? 0.6, FX_TINTS.light, 1.6);
      fx?.rings(0.5, 0.45, FX_TINTS.light, 3);
      break;
    case 'flipCard':
      playBattleSfx('el_shadow');
      if (at) fx?.burst(at.x, at.y, FX_TINTS.shadow, 0.5);
      break;
    case 'shadowsAll':
      playBattleSfx('entrance');
      fx?.darkPulse(0.45, 900);
      break;
    case 'strikeHit':
      playBattleSfx('el_light');
      playBattleSfx('hit_heavy', { delayMs: 140 });
      fx?.shake(260, 0.01);
      fx?.burst(at?.x ?? 0.5, at?.y ?? 0.5, FX_TINTS.light, 1.3);
      break;
    case 'strikeMiss':
      playBattleSfx('miss_dodge');
      playBattleSfx('hit_light', { delayMs: 120 });
      fx?.shake(140, 0.005);
      break;
    case 'partnerReady':
      playBattleSfx('cast_power_up');
      fx?.aura(SOLARCH_OVERLAY.x, SOLARCH_OVERLAY.y + 0.06, FX_TINTS.light, 1100, 110);
      fx?.rings(SOLARCH_OVERLAY.x, SOLARCH_OVERLAY.y + 0.12, FX_TINTS.light, 2);
      break;
    case 'sealGlow':
      playBattleSfx('cast_zone');
      fx?.aura(SEAL.x, SEAL.y, FX_TINTS.shadow, 1000, 120);
      break;
    case 'setFree':
      playBattleSfx('blessed');
      fx?.flash(0xfff1a8, 0.35, 220);
      fx?.burst(SEAL.x, SEAL.y, FX_TINTS.light, 1.1);
      fx?.rings(SEAL.x, SEAL.y + 0.05, FX_TINTS.normal, 2);
      break;
    case 'charge':
      playBattleSfx('battle_start');
      fx?.flash(0xffffff, 0.5, 200);
      fx?.shake(300, 0.01);
      break;
  }
}

// Each guild lights with its own element sound and a beam of its color.
const GUILD_ELEMENT = {
  lorekeeper: 'leaf', spellcaster: 'shadow', numberrealm: 'fire', logiclabyrinth: 'water', lexiconarena: 'storm',
} as const;

export function playGuildCue(guildKey: keyof typeof GUILD_ELEMENT, at: ScreenPoint) {
  const el = GUILD_ELEMENT[guildKey];
  playBattleSfx(`el_${el}`);
  playBattleSfx('cast_beam', { delayMs: 60 });
  const fx = introFx();
  fx?.beam(at.x, at.y, FX_TINTS[el]);
  fx?.burst(at.x, at.y, FX_TINTS[el], 0.6);
}

export function startIntroMusic() {
  preloadBattleSfx();
  if (!isMainThemeActive()) { startMainTheme(); introStartedMainTheme = true; }
}

// The Term Boss intro keeps the Forgetting's theme (normally already playing,
// since the event starts it game-wide) and never switches to the main theme.
export function startTermBossIntroMusic() {
  preloadBattleSfx();
  if (!isTermBossThemeActive()) { startTermBossTheme(); introStartedBossTheme = true; }
}

export function stopIntroMusic() {
  if (introStartedBossTheme) { stopTermBossTheme(); introStartedBossTheme = false; }
  if (introStartedMainTheme) { stopMainTheme(); introStartedMainTheme = false; }
}
