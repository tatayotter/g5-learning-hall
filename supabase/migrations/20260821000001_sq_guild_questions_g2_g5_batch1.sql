-- Migration: Add 50 questions per side-quest guild for Grade 2 and Grade 5, Term 1.
-- Guilds: sq_lorekeeper, sq_spellcaster, sq_number_realm, sq_logic_labyrinth, sq_lexicon_arena
-- Difficulty tiers 1–3 per guild. Grade-level appropriate for DepEd G2 / G5 curriculum.

-- ============================================================================
-- SQ_LOREKEEPER — Grade 2 (50 questions)
-- Topics: Science, Araling Panlipunan, English, Filipino language & culture
-- ============================================================================
INSERT INTO public.sq_lorekeeper (term_id, grade_level, is_active, question, choice_a, choice_b, choice_c, choice_d, correct_choice, difficulty_tier) VALUES
-- Tier 1 – direct recall
(1, 2, true, 'What do plants need to grow well?', 'Only water', 'Sunlight, water, and air', 'Only soil', 'Only sunlight', 'b', 1),
(1, 2, true, 'Which of these is a living thing?', 'Rock', 'Chair', 'Dog', 'Window', 'c', 1),
(1, 2, true, 'Which body part do we use to see?', 'Nose', 'Ear', 'Eye', 'Mouth', 'c', 1),
(1, 2, true, 'Which animal lays eggs?', 'Dog', 'Cat', 'Chicken', 'Rabbit', 'c', 1),
(1, 2, true, 'What do caterpillars become?', 'Butterflies', 'Frogs', 'Birds', 'Fish', 'a', 1),
(1, 2, true, 'What is the biggest body of water on Earth?', 'River', 'Lake', 'Ocean', 'Pond', 'c', 1),
(1, 2, true, 'What is the capital city of the Philippines?', 'Cebu', 'Davao', 'Manila', 'Iloilo', 'c', 1),
(1, 2, true, 'Who is the national hero of the Philippines?', 'Andres Bonifacio', 'Emilio Aguinaldo', 'Jose Rizal', 'Ferdinand Magellan', 'c', 1),
(1, 2, true, 'How many sides does a square have?', 'Three', 'Four', 'Five', 'Six', 'b', 1),
(1, 2, true, 'What do we call the liquid that falls from clouds?', 'Dew', 'Rain', 'Frost', 'Mist', 'b', 1),
(1, 2, true, 'Which color is the sun?', 'Blue', 'Green', 'Yellow', 'Red', 'c', 1),
(1, 2, true, 'What kind of food do cows eat?', 'Fish', 'Mice', 'Grass', 'Seeds', 'c', 1),
(1, 2, true, 'Which season in the Philippines has the most rain?', 'Tag-araw', 'Tag-ulan', 'Taglamig', 'Tagsibol', 'b', 1),
(1, 2, true, 'What do we call a person who takes care of sick people in a hospital?', 'Guro', 'Doktor', 'Pulis', 'Magsasaka', 'b', 1),
(1, 2, true, 'Which animal is known as the "king of the jungle"?', 'Tiger', 'Elephant', 'Lion', 'Crocodile', 'c', 1),
-- Tier 2 – basic understanding
(1, 2, true, 'What do roots do for a plant?', 'Make flowers', 'Absorb water and nutrients from the soil', 'Make food using sunlight', 'Give shade', 'b', 2),
(1, 2, true, 'What is the process when a caterpillar changes into a butterfly?', 'Evolution', 'Metamorphosis', 'Migration', 'Hibernation', 'b', 2),
(1, 2, true, 'Which part of the plant makes food using sunlight?', 'Root', 'Stem', 'Leaf', 'Flower', 'c', 2),
(1, 2, true, 'What do we call animals that eat only plants?', 'Carnivores', 'Herbivores', 'Omnivores', 'Predators', 'b', 2),
(1, 2, true, 'What happens to water when it is heated enough?', 'It becomes ice', 'It becomes heavier', 'It evaporates and becomes water vapor', 'It turns into soil', 'c', 2),
(1, 2, true, 'What does a thermometer measure?', 'Wind speed', 'Rainfall', 'Temperature', 'Humidity', 'c', 2),
(1, 2, true, 'Why is it important to keep our surroundings clean?', 'To impress visitors', 'To prevent diseases and protect our environment', 'To follow school rules only', 'To make things look colorful', 'b', 2),
(1, 2, true, 'What does "kind" mean in this sentence: "She was kind to the stray dog"?', 'Angry', 'Mean', 'Gentle and caring', 'Frightened', 'c', 2),
(1, 2, true, 'What is the main idea of this sentence: "Birds have wings, feathers, and a beak"?', 'Birds are scary', 'Birds are beautiful', 'Birds have special body parts', 'Birds can swim', 'c', 2),
(1, 2, true, 'What does it mean to be a good citizen?', 'To always get what you want', 'To follow rules and help others in the community', 'To ignore other people''s problems', 'To be the smartest person', 'b', 2),
(1, 2, true, 'Ana has a garden. She waters her plants every morning. The sun helps them grow. After weeks, she picks her vegetables. What does Ana do every morning?', 'She picks vegetables', 'She waters her plants', 'She pulls out weeds', 'She plants new seeds', 'b', 2),
(1, 2, true, 'Based on the story about Ana: Why do Ana''s plants grow well?', 'She uses fertilizer', 'She waters them and the sun helps them grow', 'She keeps them in the dark', 'She talks to them every day', 'b', 2),
(1, 2, true, 'Pedro drives a bus and takes people to their destinations. He starts work very early every day. What is Pedro''s job?', 'He bakes bread', 'He teaches students', 'He drives a bus', 'He fixes pipes', 'c', 2),
(1, 2, true, 'Why are community helpers like Pedro important?', 'They make the community more fun', 'They help people get to important places and meet important needs', 'They earn a lot of money', 'They give free food', 'b', 2),
(1, 2, true, 'What do we call the natural home of an animal?', 'A cage', 'A habitat', 'A zoo', 'A farm', 'b', 2),
-- Tier 3 – reasoning and broader knowledge
(1, 2, true, 'What is photosynthesis?', 'Animals breathing oxygen', 'Plants making food using sunlight, water, and air', 'Water turning into rain', 'Soil absorbing water', 'b', 3),
(1, 2, true, 'What is the main difference between a mammal and a reptile?', 'Mammals have scales; reptiles have fur', 'Mammals are warm-blooded and have fur; reptiles are cold-blooded and have scales', 'Mammals lay eggs; reptiles give birth', 'Mammals live in water; reptiles live on land', 'b', 3),
(1, 2, true, 'Which type of cloud usually brings heavy rain?', 'Cumulus', 'Cirrus', 'Cumulonimbus', 'Stratus', 'c', 3),
(1, 2, true, 'What does the sun on the Philippine flag represent?', 'The 8 major islands of the Philippines', 'The 8 provinces that first fought for independence from Spain', 'The 8 founding families of the Philippines', 'The 8 stars in the sky', 'b', 3),
(1, 2, true, 'What is the difference between needs and wants?', 'Needs are things we like; wants are things we must have', 'Needs are things we must have to survive; wants are things we like but don''t need', 'They mean the same thing', 'Needs are always more expensive', 'b', 3),
(1, 2, true, 'Pedro worked hard on his farm every day. He woke up before sunrise and planted seeds, watered them, and removed weeds. After three months, his vegetables were ready. What can you say about Pedro?', 'He was lazy', 'He was careless', 'He was hardworking and patient', 'He did not like farming', 'c', 3),
(1, 2, true, 'What does the word "harvest" mean?', 'To plant seeds in the ground', 'To water the plants', 'To gather crops that are ready to be picked', 'To sell vegetables at the market', 'c', 3),
(1, 2, true, 'In the sentence "The brave firefighter saved the child," which word is an adjective?', 'Firefighter', 'Saved', 'Brave', 'Child', 'c', 3),
(1, 2, true, 'Coral reefs look like colorful underwater gardens. Many fish and sea creatures live there. The Philippines has many coral reefs. What can you say about coral reefs?', 'They are found only in rivers', 'They are beautiful and important homes for many sea creatures', 'They are dangerous and have no life', 'They are made of sand', 'b', 3),
(1, 2, true, 'What do we call the thin layer of air that surrounds the Earth and protects it?', 'Hydrosphere', 'Biosphere', 'Atmosphere', 'Lithosphere', 'c', 3),
(1, 2, true, 'Why do we cover our mouth and nose when we sneeze or cough?', 'Because it looks nice', 'To prevent spreading germs to others', 'Because the teacher said so', 'To smell better', 'b', 3),
(1, 2, true, 'What is recycling?', 'Throwing garbage in the sea', 'Burning all waste', 'Using old materials to make new useful things', 'Digging holes for waste', 'c', 3),
(1, 2, true, 'What makes a sentence complete?', 'It must have a verb only', 'It must have a subject and a verb and express a complete thought', 'It must be very long', 'It must have commas', 'b', 3),
(1, 2, true, 'Ang isang tao ay "mapagbigay" kapag siya ay palaging _____.', 'Nagagalit sa iba', 'Nagbibigay at tumutulong sa kapwa', 'Nagtatrabaho nang mag-isa', 'Kumakain nang marami', 'b', 3),
(1, 2, true, 'Ano ang tawag sa ibon na simbolo ng Pilipinas?', 'Maya', 'Kalapati', 'Philippine Eagle', 'Tikling', 'c', 3);

