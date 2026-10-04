// lib/intro/storyPrefetch.ts
//
// Starts downloading the origin story's opening beats (art + voice) before
// the story itself mounts, so its loading bar (StoryPlayer in
// components/intro/OriginStory.tsx) usually never shows. Called from the
// signup form once the kid starts filling it in, and from Dashboard as soon as
// it knows the account has no curio (the intro also waits on the week's data).
// Everything goes through lib/assetPreload.ts, so StoryPlayer reuses the same
// downloads instead of fetching again.
import { ORIGIN_BEATS, beatAssets } from '@/lib/intro/originStory';
import { preloadAudio, preloadImage } from '@/lib/assetPreload';
import { isVoiceEnabled } from '@/lib/sounds';

// Matches StoryPlayer's FIRST_GATE: the beats it waits for before opening.
const OPENING_BEATS = 2;

export function prefetchOriginStoryStart() {
  const voice = isVoiceEnabled();
  for (const beat of ORIGIN_BEATS.slice(0, OPENING_BEATS)) {
    const { images, audio } = beatAssets(beat);
    for (const src of images) void preloadImage(src);
    if (voice) for (const src of audio) void preloadAudio(src);
  }
}
