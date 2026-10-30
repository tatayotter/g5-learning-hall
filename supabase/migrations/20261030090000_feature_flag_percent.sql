-- Percent rollouts for the hidden feature switches (lib/featureFlags.ts). Until now a switch
-- was off, on for an allowlist, or on for everyone. 'percent' turns it on for a steady share
-- of kids plus anyone on the allowlist, e.g. half the kids:
--   update feature_flags set mode = 'percent', percent = 50 where key in ('new_nav', 'garden');
-- Each kid's bucket (0-99) comes from their id alone, not the switch, so the same kids get
-- every switch at the same percent (new_nav and garden go together), and a kid never flips
-- between visits. Raising the percent only adds kids. Additive: one column, a wider check,
-- and feature_enabled_for() learns the new mode. No switch changes mode here.

alter table public.feature_flags add column if not exists percent smallint not null default 0;

alter table public.feature_flags drop constraint if exists feature_flags_percent_check;
alter table public.feature_flags add constraint feature_flags_percent_check check (percent between 0 and 100);

alter table public.feature_flags drop constraint if exists feature_flags_mode_check;
alter table public.feature_flags add constraint feature_flags_mode_check
  check (mode in ('off', 'allowlist', 'percent', 'everyone'));

-- md5, not hashtext: hashtext's output may change across Postgres versions, which would
-- reshuffle who has what.
create or replace function public.feature_bucket(p_user_id text)
returns int
language sql
immutable
set search_path to 'public'
as $$
  select (('x' || substr(md5(p_user_id), 1, 8))::bit(32)::bigint % 100)::int;
$$;

revoke all on function public.feature_bucket(text) from public, anon, authenticated;
grant execute on function public.feature_bucket(text) to service_role;

create or replace function public.feature_enabled_for(p_user_id text, p_key text)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from public.feature_flags
    where key = p_key
      and (mode = 'everyone'
        or (mode in ('allowlist', 'percent') and p_user_id = any(allowlist))
        or (mode = 'percent' and public.feature_bucket(p_user_id) < percent))
  );
$$;
