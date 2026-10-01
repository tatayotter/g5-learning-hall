# First-Curio Intro — production sheet

The onboarding every curio-less account sees: a voiced, interactive origin story
(**The Legend of the Ledger**, `docs/lore/legend-of-the-ledger.md`), then choosing a first curio,
then a five-question training quest that teaches the main-quest flow.

- Story: `components/intro/OriginStory.tsx` + `components/intro/VoiceCaptions.tsx`,
  script/beats in `lib/intro/originStory.ts`
- Training quest: `components/intro/IntroTrainingQuest.tsx`, questions in `lib/intro/trainingQuiz.ts`
- Wiring: `components/intro/FirstCurioIntro.tsx`, mounted by `components/Dashboard.tsx`
- Preview without an account: `/dev/ui-gallery` → "First-curio intro"

**Why (usage data, 2026-09-30):** 70% of new kids never started a quiz; only 19 of 212 ever got a
curio (the starter pick lived on the monster tab), and curio owners learned and returned at 3–4x
the rate.

## Beats

| # | Beat | Lore | Kid does |
|---|---|---|---|
| 1 | ledger | Ch 1 | Open the Ledger |
| 2 | crack | Ch 1 | Look into the crack |
| 3 | solarch | Ch 1 | Welcome Solarch |
| 4 | fray | Ch 2 | Help the builders |
| 5 | guilds | Ch 2 | Tap all five Guilds to light them (each shows its school subject) |
| 6 | forgetting | Ch 3 | Hold on, Solarch! |
| 7 | spell | Ch 4 | Spell S-O-L-A-R-C-H from shuffled tiles (his color returns letter by letter) |
| 8 | count | Ch 4 | Five steps down + five up = ? (color floods back) |
| 9 | secret | Ch 4–5 | "I understand" — every answer re-inks the world; curios wake when a child learns |
| 10 | oath | Ch 5 | Take the Keeper's Oath: I will read / I will practice / I will remember |

Then: choose a curio → Study Session notes → Prepare for Battle → five-question quiz → victory
(real XP, Gold, and curio EXP).

## Images to generate

Drop finished files in `public/intro/` with exactly these names (`.webp`, 1920×1080). Until a file
exists, the beat falls back to existing art, so they can be added one at a time.

**Speaker portraits are done** — `public/intro/portrait_tala.png` and `portrait_damien.png` were cut
from the canonical character art (`docs/intro/character-refs/tala.png`, `damien.png`): waist-up,
background removed, mirrored to face right. The narrator uses the existing Lorekeeper NPC.

**Reference files to attach** (paths from the repo root):

| Ref | File |
|---|---|
| STYLE | `public/guilds/lorekeeper-bg.png` |
| TALA | `docs/intro/character-refs/tala.png` |
| DAMIEN | `docs/intro/character-refs/damien.png` |
| SOLARCH | `public/monsters/solarch.webp` |
| LEDGER | `public/codex/ledger_header.webp` (only the book matters) |
| MAP | `public/maps/ledgers_heart.webp` |
| GUILDS | `public/guilds/lorekeeper-bg.png`, `spell-bg.png`, `number-bg.png`, `logic-bg.png`, `lex-bg.png` |

Generate in order: #7 before #8 (#8 reuses its framing), #8 before #9, #5 before #10.

Every prompt below is complete on its own (style, characters, framing and exclusions are repeated
inside each one) — paste it as-is.

### 1. `ledger_hall.webp`
**Attach:** STYLE, LEDGER, TALA, DAMIEN

