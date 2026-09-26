// lib/phaserBattle/BattleStageScene.ts
// Phaser scene for the creature layer of components/battle/BattleStage.tsx —
// the two curios, their platforms, shadows, and every battle
// effect (lunge, hit reaction, element bursts, damage numbers, faint/enter).
// HP cards, the "X used Y!" banner, log, and action panel stay React DOM on
// top (same hybrid split as the map: lib/phaserMap/TrainingMapScene.ts).
//
// The scene is driven entirely by the React wrapper
// (components/battle/BattleCanvas.tsx), which translates BattleStage's
// existing props (animClassName / damagePopup / HP) into calls here, so the
// battle screens' phase-machine code didn't have to change at all.
//
// Art handling: every curio sprite is trimmed to its opaque bounding box and
// resampled at load (see buildTexture) so a curio's on-screen height comes
// from its size class (lib/curioBody.ts), never from how much transparent
// padding its source file happens to have. All curio art faces RIGHT (see
// docs/STYLE_GUIDE.md), so only the right-side curio is mirrored.
import Phaser from 'phaser';
import {
  CURIO_SIZE_HEIGHT_PX, CURIO_MAX_WIDTH_PX, CURIO_SIZE_WEIGHT, FLOAT_LIFT_PX, FLOAT_BOB_PX,
  type CurioSize,
} from '@/lib/curioBody';
import type { AttackClass } from '@/lib/attackClasses';

// The stage box is measured at mount (components/battle/BattleCanvas.tsx) —
// .bstage-stage sits inside the container's 2px border, so it's 892x328, not
// the nominal 896x332. Sizing the game to the exact box keeps it 1:1 with
// CSS pixels; drawing at 896 and letting the browser squeeze it resampled
// (and softened) every frame. Positions below derive from the old DOM
// layout: .bstage-creature 161px wide at 77px from each edge, platform
// 75px tall sitting 16px off the bottom, sprite feet sunk 34px into it.
const CREATURE_INSET = 77 + 161 / 2;
const PLATFORM_BOTTOM = 16;
const FEET_SINK = 34;
// Art is baked at this multiple of its display size so the breathing /
// squash tweens always DOWNsample it — baking exactly 1:1 meant any scale
// change above 1.0 blurred the line art.
const OVERSAMPLE = 2;
// The React HUD (HP cards) ends ~59px from the stage top. No curio's head may
// rise above this line at the top of its idle bob — huge floaters get their
// height capped to fit (see buildSprite).
const HUD_CLEAR_Y = 66;
// Portrait: the opponent is drawn this much smaller to read as further away.
const DEPTH_BACK = 0.8;
// Knockout slow motion: game time runs at this fraction of real time from
// just before a killing blow lands until KO_SLOWMO_HOLD_MS (real) after it.
const SLOWMO = 0.3;
const KO_SLOWMO_LEAD_MS = 170; // scene ms before impact that time slows
const KO_SLOWMO_HOLD_MS = 750; // real ms after impact before time recovers
const PLATFORM_W = 210;
const PLATFORM_H = 75;

export type Side = 'left' | 'right';
// 'landscape': both curios side by side on one ground line (desktop/tablet).
// 'portrait': classic handheld layout — the opponent (right side) stands
// back and up-right at DEPTH_BACK scale, the player (left) forward and
// low-left at full size. Chosen once per scene by BattleStage.
export type StageLayout = 'landscape' | 'portrait';
export type Element = 'fire' | 'water' | 'leaf' | 'storm' | 'shadow' | 'light';

export interface StageMonster {
  spriteUrl: string;
  emoji: string;
  size: CurioSize;
  floats: boolean;
  element: Element;
  fainted: boolean;
}

// [light, mid, dark] per element. 'normal' = element-less moves (universal
// skills); 'neutral' = untyped damage with no attacker (e.g. a burn tick).
const BURST_TINTS: Record<Element | 'neutral' | 'normal', number[]> = {
  fire: [0xffe066, 0xff8a1a, 0xff3b0a],
  water: [0xe0f7ff, 0x5cc8ff, 0x1a6fd1],
  leaf: [0xeaffb0, 0x7ad44a, 0x2f8a2a],
  storm: [0xffffcc, 0xffe14a, 0xb8a000],
  shadow: [0xc9a6ff, 0x7a3cff, 0x2a0a55],
  light: [0xffffff, 0xfff1a8, 0xffc93d],
  neutral: [0xffffff, 0xffb4a0, 0xe04a3a],
  normal: [0xffffff, 0xffe38a, 0xffb020],
};

interface Actor {
  side: Side;
  mon: StageMonster;
  identity: string;
  sprite: Phaser.GameObjects.Image | Phaser.GameObjects.Text | null;
  shadow: Phaser.GameObjects.Ellipse;
  baseSX: number;
  baseSY: number;
  homeY: number;
  idle: Phaser.Tweens.Tween | null;
  busy: boolean;
  // fainted flips the moment HP hits 0; collapsed only once the faint
  // animation actually runs (the killing blow's hit reaction plays between).
  fainted: boolean;
  collapsed: boolean;
  // Impact scheduling: when the OTHER side's lunge will connect with this
  // one, so hit/damage events that arrive with the attack are held until then.
  impactAt: number;
  pendingHit: boolean;
  pendingDamage: { value: number; missed: boolean } | null;
  attackerElement: Element | 'normal' | null;
}

export default class BattleStageScene extends Phaser.Scene {
  private ready = false;
  // Resolves once create() has run — BattleCanvas waits on this before
  // preloading the battle's curio art (see preloadCurios).
  private resolveReady!: () => void;
  readonly whenReady = new Promise<void>(r => { this.resolveReady = r; });
  private res = 1;
  private fontFamily = 'sans-serif';
  private actors: Partial<Record<Side, Actor>> = {};
  private sideX: Record<Side, number>;
  // Per-side ground line (feet y) and depth scale — equal on both sides in
  // landscape, different in portrait (see StageLayout).
  private ground: Record<Side, number>;
  private depth: Record<Side, number>;
  private stageW: number;
  private stageH: number;
  // Knockout slow motion (see enterSlowMo). slowFactor is also applied to
  // every particle emitter spawned while it's active (spawnParticles).
  private slowFactor = 1;
  private slowTimer: ReturnType<typeof setTimeout> | null = null;
  private vignette!: Phaser.GameObjects.Rectangle;
  private flashRect!: Phaser.GameObjects.Rectangle;
  // Staggers two curios entering at once (battle start) so each gets its beat.
  private lastEnterAt = -10000;
  private queued: Partial<Record<Side, StageMonster>> = {};

  constructor(resolution: number, fontFamily: string, width: number, height: number, layout: StageLayout = 'landscape') {
    super({ key: 'battle-stage' });
    this.res = resolution;
    this.fontFamily = fontFamily;
    // Whole pixels only — a half-pixel x (the old 157.5) blurs every sprite.
    const frontGround = Math.round(height - PLATFORM_BOTTOM - PLATFORM_H + FEET_SINK);
    if (layout === 'portrait') {
      this.sideX = { left: Math.round(width * 0.26), right: Math.round(width * 0.7) };
      this.ground = { left: frontGround, right: Math.round(height * 0.5) };
      this.depth = { left: 1, right: DEPTH_BACK };
    } else {
      this.sideX = { left: Math.round(CREATURE_INSET), right: Math.round(width - CREATURE_INSET) };
      this.ground = { left: frontGround, right: frontGround };
      this.depth = { left: 1, right: 1 };
    }
    this.stageW = width;
    this.stageH = height;
  }

  preload() {
    this.load.image('bstage-platform', '/battleui/battle_platform.webp');
  }

