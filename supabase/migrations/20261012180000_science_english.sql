-- Science in English. Rewrites the Grade 2-6 Science lessons, main-quest questions, boss-fight
-- questions and lesson drafts that were written in Filipino, a Filipino/English mix, or English
-- with Filipino words (for example "tubig (water)"), in plain, kid-friendly English. Science is
-- an English subject; the lesson generator already says so.
--
-- Same method as 20261012070100_mapeh_english.sql. Data only, in place: every row keeps its
-- id, so progress, attempts, boss records and the offline answer key all still line up.
-- Options are translated position by position, and correct_answer is not taken from this
-- file: it is re-pointed to the translated option at the same position as the row's current
-- correct_answer.
--
-- Safety: before changing anything, every row this file touches that exists must have the
-- same number of options as its translation and a correct_answer that is one of its current
-- options; otherwise the whole migration stops with an error and nothing changes. Only rows
-- whose subject is Science are updated. Rows that don't exist (an empty CI database) are
-- skipped, and re-running is a no-op.
--
-- Devices pick up the change on their own: lessons and main quests through /api/content
-- (5-minute cache), boss questions through boss_bank_signature (20261012070000).

drop table if exists _sci_quiz, _sci_question, _sci_boss, _sci_draft_summary;
create temp table _sci_quiz (id uuid primary key, summary_markdown text not null);
create temp table _sci_question (id uuid primary key, prompt text not null, options jsonb not null);
create temp table _sci_boss (id uuid primary key, question text not null, options jsonb not null, topic text);
create temp table _sci_draft_summary (id uuid primary key, summary_markdown text not null);

