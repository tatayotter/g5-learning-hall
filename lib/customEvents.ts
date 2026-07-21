import { supabase } from './supabase';
import { format } from 'date-fns';

export interface EventQuest {
  id: string;
  event_id: string;
  subject_name: string;
  summary_markdown: string | null;
  quiz: { question: string; options: string[]; correct_answer: string }[];
  sort_order: number;
  grade_level: number;
}

export interface CustomEvent {
  id: string;
  title: string;
  banner_url: string | null;
  details_markdown: string | null;
  reward_lore_markdown: string | null;
  reward_monster_id: string;
  start_date: string;
  end_date: string;
  status: 'draft' | 'scheduled' | 'active' | 'archived';
}

export interface UserEventProgressRow {
  event_quest_id: string;
  is_mastered: boolean;
  attempts: number;
}

// Only returns an event that is genuinely live: status active, today within
// range, and it has at least one quest — an admin can create/schedule an
// event with metadata only (e.g. days ahead of the Sunday quest-load) and it
// must not surface to students until quests actually exist.
export async function fetchActiveEvent(today: string = format(new Date(), 'yyyy-MM-dd')): Promise<CustomEvent | null> {
  const { data, error } = await supabase
    .from('custom_events')
    .select('*')
    .eq('status', 'active')
    .lte('start_date', today)
    .gte('end_date', today)
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  const { count } = await supabase
    .from('event_quests')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', data.id);

  if (!count) return null;
  return data as CustomEvent;
}

// gradeLevel omitted (admin use) returns every subject across every grade;
// passed (student use) filters to that player's own grade content.
export async function fetchEventQuests(eventId: string, gradeLevel?: number): Promise<EventQuest[]> {
  let query = supabase
    .from('event_quests')
    .select('*')
    .eq('event_id', eventId)
    .order('sort_order', { ascending: true });
  if (gradeLevel !== undefined) {
    query = query.eq('grade_level', gradeLevel);
  }
  const { data, error } = await query;
  if (error || !data) return [];
  return data as EventQuest[];
}

export async function fetchUserEventProgress(userId: string, eventId: string): Promise<UserEventProgressRow[]> {
  const { data, error } = await supabase
    .from('user_event_progress')
    .select('event_quest_id, is_mastered, attempts')
    .eq('user_id', userId)
    .eq('event_id', eventId);
  if (error || !data) return [];
  return data as UserEventProgressRow[];
}

export async function hasClaimedEventReward(userId: string, eventId: string): Promise<boolean> {
  const { data } = await supabase
    .from('user_event_claims')
    .select('id')
    .eq('user_id', userId)
    .eq('event_id', eventId)
    .maybeSingle();
  return !!data;
}

export async function recordEventQuizMastery(
  userId: string,
  eventId: string,
  eventQuestId: string,
  isPerfect: boolean,
  newAttempts: number
) {
  await supabase
    .from('user_event_progress')
    .upsert(
      {
        user_id: userId,
        event_id: eventId,
        event_quest_id: eventQuestId,
        attempts: newAttempts,
        is_mastered: isPerfect,
        mastered_at: isPerfect ? new Date().toISOString() : null,
      },
      { onConflict: 'user_id,event_quest_id' }
    );
}

// Atomic, idempotent — the RPC re-verifies every event_quest is mastered
// and inserts a one-row claim ledger entry before granting the curio, so
// calling this more than once (e.g. a retried request) never double-grants.
export async function claimEventReward(userId: string, eventId: string, gradeLevel: number): Promise<boolean> {
  const { data, error } = await supabase.rpc('claim_event_reward', {
    p_event_id: eventId,
    p_user_id: userId,
    p_grade_level: gradeLevel,
  });
  if (error) {
    console.error('Failed to claim event reward:', error);
    return false;
  }
  return !!data;
}

// Admin-side: list every event, newest first.
export async function fetchAllEvents(): Promise<CustomEvent[]> {
  const { data, error } = await supabase
    .from('custom_events')
    .select('*')
    .order('start_date', { ascending: false });
  if (error || !data) return [];
  return data as CustomEvent[];
}

export async function countEventQuests(eventId: string): Promise<number> {
  const { count } = await supabase
    .from('event_quests')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', eventId);
  return count || 0;
}
