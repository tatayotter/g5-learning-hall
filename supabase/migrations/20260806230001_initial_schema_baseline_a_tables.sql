-- Initial schema baseline, part A of D: TABLES, INDEXES, RLS-ENABLE.
--
-- This is part of a 5-file baseline capturing the foundational schema (51 tables, 62
-- functions, 1 trigger, 1 view) that was built directly against the database (dashboard/SQL
-- editor) before this project adopted migration discipline on 2026-08-07, and was never
-- captured in any migration since.
--
-- Discovered while adding the first database-test CI job this repo has ever had
-- (supabase test db, replaying every migration from scratch against an empty database) --
-- the very first migration already assumed public.current_app_user_id() and
-- public.user_identity_map existed, which they never did anywhere in this directory. A
-- systematic audit (every table/view/function/trigger/extension in production, cross-checked
-- against every CREATE statement in every migration file) found the true scope: 51 tables,
-- 62 functions, 1 trigger and 1 view, essentially the entire early-app foundation.
--
-- NOTE ON THE FUNCTION COUNT: the first version of this audit found 61 functions and, via an
-- actual from-scratch CI replay failure, turned out to have missed one --
-- strip_weekly_quiz_answers, added here in part C. It's used by a VIEW in a later real
-- migration (20260811082838_baseline_weekly_progress_scope.sql) that -- textually further
-- down the very same file -- (re-)defines the function; that only ever worked historically
-- because the function already existed pre-migration-discipline, same as everything else in
-- this baseline, so it needs the same treatment here. A second candidate the same CI failure
-- surfaced, add_trash_stats, was investigated and turned out to be a false positive: it's
-- fully and correctly created by its own real migration
-- (20260821000000_add_trash_stats.sql), just without an explicit "public." schema prefix on
-- the CREATE FUNCTION statement, which is why the first audit's text search missed it. Adding
-- it here too would have been harmless (CREATE OR REPLACE is idempotent) but redundant, so it
-- was left out.
--
-- Generated directly from production's live schema via Postgres introspection
-- (pg_get_functiondef, pg_get_constraintdef, pg_indexes, pg_policies, format_type/attidentity
-- for columns) rather than hand-transcribed, to eliminate copy error risk at this scale.
--
-- NOTE ON VERSIONING: this file's version prefix (20260806230001) is deliberately EARLIER
-- than 20260807000000_boss_fight_schema.sql, which depends on objects defined here. This is
-- intentional and required for a from-scratch replay (CI, local dev, disaster recovery) to
-- succeed in the correct order. Because this schema already existed in production before any
-- migration tracking, the version Supabase actually recorded for this file at apply time
-- (see `supabase migrations list` on the remote project) is a later timestamp reflecting when
-- it was applied, not this filename. That mismatch is expected for a baseline migration and
-- harmless: the SQL is fully idempotent, so re-applying it against production (where every
-- object already exists) is a verified no-op.
--
-- Idempotency: CREATE TABLE uses IF NOT EXISTS, CREATE INDEX uses IF NOT EXISTS, and
-- ALTER TABLE ENABLE ROW LEVEL SECURITY is naturally a no-op if already enabled -- all
-- confirmed by direct testing against production inside a rolled-back transaction.
--
-- Part B (this same baseline) carries the constraints and RLS policies for these tables,
-- since those aren't idempotent via IF NOT EXISTS and need the explicit-existence-check
-- pattern documented there. Part C carries the 62 functions. Part D carries the one trigger
-- and one view.
--
-- NOTE ON COLUMNS ADDED LATER: three columns present in production today are deliberately
-- NOT included in these CREATE TABLE statements, because a real (non-baseline) migration
-- adds each one unconditionally (no IF NOT EXISTS) and would otherwise collide with it on a
-- from-scratch replay -- admin_config.boss_fights_enabled (added by
-- 20260807000000_boss_fight_schema.sql), custom_events.content_source and
-- custom_events.gauntlet_term (added, together with their CHECK constraints, by
-- 20260828140000_topic_mastery_gauntlet.sql -- see part B's header for the matching note on
-- the two CHECK constraints deliberately left out there), and
-- user_event_claims.granted_monster_id (added by
-- 20260902120000_user_event_claims_granted_monster.sql). This is the same category of issue
-- as the version-ordering notes above: this baseline reflects the schema as it existed right
-- before migration discipline began, not production's current state, wherever a later real
-- migration is the true origin of a column. Found via an actual from-scratch CI replay
-- failure (ERROR: column "boss_fights_enabled" of relation "admin_config" already exists),
-- then confirmed complete by scripting a check across every migration file for any
-- unconditional ADD COLUMN targeting a column already in this baseline.

