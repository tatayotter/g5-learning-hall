'use client';
// offline-shell/app/page.tsx
//
// Phase-1 proof-of-concept screen: NumberRealm practice, standard-layout
// questions only (fraction/time layouts, and the other 4 guilds, are a
// later pass — see the plan doc). Runs entirely off the local SQLite cache
// populated by the main app's caching-writer; no Supabase calls here.
import { useEffect, useState } from 'react';
import {
  isOfflineStorageAvailable,
  getActiveUserLocal,
  getCachedGuildPoolAnyTier,
  getLocallyCompletedQuestionIds,
  markQuestionsCompletedLocal,
} from '@/lib/localDataSource';

interface NumberRealmQuestion {
  id: string;
  problem_prompt: string;
  expected_layout: 'standard' | 'fraction' | 'time';
  correct_standard_ans: string | null;
}

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

type Screen = 'loading' | 'no-profile' | 'no-questions' | 'playing' | 'done';

export default function OfflinePracticePage() {
  const [screen, setScreen] = useState<Screen>('loading');
  const [userId, setUserId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<NumberRealmQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [correctCount, setCorrectCount] = useState(0);
  const [answeredIds, setAnsweredIds] = useState<string[]>([]);
  const [flash, setFlash] = useState<'correct' | 'wrong' | null>(null);

  useEffect(() => {
    async function load() {
      if (!isOfflineStorageAvailable()) {
        setScreen('no-profile');
        return;
      }
      const active = await getActiveUserLocal();
      if (!active) {
        setScreen('no-profile');
        return;
      }
      setUserId(active.userId);

      const [pool, completedIds] = await Promise.all([
        getCachedGuildPoolAnyTier('sq_number_realm', 'number_realm', active.gradeLevel ?? undefined),
        getLocallyCompletedQuestionIds(active.userId, 'number_realm'),
      ]);

      const standardOnly = (pool as NumberRealmQuestion[]).filter(q => q.expected_layout === 'standard');
      const remaining = standardOnly.filter(q => !completedIds.has(q.id));
      const session = shuffle(remaining.length > 0 ? remaining : standardOnly).slice(0, 10);

      if (session.length === 0) {
        setScreen('no-questions');
        return;
      }
      setQuestions(session);
      setScreen('playing');
    }
    load();
  }, []);

  async function submitAnswer() {
    const q = questions[index];
    const isCorrect = answer.trim().toLowerCase() === (q.correct_standard_ans || '').trim().toLowerCase();
    setFlash(isCorrect ? 'correct' : 'wrong');
    if (isCorrect) setCorrectCount(c => c + 1);
    setAnsweredIds(ids => [...ids, q.id]);

    setTimeout(async () => {
      setFlash(null);
      setAnswer('');
      if (index + 1 < questions.length) {
        setIndex(i => i + 1);
      } else {
        if (userId) await markQuestionsCompletedLocal(userId, 'number_realm', [...answeredIds, q.id]);
        setScreen('done');
      }
    }, 500);
  }

  if (screen === 'loading') return <Centered>Loading…</Centered>;
  if (screen === 'no-profile') {
    return <Centered>No cached profile yet — open Learning Hall online at least once before playing offline.</Centered>;
  }
  if (screen === 'no-questions') {
    return <Centered>No Number Realm questions cached yet — connect to the internet once so this week's practice set can download.</Centered>;
  }
  if (screen === 'done') {
    return <Centered>Session complete — {correctCount}/{questions.length} correct.<br />Your progress will sync next time you're online.</Centered>;
  }

  const q = questions[index];
  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: 24 }}>
      <p style={{ opacity: 0.6, fontSize: 14 }}>Number Realm (offline) — question {index + 1} of {questions.length}</p>
      <h2 style={{ fontSize: 22 }}>{q.problem_prompt}</h2>
      <input
        value={answer}
        onChange={e => setAnswer(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && submitAnswer()}
        style={{ fontSize: 18, padding: 8, width: '100%', marginTop: 16, borderRadius: 8, border: 'none' }}
        autoFocus
      />
      <button
        onClick={submitAnswer}
        style={{ marginTop: 12, padding: '10px 20px', borderRadius: 8, border: 'none', background: '#4f46e5', color: '#fff', fontSize: 16 }}
      >
        Submit
      </button>
      {flash && <p style={{ marginTop: 12, color: flash === 'correct' ? '#4ade80' : '#f87171' }}>{flash === 'correct' ? 'Correct!' : 'Not quite.'}</p>}
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', textAlign: 'center', padding: 24 }}>
      <p>{children}</p>
    </div>
  );
}
