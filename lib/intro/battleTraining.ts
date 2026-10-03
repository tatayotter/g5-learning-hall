// lib/intro/battleTraining.ts
//
// Script + beat data for battle training (components/monster/BattleTraining.tsx):
// the first Curio Arena visit brings a battle invite from Tatay. The Lorekeeper
// introduces him as the creator of Learning Hall, Tatay wins a coached fight
// (by design, the kid's first loss), then the Training Dummy fight teaches
// elements and ends in a win. Production notes: docs/intro/battle-training.md.
//
// Same conventions as lib/intro/originStory.ts: each line's clip is
// voiceSrc(id) (ids start with "bt_"), missing clips fall back to reading
// time, and `text` doubles as the ElevenLabs script (numbers as words).
import type { Beat, VoiceLine } from '@/lib/intro/originStory';
import type { Element } from '@/lib/monsterConfig';

// ── Tatay's fight ────────────────────────────────────────────────────────────

// Tatay "warms up" (answers nothing right) for these rounds so the coaching
// tips have time to play, then answers everything right and wins.
export const TATAY_WARMUP_ROUNDS = 2;
export const tatayAccuracy = (round: number) => (round <= TATAY_WARMUP_ROUNDS ? 0 : 1);
export const TATAY_TEAM = [
  { monsterId: 'emberwyrm', level: 100 },
  { monsterId: 'zephyrion', level: 100 },
  { monsterId: 'lexiwyrm', level: 100 },
];
export const TATAY_AVATAR = '/tatay sprite.webp';

// The Dummy mostly misses; on a rematch it never hits.
export const DUMMY_ACCURACY = 0.2;
export const DUMMY_REMATCH_ACCURACY = 0;
export const DUMMY_AVATAR = '/trainers/training_tester.png';

export const BATTLE_TRAINING_BONUS_GOLD = 100;

// A coaching tip shown over the live battle screen. `target` is the
// data-tutorial-id to spotlight (components/LiveBattleScreen.tsx), or null.
export interface CoachTip {
  key: string;
  target: 'battle-moves' | 'battle-utils' | 'battle-question' | null;
  lines: VoiceLine[];
}

export const TATAY_TIPS: Record<string, CoachTip> = {
  'select:1': {
    key: 'select:1',
    target: 'battle-moves',
    lines: [
      { id: 'bt_t1_arena', speaker: 'narrator', text: 'This is a Keeper battle. Your Curio is on the left, and Tatay\'s Curio is on the right.' },
      { id: 'bt_t1_skills', speaker: 'narrator', text: 'These are your skills. Each one asks you questions. The more questions, the stronger the attack. Pick one!' },
    ],
  },
  'question:1': {
    key: 'question:1',
    target: 'battle-question',
    lines: [
      { id: 'bt_t1_answer', speaker: 'narrator', text: 'Answer right and your Curio strikes. Get every question right for a perfect hit.' },
      { id: 'bt_t1_skip', speaker: 'narrator', text: 'Stuck on a hard one? You can pay five gold to skip it, and it counts as correct.' },
    ],
  },
  // Worded so it still fits an older player whose skills are all unlocked.
  'resolved:1': {
    key: 'resolved:1',
    target: 'battle-moves',
    lines: [
      { id: 'bt_t1_tickle', speaker: 'tatay', text: 'Ha! That tickles, Keeper. My Curios are level one hundred!' },
      { id: 'bt_t1_locked', speaker: 'narrator', text: 'Higher level Curios hit harder, and they unlock stronger skills. A locked skill opens when your Curio reaches the level shown on it.' },
    ],
  },
  'select:2': {
    key: 'select:2',
    target: 'battle-utils',
    lines: [
      { id: 'bt_t1_same_time', speaker: 'narrator', text: 'In a Keeper battle, you and your rival choose at the same time. The faster Curio strikes first.' },
      { id: 'bt_t2_hp', speaker: 'narrator', text: 'Watch the HP bars. When a Curio\'s HP runs out, it faints. If all your Curios faint, the battle is over.' },
      { id: 'bt_t2_utils', speaker: 'narrator', text: 'These buttons help too. Rest heals your Curio. Items use things from your bag. Switch sends in another Curio from your team.' },
    ],
  },
  'select:3': {
    key: 'select:3',
    target: null,
    lines: [
      { id: 'bt_t3_serious', speaker: 'tatay', text: 'Alright, Keeper. Warm-up is over. Let me show you what a level one hundred skill can do!' },
    ],
  },
};