-- ============================================================================
-- 1. TABLES
-- ============================================================================

create table if not exists public.admin_config (
  id boolean not null default true,
  passcode_hash text not null,
  admin_email text);
create table if not exists public.analytics_events (
  id bigint generated always as identity,
  created_at timestamp with time zone not null default now(),
  user_id text not null,
  session_id text not null,
  event_name text not null,
  properties jsonb not null default '{}'::jsonb,
  is_family boolean not null default false,
  app_tab text,
  client_ts timestamp with time zone not null default now());
create table if not exists public.budget_of_work (
  id uuid not null default gen_random_uuid(),
  grade integer not null,
  subject text not null,
  content_markdown text not null,
  source_file text,
  updated_at timestamp with time zone not null default now());
create table if not exists public.child_login_failures (
  id bigint generated always as identity,
  child_id text not null,
  created_at timestamp with time zone not null default now());
create table if not exists public.child_signup_rate_limit (
  id bigint generated always as identity,
  ip text not null,
  created_at timestamp with time zone not null default now());
create table if not exists public.children (
  id text not null,
  parent_id uuid,
  username text not null,
  pin_hash text not null,
  full_name text not null,
  grade text not null,
  gender text not null default 'boy'::text,
  school_name text not null,
  avatar text not null,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  pin_plain text,
  last_reengagement_sent_at timestamp with time zone,
  referral_key text not null,
  referred_by_child_id text,
  marketing_gold_bonus_awarded_at timestamp with time zone,
  push_gold_bonus_child_awarded_at timestamp with time zone,
  push_gold_bonus_parent_awarded_at timestamp with time zone);
create table if not exists public.classmates (
  id text not null,
  username text not null,
  password_hash text not null,
  full_name text not null,
  grade text not null default 'Grade 5'::text,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  gender text not null default 'boy'::text,
  school_name text not null default 'Surigao City Special Science Elementary School'::text);
create table if not exists public.curio_egg_chains (
  species_id text not null,
  predecessor_species_id text not null,
  element text not null,
  updated_at timestamp with time zone not null default now());
create table if not exists public.curio_eggs (
  id uuid not null default gen_random_uuid(),
  user_id text not null,
  parent_user_monster_id uuid,
  egg_species_id text not null,
  element text not null,
  status text not null default 'incubating'::text,
  streak_progress integer not null default 0,
  last_progress_date date not null default (timezone('utc'::text, now()))::date,
  claimed_at timestamp with time zone not null default now(),
  hatched_at timestamp with time zone,
  hatched_user_monster_id uuid);
create table if not exists public.custom_events (
  id uuid not null default gen_random_uuid(),
  title text not null,
  banner_url text,
  details_markdown text,
  reward_lore_markdown text,
  reward_monster_id text not null,
  start_date date not null,
  end_date date not null,
  status text not null default 'draft'::text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now());
create table if not exists public.daily_checklist_claims (
  app_user_id text not null,
  claim_date date not null,
  claimed_at timestamp with time zone not null default now(),
  streak_day integer not null default 1,
  gold_awarded integer not null default 50);
create table if not exists public.demo_accounts (
  user_id text not null,
  created_at timestamp with time zone not null default now());
create table if not exists public.draft_questions (
  id uuid not null default gen_random_uuid(),
  week_starting_date date not null,
  grade integer not null,
  subject text not null,
  tier integer not null,
  topic text not null,
  question text not null,
  options jsonb not null,
  correct_answer text not null,
  status text not null default 'pending_review'::text,
  created_at timestamp with time zone not null default now(),
  reviewed_at timestamp with time zone,
  term integer not null default 1);
create table if not exists public.draft_summaries (
  id uuid not null default gen_random_uuid(),
  week_starting_date date not null,
  grade integer not null,
  subject text not null,
  summary_markdown text not null,
  status text not null default 'pending_review'::text,
  created_at timestamp with time zone not null default now(),
  reviewed_at timestamp with time zone);
create table if not exists public.event_quests (
  id uuid not null default gen_random_uuid(),
  event_id uuid not null,
  subject_name text not null,
  summary_markdown text,
  quiz jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0,
  created_at timestamp with time zone not null default now(),
  grade_level integer not null default 5);
