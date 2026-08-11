-- QuestModule.tsx reveals the correct answer text per question after submit (positionally
-- matched against the submitted question order), same UX as the old grade_weekly_quiz's
-- correct_answers array. grade_content_quiz's results only carried a boolean -- adding
-- correct_answer to each result entry, same reveal contract as grade_content_question already has.
CREATE OR REPLACE FUNCTION public.grade_content_quiz(p_user_id text, p_answers jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  ans jsonb;
  v_question_id uuid;
  v_selected text;
  v_correct_answer text;
  v_is_correct boolean;
  v_correct_count int := 0;
  v_total int := 0;
  v_results jsonb := '[]'::jsonb;
begin
  FOR ans IN SELECT * FROM jsonb_array_elements(p_answers) LOOP
    v_total := v_total + 1;
    v_question_id := (ans ->> 'question_id')::uuid;
    v_selected := ans ->> 'selected';

    SELECT correct_answer INTO v_correct_answer FROM public.content_questions WHERE id = v_question_id;
    v_is_correct := (v_correct_answer IS NOT NULL AND v_selected = v_correct_answer);
    IF v_is_correct THEN
      v_correct_count := v_correct_count + 1;
    END IF;

    INSERT INTO public.player_question_attempts (user_id, content_question_id, correct)
    VALUES (p_user_id, v_question_id, v_is_correct)
    ON CONFLICT (user_id, content_question_id) DO UPDATE SET correct = EXCLUDED.correct, answered_at = now();

    v_results := v_results || jsonb_build_array(jsonb_build_object('question_id', v_question_id, 'correct', v_is_correct, 'correct_answer', v_correct_answer));
  END LOOP;

  RETURN jsonb_build_object(
    'correct_count', v_correct_count,
    'total', v_total,
    'is_perfect', (v_total > 0 AND v_correct_count = v_total),
    'results', v_results
  );
end;
$function$;