> Detailed high-resolution pixel art illustration in the same rendering style as the attached library background (clean pixel clusters, dark outlines on characters, soft dithered lighting, warm lantern glow), cinematic kid-friendly fantasy storybook mood. Scene: a vast, silent stone hall at night — the Hall of the Ledger. In the center, a colossal ancient book lies open on a carved stone pedestal: dark brown tooled-leather cover with brass corner guards and a golden eye-inside-a-triangle emblem (use only the book from the attached poster), thick cream parchment pages covered in flowing golden handwriting that glows like liquid light. Ribbons of golden living ink rise from its pages and swirl upward like smoke made of light, filling the air with floating golden motes. Tall dark bookshelves line the walls, a great iron chandelier hangs high above, faint blue moonlight falls through tall arched windows. Standing before the pedestal, seen from behind in three-quarter back view and small in the frame: Tala, a 7-year-old Filipino girl drawn exactly like the attached Tala character (very long straight black hair in a high ponytail with a small gold star clip, a brown feather tucked in her hair, rose-pink short-sleeved tunic with gold trim, brown belt, dark brown shorts, brown boots), and beside her Damien, an 11-year-old Filipino boy drawn exactly like the attached Damien character (short black hair, round black glasses, navy-blue knee-length coat with gold buttons and gold embroidery, brown messenger bag with rolled scrolls, black trousers). Both gaze up at the book in awe, their outlines rim-lit gold. Composition: low camera looking slightly up; the book and its rising ink in the exact center, filling the middle third; the children just left of center with their heads at about 45% of the image height; the brightest glow in the upper-middle, fading to deep brown shadow at the edges; the bottom 35% is dim stone floor in soft shadow with little detail; nothing important in the top 8%. Landscape 16:9, 1920×1080. No text, letters, numbers or logos anywhere, no watermark, no UI, no frame or border.

### 2. `ledger_crack.webp`
**Attach:** STYLE, LEDGER

> Detailed high-resolution pixel art illustration in the same rendering style as the attached library background (clean pixel clusters, soft dithered lighting), cinematic kid-friendly fantasy storybook mood. Scene: an extreme close-up of the open pages of a colossal ancient book (dark brown tooled-leather cover edges with brass corner guards visible at the sides, like the book in the attached poster), seen from slightly above. A bright glowing golden crack — a fissure of light — splits straight down the center of the page from top to bottom. The flowing golden handwriting on the pages parts and curls away from the crack, and the torn parchment edges glow like molten gold. Sparks, tiny glowing particles and a warm breeze of light pour out of the crack toward the viewer, with a faint silver shimmer in the air like the ring of a tiny bell. Everything else is dark; the only light comes from the crack. No characters and no creatures. Composition: the crack is a vertical line at the exact horizontal center, brightest in the upper half; the pages fill the frame edge to edge; the bottom 35% is the dim lower part of the pages with little detail; nothing important in the top 8%. Landscape 16:9, 1920×1080. No text, readable letters, numbers or logos anywhere (the handwriting must be abstract squiggles), no watermark, no UI, no frame or border.

### 3. `solarch_birth.webp`
**Attach:** STYLE, TALA, DAMIEN, SOLARCH

> Detailed high-resolution pixel art illustration in the same rendering style as the attached library background (clean pixel clusters, dark outlines on characters, soft dithered lighting, warm lantern glow), cinematic kid-friendly fantasy storybook mood. Scene: inside a dark stone hall, lit by warm golden light spilling from a giant open book just off-frame to the left. In the center stands Tala, a 7-year-old Filipino girl drawn exactly like the attached Tala character (warm brown skin, big dark-brown eyes, very long straight black hair in a high ponytail with a small gold star clip, a brown feather tucked in her hair, rose-pink short-sleeved tunic with mandarin collar, gold toggle buttons and gold swirl embroidery, brown belt with gold buckle), laughing with delight and looking up. Sitting proudly on the very top of her head, curled up like a little king on a throne, is Solarch, a tiny golden-yellow lion cub drawn exactly like the attached Solarch character but in pixel art (big round head, huge sparkling amber eyes, small gold star on his forehead, fluffy cream-gold mane collar with faint gold constellation lines, star-tipped tail), small enough to fit in two hands, with a soft floating ring of warm sunlight hovering behind his head like a sun crown; his eyes are half-closed and content. To the right of her, Damien, an 11-year-old Filipino boy drawn exactly like the attached Damien character (short black hair, round black glasses, navy-blue knee-length coat with gold buttons and gold embroidery, white embroidered shirt, red-and-gold beaded lanyard, brown messenger bag with rolled scrolls, ink-stained fingertips), leans in wide-eyed with wonder, one hand half-raised. Golden motes float in the air. Composition: medium shot from the waist up; Tala centered; Solarch on her head at about 20–30% from the top of the image; Damien right of center; both faces fully visible; warm golden key light from the left, deep brown shadows behind; the bottom 35% fades into their clothing and shadow with little detail; nothing important in the top 8%. Landscape 16:9, 1920×1080. No text, letters, numbers or logos anywhere, no watermark, no UI, no frame or border.