create table if not exists public.family_credentials (
  id text not null,
  password_hash text not null,
  created_at timestamp with time zone not null default now());
create table if not exists public.journal_entries (
  id uuid not null default gen_random_uuid(),
  entry_date date not null,
  week_starting_date date not null,
  done_today text,
  tomorrow_plan text,
  hardest_challenge text,
  gratitude text,
  created_at timestamp with time zone default now(),
  user_id text);
create table if not exists public.leaderboard_reactions (
  id uuid not null default gen_random_uuid(),
  from_user_id text not null,
  to_user_id text not null,
  emoji text not null default '👏'::text,
  created_at timestamp with time zone not null default now());
create table if not exists public.live_battles (
  id uuid not null default gen_random_uuid(),
  challenger_id text not null,
  opponent_id text not null,
  status text not null default 'pending_invite'::text,
  channel_name text not null,
  round_number integer not null default 0,
  round_deadline_at timestamp with time zone,
  challenger_team jsonb not null,
  opponent_team jsonb not null,
  challenger_hp jsonb not null,
  opponent_hp jsonb not null,
  winner_id text,
  end_reason text,
  invited_at timestamp with time zone not null default now(),
  accepted_at timestamp with time zone,
  started_at timestamp with time zone,
  ended_at timestamp with time zone,
  result_written_by text,
  created_at timestamp with time zone not null default now());
create table if not exists public.monster_battle_log (
  id uuid not null default gen_random_uuid(),
  user_id text not null,
  opponent text not null,
  result text not null,
  monster_exp_earned integer default 0,
  created_at timestamp with time zone default now());
create table if not exists public.parent_link_requests (
  id uuid not null default gen_random_uuid(),
  child_id text not null,
  parent_email text not null,
  token_hash text not null,
  status text not null default 'pending'::text,
  attempts integer not null default 0,
  created_at timestamp with time zone not null default now(),
  expires_at timestamp with time zone not null default (now() + '24:00:00'::interval),
  completed_at timestamp with time zone);
create table if not exists public.parents (
  id uuid not null,
  full_name text not null,
  phone text,
  status text not null default 'approved'::text,
  created_at timestamp with time zone not null default now(),
  approved_at timestamp with time zone,
  approved_by uuid,
  marketing_opt_in boolean not null default false,
  marketing_opt_in_at timestamp with time zone);
create table if not exists public.pending_parent_reassignments (
  id uuid not null default gen_random_uuid(),
  child_id text not null,
  old_parent_id uuid,
  new_parent_id uuid not null,
  reason text not null,
  admin_email text,
  cancel_token_hash text not null,
  status text not null default 'pending'::text,
  created_at timestamp with time zone not null default now(),
  effective_at timestamp with time zone not null default (now() + '48:00:00'::interval),
  cancelled_at timestamp with time zone,
  completed_at timestamp with time zone);
create table if not exists public.player_inventory (
  id uuid not null default gen_random_uuid(),
  app_user_id text not null,
  item_key text not null,
  quantity integer default 0,
  last_daily_claim date,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now());
create table if not exists public.player_log (
  id uuid not null default gen_random_uuid(),
  week_starting_date date not null,
  action_type text not null,
  description text not null,
  xp_change integer default 0,
  gold_change integer default 0,
  created_at timestamp with time zone default now(),
  user_id text not null default 'damien'::text);
create table if not exists public.player_referral_keys (
  app_user_id text not null,
  referral_key text not null);
create table if not exists public.quiz_attempts (
  id bigint generated by default as identity,
  guide_id bigint,
  score integer not null,
  total_questions integer not null,
  incorrect_answers jsonb,
  attempted_at timestamp with time zone not null default timezone('utc'::text, now()));
create table if not exists public.reassignment_cron_secret (
  id boolean not null default true,
  secret_hash text not null);
create table if not exists public.reward_claims (
  id bigint generated by default as identity,
  user_id uuid default auth.uid(),
  item_key text not null,
  item_name text not null,
  cost integer not null,
  status text default 'pending'::text,
  created_at timestamp with time zone default now(),
  app_user_id text default 'damien'::text);
create table if not exists public.shop_items (
  key text not null,
  name text not null,
  category text not null,
  cost integer not null,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now());
