-- pgTAP tests for 20261006060000_canonical_subject_names.sql: main quest
-- content only accepts official subject names (plus the Friday "Weekly
-- Review"), so an old or misspelled name can't split a subject in reports.

begin;
create extension if not exists pgtap;
select plan(4);

insert into content_weeks (grade, week_starting_date) values (5, '2030-01-06');
insert into content_days (content_week_id, weekday)
select id, 'Monday' from content_weeks where grade = 5 and week_starting_date = '2030-01-06';

create temp table fx as
select d.id as day_id from content_days d
join content_weeks w on w.id = d.content_week_id
where w.grade = 5 and w.week_starting_date = '2030-01-06' and d.weekday = 'Monday';

select lives_ok(
  format('insert into content_quizzes (content_day_id, subject) values (%L, %L)', (select day_id from fx), 'Mathematics'),
  'an official subject name is accepted'
);
select lives_ok(
  format('insert into content_quizzes (content_day_id, subject) values (%L, %L)', (select day_id from fx), 'Weekly Review'),
  'the Friday Weekly Review quest is accepted'
);
select throws_ok(
  format('insert into content_quizzes (content_day_id, subject) values (%L, %L)', (select day_id from fx), 'Math'),
  '23514', null,
  'an old name ("Math") is rejected'
);
select throws_ok(
  format('insert into content_quizzes (content_day_id, subject) values (%L, %L)', (select day_id from fx), 'Social Studies'),
  '23514', null,
  'another old name ("Social Studies") is rejected'
);

select * from finish();
rollback;