### 4. `world_fraying.webp`
**Attach:** STYLE, SOLARCH, MAP

> Detailed high-resolution pixel art illustration in the same rendering style as the attached library background (clean pixel clusters, dark outlines, soft dithered lighting), cinematic kid-friendly fantasy storybook mood. Scene: early morning seen through a tall arched stone window of an old hall. On the wide stone windowsill in the center stands Solarch, a tiny golden-yellow lion cub drawn exactly like the attached Solarch character but in pixel art (huge sparkling amber eyes, gold star on his forehead, fluffy cream-gold mane collar with faint constellation lines, star-tipped tail), stretching up on tiptoe toward the first rays of the rising sun, a soft floating ring of warm sunlight glowing behind his head like a sun crown. Outside the window: a beautiful land of dark green pine forests, rolling hills and winding dirt paths (like the attached forest map, seen from eye level instead of from above) under a pink-and-gold dawn sky — but the far horizon is unraveling: the edges of the hills and treetops fray into loose threads like the hem of an old cloak, ragged gaps of blank white parchment show through the sky and the land, and one distant hill is flattening into a flat gray line. Mood: beautiful but alarming. Composition: the dark stone window frame forms a border around the view; Solarch on the sill at the center, the sill at about 55% of the image height; the fraying horizon across the upper-middle; below the sill, the dark stone wall is calm and low-detail (bottom 35%); nothing important in the top 8%. Landscape 16:9, 1920×1080. No text, letters, numbers or logos anywhere, no watermark, no UI, no frame or border.

### 5. `five_guilds.webp`
**Attach:** STYLE, GUILDS (all five)

> Detailed high-resolution pixel art illustration in the same rendering style as the attached guild backgrounds (clean pixel clusters, soft dithered lighting), cinematic kid-friendly fantasy storybook mood. Scene: a sweeping aerial panorama at dawn of one land holding five great watchposts, each shooting a thick beam of colored light straight up into the sky. From left to right: (1) the Lorekeeper tower — a tall stone-and-timber tower on high windswept cliffs, warm lantern windows, green banners, with an EMERALD beam; (2) the SpellCaster academy — a shimmering purple-roofed academy with crescent-moon spires on an island across a sparkling sea, with a VIOLET beam; (3) the Number Realm — a dark iron-and-brass clockwork city in a deep valley, giant turning gears and clock towers glowing orange, with an AMBER beam; (4) the Logic Labyrinth — a vast maze of emerald hedges with glowing teal maze-pattern stone blocks at its heart, with a CYAN beam; (5) the Lexicon Arena — a grand white-stone coliseum by the sea with navy-and-gold banners and ship masts in its harbor, with an INDIGO beam. Use the attached guild interiors only for each guild's colors and motifs. High in the upper center of the sky, the five beams bend toward each other and weave together like threads in a tapestry into one glowing knot of light. At the far left and right edges of the horizon, frayed white parchment edges are knitting back into green hills and blue sky. Composition: wide vista from a high vantage point; the woven knot of light at the top center (about 20–30% from the top); all five watchposts clearly visible across the middle band (35–65% of the image height), evenly spaced; the bottom 35% is soft foreground meadow and morning mist with little detail; nothing important in the top 8%. Landscape 16:9, 1920×1080. No text, letters, numbers or logos anywhere, no watermark, no UI, no frame or border.

### 6. `the_forgetting.webp`
**Attach:** STYLE, TALA, DAMIEN, SOLARCH, `public/guilds/lex-bg.png`