-- ============================================================================
-- SQ_LOREKEEPER — Grade 5 (50 questions)
-- Topics: Science, Philippine History, English Literature, Filipino
-- ============================================================================
INSERT INTO public.sq_lorekeeper (term_id, grade_level, is_active, question, choice_a, choice_b, choice_c, choice_d, correct_choice, difficulty_tier) VALUES
-- Tier 1
(1, 5, true, 'What are the three states of matter?', 'Hot, warm, cold', 'Heavy, medium, light', 'Solid, liquid, gas', 'Hard, soft, liquid', 'c', 1),
(1, 5, true, 'What is the basic unit of life?', 'Organ', 'Tissue', 'System', 'Cell', 'd', 1),
(1, 5, true, 'What force pulls objects toward the Earth?', 'Magnetism', 'Friction', 'Buoyancy', 'Gravity', 'd', 1),
(1, 5, true, 'Who wrote the novel "Noli Me Tangere"?', 'Andres Bonifacio', 'Emilio Aguinaldo', 'Jose Rizal', 'Marcelo del Pilar', 'c', 1),
(1, 5, true, 'When did the Philippines declare independence from Spain?', '1876', '1898', '1902', '1935', 'b', 1),
(1, 5, true, 'What is a simile?', 'A comparison using "is"', 'A comparison using "like" or "as"', 'A word that describes a noun', 'An exaggerated statement', 'b', 1),
(1, 5, true, 'What is the main purpose of a topic sentence in a paragraph?', 'To give supporting examples', 'To conclude the paragraph', 'To state the main idea of the paragraph', 'To list the details', 'c', 1),
(1, 5, true, 'What is the role of the leaves in a plant?', 'To absorb water from the soil', 'To anchor the plant to the ground', 'To make food for the plant through photosynthesis', 'To transport water only', 'c', 1),
(1, 5, true, 'Ano ang ibig sabihin ng salitang "Katipunan"?', 'Samahan ng mga Kastila', 'Lihim na samahan na nagtataguyod ng kalayaan', 'Organisasyon ng mga magsasaka', 'Pangkat ng mga manunulat', 'b', 1),
(1, 5, true, 'What is an ecosystem?', 'A collection of plants only', 'A type of habitat with only animals', 'A system inside the human body', 'All living and non-living things interacting in an area', 'd', 1),
(1, 5, true, 'What do decomposers do in an ecosystem?', 'They produce their own food', 'They hunt other animals', 'They break down dead organisms and recycle nutrients into the soil', 'They absorb sunlight for energy', 'c', 1),
(1, 5, true, 'What does "figurative language" use that literal language does not?', 'Facts and statistics', 'Exact dictionary meanings', 'Symbols, comparisons, and non-literal expressions for effect', 'Numbers and data', 'c', 1),
(1, 5, true, 'Which organ filters waste from the blood in the human body?', 'Liver', 'Heart', 'Lungs', 'Kidney', 'd', 1),
(1, 5, true, 'What type of energy is stored in food?', 'Kinetic energy', 'Thermal energy', 'Chemical energy', 'Nuclear energy', 'c', 1),
(1, 5, true, 'Ano ang tawag sa mahabang tula na nagsasalaysay ng kabayanihan?', 'Soneto', 'Epiko', 'Pabula', 'Parabula', 'b', 1),
-- Tier 2
(1, 5, true, 'In the food chain "grass → grasshopper → frog → snake → eagle," what is the grass?', 'Primary consumer', 'Secondary consumer', 'Decomposer', 'Producer', 'd', 2),
(1, 5, true, 'What was the Katipunan?', 'A Spanish colonial government agency', 'A Catholic religious order in the Philippines', 'A secret revolutionary society founded by Andres Bonifacio to fight Spanish rule', 'A trade organization in Manila', 'c', 2),
(1, 5, true, 'What does the transfer of heat through direct contact between objects mean?', 'Convection', 'Radiation', 'Conduction', 'Evaporation', 'c', 2),
(1, 5, true, 'What literary device is used in "The wind whispered through the trees"?', 'Simile', 'Hyperbole', 'Alliteration', 'Personification', 'd', 2),
(1, 5, true, 'Identify the adverb in: "She spoke softly to the crying child."', 'She', 'Spoke', 'Softly', 'Child', 'c', 2),
(1, 5, true, 'Which sentence contains a dependent clause?', 'Maria runs every morning.', 'The dog barked.', 'Although it was raining, he went outside.', 'She loves to read.', 'c', 2),
(1, 5, true, 'What is the difference between a vertebrate and an invertebrate?', 'Vertebrates have shells; invertebrates do not', 'Vertebrates lay eggs; invertebrates give birth', 'Vertebrates live in water; invertebrates live on land', 'Vertebrates have a backbone; invertebrates do not', 'd', 2),
(1, 5, true, 'Ano ang kahulugan ng "denotasyon" ng isang salita?', 'Ang emosyon na dulot ng salita', 'Ang tuwirang kahulugan ng salita sa diksyunaryo', 'Ang imahe na nalilikha ng salita', 'Ang etimolohiya ng salita', 'b', 2),
(1, 5, true, 'What is the significance of the Cry of Pugad Lawin?', 'The start of Spanish colonization of the Philippines', 'The signing of the first Philippine Constitution', 'The moment Filipinos tore their cedulas and launched the revolution against Spain', 'The end of World War II in the Philippines', 'c', 2),
(1, 5, true, 'The ancient Maya were skilled astronomers. They built temples aligned with the stars and created one of the most accurate calendars in history. What is the main idea of this passage?', 'Mayan temples were beautiful', 'The Maya were warlike people', 'The Maya had an advanced understanding of science and mathematics', 'Mayan calendars were adopted by all cultures', 'c', 2),
(1, 5, true, 'Mang Tasyo trudged to the market each morning despite the heavy rain. His rough hands clasped his basket tightly. He would not let his family go hungry. What can you infer about Mang Tasyo?', 'He is lazy and careless', 'He is determined and deeply devoted to his family', 'He is wealthy and buys everything he wants', 'He is afraid of the rain', 'b', 2),
(1, 5, true, 'In the same passage about Mang Tasyo, what does "trudged" most likely mean?', 'Walked quickly and lightly', 'Ran excitedly', 'Jumped carefully', 'Walked slowly and heavily under effort', 'd', 2),
(1, 5, true, 'Ano ang tayutay na "Ang buhay ay isang paglalakbay"?', 'Simili', 'Personipikasyon', 'Metapor', 'Pagmamalabis', 'c', 2),
(1, 5, true, 'What is the difference between a physical change and a chemical change?', 'Both create new substances', 'Physical changes are not reversible; chemical changes are', 'Physical changes do not create new substances and are often reversible; chemical changes create new substances', 'Chemical changes only happen with heat', 'c', 2),
(1, 5, true, 'How did the encomienda system affect Filipinos during the Spanish colonial period?', 'It gave Filipinos free land to farm', 'It provided Filipinos with free education', 'It allowed Filipinos to trade freely with other countries', 'It forced Filipinos to pay tribute and provide labor for Spanish colonizers', 'd', 2),
-- Tier 3
(1, 5, true, 'What is Newton''s First Law of Motion?', 'Force equals mass times acceleration', 'For every action there is an equal and opposite reaction', 'Objects with greater mass fall faster', 'An object at rest stays at rest unless acted upon by an unbalanced external force', 'd', 3),
(1, 5, true, 'What is the overall equation for photosynthesis?', 'O₂ + glucose → CO₂ + H₂O', 'H₂O + glucose → O₂ + CO₂', 'Light → glucose + CO₂', 'CO₂ + H₂O + light energy → glucose + O₂', 'd', 3),
(1, 5, true, 'What is the difference between connotation and denotation?', 'Connotation is the dictionary meaning; denotation is the emotional meaning', 'Denotation is the literal meaning; connotation is the emotional or cultural association of a word', 'They are exactly the same thing', 'Connotation applies only to verbs', 'b', 3),
(1, 5, true, 'What is dramatic irony?', 'When a character says the opposite of what they mean', 'When events turn out unexpectedly for the characters', 'When the audience knows something that the characters do not', 'When the setting creates extreme tension', 'c', 3),
(1, 5, true, 'What is the purpose of a thesis statement in an essay?', 'To list all the facts and evidence', 'To conclude the writer''s ideas at the end', 'To provide the central argument or claim the entire essay will support', 'To identify the essay''s genre', 'c', 3),
(1, 5, true, 'What were the galleon trade routes and why were they important?', 'Ships from Spain carrying slaves; important for colonial labor', 'Ships trading rice; important for feeding Spanish soldiers', 'Ships carrying missionaries to convert Asians', 'Ships trading silver from Mexico for goods from Asia; linking two hemispheres in commerce', 'd', 3),
(1, 5, true, 'Who was Gabriela Silang and what is she known for?', 'A Spanish governor''s wife who helped the poor', 'A religious leader who founded a new church in Ilocos', 'A novelist who wrote about colonial oppression', 'A Filipina revolutionary leader who continued fighting after her husband Diego Silang was killed', 'd', 3),
(1, 5, true, 'What is the primary source vs. secondary source distinction in historical research?', 'Primary sources are more important; secondary are less important', 'Primary sources are written by experts; secondary by students', 'Primary sources are original first-hand accounts; secondary sources interpret or analyze those accounts', 'They are the same type of evidence', 'c', 3),
(1, 5, true, 'Ano ang "anaphora" sa panitikan?', 'Paulit-ulit na salita sa dulo ng bawat linya', 'Paggamit ng magkakatulad na simile at metapor', 'Paulit-ulit na salita o parirala sa simula ng magkakasunod na linya para sa diin', 'Pagbibigay ng boses at damdamin sa mga bagay', 'c', 3),
(1, 5, true, 'Ano ang pagkakaiba ng "parabula" sa "pabula"?', 'Walang pagkakaiba ang dalawa', 'Ang parabula ay may mga hayop na tauhan; ang pabula ay may mga tao', 'Ang parabula ay mas maikling kwento kaysa pabula', 'Ang pabula ay may mga hayop na tauhan at nagbibigay ng aral sa buhay; ang parabula ay may mga taong tauhan na may espiritwal o moral na aral', 'd', 3),
(1, 5, true, 'Which layer of the Earth is the thinnest?', 'Mantle', 'Outer core', 'Inner core', 'Crust', 'd', 3),
(1, 5, true, 'In the context of Philippine history, why is Jose Rizal considered the national hero rather than Andres Bonifacio, who actually led armed resistance?', 'Because Rizal was richer and more famous', 'Because Bonifacio was not Filipino', 'Because Rizal was chosen by the American colonial government partly for his advocacy of peaceful reform, though this choice is still debated by historians', 'Because Rizal fought more battles', 'c', 3),
(1, 5, true, 'What is first-person point of view in a narrative?', 'The narrator knows everything about all characters', 'The story is told by an outside observer using "he" and "she"', 'The author speaks directly to the reader using "you"', 'A character within the story narrates using "I" and "me"', 'd', 3),
(1, 5, true, 'What is the difference between a mixture and a compound?', 'They are the same thing', 'A mixture can be separated by physical means; a compound cannot and has fixed proportions of elements', 'A compound is easier to separate than a mixture', 'Mixtures are made of only two substances; compounds can have many', 'b', 3);

-- ============================================================================
-- SQ_SPELLCASTER — Grade 2 (50 words)
-- Simple to moderately complex English words appropriate for G2 level
-- ============================================================================
INSERT INTO public.sq_spellcaster (term_id, grade_level, is_active, word_string, difficulty_tier) VALUES
-- Tier 1: Short, phonetic words (CVC and CVCC patterns)
(1, 2, true, 'cat', 1),
(1, 2, true, 'dog', 1),
(1, 2, true, 'sun', 1),
(1, 2, true, 'run', 1),
(1, 2, true, 'hat', 1),
(1, 2, true, 'bed', 1),
(1, 2, true, 'cup', 1),
(1, 2, true, 'bug', 1),
(1, 2, true, 'map', 1),
(1, 2, true, 'sit', 1),
(1, 2, true, 'hop', 1),
(1, 2, true, 'wet', 1),
(1, 2, true, 'fun', 1),
(1, 2, true, 'leg', 1),
(1, 2, true, 'top', 1),
(1, 2, true, 'hot', 1),
(1, 2, true, 'big', 1),
(1, 2, true, 'red', 1),
(1, 2, true, 'van', 1),
(1, 2, true, 'zip', 1),
-- Tier 2: Longer common words
(1, 2, true, 'happy', 2),
(1, 2, true, 'apple', 2),
(1, 2, true, 'child', 2),
(1, 2, true, 'house', 2),
(1, 2, true, 'water', 2),
(1, 2, true, 'plant', 2),
(1, 2, true, 'light', 2),
(1, 2, true, 'night', 2),
(1, 2, true, 'clean', 2),
(1, 2, true, 'bread', 2),
(1, 2, true, 'three', 2),
(1, 2, true, 'chair', 2),
(1, 2, true, 'table', 2),
(1, 2, true, 'river', 2),
(1, 2, true, 'stone', 2),
(1, 2, true, 'brown', 2),
(1, 2, true, 'cloud', 2),
(1, 2, true, 'heart', 2),
(1, 2, true, 'green', 2),
(1, 2, true, 'ready', 2),
-- Tier 3: More complex spelling for advanced G2
(1, 2, true, 'school', 3),
(1, 2, true, 'flower', 3),
(1, 2, true, 'market', 3),
(1, 2, true, 'mother', 3),
(1, 2, true, 'friend', 3),
(1, 2, true, 'summer', 3),
(1, 2, true, 'number', 3),
(1, 2, true, 'garden', 3),
(1, 2, true, 'animal', 3),
(1, 2, true, 'butter', 3);

