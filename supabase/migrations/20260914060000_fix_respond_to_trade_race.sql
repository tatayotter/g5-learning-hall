-- Fix: respond_to_trade had a time-of-check-to-time-of-use race. Its
-- ownership check (v_mismatch) was a plain SELECT with no row lock on the
-- user_monsters rows being traded, and nothing reserves a curio once it's
-- offered in a pending trade. A player could list the same curio in two
-- separate pending trades; if both counterparties accepted close together,
-- both could pass the ownership check before either's final UPDATE ran, and
-- since the transfer UPDATEs match purely by row id (not by current owner),
-- whichever one committed last would silently overwrite the other's
-- transfer — both trades show 'completed' and both sides get their agreed
-- gold, but only one side actually ends up owning the curio.
--
-- Fix: lock the specific user_monsters rows involved in this trade (FOR
-- UPDATE) before the ownership check runs, same pattern already used below
-- for the two player_progress rows. A second concurrent respond_to_trade
-- touching the same curio now blocks until this one commits, so its own
-- ownership check correctly sees the new owner afterward and fails
-- gracefully ('items_unavailable') instead of racing.
CREATE OR REPLACE FUNCTION public.respond_to_trade(p_trade_id uuid, p_accept boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_me text := public.current_app_user_id();
  v_trade record;
  v_total_items int;
  v_mismatch int;
  v_initiator_gold_fee int;
  v_recipient_gold_fee int;
  v_curio_fee int;
  v_initiator_total_fee int;
  v_recipient_total_fee int;
  v_initiator_debit int;
  v_recipient_debit int;
  v_lo text;
  v_hi text;
  v_initiator_bal int;
  v_recipient_bal int;
  v_initiator_items int;
  v_recipient_items int;
  v_week date := public.current_week_start();
begin
  if v_me is null then
    raise exception 'not authenticated';
  end if;

  select * into v_trade from public.trades where id = p_trade_id for update;
  if not found then
    raise exception 'trade not found';
  end if;
  if v_me <> v_trade.recipient_id then
    raise exception 'only the recipient can respond to this trade';
  end if;
  if v_trade.status <> 'pending' then
    return jsonb_build_object('status', v_trade.status);
  end if;

  if now() > v_trade.expires_at then
    update public.trades set status = 'expired' where id = p_trade_id;
    return jsonb_build_object('status', 'expired');
  end if;

  if not p_accept then
    update public.trades set status = 'declined', responded_at = now() where id = p_trade_id;
    return jsonb_build_object('status', 'declined');
  end if;

  -- Lock every curio involved in this trade before checking ownership, so a
  -- concurrent respond_to_trade on a different trade sharing one of these
  -- curios has to wait for this transaction to finish instead of racing it.
  perform um.id
  from public.trade_items ti
  join public.user_monsters um on um.id = ti.user_monster_id
  where ti.trade_id = p_trade_id
  for update of um;

  select count(*) into v_mismatch
  from public.trade_items ti
  join public.user_monsters um on um.id = ti.user_monster_id
  where ti.trade_id = p_trade_id
    and ((ti.side = 'initiator' and um.user_id <> v_trade.initiator_id)
      or (ti.side = 'recipient' and um.user_id <> v_trade.recipient_id));

  if v_mismatch > 0 then
    update public.trades set status = 'failed', fail_reason = 'one or more curios changed hands before this trade was confirmed', responded_at = now()
      where id = p_trade_id;
    return jsonb_build_object('status', 'failed', 'reason', 'items_unavailable');
  end if;

  select count(*) filter (where side = 'initiator'), count(*) filter (where side = 'recipient'), count(*)
    into v_initiator_items, v_recipient_items, v_total_items
    from public.trade_items where trade_id = p_trade_id;

  v_curio_fee := 250 * v_total_items;
  v_initiator_gold_fee := case when v_trade.initiator_gold > 0 then greatest(1, ceil(v_trade.initiator_gold * 0.08)::int) else 0 end;
  v_recipient_gold_fee := case when v_trade.recipient_gold > 0 then greatest(1, ceil(v_trade.recipient_gold * 0.08)::int) else 0 end;

  v_initiator_total_fee := v_curio_fee + v_initiator_gold_fee;
  v_recipient_total_fee := v_recipient_gold_fee;

  v_initiator_debit := v_trade.initiator_gold + v_initiator_total_fee;
  v_recipient_debit := v_trade.recipient_gold + v_recipient_total_fee;

  v_lo := least(v_trade.initiator_id, v_trade.recipient_id);
  v_hi := greatest(v_trade.initiator_id, v_trade.recipient_id);

  insert into public.player_progress (user_id) values (v_lo) on conflict (user_id) do nothing;
  insert into public.player_progress (user_id) values (v_hi) on conflict (user_id) do nothing;

  perform 1 from public.player_progress where user_id = v_lo for update;
  perform 1 from public.player_progress where user_id = v_hi for update;

  select gold into v_initiator_bal from public.player_progress where user_id = v_trade.initiator_id;
  select gold into v_recipient_bal from public.player_progress where user_id = v_trade.recipient_id;

  if v_initiator_bal is null or v_recipient_bal is null then
    update public.trades set status = 'failed', fail_reason = 'missing player progress row', responded_at = now() where id = p_trade_id;
    return jsonb_build_object('status', 'failed', 'reason', 'no_player_progress');
  end if;

  if v_initiator_bal < v_initiator_debit then
    update public.trades set status = 'failed', fail_reason = 'initiator has insufficient gold', responded_at = now() where id = p_trade_id;
    return jsonb_build_object('status', 'failed', 'reason', 'initiator_insufficient_gold');
  end if;
  if v_recipient_bal < v_recipient_debit then
    update public.trades set status = 'failed', fail_reason = 'recipient has insufficient gold', responded_at = now() where id = p_trade_id;
    return jsonb_build_object('status', 'failed', 'reason', 'recipient_insufficient_gold');
  end if;

  update public.player_progress set gold = v_initiator_bal - v_initiator_debit + v_trade.recipient_gold, updated_at = now()
    where user_id = v_trade.initiator_id;

  update public.player_progress set gold = v_recipient_bal - v_recipient_debit + v_trade.initiator_gold, updated_at = now()
    where user_id = v_trade.recipient_id;

  update public.user_monsters um
    set user_id = v_trade.recipient_id, slot = null, acquired_via = 'traded'
    from public.trade_items ti
    where ti.trade_id = p_trade_id and ti.side = 'initiator' and um.id = ti.user_monster_id;

  update public.user_monsters um
    set user_id = v_trade.initiator_id, slot = null, acquired_via = 'traded'
    from public.trade_items ti
    where ti.trade_id = p_trade_id and ti.side = 'recipient' and um.id = ti.user_monster_id;

  update public.trades
    set status = 'completed', responded_at = now(),
        initiator_fee_gold = v_initiator_total_fee, recipient_fee_gold = v_recipient_total_fee
    where id = p_trade_id;

  insert into public.player_log (user_id, week_starting_date, action_type, description, xp_change, gold_change)
  values (
    v_trade.initiator_id, v_week, 'trade',
    format('🔄 Traded %s curio(s)%s with %s for %s curio(s)%s (fee: %s gold)',
      v_initiator_items,
      case when v_trade.initiator_gold > 0 then format(' + %s gold', v_trade.initiator_gold) else '' end,
      v_trade.recipient_id,
      v_recipient_items,
      case when v_trade.recipient_gold > 0 then format(' + %s gold', v_trade.recipient_gold) else '' end,
      v_initiator_total_fee
    ),
    0,
    v_trade.recipient_gold - v_initiator_debit
  );

  insert into public.player_log (user_id, week_starting_date, action_type, description, xp_change, gold_change)
  values (
    v_trade.recipient_id, v_week, 'trade',
    format('🔄 Traded %s curio(s)%s with %s for %s curio(s)%s%s',
      v_recipient_items,
      case when v_trade.recipient_gold > 0 then format(' + %s gold', v_trade.recipient_gold) else '' end,
      v_trade.initiator_id,
      v_initiator_items,
      case when v_trade.initiator_gold > 0 then format(' + %s gold', v_trade.initiator_gold) else '' end,
      case when v_recipient_total_fee > 0 then format(' (fee: %s gold)', v_recipient_total_fee) else '' end
    ),
    0,
    v_trade.initiator_gold - v_recipient_debit
  );

  return jsonb_build_object(
    'status', 'completed',
    'initiator_fee_gold', v_initiator_total_fee,
    'recipient_fee_gold', v_recipient_total_fee
  );
end;
$function$;