insert into _sci_quiz values
('014feff3-1c3a-45b9-8660-d9c955dcc100', $tr$# 🔬 Friday — Weekly Practice: Science

Quick review!

- **Physical change** = reversible | **Chemical change** = irreversible
- Melting ice = reversible; burning wood = irreversible

You are a great young scientist! 🌟$tr$),
('03fb972a-3af8-4c84-b989-58e2f27f0718', $tr$# 🔬 Friday — Weekly Practice: Science

Quick review!

- **Roberto del Rosario** — karaoke | **Thomas Edison** — light bulb
- Inventions like refrigerators improve our lives

You are a great young scientist! 🌟$tr$),
('078076a1-69f6-4657-a07c-add7bf3c0a72', $tr$# 🦎 Friday Review — Science (Grade 6)

- **Vertebrate** = has a backbone; **Invertebrate** = no backbone
- Exoskeleton vs internal skeleton

Great classification science! 🌟$tr$),
('080f3081-e019-4529-8f48-c02228d4f16e', $tr$# 🔬 Friday — Weekly Practice: Science

Quick review!

- **Pollination** = moving pollen
- **Cutting, budding, layering, grafting** — ways of propagation

You are a great young scientist! 🌟$tr$),
('0afcb4fe-a482-4dae-8310-70464e53691e', $tr$# 🍃 Science — Food Chains

Grade 4, Week 19! Let's trace who eats whom in nature. 🐛

## 🍽️ Grouping Animals by Diet
| Group | What They Eat |
|---|---|
| **Herbivores** | only plants (e.g., cow, carabao) |
| **Carnivores** | only other animals (e.g., eagle, snake) |
| **Omnivores** | both plants and animals (e.g., pig, chicken) |

## 🔗 What Is a Food Chain?
A **food chain** shows how **energy flows** from one living thing to another, starting with a plant.

**Example:** Grass → Grasshopper → Frog → Snake → Eagle

## 🇵🇭 A Food Chain Using Philippine Living Things
**Example:** Rice plant → Rat → Snake → Eagle

## 🏷️ Labeling by Feeding Group
| Organism | Feeding Group |
|---|---|
| **Rice plant** | Producer |
| **Rat** | Herbivore |
| **Snake** | Carnivore |
| **Eagle** | Carnivore |

## 🧠 Worked Example 1
*Why does every food chain start with a plant?*
- Because plants are **producers** — they make their own food and are the source of energy for the chain.

## 🧠 Worked Example 2
*In the chain Rice plant → Rat → Snake → Eagle, what is the rat's feeding group?*
- **Herbivore** — it eats only the rice plant.

## 💡 Why This Matters
Understanding food chains helps us see how all living things are **connected** in nature.

Great food chain science! 🌟$tr$),
('1034245c-b764-4fdd-a2f6-08272b48aab2', $tr$# 🌦️ Science — The Two Seasons in the Philippines

Grade 2, Week 22! Let's learn about the rainy season and the dry season in Science. 🌦️

## 🔄 Review
We learned about the tools we use to measure the weather.

## ☀️ The Dry Season
It is hot, and there is little rain. It usually happens from March to May.

## 🌧️ The Rainy Season
There is a lot of rain, and it is cooler. It usually happens from June to November, and it brings **typhoons**.

## 🔬 Observing the Weather
Scientists use a **thermometer** to measure heat and a **rain gauge** to measure rain. This helps them know which season it is.

**Key words:** dry season, rainy season, temperature, typhoon$tr$),
('1dcd22b3-50ff-419b-9641-ccf0bff87841', $tr$# 🔬 I Am a Scientist!

Welcome to Science! Let's start by being a good **observer** using our five senses. 🧪

## 👀 What Does a Scientist Do?
- A scientist **observes**, **asks questions**, and **tests** things to learn about the world.
- **Example:** Did you notice that the water is hot? That is an **observation**!

## 👁️👂👃👅✋ Our Five Senses
- **Sight (Eyes)** — we see colors and shapes
- **Hearing (Ears)** — we hear sounds
- **Smell (Nose)** — we smell things
- **Taste (Tongue)** — we taste our food
- **Touch (Skin)** — we feel hot, cold, or texture

**Example:** When you eat a mango, you use sight (color), smell (sweet smell), and taste (sweetness)!

Are you ready to be a great scientist this year? 🌟$tr$),
('2648a9b5-b8ab-43de-9691-dbc2e74a4db0', $tr$# 🏞️ Friday Review — Science (Grade 4)

- **Terrestrial** (land) · **Aquatic** (water) · **Aerial** (air)
- **Rice field** = frogs, dragonflies | **Mangrove swamp** = mangrove trees, mudskippers
- Habitats need **protection** — destroying them harms living things

Great scientist work! 🌟$tr$),
('28da8330-df11-46c3-a80a-6b6c806361d1', $tr$# 🔬 Science — Week 9: Metals Used in the Community!

Let's learn about the metals used in our community! ⚙️

## ⚙️ Kinds of Metal
- **Iron** — strong, used in buildings and tools
- **Gold** — shiny, used in jewelry
- **Silver** — also shiny, used in jewelry and in spoons and forks
- **Copper** — used in electric wires

## 🔍 Properties and Uses
- **Example 1:** Iron is strong, so it is used to make buildings.
- **Example 2:** Copper is a good conductor, so it is used for electricity.

## 💛 Why Is This Important?
- These metals are part of our everyday life.

Many metals help our community! 🌟$tr$),
('293bc0ee-4ea7-463d-9af3-ec2ba62592d1', $tr$## Matter, Mass, and Volume: Meet the Three States of Matter

- **Matter** is anything that has **mass** (the amount of "stuff" it is made of) and **volume** (the amount of space it takes up). If something is not matter, it has neither.
- Scientists sort matter into three basic **states**: **solid**, **liquid**, and **gas**.
- A **solid**, like a stone or a bench, keeps its own shape no matter what container or space it is placed in.
- A **liquid**, like water or fish sauce, does not keep its own shape -- it takes the shape of whatever container holds it.
- A **gas**, like air, also has no fixed shape, and it can even fill an entire balloon or room because it spreads out to fill available space.
- One useful first clue for sorting an object into a state of matter is simply: does it keep its own shape, or not?

| State | Example | Keeps its own shape? |
|---|---|---|
| Solid | Stone | Yes |
| Liquid | Water | No |
| Gas | Air | No |

- Even gases are matter -- blowing up a balloon shows that air takes up space (volume), and matter like air also has mass, even though it may be too light to feel with your hands alone.$tr$),
('298f425d-edb2-4817-8191-104ddb15d6a0', $tr$# 🦎 Science — Vertebrates and Invertebrates

Grade 6, Week 18! Let's classify animals by their backbones. 🦴

## 🦴 What Is a Vertebrate?
A **vertebrate** is an animal that has a **backbone (spine)**.

**Examples:** fish, frogs, lizards, birds, dogs, humans

## 🐛 What Is an Invertebrate?
An **invertebrate** is an animal that does **NOT** have a backbone.

**Examples:** insects, worms, jellyfish, starfish, crabs, snails

## 🇵🇭 Local Examples
| Group | Local Examples |
|---|---|
| **Vertebrates** | fish (milkfish), frog, bird (sparrow), dog, human |
| **Invertebrates** | centipede, worm, mud crab, snail, firefly |

## 🔍 How to Tell the Difference
- Vertebrates usually have **internal skeletons** (bones)
- Invertebrates may have **no skeleton**, a **soft body** (like worms), or an **exoskeleton** (hard outer covering, like crabs and insects)

## 🧠 Worked Example 1
*Is a crab a vertebrate or invertebrate?*
- **Invertebrate** — it has an exoskeleton (hard shell), not a backbone.

## 🧠 Worked Example 2
*Is a milkfish a vertebrate or invertebrate?*
- **Vertebrate** — fish have a backbone.

## 🧠 Worked Example 3
*Why does an insect not need an internal skeleton?*
- Because its **exoskeleton** (hard outer shell) provides support and protection instead.

## 💡 Why This Matters
Classifying animals as vertebrates or invertebrates helps scientists **organize and study** the huge diversity of animal life.

Great classification science! 🌟$tr$),
('2e6a55e6-c325-4f72-a8c6-6b27ed41a68f', $tr$# 🔬 Friday — Weekly Practice: Science

Quick review!

- **Decantation, filtering, evaporation, magnets** — separation techniques
- Salt water = use evaporation

You are a great young scientist! 🌟$tr$),
('2e6e23a5-a285-4f12-bb62-588fb178da64', $tr$# 🔬 Friday — Weekly Practice: Science

Quick review!

- What we learned: inventions, chemical properties, body systems, habitats
- Coming up next: **life cycles, food chains, forces**

You are a great young scientist! 🌟$tr$),
('31bbc711-39bf-48b2-ad9c-42f9a1e48fd2', $tr$# 🔬 Friday — Weekly Practice: Science

A quick review!

- **Observing** = using senses | **Predicting** = smart guess
- **Measuring** = finding exact size using a tool

You are a great young scientist! 🌟$tr$),
('339ca62e-6510-49ad-ae54-ce63ae59966f', $tr$# 🔬 Friday — Weekly Practice: Science

Quick review!

- **Melting** = solid→liquid | **Evaporation** = liquid→gas
- **Freezing** = liquid→solid | **Condensation** = gas→liquid

You are a great young scientist! 🌟$tr$),
('3efd4701-6d62-44f8-a3ed-29db0b6fd9d2', $tr$# 🌿 Friday Review — Science (Grade 5)

**Three groups:** **Plants** (make own food) · **Animals** (must consume) · **Microorganisms** (need a microscope)

| Structure | Purpose | Examples |
|---|---|---|
| **Tuber** | storage | potato, sweet potato |
| **Bulb** | storage | onion, garlic |
| **Rhizome** | storage | ginger, turmeric |
| **Thorns** | protection | rose, cactus |
| **Tendrils** | support/climbing | bitter gourd, sponge gourd |
| **Aerial roots** | support/anchoring | banyan, mangrove |

**Survival link:** storage → survives **drought** · thorns → survives **being eaten** · tendrils/aerial roots → survives **wind** and reaches **light**

Great scientist work! 🔎$tr$),
('412bdd24-faf0-43f0-87e8-79276b0ece2b', $tr$## How Plant Structures Help Plants Survive

- Plants often face **unfavorable conditions** such as **drought** (long dry spells), **strong wind**, or **being eaten** by animals -- and their specialized structures help them survive these challenges.
- **Storage structures** like tubers and bulbs (sweet potato, onion) store food -- and sometimes moisture -- underground. During a drought, or after a typhoon destroys the leaves, the plant can survive on these reserves and regrow later, even if the parts above ground wither or are damaged.
- **Rhizomes** (like the underground stems of taro) work the same way: after a typhoon strips away the leaves, the rhizome's stored food lets new shoots emerge weeks later.
- **Thorns** (like on calamansi branches) physically discourage grazing animals, reducing how much of the plant gets eaten compared to a thornless plant nearby.
- **Tendrils** (like on a bottle gourd vine) grip a trellis or fence tightly, helping the plant stay anchored and resist being blown down during a strong typhoon.
- **Aerial roots** (like on an orchid growing on a tree trunk) let a plant absorb moisture from rain and humid air when it has no access to soil at all.

| Structure | Threat it Helps Against |
|---|---|
| Tuber / Bulb / Rhizome | Drought, being cut down (regrowth) |
| Thorn | Being eaten |
| Tendril | Strong wind |
| Aerial root | Lack of soil/moisture access |

- Each structure is matched to a specific kind of threat -- this is why a plant growing where droughts, strong winds, AND grazing animals are all common would benefit from having **several different structures together**, rather than relying on just one, since no single structure protects against every possible danger.$tr$),
('43068404-fbcb-44e9-ba66-de5323c2a896', $tr$# 🔬 Science — Week 7: Taking Proper Care of Materials

Let's learn how to handle and throw away materials the right way! ♻️

## ♻️ Taking Proper Care of Materials
- **Reuse** — use things again, like using a biscuit container to keep small things.
- **Recycle** — make materials like paper, plastic, and glass into something new.
- **Proper Disposal** — throw extra cooking oil in the trash bin, not in the sink or drain.

## 🔍 Example
- Instead of just throwing away an old bottle, you can use it as a **plant pot**!

## 💛 Why Is This Important?
- Taking proper care of materials protects our nature.

Let's help nature by taking proper care of materials! 🌟$tr$),
('43987b72-a52e-4f3f-a8ca-4c63670ac84c', $tr$# 🔬 Friday — Weekly Practice: Science

Quick review!

- **Muscular, skeletal, digestive, circulatory, respiratory** systems
- A plant's root system takes in water

You are a great young scientist! 🌟$tr$),
('4d051d82-6db8-4a10-a1d8-42a2a67c8d50', $tr$## Measuring Volume and Temperature

- To measure the **volume** of a liquid, scientists use a **graduated container** (graduated cylinder), marked with units like **milliliters (mL)** and **liters (L)**. Remember: 1 L = 1000 mL.
- To read a graduated container correctly, look at the liquid's curved surface (called the **meniscus**) at **eye level**, and read the measurement at the **bottom of the curve** -- looking from above or below can give an inaccurate reading.
- To measure **temperature**, scientists use a **thermometer**, and in the Philippines we record readings in **degrees Celsius (°C)**.
- A measurement is only useful if it includes its **unit**. Writing "28" with no unit could mean 28°C, 28 mL, or something else entirely -- always write the unit!

| Tool | Measures | Common Units |
|---|---|---|
| Graduated container | Volume | mL, L |
| Thermometer | Temperature | °C |

- Example: Mrs. Nena measuring milk for a recipe would use a graduated container marked in mL or L, while checking if a bowl of soup is cool enough for a baby to eat would call for a thermometer reading in °C.
- Using the same unit consistently (always mL, for example, instead of switching to an unmarked cup) is important so measurements can be fairly compared by anyone reading them.$tr$),
('4ddb5f28-2ad9-4b41-a41b-aa1ec943172a', $tr$## Comparing States of Matter: Shape AND Volume

- Last week we sorted matter by shape alone. This week we look more closely using **two separate properties**: **shape** and **volume**.
- A **definite (fixed) shape** means the matter keeps its own shape no matter what container it is in.
- A **definite (fixed) volume** means the amount of space the matter takes up stays the same, even if it is moved to a different container.
- **Solids** (like a wooden bench) have BOTH a definite shape and a definite volume.
- **Liquids** (like milk) have a definite volume but an **indefinite shape** -- pour milk from a tall glass into a wide bowl, and it looks different, but it is still the same amount (say, 250 mL).
- **Gases** (like air in a basketball) have **neither** a definite shape nor a definite volume -- they spread out to completely fill whatever space contains them.

| State | Shape | Volume |
|---|---|---|
| Solid | Definite | Definite |
| Liquid | Indefinite | Definite |
| Gas | Indefinite | Indefinite |

- A tricky example: pouring rice grains into a pile makes the pile's overall shape change, but each individual grain is still a solid with its own fixed shape -- only the whole pile's outline changes.
- Using two properties instead of one gives scientists a clearer, more accurate way to describe and compare matter.$tr$),
('4f8fc4b9-d88a-4c05-b71b-2c6e3708e795', $tr$# 🔬 Friday — Weekly Practice: Science

Quick review!

- **Winnowing** = wind | **Sieving** = mesh
- Winnowing is used to separate rice grains from husks

You are a great young scientist! 🌟$tr$),
('50746883-0fbe-4576-842b-ca32f3745897', $tr$# 🔬 Science — Review: Weather, Matter, and Forces

Grade 2, Week 27! Let's look back at what we learned in Science. 🔬

## 🔄 What We Learned
- **Weather:** measuring tools (thermometer, rain gauge, wind vane), the two seasons, how weather affects our lives
- **Matter:** solid, liquid, gas; melting, evaporation
- **Force:** push and pull; simple machines (lever, wheel-and-axle)

## 🧠 Putting It Together
All of these are part of our **physical environment**. We learned about the weather, the things around us, and how things move.

## 🎯 Getting Ready
Next term, we will learn more about the sky and caring for the environment.

**Key words:** weather, matter, force, simple machine$tr$),
('52760f4a-2d97-48c3-97eb-5e337d98ed9a', $tr$# 🔬 Friday — Weekly Practice: Science

Quick review!

- **Burnable** = can catch fire | **Biodegradable** = can rot away
- Understanding chemical properties keeps us safe

You are a great young scientist! 🌟$tr$),
('528f0683-e9aa-4e09-9814-a021fb26d2ad', $tr$# 🔬 Friday — Weekly Practice: Science

A quick review!

- **Observing, predicting, measuring** — skills of a scientist
- **Ruler** — measures length | **Hand lens** — for seeing small details

You are a great young scientist! 🌟$tr$),
('5d7d6896-86f1-4b69-af34-1825d3845b4c', $tr$# 🔬 Science — Science Skills

Grade 3, Week 11! Let's review the skills scientists use every day. 🔬

## 👀 Observing, Predicting, and Measuring
- **Observing** means using your senses to study something carefully.
- **Predicting** means making a smart guess → *"I think it will rain because the clouds are dark."*
- **Measuring** uses a tool, like a ruler or thermometer, to find exact amounts.

## 🐾 Living Things
Living things share characteristics like **reproducing** — making more of their own kind. Being green is NOT a requirement to be alive!

## 🗂️ Classifying
**Classifying** means grouping objects according to their properties, based on careful observation.

**Key words:** observing, predicting, measuring, classifying, living things$tr$),
('5de228d7-74ab-4708-a091-627b5d183729', $tr$# ⚗️ Science — Changes of State, Mixtures, and Separation

Final Science lesson of Term 1, Grade 6. 🔬

## 🌡️ Changes of State
Matter changes state when **heat energy** is added or removed.

| Change | From → To | Heat |
|---|---|---|
| **Melting** | solid → liquid | **absorbed** |
| **Freezing** | liquid → solid | **released** |
| **Evaporation** | liquid → gas | **absorbed** |
| **Condensation** | gas → liquid | **released** |
| **Sublimation** | solid → gas directly | **absorbed** |

**Flowchart:**
```
SOLID --melting--> LIQUID --evaporation--> GAS
SOLID <--freezing-- LIQUID <--condensation-- GAS
```

**Everyday example:** Water droplets form outside a cold glass because **water vapor in the air condenses** — the water did not leak through the glass.

## 🔄 Physical vs Chemical Change

| | **Physical change** | **Chemical change** |
|---|---|---|
| New substance? | **No** | **Yes** |
| Reversible? | usually **yes** | usually **no** |
| Examples | melting ice, tearing paper, dissolving salt | burning wood, rusting iron, cooking egg |

**Why physical changes are reversible:** only the **arrangement** of particles changes — the substance itself is unchanged. Melted ice is still water.

**Why chemical changes are irreversible:** the particles **rearrange into new substances** with new properties. Ash cannot become wood again.

**Signs of a chemical change:** color change, gas bubbles, heat or light released, new odor, precipitate forms.

## 🧪 Mixtures

**Uniform (homogeneous)** — evenly distributed, looks like one substance
- **Solution** — solute fully dissolved (salt water, air)
- Particles are **too small to see** and **do not settle**

**Non-uniform (heterogeneous)** — parts are visible
- **Suspension** — particles **settle** on standing (sand in water, muddy water)

**Air is a mixture:** about **78% nitrogen**, **21% oxygen**, plus **carbon dioxide** and **water vapor**.

## 🔧 Separation Techniques

| Technique | How it works | Best for |
|---|---|---|
| **Decantation** | pour off the liquid, leave settled solid | sand and water |
| **Filtering** | pass through filter paper | solid pieces in liquid |
| **Evaporation** | boil off the liquid, leave the solid | recovering **salt** from seawater |
| **Sieving** | shake through a mesh | separating by **particle size** |
| **Winnowing** | let wind blow away lighter parts | **rice grain** from husk |
| **Magnetism** | magnet attracts magnetic material | iron filings from sand |
| **Picking** | remove by hand | stones from rice |
| **Scooping** | lift floating material out | leaves from water |

**Why it matters:** separation gives us **useful products** — salt from seawater, clean drinking water, milled rice.

## 🔬 Features of a Fair Test
A **fair test** is a valid experiment.
1. Change only **ONE variable** (the independent variable)
2. Keep **all others the same** (controlled variables)
3. Measure the **result** (the dependent variable)
4. **Repeat** trials for reliability
5. Include a **control** for comparison

**Example:** Testing whether temperature affects how fast sugar dissolves — **change only the water temperature**. Keep sugar amount, water amount, and stirring **identical**. Otherwise you cannot tell which factor caused the result.

Great scientist work this term! 🔎$tr$),
('5e4ed77e-577b-4462-be96-90e9bf618ad6', $tr$# 🔬 Friday — Weekly Practice: Science

Quick review!

- **Heart, blood, blood vessels** — circulatory system
- **Arteries** = away from heart | **Veins** = back to heart

You are a great young scientist! 🌟$tr$),
('5e906b74-0f06-40b6-bdc3-298cfa221199', $tr$# 🔬 I Am a Scientist!

Let's review the skills of a scientist! 🧪

## 🔍 Skills of a Scientist
- **Observing** — looking carefully at the details
- **Predicting** — guessing what may happen based on evidence
- **Measuring** — using a ruler or a weighing scale

## 🧰 Science Tools
- **Ruler, hand lens, weighing scale** — for different experiments

## 🔬 Example
- You measure the length of your pencil using a ruler — that is a measuring experiment!

Are you ready to be a great scientist this year? 🌟$tr$),
('60f9ae11-fb37-487f-abf9-68fff3c16d2b', $tr$# 🔬 Friday — Weekly Practice: Science

A quick review!

- **Ruler** — for measuring | **Scissors** — for cutting
- **Tinkering** — trying things out and playing with tools

You are a great young scientist! 🌟$tr$),
('62747fc3-9531-4b33-93b2-0b54ba81fdcb', $tr$# 🔬 Friday — Weekly Practice: Science

Quick review!

- **Vertebrates** = have a backbone | **Invertebrates** = no backbone
- Examples: Philippine eagle (vertebrate), coconut crab (invertebrate)

You are a great young scientist! 🌟$tr$),
('62df07f2-b21c-4a50-82e2-324462e3e4ca', $tr$## Specialized Plant Structures: Rhizomes, Tubers, Bulbs, Thorns, Aerial Roots, and Tendrils

- Many plants have **specialized structures** that are not just ordinary stems, roots, or leaves -- each is shaped for a specific job: storage, protection, or support.
- A **rhizome** is an underground stem that spreads sideways and sprouts new shoots along its length. Example: ginger and turmeric.
- A **tuber** is a swollen underground stem that stores food, usually as a single rounded structure. Example: sweet potato.
- A **bulb** is made of layered, fleshy leaf-like scales wrapped around a bud, storing food underground. Example: onion.
- **Thorns** are sharp, pointed growths along a stem, used mainly for protection. Example: calamansi and guava branches.
- **Aerial roots** are roots that hang or grow in open air instead of into soil, often absorbing moisture directly from the air and rain. Example: orchids or banyan trees growing on a tree trunk.
- **Tendrils** are thin, curly, thread-like structures that help a climbing plant grip a support. Example: bottle gourd and bitter gourd vines.

| Structure | Example | Main Function |
|---|---|---|
| Rhizome | Ginger | Underground spreading stem, sprouts shoots |
| Tuber | Sweet potato | Stores food underground |
| Bulb | Onion | Stores food in layered scales |
| Thorn | Calamansi | Protection from being eaten |
| Aerial root | Orchid | Absorbs moisture from air |
| Tendril | Bottle gourd vine | Climbing/support |

- Telling these structures apart takes careful observation: a rhizome spreads with multiple shoot points, a tuber is a single solid swollen stem, and a bulb is made of wrapped layers around a bud. Not every climbing plant uses tendrils either -- some simply twine their whole stem around a support instead.$tr$),
('68bdd5ef-0007-4a6d-8014-54c14e70eef8', $tr$## Designing Your Own Investigation: A Full Example with Evaporation

- A strong scientific investigation starts with a **testable question** -- one that can actually be answered by observing or measuring something, unlike an opinion question like "which tastes best?"
- Example testable question: "Does the type of liquid affect how fast it evaporates?" -- comparing, say, water and milk, or vinegar and alcohol.
- For this kind of comparison, the **variable** is the type of liquid, while the **controls** (kept the same) should include the amount of liquid, the type and size of container, and the location/temperature where both are placed.
- A fair setup uses **identical containers**, **equal amounts** of each liquid, placed in the **same location** at the **same time** -- changing only the type of liquid.
- Watch out for hidden extra variables! If one cup sits in full sun and the other in shade, you cannot tell whether the liquid type or the sunlight caused any difference in evaporation -- the fix is to place both cups in the exact same location.

| Part of the Investigation | Example (Water vs. Milk) |
|---|---|
| Testable question | Does the type of liquid affect evaporation rate? |
| Variable | Type of liquid (water vs. milk) |
| Controls | Amount of liquid, container type, location |
| Conclusion | States which liquid evaporated faster, based on findings |

- A good conclusion directly answers the tested question using the findings -- for example, "Water evaporated faster than milk under the same conditions in this investigation" -- rather than an opinion like "water is better."
- This same approach (clear question, one variable, several controls) can be extended to testing three or more liquids at once, as long as every container, amount, and location stays identical except for the liquid type.$tr$),
('699c130f-738c-4e8d-a9d8-32f4c660e71b', $tr$# 🔬 Friday — Weekly Practice: Science

A quick review!

- **Shaping, pressing, hammering, cutting** — ways to change materials
- These make materials useful

You are a great young scientist! 🌟$tr$),
('71e57f16-6f01-40f4-b56b-05224384edd8', $tr$# 🔬 Friday — Weekly Practice: Science

Quick review!

- **Fair test** = testing only one factor
- **Weighing scale, ruler, thermometer** — science tools

You are a great young scientist! 🌟$tr$),
('7499df98-d522-4fe0-bcdc-00d932d0dc9b', $tr$# 🔬 Friday — Weekly Practice: Science

A quick review!

- Living: **animals, plants** | Nonliving: **rock, metal**
- Once-living materials: **dried leaf, wood, cotton**
- We can find these at home, at school, and in the yard

You are a great young scientist! 🌟$tr$),
('85aa006a-9de4-49a6-882a-6e310d42ef9d', $tr$# 🌿 Science — Classifying Living Things & Plant Survival Structures

Final Science lesson of Term 1, Grade 5. 🔬

## 🧬 Three Groups of Living Things

| Group | Key characteristics | Examples |
|---|---|---|
| **Plants** | make their own food (**photosynthesis**), mostly stay in one place, have cell walls | mango tree, fern, moss |
| **Animals** | cannot make own food, **move** to find it, respond quickly | tamaraw, tilapia, ant |
| **Microorganisms** | too small to see without a **microscope** | bacteria, yeast, amoeba |

**Key difference:** plants **produce** their food; animals must **consume** it.

## 🔬 About Microorganisms
Not all are harmful!
- **Helpful:** yeast makes bread rise; bacteria turn milk into yogurt; decomposers recycle nutrients
- **Harmful:** some bacteria and viruses cause disease

## 🌱 Specialized Plant Structures
Plants developed special parts to **survive difficult conditions**.

### For STORAGE
- **Tuber** — swollen underground stem storing starch → **potato**, **sweet potato**
- **Bulb** — layered underground leaves storing food → **onion**, **garlic**
- **Rhizome** — horizontal underground stem → **ginger**, **turmeric**

**Why it helps:** during **drought** or dry season, the plant lives off stored food and regrows later.

### For PROTECTION
- **Thorns** — sharp points → **rose**, **bougainvillea**, **cactus**

**Why it helps:** discourages animals from **eating** the plant.

### For SUPPORT
- **Tendrils** — thin coiling threads that grip → **bitter gourd**, **sponge gourd**, **grape vine**
- **Aerial roots** — roots above ground → **banyan**, **orchid**, **mangrove**

**Why it helps:** tendrils let a weak stem climb toward **sunlight** without growing a thick trunk. Aerial roots **anchor** the plant against strong wind and can absorb moisture from air.

## 🧠 Worked Example 1
*Why can a sweet potato plant survive a long dry season?*
- Step 1: Sweet potato forms **tubers** underground.
- Step 2: Tubers store **starch (food)** and **water**.
- Step 3: When leaves die in drought, the tuber **survives** and sprouts again when rain returns. ✅

## 🧠 Worked Example 2
*A mangrove grows in soft, muddy, wave-battered soil. Which structure helps most?*
- Step 1: Soft mud gives poor grip.
- Step 2: **Aerial roots** spread wide above and into the mud.
- Step 3: They **anchor** the tree against waves and wind. ✅

Great scientist work this term! 🔎$tr$),
('8931da6f-b394-4f13-8bfa-1271ba82b225', $tr$# 🔬 Science — Week 2: Science Skills and Science Tools

Let's learn the skills for using science tools! 🔬

## 🧰 Science Tools
- **Ruler** — measures length
- **Scissors** — for cutting
- **Balloon** — for experiments about air
- **Modeling clay** — for making models

## 🔍 Science Skills
- **Asking questions** — a scientist needs to ask questions to learn.
- **Playing with materials (tinkering)** — trying things out and playing with tools to find out how they work.

## 🔬 Example
- Use a balloon to find out how air moves inside it.

Great young scientists use the right tools! 🌟$tr$),
('8c3c91c5-9dec-44d1-92d9-3c1aefddc060', $tr$# 🔬 Friday — Weekly Practice: Science

A quick review!

- **Reuse** = use again | **Recycle** = make into something new
- Throw extra cooking oil in the trash bin

You are a great young scientist! 🌟$tr$),
('96137795-3270-4ece-8be0-0445ec12c246', $tr$# 🔬 Science — Week 6: Changes That Can Be Harmful

Let's learn how some changes in materials can be harmful! ⚠️

## ⚠️ Harmful Changes
- Burning trash at home gives off **smoke** that is bad for the air.
- Throwing trash away the wrong way harms **nature** and animals.

## 🌍 Effects on the Environment
- These changes affect both **living things** (people, animals, plants) and **non-living things** (water, air, soil).

## ✅ What Should We Do?
- Do not burn trash; throw it properly in the trash bin.

Let's take care of our environment! 🌟$tr$),
('9f916929-25cb-42ea-82b7-c2e9b8c42be1', $tr$# 🔬 Friday — Weekly Practice: Science

Quick review!

- Science helps solve problems in the community
- **Grouping, communicating, open-mindedness** — science process skills

You are a great young scientist! 🌟$tr$),
('a462099c-3e49-42af-8744-09430ac84620', $tr$# 🌦️ Science — How Weather Affects Our Daily Life

Grade 2, Week 23! Let's learn how weather is connected to our lives. 🌦️

## 🔄 Review
We learned about the two seasons in the Philippines.

## 🌤️ How Weather Affects Our Clothes
In the dry season, wear thin clothes. In the rainy season, wear a raincoat and bring an umbrella.

## 🏠 How Weather Affects Our Activities
On a sunny day, we can play outside. When there is heavy rain or a typhoon, we must stay inside the house to be safe.

## 🌾 How Weather Affects Farming
Farmers plant based on the season too. Some crops are better to plant in the rainy season because there is enough water.

Knowing about the weather helps us **get ready and make better choices**.

**Key words:** clothes, activities, farming, getting ready$tr$),
('a5fe88ad-a4cc-4bc1-911e-46c467236174', $tr$# 🔬 Friday — Weekly Practice: Science

Quick review!

- **Rusting, cooking** — chemical changes
- Ask an adult for help with reactive materials

You are a great young scientist! 🌟$tr$),
('a776fc82-7863-4746-a4b1-8a03e51c783b', $tr$# 🔬 Science — Week 1: Science in Everyday Life

We can see science all around us every day! 🌍

## 🔍 Science in Our Surroundings
- Many things and events around us can be **explained by science**.
- **Example 1:** Why does a boat float on water? (The science of buoyancy!)
- **Example 2:** Why does it rain? (The science of the water cycle!)

## 🌦️ Examples at Home
- Cooking food — materials change their form
- Using lights — the idea of energy

## 🏡 Examples in the Community
- Growing plants in a garden
- Using machines in the market

Science is everywhere — try to find it every day! 🌟$tr$),
('b0671c84-43f5-4834-951e-d8107d93a24c', $tr$# 🔬 Friday — Weekly Practice: Science

A quick review!

- Living things **breathe, eat, grow, and move**
- Nonliving things do not breathe or grow
- Example: **dog** (living), **rock** (nonliving)

You are a great young scientist! 🌟$tr$),
('b17b5ac8-8728-40bb-bbfa-3aa102c8dfc4', $tr$# 🔬 I Am a Scientist!

Let's review our skills as scientists! 🧪

## 🔍 Skills of a Scientist
- **Observing** — looking carefully at details
- **Predicting** — guessing what might happen based on evidence
- **Measuring** — using a ruler or a weighing scale to find the exact amount

## 🧰 Science Tools
- **Ruler** — measures length
- **Hand lens** — for seeing small details
- **Modeling clay** — for making models

## 🔬 Examples of Observing
- **Example 1:** You notice that water dries fast in the sun — that is an observation!
- **Example 2:** You measure the length of your pencil with a ruler.

Are you ready to be a great scientist this year? 🌟$tr$),
('b2ad450f-37b8-4053-8f6a-a479b5531ccd', $tr$# 🌏 Science — Philippine Seasons and Earth's Rotation

Grade 6, Week 26! Let's learn why we experience day, night, and seasons! 🌏

## 🔄 Review
We learned about volcanoes and PHIVOLCS Alert Levels.

## 🌏 Earth's Rotation: Day and Night
The Earth **rotates** on its axis once every 24 hours, causing day and night as different parts face or turn away from the Sun.

## ☀️ Philippine Seasons
The Philippines experiences two main seasons:
- **Dry season** — roughly March to May
- **Rainy (wet) season** — roughly June to November

## 🔍 What Causes Seasons Globally?
Globally, seasons are caused by Earth's **tilted axis** as it revolves around the Sun, changing how directly sunlight hits different regions.

## 🎯 Why This Matters
Understanding Earth's rotation and seasons helps explain daily and yearly patterns that affect agriculture, weather, and daily life.

**Key words:** rotation, axis, revolution, dry season, rainy season$tr$),
('baadb387-4457-479a-a49d-08318d371234', $tr$# 🔬 Friday — Weekly Practice: Science

Quick review!

- **Observing, predicting, measuring** — skills of a scientist
- **Ruler** — measures length | **Weighing scale** — measures weight

You are a great young scientist! 🌟$tr$),
('babfc23c-c735-4cc7-82f1-c5cb1f122c7d', $tr$# 🔬 Friday — Weekly Practice: Science

A quick review!

- **Hard** = not soft | **Shiny** = gleams | **Stretchable** = can be stretched
- Physical properties describe how a solid looks and feels

You are a great young scientist! 🌟$tr$),
('bd990290-5f57-4b97-82ee-425434584eeb', $tr$# 🔬 Friday — Weekly Practice: Science

Quick review!

- **Solution** = evenly spread | **Suspension** = not evenly spread
- Air = a mixture of oxygen, carbon dioxide, nitrogen

You are a great young scientist! 🌟$tr$),
('be5c1c5a-322c-4dd5-82bf-805dcc1c4986', $tr$# 🔬 I Am a Scientist!

Let's review our skills as scientists before we begin! 🧪

## 🔍 Skills of a Scientist
- **Observing, predicting, measuring** — the main skills.
- **Fair test** — testing one factor while keeping all the others the same.

## 🧰 Science Tools
- **Weighing scale, ruler, thermometer** — for different experiments.

## 🔬 Example
- You measure the temperature of water using a thermometer before and after it is heated.

Are you ready to be a great scientist this year? 🌟$tr$),
('c1fc8a3b-510a-4abd-861d-26cacd1201d7', $tr$# 🌦️ Friday Review — Science (Grade 2)

- How weather affects our clothes, activities, and farming

Great job this Science term! 🌟$tr$),
('c2b43836-8250-490a-b9ee-d851b2902730', $tr$# 🌱 Science — Plants in Our Community

Welcome to Term 2, Grade 2! Let's explore the plants around us. 🌿

## 🌳 Types of Plants We See
- **Trees** — tall with a thick trunk (mango, narra, acacia)
- **Shrubs** — smaller, bushy, many stems (gumamela, santan)
- **Vegetables** — grown for eating (kangkong, eggplant, tomato)
- **Flowers** — grown for their bright blooms (sampaguita, rosal)

## 🌿 The Basic Parts of a Plant
| Part | Job |
|---|---|
| **Root** | holds the plant in the ground; takes in **water** and nutrients |
| **Stem** | carries water up; **holds up** the plant |
| **Leaf** | makes **food** using sunlight |
| **Flower** | attracts insects to help make **seeds** |
| **Fruit** | protects the **seeds** inside |
| **Seed** | grows into a **new** plant |

## 🧠 Worked Example 1
*Why do plants need roots?*
- Step 1: Roots grow **underground**.
- Step 2: They **soak up water** from the soil like a sponge.
- Step 3: They also **hold the plant steady** so wind doesn't blow it over. ✅

## 🧠 Worked Example 2
*A mango tree has fruit with a seed inside. What is the fruit's job?*
- The **fruit** protects the **seed** while it grows, and helps it travel (animals eat the fruit and drop the seed elsewhere). ✅

## 🔍 Look Around You
- The **kangkong** in your meal has **leaves** you eat
- The **tomato** you slice is actually a **fruit** with seeds inside
- The **sampaguita** flower makes a sweet smell to attract **bees**

## 💧 What Plants Need to Grow
- **Sunlight** — for leaves to make food
- **Water** — taken in by roots
- **Air** — plants breathe too!
- **Good soil** — full of nutrients

Great plant explorer! 🌸$tr$),
('cd1259a3-5fab-46e5-a2ff-a58200d0dc9a', $tr$# 🔬 Friday — Weekly Practice: Science

Quick review!

- Fair test: change **only one factor**
- You need **at least 3 trials**

You are a great young scientist! 🌟$tr$),
('d268fe17-a72e-4ad9-a022-3f127e3993f3', $tr$# 🔬 Friday — Weekly Practice: Science

A quick review!

- Five basic needs: **air, food, water, space, shelter**
- Plants use **sunlight** to make food
- Every living thing has needs

You are a great young scientist! 🌟$tr$),
('d7946bab-b530-40cb-aa45-c4c4cc5d4410', $tr$# 🔬 Friday — Weekly Practice: Science

A quick review!

- **Iron** = strong | **Gold/Silver** = jewelry
- **Copper** = electric wires

You were a great young scientist this term! 🌟$tr$),
('d9db3ae4-eba3-45ef-92ae-e053f89af72e', $tr$# 🔬 Science — Review: Movement, Sound, Light, and Non-Living Things

Grade 3, Week 27! Let's look back at what we learned in Science. 🔬

## 🔄 What We Learned
- **Movement:** natural causes, people, weight, surface
- **Sound and light:** how they are made, how they can be harmful
- **Non-living things:** rocks, soil, water, air, metal
- **Useful products:** made from raw materials

## 🧠 Putting It All Together
All of these help us understand our **physical environment** — how things move, how sound and light are made, and how natural materials become useful.

## 🎯 Getting Ready
Next term, we will learn more about weather and space.

**Key words:** movement, sound, light, raw materials$tr$),
('da1d98f5-411f-4a25-a842-e1e4f4b3e53d', $tr$# 🔬 Friday — Weekly Practice: Science

Quick review!

- Burning wood is a permanent change
- Avoid burning trash to keep the air clean

You are a great young scientist! 🌟$tr$),
('e02525f3-89ef-43d4-b2d7-613ff249a649', $tr$# 🔬 Friday — Weekly Practice: Science

A quick review!

- We can see **science** around us every day
- Examples: **cooking**, **using lights**, **water cycle**

You are a great young scientist! 🌟$tr$),
('e3ff64ba-a1e6-49d0-94c3-d58a4198013b', $tr$# 🔬 Science — Week 8: Making Solid Materials Useful

Let's learn how materials are made useful! 🔨

## 🔨 Ways to Change Materials
- **Shaped** — the material is given a form, like clay made into a pot
- **Pressed** — squeezed or pressed, like when making juice
- **Hammered** — pounded to give it a shape, like iron made into a spoon
- **Cut** — cut to get a new shape, like paper made into a book

## 🔍 Example
- A piece of wood can be **cut** and **shaped** to make a chair.

There are many ways to make materials useful! 🌟$tr$),
('e9d54e41-c33c-4171-868b-e01bbdb9fca9', $tr$# 🔬 Friday — Weekly Practice: Science

A quick review!

- **Hard** = does not bend easily | **Shiny** = sparkles | **Stretchable** = can be stretched
- Properties help us choose the right material

You are a great young scientist! 🌟$tr$),
('ebd07ffe-46db-45b6-842d-5533d5420fe4', $tr$# 🌦️ Friday Review — Science (Grade 2)

- The two seasons in the Philippines

Great job in Science! 🌟$tr$),
('f0775302-afaf-4f5a-a00d-3b3b2334e7d4', $tr$# 🔬 Friday — Weekly Practice: Science

A quick review of our five senses!

- **Eyes** — sight | **Ears** — hearing | **Nose** — smell
- **Tongue** — taste | **Skin** — touch
- A scientist **observes** and **asks questions**

You are a great young scientist! 🌟$tr$),
('f5093982-5fcb-4d37-aad9-09b32b94407b', $tr$## Changes of State: Melting, Freezing, Evaporation, and Condensation

- Heating and cooling matter can cause it to **change state** -- the amount of matter stays the same, but whether it is solid, liquid, or gas can change.
- **Melting**: heating turns a solid into a liquid (ice into water). The exact temperature this happens at is called the **melting point**.
- **Freezing**: cooling turns a liquid into a solid (water into ice) -- the reverse of melting.
- **Evaporation**: heating turns a liquid into a gas (damp clothes drying in the sun, water disappearing into the air).
- **Condensation**: cooling turns a gas back into a liquid (water droplets forming on a cold glass of coconut juice, or on the underside of a pot lid).
- The temperature at which a liquid turns into a gas by boiling is called the **boiling point** -- water's boiling point is 100°C.

| Process | From → To | Caused by |
|---|---|---|
| Melting | Solid → Liquid | Heating |
| Freezing | Liquid → Solid | Cooling |
| Evaporation | Liquid → Gas | Heating |
| Condensation | Gas → Liquid | Cooling |

- These changes can happen back and forth -- water can freeze into ice, then melt back into water again. A pot of boiling water with a lid shows both evaporation (water becomes steam) and condensation (steam turns back to droplets on the cooler lid) happening together.
- Different materials have different melting points -- butter melts at a lower temperature than wax, so under the same warm sunlight, the butter would likely melt first.$tr$),
('f7d35eff-c614-48d0-8920-47eb5c506bf0', $tr$# 🔬 Friday — Weekly Practice: Science

Quick review!

- **Terrestrial** = land | **Aquatic** = water | **Aerial** = air
- Every habitat has what its animals need

You are a great young scientist! 🌟$tr$),
('f9344fd0-c1a1-4660-b7da-fe30261730c2', $tr$# 🔬 Science — Handling and Disposing Materials Properly

Last Science lesson of Term 1, Grade 3! Let's protect our environment. 🌏

## ♻️ The 3 Rs
- **Reduce** — use **less** in the first place
- **Reuse** — use something **again** instead of throwing it away
- **Recycle** — turn old material into something **new**

## 🗑️ Sorting Our Waste
| Type | Examples | Where it goes |
|---|---|---|
| **Biodegradable** | food scraps, leaves, paper | compost pit |
| **Non-biodegradable** | plastic, glass, metal | recycling bin |
| **Hazardous** | batteries, broken glass, used oil | special disposal |

## ⚠️ Handling by Property
How we handle a material depends on its **properties**.

- **Sharp** (broken glass) → wrap in **thick paper** before throwing; never touch with bare hands
- **Liquid and greasy** (used cooking oil) → **never** pour into the sink or canal; it clogs pipes and pollutes water. Put it in a **sealed container** and place in the garbage.
- **Breakable** (glass jars) → carry with **both hands**, store low
- **Light and blowable** (plastic bags) → keep **covered** so wind does not scatter them

## 🧠 Worked Example 1
*Mom finished frying and has leftover oil. What should she do?*
- Step 1: Oil is **liquid and greasy** — it must not go down the drain.
- Step 2: Let it **cool** first.
- Step 3: Pour into a **sealed container**.
- Step 4: Place it in the **garbage**. ✅

## 🧠 Worked Example 2
*You have an empty plastic bottle. What is the BEST choice?*
- Throwing it away → the bottle is wasted ❌
- **Reusing it as a plant pot or water container** → best ✅
- Burning it → releases harmful smoke ❌

## 🌱 Why It Matters
Proper disposal keeps our **water clean**, prevents **floods** from clogged canals, and protects **animals** that might eat or get trapped in trash.

Great scientist work this term! 🔎$tr$),
('fb85d9c6-f069-466e-a7fa-c12afbe17e31', $tr$# 🔬 Friday — Weekly Practice: Science

Quick review!

- **Streetlights** = safety at night | **Water pumps** = clean water
- Inventors solve problems

You are a great young scientist! 🌟$tr$),
('fcaba4ad-eedd-4d89-be8f-f92282bea947', $tr$# 🏞️ Science — Habitats of Philippine Animals and Plants

Grade 4, Week 17! Let's explore where animals and plants live. 🌏

## 🏞️ What Is a Habitat?
A **habitat** is the **natural environment** where an animal or plant **lives and grows**.

## 🗺️ Three Main Habitat Types

| Habitat | Meaning | Examples |
|---|---|---|
| **Terrestrial** | on **land** | forest, garden, grassland |
| **Aquatic** | in **water** | river, lake, sea |
| **Aerial** | in the **air** (mostly) | high in trees, cliffs |

## 🌾 Philippine Habitats and Their Living Things

**Garden**
- Plants: tomato, hibiscus
- Animals: butterflies, bees, earthworms

**Rice Field**
- Plants: rice plants
- Animals: dragonflies, frogs, snails

**Seashore**
- Plants: mangrove seedlings
- Animals: crabs, starfish

**Mangrove Swamp**
- Plants: mangrove trees
- Animals: mudskippers, small fish, birds

## 🧠 Worked Example 1
*A frog lives in a rice field. What type of habitat is this, and is the frog terrestrial or aquatic?*
- The rice field is a **mixed habitat** — the frog uses **both** land and water, showing adaptability.

## 🧠 Worked Example 2
*Why do mangrove trees grow well in swamps?*
- Mangroves have **special roots** that let them survive in **salty, muddy water** — perfectly adapted for that habitat.

## 💡 Why Habitats Matter
Each living thing is **adapted** to survive in its specific habitat. Destroying a habitat (like cutting mangroves) **harms** the living things that depend on it.

Great scientist work! 🌟$tr$),
('fefaad09-85db-4f6e-8aec-7e3d7f88377b', $tr$# 🔬 Friday — Weekly Practice: Science

A quick review!

- Burning trash is bad for the air
- Throw trash away properly to take care of nature

You are a great young scientist! 🌟$tr$);

insert into _sci_question values
('01195b48-60a3-4faa-b533-377b00872fc2', $tr$What is a weighing scale used for?$tr$, $tr$["Measuring weight", "Measuring temperature", "Measuring length", "Measuring time"]$tr$::jsonb),
('03a250a7-f962-4e49-935b-30b12b99e41f', $tr$What is a ruler used for?$tr$, $tr$["Measuring length", "Cutting", "Sticking things together", "Erasing"]$tr$::jsonb),
('052f4016-c952-452e-89e9-83f6d49c4322', $tr$How does the dry season affect our daily life?$tr$, $tr$["We need to drink lots of water and wear thin clothes", "We need to wear thick clothes", "We need to watch out for snow", "No effect"]$tr$::jsonb),
('05b8c512-a55c-466a-95af-32878e5fc695', $tr$What is a property of iron?$tr$, $tr$["Strong", "Soft", "Sticky", "Only cold"]$tr$::jsonb),
('0642a0a8-a5c4-4c2c-aa8c-f383b020b5b9', $tr$Which metal is used in electric wires?$tr$, $tr$["Copper", "Iron", "Gold", "Silver"]$tr$::jsonb),
('06ab0ad9-1b0d-457d-b912-bd7e7a4f3993', $tr$What is a natural source of light?$tr$, $tr$["The sun", "A room light", "Flashlight", "Only a candle"]$tr$::jsonb),
('075c1595-5197-47fa-a155-47b9112d5823', $tr$What is the rainy season?$tr$, $tr$["A season with a lot of rain and cooler weather", "A season that is always hot", "A season with no rain", "A season with snow"]$tr$::jsonb),
('083463e4-1556-4dbd-8bbc-6c8eab92251e', $tr$Which vegetable's leaves do we usually eat?$tr$, $tr$["Kangkong", "Tomato", "Sampaguita", "Narra"]$tr$::jsonb),
('0982c5b3-729d-4fac-adee-84fa2b45bd28', $tr$What skill do you use when you measure the length of a pencil?$tr$, $tr$["Measuring", "Observing", "Predicting", "None of these"]$tr$::jsonb),
('09a536d2-85f9-4e3d-8196-090d021ee2f0', $tr$Why is it important to take proper care of materials?$tr$, $tr$["It protects nature", "There is no reason", "Just for grades", "To carry things"]$tr$::jsonb),
('0b76da3f-5d5d-4cb5-bbf9-dc624049a09f', $tr$What gives off harmful smoke?$tr$, $tr$["Burning trash", "Planting trees", "Reading books", "Playing ball"]$tr$::jsonb),
('0c97a2f2-3552-4a2e-9c67-614d9c75d9ce', $tr$What is a solid?$tr$, $tr$["Matter with a fixed shape", "Matter that takes the shape of its container", "Matter that spreads to fill a space", "Nothing"]$tr$::jsonb),
('0dd8a576-f98f-46c8-83e5-590d74b257e5', $tr$What science idea do we use when we turn on a light?$tr$, $tr$["Energy", "History", "Art", "Music"]$tr$::jsonb),
('0e8e0fee-3528-4ed8-84ea-751c922dfff9', $tr$During a strong typhoon with heavy wind, a bottle gourd vine with tendrils gripping a trellis stays attached, while a similar vine without any climbing structure gets blown down. What does this show about tendrils?$tr$, $tr$["Tendrils help anchor the plant to a support, helping it withstand strong wind", "Tendrils make the plant immune to all wind damage", "Tendrils have no effect during a typhoon", "Tendrils only work during droughts, not wind"]$tr$::jsonb),
('0ed6e6d5-a232-43a9-be5a-90398af15dcf', $tr$What is melting?$tr$, $tr$["A solid changing into a liquid", "A liquid changing into a gas", "A gas changing into a solid", "No change"]$tr$::jsonb),
('0f0efe0c-5ed1-4f47-9b47-54c8f83cce68', $tr$Which group correctly names one solid, one liquid, and one gas, in that order?$tr$, $tr$["Stone, water, air", "Water, air, stone", "Air, stone, water", "Stone, stone, water"]$tr$::jsonb),
('0fc61cda-1e4c-4729-9818-d4efaed859bc', $tr$Which of these can a force do to a moving object?$tr$, $tr$["It can speed it up, slow it down, or change its motion", "It only makes it invisible", "It only gives it color", "It only makes it heavier"]$tr$::jsonb),
('10066744-935c-4da1-95b3-a4651236c876', $tr$What should you do during heavy rain or a typhoon?$tr$, $tr$["Stay inside the house to be safe", "Play outside", "Swim in the sea", "Fly a kite"]$tr$::jsonb),
('11838338-573d-4610-bb68-c98f9ff904db', $tr$What is an example of using sound to give information?$tr$, $tr$["Siren", "Picture", "Book", "Drawing"]$tr$::jsonb),
('1290c94c-3a04-47de-9831-46e3b0705d7c', $tr$When is it better to plant some crops?$tr$, $tr$["In the rainy season, because there is enough water", "Only in the dry season", "Any season", "Never"]$tr$::jsonb),
('12bb2e04-6726-4ebd-bb45-a97edf27db2d', $tr$A student designs the question, "Does milk evaporate at the same rate as water?" and pours 50 mL of each into identical open cups placed side by side. What is being kept the same (control) here?$tr$, $tr$["The amount of liquid, the type of cup, and the location", "The type of liquid", "The evaporation rate", "The time of measurement only"]$tr$::jsonb),
('138c6d18-f731-4c2b-8894-e0657803d719', $tr$What is made from sand?$tr$, $tr$["Glass and cement", "Only bricks", "Electricity", "Clothes"]$tr$::jsonb),
('13a81a32-c186-4ad3-a807-aa4605b72534', $tr$Which metal is also used for spoons and forks?$tr$, $tr$["Silver", "Only gold", "Only iron", "Only copper"]$tr$::jsonb),
('13e58df9-389a-445d-b697-936c4c118afb', $tr$A student wants to test which of two liquids, vinegar or water, evaporates faster, but pours 100 mL of vinegar into a wide bowl and only 50 mL of water into a narrow cup. What is the problem with this plan?$tr$, $tr$["Both the amount of liquid and the container shape are different, so it is not a fair comparison", "There is no problem because both are liquids", "The problem is that vinegar was used at all", "The problem is that the student used two different liquids, which is not allowed"]$tr$::jsonb),
('145c378c-70a6-4802-a6ff-afec47f05cc2', $tr$What do we call making materials into something new?$tr$, $tr$["Recycle", "Reuse", "Burn it", "Throw it away"]$tr$::jsonb),
('15080765-e11b-4384-a860-e1bd2c228ad0', $tr$Which skill do you use when you measure the length of a pencil?$tr$, $tr$["Measuring", "Observing", "Predicting", "None of these"]$tr$::jsonb),
('1532deb2-1d73-4bae-9151-60cd5abdb5e1', $tr$When does the Philippine dry season generally occur?$tr$, $tr$["March to May", "June to November", "December to February", "All year round equally"]$tr$::jsonb),
('160fd55c-b7b0-4d22-a0c5-916c8e97f7ae', $tr$Why is weather important?$tr$, $tr$["It helps us get ready", "It is useless", "Just for fun", "It does not help"]$tr$::jsonb),
('16232fb3-7cac-48de-b53d-f1813607cfec', $tr$What is a fair test?$tr$, $tr$["Testing one factor while keeping all the others the same", "Just counting", "Just playing", "It has no meaning"]$tr$::jsonb),
('1721e19b-d1a6-4ac5-895e-ef872ef1a9c1', $tr$Water droplets form on the outside of a cold glass of coconut juice on a hot day. What process caused these droplets to form?$tr$, $tr$["Condensation", "Evaporation", "Melting", "Freezing"]$tr$::jsonb),
('179f16b0-9619-40a4-b5ba-d0012cfe28f3', $tr$In the chain Rice plant → Rat → Snake → Eagle, what is the rat's feeding group?$tr$, $tr$["Herbivore", "Carnivore", "Omnivore", "Producer"]$tr$::jsonb),
('17a5fbb3-2063-43c3-9beb-66e13dd48d3b', $tr$What is a ruler used for?$tr$, $tr$["Measuring length", "Cutting", "Sticking things", "Erasing"]$tr$::jsonb),
('17f2a82e-7f0f-49b0-bd71-d96f22a0d38b', $tr$Why does a scientist need to ask questions?$tr$, $tr$["To learn", "Just to make it hard", "There is no reason", "To forget"]$tr$::jsonb),
('1a8e8917-235b-4f51-ad3f-2e3fa0bb433e', $tr$How many trials does a valid experiment need?$tr$, $tr$["At least three", "Only one", "None", "Ten"]$tr$::jsonb),
('1b7df6d2-abde-4805-8dba-e48fca865a82', $tr$What tool helps us know how hot the day is?$tr$, $tr$["Thermometer", "Umbrella", "Raincoat", "Boots"]$tr$::jsonb),
('1bd0dba9-3637-4463-9130-33c97a9d28b8', $tr$How is sound made?$tr$, $tr$["By an object vibrating", "By an object staying still", "By changing color", "There is no way"]$tr$::jsonb),
('1d90e53b-b777-4390-badf-39383b78d725', $tr$What is the fixed point of a lever called?$tr$, $tr$["Fulcrum", "Axle", "Wheel", "Handle"]$tr$::jsonb),
('1efe6d35-003a-482f-a96a-0af7f0700a5d', $tr$Why is it important to know about the weather?$tr$, $tr$["So we can get ready", "It is not important", "Just for fun", "It does not help"]$tr$::jsonb),
('1f547a80-a06d-4ec0-9c39-5222feb5e62a', $tr$You have 250 mL of vinegar in a bottle. You pour it into a wider jar. Which statement is TRUE?$tr$, $tr$["The vinegar still has 250 mL of volume, but now looks like a different shape", "The vinegar now has more volume", "The vinegar becomes a gas", "The vinegar's shape stays the same as the bottle"]$tr$::jsonb),
('204eb570-68f8-4032-a003-b0e0266a664c', $tr$When does the dry season usually happen?$tr$, $tr$["March to May", "June to November", "December to January", "The whole year"]$tr$::jsonb),
('257a678c-60aa-40f7-9063-fde29219c9fd', $tr$Two clear containers, one tall and thin and one short and wide, each hold 500 mL of water. A classmate says the tall one has "more water" because the water level looks higher. What is wrong with this reasoning?$tr$, $tr$["Volume is the actual amount of space taken up, not how tall the water looks -- both containers have the same 500 mL", "The tall container really does have more water", "Water does not have volume", "Shape determines volume for liquids"]$tr$::jsonb),
('25d5f9d5-a52c-4b32-b58b-cb0c7e96b378', $tr$What is modeling clay used for?$tr$, $tr$["Making models", "Measuring", "Cutting", "Sticking things"]$tr$::jsonb),
('26358cf5-2b88-4521-9e30-ed2635a6e5f8', $tr$What do we call a very strong storm with wind and rain?$tr$, $tr$["Typhoon", "Dry season", "Just a cool wind (amihan)", "Summer"]$tr$::jsonb),
('26fe5b83-f9bd-40ca-8443-b5a1b6c708c8', $tr$Why do we do different activities in different weather?$tr$, $tr$["Weather affects how safe and comfortable an activity is", "Weather has no connection to activities", "We always do the same things in any weather", "We don't need to think about the weather"]$tr$::jsonb),
('2787d2cd-24fc-4970-81b7-5dbc0362e0ea', $tr$What is modeling clay used for?$tr$, $tr$["Making models", "Measuring", "Cutting", "Sticking things"]$tr$::jsonb),
('279d6e97-95f1-42e0-b5c5-2bd4fa955218', $tr$What is an example of a non-living thing?$tr$, $tr$["Rock", "Plant", "Animal", "Person"]$tr$::jsonb),
('27be60d7-6968-4cc1-a547-81b144d1d4de', $tr$What is used to measure length?$tr$, $tr$["Ruler", "Balloon", "Scissors", "Clay"]$tr$::jsonb),
('2af53a3b-ce29-4487-b308-dce0b52e8064', $tr$When does the rainy season usually happen?$tr$, $tr$["June to November", "March to May", "Only January to February", "It never happens"]$tr$::jsonb),
('2b64dcdb-95ac-4272-9b61-ed39bd82e263', $tr$A group testing sugar dissolving plans to use warm water in one cup and cold water in another, both with the exact same amount of sugar and the exact same size of cup. Is this a fair test?$tr$, $tr$["Yes, because only the water temperature differs while other factors are kept the same", "No, because the cups are the same size", "No, because sugar was used in both cups", "Yes, but only because it uses two cups"]$tr$::jsonb),
('2bcadf95-ab12-4c2a-a5d6-b075e72b79a6', $tr$What does a scientist do first?$tr$, $tr$["Observes carefully", "Sleeps", "Eats", "Just plays"]$tr$::jsonb),
('2bf97c34-1a05-4831-948d-b6329cde97c8', $tr$What is an example of a sound that gives information?$tr$, $tr$["Siren", "Picture", "Book", "Drawing"]$tr$::jsonb),
('2c3463b7-bd46-4e3c-8dea-d9d3770b5823', $tr$What is the rainy season?$tr$, $tr$["A lot of rain, cooler weather", "Always hot", "No rain", "There is snow"]$tr$::jsonb),
('2c6d1ebb-0d58-491a-80ff-d0a8308ed615', $tr$What is the rainy season?$tr$, $tr$["A lot of rain, cooler weather", "Always hot", "No rain", "There is snow"]$tr$::jsonb),
('2c75ecc6-cffe-4dab-b61f-426f7bb521e3', $tr$Stone, water, and air are examples of matter. Which one is a solid?$tr$, $tr$["Stone", "Water", "Air", "None of them"]$tr$::jsonb),
('2c7e6373-004f-4a47-b8ed-17afb22600e8', $tr$What is a lever?$tr$, $tr$["A bar that helps lift things using a fixed point", "Just a round wheel", "A kind of liquid", "A kind of animal"]$tr$::jsonb),
('2e516b73-c743-4218-8dbd-b18d0f50dae6', $tr$What clothes are good for the dry season?$tr$, $tr$["Thin clothes", "Raincoat", "Thick winter clothes", "Snow boots"]$tr$::jsonb),
('2e571885-bad9-48b2-b5b7-cbbadb11c2de', $tr$How does weight affect the way an object moves?$tr$, $tr$["Heavier objects are harder to move", "Weight has no effect", "Lighter objects are harder to move", "Weight is only for liquids"]$tr$::jsonb),
('2fd1b639-9fb2-457f-ab47-ac86ae916701', $tr$Which metal is used in jewelry because it shines?$tr$, $tr$["Gold", "Only iron", "Only copper", "No metal"]$tr$::jsonb),
('306226e4-7213-4e07-9776-a26311052579', $tr$What does a scientist use to measure rain?$tr$, $tr$["Rain gauge", "Thermometer", "Wind vane", "Compass"]$tr$::jsonb),
('30e3b9b8-a53a-49ea-9747-ecd69c25c799', $tr$What is used to measure length?$tr$, $tr$["Ruler", "Balloon", "Scissors", "Clay"]$tr$::jsonb),
('31557554-6ae8-4967-a3b5-7572f82f2c84', $tr$What is done to paper to make it into a book?$tr$, $tr$["It is cut and shaped", "It is only burned", "Nothing", "It is only hammered"]$tr$::jsonb),
('31b70a5d-7e86-400a-911e-015be0f306da', $tr$Why do we need to bring an umbrella in the rainy season?$tr$, $tr$["So our body does not get wet", "To block the sun", "To help fly a kite", "It is useless"]$tr$::jsonb),
('31fbdce4-8a1d-4e7d-a53a-a0fcab503115', $tr$Is a milkfish a vertebrate or invertebrate?$tr$, $tr$["Vertebrate, because fish have a backbone", "Invertebrate, because fish have no backbone", "Neither, because fish are not classified", "Both, depending on the type of fish"]$tr$::jsonb),
('33479ca9-fbd5-4d7d-a7f9-71802398b9a0', $tr$What do we call the knowledge that explains the world?$tr$, $tr$["Science", "Story", "Dance", "Song"]$tr$::jsonb),
('33b16f6f-5c2a-484e-83ae-acd55fdfd826', $tr$What is the fixed point of a lever called?$tr$, $tr$["Fulcrum", "Axle", "Wheel", "Handle"]$tr$::jsonb),
('365a3f42-6173-4ae1-bbfa-c006e1acd037', $tr$What is the big lesson about weather?$tr$, $tr$["It has a big effect on our clothes, activities, and work", "It has no connection to our lives", "It is not important for our choices", "It does not affect anyone"]$tr$::jsonb),
('36834441-4be4-43a9-849f-bdc252ccfb30', $tr$How does weather affect farming?$tr$, $tr$["It helps farmers decide when to plant", "No effect", "Farmers don't think about it", "It has nothing to do with crops"]$tr$::jsonb),
('369e6497-8857-48ad-9ae8-883c92ebfef2', $tr$What do we call making materials into something new?$tr$, $tr$["Recycle", "Reuse", "Burn it", "Throw it away"]$tr$::jsonb),
('385d34c3-371d-4a95-9e94-7efab11dec5c', $tr$Which plant grows in a mangrove swamp?$tr$, $tr$["Mangrove tree", "Rice plant", "Hibiscus", "Tomato"]$tr$::jsonb),
('394f722e-2024-4fa6-bfd6-e963a78e7b83', $tr$What clothes are good for the dry season?$tr$, $tr$["Thin clothes", "Raincoat", "Thick clothes", "Snow boots"]$tr$::jsonb),
('39e7e74c-bdc3-4997-8090-b8caa1607461', $tr$What gives off harmful smoke?$tr$, $tr$["Burning trash", "Planting trees", "Reading books", "Playing ball"]$tr$::jsonb),
('3aec80c7-610f-4447-b5e0-eb7eabac7e95', $tr$Why is it dangerous to look straight at the sun?$tr$, $tr$["It can hurt your eyes", "There is no danger", "It makes your eyesight stronger", "It makes your eyesight better"]$tr$::jsonb),
('3ba88dca-8883-489d-b253-258d66f3e359', $tr$Two main Philippine seasons?$tr$, $tr$["Dry season and Rainy season", "Winter and Summer", "Spring and Fall", "Wet and Frozen"]$tr$::jsonb),
('3cc756d1-7824-4d1c-95f1-9c81bc4195e9', $tr$Which local animal is an example of an invertebrate?$tr$, $tr$["Firefly", "Frog", "Sparrow", "Dog"]$tr$::jsonb),
('3cfee3d3-ea57-4fc0-b94a-128a3e09d11b', $tr$What can you do with an old bottle?$tr$, $tr$["Make it a plant pot", "Just throw it away", "Burn it", "Do nothing"]$tr$::jsonb),
('3d509a00-81a7-4dd4-93b1-1c97f6ea950b', $tr$Why wear thick clothes in the rain?$tr$, $tr$["So we don't get sick from the cold and wet", "To feel hot", "To play in the sea", "No reason"]$tr$::jsonb),
('41082c02-cb05-4c4a-8862-ec1ec569ab77', $tr$What is the rainy season?$tr$, $tr$["A lot of rain, cooler weather", "Always hot", "No rain", "There is snow"]$tr$::jsonb),
('43c7253d-83fe-4241-8f36-54008503a84c', $tr$Why do we do different activities in different weather?$tr$, $tr$["Weather affects our safety and comfort", "There is no connection", "We always do the same things", "We don't need to think about it"]$tr$::jsonb),
('445ed3fc-0a88-4fd7-8396-32093d6eee07', $tr$Why bring an umbrella in the rainy season?$tr$, $tr$["So we don't get wet", "To block the sun", "To help fly a kite", "It is useless"]$tr$::jsonb),
('471ac989-3410-4026-8a81-6aed865e7dd5', $tr$What can we use to find out how air moves?$tr$, $tr$["Balloon", "Ruler", "Scissors", "Pencil"]$tr$::jsonb),
('47460b75-bdf8-4645-ad50-bcb3924b114f', $tr$Which metal is used in buildings because it is strong?$tr$, $tr$["Iron", "Gold", "Silver", "Copper"]$tr$::jsonb),
('47cb16de-9bef-443a-8fd6-aa2d774465ad', $tr$In the chain Rice plant → Rat → Snake → Eagle, what starts the food chain?$tr$, $tr$["Rice plant (a plant)", "Rat", "Snake", "Eagle"]$tr$::jsonb),
('48ba2636-9705-48e1-9145-f2c549f227b4', $tr$What is evaporation?$tr$, $tr$["A liquid changing into a gas", "A solid changing into a liquid", "A gas changing into a solid", "No change"]$tr$::jsonb),
('4a362f92-fa0e-4af3-bbdc-da51668d45fe', $tr$What does a scientist do first?$tr$, $tr$["Observes carefully", "Sleeps", "Eats", "Just plays"]$tr$::jsonb),
('4b72245d-ed31-42ff-8ac0-a185088fa08c', $tr$Why is it important to use weather measuring tools?$tr$, $tr$["They give us correct information", "We do not need to use them", "We can just guess", "They are useless"]$tr$::jsonb),
('4bd0ac54-9eef-43ad-b7f4-ae984e136692', $tr$An investigation needs to record the mass of a small bag of sugar, likely just a few grams. Which unit is most appropriate to use?$tr$, $tr$["Grams (g)", "Kilograms (kg) only", "Liters (L)", "Degrees Celsius (°C)"]$tr$::jsonb),
('4d1b83d9-1432-4916-bffd-fe6a5105e994', $tr$What does a scientist do?$tr$, $tr$["Observes and asks questions", "Sleeps all day", "Only plays", "None of these"]$tr$::jsonb),
('4f5371fb-6352-4209-9cfd-bfe6ef14b97d', $tr$What do we use to measure weight?$tr$, $tr$["Weighing scale", "Ruler", "Scissors", "Pencil"]$tr$::jsonb),
('50208b1f-3d0b-4055-a4d2-89c1da75ea2e', $tr$What happens when trash is thrown away the wrong way?$tr$, $tr$["It harms nature and animals", "Nothing happens", "It is good for nature", "It makes the place nicer"]$tr$::jsonb),
('50e937f8-0463-4960-8620-bd2951c45332', $tr$What do we call trying things out and playing with tools?$tr$, $tr$["Tinkering", "Sleeping", "Eating", "Walking"]$tr$::jsonb),
('50f3d79d-c6dc-456d-bbec-26ed9e9322df', $tr$Why are solid materials made into new things?$tr$, $tr$["To make them useful", "There is no reason", "Just to throw them away", "To break them"]$tr$::jsonb),
('517cd9cb-8291-46ae-b648-67b989d32286', $tr$A taro plant with underground rhizomes has its leaves cut down by a strong typhoon, but a few weeks later new shoots emerge from the rhizome. What does this show about the rhizome's role in survival?$tr$, $tr$["The rhizome stored enough food underground to let the plant regrow after the above-ground parts were destroyed", "The rhizome caused the typhoon to happen", "The rhizome made the leaves resistant to wind damage", "The rhizome has no connection to the plant's ability to regrow"]$tr$::jsonb),
('51e5acf0-6ea6-434b-aa8b-e80b403bf0e6', $tr$What clothes are good for the rainy season?$tr$, $tr$["A raincoat, and bring an umbrella", "Only a swimsuit", "Only sunglasses", "Snow boots"]$tr$::jsonb),
('539b9674-c588-4f2f-a19f-36620e2c6fbf', $tr$What science explains why it rains?$tr$, $tr$["Water cycle", "Buoyancy", "Gravity", "Electricity"]$tr$::jsonb),
('53fa38b4-a349-4031-9098-339daab8dc9d', $tr$Which of these can a force do to a moving object?$tr$, $tr$["It can speed it up, slow it down, or change its motion", "It only makes it invisible", "It only gives it color", "It only makes it heavier"]$tr$::jsonb),
('552716f1-5c8e-45cb-8a29-fa629807d415', $tr$A calamansi or guava branch has sharp, pointed growths along its stem that can prick anyone who touches it. What structure is this?$tr$, $tr$["Thorns", "Tendrils", "Aerial roots", "Rhizomes"]$tr$::jsonb),
('55c1c9b2-1d26-4f32-9fcc-2459dd0ad1c7', $tr$What is a ruler used for?$tr$, $tr$["Measuring length", "Cutting", "Sticking things together", "Erasing"]$tr$::jsonb),
('55fdb9bb-494b-431b-8120-a2a20415877a', $tr$Which body part do we use for SIGHT?$tr$, $tr$["Eyes", "Ears", "Nose", "Tongue"]$tr$::jsonb),
('562df572-5ea9-4acb-8b92-ea3dc40ce03f', $tr$What else is copper used for besides wires?$tr$, $tr$["For electricity", "Only jewelry", "Food", "Clothes"]$tr$::jsonb),
('5b2f2b79-15d6-45c1-880f-a47aec93ddcc', $tr$Which sense organ do we use to hear sounds?$tr$, $tr$["Ears", "Eyes", "Nose", "Skin"]$tr$::jsonb),
('5bee3218-aca1-48e3-b421-b35064e2b672', $tr$What is a push?$tr$, $tr$["A force that moves something away from you", "A force that moves something toward you", "A kind of liquid", "A kind of animal"]$tr$::jsonb),
('5cab3377-6207-4b7b-9dbb-ae60a6fd68ab', $tr$What is evaporation?$tr$, $tr$["A liquid changing into a gas", "A solid changing into a liquid", "A gas changing into a solid", "No change"]$tr$::jsonb),
('5d910859-2581-4454-9bdd-7fd37b95b781', $tr$What do we use to measure heat?$tr$, $tr$["Thermometer", "Rain gauge", "Wind vane", "Compass"]$tr$::jsonb),
('5dbe863c-45a2-49bb-99ab-2507a1b376b2', $tr$Why is it important to know about the weather?$tr$, $tr$["So we can get ready for what will happen", "It is not important", "Just to have fun", "It does not help in daily life"]$tr$::jsonb),
('5edacb82-22fa-45cd-924c-03c998970f81', $tr$What is a ruler used for?$tr$, $tr$["Measuring length", "Cutting", "Sticking things", "Erasing"]$tr$::jsonb),
('5effb6d9-044e-4f44-9d29-16209d700310', $tr$A graduated cylinder shows a water level exactly at the 350 mark, with mL printed on the cylinder. How much water is there?$tr$, $tr$["350 mL", "350 L", "350 °C", "350 g"]$tr$::jsonb),
('5f9cff52-c920-43b4-aab3-f43a0a6f0ffb', $tr$What is done to iron to make it into a spoon?$tr$, $tr$["It is hammered", "It is only pressed", "It is burned", "Nothing"]$tr$::jsonb),
('5ff6ba83-b4b5-4ff7-b809-b227afde2ebc', $tr$What is an example of a living thing that can be affected?$tr$, $tr$["Animal", "Rock", "Metal", "Plastic"]$tr$::jsonb),
('623bd372-c0f7-469f-a830-918afb717370', $tr$What is a hand lens used for?$tr$, $tr$["To see small details", "To write", "To play", "To eat"]$tr$::jsonb),
('63a0a9b0-c12a-4219-93a8-ab2e2862cf89', $tr$What do we use to smell a flower?$tr$, $tr$["Nose", "Eyes", "Ears", "Tongue"]$tr$::jsonb),
('65ce4fc8-34bc-4701-97e8-bfe1da4a9cbd', $tr$What does a scientist do first?$tr$, $tr$["Observes carefully", "Sleeps", "Eats", "Just plays"]$tr$::jsonb),
('67feea13-3cde-49f0-9f45-30757be11f88', $tr$While measuring 200 mL of vinegar in a graduated cylinder, a student looks at the liquid from above instead of at eye level. What problem could this cause?$tr$, $tr$["The reading could be inaccurate because of the way the curved liquid surface looks from that angle", "There is no problem at all", "The vinegar will evaporate faster", "The cylinder will break"]$tr$::jsonb),
('68a17301-8765-4d62-9595-763d435c56b1', $tr$What is a habitat?$tr$, $tr$["The natural home of a living thing", "Just a type of food", "Just a science tool", "Just a type of weather"]$tr$::jsonb),
('6b68ee22-f68d-46f3-8564-98665260722f', $tr$How does the dry season affect our lives?$tr$, $tr$["Drink lots of water, wear thin clothes", "Wear thick clothes", "Watch out for snow", "No effect"]$tr$::jsonb),
('6e528ba5-2faa-4428-8db0-a6e116d2fc4b', $tr$How does the rainy season affect our lives?$tr$, $tr$["Bring an umbrella and watch out for floods", "No effect", "Drink lots of water", "Wear thin clothes"]$tr$::jsonb),
('6ff29150-e537-44a4-bd8c-1a090c49b004', $tr$Which is an example of science in the community?$tr$, $tr$["Using machines in the market", "Watching a movie", "Playing with toys", "Singing"]$tr$::jsonb),
('71929779-97b7-483d-897e-a6fa6d2d8c0f', $tr$What tool measures heat?$tr$, $tr$["Thermometer", "Rain gauge", "Wind vane", "Ruler"]$tr$::jsonb),
('7193a2e8-7177-4c4d-9c9a-0c9dc259141a', $tr$What happens if an object changes its position to come closer to you?$tr$, $tr$["It is moving closer", "It is moving away", "Nothing happened", "It changed color"]$tr$::jsonb),
('72c337f3-db9e-431d-aaeb-3c259c655d5b', $tr$What can be made from clay?$tr$, $tr$["Bricks and pots", "Glass", "Electricity", "Clothes"]$tr$::jsonb),
('72ca0cc7-44d4-410f-aa24-397d12bba6a3', $tr$A wooden bench keeps the exact same shape and size whether it sits in the classroom or outside. This shows the bench is a solid because it has:$tr$, $tr$["A definite shape and a definite volume", "A definite shape but indefinite volume", "An indefinite shape but definite volume", "Neither shape nor volume"]$tr$::jsonb),
('738023c0-b67d-405d-b91d-cab6789e3e80', $tr$A farmer notices that his onion crop, grown from bulbs, survives short dry spells better than a leafy vegetable planted nearby with no storage structures. Using what you know about bulbs, explain why.$tr$, $tr$["The bulb's stored food and layered structure let the plant draw on reserves during the dry spell, while the leafy vegetable has no such reserve to fall back on", "Onions do not need water at all, unlike other vegetables", "The bulb makes rain fall more often near the onion crop", "There is no real difference between the two plants during a dry spell"]$tr$::jsonb),
('7671022b-cd9b-4fab-a2dc-df4d962314a9', $tr$Which metal is used in electric wires?$tr$, $tr$["Copper", "Iron", "Gold", "Silver"]$tr$::jsonb),
('770fcdcc-7a48-40e7-947d-d8d55b70c633', $tr$Tendrils on a bitter gourd vine help the plant to:$tr$, $tr$["climb toward sunlight", "store starch underground", "scare away large animals", "make its own flowers"]$tr$::jsonb),
('7756d0f2-1f10-4191-bbe5-fa69a6e25aba', $tr$Why does a scientist need to ask questions?$tr$, $tr$["To learn", "Just to make it hard", "There is no reason", "To forget"]$tr$::jsonb),
('780edada-752b-4e1c-972d-26453a80ea3b', $tr$A student proposes the testable question, "Does the amount of sugar affect how sweet a glass of calamansi juice tastes?" What would be the variable, and what would need to be kept the same?$tr$, $tr$["The variable is the amount of sugar added; the amount of juice, water, and calamansi used should be kept the same", "The variable is the type of glass used; nothing else matters", "The variable is the temperature; the amount of sugar should change too", "There is no variable in this question"]$tr$::jsonb),
('7ad43830-9d12-4306-a3c7-b45e88d43a2f', $tr$What do we call giving a material a form?$tr$, $tr$["Shaping", "Cutting", "Pressing", "Hammering"]$tr$::jsonb),
('7b896c65-3e6e-4c06-a8bc-d4a367a891fe', $tr$What are the two main seasons in the Philippines?$tr$, $tr$["Dry season and Rainy season", "Winter and Summer", "Spring and Fall", "Wet and Frozen"]$tr$::jsonb),
('7ea205b3-daac-4ebc-89df-3c60628a0ec7', $tr$Whose work is directly affected by the weather?$tr$, $tr$["Farmers", "Only teachers", "No one", "Only students"]$tr$::jsonb),
('7fb7d3d4-f335-40de-8936-8f9d8be7b220', $tr$What do we call looking carefully at details?$tr$, $tr$["Observing", "Predicting", "Measuring", "Playing"]$tr$::jsonb),
('80557553-7d86-4e49-8c21-796e4ba7807c', $tr$What clothes are good for the rainy season?$tr$, $tr$["Raincoat and umbrella", "Swimsuit", "Only sunglasses", "Snow boots"]$tr$::jsonb),
('80b3a7ce-bfbd-426d-8fb8-3f9c0646741f', $tr$What are natural causes of movement?$tr$, $tr$["Wind, water, gravity", "Only people pushing", "Only people lifting", "None of these"]$tr$::jsonb),
('81b7e14c-528f-48ee-b56c-e8b291a3a5b4', $tr$A bottle gourd or bitter gourd vine has thin, curly, thread-like parts that wrap tightly around a trellis or fence to hold the plant up. What structure is this?$tr$, $tr$["Tendrils", "Bulbs", "Tubers", "Thorns"]$tr$::jsonb),
('83a84181-2f96-44cb-83f0-606813c3820a', $tr$What is a wheel-and-axle?$tr$, $tr$["A wheel attached to a rod; they turn together", "A bar with a fixed point", "A kind of liquid", "A flat surface"]$tr$::jsonb),
('83abec62-7134-4fb5-8cf3-ecc437359318', $tr$What is a thermometer used for?$tr$, $tr$["Measuring temperature", "Measuring length", "Measuring weight", "Measuring time"]$tr$::jsonb),
('84569963-70a0-4608-8638-ad98f6ad91ec', $tr$What do we call looking carefully at the details?$tr$, $tr$["Observing", "Predicting", "Measuring", "Playing"]$tr$::jsonb),
('845d8a70-078c-4dae-b9c4-6e27645e732a', $tr$Design a testable question comparing the evaporation rate of alcohol and water. Which of these best states both the control and the variable together?$tr$, $tr$["Variable: type of liquid (alcohol vs. water); Controls: equal amount of liquid, identical open containers, same location and temperature", "Variable: container shape; Controls: type of liquid", "Variable: amount of liquid; Controls: type of liquid only", "There is no way to identify a control for this comparison"]$tr$::jsonb),
('85069385-6944-4693-829b-02e673a2444e', $tr$Why should we know how raw materials become useful?$tr$, $tr$["To understand where the things we use every day come from", "It is not important", "It is not related to life", "It is not part of Science"]$tr$::jsonb),
('86ce356f-979e-4265-995b-13824560de67', $tr$What is a hand lens used for?$tr$, $tr$["To see small details", "To write", "To play", "To eat"]$tr$::jsonb),
('87701ca4-596a-4391-b7a6-65b6373394c3', $tr$What science explains why it rains?$tr$, $tr$["Water cycle", "Buoyancy", "Gravity", "Electricity"]$tr$::jsonb),
('889f2a3b-c695-4ca3-af94-a346e6a86bca', $tr$Where should extra cooking oil be thrown?$tr$, $tr$["In the trash bin", "In the sink", "In the drain", "Anywhere"]$tr$::jsonb),
('8a5e9532-7690-433a-aa1b-d620e5df189b', $tr$What can be made from sand?$tr$, $tr$["Glass and cement", "Only bricks", "Electricity", "Clothes"]$tr$::jsonb),
('8a824e6b-b1c8-4dc1-9eba-b4c0fbad046d', $tr$What is a thermometer used for?$tr$, $tr$["Measuring temperature", "Measuring length", "Measuring weight", "Measuring time"]$tr$::jsonb),
('8a9cb5f3-aa26-4a24-b956-ce5d08bd709f', $tr$What do we use to measure weight?$tr$, $tr$["Weighing scale", "Ruler", "Scissors", "Pencil"]$tr$::jsonb),
('8b60f171-9507-4654-a3dd-140290dfd6ad', $tr$A sponge gourd vine grips a trellis using its:$tr$, $tr$["tendrils", "thorns", "bulbs", "tubers"]$tr$::jsonb),
('8cd27615-d927-4032-a5b3-9d923f61fc47', $tr$What is a habitat?$tr$, $tr$["The natural home of a living thing", "Just a type of food", "Just a science tool", "Just a type of weather"]$tr$::jsonb),
('8d841d22-e7a3-4a3b-be96-f8d6754bb648', $tr$What should we do with trash instead of burning it?$tr$, $tr$["Throw it properly in the trash bin", "Leave it anywhere", "Still burn it", "Keep it at home"]$tr$::jsonb),
('8e6b695d-b0b7-4476-8bb9-0fc6e9bfb8ad', $tr$Why should we take care of our environment?$tr$, $tr$["To keep it from being harmed", "There is no reason", "Just to obey the teacher", "To get a prize"]$tr$::jsonb),
('8f35fa5f-b81c-41b1-ab9a-80dfca778daa', $tr$What is modeling clay used for?$tr$, $tr$["Making models", "Reading", "Typing", "Playing music"]$tr$::jsonb),
('8f575917-a26e-4e74-b5d7-83b5708087fe', $tr$What do we call trying things out and playing with tools?$tr$, $tr$["Tinkering", "Sleeping", "Eating", "Walking"]$tr$::jsonb),
('8f7db8d1-8c51-4193-8916-2e071a4ef328', $tr$What do we call a very strong storm?$tr$, $tr$["Typhoon", "Dry season", "Just a cool wind (amihan)", "Summer"]$tr$::jsonb),
('902d3c9f-db6e-4060-b300-cf8f57911d5a', $tr$What should we do with trash instead of burning it?$tr$, $tr$["Throw it properly in the trash bin", "Leave it anywhere", "Still burn it", "Keep it at home"]$tr$::jsonb),
('915509e8-1567-4de3-99eb-6addccf77800', $tr$Fermented shrimp paste sitting uncovered for many days loses some of its liquid and becomes thicker. Which process most likely explains this, and why does it usually happen faster on a hot day than a cold day?$tr$, $tr$["Evaporation -- heat gives the liquid's particles more energy to escape into the air, so warmer days speed it up", "Condensation -- the paste is gaining water from the air", "Freezing -- cold air makes the paste thicker", "Melting -- the paste changes from solid to liquid"]$tr$::jsonb),
('917535bd-ff04-4039-a606-d2ebd802df04', $tr$What skill do you use when you measure the length of a pencil?$tr$, $tr$["Measuring", "Observing", "Predicting", "None of these"]$tr$::jsonb),
('91b9169d-b73c-4b96-b5c9-4bd0c28fd3d4', $tr$Which is an example of a non-living thing?$tr$, $tr$["Rock", "Plant", "Animal", "Person"]$tr$::jsonb),
('92a15000-7f54-4932-a92d-2fea7e056cf8', $tr$What do we use to measure rain?$tr$, $tr$["Rain gauge", "Thermometer", "Wind vane", "Compass"]$tr$::jsonb),
('92b6767d-8a63-45c7-a3c5-5ba64191dced', $tr$What is a weighing scale used for?$tr$, $tr$["Measuring weight", "Measuring temperature", "Measuring length", "Measuring time"]$tr$::jsonb),
('92cb6895-8f98-4d06-8d15-b0f8e0a3664f', $tr$What tool tells us how hot the day is?$tr$, $tr$["Thermometer", "Umbrella", "Raincoat", "Boots"]$tr$::jsonb),
('94c6e6b3-264b-457e-977a-2fa26ed78d1f', $tr$Which metal is used in jewelry because it shines?$tr$, $tr$["Gold", "Only iron", "Only copper", "No metal"]$tr$::jsonb),
('9515453f-a307-4dec-ab61-b20b5196e1b8', $tr$Why is it important to understand the weather?$tr$, $tr$["It helps us get ready and make better choices", "It is useless", "Just to have fun", "It does not help in life"]$tr$::jsonb),
('966eb29a-3f57-4384-ba3a-819649b27fbe', $tr$What are scissors used for in science?$tr$, $tr$["Cutting", "Measuring", "Sticking things", "Cleaning"]$tr$::jsonb),
('9688068f-c548-4a84-8ef4-719ac075800f', $tr$What is done to clay to make it into a pot?$tr$, $tr$["It is shaped", "It is only cut", "It is burned right away", "Nothing"]$tr$::jsonb),
('96e6cc06-41db-4ef4-8320-682c87aa4641', $tr$A banyan tree or orchid growing on a tree trunk has roots that hang down from branches into the open air instead of growing into the soil. What is this structure called, and what might it be for?$tr$, $tr$["Aerial roots -- they absorb moisture and nutrients directly from the air and rain, useful when the plant is not rooted in soil", "Tendrils -- they are only used for climbing", "Tubers -- they store starch underground", "Thorns -- they protect the plant from animals"]$tr$::jsonb),
('97d532c2-0a00-4319-809d-be6afb773c67', $tr$When is the dry season generally?$tr$, $tr$["March to May", "June to November", "December to February", "All year equally"]$tr$::jsonb),
('98640458-1fc1-4896-be48-f95d13cb9bf8', $tr$When is it better for farmers to plant some crops?$tr$, $tr$["In the rainy season, because there is enough water", "Only in the dry season", "Any season, it makes no difference", "Never"]$tr$::jsonb),
('996c1e87-a5ef-48ab-b438-fbdc58e01bb1', $tr$When does the Philippine wet season generally occur?$tr$, $tr$["June to November", "March to May", "December to February", "All year round equally"]$tr$::jsonb),
('997a79ee-359c-4ab8-b943-24abb36c82c5', $tr$Which sense organ do we use to hear?$tr$, $tr$["Ears", "Eyes", "Nose", "Skin"]$tr$::jsonb),
('9bfc0356-1e4d-488e-842e-7cb5a4749c2f', $tr$Why are these metals important?$tr$, $tr$["They are part of our everyday life", "They have no use", "Just for tests", "They have no properties"]$tr$::jsonb),
('9c16abf1-8a9a-44f1-9980-e0cbd0d6bea2', $tr$Which is an example of a gas?$tr$, $tr$["Air", "Rock", "Water", "Table"]$tr$::jsonb),
('9ca7b185-4c78-4f3c-b1b8-41b0417b0744', $tr$Which skill do you use when you measure temperature?$tr$, $tr$["Measuring", "Observing only", "Predicting only", "None of these"]$tr$::jsonb),
('9cc55eec-ee29-44a3-a5e7-f794c3a335e6', $tr$What are the two main seasons in the Philippines?$tr$, $tr$["Dry season and Rainy season", "Winter and Summer", "Spring and Fall", "Wet and Frozen"]$tr$::jsonb),
('a116faa5-0d94-41e6-81af-0549d97e37ac', $tr$Where can we see science?$tr$, $tr$["All around us every day", "Only in the library", "Only at school", "Nowhere"]$tr$::jsonb),
('a2fd716d-fa81-41b4-a565-67a9bd6ef518', $tr$Who is affected by these changes?$tr$, $tr$["Both living and non-living things", "Only people", "Only animals", "No one"]$tr$::jsonb),
('a35bde56-b49f-451c-a2d1-5d7466663056', $tr$Whose work is directly affected by the weather?$tr$, $tr$["Farmers", "Only teachers", "No one", "Only students"]$tr$::jsonb),
('a35e37b4-589b-4d95-9632-afbca0cc1b1b', $tr$Why do we use simple machines?$tr$, $tr$["They make work easier", "They make work harder", "They have no purpose", "Just to make the house pretty"]$tr$::jsonb),
('a3a00737-a3d3-404a-923d-3e3fdd89e3dc', $tr$Which is an example of a gas?$tr$, $tr$["Air", "Rock", "Water", "Table"]$tr$::jsonb),
('a4b759df-c06a-4798-a1ed-e681a4a24a9c', $tr$Which is an example of pressing?$tr$, $tr$["Making juice", "Making a pot", "Making a book", "Making a chair"]$tr$::jsonb),
('a507f1f7-4143-438c-a6d6-869bbae54b0f', $tr$What is a push?$tr$, $tr$["A force that moves something away from you", "A force that moves something toward you", "A kind of liquid", "A kind of animal"]$tr$::jsonb),
('a57675ee-41fb-4b25-b324-632700abdd9c', $tr$What happens when trash is thrown away the wrong way?$tr$, $tr$["It harms nature and animals", "Nothing happens", "It is good for nature", "It makes the place nicer"]$tr$::jsonb),
('a5a3acd3-b295-456f-9039-55a9c77bd653', $tr$Why should we take care of our environment?$tr$, $tr$["To keep it from being harmed", "There is no reason", "Just to obey the teacher", "To get a prize"]$tr$::jsonb),
('a5adf350-1648-4222-ae7e-6e7ef43acfea', $tr$Which metal is used in buildings because it is strong?$tr$, $tr$["Iron", "Gold", "Silver", "Copper"]$tr$::jsonb),
('a68b4411-f717-4426-9b6b-e2021261aa12', $tr$Which is an example of a material that can be recycled?$tr$, $tr$["Paper", "Food waste", "Smoke", "Air"]$tr$::jsonb),
('a6d8889a-a422-4489-b9ff-aec4582d3027', $tr$How does the rainy season affect our daily life?$tr$, $tr$["We need to bring an umbrella and watch out for floods", "No effect", "We need to drink lots of water", "We need to wear thin clothes"]$tr$::jsonb),
('a8144a48-c247-4283-a4ed-91edfc35942e', $tr$Which local animal is an example of an invertebrate?$tr$, $tr$["Firefly", "Frog", "Sparrow", "Dog"]$tr$::jsonb),
('a8a890cc-5b2d-42e6-a907-7f8212c7c7b1', $tr$Why are solid materials made into new things?$tr$, $tr$["To make them useful", "There is no reason", "Just to throw them away", "To break them"]$tr$::jsonb),
('ad4b4882-af03-4197-8904-f4ba7bb42e71', $tr$Which is an example of a material that can be recycled?$tr$, $tr$["Paper", "Food waste", "Smoke", "Air"]$tr$::jsonb),
('adae269e-0dfe-474f-a11a-ae849a0c9cdf', $tr$When is the dry season?$tr$, $tr$["March to May", "June to November", "December to January", "The whole year"]$tr$::jsonb),
('af853016-1319-4572-a997-7407fd6fbe79', $tr$Where can we see science?$tr$, $tr$["All around us every day", "Only in the library", "Only at school", "Nowhere"]$tr$::jsonb),
('af8be421-3346-4c7d-b584-61f330f2c0e9', $tr$Why do we use measuring tools?$tr$, $tr$["They give us correct information", "We do not need them", "Just guess", "They are useless"]$tr$::jsonb),
('af96cf86-476e-439e-a3cc-dc5d695bfcdc', $tr$Where should extra cooking oil be thrown?$tr$, $tr$["In the trash bin", "In the sink", "In the drain", "Anywhere"]$tr$::jsonb),
('b063d183-9ec5-4e10-8558-e805de63ee1d', $tr$Which is an example of pressing?$tr$, $tr$["Making juice", "Making a pot", "Making a book", "Making a chair"]$tr$::jsonb),
('b0f722c8-fa06-4816-bf5c-79ff987f4c74', $tr$When is the rainy season generally?$tr$, $tr$["June to November", "March to May", "December to February", "All year equally"]$tr$::jsonb),
('b3492278-3167-4309-875e-b31dd787f149', $tr$What do we call looking carefully at the details?$tr$, $tr$["Observing", "Predicting", "Measuring", "Playing"]$tr$::jsonb),
('b39e2b51-fa84-4ba9-be51-94c27cc79600', $tr$Which local animal is an example of a vertebrate?$tr$, $tr$["Frog", "Worm", "Crab", "Snail"]$tr$::jsonb),
('b4c83f1d-b9dc-4c6a-95d8-95ff45df2168', $tr$What is the dry season?$tr$, $tr$["Hot, with little rain", "A lot of rain", "There is snow", "There is no sun"]$tr$::jsonb),
('b618b938-1f5c-47c1-a9f2-8c9ab4f38059', $tr$Why can a sweet potato plant survive a long dry season?$tr$, $tr$["Its tuber stores food and water", "Its thorns keep animals away", "Its tendrils reach for rain", "Its leaves close up tightly"]$tr$::jsonb),
('b62063aa-e4ba-4559-a057-d816aea6685b', $tr$A tray of water is placed in the freezer and becomes ice, then later the ice is left on the counter and turns back into water. What do these two events show about heating and cooling?$tr$, $tr$["Cooling can freeze a liquid into a solid, and heating can melt that same solid back into a liquid -- the changes can be reversed", "Once water freezes, it can never become liquid again", "Freezing and melting are exactly the same process", "Only heating can cause a change of state"]$tr$::jsonb),
('b659d7af-3571-4f06-9c5f-00c0857d0ae0', $tr$What should you do in heavy rain or a typhoon?$tr$, $tr$["Stay inside the house", "Play outside", "Swim in the sea", "Fly a kite"]$tr$::jsonb),
('b6c21ed4-f0cc-461d-8bf7-895bd22cfdf4', $tr$Why are these metals important?$tr$, $tr$["They are part of our everyday life", "They have no use", "Just for tests", "They have no properties"]$tr$::jsonb),
('b6e04489-1b5e-4d9a-8beb-59d1e186733e', $tr$What science idea do we use when we turn on a light?$tr$, $tr$["Energy", "History", "Art", "Music"]$tr$::jsonb),
('b74b35cb-50ce-4717-acb7-cefa9c01bb1e', $tr$In the chain Rice plant → Rat → Snake → Eagle, what is the rat's feeding group?$tr$, $tr$["Herbivore", "Carnivore", "Omnivore", "Producer"]$tr$::jsonb),
('b76b27cd-e618-4f94-b494-6ac6f31ee697', $tr$Which local animal is an example of a vertebrate?$tr$, $tr$["Frog", "Worm", "Crab", "Snail"]$tr$::jsonb),
('b78fcd0f-2bf2-484e-92d3-a0aa7aa64088', $tr$Why is it dangerous to look at the sun?$tr$, $tr$["It can hurt your eyes", "There is no danger", "It makes eyesight stronger", "It makes eyesight better"]$tr$::jsonb),
('b79cd8a0-d6c8-46ec-a9fd-2a52a363ae95', $tr$What happens when we cook food?$tr$, $tr$["The materials change their form", "Nothing changes", "It only gets bigger", "It only gets smaller"]$tr$::jsonb),
('ba4215f0-c640-4298-9990-eacc011a65bc', $tr$Why does a stone keep the same shape no matter what container or bag you place it in, while water does not?$tr$, $tr$["Because a solid has its own fixed shape, but a liquid takes the shape of its container", "Because stones are heavier than water", "Because water has no mass", "Because stones cannot be moved"]$tr$::jsonb),
('ba9032ff-6b39-45e1-87b7-60d54abf7060', $tr$A banyan tree's roots growing above the ground are called:$tr$, $tr$["aerial roots", "tap roots", "tuber roots", "bulb roots"]$tr$::jsonb),
('baae16ac-7b7f-43da-86b9-eeb89ad13110', $tr$What can happen if we don't get ready for a typhoon?$tr$, $tr$["Our family may not be safe", "Nothing will happen", "We are always safe even if we don't get ready", "Getting ready is not important"]$tr$::jsonb),
('bbba859b-14d9-4952-8d20-19d943153dfb', $tr$How many senses do we have?$tr$, $tr$["Five", "Three", "Four", "Six"]$tr$::jsonb),
('bc037e3b-7e29-42fd-a494-ff16c1ea47fc', $tr$Which body part do we use for sight?$tr$, $tr$["Eyes", "Ears", "Nose", "Tongue"]$tr$::jsonb),
('be116c31-593e-4d5d-8d0a-245a76699877', $tr$What does a scientist do first?$tr$, $tr$["Observes carefully", "Sleeps", "Eats", "Just plays"]$tr$::jsonb),
('be519de4-6010-4a6d-ab2a-b8b018ef4f5a', $tr$What does a scientist do first?$tr$, $tr$["Observes carefully", "Sleeps", "Eats", "Just plays"]$tr$::jsonb),
('be9d46c3-661b-4266-b685-ac73959a3cce', $tr$An onion is made of layered, fleshy leaf-like parts wrapped around each other underground. What structure is this?$tr$, $tr$["Bulb", "Rhizome", "Tuber", "Thorn"]$tr$::jsonb),
('bf3a93f6-3e1e-4a74-902d-77f2dea567a4', $tr$What do we call looking carefully at details?$tr$, $tr$["Observing", "Predicting", "Measuring", "Playing"]$tr$::jsonb),
('bf6e524c-3082-49e1-bed4-8ab5100267d4', $tr$What is an example of a non-living thing that can be affected?$tr$, $tr$["Water", "Tree", "Animal", "Person"]$tr$::jsonb),
('c00af67b-b78a-4f9d-91af-dfe5065f0f54', $tr$Why wear thick clothes when it rains?$tr$, $tr$["So we don't get sick from the cold and wet", "To feel hot", "To play in the sea", "No reason"]$tr$::jsonb),
('c0625040-e82c-4e42-9dec-1d23355e2b96', $tr$Which one is a science skill?$tr$, $tr$["Asking questions", "Sleeping", "Just playing", "Watching TV"]$tr$::jsonb),
('c33bc9e3-7684-4fd8-9fe3-87ec46250f16', $tr$What does loud sound do to the ears?$tr$, $tr$["It can hurt the ears over time", "It has no effect", "It makes the ears stronger", "It makes hearing better"]$tr$::jsonb),
('c3ce76d2-7c6c-4c7c-8b54-444ea3e12be8', $tr$Who is affected by these changes?$tr$, $tr$["Both living and non-living things", "Only people", "Only animals", "No one"]$tr$::jsonb),
('c486b3d2-e78c-4f6f-9c31-be2fbf0dcc2c', $tr$Two main Philippine seasons?$tr$, $tr$["Dry season and Rainy season", "Winter and Summer", "Spring and Fall", "Wet and Frozen"]$tr$::jsonb),
('c4e23999-17b6-4a18-9acd-112acf034c63', $tr$When is the rainy season?$tr$, $tr$["June to November", "March to May", "January to February", "Never"]$tr$::jsonb),
('c5777f8e-d85e-4107-a509-f02e71188c46', $tr$What does loud sound do to the ears?$tr$, $tr$["It can hurt them over time", "No effect", "It makes the ears stronger", "It makes hearing better"]$tr$::jsonb),
('c7caa61e-e624-4bb4-9b48-741a43d5ccb5', $tr$What is melting?$tr$, $tr$["A solid changing into a liquid", "A liquid changing into a gas", "A gas changing into a solid", "No change"]$tr$::jsonb),
('ca1c10dd-15ac-4f5c-bbec-218d782bdd9c', $tr$What do we call giving a material a form?$tr$, $tr$["Shaping", "Cutting", "Pressing", "Hammering"]$tr$::jsonb),
('cad63122-ea6a-4844-bdbf-54d54a70791d', $tr$What are natural causes of movement?$tr$, $tr$["Wind, water, gravity", "Only people pushing", "Only lifting", "None"]$tr$::jsonb),
('cbc3ba9c-adeb-4252-b100-972ff9957bd6', $tr$What do we call using things again?$tr$, $tr$["Reuse", "Recycle", "Reduce", "Burn it"]$tr$::jsonb),
('cc423c46-f609-44e5-af68-9da985b4a5e7', $tr$What do we call a guess based on evidence?$tr$, $tr$["Prediction", "Observation", "Measurement", "Conclusion"]$tr$::jsonb),
('cd8aa0c7-2e86-40d4-b3f6-4dd3471136d2', $tr$What do we call guessing what will happen based on evidence?$tr$, $tr$["Prediction", "Observation", "Measurement", "Conclusion"]$tr$::jsonb),
('ce0c0fce-3f5a-4463-b2d6-c3f0726a9e1d', $tr$Rice cake batter is runny and takes the shape of its pan before baking. After baking, it holds its own shape even outside the pan. What changed?$tr$, $tr$["It changed from behaving like a liquid to behaving like a solid", "It changed from a gas to a liquid", "It lost all of its mass", "It stopped being matter"]$tr$::jsonb),
('ce49c8c1-5c9a-4de6-b354-5dd8cb4e2fe1', $tr$What do we call using things again?$tr$, $tr$["Reuse", "Recycle", "Reduce", "Burn it"]$tr$::jsonb),
('ce564fdf-6f70-44d9-b6a7-913180168885', $tr$Why is it important to learn how raw materials become useful?$tr$, $tr$["To understand where the things we use every day come from", "It is not important", "It is not related to our life", "It is not part of Science"]$tr$::jsonb),
('ceefe466-9887-42e7-a4e3-7c12bd526fc3', $tr$During a long dry season (dry season), a sweet potato plant's leaves wither, but its underground tubers survive and later sprout new leaves when rain returns. How did the tuber help the plant survive the drought?$tr$, $tr$["The tuber stored food (and some moisture) that let the plant survive underground even when the leaves above dried out", "The tuber attracted more rain to the plant", "The tuber made the plant grow taller during the drought", "The tuber had no effect on survival"]$tr$::jsonb),
('cf4f611f-c5c2-4a20-90ef-cc3dffb890e4', $tr$When you notice that the water is hot, what did you do?$tr$, $tr$["Observation", "Dreaming", "Playing", "Eating"]$tr$::jsonb),
('d02d05ff-b4bb-42be-a59c-26f3861e8c59', $tr$In the chain Rice plant → Rat → Snake → Eagle, what starts the food chain?$tr$, $tr$["Rice plant (a plant)", "Rat", "Snake", "Eagle"]$tr$::jsonb),
('d051666f-67c8-482d-b934-13db58bc8e86', $tr$How many senses do we have?$tr$, $tr$["Five", "Three", "Four", "Six"]$tr$::jsonb),
('d1ab4c51-4ac3-4d66-ad29-8ad649e6ff21', $tr$What is a lever?$tr$, $tr$["A bar that helps lift things using a fixed point", "Just a round wheel", "A kind of liquid", "A kind of animal"]$tr$::jsonb),
('d23c6c3c-171a-43c9-b7b6-707fc6306be9', $tr$A calamansi bush with thorny branches is less likely to be fully eaten by grazing animals compared to a thornless bush nearby. What survival advantage do the thorns provide?$tr$, $tr$["They physically discourage or injure animals that try to eat the plant, reducing how much gets eaten", "They make the fruit taste better to animals", "They absorb more sunlight than a thornless plant", "They allow the plant to survive without roots"]$tr$::jsonb),
('d2cc289e-e515-4ff7-8cf1-3b07742fdfe5', $tr$Is a milkfish a vertebrate or invertebrate?$tr$, $tr$["Vertebrate, because fish have a backbone", "Invertebrate, because fish have no backbone", "Neither, because fish are not classified", "Both, depending on the type of fish"]$tr$::jsonb),
('d50cb8de-5c89-4c0a-9ff3-81d4603a66d0', $tr$Which is an example of science at home?$tr$, $tr$["Cooking food", "Playing ball", "Sleeping", "Watching TV"]$tr$::jsonb),
('d5e3ab5b-3226-4755-865b-e0e9f327a8b6', $tr$What is a natural source of light?$tr$, $tr$["The sun", "A room light", "A flashlight", "Only a candle"]$tr$::jsonb),
('d612087c-f759-4c92-ba23-9cc1fed91dab', $tr$How does weight affect movement?$tr$, $tr$["Heavy objects are harder to move", "No effect", "Light objects are harder to move", "Weight is only for liquids"]$tr$::jsonb),
('d6e0b38e-786a-44fb-b13d-5ab2478477d0', $tr$What is done to clay to make it into a pot?$tr$, $tr$["It is shaped", "It is only cut", "It is burned right away", "Nothing"]$tr$::jsonb),
('d83fc998-8b4c-4329-bb8a-b3eae9f475e7', $tr$What can happen if we don't get ready for a typhoon?$tr$, $tr$["We may not be safe", "No effect", "We are always safe", "It is not important"]$tr$::jsonb),
('d8ed132d-e1ed-42c5-b61a-1d97de415642', $tr$Ginger grows from which structure?$tr$, $tr$["Rhizome", "Bulb", "Thorn", "Aerial root"]$tr$::jsonb),
('da04db59-9ec7-4ced-933c-2e5ce23ffb01', $tr$Which is an example of science at home?$tr$, $tr$["Cooking food", "Playing ball", "Sleeping", "Watching TV"]$tr$::jsonb),
('da9a8567-dab2-477a-b679-728016c7a792', $tr$A taro plant's rhizome survives after a typhoon destroys its leaves, but a similar leafy plant WITHOUT a rhizome dies completely after the same storm. What does comparing these two outcomes suggest about the rhizome's survival value?$tr$, $tr$["Having an underground food-storage structure like a rhizome gives a plant a way to recover after losing its above-ground parts, which a plant without one lacks", "The rhizome caused the other plant to die", "Both plants would have survived equally without the rhizome", "The typhoon only affects plants with rhizomes"]$tr$::jsonb),
('dc43f4c6-a30e-4076-8dbf-55b22920b752', $tr$A sealed sack of rice grains is poured onto a table. The rice pile spreads out and does not keep the sack's shape. Does this mean rice grains behave like a liquid? Why or why not?$tr$, $tr$["No -- each individual rice grain is still a solid with its own fixed shape; only the whole pile's outer shape changes because it is made of many separate solid grains", "Yes -- because the pile takes the shape of the table", "Yes -- because rice grains have no mass", "No -- because rice is a gas"]$tr$::jsonb),
('dcc4e303-7b3b-4978-a769-854b304359cb', $tr$What is done to iron to make it into a spoon?$tr$, $tr$["It is hammered", "It is only pressed", "It is burned", "Nothing"]$tr$::jsonb),
('dda8e693-e867-4fec-9ba2-447cc3225337', $tr$What do we use to taste food?$tr$, $tr$["Tongue", "Ears", "Eyes", "Nose"]$tr$::jsonb),
('e0413a44-fcff-4d7c-9a6e-c8371f16b184', $tr$What do we use to taste sweet food?$tr$, $tr$["Tongue", "Ears", "Eyes", "Nose"]$tr$::jsonb),
('e123e676-c1bb-4ecc-9f5a-e24f5b5da137', $tr$What can be done with a piece of wood?$tr$, $tr$["Cut and shape it to make a chair", "Nothing can be done with it", "Just throw it away", "Just burn it"]$tr$::jsonb),
('e12a4f47-4727-43f9-b317-61c49006ca28', $tr$Which of these is an example of a testable question?$tr$, $tr$["Does fish sauce evaporate faster than water at the same temperature?", "Which soft drink tastes the best?", "Is summer the best season?", "What color is prettiest?"]$tr$::jsonb),
('e187e49b-5c62-4426-8cca-41318352bfb5', $tr$Ginger and turmeric grow from thick underground stems that spread sideways and sprout new shoots. What structure is this?$tr$, $tr$["Rhizome", "Tuber", "Bulb", "Thorn"]$tr$::jsonb),
('e2b639e2-5dd4-49d5-bd5e-10ad62cb9757', $tr$After 3 days, a student's open cup of water is almost empty, while the same-sized, same-amount cup of milk is only slightly reduced. What is the best conclusion?$tr$, $tr$["Water evaporated faster than milk under the same conditions in this investigation", "Milk always evaporates faster than water everywhere", "The cups must have been different sizes", "No conclusion can be made from this data"]$tr$::jsonb),
('e364c6d3-31c3-4e61-8b79-a69ffd8012e9', $tr$What happens when we throw trash away properly?$tr$, $tr$["Nature is protected", "Nothing happens", "Nature is harmed", "It causes problems"]$tr$::jsonb),
('e4442bca-7b03-46f5-923f-fc2f5122a297', $tr$What happens if an object's position changes so it comes closer to you?$tr$, $tr$["It is moving closer", "It is moving away", "Nothing happened", "It changed color"]$tr$::jsonb),
('e45c28e8-883c-4ccf-a956-562251bf4458', $tr$A pot of water is boiling on the stove with a lid on top. After a few minutes, the underside of the lid is covered with water droplets. Explain what happened using two processes from this week.$tr$, $tr$["Evaporation turned some boiling water into steam (a gas), and when that steam touched the cooler lid, condensation turned it back into liquid droplets", "The lid absorbed water directly from the pot", "Freezing caused the droplets to appear on the lid", "The water on the lid came from outside the pot"]$tr$::jsonb),
('e46ce51c-6ed9-4352-ac25-fef790b48c95', $tr$You pour fish sauce from a bottle into a small saucer. What state of matter is the fish sauce?$tr$, $tr$["Liquid", "Solid", "Gas", "It has no state"]$tr$::jsonb),
('e4ad8275-cdec-41b2-bb1c-7abe61525b3e', $tr$Sweet potato grows a swollen underground part that stores starch, which people dig up and eat. What structure is this?$tr$, $tr$["Tuber", "Bulb", "Aerial root", "Tendril"]$tr$::jsonb),
('e4af68df-c4b8-4780-a3c9-6e4dfe3f60f1', $tr$How does weather affect farming?$tr$, $tr$["It helps farmers decide when to plant", "It has no effect on farming", "Farmers never think about it", "Weather has nothing to do with crops"]$tr$::jsonb),
('e51f7e1f-8489-47c8-8916-9a8a11f4f36f', $tr$What do we call a guess based on evidence?$tr$, $tr$["Prediction", "Observation", "Measurement", "Conclusion"]$tr$::jsonb),
('e5ec5385-7828-448e-9f0b-c0c48c9a9ae1', $tr$Which plant grows in a mangrove swamp?$tr$, $tr$["Mangrove tree", "Rice plant", "Hibiscus", "Tomato"]$tr$::jsonb),
('e5f0da0b-5b03-47d6-8fe2-e9cabd2eb0af', $tr$Milk is poured from a tall glass into a wide, shallow bowl. It looks different but the same amount is still there. Which property of liquids does this show?$tr$, $tr$["Liquids have a definite volume but an indefinite (changing) shape", "Liquids have a definite shape", "Liquids have no volume", "Milk is a solid"]$tr$::jsonb),
('e685ffdf-8504-4424-862b-563908ea67c1', $tr$What do we call guessing what will happen based on evidence?$tr$, $tr$["Prediction", "Observation", "Measurement", "Conclusion"]$tr$::jsonb),
('e777637e-5f47-4f7a-80ce-a54b819e5d64', $tr$Water is placed in the freezer overnight and becomes solid ice. What process is this?$tr$, $tr$["Freezing", "Melting", "Evaporation", "Condensation"]$tr$::jsonb),
('e86a8c6d-f9e6-4337-8de3-bb7a53d92c2d', $tr$Why do we use simple machines?$tr$, $tr$["They make work easier", "They make work harder", "They have no purpose", "To make the house pretty"]$tr$::jsonb),
('e8f269da-46a3-4578-8a20-6b7b425bd991', $tr$Why is it important to understand the weather?$tr$, $tr$["It helps us get ready and make choices", "It is useless", "Just for fun", "It does not help"]$tr$::jsonb),
('e8febc8a-fce3-4d2d-b424-47f5d10e9f67', $tr$What is the dry season?$tr$, $tr$["A season that is hot, with little rain", "A season with a lot of rain", "A season with snow", "A season with no sun"]$tr$::jsonb),
('ea05f878-ac24-47d2-99d5-688e107917c1', $tr$A recipe needs exactly 1 liter of milk, but the only container available is marked in mL. How can a student figure out how many mL to pour?$tr$, $tr$["Pour milk until the graduated container reads 1000 mL, since 1 L equals 1000 mL", "Pour milk until it reads 1 mL", "Use a thermometer instead of a graduated container", "It is impossible to convert between L and mL"]$tr$::jsonb),
('eae07f34-311c-4b26-b042-e9a00eea7110', $tr$The tomato you slice for salad is actually which plant part?$tr$, $tr$["Fruit", "Root", "Stem", "Flower"]$tr$::jsonb),
('ed16f963-b82b-4de6-8b1f-928b2cc13f0c', $tr$Which sense organ do we use to feel the heat of the sun?$tr$, $tr$["Skin", "Eyes", "Ears", "Nose"]$tr$::jsonb),
('ed5715ac-5424-4170-bdfa-453ec225d50b', $tr$How is sound made?$tr$, $tr$["An object vibrating", "An object staying still", "Changing color", "There is no way"]$tr$::jsonb),
('ef3c2d44-46e6-48af-8706-42513b6610dd', $tr$What does a scientist use to measure heat?$tr$, $tr$["Thermometer", "Rain gauge", "Wind vane", "Compass"]$tr$::jsonb),
('f0b02025-84b1-4b42-a74a-1eda3b66e05b', $tr$What does a scientist do?$tr$, $tr$["Observes and asks questions", "Sleeps all day", "Only plays", "None of these"]$tr$::jsonb),
('f2aa39f0-cfec-4563-ab11-461823371a39', $tr$Which is an example of science in the community?$tr$, $tr$["Using machines in the market", "Watching a movie", "Playing with toys", "Singing"]$tr$::jsonb),
('f3aad393-36ce-4f65-9755-c9b6e0c2252c', $tr$Why should we understand the weather?$tr$, $tr$["It helps us get ready and make choices", "It is useless", "Just for fun", "It does not help"]$tr$::jsonb),
('f3e101c1-ee4c-4ef9-80e4-446ae540e1f9', $tr$A student designs a test comparing how fast paper towels absorb water versus tissue paper, using the same amount of water, the same size of paper, and the same pouring method for both. What makes this a strong, fair investigation plan?$tr$, $tr$["Only one factor (the type of paper) is different, while everything else that could affect the result is kept the same", "It uses two different types of paper, which is enough on its own", "It does not need a written procedure since the materials are simple", "It compares two liquids instead of two materials"]$tr$::jsonb),
('f408fc50-6720-4b20-af4a-5fae835e48af', $tr$What is made from clay?$tr$, $tr$["Bricks and pots", "Glass", "Electricity", "Clothes"]$tr$::jsonb),
('f447d378-e6a9-4a5d-86b9-37b94b713123', $tr$What is a fair test?$tr$, $tr$["Testing one factor while keeping all the others the same", "Just counting", "Just playing", "It has no meaning"]$tr$::jsonb),
('f6198a68-f10e-41d3-bda3-6629bd0c2efe', $tr$What is the big lesson about weather and daily life?$tr$, $tr$["Weather has a big effect on our clothes, activities, and work", "Weather has no connection to our lives", "Weather is not important to our choices", "Weather does not affect anyone"]$tr$::jsonb),
('f635aad3-6878-48d9-b68b-7723ad4eedf2', $tr$What is a solid?$tr$, $tr$["Matter with a fixed shape", "Matter that takes the shape of its container", "Matter that spreads to fill a space", "None of these"]$tr$::jsonb),
('f6f7750f-9c1d-42b2-8f3e-4e9e8d5ee524', $tr$What are scissors used for in science?$tr$, $tr$["Cutting", "Measuring", "Sticking things", "Cleaning"]$tr$::jsonb),
('f82ded61-82d0-4eb4-b6c8-54005ca95855', $tr$Why is it important to take proper care of materials?$tr$, $tr$["It protects nature", "There is no reason", "Just for grades", "To carry things"]$tr$::jsonb),
('f93a91b8-6d2c-4b5b-9718-28aa7ec2aa75', $tr$A piece of ice is left out on a table on a warm day and turns into water. What process is this?$tr$, $tr$["Melting", "Freezing", "Evaporation", "Condensation"]$tr$::jsonb),
('faf6f58f-088a-4b90-9ad0-b5befe2b3b2a', $tr$What is a wheel-and-axle?$tr$, $tr$["A wheel attached to a rod", "A bar with a fixed point", "A kind of liquid", "A flat surface"]$tr$::jsonb),
('fb3ad5dc-572d-4d69-b790-43bd1502d5b9', $tr$What tool measures heat?$tr$, $tr$["Thermometer", "Rain gauge", "Wind vane", "Ruler"]$tr$::jsonb),
('fb43d2b2-81fb-486b-9a8f-b3f0e020ec14', $tr$If you could seal air inside a small balloon and then inside a very large empty room, what would happen to its shape and volume?$tr$, $tr$["It would spread out to take the shape and volume of whichever space contains it", "It would always stay the same size no matter what", "It would turn into a liquid in the larger room", "It would disappear"]$tr$::jsonb),
('fbe135bb-d1b4-4790-865d-acdd51aaad2f', $tr$How many trials does a valid experiment need?$tr$, $tr$["At least three", "Only one", "None", "Ten"]$tr$::jsonb),
('fbe9586b-5110-48eb-80ce-3986d36a68ff', $tr$What is a property of iron?$tr$, $tr$["Strong", "Soft", "Sticky", "Only cold"]$tr$::jsonb),
('fdaa84fa-4942-4af9-acf7-205ab4d7dce3', $tr$Mrs. Nena wants to measure exactly how much milk is left in a jug for a recipe. Which tool and unit should she use?$tr$, $tr$["A graduated container, measured in mL or L", "A thermometer, measured in °C", "A ruler, measured in cm", "A weighing scale, measured in kg"]$tr$::jsonb);

insert into _sci_boss values
('03fec063-d1d2-4744-b9e8-04c3a5d4d91c', $tr$What tool is used to measure heat?$tr$, $tr$["Thermometer", "Rain gauge", "Wind vane", "Compass"]$tr$::jsonb, $tr$The Two Seasons in the Philippines$tr$),
('046f2e72-b513-4c6e-afe1-3fe92d06b558', $tr$Why learn how raw materials become useful?$tr$, $tr$["To understand where the things we use every day come from", "It is not important", "It has nothing to do with life", "It is not part of Science"]$tr$::jsonb, $tr$Review: Movement, Sound, Light, and Non-Living Things$tr$),
('047fd916-08f2-4339-affa-b10125f467fe', $tr$How does the weather affect farming?$tr$, $tr$["It helps farmers decide when to plant", "It has no effect on farming", "Farmers never think about it", "Weather has nothing to do with crops"]$tr$::jsonb, $tr$How Weather Affects Daily Life$tr$),
('071f9540-e582-48f4-a685-36ca948710cf', $tr$When does the rainy season usually happen?$tr$, $tr$["June to November", "March to May", "January to February only", "It never happens"]$tr$::jsonb, $tr$The Two Seasons in the Philippines$tr$),
('07e8a25d-0501-47e3-a2b2-97075b84d84e', $tr$A student wants to test which of two liquids, vinegar or water, evaporates faster, but pours 100 mL of vinegar into a wide bowl and only 50 mL of water into a narrow cup. What is the problem with this plan?$tr$, $tr$["Both the amount of liquid and the container shape are different, so it is not a fair comparison", "There is no problem because both are liquids", "The problem is that vinegar was used at all", "The problem is that the student used two different liquids, which is not allowed"]$tr$::jsonb, $tr$Evaluating fair tests$tr$),
('0a778b45-1d90-4345-98ea-dbea58dc15ac', $tr$What tool measures heat?$tr$, $tr$["Thermometer", "Rain gauge", "Wind vane", "Ruler"]$tr$::jsonb, $tr$Review: Weather, Matter, and Forces$tr$),
('0afb8c34-020b-4e24-aeb3-02757b071036', $tr$Why use measuring tools?$tr$, $tr$["They give correct information", "They are not needed", "Just guess", "They have no use"]$tr$::jsonb, $tr$The Two Seasons in the Philippines$tr$),
('0b1ce87a-ddb6-4072-936d-ad33fa4967b0', $tr$Why is weather important?$tr$, $tr$["It helps us get ready", "It means nothing", "It is just for fun", "It does not help"]$tr$::jsonb, $tr$Review: Weather, Matter, and Forces$tr$),
('0bb8d685-a74d-4234-aeb3-c32dd38200cb', $tr$What tool tells how hot the day is?$tr$, $tr$["Thermometer", "Umbrella", "Raincoat", "Boots"]$tr$::jsonb, $tr$The Two Seasons in the Philippines$tr$),
('0be08e55-cb36-4648-ab34-f0976a69ad99', $tr$A taro plant's rhizome survives after a typhoon destroys its leaves, but a similar leafy plant WITHOUT a rhizome dies completely after the same storm. What does comparing these two outcomes suggest about the rhizome's survival value?$tr$, $tr$["Having an underground food-storage structure like a rhizome gives a plant a way to recover after losing its above-ground parts, which a plant without one lacks", "The rhizome caused the other plant to die", "Both plants would have survived equally without the rhizome", "The typhoon only affects plants with rhizomes"]$tr$::jsonb, $tr$Evaluating survival evidence$tr$),
('0ce6a4e4-49f5-4186-8f9d-cef00d117067', $tr$Why is it dangerous to look at the sun?$tr$, $tr$["It can hurt your eyes", "There is no danger", "It makes your eyes stronger", "It makes you see better"]$tr$::jsonb, $tr$Review: Movement, Sound, Light, and Non-Living Things$tr$),
('0e0fab7b-d8f5-4953-be0c-ac22b948d28d', $tr$What is evaporation?$tr$, $tr$["A liquid turning into a gas", "A solid turning into a liquid", "A gas turning into a solid", "No change"]$tr$::jsonb, $tr$Review: Weather, Matter, and Forces$tr$),
('0e921561-37fa-4c4f-870b-a81878f776a4', $tr$Ginger and turmeric grow from thick underground stems that spread sideways and sprout new shoots. What structure is this?$tr$, $tr$["Rhizome", "Tuber", "Bulb", "Thorn"]$tr$::jsonb, $tr$Applying rhizome identification$tr$),
('10821b3d-0afe-412b-9777-c4269c55ba08', $tr$During a long dry season, a sweet potato plant's leaves wither, but its underground tubers survive and later sprout new leaves when rain returns. How did the tuber help the plant survive the drought?$tr$, $tr$["The tuber stored food (and some moisture) that let the plant survive underground even when the leaves above dried out", "The tuber attracted more rain to the plant", "The tuber made the plant grow taller during the drought", "The tuber had no effect on survival"]$tr$::jsonb, $tr$Applying survival reasoning to tubers$tr$),
('124078c8-a56f-4f65-ae1d-a15c52bfa12b', $tr$Milk is poured from a tall glass into a wide, shallow bowl. It looks different but the same amount is still there. Which property of liquids does this show?$tr$, $tr$["Liquids have a definite volume but an indefinite (changing) shape", "Liquids have a definite shape", "Liquids have no volume", "Milk is a solid"]$tr$::jsonb, $tr$Applying liquid properties$tr$),
('12819e43-383b-4813-b237-7a337a991cf1', $tr$Which tool measures heat?$tr$, $tr$["Thermometer", "Rain gauge", "Wind vane", "Ruler"]$tr$::jsonb, $tr$Review: Weather, Matter, and Forces$tr$),
('15b3ed7f-9145-41c8-8fd5-3a86c5f695a6', $tr$An onion is made of layered, fleshy leaf-like parts wrapped around each other underground. What structure is this?$tr$, $tr$["Bulb", "Rhizome", "Tuber", "Thorn"]$tr$::jsonb, $tr$Applying bulb identification$tr$),
('168ad08d-d211-4eea-8383-6011bfbb43b9', $tr$Why is it important to learn how raw materials become useful?$tr$, $tr$["To understand where the things we use every day come from", "It is not important", "It has nothing to do with our lives", "It is not part of Science"]$tr$::jsonb, $tr$Review: Movement, Sound, Light, and Non-Living Things$tr$),
('178eba42-b81f-4aae-8ae0-5bbe9454cca3', $tr$A natural source of light?$tr$, $tr$["The sun", "A light in the room", "Flashlight", "A candle only"]$tr$::jsonb, $tr$Review: Movement, Sound, Light, and Non-Living Things$tr$),
('1870ed9f-13f3-4404-8563-675f0c49e15f', $tr$After 3 days, a student's open cup of water is almost empty, while the same-sized, same-amount cup of milk is only slightly reduced. What is the best conclusion?$tr$, $tr$["Water evaporated faster than milk under the same conditions in this investigation", "Milk always evaporates faster than water everywhere", "The cups must have been different sizes", "No conclusion can be made from this data"]$tr$::jsonb, $tr$Drawing conclusions$tr$),
('19517e01-b666-434a-acc9-9ee3da7cabbc', $tr$In the chain Rice plant → Rat → Snake → Eagle, what starts the food chain?$tr$, $tr$["Rice plant (a plant)", "Rat (an animal)", "Snake (an animal)", "Eagle (a bird)"]$tr$::jsonb, $tr$Food Chains$tr$),
('1a0582ec-160b-499d-8fa0-908f09539757', $tr$The big lesson about weather?$tr$, $tr$["It has a big effect on clothes, activities, and jobs", "It has no link to our lives", "It does not matter in our choices", "It does not affect anyone"]$tr$::jsonb, $tr$How Weather Affects Daily Life$tr$),
('1ae35a19-dba6-4ac3-b2d5-b84856e7513f', $tr$What clothes are good for the rainy season?$tr$, $tr$["A raincoat, and bring an umbrella", "Swimsuit only", "Sunglasses only", "Snow boots"]$tr$::jsonb, $tr$How Weather Affects Daily Life$tr$),
('1e1293e8-daa0-42b1-9802-3e48642fca7d', $tr$A farmer notices that his onion crop, grown from bulbs, survives short dry spells better than a leafy vegetable planted nearby with no storage structures. Using what you know about bulbs, explain why.$tr$, $tr$["The bulb's stored food and layered structure let the plant draw on reserves during the dry spell, while the leafy vegetable has no such reserve to fall back on", "Onions do not need water at all, unlike other vegetables", "The bulb makes rain fall more often near the onion crop", "There is no real difference between the two plants during a dry spell"]$tr$::jsonb, $tr$Multi-step drought reasoning$tr$),
('21dc14a2-2111-4095-bd20-169a6a40f0c8', $tr$What do we call a very strong storm?$tr$, $tr$["Typhoon", "Hot season", "Amihan only", "Summer"]$tr$::jsonb, $tr$The Two Seasons in the Philippines$tr$),
('2256145e-08f7-4de2-8e7d-5861e5c8f1cf', $tr$Which group correctly names one solid, one liquid, and one gas, in that order?$tr$, $tr$["Stone, water, air", "Water, air, stone", "Air, stone, water", "Stone, stone, water"]$tr$::jsonb, $tr$Sorting matter$tr$),
('2735c3d5-799a-4bd3-be76-f81be70c5d39', $tr$A pot of water is boiling on the stove with a lid on top. After a few minutes, the underside of the lid is covered with water droplets. Explain what happened using two processes from this week.$tr$, $tr$["Evaporation turned some boiling water into steam (a gas), and when that steam touched the cooler lid, condensation turned it back into liquid droplets", "The lid absorbed water directly from the pot", "Freezing caused the droplets to appear on the lid", "The water on the lid came from outside the pot"]$tr$::jsonb, $tr$Multi-step reasoning on state changes$tr$),
('289dcfba-3c0f-47af-bb19-5b853af9b4c8', $tr$What is a habitat?$tr$, $tr$["The natural home of a living thing", "Only a kind of food", "Only a science tool", "Only a kind of weather"]$tr$::jsonb, $tr$Habitats of Philippine Animals and Plants$tr$),
('2b3204b1-6e9c-470d-b9e6-618c67b0eebc', $tr$What are natural causes of movement?$tr$, $tr$["Wind, water, gravity", "Only people pushing", "Only people lifting", "None of these"]$tr$::jsonb, $tr$Review: Movement, Sound, Light, and Non-Living Things$tr$),
('2bf0ecf8-841f-4a1c-af19-33d571796c06', $tr$A tray of water is placed in the freezer and becomes ice, then later the ice is left on the counter and turns back into water. What do these two events show about heating and cooling?$tr$, $tr$["Cooling can freeze a liquid into a solid, and heating can melt that same solid back into a liquid -- the changes can be reversed", "Once water freezes, it can never become liquid again", "Freezing and melting are exactly the same process", "Only heating can cause a change of state"]$tr$::jsonb, $tr$Reasoning about reversible changes$tr$),
('2ca1030d-1da4-4bd6-8ee5-c8ddf490ec95', $tr$Why is it dangerous to look straight at the sun?$tr$, $tr$["It can hurt your eyes", "There is no danger", "It makes your eyes stronger", "It makes you see better"]$tr$::jsonb, $tr$Review: Movement, Sound, Light, and Non-Living Things$tr$),
('2d2fa3b1-e63f-4f5f-84b5-ce34aeedd0a1', $tr$Effect of weather on farming?$tr$, $tr$["It helps decide when to plant", "No effect", "Nobody thinks about it", "Nothing to do with crops"]$tr$::jsonb, $tr$How Weather Affects Daily Life$tr$),
('2d36b8e1-3f64-42db-8a7a-db9d876eab15', $tr$Why does a stone keep the same shape no matter what container or bag you place it in, while water does not?$tr$, $tr$["Because a solid has its own fixed shape, but a liquid takes the shape of its container", "Because stones are heavier than water", "Because water has no mass", "Because stones cannot be moved"]$tr$::jsonb, $tr$Reasoning about shape$tr$),
('2e61d6eb-9cbb-4dd8-bf5c-6f3283612c30', $tr$What is an example of a non-living thing?$tr$, $tr$["Rock", "Plant", "Animal", "Person"]$tr$::jsonb, $tr$Review: Movement, Sound, Light, and Non-Living Things$tr$),
('32264f10-5315-4734-afe5-29c469e21d52', $tr$During a strong typhoon with heavy wind, a bottle gourd vine with tendrils gripping a trellis stays attached, while a similar vine without any climbing structure gets blown down. What does this show about tendrils?$tr$, $tr$["Tendrils help anchor the plant to a support, helping it withstand strong wind", "Tendrils make the plant immune to all wind damage", "Tendrils have no effect during a typhoon", "Tendrils only work during droughts, not wind"]$tr$::jsonb, $tr$Applying survival reasoning to tendrils$tr$),
('340ee26d-612f-4d66-bcec-ad04e858ba6c', $tr$What is melting?$tr$, $tr$["A solid turning into a liquid", "A liquid turning into a gas", "A gas turning into a solid", "No change"]$tr$::jsonb, $tr$Review: Weather, Matter, and Forces$tr$),
('34a2228d-4211-48da-bc9c-f307705e17bd', $tr$You have 250 mL of vinegar in a bottle. You pour it into a wider jar. Which statement is TRUE?$tr$, $tr$["The vinegar still has 250 mL of volume, but now looks like a different shape", "The vinegar now has more volume", "The vinegar becomes a gas", "The vinegar's shape stays the same as the bottle"]$tr$::jsonb, $tr$Applying liquid properties$tr$),
('35c421e0-5a6e-42a5-90c9-f20210f26261', $tr$Products made from sand?$tr$, $tr$["Glass and cement", "Bricks only", "Electricity", "Clothes"]$tr$::jsonb, $tr$Review: Movement, Sound, Light, and Non-Living Things$tr$),
('3a3905ba-dea3-4231-aac1-d9aa1fa8e76f', $tr$How does the rainy season affect life?$tr$, $tr$["Bring an umbrella and watch out for floods", "No effect", "Drink lots of water", "Wear thin clothes"]$tr$::jsonb, $tr$The Two Seasons in the Philippines$tr$),
('3bd54ef2-9d8f-4e1d-abde-677bbcec5eea', $tr$An example of a gas?$tr$, $tr$["Air", "Rock", "Water", "Table"]$tr$::jsonb, $tr$Review: Weather, Matter, and Forces$tr$),
('401ffb11-e172-4c65-9557-d0cc2790e67c', $tr$Why wear thick clothes in rainy weather?$tr$, $tr$["So you do not get sick from the cold and wet", "To feel hot", "To play in the sea", "No reason"]$tr$::jsonb, $tr$How Weather Affects Daily Life$tr$),
('422ab5cf-7616-479e-bca2-6e9792041eeb', $tr$While measuring 200 mL of vinegar in a graduated cylinder, a student looks at the liquid from above instead of at eye level. What problem could this cause?$tr$, $tr$["The reading could be inaccurate because of the way the curved liquid surface looks from that angle", "There is no problem at all", "The vinegar will evaporate faster", "The cylinder will break"]$tr$::jsonb, $tr$Accurate measurement technique$tr$),
('448ec8aa-ccbf-45f9-b179-0df149d0843c', $tr$When is the dry season?$tr$, $tr$["March to May", "June to November", "December to January", "All year"]$tr$::jsonb, $tr$The Two Seasons in the Philippines$tr$),
('45ff82e5-e934-4857-b4d0-4139d44e0cbc', $tr$What can happen if you do not get ready for a typhoon?$tr$, $tr$["The family's safety can be in danger", "It has no effect", "You are always safe even if you do not get ready", "Getting ready is not important"]$tr$::jsonb, $tr$How Weather Affects Daily Life$tr$),
('48424590-8fd1-4416-878f-b29015d2093a', $tr$Products made from clay?$tr$, $tr$["Bricks and pots", "Glass", "Electricity", "Clothes"]$tr$::jsonb, $tr$Review: Movement, Sound, Light, and Non-Living Things$tr$),
('4b5473ed-9693-4157-a09f-451112378686', $tr$If you could seal air inside a small balloon and then inside a very large empty room, what would happen to its shape and volume?$tr$, $tr$["It would spread out to take the shape and volume of whichever space contains it", "It would always stay the same size no matter what", "It would turn into a liquid in the larger room", "It would disappear"]$tr$::jsonb, $tr$Reasoning about gases$tr$),
('4b73b081-565f-4fc7-89de-a7f387fd1bc0', $tr$What can loud sounds do to your ears?$tr$, $tr$["They can hurt your ears over time", "No effect", "They make your ears stronger", "They make your hearing better"]$tr$::jsonb, $tr$Review: Movement, Sound, Light, and Non-Living Things$tr$),
('538654fb-2831-4d78-b70d-314b9b3f03b8', $tr$Why is it important to understand the weather?$tr$, $tr$["It helps us get ready and make choices", "It means nothing", "It is just for fun", "It does not help"]$tr$::jsonb, $tr$Review: Weather, Matter, and Forces$tr$),
('561c6875-3fd2-46e5-935c-d7b5f9d00a24', $tr$What do scientists use to measure heat?$tr$, $tr$["Thermometer", "Rain gauge", "Wind vane", "Compass"]$tr$::jsonb, $tr$The Two Seasons in the Philippines$tr$),
('59e70d87-6e07-479f-9d25-9ec99ab334a7', $tr$How is sound made?$tr$, $tr$["When something vibrates", "When something stays still", "When something changes color", "There is no way"]$tr$::jsonb, $tr$Review: Movement, Sound, Light, and Non-Living Things$tr$),
('5b7f3452-b171-4fb3-8a43-1c2dbd82a621', $tr$What is the big lesson about weather and daily life?$tr$, $tr$["Weather has a big effect on our clothes, activities, and jobs", "Weather has no link to our lives", "Weather does not matter in our choices", "Weather does not affect anyone"]$tr$::jsonb, $tr$How Weather Affects Daily Life$tr$),
('5dc3acc5-8d91-4622-916e-03cda7126c0e', $tr$Which local animal is an example of an invertebrate?$tr$, $tr$["Firefly", "Frog", "Sparrow (bird)", "Dog"]$tr$::jsonb, $tr$Vertebrates and Invertebrates$tr$),
('60d60b5d-1eee-42e9-aeaa-7798ec478f0b', $tr$Effect of loud sounds on the ears?$tr$, $tr$["Can cause harm over time", "No effect", "Makes ears stronger", "Makes hearing better"]$tr$::jsonb, $tr$Review: Movement, Sound, Light, and Non-Living Things$tr$),
('61ca4181-0798-4d3c-8934-29684e2e7b57', $tr$When does the Philippine dry season generally occur?$tr$, $tr$["March to May", "June to November", "December to February", "All year round equally"]$tr$::jsonb, $tr$Philippine Seasons and Earth's Rotation$tr$),
('6365e72c-919f-4a97-a1e8-bd5aed65206a', $tr$Why understand the weather?$tr$, $tr$["It helps us get ready and make choices", "It means nothing", "It is just for fun", "It does not help"]$tr$::jsonb, $tr$How Weather Affects Daily Life$tr$),
('6665ca24-0815-4243-ba07-02bceaf25f76', $tr$What is a solid?$tr$, $tr$["Matter with a fixed shape", "Matter that takes the shape of its container", "Matter that spreads out to fill a space", "None of these"]$tr$::jsonb, $tr$Review: Weather, Matter, and Forces$tr$),
('69be951c-5dd5-4208-8546-61f5d0a24895', $tr$When is the rainy season?$tr$, $tr$["June to November", "March to May", "January to February", "Never"]$tr$::jsonb, $tr$The Two Seasons in the Philippines$tr$),
('6a15cd3e-23c7-4253-be42-25e4ca0cb9b3', $tr$Why do we need to bring an umbrella in the rainy season?$tr$, $tr$["So our body does not get wet", "To keep the sun off us", "To help fly a kite", "It has no use"]$tr$::jsonb, $tr$How Weather Affects Daily Life$tr$),
('6a9f7074-72bb-48e9-bde0-96cecb50ca8f', $tr$What happens if an object changes position toward you?$tr$, $tr$["It comes closer", "It moves away", "Nothing happened", "It changed color"]$tr$::jsonb, $tr$Review: Movement, Sound, Light, and Non-Living Things$tr$),
('7840c847-8c80-4665-b94e-3aa49ffb6673', $tr$What happens if an object changes its position toward you?$tr$, $tr$["It comes closer", "It moves away", "Nothing happened", "It changed color"]$tr$::jsonb, $tr$Review: Movement, Sound, Light, and Non-Living Things$tr$),
('7841c1d4-78e5-482e-b112-a4609141be8b', $tr$When is it better for farmers to plant some crops?$tr$, $tr$["In the rainy season, because there is enough water", "In the dry season only", "Any season, it makes no difference", "Never"]$tr$::jsonb, $tr$How Weather Affects Daily Life$tr$),
('7be36d92-f872-4d24-b2bc-af7c979971a9', $tr$What is a wheel-and-axle?$tr$, $tr$["A wheel joined to a rod; they turn together", "A bar with a fixed point", "A kind of liquid", "A flat surface"]$tr$::jsonb, $tr$Review: Weather, Matter, and Forces$tr$),
('7de6141e-49d5-4775-8290-705a75e6cbce', $tr$What is a lever?$tr$, $tr$["A bar that helps lift things using a fixed point", "Just a round wheel", "A kind of liquid", "A kind of animal"]$tr$::jsonb, $tr$Review: Weather, Matter, and Forces$tr$),
('7e4f5235-1803-416c-aff1-cebfbbb21f97', $tr$What products can be made from sand?$tr$, $tr$["Glass and cement", "Bricks only", "Electricity", "Clothes"]$tr$::jsonb, $tr$Review: Movement, Sound, Light, and Non-Living Things$tr$),
('7f4d31c1-7aea-4515-8ce1-07c75d79b384', $tr$Clothes for the rainy season?$tr$, $tr$["Raincoat and umbrella", "Swimsuit", "Sunglasses only", "Snow boots"]$tr$::jsonb, $tr$How Weather Affects Daily Life$tr$),
('7feceb41-53d4-4dd7-abf1-ad0e78e84095', $tr$What should you do during heavy rain or a typhoon?$tr$, $tr$["Stay inside the house to be safe", "Play outside", "Swim in the sea", "Fly a kite"]$tr$::jsonb, $tr$How Weather Affects Daily Life$tr$),
('80a20d8f-05a0-48e4-a49c-918214492983', $tr$A recipe needs exactly 1 liter of milk, but the only container available is marked in mL. How can a student figure out how many mL to pour?$tr$, $tr$["Pour milk until the graduated container reads 1000 mL, since 1 L equals 1000 mL", "Pour milk until it reads 1 mL", "Use a thermometer instead of a graduated container", "It is impossible to convert between L and mL"]$tr$::jsonb, $tr$Converting units$tr$),
('80ab727c-a7f1-4952-8cef-dbef400be724', $tr$A graduated cylinder shows a water level exactly at the 350 mark, with mL printed on the cylinder. How much water is there?$tr$, $tr$["350 mL", "350 L", "350 °C", "350 g"]$tr$::jsonb, $tr$Reading volume measurements$tr$),
('8487d00f-965c-42ef-a700-3da35ba11360', $tr$An example of a sound that gives information?$tr$, $tr$["Siren", "Picture", "Book", "Drawing"]$tr$::jsonb, $tr$Review: Movement, Sound, Light, and Non-Living Things$tr$),
('8687c150-bfa1-4491-9ed3-5cc75f1db08c', $tr$Natural causes of movement?$tr$, $tr$["Wind, water, gravity", "Only people pushing", "Only lifting", "None"]$tr$::jsonb, $tr$Review: Movement, Sound, Light, and Non-Living Things$tr$),
('88d324aa-c0a3-44f9-b1ad-7b6fcae2b11f', $tr$When is the dry season generally?$tr$, $tr$["March to May", "June to November", "December to February", "All year equally"]$tr$::jsonb, $tr$Philippine Seasons and Earth's Rotation$tr$),
('8d0ac579-e98b-4967-a502-b8391b6e285e', $tr$How does weight affect movement?$tr$, $tr$["Heavy things are harder to move", "No effect", "Light things are harder to move", "Weight is only for liquids"]$tr$::jsonb, $tr$Review: Movement, Sound, Light, and Non-Living Things$tr$),
('8db84747-5042-4145-ad73-33ca249a1b36', $tr$An example of a non-living thing?$tr$, $tr$["Rock", "Plant", "Animal", "Person"]$tr$::jsonb, $tr$Review: Movement, Sound, Light, and Non-Living Things$tr$),
('8de6d8f3-1ed9-4638-983e-d5cd4bc2ecdf', $tr$Mrs. Nena wants to measure exactly how much milk is left in a jug for a recipe. Which tool and unit should she use?$tr$, $tr$["A graduated container, measured in mL or L", "A thermometer, measured in °C", "A ruler, measured in cm", "A weighing scale, measured in kg"]$tr$::jsonb, $tr$Applying volume measurement$tr$),
('935122b2-0aa5-44b7-a959-9f96fb1d6006', $tr$Two main Philippine seasons?$tr$, $tr$["Dry season and rainy season", "Winter and Summer", "Spring and Fall", "Wet and Frozen"]$tr$::jsonb, $tr$Philippine Seasons and Earth's Rotation$tr$),
('94a3602a-eba5-4b33-93dc-da4541d012f9', $tr$When is the rainy season generally?$tr$, $tr$["June to November", "March to May", "December to February", "All year equally"]$tr$::jsonb, $tr$Philippine Seasons and Earth's Rotation$tr$),
('950862f8-de57-401f-885b-e20140ec299a', $tr$Why is it important to use tools to measure the weather?$tr$, $tr$["They give correct information", "We do not need to use them", "Just guess", "They have no use"]$tr$::jsonb, $tr$The Two Seasons in the Philippines$tr$),
('984049c8-36c9-4812-a1ae-a2c5c100a458', $tr$A student designs a test comparing how fast paper towels absorb water versus tissue paper, using the same amount of water, the same size of paper, and the same pouring method for both. What makes this a strong, fair investigation plan?$tr$, $tr$["Only one factor (the type of paper) is different, while everything else that could affect the result is kept the same", "It uses two different types of paper, which is enough on its own", "It does not need a written procedure since the materials are simple", "It compares two liquids instead of two materials"]$tr$::jsonb, $tr$Designing a fair investigation$tr$),
('9ef8ae43-5f30-434b-bbbb-c788f70a874a', $tr$A group testing sugar dissolving plans to use warm water in one cup and cold water in another, both with the exact same amount of sugar and the exact same size of cup. Is this a fair test?$tr$, $tr$["Yes, because only the water temperature differs while other factors are kept the same", "No, because the cups are the same size", "No, because sugar was used in both cups", "Yes, but only because it uses two cups"]$tr$::jsonb, $tr$Evaluating fair tests$tr$),
('9f9aa9bf-9fdb-4863-b4da-e780d8093283', $tr$How does the rainy season affect daily life?$tr$, $tr$["We need to bring an umbrella and watch out for floods", "No effect", "We need to drink lots of water", "We need to wear thin clothes"]$tr$::jsonb, $tr$The Two Seasons in the Philippines$tr$),
('a1bef187-a4bf-4a58-bb45-428a88665e75', $tr$Design a testable question comparing the evaporation rate of alcohol and water. Which of these best states both the control and the variable together?$tr$, $tr$["Variable: type of liquid (alcohol vs. water); Controls: equal amount of liquid, identical open containers, same location and temperature", "Variable: container shape; Controls: type of liquid", "Variable: amount of liquid; Controls: type of liquid only", "There is no way to identify a control for this comparison"]$tr$::jsonb, $tr$Designing a full investigation$tr$),
('a248389c-049e-44b6-8949-1d92923d2f91', $tr$A calamansi or guava branch has sharp, pointed growths along its stem that can prick anyone who touches it. What structure is this?$tr$, $tr$["Thorns", "Tendrils", "Aerial roots", "Rhizomes"]$tr$::jsonb, $tr$Applying thorn identification$tr$),
('a5dca5e1-b5f4-42a8-8e62-73c6076a0251', $tr$A wooden bench keeps the exact same shape and size whether it sits in the classroom or outside. This shows the bench is a solid because it has:$tr$, $tr$["A definite shape and a definite volume", "A definite shape but indefinite volume", "An indefinite shape but definite volume", "Neither shape nor volume"]$tr$::jsonb, $tr$Applying solid properties$tr$),
('a79abd23-8375-416b-b806-190d1525f3aa', $tr$An investigation needs to record the mass of a small bag of sugar, likely just a few grams. Which unit is most appropriate to use?$tr$, $tr$["Grams (g)", "Kilograms (kg) only", "Liters (L)", "Degrees Celsius (°C)"]$tr$::jsonb, $tr$Applying units of mass$tr$),
('ab686743-ab28-4b66-8aeb-9e9955d6bfa6', $tr$Why bring an umbrella in the rainy season?$tr$, $tr$["So you do not get wet", "To keep the sun off", "To help fly a kite", "No use"]$tr$::jsonb, $tr$How Weather Affects Daily Life$tr$),
('add65e1f-c08b-46ff-aa34-265c64fcf1c0', $tr$What tool is used to measure rain?$tr$, $tr$["Rain gauge", "Thermometer", "Wind vane", "Compass"]$tr$::jsonb, $tr$The Two Seasons in the Philippines$tr$),
('af4f7c52-49e9-4a28-9f46-a0535e521ec3', $tr$A student designs the question, "Does milk evaporate at the same rate as water?" and pours 50 mL of each into identical open cups placed side by side. What is being kept the same (control) here?$tr$, $tr$["The amount of liquid, the type of cup, and the location", "The type of liquid", "The evaporation rate", "The time of measurement only"]$tr$::jsonb, $tr$Applying control identification$tr$),
('b3ffbd4d-76da-4851-a891-5ec7189fc1e5', $tr$When is it better to plant some crops?$tr$, $tr$["In the rainy season, because there is enough water", "In the dry season only", "Any season", "Never"]$tr$::jsonb, $tr$How Weather Affects Daily Life$tr$),
('b56071e6-4e5a-4253-ba48-0066953bff30', $tr$Sweet potato grows a swollen underground part that stores starch, which people dig up and eat. What structure is this?$tr$, $tr$["Tuber", "Bulb", "Aerial root", "Tendril"]$tr$::jsonb, $tr$Applying tuber identification$tr$),
('b5ebc99b-b92a-4d62-88fe-589f55d7a1d7', $tr$What products can be made from clay?$tr$, $tr$["Bricks and pots", "Glass", "Electricity", "Clothes"]$tr$::jsonb, $tr$Review: Movement, Sound, Light, and Non-Living Things$tr$),
('b8263473-7234-4eeb-9c43-a0f91ceb0a77', $tr$Why is it important to understand the weather?$tr$, $tr$["It helps us get ready and make better choices", "It means nothing", "It is just for fun", "It does not help in life"]$tr$::jsonb, $tr$How Weather Affects Daily Life$tr$),
('b90c346a-e208-4d39-9bea-00580df4040b', $tr$Why is it important to know the weather?$tr$, $tr$["So we can get ready for what is coming", "It is not important", "It is just for fun", "It does not help in daily life"]$tr$::jsonb, $tr$The Two Seasons in the Philippines$tr$),
('ba264441-08b9-488c-ab53-8397961f127a', $tr$In the chain Rice plant → Rat → Snake → Eagle, what is the rat's feeding group?$tr$, $tr$["Herbivore", "Carnivore", "Omnivore", "Producer"]$tr$::jsonb, $tr$Food Chains$tr$),
('ba5e3ac4-c74c-4b39-8a59-3397ffb1f116', $tr$Water droplets form on the outside of a cold glass of young coconut juice on a hot day. What process caused these droplets to form?$tr$, $tr$["Condensation", "Evaporation", "Melting", "Freezing"]$tr$::jsonb, $tr$Applying condensation$tr$),
('ba901b03-38b0-4e00-8f31-cffc2fe6a0d7', $tr$What do we call a strong storm with wind and rain?$tr$, $tr$["Typhoon", "Hot season", "Amihan only", "Summer"]$tr$::jsonb, $tr$The Two Seasons in the Philippines$tr$),
('bc4bce82-00c2-477e-a8f4-9da856aa5bf0', $tr$Is a milkfish a vertebrate or invertebrate?$tr$, $tr$["Vertebrate, because fish have a backbone", "Invertebrate, because fish have no backbone", "Neither, because fish are not classified", "Both, depending on the type of fish"]$tr$::jsonb, $tr$Vertebrates and Invertebrates$tr$),
('bd27d20c-98e8-4e71-aeb5-81e2cf7aa941', $tr$What do scientists use to measure rain?$tr$, $tr$["Rain gauge", "Thermometer", "Wind vane", "Compass"]$tr$::jsonb, $tr$The Two Seasons in the Philippines$tr$),
('beea5c3e-12af-4378-9375-c6c140cd9f3d', $tr$Who feels the effect of weather on their work the most?$tr$, $tr$["Farmers", "Teachers only", "No one", "Students only"]$tr$::jsonb, $tr$How Weather Affects Daily Life$tr$),
('bf120952-eb8d-451f-a8ad-870ba2b63516', $tr$What are the two main seasons in the Philippines?$tr$, $tr$["Dry season and rainy season", "Winter and Summer", "Spring and Fall", "Wet and Frozen"]$tr$::jsonb, $tr$Philippine Seasons and Earth's Rotation$tr$),
('bf2baebb-2d9c-4c6b-ae04-05a20849fde0', $tr$What is a natural source of light?$tr$, $tr$["The sun", "A light in the room", "A flashlight", "A candle only"]$tr$::jsonb, $tr$Review: Movement, Sound, Light, and Non-Living Things$tr$),
('c04be74a-7b4e-4bc1-9c94-b0dba74c5774', $tr$A sealed sack of rice grains is poured onto a table. The rice pile spreads out and does not keep the sack's shape. Does this mean rice grains behave like a liquid? Why or why not?$tr$, $tr$["No -- each individual rice grain is still a solid with its own fixed shape; only the whole pile's outer shape changes because it is made of many separate solid grains", "Yes -- because the pile takes the shape of the table", "Yes -- because rice grains have no mass", "No -- because rice is a gas"]$tr$::jsonb, $tr$Reasoning about solids$tr$),
('c0a1901a-7562-4a1f-9d96-04b64cf3569c', $tr$What happens if you do not get ready for a typhoon?$tr$, $tr$["Your safety can be in danger", "No effect", "Always safe", "Not important"]$tr$::jsonb, $tr$How Weather Affects Daily Life$tr$),
('c3442d65-a5ee-42a1-bba9-04036ee5856d', $tr$When does the Philippine wet season (rainy season) generally occur?$tr$, $tr$["June to November", "March to May", "December to February", "All year round equally"]$tr$::jsonb, $tr$Philippine Seasons and Earth's Rotation$tr$),
('ca3e8ad0-a0ac-4481-b0db-ec6f84260fc3', $tr$A bottle gourd or bitter gourd vine has thin, curly, thread-like parts that wrap tightly around a trellis or fence to hold the plant up. What structure is this?$tr$, $tr$["Tendrils", "Bulbs", "Tubers", "Thorns"]$tr$::jsonb, $tr$Applying tendril identification$tr$),
('ca46f9bb-6657-47ac-ad06-b1ec67cda271', $tr$Which local animal is an example of a vertebrate?$tr$, $tr$["Frog", "Worm", "Crab", "Snail"]$tr$::jsonb, $tr$Vertebrates and Invertebrates$tr$),
('cb79ef9e-fdbf-4b7f-a9d4-e8da0dd5ffd8', $tr$Which plant grows in a mangrove swamp?$tr$, $tr$["Mangrove tree", "Rice plant", "Hibiscus", "Tomato"]$tr$::jsonb, $tr$Habitats of Philippine Animals and Plants$tr$),
('cbe43940-4c70-41ae-9285-df9440a69e88', $tr$A fermented paste sitting uncovered for many days loses some of its liquid and becomes thicker. Which process most likely explains this, and why does it usually happen faster on a hot day than a cold day?$tr$, $tr$["Evaporation -- heat gives the liquid's particles more energy to escape into the air, so warmer days speed it up", "Condensation -- the paste is gaining water from the air", "Freezing -- cold air makes the paste thicker", "Melting -- the paste changes from solid to liquid"]$tr$::jsonb, $tr$Reasoning about evaporation rate$tr$),
('cc4900a3-1a7b-423f-8d4f-4cd247411d97', $tr$A banyan tree or orchid growing on a tree trunk has roots that hang down from branches into the open air instead of growing into the soil. What is this structure called, and what might it be for?$tr$, $tr$["Aerial roots -- they absorb moisture and nutrients directly from the air and rain, useful when the plant is not rooted in soil", "Tendrils -- they are only used for climbing", "Tubers -- they store starch underground", "Thorns -- they protect the plant from animals"]$tr$::jsonb, $tr$Reasoning about aerial roots$tr$),
('ce8cee37-82fe-48ee-be34-1a3c40feb3df', $tr$A piece of ice is left out on a table on a warm day and turns into water. What process is this?$tr$, $tr$["Melting", "Freezing", "Evaporation", "Condensation"]$tr$::jsonb, $tr$Applying melting$tr$),
('d06577a1-24b4-4cdd-9116-99cfd8bb6054', $tr$Who feels the effect of weather on their work most?$tr$, $tr$["Farmers", "Teachers only", "No one", "Students only"]$tr$::jsonb, $tr$How Weather Affects Daily Life$tr$),
('d24ded63-fc00-40c0-9920-9ccdbedc3296', $tr$What tool helps us know how hot the day is?$tr$, $tr$["Thermometer", "Umbrella", "Raincoat", "Boots"]$tr$::jsonb, $tr$The Two Seasons in the Philippines$tr$),
('d7458182-f600-4119-a396-5897e4145bc3', $tr$Why do we do different things in different weather?$tr$, $tr$["Weather affects how safe and comfy an activity is", "Weather has no link to what we do", "We always do the same things in any weather", "We do not need to think about the weather"]$tr$::jsonb, $tr$How Weather Affects Daily Life$tr$),
('d784c924-581b-4917-8c4b-271f9f74298f', $tr$Stone, water, and air are examples of matter. Which one is a solid?$tr$, $tr$["Stone", "Water", "Air", "None of them"]$tr$::jsonb, $tr$Classifying solids$tr$),
('d8830abd-bcbd-4051-99f4-9b45474f862f', $tr$How does the dry season affect daily life?$tr$, $tr$["We need to drink lots of water and wear thin clothes", "We need to wear thick clothes", "We need to watch out for snow", "No effect"]$tr$::jsonb, $tr$The Two Seasons in the Philippines$tr$),
('d8cacf89-78b5-4c9a-9b98-fba8989dd980', $tr$Water is placed in the freezer overnight and becomes solid ice. What process is this?$tr$, $tr$["Freezing", "Melting", "Evaporation", "Condensation"]$tr$::jsonb, $tr$Applying freezing$tr$),
('da5295cd-dc32-4897-bb7e-6efd860cffda', $tr$A taro plant with underground rhizomes has its leaves cut down by a strong typhoon, but a few weeks later new shoots emerge from the rhizome. What does this show about the rhizome's role in survival?$tr$, $tr$["The rhizome stored enough food underground to let the plant regrow after the above-ground parts were destroyed", "The rhizome caused the typhoon to happen", "The rhizome made the leaves resistant to wind damage", "The rhizome has no connection to the plant's ability to regrow"]$tr$::jsonb, $tr$Applying survival reasoning to rhizomes$tr$),
('da8aab64-3a34-4005-93dc-d9c66be5004f', $tr$What is an example of using sound to give information?$tr$, $tr$["Siren", "Picture", "Book", "Drawing"]$tr$::jsonb, $tr$Review: Movement, Sound, Light, and Non-Living Things$tr$),
('db1050c3-19f2-43b9-b8f0-21cf4c3c845e', $tr$What is the fixed point of a lever called?$tr$, $tr$["Fulcrum", "Axle", "Wheel", "Handle"]$tr$::jsonb, $tr$Review: Weather, Matter, and Forces$tr$),
('db588238-8b7b-4e16-9b48-beb73cfcbb93', $tr$Why wear thick clothes in the rain?$tr$, $tr$["So you do not get sick from the cold and wet", "To feel hot", "To play in the sea", "No reason"]$tr$::jsonb, $tr$How Weather Affects Daily Life$tr$),
('dbbf7191-d4ad-4376-8d67-343713864145', $tr$Which of these is an example of a testable question?$tr$, $tr$["Does fish sauce evaporate faster than water at the same temperature?", "Which soft drink tastes the best?", "Is summer the best season?", "What color is prettiest?"]$tr$::jsonb, $tr$Identifying testable questions$tr$),
('dffd5fed-ae47-44b0-9d75-39837bad1d51', $tr$What clothes are good for the dry season?$tr$, $tr$["Thin clothes", "Raincoat", "Thick clothes for cold weather", "Snow boots"]$tr$::jsonb, $tr$How Weather Affects Daily Life$tr$),
('e6a7e4d2-5652-455b-ab66-574c14b66b4d', $tr$Clothes for the dry season?$tr$, $tr$["Thin clothes", "Raincoat", "Thick clothes", "Snow boots"]$tr$::jsonb, $tr$How Weather Affects Daily Life$tr$),
('e6fc225b-c7ce-4c26-a046-22067c917766', $tr$What to do in heavy rain or a typhoon?$tr$, $tr$["Stay inside the house", "Play outside", "Swim in the sea", "Fly a kite"]$tr$::jsonb, $tr$How Weather Affects Daily Life$tr$),
('ead73585-41c4-4683-b322-df9e5ad55502', $tr$Two clear containers, one tall and thin and one short and wide, each hold 500 mL of water. A classmate says the tall one has "more water" because the water level looks higher. What is wrong with this reasoning?$tr$, $tr$["Volume is the actual amount of space taken up, not how tall the water looks -- both containers have the same 500 mL", "The tall container really does have more water", "Water does not have volume", "Shape determines volume for liquids"]$tr$::jsonb, $tr$Reasoning about volume$tr$),
('eb21d716-65f7-41fb-a743-0669a78ac1e7', $tr$What is the dry season?$tr$, $tr$["A season with high temperature and little rain", "A season with lots of rain", "A season with snow", "A season with no sun"]$tr$::jsonb, $tr$The Two Seasons in the Philippines$tr$),
('eb788a7a-e199-4098-9729-614d225a6378', $tr$When does the dry season usually happen?$tr$, $tr$["March to May", "June to November", "December to January", "All year"]$tr$::jsonb, $tr$The Two Seasons in the Philippines$tr$),
('f0cca034-3efa-402e-a194-d5419401a6ca', $tr$What is the rainy season?$tr$, $tr$["A season with lots of rain and lower temperature", "A season that is always hot", "A season with no rain", "A season with snow"]$tr$::jsonb, $tr$The Two Seasons in the Philippines$tr$),
('f6e4a232-2414-4778-8815-99101eefe287', $tr$You pour fish sauce from a bottle into a small saucer. What state of matter is the fish sauce?$tr$, $tr$["Liquid", "Solid", "Gas", "It has no state"]$tr$::jsonb, $tr$Classifying liquids$tr$),
('f84d425c-489e-40c6-abe4-cab3a9475edc', $tr$A calamansi bush with thorny branches is less likely to be fully eaten by grazing animals compared to a thornless bush nearby. What survival advantage do the thorns provide?$tr$, $tr$["They physically discourage or injure animals that try to eat the plant, reducing how much gets eaten", "They make the fruit taste better to animals", "They absorb more sunlight than a thornless plant", "They allow the plant to survive without roots"]$tr$::jsonb, $tr$Applying survival reasoning to thorns$tr$),
('fc0254f5-ef01-484c-89fb-1f74f2a75894', $tr$Why do we use simple machines?$tr$, $tr$["They make work easier", "They make work harder", "They have no purpose", "Just to make the house look nice"]$tr$::jsonb, $tr$Review: Weather, Matter, and Forces$tr$),
('fc29d11d-74e2-4072-be3d-a4f8ee9ab9ca', $tr$Which of these can a force do to a moving object?$tr$, $tr$["It can speed it up, slow it down, or change its motion", "It only makes it invisible", "It only gives it color", "It only makes it heavier"]$tr$::jsonb, $tr$Contact Forces: Push and Pull$tr$),
('fc874b47-c30d-4c4f-97cd-ec6039d41f8e', $tr$How does weight affect how an object moves?$tr$, $tr$["Heavier things are harder to move", "Weight has no effect", "Lighter things are harder to move", "Weight is only for liquids"]$tr$::jsonb, $tr$Review: Movement, Sound, Light, and Non-Living Things$tr$),
('fcfe068d-8314-4e5d-99fe-cf2e647ba1e1', $tr$What is a push?$tr$, $tr$["A force that moves something away from you", "A force that moves something toward you", "A kind of liquid", "A kind of animal"]$tr$::jsonb, $tr$Review: Weather, Matter, and Forces$tr$),
('fd76c071-2fd8-4389-ada8-2edc85670b4d', $tr$How does the dry season affect life?$tr$, $tr$["Drink lots of water, wear thin clothes", "Thick clothes", "Watch out for snow", "No effect"]$tr$::jsonb, $tr$The Two Seasons in the Philippines$tr$),
('fe21f1ac-5b2d-4c60-9b9b-47ff0fa34e71', $tr$The fixed point of a lever is called?$tr$, $tr$["Fulcrum", "Axle", "Wheel", "Handle"]$tr$::jsonb, $tr$Review: Weather, Matter, and Forces$tr$);

insert into _sci_draft_summary values
('1c635628-664d-4d55-b28d-ce2a6b17208b', $tr$## Designing Your Own Investigation: A Full Example with Evaporation

- A strong scientific investigation starts with a **testable question** -- one that can actually be answered by observing or measuring something, unlike an opinion question like "which tastes best?"
- Example testable question: "Does the type of liquid affect how fast it evaporates?" -- comparing, say, water and milk, or vinegar and alcohol.
- For this kind of comparison, the **variable** is the type of liquid, while the **controls** (kept the same) should include the amount of liquid, the type and size of container, and the location/temperature where both are placed.
- A fair setup uses **identical containers**, **equal amounts** of each liquid, placed in the **same location** at the **same time** -- changing only the type of liquid.
- Watch out for hidden extra variables! If one cup sits in full sun and the other in shade, you cannot tell whether the liquid type or the sunlight caused any difference in evaporation -- the fix is to place both cups in the exact same location.

| Part of the Investigation | Example (Water vs. Milk) |
|---|---|
| Testable question | Does the type of liquid affect evaporation rate? |
| Variable | Type of liquid (water vs. milk) |
| Controls | Amount of liquid, container type, location |
| Conclusion | States which liquid evaporated faster, based on findings |

- A good conclusion directly answers the tested question using the findings -- for example, "Water evaporated faster than milk under the same conditions in this investigation" -- rather than an opinion like "water is better."
- This same approach (clear question, one variable, several controls) can be extended to testing three or more liquids at once, as long as every container, amount, and location stays identical except for the liquid type.$tr$),
('2f3ec707-0d1b-462b-b791-792c783d73d7', $tr$## Specialized Plant Structures: Rhizomes, Tubers, Bulbs, Thorns, Aerial Roots, and Tendrils

- Many plants have **specialized structures** that are not just ordinary stems, roots, or leaves -- each is shaped for a specific job: storage, protection, or support.
- A **rhizome** is an underground stem that spreads sideways and sprouts new shoots along its length. Example: ginger and turmeric.
- A **tuber** is a swollen underground stem that stores food, usually as a single rounded structure. Example: sweet potato.
- A **bulb** is made of layered, fleshy leaf-like scales wrapped around a bud, storing food underground. Example: onion.
- **Thorns** are sharp, pointed growths along a stem, used mainly for protection. Example: calamansi and guava branches.
- **Aerial roots** are roots that hang or grow in open air instead of into soil, often absorbing moisture directly from the air and rain. Example: orchids or banyan trees growing on a tree trunk.
- **Tendrils** are thin, curly, thread-like structures that help a climbing plant grip a support. Example: bottle gourd and bitter gourd vines.

| Structure | Example | Main Function |
|---|---|---|
| Rhizome | Ginger | Underground spreading stem, sprouts shoots |
| Tuber | Sweet potato | Stores food underground |
| Bulb | Onion | Stores food in layered scales |
| Thorn | Calamansi | Protection from being eaten |
| Aerial root | Orchid | Absorbs moisture from air |
| Tendril | Bottle gourd vine | Climbing/support |

- Telling these structures apart takes careful observation: a rhizome spreads with multiple shoot points, a tuber is a single solid swollen stem, and a bulb is made of wrapped layers around a bud. Not every climbing plant uses tendrils either -- some simply twine their whole stem around a support instead.$tr$),
('3d5d5f5c-e91f-4569-85f7-e57b388adfcd', $tr$## Comparing States of Matter: Shape AND Volume

- Last week we sorted matter by shape alone. This week we look more closely using **two separate properties**: **shape** and **volume**.
- A **definite (fixed) shape** means the matter keeps its own shape no matter what container it is in.
- A **definite (fixed) volume** means the amount of space the matter takes up stays the same, even if it is moved to a different container.
- **Solids** (like a wooden bench) have BOTH a definite shape and a definite volume.
- **Liquids** (like milk) have a definite volume but an **indefinite shape** -- pour milk from a tall glass into a wide bowl, and it looks different, but it is still the same amount (say, 250 mL).
- **Gases** (like the air in a basketball) have **neither** a definite shape nor a definite volume -- they spread out to completely fill whatever space contains them.

| State | Shape | Volume |
|---|---|---|
| Solid | Definite | Definite |
| Liquid | Indefinite | Definite |
| Gas | Indefinite | Indefinite |

- A tricky example: pouring rice grains into a pile makes the pile's overall shape change, but each individual grain is still a solid with its own fixed shape -- only the whole pile's outline changes.
- Using two properties instead of one gives scientists a clearer, more accurate way to describe and compare matter.$tr$),
('5c122aa6-82cf-4753-933a-7292be1d5ec4', $tr$## How Plant Structures Help Plants Survive

- Plants often face **unfavorable conditions** such as **drought** (long dry spells), **strong wind**, or **being eaten** by animals -- and their specialized structures help them survive these challenges.
- **Storage structures** like tubers and bulbs (sweet potato, onion) store food -- and sometimes moisture -- underground. During a drought, or after a typhoon destroys the leaves, the plant can survive on these reserves and regrow later, even if the parts above ground wither or are damaged.
- **Rhizomes** (like the underground stems of taro) work the same way: after a typhoon strips away the leaves, the rhizome's stored food lets new shoots emerge weeks later.
- **Thorns** (like on calamansi branches) physically discourage grazing animals, reducing how much of the plant gets eaten compared to a thornless plant nearby.
- **Tendrils** (like on a bottle gourd vine) grip a trellis or fence tightly, helping the plant stay anchored and resist being blown down during a strong typhoon.
- **Aerial roots** (like on an orchid growing on a tree trunk) let a plant absorb moisture from rain and humid air when it has no access to soil at all.

| Structure | Threat it Helps Against |
|---|---|
| Tuber / Bulb / Rhizome | Drought, being cut down (regrowth) |
| Thorn | Being eaten |
| Tendril | Strong wind |
| Aerial root | Lack of soil/moisture access |

- Each structure is matched to a specific kind of threat -- this is why a plant growing where droughts, strong winds, AND grazing animals are all common would benefit from having **several different structures together**, rather than relying on just one, since no single structure protects against every possible danger.$tr$),
('5fe36b96-ea2e-4a22-8db4-d0a33fd85898', $tr$## Measuring Volume and Temperature

- To measure the **volume** of a liquid, scientists use a **graduated container** (graduated cylinder), marked with units like **milliliters (mL)** and **liters (L)**. Remember: 1 L = 1000 mL.
- To read a graduated container correctly, look at the liquid's curved surface (called the **meniscus**) at **eye level**, and read the measurement at the **bottom of the curve** -- looking from above or below can give an inaccurate reading.
- To measure **temperature**, scientists use a **thermometer**, and in the Philippines we record readings in **degrees Celsius (°C)**.
- A measurement is only useful if it includes its **unit**. Writing "28" with no unit could mean 28°C, 28 mL, or something else entirely -- always write the unit!

| Tool | Measures | Common Units |
|---|---|---|
| Graduated container | Volume | mL, L |
| Thermometer | Temperature | °C |

- Example: Mrs. Nena measuring milk for a recipe would use a graduated container marked in mL or L, while checking if a bowl of sinigang soup is cool enough for a baby to eat would call for a thermometer reading in °C.
- Using the same unit consistently (always mL, for example, instead of switching to an unmarked cup) is important so measurements can be fairly compared by anyone reading them.$tr$),
('645a1ae1-d162-426a-87e2-e586096c50f0', $tr$## Matter, Mass, and Volume: Meet the Three States of Matter

- **Matter** is anything that has **mass** (the amount of "stuff" it is made of) and **volume** (the amount of space it takes up). If something is not matter, it has neither.
- Scientists sort matter into three basic **states**: **solid**, **liquid**, and **gas**.
- A **solid**, like a stone or a bench, keeps its own shape no matter what container or space it is placed in.
- A **liquid**, like water or fish sauce, does not keep its own shape -- it takes the shape of whatever container holds it.
- A **gas**, like air, also has no fixed shape, and it can even fill an entire balloon or room because it spreads out to fill available space.
- One useful first clue for sorting an object into a state of matter is simply: does it keep its own shape, or not?

| State | Example | Keeps its own shape? |
|---|---|---|
| Solid | Stone | Yes |
| Liquid | Water | No |
| Gas | Air | No |

- Even gases are matter -- blowing up a balloon shows that air takes up space (volume), and matter like air also has mass, even though it may be too light to feel with your hands alone.$tr$),
('95cc8ac7-149f-4b99-8ed9-ae2cbd29d83e', $tr$## Changes of State: Melting, Freezing, Evaporation, and Condensation

- Heating and cooling matter can cause it to **change state** -- the amount of matter stays the same, but whether it is solid, liquid, or gas can change.
- **Melting**: heating turns a solid into a liquid (ice into water). The exact temperature this happens at is called the **melting point**.
- **Freezing**: cooling turns a liquid into a solid (water into ice) -- the reverse of melting.
- **Evaporation**: heating turns a liquid into a gas (damp clothes drying in the sun, water disappearing into the air).
- **Condensation**: cooling turns a gas back into a liquid (water droplets forming on a cold glass of young coconut juice, or on the underside of a pot lid).
- The temperature at which a liquid turns into a gas by boiling is called the **boiling point** -- water's boiling point is 100°C.

| Process | From → To | Caused by |
|---|---|---|
| Melting | Solid → Liquid | Heating |
| Freezing | Liquid → Solid | Cooling |
| Evaporation | Liquid → Gas | Heating |
| Condensation | Gas → Liquid | Cooling |

- These changes can happen back and forth -- water can freeze into ice, then melt back into water again. A pot of boiling water with a lid shows both evaporation (water becomes steam) and condensation (steam turns back to droplets on the cooler lid) happening together.
- Different materials have different melting points -- butter melts at a lower temperature than wax, so under the same warm sunlight, the butter would likely melt first.$tr$);

do $$
declare
  v_bad int;
begin
  select count(*) into v_bad
  from _sci_question t join public.content_questions cq on cq.id = t.id
  where jsonb_array_length(cq.options) <> jsonb_array_length(t.options)
     or not exists (select 1 from jsonb_array_elements_text(cq.options) o where o = cq.correct_answer);
  if v_bad > 0 then
    raise exception 'Science translation: % main-quest question(s) do not line up with their translation', v_bad;
  end if;

  select count(*) into v_bad
  from _sci_boss t join public.draft_questions dq on dq.id = t.id
  where jsonb_array_length(dq.options) <> jsonb_array_length(t.options)
     or not exists (select 1 from jsonb_array_elements_text(dq.options) o where o = dq.correct_answer);
  if v_bad > 0 then
    raise exception 'Science translation: % boss question(s) do not line up with their translation', v_bad;
  end if;
end $$;

update public.content_quizzes cq
set summary_markdown = t.summary_markdown
from _sci_quiz t
where cq.id = t.id and cq.subject = 'Science';

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
from _sci_question t
where cq.id = t.id
  and exists (select 1 from public.content_quizzes z where z.id = cq.content_quiz_id and z.subject = 'Science');

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
from _sci_boss t
where dq.id = t.id and dq.subject = 'Science';

update public.draft_summaries ds
set summary_markdown = t.summary_markdown
from _sci_draft_summary t
where ds.id = t.id and ds.subject = 'Science';

drop table if exists _sci_quiz, _sci_question, _sci_boss, _sci_draft_summary;