  create() {
    // Render at device resolution: the game canvas is res× the stage size and
    // CSS-shrunk back to 896x332, so zooming the camera keeps all scene
    // coordinates in stage pixels.
    this.cameras.main.setOrigin(0, 0).setZoom(this.res);

    const g = this.make.graphics({ x: 0, y: 0 }, false);
    for (let r = 16; r > 0; r--) {
      g.fillStyle(0xffffff, 0.12 + 0.88 * (1 - r / 16) * 0.35);
      g.fillCircle(16, 16, r);
    }
    g.generateTexture('bstage-spark', 32, 32);
    g.destroy();

    for (const side of ['left', 'right'] as Side[]) {
      const d = this.depth[side];
      this.add.image(this.sideX[side], this.ground[side] + (PLATFORM_H / 2 - FEET_SINK) * d, 'bstage-platform')
        .setDisplaySize(PLATFORM_W * d, PLATFORM_H * d).setDepth(-5);
    }
    // Depth layering: platforms -5 < vignette -1 < entrance circles -0.5 <
    // curios/effects 0 (acting curio 5) < KO flash 20. The vignette dims the
    // DOM background showing through the transparent canvas, not the fighters.
    this.vignette = this.add.rectangle(0, 0, this.stageW, this.stageH, 0x0a0612).setOrigin(0, 0).setDepth(-1).setAlpha(0);
    this.flashRect = this.add.rectangle(0, 0, this.stageW, this.stageH, 0xffffff).setOrigin(0, 0).setDepth(20)
      .setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
    this.events.once(Phaser.Scenes.Events.DESTROY, () => { if (this.slowTimer) clearTimeout(this.slowTimer); });
    this.ready = true;
    this.resolveReady();
    for (const side of ['left', 'right'] as Side[]) {
      const m = this.queued[side];
      if (m) this.setMonster(side, m);
    }
  }

  update() {
    for (const a of Object.values(this.actors)) {
      if (!a?.sprite) continue;
      const gy = this.ground[a.side];
      const lift = Math.max(0, gy - a.sprite.y);
      const k = 1 - Math.min(lift, 40) * 0.012;
      const w = Math.abs(a.sprite.displayWidth) * 0.72 * k;
      const h = Math.max(10, w * 0.17);
      const alpha = a.sprite.alpha;
      a.shadow.setPosition(a.sprite.x, gy).setScale(w / 100, h / 100).setAlpha(0.3 * k * alpha);
    }
  }

  // ─── Public API (called by BattleCanvas) ────────────────────────────────

