-- Initial schema baseline, part B of D: CONSTRAINTS (PK/FK/UNIQUE/CHECK) and RLS POLICIES.
--
-- See part A (20260806230001_initial_schema_baseline_a_tables.sql) for the full rationale,
-- versioning note, and idempotency notes shared by this whole baseline.
--
-- This file is deliberately versioned AFTER part C (20260806230002_..._c_functions.sql),
-- not before it: several of these RLS policies call public.current_app_user_id(), and
-- Postgres resolves that function reference at CREATE POLICY time, so the function must
-- already exist. Ordering it A (tables) -> C (functions) -> B (this file) -> D (view) makes
-- a from-scratch replay succeed without any forward references.
--
-- Idempotency: Postgres has no IF NOT EXISTS for ADD CONSTRAINT or CREATE POLICY, so each
-- is wrapped in a DO block with an explicit existence check against pg_constraint /
-- pg_policies before running. An earlier draft used EXCEPTION WHEN duplicate_object instead,
-- but that doesn't catch every case -- adding a second primary key raises
-- invalid_table_definition (42P16), a different exception class, discovered via a real
-- dry-run failure against production. The explicit-check pattern here was verified against
-- that specific case (admin_config's primary key) plus a representative sample spanning
-- every statement shape present in this file (a FOREIGN KEY, a composite PRIMARY KEY, an
-- ARRAY-based CHECK, a policy with an EXISTS subquery, a policy with an unquoted name).
--
-- NOTE ON TWO MISSING CHECK CONSTRAINTS: custom_events_content_source_check and
-- custom_events_gauntlet_term_check are deliberately NOT in this file, even though
-- production has them. Both columns they check are added later by the real migration
-- 20260828140000_topic_mastery_gauntlet.sql, together with these exact CHECK constraints,
-- via `alter table ... add column ... check (...)` -- so creating them here (before that
-- column exists) would fail, and creating them here AND letting that migration create them
-- again would just be redundant. See part A's matching header note for the two columns.
--
-- NOTE ON ONE MISSING POLICY: children's "parent can read own children" policy is also
-- deliberately NOT in this file, for the same reason -- 20260812110000_lock_down_children_
-- classmates_credentials.sql is that policy's real origin (it drops the old, insecure
-- "public can read active children of approved parents" policy and replaces it with this
-- one, unconditionally, with no existence check since it assumes a fresh create right after
-- its own drop). A from-scratch CI replay caught this with "policy already exists"
-- (SQLSTATE 42710); confirmed complete by scripting the same kind of check used for the
-- ADD COLUMN issue in part A, this time for CREATE POLICY name collisions across every
-- migration file.
--
-- Ordered in three passes within this file: all PRIMARY KEY/UNIQUE/CHECK constraints
-- first, then all FOREIGN KEY constraints, then all RLS policies. A single table-order
-- pass (alphabetical, matching the original introspection order) isn't safe here --
-- children_parent_id_fkey references parents(id), but 'children' sorts before 'parents'
-- alphabetically, so a first attempt at this file failed a from-scratch CI replay with
-- 'there is no unique constraint matching given keys for referenced table "parents"'
-- (SQLSTATE 42830). Grouping by constraint kind instead sidesteps every such ordering
-- issue at once, regardless of which table alphabetically precedes which.

