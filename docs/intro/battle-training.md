# Battle training

The first time a player with a Curio opens the Curio Arena, Tatay sends a battle invite. Accepting
starts a voiced, coached sequence that teaches how battles against other Keepers work:

1. **Invite**: the real live-battle invite pop-up, from Tatay, with no expiry timer. Declining
   just closes it; it comes back on the next Arena visit until training is finished.
2. **Story**: the Lorekeeper introduces Tatay as the creator of Learning Hall (`INVITE_BEATS`).
3. **Tatay fight**: the real player-vs-player battle screen in bot mode, with no round clock.
   Tatay's team is the level-100 roster from his trainer entry. He misses on purpose for
   `TATAY_WARMUP_ROUNDS` (2) so the coaching tips can play, then answers everything right and
   wins. This is the kid's first loss, by design. After round 1 the Lorekeeper spotlights the
   locked skills: stronger attacks unlock when the Curio reaches the level shown on them. It counts toward the "lose to Tatay" achievement.
4. **Story**: Tatay and the Lorekeeper on losing, then the element lesson: the chart of what beats
   what, and the kid taps the element their lead Curio beats (`defeatBeats`).
5. **Training Dummy fight**: built like the normal Dummy (curios your team is strong against, at
   your level), with a 20% hit rate, so it's the easiest possible fight. Pays the normal Dummy
   reward. If the kid loses anyway, the Lorekeeper offers a rematch where the Dummy never hits.
6. **Victory story**, then `complete_battle_training()` pays a one-time **100 gold**.

Replayable any time from **Trainers > Battle Training** (no bonus on replays).

- Sequence: `components/monster/BattleTraining.tsx`, wired in `components/MonsterGuild.tsx`.
- Script + tuning: `lib/intro/battleTraining.ts` (source of truth for every line below).
- Coaching hooks: `LiveBattleScreen`'s `untimed` / `onCoachMoment` props; tips spotlight the
  `battle-moves`, `battle-utils` and `battle-question` elements.
- Database: `supabase/migrations/20261003100000_battle_training_completion.sql`. Completion is a
  separate table with no client write policies, so the bonus can't be re-claimed.
- Analytics: `battle_training_started`, `_declined`, `_tatay_done`, `_dummy_done`, `_completed`,
  `_tip_viewed`, `_tip_done`, `_beat_viewed`, `_story_skipped`.

## Art

Drop finished files in `public/intro/` with exactly these names (`.webp`, 1920×1080). Until a file
exists, the scene falls back to existing intro art (`ledger_hall`, `five_guilds`,
`solarch_restored`), so they can be added one at a time.