  setMonster(side: Side, mon: StageMonster) {
    this.queued[side] = mon;
    if (!this.ready) return;
    const identity = `${mon.spriteUrl}|${mon.size}|${mon.floats}`;
    const existing = this.actors[side];
    if (existing && existing.identity === identity) {
      existing.mon = mon;
      if (mon.fainted && !existing.fainted) this.faint(existing);
      else if (!mon.fainted && existing.fainted) this.enter(existing);
      return;
    }
    if (existing) this.destroyActor(existing);

    const actor: Actor = {
      side, mon, identity, sprite: null,
      shadow: this.add.ellipse(this.sideX[side], this.ground[side], 100, 100, 0x1a1008, 1).setAlpha(0),
      baseSX: 1, baseSY: 1, homeY: this.ground[side] - (mon.floats ? FLOAT_LIFT_PX * this.depth[side] : 0),
      idle: null, busy: false, fainted: false, collapsed: false,
      impactAt: 0, pendingHit: false, pendingDamage: null, attackerElement: null,
    };
    this.actors[side] = actor;

    const rawKey = `curio-raw:${mon.spriteUrl}`;
    const build = () => {
      if (this.actors[side] !== actor) return; // superseded while loading
      this.buildSprite(actor, rawKey);
      if (mon.fainted) this.faint(actor, true);
      else this.enter(actor);
    };
    if (this.textures.exists(rawKey)) {
      build();
    } else {
      const onFile = (key: string) => { if (key === rawKey) { cleanup(); build(); } };
      const onError = (file: Phaser.Loader.File) => { if (file.key === rawKey) { cleanup(); build(); } };
      const cleanup = () => {
        this.load.off(Phaser.Loader.Events.FILE_COMPLETE, onFile);
        this.load.off(Phaser.Loader.Events.FILE_LOAD_ERROR, onError);
      };
      this.load.on(Phaser.Loader.Events.FILE_COMPLETE, onFile);
      this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, onError);
      this.load.image(rawKey, mon.spriteUrl);
      if (!this.load.isLoading()) this.load.start();
    }
  }

  // Loads every curio sprite the battle can show (both whole teams, every
  // form on the field) into the texture cache up front, so a switch or
  // send-out mid-battle never waits on the network. Called behind the battle
  // intro screen (components/battle/BattleIntro.tsx). Missing files resolve
  // too — buildSprite falls back to the emoji.
  preloadCurios(urls: string[]): Promise<void> {
    const missing = [...new Set(urls)].filter(u => !this.textures.exists(`curio-raw:${u}`));
    if (missing.length === 0) return Promise.resolve();
    return new Promise(resolve => {
      for (const u of missing) this.load.image(`curio-raw:${u}`, u);
      this.load.once(Phaser.Loader.Events.COMPLETE, () => resolve());
      if (!this.load.isLoading()) this.load.start();
    });
  }

  // ─── Move sequences ─────────────────────────────────────────────────────
  // One sequence per AttackClass (lib/attackClasses.ts). `element` is the
  // SKILL's element, not the user's — it only recolors the sequence, so a
  // fire curio casting a learned water move sprays blue. null = an
  // element-less move (universal skills), drawn in neutral gold.
  //
  // Hitting classes schedule the target's impact (see impactIn) at the frame
  // the move connects; the hit reaction / burst / damage number the battle
  // screen sends alongside are held until then. Non-hitting classes never
  // touch the enemy, and the screens send no hit or damage for them.
  perform(side: Side, cls: AttackClass, element: Element | null) {
    const a = this.actors[side];
    if (!this.ready || !a?.sprite || a.fainted) return;
    const t = this.actors[other(side)];
    const tints = BURST_TINTS[element ?? 'normal'];
    switch (cls) {
      case 'strike': return this.seqStrike(a, t, tints, element);
      case 'pounce': return this.seqPounce(a, t, tints, element);
      case 'projectile': return this.seqProjectile(a, t, tints, element);
      case 'barrage': return this.seqBarrage(a, t, tints, element);
      case 'beam': return this.seqBeam(a, t, tints, element);
      case 'wave': return this.seqWave(a, t, tints, element);
      case 'zone': return this.seqZone(a, t, tints, element);
      case 'drain': return this.seqDrain(a, t, tints, element);
      case 'power_up': return this.seqPowerUp(a, tints);
      case 'guard': return this.seqGuard(a, tints);
      case 'hex': return this.seqHex(a, t, tints);
      case 'restore': return this.seqRestore(a, tints);
    }
  }

  // Legacy signal — an animClassName 'battle-attack-*' with no action: a
  // plain strike in the user's own element.
  attack(side: Side) {
    this.perform(side, 'strike', this.actors[side]?.mon.element ?? null);
  }

  private seqStrike(a: Actor, t: Actor | undefined, tints: number[], element: Element | null) {
    const s = a.sprite!;
    const w = CURIO_SIZE_WEIGHT[a.mon.size];
    const dir = dirOf(a.side);
    const homeX = this.sideX[a.side];
    const hitX = this.contactX(a, t, 0.3);
    const hitY = this.contactY(a);
    const windUp = 190;
    const dash = Math.round(120 * w);
    this.begin(a);
    this.impactIn(t, windUp + dash, element);
    this.tweens.add({
      targets: s, x: homeX - dir * 28, scaleX: a.baseSX * 1.1, scaleY: a.baseSY * 0.88, duration: windUp, ease: 'Quad.easeOut',
      onComplete: () => this.tweens.add({
        targets: s, x: hitX, y: hitY, scaleX: a.baseSX * 0.9, scaleY: a.baseSY * 1.1, duration: dash, ease: 'Quad.easeIn',
        onComplete: () => {
          this.slash(hitX + dir * Math.abs(s.displayWidth) * 0.35, s.y - Math.abs(s.displayHeight) * 0.55, dir, tints);
          this.tweens.add({
            targets: s, x: homeX, y: a.homeY, scaleX: a.baseSX, scaleY: a.baseSY, duration: Math.round(340 * w), ease: 'Back.easeOut',
            onComplete: () => this.finish(a),
          });
        },
      }),
    });
  }

  private seqPounce(a: Actor, t: Actor | undefined, tints: number[], element: Element | null) {
    const s = a.sprite!;
    const w = CURIO_SIZE_WEIGHT[a.mon.size];
    const homeX = this.sideX[a.side];
    const landX = this.contactX(a, t, 0.15);
    const landY = this.contactY(a);
    const crouch = 170, rise = Math.round(230 * w), fall = Math.round(190 * w);
    const apexY = Math.min(a.homeY, landY) - 110;
    this.begin(a);
    this.impactIn(t, crouch + rise + fall, element);
    this.tweens.add({
      targets: s, scaleX: a.baseSX * 1.14, scaleY: a.baseSY * 0.82, duration: crouch, ease: 'Quad.easeOut',
      onComplete: () => this.tweens.add({
        targets: s, x: (homeX + landX) / 2, y: apexY, scaleX: a.baseSX * 0.9, scaleY: a.baseSY * 1.12, duration: rise, ease: 'Quad.easeOut',
        onComplete: () => this.tweens.add({
          targets: s, x: landX, y: landY, scaleX: a.baseSX, scaleY: a.baseSY, duration: fall, ease: 'Quad.easeIn',
          onComplete: () => {
            this.groundRing(landX, this.ground[other(a.side)], tints, 1.2 * w);
            this.cameras.main.shake(160, 0.01 * w);
            this.tweens.add({ targets: s, x: homeX, duration: 440, ease: 'Sine.easeInOut', onComplete: () => this.finish(a) });
            this.tweens.add({
              targets: s, y: Math.min(landY, a.homeY) - 42, duration: 220, ease: 'Quad.easeOut',
              onComplete: () => this.tweens.add({ targets: s, y: a.homeY, duration: 220, ease: 'Quad.easeIn' }),
            });
          },
        }),
      }),
    });
  }

  private seqProjectile(a: Actor, t: Actor | undefined, tints: number[], element: Element | null) {
    const s = a.sprite!;
    const dir = dirOf(a.side);
    const from = this.mouth(a);
    const to = this.aim(a, t);
    const charge = 120, flight = 280;
    this.begin(a);
    this.impactIn(t, charge + flight, element);
    this.tweens.add({ targets: s, x: this.sideX[a.side] - dir * 10, duration: 90, yoyo: true, delay: charge, ease: 'Quad.easeOut' });
    this.fireOrb(from, to, tints, charge, flight, 1.3);
    this.time.delayedCall(charge + flight + 150, () => this.finish(a));
  }

  private seqBarrage(a: Actor, t: Actor | undefined, tints: number[], element: Element | null) {
    const s = a.sprite!;
    const dir = dirOf(a.side);
    const from = this.mouth(a);
    const to = this.aim(a, t);
    const shots = 6, gap = 70, flight = 220, first = 100;
    this.begin(a);
    this.impactIn(t, first + (shots - 1) * gap + flight, element);
    for (let i = 0; i < shots; i++) {
      const jitter = { x: to.x + Phaser.Math.Between(-18, 18), y: to.y + Phaser.Math.Between(-30, 30) };
      this.fireOrb({ x: from.x, y: from.y + Phaser.Math.Between(-8, 8) }, jitter, tints, first + i * gap, flight, 0.7,
        i < shots - 1 ? (p) => this.miniBurst(p.x, p.y, tints) : undefined);
      this.tweens.add({ targets: s, x: this.sideX[a.side] - dir * 6, duration: gap / 2, yoyo: true, delay: first + i * gap });
    }
    this.time.delayedCall(first + shots * gap + flight + 120, () => this.finish(a));
  }

  private seqBeam(a: Actor, t: Actor | undefined, tints: number[], element: Element | null) {
    const s = a.sprite!;
    const dir = dirOf(a.side);
    const from = this.mouth(a);
    const to = this.aim(a, t);
    const charge = 380, hold = 360;
    this.begin(a);
    this.impactIn(t, charge + 80, element);
    // Charge: rings collapse into a growing orb at the mouth.
    const orb = this.add.image(from.x, from.y, 'bstage-spark').setTint(tints[1]).setBlendMode(Phaser.BlendModes.ADD).setScale(0);
    this.tweens.add({ targets: orb, scale: 1.7, duration: charge, ease: 'Quad.easeIn' });
    for (let i = 0; i < 3; i++) {
      const ring = this.add.circle(from.x, from.y, 30).setStrokeStyle(3, tints[i % tints.length]).setBlendMode(Phaser.BlendModes.ADD).setScale(2.4).setAlpha(0);
      this.tweens.add({ targets: ring, scale: 0.2, alpha: 1, duration: 220, delay: i * 90, ease: 'Quad.easeIn', onComplete: () => ring.destroy() });
    }
    this.tweens.add({ targets: s, scaleX: a.baseSX * 1.06, scaleY: a.baseSY * 0.94, duration: charge, ease: 'Quad.easeIn' });
    this.time.delayedCall(charge, () => {
      const len = Phaser.Math.Distance.Between(from.x, from.y, to.x, to.y);
      const ang = Phaser.Math.Angle.Between(from.x, from.y, to.x, to.y);
      const outer = this.add.rectangle(from.x, from.y, len, 26, tints[1]).setOrigin(0, 0.5).setRotation(ang)
        .setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.85).setScale(1, 0);
      const inner = this.add.rectangle(from.x, from.y, len, 9, 0xffffff).setOrigin(0, 0.5).setRotation(ang)
        .setBlendMode(Phaser.BlendModes.ADD).setScale(1, 0);
      this.tweens.add({ targets: [outer, inner], scaleY: 1, duration: 70, ease: 'Quad.easeOut' });
      this.tweens.add({ targets: outer, scaleY: 0.75, duration: 60, yoyo: true, repeat: 2, delay: 90 });
      this.tweens.add({
        targets: [outer, inner], scaleY: 0, alpha: 0, duration: 140, delay: hold, ease: 'Quad.easeIn',
        onComplete: () => { outer.destroy(); inner.destroy(); },
      });
      const spray = this.spawnParticles(to.x, to.y, 'bstage-spark', {
        speed: { min: 60, max: 200 }, angle: { min: 0, max: 360 }, lifespan: 320, scale: { start: 0.7, end: 0 },
        alpha: { start: 1, end: 0 }, tint: tints, blendMode: 'ADD', frequency: 18,
      });
      this.time.delayedCall(hold, () => spray.stop());
      this.time.delayedCall(hold + 500, () => spray.destroy());
      this.tweens.add({ targets: orb, scale: 0, duration: hold, onComplete: () => orb.destroy() });
      this.tweens.add({
        targets: s, x: this.sideX[a.side] - dir * 12, scaleX: a.baseSX, scaleY: a.baseSY, duration: 120, ease: 'Quad.easeOut',
        onComplete: () => this.tweens.add({ targets: s, x: this.sideX[a.side], duration: 300, delay: hold - 120, onComplete: () => this.finish(a) }),
      });
    });
  }

  private seqWave(a: Actor, t: Actor | undefined, tints: number[], element: Element | null) {
    const s = a.sprite!;
    const startX = this.sideX[a.side] + dirOf(a.side) * Math.abs(s.displayWidth) * 0.4;
    const endX = t?.sprite ? t.sprite.x : this.sideX[other(a.side)];
    const startY = this.ground[a.side];
    const endY = this.ground[other(a.side)];
    const stomp = 240, travel = 420;
    this.begin(a);
    this.impactIn(t, stomp + travel, element);
    this.tweens.add({
      targets: s, y: a.homeY - 20, scaleY: a.baseSY * 1.08, duration: stomp / 2, ease: 'Quad.easeOut', yoyo: true,
      onComplete: () => {
        s.setScale(a.baseSX * 1.1, a.baseSY * 0.88);
        this.tweens.add({ targets: s, scaleX: a.baseSX, scaleY: a.baseSY, duration: 200, ease: 'Back.easeOut' });
        this.cameras.main.shake(90, 0.004);
        const base = this.add.ellipse(startX, startY, 70, 20, tints[1]).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.9);
        const crest = this.add.ellipse(startX, startY - 26, 46, 64, tints[0]).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.7);
        const spray = this.spawnParticles(startX, startY, 'bstage-spark', {
          speedY: { min: -220, max: -60 }, speedX: { min: -40, max: 40 }, gravityY: 380, lifespan: 420,
          scale: { start: 0.7, end: 0 }, alpha: { start: 1, end: 0 }, tint: tints, blendMode: 'ADD', frequency: 14,
        });
        this.tweens.add({
          targets: [base, crest], x: endX, duration: travel, ease: 'Quad.easeIn',
          onUpdate: () => spray.setPosition(base.x, base.y),
        });
        this.tweens.add({ targets: base, y: endY, duration: travel, ease: 'Quad.easeIn' });
        this.tweens.add({ targets: crest, y: endY - 26, duration: travel, ease: 'Quad.easeIn' });
        this.tweens.add({ targets: base, scaleX: 2, duration: travel });
        this.tweens.add({ targets: crest, scaleY: 1.6, scaleX: 1.4, duration: travel });
        this.time.delayedCall(travel, () => {
          spray.stop();
          this.tweens.add({ targets: [base, crest], alpha: 0, scaleY: 0.2, duration: 220, onComplete: () => { base.destroy(); crest.destroy(); } });
          this.time.delayedCall(500, () => spray.destroy());
          this.finish(a);
        });
      },
    });
  }

  private seqZone(a: Actor, t: Actor | undefined, tints: number[], element: Element | null) {
    const s = a.sprite!;
    const tx = t?.sprite ? t.sprite.x : this.sideX[other(a.side)];
    const ty = this.ground[other(a.side)];
    const zd = this.depth[other(a.side)];
    const call = 320;
    this.begin(a);
    this.impactIn(t, call, element);
    // User raises up and calls the move down on the target's spot.
    this.tweens.add({ targets: s, y: a.homeY - 8, scaleY: a.baseSY * 1.12, scaleX: a.baseSX * 0.94, duration: call, ease: 'Quad.easeOut', yoyo: true, hold: 200,
      onComplete: () => this.finish(a) });
    const mark = this.add.ellipse(tx, ty, 170 * zd, 44 * zd).setStrokeStyle(4, tints[1]).setFillStyle(tints[2], 0.25)
      .setBlendMode(Phaser.BlendModes.ADD).setScale(0.1).setAlpha(0);
    this.tweens.add({ targets: mark, scale: 1, alpha: 1, duration: call, ease: 'Back.easeOut' });
    this.time.delayedCall(call, () => {
      const col = this.add.rectangle(tx, 0, 80 * zd, ty, tints[1]).setOrigin(0.5, 0).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.85).setScale(0, 1);
      const core = this.add.rectangle(tx, 0, 24 * zd, ty, 0xffffff).setOrigin(0.5, 0).setBlendMode(Phaser.BlendModes.ADD).setScale(0, 1);
      this.tweens.add({ targets: [col, core], scaleX: 1, duration: 60, ease: 'Quad.easeOut' });
      this.tweens.add({
        targets: [col, core], scaleX: 0, alpha: 0, duration: 260, delay: 220, ease: 'Quad.easeIn',
        onComplete: () => { col.destroy(); core.destroy(); },
      });
      this.tweens.add({ targets: mark, alpha: 0, scale: 1.4, duration: 520, onComplete: () => mark.destroy() });
      const erupt = this.spawnParticles(tx, ty, 'bstage-spark', {
        speed: { min: 200, max: 440 }, angle: { min: 235, max: 305 }, gravityY: 700, lifespan: { min: 400, max: 750 },
        scale: { start: 1, end: 0 }, alpha: { start: 1, end: 0 }, tint: tints, blendMode: 'ADD', emitting: false,
      });
      erupt.explode(34);
      this.time.delayedCall(900, () => erupt.destroy());
    });
  }

  private seqDrain(a: Actor, t: Actor | undefined, tints: number[], element: Element | null) {
    const from = this.mouth(a);
    const to = this.aim(a, t);
    const charge = 100, flight = 230;
    this.begin(a);
    this.impactIn(t, charge + flight, element);
    this.fireOrb(from, to, tints, charge, flight, 1.1);
    // After the hit, motes of stolen energy stream back into the user.
    this.time.delayedCall(charge + flight + 180, () => {
      if (!a.sprite) return;
      const home = this.center(a);
      for (let i = 0; i < 10; i++) {
        const m = this.add.image(to.x + Phaser.Math.Between(-20, 20), to.y + Phaser.Math.Between(-24, 24), 'bstage-spark')
          .setTint(tints[i % 2]).setBlendMode(Phaser.BlendModes.ADD).setScale(0.6);
        this.tweens.add({
          targets: m, x: home.x, duration: 480, delay: i * 35, ease: 'Sine.easeIn',
        });
        this.tweens.add({
          targets: m, y: home.y - Phaser.Math.Between(20, 70), duration: 240, delay: i * 35, ease: 'Sine.easeOut', yoyo: true,
          onComplete: () => m.destroy(),
        });
      }
      this.time.delayedCall(520, () => this.flashSelf(a, tints, 0.55));
    });
    this.time.delayedCall(charge + flight + 900, () => this.finish(a));
  }

  private seqPowerUp(a: Actor, tints: number[]) {
    const s = a.sprite!;
    const wPx = Math.abs(s.displayWidth);
    this.begin(a);
    this.tweens.add({
      targets: s, scaleX: a.baseSX * 1.1, scaleY: a.baseSY * 0.88, duration: 150, ease: 'Quad.easeOut',
      onComplete: () => this.tweens.add({
        targets: s, scaleX: a.baseSX * 0.95, scaleY: a.baseSY * 1.1, duration: 180, yoyo: true, repeat: 1, ease: 'Sine.easeInOut',
        onComplete: () => this.finish(a),
      }),
    });
    const aura = this.spawnParticles(s.x, a.homeY, 'bstage-spark', {
      x: { min: -wPx * 0.4, max: wPx * 0.4 }, speedY: { min: -170, max: -60 }, lifespan: 700,
      scale: { start: 0.7, end: 0 }, alpha: { start: 1, end: 0 }, tint: [tints[1], tints[2]], frequency: 20,
    });
    this.time.delayedCall(750, () => aura.stop());
    this.time.delayedCall(1600, () => aura.destroy());
    this.groundRing(s.x, this.ground[a.side], tints, 1, false);
    this.time.delayedCall(260, () => this.groundRing(s.x, this.ground[a.side], tints, 1.3, false));
    this.time.delayedCall(150, () => this.flashSelf(a, tints, 0.5));
  }

  private seqGuard(a: Actor, tints: number[]) {
    const s = a.sprite!;
    const c = this.center(a);
    const r = Math.max(Math.abs(s.displayWidth), Math.abs(s.displayHeight)) * 0.62;
    this.begin(a);
    this.tweens.add({ targets: s, scaleX: a.baseSX * 1.08, scaleY: a.baseSY * 0.9, duration: 140, yoyo: true, onComplete: () => this.finish(a) });
    const shield = this.add.circle(c.x, c.y, r).setStrokeStyle(5, tints[2]).setFillStyle(tints[1], 0.18)
      .setScale(0.2).setAlpha(0);
    this.tweens.add({ targets: shield, scale: 1, alpha: 1, duration: 240, ease: 'Back.easeOut' });
    this.tweens.add({ targets: shield, alpha: 0.55, duration: 160, delay: 260, yoyo: true, repeat: 1 });
    this.tweens.add({ targets: shield, scale: 1.12, alpha: 0, duration: 260, delay: 900, onComplete: () => shield.destroy() });
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      const dot = this.add.image(c.x + Math.cos(ang) * r, c.y + Math.sin(ang) * r, 'bstage-spark')
        .setTint(tints[0]).setBlendMode(Phaser.BlendModes.ADD).setScale(0);
      this.tweens.add({ targets: dot, scale: 0.8, duration: 160, delay: 200 + i * 40, yoyo: true, hold: 200, onComplete: () => dot.destroy() });
    }
  }

  private seqHex(a: Actor, t: Actor | undefined, tints: number[]) {
    const s = a.sprite!;
    const dir = dirOf(a.side);
    this.begin(a);
    this.tweens.add({
      targets: s, x: this.sideX[a.side] + dir * 16, scaleX: a.baseSX * 1.06, duration: 170, yoyo: true, ease: 'Quad.easeOut',
      onComplete: () => this.finish(a),
    });
    if (!t?.sprite) return;
    const ts = t.sprite;
    // Above the target's head, but never up under the HP cards (they cover
    // roughly the top 100px of the stage) — huge curios reach that high.
    const top = { x: ts.x, y: Math.max(ts.y - Math.abs(ts.displayHeight) - 26, 118) };
    this.time.delayedCall(180, () => {
      // Solid (not additive) strokes — additive glow washes out on the pale
      // battle background, and a curse should read as dark anyway.
      const ring = this.add.circle(top.x, top.y, 36).setStrokeStyle(4, tints[2]).setScale(0);
      const star = this.add.star(top.x, top.y, 5, 11, 28).setStrokeStyle(3, tints[2]).setFillStyle(tints[1], 0.55).setScale(0);
      this.tweens.add({ targets: [ring, star], scale: 1, duration: 160, ease: 'Back.easeOut' });
      this.tweens.add({ targets: [ring, star], angle: 200, duration: 900 });
      this.tweens.add({
        targets: [ring, star], y: ts.y - Math.abs(ts.displayHeight) * 0.5, scale: 0.5, alpha: 0, duration: 380, delay: 520, ease: 'Quad.easeIn',
        onComplete: () => { ring.destroy(); star.destroy(); },
      });
      const motes = this.spawnParticles(top.x, top.y, 'bstage-spark', {
        x: { min: -30, max: 30 }, speedY: { min: 40, max: 120 }, lifespan: 600,
        scale: { start: 0.55, end: 0 }, alpha: { start: 1, end: 0 }, tint: [tints[1], tints[2]], frequency: 35,
      });
      this.time.delayedCall(700, () => motes.stop());
      this.time.delayedCall(1400, () => motes.destroy());
      // The target flinches under the sigil — tint only, no knockback or
      // damage (this class never hits).
      this.time.delayedCall(560, () => {
        if (this.actors[t.side] !== t || !(ts instanceof Phaser.GameObjects.Image) || t.fainted) return;
        ts.setTint(0xb0a2cc);
        this.time.delayedCall(420, () => { if (!ts.active) return; if (!t.busy) ts.clearTint(); });
      });
    });
  }

  private seqRestore(a: Actor, tints: number[]) {
    const s = a.sprite!;
    const c = this.center(a);
    const wPx = Math.abs(s.displayWidth);
    const hPx = Math.abs(s.displayHeight);
    this.begin(a);
    this.tweens.add({ targets: s, scaleY: a.baseSY * 1.05, duration: 300, yoyo: true, ease: 'Sine.easeInOut', onComplete: () => this.finish(a) });
    const motes = this.spawnParticles(s.x, a.homeY, 'bstage-spark', {
      x: { min: -wPx * 0.45, max: wPx * 0.45 }, y: { min: -hPx, max: 0 }, speedY: { min: -80, max: -30 },
      lifespan: 900, scale: { start: 0.6, end: 0 }, alpha: { start: 1, end: 0 },
      tint: [tints[1], tints[2]], frequency: 30,
    });
    this.time.delayedCall(800, () => motes.stop());
    this.time.delayedCall(1800, () => motes.destroy());
    const glow = this.add.ellipse(c.x, c.y, wPx * 1.1, hPx * 1.1, tints[1]).setAlpha(0).setScale(0.6);
    this.tweens.add({ targets: glow, alpha: 0.28, scale: 1, duration: 350, yoyo: true, hold: 150, onComplete: () => glow.destroy() });
    this.groundRing(s.x, this.ground[a.side], tints, 1, false);
    this.time.delayedCall(200, () => this.flashSelf(a, tints, 0.6));
  }

  // ─── Sequence helpers ───────────────────────────────────────────────────

  // The acting curio draws in front of the other one while it moves (so a
  // pounce/strike lands in front of the target, not behind it).
  private begin(a: Actor) {
    this.stopIdle(a);
    a.busy = true;
    a.sprite?.setDepth(5);
  }

  private finish(a: Actor) {
    if (this.actors[a.side] !== a) return;
    a.busy = false;
    a.sprite?.setDepth(0);
    this.startIdle(a);
  }

  // Tells the target when this move connects, so the screen's hit/damage
  // signals (sent the moment the move starts) are held until then.
  private impactIn(t: Actor | undefined, ms: number, element: Element | null) {
    if (!t) return;
    t.impactAt = this.time.now + ms;
    t.attackerElement = element ?? 'normal';
    // The target's HP already hit 0 when this move started (the screen sends
    // HP with the move) — so this is the finishing blow: slow time down just
    // before it connects, so the final approach plays in slow motion.
    if (t.fainted && !t.collapsed) {
      const lead = Math.min(ms, KO_SLOWMO_LEAD_MS);
      this.time.delayedCall(ms - lead, () => this.enterSlowMo());
    }
    this.time.delayedCall(ms, () => this.resolveImpact(t));
  }

  private center(a: Actor) {
    const s = a.sprite!;
    return { x: s.x, y: s.y - Math.abs(s.displayHeight) * 0.5 };
  }

  private mouth(a: Actor) {
    const s = a.sprite!;
    return { x: s.x + dirOf(a.side) * Math.abs(s.displayWidth) * 0.32, y: s.y - Math.abs(s.displayHeight) * 0.6 };
  }

  private aim(a: Actor, t: Actor | undefined) {
    if (t?.sprite) return this.center(t);
    return { x: this.sideX[other(a.side)], y: this.ground[other(a.side)] - 60 };
  }

  // Feet y for a melee user standing at the target's spot.
  private contactY(a: Actor) {
    return this.ground[other(a.side)] - (a.mon.floats ? FLOAT_LIFT_PX : 0);
  }

  // Where a melee user stops so it visually touches the target.
  private contactX(a: Actor, t: Actor | undefined, selfFrac: number) {
    const dir = dirOf(a.side);
    const targetX = this.sideX[other(a.side)];
    const reach = t?.sprite ? Math.abs(t.sprite.displayWidth) * 0.42 : 60;
    return targetX - dir * (reach + Math.abs(a.sprite!.displayWidth) * selfFrac);
  }

  private fireOrb(
    from: { x: number; y: number }, to: { x: number; y: number }, tints: number[],
    delay: number, flight: number, size: number, onArrive?: (p: { x: number; y: number }) => void,
  ) {
    const orb = this.add.image(from.x, from.y, 'bstage-spark').setTint(tints[1]).setBlendMode(Phaser.BlendModes.ADD).setScale(0);
    const core = this.add.image(from.x, from.y, 'bstage-spark').setTint(0xffffff).setBlendMode(Phaser.BlendModes.ADD).setScale(0);
    const trail = this.spawnParticles(from.x, from.y, 'bstage-spark', {
      speed: { min: 5, max: 35 }, lifespan: 240, scale: { start: 0.6 * size, end: 0 }, alpha: { start: 0.9, end: 0 },
      tint: tints, blendMode: 'ADD', frequency: 16, emitting: false,
    });
    this.tweens.add({ targets: orb, scale: size, duration: Math.min(delay, 120) || 1, delay: Math.max(0, delay - 120) });
    this.tweens.add({ targets: core, scale: size * 0.45, duration: Math.min(delay, 120) || 1, delay: Math.max(0, delay - 120) });
    this.tweens.add({
      targets: [orb, core], x: to.x, y: to.y, duration: flight, delay, ease: 'Quad.easeIn',
      onStart: () => trail.start(),
      onUpdate: () => trail.setPosition(orb.x, orb.y),
      onComplete: () => {
        orb.destroy();
        core.destroy();
        trail.stop();
        this.time.delayedCall(300, () => trail.destroy());
        onArrive?.(to);
      },
    });
  }

  private miniBurst(x: number, y: number, tints: number[]) {
    const p = this.spawnParticles(x, y, 'bstage-spark', {
      speed: { min: 60, max: 160 }, angle: { min: 0, max: 360 }, lifespan: 260, scale: { start: 0.6, end: 0 },
      alpha: { start: 1, end: 0 }, tint: tints, blendMode: 'ADD', emitting: false,
    });
    p.explode(8);
    this.time.delayedCall(400, () => p.destroy());
  }

  private slash(x: number, y: number, dir: number, tints: number[]) {
    for (let i = 0; i < 3; i++) {
      const line = this.add.rectangle(x + dir * i * 6, y - 16 + i * 16, 70, 5, i === 1 ? 0xffffff : tints[1])
        .setBlendMode(Phaser.BlendModes.ADD).setRotation(dir * -0.7).setScale(0, 1);
      this.tweens.add({ targets: line, scaleX: 1, duration: 70, delay: i * 30, ease: 'Quad.easeOut' });
      this.tweens.add({ targets: line, alpha: 0, duration: 200, delay: 110 + i * 30, onComplete: () => line.destroy() });
    }
  }

  // additive = glowing (impacts); solid = readable on the pale background
  // (buffs/heals, which have no bright impact behind them).
  private groundRing(x: number, y: number, tints: number[], scale: number, additive = true) {
    const ring = this.add.ellipse(x, y, 60, 16).setStrokeStyle(4, additive ? tints[1] : tints[2]).setScale(0.5);
    if (additive) ring.setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: ring, scaleX: 3.2 * scale, scaleY: 2.4 * scale, alpha: 0, duration: 420, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
  }

  // Brightens the user for a moment with an additive copy of its own sprite.
  private flashSelf(a: Actor, tints: number[], strength: number) {
    const s = a.sprite;
    if (!(s instanceof Phaser.GameObjects.Image) || !s.active) return;
    const glow = this.add.image(s.x, s.y, s.texture.key).setOrigin(0.5, 1).setScale(s.scaleX, s.scaleY)
      .setFlipX(s.flipX).setTint(tints[0]).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
    this.tweens.add({
      targets: glow, alpha: strength, duration: 140, yoyo: true, hold: 60,
      onUpdate: () => glow.setPosition(s.x, s.y).setScale(s.scaleX, s.scaleY),
      onComplete: () => glow.destroy(),
    });
  }

  hit(side: Side) {
    const a = this.actors[side];
    if (!a) return;
    a.pendingHit = true;
    this.scheduleImpact(a);
  }

  damage(side: Side, value: number, missed: boolean) {
    const a = this.actors[side];
    if (!a) return;
    a.pendingDamage = { value, missed };
    this.scheduleImpact(a);
  }

  // ─── Internals ──────────────────────────────────────────────────────────

  // The battle screens fire the damage popup, the attacker's anim, and the
  // target's hit anim within a couple of frames of each other, in no
  // guaranteed order. Wait briefly to see whether an attack is inbound; if
  // so, its lunge's delayedCall resolves the impact on contact, otherwise
  // (burn tick etc.) resolve right away.
  private scheduleImpact(a: Actor) {
    this.time.delayedCall(90, () => {
      if (a.impactAt > this.time.now) return;
      this.resolveImpact(a);
    });
  }

  private resolveImpact(a: Actor) {
    if (this.actors[a.side] !== a || !a.sprite) return;
    if (a.collapsed) { a.pendingDamage = null; a.pendingHit = false; a.impactAt = 0; return; }
    const dmg = a.pendingDamage;
    const hit = a.pendingHit || (dmg && !dmg.missed);
    a.pendingDamage = null;
    a.pendingHit = false;
    const element = a.attackerElement ?? 'neutral';
    a.attackerElement = null;
    a.impactAt = 0;
    if (!dmg && !hit) return;

    const s = a.sprite;
    const topY = s.y - Math.abs(s.displayHeight);
    if (hit) {
      const attacker = this.actors[other(a.side)];
      const force = attacker ? CURIO_SIZE_WEIGHT[attacker.mon.size] : 1;
      if (a.fainted) {
        // Knockout: bigger burst, flash, hard shake, all in slow motion.
        this.enterSlowMo();
        this.burst(s.x, s.y - Math.abs(s.displayHeight) * 0.5, BURST_TINTS[element], force * 1.35);
        this.cameras.main.shake(260, 0.014 * force);
        this.flashRect.setAlpha(0.7);
        this.tweens.add({ targets: this.flashRect, alpha: 0, duration: 260, ease: 'Quad.easeOut' });
        this.knockOut(a, force);
        this.exitSlowMoIn(KO_SLOWMO_HOLD_MS);
      } else {
        this.burst(s.x, s.y - Math.abs(s.displayHeight) * 0.5, BURST_TINTS[element], force);
        this.cameras.main.shake(Math.round(130 * force), 0.006 * force);
        this.react(a, force);
      }
    } else if (dmg?.missed) {
      this.dodge(a);
    }
    if (dmg) this.floatText(s.x, topY - 18, dmg.missed ? 'Miss!' : `-${dmg.value}`, dmg.missed ? '#ff9d1f' : '#ffd23d');
  }

  private buildSprite(a: Actor, rawKey: string) {
    const x = this.sideX[a.side];
    const targetH = CURIO_SIZE_HEIGHT_PX[a.mon.size] * this.depth[a.side];
    if (!this.textures.exists(rawKey)) {
      // Missing art — same emoji fallback MonsterImage uses in the DOM.
      const t = this.add.text(x, a.homeY, a.mon.emoji, { fontSize: `${Math.round(targetH * 0.8)}px` }).setOrigin(0.5, 1);
      a.sprite = t;
      a.baseSX = 1;
      a.baseSY = 1;
      return;
    }
    const bake = this.res * OVERSAMPLE;
    const procKey = `curio:${a.mon.spriteUrl}@${a.mon.size}@${a.mon.floats ? 'f' : 'g'}@${this.depth[a.side]}@${bake}`;
    let dispW: number;
    let dispH: number;
    if (!this.textures.exists(procKey)) {
      const src = this.textures.get(rawKey).getSourceImage() as HTMLImageElement;
      const box = opaqueBounds(src);
      const topAllowed = a.homeY - (a.mon.floats ? FLOAT_BOB_PX : 0) - HUD_CLEAR_Y;
      dispH = Math.min(targetH, topAllowed);
      dispW = dispH * (box.w / box.h);
      const maxW = CURIO_MAX_WIDTH_PX * this.depth[a.side];
      if (dispW > maxW) { dispW = maxW; dispH = dispW * (box.h / box.w); }
      // Resample once in canvas with high-quality smoothing — WebGL has no
      // mipmaps on these, so drawing an 800px source at ~120px would shimmer.
      const out = document.createElement('canvas');
      out.width = Math.max(1, Math.round(dispW * bake));
      out.height = Math.max(1, Math.round(dispH * bake));
      const ctx = out.getContext('2d')!;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(src, box.x, box.y, box.w, box.h, 0, 0, out.width, out.height);
      this.textures.addCanvas(procKey, out);
    } else {
      const tex = this.textures.get(procKey).getSourceImage();
      dispW = tex.width / bake;
      dispH = tex.height / bake;
    }
    const img = this.add.image(x, a.homeY, procKey).setOrigin(0.5, 1).setDisplaySize(dispW, dispH);
    if (a.side === 'right') img.setFlipX(true);
    a.sprite = img;
    a.baseSX = img.scaleX;
    a.baseSY = img.scaleY;
  }

  // Entrance beat: a summoning circle opens on the platform in the curio's
  // element, a light column rises, and the curio materializes out of it —
  // dropping onto the platform (or rising into its hover, for floaters).
  // Used for battle start, every switch/send-out, and revives.
  private enter(a: Actor) {
    const s = a.sprite;
    if (!s) return;
    a.fainted = false;
    a.collapsed = false;
    this.tweens.killTweensOf(s);
    if (s instanceof Phaser.GameObjects.Image) s.clearTint();
    s.setAngle(0);
    const now = this.time.now;
    const delay = now - this.lastEnterAt < 300 ? 450 : 0;
    this.lastEnterAt = now + delay;
    a.busy = true;
    const x = this.sideX[a.side];
    const tints = BURST_TINTS[a.mon.element];
    s.setPosition(x, a.mon.floats ? a.homeY + 14 : a.homeY - 42).setAlpha(0).setScale(a.baseSX * 0.3, a.baseSY * 0.3);

    const gy = this.ground[a.side];
    const d = this.depth[a.side];
    const circle = this.add.ellipse(x, gy, 150 * d, 38 * d).setStrokeStyle(4, tints[2]).setFillStyle(tints[1], 0.3)
      .setDepth(-0.5).setScale(0).setAlpha(0);
    this.tweens.add({ targets: circle, scale: 1, alpha: 1, duration: 260, delay, ease: 'Back.easeOut' });
    const column = this.add.rectangle(x, gy, 96 * d, gy * 0.9, tints[1]).setOrigin(0.5, 1)
      .setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.85).setScale(1, 0);
    this.tweens.add({ targets: column, scaleY: 1, duration: 200, delay: delay + 220, ease: 'Quad.easeOut' });
    this.tweens.add({
      targets: column, scaleX: 0, alpha: 0, duration: 280, delay: delay + 540, ease: 'Quad.easeIn',
      onComplete: () => column.destroy(),
    });

    this.time.delayedCall(delay + 420, () => {
      if (this.actors[a.side] !== a) return;
      this.flashSelf(a, [0xffffff], 0.9);
      this.burst(x, a.homeY - Math.abs(s.displayHeight) * 0.5, tints, 0.7);
      this.tweens.add({ targets: s, alpha: 1, duration: 120 });
      this.tweens.add({
        targets: s, scaleX: a.baseSX * 1.12, scaleY: a.baseSY * 1.12, duration: 200, ease: 'Back.easeOut',
        onComplete: () => this.tweens.add({ targets: s, scaleX: a.baseSX, scaleY: a.baseSY, duration: 160, ease: 'Sine.easeOut' }),
      });
      this.tweens.add({
        targets: s, y: a.homeY, duration: a.mon.floats ? 420 : 260, ease: a.mon.floats ? 'Sine.easeOut' : 'Quad.easeIn',
        onComplete: () => {
          if (!a.mon.floats) {
            this.groundRing(x, gy, tints, d, false);
            this.cameras.main.shake(70, 0.003);
          }
        },
      });
    });
    this.tweens.add({ targets: circle, alpha: 0, scale: 1.2, duration: 320, delay: delay + 900, onComplete: () => circle.destroy() });
    this.time.delayedCall(delay + 1000, () => this.finish(a));
  }

  // HP hits 0 when the killing move STARTS (the screen sends HP with it), so
  // don't collapse yet — the finishing blow's impact runs knockOut. Fallback
  // for a faint with no incoming blow (shouldn't happen, but never leave a
  // 0-HP curio standing).
  private faint(a: Actor, instant = false) {
    a.fainted = true;
    const s = a.sprite;
    if (!s) return;
    if (instant) {
      a.collapsed = true;
      this.stopIdle(a);
      this.tweens.killTweensOf(s);
      s.setAlpha(0);
      return;
    }
    this.time.delayedCall(1600, () => {
      if (this.actors[a.side] !== a || !a.fainted || a.collapsed || a.impactAt > this.time.now) return;
      this.collapse(a);
    });
  }

  // The finishing blow: knocked back hard and lifted, then collapses.
  private knockOut(a: Actor, force: number) {
    const s = a.sprite!;
    a.collapsed = true; // any later hits are ignored
    a.busy = true;
    if (a.idle) { a.idle.remove(); a.idle = null; }
    this.tweens.killTweensOf(s);
    const dir = a.side === 'left' ? -1 : 1;
    if (s instanceof Phaser.GameObjects.Image) s.setTint(0xff5a5a);
    this.tweens.add({
      targets: s, x: this.sideX[a.side] + dir * (60 * force) / CURIO_SIZE_WEIGHT[a.mon.size], y: a.homeY - 26,
      angle: dir * 10, scaleX: a.baseSX * 1.1, scaleY: a.baseSY * 0.86, duration: 260, ease: 'Quad.easeOut',
      onComplete: () => this.collapse(a),
    });
  }

  // Grey out, tip over, sink, and fade — with a dust puff and a few motes
  // drifting up as it goes.
  private collapse(a: Actor) {
    const s = a.sprite;
    if (!s) return;
    a.collapsed = true;
    a.busy = true;
    if (a.idle) { a.idle.remove(); a.idle = null; }
    this.tweens.killTweensOf(s);
    const dir = a.side === 'left' ? -1 : 1;
    if (s instanceof Phaser.GameObjects.Image) s.setTint(0x6a6a6a);
    this.tweens.add({
      targets: s, y: this.ground[a.side] + 18, angle: dir * 16, scaleY: a.baseSY * 0.7, scaleX: a.baseSX * 1.08,
      duration: 380, ease: 'Quad.easeIn',
      onComplete: () => {
        this.groundRing(s.x, this.ground[a.side], [0xfffaf0, 0xd8c8a8, 0x8a7a5a], 1.2, false);
        const dust = this.spawnParticles(s.x, this.ground[a.side], 'bstage-spark', {
          x: { min: -40, max: 40 }, speedX: { min: -90, max: 90 }, speedY: { min: -70, max: -15 }, lifespan: 600,
          scale: { start: 0.9, end: 0 }, alpha: { start: 0.7, end: 0 }, tint: [0xd8c8a8, 0xb8a888], emitting: false,
        });
        dust.explode(16);
        const motes = this.spawnParticles(s.x, s.y - 30, 'bstage-spark', {
          x: { min: -30, max: 30 }, speedY: { min: -60, max: -25 }, lifespan: 1100,
          scale: { start: 0.5, end: 0 }, alpha: { start: 0.9, end: 0 }, tint: [0xffffff, 0xe6e0ff], blendMode: 'ADD', emitting: false,
        });
        motes.explode(10);
        this.time.delayedCall(1300, () => { dust.destroy(); motes.destroy(); });
        this.tweens.add({ targets: s, alpha: 0, duration: 420, ease: 'Quad.easeIn' });
      },
    });
  }

  // ─── Slow motion ────────────────────────────────────────────────────────

  private spawnParticles(x: number, y: number, key: string, cfg: Phaser.Types.GameObjects.Particles.ParticleEmitterConfig) {
    const p = this.add.particles(x, y, key, cfg);
    p.timeScale = this.slowFactor;
    return p;
  }

  private enterSlowMo() {
    if (this.slowFactor !== 1) return;
    this.slowFactor = SLOWMO;
    this.time.timeScale = SLOWMO;
    this.tweens.timeScale = SLOWMO;
    this.tweens.killTweensOf(this.vignette);
    // Durations here are scene time, so scale them to stay quick in real time.
    this.tweens.add({ targets: this.vignette, alpha: 0.42, duration: 180 * SLOWMO });
  }

  // Real-time (setTimeout), since scene timers are the thing being slowed.
  private exitSlowMoIn(realMs: number) {
    if (this.slowTimer) clearTimeout(this.slowTimer);
    this.slowTimer = setTimeout(() => {
      this.slowTimer = null;
      if (!this.sys?.isActive()) return;
      this.slowFactor = 1;
      this.time.timeScale = 1;
      this.tweens.timeScale = 1;
      this.tweens.killTweensOf(this.vignette);
      this.tweens.add({ targets: this.vignette, alpha: 0, duration: 380 });
    }, realMs);
  }

  private startIdle(a: Actor) {
    const s = a.sprite;
    if (!s || a.fainted || a.busy) return;
    this.stopIdle(a);
    const w = CURIO_SIZE_WEIGHT[a.mon.size];
    s.setPosition(this.sideX[a.side], a.homeY).setScale(a.baseSX, a.baseSY);
    a.idle = a.mon.floats
      ? this.tweens.add({ targets: s, y: a.homeY - FLOAT_BOB_PX, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
      : this.tweens.add({
          targets: s, scaleY: a.baseSY * 1.03, scaleX: a.baseSX * 0.988,
          duration: Math.round(1100 * w), yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        });
  }

  private stopIdle(a: Actor) {
    if (a.idle) { a.idle.remove(); a.idle = null; }
    a.sprite?.setScale(a.baseSX, a.baseSY);
    if (a.sprite && !a.busy) a.sprite.y = a.homeY;
  }

  private react(a: Actor, force: number) {
    const s = a.sprite!;
    const homeX = this.sideX[a.side];
    const dir = a.side === 'left' ? -1 : 1; // knocked away from the attacker
    const knock = (34 * force) / CURIO_SIZE_WEIGHT[a.mon.size];
    this.stopIdle(a);
    a.busy = true;
    if (s instanceof Phaser.GameObjects.Image) s.setTint(0xff6a6a);
    this.tweens.add({ targets: s, alpha: 0.35, duration: 55, yoyo: true, repeat: 2 });
    this.tweens.add({
      targets: s, x: homeX + dir * knock, scaleX: a.baseSX * 1.08, scaleY: a.baseSY * 0.88, duration: 90, ease: 'Quad.easeOut',
      onComplete: () => this.tweens.add({
        targets: s, x: homeX, scaleX: a.baseSX, scaleY: a.baseSY, duration: 380, ease: 'Back.easeOut',
        onComplete: () => {
          if (s instanceof Phaser.GameObjects.Image) s.clearTint();
          s.setAlpha(1);
          a.busy = false;
          this.startIdle(a);
        },
      }),
    });
  }

  private dodge(a: Actor) {
    const s = a.sprite!;
    const homeX = this.sideX[a.side];
    const dir = a.side === 'left' ? -1 : 1;
    this.stopIdle(a);
    a.busy = true;
    this.tweens.add({
      targets: s, x: homeX + dir * 26, y: a.homeY - 16, duration: 130, ease: 'Quad.easeOut', yoyo: true,
      onComplete: () => { s.setPosition(homeX, a.homeY); a.busy = false; this.startIdle(a); },
    });
  }

  private burst(x: number, y: number, tints: number[], force: number) {
    const p = this.spawnParticles(x, y, 'bstage-spark', {
      speed: { min: 120 * force, max: 330 * force }, angle: { min: 0, max: 360 },
      lifespan: { min: 280, max: 650 }, scale: { start: 1.25 * force, end: 0 }, alpha: { start: 1, end: 0 },
      tint: tints, blendMode: 'ADD', emitting: false,
    });
    p.explode(Math.round(36 + 14 * force));
    this.time.delayedCall(900, () => p.destroy());
    const ring = this.add.circle(x, y, 12).setStrokeStyle(7, tints[1]).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: ring, scale: 6.5 * force, alpha: 0, duration: 380, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
  }

  private floatText(x: number, y: number, text: string, color: string) {
    const t = this.add.text(x, y, text, {
      fontFamily: this.fontFamily, fontSize: '36px', color, stroke: '#2a1406', strokeThickness: 7,
      resolution: this.res,
    }).setOrigin(0.5).setScale(0.4);
    this.tweens.add({ targets: t, scale: 1.05, duration: 140, ease: 'Back.easeOut' });
    this.tweens.add({ targets: t, y: y - 60, alpha: 0, delay: 420, duration: 620, ease: 'Quad.easeIn', onComplete: () => t.destroy() });
  }

  private destroyActor(a: Actor) {
    if (a.idle) a.idle.remove();
    if (a.sprite) { this.tweens.killTweensOf(a.sprite); a.sprite.destroy(); }
    a.shadow.destroy();
  }
}

function dirOf(side: Side): 1 | -1 {
  return side === 'left' ? 1 : -1;
}

function other(side: Side): Side {
  return side === 'left' ? 'right' : 'left';
}

// Opaque bounding box (alpha > 20) of a loaded image, so size classes measure
// the creature itself rather than its file's transparent padding.
function opaqueBounds(img: HTMLImageElement): { x: number; y: number; w: number; h: number } {
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, w, h).data;
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) {
    const row = y * w * 4;
    for (let x = 0; x < w; x++) {
      if (data[row + x * 4 + 3] > 20) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return { x: 0, y: 0, w, h };
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}
