// lib/intro/IntroFxScene.ts
// Transparent full-screen Phaser layer over the intro art, for battle-style
// impact moments (bursts, auras, guild beams, the re-inking splash, camera
// shake, flashes). Built from the same pieces as the battle stage
// (lib/phaserBattle/BattleStageScene.ts): the soft 'spark' texture, additive
// particle bursts, expanding rings, and the same per-element palette — so the
// intro feels like the battles kids are about to play.
//
// Positions are fractions of the screen (0..1), so callers don't care about
// the canvas size. Loaded lazily by components/intro/IntroFx.tsx; everything
// else talks to it through lib/intro/introFxRegistry.ts.
import Phaser from 'phaser';

import { FX_TINTS, type FxTints } from '@/lib/intro/fxTints';
export { FX_TINTS, type FxTints };

export default class IntroFxScene extends Phaser.Scene {
  private resolveReady!: () => void;
  readonly whenReady = new Promise<void>(r => { this.resolveReady = r; });
  private flashRect!: Phaser.GameObjects.Rectangle;
  private darkRect!: Phaser.GameObjects.Rectangle;

  constructor() {
    super({ key: 'intro-fx' });
  }

  create() {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    for (let r = 16; r > 0; r--) {
      g.fillStyle(0xffffff, 0.12 + 0.88 * (1 - r / 16) * 0.35);
      g.fillCircle(16, 16, r);
    }
    g.generateTexture('intro-spark', 32, 32);
    g.destroy();

    const { width, height } = this.scale;
    this.flashRect = this.add.rectangle(0, 0, width, height, 0xffffff).setOrigin(0, 0).setDepth(20)
      .setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
    this.darkRect = this.add.rectangle(0, 0, width, height, 0x0a0612).setOrigin(0, 0).setDepth(19).setAlpha(0);
    this.scale.on('resize', (size: Phaser.Structs.Size) => {
      this.flashRect.setSize(size.width, size.height);
      this.darkRect.setSize(size.width, size.height);
    });
    this.resolveReady();
  }

  private at(fx: number, fy: number) {
    return { x: fx * this.scale.width, y: fy * this.scale.height };
  }

  // Scales effects down on small (phone) screens so they don't swamp the art.
  private get unit() {
    return Math.max(0.6, Math.min(1.25, Math.min(this.scale.width, this.scale.height) / 700));
  }

  burst(fx: number, fy: number, tints: FxTints, force = 1) {
    const { x, y } = this.at(fx, fy);
    const f = force * this.unit;
    const p = this.add.particles(x, y, 'intro-spark', {
      speed: { min: 120 * f, max: 330 * f }, angle: { min: 0, max: 360 },
      lifespan: { min: 300, max: 700 }, scale: { start: 1.3 * f, end: 0 }, alpha: { start: 1, end: 0 },
      tint: [...tints], blendMode: 'ADD', emitting: false,
    });
    p.explode(Math.round(36 + 16 * force));
    this.time.delayedCall(1000, () => p.destroy());
    const ring = this.add.circle(x, y, 12).setStrokeStyle(7, tints[1]).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: ring, scale: 6.5 * f, alpha: 0, duration: 420, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
  }

  // Rising motes around a point (the battle's power-up aura).
  aura(fx: number, fy: number, tints: FxTints, ms = 900, spread = 140) {
    const { x, y } = this.at(fx, fy);
    const u = this.unit;
    const p = this.add.particles(x, y, 'intro-spark', {
      x: { min: -spread * u, max: spread * u }, y: { min: -20, max: 40 * u },
      speedY: { min: -200 * u, max: -70 * u }, lifespan: 800,
      scale: { start: 0.8 * u, end: 0 }, alpha: { start: 1, end: 0 }, tint: [tints[0], tints[1], tints[2]],
      blendMode: 'ADD', frequency: 16,
    });
    this.time.delayedCall(ms, () => p.stop());
    this.time.delayedCall(ms + 900, () => p.destroy());
  }

