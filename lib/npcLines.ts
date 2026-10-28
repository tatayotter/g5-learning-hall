// lib/npcLines.ts
// What the town people (and the Recycler) say: lib/npcTalk.ts picks one that fits the kid.
// `when` lists the facts a line needs (all of them; '!fact' = must NOT be true):
//   quest_done / quest_waiting   today's Main Quest (map as home)
//   guild_done / guild_waiting   this guild master's guild today
//   first_today                  the first time this person greets the kid today
//   morning / noon / sunset / night
//   rain_here, rain:<region>     drizzle on this map / on that map right now
//   from:<region>                the wild map the kid just came back from
//   has_trash / can_trade / has_veggies / has_wood / has_shells / bag_empty
//   no_team / big_team           curios on the kid's team (none / 4 or more)
//   monday / friday / weekend
//   new_kid / veteran            level under 5 / 20 and up
//   here:<region>                the map the Recycler is on
// {name} is the kid's first name, filled in on the device.
// Kid-friendly: short, simple words, global English names.

export interface Line { say: string; when?: string[] }

/** Two (or three) lines back and forth: 'knight' is the Knight Commander, 'other' the soldier. */
export interface Exchange {
  /** Who he talks with: 'squad' (his marching soldiers) or a guard's id. */
  with: string;
  lines: ['knight' | 'other', string][];
  when?: string[];
}

const BAYLAN: Line[] = [
  { say: 'Good morning, {name}! A new quest just came in.', when: ['first_today', 'morning', 'quest_waiting'] },
  { say: 'Welcome back, {name}! Your quest is waiting for you.', when: ['first_today', 'quest_waiting'] },
  { say: 'Hello again, {name}! The town missed you.', when: ['first_today'] },
  { say: "Today's quest is ready. Tap me when you are!", when: ['quest_waiting'] },
  { say: 'A hero always starts with the Main Quest. Want to see it?', when: ['quest_waiting'] },
  { say: "Your quest won't bite, I promise. Let's go!", when: ['quest_waiting'] },
  { say: 'You finished today\'s quest! The guild masters want to see you.', when: ['quest_done'] },
  { say: 'Quest done! Look for a "?" over a guild master.', when: ['quest_done'] },
  { say: 'I will tell the whole town about your quest today!', when: ['quest_done'] },
  { say: 'Great job today, {name}. You make this old man proud.', when: ['quest_done'] },
  { say: 'The lamps are on. Even heroes need sleep, {name}!', when: ['night'] },
  { say: 'Look how the fountain sparkles at night.', when: ['night'] },
  { say: 'The sky turns orange at sunset. My favorite time!', when: ['sunset'] },
  { say: "Morning! The fountain is extra sparkly today.", when: ['morning'] },
  { say: 'You smell like smoke. Were you in the Cinderreach?', when: ['from:cinderreach'] },
  { say: 'Sand on your shoes! Back from the Tidewrit beach?', when: ['from:tidewrit_shallows'] },
  { say: 'Leaves in your hair! The Rootbound Wilds, I bet.', when: ['from:rootbound_wilds'] },
  { say: 'Windy out in the Stormrun, was it?', when: ['from:stormrun_reaches'] },
  { say: 'Did the shy eyes in the Unread Margins say hi?', when: ['from:unread_margins'] },
  { say: 'Back from the Radiant Archive? It shines so bright!', when: ['from:radiant_archive'] },
  { say: 'Friday! Finish the week strong, {name}.', when: ['friday'] },
  { say: 'A new week, a new story. Ready?', when: ['monday'] },
  { say: 'Weekend quests count too, you know!', when: ['weekend'] },
  { say: 'Did you know? The first guild masters built this fountain.' },
  { say: 'Every story starts with one brave step.' },
  { say: 'I have told a thousand stories. Yours is my favorite.' },
  { say: 'Have you met the Curio Expert? Nobody knows curios better.' },
  { say: 'The guards keep us safe. Well, most of them.' },
  { say: 'Learning is like walking. One step, then another.' },
];

