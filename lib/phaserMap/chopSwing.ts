// lib/phaserMap/chopSwing.ts
// The kid chopping a tree, as a real move of their whole body, not just a flash on the tree.
//
// While the chop panel is open the kid stands ready: turned to the tree, axe resting on the
// shoulder (hold()). Each answer is one swing (swing(), timed by swingTiming() in
// lib/gardenConfig.ts):
// - wind-up: they lean back and crouch a little while the axe goes up high behind them;
// - strike: they lunge toward the tree as the axe comes down fast;
// - contact (hit): everything freezes for a beat (the hit-stop that makes a blow feel solid),
//   the tree reacts (WildTrees.swing()), and the axe and the kid rock back from the blow;
// - miss: the axe swings right through with a motion smear, and they stumble forward and
//   catch themselves;
// - recover: they settle back into the ready stance.
// The blow that fells a tree winds up higher and longer and lands harder.
//
// The body moves through `pose`, which the scene adds to the player's sprite each frame (it's
// placed every frame, so tweening the sprite itself would be overwritten). The tool is the one
// the kid owns (setTool()): public/gear/held_<tool>_<tier>.png, made from Rowil's shop art by
// /mnt/project-files/economy-art/build_held.py, upright, head on top, held near the bottom of the
// handle. public/garden/axe.png is the fallback.
//
// strike() is one blow at a find picked with a pickaxe (hammered down onto it) or a shovel (dug
// straight down into it), moved around the find rather than the kid.
import Phaser from 'phaser';
import { STRIKE_LEAD_MS as STRIKE_LEAD, swingTiming, type SwingKind } from '@/lib/gardenConfig';
import type { ToolId } from '@/lib/gearConfig';

// mirror: the art's blade faces left, so it's flipped to lead with the edge when chopping to the right.
interface HeldTool { key: string; url: string; grip: { x: number; y: number }; mirror?: boolean }

// The fallback axe; the hand's spot is a share of the art's width and height.
const PLAIN_AXE: HeldTool = { key: 'garden:axe', url: '/garden/axe.png', grip: { x: 5 / 14, y: 18 / 21 } };

// The hand's spot (share of width) in each held tool, tiers 1-4, as build_held.py printed it.
// Every one is 21 px tall with the hand 2 px above the end of the handle. (held_rod_1-4.png,
// 26 px tall, wait for fishing.)
const HELD_GRIP_X: Partial<Record<ToolId, number[]>> = {
  axe: [0.714, 0.615, 0.577, 0.679],
  pickaxe: [0.575, 0.595, 0.575, 0.568],
  shovel: [0.556, 0.683, 0.683, 0.611],
};

function heldTool(tool: ToolId, tier: number): HeldTool | null {
  const xs = HELD_GRIP_X[tool];
  if (!xs || tier < 1) return null;
  const t = Math.min(tier, xs.length);
  return { key: `gear:held_${tool}_${t}`, url: `/gear/held_${tool}_${t}.png`, grip: { x: xs[t - 1], y: 0.833 }, mirror: tool === 'axe' };
}

// Axe angles for one tree, in degrees (0 = upright, clockwise). The blow lands where the blade
// points at the trunk, and every other pose is measured from that, so a tree beside, above or
// below the kid is chopped the same way, just turned toward it.
interface Aim { strike: number; rest: number; down: number; side: number; ux: number; uy: number }

function aimAt(dx: number, dy: number, side: number): Aim {
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len;
  // The blade points along angle - 90; aim it a touch above the trunk's middle, like a real
  // chop that bites in and down.
  const strike = Phaser.Math.RadToDeg(Math.atan2(uy, ux)) + 90 - side * 12;
  return { strike, rest: strike - side * 106, down: strike - side * 168, side, ux, uy };
}

export interface BodyPose {
  // Art pixels (32 a tile) and degrees, added to the player's sprite.
  dx: number;
  dy: number;
  angle: number;
  // Which way to face while chopping: 1 right, -1 left, 0 leave it to the movement.
  face: number;
}

export default class ChopSwing {
  readonly pose: BodyPose = { dx: 0, dy: 0, angle: 0, face: 0 };
  private axe: Phaser.GameObjects.Image | null = null;
  private tools: Partial<Record<ToolId, number>> = {};
  private tool: HeldTool = PLAIN_AXE;
  private side = 1;
  private aim: Aim = aimAt(1, 0, 1);
  private treeId: string | null = null;
  private readonly still: boolean;

  constructor(
    private scene: Phaser.Scene,
    // Map-unit container in front of the players (WildTrees.tools).
    private container: Phaser.GameObjects.Container,
    private loadTexture: (key: string, url: string, onReady: () => void) => void,
  ) {
    this.still = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  }

