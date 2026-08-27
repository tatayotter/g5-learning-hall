/**
 * Static content for the public "Guild Ledger" pages (/guilds and
 * /guilds/[slug]) — the parent-facing explainer for the 5 side-quest guilds.
 *
 * This mirrors lib/curriculum.ts's role for /curriculum, but is fully static:
 * unlike the Budget of Work (edited live in Supabase by admins), what each
 * guild trains, why, and its DepEd basis don't change session to session, so
 * there's no live data source to read from here.
 *
 * Guild mechanics referenced below (grade-stage ladder, correct-only
 * advancement, Time Attack format, Curio grant/evolution levels) come from
 * lib/guildEngine.ts and lib/monsterConfig.ts — keep this file's claims in
 * sync with those if the underlying mechanics ever change.
 */

import type { BlogPost } from '@/lib/blogPosts';

export const GUILD_SLUGS = [
  'lorekeeper',
  'spellcaster',
  'number-realm',
  'logic-labyrinth',
  'lexicon-arena',
] as const;

export type GuildSlug = (typeof GUILD_SLUGS)[number];

/**
 * A real sample question pulled from that guild's actual grade pool — either
 * a multiple-choice pick (Lorekeeper, Logic Labyrinth) or a typed answer
 * (SpellCaster, Number Realm, Lexicon Arena). `answer` is always shown, since
 * this is illustrating what the grade looks like, not quizzing the reader.
 */
export type GuildSample =
  | { kind: 'mcq'; prompt: string; options: string[]; answer: string }
  | { kind: 'type'; prompt: string; answer: string };

export type GuildRung = {
  grade: 2 | 3 | 4 | 5 | 6;
  topic: string;
  sample: GuildSample;
};

export type GuildCurioStage = {
  /** Guild level at which this stage is reached. */
  guildLevel: number;
  name: string;
  emoji: string;
  /** Filename (no extension) under /public/monsters/ — see lib/monsterConfig.ts spriteId. */
  spriteId: string;
  description: string;
};

/**
 * Pre-built Tailwind class strings (not template-interpolated) so the
 * arbitrary-value classes below are visible to Tailwind's source scanner —
 * see components rendering these directly via `className={guild.accent.x}`.
 */
export type GuildAccent = {
  text: string;
  hoverText: string;
  border: string;
  solidBg: string;
  wash: string;
  washBorder: string;
  tagBg: string;
  tagText: string;
  tagBorder: string;
};

export type GuildEntry = {
  slug: GuildSlug;
  name: string;
  emoji: string;
  /** Matches GuardianSprite's GuardianGuild — filename under /public/sidequests/. */
  guardianSlug: 'lorekeeper' | 'spellcaster' | 'numberrealm' | 'logiclabyrinth' | 'lexiconarena';
  subject: string;
  /** Matches BlogPost['guildKey'] naming (no separators) for /blog/topic/[key] links. */
  blogTopicKey: Exclude<BlogPost['guildKey'], 'resources'>;
  accent: GuildAccent;
  purpose: string;
  science: string;
  /** Slug of the BLOG_POSTS entry that expands the science paragraph above into a full, cited article. */
  sciencePostSlug: string;
  rungs: GuildRung[];
  depedTags: string[];
  curio: {
    tier1: GuildCurioStage;
    tier2: GuildCurioStage;
    tier3: GuildCurioStage;
  };
  earns: string;
};

