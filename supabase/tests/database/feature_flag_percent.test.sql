-- pgTAP tests for 20261030090000_feature_flag_percent.sql: a percent switch reaches a steady
-- share of kids plus its allowlist, and the same kids across switches.

begin;
create extension if not exists pgtap;
select plan(7);

select is(public.feature_bucket('pgtap_bucket_kid'), public.feature_bucket('pgtap_bucket_kid'), 'a kid always lands in the same bucket');

select ok(
  (select bool_and(public.feature_bucket('pgtap_kid_' || i) between 0 and 99) from generate_series(1, 2000) i),
  'buckets run 0 to 99'
);

-- Roughly half of 2,000 made-up kids at 50%.
update feature_flags set mode = 'percent', percent = 50, allowlist = '{}' where key = 'new_nav';
select ok(
  (select count(*) filter (where public.feature_enabled_for('pgtap_kid_' || i, 'new_nav')) between 900 and 1100
   from generate_series(1, 2000) i),
  'percent 50 reaches about half the kids'
);

-- The same half for every switch at the same percent.
update feature_flags set mode = 'percent', percent = 50, allowlist = '{}' where key = 'garden';
select ok(
  (select bool_and(public.feature_enabled_for('pgtap_kid_' || i, 'new_nav') = public.feature_enabled_for('pgtap_kid_' || i, 'garden'))
   from generate_series(1, 500) i),
  'new_nav and garden reach the same kids'
);

-- An allowlisted kid outside the percent still gets it.
create temp table fx as
select min('pgtap_kid_' || i) as outside from generate_series(1, 2000) i
where public.feature_bucket('pgtap_kid_' || i) >= 50;
update feature_flags set allowlist = array[(select outside from fx)] where key = 'new_nav';
select ok(public.feature_enabled_for((select outside from fx), 'new_nav'), 'the allowlist still counts in percent mode');

update feature_flags set percent = 0, allowlist = '{}' where key = 'new_nav';
select ok(not public.feature_enabled_for((select outside from fx), 'new_nav'), 'percent 0 with no allowlist is off');

select throws_ok(
  $$ update feature_flags set percent = 101 where key = 'new_nav' $$,
  '23514', null, 'percent above 100 is refused'
);

select * from finish();
rollback;
