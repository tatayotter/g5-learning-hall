-- Week 12 (2026-08-31) main quest content for grades 2-6
-- Generated from BOW Wk11 topics
-- Apply as a migration: supabase/migrations/20260825100000_week12_content.sql

-- Grade 2 Week 12 (2026-08-31)
DO $g2$ DECLARE
  wid uuid;
  d_mon_engl_day uuid;
  d_mon_engl_quiz uuid;
  d_mon_math_day uuid;
  d_mon_math_quiz uuid;
  d_tue_fili_day uuid;
  d_tue_fili_quiz uuid;
  d_wed_comp_day uuid;
  d_wed_comp_quiz uuid;
  d_wed_maka_day uuid;
  d_wed_maka_quiz uuid;
  d_thu_gmrc_day uuid;
  d_thu_gmrc_quiz uuid;
  d_fri_comp_day uuid;
  d_fri_comp_quiz uuid;
  d_fri_engl_day uuid;
  d_fri_engl_quiz uuid;
  d_fri_fili_day uuid;
  d_fri_fili_quiz uuid;
  d_fri_gmrc_day uuid;
  d_fri_gmrc_quiz uuid;
  d_fri_maka_day uuid;
  d_fri_maka_quiz uuid;
  d_fri_math_day uuid;
  d_fri_math_quiz uuid;