-- ============================================================================
-- SQ_SPELLCASTER — Grade 5 (50 words)
-- Curriculum-level and above English vocabulary words
-- ============================================================================
INSERT INTO public.sq_spellcaster (term_id, grade_level, is_active, word_string, difficulty_tier) VALUES
-- Tier 1
(1, 5, true, 'receive', 1),
(1, 5, true, 'believe', 1),
(1, 5, true, 'achieve', 1),
(1, 5, true, 'because', 1),
(1, 5, true, 'surprise', 1),
(1, 5, true, 'describe', 1),
(1, 5, true, 'exciting', 1),
(1, 5, true, 'actually', 1),
(1, 5, true, 'separate', 1),
(1, 5, true, 'tomorrow', 1),
(1, 5, true, 'together', 1),
(1, 5, true, 'continue', 1),
(1, 5, true, 'complete', 1),
(1, 5, true, 'possible', 1),
(1, 5, true, 'practice', 1),
(1, 5, true, 'sentence', 1),
(1, 5, true, 'language', 1),
-- Tier 2
(1, 5, true, 'necessary', 2),
(1, 5, true, 'beautiful', 2),
(1, 5, true, 'beginning', 2),
(1, 5, true, 'committee', 2),
(1, 5, true, 'guarantee', 2),
(1, 5, true, 'government', 2),
(1, 5, true, 'paragraph', 2),
(1, 5, true, 'recommend', 2),
(1, 5, true, 'character', 2),
(1, 5, true, 'knowledge', 2),
(1, 5, true, 'adventure', 2),
(1, 5, true, 'privilege', 2),
(1, 5, true, 'desperate', 2),
(1, 5, true, 'permanent', 2),
(1, 5, true, 'pollution', 2),
(1, 5, true, 'discovery', 2),
(1, 5, true, 'frequency', 2),
-- Tier 3
(1, 5, true, 'environment', 3),
(1, 5, true, 'exaggeration', 3),
(1, 5, true, 'communication', 3),
(1, 5, true, 'photosynthesis', 3),
(1, 5, true, 'circumstances', 3),
(1, 5, true, 'particularly', 3),
(1, 5, true, 'simultaneously', 3),
(1, 5, true, 'consciousness', 3),
(1, 5, true, 'independence', 3),
(1, 5, true, 'accomplishment', 3),
(1, 5, true, 'significantly', 3),
(1, 5, true, 'opportunities', 3),
(1, 5, true, 'deterioration', 3),
(1, 5, true, 'electromagnetic', 3),
(1, 5, true, 'responsibility', 3),
(1, 5, true, 'metamorphosis', 3);

-- ============================================================================
-- SQ_NUMBER_REALM — Grade 2 (50 problems)
-- Topics: addition, subtraction, multiplication intro, place value, time, fractions
-- ============================================================================
INSERT INTO public.sq_number_realm (term_id, grade_level, is_active, problem_prompt, expected_layout, correct_standard_ans, difficulty_tier) VALUES
-- Tier 1: Basic arithmetic
(1, 2, true, '5 + 3 = ?', 'standard', '8', 1),
(1, 2, true, '10 - 4 = ?', 'standard', '6', 1),
(1, 2, true, '2 + 9 = ?', 'standard', '11', 1),
(1, 2, true, '14 - 7 = ?', 'standard', '7', 1),
(1, 2, true, '6 + 7 = ?', 'standard', '13', 1),
(1, 2, true, '20 - 8 = ?', 'standard', '12', 1),
(1, 2, true, 'How many sides does a square have?', 'standard', '4', 1),
(1, 2, true, 'How many sides does a triangle have?', 'standard', '3', 1),
(1, 2, true, 'What number comes after 19?', 'standard', '20', 1),
(1, 2, true, 'Count by 2s: 2, 4, 6, 8, __ ?', 'standard', '10', 1);

INSERT INTO public.sq_number_realm (term_id, grade_level, is_active, problem_prompt, expected_layout, correct_standard_ans, difficulty_tier) VALUES
-- Tier 2: Multi-digit arithmetic, word problems, multiplication intro
(1, 2, true, '34 + 25 = ?', 'standard', '59', 2),
(1, 2, true, '50 - 23 = ?', 'standard', '27', 2),
(1, 2, true, '45 + 36 = ?', 'standard', '81', 2),
(1, 2, true, '2 × 5 = ?', 'standard', '10', 2),
(1, 2, true, '5 × 3 = ?', 'standard', '15', 2),
(1, 2, true, '10 × 4 = ?', 'standard', '40', 2),
(1, 2, true, 'Ana has 25 mangoes and picks 13 more. How many mangoes does she have now?', 'standard', '38', 2),
(1, 2, true, 'Lito has ₱40. He spends ₱15. How much does he have left?', 'standard', '25', 2),
(1, 2, true, 'What is the value of the digit 5 in the number 53?', 'standard', '50', 2),
(1, 2, true, '100 + 200 = ?', 'standard', '300', 2),
(1, 2, true, '400 - 150 = ?', 'standard', '250', 2),
(1, 2, true, 'A bag has 6 rows of 5 candies each. How many candies in total?', 'standard', '30', 2),
(1, 2, true, 'What is double 15?', 'standard', '30', 2),
(1, 2, true, 'Round 47 to the nearest ten.', 'standard', '50', 2),
(1, 2, true, 'Anna has 3 boxes with 8 crayons each. How many crayons in total?', 'standard', '24', 2),
(1, 2, true, 'There are 60 pupils in two classes. One class has 32 pupils. How many in the other class?', 'standard', '28', 2),
(1, 2, true, 'Count by 5s: 5, 10, 15, 20, __ ?', 'standard', '25', 2),
(1, 2, true, 'What is the place value of 8 in the number 381?', 'standard', '80', 2),
(1, 2, true, 'Maria buys 3 pencils at ₱4 each. How much does she pay?', 'standard', '12', 2),
(1, 2, true, 'A rectangle is 5 cm long and 3 cm wide. What is its perimeter?', 'standard', '16', 2);

INSERT INTO public.sq_number_realm (term_id, grade_level, is_active, problem_prompt, expected_layout, correct_standard_ans, difficulty_tier) VALUES
-- Tier 3: Harder word problems, 3-digit arithmetic, intro to patterns
(1, 2, true, 'Juan has 350 stamps. He gives 178 to his friend. How many does he have left?', 'standard', '172', 3),
(1, 2, true, 'A rectangle is 8 cm long and 3 cm wide. What is its perimeter?', 'standard', '22', 3),
(1, 2, true, '5 × 8 = ?', 'standard', '40', 3),
(1, 2, true, '3 × 9 = ?', 'standard', '27', 3),
(1, 2, true, 'Ana sleeps at 9:00 PM and wakes at 6:00 AM. How many hours did she sleep?', 'standard', '9', 3),
(1, 2, true, 'What is the missing number? 3, 6, 9, __, 15', 'standard', '12', 3),
(1, 2, true, 'Pedro has 5 bags with 9 marbles each. How many marbles are there in all?', 'standard', '45', 3),
(1, 2, true, 'If today is Wednesday, what day will it be 4 days from now?', 'standard', 'Sunday', 3),
(1, 2, true, 'A farmer has 200 chickens. He sells 75. How many are left?', 'standard', '125', 3),
(1, 2, true, 'What is the sum of the first five odd numbers: 1 + 3 + 5 + 7 + 9 = ?', 'standard', '25', 3);

INSERT INTO public.sq_number_realm (term_id, grade_level, is_active, problem_prompt, expected_layout, correct_standard_ans, difficulty_tier) VALUES
-- Time problems (standard layout)
(1, 2, true, 'What time is shown when the hour hand is on 3 and minute hand is on 12?', 'time', '3:00', 1),
(1, 2, true, 'What time is half past 6?', 'time', '6:30', 1),
(1, 2, true, 'What time is 2 hours after 4:00?', 'time', '6:00', 2),
(1, 2, true, 'A movie starts at 3:00 and lasts 1 hour. When does it end?', 'time', '4:00', 2),
(1, 2, true, 'School starts at 7:00. Ben arrives 30 minutes early. What time does he arrive?', 'time', '6:30', 2),
(1, 2, true, 'What time is quarter past 9?', 'time', '9:15', 2),
(1, 2, true, 'What time is quarter to 10?', 'time', '9:45', 3),
(1, 2, true, 'Pedro starts reading at 2:30 and reads for 1 hour. When does he finish?', 'time', '3:30', 2),
(1, 2, true, 'What time is 1 hour before noon?', 'time', '11:00', 2),
(1, 2, true, 'It is 10:15 now. The bus comes in 45 minutes. What time does the bus come?', 'time', '11:00', 3);

INSERT INTO public.sq_number_realm (term_id, grade_level, is_active, problem_prompt, expected_layout, correct_numerator, correct_denominator, difficulty_tier) VALUES
-- Fraction problems
(1, 2, true, 'What fraction represents one out of two equal parts?', 'fraction', 1, 2, 1),
(1, 2, true, 'A pie is cut into 4 equal slices. You ate 1 slice. What fraction did you eat?', 'fraction', 1, 4, 1),
(1, 2, true, 'A ribbon is cut into 3 equal parts. 2 parts remain. What fraction remains?', 'fraction', 2, 3, 1),
(1, 2, true, '1/4 + 1/4 = ?', 'fraction', 1, 2, 2),
(1, 2, true, 'A bar is divided into 4 equal parts. 3 parts are colored. What fraction is colored?', 'fraction', 3, 4, 2),
(1, 2, true, '3/4 − 1/4 = ?', 'fraction', 1, 2, 2),
(1, 2, true, 'What fraction of a day is 12 hours?', 'fraction', 1, 2, 2),
(1, 2, true, '2/3 of a garden is planted with flowers. What fraction has no flowers?', 'fraction', 1, 3, 2),
(1, 2, true, 'One whole pie is cut into 4 equal slices. Two slices are eaten. What fraction is left?', 'fraction', 1, 2, 2),
(1, 2, true, '1/3 + 1/3 = ?', 'fraction', 2, 3, 1);