const ACCENTS: Record<GuildSlug, GuildAccent> = {
  'lorekeeper': {
    text: 'text-[#3f7247]', hoverText: 'hover:text-[#3f7247]', border: 'border-[#3f7247]', solidBg: 'bg-[#3f7247]',
    wash: 'bg-[#eaf1e7]', washBorder: 'border-[#cfe0ca]',
    tagBg: 'bg-[#eaf1e7]', tagText: 'text-[#3f7247]', tagBorder: 'border-[#cfe0ca]',
  },
  'spellcaster': {
    text: 'text-[#5c4a86]', hoverText: 'hover:text-[#5c4a86]', border: 'border-[#5c4a86]', solidBg: 'bg-[#5c4a86]',
    wash: 'bg-[#eee9f5]', washBorder: 'border-[#d9cce8]',
    tagBg: 'bg-[#eee9f5]', tagText: 'text-[#5c4a86]', tagBorder: 'border-[#d9cce8]',
  },
  'number-realm': {
    text: 'text-[#23647f]', hoverText: 'hover:text-[#23647f]', border: 'border-[#23647f]', solidBg: 'bg-[#23647f]',
    wash: 'bg-[#e2eef2]', washBorder: 'border-[#c3dbe3]',
    tagBg: 'bg-[#e2eef2]', tagText: 'text-[#23647f]', tagBorder: 'border-[#c3dbe3]',
  },
  'logic-labyrinth': {
    text: 'text-[#4c5583]', hoverText: 'hover:text-[#4c5583]', border: 'border-[#4c5583]', solidBg: 'bg-[#4c5583]',
    wash: 'bg-[#e7e8f3]', washBorder: 'border-[#cfd1ea]',
    tagBg: 'bg-[#e7e8f3]', tagText: 'text-[#4c5583]', tagBorder: 'border-[#cfd1ea]',
  },
  'lexicon-arena': {
    text: 'text-[#9a6d16]', hoverText: 'hover:text-[#9a6d16]', border: 'border-[#9a6d16]', solidBg: 'bg-[#9a6d16]',
    wash: 'bg-[#f5ecd9]', washBorder: 'border-[#e6d3a8]',
    tagBg: 'bg-[#f5ecd9]', tagText: 'text-[#9a6d16]', tagBorder: 'border-[#e6d3a8]',
  },
};

