import type { BlogGuildKey } from '@/lib/blogPosts';

// Post templates for the admin Blog editor (components/admin/BlogSection.tsx). Each one is the
// shape of a post type that already exists on the blog, measured from the 54 posts that were
// migrated out of code on 2026-10-04: how many sections, what the headings do, whether it needs
// a curriculum note, FAQ, sources or its own photo. Starting a post from a template pre-fills
// that structure, and the hints show up as placeholders in the empty fields.
//
// docs/blog/README.md describes the same templates in prose, plus the house writing rules; keep
// the two in step when a template changes.

export type BlogTemplateSection = {
  /** Pre-filled heading, or '' to leave it for the writer. */
  heading: string;
  headingHint: string;
  bodyHint: string;
};

export type BlogTemplate = {
  id: string;
  name: string;
  /** When to pick this template. */
  summary: string;
  example: string;
  guildKey?: BlogGuildKey;
  /** 'all' = all grades; a number pre-selects that grade; undefined leaves the writer's choice. */
  grade?: 'all' | 6;
  titleHint: string;
  descriptionHint: string;
  introHint: string;
  curriculumNote: boolean;
  curriculumNoteHint?: string;
  sections: BlogTemplateSection[];
  takeawaysHint: string;
  faq: boolean;
  faqHint?: string;
  linksHint: string;
  photoHint: string;
  /** Pre-filled text for fields that are the same on every post of this type. */
  presets?: { lastSectionParagraphs?: string[] };
  checklist: string[];
};

const ABOUT_BOILERPLATE =
  'Learning Hall PH is a learning game for Filipino Grade 2 to 6 pupils, built in Surigao City by Rowil Ruelo and co-founder Raphaelle Julien Ruelo. It turns the weekly MATATAG lessons into quests, quizzes and battles, and gives parents a dashboard to follow along. Learning Hall is free to start at learninghallph.com.';