-- ============================================================================
-- SQ_NUMBER_REALM — Grade 5 (50 problems)
-- Topics: fractions, decimals, percent, ratio, area/perimeter, volume, statistics
-- ============================================================================
INSERT INTO public.sq_number_realm (term_id, grade_level, is_active, problem_prompt, expected_layout, correct_standard_ans, difficulty_tier) VALUES
-- Tier 1: Decimal and percent basics
(1, 5, true, '0.5 + 0.3 = ?', 'standard', '0.8', 1),
(1, 5, true, '1.25 + 2.75 = ?', 'standard', '4', 1),
(1, 5, true, '5.0 − 2.3 = ?', 'standard', '2.7', 1),
(1, 5, true, 'What is 10% of 200?', 'standard', '20', 1),
(1, 5, true, 'Express 3/5 as a decimal.', 'standard', '0.6', 1),
(1, 5, true, 'What is the LCM of 4 and 6?', 'standard', '12', 1),
(1, 5, true, 'What is the GCF of 12 and 18?', 'standard', '6', 1),
(1, 5, true, '4/5 ÷ 2/5 = ?', 'standard', '2', 1),
(1, 5, true, '1/2 ÷ 1/4 = ?', 'standard', '2', 1),
(1, 5, true, 'What is 25% of 80?', 'standard', '20', 1);

INSERT INTO public.sq_number_realm (term_id, grade_level, is_active, problem_prompt, expected_layout, correct_standard_ans, difficulty_tier) VALUES
-- Tier 2: Geometry, word problems, ratios
(1, 5, true, 'What is the area of a rectangle 6 cm long and 4 cm wide?', 'standard', '24', 2),
(1, 5, true, 'What is the perimeter of a square with side 7 m?', 'standard', '28', 2),
(1, 5, true, 'The ratio of boys to girls is 3:2 and there are 12 boys. How many girls are there?', 'standard', '8', 2),
(1, 5, true, 'What is the average of 8, 12, 16, and 20?', 'standard', '14', 2),
(1, 5, true, 'If 40% of students are boys in a class of 50, how many boys are there?', 'standard', '20', 2),
(1, 5, true, '3 × 2.5 = ?', 'standard', '7.5', 2),
(1, 5, true, 'Pedro''s score was 42 out of 50. What is his percentage score?', 'standard', '84', 2),
(1, 5, true, 'A recipe needs 2/3 cup of sugar. If you triple the recipe, how many cups of sugar do you need?', 'standard', '2', 2),
(1, 5, true, 'What is 15% of 360?', 'standard', '54', 2),
(1, 5, true, 'Express 0.75 as a percentage.', 'standard', '75', 2),
(1, 5, true, 'A store sells items for ₱120. If there is a 15% discount, what is the sale price?', 'standard', '102', 2),
(1, 5, true, 'What is the area of a triangle with base 10 cm and height 6 cm?', 'standard', '30', 2),
(1, 5, true, 'In a class of 40, 60% passed the test. How many students passed?', 'standard', '24', 2),
(1, 5, true, 'What is 3.6 × 10?', 'standard', '36', 2),
(1, 5, true, 'A runner completes a 5 km race in 25 minutes. What is her speed in km per minute?', 'standard', '0.2', 2),
(1, 5, true, 'What is the median of 3, 7, 9, 11, 15?', 'standard', '9', 2);

INSERT INTO public.sq_number_realm (term_id, grade_level, is_active, problem_prompt, expected_layout, correct_standard_ans, difficulty_tier) VALUES
-- Tier 3: Volume, harder algebra, complex word problems
(1, 5, true, 'What is the volume of a rectangular box 5 cm × 4 cm × 3 cm?', 'standard', '60', 3),
(1, 5, true, 'What is the volume of a cube with side 6 cm?', 'standard', '216', 3),
(1, 5, true, 'A tank is 8 m long, 5 m wide, and 3 m high. What is its volume?', 'standard', '120', 3),
(1, 5, true, 'The mean of 5 numbers is 12. Four of the numbers are 8, 10, 14, and 16. What is the fifth number?', 'standard', '12', 3),
(1, 5, true, 'A shirt originally costs ₱500. It is on sale for 20% off, then an additional 10% off the sale price. What is the final price?', 'standard', '360', 3),
(1, 5, true, 'If n + 7 = 19, what is n?', 'standard', '12', 3),
(1, 5, true, 'The area of a square is 81 cm². What is the length of one side?', 'standard', '9', 3),
(1, 5, true, 'Ana can read 25 pages per hour. How many pages can she read in 2 hours and 30 minutes?', 'standard', '62.5', 3);

INSERT INTO public.sq_number_realm (term_id, grade_level, is_active, problem_prompt, expected_layout, correct_numerator, correct_denominator, difficulty_tier) VALUES
-- Fraction problems for G5
(1, 5, true, '1/2 + 1/4 = ?', 'fraction', 3, 4, 1),
(1, 5, true, '2/5 + 1/5 = ?', 'fraction', 3, 5, 1),
(1, 5, true, '3/4 − 1/4 = ?', 'fraction', 1, 2, 1),
(1, 5, true, '5/6 − 2/6 = ?', 'fraction', 1, 2, 1),
(1, 5, true, '3/4 + 1/8 = ?', 'fraction', 7, 8, 2),
(1, 5, true, '2/3 + 1/6 = ?', 'fraction', 5, 6, 2),
(1, 5, true, '1/2 × 3/4 = ?', 'fraction', 3, 8, 2),
(1, 5, true, '2/3 × 3/5 = ?', 'fraction', 2, 5, 2),
(1, 5, true, '5/6 − 2/3 = ?', 'fraction', 1, 6, 2),
(1, 5, true, '4/5 − 1/2 = ?', 'fraction', 3, 10, 3),
(1, 5, true, '1/3 + 1/4 = ?', 'fraction', 7, 12, 3),
(1, 5, true, '3/8 + 1/4 = ?', 'fraction', 5, 8, 2),
(1, 5, true, '7/8 − 3/4 = ?', 'fraction', 1, 8, 2),
(1, 5, true, '3/5 × 5/9 = ?', 'fraction', 1, 3, 3),
(1, 5, true, 'What fraction of 1 hour is 45 minutes?', 'fraction', 3, 4, 1),
(1, 5, true, 'A container is 5/8 full of water. After using 1/4 of the container, what fraction is left?', 'fraction', 3, 8, 3);