export const DUMMY_TIPS: Record<string, CoachTip> = {
  'select:1': {
    key: 'select:1',
    target: 'battle-moves',
    lines: [
      { id: 'bt_d1_go', speaker: 'narrator', text: 'Your Curio\'s element beats the Training Dummy\'s. Every hit you land will do extra damage. Show it what you learned!' },
    ],
  },
  'resolved:1': {
    key: 'resolved:1',
    target: null,
    lines: [
      { id: 'bt_d1_bonus', speaker: 'narrator', text: 'See that big hit? That is the element bonus at work.' },
    ],
  },
};

export const DUMMY_RETRY_LINE: VoiceLine = { id: 'bt_d_retry', speaker: 'narrator', text: 'Even Keepers stumble. Take a breath, and let\'s try that again.' };

// ── Story beats (played by StoryPlayer, components/intro/OriginStory.tsx) ────

const TATAY_ART = { src: '/intro/bt_tatay.webp', fallback: '/intro/ledger_hall.webp' };

export const INVITE_BEATS: Beat[] = [
  {
    id: 'bt_challenger',
    art: TATAY_ART,
    lines: [
      { id: 'bt_intro_1', speaker: 'narrator', text: 'Keeper, you have a challenger. And not just any challenger.' },
      { id: 'bt_intro_2', speaker: 'narrator', text: 'This is Tatay. He built Learning Hall. Every guild, every quest, and every Curio in this arena came from him.' },
      { id: 'bt_intro_3', speaker: 'narrator', text: 'Tatay tests every new Keeper himself, before they battle anyone else.' },
      { id: 'bt_intro_4', speaker: 'tatay', text: 'So you\'re the new Keeper! Come on, show me what your Curio can do.' },
    ],
    interaction: { kind: 'tap', label: 'Accept the challenge', cue: 'readyToFight' },
  },
];

export const ELEMENT_ORDER: Element[] = ['fire', 'water', 'leaf', 'storm', 'light', 'shadow'];

// One clip per element: the kid's lead Curio decides which one plays.
// Written out (not templated) so tools/split_intro_vo.py can read them.
export const ELEMENT_QUESTION_LINES: Record<Element, VoiceLine> = {
  fire: { id: 'bt_elem_fire', speaker: 'narrator', text: 'Your Curio is a fire Curio. Look at the chart. Which element does fire beat?' },
  water: { id: 'bt_elem_water', speaker: 'narrator', text: 'Your Curio is a water Curio. Look at the chart. Which element does water beat?' },
  leaf: { id: 'bt_elem_leaf', speaker: 'narrator', text: 'Your Curio is a leaf Curio. Look at the chart. Which element does leaf beat?' },
  storm: { id: 'bt_elem_storm', speaker: 'narrator', text: 'Your Curio is a storm Curio. Look at the chart. Which element does storm beat?' },
  light: { id: 'bt_elem_light', speaker: 'narrator', text: 'Your Curio is a light Curio. Look at the chart. Which element does light beat?' },
  shadow: { id: 'bt_elem_shadow', speaker: 'narrator', text: 'Your Curio is a shadow Curio. Look at the chart. Which element does shadow beat?' },
};