create table if not exists public.sq_lexicon_arena (
  id uuid not null default gen_random_uuid(),
  term_id integer not null default 1,
  is_active boolean not null default true,
  grade_level integer not null default 5,
  language text not null default 'English'::text,
  definition text not null,
  correct_spelling text not null,
  wrong_a text not null,
  wrong_b text not null,
  wrong_c text not null,
  difficulty_tier integer not null default 1);
create table if not exists public.sq_logic_labyrinth (
  id uuid not null default gen_random_uuid(),
  term_id integer not null,
  is_active boolean not null default true,
  puzzle_prompt_text text,
  matrix_image_url text,
  options_array jsonb not null,
  correct_option_id text not null,
  grade_level integer default 5,
  difficulty_tier integer not null default 1);
create table if not exists public.sq_lorekeeper (
  id uuid not null default gen_random_uuid(),
  term_id integer not null,
  is_active boolean not null default true,
  passage text,
  question text not null,
  choice_a text not null,
  choice_b text not null,
  choice_c text not null,
  choice_d text not null,
  correct_choice text not null,
  grade_level integer default 5,
  difficulty_tier integer not null default 1);
create table if not exists public.sq_number_realm (
  id uuid not null default gen_random_uuid(),
  term_id integer not null,
  is_active boolean not null default true,
  problem_prompt text not null,
  expected_layout text not null,
  correct_numerator integer,
  correct_denominator integer,
  correct_standard_ans text,
  grade_level integer default 5,
  difficulty_tier integer not null default 1);
create table if not exists public.sq_spellcaster (
  id uuid not null default gen_random_uuid(),
  term_id integer not null,
  is_active boolean not null default true,
  word_string text not null,
  difficulty_tier integer not null default 1,
  grade_level integer default 5);
create table if not exists public.sq_wild_encounter (
  id uuid not null default gen_random_uuid(),
  term_id integer not null,
  is_active boolean not null default true,
  passage text,
  question text not null,
  choice_a text not null,
  choice_b text not null,
  choice_c text not null,
  choice_d text not null,
  correct_choice text not null,
  grade_level integer default 5);
create table if not exists public.study_guides (
  id bigint generated by default as identity,
  subject_id bigint,
  target_date date not null,
  summary_markdown text not null,
  quiz_json jsonb not null,
  created_at timestamp with time zone not null default timezone('utc'::text, now()));
create table if not exists public.subjects (
  id bigint generated by default as identity,
  name text not null);
create table if not exists public.subscriptions (
  id uuid not null default gen_random_uuid(),
  parent_id uuid,
  status text not null default 'none'::text,
  addon_children integer not null default 0,
  coin_pool_balance integer not null default 0,
  current_period_start timestamp with time zone,
  current_period_end timestamp with time zone,
  paymongo_checkout_id text,
  paymongo_payment_id text,
  amount_php numeric,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  fbp text,
  fbc text,
  client_ip text,
  client_user_agent text,
  last_coin_reminder_for_period timestamp with time zone,
  last_renewal_reminder_for_period timestamp with time zone);
create table if not exists public.trade_items (
  id uuid not null default gen_random_uuid(),
  trade_id uuid not null,
  side text not null,
  user_monster_id uuid not null);
create table if not exists public.trades (
  id uuid not null default gen_random_uuid(),
  initiator_id text not null,
  recipient_id text not null,
  status text not null default 'pending'::text,
  initiator_gold integer not null default 0,
  recipient_gold integer not null default 0,
  initiator_fee_gold integer,
  recipient_fee_gold integer,
  fail_reason text,
  created_at timestamp with time zone not null default now(),
  expires_at timestamp with time zone not null default (now() + '48:00:00'::interval),
  responded_at timestamp with time zone,
  thread_id uuid not null default gen_random_uuid(),
  parent_trade_id uuid);
create table if not exists public.user_avatars (
  user_id text not null,
  avatar text not null,
  updated_at timestamp with time zone not null default timezone('utc'::text, now()));
create table if not exists public.user_battle_state (
  id uuid not null default gen_random_uuid(),
  user_id text not null,
  map_x integer default 5,
  map_y integer default 5,
  defeated_trainers text[] default '{}'::text[],
  active_monster_slot integer default 1,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  last_sibling_battle date,
  last_pvp_win date,
  last_wild_encounter_win date,
  guild_last_played jsonb not null default '{}'::jsonb,
  seen_monsters text[] not null default '{}'::text[],
  questions_since_wild_encounter integer not null default 0);
