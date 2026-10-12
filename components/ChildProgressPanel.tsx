'use client';
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { trackParentEvent } from '@/lib/analytics';
import { IOS, Icon, IosCapsule, IosGroup, IosRow, IosSheet, type IconName } from '@/components/parent/ios';
import { MIN_GRADE_STAGE, MAX_GRADE_STAGE } from '@/lib/guildEngine';
import { gradeToNumber } from '@/lib/userSession';

interface Props {
  childId: string;
  /** The child's own school grade, e.g. "Grade 5". */
  grade: string;
  isPremium: boolean;
  coinBalance: number;
  onCoinsAwarded: (amount: number) => void;
}

interface SubclassProfile {
  lorekeeper_lvl: number;
  spellcaster_lvl: number;
  number_realm_lvl: number;
  logic_labyrinth_lvl: number;
  lexicon_arena_lvl: number;
  // Grade stage of the questions each guild is serving (2-6). Stored in the
  // *_tier columns; see lib/guildEngine.ts MIN_GRADE_STAGE.
  lorekeeper_tier: number | null;
  spellcaster_tier: number | null;
  number_realm_tier: number | null;
  logic_labyrinth_tier: number | null;
  lexicon_arena_tier: number | null;
}

type LevelKey = 'lorekeeper_lvl' | 'spellcaster_lvl' | 'number_realm_lvl' | 'logic_labyrinth_lvl' | 'lexicon_arena_lvl';
type StageKey = 'lorekeeper_tier' | 'spellcaster_tier' | 'number_realm_tier' | 'logic_labyrinth_tier' | 'lexicon_arena_tier';

const SKILLS: { key: LevelKey; stageKey: StageKey; label: string; icon: IconName; color: string }[] = [
  { key: 'lorekeeper_lvl', stageKey: 'lorekeeper_tier', label: 'Reading', icon: 'book', color: IOS.blue },
  { key: 'spellcaster_lvl', stageKey: 'spellcaster_tier', label: 'Spelling', icon: 'doc', color: IOS.green },
  { key: 'number_realm_lvl', stageKey: 'number_realm_tier', label: 'Math', icon: 'chart', color: IOS.purple },
  { key: 'logic_labyrinth_lvl', stageKey: 'logic_labyrinth_tier', label: 'Logic', icon: 'target', color: IOS.orange },
  { key: 'lexicon_arena_lvl', stageKey: 'lexicon_arena_tier', label: 'Vocabulary', icon: 'journal', color: IOS.pink },
];

/** "Grade 3 questions · 2 grades to go", relative to the child's own grade. */
function gradeStageLabel(stage: number | null, childGrade: number): string {
  const g = Math.min(MAX_GRADE_STAGE, Math.max(MIN_GRADE_STAGE, stage ?? MIN_GRADE_STAGE));
  if (g < childGrade) {
    const left = childGrade - g;
    return `Grade ${g} questions · ${left} grade${left === 1 ? '' : 's'} to go`;
  }
  if (g === childGrade) return `Grade ${g} questions · at grade level`;
  return `Grade ${g} questions · above grade level`;
}

// Status comes from the subject's own score, never its rank among subjects:
// a child's lowest subject can still be "Strong". Too few answers to judge
// gets a neutral label so a couple of misses never reads as an alarm.
const MIN_ANSWERS_TO_JUDGE = 10;
type TopicLevel = 'intervention' | 'study' | 'on_track' | 'strong' | 'too_early';
type TopicStatus = { level: TopicLevel; label: string; color: string };
const TOPIC_BANDS: { level: Exclude<TopicLevel, 'too_early'>; min: number; label: string; color: string; meaning: string }[] = [
  { level: 'strong', min: 80, label: 'Strong', color: IOS.green, meaning: '80% and up' },
  { level: 'on_track', min: 65, label: 'On track', color: IOS.teal, meaning: '65–79%' },
  { level: 'study', min: 50, label: 'Needs more study', color: IOS.orange, meaning: '50–64%' },
  { level: 'intervention', min: 0, label: 'Needs intervention', color: IOS.red, meaning: 'under 50%' },
];
function topicStatus(rightPct: number, answered: number): TopicStatus {
  if (answered < MIN_ANSWERS_TO_JUDGE) return { level: 'too_early', label: 'Too early to tell', color: IOS.gray };
  const band = TOPIC_BANDS.find((b) => rightPct >= b.min) ?? TOPIC_BANDS[TOPIC_BANDS.length - 1];
  return { level: band.level, label: band.label, color: band.color };
}