> Detailed high-resolution pixel art illustration in the same rendering style as the attached library background (clean pixel clusters, dark outlines on characters, soft dithered lighting), with muted, cold colors. Scene: the great library of the Lexicon Arena (wooden walls, navy-blue bookshelves, brass lanterns and a large round porthole window, like the attached Lexicon Arena room) being swallowed by the Forgetting — a pale, silent white mist that pours over the bookshelves and across the floor. Where the mist touches, the gold lettering on the book spines dissolves and trickles away like dry sand, and colors drain to gray. In the center, Tala, a 7-year-old Filipino girl drawn exactly like the attached Tala character (very long black ponytail with a small gold star clip, brown feather in her hair, rose-pink tunic with gold trim), kneels and hugs Solarch tightly to her chest — Solarch, the tiny golden lion cub drawn like the attached Solarch character in pixel art, is shivering, his golden fur turning ash-gray and the ring of sunlight behind his head shrinking into a faint cold gray ring. Beside her, Damien, an 11-year-old Filipino boy drawn exactly like the attached Damien character (round black glasses, navy-blue coat with gold embroidery, brown messenger bag), holds open a book whose words are fading off the page into blank white, looking frightened. Through the round window behind them, a forest of crimson trees is draining to gray and dissolving into flat, featureless white. Composition: the two children and Solarch at the center, their heads at about 35–45% of the image height; the round window with the dissolving forest behind them in the upper center; the mist thickest at the edges and along the floor; the bottom 35% is soft white-gray mist with little detail; nothing important in the top 8%. Palette: desaturated blues, grays and faded browns, with only tiny traces of gold left. Landscape 16:9, 1920×1080. No text, readable letters, numbers or logos anywhere, no watermark, no UI, no frame or border.

### 7. `forgetting_void.webp`
**Attach:** STYLE

> Detailed high-resolution pixel art illustration in the same rendering style as the attached library background (clean pixel clusters, soft dithered lighting), with muted, cold colors. Scene: a high stone balcony of a grand hall where a wide staircase used to be. The steps have vanished into a blank white void, as if erased from a drawing; only faint pencil-like outlines hint at where they were. The edges of the stone floor and the balustrade fade and dissolve into flat white parchment, and a pale mist swirls everywhere in slow curls. There are NO characters and NO creatures anywhere in the image. Composition: symmetrical, eye-level view; the white void in the center; the middle of the image from 5% to 50% of the height must be EMPTY, open misty space (a character is drawn there by the game); broken balcony stonework frames the left and right edges; the bottom 35% is soft pale mist with little detail. Palette: pale grays, cold blue-white and faded stone. Landscape 16:9, 1920×1080. No text, letters, numbers or logos anywhere, no watermark, no UI, no frame or border.

### 8. `reinking.webp`
**Attach:** STYLE, your finished `forgetting_void.webp`

> Detailed high-resolution pixel art illustration in the same rendering style as the attached library background (clean pixel clusters, soft dithered lighting). Scene: exactly the same balcony and camera angle as the attached white-void image, at the moment of the first re-inking. Wet, glowing living ink bursts out of the air in a great splash, like water hitting dry earth, and carves the dark outlines of the stone staircase back into existence. A vibrant wave of color floods outward from the center: emerald green grass, warm golden stone and a deep, solid blue sky, while the pale mist recoils and flees toward the edges of the frame. Droplets and ribbons of glowing golden ink hang in the air. There are NO characters and NO creatures anywhere in the image. Composition: identical framing to the white-void image; the middle of the image from 5% to 50% of the height stays open (bright blue sky with only thin ink ribbons, because the game draws a character there); the restored staircase climbs through the lower middle; the bottom 35% is calm with little detail. Palette: saturated emerald, sky blue and gold against the last wisps of white mist. Landscape 16:9, 1920×1080. No text, letters, numbers or logos anywhere, no watermark, no UI, no frame or border.

### 9. `solarch_restored.webp`
**Attach:** STYLE, TALA, DAMIEN, SOLARCH, your finished `reinking.webp`