create table if not exists public.user_caught_monsters (
  id uuid not null default gen_random_uuid(),
  user_id text not null,
  monster_id text not null,
  nickname text,
  monster_level integer not null default 1,
  monster_exp integer not null default 0,
  caught_at timestamp with time zone not null default now(),
  quality text not null default 'normal'::text);
create table if not exists public.user_event_claims (
  id uuid not null default gen_random_uuid(),
  event_id uuid not null,
  user_id text not null,
  claimed_at timestamp with time zone not null default now());
create table if not exists public.user_event_progress (
  id uuid not null default gen_random_uuid(),
  event_id uuid not null,
  user_id text not null,
  event_quest_id uuid not null,
  attempts integer not null default 0,
  is_mastered boolean not null default false,
  mastered_at timestamp with time zone);
create table if not exists public.user_identity_map (
  auth_uid uuid not null,
  app_user_id text not null,
  created_at timestamp with time zone not null default now());
create table if not exists public.user_last_login (
  user_id text not null,
  last_login timestamp with time zone not null default now(),
  onboarding_completed_at timestamp with time zone);
create table if not exists public.user_monsters (
  id uuid not null default gen_random_uuid(),
  user_id text not null,
  monster_id text not null,
  nickname text,
  monster_exp integer default 0,
  monster_level integer default 1,
  slot integer,
  rest_used integer default 0,
  created_at timestamp with time zone default now(),
  equipped_skills text[] not null default ARRAY[NULL::text, NULL::text, NULL::text],
  graduation_tier integer not null default 0,
  acquired_via text not null default 'caught'::text,
  quality text not null default 'normal'::text);
create table if not exists public.user_subclass_profiles (
  id uuid not null default gen_random_uuid(),
  user_id text not null default 'damien'::text,
  lorekeeper_lvl integer not null default 1,
  lorekeeper_xp integer not null default 0,
  spellcaster_lvl integer not null default 1,
  spellcaster_xp integer not null default 0,
  number_realm_lvl integer not null default 1,
  number_realm_xp integer not null default 0,
  logic_labyrinth_lvl integer not null default 1,
  logic_labyrinth_xp integer not null default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  lexicon_arena_lvl integer not null default 1,
  lexicon_arena_xp integer not null default 0,
  lorekeeper_tier integer not null default 2,
  spellcaster_tier integer not null default 2,
  number_realm_tier integer not null default 2,
  logic_labyrinth_tier integer not null default 2,
  lexicon_arena_tier integer not null default 2);
create table if not exists public.user_themes (
  user_id text not null,
  theme_key text not null default 'theme_default'::text,
  updated_at timestamp with time zone not null default now());

