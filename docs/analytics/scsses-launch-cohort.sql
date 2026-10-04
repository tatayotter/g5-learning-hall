-- SCSSES launch cohort: saved queries
--
-- Cohort = children registered at Surigao City Special Science Elementary
-- School (schools.id below) on or after Friday 2026-10-02, Manila time, the
-- day the school started recommending the app. Parents = those children's
-- linked parent accounts.
--
-- Kid events: analytics_events.user_id = children.id
-- Parent events: analytics_events.user_id = parents.id::text (app_tab = 'parent')
-- Days are bucketed in Asia/Manila.
--
-- Event coverage: screen_time, client_error and every parent_* event except
-- parent_link_* only exist from the 2026-10-04 analytics deploy onward, and
-- parent rows only once migration 20261004120000 is applied.
--
-- Each query below is standalone: copy the `with cohort as (...)` block it
-- starts with. Run in the Supabase SQL editor.


-- ── 1. Cohort size by grade and signup day ───────────────────────────────────
with cohort as (
  select c.id, c.grade, c.parent_id, c.created_at,
         (c.created_at at time zone 'Asia/Manila')::date as signup_day
  from children c
  where c.school_id = '388e1bde-c69e-4135-82af-26d5a07c06c7'
    and c.created_at >= timestamptz '2026-10-02 00:00:00+08'
    and c.is_active
)
select signup_day, grade, count(*) as kids, count(parent_id) as with_parent
from cohort group by 1, 2 order by 1, 2;


-- ── 2. Activation: did they learn anything on signup day? ───────────────────
-- "Learned" = finished any quiz-type activity.
with cohort as (
  select c.id, c.grade, (c.created_at at time zone 'Asia/Manila')::date as signup_day
  from children c
  where c.school_id = '388e1bde-c69e-4135-82af-26d5a07c06c7'
    and c.created_at >= timestamptz '2026-10-02 00:00:00+08'
    and c.is_active
), learned as (
  select distinct e.user_id, (e.created_at at time zone 'Asia/Manila')::date as day
  from analytics_events e join cohort k on k.id = e.user_id
  where e.event_name in ('main_quest_completed', 'guild_quiz_complete', 'event_quiz_completed', 'intro_training_completed')
)
select k.grade,
       count(*) as kids,
       count(*) filter (where exists (select 1 from learned l where l.user_id = k.id and l.day = k.signup_day)) as learned_day0,
       count(*) filter (where exists (select 1 from learned l where l.user_id = k.id)) as learned_ever
from cohort k group by 1 order by 1;


-- ── 3. Retention: came back on day 1 / within days 1-7 / days 8-30 ─────────
with cohort as (
  select c.id, (c.created_at at time zone 'Asia/Manila')::date as signup_day
  from children c
  where c.school_id = '388e1bde-c69e-4135-82af-26d5a07c06c7'
    and c.created_at >= timestamptz '2026-10-02 00:00:00+08'
    and c.is_active
), active_days as (
  select distinct e.user_id, (e.created_at at time zone 'Asia/Manila')::date as day
  from analytics_events e join cohort k on k.id = e.user_id
)
select k.signup_day,
       count(*) as kids,
       count(*) filter (where exists (select 1 from active_days a where a.user_id = k.id and a.day = k.signup_day + 1)) as d1,
       count(*) filter (where exists (select 1 from active_days a where a.user_id = k.id and a.day between k.signup_day + 1 and k.signup_day + 7)) as d1_7,
       count(*) filter (where exists (select 1 from active_days a where a.user_id = k.id and a.day between k.signup_day + 8 and k.signup_day + 30)) as d8_30
from cohort k group by 1 order by 1;
-- Read d1_7 / d8_30 only for signup days at least 7 / 30 days old.


-- ── 4. Feature audit: adoption x repeat use per screen ───────────────────────
-- adoption = share of cohort kids who visited; repeat = avg distinct days per
-- visitor. Plot adoption against repeat for the keep/improve/remove call.
with cohort as (
  select c.id from children c
  where c.school_id = '388e1bde-c69e-4135-82af-26d5a07c06c7'
    and c.created_at >= timestamptz '2026-10-02 00:00:00+08'
    and c.is_active
), visits as (
  select e.user_id, e.app_tab as screen, (e.created_at at time zone 'Asia/Manila')::date as day
  from analytics_events e join cohort k on k.id = e.user_id
  where e.event_name = 'tab_view' and e.app_tab is not null
)
select screen,
       count(distinct user_id) as kids,
       round(100.0 * count(distinct user_id) / (select count(*) from cohort), 1) as adoption_pct,
       round(count(distinct (user_id, day))::numeric / nullif(count(distinct user_id), 0), 2) as days_per_visitor
from visits group by 1 order by adoption_pct desc;


-- ── 5. Active time per screen (from screen_time) ─────────────────────────────
-- Quests appear as quest_study / quest_ready / quest_quiz; tabs by tab key.
with cohort as (
  select c.id from children c
  where c.school_id = '388e1bde-c69e-4135-82af-26d5a07c06c7'
    and c.created_at >= timestamptz '2026-10-02 00:00:00+08'
    and c.is_active
)
select e.properties ->> 'screen' as screen,
       count(distinct e.user_id) as kids,
       round(sum((e.properties ->> 'duration_ms')::numeric) / 60000, 1) as total_min,
       round((percentile_cont(0.5) within group (order by (e.properties ->> 'duration_ms')::numeric) / 1000)::numeric, 0) as median_visit_s
from analytics_events e join cohort k on k.id = e.user_id
where e.event_name = 'screen_time'
group by 1 order by total_min desc;


-- ── 6. Parent funnel for the cohort's parents ────────────────────────────────
with cohort_parents as (
  select distinct c.parent_id from children c
  where c.school_id = '388e1bde-c69e-4135-82af-26d5a07c06c7'
    and c.created_at >= timestamptz '2026-10-02 00:00:00+08'
    and c.is_active and c.parent_id is not null
)
select e.event_name,
       coalesce(e.properties ->> 'page', e.properties ->> 'sheet', e.properties ->> 'insight',
                e.properties ->> 'feature', e.properties ->> 'target', e.properties ->> 'kind') as detail,
       count(distinct e.user_id) as parents,
       count(*) as events
from analytics_events e join cohort_parents p on p.parent_id::text = e.user_id
where e.app_tab = 'parent' and e.event_name <> 'screen_time'
group by 1, 2 order by parents desc, events desc;


-- ── 7. Parent time per screen ────────────────────────────────────────────────
with cohort_parents as (
  select distinct c.parent_id from children c
  where c.school_id = '388e1bde-c69e-4135-82af-26d5a07c06c7'
    and c.created_at >= timestamptz '2026-10-02 00:00:00+08'
    and c.is_active and c.parent_id is not null
)
select e.properties ->> 'screen' as screen,
       count(distinct e.user_id) as parents,
       round(sum((e.properties ->> 'duration_ms')::numeric) / 60000, 1) as total_min
from analytics_events e join cohort_parents p on p.parent_id::text = e.user_id
where e.event_name = 'screen_time'
group by 1 order by total_min desc;


-- ── 8. Client errors (all users, launch week) ────────────────────────────────
select e.properties ->> 'source' as source,
       e.properties ->> 'message' as message,
       e.properties ->> 'path' as path,
       count(*) as hits,
       count(distinct e.user_id) as users,
       max(e.created_at) as last_seen
from analytics_events e
where e.event_name = 'client_error'
  and e.created_at >= timestamptz '2026-10-04 00:00:00+08'
group by 1, 2, 3 order by users desc, hits desc;