-- ============================================================================
-- SQ_LOGIC_LABYRINTH — Grade 2 (50 puzzles)
-- Types: number sequences, letter sequences, odd one out, analogies, patterns
-- ============================================================================
INSERT INTO public.sq_logic_labyrinth (term_id, grade_level, is_active, puzzle_prompt_text, options_array, correct_option_id, difficulty_tier) VALUES
-- Tier 1: Simple sequences and odd-one-out
(1, 2, true, 'What comes next? 1, 2, 3, 4, __', '[{"id":"a","label":"6"},{"id":"b","label":"5"},{"id":"c","label":"7"},{"id":"d","label":"4"}]', 'b', 1),
(1, 2, true, 'What comes next? 2, 4, 6, 8, __', '[{"id":"a","label":"9"},{"id":"b","label":"11"},{"id":"c","label":"10"},{"id":"d","label":"12"}]', 'c', 1),
(1, 2, true, 'Which one does NOT belong? Apple, Mango, Banana, Carrot', '[{"id":"a","label":"Apple"},{"id":"b","label":"Mango"},{"id":"c","label":"Banana"},{"id":"d","label":"Carrot"}]', 'd', 1),
(1, 2, true, 'Which one does NOT belong? Dog, Cat, Eagle, Rabbit', '[{"id":"a","label":"Dog"},{"id":"b","label":"Cat"},{"id":"c","label":"Eagle"},{"id":"d","label":"Rabbit"}]', 'c', 1),
(1, 2, true, 'What comes next? A, B, C, D, __', '[{"id":"a","label":"F"},{"id":"b","label":"E"},{"id":"c","label":"G"},{"id":"d","label":"D"}]', 'b', 1),
(1, 2, true, 'What comes next? 5, 10, 15, 20, __', '[{"id":"a","label":"22"},{"id":"b","label":"24"},{"id":"c","label":"25"},{"id":"d","label":"30"}]', 'c', 1),
(1, 2, true, 'Which shape comes next? Circle, Square, Circle, Square, __', '[{"id":"a","label":"Triangle"},{"id":"b","label":"Square"},{"id":"c","label":"Circle"},{"id":"d","label":"Diamond"}]', 'c', 1),
(1, 2, true, 'Which one does NOT belong? Red, Blue, Happy, Green', '[{"id":"a","label":"Red"},{"id":"b","label":"Blue"},{"id":"c","label":"Happy"},{"id":"d","label":"Green"}]', 'c', 1),
(1, 2, true, 'What comes next? 10, 9, 8, 7, __', '[{"id":"a","label":"5"},{"id":"b","label":"7"},{"id":"c","label":"6"},{"id":"d","label":"4"}]', 'c', 1),
(1, 2, true, 'Which one does NOT belong? Shirt, Pants, Shoes, Potato', '[{"id":"a","label":"Shirt"},{"id":"b","label":"Pants"},{"id":"c","label":"Shoes"},{"id":"d","label":"Potato"}]', 'd', 1),
(1, 2, true, 'What comes next? Mon, Tue, Wed, Thu, __', '[{"id":"a","label":"Sun"},{"id":"b","label":"Sat"},{"id":"c","label":"Mon"},{"id":"d","label":"Fri"}]', 'd', 1),
(1, 2, true, 'Which one does NOT belong? January, February, Sunday, March', '[{"id":"a","label":"January"},{"id":"b","label":"February"},{"id":"c","label":"Sunday"},{"id":"d","label":"March"}]', 'c', 1),
(1, 2, true, 'What comes next? 3, 6, 9, 12, __', '[{"id":"a","label":"14"},{"id":"b","label":"15"},{"id":"c","label":"16"},{"id":"d","label":"18"}]', 'b', 1),
(1, 2, true, 'Which one does NOT belong? Narra, Mango, Eagle, Bamboo', '[{"id":"a","label":"Narra"},{"id":"b","label":"Mango"},{"id":"c","label":"Eagle"},{"id":"d","label":"Bamboo"}]', 'c', 1),
(1, 2, true, 'What comes next? Z, Y, X, W, __', '[{"id":"a","label":"U"},{"id":"b","label":"V"},{"id":"c","label":"T"},{"id":"d","label":"W"}]', 'b', 1),
-- Tier 2: Analogies and harder patterns
(1, 2, true, 'Cat is to Kitten as Dog is to ___?', '[{"id":"a","label":"Puppy"},{"id":"b","label":"Cub"},{"id":"c","label":"Chick"},{"id":"d","label":"Lamb"}]', 'a', 2),
(1, 2, true, 'Hand is to Glove as Foot is to ___?', '[{"id":"a","label":"Hat"},{"id":"b","label":"Shirt"},{"id":"c","label":"Shoe"},{"id":"d","label":"Belt"}]', 'c', 2),
(1, 2, true, 'Hot is to Cold as Day is to ___?', '[{"id":"a","label":"Warm"},{"id":"b","label":"Night"},{"id":"c","label":"Bright"},{"id":"d","label":"Sun"}]', 'b', 2),
(1, 2, true, 'What comes next? 1, 4, 9, 16, __', '[{"id":"a","label":"20"},{"id":"b","label":"25"},{"id":"c","label":"18"},{"id":"d","label":"24"}]', 'b', 2),
(1, 2, true, 'Doctor is to Hospital as Teacher is to ___?', '[{"id":"a","label":"Market"},{"id":"b","label":"Library"},{"id":"c","label":"Church"},{"id":"d","label":"School"}]', 'd', 2),
(1, 2, true, 'Bird is to Nest as Fish is to ___?', '[{"id":"a","label":"River"},{"id":"b","label":"Sky"},{"id":"c","label":"Land"},{"id":"d","label":"Cave"}]', 'a', 2),
(1, 2, true, 'What comes next in the pattern? △ □ △ □ △ __', '[{"id":"a","label":"△"},{"id":"b","label":"○"},{"id":"c","label":"□"},{"id":"d","label":"◇"}]', 'c', 2),
(1, 2, true, 'Eye is to See as Ear is to ___?', '[{"id":"a","label":"Touch"},{"id":"b","label":"Smell"},{"id":"c","label":"Taste"},{"id":"d","label":"Hear"}]', 'd', 2),
(1, 2, true, 'What comes next? 2, 5, 8, 11, __', '[{"id":"a","label":"12"},{"id":"b","label":"14"},{"id":"c","label":"13"},{"id":"d","label":"15"}]', 'b', 2),
(1, 2, true, 'Pen is to Write as Scissors is to ___?', '[{"id":"a","label":"Draw"},{"id":"b","label":"Cut"},{"id":"c","label":"Glue"},{"id":"d","label":"Paint"}]', 'b', 2),
(1, 2, true, 'Book is to Read as Song is to ___?', '[{"id":"a","label":"Write"},{"id":"b","label":"Draw"},{"id":"c","label":"Listen"},{"id":"d","label":"Sing"}]', 'd', 2),
(1, 2, true, 'What comes next? AA, BB, CC, DD, __', '[{"id":"a","label":"EF"},{"id":"b","label":"EE"},{"id":"c","label":"FF"},{"id":"d","label":"DE"}]', 'b', 2),
(1, 2, true, 'Seed is to Plant as Egg is to ___?', '[{"id":"a","label":"Feather"},{"id":"b","label":"Bird"},{"id":"c","label":"Nest"},{"id":"d","label":"Wing"}]', 'b', 2),
(1, 2, true, 'Which comes next? 1, 3, 6, 10, __', '[{"id":"a","label":"14"},{"id":"b","label":"15"},{"id":"c","label":"13"},{"id":"d","label":"16"}]', 'b', 2),
(1, 2, true, 'Rain is to Umbrella as Sun is to ___?', '[{"id":"a","label":"Boot"},{"id":"b","label":"Coat"},{"id":"c","label":"Sunglasses"},{"id":"d","label":"Scarf"}]', 'c', 2),
-- Tier 3: More complex reasoning
(1, 2, true, 'All cats are animals. Some animals are dogs. Which is definitely true?', '[{"id":"a","label":"All cats are dogs"},{"id":"b","label":"All dogs are cats"},{"id":"c","label":"All cats are animals"},{"id":"d","label":"No animals are cats"}]', 'c', 3),
(1, 2, true, 'What is the missing number? 2, __, 8, 14, 22', '[{"id":"a","label":"4"},{"id":"b","label":"5"},{"id":"c","label":"6"},{"id":"d","label":"3"}]', 'b', 3),
(1, 2, true, 'Maria is taller than Ana. Ana is taller than Lita. Who is the shortest?', '[{"id":"a","label":"Maria"},{"id":"b","label":"Ana"},{"id":"c","label":"Lita"},{"id":"d","label":"They are the same height"}]', 'c', 3),
(1, 2, true, 'What is the missing letter? A, C, E, G, __', '[{"id":"a","label":"H"},{"id":"b","label":"I"},{"id":"c","label":"J"},{"id":"d","label":"K"}]', 'b', 3),
(1, 2, true, 'A store has 3 shelves. Each shelf has 4 rows. Each row has 5 items. How many items are in the store in total?', '[{"id":"a","label":"20"},{"id":"b","label":"45"},{"id":"c","label":"60"},{"id":"d","label":"12"}]', 'c', 3),
(1, 2, true, 'What comes next? 1, 2, 4, 8, __', '[{"id":"a","label":"10"},{"id":"b","label":"12"},{"id":"c","label":"14"},{"id":"d","label":"16"}]', 'd', 3),
(1, 2, true, 'Five friends stand in a line. Ben is third. Ana is just before Ben. Where is Ana?', '[{"id":"a","label":"First"},{"id":"b","label":"Second"},{"id":"c","label":"Fourth"},{"id":"d","label":"Fifth"}]', 'b', 3),
(1, 2, true, 'A number is multiplied by itself to give 36. What is the number?', '[{"id":"a","label":"4"},{"id":"b","label":"7"},{"id":"c","label":"6"},{"id":"d","label":"9"}]', 'c', 3),
(1, 2, true, 'Noel is older than Cris. Cris is younger than Dina. Dina is younger than Noel. Who is the youngest?', '[{"id":"a","label":"Noel"},{"id":"b","label":"Cris"},{"id":"c","label":"Dina"},{"id":"d","label":"Cannot be determined"}]', 'b', 3),
(1, 2, true, 'What comes next? 1, 1, 2, 3, 5, 8, __', '[{"id":"a","label":"10"},{"id":"b","label":"11"},{"id":"c","label":"12"},{"id":"d","label":"13"}]', 'd', 3),
(1, 2, true, 'If RED = 3 letters, BLUE = 4 letters, YELLOW = 6 letters, how many letters does ORANGE have?', '[{"id":"a","label":"4"},{"id":"b","label":"5"},{"id":"c","label":"6"},{"id":"d","label":"7"}]', 'c', 3);

