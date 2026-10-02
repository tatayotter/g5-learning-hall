-- Parent-link reward: +2 Growth Pills and 100 gold when a parent confirms a
-- child's link invite. Backs the "Show Learning Hall to your parent" CTA in
-- components/LinkParentBanner.tsx.
--
-- Based on the live definition from 20260911110000_fix_parent_link_analytics_insert.sql
-- (verified against production 2026-10-02 before editing). Changes:
--
-- 1. Grants 2 Growth Pills via upsert_inventory.
-- 2. Fixes the 100 gold, which has never actually been granted since the RPC
--    identity hardening: it called apply_character_deltas, which now raises
--    'not authorized' unless p_user_id = current_app_user_id(). The caller here
--    is the parent, not the child, so it always raised and the
--    `exception when others` swallowed it (gold_awarded = false). It also
--    wrote to weekly_packages.character_stats, but spendable gold lives on
--    player_progress.gold now. Gold is granted the same way
--    claim_registrant_referral_reward does it. No child was shorted:
--    zero parent_link_confirmed events existed when this was written.
-- 3. Drops a player_notifications row so the child sees the reward land.
-- 4. First-link guard: rewards are granted only if this child has never had a
--    previously completed link request, so an admin re-link (or any future
--    unlink/relink path) can't farm them.

create or replace function public.confirm_parent_link(p_token text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public', 'extensions'
as $function$
declare
  v_hash text := encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex');
  v_req public.parent_link_requests%rowtype;
  v_auth_email text;
  v_auth_email_confirmed timestamptz;
  v_full_name text;
  v_gold_awarded boolean := false;
  v_pills_awarded int := 0;
  v_first_link boolean;
  v_current_count int;
  v_max int;
begin
  if auth.uid() is null then
    raise exception 'invalid or expired link' using errcode = 'P0001';
  end if;

  select email, email_confirmed_at into v_auth_email, v_auth_email_confirmed
  from auth.users where id = auth.uid();

  if v_auth_email is null or v_auth_email_confirmed is null then
    raise exception 'invalid or expired link' using errcode = 'P0001';
  end if;

  select * into v_req
  from public.parent_link_requests
  where token_hash = v_hash and status = 'pending' and expires_at > now()
  for update;

  if not found then
    raise exception 'invalid or expired link' using errcode = 'P0001';
  end if;

  if lower(v_auth_email) <> v_req.parent_email then
    raise exception 'invalid or expired link' using errcode = 'P0001';
  end if;

  if exists (select 1 from public.children where id = v_req.child_id and parent_id is not null) then
    update public.parent_link_requests set status = 'revoked' where id = v_req.id;
    raise exception 'invalid or expired link' using errcode = 'P0001';
  end if;

  select count(*) into v_current_count from public.children c
  where c.parent_id = auth.uid() and c.is_active = true;

  v_max := public.max_children_for_parent(auth.uid());
  if v_current_count >= v_max then
    raise exception 'child account limit reached (% of %) - subscribe or add a child slot to link more children', v_current_count, v_max;
  end if;

  select coalesce(raw_user_meta_data->>'full_name', 'Parent') into v_full_name
  from auth.users where id = auth.uid();

  insert into public.parents (id, full_name, status)
  values (auth.uid(), v_full_name, 'approved')
  on conflict (id) do update set status = 'approved';

  update public.children set parent_id = auth.uid() where id = v_req.child_id;

  -- Checked before marking this request completed, so it only sees earlier links.
  v_first_link := not exists (
    select 1 from public.parent_link_requests
    where child_id = v_req.child_id and status = 'completed' and id <> v_req.id
  );

  update public.parent_link_requests set status = 'completed', completed_at = now() where id = v_req.id;

  if v_first_link then
    begin
      perform public.upsert_inventory(v_req.child_id, 'growth_pill', 2);
      v_pills_awarded := 2;

      insert into public.player_progress (user_id, gold)
      values (v_req.child_id, 100)
      on conflict (user_id) do update
        set gold = public.player_progress.gold + 100;
      v_gold_awarded := true;

      insert into public.player_notifications (user_id, title, body)
      values (
        v_req.child_id,
        'Parent Quest complete!',
        'Your parent joined Learning Hall. You earned 2 Growth Pills + 100 Gold. Use a Growth Pill on any curio for +5 levels.'
      );
    exception when others then
      -- Never block the link itself over a reward failure (same as before).
      v_pills_awarded := 0;
      v_gold_awarded := false;
    end;
  end if;

  insert into public.analytics_events (user_id, session_id, event_name, properties)
  values (v_req.child_id, gen_random_uuid()::text, 'parent_link_confirmed',
          jsonb_build_object('gold_awarded', v_gold_awarded, 'growth_pills_awarded', v_pills_awarded));

  return jsonb_build_object('child_id', v_req.child_id, 'gold_awarded', v_gold_awarded,
                            'growth_pills_awarded', v_pills_awarded);
end;
$function$;
