// lib/bossTaunts.ts
// What The Forgetting says during a Term Boss fight (components/monster/boss/BossArena.tsx).
// The personas are its shadows and never speak themselves: every line is The
// Forgetting talking through the shadow the kid is fighting, so the lines are
// unique per persona (about that subject) but all belong to one speaker and,
// once recorded, one voice. Text only for now.

export type TauntMoment = 'entry' | 'half' | 'lastHeart' | 'bossDefeated' | 'bossWins';

export const TAUNT_SPEAKER = 'The Forgetting';

type TauntSet = Record<TauntMoment, string>;

// Keyed by BossPersona.id (lib/bossPersonas.ts).
const PERSONA_TAUNTS: Record<string, TauntSet> = {
  silent_word: {
    entry: 'Every word you learned this term is coming undone, little Keeper. Soon you will not be able to read a thing.',
    half: 'You still remember your words? Then I will whisper louder.',
    lastHeart: 'One more slip, and your sentences go silent forever.',
    bossDefeated: 'No... the words are coming back... every single letter...',
    bossWins: 'Shh. Words are so heavy. Let them go quiet. Come back when you remember more.',
  },
  the_null: {
    entry: 'Every number you learned this term, I will turn into zero.',
    half: 'Still counting? Numbers were never meant to stay.',
    lastHeart: 'One more wrong answer, and everything adds up to nothing.',
    bossDefeated: 'Impossible... the numbers... they are adding up again...',
    bossWins: 'Zero. Nothing at all. Rest now. Come back when you remember more.',
  },
  ang_limot: {
    entry: 'The words of your own language, your stories and your songs. I will take them all.',
    half: 'You remember so much of your own language. For now.',
    lastHeart: 'One more mistake, and your words will scatter like feathers in the wind.',
    bossDefeated: 'No... the stories are flying back to you...',
    bossWins: 'Let the old words fly away. It is easier to forget. Come back when you remember more.',
  },
  entropya: {
    entry: 'Everything falls apart in the end, little Keeper. Your science lessons will too.',
    half: 'Still remembering how the world works? That will not last.',
    lastHeart: 'One more mistake, and your experiment is over.',
    bossDefeated: 'No... your lessons are growing back... stronger than before...',
    bossWins: 'Everything crumbles, even what you know. Come back when you remember more.',
  },
  hollow_conscience: {
    entry: 'Kindness. Honesty. Respect. Why work so hard to remember what is right?',
    half: 'You still know right from wrong. How annoying.',
    lastHeart: 'One more mistake, and you will forget what kind of Keeper you are.',
    bossDefeated: 'No... your good heart... I cannot reach it...',
    bossWins: 'See? It is easier to forget what is right. Come back when you remember more.',
  },
  erased_map: {
    entry: 'Your country, its places, its heroes, its history. I will erase them all from your map.',
    half: 'You still know where you come from? I will draw the map wrong again.',
    lastHeart: 'One more mistake, and you will be lost with no map to lead you home.',
    bossDefeated: 'No... the borders... the names... they are coming back...',
    bossWins: 'Places, heroes, history. All blank now. Come back when you remember more.',
  },
  corrupted_file: {
    entry: 'Every skill you saved this term. Corrupted. Deleted. Gone.',
    half: 'Still loading your lessons? I will crash them again.',
    lastHeart: 'One more error, and your memory is wiped clean.',
    bossDefeated: 'Error... error... your lessons are... restoring...',
    bossWins: 'File not found. Nothing saved. Come back when you remember more.',
  },
  wilted_root: {
    entry: 'Planting, cooking, building. Everything your hands learned, I will let it wither.',
    half: 'Your lessons keep growing back like weeds. How tiresome.',
    lastHeart: 'One more mistake, and everything you planted dries up.',
    bossDefeated: 'No... the roots... they are drinking again...',
    bossWins: 'Let it all wilt, little Keeper. Come back when you remember more.',
  },
  muted_muse: {
    entry: 'Music, art, play and good health. I will silence every one of them.',
    half: 'You are still keeping the beat? Not for long.',
    lastHeart: 'One more mistake, and the music stops for good.',
    bossDefeated: 'No... the song... it is playing again...',
    bossWins: 'Silence is so peaceful. Stay still. Come back when you remember more.',
  },
};

// For a persona added later without its own lines.
const FALLBACK_TAUNTS: TauntSet = {
  entry: 'You again, little Keeper? Everything you learned this term already belongs to me.',
  half: 'No... how do you still remember all of this?',
  lastHeart: 'One more mistake, and it all fades away.',
  bossDefeated: 'Impossible... the ink... it is coming back...',
  bossWins: 'See? Forgetting is so much easier. Come back when you remember more.',
};

export function getTaunt(personaId: string, moment: TauntMoment): string {
  return (PERSONA_TAUNTS[personaId] ?? FALLBACK_TAUNTS)[moment];
}
