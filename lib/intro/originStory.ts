// lib/intro/originStory.ts
//
// Script + beat data for the first-curio intro (components/intro/OriginStory.tsx),
// adapted from "The Legend of the Ledger" (docs/lore/legend-of-the-ledger.md).
//
// Every spoken line has a stable `id`; its voice clip lives at
// voiceSrc(id) = /sounds/voice/intro/<id>.mp3. Missing clips are fine — the
// player just shows all captions at once — so lines can be recorded (or
// re-recorded) independently of this file. Write numbers as English words in
// `text`: it doubles as the ElevenLabs script, and ElevenLabs reads digits in
// Tagalog.
//
// Beat art lives at /intro/<name>.webp (generated separately); `fallback` is
// existing art shown until that file exists.
import type { Cue } from '@/lib/intro/introCues';

export type Speaker = 'narrator' | 'tala' | 'damien' | 'forgetting' | 'tatay';

export interface VoiceLine {
  id: string;
  speaker: Speaker;
  text: string;
}

export interface BeatArt {
  src: string;
  fallback: string;
  // 'contain' for a transparent sprite fallback (drawn over a glow), 'cover' for scenes.
  fallbackFit?: 'cover' | 'contain';
  // The Forgetting drains color out of whatever is on screen.
  drained?: boolean;
  // CSS object-position for the scene art. Phones in portrait only show a
  // narrow center slice of a 16:9 image, so off-center subjects need this.
  focus?: string;
}

export type BeatInteraction =
  | { kind: 'tap'; label: string; cue: Cue }
  | { kind: 'guilds' }
  | { kind: 'spell'; word: string }
  | { kind: 'count'; choices: number[]; answer: number; retry: VoiceLine }
  | { kind: 'oath'; pledges: string[] }
  // Term Boss intro (lib/intro/termBossStory.ts, components/intro/TermBossIntro.tsx):
  // refuse the Forgetting (the "give in" button crumbles and the narrator scolds);
  // flip the grade's boss cards; a practice strike with hearts; power up the kid's Curio.
  | { kind: 'refuse'; give: string; refuse: string; scold: VoiceLine }
  | { kind: 'shadows' }
  | { kind: 'strike'; choices: string[]; answer: string; hearts: number; retry: VoiceLine }
  | { kind: 'partner'; label: string }
  // Battle training (lib/intro/battleTraining.ts): tap the element your Curio beats.
  | { kind: 'elements'; retry: VoiceLine }
  // Keeper's Egg (lib/intro/keeperEgg.ts): warm the egg, see the 3-day
  // meter, turn on reminders, tap through the level-up / graduate / lay path.
  | { kind: 'warm' }
  | { kind: 'days' }
  | { kind: 'remind' }
  | { kind: 'grow' };

export interface Beat {
  id: string;
  art: BeatArt;
  // Art swapped in once the interaction is done (e.g. color flooding back).
  artAfter?: BeatArt;
  lines: VoiceLine[];
  // Sound + effect when the beat opens (lib/intro/introCues.ts); the first
  // voice line waits a moment so it doesn't talk over it.
  enterCue?: Cue;
  interaction: BeatInteraction;
  // Spoken after the interaction completes, followed by a Continue button.
  after?: VoiceLine[];
  afterLabel?: string;
  // Show the Solarch sprite over the art: how much of his color is back
  // (0 = fully gray, 1 = golden) when the beat starts and once it's done.
  // The spell beat fills it in letter by letter.
  solarch?: { start: number; end: number };
}

export const SPEAKERS: Record<Speaker, { name: string; color: string; portrait: string }> = {
  narrator: { name: 'The Lorekeeper', color: '#f5c542', portrait: '/npcs/lorekeeper.png' },
  tala: { name: 'Tala', color: '#f9a8d4', portrait: '/intro/portrait_tala.png' },
  damien: { name: 'Damien', color: '#7dd3fc', portrait: '/intro/portrait_damien.png' },
  // Never seen, only heard: its portrait is its mark (see BossArena's ForgettingMark).
  forgetting: { name: 'The Forgetting', color: '#d8c8ff', portrait: '/intro/portrait_forgetting.svg' },
  // Battle training (lib/intro/battleTraining.ts): the creator of Learning Hall.
  tatay: { name: 'Tatay', color: '#fb923c', portrait: '/tatay sprite.webp' },
};

export const voiceSrc = (id: string) => `/sounds/voice/intro/${id}.mp3`;

