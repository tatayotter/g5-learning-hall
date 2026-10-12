-- pgTAP tests for 20261012070000_boss_bank_signature.sql: a device's stored boss bank is
-- re-downloaded when a question is reworded in place (same count), and the fingerprint only
-- covers published questions.

begin;
create extension if not exists pgtap;
select plan(6);

-- Term 99 keeps these rows apart from anything else in the database.
insert into draft_questions (id, week_starting_date, grade, subject, tier, topic, question, options, correct_answer, status, term)
values
  ('00000000-0000-0000-0000-00000000b001', '2026-10-04', 6, 'MAPEH', 1, 'Dula', 'Ano ang dula?', '["Isang palabas", "Isang laro"]', 'Isang palabas', 'published', 99),
  ('00000000-0000-0000-0000-00000000b002', '2026-10-04', 6, 'MAPEH', 1, 'Dula', 'Draft only', '["A", "B"]', 'A', 'pending_review', 99);

create temp table sig as select boss_bank_signature(6, 99) as before;

select ok(
  has_function_privilege('anon', 'public.boss_bank_signature(integer, integer)', 'execute')
  and has_function_privilege('authenticated', 'public.boss_bank_signature(integer, integer)', 'execute'),
  'devices can read the signature, like the answer-free view it hashes'
);
select is(boss_bank_signature(6, 99), (select before from sig), 'the signature is stable while nothing changes');

update draft_questions set question = 'Draft only, edited' where id = '00000000-0000-0000-0000-00000000b002';
select is(boss_bank_signature(6, 99), (select before from sig), 'an unpublished question does not change it');

update draft_questions
set question = 'What is a play?', options = '["A show", "A game"]', correct_answer = 'A show', topic = 'Theater'
where id = '00000000-0000-0000-0000-00000000b001';
select isnt(boss_bank_signature(6, 99), (select before from sig), 'rewording a question in place changes it');

select isnt(boss_bank_signature(6, 99), boss_bank_signature(6, 98), 'each term has its own signature');
select is(boss_bank_signature(6, 98), md5(''), 'an empty term still returns a signature');

select * from finish();
rollback;