  rings(fx: number, fy: number, tints: FxTints, count = 2) {
    const { x, y } = this.at(fx, fy);
    for (let i = 0; i < count; i++) {
      this.time.delayedCall(i * 220, () => {
        const ring = this.add.ellipse(x, y, 80, 22).setStrokeStyle(5, tints[1]).setBlendMode(Phaser.BlendModes.ADD).setScale(0.5);
        this.tweens.add({ targets: ring, scaleX: 4 * this.unit, scaleY: 3 * this.unit, alpha: 0, duration: 520, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
      });
    }
  }

  // A glowing shield bubble (the battle's guard).
  shield(fx: number, fy: number, tints: FxTints, radius = 110) {
    const { x, y } = this.at(fx, fy);
    const r = radius * this.unit;
    const s = this.add.circle(x, y, r).setStrokeStyle(5, tints[2]).setFillStyle(tints[1], 0.16).setScale(0.2).setAlpha(0);
    this.tweens.add({ targets: s, scale: 1, alpha: 1, duration: 240, ease: 'Back.easeOut' });
    this.tweens.add({ targets: s, alpha: 0.55, duration: 160, delay: 260, yoyo: true, repeat: 1 });
    this.tweens.add({ targets: s, scale: 1.15, alpha: 0, duration: 300, delay: 950, onComplete: () => s.destroy() });
  }

  // A column of light shooting up from a point (the guild watchpost beams).
  beam(fx: number, fy: number, tints: FxTints) {
    const { x, y } = this.at(fx, fy);
    const w = 26 * this.unit;
    const core = this.add.rectangle(x, y, w, y + 40, tints[0]).setOrigin(0.5, 1).setBlendMode(Phaser.BlendModes.ADD).setScale(1, 0).setAlpha(0.9);
    const glow = this.add.rectangle(x, y, w * 3, y + 40, tints[1]).setOrigin(0.5, 1).setBlendMode(Phaser.BlendModes.ADD).setScale(1, 0).setAlpha(0.35);
    this.tweens.add({ targets: [core, glow], scaleY: 1, duration: 260, ease: 'Cubic.easeOut' });
    this.tweens.add({ targets: [core, glow], alpha: 0, scaleX: 0.3, duration: 700, delay: 380, onComplete: () => { core.destroy(); glow.destroy(); } });
    const motes = this.add.particles(x, y, 'intro-spark', {
      x: { min: -w, max: w }, speedY: { min: -520, max: -260 }, lifespan: 700,
      scale: { start: 0.7 * this.unit, end: 0 }, alpha: { start: 1, end: 0 }, tint: [...tints], blendMode: 'ADD', emitting: false,
    });
    motes.explode(22);
    this.time.delayedCall(900, () => motes.destroy());
  }

  // The re-inking: a heavy splash of gold and dark ink droplets that arc and fall.
  inkSplash(fx: number, fy: number) {
    const { x, y } = this.at(fx, fy);
    const u = this.unit;
    const drops = this.add.particles(x, y, 'intro-spark', {
      speed: { min: 260 * u, max: 620 * u }, angle: { min: 200, max: 340 }, gravityY: 900 * u,
      lifespan: { min: 700, max: 1200 }, scale: { start: 1.1 * u, end: 0.2 }, alpha: { start: 1, end: 0 },
      tint: [...FX_TINTS.ink], emitting: false,
    });
    drops.explode(90);
    this.time.delayedCall(1400, () => drops.destroy());
    this.burst(fx, fy, FX_TINTS.light, 1.6);
    this.rings(fx, fy + 0.05, FX_TINTS.ink, 3);
  }

  flash(color = 0xffffff, strength = 0.6, ms = 160) {
    this.flashRect.setFillStyle(color).setAlpha(0);
    this.tweens.add({ targets: this.flashRect, alpha: strength, duration: ms * 0.4, yoyo: true, hold: ms * 0.2 });
  }

  // A brief dimming of the whole screen (the Forgetting rolling in).
  darkPulse(strength = 0.55, ms = 900) {
    this.darkRect.setAlpha(0);
    this.tweens.add({ targets: this.darkRect, alpha: strength, duration: ms * 0.3, yoyo: true, hold: ms * 0.3, ease: 'Sine.easeInOut' });
  }

  shake(ms = 200, intensity = 0.006) {
    this.cameras.main.shake(ms, intensity);
  }
}