const SPELLCASTER: Line[] = [
  { say: 'Ready to cast some spelling magic?', when: ['guild_waiting'] },
  { say: 'My spells need letters. Can you help me today?', when: ['guild_waiting'] },
  { say: 'Abra-ca-SPELL! Let\'s practice!', when: ['guild_waiting', 'quest_done'] },
  { say: 'Your spells were strong today. Well done!', when: ['guild_done'] },
  { say: 'You spelled like a real wizard today!', when: ['guild_done'] },
  { say: 'Good morning, young wizard!', when: ['first_today', 'morning'] },
  { say: 'At night my letters glow. Spooky, right?', when: ['night'] },
  { say: 'Magic tip: say the word slowly, then spell it.' },
  { say: '"Because" is a tricky one. Big Elephants Can Always Understand Small Elephants!' },
  { say: 'One wrong letter and POOF, my spell becomes a frog.' },
  { say: 'Even wizards make mistakes. We just try again.' },
  { say: 'My hat holds every word in the world. It is very heavy.' },
];

const NUMBER_REALM: Line[] = [
  { say: 'The Number Realm needs you! Ready to count?', when: ['guild_waiting'] },
  { say: 'My numbers are wobbly today. Can you fix them?', when: ['guild_waiting'] },
  { say: 'You solved my quest. Your brain is on fire!', when: ['guild_done'] },
  { say: 'Every number in the Realm is smiling because of you.', when: ['guild_done'] },
  { say: 'Good morning! 1, 2, 3, let\'s go!', when: ['first_today', 'morning'] },
  { say: 'At night I count the stars. I got to 4,281.', when: ['night'] },
  { say: 'Fun fact: zero was invented a long, long time ago.' },
  { say: 'Why was six afraid of seven? Because seven ate nine!' },
  { say: 'Math is a puzzle. Every puzzle has an answer.' },
  { say: 'Tip: when a problem is big, break it into small steps.' },
  { say: 'I like even numbers. But odd ones are fun too.' },
];

const LOREKEEPER: Line[] = [
  { say: 'A new story is waiting in my hall. Come read!', when: ['guild_waiting'] },
  { say: 'Every page you read keeps a story safe.', when: ['guild_waiting'] },
  { say: 'You read so well today. The books are happy!', when: ['guild_done'] },
  { say: 'Thank you for reading with me today, {name}.', when: ['guild_done'] },
  { say: 'Good morning! A story a day keeps boredom away.', when: ['first_today', 'morning'] },
  { say: 'Night is the best time for stories. Not scary ones!', when: ['night'] },
  { say: 'Tip: if you get lost in a story, read it again slowly.' },
  { say: 'Every book is a door to a new world.' },
  { say: 'I have read every book in my hall. Twice!' },
  { say: 'What happens next? That is the best question.' },
  { say: 'Look for clues in the story. They help you answer.' },
];

const LEXICON: Line[] = [
  { say: 'Ahoy! Ready to sail through today\'s words?', when: ['guild_waiting'] },
  { say: 'All hands on deck! New words to learn!', when: ['guild_waiting'] },
  { say: 'Your words were sharp today, sailor!', when: ['guild_done'] },
  { say: 'You sailed through my quest. Fine work, matey!', when: ['guild_done'] },
  { say: 'Morning, sailor! The sea of words is calm today.', when: ['first_today', 'morning'] },
  { say: 'Rain on the deck! A good day for new words.', when: ['rain_here'] },
  { say: 'At night, sailors follow the stars. And words!', when: ['night'] },
  { say: 'Word of the day: "voyage". It means a long trip!' },
  { say: 'A new word is like treasure. Keep it safe!' },
  { say: 'Tip: use a new word three times and it\'s yours.' },
  { say: 'My ship is called the Big Dictionary. Ha!' },
  { say: 'Land ho! Oh wait, I\'m in town. Never mind.' },
];

const LOGIC: Line[] = [
  { say: 'My maze has a new puzzle. Can you solve it?', when: ['guild_waiting'] },
  { say: 'Think, think, think! A puzzle is waiting.', when: ['guild_waiting'] },
  { say: 'You found the way out of my maze. Clever!', when: ['guild_done'] },
  { say: 'Puzzle solved! You think like a detective.', when: ['guild_done'] },
  { say: 'Good morning! Riddle time?', when: ['first_today', 'morning'] },
  { say: 'Riddle: what has hands but can\'t clap? A clock!' },
  { say: 'Riddle: what gets wetter the more it dries? A towel!' },
  { say: 'Riddle: what has keys but opens no doors? A piano!' },
  { say: 'Tip: if one way doesn\'t work, try another.' },
  { say: 'Every puzzle is just a question in disguise.' },
  { say: 'I once got lost in my own maze. For a whole day.' },
];

