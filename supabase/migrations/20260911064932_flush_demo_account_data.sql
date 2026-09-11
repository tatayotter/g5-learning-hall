-- Flush all demo account data.
-- Demo accounts are no longer offered. This removes every row keyed to a
-- demo id (prefix 'demo_') across the app, plus the corresponding
-- auth.users rows, plus the demo_accounts registry table.
--
-- 20260825100000_drop_demo_account_system.sql already dropped the old
-- demo_rate_limit / demo_account_stats tables and RPCs. This migration
-- removes the actual demo data left behind in demo_accounts and every
-- table that references a demo user_id/app_user_id.

-- Leaf/activity tables keyed by user_id
delete from analytics_events where user_id like 'demo_%';
delete from player_log where user_id like 'demo_%';
delete from weekly_packages where user_id like 'demo_%';
delete from player_progress where user_id like 'demo_%';
delete from player_weekly_journal where user_id like 'demo_%';
delete from user_monsters where user_id like 'demo_%';
delete from user_caught_monsters where user_id like 'demo_%';
delete from user_subclass_profiles where user_id like 'demo_%';
delete from user_completed_questions where user_id like 'demo_%';
delete from user_battle_state where user_id like 'demo_%';
delete from monster_battle_log where user_id like 'demo_%';
delete from user_avatars where user_id like 'demo_%';
delete from user_last_login where user_id like 'demo_%';
delete from player_question_attempts where user_id like 'demo_%';

-- Leaf/activity tables keyed by app_user_id
delete from player_inventory where app_user_id like 'demo_%';

-- Leaderboard reactions keyed by from/to user ids
delete from leaderboard_reactions where from_user_id like 'demo_%' or to_user_id like 'demo_%';

-- Corresponding Supabase Auth users, resolved via identity map WHILE the map
-- still has the demo rows (cascades to auth.identities/sessions/refresh_tokens)
delete from auth.users where id in (
  select auth_uid from user_identity_map where app_user_id like 'demo_%'
);

-- Identity mapping (safe to clear now that auth.users is handled)
delete from user_identity_map where app_user_id like 'demo_%';

-- Any children rows created under the demo id space
delete from children where id like 'demo_%';

-- The demo account registry itself
delete from demo_accounts where user_id like 'demo_%';
