'use client';
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { IOS, Icon, IosCapsule, IosGroup, IosRow, IosSheet, type IconName } from '@/components/parent/ios';

interface Props {
  childId: string;
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
}

const SKILLS: { key: keyof SubclassProfile; label: string; icon: IconName; color: string }[] = [
  { key: 'lorekeeper_lvl', label: 'Reading', icon: 'book', color: IOS.blue },
  { key: 'spellcaster_lvl', label: 'Spelling', icon: 'doc', color: IOS.green },
  { key: 'number_realm_lvl', label: 'Math', icon: 'chart', color: IOS.purple },
  { key: 'logic_labyrinth_lvl', label: 'Logic', icon: 'target', color: IOS.orange },
  { key: 'lexicon_arena_lvl', label: 'Vocabulary', icon: 'journal', color: IOS.pink },
];

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
export default function ChildProgressPanel({ childId, isPremium, coinBalance, onCoinsAwarded }: Props) {
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
          .select('lorekeeper_lvl, spellcaster_lvl, number_realm_lvl, logic_labyrinth_lvl, lexicon_arena_lvl')
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
    setShowWeakTopics(true);
    if (weakTopics !== null) return;
    setWeakTopicsLoading(true);
    const { data, error } = await supabase.rpc('get_child_weak_topics', { p_child_id: childId });
    setWeakTopicsLoading(false);
    if (error) {
      console.error('Failed to load weak topics:', error);
      return;
    }
    setWeakTopics((data as WeakTopic[]) ?? []);
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
        <IosGroup header="Skills">
          {SKILLS.map((s) => (
            <IosRow key={s.key} icon={s.icon} iconColor={s.color} title={s.label} detail={`Level ${subclass[s.key]}`} />
          ))}
        </IosGroup>
      )}

      <IosGroup
        header="Insights"
        footer={isPremium ? undefined : 'Journal viewing and weak-topic reports are included with Premium.'}
      >
        <IosRow
          icon="journal"
          iconColor={IOS.indigo}
          title="Journal"
          subtitle="What your child wrote after each day's quests"
          onClick={isPremium ? handleOpenJournal : undefined}
          accessory={isPremium ? undefined : lockIcon}
        />
        <IosRow
          icon="target"
          iconColor={IOS.pink}
          title="Weak topics"
          subtitle="Subjects with the highest miss rate"
          onClick={isPremium ? handleOpenWeakTopics : undefined}
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

      <IosSheet open={showWeakTopics} onClose={() => setShowWeakTopics(false)} title="Weak Topics" closeLabel="Done">
        {weakTopicsLoading && <p className="text-center text-[15px] py-6" style={{ color: IOS.secondary }}>Loading report…</p>}
        {!weakTopicsLoading && weakTopics?.length === 0 && (
          <p className="text-center text-[15px] py-6 px-4" style={{ color: IOS.secondary }}>
            Not enough attempts yet to spot a pattern. Check back after a few more quiz days.
          </p>
        )}
        {!weakTopicsLoading && weakTopics && weakTopics.length > 0 && (
          <IosGroup footer="Miss rate across every attempt logged, highest first.">
            {weakTopics.map((t) => {
              const color = t.wrong_pct >= 50 ? IOS.red : t.wrong_pct >= 30 ? IOS.orange : IOS.green;
              return (
                <SheetRow key={t.subject}>
                  <div className="space-y-2 py-0.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[17px] truncate">{t.subject}</span>
                      <span className="text-[15px] font-semibold tabular-nums shrink-0" style={{ color }}>{t.wrong_pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#7676801F' }}>
                      <div className="h-full rounded-full" style={{ width: `${Math.min(100, t.wrong_pct)}%`, background: color }} />
                    </div>
                    <p className="text-[13px]" style={{ color: IOS.secondary }}>{t.wrong_count} of {t.total_count} missed</p>
                  </div>
                </SheetRow>
              );
            })}
          </IosGroup>
        )}
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
