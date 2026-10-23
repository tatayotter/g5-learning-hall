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
// placed every frame, so tweening the sprite itself would be overwritten). The axe is
// public/garden/axe.png: upright, blade to the right, held at the bottom of its handle.
import Phaser from 'phaser';
import { swingTiming, type SwingKind } from '@/lib/gardenConfig';

// The hand's spot in the axe art (share of its width and height).
const GRIP = { x: 5 / 14, y: 18 / 21 };

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

  /** Stand ready to chop the tree at trunk tile (tx, ty), the kid at float tile (px, py). */
  hold(treeId: string, tx: number, ty: number, px: number, py: number, facingRight: boolean) {
    if (this.treeId === treeId && this.axe) return;
    this.putAway(true);
    this.treeId = treeId;
    this.side = tx > px + 0.3 ? 1 : tx < px - 0.3 ? -1 : facingRight ? 1 : -1;
    this.pose.face = this.side;
    this.aim = aimAt(tx - px, ty - py, this.side);
    this.loadTexture('garden:axe', '/garden/axe.png', () => {
      if (this.treeId !== treeId || this.axe) return;
      const { side: s, ux, uy, rest, down } = this.aim;
      // Held in front of the body on the tree's side, at about hip height.
      const axe = this.scene.add.image((px + 0.5) * 32 + ux * 6, (py + 0.5) * 32 + 6 + uy * 4, 'garden:axe')
        .setOrigin(s > 0 ? GRIP.x : 1 - GRIP.x, GRIP.y).setFlipX(s < 0).setAngle(down).setAlpha(0);
      this.container.add(axe);
      this.axe = axe;
      // Brought up, ready.
      this.scene.tweens.add({ targets: axe, angle: rest, alpha: 1, duration: this.still ? 0 : 260, ease: 'Back.easeOut' });
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