export const GUILDS = [
  { key: 'lorekeeper', name: 'Lorekeeper', subject: 'Reading and grammar', line: 'Where the stories of the world are kept.', color: '#34d399', npc: '/npcs/lorekeeper.png' },
  { key: 'spellcaster', name: 'SpellCaster', subject: 'Speed spelling', line: 'Where words are cast like spells.', color: '#a78bfa', npc: '/npcs/spellcaster.png' },
  { key: 'numberrealm', name: 'Number Realm', subject: 'Mathematics', line: 'Where the gears of the world keep turning.', color: '#fbbf24', npc: '/npcs/numberrealm.png' },
  { key: 'logiclabyrinth', name: 'Logic Labyrinth', subject: 'Puzzles and patterns', line: 'Where crooked thoughts are made straight.', color: '#22d3ee', npc: '/npcs/logiclabyrinth.png' },
  { key: 'lexiconarena', name: 'Lexicon Arena', subject: 'Spelling and meaning', line: 'Where words are sharpened like shields.', color: '#818cf8', npc: '/npcs/lexiconarena.png' },
] as const;

const FORGETTING_ART: BeatArt = { src: '/intro/the_forgetting.webp', fallback: '/welcome-hero.webp', drained: true, focus: '68% 50%' };
// The spell/count beats draw the Solarch sprite over the art, so their scenes
// are character-free with open space at the top center.
const VOID_ART: BeatArt = { src: '/intro/forgetting_void.webp', fallback: '/welcome-hero.webp', drained: true };
const REINKING_ART: BeatArt = { src: '/intro/reinking.webp', fallback: '/welcome-hero.webp' };