do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'admin_config_pkey' and conrelid = 'public.admin_config'::regclass) then
    alter table only public.admin_config add constraint admin_config_pkey PRIMARY KEY (id);
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'admin_config_singleton' and conrelid = 'public.admin_config'::regclass) then
    alter table only public.admin_config add constraint admin_config_singleton CHECK (id);
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'analytics_events_pkey' and conrelid = 'public.analytics_events'::regclass) then
    alter table only public.analytics_events add constraint analytics_events_pkey PRIMARY KEY (id);
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'budget_of_work_pkey' and conrelid = 'public.budget_of_work'::regclass) then
    alter table only public.budget_of_work add constraint budget_of_work_pkey PRIMARY KEY (id);
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'budget_of_work_grade_subject_key' and conrelid = 'public.budget_of_work'::regclass) then
    alter table only public.budget_of_work add constraint budget_of_work_grade_subject_key UNIQUE (grade, subject);
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'budget_of_work_grade_check' and conrelid = 'public.budget_of_work'::regclass) then
    alter table only public.budget_of_work add constraint budget_of_work_grade_check CHECK (((grade >= 2) AND (grade <= 6)));
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'child_login_failures_pkey' and conrelid = 'public.child_login_failures'::regclass) then
    alter table only public.child_login_failures add constraint child_login_failures_pkey PRIMARY KEY (id);
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'child_signup_rate_limit_pkey' and conrelid = 'public.child_signup_rate_limit'::regclass) then
    alter table only public.child_signup_rate_limit add constraint child_signup_rate_limit_pkey PRIMARY KEY (id);
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'children_pkey' and conrelid = 'public.children'::regclass) then
    alter table only public.children add constraint children_pkey PRIMARY KEY (id);
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'children_referral_key_key' and conrelid = 'public.children'::regclass) then
    alter table only public.children add constraint children_referral_key_key UNIQUE (referral_key);
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'children_username_key' and conrelid = 'public.children'::regclass) then
    alter table only public.children add constraint children_username_key UNIQUE (username);
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'children_gender_check' and conrelid = 'public.children'::regclass) then
    alter table only public.children add constraint children_gender_check CHECK ((gender = ANY (ARRAY['boy'::text, 'girl'::text])));
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'children_grade_check' and conrelid = 'public.children'::regclass) then
    alter table only public.children add constraint children_grade_check CHECK ((grade = ANY (ARRAY['Grade 2'::text, 'Grade 3'::text, 'Grade 4'::text, 'Grade 5'::text, 'Grade 6'::text])));
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'classmates_pkey' and conrelid = 'public.classmates'::regclass) then
    alter table only public.classmates add constraint classmates_pkey PRIMARY KEY (id);
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'classmates_username_key' and conrelid = 'public.classmates'::regclass) then
    alter table only public.classmates add constraint classmates_username_key UNIQUE (username);
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'classmates_gender_check' and conrelid = 'public.classmates'::regclass) then
    alter table only public.classmates add constraint classmates_gender_check CHECK ((gender = ANY (ARRAY['boy'::text, 'girl'::text])));
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'classmates_grade_check' and conrelid = 'public.classmates'::regclass) then
    alter table only public.classmates add constraint classmates_grade_check CHECK ((grade = ANY (ARRAY['Grade 2'::text, 'Grade 3'::text, 'Grade 4'::text, 'Grade 5'::text, 'Grade 6'::text])));
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'curio_egg_chains_pkey' and conrelid = 'public.curio_egg_chains'::regclass) then
    alter table only public.curio_egg_chains add constraint curio_egg_chains_pkey PRIMARY KEY (species_id);
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'curio_eggs_pkey' and conrelid = 'public.curio_eggs'::regclass) then
    alter table only public.curio_eggs add constraint curio_eggs_pkey PRIMARY KEY (id);
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'curio_eggs_parent_user_monster_id_key' and conrelid = 'public.curio_eggs'::regclass) then
    alter table only public.curio_eggs add constraint curio_eggs_parent_user_monster_id_key UNIQUE (parent_user_monster_id);
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'curio_eggs_status_check' and conrelid = 'public.curio_eggs'::regclass) then
    alter table only public.curio_eggs add constraint curio_eggs_status_check CHECK ((status = ANY (ARRAY['incubating'::text, 'stalled'::text, 'hatched'::text])));
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'custom_events_pkey' and conrelid = 'public.custom_events'::regclass) then
    alter table only public.custom_events add constraint custom_events_pkey PRIMARY KEY (id);
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'custom_events_dates_check' and conrelid = 'public.custom_events'::regclass) then
    alter table only public.custom_events add constraint custom_events_dates_check CHECK ((end_date >= start_date));
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'custom_events_status_check' and conrelid = 'public.custom_events'::regclass) then
    alter table only public.custom_events add constraint custom_events_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'scheduled'::text, 'active'::text, 'archived'::text])));
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'daily_checklist_claims_pkey' and conrelid = 'public.daily_checklist_claims'::regclass) then
    alter table only public.daily_checklist_claims add constraint daily_checklist_claims_pkey PRIMARY KEY (app_user_id, claim_date);
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'demo_accounts_pkey' and conrelid = 'public.demo_accounts'::regclass) then
    alter table only public.demo_accounts add constraint demo_accounts_pkey PRIMARY KEY (user_id);
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'draft_questions_pkey' and conrelid = 'public.draft_questions'::regclass) then
    alter table only public.draft_questions add constraint draft_questions_pkey PRIMARY KEY (id);
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'draft_questions_tier_check' and conrelid = 'public.draft_questions'::regclass) then
    alter table only public.draft_questions add constraint draft_questions_tier_check CHECK (((tier >= 1) AND (tier <= 3)));
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'draft_questions_status_check' and conrelid = 'public.draft_questions'::regclass) then
    alter table only public.draft_questions add constraint draft_questions_status_check CHECK ((status = ANY (ARRAY['pending_review'::text, 'approved'::text, 'rejected'::text, 'published'::text])));
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'draft_questions_grade_check' and conrelid = 'public.draft_questions'::regclass) then
    alter table only public.draft_questions add constraint draft_questions_grade_check CHECK (((grade >= 2) AND (grade <= 6)));
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'draft_summaries_pkey' and conrelid = 'public.draft_summaries'::regclass) then
    alter table only public.draft_summaries add constraint draft_summaries_pkey PRIMARY KEY (id);
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'draft_summaries_grade_check' and conrelid = 'public.draft_summaries'::regclass) then
    alter table only public.draft_summaries add constraint draft_summaries_grade_check CHECK (((grade >= 2) AND (grade <= 6)));
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'draft_summaries_status_check' and conrelid = 'public.draft_summaries'::regclass) then
    alter table only public.draft_summaries add constraint draft_summaries_status_check CHECK ((status = ANY (ARRAY['pending_review'::text, 'approved'::text, 'rejected'::text, 'published'::text])));
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'event_quests_pkey' and conrelid = 'public.event_quests'::regclass) then
    alter table only public.event_quests add constraint event_quests_pkey PRIMARY KEY (id);
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'event_quests_event_id_subject_name_grade_key' and conrelid = 'public.event_quests'::regclass) then
    alter table only public.event_quests add constraint event_quests_event_id_subject_name_grade_key UNIQUE (event_id, subject_name, grade_level);
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'event_quests_grade_level_check' and conrelid = 'public.event_quests'::regclass) then
    alter table only public.event_quests add constraint event_quests_grade_level_check CHECK (((grade_level >= 2) AND (grade_level <= 6)));
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'family_credentials_pkey' and conrelid = 'public.family_credentials'::regclass) then
    alter table only public.family_credentials add constraint family_credentials_pkey PRIMARY KEY (id);
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'journal_entries_pkey' and conrelid = 'public.journal_entries'::regclass) then
    alter table only public.journal_entries add constraint journal_entries_pkey PRIMARY KEY (id);
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'leaderboard_reactions_pkey' and conrelid = 'public.leaderboard_reactions'::regclass) then
    alter table only public.leaderboard_reactions add constraint leaderboard_reactions_pkey PRIMARY KEY (id);
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'live_battles_pkey' and conrelid = 'public.live_battles'::regclass) then
    alter table only public.live_battles add constraint live_battles_pkey PRIMARY KEY (id);
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'live_battles_end_reason_check' and conrelid = 'public.live_battles'::regclass) then
    alter table only public.live_battles add constraint live_battles_end_reason_check CHECK (((end_reason = ANY (ARRAY['ko'::text, 'forfeit_timeout'::text, 'forfeit_disconnect'::text, 'declined'::text, 'expired'::text, 'surrender'::text])) OR (end_reason IS NULL)));
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'live_battles_status_check' and conrelid = 'public.live_battles'::regclass) then
    alter table only public.live_battles add constraint live_battles_status_check CHECK ((status = ANY (ARRAY['pending_invite'::text, 'accepted'::text, 'declined'::text, 'in_progress'::text, 'completed'::text, 'expired'::text, 'forfeited'::text])));
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'monster_battle_log_pkey' and conrelid = 'public.monster_battle_log'::regclass) then
    alter table only public.monster_battle_log add constraint monster_battle_log_pkey PRIMARY KEY (id);
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'monster_battle_log_result_check' and conrelid = 'public.monster_battle_log'::regclass) then
    alter table only public.monster_battle_log add constraint monster_battle_log_result_check CHECK ((result = ANY (ARRAY['win'::text, 'loss'::text])));
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'parent_link_requests_pkey' and conrelid = 'public.parent_link_requests'::regclass) then
    alter table only public.parent_link_requests add constraint parent_link_requests_pkey PRIMARY KEY (id);
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'parent_link_requests_status_check' and conrelid = 'public.parent_link_requests'::regclass) then
    alter table only public.parent_link_requests add constraint parent_link_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'completed'::text, 'expired'::text, 'revoked'::text])));
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'parents_pkey' and conrelid = 'public.parents'::regclass) then
    alter table only public.parents add constraint parents_pkey PRIMARY KEY (id);
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'parents_status_check' and conrelid = 'public.parents'::regclass) then
    alter table only public.parents add constraint parents_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])));
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'pending_parent_reassignments_pkey' and conrelid = 'public.pending_parent_reassignments'::regclass) then
    alter table only public.pending_parent_reassignments add constraint pending_parent_reassignments_pkey PRIMARY KEY (id);
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'pending_parent_reassignments_status_check' and conrelid = 'public.pending_parent_reassignments'::regclass) then
    alter table only public.pending_parent_reassignments add constraint pending_parent_reassignments_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'cancelled'::text, 'completed'::text])));
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'player_inventory_pkey' and conrelid = 'public.player_inventory'::regclass) then
    alter table only public.player_inventory add constraint player_inventory_pkey PRIMARY KEY (id);
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'player_inventory_app_user_id_item_key_key' and conrelid = 'public.player_inventory'::regclass) then
    alter table only public.player_inventory add constraint player_inventory_app_user_id_item_key_key UNIQUE (app_user_id, item_key);
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'player_log_pkey' and conrelid = 'public.player_log'::regclass) then
    alter table only public.player_log add constraint player_log_pkey PRIMARY KEY (id);
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'player_referral_keys_pkey' and conrelid = 'public.player_referral_keys'::regclass) then
    alter table only public.player_referral_keys add constraint player_referral_keys_pkey PRIMARY KEY (app_user_id);
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'player_referral_keys_referral_key_key' and conrelid = 'public.player_referral_keys'::regclass) then
    alter table only public.player_referral_keys add constraint player_referral_keys_referral_key_key UNIQUE (referral_key);
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'quiz_attempts_pkey' and conrelid = 'public.quiz_attempts'::regclass) then
    alter table only public.quiz_attempts add constraint quiz_attempts_pkey PRIMARY KEY (id);
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'reassignment_cron_secret_pkey' and conrelid = 'public.reassignment_cron_secret'::regclass) then
    alter table only public.reassignment_cron_secret add constraint reassignment_cron_secret_pkey PRIMARY KEY (id);
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'reassignment_cron_secret_singleton' and conrelid = 'public.reassignment_cron_secret'::regclass) then
    alter table only public.reassignment_cron_secret add constraint reassignment_cron_secret_singleton CHECK (id);
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'reward_claims_pkey' and conrelid = 'public.reward_claims'::regclass) then
    alter table only public.reward_claims add constraint reward_claims_pkey PRIMARY KEY (id);
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'shop_items_pkey' and conrelid = 'public.shop_items'::regclass) then
    alter table only public.shop_items add constraint shop_items_pkey PRIMARY KEY (key);
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'shop_items_category_check' and conrelid = 'public.shop_items'::regclass) then
    alter table only public.shop_items add constraint shop_items_category_check CHECK ((category = ANY (ARRAY['consumable'::text, 'scroll'::text, 'sprite'::text, 'theme'::text, 'tome'::text])));
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'shop_items_cost_check' and conrelid = 'public.shop_items'::regclass) then
    alter table only public.shop_items add constraint shop_items_cost_check CHECK ((cost >= 0));
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'sq_lexicon_arena_pkey' and conrelid = 'public.sq_lexicon_arena'::regclass) then
    alter table only public.sq_lexicon_arena add constraint sq_lexicon_arena_pkey PRIMARY KEY (id);
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'sq_lexicon_arena_grade_level_check' and conrelid = 'public.sq_lexicon_arena'::regclass) then
    alter table only public.sq_lexicon_arena add constraint sq_lexicon_arena_grade_level_check CHECK (((grade_level >= 2) AND (grade_level <= 6)));
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'sq_logic_labyrinth_pkey' and conrelid = 'public.sq_logic_labyrinth'::regclass) then
    alter table only public.sq_logic_labyrinth add constraint sq_logic_labyrinth_pkey PRIMARY KEY (id);
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'sq_logic_labyrinth_grade_level_check' and conrelid = 'public.sq_logic_labyrinth'::regclass) then
    alter table only public.sq_logic_labyrinth add constraint sq_logic_labyrinth_grade_level_check CHECK (((grade_level >= 2) AND (grade_level <= 6)));
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'sq_lorekeeper_pkey' and conrelid = 'public.sq_lorekeeper'::regclass) then
    alter table only public.sq_lorekeeper add constraint sq_lorekeeper_pkey PRIMARY KEY (id);
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'sq_lorekeeper_grade_level_check' and conrelid = 'public.sq_lorekeeper'::regclass) then
    alter table only public.sq_lorekeeper add constraint sq_lorekeeper_grade_level_check CHECK (((grade_level >= 2) AND (grade_level <= 6)));
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'sq_number_realm_pkey' and conrelid = 'public.sq_number_realm'::regclass) then
    alter table only public.sq_number_realm add constraint sq_number_realm_pkey PRIMARY KEY (id);
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'sq_number_realm_grade_level_check' and conrelid = 'public.sq_number_realm'::regclass) then
    alter table only public.sq_number_realm add constraint sq_number_realm_grade_level_check CHECK (((grade_level >= 2) AND (grade_level <= 6)));
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'sq_spellcaster_pkey' and conrelid = 'public.sq_spellcaster'::regclass) then
    alter table only public.sq_spellcaster add constraint sq_spellcaster_pkey PRIMARY KEY (id);
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'sq_spellcaster_grade_level_check' and conrelid = 'public.sq_spellcaster'::regclass) then
    alter table only public.sq_spellcaster add constraint sq_spellcaster_grade_level_check CHECK (((grade_level >= 2) AND (grade_level <= 6)));
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'sq_wild_encounter_pkey' and conrelid = 'public.sq_wild_encounter'::regclass) then
    alter table only public.sq_wild_encounter add constraint sq_wild_encounter_pkey PRIMARY KEY (id);
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'sq_wild_encounter_grade_level_check' and conrelid = 'public.sq_wild_encounter'::regclass) then
    alter table only public.sq_wild_encounter add constraint sq_wild_encounter_grade_level_check CHECK (((grade_level >= 2) AND (grade_level <= 6)));
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'study_guides_pkey' and conrelid = 'public.study_guides'::regclass) then
    alter table only public.study_guides add constraint study_guides_pkey PRIMARY KEY (id);
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'study_guides_subject_id_target_date_key' and conrelid = 'public.study_guides'::regclass) then
    alter table only public.study_guides add constraint study_guides_subject_id_target_date_key UNIQUE (subject_id, target_date);
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'subjects_pkey' and conrelid = 'public.subjects'::regclass) then
    alter table only public.subjects add constraint subjects_pkey PRIMARY KEY (id);
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'subjects_name_key' and conrelid = 'public.subjects'::regclass) then
    alter table only public.subjects add constraint subjects_name_key UNIQUE (name);
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'subscriptions_pkey' and conrelid = 'public.subscriptions'::regclass) then
    alter table only public.subscriptions add constraint subscriptions_pkey PRIMARY KEY (id);
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'subscriptions_parent_id_key' and conrelid = 'public.subscriptions'::regclass) then
    alter table only public.subscriptions add constraint subscriptions_parent_id_key UNIQUE (parent_id);
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'subscriptions_addon_children_check' and conrelid = 'public.subscriptions'::regclass) then
    alter table only public.subscriptions add constraint subscriptions_addon_children_check CHECK (((addon_children >= 0) AND (addon_children <= 2)));
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'subscriptions_status_check' and conrelid = 'public.subscriptions'::regclass) then
    alter table only public.subscriptions add constraint subscriptions_status_check CHECK ((status = ANY (ARRAY['none'::text, 'pending'::text, 'active'::text, 'expired'::text, 'cancelled'::text])));
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'subscriptions_coin_pool_balance_check' and conrelid = 'public.subscriptions'::regclass) then
    alter table only public.subscriptions add constraint subscriptions_coin_pool_balance_check CHECK ((coin_pool_balance >= 0));
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'trade_items_pkey' and conrelid = 'public.trade_items'::regclass) then
    alter table only public.trade_items add constraint trade_items_pkey PRIMARY KEY (id);
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'trade_items_trade_id_user_monster_id_key' and conrelid = 'public.trade_items'::regclass) then
    alter table only public.trade_items add constraint trade_items_trade_id_user_monster_id_key UNIQUE (trade_id, user_monster_id);
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'trade_items_side_check' and conrelid = 'public.trade_items'::regclass) then
    alter table only public.trade_items add constraint trade_items_side_check CHECK ((side = ANY (ARRAY['initiator'::text, 'recipient'::text])));
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'trades_pkey' and conrelid = 'public.trades'::regclass) then
    alter table only public.trades add constraint trades_pkey PRIMARY KEY (id);
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'trades_not_self' and conrelid = 'public.trades'::regclass) then
    alter table only public.trades add constraint trades_not_self CHECK ((recipient_id <> initiator_id));
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'trades_status_check' and conrelid = 'public.trades'::regclass) then
    alter table only public.trades add constraint trades_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'completed'::text, 'declined'::text, 'cancelled'::text, 'expired'::text, 'failed'::text, 'countered'::text])));
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'trades_recipient_gold_check' and conrelid = 'public.trades'::regclass) then
    alter table only public.trades add constraint trades_recipient_gold_check CHECK ((recipient_gold >= 0));
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'trades_initiator_gold_check' and conrelid = 'public.trades'::regclass) then
    alter table only public.trades add constraint trades_initiator_gold_check CHECK ((initiator_gold >= 0));
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'user_avatars_pkey' and conrelid = 'public.user_avatars'::regclass) then
    alter table only public.user_avatars add constraint user_avatars_pkey PRIMARY KEY (user_id);
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'user_battle_state_pkey' and conrelid = 'public.user_battle_state'::regclass) then
    alter table only public.user_battle_state add constraint user_battle_state_pkey PRIMARY KEY (id);
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'user_battle_state_user_id_key' and conrelid = 'public.user_battle_state'::regclass) then
    alter table only public.user_battle_state add constraint user_battle_state_user_id_key UNIQUE (user_id);
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'user_caught_monsters_pkey' and conrelid = 'public.user_caught_monsters'::regclass) then
    alter table only public.user_caught_monsters add constraint user_caught_monsters_pkey PRIMARY KEY (id);
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'user_caught_monsters_quality_check' and conrelid = 'public.user_caught_monsters'::regclass) then
    alter table only public.user_caught_monsters add constraint user_caught_monsters_quality_check CHECK ((quality = ANY (ARRAY['normal'::text, 'good'::text, 'outstanding'::text, 'perfect'::text])));
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'user_event_claims_pkey' and conrelid = 'public.user_event_claims'::regclass) then
    alter table only public.user_event_claims add constraint user_event_claims_pkey PRIMARY KEY (id);
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'user_event_claims_event_id_user_id_key' and conrelid = 'public.user_event_claims'::regclass) then
    alter table only public.user_event_claims add constraint user_event_claims_event_id_user_id_key UNIQUE (event_id, user_id);
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'user_event_progress_pkey' and conrelid = 'public.user_event_progress'::regclass) then
    alter table only public.user_event_progress add constraint user_event_progress_pkey PRIMARY KEY (id);
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'user_event_progress_user_id_event_quest_id_key' and conrelid = 'public.user_event_progress'::regclass) then
    alter table only public.user_event_progress add constraint user_event_progress_user_id_event_quest_id_key UNIQUE (user_id, event_quest_id);
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'user_identity_map_pkey' and conrelid = 'public.user_identity_map'::regclass) then
    alter table only public.user_identity_map add constraint user_identity_map_pkey PRIMARY KEY (auth_uid);
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'user_last_login_pkey' and conrelid = 'public.user_last_login'::regclass) then
    alter table only public.user_last_login add constraint user_last_login_pkey PRIMARY KEY (user_id);
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'user_monsters_pkey' and conrelid = 'public.user_monsters'::regclass) then
    alter table only public.user_monsters add constraint user_monsters_pkey PRIMARY KEY (id);
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'user_monsters_quality_check' and conrelid = 'public.user_monsters'::regclass) then
    alter table only public.user_monsters add constraint user_monsters_quality_check CHECK ((quality = ANY (ARRAY['normal'::text, 'good'::text, 'outstanding'::text, 'perfect'::text])));
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'user_monsters_slot_check' and conrelid = 'public.user_monsters'::regclass) then
    alter table only public.user_monsters add constraint user_monsters_slot_check CHECK ((slot = ANY (ARRAY[1, 2, 3])));
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'user_monsters_graduation_tier_check' and conrelid = 'public.user_monsters'::regclass) then
    alter table only public.user_monsters add constraint user_monsters_graduation_tier_check CHECK (((graduation_tier >= 0) AND (graduation_tier <= 2)));
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'user_subclass_profiles_pkey' and conrelid = 'public.user_subclass_profiles'::regclass) then
    alter table only public.user_subclass_profiles add constraint user_subclass_profiles_pkey PRIMARY KEY (id);
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'user_subclass_profiles_user_id_key' and conrelid = 'public.user_subclass_profiles'::regclass) then
    alter table only public.user_subclass_profiles add constraint user_subclass_profiles_user_id_key UNIQUE (user_id);
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'user_subclass_profiles_lorekeeper_tier_check' and conrelid = 'public.user_subclass_profiles'::regclass) then
    alter table only public.user_subclass_profiles add constraint user_subclass_profiles_lorekeeper_tier_check CHECK (((lorekeeper_tier >= 2) AND (lorekeeper_tier <= 6)));
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'user_subclass_profiles_spellcaster_tier_check' and conrelid = 'public.user_subclass_profiles'::regclass) then
    alter table only public.user_subclass_profiles add constraint user_subclass_profiles_spellcaster_tier_check CHECK (((spellcaster_tier >= 2) AND (spellcaster_tier <= 6)));
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'user_subclass_profiles_number_realm_tier_check' and conrelid = 'public.user_subclass_profiles'::regclass) then
    alter table only public.user_subclass_profiles add constraint user_subclass_profiles_number_realm_tier_check CHECK (((number_realm_tier >= 2) AND (number_realm_tier <= 6)));
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'user_subclass_profiles_logic_labyrinth_tier_check' and conrelid = 'public.user_subclass_profiles'::regclass) then
    alter table only public.user_subclass_profiles add constraint user_subclass_profiles_logic_labyrinth_tier_check CHECK (((logic_labyrinth_tier >= 2) AND (logic_labyrinth_tier <= 6)));
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'user_subclass_profiles_lexicon_arena_tier_check' and conrelid = 'public.user_subclass_profiles'::regclass) then
    alter table only public.user_subclass_profiles add constraint user_subclass_profiles_lexicon_arena_tier_check CHECK (((lexicon_arena_tier >= 2) AND (lexicon_arena_tier <= 6)));
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'user_themes_pkey' and conrelid = 'public.user_themes'::regclass) then
    alter table only public.user_themes add constraint user_themes_pkey PRIMARY KEY (user_id);
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'children_referred_by_child_id_fkey' and conrelid = 'public.children'::regclass) then
    alter table only public.children add constraint children_referred_by_child_id_fkey FOREIGN KEY (referred_by_child_id) REFERENCES children(id) ON DELETE SET NULL;
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'children_parent_id_fkey' and conrelid = 'public.children'::regclass) then
    alter table only public.children add constraint children_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES parents(id) ON DELETE CASCADE;
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'curio_eggs_hatched_user_monster_id_fkey' and conrelid = 'public.curio_eggs'::regclass) then
    alter table only public.curio_eggs add constraint curio_eggs_hatched_user_monster_id_fkey FOREIGN KEY (hatched_user_monster_id) REFERENCES user_monsters(id);
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'curio_eggs_parent_user_monster_id_fkey' and conrelid = 'public.curio_eggs'::regclass) then
    alter table only public.curio_eggs add constraint curio_eggs_parent_user_monster_id_fkey FOREIGN KEY (parent_user_monster_id) REFERENCES user_monsters(id) ON DELETE SET NULL;
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'event_quests_event_id_fkey' and conrelid = 'public.event_quests'::regclass) then
    alter table only public.event_quests add constraint event_quests_event_id_fkey FOREIGN KEY (event_id) REFERENCES custom_events(id) ON DELETE CASCADE;
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'parent_link_requests_child_id_fkey' and conrelid = 'public.parent_link_requests'::regclass) then
    alter table only public.parent_link_requests add constraint parent_link_requests_child_id_fkey FOREIGN KEY (child_id) REFERENCES children(id);
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'parents_approved_by_fkey' and conrelid = 'public.parents'::regclass) then
    alter table only public.parents add constraint parents_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES auth.users(id);
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'parents_id_fkey' and conrelid = 'public.parents'::regclass) then
    alter table only public.parents add constraint parents_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'pending_parent_reassignments_old_parent_id_fkey' and conrelid = 'public.pending_parent_reassignments'::regclass) then
    alter table only public.pending_parent_reassignments add constraint pending_parent_reassignments_old_parent_id_fkey FOREIGN KEY (old_parent_id) REFERENCES parents(id);
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'pending_parent_reassignments_new_parent_id_fkey' and conrelid = 'public.pending_parent_reassignments'::regclass) then
    alter table only public.pending_parent_reassignments add constraint pending_parent_reassignments_new_parent_id_fkey FOREIGN KEY (new_parent_id) REFERENCES parents(id);
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'pending_parent_reassignments_child_id_fkey' and conrelid = 'public.pending_parent_reassignments'::regclass) then
    alter table only public.pending_parent_reassignments add constraint pending_parent_reassignments_child_id_fkey FOREIGN KEY (child_id) REFERENCES children(id);
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'quiz_attempts_guide_id_fkey' and conrelid = 'public.quiz_attempts'::regclass) then
    alter table only public.quiz_attempts add constraint quiz_attempts_guide_id_fkey FOREIGN KEY (guide_id) REFERENCES study_guides(id) ON DELETE CASCADE;
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'study_guides_subject_id_fkey' and conrelid = 'public.study_guides'::regclass) then
    alter table only public.study_guides add constraint study_guides_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE;
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'subscriptions_parent_id_fkey' and conrelid = 'public.subscriptions'::regclass) then
    alter table only public.subscriptions add constraint subscriptions_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES parents(id);
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'trade_items_user_monster_id_fkey' and conrelid = 'public.trade_items'::regclass) then
    alter table only public.trade_items add constraint trade_items_user_monster_id_fkey FOREIGN KEY (user_monster_id) REFERENCES user_monsters(id);
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'trade_items_trade_id_fkey' and conrelid = 'public.trade_items'::regclass) then
    alter table only public.trade_items add constraint trade_items_trade_id_fkey FOREIGN KEY (trade_id) REFERENCES trades(id) ON DELETE CASCADE;
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'trades_parent_trade_id_fkey' and conrelid = 'public.trades'::regclass) then
    alter table only public.trades add constraint trades_parent_trade_id_fkey FOREIGN KEY (parent_trade_id) REFERENCES trades(id);
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'user_event_claims_event_id_fkey' and conrelid = 'public.user_event_claims'::regclass) then
    alter table only public.user_event_claims add constraint user_event_claims_event_id_fkey FOREIGN KEY (event_id) REFERENCES custom_events(id) ON DELETE CASCADE;
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'user_event_progress_event_id_fkey' and conrelid = 'public.user_event_progress'::regclass) then
    alter table only public.user_event_progress add constraint user_event_progress_event_id_fkey FOREIGN KEY (event_id) REFERENCES custom_events(id) ON DELETE CASCADE;
  end if;
