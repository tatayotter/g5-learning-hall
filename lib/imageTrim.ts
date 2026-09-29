// lib/imageTrim.ts
// Finds the opaque part of a curio sprite, so sizing measures the creature
// itself rather than however much transparent padding its file has. Shared
// by the Phaser battle stage and the (DOM) battle intro — kept free of any
// Phaser import so the intro doesn't pull the engine in.

// Opaque bounding box (alpha > 20) of a loaded image, so size classes measure
// the creature itself rather than its file's transparent padding.
export function opaqueBounds(img: HTMLImageElement): { x: number; y: number; w: number; h: number } {
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

// A trimmed copy of the image as a data URL plus its aspect ratio (w / h),
// for DOM <img> use. Same-origin art only (canvas reads its pixels).
export function trimToDataUrl(img: HTMLImageElement): { src: string; aspect: number } {
  const box = opaqueBounds(img);
  const c = document.createElement('canvas');
  c.width = box.w;
  c.height = box.h;
  c.getContext('2d')!.drawImage(img, box.x, box.y, box.w, box.h, 0, 0, box.w, box.h);
  return { src: c.toDataURL('image/png'), aspect: box.w / box.h };
}