-- ============================================================================
-- 2. INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS analytics_events_session_id_idx ON public.analytics_events USING btree (session_id);
CREATE INDEX IF NOT EXISTS analytics_events_user_id_created_at_idx ON public.analytics_events USING btree (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS analytics_events_event_name_created_at_idx ON public.analytics_events USING btree (event_name, created_at DESC);
CREATE INDEX IF NOT EXISTS child_login_failures_child_idx ON public.child_login_failures USING btree (child_id, created_at);
CREATE INDEX IF NOT EXISTS child_signup_rate_limit_ip_idx ON public.child_signup_rate_limit USING btree (ip, created_at);
CREATE INDEX IF NOT EXISTS children_parent_id_idx ON public.children USING btree (parent_id);
CREATE INDEX IF NOT EXISTS curio_eggs_user_id_idx ON public.curio_eggs USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_draft_questions_review ON public.draft_questions USING btree (grade, subject, tier, status);
CREATE INDEX IF NOT EXISTS idx_draft_summaries_review ON public.draft_summaries USING btree (grade, subject, status);
CREATE INDEX IF NOT EXISTS leaderboard_reactions_to_user_idx ON public.leaderboard_reactions USING btree (to_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS live_battles_challenger_id_status_idx ON public.live_battles USING btree (challenger_id, status);
CREATE INDEX IF NOT EXISTS live_battles_opponent_id_status_idx ON public.live_battles USING btree (opponent_id, status);
CREATE INDEX IF NOT EXISTS parent_link_requests_rate_limit_idx ON public.parent_link_requests USING btree (child_id, created_at);
CREATE INDEX IF NOT EXISTS parent_link_requests_email_rate_limit_idx ON public.parent_link_requests USING btree (parent_email, created_at);
CREATE INDEX IF NOT EXISTS parent_link_requests_pending_child_idx ON public.parent_link_requests USING btree (child_id) WHERE (status = 'pending'::text);
CREATE INDEX IF NOT EXISTS parent_link_requests_token_hash_idx ON public.parent_link_requests USING btree (token_hash);
CREATE INDEX IF NOT EXISTS pending_parent_reassignments_pending_idx ON public.pending_parent_reassignments USING btree (child_id) WHERE (status = 'pending'::text);
CREATE INDEX IF NOT EXISTS pending_parent_reassignments_due_idx ON public.pending_parent_reassignments USING btree (effective_at) WHERE (status = 'pending'::text);
CREATE INDEX IF NOT EXISTS idx_lexicon_arena_active ON public.sq_lexicon_arena USING btree (term_id, is_active, grade_level);
CREATE INDEX IF NOT EXISTS idx_logic_labyrinth_active ON public.sq_logic_labyrinth USING btree (term_id, is_active);
CREATE INDEX IF NOT EXISTS idx_lorekeeper_active ON public.sq_lorekeeper USING btree (term_id, is_active);
CREATE INDEX IF NOT EXISTS idx_number_realm_active ON public.sq_number_realm USING btree (term_id, is_active);
CREATE INDEX IF NOT EXISTS idx_spellcaster_active ON public.sq_spellcaster USING btree (term_id, is_active);
CREATE INDEX IF NOT EXISTS subscriptions_parent_id_idx ON public.subscriptions USING btree (parent_id);
CREATE INDEX IF NOT EXISTS trade_items_trade_idx ON public.trade_items USING btree (trade_id);
CREATE INDEX IF NOT EXISTS trades_initiator_idx ON public.trades USING btree (initiator_id);
CREATE INDEX IF NOT EXISTS trades_recipient_idx ON public.trades USING btree (recipient_id);
CREATE INDEX IF NOT EXISTS trades_thread_idx ON public.trades USING btree (thread_id);
CREATE INDEX IF NOT EXISTS user_identity_map_app_user_id_idx ON public.user_identity_map USING btree (app_user_id);

-- ============================================================================
-- 3. RLS ENABLE
-- ============================================================================

alter table public.admin_config enable row level security;
alter table public.analytics_events enable row level security;
alter table public.budget_of_work enable row level security;
alter table public.child_login_failures enable row level security;
alter table public.child_signup_rate_limit enable row level security;
alter table public.children enable row level security;
alter table public.classmates enable row level security;
alter table public.curio_egg_chains enable row level security;
alter table public.curio_eggs enable row level security;
alter table public.custom_events enable row level security;
alter table public.daily_checklist_claims enable row level security;
alter table public.demo_accounts enable row level security;
alter table public.draft_questions enable row level security;
alter table public.draft_summaries enable row level security;
alter table public.event_quests enable row level security;
alter table public.family_credentials enable row level security;
alter table public.journal_entries enable row level security;
alter table public.leaderboard_reactions enable row level security;
alter table public.live_battles enable row level security;
alter table public.monster_battle_log enable row level security;
alter table public.parent_link_requests enable row level security;
alter table public.parents enable row level security;
alter table public.pending_parent_reassignments enable row level security;
alter table public.player_inventory enable row level security;
alter table public.player_log enable row level security;
alter table public.player_referral_keys enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.reassignment_cron_secret enable row level security;
alter table public.reward_claims enable row level security;
alter table public.shop_items enable row level security;
alter table public.sq_lexicon_arena enable row level security;
alter table public.sq_logic_labyrinth enable row level security;
alter table public.sq_lorekeeper enable row level security;
alter table public.sq_number_realm enable row level security;
alter table public.sq_spellcaster enable row level security;
alter table public.sq_wild_encounter enable row level security;
alter table public.study_guides enable row level security;
alter table public.subjects enable row level security;
alter table public.subscriptions enable row level security;
alter table public.trade_items enable row level security;
alter table public.trades enable row level security;
alter table public.user_avatars enable row level security;
alter table public.user_battle_state enable row level security;
alter table public.user_caught_monsters enable row level security;
alter table public.user_event_claims enable row level security;
alter table public.user_event_progress enable row level security;
alter table public.user_identity_map enable row level security;
alter table public.user_last_login enable row level security;
alter table public.user_monsters enable row level security;
alter table public.user_subclass_profiles enable row level security;
alter table public.user_themes enable row level security;