// "Weekly Review" is the Friday quest that mixes questions from every subject,
// so it can't be rated as one subject and is left out of the check-up.
const NOT_A_SUBJECT = new Set(['weekly review']);
function onlyRealSubjects(topics: WeakTopic[]): WeakTopic[] {
  return topics.filter((t) => !NOT_A_SUBJECT.has(t.subject.trim().toLowerCase()));
}

function joinSubjects(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

interface JournalEntry {
  entry_date: string;
  done_today: string | null;
  tomorrow_plan: string | null;
  hardest_challenge: string | null;
  gratitude: string | null;
}

interface WeakTopic {
  subject: string;
  wrong_count: number;
  total_count: number;
  wrong_pct: number;
}

// Longer journal history is a Premium perk on top of the base journal-viewing
// gate — free parents get nothing (see isPremium check below), Premium
// parents get JOURNAL_LIMIT days instead of the old fixed 7.
const JOURNAL_LIMIT = 30;

function computeStreak(claimDates: string[]): number {
  if (claimDates.length === 0) return 0;
  const dates = new Set(claimDates);
  const today = new Date();
  let streak = 0;
  const cursor = new Date(today);
  // Today may not be claimed yet, so start counting from today if present,
  // otherwise from yesterday — a gap only breaks the streak once a full day is missed.
  if (!dates.has(format(cursor, 'yyyy-MM-dd'))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (dates.has(format(cursor, 'yyyy-MM-dd'))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** Inset row body used by the journal / weak-topic sheets (multi-line content). */
function SheetRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="pl-4">
      <div className="ios-row-sep pr-4 py-2.5" style={{ borderBottom: `0.5px solid ${IOS.separator}` }}>
        {children}
      </div>
    </div>
  );
}

/**
 * Per-child progress for the parent's child page, rendered as iOS grouped
 * sections: summary tiles, activity, skills, Premium insights (journal +
 * weak topics open as sheets), and coin awarding.
 */
export default function ChildProgressPanel({ childId, grade, isPremium, coinBalance, onCoinsAwarded }: Props) {
  const [loading, setLoading] = useState(true);
  const [level, setLevel] = useState<number | null>(null);
  const [xp, setXp] = useState<number | null>(null);
  const [masteryCount, setMasteryCount] = useState<number | null>(null);
  const [perfectQuizzes, setPerfectQuizzes] = useState<number | null>(null);
  const [subclass, setSubclass] = useState<SubclassProfile | null>(null);
  const [lastActive, setLastActive] = useState<string | null>(null);
  const [quizzesLast7Days, setQuizzesLast7Days] = useState<number>(0);
  const [streak, setStreak] = useState(0);

  const [showJournal, setShowJournal] = useState(false);
  const [journalLoading, setJournalLoading] = useState(false);
  const [journal, setJournal] = useState<JournalEntry[] | null>(null);

  const [showWeakTopics, setShowWeakTopics] = useState(false);
  const [weakTopicsLoading, setWeakTopicsLoading] = useState(false);
  const [weakTopics, setWeakTopics] = useState<WeakTopic[] | null>(null);

  const [coinAmount, setCoinAmount] = useState('');
  const [awarding, setAwarding] = useState(false);
  const [awardError, setAwardError] = useState('');
  const [awardSuccess, setAwardSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const [progressRes, subclassRes, activityRes, quizRes, streakRes] = await Promise.all([
        // One row per user (lifetime, not week-keyed) — see
        // docs/weekly-progress-redesign-plan.md Phase 4 Wave 2. Replaces the old
        // <=/ORDER BY/LIMIT 1 "most recent row on or before this week" lookup, which had
        // the same "latest row wins" fragility the Phase 3 trigger was fixed for on
        // 2026-08-11 (a pre-staged future row can carry non-null-but-wrong stats).
        supabase
          .from('player_progress')
          .select('level, xp, mastery_count, perfect_quizzes_total')
          .eq('user_id', childId)
          .maybeSingle(),
        supabase
          .from('user_subclass_profiles')
          .select('lorekeeper_lvl, spellcaster_lvl, number_realm_lvl, logic_labyrinth_lvl, lexicon_arena_lvl, lorekeeper_tier, spellcaster_tier, number_realm_tier, logic_labyrinth_tier, lexicon_arena_tier')
          .eq('user_id', childId)
          .maybeSingle(),
        // Most recent recorded activity across every real play source (quests, battles,
        // guilds, journal, ...) — not the last login, which only updates on a fresh sign-in
        // and so reads "stale" for a child who keeps a saved session and never re-logs-in.
        // guild_sessions/player_activity are child-only RLS, so this goes through a
        // parent-ownership-checked RPC the same way get_child_streak already does.
        supabase.rpc('get_child_last_active', { p_child_id: childId }),
        supabase
          .from('user_completed_questions')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', childId)
          .gte('completed_at', sevenDaysAgo.toISOString()),
        supabase.rpc('get_child_streak', { p_child_id: childId }),
      ]);

      if (cancelled) return;

      setLevel(progressRes.data?.level ?? null);
      setXp(progressRes.data?.xp ?? null);
      setMasteryCount(progressRes.data?.mastery_count ?? null);
      setPerfectQuizzes(progressRes.data?.perfect_quizzes_total ?? null);
      setSubclass((subclassRes.data as SubclassProfile) ?? null);
      const activityRow = (activityRes.data as { last_active: string }[] | null)?.[0];
      setLastActive(activityRow?.last_active ?? null);
      setQuizzesLast7Days(quizRes.count ?? 0);
      const claimDates = ((streakRes.data as { claim_date: string }[] | null) ?? []).map((r) => r.claim_date);
      setStreak(computeStreak(claimDates));
      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [childId]);

  const handleOpenJournal = async () => {
    trackParentEvent('parent_insight_opened', { insight: 'journal', child_id: childId });
    setShowJournal(true);
    if (journal !== null) return;
    setJournalLoading(true);
    const { data, error } = await supabase.rpc('get_child_journal', { p_child_id: childId, p_limit: JOURNAL_LIMIT });
    setJournalLoading(false);
    if (error) {
      console.error('Failed to load journal:', error);
      return;
    }
    setJournal((data as JournalEntry[]) ?? []);
  };

  const handleOpenWeakTopics = async () => {
    trackParentEvent('parent_insight_opened', { insight: 'weak_topics', child_id: childId });
    setShowWeakTopics(true);
    if (weakTopics !== null) return;
    setWeakTopicsLoading(true);
    const { data, error } = await supabase.rpc('get_child_weak_topics', { p_child_id: childId });
    setWeakTopicsLoading(false);
    if (error) {
      console.error('Failed to load weak topics:', error);
      return;
    }
    setWeakTopics(onlyRealSubjects((data as WeakTopic[]) ?? []));
  };

  const handleAwardCoins = async (e: React.FormEvent) => {
    e.preventDefault();
    setAwardError('');
    setAwardSuccess(false);
    const amount = parseInt(coinAmount, 10);
    if (!Number.isInteger(amount) || amount <= 0) {
      setAwardError('Enter a positive whole number.');
      return;
    }
    setAwarding(true);
    const { error } = await supabase.rpc('award_coins_to_child', { p_child_id: childId, p_amount: amount });
    setAwarding(false);
    if (error) {
      setAwardError(error.message);
      return;
    }
    trackParentEvent('parent_coins_awarded', { amount, child_id: childId });
    setCoinAmount('');
    setAwardSuccess(true);
    onCoinsAwarded(amount);
  };

  if (loading) {
    return <p className="text-center text-[15px] py-6" style={{ color: IOS.secondary }}>Loading progress…</p>;
  }

  const lastActiveLabel = lastActive
    ? new Date(lastActive).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : 'Not yet';
  const lockIcon = <Icon name="lock" size={16} color={IOS.tertiary} />;
  const childGrade = gradeToNumber(grade);

  return (
    <div className="space-y-8">
      {/* Summary tiles — the "widget" row at the top of the child page */}
      <div className="grid grid-cols-3 gap-2.5">
        {([
          { label: 'Level', value: level ?? '—', icon: 'star', color: IOS.yellow },
          { label: 'XP', value: (xp ?? 0).toLocaleString(), icon: 'sparkle', color: IOS.purple },
          { label: 'Day streak', value: streak, icon: 'flame', color: IOS.orange },
        ] as const).map((t) => (
          <div key={t.label} className="lg-glass rounded-[22px] px-3.5 py-3">
            <Icon name={t.icon} size={18} color={t.color} />
            <p className="mt-1.5 text-[24px] leading-[28px] font-bold tabular-nums truncate">{t.value}</p>
            <p className="text-[13px]" style={{ color: IOS.secondary }}>{t.label}</p>
          </div>
        ))}
      </div>

      <IosGroup header="Activity">
        <IosRow icon="chart" iconColor={IOS.blue} title="Questions this week" detail={quizzesLast7Days} />
        <IosRow icon="check" iconColor={IOS.green} title="Topics mastered" detail={masteryCount ?? 0} />
        <IosRow icon="star" iconColor={IOS.yellow} title="Perfect quizzes" detail={perfectQuizzes ?? 0} />
        <IosRow icon="calendar" iconColor={IOS.red} title="Last active" detail={lastActiveLabel} />
      </IosGroup>

      {subclass && (
        <IosGroup
          header="Skills"
          footer={`Every child starts each skill on Grade ${MIN_GRADE_STAGE} questions and moves up a grade after answering every question at the current one correctly, working up to their own grade (Grade ${childGrade}) and beyond, as far as Grade ${MAX_GRADE_STAGE}. Level grows with practice in that skill.`}
        >
          {SKILLS.map((s) => (
            <IosRow
              key={s.key}
              icon={s.icon}
              iconColor={s.color}
              title={s.label}
              subtitle={gradeStageLabel(subclass[s.stageKey], childGrade)}
              detail={`Level ${subclass[s.key]}`}
            />
          ))}
        </IosGroup>
      )}

      <IosGroup
        header="Insights"
        footer={isPremium ? undefined : 'Journal viewing and the subject check-up are included with Premium.'}
      >
        <IosRow
          icon="journal"
          iconColor={IOS.indigo}
          title="Journal"
          subtitle="What your child wrote after each day's quests"
          onClick={isPremium ? handleOpenJournal : () => trackParentEvent('parent_locked_feature_tapped', { feature: 'journal' })}
          accessory={isPremium ? undefined : lockIcon}
        />
        <IosRow
          icon="target"
          iconColor={IOS.pink}
          title="Subject check-up"
          subtitle="How often they get each subject right"
          onClick={isPremium ? handleOpenWeakTopics : () => trackParentEvent('parent_locked_feature_tapped', { feature: 'weak_topics' })}
          accessory={isPremium ? undefined : lockIcon}
        />
      </IosGroup>

      {isPremium && (
        <IosGroup
          header="Award coins"
          footer={
            awardError ? <span style={{ color: IOS.red }}>{awardError}</span>
            : awardSuccess ? <span style={{ color: IOS.green }}>Coins sent. They can spend them in the shop right away.</span>
            : "Sends gold straight to your child's in-game balance. Premium includes 10,000 gold a year, shared across your children. It resets when you buy your next year, and unused coins don't roll over."
          }
        >
          <IosRow icon="coins" iconColor={IOS.orange} title="Left in your pool" detail={coinBalance.toLocaleString()} />
          <form onSubmit={handleAwardCoins} className="flex items-center gap-3 px-4 min-h-[52px]">
            <input
              type="number"
              inputMode="numeric"
              min={1}
              value={coinAmount}
              onChange={(e) => { setCoinAmount(e.target.value); setAwardSuccess(false); }}
              placeholder="Amount to send"
              aria-label="Coins to award"
              className="flex-1 min-w-0 bg-transparent text-[17px] py-[11px] outline-none placeholder:text-[#C7C7CC]"
            />
            <IosCapsule type="submit" filled disabled={awarding || coinBalance <= 0 || !coinAmount}>
              {awarding ? 'Sending…' : 'Award'}
            </IosCapsule>
          </form>
        </IosGroup>
      )}

      <IosSheet open={showWeakTopics} onClose={() => setShowWeakTopics(false)} title="Subject Check-up" closeLabel="Done">
        {weakTopicsLoading && <p className="text-center text-[15px] py-6" style={{ color: IOS.secondary }}>Loading report…</p>}
        {!weakTopicsLoading && weakTopics?.length === 0 && (
          <p className="text-center text-[15px] py-6 px-4" style={{ color: IOS.secondary }}>
            Not enough attempts yet to spot a pattern. Check back after a few more quiz days.
          </p>
        )}
        {!weakTopicsLoading && weakTopics && weakTopics.length > 0 && (() => {
          const rows = weakTopics.map((t) => {
            const rightPct = Math.round(100 - Number(t.wrong_pct));
            return { ...t, rightPct, right: t.total_count - t.wrong_count, status: topicStatus(rightPct, t.total_count) };
          });
          const of = (level: TopicLevel) => rows.filter((r) => r.status.level === level).map((r) => r.subject);
          const intervention = of('intervention');
          const study = of('study');
          const judged = rows.filter((r) => r.status.level !== 'too_early');
          const totalAnswered = rows.reduce((sum, r) => sum + r.total_count, 0);
          const headline = intervention.length > 0
            ? `${joinSubjects(intervention)} need${intervention.length === 1 ? 's' : ''} your help`
            : study.length > 0
              ? `${joinSubjects(study)} could use more study`
              : judged.length > 0
                ? 'No subject needs attention right now'
                : 'Too early to tell';
          const detail = intervention.length > 0
            ? `They're getting fewer than half of these questions right. Sit down with them on this subject's lessons, or check in with their teacher.`
            : study.length > 0
              ? 'About half to two-thirds right. A little extra review at home should help.'
              : judged.length > 0
                ? 'Every subject with enough answers is on track or strong. Subjects are listed from lowest score, but a lower spot here is still a good result.'
                : `Each subject needs at least ${MIN_ANSWERS_TO_JUDGE} answers before we rate it.`;
          return (
            <>
              <IosGroup>
                <div className="px-4 py-3.5">
                  <p className="text-[20px] leading-[25px] font-semibold">{headline}</p>
                  <p className="text-[15px] leading-[20px] mt-1" style={{ color: IOS.secondary }}>{detail}</p>
                </div>
              </IosGroup>
              <IosGroup
                header={`From ${totalAnswered.toLocaleString()} answers in quests and battles`}
                footer="Counts the latest answer to each question, so one they've since gotten right counts as right."
              >
                {rows.map((r) => (
                  <SheetRow key={r.subject}>
                    <div className="space-y-2 py-0.5">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-[17px] truncate">{r.subject}</span>
                        <span className="text-[15px] font-semibold shrink-0" style={{ color: r.status.color }}>{r.status.label}</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#7676801F' }}>
                        <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, r.rightPct))}%`, background: r.status.color }} />
                      </div>
                      <p className="text-[13px]" style={{ color: IOS.secondary }}>
                        {r.rightPct}% right ({r.right} of {r.total_count})
                        {r.status.level === 'too_early' ? ` · needs ${MIN_ANSWERS_TO_JUDGE - r.total_count} more answers to rate` : ''}
                      </p>
                    </div>
                  </SheetRow>
                ))}
              </IosGroup>
              <IosGroup header="What the labels mean" footer="Percent of questions answered right in that subject.">
                {TOPIC_BANDS.map((b) => (
                  <IosRow key={b.level} title={<span style={{ color: b.color, fontWeight: 600 }}>{b.label}</span>} detail={b.meaning} />
                ))}
                <IosRow title={<span style={{ color: IOS.gray, fontWeight: 600 }}>Too early to tell</span>} detail={`under ${MIN_ANSWERS_TO_JUDGE} answers`} />
              </IosGroup>
            </>
          );
        })()}
      </IosSheet>

      <IosSheet open={showJournal} onClose={() => setShowJournal(false)} title="Journal" closeLabel="Done">
        {journalLoading && <p className="text-center text-[15px] py-6" style={{ color: IOS.secondary }}>Loading journal…</p>}
        {!journalLoading && journal?.length === 0 && (
          <p className="text-center text-[15px] py-6" style={{ color: IOS.secondary }}>No journal entries yet.</p>
        )}
        {!journalLoading && journal?.map((entry) => (
          <IosGroup
            key={entry.entry_date}
            header={new Date(entry.entry_date).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
          >
            {([
              ['Did today', entry.done_today],
              ['Hardest part', entry.hardest_challenge],
              ['Grateful for', entry.gratitude],
              ['Tomorrow', entry.tomorrow_plan],
            ] as const).filter(([, v]) => v).map(([label, v]) => (
              <SheetRow key={label}>
                <p className="text-[13px]" style={{ color: IOS.secondary }}>{label}</p>
                <p className="text-[17px] leading-[22px]">{v}</p>
              </SheetRow>
            ))}
          </IosGroup>
        ))}
        {!journalLoading && journal && journal.length > 0 && (
          <p className="text-center text-[13px]" style={{ color: IOS.secondary }}>Showing the last {JOURNAL_LIMIT} days</p>
        )}
      </IosSheet>
    </div>
  );
}
