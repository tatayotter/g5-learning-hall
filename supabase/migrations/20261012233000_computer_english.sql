-- Computer in English. Rewrites the Grade 2-3 Computer lessons, main-quest questions and
-- boss-fight questions that were written in Filipino or a Filipino/English mix, in short,
-- kid-friendly English. Computer is an English subject; the lesson generator now says so for
-- Grade 2 and Grade 3.
--
-- Same method as 20261012180000_science_english.sql. Data only, in place: every row keeps its
-- id, so progress, attempts, boss records and the offline answer key all still line up.
-- Options are translated position by position, and correct_answer is not taken from this
-- file: it is re-pointed to the translated option at the same position as the row's current
-- correct_answer.
--
-- Safety: before changing anything, every row this file touches that exists must have the
-- same number of options as its translation and a correct_answer that is one of its current
-- options; otherwise the whole migration stops with an error and nothing changes. Only rows
-- whose subject is Computer are updated. Rows that don't exist (an empty CI database) are
-- skipped, and re-running is a no-op.
--
-- Devices pick up the change on their own: lessons and main quests through /api/content
-- (5-minute cache), boss questions through boss_bank_signature (20261012070000).

drop table if exists _cmp_quiz, _cmp_question, _cmp_boss, _cmp_draft_summary;
create temp table _cmp_quiz (id uuid primary key, summary_markdown text not null);
create temp table _cmp_question (id uuid primary key, prompt text not null, options jsonb not null);
create temp table _cmp_boss (id uuid primary key, question text not null, options jsonb not null, topic text);
create temp table _cmp_draft_summary (id uuid primary key, summary_markdown text not null);

