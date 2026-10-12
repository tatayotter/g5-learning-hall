-- MAPEH in English. Rewrites the Grade 4-6 MAPEH lessons, main-quest questions and boss-fight
-- questions that were written in Filipino (or a Filipino/English mix) in plain, kid-friendly
-- English. Filipino names of games, dances, instruments and plays stay as they are.
--
-- Data only, in place: every row keeps its id, so progress, attempts, boss records and the
-- offline answer key (get_answer_key / get_answer_key_hashed read correct_answer live) all
-- still line up. Options are translated position by position, and correct_answer is not
-- taken from this file: it is re-pointed to the translated option at the same position as
-- the row's current correct_answer, so the right answer cannot drift.
--
-- Safety: before changing anything, every row this file touches that exists must have the
-- same number of options as its translation and a correct_answer that is one of its current
-- options; otherwise the whole migration stops with an error and nothing changes. Rows that
-- don't exist (an empty CI database, or a row deleted since) are skipped. Re-running is a
-- no-op: the second pass finds the English text already in place.
--
-- Devices pick up the change on their own: lessons and main quests through /api/content
-- (5-minute cache), boss questions through boss_bank_signature (20261012070000).

drop table if exists _mapeh_quiz, _mapeh_question, _mapeh_boss, _mapeh_draft_summary;
create temp table _mapeh_quiz (id uuid primary key, summary_markdown text not null);
create temp table _mapeh_question (id uuid primary key, prompt text not null, options jsonb not null);
create temp table _mapeh_boss (id uuid primary key, question text not null, options jsonb not null, topic text);
create temp table _mapeh_draft_summary (id uuid primary key, summary_markdown text not null);

insert into _mapeh_quiz values
('00ef74a0-5c99-4076-9b32-bed4194ee2ad', $tr$# 🎵 MAPEH — Music: Rhythm and Tempo

Welcome to Term 2, Grade 4! Let's learn about rhythm. 🎶

## 🥁 What Is Rhythm?
**Rhythm** is the **repeated sound** in music — like the **heartbeat of a song**.

**Two important parts:**
- **Beat** — the **steady pulse** of the music, like the ticking of a clock
- **Rhythmic pattern** — a mix of **long and short sounds** that makes up part of a song

## ⏱️ What Is Tempo?
**Tempo** is **how fast or slow** the music is.

| Tempo | Meaning |
|---|---|
| **Fast** | energetic songs, dances |
| **Moderate** | normal speed |
| **Slow** | peaceful, sad songs |

## 🙏 Music Linked to Beliefs
A lot of native music in the Philippines is **linked to the religion or beliefs** of the community.

**Examples:**
- **Pasyon** (the sung story of Jesus' Passion) — sung during Holy Week, slow, with a thoughtful rhythm
- **Harvest music** — a fast tempo to celebrate a big harvest
- **Prayer songs** — usually slow and calm

## 🧠 Example 1
*Which tempo fits a funeral song better?*
- **Slow** — to show sadness and respect. ✅

## 🧠 Example 2
*Which tempo fits a fiesta song better?*
- **Fast** — to show joy and celebration. ✅

## 🎵 Practice: Copying and Improvising Rhythm
1. **Listen** to a rhythmic pattern
2. **Repeat** it by clapping
3. **Try to create** your own new pattern (improvisation)

Great job! 🌟$tr$),
('0257ca8c-118f-4f86-b02e-61217e14472f', $tr$# 💃 MAPEH — Culminating Dance Performance

Grade 5, Week 25! Let's show the dance we learned in a small performance! 💃

## 🔄 Review
We learned about the **effects of gateway drugs**.

## 💃 Getting Ready to Perform
Using the **social dance mixer** in 2/4 time that we learned, practice in a small group to perform in front of the class.

## 📋 Steps
1. Choose how many members are in the group (4-6 people)
2. Repeat the steps you learned again and again
3. Practice your **timing** with the music
4. Perform with confidence and a smile

## 🌟 Goal of the Culminating Activity
This is a chance to show the **coordination**, **teamwork in a group**, and joy of moving to music that we talked about in the past weeks.

**Key words:** culminating activity, performance, teamwork, confidence$tr$),
('05a304a8-a684-4447-a2dc-acfbfdcc3e9b', $tr$# 🎵 Friday Review — MAPEH (Grade 4)

- **Tempo** = the speed of music; **Rhythm** = the pattern of sounds
- **Visual arts rhythm** = repeated shapes, colors, or lines
- **Healthy family** = respect, fair rules, open communication
- **Invasion games** = get into the other team's space while defending your own
- **Examples:** Agawan Base, Patintero, Langit-Lupa

Great job in Term 2! 🌟
$tr$),
('070fd88e-5ae8-40a8-8b2a-ad3b0a11239c', $tr$# 🎭 MAPEH — Melody and Healthy Food

Grade 4, Week 21! Let's learn about melody in music and why healthy food matters. 🎭

## 🔄 Review
We learned about rhythm and tempo in music of faith.

## 🎵 What Is Melody?
**Melody** is a series of sounds that go up or down and form the "tune" of a song — it is often the part that is easy to sing or remember.

## 🍎 Healthy Food
A **balanced meal** includes:
- Carbohydrates (rice, bread)
- Protein (fish, eggs)
- Vegetables and fruits
- Water

It is important to eat different kinds of food for a **healthy body**.

**Key words:** melody, tune, balanced meal, nutrition$tr$),
('09aabe61-6556-4363-95f5-4f99fda64b59', $tr$# 🎵 Friday Review — MAPEH (Grade 4)

- **Rhythm** = repeated sounds | **Beat** = steady pulse | **Tempo** = how fast or slow
- **Slow** = peaceful/sad | **Fast** = happy/fiesta
- Music linked to beliefs: the **Pasyon**, harvest music

Great job! 🌟$tr$),
('16ded52c-896f-4668-bb8a-a52dc4261af3', $tr$# 🎭 MAPEH — Term Review: Music, Arts, and PE

Grade 6, Week 20! Let's look back at everything we learned in MAPEH this term. 🎨

## 🔄 Review: Music
Meter, time signature, and rhythmic dance patterns from Filipino music.

## 🔄 Review: Theater and Dance
Symbolic theater, seditious plays, and dramatic structure during the American period.

## 🔄 Review: Health
Puberty and body changes, open communication with family, and self-esteem.

## 🔄 Review: PE
Striking/fielding and net/wall games; agility, balance, and coordination.

## 🔄 Review: Family Wellness
Planning a health activity for the whole family.

## 🧠 Example 1
*What is symbolic theater?*
- It uses **symbols** to share a message indirectly.

## 🧠 Example 2
*What is the difference between striking/fielding and net/wall games?*
- Striking/fielding has **hitting and running**; net/wall has a **barrier**.

## 💡 Why Does This Matter?
Reviewing MAPEH helps us **remember and connect** all the ideas we learned.

Great job in MAPEH! 🌟$tr$),
('17dea918-c0f0-40ed-9e17-5e44cff59dc5', $tr$# 🎨 MAPEH — Visual Arts in the Early Spanish Colonial Period

Grade 5, Week 18! Let's learn about the visual arts in the early part of the Spanish period. 🖼️

## 🖌️ Visual Arts Strand
**Visual Arts** covers the subjects, themes, styles, and media used during the Early Spanish Colonial Period (1521-1600).

## 🎨 Subjects and Themes
Most art from this time had a **religious** theme — pictures of saints, scenes from the Bible, and churches.

## 🖼️ Styles and Media
| Medium | Meaning |
|---|---|
| **Observing** | looking closely at your surroundings before you draw or paint |
| **Perceiving** | understanding shape, light, and shadow |
| **Drawing** | using a pencil or charcoal to make a picture |
| **Painting** | putting color on a canvas or surface |
| **Printing** | making many copies from one original template |
| **Engraving** | carving a design into a hard surface |

## 🧠 Example 1
*Why did most art in the Early Spanish Colonial Period have a religious theme?*
- Because the **Catholic Church** had a big influence on society at that time.

## 🧠 Example 2
*What is the difference between drawing and painting?*
- **Drawing** uses a pencil or charcoal, while **painting** uses color.

## 💡 Why Is This Important?
Studying the visual arts of this period helps us understand the **culture and beliefs** of our ancestors.

Great job with art! 🌟$tr$),
('1c9b597c-ac13-4d3b-8844-761799e1e27e', $tr$# 🎨 MAPEH — Music and Arts in the Early Spanish Colonial Period

Welcome to Term 2, Grade 5! Art from the 16th century. 🎭

## 🕰️ The Time Period: 1521–1600
This lesson covers the **Early Spanish Colonial Period** — from the arrival of Magellan (1521) to the end of the 16th century (1600).

## 🔄 Comparing: Pre-Colonial vs Early Spanish Colonial

| Aspect | Pre-Colonial | Early Spanish Colonial |
|---|---|---|
| **Purpose of art** | rituals, celebrations, community | spreading the Christian faith, the church |
| **Subject** | nature, ancestors, spirit figures | holy images, saints |
| **Style** | native designs | influenced by Europe |

## 🎵 Music: Melody and Musical Form

**Melody (Tune)**
- **Systems of writing melody** — ways of writing down the tune (musical notation)
- **Melodic direction** — whether the tune goes up, goes down, or stays level

**Musical Form (Shape of a song)**
- **Strophic** — the same tune repeats in every verse (like many hymns)
- **Binary** — two parts (A-B)
- **Free-form** — no set pattern

## 🎭 Theater: Subject and Symbolism
Plays during this time were about **religious subjects** — rituals and performances that showed **saints, miracles, and Christian lessons**.

## 💃 Dance: Movements of the Time
The **moves and motions** in dance changed as native traditions mixed with European influence.

## 🎨 Visual Arts: Subject, Theme, Style, Medium
- **Subject:** saints, scenes from the Bible
- **Medium:** painting, sculpture, church architecture
- **Purpose:** to teach Christianity to people who could not read (pictures were like a "book" for the people)

## 🧠 Example 1
*Why were so many pictures of saints made during this time?*
- Art was used to **teach religion** to native people who could not read or write. ✅

## 🧠 Example 2
*What is strophic form?*
- A form where the tune **repeats** in every verse of the song — for example, most **church hymns**. ✅

Great job in Term 2! 🌟$tr$),
('21758e95-1d3a-44f4-90e4-1c5959323485', $tr$# 🎭 MAPEH — Theater and Dances of Legends; The Right to Health

Grade 4, Week 23! Let's learn about theater linked to legends and about our right to health. 🎭

## 🔄 Review
We learned about dance exercise and movement exploration.

## 🎭 Theater and Dances of Legends
Many local dances and plays are inspired by **legends and folktales**. They tell a story through movement and costumes.

## ⚖️ A Child's Right to Health
As a child, you have the right to:
- Have access to **clean food and water**
- Get **medical care**
- Live in a **safe environment**

## 💡 Why Is It Important?
Understanding our right to health helps protect our well-being.

**Key words:** theater, legend, right to health, well-being$tr$),
('217c2fac-5b39-4b56-9806-0449e18581c2', $tr$# 👨‍👩‍👧‍👦 MAPEH — Planning a Family Health Activity

Grade 6, Week 19! Let's put together what we learned about physical games and health. 🏃‍♀️

## 🔄 Review
We already learned about **striking/fielding and net/wall games**, and the **ideas of agility, balance, and coordination**.

## 📅 Planning a Family Wellness Day
This week, let's plan a **day of healthy activities** for the whole family, using the games we learned.

## 📋 Parts of a Good Plan
| Part | Meaning |
|---|---|
| **Choosing a game** | pick a modified game that fits all ages |
| **Schedule** | set an exact time and day |
| **Equipment** | get the things you need ready (ball, rope, etc.) |
| **Safety** | make sure the place and activity are safe for everyone |

## 🧠 Example 1
*Why is it important to choose a modified game for the family wellness day?*
- So **people of all ages can play**, from kids to grown-ups.

## 🧠 Example 2
*Why should safety be thought about when planning the activity?*
- To **prevent accidents** and make sure everyone who joins is happy and safe.

## 💡 Why It Matters
Planning a family health activity makes the whole household's **bonds and health** stronger.

Great job! 🌟$tr$),
('2226c271-37fb-4212-b900-6fb6999bd26a', $tr$# 🎵 MAPEH — Music: Meter, Time Signatures, and Rhythmic Dance Patterns

Welcome to Term 2, Grade 6! 🎶

## ⏱️ What Is Meter?
**Meter** is the **regular pattern** of how many beats are in each measure of the music.

## 🎼 What Is a Time Signature?
A **time signature** is the **two numbers** at the start of the music (e.g. **4/4**, **3/4**) that tell us:
- **Top number** — how many beats are in each measure
- **Bottom number** — what kind of note gets one beat

**Examples:**
- **4/4 (Common Time)** — 4 beats in each measure, used in many songs
- **3/4 (Waltz Time)** — 3 beats in each measure, used in the waltz

## 💃 Rhythmic Dance Patterns
Every dance has its own **rhythmic pattern** that matches the **time signature** of the music.

**Examples:**
- **Tinikling** — uses a rhythm that matches the clapping of the bamboo poles
- **Waltz** — dancers move in a 3-beat pattern (1-2-3, 1-2-3)

## 🎻 Filipino Classical, Semi-Classical, and Popular Music

| Type | Example |
|---|---|
| **Classical** | the sonatas and symphonies of Nicanor Abelardo |
| **Semi-classical** | kundiman (love songs) |
| **Popular** | OPM (Original Pilipino Music) |

## 🧠 Example 1
*A song has a 3/4 time signature. How many beats are in each measure?*
- **3 beats** in each measure — good for a waltz. ✅

## 🧠 Example 2
*Why does a rhythmic dance pattern match the time signature?*
- The number of **steps** in the dance should match the number of **beats** in the music, so people stay **in time** with the music. ✅

## 🎵 Filipino Music of the Classical Period
Many composers of this time mixed **Western style** (classical) with **Filipino music** — like the kundiman, which mixes Western melodies with Filipino feelings.

Great job in Term 2! 🌟$tr$),
('25e866a2-d4ee-40e7-9396-610dbebba8e7', $tr$# 🕺 Friday Review — MAPEH (Grade 6)

- Dance Exercise

Great job in PE! 🌟$tr$),
('28c1128e-b00e-4cf7-8957-4ca7b69a6136', $tr$# 🎉 MAPEH — Doing Our Family Wellness Activity

Grade 5, Week 20! Let's do the wellness activity we planned. 💃

## 🔄 Review
Last week, we planned a **dance-for-health session** with visual art.

## 🎉 Doing the Activity
This week, we will actually **carry out** the plan — practicing dance as exercise, and showing the poster we made about health.

## 💭 Reflecting After the Activity
After the activity, think about: *What did I learn from combining dance, health, and art?*

## 🧠 Example 1
*Why is it important to actually carry out the plan, not just plan it?*
- So we can **experience** the real benefits of exercise and find out if the plan works.

## 🧠 Example 2
*What should we keep in mind while doing the activity?*
- The **safety** of everyone taking part.

## 💡 Conclusion
Doing a wellness activity shows how we **apply** what we learned in real life.

Great job! 🌟$tr$),
('2d120815-37e9-40f1-9f29-4b11e139bc6a', $tr$# 🎭 Friday Review — MAPEH (Grade 5)

- **Theater strand:** subject (rituals), theme (miracles), symbolism — e.g. the **cenaculo**
- **Dance strand:** movement vocabulary — free movements + formal European steps
- The tradition is still alive every **Holy Week (Semana Santa)**

Great job! 🌟$tr$),
('2d9304a6-ec3a-4888-ba89-c51b0a76c043', $tr$# 🎊 Friday Review — MAPEH (Grade 6)

- Traditional/national dances

Great job learning about culture! 🌟$tr$),
('2fdb08bb-c2af-49a1-a331-7e86e57d2e20', $tr$# 🎯 Friday Review — MAPEH (Grade 4)

- **Target games** = send an object to a **target**
- **Fitness components:** agility · balance · coordination · speed
- **Filipino games:** Tumbang Preso · Tatsing · Tamaang-Tao · Batuhang Bola · Calahoyo · Bati-Cobra
- **Safety:** warm up, a safe play area, light objects, water, follow the rules
- We learn **teamwork** and **respect**

Great job! 🌟$tr$),
('3120fac9-942e-4c29-82dd-e4bd63d6f839', $tr$# 🎨 Friday Review — MAPEH (Grade 6)

- Juan Luna's "Spolarium," revolutionary period art
- Fair play and holistic wellness in PE

Great job! 🌟$tr$),
('31acf0b2-8152-42f4-b94e-36cd12d7b118', $tr$# 🌱 Friday Review — MAPEH (Grade 6)

- Environmental health (One Health)

Great job in Health! 🌟$tr$),
('32d8ec8f-0dcc-4456-9c1b-a970478a1f29', $tr$# 🎨 MAPEH — Visual Arts: Rhythm and Pattern

Grade 4, Week 17! Let's learn about visual arts. 🎨

## 🎨 Rhythm in Visual Arts
In art, **rhythm** is a **repeated element** — a shape, color, or line — that creates a **flow** in a picture.

**Example:** repeated dots in a design, or repeated stripes in a woven cloth.

## 🔷 Pattern
A **pattern** is the **regular repeating** of a design.

**Types of patterns:**
- **Regular pattern** — same size and spacing (e.g., a checkerboard)
- **Random pattern** — no set order (e.g., natural spots on a stone)

## 🏃 Movement in Visual Arts
**Movement** is how **an artwork guides** the viewer's eye — from one part to another.

**How it is done:**
- Using **lines** that lead in one direction
- Using **repeated shapes** that create a flow

## 🧠 Example 1
*A woven cloth has repeated triangles. What does it show?*
- **Rhythm and pattern** — the repeated shapes create a regular flow.

## 🧠 Example 2
*A picture of a river has lines leading to a mountain. What does this show?*
- **Movement** — the lines guide the viewer's eye toward the mountain.

## 🎯 Why Are These Elements Important?
**Rhythm, pattern, and movement** are used to make an artwork **interesting** and **organized**.

## 🧵 Examples in Native Art
Many **traditional weavings** and **designs** of the Philippines use repeated patterns — they show the **skill** of our ancestors.

Great job! 🌟$tr$),
('3a18e1b9-691f-4080-b618-d76dab28d24c', $tr$# 🎵 MAPEH — Rhythm, Family Health, and Invasion Games

Term 2 begins! We have lots of new things to learn. 🎶

## 🥁 Music: Rhythm and Tempo
**Rhythm** is the pattern of sound and silence in a song. **Tempo** is the **speed** of the music.
- **Fast tempo** — lively music
- **Slow tempo** — calm music

## 🎭 Arts (Theater/Dance): Rhythm and Movement
**Local rituals** and **religious dances** use **repeated movements** (rhythmic patterns) to show the meaning of the ceremony.

## 🎨 Visual Arts: Rhythm and Pattern
In visual arts, **rhythm** is made by **repeating shapes, colors, or lines**.

## 👨‍👩‍👧‍👦 Family Health: Traits of a Healthy Family
A **healthy family** has:
- **Respect** for each member's opinion
- **Fair rules** for everyone
- **Open communication**

**Activities that improve family health:** dancing, exercising, cooking together, and gardening.

## ⚽ PE — Invasion Games
In **invasion games**, your goal is to **get into the other team's space** (attacking) while **stopping** the other team from getting into your own space (defending).

**Filipino Games:**
- **Agawan Base** — capturing the other team's base
- **Patintero** — crossing the lines without getting caught
- **Langit-Lupa** — dodging the tagger while jumping up high or staying low

## 🧠 Example
*Why is Patintero an invasion game?* Because you try to **cross the space** guarded by the taggers (attacking) without getting caught (defending against the taggers).

Great job in MAPEH! 🌟
$tr$),
('465904f4-12f0-44ed-baae-cd18f365638b', $tr$# 🎨 Friday Review — MAPEH (Grade 4)

- Term review: music, arts, visual arts, family health, PE

Great job in MAPEH! 🌟$tr$),
('4695a962-9d2d-4dfe-a839-fb0eb65a2ac8', $tr$# 🏀 MAPEH — Target and Invasion Games

The last MAPEH lesson of Term 1, Grade 6. 🏃

## 🎯 Target Games
Goal: **send an object to a target** accurately.
- **Examples:** archery, bowling, dart, Tumbang Preso
- **Keys:** **accuracy**, calm breathing, correct **positioning**

## ⚔️ Invasion Games
Goal: **get into the other team's territory** to score, while **defending** your own side.
- **Examples:** basketball, football, ultimate frisbee, agawang base
- **Keys:** teamwork, space, and switching quickly from defense to offense

## 🧠 Movement Concepts
| Concept | Meaning |
|---|---|
| **Body awareness** | what your body is doing |
| **Space awareness** | where you move — direction, level, pathway |
| **Effort** | how fast, how strong, or how smooth |
| **Relationship** | how you connect with teammates, opponents, and equipment |

## 🤾 Locomotor and Manipulative Skills
- **Locomotor** — moving your whole body: **walking, running, leaping, jumping, sliding**
- **Manipulative** — using an object: **throwing, catching, kicking, shooting, dribbling**

## 💪 Fitness Concepts
| Component | Meaning |
|---|---|
| **Agility** | changing direction quickly |
| **Balance** | staying steady |
| **Coordination** | body parts moving well together |
| **Speed** | how fast you move |
| **Endurance** | how long you can keep going in an activity |

## 🛡️ Strategies in Invasion Games

**On OFFENSE:**
- **Open up space** — don't bunch up in one spot
- **Pass early** — the ball moves faster than a person
- **Move after you pass** (*pass and move*)
- **Support** the player who has the ball

**On DEFENSE:**
- **Guard the space**, not just the player
- **Stay between** the opponent and the goal
- **Switch quickly** when you lose the ball
- **Talk** with your teammates

## 🏅 Modified Games
**Modified games** are games that are changed to **fit your age and ability**:
- A **smaller** court or field
- A **lighter** or bigger ball
- A **lower** ring or net
- A **shorter** game time
- **Fewer** players

**Goal:** more chances for **everyone** to join, not just the best players.

## 🤝 Sportsmanship
- **Respect** teammates, opponents, and the referee
- **Follow** the rules even when no one is watching
- **Congratulate** the winners; **cheer up** the losing team
- **Include** everyone in the game

## 🛡️ Safety
Warm up before, cool down after, wear the right shoes, drink water, and stop if you feel pain.

Great job in Term 1! 🌟$tr$),
('494adb81-8106-4427-b711-6aa5e8559933', $tr$# 🎭 MAPEH — Term 2 Review: Music, Art, PE, and Health

Grade 5, Week 27! Let's look back at what we learned this term. 🎭

## 🔄 Topics We Covered
- **Music/Art:** The Early Spanish Colonial Period; melody and musical form (verse/chorus)
- **PE:** Rhythmic activities/dances in 2/4 time, social dance mixer
- **Health:** Proper use of medicine, effects of gateway drugs

## 🧠 Putting It All Together
This term, we learned to name the parts of music (verse, chorus), made our own simple song, danced rhythmic dances, and learned how to take care of our health by using medicine the right way.

## 🎯 Goal of the Review
Make sure we are ready for new topics next term, while keeping everything we learned.

**Key words:** musical form, social dance mixer, proper use of medicine, gateway drugs$tr$),
('4a1450ff-bb7b-49c4-8b41-c872b51cf787', $tr$# 🎨 Friday Review — MAPEH (Grade 4)

- **Rhythm** = repeated elements | **Pattern** = regular repeating | **Movement** = guides the eye
- Regular pattern (checkerboard) vs random pattern (spots on a stone)

Great job! 🌟$tr$),
('4ac4278e-856b-495a-abd7-3601dcaa4296', $tr$# 🎭 Friday Review — MAPEH (Grade 4)

- **Rhythm** = repeated movements/sounds | **Movement** = how the body moves
- **Sinulog** (Cebu) · **Ati-Atihan** (Aklan) · **Pahiyas** (Quezon)
- Native dances = linked to beliefs/religion

Great job! 🌟$tr$),
('4f93bc8e-5ba4-4904-9872-0ab125939e84', $tr$# 🏀 Friday Review — MAPEH (Grade 6)

- **Target games** = accuracy at hitting a target (archery, bowling)
- **Invasion games** = getting into the other team's territory (basketball, football)
- **Locomotor** (running, jumping) vs **Manipulative** (throwing, kicking, dribbling)
- **Movement concepts:** body · space · effort · relationship
- **Fitness:** agility · balance · coordination · speed · endurance
- **Offense:** open up space, **pass and move** | **Defense:** guard the space
- **Modified games** = fit for your age, so more players can join

Great job! 🌟$tr$),
('4fad7343-7235-40ab-9f5f-4b628042c3b7', $tr$# ⚠️ MAPEH — The Effects of Gateway Drugs

Grade 5, Week 24! Let's learn about the dangers of gateway drugs. ⚠️

## 🔄 Review
We learned about the **proper use of medicine**.

## ⚠️ What Are Gateway Drugs?
**Gateway drugs** are substances that can open the way to using more dangerous drugs later on — for example: cigarettes, alcohol, and vapes.

## 🚫 Effects
- **Cigarettes** — damage the lungs and cause addiction to nicotine
- **Alcohol** — affects the brain and thinking, and causes addiction
- **Vapes** — also contain nicotine, which can cause addiction even at a young age

## 🛡️ How to Avoid Them
- Say "No" with confidence when someone offers them
- Choose friends who are a good influence
- Ask a parent or teacher for help when you feel pressured

**Key words:** gateway drugs, addiction, nicotine, influence$tr$),
('5531d983-4293-4d36-8519-1c3f36e46948', $tr$# 🎓 Friday Review — MAPEH (Grade 6)

- Full term review: arts, culture, health

Great term in MAPEH! 🌟$tr$),
('55e44863-0680-42a2-ad74-f287af4a497d', $tr$# 🎉 Friday Review — MAPEH (Grade 5)

- Doing a family wellness activity

Great job! 🌟$tr$),
('57c900c0-a744-44ba-b48c-f2c17b604bb7', $tr$# 💚 Friday Review — MAPEH (Grade 5)

**HEALTH**
- **Stress** = a natural response; manage it in **healthy** ways (breathing, exercise, sleep, talking to someone)
- **Passive · Aggressive · ASSERTIVE ✅** — assertive is the best
- **Bullying:** stay calm → be assertive → walk away → **tell a trusted adult**
- Asking for help is **bravery**, not weakness

**PE**
- **Striking/Fielding:** kickball, syato — hit to the **open space**
- **Net/Wall:** pickleball, wall ball, ringo — go back to the **ready position**
- **Fitness:** agility · balance · coordination · speed

Great job! 🌟$tr$),
('57dbc303-e995-47bb-a4ce-a98175a9f0aa', $tr$# 🕺 MAPEH — Dance Exercise

Grade 6, Week 23! Let's start a new PE unit — Dance Exercise! 🕺

## 🔄 Review
We learned about environmental health (One Health).

## 🕺 What Is Dance Exercise?
**Dance exercise** is a kind of exercise that uses dance steps to improve **cardiovascular fitness** (heart and lung strength) while having fun.

## 💃 Benefits
- Makes the heart and lungs stronger
- Improves coordination and balance
- Makes exercising fun

## 🎶 Examples of Dance Exercise
- Zumba-inspired moves
- Aerobic dance to Filipino music

## 🎯 Why Does It Matter?
Dance exercise is a fun way to keep your body active and healthy.

**Key words:** dance exercise, cardiovascular fitness, coordination, balance$tr$),
('59bb0131-8926-4fca-a0cc-e06457d57640', $tr$# 🎭 MAPEH — Symbolic Theater and Seditious Plays

Grade 6, Week 16! Let's learn about theater during the American period. 🎭

## 🎭 Symbolic Theater
**Symbolic theater** uses **symbols** to share a message **indirectly** — it was often used when speaking out openly was not allowed.

## ✊ Seditious Plays
These are plays that **secretly spoke out against** American rule, using **symbolic characters**.

**Examples of symbolism:**
- A character who stands for **"Mother Country" (Inang Bayan)** (the Philippines)
- A conqueror who stands for the **foreign rulers**
- Colors and costumes with a **secret meaning**

## 🏛️ Parts of a Dramatic Play
| Part | Meaning |
|---|---|
| **Exposition** | introduces the characters and the situation |
| **Conflict** | the problem or fight in the story |
| **Climax** | the highest point of the conflict |
| **Resolution** | the problem is solved |

## 💃 Dances of the Time
Many dances during this time were also used as a **secret way to show love for the country**.

## 🧠 Example 1
*Why did writers during the American period use symbols instead of speaking out openly?*
- Because the Sedition Law **banned** open protest against the American government — so they used **symbols** to avoid being punished.

## 🧠 Example 2
*What is the climax in a dramatic play?*
- It is the **highest point** of the conflict — where the tension is strongest before the problem is solved.

## 💡 Why This Kind of Art Matters
It shows the **cleverness and courage** of Filipino artists, even when they were being oppressed.

Great job! 🌟$tr$),
('604a0088-bcbf-461f-a803-29be3df9c2b4', $tr$# 🎉 Friday Review — MAPEH (Grade 6)

- Local and regional street dances

Great job learning about culture! 🌟$tr$),
('696544c4-def0-4203-b46c-f6183af88462', $tr$# 🎵 Friday Review — MAPEH (Grade 4)

- Dynamics (piano/forte) and timbre in music
- Sportsmanship and personal health

Great job! 🌟$tr$),
('6af49c79-3853-4630-9f4f-e6042fbf8b0a', $tr$# 🛍️ MAPEH — Rights and Responsibilities as a Consumer

Grade 4, Week 25! Let's learn about our rights as shoppers. 🛍️

## 🔄 Review
We learned about theater of legends and the right to health.

## 🛍️ Consumer Rights
- The right to **know** the true price and quality of a product
- The right to **choose** what you want to buy
- The right to **complain** if a product is damaged or wrong

## 📋 Consumer Responsibilities
- Read the **label** before buying
- Check the **expiry date**
- Be a **smart shopper** — don't just believe every ad

## 💡 Why Is It Important?
Being a smart consumer helps protect us from **being cheated or getting poor-quality** products.

**Key words:** consumer, rights, responsibilities, smart shopper$tr$),
('6b3da547-5aa9-49ba-9094-aa37f20e85a1', $tr$# 🎨 MAPEH — Term Review: Music, Arts, and PE

Grade 4, Week 20! Let's look back at everything we learned in MAPEH this term. 🎭

## 🔄 Review: Music
We learned about **rhythm and tempo**, using local music linked to beliefs and faith.

## 🔄 Review: Arts (Theater/Dance)
We learned the elements of composition — **rhythm/pattern and movement** — seen in native rituals.

## 🔄 Review: Visual Arts
We learned the visual elements of **rhythm and pattern**.

## 🔄 Review: Family Health
We learned the traits of a **healthy family** and healthy activities.

## 🔄 Review: PE — Invasion Games
We learned about **agility, balance, and coordination** through Filipino games like Patintero and Agawan Base.

## 🧠 Example 1
*What idea do rhythm and tempo show in music?*
- The **speed and pattern** of sound.

## 🧠 Example 2
*Which of the things we learned is linked to family health?*
- The **traits of a healthy family** and healthy activities.

## 💡 Why Is This Important?
Reviewing our MAPEH lessons helps us **remember and connect** all the ideas we learned.

Great job in MAPEH! 🌟$tr$),
('6da8c8fd-3c51-4cae-9a4d-ec0ed4e60c67', $tr$# 🎭 Friday Review — MAPEH (Grade 6)

- Changes while growing up are **normal** — physical, emotional, and social
- **Open communication** with family is important
- **Self-esteem** and the skill of **saying no** help you make the right choices

You're a good kid! 💫$tr$),
('7167c88b-6747-498f-92c0-26761fe4e591', $tr$# 🎨 Friday Review — MAPEH (Grade 5)

- Time period: **1521–1600**, Early Spanish Colonial Period
- **Melody:** systems of writing melody, melodic direction
- **Musical form:** strophic (repeating) · binary (A-B) · free-form
- Theater/Visual Arts: **religious** subjects — saints (santo), scenes from the Bible

Great job in Term 2! 🌟$tr$),
('79fb77b3-a14d-4d24-b2f7-ef4f545e0656', $tr$# 🎨 Friday Review — MAPEH (Grade 5)

**Music/Arts:** Early Spanish Colonial Period — **melody & written notation**, religious themes in visual art and theater, dance blending indigenous and Spanish court steps

**Health:** Proper use of medicine (as prescribed, right amount/time) vs. **misuse**; **gateway drugs** raise risk of trying harsher substances; say **no assertively** and tell a trusted adult

A great start to Term 2! 🌟$tr$),
('8297947c-f21c-4091-a769-91bbca8a1b37', $tr$# 💃 Friday Review — MAPEH (Grade 5)

- Social dance mixers in 2/4 time

Great job! 🌟$tr$),
('83fa83ec-0388-4d53-8ef0-054a60c58a91', $tr$# 🎭 Friday Review — MAPEH (Grade 5)

- Term 2 wrap-up: music, PE, health

Great term! 🌟$tr$),
('8641392d-2daf-4c06-b969-8d7e1f2d227d', $tr$# 💃 Friday Review — MAPEH (Grade 5)

- Combining dance, health, and art in one wellness activity

Great job! 🌟$tr$),
('87482ee3-6493-4329-878a-910341c40c28', $tr$# 🎵 Friday Review — MAPEH (Grade 6)

- **Meter** = the pattern of beats in each measure | **Time signature** = 2 numbers (beats per measure, kind of note)
- **4/4 (Common Time)** · **3/4 (Waltz Time)**
- Rhythmic dance patterns should match the time signature

Great job in Term 2! 🌟$tr$),
('894db8df-e04e-47e8-9e97-a715cb93c0ef', $tr$# 🏐 Friday Review — MAPEH (Grade 6)

- Striking/fielding = hitting + running; Net/wall = has a barrier
- Agility, balance, coordination

Great job! 🌟$tr$),
('8bd2024f-7003-4a46-8291-355d1488b295', $tr$# 🎭 Friday Review — MAPEH (Grade 6)

- Term review: music, theater/dance, health, PE, family wellness

Great job in MAPEH! 🌟$tr$),
('8d013702-18c5-41c5-8a74-6c89275168ea', $tr$# 🎵 MAPEH — Musical Form: Verse and Chorus

Grade 5, Week 21! Let's learn the parts of a song. 🎶

## 🔄 Review
We learned about **melody** and dances in 2/4 time.

## 🎵 What Is Musical Form?
**Musical form** is the **way the parts of a song are arranged**. The two most common parts are:

- **Verse** — the part whose words change each time it comes back; it tells a story.
- **Chorus** — the part that repeats and that people usually remember best; it is the "main message" of the song.

**Example:** In many Filipino songs, the **verse** moves the story along while the **chorus** is sung again and again with the same tune and words.

**Key words:** musical form, verse, chorus$tr$),
('92e6d6a6-8260-401b-ac7e-99035a6230c6', $tr$# 🎶 Friday Review — MAPEH (Grade 5)

- Pre-colonial Philippine arts and instruments
- Dynamics and timbre in music

Great job! 🌟$tr$),
('94936219-9b2e-4175-8399-f0d2597ad9a7', $tr$# 🏥 Friday Review — MAPEH (Grade 6)

- Common communicable (contagious) diseases

Great job in Health! 🌟$tr$),
('96957bf6-0e5a-4e86-b25d-df9e4495a7c6', $tr$# 🌐 Friday Review — MAPEH (Grade 6)

- My Filipino identity

Great job! 🌟$tr$),
('9758aaed-8a1e-4592-87db-3e36ae3569db', $tr$# 💃 Friday Review — MAPEH (Grade 4)

- Social dance mixers in 3/4 time

Great job! 🌟$tr$),
('99fd0d6c-782c-4b91-ab9c-03416a8171aa', $tr$# 💃 MAPEH — Putting Together 2/4 and 3/4 Time

Grade 4, Week 27! Let's put together the dance steps we learned! 💃

## 🔄 Review
We learned the social dance mixer in 3/4 time.

## 💃 Putting Two Tempos Together
This week, we will combine steps from 2/4 time (fast) and 3/4 time (gentle) into a short presentation.

## 🎯 Goals of the Practice
- Build coordination when the tempo changes
- Show self-confidence in front of others
- Work together as a group on a short choreography (a planned set of dance moves)

## 🏆 End of Term 2
This is the last week of Term 2 for MAPEH — a great chance to show what you learned all term!

**Key words:** 2/4 time, 3/4 time, choreography, coordination$tr$),
('9c7fe88f-b37f-4057-9a71-68a429ad8814', $tr$# 🎭 MAPEH — Theater and Dance in the Early Spanish Colonial Period

Grade 5, Week 17! Let's learn about theater and dance from 1521-1600. 🎭

## 🎭 Theater Strand: Subject, Theme, and Symbolism
Plays during this time had:
- **Subject:** church rituals, the lives of the saints
- **Theme:** miracles, salvation, faith
- **Symbolism:** using images to teach religious lessons

**Example:** The **cenaculo** — a play that shows the **life and suffering of Christ**.

## 💃 Dance Strand: Movement Vocabulary
**Movement vocabulary** is the **set of movements** used in a dance.

**Native and European dances mixed together:**
- **Native movements** — free movement of the body
- **European influence** — more formal steps, like partner dances

## 🧠 Example 1
*What is the cenaculo?*
- A play that shows the **life and suffering of Christ** — an example of symbolic theater during this time.

## 🧠 Example 2
*How did native and European dances mix during this time?*
- The **free movements** of native dance were **combined** with the **formal steps** of Europe — creating a new style of dance.

## 🎨 Connection to Today
Many **pasyon (the Passion story) and senakulo** performances are still done today every **Holy Week (Semana Santa)** — proof that this tradition is still alive.

## 💡 Why Is Studying This Art Important?
It shows how two cultures **mixed** to create a **new form of art** that is special to the Philippines.

Great job in Week 17! 🌟$tr$),
('9de42550-2fdf-4d49-9ff4-3386f55df1e7', $tr$# 🎼 Friday Review — MAPEH (Grade 5)

- Making your own simple song

Great job! 🌟$tr$),
('a03d4a5d-dd91-4594-ab73-3706c62900a6', $tr$# 🎨 MAPEH — Week 9: Term Review!

Let's look back at what we learned this term! 📚

## 🎨 Music & Arts Review
- **Revolutionary and American Period** — how history shaped the arts.

## 💪 PE & Health Review
- **Holistic wellness** — taking care of your whole self.
- **Target and Invasion Games** — traditional Filipino games.

## 🎯 Next Term
- We will study the Commonwealth Period and Sexual/Reproductive Health!

Great job this MAPEH term! 🌟$tr$),
('a283f349-1eb7-4914-919b-8bea4ae0b59d', $tr$# 🛍️ Friday Review — MAPEH (Grade 4)

- Rights and responsibilities as a consumer

Great job! 🌟$tr$),
('a7853b57-6063-4fb2-9845-8c855c6746b8', $tr$# 💃 MAPEH — Social Dance Mixers

Grade 5, Week 22! Let's move our bodies with some simple dances! 💃

## 🔄 Review
We learned about **musical form**: verse and chorus.

## 💃 What Is a Social Dance Mixer?
A **social dance mixer** is a kind of dance where dancers **keep changing partners** while moving to music in **2/4 time**.

## 🕺 Steps
1. Stand in a circle or a line with your partner
2. Do the simple moves together (stepping, turning)
3. At the signal, move to the next partner

## 🎯 Goal
It teaches us **coordination**, **timing** with the music, and the **fun of getting along with others** while we move.

**Key words:** social dance mixer, 2/4 time, signal, coordination$tr$),
('a82005eb-7209-4a96-a5af-805c57f96324', $tr$# 💃 MAPEH — Fundamental Dance Steps in 2/4 Time

Grade 4, Week 24! Let's learn the basic steps in dance. 💃

## 🔄 Review
We learned about theater and dances of legends.

## 💃 What Are Fundamental Dance Steps?
**Fundamental dance steps** are the basic steps used in many dances — like the touch step, slide, and bounce.

## 🕺 Dancing in 2/4 Time
In **2/4 time**, there are two beats in each measure. It is often used in fast dances like the polka.

## 🎯 Why Is It Important?
Learning the basic steps makes it easier to learn harder dances later on.

**Key words:** fundamental dance steps, 2/4 time, touch step, polka$tr$),
('a8faec53-da92-4283-b974-1b57f7493eaf', $tr$# 🎼 MAPEH — Making Your Own Simple Song

Grade 5, Week 26! Let's make our own simple tune! 🎼

## 🔄 Review
We learned about the **culminating dance performance**.

## 🎼 Looking Back: Verse and Chorus
We already learned that a song has a **verse** and a **chorus**.

## 🎵 Steps to Make Your Own Song
1. Choose a simple topic (e.g. love for family, nature)
2. Write a short **verse** that tells a story
3. Write a **chorus** that repeats and is easy to remember
4. Try to find a simple tune using your voice or a simple instrument (bell, clapping)

## 🎯 Goal
The tune does not have to be perfect — what matters is that you share your idea using the **musical form** we learned.

**Key words:** songwriting, verse, chorus, tune$tr$),
('b05d7a19-d0a9-4d8e-ae13-1962154714f7', $tr$# 🌱 MAPEH — Environmental Health (One Health)

Grade 6, Week 22! Let's learn how people's health and the environment are connected. 🌱

## 🔄 Review
We learned about common communicable diseases.

## 🌱 What Is One Health?
**One Health** is the idea that the health of people, animals, and the environment are all connected — so we must take care of all of them together.

## ♻️ Sanitation and Cleanliness
Good **sanitation** (like clean water and proper trash disposal) is important to stop the spread of disease.

## ♻️ The 8Rs of Waste Management
Refuse, Reduce, Reuse, Repurpose, Rot, Recycle, Repair, and Rethink — ways to cut down on the trash we put into the environment.

**Key words:** One Health, sanitation, 8Rs, environment$tr$),
('b0b035f8-15ae-400b-8565-c7c20c4bdd38', $tr$# 🎭 MAPEH — Art, Feelings, and Changes in Yourself

Grade 6, Week 17! Let's talk about art during wartime and the changes young people go through. 🎨

## 🎭 Review: Symbolic Theater and Seditious Plays
We learned that Filipinos used **symbolism in theater** to show their love for the country, even when open protest was banned.

## 🌱 Changes While Growing Up
As a child grows into a teenager, they go through **physical, emotional, and social changes**. These are normal, and it is important to understand them the right way.

**Some examples of changes:**
- **Physical** — getting taller, voice changes
- **Emotional** — mood changes more often, deeper feelings
- **Social** — caring more about what friends think

## 💬 Open Communication with Family
It is important to **talk openly** with your parents or other adults about new feelings or questions about growing up — they are the most trusted guides.

## 💪 Self-Esteem
A **positive view of yourself** helps a child to:
- Stay true to their values
- Not rush into following what others push them to do
- Trust their own decisions

## 🚫 The Skill of Saying No (Assertiveness)
When someone invites or pushes you to do something you don't want to do, it is important to learn to **say "no" with confidence** and not feel shy about it.

## 👨‍👩‍👧 The Role of the Family
The family is a child's first **guide** in growing up — they teach how to make good choices and give support during times of change.

## 🧠 Example
*A classmate is trying to force you to do something you don't want to do. What should you do?*
- Say **"no" clearly and politely**, and talk to a **trusted adult** if needed.

You're a good kid! 💫$tr$),
('b1d056c2-fc91-4d2f-8edd-39a1d78f9c89', $tr$# ⚠️ Friday Review — MAPEH (Grade 5)

- Effects of gateway drugs

Great job! 🌟$tr$),
('b7dac917-ba03-420d-b8b8-31d8485885f8', $tr$# 🎭 Friday Review — MAPEH (Grade 4)

- Melody and healthy food

Great job! 🌟$tr$),
('b80bf906-8497-49a6-9a9b-9f89b521ba2f', $tr$# 💃 Friday Review — MAPEH (Grade 4)

- Fundamental dance steps in 2/4 time

Great job! 🌟$tr$),
('b8c4361e-a9a6-48c9-88c4-c9655b3892d1', $tr$# 🎭 Friday Review — MAPEH (Grade 6)

- **Symbolic theater** = uses symbols, not open protest
- **Seditious plays** = secretly speak out against foreign rule
- **Parts of a play:** exposition → conflict → climax → resolution

Great job! 🌟$tr$),
('b997a9f4-08eb-4227-9997-21e586c84b6a', $tr$# 🎨 Friday Review — MAPEH (Grade 5)

- Visual Arts: observing, perceiving, drawing, painting, printing, engraving
- Most common theme: religious

Great job with art! 🌟$tr$),
('c9f02349-7632-432f-89ef-f23ae84f09ae', $tr$# 🏸 Friday Review — MAPEH (Grade 6, Term 2 Week 1)

- **Striking/fielding games** (softball) — hit the ball, run to the base
- **Net/wall games** (badminton, volleyball) — send the ball over the net into an open space
- **Fielding** = catching or getting back the ball | **Volleying** = sending the ball back before it hits the floor
- Go back to the **ready position** after every shot
- **Warm up** before playing; play **fairly**

A great start to Term 2! 🌟$tr$),
('cf34470f-8d81-424a-8951-ce11cd46f53d', $tr$# 💚 MAPEH — Mental and Emotional Health + Striking/Net Games

The last MAPEH lesson of Term 1, Grade 5. 🌟

---

# PART 1 — HEALTH: Mental and Emotional Health

## 😰 What Is Stress?
**Stress** is the body's natural response to a challenge or change. It is normal — but you need to **manage** it well.

**Common causes:** tests, chores at home, fights with friends, changes in the family

## ✅ Healthy Ways to Deal with Stress
| Strategy | How to do it |
|---|---|
| **Deep breathing** | breathe in for 4 seconds, hold for 4, breathe out for 4 |
| **Physical exercise** | walk, run, play |
| **Enough sleep** | 9–11 hours for your age |
| **Talking to someone** | tell a parent, teacher, or friend |
| **Managing your time** | split a big task into small parts |
| **Hobbies** | drawing, music, reading |

**❌ Not healthy:** hiding your feelings, hurting others, avoiding everything, too much screen time

## 🗣️ Assertive Behavior
There are **three ways** to respond:

| Type | Description | Example |
|---|---|---|
| **Passive** | does not share their feelings | *just stays quiet* |
| **Aggressive** | shares feelings in a hurtful way | *"Are you stupid?!"* |
| **ASSERTIVE ✅** | clear and respectful | *"I don't like that. Please stop."* |

Being **assertive** is the best — you stand up for yourself **without hurting others**.

## 🛡️ Standing Up to Bullying and Discrimination
**Bullying** is hurting someone again and again — with the body, with words, socially, or through **cyberbullying**.

**What to do:**
1. **Stay calm** — do not fight back with violence
2. **Speak assertively** — *"Leave me alone."*
3. **Walk away** from the place
4. **Tell a trusted adult** — a parent, teacher, or guidance counselor
5. **Keep a record** of cyberbullying — take a screenshot before you block

**If you see it happen (bystander):** do not just watch. **Help** — tell an adult or stay with the person being bullied.

**Asking for help is NOT weakness — it is bravery.** 💪

## 🌱 Changes While Growing Up
At ages 10–12, **puberty** begins — a natural stage of growing up. Your body changes, and sometimes your feelings change quickly too (**mood swings**). **This is normal for everyone.**

Your **family** is an important support: ask your parents or an older brother or sister, and keep talking openly. If there is something you don't understand, **ask a trusted adult** or the school nurse.

---

# PART 2 — PE: Striking/Fielding and Net/Wall Games

## 🏏 Striking/Fielding Games
One team **hits/kicks**, and the other team **catches/chases**.

- **Kickball** — kick the ball, run to the bases
- **Syato** — hit a short stick using a long stick

**Game concepts:**
- **Batting/kicking:** send the ball to an **empty space** (open area)
- **Fielding:** cover the space, **throw quickly** back to the base

## 🏓 Net/Wall Games
Two sides are separated by a **net** or a **wall**.

- **Pickleball** — a paddle and a ball with holes, hit over the net
- **Wall ball** — throw the ball against a wall
- **Ringo** — pass a ring over the net

**Game concepts:**
- **Scoring:** hit to the **open area** or where it is hard for your opponent to reach
- **Rally:** keep the back-and-forth going
- **Court positioning:** go back to the **middle** (ready position) after every hit
- **Defending:** cover the space, expect the next hit

## 🏃 Fitness Components
**Agility** (changing direction quickly) · **Balance** · **Coordination** · **Speed**

## 🛡️ Safety
Warm up, use the right equipment, drink water, and **respect your playmates**.

Great job in Term 1! 🌟$tr$),
('d071913e-7be3-45cf-ad1a-b662654de804', $tr$# 💊 MAPEH — Proper Medicine Use vs. Misuse

Grade 5, Week 23! Let's learn how to use medicine the right way. 💊

## 🔄 Review
We learned about the **social dance mixer**.

## 💊 Proper Use of Medicine
- Only take medicine that a doctor or parent has **prescribed or recommended**
- Follow the right **dose** and the right time to take it
- Read the **label** before taking it
- Never take medicine that belongs to someone else

## ⚠️ Misuse
**Misuse** happens when you:
- Take more than the set dose
- Take medicine without an adult's permission
- Use medicine for the wrong purpose

Misusing medicine can cause **serious harm to the body**, even if the medicine itself is safe when used correctly.

**Key words:** prescription, dose, label, misuse$tr$),
('d2ee7abe-92ee-4017-8028-f3308ca34d25', $tr$# 🎓 MAPEH — Term Review: Arts, Culture, and Health

Grade 6, Week 27! Let's look back at everything we learned in MAPEH this term. 🎨

## 🔄 Review: Health
Common communicable diseases, the chain of infection, and environmental health (One Health).

## 🔄 Review: PE
Dance exercise, and local street dance festivals (Sinulog, Ati-Atihan, Dinagyang).

## 🔄 Review: Dance and Arts
Traditional dances (Tinikling, Singkil, Pandanggo sa Ilaw) and contemporary Filipino identity.

## 🎯 Putting It All Together
This whole term shows how Filipinos take care of their bodies and value their culture at the same time.

**Key words:** One Health, dance exercise, street dance, traditional dance, contemporary art$tr$),
('d3f90912-3b19-4074-a81c-455e38a25cce', $tr$# 💃 Friday Review — MAPEH (Grade 4)

- Putting together 2/4 and 3/4 time

Great job! 🌟$tr$),
('d6596e12-7388-4c51-918b-c295084664e4', $tr$# 🏐 MAPEH — Striking/Fielding and Net/Wall Games

Grade 6, Week 18! Let's learn about physical games for the family. 🏸

## 🏐 Striking/Fielding Games
**Striking/fielding games** are games where you **win or score points** by hitting/throwing a ball and running (e.g. baseball, softball, patintero with throwing).

## 🏸 Net/Wall Games
**Net/wall games** are games with a **barrier** between the two sides (a net or a wall), like badminton, volleyball, or tennis.

## 💪 Skills and Ideas Used
| Skill | Meaning |
|---|---|
| **Agility** | the ability to move fast and change direction |
| **Balance** | the ability to stay steady while moving |
| **Coordination** | making different body parts work together in one movement |

## 👨‍👩‍👧‍👦 Modified Games for the Family
These games can be **modified (changed)** to fit the whole family, helping with **health and togetherness**.

## 🧠 Example 1
*What is the difference between striking/fielding games and net/wall games?*
- Striking/fielding games have **hitting and running**, while net/wall games have a **barrier** between the two sides.

## 🧠 Example 2
*Why is it important to modify these games for the family?*
- So **people of all ages can play** and the whole family stays healthy.

## 💡 Why It Matters
Playing these games improves **physical health** while **making family bonds stronger**.

Great job! 🌟$tr$),
('d8303a5c-34c7-48e7-ae60-d38dac43f30c', $tr$# 🎯 MAPEH — Target Games and Filipino Games

Last MAPEH lesson of Term 1, Grade 4! Let's play! 🇵🇭

## 🎯 What Are Target Games?
In **target games**, your goal is to **throw or send** an object (a ball, a stone, a slipper) toward a **target** or a certain spot.

**Important skills:**
- **Positioning** — standing in the right place and position before you throw
- **Sending/propelling** — throwing or hitting toward the target
- **Accuracy** — hitting exactly where you aim

## 🏃 Four Fitness Components
| Component | Meaning |
|---|---|
| **Agility** | changing direction quickly |
| **Balance** | keeping the body steady |
| **Coordination** | moving the eyes and hands together |
| **Speed** | how fast you move |

## 🇵🇭 Filipino Games (Target Games)

**1. Tumbang Preso** — players throw a slipper at a standing can to knock it down. It trains **accuracy** and **agility**.

**2. Tatsing** — players flick or throw a pamato (a flat stone or disc used as a shooter) at bottle caps to knock them out of a circle. It trains **coordination**.

**3. Tamaang-Tao** — players throw a ball at playmates inside a circle, and the playmates try to dodge it. It trains **agility** and **speed**.

**4. Batuhang Bola** — teammates throw and catch a ball with each other.

**5. Calahoyo** — players drop or push a ball or stone toward a small hole in the ground. It trains **accuracy**.

**6. Bati-Cobra** — players hit a small stick using a longer stick. It trains **hand-eye coordination**.

## 🛡️ Safety While Playing
- **Warm up** before playing and **cool down** after
- Make sure the area is **safe** and there is nothing to bump into
- Use **light** objects for throwing, not hard stones
- **Drink water** — avoid dehydration
- Follow the **rules** and respect your playmates

## 💛 Why Filipino Games Matter
These games are part of our **culture**. Besides **exercise**, we learn **teamwork**, **fairness**, and **respect** for our playmates.

Great job! 🌟$tr$),
('d8e01994-60cf-4a6d-ad1b-4d4e72662d9e', $tr$# 🎭 Friday Review — MAPEH (Grade 4)

- Legend theater and the right to health

Great job! 🌟$tr$),
('dece9436-ba4e-46ed-bc50-db22bd4ea783', $tr$# 💊 Friday Review — MAPEH (Grade 5)

- Proper medicine use vs. misuse

Great job! 🌟$tr$),
('e006374c-6b24-4227-a214-2d8d5940447b', $tr$# 💃 MAPEH — Social Dance Mixers in 3/4 Time

Grade 4, Week 26! Let's learn about dancing in 3/4 time. 💃

## 🔄 Review
We learned the fundamental dance steps in 2/4 time.

## 💃 What Is 3/4 Time?
In **3/4 time**, there are three beats in each measure. It is often used in the waltz — the tempo is gentler than 2/4.

## 🕺 Social Dance Mixer in 3/4 Time
Like we learned before, in a social dance mixer dancers keep changing partners. But now we will follow the gentler 3/4 tempo.

## 🎯 Why Is It Important?
Practicing different time signatures widens our **musical and physical skills**.

**Key words:** 3/4 time, waltz, social dance mixer, tempo$tr$),
('e06bbf55-39ee-4cfc-b9c3-c70352a99ad6', $tr$# 🎭 MAPEH — Arts: Rhythm and Movement in Native Rituals

Grade 4, Week 16! Let's learn about the art of our ancestors. 🎨

## 🎭 Elements and Principles of Composition
In **theater** and **dance**, these are important:
- **Rhythm/Pattern** — repeated movements or sounds
- **Movement** — how the body moves

## 🙏 Native Rituals and Religious Dances
Many native dances are **linked to beliefs or religion**.

**Examples:**
- **Sinulog** (Cebu) — a prayer dance to honor the Santo Niño (the Holy Child Jesus)
- **Ati-Atihan** (Aklan) — a dance and ritual of thanksgiving
- **Pahiyas** (Quezon) — a celebration to give thanks for a big harvest

## 🎵 Rhythm in Dance
These dances have **repeated steps** that follow the **beat of drums or gongs**.

## 🧠 Example 1
*Why do we say the Sinulog has rhythm?*
- It uses **repeated steps** — two steps forward, one step back — that follow the **music**.

## 🧠 Example 2
*Why are these dances linked to beliefs?*
- They are done as **celebration or prayer**, not just for fun — they show the **faith** of the community.

## 🎨 Movement in Different Dances
| Dance | Type of Movement |
|---|---|
| **Sinulog** | two steps forward, one step back |
| **Ati-Atihan** | lively dancing with color and noise |
| **Pahiyas** | a procession with decorations |

Great job! 🌟$tr$),
('e07e0b02-e108-4714-93d1-38a97811d0ca', $tr$# 🏸 MAPEH — Striking/Fielding and Net/Wall Games (Term 2, Week 1)

New kinds of games for Term 2! 🎾⚾

## 🏏 Striking/Fielding Games
Goal: **hit the ball** and run to the **bases** before the other team gets the ball back.
- **Examples:** softball, baseball, patintero-inspired striking games
- **Keys:** good **timing** when hitting, running fast, and good **fielding** (catching and throwing the ball back)

## 🏓 Net/Wall Games
Goal: **send the ball over the net or against the wall** to a spot that is hard for the opponent to return.
- **Examples:** badminton, volleyball, table tennis, sipa-tennis
- **Keys:** **placement** (where you send the ball), timing of your swing, and your position on the court

## 🧠 Important Skills

| Skill | Description |
|---|---|
| **Striking** | hitting the ball with your hand, foot, or a bat |
| **Fielding** | catching or getting back the ball after it is hit |
| **Serving** | starting the game by sending the ball to the opponent |
| **Volleying** | sending the ball back without letting it bounce on the floor |

## 💪 Strategies in Striking/Fielding
- **When batting/hitting:** watch the ball until the moment you hit it
- **When fielding:** get into the right position before the ball arrives
- **When running the bases:** decide quickly whether to run or not

## 🎯 Strategies in Net/Wall Games
- **Send the ball into the opponent's open space**
- **Change the speed and direction** so the opponent cannot guess
- **Go back to the middle position right away** (ready position) after every shot

## 🛡️ Safety
Warm up before playing, use the right equipment (racket, gloves), and stay alert to where the ball is flying.

## 🤝 Sportsmanship
Praise the other team's good plays, follow the rules, and play **fairly** even when no referee is watching.

A great start to Term 2! 🌟$tr$),
('e0a4a93a-b284-4557-9aca-981ba828968c', $tr$# 💃 Friday Review — MAPEH (Grade 4)

- Dance exercise and movement exploration

Great job! 🌟$tr$),
('e13c60ed-8109-42c5-92d2-f46baf8c3b54', $tr$# 💃 Friday Review — MAPEH (Grade 5)

- Culminating dance performance

Great job! 🌟$tr$),
('e6cd572b-c8cc-4807-8094-7193a542ebce', $tr$# 🎊 MAPEH — Traditional/National Dances

Grade 6, Week 25! Let's learn about the traditional dances of the Philippines! 🎊

## 🔄 Review
We learned about local and regional street dance festivals.

## 🎊 What Is a Traditional/National Dance?
A **traditional dance** is a dance passed down from one generation to the next. It reflects the culture and history of a region.

## 💃 Examples
- **Tinikling** — a dance with bamboo poles that copies the tikling bird
- **Singkil** — a Maranao dance using bamboo poles and umbrellas
- **Pandanggo sa Ilaw** — a dance with oil lamps on the hands and head

## 🎯 Why Does It Matter?
These dances are part of our national identity and should be kept alive for the next generation.

**Key words:** traditional dance, Tinikling, Singkil, Pandanggo sa Ilaw$tr$),
('e7f46f41-c4e9-4058-9166-e1beda6c5885', $tr$# 💃 MAPEH — Dance Exercise and Movement Exploration

Grade 4, Week 22! Let's move our whole body through dance! 💃

## 🔄 Review
We learned about melody and healthy food.

## 💃 What Is Dance Exercise?
**Dance exercise** is a way of exercising using simple dance moves along with music.

## 🤸 Movement Exploration
**Movement exploration** means trying out different body movements — bending, turning, jumping — to find out what your body can do.

## 🎯 Why Is It Important?
Dance exercise makes the body strong while we **have fun** with music and movement.

**Key words:** dance exercise, movement exploration, exercise, movement$tr$),
('ea9c5178-12b6-4010-9128-e30253b0342e', $tr$# 🌐 MAPEH — My Filipino Identity

Grade 6, Week 26! Let's start a contemporary (modern-day) topic about our identity! 🌐

## 🔄 Review
We learned about traditional and national dances.

## 🌐 What Is Contemporary Filipino Art?
**Contemporary art** means new, modern artworks (music, dance, visual art) that show what life is like for Filipinos today.

## 🎨 Examples of Contemporary Expression
- Modern Filipino music influenced by OPM (Original Pilipino Music)
- Dances that mix traditional and modern moves
- Visual art that shows Filipino life today

## 💡 Why Does It Matter?
Contemporary art shows how Filipino identity keeps growing while staying rooted in tradition.

**Key words:** contemporary art, identity, OPM, expression$tr$),
('eea01b90-7712-4da1-a6b3-780b9932aa49', $tr$# 👨‍👩‍👧‍👦 Friday Review — MAPEH (Grade 6)

- Planning a family wellness day using the games we learned

Great job! 🌟$tr$),
('f60ba60b-0ac1-4105-85a8-d2a66a2daca8', $tr$# 🎉 MAPEH — Local and Regional Street Dances

Grade 6, Week 24! Let's learn about famous street dance festivals in the Philippines! 🎉

## 🔄 Review
We learned about dance exercise.

## 🎉 What Is a Street Dance Festival?
**Street dance festivals** are yearly events where communities dance in the streets to celebrate their region's culture and history.

## 🌟 Examples
- **Sinulog** (Cebu) — honors the Santo Niño
- **Ati-Atihan** (Aklan) — the oldest festival in the Philippines
- **Dinagyang** (Iloilo) — a colorful celebration with dancing tribes

## 💃 Features of Street Dance
It has loud drumbeats, colorful costumes, and a big group of dancers moving together in the same choreography.

## 🎯 Why Does It Matter?
Street dance festivals show the rich culture and festive spirit of Filipinos.

**Key words:** street dance, Sinulog, Ati-Atihan, Dinagyang, celebration$tr$),
('f755f3c2-7a87-4472-b09b-8d85f4106ae7', $tr$# 🎨 Friday Weekly Review — MAPEH

Quick review!

- Music/Arts: **Revolutionary and American Period**
- Health: **holistic wellness** | PE: target/invasion games

Great term of MAPEH! 🌟$tr$),
('f7d973bb-b076-4d8b-b0b9-fafbd98c7434', $tr$# 🎵 Friday Review — MAPEH (Grade 5)

- Musical form: verse and chorus

Great job! 🌟$tr$),
('f99d25ad-3291-4a4b-9c45-f1282820221c', $tr$# 💃 MAPEH — Combining Dance, Health, and Art

Grade 5, Week 19! Let's put together what we learned about art, dance, and health. 🎨

## 🔄 Review: What We Learned
- **Music and Art** in the Early Spanish Colonial Period — melody, theater, dance, visual arts
- **Health** — proper use of medicine, negative effects of gateway drugs
- **PE** — rhythmic activities and dances in 2/4 time

## 🎨 Putting Them Together
This week, we will combine these lessons by planning a **wellness activity** that uses dance and art for health.

## 📋 Example of a Wellness Activity
A **dance-for-health session**: use dance steps (from the Early Spanish Colonial period or a modern dance mixer) as exercise, and make a simple piece of visual art (a poster) about why exercise matters and why we should avoid misusing medicine.

## 🧠 Example 1
*Why is dance a good exercise for health?*
- Because it **builds cardiovascular endurance** while being fun.

## 🧠 Example 2
*How can art be connected to a health campaign?*
- By **making visual materials** (posters) that remind people about the proper use of medicine and why exercise matters.

## 💡 Why Is This Important?
Combining dance, health, and art shows how different lessons are **connected** in real life.

Great job! 🌟$tr$),
('fe61796f-65c4-4d11-83b1-07483ffc16b3', $tr$# 🏥 MAPEH — Health: Common Communicable Diseases

Grade 6, Week 21! Let's start a new unit about health and preventing disease! 🏥

## 🔄 Review
We finished the term review of Music, Arts, and PE.

## 🦠 Common Communicable Diseases
**Communicable diseases** spread from one person to another, like the flu, measles, and chickenpox.

## 🔗 Chain of Infection
The **chain of infection** is the process of how a disease spreads: source → way out (portal of exit) → way it is passed on (mode of transmission) → way in (portal of entry) → new host body.

## 💉 Vaccines
A **vaccine** helps protect the body from certain diseases by building immunity.

**Key words:** communicable disease, chain of infection, vaccine, immunity$tr$);

insert into _mapeh_question values
('001156a8-6c9a-45ef-bad5-b4c92c7d3067', $tr$What is the cenaculo?$tr$, $tr$["A play that shows the life of Christ", "A war dance", "A fiesta song", "A musical instrument"]$tr$::jsonb),
('00139d9b-24c0-49f8-a892-db1fcd6ec411', $tr$How is melody connected to musical form?$tr$, $tr$["Melody is used in both the verse and the chorus, but each can have a different tune", "Melody has no connection to musical form", "Melody is only for the chorus", "Melody is only for instruments"]$tr$::jsonb),
('002670fd-52db-461f-91f3-bb384aed4a96', $tr$Why were pictures used as a 'book' for the people back then?$tr$, $tr$["Most people could not read", "They had no paper at that time", "Pictures were cheaper than books", "Pictures were faster to make"]$tr$::jsonb),
('0080a62b-b6b2-4ae1-8add-3793ac56b056', $tr$What is the goal of setting an exact schedule for the wellness day?$tr$, $tr$["So everyone is ready and organized at the right time", "To confuse all the family members", "Setting a schedule has no goal", "To lower the number of people joining"]$tr$::jsonb),
('011bf9fe-893f-40a8-83e2-53bc0d1b40d3', $tr$What did we learn about a healthy family?$tr$, $tr$["Its traits and healthy activities", "Only the country's history", "Only math", "Only science"]$tr$::jsonb),
('01924c6b-2dfc-41ad-93c0-bdc533e104a4', $tr$What is misuse of medicine?$tr$, $tr$["Taking more than the set dose or without permission", "Taking it as the doctor prescribed", "Taking it at the right time", "Reading the label before taking it"]$tr$::jsonb),
('0222d88f-d30d-484f-91f5-8ee180388adb', $tr$What is a beat?$tr$, $tr$["Steady pulse of the music", "A slow song", "A musical instrument", "Title of a song"]$tr$::jsonb),
('022c20d3-bdf9-4598-8bc0-26f0303e0683', $tr$What is a verse in a song?$tr$, $tr$["The part whose words change each time", "The part that is always the same", "The part with no words", "An instrument only"]$tr$::jsonb),
('02b350b8-c6ec-4f25-9fd0-f2bbc830e9ab', $tr$The goal of dancing in sync (together)?$tr$, $tr$["Group unity and skill", "It has no goal", "It causes confusion", "Not part of the festival"]$tr$::jsonb),
('02b932dd-ac2f-4b12-9eaf-99b9021ba3dd', $tr$Why is dance practice important in PE?$tr$, $tr$["It builds skills and coordination", "No benefit", "It makes the body weaker", "Not part of PE"]$tr$::jsonb),
('02fece7c-d8c3-4c0e-ad74-85d73c8a6e07', $tr$Why is teamwork in the group important here?$tr$, $tr$["Everyone needs to move together", "Each one works separately", "Nothing is needed", "Only one person dances"]$tr$::jsonb),
('03095b89-9fc1-46ad-9480-9f955cff1d3a', $tr$Why is it an important topic before the year ends?$tr$, $tr$["It sums up the whole journey of our culture", "It is not important", "It's just the last topic", "Not suitable"]$tr$::jsonb),
('03685662-a7a2-41ac-9d54-938225230844', $tr$What is a social dance mixer?$tr$, $tr$["A dance where the dancers keep changing partners", "A kind of song", "A PE game with no music", "A kind of drawing"]$tr$::jsonb),
('0373f991-eb0f-4920-88ef-61bdf11b7576', $tr$Why is this topic taught in MAPEH?$tr$, $tr$["It is part of taking care of your health and safety", "It has nothing to do with health", "It is only about music", "It is only about dance"]$tr$::jsonb),
('03789ce5-44f6-479d-9365-11a62aa0253e', $tr$What props are used in the Tinikling?$tr$, $tr$["Bamboo poles", "Umbrella", "Oil lamp", "Glass"]$tr$::jsonb),
('03be3520-2d41-4555-96ce-6ce3fb39ed93', $tr$What element of visual arts did we learn?$tr$, $tr$["Rhythm and pattern", "Only numbers", "Only weather", "Only history"]$tr$::jsonb),
('03c55a99-a030-447e-943a-c5fd27181bc3', $tr$Why is melody considered important in a song?$tr$, $tr$["It is the part that is easy to sing and remember", "It has no value", "It is the only part with no sound", "Only instruments use it"]$tr$::jsonb),
('04bb3c23-adb9-4ab3-98d8-43f483b062d9', $tr$Body parts it makes stronger?$tr$, $tr$["Heart, lungs, muscles", "Only hair", "Only nails", "None"]$tr$::jsonb),
('0541bd35-9f15-4316-b665-06ea51462f47', $tr$What should the chorus you write be like?$tr$, $tr$["It repeats and is easy to remember", "It changes each time", "It has no tune", "It is long and complicated"]$tr$::jsonb),
('054cfffc-0522-4bae-97d3-5c3c15018d23', $tr$What is dance exercise?$tr$, $tr$["Exercising using simple dance moves", "A kind of food", "A kind of phone game", "A kind of drawing"]$tr$::jsonb),
('056ea287-f0dd-4327-882f-5b6d914cd140', $tr$Why should safety be thought about when planning the activity?$tr$, $tr$["To prevent accidents and make sure everyone is safe", "It has nothing to do with the activity", "Only to make the game faster", "So there is no need to plan anymore"]$tr$::jsonb),
('057f826c-4ba2-4ca1-bacb-4387776b0e44', $tr$What are fundamental dance steps?$tr$, $tr$["Basic steps in many dances", "A kind of song", "A kind of game", "A kind of drawing"]$tr$::jsonb),
('059ab41e-5be9-4ad6-8949-1df165984f36', $tr$What time signature is used in a social dance mixer?$tr$, $tr$["2/4", "6/8", "9/4", "No time signature"]$tr$::jsonb),
('059e5d8c-ffd0-45a1-96bc-b9df29ebd40b', $tr$What is the time when a child goes through physical, emotional, and social changes on the way to becoming a teenager?$tr$, $tr$["A normal part of growing up", "An illness that must be cured", "Something to be ashamed of", "Something to hide from everyone"]$tr$::jsonb),
('05c83c28-231c-492b-9925-0f0973d800b6', $tr$Why is it important to learn the basic dance steps?$tr$, $tr$["It makes it possible to learn harder dances", "It has no value", "There is no need to learn them", "Only to entertain the teacher"]$tr$::jsonb),
('05e6714b-d9ab-4f95-9c51-746d80ddb0c9', $tr$How can you clap a rhythmic pattern correctly?$tr$, $tr$["Listen first before repeating it", "Just clap any way you like", "Read the song's lyrics", "Buy a new instrument"]$tr$::jsonb),
('05f097e7-e479-4b58-9e07-4d455d10f49c', $tr$What question should you answer when you reflect after the activity?$tr$, $tr$["What did I learn from combining dance, health, and art?", "What is my favorite color in this activity?", "How old am I now?", "What do I want to eat right now?"]$tr$::jsonb),
('062dba5a-87dc-4196-8d75-068249c0a4d6', $tr$Why is contemporary identity seen as an important topic before the year ends?$tr$, $tr$["It sums up the whole journey of Filipino culture through different times", "It is not important", "It is just the last topic", "It is not a suitable topic"]$tr$::jsonb),
('06401aaf-93fa-4b6c-b5fa-89a9a67801e1', $tr$What do we gain from doing the activity instead of only planning it?$tr$, $tr$["Real experience and lessons learned", "Nothing meaningful", "It only slows down the work", "Nothing new is learned"]$tr$::jsonb),
('0647a159-4352-4da2-a694-620d0f22797b', $tr$What is the ready position in net games?$tr$, $tr$["Going back to the middle of the court", "Staying on one side", "Standing close to the net", "Sitting at the back of the court"]$tr$::jsonb),
('06e89f28-4549-49f5-b62b-90f1ae6638e6', $tr$Which is a correct example of a verse?$tr$, $tr$["The part where the story changes each time the song goes on", "The part whose words are always the same", "Just the title of the song", "The music played before the song starts"]$tr$::jsonb),
('0744afa0-ed8a-48b3-9669-4497f5006b51', $tr$Why doesn't the tune have to be perfect?$tr$, $tr$["What matters is sharing the idea", "It always has to be perfect", "A tune is not needed anymore", "It doesn't matter at all"]$tr$::jsonb),
('07d161fe-52d9-433d-b3a0-bca8c902f111', $tr$Link between dance exercise and health?$tr$, $tr$["Both help physical health", "No link", "It is only about music", "No effect"]$tr$::jsonb),
('07daf367-35e5-4982-bce4-ca3eff83526f', $tr$Why shouldn't you take someone else's medicine?$tr$, $tr$["It might not be right or safe for your condition", "It has no effect on anyone", "Other people's medicine is always safe", "You need it to get better right away"]$tr$::jsonb),
('080f8b14-c741-43c1-976f-4419666aa2e3', $tr$What did we learn about changes while growing up?$tr$, $tr$["They are a normal part of growing up, including physical and emotional changes", "They are not normal and should always be a source of shame", "We didn't learn anything about this in this activity", "It is not part of MAPEH in this situation"]$tr$::jsonb),
('085c44f5-aa05-4cab-911c-6273c3a928bb', $tr$Why is coordination important in a 3/4 time dance?$tr$, $tr$["So you move smoothly with the three beats", "It has no value", "Coordination is not needed", "Any movement is correct"]$tr$::jsonb),
('087ac216-2ddc-4f4d-aff9-9a612b60c795', $tr$What should you show while performing?$tr$, $tr$["Confidence and a smile", "Fear and doubt", "Anger at your groupmates", "No interest"]$tr$::jsonb),
('089c284c-5398-4440-9aad-ac38d4493043', $tr$What was theater about during this time?$tr$, $tr$["Religious subjects", "Political subjects", "Science subjects", "Business subjects"]$tr$::jsonb),
('096dca1f-0ca8-4182-b193-399d4b95dfd7', $tr$Why get vaccinated?$tr$, $tr$["Protection against disease", "No benefit", "It causes disease", "It is no longer needed"]$tr$::jsonb),
('097bb4c6-2c2b-45c1-a3c5-a44339f0931d', $tr$Why is it important to choose a modified game for the family wellness day?$tr$, $tr$["So people of all ages can play", "So it is only for children", "So it is only for older people", "There is really no reason"]$tr$::jsonb),
('09bf57e3-14bd-43e1-ae2f-b001d75e50aa', $tr$Which is an example of a random pattern?$tr$, $tr$["Natural spots on a stone", "Checkerboard design", "Repeated triangles in weaving", "Regular stripes on cloth"]$tr$::jsonb),
('0a9ac815-5e24-4c7b-8db7-76b69c2d90f2', $tr$What is melodic direction?$tr$, $tr$["Whether the tune goes up, goes down, or stays level", "How fast the music is", "How loud the sound is", "The instrument being used"]$tr$::jsonb),
('0aea6a57-7f6c-4eda-b613-b83bf0b87319', $tr$What matters most, based on the goal of the activity?$tr$, $tr$["Sharing your idea using musical form", "Making the tune perfect", "Making the song the longest", "Using many instruments"]$tr$::jsonb),
('0aede588-c083-43fa-b968-0171c3934dc1', $tr$Why is taking medicine without an adult's permission not allowed?$tr$, $tr$["The child might not know the right dose or its effects", "There is no danger in it", "Children always know the right medicine", "Permission is not needed"]$tr$::jsonb),
('0b3b9340-dfc8-4bbe-912f-73d6fa61b0c7', $tr$Which games did we learn in PE?$tr$, $tr$["Target and invasion games", "None", "Only one game", "No games"]$tr$::jsonb),
('0b66acaf-9b91-45fe-a18c-25457fc2f3f6', $tr$Why is melody important?$tr$, $tr$["It is easy to sing and remember", "It has no value", "It has no sound", "Only instruments use it"]$tr$::jsonb),
('0b802359-9e90-40e9-9d25-1da09791f5fa', $tr$What skill does this performance prove?$tr$, $tr$["Coordination and teamwork", "Writing skills", "Math skills", "Cooking skills"]$tr$::jsonb),
('0b97ef8e-45fc-4da5-9f27-ac8c53f2a2c9', $tr$What is needed to follow the tempo well?$tr$, $tr$["Coordination and listening to the music", "Ignoring it", "Being alone", "Nothing"]$tr$::jsonb),
('0bc40207-4a4f-479c-b4f2-de34d961d1ff', $tr$Why did most art from this period have a religious theme?$tr$, $tr$["Because the Catholic Church had a big influence", "Because other themes were not allowed then", "Because people knew no other subjects", "Because non-religious art was banned"]$tr$::jsonb),
('0c9eb453-839a-4d6e-90c5-1489af04108b', $tr$Who is responsible for reading the label before buying?$tr$, $tr$["The shopper", "Only the seller", "No one", "Only the product maker"]$tr$::jsonb),
('0d220010-2822-45cf-a2cc-2c370814bcd6', $tr$What are the 8Rs?$tr$, $tr$["Ways to cut down on trash", "Eight new diseases", "Eight vaccines", "Eight exercises"]$tr$::jsonb),
('0d7aef20-080e-49cf-9b01-fc3cdae3fa95', $tr$What do the 8Rs mean?$tr$, $tr$["Ways to cut down on trash in the environment", "Eight new diseases", "Eight vaccines", "Eight kinds of exercise"]$tr$::jsonb),
('0d912069-6b9c-4a9e-9323-6e8895e3e593', $tr$What is the cenaculo?$tr$, $tr$["A play that shows the life of Christ", "A war dance", "A fiesta song", "A musical instrument"]$tr$::jsonb),
('0d92adc1-19d8-4af7-a71b-f2aa447d5e5d', $tr$What does the top number in a time signature show?$tr$, $tr$["How many beats are in each measure", "What note gets one beat", "How many singers there are", "How long the whole song is"]$tr$::jsonb),
('0dc40d6a-bbd9-4e59-a323-0a6731877163', $tr$A child's right to health?$tr$, $tr$["Access to clean food and water", "The right to skip school", "The right not to sleep", "None"]$tr$::jsonb),
('0de5b56f-5aa5-461f-8866-3a35034d0d34', $tr$Why are gateway drugs dangerous at a young age?$tr$, $tr$["A growing body and brain are affected faster", "No effect on kids", "Safe if not every day", "Not a real danger"]$tr$::jsonb),
('0e3bf13f-336a-4542-bae4-5b0ceb3db483', $tr$Why are different dances part of MAPEH?$tr$, $tr$["They support health and the arts", "No purpose", "Not related to education", "Only for adults"]$tr$::jsonb),
('0e744f6c-c14a-4c63-8cde-9c00b642e4a1', $tr$What is rhythm in the art of dance?$tr$, $tr$["Repeated movements or sounds", "Color of the clothes", "Name of the dance", "Number of dancers"]$tr$::jsonb),
('0e81198b-50ea-4af8-a380-8ee46fcc5080', $tr$Which periods did we learn about in Music & Arts?$tr$, $tr$["Revolutionary and American Period", "None", "Only one period", "We learned nothing"]$tr$::jsonb),
('0e966795-ec6c-478f-b64c-2b7df0ff47dd', $tr$Why is food literacy taught in MAPEH?$tr$, $tr$["To learn to choose healthy food", "It has no purpose", "It is not linked to health", "It is only for adults"]$tr$::jsonb),
('0ef22fcb-76de-4bc8-9785-644f88a362cd', $tr$Which is an example of a communicable disease?$tr$, $tr$["Flu", "Diabetes", "Osteoporosis", "Asthma"]$tr$::jsonb),
('0ef657c7-c35f-4b09-a1b6-1696c5ffa674', $tr$Your team lost a close game. What shows true sportsmanship?$tr$, $tr$["Congratulate the winners with respect", "Blame the referee for the loss", "Leave right away without saying goodbye", "Blame your weaker teammates"]$tr$::jsonb),
('0f1d4d6c-3f3c-438a-8450-f135ee3643d7', $tr$What happens if there is no proper sanitation?$tr$, $tr$["Higher risk of disease", "No effect", "Everyone is healthier", "Diseases disappear"]$tr$::jsonb),
('0f6afa91-c83c-4342-960f-7676c6786fd4', $tr$What is a manipulative skill?$tr$, $tr$["Catching a ball", "Running on the court", "Walking along the side", "Sliding on the floor"]$tr$::jsonb),
('0f7d2baa-93af-4064-b204-aac967300d73', $tr$According to the Visual Arts strand, what is the first step before drawing or painting?$tr$, $tr$["Observing your surroundings", "Selling the work right away", "Throwing away materials", "Forgetting the subject"]$tr$::jsonb),
('0f9d5be2-86a3-4cf3-a404-8388dd0ad05e', $tr$What skill was shown in the culminating dance performance?$tr$, $tr$["Coordination and teamwork", "Writing skills", "Math skills", "Cooking skills"]$tr$::jsonb),
('1041c11e-22a4-4bd9-a490-0e1221c2946e', $tr$What are systems of writing melody?$tr$, $tr$["Ways of writing down the tune", "Ways of dancing", "Ways of drawing", "Ways of playing"]$tr$::jsonb),
('110fd4ba-c318-45eb-abdb-89f4d066e678', $tr$In Tumbang Preso, what do you knock down?$tr$, $tr$["The can", "The ball", "The stick", "The stone"]$tr$::jsonb),
('1110426d-ed32-4d55-8e43-52ab19249776', $tr$What parts of the body does dance exercise make stronger?$tr$, $tr$["Heart, lungs, and muscles", "Only hair", "Only nails", "None of these"]$tr$::jsonb),
('11426b08-11c4-4c8e-a78e-ecdb7bb37bb4', $tr$What did we learn about music this term?$tr$, $tr$["Rhythm and tempo", "Only the history of computers", "Only math", "We learned nothing"]$tr$::jsonb),
('123f635c-d313-4549-98fd-1058fac49a91', $tr$What is a family wellness day?$tr$, $tr$["A day of healthy activities for the whole family", "A day spent only shopping", "A day spent only sleeping", "A day spent watching TV"]$tr$::jsonb),
('124f563c-2092-4cc3-be02-7ba254415445', $tr$Why shouldn't you take someone else's medicine?$tr$, $tr$["It might not be right for your condition", "It has no effect", "It is always safe", "You need it to get better"]$tr$::jsonb),
('130fc48d-c537-467f-be83-4d1652115429', $tr$What is movement exploration?$tr$, $tr$["Trying out different body movements", "A kind of food", "A kind of song", "A kind of toy"]$tr$::jsonb),
('131dd42d-3768-441a-843b-b267f2ec1f1f', $tr$What is OPM?$tr$, $tr$["Original Pilipino Music", "A kind of dance", "A country", "A kind of food"]$tr$::jsonb),
('135b018b-ee0d-4bef-8ef9-1f9082899f7a', $tr$What did we learn about the art and rituals of our ancestors?$tr$, $tr$["Rhythm/pattern and movement seen in native rituals", "We really learned nothing about it", "Just one kind of outdoor game", "Just one kind of cooked food"]$tr$::jsonb),
('1376e515-b33f-4806-b09c-8950bce3c356', $tr$Which one is an example of a target game?$tr$, $tr$["Bowling", "Football", "Basketball", "Frisbee"]$tr$::jsonb),
('137c0eb3-637d-4935-a291-ad6b17827191', $tr$Why is it important to go back to the ready position after every shot?$tr$, $tr$["To be ready for the next shot", "To rest for a long time", "To talk with a teammate", "To change equipment"]$tr$::jsonb),
('138af961-a681-41de-9c6b-3a5e2464e238', $tr$How do fair rules help family health?$tr$, $tr$["It brings respect and stability to the home", "It makes life hard for children", "It has nothing to do with health", "It causes fights"]$tr$::jsonb),
('13b0437d-ee4a-4d19-84eb-17095b81500a', $tr$Why is it important to modify these games for the family?$tr$, $tr$["So people of all ages can play and stay healthy", "So they are harder for everyone to play", "There is no reason for it", "So children are no longer allowed to play"]$tr$::jsonb),
('140a252b-b030-42c2-b141-316248a21912', $tr$What health topic about medicine did we learn?$tr$, $tr$["Proper use versus misuse of medicine", "History of medicine in the Philippines", "Prices of medicine at the drugstore", "Names of medicines only"]$tr$::jsonb),
('1416fa82-dca1-4c37-9a7a-ca339b6d26c6', $tr$Which medium puts color on a canvas or surface?$tr$, $tr$["Painting", "Drawing", "Engraving", "Observing"]$tr$::jsonb),
('14aef75d-3e2d-4c36-a140-8bf3a3f6b7f7', $tr$Which is the faster tempo?$tr$, $tr$["2/4 time", "3/4 time", "Both are the same", "There is no fast tempo"]$tr$::jsonb),
('14dc489b-4e9a-42e8-9f2e-1d3956f1c588', $tr$Props used in the Pandanggo sa Ilaw?$tr$, $tr$["Oil lamps on the hands and head", "Only bamboo poles", "Only an umbrella", "No props"]$tr$::jsonb),
('150e75eb-7304-4e28-ae05-3d20a38165c7', $tr$What is one negative effect of misusing medicine that we learned?$tr$, $tr$["It can harm the body's health", "Its effect is always good", "It has no effect at all on the body", "It only makes the body stronger"]$tr$::jsonb),
('1516e7d6-1ad9-466d-a276-313949975b4c', $tr$What happens if you don't check the label before buying?$tr$, $tr$["You might buy a wrong or unsuitable product", "Nothing will happen", "The product is always right", "Shopping is just faster"]$tr$::jsonb),
('1655942a-6b2f-402d-b268-870d78cccaeb', $tr$What is a chorus in a song?$tr$, $tr$["The part that repeats and is usually remembered best", "The part that changes each time", "The part with no tune", "An instrument only"]$tr$::jsonb),
('16b54719-5ec3-427d-aa03-2e0adb98b285', $tr$New PE unit this week?$tr$, $tr$["Dance Exercise", "Sports Officiating", "Weightlifting", "Swimming"]$tr$::jsonb),
('16b735e4-3e82-41ca-99e6-d863aa5dc0a7', $tr$What is endurance?$tr$, $tr$["How long you can keep going in an activity", "How quickly you change direction", "How steady your body stays in one position", "How accurately you hit a target"]$tr$::jsonb),
('16ec3cd4-f39e-4875-b6cb-a0f6d5d88d04', $tr$How is the tempo of 3/4 different from 2/4?$tr$, $tr$["3/4 is gentler", "They are just the same", "3/4 is faster", "There is no difference"]$tr$::jsonb),
('174b8549-0699-457c-8c38-7b20eeca49c8', $tr$What happens if people don't follow the steps against communicable diseases?$tr$, $tr$["The disease spreads faster", "It has no effect", "Everything gets better", "The disease goes away by itself"]$tr$::jsonb),
('17ff93be-e759-4ab8-b1e9-03b8ebd725b4', $tr$A benefit of dance exercise?$tr$, $tr$["Improves coordination and balance", "No benefit", "Weakens the body", "Makes you tired"]$tr$::jsonb),
('183758cd-f48a-4016-b537-a5c83e6d8553', $tr$What medium was used in visual arts during this time?$tr$, $tr$["Painting and sculpture", "Digital pictures", "Movies", "Music only"]$tr$::jsonb),
('185897bc-39e9-410f-9db8-5ac12a92970f', $tr$Type of dance in 3/4 time?$tr$, $tr$["Waltz", "Polka", "Hip-hop", "Breakdance"]$tr$::jsonb),
('18936f4e-0d88-490d-9db6-c50dfa7f48fe', $tr$How is contemporary art related to the traditional dance we learned before?$tr$, $tr$["Both are ways of expressing Filipino identity in different times", "The two have no connection", "One is only about science", "One is about math"]$tr$::jsonb),
('18e8683d-4d09-4c64-a534-56aac228426a', $tr$Where is the Dinagyang held?$tr$, $tr$["Iloilo", "Cebu", "Aklan", "Manila"]$tr$::jsonb),
('19c985fb-df94-4204-809d-974a465f6de8', $tr$Props used in the Tinikling?$tr$, $tr$["Bamboo poles", "Umbrella", "Oil lamp", "Glass"]$tr$::jsonb),
('19f61831-c17c-4653-8cb3-344647f8adab', $tr$Why is this topic taught in MAPEH?$tr$, $tr$["It is part of taking care of your health", "It has nothing to do with health", "It is only about music", "It is only about dance"]$tr$::jsonb),
('1a290803-d1f7-48f8-9bde-a632263da269', $tr$An example of a communicable disease?$tr$, $tr$["Flu", "Diabetes", "Osteoporosis", "Asthma"]$tr$::jsonb),
('1a562d5b-11f0-4b40-a5c0-c6facc605be0', $tr$What can misusing medicine cause?$tr$, $tr$["Serious harm to the body", "Always a good effect", "Never any effect", "Getting better automatically"]$tr$::jsonb),
('1b1337ea-986e-49ce-8e6c-48d0b3b2a2e3', $tr$Why not believe every ad?$tr$, $tr$["Not all are accurate or true", "All are always right", "No reason", "Ads are not important"]$tr$::jsonb),
('1b5363aa-567e-4d6f-a04b-6cd5a311246e', $tr$Why are these native dances linked to beliefs?$tr$, $tr$["They are done as prayer or celebration", "They are done only for tourists", "They have nothing to do with religion", "They are done only as sports"]$tr$::jsonb),
('1b92214f-93f5-48d4-adac-2dbf4de45853', $tr$Where is the Ati-Atihan held?$tr$, $tr$["Aklan", "Cebu", "Iloilo", "Manila"]$tr$::jsonb),
('1c53db5a-76aa-4355-8ca3-a3286f4c2cdc', $tr$What did we learn about changes while growing up?$tr$, $tr$["They are a normal part of growing up, including physical and emotional changes", "They are not normal and should always be a source of shame", "We didn't learn anything about this in this activity", "It is not part of MAPEH in this situation"]$tr$::jsonb),
('1c944047-3280-4ac9-987b-3eafb22e845b', $tr$A school is putting on a play about the Sinulog. What is important to include in their performance?$tr$, $tr$["The repeated steps that follow the music", "Just a random dance", "A dance with no music", "A dance with no meaning"]$tr$::jsonb),
('1d104564-cee6-4480-a88c-3920455fed2f', $tr$What do we call an activity that puts together the skills learned at the end of a unit?$tr$, $tr$["Culminating activity", "Opening lesson", "Just a test", "Just a review"]$tr$::jsonb),
('1d73004b-d835-44cf-9dde-41de1bdbc5cc', $tr$What do cigarettes do to the body?$tr$, $tr$["They damage the lungs and cause addiction", "They make the lungs stronger", "No effect on the body", "They improve health"]$tr$::jsonb),
('1d89b215-03c9-46f4-9fc5-e98c24d38a64', $tr$What is the goal of the culminating dance performance?$tr$, $tr$["To show coordination and teamwork", "To beat the other groups", "It has no goal", "Just to entertain the teacher"]$tr$::jsonb),
('1db27850-2d7e-4383-add6-f836013d2845', $tr$What is engraving?$tr$, $tr$["Carving a design into a hard surface", "Drawing with a pencil only", "Painting with watercolor", "Selling artwork"]$tr$::jsonb),
('1e163ece-adcc-4fea-8119-22f34fb11f20', $tr$Who is honored in the Sinulog?$tr$, $tr$["Santo Niño", "Ina ng Kalamba (Our Lady of Kalamba)", "Rizal", "Bonifacio"]$tr$::jsonb),
('1e5ba86f-008a-4dfa-91e5-66ddd47135ce', $tr$Why keep our roots in tradition?$tr$, $tr$["It gives identity in the middle of change", "It is not important", "Forget about tradition", "Roots are not needed"]$tr$::jsonb),
('1edc1298-f22d-4c93-b12e-5b86f37d50ec', $tr$Why is preventing disease in the community important?$tr$, $tr$["To protect everyone's health", "No effect", "Only a personal issue", "Not related"]$tr$::jsonb),
('1efe076f-c834-4efd-a317-ca228817f081', $tr$How does dance exercise help coordination?$tr$, $tr$["You need to keep up with the steps and tempo of the music", "Coordination is not needed here", "It has nothing to do with coordination", "You just stand there"]$tr$::jsonb),
('1efe878d-54ec-433a-945c-ea43f7a9a9c5', $tr$What is the goal of making a poster about why exercise matters?$tr$, $tr$["To remind others why an active lifestyle is important", "Just to decorate the classroom", "This activity has no goal", "To make class time go faster"]$tr$::jsonb),
('1f09a284-95ba-4938-8659-06c5b818fb67', $tr$What is the step in the Sinulog?$tr$, $tr$["Two steps forward, one step back", "Only one step back", "No steps are done", "Only three steps forward"]$tr$::jsonb),
('201ead24-7b88-4edb-93ee-92c6304ac6ee', $tr$Why is it important to modify these games for the family?$tr$, $tr$["So people of all ages can play and stay healthy", "So they are harder for everyone to play", "There is no reason for it", "So children are no longer allowed to play"]$tr$::jsonb),
('20470936-dde9-4ee2-812d-7773223388cc', $tr$How are legend dances linked to Filipino culture?$tr$, $tr$["They show the rich storytelling tradition of Filipinos", "They have no link to culture", "They come from another country", "They are not part of the culture"]$tr$::jsonb),
('21219eca-b273-4f86-b91e-be01648162e5', $tr$What should you show while performing?$tr$, $tr$["Confidence and a smile", "Fear and doubt", "Anger at your groupmates", "No interest"]$tr$::jsonb),
('213e69ef-989f-4075-af86-98ecc025c6fc', $tr$Why is it important to think about safety in a wellness activity?$tr$, $tr$["To avoid accidents during the activity", "It has nothing to do with the activity", "Just to make the activity faster", "There is no need to think about it"]$tr$::jsonb),
('21776864-796f-4562-aa1b-c298da495b08', $tr$What is the difference between striking/fielding games and net/wall games?$tr$, $tr$["Striking/fielding has hitting and running; net/wall has a barrier", "Both have no ball", "Both are only played while sitting", "There is no difference between the two"]$tr$::jsonb),
('217eb051-e5c4-43c8-8b8c-f1884c86d0f5', $tr$What is an example topic for a song?$tr$, $tr$["Love for family", "Business law", "Economics", "Running the government"]$tr$::jsonb),
('21b7a1bc-439d-4a4b-89ff-172adf37876f', $tr$What was the main subject of visual arts during this time?$tr$, $tr$["Saints and scenes from the Bible", "Animals in the forest", "Views of the beach", "Pictures of kings long ago"]$tr$::jsonb),
('21db0274-1467-4154-a4cb-a42ec1b48c42', $tr$Why is it important to include the whole family in health activities?$tr$, $tr$["It makes bonds stronger while improving health", "It is pointless if everyone is together", "It is better to do it alone", "The family is not needed for this activity"]$tr$::jsonb),
('222b0266-d083-4ab6-9532-a5ccbc93860a', $tr$What are systems of writing melody?$tr$, $tr$["Ways of writing down the tune", "Ways of dancing", "Ways of drawing", "Ways of playing"]$tr$::jsonb),
('22d6182c-9034-468b-8cb1-f45972b30cc8', $tr$What is speed as a fitness component?$tr$, $tr$["How fast you move", "How tough your body is", "How strong your muscles are", "How long you can hold your breath"]$tr$::jsonb),
('22f3a9b0-1df8-490b-876b-c9fd61324657', $tr$What is the Pahiyas?$tr$, $tr$["A celebration to give thanks for the harvest", "Only a war dance", "Only a funeral ritual", "Only a graduation dance"]$tr$::jsonb),
('230003e4-7cf7-4d4f-85d0-f76878e3bffd', $tr$Why is it important to combine dance, health, and art in one activity?$tr$, $tr$["It shows how different lessons are connected in life", "It has no meaning at all in our real lives", "It only makes learning harder for kids", "It is done only to get a grade"]$tr$::jsonb),
('2303c335-7ba7-4cb1-82e6-c72df9846d21', $tr$Why are these native dances linked to beliefs?$tr$, $tr$["They are done as prayer or celebration", "They are done only for tourists", "They have nothing to do with religion", "They are done only as sports"]$tr$::jsonb),
('23717b6b-c3b7-4b41-85ce-d2935897bdd7', $tr$If you want to share the main message of your own song, which part would you repeat?$tr$, $tr$["Chorus", "Verse", "Introduction only", "No part"]$tr$::jsonb),
('23846404-6b5a-4071-938f-a429dc154b3b', $tr$When are the pasyon and senakulo still performed today?$tr$, $tr$["Every Holy Week (Semana Santa)", "Every Christmas", "Every birthday", "Every graduation"]$tr$::jsonb),
('23c3cedb-c863-4e9d-ae3f-8a24fb520377', $tr$Why learn to dance in different time signatures?$tr$, $tr$["It widens your skills", "It has no value", "No need to learn it", "Just to entertain the teacher"]$tr$::jsonb),
('23caa90d-6539-44f2-833d-bbcaf69c2490', $tr$In which game do you throw a ball at playmates inside a circle?$tr$, $tr$["Tamaang-Tao", "Tumbang Preso", "Calahoyo", "Bati-Cobra"]$tr$::jsonb),
('23dc2393-fa57-44f5-8cd5-ce848a3772d5', $tr$What is the difference between striking/fielding games and net/wall games?$tr$, $tr$["Striking/fielding has hitting and running; net/wall has a barrier", "Both have no ball", "Both are only played while sitting", "There is no difference between the two"]$tr$::jsonb),
('23f7b40e-3dee-40c8-b535-98e57143a433', $tr$What time signature did we learn for rhythmic activities?$tr$, $tr$["2/4 time", "10/4 time", "1/8 time", "100/4 time"]$tr$::jsonb),
('24bbd625-22a6-488d-bb20-134ba930a784', $tr$Why know your rights and responsibilities?$tr$, $tr$["To be responsible when shopping", "It has no value", "Only for adults", "No effect"]$tr$::jsonb),
('24c97474-4c34-4054-bf42-f5617ded4b1b', $tr$Why is it important to know your rights and responsibilities as a consumer?$tr$, $tr$["It helps you be responsible and protected when shopping", "It has no value", "It is only for adults", "It has no effect"]$tr$::jsonb),
('25fbf23d-108f-4792-800c-4b8cd5f854a7', $tr$Why teach traditional dance in MAPEH?$tr$, $tr$["To value and keep our culture alive", "It has no purpose", "Only for older people", "Not related to education"]$tr$::jsonb),
('2617bd45-e8b9-48ff-8a76-7790c5b441a2', $tr$Why is art used to show identity?$tr$, $tr$["A creative way to show culture", "It is not important", "Not related to identity", "Not related to culture"]$tr$::jsonb),
('2620dd29-ab5f-4c81-b152-709420d33f76', $tr$What is movement in art?$tr$, $tr$["How the body moves", "The color of the costume", "Only the sound of the music", "The number of people watching"]$tr$::jsonb),
('263b51e9-cf51-442f-b300-5016f144de65', $tr$Why keep traditional dances alive?$tr$, $tr$["Part of our national identity", "They are not important", "No longer needed today", "Not part of the culture"]$tr$::jsonb),
('2642990d-8f27-4c43-9312-f57266c87541', $tr$Why is it important to go back to the ready position after every shot?$tr$, $tr$["To be ready for the next shot", "To rest for a long time", "To change equipment", "To talk with a teammate"]$tr$::jsonb),
('264f561d-393e-4770-9772-711f95acddfb', $tr$What is the conflict in a play?$tr$, $tr$["The problem or fight in the story", "The ending of the story", "The introduction of the characters", "The title of the play"]$tr$::jsonb),
('26ac37da-968e-405d-9a9d-33c67ad82e84', $tr$What does playing these games bring to the family?$tr$, $tr$["Physical health and stronger bonds", "No time for each other", "Only more expenses", "No effect on health"]$tr$::jsonb),
('27029714-6bd5-4981-8ad0-598d9d10ead5', $tr$What should you do when you feel pressured to use them?$tr$, $tr$["Ask a parent or teacher for help", "Just go along with it", "Hide it from everyone", "Do it secretly"]$tr$::jsonb),
('2707f012-1a72-4103-9719-f14b05b2a461', $tr$What is the Pasyon?$tr$, $tr$["It is sung during Holy Week", "A fiesta dance", "A musical instrument", "A type of clothing"]$tr$::jsonb),
('2753a933-d7ae-46bf-82fd-bb4122d44865', $tr$What is one example of a wellness activity we studied?$tr$, $tr$["A dance-for-health session with visual art", "A math exam", "A letter to write to a parent", "An activity about farming"]$tr$::jsonb),
('27a93715-f8e2-41db-b437-cba015042b95', $tr$Which fitness component means keeping the body steady?$tr$, $tr$["Balance", "Speed", "Agility", "Endurance"]$tr$::jsonb),
('27d66b54-a507-4d88-87d3-6205036a23b6', $tr$Who should a child go to with questions about the changes they are going through?$tr$, $tr$["A trusted parent or older adult", "Any stranger", "No one, just keep it hidden", "A classmate who doesn't know either"]$tr$::jsonb),
('2804ff76-7e16-40ad-8d57-814b5e95cad3', $tr$A family held a dance-for-health session every Saturday. What does this show?$tr$, $tr$["They value health and family bonding", "No interest in health", "Neglecting the activity", "Exercise has no value"]$tr$::jsonb),
('29146865-0585-4671-b28d-d620dc5b5822', $tr$What is a consumer's right to choose?$tr$, $tr$["To choose what you want to buy", "They have no right to choose", "They should buy only one product", "It is not a right"]$tr$::jsonb),
('296371b7-7107-4e97-bb5b-fdb07a3109f7', $tr$What was the theme of plays during the Early Spanish Colonial Period?$tr$, $tr$["Miracles and faith", "Modern science", "World wars", "Sports"]$tr$::jsonb),
('2a0418b3-c684-4ed5-991d-b1cb474134ca', $tr$Who is responsible for a child's right to health?$tr$, $tr$["Family, community, government", "No one", "Only the child", "Only strangers"]$tr$::jsonb),
('2a18b64d-4f03-4f7d-8e09-e810e3819e5a', $tr$How does high self-esteem help a child?$tr$, $tr$["It helps them stay true to their values", "They become easy to influence", "They lose their own opinion", "They always doubt themselves"]$tr$::jsonb),
('2a2aa694-0b5c-465b-89da-446908cc4189', $tr$Why does a rhythmic dance pattern match the time signature?$tr$, $tr$["So people stay in time with the music", "To make the dance faster", "To make the sound louder", "They have nothing to do with each other"]$tr$::jsonb),
('2a5527f5-e10e-4b76-bc74-f54f3eced33e', $tr$Which is an example of an activity that improves family health?$tr$, $tr$["Gardening together", "Watching television alone", "Avoiding all family members", "Sleeping all day"]$tr$::jsonb),
('2a6139f6-91c3-40c5-b8b5-fbdc8a39ec38', $tr$Why is it important to read a medicine's label before taking it?$tr$, $tr$["To know how to use it correctly and its dose", "You don't need to read the label", "The label is only decoration", "The label is only for grown-ups"]$tr$::jsonb),
('2aa2b0d1-a705-432c-a5e7-c394f613facc', $tr$How is it connected to the dance exercise we learned before?$tr$, $tr$["Both use movement and music", "No connection", "One is about science", "One is about math"]$tr$::jsonb),
('2b25c152-25d0-471d-abfa-2fa3bf191c81', $tr$Which is an example of a random pattern?$tr$, $tr$["Natural spots on a stone", "Checkerboard design", "Repeated triangles in weaving", "Regular stripes on cloth"]$tr$::jsonb),
('2b9eddf3-ede5-470e-b423-c3a4003202d6', $tr$A consumer's right to complain?$tr$, $tr$["If the product is damaged", "Even with no reason", "It is not a right", "Only for business owners"]$tr$::jsonb),
('2bd79682-8ad0-49f3-a217-def095dce0ef', $tr$How many beats are in each measure in a 3/4 time signature?$tr$, $tr$["3 beats", "4 beats", "2 beats", "6 beats"]$tr$::jsonb),
('2c013f42-bef5-4fa7-ada0-1576a849221d', $tr$Why is this week important for Term 2?$tr$, $tr$["It is the last week of Term 2 for MAPEH", "It is only the first week", "It has no value", "It is not part of Term 2"]$tr$::jsonb),
('2c09e255-f753-4238-968e-98fde452ff20', $tr$Who is a well-known composer of Filipino classical music?$tr$, $tr$["Nicanor Abelardo", "Andres Bonifacio", "Jose Rizal", "Emilio Aguinaldo"]$tr$::jsonb),
('2c26a864-7466-4376-96d0-1374e414489c', $tr$Which is an example of European influence in dance?$tr$, $tr$["More formal steps, like partner dances", "Just free movements", "No structure at all", "Only native movements"]$tr$::jsonb),
('2c74e6ef-5d0e-4ffe-9b18-bbe27e460f88', $tr$Why is it important to study the visual arts of the past?$tr$, $tr$["It helps us understand the culture of our ancestors", "It has no meaning at all today", "It is done only for fun", "It is not really part of our history"]$tr$::jsonb),
('2cd12edf-7048-4f8e-82dc-b1fa7d684930', $tr$What is a chorus?$tr$, $tr$["The part that repeats", "The part that changes each time", "The part with no tune", "An instrument only"]$tr$::jsonb),
('2d21d9cf-4a78-47be-ba90-48e84f0667de', $tr$Why are they called 'gateway' drugs?$tr$, $tr$["They can be the start of using more dangerous drugs", "They are safe", "They are just a kind of gate", "They are banned only for adults"]$tr$::jsonb),
('2d3bda7f-acab-4e50-a201-a89c7eaa038f', $tr$Link between food literacy and consumer health?$tr$, $tr$["Both help with smart choices", "No link", "Only about taste", "Not related to food"]$tr$::jsonb),
('2d682a66-8cef-4d44-8984-451f27d1b3c9', $tr$What is binary form in music?$tr$, $tr$["Two parts (A-B)", "Only one part", "Three parts", "No form at all"]$tr$::jsonb),
('2daa6701-7445-4a8a-b030-bce588b0e9dc', $tr$Why is it important to stress the correct beat count in 2/4 time?$tr$, $tr$["To follow the music exactly", "It has nothing to do with music", "As long as you move, it's fine", "The beat count doesn't matter"]$tr$::jsonb),
('2dfd13e2-9c89-4c08-b4a3-e973ae32e0ea', $tr$What is an example of a fundamental dance step?$tr$, $tr$["Touch step", "Reading", "Writing", "Swimming"]$tr$::jsonb),
('2e8e5a9b-ff94-4a9c-8ba9-a63e70ea2504', $tr$What did dances of this time secretly express?$tr$, $tr$["Love for the country", "Only sadness", "Only happiness", "They had no meaning"]$tr$::jsonb),
('2e9ff9eb-ba94-4e7f-8565-fff7fc5d653e', $tr$Why is it important to practice what we learned about health and cleanliness?$tr$, $tr$["It helps us live in a healthy and responsible way", "It is pointless in life today", "It is only done for grades", "It is not really important in this activity"]$tr$::jsonb),
('2ebf4e0a-688b-42d2-a97f-b713867dafcc', $tr$Why is it important to know musical form?$tr$, $tr$["It helps us understand the song's message", "It has nothing to do with understanding", "It is only for musicians", "It is only for instruments"]$tr$::jsonb),
('2f4b0afa-d816-4b36-9d99-a6b6b2461f5b', $tr$What is musical form?$tr$, $tr$["The way the parts of a song are arranged", "How wide a voice's range is", "The number of instruments", "The sound of a guitar only"]$tr$::jsonb),
('2f89ad3b-0f98-4e2a-947f-ec046d3c4a9a', $tr$What period of music and art did we study earlier?$tr$, $tr$["Early Spanish Colonial Period", "American period", "Japanese period", "Present day"]$tr$::jsonb),
('2f8df11e-a9ee-4996-aa5f-21717859573a', $tr$Why is a lot of native music linked to beliefs?$tr$, $tr$["It is used in community rituals and celebrations", "It has nothing to do with people's lives", "It was made only by children", "It was written only for tourists"]$tr$::jsonb),
('3005aee4-0dc6-4ff4-bf54-4798335ff2c9', $tr$Which two tempos were put together?$tr$, $tr$["2/4 and 3/4 time", "4/4 and 6/8 time", "1/4 and 5/4 time", "None"]$tr$::jsonb),
('30276c06-b02c-4350-a869-cc66055075e2', $tr$What is the time when a child goes through physical, emotional, and social changes on the way to becoming a teenager?$tr$, $tr$["A normal part of growing up", "An illness that must be cured", "Something to be ashamed of", "Something to hide from everyone"]$tr$::jsonb),
('302ed5d0-f214-4aac-a111-221915777af4', $tr$Why is it important to keep traditional dances alive?$tr$, $tr$["They are part of our national identity", "They are not important", "They are no longer needed today", "They are not part of the culture"]$tr$::jsonb),
('30548bc5-2475-4236-a6ce-ba13d07cd42e', $tr$Example of a protein?$tr$, $tr$["Fish or eggs", "Rice", "Fruit", "Water"]$tr$::jsonb),
('30a015d5-b167-4c96-8df6-5485a5014c19', $tr$What are net/wall games?$tr$, $tr$["Games with a barrier between the two sides", "Games with no rules", "Games with no opponent", "Games played only in water"]$tr$::jsonb),
('30ef8efd-43fd-4233-b837-38844656dfe6', $tr$Why is everything we covered in MAPEH this term important?$tr$, $tr$["It gives balanced growth in arts, health, and physical skills", "Only one of these should be studied", "It is pointless in a child's life today", "It is only done for fun in this activity"]$tr$::jsonb),
('326e9033-52e6-4bfc-a1b5-089602e2336e', $tr$In Calahoyo, where do you send the ball?$tr$, $tr$["Into a hole in the ground", "To the top of a pole", "Inside a fence", "Into a playmate's hand"]$tr$::jsonb),
('327022ee-742d-407a-b6d7-a13bbc3dcd92', $tr$Why is jumping important?$tr$, $tr$["It is an example of a movement to try", "It is not linked to PE", "It is not a real movement", "It is not included in PE"]$tr$::jsonb),
('32bd0be7-e4e8-4f25-a0fd-d6f2b3adf81c', $tr$A family held a dance-for-health session every Saturday. What does this show?$tr$, $tr$["They value health and family bonding", "No interest in health", "Neglecting the activity", "Exercise has no value"]$tr$::jsonb),
('33076d33-8732-447e-b157-4fb001df3184', $tr$What new MAPEH unit started this week?$tr$, $tr$["Contemporary Filipino Identity", "Music of the Revolution", "American Dances", "Only PE"]$tr$::jsonb),
('337b9661-0f2b-40fb-8de5-b5993836d7fa', $tr$Why are animal diseases connected to human diseases?$tr$, $tr$["Diseases can pass from animals", "There is no connection", "Animals don't get sick", "People don't catch diseases"]$tr$::jsonb),
('33cb4a02-3209-4849-a4fe-5a9462e5e247', $tr$What happens if you don't follow steps against disease?$tr$, $tr$["It spreads faster", "No effect", "It's better", "It goes away right away"]$tr$::jsonb),
('34052a90-0244-4f46-b058-d01fcdbeb015', $tr$What is space awareness?$tr$, $tr$["Knowing where your body is moving", "How fast your body moves", "How hard you hit the ball", "The number of points in the game"]$tr$::jsonb),
('346fb9ce-5f90-4542-911e-4c8503f29df3', $tr$What concept did we learn in PE — Invasion Games?$tr$, $tr$["Agility, balance, and coordination", "Only history", "Only math", "We learned nothing"]$tr$::jsonb),
('34722e6e-9331-422b-9935-fd19b8618556', $tr$When are the pasyon and senakulo still performed today?$tr$, $tr$["Every Holy Week (Semana Santa)", "Every Christmas", "Every birthday", "Every graduation"]$tr$::jsonb),
('3472b5c5-e173-4d39-a8e7-ff05c069d6eb', $tr$How does history influence art?$tr$, $tr$["Through the events and beliefs of the time", "None", "No connection", "Just random"]$tr$::jsonb),
('34dea8a0-8d83-4df7-aca6-44b9fe8c0faa', $tr$What is agility?$tr$, $tr$["The ability to move fast and change direction", "The ability to stay quiet", "The ability to eat fast", "The ability to sleep deeply"]$tr$::jsonb),
('34f6070e-a19a-4a80-8346-5606d96c0cd3', $tr$How does it help coordination?$tr$, $tr$["You keep up with the steps and tempo", "Coordination is not needed", "Not related", "You just stand there"]$tr$::jsonb),
('3540870f-f8ea-42ac-8f44-cc325d80623d', $tr$Why is it important to keep traditional dances alive?$tr$, $tr$["They are part of our national identity", "They are not important", "They are no longer needed today", "They are not part of the culture"]$tr$::jsonb),
('3556f617-0894-4288-85c6-9b60b6d5421f', $tr$Why are these dances taught in MAPEH?$tr$, $tr$["To build body movement and social skills", "Just to entertain the teacher", "It has no reason", "To stop studying other subjects"]$tr$::jsonb),
('3560805d-9d6a-456f-b8a2-0c9a213c3c17', $tr$Benefit of practicing dance?$tr$, $tr$["Physical skills and coordination", "No benefit", "It makes the body weaker", "It stops you from moving"]$tr$::jsonb),
('3599815a-65f2-482e-b91e-99dd949fc3ff', $tr$Which is an EXAMPLE of proper use?$tr$, $tr$["Taking it as prescribed at the right time", "Taking an extra dose to get better faster", "Taking a sibling's medicine", "Taking it without reading the label"]$tr$::jsonb),
('35b37a66-0498-41df-8e1f-f2aa1e957a67', $tr$What do repeated patterns in traditional weaving show?$tr$, $tr$["The skill of our ancestors", "A lack of talent", "Just random designs", "They have no meaning"]$tr$::jsonb),
('35ee2782-4a71-46d1-9491-9bfa0b1b86c5', $tr$What is a consumer's right to complain?$tr$, $tr$["When a product is damaged or wrong", "Even with no reason", "It is not a right", "Only for business owners"]$tr$::jsonb),
('361880cd-4578-4116-8f48-c180673fe322', $tr$Why were so many pictures of saints made during the Early Spanish Colonial Period?$tr$, $tr$["To teach religion to the people", "Just to decorate homes", "To sell to other countries", "They had no purpose back then"]$tr$::jsonb),
('36429f31-7d7f-412b-8d60-119b86fed2cd', $tr$Asking a trusted adult for help is:$tr$, $tr$["a sign of bravery", "a sign of weakness", "a way of tattling", "a way of running from the problem"]$tr$::jsonb),
('368df645-f2f2-4214-8bf6-13bfeca1f84b', $tr$Why is it important to change the speed and direction of your shots in net/wall games?$tr$, $tr$["So the opponent cannot guess your next move", "To make the game end faster", "To make the ball easier to catch", "So you don't have to run anymore"]$tr$::jsonb),
('36d45f44-6a44-4fe3-adcf-c538ab217754', $tr$Which periods did we learn about in Music & Arts?$tr$, $tr$["Revolutionary and American Period", "None", "Only one period", "We learned nothing"]$tr$::jsonb),
('36eb1e42-770d-44c5-b03e-7f284deeec32', $tr$What is coordination?$tr$, $tr$["Making different body parts work together in one movement", "Only the ability to sit quietly", "Only the ability to read very fast", "The ability to watch TV for a very long time"]$tr$::jsonb),
('372c60c0-341a-4279-963c-5461404f89b6', $tr$Why is dance exercise more fun than regular exercise?$tr$, $tr$["It combines music and movement", "It's no different from others", "It's harder than others", "It's not exercise"]$tr$::jsonb),
('37e89b6d-3a01-4d23-845c-2013b90acc1c', $tr$Which is an example of a Filipino game we learned?$tr$, $tr$["Patintero and Agawan Base", "Chess and Checkers", "Basketball and Baseball", "Golf and Tennis"]$tr$::jsonb),
('382d2dcc-6a01-46a8-943c-4b46c8303c33', $tr$What is the main goal of playing these games as a family?$tr$, $tr$["Keeping the whole family healthy", "Giving money as a prize", "Lowering grades in school", "Making housework harder"]$tr$::jsonb),
('387e3a65-cc76-409a-9183-21738a018b09', $tr$What is cyberbullying?$tr$, $tr$["Hurting others using technology", "A game in the computer lab", "Writing an email to a teacher", "Studying using the internet"]$tr$::jsonb),
('38cc7859-b65f-46b6-b3f2-b5edf977917e', $tr$Why does MAPEH include dance?$tr$, $tr$["It supports health and the arts", "No purpose", "Not related", "For adults"]$tr$::jsonb),
('38e56678-487f-4e97-a3ed-a94211163926', $tr$What is cardiovascular fitness?$tr$, $tr$["Strength of the heart and lungs", "Only arm strength", "Running speed", "Body weight"]$tr$::jsonb),
('391e811d-5feb-4eec-83f0-47bd8e9e6260', $tr$What did we learn about family wellness this term?$tr$, $tr$["Planning and doing health activities for the family", "We didn't learn anything about it", "Just one kind of game in this activity", "Just one kind of food"]$tr$::jsonb),
('392c6458-0e66-4ed2-9584-0ae0ddb33a8c', $tr$What is a chorus like?$tr$, $tr$["It repeats and is easy to remember", "It changes each time", "It has no tune", "It is long and complicated"]$tr$::jsonb),
('39365265-9e49-4a66-a974-6566b5f33eb6', $tr$Why is coordination important when doing dance steps?$tr$, $tr$["So the movements are smooth and done together", "It has no value", "Coordination is not needed", "Any movement is correct"]$tr$::jsonb),
('3970ef30-f1c5-48b0-8b30-d0e4383090d3', $tr$What does the bottom number in a time signature show?$tr$, $tr$["What kind of note gets one beat", "How many beats are in each measure", "How many singers there are", "How long the whole song is"]$tr$::jsonb),
('39995b9a-7667-4127-9d58-6f81c5ecd2a5', $tr$Which is an example of a Filipino striking/fielding game?$tr$, $tr$["Patintero with throwing", "Badminton in the yard", "Volleyball in the park", "Tennis on a court"]$tr$::jsonb),
('39aa4390-62f6-452a-bed1-31c6f08fbc75', $tr$Why are festivals important to our identity?$tr$, $tr$["They show the special culture of each region", "Not related", "Only borrowed from other countries", "Not part of the culture"]$tr$::jsonb),
('39bddc23-547d-41da-8f32-e6c74b700b3f', $tr$In a song with two verses and a chorus in the middle, how many times is the chorus usually sung?$tr$, $tr$["More than once", "Only once", "It is not sung", "Only at the end"]$tr$::jsonb),
('3ab4e09a-2ac8-4776-bba5-1a5e77c4b52f', $tr$What is movement vocabulary?$tr$, $tr$["The set of movements used in a dance", "A list of words in a play", "The name of a dancer", "The color of a costume"]$tr$::jsonb),
('3ac26afc-5ca2-4c0d-bf43-2ed65baab303', $tr$Why does MAPEH include dance as part of PE?$tr$, $tr$["It supports physical health and appreciation of the arts", "It has no purpose", "It is not related to education", "Only for adults"]$tr$::jsonb),
('3ad6272a-e967-41b8-be1c-210d8c4bac5e', $tr$Which of these is NOT part of a common musical form?$tr$, $tr$["Deposit slip", "Verse", "Chorus", "Melody"]$tr$::jsonb),
('3b3a24a1-2741-47d2-9db5-13eb38006968', $tr$Why is environmental health an important issue?$tr$, $tr$["It affects everyone's health", "It has no effect on people", "It is only an issue in other countries", "It is not related to MAPEH"]$tr$::jsonb),
('3b71795a-0e8a-4617-83ea-092f149be936', $tr$What is balance?$tr$, $tr$["The ability to stay steady while moving", "The ability to run very fast", "The ability to count fast", "The ability to sing loudly"]$tr$::jsonb),
('3b8f0847-0fa7-4f0a-ae6a-8aa131c1e3b4', $tr$What responsibility does a consumer have?$tr$, $tr$["Read the label before buying", "None, only the seller is responsible", "Just buy without thinking", "Don't check the product"]$tr$::jsonb),
('3b94dbe1-b2ca-4376-a488-18ead87a5e11', $tr$Why write the verse before the chorus?$tr$, $tr$["So the story connects well to the message", "The order doesn't matter", "The chorus should be written first", "There is no order"]$tr$::jsonb),
('3bf911f6-87d3-4eb0-b4b3-b93013e22dcc', $tr$How many hours of sleep are good for your age?$tr$, $tr$["9 to 11 hours", "4 to 5 hours", "13 to 15 hours", "2 to 3 hours"]$tr$::jsonb),
('3c0db1d8-472e-4b51-8795-77c768dd17ee', $tr$How do fair rules help family health?$tr$, $tr$["It brings respect and stability to the home", "It makes life hard for children", "It has nothing to do with health", "It causes fights"]$tr$::jsonb),
('3cc33cfb-018d-4ce5-98a6-1b95013ac496', $tr$What are striking/fielding games?$tr$, $tr$["Games with hitting/throwing a ball and running", "Games with only a net as a barrier", "Games with no ball at all", "Games played while sitting down"]$tr$::jsonb),
('3cd83e15-2c35-4758-9cd6-a78913fdc213', $tr$What do legend plays and dances show?$tr$, $tr$["A story through movement and costumes", "No story", "Only modern technology", "Business laws"]$tr$::jsonb),
('3cdc4977-13cf-4db1-a797-a24272e05c9c', $tr$What is strophic form?$tr$, $tr$["The tune repeats in every verse", "Two different parts", "No set pattern", "The tune is played only once"]$tr$::jsonb),
('3d0beaaa-3142-4f07-87da-85c516d7657f', $tr$Why are rhythm, pattern, and movement important in art?$tr$, $tr$["They make the artwork interesting and organized", "They have no meaning in art", "They only make the work harder", "They are only used in sports"]$tr$::jsonb),
('3d177621-ee2f-4bc3-aa98-28e710bf5c88', $tr$What was the main subject of visual arts during this time?$tr$, $tr$["Saints and scenes from the Bible", "Animals in the forest", "Views of the beach", "Pictures of kings long ago"]$tr$::jsonb),
('3dd13f09-59e3-4ed7-944a-f6573de297a0', $tr$What is balance in PE?$tr$, $tr$["The ability to stay steady while moving", "The ability to run very fast", "The ability to count fast", "The ability to sing loudly"]$tr$::jsonb),
('3df8efa8-7074-4200-839a-b4019fa30d55', $tr$On defense, what should you guard besides the player?$tr$, $tr$["The space", "The time", "The score", "The sound"]$tr$::jsonb),
('3e272541-7157-4541-9b2c-297e3b962056', $tr$Which is an example of a Filipino striking/fielding game?$tr$, $tr$["Patintero with throwing", "Badminton in the yard", "Volleyball in the park", "Tennis on a court"]$tr$::jsonb),
('3e37d4d9-4b38-445b-a1d6-6790dfeb2594', $tr$Why is it important to include the whole family in health activities?$tr$, $tr$["It makes bonds stronger while improving health", "It is pointless if everyone is together", "It is better to do it alone", "The family is not needed for this activity"]$tr$::jsonb),
('3eaa8f39-d205-4cc9-acc9-16205c616d39', $tr$Why is contemporary art important to identity?$tr$, $tr$["It shows how Filipino identity keeps growing", "It is not important", "It makes traditions disappear", "It is not part of the culture"]$tr$::jsonb),
('3f470354-a70c-4c88-8e32-2d5dc817a248', $tr$What is a social dance mixer?$tr$, $tr$["A dance where partners keep changing", "A kind of song", "A game with no music", "A kind of drawing"]$tr$::jsonb),
('3f6d8112-5be9-4a5d-b7d4-8730506f0e90', $tr$How is street dance related to the dance exercise we learned before?$tr$, $tr$["Both use movement and music as part of dance", "The two have no connection", "One is only about science", "One is about math"]$tr$::jsonb),
('3f8f99af-8779-42b8-bb0d-e8971bdb0d49', $tr$Why does a rhythmic dance pattern match the time signature?$tr$, $tr$["So people stay in time with the music", "To make the dance faster", "To make the sound louder", "They have nothing to do with each other"]$tr$::jsonb),
('3fce3f2f-775e-44ea-8a7f-3bdf843eee3b', $tr$What new PE unit started this week?$tr$, $tr$["Dance Exercise", "Sports Officiating", "Weightlifting", "Swimming"]$tr$::jsonb),
('40079ced-f4fb-44c5-a1dd-3bcbd96f93c3', $tr$What is strophic form?$tr$, $tr$["The tune repeats in every verse", "Two different parts", "No set pattern", "The tune is played only once"]$tr$::jsonb),
('402aaafe-d202-4b3d-8890-fde43bc152cb', $tr$What is the role of the family as a child grows up?$tr$, $tr$["The child's first guide in making good choices", "They have no role at this stage of life", "They should only watch from far away", "Only they should make decisions for the child"]$tr$::jsonb),
('408c7813-123e-453c-ba46-b1a9e8307c51', $tr$What kind of dance often uses 2/4 time?$tr$, $tr$["Polka", "Waltz", "Tango", "Ballroom in 3/4"]$tr$::jsonb),
('413b7147-8cb1-4dd6-b3cf-2f3b13e47455', $tr$What is movement in art?$tr$, $tr$["How the body moves", "The color of the costume", "Only the sound of the music", "The number of people watching"]$tr$::jsonb),
('417e6c09-3a53-47f4-b093-dea6c713a15b', $tr$Why is it important to practice what we learned about health and cleanliness?$tr$, $tr$["It helps us live in a healthy and responsible way", "It is pointless in life today", "It is only done for grades", "It is not really important in this activity"]$tr$::jsonb),
('41f56b3e-d524-4494-9578-e4c7ea75d10f', $tr$How is traditional dance related to the street dance we learned before?$tr$, $tr$["Both are part of celebrating and valuing Filipino culture", "The two have no connection", "One is only about science", "One is about math"]$tr$::jsonb),
('4204d507-c97a-40f1-a73e-c3ad2a9609ac', $tr$Which Filipino game is an invasion game?$tr$, $tr$["Agawan Base", "Tumbang Preso", "Tatsing", "Calahoyo"]$tr$::jsonb),
('427ad960-f0a5-488f-b3f3-0448839e94b5', $tr$Why do dance exercise?$tr$, $tr$["It's fun and keeps you active", "It's not important", "It's not real exercise", "It makes you weaker"]$tr$::jsonb),
('42b579f2-5b1d-482c-a2f8-837d7673187c', $tr$Why was Filipino music included?$tr$, $tr$["To value our culture while exercising", "Not related", "It is banned", "It was just picked at random"]$tr$::jsonb),
('4305cc6b-9ab6-432c-8829-178615da2534', $tr$What is the first step in getting ready to perform?$tr$, $tr$["Choose the number of members", "Perform right away", "Forget the steps", "Leave the group"]$tr$::jsonb),
('430f0dfd-a29b-480f-8a01-6e99a5485a93', $tr$Why are native rituals considered art?$tr$, $tr$["They use rhythm and movement", "They have no color or design", "They are done only randomly", "They do not show culture"]$tr$::jsonb),
('433bc0ab-3853-4585-8aa0-f5e75081d048', $tr$What health topic about medicine did we learn?$tr$, $tr$["Proper use versus misuse of medicine", "History of medicine in the Philippines", "Prices of medicine at the drugstore", "Names of medicines only"]$tr$::jsonb),
('4363038b-581a-4cf2-9a45-127af28c79cc', $tr$What important lesson did we learn from making our own song?$tr$, $tr$["Using musical form (verse and chorus) in a creative project", "Making a business investment", "Calculating probability", "Writing a story outline"]$tr$::jsonb),
('4393d1e8-a593-488a-a9d8-a0a9be204829', $tr$Which is an example of a gateway drug?$tr$, $tr$["Cigarettes", "Milk", "Water", "Fruit"]$tr$::jsonb),
('43a935a9-cc91-4fae-bdf8-73a77440254b', $tr$Which time period does this lesson cover?$tr$, $tr$["1521–1600", "1900–1950", "1898–1946", "1565–1600 only"]$tr$::jsonb),
('43fc9d6a-6c0c-4c5c-899c-f9a1ca26373d', $tr$Why is Filipino music included in some dance exercise examples?$tr$, $tr$["It helps us value Filipino culture while exercising", "The music doesn't matter", "Filipino music is banned", "It was just picked at random"]$tr$::jsonb),
('441393db-2805-4bdf-baf0-951330b22f23', $tr$Why is open communication with family important while a child grows up?$tr$, $tr$["They are the most trusted guides for new questions", "You no longer need a guide at this stage", "It is better to hide all your questions", "You should stop listening to your parents"]$tr$::jsonb),
('448b3b93-1c81-4ff8-ba13-6db6e573c5b7', $tr$Why is music used in dance exercise?$tr$, $tr$["It gives tempo and makes moving fun", "Music has no use", "It only makes the exercise harder", "Music is not needed"]$tr$::jsonb),
('44a45a16-4f37-498f-8e2f-8ffd3271a5f5', $tr$Who performs the Singkil?$tr$, $tr$["The Maranao", "The Ilokano", "The Bisaya", "The Tagalog"]$tr$::jsonb),
('44fcd428-c1fd-4641-bf05-fc2ab89f0c89', $tr$What is the climax?$tr$, $tr$["The highest point of the conflict", "The beginning of the play", "The introduction of the characters", "Only the ending"]$tr$::jsonb),
('450a4116-ab61-4007-851b-ecddecfa76a5', $tr$Why is it important to learn to value your own rights?$tr$, $tr$["To know when you need to ask for help", "There is no need to know this", "Only for adults", "It has no effect"]$tr$::jsonb),
('459740f5-7b8c-4857-ad06-0c39831dd7ea', $tr$Where is the Sinulog held?$tr$, $tr$["Cebu", "Aklan", "Iloilo", "Manila"]$tr$::jsonb),
('45f9ca25-3562-40f2-8b33-49709413e1be', $tr$Why is it important to get vaccinated?$tr$, $tr$["It gives protection against certain diseases", "It has no benefit", "It only causes disease", "It is no longer needed"]$tr$::jsonb),
('464bf67d-34e5-4ee4-8461-7ff19efd2d3d', $tr$A way to break the chain of infection?$tr$, $tr$["Washing hands", "Not caring", "No protection", "Forgetting to get vaccinated"]$tr$::jsonb),
('46ecc925-2955-4030-823e-9af7ed96e611', $tr$Why is it important to watch the ball until you hit it?$tr$, $tr$["It makes your hit more accurate", "It makes you run faster", "It helps you avoid the opponent", "It makes the ball lighter"]$tr$::jsonb),
('470f8c72-eaef-4b28-9688-15d2d5c015da', $tr$What is the goal in invasion games?$tr$, $tr$["Get into the other team's space while defending", "Stay standing in one place", "Just wait at the side of the play area", "Sit while playing"]$tr$::jsonb),
('4713dff3-b64a-4242-b4f2-8e7cb1fa5f4b', $tr$Where is the Ati-Atihan held?$tr$, $tr$["Aklan", "Cebu", "Quezon", "Manila"]$tr$::jsonb),
('47a4a5a4-ba2c-4f77-acf3-5bf90a412589', $tr$Example of a fundamental dance step?$tr$, $tr$["Touch step", "Reading", "Writing", "Swimming"]$tr$::jsonb),
('47ba841d-477d-4b50-af3f-db32db02777f', $tr$What is the goal of reviewing before the break?$tr$, $tr$["To be ready for new topics", "No goal", "To entertain the teacher", "To replace math"]$tr$::jsonb),
('490af6bc-7c48-451d-aaa7-3e3c600cf9b2', $tr$What does the Singkil show as a dance?$tr$, $tr$["Maranao culture using bamboo poles and umbrellas", "Foreign culture", "Only a kind of game", "No special meaning"]$tr$::jsonb),
('49270dba-490a-4e3a-98cf-f5f9979a9abd', $tr$What is a seditious play?$tr$, $tr$["A play that secretly speaks out against foreign rule", "A play only about love", "A play that is only a comedy", "A play with no link to history"]$tr$::jsonb),
('49512c4d-1e04-427a-a7c6-ae5736249efd', $tr$What is the goal of setting an exact schedule for the wellness day?$tr$, $tr$["So everyone is ready and organized at the right time", "To confuse all the family members", "Setting a schedule has no goal", "To lower the number of people joining"]$tr$::jsonb),
('49b66b2f-c5c3-495f-823a-e57acfcdfccb', $tr$Goal of a social dance mixer in 3/4 time?$tr$, $tr$["Follow a gentle tempo while mixing with others", "Learn to write", "Learn math", "Play basketball"]$tr$::jsonb),
('49b9a2b2-dede-4f53-a876-21b78b8c566c', $tr$What matters most, based on the goal of the activity?$tr$, $tr$["Sharing your idea using musical form", "Making the tune perfect", "Making it the longest", "Using many instruments"]$tr$::jsonb),
('49e01437-0d4d-4439-ac63-45441d7fa4ed', $tr$What is an example of movements in movement exploration?$tr$, $tr$["Bending, turning, jumping", "Eating, drinking, sleeping", "Writing, reading, drawing", "Watching TV"]$tr$::jsonb),
('4a4df031-4505-47f4-adea-1b3c69862dc9', $tr$What should you do first when you are being bullied?$tr$, $tr$["Stay calm and do not fight back", "Fight back with violence", "Stay quiet and tell no one", "Stay away from school"]$tr$::jsonb),
('4a56cd1c-6dc9-4453-a9dc-b2cf380fe39a', $tr$A student watches the senakulo every Holy Week (Semana Santa) in their town. What does this show?$tr$, $tr$["This traditional art is still alive", "This art is brand new", "It has no connection to history", "It is just a modern invention"]$tr$::jsonb),
('4abe3a0f-e9ce-44b5-8e00-7e7c5c61c6d8', $tr$What is a verse in a song?$tr$, $tr$["The part whose words change each time it comes back", "The part whose words are always the same", "The part with no words", "An instrument only"]$tr$::jsonb),
('4ad94523-beb3-4cfc-a247-8f2a4f8bb804', $tr$A student made a design using repeated circles of the same size and spacing. What did the student use?$tr$, $tr$["Regular pattern", "Random pattern", "No design", "Just one line"]$tr$::jsonb),
('4b1c7eb1-ebc7-467a-be11-a9c63b267a18', $tr$What is the Sinulog?$tr$, $tr$["A prayer dance for the Santo Niño", "A dance only at Christmas", "A dance only at weddings", "A dance only at graduation"]$tr$::jsonb),
('4b233cb9-a394-4e81-9d92-2a378a75b1d8', $tr$Who should prescribe medicine?$tr$, $tr$["A doctor or parent", "Only a friend", "Anyone", "No permission is needed"]$tr$::jsonb),
('4b905507-022d-424c-921a-ca8f4ff3347d', $tr$A feature of street dance?$tr$, $tr$["Loud drumbeats and colorful costumes", "Silence", "Only one person", "No choreography"]$tr$::jsonb),
('4bb36a4b-0f86-4e28-b53b-3678acd74b20', $tr$How did native and European dances mix?$tr$, $tr$["Free movements combined with formal steps", "No mixing happened", "Only Spanish dance was the basis", "Only native dance was the basis"]$tr$::jsonb),
('4bd598ce-98e1-473c-8885-2a151d054e05', $tr$What does putting two tempos together bring?$tr$, $tr$["Versatility in dance", "Nothing", "Only confusion", "Not possible"]$tr$::jsonb),
('4c243f06-cb4c-4515-b792-a108b72b657a', $tr$A classmate is trying to force you to do something you don't want to do. What should you do?$tr$, $tr$["Say \"no\" clearly and talk to a trusted adult", "Just go along so your classmate won't get annoyed", "Hide what happened from everyone", "Avoid your classmate forever"]$tr$::jsonb),
('4c42f0fb-fe20-4e9d-a8fd-18d7c2d2fe90', $tr$What is symbolic theater?$tr$, $tr$["It uses symbols to share a message", "It is only direct protest", "It is only a dance with no message", "It is only a song with no meaning"]$tr$::jsonb),
('4c85fddd-0feb-494d-88c6-82cadce16595', $tr$Who is a well-known composer of Filipino classical music?$tr$, $tr$["Nicanor Abelardo", "Andres Bonifacio", "Jose Rizal", "Emilio Aguinaldo"]$tr$::jsonb),
('4ca33087-c10f-4069-809b-e889e8166f8f', $tr$Why is it important to study all parts of MAPEH — music, arts, and PE?$tr$, $tr$["It helps us understand how art, health, and culture are connected", "We should really study only one of them", "It has no meaning in our whole life", "It is done only as a kind of fun"]$tr$::jsonb),
('4cbc08ca-c54a-4500-bbd9-e1a4d74cfc76', $tr$Which is an example of dance exercise?$tr$, $tr$["Zumba-inspired moves", "Chess", "Puzzle games", "Reading a book"]$tr$::jsonb),
('4d83f859-427a-407d-b38d-8d83156f8864', $tr$Why is dance exercise taught in MAPEH?$tr$, $tr$["To support physical health in a fun way", "It has no purpose", "It is only for older people", "It is not related to PE"]$tr$::jsonb),
('4d8493bd-c1af-4334-b321-394f5fd06c39', $tr$What is 'Reduce' in the 8Rs?$tr$, $tr$["Cutting down on the trash we make", "Adding more trash", "Hiding trash", "Burning trash"]$tr$::jsonb),
('4de67ee8-2898-4e4f-97ed-40d8de0c502d', $tr$What idea helps you stay steady while moving?$tr$, $tr$["Balance", "Sadness", "Carelessness", "Hardship"]$tr$::jsonb),
('4e01f20b-3cd3-46f5-b3e1-82a70cbba01f', $tr$What is one negative effect of misusing medicine that we learned?$tr$, $tr$["It can harm the body's health", "Its effect is always good", "It has no effect at all on the body", "It only makes the body stronger"]$tr$::jsonb),
('4ea8000f-d93f-4e66-9f8c-7884f239feaa', $tr$A writer used a 'snake' character to show the foreign ruler. What is this called?$tr$, $tr$["Symbolism", "Direct protest", "Only the truth", "Daily news"]$tr$::jsonb),
('4ee3f7b4-c852-4ea0-8a3b-f24dbc983be1', $tr$What is symbolism used for in these plays?$tr$, $tr$["Images to teach religious lessons", "New modern technology", "Only modern music", "Sports games"]$tr$::jsonb),
('4f148cea-a0b4-4437-8de8-7457718039c7', $tr$Which one is an example of a net/wall game?$tr$, $tr$["Volleyball", "Softball", "Baseball", "Patintero"]$tr$::jsonb),
('4f20ad5c-4b1a-420b-92ad-351b42ce8c08', $tr$What is cardiovascular fitness?$tr$, $tr$["Strength of the heart and lungs", "Only arm strength", "Only running speed", "Body weight"]$tr$::jsonb),
('4f248f3d-504a-412c-8da0-97ccdc80184c', $tr$Which one is an invasion game?$tr$, $tr$["Football", "Bowling", "Archery", "Dart"]$tr$::jsonb),
('4fc69da4-7a2e-4652-aeba-5c2eca20a2ab', $tr$What did we learn about music this term?$tr$, $tr$["Rhythm and tempo", "Only the history of computers", "Only math", "We learned nothing"]$tr$::jsonb),
('501d9dec-af64-4b82-b6ed-df692d6a40d3', $tr$Which one is NOT part of a social dance mixer?$tr$, $tr$["Staying with one partner the whole time", "Changing partners", "Music in 2/4 time", "Simple steps"]$tr$::jsonb),
('5053a563-0fe1-4872-9d15-dc070477c9d8', $tr$How does music help in a social dance mixer?$tr$, $tr$["It gives a tempo for the steps to follow", "It has no role in the dance", "It is used only as noise", "It stops the dance"]$tr$::jsonb),
('5098929d-515b-4bc6-815f-d40ce7880624', $tr$Who performs the Singkil?$tr$, $tr$["The Maranao", "The Ilokano", "The Bisaya", "The Tagalog"]$tr$::jsonb),
('509ef535-12d1-4996-84e0-a3be09e32e8c', $tr$A song slows down its tempo in the middle. What is the likely effect on the listener's feelings?$tr$, $tr$["It makes the feeling sadder or more peaceful", "It makes it happier and livelier", "It has no effect on feelings", "It makes the sound louder"]$tr$::jsonb),
('50a5d79b-7faf-430a-bdbe-a4ea3f15f321', $tr$Difference between contemporary and traditional?$tr$, $tr$["Contemporary is modern; traditional was passed down from the past", "They are the same", "No difference", "Traditional is always better"]$tr$::jsonb),
('52b89ec5-1d0d-4950-b254-bcd0fa93a682', $tr$What tempo fits a fiesta song?$tr$, $tr$["Fast", "Slow", "No rhythm", "Just quiet"]$tr$::jsonb),
('52ccbcc2-7c45-4a2a-9239-9a2adcd58727', $tr$How does high self-esteem help a child?$tr$, $tr$["It helps them stay true to their values", "They become easy to influence", "They lose their own opinion", "They always doubt themselves"]$tr$::jsonb),
('52fcbece-0b3f-4787-becf-12b81af5849b', $tr$Which was a common subject of art in the Early Spanish Colonial Period?$tr$, $tr$["Pictures of saints and scenes from the Bible", "Pictures of modern cars", "Pictures of computers", "Pictures of the planets"]$tr$::jsonb),
('5307187b-c2a9-4439-8f48-c9e5e41ac716', $tr$What is musical form?$tr$, $tr$["The way the parts of a song are arranged", "How wide the singer's voice range is", "The number of instruments", "The sound of a guitar only"]$tr$::jsonb),
('53588d60-9748-4fd9-b1c6-82ae47f6f7a3', $tr$Why is coordination important in dance steps?$tr$, $tr$["Smooth movements done together", "It has no value", "It is not needed", "Any movement is correct"]$tr$::jsonb),
('536ef3d6-464a-4f5a-826b-95e97277b9dc', $tr$What is the benefit of doing a culminating activity in MAPEH?$tr$, $tr$["It puts the skills you learned together into one successful activity", "It has no benefit", "It is just for fun", "It is not part of learning"]$tr$::jsonb),
('53b3ec88-c8d9-442e-af25-7dbda77d4f83', $tr$What feature does street dance have?$tr$, $tr$["Loud drumbeats and colorful costumes", "Silence and no music", "Only one person dances", "No choreography"]$tr$::jsonb),
('54066dae-7c1e-4ff6-9295-49ff65cbcf9e', $tr$A picture has lines leading to a mountain. What does this show?$tr$, $tr$["Movement", "Only rhythm", "Only pattern", "Only color"]$tr$::jsonb),
('54434575-0544-4691-a704-c28d7c2a0ecf', $tr$What is the goal of making a poster about why exercise matters?$tr$, $tr$["To remind others why an active lifestyle is important", "Just to decorate the classroom", "This activity has no goal", "To make class time go faster"]$tr$::jsonb),
('5444259b-6089-49dc-8a55-6cb3c8964371', $tr$How many people are recommended in a group?$tr$, $tr$["4-6 people", "Only 1 person", "20 people", "No set number"]$tr$::jsonb),
('549c4547-c108-4d0e-8343-ce13e4edfa20', $tr$Trait of the waltz?$tr$, $tr$["Gentle, three beats per measure", "Very fast, two beats", "No music", "Only one beat"]$tr$::jsonb),
('54c84938-9f0d-4e12-b24d-2fba96492a62', $tr$Which part of the body is mainly used in the dance?$tr$, $tr$["The whole body, in the steps and moves", "Hands only", "Eyes only", "None, just watching"]$tr$::jsonb),
('55934b6d-ef7b-44ee-9cbb-18340a0d0b41', $tr$What is a rhythmic pattern?$tr$, $tr$["A mix of long and short sounds", "Just one instrument", "Just the singer's name", "Just a type of dance"]$tr$::jsonb),
('5597ee66-49b8-4f21-8452-f0d65609cb23', $tr$What did we learn about in Health?$tr$, $tr$["Holistic wellness", "Nothing", "Only one thing", "We learned nothing"]$tr$::jsonb),
('55aa82c3-93f9-488e-86d3-4b341d044623', $tr$How is a verse different from a chorus?$tr$, $tr$["The verse's words change while the chorus repeats", "They are always exactly the same", "The verse has no tune", "The chorus has no words"]$tr$::jsonb),
('55bdd490-8194-4d04-bb20-6616ede76db3', $tr$Why is this topic taught to kids?$tr$, $tr$["So they are ready to say no when someone offers it", "To encourage them to try it", "It has no reason", "Just to scare them"]$tr$::jsonb),
('56137e0c-6bc2-4956-8cb0-881f35030504', $tr$Why teach contemporary art?$tr$, $tr$["To understand how culture changes and grows", "It has no purpose", "Only for older people", "Not related to education"]$tr$::jsonb),
('561ddadc-6ff8-4604-9424-1befd0ddb7fe', $tr$Which one is an example of popular music in the Philippines?$tr$, $tr$["OPM", "Symphony", "Sonata", "Only kundiman"]$tr$::jsonb),
('5653cce5-9d83-488a-baa4-aa9462029cb1', $tr$What is the goal of modified games?$tr$, $tr$["So everyone can join based on their ability", "To make the game harder for everyone", "So only the best players win", "To make the game last longer"]$tr$::jsonb),
('5689e2d5-97a2-44df-b765-7d292956c1ba', $tr$What are gateway drugs?$tr$, $tr$["Substances that can open the way to more dangerous drugs", "Just a kind of food", "Legal medicine with no effect", "A kind of vitamin"]$tr$::jsonb),
('571ae79a-5b7f-41a7-9bc6-6f25d5c34555', $tr$Which two tempos were put together this week?$tr$, $tr$["2/4 and 3/4 time", "4/4 and 6/8 time", "1/4 and 5/4 time", "No tempos were put together"]$tr$::jsonb),
('57791673-a363-4de8-80c0-d7ef45cc0f03', $tr$What is an example topic you can use for a song?$tr$, $tr$["Love for family", "Business law", "The country's economy", "Running the government"]$tr$::jsonb),
('57b700d9-eb6d-43b8-b677-5e434b2a3a89', $tr$What is a verse in a song?$tr$, $tr$["The part whose words change each time it comes back", "The part whose words are always the same", "The part with no words", "The part where only a drum plays"]$tr$::jsonb),
('57e3d87a-285c-4eed-be32-aa7c2b07dc74', $tr$What is the goal of reflecting after doing the activity?$tr$, $tr$["To make what we learned from the experience stick", "To forget what we learned right away", "To close the topic without thinking", "To make a new activity right away"]$tr$::jsonb),
('586a427e-2e81-4e03-aea8-11860e49f8b2', $tr$How is contemporary art different from traditional art?$tr$, $tr$["Contemporary is modern, while traditional was passed down from the past", "They are the same", "There is no difference", "Traditional is always better"]$tr$::jsonb),
('588db5d3-2ee9-40c7-9e1e-405b8ab045a8', $tr$Why practice before the presentation?$tr$, $tr$["So the movements are smooth", "It is not needed", "As long as the first try is right", "No effect"]$tr$::jsonb),
('592d2bb4-b030-4953-b418-7790b4a37c9c', $tr$What should you do after every hit in a net game?$tr$, $tr$["Go back to the middle, or ready position", "Stay at the end of the court", "Sit down to rest", "Move right up to the net"]$tr$::jsonb),
('599ad326-913d-4d3d-bdf8-1cd3e8f1c9f6', $tr$Why is it important to think about safety in a wellness activity?$tr$, $tr$["To avoid accidents during the activity", "It has nothing to do with the activity", "Just to make the activity faster", "There is no need to think about it"]$tr$::jsonb),
('59b018c9-7c27-42d7-a8f6-fff6b9ac600a', $tr$Why are different kinds of dance part of MAPEH?$tr$, $tr$["They support physical health and appreciation of the arts", "They have no purpose", "They are not related to education", "Only for adults"]$tr$::jsonb),
('5a1bda78-86ed-4669-97b8-bae679e3b182', $tr$What is 'Recycle' in the 8Rs?$tr$, $tr$["Making new things from old materials", "Throwing trash away right away", "Burning trash", "Keeping trash hidden forever"]$tr$::jsonb),
('5a2e9d20-0542-4f25-9495-8af568860861', $tr$What time signature did we learn for rhythmic activities?$tr$, $tr$["2/4 time", "10/4 time", "1/8 time", "100/4 time"]$tr$::jsonb),
('5a3bfeb1-bcca-4fd3-b330-f04941d0902d', $tr$What is agility?$tr$, $tr$["Changing direction quickly", "Standing still for a long time", "Using a loud voice", "Counting points in a game"]$tr$::jsonb),
('5a4b6b0e-2605-46e3-8cca-588b1dfb0a3d', $tr$What two kinds of games did we learn in the past weeks?$tr$, $tr$["Striking/fielding and net/wall games", "Only board games and card games", "Only video games", "Games with no movement at all"]$tr$::jsonb),
('5a563e90-81cb-45b2-8037-b1038752997a', $tr$Which game is an invasion game?$tr$, $tr$["Agawan Base", "Tumbang Preso", "Tatsing", "Calahoyo"]$tr$::jsonb),
('5aef2da1-cc8d-4194-bb10-48b5b39f5a84', $tr$What period of history did Music/Art cover this term?$tr$, $tr$["Early Spanish Colonial", "American", "Present day", "Before the Spanish arrived"]$tr$::jsonb),
('5b06392e-4099-4ff0-992f-b5480dc9e2a7', $tr$Why is this topic taught as part of Health in MAPEH?$tr$, $tr$["To be responsible in preventing disease and protecting health", "It has no purpose", "It is only for older people", "It is not related to education"]$tr$::jsonb),
('5c03a24c-49f0-4f33-9572-6be0608500ad', $tr$Why is a lot of native music linked to beliefs?$tr$, $tr$["It is used in community rituals and celebrations", "It has nothing to do with people's lives", "It was made only by children", "It was written only for tourists"]$tr$::jsonb),
('5c0c6696-033b-49fe-a0dc-1044ff1784d1', $tr$Why should changes while growing up be seen as normal?$tr$, $tr$["They are a common part of everyone's growth", "They rarely happen to children", "They should be hidden out of shame", "They only happen to some children"]$tr$::jsonb),
('5c2e12eb-aa2a-498e-8679-4da6d46d175a', $tr$What is important to do before playing striking/fielding or net/wall games?$tr$, $tr$["Warm up", "Eat a heavy meal", "Sleep deeply", "Drink cold water right away"]$tr$::jsonb),
('5c569ac2-ada4-400f-9cc2-23b9f1bdc57d', $tr$Why do you need to get equipment ready before the wellness day?$tr$, $tr$["So the activity is orderly and ready", "It doesn't matter for the activity", "Only to make time go faster", "You don't need to prepare anything"]$tr$::jsonb),
('5c614f7a-91e4-4eca-b242-095cedfb7b48', $tr$Why teach the 8Rs to children?$tr$, $tr$["To be responsible in caring for the environment", "It has no purpose", "It is only for older people", "It is not related to health"]$tr$::jsonb),
('5c97fce0-6506-4047-9a4a-975337a7ef36', $tr$What skill do you learn?$tr$, $tr$["Coordination and timing with the music", "Writing a poem", "Calculating", "Reading a map"]$tr$::jsonb),
('5c986948-548c-44dc-bf71-2a7952958800', $tr$Which game uses a long stick to hit a small stick?$tr$, $tr$["Bati-Cobra", "Tatsing", "Calahoyo", "Tumbang Preso"]$tr$::jsonb),
('5c998913-183b-4c0d-be49-336389c0d48e', $tr$What is an example of a dance mixer we learned?$tr$, $tr$["A modern dance done as exercise", "A kind of food", "A kind of farm tool", "A kind of computer program"]$tr$::jsonb),
('5ca1c0fc-e5be-4ef3-8867-9abc689c37ea', $tr$Why is each region's dance special?$tr$, $tr$["It reflects the place's own history", "They are all the same", "No difference", "Just random"]$tr$::jsonb),
('5ca3ede3-4bec-4cb8-99dd-f251efb10af0', $tr$What skill do you learn in a social dance mixer?$tr$, $tr$["Coordination and timing with the music", "Writing a poem", "Calculating probability", "Reading a map"]$tr$::jsonb),
('5cbde8aa-fb00-4305-9ca2-4353ad63557f', $tr$What is agility?$tr$, $tr$["The ability to move fast and change direction", "The ability to stay quiet", "The ability to eat fast", "The ability to sleep deeply"]$tr$::jsonb),
('5d251e06-ca72-4172-bfad-70ef036ac79f', $tr$Why is teamwork as a group important?$tr$, $tr$["A smoother presentation", "It has no value", "It's better alone", "It is not needed"]$tr$::jsonb),
('5d477ee4-db83-4344-a2c7-c0602d5c6c80', $tr$What will we study next term?$tr$, $tr$["Commonwealth Period and Sexual/Reproductive Health", "No more topics", "Just something else", "Nothing"]$tr$::jsonb),
('5d99cc7a-2e3d-44ac-8df6-d2bed5ac1e98', $tr$Which is NOT a good response if someone offers it?$tr$, $tr$["Try it first", "Say 'No'", "Leave the situation", "Ask for help"]$tr$::jsonb),
('5dc3cf20-47c7-471a-88a8-a85c7685b9e2', $tr$A consumer's right?$tr$, $tr$["To know the price and quality", "No rights", "Just accept everything", "Pay too much"]$tr$::jsonb),
('5de47a1b-a002-407b-863a-4bbe30f6c9ca', $tr$Why is a safe environment important for children?$tr$, $tr$["It helps keep them safe and healthy", "It has no value", "It is no longer needed", "Only for adults"]$tr$::jsonb),
('5e367cb3-a872-4aa5-94ff-1ae236857dac', $tr$Why is sanitation important?$tr$, $tr$["To prevent the spread of disease", "It is not important", "It causes disease", "It is not connected to health"]$tr$::jsonb),
('5ff9b792-4497-4c47-86bd-a552693b8e26', $tr$What is rhythm in visual arts?$tr$, $tr$["Repeated elements in an artwork", "Only the type of color used", "Only the number of viewers", "Only the size of the paper"]$tr$::jsonb),
('6022dc69-b392-4ad7-955f-9bf1672c6b25', $tr$You keep losing rallies because you reach the ball too late. What is the BEST change to make?$tr$, $tr$["Go back to the middle after every hit", "Always hit harder", "Stand close to one side", "Wait at the back of the court"]$tr$::jsonb),
('6029c417-c757-4426-9b2f-e2713aab3040', $tr$Why should taking medicine without an adult's permission not be allowed?$tr$, $tr$["The child might not know the right dose or its effects", "There is no danger in it", "Children always know the right medicine", "Permission is not needed"]$tr$::jsonb),
('6055a4cc-b8b7-4a27-a099-d034b61571d5', $tr$Which is an example of a dance of thanksgiving?$tr$, $tr$["Pahiyas", "Only Sinulog", "Only Tinikling", "Cha-cha"]$tr$::jsonb),
('608a91f4-fc42-4735-b281-12786d48ff46', $tr$Who does the conqueror stand for in seditious plays?$tr$, $tr$["The foreign rulers", "The Filipinos", "The Mother Country", "The children"]$tr$::jsonb),
('609249e3-51f5-4888-b72e-c65fa9deceb2', $tr$What time signature is used?$tr$, $tr$["2/4", "6/8", "9/4", "No time signature"]$tr$::jsonb),
('60d52e32-30f2-40bb-ae5e-a74ab522f7ef', $tr$What happens if the right to health is not met?$tr$, $tr$["Well-being and growth will be affected", "Nothing will happen", "Always fine", "Automatically protected"]$tr$::jsonb),
('60d5361d-155e-484e-b763-00e9a3b27c4d', $tr$Why is this topic taught?$tr$, $tr$["So kids are ready to say no", "To encourage kids to try it", "No reason", "Just to scare kids"]$tr$::jsonb),
('60e3da96-8fb1-4336-9e0d-d9e4919f3213', $tr$What concept we learned before is used here?$tr$, $tr$["Verse and chorus", "Statistics", "Probability", "Story outline"]$tr$::jsonb),
('610ca8f9-cb4a-4ed2-a72e-97e7cffeb58e', $tr$Goal of movement exploration?$tr$, $tr$["Find out what the body can do", "Make the voice stronger", "Learn math", "Learn writing"]$tr$::jsonb),
('6110115e-fa68-4804-9def-ae57fb03bd03', $tr$What is rhythm?$tr$, $tr$["Repeated sounds in music", "Color of clothes in a dance", "Name of a song", "Instrument used"]$tr$::jsonb),
('6177294c-56a8-4f84-a7ff-42f123ceb7fb', $tr$What tempo fits a funeral song?$tr$, $tr$["Slow", "Fast", "Only medium", "No tempo"]$tr$::jsonb),
('61b388e2-df96-4ef7-96b3-6c619ba26b40', $tr$How is rhythm created in visual arts?$tr$, $tr$["By repeating shapes or colors", "By making loud sounds", "Only by dancing fast", "By making a long movie"]$tr$::jsonb),
('61bd8472-a382-4599-bb3a-c0b52a75dc5e', $tr$What is the difference between drawing and painting?$tr$, $tr$["Drawing uses a pencil; painting uses color", "Both use only color", "Both use only a pencil", "There is no difference at all between the two"]$tr$::jsonb),
('61c86d5b-d837-4723-9f19-6519e54ec2a6', $tr$What is a communicable disease?$tr$, $tr$["A disease that spreads from one person to another", "A disease that never spreads", "A kind of vitamin", "A kind of exercise"]$tr$::jsonb),
('61ff0094-8ce6-4fba-a202-c31c39a44665', $tr$According to the Visual Arts strand, what is the first step before drawing or painting?$tr$, $tr$["Observing your surroundings", "Selling the work right away", "Throwing away materials", "Forgetting the subject"]$tr$::jsonb),
('623cc785-beda-4a36-9e21-28b71fbb9f76', $tr$What is one trait of a healthy family?$tr$, $tr$["Open communication", "Not talking to each other", "Always fighting", "Not following any rules"]$tr$::jsonb),
('62748dad-f538-4b10-8293-6d57df7c7dca', $tr$What is agility?$tr$, $tr$["The ability to move fast and change direction", "The ability to stay quiet", "The ability to eat fast", "The ability to sleep deeply"]$tr$::jsonb),
('62be4cb4-4f6e-4bd1-80ad-9d9f4c71d266', $tr$What happens if you don't check the label?$tr$, $tr$["You might buy the wrong product", "Nothing will happen", "Always correct", "Shopping is faster"]$tr$::jsonb),
('62cad673-fae1-4c1d-a715-81c320f4fd56', $tr$A student made a design using repeated circles of the same size and spacing. What did the student use?$tr$, $tr$["Regular pattern", "Random pattern", "No design", "Just one line"]$tr$::jsonb),
('62d893df-1d8b-47f9-b887-8a568672ce53', $tr$What are the 8Rs?$tr$, $tr$["Ways to cut down on trash", "Eight new diseases", "Eight vaccines", "Eight exercises"]$tr$::jsonb),
('62e6d50b-6b0a-4f28-8327-31a363070356', $tr$Why is jumping important in movement exploration?$tr$, $tr$["It is an example of a movement the body tries out", "It is not linked to PE", "It is not a real movement", "It is not included in PE"]$tr$::jsonb),
('6365ddbd-e449-46e7-b504-38ef083f8257', $tr$Why is combining lessons considered helpful in a child's life?$tr$, $tr$["Kids see how what they learn is used in real situations", "It has no real link to our real lives", "It only makes it harder for kids to understand", "It is done only to make class longer"]$tr$::jsonb),
('6393f438-b270-40f2-877f-6d5b97fcf6f5', $tr$How many beats are in each measure in 3/4 time?$tr$, $tr$["Three", "Two", "Four", "One"]$tr$::jsonb),
('63e94988-b1b6-402a-8643-3efae926cae6', $tr$What can misusing medicine cause?$tr$, $tr$["Serious harm to the body", "Always a good effect", "No effect", "Getting better automatically"]$tr$::jsonb),
('6441c3cf-30ae-48ad-9280-5f900471a39e', $tr$Why is the dance called a 'mixer'?$tr$, $tr$["Because dance partners keep changing", "It has food mixed in", "No partners are used", "Only one person dances"]$tr$::jsonb),
('6444341a-eed5-4734-9107-ab3c24adb72a', $tr$Which is the gentler tempo?$tr$, $tr$["3/4 time", "2/4 time", "Both are the same", "There is no gentle tempo"]$tr$::jsonb),
('6448d2fe-14df-445a-bcc4-2540958c5551', $tr$What is One Health?$tr$, $tr$["The health of people, animals, and the environment are connected", "A kind of vaccine", "A kind of exercise", "A kind of medicine"]$tr$::jsonb),
('65399ed8-66ea-45c9-abcd-a589ffbe4816', $tr$Which is the oldest festival in the Philippines?$tr$, $tr$["Ati-Atihan", "Sinulog", "Dinagyang", "MassKara"]$tr$::jsonb),
('656ccaa2-c615-4e24-96f7-5d37762dd4d9', $tr$Why is the chorus of a song easy to remember?$tr$, $tr$["Because it repeats with the same words and tune", "Because it is only quiet", "Because it has no tune", "Because it is sung only once"]$tr$::jsonb),
('65aac3be-3dd3-4bb2-ae04-6c90421cc819', $tr$What is rhythm?$tr$, $tr$["Pattern of sound and silence", "Color of the instrument", "Place of the concert", "Number of people watching"]$tr$::jsonb),
('65b8e0cb-fe67-4783-baaf-ab8d44545be3', $tr$Why is it important to practice before a choreography presentation?$tr$, $tr$["So the movements are smooth and together", "There is no need to practice", "As long as the first try is right", "Practice has no effect"]$tr$::jsonb),
('661558d8-38f7-4e58-b063-1500c22fd2ca', $tr$How many beats are in each measure in a 3/4 time signature?$tr$, $tr$["3 beats", "4 beats", "2 beats", "6 beats"]$tr$::jsonb),
('66a7cdd4-7200-428e-8a5c-f8c0f93dfb21', $tr$Why is holistic wellness important?$tr$, $tr$["It takes care of your whole self", "There is no reason", "It is only for grades", "It is useless"]$tr$::jsonb),
('6704ce01-6d91-40de-8b76-5f02b318016e', $tr$What did we learn about music this term?$tr$, $tr$["Meter, time signature, and rhythmic dance patterns", "Only the history of computers", "Only math in this activity", "We didn't learn anything this time"]$tr$::jsonb),
('67135dda-3c4a-4401-9ca5-6495e3fa03c5', $tr$What is the step in the Sinulog?$tr$, $tr$["Two steps forward, one step back", "Only one step back", "No steps are done", "Only three steps forward"]$tr$::jsonb),
('675ce74e-6c46-40e8-b44e-f11afc38d22b', $tr$What simple instrument can help with the tune?$tr$, $tr$["A bell or clapping", "Piano only", "Guitar only", "None"]$tr$::jsonb),
('675f9f21-5931-4622-a4de-bd4cd2e93a31', $tr$What is the goal of playing Filipino games in PE?$tr$, $tr$["To build physical skills while valuing our culture", "Just to play with no real goal", "This activity has no real goal", "Just to finish the whole class quickly"]$tr$::jsonb),
('675fdd7a-f4bc-48c4-a1c2-f092e74954ba', $tr$Which was a common subject of art in the Early Spanish Colonial Period?$tr$, $tr$["Pictures of saints and scenes from the Bible", "Pictures of modern cars", "Pictures of computers", "Pictures of the planets"]$tr$::jsonb),
('67c75904-4818-4d59-ab99-025c4fc6f57a', $tr$What should you do if it is hard to find a tune?$tr$, $tr$["Try using just your voice or clapping first", "Just give up", "Forget the whole project", "Copy someone else's song without changing it"]$tr$::jsonb),
('67d69164-8014-4b7a-abf5-d83c229f30a8', $tr$What is the first part of the chain of infection?$tr$, $tr$["The source of the disease", "A new host body", "A vaccine", "The way in (portal of entry)"]$tr$::jsonb),
('67e5b0d4-586e-42ba-a757-c3d469efd071', $tr$What is endurance?$tr$, $tr$["How long you can keep going in an activity", "How fast your first step is", "How strong one shot is", "Aiming accurately"]$tr$::jsonb),
('67eb28fa-8cd3-4556-a9aa-32f65e6d53f3', $tr$What is symbolic theater?$tr$, $tr$["It uses symbols to share a message", "It is only direct protest", "It is only a dance with no message", "It is only a song with no meaning"]$tr$::jsonb),
('67f7b4c5-cf1f-4305-ad63-a48cff1b697d', $tr$What is the Pahiyas?$tr$, $tr$["A celebration to give thanks for the harvest", "Only a war dance", "Only a funeral ritual", "Only a graduation dance"]$tr$::jsonb),
('67f89a90-a997-48c5-8f53-e0b8e41ded1a', $tr$Why is it important to include the whole family in the activity?$tr$, $tr$["It makes family bonds and health stronger", "It has no benefit for the family", "It is better to do it alone", "Family is not needed for this activity"]$tr$::jsonb),
('684a897b-f5e4-46f8-8ec3-0e0896defa59', $tr$What period does this Visual Arts strand cover?$tr$, $tr$["Early Spanish Colonial Period (1521-1600)", "The American colonial period", "The Japanese occupation period", "The present day"]$tr$::jsonb),
('6857c5ed-8de9-47d1-8b31-0d5bfdadda8d', $tr$Why is dance a good exercise for health?$tr$, $tr$["It builds cardiovascular endurance while being fun", "It has no health benefits", "It only makes the body weaker", "It is done only for fun"]$tr$::jsonb),
('68647ea3-fb0f-4ce3-97a5-580b45cf62e5', $tr$What does mixing with others in a social dance mixer bring?$tr$, $tr$["Joy in connecting with others", "Being alone", "Only competition", "No interest"]$tr$::jsonb),
('68c1e0a9-c234-4278-9f70-654d7823b5ec', $tr$Why were pictures used as a 'book' for the people back then?$tr$, $tr$["Most people could not read", "They had no paper at that time", "Pictures were cheaper than books", "Pictures were faster to make"]$tr$::jsonb),
('68e9740e-06eb-4921-8288-0a68dd37bb68', $tr$Why shouldn't you just believe every ad?$tr$, $tr$["Not all ads are accurate or true", "All ads are always right", "No reason", "Ads are not important"]$tr$::jsonb),
('69094258-f244-4d9f-8b3b-b7bddcd6d1c7', $tr$Which one is a locomotor skill?$tr$, $tr$["Jumping", "Throwing", "Kicking", "Shooting"]$tr$::jsonb),
('692ad522-6129-472f-9828-177d1bcbc779', $tr$An example of dance exercise?$tr$, $tr$["Zumba-inspired moves", "Chess", "Puzzle games", "Reading"]$tr$::jsonb),
('696f07d9-4d4f-465c-8160-14ca76282b95', $tr$Which is an example of a protein?$tr$, $tr$["Fish or eggs", "Rice", "Only fruit", "Only water"]$tr$::jsonb),
('696f9639-2f29-4553-8230-785b7676fae2', $tr$If you want to stress the main message of a song, which part would you repeat?$tr$, $tr$["Chorus", "Verse", "Introduction only", "No part"]$tr$::jsonb),
('69a19d43-fceb-477f-824f-aaa373add98a', $tr$What is OPM?$tr$, $tr$["Original Pilipino Music", "A kind of dance", "A country", "A kind of food"]$tr$::jsonb),
('6a0f6b6c-305b-430e-88ad-20a27bbfdb9e', $tr$Why is coordination needed in these games?$tr$, $tr$["So your body movements work together correctly in the game", "So you can just sit on the side", "So you don't need to move anymore", "Coordination has nothing to do with the game"]$tr$::jsonb),
('6a47bea1-4ce5-478a-a38d-9bef6038fd00', $tr$What is OPM?$tr$, $tr$["Original Pilipino Music", "A kind of dance", "A country", "A kind of food"]$tr$::jsonb),
('6a567f3b-cdae-4126-ad0d-1b5d2a9977e7', $tr$Type of dance in 2/4 time?$tr$, $tr$["Polka", "Waltz", "Tango", "Ballroom in 3/4"]$tr$::jsonb),
('6a8b5ebe-787f-444b-8d38-a5085cf1564c', $tr$What is the climax?$tr$, $tr$["The highest point of the conflict", "The beginning of the play", "The introduction of the characters", "Only the ending"]$tr$::jsonb),
('6aacf01b-0bfd-4ba6-8c42-0e301a85c2f1', $tr$What is a kundiman?$tr$, $tr$["A semi-classical love song", "Just a type of dance", "Just an instrument", "Just a game"]$tr$::jsonb),
('6ad613a9-deb2-4a76-a31d-946808758618', $tr$What is movement in visual arts?$tr$, $tr$["A way of guiding the viewer's eye", "Only how fast the art is made", "Only the sound you hear", "Only the price of the artwork"]$tr$::jsonb),
('6add1b6b-318b-419d-abfd-330f91e7577d', $tr$Why is immunity important?$tr$, $tr$["To fight off diseases", "It has no use", "It causes disease", "It is not a real idea"]$tr$::jsonb),
('6b1c27b4-8d9d-4e16-9fc1-7d82992c373f', $tr$What is the goal of this MAPEH activity?$tr$, $tr$["To use musical form in a project", "No goal", "To entertain the teacher", "To replace math"]$tr$::jsonb),
('6b7ee7d0-419c-4e47-b1e6-5ac20c0fd85d', $tr$What is a rhythmic pattern?$tr$, $tr$["A mix of long and short sounds", "Just one instrument", "Just the singer's name", "Just a type of dance"]$tr$::jsonb),
('6b8a53cd-30ee-4800-be11-9608993abce7', $tr$What is a street dance festival?$tr$, $tr$["A yearly event of dancing in the streets", "A kind of game at home", "A kind of food", "A punctuation mark"]$tr$::jsonb),
('6c0b9212-74be-4a6b-b8d4-3d016cfc4186', $tr$What medium was used in visual arts during this time?$tr$, $tr$["Painting and sculpture", "Digital pictures", "Movies", "Music only"]$tr$::jsonb),
('6d23266e-c890-451e-97eb-4d28cecd30b5', $tr$Why teach it to children?$tr$, $tr$["To pass the culture on to the next generation", "It doesn't need to be taught", "Only for older people", "No effect"]$tr$::jsonb),
('6dafa267-218d-450e-b320-768aa8cb5d28', $tr$Which is an example of a net/wall game?$tr$, $tr$["Badminton", "Baseball", "Softball", "Patintero"]$tr$::jsonb),
('6dc5774a-914e-4bdb-95bf-874dda059d6a', $tr$Why is medicine considered safe when used correctly?$tr$, $tr$["Because it is used with the right dose and for the right purpose", "Because all medicine is safe no matter how it is used", "Because medicine has no effect", "Because medicine doesn't need to be watched"]$tr$::jsonb),
('6e03972f-5d32-4380-adf4-a91830991858', $tr$What is agility?$tr$, $tr$["The ability to move fast and change direction", "The ability to stay quiet", "The ability to eat fast", "The ability to sleep deeply"]$tr$::jsonb),
('6e13a687-4f2e-4765-a50e-8a99671c1ee4', $tr$What is fielding?$tr$, $tr$["Catching or getting back the ball after it is hit", "Starting the game at the net", "Running to a base", "Sending the ball into the air"]$tr$::jsonb),
('6e458c42-2324-4cb5-a711-6632e84d2205', $tr$What is the chain of infection?$tr$, $tr$["The process of how a disease spreads", "A kind of medicine", "A kind of exercise", "A vaccine"]$tr$::jsonb),
('6e9d13a5-a7ff-4b58-a055-2ddfcd3d1630', $tr$What is perceiving in art?$tr$, $tr$["Understanding shape, light, and shadow", "Selling a work of art", "Writing the title of a picture", "Throwing away old things"]$tr$::jsonb),
('6ed16387-108f-4316-9f8b-03d4790408e7', $tr$What is the difference between drawing and painting?$tr$, $tr$["Drawing uses a pencil; painting uses color", "Both use only color", "Both use only a pencil", "There is no difference at all between the two"]$tr$::jsonb),
('6ed767c4-17ff-42a6-82ad-5655c200925f', $tr$Why is it important to actually carry out the plan, not just plan it?$tr$, $tr$["To experience the real benefits of exercise", "Planning alone is enough", "It has no extra benefit", "Only the planning matters"]$tr$::jsonb),
('6f662c57-c556-48e2-9217-da2c01370843', $tr$Why do you need to get equipment ready before the wellness day?$tr$, $tr$["So the activity is orderly and ready", "It doesn't matter for the activity", "Only to make time go faster", "You don't need to prepare anything"]$tr$::jsonb),
('6fabfbfd-8377-4f87-bdf0-c602d059fa5d', $tr$What is another right to health of a child?$tr$, $tr$["Medical care", "No right to health", "Only the right to work", "The right not to eat"]$tr$::jsonb),
('705911e2-b28e-44bf-82ef-dfb7778cddbe', $tr$What is a balanced meal?$tr$, $tr$["A meal with carbohydrates, protein, vegetables, and fruits", "Only rice", "Only sweet food", "Only one kind of drink"]$tr$::jsonb),
('715edd47-0d3f-4076-a6a2-7d0c302497fd', $tr$What is the main goal of playing these games as a family?$tr$, $tr$["Keeping the whole family healthy", "Giving money as a prize", "Lowering grades in school", "Making housework harder"]$tr$::jsonb),
('7175eadf-7a1e-44be-8479-19d374480540', $tr$What will we study next term?$tr$, $tr$["Commonwealth Period and Sexual/Reproductive Health", "No more topics", "Just something else", "Nothing"]$tr$::jsonb),
('7210fe83-8bdd-4bfe-8abc-5d267bec411f', $tr$Which food group includes vegetables and fruits?$tr$, $tr$["Vitamins and minerals", "Only carbohydrates", "Only protein", "Only fat"]$tr$::jsonb),
('7217fa0f-4098-49f2-ad2e-8c67bed36a97', $tr$Why is it important to be a smart shopper?$tr$, $tr$["It helps you avoid being cheated or buying poor-quality products", "It has no value", "Just buy without thinking", "It doesn't matter"]$tr$::jsonb),
('7219b651-ca1d-4fe9-b0df-7d9141a5f7a0', $tr$Why is sanitation important?$tr$, $tr$["To prevent the spread of disease", "It is not important", "It causes disease", "It is not connected to health"]$tr$::jsonb),
('73e5c7af-cc65-499a-af63-7a53844a46d5', $tr$In Patintero, what does a player do?$tr$, $tr$["Crosses the lines without getting caught", "Throws a ball at the other team", "Runs away from the play area", "Sits in the middle of a line"]$tr$::jsonb),
('74b5b7a6-47ad-44fe-8554-f33a79a3ca0d', $tr$Who performs the Singkil?$tr$, $tr$["The Maranao", "The Ilokano", "The Bisaya", "The Tagalog"]$tr$::jsonb),
('74dbb9f8-536e-4186-a044-6854c6b71d8f', $tr$What goes along with dance exercise?$tr$, $tr$["Music", "Book", "Computer", "Pencil"]$tr$::jsonb),
('75002bf6-5b41-41a1-9892-cb1ddacf55e1', $tr$What idea do rhythm and tempo show in music?$tr$, $tr$["The speed and pattern of sound", "The price of an instrument", "The color of clothes", "The size of the stage"]$tr$::jsonb),
('7506828f-350e-4c04-b67a-58f83c9591c2', $tr$What is stress?$tr$, $tr$["The body's natural response to a challenge", "A kind of serious illness", "A feeling that is always bad", "Not having enough food"]$tr$::jsonb),
('7591b87a-0b6d-4767-8d8a-c71ca4e03cd8', $tr$What is a trait of a healthy family?$tr$, $tr$["Open communication", "Not talking to each other", "Always fighting", "No rules"]$tr$::jsonb),
('75f60800-027d-4438-84e2-587b91c35753', $tr$What will we do with the activity this week?$tr$, $tr$["Actually carry out the plan", "Just forget the plan", "Start planning all over again", "Stop the activity"]$tr$::jsonb),
('765d976a-5435-4994-a17f-86a88495c3ca', $tr$In Tumbang Preso, what do you aim at?$tr$, $tr$["The standing can", "The round line", "The tall tree", "The open door"]$tr$::jsonb),
('7663c2bf-f6be-4ce5-a2fe-d17acba57cc1', $tr$What is the 4/4 time signature called?$tr$, $tr$["Common Time", "Waltz Time", "Free Time", "Simple Time"]$tr$::jsonb),
('769ec4b7-ba9c-428c-a54d-044b1c80874d', $tr$How does the term show a balance of health and culture?$tr$, $tr$["It brings together physical health and the arts", "Only one matters", "No connection", "Not a real theme"]$tr$::jsonb),
('773560db-130c-4a1e-9726-bce3c5eba3f2', $tr$Why show what you learned all term?$tr$, $tr$["It shows progress", "It has no value", "No longer needed", "It's over anyway"]$tr$::jsonb),
('77c9b666-ae7f-4e8f-9191-3d5ce39745f9', $tr$What happens if you don't follow the signal?$tr$, $tr$["It will be hard to keep up with changing partners", "Nothing happens", "You win automatically", "All the music stops"]$tr$::jsonb),
('77d92c22-fa99-4f38-89db-72d7a0ef9d3c', $tr$How does the music help?$tr$, $tr$["It gives a tempo to follow", "It has no role in the dance", "It is used only as noise", "It stops the dance"]$tr$::jsonb),
('77dbbb8a-96bc-482c-88ac-8aa97e888b09', $tr$What is observing in art?$tr$, $tr$["Looking closely at your surroundings before drawing or painting", "Selling artwork", "Cleaning art materials", "Giving a picture a name"]$tr$::jsonb),
('78441a84-2203-4b6a-998e-89b52f11f60d', $tr$What is a communicable disease?$tr$, $tr$["A disease that spreads among people", "A disease that does not spread", "A kind of vitamin", "A kind of exercise"]$tr$::jsonb),
('791b7e46-32a2-44ef-bfa7-3cb174d7ad5f', $tr$What is the difference between striking/fielding and net/wall games?$tr$, $tr$["Striking/fielding has hitting and running; net/wall has a barrier", "Both have no ball", "Both are only played while sitting", "There is no difference between the two"]$tr$::jsonb),
('79448b77-7798-4759-a1cd-65879e3b3166', $tr$Why is a warm-up important before playing invasion games?$tr$, $tr$["It helps prevent injuries to the body", "It makes the game end faster", "It adds points for the team", "It makes playing time shorter"]$tr$::jsonb),
('799eb597-1080-4397-bd86-9836fd3c2f7d', $tr$What concept did we learn in PE — Invasion Games?$tr$, $tr$["Agility, balance, and coordination", "Only history", "Only math", "We learned nothing"]$tr$::jsonb),
('79afe0bc-285f-4027-bf63-0e43d79655b0', $tr$Why is this week important for Term 2?$tr$, $tr$["Last week of Term 2", "Only the first week", "It has no value", "Not part of Term 2"]$tr$::jsonb),
('79cb1cc8-6ec8-400c-8470-9531207e77bb', $tr$What do plays and dances inspired by legends show?$tr$, $tr$["A story through movement and costumes", "No story", "Only modern technology", "Business laws"]$tr$::jsonb),
('7b5a59a2-ad65-484e-bed8-bf1d4859a8c4', $tr$What three subjects are we combining this week?$tr$, $tr$["Dance, health, and art", "Math, science, and language", "History, geography, and agriculture", "Music only"]$tr$::jsonb),
('7b6f1263-859f-40f7-aa71-5ddd66dacaa6', $tr$What is the chain of infection?$tr$, $tr$["The process of how disease spreads", "A kind of medicine", "A kind of exercise", "A vaccine"]$tr$::jsonb),
('7b92e0a2-ec94-49c3-a974-3be07a67c258', $tr$Which part of a song tells a story?$tr$, $tr$["Verse", "Chorus only", "Rhythm only", "None of these"]$tr$::jsonb),
('7c4d2a9a-f1f2-46af-b6fc-88826bd95419', $tr$What is dance exercise?$tr$, $tr$["Exercise that uses dance steps", "Only a kind of game", "A kind of food", "A punctuation mark"]$tr$::jsonb),
('7cc3227b-06f4-4cb3-b33c-a86871ae6196', $tr$Difference between melody and rhythm?$tr$, $tr$["Melody is the tune; rhythm is the pattern of long and short beats", "They are just the same", "There is no difference", "Rhythm is about the tune"]$tr$::jsonb),
('7d0b47ba-f3a8-494e-b6b3-9dc40081194b', $tr$Why is it important to learn to dance in different time signatures?$tr$, $tr$["It widens musical and physical skills", "It has no value", "There is no need to learn it", "Only to entertain the teacher"]$tr$::jsonb),
('7d963562-ddd8-46fd-bd52-6445b3aa55dd', $tr$Why is it important to combine dance, health, and art in one activity?$tr$, $tr$["It shows how different lessons are connected in life", "It has no meaning at all in our real lives", "It only makes learning harder for kids", "It is done only to get a grade"]$tr$::jsonb),
('7e650dd1-bf48-4769-a3e5-63327578dd9d', $tr$Why is it important to eat different kinds of food?$tr$, $tr$["For a healthy body", "It has no value", "As long as it's a lot, it's okay", "Different kinds don't matter"]$tr$::jsonb),
('7e6a2f3a-8bf7-4c9c-9a35-34efcfee0188', $tr$What is the goal of striking/fielding games?$tr$, $tr$["Hit the ball and run to the bases", "Get the ball into a target", "Send the ball over the net", "Just stay in one place"]$tr$::jsonb),
('7e7c5577-dcf3-41e2-b676-82f494b89fa0', $tr$What is a chorus in a song?$tr$, $tr$["The part that repeats and is usually remembered best", "The part that changes each time", "The part with no tune", "An instrument only"]$tr$::jsonb),
('7f00d319-9730-498a-8fb3-f1ddbdeef902', $tr$A song has a 3/4 time signature. How many beats are in each measure?$tr$, $tr$["3 beats", "4 beats", "2 beats", "6 beats"]$tr$::jsonb),
('7f17b016-5224-4707-93f4-ce81874335d2', $tr$What does the Tinikling show?$tr$, $tr$["The tikling bird", "A kind of tree", "A kind of fish", "A kind of sea animal"]$tr$::jsonb),
('7f5e94bd-8b39-4883-a7d8-b9d38ff8682f', $tr$How do lines create movement in a picture?$tr$, $tr$["They guide the eye in one direction", "They make the picture darker", "They take color away from the picture", "They have no effect on the picture"]$tr$::jsonb),
('7fa36441-1522-4ca6-be1f-b4e33c9073b0', $tr$What does the visual art in the activity show?$tr$, $tr$["It reminds us why health is important", "It has no real purpose", "It is only a decoration", "It is not part of the activity"]$tr$::jsonb),
('7fa63533-1066-4d48-9c35-cb01bc954e1d', $tr$Why is holistic wellness important?$tr$, $tr$["It takes care of your whole self", "There is no reason", "It is only for grades", "It is useless"]$tr$::jsonb),
('7fa8c6bf-4232-489a-9d93-d1dc265f63f4', $tr$Why are vapes dangerous?$tr$, $tr$["They contain nicotine, which causes addiction", "They have no nicotine", "They are safe at any age", "No effect"]$tr$::jsonb),
('805ed677-8074-4938-a042-6bfd6abb84d0', $tr$What happens in a social dance mixer?$tr$, $tr$["Dancers keep changing partners", "Dancers stay with one partner", "No partners", "Just sitting down"]$tr$::jsonb),
('80c36125-f30f-4e66-9583-8e013e79dcad', $tr$Which is a healthy way to deal with stress?$tr$, $tr$["Talking to someone you trust", "Hiding all your feelings", "Staying away from everyone", "Hurting your classmates"]$tr$::jsonb),
('811ca662-b25b-46d8-9d08-b4342b8fae82', $tr$Which of the things we learned is linked to family health?$tr$, $tr$["The traits of a healthy family", "Only the history of our country", "Only the rules in math", "The news shown on television"]$tr$::jsonb),
('814173af-e85b-4936-9aaa-d51efc5a5ada', $tr$Why are legends included in artworks?$tr$, $tr$["Another way to appreciate the story", "No reason", "No need to read them", "Harder to understand"]$tr$::jsonb),
('8195734d-bd5f-4a42-9e83-64a6a6ce3806', $tr$What is one example of a wellness activity we studied?$tr$, $tr$["A dance-for-health session with visual art", "A math exam", "A letter to write to a parent", "An activity about farming"]$tr$::jsonb),
('81bc54d4-30b3-4176-a25f-6f54f9acd491', $tr$Besides exercise, what else do we learn from Filipino games?$tr$, $tr$["Teamwork and respect for playmates", "Being smarter in class", "Having lots of money", "Avoiding all chores"]$tr$::jsonb),
('82a814fe-f14d-4e1d-9747-1818f6f870df', $tr$What do cigarettes do to the body?$tr$, $tr$["Damage the lungs and cause addiction", "Make the lungs stronger", "No effect", "Improve health"]$tr$::jsonb),
('82efc7ff-b6e2-414a-850a-86e4f57c84ad', $tr$Who is responsible for making sure a child's right to health is met?$tr$, $tr$["Family, community, and government", "No one", "Only the child", "Only strangers"]$tr$::jsonb),
('834f8291-5d26-47b7-a7f7-5b269ab7ceda', $tr$Which is an example of an EMOTIONAL change while growing up?$tr$, $tr$["Deeper feelings and mood changes", "A child getting taller while growing up", "A change in a child's hair color", "A child's feet getting bigger while growing up"]$tr$::jsonb),
('83641f4b-59b8-4529-9e73-97241abc8b7e', $tr$Why teach food literacy?$tr$, $tr$["To learn to choose healthy food", "It has no purpose", "It is not linked to health", "Only for adults"]$tr$::jsonb),
('8381e89a-36b8-42a8-810a-c08bdfa24d65', $tr$How do lines create movement in a picture?$tr$, $tr$["They guide the eye in one direction", "They make the picture darker", "They take color away from the picture", "They have no effect on the picture"]$tr$::jsonb),
('83a5c312-b2a0-453f-8646-c7d66b60147b', $tr$In Langit-Lupa, how does a player avoid the tagger?$tr$, $tr$["Jumps above or below the line", "Runs very far away", "Just sits on the ground", "Hides behind a tree"]$tr$::jsonb),
('83bba299-e9b5-4dba-84a5-d87fa8316e55', $tr$A consumer's right to choose?$tr$, $tr$["Choose what you want to buy", "No right to choose", "Buy only one", "It is not a right"]$tr$::jsonb),
('841684d5-f705-4fbc-ae0e-db7c456c3253', $tr$How is a song different from a children's poem?$tr$, $tr$["A song has a tune; a poem is only read", "They are alike", "There is no difference", "A poem has a tune too"]$tr$::jsonb),
('841cc6f1-31b8-49e0-b69e-dd64fd9727ac', $tr$Why is it important to show what you learned all term?$tr$, $tr$["It shows progress in your dance skills", "It has no value", "There is no need to show it", "As long as the term is over"]$tr$::jsonb),
('84297293-c9fa-4ee0-ba2a-2ace13f3c557', $tr$What is the Pasyon?$tr$, $tr$["It is sung during Holy Week", "A fiesta dance", "A musical instrument", "A type of clothing"]$tr$::jsonb),
('84610a14-bed5-4fac-a42a-21c503119bda', $tr$What did we learn about the dramatic structure of a play?$tr$, $tr$["Exposition, conflict, climax, and resolution", "Only one part", "We didn't learn anything about it", "Only the history of plays"]$tr$::jsonb),
('84738c79-3683-422c-b713-a1718d76c90f', $tr$What is the Sinulog?$tr$, $tr$["A prayer dance for the Santo Niño", "A dance only at Christmas", "A dance only at weddings", "A dance only at graduation"]$tr$::jsonb),
('847a147c-e735-4eda-9e70-535a65cce0ec', $tr$What did we learn about Filipino games in PE?$tr$, $tr$["They build physical skills while we value our culture", "We didn't learn anything about it in this activity", "They are just a kind of fun with no value in this situation", "They are never part of MAPEH"]$tr$::jsonb),
('84b238e2-d4b9-4039-9fcf-7653cf607713', $tr$Why is preventing disease in the community an important topic?$tr$, $tr$["It helps protect everyone's health", "It has no effect on the community", "It is only a personal issue", "It is not related to community health"]$tr$::jsonb),
('84bee18b-be24-4eaf-8700-c15e75d9121b', $tr$What is the benefit of a culminating activity in MAPEH?$tr$, $tr$["It puts the skills you learned together into one success", "No benefit", "Just for fun", "Not part of learning"]$tr$::jsonb),
('84f78c8f-dba3-401f-8307-b46f47069e08', $tr$Why is it important to change the speed and direction of your shots?$tr$, $tr$["So the opponent cannot guess your next move", "To make the game faster", "To make the ball easier to catch", "So you don't have to run anymore"]$tr$::jsonb),
('85960451-b697-44f8-853c-8d0b0ef0af68', $tr$Why did writers during the American period use symbols?$tr$, $tr$["Open protest was banned", "They had no idea what to write", "It was easier to do", "They just really liked symbols"]$tr$::jsonb),
('85b9199f-dd85-4f45-af56-e4328ca1f1e4', $tr$How is writing a song different from writing the children's poem we studied before?$tr$, $tr$["A song has a tune and musical form; a poem is only read", "They are just the same", "There is no difference between the two", "A poem always has a tune too"]$tr$::jsonb),
('85e55dbb-4909-4c68-a13e-1b45ec659e09', $tr$Why is it important to study all parts of MAPEH — music, arts, and PE?$tr$, $tr$["It helps us understand how art, health, and culture are connected", "We should really study only one of them", "It has no meaning in our whole life", "It is done only as a kind of fun"]$tr$::jsonb),
('85f90465-84d9-44aa-8555-2fb564f8033f', $tr$Why repeat the steps before performing?$tr$, $tr$["So the performance goes well", "It is not needed", "Just to get tired", "No effect"]$tr$::jsonb),
('8615b0fd-b206-499c-849d-4d7326d6ef88', $tr$Where do many local dances and plays come from?$tr$, $tr$["Legends and folktales", "Modern technology", "Business laws", "Kinds of food"]$tr$::jsonb),
('878b9d1c-45da-4879-8a37-2a1e247f5e1d', $tr$What time signature was used in the rhythmic dance?$tr$, $tr$["2/4", "6/8", "9/4", "None"]$tr$::jsonb),
('878baf08-b965-4914-8eda-40b17c29e190', $tr$Why practice timing with the music?$tr$, $tr$["So the moves are smooth", "It is not needed", "To make the time longer", "It has no connection"]$tr$::jsonb),
('879ca328-b8b9-4d93-a416-9492c307da05', $tr$What is binary form in music?$tr$, $tr$["Two parts (A-B)", "Only one part", "Three parts", "No form at all"]$tr$::jsonb),
('87b7edc6-e468-4286-9a00-70ed7d6aed45', $tr$What does this kind of art show, even during oppression?$tr$, $tr$["The cleverness and courage of Filipinos", "Filipinos having no talent", "The fear of Filipinos", "No interest in art"]$tr$::jsonb),
('87b87151-230f-4e94-b4a2-38c768649aff', $tr$What is movement vocabulary?$tr$, $tr$["The set of movements used in a dance", "A list of words in a play", "The name of a dancer", "The color of a costume"]$tr$::jsonb),
('891fb08b-e9d8-4f07-a97e-33ea8c24ca8e', $tr$What do we call an activity that puts together what you learned at the end of a unit?$tr$, $tr$["Culminating activity", "Opening lesson", "Just a test", "Just a review"]$tr$::jsonb),
('892aec71-dfa3-4176-90b1-51fb1bcc9418', $tr$Which is an example of a PHYSICAL change while growing up?$tr$, $tr$["Getting taller", "Changing your opinion of a friend", "Getting angry more easily", "Becoming shyer around everyone"]$tr$::jsonb),
('89482264-0fc9-4a92-87de-c28d89a5f67f', $tr$What does the top number in a time signature show?$tr$, $tr$["How many beats are in each measure", "What note gets one beat", "How many singers there are", "How long the whole song is"]$tr$::jsonb),
('89a6749e-ec4d-4e80-b233-25ef9ced647c', $tr$What is tempo in music?$tr$, $tr$["The speed of the music", "The loudness of the sound", "The length of the song", "The name of the composer"]$tr$::jsonb),
('89d1909d-1036-4aea-8df7-ca6b75ada59d', $tr$What are the 8Rs?$tr$, $tr$["Ways to cut down on trash in the environment", "Eight new diseases", "Eight vaccines", "Eight kinds of exercise"]$tr$::jsonb),
('8a14f971-46b0-430d-8786-11fd605e606a', $tr$What is one part of a good plan for a wellness day?$tr$, $tr$["Choosing a game that fits all ages", "Running around with no plan", "Giving out tasks with no schedule", "Avoiding all equipment"]$tr$::jsonb),
('8a230b0f-19f9-42d5-9dc2-2079a6e40b2d', $tr$What is meter in music?$tr$, $tr$["The pattern of beats in each measure", "Only how fast the music is", "Only how loud the sound is", "Only a type of instrument"]$tr$::jsonb),
('8a35dff8-97d3-4c24-a466-8b1dfaf5eeec', $tr$Which is an example of a carbohydrate?$tr$, $tr$["Rice", "Fish", "Vegetables", "Only water"]$tr$::jsonb),
('8ab30831-2341-4604-a669-1bdba8167d85', $tr$A badminton player always gets stuck in the middle of the court, so they are late for shots to the sides. What is the BEST solution?$tr$, $tr$["Go back to the ready position right after every shot", "Always stay at the side of the court", "Stop playing badminton", "Just wait for each of the opponent's shots"]$tr$::jsonb),
('8b2caf84-1c0c-48a4-a5b7-abaeee31ca91', $tr$What question should you answer when you reflect after the activity?$tr$, $tr$["What did I learn from combining dance, health, and art?", "What is my favorite color in this activity?", "How old am I now?", "What do I want to eat right now?"]$tr$::jsonb),
('8b4c83bb-347f-42b1-9819-23e5d45eea98', $tr$How can art be connected to a health campaign?$tr$, $tr$["By making visual materials about health", "By avoiding all art activities", "Art has no connection to health", "By stopping all exercise"]$tr$::jsonb),
('8c55ddeb-199d-47d3-b6ac-29f2ac953b94', $tr$In kickball, the fielder always catches your kick. What is the BEST change to make?$tr$, $tr$["Send the ball to an open space", "Always kick it harder", "Run before you kick it", "Wait for an easier ball"]$tr$::jsonb),
('8ccde217-cfbd-4760-aef3-794ccb96fe70', $tr$How is the tempo of 3/4 different from 2/4 time?$tr$, $tr$["3/4 is gentler than 2/4", "They are just the same", "3/4 is faster", "There is no difference"]$tr$::jsonb),
('8cddeb67-a7e5-4561-8ddd-3e43c3b9c748', $tr$Where do local dances and plays come from?$tr$, $tr$["Legends and folktales", "Modern technology", "Business laws", "Kinds of food"]$tr$::jsonb),
('8cfd74ef-2efb-49a1-8f17-b08039109537', $tr$What would you do if you forgot to take your medicine at the right time?$tr$, $tr$["Ask a parent or doctor what to do", "Take a double dose right away", "Just forget about taking it", "Take a different medicine with the same color"]$tr$::jsonb),
('8d061432-2369-4eac-a036-696c766f652a', $tr$What is the goal of practicing in 2/4 time?$tr$, $tr$["To learn to keep up with the tempo of fast music", "To learn to write", "To learn to play basketball", "To learn math"]$tr$::jsonb),
('8d061bf2-9a11-4f0f-b36f-99ef46bccfa8', $tr$Why is it important to repeat the steps before performing?$tr$, $tr$["So the performance is smooth and steady", "There is no need to repeat them", "Just to tire out the group", "It has no effect"]$tr$::jsonb),
('8d14e20b-88aa-4ae7-8bc9-4a4e4d53ba6f', $tr$Where do the dancers usually stand before starting?$tr$, $tr$["In a circle or line with a partner", "Sitting on the floor", "Hiding at the back of the room", "With their backs to each other"]$tr$::jsonb),
('8d319ce3-7528-431b-a3af-5530cd6726cd', $tr$What dance was used?$tr$, $tr$["Social dance mixer in 2/4 time", "A new dance not learned yet", "No dance", "A dance from another country"]$tr$::jsonb),
('8d89a689-8638-4ef7-b923-86247f8672c8', $tr$Why is it important to do dance exercise?$tr$, $tr$["It's fun while keeping you active and healthy", "It's not important", "It's not real exercise", "It makes the body weaker"]$tr$::jsonb),
('8db1377b-5948-4768-a488-9d9cddd91ea7', $tr$What dance will be used in the performance?$tr$, $tr$["Social dance mixer in 2/4 time", "A new dance not learned yet", "No dance, just a song", "A dance from another country"]$tr$::jsonb),
('8dc0ac51-856a-4715-93f2-3cd1a44c4409', $tr$Why are native rituals considered art?$tr$, $tr$["They use rhythm and movement", "They have no color or design", "They are done only randomly", "They do not show culture"]$tr$::jsonb),
('8e234438-f7bf-4ca4-88a5-5f505c263242', $tr$What does learning different traditional dances bring?$tr$, $tr$["A deeper understanding and appreciation of the country's culture", "Nothing", "It is only confusing", "It gives no new knowledge"]$tr$::jsonb),
('8e5ec8fb-587c-4314-8fc9-47d613431481', $tr$Difference between 2/4 and 3/4 time?$tr$, $tr$["Two beats in 2/4, three in 3/4", "They are just the same", "There is no difference", "3/4 has two beats"]$tr$::jsonb),
('8e8459de-353e-49a5-8a14-28b09566ad91', $tr$A song slows down its tempo in the middle. What is the likely effect on the listener's feelings?$tr$, $tr$["It makes the feeling sadder or more peaceful", "It makes it happier and livelier", "It has no effect on feelings", "It makes the sound louder"]$tr$::jsonb),
('8ee817ba-5124-414e-ac5f-772894555f08', $tr$Why use music?$tr$, $tr$["Tempo and fun while moving", "It has no use", "It just makes exercise harder", "It is not needed"]$tr$::jsonb),
('8ef31341-82a3-4b8f-92b6-fc983921706a', $tr$What were plays about during this time?$tr$, $tr$["Church rituals and the lives of saints", "Only current news", "Only modern science", "Only world wars"]$tr$::jsonb),
('8f1e9a9c-7f2d-4ec5-95bb-836fcf804ac1', $tr$What is dance exercise?$tr$, $tr$["Exercise that uses dance steps", "Only a kind of game", "A kind of food", "A punctuation mark"]$tr$::jsonb),
('8f200d87-11c2-49b0-adb2-627197683fe0', $tr$Why be a smart shopper?$tr$, $tr$["To avoid being cheated or getting poor quality", "It has no value", "Just buy without thinking", "It doesn't matter"]$tr$::jsonb),
('8f6727b6-c6ce-432e-bc52-948a74ccd7de', $tr$Which game best trains hand-eye coordination using sticks?$tr$, $tr$["Bati-Cobra", "Tumbang Preso", "Tamaang-Tao", "Batuhang Bola"]$tr$::jsonb),
('8f83ac75-377c-44a2-ad71-2c6500230fef', $tr$Which one is a locomotor skill?$tr$, $tr$["Running", "Throwing", "Catching", "Kicking"]$tr$::jsonb),
('8ff77688-0dfd-498a-b035-405f31b7df3d', $tr$Which group has vegetables and fruits?$tr$, $tr$["Vitamins and minerals", "Only carbohydrates", "Only protein", "Only fat"]$tr$::jsonb),
('8ffe9a0c-739d-4e55-b54a-f6b3dfa12651', $tr$What period of history was covered in Music/Art this term?$tr$, $tr$["Early Spanish Colonial Period", "American period", "Present day", "Before the Spanish arrived"]$tr$::jsonb),
('900b7627-2ecd-4736-94bb-aa7dfc95de05', $tr$How is it connected to traditional dance?$tr$, $tr$["Both express identity in different times", "No connection", "One is about science", "One is about math"]$tr$::jsonb),
('90198066-c8f0-4474-84d3-19e43e42e9f5', $tr$What is pass and move on offense?$tr$, $tr$["Moving right away after passing the ball", "Staying in place after passing", "Passing the ball over and over", "Holding the ball for a long time"]$tr$::jsonb),
('903ebe90-7142-4885-ba64-ebae00014300', $tr$What is a beat?$tr$, $tr$["Steady pulse of the music", "A slow song", "A musical instrument", "Title of a song"]$tr$::jsonb),
('904faa5a-98f1-418c-8fe5-2e805b2d3de7', $tr$Oldest festival in the Philippines?$tr$, $tr$["Ati-Atihan", "Sinulog", "Dinagyang", "MassKara"]$tr$::jsonb),
('90b287fd-44b7-49cf-829f-8c9880c983f3', $tr$What did we learn from making our own song?$tr$, $tr$["Using musical form in a project", "Making a business investment", "Calculating probability", "Writing an outline"]$tr$::jsonb),
('90d6d7d4-9d1e-4ef7-86f8-b5b71e6885e8', $tr$Why do religious dances use rhythmic patterns?$tr$, $tr$["To show the meaning of the ceremony", "Just to make time go faster", "To make it hard for the dancer", "To make the dance meaningless"]$tr$::jsonb),
('910c6a66-aa08-472a-b0e2-ef267d5703c0', $tr$What is printing in art?$tr$, $tr$["Making many copies from one template", "Drawing with just one pencil", "Painting with just one color", "Carving into a piece of wood only"]$tr$::jsonb),
('91dcb9e2-2077-4b7e-9f27-1763cbccd005', $tr$What is One Health?$tr$, $tr$["The health of people, animals, and the environment are connected", "A kind of vaccine", "A kind of exercise", "A kind of medicine"]$tr$::jsonb),
('9293304e-5e86-4355-a301-ca5dbb439f28', $tr$Which is an example of good sanitation?$tr$, $tr$["Clean water and proper trash disposal", "Trash scattered everywhere", "Being careless with water", "Throwing trash in the river"]$tr$::jsonb),
('92acfa5a-f02b-4f95-899d-8cdc7605d839', $tr$Which one is an example of an invasion game?$tr$, $tr$["Basketball", "Archery", "Bowling", "Dart"]$tr$::jsonb),
('92e8db68-577d-456f-8fde-9e0d82eff7f3', $tr$What does the bottom number in a time signature show?$tr$, $tr$["What kind of note gets one beat", "How many beats are in each measure", "How many singers there are", "How long the whole song is"]$tr$::jsonb),
('9310c96e-4ca4-47c4-a72b-d50ae7972e13', $tr$Why is the chorus easy to remember?$tr$, $tr$["Because it repeats", "Because it is quiet", "Because it has no tune", "It is sung only once"]$tr$::jsonb),
('93f68d9a-c7a9-48d3-83a4-048e90fdc36d', $tr$What did we learn about the dramatic structure of a play?$tr$, $tr$["Exposition, conflict, climax, and resolution", "Only one part", "We didn't learn anything about it", "Only the history of plays"]$tr$::jsonb),
('940af28f-6794-427c-8320-c3b61c654cdc', $tr$Why are vapes dangerous even if they seem harmless?$tr$, $tr$["They contain nicotine, which causes addiction", "They have no nicotine", "They are safe at any age", "They cause no effects at all"]$tr$::jsonb),
('9410cbd0-ecc0-4cce-b12f-9f0f2eb1f3e3', $tr$Before you block a cyberbully, what should you do?$tr$, $tr$["Take a screenshot as evidence", "Delete the message right away", "Send it to everyone", "Reply in anger"]$tr$::jsonb),
('947d13d0-d829-4047-8b87-17ed8c108b8b', $tr$What benefit does dance exercise give?$tr$, $tr$["It improves coordination and balance", "No benefit", "It weakens the body", "It only makes you tired"]$tr$::jsonb),
('94cf7ae2-3c92-4778-b8b9-8595443ec32f', $tr$Why is traditional dance taught in MAPEH?$tr$, $tr$["To value and keep alive the culture of the Philippines", "It has no purpose", "It is only for older people", "It is not related to education"]$tr$::jsonb),
('94dbfec2-8e48-4bb5-b99f-9dd3b1be913f', $tr$Why is it important to review what we learned in MAPEH this term?$tr$, $tr$["It helps us remember and connect the ideas", "It is pointless for learning", "It is only done for grades", "It only confuses students"]$tr$::jsonb),
('94df38b7-a115-4366-b051-40e5395b9bbd', $tr$What does the visual art in the activity show?$tr$, $tr$["It reminds us why health is important", "It has no real purpose", "It is only a decoration", "It is not part of the activity"]$tr$::jsonb),
('95287b20-ceab-4f48-a0aa-f3ff9818caf3', $tr$What did we learn about the art and rituals of our ancestors?$tr$, $tr$["Rhythm/pattern and movement seen in native rituals", "We really learned nothing about it", "Just one kind of outdoor game", "Just one kind of cooked food"]$tr$::jsonb),
('95760c95-2bac-432d-90b1-000a77778192', $tr$What value is stressed here?$tr$, $tr$["The fun of getting along with others", "Being alone", "Competition only", "Losing"]$tr$::jsonb),
('95ae324b-5804-4ef4-9b0f-e11598f826eb', $tr$A badminton player always gets stuck in the middle, so they are late for shots to the sides. What is the solution?$tr$, $tr$["Go back to the ready position right after every shot", "Always stay at the side", "Stop playing", "Just wait for the opponent"]$tr$::jsonb),
('95f65068-5a2e-4112-827d-7a751aedacb1', $tr$Why teach movement exploration?$tr$, $tr$["To trust your own body", "It has no purpose", "To entertain the teacher", "It is not part of the curriculum"]$tr$::jsonb),
('95fa95f0-08b7-4174-a54a-cfbd31faa5a9', $tr$Why is rhythm important in ritual dances?$tr$, $tr$["It gives order and unity to the movements", "It has no meaning", "It is used only in games", "It only makes things take longer"]$tr$::jsonb),
('96259903-db43-47b8-bcba-8384d6fb23bd', $tr$Why is teamwork as a group important in choreography?$tr$, $tr$["It makes the presentation smoother and more together", "It has no value", "It's better to be alone", "A group is not needed"]$tr$::jsonb),
('96ab9140-393a-44a9-8f14-f9735a103077', $tr$What is rhythm?$tr$, $tr$["The pattern of sound and silence", "The color of the instrument", "The place of the concert", "The number of people watching"]$tr$::jsonb),
('96b29968-a0de-4829-8b9c-3eb78cf6561b', $tr$What will we do with the activity this week?$tr$, $tr$["Actually carry out the plan", "Just forget the plan", "Start planning all over again", "Stop the activity"]$tr$::jsonb),
('973a5bae-2999-4ea7-96d5-0afcc0ad4802', $tr$What is assertive behavior?$tr$, $tr$["Speaking clearly and with respect", "Staying quiet to avoid trouble", "Shouting and hurting others", "Avoiding every conversation"]$tr$::jsonb),
('9742294e-0a42-4c5b-a54a-c9a7eb335965', $tr$Which one is NOT part of musical form?$tr$, $tr$["Deposit slip", "Verse", "Chorus", "Melody"]$tr$::jsonb),
('97a98f95-6b55-4c50-89ad-9f8e3a5ce160', $tr$Why is it important to know the musical form of a song?$tr$, $tr$["It helps us understand how the song is arranged and its message", "It has nothing to do with understanding the song", "It is used only by professional musicians", "It is only for instruments"]$tr$::jsonb),
('97b306c6-15af-436f-8be8-6ae40f6f5d3d', $tr$Which is an example of a Filipino game we learned?$tr$, $tr$["Patintero and Agawan Base", "Chess and Checkers", "Basketball and Baseball", "Golf and Tennis"]$tr$::jsonb),
('983a515b-8f37-49fe-b80a-f9b88fb02bb9', $tr$What is an example of a dance mixer we learned?$tr$, $tr$["A modern dance done as exercise", "A kind of food", "A kind of farm tool", "A kind of computer program"]$tr$::jsonb),
('98868323-94de-4504-8e03-4fbdf3e32206', $tr$A student watches the senakulo every Holy Week (Semana Santa) in their town. What does this show?$tr$, $tr$["This traditional art is still alive", "This art is brand new", "It has no connection to history", "It is just a modern invention"]$tr$::jsonb),
('98c6f6e4-8794-420c-9020-c197bdc9c0c3', $tr$Goal of practicing in 2/4 time?$tr$, $tr$["Keep up with the tempo of fast music", "Learn to write", "Play basketball", "Learn math"]$tr$::jsonb),
('99116830-bed2-48a9-83aa-ae259a2d8c27', $tr$How is melody different from rhythm?$tr$, $tr$["Melody is the tune; rhythm is the pattern of long and short beats", "They are just the same", "There is no difference", "Rhythm is only about the tune"]$tr$::jsonb),
('9915ae64-6964-4bee-a354-88c5f1f309b8', $tr$What is printing in art?$tr$, $tr$["Making many copies from one template", "Drawing with just one pencil", "Painting with just one color", "Carving into a piece of wood only"]$tr$::jsonb),
('993a6208-26e3-4366-953c-75eac182fe6b', $tr$Why teach consumer health?$tr$, $tr$["To protect yourself as a shopper", "No purpose", "Not related to health", "Only for adults"]$tr$::jsonb),
('995d4308-2a6d-431e-9583-ab5e8e642327', $tr$Why is it important to understand the chain of infection?$tr$, $tr$["It helps prevent the spread of disease", "It has no use", "There's no need to understand it", "It is only about animals"]$tr$::jsonb),
('996d7641-25b4-48cc-9d6a-7d547920c322', $tr$What was theater about during this time?$tr$, $tr$["Religious subjects", "Political subjects", "Science subjects", "Business subjects"]$tr$::jsonb),
('99a510c0-4b5e-4ed1-8fc5-fe75c985b3e9', $tr$What is an example of a gateway drug?$tr$, $tr$["Cigarettes", "Milk", "Water", "Fruit"]$tr$::jsonb),
('99c17648-8509-4bbe-9101-7ffad12fafa9', $tr$What shows true sportsmanship in these games?$tr$, $tr$["Playing fairly even without a referee", "Winning by any means", "Reporting the opponent right away", "Not taking part in the game"]$tr$::jsonb),
('9a8b7d5c-e68a-43aa-90e2-93c591e0b727', $tr$Which medium puts color on a canvas or surface?$tr$, $tr$["Painting", "Drawing", "Engraving", "Observing"]$tr$::jsonb),
('9a8dcd07-a208-4955-88f9-4c177377a468', $tr$Which is a net/wall game?$tr$, $tr$["Pickleball", "Kickball", "Syato", "Running race"]$tr$::jsonb),
('9adadf4a-fbac-44c8-ba2c-044dd5d0931d', $tr$What is one way to avoid gateway drugs?$tr$, $tr$["Say 'No' with confidence", "Try it just once", "Follow a friend who uses them", "Hide it from your parents"]$tr$::jsonb),
('9ae22b40-b72d-4403-8943-e6f7eb91a891', $tr$A dance uses bamboo poles that are clapped together to a rhythm. What dance is it?$tr$, $tr$["Tinikling", "Waltz", "Cha-cha", "Ballet"]$tr$::jsonb),
('9b01fcc6-b775-4f18-8369-36f15570d061', $tr$Which dance uses a 3-beat pattern?$tr$, $tr$["Waltz", "Tinikling", "Cha-cha", "Boogie"]$tr$::jsonb),
('9b10c70b-74f1-469d-a1bc-8c75f830b569', $tr$Why did writers during the American period use symbols?$tr$, $tr$["Open protest was banned", "They had no idea what to write", "It was easier to do", "They just really liked symbols"]$tr$::jsonb),
('9b2e1857-2d62-4f00-9169-4a9b1fc8c3c5', $tr$Why is deep breathing important when you are stressed?$tr$, $tr$["It helps calm your body", "It adds points in a game", "It makes you gain weight", "It makes time go faster"]$tr$::jsonb),
('9bce0324-c470-4c64-9a49-54ebe2d5e174', $tr$Why are these substances called 'gateway' drugs?$tr$, $tr$["Because they can be the start of using more dangerous drugs", "Because they are safe and have no effect", "Because they are just a kind of gate or door", "Because they are banned only for adults"]$tr$::jsonb),
('9bdff8da-3193-4897-a24a-6cd5fd32af07', $tr$What is rhythm in the art of dance?$tr$, $tr$["Repeated movements or sounds", "Color of the clothes", "Name of the dance", "Number of dancers"]$tr$::jsonb),
('9c19871f-fb83-4c94-a073-778cdacbae90', $tr$A writer used a 'snake' character to show the foreign ruler. What is this called?$tr$, $tr$["Symbolism", "Direct protest", "Only the truth", "Daily news"]$tr$::jsonb),
('9c1e40e3-f639-4a27-9b31-523d3d1b46c0', $tr$What did we plan last week?$tr$, $tr$["A dance-for-health session with visual art", "A math exam", "A letter to a parent", "A farming activity"]$tr$::jsonb),
('9c382c1f-e57d-4ab3-ba1f-aa6d692b49b6', $tr$What are gateway drugs?$tr$, $tr$["Substances that can open the way to more dangerous drugs", "Just a kind of food", "Legal medicine with no effect", "A kind of vitamin"]$tr$::jsonb),
('9c6854dd-3be7-40c6-ba92-298cf987c1e8', $tr$What did we learn about family wellness this term?$tr$, $tr$["Planning and doing health activities for the family", "We didn't learn anything about it", "Just one kind of game in this activity", "Just one kind of food"]$tr$::jsonb),
('9d0f2fd2-1d9e-43fe-bc2a-943ea2f61e5f', $tr$What is the big lesson of this whole unit about dance, health, and art?$tr$, $tr$["They are connected and work together to support well-being", "They are not connected to each other", "Only one of them matters in this activity", "They have no real connection here now"]$tr$::jsonb),
('9da67e59-44e1-4961-88d2-60ad0c54274f', $tr$What is the goal of reflecting after doing the activity?$tr$, $tr$["To make what we learned from the experience stick", "To forget what we learned right away", "To close the topic without thinking", "To make a new activity right away"]$tr$::jsonb),
('9dc0b0ed-c8bd-4393-9810-73e818a3cab3', $tr$How did native and European dances mix?$tr$, $tr$["Free movements combined with formal steps", "No mixing happened", "Only Spanish dance was the basis", "Only native dance was the basis"]$tr$::jsonb),
('9dc65918-ddfe-4077-a7e0-fa6cc95d0fde', $tr$Goal of the practice?$tr$, $tr$["Build coordination", "Learn to read", "Learn math", "Play basketball"]$tr$::jsonb),
('9e94c870-3b86-42ba-a1f6-2f178fc75dc4', $tr$Why teach festivals in MAPEH?$tr$, $tr$["To value culture and history", "It has no purpose", "Only for older people", "Not related to education"]$tr$::jsonb),
('9eabaa2e-13c6-48b1-aae0-16f081a65f2b', $tr$The other team keeps stealing the ball because your team members are too close to each other. What is the solution?$tr$, $tr$["Spread out to make more space", "Bunch up even tighter", "Hold the ball for a long time", "Run back to your own goal"]$tr$::jsonb),
('9ecdb92d-0686-46b7-9d85-e4a737c8ed14', $tr$Why is coordination needed in these games?$tr$, $tr$["So your body movements work together correctly in the game", "So you can just sit on the side", "So you don't need to move anymore", "Coordination has nothing to do with the game"]$tr$::jsonb),
('9f458d93-66ff-463e-b490-238b78786c57', $tr$Why is movement exploration taught in PE?$tr$, $tr$["To help kids trust their own bodies", "It has no purpose", "Only to entertain the teacher", "It is not part of the curriculum"]$tr$::jsonb),
('9f483405-0b79-4241-b973-37054a84d256', $tr$Your playmate lost to you in Tatsing. What shows good sportsmanship?$tr$, $tr$["Greet them with respect", "Brag about your win", "Laugh at their loss", "Refuse to play the next game"]$tr$::jsonb),
('9f5c5d6b-ea05-4421-9776-0363e9e59312', $tr$What is one way to avoid gateway drugs?$tr$, $tr$["Say 'No' with confidence when someone offers them", "Try it just once to find out", "Follow a friend who uses them", "Just hide it from your parents"]$tr$::jsonb),
('9f77388a-5f16-4937-879a-7c0a5b273c0e', $tr$What should you do when you feel pressured to use something not allowed?$tr$, $tr$["Ask a parent or teacher for help", "Just go along with it", "Hide it from everyone", "Do it secretly"]$tr$::jsonb),
('9f8538c4-3808-4813-a04f-3c57c5c3c13f', $tr$What is coordination?$tr$, $tr$["Making different body parts work together in one movement", "Only the ability to sit quietly", "Only the ability to read very fast", "The ability to watch TV for a very long time"]$tr$::jsonb),
('a04141af-ad0d-4b60-bf01-19b4c93eecdf', $tr$How is dance exercise linked to physical health?$tr$, $tr$["Both help the body's physical health", "No link", "Dance exercise is only about music", "No effect on health"]$tr$::jsonb),
('a0c07f32-42d4-4452-909f-4976cbc0cc26', $tr$Where do the dancers usually stand?$tr$, $tr$["In a circle or line with a partner", "Sitting on the floor", "Hiding at the back", "With their backs to each other"]$tr$::jsonb),
('a0f14efe-4f76-4d2e-bb5f-e4d1a3562a90', $tr$What props are used in the Pandanggo sa Ilaw?$tr$, $tr$["Oil lamps on the hands and head", "Only bamboo poles", "Only an umbrella", "No props"]$tr$::jsonb),
('a1cead84-5237-4633-a48c-95b3feaec37e', $tr$Which is gentler?$tr$, $tr$["3/4 time", "2/4 time", "The same", "None"]$tr$::jsonb),
('a2155e45-a4b3-45df-8ffa-89c13a857711', $tr$Where is the Ati-Atihan held?$tr$, $tr$["Aklan", "Cebu", "Iloilo", "Manila"]$tr$::jsonb),
('a30fdb8b-fc90-4231-91b9-217655d82b1e', $tr$What is the goal of dancing in sync (together) in street dance?$tr$, $tr$["It shows the group's unity and skill", "It has no goal", "It only causes confusion", "It is not part of the festival"]$tr$::jsonb),
('a3cf8316-c578-40d6-b8cf-ef50ac87e994', $tr$Why is it important to study the art of this time?$tr$, $tr$["It shows how two cultures mixed", "It has no connection to today", "It is not done anymore", "It has no connection to the Philippines"]$tr$::jsonb),
('a3e408e3-701d-4d89-9a1b-c8fbf3cffa92', $tr$Why is water important in a balanced meal?$tr$, $tr$["The body needs water to work well", "Water has no value", "Water is not part of a meal", "Water is bad for the body"]$tr$::jsonb),
('a40d0889-b77a-4c95-b6e2-36682871d7c3', $tr$What is the goal in invasion games?$tr$, $tr$["Get into the other team's space while defending", "Stay in one place", "Just sit on the side", "Just wait"]$tr$::jsonb),
('a49000e7-867b-4366-ae60-c7669bf6fecd', $tr$How many beats are in 2/4 time?$tr$, $tr$["Two", "Three", "Four", "One"]$tr$::jsonb),
('a4db8fa8-6176-4e43-9465-34f190b695a4', $tr$Where is the Sinulog held?$tr$, $tr$["Cebu", "Aklan", "Iloilo", "Manila"]$tr$::jsonb),
('a4dbd248-52a7-4edd-a50f-8b8a4f391104', $tr$What comes from mixing traditional and modern moves?$tr$, $tr$["A special style that reflects the past and the present", "Nothing", "Only confusion", "It makes tradition disappear"]$tr$::jsonb),
('a516e735-fa5b-4bfe-b4eb-746e4f2211ce', $tr$How is this topic connected to the communicable diseases we learned before?$tr$, $tr$["Both are about preventing disease and caring for health", "The two have no connection", "One is only about science", "One is only about math"]$tr$::jsonb),
('a560b66b-ae00-4c21-9216-f3fa8de134f5', $tr$What is the first step in making your own song?$tr$, $tr$["Choose a simple topic", "Start singing with no plan", "Forget the verse and chorus", "Buy a new instrument"]$tr$::jsonb),
('a5be8183-efd3-4046-bba3-3f50ae731abf', $tr$A song has a 3/4 time signature. How many beats are in each measure?$tr$, $tr$["3 beats", "4 beats", "2 beats", "6 beats"]$tr$::jsonb),
('a6118498-3dbb-4934-8448-e00686932cad', $tr$How does this whole term show a balance of health and culture?$tr$, $tr$["It brings together physical health and valuing the arts", "Only one of them matters", "The two have no connection", "It is not a real MAPEH theme"]$tr$::jsonb),
('a6a264ab-3694-4a1b-8998-77ae9bd89cb8', $tr$Which one is an example of popular music in the Philippines?$tr$, $tr$["OPM", "Symphony", "Sonata", "Only kundiman"]$tr$::jsonb),
('a73173de-6479-4ef9-adce-6cb6cfcbd0d0', $tr$A church hymn has the same tune in every verse. Which form does this show?$tr$, $tr$["Strophic", "Binary", "Free-form", "No form"]$tr$::jsonb),
('a83ee5e7-d242-4728-a4f0-33ee077d1d5e', $tr$Which is an example of a net/wall game?$tr$, $tr$["Badminton", "Baseball", "Softball", "Patintero"]$tr$::jsonb),
('a89a50bd-a15e-4675-ba15-1eefff682e1a', $tr$Why is water important?$tr$, $tr$["The body needs it to work well", "It has no value", "It is not part of a meal", "It is bad for the body"]$tr$::jsonb),
('a8ce7f67-c023-4c8d-adb7-fe0c67ca3ba5', $tr$What is one way to break the chain of infection?$tr$, $tr$["Washing hands regularly", "Not caring about cleanliness", "Gathering together with no protection", "Forgetting to get vaccinated"]$tr$::jsonb),
('a8f6ca92-63f9-47e5-b2e2-8a412186b39d', $tr$In which game do players inside a circle dodge a thrown ball?$tr$, $tr$["Tamaang-Tao", "Batuhang Bola", "Bati-Cobra", "Tatsing"]$tr$::jsonb),
('a91a7ac9-b051-4d59-9c9a-b6594c4e9336', $tr$Why are the 8Rs taught to children?$tr$, $tr$["To be responsible in caring for the environment", "It has no purpose", "It is only for older people", "It is not related to health"]$tr$::jsonb),
('a952bad6-4b6c-40fe-932e-243c7f9ec4e9', $tr$What is the right tempo for harvest music played as a celebration?$tr$, $tr$["Fast", "Slow", "No sound", "Quiet"]$tr$::jsonb),
('a9b62f83-6970-4b8e-84d6-718b3cc20683', $tr$What did we learn about Filipino games in PE?$tr$, $tr$["They build physical skills while we value our culture", "We didn't learn anything about it in this activity", "They are just a kind of fun with no value in this situation", "They are never part of MAPEH"]$tr$::jsonb),
('aa863a37-556d-416c-9f5b-efcf7bf5c2de', $tr$What is OPM?$tr$, $tr$["Original Pilipino Music", "A kind of dance", "A country", "A kind of food"]$tr$::jsonb),
('aabbec1b-afea-4c73-9e47-e586a1e46960', $tr$Which is a striking/fielding game?$tr$, $tr$["Kickball", "Pickleball", "Wall ball", "Ringo"]$tr$::jsonb),
('ab2f8457-28eb-4132-8cd9-1423ebacd194', $tr$Why is valuing culture important in MAPEH?$tr$, $tr$["To keep Filipino identity alive", "Not related", "A separate topic", "Not part of education"]$tr$::jsonb),
('ab6ac355-2411-4114-ac3e-18d2dcba0672', $tr$Why is the body's immunity important?$tr$, $tr$["It helps fight off diseases", "It has no use", "It only causes disease", "It is not a real idea"]$tr$::jsonb),
('ab7c0911-1e5d-4d2d-93d6-52cde48a0033', $tr$What does planning a family health activity bring?$tr$, $tr$["It makes the household's bonds and health stronger", "It only weakens family bonds", "It has no benefit for the whole family", "It only causes fights at home"]$tr$::jsonb),
('abb191ff-af31-42b6-91a8-69e978029470', $tr$What does this kind of art show, even during oppression?$tr$, $tr$["The cleverness and courage of Filipinos", "Filipinos having no talent", "The fear of Filipinos", "No interest in art"]$tr$::jsonb),
('abb293d9-0419-4f54-83f7-f54ba419efa0', $tr$What is symbolism used for in these plays?$tr$, $tr$["Images to teach religious lessons", "New modern technology", "Only modern music", "Sports games"]$tr$::jsonb),
('ace6236f-37d0-47f2-98d9-a2191ba550be', $tr$What is a kundiman?$tr$, $tr$["A semi-classical love song", "Just a type of dance", "Just an instrument", "Just a game"]$tr$::jsonb),
('ad7b373a-113d-4b53-8845-224c4f3fe620', $tr$What is perceiving in art?$tr$, $tr$["Understanding shape, light, and shadow", "Selling a work of art", "Writing the title of a picture", "Throwing away old things"]$tr$::jsonb),
('ad97ebeb-579a-45eb-90fb-02c76e3850c4', $tr$What does the Singkil show?$tr$, $tr$["Maranao culture using bamboo poles and umbrellas", "Foreign culture", "Only a kind of game", "It has no meaning"]$tr$::jsonb),
('ada1c4b0-af96-4ea7-b73d-0e9a37c7d1d5', $tr$What is 'Reduce'?$tr$, $tr$["Cutting down on trash", "Adding more trash", "Hiding trash", "Burning trash"]$tr$::jsonb),
('ae04e069-c058-4923-83b6-3f99a00ecf23', $tr$Why is PE dance part of MAPEH?$tr$, $tr$["It supports health and the arts", "No purpose", "Not related to education", "Only for adults"]$tr$::jsonb),
('aebe9579-9b0a-4b46-b4cd-7165538bb4e7', $tr$What is the goal of improvising a rhythm?$tr$, $tr$["To create your own new pattern", "To just copy someone else's song", "To stay quiet the whole session", "To just read the lyrics"]$tr$::jsonb),
('aed18952-7795-4cc3-af4a-5e8b4dcf4890', $tr$What is the skill of saying no (assertiveness)?$tr$, $tr$["Being able to say \"no\" with confidence", "Being able to always agree with others", "Being able to always stay quiet", "Being able to avoid all conversations"]$tr$::jsonb),
('af51c461-f399-4f5c-a880-5d2f0024f394', $tr$Which of the things we learned is linked to family health?$tr$, $tr$["The traits of a healthy family", "Only the history of our country", "Only the rules in math", "The news shown on television"]$tr$::jsonb),
('af99f7f4-2a59-493e-9e3d-8ac7486f09c5', $tr$What does alcohol do to the body?$tr$, $tr$["Affects the brain and thinking", "Makes memory stronger", "No effect on the mind", "Improves eyesight"]$tr$::jsonb),
('afa85b56-3922-4beb-97e5-5a3e35b5a723', $tr$What is a social dance mixer?$tr$, $tr$["A dance where partners keep changing", "A kind of song", "A game with no music", "A kind of drawing"]$tr$::jsonb),
('b0046f83-8091-425c-a55a-8d7ff785f939', $tr$What is the goal of this week's practice?$tr$, $tr$["To build coordination when the tempo changes", "Only to learn to read", "To learn math", "To play basketball"]$tr$::jsonb),
('b029807c-b125-49d8-a0ed-c5e4ad4ca482', $tr$First part of the chain of infection?$tr$, $tr$["The source of the disease", "A new host body", "A vaccine", "The way in (portal of entry)"]$tr$::jsonb),
('b035dc70-5c66-4697-a84b-cc54eeaf77ab', $tr$What is one example of symbolic theater during this time?$tr$, $tr$["The cenaculo about the life of Christ", "Only modern movies", "Only TV shows", "Only an OPM concert"]$tr$::jsonb),
('b040b770-8903-4e9c-9a91-3e31f158f0b8', $tr$Which time period does this lesson cover?$tr$, $tr$["1521–1600", "1900–1950", "1898–1946", "1565–1600 only"]$tr$::jsonb),
('b086bbaf-6be9-44af-953a-3f074060d039', $tr$In net/wall games, where is the best place to send the ball?$tr$, $tr$["Into the opponent's open space", "To the closest part of the net", "To the same spot every time", "Outside the court"]$tr$::jsonb),
('b0aab133-bb7b-4493-ac2e-2bc90c2bb810', $tr$Why is rhythm important in ritual dances?$tr$, $tr$["It gives order and unity to the movements", "It has no meaning", "It is used only in games", "It only makes things take longer"]$tr$::jsonb),
('b0b4166b-7e38-4d79-89e6-f9cd87ab011f', $tr$In Patintero, what does a player do?$tr$, $tr$["Crosses the lines without getting caught", "Throws a ball at the other team", "Runs away from the play area", "Sits in the middle of a line"]$tr$::jsonb),
('b0fc5e7f-4b6d-4d87-88ba-9c81f45317c8', $tr$Why are street dance festivals taught in MAPEH?$tr$, $tr$["To value the culture and history of each region", "It has no purpose", "It is only for older people", "It is not related to education"]$tr$::jsonb),
('b13348e8-71ba-40c9-a39f-72d4256ec18d', $tr$Why is medicine safe when used correctly?$tr$, $tr$["Because it is used with the right dose and for the right purpose", "All medicine is safe no matter what", "Medicine has no effect", "It doesn't need to be watched"]$tr$::jsonb),
('b13cc3ac-f451-4c18-8a9d-14bb33b5b6d3', $tr$What did Filipinos use in theater during the American period to show their love for the country?$tr$, $tr$["Symbolism in theater", "Open protest", "Obeying the government", "Just staying silent"]$tr$::jsonb),
('b1b6b010-ed16-4a2d-8cc2-227ad88cce3c', $tr$Why is it important to take care of the health of animals and the environment, not just people?$tr$, $tr$["They are all connected, according to the idea of One Health", "They have nothing to do with people's health", "Only people matter", "The environment is separate from health"]$tr$::jsonb),
('b1d19676-50c9-4166-82d5-2e3bb49208e2', $tr$What idea did we learn that helps with moving fast?$tr$, $tr$["Agility", "Hardship", "Sadness", "Carelessness"]$tr$::jsonb),
('b1e5e350-aab9-4d2c-86db-872ae13a5240', $tr$Why is teamwork in the group considered important in this activity?$tr$, $tr$["All group members need to move together", "Each one works separately", "No teamwork is needed", "Only one person dances"]$tr$::jsonb),
('b2229275-df4b-4f09-b761-592d38dfa93e', $tr$An example of contemporary expression?$tr$, $tr$["Modern music influenced by OPM", "Only dances from other countries", "No example", "A kind of food"]$tr$::jsonb),
('b2b1120f-f509-41aa-8dca-cb87add6ca0e', $tr$How is 2/4 time different from 3/4 time?$tr$, $tr$["2/4 has two beats per measure, while 3/4 has three", "They are just the same", "There is no difference", "3/4 has two beats"]$tr$::jsonb),
('b2f12942-7ad1-4e38-af7d-8dd0058a94bc', $tr$What skill was shown in the culminating dance performance?$tr$, $tr$["Coordination and teamwork", "Writing", "Math", "Cooking"]$tr$::jsonb),
('b2f3b6a3-0b9e-46b2-9c97-b869e0a3d476', $tr$Why choose friends who are a good influence?$tr$, $tr$["They help you avoid bad behavior", "No effect", "New friends are always bad", "It doesn't matter"]$tr$::jsonb),
('b2fb93ac-1820-4f21-9d88-cb5995c5fa71', $tr$What period does this Visual Arts strand cover?$tr$, $tr$["Early Spanish Colonial Period (1521-1600)", "The American colonial period", "The Japanese occupation period", "The present day"]$tr$::jsonb),
('b32dc2b9-cad0-42ba-8335-cbb22b543e64', $tr$What is dance exercise?$tr$, $tr$["Exercising using dance moves", "A kind of food", "A kind of phone game", "A kind of drawing"]$tr$::jsonb),
('b38936a0-ade1-4ed2-a868-f3801bb84fbe', $tr$What right to health does a child have?$tr$, $tr$["Access to clean food and water", "The right to skip school", "The right not to sleep", "No rights"]$tr$::jsonb),
('b3cbd566-e3f4-4181-8da3-df93d076cf38', $tr$Which is an example of a regular pattern?$tr$, $tr$["Checkerboard design", "Random spots on a stone", "Just one dot", "No design"]$tr$::jsonb),
('b3fdadd7-e0f7-419e-89db-35ca0657150c', $tr$What does playing these games bring to the family?$tr$, $tr$["Physical health and stronger bonds", "No time for each other", "Only more expenses", "No effect on health"]$tr$::jsonb),
('b40490b7-9ab2-41ba-8c1d-240220bfe735', $tr$Which is an example of a PHYSICAL change while growing up?$tr$, $tr$["Getting taller", "Changing your opinion of a friend", "Getting angry more easily", "Becoming shyer around everyone"]$tr$::jsonb),
('b41b503b-ffe5-47f4-a6b2-15fb36fe0c9a', $tr$Why is physical activity important in MAPEH?$tr$, $tr$["It keeps the body healthy and teaches coordination", "It means nothing for health", "It is not part of PE", "Just to entertain the teacher"]$tr$::jsonb),
('b4862b42-757f-4088-8d0c-5a1a4ff98f67', $tr$What is dance exercise?$tr$, $tr$["Exercise that uses dance steps", "Only a kind of game", "A kind of food", "A punctuation mark"]$tr$::jsonb),
('b4e9b665-db04-4829-808a-18b68189c3f3', $tr$You are a bystander when someone is being bullied. What is the BEST thing to do?$tr$, $tr$["Tell an adult and stay with the person being bullied", "Just watch quietly from the side", "Laugh along with the bullies", "Walk away and just forget about it"]$tr$::jsonb),
('b50b1e6b-71d5-4c6b-928d-c43e6a5f4425', $tr$What is the goal of the culminating dance performance?$tr$, $tr$["To show coordination and teamwork in a group", "To beat the other groups", "It has no goal", "Just to entertain the teacher"]$tr$::jsonb),
('b55f4b1d-e897-4e16-b769-530edd9a9ef4', $tr$In Agawan Base, one team has weak defense, so their base keeps getting captured. What should they improve?$tr$, $tr$["Defending their space", "Singing while playing", "Drawing a new play area", "Avoiding the whole game"]$tr$::jsonb),
('b5c8509e-08b1-40b3-bb9e-e1c0c94c72b0', $tr$Why keep traditional dances alive?$tr$, $tr$["Part of our national identity", "They are not important", "Not needed today", "Not part of the culture"]$tr$::jsonb),
('b5d71b04-39d2-4c2d-8cf0-9ca24bf9d533', $tr$Why is this dance called a 'mixer'?$tr$, $tr$["Because the dancers keep changing dance partners", "Because it has food mixed in", "Because no partners are used", "Because only one person dances"]$tr$::jsonb),
('b62abcc1-25d1-4236-847c-30b09984009d', $tr$What is the 4/4 time signature called?$tr$, $tr$["Common Time", "Waltz Time", "Free Time", "Simple Time"]$tr$::jsonb),
('b64eea71-9b7d-4db5-91fc-599bff9d2683', $tr$Why should you check the expiry date?$tr$, $tr$["To make sure the product is safe to use", "It has no value", "The date doesn't matter", "Once it's bought, it's okay"]$tr$::jsonb),
('b68d041c-166d-4f93-8670-e3c576340e45', $tr$What does the mixing of two cultures in art show?$tr$, $tr$["A new and special form of art", "Native art disappearing completely", "No change in art", "European art taking over completely"]$tr$::jsonb),
('b69eedf4-cd97-4d08-a4d3-0681a25db887', $tr$What is one example of symbolic theater during this time?$tr$, $tr$["The cenaculo about the life of Christ", "Only modern movies", "Only TV shows", "Only an OPM concert"]$tr$::jsonb),
('b6d14e22-fc9b-46df-a62d-c3220935384c', $tr$What goes along with dance exercise?$tr$, $tr$["Music", "Book", "Computer", "Pencil"]$tr$::jsonb),
('b6f143c3-01cd-4bcc-bc9a-8519f5979778', $tr$Example of a carbohydrate?$tr$, $tr$["Rice", "Fish", "Vegetables", "Water"]$tr$::jsonb),
('b6ff7e47-ad22-4420-8a2e-8a8e6eb41992', $tr$What is coordination in sports?$tr$, $tr$["Moving the eyes and hands together", "How fast you run on the road", "How strong your bones and muscles are", "How long you play"]$tr$::jsonb),
('b74bc459-4708-4a02-b67a-fe73a28e7472', $tr$Why is environmental health seen as an important issue?$tr$, $tr$["It affects everyone's health and way of living", "It has no effect on people", "It is only an issue in other countries", "It is not related to MAPEH"]$tr$::jsonb),
('b757d204-c72b-4dc6-a40c-d176b6346aa6', $tr$What is a dose?$tr$, $tr$["The right number or amount of medicine", "The name of the medicine", "The color of the medicine", "The price of the medicine"]$tr$::jsonb),
('b7850177-6f5c-49b3-8be2-b280b0825f9f', $tr$Why are legends included in artworks instead of only being read as text?$tr$, $tr$["It gives another way to appreciate the story", "No reason", "There is no need to read legends", "It is harder to understand through art"]$tr$::jsonb),
('b78f575c-df38-473f-bcc0-53f178435942', $tr$Who is honored in the Sinulog?$tr$, $tr$["Santo Niño", "Ina ng Kalamba (Our Lady of Kalamba)", "Rizal", "Bonifacio"]$tr$::jsonb),
('b790286c-6585-4256-9042-db1cbf2d064a', $tr$Why take care of the health of animals and the environment?$tr$, $tr$["They are all connected, according to One Health", "They are not related", "Only people matter", "The environment is separate"]$tr$::jsonb),
('b79f1a10-ec74-4e21-a8ce-9ee2fa1bb685', $tr$Why eat different kinds of food?$tr$, $tr$["A healthy body", "It has no value", "Just to eat a lot", "It doesn't matter"]$tr$::jsonb),
('b812ee74-6be1-4ed4-ac6a-099b7027ce31', $tr$How is a verse different from a chorus?$tr$, $tr$["The verse's words change; the chorus repeats", "They are exactly the same", "The verse has no tune", "The chorus has no words"]$tr$::jsonb),
('b83ab909-3bdf-49b9-83de-9846171109d2', $tr$Why is dance a good exercise for health?$tr$, $tr$["It builds cardiovascular endurance while being fun", "It has no health benefits", "It only makes the body weaker", "It is done only for fun"]$tr$::jsonb),
('b85aa6b2-2079-4c69-8167-ffa5a34643e7', $tr$Why was contemporary art taught in MAPEH?$tr$, $tr$["To understand how Filipino culture keeps changing and growing", "It has no purpose", "It is only for older people", "It is not related to education"]$tr$::jsonb),
('b8a90eb2-b6bb-4e37-9ba2-a2716fd47138', $tr$What is a traditional dance?$tr$, $tr$["Passed down from one generation to the next", "A new kind of dance", "Only a foreign dance", "A kind of game"]$tr$::jsonb),
('b908f23e-56dd-44b9-9ae9-33216d8216d5', $tr$Why is combining lessons considered helpful in a child's life?$tr$, $tr$["Kids see how what they learn is used in real situations", "It has no real link to our real lives", "It only makes it harder for kids to understand", "It is done only to make class longer"]$tr$::jsonb),
('b91b58ac-8cc2-4547-9938-ced2725f6120', $tr$What do you do when there is a signal?$tr$, $tr$["Move to the next partner", "Stop and sit down", "Leave the room", "Start a different game"]$tr$::jsonb),
('b91daeab-66b5-4ce2-a33d-0bbeac67c5d5', $tr$What is melody?$tr$, $tr$["A series of sounds that forms a tune", "Speed of a song", "Loudness of the sound", "Instrument used"]$tr$::jsonb),
('b975be3c-4853-4342-8129-2571bcaf7421', $tr$Difference between 3/4 and 2/4 in number of beats?$tr$, $tr$["Three in 3/4, two in 2/4", "They are just the same", "There is no difference", "Two in 3/4"]$tr$::jsonb),
('b9788c32-6b3c-4f02-8b85-ca0aaeb4a52f', $tr$Why are these dances taught?$tr$, $tr$["To build body movement and social skills", "Just to entertain the teacher", "No reason", "To stop learning"]$tr$::jsonb),
('b9bb728a-4c63-4daa-b57a-2c1465b961eb', $tr$Which one shows sportsmanship?$tr$, $tr$["Following the rules even when no one is watching", "Winning by any means", "Always blaming the referee", "Avoiding weaker teammates"]$tr$::jsonb),
('b9e64fc9-b0e1-446f-8a4b-10db769f9ed1', $tr$Just staying quiet instead of speaking up is what kind of response?$tr$, $tr$["passive", "assertive", "aggressive", "active"]$tr$::jsonb),
('ba552b53-3b02-4eb8-bea1-1733abb12fcf', $tr$What should you do before playing any sport?$tr$, $tr$["Warm up", "Eat a heavy meal", "Go to sleep right away", "Drink cold water"]$tr$::jsonb),
('ba602076-1560-4781-98b1-11bb9c54d176', $tr$What is the right tempo for harvest music played as a celebration?$tr$, $tr$["Fast", "Slow", "No sound", "Quiet"]$tr$::jsonb),
('ba7b4986-a536-4a78-9ef6-780a5e78c350', $tr$Why does a melody use different sounds?$tr$, $tr$["To create a special tune that people know and are moved by", "No reason", "To confuse the listener", "To make the song shorter"]$tr$::jsonb),
('bac88eaa-a5e9-494d-9a1f-6d8871789337', $tr$In Langit-Lupa, how does a player avoid the tagger?$tr$, $tr$["Jumps above or below the line", "Runs very far away", "Just sits on the ground", "Hides behind a tree"]$tr$::jsonb),
('bb710144-5580-416e-843d-e4779b6268ef', $tr$What is the first step in making your own song?$tr$, $tr$["Choose a simple topic", "Start singing with no plan", "Forget the verse and chorus", "Buy a new instrument"]$tr$::jsonb),
('bb713b50-477c-41ce-a860-7ed3f1c955bb', $tr$What is symbolic theater?$tr$, $tr$["It uses symbols to share a message", "It is only direct protest", "It is only a dance with no message", "It is only a song with no meaning"]$tr$::jsonb),
('bba02a1a-2fd7-4815-9d41-cba103d7707d', $tr$Why is it important to keep Filipino games alive?$tr$, $tr$["They are part of our culture", "They are cheaper than toys", "They end quickly", "They have no rules"]$tr$::jsonb),
('bbe4a89b-57eb-4e9b-9ace-290567afeae0', $tr$A school is putting on a play about the Sinulog. What is important to include in their performance?$tr$, $tr$["The repeated steps that follow the music", "Just a random dance", "A dance with no music", "A dance with no meaning"]$tr$::jsonb),
('bc2d0ba8-b56a-4b32-8ced-3de9ffe4e22b', $tr$Why is each traditional dance special in different regions?$tr$, $tr$["It reflects the special history and culture of each place", "All the dances are the same", "The regions are no different", "The differences are just random"]$tr$::jsonb),
('bc5e922c-b102-4aa5-bdb3-0ae50b3686c6', $tr$What is the first step in planning a family wellness day?$tr$, $tr$["Choosing a game that fits everyone", "Starting the game right away", "Giving prizes right away", "Ending the activity right away"]$tr$::jsonb),
('bc5ee35e-09fc-4ebe-88b2-ab5100d743b8', $tr$New unit started this week?$tr$, $tr$["Contemporary Identity", "Music of the Revolution", "American Dances", "Only PE"]$tr$::jsonb),
('bc6cb717-c494-4181-990a-306f6219fb7f', $tr$Why do we play modified games?$tr$, $tr$["So everyone can join based on their ability", "To make the game harder", "So the best players win", "To make the game last longer"]$tr$::jsonb),
('bcde141e-5c7a-4239-b24c-77572aeb8faa', $tr$What is balance in fitness?$tr$, $tr$["Keeping the body steady", "How fast you run on the road", "How hard you hit the ball", "How long the game lasts"]$tr$::jsonb),
('bd0c8e57-7fac-4cb9-9b35-dcedb722b164', $tr$Why do religious dances use rhythmic patterns?$tr$, $tr$["To show the meaning of the ceremony", "Just to make time go faster", "To make it hard for the dancer", "To make the dance meaningless"]$tr$::jsonb),
('bd189b5f-24d8-4c90-b7e8-b643d532682b', $tr$What skill does the performance prove?$tr$, $tr$["Coordination and teamwork", "Writing", "Math", "Cooking"]$tr$::jsonb),
('bd54d41e-30ff-454f-9b21-a24df5560222', $tr$What concept is used here?$tr$, $tr$["Verse and chorus", "Statistics", "Probability", "Outline"]$tr$::jsonb),
('bdf3d4a6-625c-40be-843c-cca77933d373', $tr$What is the role of the family as a child grows up?$tr$, $tr$["The child's first guide in making good choices", "They have no role at this stage of life", "They should only watch from far away", "Only they should make decisions for the child"]$tr$::jsonb),
('be6cb87e-328e-41a7-a9cc-d9efe5a1fb96', $tr$What is One Health?$tr$, $tr$["The health of people, animals, and the environment are connected", "A kind of vaccine", "A kind of exercise", "A kind of medicine"]$tr$::jsonb),
('bf176479-b063-447c-814a-b556c1484b5b', $tr$Why is open communication with family important while a child grows up?$tr$, $tr$["They are the most trusted guides for new questions", "You no longer need a guide at this stage", "It is better to hide all your questions", "You should stop listening to your parents"]$tr$::jsonb),
('bf4eeea8-f543-472f-9723-6c4aba0ded94', $tr$Why is it important for children to know their right to health?$tr$, $tr$["It helps protect their well-being", "It has no value", "It is no longer needed", "Only for adults"]$tr$::jsonb),
('c011475f-d677-46f9-b9d5-58a209f0a01d', $tr$Why is coordination important in a 3/4 time dance?$tr$, $tr$["Moving smoothly with the three beats", "It has no value", "It is not needed", "Any movement is correct"]$tr$::jsonb),
('c02ce225-c15d-4ffc-806f-4ebf66ed3459', $tr$What two kinds of games did we learn in the past weeks?$tr$, $tr$["Striking/fielding and net/wall games", "Only board games and card games", "Only video games", "Games with no movement at all"]$tr$::jsonb),
('c03da61e-723e-48db-bb0f-b0b29479a7b0', $tr$Why were so many pictures of saints made during the Early Spanish Colonial Period?$tr$, $tr$["To teach religion to the people", "Just to decorate homes", "To sell to other countries", "They had no purpose back then"]$tr$::jsonb),
('c047282f-ce6e-4936-8422-6a1ea2f09c4a', $tr$What idea helps you stay steady while moving?$tr$, $tr$["Balance", "Sadness", "Carelessness", "Hardship"]$tr$::jsonb),
('c0644444-3171-4ed7-878d-6cfe251a276c', $tr$What is contemporary art?$tr$, $tr$["Modern art about life today", "Only art from other countries", "A kind of game", "A punctuation mark"]$tr$::jsonb),
('c067001f-19bc-4512-968e-1195d1de1cfe', $tr$What is the goal in invasion games?$tr$, $tr$["Get into the other team's territory to score", "Send an object to a target", "Always stay in your own area", "Run the longest distance"]$tr$::jsonb),
('c07ad6cb-effb-4a09-9d8c-080652f6738a', $tr$What is rhythm in visual arts?$tr$, $tr$["Repeated elements in an artwork", "Only the type of color used", "Only the number of viewers", "Only the size of the paper"]$tr$::jsonb),
('c09d43a4-d5a1-43a6-96f6-9500dde23c9b', $tr$What is volleying in net/wall games?$tr$, $tr$["Sending the ball back before it hits the floor", "Hitting the ball with a bat", "Running to the next base", "Catching the ball with two hands"]$tr$::jsonb),
('c10d690a-7b67-4b6b-9f8a-dd3189c22a88', $tr$Why is it important to value street dance festivals?$tr$, $tr$["They show the rich culture of the Philippines", "They are not important", "They are just for fun", "They are not part of the culture"]$tr$::jsonb),
('c1355420-cee0-406d-be88-52c67a21ab1b', $tr$Which part of the body is mainly used?$tr$, $tr$["The whole body", "Hands only", "Eyes only", "None, just watching"]$tr$::jsonb),
('c1be1bc6-55f7-4396-b974-7e33fa85ed99', $tr$Why is self-confidence important in dancing?$tr$, $tr$["It helps you show the choreography", "It has no value", "It is not needed", "It only gets in the way"]$tr$::jsonb),
('c1e83304-433c-43fd-a49e-4cddcc468d33', $tr$What is tempo?$tr$, $tr$["How fast or slow the music is", "Loudness of the sound", "Number of singers", "Type of instrument"]$tr$::jsonb),
('c1f06430-e358-4e26-9b9c-88c18927b46b', $tr$Who is responsible for reading the label?$tr$, $tr$["The shopper", "Only the seller", "No one", "Only the product maker"]$tr$::jsonb),
('c267279c-66df-4734-a396-b59d12ed0ea7', $tr$What is the goal of movement exploration?$tr$, $tr$["To find out what the body can do", "Only to make the voice stronger", "To learn math", "To learn writing"]$tr$::jsonb),
('c284d946-52fa-466c-a46c-488c21539752', $tr$On defense, where should a player stay?$tr$, $tr$["Between the opponent and the goal", "Right behind the opponent", "Along the side of the whole court", "Next to their own goal"]$tr$::jsonb),
('c2c3b078-a35e-4770-8dd0-ccf2b5a5a0f1', $tr$What is a trait of the waltz as a dance?$tr$, $tr$["Gentle, with three beats per measure", "Very fast, with two beats", "No music", "The beat happens only once"]$tr$::jsonb),
('c2dd21cb-5fb6-49b2-8bd5-25a6c498a03e', $tr$Why is it important to teach traditional dance to children?$tr$, $tr$["To pass the culture on to the next generation", "It doesn't need to be taught anymore", "It is only for older people", "It has no effect"]$tr$::jsonb),
('c3ad3bf3-f755-486c-85d1-aa27d94adb66', $tr$What is movement in visual arts?$tr$, $tr$["A way of guiding the viewer's eye", "Only how fast the art is made", "Only the sound you hear", "Only the price of the artwork"]$tr$::jsonb),
('c3c540d7-35ef-4c4a-8a46-f2e71ff414ef', $tr$Why is the proper use of medicine important?$tr$, $tr$["To avoid misusing it", "It is not important", "Medicine is always safe", "No dose is needed"]$tr$::jsonb),
('c3de5357-a8ee-44da-b987-451d4625f2cb', $tr$What does the Tinikling show?$tr$, $tr$["The tikling bird", "A tree", "A fish", "A sea animal"]$tr$::jsonb),
('c4686e3c-8d8c-4b36-bfef-1a4ff5fb70a8', $tr$How is rhythm created in visual arts?$tr$, $tr$["By repeating shapes or colors", "By making loud sounds", "Only by dancing fast", "By making a long movie"]$tr$::jsonb),
('c4d65720-9f73-4607-b986-c0a6dbe15f07', $tr$What is a dose?$tr$, $tr$["The right number or amount of medicine to take", "The name of the medicine", "The color of the medicine", "The price of the medicine"]$tr$::jsonb),
('c506c2f3-29d7-4df3-834b-db62a769d882', $tr$Why is dance practice important as part of PE?$tr$, $tr$["It builds physical skills and coordination", "No benefit", "It makes the body weaker", "It is not part of PE"]$tr$::jsonb),
('c51c8756-fbf6-43ef-85e5-856599ff0386', $tr$Why is it important to choose friends who are a good influence?$tr$, $tr$["They help you avoid bad behavior", "It has no effect on your choices", "New friends are always bad", "The kind of friend doesn't matter"]$tr$::jsonb),
('c5cfed08-4964-4608-b178-638ba15d8652', $tr$What is tempo?$tr$, $tr$["How fast or slow the music is", "Loudness of the sound", "Number of singers", "Type of instrument"]$tr$::jsonb),
('c61562f9-4509-4539-a680-888d501caf43', $tr$What are fundamental dance steps?$tr$, $tr$["Basic steps used in many dances", "A kind of song", "A kind of game", "A kind of drawing"]$tr$::jsonb),
('c620de78-db7d-4fa2-b910-bc1f07e31289', $tr$A consumer's responsibility?$tr$, $tr$["Read the label before buying", "Only the seller is responsible", "Buy without thinking", "Don't check"]$tr$::jsonb),
('c6685f90-9664-4d6e-a710-844ed7723a08', $tr$What is meter in music?$tr$, $tr$["The pattern of beats in each measure", "Only how fast the music is", "Only how loud the sound is", "Only a type of instrument"]$tr$::jsonb),
('c6726a6b-87c2-4e93-bd78-316378c479ad', $tr$What did we learn about in Health?$tr$, $tr$["Holistic wellness", "Nothing", "Only one thing", "We learned nothing"]$tr$::jsonb),
('c69893d6-aa08-4a00-b6fe-863c70d0fcc4', $tr$What is a chorus in a song?$tr$, $tr$["The part that repeats and is usually remembered best", "The part whose words change each time it comes back", "The part with no tune", "The part where only a piano plays"]$tr$::jsonb),
('c6b19c8b-39a5-4e59-b10f-e99dea193692', $tr$What is the conflict in a play?$tr$, $tr$["The problem or fight in the story", "The ending of the story", "The introduction of the characters", "The title of the play"]$tr$::jsonb),
('c6b41808-60cd-4fec-8861-5ed1eb43b64f', $tr$What shows sportsmanship?$tr$, $tr$["Playing fairly even without a referee", "Winning by any means", "Reporting the opponent right away", "Not joining in"]$tr$::jsonb),
('c741d74b-c283-4867-84f5-a6e8151303bd', $tr$What three subjects are we combining this week?$tr$, $tr$["Dance, health, and art", "Math, science, and language", "History, geography, and agriculture", "Music only"]$tr$::jsonb),
('c8494b60-0cff-469f-9dff-f7fdd6c7af86', $tr$Why should changes while growing up be seen as normal?$tr$, $tr$["They are a common part of everyone's growth", "They rarely happen to children", "They should be hidden out of shame", "They only happen to some children"]$tr$::jsonb),
('c86f9378-3792-4346-adee-132a97d00623', $tr$A softball player is running slowly to first base. What should they do?$tr$, $tr$["Run with full effort", "Stop to rest", "Go back to the earlier position", "Wait for the next inning"]$tr$::jsonb),
('c86fabb3-3218-4e92-b967-7c37a1de2ccc', $tr$Which is an example of an activity that improves family health?$tr$, $tr$["Gardening together", "Watching TV alone", "Avoiding family members", "Sleeping all day"]$tr$::jsonb),
('c8b25886-e3f8-431d-a5bb-efdf20e0ce3f', $tr$What is the chain of infection?$tr$, $tr$["The process of how a disease spreads", "A kind of medicine", "A kind of exercise", "A vaccine"]$tr$::jsonb),
('c8ed79a5-8269-476d-9dbb-c3143d43003d', $tr$Which of the following is an EXAMPLE of proper medicine use?$tr$, $tr$["Taking it as the doctor prescribed at the right time", "Taking an extra dose to get better faster", "Taking a sibling's medicine", "Taking it without reading the label"]$tr$::jsonb),
('c92dd492-8cf4-4293-b6d0-1352bd2f2961', $tr$Where is the Dinagyang held?$tr$, $tr$["Iloilo", "Cebu", "Aklan", "Manila"]$tr$::jsonb),
('c95a4d97-9a49-431f-ac55-3fbd1fc8a870', $tr$What does learning these dances bring?$tr$, $tr$["A deeper appreciation of culture", "Nothing", "Only confusion", "No new knowledge"]$tr$::jsonb),
('c980d95e-eae3-4fe4-b7da-29d46c1851d1', $tr$What did Filipinos use in theater during the American period to show their love for the country?$tr$, $tr$["Symbolism in theater", "Open protest", "Obeying the government", "Just staying silent"]$tr$::jsonb),
('ca171040-d529-4051-9829-a864e04435f2', $tr$Why is it important to study the art of this time?$tr$, $tr$["It shows how two cultures mixed", "It has no connection to today", "It is not done anymore", "It has no connection to the Philippines"]$tr$::jsonb),
('ca90ed2f-43dc-4666-b47a-3fdda40dcbf3', $tr$Which is an example of a gateway drug?$tr$, $tr$["Cigarettes", "Milk", "Water", "Fruit"]$tr$::jsonb),
('cac61a18-22d0-4517-812e-b38d012acc6c', $tr$Why is it important to include the whole family in the activity?$tr$, $tr$["It makes family bonds and health stronger", "It has no benefit for the family", "It is better to do it alone", "Family is not needed for this activity"]$tr$::jsonb),
('cad6e130-71a6-42ff-add8-76ad1c78e88b', $tr$Why does a melody use different sounds?$tr$, $tr$["To create a special tune", "No reason", "To confuse the listener", "To make the song short"]$tr$::jsonb),
('cadbec0e-d829-4797-94be-22eb784cf5f5', $tr$What tempo fits a fiesta song?$tr$, $tr$["Fast", "Slow", "No rhythm", "Just quiet"]$tr$::jsonb),
('caf1c659-53ff-4107-a313-b7c387c6e08f', $tr$Why is it important to review what we learned in MAPEH this term?$tr$, $tr$["It helps us remember and connect the ideas", "It has no meaning for our learning", "It is done only to get a grade", "It only confuses a student"]$tr$::jsonb),
('cafddaf7-fb2f-47a9-8d80-48ac40f13220', $tr$How many beats are in each measure in 2/4 time?$tr$, $tr$["Two", "Three", "Four", "One"]$tr$::jsonb),
('cb07fb85-8ef5-4a4d-9763-08310228ad58', $tr$Why is dance exercise important?$tr$, $tr$["It makes the body strong while having fun", "It has no value", "It is only tiring", "It is not part of PE"]$tr$::jsonb),
('cb1dac99-f45a-4fb5-bdf0-520385fd1667', $tr$Why learn to value your rights?$tr$, $tr$["To know when to ask for help", "No need to know", "Only for adults", "No effect"]$tr$::jsonb),
('cb8f7440-0bd0-4a26-9d45-1076e432b869', $tr$What happens if a child's right to health is not met?$tr$, $tr$["Their well-being and growth may be affected", "Nothing will happen", "Everything is always fine", "They are automatically protected"]$tr$::jsonb),
('cbb0b322-7af9-4a41-ad13-3ae82a4dd9b0', $tr$How many beats are in 3/4 time?$tr$, $tr$["Three", "Two", "Four", "One"]$tr$::jsonb),
('cbdf92c4-6566-487a-b3b2-2ccd0f21d954', $tr$What is observing in art?$tr$, $tr$["Looking closely at your surroundings before drawing or painting", "Selling artwork", "Cleaning art materials", "Giving a picture a name"]$tr$::jsonb),
('cbf49d16-f210-49e8-acbc-216405d826a1', $tr$A woven cloth has repeated triangles. What does it show?$tr$, $tr$["Rhythm and pattern", "It has no design", "Just a single shape", "A random line"]$tr$::jsonb),
('cc192b68-5278-47a5-9147-863b40c7733d', $tr$Which is NOT part of a balanced meal?$tr$, $tr$["Only junk food as the main food", "Carbohydrates", "Protein", "Vegetables and fruits"]$tr$::jsonb),
('cc2370fd-16a8-461f-a6f7-4b6632d1bb45', $tr$Why is it important to review what we learned in MAPEH this term?$tr$, $tr$["It helps us remember and connect the ideas", "It is pointless for learning", "It is only done for grades", "It only confuses students"]$tr$::jsonb),
('cc284449-4338-4094-8c4a-6b3dccd3784d', $tr$In net games, where is the best place to hit the ball?$tr$, $tr$["To the open area far from your opponent", "Straight at your opponent", "Outside the whole court", "Always under the net"]$tr$::jsonb),
('cc522c81-1b7a-46b6-aa6a-4b22430b558c', $tr$How is it connected to the street dance we learned?$tr$, $tr$["Both are part of celebrating culture", "No connection", "One is about science", "One is about math"]$tr$::jsonb),
('cc766c22-ba72-4ef4-a416-a1079380a676', $tr$Why should children know their right to health?$tr$, $tr$["To protect their well-being", "It has no value", "It is not needed", "Only for adults"]$tr$::jsonb),
('cc7cf970-7842-4d0b-8afe-aee2b1a9f209', $tr$What happens if a dancer doesn't follow the signal?$tr$, $tr$["It will be hard for them to keep up with changing partners", "It has no effect", "They win automatically", "All the music stops"]$tr$::jsonb),
('cc9e3fcd-6c43-4844-9ac8-8a5d6063ff31', $tr$Why is it important to know the proper use of medicine?$tr$, $tr$["To avoid misuse that can harm the body", "It is not important", "Medicine is always safe no matter how it is used", "No dose is needed"]$tr$::jsonb),
('ccb79ddb-274f-4625-b6c4-5e5bc94eb7c6', $tr$What element of visual arts did we learn?$tr$, $tr$["Rhythm and pattern", "Only numbers", "Only weather", "Only history"]$tr$::jsonb),
('ccf985ec-2c51-443c-bde6-b7e280eeee5e', $tr$What kind of dance often uses 3/4 time?$tr$, $tr$["Waltz", "Polka", "Hip-hop", "Breakdance"]$tr$::jsonb),
('cd19a1b3-1fb4-47f5-bdb4-3953f0eb81ef', $tr$Why is dance exercise important?$tr$, $tr$["It makes the body strong while enjoying music", "It has no value", "It is only tiring with no benefit", "It is not part of PE"]$tr$::jsonb),
('cdacac74-9eda-4ae1-902e-1372303d9361', $tr$What is a traditional dance?$tr$, $tr$["A dance passed down from one generation to the next", "A new kind of dance", "Only a foreign dance", "A kind of game"]$tr$::jsonb),
('ceafb519-c169-43d2-af4f-e41c43fb34ed', $tr$Which is an example of an aggressive response?$tr$, $tr$["Shouting and insulting", "Quietly walking away", "Politely saying no", "Asking for help"]$tr$::jsonb),
('ceb42aa9-e67e-4ac4-bc36-869d3dcc72db', $tr$Another right to health?$tr$, $tr$["Medical care", "None", "The right to work", "The right not to eat"]$tr$::jsonb),
('cf0ef2ac-6539-4334-8c47-baab423b8db7', $tr$How is melody connected to the verse and chorus?$tr$, $tr$["Melody is used in both, and the tunes can be different", "There is no connection", "Melody is only for the chorus", "Melody is only for instruments"]$tr$::jsonb),
('cf3fa57b-8030-4d7e-b038-40def5065717', $tr$Who should a child go to with questions about the changes they are going through?$tr$, $tr$["A trusted parent or older adult", "Any stranger", "No one, just keep it hidden", "A classmate who doesn't know either"]$tr$::jsonb),
('cf4ee22e-49df-4e21-97ca-8fad2408be20', $tr$You see your classmate being bullied. What is the BEST thing to do as a bystander?$tr$, $tr$["Tell a teacher and stay with your classmate", "Just watch quietly", "Laugh along with the bullies", "Walk away and ignore it"]$tr$::jsonb),
('cf5b3f1a-f6d6-48f4-811f-a453ebe56a77', $tr$Which of these is NOT a good response when someone offers you a gateway drug?$tr$, $tr$["Try it first before saying no", "Say 'No' firmly", "Leave the situation", "Ask an adult for help"]$tr$::jsonb),
('cfb80d92-5fe5-4040-a029-6e9e29f77dca', $tr$Why learn the basic steps?$tr$, $tr$["To learn harder dances", "It has no value", "No need to learn them", "Just to entertain the teacher"]$tr$::jsonb),
('cfea7532-70c1-427c-b53b-c8bcae27a652', $tr$Which is faster?$tr$, $tr$["2/4 time", "3/4 time", "The same", "None"]$tr$::jsonb),
('cfeedaf8-4cfc-477b-91e3-fd5487fb788e', $tr$Which part of a song tells a story with changing ideas?$tr$, $tr$["Verse", "Chorus", "Rhythm only", "Dynamics only"]$tr$::jsonb),
('d0431bbb-8b7f-4335-97c8-adbc00ae502e', $tr$What is the big lesson of all of Term 2 in MAPEH?$tr$, $tr$["The importance of health and Filipino culture in everyday life", "No particular lesson", "Only about sports", "Only about music"]$tr$::jsonb),
('d103ea00-3bee-4c61-bfcc-fcb3f508fee1', $tr$What should we keep in mind while doing the activity?$tr$, $tr$["The safety of everyone taking part", "Only the price of the equipment", "Only the time it ends", "Nothing, there is nothing to think about"]$tr$::jsonb),
('d116a611-c5b0-46e6-88e3-6f17458feed7', $tr$What does the mixing of two cultures in art show?$tr$, $tr$["A new and special form of art", "Native art disappearing completely", "No change in art", "European art taking over completely"]$tr$::jsonb),
('d14cba09-175a-4fa4-a82f-964d87e13db1', $tr$What is the resolution?$tr$, $tr$["The solving of the problem", "The start of the problem", "The introduction of the characters", "The highest tension"]$tr$::jsonb),
('d19ca0d6-79c9-486d-8955-e738d37d4c97', $tr$Why is valuing culture seen as an important part of MAPEH?$tr$, $tr$["It helps keep Filipino identity alive", "It is not related", "It is just a separate topic", "It is not part of education"]$tr$::jsonb),
('d1bc195b-2e77-44e5-8e5b-0e17da916019', $tr$What is balance in PE?$tr$, $tr$["The ability to stay steady while moving", "The ability to run very fast", "The ability to count fast", "The ability to sing loudly"]$tr$::jsonb),
('d1d14fe5-be3a-473a-840a-8822e4a30404', $tr$Which is an example of an EMOTIONAL change while growing up?$tr$, $tr$["Deeper feelings and mood changes", "A child getting taller while growing up", "A change in a child's hair color", "A child's feet getting bigger while growing up"]$tr$::jsonb),
('d1d9382b-72cf-40d0-aa79-9fb31876cea6', $tr$In a softball game, a player runs slowly to first base even though the ball is far away. What should they do?$tr$, $tr$["Run with full effort all the way to the base", "Stop to rest first", "Go back to the earlier position", "Wait for the next inning"]$tr$::jsonb),
('d222f6e8-643a-4861-baea-a5861466cc92', $tr$How can art be connected to a health campaign?$tr$, $tr$["By making visual materials about health", "By avoiding all art activities", "Art has no connection to health", "By stopping all exercise"]$tr$::jsonb),
('d283cf54-7d28-49b9-9a36-1b1536809853', $tr$What element of composition did we learn in arts?$tr$, $tr$["Rhythm/pattern and movement", "Only color", "Only price", "Only weight"]$tr$::jsonb),
('d376d457-dbc7-48f0-9a53-7b2a0bd9421a', $tr$What is the exposition in a dramatic play?$tr$, $tr$["It introduces the characters and the situation", "The highest point", "The solving of the problem", "The ending of the play"]$tr$::jsonb),
('d3d9a170-daf4-4ccc-99dc-05ff6ee3eefb', $tr$Why did most art from this period have a religious theme?$tr$, $tr$["Because the Catholic Church had a big influence", "Because other themes were not allowed then", "Because people knew no other subjects", "Because non-religious art was banned"]$tr$::jsonb),
('d4980912-c9f9-47e3-98a3-238053941c5c', $tr$What is the goal of doing an activity like this in MAPEH?$tr$, $tr$["To use the musical form we learned in a creative project", "It has no goal", "Just to entertain the teacher", "To replace math lessons"]$tr$::jsonb),
('d4bbe3fd-708d-4365-a6f6-51d5cfb0f826', $tr$Which is an example of a regular pattern?$tr$, $tr$["Checkerboard design", "Random spots on a stone", "Just one dot", "No design"]$tr$::jsonb),
('d4ffb223-cd13-4f13-b18f-73bc29dd8b15', $tr$What should you do if you forgot the time to take your medicine?$tr$, $tr$["Ask a parent or doctor", "Take a double dose", "Just forget about it", "Take a different medicine"]$tr$::jsonb),
('d5222879-3214-4970-8594-104c698da187', $tr$Who should prescribe medicine?$tr$, $tr$["A doctor or parent", "Only a friend", "Anyone", "No permission is needed"]$tr$::jsonb),
('d54990f6-c4c1-4c89-ad7f-ff5c3181154a', $tr$What is dance exercise?$tr$, $tr$["Exercise that uses dance steps", "Only a kind of game", "A kind of food", "A punctuation mark"]$tr$::jsonb),
('d55a2d4d-c6ea-4f44-a90f-7d10810060ab', $tr$Which dance uses a 3-beat pattern?$tr$, $tr$["Waltz", "Tinikling", "Cha-cha", "Boogie"]$tr$::jsonb),
('d5672efb-3fc6-4a6d-be6c-55e4b0c1bb46', $tr$What does 'Inang Bayan' (Mother Country) stand for in these plays?$tr$, $tr$["The Philippines", "Spain", "Japan", "America"]$tr$::jsonb),
('d5c90bf6-b793-49ca-a2a7-5568ccfd858d', $tr$Your team is bunched up in one spot and cannot score. What is the BEST solution?$tr$, $tr$["Spread out to open up space", "Pass only to the closest player", "Run even faster", "Hold the ball even longer"]$tr$::jsonb),
('d67685fa-5742-4045-8e00-03d140daa0fc', $tr$What is a benefit of dance practice for the body?$tr$, $tr$["Building physical skills and coordination", "No benefit", "It makes the body weaker", "It stops you from moving"]$tr$::jsonb),
('d67da14e-e479-417e-be6a-ff0aae387559', $tr$A woven cloth has repeated triangles. What does it show?$tr$, $tr$["Rhythm and pattern", "It has no design", "Just a single shape", "A random line"]$tr$::jsonb),
('d6b6e8ee-dc92-477e-b739-01d27355b13b', $tr$What happens in a social dance mixer?$tr$, $tr$["Dancers keep changing partners", "Dancers stay with only one partner", "No partners are used", "Just sitting down"]$tr$::jsonb),
('d72b00ad-ade9-44a6-9814-686917a5ef2e', $tr$Why is it important to warm up before playing?$tr$, $tr$["To avoid injury", "To make the game faster", "To get more points", "To cool down the body"]$tr$::jsonb),
('d7639771-51d2-4051-9464-50f8539bd1c9', $tr$What element of composition did we learn in arts?$tr$, $tr$["Rhythm/pattern and movement", "Only color", "Only price", "Only weight"]$tr$::jsonb),
('d7857dc8-15fe-4854-8e0d-2ba0706fd87c', $tr$What is a verse like?$tr$, $tr$["It tells a story and changes each time", "It is always the same", "It has no words", "An instrument only"]$tr$::jsonb),
('d8220d16-e833-4b5e-b551-616941bf97c5', $tr$Why is this topic taught?$tr$, $tr$["To be responsible in preventing disease", "It has no purpose", "It is only for older people", "It is not related"]$tr$::jsonb),
('d864909a-f9b3-4362-9fe3-bdeef6c1ee3e', $tr$Who should prescribe or recommend medicine?$tr$, $tr$["A doctor or parent", "Only a friend", "Anyone at school", "No permission is needed"]$tr$::jsonb),
('d8af3d76-8365-41f2-acbb-f38e1f48e4c2', $tr$Why value these festivals?$tr$, $tr$["The rich culture of the Philippines", "They are not important", "Just for fun", "Not part of the culture"]$tr$::jsonb),
('d9171a24-50c1-45a5-838a-0ef5f7259f09', $tr$Why is dance exercise more fun?$tr$, $tr$["It combines music and movement", "No difference", "It's harder", "It's not exercise"]$tr$::jsonb),
('d935e741-b866-43b1-9a89-dd3753c9b8ec', $tr$What was the theme of plays during the Early Spanish Colonial Period?$tr$, $tr$["Miracles and faith", "Modern science", "World wars", "Sports"]$tr$::jsonb),
('d95770da-602f-4122-bcda-c3274b0f060d', $tr$What does planning a family health activity bring?$tr$, $tr$["It makes the household's bonds and health stronger", "It only weakens family bonds", "It has no benefit for the whole family", "It only causes fights at home"]$tr$::jsonb),
('d96a7838-8f59-42de-91b6-0b98376f287c', $tr$Why are basic steps taught before harder dances?$tr$, $tr$["They give a strong foundation", "No reason", "There is no need to learn the basics first", "Any dance can be done right away"]$tr$::jsonb),
('d9b16e91-b04f-45cb-818c-9d7c6d985e45', $tr$Where is the Ati-Atihan held?$tr$, $tr$["Aklan", "Cebu", "Quezon", "Manila"]$tr$::jsonb),
('da1199c7-274e-4f9a-851e-c69a93ec5cb9', $tr$How was pre-colonial art different from early Spanish colonial art?$tr$, $tr$["The later one was influenced by Europe", "They were exactly the same", "There was no difference", "Pre-colonial was the more modern style"]$tr$::jsonb),
('daac1413-4206-43ff-9269-c35a54eb7bcf', $tr$What is a family wellness day?$tr$, $tr$["A day of healthy activities for the whole family", "A day spent only shopping", "A day spent only sleeping", "A day spent watching TV"]$tr$::jsonb),
('dafc96b5-02a7-4053-95d3-a02d622e4e26', $tr$Why is it important to write the verse before the chorus?$tr$, $tr$["So the story connects well to the main message", "The order doesn't matter", "The chorus should be written first", "No order is needed"]$tr$::jsonb),
('db01c071-f147-4846-9b20-7c5c2b54b3b3', $tr$What is symbolic theater?$tr$, $tr$["It uses symbols to share a message", "It is only direct protest", "It is only a dance with no message", "It is only a song with no meaning"]$tr$::jsonb),
('db353369-2a0f-4207-8588-dfc10486d86a', $tr$What is the exposition in a dramatic play?$tr$, $tr$["It introduces the characters and the situation", "The highest point", "The solving of the problem", "The ending of the play"]$tr$::jsonb),
('db45f834-3450-4ebe-9398-89907f48eee2', $tr$Which one is NOT part of a social dance mixer?$tr$, $tr$["Staying with one partner the whole time", "Changing partners", "Music in 2/4 time", "Simple steps"]$tr$::jsonb),
('db4bdf33-c8e0-4430-a8ef-04b53fb408f2', $tr$What idea did we learn that helps with moving fast?$tr$, $tr$["Agility", "Hardship", "Sadness", "Carelessness"]$tr$::jsonb),
('db5d3aeb-db6a-40a1-b390-25a15f87bac6', $tr$What is the first step in getting ready for the performance?$tr$, $tr$["Choose the number of members in the group", "Perform right away without practice", "Forget the steps", "Leave the group"]$tr$::jsonb),
('db611add-dd1d-45f7-bf74-b6b6f31f4c44', $tr$What is engraving?$tr$, $tr$["Carving a design into a hard surface", "Drawing with a pencil only", "Painting with watercolor", "Selling artwork"]$tr$::jsonb),
('dc05e845-d783-478b-8b26-48dc95695927', $tr$What is agility?$tr$, $tr$["Changing direction quickly", "How long you can keep going in a game", "Staying steady in one position", "How accurate your shot is"]$tr$::jsonb),
('dc8be9e1-7bfd-4d37-8c9a-cd47a2a7b7e9', $tr$What is one part of a good plan for a wellness day?$tr$, $tr$["Choosing a game that fits all ages", "Running around with no plan", "Giving out tasks with no schedule", "Avoiding all equipment"]$tr$::jsonb),
('dc9278ce-c6b8-43a3-acb9-2a9554513377', $tr$What did dances of this time secretly express?$tr$, $tr$["Love for the country", "Only sadness", "Only happiness", "They had no meaning"]$tr$::jsonb),
('dcbeee08-d5fb-4e6b-9829-47d2f7386742', $tr$What is a seditious play?$tr$, $tr$["A play that secretly speaks out against foreign rule", "A play only about love", "A play that is only a comedy", "A play with no link to history"]$tr$::jsonb),
('dcbf370d-50f0-499a-b4e4-e9955d71176e', $tr$What is the big lesson of this whole unit about dance, health, and art?$tr$, $tr$["They are connected and work together to support well-being", "They are not connected to each other", "Only one of them matters in this activity", "They have no real connection here now"]$tr$::jsonb),
('dcbf5558-0084-4ff7-b0c6-9fc7e8e5db9d', $tr$What is a verse?$tr$, $tr$["The part whose words change", "The part that is always the same", "It has no words", "An instrument only"]$tr$::jsonb),
('dcf2a8ff-6702-4233-a1a0-8883a73392f3', $tr$What is the goal of studying rhythm and pattern as visual elements?$tr$, $tr$["To see the skill in our ancestors' art", "Only to see a lack of talent", "Just to make random designs", "It has no meaning here"]$tr$::jsonb),
('dd4d8b21-a0c3-4083-a217-f2babdbc4955', $tr$Physical benefit of dance exercise?$tr$, $tr$["Stronger body and coordination", "No benefit", "It makes you weaker", "It stops you from moving"]$tr$::jsonb),
('dd76bee3-80cc-4132-887d-2c287e0a8b62', $tr$How is 3/4 time different from 2/4 time in number of beats?$tr$, $tr$["Three beats in 3/4, two beats in 2/4", "They are just the same", "There is no difference", "Two beats in 3/4"]$tr$::jsonb),
('dd76fe8f-ec96-44b7-b7c2-96ffac15a1f7', $tr$What music is often used in native dances?$tr$, $tr$["Drums or gongs", "Piano", "Guitar", "Violin"]$tr$::jsonb),
('dda1ab75-7bfa-4a68-b6b9-541ffe35f79e', $tr$What are gateway drugs?$tr$, $tr$["Substances that can open the way to more dangerous drugs", "Just a kind of food", "Legal medicine with no effect", "A kind of vitamin"]$tr$::jsonb),
('ddb1a1c0-b070-4a70-bd23-d5855d0b4f96', $tr$What were plays about during this time?$tr$, $tr$["Church rituals and the lives of saints", "Only current news", "Only modern science", "Only world wars"]$tr$::jsonb),
('de8dfc18-8bc6-4064-8d46-756f0677745f', $tr$Why is it important to choose a modified game for the family wellness day?$tr$, $tr$["So people of all ages can play", "So it is only for children", "So it is only for older people", "There is really no reason"]$tr$::jsonb),
('dec3e2b8-57f0-4169-ab99-a9c51590e87d', $tr$Coordination means moving these together:$tr$, $tr$["eyes and hands", "feet and ears", "nose and mouth", "back and neck"]$tr$::jsonb),
('df8b9865-2bcc-43a2-89af-5b69e7d3fa88', $tr$What is the goal of practicing a social dance mixer in 3/4 time?$tr$, $tr$["To follow a gentler tempo while mixing with others", "To learn to write", "To learn math", "To play basketball"]$tr$::jsonb),
('dfe1ec6a-e4f0-4887-98e5-7621a04fd568', $tr$Why check the expiry date?$tr$, $tr$["To make sure it is safe to use", "It has no value", "It doesn't matter", "It's okay even if expired"]$tr$::jsonb),
('e023082a-0644-4f3e-8490-5beeae00fa15', $tr$What happens if a community has no proper sanitation?$tr$, $tr$["Higher risk of disease spreading", "It has no effect", "Everyone is healthier", "Diseases disappear by themselves"]$tr$::jsonb),
('e03e8a3a-b4e2-4a02-b474-759c1fb17884', $tr$What is fielding?$tr$, $tr$["Catching or getting back the ball", "Starting the game", "Running to the base", "Hitting the ball"]$tr$::jsonb),
('e06a8f3f-858c-4d65-afb8-d1e3393e951b', $tr$Why is it important to drink water while playing?$tr$, $tr$["To avoid dehydration", "To score more points", "To slow down the game", "To make your voice louder"]$tr$::jsonb),
('e07b636a-95e6-4318-88d9-f9a1a3d0d29c', $tr$Which is an example of a dance of thanksgiving?$tr$, $tr$["Pahiyas", "Only Sinulog", "Only Tinikling", "Cha-cha"]$tr$::jsonb),
('e0b72b5d-d69e-4add-bcd1-f0da7509280d', $tr$Why count the beats exactly in 2/4?$tr$, $tr$["To follow the music exactly", "Not related", "Just keep moving", "It doesn't matter"]$tr$::jsonb),
('e18a0e13-6211-4d33-b519-c1fbcc987836', $tr$How is it different from a traditional dance?$tr$, $tr$["It is freer than set steps", "They are just the same", "There is no difference", "It always has specific steps"]$tr$::jsonb),
('e1acb529-eec1-4a2c-87b7-c2394aae4def', $tr$What is a social dance mixer?$tr$, $tr$["A dance where partners keep changing", "A kind of song", "A game with no music", "A kind of drawing"]$tr$::jsonb),
('e1d708a6-5d70-40a3-a9dc-fcc636f68663', $tr$Why are these festivals seen as an important part of Filipino identity?$tr$, $tr$["They show the special culture of each region", "They have nothing to do with identity", "They are only borrowed from other countries", "They are not part of the culture"]$tr$::jsonb),
('e1e34e91-3acb-4c8e-93cf-66a7e1f49c6e', $tr$Which of these is an example of a gateway drug?$tr$, $tr$["Cigarettes", "Milk", "Water", "Fruit"]$tr$::jsonb),
('e2070172-c6ef-4433-9191-9d123ac63fe7', $tr$What idea do rhythm and tempo show in music?$tr$, $tr$["The speed and pattern of sound", "The price of an instrument", "The color of clothes", "The size of the stage"]$tr$::jsonb),
('e2bed5ec-7d5d-4319-984f-0e1352ded96c', $tr$Why are PE dance activities part of MAPEH?$tr$, $tr$["They support physical health and appreciation of the arts", "They have no purpose", "They are not related to education", "Only for adults"]$tr$::jsonb),
('e2c46242-4b49-4ab1-b22f-7937f6418ad5', $tr$Why are rhythm, pattern, and movement important in art?$tr$, $tr$["They make the artwork interesting and organized", "They have no meaning in art", "They only make the work harder", "They are only used in sports"]$tr$::jsonb),
('e2dfa067-1b76-4e0d-b6a3-3660707d11f4', $tr$Which is an example of European influence in dance?$tr$, $tr$["More formal steps, like partner dances", "Just free movements", "No structure at all", "Only native movements"]$tr$::jsonb),
('e315ea9d-f8e5-408a-ac4f-183099584de1', $tr$How is movement exploration different from a traditional dance?$tr$, $tr$["It is freer and tries new moves instead of set steps", "They are just the same", "There is no difference", "Movement exploration always has specific steps"]$tr$::jsonb),
('e3630c5c-69e0-462f-b231-1353043fc39d', $tr$What does alcohol do to the body?$tr$, $tr$["Affects the brain and thinking", "Makes memory stronger", "No effect on the mind", "Improves eyesight"]$tr$::jsonb),
('e3a65db6-ce11-4856-b490-da9b1b8af199', $tr$What does putting two tempos together in a presentation bring?$tr$, $tr$["It shows versatility and skill in dance", "It brings nothing", "It only causes confusion", "It is not possible"]$tr$::jsonb),
('e3c23289-5c95-4c61-ad6f-eccdd15bfeec', $tr$Why is perceiving important when making art?$tr$, $tr$["It helps show shape and light correctly", "It has no role in making art", "It is used only when selling the work", "It is not part of the creative process"]$tr$::jsonb),
('e3d8ec48-bf67-4a3c-90b5-4242d1ebdcc3', $tr$What do repeated patterns in traditional weaving show?$tr$, $tr$["The skill of our ancestors", "A lack of talent", "Just random designs", "They have no meaning"]$tr$::jsonb),
('e40df119-82cc-4c1b-a7d2-ff71b2420dbb', $tr$What is a balanced meal?$tr$, $tr$["Carbohydrates, protein, vegetables, fruits", "Only rice", "Only sweets", "Only drinks"]$tr$::jsonb),
('e463d841-8aab-4898-b554-82b6e3e52805', $tr$What value does getting along with others in a social dance mixer stress?$tr$, $tr$["The fun of mixing with different classmates", "Being alone", "Losing a game", "Competition only"]$tr$::jsonb),
('e4842eb6-5fa1-48d0-be10-763b31cb9097', $tr$What is a pattern?$tr$, $tr$["A regular repeating of a design", "A single color", "Just one dot", "Just one line"]$tr$::jsonb),
('e4cbaa86-937e-4747-a994-8534c6186437', $tr$What is rhythm?$tr$, $tr$["Repeated sounds in music", "Color of clothes in a dance", "Name of a song", "Instrument used"]$tr$::jsonb),
('e50cd625-0aed-40e0-a42a-eb0c419840eb', $tr$Who should prescribe medicine?$tr$, $tr$["A doctor or parent", "Only a friend", "Anyone", "No one needs to"]$tr$::jsonb),
('e52a3589-576b-49d2-91f2-efa5c1eecd67', $tr$What do you do when there is a signal in a social dance mixer?$tr$, $tr$["Move to the next partner", "Stop and sit down", "Leave the room", "Start a different game"]$tr$::jsonb),
('e5f33030-18ba-4302-b826-4aba5412c786', $tr$Why is physical activity like dance an important part of MAPEH?$tr$, $tr$["It keeps the body healthy and teaches coordination", "It means nothing for health", "It is not part of physical education", "It is done only to entertain the teacher"]$tr$::jsonb),
('e60c7a9e-741f-4d7e-ad8d-25f2adb3f79c', $tr$What should we keep in mind while doing the activity?$tr$, $tr$["The safety of everyone taking part", "Only the price of the equipment", "Only the time it ends", "Nothing, there is nothing to think about"]$tr$::jsonb),
('e6354059-2fc3-4071-9fb7-f1e62e44b2a6', $tr$What should the verse you write be like?$tr$, $tr$["It tells a story and changes each time", "Its words are always the same", "It has no words", "An instrument only"]$tr$::jsonb),
('e64786d1-d151-4cff-97c5-808c53fd7110', $tr$What does mixing with others in a social dance mixer bring?$tr$, $tr$["Joy in connecting with different classmates", "Being alone", "Only competition", "No interest in others"]$tr$::jsonb),
('e655f9b3-33ba-44eb-849d-b770a87d5f68', $tr$The big lesson of Term 2 in MAPEH?$tr$, $tr$["The importance of health and Filipino culture", "No particular lesson", "Only about sports", "Only about music"]$tr$::jsonb),
('e6631e86-43cc-4089-8db7-b9e2d3af6799', $tr$What does 'Inang Bayan' (Mother Country) stand for in these plays?$tr$, $tr$["The Philippines", "Spain", "Japan", "America"]$tr$::jsonb),
('e67d91f8-7692-4e6a-b45f-e6e7efd9e7b3', $tr$What is the first step in planning a family wellness day?$tr$, $tr$["Choosing a game that fits everyone", "Starting the game right away", "Giving prizes right away", "Ending the activity right away"]$tr$::jsonb),
('e6864f7b-6558-44e7-8cb8-dc3c7126ba49', $tr$Which is NOT part of a balanced meal?$tr$, $tr$["Junk food as the main food", "Carbohydrates", "Protein", "Vegetables and fruits"]$tr$::jsonb),
('e6caa7ff-85fe-4e3a-b1d0-c7ff010366c3', $tr$Why teach the basics before harder steps?$tr$, $tr$["A strong foundation", "No reason", "Basics are not needed", "Any dance can be done right away"]$tr$::jsonb),
('e6e18269-6dc9-47b4-a78a-7585bdf4b152', $tr$What does effort mean in movement concepts?$tr$, $tr$["How fast or how strong the movement is", "Where the body moves", "Who is playing with you", "How many points you scored"]$tr$::jsonb),
('e7b923bc-bcc4-4441-8bad-cd161db9d19b', $tr$A dance uses bamboo poles that are clapped together to a rhythm. What dance is it?$tr$, $tr$["Tinikling", "Waltz", "Cha-cha", "Ballet"]$tr$::jsonb),
('e7cc6b00-460e-4a9f-8bb2-ffd0c0e4fe81', $tr$What is self-esteem?$tr$, $tr$["A positive view of yourself", "Always doubting yourself", "Always following your friends", "Not valuing yourself"]$tr$::jsonb),
('e7fe8cc5-0739-4f18-9aca-78c096087436', $tr$What is One Health?$tr$, $tr$["The idea that the health of people, animals, and the environment are connected", "A kind of vaccine", "A kind of exercise", "A kind of medicine"]$tr$::jsonb),
('e8cd8d2a-0dfa-4871-8e09-b6f713369a26', $tr$A picture has lines leading to a mountain. What does this show?$tr$, $tr$["Movement", "Only rhythm", "Only pattern", "Only color"]$tr$::jsonb),
('e8d590a4-17ac-4623-af4b-f1ef4cd58d6c', $tr$Which one is a manipulative skill?$tr$, $tr$["Dribbling a ball", "Walking on the court", "Jumping in place", "Sliding to the side"]$tr$::jsonb),
('e8ffb99f-acc9-4cec-b461-4fb9a5570374', $tr$Why should the object you throw in a game be light?$tr$, $tr$["So it won't hurt a playmate", "So it flies farther", "So the game ends faster", "So it looks nicer"]$tr$::jsonb),
('e919826b-ca83-4ed7-ad23-70707a6794b6', $tr$What is 'Recycle'?$tr$, $tr$["New things from old materials", "Throwing away right away", "Burning trash", "Keeping it hidden forever"]$tr$::jsonb),
('e949f618-ca19-482d-88f8-35f4c9ac5663', $tr$Why is it important to watch the ball until you hit it?$tr$, $tr$["It makes your hit more accurate", "It makes the player run faster", "It stops the opponent from catching it", "It makes the ball lighter"]$tr$::jsonb),
('e99db45d-57a7-4b5c-b81d-184afa2c6f8f', $tr$Why is it important to study the visual arts of the past?$tr$, $tr$["It helps us understand the culture of our ancestors", "It has no meaning at all today", "It is done only for fun", "It is not really part of our history"]$tr$::jsonb),
('ea030647-f0b7-43c4-8df9-5353f6f68059', $tr$Why is it important to know the effects of gateway drugs at a young age?$tr$, $tr$["Because a child's growing body and brain are affected faster", "They have no effect on kids", "They are safe as long as it is not every day", "It is not a real danger"]$tr$::jsonb),
('ea2bc6cf-1ed8-4452-aacb-24cf27de4053', $tr$What is melodic direction?$tr$, $tr$["Whether the tune goes up, goes down, or stays level", "How fast the music is", "How loud the sound is", "The instrument being used"]$tr$::jsonb),
('eb381c00-43ed-4294-9438-fb1cccccf269', $tr$What is the goal of studying rhythm and pattern as visual elements?$tr$, $tr$["To see the skill in our ancestors' art", "Only to see a lack of talent", "Just to make random designs", "It has no meaning here"]$tr$::jsonb),
('ebce60f4-c650-4215-867f-a350e07dfcac', $tr$What did we learn about music this term?$tr$, $tr$["Meter, time signature, and rhythmic dance patterns", "Only the history of computers", "Only math in this activity", "We didn't learn anything this time"]$tr$::jsonb),
('ebef2db9-572a-4d51-8fa6-7b503b3bf9e7', $tr$What comes from mixing traditional and modern moves in dance?$tr$, $tr$["A special style that reflects both the past and the present", "Nothing", "It is only confusing", "It makes tradition disappear"]$tr$::jsonb),
('ebf6cead-15ae-4156-be8a-e1876b57d4e8', $tr$What should a child do before taking any medicine?$tr$, $tr$["Ask a parent or doctor for permission and guidance", "Take it right away without asking", "Ask only a friend", "Just follow a TV commercial"]$tr$::jsonb),
('ec32cd96-77c2-486c-84ff-0cb580fd82c2', $tr$What is self-esteem?$tr$, $tr$["A positive view of yourself", "Always doubting yourself", "Always following your friends", "Not valuing yourself"]$tr$::jsonb),
('ec520247-a596-4322-a4bd-eb31a9fe0dac', $tr$What do we gain from doing the activity instead of only planning it?$tr$, $tr$["Real experience and lessons learned", "Nothing meaningful", "It only slows down the work", "Nothing new is learned"]$tr$::jsonb),
('ec54287c-2254-4d18-891c-e94a56c3b56d', $tr$Why is it important to keep our roots in tradition while art keeps growing?$tr$, $tr$["It gives us identity in the middle of change", "It is not important", "We should forget about tradition", "Roots are no longer needed"]$tr$::jsonb),
('ec74c93a-fb4f-4f09-8344-d239fb75e476', $tr$What is contemporary art?$tr$, $tr$["Modern artworks that show life today", "Art that only comes from other countries", "A kind of game", "A punctuation mark"]$tr$::jsonb),
('ec79b7e1-5e29-4b81-a7fa-84779b030395', $tr$What are striking/fielding games?$tr$, $tr$["Games with hitting/throwing a ball and running", "Games with only a net as a barrier", "Games with no ball at all", "Games played while sitting down"]$tr$::jsonb),
('eca36d6e-4eb8-4237-8006-2eb6593bb33b', $tr$In kickball, where is the best place to send the ball?$tr$, $tr$["To an empty space", "Toward the fielder", "Outside the whole court", "Behind your own base"]$tr$::jsonb),
('ecca4c61-16fb-403e-9daf-7a432cbf0d7f', $tr$What if it is hard to find a tune?$tr$, $tr$["Try your voice or clapping", "Just give up", "Forget the project", "Copy someone else"]$tr$::jsonb),
('eccef96d-f8d8-4226-a30c-e4174b5b851c', $tr$A church hymn has the same tune in every verse. Which form does this show?$tr$, $tr$["Strophic", "Binary", "Free-form", "No form"]$tr$::jsonb),
('ed316eb8-d8f8-4853-b24b-5278889f5d80', $tr$How can you clap a rhythmic pattern correctly?$tr$, $tr$["Listen first before repeating it", "Just clap any way you like", "Read the song's lyrics", "Buy a new instrument"]$tr$::jsonb),
('ed474fca-f326-4385-95de-b8353b595292', $tr$Props used in the Tinikling?$tr$, $tr$["Bamboo poles", "Umbrella", "Oil lamp", "Glass"]$tr$::jsonb),
('ed68895a-8045-4162-aa23-69d078de9a1c', $tr$What did we learn about a healthy family?$tr$, $tr$["Its traits and healthy activities", "Only the country's history", "Only math", "Only science"]$tr$::jsonb),
('ed7e4318-922f-41b4-a1a2-d7514eeda251', $tr$Why is perceiving important when making art?$tr$, $tr$["It helps show shape and light correctly", "It has no role in making art", "It is used only when selling the work", "It is not part of the creative process"]$tr$::jsonb),
('ee1cb7d3-91ce-423f-a2de-2f7ba5273b66', $tr$What time signature was used in the rhythmic dances?$tr$, $tr$["2/4", "6/8", "9/4", "No time signature"]$tr$::jsonb),
('eea4ca2d-6437-4170-befe-5de2b3f55975', $tr$How many members are recommended in a group?$tr$, $tr$["4-6 people", "Only 1 person", "20 people", "No set number"]$tr$::jsonb),
('eec439aa-d392-47ab-96de-6d5f69470213', $tr$In Agawan Base, one team has weak defense, so their base keeps getting captured. What should they improve?$tr$, $tr$["Defending their space", "Singing while playing", "Drawing a new play area", "Avoiding the whole game"]$tr$::jsonb),
('eec7c986-6382-484e-9cbe-f35edcbc1a4b', $tr$In Tatsing, what do you use to hit the targets?$tr$, $tr$["Pamato (a flat shooter stone or disc)", "Slipper", "Long stick", "Big ball"]$tr$::jsonb),
('eed74275-cd2b-40b1-89a8-f4ff88234662', $tr$Why doesn't the tune have to be perfect?$tr$, $tr$["Sharing the idea is what matters", "It has to be perfect", "A tune is not needed anymore", "It doesn't matter at all"]$tr$::jsonb),
('ef1fa0c9-69a5-4967-b494-9a61c6008d9c', $tr$What are gateway drugs?$tr$, $tr$["Substances that open the way to more dangerous drugs", "A kind of food", "Legal medicine", "A kind of vitamin"]$tr$::jsonb),
('ef39553d-713d-4944-a17f-fe1ecea67234', $tr$Why is everything we covered in MAPEH this term important?$tr$, $tr$["It gives balanced growth in arts, health, and physical skills", "Only one of these should be studied", "It is pointless in a child's life today", "It is only done for fun in this activity"]$tr$::jsonb),
('ef63b448-a0a0-4448-8c25-25fe79ee7664', $tr$What is the goal in target games?$tr$, $tr$["To send an object to the target", "To run the fastest", "To climb the highest", "To swim the farthest"]$tr$::jsonb),
('ef63ba01-8206-4483-b668-5af162b72605', $tr$How is this connected to the communicable diseases we learned before?$tr$, $tr$["Both are about preventing disease", "There is no connection", "One is only about science", "One is about math"]$tr$::jsonb),
('ef7ef6e7-a158-4434-829b-90c4267cf64d', $tr$What period of music and art did we study earlier?$tr$, $tr$["Early Spanish Colonial Period", "American period", "Japanese period", "Present day"]$tr$::jsonb),
('ef974f32-fa9a-44f1-a6c3-ab7771b77409', $tr$Why is pass and move important?$tr$, $tr$["The ball moves faster than a person", "The game lasts longer", "You get less tired", "Counting is easier"]$tr$::jsonb),
('efc0dfd1-7cd5-4325-bfc7-2fa1c940faae', $tr$Why is dance exercise taught?$tr$, $tr$["To support physical health", "It has no purpose", "Only for older people", "Not related to PE"]$tr$::jsonb),
('f038e4d2-8762-455a-866d-37bb88d374a7', $tr$Where is the best place to send the ball in net/wall games?$tr$, $tr$["Into the opponent's open space", "To the closest part of the net", "To the same spot every time", "Outside the court"]$tr$::jsonb),
('f12783c3-0087-4522-b1ff-4a97db4af28c', $tr$What is a street dance festival?$tr$, $tr$["A yearly event of dancing in the streets to celebrate", "A kind of game at home", "A kind of food", "A punctuation mark"]$tr$::jsonb),
('f127efac-60ec-4998-9651-7c8d169c57df', $tr$What is a pattern?$tr$, $tr$["A regular repeating of a design", "A single color", "Just one dot", "Just one line"]$tr$::jsonb),
('f14236aa-08b6-4df9-aad4-b9b00d739217', $tr$Why should safety be thought about when planning the activity?$tr$, $tr$["To prevent accidents and make sure everyone is safe", "It has nothing to do with the activity", "Only to make the game faster", "So there is no need to plan anymore"]$tr$::jsonb),
('f14a0c07-ed5e-4426-ae9f-5fb6b9197694', $tr$What do you need to follow tempo changes well?$tr$, $tr$["Good coordination and listening to the music", "Ignoring the music", "Only being alone", "No special skill"]$tr$::jsonb),
('f16386be-235d-47c4-a893-ae478b889b2d', $tr$Which is an example of contemporary expression?$tr$, $tr$["Modern music influenced by OPM", "Only dances from other countries", "No example", "A kind of food"]$tr$::jsonb),
('f1763370-9608-422e-bc03-305396b0dd5b', $tr$What is volleying?$tr$, $tr$["Sending the ball back before it hits the floor", "Hitting the ball with a bat", "Running to a base", "Catching the ball with two hands"]$tr$::jsonb),
('f1ceec34-4e80-44ec-a78b-03d10688dacc', $tr$How many times is the chorus usually sung in a song?$tr$, $tr$["More than once", "Only once", "It is not sung", "Only at the end"]$tr$::jsonb),
('f1d183c4-56fc-49d1-8c27-efe6ce76f002', $tr$Which is a HEALTHY way to deal with stress?$tr$, $tr$["Deep breathing and exercise", "Hiding all your feelings", "Hurting other people", "Avoiding all your friends"]$tr$::jsonb),
('f1ebfc94-eea6-44f2-9ec8-663b21211661', $tr$What is the skill of saying no (assertiveness)?$tr$, $tr$["Being able to say \"no\" with confidence", "Being able to always agree with others", "Being able to always stay quiet", "Being able to avoid all conversations"]$tr$::jsonb),
('f22f9a85-ceea-4a11-b7d9-bbaba416fd06', $tr$What is movement exploration?$tr$, $tr$["Trying out different body movements", "A kind of food", "A kind of song", "A kind of toy"]$tr$::jsonb),
('f2c8b973-de69-43ea-b5aa-2fec9eafe926', $tr$In Calahoyo, where do you send the ball or stone?$tr$, $tr$["Into a small hole in the ground", "To the top of a tall pole", "Into a playmate's hand", "Outside a big circle"]$tr$::jsonb),
('f2f85be1-52b6-4f88-80db-ef92a22b9fbf', $tr$Why is consumer health taught in MAPEH?$tr$, $tr$["To learn to protect yourself as a shopper", "It has no purpose", "It is not related to health", "Only for adults"]$tr$::jsonb),
('f3ff0c62-2267-43fe-9432-0113316ddb10', $tr$What is the resolution?$tr$, $tr$["The solving of the problem", "The start of the problem", "The introduction of the characters", "The highest tension"]$tr$::jsonb),
('f420f94e-60b1-4fcd-887f-cf545faa76ac', $tr$What is the goal of playing Filipino games in PE?$tr$, $tr$["To build physical skills while valuing our culture", "Just to play with no real goal", "This activity has no real goal", "Just to finish the whole class quickly"]$tr$::jsonb),
('f465e137-6185-4794-b1a2-5a7d2f541f50', $tr$What props are used in the Tinikling?$tr$, $tr$["Bamboo poles", "Umbrella", "Oil lamp", "Glass"]$tr$::jsonb),
('f48dd5bc-098f-4809-bdc2-acbbb1d7cb14', $tr$What is the chain of infection?$tr$, $tr$["The process of how disease spreads", "A kind of medicine", "A kind of exercise", "A vaccine"]$tr$::jsonb),
('f4c54b34-70c2-4b34-b305-0d5dcc6c78a9', $tr$What is a physical benefit of dance exercise?$tr$, $tr$["A stronger body and better coordination", "No benefit", "It makes the body weaker", "It stops you from moving"]$tr$::jsonb),
('f4ca29cc-b2ec-4c82-b878-5402e1a04f4f', $tr$Why is art used to express identity?$tr$, $tr$["It gives a creative way to show culture", "Art is not important for expression", "Art is not related to identity", "It is not related to culture"]$tr$::jsonb),
('f5b4dea9-069a-4cb1-8e39-533dda9fec78', $tr$Which is an assertive response?$tr$, $tr$["\"I don't like that. Please stop.\"", "\"I don't care about you.\"", "\"Are you really that stupid?\"", "Quietly walking away."]$tr$::jsonb),
('f6173dc3-1816-472d-95cc-82dd24e922d3', $tr$What right does a consumer have?$tr$, $tr$["The right to know the true price and quality", "No rights", "The right to just accept everything", "The right to pay too much"]$tr$::jsonb),
('f618e8f1-045b-47b2-91d8-893a76f9efb4', $tr$What is balance?$tr$, $tr$["The ability to stay steady while moving", "The ability to run very fast", "The ability to count fast", "The ability to sing loudly"]$tr$::jsonb),
('f670fd2d-002b-4900-bbb5-617718f7d7be', $tr$What is misuse of medicine?$tr$, $tr$["Taking more than the dose or without permission", "Taking it as prescribed", "Following the schedule", "Reading the label"]$tr$::jsonb),
('f6b00797-8275-4b40-9f02-91eebaeec3cd', $tr$Why is self-confidence important when dancing in front of others?$tr$, $tr$["It helps you show the choreography well", "It has no value", "Self-confidence is not needed", "It only gets in the way"]$tr$::jsonb),
('f724944c-a953-43ab-b88c-d32e8dff7454', $tr$How was pre-colonial art different from early Spanish colonial art?$tr$, $tr$["The later one was influenced by Europe", "They were exactly the same", "There was no difference", "Pre-colonial was the more modern style"]$tr$::jsonb),
('f725965e-c6fb-475b-8fd3-6f396b3fdcfd', $tr$An example of good sanitation?$tr$, $tr$["Clean water and proper trash disposal", "Trash scattered around", "Being careless with water", "Throwing trash in the river"]$tr$::jsonb),
('f7ac9c71-9781-4744-80cc-13b72e2faa47', $tr$What is the goal of improvising a rhythm?$tr$, $tr$["To create your own new pattern", "To just copy someone else's song", "To stay quiet the whole session", "To just read the lyrics"]$tr$::jsonb),
('f7b3ab31-1375-4d4d-8f9a-0a5a0f0f11f7', $tr$Your throws in Tumbang Preso keep missing. What is the BEST way to get better?$tr$, $tr$["Fix your positioning before you throw", "Throw as hard as you can", "Walk right up to the can", "Throw with your eyes closed"]$tr$::jsonb),
('f7eb88ca-22a8-48c2-9d6a-7b896566ed09', $tr$What does a vaccine do to the body?$tr$, $tr$["It helps build immunity against disease", "It causes disease in the body", "It has no effect on the body", "It weakens the immune system"]$tr$::jsonb),
('f7ed546d-bcfc-4979-877a-95660d6ee23c', $tr$Why is it important to review what we learned in MAPEH this term?$tr$, $tr$["It helps us remember and connect the ideas", "It has no meaning for our learning", "It is done only to get a grade", "It only confuses a student"]$tr$::jsonb),
('f8196bb9-d204-40e4-9059-facb2c34f754', $tr$Link between legend dances and culture?$tr$, $tr$["They show the tradition of storytelling", "No link", "They come from another country", "Not part of the culture"]$tr$::jsonb),
('f87d0caa-7d39-410c-b1ae-5665e46b203f', $tr$What is melody?$tr$, $tr$["A series of sounds that forms the tune of a song", "The speed of a song", "The loudness of the sound", "The instrument used"]$tr$::jsonb),
('f8ad543e-be0f-4ef4-bee2-9b2f5008e09c', $tr$Which one is an example of a striking/fielding game?$tr$, $tr$["Softball", "Badminton", "Volleyball", "Table tennis"]$tr$::jsonb),
('f8db8716-4cca-4426-bf27-fc342246ada2', $tr$How is food literacy linked to consumer health?$tr$, $tr$["Both help with smart and healthy choices", "No link", "Food literacy is only about taste", "Consumer health is not related to food"]$tr$::jsonb),
('f96bd0c0-d6e8-4001-9d92-3b78b01658b9', $tr$What simple instrument can you use to make a tune?$tr$, $tr$["A bell or clapping", "Piano only", "Guitar only", "No instrument can be used"]$tr$::jsonb),
('f9887444-379f-4f6f-9e53-187a5b098d4e', $tr$Why do you need to practice timing with the music?$tr$, $tr$["So the moves are smooth and in sync", "There is no need to practice", "Just to make the time longer", "Timing has nothing to do with dance"]$tr$::jsonb),
('f9d37947-8b65-43ce-8e50-0a8760344685', $tr$Mood swings while growing up are:$tr$, $tr$["a normal part of puberty", "a sign of a serious illness", "a reason to stay away from your family", "a sign of bad behavior"]$tr$::jsonb),
('f9f32bc3-89c0-467a-bbf7-3c60234ddd68', $tr$What should you do before taking any medicine?$tr$, $tr$["Ask permission from a parent or doctor", "Take it right away", "Ask only a friend", "Follow a TV commercial"]$tr$::jsonb),
('fa8c1e52-26a5-432d-9f91-42463a46d4ca', $tr$Why are dance and theater used for legends?$tr$, $tr$["To keep the story alive in an artistic way", "No purpose", "Not linked to culture", "Just a new creation"]$tr$::jsonb),
('facf0a1e-ceee-49da-9eb1-e9f46bc1b38a', $tr$What do we call the repeating part that everyone usually sings?$tr$, $tr$["Chorus", "Verse", "Bridge only", "Introduction"]$tr$::jsonb),
('fb852903-6187-494b-b062-8002b08cf9a3', $tr$Why read the label before taking medicine?$tr$, $tr$["To know how to use it correctly", "You don't need to read it", "It is only decoration", "It is only for grown-ups"]$tr$::jsonb),
('fb93dce3-5346-4e1e-b85c-cae522778671', $tr$Why is it important to identity?$tr$, $tr$["It shows how identity changes and grows", "It is not important", "Traditions disappear", "Not part of the culture"]$tr$::jsonb),
('fcb495cd-a887-4ec2-9214-519c71725dd4', $tr$What is the goal of reviewing before the break?$tr$, $tr$["To make sure we are ready for new topics next term", "It has no goal", "Just to entertain the teacher", "To replace math lessons"]$tr$::jsonb),
('fd045b51-6861-4df9-9650-c974bad8b167', $tr$Who does the conqueror stand for in seditious plays?$tr$, $tr$["The foreign rulers", "The Filipinos", "The Mother Country", "The children"]$tr$::jsonb),
('fd22dab3-7a29-4b2a-a756-e395a03b6041', $tr$Why is it important to actually carry out the plan, not just plan it?$tr$, $tr$["To experience the real benefits of exercise", "Planning alone is enough", "It has no extra benefit", "Only the planning matters"]$tr$::jsonb),
('fd27e3e8-29c3-4e34-9116-79a1f87d63e8', $tr$Where is the Sinulog held?$tr$, $tr$["Cebu", "Aklan", "Iloilo", "Manila"]$tr$::jsonb),
('fd3bb77b-d649-41d7-9fc2-888562fe7a88', $tr$Which games did we learn in PE?$tr$, $tr$["Target and invasion games", "None", "Only one game", "No games"]$tr$::jsonb),
('fd43fc68-c566-4e2b-98af-f3470695ca8e', $tr$Where is the Sinulog held?$tr$, $tr$["Cebu", "Aklan", "Iloilo", "Manila"]$tr$::jsonb),
('fd705af9-bb1e-4b2c-9a1c-c8c894eda8fd', $tr$Which one is an example of a net/wall game?$tr$, $tr$["Badminton", "Softball", "Baseball", "Patintero"]$tr$::jsonb),
('fd75faf4-83b3-43ba-95ea-63da6e7cfe34', $tr$According to One Health, why are animal diseases connected to human diseases?$tr$, $tr$["Some diseases can pass from animals to people", "The two have no connection", "Animals never get sick", "People never catch diseases from animals"]$tr$::jsonb),
('fd9e8307-c57e-419a-a134-de2372ed0b6f', $tr$What does a vaccine do?$tr$, $tr$["Builds immunity", "Causes disease", "Has no effect", "Weakens the immune system"]$tr$::jsonb),
('fdcfbce1-a2df-402c-95cc-e771df4dda13', $tr$How is dance exercise related to the environmental health we learned before?$tr$, $tr$["The topics are different, but both are about overall health", "The two have no connection", "Both are only about science", "Both are about math"]$tr$::jsonb),
('fdfd4714-5b27-4138-9fbd-9881254bb321', $tr$Why understand the chain of infection?$tr$, $tr$["To prevent the spread of disease", "It has no use", "It is not needed", "It is only about animals"]$tr$::jsonb),
('fe444558-c61a-4c9a-8408-e14cbd864a6d', $tr$What are net/wall games?$tr$, $tr$["Games with a barrier between the two sides", "Games with no rules", "Games with no opponent", "Games played only in water"]$tr$::jsonb),
('fe65ddc0-2cb7-4d45-9ab6-bf00f9c51a10', $tr$Why are legends taught through dance and theater?$tr$, $tr$["It keeps the story and culture alive in an artistic way", "It has no purpose", "It is not linked to culture", "It is just a new creation"]$tr$::jsonb),
('fe6a1a6c-dbd4-4cc8-8c0e-e8c4c175fe37', $tr$What is tempo?$tr$, $tr$["Speed of the music", "Loudness of the sound", "Length of the song", "Name of the song"]$tr$::jsonb),
('fe6bd22e-dc8b-4240-aefb-3249029afba5', $tr$A classmate is trying to force you to do something you don't want to do. What should you do?$tr$, $tr$["Say \"no\" clearly and talk to a trusted adult", "Just go along so your classmate won't get annoyed", "Hide what happened from everyone", "Avoid your classmate forever"]$tr$::jsonb),
('fe707d02-e5ba-496c-9747-be9c52a1bc9b', $tr$Why is a safe environment important?$tr$, $tr$["Safety and health", "It has no value", "It is not needed", "Only for adults"]$tr$::jsonb),
('fe8d1a85-9aa7-4f8a-9c4d-8ca48a77a99b', $tr$What did we plan last week?$tr$, $tr$["A dance-for-health session with visual art", "A math exam", "A letter to a parent", "A farming activity"]$tr$::jsonb),
('feceda88-d255-4a3f-8b11-a53dba8455c8', $tr$What tempo fits a funeral song?$tr$, $tr$["Slow", "Fast", "Only medium", "No tempo"]$tr$::jsonb),
('ff3cefcd-ca47-4152-8e17-d04a97c5a8cf', $tr$What should you do before playing?$tr$, $tr$["Warm up", "Eat a lot", "Go to sleep right away", "Drink something cold"]$tr$::jsonb),
('ff46d3da-26e2-4045-97cc-a95d2b6bde78', $tr$How is it related to environmental health?$tr$, $tr$["Both are about overall health", "No connection", "Both are only science", "Both are math"]$tr$::jsonb),
('ff91cef5-fdfc-47fe-b025-ad7095d267d4', $tr$What music is often used in native dances?$tr$, $tr$["Drums or gongs", "Piano", "Guitar", "Violin"]$tr$::jsonb),
('ff9947bd-75ea-492d-9808-c071580702e9', $tr$Example of movements in movement exploration?$tr$, $tr$["Bending, turning, jumping", "Eating, drinking", "Writing, reading", "Watching TV"]$tr$::jsonb),
('ffa9dffa-3128-456a-86f9-132a7754eaf8', $tr$What is the difference between striking/fielding and net/wall games?$tr$, $tr$["Striking/fielding has hitting and running; net/wall has a barrier", "Both have no ball", "Both are only played while sitting", "There is no difference between the two"]$tr$::jsonb),
('ffeb7214-4387-493d-a365-c46e31fb61e9', $tr$Who performs the Singkil?$tr$, $tr$["The Maranao", "The Ilokano", "The Bisaya", "The Tagalog"]$tr$::jsonb);

insert into _mapeh_boss values
('00252f73-6e51-4518-bec1-ae9ccf842551', $tr$What did Filipinos use in theater during the American period to show their love for the country?$tr$, $tr$["Symbolism in theater", "Openly opposing the rulers", "Obeying the government", "Just staying quiet"]$tr$::jsonb, $tr$Art, Feelings, and Changes in Myself$tr$),
('0031ecb9-7595-48f5-b43d-b42694ef780c', $tr$What is the goal of doing this kind of activity in MAPEH?$tr$, $tr$["To use the musical form you learned in a creative project", "It has no goal", "Just to entertain the teacher", "To replace the math lessons"]$tr$::jsonb, $tr$Writing Your Own Simple Song$tr$),
('00a6b39d-0f2c-40f8-9c36-2b32986bc17c', $tr$In net/wall games, where is the best place to send the ball?$tr$, $tr$["To the opponent's open space", "To the part closest to the net", "To the same spot every time", "Outside the court"]$tr$::jsonb, $tr$Striking/Fielding and Net/Wall Games (Term 2, Week 1)$tr$),
('00bff6c9-3c48-4c00-9ac2-6bebca1ec2e7', $tr$What is an example of a topic you can use for a song?$tr$, $tr$["Love for your family", "Business law", "The country's economy", "How the government is run"]$tr$::jsonb, $tr$Writing Your Own Simple Song$tr$),
('01913fc1-d3c0-4dfe-ac37-587d3de8f044', $tr$What is the chain of infection?$tr$, $tr$["The process of how a disease spreads", "A kind of medicine", "A kind of exercise", "A vaccine"]$tr$::jsonb, $tr$Health: Common Infectious Diseases$tr$),
('020a9eff-72b3-4450-a3ef-7f280b8cb79b', $tr$How is food literacy connected to consumer health?$tr$, $tr$["Both help us make smart and healthy choices", "They have no connection", "Food literacy is only about taste", "Consumer health has nothing to do with food"]$tr$::jsonb, $tr$Consumer Rights and Responsibilities$tr$),
('020c6cd6-1a64-4325-b336-a34ffa1baa9e', $tr$Why should you choose friends who are a positive influence?$tr$, $tr$["They help you stay away from bad behavior", "It has no effect", "New friends are always bad", "It does not matter"]$tr$::jsonb, $tr$Effects of Gateway Drugs$tr$),
('020da321-6718-4205-8fc5-c3ea2a93768c', $tr$What does the Singkil dance show?$tr$, $tr$["Maranao culture, using bamboo poles and umbrellas", "A foreign culture", "Just a kind of game", "It has no special meaning"]$tr$::jsonb, $tr$Traditional/National Dances$tr$),
('028567e1-458d-4f7f-a62f-cfa0c900a6ac', $tr$Which one is an example of a gateway drug?$tr$, $tr$["Cigarettes", "Milk", "Water", "Fruit"]$tr$::jsonb, $tr$Term 2 Review: Music, Arts, PE, and Health$tr$),
('02c1c07c-3a72-4653-8799-3d38adecbb35', $tr$What is the goal of this week's practice?$tr$, $tr$["To build coordination when the tempo changes", "To learn reading only", "To learn math", "To play basketball"]$tr$::jsonb, $tr$Combining 2/4 and 3/4 Time$tr$),
('02d85ed0-0b31-44f3-a990-826cb6e6962c', $tr$What is the big lesson of all of Term 2 in MAPEH?$tr$, $tr$["The importance of health and Filipino culture in everyday life", "There is no special lesson", "It is only about sports", "It is only about music"]$tr$::jsonb, $tr$Term Review: Arts, Culture, and Health$tr$),
('02ee9f06-6aef-4cb0-9fc5-3f9b7e32a404', $tr$What tempo fits a fiesta song?$tr$, $tr$["Fast", "Slow", "No rhythm", "Silent only"]$tr$::jsonb, $tr$Music: Rhythm and Tempo$tr$),
('0337cdaa-ce18-4a8f-9b46-59f52c605b51', $tr$What role does the family play as a child grows up?$tr$, $tr$["They are the child's first guide in making good choices", "They have no role at this stage of life", "They should only watch from far away", "Only they should make decisions for the child"]$tr$::jsonb, $tr$Art, Feelings, and Changes in Myself$tr$),
('039e6333-4851-469f-9a29-d57c865d46cd', $tr$Why is medicine safe when it is used the right way?$tr$, $tr$["Because it is taken with the right dose and for the right reason", "All medicine is safe no matter how you take it", "Medicine has no effect", "You no longer need to keep track of it"]$tr$::jsonb, $tr$Proper Medicine Use vs. Misuse$tr$),
('03e0133e-1c8d-4dc3-a2aa-77bd360bb63d', $tr$Which is an example of a Filipino striking/fielding game?$tr$, $tr$["Patintero with throwing", "Badminton in the yard", "Volleyball in the park", "Tennis on a court"]$tr$::jsonb, $tr$Striking/Fielding and Net/Wall Games$tr$),
('03f98398-e667-470c-8a2a-20b9e4a6829a', $tr$What is the goal of practicing in 2/4 time?$tr$, $tr$["To keep up with the tempo of fast music", "To learn to write", "To play basketball", "To learn math"]$tr$::jsonb, $tr$Fundamental Dance Steps in 2/4 Time$tr$),
('045745fd-e25b-4fa0-8cb4-177b4f8d1d33', $tr$Which is an example of an EMOTIONAL change while growing up?$tr$, $tr$["Deeper feelings and mood changes", "Getting taller while growing up", "A change in hair color", "Feet getting bigger while growing up"]$tr$::jsonb, $tr$Art, Feelings, and Changes in Myself$tr$),
('04812cf8-0e04-42e4-9611-db1cfa55fd16', $tr$What is One Health?$tr$, $tr$["The idea that the health of people, animals, and the environment are connected", "A kind of vaccine", "A kind of exercise", "A kind of medicine"]$tr$::jsonb, $tr$Environmental Health (One Health)$tr$),
('04b0560f-f926-4f87-8309-4399a12a54a9', $tr$Why is a lot of indigenous music connected to beliefs?$tr$, $tr$["It is used in the community's rituals and celebrations", "It has nothing to do with people's lives", "It was made only by children", "It was written only for tourists"]$tr$::jsonb, $tr$Music: Rhythm and Tempo$tr$),
('04edfb49-eafa-4e94-a63d-f7baf760f016', $tr$What does the Tinikling represent?$tr$, $tr$["The tikling bird", "A tree", "A fish", "A sea animal"]$tr$::jsonb, $tr$Traditional/National Dances$tr$),
('05323b3f-6eb1-4cbb-a272-1ac8b1a6f53c', $tr$What do you need to keep up with the tempo well?$tr$, $tr$["Coordination and listening to the music", "Ignoring it", "Being alone", "Nothing"]$tr$::jsonb, $tr$Combining 2/4 and 3/4 Time$tr$),
('0538cbbd-472f-4565-bfc5-fc351fdc0c6b', $tr$Why is rhythm important in ritual dances?$tr$, $tr$["It gives order and unity to the movements", "It has no meaning", "It is only used in games", "It only makes things take longer"]$tr$::jsonb, $tr$Arts: Rhythm and Movement in Indigenous Rituals$tr$),
('065ad1d9-64af-4597-a7ba-9faeb4d42699', $tr$What is another health right of a child?$tr$, $tr$["Medical care", "No right to health", "The right to work only", "The right not to eat"]$tr$::jsonb, $tr$Legend Theater and Dance; Health Rights$tr$),
('069a7fc2-37d4-4086-89cd-8e02758c165a', $tr$How does dance exercise help with coordination?$tr$, $tr$["You need to keep up with the steps and the tempo of the music", "You do not need coordination here", "It has nothing to do with coordination", "You just stand there"]$tr$::jsonb, $tr$Dance Exercise$tr$),
('06fedc4c-8bd9-4565-9b87-ec414da408f6', $tr$How is food literacy connected to consumer health?$tr$, $tr$["Both help us make smart choices", "They have no connection", "It is only about taste", "It has nothing to do with food"]$tr$::jsonb, $tr$Consumer Rights and Responsibilities$tr$),
('070c63d6-6b88-4a98-a91f-3de7826b20f1', $tr$Why is a safe environment important?$tr$, $tr$["For safety and health", "It is not important", "It is not needed", "It is only for adults"]$tr$::jsonb, $tr$Legend Theater and Dance; Health Rights$tr$),
('07b3d10a-89b2-45d2-86c5-90b9f66eb68a', $tr$A dance uses bamboo poles that are clapped together to a rhythm. What dance is it?$tr$, $tr$["Tinikling", "Waltz", "Cha-cha", "Ballet"]$tr$::jsonb, $tr$Music: Meter, Time Signatures, and Rhythmic Dance Patterns$tr$),
('07b482a8-4f51-4b49-b6ef-58e172ac57e5', $tr$Why is dance exercise taught in MAPEH?$tr$, $tr$["To build physical health in a fun way", "It has no purpose", "It is only for adults", "It is not related to PE"]$tr$::jsonb, $tr$Dance Exercise$tr$),
('07bb0ca6-723a-456d-8e0e-fce8a8744a02', $tr$Why are legends turned into artworks instead of only being read as text?$tr$, $tr$["It gives us another way to appreciate the story", "There is no reason", "You no longer need to read the legend", "Art makes it harder to understand"]$tr$::jsonb, $tr$Legend Theater and Dance; Health Rights$tr$),
('0816c738-0e5a-4313-b5b5-2d12dbe1c68c', $tr$What time period does this Visual Arts strand cover?$tr$, $tr$["Early Spanish Colonial Period (1521-1600)", "The American colonial period", "The Japanese occupation period", "The present day"]$tr$::jsonb, $tr$Visual Arts in the Early Spanish Colonial Period$tr$),
('08d9f5a0-f9e4-47fd-b3f2-14d8b5458118', $tr$What did we learn about the changes that happen while growing up?$tr$, $tr$["They are a normal part of growing up, including physical and emotional changes", "They are not normal and we should always be ashamed of them", "We learned nothing about it in this activity", "It is not part of MAPEH in this situation"]$tr$::jsonb, $tr$Term Review: Music, Arts, and PE$tr$),
('09c052b1-be26-4998-9d17-a7721b1e5c69', $tr$If you want to stress the main message of a song, which part should you repeat again and again?$tr$, $tr$["Chorus", "Verse", "Only the introduction", "No part"]$tr$::jsonb, $tr$Musical Form: Verse and Chorus$tr$),
('0a1f5bed-166c-4c50-bf4c-8e5d215df5c3', $tr$What do you do when the signal is given?$tr$, $tr$["Move to the next partner", "Stop and sit down", "Leave the room", "Start a different game"]$tr$::jsonb, $tr$Social Dance Mixers$tr$),
('0a55e300-5fa8-41e1-b36e-dfe33e7a9c71', $tr$According to One Health, why are animal diseases connected to human diseases?$tr$, $tr$["Some diseases can pass from animals to people", "The two have no connection", "Animals never get sick", "People never catch anything from animals"]$tr$::jsonb, $tr$Environmental Health (One Health)$tr$),
('0a909965-d272-412e-8289-fcaa0e118606', $tr$How is rhythm created in visual arts?$tr$, $tr$["By repeating shapes or colors", "By making loud sounds", "Only by dancing fast", "By making a long movie"]$tr$::jsonb, $tr$Rhythm, Family Health, and Invasion Games$tr$),
('0b354488-ed94-4310-be3e-3b7a977408f3', $tr$What will happen if you do not follow the signal?$tr$, $tr$["It will be hard to keep up when partners change", "Nothing will happen", "You will win automatically", "The whole music will stop"]$tr$::jsonb, $tr$Social Dance Mixers$tr$),
('0b80c44a-2b5c-444a-a02d-d14a8ed166ee', $tr$What are net/wall games?$tr$, $tr$["Games with a barrier between the opponents", "Games with no rules", "Games with no opponents", "Games played only in water"]$tr$::jsonb, $tr$Striking/Fielding and Net/Wall Games$tr$),
('0c01bac9-6a45-4bc8-a9b2-43ead83f814d', $tr$Why is this topic taught?$tr$, $tr$["To be responsible in preventing disease", "It has no purpose", "It is only for adults", "It is not related"]$tr$::jsonb, $tr$Health: Common Infectious Diseases$tr$),
('0c2d01f5-8112-4459-936f-a3c2f968e211', $tr$What does the top number of a time signature show?$tr$, $tr$["How many beats are in each measure", "Which note gets one beat", "The number of singers", "How long the whole song is"]$tr$::jsonb, $tr$Music: Meter, Time Signatures, and Rhythmic Dance Patterns$tr$),
('0c47a505-3ccf-4aac-a14b-e1d8d48648b2', $tr$Why is it important to think about safety in a wellness activity?$tr$, $tr$["To prevent accidents during the activity", "It has nothing to do with the activity", "Only to make the activity go faster", "You do not need to think about it"]$tr$::jsonb, $tr$Doing Our Family Wellness Activity$tr$),
('0ce8416e-67b1-4d9d-a3be-e98b205fdb8f', $tr$How do fair rules help a family's health?$tr$, $tr$["They bring respect and stability to the home", "They make things hard for the kids", "They have nothing to do with health", "They cause fights"]$tr$::jsonb, $tr$Rhythm, Family Health, and Invasion Games$tr$),
('0d1d93d5-d751-4b0e-b93e-7a28781f9e4a', $tr$What does the bottom number of a time signature show?$tr$, $tr$["Which kind of note gets one beat", "How many beats are in each measure", "The number of singers", "How long the whole song is"]$tr$::jsonb, $tr$Music: Meter, Time Signatures, and Rhythmic Dance Patterns$tr$),
('0d3842fc-f443-4ca3-bbf1-8f647ef54f29', $tr$What did we learn about the dramatic structure of a play?$tr$, $tr$["Exposition, conflict, climax, and resolution", "It has only one part", "We learned nothing about it", "Only the history of the play"]$tr$::jsonb, $tr$Term Review: Music, Arts, and PE$tr$),
('0d3e82ea-1d22-47c1-ad0b-e4887ccd15f7', $tr$What do you gain by actually doing the activity instead of only planning it?$tr$, $tr$["Real experience and lessons learned", "Nothing meaningful", "It only slows down the work", "You learn nothing extra"]$tr$::jsonb, $tr$Doing Our Family Wellness Activity$tr$),
('0d6f6cde-577e-4119-ba77-0403247081ea', $tr$What is the goal of the practice?$tr$, $tr$["To build coordination", "To learn to read", "To learn math", "To play basketball"]$tr$::jsonb, $tr$Combining 2/4 and 3/4 Time$tr$),
('0e2762fd-0265-46e9-9226-16d173288564', $tr$What do you need to keep up well when the tempo changes?$tr$, $tr$["Good coordination and listening to the music", "Ignoring the music", "Being alone only", "No special skill"]$tr$::jsonb, $tr$Combining 2/4 and 3/4 Time$tr$),
('0e635db2-2020-429e-92e0-9e2fe3e9f7b7', $tr$What is the goal of practicing a social dance mixer in 3/4 time?$tr$, $tr$["To follow a gentler tempo while interacting with others", "To learn to write", "To learn math", "To play basketball"]$tr$::jsonb, $tr$Social Dance Mixers in 3/4 Time$tr$),
('0ea5d5b2-4411-4cc5-9aa6-ac5830335a73', $tr$What was the main subject of visual arts during this period?$tr$, $tr$["Saints and scenes from the Bible", "Animals in the forest", "Views of the seashore", "Pictures of kings of long ago"]$tr$::jsonb, $tr$Music and Arts in the Early Spanish Colonial Period$tr$),
('0f23e5d9-40c8-46c7-aa0e-20673b6f21a2', $tr$What benefit does dance exercise give?$tr$, $tr$["It improves coordination and balance", "It has no benefit", "It makes the body weaker", "It only makes you tired"]$tr$::jsonb, $tr$Dance Exercise$tr$),
('0f61fccd-0048-41d3-97ef-95fa13794fd0', $tr$What features does a street dance have?$tr$, $tr$["Loud drum beats and colorful costumes", "Silence and no music", "Only one person dances", "No choreography"]$tr$::jsonb, $tr$Local and Regional Street Dances$tr$),
('1013d35e-bffc-4140-a8bc-95c1721c85a8', $tr$What is an example of a fundamental dance step?$tr$, $tr$["Touch step", "Reading", "Writing", "Swimming"]$tr$::jsonb, $tr$Fundamental Dance Steps in 2/4 Time$tr$),
('106f18df-7f94-4737-9b01-8644ded4c8d6', $tr$Why is water important?$tr$, $tr$["The body needs it to work properly", "It is not important", "It is not part of what we eat and drink", "It is bad for the body"]$tr$::jsonb, $tr$Melody and Healthy Eating$tr$),
('11391ea7-54dd-49be-93b7-a322ad6ec739', $tr$Which food group includes vegetables and fruits?$tr$, $tr$["Vitamins and minerals", "Carbohydrates only", "Protein only", "Fat only"]$tr$::jsonb, $tr$Melody and Healthy Eating$tr$),
('118b63c7-d1b6-496a-b1cf-4d789f05a84e', $tr$Which idea helps you stay steady while moving?$tr$, $tr$["Balance", "Sadness", "Carelessness", "Hardship"]$tr$::jsonb, $tr$Planning Family Health Activities$tr$),
('125fb902-4454-4e96-9f00-0146d25f4c8b', $tr$What is an example of a movement in movement exploration?$tr$, $tr$["Bending, turning, jumping", "Eating, drinking", "Writing, reading", "Watching TV"]$tr$::jsonb, $tr$Dance Exercise and Movement Exploration$tr$),
('15a04537-ccf3-49d3-8856-f83e05c4906e', $tr$What shows sportsmanship?$tr$, $tr$["Playing fair even when there is no referee", "Winning in any way you can", "Reporting the opponent right away", "Avoiding taking part"]$tr$::jsonb, $tr$Striking/Fielding and Net/Wall Games (Term 2, Week 1)$tr$),
('166c87f3-245a-464b-879a-f8115705236d', $tr$Why is this topic taught in MAPEH?$tr$, $tr$["It is part of taking care of your health and safety", "It has nothing to do with health", "It is only about music", "It is only about dance"]$tr$::jsonb, $tr$Proper Medicine Use vs. Misuse$tr$),
('175de133-824a-478a-b458-afc428196d5a', $tr$Why is it dangerous to use gateway drugs at a young age?$tr$, $tr$["A growing body and brain are harmed more quickly", "It has no effect on children", "It is safe if not done every day", "It is not a real danger"]$tr$::jsonb, $tr$Effects of Gateway Drugs$tr$),
('1805eb03-1065-4f3a-9763-302466d45aab', $tr$Why should you read the label before taking medicine?$tr$, $tr$["To know the right way to use it", "You do not need to read it", "It is only for decoration", "It is only for adults"]$tr$::jsonb, $tr$Proper Medicine Use vs. Misuse$tr$),
('1823676e-0987-44a8-ba66-cb41c9178ffb', $tr$What is meter in music?$tr$, $tr$["The pattern of beats in each measure", "Only the speed of the music", "Only how loud the sound is", "Only the type of instrument"]$tr$::jsonb, $tr$Music: Meter, Time Signatures, and Rhythmic Dance Patterns$tr$),
('185fe9a3-ab68-4fd5-9465-a547c5179c89', $tr$Why did writers use symbols during the American period?$tr$, $tr$["Openly opposing the rulers was not allowed", "They had no idea what to write", "It was easier to do", "They just really liked symbols"]$tr$::jsonb, $tr$Symbolic Theater and Seditious Plays$tr$),
('18da98a2-d934-40a5-a5fe-35bc51f8e4c9', $tr$What two kinds of games did we learn about in the past weeks?$tr$, $tr$["Striking/fielding and net/wall games", "Only board games and card games", "Only video games", "Games with no movement at all"]$tr$::jsonb, $tr$Planning Family Health Activities$tr$),
('1906b2de-64da-43b7-8db0-3fcdb8521571', $tr$What is the goal of striking/fielding games?$tr$, $tr$["Hit the ball and run to the bases", "Get the ball into a target", "Send the ball over the net", "Just stay in one place"]$tr$::jsonb, $tr$Striking/Fielding and Net/Wall Games (Term 2, Week 1)$tr$),
('19a9c306-7719-466d-86c9-657b46e54b2b', $tr$What is the new PE unit this week?$tr$, $tr$["Dance Exercise", "Sports Officiating", "Weightlifting", "Swimming"]$tr$::jsonb, $tr$Dance Exercise$tr$),
('19aff2af-ec1c-4d1a-8c05-e915ba691b26', $tr$Why teach the 8Rs to kids?$tr$, $tr$["To be responsible in caring for the environment", "It has no purpose", "It is only for adults", "It is not related to health"]$tr$::jsonb, $tr$Environmental Health (One Health)$tr$),
('1a611518-0cb7-4155-9663-0403459af190', $tr$Why is movement exploration taught?$tr$, $tr$["To trust your own body", "It has no purpose", "To entertain the teacher", "It is not part of the curriculum"]$tr$::jsonb, $tr$Dance Exercise and Movement Exploration$tr$),
('1beead16-dc6a-4637-a120-9f0359b6bad8', $tr$Why is open communication with family important while a child is growing up?$tr$, $tr$["They are the most trusted guides for new questions", "You no longer need guidance at this stage", "It is better to hide all your questions", "You should no longer listen to your parents"]$tr$::jsonb, $tr$Art, Feelings, and Changes in Myself$tr$),
('1c6476cd-24e6-4a54-9e08-7b60fe0e3a01', $tr$Which is an example of a random pattern?$tr$, $tr$["Natural spots on a rock", "Checkerboard design", "Repeating triangles in a weave", "Regular lines on cloth"]$tr$::jsonb, $tr$Visual Arts: Rhythm and Pattern$tr$),
('1ceb7d87-7d2c-4564-a98c-b382c89ab2e5', $tr$What is the main goal of playing these games as a family?$tr$, $tr$["Building the health of the whole family", "Giving out money prizes", "Lowering grades in school", "Making chores harder"]$tr$::jsonb, $tr$Striking/Fielding and Net/Wall Games$tr$),
('1d098ef5-0eba-428d-b687-81827eda0449', $tr$Why is it important to repeat the steps before performing?$tr$, $tr$["So the performance is smooth and well done", "There is no need to repeat them", "Only to make the group tired", "It has no effect"]$tr$::jsonb, $tr$Culminating Dance Performance$tr$),
('1e4d0758-c696-42bf-a2af-ca60f44ad9dd', $tr$Which elements of composition did we learn in art?$tr$, $tr$["Rhythm/pattern and movement", "Color only", "Price only", "Weight only"]$tr$::jsonb, $tr$Term Review: Music, Arts, and PE$tr$),
('1e9f332c-9eae-4016-8e96-1cd154626729', $tr$Why should you know your rights and responsibilities?$tr$, $tr$["To be responsible when shopping", "It is not important", "It is only for adults", "It has no effect"]$tr$::jsonb, $tr$Consumer Rights and Responsibilities$tr$),
('1eabe66a-99b5-425c-8c2e-f768dbae57b7', $tr$What should you do before taking any medicine?$tr$, $tr$["Ask permission from a parent or doctor", "Take it right away", "Ask only a friend", "Follow a TV commercial"]$tr$::jsonb, $tr$Proper Medicine Use vs. Misuse$tr$),
('1f1f92e7-2c2a-4556-9947-dd8cc3774f0e', $tr$Why is consumer health taught in MAPEH?$tr$, $tr$["To learn how to protect yourself as a buyer", "It has no purpose", "It is not related to health", "It is only for adults"]$tr$::jsonb, $tr$Consumer Rights and Responsibilities$tr$),
('202e0dd8-7100-45d8-8466-eb8e52a60b17', $tr$What is the cenaculo?$tr$, $tr$["A play that shows the life of Christ", "A war dance", "A fiesta song", "A musical instrument"]$tr$::jsonb, $tr$Theater and Dance in the Early Spanish Colonial Period$tr$),
('2042b877-ef5a-4b92-a5e2-c4bafbe73ec9', $tr$What is an example of good sanitation?$tr$, $tr$["Clean water and proper garbage disposal", "Garbage scattered around", "Not taking care of water", "Throwing garbage into the river"]$tr$::jsonb, $tr$Environmental Health (One Health)$tr$),
('20d30e0e-98a8-434b-a984-0f5360fc3b3b', $tr$Why is contemporary art important to identity?$tr$, $tr$["It shows how Filipino identity grows and changes", "It is not important", "It makes traditions disappear", "It is not part of culture"]$tr$::jsonb, $tr$My Filipino Identity$tr$),
('2109369d-a011-441e-813f-6063c74c7a3e', $tr$What is the purpose of setting a clear schedule for a wellness day?$tr$, $tr$["So everyone is ready and organized on time", "To confuse all the family members", "Setting a schedule has no purpose", "To lower the number of people joining"]$tr$::jsonb, $tr$Planning Family Health Activities$tr$),
('22e74763-a535-48db-819c-7b48b9b5f348', $tr$What value does interacting with others in a social dance mixer highlight?$tr$, $tr$["The fun of mingling with different classmates", "Being alone", "Losing a game", "Competition only"]$tr$::jsonb, $tr$Social Dance Mixers$tr$),
('23589670-da47-4f63-856a-929c3d0384bc', $tr$What is melody?$tr$, $tr$["A series of sounds that forms the tune of a song", "How fast a song is", "How loud a sound is", "The instrument being used"]$tr$::jsonb, $tr$Melody and Healthy Eating$tr$),
('2565fb41-5e6f-4616-8b5c-0f5c1c91c183', $tr$What time signature is used?$tr$, $tr$["2/4", "6/8", "9/4", "No time signature"]$tr$::jsonb, $tr$Social Dance Mixers$tr$),
('25c91b1d-3f87-458a-ad74-c48a6db875da', $tr$What is an example of dance exercise?$tr$, $tr$["Zumba-inspired moves", "Chess", "Puzzle games", "Reading a book"]$tr$::jsonb, $tr$Dance Exercise$tr$),
('25edab2f-7dcb-4205-a180-541f8d7bb0e2', $tr$Why is it important to choose modified games for a family wellness day?$tr$, $tr$["So people of all ages can play", "So only kids can play", "So only adults can play", "There is really no reason"]$tr$::jsonb, $tr$Planning Family Health Activities$tr$),
('2680c869-40fe-4489-96e8-2b18e2c579f7', $tr$Why was Filipino music included?$tr$, $tr$["To value our culture while exercising", "It has no connection", "It is not allowed", "It was just picked at random"]$tr$::jsonb, $tr$Dance Exercise$tr$),
('27397e32-62e2-4b68-9cda-5f12e49ffe7e', $tr$Why is it important to study the arts from this period?$tr$, $tr$["It shows how two cultures mixed together", "It has nothing to do with today", "It is no longer done today", "It has nothing to do with the Philippines"]$tr$::jsonb, $tr$Theater and Dance in the Early Spanish Colonial Period$tr$),
('27a768d2-c604-4925-b746-89dce1bee2ba', $tr$How is this topic connected to the infectious diseases we learned about before?$tr$, $tr$["Both are about preventing disease and caring for health", "The two have no connection", "One is only about science", "One is only about math"]$tr$::jsonb, $tr$Environmental Health (One Health)$tr$),
('27abdcd9-58d4-4176-8967-5701d2cd6415', $tr$What is rhythm in visual arts?$tr$, $tr$["Elements that repeat in an artwork", "Only the kind of color used", "Only the number of viewers", "Only the size of the paper"]$tr$::jsonb, $tr$Visual Arts: Rhythm and Pattern$tr$),
('27cf8e71-01dc-4fd1-981e-51c5a04717eb', $tr$Why is it important to identity?$tr$, $tr$["It shows how identity grows and changes", "It is not important", "Traditions disappear", "It is not part of culture"]$tr$::jsonb, $tr$My Filipino Identity$tr$),
('280efda6-b3af-4af6-ad9b-ef721af011f8', $tr$Why does MAPEH include dance as part of PE?$tr$, $tr$["It builds physical health and an appreciation of the arts", "It has no purpose", "It is not related to education", "It is only for adults"]$tr$::jsonb, $tr$Combining 2/4 and 3/4 Time$tr$),
('28136549-9ea6-4ab3-9cc3-5c2d61eb764a', $tr$What is the big lesson of this whole unit about dance, health, and art?$tr$, $tr$["They are connected and work together to support well-being", "They are not connected to each other", "Only one of them matters in this activity", "They have no real connection here"]$tr$::jsonb, $tr$Doing Our Family Wellness Activity$tr$),
('287b4c7b-0a9b-441b-8b42-8d9b856028af', $tr$How is 2/4 time different from 3/4 time?$tr$, $tr$["2/4 has two beats per measure, while 3/4 has three", "They are just the same", "There is no difference", "3/4 has two beats"]$tr$::jsonb, $tr$Fundamental Dance Steps in 2/4 Time$tr$),
('28bce935-5fe2-444c-a8c2-a09c228dc015', $tr$What do you call an activity at the end of a unit that brings together what you learned?$tr$, $tr$["Culminating activity", "Introductory lesson", "Just a quiz", "Just a review"]$tr$::jsonb, $tr$Culminating Dance Performance$tr$),
('28d24bec-d420-42d3-b8f7-63506c85cfa8', $tr$What do legend theater and dance show?$tr$, $tr$["A story through movement and costumes", "No story", "Only modern technology", "Trade laws"]$tr$::jsonb, $tr$Legend Theater and Dance; Health Rights$tr$),
('28f176b5-16b8-4c9a-9284-3e88565f7f07', $tr$What is the goal of studying the visual elements of rhythm and pattern?$tr$, $tr$["To see the skill in our ancestors' art", "Only to show a lack of talent", "It is just a random design", "It has no meaning here"]$tr$::jsonb, $tr$Visual Arts: Rhythm and Pattern$tr$),
('298fb8d6-a8a4-44f4-bf59-1a3f99bd01a5', $tr$What were the plays about during this period?$tr$, $tr$["Church rituals and the lives of saints", "Only current news", "Only modern science", "Only world wars"]$tr$::jsonb, $tr$Theater and Dance in the Early Spanish Colonial Period$tr$),
('2a896e82-e5f5-418b-b2f6-ca112e9ea0ee', $tr$Why write the verse before the chorus?$tr$, $tr$["So the story connects well to the message", "The order does not matter", "You should write the chorus first", "There is no order"]$tr$::jsonb, $tr$Writing Your Own Simple Song$tr$),
('2aceafa9-12dd-447f-ad55-599c1ade7f27', $tr$Why should you not take someone else's medicine?$tr$, $tr$["It might not be right for your condition", "It has no effect", "It is always safe", "You need it to get better"]$tr$::jsonb, $tr$Proper Medicine Use vs. Misuse$tr$),
('2af32871-9c4f-4130-88b3-28d9657ec775', $tr$A song has a 3/4 time signature. How many beats are in each measure?$tr$, $tr$["3 beats", "4 beats", "2 beats", "6 beats"]$tr$::jsonb, $tr$Music: Meter, Time Signatures, and Rhythmic Dance Patterns$tr$),
('2b1cb881-bc37-4a2d-ac28-06baba6a4189', $tr$What skill do you learn?$tr$, $tr$["Coordination and timing with the music", "Writing poems", "Calculating", "Reading maps"]$tr$::jsonb, $tr$Social Dance Mixers$tr$),
('2b56a158-1553-4956-aaab-b5e252133a46', $tr$Why is it important to watch the ball until you hit it?$tr$, $tr$["It makes your hits more accurate", "It makes you run faster", "It helps you avoid the opponent", "It makes the ball lighter"]$tr$::jsonb, $tr$Striking/Fielding and Net/Wall Games (Term 2, Week 1)$tr$),
('2be31a9e-f180-45c6-9017-51e8d935dcce', $tr$What should a child do before taking any medicine?$tr$, $tr$["Ask a parent or doctor for permission and guidance", "Take it right away without asking", "Ask only a friend", "Just follow a TV commercial"]$tr$::jsonb, $tr$Proper Medicine Use vs. Misuse$tr$),
('2c012673-79f1-40e8-9ff0-5736e7b3cb99', $tr$Who is a well-known composer of Filipino classical music?$tr$, $tr$["Nicanor Abelardo", "Andres Bonifacio", "Jose Rizal", "Emilio Aguinaldo"]$tr$::jsonb, $tr$Music: Meter, Time Signatures, and Rhythmic Dance Patterns$tr$),
('2c45d848-b960-473f-bc39-453c46f59ce0', $tr$What does the Tinikling represent?$tr$, $tr$["The tikling bird", "A kind of tree", "A kind of fish", "A kind of sea animal"]$tr$::jsonb, $tr$Traditional/National Dances$tr$),
('2cbcc4a1-2da7-4579-a33f-863d64e127d9', $tr$What is an example of a movement in movement exploration?$tr$, $tr$["Bending, turning, jumping", "Eating, drinking, sleeping", "Writing, reading, drawing", "Watching TV"]$tr$::jsonb, $tr$Dance Exercise and Movement Exploration$tr$),
('2ccb4054-47a1-4fea-be9e-612fa8c7bb35', $tr$What happens when traditional and modern moves are combined?$tr$, $tr$["A unique style that shows both the past and the present", "Nothing", "It is only confusing", "It makes traditions disappear"]$tr$::jsonb, $tr$My Filipino Identity$tr$),
('2dafc1e5-41c6-441f-8ed7-8df4406f5809', $tr$What is the difference between melody and rhythm?$tr$, $tr$["Melody is about tune; rhythm is about tempo/speed", "They are just the same", "There is no difference", "Rhythm is about tune"]$tr$::jsonb, $tr$Melody and Healthy Eating$tr$),
('2e191038-9df2-4df5-a112-54b5a79454ef', $tr$Why is jumping important?$tr$, $tr$["It is an example of a movement we try out", "It has nothing to do with PE", "It is not a real movement", "It is not part of PE"]$tr$::jsonb, $tr$Dance Exercise and Movement Exploration$tr$),
('2e21bed8-4795-4440-bc25-6377643f7dda', $tr$What is an example of an infectious disease?$tr$, $tr$["Flu", "Diabetes", "Osteoporosis", "Asthma"]$tr$::jsonb, $tr$Health: Common Infectious Diseases$tr$),
('2e7d6734-2979-4c53-8360-dfea56999864', $tr$What is the Pasyon?$tr$, $tr$["It is sung during Holy Week", "A fiesta dance", "A musical instrument", "A type of clothing"]$tr$::jsonb, $tr$Music: Rhythm and Tempo$tr$),
('2ee84635-6050-417b-8a8f-28ee4499aa87', $tr$What is the first step in planning a family wellness day?$tr$, $tr$["Choosing games that suit everyone", "Starting the game right away", "Giving out prizes right away", "Ending the activity right away"]$tr$::jsonb, $tr$Planning Family Health Activities$tr$),
('2f3ee80a-ddb6-46fb-811f-1c7c560a3642', $tr$Why is it important to care for the health of animals and the environment, not just people?$tr$, $tr$["They are all connected, based on the idea of One Health", "They have nothing to do with human health", "Only people matter", "The environment is separate from health"]$tr$::jsonb, $tr$Environmental Health (One Health)$tr$),
('2f5a0567-34e6-4ab6-8767-f54f6deea740', $tr$What time period does this lesson cover?$tr$, $tr$["1521–1600", "1900–1950", "1898–1946", "Only 1565–1600"]$tr$::jsonb, $tr$Music and Arts in the Early Spanish Colonial Period$tr$),
('2fccad27-6ff7-4d4d-8594-492cc5cc801b', $tr$What is the purpose of choreography done all together?$tr$, $tr$["Group unity and skill", "It has no purpose", "It causes confusion", "It is not part of the festival"]$tr$::jsonb, $tr$Local and Regional Street Dances$tr$),
('304450af-36e0-4bdf-ba6f-cb81598436bb', $tr$A simple instrument to use with the melody?$tr$, $tr$["A bell or clapping", "Only a piano", "Only a guitar", "None"]$tr$::jsonb, $tr$Writing Your Own Simple Song$tr$),
('30d5f9e5-0756-479b-b937-445f563e3ce2', $tr$Why is the chorus easy to remember?$tr$, $tr$["Because it is repeated", "Because it is quiet", "Because it has no melody", "Because it is sung only once"]$tr$::jsonb, $tr$Musical Form: Verse and Chorus$tr$),
('31270b43-1d4e-4323-aac6-f39881ebba71', $tr$What is strophic form?$tr$, $tr$["The same melody repeats for every stanza", "Two different sections", "No set pattern", "The melody is played only once"]$tr$::jsonb, $tr$Music and Arts in the Early Spanish Colonial Period$tr$),
('31ab0aa0-63dd-4a5a-87e5-cc1fe5fca426', $tr$Why count the beats exactly in 2/4?$tr$, $tr$["To follow the music exactly", "It has no connection", "Just keep moving", "It is not important"]$tr$::jsonb, $tr$Fundamental Dance Steps in 2/4 Time$tr$),
('31f95c02-30e3-4b29-9833-95601198be33', $tr$What is observing in art?$tr$, $tr$["Looking closely at your surroundings before drawing or painting", "Selling artworks", "Cleaning art materials", "Giving a name to a picture"]$tr$::jsonb, $tr$Visual Arts in the Early Spanish Colonial Period$tr$),
('32f051c5-7328-4f37-8b2e-81a193177057', $tr$What is one example of symbolic theater from this period?$tr$, $tr$["The cenaculo about the life of Christ", "Only a modern movie", "Only a TV show", "Only an OPM concert"]$tr$::jsonb, $tr$Theater and Dance in the Early Spanish Colonial Period$tr$),
('3309f5bf-bb05-4770-8e43-0add73e1a29b', $tr$Why was Filipino music included in some dance exercise examples?$tr$, $tr$["It helps us value Filipino culture while exercising", "Music has nothing to do with it", "Filipino music is not allowed", "It was just picked at random"]$tr$::jsonb, $tr$Dance Exercise$tr$),
('333f91db-26b7-4fcd-ad8b-c4c87a7aac78', $tr$Why is it important to choose friends who are a positive influence?$tr$, $tr$["It helps you stay away from bad behavior", "It has no effect on your choices", "New friends are always bad", "The kind of friends you have does not matter"]$tr$::jsonb, $tr$Effects of Gateway Drugs$tr$),
('337a2ece-4ab5-48de-92bd-e0777b1d36ad', $tr$What is the difference between 2/4 and 3/4 time?$tr$, $tr$["Two beats in 2/4, three in 3/4", "They are just the same", "There is no difference", "3/4 has two beats"]$tr$::jsonb, $tr$Fundamental Dance Steps in 2/4 Time$tr$),
('33f83b52-0d25-4dc0-84d8-e18753013736', $tr$Which medium uses color on a canvas or surface?$tr$, $tr$["Painting", "Drawing", "Engraving", "Observing"]$tr$::jsonb, $tr$Visual Arts in the Early Spanish Colonial Period$tr$),
('357a3baf-5478-4dde-a9f1-f54bd17ae39b', $tr$Which is an example of protein?$tr$, $tr$["Fish or eggs", "Rice", "Fruit only", "Water only"]$tr$::jsonb, $tr$Melody and Healthy Eating$tr$),
('35bf31e4-58a1-448a-a672-0c8ac7d449fa', $tr$Why is food literacy taught in MAPEH?$tr$, $tr$["To learn how to choose healthy food", "It has no purpose", "It is not related to health", "It is only for adults"]$tr$::jsonb, $tr$Melody and Healthy Eating$tr$),
('3644bbe7-b20c-4a06-8536-604b8dc51c03', $tr$An example of a gateway drug?$tr$, $tr$["Cigarettes", "Milk", "Water", "Fruit"]$tr$::jsonb, $tr$Term 2 Review: Music, Arts, PE, and Health$tr$),
('365c1153-a736-4df6-94f2-f2a98c13a2bf', $tr$What does the mixing of two cultures in art show?$tr$, $tr$["A new and unique form of art", "Native art disappearing completely", "No change in art", "European art taking over completely"]$tr$::jsonb, $tr$Theater and Dance in the Early Spanish Colonial Period$tr$),
('36990aef-b519-4cc3-b36a-625e0e823459', $tr$Where do many local dances and plays come from?$tr$, $tr$["Legends and folktales", "Modern technology", "Trade laws", "Types of food"]$tr$::jsonb, $tr$Legend Theater and Dance; Health Rights$tr$),
('36e5ef59-c54a-46c2-b6cc-8edfdb44770c', $tr$In Langit-Lupa, how does a player avoid being tagged?$tr$, $tr$["By jumping up high or staying low", "By running very far away", "By just sitting on the ground", "By hiding behind a tree"]$tr$::jsonb, $tr$Rhythm, Family Health, and Invasion Games$tr$),
('36f02ae3-4516-44fc-8611-5de1e92d83de', $tr$What is the Pahiyas?$tr$, $tr$["A celebration to give thanks for the harvest", "Only a war dance", "Only a funeral ritual", "Only a graduation dance"]$tr$::jsonb, $tr$Arts: Rhythm and Movement in Indigenous Rituals$tr$),
('373c4790-5692-4cc5-819a-2b50a8559e89', $tr$What does joining these games bring to a family?$tr$, $tr$["Physical health and stronger family bonds", "No time for each other", "Only higher expenses", "No effect on health"]$tr$::jsonb, $tr$Striking/Fielding and Net/Wall Games$tr$),
('38069c9e-0d70-4af8-9695-adc5191dcc33', $tr$Why is the dance called a 'mixer'?$tr$, $tr$["Because dancers keep switching partners", "Because food is mixed in it", "Because no partners are used", "Because only one person dances"]$tr$::jsonb, $tr$Social Dance Mixers$tr$),
('385b8cff-bb5d-44b7-b9a9-1881da9831f1', $tr$How did native and European dances mix?$tr$, $tr$["Free movements were combined with formal steps", "No mixing happened", "Only Spanish dance was used as the base", "Only native dance was used as the base"]$tr$::jsonb, $tr$Theater and Dance in the Early Spanish Colonial Period$tr$),
('38cce5e4-626e-4648-9a7c-f3b3d4a0a864', $tr$Why is self-confidence important when dancing in front of others?$tr$, $tr$["It helps you perform the choreography well", "It is not important", "You don't need self-confidence", "It only gets in the way"]$tr$::jsonb, $tr$Combining 2/4 and 3/4 Time$tr$),
('398640de-785b-49b0-8e75-ee3370be4c2c', $tr$Which part of a song tells the story?$tr$, $tr$["Verse", "Only the chorus", "Only the rhythm", "None of these"]$tr$::jsonb, $tr$Musical Form: Verse and Chorus$tr$),
('39f62efc-c180-4c06-89b6-018a3549177c', $tr$What did we learn about music this term?$tr$, $tr$["Rhythm and tempo", "Only the history of computers", "Only math", "We learned nothing"]$tr$::jsonb, $tr$Term Review: Music, Arts, and PE$tr$),
('3a1ba3ff-6449-463e-8fe7-8cb1fbe16101', $tr$Why is teamwork important in group choreography?$tr$, $tr$["It makes the performance neater and more together", "It is not important", "It is better to be alone", "A group is not needed"]$tr$::jsonb, $tr$Combining 2/4 and 3/4 Time$tr$),
('3b13d242-5108-4de1-ada7-89ae131b5d93', $tr$How is the tempo of 3/4 time different from 2/4 time?$tr$, $tr$["3/4 is gentler than 2/4", "They are just the same", "3/4 is faster", "There is no difference"]$tr$::jsonb, $tr$Social Dance Mixers in 3/4 Time$tr$),
('3b66906d-fc4b-4094-83f0-04ff7d38e170', $tr$A picture has lines that lead toward a mountain. What does this show?$tr$, $tr$["Movement", "Rhythm only", "Pattern only", "Color only"]$tr$::jsonb, $tr$Visual Arts: Rhythm and Pattern$tr$),
('3b758a1f-5541-4fba-802b-aca036d4f80f', $tr$When are the pasyon and senakulo still performed today?$tr$, $tr$["During Holy Week", "During Christmas", "On birthdays", "At graduation"]$tr$::jsonb, $tr$Theater and Dance in the Early Spanish Colonial Period$tr$),
('3b917f23-5765-4b95-9426-5e04ea13c0d8', $tr$What is a feature of street dance?$tr$, $tr$["Loud drum beats and colorful costumes", "Silence", "Only one person", "No choreography"]$tr$::jsonb, $tr$Local and Regional Street Dances$tr$),
('3c0fb7f5-3a9a-4571-b7d1-5232b4c152bf', $tr$Why is sanitation important?$tr$, $tr$["To stop diseases from spreading", "It is not important", "It causes disease", "It is not connected to health"]$tr$::jsonb, $tr$Environmental Health (One Health)$tr$),
('3d6def10-674d-4a99-a83f-72aec92cf78e', $tr$Why is it important to go back to the ready position after every shot?$tr$, $tr$["So you are ready to respond to the next shot", "So you can rest for a long time", "So you can change equipment", "So you can chat with a teammate"]$tr$::jsonb, $tr$Striking/Fielding and Net/Wall Games (Term 2, Week 1)$tr$),
('3dd5bd8d-6bf0-4c8d-9f01-a7743bbe9c48', $tr$How does practicing dance help the body?$tr$, $tr$["It builds physical skills and coordination", "It has no benefit", "It weakens the body", "It stops movement"]$tr$::jsonb, $tr$Fundamental Dance Steps in 2/4 Time$tr$),
('3dd6c53d-b69a-4144-a197-b0df11f6cb07', $tr$What was the theme of plays during the Early Spanish Colonial Period?$tr$, $tr$["Miracles and faith", "Modern science", "World wars", "Sports"]$tr$::jsonb, $tr$Theater and Dance in the Early Spanish Colonial Period$tr$),
('3e4043b0-bdeb-41e4-a96d-6cd049c2a586', $tr$Which parts of the body does dance exercise make stronger?$tr$, $tr$["Heart, lungs, and muscles", "Only the hair", "Only the nails", "None of the above"]$tr$::jsonb, $tr$Dance Exercise$tr$),
('3f20995f-e49b-4b64-9a79-0fb354f8c737', $tr$What is the first step in getting ready for a performance?$tr$, $tr$["Decide how many members are in the group", "Perform right away with no practice", "Forget the steps", "Leave the group"]$tr$::jsonb, $tr$Culminating Dance Performance$tr$),
('3f730f22-6c50-495e-8fe2-499059d382a9', $tr$Why is it important to change the speed and direction of your shots in net/wall games?$tr$, $tr$["So the opponent cannot guess your next move", "So the game ends faster", "So the ball is easier to catch", "So you no longer need to run"]$tr$::jsonb, $tr$Striking/Fielding and Net/Wall Games (Term 2, Week 1)$tr$),
('3fdfd2c9-4ee6-4c99-9f17-dc25d84d9665', $tr$A song slows down its tempo in the middle. What is the likely effect on the listener's feelings?$tr$, $tr$["The mood becomes sadder or calmer", "It becomes happier and livelier", "It has no effect on feelings", "The sound becomes louder"]$tr$::jsonb, $tr$Music: Rhythm and Tempo$tr$),
('400b7e71-4d1c-43fe-9ab5-d1e59c0593ae', $tr$What is the skill of saying no (assertiveness)?$tr$, $tr$["Being able to say \"no\" with confidence", "Being able to always agree with others", "Being able to always stay quiet", "Being able to avoid all conversations"]$tr$::jsonb, $tr$Art, Feelings, and Changes in Myself$tr$),
('40255792-62a8-4066-b1d1-4921f26b66c1', $tr$Why is it important to teach traditional dances to kids?$tr$, $tr$["To pass on our culture to the next generation", "There is no need to teach it", "It is only for adults", "It has no effect"]$tr$::jsonb, $tr$Traditional/National Dances$tr$),
('4052dbbd-82e3-4ab0-a984-b03163f10005', $tr$Why should you check the expiry date?$tr$, $tr$["To make sure the product is safe to use", "It is not important", "The date does not matter", "Once it's bought, it's fine"]$tr$::jsonb, $tr$Consumer Rights and Responsibilities$tr$),
('4055589d-d494-4ead-b8b8-b93a2e2d23b1', $tr$Which is the faster tempo?$tr$, $tr$["2/4 time", "3/4 time", "Both are the same", "There is no fast tempo"]$tr$::jsonb, $tr$Combining 2/4 and 3/4 Time$tr$),
('407e5761-e609-4705-8efa-99f21fcfd95d', $tr$What happens if people do not follow the steps against infectious diseases?$tr$, $tr$["The disease spreads faster", "Nothing happens", "Everything gets better", "The disease goes away by itself"]$tr$::jsonb, $tr$Health: Common Infectious Diseases$tr$),
('4148883e-2a33-4c66-930c-a8596fe75ce0', $tr$Why does a melody use different sounds?$tr$, $tr$["To create a unique tune", "There is no reason", "To confuse the listener", "To make the song short"]$tr$::jsonb, $tr$Melody and Healthy Eating$tr$),
('415fc0bf-ddcc-49e2-902b-d1d8bc717cdd', $tr$What is the goal of practicing in 2/4 time?$tr$, $tr$["To learn to keep up with the tempo of fast music", "To learn to write", "To learn to play basketball", "To learn math"]$tr$::jsonb, $tr$Fundamental Dance Steps in 2/4 Time$tr$),
('41a1bc4e-0751-448d-8f96-7fc93fb118eb', $tr$Why are festivals taught in MAPEH?$tr$, $tr$["To value our culture and history", "It has no purpose", "It is only for adults", "It is not related to education"]$tr$::jsonb, $tr$Local and Regional Street Dances$tr$),
('41a50239-dc3e-416a-b6a7-4d6710db8f8f', $tr$What is a way to break the chain of infection?$tr$, $tr$["Washing hands", "Not caring", "No protection", "Forgetting to get vaccinated"]$tr$::jsonb, $tr$Health: Common Infectious Diseases$tr$),
('41bb6434-c49f-4932-a125-5a919957a489', $tr$How is the tempo of 3/4 different from 2/4?$tr$, $tr$["3/4 is gentler", "They are just the same", "3/4 is faster", "There is no difference"]$tr$::jsonb, $tr$Social Dance Mixers in 3/4 Time$tr$),
('41c34ecb-e2e2-43e4-bbc7-5de375eb79ef', $tr$What is a consumer's responsibility?$tr$, $tr$["Read the label before buying", "Only the seller has responsibility", "Buy without thinking", "Don't check"]$tr$::jsonb, $tr$Consumer Rights and Responsibilities$tr$),
('42dc99cc-7737-445b-9f96-20049cce13b5', $tr$Why does the melody not need to be perfect?$tr$, $tr$["What matters is sharing your idea", "It has to be perfect", "A melody is not needed anymore", "It is not important"]$tr$::jsonb, $tr$Writing Your Own Simple Song$tr$),
('42ee4919-d871-481a-ad7e-618f494e9652', $tr$What does mixing with others in a social dance mixer bring?$tr$, $tr$["Joy in connecting with others", "Being alone", "Competition only", "Lack of interest"]$tr$::jsonb, $tr$Social Dance Mixers in 3/4 Time$tr$),
('438fcb09-9859-4925-9d1f-b64c63fd5536', $tr$What shows true sportsmanship in these games?$tr$, $tr$["Playing fair even when there is no referee", "Winning in any way you can", "Reporting the opponent right away", "Avoiding taking part in the game"]$tr$::jsonb, $tr$Striking/Fielding and Net/Wall Games (Term 2, Week 1)$tr$),
('43ca2d2b-adb6-4974-ac41-6e73cf198085', $tr$What can happen if medicine is used the wrong way?$tr$, $tr$["Serious harm to the body", "Always a good effect", "Never any effect", "You get better automatically"]$tr$::jsonb, $tr$Proper Medicine Use vs. Misuse$tr$),
('442d05c8-a5fb-433d-9d47-5385451126c4', $tr$What does 'Reduce' mean?$tr$, $tr$["Making less garbage", "Making more garbage", "Hiding garbage", "Burning garbage"]$tr$::jsonb, $tr$Environmental Health (One Health)$tr$),
('445b5f59-4da9-4902-9b3c-f3d2d2bde341', $tr$Why should you not take another person's medicine?$tr$, $tr$["It may not be right or safe for your condition", "It has no effect on anyone", "Other people's medicine is always safe", "You need it to get better fast"]$tr$::jsonb, $tr$Proper Medicine Use vs. Misuse$tr$),
('45274bd6-0d26-4cd6-8773-abcc55a19a03', $tr$What is coordination?$tr$, $tr$["Making different body parts work together in one movement", "Only being able to sit still quietly", "Only being able to read very fast", "Being able to watch TV for a very long time"]$tr$::jsonb, $tr$Striking/Fielding and Net/Wall Games$tr$),
('4592f8d6-6d8b-49ed-b0ea-670ceef24d35', $tr$How does high self-esteem help a child?$tr$, $tr$["It helps the child stay true to their values", "The child becomes easy to influence", "The child loses their own opinions", "The child always doubts themselves"]$tr$::jsonb, $tr$Art, Feelings, and Changes in Myself$tr$),
('45d95035-3dfe-41dd-9615-c5be559ee4c2', $tr$What simple instrument can you use to make a melody?$tr$, $tr$["A bell or clapping", "Only a piano", "Only a guitar", "No instrument can be used"]$tr$::jsonb, $tr$Writing Your Own Simple Song$tr$),
('460284bd-f44c-445d-b012-e7072752d3f2', $tr$How is writing a song different from writing the children's poem you studied before?$tr$, $tr$["A song has a melody and a musical form, while a poem is only read", "They are exactly the same", "There is no difference between them", "A poem always has a melody too"]$tr$::jsonb, $tr$Writing Your Own Simple Song$tr$),
('460ad9b6-653d-428e-bdf6-f3bb9b76c459', $tr$Who is responsible for making sure a child's right to health is met?$tr$, $tr$["The family, the community, and the government", "No one", "Only the child", "Only strangers"]$tr$::jsonb, $tr$Legend Theater and Dance; Health Rights$tr$),
('464ea5af-0262-499b-8b9b-38f321a99830', $tr$What is an example of contemporary expression?$tr$, $tr$["Modern music with OPM influence", "Only dances from other countries", "There is no example", "A kind of food"]$tr$::jsonb, $tr$My Filipino Identity$tr$),
('46d3fe06-ff15-45d7-bf8e-c46facb89c05', $tr$What equipment is used in the Tinikling?$tr$, $tr$["Bamboo poles", "Umbrella", "Oil lamp", "Glass"]$tr$::jsonb, $tr$Traditional/National Dances$tr$),
('4757148d-632e-4856-8030-44b515fdd5db', $tr$What is rhythm?$tr$, $tr$["The pattern of sounds and silences", "The color of the instrument", "The place of the concert", "The number of people watching"]$tr$::jsonb, $tr$Rhythm, Family Health, and Invasion Games$tr$),
('4769a7f3-f0b6-4641-b6d9-c498a431bb5c', $tr$Which is an example of a PHYSICAL change while growing up?$tr$, $tr$["Getting taller", "Changing your opinion about a friend", "Getting angry more easily", "Becoming shyer around everyone"]$tr$::jsonb, $tr$Art, Feelings, and Changes in Myself$tr$),
('478ca00a-b4ae-4902-af6b-d767fb4e6904', $tr$What is cardiovascular fitness?$tr$, $tr$["The strength of the heart and lungs", "Only arm strength", "Only running speed", "Body weight"]$tr$::jsonb, $tr$Dance Exercise$tr$),
('48711968-2f4f-4835-9beb-e945e7e68e97', $tr$Why is it important to be a smart shopper?$tr$, $tr$["It helps you avoid scams and low-quality products", "It has no importance", "Just buy without thinking", "It does not matter"]$tr$::jsonb, $tr$Consumer Rights and Responsibilities$tr$),
('4a5d859a-d195-40d2-b334-dd81532c348e', $tr$Why should children not take medicine without an adult's permission?$tr$, $tr$["A child may not know the right dose or its effects", "There is no danger in it", "A child always knows the right medicine", "Permission is not needed"]$tr$::jsonb, $tr$Proper Medicine Use vs. Misuse$tr$),
('4a7adbaa-6b3a-49ec-acc6-1670d5c04323', $tr$Why is music used in dance exercise?$tr$, $tr$["It gives tempo and makes moving fun", "Music has no use", "It only makes the exercise harder", "Music is not needed"]$tr$::jsonb, $tr$Dance Exercise and Movement Exploration$tr$),
('4af57d37-231b-41f5-9f9c-56528f8618ae', $tr$Why do religious dances use rhythmic patterns?$tr$, $tr$["To show the meaning of the ceremony", "Only to make time pass faster", "To make it hard for the dancer", "To make the dance meaningless"]$tr$::jsonb, $tr$Rhythm, Family Health, and Invasion Games$tr$),
('4b71102b-6011-4b37-a727-925a0de6b408', $tr$What do you call the repeated part that everyone usually sings?$tr$, $tr$["Chorus", "Verse", "Only the bridge", "Introduction"]$tr$::jsonb, $tr$Musical Form: Verse and Chorus$tr$),
('4b770a07-46f0-4dd6-83d2-7cfdc058468b', $tr$What is a dose?$tr$, $tr$["The right number or amount of medicine to take", "The name of the medicine", "The color of the medicine", "The price of the medicine"]$tr$::jsonb, $tr$Proper Medicine Use vs. Misuse$tr$),
('4c651d1c-ee6d-4bfc-8559-03a3e0b4bba3', $tr$What responsibility does a consumer have?$tr$, $tr$["Read the label before buying", "None, only the seller is responsible", "Just buy without thinking", "Don't check the product"]$tr$::jsonb, $tr$Consumer Rights and Responsibilities$tr$),
('4cb67a60-a278-4822-8505-1aca163bd1a4', $tr$Why is it important to get vaccinated?$tr$, $tr$["It protects you against certain diseases", "It has no benefit", "It only makes you sick", "It is no longer needed"]$tr$::jsonb, $tr$Health: Common Infectious Diseases$tr$),
('4cdd5e10-1e22-4a19-89a6-679da8a347d2', $tr$What was a common subject of art in the Early Spanish Colonial Period?$tr$, $tr$["Pictures of saints and scenes from the Bible", "Pictures of modern cars", "Pictures of computers", "Pictures of the planets"]$tr$::jsonb, $tr$Visual Arts in the Early Spanish Colonial Period$tr$),
('4d2706bd-5b9b-4271-96c0-424005b2ee6f', $tr$How many times is the chorus usually sung in a song?$tr$, $tr$["More than once", "Only once", "It is not sung", "Only at the end"]$tr$::jsonb, $tr$Musical Form: Verse and Chorus$tr$),
('4d399f4e-e8d8-438a-aea6-15f289bcb762', $tr$Why is it important to know how to use medicine the right way?$tr$, $tr$["To avoid misuse that can harm the body", "It is not important", "Medicine is always safe no matter how you use it", "A dose is not needed anymore"]$tr$::jsonb, $tr$Term 2 Review: Music, Arts, PE, and Health$tr$),
('4d3a9826-d59e-4ea1-a174-29147c2e7b0d', $tr$Which is an EXAMPLE of using medicine the right way?$tr$, $tr$["Taking it as prescribed at the right time", "Taking an extra dose to get better faster", "Taking your brother's or sister's medicine", "Taking it without reading the label"]$tr$::jsonb, $tr$Proper Medicine Use vs. Misuse$tr$),
('4d829ac1-99eb-467e-a5ed-e25d9447bd40', $tr$Why is a safe environment important for children?$tr$, $tr$["It helps keep them safe and healthy", "It is not important", "It is no longer needed", "It is only for adults"]$tr$::jsonb, $tr$Legend Theater and Dance; Health Rights$tr$),
('4da46136-1ffd-40c1-889e-bb6164222467', $tr$Which is an example of a regular pattern?$tr$, $tr$["Checkerboard design", "Random spots on a rock", "Just one dot", "No design"]$tr$::jsonb, $tr$Visual Arts: Rhythm and Pattern$tr$),
('4ea21d6c-c408-4c41-996a-16d11b29cdd6', $tr$Which Filipino game is an invasion game?$tr$, $tr$["Agawan Base", "Tumbang Preso", "Tatsing", "Calahoyo"]$tr$::jsonb, $tr$Rhythm, Family Health, and Invasion Games$tr$),
('4f57bf5b-b336-4d3d-ade4-cb1495417d81', $tr$Why is coordination important in a 3/4 time dance?$tr$, $tr$["To keep in step with the three beats", "It is not important", "Coordination is not needed", "Any movement is correct"]$tr$::jsonb, $tr$Social Dance Mixers in 3/4 Time$tr$),
('4f5f85bd-4909-4b48-85e3-59dce7840b0f', $tr$What is a verse?$tr$, $tr$["The part where the words change", "The part that is always the same", "It has no words", "Only an instrument"]$tr$::jsonb, $tr$Term 2 Review: Music, Arts, PE, and Health$tr$),
('4f702bf4-3d23-48a7-a117-4c30d96dbff0', $tr$Where is the Ati-Atihan held?$tr$, $tr$["Aklan", "Cebu", "Iloilo", "Manila"]$tr$::jsonb, $tr$Local and Regional Street Dances$tr$),
('4f7aff68-e1ba-4425-be42-602c20e3310e', $tr$Which of these is NOT a good response when someone offers you a gateway drug?$tr$, $tr$["Try it first before saying no", "Say 'No' firmly", "Leave the situation", "Ask a trusted adult for help"]$tr$::jsonb, $tr$Effects of Gateway Drugs$tr$),
('50fd760a-06f3-4858-981b-e2a28cd5bb99', $tr$What is movement in visual arts?$tr$, $tr$["A way to guide the viewer's eye", "Only how fast the art is made", "Only a sound you hear", "Only the price of the artwork"]$tr$::jsonb, $tr$Visual Arts: Rhythm and Pattern$tr$),
('518908ce-927d-4188-a6a0-87d7017268ed', $tr$What is the oldest festival in the Philippines?$tr$, $tr$["Ati-Atihan", "Sinulog", "Dinagyang", "MassKara"]$tr$::jsonb, $tr$Local and Regional Street Dances$tr$),
('51c5dd46-dfea-4e28-b31c-1f9ad1ac02cb', $tr$What do we gain from learning different traditional dances?$tr$, $tr$["A deeper understanding and appreciation of our country's culture", "We gain nothing", "It is only confusing", "It does not teach us anything"]$tr$::jsonb, $tr$Traditional/National Dances$tr$),
('528cc3ad-ce71-4fbc-b0ef-b65b94b0ab7c', $tr$What should the chorus you write be like?$tr$, $tr$["Repeated and easy to remember", "Different every time", "Without a melody", "Long and complicated"]$tr$::jsonb, $tr$Writing Your Own Simple Song$tr$),
('531535f9-aead-4e70-9a09-ea2f52dbc6cd', $tr$Why repeat the steps before performing?$tr$, $tr$["So the performance goes well", "It is not needed", "Just to get tired", "It has no effect"]$tr$::jsonb, $tr$Culminating Dance Performance$tr$),
('531bdfe0-b377-410b-8781-9a3f115d9c1c', $tr$Why are dance and theater used for legends?$tr$, $tr$["To keep the story alive in an artistic way", "There is no purpose", "It is not related to culture", "It is only a new creation"]$tr$::jsonb, $tr$Legend Theater and Dance; Health Rights$tr$),
('535fa860-3c3b-402e-89dc-d29655707671', $tr$Why is it important to do dance exercise?$tr$, $tr$["It is fun and keeps you active and healthy", "It is not important", "It is not real exercise", "It makes the body weaker"]$tr$::jsonb, $tr$Dance Exercise$tr$),
('53671436-12c5-4509-b114-25967f7850c9', $tr$First step in making your own song?$tr$, $tr$["Choose a simple topic", "Start singing with no plan", "Forget the verse and chorus", "Buy a new instrument"]$tr$::jsonb, $tr$Writing Your Own Simple Song$tr$),
('54b25a51-e998-4fb4-921f-1aa2c2f71dbb', $tr$Why does a rhythmic dance pattern match the time signature?$tr$, $tr$["So people stay in time with the music", "To make the dance faster", "To make the sound louder", "They have nothing to do with each other"]$tr$::jsonb, $tr$Music: Meter, Time Signatures, and Rhythmic Dance Patterns$tr$),
('54da6493-0b86-4ea0-896a-2306f314c9df', $tr$What is tempo in music?$tr$, $tr$["How fast the music is", "How loud the sound is", "How long the song is", "The name of the composer"]$tr$::jsonb, $tr$Rhythm, Family Health, and Invasion Games$tr$),
('54f98413-4943-490f-9be3-2fe2f779ec54', $tr$What question should you answer when you reflect after the activity?$tr$, $tr$["What did I learn from combining dance, health, and art?", "What is my favorite color in this activity?", "How old am I now?", "What do I want to eat right now?"]$tr$::jsonb, $tr$Doing Our Family Wellness Activity$tr$),
('55417e86-88b8-44f2-8702-1f4aeb339b80', $tr$Where is the Dinagyang held?$tr$, $tr$["Iloilo", "Cebu", "Aklan", "Manila"]$tr$::jsonb, $tr$Local and Regional Street Dances$tr$),
('558c2a04-9fa5-4711-9ff0-c6b4ba380e6c', $tr$Why is combining lessons helpful in a child's life?$tr$, $tr$["The child sees how what they learned is used in real situations", "It has no real connection to our real lives", "It only makes things harder for the child to understand", "It is only done to make the class longer"]$tr$::jsonb, $tr$Combining Dance, Health, and Art$tr$),
('56ba9fac-d12d-47d7-ba7e-b24ce17d37c2', $tr$Which one is NOT part of a social dance mixer?$tr$, $tr$["Staying with the same partner the whole time", "Changing partners", "Music in 2/4 time", "Simple steps"]$tr$::jsonb, $tr$Social Dance Mixers$tr$),
('57b71edc-be79-4de4-aff0-c6026b6b5cdd', $tr$What is the benefit of doing a culminating activity in MAPEH?$tr$, $tr$["It brings the skills you learned together into one successful activity", "It has no benefit", "It is only for fun", "It is not part of learning"]$tr$::jsonb, $tr$Culminating Dance Performance$tr$),
('57be1538-cf58-44c3-8a35-a98b9d39100b', $tr$Why are different dances included in MAPEH?$tr$, $tr$["They build health and the arts", "There is no purpose", "It is not related to education", "It is only for adults"]$tr$::jsonb, $tr$Social Dance Mixers in 3/4 Time$tr$),
('57cb2035-020a-429a-97b6-c27578e30b32', $tr$How many beats are in each measure in a 3/4 time signature?$tr$, $tr$["3 beats", "4 beats", "2 beats", "6 beats"]$tr$::jsonb, $tr$Music: Meter, Time Signatures, and Rhythmic Dance Patterns$tr$),
('57ed61ed-b50c-4966-9284-b74c22303a41', $tr$What does the visual art included in the activity show?$tr$, $tr$["It reminds us that health is important", "It has no real purpose", "It is only made as decoration", "It is not part of the activity"]$tr$::jsonb, $tr$Doing Our Family Wellness Activity$tr$),
('583478fe-b9c0-4875-a8d1-4fde62b19191', $tr$A badminton player keeps getting stuck in the middle of the court, so they are late for shots to the side. What is the BEST fix?$tr$, $tr$["Go back to the ready position right after every shot", "Always stay at the side of the court", "Stop playing badminton", "Just wait for each of the opponent's shots"]$tr$::jsonb, $tr$Striking/Fielding and Net/Wall Games (Term 2, Week 1)$tr$),
('586b0e73-44d5-4a64-9164-247998a6ec19', $tr$An example of a song topic?$tr$, $tr$["Love for your family", "Business law", "Economy", "How the government is run"]$tr$::jsonb, $tr$Writing Your Own Simple Song$tr$),
('58e815e5-36cd-4eeb-a12b-0c04ffac812e', $tr$What did we plan last week?$tr$, $tr$["A dance-for-health session with visual art", "A math exam", "A letter to parents", "A farming activity"]$tr$::jsonb, $tr$Doing Our Family Wellness Activity$tr$),
('5924bb30-6c9c-4206-bee2-0ed8c6b17d2b', $tr$How is contemporary art connected to the traditional dances we learned before?$tr$, $tr$["Both are ways of showing Filipino identity in different times", "The two have no connection", "One is only about science", "One is about math"]$tr$::jsonb, $tr$My Filipino Identity$tr$),
('596d7e1d-4ca4-4920-bc39-deac97ad6d0b', $tr$Why is it important to understand the chain of infection?$tr$, $tr$["It helps stop diseases from spreading", "It is useless", "You do not need to understand it", "It is only about animals"]$tr$::jsonb, $tr$Health: Common Infectious Diseases$tr$),
('5a368138-d199-4b44-8e91-5f0462b861d7', $tr$Why is melody important?$tr$, $tr$["It makes a song easy to sing and remember", "It is not important", "It has no sound", "Only instruments use it"]$tr$::jsonb, $tr$Melody and Healthy Eating$tr$),
('5a374c62-9f3d-4c3a-afff-937c514b7a43', $tr$What type of dance is in 2/4 time?$tr$, $tr$["Polka", "Waltz", "Tango", "Ballroom in 3/4"]$tr$::jsonb, $tr$Fundamental Dance Steps in 2/4 Time$tr$),
('5ac29de7-e8d0-476f-a02a-c06d35bd4e9a', $tr$What are the 8Rs?$tr$, $tr$["Ways to reduce garbage in the environment", "Eight new diseases", "Eight vaccines", "Eight kinds of exercise"]$tr$::jsonb, $tr$Term Review: Arts, Culture, and Health$tr$),
('5acb9629-e33f-4a4a-8644-db5cacadd0a8', $tr$What is an example of protein?$tr$, $tr$["Fish or eggs", "Rice", "Fruit", "Water"]$tr$::jsonb, $tr$Melody and Healthy Eating$tr$),
('5b4a8fbb-08a7-400a-a53d-665d00a47b86', $tr$What does combining two tempos give you?$tr$, $tr$["Versatility in dance", "Nothing", "It is only confusing", "It is not possible"]$tr$::jsonb, $tr$Combining 2/4 and 3/4 Time$tr$),
('5b76f9fd-0996-4e08-9f5d-b798d309a902', $tr$Who is responsible for reading the label before buying?$tr$, $tr$["The buyer themselves", "Only the seller", "No one", "Only the maker of the product"]$tr$::jsonb, $tr$Consumer Rights and Responsibilities$tr$),
('5b7ac368-ba0e-4e4f-85f3-6b026d9d0403', $tr$What is the big lesson of Term 2 in MAPEH?$tr$, $tr$["The importance of health and Filipino culture", "There is no special lesson", "It is only about sports", "It is only about music"]$tr$::jsonb, $tr$Term Review: Arts, Culture, and Health$tr$),
('5bea4148-ad4a-42fb-803a-5942853605d5', $tr$What is the goal of improvising a rhythm?$tr$, $tr$["To create your own new pattern", "To only copy someone else's song", "To stay quiet the whole session", "To only read the lyrics"]$tr$::jsonb, $tr$Music: Rhythm and Tempo$tr$),
('5c68dce1-1ebe-4a66-bda9-d4cb40d81ab8', $tr$What does this kind of art show, even in times of oppression?$tr$, $tr$["The cleverness and bravery of Filipinos", "That Filipinos have no talent", "The fear of Filipinos", "No interest in art"]$tr$::jsonb, $tr$Symbolic Theater and Seditious Plays$tr$),
('5cdeaef4-7d08-45af-8bc2-bd8741053bc3', $tr$In a softball game, a player runs slowly to first base even though the ball is far away. What should the player do?$tr$, $tr$["Run as hard as possible all the way to the base", "Stop to rest first", "Go back to the earlier position", "Wait for the next inning"]$tr$::jsonb, $tr$Striking/Fielding and Net/Wall Games (Term 2, Week 1)$tr$),
('5d372564-9f5d-4eba-bda7-bf837bb892f2', $tr$What is a chorus?$tr$, $tr$["The part that repeats", "The part that changes each time", "The part with no melody", "Only an instrument"]$tr$::jsonb, $tr$Term 2 Review: Music, Arts, PE, and Health$tr$),
('5ef08692-56f8-4b49-890e-2ef074ccaccd', $tr$What is the difference between striking/fielding and net/wall games?$tr$, $tr$["Striking/fielding has hitting and running; net/wall has a barrier", "Neither of them uses a ball", "Both are only played while sitting", "There is no difference between them"]$tr$::jsonb, $tr$Term Review: Music, Arts, and PE$tr$),
('5f42b84f-1d83-4595-9050-86beefe14b68', $tr$What do cigarettes do to the body?$tr$, $tr$["They damage the lungs and cause addiction", "They make the lungs stronger", "They have no effect on the body", "They improve your health"]$tr$::jsonb, $tr$Effects of Gateway Drugs$tr$),
('5feef855-39d4-46d4-bc61-67a162ed51ac', $tr$What equipment is used in the Tinikling?$tr$, $tr$["Bamboo poles", "Umbrella", "Oil lamp", "Glass"]$tr$::jsonb, $tr$Traditional/National Dances$tr$),
('604aaf1b-55c3-43b5-93f6-194b19a21d5d', $tr$What is melodic direction?$tr$, $tr$["Whether the notes go up, go down, or stay the same", "How fast the music is", "How loud the sound is", "The instrument being used"]$tr$::jsonb, $tr$Music and Arts in the Early Spanish Colonial Period$tr$),
('60bc6101-fbfe-4d11-b9b6-74136d1f64d8', $tr$How is melody connected to musical form?$tr$, $tr$["Melody is used in both the verse and the chorus, but each can have a different tune", "Melody has no connection to musical form", "Melody is only for the chorus", "Melody is only for instruments"]$tr$::jsonb, $tr$Musical Form: Verse and Chorus$tr$),
('6169740f-0632-4d19-931c-2984198a6ba6', $tr$Who should a child go to with questions about the changes in their body?$tr$, $tr$["A trusted parent or older person", "Any stranger", "No one, it should just be kept secret", "A classmate who doesn't know either"]$tr$::jsonb, $tr$Art, Feelings, and Changes in Myself$tr$),
('61d13390-1c16-43dd-8573-c28961172949', $tr$How is legend dance connected to culture?$tr$, $tr$["It shows the tradition of storytelling", "There is no connection", "It comes from another country", "It is not part of the culture"]$tr$::jsonb, $tr$Legend Theater and Dance; Health Rights$tr$),
('61e0528e-9c6b-456f-9281-95cfe7e00eb5', $tr$What is perceiving in art?$tr$, $tr$["Understanding shape, light, and shadow", "Selling artwork", "Writing the title of a picture", "Throwing away old things"]$tr$::jsonb, $tr$Visual Arts in the Early Spanish Colonial Period$tr$),
('62219635-6b09-415b-922c-ef02e310c8d5', $tr$Why did most art in this period have religious themes?$tr$, $tr$["Because the Catholic Church had a big influence", "Because other themes were not allowed back then", "Because people knew no other subjects", "Because non-religious art was banned"]$tr$::jsonb, $tr$Visual Arts in the Early Spanish Colonial Period$tr$),
('623adbf1-bf61-47e4-9f7e-5567650516ea', $tr$What do you call the activity at the end of a unit that brings together the skills you learned?$tr$, $tr$["Culminating activity", "Introductory lesson", "Just a quiz", "Just a review"]$tr$::jsonb, $tr$Culminating Dance Performance$tr$),
('6249aa16-947d-4957-a89d-f08353c0e40f', $tr$Why get vaccinated?$tr$, $tr$["Protection against disease", "No benefit", "It causes disease", "It is no longer needed"]$tr$::jsonb, $tr$Health: Common Infectious Diseases$tr$),
('62825218-5ceb-4461-83ed-6134d562beb5', $tr$What is engraving?$tr$, $tr$["Carving a design into a hard surface", "Drawing with only a pencil", "Painting with watercolors", "Selling artwork"]$tr$::jsonb, $tr$Visual Arts in the Early Spanish Colonial Period$tr$),
('62c99c95-f6cb-4b5f-bf50-c463c913f695', $tr$Why are these indigenous dances connected to beliefs?$tr$, $tr$["They are done as prayer or celebration", "They are done only for tourists", "They have nothing to do with religion", "They are done only as a sport"]$tr$::jsonb, $tr$Arts: Rhythm and Movement in Indigenous Rituals$tr$),
('62f5c73a-d391-4db6-b6a7-58c061eb50f2', $tr$What do the 8Rs stand for?$tr$, $tr$["Ways to reduce garbage in the environment", "Eight new diseases", "Eight vaccines", "Eight kinds of exercise"]$tr$::jsonb, $tr$Environmental Health (One Health)$tr$),
('6316697d-f8fe-40b6-93a5-6f1db25e13ad', $tr$What is one part of a good plan for a wellness day?$tr$, $tr$["Choosing games that suit all ages", "Running around with no plan", "Giving tasks with no schedule", "Avoiding all equipment"]$tr$::jsonb, $tr$Planning Family Health Activities$tr$),
('6385bb1e-cce2-4f38-9328-64ecaeb4f94a', $tr$Why is it important to actually carry out the plan, not just plan it?$tr$, $tr$["To feel the real benefits of exercise", "Planning alone is enough", "It has no extra benefit", "Only the planning matters"]$tr$::jsonb, $tr$Doing Our Family Wellness Activity$tr$),
('63a82d40-e782-4a83-bbd7-852ae4284459', $tr$What value is highlighted here?$tr$, $tr$["The fun of mingling with others", "Being alone", "Competition only", "Losing"]$tr$::jsonb, $tr$Social Dance Mixers$tr$),
('658452d0-e256-4629-a359-3e46fced31c6', $tr$What is the goal of reviewing before the break?$tr$, $tr$["To make sure you are ready for new topics next term", "It has no goal", "Just to entertain the teacher", "To replace the math lessons"]$tr$::jsonb, $tr$Term 2 Review: Music, Arts, PE, and Health$tr$),
('660449f2-2382-4394-9ce2-1044e2a90163', $tr$What is the consumer's right to choose?$tr$, $tr$["To choose what you want to buy", "No right to choose", "To buy only one thing", "It is not a right"]$tr$::jsonb, $tr$Consumer Rights and Responsibilities$tr$),
('661f37e7-f6f7-4394-8993-f4d4759433fc', $tr$What is one trait of a healthy family?$tr$, $tr$["Open communication", "Not talking to each other", "Always fighting", "Following no rules"]$tr$::jsonb, $tr$Rhythm, Family Health, and Invasion Games$tr$),
('665a266f-992c-4929-b295-49819002465f', $tr$Why is environmental health seen as an important issue?$tr$, $tr$["It affects everyone's health and way of living", "It has no effect on people", "It is only a problem in other countries", "It is not related to MAPEH"]$tr$::jsonb, $tr$Environmental Health (One Health)$tr$),
('6676032f-d721-4e2e-a1ff-c1be1154243a', $tr$Which is an example of a carbohydrate?$tr$, $tr$["Rice", "Fish", "Vegetables", "Water only"]$tr$::jsonb, $tr$Melody and Healthy Eating$tr$),
('667d6f9b-f15f-4138-9f20-362c6b39879e', $tr$Which is NOT a good response if you are offered one?$tr$, $tr$["Try it first", "Say 'No'", "Leave the situation", "Ask for help"]$tr$::jsonb, $tr$Effects of Gateway Drugs$tr$),
('67354cea-4244-458a-9efb-6a65f9820acb', $tr$What will happen if there is no proper sanitation?$tr$, $tr$["A higher risk of disease", "No effect", "Everyone becomes healthier", "Diseases disappear"]$tr$::jsonb, $tr$Environmental Health (One Health)$tr$),
('673cc9db-6247-4609-af9f-1b415ded7127', $tr$What is one way to avoid gateway drugs?$tr$, $tr$["Say 'No' with confidence when offered", "Try it just once to find out", "Follow a friend who uses it", "Just hide it from your parents"]$tr$::jsonb, $tr$Effects of Gateway Drugs$tr$),
('69a49c2c-b1b6-4380-b850-e63db0d45c65', $tr$Difference between a song and a children's poem?$tr$, $tr$["A song has a melody, a poem is only read", "They are the same", "There is no difference", "A poem has a melody too"]$tr$::jsonb, $tr$Writing Your Own Simple Song$tr$),
('69e32fdd-0f36-4ef4-b45b-3d42b1a0e801', $tr$Why is dance exercise more fun?$tr$, $tr$["It combines music and movement", "There is no difference", "It is harder", "It is not exercise"]$tr$::jsonb, $tr$Dance Exercise$tr$),
('6a370458-c253-4127-bb04-c0f6c35f3981', $tr$What is one example we learned of a bad effect of misusing medicine?$tr$, $tr$["It can harm the body's health", "Its effect is always good", "It has no effect at all on the body", "It only makes the body stronger"]$tr$::jsonb, $tr$Combining Dance, Health, and Art$tr$),
('6ad97075-c178-4044-9c4e-6e3b29290802', $tr$What is an example of a carbohydrate?$tr$, $tr$["Rice", "Fish", "Vegetables", "Water"]$tr$::jsonb, $tr$Melody and Healthy Eating$tr$),
('6b5b2130-48d7-42e4-a389-e4c5c59d53dc', $tr$A classmate is trying to pressure you into doing something you don't want to do. What should you do?$tr$, $tr$["Say \"no\" clearly and talk to a trusted adult", "Just go along so your classmate doesn't get annoyed", "Hide what happened from everyone", "Avoid the classmate forever"]$tr$::jsonb, $tr$Art, Feelings, and Changes in Myself$tr$),
('6be81f06-67d8-4e15-a431-9a16ddc9429d', $tr$Why learn to dance in different time signatures?$tr$, $tr$["It widens your skills", "It is not important", "You don't need to learn it", "Only to entertain the teacher"]$tr$::jsonb, $tr$Social Dance Mixers in 3/4 Time$tr$),
('6c398237-3f9d-4bb4-b7de-e1d30f273ad7', $tr$A student watches the senakulo every Holy Week in their town. What does this show?$tr$, $tr$["This art tradition is still alive", "This art form is brand new", "It has no connection to history", "It is just a modern invention"]$tr$::jsonb, $tr$Theater and Dance in the Early Spanish Colonial Period$tr$),
('6c8a873e-79de-41b3-b2f2-0bc0684f3b76', $tr$Which period of history are we studying in Music/Arts this term?$tr$, $tr$["Early Spanish Colonial", "American", "Present day", "Before the Spanish arrived"]$tr$::jsonb, $tr$Term 2 Review: Music, Arts, PE, and Health$tr$),
('6c948870-2fe8-4d52-8844-917e915276d9', $tr$What does the Singkil show?$tr$, $tr$["Maranao culture, using bamboo poles and umbrellas", "A foreign culture", "Just a kind of game", "It has no meaning"]$tr$::jsonb, $tr$Traditional/National Dances$tr$),
('6d281d65-2b55-499a-a309-b43e6d96a546', $tr$Who does 'Inang Bayan' (Mother Country) stand for in these plays?$tr$, $tr$["The Philippines", "Spain", "Japan", "America"]$tr$::jsonb, $tr$Symbolic Theater and Seditious Plays$tr$),
('6d79f900-d770-44e0-8e5f-be6444d85aab', $tr$How was pre-colonial art different from early Spanish colonial art?$tr$, $tr$["The later one was influenced by Europe", "They were exactly the same", "There was no difference", "Pre-colonial was the more modern style"]$tr$::jsonb, $tr$Music and Arts in the Early Spanish Colonial Period$tr$),
('6e891d2e-76df-4eec-9732-5532d3b91bef', $tr$How do lines create movement in a picture?$tr$, $tr$["They guide the eye in one direction", "They make the picture darker", "They take away the picture's color", "They have no effect on the picture"]$tr$::jsonb, $tr$Visual Arts: Rhythm and Pattern$tr$),
('6eb30a6c-5788-4117-a1eb-dc520f69e088', $tr$Why is taking medicine without an adult's permission not allowed?$tr$, $tr$["A child may not know the right dose or effects", "There is no danger in it", "A child always knows the right medicine", "Permission is not needed"]$tr$::jsonb, $tr$Proper Medicine Use vs. Misuse$tr$),
('6ec8e48a-5314-4035-ba91-4405a115dbc5', $tr$Which of these is an example of a gateway drug?$tr$, $tr$["Cigarettes", "Milk", "Water", "Fruit"]$tr$::jsonb, $tr$Effects of Gateway Drugs$tr$),
('6f04208c-e870-4ebd-b985-fffd9be0b215', $tr$Why is valuing culture an important part of MAPEH?$tr$, $tr$["It helps keep the Filipino identity alive", "It has no connection", "It is just a separate topic", "It is not part of education"]$tr$::jsonb, $tr$Term Review: Arts, Culture, and Health$tr$),
('6f08ed9f-b98e-4457-a01c-d881c07d54b3', $tr$How is it connected to traditional dance?$tr$, $tr$["Both show identity in different times", "No connection", "One is about science", "One is about math"]$tr$::jsonb, $tr$My Filipino Identity$tr$),
('6f13d43e-ce43-4cff-81c5-f0155dd43f0f', $tr$How is it connected to the infectious diseases we learned about before?$tr$, $tr$["Both are about preventing disease", "No connection", "One is only about science", "One is about math"]$tr$::jsonb, $tr$Environmental Health (One Health)$tr$),
('6f223b3c-edc0-42d7-ad35-69b897cc47de', $tr$Why is music used?$tr$, $tr$["For tempo and fun while moving", "It has no use", "It just makes the exercise harder", "It is not needed"]$tr$::jsonb, $tr$Dance Exercise and Movement Exploration$tr$),
('6f283030-1a66-4a25-a012-9e37d80feb7f', $tr$What is volleying?$tr$, $tr$["Hitting the ball back without letting it touch the floor", "Hitting the ball with a bat", "Running to a base", "Catching the ball with both hands"]$tr$::jsonb, $tr$Striking/Fielding and Net/Wall Games (Term 2, Week 1)$tr$),
('70b90a35-1657-4bb1-9130-cc4b390bd8e9', $tr$Why shouldn't you just believe every advertisement?$tr$, $tr$["Not all ads are accurate or true", "All ads are always right", "There is no reason", "Ads are not important"]$tr$::jsonb, $tr$Consumer Rights and Responsibilities$tr$),
('71276297-673c-4526-8f75-25b37fa16731', $tr$How is a verse different from a chorus?$tr$, $tr$["The words of the verse change while the chorus repeats", "They are always the same", "The verse has no melody", "The chorus has no words"]$tr$::jsonb, $tr$Musical Form: Verse and Chorus$tr$),
('716f9433-6c46-4d15-a5f1-84cf5cc305c1', $tr$How does music help in a social dance mixer?$tr$, $tr$["It gives a tempo for the steps to follow", "It has no role in the dance", "It is only used as noise", "It stops the dance"]$tr$::jsonb, $tr$Social Dance Mixers$tr$),
('71ccd9d3-a325-47ad-b1a8-fa638c6dcbfe', $tr$Benefit of a culminating activity in MAPEH?$tr$, $tr$["It brings the skills you learned together into one success", "No benefit", "Just for fun", "Not part of learning"]$tr$::jsonb, $tr$Culminating Dance Performance$tr$),
('721964ec-bf97-4a2a-8362-727935ab7510', $tr$Why are rhythm, pattern, and movement important in art?$tr$, $tr$["They make the work interesting and organized", "They have no meaning in art", "They only make the work harder", "They are only used in sports"]$tr$::jsonb, $tr$Visual Arts: Rhythm and Pattern$tr$),
('728ac573-bf62-44aa-a1b3-eae0195155b5', $tr$Why is it important to read the medicine label before taking it?$tr$, $tr$["To know the right way to use it and the right dose", "You do not need to read the label", "The label is only for decoration", "The label is only for adults"]$tr$::jsonb, $tr$Proper Medicine Use vs. Misuse$tr$),
('72f9df5c-ce55-4fed-8ee2-47ef21bff216', $tr$A church hymn has the same melody for every stanza. What form does this show?$tr$, $tr$["Strophic", "Binary", "Free-form", "No form"]$tr$::jsonb, $tr$Music and Arts in the Early Spanish Colonial Period$tr$),
('736c3421-1b7e-49b9-80c0-a1293ed4a12b', $tr$What is an example of an infectious disease?$tr$, $tr$["Flu", "Diabetes", "Osteoporosis", "Asthma"]$tr$::jsonb, $tr$Health: Common Infectious Diseases$tr$),
('742f7a09-17d6-4361-8221-6893e5938a8a', $tr$What is the exposition in a dramatic play?$tr$, $tr$["Introducing the characters and the situation", "The highest point", "Solving the problem", "The end of the play"]$tr$::jsonb, $tr$Symbolic Theater and Seditious Plays$tr$),
('74435740-1a58-4b4c-827f-3bba40411093', $tr$What type of dance is in 3/4 time?$tr$, $tr$["Waltz", "Polka", "Hip-hop", "Breakdance"]$tr$::jsonb, $tr$Social Dance Mixers in 3/4 Time$tr$),
('7461cefd-c2b9-43f5-a3df-00a6edb83f24', $tr$Which is an example of popular music in the Philippines?$tr$, $tr$["OPM", "Symphony", "Sonata", "Only kundiman"]$tr$::jsonb, $tr$Music: Meter, Time Signatures, and Rhythmic Dance Patterns$tr$),
('74a8636b-4a97-4f11-b5ea-440c4a03173f', $tr$Which one is gentler?$tr$, $tr$["3/4 time", "2/4 time", "They are the same", "Neither"]$tr$::jsonb, $tr$Combining 2/4 and 3/4 Time$tr$),
('74f81700-590c-4178-adec-864b19fd6ac8', $tr$Which is an example of a Filipino game we learned?$tr$, $tr$["Patintero and Agawan Base", "Chess and Checkers", "Basketball and Baseball", "Golf and Tennis"]$tr$::jsonb, $tr$Term Review: Music, Arts, and PE$tr$),
('752cc755-85c1-4497-8356-55d7add56800', $tr$Why is dance practice important as part of PE?$tr$, $tr$["It builds physical skills and coordination", "It has no benefit", "It weakens the body", "It is not part of PE"]$tr$::jsonb, $tr$Social Dance Mixers in 3/4 Time$tr$),
('76426896-52b4-40fa-af7c-6b2dd7719f57', $tr$Which is an example of a striking/fielding game?$tr$, $tr$["Softball", "Badminton", "Volleyball", "Table tennis"]$tr$::jsonb, $tr$Striking/Fielding and Net/Wall Games (Term 2, Week 1)$tr$),
('765844b1-fe33-45af-9fc7-98ba0a45d119', $tr$Which one is faster?$tr$, $tr$["2/4 time", "3/4 time", "They are the same", "Neither"]$tr$::jsonb, $tr$Combining 2/4 and 3/4 Time$tr$),
('7665884b-4725-4477-a107-25f48084eb93', $tr$How many beats are in each measure of 2/4 time?$tr$, $tr$["Two", "Three", "Four", "One"]$tr$::jsonb, $tr$Fundamental Dance Steps in 2/4 Time$tr$),
('7674300d-28e0-4fb0-81be-e901960e4d0f', $tr$Effect of cigarettes on the body?$tr$, $tr$["They damage the lungs and cause addiction", "They make the lungs stronger", "No effect", "They improve your health"]$tr$::jsonb, $tr$Effects of Gateway Drugs$tr$),
('768b4990-55c2-4e1b-8062-efc62b5a9d81', $tr$Goal of the activity in MAPEH?$tr$, $tr$["Use musical form in a project", "No goal", "Entertain the teacher", "Replace math"]$tr$::jsonb, $tr$Writing Your Own Simple Song$tr$),
('76dc98c8-0dc0-447e-be0c-620141fd404e', $tr$What is the kundiman?$tr$, $tr$["A semi-classical love song", "Just a kind of dance", "Just an instrument", "Just a game"]$tr$::jsonb, $tr$Music: Meter, Time Signatures, and Rhythmic Dance Patterns$tr$),
('774f8980-3f52-4c9d-8a73-a37411f6dc3d', $tr$Why is everything we covered in MAPEH this term important?$tr$, $tr$["It gives balanced growth in the arts, health, and physical skills", "Only one of these should be studied", "It means nothing in a child's life today", "It is only done for fun in this activity"]$tr$::jsonb, $tr$Term Review: Music, Arts, and PE$tr$),
('77f21209-c264-4d9e-97ab-1e228b9d9220', $tr$Why is it important to learn the basic dance steps?$tr$, $tr$["They help you learn harder dances later", "It is not important", "You don't need to learn them", "Only to entertain the teacher"]$tr$::jsonb, $tr$Fundamental Dance Steps in 2/4 Time$tr$),
('7852de0d-87ea-41d2-9a72-9568393e1e97', $tr$Effect of alcohol on the body?$tr$, $tr$["It affects the brain and thinking", "It makes memory stronger", "No effect on the mind", "It improves eyesight"]$tr$::jsonb, $tr$Effects of Gateway Drugs$tr$),
('78a91752-8eb1-4713-9a08-0e8048798ecf', $tr$What type of dance usually uses 2/4 time?$tr$, $tr$["Polka", "Waltz", "Tango", "Ballroom in 3/4"]$tr$::jsonb, $tr$Fundamental Dance Steps in 2/4 Time$tr$),
('78c49e33-24a5-4ad8-8bdb-b613ec62381a', $tr$Why were many pictures of saints made during the Early Spanish Colonial Period?$tr$, $tr$["To teach religion to the people", "Just to decorate homes", "To sell to other countries", "It had no purpose back then"]$tr$::jsonb, $tr$Music and Arts in the Early Spanish Colonial Period$tr$),
('79a57ad0-980f-4016-ad05-d77058fab755', $tr$Which game is an invasion game?$tr$, $tr$["Agawan Base", "Tumbang Preso", "Tatsing", "Calahoyo"]$tr$::jsonb, $tr$Rhythm, Family Health, and Invasion Games$tr$),
('7a4a5a95-0bb6-46cd-8e55-b4d926294c46', $tr$What mediums were used in visual arts during this period?$tr$, $tr$["Painting and sculpture", "Digital pictures", "Movies", "Only music"]$tr$::jsonb, $tr$Music and Arts in the Early Spanish Colonial Period$tr$),
('7a8a5506-b48e-45a6-a1b6-b2adc529786a', $tr$What are fundamental dance steps?$tr$, $tr$["Basic steps used in many dances", "A type of song", "A type of game", "A type of drawing"]$tr$::jsonb, $tr$Fundamental Dance Steps in 2/4 Time$tr$),
('7aa4e772-a07a-41af-92b4-d92e6fb3731b', $tr$What matters most, based on the goal of the activity?$tr$, $tr$["Sharing your idea using musical form", "Making the melody perfect", "Making the song the longest", "Using many instruments"]$tr$::jsonb, $tr$Writing Your Own Simple Song$tr$),
('7b56c038-921a-4bb5-8d11-c7f6405cdfe5', $tr$What time signature is used in a social dance mixer?$tr$, $tr$["2/4", "6/8", "9/4", "No time signature"]$tr$::jsonb, $tr$Social Dance Mixers$tr$),
('7c2b1580-6e5d-430a-a02a-21309fd65ac0', $tr$What is dance exercise?$tr$, $tr$["Exercising with simple dance moves", "A type of food", "A type of phone game", "A type of drawing"]$tr$::jsonb, $tr$Dance Exercise and Movement Exploration$tr$),
('7c4507ae-4e4b-42fd-92df-5ba53821d94d', $tr$What happens if the right to health is not met?$tr$, $tr$["Well-being and growth are affected", "Nothing happens", "Everything is always fine", "They are automatically protected"]$tr$::jsonb, $tr$Legend Theater and Dance; Health Rights$tr$),
('7c80b6c6-6274-4bb5-8f90-665ba6af3644', $tr$What is movement in art?$tr$, $tr$["How the body moves", "The color of the costume", "Only the sound of the music", "The number of people watching"]$tr$::jsonb, $tr$Arts: Rhythm and Movement in Indigenous Rituals$tr$),
('7c8c46fb-88ec-4484-88de-2726113a178d', $tr$Why is the chorus of a song easy to remember?$tr$, $tr$["Because it repeats with the same words and melody", "Because it is only quiet", "Because it has no melody", "Because it is sung only once"]$tr$::jsonb, $tr$Musical Form: Verse and Chorus$tr$),
('7ca2e18c-b72f-4e32-b7da-82950909bc63', $tr$Why practice before the performance?$tr$, $tr$["So the moves are smooth", "It is not needed", "As long as the first try is right", "It has no effect"]$tr$::jsonb, $tr$Combining 2/4 and 3/4 Time$tr$),
('7db2fc49-3e20-4936-8574-9e6ef4f10f03', $tr$What type of dance usually uses 3/4 time?$tr$, $tr$["Waltz", "Polka", "Hip-hop", "Breakdance"]$tr$::jsonb, $tr$Social Dance Mixers in 3/4 Time$tr$),
('7e447ea9-38a8-420f-95a1-249684f25e16', $tr$What dance will be used in the performance?$tr$, $tr$["A social dance mixer in 2/4 time", "A new dance not yet learned", "No dance, only a song", "A dance from another country"]$tr$::jsonb, $tr$Culminating Dance Performance$tr$),
('7ee9a9a4-b171-4a44-906d-a84f13cabf01', $tr$Why practice timing with the music?$tr$, $tr$["So the movements are smooth", "It is not needed", "To make the time longer", "It has no connection"]$tr$::jsonb, $tr$Culminating Dance Performance$tr$),
('7eef611c-57ae-49ef-ad21-5581b7687b60', $tr$Why is it important to practice before a choreography performance?$tr$, $tr$["So the moves are smooth and together", "You don't need to practice", "As long as the first try is right", "Practice has no effect"]$tr$::jsonb, $tr$Combining 2/4 and 3/4 Time$tr$),
('7f86a629-f4cc-42ca-9ea2-f6bd653101c4', $tr$Why are street dance festivals taught in MAPEH?$tr$, $tr$["To value the culture and history of each region", "It has no purpose", "It is only for adults", "It is not related to education"]$tr$::jsonb, $tr$Local and Regional Street Dances$tr$),
('8098772c-41f6-4c90-9daa-ce0cad2c463e', $tr$How is melody connected to the verse and chorus?$tr$, $tr$["Melody is used in both, and each can have a different tune", "No connection", "Melody is only for the chorus", "Melody is only for instruments"]$tr$::jsonb, $tr$Musical Form: Verse and Chorus$tr$),
('811c9366-59fb-4360-bebd-ff5a11548545', $tr$What is a child's health right?$tr$, $tr$["Access to clean food and water", "The right not to go to school", "The right not to sleep", "None"]$tr$::jsonb, $tr$Legend Theater and Dance; Health Rights$tr$),
('81ca3f25-afe4-4dd0-bd36-30865a00b027', $tr$What health right does a child have?$tr$, $tr$["Access to clean food and water", "The right not to go to school", "The right not to sleep", "No rights"]$tr$::jsonb, $tr$Legend Theater and Dance; Health Rights$tr$),
('81cec1c5-2db2-4056-8018-26e8ecd3d489', $tr$Concept used here?$tr$, $tr$["Verse and chorus", "Statistics", "Probability", "Outline"]$tr$::jsonb, $tr$Writing Your Own Simple Song$tr$),
('82005df6-23b0-4901-9d7c-1cb9ae2c4c08', $tr$What is the climax?$tr$, $tr$["The highest point of the conflict", "The beginning of the play", "Introducing the characters", "Only the ending"]$tr$::jsonb, $tr$Symbolic Theater and Seditious Plays$tr$),
('82333224-f772-4ccf-ade9-8a8fc9d0095f', $tr$Why is this week important for Term 2?$tr$, $tr$["It is the last week of Term 2 for MAPEH", "It is only the first week", "It is not important", "It is not part of Term 2"]$tr$::jsonb, $tr$Combining 2/4 and 3/4 Time$tr$),
('823bf489-3ecd-445f-8853-19fcf0c329e0', $tr$How is melody different from rhythm?$tr$, $tr$["Melody is the tune; rhythm is the tempo/speed", "They are just the same", "There is no difference", "Rhythm is only about the tune"]$tr$::jsonb, $tr$Melody and Healthy Eating$tr$),
('823dce36-5a6a-492f-82e0-c1b6de8490d2', $tr$How is dance exercise connected to health?$tr$, $tr$["Both help physical health", "There is no connection", "It is only about music", "It has no effect"]$tr$::jsonb, $tr$Dance Exercise and Movement Exploration$tr$),
('832b77f6-8454-4196-9739-461c9df4f134', $tr$What is the Sinulog?$tr$, $tr$["A prayer dance for the Santo Niño", "Only a Christmas dance", "Only a wedding dance", "Only a graduation dance"]$tr$::jsonb, $tr$Arts: Rhythm and Movement in Indigenous Rituals$tr$),
('834090b7-a335-4a58-a654-91c39985ee70', $tr$Why does MAPEH include dance?$tr$, $tr$["It builds health and the arts", "There is no purpose", "It is not related", "It is for adults"]$tr$::jsonb, $tr$Combining 2/4 and 3/4 Time$tr$),
('837601ba-e25c-4a7c-9ec9-ad51b41ce792', $tr$What if it is hard to find a melody?$tr$, $tr$["Try using your voice or clapping", "Just give up", "Forget the project", "Copy someone else"]$tr$::jsonb, $tr$Writing Your Own Simple Song$tr$),
('8409413b-3afd-48fa-9197-08cb9895312b', $tr$How does music help?$tr$, $tr$["It gives a tempo to follow", "It has no role in the dance", "It is only used as noise", "It stops the dance"]$tr$::jsonb, $tr$Social Dance Mixers$tr$),
('849ef5b1-e176-4ac5-bf57-89d6d64e8a0e', $tr$Why do you need to prepare equipment before the wellness day?$tr$, $tr$["So the activity is organized and ready", "It is pointless for the activity", "Only to make time go faster", "You don't need to prepare anything"]$tr$::jsonb, $tr$Planning Family Health Activities$tr$),
('84ae8c1d-47fa-427d-bc3c-75a48594a756', $tr$Why is physical activity like dance an important part of MAPEH?$tr$, $tr$["It keeps the body healthy and teaches coordination", "It does nothing for health", "It is not part of physical education", "It is only done to entertain the teacher"]$tr$::jsonb, $tr$Culminating Dance Performance$tr$),
('84ccf6a4-6010-4c67-9765-750f49b7c3b6', $tr$What does planning family health activities bring?$tr$, $tr$["It makes the family's bond and health stronger", "It only makes the family's bond weaker", "It has no benefit for the whole family", "It only causes fights at home"]$tr$::jsonb, $tr$Planning Family Health Activities$tr$),
('84cf4667-2249-41a5-a5a9-69e610febf49', $tr$What should you do before playing any sport?$tr$, $tr$["Warm up", "Eat a heavy meal", "Go to sleep right away", "Drink cold water"]$tr$::jsonb, $tr$Striking/Fielding and Net/Wall Games (Term 2, Week 1)$tr$),
('8537dd5e-ece4-468f-8882-332616e6799d', $tr$Why is physical activity important in MAPEH?$tr$, $tr$["It keeps the body healthy and teaches coordination", "It does nothing for health", "It is not part of PE", "Just to entertain the teacher"]$tr$::jsonb, $tr$Culminating Dance Performance$tr$),
('85f7c128-d239-4b07-80ae-f16a2229f1be', $tr$What is a balanced meal?$tr$, $tr$["A meal with carbohydrates, protein, vegetables, and fruits", "Rice only", "Sweet foods only", "Only one kind of drink"]$tr$::jsonb, $tr$Melody and Healthy Eating$tr$),
('8609cc4b-19d4-477a-81ce-47ecd45f672d', $tr$What is OPM?$tr$, $tr$["Original Pilipino Music", "A kind of dance", "A country", "A kind of food"]$tr$::jsonb, $tr$My Filipino Identity$tr$),
('86200f24-1d57-4a3e-a2a2-8a2076c5fa52', $tr$What should you do if you feel pressured to use it?$tr$, $tr$["Ask a parent or teacher for help", "Just go along with it", "Hide it from everyone", "Do it secretly"]$tr$::jsonb, $tr$Effects of Gateway Drugs$tr$),
('86379964-6a60-471d-9e42-5db7d0f92ef4', $tr$What time signature was used in the rhythmic dance?$tr$, $tr$["2/4", "6/8", "9/4", "None"]$tr$::jsonb, $tr$Term 2 Review: Music, Arts, PE, and Health$tr$),
('868b7bad-70f5-4415-af47-4e9f7a086f89', $tr$What is the waltz like as a dance?$tr$, $tr$["Gentle, with three beats per measure", "Very fast, with two beats", "It has no music", "It has only one beat"]$tr$::jsonb, $tr$Social Dance Mixers in 3/4 Time$tr$),
('86b76e15-24e1-4e85-a232-9ced3d0c1982', $tr$What skill do you learn in a social dance mixer?$tr$, $tr$["Coordination and timing with the music", "Writing poems", "Calculating probability", "Reading maps"]$tr$::jsonb, $tr$Social Dance Mixers$tr$),
('881ff78b-4a7e-4b98-ad58-a88d824d8751', $tr$What is rhythm?$tr$, $tr$["A pattern of sounds and silences", "The color of an instrument", "The place of a concert", "The number of people watching"]$tr$::jsonb, $tr$Rhythm, Family Health, and Invasion Games$tr$),
('888e2780-da08-421d-af41-44568013d806', $tr$Why is it important to keep traditional dances alive?$tr$, $tr$["They are part of our national identity", "They are not important", "They are no longer needed today", "They are not part of culture"]$tr$::jsonb, $tr$Traditional/National Dances$tr$),
('8916c3a8-1ff0-430a-a6b4-b222949bca23', $tr$What is balance in PE?$tr$, $tr$["The ability to stay steady while moving", "The ability to run very fast", "The ability to count quickly", "The ability to sing loudly"]$tr$::jsonb, $tr$Term Review: Music, Arts, and PE$tr$),
('89f7343d-fbf4-4e65-b4f6-f319fb87f297', $tr$What matters, based on the activity's goal?$tr$, $tr$["Sharing your idea using musical form", "Making the melody perfect", "Making it the longest", "Using many instruments"]$tr$::jsonb, $tr$Writing Your Own Simple Song$tr$),
('8aa736b1-0887-43a4-847b-c2d718c8ee87', $tr$Who perform the Singkil?$tr$, $tr$["The Maranao", "The Ilocano", "The Visayans", "The Tagalog"]$tr$::jsonb, $tr$Term Review: Arts, Culture, and Health$tr$),
('8bc8b3e4-4819-4250-8a61-1a121f07f7ad', $tr$Why is vaping dangerous even if it seems harmless?$tr$, $tr$["It contains nicotine, which causes addiction", "It has no nicotine", "It is safe at any age", "It has no effects at all"]$tr$::jsonb, $tr$Effects of Gateway Drugs$tr$),
('8bd96f8e-3c48-4fb2-b37b-3985a05b950b', $tr$Why is this topic taught?$tr$, $tr$["So kids are ready to say no", "To encourage them to try it", "It has no goal", "Just to scare them"]$tr$::jsonb, $tr$Effects of Gateway Drugs$tr$),
('8c42958a-cc33-4140-aa23-6ec9915a3137', $tr$Goal of the culminating dance performance?$tr$, $tr$["To show coordination and teamwork", "To beat the other groups", "It has no goal", "Just to entertain the teacher"]$tr$::jsonb, $tr$Culminating Dance Performance$tr$),
('8c86fa0e-3e6d-4d36-918d-aad95fd82eca', $tr$Why are they called 'gateway' drugs?$tr$, $tr$["They can be a starting point to more dangerous drugs", "They are safe", "They are just a kind of gate", "They are only banned for adults"]$tr$::jsonb, $tr$Effects of Gateway Drugs$tr$),
('8cc3108d-4195-457d-a48a-a1be787e1023', $tr$Why is it important to review what we learned in MAPEH this term?$tr$, $tr$["It helps us remember and connect the ideas", "It is pointless for learning", "It is only done for grades", "It only confuses students"]$tr$::jsonb, $tr$Term Review: Music, Arts, and PE$tr$),
('8d2ca0d8-ec4a-4201-b084-a2b785d0eb3e', $tr$Why is jumping important in movement exploration?$tr$, $tr$["It is an example of a movement the body tries out", "It has nothing to do with PE", "It is not a real movement", "It is not part of PE"]$tr$::jsonb, $tr$Dance Exercise and Movement Exploration$tr$),
('8daf4991-220c-483f-8484-162de1f5b1c9', $tr$What are gateway drugs?$tr$, $tr$["Substances that can open the way to more dangerous drugs", "Just a kind of food", "Legal medicine with no effects", "A kind of vitamin"]$tr$::jsonb, $tr$Effects of Gateway Drugs$tr$),
('8de1c7f7-3f86-4b4a-bc5c-8e3aa14f769f', $tr$Why eat different kinds of food?$tr$, $tr$["For a healthy body", "It is not important", "As long as it's a lot", "It does not matter"]$tr$::jsonb, $tr$Melody and Healthy Eating$tr$),
('8e1d6244-c4ba-4d38-ad45-1abe6f868013', $tr$What do theater and dance inspired by legends show?$tr$, $tr$["A story through movement and costumes", "No story", "Only modern technology", "Trade laws"]$tr$::jsonb, $tr$Legend Theater and Dance; Health Rights$tr$),
('8efaf027-5e5e-48cc-874f-2a4ba8e37178', $tr$What is one way to break the chain of infection?$tr$, $tr$["Washing hands regularly", "Not caring about cleanliness", "Gathering together without protection", "Forgetting to get vaccinated"]$tr$::jsonb, $tr$Health: Common Infectious Diseases$tr$),
('8f5bc5d1-9e93-449d-8da2-48e778caa930', $tr$What are systems of writing melody?$tr$, $tr$["Ways of writing down musical notes", "Ways of dancing", "Ways of drawing", "Ways of playing games"]$tr$::jsonb, $tr$Music and Arts in the Early Spanish Colonial Period$tr$),
('90a07f03-e2e0-444c-abd3-f8a17bbb56ea', $tr$Why is contemporary identity an important topic before the year ends?$tr$, $tr$["It sums up the whole journey of Filipino culture through different times", "It is not important", "It is just the last topic", "It is not a fitting topic"]$tr$::jsonb, $tr$My Filipino Identity$tr$),
('90c311bb-95ae-40f2-b0ba-42369dfa2a85', $tr$What is volleying in net/wall games?$tr$, $tr$["Hitting the ball back without letting it touch the floor", "Hitting the ball with a bat", "Running to the next base", "Catching the ball with both hands"]$tr$::jsonb, $tr$Striking/Fielding and Net/Wall Games (Term 2, Week 1)$tr$),
('90dfff8d-38a3-41a7-8c8c-810b401eedce', $tr$How many members are recommended for each group?$tr$, $tr$["4-6 people", "Only 1 person", "20 people", "No set number"]$tr$::jsonb, $tr$Culminating Dance Performance$tr$),
('912a418b-4c76-4293-9b5b-7d50b65a72b7', $tr$What is an example of a fundamental dance step?$tr$, $tr$["Touch step", "Reading", "Writing", "Swimming"]$tr$::jsonb, $tr$Fundamental Dance Steps in 2/4 Time$tr$),
('921e2cfd-f861-4761-a0a6-ce3849a58038', $tr$Why is it an important topic before the year ends?$tr$, $tr$["It sums up the whole journey of our culture", "It is not important", "It is just the last topic", "It is not fitting"]$tr$::jsonb, $tr$My Filipino Identity$tr$),
('922be55a-8ec4-4b58-b7ff-1eefea7aaac3', $tr$Where do the dancers usually stand?$tr$, $tr$["In a circle or line with a partner", "Sitting on the floor", "Hiding at the back", "With their backs to each other"]$tr$::jsonb, $tr$Social Dance Mixers$tr$),
('930a65e7-89f1-41c9-80a4-44a7b8e9ccd7', $tr$What is movement vocabulary?$tr$, $tr$["A set of movements used in a dance", "A list of words in a play", "The names of the dancers", "The color of the costumes"]$tr$::jsonb, $tr$Theater and Dance in the Early Spanish Colonial Period$tr$),
('9389de6c-abda-4b00-b19d-fb780e13af03', $tr$When does a consumer have the right to complain?$tr$, $tr$["When a product is damaged or wrong", "Even with no reason", "It is not a right", "Only for business owners"]$tr$::jsonb, $tr$Consumer Rights and Responsibilities$tr$),
('93cd42e5-9765-406f-a669-bced5b0acc86', $tr$A weaving has repeating triangles. What does it show?$tr$, $tr$["Rhythm and pattern", "It has no design", "Just one single shape", "A random line"]$tr$::jsonb, $tr$Visual Arts: Rhythm and Pattern$tr$),
('9455524a-e5cc-4a13-b79c-56f0bf9a5a53', $tr$What health topic about medicine did we learn?$tr$, $tr$["Proper use versus misuse of medicine", "The history of medicine in the Philippines", "The price of medicine at the drugstore", "Only the names of medicines"]$tr$::jsonb, $tr$Combining Dance, Health, and Art$tr$),
('94826bea-8727-4913-ba3c-261b4aed8cc9', $tr$What happens if people don't follow the steps against disease?$tr$, $tr$["It spreads faster", "No effect", "It gets better", "It goes away right away"]$tr$::jsonb, $tr$Health: Common Infectious Diseases$tr$),
('950a0644-451c-4577-b9e6-b410c8279a0a', $tr$What is an example of good sanitation?$tr$, $tr$["Clean water and proper garbage disposal", "Garbage scattered everywhere", "Not taking care of water", "Throwing garbage into the river"]$tr$::jsonb, $tr$Environmental Health (One Health)$tr$),
('95643955-85a1-43cb-ba7e-e23ff7c3f648', $tr$What is a benefit of dance practice?$tr$, $tr$["Physical skills and coordination", "No benefit", "It weakens the body", "It stops movement"]$tr$::jsonb, $tr$Fundamental Dance Steps in 2/4 Time$tr$),
('95a61cd6-1435-4548-8ce1-49f290eafe9b', $tr$What is medicine misuse?$tr$, $tr$["Taking more than the dose or taking it without permission", "Taking it as prescribed", "Following the schedule", "Reading the label"]$tr$::jsonb, $tr$Proper Medicine Use vs. Misuse$tr$),
('95f25365-8523-439c-9e09-bfa4a7cff7bb', $tr$What is the chorus of a song?$tr$, $tr$["The part that repeats and is usually the easiest to remember", "The part where the words change each time", "The part with no melody", "The part where only the piano plays"]$tr$::jsonb, $tr$Musical Form: Verse and Chorus$tr$),
('961aa0c8-ecb8-4d4d-9d19-57d3a8c9a53f', $tr$Which is the oldest festival in the Philippines?$tr$, $tr$["Ati-Atihan", "Sinulog", "Dinagyang", "MassKara"]$tr$::jsonb, $tr$Local and Regional Street Dances$tr$),
('9682925e-ed4c-4a10-9182-7901e641fa87', $tr$When can a consumer complain?$tr$, $tr$["When the product is damaged", "Even with no reason", "It is not a right", "Only for business owners"]$tr$::jsonb, $tr$Consumer Rights and Responsibilities$tr$),
('96d5b926-fc97-4e9d-a2d0-8346a0bcfe8d', $tr$Why are these dances taught?$tr$, $tr$["To build physical movement and social skills", "Just to entertain the teacher", "No goal", "To stop learning"]$tr$::jsonb, $tr$Social Dance Mixers$tr$),
('96d65090-881a-4a66-ae59-271b9a4bcc4a', $tr$What should you do if you forget the time to take your medicine?$tr$, $tr$["Ask a parent or doctor", "Take a double dose", "Just forget about it", "Take a different medicine"]$tr$::jsonb, $tr$Proper Medicine Use vs. Misuse$tr$),
('9704d17b-364a-46ae-ae4e-902cfa091a9a', $tr$What would you do if you forgot to take your medicine at the right time?$tr$, $tr$["Ask a parent or doctor what to do", "Take a double dose right away", "Just skip taking it", "Take a different medicine with the same color"]$tr$::jsonb, $tr$Proper Medicine Use vs. Misuse$tr$),
('97408135-3dd3-41e0-9a4a-0ecbebd838f0', $tr$What is a physical benefit of dance exercise?$tr$, $tr$["It makes the body stronger and improves coordination", "No benefit", "It weakens the body", "It stops movement"]$tr$::jsonb, $tr$Dance Exercise and Movement Exploration$tr$),
('975a25dc-b636-42f0-8488-8fabcccda8c1', $tr$What skills were shown in the culminating dance performance?$tr$, $tr$["Coordination and teamwork", "Writing skills", "Math skills", "Cooking skills"]$tr$::jsonb, $tr$Term 2 Review: Music, Arts, PE, and Health$tr$),
('9796e223-d3b1-43d0-a418-b1e1c82dde15', $tr$Why is it important for children to know their health rights?$tr$, $tr$["It helps protect their well-being", "It is not important", "It is no longer needed", "It is only for adults"]$tr$::jsonb, $tr$Legend Theater and Dance; Health Rights$tr$),
('97c7a4cf-7228-45f9-9be9-b248550c80d0', $tr$Why is this topic taught as part of Health in MAPEH?$tr$, $tr$["To be responsible in preventing disease and protecting health", "It has no purpose", "It is only for adults", "It is not related to education"]$tr$::jsonb, $tr$Health: Common Infectious Diseases$tr$),
('97ca4b09-1567-44de-97d2-b4c3ba719411', $tr$Which is NOT part of a balanced meal?$tr$, $tr$["Only junk food as the main food", "Carbohydrates", "Protein", "Vegetables and fruits"]$tr$::jsonb, $tr$Melody and Healthy Eating$tr$),
('98402929-c34f-43fb-ba60-3907c2202a35', $tr$Why is it important to watch the ball until you hit it?$tr$, $tr$["It makes your hits more accurate", "It makes the player run faster", "It stops the opponent from catching it", "It makes the ball lighter"]$tr$::jsonb, $tr$Striking/Fielding and Net/Wall Games (Term 2, Week 1)$tr$),
('987fa519-c087-4865-842f-7a67c8211907', $tr$What time signature was used in the rhythmic dances?$tr$, $tr$["2/4", "6/8", "9/4", "No time signature"]$tr$::jsonb, $tr$Term 2 Review: Music, Arts, PE, and Health$tr$),
('98b6c9df-58c2-4ebb-8a73-07314b6a2861', $tr$What is another health right?$tr$, $tr$["Medical care", "None", "The right to work", "The right not to eat"]$tr$::jsonb, $tr$Legend Theater and Dance; Health Rights$tr$),
('98c28033-44c4-448a-a591-6dcf3c6a09aa', $tr$How is dance exercise connected to the environmental health we learned about before?$tr$, $tr$["They are different topics, but both are about overall health", "The two have no connection", "Both are only about science", "Both are about math"]$tr$::jsonb, $tr$Dance Exercise$tr$),
('9a8e2fc7-a0e3-4396-b969-f72c845bf8db', $tr$Why is art used to express identity?$tr$, $tr$["It gives a creative way to show culture", "Art is not important for expression", "Art has nothing to do with identity", "It is not related to culture"]$tr$::jsonb, $tr$My Filipino Identity$tr$),
('9b41e470-1681-40a0-92d8-26971c8d46ca', $tr$How are traditional dances connected to the street dances we learned about before?$tr$, $tr$["Both are part of celebrating and valuing Filipino culture", "The two have no connection", "One is only about science", "One is about math"]$tr$::jsonb, $tr$Traditional/National Dances$tr$),
('9c128fc8-e172-485d-adc9-295321e0cff0', $tr$What should the verse you write be like?$tr$, $tr$["It tells a story and changes each time", "The words are always the same", "It has no words", "Only an instrument"]$tr$::jsonb, $tr$Writing Your Own Simple Song$tr$),
('9c37f523-1723-44f5-8a3b-e3ac72d454e8', $tr$What important lesson did you learn from writing your own song?$tr$, $tr$["Using musical form (verse and chorus) in a creative project", "Making a business investment", "Calculating probability", "Writing a story outline"]$tr$::jsonb, $tr$Term 2 Review: Music, Arts, PE, and Health$tr$),
('9c94dc27-e53c-45cb-b9f9-b4d15c02e8dc', $tr$Why is it important to eat many kinds of food?$tr$, $tr$["For a healthy body", "It is not important", "As long as it's a lot, it's fine", "Variety does not matter"]$tr$::jsonb, $tr$Melody and Healthy Eating$tr$),
('9d5aca50-21f7-4969-9572-8b57fa5d05fe', $tr$Why is it important to value street dance festivals?$tr$, $tr$["They show the rich culture of the Philippines", "They are not important", "They are just for fun", "They are not part of culture"]$tr$::jsonb, $tr$Local and Regional Street Dances$tr$),
('9d630c73-0d60-4ae1-a5f0-5af9049014dc', $tr$Goal of reviewing before the break?$tr$, $tr$["To be ready for new topics", "No goal", "Entertain the teacher", "Replace math"]$tr$::jsonb, $tr$Term 2 Review: Music, Arts, PE, and Health$tr$),
('9d66bbd7-7fc9-47fb-9449-f65cab8725d8', $tr$Why is it important to combine dance, health, and art in one activity?$tr$, $tr$["It shows how different lessons are connected in life", "It has no meaning at all in our real lives", "It only makes learning harder for kids", "It is only done to get a grade"]$tr$::jsonb, $tr$Combining Dance, Health, and Art$tr$),
('9dc94a61-bb1f-4888-b702-f43f47f110b2', $tr$What is the goal of making a poster about why exercise is important?$tr$, $tr$["To remind others why an active lifestyle matters", "Just to decorate the classroom", "This activity has no goal", "To make class time go faster"]$tr$::jsonb, $tr$Combining Dance, Health, and Art$tr$),
('9e2d5473-40b1-43d9-abcd-4bb908a9efb8', $tr$What did we learn about music this term?$tr$, $tr$["Meter, time signatures, and rhythmic dance patterns", "Only the history of computers", "Only math in this activity", "We learned nothing this time"]$tr$::jsonb, $tr$Term Review: Music, Arts, and PE$tr$),
('9e4b3a04-1826-49e7-bccc-a31200d877ea', $tr$How does this whole term show the balance between health and culture?$tr$, $tr$["It brings together physical health and valuing the arts", "Only one of them is important", "The two have no connection", "It is not a real MAPEH theme"]$tr$::jsonb, $tr$Term Review: Arts, Culture, and Health$tr$),
('9e8ef234-0c18-4a89-9c12-e231bc72cb3a', $tr$Which is a correct example of a verse?$tr$, $tr$["The part where the story changes each time the song goes on", "The part where the words are always the same", "Only the title of the song", "The music played before the song starts"]$tr$::jsonb, $tr$Musical Form: Verse and Chorus$tr$),
('9e93a217-2c24-42b7-884e-b239fb1e8d3a', $tr$Which elements of visual arts did we learn?$tr$, $tr$["Rhythm and pattern", "Numbers only", "Weather only", "History only"]$tr$::jsonb, $tr$Term Review: Music, Arts, and PE$tr$),
('9eaa72b7-0ec5-4b80-8ceb-6917f5533c34', $tr$Why keep traditional dances alive?$tr$, $tr$["They are part of our national identity", "Not important", "Not needed anymore today", "Not part of culture"]$tr$::jsonb, $tr$Traditional/National Dances$tr$),
('9f25a643-566e-41d2-acb5-c2a2e7fb4a34', $tr$What is printing in art?$tr$, $tr$["Making many copies using one template", "Only drawing with one pencil", "Only painting with one color", "Only carving a piece of wood"]$tr$::jsonb, $tr$Visual Arts in the Early Spanish Colonial Period$tr$),
('9fdc9614-8d57-4788-b175-03e5e8f43219', $tr$A badminton player keeps getting stuck in the middle, so they are late for shots to the side. What is the fix?$tr$, $tr$["Go back to the ready position right after every shot", "Always stay at the side", "Stop playing", "Just wait for the opponent"]$tr$::jsonb, $tr$Striking/Fielding and Net/Wall Games (Term 2, Week 1)$tr$),
('a099d26b-d43c-42ff-b931-a5741f035a08', $tr$What is a trait of a healthy family?$tr$, $tr$["Open communication", "No talking", "Always fighting", "No rules"]$tr$::jsonb, $tr$Rhythm, Family Health, and Invasion Games$tr$),
('a1f9ab9a-2130-4831-b7df-369e4116a8bb', $tr$Why are these festivals seen as an important part of Filipino identity?$tr$, $tr$["They show the unique culture of each region", "They have nothing to do with identity", "They are only borrowed from other countries", "They are not part of culture"]$tr$::jsonb, $tr$Local and Regional Street Dances$tr$),
('a22be27a-4f13-4ab5-a0f7-3a4d55973fb5', $tr$Why teach contemporary art?$tr$, $tr$["To understand how culture grows and changes", "It has no purpose", "It is only for adults", "It is not related to education"]$tr$::jsonb, $tr$My Filipino Identity$tr$),
('a25dd2e2-6c7c-4a9d-9e54-c0c7e2c21e95', $tr$What is medicine misuse?$tr$, $tr$["Taking more than the set dose or taking it without permission", "Taking it as the doctor prescribed", "Taking it at the right time", "Reading the label before taking it"]$tr$::jsonb, $tr$Proper Medicine Use vs. Misuse$tr$),
('a2768c62-7cee-4c99-99bb-f9f717ee99fb', $tr$What is the goal in invasion games?$tr$, $tr$["To enter the other team's space while defending your own", "To stay standing in one place", "To just wait at the side of the play area", "To sit down while playing"]$tr$::jsonb, $tr$Rhythm, Family Health, and Invasion Games$tr$),
('a2fe1424-187e-4dd8-b346-a2d4d579c5f6', $tr$What will we do this week for the activity?$tr$, $tr$["Actually carry out the plan", "Just forget the plan", "Start planning all over again", "Stop doing the activity"]$tr$::jsonb, $tr$Doing Our Family Wellness Activity$tr$),
('a3a8f62f-32fd-4036-a663-ecf2bc28728e', $tr$Why are legends taught through dance and theater?$tr$, $tr$["It keeps the story and culture alive in an artistic way", "It has no purpose", "It is not related to culture", "It is only a new creation"]$tr$::jsonb, $tr$Legend Theater and Dance; Health Rights$tr$),
('a3c3aa28-6385-4d1a-ab36-849039e2c71e', $tr$Which dance uses a 3-beat pattern?$tr$, $tr$["Waltz", "Tinikling", "Cha-cha", "Boogie"]$tr$::jsonb, $tr$Music: Meter, Time Signatures, and Rhythmic Dance Patterns$tr$),
('a4687dde-02a9-4549-afa8-c221d36939de', $tr$What is an example of dance exercise?$tr$, $tr$["Zumba-inspired moves", "Chess", "Puzzle games", "Reading"]$tr$::jsonb, $tr$Dance Exercise$tr$),
('a47cee6b-40a1-46bb-9289-72e8a9648186', $tr$Which one is NOT part of musical form?$tr$, $tr$["Deposit slip", "Verse", "Chorus", "Melody"]$tr$::jsonb, $tr$Musical Form: Verse and Chorus$tr$),
('a47e74f9-aa7b-4255-88d9-ef34a229b387', $tr$Where do local dances and plays come from?$tr$, $tr$["Legends and folktales", "Modern technology", "Trade laws", "Types of food"]$tr$::jsonb, $tr$Legend Theater and Dance; Health Rights$tr$),
('a4dae1e1-a614-4b5d-95cc-decd6d398ce2', $tr$Why are different kinds of dance included in MAPEH?$tr$, $tr$["They build physical health and an appreciation of the arts", "There is no purpose", "It is not related to education", "It is only for adults"]$tr$::jsonb, $tr$Social Dance Mixers in 3/4 Time$tr$),
('a56deef8-1223-42e9-badd-5ca1d3b167d3', $tr$Which is an example of a dance of thanksgiving?$tr$, $tr$["Pahiyas", "Sinulog only", "Tinikling only", "Cha-cha"]$tr$::jsonb, $tr$Arts: Rhythm and Movement in Indigenous Rituals$tr$),
('a6885663-205d-4854-b036-29c28f7e5efc', $tr$Which body parts does it make stronger?$tr$, $tr$["Heart, lungs, muscles", "Only the hair", "Only the nails", "None"]$tr$::jsonb, $tr$Dance Exercise$tr$),
('a702428f-9ee6-4837-a11c-fcb0f909b558', $tr$Why be a smart shopper?$tr$, $tr$["To avoid scams or low quality", "It is not important", "Just buy without thinking", "It does not matter"]$tr$::jsonb, $tr$Consumer Rights and Responsibilities$tr$),
('a7345068-eade-4829-ba85-56e236964c38', $tr$What is the difference between striking/fielding games and net/wall games?$tr$, $tr$["Striking/fielding has hitting and running; net/wall has a barrier", "Neither of them uses a ball", "Both are only played while sitting", "There is no difference between them"]$tr$::jsonb, $tr$Striking/Fielding and Net/Wall Games$tr$),
('a7c1f262-4ba4-4942-9928-6fa48fd11344', $tr$What is an example of a dance mixer we learned?$tr$, $tr$["A modern dance done as exercise", "A kind of food", "A kind of farm tool", "A kind of computer program"]$tr$::jsonb, $tr$Combining Dance, Health, and Art$tr$),
('a87fda32-096f-45f7-9e4d-a3354e93a3ac', $tr$What happens if a child's right to health is not met?$tr$, $tr$["Their well-being and growth may be affected", "Nothing happens", "Everything is always fine", "They are automatically protected"]$tr$::jsonb, $tr$Legend Theater and Dance; Health Rights$tr$),
('a8e84a26-4c54-4f0c-a5c7-bab9bcab2364', $tr$What does 'Reduce' mean in the 8Rs?$tr$, $tr$["Making less garbage", "Making more garbage", "Hiding garbage", "Burning garbage"]$tr$::jsonb, $tr$Environmental Health (One Health)$tr$),
('a920b3a7-8db3-429c-ab92-710e7f4952fa', $tr$Why is it important to stress the correct beat count in 2/4 time?$tr$, $tr$["To follow the music exactly", "It has nothing to do with the music", "As long as you move, it's fine", "The beat count does not matter"]$tr$::jsonb, $tr$Fundamental Dance Steps in 2/4 Time$tr$),
('a9913c93-bc80-4c27-a4bf-546fd4260cf8', $tr$Why is it important to change the speed and direction of your shots?$tr$, $tr$["So the opponent cannot guess your next move", "To make the game faster", "So the ball is easier to catch", "So you no longer need to run"]$tr$::jsonb, $tr$Striking/Fielding and Net/Wall Games (Term 2, Week 1)$tr$),
('aadc60d9-6373-4b76-b73c-a66705ac2a0b', $tr$A writer used a 'snake' character to stand for the foreign rulers. What is this called?$tr$, $tr$["Symbolism", "Speaking out directly", "Just plain facts", "Daily news"]$tr$::jsonb, $tr$Symbolic Theater and Seditious Plays$tr$),
('ab01a7f1-2ec5-40a7-933a-c74f9e201a0a', $tr$Why value these festivals?$tr$, $tr$["The rich culture of the Philippines", "Not important", "Just for fun", "Not part of culture"]$tr$::jsonb, $tr$Local and Regional Street Dances$tr$),
('ab13b027-0ed3-4efd-858b-c7e543ebc560', $tr$Why learn the basic steps?$tr$, $tr$["To learn harder dances", "It is not important", "You don't need to learn them", "Only to entertain the teacher"]$tr$::jsonb, $tr$Fundamental Dance Steps in 2/4 Time$tr$),
('ab289779-9fa1-411c-acb7-56aba78c6ae8', $tr$What can medicine misuse cause?$tr$, $tr$["Serious harm to the body", "Always a good effect", "No effect", "You get better automatically"]$tr$::jsonb, $tr$Proper Medicine Use vs. Misuse$tr$),
('aba28bfe-09cb-4ee2-be06-49867d75ae1d', $tr$What is balance?$tr$, $tr$["The ability to stay steady while moving", "The ability to run very fast", "The ability to count quickly", "The ability to sing loudly"]$tr$::jsonb, $tr$Striking/Fielding and Net/Wall Games$tr$),
('acd5f0b5-c435-4654-9b73-c4db7a84a1f4', $tr$Why do you need to practice timing with the music?$tr$, $tr$["So the movements are smooth and in sync", "There is no need to practice", "Just to make the time longer", "Timing has nothing to do with dance"]$tr$::jsonb, $tr$Culminating Dance Performance$tr$),
('ad9562ba-8522-47c9-b2f3-5bbc506c225b', $tr$Why is dance exercise important?$tr$, $tr$["It makes the body stronger while you enjoy the music", "It is not important", "It only makes you tired with no benefit", "It is not part of PE"]$tr$::jsonb, $tr$Dance Exercise and Movement Exploration$tr$),
('adc50e45-36e4-447c-8932-f14f114a556d', $tr$Which of these is NOT part of a common musical form?$tr$, $tr$["Deposit slip", "Verse", "Chorus", "Melody"]$tr$::jsonb, $tr$Musical Form: Verse and Chorus$tr$),
('ae031c35-2ab2-483f-b937-e28373e97e63', $tr$What new unit started this week?$tr$, $tr$["Contemporary Identity", "Music of the Revolution", "American Dances", "Only PE"]$tr$::jsonb, $tr$My Filipino Identity$tr$),
('ae24af71-0196-424c-80d4-a520f4e2a095', $tr$What is the first step in making your own song?$tr$, $tr$["Choose a simple topic", "Start singing with no plan", "Forget the verse and chorus", "Buy a new instrument"]$tr$::jsonb, $tr$Writing Your Own Simple Song$tr$),
('ae5d973f-865d-4863-bf10-d34ba1c51b98', $tr$What is the goal of a social dance mixer in 3/4 time?$tr$, $tr$["To follow a gentle tempo while interacting with others", "To learn to write", "To learn math", "To play basketball"]$tr$::jsonb, $tr$Social Dance Mixers in 3/4 Time$tr$),
('ae812f5f-b64c-4caa-9be5-c16aef531937', $tr$Why are basic steps taught before harder dances?$tr$, $tr$["They give a strong foundation", "There is no reason", "You don't need to learn the basics first", "Any dance can be done right away"]$tr$::jsonb, $tr$Fundamental Dance Steps in 2/4 Time$tr$),
('b0186982-ec2c-4cf8-9713-1a1571b26840', $tr$What is a traditional dance?$tr$, $tr$["A dance passed down from one generation to the next", "A new kind of dance", "Only a foreign dance", "A kind of game"]$tr$::jsonb, $tr$Traditional/National Dances$tr$),
('b08440a9-f71b-4d44-8d61-ea5459ec9456', $tr$Why is environmental health an important issue?$tr$, $tr$["It affects everyone's health", "No effect on people", "Only a problem in other countries", "Not related to MAPEH"]$tr$::jsonb, $tr$Environmental Health (One Health)$tr$),
('b0a3e9e8-5147-4d71-82b8-32585a181766', $tr$Why not believe every advertisement?$tr$, $tr$["Not all of them are accurate or true", "They are always right", "There is no reason", "Ads are not important"]$tr$::jsonb, $tr$Consumer Rights and Responsibilities$tr$),
('b0fa0b8e-82f8-4ee4-bbe4-60cfebe7caef', $tr$Why are these substances called 'gateway' drugs?$tr$, $tr$["Because they can be the start of using more dangerous drugs", "Because they are safe and have no effects", "Because they are just a kind of gate or door", "Because they are only banned for adults"]$tr$::jsonb, $tr$Effects of Gateway Drugs$tr$),
('b1133f11-5007-45fa-b435-ae19123ec8db', $tr$Why is it important to know musical form?$tr$, $tr$["It helps you understand the message of the song", "It has nothing to do with understanding", "It is only for musicians", "It is only for instruments"]$tr$::jsonb, $tr$Musical Form: Verse and Chorus$tr$),
('b153f8a4-ca11-4852-a170-d684893a7967', $tr$Why is dance exercise more fun than regular exercise?$tr$, $tr$["It combines music and movement", "It is no different from others", "It is harder than others", "It is not exercise"]$tr$::jsonb, $tr$Dance Exercise$tr$),
('b1c579ce-c5f5-4cbc-bb47-ab032191d1e3', $tr$What tempo fits a funeral song?$tr$, $tr$["Slow", "Fast", "Medium only", "No tempo"]$tr$::jsonb, $tr$Music: Rhythm and Tempo$tr$),
('b1e4490a-95a7-4b93-8c0e-669c1e56c7ed', $tr$Why does a melody use different sounds?$tr$, $tr$["To create a unique tune that people know and are moved by", "There is no reason", "To confuse the listener", "To make the song shorter"]$tr$::jsonb, $tr$Melody and Healthy Eating$tr$),
('b27d2a46-8e60-489c-b9d4-a2d55698e158', $tr$What dance was used?$tr$, $tr$["A social dance mixer in 2/4 time", "A new dance not yet learned", "No dance", "A dance from another country"]$tr$::jsonb, $tr$Culminating Dance Performance$tr$),
('b42c518e-e8ca-40ac-b8fc-5649ba41c176', $tr$What is rhythm?$tr$, $tr$["Repeating sounds in music", "The color of dance clothes", "The name of a song", "The instrument used"]$tr$::jsonb, $tr$Music: Rhythm and Tempo$tr$),
('b438c19e-5c37-4839-aa8b-44a4cc58755d', $tr$What is a consumer right?$tr$, $tr$["To know the price and quality", "No rights", "To just accept everything", "To pay too much"]$tr$::jsonb, $tr$Consumer Rights and Responsibilities$tr$),
('b656ef61-7391-4d34-a458-6e9b7cfbc85c', $tr$What concept you learned before is used here?$tr$, $tr$["Verse and chorus", "Statistics", "Probability", "Story outline"]$tr$::jsonb, $tr$Writing Your Own Simple Song$tr$),
('b73d6928-21ed-49eb-a995-e8133f6a953f', $tr$Why is it important to know the effects of gateway drugs at a young age?$tr$, $tr$["Because a child's growing body and brain are harmed more quickly", "It has no effect on children", "It is safe as long as it is not every day", "It is not a real danger"]$tr$::jsonb, $tr$Effects of Gateway Drugs$tr$),
('b7635dd7-7ad9-43c5-b5b3-3ca3ca657a0b', $tr$What is dance exercise?$tr$, $tr$["Exercise that uses dance steps", "Just a kind of game", "A kind of food", "A punctuation mark"]$tr$::jsonb, $tr$Dance Exercise$tr$),
('b796d99a-4bf0-4c1a-9700-4129e523cfef', $tr$Why teach it to kids?$tr$, $tr$["To pass on our culture to the next generation", "No need to teach it", "Only for adults", "No effect"]$tr$::jsonb, $tr$Traditional/National Dances$tr$),
('b7fa9aef-a8aa-4015-b019-4182e3849f21', $tr$Why is dance exercise taught?$tr$, $tr$["To build physical health", "No purpose", "Only for adults", "Not related to PE"]$tr$::jsonb, $tr$Dance Exercise$tr$),
('b7ffcbe3-9b7f-4571-a2bf-07ac4e66df33', $tr$What is the verse of a song?$tr$, $tr$["The part where the words change each time", "The part where the words are always the same", "The part with no words", "The part where only a drum plays"]$tr$::jsonb, $tr$Musical Form: Verse and Chorus$tr$),
('b819df5f-dd4e-449b-b0af-a4ece31f4de4', $tr$One way to avoid gateway drugs?$tr$, $tr$["Say 'No' with confidence", "Try it just once", "Follow a friend who uses it", "Hide it from your parents"]$tr$::jsonb, $tr$Effects of Gateway Drugs$tr$),
('b939c5bf-a843-43fc-8216-ca87011e0d8e', $tr$How is movement exploration different from a traditional dance?$tr$, $tr$["It is freer, trying new moves instead of set steps", "They are just the same", "There is no difference", "Movement exploration always has specific steps"]$tr$::jsonb, $tr$Dance Exercise and Movement Exploration$tr$),
('b98e8a39-b41a-4d03-a089-c666a4506bfd', $tr$Why is dance practice important in PE?$tr$, $tr$["It builds skills and coordination", "No benefit", "It weakens the body", "It is not part of PE"]$tr$::jsonb, $tr$Social Dance Mixers in 3/4 Time$tr$),
('baa54a92-1ec3-439d-9a03-7ad47eddbf97', $tr$What is fielding?$tr$, $tr$["Catching or getting the ball back after it is hit", "Starting the game at the net", "Running to a base", "Sending the ball into the air"]$tr$::jsonb, $tr$Striking/Fielding and Net/Wall Games (Term 2, Week 1)$tr$),
('bb4d8d65-1fcd-49a0-8fdc-6264725a1b8e', $tr$How can you clap a rhythmic pattern correctly?$tr$, $tr$["Listen first before repeating it", "Just clap any way you like", "Read the song lyrics", "Buy a new instrument"]$tr$::jsonb, $tr$Music: Rhythm and Tempo$tr$),
('bb9ad003-7736-44fc-983f-e63a26985cb3', $tr$What did we learn about Filipino games in PE?$tr$, $tr$["They build physical skills while we value our culture", "We learned nothing about it in this activity", "They are just a kind of fun with no value here", "They are never part of MAPEH at all"]$tr$::jsonb, $tr$Term Review: Music, Arts, and PE$tr$),
('bbbf973f-eb25-4eaa-a300-081e6679de02', $tr$What is the step in the Sinulog?$tr$, $tr$["Two steps forward, one step back", "Only one step back", "No steps are done here", "Only three steps forward"]$tr$::jsonb, $tr$Arts: Rhythm and Movement in Indigenous Rituals$tr$),
('bbf7dc9a-7010-498d-a4e2-eaafbfdcb26e', $tr$What should you do if it is hard to find a melody?$tr$, $tr$["Try a simple voice or clapping first", "Just give up", "Forget the whole project", "Copy someone else's song without changing it"]$tr$::jsonb, $tr$Writing Your Own Simple Song$tr$),
('bcd0064e-c5cc-4eac-a63f-9e25ff0b1626', $tr$Why is melody considered important in a song?$tr$, $tr$["It is the part that is easy to sing and remember", "It is not important", "It is the only part with no sound", "Only instruments use it"]$tr$::jsonb, $tr$Melody and Healthy Eating$tr$),
('bcd2b1c2-e646-4928-865f-8a4bbd4e743a', $tr$What was secretly expressed through the dances of this period?$tr$, $tr$["Love for the country", "Only sadness", "Only happiness", "It has no meaning"]$tr$::jsonb, $tr$Symbolic Theater and Seditious Plays$tr$),
('bcfbaab0-9422-4f54-b2a5-2b6e9dad3aec', $tr$First step in getting ready for a performance?$tr$, $tr$["Decide how many members", "Perform right away", "Forget the steps", "Leave the group"]$tr$::jsonb, $tr$Culminating Dance Performance$tr$),
('bd2b8fd1-0b3e-4fa3-b465-3448c6bb47ab', $tr$Why is self-confidence important in dancing?$tr$, $tr$["It helps you perform the choreography", "It is not important", "It is not needed", "It only gets in the way"]$tr$::jsonb, $tr$Combining 2/4 and 3/4 Time$tr$),
('bdcf4e07-18a4-414d-9f14-31aadc2724f1', $tr$What is the goal of reflecting after doing the activity?$tr$, $tr$["To strengthen what you learned from the experience", "To forget what you learned right away", "To close the topic without thinking", "To make a new activity right away"]$tr$::jsonb, $tr$Doing Our Family Wellness Activity$tr$),
('bf2a2bb6-81cc-4161-8dfd-2154382ba849', $tr$Why is coordination needed in these games?$tr$, $tr$["So your body movements work together correctly in the game", "So you can just stay seated on the side", "So you no longer need to move", "Coordination has nothing to do with the game"]$tr$::jsonb, $tr$Striking/Fielding and Net/Wall Games$tr$),
('bf42c88b-fb6c-456a-910f-4f9d343ea04b', $tr$Why is it important to keep traditional dances alive?$tr$, $tr$["They are part of our national identity", "They are not important", "They are no longer needed today", "They are not part of culture"]$tr$::jsonb, $tr$Term Review: Arts, Culture, and Health$tr$),
('bf50ee08-12b5-447a-b455-eece85a8b606', $tr$How is it connected to the dance exercise we learned before?$tr$, $tr$["Both use movement and music", "No connection", "One is about science", "One is about math"]$tr$::jsonb, $tr$Local and Regional Street Dances$tr$),
('bfabbc74-8a91-4509-84df-d133436a959c', $tr$What is the consumer's right to choose?$tr$, $tr$["To choose what you want to buy", "They have no right to choose", "They must buy only one product", "It is not a right"]$tr$::jsonb, $tr$Consumer Rights and Responsibilities$tr$),
('bfd654a3-6bf2-4f26-8170-63ad64f67b34', $tr$What do we call the time when a child goes through physical, emotional, and social changes on the way to becoming a teenager?$tr$, $tr$["A normal part of growing up", "An illness that needs treatment", "Something to be ashamed of", "Something to hide from everyone"]$tr$::jsonb, $tr$Art, Feelings, and Changes in Myself$tr$),
('bfdebfdb-4183-4790-b163-63bedf2250e6', $tr$What skills does this performance prove?$tr$, $tr$["Coordination and teamwork", "Writing skills", "Math skills", "Cooking skills"]$tr$::jsonb, $tr$Culminating Dance Performance$tr$),
('bfec8622-0096-462b-b1c0-2f717a3ae313', $tr$What is a beat?$tr$, $tr$["The steady pulse of music", "A slow song", "A musical instrument", "The title of a song"]$tr$::jsonb, $tr$Music: Rhythm and Tempo$tr$),
('c008b1a1-82a2-48a4-90f1-5c7e54daa8c5', $tr$Why are legends turned into artworks?$tr$, $tr$["It is another way to appreciate the story", "There is no reason", "You don't need to read it", "It is harder to understand"]$tr$::jsonb, $tr$Legend Theater and Dance; Health Rights$tr$),
('c02bc544-4fc4-4fe5-b446-136cc503eca6', $tr$Why do dance exercise?$tr$, $tr$["It is fun and keeps you active", "Not important", "Not real exercise", "It makes you weaker"]$tr$::jsonb, $tr$Dance Exercise$tr$),
('c08d9127-8bd2-495e-a3d7-fbcfa6f3ba37', $tr$What do you do when the signal is given in a social dance mixer?$tr$, $tr$["Move to the next partner", "Stop and sit down", "Leave the room", "Start a different game"]$tr$::jsonb, $tr$Social Dance Mixers$tr$),
('c1751546-3196-4b20-a37c-0f2f3c8346f7', $tr$What is a pattern?$tr$, $tr$["A design that repeats regularly", "A single color", "Just one dot", "Just one line"]$tr$::jsonb, $tr$Visual Arts: Rhythm and Pattern$tr$),
('c19fa154-1ed0-4a93-997e-e085d641830d', $tr$Why is this dance called a 'mixer'?$tr$, $tr$["Because the dancers keep switching partners", "Because food is mixed in it", "Because no partners are used", "Because only one person dances"]$tr$::jsonb, $tr$Social Dance Mixers$tr$),
('c1a25472-cb8d-4a74-bbca-fdf341e0a5ae', $tr$What equipment is used in the Pandanggo sa Ilaw?$tr$, $tr$["Oil lamps on the hands and head", "Only bamboo poles", "Only an umbrella", "No equipment"]$tr$::jsonb, $tr$Traditional/National Dances$tr$),
('c1e334a5-db01-4683-92d1-dea4b978e122', $tr$What is an example of a wellness activity we studied?$tr$, $tr$["A dance-for-health session with visual art", "A math exam", "A letter to write to parents", "A farming activity"]$tr$::jsonb, $tr$Combining Dance, Health, and Art$tr$),
('c1eb71d2-eec6-473d-bdf5-7876ad465fe5', $tr$If you want to show the main message of your own song, which part would you repeat again and again?$tr$, $tr$["Chorus", "Verse", "Only the introduction", "No part"]$tr$::jsonb, $tr$Musical Form: Verse and Chorus$tr$),
('c20b1cba-335f-4258-a541-edc3dab07b19', $tr$Which is an example of European influence on dance?$tr$, $tr$["More formal steps, like dancing in pairs", "Just free movement", "No structure at all", "Only native movements"]$tr$::jsonb, $tr$Theater and Dance in the Early Spanish Colonial Period$tr$),
('c22fdde1-5e73-44a8-8558-fe52f1bfc8cd', $tr$Why is using medicine the right way important?$tr$, $tr$["To avoid misuse", "It is not important", "Medicine is always safe", "A dose is not needed"]$tr$::jsonb, $tr$Term 2 Review: Music, Arts, PE, and Health$tr$),
('c27209b4-cc62-4b3c-b91b-ef9185a77143', $tr$Where do the dancers usually stand before starting?$tr$, $tr$["In a circle or line with a partner", "Sitting on the floor", "Hiding at the back of the room", "With their backs to each other"]$tr$::jsonb, $tr$Social Dance Mixers$tr$),
('c3339fc0-0c1b-4545-9344-43305cca820a', $tr$What is contemporary art?$tr$, $tr$["Modern artwork that shows today's experiences", "Only art from other countries", "A kind of game", "A punctuation mark"]$tr$::jsonb, $tr$My Filipino Identity$tr$),
('c35240aa-d5e9-4326-9797-8415cebedabb', $tr$What does 'Recycle' mean in the 8Rs?$tr$, $tr$["Making new things from old materials", "Throwing garbage away right away", "Burning garbage", "Hiding garbage forever"]$tr$::jsonb, $tr$Environmental Health (One Health)$tr$),
('c3820307-68dd-48b6-87d5-fb77dd265209', $tr$What period of music and art did we study earlier?$tr$, $tr$["Early Spanish Colonial Period", "American period", "Japanese period", "Present day"]$tr$::jsonb, $tr$Combining Dance, Health, and Art$tr$),
('c3c52d47-5210-4376-975b-6d6a4eb4b97c', $tr$Why does the melody not need to be perfect?$tr$, $tr$["What matters is sharing your idea", "It must always be perfect", "A melody is not needed anymore", "It is not important"]$tr$::jsonb, $tr$Writing Your Own Simple Song$tr$),
('c3ef0820-30c2-4a34-8561-0adfffa4635e', $tr$Why are festivals important to identity?$tr$, $tr$["They show the unique culture of each region", "No connection", "Only borrowed from other countries", "Not part of culture"]$tr$::jsonb, $tr$Local and Regional Street Dances$tr$),
('c4746f2a-f4be-4605-bd74-3fa5812319ea', $tr$What happens in a social dance mixer?$tr$, $tr$["You keep changing partners", "You stay with one partner", "There are no partners", "You just sit"]$tr$::jsonb, $tr$Social Dance Mixers in 3/4 Time$tr$),
('c4a2027a-4668-481d-aabf-3903864b715b', $tr$How is it different from a traditional dance?$tr$, $tr$["It is freer than set steps", "They are just the same", "There is no difference", "It always has specific steps"]$tr$::jsonb, $tr$Dance Exercise and Movement Exploration$tr$),
('c4d8f595-492d-4ce9-8fdf-9c810cc3d94c', $tr$Which group has vegetables and fruits?$tr$, $tr$["Vitamins and minerals", "Carbohydrates only", "Protein only", "Fat only"]$tr$::jsonb, $tr$Melody and Healthy Eating$tr$),
('c4f89266-a490-4efd-8b7f-232e328f3d53', $tr$What is a physical benefit of dance exercise?$tr$, $tr$["A stronger body and better coordination", "No benefit", "It weakens you", "It stops movement"]$tr$::jsonb, $tr$Dance Exercise and Movement Exploration$tr$),
('c617533d-b512-4853-8ba0-52a8255ae7fa', $tr$How many beats are in each measure of 3/4 time?$tr$, $tr$["Three", "Two", "Four", "One"]$tr$::jsonb, $tr$Social Dance Mixers in 3/4 Time$tr$),
('c6c66d87-994f-4e0b-a3ee-4b35600cba08', $tr$Why is it important to modify these games for the family?$tr$, $tr$["So people of all ages can play and stay healthy", "To make them harder for everyone to play", "There is no reason for it", "So kids are not allowed to play"]$tr$::jsonb, $tr$Striking/Fielding and Net/Wall Games$tr$),
('c8a6cc23-16cd-4bf8-971d-ee43d4a3b393', $tr$What skills does the performance prove?$tr$, $tr$["Coordination and teamwork", "Writing", "Math", "Cooking"]$tr$::jsonb, $tr$Culminating Dance Performance$tr$),
('c8b9ac53-ff8d-4ebf-901e-d21bed519978', $tr$How many people are recommended in a group?$tr$, $tr$["4-6 people", "Only 1 person", "20 people", "No set number"]$tr$::jsonb, $tr$Culminating Dance Performance$tr$),
('c8d775d0-4069-4f8e-a1d3-6c3c7b25aac4', $tr$What ideas did we learn in PE — Invasion Games?$tr$, $tr$["Agility, balance, and coordination", "History only", "Math only", "We learned nothing"]$tr$::jsonb, $tr$Term Review: Music, Arts, and PE$tr$),
('c8fb7470-0a54-4c14-8737-573d91a46e8e', $tr$What part of the body is mainly used?$tr$, $tr$["The whole body", "Only the hands", "Only the eyes", "None, just watching"]$tr$::jsonb, $tr$Social Dance Mixers$tr$),
('c943bf4a-489f-4bc9-a3cd-6a5673f54f25', $tr$In Patintero, what does a player do?$tr$, $tr$["Crosses the lines without getting tagged", "Throws a ball at the other team", "Runs away from the play area", "Sits in the middle of the line"]$tr$::jsonb, $tr$Rhythm, Family Health, and Invasion Games$tr$),
('cbb85b7a-8482-4817-a594-932c44fb67e5', $tr$What do you do in a social dance mixer?$tr$, $tr$["You keep changing partners", "You stay with only one partner", "No partners are used", "You just sit"]$tr$::jsonb, $tr$Social Dance Mixers in 3/4 Time$tr$),
('cc295f7a-a90d-4868-913f-85a0c94605f2', $tr$What happens when traditional and modern moves are combined in a dance?$tr$, $tr$["A unique style that shows both the past and the present", "Nothing happens", "It is only confusing", "It makes traditions disappear"]$tr$::jsonb, $tr$My Filipino Identity$tr$),
('cc8965a0-7d3f-479e-9e04-6407bf6a7ea8', $tr$What is movement exploration?$tr$, $tr$["Trying out different body movements", "A type of food", "A type of song", "A type of toy"]$tr$::jsonb, $tr$Dance Exercise and Movement Exploration$tr$),
('ccbd5a00-a713-4535-b8f8-bc3e37caffaa', $tr$What equipment is used in the Pandanggo sa Ilaw?$tr$, $tr$["Oil lamps on the hands and head", "Only bamboo poles", "Only an umbrella", "No equipment"]$tr$::jsonb, $tr$Traditional/National Dances$tr$),
('cd12584e-b726-4c30-88fe-9de4084cc672', $tr$How does the term show the balance between health and culture?$tr$, $tr$["It brings together physical health and the arts", "Only one is important", "No connection", "Not a real theme"]$tr$::jsonb, $tr$Term Review: Arts, Culture, and Health$tr$),
('cd986238-75fc-43c4-9d80-42a8eaad478b', $tr$What is a rhythmic pattern?$tr$, $tr$["A mix of long and short sounds", "Just one instrument here", "Only the singer's name", "Only a type of dance here"]$tr$::jsonb, $tr$Music: Rhythm and Tempo$tr$),
('cd9dfb69-156c-4564-81be-87ba2994e0a1', $tr$Which of the following is an EXAMPLE of using medicine the right way?$tr$, $tr$["Taking it as the doctor prescribed at the right time", "Taking an extra dose to get better faster", "Taking your brother's or sister's medicine", "Taking it without reading the label"]$tr$::jsonb, $tr$Proper Medicine Use vs. Misuse$tr$),
('cdae2421-c361-441c-9682-c0e4997df465', $tr$Why learn to value your rights?$tr$, $tr$["To know when to ask for help", "You don't need to know", "It is only for adults", "It has no effect"]$tr$::jsonb, $tr$Legend Theater and Dance; Health Rights$tr$),
('cdc5713a-5d10-459b-9ed4-5055f490438c', $tr$Why is teamwork in the group important in this activity?$tr$, $tr$["All group members need to move together", "Each person works separately", "No teamwork is needed", "Only one person dances"]$tr$::jsonb, $tr$Culminating Dance Performance$tr$),
('cde543e7-f21e-4f1c-9923-fa1b72817901', $tr$Why were pictures used as 'books' for people back then?$tr$, $tr$["Most people could not read", "They had no paper at that time", "Pictures were cheaper than books", "Pictures were faster to make"]$tr$::jsonb, $tr$Music and Arts in the Early Spanish Colonial Period$tr$),
('ce27ac98-2535-4469-9c33-71ebe8b2c901', $tr$What does alcohol do to the body?$tr$, $tr$["It affects the brain and thinking", "It makes memory stronger", "It has no effect on the mind", "It improves eyesight"]$tr$::jsonb, $tr$Effects of Gateway Drugs$tr$),
('ce2e79ce-72b8-436a-8d04-523012e6fb00', $tr$Why is each region's dance unique?$tr$, $tr$["It shows the unique history of the place", "They are all alike", "There is no difference", "It is just random"]$tr$::jsonb, $tr$Traditional/National Dances$tr$),
('ce574f9e-6885-4ed6-87b4-a41a6d478359', $tr$Why is it important to show what you learned all term?$tr$, $tr$["It shows how your dance skills have grown", "It is not important", "You don't need to show it", "As long as the term is over"]$tr$::jsonb, $tr$Combining 2/4 and 3/4 Time$tr$),
('ce686808-7811-4d58-8050-854c84dd11b7', $tr$What is a chorus like?$tr$, $tr$["Repeated and easy to remember", "Different every time", "Without a melody", "Long and complicated"]$tr$::jsonb, $tr$Writing Your Own Simple Song$tr$),
('cea665a0-3d44-4077-8fc9-87e8e1b59355', $tr$What were plays about during this period?$tr$, $tr$["Religious topics", "Political topics", "Science topics", "Business topics"]$tr$::jsonb, $tr$Music and Arts in the Early Spanish Colonial Period$tr$),
('cefcc3fc-4549-49f1-9fd6-b263f9fc56d2', $tr$How is 3/4 time different from 2/4 time in the number of beats?$tr$, $tr$["Three beats in 3/4, two beats in 2/4", "They are just the same", "There is no difference", "Two beats in 3/4"]$tr$::jsonb, $tr$Social Dance Mixers in 3/4 Time$tr$),
('cf23f42a-e39d-44b5-81e3-f38aa7d40953', $tr$How is dance exercise connected to physical health?$tr$, $tr$["Both help the body's physical health", "There is no connection", "Dance exercise is only about music", "It has no effect on health"]$tr$::jsonb, $tr$Dance Exercise and Movement Exploration$tr$),
('cfd5a3f3-f0e8-4aae-bf04-68165ee4b162', $tr$Why teach the basics before harder dances?$tr$, $tr$["A strong foundation", "There is no reason", "Basics are not needed", "Any dance can be done right away"]$tr$::jsonb, $tr$Fundamental Dance Steps in 2/4 Time$tr$),
('d017af93-c9ff-4db5-81cd-728b4c3eafa6', $tr$What is the goal of playing Filipino games in PE?$tr$, $tr$["To build physical skills while valuing our culture", "Just to play with no real goal", "This activity has no real goal", "Just to finish the whole class quickly"]$tr$::jsonb, $tr$Term Review: Music, Arts, and PE$tr$),
('d0afa27f-018e-4dca-98ab-3a2525a96516', $tr$What is binary form in music?$tr$, $tr$["Two parts (A-B)", "Only one part", "Three parts", "No form"]$tr$::jsonb, $tr$Music and Arts in the Early Spanish Colonial Period$tr$),
('d1233953-0169-4dd7-8416-90a922d90604', $tr$What is musical form?$tr$, $tr$["How the parts of a song are arranged", "How wide the singer's voice range is", "The number of instruments", "Only the sound of a guitar"]$tr$::jsonb, $tr$Musical Form: Verse and Chorus$tr$),
('d12596f2-eb80-4dc5-aec1-22cb83f18798', $tr$Why is PE dance included in MAPEH?$tr$, $tr$["It builds health and the arts", "There is no purpose", "It is not related to education", "It is only for adults"]$tr$::jsonb, $tr$Fundamental Dance Steps in 2/4 Time$tr$),
('d18ae178-e12b-4591-b56b-d9319d1d75d7', $tr$What is the resolution?$tr$, $tr$["Solving the problem", "The start of the problem", "Introducing the characters", "The highest tension"]$tr$::jsonb, $tr$Symbolic Theater and Seditious Plays$tr$),
('d205cc44-cd42-4dc8-bf10-a2c8103b6518', $tr$What should you do if you feel pressured to use something that is not allowed?$tr$, $tr$["Ask a parent or teacher for help", "Just go along with it", "Hide it from everyone", "Do it secretly"]$tr$::jsonb, $tr$Effects of Gateway Drugs$tr$),
('d20ba1d6-92e2-4b0f-ba26-4bc1bc9767dd', $tr$Why teach food literacy?$tr$, $tr$["To learn to choose healthy food", "There is no purpose", "It is not related to health", "It is only for adults"]$tr$::jsonb, $tr$Melody and Healthy Eating$tr$),
('d213a974-5a67-451f-907d-35af63c90505', $tr$Why is coordination important in dance steps?$tr$, $tr$["Smooth moves that stay together", "It is not important", "It is not needed", "Any movement is correct"]$tr$::jsonb, $tr$Fundamental Dance Steps in 2/4 Time$tr$),
('d272da03-e527-43bd-ac5a-7c144f5fdd34', $tr$Which two tempos were combined?$tr$, $tr$["2/4 and 3/4 time", "4/4 and 6/8 time", "1/4 and 5/4 time", "None"]$tr$::jsonb, $tr$Combining 2/4 and 3/4 Time$tr$),
('d31b2e27-d66b-4ef6-911b-4cfbe0c027e2', $tr$What is the goal of movement exploration?$tr$, $tr$["To discover what the body can do", "Only to make your voice stronger", "To learn math", "To learn writing"]$tr$::jsonb, $tr$Dance Exercise and Movement Exploration$tr$),
('d406233f-52a8-425d-8ea1-3cc018eea9b1', $tr$Who perform the Singkil?$tr$, $tr$["The Maranao", "The Ilocano", "The Visayans", "The Tagalog"]$tr$::jsonb, $tr$Traditional/National Dances$tr$),
('d62b1339-8b40-45c6-b4e9-769ea6019e2e', $tr$What does 'Recycle' mean?$tr$, $tr$["New things from old materials", "Throwing away right away", "Burning garbage", "Hiding forever"]$tr$::jsonb, $tr$Environmental Health (One Health)$tr$),
('d634d8c4-29a9-42e2-9559-4f40516c46e8', $tr$What is the 4/4 time signature called?$tr$, $tr$["Common Time", "Waltz Time", "Free Time", "Simple Time"]$tr$::jsonb, $tr$Music: Meter, Time Signatures, and Rhythmic Dance Patterns$tr$),
('d645caf3-0c42-4670-b96b-2a5d03b79286', $tr$What does a repeating pattern in a traditional weave show?$tr$, $tr$["The skill of our ancestors", "A lack of talent", "Just a random design", "It has no meaning"]$tr$::jsonb, $tr$Visual Arts: Rhythm and Pattern$tr$),
('d69ae645-be1c-4c5b-a638-46944822ca77', $tr$Who is honored in the Sinulog?$tr$, $tr$["Santo Niño", "Ina ng Kalamba (Our Lady of Kalamba)", "Rizal", "Bonifacio"]$tr$::jsonb, $tr$Local and Regional Street Dances$tr$),
('d69e197a-91ec-4e7b-8cdd-6e38497665bf', $tr$Which idea that we learned helps us move quickly?$tr$, $tr$["Agility", "Hardship", "Sadness", "Carelessness"]$tr$::jsonb, $tr$Planning Family Health Activities$tr$),
('d6d9cb1f-9176-4df7-8349-14612e12a458', $tr$Why is it important to study all of MAPEH — music, arts, and PE?$tr$, $tr$["It helps us understand how art, health, and culture are connected", "We should really study only one of them", "It has no real meaning in our whole life", "It is only done as a kind of entertainment"]$tr$::jsonb, $tr$Term Review: Music, Arts, and PE$tr$),
('d725abbd-a705-4080-891b-04234bad57ae', $tr$What does a vaccine do?$tr$, $tr$["It builds immunity", "It causes disease", "It has no effect", "It weakens the immune system"]$tr$::jsonb, $tr$Health: Common Infectious Diseases$tr$),
('d733179b-865d-4d77-8bc7-78b4159f5c9a', $tr$Who should prescribe or recommend medicine?$tr$, $tr$["A doctor or parent", "Only a friend", "Anyone at school", "No permission is needed"]$tr$::jsonb, $tr$Proper Medicine Use vs. Misuse$tr$),
('d7e475a2-d4d7-4200-8137-69c675b713ec', $tr$Why check the expiry date?$tr$, $tr$["To make sure it is safe to use", "It has no importance", "It does not matter", "It's fine even if expired"]$tr$::jsonb, $tr$Consumer Rights and Responsibilities$tr$),
('d822a836-c887-476b-aa97-4aefee111abb', $tr$Skills in the culminating dance performance?$tr$, $tr$["Coordination and teamwork", "Writing", "Math", "Cooking"]$tr$::jsonb, $tr$Term 2 Review: Music, Arts, PE, and Health$tr$),
('d887d236-d5eb-4553-927c-2519f5751baa', $tr$Why is teamwork in the group important here?$tr$, $tr$["Everyone needs to move together", "Each person works separately", "Nothing is needed", "Only one person dances"]$tr$::jsonb, $tr$Culminating Dance Performance$tr$),
('d8c8fd57-3d38-492e-bba6-9a44b03199d9', $tr$Why is it important to practice what we learned about health and cleanliness?$tr$, $tr$["It helps us live in a healthy and responsible way", "It means nothing in life today", "It is only done for grades", "It is not really important in this activity"]$tr$::jsonb, $tr$Term Review: Music, Arts, and PE$tr$),
('d91054be-2c77-4b54-8dc2-e5fe87a33ef0', $tr$What does combining two tempos in one performance show?$tr$, $tr$["It shows versatility and dance skill", "It brings nothing", "It is only confusing", "It is not possible"]$tr$::jsonb, $tr$Combining 2/4 and 3/4 Time$tr$),
('d9217881-fa6e-405c-a60c-80e4637ae14e', $tr$What is self-esteem?$tr$, $tr$["Seeing yourself in a positive way", "Always doubting yourself", "Always following your friends", "Not valuing yourself"]$tr$::jsonb, $tr$Art, Feelings, and Changes in Myself$tr$),
('d945f810-7625-40c7-b866-8739211b0cac', $tr$Why is dance a good way to exercise for your health?$tr$, $tr$["It builds cardiovascular endurance while being fun", "It has no health benefits", "It only makes the body weaker", "It is only done for fun"]$tr$::jsonb, $tr$Combining Dance, Health, and Art$tr$),
('d9506699-3299-41b2-9f0f-814967a58622', $tr$Why is each traditional dance from different regions unique?$tr$, $tr$["It shows the unique history and culture of each place", "All the dances are just the same", "There is no difference between regions", "The differences are just random"]$tr$::jsonb, $tr$Traditional/National Dances$tr$),
('d98b233f-2f59-4520-84ed-32d49927a1bd', $tr$Why is it important to keep our roots in tradition while art keeps growing?$tr$, $tr$["It gives us an identity in the middle of change", "It is not important", "We should forget traditions", "Roots are no longer needed"]$tr$::jsonb, $tr$My Filipino Identity$tr$),
('da0d2244-0033-4133-8685-2e7881162c5a', $tr$What is the waltz like?$tr$, $tr$["Gentle, three beats per measure", "Very fast, two beats", "No music", "Only one beat"]$tr$::jsonb, $tr$Social Dance Mixers in 3/4 Time$tr$),
('dab13057-a378-4746-9290-31322f241641', $tr$What did we learn about family wellness this term?$tr$, $tr$["Planning and doing health activities for the family", "We learned nothing about it", "Just a kind of game in this activity", "Just a kind of food today"]$tr$::jsonb, $tr$Term Review: Music, Arts, and PE$tr$),
('dab2598b-4331-44a6-9b77-1efa0a0cda90', $tr$What is important to do before playing striking/fielding or net/wall games?$tr$, $tr$["Warm up", "Eat a heavy meal", "Sleep deeply", "Drink cold water right away"]$tr$::jsonb, $tr$Striking/Fielding and Net/Wall Games (Term 2, Week 1)$tr$),
('db375cf8-5689-46c5-a2d9-f6f38a5b329a', $tr$Why is medicine considered safe when it is used correctly?$tr$, $tr$["Because it is used with the right dose and for the right reason", "Because all medicine is safe no matter how it is used", "Because medicine has no effect", "Because medicine does not need to be watched"]$tr$::jsonb, $tr$Proper Medicine Use vs. Misuse$tr$),
('db5a2bca-7718-43f9-bb94-a87c5701ead5', $tr$What is tempo?$tr$, $tr$["How fast or slow the music is", "How loud the sound is", "The number of singers", "The type of instrument"]$tr$::jsonb, $tr$Music: Rhythm and Tempo$tr$),
('db784f9f-c47c-405a-b6cd-e91151ada8d3', $tr$What new PE unit started this week?$tr$, $tr$["Dance Exercise", "Sports Officiating", "Weightlifting", "Swimming"]$tr$::jsonb, $tr$Dance Exercise$tr$),
('dbf2c123-f4e1-4245-9159-fca9249e2762', $tr$How can art be connected to a health campaign?$tr$, $tr$["By making visual materials about health", "By avoiding all art activities", "Art has no connection to health", "By stopping all exercise"]$tr$::jsonb, $tr$Combining Dance, Health, and Art$tr$),
('dc27017a-066f-4d27-99d6-a61aa329f1ce', $tr$Which is an example of an activity that improves family health?$tr$, $tr$["Gardening together", "Watching television alone", "Avoiding all family members", "Sleeping all day"]$tr$::jsonb, $tr$Rhythm, Family Health, and Invasion Games$tr$),
('dc80ec0a-9d9f-420b-b864-17f0b5ca38e5', $tr$What is a verse like?$tr$, $tr$["It tells a story and changes each time", "Always the same", "No words", "Only an instrument"]$tr$::jsonb, $tr$Writing Your Own Simple Song$tr$),
('dd5a207d-5d82-4165-a593-83daf42cb624', $tr$What should you keep in mind while doing the activity?$tr$, $tr$["The safety of everyone taking part", "Only the price of the materials", "Only the time it ends", "Nothing, there is nothing to think about"]$tr$::jsonb, $tr$Doing Our Family Wellness Activity$tr$),
('ddd9e110-7117-4df0-a62e-8aa7242953f3', $tr$Why teach traditional dances in MAPEH?$tr$, $tr$["To value and keep our culture alive", "No purpose", "Only for adults", "Not related to education"]$tr$::jsonb, $tr$Traditional/National Dances$tr$),
('de8bb525-6c82-4cfb-b865-5aa02980a210', $tr$How does it help with coordination?$tr$, $tr$["You keep up with the steps and tempo", "No coordination needed", "No connection", "You just stand there"]$tr$::jsonb, $tr$Dance Exercise$tr$),
('df3dacf2-002b-4f5e-92f4-d335c8cc32d3', $tr$Why is movement exploration taught in PE?$tr$, $tr$["To help kids trust their own bodies", "It has no purpose", "Only to entertain the teacher", "It is not part of the curriculum"]$tr$::jsonb, $tr$Dance Exercise and Movement Exploration$tr$),
('e03360f2-4012-4750-9e16-0812febe4682', $tr$What idea did rhythm and tempo show in music?$tr$, $tr$["The speed and pattern of sound", "The price of an instrument", "The color of clothes", "The size of the stage"]$tr$::jsonb, $tr$Term Review: Music, Arts, and PE$tr$),
('e08c7824-745d-4fa7-a466-ac9b7c6d443d', $tr$What part of the body is mainly used in the dance?$tr$, $tr$["The whole body in the steps and movements", "Only the hands", "Only the eyes", "None, just watching"]$tr$::jsonb, $tr$Social Dance Mixers$tr$),
('e09d489a-c4b6-4bb0-9517-4e810941e4ef', $tr$Why is valuing culture important in MAPEH?$tr$, $tr$["To keep the Filipino identity alive", "No connection", "A separate topic", "Not part of education"]$tr$::jsonb, $tr$Term Review: Arts, Culture, and Health$tr$),
('e14204e2-255e-488a-ac19-4b8e04b7c385', $tr$What is a benefit of dance exercise?$tr$, $tr$["It improves coordination and balance", "No benefit", "It makes the body weaker", "It makes you tired"]$tr$::jsonb, $tr$Dance Exercise$tr$),
('e18fb297-047e-4b12-bf67-c62ab337f58e', $tr$Why keep our roots in tradition?$tr$, $tr$["It gives us an identity in the middle of change", "Not important", "Forget traditions", "Roots are not needed"]$tr$::jsonb, $tr$My Filipino Identity$tr$),
('e195a473-a0fa-42b9-8d12-fca32af86a98', $tr$What is a seditious play?$tr$, $tr$["A play that secretly speaks out against foreign rule", "A play only about love", "Only a comedy play", "A play with no link to history"]$tr$::jsonb, $tr$Symbolic Theater and Seditious Plays$tr$),
('e1b048da-3607-4c5c-9988-a6d62298bd04', $tr$What is the first part of the chain of infection?$tr$, $tr$["The source of the disease", "A new host body", "Vaccine", "Way of entry"]$tr$::jsonb, $tr$Health: Common Infectious Diseases$tr$),
('e1d6431d-ec39-454a-bef4-542b6efe29b5', $tr$Why is coordination important when doing dance steps?$tr$, $tr$["So the moves are smooth and together", "It is not important", "Coordination is not needed", "Any movement is fine"]$tr$::jsonb, $tr$Fundamental Dance Steps in 2/4 Time$tr$),
('e2088404-d74d-41f8-af4d-031691933a64', $tr$Why is it important to review what we learned in MAPEH this term?$tr$, $tr$["It helps us remember and connect ideas", "It has no meaning for our learning", "It is only done to get a grade", "It only confuses a student"]$tr$::jsonb, $tr$Term Review: Music, Arts, and PE$tr$),
('e2495fc7-3eea-422c-9911-db3f3535dc26', $tr$Why is this week important for Term 2?$tr$, $tr$["Last week of Term 2", "Only the first week", "Not important", "Not part of Term 2"]$tr$::jsonb, $tr$Combining 2/4 and 3/4 Time$tr$),
('e28827a0-1d71-4fcc-8a8c-8999a7123ed5', $tr$A family holds a dance-for-health session every Saturday. What does this show?$tr$, $tr$["They value health and family bonding", "They are not interested in health", "They are careless about the activity", "Exercise does not matter"]$tr$::jsonb, $tr$Doing Our Family Wellness Activity$tr$),
('e2a4fde8-2757-4e12-8d01-3969c5c0b14a', $tr$Where is the Ati-Atihan held?$tr$, $tr$["Aklan", "Cebu", "Quezon", "Manila"]$tr$::jsonb, $tr$Arts: Rhythm and Movement in Indigenous Rituals$tr$),
('e2f668c5-516d-4b4a-81cc-7e13685d6d07', $tr$Why are indigenous rituals considered art?$tr$, $tr$["They use rhythm and movement", "They have no color or design", "They are only done randomly", "They do not show culture"]$tr$::jsonb, $tr$Arts: Rhythm and Movement in Indigenous Rituals$tr$),
('e3ca1f57-618b-457c-ab07-1366bbbf3496', $tr$Why is art used for identity?$tr$, $tr$["A creative way to show culture", "Not important", "Not related to identity", "Not related to culture"]$tr$::jsonb, $tr$My Filipino Identity$tr$),
('e40bd6a9-77a5-4a67-83f7-145cd6bc971a', $tr$Why is perceiving important in making art?$tr$, $tr$["It helps you show shape and light correctly", "It has no role at all in making art", "It is only used when selling the work", "It is not part of the art-making process"]$tr$::jsonb, $tr$Visual Arts in the Early Spanish Colonial Period$tr$),
('e41f2b49-7cc7-43b0-9dd1-7e1b9dbe9e36', $tr$Which is the gentler tempo?$tr$, $tr$["3/4 time", "2/4 time", "Both are the same", "There is no gentle tempo"]$tr$::jsonb, $tr$Combining 2/4 and 3/4 Time$tr$),
('e440efa8-7538-414a-80d4-7c2ab8e6ede6', $tr$What is a social dance mixer?$tr$, $tr$["A dance where the dancers keep switching partners", "A kind of song", "A PE game with no music", "A kind of drawing"]$tr$::jsonb, $tr$Social Dance Mixers$tr$),
('e4545ec5-30e3-45fc-a74e-80058a0357f7', $tr$What is agility?$tr$, $tr$["The ability to move quickly and change direction", "The ability to stay quiet", "The ability to eat quickly", "The ability to sleep deeply"]$tr$::jsonb, $tr$Striking/Fielding and Net/Wall Games$tr$),
('e5a14539-c670-4d06-8182-7ec19742ec52', $tr$How is it connected to environmental health?$tr$, $tr$["Both are about overall health", "No connection", "Both are only science", "Both are math"]$tr$::jsonb, $tr$Dance Exercise$tr$),
('e5f43fdd-0069-4761-980a-6ae34492fdf2', $tr$Why is immunity important?$tr$, $tr$["To fight off diseases", "Useless", "It causes disease", "Not a real idea"]$tr$::jsonb, $tr$Health: Common Infectious Diseases$tr$),
('e61e0916-5279-478d-b868-1fc68908be98', $tr$What is a family wellness day?$tr$, $tr$["A day of health activities for the whole family", "A day spent only shopping", "A day spent only sleeping", "A day spent watching TV"]$tr$::jsonb, $tr$Planning Family Health Activities$tr$),
('e659d3e4-78c7-4971-a152-a8f25d16c5d0', $tr$Why is water important in a balanced diet?$tr$, $tr$["The body needs water to work properly", "Water is not important", "Water is not part of what we eat and drink", "Water is bad for the body"]$tr$::jsonb, $tr$Melody and Healthy Eating$tr$),
('e6e20187-c3f2-4ef9-879d-c50e3c8cd6ee', $tr$Which part of a song tells a story with changing ideas?$tr$, $tr$["Verse", "Chorus", "Only the rhythm", "Only the dynamics"]$tr$::jsonb, $tr$Musical Form: Verse and Chorus$tr$),
('e74dbba7-a157-4a1e-9319-d0704cf82a4a', $tr$Why is it important to know the musical form of a song?$tr$, $tr$["It helps you understand how the song is arranged and its message", "It has nothing to do with understanding the song", "It is only used by professional musicians", "It is only for instruments"]$tr$::jsonb, $tr$Musical Form: Verse and Chorus$tr$),
('e77c616d-be8c-49cc-8810-b2766307b6ed', $tr$Why is preventing disease in the community an important topic?$tr$, $tr$["It helps protect everyone's health", "It has no effect on the community", "It is only a personal issue", "It is not related to community health"]$tr$::jsonb, $tr$Health: Common Infectious Diseases$tr$),
('e80514f2-b5f7-4c51-8083-bf51fe13bf13', $tr$What right does a consumer have?$tr$, $tr$["The right to know the real price and quality", "No rights", "The right to just accept everything", "The right to pay too much"]$tr$::jsonb, $tr$Consumer Rights and Responsibilities$tr$),
('e80fe894-35c7-47dc-9833-4641ff7e0493', $tr$What did we learn about art and rituals in our ancestors' time?$tr$, $tr$["Rhythm/pattern and movement seen in indigenous rituals", "Nothing was really learned about this", "Only a kind of outdoor game", "Only a kind of cooked food"]$tr$::jsonb, $tr$Term Review: Music, Arts, and PE$tr$),
('e8d6c029-274c-4ac7-bb6b-056629117cef', $tr$Who should prescribe medicine?$tr$, $tr$["A doctor or parent", "Only a friend", "Anyone", "No permission is needed"]$tr$::jsonb, $tr$Term 2 Review: Music, Arts, PE, and Health$tr$),
('e8da4e35-c48d-46cd-ab0b-1b53620dd766', $tr$What does mixing with others in a social dance mixer bring?$tr$, $tr$["Joy in connecting with different classmates", "Being alone", "Competition only", "No interest in others"]$tr$::jsonb, $tr$Social Dance Mixers in 3/4 Time$tr$),
('e908b782-9fdd-42cf-bc92-fb14c1a03265', $tr$Why is it important to know your rights and responsibilities as a consumer?$tr$, $tr$["It helps you be responsible and protected when shopping", "It is not important", "It is only for adults", "It has no effect"]$tr$::jsonb, $tr$Consumer Rights and Responsibilities$tr$),
('e98ce369-88c3-498c-8358-2ee4326d3f25', $tr$What will happen if a community has no proper sanitation?$tr$, $tr$["A higher risk of diseases spreading", "It has no effect", "Everyone becomes healthier", "Diseases disappear by themselves"]$tr$::jsonb, $tr$Environmental Health (One Health)$tr$),
('ea422324-c53d-41f4-89a6-b0356458d038', $tr$How is street dance connected to the dance exercise we learned before?$tr$, $tr$["Both use movement and music as part of dance", "The two have no connection", "One is only about science", "One is about math"]$tr$::jsonb, $tr$Local and Regional Street Dances$tr$),
('eabe5523-8384-43e7-9915-57b578f0e11d', $tr$What is the difference between drawing and painting?$tr$, $tr$["Drawing uses a pencil; painting uses color", "Both use only color", "Both use only a pencil", "There is no difference between them"]$tr$::jsonb, $tr$Visual Arts in the Early Spanish Colonial Period$tr$),
('eaf6eb6d-7aa2-4053-baa7-3227fcd3714d', $tr$How many beats are in 3/4 time?$tr$, $tr$["Three", "Two", "Four", "One"]$tr$::jsonb, $tr$Social Dance Mixers in 3/4 Time$tr$),
('ec005ff7-dd76-45e8-9acf-5c49fef74467', $tr$What can happen if you don't check the label before buying?$tr$, $tr$["You might buy the wrong or an unsuitable product", "Nothing happens", "The product is always right", "Shopping is just faster"]$tr$::jsonb, $tr$Consumer Rights and Responsibilities$tr$),
('ec2e576e-1f27-40ca-a33f-ef8fafe13c67', $tr$A softball player runs slowly to first base. What should the player do?$tr$, $tr$["Run as hard as possible", "Stop to rest", "Go back to the earlier position", "Wait for the next inning"]$tr$::jsonb, $tr$Striking/Fielding and Net/Wall Games (Term 2, Week 1)$tr$),
('ec42c565-2886-4919-a444-149a561e9c97', $tr$Why is it important to include the whole family in health activities?$tr$, $tr$["It makes family bonds stronger while improving health", "It is pointless if everyone is together", "It is better to do it alone", "The family is not needed in this activity"]$tr$::jsonb, $tr$Planning Family Health Activities$tr$),
('ec431893-e41c-4c14-a301-b94598934777', $tr$Which two tempos were combined this week?$tr$, $tr$["2/4 and 3/4 time", "4/4 and 6/8 time", "1/4 and 5/4 time", "No tempos were combined"]$tr$::jsonb, $tr$Combining 2/4 and 3/4 Time$tr$),
('ec635848-d2a3-45eb-a2b8-f17f1efde9d8', $tr$Why is teamwork as a group important?$tr$, $tr$["A smoother performance", "It is not important", "It is better to be alone", "It is not needed"]$tr$::jsonb, $tr$Combining 2/4 and 3/4 Time$tr$),
('ecd7d2cf-ce3b-48c3-9253-5f7566b5a048', $tr$What should you show while performing?$tr$, $tr$["Confidence and a smile", "Fear and doubt", "Anger at your groupmates", "No interest"]$tr$::jsonb, $tr$Culminating Dance Performance$tr$),
('ecfe8abc-7d61-41d9-84ba-2f64aed88430', $tr$What is the goal of the culminating dance performance?$tr$, $tr$["To show coordination and teamwork in the group", "To beat the other groups", "It has no goal", "Just to entertain the teacher"]$tr$::jsonb, $tr$Culminating Dance Performance$tr$),
('ede40cfe-e62e-4594-abdb-397afbb7b3a7', $tr$A student made a design using repeating circles of the same size and spacing. What did they use?$tr$, $tr$["Regular pattern", "Random pattern", "No design", "Just one line"]$tr$::jsonb, $tr$Visual Arts: Rhythm and Pattern$tr$),
('ee0fa37a-c2b6-44c8-bac0-3a7b17c4aa88', $tr$Why are the 8Rs taught to kids?$tr$, $tr$["To be responsible in caring for the environment", "It has no purpose", "It is only for adults", "It is not related to health"]$tr$::jsonb, $tr$Environmental Health (One Health)$tr$),
('eea8df4c-798b-42d5-aef8-42a9061917b5', $tr$What is symbolism used for in these plays?$tr$, $tr$["Images that teach religious lessons", "New modern technology", "Only modern music", "Sports games"]$tr$::jsonb, $tr$Theater and Dance in the Early Spanish Colonial Period$tr$),
('eebb2543-a432-4c76-afcc-28d85e5d3fda', $tr$Which is an example of a net/wall game?$tr$, $tr$["Badminton", "Softball", "Baseball", "Patintero"]$tr$::jsonb, $tr$Striking/Fielding and Net/Wall Games (Term 2, Week 1)$tr$),
('eec82a7f-1577-47bc-b8cb-1bf9c0461a07', $tr$How many beats are in 2/4 time?$tr$, $tr$["Two", "Three", "Four", "One"]$tr$::jsonb, $tr$Fundamental Dance Steps in 2/4 Time$tr$),
('eeeb3de4-7edc-4fd2-b365-0071fb6c9a12', $tr$What do we gain from learning dances?$tr$, $tr$["A deeper appreciation of culture", "We gain nothing", "It is only confusing", "It does not teach anything"]$tr$::jsonb, $tr$Traditional/National Dances$tr$),
('f05744c7-afe9-4156-af31-4cc185006769', $tr$How is legend dance connected to Filipino culture?$tr$, $tr$["It shows the rich Filipino tradition of storytelling", "It has no connection to culture", "It comes from another country", "It is not part of the culture"]$tr$::jsonb, $tr$Legend Theater and Dance; Health Rights$tr$),
('f0b2ec08-ee9e-4b12-928d-d65b486b872d', $tr$What is the purpose of choreography done all together in street dance?$tr$, $tr$["It shows the group's unity and skill", "It has no purpose", "It only causes confusion", "It is not part of the festival"]$tr$::jsonb, $tr$Local and Regional Street Dances$tr$),
('f0fde935-6852-4355-a2ab-1c2851bd8d60', $tr$Why is it important to learn to value your own rights?$tr$, $tr$["To know when you need to ask for help", "You don't need to know this", "It is only for adults", "It has no effect"]$tr$::jsonb, $tr$Legend Theater and Dance; Health Rights$tr$),
('f12a1e7a-9aba-4f65-98eb-082912929619', $tr$Why should safety be thought about when planning an activity?$tr$, $tr$["To avoid accidents and make sure everyone is safe", "It has nothing to do with the activity", "Only to make the game faster", "So there is no need to plan anymore"]$tr$::jsonb, $tr$Planning Family Health Activities$tr$),
('f138ca05-d095-4ad1-bd3f-eb25ac859f0e', $tr$How is contemporary art different from traditional art?$tr$, $tr$["Contemporary art is modern, while traditional art was passed down from long ago", "They are just the same", "There is no difference", "Traditional art is always better"]$tr$::jsonb, $tr$My Filipino Identity$tr$),
('f162125b-85a3-4438-a121-50c06b041579', $tr$What is symbolic theater?$tr$, $tr$["Theater that uses symbols to share a message", "Only open opposition", "Only dancing with no message", "Only a song with no meaning"]$tr$::jsonb, $tr$Symbolic Theater and Seditious Plays$tr$),
('f187e44a-9bd4-4fcc-aeac-34e78ee7b177', $tr$Who is responsible for reading the label?$tr$, $tr$["The buyer themselves", "Only the seller", "No one", "Only the maker of the product"]$tr$::jsonb, $tr$Consumer Rights and Responsibilities$tr$),
('f1b59c73-9e6a-48e9-8b42-3ad6817f1c98', $tr$What instrument is often played for indigenous dances?$tr$, $tr$["Drum or gong", "Piano", "Guitar", "Violin"]$tr$::jsonb, $tr$Arts: Rhythm and Movement in Indigenous Rituals$tr$),
('f1b600e7-6fd9-4565-a01a-9b8f9ea29a65', $tr$Why teach consumer health?$tr$, $tr$["To protect yourself as a buyer", "There is no purpose", "It is not related to health", "It is only for adults"]$tr$::jsonb, $tr$Consumer Rights and Responsibilities$tr$),
('f1d83a17-f947-4fcf-9471-ecbfb1db8388', $tr$Where is the best place to send the ball in net/wall games?$tr$, $tr$["To the opponent's open space", "To the part closest to the net", "To the same spot every time", "Outside the court"]$tr$::jsonb, $tr$Striking/Fielding and Net/Wall Games (Term 2, Week 1)$tr$),
('f26f3c46-1aec-4335-9c41-547595011151', $tr$What three subjects are we combining this week?$tr$, $tr$["Dance, health, and art", "Math, science, and language", "History, geography, and farming", "Only music"]$tr$::jsonb, $tr$Combining Dance, Health, and Art$tr$),
('f274beba-c8e1-41c5-9fa2-22ce5e7bf4a1', $tr$What does a vaccine do in the body?$tr$, $tr$["It helps build immunity against disease", "It makes the body sick", "It has no effect on the body", "It weakens the immune system"]$tr$::jsonb, $tr$Health: Common Infectious Diseases$tr$),
('f28766e8-bbd4-45b1-86f0-eef486954c42', $tr$What is an infectious disease?$tr$, $tr$["A disease that spreads from one person to another", "A disease that never spreads", "A kind of vitamin", "A kind of exercise"]$tr$::jsonb, $tr$Health: Common Infectious Diseases$tr$),
('f28b8d3c-be8f-4757-99bd-39f2f3e5da34', $tr$What is the first part of the chain of infection?$tr$, $tr$["The source of the disease", "A new host body", "Vaccine", "Way of entry"]$tr$::jsonb, $tr$Health: Common Infectious Diseases$tr$),
('f2aeda11-fbe6-4da9-9104-ce4ea3293c8f', $tr$How is it connected to the street dances we learned?$tr$, $tr$["Both are part of celebrating culture", "No connection", "One is about science", "One is about math"]$tr$::jsonb, $tr$Traditional/National Dances$tr$),
('f2fb3ec7-e0ba-4061-af6e-a160b1436a3a', $tr$Why is it important to study the visual arts of the past?$tr$, $tr$["It helps us understand the culture of our ancestors", "It has no meaning at all today", "It is only done for fun", "It is not really part of our history"]$tr$::jsonb, $tr$Visual Arts in the Early Spanish Colonial Period$tr$),
('f3402778-8342-48ab-a2ce-fedcb9439be8', $tr$What is a street dance festival?$tr$, $tr$["A yearly celebration with dancing in the streets", "A kind of game at home", "A kind of food", "A punctuation mark"]$tr$::jsonb, $tr$Local and Regional Street Dances$tr$),
('f3d0ce30-0c05-4082-964c-d4e7d7976e5b', $tr$What will happen if a dancer does not follow the signal?$tr$, $tr$["It will be hard for them to keep up when partners change", "Nothing will happen", "They will win automatically", "The whole music will stop"]$tr$::jsonb, $tr$Social Dance Mixers$tr$),
('f3fd6ab4-b9ce-4143-b046-313c6726395a', $tr$What goes together with dance exercise?$tr$, $tr$["Music", "Book", "Computer", "Pencil"]$tr$::jsonb, $tr$Dance Exercise and Movement Exploration$tr$),
('f44450e3-8a18-4205-8377-0a0170e8abfb', $tr$How is 3/4 different from 2/4 in the number of beats?$tr$, $tr$["Three in 3/4, two in 2/4", "They are just the same", "There is no difference", "Two in 3/4"]$tr$::jsonb, $tr$Social Dance Mixers in 3/4 Time$tr$),
('f47436f0-0d61-40f2-b09e-27a76f528a5b', $tr$What are striking/fielding games?$tr$, $tr$["Games with hitting/throwing a ball and running", "Games with only a net as a barrier", "Games with no ball at all", "Games played while sitting"]$tr$::jsonb, $tr$Striking/Fielding and Net/Wall Games$tr$),
('f47574e5-4eb3-472a-b72a-4851ea1b90c1', $tr$Why are animal diseases connected to human diseases?$tr$, $tr$["Diseases can pass from animals", "No connection", "Animals don't get sick", "People don't catch them"]$tr$::jsonb, $tr$Environmental Health (One Health)$tr$),
('f4a9d48d-21dc-4f1e-8159-07ed36051b56', $tr$Why understand the chain of infection?$tr$, $tr$["To stop diseases from spreading", "Useless", "Not needed", "Only about animals"]$tr$::jsonb, $tr$Health: Common Infectious Diseases$tr$),
('f4b9748d-d4d4-4a6a-8ead-65217e4f4a1e', $tr$In a song with two verses and a chorus in the middle, how many times is the chorus usually sung?$tr$, $tr$["More than once", "Only once", "It is not sung", "Only at the end"]$tr$::jsonb, $tr$Musical Form: Verse and Chorus$tr$),
('f5006beb-d786-4163-9fbc-49648f718f6f', $tr$What happens if you don't check the label?$tr$, $tr$["You might buy the wrong product", "Nothing happens", "It's always right", "Shopping is faster"]$tr$::jsonb, $tr$Consumer Rights and Responsibilities$tr$),
('f5cf10a4-db89-48b4-940f-39236b6ff1b2', $tr$Why is it important to include the whole family in the activity?$tr$, $tr$["It strengthens family bonds and health", "It has no benefit for the family", "It is better to do it alone", "The family is not needed for this activity"]$tr$::jsonb, $tr$Doing Our Family Wellness Activity$tr$),
('f5daebaf-0d15-48ee-9b6f-2a9e3c7a330f', $tr$Which of the things we learned is connected to family health?$tr$, $tr$["The traits of a healthy family", "Only our country's history", "Only math rules", "The news shown on television"]$tr$::jsonb, $tr$Term Review: Music, Arts, and PE$tr$),
('f605eefe-1678-4e83-b325-15a62c0a8b93', $tr$Who is responsible for a child's right to health?$tr$, $tr$["Family, community, government", "No one", "Only the child", "Only strangers"]$tr$::jsonb, $tr$Legend Theater and Dance; Health Rights$tr$),
('f64115a7-e248-477e-b18d-6fcf9b1242ad', $tr$Why is this topic taught to children?$tr$, $tr$["So they are ready to say no when offered", "To encourage them to try it", "It has no goal", "Just to scare them"]$tr$::jsonb, $tr$Effects of Gateway Drugs$tr$),
('f64bc5ce-99f7-4238-bc96-ee33312b7263', $tr$Why is the body's immunity important?$tr$, $tr$["It helps fight off diseases", "It is useless", "It only causes disease", "It is not a real idea"]$tr$::jsonb, $tr$Health: Common Infectious Diseases$tr$),
('f6942e03-95ce-41db-bfd9-1c268c0ef49a', $tr$Why should a child know their right to health?$tr$, $tr$["To protect their well-being", "It is not important", "It is not needed", "It is only for adults"]$tr$::jsonb, $tr$Legend Theater and Dance; Health Rights$tr$),
('f6ba883a-0bc1-46c2-a71e-d9c8ad5ce8dc', $tr$Why is it important to learn to dance in different time signatures?$tr$, $tr$["It widens your musical and physical skills", "It is not important", "You don't need to learn it", "Only to entertain the teacher"]$tr$::jsonb, $tr$Social Dance Mixers in 3/4 Time$tr$),
('f6d427b3-b74e-4db9-820d-942f45761840', $tr$What is the right tempo for music celebrating the harvest?$tr$, $tr$["Fast", "Slow", "No sound", "Quiet"]$tr$::jsonb, $tr$Music: Rhythm and Tempo$tr$),
('f6e5c396-a68f-45d4-b3cb-5fd721fd5a39', $tr$What is rhythm in the art of dance?$tr$, $tr$["Repeated movements or sounds", "The color of the clothes", "The name of the dance", "The number of dancers"]$tr$::jsonb, $tr$Arts: Rhythm and Movement in Indigenous Rituals$tr$),
('f6fdaa6c-fcee-4d72-84b6-c1f334804b2e', $tr$Who does the oppressor stand for in seditious plays?$tr$, $tr$["The foreign rulers", "The Filipinos", "Inang Bayan (Mother Country)", "The children"]$tr$::jsonb, $tr$Symbolic Theater and Seditious Plays$tr$),
('f706b2f1-74e3-49a0-9ec9-30b1dfd0bb47', $tr$A school is putting on a play about the Sinulog. What is important to include in their performance?$tr$, $tr$["Repeated steps that follow the music", "Just a random dance", "A dance with no music", "A dance with no meaning"]$tr$::jsonb, $tr$Arts: Rhythm and Movement in Indigenous Rituals$tr$),
('f707e48d-d3f2-41b9-969f-aff792203639', $tr$Why is vaping dangerous?$tr$, $tr$["It contains nicotine, which causes addiction", "It has no nicotine", "It is safe at any age", "No effect"]$tr$::jsonb, $tr$Effects of Gateway Drugs$tr$),
('f73c2549-8d06-4e42-b940-39920fb32565', $tr$How is contemporary different from traditional?$tr$, $tr$["Contemporary is modern, traditional was passed down from long ago", "Just the same", "No difference", "Traditional is always better"]$tr$::jsonb, $tr$My Filipino Identity$tr$),
('f749f651-2cf8-4d1e-aea1-8990050f999f', $tr$What new MAPEH unit started this week?$tr$, $tr$["Contemporary Filipino Identity", "Music of the Revolution", "American Dances", "Only PE"]$tr$::jsonb, $tr$My Filipino Identity$tr$),
('f767063f-6741-4e3e-b8f0-cbb53f0bda86', $tr$Lesson from writing your own song?$tr$, $tr$["Using musical form in a project", "Making a business investment", "Calculating probability", "Writing an outline"]$tr$::jsonb, $tr$Term 2 Review: Music, Arts, PE, and Health$tr$),
('f8079418-2a8e-48d1-a9c3-309d439a80e5', $tr$Why should the changes while growing up be seen as normal?$tr$, $tr$["They are a common part of everyone's growing up", "They rarely happen to kids", "They are something to be ashamed of and hide", "They only happen to some kids"]$tr$::jsonb, $tr$Art, Feelings, and Changes in Myself$tr$),
('fa56b35a-3dd5-4f39-949b-ef3afd244e2a', $tr$Where is the Sinulog held?$tr$, $tr$["Cebu", "Aklan", "Iloilo", "Manila"]$tr$::jsonb, $tr$Local and Regional Street Dances$tr$),
('fb30da2d-a62b-4d0b-b166-7eff29c3f959', $tr$What is the conflict in a play?$tr$, $tr$["The problem or fight in the story", "The ending of the story", "Introducing the characters", "The title of the play"]$tr$::jsonb, $tr$Symbolic Theater and Seditious Plays$tr$),
('fb47c2bc-8c62-4480-ad82-f104e4b917a9', $tr$Why are these dances taught in MAPEH?$tr$, $tr$["To build physical movement and social skills", "Just to entertain the teacher", "It has no goal", "To stop studying other subjects"]$tr$::jsonb, $tr$Social Dance Mixers$tr$),
('fbe6e531-4249-4fca-94b2-c503722e5e96', $tr$In Agawan Base, one team has weak defense, so their base keeps getting captured. What should they improve?$tr$, $tr$["Defending their space", "Singing while playing", "Drawing a new play area", "Avoiding the whole game"]$tr$::jsonb, $tr$Rhythm, Family Health, and Invasion Games$tr$),
('fc47f54f-4856-4fdd-9dc1-e656d84c4cdf', $tr$Why care for the health of animals and the environment?$tr$, $tr$["They are connected, based on One Health", "No connection", "Only people matter", "The environment is separate"]$tr$::jsonb, $tr$Environmental Health (One Health)$tr$),
('fc4ffb6c-0c98-4a0c-bffe-7994fa47ce53', $tr$Why show what you learned all term?$tr$, $tr$["It shows your progress", "It is not important", "It is no longer needed", "As long as it's done"]$tr$::jsonb, $tr$Combining 2/4 and 3/4 Time$tr$),
('fcc8c3f5-ae9d-4cf2-8571-43ae5cd485a0', $tr$What period of history was covered in Music/Arts this term?$tr$, $tr$["Early Spanish Colonial Period", "American Period", "Present day", "Before the Spanish arrived"]$tr$::jsonb, $tr$Term 2 Review: Music, Arts, PE, and Health$tr$),
('fcfe8081-b3a6-4a19-ab86-26c4cd6eb315', $tr$What is the goal of movement exploration?$tr$, $tr$["To discover what the body can do", "To make your voice stronger", "To learn math", "To learn writing"]$tr$::jsonb, $tr$Dance Exercise and Movement Exploration$tr$),
('fd0e859a-500a-4ca6-ad06-9cb076da7dce', $tr$According to the Visual Arts strand, what is the first step before drawing or painting?$tr$, $tr$["Observing your surroundings", "Selling the work right away", "Throwing away materials", "Forgetting the topic"]$tr$::jsonb, $tr$Visual Arts in the Early Spanish Colonial Period$tr$),
('fd43c083-e2eb-4b4e-bf8b-82c54ed1a668', $tr$Why is contemporary art taught in MAPEH?$tr$, $tr$["To understand how Filipino culture keeps growing and changing", "It has no purpose", "It is only for adults", "It is not related to education"]$tr$::jsonb, $tr$My Filipino Identity$tr$),
('fe049175-baf2-4f5a-90cf-063ac25ea225', $tr$What is an example of contemporary expression?$tr$, $tr$["Modern music with OPM influence", "Only dances from other countries", "There is no example", "A kind of food"]$tr$::jsonb, $tr$My Filipino Identity$tr$),
('fe0c39e3-d467-4038-9c0c-f934aafc2e03', $tr$Why are PE dance activities included in MAPEH?$tr$, $tr$["They build physical health and an appreciation of the arts", "There is no purpose", "It is not related to education", "It is only for adults"]$tr$::jsonb, $tr$Fundamental Dance Steps in 2/4 Time$tr$),
('fe12bd93-879e-4f83-a3f8-7913896a9aba', $tr$Why is it important to write the verse before the chorus?$tr$, $tr$["So the story connects well to the main message", "The order does not matter", "You should write the chorus first", "No order is needed"]$tr$::jsonb, $tr$Writing Your Own Simple Song$tr$),
('fe5275c9-5576-4889-a84c-3da52eecbb6c', $tr$What is part of dance exercise?$tr$, $tr$["Music", "Book", "Computer", "Pencil"]$tr$::jsonb, $tr$Dance Exercise and Movement Exploration$tr$),
('fe63c90e-7eb7-4d9d-be9a-eb107fdfc676', $tr$Why is preventing disease in the community important?$tr$, $tr$["To protect everyone's health", "No effect", "Only a personal issue", "Not related"]$tr$::jsonb, $tr$Health: Common Infectious Diseases$tr$),
('ff0c8b03-d8fe-4c13-911d-81bd3639f0bc', $tr$Why are traditional dances taught in MAPEH?$tr$, $tr$["To value and keep Filipino culture alive", "It has no purpose", "It is only for adults", "It is not related to education"]$tr$::jsonb, $tr$Traditional/National Dances$tr$),
('ff54213d-c6df-4f69-a6b1-5c2f79aec3ae', $tr$What did we learn about healthy families?$tr$, $tr$["Their traits and healthy habits", "Only the country's history", "Only math", "Only science"]$tr$::jsonb, $tr$Term Review: Music, Arts, and PE$tr$),
('ffe6fecd-b150-4d79-b317-9c525064a1ce', $tr$What time signature did we learn for rhythmic activities?$tr$, $tr$["2/4 time", "10/4 time", "1/8 time", "100/4 time"]$tr$::jsonb, $tr$Combining Dance, Health, and Art$tr$);

do $$
declare
  v_bad int;
begin
  select count(*) into v_bad
  from _mapeh_question t join public.content_questions cq on cq.id = t.id
  where jsonb_array_length(cq.options) <> jsonb_array_length(t.options)
     or not exists (select 1 from jsonb_array_elements_text(cq.options) o where o = cq.correct_answer);
  if v_bad > 0 then
    raise exception 'MAPEH translation: % main-quest question(s) do not line up with their translation', v_bad;
  end if;

  select count(*) into v_bad
  from _mapeh_boss t join public.draft_questions dq on dq.id = t.id
  where jsonb_array_length(dq.options) <> jsonb_array_length(t.options)
     or not exists (select 1 from jsonb_array_elements_text(dq.options) o where o = dq.correct_answer);
  if v_bad > 0 then
    raise exception 'MAPEH translation: % boss question(s) do not line up with their translation', v_bad;
  end if;
end $$;

update public.content_quizzes cq
set summary_markdown = t.summary_markdown
from _mapeh_quiz t
where cq.id = t.id and cq.subject = 'MAPEH';

-- In an UPDATE every cq.* on the right-hand side is the row's value before this statement.
update public.content_questions cq
set prompt = t.prompt,
    options = t.options,
    correct_answer = t.options ->> (
      select (o.ord - 1)::int
      from jsonb_array_elements_text(cq.options) with ordinality as o(val, ord)
      where o.val = cq.correct_answer
      order by o.ord
      limit 1
    )
from _mapeh_question t
where cq.id = t.id;

update public.draft_questions dq
set question = t.question,
    options = t.options,
    topic = coalesce(t.topic, dq.topic),
    correct_answer = t.options ->> (
      select (o.ord - 1)::int
      from jsonb_array_elements_text(dq.options) with ordinality as o(val, ord)
      where o.val = dq.correct_answer
      order by o.ord
      limit 1
    )
from _mapeh_boss t
where dq.id = t.id and dq.subject = 'MAPEH';

update public.draft_summaries ds
set summary_markdown = t.summary_markdown
from _mapeh_draft_summary t
where ds.id = t.id and ds.subject = 'MAPEH';

drop table if exists _mapeh_quiz, _mapeh_question, _mapeh_boss, _mapeh_draft_summary;