end $c$;
do $c$ begin
  if not exists (select 1 from pg_constraint where conname = 'user_event_progress_event_quest_id_fkey' and conrelid = 'public.user_event_progress'::regclass) then
    alter table only public.user_event_progress add constraint user_event_progress_event_quest_id_fkey FOREIGN KEY (event_quest_id) REFERENCES event_quests(id) ON DELETE CASCADE;
  end if;
end $c$;
do $p$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='analytics_events' and policyname='analytics_events_select_anon') then
    create policy analytics_events_select_anon on public.analytics_events for SELECT using (true);
  end if;
end $p$;
do $p$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='analytics_events' and policyname='analytics_events: self insert') then
    create policy "analytics_events: self insert" on public.analytics_events for INSERT with check ((user_id = current_app_user_id()));
  end if;
end $p$;
do $p$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='budget_of_work' and policyname='budget_of_work: read all') then
    create policy "budget_of_work: read all" on public.budget_of_work for SELECT using (true);
  end if;
end $p$;
do $p$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='curio_egg_chains' and policyname='curio_egg_chains: read all') then
    create policy "curio_egg_chains: read all" on public.curio_egg_chains for SELECT using (true);
  end if;
end $p$;
do $p$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='curio_eggs' and policyname='curio_eggs: read all') then
    create policy "curio_eggs: read all" on public.curio_eggs for SELECT using (true);
  end if;