  get holding() { return this.treeId; }

  /** The tier the kid owns of each tool (0 or missing = none). Their art loads now, so a swing
   *  never waits on it. */
  setTools(tiers: Partial<Record<ToolId, number>>) {
    this.tools = tiers;
    for (const tool of Object.keys(HELD_GRIP_X) as ToolId[]) {
      const held = heldTool(tool, tiers[tool] ?? 0);
      if (held) this.loadTexture(held.key, held.url, () => {});
    }
  }

  /** Stand ready to chop the tree at trunk tile (tx, ty), the kid at float tile (px, py). */
  hold(treeId: string, tx: number, ty: number, px: number, py: number, facingRight: boolean, toolId: ToolId = 'axe', onReady?: () => void) {
    if (this.treeId === treeId && this.axe) return;
    this.putAway(true);
    this.treeId = treeId;
    const held = heldTool(toolId, this.tools[toolId] ?? 0) ?? PLAIN_AXE;
    this.tool = held;
    const GRIP = held.grip;
    this.side = tx > px + 0.3 ? 1 : tx < px - 0.3 ? -1 : facingRight ? 1 : -1;
    this.pose.face = this.side;
    this.aim = aimAt(tx - px, ty - py, this.side);
    this.loadTexture(held.key, held.url, () => {
      if (this.treeId !== treeId || this.axe || this.tool !== held) return;
      const { side: s, ux, uy, rest, down } = this.aim;
      // Held in front of the body on the tree's side, at about hip height, blade toward the tree.
      const flip = (s < 0) !== !!held.mirror;
      const axe = this.scene.add.image((px + 0.5) * 32 + ux * 6, (py + 0.5) * 32 + 6 + uy * 4, held.key)
        .setOrigin(flip ? 1 - GRIP.x : GRIP.x, GRIP.y).setFlipX(flip).setAngle(down).setAlpha(0);
      this.container.add(axe);
      this.axe = axe;
      // Brought up, ready.
      this.scene.tweens.add({ targets: axe, angle: rest, alpha: 1, duration: this.still ? 0 : 260, ease: 'Back.easeOut', onComplete: onReady });
    });
  }

