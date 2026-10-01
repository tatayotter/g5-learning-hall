// lib/intro/termBossStory.ts
//
// Script + beat data for the Term Boss intro (components/intro/TermBossIntro.tsx),
// the voiced story that opens "The Trial of the Forgetting" once per player,
// grade and term. Script: docs/intro/term-boss-intro.md (v2, approved).
//
// Same conventions as lib/intro/originStory.ts: every spoken line's clip is
// voiceSrc(id) (ids start with "tb_"), missing clips fall back to reading
// time, and `text` doubles as the ElevenLabs script (numbers as words).
// The Forgetting's lines use the same voice as the fight taunts (lib/bossTaunts.ts).
//
// Scene art lives at /intro/tb_<name>.webp (user-generated from the prompts in
// the production notes); `fallback` is the closest first-intro scene.
import type { Beat, BeatArt } from '@/lib/intro/originStory';

const OMEN_ART: BeatArt = { src: '/intro/tb_omen.webp', fallback: '/intro/ledger_hall.webp' };
// The same hall once the Forgetting has split into its shadows: drained gray
// and full of mist, behind the face-down boss cards.
const SHADOWS_ART: BeatArt = { ...OMEN_ART, drained: true };
// The partner beat draws the kid's Curio over this, like the first intro's
// spell/count beats draw Solarch: open space at the top center.
const ARENA_ART: BeatArt = { src: '/intro/forgetting_void.webp', fallback: '/welcome-hero.webp', drained: true };

export const TERM_BOSS_BEATS: Beat[] = [
  {
    id: 'omen',
    enterCue: 'omen',
    art: OMEN_ART,
    lines: [
      { id: 'tb_omen_1', speaker: 'narrator', text: 'Keeper. Wake up. Something is wrong with the Ledger.' },
      { id: 'tb_omen_2', speaker: 'narrator', text: 'Every page you wrote this term, every word, every number, every lesson you learned, is starting to fade.' },
    ],
    interaction: { kind: 'tap', label: 'Go to the Ledger', cue: 'toLedger' },
  },
  {
    id: 'fading',
    art: { src: '/intro/tb_fading.webp', fallback: '/intro/the_forgetting.webp' },
    lines: [
      { id: 'tb_fading_1', speaker: 'tala', text: 'Damien, look! The pages we filled are going blank!' },
      { id: 'tb_fading_2', speaker: 'damien', text: 'It\'s the Forgetting. It came back, and it\'s stronger than before.' },
      { id: 'tb_fading_3', speaker: 'narrator', text: 'At the end of every term, the Forgetting returns to steal back everything you learned.' },
    ],
    interaction: { kind: 'tap', label: 'Protect the pages', cue: 'protectPages' },
  },
  {
    id: 'whisper',
    enterCue: 'whisperIn',
    art: { src: '/intro/tb_whisper.webp', fallback: '/intro/the_forgetting.webp' },
    lines: [
      { id: 'tb_whisper_1', speaker: 'forgetting', text: 'Why hold on so tightly, little Keeper? Remembering is so much work.' },
      { id: 'tb_whisper_2', speaker: 'forgetting', text: 'Close your books. Rest. Let it all slip away, and it will all be mine.' },
    ],
    interaction: {
      kind: 'refuse',
      give: 'Let it go',
      refuse: 'Never!',
      scold: { id: 'tb_whisper_scold', speaker: 'narrator', text: 'Don\'t listen to it, Keeper!' },
    },
    after: [
      { id: 'tb_whisper_3', speaker: 'tala', text: 'We will never stop remembering!' },
    ],
  },
  {
    id: 'shadows',
    art: SHADOWS_ART,
    lines: [
      { id: 'tb_shadows_1', speaker: 'narrator', text: 'The Forgetting has split itself into shadows, one for every subject you studied this term.' },
      { id: 'tb_shadows_2', speaker: 'narrator', text: 'Each shadow feeds on the lessons of its subject. Tap each one to see what you\'re up against.' },
    ],
    interaction: { kind: 'shadows' },
    after: [
      { id: 'tb_shadows_3', speaker: 'damien', text: 'The Silent Word. The Null. Ang Limot. They\'re all here.' },
    ],
  },
  {
    id: 'weapon',
    art: { src: '/intro/tb_weapon.webp', fallback: '/intro/keepers_call.webp' },
    lines: [
      { id: 'tb_weapon_1', speaker: 'tala', text: 'But we have a weapon. Everything we learned this term!' },
      { id: 'tb_weapon_2', speaker: 'narrator', text: 'In battle, every correct answer lets your Curio strike. Answer right again and again, and its attacks grow stronger.' },
      { id: 'tb_weapon_3', speaker: 'narrator', text: 'But every wrong answer costs you a heart. Let\'s practice. What does the Forgetting want to take from you?' },
    ],
    interaction: {
      kind: 'strike',
      choices: ['Everything I learned', 'My gold', 'My Curio'],
      answer: 'Everything I learned',
      hearts: 3,
      retry: { id: 'tb_weapon_retry', speaker: 'damien', text: 'No! It wants what you learned. Try again!' },
    },
    after: [
      { id: 'tb_weapon_4', speaker: 'narrator', text: 'Well struck! And if your hearts ever run out, don\'t give up. Go back to your lessons and try again. The Forgetting only wins if you stop.' },
    ],
  },
  {
    id: 'partner',
    art: ARENA_ART,
    lines: [
      { id: 'tb_partner_1', speaker: 'narrator', text: 'You will not fight alone. Your Curio grew strong because you learned. Now it will fight beside you.' },
    ],
    interaction: { kind: 'partner', label: 'Ready, partner!' },
  },
  {
    id: 'sealed',
    enterCue: 'sealGlow',
    art: { src: '/intro/tb_sealed.webp', fallback: '/intro/forgetting_void.webp' },
    lines: [
      { id: 'tb_sealed_1', speaker: 'narrator', text: 'Every shadow you defeat pushes the mist back from the world. Defeat them all, and the seal will break.' },
      { id: 'tb_sealed_2', speaker: 'narrator', text: 'Inside it sleeps a rare Curio that the Forgetting stole. Free it, and it will join you.' },
    ],
    interaction: { kind: 'tap', label: 'I\'ll set it free!', cue: 'setFree' },
  },
  {
    id: 'charge',
    art: { src: '/intro/tb_charge.webp', fallback: '/intro/keepers_call.webp' },
    lines: [
      { id: 'tb_charge_1', speaker: 'tala', text: 'We\'ll be right behind you!' },
      { id: 'tb_charge_2', speaker: 'damien', text: 'Show the Forgetting what you remember!' },
      { id: 'tb_charge_3', speaker: 'narrator', text: 'The Ledger is counting on you, Keeper. The Trial of the Forgetting begins now.' },
    ],
    interaction: { kind: 'tap', label: 'Face the Forgetting', cue: 'charge' },
  },
];