const SHOPKEEPER: Line[] = [
  { say: 'Welcome, welcome, {name}! New things on the shelf!', when: ['first_today'] },
  { say: 'Morning! The shop is open and the deals are hot!', when: ['first_today', 'morning'] },
  { say: 'Got veggies? The Recycler buys those. I sell the fancy stuff!', when: ['has_veggies'] },
  { say: 'Wood in your bag? Keep it. Builders will want it someday.', when: ['has_wood'] },
  { say: 'Curios love treats. Just saying!', when: ['big_team'] },
  { say: 'No curio yet? Every hero needs a buddy!', when: ['no_team'] },
  { say: 'Quests fill your pockets with gold. Then come see me!', when: ['quest_waiting'] },
  { say: 'You did your quest! A little treat, maybe?', when: ['quest_done'] },
  { say: 'Closing soon! Just kidding, I never close.', when: ['night'] },
  { say: 'Weekend sale! Okay, it\'s the same price. But happy weekend!', when: ['weekend'] },
  { say: 'Everything here is the best. I checked.' },
  { say: 'Look, but don\'t lick the potions.' },
  { say: 'My shop has the shiniest things in town!' },
  { say: 'A smart shopper saves gold for what they really want.' },
  { say: 'Come back soon! I\'ll miss you. And your gold.' },
];

const CURIO_EXPERT: Line[] = [
  { say: 'Hello, {name}! How is your curio team today?', when: ['first_today'] },
  { say: 'No curio yet? Let\'s find you a buddy!', when: ['no_team'] },
  { say: 'What a big team! You must take good care of them.', when: ['big_team'] },
  { say: 'Fire curios love the Cinderreach. So warm!', when: ['from:cinderreach'] },
  { say: 'Water curios splash around in Tidewrit. Did you see any?', when: ['from:tidewrit_shallows'] },
  { say: 'Leaf curios hide in the Rootbound trees. Look up!', when: ['from:rootbound_wilds'] },
  { say: 'Storm curios zip around in the wind!', when: ['from:stormrun_reaches'] },
  { say: 'Some curios only come out at night. Shh!', when: ['night'] },
  { say: 'Curios get stronger when you train them in quests.' },
  { say: 'Every curio is different. That\'s what makes them special.' },
  { say: 'Fun fact: a curio remembers every battle it fights.' },
  { say: 'Be kind to your curios. They try their best for you.' },
  { say: 'A Tracking Scroll can help you find a curio you want.' },
  { say: 'I wrote a book about curios. It has 900 pages!' },
];

// Rex, at the south gate: brave and kind.
const REX: Line[] = [
  { say: 'Good morning, {name}! The gate is safe with me.', when: ['first_today', 'morning'] },
  { say: 'Hello, {name}! Ready for an adventure?', when: ['first_today'] },
  { say: 'Going out? Be brave out there!' },
  { say: 'I\'m not afraid of anything! Except bad grammar.' },
  { say: 'No monster gets past this gate. Not on my watch!' },
  { say: 'Brave isn\'t not being scared. It\'s trying anyway!' },
  { say: 'You did your quest? That\'s real bravery!', when: ['quest_done'] },
  { say: 'Your quest first, hero. Then we explore!', when: ['quest_waiting'] },
  { say: 'It\'s dark, but I\'ll stand here all night.', when: ['night'] },
  { say: 'Rain in Tidewrit today. Bring your bravest boots!', when: ['rain:tidewrit_shallows'] },
  { say: 'Rain in the Rootbound Wilds. The trees love it!', when: ['rain:rootbound_wilds'] },
  { say: 'The road south goes to Ledger\'s Heart. Have fun!' },
  { say: 'You came back safe! I knew you would.', when: ['from:ledgers_heart'] },
];

