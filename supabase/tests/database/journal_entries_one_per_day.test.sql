-- pgTAP tests for 20261006050000_journal_entries_one_per_day.sql: one journal
-- entry per child per day, and a repeat save with ON CONFLICT DO NOTHING (what
-- GuildJournal sends) is ignored instead of archived again.

begin;
create extension if not exists pgtap;
select plan(3);

select has_index('public', 'journal_entries', 'journal_entries_user_day_key', 'one-entry-per-day index exists');

insert into journal_entries (user_id, entry_date, done_today) values ('pgtap_kid_journal', '2030-01-01', 'first');
insert into journal_entries (user_id, entry_date, done_today) values ('pgtap_kid_journal', '2030-01-01', 'again')
  on conflict (user_id, entry_date) do nothing;

select is(
  (select count(*)::int from journal_entries where user_id = 'pgtap_kid_journal' and entry_date = '2030-01-01'),
  1,
  'a repeat save for the same day is ignored'
);
select is(
  (select done_today from journal_entries where user_id = 'pgtap_kid_journal' and entry_date = '2030-01-01'),
  'first',
  'the first save is kept'
);

select * from finish();
rollback;