end $p$;
do $p$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='custom_events' and policyname='custom_events: read all') then
    create policy "custom_events: read all" on public.custom_events for SELECT using (true);
  end if;
end $p$;
do $p$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='daily_checklist_claims' and policyname='daily_checklist_claims: read own') then
    create policy "daily_checklist_claims: read own" on public.daily_checklist_claims for SELECT using ((current_app_user_id() = app_user_id));
  end if;
end $p$;
do $p$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='event_quests' and policyname='event_quests: read all') then
    create policy "event_quests: read all" on public.event_quests for SELECT using (true);
  end if;
end $p$;
do $p$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='family_credentials' and policyname='Allow id read') then
    create policy "Allow id read" on public.family_credentials for SELECT using (true);
  end if;
end $p$;
do $p$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='journal_entries' and policyname='journal_entries: self insert') then
    create policy "journal_entries: self insert" on public.journal_entries for INSERT with check ((user_id = current_app_user_id()));
  end if;
end $p$;
do $p$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='leaderboard_reactions' and policyname='leaderboard_reactions: insert own') then
    create policy "leaderboard_reactions: insert own" on public.leaderboard_reactions for INSERT with check ((current_app_user_id() = from_user_id));
  end if;
end $p$;
do $p$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='leaderboard_reactions' and policyname='leaderboard_reactions: read all') then
    create policy "leaderboard_reactions: read all" on public.leaderboard_reactions for SELECT using (true);
  end if;