// Bo, on the west road: goofy, mixes things up.
const BO: Line[] = [
  { say: 'Good morning! Or is it night? I forgot.', when: ['first_today', 'morning'] },
  { say: 'Hi! Wait, are you a guard too? No? Okay.', when: ['first_today'] },
  { say: 'I\'m guarding this road! Which road is this?' },
  { say: 'I counted the clouds. There are... a lot.' },
  { say: 'My helmet is on backwards. I like it this way.' },
  { say: 'Is a curio a kind of cookie? No? Oh.' },
  { say: 'I tried to chop a tree. It was a lamppost.' },
  { say: 'I asked a bird for directions. It flew away.' },
  { say: 'Why is it so dark? Oh! It\'s night.', when: ['night'] },
  { say: 'The sky is orange! Is it on fire? Oh, sunset. Pretty!', when: ['sunset'] },
  { say: 'It\'s raining in Tidewrit. Do fish get wet?', when: ['rain:tidewrit_shallows'] },
  { say: 'You did your quest? Can you do mine? Just kidding!', when: ['quest_done'] },
  { say: 'You smell like smoke. Did you cook something?', when: ['from:cinderreach'] },
  { say: 'Is today Friday? I love Fridays! Is it?', when: ['friday'] },
];

// Milo, on the east road: scared, but pretends to be tough.
const MILO: Line[] = [
  { say: 'WHO GOES THERE?! Oh, hi {name}. I wasn\'t scared.', when: ['first_today'] },
  { say: 'I\'m very brave! Did something just move?' },
  { say: 'I\'m n-not shaking. It\'s just cold.' },
  { say: 'Monsters? Ha! I eat monsters for breakfast. Small ones.' },
  { say: 'I\'m guarding this road. From far away. Like a pro.' },
  { say: 'Was that a bird? I knew it was a bird.' },
  { say: 'D-dark again? No problem. I have a lamp. And another lamp.', when: ['night'] },
  { say: 'The Unread Margins? With the glowing eyes? I\'m fine. Totally fine.', when: ['from:unread_margins'] },
  { say: 'You went out there alone? Wow. I mean, me too. Daily.', when: ['from:stormrun_reaches'] },
  { say: 'The Commander says I\'m brave. He says it very quietly.' },
  { say: 'Thunder! I mean... I love thunder. Ha. Ha.', when: ['rain_here'] },
  { say: 'Your curio is cute. It\'s not scary at all. Right?', when: ['big_team'] },
  { say: 'You did your quest? Brave! As brave as me, almost.', when: ['quest_done'] },
];

// Duke, on the north road: always bragging.
const DUKE: Line[] = [
  { say: 'Morning, {name}! Yes, I\'m the best guard. You can say it.', when: ['first_today'] },
  { say: 'I once beat ten monsters. Okay, one. A big one!' },
  { say: 'My armor is the shiniest in town. I polish it daily.' },
  { say: 'The Commander says I\'m his best guard. Every day!' },
  { say: 'I can lift a whole cart. With one hand. Maybe.' },
  { say: 'This road is safe because I\'m standing on it.' },
  { say: 'You did your quest? Nice! I did two before breakfast.', when: ['quest_done'] },
  { say: 'Level 20? Not bad. When I was a kid, I was level 99.', when: ['veteran'] },
  { say: 'New here? Watch me. Learn from the best.', when: ['new_kid'] },
  { say: 'Even at night I shine. It\'s the armor.', when: ['night'] },
  { say: 'Rain? It wouldn\'t dare rain on me.', when: ['rain:tidewrit_shallows'] },
  { say: 'You chopped wood? I chop trees with my eyes. Kidding.', when: ['has_wood'] },
  { say: 'The north road is the best road. Because I\'m here.' },
];

