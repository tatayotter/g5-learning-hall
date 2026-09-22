-- delete_own_family_data: full coverage + correct ordering.
--
-- The previous version only knew about the tables that existed when it was written.
-- Two problems:
--   1. It never deleted newer child data (guild_sessions, player_events,
--      mastery_gauntlet_sessions, boss_persona_defeats, boss_gauntlet_claims,
--      player_progress, player_weekly_journal, player_question_attempts,
--      mtap_*, main_quest_daily_attempts, curio_eggs, curio_missions,
--      player_notifications, user_themes, friend_requests, push_*, ...), so a
--      parent's deletion request left those rows behind.
--   2. It deleted user_monsters BEFORE the tables whose foreign keys point at it
--      (curio_eggs -> user_monsters, trade_items -> user_monsters, both NO ACTION),
--      and never touched parent_link_requests / pending_parent_reassignments
--      (NO ACTION foreign keys to children), so deleting a child that had an egg,
--      a trade or a link request would fail with a foreign-key error.
--
-- Parent-side rows that used to block the final "delete parents" (foreign keys with
-- NO ACTION):
--   * bug_reports, pending_parent_reassignments: deleted with the account.
--   * subscriptions: KEPT but anonymized. It is a payment record (PayMongo ids, amount,
--     billing period), so the row stays; everything that identifies the person is removed:
--     parent_id is nulled (the column is made nullable; the unique constraint allows many
--     NULLs) and the ad-tracking fields (fbp, fbc, client_ip, client_user_agent) and the
--     reminder markers are cleared. NOTE: the PayMongo checkout/payment ids remain, so the
--     row is pseudonymous (linkable to the payer only via PayMongo's own records), not
--     fully anonymous; that is what makes it usable for accounting.
--
--   * sec_entitlements: KEPT but anonymized the same way. parent_id and child_id (both
--     were NOT NULL, no FKs) are nulled; pack, status, amount, PayMongo checkout id and
--     dates stay. The (child_id, pack_id) unique constraint treats NULLs as distinct, so
--     many anonymized rows can coexist, and it also means a NEW child who later reuses a
--     deleted child's username no longer inherits the old purchase.
--
--   * voucher_redemptions: KEPT but anonymized. user_id is nulled, code and redeemed_at
--     stay. redeem_voucher_code counts redemptions by code alone for max_redemptions, so
--     an anonymized row still counts toward the code's cap (deleting the row would have
--     freed a slot). The only behavioural difference: its per-user "already redeemed"
--     check (code + user_id) can no longer see this child's redemption, so someone who
--     later reuses the same username could redeem that code once more, up to the cap.
--
-- Deliberately left alone: grade_content_owners is admin config, not child data.

-- Allow a subscription to outlive its parent as an anonymized payment record.
-- (The FK stays: a NULL parent_id never violates it.)
alter table public.subscriptions alter column parent_id drop not null;
alter table public.sec_entitlements alter column parent_id drop not null;
alter table public.sec_entitlements alter column child_id drop not null;
alter table public.voucher_redemptions alter column user_id drop not null;

create or replace function public.delete_own_family_data()
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_parent_id uuid := auth.uid();
  v_child_id text;
