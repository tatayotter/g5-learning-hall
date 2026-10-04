// Shrinks a photo in the browser before upload: longest side capped at MAX_EDGE, re-encoded as
// WebP (JPEG where the browser can't encode WebP, e.g. older Safari). Drawing to a canvas and
// re-encoding throws away all metadata, including the GPS location phones write into photos.
// createImageBitmap applies the EXIF rotation first, so portrait phone shots stay upright.
const MAX_EDGE = 1600;
const QUALITY = 0.82;

export type OptimizedImage = { file: File; width: number; height: number; originalBytes: number };

export async function optimizeImage(input: File): Promise<OptimizedImage> {
  const bitmap = await createImageBitmap(input, { imageOrientation: 'from-image' });
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('This browser cannot process images.');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const encode = (type: string) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, QUALITY));
  let blob = await encode('image/webp');
  // Browsers that can't encode WebP silently hand back a PNG instead.
  if (!blob || blob.type !== 'image/webp') blob = await encode('image/jpeg');
  if (!blob) throw new Error('Could not compress this image.');

  const ext = blob.type === 'image/webp' ? 'webp' : 'jpg';
  const base = input.name.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60) || 'photo';
  return { file: new File([blob], `${base}.${ext}`, { type: blob.type }), width, height, originalBytes: input.size };
}