end $p$;
do $p$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='live_battles' and policyname='live_battles: challenger can create') then
    create policy "live_battles: challenger can create" on public.live_battles for INSERT with check ((current_app_user_id() = challenger_id));
  end if;
end $p$;
do $p$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='live_battles' and policyname='live_battles: participants can update') then
    create policy "live_battles: participants can update" on public.live_battles for UPDATE using (((current_app_user_id() = challenger_id) OR (current_app_user_id() = opponent_id))) with check (((current_app_user_id() = challenger_id) OR (current_app_user_id() = opponent_id)));
  end if;
end $p$;
do $p$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='live_battles' and policyname='live_battles: participants can read') then
    create policy "live_battles: participants can read" on public.live_battles for SELECT using (((current_app_user_id() = challenger_id) OR (current_app_user_id() = opponent_id)));
  end if;
end $p$;
do $p$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='monster_battle_log' and policyname='monster_battle_log: insert own') then
    create policy "monster_battle_log: insert own" on public.monster_battle_log for INSERT with check ((current_app_user_id() = user_id));
  end if;
end $p$;
do $p$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='monster_battle_log' and policyname='monster_battle_log: read all') then
    create policy "monster_battle_log: read all" on public.monster_battle_log for SELECT using (true);
  end if;
end $p$;
do $p$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='parents' and policyname='parent can insert own row') then
    create policy "parent can insert own row" on public.parents for INSERT with check ((id = auth.uid()));
  end if;