BEGIN
  INSERT INTO content_weeks (grade, week_starting_date)
    VALUES (2, '2026-08-31') RETURNING id INTO wid;

  -- Monday
  INSERT INTO content_days (content_week_id, weekday)
    VALUES (wid, 'Monday') RETURNING id INTO d_mon_engl_day;
  INSERT INTO content_quizzes (content_day_id, subject)
    VALUES (d_mon_engl_day, 'English') RETURNING id INTO d_mon_engl_quiz;
  INSERT INTO content_questions (content_quiz_id, prompt, options, correct_answer, sort_order) VALUES
    (d_mon_engl_quiz, 'Which word BEST describes the feeling in the story when the family reunites?', '["Joyful", "Frightened", "Lonely", "Bored"]', 'Joyful', 0),
    (d_mon_engl_quiz, 'A story''s ___ is where and when the events happen.', '["setting", "plot", "character", "theme"]', 'setting', 1),
    (d_mon_engl_quiz, 'Which word is a NOUN?', '["Book", "Run", "Happy", "Quickly"]', 'Book', 2),
    (d_mon_engl_quiz, 'Which sentence uses a PERIOD correctly?', '["She runs fast.", "She runs fast?", "She runs fast!", "she runs fast."]', 'She runs fast.', 3),
    (d_mon_engl_quiz, 'What is the MAIN IDEA of a story about a boy who plants and waters a seed until it grows?', '["Plants need care to grow.", "Boys like to dig.", "Seeds are tiny.", "Water is wet."]', 'Plants need care to grow.', 4),
    (d_mon_engl_quiz, 'Which two words RHYME?', '["cat / cut", "sun / fun", "dog / dig", "bag / bug"]', 'sun / fun', 5),
    (d_mon_engl_quiz, 'In the sentence ''The dog is big,'' which word is an ADJECTIVE?', '["The", "dog", "is", "big"]', 'big', 6),
    (d_mon_engl_quiz, 'Which punctuation mark ends a QUESTION?', '["Period (.)", "Question mark (?)", "Comma (,)", "Exclamation mark (!)"]', 'Question mark (?)', 7),
    (d_mon_engl_quiz, '''She eats an apple every day.'' The word ''eats'' tells the ___.', '["action", "place", "thing", "feeling"]', 'action', 8),
    (d_mon_engl_quiz, 'Which word BEGINS with a vowel sound?', '["Sun", "Apple", "Ball", "Cat"]', 'Apple', 9),
    (d_mon_engl_quiz, '''My mother cooks delicious food.'' Which word is an ADJECTIVE?', '["My", "mother", "cooks", "delicious"]', 'delicious', 10),
    (d_mon_engl_quiz, 'Choose the CORRECT sentence.', '["The boy play outside.", "The boys plays outside.", "The boy plays outside.", "The boy playing outside."]', 'The boy plays outside.', 11);

  -- Monday / Mathematics
  d_mon_math_day := d_mon_engl_day;
  INSERT INTO content_quizzes (content_day_id, subject)
    VALUES (d_mon_math_day, 'Mathematics') RETURNING id INTO d_mon_math_quiz;
  INSERT INTO content_questions (content_quiz_id, prompt, options, correct_answer, sort_order) VALUES
    (d_mon_math_quiz, 'What unit do we use to measure the length of a classroom?', '["Centimeters (cm)", "Meters (m)", "Kilograms (kg)", "Liters (L)"]', 'Meters (m)', 0),
    (d_mon_math_quiz, 'A pencil is 14 ___ long.', '["meters", "centimeters", "kilograms", "liters"]', 'centimeters', 1),
    (d_mon_math_quiz, 'Which tool is best for measuring the length of a room?', '["Ruler", "Meter stick", "Weighing scale", "Measuring cup"]', 'Meter stick', 2),
    (d_mon_math_quiz, 'Anna''s ribbon is 50 cm. Ben''s ribbon is 80 cm. Whose ribbon is longer?', '["Anna''s", "Ben''s", "They are equal", "Cannot tell"]', 'Ben''s', 3),
    (d_mon_math_quiz, '1 meter = ___ centimeters.', '["10", "100", "1000", "1"]', '100', 4),
    (d_mon_math_quiz, 'About how long is a door? Choose the best estimate.', '["2 meters", "2 centimeters", "20 meters", "20 centimeters"]', '2 meters', 5),
    (d_mon_math_quiz, 'A garden path is 5 meters long. How many centimeters is that?', '["50 cm", "500 cm", "5 cm", "5000 cm"]', '500 cm', 6),
    (d_mon_math_quiz, 'Which is the SHORTEST?', '["A bus (about 10 m)", "A pencil (about 15 cm)", "A door (about 2 m)", "A table (about 80 cm)"]', 'A pencil (about 15 cm)', 7),
    (d_mon_math_quiz, 'Measure and compare: Rope A = 3 m, Rope B = 250 cm. Which is longer?', '["Rope A", "Rope B", "They are equal", "Cannot tell"]', 'Rope B', 8),
    (d_mon_math_quiz, 'A book is 25 cm wide. Estimate: about how many books can fit in 1 meter side by side?', '["2", "4", "10", "20"]', '4', 9),
    (d_mon_math_quiz, 'Maria walked 300 cm. Jose walked 4 meters. Who walked farther?', '["Maria", "Jose", "They walked the same", "Cannot tell"]', 'Jose', 10),
    (d_mon_math_quiz, 'Which is a reasonable length for a Grade 2 pupil''s height?', '["1 cm", "100 cm", "10 m", "10 cm"]', '100 cm', 11);

  -- Tuesday
  INSERT INTO content_days (content_week_id, weekday)
    VALUES (wid, 'Tuesday') RETURNING id INTO d_tue_fili_day;
  INSERT INTO content_quizzes (content_day_id, subject)
    VALUES (d_tue_fili_day, 'Filipino') RETURNING id INTO d_tue_fili_quiz;
  INSERT INTO content_questions (content_quiz_id, prompt, options, correct_answer, sort_order) VALUES
    (d_tue_fili_quiz, 'Ang salitang ''maganda'' ay isang ___.', '["pangngalan", "pang-uri", "pandiwa", "pang-abay"]', 'pang-uri', 0),
    (d_tue_fili_quiz, 'Alin ang tamang pagkakasunod-sunod ng pangungusap?', '["Ako ay mag-aaral ng mabuti.", "Mag-aaral mabuti ng ako ay.", "Ng mabuti mag-aaral ako.", "Mabuti ako ng mag-aaral ay."]', 'Ako ay mag-aaral ng mabuti.', 1),
    (d_tue_fili_quiz, 'Ano ang ibig sabihin ng ''tahimik''?', '["Maingay", "Walang ingay", "Masaya", "Malungkot"]', 'Walang ingay', 2),
    (d_tue_fili_quiz, '''Ang pusa ay umaakyat ng puno.'' Sino ang gumaganap ng kilos?', '["puno", "umaakyat", "pusa", "ng"]', 'pusa', 3),
    (d_tue_fili_quiz, 'Alin ang PANGNGALAN?', '["Tumakbo", "Maganda", "Bahay", "Mabilis"]', 'Bahay', 4),
    (d_tue_fili_quiz, 'Piliin ang tamang pantuwid sa puwang: ''Kumain ___ ng mansanas ang bata.''', '["si", "ng", "sa", "ang"]', 'ng', 5),
    (d_tue_fili_quiz, '''Masaya ang mga bata sa paaralan.'' Ilang salita ang nasa pangungusap na ito?', '["4", "5", "6", "7"]', '6', 6),
    (d_tue_fili_quiz, 'Alin ang PANDIWA?', '["Bata", "Maganda", "Tumawa", "Paaralan"]', 'Tumawa', 7),
    (d_tue_fili_quiz, 'Ano ang kabaligtaran ng ''mainit''?', '["Malamig", "Malinis", "Matamis", "Malakas"]', 'Malamig', 8),
    (d_tue_fili_quiz, 'Piliin ang tamang pangungusap:', '["Kumakain ng tinapay ang nanay.", "Ang nanay kumakain tinapay.", "Tinapay kumakain ang nanay ng.", "Kumakain ang ng tinapay nanay."]', 'Kumakain ng tinapay ang nanay.', 9),
    (d_tue_fili_quiz, 'Ang salitang ''mabilis'' ay isang ___.', '["pangngalan", "pang-uri", "pandiwa", "pang-abay"]', 'pang-abay', 10),
    (d_tue_fili_quiz, '''Sumulat ng liham ang guro.'' Ano ang ginawa ng guro?', '["Nagbasa", "Sumulat", "Nagturo", "Tumakbo"]', 'Sumulat', 11);

  -- Wednesday
  INSERT INTO content_days (content_week_id, weekday)
    VALUES (wid, 'Wednesday') RETURNING id INTO d_wed_comp_day;
  INSERT INTO content_quizzes (content_day_id, subject)
    VALUES (d_wed_comp_day, 'Computer') RETURNING id INTO d_wed_comp_quiz;
  INSERT INTO content_questions (content_quiz_id, prompt, options, correct_answer, sort_order) VALUES
    (d_wed_comp_quiz, 'Which key do you press to start a new line when typing?', '["Shift", "Enter/Return", "Backspace", "Spacebar"]', 'Enter/Return', 0),
    (d_wed_comp_quiz, 'Where are the letters A, B, and C found on the keyboard?', '["Number row", "Letter row", "Function row", "Arrow keys"]', 'Letter row', 1),
    (d_wed_comp_quiz, 'What does the SPACEBAR do?', '["Makes capital letters", "Adds a space between words", "Deletes a letter", "Moves to a new line"]', 'Adds a space between words', 2),
    (d_wed_comp_quiz, 'Which key makes a small letter into a CAPITAL letter?', '["Enter", "Backspace", "Shift", "Spacebar"]', 'Shift', 3),
    (d_wed_comp_quiz, 'Which key removes a letter you typed by mistake?', '["Enter", "Spacebar", "Shift", "Backspace"]', 'Backspace', 4),
    (d_wed_comp_quiz, 'On a keyboard, the numbers 0-9 are found in the ___.', '["letter row", "number row", "bottom row", "arrow keys"]', 'number row', 5),
    (d_wed_comp_quiz, 'When you type your name, which key do you use between your first and last name?', '["Enter", "Shift", "Spacebar", "Backspace"]', 'Spacebar', 6),
    (d_wed_comp_quiz, 'To type a capital ''A'', you press ___ and then the ''A'' key.', '["Enter", "Backspace", "Shift", "Spacebar"]', 'Shift', 7),
    (d_wed_comp_quiz, 'Which part of the keyboard is the LONGEST key?', '["Enter", "Shift", "Backspace", "Spacebar"]', 'Spacebar', 8),
    (d_wed_comp_quiz, 'What should you do BEFORE touching the keyboard?', '["Eat a snack", "Wash your hands", "Drink water", "Sleep first"]', 'Wash your hands', 9),
    (d_wed_comp_quiz, 'On a keyboard, where is the letter ''A'' usually found?', '["Top row", "Middle row (home row)", "Bottom row", "Number row"]', 'Middle row (home row)', 10),
    (d_wed_comp_quiz, 'If you press Backspace many times, what will happen?', '["More letters appear", "Letters are deleted one by one", "The screen turns off", "A new line is made"]', 'Letters are deleted one by one', 11);

  -- Wednesday / Makabansa
  d_wed_maka_day := d_wed_comp_day;
  INSERT INTO content_quizzes (content_day_id, subject)
    VALUES (d_wed_maka_day, 'Makabansa') RETURNING id INTO d_wed_maka_quiz;
  INSERT INTO content_questions (content_quiz_id, prompt, options, correct_answer, sort_order) VALUES
    (d_wed_maka_quiz, 'Ano ang ibig sabihin ng ''kultura''?', '["Uri ng damit lamang", "Paraan ng pamumuhay, paniniwala, at kaugalian ng isang grupo", "Pangalan ng isang bansa", "Uri ng pagkain"]', 'Paraan ng pamumuhay, paniniwala, at kaugalian ng isang grupo', 0),
    (d_wed_maka_quiz, 'Ang kultura ay ipinapasa mula sa ___.', '["mga bata patungong matatanda", "mga matatanda patungong mga bata", "mga guro patungong mga mag-aaral", "mga tindero patungong mga mamimili"]', 'mga matatanda patungong mga bata', 1),
    (d_wed_maka_quiz, 'Alin ang HALIMBAWA ng kultura?', '["Motorsiklo", "Kaugalian ng pagbabati ng kamay", "Sasakyan", "Eroplano"]', 'Kaugalian ng pagbabati ng kamay', 2),
    (d_wed_maka_quiz, 'Bakit mahalaga ang kultura sa isang komunidad?', '["Nagbibigay ito ng pagkakakilanlan sa isang grupo", "Hindi ito mahalaga", "Para lang sa mga matatanda", "Para sa mga dayuhan lamang"]', 'Nagbibigay ito ng pagkakakilanlan sa isang grupo', 3),
    (d_wed_maka_quiz, 'Ang pagkain ng suman at kakanin ay halimbawa ng ___.', '["materyal na kultura", "di-materyal na kultura", "tradisyon", "laruan"]', 'materyal na kultura', 4),
    (d_wed_maka_quiz, 'Ang kanta at sayaw ng isang tribu ay halimbawa ng ___.', '["materyal na kultura", "di-materyal na kultura", "kalakal", "industriya"]', 'di-materyal na kultura', 5),
    (d_wed_maka_quiz, 'Ang kulturang Pilipino ay ___ sa iba''t ibang komunidad.', '["magkapareho", "magkakaiba-iba", "hindi mahalaga", "para lamang sa Manila"]', 'magkakaiba-iba', 6),
    (d_wed_maka_quiz, 'Alin ang HINDI kasama sa kultura?', '["Kaugalian", "Paniniwala", "Paraan ng pamumuhay", "Temperatura ng hangin"]', 'Temperatura ng hangin', 7),
    (d_wed_maka_quiz, 'Ang kultura ay ___ mula henerasyon hanggang henerasyon.', '["naubos", "naipapalit", "naipapalipat", "nasisira"]', 'naipapalipat', 8),
    (d_wed_maka_quiz, 'Ang pagbibigay ng mano sa matatanda ay halimbawa ng ___ na kultura.', '["materyal", "pisikal", "di-materyal", "modernong"]', 'di-materyal', 9),
    (d_wed_maka_quiz, 'Ang iba''t ibang lugar sa Pilipinas ay may ___ kultura.', '["iisang", "magkakatulad", "kanya-kanyang", "walang"]', 'kanya-kanyang', 10),
    (d_wed_maka_quiz, 'Ang kultura ay ginagawang ___ ng isang komunidad.', '["walang pagkakaisa", "magkaka-iba ang lahat", "may pagkakakilanlan at nagkakaisa", "palaging nagbabago nang walang patakaran"]', 'may pagkakakilanlan at nagkakaisa', 11);

  -- Thursday
  INSERT INTO content_days (content_week_id, weekday)
    VALUES (wid, 'Thursday') RETURNING id INTO d_thu_gmrc_day;
  INSERT INTO content_quizzes (content_day_id, subject)
    VALUES (d_thu_gmrc_day, 'GMRC') RETURNING id INTO d_thu_gmrc_quiz;
  INSERT INTO content_questions (content_quiz_id, prompt, options, correct_answer, sort_order) VALUES
    (d_thu_gmrc_quiz, 'A good citizen follows community ___ to help everyone live peacefully.', '["rules", "games", "parties", "trips"]', 'rules', 0),
    (d_thu_gmrc_quiz, 'Why should children follow the barangay curfew?', '["For their safety and to follow community rules", "Because it is fun", "To avoid doing homework", "Because adults do not like children outside"]', 'For their safety and to follow community rules', 1),
    (d_thu_gmrc_quiz, 'What is OBEDIENCE?', '["Doing what you want all the time", "Following the rules and instructions of those in authority", "Playing games all day", "Ignoring your parents"]', 'Following the rules and instructions of those in authority', 2),
    (d_thu_gmrc_quiz, 'Maria always throws trash in the trash bin. She is showing ___.', '["disobedience", "responsibility to community rules", "laziness", "selfishness"]', 'responsibility to community rules', 3),
    (d_thu_gmrc_quiz, 'As a child, it is your DUTY at school to ___.', '["play all day", "listen to your teacher and study well", "eat during class", "sleep in class"]', 'listen to your teacher and study well', 4),
    (d_thu_gmrc_quiz, 'Ben helps clean the street in his barangay. He is fulfilling his ___ as a community member.', '["right", "duty/responsibility", "wish", "desire"]', 'duty/responsibility', 5),
    (d_thu_gmrc_quiz, 'Which action shows OBEDIENCE to parents?', '["Ignoring what they say", "Coming home on time", "Arguing about rules", "Sneaking out without permission"]', 'Coming home on time', 6),
    (d_thu_gmrc_quiz, 'Why is it important for children to follow rules at home?', '["To make their parents angry", "To keep the family safe and orderly", "Because rules are always unfair", "To avoid helping with chores"]', 'To keep the family safe and orderly', 7),
    (d_thu_gmrc_quiz, 'Ana puts her toys away after playing. She is showing ___.', '["disobedience", "irresponsibility", "obedience and responsibility", "laziness"]', 'obedience and responsibility', 8),
    (d_thu_gmrc_quiz, 'What should you do when the garbage collection comes to your barangay?', '["Ignore it", "Throw garbage on the street", "Bring out your properly sorted trash", "Wait until next week"]', 'Bring out your properly sorted trash', 9),
    (d_thu_gmrc_quiz, 'A child who is obedient at school will likely ___.', '["get in trouble often", "learn more and be respected", "be ignored by teachers", "play more than study"]', 'learn more and be respected', 10),
    (d_thu_gmrc_quiz, 'Who among these is showing the BEST example of community duty?', '["A boy who litters in the park", "A girl who joins barangay clean-up day", "A child who runs away from community activities", "A student who skips flag ceremony"]', 'A girl who joins barangay clean-up day', 11);

  -- Friday
  INSERT INTO content_days (content_week_id, weekday)
    VALUES (wid, 'Friday') RETURNING id INTO d_fri_comp_day;
  INSERT INTO content_quizzes (content_day_id, subject)
    VALUES (d_fri_comp_day, 'Computer') RETURNING id INTO d_fri_comp_quiz;
  INSERT INTO content_questions (content_quiz_id, prompt, options, correct_answer, sort_order) VALUES
    (d_fri_comp_quiz, 'Which key do you press to start a new line when typing?', '["Shift", "Enter/Return", "Backspace", "Spacebar"]', 'Enter/Return', 0),
    (d_fri_comp_quiz, 'Where are the letters A, B, and C found on the keyboard?', '["Number row", "Letter row", "Function row", "Arrow keys"]', 'Letter row', 1),
    (d_fri_comp_quiz, 'What does the SPACEBAR do?', '["Makes capital letters", "Adds a space between words", "Deletes a letter", "Moves to a new line"]', 'Adds a space between words', 2),
    (d_fri_comp_quiz, 'Which key makes a small letter into a CAPITAL letter?', '["Enter", "Backspace", "Shift", "Spacebar"]', 'Shift', 3),
    (d_fri_comp_quiz, 'Which key removes a letter you typed by mistake?', '["Enter", "Spacebar", "Shift", "Backspace"]', 'Backspace', 4),
    (d_fri_comp_quiz, 'On a keyboard, the numbers 0-9 are found in the ___.', '["letter row", "number row", "bottom row", "arrow keys"]', 'number row', 5),
    (d_fri_comp_quiz, 'When you type your name, which key do you use between your first and last name?', '["Enter", "Shift", "Spacebar", "Backspace"]', 'Spacebar', 6),
    (d_fri_comp_quiz, 'To type a capital ''A'', you press ___ and then the ''A'' key.', '["Enter", "Backspace", "Shift", "Spacebar"]', 'Shift', 7),
    (d_fri_comp_quiz, 'Which part of the keyboard is the LONGEST key?', '["Enter", "Shift", "Backspace", "Spacebar"]', 'Spacebar', 8),
    (d_fri_comp_quiz, 'What should you do BEFORE touching the keyboard?', '["Eat a snack", "Wash your hands", "Drink water", "Sleep first"]', 'Wash your hands', 9),
    (d_fri_comp_quiz, 'On a keyboard, where is the letter ''A'' usually found?', '["Top row", "Middle row (home row)", "Bottom row", "Number row"]', 'Middle row (home row)', 10),
    (d_fri_comp_quiz, 'If you press Backspace many times, what will happen?', '["More letters appear", "Letters are deleted one by one", "The screen turns off", "A new line is made"]', 'Letters are deleted one by one', 11);

  -- Friday / English
  d_fri_engl_day := d_fri_comp_day;
  INSERT INTO content_quizzes (content_day_id, subject)
    VALUES (d_fri_engl_day, 'English') RETURNING id INTO d_fri_engl_quiz;
  INSERT INTO content_questions (content_quiz_id, prompt, options, correct_answer, sort_order) VALUES
    (d_fri_engl_quiz, 'Which word BEST describes the feeling in the story when the family reunites?', '["Joyful", "Frightened", "Lonely", "Bored"]', 'Joyful', 0),
    (d_fri_engl_quiz, 'A story''s ___ is where and when the events happen.', '["setting", "plot", "character", "theme"]', 'setting', 1),
    (d_fri_engl_quiz, 'Which word is a NOUN?', '["Book", "Run", "Happy", "Quickly"]', 'Book', 2),
    (d_fri_engl_quiz, 'Which sentence uses a PERIOD correctly?', '["She runs fast.", "She runs fast?", "She runs fast!", "she runs fast."]', 'She runs fast.', 3),
    (d_fri_engl_quiz, 'What is the MAIN IDEA of a story about a boy who plants and waters a seed until it grows?', '["Plants need care to grow.", "Boys like to dig.", "Seeds are tiny.", "Water is wet."]', 'Plants need care to grow.', 4),
    (d_fri_engl_quiz, 'Which two words RHYME?', '["cat / cut", "sun / fun", "dog / dig", "bag / bug"]', 'sun / fun', 5),
    (d_fri_engl_quiz, 'In the sentence ''The dog is big,'' which word is an ADJECTIVE?', '["The", "dog", "is", "big"]', 'big', 6),
    (d_fri_engl_quiz, 'Which punctuation mark ends a QUESTION?', '["Period (.)", "Question mark (?)", "Comma (,)", "Exclamation mark (!)"]', 'Question mark (?)', 7),
    (d_fri_engl_quiz, '''She eats an apple every day.'' The word ''eats'' tells the ___.', '["action", "place", "thing", "feeling"]', 'action', 8),
    (d_fri_engl_quiz, 'Which word BEGINS with a vowel sound?', '["Sun", "Apple", "Ball", "Cat"]', 'Apple', 9),
    (d_fri_engl_quiz, '''My mother cooks delicious food.'' Which word is an ADJECTIVE?', '["My", "mother", "cooks", "delicious"]', 'delicious', 10),
    (d_fri_engl_quiz, 'Choose the CORRECT sentence.', '["The boy play outside.", "The boys plays outside.", "The boy plays outside.", "The boy playing outside."]', 'The boy plays outside.', 11);

  -- Friday / Filipino
  d_fri_fili_day := d_fri_comp_day;
  INSERT INTO content_quizzes (content_day_id, subject)
    VALUES (d_fri_fili_day, 'Filipino') RETURNING id INTO d_fri_fili_quiz;
  INSERT INTO content_questions (content_quiz_id, prompt, options, correct_answer, sort_order) VALUES
    (d_fri_fili_quiz, 'Ang salitang ''maganda'' ay isang ___.', '["pangngalan", "pang-uri", "pandiwa", "pang-abay"]', 'pang-uri', 0),
    (d_fri_fili_quiz, 'Alin ang tamang pagkakasunod-sunod ng pangungusap?', '["Ako ay mag-aaral ng mabuti.", "Mag-aaral mabuti ng ako ay.", "Ng mabuti mag-aaral ako.", "Mabuti ako ng mag-aaral ay."]', 'Ako ay mag-aaral ng mabuti.', 1),
    (d_fri_fili_quiz, 'Ano ang ibig sabihin ng ''tahimik''?', '["Maingay", "Walang ingay", "Masaya", "Malungkot"]', 'Walang ingay', 2),
    (d_fri_fili_quiz, '''Ang pusa ay umaakyat ng puno.'' Sino ang gumaganap ng kilos?', '["puno", "umaakyat", "pusa", "ng"]', 'pusa', 3),
    (d_fri_fili_quiz, 'Alin ang PANGNGALAN?', '["Tumakbo", "Maganda", "Bahay", "Mabilis"]', 'Bahay', 4),
    (d_fri_fili_quiz, 'Piliin ang tamang pantuwid sa puwang: ''Kumain ___ ng mansanas ang bata.''', '["si", "ng", "sa", "ang"]', 'ng', 5),
    (d_fri_fili_quiz, '''Masaya ang mga bata sa paaralan.'' Ilang salita ang nasa pangungusap na ito?', '["4", "5", "6", "7"]', '6', 6),
    (d_fri_fili_quiz, 'Alin ang PANDIWA?', '["Bata", "Maganda", "Tumawa", "Paaralan"]', 'Tumawa', 7),
    (d_fri_fili_quiz, 'Ano ang kabaligtaran ng ''mainit''?', '["Malamig", "Malinis", "Matamis", "Malakas"]', 'Malamig', 8),
    (d_fri_fili_quiz, 'Piliin ang tamang pangungusap:', '["Kumakain ng tinapay ang nanay.", "Ang nanay kumakain tinapay.", "Tinapay kumakain ang nanay ng.", "Kumakain ang ng tinapay nanay."]', 'Kumakain ng tinapay ang nanay.', 9),
    (d_fri_fili_quiz, 'Ang salitang ''mabilis'' ay isang ___.', '["pangngalan", "pang-uri", "pandiwa", "pang-abay"]', 'pang-abay', 10),
    (d_fri_fili_quiz, '''Sumulat ng liham ang guro.'' Ano ang ginawa ng guro?', '["Nagbasa", "Sumulat", "Nagturo", "Tumakbo"]', 'Sumulat', 11);

  -- Friday / GMRC
  d_fri_gmrc_day := d_fri_comp_day;
  INSERT INTO content_quizzes (content_day_id, subject)
    VALUES (d_fri_gmrc_day, 'GMRC') RETURNING id INTO d_fri_gmrc_quiz;
  INSERT INTO content_questions (content_quiz_id, prompt, options, correct_answer, sort_order) VALUES
    (d_fri_gmrc_quiz, 'A good citizen follows community ___ to help everyone live peacefully.', '["rules", "games", "parties", "trips"]', 'rules', 0),
    (d_fri_gmrc_quiz, 'Why should children follow the barangay curfew?', '["For their safety and to follow community rules", "Because it is fun", "To avoid doing homework", "Because adults do not like children outside"]', 'For their safety and to follow community rules', 1),
    (d_fri_gmrc_quiz, 'What is OBEDIENCE?', '["Doing what you want all the time", "Following the rules and instructions of those in authority", "Playing games all day", "Ignoring your parents"]', 'Following the rules and instructions of those in authority', 2),
    (d_fri_gmrc_quiz, 'Maria always throws trash in the trash bin. She is showing ___.', '["disobedience", "responsibility to community rules", "laziness", "selfishness"]', 'responsibility to community rules', 3),
    (d_fri_gmrc_quiz, 'As a child, it is your DUTY at school to ___.', '["play all day", "listen to your teacher and study well", "eat during class", "sleep in class"]', 'listen to your teacher and study well', 4),
    (d_fri_gmrc_quiz, 'Ben helps clean the street in his barangay. He is fulfilling his ___ as a community member.', '["right", "duty/responsibility", "wish", "desire"]', 'duty/responsibility', 5),
    (d_fri_gmrc_quiz, 'Which action shows OBEDIENCE to parents?', '["Ignoring what they say", "Coming home on time", "Arguing about rules", "Sneaking out without permission"]', 'Coming home on time', 6),
    (d_fri_gmrc_quiz, 'Why is it important for children to follow rules at home?', '["To make their parents angry", "To keep the family safe and orderly", "Because rules are always unfair", "To avoid helping with chores"]', 'To keep the family safe and orderly', 7),
    (d_fri_gmrc_quiz, 'Ana puts her toys away after playing. She is showing ___.', '["disobedience", "irresponsibility", "obedience and responsibility", "laziness"]', 'obedience and responsibility', 8),
    (d_fri_gmrc_quiz, 'What should you do when the garbage collection comes to your barangay?', '["Ignore it", "Throw garbage on the street", "Bring out your properly sorted trash", "Wait until next week"]', 'Bring out your properly sorted trash', 9),
    (d_fri_gmrc_quiz, 'A child who is obedient at school will likely ___.', '["get in trouble often", "learn more and be respected", "be ignored by teachers", "play more than study"]', 'learn more and be respected', 10),
    (d_fri_gmrc_quiz, 'Who among these is showing the BEST example of community duty?', '["A boy who litters in the park", "A girl who joins barangay clean-up day", "A child who runs away from community activities", "A student who skips flag ceremony"]', 'A girl who joins barangay clean-up day', 11);

  -- Friday / Makabansa
  d_fri_maka_day := d_fri_comp_day;
  INSERT INTO content_quizzes (content_day_id, subject)
    VALUES (d_fri_maka_day, 'Makabansa') RETURNING id INTO d_fri_maka_quiz;
  INSERT INTO content_questions (content_quiz_id, prompt, options, correct_answer, sort_order) VALUES
    (d_fri_maka_quiz, 'Ano ang ibig sabihin ng ''kultura''?', '["Uri ng damit lamang", "Paraan ng pamumuhay, paniniwala, at kaugalian ng isang grupo", "Pangalan ng isang bansa", "Uri ng pagkain"]', 'Paraan ng pamumuhay, paniniwala, at kaugalian ng isang grupo', 0),
    (d_fri_maka_quiz, 'Ang kultura ay ipinapasa mula sa ___.', '["mga bata patungong matatanda", "mga matatanda patungong mga bata", "mga guro patungong mga mag-aaral", "mga tindero patungong mga mamimili"]', 'mga matatanda patungong mga bata', 1),
    (d_fri_maka_quiz, 'Alin ang HALIMBAWA ng kultura?', '["Motorsiklo", "Kaugalian ng pagbabati ng kamay", "Sasakyan", "Eroplano"]', 'Kaugalian ng pagbabati ng kamay', 2),
    (d_fri_maka_quiz, 'Bakit mahalaga ang kultura sa isang komunidad?', '["Nagbibigay ito ng pagkakakilanlan sa isang grupo", "Hindi ito mahalaga", "Para lang sa mga matatanda", "Para sa mga dayuhan lamang"]', 'Nagbibigay ito ng pagkakakilanlan sa isang grupo', 3),
    (d_fri_maka_quiz, 'Ang pagkain ng suman at kakanin ay halimbawa ng ___.', '["materyal na kultura", "di-materyal na kultura", "tradisyon", "laruan"]', 'materyal na kultura', 4),
    (d_fri_maka_quiz, 'Ang kanta at sayaw ng isang tribu ay halimbawa ng ___.', '["materyal na kultura", "di-materyal na kultura", "kalakal", "industriya"]', 'di-materyal na kultura', 5),
    (d_fri_maka_quiz, 'Ang kulturang Pilipino ay ___ sa iba''t ibang komunidad.', '["magkapareho", "magkakaiba-iba", "hindi mahalaga", "para lamang sa Manila"]', 'magkakaiba-iba', 6),
    (d_fri_maka_quiz, 'Alin ang HINDI kasama sa kultura?', '["Kaugalian", "Paniniwala", "Paraan ng pamumuhay", "Temperatura ng hangin"]', 'Temperatura ng hangin', 7),
    (d_fri_maka_quiz, 'Ang kultura ay ___ mula henerasyon hanggang henerasyon.', '["naubos", "naipapalit", "naipapalipat", "nasisira"]', 'naipapalipat', 8),
    (d_fri_maka_quiz, 'Ang pagbibigay ng mano sa matatanda ay halimbawa ng ___ na kultura.', '["materyal", "pisikal", "di-materyal", "modernong"]', 'di-materyal', 9),
    (d_fri_maka_quiz, 'Ang iba''t ibang lugar sa Pilipinas ay may ___ kultura.', '["iisang", "magkakatulad", "kanya-kanyang", "walang"]', 'kanya-kanyang', 10),
    (d_fri_maka_quiz, 'Ang kultura ay ginagawang ___ ng isang komunidad.', '["walang pagkakaisa", "magkaka-iba ang lahat", "may pagkakakilanlan at nagkakaisa", "palaging nagbabago nang walang patakaran"]', 'may pagkakakilanlan at nagkakaisa', 11);

  -- Friday / Mathematics
  d_fri_math_day := d_fri_comp_day;
  INSERT INTO content_quizzes (content_day_id, subject)
    VALUES (d_fri_math_day, 'Mathematics') RETURNING id INTO d_fri_math_quiz;
  INSERT INTO content_questions (content_quiz_id, prompt, options, correct_answer, sort_order) VALUES
    (d_fri_math_quiz, 'What unit do we use to measure the length of a classroom?', '["Centimeters (cm)", "Meters (m)", "Kilograms (kg)", "Liters (L)"]', 'Meters (m)', 0),
    (d_fri_math_quiz, 'A pencil is 14 ___ long.', '["meters", "centimeters", "kilograms", "liters"]', 'centimeters', 1),
    (d_fri_math_quiz, 'Which tool is best for measuring the length of a room?', '["Ruler", "Meter stick", "Weighing scale", "Measuring cup"]', 'Meter stick', 2),
    (d_fri_math_quiz, 'Anna''s ribbon is 50 cm. Ben''s ribbon is 80 cm. Whose ribbon is longer?', '["Anna''s", "Ben''s", "They are equal", "Cannot tell"]', 'Ben''s', 3),
    (d_fri_math_quiz, '1 meter = ___ centimeters.', '["10", "100", "1000", "1"]', '100', 4),
    (d_fri_math_quiz, 'About how long is a door? Choose the best estimate.', '["2 meters", "2 centimeters", "20 meters", "20 centimeters"]', '2 meters', 5),
    (d_fri_math_quiz, 'A garden path is 5 meters long. How many centimeters is that?', '["50 cm", "500 cm", "5 cm", "5000 cm"]', '500 cm', 6),
    (d_fri_math_quiz, 'Which is the SHORTEST?', '["A bus (about 10 m)", "A pencil (about 15 cm)", "A door (about 2 m)", "A table (about 80 cm)"]', 'A pencil (about 15 cm)', 7),
    (d_fri_math_quiz, 'Measure and compare: Rope A = 3 m, Rope B = 250 cm. Which is longer?', '["Rope A", "Rope B", "They are equal", "Cannot tell"]', 'Rope B', 8),
    (d_fri_math_quiz, 'A book is 25 cm wide. Estimate: about how many books can fit in 1 meter side by side?', '["2", "4", "10", "20"]', '4', 9),
    (d_fri_math_quiz, 'Maria walked 300 cm. Jose walked 4 meters. Who walked farther?', '["Maria", "Jose", "They walked the same", "Cannot tell"]', 'Jose', 10),
    (d_fri_math_quiz, 'Which is a reasonable length for a Grade 2 pupil''s height?', '["1 cm", "100 cm", "10 m", "10 cm"]', '100 cm', 11);

END $g2$;

-- Grade 3 Week 12 (2026-08-31)
DO $g3$ DECLARE
  wid uuid;
  d_mon_engl_day uuid;
  d_mon_engl_quiz uuid;
  d_mon_math_day uuid;
  d_mon_math_quiz uuid;
  d_tue_fili_day uuid;
  d_tue_fili_quiz uuid;
  d_tue_scie_day uuid;
  d_tue_scie_quiz uuid;
  d_wed_comp_day uuid;
  d_wed_comp_quiz uuid;
  d_wed_maka_day uuid;
  d_wed_maka_quiz uuid;
  d_thu_gmrc_day uuid;
  d_thu_gmrc_quiz uuid;
  d_fri_comp_day uuid;
  d_fri_comp_quiz uuid;
  d_fri_engl_day uuid;
  d_fri_engl_quiz uuid;
  d_fri_fili_day uuid;
  d_fri_fili_quiz uuid;
  d_fri_gmrc_day uuid;
  d_fri_gmrc_quiz uuid;
  d_fri_maka_day uuid;
  d_fri_maka_quiz uuid;
  d_fri_math_day uuid;
  d_fri_math_quiz uuid;
  d_fri_scie_day uuid;
  d_fri_scie_quiz uuid;
BEGIN
  INSERT INTO content_weeks (grade, week_starting_date)
    VALUES (3, '2026-08-31') RETURNING id INTO wid;

  -- Monday
  INSERT INTO content_days (content_week_id, weekday)
    VALUES (wid, 'Monday') RETURNING id INTO d_mon_engl_day;
  INSERT INTO content_quizzes (content_day_id, subject)
    VALUES (d_mon_engl_day, 'English') RETURNING id INTO d_mon_engl_quiz;
  INSERT INTO content_questions (content_quiz_id, prompt, options, correct_answer, sort_order) VALUES
    (d_mon_engl_quiz, 'What is the TOPIC SENTENCE of a paragraph?', '["The last sentence", "The middle sentence", "The sentence that states the main idea", "A question in the paragraph"]', 'The sentence that states the main idea', 0),
    (d_mon_engl_quiz, 'Which word means almost the same as ''happy''?', '["Sad", "Joyful", "Angry", "Tired"]', 'Joyful', 1),
    (d_mon_engl_quiz, '''The cat ___ on the mat.'' Choose the correct verb form.', '["sit", "sat", "sitting", "sits"]', 'sits', 2),
    (d_mon_engl_quiz, 'Which sentence is a COMPOUND SENTENCE?', '["She sings.", "She sings and he dances.", "Because she sings.", "Singing loudly."]', 'She sings and he dances.', 3),
    (d_mon_engl_quiz, 'What does the prefix ''un-'' mean in ''unhappy''?', '["Very", "More", "Not", "Again"]', 'Not', 4),
    (d_mon_engl_quiz, '''Maria reads books every day.'' The verb ''reads'' tells the ___ of the subject.', '["name", "place", "action", "feeling"]', 'action', 5),
    (d_mon_engl_quiz, 'Which is a DESCRIBING word (adjective)?', '["Run", "Beautiful", "She", "Quickly"]', 'Beautiful', 6),
    (d_mon_engl_quiz, 'A story that teaches a lesson or moral is called a ___.', '["poem", "fable", "diary", "recipe"]', 'fable', 7),
    (d_mon_engl_quiz, 'Which sentence is in the PRESENT TENSE?', '["She sang a song.", "She will sing a song.", "She sings a song.", "She has sung a song."]', 'She sings a song.', 8),
    (d_mon_engl_quiz, 'What is a SYNONYM for ''big''?', '["Small", "Large", "Quick", "Bright"]', 'Large', 9),
    (d_mon_engl_quiz, 'Which word completes: ''The children ___ playing outside when it rained.''?', '["were", "are", "is", "be"]', 'were', 10),
    (d_mon_engl_quiz, 'When retelling a story, what should you include FIRST?', '["The ending", "The middle events", "The characters and setting", "The lesson"]', 'The characters and setting', 11);

  -- Monday / Mathematics
  d_mon_math_day := d_mon_engl_day;
  INSERT INTO content_quizzes (content_day_id, subject)
    VALUES (d_mon_math_day, 'Mathematics') RETURNING id INTO d_mon_math_quiz;
  INSERT INTO content_questions (content_quiz_id, prompt, options, correct_answer, sort_order) VALUES
    (d_mon_math_quiz, 'What unit do we use to measure the mass of a watermelon?', '["Centimeters", "Meters", "Grams", "Kilograms"]', 'Kilograms', 0),
    (d_mon_math_quiz, 'What unit do we use to measure the mass of a grain of rice?', '["Kilogram", "Gram", "Meter", "Liter"]', 'Gram', 1),
    (d_mon_math_quiz, '1 kilogram = ___ grams.', '["10", "100", "1000", "10000"]', '1000', 2),
    (d_mon_math_quiz, 'A bag of rice weighs 5 kg. How many grams is that?', '["500 g", "5000 g", "50 g", "5 g"]', '5000 g', 3),
    (d_mon_math_quiz, 'Which tool is used to measure mass?', '["Ruler", "Measuring tape", "Weighing scale", "Thermometer"]', 'Weighing scale', 4),
    (d_mon_math_quiz, 'Anna''s bag weighs 3 kg. Ben''s bag weighs 2500 g. Whose bag is heavier?', '["Anna''s", "Ben''s", "They are equal", "Cannot tell"]', 'Anna''s', 5),
    (d_mon_math_quiz, 'Estimate: which object has a mass of about 1 gram?', '["A watermelon", "A grain of sugar", "A bag of potatoes", "A large book"]', 'A grain of sugar', 6),
    (d_mon_math_quiz, 'A balance scale is used to ___.', '["measure temperature", "compare and measure mass", "measure length", "measure volume"]', 'compare and measure mass', 7),
    (d_mon_math_quiz, 'A chicken weighs 1500 g. How many kilograms and grams is that?', '["1 kg 500 g", "15 kg 0 g", "150 kg 0 g", "0 kg 1500 g \u2014 same as 1 kg 500 g"]', '1 kg 500 g', 8),
    (d_mon_math_quiz, 'Which is the heaviest?', '["A feather (about 1 g)", "A pencil (about 10 g)", "A brick (about 3 kg)", "A coin (about 5 g)"]', 'A brick (about 3 kg)', 9),
    (d_mon_math_quiz, 'Mia has 2 kg of flour. She uses 750 g. How much flour is left?', '["1250 g", "1750 g", "750 g", "2750 g"]', '1250 g', 10),
    (d_mon_math_quiz, 'What does ''estimate'' mean?', '["Measure exactly", "Make a careful guess", "Weigh on a scale", "Count one by one"]', 'Make a careful guess', 11);

  -- Tuesday
  INSERT INTO content_days (content_week_id, weekday)
    VALUES (wid, 'Tuesday') RETURNING id INTO d_tue_fili_day;
  INSERT INTO content_quizzes (content_day_id, subject)
    VALUES (d_tue_fili_day, 'Filipino') RETURNING id INTO d_tue_fili_quiz;
  INSERT INTO content_questions (content_quiz_id, prompt, options, correct_answer, sort_order) VALUES
    (d_tue_fili_quiz, 'Alin ang tamang gamit ng ''mula''?', '["Lumabas mula sa kwarto.", "Pumunta mula ang parke.", "Mula ang bata.", "Umuwi ng mula sa bahay."]', 'Lumabas mula sa kwarto.', 0),
    (d_tue_fili_quiz, 'Ang kuwento na may aral ay tinatawag na ___.', '["tula", "pabula", "salawikain", "talata"]', 'pabula', 1),
    (d_tue_fili_quiz, 'Ano ang ibig sabihin ng ''matiyaga''?', '["Mabilis", "Masipag at hindi nagbibigay up", "Tamad", "Magulo"]', 'Masipag at hindi nagbibigay up', 2),
    (d_tue_fili_quiz, '''Si Pedro ay matalino.'' Ano ang katangian ni Pedro?', '["Masaya", "Matalino", "Maliksi", "Matapang"]', 'Matalino', 3),
    (d_tue_fili_quiz, 'Alin ang PANG-URI?', '["Kumain", "Malaki", "Bahay", "Siya"]', 'Malaki', 4),
    (d_tue_fili_quiz, '''Ang guro ay nagturo ng wika.'' Ano ang ginawa ng guro?', '["Kumain", "Nagturo", "Pumunta", "Natulog"]', 'Nagturo', 5),
    (d_tue_fili_quiz, 'Piliin ang tamang salita: ''Pumunta ___ sa tindahan ang bata.''', '["si", "ng", "sa", "ay"]', 'sa', 6),
    (d_tue_fili_quiz, 'Ang salitang ''magalang'' ay nagpapakita ng ___.', '["masamang gawi", "magandang asal", "kasamaan", "katamaran"]', 'magandang asal', 7),
    (d_tue_fili_quiz, 'Alin ang PANDIWA?', '["Malungkot", "Paaralan", "Sumayaw", "Maganda"]', 'Sumayaw', 8),
    (d_tue_fili_quiz, 'Ano ang kabaligtaran ng ''masaya''?', '["Maingay", "Tahimik", "Malungkot", "Masipag"]', 'Malungkot', 9),
    (d_tue_fili_quiz, '''Nagbasa si Ana ng libro tuwing hapon.'' Kailan nagbabasa si Ana?', '["Umaga", "Tanghali", "Hapon", "Gabi"]', 'Hapon', 10),
    (d_tue_fili_quiz, 'Ang tula ay may ___.', '["kuwento lamang", "aralin at tauhan", "tugma at sukat", "tanong at sagot"]', 'tugma at sukat', 11);

  -- Tuesday / Science
  d_tue_scie_day := d_tue_fili_day;
  INSERT INTO content_quizzes (content_day_id, subject)
    VALUES (d_tue_scie_day, 'Science') RETURNING id INTO d_tue_scie_quiz;
  INSERT INTO content_questions (content_quiz_id, prompt, options, correct_answer, sort_order) VALUES
    (d_tue_scie_quiz, 'Which science skill involves using your senses to study something carefully?', '["Predicting", "Observing", "Measuring", "Classifying"]', 'Observing', 0),
    (d_tue_scie_quiz, 'When you say ''I think it will rain today because the clouds are dark,'' you are ___.', '["observing", "predicting", "measuring", "classifying"]', 'predicting', 1),
    (d_tue_scie_quiz, 'A scientist uses a ruler to find the length of a leaf. This is an example of ___.', '["predicting", "observing", "measuring", "inferring"]', 'measuring', 2),
    (d_tue_scie_quiz, 'Which of these is a LIVING thing?', '["Rock", "Water", "Plant", "Cloud"]', 'Plant', 3),
    (d_tue_scie_quiz, 'Which of these is NOT a characteristic of living things?', '["They grow", "They respond to their surroundings", "They reproduce", "They are always green"]', 'They are always green', 4),
    (d_tue_scie_quiz, '''I predict that the plant placed in the dark will die.'' This is a ___.', '["fact", "observation", "measurement", "prediction"]', 'prediction', 5),
    (d_tue_scie_quiz, 'A thermometer is used to ___.', '["measure length", "measure mass", "measure temperature", "measure volume"]', 'measure temperature', 6),
    (d_tue_scie_quiz, 'Which senses does a scientist use when OBSERVING?', '["Only sight", "Only hearing", "Sight, hearing, smell, touch, and taste (when safe)", "Only touch"]', 'Sight, hearing, smell, touch, and taste (when safe)', 7),
    (d_tue_scie_quiz, 'Classifying means ___.', '["counting objects", "measuring objects", "grouping objects according to their properties", "predicting what will happen"]', 'grouping objects according to their properties', 8),
    (d_tue_scie_quiz, 'A good scientific observation is ___.', '["a guess about what might happen", "a measurement in centimeters", "a careful description of what you actually see", "an explanation of why something happens"]', 'a careful description of what you actually see', 9),
    (d_tue_scie_quiz, 'Living things REPRODUCE, which means they ___.', '["eat food", "make more of their own kind", "breathe air", "grow bigger"]', 'make more of their own kind', 10),
    (d_tue_scie_quiz, 'Which tool is best for measuring the MASS of a small stone?', '["Ruler", "Thermometer", "Weighing scale", "Measuring cup"]', 'Weighing scale', 11);

  -- Wednesday
  INSERT INTO content_days (content_week_id, weekday)
    VALUES (wid, 'Wednesday') RETURNING id INTO d_wed_comp_day;
  INSERT INTO content_quizzes (content_day_id, subject)
    VALUES (d_wed_comp_day, 'Computer') RETURNING id INTO d_wed_comp_quiz;
  INSERT INTO content_questions (content_quiz_id, prompt, options, correct_answer, sort_order) VALUES
    (d_wed_comp_quiz, 'What do you click to OPEN a word-processing program from the desktop?', '["The taskbar", "The document icon/shortcut", "The power button", "The printer"]', 'The document icon/shortcut', 0),
    (d_wed_comp_quiz, 'Which toolbar button makes text appear DARKER and thicker?', '["Italic (I)", "Underline (U)", "Bold (B)", "Font size"]', 'Bold (B)', 1),
    (d_wed_comp_quiz, 'To make text appear with a LINE UNDER IT, you click ___.', '["Bold (B)", "Italic (I)", "Underline (U)", "Strikethrough"]', 'Underline (U)', 2),
    (d_wed_comp_quiz, 'Which button lets you change the SIZE of text?', '["Bold", "Color", "Font size", "Underline"]', 'Font size', 3),
    (d_wed_comp_quiz, 'If you type ''Hy'' instead of ''Hi'', which key removes the wrong letter?', '["Enter", "Shift", "Spacebar", "Backspace"]', 'Backspace', 4),
    (d_wed_comp_quiz, 'In a word-processing program, what does ''Font Color'' let you do?', '["Change the size of text", "Change the style of letters", "Change the color of text", "Delete text"]', 'Change the color of text', 5),
    (d_wed_comp_quiz, 'Which is a common word-processing program?', '["Paint", "Microsoft Word", "Calculator", "Media Player"]', 'Microsoft Word', 6),
    (d_wed_comp_quiz, 'To type a capital letter in a word-processing program, you press ___.', '["Backspace + the letter", "Enter + the letter", "Shift + the letter", "Spacebar + the letter"]', 'Shift + the letter', 7),
    (d_wed_comp_quiz, 'When you finish typing a document, what should you do to save your work?', '["Close the program without saving", "Press Save (Ctrl+S or the Save button)", "Restart the computer", "Delete the file"]', 'Press Save (Ctrl+S or the Save button)', 8),
    (d_wed_comp_quiz, 'You can make text BIGGER by ___.', '["increasing the font size", "pressing Enter", "pressing Backspace", "changing the font color"]', 'increasing the font size', 9),
    (d_wed_comp_quiz, 'In a word-processing program, to go to a new line, you press ___.', '["Spacebar", "Backspace", "Shift", "Enter"]', 'Enter', 10),
    (d_wed_comp_quiz, 'Which of these can you do with basic drawing tools in a computer program?', '["Send emails", "Type a letter", "Draw shapes and color them", "Print a photo"]', 'Draw shapes and color them', 11);

  -- Wednesday / Makabansa
  d_wed_maka_day := d_wed_comp_day;
  INSERT INTO content_quizzes (content_day_id, subject)
    VALUES (d_wed_maka_day, 'Makabansa') RETURNING id INTO d_wed_maka_quiz;
  INSERT INTO content_questions (content_quiz_id, prompt, options, correct_answer, sort_order) VALUES
    (d_wed_maka_quiz, 'How does the ENVIRONMENT affect the CULTURE of people in a place?', '["It has no effect on culture", "It shapes the food, livelihood, and customs of the people", "It only affects the language", "It only affects clothing"]', 'It shapes the food, livelihood, and customs of the people', 0),
    (d_wed_maka_quiz, 'People who live near the SEA often have a culture that includes ___.', '["farming rice", "fishing and seafood dishes", "mountain hiking", "herding animals"]', 'fishing and seafood dishes', 1),
    (d_wed_maka_quiz, 'What is the relationship between the environment and culture of a community?', '["They are completely separate", "The environment influences the way of life and culture", "Culture has no connection to the land", "Only climate affects culture"]', 'The environment influences the way of life and culture', 2),
    (d_wed_maka_quiz, 'The Cordillera people of the mountains are known for their rice TERRACES. This shows how ___ influenced their culture.', '["the ocean", "the mountains and land", "the desert", "the lowlands"]', 'the mountains and land', 3),
    (d_wed_maka_quiz, 'Which BEST explains why coastal communities eat a lot of fish?', '["Because they do not like vegetables", "Because fish is cheap everywhere", "Because their environment (sea) provides fish as a natural resource", "Because their culture forbids other food"]', 'Because their environment (sea) provides fish as a natural resource', 4),
    (d_wed_maka_quiz, 'Comparing cultures of different communities teaches us to ___.', '["think one culture is better", "respect and appreciate differences", "ignore other cultures", "copy only one culture"]', 'respect and appreciate differences', 5),
    (d_wed_maka_quiz, 'A community''s KULTURA includes its ___.', '["only its food", "only its language", "way of life, beliefs, and customs shaped partly by its environment", "only its geography"]', 'way of life, beliefs, and customs shaped partly by its environment', 6),
    (d_wed_maka_quiz, 'Why do different regions of the Philippines have different cultures?', '["They all have the same environment", "They have different environments, histories, and peoples", "Culture never changes", "All Filipinos are the same"]', 'They have different environments, histories, and peoples', 7),
    (d_wed_maka_quiz, 'The MALONG worn by people in Mindanao is an example of a ___ shaped by their culture.', '["natural resource", "traditional garment", "school subject", "farming tool"]', 'traditional garment', 8),
    (d_wed_maka_quiz, 'People in flat lowlands often build their livelihood around ___.', '["fishing only", "mountaineering", "rice farming and agriculture", "hunting in forests"]', 'rice farming and agriculture', 9),
    (d_wed_maka_quiz, 'Learning about the culture of other communities helps us ___.', '["feel superior to others", "become more understanding and respectful", "ignore our own culture", "forget our traditions"]', 'become more understanding and respectful', 10),
    (d_wed_maka_quiz, 'What does ''kultura'' mean in Filipino?', '["Weather", "Way of life, beliefs, and customs of a group of people", "Language only", "Food only"]', 'Way of life, beliefs, and customs of a group of people', 11);

  -- Thursday
  INSERT INTO content_days (content_week_id, weekday)
    VALUES (wid, 'Thursday') RETURNING id INTO d_thu_gmrc_day;
  INSERT INTO content_quizzes (content_day_id, subject)
    VALUES (d_thu_gmrc_day, 'GMRC') RETURNING id INTO d_thu_gmrc_quiz;
  INSERT INTO content_questions (content_quiz_id, prompt, options, correct_answer, sort_order) VALUES
    (d_thu_gmrc_quiz, 'Making good choices means thinking about ___.', '["only what you want", "the effects on yourself and others", "what is the most fun", "what is easiest"]', 'the effects on yourself and others', 0),
    (d_thu_gmrc_quiz, 'When you have the freedom to choose your actions, you also have the ___ for the results.', '["praise", "responsibility", "reward", "excuse"]', 'responsibility', 1),
    (d_thu_gmrc_quiz, 'Maria chose to study instead of playing games. This shows ___.', '["laziness", "good self-discipline", "bad choices", "irresponsibility"]', 'good self-discipline', 2),
    (d_thu_gmrc_quiz, 'Recognizing your own strengths helps you ___.', '["brag to others", "use those strengths to do good and improve", "be selfish", "ignore your weaknesses"]', 'use those strengths to do good and improve', 3),
    (d_thu_gmrc_quiz, 'When we make a mistake, the RIGHT thing to do is ___.', '["blame someone else", "hide the mistake", "admit it and try to do better", "pretend it did not happen"]', 'admit it and try to do better', 4),
    (d_thu_gmrc_quiz, 'Self-discipline means ___.', '["doing whatever you feel like", "controlling your actions and choosing what is right", "always following others", "avoiding responsibilities"]', 'controlling your actions and choosing what is right', 5),
    (d_thu_gmrc_quiz, 'A pupil who finishes homework before playing shows ___.', '["poor time management", "good self-discipline and responsibility", "laziness", "disregard for learning"]', 'good self-discipline and responsibility', 6),
    (d_thu_gmrc_quiz, 'Which of these is a POSITIVE character trait?', '["Cheating", "Honesty", "Lying", "Selfishness"]', 'Honesty', 7),
    (d_thu_gmrc_quiz, 'Understanding your own feelings helps you ___.', '["ignore others", "react wisely and treat others with kindness", "always be right", "win every argument"]', 'react wisely and treat others with kindness', 8),
    (d_thu_gmrc_quiz, 'If a friend invites you to cheat on a test, what should you do?', '["Cheat because your friend asked", "Refuse and explain it is wrong", "Do nothing", "Agree to cheat next time"]', 'Refuse and explain it is wrong', 9),
    (d_thu_gmrc_quiz, 'Helping a classmate who is struggling shows the value of ___.', '["selfishness", "competition", "kindness and caring for others", "superiority"]', 'kindness and caring for others', 10),
    (d_thu_gmrc_quiz, 'What is the BEST way to handle a disagreement with a classmate?', '["Shout and argue", "Ignore each other forever", "Talk calmly and find a fair solution", "Ask other classmates to take sides"]', 'Talk calmly and find a fair solution', 11);

  -- Friday
  INSERT INTO content_days (content_week_id, weekday)
    VALUES (wid, 'Friday') RETURNING id INTO d_fri_comp_day;
  INSERT INTO content_quizzes (content_day_id, subject)
    VALUES (d_fri_comp_day, 'Computer') RETURNING id INTO d_fri_comp_quiz;
  INSERT INTO content_questions (content_quiz_id, prompt, options, correct_answer, sort_order) VALUES
    (d_fri_comp_quiz, 'What do you click to OPEN a word-processing program from the desktop?', '["The taskbar", "The document icon/shortcut", "The power button", "The printer"]', 'The document icon/shortcut', 0),
    (d_fri_comp_quiz, 'Which toolbar button makes text appear DARKER and thicker?', '["Italic (I)", "Underline (U)", "Bold (B)", "Font size"]', 'Bold (B)', 1),
    (d_fri_comp_quiz, 'To make text appear with a LINE UNDER IT, you click ___.', '["Bold (B)", "Italic (I)", "Underline (U)", "Strikethrough"]', 'Underline (U)', 2),
    (d_fri_comp_quiz, 'Which button lets you change the SIZE of text?', '["Bold", "Color", "Font size", "Underline"]', 'Font size', 3),
    (d_fri_comp_quiz, 'If you type ''Hy'' instead of ''Hi'', which key removes the wrong letter?', '["Enter", "Shift", "Spacebar", "Backspace"]', 'Backspace', 4),
    (d_fri_comp_quiz, 'In a word-processing program, what does ''Font Color'' let you do?', '["Change the size of text", "Change the style of letters", "Change the color of text", "Delete text"]', 'Change the color of text', 5),
    (d_fri_comp_quiz, 'Which is a common word-processing program?', '["Paint", "Microsoft Word", "Calculator", "Media Player"]', 'Microsoft Word', 6),
    (d_fri_comp_quiz, 'To type a capital letter in a word-processing program, you press ___.', '["Backspace + the letter", "Enter + the letter", "Shift + the letter", "Spacebar + the letter"]', 'Shift + the letter', 7),
    (d_fri_comp_quiz, 'When you finish typing a document, what should you do to save your work?', '["Close the program without saving", "Press Save (Ctrl+S or the Save button)", "Restart the computer", "Delete the file"]', 'Press Save (Ctrl+S or the Save button)', 8),
    (d_fri_comp_quiz, 'You can make text BIGGER by ___.', '["increasing the font size", "pressing Enter", "pressing Backspace", "changing the font color"]', 'increasing the font size', 9),
    (d_fri_comp_quiz, 'In a word-processing program, to go to a new line, you press ___.', '["Spacebar", "Backspace", "Shift", "Enter"]', 'Enter', 10),
    (d_fri_comp_quiz, 'Which of these can you do with basic drawing tools in a computer program?', '["Send emails", "Type a letter", "Draw shapes and color them", "Print a photo"]', 'Draw shapes and color them', 11);

  -- Friday / English
  d_fri_engl_day := d_fri_comp_day;
  INSERT INTO content_quizzes (content_day_id, subject)
    VALUES (d_fri_engl_day, 'English') RETURNING id INTO d_fri_engl_quiz;
  INSERT INTO content_questions (content_quiz_id, prompt, options, correct_answer, sort_order) VALUES
    (d_fri_engl_quiz, 'What is the TOPIC SENTENCE of a paragraph?', '["The last sentence", "The middle sentence", "The sentence that states the main idea", "A question in the paragraph"]', 'The sentence that states the main idea', 0),
    (d_fri_engl_quiz, 'Which word means almost the same as ''happy''?', '["Sad", "Joyful", "Angry", "Tired"]', 'Joyful', 1),
    (d_fri_engl_quiz, '''The cat ___ on the mat.'' Choose the correct verb form.', '["sit", "sat", "sitting", "sits"]', 'sits', 2),
    (d_fri_engl_quiz, 'Which sentence is a COMPOUND SENTENCE?', '["She sings.", "She sings and he dances.", "Because she sings.", "Singing loudly."]', 'She sings and he dances.', 3),
    (d_fri_engl_quiz, 'What does the prefix ''un-'' mean in ''unhappy''?', '["Very", "More", "Not", "Again"]', 'Not', 4),
    (d_fri_engl_quiz, '''Maria reads books every day.'' The verb ''reads'' tells the ___ of the subject.', '["name", "place", "action", "feeling"]', 'action', 5),
    (d_fri_engl_quiz, 'Which is a DESCRIBING word (adjective)?', '["Run", "Beautiful", "She", "Quickly"]', 'Beautiful', 6),
    (d_fri_engl_quiz, 'A story that teaches a lesson or moral is called a ___.', '["poem", "fable", "diary", "recipe"]', 'fable', 7),
    (d_fri_engl_quiz, 'Which sentence is in the PRESENT TENSE?', '["She sang a song.", "She will sing a song.", "She sings a song.", "She has sung a song."]', 'She sings a song.', 8),
    (d_fri_engl_quiz, 'What is a SYNONYM for ''big''?', '["Small", "Large", "Quick", "Bright"]', 'Large', 9),
    (d_fri_engl_quiz, 'Which word completes: ''The children ___ playing outside when it rained.''?', '["were", "are", "is", "be"]', 'were', 10),
    (d_fri_engl_quiz, 'When retelling a story, what should you include FIRST?', '["The ending", "The middle events", "The characters and setting", "The lesson"]', 'The characters and setting', 11);

  -- Friday / Filipino
  d_fri_fili_day := d_fri_comp_day;
  INSERT INTO content_quizzes (content_day_id, subject)
    VALUES (d_fri_fili_day, 'Filipino') RETURNING id INTO d_fri_fili_quiz;
  INSERT INTO content_questions (content_quiz_id, prompt, options, correct_answer, sort_order) VALUES
    (d_fri_fili_quiz, 'Alin ang tamang gamit ng ''mula''?', '["Lumabas mula sa kwarto.", "Pumunta mula ang parke.", "Mula ang bata.", "Umuwi ng mula sa bahay."]', 'Lumabas mula sa kwarto.', 0),
    (d_fri_fili_quiz, 'Ang kuwento na may aral ay tinatawag na ___.', '["tula", "pabula", "salawikain", "talata"]', 'pabula', 1),
    (d_fri_fili_quiz, 'Ano ang ibig sabihin ng ''matiyaga''?', '["Mabilis", "Masipag at hindi nagbibigay up", "Tamad", "Magulo"]', 'Masipag at hindi nagbibigay up', 2),
    (d_fri_fili_quiz, '''Si Pedro ay matalino.'' Ano ang katangian ni Pedro?', '["Masaya", "Matalino", "Maliksi", "Matapang"]', 'Matalino', 3),
    (d_fri_fili_quiz, 'Alin ang PANG-URI?', '["Kumain", "Malaki", "Bahay", "Siya"]', 'Malaki', 4),
    (d_fri_fili_quiz, '''Ang guro ay nagturo ng wika.'' Ano ang ginawa ng guro?', '["Kumain", "Nagturo", "Pumunta", "Natulog"]', 'Nagturo', 5),
    (d_fri_fili_quiz, 'Piliin ang tamang salita: ''Pumunta ___ sa tindahan ang bata.''', '["si", "ng", "sa", "ay"]', 'sa', 6),
    (d_fri_fili_quiz, 'Ang salitang ''magalang'' ay nagpapakita ng ___.', '["masamang gawi", "magandang asal", "kasamaan", "katamaran"]', 'magandang asal', 7),
    (d_fri_fili_quiz, 'Alin ang PANDIWA?', '["Malungkot", "Paaralan", "Sumayaw", "Maganda"]', 'Sumayaw', 8),
    (d_fri_fili_quiz, 'Ano ang kabaligtaran ng ''masaya''?', '["Maingay", "Tahimik", "Malungkot", "Masipag"]', 'Malungkot', 9),
    (d_fri_fili_quiz, '''Nagbasa si Ana ng libro tuwing hapon.'' Kailan nagbabasa si Ana?', '["Umaga", "Tanghali", "Hapon", "Gabi"]', 'Hapon', 10),
    (d_fri_fili_quiz, 'Ang tula ay may ___.', '["kuwento lamang", "aralin at tauhan", "tugma at sukat", "tanong at sagot"]', 'tugma at sukat', 11);

  -- Friday / GMRC
  d_fri_gmrc_day := d_fri_comp_day;
  INSERT INTO content_quizzes (content_day_id, subject)
    VALUES (d_fri_gmrc_day, 'GMRC') RETURNING id INTO d_fri_gmrc_quiz;
  INSERT INTO content_questions (content_quiz_id, prompt, options, correct_answer, sort_order) VALUES
    (d_fri_gmrc_quiz, 'Making good choices means thinking about ___.', '["only what you want", "the effects on yourself and others", "what is the most fun", "what is easiest"]', 'the effects on yourself and others', 0),
    (d_fri_gmrc_quiz, 'When you have the freedom to choose your actions, you also have the ___ for the results.', '["praise", "responsibility", "reward", "excuse"]', 'responsibility', 1),
    (d_fri_gmrc_quiz, 'Maria chose to study instead of playing games. This shows ___.', '["laziness", "good self-discipline", "bad choices", "irresponsibility"]', 'good self-discipline', 2),
    (d_fri_gmrc_quiz, 'Recognizing your own strengths helps you ___.', '["brag to others", "use those strengths to do good and improve", "be selfish", "ignore your weaknesses"]', 'use those strengths to do good and improve', 3),
    (d_fri_gmrc_quiz, 'When we make a mistake, the RIGHT thing to do is ___.', '["blame someone else", "hide the mistake", "admit it and try to do better", "pretend it did not happen"]', 'admit it and try to do better', 4),
    (d_fri_gmrc_quiz, 'Self-discipline means ___.', '["doing whatever you feel like", "controlling your actions and choosing what is right", "always following others", "avoiding responsibilities"]', 'controlling your actions and choosing what is right', 5),
    (d_fri_gmrc_quiz, 'A pupil who finishes homework before playing shows ___.', '["poor time management", "good self-discipline and responsibility", "laziness", "disregard for learning"]', 'good self-discipline and responsibility', 6),
    (d_fri_gmrc_quiz, 'Which of these is a POSITIVE character trait?', '["Cheating", "Honesty", "Lying", "Selfishness"]', 'Honesty', 7),
    (d_fri_gmrc_quiz, 'Understanding your own feelings helps you ___.', '["ignore others", "react wisely and treat others with kindness", "always be right", "win every argument"]', 'react wisely and treat others with kindness', 8),
    (d_fri_gmrc_quiz, 'If a friend invites you to cheat on a test, what should you do?', '["Cheat because your friend asked", "Refuse and explain it is wrong", "Do nothing", "Agree to cheat next time"]', 'Refuse and explain it is wrong', 9),
    (d_fri_gmrc_quiz, 'Helping a classmate who is struggling shows the value of ___.', '["selfishness", "competition", "kindness and caring for others", "superiority"]', 'kindness and caring for others', 10),
    (d_fri_gmrc_quiz, 'What is the BEST way to handle a disagreement with a classmate?', '["Shout and argue", "Ignore each other forever", "Talk calmly and find a fair solution", "Ask other classmates to take sides"]', 'Talk calmly and find a fair solution', 11);

  -- Friday / Makabansa
  d_fri_maka_day := d_fri_comp_day;
  INSERT INTO content_quizzes (content_day_id, subject)
    VALUES (d_fri_maka_day, 'Makabansa') RETURNING id INTO d_fri_maka_quiz;
  INSERT INTO content_questions (content_quiz_id, prompt, options, correct_answer, sort_order) VALUES
    (d_fri_maka_quiz, 'How does the ENVIRONMENT affect the CULTURE of people in a place?', '["It has no effect on culture", "It shapes the food, livelihood, and customs of the people", "It only affects the language", "It only affects clothing"]', 'It shapes the food, livelihood, and customs of the people', 0),
    (d_fri_maka_quiz, 'People who live near the SEA often have a culture that includes ___.', '["farming rice", "fishing and seafood dishes", "mountain hiking", "herding animals"]', 'fishing and seafood dishes', 1),
    (d_fri_maka_quiz, 'What is the relationship between the environment and culture of a community?', '["They are completely separate", "The environment influences the way of life and culture", "Culture has no connection to the land", "Only climate affects culture"]', 'The environment influences the way of life and culture', 2),
    (d_fri_maka_quiz, 'The Cordillera people of the mountains are known for their rice TERRACES. This shows how ___ influenced their culture.', '["the ocean", "the mountains and land", "the desert", "the lowlands"]', 'the mountains and land', 3),
    (d_fri_maka_quiz, 'Which BEST explains why coastal communities eat a lot of fish?', '["Because they do not like vegetables", "Because fish is cheap everywhere", "Because their environment (sea) provides fish as a natural resource", "Because their culture forbids other food"]', 'Because their environment (sea) provides fish as a natural resource', 4),
    (d_fri_maka_quiz, 'Comparing cultures of different communities teaches us to ___.', '["think one culture is better", "respect and appreciate differences", "ignore other cultures", "copy only one culture"]', 'respect and appreciate differences', 5),
    (d_fri_maka_quiz, 'A community''s KULTURA includes its ___.', '["only its food", "only its language", "way of life, beliefs, and customs shaped partly by its environment", "only its geography"]', 'way of life, beliefs, and customs shaped partly by its environment', 6),
    (d_fri_maka_quiz, 'Why do different regions of the Philippines have different cultures?', '["They all have the same environment", "They have different environments, histories, and peoples", "Culture never changes", "All Filipinos are the same"]', 'They have different environments, histories, and peoples', 7),
    (d_fri_maka_quiz, 'The MALONG worn by people in Mindanao is an example of a ___ shaped by their culture.', '["natural resource", "traditional garment", "school subject", "farming tool"]', 'traditional garment', 8),
    (d_fri_maka_quiz, 'People in flat lowlands often build their livelihood around ___.', '["fishing only", "mountaineering", "rice farming and agriculture", "hunting in forests"]', 'rice farming and agriculture', 9),
    (d_fri_maka_quiz, 'Learning about the culture of other communities helps us ___.', '["feel superior to others", "become more understanding and respectful", "ignore our own culture", "forget our traditions"]', 'become more understanding and respectful', 10),
    (d_fri_maka_quiz, 'What does ''kultura'' mean in Filipino?', '["Weather", "Way of life, beliefs, and customs of a group of people", "Language only", "Food only"]', 'Way of life, beliefs, and customs of a group of people', 11);

  -- Friday / Mathematics
  d_fri_math_day := d_fri_comp_day;
  INSERT INTO content_quizzes (content_day_id, subject)
    VALUES (d_fri_math_day, 'Mathematics') RETURNING id INTO d_fri_math_quiz;
  INSERT INTO content_questions (content_quiz_id, prompt, options, correct_answer, sort_order) VALUES
    (d_fri_math_quiz, 'What unit do we use to measure the mass of a watermelon?', '["Centimeters", "Meters", "Grams", "Kilograms"]', 'Kilograms', 0),
    (d_fri_math_quiz, 'What unit do we use to measure the mass of a grain of rice?', '["Kilogram", "Gram", "Meter", "Liter"]', 'Gram', 1),
    (d_fri_math_quiz, '1 kilogram = ___ grams.', '["10", "100", "1000", "10000"]', '1000', 2),
    (d_fri_math_quiz, 'A bag of rice weighs 5 kg. How many grams is that?', '["500 g", "5000 g", "50 g", "5 g"]', '5000 g', 3),
    (d_fri_math_quiz, 'Which tool is used to measure mass?', '["Ruler", "Measuring tape", "Weighing scale", "Thermometer"]', 'Weighing scale', 4),
    (d_fri_math_quiz, 'Anna''s bag weighs 3 kg. Ben''s bag weighs 2500 g. Whose bag is heavier?', '["Anna''s", "Ben''s", "They are equal", "Cannot tell"]', 'Anna''s', 5),
    (d_fri_math_quiz, 'Estimate: which object has a mass of about 1 gram?', '["A watermelon", "A grain of sugar", "A bag of potatoes", "A large book"]', 'A grain of sugar', 6),
    (d_fri_math_quiz, 'A balance scale is used to ___.', '["measure temperature", "compare and measure mass", "measure length", "measure volume"]', 'compare and measure mass', 7),
    (d_fri_math_quiz, 'A chicken weighs 1500 g. How many kilograms and grams is that?', '["1 kg 500 g", "15 kg 0 g", "150 kg 0 g", "0 kg 1500 g \u2014 same as 1 kg 500 g"]', '1 kg 500 g', 8),
    (d_fri_math_quiz, 'Which is the heaviest?', '["A feather (about 1 g)", "A pencil (about 10 g)", "A brick (about 3 kg)", "A coin (about 5 g)"]', 'A brick (about 3 kg)', 9),
    (d_fri_math_quiz, 'Mia has 2 kg of flour. She uses 750 g. How much flour is left?', '["1250 g", "1750 g", "750 g", "2750 g"]', '1250 g', 10),
    (d_fri_math_quiz, 'What does ''estimate'' mean?', '["Measure exactly", "Make a careful guess", "Weigh on a scale", "Count one by one"]', 'Make a careful guess', 11);

  -- Friday / Science
  d_fri_scie_day := d_fri_comp_day;
  INSERT INTO content_quizzes (content_day_id, subject)
    VALUES (d_fri_scie_day, 'Science') RETURNING id INTO d_fri_scie_quiz;
  INSERT INTO content_questions (content_quiz_id, prompt, options, correct_answer, sort_order) VALUES
    (d_fri_scie_quiz, 'Which science skill involves using your senses to study something carefully?', '["Predicting", "Observing", "Measuring", "Classifying"]', 'Observing', 0),
    (d_fri_scie_quiz, 'When you say ''I think it will rain today because the clouds are dark,'' you are ___.', '["observing", "predicting", "measuring", "classifying"]', 'predicting', 1),
    (d_fri_scie_quiz, 'A scientist uses a ruler to find the length of a leaf. This is an example of ___.', '["predicting", "observing", "measuring", "inferring"]', 'measuring', 2),
    (d_fri_scie_quiz, 'Which of these is a LIVING thing?', '["Rock", "Water", "Plant", "Cloud"]', 'Plant', 3),
    (d_fri_scie_quiz, 'Which of these is NOT a characteristic of living things?', '["They grow", "They respond to their surroundings", "They reproduce", "They are always green"]', 'They are always green', 4),
    (d_fri_scie_quiz, '''I predict that the plant placed in the dark will die.'' This is a ___.', '["fact", "observation", "measurement", "prediction"]', 'prediction', 5),
    (d_fri_scie_quiz, 'A thermometer is used to ___.', '["measure length", "measure mass", "measure temperature", "measure volume"]', 'measure temperature', 6),
    (d_fri_scie_quiz, 'Which senses does a scientist use when OBSERVING?', '["Only sight", "Only hearing", "Sight, hearing, smell, touch, and taste (when safe)", "Only touch"]', 'Sight, hearing, smell, touch, and taste (when safe)', 7),
    (d_fri_scie_quiz, 'Classifying means ___.', '["counting objects", "measuring objects", "grouping objects according to their properties", "predicting what will happen"]', 'grouping objects according to their properties', 8),
    (d_fri_scie_quiz, 'A good scientific observation is ___.', '["a guess about what might happen", "a measurement in centimeters", "a careful description of what you actually see", "an explanation of why something happens"]', 'a careful description of what you actually see', 9),
    (d_fri_scie_quiz, 'Living things REPRODUCE, which means they ___.', '["eat food", "make more of their own kind", "breathe air", "grow bigger"]', 'make more of their own kind', 10),
    (d_fri_scie_quiz, 'Which tool is best for measuring the MASS of a small stone?', '["Ruler", "Thermometer", "Weighing scale", "Measuring cup"]', 'Weighing scale', 11);

END $g3$;

-- Grade 4 Week 12 (2026-08-31)
DO $g4$ DECLARE
  wid uuid;
  d_mon_engl_day uuid;
  d_mon_engl_quiz uuid;
  d_mon_math_day uuid;
  d_mon_math_quiz uuid;
  d_tue_fili_day uuid;
  d_tue_fili_quiz uuid;
  d_tue_scie_day uuid;
  d_tue_scie_quiz uuid;
  d_wed_aral_day uuid;
  d_wed_aral_quiz uuid;
  d_wed_epp__day uuid;
  d_wed_epp__quiz uuid;
  d_thu_gmrc_day uuid;
  d_thu_gmrc_quiz uuid;
  d_thu_mape_day uuid;
  d_thu_mape_quiz uuid;
  d_fri_aral_day uuid;
  d_fri_aral_quiz uuid;
  d_fri_engl_day uuid;
  d_fri_engl_quiz uuid;
  d_fri_epp__day uuid;
  d_fri_epp__quiz uuid;
  d_fri_fili_day uuid;
  d_fri_fili_quiz uuid;
  d_fri_gmrc_day uuid;
  d_fri_gmrc_quiz uuid;
  d_fri_mape_day uuid;
  d_fri_mape_quiz uuid;
  d_fri_math_day uuid;
  d_fri_math_quiz uuid;
  d_fri_scie_day uuid;
  d_fri_scie_quiz uuid;
BEGIN
  INSERT INTO content_weeks (grade, week_starting_date)
    VALUES (4, '2026-08-31') RETURNING id INTO wid;

  -- Monday
  INSERT INTO content_days (content_week_id, weekday)
    VALUES (wid, 'Monday') RETURNING id INTO d_mon_engl_day;
  INSERT INTO content_quizzes (content_day_id, subject)
    VALUES (d_mon_engl_day, 'English') RETURNING id INTO d_mon_engl_quiz;
  INSERT INTO content_questions (content_quiz_id, prompt, options, correct_answer, sort_order) VALUES
    (d_mon_engl_quiz, 'An ENUMERATION-DESCRIPTION text lists and describes ___.', '["only one thing", "many things and their details", "a sequence of steps", "a story with characters"]', 'many things and their details', 0),
    (d_mon_engl_quiz, '''First, second, third, and finally'' are words that show ___.', '["description", "sequence/order", "comparison", "cause and effect"]', 'sequence/order', 1),
    (d_mon_engl_quiz, 'Which word is a MULTISYLLABIC word with a prefix?', '["Run", "Book", "Unhappy", "Cat"]', 'Unhappy', 2),
    (d_mon_engl_quiz, 'What is the TOPIC of a text about ''the different foods eaten at Filipino birthdays''?', '["How to cook food", "Filipino birthday foods", "The history of birthdays", "Why people celebrate"]', 'Filipino birthday foods', 3),
    (d_mon_engl_quiz, 'Choose the sentence with CORRECT subject-verb agreement:', '["The children runs fast.", "The child run fast.", "The children run fast.", "The children running fast."]', 'The children run fast.', 4),
    (d_mon_engl_quiz, '''The adobo is salty, savory, and aromatic.'' This sentence DESCRIBES the adobo using ___.', '["numbers", "describing words (adjectives)", "action words", "pronouns"]', 'describing words (adjectives)', 5),
    (d_mon_engl_quiz, 'What does ENUMERATE mean in an enumeration-description text?', '["Tell a story", "List items one by one", "Give opinions", "Ask questions"]', 'List items one by one', 6),
    (d_mon_engl_quiz, 'Which word BEST completes: ''The ___ celebration included singing, dancing, and eating.''?', '["birthday", "sad", "quiet", "boring"]', 'birthday', 7),
    (d_mon_engl_quiz, 'A SUFFIX is added to the ___ of a word.', '["beginning", "middle", "end", "between two words"]', 'end', 8),
    (d_mon_engl_quiz, 'What is the PURPOSE of a description in a text?', '["To tell what happened first", "To give detailed information about a topic", "To ask a question", "To give an opinion"]', 'To give detailed information about a topic', 9),
    (d_mon_engl_quiz, 'Which is an AFFIXED word?', '["Book", "Run", "Joyful", "Sky"]', 'Joyful', 10),
    (d_mon_engl_quiz, 'In the text: ''There are many dishes at a Filipino feast. First, there is lechon…'' — which signal word shows enumeration?', '["There are", "Many", "First", "Feast"]', 'First', 11);

  -- Monday / Mathematics
  d_mon_math_day := d_mon_engl_day;
  INSERT INTO content_quizzes (content_day_id, subject)
    VALUES (d_mon_math_day, 'Mathematics') RETURNING id INTO d_mon_math_quiz;
  INSERT INTO content_questions (content_quiz_id, prompt, options, correct_answer, sort_order) VALUES
    (d_mon_math_quiz, 'Which fraction has a NUMERATOR smaller than its denominator?', '["Improper fraction", "Mixed number", "Proper fraction", "Whole number"]', 'Proper fraction', 0),
    (d_mon_math_quiz, 'What is 7/4 written as a MIXED NUMBER?', '["1 1/4", "1 3/4", "2 1/4", "1 2/4"]', '1 3/4', 1),
    (d_mon_math_quiz, 'What is 2 1/3 written as an IMPROPER FRACTION?', '["5/3", "7/3", "6/3", "4/3"]', '7/3', 2),
    (d_mon_math_quiz, 'Which fraction is EQUIVALENT to 1/2?', '["2/3", "3/4", "4/8", "5/6"]', '4/8', 3),
    (d_mon_math_quiz, 'A fraction in LOWEST TERMS has a GCF of the numerator and denominator equal to ___.', '["0", "1", "2", "5"]', '1', 4),
    (d_mon_math_quiz, 'Which fraction shows the LARGEST part of a whole?', '["1/8", "1/4", "1/2", "1/3"]', '1/2', 5),
    (d_mon_math_quiz, 'Reduce 6/8 to lowest terms.', '["3/4", "2/3", "6/8", "1/2"]', '3/4', 6),
    (d_mon_math_quiz, 'Which pair of fractions is EQUIVALENT?', '["1/2 and 2/5", "3/4 and 6/8", "2/3 and 4/5", "1/3 and 2/5"]', '3/4 and 6/8', 7),
    (d_mon_math_quiz, 'What does the DENOMINATOR of a fraction tell us?', '["How many parts are taken", "How many equal parts the whole is divided into", "The value of the fraction", "The size of each part only"]', 'How many equal parts the whole is divided into', 8),
    (d_mon_math_quiz, '2/5 compared to 4/10: which is GREATER?', '["2/5", "4/10", "They are equal", "Cannot compare"]', 'They are equal', 9),
    (d_mon_math_quiz, 'What fraction represents 3 out of 8 equal parts?', '["8/3", "3/5", "3/8", "5/8"]', '3/8', 10),
    (d_mon_math_quiz, 'Which is an IMPROPER FRACTION?', '["3/4", "1/2", "9/4", "2/6"]', '9/4', 11);

  -- Tuesday
  INSERT INTO content_days (content_week_id, weekday)
    VALUES (wid, 'Tuesday') RETURNING id INTO d_tue_fili_day;
  INSERT INTO content_quizzes (content_day_id, subject)
    VALUES (d_tue_fili_day, 'Filipino') RETURNING id INTO d_tue_fili_quiz;
  INSERT INTO content_questions (content_quiz_id, prompt, options, correct_answer, sort_order) VALUES
    (d_tue_fili_quiz, 'Ang ALAMAT ay isang uri ng kuwento na nagpapaliwanag ng ___.', '["mga aral sa buhay", "pinagmulan ng isang bagay o kababalaghan", "tunay na pangyayari sa kasaysayan", "mga tuntunin sa paaralan"]', 'pinagmulan ng isang bagay o kababalaghan', 0),
    (d_tue_fili_quiz, 'Ang PABULA ay isang maikling kuwento na ang mga tauhan ay ___.', '["mga tao lamang", "mga hayop na nagsasalita", "mga diwata", "mga bayani"]', 'mga hayop na nagsasalita', 1),
    (d_tue_fili_quiz, 'Ano ang layunin ng PARABULA?', '["Magbigay ng impormasyon", "Magbigay ng aral sa pamamagitan ng halimbawa", "Magsalaysay ng kasaysayan", "Maglaro ng salita"]', 'Magbigay ng aral sa pamamagitan ng halimbawa', 2),
    (d_tue_fili_quiz, 'Sa pabula ng ''Pagong at Matsing,'' ano ang aral?', '["Mabilis ang palaging nananalo", "Ang katapatan at tiyaga ay mas mahalaga kaysa talento", "Ang matalino ay laging panalo", "Huwag magtiwala sa sinuman"]', 'Ang katapatan at tiyaga ay mas mahalaga kaysa talento', 3),
    (d_tue_fili_quiz, 'Ang ANEKDOTA ay isang maikling ___.', '["tulang may tugma", "kwentong nagtatanghal ng katangian ng isang tao", "kabanata ng nobela", "paliwanag ng agham"]', 'kwentong nagtatanghal ng katangian ng isang tao', 4),
    (d_tue_fili_quiz, 'Ang ''deskriptibong talata'' ay nagbibigay ng detalyadong ___ ng isang tao, lugar, o bagay.', '["kasaysayan", "paglalarawan", "talaan", "tanong"]', 'paglalarawan', 5),
    (d_tue_fili_quiz, 'Alin ang PANG-URI sa pangungusap: ''Ang malakas na ulan ay bumaha sa lansangan.''?', '["ulan", "bumaha", "lansangan", "malakas"]', 'malakas', 6),
    (d_tue_fili_quiz, 'Paano mo malalaman kung ang pahayag ay katotohanan o opinyon?', '["Kung ito ay may makulay na salita", "Ang katotohanan ay maaaring patunayan; ang opinyon ay saloobin", "Kung ito ay mahabang pangungusap", "Kung may salitang ''at'' ito"]', 'Ang katotohanan ay maaaring patunayan; ang opinyon ay saloobin', 7),
    (d_tue_fili_quiz, 'Sa pagbabago ng salita gamit ang panlapi: ''basa'' + ''-in'' = ___?', '["basain", "ibasa", "nabasa", "magbasa"]', 'basain', 8),
    (d_tue_fili_quiz, 'Ang ''pagpapahayag ng sariling saloobin'' ay isang kasanayang ___.', '["pakikinig", "pagsasalita", "pagbasa", "panonood"]', 'pagsasalita', 9),
    (d_tue_fili_quiz, 'Sa pagsulat ng talatang deskriptibo, ang UNANG hakbang ay ___.', '["isulat ang konklusyon", "tukuyin ang paksa o bagay na ilalarawan", "ilagay ang mga ebidensya", "lagyan ng pamagat"]', 'tukuyin ang paksa o bagay na ilalarawan', 10),
    (d_tue_fili_quiz, 'Ang salitang ''nagdadala'' ay naglalaman ng panlaping ___.', '["-in", "-an", "nag-", "um-"]', 'nag-', 11);

  -- Tuesday / Science
  d_tue_scie_day := d_tue_fili_day;
  INSERT INTO content_quizzes (content_day_id, subject)
    VALUES (d_tue_scie_day, 'Science') RETURNING id INTO d_tue_scie_quiz;
  INSERT INTO content_questions (content_quiz_id, prompt, options, correct_answer, sort_order) VALUES
    (d_tue_scie_quiz, 'Which organ system breaks down food so the body can use it?', '["Respiratory system", "Circulatory system", "Digestive system", "Nervous system"]', 'Digestive system', 0),
    (d_tue_scie_quiz, 'The HEART is the main organ of which system?', '["Digestive system", "Respiratory system", "Circulatory system", "Skeletal system"]', 'Circulatory system', 1),
    (d_tue_scie_quiz, 'Which organs are part of the RESPIRATORY SYSTEM?', '["Stomach and intestines", "Lungs and airways", "Heart and blood vessels", "Brain and nerves"]', 'Lungs and airways', 2),
    (d_tue_scie_quiz, 'What does the RESPIRATORY SYSTEM do?', '["Pumps blood to the body", "Breaks down food", "Takes in oxygen and releases carbon dioxide", "Sends nerve signals"]', 'Takes in oxygen and releases carbon dioxide', 3),
    (d_tue_scie_quiz, 'Blood carries oxygen and nutrients to all body parts through the ___ system.', '["digestive", "respiratory", "nervous", "circulatory"]', 'circulatory', 4),
    (d_tue_scie_quiz, 'What is the FIRST part of the digestive system where food enters?', '["Stomach", "Small intestine", "Esophagus", "Mouth"]', 'Mouth', 5),
    (d_tue_scie_quiz, 'The LUNGS are protected by the ___.', '["backbone", "skull", "rib cage", "pelvis"]', 'rib cage', 6),
    (d_tue_scie_quiz, 'Which organ pumps blood through the body?', '["Liver", "Lungs", "Stomach", "Heart"]', 'Heart', 7),
    (d_tue_scie_quiz, 'What happens to food in the STOMACH?', '["It is absorbed into the blood", "It is mixed with gastric acid and broken down further", "It is pumped to the lungs", "It is released from the body"]', 'It is mixed with gastric acid and broken down further', 8),
    (d_tue_scie_quiz, 'The three body systems — digestive, respiratory, and circulatory — work TOGETHER to ___.', '["keep us asleep", "provide nutrients and oxygen to all body cells", "produce bones", "control breathing only"]', 'provide nutrients and oxygen to all body cells', 9),
    (d_tue_scie_quiz, 'Which organ absorbs most nutrients into the bloodstream?', '["Stomach", "Large intestine", "Small intestine", "Esophagus"]', 'Small intestine', 10),
    (d_tue_scie_quiz, 'What does the CIRCULATORY system carry to all body parts?', '["Only water", "Only food", "Oxygen and nutrients (via blood)", "Only waste"]', 'Oxygen and nutrients (via blood)', 11);

  -- Wednesday
  INSERT INTO content_days (content_week_id, weekday)
    VALUES (wid, 'Wednesday') RETURNING id INTO d_wed_aral_day;
  INSERT INTO content_quizzes (content_day_id, subject)
    VALUES (d_wed_aral_day, 'Araling Panlipunan') RETURNING id INTO d_wed_aral_quiz;
  INSERT INTO content_questions (content_quiz_id, prompt, options, correct_answer, sort_order) VALUES
    (d_wed_aral_quiz, 'Ang Pilipinas ay matatagpuan sa ___ bahagi ng Asya.', '["Hilaga", "Timog", "Silangan", "Timog-Silangan"]', 'Timog-Silangan', 0),
    (d_wed_aral_quiz, 'Ang Pilipinas ay binubuo ng halos ___ pulo.', '["700", "1000", "7,641", "10,000"]', '7,641', 1),
    (d_wed_aral_quiz, 'Ang pinakamataas na bundok sa Pilipinas ay ___.', '["Mayon", "Apo", "Pulag", "Kanlaon"]', 'Apo', 2),
    (d_wed_aral_quiz, 'Ang Dagat Pasipiko ay nasa ___ ng Pilipinas.', '["Kanluran", "Silangan", "Hilaga", "Timog"]', 'Silangan', 3),
    (d_wed_aral_quiz, 'Ang Dagat Timog Tsina ay nasa ___ ng Pilipinas.', '["Silangan", "Hilaga", "Kanluran", "Timog"]', 'Kanluran', 4),
    (d_wed_aral_quiz, 'Ang KAPULUAN ay isang grupo ng ___.', '["kabundukan", "mga lawa", "mga pulo", "mga ilog"]', 'mga pulo', 5),
    (d_wed_aral_quiz, 'Ang pisikal na heograpiya ay tumutukoy sa ___.', '["mga tao at lipunan", "likas na katangian ng lugar tulad ng bundok at ilog", "mga lungsod at bayan", "kasaysayan ng isang lugar"]', 'likas na katangian ng lugar tulad ng bundok at ilog', 6),
    (d_wed_aral_quiz, 'Alin ang PINAKAMAHABANG ilog sa Pilipinas?', '["Pasig", "Pampanga", "Cagayan", "Marikina"]', 'Cagayan', 7),
    (d_wed_aral_quiz, 'Ang LOKASYON ng Pilipinas sa mapa ay matatagpuan sa pagitan ng ___.', '["0\u00b0 at 10\u00b0 Hilaga, 110\u00b0 at 120\u00b0 Silangan", "4\u00b0 at 21\u00b0 Hilaga, 116\u00b0 at 127\u00b0 Silangan", "10\u00b0 at 30\u00b0 Hilaga, 100\u00b0 at 130\u00b0 Silangan", "20\u00b0 at 40\u00b0 Hilaga, 120\u00b0 at 140\u00b0 Silangan"]', '4° at 21° Hilaga, 116° at 127° Silangan', 8),
    (d_wed_aral_quiz, 'Ang RELATIBONG LOKASYON ay nagpapaliwanag kung saan ang isang lugar ___.', '["gamit ang longitude at latitude", "kaugnay ng ibang kilalang lugar", "batay sa sukat ng mapa", "ayon sa kasaysayan"]', 'kaugnay ng ibang kilalang lugar', 9),
    (d_wed_aral_quiz, 'Ang Pilipinas ay may ___ pangunahing pangkat ng kapuluan.', '["2", "3", "4", "5"]', '3', 10),
    (d_wed_aral_quiz, 'Ang tatlong pangunahing pangkat ng kapuluan ng Pilipinas ay ___.', '["Luzon, Cebu, Davao", "Luzon, Visayas, Mindanao", "Luzon, Palawan, Mindanao", "Visayas, Palawan, Davao"]', 'Luzon, Visayas, Mindanao', 11);

  -- Wednesday / EPP (ICT)
  d_wed_epp__day := d_wed_aral_day;
  INSERT INTO content_quizzes (content_day_id, subject)
    VALUES (d_wed_epp__day, 'EPP (ICT)') RETURNING id INTO d_wed_epp__quiz;
  INSERT INTO content_questions (content_quiz_id, prompt, options, correct_answer, sort_order) VALUES
    (d_wed_epp__quiz, 'What is the BRAIN of the computer called?', '["Monitor", "CPU (Central Processing Unit)", "Keyboard", "Printer"]', 'CPU (Central Processing Unit)', 0),
    (d_wed_epp__quiz, 'The MONITOR is used to ___.', '["type text", "display information", "print documents", "store data"]', 'display information', 1),
    (d_wed_epp__quiz, 'Which device lets you move the cursor on the screen?', '["Keyboard", "Printer", "Mouse", "Monitor"]', 'Mouse', 2),
    (d_wed_epp__quiz, 'To SHUTDOWN a computer correctly, you should ___.', '["just press the power button while working", "use the Start/Apple menu and choose Shut Down", "unplug the power cable", "close all windows and then wait"]', 'use the Start/Apple menu and choose Shut Down', 3),
    (d_wed_epp__quiz, 'What does INPUT mean in computing?', '["Data that comes OUT of the computer", "Data that goes INTO the computer", "The screen display", "The storage of the computer"]', 'Data that goes INTO the computer', 4),
    (d_wed_epp__quiz, 'Which of these is an INPUT DEVICE?', '["Monitor", "Printer", "Speaker", "Keyboard"]', 'Keyboard', 5),
    (d_wed_epp__quiz, 'Which of these is an OUTPUT DEVICE?', '["Keyboard", "Mouse", "Scanner", "Printer"]', 'Printer', 6),
    (d_wed_epp__quiz, '''Booting'' a computer means ___.', '["turning it off", "starting/turning it on so it loads the operating system", "saving a file", "connecting to the internet"]', 'starting/turning it on so it loads the operating system', 7),
    (d_wed_epp__quiz, 'What is HARDWARE?', '["Software programs installed on the computer", "Physical parts of the computer you can touch", "The files saved on the computer", "The internet connection"]', 'Physical parts of the computer you can touch', 8),
    (d_wed_epp__quiz, 'What is SOFTWARE?', '["The physical parts of a computer", "Programs and applications that run on the computer", "The power supply of a computer", "The keyboard and mouse"]', 'Programs and applications that run on the computer', 9),
    (d_wed_epp__quiz, 'Which keyboarding technique keeps the fingers resting on the HOME ROW keys?', '["Hunt and peck", "Touch typing", "One-finger typing", "Speed typing"]', 'Touch typing', 10),
    (d_wed_epp__quiz, 'Why is it important to hold the mouse with a RELAXED GRIP?', '["To type faster", "To prevent strain and control the cursor more accurately", "To make the computer faster", "To charge the battery"]', 'To prevent strain and control the cursor more accurately', 11);

  -- Thursday
  INSERT INTO content_days (content_week_id, weekday)
    VALUES (wid, 'Thursday') RETURNING id INTO d_thu_gmrc_day;
  INSERT INTO content_quizzes (content_day_id, subject)
    VALUES (d_thu_gmrc_day, 'GMRC') RETURNING id INTO d_thu_gmrc_quiz;
  INSERT INTO content_questions (content_quiz_id, prompt, options, correct_answer, sort_order) VALUES
    (d_thu_gmrc_quiz, 'SELF-DISCIPLINE means ___.', '["doing only what is fun", "controlling your impulses and choosing what is right", "always following friends", "letting others decide for you"]', 'controlling your impulses and choosing what is right', 0),
    (d_thu_gmrc_quiz, 'Ana set a study schedule and follows it every day. She shows good ___.', '["irresponsibility", "self-discipline", "boasting", "selfishness"]', 'self-discipline', 1),
    (d_thu_gmrc_quiz, 'Knowing your OWN STRENGTHS helps you ___.', '["compare yourself to others", "ignore your weaknesses", "use your abilities to help others and grow", "boast about yourself"]', 'use your abilities to help others and grow', 2),
    (d_thu_gmrc_quiz, 'Taking RESPONSIBILITY for your actions means ___.', '["blaming others when things go wrong", "accepting the results of your choices", "always waiting for others to decide", "doing nothing"]', 'accepting the results of your choices', 3),
    (d_thu_gmrc_quiz, 'When you MANAGE YOUR TIME well, you can ___.', '["do everything last minute", "finish tasks without rushing and have time for leisure", "skip important duties", "always depend on others"]', 'finish tasks without rushing and have time for leisure', 4),
    (d_thu_gmrc_quiz, 'A student who saves part of their allowance shows good ___.', '["spending habits", "self-discipline in managing money", "greediness", "laziness"]', 'self-discipline in managing money', 5),
    (d_thu_gmrc_quiz, 'Which is an example of being RESPONSIBLE with school materials?', '["Leaving your bag anywhere", "Taking care of your books and supplies", "Lending all your materials without care", "Losing your pencils often"]', 'Taking care of your books and supplies', 6),
    (d_thu_gmrc_quiz, 'Admitting a mistake shows ___.', '["weakness", "cowardice", "integrity and courage", "laziness"]', 'integrity and courage', 7),
    (d_thu_gmrc_quiz, 'Which of these shows POOR SELF-DISCIPLINE?', '["Finishing homework before playing", "Studying for a quiz", "Procrastinating on assignments", "Following a schedule"]', 'Procrastinating on assignments', 8),
    (d_thu_gmrc_quiz, '''I will study first before I play.'' This statement shows ___.', '["poor decision making", "self-discipline and setting priorities", "disobedience", "irresponsibility"]', 'self-discipline and setting priorities', 9),
    (d_thu_gmrc_quiz, 'Setting GOALS helps you ___.', '["waste time", "stay focused and work toward what is important", "be lazy", "ignore your duties"]', 'stay focused and work toward what is important', 10),
    (d_thu_gmrc_quiz, 'Which best describes an ACCOUNTABLE person?', '["One who blames others", "One who takes ownership of their actions", "One who never admits mistakes", "One who avoids responsibilities"]', 'One who takes ownership of their actions', 11);

  -- Thursday / MAPEH
  d_thu_mape_day := d_thu_gmrc_day;
  INSERT INTO content_quizzes (content_day_id, subject)
    VALUES (d_thu_mape_day, 'MAPEH') RETURNING id INTO d_thu_mape_quiz;
  INSERT INTO content_questions (content_quiz_id, prompt, options, correct_answer, sort_order) VALUES
    (d_thu_mape_quiz, 'TIMBRE in music refers to ___.', '["how loud or soft a sound is", "the unique quality or ''color'' of a sound that identifies it", "how fast music is played", "the rhythm of a song"]', 'the unique quality or ''color'' of a sound that identifies it', 0),
    (d_thu_mape_quiz, 'DYNAMICS in music refers to ___.', '["the speed of music", "the pitch of notes", "the volume (loudness or softness) of music", "the rhythm pattern"]', 'the volume (loudness or softness) of music', 1),
    (d_thu_mape_quiz, 'What is the musical symbol for PIANO (p)?', '["Very loud", "Loud", "Soft", "Very soft"]', 'Soft', 2),
    (d_thu_mape_quiz, 'Forte (f) in music means ___.', '["very soft", "soft", "loud", "very loud"]', 'loud', 3),
    (d_thu_mape_quiz, 'Which of these is a LOCAL MUSICAL PERFORMANCE style from your region?', '["Opera", "Harana (Philippine serenade)", "Jazz", "Orchestra"]', 'Harana (Philippine serenade)', 4),
    (d_thu_mape_quiz, 'In Physical Education, TARGET GAMES involve ___.', '["running as fast as possible", "throwing or hitting an object at a target", "swimming laps", "dancing in groups"]', 'throwing or hitting an object at a target', 5),
    (d_thu_mape_quiz, 'PERSONAL HEALTH includes ___.', '["only brushing teeth", "hygiene, proper nutrition, rest, and exercise", "only exercise", "only eating well"]', 'hygiene, proper nutrition, rest, and exercise', 6),
    (d_thu_mape_quiz, 'What is a key rule of GOOD SPORTSMANSHIP in PE?', '["Winning at all costs", "Respecting opponents and accepting results gracefully", "Cheating to win", "Refusing to play fair"]', 'Respecting opponents and accepting results gracefully', 7),
    (d_thu_mape_quiz, 'The ARTS of a culture often reflect its ___.', '["technology", "history and way of life", "only its religion", "only its economy"]', 'history and way of life', 8),
    (d_thu_mape_quiz, 'Which is an example of VISUAL ART from the Philippines?', '["Rondalla", "Parol (lantern)", "Harana", "Kundiman"]', 'Parol (lantern)', 9),
    (d_thu_mape_quiz, 'Getting enough SLEEP helps the body ___.', '["stay weak", "grow, repair, and stay healthy", "become less active", "forget information"]', 'grow, repair, and stay healthy', 10),
    (d_thu_mape_quiz, 'Which exercise develops CARDIOVASCULAR fitness?', '["Jogging", "Sitting", "Reading", "Sleeping"]', 'Jogging', 11);

  -- Friday
  INSERT INTO content_days (content_week_id, weekday)
    VALUES (wid, 'Friday') RETURNING id INTO d_fri_aral_day;
  INSERT INTO content_quizzes (content_day_id, subject)
    VALUES (d_fri_aral_day, 'Araling Panlipunan') RETURNING id INTO d_fri_aral_quiz;
  INSERT INTO content_questions (content_quiz_id, prompt, options, correct_answer, sort_order) VALUES
    (d_fri_aral_quiz, 'Ang Pilipinas ay matatagpuan sa ___ bahagi ng Asya.', '["Hilaga", "Timog", "Silangan", "Timog-Silangan"]', 'Timog-Silangan', 0),
    (d_fri_aral_quiz, 'Ang Pilipinas ay binubuo ng halos ___ pulo.', '["700", "1000", "7,641", "10,000"]', '7,641', 1),
    (d_fri_aral_quiz, 'Ang pinakamataas na bundok sa Pilipinas ay ___.', '["Mayon", "Apo", "Pulag", "Kanlaon"]', 'Apo', 2),
    (d_fri_aral_quiz, 'Ang Dagat Pasipiko ay nasa ___ ng Pilipinas.', '["Kanluran", "Silangan", "Hilaga", "Timog"]', 'Silangan', 3),
    (d_fri_aral_quiz, 'Ang Dagat Timog Tsina ay nasa ___ ng Pilipinas.', '["Silangan", "Hilaga", "Kanluran", "Timog"]', 'Kanluran', 4),
    (d_fri_aral_quiz, 'Ang KAPULUAN ay isang grupo ng ___.', '["kabundukan", "mga lawa", "mga pulo", "mga ilog"]', 'mga pulo', 5),
    (d_fri_aral_quiz, 'Ang pisikal na heograpiya ay tumutukoy sa ___.', '["mga tao at lipunan", "likas na katangian ng lugar tulad ng bundok at ilog", "mga lungsod at bayan", "kasaysayan ng isang lugar"]', 'likas na katangian ng lugar tulad ng bundok at ilog', 6),
    (d_fri_aral_quiz, 'Alin ang PINAKAMAHABANG ilog sa Pilipinas?', '["Pasig", "Pampanga", "Cagayan", "Marikina"]', 'Cagayan', 7),
    (d_fri_aral_quiz, 'Ang LOKASYON ng Pilipinas sa mapa ay matatagpuan sa pagitan ng ___.', '["0\u00b0 at 10\u00b0 Hilaga, 110\u00b0 at 120\u00b0 Silangan", "4\u00b0 at 21\u00b0 Hilaga, 116\u00b0 at 127\u00b0 Silangan", "10\u00b0 at 30\u00b0 Hilaga, 100\u00b0 at 130\u00b0 Silangan", "20\u00b0 at 40\u00b0 Hilaga, 120\u00b0 at 140\u00b0 Silangan"]', '4° at 21° Hilaga, 116° at 127° Silangan', 8),
    (d_fri_aral_quiz, 'Ang RELATIBONG LOKASYON ay nagpapaliwanag kung saan ang isang lugar ___.', '["gamit ang longitude at latitude", "kaugnay ng ibang kilalang lugar", "batay sa sukat ng mapa", "ayon sa kasaysayan"]', 'kaugnay ng ibang kilalang lugar', 9),
    (d_fri_aral_quiz, 'Ang Pilipinas ay may ___ pangunahing pangkat ng kapuluan.', '["2", "3", "4", "5"]', '3', 10),
    (d_fri_aral_quiz, 'Ang tatlong pangunahing pangkat ng kapuluan ng Pilipinas ay ___.', '["Luzon, Cebu, Davao", "Luzon, Visayas, Mindanao", "Luzon, Palawan, Mindanao", "Visayas, Palawan, Davao"]', 'Luzon, Visayas, Mindanao', 11);

  -- Friday / English
  d_fri_engl_day := d_fri_aral_day;
  INSERT INTO content_quizzes (content_day_id, subject)
    VALUES (d_fri_engl_day, 'English') RETURNING id INTO d_fri_engl_quiz;
  INSERT INTO content_questions (content_quiz_id, prompt, options, correct_answer, sort_order) VALUES
    (d_fri_engl_quiz, 'An ENUMERATION-DESCRIPTION text lists and describes ___.', '["only one thing", "many things and their details", "a sequence of steps", "a story with characters"]', 'many things and their details', 0),
    (d_fri_engl_quiz, '''First, second, third, and finally'' are words that show ___.', '["description", "sequence/order", "comparison", "cause and effect"]', 'sequence/order', 1),
    (d_fri_engl_quiz, 'Which word is a MULTISYLLABIC word with a prefix?', '["Run", "Book", "Unhappy", "Cat"]', 'Unhappy', 2),
    (d_fri_engl_quiz, 'What is the TOPIC of a text about ''the different foods eaten at Filipino birthdays''?', '["How to cook food", "Filipino birthday foods", "The history of birthdays", "Why people celebrate"]', 'Filipino birthday foods', 3),
    (d_fri_engl_quiz, 'Choose the sentence with CORRECT subject-verb agreement:', '["The children runs fast.", "The child run fast.", "The children run fast.", "The children running fast."]', 'The children run fast.', 4),
    (d_fri_engl_quiz, '''The adobo is salty, savory, and aromatic.'' This sentence DESCRIBES the adobo using ___.', '["numbers", "describing words (adjectives)", "action words", "pronouns"]', 'describing words (adjectives)', 5),
    (d_fri_engl_quiz, 'What does ENUMERATE mean in an enumeration-description text?', '["Tell a story", "List items one by one", "Give opinions", "Ask questions"]', 'List items one by one', 6),
    (d_fri_engl_quiz, 'Which word BEST completes: ''The ___ celebration included singing, dancing, and eating.''?', '["birthday", "sad", "quiet", "boring"]', 'birthday', 7),
    (d_fri_engl_quiz, 'A SUFFIX is added to the ___ of a word.', '["beginning", "middle", "end", "between two words"]', 'end', 8),
    (d_fri_engl_quiz, 'What is the PURPOSE of a description in a text?', '["To tell what happened first", "To give detailed information about a topic", "To ask a question", "To give an opinion"]', 'To give detailed information about a topic', 9),
    (d_fri_engl_quiz, 'Which is an AFFIXED word?', '["Book", "Run", "Joyful", "Sky"]', 'Joyful', 10),
    (d_fri_engl_quiz, 'In the text: ''There are many dishes at a Filipino feast. First, there is lechon…'' — which signal word shows enumeration?', '["There are", "Many", "First", "Feast"]', 'First', 11);

  -- Friday / EPP (ICT)
  d_fri_epp__day := d_fri_aral_day;
  INSERT INTO content_quizzes (content_day_id, subject)
    VALUES (d_fri_epp__day, 'EPP (ICT)') RETURNING id INTO d_fri_epp__quiz;
  INSERT INTO content_questions (content_quiz_id, prompt, options, correct_answer, sort_order) VALUES
    (d_fri_epp__quiz, 'What is the BRAIN of the computer called?', '["Monitor", "CPU (Central Processing Unit)", "Keyboard", "Printer"]', 'CPU (Central Processing Unit)', 0),
    (d_fri_epp__quiz, 'The MONITOR is used to ___.', '["type text", "display information", "print documents", "store data"]', 'display information', 1),
    (d_fri_epp__quiz, 'Which device lets you move the cursor on the screen?', '["Keyboard", "Printer", "Mouse", "Monitor"]', 'Mouse', 2),
    (d_fri_epp__quiz, 'To SHUTDOWN a computer correctly, you should ___.', '["just press the power button while working", "use the Start/Apple menu and choose Shut Down", "unplug the power cable", "close all windows and then wait"]', 'use the Start/Apple menu and choose Shut Down', 3),
    (d_fri_epp__quiz, 'What does INPUT mean in computing?', '["Data that comes OUT of the computer", "Data that goes INTO the computer", "The screen display", "The storage of the computer"]', 'Data that goes INTO the computer', 4),
    (d_fri_epp__quiz, 'Which of these is an INPUT DEVICE?', '["Monitor", "Printer", "Speaker", "Keyboard"]', 'Keyboard', 5),
    (d_fri_epp__quiz, 'Which of these is an OUTPUT DEVICE?', '["Keyboard", "Mouse", "Scanner", "Printer"]', 'Printer', 6),
    (d_fri_epp__quiz, '''Booting'' a computer means ___.', '["turning it off", "starting/turning it on so it loads the operating system", "saving a file", "connecting to the internet"]', 'starting/turning it on so it loads the operating system', 7),
    (d_fri_epp__quiz, 'What is HARDWARE?', '["Software programs installed on the computer", "Physical parts of the computer you can touch", "The files saved on the computer", "The internet connection"]', 'Physical parts of the computer you can touch', 8),
    (d_fri_epp__quiz, 'What is SOFTWARE?', '["The physical parts of a computer", "Programs and applications that run on the computer", "The power supply of a computer", "The keyboard and mouse"]', 'Programs and applications that run on the computer', 9),
    (d_fri_epp__quiz, 'Which keyboarding technique keeps the fingers resting on the HOME ROW keys?', '["Hunt and peck", "Touch typing", "One-finger typing", "Speed typing"]', 'Touch typing', 10),
    (d_fri_epp__quiz, 'Why is it important to hold the mouse with a RELAXED GRIP?', '["To type faster", "To prevent strain and control the cursor more accurately", "To make the computer faster", "To charge the battery"]', 'To prevent strain and control the cursor more accurately', 11);

  -- Friday / Filipino
  d_fri_fili_day := d_fri_aral_day;
  INSERT INTO content_quizzes (content_day_id, subject)
    VALUES (d_fri_fili_day, 'Filipino') RETURNING id INTO d_fri_fili_quiz;
  INSERT INTO content_questions (content_quiz_id, prompt, options, correct_answer, sort_order) VALUES
    (d_fri_fili_quiz, 'Ang ALAMAT ay isang uri ng kuwento na nagpapaliwanag ng ___.', '["mga aral sa buhay", "pinagmulan ng isang bagay o kababalaghan", "tunay na pangyayari sa kasaysayan", "mga tuntunin sa paaralan"]', 'pinagmulan ng isang bagay o kababalaghan', 0),
    (d_fri_fili_quiz, 'Ang PABULA ay isang maikling kuwento na ang mga tauhan ay ___.', '["mga tao lamang", "mga hayop na nagsasalita", "mga diwata", "mga bayani"]', 'mga hayop na nagsasalita', 1),
    (d_fri_fili_quiz, 'Ano ang layunin ng PARABULA?', '["Magbigay ng impormasyon", "Magbigay ng aral sa pamamagitan ng halimbawa", "Magsalaysay ng kasaysayan", "Maglaro ng salita"]', 'Magbigay ng aral sa pamamagitan ng halimbawa', 2),
    (d_fri_fili_quiz, 'Sa pabula ng ''Pagong at Matsing,'' ano ang aral?', '["Mabilis ang palaging nananalo", "Ang katapatan at tiyaga ay mas mahalaga kaysa talento", "Ang matalino ay laging panalo", "Huwag magtiwala sa sinuman"]', 'Ang katapatan at tiyaga ay mas mahalaga kaysa talento', 3),
    (d_fri_fili_quiz, 'Ang ANEKDOTA ay isang maikling ___.', '["tulang may tugma", "kwentong nagtatanghal ng katangian ng isang tao", "kabanata ng nobela", "paliwanag ng agham"]', 'kwentong nagtatanghal ng katangian ng isang tao', 4),
    (d_fri_fili_quiz, 'Ang ''deskriptibong talata'' ay nagbibigay ng detalyadong ___ ng isang tao, lugar, o bagay.', '["kasaysayan", "paglalarawan", "talaan", "tanong"]', 'paglalarawan', 5),
    (d_fri_fili_quiz, 'Alin ang PANG-URI sa pangungusap: ''Ang malakas na ulan ay bumaha sa lansangan.''?', '["ulan", "bumaha", "lansangan", "malakas"]', 'malakas', 6),
    (d_fri_fili_quiz, 'Paano mo malalaman kung ang pahayag ay katotohanan o opinyon?', '["Kung ito ay may makulay na salita", "Ang katotohanan ay maaaring patunayan; ang opinyon ay saloobin", "Kung ito ay mahabang pangungusap", "Kung may salitang ''at'' ito"]', 'Ang katotohanan ay maaaring patunayan; ang opinyon ay saloobin', 7),
    (d_fri_fili_quiz, 'Sa pagbabago ng salita gamit ang panlapi: ''basa'' + ''-in'' = ___?', '["basain", "ibasa", "nabasa", "magbasa"]', 'basain', 8),
    (d_fri_fili_quiz, 'Ang ''pagpapahayag ng sariling saloobin'' ay isang kasanayang ___.', '["pakikinig", "pagsasalita", "pagbasa", "panonood"]', 'pagsasalita', 9),
    (d_fri_fili_quiz, 'Sa pagsulat ng talatang deskriptibo, ang UNANG hakbang ay ___.', '["isulat ang konklusyon", "tukuyin ang paksa o bagay na ilalarawan", "ilagay ang mga ebidensya", "lagyan ng pamagat"]', 'tukuyin ang paksa o bagay na ilalarawan', 10),
    (d_fri_fili_quiz, 'Ang salitang ''nagdadala'' ay naglalaman ng panlaping ___.', '["-in", "-an", "nag-", "um-"]', 'nag-', 11);

  -- Friday / GMRC
  d_fri_gmrc_day := d_fri_aral_day;
  INSERT INTO content_quizzes (content_day_id, subject)
    VALUES (d_fri_gmrc_day, 'GMRC') RETURNING id INTO d_fri_gmrc_quiz;
  INSERT INTO content_questions (content_quiz_id, prompt, options, correct_answer, sort_order) VALUES
    (d_fri_gmrc_quiz, 'SELF-DISCIPLINE means ___.', '["doing only what is fun", "controlling your impulses and choosing what is right", "always following friends", "letting others decide for you"]', 'controlling your impulses and choosing what is right', 0),
    (d_fri_gmrc_quiz, 'Ana set a study schedule and follows it every day. She shows good ___.', '["irresponsibility", "self-discipline", "boasting", "selfishness"]', 'self-discipline', 1),
    (d_fri_gmrc_quiz, 'Knowing your OWN STRENGTHS helps you ___.', '["compare yourself to others", "ignore your weaknesses", "use your abilities to help others and grow", "boast about yourself"]', 'use your abilities to help others and grow', 2),
    (d_fri_gmrc_quiz, 'Taking RESPONSIBILITY for your actions means ___.', '["blaming others when things go wrong", "accepting the results of your choices", "always waiting for others to decide", "doing nothing"]', 'accepting the results of your choices', 3),
    (d_fri_gmrc_quiz, 'When you MANAGE YOUR TIME well, you can ___.', '["do everything last minute", "finish tasks without rushing and have time for leisure", "skip important duties", "always depend on others"]', 'finish tasks without rushing and have time for leisure', 4),
    (d_fri_gmrc_quiz, 'A student who saves part of their allowance shows good ___.', '["spending habits", "self-discipline in managing money", "greediness", "laziness"]', 'self-discipline in managing money', 5),
    (d_fri_gmrc_quiz, 'Which is an example of being RESPONSIBLE with school materials?', '["Leaving your bag anywhere", "Taking care of your books and supplies", "Lending all your materials without care", "Losing your pencils often"]', 'Taking care of your books and supplies', 6),
    (d_fri_gmrc_quiz, 'Admitting a mistake shows ___.', '["weakness", "cowardice", "integrity and courage", "laziness"]', 'integrity and courage', 7),
    (d_fri_gmrc_quiz, 'Which of these shows POOR SELF-DISCIPLINE?', '["Finishing homework before playing", "Studying for a quiz", "Procrastinating on assignments", "Following a schedule"]', 'Procrastinating on assignments', 8),
    (d_fri_gmrc_quiz, '''I will study first before I play.'' This statement shows ___.', '["poor decision making", "self-discipline and setting priorities", "disobedience", "irresponsibility"]', 'self-discipline and setting priorities', 9),
    (d_fri_gmrc_quiz, 'Setting GOALS helps you ___.', '["waste time", "stay focused and work toward what is important", "be lazy", "ignore your duties"]', 'stay focused and work toward what is important', 10),
    (d_fri_gmrc_quiz, 'Which best describes an ACCOUNTABLE person?', '["One who blames others", "One who takes ownership of their actions", "One who never admits mistakes", "One who avoids responsibilities"]', 'One who takes ownership of their actions', 11);

  -- Friday / MAPEH
  d_fri_mape_day := d_fri_aral_day;
  INSERT INTO content_quizzes (content_day_id, subject)
    VALUES (d_fri_mape_day, 'MAPEH') RETURNING id INTO d_fri_mape_quiz;
  INSERT INTO content_questions (content_quiz_id, prompt, options, correct_answer, sort_order) VALUES
    (d_fri_mape_quiz, 'TIMBRE in music refers to ___.', '["how loud or soft a sound is", "the unique quality or ''color'' of a sound that identifies it", "how fast music is played", "the rhythm of a song"]', 'the unique quality or ''color'' of a sound that identifies it', 0),
    (d_fri_mape_quiz, 'DYNAMICS in music refers to ___.', '["the speed of music", "the pitch of notes", "the volume (loudness or softness) of music", "the rhythm pattern"]', 'the volume (loudness or softness) of music', 1),
    (d_fri_mape_quiz, 'What is the musical symbol for PIANO (p)?', '["Very loud", "Loud", "Soft", "Very soft"]', 'Soft', 2),
    (d_fri_mape_quiz, 'Forte (f) in music means ___.', '["very soft", "soft", "loud", "very loud"]', 'loud', 3),
    (d_fri_mape_quiz, 'Which of these is a LOCAL MUSICAL PERFORMANCE style from your region?', '["Opera", "Harana (Philippine serenade)", "Jazz", "Orchestra"]', 'Harana (Philippine serenade)', 4),
    (d_fri_mape_quiz, 'In Physical Education, TARGET GAMES involve ___.', '["running as fast as possible", "throwing or hitting an object at a target", "swimming laps", "dancing in groups"]', 'throwing or hitting an object at a target', 5),
    (d_fri_mape_quiz, 'PERSONAL HEALTH includes ___.', '["only brushing teeth", "hygiene, proper nutrition, rest, and exercise", "only exercise", "only eating well"]', 'hygiene, proper nutrition, rest, and exercise', 6),
    (d_fri_mape_quiz, 'What is a key rule of GOOD SPORTSMANSHIP in PE?', '["Winning at all costs", "Respecting opponents and accepting results gracefully", "Cheating to win", "Refusing to play fair"]', 'Respecting opponents and accepting results gracefully', 7),
    (d_fri_mape_quiz, 'The ARTS of a culture often reflect its ___.', '["technology", "history and way of life", "only its religion", "only its economy"]', 'history and way of life', 8),
    (d_fri_mape_quiz, 'Which is an example of VISUAL ART from the Philippines?', '["Rondalla", "Parol (lantern)", "Harana", "Kundiman"]', 'Parol (lantern)', 9),
    (d_fri_mape_quiz, 'Getting enough SLEEP helps the body ___.', '["stay weak", "grow, repair, and stay healthy", "become less active", "forget information"]', 'grow, repair, and stay healthy', 10),
    (d_fri_mape_quiz, 'Which exercise develops CARDIOVASCULAR fitness?', '["Jogging", "Sitting", "Reading", "Sleeping"]', 'Jogging', 11);

  -- Friday / Mathematics
  d_fri_math_day := d_fri_aral_day;
  INSERT INTO content_quizzes (content_day_id, subject)
    VALUES (d_fri_math_day, 'Mathematics') RETURNING id INTO d_fri_math_quiz;
  INSERT INTO content_questions (content_quiz_id, prompt, options, correct_answer, sort_order) VALUES
    (d_fri_math_quiz, 'Which fraction has a NUMERATOR smaller than its denominator?', '["Improper fraction", "Mixed number", "Proper fraction", "Whole number"]', 'Proper fraction', 0),
    (d_fri_math_quiz, 'What is 7/4 written as a MIXED NUMBER?', '["1 1/4", "1 3/4", "2 1/4", "1 2/4"]', '1 3/4', 1),
    (d_fri_math_quiz, 'What is 2 1/3 written as an IMPROPER FRACTION?', '["5/3", "7/3", "6/3", "4/3"]', '7/3', 2),
    (d_fri_math_quiz, 'Which fraction is EQUIVALENT to 1/2?', '["2/3", "3/4", "4/8", "5/6"]', '4/8', 3),
    (d_fri_math_quiz, 'A fraction in LOWEST TERMS has a GCF of the numerator and denominator equal to ___.', '["0", "1", "2", "5"]', '1', 4),
    (d_fri_math_quiz, 'Which fraction shows the LARGEST part of a whole?', '["1/8", "1/4", "1/2", "1/3"]', '1/2', 5),
    (d_fri_math_quiz, 'Reduce 6/8 to lowest terms.', '["3/4", "2/3", "6/8", "1/2"]', '3/4', 6),
    (d_fri_math_quiz, 'Which pair of fractions is EQUIVALENT?', '["1/2 and 2/5", "3/4 and 6/8", "2/3 and 4/5", "1/3 and 2/5"]', '3/4 and 6/8', 7),
    (d_fri_math_quiz, 'What does the DENOMINATOR of a fraction tell us?', '["How many parts are taken", "How many equal parts the whole is divided into", "The value of the fraction", "The size of each part only"]', 'How many equal parts the whole is divided into', 8),
    (d_fri_math_quiz, '2/5 compared to 4/10: which is GREATER?', '["2/5", "4/10", "They are equal", "Cannot compare"]', 'They are equal', 9),
    (d_fri_math_quiz, 'What fraction represents 3 out of 8 equal parts?', '["8/3", "3/5", "3/8", "5/8"]', '3/8', 10),
    (d_fri_math_quiz, 'Which is an IMPROPER FRACTION?', '["3/4", "1/2", "9/4", "2/6"]', '9/4', 11);

  -- Friday / Science
  d_fri_scie_day := d_fri_aral_day;
  INSERT INTO content_quizzes (content_day_id, subject)
    VALUES (d_fri_scie_day, 'Science') RETURNING id INTO d_fri_scie_quiz;
  INSERT INTO content_questions (content_quiz_id, prompt, options, correct_answer, sort_order) VALUES
    (d_fri_scie_quiz, 'Which organ system breaks down food so the body can use it?', '["Respiratory system", "Circulatory system", "Digestive system", "Nervous system"]', 'Digestive system', 0),
    (d_fri_scie_quiz, 'The HEART is the main organ of which system?', '["Digestive system", "Respiratory system", "Circulatory system", "Skeletal system"]', 'Circulatory system', 1),
    (d_fri_scie_quiz, 'Which organs are part of the RESPIRATORY SYSTEM?', '["Stomach and intestines", "Lungs and airways", "Heart and blood vessels", "Brain and nerves"]', 'Lungs and airways', 2),
    (d_fri_scie_quiz, 'What does the RESPIRATORY SYSTEM do?', '["Pumps blood to the body", "Breaks down food", "Takes in oxygen and releases carbon dioxide", "Sends nerve signals"]', 'Takes in oxygen and releases carbon dioxide', 3),
    (d_fri_scie_quiz, 'Blood carries oxygen and nutrients to all body parts through the ___ system.', '["digestive", "respiratory", "nervous", "circulatory"]', 'circulatory', 4),
    (d_fri_scie_quiz, 'What is the FIRST part of the digestive system where food enters?', '["Stomach", "Small intestine", "Esophagus", "Mouth"]', 'Mouth', 5),
    (d_fri_scie_quiz, 'The LUNGS are protected by the ___.', '["backbone", "skull", "rib cage", "pelvis"]', 'rib cage', 6),
    (d_fri_scie_quiz, 'Which organ pumps blood through the body?', '["Liver", "Lungs", "Stomach", "Heart"]', 'Heart', 7),
    (d_fri_scie_quiz, 'What happens to food in the STOMACH?', '["It is absorbed into the blood", "It is mixed with gastric acid and broken down further", "It is pumped to the lungs", "It is released from the body"]', 'It is mixed with gastric acid and broken down further', 8),
    (d_fri_scie_quiz, 'The three body systems — digestive, respiratory, and circulatory — work TOGETHER to ___.', '["keep us asleep", "provide nutrients and oxygen to all body cells", "produce bones", "control breathing only"]', 'provide nutrients and oxygen to all body cells', 9),
    (d_fri_scie_quiz, 'Which organ absorbs most nutrients into the bloodstream?', '["Stomach", "Large intestine", "Small intestine", "Esophagus"]', 'Small intestine', 10),
    (d_fri_scie_quiz, 'What does the CIRCULATORY system carry to all body parts?', '["Only water", "Only food", "Oxygen and nutrients (via blood)", "Only waste"]', 'Oxygen and nutrients (via blood)', 11);

END $g4$;

-- Grade 5 Week 12 (2026-08-31)
DO $g5$ DECLARE
  wid uuid;
  d_mon_engl_day uuid;
  d_mon_engl_quiz uuid;
  d_mon_math_day uuid;
  d_mon_math_quiz uuid;
  d_tue_fili_day uuid;
  d_tue_fili_quiz uuid;
  d_tue_scie_day uuid;
  d_tue_scie_quiz uuid;
  d_wed_aral_day uuid;
  d_wed_aral_quiz uuid;
  d_wed_epp__day uuid;
  d_wed_epp__quiz uuid;
  d_thu_gmrc_day uuid;
  d_thu_gmrc_quiz uuid;
  d_thu_mape_day uuid;
  d_thu_mape_quiz uuid;
  d_fri_aral_day uuid;
  d_fri_aral_quiz uuid;
  d_fri_engl_day uuid;
  d_fri_engl_quiz uuid;
  d_fri_epp__day uuid;
  d_fri_epp__quiz uuid;
  d_fri_fili_day uuid;
  d_fri_fili_quiz uuid;
  d_fri_gmrc_day uuid;
  d_fri_gmrc_quiz uuid;
  d_fri_mape_day uuid;
  d_fri_mape_quiz uuid;
  d_fri_math_day uuid;
  d_fri_math_quiz uuid;
  d_fri_scie_day uuid;
  d_fri_scie_quiz uuid;
BEGIN
  INSERT INTO content_weeks (grade, week_starting_date)
    VALUES (5, '2026-08-31') RETURNING id INTO wid;

  -- Monday
  INSERT INTO content_days (content_week_id, weekday)
    VALUES (wid, 'Monday') RETURNING id INTO d_mon_engl_day;
  INSERT INTO content_quizzes (content_day_id, subject)
    VALUES (d_mon_engl_day, 'English') RETURNING id INTO d_mon_engl_quiz;
  INSERT INTO content_questions (content_quiz_id, prompt, options, correct_answer, sort_order) VALUES
    (d_mon_engl_quiz, 'The THEME of a story is ___.', '["the main character''s name", "the setting where the story happens", "the central message or lesson of the story", "the problem the character faces"]', 'the central message or lesson of the story', 0),
    (d_mon_engl_quiz, 'Which sentence contains a SIMILE?', '["The wind howled loudly.", "Her smile was sunshine.", "She ran like the wind.", "The mountain stood firm."]', 'She ran like the wind.', 1),
    (d_mon_engl_quiz, 'PERSONIFICATION gives ___ to non-human things.', '["names", "human qualities", "animal traits", "magical powers"]', 'human qualities', 2),
    (d_mon_engl_quiz, 'Which word contains ALLITERATION?', '["Pretty purple pansies", "Quick brown fox", "Lazy dog runs", "Big cats sleep"]', 'Pretty purple pansies', 3),
    (d_mon_engl_quiz, 'Making a PREDICTION before reading helps you ___.', '["memorize the text", "read faster", "think about what might happen and stay engaged", "write better"]', 'think about what might happen and stay engaged', 4),
    (d_mon_engl_quiz, 'Which is the MAIN IDEA of a paragraph about the importance of washing hands?', '["People have two hands", "Soap is made from chemicals", "Washing hands prevents the spread of germs", "Water is wet"]', 'Washing hands prevents the spread of germs', 5),
    (d_mon_engl_quiz, 'ONOMATOPOEIA is a word that ___.', '["means the opposite of another word", "sounds like the thing it describes", "has more than one meaning", "comes from another language"]', 'sounds like the thing it describes', 6),
    (d_mon_engl_quiz, '''The night sky was a black velvet blanket.'' This is an example of ___.', '["simile", "personification", "metaphor", "alliteration"]', 'metaphor', 7),
    (d_mon_engl_quiz, 'To INFER a character''s feelings, you look at their ___.', '["name and age", "actions, words, and reactions", "the story''s title", "the number of paragraphs"]', 'actions, words, and reactions', 8),
    (d_mon_engl_quiz, 'Which word contains a PREFIX meaning ''before''?', '["Unhappy", "Preview", "Joyful", "Careful"]', 'Preview', 9),
    (d_mon_engl_quiz, 'SEQUENCE in a story refers to ___.', '["the lesson learned", "the characters", "the order in which events happen", "the setting description"]', 'the order in which events happen', 10),
    (d_mon_engl_quiz, 'A CONFLICT in a story is ___.', '["the happy ending", "the theme of the story", "the problem that needs to be solved", "the setting of the story"]', 'the problem that needs to be solved', 11);

  -- Monday / Mathematics
  d_mon_math_day := d_mon_engl_day;
  INSERT INTO content_quizzes (content_day_id, subject)
    VALUES (d_mon_math_day, 'Mathematics') RETURNING id INTO d_mon_math_quiz;
  INSERT INTO content_questions (content_quiz_id, prompt, options, correct_answer, sort_order) VALUES
    (d_mon_math_quiz, 'Convert the decimal 0.75 to a fraction in LOWEST TERMS.', '["75/100", "3/4", "7/5", "15/20"]', '3/4', 0),
    (d_mon_math_quiz, 'Convert 0.5 to a fraction.', '["5/10 = 1/2", "1/5", "5/1", "5/100"]', '5/10 = 1/2', 1),
    (d_mon_math_quiz, 'Which decimal is LARGER: 0.7 or 0.35?', '["0.35", "0.7", "They are equal", "Cannot compare"]', '0.7', 2),
    (d_mon_math_quiz, 'Order from SMALLEST to LARGEST: 0.9, 0.09, 0.19', '["0.9, 0.19, 0.09", "0.09, 0.19, 0.9", "0.19, 0.09, 0.9", "0.09, 0.9, 0.19"]', '0.09, 0.19, 0.9', 3),
    (d_mon_math_quiz, 'Convert 3/4 to a decimal.', '["0.34", "0.75", "0.43", "0.7"]', '0.75', 4),
    (d_mon_math_quiz, 'Which decimal has the GREATEST value: 0.3, 0.30, 0.300?', '["0.3", "0.30", "0.300", "They are all equal"]', 'They are all equal', 5),
    (d_mon_math_quiz, 'Convert 0.25 to a fraction in lowest terms.', '["25/100", "1/4", "2/5", "1/5"]', '1/4', 6),
    (d_mon_math_quiz, 'Compare: 0.6 ☐ 0.60. Which symbol fits?', '["<", ">", "=", "\u2260"]', '=', 7),
    (d_mon_math_quiz, 'Which of these is a TERMINATING DECIMAL?', '["1/3", "2/7", "1/4", "1/6"]', '1/4', 8),
    (d_mon_math_quiz, 'In the decimal 3.45, which digit is in the HUNDREDTHS place?', '["3", "4", "5", "45"]', '5', 9),
    (d_mon_math_quiz, 'Convert 0.8 to a fraction in lowest terms.', '["8/10 = 4/5", "8/100", "0.8/1", "4/10"]', '8/10 = 4/5', 10),
    (d_mon_math_quiz, 'Order from GREATEST to SMALLEST: 1.5, 1.05, 1.50', '["1.05, 1.50, 1.5", "1.5, 1.50, 1.05", "1.5 = 1.50 > 1.05", "1.05, 1.5, 1.50"]', '1.5 = 1.50 > 1.05', 11);

  -- Tuesday
  INSERT INTO content_days (content_week_id, weekday)
    VALUES (wid, 'Tuesday') RETURNING id INTO d_tue_fili_day;
  INSERT INTO content_quizzes (content_day_id, subject)
    VALUES (d_tue_fili_day, 'Filipino') RETURNING id INTO d_tue_fili_quiz;
  INSERT INTO content_questions (content_quiz_id, prompt, options, correct_answer, sort_order) VALUES
    (d_tue_fili_quiz, 'Ang MITO ay isang kwentong nagpapaliwanag ng ___.', '["gawi ng mga hayop", "pinagmulan ng natural na bagay o kababalaghan", "talambuhay ng bayani", "mga patakaran ng paaralan"]', 'pinagmulan ng natural na bagay o kababalaghan', 0),
    (d_tue_fili_quiz, 'Ang EPIKO ay isang mahabang ___.', '["tula na may aral", "salaysay tungkol sa mga gawa ng isang bayani", "ulat ng balita", "liham sa kaibigan"]', 'salaysay tungkol sa mga gawa ng isang bayani', 1),
    (d_tue_fili_quiz, 'Ang SIMILI ay naghahambing ng dalawang bagay gamit ang ___.', '["''at'' at ''o''", "''na'' at ''ang''", "''tulad ng'' o ''para ng''", "''pero'' at ''dahil''"]', '''tulad ng'' o ''para ng''', 2),
    (d_tue_fili_quiz, 'Ang METAPORA ay naghahambing ng dalawang bagay nang ___.', '["may paggamit ng ''tulad ng''", "walang paggamit ng tulad ng o para ng", "may tanong", "may ebidensya"]', 'walang paggamit ng tulad ng o para ng', 3),
    (d_tue_fili_quiz, '''Ang kanyang ngiti ay araw.'' Ito ay halimbawa ng ___.', '["simili", "metapora", "personipikasyon", "talinghaga"]', 'metapora', 4),
    (d_tue_fili_quiz, 'Ang PERSONIPIKASYON ay nagbibigay ng ___ sa mga bagay na hindi tao.', '["pangalan", "katangiang pang-tao", "hayop na katangian", "kulay"]', 'katangiang pang-tao', 5),
    (d_tue_fili_quiz, 'Ang PAGKAKASUNOD-SUNOD ng mga pangyayari sa isang kwento ay tinatawag na ___.', '["tema", "sukat", "balangkas ng plot", "tauhan"]', 'balangkas ng plot', 6),
    (d_tue_fili_quiz, 'Ang ''kababalaghan'' ay ibig sabihing ___.', '["pangkaraniwan", "kahanga-hangang pangyayari na di-kapani-paniwala", "kasaysayan", "katotohanan"]', 'kahanga-hangang pangyayari na di-kapani-paniwala', 7),
    (d_tue_fili_quiz, 'Paano malalaman ang TEMA ng isang kwento?', '["Tingnan ang pamagat lamang", "Tingnan ang haba ng kwento", "Unawain ang mensahe o aral na itinuturo ng kwento", "Bilangin ang mga tauhan"]', 'Unawain ang mensahe o aral na itinuturo ng kwento', 8),
    (d_tue_fili_quiz, 'Ang ''PAGWAWANGIS'' ay katumbas ng ___.', '["metapora", "simili", "personipikasyon", "talinghaga"]', 'simili', 9),
    (d_tue_fili_quiz, '''Ang bundok ay bumubulong ng mga lihim.'' Ito ay halimbawa ng ___.', '["simili", "metapora", "personipikasyon", "tayutay"]', 'personipikasyon', 10),
    (d_tue_fili_quiz, 'Sa pagbuo ng SANAYSAY, ang PANIMULA ay dapat ___.', '["ibigay ang konklusyon", "ipakita ang mga ebidensya", "itakda ang paksa at makuha ang atensyon ng mambabasa", "ibuod ang lahat ng ideya"]', 'itakda ang paksa at makuha ang atensyon ng mambabasa', 11);

  -- Tuesday / Science
  d_tue_scie_day := d_tue_fili_day;
  INSERT INTO content_quizzes (content_day_id, subject)
    VALUES (d_tue_scie_day, 'Science') RETURNING id INTO d_tue_scie_quiz;
  INSERT INTO content_questions (content_quiz_id, prompt, options, correct_answer, sort_order) VALUES
    (d_tue_scie_quiz, 'Trace the path of FOOD through the digestive system: mouth → ___ → stomach → ___.', '["lungs \u2192 intestines", "esophagus \u2192 small intestine", "trachea \u2192 large intestine", "esophagus \u2192 lungs"]', 'esophagus → small intestine', 0),
    (d_tue_scie_quiz, 'What is the function of the SMALL INTESTINE in digestion?', '["It stores waste", "It pumps blood", "It absorbs most nutrients into the bloodstream", "It breaks down food with acid"]', 'It absorbs most nutrients into the bloodstream', 1),
    (d_tue_scie_quiz, 'Which ANIMAL BODY SYSTEM takes in oxygen from the air?', '["Digestive system", "Reproductive system", "Respiratory system", "Circulatory system"]', 'Respiratory system', 2),
    (d_tue_scie_quiz, 'In the respiratory system, the path of AIR is: nose → ___ → lungs.', '["esophagus", "trachea (windpipe)", "stomach", "mouth only"]', 'trachea (windpipe)', 3),
    (d_tue_scie_quiz, 'The REPRODUCTIVE SYSTEM''s main function is ___.', '["breathing", "digesting food", "producing offspring (growth and development)", "pumping blood"]', 'producing offspring (growth and development)', 4),
    (d_tue_scie_quiz, 'A diagram showing the digestive organs of a frog labeled with names is an example of a ___.', '["bar graph", "labeled model/diagram", "scatter plot", "pie chart"]', 'labeled model/diagram', 5),
    (d_tue_scie_quiz, 'What does the STOMACH do to food?', '["Absorbs it directly into the blood", "Mixes it with gastric acid and churns it", "Removes oxygen from it", "Stores it permanently"]', 'Mixes it with gastric acid and churns it', 6),
    (d_tue_scie_quiz, 'Air enters the body through the ___.', '["stomach", "esophagus", "nose and mouth", "intestines"]', 'nose and mouth', 7),
    (d_tue_scie_quiz, 'Which is part of the RESPIRATORY system?', '["Stomach", "Esophagus", "Lungs", "Liver"]', 'Lungs', 8),
    (d_tue_scie_quiz, 'The LARGE INTESTINE''s main job is to ___.', '["absorb nutrients", "absorb water and prepare waste for removal", "digest proteins", "produce bile"]', 'absorb water and prepare waste for removal', 9),
    (d_tue_scie_quiz, 'In animals, the ESOPHAGUS/GULLET connects the mouth to the ___.', '["lungs", "large intestine", "stomach", "liver"]', 'stomach', 10),
    (d_tue_scie_quiz, 'Why is learning about animal body systems important?', '["It is not useful", "It helps us understand how living things function and stay healthy", "It is only for scientists", "It only applies to humans"]', 'It helps us understand how living things function and stay healthy', 11);

  -- Wednesday
  INSERT INTO content_days (content_week_id, weekday)
    VALUES (wid, 'Wednesday') RETURNING id INTO d_wed_aral_day;
  INSERT INTO content_quizzes (content_day_id, subject)
    VALUES (d_wed_aral_day, 'Araling Panlipunan') RETURNING id INTO d_wed_aral_quiz;
  INSERT INTO content_questions (content_quiz_id, prompt, options, correct_answer, sort_order) VALUES
    (d_wed_aral_quiz, 'What are the THREE reasons Spain colonized the Philippines? (God, Gold, Glory)', '["Religion, Riches, Reputation", "Education, Economy, Entertainment", "Trade, Travel, Tourism", "Land, Language, Labor"]', 'Religion, Riches, Reputation', 0),
    (d_wed_aral_quiz, 'Who led the FIRST SPANISH EXPEDITION to the Philippines in 1521?', '["Miguel Lopez de Legazpi", "Andres de Urdaneta", "Ferdinand Magellan", "Juan de Salcedo"]', 'Ferdinand Magellan', 1),
    (d_wed_aral_quiz, 'Who led the expedition that ESTABLISHED PERMANENT SPANISH RULE in the Philippines in 1565?', '["Ferdinand Magellan", "Vasco da Gama", "Miguel Lopez de Legazpi", "Antonio Pigafetta"]', 'Miguel Lopez de Legazpi', 2),
    (d_wed_aral_quiz, 'The FIRST MASS in the Philippines was celebrated in ___.', '["Manila", "Cebu", "Limasawa", "Mactan"]', 'Limasawa', 3),
    (d_wed_aral_quiz, 'COLONIZATION means ___.', '["trading peacefully with other nations", "one nation taking control and settling in another territory", "two nations forming an alliance", "building schools in another country"]', 'one nation taking control and settling in another territory', 4),
    (d_wed_aral_quiz, 'The Spaniards were searching for the SPICE ISLANDS (Moluccas). What valuable spice did they want?', '["Sugar and coffee", "Pepper and cloves", "Tobacco and rubber", "Rice and corn"]', 'Pepper and cloves', 5),
    (d_wed_aral_quiz, 'The Treaty of Tordesillas (1494) divided the world''s exploration routes between ___.', '["Spain and Portugal", "Spain and England", "Portugal and France", "England and France"]', 'Spain and Portugal', 6),
    (d_wed_aral_quiz, 'IMPERIALISM refers to ___.', '["the policy of extending a nation''s power through colonization or military force", "building more schools in poor countries", "helping other nations trade freely", "sharing resources equally between nations"]', 'the policy of extending a nation''s power through colonization or military force', 7),
    (d_wed_aral_quiz, '''GOD'' as a reason for Spanish colonization means they wanted to ___.', '["find gold mines", "establish trade routes", "spread Christianity", "gain military power"]', 'spread Christianity', 8),
    (d_wed_aral_quiz, '''GOLD'' as a reason for Spanish colonization refers to ___.', '["spreading religion", "seeking wealth and natural resources", "exploring new routes", "gaining military glory"]', 'seeking wealth and natural resources', 9),
    (d_wed_aral_quiz, 'Magellan''s expedition (1521) was significant because it was the FIRST to ___.', '["discover the Philippines", "sail around the world (circumnavigate the globe)", "trade with China", "build a fort in Asia"]', 'sail around the world (circumnavigate the globe)', 10),
    (d_wed_aral_quiz, 'Who KILLED Ferdinand Magellan in the Philippines?', '["Miguel Lopez de Legazpi", "Rajah Humabon", "Lapu-Lapu", "Juan Sebastian Elcano"]', 'Lapu-Lapu', 11);

  -- Wednesday / EPP (ICT)
  d_wed_epp__day := d_wed_aral_day;
  INSERT INTO content_quizzes (content_day_id, subject)
    VALUES (d_wed_epp__day, 'EPP (ICT)') RETURNING id INTO d_wed_epp__quiz;
  INSERT INTO content_questions (content_quiz_id, prompt, options, correct_answer, sort_order) VALUES
    (d_wed_epp__quiz, 'In MS Word, which INSERT option lets you add a picture or image from your computer?', '["Table", "Picture", "Shapes", "SmartArt"]', 'Picture', 0),
    (d_wed_epp__quiz, 'What is SMARTART used for in a Word document?', '["Adding a background color", "Creating diagrams and visual lists to present information", "Inserting a table of data", "Changing font size"]', 'Creating diagrams and visual lists to present information', 1),
    (d_wed_epp__quiz, 'Which formatting feature organizes text into a numbered sequence?', '["Bullets", "Numbering", "Shapes", "Page Border"]', 'Numbering', 2),
    (d_wed_epp__quiz, 'BULLET POINTS are used to ___.', '["list items without a specific order", "show a numbered sequence", "insert images", "change the font"]', 'list items without a specific order', 3),
    (d_wed_epp__quiz, 'How do you INSERT A TABLE in MS Word?', '["Edit \u2192 Table", "Insert \u2192 Table", "Format \u2192 Table", "View \u2192 Table"]', 'Insert → Table', 4),
    (d_wed_epp__quiz, 'A TABLE in a Word document is useful for ___.', '["playing music", "organizing information into rows and columns", "drawing pictures", "printing quickly"]', 'organizing information into rows and columns', 5),
    (d_wed_epp__quiz, 'To add a BACKGROUND COLOR to a page in MS Word, you use ___.', '["Insert \u2192 Table", "Design \u2192 Page Color", "Format \u2192 Font", "View \u2192 Outline"]', 'Design → Page Color', 6),
    (d_wed_epp__quiz, 'Which SmartArt layout is best for showing a STEP-BY-STEP PROCESS?', '["Cycle", "Hierarchy", "Process", "Matrix"]', 'Process', 7),
    (d_wed_epp__quiz, 'To RESIZE an inserted image in MS Word, you ___.', '["right-click and delete", "drag the corner handles of the image", "change the font size", "insert a table"]', 'drag the corner handles of the image', 8),
    (d_wed_epp__quiz, '''Insert → Shapes'' allows you to add ___.', '["photographs", "pre-made geometric shapes and lines to your document", "tables", "SmartArt diagrams"]', 'pre-made geometric shapes and lines to your document', 9),
    (d_wed_epp__quiz, 'What does a COLUMN in a table represent?', '["A horizontal group of cells", "A vertical group of cells", "The border of the table", "The header of the document"]', 'A vertical group of cells', 10),
    (d_wed_epp__quiz, 'To make text appear as a LIST WITH DASHES (•), you use ___.', '["Numbering", "Bold", "Bullets", "Underline"]', 'Bullets', 11);

  -- Thursday
  INSERT INTO content_days (content_week_id, weekday)
    VALUES (wid, 'Thursday') RETURNING id INTO d_thu_gmrc_day;
  INSERT INTO content_quizzes (content_day_id, subject)
    VALUES (d_thu_gmrc_day, 'GMRC') RETURNING id INTO d_thu_gmrc_quiz;
  INSERT INTO content_questions (content_quiz_id, prompt, options, correct_answer, sort_order) VALUES
    (d_thu_gmrc_quiz, 'When you WELCOME visitors into your home, the value being shown is ___.', '["competition", "disrespect", "hospitality and respect", "selfishness"]', 'hospitality and respect', 0),
    (d_thu_gmrc_quiz, 'Proper HOSPITALITY when welcoming family members includes ___.', '["ignoring them", "greeting them warmly and making them feel comfortable", "arguing with them", "telling them to leave quickly"]', 'greeting them warmly and making them feel comfortable', 1),
    (d_thu_gmrc_quiz, 'RESPECT for visitors means ___.', '["giving them all your possessions", "treating them with courtesy and making them feel valued", "ignoring their needs", "doing whatever they say"]', 'treating them with courtesy and making them feel valued', 2),
    (d_thu_gmrc_quiz, 'Which action shows the BEST hospitality when a relative visits your home?', '["Ignoring them and continuing to watch TV", "Greeting them, offering a seat, and asking if they need anything", "Hiding your food so they cannot eat", "Telling them the visit is inconvenient"]', 'Greeting them, offering a seat, and asking if they need anything', 3),
    (d_thu_gmrc_quiz, '''Mano po'' is a Filipino gesture of ___.', '["disrespect toward elders", "respect and love for elders", "greeting only friends", "competition between family members"]', 'respect and love for elders', 4),
    (d_thu_gmrc_quiz, 'Welcoming guests warmly reflects the Filipino value of ___.', '["Utang na loob", "Individualism", "Pagpapahalaga sa pamilya at bisita (hospitality/pakikipagkapwa)", "Competition"]', 'Pagpapahalaga sa pamilya at bisita (hospitality/pakikipagkapwa)', 5),
    (d_thu_gmrc_quiz, 'When a visitor arrives at your house, the FIRST thing you should do is ___.', '["go to your room", "greet them politely and invite them in", "ask them to wait outside", "call your parents only"]', 'greet them politely and invite them in', 6),
    (d_thu_gmrc_quiz, 'The value of RESPECT is shown when you ___.', '["ignore older relatives", "speak rudely to guests", "listen and show courtesy to family and visitors", "only greet friends"]', 'listen and show courtesy to family and visitors', 7),
    (d_thu_gmrc_quiz, 'Why is HOSPITALITY important in Filipino culture?', '["It wastes time and resources", "It strengthens family bonds and reflects care for others", "It is only important for rich families", "It is not important"]', 'It strengthens family bonds and reflects care for others', 8),
    (d_thu_gmrc_quiz, 'Which behavior shows DISRESPECT to a visiting relative?', '["Offering them food and a seat", "Listening to their stories", "Remaining in your room without greeting them", "Saying ''Mano po''"]', 'Remaining in your room without greeting them', 9),
    (d_thu_gmrc_quiz, 'Showing hospitality to visitors teaches children the value of ___.', '["selfishness", "caring for others and building relationships", "ignoring others", "competition"]', 'caring for others and building relationships', 10),
    (d_thu_gmrc_quiz, 'The Filipino concept of ''pakikitungo'' refers to ___.', '["only family relationships", "the way one interacts politely and respectfully with others", "avoiding strangers", "being competitive"]', 'the way one interacts politely and respectfully with others', 11);

  -- Thursday / MAPEH
  d_thu_mape_day := d_thu_gmrc_day;
  INSERT INTO content_quizzes (content_day_id, subject)
    VALUES (d_thu_mape_day, 'MAPEH') RETURNING id INTO d_thu_mape_quiz;
  INSERT INTO content_questions (content_quiz_id, prompt, options, correct_answer, sort_order) VALUES
    (d_thu_mape_quiz, 'PRE-COLONIAL Philippine arts were tied to ___.', '["modern entertainment", "everyday life and community rituals", "foreign influences only", "school curriculum"]', 'everyday life and community rituals', 0),
    (d_thu_mape_quiz, 'The HORNBOSTEL-SACHS system classifies ___.', '["paintings", "musical instruments", "dance styles", "visual art forms"]', 'musical instruments', 1),
    (d_thu_mape_quiz, 'DYNAMICS in music means ___.', '["the speed of the music", "the volume (loudness and softness) of music", "the rhythm of the music", "the melody of the music"]', 'the volume (loudness and softness) of music', 2),
    (d_thu_mape_quiz, 'What is TIMBRE?', '["The speed of music", "The pitch of a note", "The unique sound quality of an instrument or voice", "The rhythm pattern"]', 'The unique sound quality of an instrument or voice', 3),
    (d_thu_mape_quiz, 'Philippine pre-colonial VISUAL ARTS were often made from ___.', '["plastic and steel", "locally available natural materials like bamboo, clay, and weaving fibers", "imported materials", "synthetic dyes"]', 'locally available natural materials like bamboo, clay, and weaving fibers', 4),
    (d_thu_mape_quiz, '''Mezzo forte'' (mf) means ___.', '["very loud", "moderately loud", "very soft", "moderately soft"]', 'moderately loud', 5),
    (d_thu_mape_quiz, 'In PE, regular EXERCISE helps maintain ___.', '["only muscle strength", "overall physical fitness and health", "only flexibility", "only balance"]', 'overall physical fitness and health', 6),
    (d_thu_mape_quiz, 'PRE-COLONIAL Philippine performing arts served to ___.', '["entertain only wealthy people", "mark life events like birth, harvest, and ceremonies", "import foreign ideas", "only decorate temples"]', 'mark life events like birth, harvest, and ceremonies', 7),
    (d_thu_mape_quiz, 'Which is a form of HEALTH that PE addresses?', '["Only mental health", "Only physical health", "Physical, mental, and social well-being", "Only social health"]', 'Physical, mental, and social well-being', 8),
    (d_thu_mape_quiz, 'A ''forte'' (f) marking in music means to play ___.', '["softly", "very softly", "loudly", "very loudly"]', 'loudly', 9),
    (d_thu_mape_quiz, 'Philippine FOLK INSTRUMENTS (like kudyapi, kulintang) show the ___.', '["western influence only", "rich indigenous musical heritage of the Philippines", "lack of musical culture", "modern era of Filipino music"]', 'rich indigenous musical heritage of the Philippines', 10),
    (d_thu_mape_quiz, 'Playing SPORTS develops ___.', '["only physical strength", "only teamwork", "physical fitness, teamwork, discipline, and sportsmanship", "only competition skills"]', 'physical fitness, teamwork, discipline, and sportsmanship', 11);

  -- Friday
  INSERT INTO content_days (content_week_id, weekday)
    VALUES (wid, 'Friday') RETURNING id INTO d_fri_aral_day;
  INSERT INTO content_quizzes (content_day_id, subject)
    VALUES (d_fri_aral_day, 'Araling Panlipunan') RETURNING id INTO d_fri_aral_quiz;
  INSERT INTO content_questions (content_quiz_id, prompt, options, correct_answer, sort_order) VALUES
    (d_fri_aral_quiz, 'What are the THREE reasons Spain colonized the Philippines? (God, Gold, Glory)', '["Religion, Riches, Reputation", "Education, Economy, Entertainment", "Trade, Travel, Tourism", "Land, Language, Labor"]', 'Religion, Riches, Reputation', 0),
    (d_fri_aral_quiz, 'Who led the FIRST SPANISH EXPEDITION to the Philippines in 1521?', '["Miguel Lopez de Legazpi", "Andres de Urdaneta", "Ferdinand Magellan", "Juan de Salcedo"]', 'Ferdinand Magellan', 1),
    (d_fri_aral_quiz, 'Who led the expedition that ESTABLISHED PERMANENT SPANISH RULE in the Philippines in 1565?', '["Ferdinand Magellan", "Vasco da Gama", "Miguel Lopez de Legazpi", "Antonio Pigafetta"]', 'Miguel Lopez de Legazpi', 2),
    (d_fri_aral_quiz, 'The FIRST MASS in the Philippines was celebrated in ___.', '["Manila", "Cebu", "Limasawa", "Mactan"]', 'Limasawa', 3),
    (d_fri_aral_quiz, 'COLONIZATION means ___.', '["trading peacefully with other nations", "one nation taking control and settling in another territory", "two nations forming an alliance", "building schools in another country"]', 'one nation taking control and settling in another territory', 4),
    (d_fri_aral_quiz, 'The Spaniards were searching for the SPICE ISLANDS (Moluccas). What valuable spice did they want?', '["Sugar and coffee", "Pepper and cloves", "Tobacco and rubber", "Rice and corn"]', 'Pepper and cloves', 5),
    (d_fri_aral_quiz, 'The Treaty of Tordesillas (1494) divided the world''s exploration routes between ___.', '["Spain and Portugal", "Spain and England", "Portugal and France", "England and France"]', 'Spain and Portugal', 6),
    (d_fri_aral_quiz, 'IMPERIALISM refers to ___.', '["the policy of extending a nation''s power through colonization or military force", "building more schools in poor countries", "helping other nations trade freely", "sharing resources equally between nations"]', 'the policy of extending a nation''s power through colonization or military force', 7),
    (d_fri_aral_quiz, '''GOD'' as a reason for Spanish colonization means they wanted to ___.', '["find gold mines", "establish trade routes", "spread Christianity", "gain military power"]', 'spread Christianity', 8),
    (d_fri_aral_quiz, '''GOLD'' as a reason for Spanish colonization refers to ___.', '["spreading religion", "seeking wealth and natural resources", "exploring new routes", "gaining military glory"]', 'seeking wealth and natural resources', 9),
    (d_fri_aral_quiz, 'Magellan''s expedition (1521) was significant because it was the FIRST to ___.', '["discover the Philippines", "sail around the world (circumnavigate the globe)", "trade with China", "build a fort in Asia"]', 'sail around the world (circumnavigate the globe)', 10),
    (d_fri_aral_quiz, 'Who KILLED Ferdinand Magellan in the Philippines?', '["Miguel Lopez de Legazpi", "Rajah Humabon", "Lapu-Lapu", "Juan Sebastian Elcano"]', 'Lapu-Lapu', 11);

  -- Friday / English
  d_fri_engl_day := d_fri_aral_day;
  INSERT INTO content_quizzes (content_day_id, subject)
    VALUES (d_fri_engl_day, 'English') RETURNING id INTO d_fri_engl_quiz;
  INSERT INTO content_questions (content_quiz_id, prompt, options, correct_answer, sort_order) VALUES
    (d_fri_engl_quiz, 'The THEME of a story is ___.', '["the main character''s name", "the setting where the story happens", "the central message or lesson of the story", "the problem the character faces"]', 'the central message or lesson of the story', 0),
    (d_fri_engl_quiz, 'Which sentence contains a SIMILE?', '["The wind howled loudly.", "Her smile was sunshine.", "She ran like the wind.", "The mountain stood firm."]', 'She ran like the wind.', 1),
    (d_fri_engl_quiz, 'PERSONIFICATION gives ___ to non-human things.', '["names", "human qualities", "animal traits", "magical powers"]', 'human qualities', 2),
    (d_fri_engl_quiz, 'Which word contains ALLITERATION?', '["Pretty purple pansies", "Quick brown fox", "Lazy dog runs", "Big cats sleep"]', 'Pretty purple pansies', 3),
    (d_fri_engl_quiz, 'Making a PREDICTION before reading helps you ___.', '["memorize the text", "read faster", "think about what might happen and stay engaged", "write better"]', 'think about what might happen and stay engaged', 4),
    (d_fri_engl_quiz, 'Which is the MAIN IDEA of a paragraph about the importance of washing hands?', '["People have two hands", "Soap is made from chemicals", "Washing hands prevents the spread of germs", "Water is wet"]', 'Washing hands prevents the spread of germs', 5),
    (d_fri_engl_quiz, 'ONOMATOPOEIA is a word that ___.', '["means the opposite of another word", "sounds like the thing it describes", "has more than one meaning", "comes from another language"]', 'sounds like the thing it describes', 6),
    (d_fri_engl_quiz, '''The night sky was a black velvet blanket.'' This is an example of ___.', '["simile", "personification", "metaphor", "alliteration"]', 'metaphor', 7),
    (d_fri_engl_quiz, 'To INFER a character''s feelings, you look at their ___.', '["name and age", "actions, words, and reactions", "the story''s title", "the number of paragraphs"]', 'actions, words, and reactions', 8),
    (d_fri_engl_quiz, 'Which word contains a PREFIX meaning ''before''?', '["Unhappy", "Preview", "Joyful", "Careful"]', 'Preview', 9),
    (d_fri_engl_quiz, 'SEQUENCE in a story refers to ___.', '["the lesson learned", "the characters", "the order in which events happen", "the setting description"]', 'the order in which events happen', 10),
    (d_fri_engl_quiz, 'A CONFLICT in a story is ___.', '["the happy ending", "the theme of the story", "the problem that needs to be solved", "the setting of the story"]', 'the problem that needs to be solved', 11);

  -- Friday / EPP (ICT)
  d_fri_epp__day := d_fri_aral_day;
  INSERT INTO content_quizzes (content_day_id, subject)
    VALUES (d_fri_epp__day, 'EPP (ICT)') RETURNING id INTO d_fri_epp__quiz;
  INSERT INTO content_questions (content_quiz_id, prompt, options, correct_answer, sort_order) VALUES
    (d_fri_epp__quiz, 'In MS Word, which INSERT option lets you add a picture or image from your computer?', '["Table", "Picture", "Shapes", "SmartArt"]', 'Picture', 0),
    (d_fri_epp__quiz, 'What is SMARTART used for in a Word document?', '["Adding a background color", "Creating diagrams and visual lists to present information", "Inserting a table of data", "Changing font size"]', 'Creating diagrams and visual lists to present information', 1),
    (d_fri_epp__quiz, 'Which formatting feature organizes text into a numbered sequence?', '["Bullets", "Numbering", "Shapes", "Page Border"]', 'Numbering', 2),
    (d_fri_epp__quiz, 'BULLET POINTS are used to ___.', '["list items without a specific order", "show a numbered sequence", "insert images", "change the font"]', 'list items without a specific order', 3),
    (d_fri_epp__quiz, 'How do you INSERT A TABLE in MS Word?', '["Edit \u2192 Table", "Insert \u2192 Table", "Format \u2192 Table", "View \u2192 Table"]', 'Insert → Table', 4),
    (d_fri_epp__quiz, 'A TABLE in a Word document is useful for ___.', '["playing music", "organizing information into rows and columns", "drawing pictures", "printing quickly"]', 'organizing information into rows and columns', 5),
    (d_fri_epp__quiz, 'To add a BACKGROUND COLOR to a page in MS Word, you use ___.', '["Insert \u2192 Table", "Design \u2192 Page Color", "Format \u2192 Font", "View \u2192 Outline"]', 'Design → Page Color', 6),
    (d_fri_epp__quiz, 'Which SmartArt layout is best for showing a STEP-BY-STEP PROCESS?', '["Cycle", "Hierarchy", "Process", "Matrix"]', 'Process', 7),
    (d_fri_epp__quiz, 'To RESIZE an inserted image in MS Word, you ___.', '["right-click and delete", "drag the corner handles of the image", "change the font size", "insert a table"]', 'drag the corner handles of the image', 8),
    (d_fri_epp__quiz, '''Insert → Shapes'' allows you to add ___.', '["photographs", "pre-made geometric shapes and lines to your document", "tables", "SmartArt diagrams"]', 'pre-made geometric shapes and lines to your document', 9),
    (d_fri_epp__quiz, 'What does a COLUMN in a table represent?', '["A horizontal group of cells", "A vertical group of cells", "The border of the table", "The header of the document"]', 'A vertical group of cells', 10),
    (d_fri_epp__quiz, 'To make text appear as a LIST WITH DASHES (•), you use ___.', '["Numbering", "Bold", "Bullets", "Underline"]', 'Bullets', 11);

  -- Friday / Filipino
  d_fri_fili_day := d_fri_aral_day;
  INSERT INTO content_quizzes (content_day_id, subject)
    VALUES (d_fri_fili_day, 'Filipino') RETURNING id INTO d_fri_fili_quiz;
  INSERT INTO content_questions (content_quiz_id, prompt, options, correct_answer, sort_order) VALUES
    (d_fri_fili_quiz, 'Ang MITO ay isang kwentong nagpapaliwanag ng ___.', '["gawi ng mga hayop", "pinagmulan ng natural na bagay o kababalaghan", "talambuhay ng bayani", "mga patakaran ng paaralan"]', 'pinagmulan ng natural na bagay o kababalaghan', 0),
    (d_fri_fili_quiz, 'Ang EPIKO ay isang mahabang ___.', '["tula na may aral", "salaysay tungkol sa mga gawa ng isang bayani", "ulat ng balita", "liham sa kaibigan"]', 'salaysay tungkol sa mga gawa ng isang bayani', 1),
    (d_fri_fili_quiz, 'Ang SIMILI ay naghahambing ng dalawang bagay gamit ang ___.', '["''at'' at ''o''", "''na'' at ''ang''", "''tulad ng'' o ''para ng''", "''pero'' at ''dahil''"]', '''tulad ng'' o ''para ng''', 2),
    (d_fri_fili_quiz, 'Ang METAPORA ay naghahambing ng dalawang bagay nang ___.', '["may paggamit ng ''tulad ng''", "walang paggamit ng tulad ng o para ng", "may tanong", "may ebidensya"]', 'walang paggamit ng tulad ng o para ng', 3),
    (d_fri_fili_quiz, '''Ang kanyang ngiti ay araw.'' Ito ay halimbawa ng ___.', '["simili", "metapora", "personipikasyon", "talinghaga"]', 'metapora', 4),
    (d_fri_fili_quiz, 'Ang PERSONIPIKASYON ay nagbibigay ng ___ sa mga bagay na hindi tao.', '["pangalan", "katangiang pang-tao", "hayop na katangian", "kulay"]', 'katangiang pang-tao', 5),
    (d_fri_fili_quiz, 'Ang PAGKAKASUNOD-SUNOD ng mga pangyayari sa isang kwento ay tinatawag na ___.', '["tema", "sukat", "balangkas ng plot", "tauhan"]', 'balangkas ng plot', 6),
    (d_fri_fili_quiz, 'Ang ''kababalaghan'' ay ibig sabihing ___.', '["pangkaraniwan", "kahanga-hangang pangyayari na di-kapani-paniwala", "kasaysayan", "katotohanan"]', 'kahanga-hangang pangyayari na di-kapani-paniwala', 7),
    (d_fri_fili_quiz, 'Paano malalaman ang TEMA ng isang kwento?', '["Tingnan ang pamagat lamang", "Tingnan ang haba ng kwento", "Unawain ang mensahe o aral na itinuturo ng kwento", "Bilangin ang mga tauhan"]', 'Unawain ang mensahe o aral na itinuturo ng kwento', 8),
    (d_fri_fili_quiz, 'Ang ''PAGWAWANGIS'' ay katumbas ng ___.', '["metapora", "simili", "personipikasyon", "talinghaga"]', 'simili', 9),
    (d_fri_fili_quiz, '''Ang bundok ay bumubulong ng mga lihim.'' Ito ay halimbawa ng ___.', '["simili", "metapora", "personipikasyon", "tayutay"]', 'personipikasyon', 10),
    (d_fri_fili_quiz, 'Sa pagbuo ng SANAYSAY, ang PANIMULA ay dapat ___.', '["ibigay ang konklusyon", "ipakita ang mga ebidensya", "itakda ang paksa at makuha ang atensyon ng mambabasa", "ibuod ang lahat ng ideya"]', 'itakda ang paksa at makuha ang atensyon ng mambabasa', 11);

  -- Friday / GMRC
  d_fri_gmrc_day := d_fri_aral_day;
  INSERT INTO content_quizzes (content_day_id, subject)
    VALUES (d_fri_gmrc_day, 'GMRC') RETURNING id INTO d_fri_gmrc_quiz;
  INSERT INTO content_questions (content_quiz_id, prompt, options, correct_answer, sort_order) VALUES
    (d_fri_gmrc_quiz, 'When you WELCOME visitors into your home, the value being shown is ___.', '["competition", "disrespect", "hospitality and respect", "selfishness"]', 'hospitality and respect', 0),
    (d_fri_gmrc_quiz, 'Proper HOSPITALITY when welcoming family members includes ___.', '["ignoring them", "greeting them warmly and making them feel comfortable", "arguing with them", "telling them to leave quickly"]', 'greeting them warmly and making them feel comfortable', 1),
    (d_fri_gmrc_quiz, 'RESPECT for visitors means ___.', '["giving them all your possessions", "treating them with courtesy and making them feel valued", "ignoring their needs", "doing whatever they say"]', 'treating them with courtesy and making them feel valued', 2),
    (d_fri_gmrc_quiz, 'Which action shows the BEST hospitality when a relative visits your home?', '["Ignoring them and continuing to watch TV", "Greeting them, offering a seat, and asking if they need anything", "Hiding your food so they cannot eat", "Telling them the visit is inconvenient"]', 'Greeting them, offering a seat, and asking if they need anything', 3),
    (d_fri_gmrc_quiz, '''Mano po'' is a Filipino gesture of ___.', '["disrespect toward elders", "respect and love for elders", "greeting only friends", "competition between family members"]', 'respect and love for elders', 4),
    (d_fri_gmrc_quiz, 'Welcoming guests warmly reflects the Filipino value of ___.', '["Utang na loob", "Individualism", "Pagpapahalaga sa pamilya at bisita (hospitality/pakikipagkapwa)", "Competition"]', 'Pagpapahalaga sa pamilya at bisita (hospitality/pakikipagkapwa)', 5),
    (d_fri_gmrc_quiz, 'When a visitor arrives at your house, the FIRST thing you should do is ___.', '["go to your room", "greet them politely and invite them in", "ask them to wait outside", "call your parents only"]', 'greet them politely and invite them in', 6),
    (d_fri_gmrc_quiz, 'The value of RESPECT is shown when you ___.', '["ignore older relatives", "speak rudely to guests", "listen and show courtesy to family and visitors", "only greet friends"]', 'listen and show courtesy to family and visitors', 7),
    (d_fri_gmrc_quiz, 'Why is HOSPITALITY important in Filipino culture?', '["It wastes time and resources", "It strengthens family bonds and reflects care for others", "It is only important for rich families", "It is not important"]', 'It strengthens family bonds and reflects care for others', 8),
    (d_fri_gmrc_quiz, 'Which behavior shows DISRESPECT to a visiting relative?', '["Offering them food and a seat", "Listening to their stories", "Remaining in your room without greeting them", "Saying ''Mano po''"]', 'Remaining in your room without greeting them', 9),
    (d_fri_gmrc_quiz, 'Showing hospitality to visitors teaches children the value of ___.', '["selfishness", "caring for others and building relationships", "ignoring others", "competition"]', 'caring for others and building relationships', 10),
    (d_fri_gmrc_quiz, 'The Filipino concept of ''pakikitungo'' refers to ___.', '["only family relationships", "the way one interacts politely and respectfully with others", "avoiding strangers", "being competitive"]', 'the way one interacts politely and respectfully with others', 11);

  -- Friday / MAPEH
  d_fri_mape_day := d_fri_aral_day;
  INSERT INTO content_quizzes (content_day_id, subject)
    VALUES (d_fri_mape_day, 'MAPEH') RETURNING id INTO d_fri_mape_quiz;
  INSERT INTO content_questions (content_quiz_id, prompt, options, correct_answer, sort_order) VALUES
    (d_fri_mape_quiz, 'PRE-COLONIAL Philippine arts were tied to ___.', '["modern entertainment", "everyday life and community rituals", "foreign influences only", "school curriculum"]', 'everyday life and community rituals', 0),
    (d_fri_mape_quiz, 'The HORNBOSTEL-SACHS system classifies ___.', '["paintings", "musical instruments", "dance styles", "visual art forms"]', 'musical instruments', 1),
    (d_fri_mape_quiz, 'DYNAMICS in music means ___.', '["the speed of the music", "the volume (loudness and softness) of music", "the rhythm of the music", "the melody of the music"]', 'the volume (loudness and softness) of music', 2),
    (d_fri_mape_quiz, 'What is TIMBRE?', '["The speed of music", "The pitch of a note", "The unique sound quality of an instrument or voice", "The rhythm pattern"]', 'The unique sound quality of an instrument or voice', 3),
    (d_fri_mape_quiz, 'Philippine pre-colonial VISUAL ARTS were often made from ___.', '["plastic and steel", "locally available natural materials like bamboo, clay, and weaving fibers", "imported materials", "synthetic dyes"]', 'locally available natural materials like bamboo, clay, and weaving fibers', 4),
    (d_fri_mape_quiz, '''Mezzo forte'' (mf) means ___.', '["very loud", "moderately loud", "very soft", "moderately soft"]', 'moderately loud', 5),
    (d_fri_mape_quiz, 'In PE, regular EXERCISE helps maintain ___.', '["only muscle strength", "overall physical fitness and health", "only flexibility", "only balance"]', 'overall physical fitness and health', 6),
    (d_fri_mape_quiz, 'PRE-COLONIAL Philippine performing arts served to ___.', '["entertain only wealthy people", "mark life events like birth, harvest, and ceremonies", "import foreign ideas", "only decorate temples"]', 'mark life events like birth, harvest, and ceremonies', 7),
    (d_fri_mape_quiz, 'Which is a form of HEALTH that PE addresses?', '["Only mental health", "Only physical health", "Physical, mental, and social well-being", "Only social health"]', 'Physical, mental, and social well-being', 8),
    (d_fri_mape_quiz, 'A ''forte'' (f) marking in music means to play ___.', '["softly", "very softly", "loudly", "very loudly"]', 'loudly', 9),
    (d_fri_mape_quiz, 'Philippine FOLK INSTRUMENTS (like kudyapi, kulintang) show the ___.', '["western influence only", "rich indigenous musical heritage of the Philippines", "lack of musical culture", "modern era of Filipino music"]', 'rich indigenous musical heritage of the Philippines', 10),
    (d_fri_mape_quiz, 'Playing SPORTS develops ___.', '["only physical strength", "only teamwork", "physical fitness, teamwork, discipline, and sportsmanship", "only competition skills"]', 'physical fitness, teamwork, discipline, and sportsmanship', 11);

  -- Friday / Mathematics
  d_fri_math_day := d_fri_aral_day;
  INSERT INTO content_quizzes (content_day_id, subject)
    VALUES (d_fri_math_day, 'Mathematics') RETURNING id INTO d_fri_math_quiz;
  INSERT INTO content_questions (content_quiz_id, prompt, options, correct_answer, sort_order) VALUES
    (d_fri_math_quiz, 'Convert the decimal 0.75 to a fraction in LOWEST TERMS.', '["75/100", "3/4", "7/5", "15/20"]', '3/4', 0),
    (d_fri_math_quiz, 'Convert 0.5 to a fraction.', '["5/10 = 1/2", "1/5", "5/1", "5/100"]', '5/10 = 1/2', 1),
    (d_fri_math_quiz, 'Which decimal is LARGER: 0.7 or 0.35?', '["0.35", "0.7", "They are equal", "Cannot compare"]', '0.7', 2),
    (d_fri_math_quiz, 'Order from SMALLEST to LARGEST: 0.9, 0.09, 0.19', '["0.9, 0.19, 0.09", "0.09, 0.19, 0.9", "0.19, 0.09, 0.9", "0.09, 0.9, 0.19"]', '0.09, 0.19, 0.9', 3),
    (d_fri_math_quiz, 'Convert 3/4 to a decimal.', '["0.34", "0.75", "0.43", "0.7"]', '0.75', 4),
    (d_fri_math_quiz, 'Which decimal has the GREATEST value: 0.3, 0.30, 0.300?', '["0.3", "0.30", "0.300", "They are all equal"]', 'They are all equal', 5),
    (d_fri_math_quiz, 'Convert 0.25 to a fraction in lowest terms.', '["25/100", "1/4", "2/5", "1/5"]', '1/4', 6),
    (d_fri_math_quiz, 'Compare: 0.6 ☐ 0.60. Which symbol fits?', '["<", ">", "=", "\u2260"]', '=', 7),
    (d_fri_math_quiz, 'Which of these is a TERMINATING DECIMAL?', '["1/3", "2/7", "1/4", "1/6"]', '1/4', 8),
    (d_fri_math_quiz, 'In the decimal 3.45, which digit is in the HUNDREDTHS place?', '["3", "4", "5", "45"]', '5', 9),
    (d_fri_math_quiz, 'Convert 0.8 to a fraction in lowest terms.', '["8/10 = 4/5", "8/100", "0.8/1", "4/10"]', '8/10 = 4/5', 10),
    (d_fri_math_quiz, 'Order from GREATEST to SMALLEST: 1.5, 1.05, 1.50', '["1.05, 1.50, 1.5", "1.5, 1.50, 1.05", "1.5 = 1.50 > 1.05", "1.05, 1.5, 1.50"]', '1.5 = 1.50 > 1.05', 11);

  -- Friday / Science
  d_fri_scie_day := d_fri_aral_day;
  INSERT INTO content_quizzes (content_day_id, subject)
    VALUES (d_fri_scie_day, 'Science') RETURNING id INTO d_fri_scie_quiz;
  INSERT INTO content_questions (content_quiz_id, prompt, options, correct_answer, sort_order) VALUES
    (d_fri_scie_quiz, 'Trace the path of FOOD through the digestive system: mouth → ___ → stomach → ___.', '["lungs \u2192 intestines", "esophagus \u2192 small intestine", "trachea \u2192 large intestine", "esophagus \u2192 lungs"]', 'esophagus → small intestine', 0),
    (d_fri_scie_quiz, 'What is the function of the SMALL INTESTINE in digestion?', '["It stores waste", "It pumps blood", "It absorbs most nutrients into the bloodstream", "It breaks down food with acid"]', 'It absorbs most nutrients into the bloodstream', 1),
    (d_fri_scie_quiz, 'Which ANIMAL BODY SYSTEM takes in oxygen from the air?', '["Digestive system", "Reproductive system", "Respiratory system", "Circulatory system"]', 'Respiratory system', 2),
    (d_fri_scie_quiz, 'In the respiratory system, the path of AIR is: nose → ___ → lungs.', '["esophagus", "trachea (windpipe)", "stomach", "mouth only"]', 'trachea (windpipe)', 3),
    (d_fri_scie_quiz, 'The REPRODUCTIVE SYSTEM''s main function is ___.', '["breathing", "digesting food", "producing offspring (growth and development)", "pumping blood"]', 'producing offspring (growth and development)', 4),
    (d_fri_scie_quiz, 'A diagram showing the digestive organs of a frog labeled with names is an example of a ___.', '["bar graph", "labeled model/diagram", "scatter plot", "pie chart"]', 'labeled model/diagram', 5),
    (d_fri_scie_quiz, 'What does the STOMACH do to food?', '["Absorbs it directly into the blood", "Mixes it with gastric acid and churns it", "Removes oxygen from it", "Stores it permanently"]', 'Mixes it with gastric acid and churns it', 6),
    (d_fri_scie_quiz, 'Air enters the body through the ___.', '["stomach", "esophagus", "nose and mouth", "intestines"]', 'nose and mouth', 7),
    (d_fri_scie_quiz, 'Which is part of the RESPIRATORY system?', '["Stomach", "Esophagus", "Lungs", "Liver"]', 'Lungs', 8),
    (d_fri_scie_quiz, 'The LARGE INTESTINE''s main job is to ___.', '["absorb nutrients", "absorb water and prepare waste for removal", "digest proteins", "produce bile"]', 'absorb water and prepare waste for removal', 9),
    (d_fri_scie_quiz, 'In animals, the ESOPHAGUS/GULLET connects the mouth to the ___.', '["lungs", "large intestine", "stomach", "liver"]', 'stomach', 10),
    (d_fri_scie_quiz, 'Why is learning about animal body systems important?', '["It is not useful", "It helps us understand how living things function and stay healthy", "It is only for scientists", "It only applies to humans"]', 'It helps us understand how living things function and stay healthy', 11);

END $g5$;

-- Grade 6 Week 12 (2026-08-31)
DO $g6$ DECLARE
  wid uuid;
  d_mon_engl_day uuid;
  d_mon_engl_quiz uuid;
  d_mon_math_day uuid;
  d_mon_math_quiz uuid;
  d_tue_fili_day uuid;
  d_tue_fili_quiz uuid;
  d_tue_scie_day uuid;
  d_tue_scie_quiz uuid;
  d_wed_aral_day uuid;
  d_wed_aral_quiz uuid;
  d_wed_epp__day uuid;
  d_wed_epp__quiz uuid;
  d_thu_gmrc_day uuid;
  d_thu_gmrc_quiz uuid;
  d_thu_mape_day uuid;
  d_thu_mape_quiz uuid;
  d_fri_aral_day uuid;
  d_fri_aral_quiz uuid;
  d_fri_engl_day uuid;
  d_fri_engl_quiz uuid;
  d_fri_epp__day uuid;
  d_fri_epp__quiz uuid;
  d_fri_fili_day uuid;
  d_fri_fili_quiz uuid;
  d_fri_gmrc_day uuid;
  d_fri_gmrc_quiz uuid;
  d_fri_mape_day uuid;
  d_fri_mape_quiz uuid;
  d_fri_math_day uuid;
  d_fri_math_quiz uuid;
  d_fri_scie_day uuid;
  d_fri_scie_quiz uuid;
BEGIN
  INSERT INTO content_weeks (grade, week_starting_date)
    VALUES (6, '2026-08-31') RETURNING id INTO wid;

  -- Monday
  INSERT INTO content_days (content_week_id, weekday)
    VALUES (wid, 'Monday') RETURNING id INTO d_mon_engl_day;
  INSERT INTO content_quizzes (content_day_id, subject)
    VALUES (d_mon_engl_day, 'English') RETURNING id INTO d_mon_engl_quiz;
  INSERT INTO content_questions (content_quiz_id, prompt, options, correct_answer, sort_order) VALUES
    (d_mon_engl_quiz, 'LITERAL meaning refers to ___.', '["the hidden message in a text", "the figurative or symbolic meaning", "the exact, dictionary meaning of words", "the author''s personal opinion"]', 'the exact, dictionary meaning of words', 0),
    (d_mon_engl_quiz, 'IMPLIED meaning refers to ___.', '["the exact words used", "the meaning suggested but not directly stated", "a dictionary definition", "a numbered list"]', 'the meaning suggested but not directly stated', 1),
    (d_mon_engl_quiz, 'A PERSUASIVE text aims to ___.', '["entertain with a story", "explain how to do something", "convince the reader to agree with an opinion or take action", "describe a place in detail"]', 'convince the reader to agree with an opinion or take action', 2),
    (d_mon_engl_quiz, 'A NARRATIVE text ___.', '["lists facts about a topic", "tells a story (real or imagined)", "instructs the reader step by step", "argues for a position"]', 'tells a story (real or imagined)', 3),
    (d_mon_engl_quiz, 'An EXPOSITORY text ___.', '["tells a fictional story", "gives information and explains a topic", "convinces the reader", "describes feelings only"]', 'gives information and explains a topic', 4),
    (d_mon_engl_quiz, 'Which word shows CONTRAST in a sentence?', '["Furthermore", "Therefore", "However", "Additionally"]', 'However', 5),
    (d_mon_engl_quiz, 'TONE in a text refers to ___.', '["the length of the text", "the author''s attitude toward the subject and reader", "the number of paragraphs", "the font size"]', 'the author''s attitude toward the subject and reader', 6),
    (d_mon_engl_quiz, 'Which is an example of a COMPLEX SENTENCE?', '["She sings and dances.", "She sings.", "Because she loves music, she sings daily.", "She sings, she dances."]', 'Because she loves music, she sings daily.', 7),
    (d_mon_engl_quiz, 'A SURVEY FORM is used to ___.', '["write a story", "collect information and opinions from people", "describe a place", "argue a point"]', 'collect information and opinions from people', 8),
    (d_mon_engl_quiz, 'REFERENCE MATERIALS include ___.', '["only novels", "dictionaries, encyclopedias, almanacs, and atlases", "only newspapers", "only social media posts"]', 'dictionaries, encyclopedias, almanacs, and atlases', 9),
    (d_mon_engl_quiz, 'A THESIS STATEMENT in a composition ___.', '["summarizes all the body paragraphs", "is always the last sentence", "states the main argument or central idea of the text", "provides all the evidence"]', 'states the main argument or central idea of the text', 10),
    (d_mon_engl_quiz, 'NON-VERBAL cues in communication include ___.', '["spoken words", "written text", "facial expressions, gestures, and posture", "vocabulary choices"]', 'facial expressions, gestures, and posture', 11);

  -- Monday / Mathematics
  d_mon_math_day := d_mon_engl_day;
  INSERT INTO content_quizzes (content_day_id, subject)
    VALUES (d_mon_math_day, 'Mathematics') RETURNING id INTO d_mon_math_quiz;
  INSERT INTO content_questions (content_quiz_id, prompt, options, correct_answer, sort_order) VALUES
    (d_mon_math_quiz, 'TESSELLATION means filling a surface with a shape ___.', '["with gaps between shapes", "that overlaps other shapes", "with no gaps or overlaps", "using only circles"]', 'with no gaps or overlaps', 0),
    (d_mon_math_quiz, 'Which shape can TESSELLATE on its own?', '["Circle", "Regular hexagon", "Regular pentagon", "Oval"]', 'Regular hexagon', 1),
    (d_mon_math_quiz, 'A TRANSLATION (slide) moves a shape ___.', '["around a fixed point", "to a mirror image", "without turning or flipping it", "along only one axis"]', 'without turning or flipping it', 2),
    (d_mon_math_quiz, 'A REFLECTION (flip) produces a ___.', '["rotated image", "mirror image", "enlarged image", "translated image"]', 'mirror image', 3),
    (d_mon_math_quiz, 'A ROTATION (turn) moves a shape ___.', '["in a straight line", "around a fixed point (center of rotation)", "to a mirror position", "to a larger size"]', 'around a fixed point (center of rotation)', 4),
    (d_mon_math_quiz, 'Add: 4.567 + 3.21 = ___.', '["7.677", "7.777", "7.877", "7.867"]', '7.777', 5),
    (d_mon_math_quiz, 'Subtract: 10.5 − 3.25 = ___.', '["7.75", "7.25", "6.75", "7.50"]', '7.25', 6),
    (d_mon_math_quiz, 'Mentally multiply 3.6 × 10 = ___.', '["0.36", "3.60", "36", "360"]', '36', 7),
    (d_mon_math_quiz, 'Mentally divide 4.5 ÷ 0.1 = ___.', '["0.45", "4.5", "45", "450"]', '45', 8),
    (d_mon_math_quiz, 'Solve: Ana spent ₱125.50 and ₱87.75. How much did she spend in all?', '["\u20b1213.25", "\u20b1212.25", "\u20b1213.75", "\u20b1212.75"]', '₱213.25', 9),
    (d_mon_math_quiz, 'Which shapes can ALWAYS tessellate?', '["Circles and ovals", "Triangles, squares, and regular hexagons", "All regular polygons", "Pentagons and heptagons"]', 'Triangles, squares, and regular hexagons', 10),
    (d_mon_math_quiz, 'A shape after REFLECTION is always ___.', '["the same size and orientation", "the same size but flipped", "smaller", "larger"]', 'the same size but flipped', 11);

  -- Tuesday
  INSERT INTO content_days (content_week_id, weekday)
    VALUES (wid, 'Tuesday') RETURNING id INTO d_tue_fili_day;
  INSERT INTO content_quizzes (content_day_id, subject)
    VALUES (d_tue_fili_day, 'Filipino') RETURNING id INTO d_tue_fili_quiz;
  INSERT INTO content_questions (content_quiz_id, prompt, options, correct_answer, sort_order) VALUES
    (d_tue_fili_quiz, 'Ang SANAYSAY ay isang ___.', '["maikling kwentong may tagapalad", "malikhaing komposisyong nagpapahayag ng pananaw ng may-akda sa isang paksa", "talaarawan ng mga pangyayari sa kasaysayan", "paglalahad ng mga batas"]', 'malikhaing komposisyong nagpapahayag ng pananaw ng may-akda sa isang paksa', 0),
    (d_tue_fili_quiz, 'Ang LAYUNIN ng isang PERSUASIBONG sanaysay ay ___.', '["magbigay ng impormasyon lamang", "hikayatin ang mambabasa na sumang-ayon sa pananaw ng may-akda", "magsalaysay ng kwento", "ilarawan ang isang lugar"]', 'hikayatin ang mambabasa na sumang-ayon sa pananaw ng may-akda', 1),
    (d_tue_fili_quiz, 'Ang KATIBAYAN o EBIDENSYA sa sanaysay ay ginagamit upang ___.', '["palakasin ang argumento ng may-akda", "gawing mas mahaba ang akda", "palugod ang mambabasa", "lagyan ng dekorasyon ang pahayag"]', 'palakasin ang argumento ng may-akda', 2),
    (d_tue_fili_quiz, 'Ang KONKLUSYON ng isang sanaysay ay ___.', '["nagpapakilala ng paksa", "nagbubuod ng mga pangunahing punto at nagbibigay ng pangwakas na pahayag", "nagbibigay ng mga katibayan", "nagsasalaysay ng kwento"]', 'nagbubuod ng mga pangunahing punto at nagbibigay ng pangwakas na pahayag', 3),
    (d_tue_fili_quiz, 'Ang salitang ''subalit'' ay ginagamit upang ipahayag ang ___.', '["sanhi", "bunga", "kabaligtaran o kontrasto", "pagdaragdag"]', 'kabaligtaran o kontrasto', 4),
    (d_tue_fili_quiz, 'Ang POKUS ng pangungusap ay ang ___.', '["pinakamahabang salita", "salitang ginawang paksa ng pangungusap", "kahulugan ng pangungusap", "bilang ng mga salita"]', 'salitang ginawang paksa ng pangungusap', 5),
    (d_tue_fili_quiz, '''Tiningnan ng bata ang laruan.'' Ano ang pokus ng pangungusap?', '["laruan", "tiningnan", "ng bata", "ng bata tiningnan ang laruan"]', 'laruan', 6),
    (d_tue_fili_quiz, 'Ang MULTIMEDIA ay gumagamit ng ___.', '["teksto lamang", "kumbinasyon ng teksto, imahe, tunog, at video", "pelikula lamang", "radyo lamang"]', 'kumbinasyon ng teksto, imahe, tunog, at video', 7),
    (d_tue_fili_quiz, 'Ang TONO ng isang akda ay nagpapakita ng ___.', '["haba ng kwento", "saloobin ng may-akda sa paksa at sa mambabasa", "bilang ng tauhan", "uri ng mga tayutay"]', 'saloobin ng may-akda sa paksa at sa mambabasa', 8),
    (d_tue_fili_quiz, 'Alin ang PANGUNAHING LAYUNIN ng IMPORMASYONG teksto?', '["Magbigay ng impormasyon at kaalaman", "Magkuwento", "Magbigay ng aliw", "Manghikayat sa isang gawi"]', 'Magbigay ng impormasyon at kaalaman', 9),
    (d_tue_fili_quiz, 'Ang PAKSA ng isang talata ay ___.', '["ang pinakamahalagang detalye", "ang pangunahing ideya na pinag-uusapan ng talata", "ang huling pangungusap", "ang pinakamaiklinging pangungusap"]', 'ang pangunahing ideya na pinag-uusapan ng talata', 10),
    (d_tue_fili_quiz, '''Dahil maaga syang gumising, naabutan niya ang bus.'' Ano ang dahilan?', '["Naabutan niya ang bus", "Maaga syang gumising", "Ang bus ay naabutan", "Ang pagsakay sa bus"]', 'Maaga syang gumising', 11);

  -- Tuesday / Science
  d_tue_scie_day := d_tue_fili_day;
  INSERT INTO content_quizzes (content_day_id, subject)
    VALUES (d_tue_scie_day, 'Science') RETURNING id INTO d_tue_scie_quiz;
  INSERT INTO content_questions (content_quiz_id, prompt, options, correct_answer, sort_order) VALUES
    (d_tue_scie_quiz, 'EVAPORATION is the process where a liquid changes to a ___.', '["solid", "gas", "plasma", "liquid of different color"]', 'gas', 0),
    (d_tue_scie_quiz, 'CONDENSATION is the process where a gas changes to a ___.', '["solid", "another gas", "liquid", "plasma"]', 'liquid', 1),
    (d_tue_scie_quiz, 'MELTING changes a ___ to a liquid.', '["gas", "solid", "plasma", "solution"]', 'solid', 2),
    (d_tue_scie_quiz, 'FREEZING changes a liquid to a ___.', '["gas", "solid", "plasma", "mixture"]', 'solid', 3),
    (d_tue_scie_quiz, 'Physical changes are REVERSIBLE. Which is an example?', '["Burning wood", "Rusting iron", "Melting ice", "Baking a cake"]', 'Melting ice', 4),
    (d_tue_scie_quiz, 'Chemical changes are IRREVERSIBLE. Which is an example?', '["Melting butter", "Dissolving sugar in water", "Rusting of iron", "Boiling water"]', 'Rusting of iron', 5),
    (d_tue_scie_quiz, 'A SOLUTION is a ___ mixture.', '["non-uniform", "uniform (homogeneous)", "visible", "layered"]', 'uniform (homogeneous)', 6),
    (d_tue_scie_quiz, 'A SUSPENSION is a ___ mixture.', '["uniform", "transparent", "non-uniform (heterogeneous)", "permanent"]', 'non-uniform (heterogeneous)', 7),
    (d_tue_scie_quiz, 'What separation technique uses a FILTER (filter paper) to separate a solid from a liquid?', '["Evaporation", "Decantation", "Filtering", "Winnowing"]', 'Filtering', 8),
    (d_tue_scie_quiz, 'WINNOWING separates grain from chaff by using ___.', '["water", "heat", "wind (air)", "magnets"]', 'wind (air)', 9),
    (d_tue_scie_quiz, 'Air is described as a MIXTURE containing ___.', '["only oxygen", "only carbon dioxide", "oxygen, nitrogen, carbon dioxide, and water vapor", "only nitrogen"]', 'oxygen, nitrogen, carbon dioxide, and water vapor', 10),
    (d_tue_scie_quiz, 'DECANTATION separates mixtures by ___.', '["filtering through paper", "carefully pouring off the liquid, leaving the solid behind", "using a magnet", "using heat"]', 'carefully pouring off the liquid, leaving the solid behind', 11);

  -- Wednesday
  INSERT INTO content_days (content_week_id, weekday)
    VALUES (wid, 'Wednesday') RETURNING id INTO d_wed_aral_day;
  INSERT INTO content_quizzes (content_day_id, subject)
    VALUES (d_wed_aral_day, 'Araling Panlipunan') RETURNING id INTO d_wed_aral_quiz;
  INSERT INTO content_questions (content_quiz_id, prompt, options, correct_answer, sort_order) VALUES
    (d_wed_aral_quiz, 'Ang KATIPUNAN ay itinatag noong ___.', '["1890", "1892", "1896", "1898"]', '1892', 0),
    (d_wed_aral_quiz, 'Sino ang nagtatag ng Katipunan?', '["Jose Rizal", "Emilio Aguinaldo", "Andres Bonifacio", "Apolinario Mabini"]', 'Andres Bonifacio', 1),
    (d_wed_aral_quiz, 'Ang layunin ng KATIPUNAN ay ___.', '["makipagtulungan sa Espanya", "makamit ang kalayaan ng Pilipinas sa pamamagitan ng armadong pakikipaglaban", "magtatag ng bagong relihiyon", "magtayo ng bagong bansa sa labas ng Asya"]', 'makamit ang kalayaan ng Pilipinas sa pamamagitan ng armadong pakikipaglaban', 2),
    (d_wed_aral_quiz, 'Ang HIMAGSIKANG PILIPINO ay nagsimula noong ___.', '["1872", "1892", "1896", "1898"]', '1896', 3),
    (d_wed_aral_quiz, 'Ang ''SIGAW SA PUGADLAWIN'' ay nagpapahayag ng ___.', '["pagsuko ng mga Pilipino", "simula ng armadong pakikipaglaban laban sa Espanya", "pagkakaisa sa Espanya", "pagpapalabas ng bagong batas"]', 'simula ng armadong pakikipaglaban laban sa Espanya', 4),
    (d_wed_aral_quiz, 'Si Jose Rizal ay naging martir ng Pilipinas. Ano ang ibig sabihin ng MARTIR?', '["Bayani na namatay para sa kapakanan ng bayan", "Lider ng sandatahang lakas", "Guro ng mga Pilipino", "Pinuno ng simbahan"]', 'Bayani na namatay para sa kapakanan ng bayan', 5),
    (d_wed_aral_quiz, 'Ang KASUNDUAN SA BIAK-NA-BATO (1897) ay nagresulta sa ___.', '["pagpapalaya ng lahat ng bilanggo", "pansamantalang tigilan ng labanan at pagpapatapon ni Aguinaldo", "kalayaan ng Pilipinas", "pagkatalo ng mga Kastila"]', 'pansamantalang tigilan ng labanan at pagpapatapon ni Aguinaldo', 6),
    (d_wed_aral_quiz, 'Ang KUMBENSIYON NG TEJEROS (1897) ay humantong sa ___.', '["pagtatayo ng bagong pamahalaan", "pagpapalitan ng pamumuno mula kay Bonifacio patungong Aguinaldo", "pagkakaisa ng lahat ng rebelde", "pagkatalo ng Katipunan"]', 'pagpapalitan ng pamumuno mula kay Bonifacio patungong Aguinaldo', 7),
    (d_wed_aral_quiz, 'Ang DEKLARASYON NG KASARINLAN ng Pilipinas ay ipinahayag noong Hunyo 12, 1898. Ano ang kahulugan nito?', '["Ang Pilipinas ay sumuko sa Espanya", "Idineklara ng Pilipinas ang sarili nitong kalayaan", "Ang Pilipinas ay naging kolonya ng Amerika", "Sumama ang Pilipinas sa Espanya"]', 'Idineklara ng Pilipinas ang sarili nitong kalayaan', 8),
    (d_wed_aral_quiz, 'Sino ang pinaslang kasama si Andres Bonifacio matapos ang Kumbensiyon ng Tejeros?', '["Jose Rizal", "Emilio Aguinaldo", "Procopio Bonifacio (kapatid niya)", "Apolinario Mabini"]', 'Procopio Bonifacio (kapatid niya)', 9),
    (d_wed_aral_quiz, 'Ang KATIPUNAN ay isang lihim na samahan na naglunsad ng ___ laban sa pananakop ng Espanya.', '["marahas na protesta sa simbahan", "armadong rebolusyon", "mapayapang negosasyon", "komersyal na boykot"]', 'armadong rebolusyon', 10),
    (d_wed_aral_quiz, 'Ang HIMAGSIKANG PILIPINO ay mahalaga dahil ___.', '["nagpakita ito ng pagkabigo ng Pilipino", "nagpakita ito ng tapang at pagmamahal ng mga Pilipino sa kalayaan", "nagpakita ito ng lakas ng Espanya", "nagpakita ito ng kapangyarihan ng Amerika"]', 'nagpakita ito ng tapang at pagmamahal ng mga Pilipino sa kalayaan', 11);

  -- Wednesday / EPP (ICT)
  d_wed_epp__day := d_wed_aral_day;
  INSERT INTO content_quizzes (content_day_id, subject)
    VALUES (d_wed_epp__day, 'EPP (ICT)') RETURNING id INTO d_wed_epp__quiz;
  INSERT INTO content_questions (content_quiz_id, prompt, options, correct_answer, sort_order) VALUES
    (d_wed_epp__quiz, 'MULTIMEDIA EDITING involves working with ___.', '["only text documents", "a combination of video, audio, images, and text", "only spreadsheets", "only databases"]', 'a combination of video, audio, images, and text', 0),
    (d_wed_epp__quiz, 'BASIC CODING teaches you to ___.', '["only type fast", "give instructions to a computer to perform tasks", "draw digital art", "edit videos only"]', 'give instructions to a computer to perform tasks', 1),
    (d_wed_epp__quiz, 'What is an ALGORITHM?', '["A type of computer virus", "A step-by-step set of instructions for solving a problem", "A keyboard shortcut", "A type of social media"]', 'A step-by-step set of instructions for solving a problem', 2),
    (d_wed_epp__quiz, 'A SEQUENCE in coding means ___.', '["running instructions in a random order", "repeating an instruction many times", "executing instructions in a specific order, one after another", "choosing between two options"]', 'executing instructions in a specific order, one after another', 3),
    (d_wed_epp__quiz, 'A LOOP in coding is used to ___.', '["stop the program", "repeat a set of instructions a number of times or until a condition is met", "skip an instruction", "name a variable"]', 'repeat a set of instructions a number of times or until a condition is met', 4),
    (d_wed_epp__quiz, 'An IF-THEN statement in coding is a ___.', '["loop", "variable", "sequence", "conditional/decision structure"]', 'conditional/decision structure', 5),
    (d_wed_epp__quiz, 'What is a VARIABLE in coding?', '["A type of loop", "A storage location that holds a value which can change", "An output device", "A type of program error"]', 'A storage location that holds a value which can change', 6),
    (d_wed_epp__quiz, 'VIDEO EDITING software is used to ___.', '["create spreadsheets", "cut, combine, and add effects to video clips", "write code", "design databases"]', 'cut, combine, and add effects to video clips', 7),
    (d_wed_epp__quiz, 'AUDIO EDITING involves ___.', '["only changing file names", "recording, cutting, and adjusting sound files", "designing websites", "writing text documents"]', 'recording, cutting, and adjusting sound files', 8),
    (d_wed_epp__quiz, 'Which is a simple coding platform used in Philippine elementary schools?', '["Excel", "Scratch", "AutoCAD", "Adobe Premiere"]', 'Scratch', 9),
    (d_wed_epp__quiz, '''DEBUG'' in coding means to ___.', '["add more code", "find and fix errors in a program", "delete the program", "rename a file"]', 'find and fix errors in a program', 10),
    (d_wed_epp__quiz, 'A FLOWCHART is a diagram that shows ___.', '["only the final output", "the step-by-step flow of a program or process", "only variables", "only loops"]', 'the step-by-step flow of a program or process', 11);

  -- Thursday
  INSERT INTO content_days (content_week_id, weekday)
    VALUES (wid, 'Thursday') RETURNING id INTO d_thu_gmrc_day;
  INSERT INTO content_quizzes (content_day_id, subject)
    VALUES (d_thu_gmrc_day, 'GMRC') RETURNING id INTO d_thu_gmrc_quiz;
  INSERT INTO content_questions (content_quiz_id, prompt, options, correct_answer, sort_order) VALUES
    (d_thu_gmrc_quiz, 'HUMAN DIGNITY means ___.', '["being better than others", "the inherent worth and value of every person as a unique creation", "having more possessions", "being the most talented"]', 'the inherent worth and value of every person as a unique creation', 0),
    (d_thu_gmrc_quiz, 'A POSITIVE SELF-CONCEPT means ___.', '["thinking you are perfect", "having a realistic and healthy view of your own strengths and areas for growth", "ignoring your weaknesses", "comparing yourself to others constantly"]', 'having a realistic and healthy view of your own strengths and areas for growth', 1),
    (d_thu_gmrc_quiz, 'SELF-RESPECT means ___.', '["looking down on others", "taking care of yourself and treating yourself with dignity", "always getting what you want", "ignoring other people''s feelings"]', 'taking care of yourself and treating yourself with dignity', 2),
    (d_thu_gmrc_quiz, 'Recognizing that you are unique helps you ___.', '["feel superior to others", "appreciate your own value and respect the uniqueness of others", "ignore others", "become selfish"]', 'appreciate your own value and respect the uniqueness of others', 3),
    (d_thu_gmrc_quiz, 'VIRTUES are ___.', '["bad habits", "good character traits developed through practice", "rules imposed by others", "inherited traits only"]', 'good character traits developed through practice', 4),
    (d_thu_gmrc_quiz, 'INTEGRITY means ___.', '["doing what is right only when others are watching", "doing what is right even when no one is watching", "always following the crowd", "only being honest sometimes"]', 'doing what is right even when no one is watching', 5),
    (d_thu_gmrc_quiz, 'A person with a POSITIVE SELF-CONCEPT will ___.', '["give up easily when things are difficult", "keep trying and believe in their ability to improve", "blame others for failures", "avoid challenges"]', 'keep trying and believe in their ability to improve', 6),
    (d_thu_gmrc_quiz, 'SELF-AWARENESS means ___.', '["knowing only your strengths", "understanding your own feelings, strengths, and areas for growth", "ignoring your emotions", "knowing what others think of you"]', 'understanding your own feelings, strengths, and areas for growth', 7),
    (d_thu_gmrc_quiz, 'Which BEST describes a person who respects their own dignity?', '["They bully others to feel powerful", "They take care of their health, relationships, and character", "They always depend on others", "They ignore rules and responsibilities"]', 'They take care of their health, relationships, and character', 8),
    (d_thu_gmrc_quiz, 'COMPASSION means ___.', '["feeling sad for yourself", "understanding and wanting to help those who are suffering", "ignoring the problems of others", "showing off your good deeds"]', 'understanding and wanting to help those who are suffering', 9),
    (d_thu_gmrc_quiz, 'Developing GOOD HABITS is important because ___.', '["habits are easy to break", "good habits shape your character and lead to a better life", "only adults need good habits", "habits do not matter in the long run"]', 'good habits shape your character and lead to a better life', 10),
    (d_thu_gmrc_quiz, 'Which is the FOUNDATION of a positive self-concept?', '["Wealth and possessions", "Popularity", "Recognizing your inherent dignity as a human being", "Academic grades only"]', 'Recognizing your inherent dignity as a human being', 11);

  -- Thursday / MAPEH
  d_thu_mape_day := d_thu_gmrc_day;
  INSERT INTO content_quizzes (content_day_id, subject)
    VALUES (d_thu_mape_day, 'MAPEH') RETURNING id INTO d_thu_mape_quiz;
  INSERT INTO content_questions (content_quiz_id, prompt, options, correct_answer, sort_order) VALUES
    (d_thu_mape_quiz, 'The REVOLUTIONARY PERIOD in Philippine arts (1801-1898) was characterized by ___.', '["purely religious themes", "arts that reflected national awakening and the desire for freedom", "purely foreign influences", "the absence of visual arts"]', 'arts that reflected national awakening and the desire for freedom', 0),
    (d_thu_mape_quiz, 'JUAN LUNA and FELIX RESURRECION HIDALGO are famous Filipino artists of the ___.', '["pre-colonial period", "American period", "Revolutionary/19th century period", "contemporary period"]', 'Revolutionary/19th century period', 1),
    (d_thu_mape_quiz, '''SPOLARIUM'' was painted by ___.', '["Felix Resurreccion Hidalgo", "Jose Rizal", "Juan Luna", "Francisco Balagtas"]', 'Juan Luna', 2),
    (d_thu_mape_quiz, 'HOLISTIC WELLNESS means ___.', '["only physical fitness", "only mental health", "overall well-being covering physical, mental, emotional, and social health", "only spiritual health"]', 'overall well-being covering physical, mental, emotional, and social health', 3),
    (d_thu_mape_quiz, 'TARGET GAMES in PE require skill in ___.', '["running speed only", "swimming distance", "aiming at a specific target", "jumping height"]', 'aiming at a specific target', 4),
    (d_thu_mape_quiz, 'BADMINTON is an example of a ___.', '["target game", "invasion game", "net/wall game", "striking/fielding game"]', 'net/wall game', 5),
    (d_thu_mape_quiz, 'The KUNDIMAN is a type of Filipino ___.', '["folk dance", "painting style", "romantic song", "weaving pattern"]', 'romantic song', 6),
    (d_thu_mape_quiz, 'Regular PHYSICAL ACTIVITY is important because it ___.', '["makes you tired and weak", "improves cardiovascular fitness, strength, and mental health", "is only for athletes", "replaces the need for sleep"]', 'improves cardiovascular fitness, strength, and mental health', 7),
    (d_thu_mape_quiz, 'Philippine art during the revolutionary period often expressed ___.', '["surrender to colonial powers", "patriotism and longing for freedom", "happiness with Spanish rule", "only religious devotion"]', 'patriotism and longing for freedom', 8),
    (d_thu_mape_quiz, 'BMI (Body Mass Index) is used to ___.', '["measure how fast you run", "assess if a person''s weight is healthy relative to height", "measure how strong your muscles are", "count calories burned"]', 'assess if a person''s weight is healthy relative to height', 9),
    (d_thu_mape_quiz, 'FOLK DANCES of the Philippines reflect ___.', '["western culture only", "the culture, history, and way of life of Filipino communities", "modern entertainment only", "American influence"]', 'the culture, history, and way of life of Filipino communities', 10),
    (d_thu_mape_quiz, 'In PE, FAIR PLAY means ___.', '["winning at all costs", "following rules, respecting opponents, and accepting outcomes gracefully", "cheating only when not caught", "playing only when you can win"]', 'following rules, respecting opponents, and accepting outcomes gracefully', 11);

  -- Friday
  INSERT INTO content_days (content_week_id, weekday)
    VALUES (wid, 'Friday') RETURNING id INTO d_fri_aral_day;
  INSERT INTO content_quizzes (content_day_id, subject)
    VALUES (d_fri_aral_day, 'Araling Panlipunan') RETURNING id INTO d_fri_aral_quiz;
  INSERT INTO content_questions (content_quiz_id, prompt, options, correct_answer, sort_order) VALUES
    (d_fri_aral_quiz, 'Ang KATIPUNAN ay itinatag noong ___.', '["1890", "1892", "1896", "1898"]', '1892', 0),
    (d_fri_aral_quiz, 'Sino ang nagtatag ng Katipunan?', '["Jose Rizal", "Emilio Aguinaldo", "Andres Bonifacio", "Apolinario Mabini"]', 'Andres Bonifacio', 1),
    (d_fri_aral_quiz, 'Ang layunin ng KATIPUNAN ay ___.', '["makipagtulungan sa Espanya", "makamit ang kalayaan ng Pilipinas sa pamamagitan ng armadong pakikipaglaban", "magtatag ng bagong relihiyon", "magtayo ng bagong bansa sa labas ng Asya"]', 'makamit ang kalayaan ng Pilipinas sa pamamagitan ng armadong pakikipaglaban', 2),
    (d_fri_aral_quiz, 'Ang HIMAGSIKANG PILIPINO ay nagsimula noong ___.', '["1872", "1892", "1896", "1898"]', '1896', 3),
    (d_fri_aral_quiz, 'Ang ''SIGAW SA PUGADLAWIN'' ay nagpapahayag ng ___.', '["pagsuko ng mga Pilipino", "simula ng armadong pakikipaglaban laban sa Espanya", "pagkakaisa sa Espanya", "pagpapalabas ng bagong batas"]', 'simula ng armadong pakikipaglaban laban sa Espanya', 4),
    (d_fri_aral_quiz, 'Si Jose Rizal ay naging martir ng Pilipinas. Ano ang ibig sabihin ng MARTIR?', '["Bayani na namatay para sa kapakanan ng bayan", "Lider ng sandatahang lakas", "Guro ng mga Pilipino", "Pinuno ng simbahan"]', 'Bayani na namatay para sa kapakanan ng bayan', 5),
    (d_fri_aral_quiz, 'Ang KASUNDUAN SA BIAK-NA-BATO (1897) ay nagresulta sa ___.', '["pagpapalaya ng lahat ng bilanggo", "pansamantalang tigilan ng labanan at pagpapatapon ni Aguinaldo", "kalayaan ng Pilipinas", "pagkatalo ng mga Kastila"]', 'pansamantalang tigilan ng labanan at pagpapatapon ni Aguinaldo', 6),
    (d_fri_aral_quiz, 'Ang KUMBENSIYON NG TEJEROS (1897) ay humantong sa ___.', '["pagtatayo ng bagong pamahalaan", "pagpapalitan ng pamumuno mula kay Bonifacio patungong Aguinaldo", "pagkakaisa ng lahat ng rebelde", "pagkatalo ng Katipunan"]', 'pagpapalitan ng pamumuno mula kay Bonifacio patungong Aguinaldo', 7),
    (d_fri_aral_quiz, 'Ang DEKLARASYON NG KASARINLAN ng Pilipinas ay ipinahayag noong Hunyo 12, 1898. Ano ang kahulugan nito?', '["Ang Pilipinas ay sumuko sa Espanya", "Idineklara ng Pilipinas ang sarili nitong kalayaan", "Ang Pilipinas ay naging kolonya ng Amerika", "Sumama ang Pilipinas sa Espanya"]', 'Idineklara ng Pilipinas ang sarili nitong kalayaan', 8),
    (d_fri_aral_quiz, 'Sino ang pinaslang kasama si Andres Bonifacio matapos ang Kumbensiyon ng Tejeros?', '["Jose Rizal", "Emilio Aguinaldo", "Procopio Bonifacio (kapatid niya)", "Apolinario Mabini"]', 'Procopio Bonifacio (kapatid niya)', 9),
    (d_fri_aral_quiz, 'Ang KATIPUNAN ay isang lihim na samahan na naglunsad ng ___ laban sa pananakop ng Espanya.', '["marahas na protesta sa simbahan", "armadong rebolusyon", "mapayapang negosasyon", "komersyal na boykot"]', 'armadong rebolusyon', 10),
    (d_fri_aral_quiz, 'Ang HIMAGSIKANG PILIPINO ay mahalaga dahil ___.', '["nagpakita ito ng pagkabigo ng Pilipino", "nagpakita ito ng tapang at pagmamahal ng mga Pilipino sa kalayaan", "nagpakita ito ng lakas ng Espanya", "nagpakita ito ng kapangyarihan ng Amerika"]', 'nagpakita ito ng tapang at pagmamahal ng mga Pilipino sa kalayaan', 11);

  -- Friday / English
  d_fri_engl_day := d_fri_aral_day;
  INSERT INTO content_quizzes (content_day_id, subject)
    VALUES (d_fri_engl_day, 'English') RETURNING id INTO d_fri_engl_quiz;
  INSERT INTO content_questions (content_quiz_id, prompt, options, correct_answer, sort_order) VALUES
    (d_fri_engl_quiz, 'LITERAL meaning refers to ___.', '["the hidden message in a text", "the figurative or symbolic meaning", "the exact, dictionary meaning of words", "the author''s personal opinion"]', 'the exact, dictionary meaning of words', 0),
    (d_fri_engl_quiz, 'IMPLIED meaning refers to ___.', '["the exact words used", "the meaning suggested but not directly stated", "a dictionary definition", "a numbered list"]', 'the meaning suggested but not directly stated', 1),
    (d_fri_engl_quiz, 'A PERSUASIVE text aims to ___.', '["entertain with a story", "explain how to do something", "convince the reader to agree with an opinion or take action", "describe a place in detail"]', 'convince the reader to agree with an opinion or take action', 2),
    (d_fri_engl_quiz, 'A NARRATIVE text ___.', '["lists facts about a topic", "tells a story (real or imagined)", "instructs the reader step by step", "argues for a position"]', 'tells a story (real or imagined)', 3),
    (d_fri_engl_quiz, 'An EXPOSITORY text ___.', '["tells a fictional story", "gives information and explains a topic", "convinces the reader", "describes feelings only"]', 'gives information and explains a topic', 4),
    (d_fri_engl_quiz, 'Which word shows CONTRAST in a sentence?', '["Furthermore", "Therefore", "However", "Additionally"]', 'However', 5),
    (d_fri_engl_quiz, 'TONE in a text refers to ___.', '["the length of the text", "the author''s attitude toward the subject and reader", "the number of paragraphs", "the font size"]', 'the author''s attitude toward the subject and reader', 6),
    (d_fri_engl_quiz, 'Which is an example of a COMPLEX SENTENCE?', '["She sings and dances.", "She sings.", "Because she loves music, she sings daily.", "She sings, she dances."]', 'Because she loves music, she sings daily.', 7),
    (d_fri_engl_quiz, 'A SURVEY FORM is used to ___.', '["write a story", "collect information and opinions from people", "describe a place", "argue a point"]', 'collect information and opinions from people', 8),
    (d_fri_engl_quiz, 'REFERENCE MATERIALS include ___.', '["only novels", "dictionaries, encyclopedias, almanacs, and atlases", "only newspapers", "only social media posts"]', 'dictionaries, encyclopedias, almanacs, and atlases', 9),
    (d_fri_engl_quiz, 'A THESIS STATEMENT in a composition ___.', '["summarizes all the body paragraphs", "is always the last sentence", "states the main argument or central idea of the text", "provides all the evidence"]', 'states the main argument or central idea of the text', 10),
    (d_fri_engl_quiz, 'NON-VERBAL cues in communication include ___.', '["spoken words", "written text", "facial expressions, gestures, and posture", "vocabulary choices"]', 'facial expressions, gestures, and posture', 11);

  -- Friday / EPP (ICT)
  d_fri_epp__day := d_fri_aral_day;
  INSERT INTO content_quizzes (content_day_id, subject)
    VALUES (d_fri_epp__day, 'EPP (ICT)') RETURNING id INTO d_fri_epp__quiz;
  INSERT INTO content_questions (content_quiz_id, prompt, options, correct_answer, sort_order) VALUES
    (d_fri_epp__quiz, 'MULTIMEDIA EDITING involves working with ___.', '["only text documents", "a combination of video, audio, images, and text", "only spreadsheets", "only databases"]', 'a combination of video, audio, images, and text', 0),
    (d_fri_epp__quiz, 'BASIC CODING teaches you to ___.', '["only type fast", "give instructions to a computer to perform tasks", "draw digital art", "edit videos only"]', 'give instructions to a computer to perform tasks', 1),
    (d_fri_epp__quiz, 'What is an ALGORITHM?', '["A type of computer virus", "A step-by-step set of instructions for solving a problem", "A keyboard shortcut", "A type of social media"]', 'A step-by-step set of instructions for solving a problem', 2),
    (d_fri_epp__quiz, 'A SEQUENCE in coding means ___.', '["running instructions in a random order", "repeating an instruction many times", "executing instructions in a specific order, one after another", "choosing between two options"]', 'executing instructions in a specific order, one after another', 3),
    (d_fri_epp__quiz, 'A LOOP in coding is used to ___.', '["stop the program", "repeat a set of instructions a number of times or until a condition is met", "skip an instruction", "name a variable"]', 'repeat a set of instructions a number of times or until a condition is met', 4),
    (d_fri_epp__quiz, 'An IF-THEN statement in coding is a ___.', '["loop", "variable", "sequence", "conditional/decision structure"]', 'conditional/decision structure', 5),
    (d_fri_epp__quiz, 'What is a VARIABLE in coding?', '["A type of loop", "A storage location that holds a value which can change", "An output device", "A type of program error"]', 'A storage location that holds a value which can change', 6),
    (d_fri_epp__quiz, 'VIDEO EDITING software is used to ___.', '["create spreadsheets", "cut, combine, and add effects to video clips", "write code", "design databases"]', 'cut, combine, and add effects to video clips', 7),
    (d_fri_epp__quiz, 'AUDIO EDITING involves ___.', '["only changing file names", "recording, cutting, and adjusting sound files", "designing websites", "writing text documents"]', 'recording, cutting, and adjusting sound files', 8),
    (d_fri_epp__quiz, 'Which is a simple coding platform used in Philippine elementary schools?', '["Excel", "Scratch", "AutoCAD", "Adobe Premiere"]', 'Scratch', 9),
    (d_fri_epp__quiz, '''DEBUG'' in coding means to ___.', '["add more code", "find and fix errors in a program", "delete the program", "rename a file"]', 'find and fix errors in a program', 10),
    (d_fri_epp__quiz, 'A FLOWCHART is a diagram that shows ___.', '["only the final output", "the step-by-step flow of a program or process", "only variables", "only loops"]', 'the step-by-step flow of a program or process', 11);

  -- Friday / Filipino
  d_fri_fili_day := d_fri_aral_day;
  INSERT INTO content_quizzes (content_day_id, subject)
    VALUES (d_fri_fili_day, 'Filipino') RETURNING id INTO d_fri_fili_quiz;
  INSERT INTO content_questions (content_quiz_id, prompt, options, correct_answer, sort_order) VALUES
    (d_fri_fili_quiz, 'Ang SANAYSAY ay isang ___.', '["maikling kwentong may tagapalad", "malikhaing komposisyong nagpapahayag ng pananaw ng may-akda sa isang paksa", "talaarawan ng mga pangyayari sa kasaysayan", "paglalahad ng mga batas"]', 'malikhaing komposisyong nagpapahayag ng pananaw ng may-akda sa isang paksa', 0),
    (d_fri_fili_quiz, 'Ang LAYUNIN ng isang PERSUASIBONG sanaysay ay ___.', '["magbigay ng impormasyon lamang", "hikayatin ang mambabasa na sumang-ayon sa pananaw ng may-akda", "magsalaysay ng kwento", "ilarawan ang isang lugar"]', 'hikayatin ang mambabasa na sumang-ayon sa pananaw ng may-akda', 1),
    (d_fri_fili_quiz, 'Ang KATIBAYAN o EBIDENSYA sa sanaysay ay ginagamit upang ___.', '["palakasin ang argumento ng may-akda", "gawing mas mahaba ang akda", "palugod ang mambabasa", "lagyan ng dekorasyon ang pahayag"]', 'palakasin ang argumento ng may-akda', 2),
    (d_fri_fili_quiz, 'Ang KONKLUSYON ng isang sanaysay ay ___.', '["nagpapakilala ng paksa", "nagbubuod ng mga pangunahing punto at nagbibigay ng pangwakas na pahayag", "nagbibigay ng mga katibayan", "nagsasalaysay ng kwento"]', 'nagbubuod ng mga pangunahing punto at nagbibigay ng pangwakas na pahayag', 3),
    (d_fri_fili_quiz, 'Ang salitang ''subalit'' ay ginagamit upang ipahayag ang ___.', '["sanhi", "bunga", "kabaligtaran o kontrasto", "pagdaragdag"]', 'kabaligtaran o kontrasto', 4),
    (d_fri_fili_quiz, 'Ang POKUS ng pangungusap ay ang ___.', '["pinakamahabang salita", "salitang ginawang paksa ng pangungusap", "kahulugan ng pangungusap", "bilang ng mga salita"]', 'salitang ginawang paksa ng pangungusap', 5),
    (d_fri_fili_quiz, '''Tiningnan ng bata ang laruan.'' Ano ang pokus ng pangungusap?', '["laruan", "tiningnan", "ng bata", "ng bata tiningnan ang laruan"]', 'laruan', 6),
    (d_fri_fili_quiz, 'Ang MULTIMEDIA ay gumagamit ng ___.', '["teksto lamang", "kumbinasyon ng teksto, imahe, tunog, at video", "pelikula lamang", "radyo lamang"]', 'kumbinasyon ng teksto, imahe, tunog, at video', 7),
    (d_fri_fili_quiz, 'Ang TONO ng isang akda ay nagpapakita ng ___.', '["haba ng kwento", "saloobin ng may-akda sa paksa at sa mambabasa", "bilang ng tauhan", "uri ng mga tayutay"]', 'saloobin ng may-akda sa paksa at sa mambabasa', 8),
    (d_fri_fili_quiz, 'Alin ang PANGUNAHING LAYUNIN ng IMPORMASYONG teksto?', '["Magbigay ng impormasyon at kaalaman", "Magkuwento", "Magbigay ng aliw", "Manghikayat sa isang gawi"]', 'Magbigay ng impormasyon at kaalaman', 9),
    (d_fri_fili_quiz, 'Ang PAKSA ng isang talata ay ___.', '["ang pinakamahalagang detalye", "ang pangunahing ideya na pinag-uusapan ng talata", "ang huling pangungusap", "ang pinakamaiklinging pangungusap"]', 'ang pangunahing ideya na pinag-uusapan ng talata', 10),
    (d_fri_fili_quiz, '''Dahil maaga syang gumising, naabutan niya ang bus.'' Ano ang dahilan?', '["Naabutan niya ang bus", "Maaga syang gumising", "Ang bus ay naabutan", "Ang pagsakay sa bus"]', 'Maaga syang gumising', 11);

  -- Friday / GMRC
  d_fri_gmrc_day := d_fri_aral_day;
  INSERT INTO content_quizzes (content_day_id, subject)
    VALUES (d_fri_gmrc_day, 'GMRC') RETURNING id INTO d_fri_gmrc_quiz;
  INSERT INTO content_questions (content_quiz_id, prompt, options, correct_answer, sort_order) VALUES
    (d_fri_gmrc_quiz, 'HUMAN DIGNITY means ___.', '["being better than others", "the inherent worth and value of every person as a unique creation", "having more possessions", "being the most talented"]', 'the inherent worth and value of every person as a unique creation', 0),
    (d_fri_gmrc_quiz, 'A POSITIVE SELF-CONCEPT means ___.', '["thinking you are perfect", "having a realistic and healthy view of your own strengths and areas for growth", "ignoring your weaknesses", "comparing yourself to others constantly"]', 'having a realistic and healthy view of your own strengths and areas for growth', 1),
    (d_fri_gmrc_quiz, 'SELF-RESPECT means ___.', '["looking down on others", "taking care of yourself and treating yourself with dignity", "always getting what you want", "ignoring other people''s feelings"]', 'taking care of yourself and treating yourself with dignity', 2),
    (d_fri_gmrc_quiz, 'Recognizing that you are unique helps you ___.', '["feel superior to others", "appreciate your own value and respect the uniqueness of others", "ignore others", "become selfish"]', 'appreciate your own value and respect the uniqueness of others', 3),
    (d_fri_gmrc_quiz, 'VIRTUES are ___.', '["bad habits", "good character traits developed through practice", "rules imposed by others", "inherited traits only"]', 'good character traits developed through practice', 4),
    (d_fri_gmrc_quiz, 'INTEGRITY means ___.', '["doing what is right only when others are watching", "doing what is right even when no one is watching", "always following the crowd", "only being honest sometimes"]', 'doing what is right even when no one is watching', 5),
    (d_fri_gmrc_quiz, 'A person with a POSITIVE SELF-CONCEPT will ___.', '["give up easily when things are difficult", "keep trying and believe in their ability to improve", "blame others for failures", "avoid challenges"]', 'keep trying and believe in their ability to improve', 6),
    (d_fri_gmrc_quiz, 'SELF-AWARENESS means ___.', '["knowing only your strengths", "understanding your own feelings, strengths, and areas for growth", "ignoring your emotions", "knowing what others think of you"]', 'understanding your own feelings, strengths, and areas for growth', 7),
    (d_fri_gmrc_quiz, 'Which BEST describes a person who respects their own dignity?', '["They bully others to feel powerful", "They take care of their health, relationships, and character", "They always depend on others", "They ignore rules and responsibilities"]', 'They take care of their health, relationships, and character', 8),
    (d_fri_gmrc_quiz, 'COMPASSION means ___.', '["feeling sad for yourself", "understanding and wanting to help those who are suffering", "ignoring the problems of others", "showing off your good deeds"]', 'understanding and wanting to help those who are suffering', 9),
    (d_fri_gmrc_quiz, 'Developing GOOD HABITS is important because ___.', '["habits are easy to break", "good habits shape your character and lead to a better life", "only adults need good habits", "habits do not matter in the long run"]', 'good habits shape your character and lead to a better life', 10),
    (d_fri_gmrc_quiz, 'Which is the FOUNDATION of a positive self-concept?', '["Wealth and possessions", "Popularity", "Recognizing your inherent dignity as a human being", "Academic grades only"]', 'Recognizing your inherent dignity as a human being', 11);

  -- Friday / MAPEH
  d_fri_mape_day := d_fri_aral_day;
  INSERT INTO content_quizzes (content_day_id, subject)
    VALUES (d_fri_mape_day, 'MAPEH') RETURNING id INTO d_fri_mape_quiz;
  INSERT INTO content_questions (content_quiz_id, prompt, options, correct_answer, sort_order) VALUES
    (d_fri_mape_quiz, 'The REVOLUTIONARY PERIOD in Philippine arts (1801-1898) was characterized by ___.', '["purely religious themes", "arts that reflected national awakening and the desire for freedom", "purely foreign influences", "the absence of visual arts"]', 'arts that reflected national awakening and the desire for freedom', 0),
    (d_fri_mape_quiz, 'JUAN LUNA and FELIX RESURRECION HIDALGO are famous Filipino artists of the ___.', '["pre-colonial period", "American period", "Revolutionary/19th century period", "contemporary period"]', 'Revolutionary/19th century period', 1),
    (d_fri_mape_quiz, '''SPOLARIUM'' was painted by ___.', '["Felix Resurreccion Hidalgo", "Jose Rizal", "Juan Luna", "Francisco Balagtas"]', 'Juan Luna', 2),
    (d_fri_mape_quiz, 'HOLISTIC WELLNESS means ___.', '["only physical fitness", "only mental health", "overall well-being covering physical, mental, emotional, and social health", "only spiritual health"]', 'overall well-being covering physical, mental, emotional, and social health', 3),
    (d_fri_mape_quiz, 'TARGET GAMES in PE require skill in ___.', '["running speed only", "swimming distance", "aiming at a specific target", "jumping height"]', 'aiming at a specific target', 4),
    (d_fri_mape_quiz, 'BADMINTON is an example of a ___.', '["target game", "invasion game", "net/wall game", "striking/fielding game"]', 'net/wall game', 5),
    (d_fri_mape_quiz, 'The KUNDIMAN is a type of Filipino ___.', '["folk dance", "painting style", "romantic song", "weaving pattern"]', 'romantic song', 6),
    (d_fri_mape_quiz, 'Regular PHYSICAL ACTIVITY is important because it ___.', '["makes you tired and weak", "improves cardiovascular fitness, strength, and mental health", "is only for athletes", "replaces the need for sleep"]', 'improves cardiovascular fitness, strength, and mental health', 7),
    (d_fri_mape_quiz, 'Philippine art during the revolutionary period often expressed ___.', '["surrender to colonial powers", "patriotism and longing for freedom", "happiness with Spanish rule", "only religious devotion"]', 'patriotism and longing for freedom', 8),
    (d_fri_mape_quiz, 'BMI (Body Mass Index) is used to ___.', '["measure how fast you run", "assess if a person''s weight is healthy relative to height", "measure how strong your muscles are", "count calories burned"]', 'assess if a person''s weight is healthy relative to height', 9),
    (d_fri_mape_quiz, 'FOLK DANCES of the Philippines reflect ___.', '["western culture only", "the culture, history, and way of life of Filipino communities", "modern entertainment only", "American influence"]', 'the culture, history, and way of life of Filipino communities', 10),
    (d_fri_mape_quiz, 'In PE, FAIR PLAY means ___.', '["winning at all costs", "following rules, respecting opponents, and accepting outcomes gracefully", "cheating only when not caught", "playing only when you can win"]', 'following rules, respecting opponents, and accepting outcomes gracefully', 11);

  -- Friday / Mathematics
  d_fri_math_day := d_fri_aral_day;
  INSERT INTO content_quizzes (content_day_id, subject)
    VALUES (d_fri_math_day, 'Mathematics') RETURNING id INTO d_fri_math_quiz;
  INSERT INTO content_questions (content_quiz_id, prompt, options, correct_answer, sort_order) VALUES
    (d_fri_math_quiz, 'TESSELLATION means filling a surface with a shape ___.', '["with gaps between shapes", "that overlaps other shapes", "with no gaps or overlaps", "using only circles"]', 'with no gaps or overlaps', 0),
    (d_fri_math_quiz, 'Which shape can TESSELLATE on its own?', '["Circle", "Regular hexagon", "Regular pentagon", "Oval"]', 'Regular hexagon', 1),
    (d_fri_math_quiz, 'A TRANSLATION (slide) moves a shape ___.', '["around a fixed point", "to a mirror image", "without turning or flipping it", "along only one axis"]', 'without turning or flipping it', 2),
    (d_fri_math_quiz, 'A REFLECTION (flip) produces a ___.', '["rotated image", "mirror image", "enlarged image", "translated image"]', 'mirror image', 3),
    (d_fri_math_quiz, 'A ROTATION (turn) moves a shape ___.', '["in a straight line", "around a fixed point (center of rotation)", "to a mirror position", "to a larger size"]', 'around a fixed point (center of rotation)', 4),
    (d_fri_math_quiz, 'Add: 4.567 + 3.21 = ___.', '["7.677", "7.777", "7.877", "7.867"]', '7.777', 5),
    (d_fri_math_quiz, 'Subtract: 10.5 − 3.25 = ___.', '["7.75", "7.25", "6.75", "7.50"]', '7.25', 6),
    (d_fri_math_quiz, 'Mentally multiply 3.6 × 10 = ___.', '["0.36", "3.60", "36", "360"]', '36', 7),
    (d_fri_math_quiz, 'Mentally divide 4.5 ÷ 0.1 = ___.', '["0.45", "4.5", "45", "450"]', '45', 8),
    (d_fri_math_quiz, 'Solve: Ana spent ₱125.50 and ₱87.75. How much did she spend in all?', '["\u20b1213.25", "\u20b1212.25", "\u20b1213.75", "\u20b1212.75"]', '₱213.25', 9),
    (d_fri_math_quiz, 'Which shapes can ALWAYS tessellate?', '["Circles and ovals", "Triangles, squares, and regular hexagons", "All regular polygons", "Pentagons and heptagons"]', 'Triangles, squares, and regular hexagons', 10),
    (d_fri_math_quiz, 'A shape after REFLECTION is always ___.', '["the same size and orientation", "the same size but flipped", "smaller", "larger"]', 'the same size but flipped', 11);

  -- Friday / Science
  d_fri_scie_day := d_fri_aral_day;
  INSERT INTO content_quizzes (content_day_id, subject)
    VALUES (d_fri_scie_day, 'Science') RETURNING id INTO d_fri_scie_quiz;
  INSERT INTO content_questions (content_quiz_id, prompt, options, correct_answer, sort_order) VALUES
    (d_fri_scie_quiz, 'EVAPORATION is the process where a liquid changes to a ___.', '["solid", "gas", "plasma", "liquid of different color"]', 'gas', 0),
    (d_fri_scie_quiz, 'CONDENSATION is the process where a gas changes to a ___.', '["solid", "another gas", "liquid", "plasma"]', 'liquid', 1),
    (d_fri_scie_quiz, 'MELTING changes a ___ to a liquid.', '["gas", "solid", "plasma", "solution"]', 'solid', 2),
    (d_fri_scie_quiz, 'FREEZING changes a liquid to a ___.', '["gas", "solid", "plasma", "mixture"]', 'solid', 3),
    (d_fri_scie_quiz, 'Physical changes are REVERSIBLE. Which is an example?', '["Burning wood", "Rusting iron", "Melting ice", "Baking a cake"]', 'Melting ice', 4),
    (d_fri_scie_quiz, 'Chemical changes are IRREVERSIBLE. Which is an example?', '["Melting butter", "Dissolving sugar in water", "Rusting of iron", "Boiling water"]', 'Rusting of iron', 5),
    (d_fri_scie_quiz, 'A SOLUTION is a ___ mixture.', '["non-uniform", "uniform (homogeneous)", "visible", "layered"]', 'uniform (homogeneous)', 6),
    (d_fri_scie_quiz, 'A SUSPENSION is a ___ mixture.', '["uniform", "transparent", "non-uniform (heterogeneous)", "permanent"]', 'non-uniform (heterogeneous)', 7),
    (d_fri_scie_quiz, 'What separation technique uses a FILTER (filter paper) to separate a solid from a liquid?', '["Evaporation", "Decantation", "Filtering", "Winnowing"]', 'Filtering', 8),
    (d_fri_scie_quiz, 'WINNOWING separates grain from chaff by using ___.', '["water", "heat", "wind (air)", "magnets"]', 'wind (air)', 9),
    (d_fri_scie_quiz, 'Air is described as a MIXTURE containing ___.', '["only oxygen", "only carbon dioxide", "oxygen, nitrogen, carbon dioxide, and water vapor", "only nitrogen"]', 'oxygen, nitrogen, carbon dioxide, and water vapor', 10),
    (d_fri_scie_quiz, 'DECANTATION separates mixtures by ___.', '["filtering through paper", "carefully pouring off the liquid, leaving the solid behind", "using a magnet", "using heat"]', 'carefully pouring off the liquid, leaving the solid behind', 11);

END $g6$;
