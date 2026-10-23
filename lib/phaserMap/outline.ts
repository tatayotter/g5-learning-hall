// lib/phaserMap/outline.ts
// A one-art-pixel gold outline around a sprite frame, for the map object a kid is close enough
// to use (a ripe plant, a standing tree). It's four gold-filled copies of the frame, one art
// pixel off on each side, added to the container before the sprite itself so the sprite covers
// all but the rim. The copies come from a version of the art with only its solid pixels, so a
// see-through shadow baked into the art gets no outline.
import Phaser from 'phaser';

export const OUTLINE_COLOR = 0xffd23f;
export type Side = 'left' | 'right' | 'up' | 'down';
const OFFSET: Record<Side, [number, number]> = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };

export function addOutline(
  scene: Phaser.Scene,
  container: Phaser.GameObjects.Container,
  tex: string,
  frame: string,
  x: number,
  y: number,
  sides: Side[] = ['left', 'right', 'up', 'down'],
): Phaser.GameObjects.Image[] {
  const solid = solidTexture(scene, tex);
  const texture = scene.textures.get(solid);
  if (!texture.has(frame)) {
    const f = scene.textures.getFrame(tex, frame);
    texture.add(frame, 0, f.cutX, f.cutY, f.cutWidth, f.cutHeight);
  }
  return sides.map(side => {
    const [dx, dy] = OFFSET[side];
    const image = scene.add.image(x + dx, y + dy, solid, frame).setOrigin(0, 0)
      .setTint(OUTLINE_COLOR).setTintMode(Phaser.TintModes.FILL);
    container.add(image);
    return image;
  });
}

// The art with every part-transparent pixel (shadows) cleared, made once per texture.
function solidTexture(scene: Phaser.Scene, tex: string): string {
  const key = `${tex}:solid`;
  if (scene.textures.exists(key)) return key;
  const src = scene.textures.get(tex).getSourceImage() as CanvasImageSource & { width: number; height: number };
  const canvas = document.createElement('canvas');
  canvas.width = src.width;
  canvas.height = src.height;
  const g = canvas.getContext('2d')!;
  g.drawImage(src, 0, 0);
  const img = g.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 3; i < img.data.length; i += 4) img.data[i] = img.data[i] >= 200 ? 255 : 0;
  g.putImageData(img, 0, 0);
  scene.textures.addCanvas(key, canvas);
  return key;
}

// A slow glow, so the outline reads as "you can use this" rather than part of the art.
export const outlineAlpha = (now: number) => 0.75 + 0.25 * Math.sin((now / 700) * Math.PI);