insert into _cmp_quiz values
('0313c47b-7416-4f3c-aa82-bff52af3cc0e', $tr$# 🖱️ Computer — Putting Your Skills Together in a Project

Grade 2, Week 26! Let's put together everything we learned about the computer! 🖱️

## 🔄 Review
We learned how to spot and report unsafe situations.

## 🖱️ Skills We Learned
- Mouse skills (click, drag)
- Typing with the keyboard
- Word processing and simple drawing
- Saving and opening a file
- Online safety

## 🎨 Simple Project
Make a short project — for example, type a sentence about yourself and add a simple drawing — using all the skills you learned.

## 👨‍👩‍👧 Remember
Still ask a grown-up for help when saving or using a new program.

**Key words:** putting skills together, project, mouse skills, word-processing$tr$),
('08cff856-36e4-44b4-8c9b-7dd8578af043', $tr$# 💻 Friday Review — Computer (Grade 3)

- Bold, Underline, Font size, Font color
- Always Save your work (Ctrl+S)

Great job! 🌟$tr$),
('114ab515-c11c-43e6-897f-1b7c7bbacba0', $tr$# 💻 Friday — Weekly Practice: Computer

Quick review!

- **Double-click** an icon to open a program
- **Save your work** before closing
- Click the **X button** to close a program

You are learning so well! 🌟$tr$),
('11574448-c1ba-4ca0-9b40-9a3ead0fe51f', $tr$# 🚨 Computer — Spot and Report Unsafe Situations

Grade 2, Week 25! Let's learn how to spot unsafe things online and what to do. 🚨

## 🔄 Review
We learned about keeping information private.

## 🚨 What Is an Unsafe Situation?
For example: someone says bad words to you online, someone asks for your personal information, or you see a scary picture or message.

## 📢 What Should You Do?
1. Do not reply to the message
2. **Take a screenshot** if you can (with a grown-up)
3. Tell a **parent or teacher** right away

## 💡 Why Is It Important to Report?
Telling a grown-up helps keep everyone safe online, including other kids.

**Key words:** unsafe, report, screenshot, tell right away$tr$),
('129b7620-1957-494e-9af7-8bf13e16c4ab', $tr$# 🚨 Friday Review — Computer (Grade 2)

- Spotting and reporting unsafe situations

Great job in Computer! 🌟$tr$),
('1c95e21b-7132-44e0-ba53-18d85d25398d', $tr$# 💻 Friday — Weekly Practice: Computer

Quick review!

- Turning on: **press power → wait → log in**
- Turning off: **save → close → shut down**

You are learning so well! 🌟$tr$),
('227d55ba-3308-4e0b-bf0f-d8889423a89c', $tr$# 💻 Friday — Weekly Practice: Computer

A quick review of the computer room rules!

- **Clean your hands** before using the keyboard/mouse
- **No food or drinks** near the computer
- Be **gentle** when you hold the equipment
- **Ask the teacher for help** if you need it

You are ready to learn about computers! 🌟$tr$),
('23ce748d-8c7d-4a6f-98f3-09a9d71d7d7c', $tr$# 💻 Friday — Weekly Practice: Computer

Quick review!

- A **computer** helps us **work, learn, and play**
- Examples: **desktop, laptop, tablet, smartphone**
- We see computers at **home, at school, and in the community**

Great job on your first week! 🌟$tr$),
('23ebc01f-7ad0-445a-a9a7-1f44cbc35c4c', $tr$# 🖥️ Friday Review — Computer (Grade 3)

- Check your project (checklist) before you show it

Great job in Computer! 🌟$tr$),
('28a49783-ce9d-4b5b-97e7-beb15a0c4160', $tr$# 🔍 Computer — Knowing Browser and Search Engine Icons

Grade 3, Week 22! Let's learn to spot the icons we see a lot. 🔍

## 🔄 Review
We learned the uses of the Internet.

## 🔍 Common Browser Icons
- **Chrome** — a circle with four colors
- **Edge** — a blue wave or "e"
- **Safari** — a blue compass

## 🔍 Search Engine Icons
- **Google** — the colorful word "Google" or a magnifying glass

## 💡 Why Should We Know Them?
Knowing these icons helps us **find the right program fast** when we use the computer.

**Key words:** icon, browser, search engine, spot$tr$),
('33f4afe8-f4fc-4c63-84b1-a67aa6b48562', $tr$# 💻 Computer — Review: The Whole Term in Computer

Grade 3, Week 27! Let's look back at what we learned in Computer this term. 💻

## 🔄 What We Learned
- **Uses of the Internet:** looking things up, talking to others, learning
- **Browser and search engine:** knowing the icons
- **Safe content:** how to tell what is right and not right for kids
- **Personal information:** when not to share it
- **Truth online:** not everything on the Internet is true
- **Safe shutdown** of the computer

## 🧠 Putting It All Together
We used all of this to be **careful and safe** computer and Internet users.

## 🎯 Getting Ready
Next term, we will keep learning more about using technology safely.

**Key words:** Internet, browser, safe content, personal information$tr$),
('3dff11db-5b40-4b5e-b41d-be35590c5d27', $tr$# 💻 Friday — Weekly Practice: Computer

Quick review!

- **Spacebar** = space | **Enter** = new line
- **Backspace** = delete | **Shift** = capital letters

You are learning so well! 🌟$tr$),
('3e21dbc7-6f46-4f20-bebf-3fc5e6997e1e', $tr$# 💻 Computer — Review: The Whole Computer Term

Grade 2, Week 27! Let's look back at everything we learned in Computer. 💻

## 🔄 What We Learned
- **Keyboard and typing** simple sentences
- **Saving and opening** a file
- **Internet:** what it is, kid-friendly content
- **Screen-time:** balance and a grown-up's permission
- **Online safety:** private information, reporting unsafe situations

## 🧠 Putting It All Together
We used all of these in a simple project — showing how good we are now at using the computer safely and responsibly.

## 🎯 Getting Ready
Next term, we will keep learning to use technology in safe and creative ways.

**Key words:** keyboard, file, Internet, screen-time, online safety$tr$),
('414cfd40-7608-4e62-9b48-80bdfadef53a', $tr$# 🔌 Computer — Safely Closing Programs and the Computer

Grade 3, Week 26! Let's learn the right way to turn off the computer. 🔌

## 🔄 Review
We learned that not everything on the Internet is true.

## 🔌 Why Is Shutting Down the Right Way Important?
Suddenly cutting the power or just pressing the power button can **damage** the computer or make you **lose** work you have not saved.

## ✅ The Right Steps to Shut Down
1. Save all your work first
2. Close all open programs
3. Choose "Shut Down" from the menu
4. Wait for it to turn off all the way before pulling out the plug (if needed)

**Key words:** shut down, save, safe shutdown, program$tr$),
('44248c85-1a5d-42bb-b8d9-1c3456d51ecb', $tr$# ✅ Computer — Safe Content vs. Content Not Right for Kids

Grade 3, Week 23! Let's learn how to spot safe content online. ✅

## 🔄 Review
We learned the browser and search engine icons.

## ✅ Safe Content
- Made for kids
- Helps you learn or is a fun game
- Approved by a parent or teacher

## 🚫 Content Not Right for Kids
- Has violent or scary pictures
- Asks for personal information
- Not made for a child's age

## 👨‍👩‍👧 What Should You Do?
If you see content that is not right for kids, **close it right away** and tell an adult.

**Key words:** safe, not right for kids, learning, close right away$tr$),
('4b2320c6-df69-40e8-837e-830bcd3c2719', $tr$# 💻 Friday Review — Computer (Grade 3)

- **Copy, paste, undo** — helpful shortcuts

Great job in Computer! 🌟$tr$),
('553ddfe7-32b7-47bc-b770-18e71e6705f9', $tr$# 💻 Safe and Neat in the Computer Room

Before we start our trip into the world of computers, let's learn how to be safe and neat! 🖥️

## 📏 Computer Room Rules
- **Do not touch** the computer without the teacher's permission.
- **Be gentle** with the mouse and keyboard — do not drop them or pull them hard.
- **No food or drinks** near the computer.
- **Clean your hands first** before using the keyboard and mouse.

## 🙋 Why Are the Rules Important?
- They take care of the **equipment** so it lasts a long time.
- They also keep everyone in the room **safe**.

## 💡 Simple Reminders
- Always **ask the teacher for help** if you don't understand something.
- Be **polite** while you wait for your turn on the computer.

Are you ready to learn to use the computer safely and responsibly? 🌟$tr$),
('57a3f7be-a842-4178-aa3d-8160f6f2f96a', $tr$# 🎨 Friday Review — Computer (Grade 2)

- Choosing colors and using the eraser tool the right way

Great drawing practice! 🌟$tr$),
('59546bf7-9dca-45d2-9962-be7817eefeb2', $tr$# 💻 Friday Review — Computer (Grade 2)

- Term 2 wrap-up: keyboard, file, Internet, online safety

Great term in Computer! 🌟$tr$),
('59eb6c0e-984b-407c-bc0e-5bd0caf91335', $tr$# 🌐 Friday Review — Computer (Grade 3)

- Uses of the Internet: browser and search engine

Great job in Computer! 🌟$tr$),
('5c1d32b4-d671-4378-b12b-e3211b54ffe0', $tr$# 💻 Computer — Intro to Word Processing and Drawing

Welcome to Term 2, Grade 3! Let's start word processing. 💻

## 📝 Opening the Program
1. **Double-click** the program icon (word processor or drawing app)
2. **Wait** for it to open fully
3. A **blank document** appears — ready for you to type or draw

## ✍️ Typing and Editing Text
**Typing:** click where you want text to appear, then type.

**Editing (fixing mistakes):**
- **Backspace** — deletes the letter **before** the cursor
- **Delete** — deletes the letter **after** the cursor
- Click to **place your cursor** exactly where you need to fix something

## 🎨 Using the Toolbar
| Button | What it does |
|---|---|
| **Font size** | makes text **bigger** or **smaller** |
| **Font color** | changes the **color** of text |
| **Bold (B)** | makes text **darker and thicker** |
| **Underline (U)** | adds a **line under** the text |

## 🧠 Worked Example 1
*You typed "My naem is Ana" — how do you fix the mistake?*
- Step 1: Click **right after the 'm' in 'naem'**
- Step 2: Press **Backspace** to delete 'mea'
- Step 3: Retype the correct letters: **name**

## 🧠 Worked Example 2
*You want your title to stand out.*
- Highlight the title text
- Click **Bold (B)** to make it **thicker**
- Optionally click **Font size** to make it **bigger**

## 📋 Typing Your Own Name and a Short List
**Practice steps:**
1. Type your **own name**
2. Press **Enter** for a new line
3. Type a **short list** (like your favorite fruits), one item per line

## 💡 Good Habits
- **Save** your work often
- Check for **mistakes** before printing
- Use the toolbar to make your work **neat and clear**

Great computer skills! 🌟$tr$),
('5c641175-4cdb-407d-972d-6dfbb6cb4d7e', $tr$# 💻 Friday — Weekly Practice: Computer

Quick review!

- **Clean your hands** before using the keyboard/mouse
- **No food** near the computer
- Ask your teacher for help if you need it

You are ready to learn about computers! 🌟$tr$),
('5e9c89cd-d0eb-46f3-a4ea-1a71c58b10eb', $tr$# 💻 Friday — Weekly Practice: Computer

Quick review!

- Home row: **A S D F** (left), **J K L ;** (right)
- Thumbs rest on the **Space Bar**

You are learning so well! 🌟$tr$),
('5ef690c2-a7e2-4fc0-80e5-4f5ad23075a2', $tr$# 💻 Computer — Week 2: Input and Output Devices!

Let's learn more about input and output devices! 🖥️

## 📥 Input Devices
- They send information **TO** the computer.
- **Examples:** keyboard, mouse, microphone, webcam

## 📤 Output Devices
- They send information **FROM** the computer.
- **Examples:** monitor, speakers, printer

## 🔍 Practice
- **Example 1:** Typing on the keyboard is an **input**.
- **Example 2:** Showing a picture on the monitor is an **output**.

Every device is important to make the computer work! 🌟$tr$),
('655bdedd-497a-4b5e-bbe8-4ad794532f52', $tr$# 💻 Computer Room Rules

Before we start our computer lesson, let's review the important rules! 🖥️

## 📏 The Rules
- **Clean your hands** before using the keyboard and mouse.
- **Be careful** with the equipment — do not drop it or pull it hard.
- **No food or drinks** near the computer.

## 🙋 Why Are Rules Important?
- They protect the school's costly equipment.
- They keep every student safe.

## 💡 Simple Reminders
- Ask your teacher for help if you don't understand something.
- Be polite while you wait for your turn.

Are you ready to learn about computers in a safe and responsible way? 🌟$tr$),
('6baf743c-20c2-4799-b5aa-0247c4e2f45c', $tr$# 🔌 Friday Review — Computer (Grade 3)

- Safely closing programs and the computer

Great job in Computer! 🌟$tr$),
('6e9386bc-e82e-48d5-8d78-b02b9384e00b', $tr$# 💾 Friday Review — Computer (Grade 2)

- Saving and opening a file

Great job in Computer! 🌟$tr$),
('74c6b947-4556-4b4f-9d1a-73b30072af92', $tr$# 🌐 Computer — What Is the Internet?

Grade 2, Week 22! Let's learn about the Internet in a simple way. 🌐

## 🔄 Review
We learned about saving and opening a file.

## 🌐 What Is the Internet?
The **Internet** is a big network that connects computers all over the world. It lets us look for information, watch videos, and talk with others.

## 👶 Content for Kids
Not everything on the Internet is good for kids. We should only watch or use content **made for kids** (kid-friendly).

## 👨‍👩‍👧 Why We Need a Grown-up's Help
Always ask a parent or teacher for permission and help before using the Internet.

**Key words:** Internet, network, kid-friendly, grown-up's help$tr$),
('7a9497a5-719f-4ae4-9e35-33ea67f4dbe8', $tr$# 💻 Computer — More Skills: Copy, Paste, and Undo

Grade 3, Week 19! Let's learn some helpful computer shortcuts. ⌨️

## 📋 Copy and Paste
**Copy** makes a **copy** of the text or picture you chose. **Paste** puts what you copied in **another place**.

**When to use it:** when you want to use the same text or picture again without typing it again.

## ↩️ Undo
**Undo** is used to **take back** the last thing you did — it helps when we make a mistake.

**Example:** If you deleted a sentence by accident, use undo to bring it back.

## 🖨️ Printing Your Work
When your project is done, you can **print** it to have a copy on paper.

## 🧠 Example 1
*You deleted a sentence in your project by accident. What should you do?*
- Use **undo** to bring back the deleted sentence.

## 🧠 Example 2
*You want to use the same title in different parts of your project. Which two skills will you use?*
- **Copy and paste** — copy the title, then paste it in another place.

## 💡 Why Is This Important?
Knowing copy, paste, and undo helps you work on your project **faster and better**.

Great job in Computer! 🌟$tr$),
('7ae66120-969a-4341-aa8c-0617ca3d4b71', $tr$# ⌨️ Computer — Word Processing and Typing Simple Sentences

Grade 2, Week 20! Let's learn about typing programs and write about ourselves. ✍️

## ⌨️ What Is a Word-Processing or Typing Program?
A **word-processing/typing program** is used to **write using the computer**. It is like writing on paper, but you use the keyboard.

## ✍️ Typing Simple Sentences About Yourself
We can type simple sentences about ourselves, like:
- *"I am in Grade 2."*
- *"My name is Ana."*
- *"I like to read books."*

## 🎯 Why Is It Important to Type Carefully?
When typing, **accuracy** (typing correctly) matters, not just speed. The letters and words must be right.

## 🧠 Example 1
*You want to type "I am in Grade 2." What should you do first?*
- **Open** the word-processing/typing program before you start.

## 🧠 Example 2
*Why is accuracy more important than speed when typing?*
- So you **avoid wrong spelling** and your message is clear.

## 💡 Why Is This Important?
Practicing word processing helps us feel **comfortable** using the computer for writing.

Great job in Computer! 🌟$tr$),
('7ecd994a-ab1a-4ab7-95fd-dbd5e9e03a25', $tr$# 💻 Friday — Weekly Practice: Computer

Quick review of computer basics!

- **Monitor** = screen (output)
- **Keyboard** = type letters/numbers (input)
- **Mouse** = point and click (input)
- **CPU** = brain of the computer
- **Speakers** = play sound (output)
- **Home row left hand**: A S D F
- **Home row right hand**: J K L ;

You're a tech star! 💡$tr$),
('8036ea23-6271-4a38-a4a7-f9f4aa8d5868', $tr$# ⌨️ Computer — Meet the Keyboard!

Welcome to Term 2, Grade 2! Let's get to know the keyboard. 💻

## ⌨️ Parts of the Keyboard
| Part | What it does |
|---|---|
| **Letter keys** | type letters A to Z |
| **Number keys** | type numbers 0 to 9, usually on top |
| **Spacebar** | the long key at the bottom — adds a **space** between words |
| **Enter/Return** | starts a **new line** or confirms your typing |
| **Shift** | makes **capital letters** when held down |
| **Backspace** | deletes the letter **before** the cursor |

## 🗺️ General Layout
Most keyboards have letter keys arranged the same way — this is called **QWERTY**, named after the first six letters on the top row!

**Where to find things:**
- **Letter keys** — in the middle, biggest group
- **Number keys** — top row, above the letters
- **Spacebar** — bottom, the longest key
- **Enter** — right side, usually a big key

## 🧠 Worked Example 1
*You want to type "I am 7" — which keys do you press?*
- Letter keys for **I, a, m**
- **Spacebar** between each word
- Number key **7** on top

## 🧠 Worked Example 2
*You finish a line and want to start a new one. Which key do you press?*
- Press **Enter/Return** to move to a **new line**.

## ✋ Good Typing Habits
- Sit with your **back straight**
- Keep your **wrists relaxed**, not bent
- Look at the **screen**, not just the keys
- Type **gently** — don't pound the keys!

Great job learning the keyboard! 🌟$tr$),
('83cff00f-ca91-4ab2-8dee-d63197f14305', $tr$# 💻 Friday — Weekly Practice: Computer

Quick review!

- **Monitor** = output | **Keyboard** = input
- **CPU** = brain of the computer
- Input devices send info TO computer, output devices send info FROM computer

You are learning so well! 🌟$tr$),
('8e78b7f1-b8d2-4e6c-95ee-086d95841b3a', $tr$# ⏰ Computer — Screen-Time and Asking a Grown-up

Grade 2, Week 23! Let's learn how to use the computer wisely. ⏰

## 🔄 Review
We learned what the Internet is.

## ⏰ What Is Screen-Time?
**Screen-time** is the time you spend in front of a computer, tablet, or phone.

## ⚖️ Why Do We Need to Limit It?
- Too much screen-time can hurt your eyes and body
- We also need time for reading, playing outside, and sleeping

## 👨‍👩‍👧 Always Ask a Grown-up First
Before you go online or use a new program, **ask a parent or teacher first** for permission and help.

**Key words:** screen-time, balance, permission, help$tr$),
('8e872504-ff2f-4910-a924-3cdc903421bd', $tr$# 🎭 Friday Review — Computer (Grade 2)

- Parts of the keyboard: letter row, number row, spacebar
- Enter, Shift, and Backspace

Great job! ⭐$tr$),
('91de5935-1225-4ec9-af4c-422a8d84446c', $tr$# 💻 Friday — Weekly Practice: Computer

Quick review!

- **Single-click** = select | **Double-click** = open
- **Right-click** = menu | **Click-and-drag** = move

You are learning so well! 🌟$tr$),
('976eb9c7-2d92-410e-9547-7f971c4466b3', $tr$# ❓ Computer — Not Everything on the Internet Is True

Grade 3, Week 25! Let's learn how to check if information online is true. ❓

## 🔄 Review
We learned about not sharing personal information.

## ❓ Why Is Not Everything Online True?
Anyone can put any information on the Internet — not all of it has been **checked** to see if it is right.

## 🔍 How to Check If It Is True
- See if it comes from a **well-known website** (for example, a school or library)
- Ask a parent or teacher if you are not sure
- Compare it with other sources

## ⌨️ Simple Keyboard Shortcuts
- **Ctrl+C** — copy
- **Ctrl+V** — paste
- **Ctrl+S** — save

**Key words:** true, not true, source, keyboard shortcut$tr$),
('99f1ff42-729d-4d1c-b4c0-9c58b1b5e420', $tr$# 🔒 Friday Review — Computer (Grade 2)

- Keeping personal information private

Great job in Computer! 🌟$tr$),
('a116ae9c-7bdb-40d8-8c16-0d29b7572372', $tr$# 💻 Friday — Weekly Practice: Computer

Quick review!

- **Input**: keyboard, mouse (to the computer)
- **Output**: monitor, speakers, printer (from the computer)

You are learning so well! 🌟$tr$),
('a3a131ed-a866-4b8b-97b8-9236ce836426', $tr$# 🌐 Computer — What We Use the Internet For

Grade 3, Week 21! Let's learn the common uses of the Internet. 🌐

## 🔄 Review
We learned about checking and showing our project.

## 🌐 Uses of the Internet
- **Research** — looking up information for a project
- **Talking to others** — talking with family who live far away
- **Learning** — watching learning videos
- **Fun** — playing learning games

## 🔍 Knowing the Browser and Search Engine
- A **browser** is the program we use to go on the Internet (e.g., Chrome, Edge)
- A **search engine** is the tool we use to look for information (e.g., Google)

**Key words:** Internet, browser, search engine, research$tr$),
('a5484416-d745-441e-b452-2820c854993e', $tr$# 🌐 Friday Review — Computer (Grade 2)

- What the Internet is and kid-friendly content

Great job! 🌟$tr$),
('a62e78eb-8d0b-49bd-b148-59e682618943', $tr$# 🔒 Friday Review — Computer (Grade 3)

- Don't share personal information

Great job in Computer! 🌟$tr$),
('a70bfd69-3f47-492e-a828-440ae90d1637', $tr$# 🎨 Computer — Drawing and Simple Formatting

Welcome to Term 2 Computer, Grade 3! Time to get creative with a **drawing program**! 🖌️

## 🖌️ Basic Drawing Tools
| Tool | What it does |
|---|---|
| **Pencil/Brush** | draws freehand lines |
| **Shapes** | makes circles, squares, triangles |
| **Fill Color** | fills a closed shape with color |
| **Eraser** | removes parts of your drawing |

## 🖼️ Making a Labeled Picture
A **labeled picture** has a drawing PLUS **words** that name its parts.

**Example:** A drawing of a family with the labels "Mom," "Dad," and "Me" written next to each person.

## 🧠 Worked Example 1
*You want to draw your favorite animal with a caption. What steps do you follow?*
- Step 1: Open the drawing program.
- Step 2: Use the **shapes tool** to make the basic body (circle for the head, oval for the body).
- Step 3: Use the **fill color** tool to color each shape.
- Step 4: Use the **pencil/brush** to add small details (eyes, whiskers).
- Step 5: Use the **text tool** to type a short caption, like "My Favorite Animal: Cat." ✅

## 🧠 Worked Example 2
*You made a mistake while drawing a line. What should you do?*
- Step 1: Select the **eraser tool**.
- Step 2: Carefully erase only the mistake, not the whole drawing.
- Step 3: Use the **pencil/brush** again to fix the line correctly. ✅

## 📝 Adding a Caption or Title
A **caption** is a short line of text that explains a picture.
- Click the **text tool**
- Click where you want the words to appear
- Type your caption, like *"My Family"*

## 🌈 Tips for a Great Drawing
- Plan your picture before you start
- Use different colors to make parts stand out
- Keep your caption **short and clear**

Have fun creating your masterpiece! 🎨$tr$),
('aad30574-1707-4c11-ba89-7aef75c4fc46', $tr$# 🎨 Computer — Drawing and Simple Formatting

Grade 3, Week 16! Let's create labeled drawings. 🖌️

## 🖌️ Basic Drawing Tools
| Tool | What it does |
|---|---|
| **Pencil/Brush** | draws freehand lines |
| **Shapes** | draws circles, rectangles, triangles |
| **Fill Color** | colors inside a closed shape |
| **Eraser** | removes mistakes |

## 🖼️ Creating a Labeled Picture
**Goal:** draw a picture with a **caption** (a short title or description).

**Steps:**
1. Use **shapes** and **pencil/brush** to sketch your picture
2. Use **fill color** to add color
3. Use the **eraser** for mistakes
4. Add a **short typed caption** below or beside the drawing

## 🧠 Worked Example 1
*You want to draw your favorite animal with a caption.*
- Draw the animal using shapes and pencil tools
- Color it using **fill color**
- Type a caption: *"My Favorite Animal: A Cat"*

## 🧠 Worked Example 2
*You made a mistake with the fill color.*
- Use the **eraser** or the **undo** option to fix it, then try again.

## 📝 Example Project: "My Family"
1. Draw simple figures representing family members
2. Color each one
3. Add a caption: *"My Family: Mom, Dad, and Me"*

## 💡 Tips
- Keep your drawing **simple and clear**
- Choose colors that make your picture **easy to understand**
- Always **check your caption** for spelling

Great drawing skills! 🌟$tr$),
('ae643a71-c443-4efa-b40c-cb18ad61522f', $tr$# 💻 Friday — Weekly Practice: Computer

Quick review!

- **Speakers** — to hear sound
- **Printer** — to make a paper copy
- **Webcam** — to take pictures/videos

You are learning so well! 🌟$tr$),
('b5e96e2c-a07c-42fc-86e8-1bf18eacf684', $tr$# 🔍 Friday Review — Computer (Grade 3)

- Knowing browser and search engine icons

Great job in Computer! 🌟$tr$),
('bac514c6-5ec1-4157-8393-f120d7012595', $tr$# ✅ Friday Review — Computer (Grade 3)

- Safe vs. not-right-for-kids content

Great job in Computer! 🌟$tr$),
('baec8454-1f53-4c6a-86ba-35c3dd7cb457', $tr$# 💻 Computer — Word Processing Tools

Grade 3, Week 11! Let's learn how to format text in a word-processing program. 💻

## ✍️ Formatting Text
- **Bold (B)** makes text darker and thicker.
- **Underline (U)** adds a line under text.
- **Font size** changes how big or small text appears.
- **Font Color** changes the color of the text.

## 💾 Saving Your Work
When you finish typing a document, always press **Save (Ctrl+S)** so your work is not lost.

## 🖱️ Other Tools
Basic drawing tools let you **draw shapes and color them**, and Backspace removes a wrongly typed letter.

**Key words:** bold, underline, font size, font color, save$tr$),
('bc22f687-97b7-4060-8184-b8fb3630aa6b', $tr$# 💻 Friday — Weekly Practice: Computer

Quick review!

- Start with your **name**, then short sentences
- Focus on **accuracy** before speed

You learned so well this term! 🌟$tr$),
('c6edb412-4d97-42a9-9cce-6391480f82f2', $tr$# ⏰ Friday Review — Computer (Grade 2)

- Screen-time and asking a grown-up

Great job in Computer! 🌟$tr$),
('cb2ccf32-1e5a-4c18-b972-28cd8310904e', $tr$# ⌨️ Friday Review — Computer (Grade 2)

- Word-processing/typing: typing simple sentences about yourself

Great job in Computer! 🌟$tr$),
('cb553078-5738-4933-841d-770135d88556', $tr$# 💻 Friday — Weekly Practice: Computer

Quick review!

- Sit up straight, screen at **eye level**
- **Clean hands** before touching keyboard/mouse
- **Save work** before shutting down

You are learning so well! 🌟$tr$),
('da002185-44a4-48d7-9ac1-bbe18e451883', $tr$# 💻 Friday Review — Computer (Grade 3)

- Term 2 wrap-up: Internet, safe content, online safety

Great term! 🌟$tr$),
('dc794ea0-26c3-45e4-ace0-e9f9e519c762', $tr$# 💾 Computer — Saving and Opening a File

Grade 2, Week 21! Let's learn how to save our work. 💾

## 🔄 Review
We learned about word processing and typing simple sentences.

## 💾 What Is "Saving"?
**Saving** means keeping your work on the computer so it is not lost, even when the computer is turned off.

## 📂 Steps to Save (with a grown-up)
1. Click **"Save"** or press **Ctrl+S**
2. Give the file a **name**
3. Choose where to keep it (folder)

## 📂 What Is Opening a File?
**Opening a file** means finding and clicking on work you saved so you can see it again.

**Important:** Always ask a grown-up for help when saving or opening a file.

**Key words:** saving, file, folder, opening$tr$),
('df329147-fff4-478b-833a-938e4b889bad', $tr$# ❓ Friday Review — Computer (Grade 3)

- Not everything on the Internet is true; keyboard shortcuts

Great job in Computer! 🌟$tr$),
('e2933846-ccb8-4eb8-9d1e-4858225a6afa', $tr$# 🔒 Computer — Keeping Personal Information Private

Grade 2, Week 24! Let's learn how to keep our information safe online. 🔒

## 🔄 Review
We learned about screen-time.

## 🔒 What Is Personal Information?
It includes your full name, home address, phone number, and school name.

## 🚫 Why Should We Not Share It Online?
Sharing personal information with people you don't know online can be **dangerous**.

## 👨‍👩‍👧 Good Online Manners
- Do not give personal information without your parent's permission
- Be polite when talking with others online
- Tell a grown-up right away if something scary or not okay happens online

**Key words:** personal information, private, good online manners, reporting$tr$),
('eb6792f5-49be-4543-8c96-9db0ecbb1f27', $tr$# 🔒 Computer — Don't Share Personal Information

Grade 3, Week 24! Let's learn how to keep our private information safe. 🔒

## 🔄 Review
We learned the difference between safe content and content not right for kids.

## 🔒 What Is Personal Information?
Full name, address, phone number, school name, and password.

## 🚫 Why Not Share It Online?
People we don't know online could use this information to do **bad things**.

## 👨‍👩‍👧 What Should You Do?
If someone asks for your personal information, **don't give it** and **tell a grown-up right away**.

**Key words:** personal information, private, bad things, tell right away$tr$),
('f152247a-70ff-4285-b393-7176e0add4d5', $tr$# 💻 Friday — Weekly Practice: Computer

Quick review!

- **Monitor** — shows pictures/words
- **CPU** — the brain of the computer
- **Keyboard** — for typing | **Mouse** — for clicking

You are learning so well! 🌟$tr$),
('f4c872bc-a4ec-4b8b-82f4-391764364eba', $tr$# 🖥️ Computer — Checking and Showing Your Project

Grade 3, Week 20! Let's check and show our finished computer project. 💾

## 🔍 Checking Your Project Before Showing It
Before we show our project (a drawing or a typed paragraph), let's check it first using the skills we learned — **copy, paste, and undo** — to fix the last details.

## ✅ Checklist Before Showing
| Question | Why |
|---|---|
| Was the file saved the right way? | So your work is not lost |
| Is the spelling right? | So your project is good |
| Are the labels on the drawing clear? | So people looking at it understand it |

## 🖨️ Getting Ready to Present
You can **print** the project before you show it, or show it right on the computer screen.

## 🧠 Example 1
*You see a spelling mistake in your project before printing it. What should you do?*
- **Fix the spelling first** using backspace or delete before printing or showing it.

## 🧠 Example 2
*Why is it important to save the file before closing the program?*
- So your finished work is **not lost**.

## 💡 Conclusion
Checking your project before showing it shows **hard work and care**.

Great job in Computer! 🌟$tr$),
('f9c52764-5fbe-4c8d-9b78-cf89f8d3a281', $tr$# 🎭 Computer — Parts of the Keyboard

Grade 2, Week 11! Let's learn the parts of the keyboard. ⌨️

## ⌨️ Important Keys
- The letters A, B, C are found in the **letter row**.
- The numbers 0-9 are in the **number row**.
- The **spacebar** is the longest key — it makes a space between words.

## 🔑 Special Keys
- Press **Enter/Return** to start a new line.
- **Shift** is used to make a capital letter.
- **Backspace** erases a letter you typed by mistake.

**Before you touch the keyboard**, always wash your hands first!

**Important words:** letter row, number row, spacebar, Shift, Backspace$tr$),
('fb73c956-7ef7-4743-8535-c9f1c58278dc', $tr$# 🖱️ Friday Review — Computer (Grade 2)

- Putting your skills together in a project

Great job this Computer term! 🌟$tr$);

insert into _cmp_question values
('002e2bc9-c4fe-47c2-87fa-9a4cd59252cc', $tr$What is saving?$tr$, $tr$["Keeping your work so it is not lost", "Throwing away your work", "Changing the computer", "Clicking the mouse"]$tr$::jsonb),
('005ac0de-8175-4120-bc2d-3f9cf8d7fce9', $tr$What does checking that the file is saved correctly make sure of?$tr$, $tr$["That our work will not be lost", "That the work gets done faster", "That the file has nicer colors", "It does not make sure of anything"]$tr$::jsonb),
('007b908b-8b58-4e7b-ac75-e1dff1679a75', $tr$What shape is the Chrome icon?$tr$, $tr$["A circle with four colors", "A black square", "A green triangle", "A yellow star"]$tr$::jsonb),
('00fc387c-8ac3-479d-89ba-dfd6e6a50c78', $tr$Which option turns off the computer the right way?$tr$, $tr$["Shut Down", "Restart again and again", "Delete", "Format"]$tr$::jsonb),
('02d71985-a165-4bd8-b138-1e20e6825d9d', $tr$What is copy?$tr$, $tr$["Making a copy of the chosen text or picture", "Removing text forever", "Printing the whole document", "Closing the program"]$tr$::jsonb),
('02d7ac9c-13b3-4952-86c1-5fc758272663', $tr$Which is an example of safe content?$tr$, $tr$["A learning game", "A violent picture", "A request for personal information", "Content that is not right for kids"]$tr$::jsonb),
('0398499e-ee1a-4c40-8651-6c4e6492ba15', $tr$How should you hold the mouse and keyboard?$tr$, $tr$["Gently", "Roughly", "With wet hands", "Only quickly"]$tr$::jsonb),
('04846b1d-4440-421f-943c-40889eb29eef', $tr$Why should an adult approve the content first?$tr$, $tr$["To make sure it is right and safe", "It is not needed", "The child should choose", "It has no use"]$tr$::jsonb),
('04b69308-c5ed-49f8-aa72-ceeeeeabf329', $tr$What is an example of something to do in a simple project?$tr$, $tr$["Type a sentence about yourself and add a drawing", "Just watch TV", "Play by yourself", "Just read a book"]$tr$::jsonb),
('059213f6-b8f6-49dc-b6ae-e940e25c85cf', $tr$What is the first step before showing your finished project to the class?$tr$, $tr$["Check the project using a checklist", "Present right away without checking", "Forget the whole project", "Turn off the computer right away"]$tr$::jsonb),
('05c620cd-60c1-4759-b1f2-96185ff302c1', $tr$Which is an EXAMPLE of personal information?$tr$, $tr$["Your phone number", "Your favorite color", "Your favorite animal", "Your favorite game"]$tr$::jsonb),
('063b831f-9c4c-4e04-851a-7a93517cd1dc', $tr$Why are the computer room rules important?$tr$, $tr$["They keep the equipment safe", "So we can play more", "They are useless", "So we don't use it"]$tr$::jsonb),
('063e225d-cdf8-4834-bed3-72f254ae20a7', $tr$Why do we learn this topic?$tr$, $tr$["To learn to balance how we use the computer", "It is not important", "To get more screen-time", "No goal"]$tr$::jsonb),
('067ef367-daf3-440b-8742-a2739649a091', $tr$What is part of 'good online manners'?$tr$, $tr$["Being polite online", "Being rude online", "Sharing everything", "Staying away from everyone"]$tr$::jsonb),
('0746a71b-56fe-4633-bb74-291c80672e61', $tr$What should you do first if you get an unsafe message?$tr$, $tr$["Do not reply", "Reply rudely", "Share your information", "Ignore it"]$tr$::jsonb),
('0761e89a-85a4-41a4-a932-834ac70defe8', $tr$Why put your computer skills together?$tr$, $tr$["To make a complete project", "No use", "You don't need to do it", "To make the teacher happy"]$tr$::jsonb),
('07dc2d46-4795-465b-9285-c7314b03ec69', $tr$Why is not everything on the Internet good for kids?$tr$, $tr$["Some content is for grown-ups or is dangerous", "Everything is safe", "Nothing is dangerous", "Not true"]$tr$::jsonb),
('093cea47-6cce-4b59-92c0-db61008ed059', $tr$Who should be with you when you save?$tr$, $tr$["A grown-up", "No one", "Only a classmate", "A younger brother or sister"]$tr$::jsonb),
('09547b50-458a-446e-bc2c-46620576a620', $tr$What is one use of the Internet?$tr$, $tr$["Looking up information", "Only watching TV", "Cooking", "Traveling"]$tr$::jsonb),
('09fab0eb-2892-4bd3-a71a-38b6b44038f1', $tr$Which of these is another input device?$tr$, $tr$["Microphone", "Speaker", "Printer", "Monitor"]$tr$::jsonb),
('0a20c909-921e-4e04-8279-577a93486339', $tr$Who should you ask for help if you are confused?$tr$, $tr$["Teacher", "Stranger", "No one", "Only a classmate"]$tr$::jsonb),
('0a24a321-0740-453b-82a5-1d3d944a1228', $tr$Which one is NOT a browser?$tr$, $tr$["Just the Google Search bar", "Chrome", "Edge", "Safari"]$tr$::jsonb),
('0a704ce3-c83b-49e9-a5bb-b46259ccbaaa', $tr$What is saving?$tr$, $tr$["Keeping your work so it is not lost", "Throwing away your work", "Changing the computer", "Clicking the mouse"]$tr$::jsonb),
('0a9fc022-1ba8-4127-a7fb-11a9a78eca03', $tr$Who should ask for permission before going online?$tr$, $tr$["The child, from a parent or teacher", "No one needs to ask", "The teacher, from the child", "Nobody"]$tr$::jsonb),
('0b05cca7-a566-4d3a-8f59-4642c14c66b2', $tr$What is good about printing your finished project?$tr$, $tr$["You will have a copy on paper", "All the data will be lost", "It can no longer be read", "The computer will become slower"]$tr$::jsonb),
('0c097a73-fcd0-417f-b89e-9828937e1600', $tr$What does Ctrl+S do?$tr$, $tr$["Save", "Copy", "Paste", "Delete"]$tr$::jsonb),
('0e302794-29e6-4042-8ff7-e23fc7368dac', $tr$Why do kids learn this topic?$tr$, $tr$["To think carefully about information online", "It is not important", "To believe everything", "It has no goal"]$tr$::jsonb),
('0e3bc631-951a-4733-9c43-a3a8c8056c5c', $tr$What should you do if you are not sure a website is safe?$tr$, $tr$["Ask a parent or teacher", "Open it right away", "Keep going alone", "Share it with a classmate"]$tr$::jsonb),
('0f2c2428-a7ae-41b1-b739-3938d1fa1fc2', $tr$What should you do if you are not sure the information is true?$tr$, $tr$["Ask a parent or teacher", "Believe it right away", "Share it right away", "Just ignore it"]$tr$::jsonb),
('0feec53d-7d9f-4a83-928c-0df58405a038', $tr$Which one is an output device?$tr$, $tr$["Monitor", "Keyboard", "Mouse", "Microphone"]$tr$::jsonb),
('1037a66c-6b8c-471b-be4e-6b86d35cab6c', $tr$What can you do using the Internet?$tr$, $tr$["Look for information, watch videos, talk with others", "Sew clothes", "Cook food", "Travel to another country"]$tr$::jsonb),
('112325d5-dab9-4272-a478-cb6d9bfb2656', $tr$What do you do when you want to see your old work again?$tr$, $tr$["Open the file", "Turn off the computer", "Erase everything", "Just start new work"]$tr$::jsonb),
('12838b1b-a411-4caf-92e4-12f06527e155', $tr$What is another example of personal information?$tr$, $tr$["Phone number", "Favorite color", "Favorite animal", "Favorite game"]$tr$::jsonb),
('13dd76f7-c9a0-4fad-81d9-b61c2b4261f1', $tr$Why should you not use the computer without a grown-up's permission?$tr$, $tr$["To make sure the content and your time on it are safe", "That is not needed", "It is always safe even without help", "The child should decide alone"]$tr$::jsonb),
('1402adba-db81-4a58-bb9d-56ba027bcd22', $tr$What is the main lesson about personal information?$tr$, $tr$["Keep it private and ask an adult for help", "Share it with everyone", "No need to be careful", "There is no danger online"]$tr$::jsonb),
('141c25e9-5781-45fc-9f01-9647ce975688', $tr$Why practice computer skills?$tr$, $tr$["To get better and feel comfortable", "No need to practice", "You use it only once", "No benefit"]$tr$::jsonb),
('14b3ae64-7ba3-4b67-898c-6ebff9112c94', $tr$Why is it dangerous to give your address to a stranger?$tr$, $tr$["Someone could use it to do bad things", "There is no danger", "It is always safe", "Everyone means well"]$tr$::jsonb),
('15fe08b6-4b15-436f-9490-19adb9d62968', $tr$What should you do before showing your project on the computer?$tr$, $tr$["Check it using copy, paste, and undo", "Show it right away without checking", "Delete the whole project", "Close the program right away"]$tr$::jsonb),
('16891e87-fdf9-4f6a-9d49-0d77a5eb0859', $tr$Which is an example of a sentence about your own name?$tr$, $tr$["My name is Ana.", "The dog is brown.", "It is sunny outside.", "Books are on the shelf."]$tr$::jsonb),
('16fdde86-aa13-47bc-ac02-e8647c705a15', $tr$What does Ctrl+V do?$tr$, $tr$["Paste", "Copy", "Save", "Delete"]$tr$::jsonb),
('1700dd89-1da0-4895-b9fd-6cfc9cc0164c', $tr$What should you give the file before you save it?$tr$, $tr$["A name", "Only a color", "Only a picture", "Nothing"]$tr$::jsonb),
('1786a536-0f06-49d9-91c6-f969ae83c061', $tr$What do you use to look for information online?$tr$, $tr$["Search engine", "Only a browser", "Only a keyboard", "Only a mouse"]$tr$::jsonb),
('1835e3d2-2a2c-4567-8656-13c945a36442', $tr$Is everything on the Internet good for kids?$tr$, $tr$["No, only kid-friendly content", "Yes, everything is good", "There is no content", "You don't need to choose"]$tr$::jsonb),
('18801af8-a432-45d8-8bb9-72af97aa2dc3', $tr$What does checking that the drawing labels are clear make sure of?$tr$, $tr$["That people looking at it understand the project", "How many colors were used", "How much the project costs", "Only how big the file is"]$tr$::jsonb),
('1894e78f-79c3-4890-ba48-2ff19ad12731', $tr$Why do we learn about saving and opening files in Grade 2?$tr$, $tr$["It is a basic skill for using a computer", "We don't need to learn it", "It is only for grown-ups", "It is not useful in school"]$tr$::jsonb),
('18d940bf-a669-480e-959a-0452a0de567f', $tr$What is paste?$tr$, $tr$["Putting the copied thing in another place", "Removing text", "Saving a file", "Opening a new program"]$tr$::jsonb),
('19c04671-bc7d-457d-b5cb-ac97c203ca50', $tr$Why is not everything on the Internet true?$tr$, $tr$["Anyone can post information without it being checked", "Everything on the Internet has been checked", "There is no wrong information online", "The Internet is always right"]$tr$::jsonb),
('1aff078a-b6c4-40ff-9846-ade088a7469d', $tr$Typing on the keyboard is what kind of task?$tr$, $tr$["Input", "Output", "Neither", "Both"]$tr$::jsonb),
('1b7ded16-b552-49c7-a562-eb3ccb2f3ffc', $tr$Why should we be careful when typing our name and information?$tr$, $tr$["So the information we write is right and clear", "Because being right is not important", "So we finish the task faster", "There is no reason at all"]$tr$::jsonb),
('1d502446-5637-4f8a-a627-5937ff5d4bce', $tr$What is the most important lesson about the Internet?$tr$, $tr$["Ask a grown-up for help when something bad happens", "You don't need help", "Everything online is safe", "Reporting is not important"]$tr$::jsonb),
('1d5a74a3-388e-4b78-9899-ca0f0b942d13', $tr$Why is it important to use a checklist before finishing a project?$tr$, $tr$["It makes sure all the parts are done", "It does not help the project", "It only slows down the work", "It is only used for grades"]$tr$::jsonb),
('1e8a87a6-3da1-430a-bd6c-71aba34faf83', $tr$Why not reply to a scary message?$tr$, $tr$["It could make things worse", "It is always safe to reply", "No danger", "You have to do it"]$tr$::jsonb),
('1e9fb5fe-80d8-4221-ac1a-a9a6c8ae9770', $tr$Why is it important to learn the dangers of sharing information while you are young?$tr$, $tr$["So you will use technology wisely as you grow up", "There is no need to learn it", "It is only for grown-ups", "It does not matter"]$tr$::jsonb),
('1f124a09-6887-4c06-b0d3-2b1b6405e5f9', $tr$Which of these are computer skills (ICT) we learned this whole term?$tr$, $tr$["Saving, typing, and online safety", "Cooking food", "Sewing clothes", "Farming"]$tr$::jsonb),
('1f226827-ccfc-41db-8bea-a5dca9803571', $tr$What is the first step before you paste text?$tr$, $tr$["Copy the text first", "Print the whole document right away", "Close the program right away", "Delete the text right away"]$tr$::jsonb),
('205083c2-046d-4b27-8609-4434baa6b86a', $tr$Which is an example of a search engine?$tr$, $tr$["Google", "Chrome", "Edge", "Safari"]$tr$::jsonb),
('20b23ab6-4ac0-4a88-b29a-52fa5347971e', $tr$What is one use of the Internet?$tr$, $tr$["Looking up information", "Only watching TV", "Cooking", "Traveling to other countries"]$tr$::jsonb),
('21b0dfd6-b66f-4646-be32-a32bf21055e5', $tr$What should you do if someone asks for your personal information?$tr$, $tr$["Don't give it, tell an adult", "Give it right away", "Answer honestly", "Keep chatting"]$tr$::jsonb),
('21c19cb8-b251-4f9d-a496-3d2d63100805', $tr$Why is it important to tell a grown-up about a problem online?$tr$, $tr$["They can help fix it safely", "You don't need to tell", "The child should fix it alone", "Telling does not help"]$tr$::jsonb),
('22a0215c-e82c-4f52-9a5a-5243d20a5908', $tr$How should you handle computer equipment?$tr$, $tr$["Carefully", "Roughly", "With wet hands", "Quickly"]$tr$::jsonb),
('22a128b2-d91a-4ed0-995b-bd3055939bb5', $tr$What is copy?$tr$, $tr$["Making a copy of the chosen text or picture", "Removing text forever", "Printing the whole document", "Closing the program"]$tr$::jsonb),
('22b31083-994e-43e5-9ca2-5dac71c5ab1c', $tr$What is an example of a search engine?$tr$, $tr$["Google", "Chrome", "Edge", "Safari"]$tr$::jsonb),
('231e486e-3e5a-4a89-b734-afe74adc4e13', $tr$What can you do with a grown-up to keep a record of the problem?$tr$, $tr$["Take a screenshot", "Delete everything right away", "Keep talking", "Reply in a mean way"]$tr$::jsonb),
('234900a2-9fe0-4a21-b663-892d5d42d73d', $tr$What should you do before using the keyboard?$tr$, $tr$["Clean your hands", "Eat first", "Run", "Drink"]$tr$::jsonb),
('2368c078-f090-4839-a283-1253686a9f6b', $tr$Why is the Internet a big network?$tr$, $tr$["It connects many computers", "Only one computer", "Nothing is connected", "Cut off from the world"]$tr$::jsonb),
('24033d94-8432-4082-8edb-4661fb9e8943', $tr$Which one is an output device?$tr$, $tr$["Monitor", "Keyboard", "Mouse", "Microphone"]$tr$::jsonb),
('2547bed6-1165-49e4-8be2-31e97f835820', $tr$What should you do if someone asks for your personal information?$tr$, $tr$["Don't give it, tell an adult", "Give it right away", "Answer honestly", "Keep chatting"]$tr$::jsonb),
('255183dd-270d-4a2d-b506-52acb1ac7ba0', $tr$What is an important lesson about the Internet?$tr$, $tr$["Use it with help and choose the right content", "Use it alone any time", "You don't need to be careful", "No danger"]$tr$::jsonb),
('2584490d-a6bf-46b7-8b71-5193a1de2a8d', $tr$Why do we learn this topic?$tr$, $tr$["To be safe on the Internet from a young age", "Not important", "To get kids to share", "No goal"]$tr$::jsonb),
('25adbc37-6f78-440a-86c7-2cff17f13ba6', $tr$Who should you ask for permission before using a new program online?$tr$, $tr$["A parent or teacher", "You don't need to ask anyone", "Only a classmate", "A younger brother or sister"]$tr$::jsonb),
('261090ce-20cc-4d32-ad38-33506a945b2f', $tr$What should you do if something scary happens online?$tr$, $tr$["Tell a grown-up", "Just keep it a secret", "Ignore it", "Tell only a friend"]$tr$::jsonb),
('261fe174-2c2c-477b-b4ef-94d13eb5499d', $tr$What is a browser?$tr$, $tr$["A program used to go on the Internet", "A kind of game", "A kind of book", "A kind of scissors"]$tr$::jsonb),
('263a71b8-8ee2-4dba-9e72-286baf0dc1e5', $tr$Why is undo helpful?$tr$, $tr$["It helps fix mistakes", "It only slows down the work", "It has no use in a project", "It only makes work harder"]$tr$::jsonb),
('268ced5f-841a-4d27-a660-c0c846d5de2e', $tr$What is an example of something to do in a simple project?$tr$, $tr$["Type a sentence and add a drawing", "Just watch TV", "Play by yourself", "Just read"]$tr$::jsonb),
('26e189c4-fc8c-4c7e-9e85-47e251940318', $tr$A student finished a project but has not saved it yet. What should the student do first?$tr$, $tr$["Save the file before closing the program", "Close the program right away without saving", "Delete the whole project", "Just not turn in the project"]$tr$::jsonb),
('2703efc7-123c-4a29-b645-bfa5f3fe5233', $tr$What is a browser?$tr$, $tr$["A program used to go on the Internet", "A kind of game", "A kind of book", "A kind of scissors"]$tr$::jsonb),
('27169c61-a031-43fc-ac20-2f16011176b1', $tr$What is the Internet?$tr$, $tr$["A network that connects computers all over the world", "A kind of toy", "A kind of book", "A kind of scissors"]$tr$::jsonb),
('27e2dfaf-5ad1-48e4-b458-3e17a14b678f', $tr$Why is it important to put your computer skills together?$tr$, $tr$["So you can make a complete project", "It is no use", "You don't need to do it", "Only to make the teacher happy"]$tr$::jsonb),
('280a0ccd-f1d5-4e14-9265-ee0b11a14761', $tr$What is a word-processing program like in real life?$tr$, $tr$["Writing on paper, but using a keyboard", "Just a kind of toy", "A kind of kitchen tool", "A kind of clothing"]$tr$::jsonb),
('28bc4669-efb0-47c4-a178-831ed8bbe0ff', $tr$Why do we need a grown-up's help when using the Internet?$tr$, $tr$["To help choose safe and right content", "We don't need help", "Everything on the Internet is always safe", "The child should decide alone"]$tr$::jsonb),
('29328e36-2935-4749-bb4b-75bd432d9529', $tr$What computer skills (ICT) did we learn this whole term?$tr$, $tr$["Saving, typing, online safety", "Cooking food", "Sewing clothes", "Farming"]$tr$::jsonb),
('2981a16e-b107-4358-82e9-f5880dae9df3', $tr$What skill do you use to type?$tr$, $tr$["Word-processing/typing", "Only mouse click", "Only drawing", "Only saving"]$tr$::jsonb),
('29c4efbe-aa25-4d50-b502-acc20645b0c5', $tr$Who should you tell if someone asks for your information?$tr$, $tr$["A grown-up", "No one", "Only a classmate", "A stranger online"]$tr$::jsonb),
('2abe4acb-c99e-4197-8487-20d75cb9db38', $tr$What is screen-time?$tr$, $tr$["Time spent in front of a computer, tablet, or phone", "Time for sleeping", "Time for eating", "Time for playing outside"]$tr$::jsonb),
('2b22c42d-bf20-4633-9196-b29e78b51b0c', $tr$Who should you still ask for help while working?$tr$, $tr$["A grown-up", "No one needed", "Only a classmate", "A stranger online"]$tr$::jsonb),
('2bce16ca-4131-4563-81af-ce8cff81b383', $tr$For a 'My Family' project, what should the caption include?$tr$, $tr$["A short description of the family", "Nothing at all, ever", "Only random numbers", "A long separate paragraph"]$tr$::jsonb),
('2bdfc370-48e2-49d5-a8e8-7cffb9688dd9', $tr$What should you do if you see content that is not right for kids?$tr$, $tr$["Close it right away and tell an adult", "Keep watching", "Share it with a friend", "Ignore it"]$tr$::jsonb),
('2bec1bca-5893-4633-9c79-f7e248c1b03c', $tr$What should you do first if you get an unsafe message?$tr$, $tr$["Do not reply", "Reply rudely", "Share your personal information", "Ignore it and keep talking"]$tr$::jsonb),
('2c718438-8823-458a-89bc-7d7f35a6e36a', $tr$What is screen-time?$tr$, $tr$["Time spent in front of a computer, tablet, or phone", "Time for sleeping", "Time for eating", "Time for playing outside"]$tr$::jsonb),
('2cead11a-dbd7-4062-bc13-7d3c3a87b260', $tr$Why do we learn this topic before online safety?$tr$, $tr$["To first understand what the Internet is before learning to use it the right way", "There is no need to teach it", "It has nothing to do with online safety", "It is only for grown-ups"]$tr$::jsonb),
('2d9620db-8249-4b40-975c-2bcce6cde7bc', $tr$What are examples of browsers?$tr$, $tr$["Chrome, Edge, Safari", "Only Google", "Only Word", "Only Paint"]$tr$::jsonb),
('2e3f57d8-6320-4331-a28b-b35f247666fc', $tr$Which is an example of a search engine?$tr$, $tr$["Google", "Chrome", "Edge", "Safari"]$tr$::jsonb),
('2e7f0031-26ee-4474-9dc9-380e6fa2ac0c', $tr$What can you use to keep a record of a scary message?$tr$, $tr$["A screenshot", "Breaking the computer", "Throwing away the computer", "Nothing, you don't need a record"]$tr$::jsonb),
('2f5ee958-5051-4c41-9a8c-089a91cdd9a4', $tr$What is an example of a search engine?$tr$, $tr$["Google", "Chrome", "Edge", "Safari"]$tr$::jsonb),
('2f7dbfd6-3367-4b59-a62a-3c8ae405d824', $tr$Why is accuracy more important than speed when typing?$tr$, $tr$["So you avoid wrong spelling and your writing is clear", "Only speed matters, not accuracy", "It has nothing to do with writing", "Accuracy is not needed anymore"]$tr$::jsonb),
('325fa92b-c12d-4baa-92ca-d5cd15b89408', $tr$Why do we need a grown-up's help online?$tr$, $tr$["To help choose safe content", "We don't need it", "Everything is always safe", "The child should decide alone"]$tr$::jsonb),
('32d62a4d-f735-4f8e-8929-99ffb1e28c9c', $tr$What does checking that the drawing labels are clear make sure of?$tr$, $tr$["That people looking at it understand the project", "How many colors were used", "How much the project costs", "Only how big the file is"]$tr$::jsonb),
('33c65df9-e249-433a-93be-135a1f649a07', $tr$What is the CPU?$tr$, $tr$["The brain of the computer that works on information", "The computer screen", "The paper for printing", "The computer mouse"]$tr$::jsonb),
('33cf55ee-69e9-40ef-8bb4-db654b5d7336', $tr$Why do browser icons look different from each other?$tr$, $tr$["Different companies made each one", "They are all the same", "There is no difference", "One company made them all"]$tr$::jsonb),
('35227863-cd8a-4511-92ae-05829de7e631', $tr$What is the Internet?$tr$, $tr$["A network that connects computers", "A kind of toy", "A kind of book", "A kind of scissors"]$tr$::jsonb),
('35358184-729d-42b1-bbd1-b2e7953a191d', $tr$Why learn to check information while you are young?$tr$, $tr$["To be a smart Internet user", "No need to learn it", "It is only for grown-ups", "It does not matter"]$tr$::jsonb),
('35c41c3b-b768-4103-bf51-5f5625911557', $tr$Why is not everything on the Internet good for kids?$tr$, $tr$["Some content is for grown-ups or is dangerous", "Everything is safe", "Nothing is dangerous", "Not true"]$tr$::jsonb),
('35fab074-aa83-40d5-8f4f-cadfe8bca796', $tr$What is opening a file?$tr$, $tr$["Finding and clicking on work you saved", "Throwing away the file", "Changing the name", "Turning off the computer"]$tr$::jsonb),
('36edcb30-23da-483e-9dfb-c5125d7bda76', $tr$What is important to think about while typing, not just speed?$tr$, $tr$["Accuracy", "Only the color of the screen", "Only the size of the monitor", "Only the sound of the keyboard"]$tr$::jsonb),
('37349b2f-430d-44e0-878a-ab03f49b2f4a', $tr$What skills are put together in the project?$tr$, $tr$["Mouse skills, typing, drawing, saving", "Cooking and cleaning", "Singing and dancing", "Fishing and farming"]$tr$::jsonb),
('37d7152a-b38e-4095-a862-7f65f69d2c0f', $tr$How is a browser different from a search engine?$tr$, $tr$["A browser takes you on the Internet, a search engine helps you look things up", "They are just the same", "There is no difference", "A search engine is for drawing"]$tr$::jsonb),
('383a19d1-ff11-4ae6-8a5f-54809b4d1d48', $tr$What is the goal of putting your skills together?$tr$, $tr$["To show the skills you learned in one task", "No goal", "Only to use up the time", "To get more screen-time"]$tr$::jsonb),
('389e7889-6d6c-4320-9881-325466d63eb3', $tr$Which is an example of a sentence about your own name?$tr$, $tr$["My name is Ana.", "The dog is brown.", "It is sunny outside.", "Books are on the shelf."]$tr$::jsonb),
('38e1d25d-d913-472d-9187-8e580befe611', $tr$Why is accuracy more important than speed when typing?$tr$, $tr$["So you avoid wrong spelling and your writing is clear", "Only speed matters, not accuracy", "It has nothing to do with writing", "Accuracy is not needed anymore"]$tr$::jsonb),
('39ac5587-de64-4643-a399-66c8962ec97f', $tr$Should you touch the computer without permission?$tr$, $tr$["No, you need the teacher's permission", "Yes, even without permission", "Only sometimes", "Anytime"]$tr$::jsonb),
('3ab49b47-e9fd-4a45-90d9-870660ebf1c1', $tr$What should you do before using the keyboard?$tr$, $tr$["Clean your hands", "Eat first", "Run", "Drink"]$tr$::jsonb),
('3d6cc624-8fec-4457-a406-ad0b8e4db164', $tr$What should you do first if you get an unsafe message?$tr$, $tr$["Do not reply", "Reply rudely", "Share your information", "Ignore it and keep going"]$tr$::jsonb),
('3e2a2ac3-0007-4d46-a135-13db87b46c5d', $tr$Which of these is a correct step for saving?$tr$, $tr$["Click Save and give the file a name", "Just turn off the computer", "Forget about the file", "Close the program right away"]$tr$::jsonb),
('3e47e096-aaca-4769-85fb-79068173ca4d', $tr$Why did we learn these Computer topics?$tr$, $tr$["To use technology in a careful and safe way", "They are not important", "To use it with no adult help", "There is no goal"]$tr$::jsonb),
('3f14f0b4-089e-4f0e-a11b-7407f7a38200', $tr$What is important to think about while typing, not just speed?$tr$, $tr$["Accuracy", "Only the color of the screen", "Only the size of the monitor", "Only the sound of the keyboard"]$tr$::jsonb),
('3f4b2bea-1de8-4bba-89e0-23ddc53aa00c', $tr$What should you do if you don't understand something?$tr$, $tr$["Ask the teacher for help", "Just don't do it", "Cry", "Run outside"]$tr$::jsonb),
('3f7ef330-d56e-4d55-aaa1-c1aa236ff08e', $tr$What is true about safe content?$tr$, $tr$["Made for kids, approved by an adult", "Has violent pictures", "Asks for personal information", "Not right for your age"]$tr$::jsonb),
('3f8ed919-9f48-4674-99e1-db3b95568c77', $tr$What does the DELETE key do?$tr$, $tr$["Erases the character to the right of the cursor", "Saves the document", "Erases the character to the left of the cursor", "Opens a new file"]$tr$::jsonb),
('3f9da3a8-cc63-440f-96df-cfdb3cefa0ce', $tr$What is an example of an unsafe situation online?$tr$, $tr$["Someone says bad words or asks for your personal information", "Someone teaches a lesson", "A picture of an animal", "A learning game"]$tr$::jsonb),
('3ff6b6b2-fa5a-48a8-83d6-b0567daffc45', $tr$What will happen if you don't save your work before closing the program?$tr$, $tr$["Your work might be lost", "It is always kept", "Nothing happens", "It saves by itself"]$tr$::jsonb),
('4009a792-ae20-4075-8a7e-74eea7c76670', $tr$Why should you know the different icons?$tr$, $tr$["To use the computer with more confidence", "It is not needed", "It does not matter", "Only one icon is important"]$tr$::jsonb),
('4034ca1e-1fb9-4e5e-bc13-632c428aa441', $tr$Why do we need a search engine?$tr$, $tr$["To find information fast", "Only to open games", "To make a new Internet", "It has no use"]$tr$::jsonb),
('406dc286-c6a5-4875-b261-d46c17a5f442', $tr$Why should you not go online without a grown-up's help, even for a project?$tr$, $tr$["To make sure you are safe and use it the right way", "That is not needed", "It is always safe", "The child should decide alone"]$tr$::jsonb),
('40ed7ed7-eb59-439f-8de2-e0cf06e76d6e', $tr$What should you do before pulling out the plug?$tr$, $tr$["Make sure the computer is already off", "Pull it out right away", "Nothing needs checking", "Pull it out while the computer is on"]$tr$::jsonb),
('412402a2-a56a-495d-b29a-088ab00a3425', $tr$Why is it important to use a checklist before finishing a project?$tr$, $tr$["It makes sure all the parts are done", "It does not help the project", "It only slows down the work", "It is only used for grades"]$tr$::jsonb),
('4150fb0c-b452-44ba-a05b-cc6d0622e4a2', $tr$Why is it important to know these skills for a project?$tr$, $tr$["They help you work faster and better", "They do not help the work at all", "They only make the whole project harder", "Only teachers at school use them"]$tr$::jsonb),
('416bcf75-c2be-4de1-add0-df700b1da640', $tr$Which one is an input device?$tr$, $tr$["Keyboard", "Monitor", "Speakers", "Printer"]$tr$::jsonb),
('42579326-b733-4186-814a-1d7d033e6ef8', $tr$What is a folder?$tr$, $tr$["A place where files are kept", "A kind of toy", "A kind of scissors", "A kind of book"]$tr$::jsonb),
('428e0bf3-11c6-4d99-8fdf-ce00e5be2467', $tr$Which are examples of browsers?$tr$, $tr$["Chrome, Edge, Safari", "Only Google", "Only Word", "Only Paint"]$tr$::jsonb),
('42971482-8873-431d-a1bd-bb99858eec68', $tr$Why is it dangerous to give your address to a stranger online?$tr$, $tr$["Someone could use it to do bad things", "There is no danger", "It is always safe", "Everyone means well"]$tr$::jsonb),
('4300513a-0b57-42df-932d-182afcd21d4d', $tr$What is true about safe content?$tr$, $tr$["Made for kids, approved by an adult", "Has violent pictures", "Asks for personal information", "Not right for your age"]$tr$::jsonb),
('4338c599-4dd0-4150-a59e-6fbd04818e76', $tr$Which of these is another input device?$tr$, $tr$["Microphone", "Speaker", "Printer", "Monitor"]$tr$::jsonb),
('43d2fc34-0f14-4afa-bbc4-c87fe42a309b', $tr$What is an example of personal information?$tr$, $tr$["Your full name and home address", "Your favorite color", "Your favorite food", "Your favorite game"]$tr$::jsonb),
('44fa5eee-af2d-40c5-afb0-e801c1daf9ef', $tr$Who should you tell if someone asks for your personal information?$tr$, $tr$["A grown-up", "No one", "Only a classmate", "A stranger online"]$tr$::jsonb),
('451f7561-db58-4f67-926c-cefc4f350b05', $tr$What can you do with your project when it is finished?$tr$, $tr$["You can print it", "Just forget about it", "Delete it right away", "Never open it again"]$tr$::jsonb),
('45a53ba6-a3dd-4e50-a002-42c6f6e9e10f', $tr$What can you do using the Internet?$tr$, $tr$["Look for information, watch videos", "Sew", "Cook", "Travel"]$tr$::jsonb),
('461c425e-be5d-40ee-9a12-5152022653a9', $tr$What should you do if there is something you don't understand?$tr$, $tr$["Ask the teacher for help", "Just don't do it", "Just cry", "Run outside"]$tr$::jsonb),
('465d75e1-7441-4e21-b011-2dd6289f0e4c', $tr$Why limit screen-time?$tr$, $tr$["It can hurt your eyes and body", "There is no reason", "Long screen-time is always good", "No need to limit it"]$tr$::jsonb),
('47b35013-2896-41c3-8a57-5ab5c3028046', $tr$What is a word-processing or typing program?$tr$, $tr$["A program used to write using the computer", "A kind of game with no words", "A kind of music you listen to", "A kind of picture that is only drawn"]$tr$::jsonb),
('47d4bdec-3395-4874-817b-527c03e07da1', $tr$Why is it important to use undo when you make a mistake while checking your project?$tr$, $tr$["It helps fix mistakes", "It only slows down the work", "It does not help the project", "It only makes work harder"]$tr$::jsonb),
('47eb2213-6bf1-4cdc-a48a-3b3dbf220242', $tr$Where do your fingers go on the home row keys?$tr$, $tr$["ASDF and JKL;", "QWER and UIOP", "ZXCV and NM,.", "Wherever feels comfy"]$tr$::jsonb),
('48208c25-2c1f-477e-b8a0-d6b462613946', $tr$Why should you not reply to a scary message?$tr$, $tr$["It could make things worse", "It is always safe to reply", "It has no danger", "You have to do it"]$tr$::jsonb),
('488b3beb-54f8-4ba1-9a63-39b2f109bbbf', $tr$Which is an example of a sentence about something you like to do?$tr$, $tr$["I like to read books.", "The car is red.", "It is cold today.", "The bird can fly."]$tr$::jsonb),
('489d09ae-c293-476c-8a24-5bd45b0b2dad', $tr$What is the main lesson about the Internet this whole term?$tr$, $tr$["Use it with help and choose the right content", "Use it alone any time", "You don't need to be careful", "There is no danger online"]$tr$::jsonb),
('493942c7-b649-4de2-9df5-f1efd1a3362e', $tr$You see a spelling mistake before printing your project. What should you do?$tr$, $tr$["Fix the spelling first before printing", "Print right away even with the mistake", "Delete the whole project", "Just don't show the project"]$tr$::jsonb),
('49d14d3e-33e5-4b9b-918d-35014dc16b38', $tr$Why do we learn this topic in Grade 2?$tr$, $tr$["To learn to balance how we use the computer", "It is not important", "To get kids to have more screen-time", "It has no goal"]$tr$::jsonb),
('49d4aa7a-15b1-42be-a321-4295a6448254', $tr$Why learn to spot safe content while you are young?$tr$, $tr$["To use the Internet wisely as you grow up", "No need to learn it", "It is only for grown-ups", "It does not matter"]$tr$::jsonb),
('4a0250ec-7647-4e59-b77c-a6d427dfbd3a', $tr$Who should you ask before using a new app or website?$tr$, $tr$["A parent or teacher", "You don't need to ask anyone", "Only a friend", "A stranger online"]$tr$::jsonb),
('4a7f4906-063f-4b15-b881-278becb623bd', $tr$Which is an example of a search engine?$tr$, $tr$["Google", "Chrome", "Windows", "Word"]$tr$::jsonb),
('4aed6b68-4584-4ca2-8530-e995ff6e2281', $tr$Which is an example of personal information?$tr$, $tr$["Full name and address", "Favorite color", "Favorite food", "Favorite game"]$tr$::jsonb),
('4b0d8390-216a-4749-bf12-bed3f95b1a68', $tr$Why do kids learn how to shut down safely?$tr$, $tr$["To keep the computer in good shape", "It is not important", "Only to use up time", "It has no goal"]$tr$::jsonb),
('4bce95a8-91ca-499f-98ab-273e72f3b4ff', $tr$What does checking your project before showing it show?$tr$, $tr$["Hard work and care", "Being careless with your work", "Not caring about the project", "Only not having enough time"]$tr$::jsonb),
('4bd4f8a9-52d0-4b2d-a2e9-fe5c9bba6e12', $tr$You want to use the same title in different parts. Which two skills will you use?$tr$, $tr$["Copy and paste", "Undo and redo", "Save and close", "Print and delete"]$tr$::jsonb),
('4bf185e1-fe18-4659-b5b4-f71989bffb9a', $tr$How does the Internet help with learning?$tr$, $tr$["Watching learning videos", "It has no use", "It stops learning", "It is only for fun"]$tr$::jsonb),
('4c1fb1ac-d85f-447a-a9cd-0f77c9b96151', $tr$What should you do while waiting for your turn?$tr$, $tr$["Be polite", "Shout", "Leave", "Sulk"]$tr$::jsonb),
('4c71fcef-2b47-46d2-aa33-814675476b57', $tr$Who should you still ask for help while making a project?$tr$, $tr$["A grown-up", "You don't need to ask anyone", "Only a classmate", "A stranger online"]$tr$::jsonb),
('4d038ddc-3364-4411-a475-c0f0104cd0b0', $tr$What should you do after saving your work?$tr$, $tr$["Close the open programs", "Pull out the plug", "Start over", "Forget everything"]$tr$::jsonb),
('4e494c98-a1e1-42f1-b79a-c05c6396f298', $tr$Why is it important to learn to check information while you are young?$tr$, $tr$["To be a smart Internet user as you grow up", "No need to learn it", "It is only for grown-ups", "It does not matter"]$tr$::jsonb),
('4e66a1b0-bc97-42f2-902d-626f896e2a6f', $tr$Why did we learn all these skills in Grade 2?$tr$, $tr$["They are basic skills for using the computer safely and responsibly", "We don't need to learn them", "They are only for grown-ups", "They are not useful in school"]$tr$::jsonb),
('4ea60abe-9cc5-4c84-b75c-00e6a289c921', $tr$Why balance screen-time?$tr$, $tr$["For a healthy body and mind", "Balance is not important", "Only screen-time matters", "There is no reason"]$tr$::jsonb),
('4f63c67d-39fa-4695-9550-46ec3683a6ee', $tr$What should you do before using the keyboard and mouse?$tr$, $tr$["Clean your hands", "Eat first", "Run around the room", "Drink water"]$tr$::jsonb),
('51590a6f-9af7-4497-bac9-6a4db0e70667', $tr$Is everything on the Internet good for kids?$tr$, $tr$["No, only use content made for kids", "Yes, everything is good for kids", "The Internet has no content", "You don't need to choose"]$tr$::jsonb),
('5163743a-3717-4694-bfef-2fc5ee3eaab7', $tr$Why is it important to balance screen-time with other activities?$tr$, $tr$["To have a healthy body and mind", "Balance is not important", "Only screen-time is important", "There is no reason"]$tr$::jsonb),
('51d4398b-ed00-42b6-9d6a-c966840abc4d', $tr$What is opening a file?$tr$, $tr$["Finding and clicking on work you saved", "Throwing away the file", "Changing the name", "Turning off the computer"]$tr$::jsonb),
('51f4e3a4-fba0-4105-be57-61d6274e9ae2', $tr$Why is it important to use copy and paste when you make the last fixes to your project?$tr$, $tr$["So you don't have to type the same thing again", "It only makes the work harder", "It does not help at all", "It is only used for playing"]$tr$::jsonb),
('529304bb-d9a6-4d34-a9b9-2f7af8b61463', $tr$Why is it important to follow the computer room rules?$tr$, $tr$["They keep the equipment and everyone safe", "So we can play longer", "They are useless", "So we don't use the computer anymore"]$tr$::jsonb),
('52a3e614-d26e-45c1-bd6f-e271d033b269', $tr$Which is an example of using the Internet to learn?$tr$, $tr$["Watching a video about Science", "Playing with no goal", "Sharing personal information", "Chatting with a stranger"]$tr$::jsonb),
('5461b9c8-325d-4063-97b2-88128ff44224', $tr$Why should you not eat near the computer?$tr$, $tr$["So the equipment does not get damaged", "So you get full", "Because it tastes good", "There is no reason"]$tr$::jsonb),
('54a5ba5b-04cf-4722-baaa-01fd0d1205e5', $tr$Why is it important for an adult to approve the content first?$tr$, $tr$["To make sure it is right and safe for kids", "Approval is not needed", "The child should choose alone", "Approval has no use"]$tr$::jsonb),
('55af58ce-ad90-45b0-9963-9e0e6cb2a0cf', $tr$What do you use to look for information online?$tr$, $tr$["Search engine", "Only a browser", "Only a keyboard", "Only a mouse"]$tr$::jsonb),
('57adec22-9b29-4768-b50b-be08a8131267', $tr$Why tell a grown-up about a problem online?$tr$, $tr$["They can help fix it", "No need to tell", "The child should fix it alone", "It does not help"]$tr$::jsonb),
('57f67139-d4bd-40da-842f-f90fefce979a', $tr$Why should you not share personal information?$tr$, $tr$["Someone could use it to do bad things", "It is always safe", "You have to do it", "There is no danger"]$tr$::jsonb),
('581e3d9c-2fa2-44ed-9086-327ec2925429', $tr$Which is an example of a browser?$tr$, $tr$["Chrome", "Google", "Windows", "Facebook"]$tr$::jsonb),
('5974ef8e-aaa9-48d5-a0d7-3917e577fd0d', $tr$What do you use to go on the Internet?$tr$, $tr$["Browser", "Only a search engine", "Only a keyboard", "None of these"]$tr$::jsonb),
('5a1b0c23-aa9f-409a-9eaa-593832793482', $tr$Why is it important to know copy and paste?$tr$, $tr$["It helps you not type the same thing again", "It only makes the whole work harder", "It does not help at all", "It is only used for playing games"]$tr$::jsonb),
('5b876c47-9960-486a-85d4-6dd751baa742', $tr$What is one use of the Internet?$tr$, $tr$["Looking up information", "Only watching TV", "Cooking food", "Traveling to other countries"]$tr$::jsonb),
('5c55a354-100e-4220-a58d-3f49140786c2', $tr$What should you do if you are not sure the information is true?$tr$, $tr$["Ask a parent or teacher", "Believe it right away", "Share it right away", "Ignore it"]$tr$::jsonb),
('5cb3931d-4af7-4c68-a621-8c2e30c0e2be', $tr$What should you do first if you get an unsafe message?$tr$, $tr$["Do not reply", "Reply rudely", "Share your personal information", "Ignore it and keep talking"]$tr$::jsonb),
('5d2217ba-348e-4302-94e8-14f942a2a73e', $tr$Why is it important to save your work?$tr$, $tr$["So it is not lost even when the computer is turned off", "To make your work more colorful", "It is not important", "So your work finishes by itself"]$tr$::jsonb),
('5ddbc518-e1e2-4a23-ba42-97549770a86c', $tr$What should you give the file before you save it?$tr$, $tr$["A name", "Only a color", "Only a picture", "Nothing"]$tr$::jsonb),
('5f230ca1-1669-4896-bf60-afd8f7e6c7b8', $tr$Which of these is NOT right for kids?$tr$, $tr$["A scary or violent picture", "A learning video", "A math game", "A kids' story"]$tr$::jsonb),
('5ff269be-028a-468f-8640-bb2f2a1f9aa9', $tr$What is the main lesson about personal information?$tr$, $tr$["Keep it private and ask an adult for help", "Share it with everyone", "No need to be careful", "There is no danger online"]$tr$::jsonb),
('60baa747-dbbe-4077-a9e1-4e2f157bf21e', $tr$Who should be with you when you save a file?$tr$, $tr$["A grown-up", "No one", "Only a classmate", "A younger brother or sister"]$tr$::jsonb),
('60ea46c8-d5ea-496e-8b8a-d76e354ed0e8', $tr$What is an example of personal information?$tr$, $tr$["Your full name and home address", "Your favorite color", "Your favorite food", "Your favorite game"]$tr$::jsonb),
('6177cc8b-6357-4652-af86-3cc4ae23a421', $tr$Why is it important to learn to type simple sentences about yourself?$tr$, $tr$["It helps you feel comfortable using the computer", "It does not help a child learn at all", "It is only done to get a good grade", "It only confuses a new learner"]$tr$::jsonb),
('63eab1e2-9ea4-477f-8346-cb673d095e2f', $tr$Why is not everything on the Internet true?$tr$, $tr$["Anyone can post things without them being checked", "Everything has been checked", "There is no wrong information", "It is always right"]$tr$::jsonb),
('64c413fc-ca28-4c52-9da2-0636c0161c69', $tr$Why should you not share personal information online?$tr$, $tr$["It can be dangerous", "It is always safe to do", "It has no danger", "You have to do it"]$tr$::jsonb),
('653d4bbf-4c8a-40ae-ba64-4f3f11a2e2e6', $tr$What can you do with your project when it is finished?$tr$, $tr$["You can print it", "Just forget about it", "Delete it right away", "Never open it again"]$tr$::jsonb),
('65546cec-77f5-40bc-a4a2-b9b54987c208', $tr$Why is it important to report an unsafe situation?$tr$, $tr$["It helps keep everyone safe online", "It is no use", "It is embarrassing to do", "It is not needed"]$tr$::jsonb),
('656c9068-ba32-443b-a7ae-382d0f3afc5a', $tr$What is a folder?$tr$, $tr$["A place where files are kept", "A kind of toy", "A kind of scissors", "A kind of book"]$tr$::jsonb),
('672d46eb-b73d-4e7f-95b6-42ff281d34e8', $tr$Why should you not eat near the computer?$tr$, $tr$["So the equipment does not get damaged", "So you get full", "Because it tastes good", "There is no reason"]$tr$::jsonb),
('68172da6-1da1-4d36-bf5e-ebdd85ddebba', $tr$What is a search engine?$tr$, $tr$["A tool used to look for information", "A kind of machine", "A kind of toy", "A kind of computer part"]$tr$::jsonb),
('686dd8f1-730f-4cf0-bddc-e18281a20a54', $tr$Which is an example of a sentence about something you like to do?$tr$, $tr$["I like to read books.", "The car is red.", "It is cold today.", "The bird can fly."]$tr$::jsonb),
('688f25ee-9004-420f-9f85-f19a7285b439', $tr$Typing on the keyboard is what kind of task?$tr$, $tr$["Input", "Output", "Neither", "Both"]$tr$::jsonb),
('68eb0262-12c7-45d3-a5b1-474e089c26ba', $tr$Why is it important to spot safe content?$tr$, $tr$["To stay away from things that are dangerous or not right for kids", "There is no need to spot it", "All content is safe", "It has no use"]$tr$::jsonb),
('68f82e3b-3011-4c4b-a4ec-37b208dd295f', $tr$Why is it important to ask a grown-up first?$tr$, $tr$["To get permission and help using the computer", "We don't need help", "It is always safe even without asking", "The child should decide alone"]$tr$::jsonb),
('6993a523-4422-4ef4-ad12-6be7d4f468f0', $tr$What will happen if you have too much screen-time?$tr$, $tr$["It can hurt your eyes and health", "It is always good", "It does not affect your health", "It makes your eyes stronger"]$tr$::jsonb),
('6a3e5474-e091-492a-b44a-533445be98a5', $tr$What should you do if something unsafe happens online?$tr$, $tr$["Tell a grown-up right away", "Just keep it a secret", "Ignore it", "Tell only a friend"]$tr$::jsonb),
('6a71a1cf-a9d0-46cf-891f-2b778f333e0f', $tr$Which keys do you press to save?$tr$, $tr$["Ctrl+S", "Enter only", "Backspace", "Shift only"]$tr$::jsonb),
('6a831e3c-9e3e-4390-b7a0-9116eeec873c', $tr$What is the mouse used for?$tr$, $tr$["To choose and click things on the screen", "To type words", "To print a document", "To save a file"]$tr$::jsonb),
('6ae6d3cf-ea0b-473d-bc1e-9ab6d48afdd8', $tr$What skill is used to type the sentence?$tr$, $tr$["Word-processing/typing", "Only mouse click", "Only drawing", "Only saving"]$tr$::jsonb),
('6b0590e3-1a64-45ae-a36d-e0e2785b822e', $tr$What is true about safe content online?$tr$, $tr$["Made for kids and approved by an adult", "Has violent pictures", "Asks for personal information", "Not right for your age"]$tr$::jsonb),
('6b708b21-f7dd-4c75-9626-ba458d4aed46', $tr$What is the first step before turning off the computer?$tr$, $tr$["Save your work", "Turn it off right away", "Forget your work", "Pull out the plug"]$tr$::jsonb),
('6bb43788-b908-4aef-a47b-e84817032cef', $tr$What is the FIRST step in making a labeled picture?$tr$, $tr$["Sketch using shapes and pencil", "Type the caption first", "Save the file right away", "Print the picture"]$tr$::jsonb),
('6d61b74d-8d72-45ca-9177-80e12de7de9d', $tr$Why learn to use it the right way while you are young?$tr$, $tr$["To be safe and responsible as you grow up", "You don't need to learn it", "Only for grown-ups", "No effect"]$tr$::jsonb),
('6df48e82-65b9-4f0a-b3ea-e45e894e6eb8', $tr$Why do we need to limit screen-time?$tr$, $tr$["It can hurt your eyes and body", "There is no reason", "Long screen-time is always good", "We don't need to limit it"]$tr$::jsonb),
('6dfb407c-63e7-4902-99b7-dc8b9359e693', $tr$Who should you tell if you see content that is not right for kids?$tr$, $tr$["An adult", "No one", "Only a classmate", "A stranger online"]$tr$::jsonb),
('6e0597b1-79e7-42ce-8eb2-853b8ec1f8e6', $tr$Why do we need to limit screen-time?$tr$, $tr$["Too much can hurt your eyes and body", "There is no reason", "Long screen-time is always good", "We don't need to limit it"]$tr$::jsonb),
('70c1aab4-4715-48fc-87aa-18432bc2129b', $tr$Why limit screen-time?$tr$, $tr$["It can hurt your eyes and body", "There is no reason", "Long screen-time is always good", "No need to limit it"]$tr$::jsonb),
('70e79ead-b4d9-4a94-87ea-ed43a991247c', $tr$What is screen-time?$tr$, $tr$["Time in front of a computer, tablet, phone", "Time for sleeping", "Time for eating", "Time for playing outside"]$tr$::jsonb),
('71a0697e-9de0-47ac-8830-ac7b5e7f71a9', $tr$If you want to go on the Internet, what do you open first?$tr$, $tr$["Browser", "Only a search engine", "A toy", "A book"]$tr$::jsonb),
('71c9e559-cf18-4ebe-afed-03f0bd256a48', $tr$Why choose 'Shut Down' instead of just cutting the power?$tr$, $tr$["It keeps the computer from breaking and your work from being lost", "There is no difference", "Just turn it off right away", "It does not matter how you turn it off"]$tr$::jsonb),
('71e9eb97-2828-43e8-8548-cba915dcd2af', $tr$Which key do you use to make a CAPITAL letter?$tr$, $tr$["Shift key", "Enter key", "Space bar", "Tab key"]$tr$::jsonb),
('7227fe2d-9523-4a8a-8e42-f123366a98da', $tr$Why save your work?$tr$, $tr$["So it is not lost even when the computer is turned off", "To make it colorful", "It is not important", "So it finishes by itself"]$tr$::jsonb),
('725941e7-e8c0-4449-9ee5-7752129c1dc4', $tr$Why is it important to learn to spot safe content while you are young?$tr$, $tr$["To use the Internet wisely and safely as you grow up", "There is no need to learn it", "It is only for grown-ups", "It does not matter later on"]$tr$::jsonb),
('725d9741-7ee9-448b-878b-9cb1db9af17d', $tr$Why is it important to save the file before closing the program?$tr$, $tr$["So your finished work is not lost", "It does not help", "Only to close it faster", "To erase the whole file"]$tr$::jsonb),
('73a7c232-9c24-4675-aaed-1cb284d786a2', $tr$Why is it important to have a grown-up help you when something bad happens online?$tr$, $tr$["They can help fix it safely", "You don't need help", "The child should fix it alone", "Grown-ups are no help"]$tr$::jsonb),
('73afef87-4834-4019-839f-fa7c474029e5', $tr$Why ask a grown-up first?$tr$, $tr$["To get permission and help", "We don't need help", "It is always safe", "The child should decide alone"]$tr$::jsonb),
('73fe76cd-f592-421d-9a7b-850a5eb3962b', $tr$What is a correct step for saving?$tr$, $tr$["Click Save and give it a name", "Just turn off the computer", "Forget about the file", "Close it right away"]$tr$::jsonb),
('742faafb-2c71-45cd-92c7-b2e3b2351b06', $tr$Why should you never share your password with anyone?$tr$, $tr$["Someone could use it to get into your account", "It is safe to share", "You must share it with a friend", "There is no danger"]$tr$::jsonb),
('74720122-7578-46fb-96c6-bcd6c2b8307e', $tr$What is undo?$tr$, $tr$["Taking back the last thing you did", "Writing a new sentence", "Printing the document", "Closing the program"]$tr$::jsonb),
('74d254c7-79b8-4d38-b3ff-cb39d4c839ae', $tr$Which part of the computer shows information?$tr$, $tr$["Monitor", "Keyboard", "CPU", "Mouse"]$tr$::jsonb),
('75ac0ecf-5493-496f-a310-2d8c06804666', $tr$How many steps are there to shut down the right way?$tr$, $tr$["Four", "One", "Ten", "None"]$tr$::jsonb),
('75cab0d5-ece1-4178-8556-3ac927a0f243', $tr$Why not share personal information online?$tr$, $tr$["It can be dangerous", "Always safe", "No danger", "You have to do it"]$tr$::jsonb),
('76164195-f742-40db-8aa0-78ef870c7e6a', $tr$What will happen if you do not put your skills together in a project?$tr$, $tr$["It will be hard to make a complete task", "It has no effect", "It is easier if everything is separate", "The project finishes by itself"]$tr$::jsonb),
('7660655d-b61a-4ebb-96e2-cb2d27734919', $tr$What should you do before using the Internet?$tr$, $tr$["Ask a parent for permission", "Use it alone right away", "Don't ask anymore", "Use it when no grown-up is around"]$tr$::jsonb),
('76d450b1-0395-40f7-8d47-613641267311', $tr$You want to type "I am in Grade 2." What should you do first?$tr$, $tr$["Open the word-processing/typing program", "Turn off the computer right away", "Take away the keyboard", "Stop using the computer"]$tr$::jsonb),
('771e9c66-fb23-47ab-b655-d48766c4708b', $tr$What is true about content that is not right for kids?$tr$, $tr$["Has violent or scary pictures", "Made for kids", "Helps you learn", "Approved by a parent"]$tr$::jsonb),
('776e7e90-93c7-43c8-a06e-f54ad515a3f0', $tr$Why is it important to use undo when you make a mistake while checking your project?$tr$, $tr$["It helps fix mistakes", "It only slows down the work", "It does not help the project", "It only makes work harder"]$tr$::jsonb),
('78547793-e815-4d80-9b2e-7dfb1eb0a5e4', $tr$Why is it important to close all open programs before you shut down?$tr$, $tr$["To avoid problems while the computer shuts down", "There is no need to close them", "Nothing happens if they are still open", "It is faster if you don't close them"]$tr$::jsonb),
('78ddb441-494d-4d67-a8ce-7fee933db58e', $tr$What is a browser?$tr$, $tr$["A program used to go on the Internet", "A kind of game", "A kind of book", "A kind of scissors"]$tr$::jsonb),
('79fe5fdc-6334-492c-af8d-f7d1c9db0d0c', $tr$If you want to find a picture of an animal online, what will you use?$tr$, $tr$["Search engine", "Only a new browser", "A new computer", "Nothing"]$tr$::jsonb),
('7a811abe-f50a-4ca3-aa8c-eebc6ddded79', $tr$What does Ctrl+S do?$tr$, $tr$["Save", "Copy", "Paste", "Delete"]$tr$::jsonb),
('7b296b2d-0f58-407e-a6b5-d70cfefef509', $tr$What do you use to go on the Internet?$tr$, $tr$["Browser", "Only a search engine", "Only a keyboard", "Nothing"]$tr$::jsonb),
('7b394cb8-c4a7-4c36-b490-d8db011c7747', $tr$What will you do when you want to see your old work again?$tr$, $tr$["Open the file", "Turn off the computer", "Erase everything", "Start something new"]$tr$::jsonb),
('7bb88696-b9b2-4600-9768-13fc9fd2b9ff', $tr$What does an input device do?$tr$, $tr$["Sends information to the computer", "Sends information from the computer", "Does nothing", "Makes the computer slow"]$tr$::jsonb),
('7d15a567-e871-416f-b3bd-27650ad0ac8c', $tr$Why should you not share your password?$tr$, $tr$["Someone could use it to get into your account", "It is safe to share", "You must share it with a friend", "There is no danger"]$tr$::jsonb),
('7d223026-e136-4252-8742-5209961f3c67', $tr$You want to use the same title in different parts. Which two skills will you use?$tr$, $tr$["Copy and paste", "Undo and redo", "Save and close", "Print and delete"]$tr$::jsonb),
('7d801453-df78-48d7-94f4-f7d18deb19ab', $tr$Which keys can you press to save?$tr$, $tr$["Ctrl+S", "Enter only", "Backspace", "Shift only"]$tr$::jsonb),
('7e6b4f33-3690-40f5-be3e-4ad3dd3ebce7', $tr$What is paste?$tr$, $tr$["Putting the copied thing in another place", "Removing text", "Saving a file", "Opening a new program"]$tr$::jsonb),
('7f0d8791-bce1-40fb-9738-3ba00feaa953', $tr$Why do we learn this topic?$tr$, $tr$["To stay safe on the Internet", "It is not important", "To get people to share more", "It has no goal"]$tr$::jsonb),
('7fbf5e4c-3d4e-4325-9d7d-08eb1b405f4d', $tr$Why is it important to be polite online?$tr$, $tr$["It shows good online manners", "It does not matter online", "You can be rude online", "It has no effect"]$tr$::jsonb),
('7fc4e181-a330-459f-9702-360072f02088', $tr$Why be polite online?$tr$, $tr$["Good online manners", "Not important", "You can be rude", "No effect"]$tr$::jsonb),
('8094515c-4f84-4bbe-9fa8-449944710a36', $tr$Why is it important to know the different computer icons?$tr$, $tr$["It helps you use the computer with more confidence", "It is not needed", "It does not change how you use it", "Only one icon is important"]$tr$::jsonb),
('8231ad6e-bb49-4966-af2a-30840ebaec33', $tr$What should you do before using the Internet?$tr$, $tr$["Ask a parent or teacher for permission and help", "Use it alone right away", "You don't need to ask", "Use it only when no grown-up is around"]$tr$::jsonb),
('82cc8b4c-7315-4fb9-a7bc-5cdb906432c4', $tr$Why is it important to learn to shut down the right way starting in Grade 3?$tr$, $tr$["It is a basic skill for taking care of things we use", "There is no need to learn it", "It is only for grown-ups", "It has no use in school"]$tr$::jsonb),
('83083e55-7d66-4e5e-b3ca-329e3cc12b5d', $tr$What is true about content that is not right for kids?$tr$, $tr$["Has violent or scary pictures", "Made for kids", "Helps you learn", "Approved by a parent"]$tr$::jsonb),
('83bf3b6b-8036-4d29-a0db-d4f9841cd5ec', $tr$What does checking your project before showing it show?$tr$, $tr$["Hard work and care", "Being careless with your work", "Not caring about the project", "Only not having enough time"]$tr$::jsonb),
('854be2e0-167f-487d-924f-cbebe4ce3076', $tr$What is an example of personal information?$tr$, $tr$["Your full name and home address", "Your favorite color", "Your favorite food", "Your favorite game"]$tr$::jsonb),
('8707cc47-df99-4503-a013-65ba53208b24', $tr$How should you handle the equipment?$tr$, $tr$["Carefully", "Roughly", "With wet hands", "Quickly"]$tr$::jsonb),
('87e48381-7f85-4bef-b0d9-deb796ec5c19', $tr$What is a word-processing or typing program?$tr$, $tr$["A program used to write using the computer", "A kind of game with no words", "A kind of music you listen to", "A kind of picture that is only drawn"]$tr$::jsonb),
('89120cdb-6804-4ef3-ada7-3eda349efc0f', $tr$Why do you need to choose the folder where you keep the file?$tr$, $tr$["So you know where to find it again", "You don't need to choose it", "It is always in just one place", "A folder is not useful"]$tr$::jsonb),
('89610b15-c768-4114-a5f3-72927781eca1', $tr$What is a good example of reporting?$tr$, $tr$["Tell your parent and show them the message", "Keep it all to yourself", "Ignore the problem", "Make the problem bigger"]$tr$::jsonb),
('8971f9dc-fd21-4643-862a-051c1c6c3f8e', $tr$Why is it important to know the browser icons?$tr$, $tr$["It helps you find the right program fast", "It has no use", "There is no need to know it", "Only to decorate the computer"]$tr$::jsonb),
('8a735157-4319-4f8c-8b6e-483a2297c5ec', $tr$What happens when you press undo after a mistake?$tr$, $tr$["It takes back the last thing you did", "It closes the whole program", "It prints the document", "It deletes the whole file"]$tr$::jsonb),
('8b7557ab-65f1-4b3f-9afd-b6cf87f06ccc', $tr$Who should you ask before using a new app?$tr$, $tr$["A parent or teacher", "No one needed", "Only a friend", "A stranger online"]$tr$::jsonb),
('8b9fdb06-c94f-42bf-af63-bea1a7975871', $tr$What should you do if something scary happens online?$tr$, $tr$["Tell a grown-up right away", "Just keep it a secret", "Ignore it", "Tell only a friend"]$tr$::jsonb),
('8c4b2301-ffd0-47e1-b121-4d8f6f187444', $tr$What is a word-processing program like in real life?$tr$, $tr$["Writing on paper, but using a keyboard", "Just a kind of toy", "A kind of kitchen tool", "A kind of clothing"]$tr$::jsonb),
('8cc7890b-46bb-4b3b-a62a-03ccd02f33ec', $tr$What can happen if you believe everything online?$tr$, $tr$["You might believe wrong information", "It is always right", "Nothing happens", "It is always correct by itself"]$tr$::jsonb),
('8d9c33bc-cd03-488c-95fd-3d2918da06e7', $tr$What is saving?$tr$, $tr$["Keeping your work so it is not lost", "Throwing away your work", "Changing the computer", "Clicking the mouse"]$tr$::jsonb),
('8de848d9-dedb-4cc0-bace-cfaefb6c144c', $tr$What is the right thing to do before pulling out the computer's plug?$tr$, $tr$["Make sure the computer is fully off", "Pull it out right away", "Nothing needs checking", "Just pull it out while it is on"]$tr$::jsonb),
('8e35e3d9-ec98-4d70-a6e0-a32a134fda86', $tr$What should you do after saving your work?$tr$, $tr$["Close all open programs", "Pull out the plug right away", "Start the work over", "Forget everything"]$tr$::jsonb),
('8e3b419f-61bf-4e03-b8f4-c06bd883e9dc', $tr$Why do we need a search engine?$tr$, $tr$["To find information fast", "Only to open games", "To make a new Internet", "It has no use"]$tr$::jsonb),
('8ee9dbd0-4a24-4c2c-86a5-5af8463e6537', $tr$Which is another example of an output device?$tr$, $tr$["Printer", "Keyboard", "Mouse", "Webcam"]$tr$::jsonb),
('90075124-9faa-4923-99a9-35a1ecb939ab', $tr$What should you do before giving personal information online?$tr$, $tr$["Ask your parent for permission", "Give it right away", "You don't need to ask for permission", "Share it with everyone you see online"]$tr$::jsonb),
('908a6f29-c919-4eff-85a9-3f46ed823361', $tr$What does Ctrl+C do?$tr$, $tr$["Copy", "Paste", "Save", "Delete"]$tr$::jsonb),
('91c28071-474a-4506-a8ea-dd6ce7d0ad50', $tr$Besides screen-time, what else should you have time for?$tr$, $tr$["Reading, playing outside, sleeping", "Only screen-time", "Nothing else to do", "Only watching TV"]$tr$::jsonb),
('92241c25-abdc-4ddf-983a-efb6a3499e0b', $tr$You see a spelling mistake before printing your project. What should you do?$tr$, $tr$["Fix the spelling first before printing", "Print right away even with the mistake", "Delete the whole project", "Just don't show the project"]$tr$::jsonb),
('927c5236-0356-4930-9d36-b872e44d0628', $tr$Why do we learn this topic?$tr$, $tr$["To know what to stay away from online", "It is not important", "To get kids to watch everything", "It has no goal"]$tr$::jsonb),
('93120bab-049b-4144-9760-d85a4e017c75', $tr$What should you do if you see content that is not right for kids?$tr$, $tr$["Close it right away and tell an adult", "Keep watching", "Share it with a friend", "Ignore it"]$tr$::jsonb),
('942cd1d6-1f8c-40a1-a2d7-9abcdca1828d', $tr$You want to find a picture of an animal. What will you use?$tr$, $tr$["Search engine", "Only a new browser", "A new computer", "Nothing"]$tr$::jsonb),
('94f5db2a-d87a-4f3a-9ad8-577a56ec1a65', $tr$What should you do if someone asks for your personal information?$tr$, $tr$["Don't give it and tell an adult", "Give it right away", "Answer honestly", "Keep chatting"]$tr$::jsonb),
('9590215a-98cc-4861-b300-842ffde8c755', $tr$Why is it important to learn to use the Internet the right way while you are young?$tr$, $tr$["So you will be safe and responsible when using it as you grow up", "You don't need to learn it", "It is only for grown-ups", "It does not change a child's life"]$tr$::jsonb),
('959efc15-38b0-4542-854f-67046ff5f53b', $tr$What is the goal of typing simple sentences about yourself?$tr$, $tr$["To practice writing using the computer", "Only to finish class fast", "It has no goal at all", "Only to erase the letters"]$tr$::jsonb),
('961feffc-297e-41e1-a1b9-ea46cd8686bf', $tr$Why is undo helpful?$tr$, $tr$["It helps fix mistakes", "It only slows down the work", "It has no use in a project", "It only makes work harder"]$tr$::jsonb),
('96e140cd-e394-4ccd-a3c7-aed26ee192ff', $tr$Why is it important to compare information with other sources?$tr$, $tr$["To make sure it is true", "There is no need to do it", "One source is always enough", "It has no use"]$tr$::jsonb),
('974d1e43-5ddb-45ca-8154-73b68b818f6b', $tr$Which is an example of personal information?$tr$, $tr$["Full name and address", "Favorite color", "Favorite food", "Favorite game"]$tr$::jsonb),
('97f2254c-2f1b-4aa2-8b71-ebfc896062ba', $tr$Which of these is an example of using the Internet to learn?$tr$, $tr$["Watching a video about Science", "Playing with no goal", "Sharing personal information", "Chatting with a stranger"]$tr$::jsonb),
('986afc19-596c-43aa-a285-2a295c99409f', $tr$Why is not everything on the Internet good for kids?$tr$, $tr$["Some content is only for grown-ups or is dangerous", "Everything is safe for kids", "There is no dangerous content", "This is not true"]$tr$::jsonb),
('98d23061-712d-43c3-82f4-e0d6ba584ccf', $tr$What is a good example of reporting?$tr$, $tr$["Tell your parent and show them the message", "Keep it to yourself", "Ignore the problem", "Make the problem bigger"]$tr$::jsonb),
('994dd821-e37f-4f95-b3bf-f452f499c531', $tr$Why is it important to shut down the computer the right way?$tr$, $tr$["It keeps the computer from breaking and your work from being lost", "It is not important", "Nothing happens", "Just turn it off right away"]$tr$::jsonb),
('9984f3de-54ee-4546-a78f-a17d13371b93', $tr$What happens if you don't save?$tr$, $tr$["It may be lost when the computer is turned off", "It is always kept", "It saves by itself", "Nothing"]$tr$::jsonb),
('99bfbedf-2673-4df2-82e0-04534aaaa063', $tr$What is the right thing to do if you are not sure a website is safe?$tr$, $tr$["Ask a parent or teacher first", "Open it right away without asking", "Keep going alone", "Share it with a classmate"]$tr$::jsonb),
('9aa905d6-252f-429e-9e43-ab46c03dca0e', $tr$Why choose 'Shut Down' instead of just cutting the power?$tr$, $tr$["To keep the computer from breaking and your work from being lost", "There is no difference", "Just turn it off right away", "It is not important"]$tr$::jsonb),
('9b5c4430-e170-4594-a5c4-bc5012a80181', $tr$Why wait for the computer to fully turn off before pulling out the plug?$tr$, $tr$["To make sure the shutdown is finished", "No need to wait", "Nothing happens", "Just pull it out right away"]$tr$::jsonb),
('9bcc1339-0c0e-4168-8431-26f9863d063d', $tr$Why do kids learn this topic?$tr$, $tr$["To know what to stay away from online", "It is not important", "To get kids to watch everything", "It has no goal"]$tr$::jsonb),
('9d471972-9ae9-4ebe-982c-c820aa96d9c9', $tr$What is the first step before you paste text?$tr$, $tr$["Copy the text first", "Print the whole document right away", "Close the program right away", "Delete the text right away"]$tr$::jsonb),
('9eb77aed-6139-4a89-a351-543b6494789f', $tr$What is screen-time?$tr$, $tr$["Time in front of a computer, tablet, phone", "Time for sleeping", "Time for eating", "Time for playing outside"]$tr$::jsonb),
('9ff073bf-5d6e-466a-9ea5-f0ff350a540b', $tr$What does checking that the file is saved correctly make sure of?$tr$, $tr$["That our work will not be lost", "That the work gets done faster", "That the file has nicer colors", "It does not make sure of anything"]$tr$::jsonb),
('a0ec9aa7-288d-4625-8af0-983081faace0', $tr$Which is an example of a password?$tr$, $tr$["A secret mix of letters and numbers", "Only your full name", "Your favorite animal", "Only your school"]$tr$::jsonb),
('a2d95887-258b-43fb-884c-d1d2b1a39ea7', $tr$What do you use to type words?$tr$, $tr$["Keyboard", "Only the mouse", "Only the screen", "Speaker"]$tr$::jsonb),
('a3de91f3-109f-4789-9f2e-8d3493bf6421', $tr$Why report an unsafe situation?$tr$, $tr$["To keep everyone safe online", "It is no use", "It is embarrassing", "It is not needed"]$tr$::jsonb),
('a3f4d926-27ea-4a6a-923d-fbfa8e106fb2', $tr$How can you check if information online is true?$tr$, $tr$["See if it comes from a well-known website", "Just believe it right away", "Share it with others right away", "Don't check at all"]$tr$::jsonb),
('a4ac006e-2cfd-49f6-9d9d-7845174573ea', $tr$Which is an example of a search engine?$tr$, $tr$["Google", "Chrome", "Windows", "Word"]$tr$::jsonb),
('a4e3edee-dd6f-4586-ab20-f862161b0fbf', $tr$Why have a grown-up help when there is a problem online?$tr$, $tr$["They can help fix it safely", "You don't need help", "The child should fix it alone", "No help"]$tr$::jsonb),
('a66f1abf-6904-40ce-8448-9fd44a018be5', $tr$What can happen if you believe everything you read online?$tr$, $tr$["You might believe wrong information", "What you believe is always right", "Nothing happens", "Everything is always correct by itself"]$tr$::jsonb),
('a6d1c854-b2fa-481f-876b-4795f2236e1b', $tr$What should you do if there is something you don't understand?$tr$, $tr$["Ask the teacher for help", "Just don't do it", "Cry", "Run outside"]$tr$::jsonb),
('a875d487-d692-4060-a6be-b800c936eb84', $tr$What is the right step before turning off the computer?$tr$, $tr$["Shut it down first, then turn off the power", "Pull out the power plug right away", "Just leave it on", "Restart it three times first"]$tr$::jsonb),
('a886fdd0-6407-4112-a61b-47d46005898c', $tr$Why do we learn this topic in Grade 2?$tr$, $tr$["To know what to do in a dangerous situation online", "We don't need to learn it", "To get kids to go online alone", "It has no goal"]$tr$::jsonb),
('a8e89117-b15b-4279-91b7-829664099a09', $tr$What skills are put together in the project?$tr$, $tr$["Mouse skills, typing, drawing, saving", "Only cooking and cleaning", "Singing and dancing", "Fishing and farming"]$tr$::jsonb),
('a98a7184-dd3a-4e99-9e67-834cab03d3c9', $tr$You want to go on the Internet. What do you open first?$tr$, $tr$["Browser", "Only a search engine", "A toy", "A book"]$tr$::jsonb),
('aa54ff5a-6ba0-46e1-863b-3450f70bf518', $tr$Why are computer room rules important?$tr$, $tr$["They keep the equipment and everyone safe", "So we can play more", "They are no use", "So we don't use the computer"]$tr$::jsonb),
('ab86dd08-7be7-4cf5-a55e-5efbc364ce0e', $tr$Why is it important to shut down the computer the right way?$tr$, $tr$["It keeps the computer from breaking and your work from being lost", "It does not matter how you turn it off", "It does nothing to the computer", "Just turn it off right away"]$tr$::jsonb),
('ac0445a3-3e4e-4f07-ad19-b1c23371b549', $tr$Which is an example of a browser?$tr$, $tr$["Chrome", "Google", "Windows", "Facebook"]$tr$::jsonb),
('adb6e3c5-59b8-4280-aad2-75ad8609fcaa', $tr$Why do we learn to know the icons?$tr$, $tr$["To use the computer better", "It is not important", "Only to keep kids busy", "It has no goal"]$tr$::jsonb),
('adf8be9d-dfb3-4e57-aa3c-18d7cb57dc27', $tr$What is the main lesson of the Computer term?$tr$, $tr$["Use the computer and Internet wisely and safely", "Use it alone", "No need to be careful", "There is no danger"]$tr$::jsonb),
('ae5bd72e-b0e2-47d2-bf38-5926ad264b5c', $tr$What is the main lesson about the Internet?$tr$, $tr$["Use it with help and choose the right content", "Use it alone", "No need to be careful", "No danger"]$tr$::jsonb),
('afecec02-0b42-45e9-bfff-74bcf02d9745', $tr$What can happen if the power is suddenly cut?$tr$, $tr$["The computer may break or your work may be lost", "Nothing", "It is always safe", "It turns off faster"]$tr$::jsonb),
('b0012b3f-886d-4110-93bd-a848d9cb8b5d', $tr$What should you do while waiting for your turn on the computer?$tr$, $tr$["Be polite and patient", "Shout and push", "Just walk away", "Sulk"]$tr$::jsonb),
('b020f386-8e37-4efc-8ba3-8abf9011b656', $tr$What is saving?$tr$, $tr$["Keeping your work so it is not lost", "Throwing away your work", "Changing the computer", "Clicking the mouse"]$tr$::jsonb),
('b07efc6e-ae0f-41f3-bbed-9acf52ac44dd', $tr$Why is it important to use copy and paste when you make the last fixes to your project?$tr$, $tr$["So you don't have to type the same thing again", "It only makes the work harder", "It does not help at all", "It is only used for playing"]$tr$::jsonb),
('b0ef64ec-469a-4477-a196-23855ff83768', $tr$Why should you wait for the computer to fully turn off before pulling out the plug?$tr$, $tr$["To make sure the shutdown is all done", "There is no need to wait", "Nothing happens if you pull it out right away", "Just pull it out right away"]$tr$::jsonb),
('b1061f09-76c1-4ed9-83a1-0c348827184d', $tr$Why should you not eat near the computer?$tr$, $tr$["So the equipment does not get damaged", "So you get full", "Because it tastes good", "There is no reason"]$tr$::jsonb),
('b144ee44-4e90-4c04-aea1-6e2d863816a8', $tr$How does the Internet help us talk to others?$tr$, $tr$["We can talk to family who live far away", "It does not help", "It stops us from talking", "It is only for fun"]$tr$::jsonb),
('b180f5ec-bec1-4678-92c5-0ea738a905cd', $tr$Which should you NOT do when using the computer for a long time?$tr$, $tr$["Forget about bedtime", "Take a break", "Ask a grown-up", "Stop when it is time"]$tr$::jsonb),
('b1b30cdf-47cb-4971-b7d4-1926d7edddfb', $tr$You deleted a sentence by accident. What should you do?$tr$, $tr$["Use undo", "Close the program right away", "Start the whole project over", "Save the file right away"]$tr$::jsonb),
('b22d8526-a396-490c-ad65-65e7ecbe8e23', $tr$What is the first step before turning off the computer?$tr$, $tr$["Save all your work", "Turn it off right away", "Forget your work", "Pull out the plug right away"]$tr$::jsonb),
('b3ca4588-3fca-427b-b274-2696edece263', $tr$What should you do before going online?$tr$, $tr$["Ask a parent or teacher", "Go right away", "Don't ask anymore", "Do it when no grown-up is around"]$tr$::jsonb),
('b41413ad-b1c8-4f06-b958-2bdc42c1845c', $tr$What is the first step before showing your finished project to the class?$tr$, $tr$["Check the project using a checklist", "Present right away without checking", "Forget the whole project", "Turn off the computer right away"]$tr$::jsonb),
('b41b3bc4-b490-418d-b006-613e65ee3d37', $tr$What should you do if someone asks for your personal information?$tr$, $tr$["Don't give it, tell an adult", "Give it right away", "Answer honestly", "Keep chatting"]$tr$::jsonb),
('b4920f30-5601-4ce9-840f-c0c3364b39ea', $tr$Why should we be careful when typing our name and information?$tr$, $tr$["So the information we write is right and clear", "Because being right is not important", "So we finish the task faster", "There is no reason at all"]$tr$::jsonb),
('b5023ef3-3e5b-48db-85d0-d2c1f3520141', $tr$What is part of 'good online manners'?$tr$, $tr$["Being polite when talking online", "Being rude to others online", "Sharing all your information", "Staying away from all people"]$tr$::jsonb),
('b553b025-3b64-43ee-a251-d268d71e2ae4', $tr$What should you do before giving personal information online?$tr$, $tr$["Ask your parent for permission", "Give it right away", "No need for permission", "Share it with everyone"]$tr$::jsonb),
('b569e2be-8549-4a76-b336-dac8f860ebe5', $tr$Which option should you choose to turn off the computer the right way?$tr$, $tr$["Shut Down", "Only Restart again and again", "Delete", "Format"]$tr$::jsonb),
('b5e69388-be94-4897-bf4a-46e2a15f3940', $tr$Why is it important to learn to use the mouse the right way?$tr$, $tr$["So it is easier to make projects on the computer", "It is no use", "You don't need to learn it", "It is only for games"]$tr$::jsonb),
('b5f13118-b5fd-49aa-8c68-7590fa6df7dc', $tr$What is the most important lesson about using the Internet?$tr$, $tr$["Always ask a grown-up for help when something bad happens", "You don't need a grown-up's help", "Everything online is always safe", "Reporting is not important"]$tr$::jsonb),
('b639d500-4006-44a4-94c7-eb317d6fde8e', $tr$What is the goal of typing simple sentences about yourself?$tr$, $tr$["To practice writing using the computer", "Only to finish class fast", "It has no goal at all", "Only to erase the letters"]$tr$::jsonb),
('b7183d71-12da-4538-8bbb-28c8f0ce1924', $tr$Why learn this topic in Grade 2?$tr$, $tr$["To know what to do in a dangerous situation", "No need to learn it", "To get kids to go online alone", "No goal"]$tr$::jsonb),
('b7ad291b-1611-4da0-b7d6-c1c9422cd0e2', $tr$Why do we learn these icons in Grade 3?$tr$, $tr$["To use the computer better and faster", "It is not important", "Only to keep kids busy", "It has no goal"]$tr$::jsonb),
('b7f764ab-b7f1-4537-b947-37d56ba24e92', $tr$Why should you not share personal information online?$tr$, $tr$["Someone could use it to do bad things", "It is always safe to do", "You have to do it", "There is no danger"]$tr$::jsonb),
('b9c8a33b-c18a-49d8-a66a-8f90f9b7273c', $tr$What can happen if the power is suddenly cut?$tr$, $tr$["The computer may break or your work may be lost", "Nothing will happen", "It is always safe", "It turns off even faster"]$tr$::jsonb),
('b9ddcec3-adbd-4033-9fc7-5b9697db0af1', $tr$Showing a picture on the monitor is what kind of task?$tr$, $tr$["Output", "Input", "Neither", "Both"]$tr$::jsonb),
('ba5946ad-8350-44f6-878b-ebf2ea5d9e09', $tr$Which is an example of safe content?$tr$, $tr$["A learning game", "A violent picture", "A request for personal information", "Content that is not right for your age"]$tr$::jsonb),
('bbd10e3a-04a4-4ead-afa7-0dec095d2a16', $tr$What should you do before going online?$tr$, $tr$["Ask a parent or teacher first", "Go online right away without permission", "You don't need to ask", "Do it only when no grown-up is around"]$tr$::jsonb),
('bc25b667-9c5a-4d12-be3c-4eb6af2e2664', $tr$What is the Internet?$tr$, $tr$["A network that connects computers all over the world", "A kind of toy", "A kind of book", "A kind of scissors"]$tr$::jsonb),
('bcd23985-b8ad-4f69-bd56-a8833b7cb7b9', $tr$Why learn about the dangers while you are young?$tr$, $tr$["To use technology wisely as you grow up", "No need to learn it", "It is only for grown-ups", "It does not matter"]$tr$::jsonb),
('be1a2d1b-318c-4376-878f-420b126c99bd', $tr$Why is it important to know the common uses of the Internet?$tr$, $tr$["So you can use it the right way and wisely", "There is no need to know it", "To get kids to use it with no adult help", "It has no goal"]$tr$::jsonb),
('be2f1cc7-900d-44e6-9e61-7958b2acaee2', $tr$Who should ask for permission before going online?$tr$, $tr$["The child, from a parent or teacher", "No one needs to ask for permission", "The teacher, from the child", "Nobody"]$tr$::jsonb),
('bf3f77b7-6483-4c63-9782-3daccf12da95', $tr$What is good about having balanced screen-time?$tr$, $tr$["Healthy eyes, body, and life", "Nothing is good about it", "It makes you learn faster", "It only raises your points"]$tr$::jsonb),
('c062c736-9ed9-4498-8b5b-11f69b853f1f', $tr$How can the Internet help with learning?$tr$, $tr$["Watching learning videos", "It has no use for learning", "It stops learning", "It is only used for fun"]$tr$::jsonb),
('c10e1174-fc81-4299-b793-142ef70084eb', $tr$What should you do if someone online asks for your personal information?$tr$, $tr$["Don't give it and tell a grown-up", "Give it right away", "Answer honestly", "Keep talking"]$tr$::jsonb),
('c2987757-1fcf-4a03-b3fd-e849a0a9d059', $tr$Which is an example of a simple sentence about yourself?$tr$, $tr$["I am in Grade 2.", "The sky is blue.", "Dogs like to run.", "It is raining today."]$tr$::jsonb),
('c3689476-26ae-44e1-8182-1d95587e4fdf', $tr$Why are computer room rules important?$tr$, $tr$["They keep the equipment and everyone safe", "So we can play more", "They are no use", "So we don't use the computer"]$tr$::jsonb),
('c3a007f1-53c2-4747-b094-d597913ceee3', $tr$Which of these should you NOT do when using the computer for a long time?$tr$, $tr$["Forget about bedtime", "Take a break now and then", "Ask a grown-up", "Stop when it is time"]$tr$::jsonb),
('c3b5d1c3-b069-453b-a8ac-9e5992eee942', $tr$What is the goal of putting your skills together in a project?$tr$, $tr$["To show the skills you learned in one task", "It has no goal", "Only to use up the time", "To get more screen-time"]$tr$::jsonb),
('c3cda427-079a-44d2-a4e9-ddd6b785e409', $tr$Why should you spot safe content?$tr$, $tr$["To stay away from things that are dangerous or not right for kids", "It is not needed", "Everything is safe", "It has no use"]$tr$::jsonb),
('c411353c-795a-4437-bc9b-6c100b3c7a06', $tr$What should you do if someone asks for your personal information?$tr$, $tr$["Don't give it, tell a grown-up", "Give it right away", "Answer honestly", "Keep talking"]$tr$::jsonb),
('c4955962-9ce5-454c-8a0c-f6937036439f', $tr$What is the main lesson of the whole Computer term?$tr$, $tr$["Use the computer and Internet wisely and safely", "Use it alone any time", "No need to be careful", "There is no danger in using a computer"]$tr$::jsonb),
('c4edc73d-45c9-4c28-aff8-84d03f1ac21f', $tr$Why do kids learn this topic?$tr$, $tr$["To stay safe on the Internet", "It is not important", "To get people to share more", "It has no goal"]$tr$::jsonb),
('c623c9d6-65e5-47b1-9f3e-a5b4780a60b4', $tr$Why do the browser icons look different from each other?$tr$, $tr$["Different companies made each one", "They are all the same", "There is no difference", "Only one company made them all"]$tr$::jsonb),
('c6eaf7e0-d114-4c69-871a-02b4ab90668c', $tr$Why learn this before online safety?$tr$, $tr$["To first understand the Internet before learning to use it the right way", "There is no need to teach it", "It has nothing to do with online safety", "It is only for grown-ups"]$tr$::jsonb),
('c8f80b97-742d-4342-9149-ec843a39ea24', $tr$Why do we learn this topic in Grade 2?$tr$, $tr$["To be safe using the Internet from a young age", "It is not important", "To get kids to share information", "It has no goal"]$tr$::jsonb),
('c93592f7-9855-4b9a-9abe-98c86492909c', $tr$Which is an example of a trusted source?$tr$, $tr$["A school or library website", "Any stranger", "A random comment", "No source is needed"]$tr$::jsonb),
('c9f9ce61-7de0-4967-b0d1-bb46cf0231bc', $tr$Why should you know keyboard shortcuts?$tr$, $tr$["They make computer work faster", "No need to know them", "They have no use", "They are only for grown-ups"]$tr$::jsonb),
('ca124be7-69b0-4031-88ce-23d7165a454b', $tr$What happens when you press undo after a mistake?$tr$, $tr$["It takes back the last thing you did", "It closes the whole program", "It prints the document", "It deletes the whole file"]$tr$::jsonb),
('caa34d14-ac6d-472e-9795-156ec3f0fa12', $tr$Why should you know the uses of the Internet?$tr$, $tr$["To use it the right way and wisely", "No need to know them", "To get kids to use it with no adult help", "It has no goal"]$tr$::jsonb),
('cbb36da7-f6ec-4751-97e7-a0d309615f0b', $tr$What is good about balanced screen-time?$tr$, $tr$["Healthy eyes, body, life", "Nothing is good", "It makes you learn faster", "It raises your points"]$tr$::jsonb),
('cc15397b-5d99-48de-b5a7-99ce99c1898f', $tr$Why should you not eat near the computer?$tr$, $tr$["So the equipment does not get damaged", "So you don't get full", "So eating tastes better", "There is no reason"]$tr$::jsonb),
('cca9338b-4019-45bc-8f8e-f8768506a139', $tr$What will happen if you don't save your work?$tr$, $tr$["Your work might be lost", "It is always kept", "Nothing happens", "It saves by itself"]$tr$::jsonb),
('cdd98acd-b5ae-47b7-abbc-afe31ed8fe03', $tr$Why not use the computer without permission?$tr$, $tr$["To make sure the content is safe", "That is not needed", "It is always safe", "The child should decide alone"]$tr$::jsonb),
('ce3a3b23-34c7-4c54-b207-457f217ce328', $tr$What is another example of personal information?$tr$, $tr$["Phone number", "Favorite color", "Favorite animal", "Favorite game"]$tr$::jsonb),
('ce8cd23b-2cfb-44fc-895f-b3ec5ad71e72', $tr$Why is it dangerous to give your home address to someone you don't know online?$tr$, $tr$["A person with bad plans could use it", "There is no danger", "It is always safe", "Everyone online has good plans"]$tr$::jsonb),
('ceed6c7a-1dd8-4396-863c-9d9a9d3a2240', $tr$What should you do if you are not sure who is asking for your information?$tr$, $tr$["Still don't give it, ask an adult", "Just give it", "Ignore it", "Keep chatting"]$tr$::jsonb),
('cef9e494-0627-45dd-a74a-24c415b02adb', $tr$What is undo?$tr$, $tr$["Taking back the last thing you did", "Writing a new sentence", "Printing the document", "Closing the program"]$tr$::jsonb),
('cf32f2d6-1033-4e69-b804-caad02858242', $tr$What should you do if something unsafe happens online?$tr$, $tr$["Tell a grown-up right away", "Just keep it a secret", "Ignore it", "Tell only a friend"]$tr$::jsonb),
('cf7a0058-612e-4a6e-91a3-fd69211165bc', $tr$What should you do if there is something you don't understand?$tr$, $tr$["Ask the teacher for help", "Just don't do it", "Cry", "Run outside"]$tr$::jsonb),
('cfdb5546-8792-4f07-96fc-4429af7cc0e0', $tr$What should you do before closing the project?$tr$, $tr$["Save your work", "Just forget about it", "Delete it right away", "Close it without saving"]$tr$::jsonb),
('d00c5c6f-270c-4a81-901d-2a2ce2de3fcf', $tr$Why do you need to practice computer skills?$tr$, $tr$["To get better and feel comfortable using it", "You don't need to practice", "You use a skill only once", "It has no benefit"]$tr$::jsonb),
('d0eb445c-9d78-4b0c-b075-7e26c5acffe1', $tr$What happens if you have too much screen-time?$tr$, $tr$["It can hurt your eyes and health", "It is always good", "No effect", "It makes your eyes stronger"]$tr$::jsonb),
('d117d40a-e9af-4d21-8368-f95de243c790', $tr$How many steps were given for shutting down the computer the right way?$tr$, $tr$["Four steps", "Only one step", "Ten steps", "No steps"]$tr$::jsonb),
('d158e09b-04d1-4db5-b7cf-b0997985c405', $tr$How can you check if information online is true?$tr$, $tr$["See if it comes from a well-known website", "Just believe it right away", "Share it right away", "Don't check at all"]$tr$::jsonb),
('d1678dea-edb3-4fc4-867d-e6b41176bf24', $tr$What is one use of the Internet?$tr$, $tr$["Looking up information", "Only watching TV", "Cooking", "Traveling to other countries"]$tr$::jsonb),
('d1bed3e3-d7b3-4f10-81d1-d960ac300720', $tr$What is the main lesson about being safe online?$tr$, $tr$["Keep personal information private and ask a grown-up for help", "Share all your information", "You don't need to be careful", "There is no danger online"]$tr$::jsonb),
('d1ca84ef-1137-46a5-8119-efb44776d698', $tr$How can the Internet help us talk to others?$tr$, $tr$["We can talk to family who live far away", "It does not help us talk to others", "It stops us from talking", "It is only used for fun"]$tr$::jsonb),
('d3388769-1f31-4ded-9d5d-3123c7b1819d', $tr$How can you check if information is true?$tr$, $tr$["See if it comes from a well-known website", "Just believe it", "Share it right away", "Don't check"]$tr$::jsonb),
('d3cfc30e-6ffc-4d7f-b0ed-725dedb43a68', $tr$Why is it important to know keyboard shortcuts?$tr$, $tr$["They make computer work faster", "There is no need to know them", "They have no use", "They are only for grown-ups"]$tr$::jsonb),
('d47f8015-48e1-4866-8b96-821702cc8cd6', $tr$Why learn these skills in Grade 2?$tr$, $tr$["They are basic skills for using the computer safely", "No need to learn them", "Only for grown-ups", "Not useful in school"]$tr$::jsonb),
('d4e9c04f-ac20-46d0-96fc-4387e8fb26fd', $tr$What is a search engine?$tr$, $tr$["A tool to look for information", "A kind of machine", "A kind of toy", "A computer part"]$tr$::jsonb),
('d50459e4-c370-4def-a203-bd4724fb0736', $tr$Who should you tell right away if something unsafe happens online?$tr$, $tr$["A parent or teacher", "No one", "Only a classmate", "A stranger online"]$tr$::jsonb),
('d5d3fc5a-3627-48fd-a2b4-0726fe06dfb7', $tr$What are two ways to get ready for your presentation?$tr$, $tr$["Print it or show it on the computer screen", "Just close the program", "Delete the project", "None, no need to get ready"]$tr$::jsonb),
('d68de395-7ede-4bba-a5f6-dd99916c1dac', $tr$Why is it dangerous to give your home address to a stranger online?$tr$, $tr$["Someone with bad plans could use it", "No danger", "Always safe", "Everyone has good plans"]$tr$::jsonb),
('d748f638-be0e-48b9-b823-010bf591b5ea', $tr$Why do we learn about saving and opening files?$tr$, $tr$["It is a basic computer skill", "We don't need to learn it", "It is only for grown-ups", "It is not useful in school"]$tr$::jsonb),
('d7600614-cb80-45a3-9d44-6ac2d6107980', $tr$Why is not everything on the Internet good for kids?$tr$, $tr$["Some content is only for grown-ups or is dangerous", "Everything is safe for kids", "There is no dangerous content", "This is not true"]$tr$::jsonb),
('d84fb704-ece6-4752-ae23-daf6a4cc7abb', $tr$What are two ways to get ready for your presentation?$tr$, $tr$["Print it or show it on the computer screen", "Just close the program", "Delete the project", "None, no need to get ready"]$tr$::jsonb),
('d9485f20-d2b3-4643-8025-a96b44dadbc7', $tr$Why should you know the browser icons?$tr$, $tr$["To find the right program fast", "They have no use", "No need to know them", "Only for decoration"]$tr$::jsonb),
('da2c77aa-f0c8-4ea5-820d-daa7ae32ad5f', $tr$What can you do with a grown-up to keep a record of the problem?$tr$, $tr$["Take a screenshot", "Delete it right away", "Keep talking", "Reply in a mean way"]$tr$::jsonb),
('dbfef43b-a7f8-4727-aea7-b51e530a8dfc', $tr$What is an important lesson about the Internet for kids?$tr$, $tr$["Use it with a grown-up's help and choose only the right content", "You can use it alone any time", "You don't need to be careful", "There is no danger on the Internet"]$tr$::jsonb),
('dc1e6f11-8192-4270-b1a9-092f3d703249', $tr$Who should be with you when you save?$tr$, $tr$["A grown-up", "No one", "Only a classmate", "A younger brother or sister"]$tr$::jsonb),
('dc3a8dc6-ca50-4eac-a94e-96b6f5af776e', $tr$What should you do before closing the project?$tr$, $tr$["Save your work", "Just forget about it", "Delete it right away", "Close it without saving"]$tr$::jsonb),
('dcfd3ad5-117c-4880-9ffb-c69d4bfc4ba3', $tr$How can you check if information is true?$tr$, $tr$["See if it comes from a well-known website", "Just believe it right away", "Share it right away", "Don't check at all"]$tr$::jsonb),
('dd63fd07-e510-48f9-8985-ae068cfccdf4', $tr$Why is it important to know copy and paste?$tr$, $tr$["It helps you not type the same thing again", "It only makes the whole work harder", "It does not help at all", "It is only used for playing games"]$tr$::jsonb),
('ddce3e6e-0330-4b94-badd-4dc5317db84b', $tr$What does kid-friendly mean?$tr$, $tr$["Content that is right for kids", "Only for grown-ups", "Dangerous content", "Empty"]$tr$::jsonb),
('ded3bb9b-b941-4277-b1e1-8cd56cf81dd4', $tr$What is an example of a trusted source of information?$tr$, $tr$["A school or library website", "Any stranger online", "A random comment", "No source is needed"]$tr$::jsonb),
('e03fd32a-3d84-41fc-a2ea-0c4b3ce93244', $tr$A student finished a project but has not saved it yet. What should the student do first?$tr$, $tr$["Save the file before closing the program", "Close the program right away without saving", "Delete the whole project", "Just not turn in the project"]$tr$::jsonb),
('e0659b25-cb1b-4f05-b67d-a73a84f3c0f4', $tr$Why learn to use the mouse the right way?$tr$, $tr$["It is easier to make projects", "No use", "No need to learn it", "Only for games"]$tr$::jsonb),
('e0778f0f-f3ef-4d5e-bb98-ff127f2eeb3e', $tr$What does 'kid-friendly' mean?$tr$, $tr$["Content that is right for kids and made for them", "Content only for grown-ups", "Content that is dangerous", "Content that is empty"]$tr$::jsonb),
('e0b51564-e414-4370-9873-2e4f946baed4', $tr$What is the first step before turning off the computer?$tr$, $tr$["Save your work", "Turn it off right away", "Forget your work", "Pull out the plug"]$tr$::jsonb),
('e0f8daab-fd5f-41e8-ac60-0eaf714f7b41', $tr$Who should you ask for permission before using a new program?$tr$, $tr$["A parent or teacher", "You don't need to ask anyone", "Only a classmate", "A younger brother or sister"]$tr$::jsonb),
('e1ce2717-6ed2-4b0e-b196-0c9e4427d1f2', $tr$Which is an example of personal information?$tr$, $tr$["Full name and address", "Favorite color", "Favorite food", "Favorite game"]$tr$::jsonb),
('e2e75ce0-853a-4adf-bdf5-82c712518376', $tr$Why close open programs before you shut down?$tr$, $tr$["To avoid problems while shutting down", "It is not needed", "Nothing happens", "It is faster if you don't close them"]$tr$::jsonb),
('e41d4587-b40f-4541-add8-8b0a4142cf3f', $tr$Why is not everything on the Internet true?$tr$, $tr$["Anyone can post information without it being checked", "Everything has been checked", "There is no wrong information", "The Internet is always right"]$tr$::jsonb),
('e46c0bf6-0305-4d1d-826d-04143676aff6', $tr$Which one is an input device?$tr$, $tr$["Keyboard", "Monitor", "Speakers", "Printer"]$tr$::jsonb),
('e496c466-ce55-48af-af34-c392b6d26d1b', $tr$Which is an example of a password?$tr$, $tr$["A secret mix of letters and numbers", "Only your full name", "Your favorite animal", "Only your school"]$tr$::jsonb),
('e4c1cb66-b4ee-4b03-a931-3fa9a35894ab', $tr$Why do kids learn this topic?$tr$, $tr$["To think carefully about information they see online", "It is not important", "To believe everything they read", "It has no goal"]$tr$::jsonb),
('e4c1d8b7-862b-4ea6-9db0-b5fc01df6a8f', $tr$You want to type "I am in Grade 2." What should you do first?$tr$, $tr$["Open the word-processing/typing program", "Turn off the computer right away", "Take away the keyboard", "Stop using the computer"]$tr$::jsonb),
('e51ee5a8-8ded-4d66-a6f9-80115ea351a0', $tr$Which of these is NOT a browser?$tr$, $tr$["Just the Google Search bar (it is not a browser)", "Chrome", "Edge", "Safari"]$tr$::jsonb),
('e543ced4-a738-45a8-9e60-2ceb699c7803', $tr$Besides screen-time, what else should a child have time for?$tr$, $tr$["Reading, playing outside, and sleeping", "Only screen-time all day", "Nothing else to do", "Only watching TV"]$tr$::jsonb),
('e5c120c7-874f-47fe-b36e-27cdf6c33ea5', $tr$Why is not everything on the Internet true?$tr$, $tr$["Anyone can post information without it being checked", "Everything has been checked", "There is no wrong information", "The Internet is always right"]$tr$::jsonb),
('e622a208-d64a-4d6c-a48f-4d954f15f61e', $tr$What can you do with a parent's help?$tr$, $tr$["Watch a learning video", "Sew", "Drive", "Cook"]$tr$::jsonb),
('e69d9fa6-670f-4ebb-aef4-56ffbe1d5f59', $tr$Why learn to shut down the right way from Grade 3?$tr$, $tr$["It is a basic skill for taking care of things we use", "No need to learn it", "It is only for grown-ups", "It has no use"]$tr$::jsonb),
('e6ed6371-8d70-4529-a566-4b8bf281826e', $tr$Why is the Internet called a big network?$tr$, $tr$["It connects many computers in many different places", "It is made of only one computer", "It has no connected computers", "It is cut off from the whole world"]$tr$::jsonb),
('e6f834df-3e51-4de1-a753-4d5541d464db', $tr$What is true about safe content?$tr$, $tr$["Made for kids, approved by an adult", "Has violent pictures", "Asks for personal information", "Not right for your age"]$tr$::jsonb),
('e7b1f851-2150-452f-af46-871ddbdeb88d', $tr$What is the Internet?$tr$, $tr$["A network that connects computers all over the world", "A kind of toy", "A kind of book", "A kind of scissors"]$tr$::jsonb),
('e87c96ad-9c29-45f5-bd8c-5093057f612c', $tr$Why do we learn to shut down safely?$tr$, $tr$["To keep the computer in good shape", "It is not important", "Only to use up time", "It has no goal"]$tr$::jsonb),
('e8a193e4-323d-409a-a179-661f878a1586', $tr$Why compare information with other sources?$tr$, $tr$["To make sure it is true", "No need to do it", "One source is enough", "It has no use"]$tr$::jsonb),
('e92b82b0-4753-4700-a29c-695a1b947ce2', $tr$Why should you not give out personal information?$tr$, $tr$["Someone could use it to do bad things", "It is always safe", "There is no danger", "You have to do it"]$tr$::jsonb),
('e9941f36-408d-4721-8114-2f0d88049f3f', $tr$What is the first step before turning off the computer?$tr$, $tr$["Save your work", "Turn it off right away", "Forget your work", "Pull out the plug"]$tr$::jsonb),
('eaa2fa4b-ca88-424a-b12f-7433538194a8', $tr$What happens if you don't put your skills together?$tr$, $tr$["It will be hard to make a complete task", "No effect", "Easier if separate", "It finishes by itself"]$tr$::jsonb),
('eac5de29-830d-4399-978a-e929739f7ee5', $tr$Showing a picture on the monitor is what kind of task?$tr$, $tr$["Output", "Input", "Neither", "Both"]$tr$::jsonb),
('ebb868bb-a9b3-42a4-83bd-fccc02fdcc54', $tr$Who should you tell right away if something unsafe happens?$tr$, $tr$["A parent or teacher", "No one", "Only a classmate", "A stranger online"]$tr$::jsonb),
('ebca4fc2-5b42-43fa-8670-ca16366e2b4f', $tr$You deleted a sentence by accident. What should you do?$tr$, $tr$["Use undo", "Close the program right away", "Start the whole project over", "Save the file right away"]$tr$::jsonb),
('ec4ec6f5-a1a8-43da-bf44-ae700c6d17e7', $tr$What is the FIRST step in making a labeled picture?$tr$, $tr$["Sketch using shapes and pencil", "Type the caption first", "Save the file right away", "Print the picture"]$tr$::jsonb),
('ec57e30b-b013-4d51-b5a1-67eef0bdedfa', $tr$Why is it important to save the file before closing the program?$tr$, $tr$["So your finished work is not lost", "It does not help", "Only to close it faster", "To erase the whole file"]$tr$::jsonb),
('ed68c752-bf02-4e16-a937-56fbb2d4cddd', $tr$What do you use to type words?$tr$, $tr$["Keyboard", "Only the mouse", "Only the screen", "Speaker"]$tr$::jsonb),
('ed8d39da-2a31-4ec0-8a6f-4f6b196eafb7', $tr$What should you do before using the keyboard?$tr$, $tr$["Clean your hands", "Eat first", "Run", "Drink"]$tr$::jsonb),
('ee975a22-3475-4fbf-9d86-9590f8dd673d', $tr$Who should you tell if you see something not right for kids?$tr$, $tr$["An adult", "No one", "Only a classmate", "A stranger online"]$tr$::jsonb),
('eeb3e012-a747-4ec4-8748-b694b45e708a', $tr$Who should be with you when you save a file?$tr$, $tr$["A grown-up", "No one", "Only a classmate", "A younger brother or sister"]$tr$::jsonb),
('efb44333-e711-4df2-8dc8-b8122ac97482', $tr$Which is an example of a simple sentence about yourself?$tr$, $tr$["I am in Grade 2.", "The sky is blue.", "Dogs like to run.", "It is raining today."]$tr$::jsonb),
('f07624bf-ba31-4929-b2ab-f34427874a7d', $tr$What shape is the Chrome icon?$tr$, $tr$["A circle with four colors", "A black square", "A green triangle", "A yellow star"]$tr$::jsonb),
('f0872218-2596-4f7e-ab01-7cb5141feea9', $tr$What is a browser?$tr$, $tr$["A program used to go on the Internet", "A kind of game", "A kind of book", "A kind of scissors"]$tr$::jsonb),
('f092beb7-5a40-4b56-bb47-8ff9100798c7', $tr$Why not go online without help, even for a project?$tr$, $tr$["To make sure you are safe and use it the right way", "Not needed", "It is always safe", "The child should decide alone"]$tr$::jsonb),
('f0b24251-feac-4dfd-b5c8-d64953b97db1', $tr$Which is an example of personal information?$tr$, $tr$["Your phone number", "Your favorite color", "Your favorite animal", "Your favorite game"]$tr$::jsonb),
('f2de9736-ff9a-4fb9-a8f6-cccd0b115be6', $tr$How is a browser different from a search engine?$tr$, $tr$["A browser is used to go on the Internet, a search engine is used to look things up", "They are just the same", "There is no difference", "A search engine is only for drawing"]$tr$::jsonb),
('f2e9b0b1-b347-4a2d-89cd-b9069aa8a191', $tr$What is one thing we will do to practice with the typing program this week?$tr$, $tr$["Type simple sentences about yourself", "Just play video games on the computer", "Just draw a picture with a pencil", "Just watch videos on TV"]$tr$::jsonb),
('f307e72f-0de1-4046-ab3e-bcfd01065c17', $tr$What will happen if you do not save your work?$tr$, $tr$["It may be lost when the computer is turned off", "It is always kept even if you don't save", "It saves by itself", "Nothing will happen"]$tr$::jsonb),
('f3514cf0-cd30-4987-8218-da4866ec8bd2', $tr$What is the main lesson about being safe online?$tr$, $tr$["Keep information private and ask for help", "Share everything", "No need to be careful", "No danger online"]$tr$::jsonb),
('f3f7cf98-9ab7-4c2c-9034-e30fd4344bfb', $tr$For a 'My Family' project, what should the caption include?$tr$, $tr$["A short description of the family", "Nothing at all, ever", "Only random numbers", "A long separate paragraph"]$tr$::jsonb),
('f406d1f6-d7c5-4b05-ba09-1fd6eb2b735a', $tr$Why did we learn all these Computer topics?$tr$, $tr$["To use technology in a careful and safe way", "They are not important", "To use it with no adult help", "There is no goal"]$tr$::jsonb),
('f5f6ee00-cddc-44fb-abeb-5750fb581cb7', $tr$What is the right thing to do if you forgot who is asking for your information?$tr$, $tr$["Still don't give it and ask an adult", "Just give it", "Ignore the worry", "Keep chatting"]$tr$::jsonb),
('f6179974-13de-4d74-b65f-220f795e6bde', $tr$What is an example of an unsafe situation online?$tr$, $tr$["Someone says bad words or asks for your personal information", "Someone teaches a lesson", "Someone shows a picture of an animal", "Someone plays a learning game"]$tr$::jsonb),
('f6cd5234-3dcf-4b23-b390-db55e585b4fc', $tr$Why is it important to know these skills for a project?$tr$, $tr$["They help you work faster and better", "They do not help the work at all", "They only make the whole project harder", "Only teachers at school use them"]$tr$::jsonb),
('f72cf5f0-3183-4b66-8548-4a31d3cba334', $tr$What is an example of personal information?$tr$, $tr$["Your full name and home address", "Your favorite color", "Your favorite food", "Your favorite game"]$tr$::jsonb),
('f880f35e-b8fb-4016-95dd-b126724e16f4', $tr$Why is it important to learn to type simple sentences about yourself?$tr$, $tr$["It helps you feel comfortable using the computer", "It does not help a child learn at all", "It is only done to get a good grade", "It only confuses a new learner"]$tr$::jsonb),
('f8cb6a89-3559-4553-9b73-da4cca3cc40e', $tr$Why should you not give personal information to a website?$tr$, $tr$["Someone could use it to do bad things", "It is always safe to do", "There is no danger", "You have to do it"]$tr$::jsonb),
('f8d37e59-57b3-48af-b9a8-edaf29db9075', $tr$What can you use to keep a record of the message?$tr$, $tr$["A screenshot", "Breaking the computer", "Throwing away the computer", "Nothing"]$tr$::jsonb),
('f90fc041-0bc8-4c00-8978-485f3d031b8c', $tr$What is one thing we will do to practice with the typing program this week?$tr$, $tr$["Type simple sentences about yourself", "Just play video games on the computer", "Just draw a picture with a pencil", "Just watch videos on TV"]$tr$::jsonb),
('f9805252-b4e1-414f-8c14-b3dc2614e11b', $tr$What does Ctrl+C do?$tr$, $tr$["Copy", "Paste", "Save", "Delete"]$tr$::jsonb),
('fa54e979-211b-423c-97fa-91cfe0cecd16', $tr$What is an example of personal information?$tr$, $tr$["Full name and address", "Favorite color", "Favorite food", "Favorite game"]$tr$::jsonb),
('fa692465-7ebe-415c-84f0-4e9f7df29207', $tr$How should you hold the mouse?$tr$, $tr$["Gently", "Roughly", "With wet hands", "Quickly"]$tr$::jsonb),
('fc5dbc47-0e9e-42db-8954-aacb8e690486', $tr$Which one is NOT right for kids?$tr$, $tr$["A scary or violent picture", "A learning video", "A math game", "A kids' story"]$tr$::jsonb),
('fcdb90fc-fdf0-4071-90fe-b9c33ed35048', $tr$What is good about printing your finished project?$tr$, $tr$["You will have a copy on paper", "All the data will be lost", "It can no longer be read", "The computer will become slower"]$tr$::jsonb),
('fdf9c14e-e240-47e4-8397-d958218e0862', $tr$What does Ctrl+V do?$tr$, $tr$["Paste", "Copy", "Save", "Delete"]$tr$::jsonb),
('fe3faea4-3858-4ca8-a11d-6c28b53469d9', $tr$What should you do before showing your project on the computer?$tr$, $tr$["Check it using copy, paste, and undo", "Show it right away without checking", "Delete the whole project", "Close the program right away"]$tr$::jsonb),
('fead93cb-d395-41eb-9816-5cee718eeab5', $tr$What is an example of something you can do on the Internet with a parent's help?$tr$, $tr$["Watch a learning video for kids", "Sew clothes", "Drive a car", "Cook a meal"]$tr$::jsonb),
('ffb03a2e-9277-4ade-8569-ed6233bcef44', $tr$What is the main use of the keyboard?$tr$, $tr$["To type words and numbers", "To click pictures", "To show files", "To print a document"]$tr$::jsonb),
('ffdac9d6-83a8-4597-9f98-adf44eba9eb2', $tr$Why choose the folder where you keep the file?$tr$, $tr$["So you know where to find it again", "You don't need to choose", "It is always the same place", "It is not useful"]$tr$::jsonb);

insert into _cmp_boss values
('008989df-5592-4839-b33a-c4412fc3458a', $tr$Who should you ask for permission before using a new program online?$tr$, $tr$["A parent or teacher", "You don't need to ask anyone", "Only a classmate", "A younger brother or sister"]$tr$::jsonb, $tr$Screen Time and Asking Adults$tr$),
('01412335-4c26-43e4-98c8-f1913dc2e4b8', $tr$Why close open programs before you shut down?$tr$, $tr$["To avoid problems when shutting down", "It is not needed", "It does nothing", "It is faster if you don't close them"]$tr$::jsonb, $tr$Safely Closing Programs and the Computer$tr$),
('02538839-fc61-4487-ad6c-f6ab47c80b3f', $tr$Why is it important to learn to type a simple sentence about yourself?$tr$, $tr$["It helps you feel comfortable using the computer", "It has no use at all for a child's learning", "You only do it to get a good grade", "It only confuses a new learner"]$tr$::jsonb, $tr$Word Processing and Typing Simple Sentences$tr$),
('02d4c467-b504-4f13-9d54-b26773240f5d', $tr$Why should you not answer a scary message?$tr$, $tr$["It can make things worse", "It is always safe to answer", "It has no danger", "You have to do it"]$tr$::jsonb, $tr$Spotting and Reporting Unsafe Situations$tr$),
('04b00d26-cf7f-49a4-be03-3f8e05e9ba70', $tr$What is another example of personal information?$tr$, $tr$["Phone number", "Favorite color", "Favorite animal", "Favorite game"]$tr$::jsonb, $tr$Don't Share Personal Information$tr$),
('04f28e5f-7939-4459-8a0c-badf9ed9488c', $tr$What does opening a file mean?$tr$, $tr$["Finding and clicking on your saved work", "Throwing away the file", "Changing its name", "Turning off the computer"]$tr$::jsonb, $tr$Saving and Opening Files$tr$),
('07b93554-1bc0-4c34-8838-05a910205eff', $tr$Why do we need a search engine?$tr$, $tr$["To find information fast", "Only to open games", "To make a new Internet", "It has no use"]$tr$::jsonb, $tr$What We Use the Internet For$tr$),
('0818517c-0377-49ae-a749-0773514e73ad', $tr$Why should you not share personal information online?$tr$, $tr$["It can be dangerous", "It is always safe to do", "It has no danger", "You have to do it"]$tr$::jsonb, $tr$Keeping Personal Information Private$tr$),
('0933fe3c-a83e-48b6-9a45-d306d28d3b7a', $tr$What does Ctrl+V do?$tr$, $tr$["Paste", "Copy", "Save", "Delete"]$tr$::jsonb, $tr$Not Everything on the Internet Is True$tr$),
('0d57ad7a-255a-414d-86be-c46fa57c5d92', $tr$Why should you ask an adult first?$tr$, $tr$["To get permission and help", "You don't need help", "It is always safe", "The child should just decide alone"]$tr$::jsonb, $tr$Screen Time and Asking Adults$tr$),
('0de73a51-eeb8-4a69-8967-d9695ac09086', $tr$What skills were put together in the project?$tr$, $tr$["Mouse skills, typing, drawing, saving", "Cooking and cleaning", "Singing and dancing", "Fishing and farming"]$tr$::jsonb, $tr$Putting Skills Together in a Project$tr$),
('0e6c6dca-7186-4313-ba7f-e51cad5a13be', $tr$What do you use to go on the Internet?$tr$, $tr$["Browser", "Only a search engine", "Only a keyboard", "Nothing"]$tr$::jsonb, $tr$Know the Browser and Search Engine Icons$tr$),
('0eddc87a-0ef1-427b-b4be-f2c5f0cc33b9', $tr$Who should you tell right away if something unsafe happens?$tr$, $tr$["A parent or teacher", "No one", "Only a classmate", "A stranger online"]$tr$::jsonb, $tr$Spotting and Reporting Unsafe Situations$tr$),
('0efbbc32-2bd6-4fa5-b3fd-9d6ef09e3303', $tr$What can happen if the power is cut off suddenly?$tr$, $tr$["Your work may get damaged or lost", "Nothing", "It is always safe", "It shuts down faster"]$tr$::jsonb, $tr$Safely Closing Programs and the Computer$tr$),
('0f452ca8-6df2-4714-99e6-5d8b0459cabd', $tr$What should you do before closing the project?$tr$, $tr$["Save your work", "Just forget about it", "Delete it right away", "Close it without saving"]$tr$::jsonb, $tr$Putting Skills Together in a Project$tr$),
('0f4622ef-71c2-4e63-9ccf-470493cc5061', $tr$What is the big lesson about staying safe online?$tr$, $tr$["Keep your information private and ask for help", "Share everything", "You don't need to be careful", "There is no danger online"]$tr$::jsonb, $tr$Keeping Personal Information Private$tr$),
('0f5acf9b-e022-4a4f-a268-26061c019c22', $tr$What is an example of personal information?$tr$, $tr$["Full name and home address", "Favorite color", "Favorite food", "Favorite game"]$tr$::jsonb, $tr$Don't Share Personal Information$tr$),
('1072ca13-dc6a-47a0-9823-5dfc2064489e', $tr$What should you do if you see content that is not okay for kids?$tr$, $tr$["Close it right away and tell an adult", "Keep watching", "Share it with a friend", "Ignore it"]$tr$::jsonb, $tr$Safe Content vs. Unsuitable Content$tr$),
('109ccd98-c815-4d85-83ae-537cee9fee97', $tr$Why is it important to use undo when you make a mistake while checking your project?$tr$, $tr$["It helps you fix mistakes", "It only slows down the work", "It is useless for the project", "It only makes the work harder"]$tr$::jsonb, $tr$Checking and Showing Your Project$tr$),
('11cdeb39-6b7f-4659-bf51-8fc515762510', $tr$Why should you not give out personal information?$tr$, $tr$["Someone with bad plans could use it", "It is always safe", "There is no danger", "You have to do it"]$tr$::jsonb, $tr$Safe Content vs. Unsuitable Content$tr$),
('121ea1df-1993-4625-b2a1-6f6c352bcc1a', $tr$What keys can you press to save?$tr$, $tr$["Ctrl+S", "Only Enter", "Backspace", "Only Shift"]$tr$::jsonb, $tr$Saving and Opening Files$tr$),
('121f6b17-dae8-44dd-8781-6a2635cac6a9', $tr$What keys do you press to save?$tr$, $tr$["Ctrl+S", "Only Enter", "Backspace", "Only Shift"]$tr$::jsonb, $tr$Saving and Opening Files$tr$),
('12d1948f-c351-4d46-b987-72e05581a044', $tr$What is important to think about while typing, not just speed?$tr$, $tr$["Accuracy (typing it right)", "Only the screen color", "Only the monitor size", "Only the keyboard sound"]$tr$::jsonb, $tr$Word Processing and Typing Simple Sentences$tr$),
('1528eb08-0adc-45fa-a192-cbbd55a863f6', $tr$Why is it dangerous to give your home address to someone you don't know online?$tr$, $tr$["A person with bad plans could use it", "There is no danger in it", "It is always safe", "Everyone online has good plans"]$tr$::jsonb, $tr$Keeping Personal Information Private$tr$),
('15e44755-ef1d-47be-9c8c-b0f9de830110', $tr$You want to go on the Internet. What do you open first?$tr$, $tr$["Browser", "Only a search engine", "A toy", "A book"]$tr$::jsonb, $tr$Know the Browser and Search Engine Icons$tr$),
('16780e6f-2cd2-4c2a-bde1-7ede3b295e8b', $tr$Why should you not go online without help, even for a project?$tr$, $tr$["To make sure you stay safe and use it the right way", "That is not needed", "It is always safe", "The child should just decide alone"]$tr$::jsonb, $tr$Putting Skills Together in a Project$tr$),
('16d958bb-bb08-452b-a447-2f159fd61308', $tr$Which one is an example of a password?$tr$, $tr$["A secret mix of letters and numbers", "Only your full name", "Your favorite animal", "Only your school"]$tr$::jsonb, $tr$Don't Share Personal Information$tr$),
('16db17dd-562d-4ded-a10a-43426445e05c', $tr$If you want to find a picture of an animal online, what will you use?$tr$, $tr$["Search engine", "Only a new browser", "A new computer", "Nothing"]$tr$::jsonb, $tr$Know the Browser and Search Engine Icons$tr$),
('1705e7fc-4c42-4817-8be5-0dcbfa6a8775', $tr$Why should we limit screen time?$tr$, $tr$["It can hurt your eyes and body", "There is no reason", "Long screen time is always good", "It doesn't need a limit"]$tr$::jsonb, $tr$Screen Time and Asking Adults$tr$),
('173ee59c-74bb-44a5-ba7c-01523270bb8f', $tr$What skill do you use to type the sentence?$tr$, $tr$["Word-processing/typing", "Only mouse clicks", "Only drawing", "Only saving"]$tr$::jsonb, $tr$Putting Skills Together in a Project$tr$),
('1a7a430e-6a3b-4151-af33-bb9469d2b28e', $tr$Why is it important to tell an adult about a problem online?$tr$, $tr$["They can help fix it safely", "You don't need to tell anyone", "The child should fix it alone", "Telling does not help"]$tr$::jsonb, $tr$Keeping Personal Information Private$tr$),
('1b3705c5-899b-454c-b691-b463d38e32e3', $tr$Why is it dangerous to give your home address to a stranger online?$tr$, $tr$["Someone with bad plans could use it", "There is no danger", "It is always safe", "Everyone has good plans"]$tr$::jsonb, $tr$Keeping Personal Information Private$tr$),
('1bfbefe2-3a0a-493c-8f17-a588289b9432', $tr$What is good about balanced screen time?$tr$, $tr$["Healthy eyes, body, and life", "Nothing is good about it", "It makes you learn faster", "It gives you higher scores"]$tr$::jsonb, $tr$Screen Time and Asking Adults$tr$),
('1d6d63b0-2cfe-45ec-8ba3-bdb254898964', $tr$Why is it important to learn to spot safe content while you are young?$tr$, $tr$["So you grow up using the Internet safely and responsibly", "You don't need to learn it", "It is only for grown-ups", "It does not matter later"]$tr$::jsonb, $tr$Safe Content vs. Unsuitable Content$tr$),
('1df08c42-dc06-45d8-a017-a4fcc51952bb', $tr$What is the first step before showing your finished project to the class?$tr$, $tr$["Check the project with a checklist", "Show it right away without checking", "Forget the whole project", "Turn off the computer right away"]$tr$::jsonb, $tr$Checking and Showing Your Project$tr$),
('1e916cd8-0c1a-4b5d-b113-2547a15e2a02', $tr$Another example of personal information?$tr$, $tr$["Phone number", "Favorite color", "Favorite animal", "Favorite game"]$tr$::jsonb, $tr$Don't Share Personal Information$tr$),
('1f194911-6e9e-41c7-a63c-05cfc9c68927', $tr$Why should you know what safe content is?$tr$, $tr$["To stay away from dangerous or unsuitable things", "It is not needed", "Everything is safe", "It has no use"]$tr$::jsonb, $tr$Safe Content vs. Unsuitable Content$tr$),
('1f3c978d-4666-48a9-829c-368b7759d23e', $tr$Why do Grade 3 kids learn to know these icons?$tr$, $tr$["To use the computer better and faster", "It is not important", "Only to keep kids busy", "It has no purpose"]$tr$::jsonb, $tr$Know the Browser and Search Engine Icons$tr$),
('1fb97989-9066-4ead-8f8e-9fab84a8b627', $tr$Why should you wait for the computer to turn off fully before you unplug it?$tr$, $tr$["To make sure the shutdown is complete", "You don't need to wait", "Nothing happens if you unplug it right away", "Just unplug it right away"]$tr$::jsonb, $tr$Safely Closing Programs and the Computer$tr$),
('1fc38732-878f-4c30-8ac0-663872b037a2', $tr$Why learn to spot safe content early?$tr$, $tr$["To be responsible online when you grow up", "You don't need to learn it", "It is only for grown-ups", "It does not matter"]$tr$::jsonb, $tr$Safe Content vs. Unsuitable Content$tr$),
('1fca3c78-32a4-4949-82e2-9e082b65042f', $tr$What happens if you don't save your work?$tr$, $tr$["Your work may be lost", "It is always kept", "Nothing happens", "It saves by itself"]$tr$::jsonb, $tr$Safely Closing Programs and the Computer$tr$),
('1fd0f19e-7c63-48cc-9f6c-6fc935044307', $tr$Why did we learn to save and open files?$tr$, $tr$["It is a basic computer skill", "You don't need to learn it", "It is only for adults", "It is no use at school"]$tr$::jsonb, $tr$Saving and Opening Files$tr$),
('201ab7bd-9a89-46b3-b8e8-4b3683f419b6', $tr$What is a word-processing or typing program?$tr$, $tr$["A program we use to write on the computer", "A kind of game with no words", "A kind of music you listen to", "A kind of picture that is only drawn"]$tr$::jsonb, $tr$Word Processing and Typing Simple Sentences$tr$),
('2058afe1-d9ae-4a06-bf31-3665540a9cd4', $tr$Why do we learn this topic?$tr$, $tr$["To know what to stay away from online", "It is not important", "To get kids to watch everything", "It has no purpose"]$tr$::jsonb, $tr$Safe Content vs. Unsuitable Content$tr$),
('20833f2c-3e5c-4fd9-97b0-70b2d0df52d0', $tr$What shape is the Chrome icon?$tr$, $tr$["A circle with four colors", "A black square", "A green triangle", "A yellow star"]$tr$::jsonb, $tr$Know the Browser and Search Engine Icons$tr$),
('20d0cc4a-7f3a-434e-a382-eebe2670bd86', $tr$Why is it important to know the common uses of the Internet?$tr$, $tr$["So you can use it the right and responsible way", "You don't need to know it", "To get kids to use it without help", "It has no purpose"]$tr$::jsonb, $tr$What We Use the Internet For$tr$),
('214cdd26-3c9f-4948-bb57-40575cea3452', $tr$Which of these is NOT okay for kids to see?$tr$, $tr$["A scary or violent picture", "A learning video", "A math game", "A kids' story"]$tr$::jsonb, $tr$Safe Content vs. Unsuitable Content$tr$),
('21568866-346b-40c6-9325-4815ea2d4214', $tr$Why should we be careful when typing our name and information?$tr$, $tr$["So the information we write is right and clear", "Because being right does not matter", "So we can finish the work faster", "There is really no reason"]$tr$::jsonb, $tr$Word Processing and Typing Simple Sentences$tr$),
('21f02efc-f5bf-4a0b-b3c6-88422aaea617', $tr$What should you do before using the Internet?$tr$, $tr$["Ask a parent or teacher for permission and help", "Use it alone right away", "You don't need to ask", "Only do it when no adult is around"]$tr$::jsonb, $tr$What Is the Internet?$tr$),
('2333170e-bdce-47b9-9806-f8956f1f5cb0', $tr$Why should we learn to use it the right way while we are young?$tr$, $tr$["To be safe and responsible when we grow up", "You don't need to learn it", "It is only for adults", "It makes no difference"]$tr$::jsonb, $tr$What Is the Internet?$tr$),
('26d34f65-c65a-4b24-a91c-d4e686e129ea', $tr$If you want to go on the Internet, what do you open first?$tr$, $tr$["Browser", "Only a search engine", "A toy", "A book"]$tr$::jsonb, $tr$Know the Browser and Search Engine Icons$tr$),
('26fceae1-f5d4-4418-bd7e-650682d2af88', $tr$Why do kids learn this topic?$tr$, $tr$["To think carefully about what they read online", "It is not important", "To believe everything", "It has no purpose"]$tr$::jsonb, $tr$Not Everything on the Internet Is True$tr$),
('27276b87-3444-4d05-904d-55c5c8575636', $tr$What should you do before closing the project?$tr$, $tr$["Save your work", "Just forget about it", "Delete it right away", "Close it without saving"]$tr$::jsonb, $tr$Putting Skills Together in a Project$tr$),
('28159349-f3d9-42a5-aff0-cb4199908c21', $tr$Example of a password?$tr$, $tr$["A secret mix of letters and numbers", "Only your full name", "Favorite animal", "Only your school"]$tr$::jsonb, $tr$Don't Share Personal Information$tr$),
('28294d96-2e04-4b8b-8da3-b5e5b43a67dd', $tr$What do you use to look for information online?$tr$, $tr$["Search engine", "Only a browser", "Only a keyboard", "Only a mouse"]$tr$::jsonb, $tr$Know the Browser and Search Engine Icons$tr$),
('283f326f-cf10-4b8a-820d-95cba731d8d6', $tr$Why is not everything on the Internet right for kids?$tr$, $tr$["Some things are only for adults or are dangerous", "Everything is safe for kids", "Nothing on it is dangerous", "This is not true"]$tr$::jsonb, $tr$What Is the Internet?$tr$),
('295796c6-9eef-42bf-bc34-08cbf10449ef', $tr$What should you do if you are not sure the information is true?$tr$, $tr$["Ask a parent or teacher", "Believe it right away", "Share it right away", "Just ignore it"]$tr$::jsonb, $tr$Not Everything on the Internet Is True$tr$),
('2bab58bc-beef-44c6-9f25-d8815d79bc72', $tr$What is one example of what we will do to practice with the typing program this week?$tr$, $tr$["Typing a simple sentence about yourself", "Only playing a video game on the computer", "Only drawing a picture with a pencil", "Only watching a video on TV"]$tr$::jsonb, $tr$Word Processing and Typing Simple Sentences$tr$),
('2c37af1e-0160-4f71-857a-0043a91271a2', $tr$What is the first step before you paste text?$tr$, $tr$["Copy the text first", "Print the whole document right away", "Close the program right away", "Delete the text right away"]$tr$::jsonb, $tr$Extra Skills: Copy, Paste, and Undo$tr$),
('2cdeda1d-8f7a-4799-ad0c-af238880f3d0', $tr$Why is it important to report an unsafe situation?$tr$, $tr$["It helps keep everyone safe online", "It has no use", "It is embarrassing to do", "It is not needed"]$tr$::jsonb, $tr$Spotting and Reporting Unsafe Situations$tr$),
('2dcd9507-df74-46d0-b8de-95d13589d33b', $tr$What is the most important lesson about the Internet?$tr$, $tr$["Ask an adult for help when something is not right", "You don't need help", "Everything online is safe", "Reporting is not important"]$tr$::jsonb, $tr$Spotting and Reporting Unsafe Situations$tr$),
('2e047a7d-668b-4b9c-9f33-de4d18a77b4e', $tr$What should you do before showing your project on the computer?$tr$, $tr$["Check it using copy, paste, and undo", "Show it right away without checking", "Delete the whole project", "Close the program right away"]$tr$::jsonb, $tr$Checking and Showing Your Project$tr$),
('2ed411b2-913c-4c51-8396-11a882690a5c', $tr$What is the right thing to do before you unplug the computer?$tr$, $tr$["Make sure the computer is fully off", "Unplug it right away", "You don't need to check anything", "Just unplug it while it is on"]$tr$::jsonb, $tr$Safely Closing Programs and the Computer$tr$),
('2fa51a2e-cb08-4647-977d-d29d9d61c990', $tr$Why is it important to know keyboard shortcuts?$tr$, $tr$["They help you do computer work faster", "You don't need to know them", "They have no use", "They are only for grown-ups"]$tr$::jsonb, $tr$Not Everything on the Internet Is True$tr$),
('3039961e-7d72-4f1d-b88d-e6e2603856d7', $tr$Why should an adult approve the content first?$tr$, $tr$["To make sure it is suitable and safe", "It is not needed", "The kid should choose", "It has no use"]$tr$::jsonb, $tr$Safe Content vs. Unsuitable Content$tr$),
('30fd125f-59df-445e-b789-ce5449e6ee23', $tr$How can the Internet help you learn?$tr$, $tr$["Watching learning videos", "It does not help with learning", "It stops you from learning", "It is only for fun"]$tr$::jsonb, $tr$What We Use the Internet For$tr$),
('32721b1d-74bd-4a75-9ed6-b11bd59bfde6', $tr$What can you do with an adult to keep a record of the problem?$tr$, $tr$["Take a screenshot", "Delete it right away", "Keep chatting", "Answer in a mean way"]$tr$::jsonb, $tr$Spotting and Reporting Unsafe Situations$tr$),
('33cd1d4b-dc96-4ff6-8712-3f6d5f279474', $tr$Example of safe content?$tr$, $tr$["A learning game", "A violent picture", "A request for personal information", "Content that is not okay for kids"]$tr$::jsonb, $tr$Safe Content vs. Unsuitable Content$tr$),
('345a2f9d-4691-462c-919d-3db486b2c8f6', $tr$Example of a search engine?$tr$, $tr$["Google", "Chrome", "Windows", "Word"]$tr$::jsonb, $tr$What We Use the Internet For$tr$),
('349a06a7-c267-4ad3-a740-d5b6db05bb4b', $tr$Why do we learn this topic before online safety?$tr$, $tr$["To first understand what the Internet is before learning to use it the right way", "You don't need to learn it", "It has nothing to do with online safety", "It is only for grown-ups"]$tr$::jsonb, $tr$What We Use the Internet For$tr$),
('355c78be-4baf-412e-bb2f-d2829c03701e', $tr$What is an example of something you can do with a parent's help?$tr$, $tr$["Watch a learning video", "Sew", "Drive", "Cook"]$tr$::jsonb, $tr$What Is the Internet?$tr$),
('357aa189-1584-4de7-b0c3-a26f62056685', $tr$What is undo?$tr$, $tr$["Taking back the last thing you did", "Writing a new sentence", "Printing the document", "Closing the program"]$tr$::jsonb, $tr$Extra Skills: Copy, Paste, and Undo$tr$),
('372e7f37-d660-464d-b9b9-5b1acf2bfaf5', $tr$Why is it dangerous to give your home address to a stranger online?$tr$, $tr$["A person with bad plans could use it", "There is no danger", "It is always safe", "Everyone has good plans"]$tr$::jsonb, $tr$Don't Share Personal Information$tr$),
('3748dd38-67ba-4038-981c-f5ced10c66cc', $tr$What is good about printing your finished project?$tr$, $tr$["You will have a copy on paper", "All the data will be lost", "It can't be read anymore", "The computer will get slower"]$tr$::jsonb, $tr$Extra Skills: Copy, Paste, and Undo$tr$),
('374fa6ec-d5ce-4779-be24-2a8187a3c641', $tr$Why do we need to practice computer skills?$tr$, $tr$["To get better and feel comfortable using it", "You don't need to practice", "You only use a skill once", "It has no benefit"]$tr$::jsonb, $tr$Putting Skills Together in a Project$tr$),
('37a7e174-1cc5-4422-a052-218b6605d155', $tr$What ICT skills did we learn this whole term?$tr$, $tr$["Saving, typing, online safety", "Cooking food", "Sewing clothes", "Farming"]$tr$::jsonb, $tr$Putting Skills Together in a Project$tr$),
('386ed4c1-c649-444f-a405-4c02385a834a', $tr$What does saving mean?$tr$, $tr$["Keeping your work so it does not get lost", "Throwing away your work", "Changing the computer", "Pressing the mouse"]$tr$::jsonb, $tr$Saving and Opening Files$tr$),
('3878f663-a687-407e-b52c-a71772edde7e', $tr$Why is it important for an adult to approve the content first?$tr$, $tr$["To make sure it is suitable and safe for kids", "Approval is not needed", "The kid should just choose", "Approval has no use"]$tr$::jsonb, $tr$Safe Content vs. Unsuitable Content$tr$),
('38d4ad23-e9a2-4d12-b7e1-69dd5355a270', $tr$What is an example of personal information?$tr$, $tr$["Your full name and home address", "Your favorite color", "Your favorite food", "Your favorite game"]$tr$::jsonb, $tr$Review: The Whole Computer Term$tr$),
('393047c2-0d01-4a9a-a0b9-7a18ced0ede8', $tr$Why do kids learn how to shut down safely?$tr$, $tr$["To keep the computer in good shape", "It is not important", "Only to use up time", "It has no purpose"]$tr$::jsonb, $tr$Safely Closing Programs and the Computer$tr$),
('3c58255c-cd19-4152-9b33-1935c6cd3b6c', $tr$What should you do if you are not sure a website is safe?$tr$, $tr$["Ask a parent or teacher", "Open it right away", "Keep going on your own", "Share it with a classmate"]$tr$::jsonb, $tr$Safe Content vs. Unsuitable Content$tr$),
('3ccf52fd-e779-483e-81fa-aa4b82cd0f83', $tr$How can you check if information online is true?$tr$, $tr$["See if it comes from a well-known website", "Just believe it right away", "Share it right away", "Don't check it at all"]$tr$::jsonb, $tr$Review: The Whole Computer Term$tr$),
('3fc0fdf0-520e-4b06-b459-12e41899d84c', $tr$Why should you get to know different icons?$tr$, $tr$["To use the computer with more confidence", "It is not needed", "It does nothing", "Only one icon matters"]$tr$::jsonb, $tr$Know the Browser and Search Engine Icons$tr$),
('42cb06d6-5b07-4b51-a0bc-b8d3ea755431', $tr$Why is it important to have an adult helper when something bad happens online?$tr$, $tr$["They can help fix it safely", "You don't need help", "The child should fix it alone", "Adults are no help"]$tr$::jsonb, $tr$Spotting and Reporting Unsafe Situations$tr$),
('42ff4cf3-473c-4675-9ce4-8e82b386bb3c', $tr$Why do we learn to save and open files in Grade 2?$tr$, $tr$["It is a basic skill for using the computer", "You don't need to learn it", "It is only for adults", "It is no use at school"]$tr$::jsonb, $tr$Saving and Opening Files$tr$),
('437c32b0-14a6-4436-83ea-14f3003030aa', $tr$What is a folder?$tr$, $tr$["A place where files are kept", "A kind of toy", "A kind of scissors", "A kind of book"]$tr$::jsonb, $tr$Saving and Opening Files$tr$),
('4417ac72-e863-4b3a-9f16-43a0bbc3c406', $tr$Who should you tell right away if something unsafe happens online?$tr$, $tr$["A parent or teacher", "No one", "Only a classmate", "A stranger online"]$tr$::jsonb, $tr$Spotting and Reporting Unsafe Situations$tr$),
('441ec37f-5f95-4f53-a9f7-ae5a6e0ccd95', $tr$What should you do first if you get an unsafe message?$tr$, $tr$["Don't answer", "Answer rudely", "Share your information", "Ignore it and keep going"]$tr$::jsonb, $tr$Spotting and Reporting Unsafe Situations$tr$),
('44637e2b-0222-479c-9285-a849fd079089', $tr$Why is it important to learn to use the Internet the right way while we are young?$tr$, $tr$["So we can use it safely and responsibly when we grow up", "You don't need to learn it", "It is only for adults", "It makes no difference in a child's life"]$tr$::jsonb, $tr$What Is the Internet?$tr$),
('44b95c0d-b86e-4440-8c17-8fca01485e25', $tr$What will happen if you don't put your skills together in a project?$tr$, $tr$["It will be hard to finish the whole task", "It makes no difference", "It is easier if everything is kept apart", "The project will finish by itself"]$tr$::jsonb, $tr$Putting Skills Together in a Project$tr$),
('44c28f4e-0e6f-4469-9402-6a2530a267f3', $tr$Why is it important to get to know different computer icons?$tr$, $tr$["It helps you use the computer with more confidence", "It is not needed", "It does not change how you use it", "Only one icon matters"]$tr$::jsonb, $tr$Know the Browser and Search Engine Icons$tr$),
('4536630d-30e9-4eae-9b55-bb458f56c698', $tr$What should you do if someone asks for your personal information?$tr$, $tr$["Don't give it, and tell an adult", "Give it right away", "Answer truthfully", "Keep chatting"]$tr$::jsonb, $tr$Review: The Whole Computer Term$tr$),
('4664f147-c654-48b3-83db-7024e6c079be', $tr$What is an example of personal information?$tr$, $tr$["Your full name and home address", "Your favorite color", "Your favorite food", "Your favorite game"]$tr$::jsonb, $tr$Keeping Personal Information Private$tr$),
('46997d69-7557-4ea1-92fb-a297bdae22b3', $tr$Why do we need an adult's help when using the Internet?$tr$, $tr$["To help choose things that are safe and right for us", "You don't need any help", "Everything on the Internet is always safe", "The child should just decide alone"]$tr$::jsonb, $tr$What Is the Internet?$tr$),
('4702d978-dd80-4272-882b-e33ebd26dc0b', $tr$What is the big lesson of the whole Computer term?$tr$, $tr$["Use the computer and the Internet responsibly and safely", "Use it alone anytime", "You don't need to be careful", "There is no danger in using a computer"]$tr$::jsonb, $tr$Review: The Whole Computer Term$tr$),
('47d4335c-c272-471e-8fbc-93e1a2a4436f', $tr$What does checking your project before showing it tell others?$tr$, $tr$["You worked hard and were careful", "You were careless with your work", "You don't care about the project", "You only ran out of time"]$tr$::jsonb, $tr$Checking and Showing Your Project$tr$),
('49663c6d-07bb-4be6-bb96-2dda4fabb4ae', $tr$Why learn to use the mouse the right way?$tr$, $tr$["It makes doing a project easier", "It has no use", "You don't need to learn it", "It is only for games"]$tr$::jsonb, $tr$Putting Skills Together in a Project$tr$),
('499326e2-c8e7-459f-ae22-a6e505c95034', $tr$Why is undo useful?$tr$, $tr$["It helps you fix mistakes", "It only slows down the work", "It is no use in a project", "It only makes the work harder"]$tr$::jsonb, $tr$Extra Skills: Copy, Paste, and Undo$tr$),
('4a944366-67e9-412e-b770-56ae65008261', $tr$For a 'My Family' project, what should the caption include?$tr$, $tr$["A short description of the family", "Nothing, ever", "Only random numbers", "A long separate paragraph"]$tr$::jsonb, $tr$Drawing and Simple Formatting$tr$),
('4bb179d9-e97a-4bf3-803b-1bc0292f54b8', $tr$What is an example of a sentence about your own name?$tr$, $tr$["My name is Ana.", "The dog is brown.", "It is sunny outside.", "Books are on the shelf."]$tr$::jsonb, $tr$Word Processing and Typing Simple Sentences$tr$),
('4f4f9b86-6d0a-4f2d-b669-cd361117a56b', $tr$What do you do when you want to see your old work again?$tr$, $tr$["Open the file", "Close the computer", "Delete everything", "Only start new work"]$tr$::jsonb, $tr$Saving and Opening Files$tr$),
('51bc20bb-953f-4c31-b60e-d4204441a772', $tr$What is an important lesson about the Internet?$tr$, $tr$["Use it with an adult's help and choose things that are right for you", "Use it alone any time", "You don't need to be careful", "There is no danger"]$tr$::jsonb, $tr$What Is the Internet?$tr$),
('51cef4b1-80f2-4039-a0d9-271d00536fee', $tr$Why is it important to know the browser icons?$tr$, $tr$["It helps you find the right program fast", "It has no use", "You don't need to know it", "Only to decorate the computer"]$tr$::jsonb, $tr$Know the Browser and Search Engine Icons$tr$),
('529f39d8-23a6-4ad1-ad8e-de1bc812912c', $tr$Why is it important to learn to use the mouse the right way?$tr$, $tr$["So it is easier to make projects on the computer", "It has no use", "You don't need to learn it", "It is only for games"]$tr$::jsonb, $tr$Putting Skills Together in a Project$tr$),
('55d8c245-e103-4a60-9d8e-be3276af0c9b', $tr$What do you do after saving your work?$tr$, $tr$["Close all open programs", "Unplug it right away", "Start the work again", "Forget everything"]$tr$::jsonb, $tr$Safely Closing Programs and the Computer$tr$),
('55fc8372-ec8a-4fcc-9aa6-43abfd5c655b', $tr$How many steps were given for shutting down the computer the right way?$tr$, $tr$["Four steps", "Only one step", "Ten steps", "No steps"]$tr$::jsonb, $tr$Safely Closing Programs and the Computer$tr$),
('5677b514-4e86-4a0f-ac5f-b696616868e9', $tr$What is an example of a trusted place to get information?$tr$, $tr$["A school or library website", "Any stranger online", "A random comment", "You don't need a source"]$tr$::jsonb, $tr$Not Everything on the Internet Is True$tr$),
('57bd03a5-7425-46ae-9a08-f91e7668e94c', $tr$Example of a browser?$tr$, $tr$["Chrome", "Google", "Windows", "Facebook"]$tr$::jsonb, $tr$What We Use the Internet For$tr$),
('58898315-0454-48e2-8bdc-9c0d53039ea8', $tr$What does Ctrl+C do?$tr$, $tr$["Copy", "Paste", "Save", "Delete"]$tr$::jsonb, $tr$Not Everything on the Internet Is True$tr$),
('58dd0873-ae6c-4a9e-b0dc-d05fc3374a33', $tr$What does 'kid-friendly' mean?$tr$, $tr$["Things that are right for kids and made for them", "Things that are only for adults", "Things that are dangerous", "Things that have nothing in them"]$tr$::jsonb, $tr$What Is the Internet?$tr$),
('5977bd74-5248-4303-9319-534766c267b0', $tr$Why should you not give personal information to a website?$tr$, $tr$["Someone with bad plans could use it", "It is always safe to do", "There is no danger", "You have to do it"]$tr$::jsonb, $tr$Safe Content vs. Unsuitable Content$tr$),
('59d1f859-46cc-417a-aa17-f9d5efc79558', $tr$What is screen time?$tr$, $tr$["Time spent in front of a computer, tablet, or phone", "Sleep time", "Meal time", "Time playing outside"]$tr$::jsonb, $tr$Screen Time and Asking Adults$tr$),
('5a42a716-33b0-4521-b2cc-8478341c7c38', $tr$Why is the Internet a big network?$tr$, $tr$["It connects many computers", "It is only one computer", "Nothing is connected", "It is cut off from the world"]$tr$::jsonb, $tr$What Is the Internet?$tr$),
('5c4ca90d-9888-497c-ab96-549fd7b26056', $tr$Why did we learn all these skills in Grade 2?$tr$, $tr$["They are basic skills for using the computer safely and responsibly", "You don't need to learn them", "They are only for adults", "They are no use at school"]$tr$::jsonb, $tr$Review: The Whole Computer Term$tr$),
('5dd803dc-cb84-4bb8-ae12-3596935e2b3b', $tr$Example of a trusted source?$tr$, $tr$["A school or library website", "Any stranger", "A random comment", "No source is needed"]$tr$::jsonb, $tr$Not Everything on the Internet Is True$tr$),
('60bcee6e-92a9-4dcb-9cec-6625ea987d49', $tr$What does checking that your drawing has clear labels make sure of?$tr$, $tr$["That people looking at it understand the project", "The number of colors used", "The price of the project", "Only the size of the file"]$tr$::jsonb, $tr$Checking and Showing Your Project$tr$),
('61bde6c6-12bd-4094-af1c-3b3668de29df', $tr$What is safe content like?$tr$, $tr$["Made for kids and approved by an adult", "Has violent pictures", "Asks for personal information", "Not right for your age"]$tr$::jsonb, $tr$Review: The Whole Computer Term$tr$),
('622c3bd6-ed53-478f-af7f-ed370b68b6bb', $tr$Who should you check with before using a new app or website?$tr$, $tr$["A parent or teacher", "You don't need to check with anyone", "Only a friend", "A stranger online"]$tr$::jsonb, $tr$Keeping Personal Information Private$tr$),
('630f2f02-f721-4127-b676-2434038f968e', $tr$Why is not everything on the Internet right for kids?$tr$, $tr$["Some things are for adults or are dangerous", "Everything is safe", "Nothing is dangerous", "It is not true"]$tr$::jsonb, $tr$What Is the Internet?$tr$),
('633cf1eb-cd60-4617-9df3-9457eae85e84', $tr$Which option should you pick to turn off the computer the right way?$tr$, $tr$["Shut Down", "Just Restart again and again", "Delete", "Format"]$tr$::jsonb, $tr$Safely Closing Programs and the Computer$tr$),
('635f5db4-cc7b-4da1-9ad1-6de7632800bb', $tr$What is a word-processing program like in real life?$tr$, $tr$["Writing on paper, but with a keyboard", "Just a kind of toy", "A kind of kitchen tool", "A kind of clothing"]$tr$::jsonb, $tr$Word Processing and Typing Simple Sentences$tr$),
('63fc2ad5-6c8a-4ed8-882b-a32b8bad7612', $tr$Why wait for it to turn off fully before you unplug it?$tr$, $tr$["To make sure the process is complete", "You don't need to wait", "Nothing happens", "Just unplug it right away"]$tr$::jsonb, $tr$Safely Closing Programs and the Computer$tr$),
('64c7e0a3-6384-4bdb-bda0-74be1636bc5d', $tr$How does the Internet help you learn?$tr$, $tr$["Watching learning videos", "It has no use", "It stops you from learning", "It is only for fun"]$tr$::jsonb, $tr$What We Use the Internet For$tr$),
('64d6bdf4-3f2e-4594-9038-6cb01c0e52b6', $tr$What is unsuitable content like?$tr$, $tr$["Has violent or scary pictures", "Made for kids", "Teaches you things", "Approved by a parent"]$tr$::jsonb, $tr$Safe Content vs. Unsuitable Content$tr$),
('64e6a13f-6040-428f-b79e-e372bd5d2da2', $tr$Why not answer a scary message?$tr$, $tr$["It can make things worse", "It is always safe to answer", "There is no danger", "You have to do it"]$tr$::jsonb, $tr$Spotting and Reporting Unsafe Situations$tr$),
('64f04fb5-cca9-43c3-8db4-5afbe932b13d', $tr$How can you check if information is true?$tr$, $tr$["See if it comes from a well-known website", "Just believe it right away", "Share it right away", "Don't check it at all"]$tr$::jsonb, $tr$Not Everything on the Internet Is True$tr$),
('653d2649-fa08-4b78-a721-862fa55df5db', $tr$Who should you still ask for help while you work?$tr$, $tr$["An adult", "No one is needed", "Only a classmate", "A stranger online"]$tr$::jsonb, $tr$Putting Skills Together in a Project$tr$),
('6559385f-eaba-4360-8213-c7892de76eee', $tr$What should you do if you are not sure information is true?$tr$, $tr$["Ask a parent or teacher", "Believe it right away", "Share it right away", "Ignore it"]$tr$::jsonb, $tr$Not Everything on the Internet Is True$tr$),
('65dc2b5d-41a1-4056-8e82-d783b4d84ced', $tr$What can happen if the power is suddenly cut off?$tr$, $tr$["The computer may get damaged or your work may be lost", "Nothing will happen", "It is always safe", "It will shut down even faster"]$tr$::jsonb, $tr$Safely Closing Programs and the Computer$tr$),
('668769f7-ce7f-45bd-98c3-84fe2b6a0af9', $tr$What happens if you don't put your skills together?$tr$, $tr$["It will be hard to finish the whole task", "No difference", "It is easier if kept apart", "It finishes by itself"]$tr$::jsonb, $tr$Putting Skills Together in a Project$tr$),
('66963f98-213d-446e-9591-9ac6a2bd077b', $tr$What should you do if something scary happens online?$tr$, $tr$["Tell an adult right away", "Just keep it a secret", "Ignore it", "Only tell a friend"]$tr$::jsonb, $tr$Keeping Personal Information Private$tr$),
('674d952c-2365-4a74-b422-a8d6b155b6f3', $tr$What skills were put together in the project?$tr$, $tr$["Mouse skills, typing, drawing, saving", "Only cooking and cleaning", "Singing and dancing", "Fishing and farming"]$tr$::jsonb, $tr$Putting Skills Together in a Project$tr$),
('683fc9db-1a0a-44a3-8771-cc3c3b12c090', $tr$Why teach these skills in Grade 2?$tr$, $tr$["They are basic skills for using the computer safely", "You don't need to learn them", "They are only for adults", "They are no use at school"]$tr$::jsonb, $tr$Review: The Whole Computer Term$tr$),
('69015f29-f344-474e-872d-6e4173808437', $tr$What happens if you believe everything online?$tr$, $tr$["You may believe wrong information", "It is always right", "Nothing happens", "It is all correct by itself"]$tr$::jsonb, $tr$Not Everything on the Internet Is True$tr$),
('6901bda6-46ad-493d-80c8-50feadef0bbb', $tr$What will happen if you don't save your work?$tr$, $tr$["It can be lost when the computer is turned off", "It is always kept even if you don't save", "It saves by itself", "Nothing will happen"]$tr$::jsonb, $tr$Saving and Opening Files$tr$),
('6d3e1ffd-1a7b-42e3-bcf4-23f237e2e99f', $tr$Why is it important to balance screen time with other activities?$tr$, $tr$["To have a healthy body and mind", "Balance is not important", "Only screen time matters", "There is no reason"]$tr$::jsonb, $tr$Screen Time and Asking Adults$tr$),
('6d7bc001-5f23-4901-a319-190abd41760c', $tr$Which one is an example of a search engine?$tr$, $tr$["Google", "Chrome", "Windows", "Word"]$tr$::jsonb, $tr$What We Use the Internet For$tr$),
('6e898784-73bd-42a4-992b-5a4878e65a88', $tr$Why is it dangerous to give your home address to a stranger?$tr$, $tr$["Someone with bad plans could use it", "There is no danger", "It is always safe", "Everyone has good plans"]$tr$::jsonb, $tr$Don't Share Personal Information$tr$),
('6fb2eb00-e9ac-417f-b957-07c0deeccf08', $tr$What is the big lesson about personal information?$tr$, $tr$["Keep it private and ask an adult for help", "Share it with everyone", "You don't need to be careful", "There is no danger online"]$tr$::jsonb, $tr$Don't Share Personal Information$tr$),
('719da767-050d-4983-97fc-9efcc445ecd6', $tr$Who do you ask for permission before using a new program?$tr$, $tr$["A parent or teacher", "You don't need to ask anyone", "Only a classmate", "A younger brother or sister"]$tr$::jsonb, $tr$Screen Time and Asking Adults$tr$),
('73919aad-8141-4987-9677-addc7cd8b9cd', $tr$Why save your work?$tr$, $tr$["So it is not lost even when the computer is turned off", "To make it colorful", "It is not important", "So it finishes by itself"]$tr$::jsonb, $tr$Saving and Opening Files$tr$),
('746e5a78-c87c-441f-86d3-5768a4c0d7a6', $tr$Who do you check with before using a new app?$tr$, $tr$["A parent or teacher", "No one is needed", "Only a friend", "A stranger online"]$tr$::jsonb, $tr$Keeping Personal Information Private$tr$),
('74ed78b0-74d0-4115-8493-9eddea817965', $tr$What is the right thing to do if you forgot who is asking for information?$tr$, $tr$["Still don't give it, and ask an adult", "Just give it", "Ignore your worry", "Keep chatting"]$tr$::jsonb, $tr$Don't Share Personal Information$tr$),
('74f0bb22-063e-4ddf-8688-e28dc31d358f', $tr$Is everything on the Internet right for kids?$tr$, $tr$["No, only things made for kids", "Yes, everything is right for kids", "The Internet has nothing on it", "You don't need to choose"]$tr$::jsonb, $tr$What Is the Internet?$tr$),
('75b0be0e-deca-44ba-8db3-6d2ac6192b39', $tr$What can you do with an adult to keep a record of the problem?$tr$, $tr$["Take a screenshot", "Delete everything right away", "Keep chatting", "Answer in a mean way"]$tr$::jsonb, $tr$Spotting and Reporting Unsafe Situations$tr$),
('75dfadcb-35c0-4615-9657-419128e15752', $tr$What should you do if something scary happens online?$tr$, $tr$["Tell an adult", "Just keep it a secret", "Ignore it", "Only tell a friend"]$tr$::jsonb, $tr$Keeping Personal Information Private$tr$),
('7682d6cc-1006-4b15-91b2-92d2e934b903', $tr$What is an example of an unsafe situation online?$tr$, $tr$["Someone uses bad words or asks for personal information", "Someone teaches a lesson", "There is a picture of an animal", "There is a learning game"]$tr$::jsonb, $tr$Spotting and Reporting Unsafe Situations$tr$),
('771e55f5-9a82-40d6-a040-e69a5dc1c93e', $tr$Why should you not share personal information online?$tr$, $tr$["Someone with bad plans could use it", "It is always safe to do", "You have to do it", "There is no danger"]$tr$::jsonb, $tr$Don't Share Personal Information$tr$),
('7876cc8c-ebdc-4b5c-a023-73872f85729b', $tr$Why not share personal information online?$tr$, $tr$["It can be dangerous", "It is always safe", "There is no danger", "You have to do it"]$tr$::jsonb, $tr$Keeping Personal Information Private$tr$),
('78b91606-a16a-4a3b-9552-ed0827e83db1', $tr$What will happen if you believe everything you read online?$tr$, $tr$["You may believe wrong information", "What you believe is always right", "Nothing happens", "Everything is correct by itself"]$tr$::jsonb, $tr$Not Everything on the Internet Is True$tr$),
('7bb9e488-953a-4e54-ab63-1817f674c063', $tr$What is a good example of reporting?$tr$, $tr$["Tell a parent and show them the message", "Keep it all to yourself", "Ignore the problem", "Make the problem bigger"]$tr$::jsonb, $tr$Spotting and Reporting Unsafe Situations$tr$),
('7bd732f8-9ec5-49fe-a9e1-81ebd6b9d62e', $tr$What is paste?$tr$, $tr$["Putting a copied thing in another place", "Removing text", "Saving a file", "Opening a new program"]$tr$::jsonb, $tr$Extra Skills: Copy, Paste, and Undo$tr$),
('7c345ab9-82be-4ccd-b87a-7495e6bd16a5', $tr$What happens if you have too much screen time?$tr$, $tr$["It can hurt your eyes and health", "It is always good", "It has no effect", "It makes your eyes stronger"]$tr$::jsonb, $tr$Screen Time and Asking Adults$tr$),
('7e0efd78-f4cb-45e6-b0d5-7b8e8e81bfa6', $tr$Why do you need to choose the folder where you keep the file?$tr$, $tr$["So you know where to find it again", "You don't need to choose it", "It is always in just one place", "Folders have no use"]$tr$::jsonb, $tr$Saving and Opening Files$tr$),
('7e25ea22-6021-4058-96cd-f5b11a9bedb6', $tr$Is everything on the Internet right for kids?$tr$, $tr$["No, only kid-friendly things", "Yes, everything is right", "It has nothing on it", "You don't need to choose"]$tr$::jsonb, $tr$What Is the Internet?$tr$),
('7eafccc8-4854-4664-aac0-c694398f3e72', $tr$You deleted a sentence by mistake. What should you do?$tr$, $tr$["Use undo", "Close the program right away", "Start the whole project again", "Save the file right away"]$tr$::jsonb, $tr$Extra Skills: Copy, Paste, and Undo$tr$),
('7ebf7581-9d2a-4cf8-a092-0f68b5d54e56', $tr$How does the Internet help people talk to each other?$tr$, $tr$["You can talk with family far away", "It has no role", "It stops people from talking", "It is only for fun"]$tr$::jsonb, $tr$What We Use the Internet For$tr$),
('7f9ef355-3d07-4d7e-83c1-383abc948c67', $tr$You want to type "I am in Grade 2." What should you do first?$tr$, $tr$["Open the word-processing/typing program", "Close the computer right away", "Take off the keyboard", "Stop using the computer"]$tr$::jsonb, $tr$Word Processing and Typing Simple Sentences$tr$),
('80ae68bf-54da-4096-aa96-58f27bad2a42', $tr$What should you do first if you get an unsafe message?$tr$, $tr$["Don't answer", "Answer rudely", "Share your personal information", "Ignore it and keep chatting"]$tr$::jsonb, $tr$Spotting and Reporting Unsafe Situations$tr$),
('83184472-e031-487b-81e1-709974d18a98', $tr$Why learn this before online safety?$tr$, $tr$["To understand the Internet first before learning to use it the right way", "You don't need to learn it", "It has nothing to do with online safety", "It is only for grown-ups"]$tr$::jsonb, $tr$What We Use the Internet For$tr$),
('835630ca-776e-41dc-ab16-65c358beb1f0', $tr$What should you do first if you get an unsafe message?$tr$, $tr$["Don't answer", "Answer rudely", "Share your personal information", "Ignore it and keep chatting"]$tr$::jsonb, $tr$Review: The Whole Computer Term$tr$),
('83cafba1-471d-43c3-93d3-d6868381f4d0', $tr$What is the big lesson about staying safe online?$tr$, $tr$["Keep personal information private and ask an adult for help", "Share all your information", "You don't need to be careful", "There is no danger online"]$tr$::jsonb, $tr$Keeping Personal Information Private$tr$),
('83e09893-db6b-4b9f-808f-692b6da859ac', $tr$Why is it important to learn to check information while you are young?$tr$, $tr$["So you grow up to be a smart Internet user", "You don't need to learn it", "It is only for grown-ups", "It does not matter"]$tr$::jsonb, $tr$Not Everything on the Internet Is True$tr$),
('848d1004-a02e-45d2-8538-707f295b586e', $tr$Why compare information with other sources?$tr$, $tr$["To make sure it is true", "You don't need to", "One source is enough", "It has no use"]$tr$::jsonb, $tr$Not Everything on the Internet Is True$tr$),
('8622d7ea-17e7-45c3-a097-80f4333b4ee0', $tr$What can you do with your project when it is finished?$tr$, $tr$["You can print it", "Just forget it", "Delete it right away", "Never open it again"]$tr$::jsonb, $tr$Extra Skills: Copy, Paste, and Undo$tr$),
('86da50c5-0d7d-4e43-b6fd-6b793b237c93', $tr$Who should you tell if you see something unsuitable?$tr$, $tr$["An adult", "No one", "Only a classmate", "A stranger online"]$tr$::jsonb, $tr$Safe Content vs. Unsuitable Content$tr$),
('881f1f6c-dce2-44da-997c-fed74f984178', $tr$Who should you still ask for help while making a project?$tr$, $tr$["An adult", "You don't need to ask anyone", "Only a classmate", "A stranger online"]$tr$::jsonb, $tr$Putting Skills Together in a Project$tr$),
('88d593c8-15e0-47f7-8234-eddf9d4d2634', $tr$Who should you tell if someone asks for your personal information?$tr$, $tr$["A grown-up", "No one", "Only a classmate", "A stranger online"]$tr$::jsonb, $tr$Don't Share Personal Information$tr$),
('890541ec-93a3-4589-ba50-f78f514a2bf7', $tr$What do you use to type a word?$tr$, $tr$["Keyboard", "Only the mouse", "Only the screen", "Speaker"]$tr$::jsonb, $tr$Review: The Whole Computer Term$tr$),
('8941ca82-8d33-44ff-9b25-1d6476ed134e', $tr$What is the big lesson of the Computer term?$tr$, $tr$["Use the computer and the Internet responsibly and safely", "Use it alone", "You don't need to be careful", "There is no danger"]$tr$::jsonb, $tr$Review: The Whole Computer Term$tr$),
('895840a2-6d6c-4faa-917c-74201c413f77', $tr$A student finished a project but has not saved it yet. What should the student do first?$tr$, $tr$["Save the file before closing the program", "Close the program right away without saving", "Delete the whole project", "Just don't turn in the project"]$tr$::jsonb, $tr$Checking and Showing Your Project$tr$),
('898e5d99-1241-468f-b931-096512d8a0f7', $tr$Why is it important to know what safe content is?$tr$, $tr$["To stay away from dangerous or unsuitable things", "You don't need to know it", "All content is safe", "It has no use"]$tr$::jsonb, $tr$Safe Content vs. Unsuitable Content$tr$),
('8a2d9415-df08-47c8-8286-ea1e74197bd5', $tr$Why know the browser icon?$tr$, $tr$["To find the right program fast", "It has no use", "You don't need to know it", "Only to decorate"]$tr$::jsonb, $tr$Know the Browser and Search Engine Icons$tr$),
('8c067fe5-f256-4842-8858-7fe5fff90ce1', $tr$What skill do you use to type?$tr$, $tr$["Word-processing/typing", "Only mouse clicks", "Only drawing", "Only saving"]$tr$::jsonb, $tr$Putting Skills Together in a Project$tr$),
('8cb3145a-cc0e-40a5-8b1b-1b5df6b37539', $tr$What does Ctrl+C do?$tr$, $tr$["Copy", "Paste", "Save", "Delete"]$tr$::jsonb, $tr$Not Everything on the Internet Is True$tr$),
('8d0795d6-2aca-4e3c-ab4b-b81c731a9925', $tr$What is the FIRST step in making a labeled picture?$tr$, $tr$["Sketch using shapes and the pencil", "Type the caption first", "Save the file right away", "Print the picture"]$tr$::jsonb, $tr$Drawing and Simple Formatting$tr$),
('8d4894fc-5e11-4618-a148-b3fb81ee9ac6', $tr$Why is not everything on the Internet right for kids?$tr$, $tr$["Some things are only for adults or are dangerous", "Everything is safe for kids", "Nothing on it is dangerous", "This is not true"]$tr$::jsonb, $tr$Review: The Whole Computer Term$tr$),
('8ddf66ed-f5e2-4445-bad0-87146605c6d3', $tr$What does Ctrl+V do?$tr$, $tr$["Paste", "Copy", "Save", "Delete"]$tr$::jsonb, $tr$Not Everything on the Internet Is True$tr$),
('8e317101-8950-4cd6-9107-bad647cfcca9', $tr$What will happen if you don't save your work before closing the program?$tr$, $tr$["The work you did may be lost", "It is always kept", "Nothing happens", "It saves by itself"]$tr$::jsonb, $tr$Safely Closing Programs and the Computer$tr$),
('8f5da681-fd84-4dd6-bb6f-c292ee5d84a1', $tr$What is the right step for saving?$tr$, $tr$["Click Save and give it a name", "Turn off the computer right away", "Forget the file", "Close it right away"]$tr$::jsonb, $tr$Saving and Opening Files$tr$),
('910368f7-713b-4eb0-940e-886ecdc588e9', $tr$What should you do before giving personal information online?$tr$, $tr$["Ask a parent for permission", "Give it right away", "You don't need to ask for permission", "Share it with everyone online"]$tr$::jsonb, $tr$Keeping Personal Information Private$tr$),
('9237b8b1-7cbc-4360-939b-be5a48a87029', $tr$What do you use to keep a record of the message?$tr$, $tr$["Screenshot", "Breaking the computer", "Throwing away the computer", "Nothing"]$tr$::jsonb, $tr$Spotting and Reporting Unsafe Situations$tr$),
('95013d40-08b0-4e84-b58c-15128daca72c', $tr$Why is it important to learn to use a checklist before finishing a project?$tr$, $tr$["It makes sure all the parts are complete", "It is useless for the project", "It only slows down the work", "It is only used for grades"]$tr$::jsonb, $tr$Checking and Showing Your Project$tr$),
('956d2655-f5b0-45e9-8828-a9c48ecafae7', $tr$What is part of 'good online manners'?$tr$, $tr$["Being polite when talking with others online", "Being rude to others online", "Sharing all your information", "Staying away from everyone"]$tr$::jsonb, $tr$Keeping Personal Information Private$tr$),
('958183f0-1ca4-4779-a599-7fcdfe4aaf3a', $tr$What happens when you press undo after a mistake?$tr$, $tr$["It takes back the last thing you did", "It closes the whole program", "It prints the document", "It deletes the whole file"]$tr$::jsonb, $tr$Extra Skills: Copy, Paste, and Undo$tr$),
('96df8d2a-030f-43c3-a8ae-627461424b58', $tr$What is a search engine?$tr$, $tr$["A tool used to look for information", "A kind of machine", "A kind of toy", "A kind of computer part"]$tr$::jsonb, $tr$What We Use the Internet For$tr$),
('97160a9c-3584-4a4a-bd51-30ea95af41a2', $tr$You want to use the same title again in different parts. Which two skills will you use?$tr$, $tr$["Copy and paste", "Undo and redo", "Save and close", "Print and delete"]$tr$::jsonb, $tr$Extra Skills: Copy, Paste, and Undo$tr$),
('972801fa-3240-4dd6-a207-bbb7f8b78a98', $tr$Why learn to shut down safely?$tr$, $tr$["To keep the computer in good shape", "It is not important", "Only to use up time", "It has no purpose"]$tr$::jsonb, $tr$Safely Closing Programs and the Computer$tr$),
('97a0fe72-2771-46a1-a3b4-04faa3b02e7c', $tr$Which one is an example of a browser?$tr$, $tr$["Chrome", "Google", "Windows", "Facebook"]$tr$::jsonb, $tr$What We Use the Internet For$tr$),
('99ccf91a-2bbf-4df1-b7f2-0757dd23ba05', $tr$Why is it important to be polite online?$tr$, $tr$["It shows good online manners", "It doesn't matter online", "It's okay to be rude online", "It makes no difference"]$tr$::jsonb, $tr$Keeping Personal Information Private$tr$),
('9a899780-df73-4930-8609-f41048075bcd', $tr$What do you use to go on the Internet?$tr$, $tr$["Browser", "Only a search engine", "Only a keyboard", "None of these"]$tr$::jsonb, $tr$Know the Browser and Search Engine Icons$tr$),
('9aaddc2d-9e81-4922-93e6-aac66c0d1a5a', $tr$What should you do before going online?$tr$, $tr$["Ask a parent or teacher first", "Go online right away without permission", "You don't need to ask", "Only do it when no adult is around"]$tr$::jsonb, $tr$Screen Time and Asking Adults$tr$),
('9b0274af-8b3c-4076-8763-bd59932ef40f', $tr$Why is it important to close all open programs before you shut down?$tr$, $tr$["To avoid problems while shutting down", "You don't need to close them", "Nothing happens if they are still open", "It is faster if you don't close them"]$tr$::jsonb, $tr$Safely Closing Programs and the Computer$tr$),
('9b55e6ec-4701-4ee4-8cd1-1c0ee005209f', $tr$What can you do with the Internet?$tr$, $tr$["Look for information, watch videos", "Sew", "Cook", "Travel"]$tr$::jsonb, $tr$What Is the Internet?$tr$),
('9ba4a4ae-a257-4f49-bf67-66274aef97ca', $tr$What do you use to look for information online?$tr$, $tr$["Search engine", "Only a browser", "Only a keyboard", "Only a mouse"]$tr$::jsonb, $tr$Know the Browser and Search Engine Icons$tr$),
('9cd8f7ef-8742-435d-a4ba-0381834e156c', $tr$Besides screen time, what else should a child have time for?$tr$, $tr$["Reading, playing outside, and sleeping", "Only screen time all day", "Nothing else to do", "Only watching TV"]$tr$::jsonb, $tr$Screen Time and Asking Adults$tr$),
('9ce4060f-e291-48b7-b8a1-1cc432d6873c', $tr$What is the goal of putting skills together?$tr$, $tr$["To show the skills you learned in one task", "There is no goal", "Just to use up the time", "To get kids to have more screen time"]$tr$::jsonb, $tr$Putting Skills Together in a Project$tr$),
('9e3a124b-3b5d-45d6-b9b0-5eb36cad989a', $tr$Why learn to know the icons?$tr$, $tr$["To use the computer better", "It is not important", "Only to keep kids busy", "It has no purpose"]$tr$::jsonb, $tr$Know the Browser and Search Engine Icons$tr$),
('9faf0611-982f-48d0-8a9d-fa6142927b05', $tr$Which one is NOT okay for kids to see?$tr$, $tr$["A scary or violent picture", "A learning video", "A math game", "A kids' story"]$tr$::jsonb, $tr$Safe Content vs. Unsuitable Content$tr$),
('9fcdd173-c937-40bc-9910-18eafadc6904', $tr$Why learn to check information while you are young?$tr$, $tr$["To be a smart Internet user", "You don't need to learn it", "It is only for grown-ups", "It does not matter"]$tr$::jsonb, $tr$Not Everything on the Internet Is True$tr$),
('a02d1501-5d89-4d39-b023-2e3afa56c7fb', $tr$Why is the Internet called a big network?$tr$, $tr$["It connects many computers in many different places", "It is made of only one computer", "It has no computers connected to it", "It is cut off from the whole world"]$tr$::jsonb, $tr$What Is the Internet?$tr$),
('a039ec98-f60d-44b0-ae6c-215e8dd829b8', $tr$Why is not everything on the Internet right for kids?$tr$, $tr$["Some things are for adults or are dangerous", "Everything is safe", "Nothing is dangerous", "It is not true"]$tr$::jsonb, $tr$Review: The Whole Computer Term$tr$),
('a227e5e0-eb13-437b-b2e6-ac7671f47258', $tr$What is the goal of typing simple sentences about yourself?$tr$, $tr$["To practice writing on the computer", "Just to finish class quickly", "There is really no goal", "Just to erase letters"]$tr$::jsonb, $tr$Word Processing and Typing Simple Sentences$tr$),
('a37f75b8-cc1d-4d57-917d-c162a62286ac', $tr$Which of these are ICT skills we learned this whole term?$tr$, $tr$["Saving, typing, and online safety", "Cooking food", "Sewing clothes", "Farming"]$tr$::jsonb, $tr$Putting Skills Together in a Project$tr$),
('a3aff434-d736-4e72-bfb7-8da014a445ee', $tr$What is the big lesson about the Internet this whole term?$tr$, $tr$["Use it with help and choose things that are right for you", "Use it alone any time", "You don't need to be careful", "There is no danger online"]$tr$::jsonb, $tr$Review: The Whole Computer Term$tr$),
('a49e45db-4cfc-44cd-9a95-09cf8615564e', $tr$Which of these is the right step for saving?$tr$, $tr$["Click Save and give the file a name", "Turn off the computer right away", "Forget the file", "Close the program right away"]$tr$::jsonb, $tr$Saving and Opening Files$tr$),
('a59bbc2b-cd08-4f94-8b61-9e11759b0453', $tr$What should you give a file before you save it?$tr$, $tr$["A name", "Only a color", "Only a picture", "Nothing"]$tr$::jsonb, $tr$Saving and Opening Files$tr$),
('a7111e43-0537-46a9-b2f9-193f8d5f1976', $tr$What is the big lesson about personal information?$tr$, $tr$["Keep it private and ask an adult for help", "Share it with everyone", "You don't need to be careful", "There is no danger online"]$tr$::jsonb, $tr$Don't Share Personal Information$tr$),
('a78fc5f1-05dc-4e89-ade3-dc39f1d6fbad', $tr$What happens if you don't save?$tr$, $tr$["It can be lost when the computer is turned off", "It is always kept", "It saves by itself", "Nothing"]$tr$::jsonb, $tr$Saving and Opening Files$tr$),
('a7fc2dff-fe67-493f-b75c-037e0bcb04cf', $tr$Example of using the Internet to learn?$tr$, $tr$["Watching a video about Science", "Playing with no goal", "Sharing personal information", "Talking to strangers"]$tr$::jsonb, $tr$What We Use the Internet For$tr$),
('a96a2ea2-d6a8-4e4b-830d-5eefef1c0ad9', $tr$What is the big lesson about the Internet?$tr$, $tr$["Use it with help and choose things that are right for you", "Use it alone", "You don't need to be careful", "There is no danger"]$tr$::jsonb, $tr$Review: The Whole Computer Term$tr$),
('aa512e06-1e1b-41ec-930e-72d6a314a6c7', $tr$What do you do after saving your work?$tr$, $tr$["Close the open programs", "Unplug it", "Start again", "Forget everything"]$tr$::jsonb, $tr$Safely Closing Programs and the Computer$tr$),
('aa54eea1-e2dd-4843-b603-6712b68a88e0', $tr$Why is it important to know these skills for a project?$tr$, $tr$["They help you work faster and better", "They don't matter at all for the work", "They only make the whole project harder", "Only teachers at school use them"]$tr$::jsonb, $tr$Extra Skills: Copy, Paste, and Undo$tr$),
('ac089d35-4566-4f19-ab69-7134771e12ff', $tr$What is an important lesson about the Internet for kids?$tr$, $tr$["Use it with an adult's help and choose only things that are right for you", "You can use it alone any time", "You don't need to be careful", "There is no danger on the Internet"]$tr$::jsonb, $tr$What Is the Internet?$tr$),
('ac26df9d-fc11-44e3-a155-83fb37b6276e', $tr$Which is an example of a sentence about something you like to do?$tr$, $tr$["I like to read books.", "The car is red.", "It is cold today.", "The bird can fly."]$tr$::jsonb, $tr$Word Processing and Typing Simple Sentences$tr$),
('ac5613cb-d000-4e47-800b-a2a7ef1e5ee1', $tr$Besides screen time, what else should you have time for?$tr$, $tr$["Reading, playing outside, sleeping", "Only screen time", "Nothing else to do", "Only watching TV"]$tr$::jsonb, $tr$Screen Time and Asking Adults$tr$),
('aecde077-8742-449d-8e0a-03264e25b53e', $tr$What can you do with the Internet?$tr$, $tr$["Look for information, watch videos, talk with others", "Sew clothes", "Cook food", "Travel to another country"]$tr$::jsonb, $tr$What Is the Internet?$tr$),
('af69ae24-64c9-4968-9da4-fc8f48ac8969', $tr$Why have an adult helper when there is a problem online?$tr$, $tr$["They can help fix it safely", "You don't need help", "The child should fix it alone", "They are no help"]$tr$::jsonb, $tr$Spotting and Reporting Unsafe Situations$tr$),
('af720b73-8595-4435-be03-7e74aff8ba0e', $tr$You want to find a picture of an animal. What do you use?$tr$, $tr$["Search engine", "Only a new browser", "A new computer", "Nothing"]$tr$::jsonb, $tr$Know the Browser and Search Engine Icons$tr$),
('b0dc35ec-9b66-4e86-ba34-f9a5c313df38', $tr$What do you use to type words?$tr$, $tr$["Keyboard", "Only the mouse", "Only the screen", "Speaker"]$tr$::jsonb, $tr$Review: The Whole Computer Term$tr$),
('b0f1fb2b-983b-44fa-bd05-83d33360c97b', $tr$Why learn about the dangers while you are young?$tr$, $tr$["To be responsible with technology when you grow up", "You don't need to learn it", "It is only for grown-ups", "It does not matter"]$tr$::jsonb, $tr$Don't Share Personal Information$tr$),
('b1552982-b120-4b88-ae7f-4f92dd4b0305', $tr$Why do we learn this topic in Grade 2?$tr$, $tr$["To learn to balance how we use the computer", "It is not important", "To get kids to have more screen time", "It has no goal"]$tr$::jsonb, $tr$Screen Time and Asking Adults$tr$),
('b172ac7d-111b-4bdb-9b4c-4d1050e7ea22', $tr$What does Ctrl+S do?$tr$, $tr$["Save", "Copy", "Paste", "Delete"]$tr$::jsonb, $tr$Not Everything on the Internet Is True$tr$),
('b190b3de-8c7c-424e-b207-fb2e57862ef8', $tr$Why do kids learn this topic?$tr$, $tr$["To know what to stay away from online", "It is not important", "To get kids to watch everything", "It has no purpose"]$tr$::jsonb, $tr$Safe Content vs. Unsuitable Content$tr$),
('b1b052d9-6c90-455d-9499-9d7fe099f9a5', $tr$Why is it important to learn to shut down the right way starting in Grade 3?$tr$, $tr$["It is a basic skill for taking care of things you use", "You don't need to learn it", "It is only for grown-ups", "It has no use at school"]$tr$::jsonb, $tr$Safely Closing Programs and the Computer$tr$),
('b2fdaad2-6417-448c-b76b-2af4154f8f7f', $tr$Why do browser icons look different from each other?$tr$, $tr$["Different companies made each one", "They are all the same", "There is no difference", "Only one company made all of them"]$tr$::jsonb, $tr$Know the Browser and Search Engine Icons$tr$),
('b301033e-cb96-4dc4-a835-f7c907063923', $tr$What does checking that the file is saved the right way make sure of?$tr$, $tr$["That our work will not be lost", "That the work gets done faster", "That the file has nicer colors", "It makes sure of nothing"]$tr$::jsonb, $tr$Checking and Showing Your Project$tr$),
('b30a9e8f-fed1-4bba-8341-72683e08f293', $tr$Why choose 'Shut Down' instead of just cutting off the power?$tr$, $tr$["To avoid damage and losing your work", "There is no difference", "Just turn it off right away", "It is not important"]$tr$::jsonb, $tr$Review: The Whole Computer Term$tr$),
('b327d28d-c382-4d8b-887e-bcbaab6b1ad8', $tr$What is safe content online like?$tr$, $tr$["Made for kids and approved by an adult", "Has violent pictures", "Asks for personal information", "Not right for your age"]$tr$::jsonb, $tr$Safe Content vs. Unsuitable Content$tr$),
('b5726bb0-67be-494c-86ac-89812e375bae', $tr$What does Ctrl+S do?$tr$, $tr$["Save", "Copy", "Paste", "Delete"]$tr$::jsonb, $tr$Not Everything on the Internet Is True$tr$),
('b6a1ad00-7ed8-4079-a238-d86340f5c2c1', $tr$You see a spelling mistake before printing your project. What should you do?$tr$, $tr$["Fix the spelling first, then print", "Print it right away even with the mistake", "Delete the whole project", "Just don't show the project"]$tr$::jsonb, $tr$Checking and Showing Your Project$tr$),
('b751485a-3ab9-4b7c-8454-cd7d019e4bce', $tr$What is an example of something to do in a simple project?$tr$, $tr$["Type a sentence about yourself and add a drawing", "Only watch TV", "Play alone", "Only read a book"]$tr$::jsonb, $tr$Putting Skills Together in a Project$tr$),
('b8cc1040-7af4-4887-b2c1-d631b194fbc3', $tr$Why is typing correctly more important than typing fast?$tr$, $tr$["To avoid spelling mistakes and keep it clear", "Only speed matters, not being correct", "It has nothing to do with writing", "Being correct is not needed"]$tr$::jsonb, $tr$Word Processing and Typing Simple Sentences$tr$),
('b9ae9eba-31cc-45a5-a268-85058b2b48a3', $tr$What are two ways to get ready for showing your project?$tr$, $tr$["Print it or show it on the computer screen", "Just close the program", "Delete the project", "None, you don't need to get ready"]$tr$::jsonb, $tr$Checking and Showing Your Project$tr$),
('b9d00654-70df-48aa-b8d2-cd5682716e98', $tr$Why tell an adult about a problem online?$tr$, $tr$["They can help fix it", "You don't need to tell", "The child should fix it alone", "Telling does not help"]$tr$::jsonb, $tr$Keeping Personal Information Private$tr$),
('b9e115bc-a47c-4da7-afd1-32058ea6d149', $tr$Why is it important to shut down the computer the right way?$tr$, $tr$["It helps stop damage and losing your work", "It does not matter how you turn it off", "It does nothing to the computer", "Just turn it off right away"]$tr$::jsonb, $tr$Safely Closing Programs and the Computer$tr$),
('bb35cd53-69db-469f-a7ac-ac45aa5f5d7e', $tr$Why should you not share your password?$tr$, $tr$["It can be used to get into your account", "It is safe to share", "You must share it with friends", "There is no danger"]$tr$::jsonb, $tr$Don't Share Personal Information$tr$),
('bb50fdc1-1771-4d66-bcb6-a81d35d0b962', $tr$Who should be with you when you save a file?$tr$, $tr$["A grown-up", "No one", "Only a classmate", "A younger brother or sister"]$tr$::jsonb, $tr$Saving and Opening Files$tr$),
('bc4deb92-9300-4e93-a330-6c937f62f156', $tr$Which one is an example of safe content?$tr$, $tr$["A learning game", "A violent picture", "A request for personal information", "Content that is not right for your age"]$tr$::jsonb, $tr$Safe Content vs. Unsuitable Content$tr$),
('be971287-509e-47ca-a9fc-56514aa7ada0', $tr$Which one is NOT a browser?$tr$, $tr$["Just the Google Search bar", "Chrome", "Edge", "Safari"]$tr$::jsonb, $tr$Know the Browser and Search Engine Icons$tr$),
('bea382f1-e075-45ee-ac84-bf48614393b5', $tr$Why should you not share personal information?$tr$, $tr$["Someone with bad plans could use it", "It is always safe", "You have to do it", "There is no danger"]$tr$::jsonb, $tr$Don't Share Personal Information$tr$),
('bf2e660f-a7d8-4399-a0b4-3b61976a0f2e', $tr$What is unsuitable content like?$tr$, $tr$["Has violent or scary pictures", "Made for kids", "Teaches you things", "Approved by a parent"]$tr$::jsonb, $tr$Safe Content vs. Unsuitable Content$tr$),
('c033b986-ec66-4c67-a86b-5ac56b1088fc', $tr$Why is it important to compare information with other sources?$tr$, $tr$["To make sure it is true", "You don't need to do it", "One source is always enough", "It has no use"]$tr$::jsonb, $tr$Not Everything on the Internet Is True$tr$),
('c06eb00e-4762-412e-a06d-7550bf797f9f', $tr$Why is it important to learn early about the dangers of sharing information?$tr$, $tr$["To be responsible with technology when you grow up", "You don't need to learn it", "It is only for grown-ups", "It does not matter"]$tr$::jsonb, $tr$Don't Share Personal Information$tr$),
('c316b6f5-f98e-49ad-bc8d-b8cedb318d4d', $tr$What is an example of something to do in a simple project?$tr$, $tr$["Type a sentence and add a drawing", "Only watch TV", "Play alone", "Only read"]$tr$::jsonb, $tr$Putting Skills Together in a Project$tr$),
('c3506781-bdbd-4d85-ac97-33e16e2e3eb2', $tr$Why is not everything on the Internet true?$tr$, $tr$["Anyone can post information without checking it", "Everything on the Internet has been checked", "There is no wrong information online", "The Internet is always right"]$tr$::jsonb, $tr$Not Everything on the Internet Is True$tr$),
('c357148a-e4c2-4a0a-916d-ecb123a665ed', $tr$What is the Internet?$tr$, $tr$["A network that connects computers all over the world", "A kind of toy", "A kind of book", "A kind of scissors"]$tr$::jsonb, $tr$What Is the Internet?$tr$),
('c386d558-a6e8-48ca-9dbc-2c8796ce1073', $tr$What is an example of a search engine?$tr$, $tr$["Google", "Chrome", "Edge", "Safari"]$tr$::jsonb, $tr$Know the Browser and Search Engine Icons$tr$),
('c47b7bf0-9d77-47ee-ab4c-b1ab28476972', $tr$Which option turns off the computer the right way?$tr$, $tr$["Shut Down", "Restart again and again", "Delete", "Format"]$tr$::jsonb, $tr$Safely Closing Programs and the Computer$tr$),
('c4c630f0-ee95-4b4d-83f0-ab3d5ea92de3', $tr$Why know what the Internet is used for?$tr$, $tr$["To use it the right and responsible way", "You don't need to know it", "To get kids to use it without help", "It has no purpose"]$tr$::jsonb, $tr$What We Use the Internet For$tr$),
('c4fd6b33-0c36-4cc9-b72d-ca28c0ad28f2', $tr$What should you do if you see content that is not okay for kids?$tr$, $tr$["Close it right away and tell an adult", "Keep watching", "Share it with a friend", "Ignore it"]$tr$::jsonb, $tr$Safe Content vs. Unsuitable Content$tr$),
('c568cb05-b876-4d51-99cd-a893576ce83b', $tr$Example of personal information?$tr$, $tr$["Full name and home address", "Favorite color", "Favorite food", "Favorite game"]$tr$::jsonb, $tr$Review: The Whole Computer Term$tr$),
('c67d4126-b65a-49c6-957c-ba7ad28d2dbd', $tr$What is an example of something you can do on the Internet with a parent's help?$tr$, $tr$["Watch a learning video for kids", "Sew clothes", "Drive a car", "Cook a meal"]$tr$::jsonb, $tr$What Is the Internet?$tr$),
('c6a4201e-1111-41bb-b5a9-5f374468b2ff', $tr$Which of these is an example of using the Internet to learn?$tr$, $tr$["Watching a video about Science", "Playing with no goal", "Sharing personal information", "Talking to strangers"]$tr$::jsonb, $tr$What We Use the Internet For$tr$),
('c7570dce-d8ff-4072-a4ee-d60217ea84d3', $tr$Who should ask for permission before going online?$tr$, $tr$["The child, from a parent or teacher", "No one needs to ask for permission", "The teacher, from the child", "Nobody"]$tr$::jsonb, $tr$What Is the Internet?$tr$),
('c7f6e068-46cd-4943-9711-dc33b4b5d269', $tr$How is a browser different from a search engine?$tr$, $tr$["A browser takes you to the Internet; a search engine helps you search", "They are just the same", "There is no difference", "A search engine is only for drawing"]$tr$::jsonb, $tr$What We Use the Internet For$tr$),
('c8735c63-2207-4591-9ee2-4b29813f8301', $tr$Why is it important to ask an adult first?$tr$, $tr$["To get permission and help with using the computer", "You don't need any help", "It is always safe even without asking", "The child should just decide alone"]$tr$::jsonb, $tr$Screen Time and Asking Adults$tr$),
('c88efccd-f80a-4856-9c3a-2bc0865fad30', $tr$What is the right thing to do when you are not sure a website is safe?$tr$, $tr$["Ask a parent or teacher first", "Open it right away without asking", "Keep going on your own", "Share it with a classmate"]$tr$::jsonb, $tr$Safe Content vs. Unsuitable Content$tr$),
('c8f6c57b-c036-417b-8e5e-0f91214c2388', $tr$Which of these should you NOT do when using the computer for a long time?$tr$, $tr$["Forget your bedtime", "Take a break now and then", "Ask an adult", "Stop when it is time"]$tr$::jsonb, $tr$Screen Time and Asking Adults$tr$),
('c8fa0ee0-0ddf-439b-9c7c-b9a204b2a050', $tr$What is a good example of reporting?$tr$, $tr$["Tell a parent and show them the message", "Keep it to yourself", "Ignore the problem", "Make the problem bigger"]$tr$::jsonb, $tr$Spotting and Reporting Unsafe Situations$tr$),
('c93a7e9f-5506-401f-898b-9c374656c4fa', $tr$Why is it important to know copy and paste?$tr$, $tr$["It helps you avoid typing the same thing again", "It only makes the whole work harder", "It does not help at all", "It is only used for playing games"]$tr$::jsonb, $tr$Extra Skills: Copy, Paste, and Undo$tr$),
('c94eeeff-dcdf-4e59-9add-88503c50c62a', $tr$What do you do when you want to see your old work again?$tr$, $tr$["Open the file", "Close the computer", "Delete everything", "Start something new"]$tr$::jsonb, $tr$Saving and Opening Files$tr$),
('cb72003d-698f-4070-9498-f37b3231dda1', $tr$Why do browser icons look different?$tr$, $tr$["Different companies made each one", "All are the same", "There is no difference", "One company made them all"]$tr$::jsonb, $tr$Know the Browser and Search Engine Icons$tr$),
('cbd4f3b9-20e7-47c0-afab-5b8636dadc88', $tr$Who should you tell if someone asks for information?$tr$, $tr$["A grown-up", "No one", "Only a classmate", "A stranger online"]$tr$::jsonb, $tr$Don't Share Personal Information$tr$),
('cc84e658-d8be-4130-ae1e-dad38a2b088f', $tr$Why practice computer skills?$tr$, $tr$["To get better and feel comfortable", "You don't need to practice", "You only use it once", "It has no benefit"]$tr$::jsonb, $tr$Putting Skills Together in a Project$tr$),
('cca01d57-966d-49cf-9215-536ca1792dd2', $tr$What is a browser?$tr$, $tr$["A program used to go on the Internet", "A kind of game", "A kind of book", "A kind of scissors"]$tr$::jsonb, $tr$What We Use the Internet For$tr$),
('cd70a87f-e2c0-4d47-a5b6-4e7d47142c22', $tr$Difference between a browser and a search engine?$tr$, $tr$["Browser to go on the Internet, search engine to search", "They are just the same", "There is no difference", "Search engine for drawing"]$tr$::jsonb, $tr$What We Use the Internet For$tr$),
('cf318e3d-3e88-42e5-b087-bf861b5d75e4', $tr$Which is an EXAMPLE of personal information?$tr$, $tr$["Phone number", "Favorite color", "Favorite animal", "Favorite game"]$tr$::jsonb, $tr$Keeping Personal Information Private$tr$),
('cf843f04-4878-4cc8-b69b-a8998b8a9252', $tr$Why did we learn all these Computer topics?$tr$, $tr$["To use technology responsibly and safely", "It is not important", "To get kids to use it without help", "It has no purpose"]$tr$::jsonb, $tr$Review: The Whole Computer Term$tr$),
('d2df8ab7-e5ec-48cd-98bb-ea099b9f5a53', $tr$Who should ask for permission before going online?$tr$, $tr$["The child, from a parent or teacher", "No one needs to ask", "The teacher, from the child", "Nobody"]$tr$::jsonb, $tr$What Is the Internet?$tr$),
('d37cff1c-d6a1-4c9d-8e2a-a8dd3d96e081', $tr$Why balance screen time?$tr$, $tr$["For a healthy body and mind", "Balance is not important", "Only screen time matters", "There is no reason"]$tr$::jsonb, $tr$Screen Time and Asking Adults$tr$),
('d61fe254-0bb4-4ab8-839a-bcab9400202c', $tr$What are examples of browsers?$tr$, $tr$["Chrome, Edge, Safari", "Only Google", "Only Word", "Only Paint"]$tr$::jsonb, $tr$Know the Browser and Search Engine Icons$tr$),
('d703bdc3-9901-4f13-bbfa-f1a4367a5f0d', $tr$Why be polite online?$tr$, $tr$["It is good online manners", "It is not important", "It's okay to be rude", "It makes no difference"]$tr$::jsonb, $tr$Keeping Personal Information Private$tr$),
('d8098dc0-559d-4135-8df2-a46848a880a4', $tr$What should you do if someone asks for your personal information?$tr$, $tr$["Don't give it, and tell an adult", "Give it right away", "Answer truthfully", "Keep chatting"]$tr$::jsonb, $tr$Don't Share Personal Information$tr$),
('d862b927-a2ba-4bdb-84ec-89931d49d074', $tr$What is copy?$tr$, $tr$["Making a copy of the text or picture you picked", "Removing text for good", "Printing the whole document", "Closing the program"]$tr$::jsonb, $tr$Extra Skills: Copy, Paste, and Undo$tr$),
('d87f678a-d92c-438c-ba95-2434172c86a8', $tr$Why learn to shut down the right way from Grade 3?$tr$, $tr$["It is a basic skill for taking care of things you use", "You don't need to learn it", "It is only for grown-ups", "It has no use"]$tr$::jsonb, $tr$Safely Closing Programs and the Computer$tr$),
('d97b81ca-88c6-485e-a084-7be0f5df7fab', $tr$What do you use to keep a record of a scary message?$tr$, $tr$["Screenshot", "Breaking the computer", "Throwing away the computer", "Nothing, you don't need to keep a record"]$tr$::jsonb, $tr$Spotting and Reporting Unsafe Situations$tr$),
('d9fcf302-2b3a-41f7-8cd0-688b376908c9', $tr$Why know keyboard shortcuts?$tr$, $tr$["They make computer work faster", "You don't need to know them", "They have no use", "They are only for grown-ups"]$tr$::jsonb, $tr$Not Everything on the Internet Is True$tr$),
('da8f2521-e1bb-4c17-86a4-b0cc33f79d78', $tr$Which is an example of a simple sentence about yourself?$tr$, $tr$["I am in Grade 2.", "The sky is blue.", "Dogs like to run.", "It is raining today."]$tr$::jsonb, $tr$Word Processing and Typing Simple Sentences$tr$),
('db40f85e-9d05-4c5d-987f-d89f2892b53f', $tr$Why do we learn this topic in Grade 2?$tr$, $tr$["To know what to do in a dangerous situation", "It doesn't need to be taught", "To get kids to go online alone", "It has no goal"]$tr$::jsonb, $tr$Spotting and Reporting Unsafe Situations$tr$),
('dc66aa43-6bde-4ac6-b17a-d090f925e984', $tr$Why report an unsafe situation?$tr$, $tr$["To keep everyone safe online", "It has no use", "It is embarrassing to do", "It is not needed"]$tr$::jsonb, $tr$Spotting and Reporting Unsafe Situations$tr$),
('dcc40a68-829c-4f23-a406-da315e73d3af', $tr$What should you do before giving personal information online?$tr$, $tr$["Ask a parent for permission", "Give it right away", "You don't need permission", "Share it with everyone"]$tr$::jsonb, $tr$Keeping Personal Information Private$tr$),
('de6ff3c9-42f2-4016-8b0b-3eef058e74a6', $tr$What is the most important lesson about using the Internet?$tr$, $tr$["Always ask an adult for help when something bad happens", "You don't need an adult's help", "Everything online is always safe", "Reporting is not important"]$tr$::jsonb, $tr$Spotting and Reporting Unsafe Situations$tr$),
('e1140f1e-4f5b-4b36-acf1-59c3a51a6642', $tr$What should you do before using the Internet?$tr$, $tr$["Ask a parent for permission", "Use it alone right away", "Don't ask anymore", "Do it when no adult is around"]$tr$::jsonb, $tr$What Is the Internet?$tr$),
('e22584da-b152-493a-8203-4e7b3bc82054', $tr$What is an example of an unsafe situation online?$tr$, $tr$["Someone uses bad words or asks for personal information", "Someone teaches a lesson", "Someone shows a picture of an animal", "Someone plays a learning game"]$tr$::jsonb, $tr$Spotting and Reporting Unsafe Situations$tr$),
('e3504794-d0b5-45a3-8e00-a303cc2b4103', $tr$Why did we learn these Computer topics?$tr$, $tr$["To be responsible and safe with technology", "It is not important", "To get kids to use it without help", "It has no purpose"]$tr$::jsonb, $tr$Review: The Whole Computer Term$tr$),
('e3731f15-f460-4d07-b600-3a3a13871930', $tr$Why is it important to use copy and paste when making the last fixes to your project?$tr$, $tr$["So you don't have to type the same thing again", "It only makes the work harder", "It does not help at all", "It is only used for playing"]$tr$::jsonb, $tr$Checking and Showing Your Project$tr$),
('e396be75-7d95-427c-8fd9-44f4b71095f9', $tr$Why should you not go online without an adult's help, even for a project?$tr$, $tr$["To make sure you stay safe and use it the right way", "That is not needed", "It is always safe", "The child should just decide alone"]$tr$::jsonb, $tr$Putting Skills Together in a Project$tr$),
('e42fbb82-6fc3-490b-b897-f55e8d8dddef', $tr$What should you do if someone online asks for your personal information?$tr$, $tr$["Don't give it and tell an adult", "Give it right away", "Answer truthfully", "Keep chatting"]$tr$::jsonb, $tr$Spotting and Reporting Unsafe Situations$tr$),
('e443a319-cb74-449f-98a5-20e6bdb87aa0', $tr$What will happen if you have too much screen time?$tr$, $tr$["It can hurt your eyes and health", "It is always good", "It has no effect on your health", "It makes your eyes stronger"]$tr$::jsonb, $tr$Screen Time and Asking Adults$tr$),
('e45d4279-da8f-4be6-b2d9-078300708f60', $tr$What should you do if something unsafe happens online?$tr$, $tr$["Tell an adult right away", "Just keep it a secret", "Ignore it", "Only tell a friend"]$tr$::jsonb, $tr$Review: The Whole Computer Term$tr$),
('e4d7ac9b-e62c-434f-b924-3c9b904a5c3a', $tr$Why do you need an adult's help online?$tr$, $tr$["To help choose safe things", "It is not needed", "Everything is always safe", "The child should just decide alone"]$tr$::jsonb, $tr$What Is the Internet?$tr$),
('e78bd349-7787-4681-966b-3da53a5fb595', $tr$What is the first step before you turn off the computer?$tr$, $tr$["Save all your work", "Turn it off right away", "Forget your work", "Unplug it right away"]$tr$::jsonb, $tr$Safely Closing Programs and the Computer$tr$),
('e895b325-f674-4e7e-bc22-58d5b1496450', $tr$A use of the Internet?$tr$, $tr$["Looking up information", "Only watching TV", "Cooking", "Traveling to another country"]$tr$::jsonb, $tr$Review: The Whole Computer Term$tr$),
('e98eb51e-9145-4179-8ef1-5f3f87002752', $tr$Why do you need to choose 'Shut Down' instead of just cutting off the power?$tr$, $tr$["It helps stop damage and losing your work", "There is no difference", "Just turn it off right away", "It does not matter how you turn it off"]$tr$::jsonb, $tr$Review: The Whole Computer Term$tr$),
('ea1593cb-317a-431f-8480-abca0f9b1e9a', $tr$How many steps to shut down the right way?$tr$, $tr$["Four", "One", "Ten", "None"]$tr$::jsonb, $tr$Safely Closing Programs and the Computer$tr$),
('eac8ad6c-5c59-4aa4-b03b-93230868c132', $tr$What should you do if you are not sure who is asking for information?$tr$, $tr$["Still don't give it, and ask an adult", "Just give it", "Ignore it", "Keep chatting"]$tr$::jsonb, $tr$Don't Share Personal Information$tr$),
('eac8c749-5777-4b31-b353-2423fe574380', $tr$What is one use of the Internet?$tr$, $tr$["Looking up information", "Only watching TV", "Cooking food", "Traveling to another country"]$tr$::jsonb, $tr$What We Use the Internet For$tr$),
('ec79c14e-4f6d-4a1d-af4b-a3e8a0d409f7', $tr$What is part of 'good online manners'?$tr$, $tr$["Being polite online", "Being rude online", "Sharing everything", "Staying away from everyone"]$tr$::jsonb, $tr$Keeping Personal Information Private$tr$),
('ed2c2751-96a1-4688-97f8-64974bc73d2f', $tr$Which of these is NOT a browser?$tr$, $tr$["Just the Google Search bar (this is not a browser)", "Chrome", "Edge", "Safari"]$tr$::jsonb, $tr$Know the Browser and Search Engine Icons$tr$),
('edbfb10b-67ad-4ce6-9a9f-4eaec077f523', $tr$Who should you tell if you see content that is not okay for kids?$tr$, $tr$["An adult", "No one", "Only a classmate", "A stranger online"]$tr$::jsonb, $tr$Safe Content vs. Unsuitable Content$tr$),
('f025e593-216a-4bfd-aa3a-53ec791e2467', $tr$How can the Internet help people talk to each other?$tr$, $tr$["You can talk with family far away", "It plays no part in talking to others", "It stops people from talking", "It is only for fun"]$tr$::jsonb, $tr$What We Use the Internet For$tr$),
('f205c788-4856-4ab6-871b-d0bc9509b3cc', $tr$Who should be with you when you save?$tr$, $tr$["A grown-up", "No one", "Only a classmate", "A younger brother or sister"]$tr$::jsonb, $tr$Saving and Opening Files$tr$),
('f3a88825-02db-4001-9437-5e4e07896187', $tr$What is the goal of putting skills together in a project?$tr$, $tr$["To show the skills you learned in one task", "It has no goal", "Just to use up the time", "To get kids to have more screen time"]$tr$::jsonb, $tr$Putting Skills Together in a Project$tr$),
('f3c3ebb4-0f43-44c8-8103-45375f7aa3b6', $tr$Which should you NOT do when using the computer for a long time?$tr$, $tr$["Forget your bedtime", "Take a break", "Ask an adult", "Stop when it is time"]$tr$::jsonb, $tr$Screen Time and Asking Adults$tr$),
('f529a199-0cb5-4905-85fa-9405dd2fee3a', $tr$Why do we need to limit screen time?$tr$, $tr$["Too much can hurt your eyes and body", "There is no reason", "Long screen time is always good", "It doesn't need a limit"]$tr$::jsonb, $tr$Screen Time and Asking Adults$tr$),
('f5555d86-b14f-4961-af5c-203f22276e52', $tr$Why is it important to save your work?$tr$, $tr$["So it is not lost even when the computer is turned off", "To make your work more colorful", "It is not important", "So your work finishes by itself"]$tr$::jsonb, $tr$Saving and Opening Files$tr$),
('f73867a1-b654-41e1-a0b2-296e2d75d2f6', $tr$What should you do if someone asks for your personal information?$tr$, $tr$["Don't give it, tell an adult", "Give it right away", "Answer truthfully", "Keep chatting"]$tr$::jsonb, $tr$Spotting and Reporting Unsafe Situations$tr$),
('f7b606ac-8c43-4525-8951-af002d64ce75', $tr$Why choose the folder where you keep the file?$tr$, $tr$["So you know where to find it again", "You don't need to choose", "It is always the same place", "It has no use"]$tr$::jsonb, $tr$Saving and Opening Files$tr$),
('f7d78c05-5b3a-4b8b-8253-673437fab195', $tr$What do you do before you unplug it?$tr$, $tr$["Make sure the computer is off", "Unplug it right away", "You don't need to check anything", "Unplug it while it is on"]$tr$::jsonb, $tr$Safely Closing Programs and the Computer$tr$),
('f8380b6a-35f2-4332-9493-78cc45941e70', $tr$Why put computer skills together?$tr$, $tr$["To make a complete project", "It has no use", "You don't need to do it", "To entertain the teacher"]$tr$::jsonb, $tr$Putting Skills Together in a Project$tr$),
('f861e342-e500-473a-a1ef-340e19a919d0', $tr$What should you do before going online?$tr$, $tr$["Ask a parent or teacher", "Go right away", "Don't ask anymore", "Do it when no adult is around"]$tr$::jsonb, $tr$Screen Time and Asking Adults$tr$),
('f9a92b62-520f-4827-b20a-4f70a74398e3', $tr$How can you check if a piece of information online is true?$tr$, $tr$["See if it comes from a well-known website", "Just believe it right away", "Share it with others right away", "Don't check it at all"]$tr$::jsonb, $tr$Not Everything on the Internet Is True$tr$),
('f9b7d409-6eec-44e3-b8a1-4428b7145656', $tr$Why not use the computer without permission?$tr$, $tr$["To make sure what you see is safe", "That is not needed", "It is always safe", "The child should just decide alone"]$tr$::jsonb, $tr$Screen Time and Asking Adults$tr$),
('f9eaa7b3-e31c-43be-a4e8-b99a37cb9fd4', $tr$What does kid-friendly mean?$tr$, $tr$["Things that are right for kids", "Only for adults", "Dangerous things", "Empty"]$tr$::jsonb, $tr$What Is the Internet?$tr$),
('faa81102-d57d-484a-b09a-d14b1c1bf9a1', $tr$Why did we learn this topic?$tr$, $tr$["To learn to balance how we use the computer", "It is not important", "To get kids to have more screen time", "It has no goal"]$tr$::jsonb, $tr$Screen Time and Asking Adults$tr$),
('fac0b8da-7fec-495d-be17-56dd6615efdd', $tr$Why should you not use the computer without an adult's permission?$tr$, $tr$["To make sure what you see and how long you use it are safe", "That is not needed", "It is always safe even without help", "The child should just decide alone"]$tr$::jsonb, $tr$Screen Time and Asking Adults$tr$),
('faf54760-8152-4255-880b-3de9a32b8c8a', $tr$Why should you never share your password with anyone?$tr$, $tr$["It could be used to get into your account", "It is safe to share", "You must share it with friends", "There is no danger"]$tr$::jsonb, $tr$Don't Share Personal Information$tr$),
('fb5963a9-1ced-424b-802c-eea776fb09ae', $tr$Why is it important to put computer skills together?$tr$, $tr$["To make one complete project", "It has no use", "You don't need to do it", "Just to entertain the teacher"]$tr$::jsonb, $tr$Putting Skills Together in a Project$tr$),
('fb7b263d-f9b7-488a-ab72-0622ed5d38b9', $tr$First step before you turn off the computer?$tr$, $tr$["Save your work", "Turn it off right away", "Forget your work", "Unplug it"]$tr$::jsonb, $tr$Review: The Whole Computer Term$tr$),
('fbdd8735-90c5-4b11-8c2c-64bc4c356f45', $tr$What is the benefit of balanced screen time?$tr$, $tr$["Healthy eyes, body, and life", "No benefit", "It makes you learn faster", "It only gives you higher scores"]$tr$::jsonb, $tr$Screen Time and Asking Adults$tr$),
('fcfafbba-c48a-4ef3-a505-7ace6e6acb61', $tr$Shape of the Chrome icon?$tr$, $tr$["A circle with four colors", "A black square", "A green triangle", "A yellow star"]$tr$::jsonb, $tr$Know the Browser and Search Engine Icons$tr$),
('ffcd0d50-d026-4091-a9f1-411dfa397f10', $tr$Why is it important to save the file before closing the program?$tr$, $tr$["So the work you finished is not lost", "It is useless", "Only to close it faster", "To delete the whole file"]$tr$::jsonb, $tr$Checking and Showing Your Project$tr$);

do $$
declare
  v_bad int;
begin
  select count(*) into v_bad
  from _cmp_question t join public.content_questions cq on cq.id = t.id
  where jsonb_array_length(cq.options) <> jsonb_array_length(t.options)
     or not exists (select 1 from jsonb_array_elements_text(cq.options) o where o = cq.correct_answer);
  if v_bad > 0 then
    raise exception 'Computer translation: % main-quest question(s) do not line up with their translation', v_bad;
  end if;

  select count(*) into v_bad
  from _cmp_boss t join public.draft_questions dq on dq.id = t.id
  where jsonb_array_length(dq.options) <> jsonb_array_length(t.options)
     or not exists (select 1 from jsonb_array_elements_text(dq.options) o where o = dq.correct_answer);
  if v_bad > 0 then
    raise exception 'Computer translation: % boss question(s) do not line up with their translation', v_bad;
  end if;
end $$;

update public.content_quizzes cq
set summary_markdown = t.summary_markdown
from _cmp_quiz t
where cq.id = t.id and cq.subject = 'Computer';

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
from _cmp_question t
where cq.id = t.id
  and exists (select 1 from public.content_quizzes z where z.id = cq.content_quiz_id and z.subject = 'Computer');

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
from _cmp_boss t
where dq.id = t.id and dq.subject = 'Computer';

update public.draft_summaries ds
set summary_markdown = t.summary_markdown
from _cmp_draft_summary t
where ds.id = t.id and ds.subject = 'Computer';

drop table if exists _cmp_quiz, _cmp_question, _cmp_boss, _cmp_draft_summary;