const KNIGHT: Line[] = [
  { say: 'Good morning, {name}! Stand tall today.', when: ['first_today', 'morning'] },
  { say: 'At ease, {name}. My squad and I keep the town safe.', when: ['first_today'] },
  { say: 'Eyes front, squad! Oh, hello there, {name}.' },
  { say: 'A strong team wins battles. Train your curios!' },
  { say: 'Even knights lose sometimes. Get up and try again!' },
  { say: 'Every quest makes you stronger. I can tell.', when: ['quest_done'] },
  { say: 'Your quest is waiting, hero. Off you go!', when: ['quest_waiting'] },
  { say: 'No curio on your team? Get one before your next battle!', when: ['no_team'] },
  { say: 'A big team! Good. Keep them trained.', when: ['big_team'] },
  { say: 'Lamps on, eyes open. Night watch!', when: ['night'] },
  { say: 'Rest well this weekend. Monday, we train!', when: ['weekend'] },
  { say: 'Monday! Fresh start, fresh strength.', when: ['monday'] },
  { say: 'New recruit? Practice every day. That\'s the secret.', when: ['new_kid'] },
  { say: 'Level 20 and up. You fight like a knight!', when: ['veteran'] },
  { say: 'Left, right, left! Sorry, can\'t stop. We\'re marching.' },
];

const RECYCLER: Line[] = [
  { say: 'Ooh, trash bundles! Bring them here, I\'ll make them new.', when: ['can_trade'] },
  { say: 'You picked up trash! Get a few more and we can trade.', when: ['has_trash', '!can_trade'] },
  { say: 'Veggies! I\'ll buy those. Fresh is best!', when: ['has_veggies'] },
  { say: 'Wood? I\'ll take it! Nothing goes to waste here.', when: ['has_wood'] },
  { say: 'Shells! The beach gives the best gifts.', when: ['has_shells'] },
  { say: 'Empty bag? Look near the paths. Litter likes to hide.', when: ['bag_empty'] },
  { say: 'Even here, people drop wrappers. Can you believe it?', when: ['here:cinderreach'] },
  { say: 'Trash in the sea hurts the fish. Thanks for helping!', when: ['here:tidewrit_shallows'] },
  { say: 'A clean forest is a happy forest.', when: ['here:rootbound_wilds'] },
  { say: 'The wind blows trash everywhere here. Help me catch it!', when: ['here:stormrun_reaches'] },
  { say: 'Hello, {name}! This map is cleaner because of you.', when: ['first_today'] },
  { say: 'Fun fact: one old bottle can become part of a new shirt!' },
  { say: 'Fun fact: paper can be recycled about 5 to 7 times.' },
  { say: 'Reduce, reuse, recycle! Say it with me!' },
  { say: 'Old cans can become new bikes. Amazing, right?' },
  { say: 'Bring a bag from home when you shop. Less trash!' },
  { say: 'If you see litter, pick it up. Every piece counts!' },
];

const SQUAD: Line[] = [
  { say: 'Left, right, left, right!' },
  { say: 'Hut, two, three, four!' },
  { say: 'Can\'t talk. Marching!' },
  { say: 'The Commander is watching. Look busy!' },
];

/** Each NPC's bank by id (lib/townNpcs.ts), plus 'squad' and 'recycler'. */
export const LINES: Record<string, Line[]> = {
  loreteller: BAYLAN,
  spellcaster: SPELLCASTER,
  numberrealm: NUMBER_REALM,
  lorekeeper: LOREKEEPER,
  lexiconarena: LEXICON,
  logiclabyrinth: LOGIC,
  shopkeeper: SHOPKEEPER,
  curioexpert: CURIO_EXPERT,
  guard_gate_s: REX,
  guard_road_w: BO,
  guard_road_e: MILO,
  guard_road_n: DUKE,
  knight_commander: KNIGHT,
  squad: SQUAD,
  recycler: RECYCLER,
};