-- ============================================================================
-- SQ_LOGIC_LABYRINTH — Grade 5 (50 puzzles)
-- Types: complex sequences, analogies, logical deduction, number theory
-- ============================================================================
INSERT INTO public.sq_logic_labyrinth (term_id, grade_level, is_active, puzzle_prompt_text, options_array, correct_option_id, difficulty_tier) VALUES
-- Tier 1: Moderate sequences and analogies
(1, 5, true, 'What comes next? 2, 6, 18, 54, __', '[{"id":"a","label":"108"},{"id":"b","label":"162"},{"id":"c","label":"200"},{"id":"d","label":"270"}]', 'b', 1),
(1, 5, true, 'What comes next? 1, 4, 9, 16, 25, __', '[{"id":"a","label":"30"},{"id":"b","label":"32"},{"id":"c","label":"36"},{"id":"d","label":"35"}]', 'c', 1),
(1, 5, true, 'Which one does NOT belong? Photosynthesis, Respiration, Digestion, Multiplication', '[{"id":"a","label":"Photosynthesis"},{"id":"b","label":"Respiration"},{"id":"c","label":"Digestion"},{"id":"d","label":"Multiplication"}]', 'd', 1),
(1, 5, true, 'Kilometer is to Distance as Kilogram is to ___?', '[{"id":"a","label":"Speed"},{"id":"b","label":"Volume"},{"id":"c","label":"Mass"},{"id":"d","label":"Temperature"}]', 'c', 1),
(1, 5, true, 'What comes next? 100, 95, 90, 85, __', '[{"id":"a","label":"78"},{"id":"b","label":"80"},{"id":"c","label":"82"},{"id":"d","label":"84"}]', 'b', 1),
(1, 5, true, 'Author is to Novel as Composer is to ___?', '[{"id":"a","label":"Painting"},{"id":"b","label":"Symphony"},{"id":"c","label":"Sculpture"},{"id":"d","label":"Poem"}]', 'b', 1),
(1, 5, true, 'Which one does NOT belong? Mercury, Venus, Moon, Mars', '[{"id":"a","label":"Mercury"},{"id":"b","label":"Venus"},{"id":"c","label":"Moon"},{"id":"d","label":"Mars"}]', 'c', 1),
(1, 5, true, 'What comes next? 1, 3, 7, 15, 31, __', '[{"id":"a","label":"47"},{"id":"b","label":"53"},{"id":"c","label":"63"},{"id":"d","label":"61"}]', 'c', 1),
(1, 5, true, 'Herbivore is to Plants as Carnivore is to ___?', '[{"id":"a","label":"Sunlight"},{"id":"b","label":"Soil"},{"id":"c","label":"Meat"},{"id":"d","label":"Water"}]', 'c', 1),
(1, 5, true, 'Which one does NOT belong? Democracy, Monarchy, Revolution, Oligarchy', '[{"id":"a","label":"Democracy"},{"id":"b","label":"Monarchy"},{"id":"c","label":"Revolution"},{"id":"d","label":"Oligarchy"}]', 'c', 1),
(1, 5, true, 'Cause is to Effect as Question is to ___?', '[{"id":"a","label":"Doubt"},{"id":"b","label":"Answer"},{"id":"c","label":"Problem"},{"id":"d","label":"Question"}]', 'b', 1),
(1, 5, true, 'What comes next? 2, 3, 5, 7, 11, 13, __', '[{"id":"a","label":"14"},{"id":"b","label":"15"},{"id":"c","label":"17"},{"id":"d","label":"16"}]', 'c', 1),
(1, 5, true, 'What is the missing number? 3, 9, __, 81, 243', '[{"id":"a","label":"18"},{"id":"b","label":"27"},{"id":"c","label":"36"},{"id":"d","label":"54"}]', 'b', 1),
(1, 5, true, 'Mitosis is to Cells as Photosynthesis is to ___?', '[{"id":"a","label":"Animals"},{"id":"b","label":"Fungi"},{"id":"c","label":"Plants"},{"id":"d","label":"Bacteria"}]', 'c', 1),
(1, 5, true, 'Which one does NOT belong? Simile, Metaphor, Alliteration, Synonym', '[{"id":"a","label":"Simile"},{"id":"b","label":"Metaphor"},{"id":"c","label":"Alliteration"},{"id":"d","label":"Synonym"}]', 'd', 1),
-- Tier 2: Logical deduction, harder patterns
(1, 5, true, 'All mammals are warm-blooded. A whale is a mammal. What must be true?', '[{"id":"a","label":"All warm-blooded animals are whales"},{"id":"b","label":"Whales are cold-blooded"},{"id":"c","label":"Whales are warm-blooded"},{"id":"d","label":"Whales are not animals"}]', 'c', 2),
(1, 5, true, 'If A > B and B > C, which is definitely true?', '[{"id":"a","label":"C > A"},{"id":"b","label":"A = C"},{"id":"c","label":"B > A"},{"id":"d","label":"A > C"}]', 'd', 2),
(1, 5, true, 'What is the missing number? 1, 8, 27, 64, __', '[{"id":"a","label":"100"},{"id":"b","label":"112"},{"id":"c","label":"125"},{"id":"d","label":"144"}]', 'c', 2),
(1, 5, true, 'In a class, everyone who passed Science also passed Math. Pedro failed Math. What can you conclude?', '[{"id":"a","label":"Pedro passed Science"},{"id":"b","label":"Pedro failed Science"},{"id":"c","label":"Pedro is bad at school"},{"id":"d","label":"Cannot be determined"}]', 'b', 2),
(1, 5, true, 'What comes next? 1, 2, 6, 24, 120, __', '[{"id":"a","label":"240"},{"id":"b","label":"600"},{"id":"c","label":"720"},{"id":"d","label":"360"}]', 'c', 2),
(1, 5, true, 'Novel is to Chapter as Song is to ___?', '[{"id":"a","label":"Verse"},{"id":"b","label":"Rhyme"},{"id":"c","label":"Melody"},{"id":"d","label":"Beat"}]', 'a', 2),
(1, 5, true, 'What is the missing number in this sequence? 5, 11, 23, 47, __', '[{"id":"a","label":"71"},{"id":"b","label":"95"},{"id":"c","label":"93"},{"id":"d","label":"91"}]', 'b', 2),
(1, 5, true, 'Three students — Ana, Ben, Cris — each have a different subject. Ana does not have Math. Ben does not have Science. Cris has Filipino. Which subject does Ana have?', '[{"id":"a","label":"Math"},{"id":"b","label":"Science"},{"id":"c","label":"Filipino"},{"id":"d","label":"Cannot be determined"}]', 'b', 2),
(1, 5, true, 'What letter comes next? B, D, G, K, __', '[{"id":"a","label":"N"},{"id":"b","label":"O"},{"id":"c","label":"P"},{"id":"d","label":"Q"}]', 'c', 2),
(1, 5, true, 'Which one does NOT belong? Solid, Liquid, Gas, Energy', '[{"id":"a","label":"Solid"},{"id":"b","label":"Liquid"},{"id":"c","label":"Gas"},{"id":"d","label":"Energy"}]', 'd', 2),
(1, 5, true, 'If P is the father of Q, and Q is the brother of R, what is P to R?', '[{"id":"a","label":"Brother"},{"id":"b","label":"Uncle"},{"id":"c","label":"Grandfather"},{"id":"d","label":"Father"}]', 'd', 2),
(1, 5, true, 'What comes next? 0.1, 0.2, 0.4, 0.8, __', '[{"id":"a","label":"1.4"},{"id":"b","label":"1.2"},{"id":"c","label":"1.6"},{"id":"d","label":"1.0"}]', 'c', 2),
(1, 5, true, 'Iron is to Metal as Rose is to ___?', '[{"id":"a","label":"Flower"},{"id":"b","label":"Thorn"},{"id":"c","label":"Petal"},{"id":"d","label":"Garden"}]', 'a', 2),
(1, 5, true, 'Some scientists are women. Maria is a scientist. What can you conclude?', '[{"id":"a","label":"Maria is definitely a woman"},{"id":"b","label":"Maria is definitely not a woman"},{"id":"c","label":"Whether Maria is a woman cannot be determined"},{"id":"d","label":"All scientists are women"}]', 'c', 2),
(1, 5, true, 'What is the missing term? 2, 5, 11, 23, 47, __', '[{"id":"a","label":"93"},{"id":"b","label":"95"},{"id":"c","label":"96"},{"id":"d","label":"94"}]', 'b', 2),
-- Tier 3: Complex multi-step reasoning
(1, 5, true, 'A number is both a multiple of 3 and a factor of 36. It is greater than 5 and less than 12. What is it?', '[{"id":"a","label":"6"},{"id":"b","label":"9"},{"id":"c","label":"8"},{"id":"d","label":"12"}]', 'b', 3),
(1, 5, true, 'In a group, all leaders are decisive. Some decisive people are bold. Ana is a leader. What must be true?', '[{"id":"a","label":"Ana is bold"},{"id":"b","label":"Ana is decisive"},{"id":"c","label":"No leaders are bold"},{"id":"d","label":"Ana is not decisive"}]', 'b', 3),
(1, 5, true, 'What comes next in the pattern? 1, 1, 2, 3, 5, 8, 13, __', '[{"id":"a","label":"18"},{"id":"b","label":"19"},{"id":"c","label":"20"},{"id":"d","label":"21"}]', 'd', 3),
(1, 5, true, 'Five friends finish a race. Ben is 2nd. Cris is behind Ana. Dina is just ahead of Ben. Ed is last. Where does Ana finish?', '[{"id":"a","label":"1st"},{"id":"b","label":"3rd"},{"id":"c","label":"4th"},{"id":"d","label":"5th"}]', 'b', 3),
(1, 5, true, 'If all P are Q, and no Q are R, what can we conclude about P and R?', '[{"id":"a","label":"Some P are R"},{"id":"b","label":"All P are R"},{"id":"c","label":"No P are R"},{"id":"d","label":"Cannot be determined"}]', 'c', 3),
(1, 5, true, 'A code assigns numbers to letters: A=1, B=2, C=3. What does the code "5-1-7-12-5" spell?', '[{"id":"a","label":"BEAGLE"},{"id":"b","label":"EAGLE eagle"},{"id":"c","label":"EAGLE"},{"id":"d","label":"FIGLE"}]', 'c', 3),
(1, 5, true, 'What is the smallest number divisible by 2, 3, and 5 that is greater than 50?', '[{"id":"a","label":"55"},{"id":"b","label":"60"},{"id":"c","label":"70"},{"id":"d","label":"30"}]', 'b', 3),
(1, 5, true, 'A pond doubles in coverage every week. At Week 10 it covers the whole pond. When was it half covered?', '[{"id":"a","label":"Week 5"},{"id":"b","label":"Week 8"},{"id":"c","label":"Week 9"},{"id":"d","label":"Week 7"}]', 'c', 3),
(1, 5, true, 'If MANGO = 13+1+14+7+15 = 50, what is RICE equal to using the same number-letter coding (A=1, B=2...)?', '[{"id":"a","label":"38"},{"id":"b","label":"40"},{"id":"c","label":"42"},{"id":"d","label":"36"}]', 'c', 3),
(1, 5, true, 'Three boxes contain: Box A has only apples; Box B has only oranges; Box C has both. All labels are wrong. You draw one fruit from Box C. It is an apple. What does Box C really contain?', '[{"id":"a","label":"Only apples"},{"id":"b","label":"Only oranges"},{"id":"c","label":"Both apples and oranges"},{"id":"d","label":"Neither fruit"}]', 'a', 3),
(1, 5, true, 'What is the next number? 2, 12, 36, 80, 150, __', '[{"id":"a","label":"200"},{"id":"b","label":"245"},{"id":"c","label":"252"},{"id":"d","label":"210"}]', 'c', 3),
(1, 5, true, 'Juan has more money than Rosa. Rosa has less money than Linda. Linda has less money than Juan. Who has the most money?', '[{"id":"a","label":"Rosa"},{"id":"b","label":"Linda"},{"id":"c","label":"Juan"},{"id":"d","label":"Cannot be determined"}]', 'c', 3);

-- ============================================================================
-- SQ_LEXICON_ARENA — Grade 2 (50 vocabulary items)
-- Format: definition → pick the correct spelling from 4 options
-- Language: English and Filipino
-- ============================================================================
INSERT INTO public.sq_lexicon_arena (term_id, grade_level, is_active, language, definition, correct_spelling, wrong_a, wrong_b, wrong_c, difficulty_tier) VALUES
-- English — Tier 1
(1, 2, true, 'English', 'A domestic animal that barks and is a common pet', 'dog', 'dag', 'doge', 'dg', 1),
(1, 2, true, 'English', 'The bright star that gives Earth heat and light', 'sun', 'son', 'sin', 'snu', 1),
(1, 2, true, 'English', 'A round, red or green fruit that grows on trees', 'apple', 'aple', 'appel', 'appl', 1),
(1, 2, true, 'English', 'The color of grass and leaves', 'green', 'grene', 'geren', 'grean', 1),
(1, 2, true, 'English', 'A small insect that makes honey', 'bee', 'be', 'bea', 'bie', 1),
(1, 2, true, 'English', 'Something you sleep on at night', 'bed', 'bad', 'bead', 'bid', 1),
(1, 2, true, 'English', 'The opposite of cold', 'hot', 'hott', 'hto', 'hoot', 1),
(1, 2, true, 'English', 'A vehicle with two wheels that you pedal', 'bike', 'byke', 'biek', 'bik', 1),
(1, 2, true, 'English', 'A flying animal with feathers and wings', 'bird', 'brid', 'berd', 'birdd', 1),
(1, 2, true, 'English', 'A book you read for fun or to learn', 'book', 'bok', 'bock', 'booke', 1),
-- English — Tier 2
(1, 2, true, 'English', 'A place where people buy and sell things', 'market', 'markite', 'markit', 'markket', 2),
(1, 2, true, 'English', 'A large body of saltwater that covers most of Earth', 'ocean', 'oceen', 'osean', 'oseen', 2),
(1, 2, true, 'English', 'A person who teaches students in school', 'teacher', 'techer', 'teecher', 'teachur', 2),
(1, 2, true, 'English', 'The season in the Philippines when it rains a lot', 'rainy', 'raney', 'raini', 'rainey', 2),
(1, 2, true, 'English', 'To move fast on your feet', 'running', 'runing', 'runming', 'ruunning', 2),
(1, 2, true, 'English', 'A living thing that makes its own food from sunlight', 'plant', 'plent', 'plantt', 'plat', 2),
(1, 2, true, 'English', 'Something that falls from a tree in autumn', 'leaf', 'leef', 'leep', 'laef', 2),
(1, 2, true, 'English', 'A person who protects people and fights crime', 'police', 'polise', 'poliece', 'polce', 2),
(1, 2, true, 'English', 'A colorful arch seen in the sky after rain', 'rainbow', 'rainboe', 'ranbow', 'raynbow', 2),
(1, 2, true, 'English', 'The female parent of a family', 'mother', 'moter', 'mothar', 'mothir', 2),
-- English — Tier 3
(1, 2, true, 'English', 'Very good; better than all others', 'excellent', 'excelent', 'exsellent', 'excellant', 3),
(1, 2, true, 'English', 'A large community with many buildings, roads, and people', 'village', 'vilage', 'villege', 'vilige', 3),
(1, 2, true, 'English', 'An organ in the chest that pumps blood', 'heart', 'hert', 'haert', 'heert', 3),
(1, 2, true, 'English', 'To go from one country to another to live there', 'migrate', 'migrite', 'migraet', 'migrrate', 3),
(1, 2, true, 'English', 'The long neck animal that eats leaves from tall trees', 'giraffe', 'giraff', 'giraf', 'jiraf', 3),
-- Filipino — Tier 1
(1, 2, true, 'Filipino', 'Ang tawag sa ibon na simbolo ng Pilipinas', 'agila', 'aguila', 'agilla', 'agyla', 1),
(1, 2, true, 'Filipino', 'Ang salitang ibig sabihin ay pagkain sa umaga', 'almusal', 'almosal', 'almuwal', 'almusal', 1),
(1, 2, true, 'Filipino', 'Ang tawag sa lugar kung saan natutulog tayo', 'bahay', 'buhay', 'bahai', 'bahey', 1),
(1, 2, true, 'Filipino', 'Ang salitang ibig sabihin ay magmahal ng marami', 'pagmamahal', 'pagmamahal', 'pagmamahall', 'pagmamaall', 1),
(1, 2, true, 'Filipino', 'Ang tawag sa asong-gubat na may matalas na ngipin', 'lobo', 'lob', 'lobon', 'loboo', 1),
-- Filipino — Tier 2
(1, 2, true, 'Filipino', 'Ang salitang ibig sabihin ay pagiging mapagpasalamat', 'pasasalamat', 'pasasalaamt', 'pasasalamt', 'pasasalmat', 2),
(1, 2, true, 'Filipino', 'Ang tawag sa panahong malamig at maulan', 'taglamig', 'tagalamig', 'taglaming', 'taglamming', 2),
(1, 2, true, 'Filipino', 'Ang tawag sa isang taong nagtatrabaho sa bukid', 'magsasaka', 'magssakaka', 'magsasaca', 'magsasalka', 2),
(1, 2, true, 'Filipino', 'Ang tawag sa pangunahing wika ng Pilipinas', 'Filipino', 'Pilipino', 'Filipinno', 'Filipnio', 2),
(1, 2, true, 'Filipino', 'Ang salitang ibig sabihin ay mabilis na lumakad', 'tumakbo', 'tumakboo', 'tumakbu', 'tomakbo', 2),
-- Filipino — Tier 3
(1, 2, true, 'Filipino', 'Ang salitang nangangahulugang pagtulong sa kapwa nang walang bayad', 'boluntaryo', 'buluntaryo', 'boluntarion', 'buluntario', 3),
(1, 2, true, 'Filipino', 'Ang tawag sa pagtutol o paglaban sa isang bagay', 'pagsalungat', 'pagsalongat', 'pagsalonggat', 'pagsallungat', 3),
(1, 2, true, 'Filipino', 'Ang salitang ibig sabihin ay pakikiisa sa pamilya o samahan', 'pagkakaisa', 'pagkakaysa', 'pagkakkaisa', 'pagkakaiza', 3),
(1, 2, true, 'Filipino', 'Ang pangkat ng mga hayop na may parehong katangian', 'species', 'spesyes', 'spicies', 'speshies', 3),
(1, 2, true, 'Filipino', 'Ang tawag sa pagkilala sa naging kasaysayan ng bansa', 'kasaysayan', 'kasaisan', 'kasesayan', 'casaysayan', 3);

