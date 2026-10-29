// lib/missionStories.ts
// What a curio is up to on an idle mission (lib/curioMissions.ts): every mission tells a
// four-beat story that unlocks as time passes, so a kid checking back always finds something
// new on the card (components/monster/MissionsPanel.tsx). {name} is the curio's nickname or
// species name. Lines stay short and simple: they're read by grade-school kids on a phone.

export const BEAT_AT = [0, 0.25, 0.6, 0.9] as const; // share of the mission when each beat shows
export const BEAT_TITLES = ['Getting ready', 'On the way', 'Big moment', 'Heading home'] as const;

const STORIES: Record<string, readonly [string, string, string, string]> = {
  'Alphabet Alchemist': ['{name} is stirring a pot of letters.', '{name} turned a B into a bubble!', '{name} mixed A to Z into a shiny word potion.', '{name} bottled the potion to bring home.'],
  'Vowel Voyager': ['{name} is packing a boat for Vowel Bay.', '{name} spotted the islands A, E, I, O and U.', '{name} rescued a lost little Y from the waves.', '{name} is rowing back to shore.'],
  'Syllable Scout': ['{name} is lacing up for the Clap Trail.', '{name} counted the claps in "but-ter-fly".', '{name} found a word with five whole syllables!', '{name} is marching home, clap, clap.'],
  'Punctuation Pilot': ['{name} is warming up a paper plane.', "{name} dropped a full stop at a sentence's end.", '{name} caught a runaway question mark mid-air!', '{name} is gliding back to land.'],
  "The Storyteller's Scroll": ['{name} unrolled an old, empty scroll.', "{name} found the story's first clue in the library.", '{name} wrote the ending everyone was waiting for.', '{name} rolled up the scroll to share with you.'],
  'Manners Mentorship': ['{name} is practising "please" and "thank you".', '{name} held a door open for a sleepy owl.', '{name} helped two curios share their snacks.', '{name} got a thank-you card and is heading back.'],
  'Makabansa Messenger': ['{name} is packing letters for the next town.', '{name} delivered a letter to the town mayor.', "{name} learned a song about the country's heroes.", '{name} is bringing the reply letter home.'],
  'Adjective Artist': ['{name} is setting up paints by the river.', '{name} painted a "tall, green, wiggly" tree.', '{name} drew a picture with ten describing words.', '{name} is carrying the painting home carefully.'],
  'Word-Wise Wanderer': ['{name} is reading the map at the forest gate.', '{name} found a word that means two things.', '{name} solved the riddle on the Talking Stone.', '{name} is wandering back with a bag of new words.'],
  "The Catalyst's Observation": ['{name} put on goggles and grabbed a notebook.', '{name} saw ice turn into water in the sun.', '{name} watched a mix fizz and wrote it all down.', '{name} is bringing the notebook full of results.'],
  'Habitat Hiker': ['{name} filled a water bottle for a long hike.', '{name} met a frog who lives by the pond.', '{name} found where five animals make their homes.', '{name} is hiking home with nature notes.'],
  'Property Proctor': ['{name} is lining up rocks, ribbons and jars.', '{name} sorted the things that float from those that sink.', '{name} tested which things are hard, soft or bendy.', '{name} is packing up the test kit.'],
  "Curiosity's Clockwork": ['{name} is opening a big, ticking clock.', "{name} counted the clock's teeth: sixty little gears!", '{name} fixed the stuck hand, and the bells rang!', '{name} is winding the clock one last time.'],
  "Shape Shifter's Safari": ['{name} is packing binoculars for Shape Safari.', '{name} spotted a triangle hiding in a mountain.', '{name} found a hexagon herd in a beehive!', '{name} is driving back with photos of every shape.'],
  'Measurement Mountaineer': ['{name} is packing a ruler and a rope.', '{name} measured a boulder: 2 metres tall!', '{name} reached the top and measured the whole view.', '{name} is climbing down, step by careful step.'],
  'Fraction Fisher': ['{name} is baiting a hook by the lake.', '{name} caught half a fish... the other half swam off!', '{name} caught a pizza and split it into eighths.', '{name} is rowing home with a full net.'],
  'Arithmagic Expedition': ["{name} is checking the expedition's map of numbers.", '{name} crossed the Bridge of Twos by skip-counting.', '{name} opened the Number Vault with the right sum!', '{name} is bringing home treasure from the vault.'],
  "Critical Thinker's Trek": ['{name} is sharpening a pencil for the trek.', '{name} picked the safe path at the fork.', "{name} solved the giant's puzzle and crossed the bridge.", '{name} is trekking home, thinking happy thoughts.'],
  'Bayaning Bata Patrol': ['{name} is pinning on a shiny patrol badge.', '{name} helped a kid find a lost slipper.', '{name} cleaned the whole park with new friends.', '{name} is walking home, a real little hero.'],
  'Tech-Tool Trek': ['{name} is charging a tablet for the trek.', '{name} learned what a mouse and keyboard do.', '{name} fixed a robot by restarting it.', '{name} is downloading the trip photos to bring home.'],
};

// Added to beat 2 by the curio's element, so the same mission reads a little different per curio.
const ASIDES: Record<string, string> = {
  fire: '{name} kept everyone warm.',
  water: '{name} splashed through a stream.',
  leaf: '{name} made friends with a tree.',
  storm: '{name} zipped ahead in a gust.',
  shadow: '{name} found a secret path.',
  light: '{name} lit the way.',
};

const GENERIC: readonly [string, string, string, string] = ['{name} is packing for the trip.', '{name} is on the way and found a clue.', '{name} did something amazing!', '{name} is heading home.'];

/** How many beats have shown by `progress` (0..1): 1 to 4. */
export function beatsShown(progress: number): number {
  return BEAT_AT.filter(at => progress >= at).length;
}

/** The mission's story lines, beat by beat, with the curio's name in. */
export function missionStory(missionName: string, curioName: string, element?: string | null): string[] {
  const lines = [...(STORIES[missionName] ?? GENERIC)];
  const aside = element ? ASIDES[element] : null;
  if (aside) lines[1] = `${lines[1]} ${aside}`;
  return lines.map(l => l.replaceAll('{name}', curioName));
}
