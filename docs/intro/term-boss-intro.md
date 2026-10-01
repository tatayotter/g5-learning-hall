# Term Boss Intro — script (v2, approved and built)

A voiced, interactive intro for the Term Boss ("The Trial of the Forgetting"), built on the
first-curio intro engine (`components/intro/*`). It would **replace the current short
`BossCutscene`** and play at the same moment: once per player, per grade, per term, when the Term
Boss event goes live. Grades 2 and 5 only, the Term Boss's existing scope.

**What it must teach**, true to the real fight (`docs`/memory: term boss design):
- The Forgetting returns at the end of every term to take back what you learned.
- It splits into one shadow ("persona") per subject — the grade's real persona roster.
- A correct answer is your Curio's attack, and answers in a row power it up; a wrong answer
  costs a heart (the count depends on the fight's size); out of hearts = study and retry, free.
- Each defeat thins the game-wide mist; defeating all of them frees the term's sealed Curio.

**Cast:** The Lorekeeper (Gideon), Tala (Lulu Lolipop), Damien (Quang Anh) — same as the first
intro — plus a new voice, **The Forgetting** (a cold, whispery villain; free voice to be picked). It is the
same voice as the fight taunts (`lib/bossTaunts.ts`): the bosses never speak, The Forgetting
speaks through them.

## Beats

### 1. The Omen
*Art:* the Hall of the Ledger at night; the book's golden light flickers weakly; pale mist seeps
under the great doors. *Enter:* dark pulse, hex sound.
- **Lorekeeper:** Keeper. Wake up. Something is wrong with the Ledger.
- **Lorekeeper:** Every page you wrote this term, every word, every number, every lesson you learned, is starting to fade.
- *Kid taps:* **Go to the Ledger**

### 2. The Fading
*Art:* close-up of the Ledger's pages, the golden ink running and dissolving into pale smoke.
- **Tala** *[scared]*: Damien, look! The pages we filled are going blank!
- **Damien** *[serious]*: It's the Forgetting. It came back, and it's stronger than before.
- **Lorekeeper:** At the end of every term, the Forgetting returns to steal back everything you learned.
- *Kid taps:* **Protect the pages** (shield effect)

### 3. The Whisper
*Art:* a towering pale mist shape with hollow glowing eyes, rising over the five Guild towers at
night. *Enter:* the screen darkens.
- **The Forgetting** *[whispering]*: Why hold on so tightly, little Keeper? Remembering is so much work.
- **The Forgetting:** Close your books. Rest. Let it all slip away, and it will all be mine.
- *Kid chooses:* **Let it go** or **Never!**
  - "Let it go" → the button crumbles to dust, **Lorekeeper:** Don't listen to it, Keeper! — and only "Never!" remains.
  - "Never!" → big burst; **Tala** *[fierce]*: We will never stop remembering!

### 4. The Shadows
*Art:* the dark hall full of mist; the grade's **real persona cards** (existing boss art) sit
hidden in shadow on top of it.
- **Lorekeeper:** The Forgetting has split itself into shadows, one for every subject you studied this term.
- **Lorekeeper:** Each shadow feeds on the lessons of its subject. Tap each one to see what you're up against.
- *Kid taps each card:* it flips, then the shadow steps forward in a full-screen spotlight: big
  art, name, subject, lore line, **It attacks** (what it makes you forget) and **Beat it to review**
  (the subject's lessons this term) — `attacks` / `reviews` in `lib/bossPersonas.ts`. "Next shadow"
  closes it; the beat ends after the last one ("I know them all!"). 9 for Grade 5, 7 for Grade 2.
- **Damien:** The Silent Word. The Null. Ang Limot. They're all here.

### 5. The Weapon (practice strike)
*Art:* Tala and Damien holding up glowing notebooks; lesson-light spirals around them.
- **Tala** *[excited]*: But we have a weapon. Everything we learned this term!
- **Lorekeeper:** In battle, every correct answer lets your Curio strike. Answer right again and again, and its attacks grow stronger.
- **Lorekeeper:** But every wrong answer costs you a heart. Let's practice. What does the Forgetting want to take from you?
- *Kid answers* (3 hearts shown, a shadow target): **Everything I learned** / My gold / My Curio
  - Wrong → a heart cracks, **Damien:** No! It wants what you learned. Try again!
  - Right → the shadow is struck (battle hit effect) and fades.
- **Lorekeeper:** Well struck! And if your hearts ever run out, don't give up. Go back to your lessons and try again. The Forgetting only wins if you stop.

### 6. Your Partner
*Art:* a glowing battle platform in the mist, with **the kid's own active Curio** standing on it.
- **Lorekeeper:** You will not fight alone. Your Curio grew strong because you learned. Now it will fight beside you.
- *Kid taps:* **Ready, partner!** → their Curio powers up (aura, power-up sound). Caption only:
  "*<Curio name>* is ready!"

### 7. The Sealed Curio
*Art:* in the heart of the Ledger, a crystal seal wrapped in mist, a Curio's silhouette asleep
inside.
- **Lorekeeper:** Every shadow you defeat pushes the mist back from the world. Defeat them all, and the seal will break.
- **Lorekeeper:** Inside it sleeps a rare Curio that the Forgetting stole. Free it, and it will join you.
- *Kid taps:* **I'll set it free!**

### 8. The Charge
*Art:* the Lexicon Arena balcony at dawn, facing a wall of mist full of shadow silhouettes; the
kid's point of view, Tala and Damien at their sides.
- **Tala** *[excited]*: We'll be right behind you!
- **Damien** *[determined]*: Show the Forgetting what you remember!
- **Lorekeeper:** The Ledger is counting on you, Keeper. The Trial of the Forgetting begins now.
- *Kid taps:* **Face the Forgetting** → lands on the board's persona select.

## Numbers
~22 voice lines, roughly 2,000 characters (ElevenLabs). 7 new scene images (persona art and the
kid's Curio are reused). Skip is always available, like the first intro.

## Production (done 2026-10-01)

- **Code:** `components/intro/TermBossIntro.tsx` (interactions) on the shared `StoryPlayer`
  (`components/intro/OriginStory.tsx`); beats and lines in `lib/intro/termBossStory.ts`; cues in
  `lib/intro/introCues.ts`. Replaces the old `BossCutscene`. Preview: `/dev/ui-gallery` → TermBossIntro.
- **Voices (ElevenLabs, Eleven v4, Generation 1):** Lorekeeper = Gideon - Pirate, Tala = Lulu Lolipop,
  Damien = Quang Anh, **The Forgetting = Silent Systemus – Sovereign Protocol** (user's pick; also the
  voice for the fight taunts). 23 clips `tb_*.mp3` in `public/sounds/voice/intro/`, split with
  `tools/split_intro_vo.py` (all verified; listen to `tb_shadows_3` for the "Ang Limot" pronunciation).
- **Scene art (user-generated):** `public/intro/tb_{omen,fading,whisper,weapon,sealed,charge}.webp`,
  1920×1080. Beat 4 reuses `tb_omen` drained gray; beat 6 uses `forgetting_void.webp` with the kid's
  active Curio drawn over it.