begin
  if v_parent_id is null then
    raise exception 'not authenticated';
  end if;
  if not exists (select 1 from public.parents where id = v_parent_id) then
    raise exception 'not a parent account';
  end if;

  for v_child_id in select id from public.children where parent_id = v_parent_id loop
    -- Trades first: trade_items -> user_monsters has no cascade, and trades
    -- reference each other through parent_trade_id. trade_items cascade from trades.
    update public.trades set parent_trade_id = null
      where parent_trade_id in (select id from public.trades where initiator_id = v_child_id or recipient_id = v_child_id);
    delete from public.trades where initiator_id = v_child_id or recipient_id = v_child_id;

    -- Tables with foreign keys into user_monsters must go before user_monsters.
    delete from public.curio_eggs where user_id = v_child_id;
    delete from public.curio_missions where user_id = v_child_id;

    -- Progress / activity (new)
    delete from public.guild_sessions where user_id = v_child_id;
    delete from public.player_events where user_id = v_child_id;
    delete from public.mastery_gauntlet_sessions where user_id = v_child_id;
    delete from public.boss_persona_defeats where user_id = v_child_id;
    delete from public.boss_gauntlet_claims where user_id = v_child_id;
    delete from public.main_quest_daily_attempts where user_id = v_child_id;
    delete from public.mtap_mixed_trainer_completions where user_id = v_child_id;
    delete from public.mtap_question_attempts where user_id = v_child_id;
    delete from public.player_question_attempts where user_id = v_child_id;
    delete from public.player_progress where user_id = v_child_id;
    delete from public.player_weekly_journal where user_id = v_child_id;
    delete from public.player_notifications where user_id = v_child_id;
    delete from public.user_themes where user_id = v_child_id;
    delete from public.player_referral_keys where app_user_id = v_child_id;
    delete from public.friend_requests where requester_id = v_child_id or recipient_id = v_child_id;
    delete from public.push_subscriptions where owner_kind = 'app_user' and owner_id = v_child_id;
    delete from public.push_notification_queue where owner_kind = 'app_user' and owner_id = v_child_id;

    -- Account/link records with NO ACTION foreign keys to children
    delete from public.parent_link_requests where child_id = v_child_id;
    delete from public.pending_parent_reassignments where child_id = v_child_id;
    delete from public.child_login_failures where child_id = v_child_id;

    -- Original set
    delete from public.weekly_packages where user_id = v_child_id;
    delete from public.journal_entries where user_id = v_child_id;
    delete from public.player_log where user_id = v_child_id;
    delete from public.reward_claims where app_user_id = v_child_id;
    delete from public.user_subclass_profiles where user_id = v_child_id;
    delete from public.user_completed_questions where user_id = v_child_id;
    delete from public.user_monsters where user_id = v_child_id;
    delete from public.user_battle_state where user_id = v_child_id;
    delete from public.monster_battle_log where user_id = v_child_id;
    delete from public.player_inventory where app_user_id = v_child_id;
    delete from public.user_caught_monsters where user_id = v_child_id;
    delete from public.user_avatars where user_id = v_child_id;
    delete from public.daily_checklist_claims where app_user_id = v_child_id;
    delete from public.user_last_login where user_id = v_child_id;
    delete from public.user_event_progress where user_id = v_child_id;
    delete from public.user_event_claims where user_id = v_child_id;
    delete from public.leaderboard_reactions where from_user_id = v_child_id or to_user_id = v_child_id;
    delete from public.live_battles where challenger_id = v_child_id or opponent_id = v_child_id;
    delete from public.analytics_events where user_id = v_child_id;
    delete from public.user_identity_map where app_user_id = v_child_id;
  end loop;

  -- Parent-side rows with NO ACTION foreign keys to parents/children.
  -- Subscriptions are kept as anonymized payment records (see header).
  update public.subscriptions
  set parent_id = null,
      fbp = null,
      fbc = null,
      client_ip = null,
      client_user_agent = null,
      last_coin_reminder_for_period = null,
      last_renewal_reminder_for_period = null,
      updated_at = now()
  where parent_id = v_parent_id;
  -- Purchase records are kept, minus the identifiers (children still exist here).
  update public.sec_entitlements
  set parent_id = null, child_id = null
  where parent_id = v_parent_id
     or child_id in (select id from public.children where parent_id = v_parent_id);
  update public.voucher_redemptions
  set user_id = null
  where user_id in (select id from public.children where parent_id = v_parent_id);
  delete from public.bug_reports where parent_id = v_parent_id;
  delete from public.pending_parent_reassignments where old_parent_id = v_parent_id or new_parent_id = v_parent_id;

  delete from public.children where parent_id = v_parent_id;
  delete from public.analytics_events where user_id = v_parent_id::text;
  delete from public.parents where id = v_parent_id;
end;
$$;

-- create or replace keeps existing grants; tighten them explicitly. The function
-- already refuses unauthenticated callers, but anon shouldn't be able to reach it.
revoke all on function public.delete_own_family_data() from public, anon;
grant execute on function public.delete_own_family_data() to authenticated, service_role;
