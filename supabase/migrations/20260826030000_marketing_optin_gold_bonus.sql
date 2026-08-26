-- Reward for opting into parent email updates: each child gets 250 free
-- gold, once. Guarded per-child (children.marketing_gold_bonus_awarded_at)
-- rather than per-parent, so it can't be farmed by toggling the opt-in off
-- and back on, and so a child added *after* the parent already opted in
-- still gets their welcome gold.
--
-- Mirrors confirm_parent_link's existing gold-grant pattern: gold lives in
-- weekly_packages.character_stats (week-scoped), and a freshly created
-- child may not have a weekly_packages row yet (created lazily elsewhere,
-- e.g. first login) — apply_character_deltas raises if the row is missing,
-- so every award attempt here is wrapped in exception handling and treated
-- as best-effort, never fatal to the caller's actual job (creating the
-- account, or saving the opt-in preference).

alter table public.children
  add column if not exists marketing_gold_bonus_awarded_at timestamptz;

create or replace function public.create_child_account(
  p_username text,
  p_pin text,
  p_full_name text,
  p_grade text,
  p_gender text,
  p_school_name text,
  p_avatar text
)
returns table(id text, username text)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_parent_status text;
  v_id text;
  v_current_count int;
  v_max int;
  v_opted_in boolean;
  v_week_start date;
begin
  select status, marketing_opt_in into v_parent_status, v_opted_in
  from public.parents where parents.id = auth.uid();
  if v_parent_status is null then
    raise exception 'not a parent account';
  end if;
  if v_parent_status = 'rejected' then
    raise exception 'parent account rejected';
  end if;

  select count(*) into v_current_count from public.children c
  where c.parent_id = auth.uid() and c.is_active = true;

  v_max := public.max_children_for_parent(auth.uid());
  if v_current_count >= v_max then
    raise exception 'child account limit reached (% of %) - subscribe or add a child slot to add more', v_current_count, v_max;
  end if;

  v_id := lower(regexp_replace(p_username, '[^a-zA-Z0-9_]', '', 'g'));
  if v_id = '' then
    raise exception 'invalid username';
  end if;

  if exists (select 1 from public.children c where c.id = v_id or c.username = p_username) then
    raise exception 'username already taken';
  end if;

  insert into public.children (id, parent_id, username, pin_hash, pin_plain, full_name, grade, gender, school_name, avatar)
  values (v_id, auth.uid(), p_username, extensions.crypt(p_pin, extensions.gen_salt('bf')), p_pin, p_full_name, p_grade, p_gender, p_school_name, p_avatar);

  if v_opted_in then
    v_week_start := current_date - (extract(dow from current_date))::int;
    begin
      perform public.apply_character_deltas(v_id, v_week_start, 0, 250);
      update public.children set marketing_gold_bonus_awarded_at = now() where children.id = v_id;
    exception when others then
      -- No weekly_packages row yet (child hasn't logged in) — skip quietly,
      -- account creation must still succeed either way.
      null;
    end;
  end if;

  return query select v_id, p_username;
end;
$function$;

create or replace function public.set_marketing_opt_in(p_opt_in boolean)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_child record;
  v_week_start date;
begin
  update public.parents
  set marketing_opt_in = p_opt_in,
      marketing_opt_in_at = case when p_opt_in then now() else null end
  where id = auth.uid();

  if p_opt_in then
    v_week_start := current_date - (extract(dow from current_date))::int;
    for v_child in
      select c.id from public.children c
      where c.parent_id = auth.uid()
        and c.is_active = true
        and c.marketing_gold_bonus_awarded_at is null
    loop
      begin
        perform public.apply_character_deltas(v_child.id, v_week_start, 0, 250);
        update public.children set marketing_gold_bonus_awarded_at = now() where children.id = v_child.id;
      exception when others then
        -- No weekly_packages row yet for this child/week — skip, not fatal.
        null;
      end;
    end loop;
  end if;
end;
$function$;