  /**
   * One blow with a pickaxe or shovel at the find on tile (tx, ty), moved around the find, not
   * the kid: the pickaxe hammers down onto it from above, the shovel digs straight down into it
   * and levers the dirt up. onImpact runs when it lands (straight away if the tool can't be shown).
   * Timed like hold() + one 'hit' swing, so strikeImpactMs() in lib/gardenConfig.ts matches.
   */
  strike(id: string, tool: ToolId, tx: number, ty: number, px: number, py: number, facingRight: boolean, onImpact: () => void) {
    const held = heldTool(tool, this.tools[tool] ?? 0);
    if (this.still || !held || (tool !== 'pickaxe' && tool !== 'shovel')) { onImpact(); return; }
    this.putAway(true);
    this.treeId = id;
    this.tool = held;
    const s = tx > px + 0.3 ? 1 : tx < px - 0.3 ? -1 : facingRight ? 1 : -1;
    this.side = s;
    this.pose.face = s;
    let landed = false;
    const land = () => { if (!landed) { landed = true; onImpact(); } };
    this.loadTexture(held.key, held.url, () => {
      if (this.treeId !== id || this.axe) { land(); return; }
      const t = swingTiming('hit');
      const tw = this.scene.tweens;
      const pose = this.pose;
      // The find sits low in its tile.
      const cx = (tx + 0.5) * 32, cy = (ty + 0.5) * 32 + 6;
      const img = this.scene.add.image(0, 0, held.key)
        .setOrigin(s > 0 ? held.grip.x : 1 - held.grip.x, held.grip.y).setFlipX(s < 0).setAlpha(0);
      this.container.add(img);
      this.axe = img;
      // Grip to the head's middle, and how far the head's points reach out from it.
      const reach = img.height * held.grip.y - 3;
      const done = () => {
        if (this.axe !== img) return;
        tw.add({ targets: img, alpha: 0, duration: 160, onComplete: () => { img.destroy(); if (this.axe === img) this.putAway(true); } });
      };

      if (tool === 'pickaxe') {
        // Handle level beside the find at the blow, so the lower point lands on top of it.
        const gx = cx - s * reach, gy = cy - img.width * 0.42;
        img.setPosition(gx, gy - 4).setAngle(s * 40);
        tw.add({ targets: img, alpha: 1, y: gy - 3, angle: s * 10, duration: STRIKE_LEAD, ease: 'Sine.easeOut' });
        // Raised high over the find, then down hard onto it.
        tw.add({ targets: img, delay: STRIKE_LEAD, y: gy - 5, angle: -s * 30, duration: t.windUp, ease: 'Sine.easeOut' });
        tw.add({ targets: pose, delay: STRIKE_LEAD, dy: 1, angle: -s * 4, duration: t.windUp, ease: 'Sine.easeOut' });
        tw.add({ targets: img, delay: STRIKE_LEAD + t.windUp, y: gy, angle: s * 92, duration: t.strike, ease: 'Quad.easeIn' });
        tw.add({ targets: pose, delay: STRIKE_LEAD + t.windUp, dx: s * 2, dy: 1, angle: s * 6, duration: t.strike, ease: 'Quad.easeIn' });
        this.scene.time.delayedCall(STRIKE_LEAD + t.impact, () => {
          if (this.axe !== img) { land(); return; }
          this.burst(cx, cy - 2, 0xffffff, 5, false);
          this.scene.time.delayedCall(t.freeze, () => {
            land();
            // Stays on the find a moment, then bounces off it a little.
            tw.add({ targets: img, delay: 120, y: gy - 3, angle: s * 72, duration: 140, ease: 'Back.easeOut' });
            tw.add({ targets: pose, dx: 0, dy: 0, angle: 0, duration: 260, delay: 160, ease: 'Sine.easeInOut' });
            this.scene.time.delayedCall(420, done);
          });
        });
        return;
      }

      // Shovel: blade down over the find, pushed straight in, then the handle tips back to lift the dirt.
      const gx = cx + s * 2, gy = cy - reach - 1;
      img.setPosition(gx, gy - 10).setAngle(s * 160);
      tw.add({ targets: img, alpha: 1, y: gy - 8, angle: s * 168, duration: STRIKE_LEAD, ease: 'Sine.easeOut' });
      tw.add({ targets: img, delay: STRIKE_LEAD, y: gy - 13, angle: s * 172, duration: t.windUp, ease: 'Sine.easeOut' });
      tw.add({ targets: pose, delay: STRIKE_LEAD, dy: -1, duration: t.windUp, ease: 'Sine.easeOut' });
      tw.add({ targets: img, delay: STRIKE_LEAD + t.windUp, y: gy + 3, angle: s * 178, duration: t.strike, ease: 'Quad.easeIn' });
      tw.add({ targets: pose, delay: STRIKE_LEAD + t.windUp, dx: s * 1, dy: 2, angle: s * 5, duration: t.strike, ease: 'Quad.easeIn' });
      this.scene.time.delayedCall(STRIKE_LEAD + t.impact, () => {
        if (this.axe !== img) { land(); return; }
        this.burst(cx, cy, 0x7a5230, 6, true);
        this.scene.time.delayedCall(t.freeze, () => {
          land();
          // Lever: the handle tips back and the blade comes up with its load.
          tw.add({ targets: img, y: gy - 6, angle: s * 205, duration: 220, ease: 'Sine.easeOut' });
          tw.add({ targets: pose, dx: -s * 1, dy: 0, angle: -s * 4, duration: 220, ease: 'Sine.easeOut' });
          tw.add({ targets: pose, delay: 240, dx: 0, angle: 0, duration: 200, ease: 'Sine.easeInOut' });
          this.scene.time.delayedCall(360, done);
        });
      });
    });
  }

  /** Done chopping: lower the axe and let the movement face the kid again. */
  putAway(now = false) {
    const axe = this.axe;
    this.axe = null;
    this.treeId = null;
    this.pose.face = 0;
    this.scene.tweens.add({ targets: this.pose, dx: 0, dy: 0, angle: 0, duration: 150 });
    if (!axe) return;
    this.scene.tweens.killTweensOf(axe);
    if (now) { axe.destroy(); return; }
    this.scene.tweens.add({ targets: axe, angle: this.aim.down, alpha: 0, duration: 220, ease: 'Quad.easeIn', onComplete: () => axe.destroy() });
  }

