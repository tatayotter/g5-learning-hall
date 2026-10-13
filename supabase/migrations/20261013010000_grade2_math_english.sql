-- Grade 2 Math in English. Eight place-value questions and two lesson lines were in Filipino
-- (for example "Sa bilang na 542, anong digit ang nasa 'tens place'?"); Mathematics is an
-- English subject. Prompts and lesson lines only: the answer choices are numbers and do not
-- change, so correct_answer stays as it is. Every update matches the exact old text, so it is a
-- no-op on an empty database or when re-run.

update public.content_questions set prompt = 'In the number 542, which digit is in the tens place?'
where id = 'b3892d7e-c9c1-4482-b80f-72a9da767b7b' and prompt = 'Sa bilang na 542, anong digit ang nasa ''tens place''?';

update public.content_questions set prompt = 'In the number 801, which digit is in the ones place?'
where id = '3e01ef21-54f1-4e4b-8377-cb316f7edb80' and prompt = 'Sa bilang na 801, anong digit ang nasa ''ones place''?';

update public.content_questions set prompt = 'In the number 369, which digit is in the hundreds place?'
where id = 'b6557b90-06fe-45a4-b894-960453cced36' and prompt = 'Sa bilang na 369, anong digit ang nasa ''hundreds place''?';

update public.content_questions set prompt = 'In the number 363, what is the value of the digit 6?'
where id = '4d63ed02-9ea8-4770-979f-423f1a5123c2' and prompt = 'Sa bilang na 363, ano ang halaga o ''value'' ng digit na 6?';

update public.content_questions set prompt = 'In the number 759, what is the value of the digit 7?'
where id = 'b3ada28a-0ec0-4b8b-bdc0-afaa4b17e36f' and prompt = 'Sa bilang na 759, ano ang halaga o ''value'' ng digit na 7?';

update public.content_questions set prompt = 'What is the expanded form of 315?'
where id = 'f223c8f1-5768-44b3-aa57-947cb7083b2d' and prompt = 'Ano ang ''expanded form'' ng bilang na 315?';

update public.content_questions set prompt = 'What is the correct expanded form of 601, where the tens place is zero?'
where id = '61a7a328-f834-473d-abd8-9b5b89b2ebf4' and prompt = 'Ano ang tamang ''expanded form'' ng 601 kung saan ang ''tens place'' ay zero?';

update public.content_questions set prompt = 'If you put together 900 + 10 + 2, what number do you get in standard form?'
where id = '39cce2e9-de1f-4e01-843e-4bcad5d31c7d' and prompt = 'Kung pagsasamahin ang 900 + 10 + 2, ano ang mabubuong bilang sa ''standard form''?';

update public.content_quizzes set summary_markdown = replace(summary_markdown, 'Handa ka na ba? Sagutan ang iyong huling quiz para sa linggong ito!', 'Are you ready? Take your last quiz for this week!')
where id = 'b85f4df3-9f78-4e18-82c8-03ba0a9ad678' and subject = 'Mathematics' and position('Handa ka na ba? Sagutan ang iyong huling quiz para sa linggong ito!' in summary_markdown) > 0;

update public.content_quizzes set summary_markdown = replace(summary_markdown, 'Matututunan natin kung paano gamitin ang 1st, 2nd, 3rd hanggang 20th para ilarawan ang posisyon!', 'We will learn how to use 1st, 2nd, 3rd up to 20th to show position!')
where id = '9cce6a98-cc50-43f8-8da7-0acb21a2cb82' and subject = 'Mathematics' and position('Matututunan natin kung paano gamitin ang 1st, 2nd, 3rd hanggang 20th para ilarawan ang posisyon!' in summary_markdown) > 0;