export function defeatBeats(element: Element): Beat[] {
  return [
    {
      id: 'bt_defeat',
      art: TATAY_ART,
      lines: [
        { id: 'bt_lost_1', speaker: 'tatay', text: 'Good fight, Keeper! Don\'t feel bad. Nobody beats me on their first day.' },
        { id: 'bt_lost_2', speaker: 'tatay', text: 'Level up your Curio and you\'ll unlock stronger skills too. Then come back for a rematch!' },
        { id: 'bt_lost_3', speaker: 'narrator', text: 'Every Keeper\'s first battle is a loss. What matters is what you do next.' },
      ],
      interaction: { kind: 'tap', label: 'Get back up', cue: 'understand' },
    },
    {
      id: 'bt_elements',
      art: { src: '/intro/bt_elements.webp', fallback: '/intro/five_guilds.webp' },
      lines: [
        { id: 'bt_el_1', speaker: 'narrator', text: 'Time to practice on someone your own size. Meet the Training Dummy.' },
        { id: 'bt_el_2', speaker: 'narrator', text: 'Every Curio has an element: fire, water, leaf, storm, light, or shadow. Some elements are strong against others, and their attacks hit extra hard.' },
        ELEMENT_QUESTION_LINES[element],
      ],
      interaction: {
        kind: 'elements',
        retry: { id: 'bt_el_retry', speaker: 'narrator', text: 'Not quite. Follow the arrow from your Curio\'s element.' },
      },
      after: [
        { id: 'bt_el_after', speaker: 'narrator', text: 'That\'s right! Today the Training Dummy uses that element, so your attacks will hit it extra hard.' },
      ],
      afterLabel: 'Fight the Training Dummy',
    },
  ];
}

export function victoryBeats(firstTime: boolean): Beat[] {
  return [
    {
      id: 'bt_victory',
      art: { src: '/intro/bt_victory.webp', fallback: '/intro/solarch_restored.webp' },
      lines: [
        { id: 'bt_win_1', speaker: 'narrator', text: 'You did it, Keeper! You faced the creator of Learning Hall, and you beat the Training Dummy.' },
        { id: 'bt_win_2', speaker: 'narrator', text: 'Now you know how to battle. Challenge other Keepers from the Trainers list, and visit the Training Dummy whenever you want to practice.' },
        // Replays pay nothing, so Tatay's gold line only plays the first time.
        ...(firstTime ? [{ id: 'bt_win_3', speaker: 'tatay' as const, text: 'Here\'s a little gold to get you started. And when you\'re stronger, come find me for a rematch!' }] : []),
      ],
      interaction: { kind: 'tap', label: firstTime ? `Claim ${BATTLE_TRAINING_BONUS_GOLD} Gold` : 'Finish training', cue: 'oathDone' },
    },
  ];
}

// Every voiced line, in recording order (for the production doc's table).
export const ALL_BATTLE_TRAINING_LINES: VoiceLine[] = [
  ...INVITE_BEATS.flatMap(b => b.lines),
  ...Object.values(TATAY_TIPS).flatMap(t => t.lines),
  ...defeatBeats('fire').flatMap(b => [...b.lines.filter(l => !l.id.startsWith('bt_elem_')), ...(b.interaction.kind === 'elements' ? [b.interaction.retry] : []), ...(b.after ?? [])]),
  ...Object.values(ELEMENT_QUESTION_LINES),
  ...Object.values(DUMMY_TIPS).flatMap(t => t.lines),
  DUMMY_RETRY_LINE,
  ...victoryBeats(true).flatMap(b => b.lines),
];

// Where a kid who reloads mid-training picks back up: Tatay's fight is the
// lesson, so only getting past it is worth remembering.
const STAGE_PREFIX = 'lh_battle_training_stage';
export function loadResumeAtDummy(userId: string): boolean {
  try { return localStorage.getItem(`${STAGE_PREFIX}:${userId}`) === 'dummy'; } catch { return false; }
}
export function saveResumeAtDummy(userId: string, atDummy: boolean) {
  try {
    if (atDummy) localStorage.setItem(`${STAGE_PREFIX}:${userId}`, 'dummy');
    else localStorage.removeItem(`${STAGE_PREFIX}:${userId}`);
  } catch {
    // storage unavailable: a reload just starts training from Tatay again
  }
}