> Detailed high-resolution pixel art illustration in the same rendering style as the attached library background (clean pixel clusters, dark outlines on characters, soft dithered lighting), bright and triumphant. Scene: the restored balcony from the attached re-inking image. In the center, Solarch, the tiny golden-yellow lion cub drawn exactly like the attached Solarch character but in pixel art (huge sparkling amber eyes, gold star on his forehead, fluffy cream-gold mane collar, star-tipped tail), has leapt onto the stone railing and roars proudly with his head raised; the ring of sunlight behind his head blazes with brilliant golden light and his fur glows warm gold; his roar blows the last wisps of pale mist away. Just behind him and a little lower, Tala (drawn exactly like the attached Tala character: long black ponytail with a gold star clip, brown feather, rose-pink tunic) and Damien (drawn exactly like the attached Damien character: round black glasses, navy-blue coat with gold embroidery, brown messenger bag) look at their own hands, which glow softly with golden living ink, then up at Solarch with amazed smiles. A deep blue sky above and an emerald valley below. Composition: low camera angle; Solarch large and heroic at the center, between 20% and 45% of the image height; Damien just left and Tala just right behind him, their heads at about 45–55% of the height; the bottom 35% is the railing and a soft valley haze with little detail; nothing important in the top 8%. Palette: bright gold, emerald and sky blue. Landscape 16:9, 1920×1080. No text, letters, numbers or logos anywhere, no watermark, no UI, no frame or border.

### 10. `keepers_call.webp`
**Attach:** STYLE, TALA, DAMIEN, SOLARCH, your finished `five_guilds.webp`

> Detailed high-resolution pixel art illustration in the same rendering style as the attached library background (clean pixel clusters, dark outlines on characters, soft dithered lighting), hopeful and inspiring. Scene: sunrise on a high white-stone balcony above the Lexicon Arena. Tala (drawn exactly like the attached Tala character: very long black ponytail with a gold star clip, brown feather in her hair, rose-pink tunic with gold trim, brown boots) and Damien (drawn exactly like the attached Damien character: round black glasses, navy-blue knee-length coat with gold embroidery, brown messenger bag with rolled scrolls), seen from behind in three-quarter back view, have just released a glowing rolled scroll into the sky. The scroll is carried away by a flock of small clockwork owls made of polished brass, with spinning gear wings and glowing purple eyes, trailing streams of golden light as they fly out over a vast world of mountains, valleys and sea, where the five guild towers from the attached panorama glow faintly in emerald, violet, amber, cyan and indigo. Thin ribbons of pale white mist still cling to a few far-off peaks. Solarch, the tiny golden lion cub drawn like the attached Solarch character in pixel art, sits on the balustrade beside the children, looking up after the owls with his ring of sunlight glowing. Composition: the scroll and owls rise through the upper center; the children at center-left and center-right, their heads at about 45–55% of the image height; the vast world stretches to a horizon at about 40% of the height; the bottom 35% is balcony stone in soft shadow with little detail; nothing important in the top 8%. Landscape 16:9, 1920×1080. No text, letters, numbers or logos anywhere, no watermark, no UI, no frame or border.

### 11. Speaker portraits — done
`public/intro/portrait_tala.png` and `public/intro/portrait_damien.png`, made from the character art.

## Voice script

Record each line as its own clip: `public/sounds/voice/intro/<id>.mp3`. A missing clip is safe (all
captions show at once), so lines can be recorded in any order. ElevenLabs: Generation 1, numbers
as English words (already written that way below). Captions show exactly this text, so re-record
if a line changes.

**Cast (ElevenLabs, Eleven v4, Generation 1, all free voices):** The Lorekeeper = **Gideon - Pirate**,
Tala = **Lulu Lolipop - High-Pitched and Bubbly**, Damien = **Quang Anh - Bright, Brilliant**.
(Santa Carter and Eldrin were the first narrator picks but are premium/Creator-plan voices; Austin
has a custom per-use rate — both ruled out.)

**How clips are made:** paste one speaker's lines as ONE paragraph joined with ` ... ` (the TTS
editor turns newlines into separate blocks and only voices the first), with v4 acting tags like
`[whispering]`, generate, download Generation 1, then:

```
python tools/split_intro_vo.py <take.mp3> <id1> <id2> ...   # ids in the order they were read
```