end $p$;
do $p$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='parents' and policyname='parent can select own row') then
    create policy "parent can select own row" on public.parents for SELECT using ((id = auth.uid()));
  end if;
end $p$;
do $p$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='player_inventory' and policyname='player_inventory: update own') then
    create policy "player_inventory: update own" on public.player_inventory for UPDATE using ((current_app_user_id() = app_user_id)) with check ((current_app_user_id() = app_user_id));
  end if;
end $p$;
do $p$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='player_inventory' and policyname='player_inventory: insert own') then
    create policy "player_inventory: insert own" on public.player_inventory for INSERT with check ((current_app_user_id() = app_user_id));
  end if;
end $p$;
do $p$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='player_inventory' and policyname='player_inventory: read own') then
    create policy "player_inventory: read own" on public.player_inventory for SELECT using ((current_app_user_id() = app_user_id));
  end if;
end $p$;
do $p$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='player_log' and policyname='player_log: read all') then
    create policy "player_log: read all" on public.player_log for SELECT using (true);
  end if;
end $p$;
do $p$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='player_log' and policyname='player_log: self insert') then
    create policy "player_log: self insert" on public.player_log for INSERT with check ((user_id = current_app_user_id()));
  end if;
end $p$;
do $p$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='reward_claims' and policyname='reward_claims: read own') then
    create policy "reward_claims: read own" on public.reward_claims for SELECT using ((current_app_user_id() = app_user_id));
  end if;