export const GUILDS: GuildEntry[] = [
  {
    slug: 'lorekeeper',
    name: 'Lorekeeper',
    emoji: '📜',
    guardianSlug: 'lorekeeper',
    subject: 'Reading & general knowledge',
    blogTopicKey: 'lorekeeper',
    accent: ACCENTS['lorekeeper'],
    purpose:
      "Builds reading comprehension and broad general knowledge by pulling questions from across a child's other subjects — Science, Araling Panlipunan, English, Filipino, and values education — instead of drilling any one of them in isolation.",
    sciencePostSlug: 'testing-effect-why-quizzing-beats-rereading',
    science:
      "Lorekeeper leans on the testing effect: the well-replicated finding that actively recalling information (being asked a question and answering it) cements it in long-term memory far better than re-reading or re-watching the same material. Mixing subjects in one sitting also uses interleaving — switching between related topics instead of blocking one at a time — which research links to better long-term retention, even though it feels harder in the moment.",
    rungs: [
      {
        grade: 2, topic: 'Everyday reading and first general facts',
        sample: { kind: 'mcq', prompt: 'When does it become night?', options: ['When the sun is very bright', 'When our side turns away from the sun', 'At noon', 'Never'], answer: 'When our side turns away from the sun' },
      },
      {
        grade: 3, topic: 'Vocabulary and facts in short context passages',
        sample: { kind: 'mcq', prompt: 'Ang alamat na nagpapaliwanag kung bakit umuulan ay isang halimbawa ng', options: ['Kwentong bayan tungkol sa pinagmulan ng isang bagay sa kalikasan', 'Balitang pang-araw-araw', 'Talaan ng pangalan', 'Aklat-aralin sa agham'], answer: 'Kwentong bayan tungkol sa pinagmulan ng isang bagay sa kalikasan' },
      },
      {
        grade: 4, topic: 'Cross-subject knowledge — science, history, civics',
        sample: { kind: 'mcq', prompt: 'Which of these best shows understanding of why the Philippines has both mineral and marine resources?', options: ['Because it is made up of many islands surrounded by seas, with mountains and rock formations inland', 'Because it has no coastline at all', 'Because it is located in a desert region', 'Because it has no natural resources'], answer: 'Because it is made up of many islands surrounded by seas, with mountains and rock formations inland' },
      },
      {
        grade: 5, topic: 'Longer passages, multi-step comprehension',
        sample: { kind: 'mcq', prompt: "Why is the Philippine eagle's situation concerning?", options: ['It is not endangered', 'It is critically endangered and losing habitat', 'It is very common', 'It lives everywhere'], answer: 'It is critically endangered and losing habitat' },
      },
      {
        grade: 6, topic: 'Critical reading — inference, cause and effect',
        sample: { kind: 'mcq', prompt: 'Ang pahayag na nagsisimula sa pangkalahatang ideya patungo sa tiyak na konklusyon ay tinatawag na', options: ['Deduktibong pangangatwiran', 'Induktibong pangangatwiran', 'Bias', 'Tayutay'], answer: 'Deduktibong pangangatwiran' },
      },
    ],
    depedTags: ['MATATAG · Reading & Language', 'Science', 'Araling Panlipunan', 'GMRC'],
    curio: {
      tier1: {
        guildLevel: 5, name: 'Scryvyn', emoji: '📜', spriteId: 'scryvyn',
        description: 'The Scroll Wyrm — a small dragon made entirely of old study scrolls, with self-rewriting runes and a hooded cloak. It lives in libraries closed too long, eating forgotten footnotes.',
      },
      tier2: {
        guildLevel: 10, name: 'Lexiwyrm', emoji: '📚', spriteId: 'lexiwyrm',
        description: 'The scrolls have bound themselves into a spine of pages that never quite closes. It reads its own margins aloud, filing away everything its keeper has learned.',
      },
      tier3: {
        guildLevel: 20, name: 'ChroniLex', emoji: '🌌', spriteId: 'chronilex',
        description: 'A living archive that outgrew its shelf and started keeping the library instead. Its runes now trail off into the space between stars, cataloguing knowledge no one has asked for yet.',
      },
    },
    earns: 'A widening base of "things I just know" across subjects, plus Scryvyn — who levels up and evolves alongside every grade they clear.',
  },
  {
    slug: 'spellcaster',
    name: 'SpellCaster',
    emoji: '🖋️',
    guardianSlug: 'spellcaster',
    subject: 'English spelling',
    blogTopicKey: 'spellcaster',
    accent: ACCENTS['spellcaster'],
    purpose:
      "A straightforward typing game: hear or read a word, type it correctly before time runs out. It's deliberately simple by design — the goal is raw spelling automaticity, not a teaching moment.",
    sciencePostSlug: 'orthographic-mapping-why-spelling-practice-must-be-timed',
    science:
      "Spelling well frees up working memory for everything else writing requires — ideas, grammar, structure. When a child has to consciously puzzle out a spelling, that effort is coming out of the same mental budget they'd otherwise spend on composing a good sentence. Repeated, timed, correct production builds the word's orthographic pattern into fast, automatic recall, the same way multiplication tables need repetition before they become instant instead of calculated.",
    rungs: [
      { grade: 2, topic: 'Short, high-frequency everyday words', sample: { kind: 'type', prompt: 'Type the word', answer: 'sunshine' } },
      { grade: 3, topic: 'Consonant blends and digraphs', sample: { kind: 'type', prompt: 'Type the word', answer: 'rhyme' } },
      { grade: 4, topic: 'Prefixes, suffixes, multisyllable words', sample: { kind: 'type', prompt: 'Type the word', answer: 'constitution' } },
      { grade: 5, topic: 'The largest pool — broad general vocabulary', sample: { kind: 'type', prompt: 'Type the word', answer: 'moral' } },
      { grade: 6, topic: 'Academic and subject-specific vocabulary', sample: { kind: 'type', prompt: 'Type the word', answer: 'indispensable' } },
    ],
    depedTags: ['MATATAG · English', 'Spelling & Writing'],
    curio: {
      tier1: {
        guildLevel: 5, name: 'Inkybble', emoji: '🖋️', spriteId: 'inkybble',
        description: 'A tiny ink blot that spilled from an unfinished spell and learned to crawl. It hides in margins and erasures, feeding on crossed-out words and misspelled letters.',
      },
      tier2: {
        guildLevel: 10, name: 'Quillara', emoji: '🪶', spriteId: 'quillara',
        description: 'The ink has grown a spine of quills that write faster than thought. It leaves perfect sentences in its wake, correcting typos it hasn’t even seen yet.',
      },
      tier3: {
        guildLevel: 20, name: 'Astrypta', emoji: '🌑', spriteId: 'astrypta',
        description: 'A constellation of ink and eclipse, spelling out incantations no spellbook has printed. Where it drifts, unfinished spells finish themselves.',
      },
    },
    earns: 'Spelling that no longer takes conscious effort — and Inkybble, who grows from a smudge of ink into something considerably sharper.',
  },
  {
    slug: 'number-realm',
    name: 'Number Realm',
    emoji: '🐠',
    guardianSlug: 'numberrealm',
    subject: 'Mathematics',
    blogTopicKey: 'numberrealm',
    accent: ACCENTS['number-realm'],
    purpose:
      "Math word problems and computation, answered in whichever format fits the question — typed numbers, a fraction's numerator and denominator, or a time picker for elapsed-time problems.",
    sciencePostSlug: 'procedural-fluency-why-math-facts-need-to-be-automatic',
    science:
      "Just like spelling, shaky number facts eat into the working memory a child needs for the actual reasoning in a word problem. Building procedural fluency — instant recall of facts and operations — is what lets a child spend their thinking on the structure of a problem instead of the arithmetic inside it. The timed, repeated format is deliberately built for this: it's spaced retrieval practice for the number sense that everything later in math is built on top of.",
    rungs: [
      { grade: 2, topic: 'Place value, basic operations, money, time', sample: { kind: 'type', prompt: '55 + 27 = ?', answer: '82' } },
      { grade: 3, topic: 'Numbers to 10,000, area, multiplication, fractions', sample: { kind: 'type', prompt: 'What is the next number in the pattern: 164, 153, 142, 131, ___?', answer: '120' } },
      { grade: 4, topic: 'Numbers to 1,000,000, fraction operations, angles', sample: { kind: 'type', prompt: 'Which number is greater: 410,559 or 696,345?', answer: '696,345' } },
      { grade: 5, topic: 'Fractions, decimals, percent, measurement', sample: { kind: 'type', prompt: 'A train leaves at 3:15 PM and arrives 2 hours and 40 minutes later. What time does it arrive?', answer: '5:55 PM' } },
      { grade: 6, topic: 'Ratio, exponents, volume, circles, GCF/LCM', sample: { kind: 'type', prompt: '400.84 × 0.1 = ?', answer: '40.084' } },
    ],
    depedTags: ['MATATAG · Mathematics'],
    curio: {
      tier1: {
        guildLevel: 5, name: 'Digitot', emoji: '🐠', spriteId: 'digitot',
        description: 'A small fish whose scales are etched with tally marks. It counts its own bubbles as it swims.',
      },
      tier2: {
        guildLevel: 10, name: 'Sumray', emoji: '🐡', spriteId: 'sumray',
        description: 'Its tally-mark scales have multiplied into a puffed-up ledger of sums, bristling whenever a calculation comes up short.',
      },
      tier3: {
        guildLevel: 20, name: 'Infinifin', emoji: '🐋', spriteId: 'infinifin',
        description: 'A leviathan built from every number it has ever counted, so vast that some digits are still catching up to its tail.',
      },
    },
    earns: 'Number facts that stop requiring finger-counting, and Digitot growing right alongside their fluency.',
  },
  {
    slug: 'logic-labyrinth',
    name: 'Logic Labyrinth',
    emoji: '🧊',
    guardianSlug: 'logiclabyrinth',
    subject: 'Reasoning & puzzles',
    blogTopicKey: 'logiclabyrinth',
    accent: ACCENTS['logic-labyrinth'],
    purpose:
      "Pattern and sequence puzzles, analogies, “which one doesn’t belong,” and — from Grade 4 onward — ordering puzzles, simple logic (“if all X are Y…”), and word/number ciphers. Nothing here is tied to a school subject; it's reasoning for its own sake.",
    sciencePostSlug: 'fluid-intelligence-why-puzzles-build-real-thinking-skills',
    science:
      "This guild trains fluid intelligence — the ability to spot patterns and solve novel problems you haven't been explicitly taught how to solve, as opposed to crystallized intelligence, which is what you already know. Ordering and multi-clue puzzles also exercise working memory, since the child has to hold several constraints in mind at once to rule out wrong answers. The step up from simple analogies toward formal logical statements in the later grades mirrors children's real cognitive development, as they move from concrete to more abstract reasoning through upper elementary.",
    rungs: [
      { grade: 2, topic: 'Category matching, simple analogies', sample: { kind: 'mcq', prompt: 'Which animal is the biggest?', options: ['mouse', 'ant', 'rabbit', 'elephant'], answer: 'elephant' } },
      { grade: 3, topic: 'Number/letter sequences, 2-clue ordering', sample: { kind: 'mcq', prompt: 'What comes next? MM, OO, QQ, __', options: ['SS', 'RR', 'QQ', 'TT'], answer: 'SS' } },
      { grade: 4, topic: 'Multi-step sequences, syllogisms, simple ciphers', sample: { kind: 'mcq', prompt: 'Four runners: Hana beat Ivan. Ivan beat Jojo. Jojo beat Kyle. Who came in last place?', options: ['Jojo', 'Ivan', 'Hana', 'Kyle'], answer: 'Kyle' } },
      { grade: 5, topic: 'Layered reasoning across varied puzzle styles', sample: { kind: 'mcq', prompt: 'If all cats are animals, and Whiskers is a cat, what is Whiskers?', options: ['a plant', 'a rock', 'a robot', 'an animal'], answer: 'an animal' } },
      { grade: 6, topic: 'Formal logic, Venn reasoning, combinatorics', sample: { kind: 'mcq', prompt: 'What comes next? 6, 24, 120, 720, __', options: ['5040', '4032', '7200', '7560'], answer: '5040' } },
    ],
    depedTags: ['Critical thinking & problem solving', 'Not tied to one subject'],
    curio: {
      tier1: {
        guildLevel: 5, name: 'Quizzicube', emoji: '🧊', spriteId: 'quizzicube',
        description: 'A small cube built from shifting question-mark panels, each face humming with a different riddle. It rolls in place when stumped.',
      },
      tier2: {
        guildLevel: 10, name: 'Labrynthox', emoji: '🌀', spriteId: 'labrynthox',
        description: 'The cube has unfolded into a maze-backed beast, corridors running the length of its shell. Wrong turns echo through its body until the right path lights up.',
      },
      tier3: {
        guildLevel: 20, name: 'Infinitaze', emoji: '♾️', spriteId: 'infinitaze',
        description: 'A labyrinth given form, its passages looping back through themselves without end. It doesn’t solve puzzles anymore — it simply becomes the answer.',
      },
    },
    earns: 'Comfort sitting with a problem that isn’t immediately obvious — and Quizzicube, who clicks into sharper new shapes as they go.',
  },
  {
    slug: 'lexicon-arena',
    name: 'Lexicon Arena',
    emoji: '🦜',
    guardianSlug: 'lexiconarena',
    subject: 'Vocabulary, English & Filipino',
    blogTopicKey: 'lexiconarena',
    accent: ACCENTS['lexicon-arena'],
    purpose:
      "A definition is shown, and the child picks the correctly spelled word from four close-looking options — in a mix of English and Filipino. It's spelling and vocabulary at once, rather than either alone.",
    sciencePostSlug: 'dual-coding-why-meaning-and-spelling-should-be-learned-together',
    science:
      "Pairing a word's meaning with its written form in the same moment is a form of dual coding — learning sticks better when it's anchored to two different kinds of memory (in this case, semantic and orthographic) instead of one. Building this in both English and Filipino also mirrors how Filipino children actually acquire vocabulary — moving between two languages rather than mastering one in isolation.",
    rungs: [
      { grade: 2, topic: 'Everyday concrete vocabulary', sample: { kind: 'type', prompt: 'A device used to give light.', answer: 'lamp' } },
      { grade: 3, topic: 'Nature, community, values, basic grammar terms', sample: { kind: 'type', prompt: 'A family member who lived long ago', answer: 'ancestor' } },
      { grade: 4, topic: 'Literature terms, science, Philippine history, math', sample: { kind: 'type', prompt: 'Giving human qualities to a non-human thing', answer: 'personification' } },
      { grade: 5, topic: 'Broader academic and descriptive vocabulary', sample: { kind: 'type', prompt: 'A large, flat area of land higher than the surrounding land.', answer: 'plateau' } },
      { grade: 6, topic: 'Cell biology, geography, civics, grammar, math terms', sample: { kind: 'type', prompt: 'The state of being free from injury or danger', answer: 'safety' } },
    ],
    depedTags: ['MATATAG · English', 'Filipino'],
    curio: {
      tier1: {
        guildLevel: 5, name: 'Pollyglyph', emoji: '🦜', spriteId: 'pollyglyph',
        description: 'A fledgling parrot that mimics every word it hears until each one sprouts a tiny glowing glyph on its feathers.',
      },
      tier2: {
        guildLevel: 10, name: 'Squawkolar', emoji: '🦉', spriteId: 'squawkolar',
        description: 'It has traded mimicry for mastery, footnoting its own squawks with etymology no one asked for.',
      },
      tier3: {
        guildLevel: 20, name: 'Admiral Psquawk', emoji: '🦅', spriteId: 'admiral_psquawk',
        description: 'A decorated commander of every word ever spoken, barking corrections from a crow’s nest built out of dictionaries.',
      },
    },
    earns: 'A vocabulary that carries meaning, not just correct letters — and Pollyglyph, whose feathers fill with a few more glyphs every level.',
  },
];

export function getGuild(slug: string): GuildEntry | undefined {
  return GUILDS.find((g) => g.slug === slug);
}
