// lib/assetPreload.ts
//
// Fetch-ahead for story sequences (StoryPlayer in components/intro/OriginStory.tsx)
// and voice clips, so a beat's art and voice are already on the phone when it
// opens — instead of starting the download the moment they're needed, which on
// mobile data shows as a black background and a silent pause.
//
// Audio is fetched with fetch() and kept as a blob: URL, not warmed with
// `new Audio()`: iOS Safari ignores audio preload and won't download a clip
// until play() is called, but it doesn't restrict fetch(). Playback still goes
// through a normal <audio> element (audioUrl), so it behaves exactly as before.
//
// Every load resolves — on success, error or timeout — so callers can wait on
// them without ever getting stuck; a missing file falls back the same way it
// did without preloading.

const IMAGE_TIMEOUT_MS = 15000;
const AUDIO_TIMEOUT_MS = 20000;

const images = new Map<string, Promise<void>>();
const audio = new Map<string, Promise<void>>();
// src -> blob: URL, for clips that finished downloading.
const audioBlobUrls = new Map<string, string>();

export function preloadImage(src: string): Promise<void> {
  let p = images.get(src);
  if (!p) {
    p = new Promise<void>(resolve => {
      const img = new Image();
      const timer = setTimeout(done, IMAGE_TIMEOUT_MS);
      function done() {
        clearTimeout(timer);
        img.onload = img.onerror = null;
        resolve();
      }
      img.onload = done;
      img.onerror = done;
      img.src = src;
    });
    images.set(src, p);
  }
  return p;
}

export function preloadAudio(src: string): Promise<void> {
  let p = audio.get(src);
  if (!p) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), AUDIO_TIMEOUT_MS);
    p = fetch(src, { signal: ctrl.signal })
      .then(r => (r.ok ? r.blob() : null))
      .then(b => { if (b) audioBlobUrls.set(src, URL.createObjectURL(b)); })
      .catch(() => {})
      .finally(() => clearTimeout(timer));
    audio.set(src, p);
  }
  return p;
}

// What to hand `new Audio()`: the downloaded copy when there is one, else
// the network URL (plays the old way).
export function audioUrl(src: string): string {
  return audioBlobUrls.get(src) ?? src;
}
