INSERT INTO public.mtap_expansion_content
  (question_code, grade, strand, archetype, tier, params, question, options,
   correct_answer, distractor_rationale, solution_steps, technique, scaffold_note,
   time_budget_seconds, visual, generated_by, reviewed)
VALUES
  ('g2-s6-data_graph_reading-easy-0005', 2, 6, 'data_graph_reading', 'easy', '{"vals": {"apples": 270, "bananas": 467, "mangoes": 471, "grapes": 490}, "target": "bananas"}'::jsonb, 'A bar graph shows fruits picked in one day:

| Fruit | Amount Picked |
|---|---|
| apples | 270 |
| bananas | 467 |
| mangoes | 471 |
| grapes | 490 |

How many bananas were picked?', '["490", "467", "270", "471"]'::jsonb, '467', '["read a different fruit''s bar instead", "read a different fruit''s bar instead", "read a different fruit''s bar instead"]'::jsonb, 'Reading the bananas row directly from the table gives 467.', NULL, '', 15, NULL, 'template-mtap-g2-v1', true),
  ('g2-s6-data_graph_reading-easy-0006', 2, 6, 'data_graph_reading', 'easy', '{"vals": {"apples": 295, "bananas": 210, "mangoes": 140, "grapes": 253}, "target": "mangoes"}'::jsonb, 'A bar graph shows fruits picked in one day:

| Fruit | Amount Picked |
|---|---|
| apples | 295 |
| bananas | 210 |
| mangoes | 140 |
| grapes | 253 |

How many mangoes were picked?', '["140", "295", "253", "210"]'::jsonb, '140', '["read a different fruit''s bar instead", "read a different fruit''s bar instead", "read a different fruit''s bar instead"]'::jsonb, 'Reading the mangoes row directly from the table gives 140.', NULL, '', 15, NULL, 'template-mtap-g2-v1', true),
  ('g2-s6-data_graph_reading-easy-0007', 2, 6, 'data_graph_reading', 'easy', '{"vals": {"apples": 344, "bananas": 450, "mangoes": 174, "grapes": 216}, "target": "grapes"}'::jsonb, 'A bar graph shows fruits picked in one day:

| Fruit | Amount Picked |
|---|---|
| apples | 344 |
| bananas | 450 |
| mangoes | 174 |
| grapes | 216 |

How many grapes were picked?', '["216", "174", "344", "450"]'::jsonb, '216', '["read a different fruit''s bar instead", "read a different fruit''s bar instead", "read a different fruit''s bar instead"]'::jsonb, 'Reading the grapes row directly from the table gives 216.', NULL, '', 15, NULL, 'template-mtap-g2-v1', true),
  ('g2-s6-data_graph_reading-easy-0008', 2, 6, 'data_graph_reading', 'easy', '{"vals": {"apples": 108, "bananas": 338, "mangoes": 152, "grapes": 353}, "target": "bananas"}'::jsonb, 'A bar graph shows fruits picked in one day:

| Fruit | Amount Picked |
|---|---|
| apples | 108 |
| bananas | 338 |
| mangoes | 152 |
| grapes | 353 |

How many bananas were picked?', '["353", "108", "152", "338"]'::jsonb, '338', '["read a different fruit''s bar instead", "read a different fruit''s bar instead", "read a different fruit''s bar instead"]'::jsonb, 'Reading the bananas row directly from the table gives 338.', NULL, '', 15, NULL, 'template-mtap-g2-v1', true),
  ('g2-s6-data_graph_reading-average-0001', 2, 6, 'data_graph_reading', 'average', '{"vals": {"apples": 412, "bananas": 157, "mangoes": 274, "grapes": 458}, "f1": "mangoes", "f2": "grapes", "op": "difference"}'::jsonb, 'A bar graph shows fruits picked in one day:

| Fruit | Amount Picked |
|---|---|
| apples | 412 |
| bananas | 157 |
| mangoes | 274 |
| grapes | 458 |

How many more were picked in mangoes and grapes?', '["184", "274", "458", "732"]'::jsonb, '184', '["gave just one fruit''s amount instead of combining both", "gave just the other fruit''s amount instead of combining both", "computed the opposite operation (sum vs. difference)"]'::jsonb, 'mangoes: 274, grapes: 458. The difference is 184.', NULL, '', 30, NULL, 'template-mtap-g2-v1', true),
  ('g2-s6-data_graph_reading-average-0002', 2, 6, 'data_graph_reading', 'average', '{"vals": {"apples": 121, "bananas": 374, "mangoes": 205, "grapes": 173}, "f1": "mangoes", "f2": "grapes", "op": "difference"}'::jsonb, 'A bar graph shows fruits picked in one day:

| Fruit | Amount Picked |
|---|---|
| apples | 121 |
| bananas | 374 |
| mangoes | 205 |
| grapes | 173 |

How many more were picked in mangoes and grapes?', '["173", "32", "205", "378"]'::jsonb, '32', '["gave just one fruit''s amount instead of combining both", "gave just the other fruit''s amount instead of combining both", "computed the opposite operation (sum vs. difference)"]'::jsonb, 'mangoes: 205, grapes: 173. The difference is 32.', NULL, '', 30, NULL, 'template-mtap-g2-v1', true),
  ('g2-s6-data_graph_reading-average-0003', 2, 6, 'data_graph_reading', 'average', '{"vals": {"apples": 279, "bananas": 356, "mangoes": 295, "grapes": 348}, "f1": "grapes", "f2": "mangoes", "op": "total"}'::jsonb, 'A bar graph shows fruits picked in one day:

| Fruit | Amount Picked |
|---|---|
| apples | 279 |
| bananas | 356 |
| mangoes | 295 |
| grapes | 348 |

How many were picked in total between grapes and mangoes?', '["295", "53", "348", "643"]'::jsonb, '643', '["gave just one fruit''s amount instead of combining both", "gave just the other fruit''s amount instead of combining both", "computed the opposite operation (sum vs. difference)"]'::jsonb, 'grapes: 348, mangoes: 295. The total is 643.', NULL, '', 30, NULL, 'template-mtap-g2-v1', true),
  ('g2-s6-data_graph_reading-average-0004', 2, 6, 'data_graph_reading', 'average', '{"vals": {"apples": 105, "bananas": 443, "mangoes": 177, "grapes": 386}, "f1": "mangoes", "f2": "apples", "op": "difference"}'::jsonb, 'A bar graph shows fruits picked in one day:

| Fruit | Amount Picked |
|---|---|
| apples | 105 |
| bananas | 443 |
| mangoes | 177 |
| grapes | 386 |

How many more were picked in mangoes and apples?', '["72", "105", "177", "282"]'::jsonb, '72', '["gave just one fruit''s amount instead of combining both", "gave just the other fruit''s amount instead of combining both", "computed the opposite operation (sum vs. difference)"]'::jsonb, 'mangoes: 177, apples: 105. The difference is 72.', NULL, '', 30, NULL, 'template-mtap-g2-v1', true),
  ('g2-s6-data_graph_reading-average-0005', 2, 6, 'data_graph_reading', 'average', '{"vals": {"apples": 104, "bananas": 55, "mangoes": 100, "grapes": 182}, "f1": "bananas", "f2": "mangoes", "op": "difference"}'::jsonb, 'A bar graph shows fruits picked in one day:

| Fruit | Amount Picked |
|---|---|
| apples | 104 |
| bananas | 55 |
| mangoes | 100 |
| grapes | 182 |

How many more were picked in bananas and mangoes?', '["45", "100", "55", "155"]'::jsonb, '45', '["gave just one fruit''s amount instead of combining both", "gave just the other fruit''s amount instead of combining both", "computed the opposite operation (sum vs. difference)"]'::jsonb, 'bananas: 55, mangoes: 100. The difference is 45.', NULL, '', 30, NULL, 'template-mtap-g2-v1', true),
  ('g2-s6-data_graph_reading-average-0006', 2, 6, 'data_graph_reading', 'average', '{"vals": {"apples": 287, "bananas": 445, "mangoes": 397, "grapes": 351}, "f1": "bananas", "f2": "grapes", "op": "difference"}'::jsonb, 'A bar graph shows fruits picked in one day:

| Fruit | Amount Picked |
|---|---|
| apples | 287 |
| bananas | 445 |
| mangoes | 397 |
| grapes | 351 |

How many more were picked in bananas and grapes?', '["351", "445", "94", "796"]'::jsonb, '94', '["gave just one fruit''s amount instead of combining both", "gave just the other fruit''s amount instead of combining both", "computed the opposite operation (sum vs. difference)"]'::jsonb, 'bananas: 445, grapes: 351. The difference is 94.', NULL, '', 30, NULL, 'template-mtap-g2-v1', true),
  ('g2-s6-data_graph_reading-average-0007', 2, 6, 'data_graph_reading', 'average', '{"vals": {"apples": 262, "bananas": 93, "mangoes": 109, "grapes": 475}, "f1": "bananas", "f2": "grapes", "op": "total"}'::jsonb, 'A bar graph shows fruits picked in one day:

| Fruit | Amount Picked |
|---|---|
| apples | 262 |
| bananas | 93 |
| mangoes | 109 |
| grapes | 475 |

How many were picked in total between bananas and grapes?', '["382", "568", "93", "475"]'::jsonb, '568', '["gave just one fruit''s amount instead of combining both", "gave just the other fruit''s amount instead of combining both", "computed the opposite operation (sum vs. difference)"]'::jsonb, 'bananas: 93, grapes: 475. The total is 568.', NULL, '', 30, NULL, 'template-mtap-g2-v1', true),
  ('g2-s6-data_graph_reading-average-0008', 2, 6, 'data_graph_reading', 'average', '{"vals": {"apples": 316, "bananas": 297, "mangoes": 228, "grapes": 293}, "f1": "apples", "f2": "bananas", "op": "total"}'::jsonb, 'A bar graph shows fruits picked in one day:

| Fruit | Amount Picked |
|---|---|
| apples | 316 |
| bananas | 297 |
| mangoes | 228 |
| grapes | 293 |

How many were picked in total between apples and bananas?', '["19", "316", "613", "297"]'::jsonb, '613', '["gave just one fruit''s amount instead of combining both", "gave just the other fruit''s amount instead of combining both", "computed the opposite operation (sum vs. difference)"]'::jsonb, 'apples: 316, bananas: 297. The total is 613.', NULL, '', 30, NULL, 'template-mtap-g2-v1', true),
  ('g2-s6-data_graph_reading-difficult-0001', 2, 6, 'data_graph_reading', 'difficult', '{"vals": {"apples": 61, "bananas": 257, "mangoes": 231}, "total": 657}'::jsonb, 'A bar graph shows fruits picked, with one bar missing:

| Fruit | Amount Picked |
|---|---|
| apples | 61 |
| bananas | 257 |
| mangoes | 231 |
| grapes | ? |

If 657 fruits were picked in total, how many grapes were picked?', '["549", "158", "657", "108"]'::jsonb, '108', '["gave the grand total instead of just the missing bar", "gave the sum of the known bars instead of the missing one", "off by a small amount from the correct missing value"]'::jsonb, 'Known fruits sum to 549. Total is 657, so the missing bar is 657 - 549 = 108.', NULL, '', 60, NULL, 'template-mtap-g2-v1', true),
  ('g2-s6-data_graph_reading-difficult-0002', 2, 6, 'data_graph_reading', 'difficult', '{"vals": {"apples": 223, "bananas": 254, "mangoes": 92}, "total": 743}'::jsonb, 'A bar graph shows fruits picked, with one bar missing:

| Fruit | Amount Picked |
|---|---|
| apples | 223 |
| bananas | 254 |
| mangoes | 92 |
| grapes | ? |

If 743 fruits were picked in total, how many grapes were picked?', '["224", "174", "569", "743"]'::jsonb, '174', '["gave the grand total instead of just the missing bar", "gave the sum of the known bars instead of the missing one", "off by a small amount from the correct missing value"]'::jsonb, 'Known fruits sum to 569. Total is 743, so the missing bar is 743 - 569 = 174.', NULL, '', 60, NULL, 'template-mtap-g2-v1', true),
  ('g2-s6-data_graph_reading-difficult-0003', 2, 6, 'data_graph_reading', 'difficult', '{"vals": {"apples": 134, "bananas": 193, "mangoes": 159}, "total": 772}'::jsonb, 'A bar graph shows fruits picked, with one bar missing:

| Fruit | Amount Picked |
|---|---|
| apples | 134 |
| bananas | 193 |
| mangoes | 159 |
| grapes | ? |

If 772 fruits were picked in total, how many grapes were picked?', '["486", "286", "336", "772"]'::jsonb, '286', '["gave the grand total instead of just the missing bar", "gave the sum of the known bars instead of the missing one", "off by a small amount from the correct missing value"]'::jsonb, 'Known fruits sum to 486. Total is 772, so the missing bar is 772 - 486 = 286.', NULL, '', 60, NULL, 'template-mtap-g2-v1', true),
  ('g2-s6-data_graph_reading-difficult-0004', 2, 6, 'data_graph_reading', 'difficult', '{"vals": {"apples": 97, "bananas": 213, "mangoes": 218}, "total": 799}'::jsonb, 'A bar graph shows fruits picked, with one bar missing:

| Fruit | Amount Picked |
|---|---|
| apples | 97 |
| bananas | 213 |
| mangoes | 218 |
| grapes | ? |

If 799 fruits were picked in total, how many grapes were picked?', '["799", "528", "271", "321"]'::jsonb, '271', '["gave the grand total instead of just the missing bar", "gave the sum of the known bars instead of the missing one", "off by a small amount from the correct missing value"]'::jsonb, 'Known fruits sum to 528. Total is 799, so the missing bar is 799 - 528 = 271.', NULL, '', 60, NULL, 'template-mtap-g2-v1', true),
  ('g2-s6-data_graph_reading-difficult-0005', 2, 6, 'data_graph_reading', 'difficult', '{"vals": {"apples": 165, "bananas": 201, "mangoes": 159}, "total": 774}'::jsonb, 'A bar graph shows fruits picked, with one bar missing:

| Fruit | Amount Picked |
|---|---|
| apples | 165 |
| bananas | 201 |
| mangoes | 159 |
| grapes | ? |

If 774 fruits were picked in total, how many grapes were picked?', '["774", "299", "525", "249"]'::jsonb, '249', '["gave the grand total instead of just the missing bar", "gave the sum of the known bars instead of the missing one", "off by a small amount from the correct missing value"]'::jsonb, 'Known fruits sum to 525. Total is 774, so the missing bar is 774 - 525 = 249.', NULL, '', 60, NULL, 'template-mtap-g2-v1', true),
  ('g2-s6-data_graph_reading-difficult-0006', 2, 6, 'data_graph_reading', 'difficult', '{"vals": {"apples": 102, "bananas": 121, "mangoes": 242}, "total": 547}'::jsonb, 'A bar graph shows fruits picked, with one bar missing:

| Fruit | Amount Picked |
|---|---|
| apples | 102 |
| bananas | 121 |
| mangoes | 242 |
| grapes | ? |

If 547 fruits were picked in total, how many grapes were picked?', '["547", "132", "465", "82"]'::jsonb, '82', '["gave the grand total instead of just the missing bar", "gave the sum of the known bars instead of the missing one", "off by a small amount from the correct missing value"]'::jsonb, 'Known fruits sum to 465. Total is 547, so the missing bar is 547 - 465 = 82.', NULL, '', 60, NULL, 'template-mtap-g2-v1', true),
  ('g2-s6-data_graph_reading-difficult-0007', 2, 6, 'data_graph_reading', 'difficult', '{"vals": {"apples": 143, "bananas": 133, "mangoes": 100}, "total": 660}'::jsonb, 'A bar graph shows fruits picked, with one bar missing:

| Fruit | Amount Picked |
|---|---|
| apples | 143 |
| bananas | 133 |
| mangoes | 100 |
| grapes | ? |

If 660 fruits were picked in total, how many grapes were picked?', '["334", "376", "660", "284"]'::jsonb, '284', '["gave the grand total instead of just the missing bar", "gave the sum of the known bars instead of the missing one", "off by a small amount from the correct missing value"]'::jsonb, 'Known fruits sum to 376. Total is 660, so the missing bar is 660 - 376 = 284.', NULL, '', 60, NULL, 'template-mtap-g2-v1', true),
  ('g2-s6-data_graph_reading-difficult-0008', 2, 6, 'data_graph_reading', 'difficult', '{"vals": {"apples": 185, "bananas": 297, "mangoes": 213}, "total": 905}'::jsonb, 'A bar graph shows fruits picked, with one bar missing:

| Fruit | Amount Picked |
|---|---|
| apples | 185 |
| bananas | 297 |
| mangoes | 213 |
| grapes | ? |

If 905 fruits were picked in total, how many grapes were picked?', '["210", "905", "695", "260"]'::jsonb, '210', '["gave the grand total instead of just the missing bar", "gave the sum of the known bars instead of the missing one", "off by a small amount from the correct missing value"]'::jsonb, 'Known fruits sum to 695. Total is 905, so the missing bar is 905 - 695 = 210.', NULL, '', 60, NULL, 'template-mtap-g2-v1', true),
  ('g2-s7-coin_problems-easy-0001', 2, 7, 'coin_problems', 'easy', '{"denom": 10, "count": 19}'::jsonb, 'Marco has 19 10-peso coins. How much money does he have in all?', '["190", "200", "10", "29"]'::jsonb, '190', '["added the coin value and the count instead of multiplying", "gave the coin''s value instead of the total", "counted one extra coin''s worth"]'::jsonb, '19 coins x 10 pesos each = 190 pesos.', NULL, '', 15, NULL, 'template-mtap-g2-v1', true),
  ('g2-s7-coin_problems-easy-0002', 2, 7, 'coin_problems', 'easy', '{"denom": 5, "count": 15}'::jsonb, 'Marco has 15 5-peso coins. How much money does he have in all?', '["5", "20", "80", "75"]'::jsonb, '75', '["added the coin value and the count instead of multiplying", "gave the coin''s value instead of the total", "counted one extra coin''s worth"]'::jsonb, '15 coins x 5 pesos each = 75 pesos.', NULL, '', 15, NULL, 'template-mtap-g2-v1', true),
  ('g2-s7-coin_problems-easy-0003', 2, 7, 'coin_problems', 'easy', '{"denom": 10, "count": 27}'::jsonb, 'Marco has 27 10-peso coins. How much money does he have in all?', '["270", "280", "10", "37"]'::jsonb, '270', '["added the coin value and the count instead of multiplying", "gave the coin''s value instead of the total", "counted one extra coin''s worth"]'::jsonb, '27 coins x 10 pesos each = 270 pesos.', NULL, '', 15, NULL, 'template-mtap-g2-v1', true),
  ('g2-s7-coin_problems-easy-0004', 2, 7, 'coin_problems', 'easy', '{"denom": 20, "count": 24}'::jsonb, 'Marco has 24 20-peso coins. How much money does he have in all?', '["480", "500", "20", "44"]'::jsonb, '480', '["added the coin value and the count instead of multiplying", "gave the coin''s value instead of the total", "counted one extra coin''s worth"]'::jsonb, '24 coins x 20 pesos each = 480 pesos.', NULL, '', 15, NULL, 'template-mtap-g2-v1', true),
  ('g2-s7-coin_problems-easy-0005', 2, 7, 'coin_problems', 'easy', '{"denom": 20, "count": 10}'::jsonb, 'Marco has 10 20-peso coins. How much money does he have in all?', '["30", "200", "20", "220"]'::jsonb, '200', '["added the coin value and the count instead of multiplying", "gave the coin''s value instead of the total", "counted one extra coin''s worth"]'::jsonb, '10 coins x 20 pesos each = 200 pesos.', NULL, '', 15, NULL, 'template-mtap-g2-v1', true),
  ('g2-s7-coin_problems-easy-0006', 2, 7, 'coin_problems', 'easy', '{"denom": 5, "count": 20}'::jsonb, 'Marco has 20 5-peso coins. How much money does he have in all?', '["25", "105", "100", "5"]'::jsonb, '100', '["added the coin value and the count instead of multiplying", "gave the coin''s value instead of the total", "counted one extra coin''s worth"]'::jsonb, '20 coins x 5 pesos each = 100 pesos.', NULL, '', 15, NULL, 'template-mtap-g2-v1', true),
  ('g2-s7-coin_problems-easy-0007', 2, 7, 'coin_problems', 'easy', '{"denom": 5, "count": 11}'::jsonb, 'Marco has 11 5-peso coins. How much money does he have in all?', '["55", "16", "5", "60"]'::jsonb, '55', '["added the coin value and the count instead of multiplying", "gave the coin''s value instead of the total", "counted one extra coin''s worth"]'::jsonb, '11 coins x 5 pesos each = 55 pesos.', NULL, '', 15, NULL, 'template-mtap-g2-v1', true),
  ('g2-s7-coin_problems-easy-0008', 2, 7, 'coin_problems', 'easy', '{"denom": 20, "count": 26}'::jsonb, 'Marco has 26 20-peso coins. How much money does he have in all?', '["520", "20", "46", "540"]'::jsonb, '520', '["added the coin value and the count instead of multiplying", "gave the coin''s value instead of the total", "counted one extra coin''s worth"]'::jsonb, '26 coins x 20 pesos each = 520 pesos.', NULL, '', 15, NULL, 'template-mtap-g2-v1', true),
  ('g2-s7-coin_problems-average-0001', 2, 7, 'coin_problems', 'average', '{"total_bill": 1000, "d1_val": 10, "d2_val": 5}'::jsonb, 'Isa changed half of a 1000-peso bill into 10-peso coins and the other half into 5-peso coins. How many 10-peso coins did she get?', '["100", "500", "150", "50"]'::jsonb, '50', '["gave the count of the other denomination instead", "added both denominations'' counts together", "gave the peso amount instead of a coin count"]'::jsonb, 'Half of 1000 is 500 pesos. 500 / 10 = 50 10-peso coins.', NULL, '', 30, NULL, 'template-mtap-g2-v1', true),
  ('g2-s7-coin_problems-average-0002', 2, 7, 'coin_problems', 'average', '{"total_bill": 200, "d1_val": 20, "d2_val": 5}'::jsonb, 'Isa changed half of a 200-peso bill into 20-peso coins and the other half into 5-peso coins. How many 20-peso coins did she get?', '["25", "100", "20", "5"]'::jsonb, '5', '["gave the count of the other denomination instead", "added both denominations'' counts together", "gave the peso amount instead of a coin count"]'::jsonb, 'Half of 200 is 100 pesos. 100 / 20 = 5 20-peso coins.', NULL, '', 30, NULL, 'template-mtap-g2-v1', true)
ON CONFLICT (question_code) DO NOTHING;