export const CHATTER: Exchange[] = [
  // With his marching squad, at a stop by the fountain.
  { with: 'squad', lines: [['knight', 'Squad, halt! Is the plaza safe?'], ['other', 'All clear, sir! Just a butterfly.']] },
  { with: 'squad', lines: [['knight', 'Boots shined?'], ['other', 'So shiny I can see my face, sir!']] },
  { with: 'squad', lines: [['other', 'Sir, my boots are squeaky.'], ['knight', 'Then march louder!']] },
  { with: 'squad', lines: [['knight', 'Who keeps this town safe?'], ['other', 'We do, sir!']] },
  { with: 'squad', lines: [['other', 'Sir, can we have a snack break?'], ['knight', 'After one more lap!']] },
  { with: 'squad', lines: [['knight', 'Chins up! Backs straight!'], ['other', 'Yes, sir! Ow, my back.']] },
  { with: 'squad', lines: [['other', 'Sir, a kid is watching us!'], ['knight', 'Then march your best!']] },
  { with: 'squad', lines: [['knight', 'Lamps on, eyes open!'], ['other', 'Yes, sir! Not scared of the dark. Mostly.']], when: ['night'] },
  { with: 'squad', lines: [['knight', 'Good morning, squad!'], ['other', 'Good morning, sir! We\'re awake! Almost.']], when: ['morning'] },
  { with: 'squad', lines: [['knight', 'Beautiful sunset, squad.'], ['other', 'Can we stop and look, sir?'], ['knight', 'Five seconds. Go!']], when: ['sunset'] },
  { with: 'squad', lines: [['knight', 'It\'s raining in Tidewrit.'], ['other', 'The frogs must be happy, sir!']], when: ['rain:tidewrit_shallows'] },
  { with: 'squad', lines: [['knight', 'See {name}? Quest done already!'], ['other', 'Wow! A real hero, sir!']], when: ['quest_done'] },
  { with: 'squad', lines: [['other', 'Sir, is that {name}?'], ['knight', 'Yes! Our town\'s new hero.']], when: ['first_today'] },
  { with: 'squad', lines: [['knight', 'It\'s Friday, squad!'], ['other', 'Hooray! Wait, do we still march?'], ['knight', 'Always!']], when: ['friday'] },
  { with: 'squad', lines: [['knight', 'A weekend! Still on duty, squad.'], ['other', 'Of course, sir! Heroes don\'t take days off.']], when: ['weekend'] },
  // Calling over to the guards on their beats.
  { with: 'guard_gate_s', lines: [['knight', 'Rex! How is the south gate?'], ['other', 'Safe and sound, sir! I\'d face a dragon for it!']] },
  { with: 'guard_gate_s', lines: [['other', 'Sir! The kids came home safe again!'], ['knight', 'Good work, Rex. Keep it up.']] },
  { with: 'guard_gate_s', lines: [['knight', 'Rex, are you ever scared?'], ['other', 'Sometimes, sir. I stay anyway!'], ['knight', 'That\'s real courage.']] },
  { with: 'guard_road_w', lines: [['knight', 'Bo! Report!'], ['other', 'Reporting, sir! What\'s a report?']] },
  { with: 'guard_road_w', lines: [['knight', 'Bo, your helmet is backwards.'], ['other', 'No, sir, my head is backwards!']] },
  { with: 'guard_road_w', lines: [['other', 'Sir! I saw a monster!'], ['knight', 'Bo, that\'s your shadow.'], ['other', 'Oh. Hi, shadow!']] },
  { with: 'guard_road_w', lines: [['knight', 'Bo, which way is north?'], ['other', 'Up, sir!']] },
  { with: 'guard_road_e', lines: [['knight', 'Milo, report!'], ['other', 'I-I mean... ALL CLEAR, SIR!']] },
  { with: 'guard_road_e', lines: [['knight', 'Milo, why are you behind the barrel?'], ['other', 'Guarding it, sir! Very closely!']] },
  { with: 'guard_road_e', lines: [['other', 'Sir, I\'m not scared of the dark at all!'], ['knight', 'Then why do you have five lamps?']], when: ['night'] },
  { with: 'guard_road_e', lines: [['knight', 'Brave work today, Milo.'], ['other', 'R-really, sir? I mean... of course!']] },
  { with: 'guard_road_n', lines: [['knight', 'Duke, report!'], ['other', 'Best road in town, sir! Thanks to me!']] },
  { with: 'guard_road_n', lines: [['other', 'Sir, did you see me guard? Amazing, right?'], ['knight', 'You were standing still, Duke.'], ['other', 'Amazingly still!']] },
  { with: 'guard_road_n', lines: [['knight', 'Duke, did you polish your armor again?'], ['other', 'Three times, sir! The sun is jealous.']] },
  { with: 'guard_road_n', lines: [['other', 'Sir, I\'m your best guard, right?'], ['knight', 'You\'re all my best guards, Duke.'], ['other', 'But me the most?']] },
];