end $p$;
do $p$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='reward_claims' and policyname='reward_claims: insert own') then
    create policy "reward_claims: insert own" on public.reward_claims for INSERT with check ((current_app_user_id() = app_user_id));
  end if;
end $p$;
do $p$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='shop_items' and policyname='shop_items: read all') then
    create policy "shop_items: read all" on public.shop_items for SELECT using (true);
  end if;
end $p$;
do $p$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='sq_lexicon_arena' and policyname='sq_lexicon_arena: read') then
    create policy "sq_lexicon_arena: read" on public.sq_lexicon_arena for SELECT using (true);
  end if;
end $p$;
do $p$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='sq_logic_labyrinth' and policyname='sq_logic_labyrinth: read') then
    create policy "sq_logic_labyrinth: read" on public.sq_logic_labyrinth for SELECT using (true);
  end if;
end $p$;
do $p$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='sq_lorekeeper' and policyname='sq_lorekeeper: read') then
    create policy "sq_lorekeeper: read" on public.sq_lorekeeper for SELECT using (true);
  end if;
end $p$;
do $p$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='sq_number_realm' and policyname='sq_number_realm: read') then
    create policy "sq_number_realm: read" on public.sq_number_realm for SELECT using (true);
  end if;
end $p$;
do $p$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='sq_spellcaster' and policyname='sq_spellcaster: read') then
    create policy "sq_spellcaster: read" on public.sq_spellcaster for SELECT using (true);
  end if;
end $p$;
do $p$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='sq_wild_encounter' and policyname='sq_wild_encounter: read') then
    create policy "sq_wild_encounter: read" on public.sq_wild_encounter for SELECT using (true);
  end if;
end $p$;
do $p$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='subscriptions' and policyname='parent can read own subscription') then
    create policy "parent can read own subscription" on public.subscriptions for SELECT using ((parent_id = auth.uid()));
  end if;
end $p$;
do $p$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='trade_items' and policyname='trade_items: parties read') then
    create policy "trade_items: parties read" on public.trade_items for SELECT using ((EXISTS ( SELECT 1
   FROM trades t
  WHERE ((t.id = trade_items.trade_id) AND ((current_app_user_id() = t.initiator_id) OR (current_app_user_id() = t.recipient_id))))));
  end if;
end $p$;
do $p$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='trades' and policyname='trades: parties read') then
    create policy "trades: parties read" on public.trades for SELECT using (((current_app_user_id() = initiator_id) OR (current_app_user_id() = recipient_id)));
  end if;
end $p$;
do $p$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_avatars' and policyname='user_avatars: update own') then
    create policy "user_avatars: update own" on public.user_avatars for UPDATE using ((current_app_user_id() = user_id)) with check ((current_app_user_id() = user_id));
  end if;
end $p$;
do $p$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_avatars' and policyname='user_avatars: read all') then
    create policy "user_avatars: read all" on public.user_avatars for SELECT using (true);
  end if;
end $p$;
do $p$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_avatars' and policyname='user_avatars: insert own') then
    create policy "user_avatars: insert own" on public.user_avatars for INSERT with check ((current_app_user_id() = user_id));
  end if;