**Where the game draws on top (keep it empty in the art):**
- `bt_tatay.webp` (used for Tatay's challenge and for the talk after the loss) and
  `bt_elements.webp`: the game draws a character sprite (Tatay, or the Training Dummy), centered
  horizontally, standing on a surface in the art. The center column above it must be open. Where
  the feet go is set per scene in `BeatSprite` (components/monster/BattleTraining.tsx): Tatay on
  the platform ~64% down, the Dummy on the dirt patch ~70% down. If a new image puts the ground
  somewhere else, adjust `stand` there rather than regenerating.
- `bt_victory.webp` paints Tatay and the Dummy near the left and right edges, which narrower
  screens crop off. Below a 3:2 screen, `VictoryCheerers` draws their sprites flanking the
  platform instead; wide screens show only the painted pair.

All three images installed 2026-10-03.
- All three: captions cover the **bottom 35%**, so keep it low-detail. Phones in portrait only show
  the middle slice of the image, so keep anything important near the horizontal center.

**Reference files to attach** (paths from the repo root):

| Ref | File |
|---|---|
| STYLE | `public/intro/ledger_hall.webp` (the finished intro look to match) |
| TATAY | `public/tatay sprite.webp` |
| DUMMY | `public/trainers/training_tester.png` (the Training Dummy is this lab-coat scientist) |
| ELEMENTS | `public/elements/elem_fire_100.webp`, `elem_water_100.webp`, `elem_leaf_100.webp`, `elem_storm_100.webp`, `elem_light_100.webp`, `elem_shadow_100.webp` |
| PLATFORM | `public/battleui/battle_platform.webp` |

Generate `bt_tatay.webp` first; the other two reuse its arena. Every prompt is complete on its own
(style, framing and exclusions repeated inside each one), so paste it as-is.

### 1. `bt_tatay.webp` (Tatay's challenge, and the talk after the loss)
**Attach:** STYLE, PLATFORM

> Detailed high-resolution pixel art illustration in the same rendering style as the attached library scene (clean pixel clusters, dark outlines, soft dithered lighting, warm lantern and torch glow), cinematic kid-friendly fantasy storybook mood: exciting but friendly, never scary. Scene: the Curio Arena at golden dusk, a grand round colosseum of warm sandstone where young Keepers bring their Curios to battle. Tiered stone seating curves around the arena in the background, mostly empty, with a few glowing paper lanterns strung between the tiers. Tall banners hang from the arena wall in five colors (emerald, violet, amber, cyan and indigo) with simple abstract emblems only. Bronze torches burn along the wall, and warm golden motes drift in the air. On the sand floor, two round stone battle platforms face each other, each ringed with a faintly glowing circle of golden runes, like the attached platform: a near platform small in the lower-left foreground, and the main challenger's platform in the exact horizontal center of the image, slightly raised, its flat top surface at about 50% of the image height and completely EMPTY, because the game draws a character standing on it. Above that center platform, from 5% to 50% of the image height, there must be only open space: the far arena wall and a warm dusk sky with soft clouds, with no banners, torches, people, creatures or objects in that central column. There are NO characters, NO people and NO creatures anywhere in the image. Composition: low, slightly upward camera from the near side of the arena, symmetrical and balanced; the brightest warm light glows behind the center platform, like a spotlight waiting for a challenger; the bottom 35% is smooth arena sand in soft shadow with little detail; nothing important in the top 8%. Palette: warm sandstone, deep dusk blue and amber, with gold highlights. Landscape 16:9, 1920×1080. No text, letters, numbers or logos anywhere, no watermark, no UI, no frame or border.

### 2. `bt_elements.webp` (meet the Training Dummy, the element lesson)
**Attach:** STYLE, ELEMENTS (all six), your finished `bt_tatay.webp`

The first version put the sigils in the far corners, linked by a loop of arrows, and a single
loop teaches wrong matchups (leaf does not beat fire). **Installed version (2026-10-03):** the
same scene with the arrows removed and the corner icons kept (user's choice). Corners are cropped
on narrow screens, which is fine: the quiz panel's chart does the real teaching. The prompt below
is the alternative if you ever want the sigils across the top instead. The game stands the Dummy on the dirt patch (feet ~70%
down); the quiz panel covering his legs is fine.

> Detailed high-resolution pixel art illustration in the same rendering style as the attached library scene (clean pixel clusters, dark outlines, soft dithered lighting), bright, curious and cheerful. Scene: a sunny training yard just outside the Curio Arena, with the arena's sandstone wall and colorful banners from the attached arena image curving around the background and a small gate in the far wall. It is a practice ground run by a friendly inventor: wooden practice posts and round straw archery-style targets stand on the left, a sturdy wooden workbench on the right holds brass instruments, a small telescope, gears and glass flasks of bubbling colored liquids, and crates of tools sit beside it. A packed-dirt path runs from the gate toward the viewer and widens into a round, bare, worn dirt patch in the exact horizontal center of the yard, its middle at about 70% of the image height and completely EMPTY, because the game draws a character standing on it. High in the open sky between the arena walls, six small glowing element sigils float in a gentle arc from left to right, drawn exactly like the six attached element icons: fire (orange-red flame), water (blue droplet), leaf (green leaf), storm (lightning bolt), light (golden sun) and shadow (purple swirl). They sit close together in the top 5% to 22% of the image height, spread across the middle 60% of the image width, each glowing softly in its own color, with NO arrows, lines or connections between them. Below the sigils, from 22% to 70% of the image height, the center of the image is open sky, the far wall and the path, with nothing standing in it. There are NO characters, NO people and NO creatures anywhere in the image. Composition: eye-level camera, symmetrical; the targets and workbench frame the left and right edges; the bottom 25% is soft grass with little detail. Palette: sunny daylight, warm sandstone, fresh green grass, with the six element colors glowing. Landscape 16:9, 1920×1080. No text, letters, numbers or logos anywhere (the sigils are pure symbols, no writing), no arrows, no watermark, no UI, no frame or border.

### 3. `bt_victory.webp` (training complete)
**Attach:** STYLE, TATAY, DUMMY, your finished `bt_tatay.webp`

> Detailed high-resolution pixel art illustration in the same rendering style as the attached library scene (clean pixel clusters, dark outlines on characters, soft dithered lighting), bright, triumphant and celebratory. Scene: the same Curio Arena as the attached arena image, now in brilliant golden sunrise light. Bursts of golden light sparkle in the air like confetti, the five colored banners (emerald, violet, amber, cyan, indigo) flutter proudly, and the glowing rune circle on the center battle platform blazes bright gold, as if a battle was just won there. Standing on a low balcony of the arena wall on the left side, cheering: Tatay, drawn exactly like the attached Tatay character (a stocky Filipino dad with a full black beard, black sunglasses, black hair tied back in a small ponytail, a small earring, an oversized black t-shirt, a tattoo sleeve on his left forearm, a silver wristwatch, lavender shorts, and white-and-orange sneakers), grinning and clapping with both hands raised. On a matching balcony on the right side: the Training Dummy, a friendly young scientist drawn exactly like the attached lab-coat character (messy brown hair, round glasses, white lab coat over a blue shirt, navy trousers, blue sneakers), giving a big thumbs-up with a proud smile. Both characters are small in the frame, near the left and right edges, at about 35–50% of the image height. The center platform is empty and glowing; there is NO Curio and NO creature anywhere in the image. Composition: low, slightly upward camera; the blazing center platform and the sunrise behind it form the bright focal point in the middle; the bottom 35% is warm arena sand with soft long shadows and little detail; nothing important in the top 8%. Palette: radiant gold, warm sandstone and morning sky blue. Landscape 16:9, 1920×1080. No text, letters, numbers or logos anywhere, no watermark, no UI, no frame or border.

## Voice script

Record each line as its own clip: `public/sounds/voice/intro/<id>.mp3`. A missing clip is safe
(the caption shows for a reading time instead). Same workflow as `docs/intro/first-curio-intro.md`:
ElevenLabs v4, Generation 1, numbers as English words, then `tools/split_intro_vo.py`.

**Cast:** the Lorekeeper = **Gideon - Pirate** (stability 0.34 / similarity 0.70, to match the
intro). Tatay = **Rhonn Mercene - Conversational** (default settings, 0.50 / 0.75), the same voice
as the Learning Hall TikTok videos.

**Recorded 2026-10-03: all 33 clips**, Eleven v4, Generation 1 of three takes (Lorekeeper 13 + 14
lines, Tatay 6 lines), split with `tools/split_intro_vo.py` (worst match 0.86, only because Whisper
writes "one hundred" as "100"). Raw takes are not kept in the repo. Re-record a line if its text
changes.

Only one of the six `bt_elem_*` clips plays for a given player (the lead Curio's element).

| Clip id | Speaker | Line | Chars |
|---|---|---|---|
| `bt_intro_1` | Lorekeeper | Keeper, you have a challenger. And not just any challenger. | 59 |
| `bt_intro_2` | Lorekeeper | This is Tatay. He built Learning Hall. Every guild, every quest, and every Curio in this arena came from him. | 109 |
| `bt_intro_3` | Lorekeeper | Tatay tests every new Keeper himself, before they battle anyone else. | 69 |
| `bt_intro_4` | Tatay | So you're the new Keeper! Come on, show me what your Curio can do. | 66 |
| `bt_t1_arena` | Lorekeeper | This is a Keeper battle. Your Curio is on the left, and Tatay's Curio is on the right. | 86 |
| `bt_t1_skills` | Lorekeeper | These are your skills. Each one asks you questions. The more questions, the stronger the attack. Pick one! | 106 |
| `bt_t1_answer` | Lorekeeper | Answer right and your Curio strikes. Get every question right for a perfect hit. | 80 |
| `bt_t1_skip` | Lorekeeper | Stuck on a hard one? You can pay five gold to skip it, and it counts as correct. | 80 |
| `bt_t1_tickle` | Tatay | Ha! That tickles, Keeper. My Curios are level one hundred! | 58 |
| `bt_t1_locked` | Lorekeeper | Higher level Curios hit harder, and they unlock stronger skills. A locked skill opens when your Curio reaches the level shown on it. | 132 |
| `bt_t1_same_time` | Lorekeeper | In a Keeper battle, you and your rival choose at the same time. The faster Curio strikes first. | 95 |
| `bt_t2_hp` | Lorekeeper | Watch the HP bars. When a Curio's HP runs out, it faints. If all your Curios faint, the battle is over. | 103 |
| `bt_t2_utils` | Lorekeeper | These buttons help too. Rest heals your Curio. Items use things from your bag. Switch sends in another Curio from your team. | 124 |
| `bt_t3_serious` | Tatay | Alright, Keeper. Warm-up is over. Let me show you what a level one hundred skill can do! | 88 |
| `bt_lost_1` | Tatay | Good fight, Keeper! Don't feel bad. Nobody beats me on their first day. | 71 |
| `bt_lost_2` | Tatay | Level up your Curio and you'll unlock stronger skills too. Then come back for a rematch! | 88 |
| `bt_lost_3` | Lorekeeper | Every Keeper's first battle is a loss. What matters is what you do next. | 72 |
| `bt_el_1` | Lorekeeper | Time to practice on someone your own size. Meet the Training Dummy. | 67 |
| `bt_el_2` | Lorekeeper | Every Curio has an element: fire, water, leaf, storm, light, or shadow. Some elements are strong against others, and their attacks hit extra hard. | 146 |
| `bt_el_retry` | Lorekeeper | Not quite. Follow the arrow from your Curio's element. | 54 |
| `bt_el_after` | Lorekeeper | That's right! Today the Training Dummy uses that element, so your attacks will hit it extra hard. | 97 |
| `bt_elem_fire` | Lorekeeper | Your Curio is a fire Curio. Look at the chart. Which element does fire beat? | 76 |
| `bt_elem_water` | Lorekeeper | Your Curio is a water Curio. Look at the chart. Which element does water beat? | 78 |
| `bt_elem_leaf` | Lorekeeper | Your Curio is a leaf Curio. Look at the chart. Which element does leaf beat? | 76 |
| `bt_elem_storm` | Lorekeeper | Your Curio is a storm Curio. Look at the chart. Which element does storm beat? | 78 |
| `bt_elem_light` | Lorekeeper | Your Curio is a light Curio. Look at the chart. Which element does light beat? | 78 |
| `bt_elem_shadow` | Lorekeeper | Your Curio is a shadow Curio. Look at the chart. Which element does shadow beat? | 80 |
| `bt_d1_go` | Lorekeeper | Your Curio's element beats the Training Dummy's. Every hit you land will do extra damage. Show it what you learned! | 115 |
| `bt_d1_bonus` | Lorekeeper | See that big hit? That is the element bonus at work. | 52 |
| `bt_d_retry` | Lorekeeper | Even Keepers stumble. Take a breath, and let's try that again. | 62 |
| `bt_win_1` | Lorekeeper | You did it, Keeper! You faced the creator of Learning Hall, and you beat the Training Dummy. | 92 |
| `bt_win_2` | Lorekeeper | Now you know how to battle. Challenge other Keepers from the Trainers list, and visit the Training Dummy whenever you want to practice. | 135 |
| `bt_win_3` | Tatay | Here's a little gold to get you started. And when you're stronger, come find me for a rematch! | 94 |

**Total: 33 clips, 2866 characters** (Lorekeeper 2401, Tatay 465).