-- ============================================================================
-- SQ_LEXICON_ARENA — Grade 5 (50 vocabulary items)
-- More advanced English and Filipino words
-- ============================================================================
INSERT INTO public.sq_lexicon_arena (term_id, grade_level, is_active, language, definition, correct_spelling, wrong_a, wrong_b, wrong_c, difficulty_tier) VALUES
-- English — Tier 1
(1, 5, true, 'English', 'The process by which green plants make food using sunlight', 'photosynthesis', 'photosintesis', 'phottosynthesis', 'photosynthisis', 1),
(1, 5, true, 'English', 'An exaggerated statement not meant to be taken literally', 'hyperbole', 'hyperboly', 'hyperbol', 'hyperboll', 1),
(1, 5, true, 'English', 'The repetition of the same consonant sound at the start of words', 'alliteration', 'aliteration', 'allitaration', 'allitteration', 1),
(1, 5, true, 'English', 'A word that describes a noun', 'adjective', 'adjectiv', 'ajective', 'adjecttive', 1),
(1, 5, true, 'English', 'The main message or lesson of a story', 'theme', 'theem', 'theam', 'them', 1),
(1, 5, true, 'English', 'A comparison using "like" or "as"', 'simile', 'similee', 'similey', 'symile', 1),
(1, 5, true, 'English', 'The feeling or atmosphere of a piece of writing', 'mood', 'mude', 'moed', 'muud', 1),
(1, 5, true, 'English', 'Words that sound like the sound they describe (e.g., buzz, hiss)', 'onomatopoeia', 'onomatopeia', 'onomatopoeya', 'onomotapoeia', 1),
(1, 5, true, 'English', 'A type of poem with 14 lines', 'sonnet', 'sonnett', 'sonit', 'sonet', 1),
(1, 5, true, 'English', 'The sequence of events in a story', 'plot', 'plote', 'plott', 'ploat', 1),
(1, 5, true, 'English', 'A statement that contradicts itself but reveals a truth', 'paradox', 'paradocks', 'paradoxe', 'paradok', 1),
(1, 5, true, 'English', 'The character who opposes the main character', 'antagonist', 'antogonist', 'antagonnist', 'antoganist', 1),
-- English — Tier 2
(1, 5, true, 'English', 'The freedom from foreign rule or control', 'independence', 'independance', 'independense', 'independince', 2),
(1, 5, true, 'English', 'Relating to society and its organization', 'sociological', 'sociaological', 'sosyological', 'sociologikal', 2),
(1, 5, true, 'English', 'A comparison made to explain a complex idea using a simpler one', 'analogy', 'anology', 'anallogy', 'analige', 2),
(1, 5, true, 'English', 'The art of using language effectively and persuasively', 'rhetoric', 'retoric', 'rhethoric', 'rethoric', 2),
(1, 5, true, 'English', 'Something that stands for or represents something else', 'symbol', 'symbal', 'simbol', 'symbole', 2),
(1, 5, true, 'English', 'The repetition of words or phrases for emphasis at the beginning of lines', 'anaphora', 'anafora', 'anaphra', 'anaphorra', 2),
(1, 5, true, 'English', 'An indirect reference to a person, place, or event', 'allusion', 'alussion', 'allusoin', 'alusion', 2),
(1, 5, true, 'English', 'Giving human characteristics to non-human things', 'personification', 'personafication', 'personifecation', 'personifacation', 2),
(1, 5, true, 'English', 'The narrator''s attitude toward the subject of a piece of writing', 'tone', 'toan', 'tonn', 'tonde', 2),
(1, 5, true, 'English', 'A story that can be read on both a literal and symbolic level', 'allegory', 'alegory', 'allegary', 'alleggory', 2),
-- English — Tier 3
(1, 5, true, 'English', 'The repetition of similar vowel sounds within words', 'assonance', 'assonence', 'asonance', 'assonanse', 3),
(1, 5, true, 'English', 'Language that is not meant to be taken literally', 'figurative', 'figuratif', 'figurattive', 'figuretive', 3),
(1, 5, true, 'English', 'A narrative technique where the narrator knows thoughts of all characters', 'omniscient', 'omnicient', 'omniescent', 'ommniscient', 3),
(1, 5, true, 'English', 'The presentation of two contrasting ideas side by side', 'juxtaposition', 'juxtaposision', 'juxstaposition', 'juxtapostion', 3),
(1, 5, true, 'English', 'A mild word or phrase used in place of a harsh or blunt one', 'euphemism', 'eufemism', 'euphamisim', 'euphemizm', 3),
-- Filipino — Tier 1
(1, 5, true, 'Filipino', 'Ang tayutay na nagbibigay ng katangiang pantao sa mga bagay', 'personipikasyon', 'personipikacion', 'perzonipikasyon', 'personipikasion', 1),
(1, 5, true, 'Filipino', 'Ang malikhaing pagsulat na nagpapahayag ng damdamin at imahinasyon', 'panitikan', 'panitikin', 'pannitikin', 'panittickan', 1),
(1, 5, true, 'Filipino', 'Ang tawag sa isang uri ng tula na may 14 na linya', 'soneto', 'sonneto', 'suneto', 'sonetto', 1),
(1, 5, true, 'Filipino', 'Ang pangunahing tauhan sa isang kwento', 'protagonista', 'prottagonista', 'protagunista', 'protagoniztta', 1),
(1, 5, true, 'Filipino', 'Ang salitang nangangahulugang pagiging makatotohanan', 'katotohanan', 'katotoanan', 'katotuohanan', 'katotohanaan', 1),
-- Filipino — Tier 2
(1, 5, true, 'Filipino', 'Ang tayutay na naghahambing ng dalawang bagay nang hindi gumagamit ng gaya o parang', 'metapor', 'metaphor', 'mitapor', 'metappor', 2),
(1, 5, true, 'Filipino', 'Ang uri ng panitikang nagsasalaysay ng tunay na pangyayari', 'sanaysay', 'sanaaysay', 'sanaysaay', 'sannaysay', 2),
(1, 5, true, 'Filipino', 'Ang salitang nangangahulugang karagdagang kahulugan ng isang salita', 'konotasyon', 'konotacion', 'konotassyon', 'konotassion', 2),
(1, 5, true, 'Filipino', 'Ang mahabang kwentong nagtatampok ng mga bayaning may kahiwagaang lakas', 'epiko', 'epico', 'epic', 'epikko', 2),
(1, 5, true, 'Filipino', 'Ang hindi direktang pahayag ng kahulugan sa pamamagitan ng pahiwatig', 'pahiwatig', 'pahiwattig', 'pahiwateg', 'pahywatig', 2),
-- Filipino — Tier 3
(1, 5, true, 'Filipino', 'Ang paglalagay ng mga salita o ideyang magkasalungat sa iisang pahayag', 'paradox', 'paradoks', 'pararoks', 'paradokss', 3),
(1, 5, true, 'Filipino', 'Ang salitang nangangahulugang ang kalikasan ng isang bagay o tao', 'kakanyahan', 'kakanyhan', 'kakaniahan', 'kakannahan', 3),
(1, 5, true, 'Filipino', 'Ang paggamit ng simbolo upang kumatawan sa isang mas malalim na kahulugan', 'simbolismo', 'cimbolismo', 'simbolizmo', 'simbolissmo', 3),
(1, 5, true, 'Filipino', 'Ang uri ng akdang pampanitikang nagtatampok ng dialogo at pinaglalayaang itanghal', 'dulaan', 'dullan', 'dulaaan', 'dullaan', 3),
(1, 5, true, 'Filipino', 'Ang talumpating may layuning hikayatin o kumbinsihin ang tagapakinig', 'retorika', 'rettorika', 'retorica', 'rhettorika', 3);

-- ============================================================================
-- TOP-UP: reach exactly 50 per guild per grade for all under-count guilds
-- ============================================================================