export const ORIGIN_BEATS: Beat[] = [
  {
    id: 'ledger',
    art: { src: '/intro/ledger_hall.webp', fallback: '/welcome-hero.webp', focus: '38% 50%' },
    lines: [
      { id: 'ledger_1', speaker: 'narrator', text: 'Gather close to the fire, little one. Before there were castles, or roads, or Guilds, there was only the Ledger.' },
      { id: 'ledger_2', speaker: 'narrator', text: 'A great book of endless pages, filled with living ink. Every sky, every river, every memory of our world was written inside it.' },
    ],
    interaction: { kind: 'tap', label: 'Open the Ledger', cue: 'openLedger' },
  },
  {
    id: 'crack',
    art: { src: '/intro/ledger_crack.webp', fallback: '/codex/ledger_header.webp' },
    lines: [
      { id: 'crack_1', speaker: 'narrator', text: 'One night, two young apprentices stood before the Ledger. Their names were Damien and Tala.' },
      { id: 'crack_2', speaker: 'tala', text: 'Damien, do you hear that? It sounds like a heartbeat.' },
      { id: 'crack_3', speaker: 'damien', text: 'The ink is moving too fast. The pages are too full. Don\'t touch it, Tala!' },
      { id: 'crack_4', speaker: 'narrator', text: 'But it was too late. With a sound like a tiny silver bell, a golden crack split the page.' },
    ],
    interaction: { kind: 'tap', label: 'Look into the crack', cue: 'crack' },
  },
  {
    id: 'solarch',
    enterCue: 'solarchAppear',
    art: { src: '/intro/solarch_birth.webp', fallback: '/monsters/solarch.webp', fallbackFit: 'contain', focus: '47% 50%' },
    lines: [
      { id: 'solarch_1', speaker: 'narrator', text: 'Out tumbled a tiny lion cub, glowing like the morning sun.' },
      { id: 'solarch_2', speaker: 'tala', text: 'The old rule says that when you find something new in the Ledger, you must give it a name to make it real.' },
      { id: 'solarch_3', speaker: 'damien', text: 'He acts like a little king. A sun king. Solarch!' },
      { id: 'solarch_4', speaker: 'narrator', text: 'And so Solarch became the very first Curio: a living memory, born from a page too full of life.' },
    ],
    interaction: { kind: 'tap', label: 'Welcome, Solarch', cue: 'welcomeSolarch' },
  },
  {
    id: 'fray',
    art: { src: '/intro/world_fraying.webp', fallback: '/maps/ledgers_heart.webp', focus: '60% 50%' },
    lines: [
      { id: 'fray_1', speaker: 'narrator', text: 'But the world was still new, and its edges were thin. One morning, the hills began to fray like an old cloak.' },
      { id: 'fray_2', speaker: 'damien', text: 'The world is unraveling! We have to hold it together!' },
    ],
    interaction: { kind: 'tap', label: 'Help the builders', cue: 'builders' },
  },
  {
    id: 'guilds',
    art: { src: '/intro/five_guilds.webp', fallback: '/maps/ledgers_heart.webp' },
    lines: [
      { id: 'guilds_1', speaker: 'narrator', text: 'So the Keepers built five Guilds, one over each tear in the world. Tap each Guild to light its tower.' },
    ],
    interaction: { kind: 'guilds' },
    after: [
      { id: 'guilds_2', speaker: 'narrator', text: 'Five beams of light rose into the sky, and the world held together. Remember these Guilds, Keeper. You will train in every one of them.' },
    ],
  },
  {
    id: 'forgetting',
    enterCue: 'forgettingIn',
    art: FORGETTING_ART,
    lines: [
      { id: 'forgetting_1', speaker: 'narrator', text: 'Many years passed, and people grew comfortable. Children stopped practicing. Books stayed closed. The great gears gathered dust.' },
      { id: 'forgetting_2', speaker: 'narrator', text: 'And in that lazy quiet, something crept in. Not a monster. Not an army. A pale, silent mist. The Forgetting.' },
      { id: 'forgetting_3', speaker: 'damien', text: 'The words in the books are disappearing! If we forget the words, the things they describe will vanish too!' },
      { id: 'forgetting_4', speaker: 'tala', text: 'Solarch is fading! He\'s turning gray!' },
    ],
    interaction: { kind: 'tap', label: 'Hold on, Solarch!', cue: 'holdOn' },
  },
  {
    id: 'spell',
    art: VOID_ART,
    solarch: { start: 0, end: 0.5 },
    lines: [
      { id: 'spell_1', speaker: 'tala', text: 'Every memory matters. If we remember his name, he stays real. Help me spell it!' },
    ],
    interaction: { kind: 'spell', word: 'SOLARCH' },
  },
  {
    id: 'count',
    art: VOID_ART,
    artAfter: REINKING_ART,
    solarch: { start: 0.5, end: 1 },
    lines: [
      { id: 'count_1', speaker: 'damien', text: 'The stairs are gone! But I remember them. Five steps down to the garden, and five steps up to the tower. How many steps is that?' },
    ],
    interaction: {
      kind: 'count',
      choices: [8, 10, 12],
      answer: 10,
      retry: { id: 'count_retry', speaker: 'damien', text: 'Hmm, count again. Five, and five more.' },
    },
    after: [
      { id: 'count_2', speaker: 'narrator', text: 'Ten! And with a splash, the living ink came rushing back. It carved the stairs, painted the grass, and chased the mist away.' },
    ],
  },
  {
    id: 'secret',
    enterCue: 'roar',
    art: { src: '/intro/solarch_restored.webp', fallback: '/welcome-hero.webp' },
    lines: [
      { id: 'secret_1', speaker: 'narrator', text: 'Solarch roared, and his light blazed brighter than ever. That day, Damien and Tala learned the Ledger\'s greatest secret.' },
      { id: 'secret_2', speaker: 'narrator', text: 'The Forgetting is always waiting for us to grow lazy. But every word you read, every word you spell, and every problem you solve re-inks the world.' },
      { id: 'secret_3', speaker: 'narrator', text: 'And the Curios sleeping in the stone can only wake when a child learns something new.' },
    ],
    interaction: { kind: 'tap', label: 'I understand', cue: 'understand' },
  },
  {
    id: 'oath',
    art: { src: '/intro/keepers_call.webp', fallback: '/welcome-hero.webp' },
    lines: [
      { id: 'oath_1', speaker: 'tala', text: 'We can\'t guard all five Guilds by ourselves.' },
      { id: 'oath_2', speaker: 'damien', text: 'Then we\'ll send a call to every child who is brave enough to learn.' },
      { id: 'oath_3', speaker: 'narrator', text: 'That call has traveled through the ages, all the way to you. Will you take the Keeper\'s Oath?' },
    ],
    interaction: { kind: 'oath', pledges: ['I will read.', 'I will practice.', 'I will remember.'] },
    after: [
      { id: 'oath_4', speaker: 'narrator', text: 'Then welcome, Keeper. The Ledger is open. The ink is wet. And a Curio is waiting to choose you.' },
    ],
    afterLabel: 'Meet my Curio',
  },
];

// Spoken during the training quest (components/intro/IntroTrainingQuest.tsx).
export const TRAINING_LINES = {
  notes: { id: 'training_notes', speaker: 'narrator', text: 'Your Curio is still sleepy, Keeper. Every quest has two parts. First, read the notes. Then, answer the quiz. Get every answer right to wake your Curio.' } as VoiceLine,
  victory: { id: 'training_victory', speaker: 'narrator', text: 'Well done, Keeper! Your first page of the Ledger is re-inked. Your weekly quests are waiting on the Campaign Map.' } as VoiceLine,
};
