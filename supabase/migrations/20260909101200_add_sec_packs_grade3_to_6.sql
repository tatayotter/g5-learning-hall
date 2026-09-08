-- Adds Grade 3-6 Math Enrichment SEC catalog rows, matching the Grade 2 row's
-- shape (see 20260905170000_add_sec_shop_schema.sql for the table). Their
-- mtap_expansion_content batches were imported in the preceding
-- mtap_grade{3,4,5,6}_content_batch* migrations; MTAP_GRADE{3,4,5,6}_STRANDS
-- in lib/mtapContent.ts is the matching display-layer strand list.
INSERT INTO public.sec_packs (id, grade, category, title, description, price_php, content_ref, active)
VALUES
  ('g3-math-enrichment', 3, 'math_enrichment', 'Grade 3 Math Enrichment (MTAP-level)', 'A full extra math quest line for Grade 3 -- 6 strands, 20 topics, three difficulty tiers, all built to MTAP competition style. Comes with untimed study guides for every topic and pays real Gold and XP just like regular quests.', 99, '{"grade": 3}'::jsonb, true),
  ('g4-math-enrichment', 4, 'math_enrichment', 'Grade 4 Math Enrichment (MTAP-level)', 'A full extra math quest line for Grade 4 -- 6 strands, 16 topics, three difficulty tiers, all built to MTAP competition style. Comes with untimed study guides for every topic and pays real Gold and XP just like regular quests.', 99, '{"grade": 4}'::jsonb, true),
  ('g5-math-enrichment', 5, 'math_enrichment', 'Grade 5 Math Enrichment (MTAP-level)', 'A full extra math quest line for Grade 5 -- 6 strands, 21 topics, three difficulty tiers, all built to MTAP competition style. Comes with untimed study guides for every topic and pays real Gold and XP just like regular quests.', 99, '{"grade": 5}'::jsonb, true),
  ('g6-math-enrichment', 6, 'math_enrichment', 'Grade 6 Math Enrichment (MTAP-level)', 'A full extra math quest line for Grade 6 -- 6 strands, 18 topics, three difficulty tiers, all built to MTAP competition style. Comes with untimed study guides for every topic and pays real Gold and XP just like regular quests.', 99, '{"grade": 6}'::jsonb, true)
ON CONFLICT (id) DO NOTHING;
