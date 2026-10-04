-- pgTAP tests for 20261004210000_require_full_school_names: a school that
-- isn't in the directory has to be written out in full, initials that match a
-- directory alias still work (and are saved as the full name), and existing
-- accounts with initials can be re-saved untouched.

begin;
create extension if not exists pgtap;
select plan(14);

-- is_full_school_name(): the rule on its own.
select ok(public.is_full_school_name('Mater Carmeli School'), 'two words with a school word is a full name');
select ok(public.is_full_school_name('STA. CRUZ ELEMENTARY SCHOOL'), 'an all-caps full name is fine');
select ok(public.is_full_school_name('Teofilo V. Fernandez Elementary School'), 'a single-letter initial inside a name is fine');
select ok(not public.is_full_school_name('CES'), 'initials alone are rejected');
select ok(not public.is_full_school_name('Goodwill elementary'), 'a name with no school word is rejected');
select ok(not public.is_full_school_name('XU Ateneo De Cagayan'), 'initials inside a name are rejected');
select ok(not public.is_full_school_name('Tubajon Central Elem.School'), 'a shortened word like Elem is rejected');

-- check_signup_names(): the forms' pre-submit check.
select is(public.check_signup_names('pgtap_fsn_user', 'Pgtap Kid', 'CES'), 'school_name_short', 'pre-submit check flags initials');
select is(public.check_signup_names('pgtap_fsn_user', 'Pgtap Kid', 'scsses'), null, 'pre-submit check accepts a directory alias');

-- The trigger on children.
select throws_ok(
  $$insert into children (id, username, pin_hash, full_name, grade, school_name, avatar, referral_key)
    values ('pgtap_fsn_kida', 'pgtap_fsn_kida', 'x', 'Pgtap Kid A', 'Grade 4', 'CFSI', 'default', 'pgtapfsna')$$,
  'SCHOOL_NAME_NOT_FULL',
  'a new account with unknown initials is rejected'
);

insert into children (id, username, pin_hash, full_name, grade, school_name, avatar, referral_key)
values ('pgtap_fsn_kidb', 'pgtap_fsn_kidb', 'x', 'Pgtap Kid B', 'Grade 4', 'SCSSES', 'default', 'pgtapfsnb');
select is(
  (select school_name from children where id = 'pgtap_fsn_kidb'),
  'Surigao City Special Science Elementary School',
  'directory initials are saved as the full name'
);

-- An existing account that already has initials (inserted with the check
-- switched off, the way old rows predate it).
alter table children disable trigger children_resolve_school;
insert into children (id, username, pin_hash, full_name, grade, school_name, avatar, referral_key)
values ('pgtap_fsn_kidc', 'pgtap_fsn_kidc', 'x', 'Pgtap Kid C', 'Grade 4', 'LCES', 'default', 'pgtapfsnc');
alter table children enable trigger children_resolve_school;

select lives_ok(
  $$update children set school_name = school_name, grade = 'Grade 5' where id = 'pgtap_fsn_kidc'$$,
  'an existing account with initials can be re-saved unchanged'
);
select throws_ok(
  $$update children set school_name = 'SPED' where id = 'pgtap_fsn_kidc'$$,
  'SCHOOL_NAME_NOT_FULL',
  'changing to different unknown initials is rejected'
);
select lives_ok(
  $$update children set school_name = 'Pgtap Learning Center' where id = 'pgtap_fsn_kidc'$$,
  'changing to a full name works'
);

select * from finish();
rollback;