end $p$;
do $p$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_battle_state' and policyname='user_battle_state: read all') then
    create policy "user_battle_state: read all" on public.user_battle_state for SELECT using (true);
  end if;
end $p$;
do $p$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_battle_state' and policyname='user_battle_state: insert own') then
    create policy "user_battle_state: insert own" on public.user_battle_state for INSERT with check ((current_app_user_id() = user_id));
  end if;
end $p$;
do $p$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_battle_state' and policyname='user_battle_state: update own') then
    create policy "user_battle_state: update own" on public.user_battle_state for UPDATE using ((current_app_user_id() = user_id)) with check ((current_app_user_id() = user_id));
  end if;
end $p$;
do $p$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_caught_monsters' and policyname='user_caught_monsters: insert own') then
    create policy "user_caught_monsters: insert own" on public.user_caught_monsters for INSERT with check ((current_app_user_id() = user_id));
  end if;
end $p$;
do $p$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_caught_monsters' and policyname='user_caught_monsters: read all') then
    create policy "user_caught_monsters: read all" on public.user_caught_monsters for SELECT using (true);
  end if;
end $p$;
do $p$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_caught_monsters' and policyname='user_caught_monsters: delete own') then
    create policy "user_caught_monsters: delete own" on public.user_caught_monsters for DELETE using ((current_app_user_id() = user_id));
  end if;
end $p$;
do $p$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_caught_monsters' and policyname='user_caught_monsters: update own') then
    create policy "user_caught_monsters: update own" on public.user_caught_monsters for UPDATE using ((current_app_user_id() = user_id)) with check ((current_app_user_id() = user_id));
  end if;
end $p$;
do $p$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_event_claims' and policyname='user_event_claims: read own') then
    create policy "user_event_claims: read own" on public.user_event_claims for SELECT using ((current_app_user_id() = user_id));
  end if;
end $p$;
do $p$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_event_claims' and policyname='user_event_claims: insert own') then
    create policy "user_event_claims: insert own" on public.user_event_claims for INSERT with check ((current_app_user_id() = user_id));
  end if;
end $p$;
do $p$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_event_progress' and policyname='user_event_progress: update own') then
    create policy "user_event_progress: update own" on public.user_event_progress for UPDATE using ((current_app_user_id() = user_id)) with check ((current_app_user_id() = user_id));
  end if;
end $p$;
do $p$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_event_progress' and policyname='user_event_progress: insert own') then
    create policy "user_event_progress: insert own" on public.user_event_progress for INSERT with check ((current_app_user_id() = user_id));
  end if;
end $p$;
do $p$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_event_progress' and policyname='user_event_progress: read own') then
    create policy "user_event_progress: read own" on public.user_event_progress for SELECT using ((current_app_user_id() = user_id));
  end if;
end $p$;
do $p$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_identity_map' and policyname='identity map: self upsert') then
    create policy "identity map: self upsert" on public.user_identity_map for INSERT with check ((auth_uid = auth.uid()));
  end if;
end $p$;
do $p$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_identity_map' and policyname='identity map: self update') then
    create policy "identity map: self update" on public.user_identity_map for UPDATE using ((auth_uid = auth.uid())) with check ((auth_uid = auth.uid()));
  end if;
end $p$;
do $p$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_identity_map' and policyname='identity map: self read') then
    create policy "identity map: self read" on public.user_identity_map for SELECT using ((auth_uid = auth.uid()));
  end if;
end $p$;
do $p$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_last_login' and policyname='user_last_login: insert own') then
    create policy "user_last_login: insert own" on public.user_last_login for INSERT with check ((current_app_user_id() = user_id));
  end if;
end $p$;
do $p$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_last_login' and policyname='user_last_login: update own') then
    create policy "user_last_login: update own" on public.user_last_login for UPDATE using ((current_app_user_id() = user_id)) with check ((current_app_user_id() = user_id));
  end if;
end $p$;
do $p$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_last_login' and policyname='user_last_login: read all') then
    create policy "user_last_login: read all" on public.user_last_login for SELECT using (true);
  end if;
end $p$;
do $p$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_monsters' and policyname='user_monsters: mutate own') then
    create policy "user_monsters: mutate own" on public.user_monsters for INSERT with check ((current_app_user_id() = user_id));
  end if;
end $p$;
do $p$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_monsters' and policyname='user_monsters: delete own') then
    create policy "user_monsters: delete own" on public.user_monsters for DELETE using ((current_app_user_id() = user_id));
  end if;
end $p$;
do $p$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_monsters' and policyname='user_monsters: update own') then
    create policy "user_monsters: update own" on public.user_monsters for UPDATE using ((current_app_user_id() = user_id)) with check ((current_app_user_id() = user_id));
  end if;
end $p$;
do $p$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_monsters' and policyname='user_monsters: read all') then
    create policy "user_monsters: read all" on public.user_monsters for SELECT using (true);
  end if;
end $p$;
do $p$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_subclass_profiles' and policyname='user_subclass_profiles: read all') then
    create policy "user_subclass_profiles: read all" on public.user_subclass_profiles for SELECT using (true);
  end if;
end $p$;
do $p$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_subclass_profiles' and policyname='user_subclass_profiles: update own') then
    create policy "user_subclass_profiles: update own" on public.user_subclass_profiles for UPDATE using ((current_app_user_id() = user_id)) with check ((current_app_user_id() = user_id));
  end if;
end $p$;
do $p$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_themes' and policyname='user_themes: insert own') then
    create policy "user_themes: insert own" on public.user_themes for INSERT with check ((current_app_user_id() = user_id));
  end if;
end $p$;
do $p$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_themes' and policyname='user_themes: read all') then
    create policy "user_themes: read all" on public.user_themes for SELECT using (true);
  end if;
end $p$;
do $p$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_themes' and policyname='user_themes: update own') then
    create policy "user_themes: update own" on public.user_themes for UPDATE using ((current_app_user_id() = user_id)) with check ((current_app_user_id() = user_id));
  end if;
end $p$;