export const BLOG_TEMPLATES: BlogTemplate[] = [
  {
    id: 'skill-guide',
    name: 'Grade skill guide',
    summary: 'Practical help with one skill at one grade level, tied to what DepEd asks at that grade.',
    example: 'Grade 4 Reading Comprehension: Moving From Learning to Read to Reading to Learn',
    titleHint: 'Grade N <Skill>: <what changes at this grade>',
    descriptionHint: 'One sentence: how to help a Grade N learner with the specific jump this grade asks for (120 to 170 characters).',
    introHint: 'About 60 words. What changes about this skill at this grade, and why a child who was fine last year can suddenly struggle.',
    curriculumNote: true,
    curriculumNoteHint: 'Quote or closely paraphrase the actual MATATAG / K-12 competency for this grade, e.g. DepEd\'s Grade 4 English curriculum asks learners to "identify the main idea, key sentences, and supporting details". Leave empty if no DepEd subject covers the skill (typing, critical thinking).',
    sections: [
      { heading: '', headingHint: 'Tip 1 as an action, e.g. "Practice separating main idea from interesting details"', bodyHint: 'One paragraph, about 60 words: the common trap at this grade, then exactly what to do about it at home.' },
      { heading: '', headingHint: 'Tip 2 as an action', bodyHint: 'One paragraph, about 60 words. Concrete, no-prep, uses things already in the house.' },
      { heading: '', headingHint: 'Tip 3 as an action', bodyHint: 'One paragraph, about 60 words.' },
    ],
    takeawaysHint: 'Three lines, one per tip, each a full sentence a parent could act on.',
    faq: false,
    linksHint: 'Usually none. Optionally the matching curriculum page, e.g. /curriculum/grade-4.',
    photoHint: 'Leave empty: grade guides share the topic\'s photo automatically.',
    checklist: [
      'Topic is the skill\'s guild and the grade is set.',
      'The curriculum note quotes a real competency, or is empty on purpose.',
      'Every heading starts with a verb.',
    ],
  },
  {
    id: 'skill-tips',
    name: 'Skill tips (all grades)',
    summary: 'A short list of ways to build one skill at home, for any grade.',
    example: '5 Reading Comprehension Games for Elementary Learners (No Screen Needed)',
    grade: 'all',
    titleHint: '<Number> <Skill> <tips/games> for Elementary Learners (<hook>)',
    descriptionHint: 'One sentence on what parents get and who it is for (120 to 170 characters).',
    introHint: 'About 60 words. Why this skill quietly matters across subjects, and that it is trainable with short practice.',
    curriculumNote: false,
    sections: [
      { heading: '', headingHint: 'Tip 1, e.g. "1. Predict-then-check" or "Short and frequent beats long and rare"', bodyHint: 'One or two paragraphs: what to do, then why it works.' },
      { heading: '', headingHint: 'Tip 2', bodyHint: 'One or two paragraphs.' },
      { heading: '', headingHint: 'Tip 3', bodyHint: 'One or two paragraphs.' },
    ],
    takeawaysHint: 'Three lines summing up the tips.',
    faq: false,
    linksHint: 'Optional: a research explainer for this skill, e.g. /blog/testing-effect-why-quizzing-beats-rereading.',
    photoHint: 'Leave empty to use the topic\'s photo.',
    checklist: ['Three to five tips, each with its own heading.', 'No worksheet or purchase needed for any tip.'],
  },
  {
    id: 'science-explainer',
    name: 'Research explainer',
    summary: 'The cited research behind why a kind of practice works, and what it means at home.',
    example: 'The Testing Effect: Why Quizzing Your Child Beats Having Them Re-Read Notes',
    grade: 'all',
    titleHint: 'The <Named Effect>: Why <practice> Beats <common habit>',
    descriptionHint: 'The research finding in plain words, and how Learning Hall uses it (120 to 170 characters).',
    introHint: 'Start with what parents instinctively do, then the research that points the other way, then name the effect.',
    curriculumNote: false,
    sections: [
      { heading: 'What the research actually says', headingHint: 'The core finding', bodyHint: 'Name the researchers, year and journal. Describe the study in two or three sentences and what it found.' },
      { heading: '', headingHint: 'Why it works, or a second supporting finding', bodyHint: 'The mechanism, in plain language.' },
      { heading: 'What this means for how you help at home', headingHint: 'The practical part', bodyHint: 'One concrete change a parent can make this week.' },
    ],
    takeawaysHint: 'Four lines. Put the citation in the line, e.g. "Roediger and Karpicke (2006) found ...".',
    faq: true,
    faqHint: 'Three questions people actually search, answered in two or three sentences each.',
    linksHint: 'Link every study cited (journal or DOI page), then the related guild page, e.g. /guilds/lorekeeper.',
    photoHint: 'Optional stock photo; credit the photographer.',
    checklist: ['Every claim traces to a linked source.', 'No overstated results ("proves", "always").'],
  },
  {
    id: 'parent-guide',
    name: 'Parent guide / explainer',
    summary: 'Answers one question parents ask: screen time, MATATAG, falling behind, school programs.',
    example: 'Signs Your Child Might Be Falling Behind — and What to Do About It',
    guildKey: 'resources',
    grade: 'all',
    titleHint: 'The question as parents phrase it, or a clear promise of the answer',
    descriptionHint: 'What the guide answers, practical and non-alarmist (120 to 170 characters).',
    introHint: 'About 60 to 80 words. Name the worry honestly, then promise something practical.',
    curriculumNote: false,
    sections: [
      { heading: '', headingHint: 'Point 1, phrased as advice or a clear claim', bodyHint: 'One or two paragraphs.' },
      { heading: '', headingHint: 'Point 2', bodyHint: 'One or two paragraphs.' },
      { heading: '', headingHint: 'Point 3', bodyHint: 'One or two paragraphs.' },
      { heading: '', headingHint: 'What to do next', bodyHint: 'The practical next step, including when to talk to the teacher.' },
    ],
    takeawaysHint: 'Three or four lines a parent could screenshot.',
    faq: true,
    faqHint: 'Three or four questions people search about this topic.',
    linksHint: 'Official sources (DepEd, school sites) and related posts.',
    photoHint: 'Give it its own photo: stock with credit, or one of ours.',
    checklist: ['Not alarmist, and not a criticism of schools or teachers.', 'Facts that change (dates, rules) say where they come from.'],
  },
  {
    id: 'exam-guide',
    name: 'Exam or school guide',
    summary: 'One part of a guide to an entrance exam or special school (RSHS, PSHS, SSES).',
    example: 'Does My Child Qualify for the PSHS NCE? Eligibility & Requirements Explained',
    guildKey: 'resources',
    grade: 6,
    titleHint: 'The exact question, e.g. "Does My Child Qualify for the <exam>?"',
    descriptionHint: 'The specific facts covered, plus the one thing that catches families off guard (120 to 170 characters).',
    introHint: 'Short: how this differs from the related exam or program, then "here is exactly what is on it."',
    curriculumNote: false,
    sections: [
      { heading: '', headingHint: 'Fact group 1, e.g. "The academic requirement"', bodyHint: 'Exact numbers and rules from the official source.' },
      { heading: '', headingHint: 'Fact group 2', bodyHint: 'Exact numbers and rules.' },
      { heading: '', headingHint: 'The rule that catches families off guard', bodyHint: 'The surprising or strict rule, explained.' },
      { heading: 'What to actually do, practically', headingHint: 'Next steps', bodyHint: 'Timeline and concrete steps.' },
    ],
    takeawaysHint: 'Four to six factual lines with the key numbers.',
    faq: true,
    faqHint: 'Three to six questions with exact, short answers.',
    linksHint: 'The official portal or FAQ first, then the other posts in the series (/blog/<slug>).',
    photoHint: 'Own photo per post; stock with credit is fine.',
    checklist: ['Every number checked against the official source this school year.', 'Links to the rest of the series.'],
  },
  {
    id: 'how-to',
    name: 'How-to / step by step',
    summary: 'Step-by-step instructions for using Learning Hall (install, link a parent, settings).',
    example: 'How to Install Learning Hall on a Phone, Tablet, or Computer',
    guildKey: 'resources',
    grade: 'all',
    titleHint: 'How to <do the thing> on <devices or places>',
    descriptionHint: 'What the steps do and for which devices (120 to 170 characters).',
    introHint: 'The question people ask, the honest short answer, then "here is exactly how."',
    curriculumNote: false,
    sections: [
      { heading: '', headingHint: 'What this actually does', bodyHint: 'What changes after following the steps, and any limits.' },
      { heading: '', headingHint: 'On <device or browser 1>', bodyHint: 'Exact taps and menu names, in order.' },
      { heading: '', headingHint: 'On <device or browser 2>', bodyHint: 'Exact taps and menu names, in order.' },
      { heading: '', headingHint: 'Why we do it this way (optional)', bodyHint: 'Be upfront about workarounds or things not finished yet.' },
    ],
    takeawaysHint: 'One line per device or step group.',
    faq: true,
    faqHint: 'Troubleshooting questions people really hit.',
    linksHint: 'A link to the page the steps start from.',
    photoHint: 'A photo of the device or screen in use.',
    checklist: ['Menu and button names match the current app exactly.', 'Says plainly what is not available yet.'],
  },
  {
    id: 'news',
    name: 'News / press release',
    summary: 'Something that happened: a school visit, a launch, a partnership, a milestone.',
    example: 'Learning Hall Presents to the Faculty of Surigao City Special Science Elementary School',
    guildKey: 'resources',
    grade: 'all',
    titleHint: 'Learning Hall <did what> <with whom>',
    descriptionHint: 'Who, what and when in one sentence, plus what happens next (120 to 170 characters).',
    introHint: 'Starts with the dateline: "SURIGAO CITY, October 4, 2026." Then who, what, when and where, and what happens next.',
    curriculumNote: false,
    sections: [
      { heading: 'What we showed', headingHint: 'What happened', bodyHint: 'What was presented or done. Plain facts.' },
      { heading: '', headingHint: 'A highlight, e.g. "Teachers tried it on the spot"', bodyHint: 'The best moment, and any hiccup told honestly.' },
      { heading: 'What happens next', headingHint: 'Commitments and next steps', bodyHint: 'What each side agreed to. Only what was really agreed.' },
      { heading: 'A word from the founder', headingHint: 'Quote', bodyHint: '"<Quote in your own words>," said Rowil Ruelo, founder of Learning Hall PH. Use only quotes the speaker has approved.' },
      { heading: 'About Learning Hall PH', headingHint: 'Boilerplate', bodyHint: 'Standard company paragraph.' },
    ],
    presets: { lastSectionParagraphs: [ABOUT_BOILERPLATE, 'Media and school inquiries: tatay@learninghallph.com'] },
    takeawaysHint: 'Three or four facts: who, when, what was agreed, what is next.',
    faq: false,
    linksHint: 'Sign-up pages (/child-signup, /register) and any related guide.',
    photoHint: 'Our own photos from the event. No pupils\' faces, names or uniforms. Adults only with their OK.',
    checklist: [
      'Every quote is approved by the person quoted.',
      'The school or partner is OK with being named.',
      'No children\'s names, faces or identifying details.',
    ],
  },
];

export function getTemplate(id: string | null | undefined): BlogTemplate | undefined {
  return BLOG_TEMPLATES.find((t) => t.id === id);
}