  /** One swing. onImpact runs when the blade meets the trunk (not on a miss). */
  swing(kind: SwingKind, onImpact: () => void) {
    const axe = this.axe;
    if (!axe || this.still) { if (kind !== 'miss') onImpact(); return; }
    const t = swingTiming(kind);
    const { side: s, ux, uy, strike, rest } = this.aim;
    const heavy = kind === 'felled';
    const tw = this.scene.tweens;
    const pose = this.pose;
    tw.killTweensOf(axe);
    tw.killTweensOf(pose);
    const settle = (delay: number, duration: number) => {
      tw.add({ targets: axe, angle: rest, duration, delay, ease: 'Sine.easeInOut' });
      tw.add({ targets: pose, dx: 0, dy: 0, angle: 0, duration, delay, ease: 'Sine.easeInOut' });
    };

    // Wind-up: lean back, sink a little, axe high behind the head.
    const back = heavy ? 3 : 2;
    tw.add({ targets: pose, dx: -ux * back, dy: (heavy ? 2 : 1) - uy * back * 0.5, angle: -s * (heavy ? 9 : 6), duration: t.windUp, ease: 'Sine.easeOut' });
    tw.add({
      targets: axe, angle: strike - s * (heavy ? 228 : 203), duration: t.windUp, ease: 'Sine.easeOut',
      onComplete: () => {
        // Strike: lunge in as the axe comes down.
        const lunge = kind === 'miss' ? 5 : 3;
        tw.add({ targets: pose, dx: ux * lunge, dy: uy * lunge * 0.6, angle: s * (kind === 'miss' ? 12 : 8), duration: t.strike, ease: 'Quad.easeIn' });
        if (kind === 'miss') {
          this.smear(axe, strike + s * 72);
          tw.add({
            targets: axe, angle: strike + s * 72, duration: t.strike, ease: 'Quad.easeIn',
            onComplete: () => {
              // Overbalanced: a wobble forward and back before getting steady again.
              tw.add({ targets: pose, angle: s * 4, dx: ux * 2, dy: uy * 1.5, duration: 160, yoyo: true, ease: 'Sine.easeInOut' });
              tw.add({ targets: axe, angle: strike + s * 42, duration: 160, yoyo: true, ease: 'Sine.easeInOut' });
              settle(330, t.total - t.impact - 330);
            },
          });
          return;
        }
        tw.add({
          targets: axe, angle: strike, duration: t.strike, ease: 'Quad.easeIn',
          onComplete: () => {
            // Contact: freeze for a beat, then the blow lands and everything rocks back.
            this.spark(axe, heavy);
            this.scene.time.delayedCall(t.freeze, () => {
              onImpact();
              tw.add({ targets: axe, angle: strike - s * 28, duration: 120, ease: 'Back.easeOut' });
              tw.add({ targets: pose, dx: -ux, dy: -uy * 0.6, angle: -s * 2, duration: 120, ease: 'Quad.easeOut' });
              settle(160, t.total - t.impact - t.freeze - 160);
            });
          },
        });
      },
    });
  }

  // A white flash where the blade bites, during the freeze.
  private spark(axe: Phaser.GameObjects.Image, heavy: boolean) {
    const rad = Phaser.Math.DegToRad(axe.angle - 90);
    const reach = axe.height * 0.75 + 3;
    const x = axe.x + Math.cos(rad) * reach;
    const y = axe.y + Math.sin(rad) * reach;
    const n = heavy ? 6 : 4;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const bit = this.scene.add.rectangle(x, y, 2, 2, 0xffffff);
      this.container.add(bit);
      this.scene.tweens.add({
        targets: bit, x: x + Math.cos(a) * (heavy ? 9 : 6), y: y + Math.sin(a) * (heavy ? 9 : 6), alpha: 0,
        duration: 220, ease: 'Quad.easeOut', onComplete: () => bit.destroy(),
      });
    }
  }

  // Bits flying out where a pickaxe or shovel lands: sparks all round, or dirt thrown up.
  private burst(x: number, y: number, color: number, n: number, up: boolean) {
    for (let i = 0; i < n; i++) {
      const a = up ? Math.PI * (1.15 + 0.7 * (i / (n - 1))) : (i / n) * Math.PI * 2;
      const bit = this.scene.add.rectangle(x, y, 2, 2, color);
      this.container.add(bit);
      const d = up ? 7 + (i % 3) * 2 : 6;
      this.scene.tweens.add({
        targets: bit, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d + (up ? 3 : 0), alpha: 0,
        duration: up ? 320 : 220, ease: 'Quad.easeOut', onComplete: () => bit.destroy(),
      });
    }
  }

  // Two fading copies trailing a fast-moving axe.
  private smear(axe: Phaser.GameObjects.Image, end: number) {
    for (let i = 1; i <= 2; i++) {
      const ghost = this.scene.add.image(axe.x, axe.y, axe.texture.key).setOrigin(axe.originX, axe.originY)
        .setFlipX(axe.flipX).setAngle(axe.angle).setAlpha(0.35 / i).setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
      this.container.add(ghost);
      this.scene.tweens.add({ targets: ghost, angle: end - Math.sign(end - axe.angle) * i * 30, alpha: 0, duration: 140 + i * 60, ease: 'Quad.easeIn', onComplete: () => ghost.destroy() });
    }
  }

  destroy() {
    this.putAway(true);
  }
}