It cuts at the silences, writes `public/sounds/voice/intro/<id>.mp3`, and re-transcribes each clip
(anything under 85% match is flagged; Whisper hears "Solarch" as "Clark"/"Solark", that's fine).

**Recorded 2026-09-30: all 31 clips.** Two ElevenLabs accounts; Gideon ran at stability 0.34 / similarity 0.70 on both so the narrator matches across takes. Raw takes are not kept in the repo.

| Clip id | Speaker | Line | Chars |
|---|---|---|---|
| `ledger_1` | Lorekeeper | Gather close to the fire, little one. Before there were castles, or roads, or Guilds, there was only the Ledger. | 112 |
| `ledger_2` | Lorekeeper | A great book of endless pages, filled with living ink. Every sky, every river, every memory of our world was written inside it. | 127 |
| `crack_1` | Lorekeeper | One night, two young apprentices stood before the Ledger. Their names were Damien and Tala. | 91 |
| `crack_2` | Tala | Damien, do you hear that? It sounds like a heartbeat. | 53 |
| `crack_3` | Damien | The ink is moving too fast. The pages are too full. Don't touch it, Tala! | 73 |
| `crack_4` | Lorekeeper | But it was too late. With a sound like a tiny silver bell, a golden crack split the page. | 89 |
| `solarch_1` | Lorekeeper | Out tumbled a tiny lion cub, glowing like the morning sun. | 58 |
| `solarch_2` | Tala | The old rule says that when you find something new in the Ledger, you must give it a name to make it real. | 106 |
| `solarch_3` | Damien | He acts like a little king. A sun king. Solarch! | 48 |
| `solarch_4` | Lorekeeper | And so Solarch became the very first Curio: a living memory, born from a page too full of life. | 95 |
| `fray_1` | Lorekeeper | But the world was still new, and its edges were thin. One morning, the hills began to fray like an old cloak. | 109 |
| `fray_2` | Damien | The world is unraveling! We have to hold it together! | 53 |
| `guilds_1` | Lorekeeper | So the Keepers built five Guilds, one over each tear in the world. Tap each Guild to light its tower. | 101 |
| `guilds_2` | Lorekeeper | Five beams of light rose into the sky, and the world held together. Remember these Guilds, Keeper. You will train in every one of them. | 135 |
| `forgetting_1` | Lorekeeper | Many years passed, and people grew comfortable. Children stopped practicing. Books stayed closed. The great gears gathered dust. | 128 |
| `forgetting_2` | Lorekeeper | And in that lazy quiet, something crept in. Not a monster. Not an army. A pale, silent mist. The Forgetting. | 108 |
| `forgetting_3` | Damien | The words in the books are disappearing! If we forget the words, the things they describe will vanish too! | 106 |
| `forgetting_4` | Tala | Solarch is fading! He's turning gray! | 37 |
| `spell_1` | Tala | Every memory matters. If we remember his name, he stays real. Help me spell it! | 79 |
| `count_1` | Damien | The stairs are gone! But I remember them. Five steps down to the garden, and five steps up to the tower. How many steps is that? | 128 |
| `count_retry` | Damien | Hmm, count again. Five, and five more. | 38 |
| `count_2` | Lorekeeper | Ten! And with a splash, the living ink came rushing back. It carved the stairs, painted the grass, and chased the mist away. | 124 |
| `secret_1` | Lorekeeper | Solarch roared, and his light blazed brighter than ever. That day, Damien and Tala learned the Ledger's greatest secret. | 120 |
| `secret_2` | Lorekeeper | The Forgetting is always waiting for us to grow lazy. But every word you read, every word you spell, and every problem you solve re-inks the world. | 147 |
| `secret_3` | Lorekeeper | And the Curios sleeping in the stone can only wake when a child learns something new. | 85 |
| `oath_1` | Tala | We can't guard all five Guilds by ourselves. | 44 |
| `oath_2` | Damien | Then we'll send a call to every child who is brave enough to learn. | 67 |
| `oath_3` | Lorekeeper | That call has traveled through the ages, all the way to you. Will you take the Keeper's Oath? | 93 |
| `oath_4` | Lorekeeper | Then welcome, Keeper. The Ledger is open. The ink is wet. And a Curio is waiting to choose you. | 95 |
| `training_notes` | Lorekeeper | Your Curio is still sleepy, Keeper. Every quest has two parts. First, read the notes. Then, answer the quiz. Get every answer right to wake your Curio. | 151 |
| `training_victory` | Lorekeeper | Well done, Keeper! Your first page of the Ledger is re-inked. Your weekly quests are waiting on the Campaign Map. | 113 |

**Total: 31 clips, 2913 characters** (Lorekeeper 2081, Damien 513, Tala 319).