-- SQ_LOREKEEPER G2 â€” 5 additional (total becomes 50)
INSERT INTO public.sq_lorekeeper (term_id, grade_level, is_active, question, choice_a, choice_b, choice_c, choice_d, correct_choice, difficulty_tier) VALUES
(1, 2, true, 'What do we call an animal that eats both plants and meat?', 'Herbivore', 'Carnivore', 'Omnivore', 'Predator', 'c', 2),
(1, 2, true, 'Which planet is known as the Red Planet?', 'Venus', 'Jupiter', 'Mars', 'Saturn', 'c', 3),
(1, 2, true, 'What do we call the stage of a frog life just before it becomes a frog?', 'Larva', 'Pupa', 'Tadpole', 'Nymph', 'c', 2),
(1, 2, true, 'A sentence reads: The wind grabbed my hat and ran away with it. What literary device does this use?', 'A real event that happened', 'Personification â€” giving the wind human actions', 'A direct comparison using like or as', 'A math equation', 'b', 3),
(1, 2, true, 'What is the correct way to greet an elder in Filipino culture?', 'Shake hands firmly and say Hello', 'Ignore them and walk away', 'Touch their hand to your forehead and say Mano po', 'Wave from far away', 'c', 1);

-- SQ_LOREKEEPER G5 â€” 6 additional (total becomes 50)
INSERT INTO public.sq_lorekeeper (term_id, grade_level, is_active, question, choice_a, choice_b, choice_c, choice_d, correct_choice, difficulty_tier) VALUES
(1, 5, true, 'What is the function of the mitochondria in a cell?', 'It stores DNA', 'It controls what enters and leaves the cell', 'It produces energy through cellular respiration', 'It makes proteins', 'c', 2),
(1, 5, true, 'What is the key difference between speed and velocity?', 'They are exactly the same thing', 'Speed has direction; velocity does not', 'Velocity is how fast something moves without direction', 'Speed is how fast something moves; velocity includes both speed and direction', 'd', 3),
(1, 5, true, 'What was the Propaganda Movement in Philippine history?', 'A campaign to advertise Philippine products abroad', 'A movement by Filipino reformists in Europe advocating for reforms from Spain', 'An anti-American resistance movement after 1898', 'A literary movement led by Andres Bonifacio', 'b', 3),
(1, 5, true, 'What is the function of red blood cells?', 'To fight infection and disease', 'To carry oxygen throughout the body', 'To form blood clots after injury', 'To produce antibodies', 'b', 2),
(1, 5, true, 'What does context clues mean in reading comprehension?', 'Words that rhyme with the unknown word', 'Hints within the surrounding text that help identify an unfamiliar word meaning', 'A dictionary definition printed in the margin', 'The chapter title of the book being read', 'b', 2),
(1, 5, true, 'What is the Ring of Fire and why is it relevant to the Philippines?', 'A volcanic region in Africa; the Philippines is not part of it', 'A belt of volcanic and earthquake activity around the Pacific Ocean; the Philippines sits within it', 'A weather phenomenon that causes Philippine typhoons', 'A mythological region from ancient Philippine legend', 'b', 3);

-- SQ_LOGIC_LABYRINTH G2 â€” 9 additional (total becomes 50)
INSERT INTO public.sq_logic_labyrinth (term_id, grade_level, is_active, puzzle_prompt_text, options_array, correct_option_id, difficulty_tier) VALUES
(1, 2, true, 'Which comes next? 10, 20, 30, 40, __', '[{"id":"a","label":"45"},{"id":"b","label":"50"},{"id":"c","label":"60"},{"id":"d","label":"42"}]', 'b', 1),
(1, 2, true, 'Which one does NOT belong? Cow, Goat, Sheep, Chair', '[{"id":"a","label":"Cow"},{"id":"b","label":"Goat"},{"id":"c","label":"Sheep"},{"id":"d","label":"Chair"}]', 'd', 1),
(1, 2, true, 'Pencil is to Write as Paintbrush is to ___?', '[{"id":"a","label":"Read"},{"id":"b","label":"Sing"},{"id":"c","label":"Paint"},{"id":"d","label":"Run"}]', 'c', 2),
(1, 2, true, 'Morning is to Breakfast as Evening is to ___?', '[{"id":"a","label":"Lunch"},{"id":"b","label":"Snack"},{"id":"c","label":"Dinner"},{"id":"d","label":"Dessert"}]', 'c', 2),
(1, 2, true, 'What comes next? AB, CD, EF, GH, __', '[{"id":"a","label":"HI"},{"id":"b","label":"IJ"},{"id":"c","label":"JK"},{"id":"d","label":"KL"}]', 'b', 2),
(1, 2, true, 'There are 5 birds on a wire. 2 fly away, then 3 more land. How many birds are on the wire now?', '[{"id":"a","label":"4"},{"id":"b","label":"5"},{"id":"c","label":"6"},{"id":"d","label":"7"}]', 'c', 2),
(1, 2, true, 'Sun is to Day as Moon is to ___?', '[{"id":"a","label":"Star"},{"id":"b","label":"Light"},{"id":"c","label":"Night"},{"id":"d","label":"Sky"}]', 'c', 2),
(1, 2, true, 'All fruits have seeds. A mango is a fruit. What must be true?', '[{"id":"a","label":"All seeds are mangoes"},{"id":"b","label":"Mangoes have seeds"},{"id":"c","label":"Mangoes are not fruits"},{"id":"d","label":"Seeds are always sweet"}]', 'b', 3),
(1, 2, true, 'What number is missing? 2, 4, __, 16, 32', '[{"id":"a","label":"6"},{"id":"b","label":"8"},{"id":"c","label":"10"},{"id":"d","label":"12"}]', 'b', 3);

-- SQ_LOGIC_LABYRINTH G5 â€” 8 additional (total becomes 50)
INSERT INTO public.sq_logic_labyrinth (term_id, grade_level, is_active, puzzle_prompt_text, options_array, correct_option_id, difficulty_tier) VALUES
(1, 5, true, 'What comes next? 3, 7, 15, 31, 63, __', '[{"id":"a","label":"120"},{"id":"b","label":"126"},{"id":"c","label":"127"},{"id":"d","label":"128"}]', 'c', 1),
(1, 5, true, 'Cell is to Organism as Letter is to ___?', '[{"id":"a","label":"Alphabet"},{"id":"b","label":"Word"},{"id":"c","label":"Paper"},{"id":"d","label":"Pen"}]', 'b', 1),
(1, 5, true, 'What is the missing number? 7, 14, 28, __, 112', '[{"id":"a","label":"42"},{"id":"b","label":"54"},{"id":"c","label":"56"},{"id":"d","label":"60"}]', 'c', 2),
(1, 5, true, 'No fish are birds. All birds have wings. What can we conclude about fish and wings?', '[{"id":"a","label":"Some fish have wings"},{"id":"b","label":"Fish do not necessarily have wings"},{"id":"c","label":"All fish have wings"},{"id":"d","label":"Fish are a type of bird"}]', 'b', 2),
(1, 5, true, 'What is the next term? 1, 5, 14, 30, 55, __', '[{"id":"a","label":"80"},{"id":"b","label":"85"},{"id":"c","label":"91"},{"id":"d","label":"95"}]', 'c', 3),
(1, 5, true, 'In a group of 30 students, 18 like Math and 15 like Science. 8 like both. How many like neither?', '[{"id":"a","label":"3"},{"id":"b","label":"5"},{"id":"c","label":"7"},{"id":"d","label":"8"}]', 'b', 3),
(1, 5, true, 'Rosa is youngest of three sisters. Bea is older than Cora. Cora is older than Rosa. Who is oldest?', '[{"id":"a","label":"Rosa"},{"id":"b","label":"Cora"},{"id":"c","label":"Bea"},{"id":"d","label":"Cannot be determined"}]', 'c', 2),
(1, 5, true, 'What comes next? 1/2, 1/4, 1/8, 1/16, __', '[{"id":"a","label":"1/24"},{"id":"b","label":"1/32"},{"id":"c","label":"1/20"},{"id":"d","label":"1/18"}]', 'b', 2);

-- SQ_LEXICON_ARENA G2 â€” 10 additional (total becomes 50)
INSERT INTO public.sq_lexicon_arena (term_id, grade_level, is_active, language, definition, correct_spelling, wrong_a, wrong_b, wrong_c, difficulty_tier) VALUES
(1, 2, true, 'English', 'The meal eaten in the middle of the day', 'lunch', 'lonch', 'lunsh', 'lunnch', 1),
(1, 2, true, 'English', 'Not heavy; the opposite of heavy', 'light', 'lite', 'lyght', 'lightt', 1),
(1, 2, true, 'English', 'A person who flies an airplane', 'pilot', 'pilott', 'pilote', 'pillet', 2),
(1, 2, true, 'English', 'To look at words on a page and understand them', 'read', 'raed', 'redd', 'reead', 1),
(1, 2, true, 'English', 'A cold white thing that falls from the sky in cold weather', 'snow', 'snoe', 'snwo', 'snoww', 2),
(1, 2, true, 'English', 'The part of a tree that grows under the ground', 'root', 'ruut', 'rott', 'roote', 2),
(1, 2, true, 'Filipino', 'Ang tawag sa lugar kung saan nag-aaral ang mga bata', 'paaralan', 'paarlan', 'palaran', 'panaralan', 2),
(1, 2, true, 'Filipino', 'Ang salitang ibig sabihin ay pagkain sa gabi', 'hapunan', 'hapunnan', 'happunan', 'hapuunan', 2),
(1, 2, true, 'Filipino', 'Ang tawag sa mga kwentong may hayop na tauhan at nagbibigay ng aral', 'pabula', 'fabula', 'pabbula', 'papula', 3),
(1, 2, true, 'Filipino', 'Ang salitang nangangahulugang may sapat na pagkain at kalusugan', 'malusog', 'malasog', 'malusug', 'malussog', 2);

-- SQ_LEXICON_ARENA G5 â€” 8 additional (total becomes 50)
INSERT INTO public.sq_lexicon_arena (term_id, grade_level, is_active, language, definition, correct_spelling, wrong_a, wrong_b, wrong_c, difficulty_tier) VALUES
(1, 5, true, 'English', 'The process of a species gradually changing over many generations', 'evolution', 'evollution', 'evalution', 'evoluttion', 2),
(1, 5, true, 'English', 'The variety of life forms found in a particular habitat or on Earth', 'biodiversity', 'biodivercity', 'biodeversity', 'biodivarsity', 2),
(1, 5, true, 'English', 'The central character a reader is meant to root for in a story', 'protagonist', 'protagnist', 'protaganist', 'protagonsit', 2),
(1, 5, true, 'English', 'A judgment or decision reached after considering evidence', 'conclusion', 'conclussion', 'conclucion', 'conclution', 1),
(1, 5, true, 'Filipino', 'Ang salitang nangangahulugang pagbabago ng katangian o anyo ng isang bagay', 'pagbabago', 'pagbabbago', 'pagbabgao', 'pagbabggo', 1),
(1, 5, true, 'Filipino', 'Ang tawag sa uri ng salita na nagbibigay-uri sa pangngalan', 'pang-uri', 'pang-ure', 'panguri', 'pang-uuri', 2),
(1, 5, true, 'Filipino', 'Ang parirala na paulit-ulit sa simula ng bawat linya para sa diin at epekto', 'anaphora', 'anafora', 'anaporra', 'annapora', 3),
(1, 5, true, 'Filipino', 'Ang pagtutulungan ng mga tao para sa isang layunin o adhikain', 'pakikiisa', 'pakikiissa', 'pakikisa', 'pakikiysa', 3);
