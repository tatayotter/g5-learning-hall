// lib/intro/trainingQuiz.ts
//
// The five-question "wake your Curio" training quest at the end of the
// first-curio intro. Lore-flavored but real grade-level skills (Math +
// English), pitched easy on purpose: its job is teaching the main-quest flow
// (notes -> ready -> quiz -> rewards) and handing a brand-new kid a first win,
// not assessment. Graded locally — there's nothing to protect here, unlike
// the real quests (grade_content_quiz keeps their answers server-side).

export interface TrainingQuestion {
  question: string;
  options: string[];
  answer: string;
}

export const TRAINING_QUIZ: Record<number, TrainingQuestion[]> = {
  2: [
    { question: 'Damien counted 5 steps down and 5 steps up. How many steps in all?', options: ['10', '8', '11', '55'], answer: '10' },
    { question: 'Solarch loves the sun. Which word names something in the sky?', options: ['sun', 'shoe', 'spoon', 'sock'], answer: 'sun' },
    { question: 'There are 5 Guilds. The mist covers 2 of them. How many Guilds are still safe?', options: ['3', '7', '2', '4'], answer: '3' },
    { question: 'Which word rhymes with "ink"?', options: ['pink', 'ant', 'book', 'sun'], answer: 'pink' },
    { question: 'The Ledger is a big book. Which word means the opposite of "big"?', options: ['small', 'tall', 'wide', 'long'], answer: 'small' },
  ],
  3: [
    { question: 'Damien walks 5 steps down and 5 steps up every day. How many steps does he walk in 2 days?', options: ['20', '10', '15', '25'], answer: '20' },
    { question: '"The brave cub climbed the tower." Which word is a noun?', options: ['cub', 'brave', 'climbed', 'the'], answer: 'cub' },
    { question: 'Each of the 5 Guilds has 4 towers. How many towers are there?', options: ['20', '9', '15', '25'], answer: '20' },
    { question: 'Which word is spelled correctly?', options: ['library', 'libary', 'liberry', 'lybrary'], answer: 'library' },
    { question: 'What is the plural of "story"?', options: ['stories', 'storys', 'storyes', 'storyies'], answer: 'stories' },
  ],
  4: [
    { question: 'The Ledger had 1,250 pages. The Forgetting erased 480 of them. How many pages are left?', options: ['770', '830', '870', '730'], answer: '770' },
    { question: 'Solarch climbed 3 towers with 125 steps each. How many steps did he climb?', options: ['375', '325', '385', '250'], answer: '375' },
    { question: '"The mist crept silently through the valley." Which word is the adverb?', options: ['silently', 'mist', 'crept', 'valley'], answer: 'silently' },
    { question: 'Which fraction is equal to one half?', options: ['2/4', '1/3', '3/4', '2/3'], answer: '2/4' },
    { question: 'The erased page was blank. What does "blank" mean?', options: ['empty', 'full', 'torn', 'bright'], answer: 'empty' },
  ],
  5: [
    { question: 'Each of the 5 Guilds sends 24 Keepers. How many Keepers is that?', options: ['120', '100', '144', '96'], answer: '120' },
    { question: 'The Forgetting erased 3/8 of a page. What fraction of the page is left?', options: ['5/8', '3/8', '1/2', '4/5'], answer: '5/8' },
    { question: '"Solarch\'s mane glowed like the morning sun." What figure of speech is this?', options: ['simile', 'metaphor', 'personification', 'hyperbole'], answer: 'simile' },
    { question: 'A gear with 12 teeth turns 2 full times. How many teeth pass the pointer?', options: ['24', '14', '12', '36'], answer: '24' },
    { question: 'Which word is a synonym of "restore"?', options: ['repair', 'erase', 'forget', 'break'], answer: 'repair' },
  ],
  6: [
    { question: 'The mist erased 35% of 200 books. How many books were erased?', options: ['70', '35', '65', '140'], answer: '70' },
    { question: 'A Keeper re-inks 2 pages for every 3 questions solved. How many pages for 12 questions?', options: ['8', '6', '9', '18'], answer: '8' },
    { question: '"The silence swallowed the colors." This sentence is an example of...', options: ['personification', 'simile', 'alliteration', 'onomatopoeia'], answer: 'personification' },
    { question: 'Solarch\'s sun-disc is a circle with a radius of 7 cm. What is its diameter?', options: ['14 cm', '7 cm', '21 cm', '49 cm'], answer: '14 cm' },
    { question: '"The Forgetting was quiet and patient." What does "patient" mean here?', options: ['willing to wait', 'in a hurry', 'very loud', 'easily angered'], answer: 'willing to wait' },
  ],
};

export function getTrainingQuiz(grade: number): TrainingQuestion[] {
  return TRAINING_QUIZ[grade] ?? TRAINING_QUIZ[Math.min(6, Math.max(2, grade))] ?? TRAINING_QUIZ[4];
}

// Short on purpose — it models what a real quest's notes look like, it isn't a lesson.
export const TRAINING_NOTES = `### The Keeper's Notes

Every quest on your **Campaign Map** has two parts:

1. **Read the notes.** They hold everything the quiz will ask. Real quests unlock the quiz after a short reading time.
2. **Answer the quiz.** Get **every** answer right to earn **XP** and **Gold**, and to train the Curio you bring along.

Missed one? No loot this time, but the quiz shows you the right answers. Read them, then try again.

> Every answer re-inks the Ledger. Every mistake you fix is a memory the Forgetting can't take.
`;
