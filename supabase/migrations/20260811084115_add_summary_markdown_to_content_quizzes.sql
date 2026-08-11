-- Discovered during Phase 2 backfill prep: package_data subjects carry a summary_markdown
-- lesson field alongside the quiz array (e.g. weekly_packages.package_data->'Monday'->'English'
-- ->'summary_markdown'), which Phase 1's content_quizzes table had no column for. Adding it now,
-- before backfill, so this content isn't silently dropped.

ALTER TABLE public.content_quizzes ADD COLUMN IF NOT EXISTS summary_markdown text;

CREATE OR REPLACE FUNCTION public.admin_set_content_day_quiz(p_passcode text, p_content_week_id uuid, p_weekday text, p_subject text, p_questions jsonb, p_summary_markdown text DEFAULT NULL)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare
  day_id uuid;
  quiz_id uuid;
  q jsonb;
  idx integer := 0;
begin
  PERFORM public.check_admin_passcode(p_passcode);

  INSERT INTO public.content_days (content_week_id, weekday)
  VALUES (p_content_week_id, p_weekday)
  ON CONFLICT (content_week_id, weekday) DO UPDATE SET weekday = EXCLUDED.weekday
  RETURNING id INTO day_id;

  INSERT INTO public.content_quizzes (content_day_id, subject, summary_markdown)
  VALUES (day_id, p_subject, p_summary_markdown)
  ON CONFLICT (content_day_id, subject) DO UPDATE SET subject = EXCLUDED.subject, summary_markdown = EXCLUDED.summary_markdown
  RETURNING id INTO quiz_id;

  DELETE FROM public.content_questions WHERE content_quiz_id = quiz_id;

  FOR q IN SELECT * FROM jsonb_array_elements(p_questions) LOOP
    INSERT INTO public.content_questions (content_quiz_id, prompt, options, correct_answer, sort_order)
    VALUES (quiz_id, q ->> 'prompt', q -> 'options', q ->> 'correct_answer', idx);
    idx := idx + 1;
  END LOOP;

  RETURN quiz_id;
end;
$function$;
