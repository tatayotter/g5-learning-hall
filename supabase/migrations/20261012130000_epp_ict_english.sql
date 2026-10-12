-- EPP (ICT) in English. Rewrites the Grade 4-6 EPP (ICT) lessons, main-quest questions and
-- boss-fight questions that were written in Filipino (or a Filipino/English mix) in plain,
-- kid-friendly English. EPP (AFA/FCS/IA) stays in Filipino on purpose and is not touched.
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
-- whose subject is EPP (ICT) are updated. Rows that don't exist (an empty CI database) are
-- skipped, and re-running is a no-op.
--
-- Devices pick up the change on their own: lessons and main quests through /api/content
-- (5-minute cache), boss questions through boss_bank_signature (20261012070000).

drop table if exists _ict_quiz, _ict_question, _ict_boss, _ict_draft_summary;
create temp table _ict_quiz (id uuid primary key, summary_markdown text not null);
create temp table _ict_question (id uuid primary key, prompt text not null, options jsonb not null);
create temp table _ict_boss (id uuid primary key, question text not null, options jsonb not null, topic text);
create temp table _ict_draft_summary (id uuid primary key, summary_markdown text not null);

insert into _ict_quiz values
('03f35dbc-5e8b-4117-907e-b73d8ec6b604', $tr$# 💻 Friday — Weekly Practice: EPP (ICT)

Quick review!

- Sit up **straight**, with the screen at eye level
- Take a break every **20-30 minutes**

You are learning very well! 🌟$tr$),
('04cb600d-b95b-4f11-8032-24a68eb9a3a6', $tr$# EPP (ICT) — Introduction to Desktop Publishing

**Desktop publishing** means making **nice documents with a design**, like **posters, cards, flyers, and certificates**. Example programs: **Microsoft Publisher**, **Canva**.

## Parts of the Screen
- **Page area** — where your design goes
- **Pages pane** — the list of pages
- **Ribbon** — Home, Insert, Page Design

## Templates
A **template** is a **ready-made design**. You just change the words and pictures to your own.
- Faster to make
- The colors and fonts are already arranged nicely

## Adding Content (Insert)
| Command | Use |
|---|---|
| **Text Box** | write anywhere |
| **WordArt** | fancy title |
| **Shapes** | shapes and decorations |
| **Pictures** | pictures |

## Sample Project: School Poster
1. Choose a **poster template**
2. Change the **title** (WordArt)
3. Add the **date and place** (Text Box)
4. Add a **picture** and **shapes**
5. **Save** and print

**Key words:** desktop publishing, template, poster, flyer
$tr$),
('0630ba78-e285-43ad-86b1-72f64e486e77', $tr$# 🖥️ Friday Review — EPP (ICT) (Grade 5)

- **Slide** = one page of a presentation
- **Animation** (inside a slide) vs **Transition** (moving to the next slide)
- **Insert tab** for audio/video
- Don't use too much animation — it is distracting

Great job! 🌟$tr$),
('06e36312-8575-4ad7-adcf-31af21b201e9', $tr$# 👣 EPP (ICT) — Digital Footprint Awareness

Grade 4, Week 26! Let's learn about the "digital footprint." 👣

## 🔄 Review
We learned about simple spreadsheet data.

## 👣 What Is a Digital Footprint?
A **digital footprint** is the trail we leave on the Internet — the photos, messages, and comments we share.

## ⚠️ Why Do We Need to Be Careful?
Anything we put online can **stay there forever**, even if we delete it.

## ✅ How to Keep a Positive Digital Footprint
- Think before you post
- Do not say hurtful words online
- Keep your personal information private

**Key words:** digital footprint, online, positive, thinking before posting$tr$),
('07a17c0b-c518-429c-ace9-390f869ee6d3', $tr$# 💻 Friday Review — EPP ICT (Grade 6)

- Algorithms and flowcharts
- Sequence, loops, and if-then statements

Great job! 🌟$tr$),
('0c06c42b-8238-4f7c-8704-e8b7fd92fcd5', $tr$# EPP (ICT) — Getting to Know the Word Processor

Term 2 has started, Grade 4! This term, we will make a **word document**, a **presentation**, and **desktop publishing** projects.

## What Is a Word Processor?
A **word processor** is a program for writing and arranging **documents**, like letters, essays, and reports. Examples: **Microsoft Word**, **Google Docs**.

## Parts of the Screen (User Interface)
| Part | Use |
|---|---|
| **Title bar** | shows the file name |
| **Ribbon** | holds the commands, grouped into **tabs** |
| **Document area** | where you type |
| **Cursor** | the blinking line where the letters will appear |
| **Scroll bar** | moves up or down the page |

## Important Commands
- **Save** (Ctrl + S) — keep your work
- **Undo** (Ctrl + Z) — take back a mistake
- **Enter** — new line or paragraph

**Key words:** word processor, ribbon, tab, cursor, document
$tr$),
('0cf8f925-46fd-45d1-bc6f-cbe0e64208e5', $tr$# EPP (ICT) — Shapes and Images in a Presentation

A slide is easier to understand when it has **pictures** and **shapes**.

## Images (Pictures)
1. **Insert → Pictures**
2. Choose a picture from the computer
- Make it bigger or smaller using the **corner handles** so it doesn't get stretched
- **Crop** — remove the parts you don't need

## Shapes
1. **Insert → Shapes**
2. Choose: circle, box, star, arrow
3. Drag it onto the slide
- **Shape Fill** — the color inside
- **Shape Outline** — the color of the edge
- You can type **inside** a shape

## Arranging
- **Bring Forward / Send Backward** — put it in front or behind
- Drag to move it

## Respect the Owner
- Use your own pictures or ones that are **free to use**
- Write **where the picture came from**

**Key words:** pictures, shapes, crop, shape fill, shape outline
$tr$),
('0d76668c-ebcc-4f1a-89a0-50d2bf74eefe', $tr$# 🖊️ EPP (ICT) — Editing and Improving Your Digital Portfolio

Grade 5, Week 19! Let's look back at our projects and make them better. 🖥️

## 🔍 Why Is It Important to Review Your Own Work?
**Reviewing** your own project helps you **find the things that need to be improved** before you show it to others.

## ✅ Digital Portfolio Review Checklist
| Question | Purpose |
|---|---|
| Is the layout clear? | Makes sure it is easy to read |
| Are the spelling and grammar correct? | Makes sure it looks professional |
| Do the pictures fit the content? | Makes sure of relevance |
| Are there enough details? | Makes sure it is complete |

## 🤝 Listening to Feedback from Others (Peer Feedback)
**Accepting feedback** from a classmate or teacher helps **improve** a project — don't be ashamed of it; take it as help.

## ✏️ Making Changes
After getting feedback, make **changes** — like changing the font, adding a picture, or fixing the grammar.

## 🧠 Example 1
*Your classmate said that a picture in your brochure is blurry. What is the right thing to do?*
- **Replace the picture** with a clearer version.

## 🧠 Example 2
*Why is it important to accept feedback from others about your project?*
- Because it helps **improve** the quality of your work.

## 💡 Conclusion
Reviewing and improving our digital portfolio shows **professionalism and effort** in our work.

Great job! 🌟$tr$),
('0e3ec3a9-ca58-46fc-b364-a8d98387bf8e', $tr$# 💻 Friday — Weekly Practice: EPP (ICT)

Quick review!

- Cover the keyboard when you are not using it
- Wipe the screen with a dry cloth

You are learning very well! 🌟$tr$),
('102cb1ea-85ef-437f-b749-df91dc093c2b', $tr$# Friday Review — EPP (ICT) (Grade 4)

- **Desktop publishing** = poster, card, flyer, certificate
- **Template** = ready-made design
- **Insert**: Text Box, WordArt, Shapes, Pictures
- Save and print

Great job in ICT!
$tr$),
('1277b73d-56de-42d7-a3b1-a0609910666d', $tr$# 📊 Friday Review — EPP (ICT) (Grade 4)

- Spreadsheet: rows, columns, cells

Great job in ICT! 🌟$tr$),
('12926d7f-aa6a-4b30-a8a7-898a1e6b3997', $tr$# 💻 EPP (ICT) — Week 9: Term Review!

Let's look back at what we learned about online tools! 🖥️

## 🖥️ Summary of What We Learned
- **Web conferencing** — meeting online safely
- **Online forms** — making a survey or form while respecting privacy
- **Cloud storage** — storing and sharing files

## 🎯 Next Term
- We will learn about **productivity software** — making word documents and presentations!

What a great term of learning about ICT! 🌟$tr$),
('15c0b9f6-9444-429e-b51b-30c597421fef', $tr$# 💻 Friday — Weekly Practice: EPP (ICT)

Quick review!

- What we learned: **web conferencing, online forms, cloud storage**

Great studying! 🌟$tr$),
('1b83007b-877d-43ef-9152-91f03b9f5f7a', $tr$# 🔍 Friday Review — EPP (ICT) (Grade 4)

- Using search engines responsibly

Great job in ICT! 🌟$tr$),
('21d34c5b-1fa2-4286-965d-1ecdcf87d235', $tr$# 💻 Computer Room Rules

Before we start our ICT lesson, let's review the rules! 🖥️

## 📏 The Rules
- **Clean your hands** before using the keyboard and mouse.
- **Be careful** when handling the equipment.
- **No food or drinks** near the computer.

## 🙋 Why Are the Rules Important?
- They protect the school's expensive equipment and keep every student safe.

## 💡 Simple Reminder
- Ask your teacher for help if you don't understand something.

Are you ready to learn about ICT safely and responsibly? 🌟$tr$),
('225c3242-e945-4a57-ab76-c1c4ce8b2f79', $tr$# 🎬 EPP (ICT) — Review: Presentation and Multimedia

Grade 4, Week 24! Let's review how to make a good presentation. 🎬

## 🔄 Review
We learned about online security.

## 🎬 Parts of a Good Presentation
- **Clear text** — not too much on one slide
- **Fitting pictures** — they support the message
- **Few transitions** — so it isn't distracting

## 🖥️ Multimedia in a Presentation
You can add **photos, sounds, or short videos** to make a presentation more interesting.

## 💡 Why Is This Important?
A good presentation helps share a message clearly with the audience.

**Key words:** presentation, multimedia, transition, message$tr$),
('2427f557-74e4-4368-a48f-e30b510b81da', $tr$# 💻 Friday — Weekly Practice: EPP (ICT)

Quick review!

- Do not share **personal information** online
- Tell your parents if you see something strange

Stay safe online! 🌟$tr$),
('2659c21d-4a6f-4b78-bf49-f4ff528a0d4a', $tr$# EPP (ICT) — Textbox and WordArt in a Presentation

## Textbox
A **textbox** is a box you can write in **anywhere** on the slide.
1. **Insert → Text Box**
2. Click and drag on the slide
3. Type your words
- You can move it by dragging the **edge** of the box
- You can make it bigger or smaller using the **handles** (the small circles on the edges)

## WordArt
**WordArt** is **colorful, fancy text** for titles.
1. **Insert → WordArt**
2. Choose a style
3. Type your words
- Use it only for the **title**, not for all the text

## Formatting Text
- **Home tab**: font, size, color, bold, alignment
- **Shape Format tab**: **Text Fill** (the color inside the letters), **Text Outline** (the edge of the letters), **Text Effects** (shadow, glow)

## Reminder
Easy to read comes before pretty!

**Key words:** textbox, WordArt, handles, text fill, text effects
$tr$),
('287a5214-819c-42da-9ae8-f3c429f5ae21', $tr$# 🧮 Friday Review — EPP (ICT) (Grade 5)

- SUM and AVERAGE formulas

Great job in ICT! 🌟$tr$),
('28ca7452-88b6-4d37-9b16-b7e82ddc06b2', $tr$### 🎯 Today's Focus
* **Netiquette:** Good manners on the internet, like using **polite words** and protecting your **privacy** (don't share your password).
* **Web Browser:** A program used to go on the internet; you type the URL in the **Address Bar**.
* **Search Engines:** Help you search for information; use the right **keywords** for faster and more correct results.
* **Information Verification:** Before you believe it, you must **verify** first if the information you found online is true.

---

### 👀 Tomorrow's Sneak Peek
* **Safe E-mailing:** We will learn how to send **attachments** the right way and how to use **CC and BCC**.$tr$),
('2abb6121-d391-4235-969c-f2c01d4390c1', $tr$# 💻 EPP (ICT) — Week 5: More Mouse and Keyboard Skills!

Let's keep building our computer skills! ⌨️

## 🖱️ Mouse Skills
- **Drag-and-drop** — pulling an item from one place to another.
- Being **accurate** is important when using the mouse.

## ⌨️ Keyboard Skills
- Use the correct finger for each key so you can type faster and more accurately.

## 🔍 Practice
- Practice every day to improve your speed and accuracy.

Practice is the key to success! 🌟$tr$),
('2eba8d90-c5ea-4af5-a2f3-5095a7bdce6a', $tr$# 💻 Friday — Weekly Practice: EPP (ICT)

Quick review!

- **Web conferencing** = meeting online
- Only use a **trusted link**

Great studying! 🌟$tr$),
('3209025f-354b-44cc-8957-07c508a15322', $tr$# 💻 EPP (ICT) — Week 8: Uploading and Using Your Skills!

Let's learn how to upload files to the cloud! ⬆️

## ⬆️ Uploading Files
- Drag or select the file to upload it to your cloud storage account.
- Give it a **clear name** so it is easy to find.

## 🗂️ Organizing
- Make folders by **topic or date** so things stay neat.

## 🔍 Example
- Upload your project to the "Social Studies Folder" so your teacher can find it easily.

Uploading and organizing well makes your work easier! 🌟$tr$),
('355bec20-da96-4af7-adbb-e173e6af011e', $tr$# 💻 EPP (ICT) — Review: Digital Citizenship and Software

Grade 4, Week 21! Let's review the ICT skills we have learned. 💻

## 🔄 Review
We learned about word processing, presentation, and spreadsheet software.

## 💻 Digital Citizenship Recap
- Watch your **screen time** and posture
- Follow the **online safety** rules
- Keep your personal information private

## 🖥️ Software Recap
- **Word Processing** — typing and formatting documents
- **Presentation** — making slides
- **Spreadsheet** — organizing data in cells
- **Desktop Publishing** — creating posters or newsletters

**Key words:** digital citizenship, word processing, presentation, spreadsheet$tr$),
('37244855-15d7-4c63-8fc9-f26c2c00af88', $tr$# 💻 EPP (ICT) — Week 6: Correct Posture and Time When Using a Computer!

Let's learn the right way to use a computer! 🖥️

## 🪑 Correct Posture
- Sit up straight, just like we learned in Grade 3.
- Keep the screen at **eye level** and about an arm's length **away**.

## ⏰ Correct Time
- Do not use the computer for a **long time** without a break.
- Take a break every **20-30 minutes**.

## 🔍 Why Is This Important?
- It protects our **eyes and body** from getting tired.

Practice good posture and time limits when using the computer! 🌟$tr$),
('3b159c91-042c-4a48-9c2e-9c9e028e7f70', $tr$# 🔐 Friday Review — EPP (ICT) (Grade 5)

- Strong passwords and online safety

Great job in ICT! 🌟$tr$),
('3beddae9-5e02-42c8-b376-a3ae176b1c1f', $tr$# 📊 EPP (ICT) — Introduction to Simple Spreadsheet Data

Grade 4, Week 25! Let's learn how to organize data in a spreadsheet. 📊

## 🔄 Review
We learned how to make a presentation.

## 📊 What Is a Spreadsheet?
A **spreadsheet** is a program with a grid of **rows** (going across) and **columns** (going down), used to organize data.

## 🧮 Simple Uses
- Recording grades in each subject
- Counting spending for one week
- Making a simple data table

## 📈 Connection to Math
Data organized in a spreadsheet can be used to make a **table or line graph**, just like we learned in Math.

**Key words:** spreadsheet, row, column, data, table$tr$),
('3c2cd593-2f25-4eea-846f-375c742366f1', $tr$# 💻 Friday — Weekly Practice: EPP (ICT)

Quick review!

- **Desktop** = big, not portable | **Laptop** = portable
- **Tablet** and **Smartphone** — different uses

You are learning very well! 🌟$tr$),
('3de707db-5ed5-4878-92e1-b9b20b7fd40d', $tr$# 💻 EPP (ICT) — Week 2: Web Conferencing Etiquette!

Let's learn good manners for video calls! 📹

## 📹 Proper Manners in a Video Call
- Mute your microphone when you are not speaking to avoid noise.
- Be **on time** — don't be late.

## 🔒 Privacy and Safety
- Avoid showing personal information in your background.
- Don't share the meeting link with people who should not join.

## 🔍 Why Is This Important?
- Good manners in a video call show **respect** for others.

Be responsible in every online meeting! 🌟$tr$),
('3fa35bf6-d973-4f35-b3d8-b8b970ce14d0', $tr$# 💻 EPP (ICT) — Week 8: Term Review!

Let's review what we learned about computers! 🖥️

## 🖥️ Summary of What We Learned
- **Parts of a computer**: monitor, keyboard, mouse, CPU, speakers, peripherals
- **Basic operations**: booting, shutting down, keyboarding, mouse techniques
- **Safety**: correct posture/time, Internet rules

## 🎯 Digital Project
- Make a simple document that shows everything you learned.

## 🌟 Next Term
- We will learn **word processing and presentation software**!

Great term of learning about ICT! 🌟$tr$),
('45031cb6-af9d-453d-9e06-7c5292d5be55', $tr$# Friday Review — EPP (ICT) (Grade 4)

- **Word processor** = a program for documents
- **Ribbon** and **tabs** = the commands
- **Ctrl + S** save, **Ctrl + Z** undo

Great job in ICT!
$tr$),
('46144d5f-2272-4aed-a6ea-200ea862564a', $tr$# 💻 Friday — Weekly Practice: EPP (ICT)

Quick review!

- What we learned: web conferencing, online forms, cloud storage
- Next: productivity software

Great term! 🌟$tr$),
('49bb55a6-dcd9-4225-81ca-1525c1de8037', $tr$# 👣 Friday Review — EPP (ICT) (Grade 4)

- Digital footprint awareness

Great job in ICT! 🌟$tr$),
('4d3ff145-81cd-4f8c-b9d8-687796895e67', $tr$# EPP (ICT) — Getting to Know Presentation Software

A **presentation** is made of **slides** that show ideas to an audience. Examples: **PowerPoint**, **Google Slides**.

## Parts of the Screen
| Part | Use |
|---|---|
| **Slide pane** | small pictures of all the slides, on the left |
| **Slide area** | the big slide you are working on |
| **Ribbon** | Home, Insert, Design, Transitions... |
| **Placeholder** | a box that says "Click to add title" |

## Making a Slide
- **Home → New Slide** — add a slide
- **Layout** — how the boxes are arranged (Title Slide, Title and Content, Blank)

## Page Design or Theme
A **theme** is a ready-made design with a **background, colors, and fonts**.
- **Design tab → Themes** — choose a theme
- Use just one theme so all the slides look **the same**

## Showing It
- **F5** — start the slide show
- **Esc** — end it

**Key words:** slide, presentation, theme, layout, placeholder
$tr$),
('4eec4f74-6988-427e-b415-c2922261b279', $tr$# 💻 Friday — Weekly Practice: EPP (ICT)

Quick review!

- **Clean your hands** before using the equipment
- Be **responsible** when using the Internet

You're ready to learn about ICT! 🌟$tr$),
('4fda454b-cd2b-4d58-8dff-ee5002c58c3c', $tr$# EPP (ICT) — Font and Text Alignment

Make your document nice and easy to read using the **Home** tab.

## Font
| Part | Example |
|---|---|
| **Font type** | Arial, Calibri, Times New Roman |
| **Font size** | 12 for text, bigger for titles |
| **Font style** | **Bold** (Ctrl + B), *Italic* (Ctrl + I), Underline (Ctrl + U) |
| **Font color** | black, blue, red... |

## Text Alignment
- **Align Left** — lined up on the left (most common)
- **Center** — in the middle (for titles)
- **Align Right** — lined up on the right (e.g. the date)
- **Justify** — even on both the left and right

## Reminder
- **Select** (highlight) the text **first** before changing it
- Use fonts and colors that are **easy to read**
- Don't use too many fonts and colors

**Key words:** font, bold, italic, underline, alignment, center
$tr$),
('50e015b4-9efc-400d-bd5c-060f3109b284', $tr$# 💻 EPP (ICT) — Week 1: Why Are Computers Important?

Let's learn why computers are important in our lives! 🖥️

## 💡 Why Computers Matter
- Computers help with **work, school, communication, and entertainment**.
- They are used at home, in school, and in business.

## 📱 Other Computing Devices
- **Laptop, tablet, smartphone** — these are all kinds of computing devices.

## 🔍 Examples in Everyday Life
- We use computers to make projects, video call our family, and search for information.

Computers are important in modern life! 🌟$tr$),
('51748ce6-f790-4b6f-b4d9-77cad0db7be8', $tr$# 🖊️ Friday Review — EPP (ICT) (Grade 5)

- Reviewing and improving your digital portfolio using peer feedback

Great job! 🌟$tr$),
('53658783-89fc-4dc5-8c95-46fd63b41dcf', $tr$# EPP (ICT) — Page Size, Orientation, and Margin

Before writing, set up the **page** first in the **Layout** tab.

## Page Size (Paper Size)
- **A4** — the usual paper in school
- **Letter** and **Legal** — other sizes; Legal is longer

## Orientation (Direction of the Paper)
| Type | Looks like | Use |
|---|---|---|
| **Portrait** | upright, tall | letters, reports, essays |
| **Landscape** | sideways, wide | certificates, timelines, banners |

## Margin
The **margin** is the **blank space** around the page: top, bottom, left, right.
- **Normal** — the usual size
- **Narrow** — small margins, more space for text
- **Wide** — big margins

## How?
**Layout → Size**, **Layout → Orientation**, **Layout → Margins**

**Key words:** page size, portrait, landscape, margin
$tr$),
('53840794-9e6f-445d-bad8-ce41c32a1395', $tr$# 🔐 EPP (ICT) — Review: Online Security

Grade 4, Week 23! Let's review the rules for online security. 🔐

## 🔄 Review
We learned about algorithms and flowcharts.

## 🔐 Online Security Rules
- Use a **strong password** (a mix of letters, numbers, and symbols)
- Do not share your password with anyone
- Log out when you are done using an account
- Do not click **suspicious links**

## 🚨 Spotting Phishing
**Phishing** is when someone tries to trick you into giving your personal information using a fake message or website.

**Key words:** online security, password, phishing, log out$tr$),
('556acfc3-1340-4952-893e-cb55c050a3c3', $tr$# 💻 Friday — Weekly Practice: EPP (ICT)

Quick review!

- **Google Forms** — a tool for making online forms
- Keep the form **private** unless it should be public

Great studying! 🌟$tr$),
('58961641-5c8b-4629-b556-b4dc51dc8a51', $tr$# 💻 Friday — Weekly Practice: EPP (ICT)

Quick review!

- Mute your microphone when you are not speaking
- Avoid showing personal information in your background

Great studying! 🌟$tr$),
('5961378c-1203-4dfb-812e-df7915a246ef', $tr$# 💻 Friday — Weekly Practice: EPP (ICT)

Quick review!

- What we learned: parts of the computer, basic operations, online safety
- Next: **word processing and presentation software**

You are learning very well! 🌟$tr$),
('5b0ac9f7-51dc-4e7f-a182-26a68ce2dc66', $tr$# Friday Review — EPP (ICT) (Grade 4)

- **Font**: type, size, style (Bold, Italic, Underline), color
- **Alignment**: Left, Center, Right, Justify
- Select the text first before changing it

Great job in ICT!
$tr$),
('604e3d17-bfe0-44e6-bab5-9652432cfc12', $tr$# 💻 EPP (ICT) — Week 3: Parts of the Computer System!

Let's learn more about the parts of a computer! 🖥️

## 🖥️ Parts of the Computer System
- **Monitor, keyboard, mouse, CPU, speakers** — the main parts.

## 🔌 Peripheral Devices
- A **peripheral** is a device you connect to the computer: **printer, webcam, scanner**.

## 🔍 What Each Part Does
- **CPU** — processes information
- **Printer** — makes a paper copy
- **Scanner** — takes a digital picture of a document

Do you know what each part does now? 🌟$tr$),
('6078dda0-160b-4c34-95a4-7a205e5b09d1', $tr$# 💻 EPP (ICT) — Presenting My Finished Digital Portfolio

Grade 5, Week 20! Let's show our finished and revised digital portfolio. 🖥️

## 🔄 Review
We made a **Word document, presentation, and brochure**, and we checked and changed them based on feedback.

## 🎤 Presenting the Portfolio
This week, we will show our whole **digital portfolio** to the class — we will explain each project and why we made it that way.

## 📋 What to Say When Presenting
- The **purpose** of each project
- The **skills** you used (formatting, animation, layout)
- The **changes** you made based on your classmates' feedback

## 🧠 Example 1
*Why is it important to explain the changes you made based on feedback?*
- To **show** how we have grown as ICT workers.

## 🧠 Example 2
*What should you answer when someone asks about a project?*
- Its **purpose and process** — how you made it.

## 💡 Conclusion
Presenting our finished portfolio shows **all the ICT skills** we learned this term.

Great job in ICT! 🌟$tr$),
('67175ed9-ebbe-4237-954c-54f1df044cbc', $tr$# 💻 EPP (ICT) — Week 4: More Online Forms!

Let's keep learning how to make online forms! 📋

## 📋 More Skills
- Add **different kinds of questions** — multiple choice, short answer, and checkbox.
- Use the **settings** to make the form private or closed.

## 🔒 Data Ethics
- Think about **ethics when collecting data** — don't collect information you don't need.

## 🔍 Practice
- Make a short form about your class's favorite hobbies!

Great use of online forms for real-life needs! 🌟$tr$),
('6d3edfd1-bac9-4908-8a1d-d25e6fbd1eeb', $tr$# 📰 EPP (ICT) — Creating Brochures and Flyers

Grade 5, Week 17! Let's make a desktop publishing document. 💻

## 📰 What Is Desktop Publishing?
**Desktop publishing** is making professional documents like a **brochure** (tri-fold reading material) or a **flyer** (one-page announcement).

## 🎨 Page Design and Layout
**Layout** is how the elements are **arranged** on the page.

**Parts of a good layout:**
- **Headline** — big text at the top
- **Picture** — an attractive visual
- **Body text** — the information
- **Contact info** — a way to get in touch

## 🖼️ Borders/Accents
**Borders** (frames) and **accents** (decorations) are used to **make** the document **attractive**.

## 📄 Building Blocks/Templates
Many programs have **ready-made templates** (designs made in advance) — you can **start** from one and **change** it to fit your needs.

## 🧠 Example 1
*You are making a flyer for a school event. What should you include?*
- A **headline** (name of the event), the **date and time**, the **location**, and an attractive **picture**.

## 🧠 Example 2
*Why is it better to use a template than to start with a blank page?*
- It saves **time** and gives you a **neat layout** from the start.

## 💡 Tips for Making a Brochure/Flyer
- Keep it **simple** — don't use too much text
- Use **clear pictures**
- Make sure the font is **easy to read**
- Include **only the important details**

Great job in ICT! 🌟$tr$),
('6e092a0d-a1ae-4750-8ec4-d15b18bce3ab', $tr$# 💻 Friday — Weekly Practice: EPP (ICT)

Quick review!

- Drag or select the file to upload it
- Organize folders by topic

Great studying! 🌟$tr$),
('7283f407-f558-4b56-9d90-914434456d1a', $tr$# Friday Review — EPP (ICT) (Grade 4)

- **Presentation** = slides
- **New Slide** and **Layout** are in the Home tab
- **Theme** is in the Design tab
- **F5** to start, **Esc** to end

Great job in ICT!
$tr$),
('72fe6c77-5492-4f01-81eb-35cc804f9369', $tr$# 🤖 EPP (ICT) — Review: Block Coding and Algorithms

Grade 4, Week 22! Let's review the basics of block coding. 🤖

## 🔄 Review
We learned about digital citizenship.

## 🤖 What Is an Algorithm?
An **algorithm** is a step-by-step way to solve a problem or do a task.

## 📊 What Is a Flowchart?
A **flowchart** shows the process of an algorithm using symbols and arrows.

## 🧩 Example of a Simple Algorithm
To make a sandwich:
1. Get some bread
2. Add the filling
3. Close the sandwich
4. Eat it

**Key words:** algorithm, flowchart, step-by-step, process$tr$),
('7484d973-089f-4b29-ac74-44f82e911840', $tr$# 💻 Friday Review — EPP (ICT) (Grade 5)

- Presenting your finished digital portfolio

Great job in ICT! 🌟$tr$),
('7a811315-6a2e-44cb-9581-6314d6a29b57', $tr$# 💻 Friday Review — EPP (ICT) (Grade 5)

- Spreadsheets: rows, columns, cells

Great job in ICT! 🌟$tr$),
('800769cf-b2f5-4a7b-a00e-100b063600a5', $tr$# Friday Review — EPP (ICT) (Grade 4)

- **Text Box** (Insert) = write anywhere
- **WordArt** (Insert) = fancy title
- **Text Fill, Text Outline, Text Effects**
- Easy to read comes before pretty

Great job in ICT!
$tr$),
('874a2714-b7d8-4ad6-828d-973d3aac2670', $tr$# 🔍 EPP (ICT) — Using Search Engines Responsibly

Grade 4, Week 27! Let's learn how to check information online. 🔍

## 🔄 Review
We learned about the digital footprint.

## 🔍 What Is a Search Engine?
A **search engine** (like Google) helps you find information on the Internet using keywords.

## ✅ Checking Information Online
Not everything you see online is true. We should check:
- Who made the information?
- When was it published?
- Is there proof for what it says?

## ⚠️ Why Is This Important?
A lot of false information (fake news) spreads online, so it's important to learn to check before you believe.

**Key words:** search engine, keyword, checking, fake news$tr$),
('8d36993b-c313-46e8-b1ca-5c345b1af4c5', $tr$# 💻 Friday — Weekly Practice: EPP (ICT)

Quick review!

- **Clean your hands** before using the keyboard/mouse
- **No food** near the computer
- Ask your teacher for help when you need it

You're ready to learn about ICT! 🌟$tr$),
('93936a91-fb78-4eb1-a445-749cfdd7fa08', $tr$## Email Etiquette: Being Polite and Professional Online

- **Email etiquette** is the set of polite manners and unwritten rules for writing emails — it helps your message sound respectful and clear, especially to teachers, elders, or people you don't know well.
- Every polite email usually has three parts: a **greeting** (e.g., "Good day, Ma'am/Sir,"), the **message body** written in a calm and clear tone, and a **closing/signature** (e.g., "Respectfully yours, Juan Dela Cruz, Grade 5").
- Using a **professional tone** means avoiding ALL CAPS (which can look like shouting), too many exclamation points, or slang — even when you're in a hurry or annoyed.
- **Reply** sends your message only to the original sender, while **Reply All** sends it to everyone who received the email. Example: if your teacher emails the whole class and you only have a personal question, use **Reply**, not Reply All, so you don't bother 30 classmates with a message meant for one person.
- Being **mindful of recipients** also means double-checking the To/Cc list before sending, so a private message (like a birthday invite) doesn't accidentally go to people it wasn't meant for.

| Situation | Reply | Reply All |
|---|---|---|
| Personal question to teacher | Correct choice | Bothers everyone |
| Group project update for the whole team | Sometimes too limited | Correct choice |

- Good etiquette shows respect for the reader's time and feelings — a well-mannered email leaves a good impression, just like greeting someone politely in person.$tr$),
('98a88747-20c6-4fe4-9f2d-f0b307c7476c', $tr$# 💻 EPP (ICT) — Week 4: Taking Care of Computer Equipment!

Let's learn how to take care of our computer equipment! 🧰

## 🧰 Caring for the Equipment
- Cover the keyboard when it is not in use to keep dust away.
- Do not put food or drinks near the equipment.

## 🔌 Handling Cables Properly
- Do not bend cables or pull them hard.

## 🔍 Regular Cleaning
- Wipe the screen with a clean, dry cloth.

Taking care of the equipment helps it last longer! 🌟$tr$),
('9a333f11-7d2a-47fb-bd0a-838cbb1591b8', $tr$# 💻 EPP (ICT) — Week 2: Comparing Computing Devices!

Let's learn how different computing devices are not the same! 📱

## 💻 Desktop vs. Laptop
- **Desktop** — bigger, not easy to carry, often faster
- **Laptop** — portable, has its own battery

## 📱 Tablet and Smartphone
- **Tablet** — flat, touch screen, bigger than a smartphone
- **Smartphone** — small, always carried around, can call and text

## 🔍 Choosing the Right Device
- We choose the best device depending on the task.

There are different devices for different needs! 🌟$tr$),
('9cfd0cad-2891-44c8-95f6-8120f18df54b', $tr$# 💻 Friday — Weekly Practice: EPP (ICT)

Quick review!

- **Booting** = starting up | **Shutting down** = turning off the right way
- Home row: **ASDF, JKL;**

You are learning very well! 🌟$tr$),
('9fca37a7-45cf-4b0a-b47c-ee5408a54e85', $tr$# 💻 EPP (ICT) — Week 7: Term Review — Cloud Storage!

Let's look back at what we learned about cloud storage! ☁️

## ☁️ Summary of What We Learned
- **Web conferencing, online forms, and cloud storage** — we learned three modern tools.

## 🔒 Online Safety
- Always think about **privacy and responsibility** when using these tools.

## 🎯 Using It in Real Life
- Use what you learned in real life — for example, uploading a project to the cloud.

What a great term of learning about online tools! 🌟$tr$),
('a37d38f1-cca2-4a6d-87a8-7a552c1ff541', $tr$# 💻 Friday — Weekly Practice: EPP (ICT)

Quick review!

- **Cloud storage** = storing files online
- Only share with **trusted people**

Great studying! 🌟$tr$),
('a7108811-4ef3-4a6a-bffc-2544184b27cd', $tr$# 📄 EPP (ICT) — Creating Word Documents

Welcome to Term 2, Grade 5! Let's make a professional document! 💻

## 🖼️ Inserting and Formatting Illustrations

**Types of illustrations you can insert:**
- **Shapes** — circles, arrows, boxes for diagrams
- **Images** — photos or pictures
- **SmartArt** — ready-made diagrams (flowcharts, cycles, lists)

**Formatting an image:**
1. Click the image to **select** it
2. Drag the **corner handles** to resize (keeps proportions)
3. Use **"Wrap Text"** to let text flow around the image

## 📊 Inserting and Formatting Tables
A **table** organizes information into **rows** and **columns**.

**Steps:**
1. Go to **Insert → Table**
2. Choose the number of **rows** and **columns**
3. Click into cells to **type** your data
4. Use **Borders** to make it easy to read

## 🔘 Using Bullets and Numbering
- **Bullets** — for lists where **order doesn't matter**
- **Numbering** — for lists where **order matters** (like steps)

**Example:**
> **Bullets:** Materials needed — pencil, paper, ruler
> **Numbering:** Steps — 1. Cut the paper 2. Fold it 3. Glue it

## 🎨 Setting a Page Background
A **page background** adds color or a subtle design behind your text.

**Steps:**
1. Go to **Design → Page Color** (or Page Background)
2. Choose a **light color** so text stays readable
3. Avoid backgrounds that make text **hard to read**

## 🧠 Worked Example 1
*You want to show the steps of planting a seed. Should you use bullets or numbering?*
- **Numbering** — because the **order** of steps matters (you can't water before planting)! ✅

## 🧠 Worked Example 2
*You're making a report comparing 3 fruits' vitamin content. What should you use?*
- A **table** — it organizes the comparison **clearly** by fruit and vitamin. ✅

## 💡 Producing a Complete Document
Combine all these tools: a **title**, an **image**, a **table** of data, a **numbered** list of steps, and a light **background** — for a polished, professional-looking document.

Great ICT work! 🌟$tr$),
('a723b642-9190-4b7e-9a90-4f599a858927', $tr$# 💻 Friday — Weekly Practice: EPP (ICT)

Quick review!

- **Share button** to give access
- Choose: **view or edit**

Great studying! 🌟$tr$),
('aa145d35-db49-40bd-be9d-ed092a9b576c', $tr$# Friday Review — EPP (ICT) (Grade 4)

- **Insert → Pictures / Shapes**
- Corner handles so it doesn't stretch, **Crop** to cut
- **Shape Fill** = inside, **Shape Outline** = edge
- Respect the owner of the picture

Great job in ICT!
$tr$),
('adc2209b-91e9-46e3-b36c-94f436e65af6', $tr$# 💻 EPP (ICT) — Week 6: Sharing in Cloud Storage!

Let's learn more about sharing files! 📤

## 📤 Sharing the Right Way
- Use the **share button** to give other people access.
- Choose whether they can **view only** or **edit** the file.

## 🔒 Organizing Files
- Use **folders** to keep your files neat.

## 🔍 Safety
- Check the list of people who have access to the file from time to time.

Good organizing helps you work productively! 🌟$tr$),
('b0bebf60-d672-437d-b4c5-297b7ba6a4f9', $tr$# 🎬 Friday Review — EPP (ICT) (Grade 4)

- Presentation and multimedia elements

Great job in ICT! 🌟$tr$),
('b0fc78a9-465b-4aa6-8949-bdeffd172469', $tr$# 💻 EPP (ICT) — Week 7: Internet Safety!

Let's learn the rules for using the Internet safely! 🛡️

## 🛡️ Safety Rules
- Do not share **personal information** online (name, address, password).
- Ask for **your parent's permission** before downloading or signing up on a site.

## 🚫 Avoiding Danger Online
- Do not click **suspicious links** or messages from strangers.

## 🔍 If There Is a Problem
- Always tell a **trusted adult** if you see something strange online.

Be smart and safe when using the Internet! 🌟$tr$),
('b1244140-1d61-41ac-a8a1-2828682ea20e', $tr$# 📄 Friday Review — EPP ICT (Grade 5)

- Inserting pictures, shapes, and SmartArt
- Tables, bullets, and page color

Great job! 🌟$tr$),
('ba9c6f1b-367c-4759-977f-6da686b89df7', $tr$# 💻 Friday — Weekly Practice: EPP (ICT)

Quick review!

- **CPU** = processes information | **Peripheral** = connected to the computer
- **Printer, webcam, scanner** — peripheral devices

You are learning very well! 🌟$tr$),
('bb2ff0b2-112f-494a-8f31-6ecd52182541', $tr$# 🖥️ Friday Review — EPP ICT (Grade 4)

- CPU is the brain of the computer
- Input devices vs. output devices
- Hardware vs. software

Great job! 🌟$tr$),
('c48d8e60-6546-4811-9fc8-9a9ebf64b7df', $tr$# 📈 Friday Review — EPP (ICT) (Grade 5)

- Making charts from spreadsheet data

Great job in ICT! 🌟$tr$),
('c50e4493-802f-41b8-af8c-d3c924914411', $tr$# 💻 Friday — Weekly Practice: EPP (ICT)

Quick review!

- **Drag-and-drop** = pulling an item
- Accuracy matters with the mouse; use the correct fingers on the keyboard

You are learning very well! 🌟$tr$),
('cf345696-4b11-4379-84c4-d1f103e66ed3', $tr$# 💻 Friday Review — EPP (ICT) (Grade 5)

- Term 2 ICT wrap-up

Great term in ICT! 🌟$tr$),
('d8227adb-db8a-4343-8ba5-fa534be81bda', $tr$# 📰 Friday Review — EPP (ICT) (Grade 5)

- **Desktop publishing** = brochure/flyer creation
- **Layout:** headline, picture, body text, contact info
- Use a **template** to save time

Great job in ICT! 🌟$tr$),
('d8df3065-a4c6-4104-bf6f-54e57d4a3b45', $tr$# Friday Review — EPP (ICT) (Grade 4)

- **Layout tab**: Size, Orientation, Margins
- **Portrait** = upright, **Landscape** = sideways
- **Margin** = the blank space around the edges

Great job in ICT!
$tr$),
('daf3be2e-eed9-4507-9f2f-7db07b71b961', $tr$# 💻 Friday — Weekly Practice: EPP (ICT)

Quick review!

- Kinds of questions: **multiple choice, short answer, checkbox**
- Use the settings to make it private

Great studying! 🌟$tr$),
('e89930bc-5cae-4b56-a921-0166e8e06424', $tr$# 💻 Friday — Weekly Practice: EPP (ICT)

Quick review!

- Computers help with **work, school, communication, entertainment**
- Kinds of computing devices: **laptop, tablet, smartphone**

You are learning very well! 🌟$tr$),
('e8a43597-311f-4753-b05d-53a82065cb11', $tr$# 🎬 Friday Review — EPP (ICT) (Grade 5)

- Presentation transitions and animations

Great job in ICT! 🌟$tr$),
('eaecfeb3-33d0-42a0-a18e-2ecef39263c0', $tr$# 💻 Computer Room Rules

Before we start our ICT lesson, let's review the rules! 🖥️

## 📏 The Rules
- **Clean your hands** before using the equipment.
- **Be responsible** when using the Internet and online tools.

## 🙋 Why Is This Important?
- It protects the equipment and keeps every student safe online.

## 💡 Simple Reminder
- Ask your teacher for help if there is something you don't understand.

Are you ready to learn about ICT safely and responsibly? 🌟$tr$),
('ef6e1f48-ada6-4ef2-af8e-d46e89e63659', $tr$# 💻 Friday Review — EPP (ICT) (Grade 4)

- Digital citizenship and software recap

Great job in ICT! 🌟$tr$),
('ef6f5a55-d779-4270-867c-111836db4475', $tr$# 💻 EPP (ICT) — Week 4: Basic Computer Operations!

Let's learn the basic things we do on a computer! 🖥️

## 🔛 Booting and Shutting Down
- **Booting** — the process of starting the computer
- **Shutting down** — the right way to turn off the computer

## ⌨️ Keyboarding Techniques
- Use the **home row keys** (ASDF, JKL;) to type fast.

## 🖱️ Mouse Techniques
- **Single-click, double-click, right-click, drag** — the main mouse moves.

Great ways to use the computer! 🌟$tr$),
('f622ca6a-a385-4952-95f3-e44b97b3b509', $tr$# 🖥️ EPP (ICT) — Creating Presentation Slides

Grade 5, Week 16! Let's make a slide presentation. 💻

## 🎬 Parts of a Presentation
| Part | Purpose |
|---|---|
| **Slide** | one "page" of a presentation |
| **Animation** | movement of text or a picture inside one slide |
| **Slide Transition** | an effect when moving from one slide to the next |
| **Audio/Video** | sound or video embedded in the slide |

## ✨ Adding Animation
**Steps:**
1. Choose the **text or picture** you want to animate
2. Go to the **Animations tab**
3. Choose an **effect** (Fade In, Fly In, Zoom)
4. Preview it to see the result

## 🎞️ Adding a Slide Transition
**Steps:**
1. Choose the slide
2. Go to the **Transitions tab**
3. Choose a transition **effect** (Fade, Push, Wipe)

## 🎵 Adding Audio/Video
1. Go to the **Insert tab**
2. Choose **Audio** or **Video**
3. Choose the file from your computer
4. Set **when** it will play (automatically or when clicked)

## 🧠 Example 1
*You want each point on a list to appear one at a time. What will you use?*
- **Animation** — for each item, using an effect like **Fade In**.

## 🧠 Example 2
*You want a smooth effect when moving from slide 1 to slide 2.*
- Use a **Slide Transition** (e.g. **Fade** or **Wipe**).

## 💡 Guidelines
- Don't use **too much** animation — it can distract from your message
- Choose audio/video that is **related** to the topic
- Keep each slide **simple and clear**

Great job in ICT! 🌟$tr$),
('f65a6854-2689-4ee2-a270-c9ba260c18c1', $tr$# 🔐 Friday Review — EPP (ICT) (Grade 4)

- Online security and phishing

Great job in ICT! 🌟$tr$),
('f6e40331-7b8e-4cdc-8f6b-da1594e4999b', $tr$# 🤖 Friday Review — EPP (ICT) (Grade 4)

- Algorithms and flowcharts

Great job in ICT! 🌟$tr$),
('fa32c9b7-e707-4372-b2ad-c323ed268290', $tr$# 🗂️ Friday Review — EPP (ICT) (Grade 5)

- Organizing files and folders

Great job in ICT! 🌟$tr$);

insert into _ict_question values
('008c8c78-783c-4a33-b63d-a34d2d5a970d', $tr$Which key starts the slide show?$tr$, $tr$["F5", "Esc", "Enter", "Tab"]$tr$::jsonb),
('00da21ed-89d2-48f7-bc52-5ffde48292b4', $tr$Which of the following is part of online safety?$tr$, $tr$["Keep personal information private", "Share your password with everyone", "Answer everyone who asks for information", "Stop being careful online"]$tr$::jsonb),
('01a6f1e5-77e8-4ed6-91fc-3ebb5d107525', $tr$Why do we learn to check online sources?$tr$, $tr$["To be a responsible Internet user", "No purpose", "Just for fun", "Not part of ICT"]$tr$::jsonb),
('02003c74-0433-4d69-9650-859302756d72', $tr$What happens if the order is wrong?$tr$, $tr$["The task may not succeed", "It will always be right", "No effect", "The result is faster"]$tr$::jsonb),
('0236a551-d6b6-403d-8a43-466fd2aae162', $tr$Why is it important to know who wrote an article online?$tr$, $tr$["It helps you tell if the information can be trusted", "It has nothing to do with the truth", "No need to know", "All authors are always the same"]$tr$::jsonb),
('029bbc0d-79d4-41ea-978c-219db5edd506', $tr$What is part of online safety?$tr$, $tr$["Keep personal information private", "Share your password", "Answer everyone", "Stop being careful"]$tr$::jsonb),
('02bfc85d-b7b2-4cfd-b65c-88d652716ede', $tr$What is Crop?$tr$, $tr$["Removing parts of a picture you don't need", "Coloring a picture", "Copying a slide", "Saving a file"]$tr$::jsonb),
('0429f8ca-972b-4856-8ab4-1209607e1a27', $tr$What should you use to clean the screen?$tr$, $tr$["A clean, dry cloth", "A wet towel", "A spoon", "Nothing"]$tr$::jsonb),
('04984731-a30d-42aa-a990-4ffbdccbca6f', $tr$Why is it important to make different kinds of documents in ICT?$tr$, $tr$["To learn to choose the right tool for each task", "Only to make it hard for students", "It is useless", "It is only done for fun"]$tr$::jsonb),
('050272a9-bf07-460e-80f1-19dadd7bfd80', $tr$Which software would you use to make a report with a table of data?$tr$, $tr$["Spreadsheet", "Only presentation", "Only word processing", "Only desktop publishing"]$tr$::jsonb),
('050c869c-dd41-441e-9f14-b1cd263425f9', $tr$What three tools did we learn about this term?$tr$, $tr$["Web conferencing, online forms, cloud storage", "Nothing", "Only one tool", "We learned nothing"]$tr$::jsonb),
('06467ba0-bb48-4b40-bc33-420383fd655a', $tr$Why is practice important?$tr$, $tr$["It improves speed and accuracy", "It is useless", "Only for grades", "It has no purpose"]$tr$::jsonb),
('06e3be5f-c2e5-4406-bedd-2400376cae47', $tr$Why do we learn spreadsheets in ICT?$tr$, $tr$["To learn how to organize data well", "No purpose", "Only for adults", "Not related to ICT"]$tr$::jsonb),
('07a38925-a87f-4c14-ad3a-7bcbb57fe2c4', $tr$What do you use to make a form private?$tr$, $tr$["Settings", "There is no way", "Color", "Font"]$tr$::jsonb),
('08b009bc-8d97-4739-94bc-2f69cd071d5d', $tr$What three documents did we make this term?$tr$, $tr$["Word document, presentation, and brochure", "Only a spreadsheet", "Only an email", "Only a video"]$tr$::jsonb),
('08b91361-00ad-469d-80cf-4bf475d448fd', $tr$What is an example of using a computer?$tr$, $tr$["Making a project", "Sleeping", "Swimming", "Eating"]$tr$::jsonb),
('08b9f5a5-5e5f-4fcf-a594-afb62203845e', $tr$Which shortcut makes text bold?$tr$, $tr$["Ctrl + B", "Ctrl + I", "Ctrl + U", "Ctrl + S"]$tr$::jsonb),
('08bba970-c947-4d69-a408-224916433829', $tr$What is drag-and-drop?$tr$, $tr$["Pulling an item from one place to another", "Typing a letter", "Turning off the computer", "Only opening something"]$tr$::jsonb),
('08cf5dd6-4bc3-4371-8f17-e14c72a1cfeb', $tr$What helps with work, school, and entertainment?$tr$, $tr$["Computer", "Spoon", "Umbrella", "Shoes"]$tr$::jsonb),
('0a034d31-98e9-488c-88d1-c87ab5a226e6', $tr$What is phishing?$tr$, $tr$["Trying to trick you to get your information", "A kind of game", "A kind of software", "An email with no danger"]$tr$::jsonb),
('0b1de67b-9701-4c90-ad32-6f4cfe97f59e', $tr$Google Docs is a:$tr$, $tr$["word processor", "game", "spreadsheet", "music player"]$tr$::jsonb),
('0b8e4f4d-82dc-40e1-89ab-b91068af85d9', $tr$Why should you give a file a clear name?$tr$, $tr$["So it is easy to find", "No reason", "Only to make it look nice", "It is useless"]$tr$::jsonb),
('0ba3e1af-57e8-4889-8b68-877ff782145b', $tr$At what level should the screen be?$tr$, $tr$["Eye level", "Low, near the floor", "Very far away", "None of these"]$tr$::jsonb),
('0ba5bf2e-c332-494e-89ad-5131f7544ddb', $tr$What did we learn about staying safe online?$tr$, $tr$["Correct posture and Internet rules", "We learned nothing", "Only one thing", "Nothing"]$tr$::jsonb),
('0bab8789-92b6-4b2b-886b-98764d309fea', $tr$Why keep personal information private?$tr$, $tr$["To avoid danger from people with bad intentions", "No danger", "It must be shared", "Safe to share"]$tr$::jsonb),
('0bbd91e7-b2a7-4ade-a2e4-c7a13ae6cef8', $tr$What should you do with your microphone when you are not speaking?$tr$, $tr$["Mute it", "Make it louder", "Just leave it on", "Break it"]$tr$::jsonb),
('0c318539-7939-4a04-99ba-d132a99efe50', $tr$Which one is flat, has a touch screen, and is bigger than a smartphone?$tr$, $tr$["Tablet", "Desktop", "Printer", "Speaker"]$tr$::jsonb),
('0c5c2733-934c-49c7-b8f5-f7c7f81ae0b7', $tr$What is a flowchart?$tr$, $tr$["Symbols and arrows for a process", "Just a kind of data graph", "A kind of photo", "A kind of song"]$tr$::jsonb),
('0c88cd91-632a-4481-a0a7-33eef1e77f3f', $tr$What is the first step in making a textbox?$tr$, $tr$["Insert, Text Box", "Design, Themes", "Home, New Slide", "File, Save"]$tr$::jsonb),
('0cab9618-7b67-4759-a9fb-671a0cb0e7b5', $tr$What is the right way to turn off a computer?$tr$, $tr$["Shutting down", "Unplugging it right away", "Dropping it on the floor", "There is no right way"]$tr$::jsonb),
('0d5e8dd3-b4d4-4303-935e-43de062fb4da', $tr$What is fake news?$tr$, $tr$["False information spreading online", "Only true news", "A kind of game", "An official document"]$tr$::jsonb),
('0d8a4f78-15e5-4e29-91d8-8e2437d6fd66', $tr$Why is it important to review the ICT skills you learned?$tr$, $tr$["To strengthen what you know before learning something new", "No need to review", "It is useless", "Just to entertain the teacher"]$tr$::jsonb),
('0df6f1bc-95d3-4f58-a7ba-d84d718259f9', $tr$What does a 'process' mean in an algorithm?$tr$, $tr$["Each step that needs to be done", "Only the final result", "Only the last step", "Process has no meaning"]$tr$::jsonb),
('0e74061d-dc4f-4710-a06b-0ca6b11faa13', $tr$You want to change the color inside the WordArt letters. Use:$tr$, $tr$["Text Fill", "Text Outline", "Theme", "Layout"]$tr$::jsonb),
('0fc671e9-bed8-42e6-b5d4-3714e9e4ee84', $tr$What did we learn about the parts of a computer?$tr$, $tr$["Monitor, keyboard, mouse, CPU, speakers", "Nothing", "Only one part", "We learned nothing"]$tr$::jsonb),
('10240976-1328-4bec-b6c7-3add9aee681f', $tr$Which one is portable and has its own battery?$tr$, $tr$["Laptop", "Only the desktop", "Printer", "Only the monitor"]$tr$::jsonb),
('11c5ed6f-c0fb-4b95-8a34-2939724a28a5', $tr$What should you do with a suspicious link?$tr$, $tr$["Don't click it", "Click it right away", "Share it with others", "Reply to it"]$tr$::jsonb),
('1206fb1e-84a9-4820-8e89-5437b393cbc3', $tr$Why do we teach online security to kids?$tr$, $tr$["So they can protect themselves from dangers online", "No purpose", "To get them to be careless", "It is not part of ICT"]$tr$::jsonb),
('1209fd66-a11a-4712-a978-e2ed6a6099fe', $tr$Why is shutting down properly important?$tr$, $tr$["So the computer doesn't get damaged", "No reason", "So the game lasts longer", "It is useless"]$tr$::jsonb),
('123ba6d5-8203-4d39-841d-804c90d476cc', $tr$What does netiquette mean?$tr$, $tr$["Making a document", "Good manners on the internet", "Printing files"]$tr$::jsonb),
('12bd5f82-ff15-4f86-9c00-677d70655391', $tr$Why do we learn to make presentations in EPP (ICT)?$tr$, $tr$["To learn how to share ideas in front of others", "No purpose", "Only for adults", "Not related to ICT"]$tr$::jsonb),
('12bdd8b0-30a0-4548-b819-686e7cafed7e', $tr$Why is it important to explain the changes made based on feedback?$tr$, $tr$["To show how we have improved", "It is useless", "It is only done for a grade", "It only confuses the audience"]$tr$::jsonb),
('1337844a-fc14-4336-bd32-86a47d40ee67', $tr$What is an example of using what you learned in real life?$tr$, $tr$["Uploading a project to the cloud", "Nothing", "Only playing", "Only watching"]$tr$::jsonb),
('1398a516-60ec-4769-b065-5e94b61fbf48', $tr$Why is good posture important while using a computer?$tr$, $tr$["It helps prevent body pain", "Posture has no effect", "No need to think about it", "It is only for adults"]$tr$::jsonb),
('140e72b5-55c4-4f67-bc1c-a70bd7a7b2ea', $tr$Why is a good presentation important?$tr$, $tr$["To share the message clearly", "It doesn't matter", "Only for decoration", "It is not needed"]$tr$::jsonb),
('14128635-4ab4-40ba-9ab1-4580b0bf70ab', $tr$What is the main lesson about online security?$tr$, $tr$["Be careful and protect your information", "Share everything", "No need to be careful", "No danger online"]$tr$::jsonb),
('1577bd9a-fed2-4644-bc86-5203b29495b4', $tr$What should you do before using the keyboard?$tr$, $tr$["Clean your hands", "Eat first", "Run", "Drink"]$tr$::jsonb),
('15be7073-9467-4971-a709-9e595927f76a', $tr$Why do we use slides when reporting?$tr$, $tr$["So the audience understands better", "So you don't have to talk", "To make the report longer", "No reason"]$tr$::jsonb),
('15d612d6-b5d1-4912-b248-ad20deb223b9', $tr$You want a smooth effect when moving from slide 1 to slide 2. What will you use?$tr$, $tr$["Slide transition", "Only animation", "Only audio", "Only video"]$tr$::jsonb),
('15f72ec9-c177-4580-8fe1-8e77c2cfd226', $tr$Where do you put your design?$tr$, $tr$["Page area", "Title bar", "Status bar", "Taskbar"]$tr$::jsonb),
('1600fa53-0147-41e7-a984-77546f605c4c', $tr$How should you organize folders?$tr$, $tr$["By topic or date", "Just randomly", "With no order", "Only by color"]$tr$::jsonb),
('16078a92-8201-46e0-aba8-964673a47358', $tr$What will we make with productivity software?$tr$, $tr$["Word documents and presentations", "Nothing", "Only one thing", "We will make nothing"]$tr$::jsonb),
('1631c99b-93cf-4f18-bd61-23940308ea26', $tr$What is an example of a fake phishing message?$tr$, $tr$["An email that suddenly asks for your password", "A normal news story", "A letter from your teacher", "An offer of a free book"]$tr$::jsonb),
('1658111e-032d-4d95-8403-e488df58bde5', $tr$Why is it important to show the whole process of each project, not just the result?$tr$, $tr$["It shows growth and knowledge in making it", "The process is never important", "Only the result matters", "It does not help the presentation"]$tr$::jsonb),
('17827eeb-e0e7-4038-8be7-3d45079ed1d4', $tr$What is important in online forms?$tr$, $tr$["Data ethics", "Nothing is important", "Only color", "Nothing"]$tr$::jsonb),
('178ed846-3f86-4fda-83a7-f3cd30350b24', $tr$You want to add a picture of your school. Go to:$tr$, $tr$["Insert, Pictures", "Home, Bold", "View, Zoom", "File, Close"]$tr$::jsonb),
('1830cedd-36cf-46ab-9d49-e06d48fcc3a0', $tr$How do you move a textbox?$tr$, $tr$["Drag the edge of the box", "Press Esc", "Delete it and do it again", "Change the theme"]$tr$::jsonb),
('19240aba-579f-4f61-a5cf-0537d0b43416', $tr$Which is another kind of computing device?$tr$, $tr$["Tablet", "Spoon", "Umbrella", "Shoes"]$tr$::jsonb),
('1943b986-8bad-4224-b14b-054ad1586ecd', $tr$What does a scanner do?$tr$, $tr$["Takes a digital picture of a document", "Prints on paper", "Makes sound", "Processes information"]$tr$::jsonb),
('1a128b5a-ac7c-4d9d-9ae4-fdf6b322d3f7', $tr$Every slide has different colors and it looks messy. What will you do?$tr$, $tr$["Use one theme", "Add a slide", "Press Esc", "Delete the title"]$tr$::jsonb),
('1a1c2785-f58a-43a6-afd1-ba9f37ff657c', $tr$Why be careful about what you share online?$tr$, $tr$["It can stay forever", "No effect", "It disappears right away", "Not a real issue"]$tr$::jsonb),
('1a222db4-0172-4483-97ff-eb5100c7fe11', $tr$What helps with work, school, and entertainment?$tr$, $tr$["Computer", "Spoon", "Umbrella", "Shoes"]$tr$::jsonb),
('1a2a2a7c-21b7-4ef8-a4c2-62b5ee055e72', $tr$Why are Internet safety rules important?$tr$, $tr$["They protect us from danger online", "They are useless", "Only for grades", "They have no purpose"]$tr$::jsonb),
('1a3586a5-553a-4cdc-84a9-9c770748d7e8', $tr$Which shortcut saves your work?$tr$, $tr$["Ctrl + S", "Ctrl + Z", "Ctrl + P", "Ctrl + B"]$tr$::jsonb),
('1aa068d2-6c4e-42ce-962a-c930a4b69294', $tr$Why are computers important in modern life?$tr$, $tr$["They help with many tasks", "They are useless", "Only for games", "They have no purpose"]$tr$::jsonb),
('1ae63d5e-dd4d-4560-a113-e1d498c33328', $tr$Where are computers used?$tr$, $tr$["Home, school, and business", "Nowhere", "Only under the sea", "Only in outer space"]$tr$::jsonb),
('1ae8c2a3-9a25-4d98-98e8-1d92f4d5c249', $tr$Why follow the right order?$tr$, $tr$["So the task is done successfully", "It doesn't matter", "Any order is fine", "No effect"]$tr$::jsonb),
('1aedc869-27a5-4018-8c75-7f51388ee4e4', $tr$What two kinds of access can you give?$tr$, $tr$["View and edit", "Delete and print", "No kinds", "Only one"]$tr$::jsonb),
('1af7a6c0-a7e7-4671-bf1c-c9b0eabf23e4', $tr$Why is it important to use the right keywords when searching?$tr$, $tr$["To get results faster", "To lose the signal", "To make the search stop working"]$tr$::jsonb),
('1b2fa202-c844-40ac-85d2-aa6fe8553e9f', $tr$What is a template?$tr$, $tr$["A ready-made design you fill with your own content", "A kind of font", "A shortcut", "A sound"]$tr$::jsonb),
('1b84b956-b2fa-4c76-8b5b-0c597446a830', $tr$Why is practice important?$tr$, $tr$["It improves speed and accuracy", "It is useless", "Only for grades", "It has no purpose"]$tr$::jsonb),
('1bf54b8a-d3a1-4ae3-b934-47479cba068a', $tr$What should you think about when choosing audio or video?$tr$, $tr$["It should be related to the topic", "It should be the longest one", "It should be random", "It should not be related to the topic"]$tr$::jsonb),
('1c07661b-7e6d-471b-a6d2-8b81b255e17d', $tr$A student made a flyer full of text that is hard to understand. What is the problem?$tr$, $tr$["Too much information, not enough clarity", "The design is too simple", "There is no problem", "The paper is too small"]$tr$::jsonb),
('1cc0dc35-32ab-4618-acd3-fd4ededb7942', $tr$Why is a template good for beginners?$tr$, $tr$["The colors and fonts are already neat", "You don't need to think anymore", "It is useless", "It slows down your work"]$tr$::jsonb),
('1cecc917-7029-4f53-8375-8a296f889adb', $tr$A student got feedback that the text on their poster is too small. What should they do?$tr$, $tr$["Make the text bigger so it is easier to read", "Ignore the feedback and change nothing", "Remove all the text on the poster", "Close the whole project right away"]$tr$::jsonb),
('1d276f4a-b0ab-48a5-b5d2-d40c8f90ecfb', $tr$What did we learn about cloud storage?$tr$, $tr$["Storing and sharing files", "Nothing", "Only one thing", "We learned nothing"]$tr$::jsonb),
('1d3ee9cd-b892-4167-adc9-71f9666d5482', $tr$Which layout is for the first slide?$tr$, $tr$["Title Slide", "Blank", "Two Content", "Comparison"]$tr$::jsonb),
('1e1085e2-5a62-464d-b8ac-78bccebec9e6', $tr$Which one is bigger and not easy to carry?$tr$, $tr$["Desktop", "Smartphone", "Tablet", "None is correct"]$tr$::jsonb),
('1edb6055-3eb8-4c77-9d26-b3b1000d20f7', $tr$What is spreadsheet software used for?$tr$, $tr$["Organizing data in cells", "Making slides", "Typing letters", "Only drawing"]$tr$::jsonb),
('1fdaf990-1b0b-4eca-b9ed-600d038d3b03', $tr$How should you handle the equipment?$tr$, $tr$["Carefully", "Roughly", "With wet hands", "Quickly"]$tr$::jsonb),
('20b52d78-d40e-4f53-9352-1caf6de36c6a', $tr$Why should you not eat near the computer?$tr$, $tr$["So the equipment doesn't get damaged", "So you get full", "So it tastes good", "No reason"]$tr$::jsonb),
('20b5964f-bac8-4eea-9885-c9a5f90a9747', $tr$What is the key to improving your skills?$tr$, $tr$["Practicing again and again", "Only once", "Not practicing anymore", "Avoiding it"]$tr$::jsonb),
('20b71bd8-1f24-4c27-869e-b910ebe3cb16', $tr$Where do you type your writing?$tr$, $tr$["Document area", "Title bar", "Ribbon", "Scroll bar"]$tr$::jsonb),
('20b721e8-da76-471b-b2a4-14aeab2a881b', $tr$You want to add an explanation in the bottom corner of the slide. Use:$tr$, $tr$["Text Box", "Theme", "New Slide", "F5"]$tr$::jsonb),
('212a2396-f78a-483a-a378-a1edb0440fa5', $tr$What is WordArt?$tr$, $tr$["Colorful, fancy text", "A table", "A sound", "A slide pane"]$tr$::jsonb),
('21624957-13fd-4bd9-afcd-9abe315753d3', $tr$What is fake news?$tr$, $tr$["False information spreading online", "Only true news", "A kind of game", "An official document"]$tr$::jsonb),
('22ad616c-9c83-44ce-9867-23dc8478ce13', $tr$Why is it important to learn to spot phishing?$tr$, $tr$["So you don't get tricked online", "It is useless", "Phishing is not a real danger", "It is not related to online safety"]$tr$::jsonb),
('234f1a7c-977a-47d9-aa0b-97ae84c97638', $tr$What is a slide?$tr$, $tr$["One 'page' of a presentation", "A kind of sound", "Only a kind of picture", "A kind of document"]$tr$::jsonb),
('23ad47cc-f0b6-4c19-9035-bb9a78f119ea', $tr$The title should be bigger than the text. What will you change?$tr$, $tr$["Font size", "Margin", "Orientation", "Page size"]$tr$::jsonb),
('24186057-9d7c-49a3-b938-527d2471ea33', $tr$Where are computers used?$tr$, $tr$["Home, school, and business", "Nowhere", "Only under the sea", "Only in outer space"]$tr$::jsonb),
('247f89f3-4ae6-4b72-9735-33e623dd1a1e', $tr$Why should you keep a brochure simple?$tr$, $tr$["So the reader does not get confused", "So it takes longer to make", "So the text is longer", "There is no reason"]$tr$::jsonb),
('250db980-522c-4a36-8cc7-272c73cb9edd', $tr$Why are computer room rules important?$tr$, $tr$["They protect the equipment and keep everyone safe", "So you can play more", "They are useless", "So no one uses the computers"]$tr$::jsonb),
('2526c974-9fc0-4f59-a629-c4773b4cb9a5', $tr$What three tools did we learn about this term?$tr$, $tr$["Web conferencing, online forms, cloud storage", "Nothing", "Only one tool", "We learned nothing"]$tr$::jsonb),
('25734550-4a8d-4933-9e54-3ba4a3eb14ff', $tr$What will we do with our portfolio this week?$tr$, $tr$["Show it to the class", "Delete it", "Forget it", "Just close the program"]$tr$::jsonb),
('258c97ed-a29d-4ba4-b821-25421f09da96', $tr$What skill can you mention about the brochure?$tr$, $tr$["Layout and page design", "Only cooking", "Only sewing", "Only farming"]$tr$::jsonb),
('26963543-b027-4e6e-9053-578f2535816d', $tr$What did we learn about online forms?$tr$, $tr$["Making them while respecting privacy", "Nothing", "Only one thing", "We learned nothing"]$tr$::jsonb),
('27f5ea47-dbb8-4085-87ba-b623c0e72014', $tr$How do you add a new slide?$tr$, $tr$["Home, New Slide", "Layout, Margins", "File, Close", "View, Zoom"]$tr$::jsonb),
('292c93e4-d693-462c-a296-380b97a239df', $tr$What does checking if the pictures fit the content make sure of?$tr$, $tr$["The relevance of the pictures to the project", "The price of the pictures", "Only the file size", "The number of letters used"]$tr$::jsonb),
('292df4b8-8730-4967-b2a1-ecee994eee1d', $tr$Who should you NOT share the meeting link with?$tr$, $tr$["People who should not join", "The teacher", "Classmates", "No one to give it to"]$tr$::jsonb),
('2a2d8f0d-eef1-4b8b-8bf0-08e8a0757306', $tr$What is Shape Fill?$tr$, $tr$["The color inside a shape", "The edge of a shape", "The size of the slide", "The file name"]$tr$::jsonb),
('2a813109-599f-4e05-8e19-cdbabaa91975', $tr$Where is Pictures?$tr$, $tr$["Insert tab", "Design tab", "Home tab", "Slide Show tab"]$tr$::jsonb),
('2a89d197-ff44-43fa-988a-6e9d2b47602d', $tr$What should you do if you don't understand something?$tr$, $tr$["Ask your teacher for help", "Just don't do it", "Cry", "Run outside"]$tr$::jsonb),
('2ab73e69-49c6-4c98-86c3-e5b6afb6e26c', $tr$Why is proper computer practice important?$tr$, $tr$["It helps you be a responsible and safe user", "No reason", "Only for grades", "It has no purpose"]$tr$::jsonb),
('2ad81263-c903-4785-85ca-8944e97d2586', $tr$Why watch your screen time?$tr$, $tr$["Too much can be bad for your health", "No effect", "It's always good", "No need to watch it"]$tr$::jsonb),
('2ade7495-e5f6-4cd5-afbc-4ec73a575823', $tr$Why is it important to accept feedback from others about your project?$tr$, $tr$["It helps improve the quality of the work", "It has nothing to do with the quality of the work", "You should be ashamed of it and avoid it", "You should not listen to feedback from others"]$tr$::jsonb),
('2b833da3-d5cf-411c-9eb5-7584c65c8806', $tr$Where do you choose an animation effect?$tr$, $tr$["Animations tab", "Transitions tab", "Only the Insert tab", "File tab"]$tr$::jsonb),
('2bc4d5be-8138-4e75-a77a-f50097e62ef9', $tr$What should we be when using the Internet?$tr$, $tr$["Responsible", "Careless", "Reckless", "Rude"]$tr$::jsonb),
('2c09f291-0a10-4c5d-8342-65865042d29f', $tr$What is a vertical line of cells in a spreadsheet?$tr$, $tr$["Column", "Row", "Only a cell", "Only a sheet"]$tr$::jsonb),
('2c93c545-3305-4c31-8731-e9c225058e51', $tr$What does checking the spelling and grammar of a project make sure of?$tr$, $tr$["The project looks professional", "How fast the project is finished", "The price of the project", "Only the file size"]$tr$::jsonb),
('2cd12f1a-22e8-4429-8cd6-1d27ce4716cb', $tr$How often should you take a break?$tr$, $tr$["Every 20-30 minutes", "Once a year", "No need", "Every 5 hours"]$tr$::jsonb),
('2cd5bdd6-d04c-4030-aa58-2b35d95588ac', $tr$What is desktop publishing?$tr$, $tr$["Making professional documents", "Only making a spreadsheet", "Only playing a computer game", "Only writing an email"]$tr$::jsonb),
('2d748ecf-ba2e-445b-8ec0-fa578f2a9329', $tr$How do you make a picture bigger without stretching it?$tr$, $tr$["Drag a corner handle", "Drag only a side", "Press F5", "Change the theme"]$tr$::jsonb),
('2deeefed-c20d-427c-b0a5-5cf581af4b69', $tr$What do you need to do before presenting a portfolio?$tr$, $tr$["Check it and prepare your explanation", "Show it right away without preparing", "Delete it before presenting", "Nothing, no need to prepare"]$tr$::jsonb),
('2e0a37dc-8cf0-40a1-9431-ba44dfc42c51', $tr$What is another way to take care of the computer?$tr$, $tr$["Regular cleaning", "Breaking it", "Leaving it in the rain", "Nothing"]$tr$::jsonb),
('2ea5ffbc-c614-44ca-acb2-a007f49785bb', $tr$What will we make with productivity software?$tr$, $tr$["Word documents and presentations", "Nothing", "Only one thing", "We will make nothing"]$tr$::jsonb),
('2ee1914e-edd4-43ab-9205-1547eb9f952a', $tr$Where can you find Text Box?$tr$, $tr$["Insert tab", "Design tab", "Layout tab", "View tab"]$tr$::jsonb),
('2ffcb9e2-6bd0-4854-a228-8c025d49c1bb', $tr$What skill can you mention about the brochure?$tr$, $tr$["Layout and page design", "Only cooking", "Only sewing", "Only farming"]$tr$::jsonb),
('30301848-99b8-4dd4-872c-1811781e21a1', $tr$Your classmate said that a picture in your brochure is blurry. What is the right thing to do?$tr$, $tr$["Replace the picture with a clearer version", "Just ignore the feedback", "Remove the whole brochure", "Get angry at the classmate who gave the feedback"]$tr$::jsonb),
('30342254-c16a-49d3-a9e5-f64a984881ff', $tr$What do you use to make a form private?$tr$, $tr$["Settings", "There is no way", "Color", "Font"]$tr$::jsonb),
('30527b53-0733-41b4-b562-21e0113916ce', $tr$You want a red edge on the circle. Use:$tr$, $tr$["Shape Outline", "Shape Fill", "Crop", "Theme"]$tr$::jsonb),
('3109da2f-5344-4471-b746-4ce8bf05d551', $tr$What should you do when you see a suspicious link?$tr$, $tr$["Don't click it", "Click it right away", "Share it with others", "Reply with your personal information"]$tr$::jsonb),
('315986a2-12e1-41d2-9de5-b6086f53e78a', $tr$The edge or outline of the letters is changed with:$tr$, $tr$["Text Outline", "Text Fill", "Font size", "Theme"]$tr$::jsonb),
('317e4560-a44a-42d2-86fe-3c87e11a3383', $tr$What should you think about when using online tools?$tr$, $tr$["Privacy and responsibility", "Nothing", "Only speed", "Only color"]$tr$::jsonb),
('31c31591-ac76-41bb-a819-6ffe0afee042', $tr$Why is a good presentation important?$tr$, $tr$["It helps share the message clearly", "It doesn't matter", "Only for decoration", "It is not needed"]$tr$::jsonb),
('31d99e60-3ddd-488d-a2a8-809e422261d5', $tr$Why is taking care of equipment important?$tr$, $tr$["So it lasts longer", "No reason", "Just so it looks nice", "It is useless"]$tr$::jsonb),
('33685e2c-2b27-4b3b-add4-f7ee712191fb', $tr$Yellow letters on white paper are hard to read. What is better?$tr$, $tr$["Black or a dark color", "A lighter yellow", "White letters", "Gray letters"]$tr$::jsonb),
('33edc46b-6538-4953-af34-6b7ac030a476', $tr$What does a scanner do?$tr$, $tr$["Takes a digital picture of a document", "Prints on paper", "Makes sound", "Processes information"]$tr$::jsonb),
('33f496cc-f9bc-490a-b85c-1de432db515a', $tr$What is a spreadsheet?$tr$, $tr$["A program with a grid of rows and columns", "A kind of game", "A kind of photo", "A kind of song"]$tr$::jsonb),
('3423108f-c52d-4d65-9ca6-0987185be9ad', $tr$What is one way to keep a positive digital footprint?$tr$, $tr$["Think before you post", "Just post without thinking", "Share all your personal information", "Say hurtful words"]$tr$::jsonb),
('34fa1319-c102-4a9a-bf3d-6e5e47b07ee0', $tr$What do you use to keep files organized?$tr$, $tr$["Folders", "Nothing", "Only color", "Only font"]$tr$::jsonb),
('36fe9132-e46e-4c7a-bfd7-b4165ede70f8', $tr$Who should you ask for help if you are confused?$tr$, $tr$["Teacher", "A stranger", "No one", "Only a classmate"]$tr$::jsonb),
('374e5404-f292-411b-869c-a9c2f5fa851f', $tr$What do you call being careful when collecting data?$tr$, $tr$["Data ethics", "Data waste", "Data noise", "Data error"]$tr$::jsonb),
('3769d92a-8d2d-4ac8-802d-f2d730ab4ef1', $tr$What is a word processor?$tr$, $tr$["A program for writing documents", "A program only for drawing", "A program for watching videos", "A program for playing games"]$tr$::jsonb),
('378f0df0-e6ec-4361-86c4-80370f743312', $tr$Why are these online tools important?$tr$, $tr$["They help with learning and communication", "They have no use", "Only for a grade", "They are useless"]$tr$::jsonb),
('37e8f626-02ec-43a6-8f05-6936a2bc7af0', $tr$How far should the screen be from your eyes?$tr$, $tr$["About an arm's length away", "Very close", "Very far", "There is no right distance"]$tr$::jsonb),
('37ec25b5-eb4c-4857-97a8-1b73fe335bb7', $tr$What should you do if you see something strange online?$tr$, $tr$["Tell a trusted adult", "Hide it", "Ignore it", "Click it"]$tr$::jsonb),
('380ae23d-33e0-4808-b1b9-12a8e045caaa', $tr$What is included in multimedia in a presentation?$tr$, $tr$["Photos, sounds, or short videos", "Only text", "Nothing", "Only numbers"]$tr$::jsonb),
('3811210d-2202-40cf-8f18-266bfa0ef9f5', $tr$Where can you see all the slides at once?$tr$, $tr$["Slide pane", "Slide area", "Title bar", "Placeholder"]$tr$::jsonb),
('382f5d55-3180-4124-975a-b1a14d6ce5eb', $tr$Who should you ask for permission before downloading?$tr$, $tr$["Parent", "A stranger", "No one", "An online friend"]$tr$::jsonb),
('384ffb99-ea70-41d4-948e-4de749d4e3a9', $tr$What should you set up first in a new document?$tr$, $tr$["Page setup", "Letter color", "Pictures", "The teacher's name"]$tr$::jsonb),
('38511804-535e-42b7-8916-26c819ee1fe9', $tr$What should you ask when checking information online?$tr$, $tr$["Who made it, when it was published, and is there proof", "Only the website's color", "The font size", "Nothing, just believe it right away"]$tr$::jsonb),
('395a1647-76bd-4871-aee8-fb97683a1d7e', $tr$Why is it important to look at the date something was published?$tr$, $tr$["Old information may no longer be correct", "The date has no effect", "All dates matter the same", "No need to look"]$tr$::jsonb),
('3a9e67c0-0347-4d9e-bee1-097fe9ab7c8c', $tr$What happens if you posted something negative online before?$tr$, $tr$["It can still be seen even after you delete it", "It disappears right away", "It has no effect now", "It was never saved anywhere"]$tr$::jsonb),
('3afa587d-7398-40fc-b5d4-216721f62899', $tr$What is the main job of the CPU?$tr$, $tr$["It processes information", "It shows photos", "It makes sound", "It prints on paper"]$tr$::jsonb),
('3b325261-8bd6-415e-a830-eb1fd76332f8', $tr$Compare two emails: Email A says "Hi, just a reminder that the project deadline is tomorrow. - Teacher Rose" from a known school email. Email B says "URGENT!!! Your account will be DELETED unless you click this link and enter your password NOW!" Which is more likely phishing, and why?$tr$, $tr$["Email B, because it uses urgency, threats, and asks for a password", "Email A, because it mentions a deadline", "Both are phishing because they are both emails", "Neither is phishing since both use exclamation marks"]$tr$::jsonb),
('3b382a25-5852-4e15-a406-b5e0193758b7', $tr$Why is it important to organize files well?$tr$, $tr$["It makes the work easier", "No reason", "Only for a grade", "It is useless"]$tr$::jsonb),
('3b731056-9fcb-4129-9401-afc1a635b190', $tr$Which tab has Themes?$tr$, $tr$["Design", "Home", "Insert", "Slide Show"]$tr$::jsonb),
('3ba70594-2339-48e3-ad18-0f140df70f7c', $tr$Who is responsible for a positive digital footprint?$tr$, $tr$["Each one of us", "Only the computer", "Only the internet provider", "No one"]$tr$::jsonb),
('3bc7c182-4be4-46ca-afdd-1c9a1d5755d4', $tr$What is a horizontal line of cells in a spreadsheet?$tr$, $tr$["Row", "Column", "Only a cell", "Only a sheet"]$tr$::jsonb),
('3c2f63ad-3579-4c5a-ba67-83bcbad27770', $tr$What should you answer when someone asks about a project?$tr$, $tr$["Its purpose and how it was made", "The price of the computer", "Only the class time", "Nothing, you don't need to answer"]$tr$::jsonb),
('3ce1f38e-29ab-4ff9-9f87-1b396c34a5ab', $tr$Which software is for presenting to the class?$tr$, $tr$["Presentation", "Spreadsheet", "Word processing", "Desktop publishing"]$tr$::jsonb),
('3d128d99-18a8-45c2-87c4-4617ec449173', $tr$How is the digital footprint connected to checking information?$tr$, $tr$["Both are part of using the Internet responsibly", "No connection", "One is about science", "One is about math"]$tr$::jsonb),
('3d66ba90-4d42-463e-a458-46162f21410d', $tr$A4, Letter, and Legal are examples of:$tr$, $tr$["page size", "orientation", "font", "color"]$tr$::jsonb),
('3e957757-dbe6-42ee-bdb2-6a6f764bd39c', $tr$Which greeting-and-closing pair best fits a formal email to your school's guidance counselor?$tr$, $tr$["'Good day, Ma'am' ... 'Respectfully yours'", "'Hey!' ... 'OK, let's go'", "no greeting ... no closing", "'Yo!' ... 'Peace out'"]$tr$::jsonb),
('3ec9b1b0-0a51-4429-bfd0-0ca9caf04312', $tr$What is a peripheral device?$tr$, $tr$["A device you connect to the computer", "Only the main computer", "A kind of software", "A kind of internet"]$tr$::jsonb),
('3f6e5d43-22b5-4612-92a1-a65020686ff3', $tr$What do you call written work made in a word processor?$tr$, $tr$["Document", "Slide", "Spreadsheet", "Picture"]$tr$::jsonb),
('3f951b4c-2b06-4309-9758-28c5d855d1be', $tr$What is the last step after designing?$tr$, $tr$["Save and print", "Delete the template", "Close without saving", "Change the language"]$tr$::jsonb),
('3fa840ef-32a8-41e7-ac66-844ab658c99b', $tr$What is a slide?$tr$, $tr$["One 'page' of a presentation", "A kind of sound", "Only a kind of picture", "A kind of document"]$tr$::jsonb),
('3fbe499c-160d-47a4-8e1e-80be948456d0', $tr$What should you use to clean the screen?$tr$, $tr$["A clean, dry cloth", "A wet towel", "A spoon", "Nothing"]$tr$::jsonb),
('3fbea4ce-bf8d-43cb-bdbc-76aeded47890', $tr$Why is privacy important in a video call?$tr$, $tr$["It keeps us safe", "No reason", "Only for a grade", "It is useless"]$tr$::jsonb),
('3fc6d24c-9a6a-4902-a2c8-a6e2aeda1818', $tr$What is portrait orientation?$tr$, $tr$["Upright, tall paper", "Sideways, wide paper", "Round paper", "Small paper"]$tr$::jsonb),
('40ad503f-367c-459d-a3c4-a16806adfc6f', $tr$Why log out after using an account?$tr$, $tr$["So others can't get in", "No need to do it", "No effect", "It only slows things down"]$tr$::jsonb),
('4181cc36-866f-4c2f-85bd-28da175283ad', $tr$Why should each slide focus on one clear message?$tr$, $tr$["So the audience doesn't get confused", "It doesn't matter", "As long as there is lots of information, it's okay", "Being clear is not important"]$tr$::jsonb),
('41c92928-7dbb-4342-b8cc-03cca7b4cfa7', $tr$What matters more for the text on a slide?$tr$, $tr$["Easy to read", "The most colors", "The smallest letters", "The most effects"]$tr$::jsonb),
('42c67f49-fb77-4a1a-aba1-ed1f840b4212', $tr$How do sound or video help a presentation?$tr$, $tr$["They make the presentation more interesting and engaging", "They don't help", "They only make it harder to make", "They are not needed"]$tr$::jsonb),
('4392cb5b-ba39-4341-b80a-78714ffd076c', $tr$Which one is portable and has its own battery?$tr$, $tr$["Laptop", "Only the desktop", "Printer", "Only the monitor"]$tr$::jsonb),
('43a09b31-2cf8-4180-bcea-c08a660d4511', $tr$What did we learn about staying safe online?$tr$, $tr$["Correct posture and Internet rules", "We learned nothing", "Only one thing", "Nothing"]$tr$::jsonb),
('43b93817-1aa6-4d96-b25e-4a0347f11cd9', $tr$What did we learn about web conferencing?$tr$, $tr$["Meeting online safely", "Nothing", "Only one thing", "We learned nothing"]$tr$::jsonb),
('43bc0dc8-b04f-4381-80d8-5c37dfe7b63f', $tr$What happens if you don't follow the right order in an algorithm?$tr$, $tr$["The task may not succeed", "The result will always still be right", "It has no effect on the result", "The result will be even faster"]$tr$::jsonb),
('4448f006-6f06-4dd2-a084-1cdd14a26e72', $tr$What skill can you mention about the presentation?$tr$, $tr$["Animation and slide transitions", "Only cooking", "Only farming", "Only sewing"]$tr$::jsonb),
('457c06b4-ecc6-475b-b09c-db3e2d82defe', $tr$A student made a flyer full of text that is hard to understand. What is the problem?$tr$, $tr$["Too much information, not enough clarity", "The design is too simple", "There is no problem", "The paper is too small"]$tr$::jsonb),
('457eb0dd-2877-4df8-9dbf-2ba7416af9e0', $tr$You made all the text WordArt and now it's messy. What is the advice?$tr$, $tr$["Use WordArt only for the title", "Add even more WordArt", "Make all the letters smaller", "Delete the slide"]$tr$::jsonb),
('4582fa8b-9939-4002-a47c-e365b837cdcd', $tr$What should you do before using the keyboard?$tr$, $tr$["Clean your hands", "Eat first", "Run", "Drink"]$tr$::jsonb),
('4676459e-a210-4732-a574-82fadac26e0f', $tr$Why is taking care of equipment important?$tr$, $tr$["So it lasts longer", "No reason", "Just so it looks nice", "It is useless"]$tr$::jsonb),
('468133a4-bb4e-4a68-8a99-1903c7a606d5', $tr$What happens if there is too much text on one slide?$tr$, $tr$["The audience will find it hard to read and understand", "It will be clearer", "No effect", "It is easier to understand"]$tr$::jsonb),
('46c57d41-1388-4cff-87fd-dd15e1820bfb', $tr$What happens if you use a computer without a break?$tr$, $tr$["Your eyes and body get tired", "Nothing happens", "Your eyes get stronger", "It is good for your body"]$tr$::jsonb),
('4759b695-21e1-47ad-855b-a82af3ad2f9b', $tr$What is spreadsheet software used for?$tr$, $tr$["Organizing data in cells", "Only making slides", "Only typing letters", "Only drawing"]$tr$::jsonb),
('47ab111b-4586-45b9-ab5d-399a726d1130', $tr$What is Justify?$tr$, $tr$["Even on the left and right", "Only in the middle", "Only lined up on the right", "Dark, bold letters"]$tr$::jsonb),
('47c04ba7-48d5-42f1-993e-f4cc41986d51', $tr$Ten students received an email from their adviser asking who wants extra Math tutorials. One student clicks Reply All and writes "Me, please!" What problem does this cause, and what should the student have done instead?$tr$, $tr$["It sends an unnecessary message to all 10 people; the student should have replied only to the adviser", "There is no problem, Reply All is always correct", "It automatically deletes the adviser's email", "It sends the message as spam to the whole school"]$tr$::jsonb),
('4838aaee-6550-4caa-8f21-25106f3543e4', $tr$Why review the skills you learned?$tr$, $tr$["To strengthen what you know before a new project", "No need to review", "It is useless", "Just to entertain the teacher"]$tr$::jsonb),
('48c6520c-13ab-4439-b391-2345531df61e', $tr$Which is an example of a change you can make after reviewing?$tr$, $tr$["Changing the font or adding a picture", "Deleting the whole project", "Closing the program without saving", "Only writing a new name"]$tr$::jsonb),
('48f1f64f-c104-4f59-b1ab-735c125cc8cc', $tr$What is presentation software used for?$tr$, $tr$["Making slides", "Only typing documents", "Organizing data in cells", "Only drawing"]$tr$::jsonb),
('493c3371-9189-4e8b-981a-99b8ffca5a10', $tr$What three documents did we make this term?$tr$, $tr$["Word document, presentation, and brochure", "Only a spreadsheet", "Only an email", "Only a video"]$tr$::jsonb),
('498abf13-12fe-404a-b58c-97521b693c1d', $tr$Which pictures can you use?$tr$, $tr$["Your own pictures or ones free to use", "Any picture without asking", "A picture with the owner's name erased", "Someone else's picture without credit"]$tr$::jsonb),
('49abf67b-eea0-4acc-909a-eba5241d9c41', $tr$Why do we use a template?$tr$, $tr$["The design is faster and neater", "To lose the file", "So there is no color", "So you can't print"]$tr$::jsonb),
('49fa6cb2-f7bc-43e5-967d-51e0acf34c30', $tr$Where should you use WordArt?$tr$, $tr$["In the title", "In all the text", "In every bullet", "In the speaker notes"]$tr$::jsonb),
('4ac90351-64a6-4566-92af-ffac4ac10f9a', $tr$Which key do you use to start a new paragraph?$tr$, $tr$["Enter", "Delete", "Esc", "Shift"]$tr$::jsonb),
('4af997f9-43dd-47f9-8070-849844e27996', $tr$Why is online security important?$tr$, $tr$["It helps protect personal information", "It doesn't matter", "It is not a real issue", "It is only for adults"]$tr$::jsonb),
('4b4ec4bb-f06b-405e-8081-9ba3e6e5868c', $tr$Which one is presentation software?$tr$, $tr$["PowerPoint", "Calculator", "Notepad", "Music player"]$tr$::jsonb),
('4b5feb9c-60a3-42c6-b640-3a12fae9d84b', $tr$Why should you look at the date something was published?$tr$, $tr$["Old information may no longer be correct", "No effect", "All dates are the same", "No need to look"]$tr$::jsonb),
('4b789bf4-f82a-47b2-ab53-1d413aeebb18', $tr$What happens when people believe fake news?$tr$, $tr$["It can lead to wrong knowledge and decisions", "No effect", "The result is always positive", "It only makes your knowledge stronger"]$tr$::jsonb),
('4c134e40-62cd-4dd5-bb73-a65bd09ed1e6', $tr$Why use only one theme?$tr$, $tr$["So the slides all look the same", "To delete the slides", "To make the letters smaller", "To slow down the computer"]$tr$::jsonb),
('4c39be41-3fd3-4d16-838e-43df8cb22226', $tr$Why are pictures important in a presentation?$tr$, $tr$["They help people understand", "They replace talking", "They make the report longer", "They are useless"]$tr$::jsonb),
('4cd30b4c-32f0-4cb6-8d08-ab3d6cf68ac5', $tr$What does presenting your finished portfolio show?$tr$, $tr$["All the ICT skills we learned this term", "Carelessness in the work", "No interest in ICT", "Only a lack of time"]$tr$::jsonb),
('4d189a97-1aff-4301-a778-865c3460976c', $tr$What should you do with the keyboard when it is not in use?$tr$, $tr$["Cover it", "Get it wet", "Leave it uncovered", "Nothing"]$tr$::jsonb),
('4d63aa35-63f4-4b38-82a5-65bc31bd1fd8', $tr$Why should you not use too much animation?$tr$, $tr$["It distracts from the message", "It is faster to make", "There is no reason", "It always looks better"]$tr$::jsonb),
('4da1e1ff-1faa-44c7-b131-3235a0b4fb4c', $tr$What is booting?$tr$, $tr$["The process of starting the computer", "The process of turning off the computer", "A kind of software", "A kind of game"]$tr$::jsonb),
('4dcd7974-a2da-4632-9366-436cc87a5523', $tr$What is the difference between portrait and landscape?$tr$, $tr$["Portrait is upright, landscape is sideways", "They are the same", "Landscape is a color", "Portrait is a font"]$tr$::jsonb),
('4e18bd65-eefc-4908-9b4c-5065cc55704c', $tr$What should you do before using the equipment?$tr$, $tr$["Clean your hands", "Eat first", "Run", "Drink"]$tr$::jsonb),
('4f19bf0f-4a44-44a1-b8c6-110f0b4513a3', $tr$How text is lined up is called:$tr$, $tr$["alignment", "orientation", "margin", "size"]$tr$::jsonb),
('4f47bda8-fe58-4b2c-af22-5f086e7b3067', $tr$What should you do after getting feedback on a project?$tr$, $tr$["Make changes based on the feedback", "Just forget the feedback you got", "Close the project right away", "Submit it right away even without changes"]$tr$::jsonb),
('5013b000-6fde-46c1-818c-beee8a1c5f24', $tr$What is an example of using a spreadsheet?$tr$, $tr$["Recording grades in a subject", "Only drawing pictures", "Watching videos", "Playing computer games"]$tr$::jsonb),
('502216c1-a336-42d8-a2e6-7b532ccb6798', $tr$What is the right way to make a picture smaller?$tr$, $tr$["Drag a corner handle inward", "Delete it and do it again", "Change the theme", "Crop everything"]$tr$::jsonb),
('503afe02-924c-4501-a58d-109c7fcceda1', $tr$Which everyday task can be turned into an algorithm?$tr$, $tr$["Getting ready for school", "None, tasks can't be turned into algorithms", "Something with no steps", "A random thought"]$tr$::jsonb),
('5154a3f3-6fec-41a5-8850-ae87fe36356f', $tr$Which margin setting gives more space for text?$tr$, $tr$["Narrow", "Wide", "Big", "Double"]$tr$::jsonb),
('5294cde4-c031-4e36-8eff-585cb7d205c0', $tr$What is booting?$tr$, $tr$["The process of starting the computer", "The process of turning off the computer", "A kind of software", "A kind of game"]$tr$::jsonb),
('52a1ae1d-1917-4582-8218-d00434f0ddcd', $tr$What does a printer do?$tr$, $tr$["Makes a paper copy", "Takes a picture", "Processes information", "Shows photos"]$tr$::jsonb),
('532cd459-0cbb-4ed2-9285-1e0c3f6e09df', $tr$Why is it important to learn to care for your digital footprint at a young age?$tr$, $tr$["To be responsible online as you grow up", "There is no need to learn it", "It is only for adults", "It has no effect"]$tr$::jsonb),
('546221ff-329d-43ed-96d9-d5aa57f97fbb', $tr$Why should you not use too many fonts?$tr$, $tr$["The document becomes messy", "The computer gets faster", "The paper gets bigger", "The file disappears"]$tr$::jsonb),
('54699646-ce0f-47bb-87e6-fd9fb8926ecf', $tr$What is a digital footprint?$tr$, $tr$["The trail we leave on the Internet", "A kind of game", "Just a kind of photo", "A kind of computer"]$tr$::jsonb),
('549a356d-9f7f-4c28-8d6c-215e7c911c3c', $tr$Why do we use a flowchart to plan a task?$tr$, $tr$["It gives a picture of the process", "It is useless", "It is only used for pictures", "It is not used in ICT"]$tr$::jsonb),
('54c66369-0672-46ff-8df4-97832f310f65', $tr$What should you avoid online?$tr$, $tr$["Suspicious links", "Safe websites", "School lessons", "Educational games"]$tr$::jsonb),
('54dae5f1-fa43-4d6d-904a-3ff5054ae3c1', $tr$A student used lots of animation on every word in their slide. What is the problem?$tr$, $tr$["It becomes messy and distracting", "There is no problem", "It looks more professional", "It makes the presentation faster"]$tr$::jsonb),
('54eec6e5-9aa7-4335-9aee-ab2de6dad5a0', $tr$The blank part around the page is called the:$tr$, $tr$["margin", "font", "cursor", "ribbon"]$tr$::jsonb),
('5503f414-636b-4d28-ad62-6339f94fae10', $tr$Why do we teach kids about the digital footprint?$tr$, $tr$["So they are responsible for their online presence", "It has no purpose", "To get them to post without thinking", "It is not part of ICT"]$tr$::jsonb),
('55b58bca-df24-438f-9fa9-071a29aa9a48', $tr$Why avoid too much text on a slide?$tr$, $tr$["It is hard to read and understand", "No effect", "More text is better", "It is required"]$tr$::jsonb),
('55f3be03-2765-45fb-9f8b-1b6237c6b74b', $tr$Why do we write where a picture came from?$tr$, $tr$["To respect the owner", "To make the file bigger", "To make the slide faster", "No reason"]$tr$::jsonb),
('56f1f8af-1144-40ee-bfdf-ee374d9d37fa', $tr$How many sides does the margin have?$tr$, $tr$["Four: top, bottom, left, right", "Only one", "Only two", "None"]$tr$::jsonb),
('574170bd-ca3b-474e-ae66-747abfc8eb88', $tr$Why is it important to save often?$tr$, $tr$["So your work is not lost", "To make the letters bigger", "To make the colors nicer", "To make the internet faster"]$tr$::jsonb),
('57759cfd-b959-4feb-979c-781a24b3404c', $tr$What do you call the place where a row and a column meet?$tr$, $tr$["Cell", "Sheet", "Tab", "Formula"]$tr$::jsonb),
('58036a84-eb8c-43a8-9f16-e3234f4ed98f', $tr$Why should you not share your password with others?$tr$, $tr$["So no one can get into your account", "So the mouse does not break", "So the internet gets faster"]$tr$::jsonb),
('5812c755-e5d3-4074-a7b7-a2f8174b4a9a', $tr$Why should you be on time?$tr$, $tr$["So the meeting is not delayed", "No reason", "Only to obey the teacher", "It is useless"]$tr$::jsonb),
('5828d563-41be-4bd2-a040-e43a9d07af9f', $tr$Why should you avoid too much text on one slide?$tr$, $tr$["The audience will find it hard to read and understand", "It has no effect", "More text is better", "Lots of text is required"]$tr$::jsonb),
('5903d6ef-e3a6-494a-8091-6fe6e8a8ffc8', $tr$What is a tri-fold reading material?$tr$, $tr$["Brochure", "Flyer", "Poster", "Letter"]$tr$::jsonb),
('591a1db0-886d-4be4-8c5f-61dc29ff34bf', $tr$What does checking the spelling and grammar of a project make sure of?$tr$, $tr$["The project looks professional", "How fast the project is finished", "The price of the project", "Only the file size"]$tr$::jsonb),
('5a3581f0-88a8-49a1-aa93-f5d756c4a644', $tr$Why should a presentation have only a few transitions?$tr$, $tr$["To avoid being distracting", "To make it messier", "It doesn't matter", "Many transitions are required"]$tr$::jsonb),
('5a6b9b60-8f95-4dd4-beda-e695955c3f96', $tr$What is layout?$tr$, $tr$["How the elements are arranged on the page", "Only the color of the document", "Only the number of pages", "Only the kind of font"]$tr$::jsonb),
('5b1d702f-f79c-4f95-8ac3-8c3835ee3637', $tr$What does checking if the pictures fit the content make sure of?$tr$, $tr$["The relevance of the pictures to the project", "The price of the pictures", "Only the file size", "The number of letters used"]$tr$::jsonb),
('5d0464ba-1171-4ed5-85a7-36197183747b', $tr$You need one more slide. Go to:$tr$, $tr$["Home, New Slide", "Design, Themes", "View, Zoom", "Layout, Size"]$tr$::jsonb),
('5d31d074-d676-4cc5-9ba4-1b42122d8290', $tr$Which shortcut underlines text?$tr$, $tr$["Ctrl + U", "Ctrl + B", "Ctrl + I", "Ctrl + A"]$tr$::jsonb),
('5d6de653-425c-4c31-9a7c-2f5068d4a89f', $tr$What is an example of data you can record?$tr$, $tr$["Spending for one week", "A poem", "A letter", "A news story"]$tr$::jsonb),
('5ec37ead-0d0e-45d0-8483-b37cd834783a', $tr$What happens if a slide has too much text?$tr$, $tr$["The audience will find it hard to read", "It will be clearer", "No effect", "It is easier to understand"]$tr$::jsonb),
('5f0f451c-ae4e-4810-803a-63a07b546444', $tr$Why are the online tools we learned important?$tr$, $tr$["They help with learning and communication", "They have no use", "Only for a grade", "They are useless"]$tr$::jsonb),
('5f12dea5-7a36-4fcd-a6ac-66c3572bb4e2', $tr$What do good manners in a video call show?$tr$, $tr$["Respect for others", "Disrespect", "Carelessness", "No use"]$tr$::jsonb),
('5f2107bd-28c2-4e10-9cc2-7cc44cdcc74e', $tr$You have little time to make a card. What will help?$tr$, $tr$["Use a template", "Start from a blank page", "Don't make one", "Use a calculator"]$tr$::jsonb),
('5fd83103-1a7a-4cac-989d-9898a992882e', $tr$How do you upload a file to the cloud?$tr$, $tr$["Drag or select the file", "Just write the name", "There is no way", "Print it"]$tr$::jsonb),
('612208f8-0776-468d-b8ab-2944c6b3c971', $tr$What should you answer when someone asks about a project?$tr$, $tr$["Its purpose and how it was made", "The price of the computer", "Only the class time", "Nothing, you don't need to answer"]$tr$::jsonb),
('612d2879-c74f-4008-b8f0-b43e0f67952d', $tr$What is the main use of a search engine?$tr$, $tr$["To store food", "To search for information on the web", "To print pictures"]$tr$::jsonb),
('6189cd7c-0ecd-4897-9be8-f2ea28a867db', $tr$What is an example of a flowchart symbol?$tr$, $tr$["A rectangle for a step", "Notebook", "Pencil", "Scissors"]$tr$::jsonb),
('61b5d059-ac8c-4c7c-97c6-95576b30a094', $tr$Why think before posting?$tr$, $tr$["It can affect your reputation in the future", "No consequences", "Once it's said, it's done", "Not important"]$tr$::jsonb),
('61ba9671-cd11-4a36-8384-5dba416f7fbc', $tr$Which is an example of a web browser?$tr$, $tr$["Google Chrome", "MS Word", "Calculator"]$tr$::jsonb),
('6231ce1b-6207-438a-b627-66767f43ec8c', $tr$Why not share personal information?$tr$, $tr$["People with bad intentions can use it", "Always safe to do", "Required to do", "No danger"]$tr$::jsonb),
('6240a167-681b-4298-a6c5-924675cc64b7', $tr$Why should we organize data?$tr$, $tr$["It is easier to check and understand", "It doesn't matter", "It only makes things messier", "It is not used in real life"]$tr$::jsonb),
('62856bda-4d3a-4c5f-8fc4-bf753d2e6fa9', $tr$A matching background, colors, and fonts are called a:$tr$, $tr$["theme", "margin", "cursor", "slide pane"]$tr$::jsonb),
('633352d4-6d07-44e6-b52e-512669d13d66', $tr$Which shape shows direction?$tr$, $tr$["Arrow", "Circle", "Star", "Heart"]$tr$::jsonb),
('6396642f-30c6-42b4-bc9f-e7f608ad0c30', $tr$What is an algorithm?$tr$, $tr$["A step-by-step way to solve a problem", "A kind of game", "A kind of toy", "A kind of food"]$tr$::jsonb),
('640db6d3-4c45-4588-8dd2-8a188b7356aa', $tr$What should the contact info on a flyer include?$tr$, $tr$["A way to get in touch", "The color of clothes", "The price of paper", "The kind of printer"]$tr$::jsonb),
('64ca2c97-e719-476e-856b-87b0875f46ec', $tr$What is part of a digital footprint?$tr$, $tr$["Photos, messages, comments online", "Only things at home", "Cooking tools", "Only toys"]$tr$::jsonb),
('64db80c2-f7c1-4b3b-8068-665028f45705', $tr$Why is it important to explain the changes made based on feedback?$tr$, $tr$["To show how we have improved", "It is useless", "It is only done for a grade", "It only confuses the audience"]$tr$::jsonb),
('6595f51e-30b1-4f30-8cd1-2b5b09714641', $tr$WordArt fits best in:$tr$, $tr$["the slide title", "a long paragraph", "every bullet", "the speaker notes"]$tr$::jsonb),
('66a7393f-38be-4b6a-ab69-5b6fb556c081', $tr$You want an important word to look thicker. Use:$tr$, $tr$["Bold", "Italic", "Center", "Justify"]$tr$::jsonb),
('66fd90c6-5836-479c-8599-3f4b8ca3a29f', $tr$What is phishing?$tr$, $tr$["Trying to trick you to get your personal information", "A kind of game", "A kind of software", "Just a kind of email with no danger"]$tr$::jsonb),
('6745ae71-ce45-402a-b8ce-2e704a703049', $tr$Your poster is missing the date and place. What will you add?$tr$, $tr$["A Text Box with the date and place", "A new theme", "A smaller title", "A new file"]$tr$::jsonb),
('67eb9bae-91f6-4973-9c2a-2cb334dd7d16', $tr$What is landscape orientation?$tr$, $tr$["Sideways, wide paper", "Upright, tall paper", "Paper with no margin", "Colored paper"]$tr$::jsonb),
('6800d239-0a0a-4686-accb-a0e4863a69e7', $tr$What is desktop publishing?$tr$, $tr$["Making documents with a design", "Playing on the computer", "Calculating numbers", "Listening to music"]$tr$::jsonb),
('6a0a776a-c5e0-4aac-8b41-1793652fabd4', $tr$Which one is bigger and not easy to carry?$tr$, $tr$["Desktop", "Smartphone", "Tablet", "None is correct"]$tr$::jsonb),
('6a119e8a-e5f8-4cbd-8cbd-074b957ddd1e', $tr$What does Send Backward do?$tr$, $tr$["Puts it behind other objects", "Deletes the shape", "Makes the shape bigger", "Adds a slide"]$tr$::jsonb),
('6b4c6b46-ea86-4536-a97f-0647ab22db8d', $tr$What is written in the title placeholder?$tr$, $tr$["Click to add title", "Ctrl + S", "Page 1", "DRAFT"]$tr$::jsonb),
('6b97437b-f801-4ecb-bac7-18c06dbf9853', $tr$What is desktop publishing used for?$tr$, $tr$["Creating posters or newsletters", "Only organizing data", "Only typing letters", "Only making slides"]$tr$::jsonb),
('6ba8599b-5b94-49f2-b410-69a23d4e7f32', $tr$Which is an example of a word processor?$tr$, $tr$["Microsoft Word", "Calculator", "Paint", "Music player"]$tr$::jsonb),
('6bbe8a50-bf47-42c7-8d4d-a817264499d6', $tr$What should you do if you see something strange online?$tr$, $tr$["Tell a trusted adult", "Hide it", "Ignore it", "Click it"]$tr$::jsonb),
('6bf019bf-32fd-4d96-93ed-f285fef139e7', $tr$How do you make a textbox bigger?$tr$, $tr$["Drag the handles", "Press F5", "Press Esc", "Change the theme"]$tr$::jsonb),
('6bf6a9fa-5550-401c-8632-fb389350ec43', $tr$Why are good posture and time limits important?$tr$, $tr$["They protect your eyes and body", "No reason", "So you can play longer", "They are useless"]$tr$::jsonb),
('6c3d5631-a018-46c0-94d7-5a7e73d90088', $tr$You want to make the inside of the box blue. Use:$tr$, $tr$["Shape Fill", "Shape Outline", "Crop", "Text Box"]$tr$::jsonb),
('6c9f3442-b956-433f-92e4-faec58eb49cb', $tr$Why learn to use a spreadsheet in Grade 4?$tr$, $tr$["It is a basic skill for organizing", "No need to learn it", "Only for adults", "It has no use"]$tr$::jsonb),
('6cffd442-c842-475d-a5e9-59813fe78bf4', $tr$What should you think about when using online tools?$tr$, $tr$["Privacy and responsibility", "Nothing", "Only speed", "Only color"]$tr$::jsonb),
('6d33d697-f3e0-4a6f-a5b9-22d762efc195', $tr$Why is shutting down properly important?$tr$, $tr$["So the computer doesn't get damaged", "No reason", "So the game lasts longer", "It is useless"]$tr$::jsonb),
('6dc2a075-3055-4104-b8b4-1bae62a5778a', $tr$Why is it good to use a template?$tr$, $tr$["It saves time and gives a neat layout", "It only makes the work harder", "It is useless", "It makes the project harder"]$tr$::jsonb),
('6e3e3c94-bd02-46ff-a3c4-aaee3b691f9c', $tr$What should you do with the keyboard when it is not in use?$tr$, $tr$["Cover it", "Get it wet", "Leave it uncovered", "Nothing"]$tr$::jsonb),
('6e4870c9-cb37-43c2-8de9-dfa616aa988a', $tr$How do we choose the right device?$tr$, $tr$["It depends on the task", "Just randomly", "Only by color", "Only by price"]$tr$::jsonb),
('6f58493e-cbb7-4792-939f-ca8d33bc5a14', $tr$What should you avoid showing in your video call background?$tr$, $tr$["Personal information", "A clean room", "Good lighting", "None of these"]$tr$::jsonb),
('6fa7727c-66ce-4350-920f-3d6c323390ac', $tr$What did we learn about web conferencing?$tr$, $tr$["Meeting online safely", "Nothing", "Only one thing", "We learned nothing"]$tr$::jsonb),
('705411aa-4482-4e7c-b246-82d2f7bfc54e', $tr$What is the first step in the sample sandwich algorithm?$tr$, $tr$["Get some bread", "Eat it", "Close the sandwich", "Add the filling"]$tr$::jsonb),
('70678c90-3b42-4336-8dc7-47371d103014', $tr$Which is an example of Text Effects?$tr$, $tr$["Shadow and glow", "Page size", "Margin", "Orientation"]$tr$::jsonb),
('71afa0c7-f7c2-4ea3-ac70-9b05acd57f92', $tr$Where do you choose a slide transition effect?$tr$, $tr$["Transitions tab", "Animations tab", "Only the Insert tab", "File tab"]$tr$::jsonb),
('720e64c3-d0be-46a2-83ca-d6afc12f922a', $tr$Where are Text Box and WordArt?$tr$, $tr$["Insert tab", "Home tab", "Design tab", "View tab"]$tr$::jsonb),
('7219064b-dba8-4745-af7b-475bc7b767c1', $tr$Which key makes a new line?$tr$, $tr$["Enter", "Shift", "Esc", "Tab"]$tr$::jsonb),
('73a9a84a-2e5b-499b-8790-0849a3003108', $tr$Why should you not share your password with others?$tr$, $tr$["Because the computer will get faster", "Because they could get into your account", "Because the mouse will disappear"]$tr$::jsonb),
('73b55ac7-4ca6-4183-abef-165221482129', $tr$What should you avoid showing in your video call background?$tr$, $tr$["Personal information", "A clean room", "Good lighting", "None of these"]$tr$::jsonb),
('73c324dd-432b-4993-b9e5-9a5bd36d7888', $tr$You want each point on a list to appear one at a time. What will you use?$tr$, $tr$["Animation", "Only a slide transition", "Only audio", "Only video"]$tr$::jsonb),
('74154527-ec16-4bb7-9329-1be4d60885f4', $tr$Why review the presentation skills you learned?$tr$, $tr$["To strengthen what you know before a new project", "No need to review", "It is useless", "Just to entertain the teacher"]$tr$::jsonb),
('74c3360b-a5e0-4032-a91f-730694cfc8e5', $tr$What is the key to improving your skills?$tr$, $tr$["Practicing again and again", "Only once", "Not practicing anymore", "Avoiding it"]$tr$::jsonb),
('74ee848b-7943-4433-b0c1-eb9515c4df57', $tr$What should the contact info on a flyer include?$tr$, $tr$["A way to get in touch", "The color of clothes", "The price of paper", "The kind of printer"]$tr$::jsonb),
('751868d0-b281-4eb5-b004-417ea7a59219', $tr$Who should you NOT share the meeting link with?$tr$, $tr$["People who should not join", "The teacher", "Classmates", "No one to give it to"]$tr$::jsonb),
('7560c314-7564-4552-8530-9d9cf1ddd775', $tr$What is drag-and-drop?$tr$, $tr$["Pulling an item from one place to another", "Typing a letter", "Turning off the computer", "Only opening something"]$tr$::jsonb),
('756d10c4-5806-4037-9780-bc08ed260de6', $tr$Why is privacy important in a video call?$tr$, $tr$["It keeps us safe", "No reason", "Only for a grade", "It is useless"]$tr$::jsonb),
('75701fa5-47b0-4b0f-b859-fa33c6cd9463', $tr$Why should you not share personal information online?$tr$, $tr$["People with bad intentions might use it", "It is always safe to do", "You are required to do it", "There is no danger"]$tr$::jsonb),
('75735dc2-58f1-48d3-91b2-d9a234fc9937', $tr$What should you think about when choosing audio or video?$tr$, $tr$["It should be related to the topic", "It should be the longest one", "It should be random", "It should not be related to the topic"]$tr$::jsonb),
('75842a11-fda5-477d-a019-43b589dda06a', $tr$What should you do with your microphone when you are not speaking?$tr$, $tr$["Mute it", "Make it louder", "Just leave it on", "Break it"]$tr$::jsonb),
('75fae512-9d08-45b1-bfd4-93552da4e717', $tr$What is the headline on a flyer?$tr$, $tr$["Big text at the top", "Small text at the bottom", "Only a picture", "Only a contact number"]$tr$::jsonb),
('760becd1-52f6-4874-ab35-8352d7f5f1f6', $tr$What is an example of using what you learned in real life?$tr$, $tr$["Uploading a project to the cloud", "Nothing", "Only playing", "Only watching"]$tr$::jsonb),
('765343fe-d113-42c6-a9c4-dff8a74091a4', $tr$Why are Internet safety rules important?$tr$, $tr$["They protect us from danger online", "They are useless", "Only for grades", "They have no purpose"]$tr$::jsonb),
('77232eab-c827-4f80-a673-5cb0a7cffc95', $tr$What should you do if you get a suspicious message?$tr$, $tr$["Tell a parent or teacher", "Reply right away", "Share it with everyone", "Just ignore it"]$tr$::jsonb),
('7734b003-0758-4d85-a76c-d8d27e1e5a04', $tr$Why do we teach block coding to kids?$tr$, $tr$["To introduce the basics of logical thinking", "No purpose", "Just to entertain kids", "It is not related to ICT"]$tr$::jsonb),
('777bd503-c2df-495d-b21a-797a93620028', $tr$Why use fitting pictures in a presentation?$tr$, $tr$["They support the message", "Pictures are useless", "They only make it messier", "Pictures are not needed"]$tr$::jsonb),
('7797eab6-60ae-4dd8-bbd2-9e535c9164a1', $tr$The font does not change even when you press Bold. What is missing?$tr$, $tr$["You did not select the text", "The margin is wrong", "The paper is landscape", "There is no internet"]$tr$::jsonb),
('7904c3ee-0f75-4725-b465-36ed79492347', $tr$Which key ends the slide show?$tr$, $tr$["Esc", "F5", "Space", "Shift"]$tr$::jsonb),
('7934c71b-989c-4b19-91da-57170af4bb09', $tr$Which is another kind of computing device?$tr$, $tr$["Tablet", "Spoon", "Umbrella", "Shoes"]$tr$::jsonb),
('7a4abef7-6c7a-4296-be64-d1c6cfe17866', $tr$Why avoid hurtful words online?$tr$, $tr$["They can hurt others and stay forever", "No effect", "Safe to do online", "Required to do"]$tr$::jsonb),
('7c0c8ec6-6e32-419d-bc97-78374a4f84c5', $tr$In a template, what do you change?$tr$, $tr$["The words and pictures, to your own content", "The whole program", "The keyboard", "Nothing"]$tr$::jsonb),
('7d9cfb12-a5b6-48e0-ad51-05e90c37ca8d', $tr$Why do we teach kids to check online sources?$tr$, $tr$["To be a responsible Internet user", "No purpose", "Just for fun", "Not part of ICT"]$tr$::jsonb),
('7f2dcd2c-19a3-4914-9248-173541606b0b', $tr$Why is it important to check information before believing it?$tr$, $tr$["Not everything on the Internet is true", "Everything online is always true", "No need to check anymore", "False information has no effect"]$tr$::jsonb),
('8075636f-7e3e-413f-b335-d532f9ab9394', $tr$What is part of a digital footprint?$tr$, $tr$["Photos, messages, and comments shared online", "Only things at home", "Cooking tools", "Only toys"]$tr$::jsonb),
('80d04785-8282-47c2-a924-e031d2f89417', $tr$What should you avoid when collecting data?$tr$, $tr$["Information you don't need", "All information", "Nothing to avoid", "Only names"]$tr$::jsonb),
('81ee22a0-7ae9-4f14-957a-f0d05f495b5e', $tr$How do sound or video help?$tr$, $tr$["They make the presentation more interesting", "They don't help", "They make it harder", "They are not needed"]$tr$::jsonb),
('81ee3dd2-2c27-4274-883c-3c54377a4ac9', $tr$What is a template?$tr$, $tr$["A ready-made design that you can change", "Only a kind of picture", "Only a kind of font", "Only a kind of color"]$tr$::jsonb),
('81fea583-3e22-4fe6-8a5a-d6518139502b', $tr$Which one is flat, has a touch screen, and is bigger than a smartphone?$tr$, $tr$["Tablet", "Desktop", "Printer", "Speaker"]$tr$::jsonb),
('828daf90-7760-44de-a63f-d34d605161a5', $tr$What is a slide transition?$tr$, $tr$["An effect when moving from one slide to the next", "Movement of text inside a slide", "An embedded sound", "The background color"]$tr$::jsonb),
('82d4d04c-8fb9-4861-96cf-3a9ece30033e', $tr$Where can you see small pictures of all the slides?$tr$, $tr$["Slide pane", "Slide area", "Title bar", "Cursor"]$tr$::jsonb),
('82da3983-b5fe-4322-baa5-56ee2926d040', $tr$You deleted a word by mistake. What will you do?$tr$, $tr$["Press Ctrl + Z", "Close the file", "Press Ctrl + P", "Turn off the computer"]$tr$::jsonb),
('836d6374-f253-449e-beef-6c4b88f1e58d', $tr$What should you do after typing an important report?$tr$, $tr$["Save it", "Delete it", "Close without saving", "Forget it"]$tr$::jsonb),
('84102957-a83d-40cc-9098-95fe9220d2b0', $tr$A classmate sent a group email asking for volunteers for a Filipino Language Month program. Which response shows good email etiquette?$tr$, $tr$["'Good day! I would like to volunteer for the poster-making part. Thank you!'", "'i dont care about language month'", "Replying all with just 'k'", "Not reading the email at all"]$tr$::jsonb),
('84fdc5a9-bd98-41fa-b226-2d11f9fd377c', $tr$Your report is done. How do you stop the slide show?$tr$, $tr$["Press Esc", "Press F5", "Turn off the computer", "Press Enter"]$tr$::jsonb),
('853a3d7f-c53e-40f2-8fb9-41ff92338bfc', $tr$What does reviewing and improving a project show?$tr$, $tr$["Professionalism and effort in your work", "Carelessness in your work", "No interest in the project", "Only a lack of time"]$tr$::jsonb),
('8578d3a7-8d03-4f2e-b366-6ab2ee1d03bf', $tr$Why use fitting pictures?$tr$, $tr$["They support the message", "They are useless", "They only make it messy", "They are not needed"]$tr$::jsonb),
('85970fb5-4154-4ad8-9f36-422c96529413', $tr$Which of the following is an example of a flowchart symbol?$tr$, $tr$["A rectangle for a step", "A notebook", "A pencil", "A pair of scissors"]$tr$::jsonb),
('85b6f31e-08ff-4ae1-9180-b68ef340f7e8', $tr$Which is an example of a font type?$tr$, $tr$["Arial", "Bold", "Center", "A4"]$tr$::jsonb),
('85c082b8-90db-4e46-9687-1f98f1385865', $tr$Which is NOT usually made with desktop publishing?$tr$, $tr$["Calculating a budget", "Poster", "Flyer", "Certificate"]$tr$::jsonb),
('85d8e4a9-ff9c-450f-add5-6eacef723a16', $tr$Why are there different kinds of computing devices?$tr$, $tr$["For different needs", "No reason", "Just to look new", "They have no purpose"]$tr$::jsonb),
('86717db5-9aa5-439e-a8d3-f8bcc84b40f0', $tr$Where do you add audio or video?$tr$, $tr$["Insert tab", "Animations tab", "Transitions tab", "Only the Design tab"]$tr$::jsonb),
('86c9bb89-7caf-4e44-8dd8-1e07adf75f27', $tr$A flyer is used to:$tr$, $tr$["give an announcement or information", "calculate", "listen to music", "play games"]$tr$::jsonb),
('86cc74f4-6c94-4b3e-b89e-03b62cd8c2d6', $tr$What can you make in a word processor?$tr$, $tr$["Letters and essays", "Cooking", "Singing", "Running"]$tr$::jsonb),
('87250e15-284f-4619-8833-73e248fb86e6', $tr$What should you NOT share online?$tr$, $tr$["Personal information", "A picture of your favorite animal", "Your favorite color", "The name of a country"]$tr$::jsonb),
('87a41033-a152-4087-ab8b-a0a770a78835', $tr$You want a smooth effect when moving from slide 1 to slide 2. What will you use?$tr$, $tr$["Slide transition", "Only animation", "Only audio", "Only video"]$tr$::jsonb),
('87baff3e-dd35-47cd-ae14-6cb0d506f5f7', $tr$Where are tabs like Home and Insert?$tr$, $tr$["On the Ribbon", "On the Scroll bar", "On the Cursor", "In the Document area"]$tr$::jsonb),
('87e0d749-10b1-4270-b833-919ff362e916', $tr$Your poster is done. What should you do?$tr$, $tr$["Save and print", "Delete it right away", "Close without saving", "Change everything"]$tr$::jsonb),
('8826ab01-4b69-4fd2-89e3-d81e403a818b', $tr$How are spreadsheets connected to Math?$tr$, $tr$["The data can be used to make graphs", "No connection", "Math does not use data", "Not related to graphs"]$tr$::jsonb),
('883c8ee7-0c60-4971-a44d-c4a4a671abcd', $tr$What is the main job of the CPU?$tr$, $tr$["It processes information", "It shows photos", "It makes sound", "It prints on paper"]$tr$::jsonb),
('8864b857-c64c-41b9-b50a-6bd626f896c3', $tr$Where can you find Pictures and Shapes?$tr$, $tr$["Insert tab", "View tab", "File tab", "Review tab"]$tr$::jsonb),
('88900576-da41-4fdd-a679-2cb290844e8a', $tr$What is a spreadsheet?$tr$, $tr$["A program with a grid of rows and columns", "A kind of game", "A kind of photo", "A kind of song"]$tr$::jsonb),
('88c687df-0bad-4384-ad49-55e7ac9c7ff8', $tr$Which is another example of a peripheral device?$tr$, $tr$["Webcam", "CPU", "Monitor", "Motherboard"]$tr$::jsonb),
('88ec0f42-4fdf-4799-8633-8c91ca276fa9', $tr$What helps you type faster?$tr$, $tr$["Using the correct fingers", "Using only one finger", "Not looking at the keyboard without practicing", "Nothing helps"]$tr$::jsonb),
('88fc13dd-a108-45f4-aa63-5b7c26a9cc9d', $tr$Canva can be used for:$tr$, $tr$["desktop publishing", "calculating", "listening to music", "only typing code"]$tr$::jsonb),
('892ac466-f7ac-4368-b6f5-04b64f925bbd', $tr$What do you call being careful when collecting data?$tr$, $tr$["Data ethics", "Data waste", "Data noise", "Data error"]$tr$::jsonb),
('8937bc3a-17bc-4ef4-93af-181a5e25ec5f', $tr$Why should we avoid saying hurtful words online?$tr$, $tr$["They can hurt others and stay forever", "They have no effect", "It is safe to do online", "We are required to do it"]$tr$::jsonb),
('898c56ea-ab6c-42cf-8781-28ccbb1b1a74', $tr$What is important in online forms?$tr$, $tr$["Data ethics", "Nothing is important", "Only color", "Nothing"]$tr$::jsonb),
('8995e569-3285-4f7a-8318-9bb57b72dcce', $tr$Why are computers important in modern life?$tr$, $tr$["They help with many tasks", "They are useless", "Only for games", "They have no purpose"]$tr$::jsonb),
('8a17b0ad-4bbd-4559-9ad8-0ccdc9e6d929', $tr$You want to start showing the slides. Press:$tr$, $tr$["F5", "Esc", "Ctrl + Z", "Delete"]$tr$::jsonb),
('8aab68bf-e3cf-4e55-a797-22c7ed12e347', $tr$Why do we set up the page before writing?$tr$, $tr$["So the document looks neat", "To make the computer faster", "To lose the file", "No reason"]$tr$::jsonb),
('8b0c8211-6837-449f-945b-c0731800c075', $tr$What is booting?$tr$, $tr$["The process of starting the computer", "The process of turning it off", "A kind of game", "Nothing"]$tr$::jsonb),
('8b80c401-c383-4c6a-937c-bd0c6d845867', $tr$Why is it important to review your own project?$tr$, $tr$["It helps you find what needs to be improved", "It is useless for the project", "It only makes the work harder", "It is only done for a grade"]$tr$::jsonb),
('8b9124d9-bb29-4074-a973-a22e41fc931b', $tr$Google Slides is a:$tr$, $tr$["presentation software", "word processor", "spreadsheet", "game"]$tr$::jsonb),
('8bc3ec51-46ce-459e-aca0-2b92bca2ca24', $tr$Why should you not share your password?$tr$, $tr$["Someone could use it to get into your account", "It is safe to share", "You must share it with friends", "There is no danger"]$tr$::jsonb),
('8c94c155-6582-4243-87ef-e7da09398b69', $tr$What is the last step?$tr$, $tr$["Eat it", "Get some bread", "Add the filling", "Close it"]$tr$::jsonb),
('8cfebd31-cf78-478a-8fcd-83b9c7120b64', $tr$How do you move a textbox to another spot?$tr$, $tr$["Drag its edge", "Type it again on another slide", "Press F5", "Press Delete"]$tr$::jsonb),
('8d82e136-c6b5-4466-aa26-29e312c2ecc8', $tr$Who is responsible for keeping a positive digital footprint?$tr$, $tr$["Each one of us", "Only the computer", "Only the internet provider", "No one"]$tr$::jsonb),
('8d88bf03-8db1-43ab-8bc4-cb6cea9a78fe', $tr$What is a theme?$tr$, $tr$["A ready-made design with a background, colors, and fonts", "Just one slide", "The number of slides", "A keyboard shortcut"]$tr$::jsonb),
('8de799e5-7b32-4783-9551-e250e4c5b8b1', $tr$The face in your picture looks stretched. What went wrong?$tr$, $tr$["A side handle was used, not a corner one", "The font is too small", "The theme is wrong", "There is no transition"]$tr$::jsonb),
('8e040546-0c62-4db3-b1d9-36bee5ad2776', $tr$Why is it important to show the whole process of each project, not just the result?$tr$, $tr$["It shows growth and knowledge in making it", "The process is never important", "Only the result matters", "It does not help the presentation"]$tr$::jsonb),
('8e1b067c-6e00-4ba2-bc92-08af5e269986', $tr$The picture has an extra part you don't want. Use:$tr$, $tr$["Crop", "Shape Fill", "New Slide", "Esc"]$tr$::jsonb),
('8e993f77-e47a-4cee-9bb4-c51092094ee3', $tr$In which tab will you look for Margins?$tr$, $tr$["Layout", "Insert", "Home", "Design"]$tr$::jsonb),
('8f54b04a-d934-4310-8f7d-9ff2851d554b', $tr$Put the date on the right side of the letter. Use:$tr$, $tr$["Align Right", "Center", "Align Left", "Italic"]$tr$::jsonb),
('8fb36ec4-b702-4241-adb8-24d4af2a790d', $tr$Which is an example of a change you can make after reviewing?$tr$, $tr$["Changing the font or adding a picture", "Deleting the whole project", "Closing the program without saving", "Only writing a new name"]$tr$::jsonb),
('9023db1b-4080-40d7-abab-10bdf392f878', $tr$What is a textbox?$tr$, $tr$["A box you can write in anywhere on the slide", "A kind of theme", "A picture", "A transition"]$tr$::jsonb),
('90a0a086-7bfa-4219-af31-091395a051a9', $tr$What is a tri-fold reading material?$tr$, $tr$["Brochure", "Flyer", "Poster", "Letter"]$tr$::jsonb),
('90af9108-37a8-436f-bbd1-0839209cc001', $tr$You want to show step 1 leading to step 2. Which shape?$tr$, $tr$["Arrow", "Heart", "Circle", "Star"]$tr$::jsonb),
('91c3ac64-b5c5-4a01-9d27-9bb11f133cd3', $tr$What does netiquette mean?$tr$, $tr$["Printing files", "Good manners or proper behavior on the internet", "Making a table"]$tr$::jsonb),
('91ce5ee1-3c8c-4676-8b65-7719abdca51e', $tr$What is the main lesson about the digital footprint?$tr$, $tr$["Think before you post and keep a positive presence online", "Just post anything", "What you leave online doesn't matter", "There is no danger on the Internet"]$tr$::jsonb),
('92918551-22fb-4466-8f6d-d57375906fbc', $tr$Why should you log out after using an account?$tr$, $tr$["So others can't get into your account", "No need to do it", "It has no effect", "It only slows things down"]$tr$::jsonb),
('92ba7806-c9f7-4f6e-a3d1-68928b82f669', $tr$What is important in web conferencing?$tr$, $tr$["Safety and responsibility", "Only speed", "Nothing", "Only color"]$tr$::jsonb),
('92f790b9-215a-445b-9ddd-e10f928f8577', $tr$Which one is easy to read?$tr$, $tr$["Black letters on white paper", "Yellow letters on white paper", "White letters on white paper", "Gray on gray"]$tr$::jsonb),
('9371d056-dffc-4bad-89cf-6d07fadf793e', $tr$Can you type inside a shape?$tr$, $tr$["Yes", "Never", "Only in a picture", "Only in a theme"]$tr$::jsonb),
('943c1e26-0e49-4f70-85bb-0e885bc6bb38', $tr$Which of these should you NOT do in a good presentation?$tr$, $tr$["Put a lot of text on every slide", "Use fitting pictures", "Keep the message clear", "Use few transitions"]$tr$::jsonb),
('949c1b55-fc6b-435e-aba0-62d7738ecd2c', $tr$Why should the font in a brochure be clear?$tr$, $tr$["So the information is easy to read", "Only so it looks nicer", "So the work is finished quickly", "There is no reason"]$tr$::jsonb),
('9501518a-2ba6-48b2-aa88-1386806b523f', $tr$You are writing an essay for your teacher. Which orientation?$tr$, $tr$["Portrait", "Landscape", "Sideways", "Banner"]$tr$::jsonb),
('951dbf70-7cbc-4adc-9148-c2a1c51866f2', $tr$Why are good posture and time limits important?$tr$, $tr$["They protect your eyes and body", "No reason", "So you can play longer", "They are useless"]$tr$::jsonb),
('9532daf7-9d67-4b3f-88c8-a33bca8098d2', $tr$What is layout?$tr$, $tr$["How the elements are arranged on the page", "Only the color of the document", "Only the number of pages", "Only the kind of font"]$tr$::jsonb),
('963984cf-7b9e-4383-8345-1cf7d327c46d', $tr$How do you upload a file to the cloud?$tr$, $tr$["Drag or select the file", "Just write the name", "There is no way", "Print it"]$tr$::jsonb),
('9650570b-14b8-4c9d-8170-c575f5d3692d', $tr$What is an example of using what you learned in real life?$tr$, $tr$["Uploading a project to the right folder", "Nothing", "Only playing", "Only watching"]$tr$::jsonb),
('9655fc02-d355-416d-9e07-983cc92e860d', $tr$Which one is small, always carried around, and can call and text?$tr$, $tr$["Smartphone", "Desktop", "Printer", "Monitor"]$tr$::jsonb),
('9696a9c9-4b38-4b0c-9505-6aee07bb6217', $tr$Why not share your password?$tr$, $tr$["Someone could use it to get into your account", "Safe to share", "Required to share", "No danger"]$tr$::jsonb),
('977a1e0c-a0c6-40cc-a87c-30e69d1f7ea4', $tr$Why is it good to use a template?$tr$, $tr$["It saves time and gives a neat layout", "It only makes the work harder", "It is useless", "It makes the project harder"]$tr$::jsonb),
('9824da6d-5e70-4593-b8de-8ecce72f94a5', $tr$Which is an example of an animation effect?$tr$, $tr$["Fade In", "Push", "Wipe", "Common Time"]$tr$::jsonb),
('985fa38e-798e-41f8-ac72-48afa2b5c52d', $tr$What searches and checks the web pages for a search engine?$tr$, $tr$["Keyboard", "Crawler", "Monitor"]$tr$::jsonb),
('987d2e0c-e6b7-4f26-88ec-fb4d6c90f9d0', $tr$What is Text Outline?$tr$, $tr$["The edge of the letters", "The background color", "The number of slides", "A kind of layout"]$tr$::jsonb),
('98e0663a-661d-44bb-8fc5-8a35149eac36', $tr$Why do we learn spreadsheets in ICT?$tr$, $tr$["To learn how to organize data", "No purpose", "Only for adults", "Not related to ICT"]$tr$::jsonb),
('98e62033-9778-4abd-9dec-21ba4b3ee44f', $tr$What should you include in a flyer for a school event?$tr$, $tr$["Headline, date, location, and a picture", "Only a random picture", "No text, only a picture", "Only a blank page"]$tr$::jsonb),
('9913bdcd-fa77-4e24-840d-43bc00cb33b5', $tr$What should you say about the purpose of each project?$tr$, $tr$["Why it was made that way", "Only the price of the computer", "Only the start time", "Nothing, it does not need to be explained"]$tr$::jsonb),
('9a2a627a-30b5-421a-b699-6b0bec49c789', $tr$What is a keyword when searching online?$tr$, $tr$["An important word used to search for information", "A kind of password", "A kind of virus", "A kind of file"]$tr$::jsonb),
('9a36c9b0-5ae6-499c-9b68-9ee1b54342b7', $tr$Which is an example of a peripheral device?$tr$, $tr$["Printer", "Only the CPU", "Only the monitor", "There is no example"]$tr$::jsonb),
('9b7cf5e3-c16f-4d45-a1d3-d507fa5e9c6b', $tr$Why is organizing files important?$tr$, $tr$["It helps you work productively", "No reason", "Only for a grade", "It is useless"]$tr$::jsonb),
('9b912a8f-acaa-428d-baf3-315c6ed1d004', $tr$Why should you not eat near the computer?$tr$, $tr$["So the equipment doesn't get damaged", "So you get full", "No reason", "So it tastes good"]$tr$::jsonb),
('9b99e619-2240-4aa5-8ef5-b022778cd02f', $tr$What do you need to do before presenting a portfolio?$tr$, $tr$["Check it and prepare your explanation", "Show it right away without preparing", "Delete it before presenting", "Nothing, no need to prepare"]$tr$::jsonb),
('9bc8387f-72a1-4b68-b600-f2105c9b7127', $tr$You want to write a letter on the computer. Which program?$tr$, $tr$["Word processor", "Calculator", "Music player", "Only a web browser"]$tr$::jsonb),
('9bd4c953-e736-4080-b8f3-3e2783a828da', $tr$What is the headline on a flyer?$tr$, $tr$["Big text at the top", "Small text at the bottom", "Only a picture", "Only a contact number"]$tr$::jsonb),
('9c39667e-6efd-46cb-9217-b2584ca75919', $tr$Why is it important to learn to make simple algorithms in Grade 4?$tr$, $tr$["It teaches logical and organized thinking", "It has no use in real life", "It is only for adults", "No need to learn it"]$tr$::jsonb),
('9c46270a-ec3b-4630-92a6-c0b105e1ddfb', $tr$Which paper is longer?$tr$, $tr$["Legal", "A4", "Letter", "Card"]$tr$::jsonb),
('9cd2e40c-c5dd-44b5-b094-c5c7942c8c89', $tr$What is the usual paper size in school?$tr$, $tr$["A4", "Only Legal", "Poster", "Card"]$tr$::jsonb),
('9cd9860f-1610-479c-a940-280c293dfbf0', $tr$What does reviewing and improving a project show?$tr$, $tr$["Professionalism and effort in your work", "Carelessness in your work", "No interest in the project", "Only a lack of time"]$tr$::jsonb),
('9ce94b23-93ae-46fa-89e4-b53611b2fd4d', $tr$What is word processing used for?$tr$, $tr$["Typing and formatting documents", "Organizing in cells", "Making slides", "Only drawing"]$tr$::jsonb),
('9dabf769-92e4-4afd-83d4-4d788557c704', $tr$What happens if you posted something negative before?$tr$, $tr$["It can still be seen even if deleted", "It disappears right away", "No effect now", "It was never saved anywhere"]$tr$::jsonb),
('9e04b785-a608-4df2-8320-271a534650e4', $tr$What is the blinking line where the letters will appear?$tr$, $tr$["Cursor", "Ribbon", "Tab", "Margin"]$tr$::jsonb),
('9ee5ef7a-27bc-4685-aa99-ffe27cd8bc1b', $tr$What is an example of using a spreadsheet?$tr$, $tr$["Recording grades", "Only drawing", "Watching videos", "Playing games"]$tr$::jsonb),
('9fa3d50c-3fe4-4cb6-84a7-889a2de4dbc9', $tr$What do you call a horizontal line of cells in a spreadsheet?$tr$, $tr$["Row", "Column", "Only a cell", "Only a sheet"]$tr$::jsonb),
('a15fb7d8-2a6d-4f41-9f09-f426f2f2bd1e', $tr$At what level should the screen be?$tr$, $tr$["Eye level", "Low, near the floor", "Very far away", "None of these"]$tr$::jsonb),
('a184e93a-be43-48f7-b667-c116519a9410', $tr$What helps you type faster?$tr$, $tr$["Using the correct fingers", "Using only one finger", "Not looking at the keyboard without practicing", "Nothing helps"]$tr$::jsonb),
('a18ab62d-4ada-4eb3-80da-9ab1f575f3b9', $tr$Where do you usually type the URL in a browser?$tr$, $tr$["Address Bar", "Status Bar", "Scroll Bar"]$tr$::jsonb),
('a1c0b0de-2bc1-4ec1-a42f-5bbd20fff32c', $tr$What should you do before changing the font of a word?$tr$, $tr$["Select the text first", "Close the file", "Press Enter", "Delete the word"]$tr$::jsonb),
('a22b3771-8cdf-4668-bf48-e7e29bcaa5f9', $tr$Where do you choose a slide transition effect?$tr$, $tr$["Transitions tab", "Animations tab", "Only the Insert tab", "File tab"]$tr$::jsonb),
('a2b15d5f-b006-4995-aaba-1cce380bf4e5', $tr$What is presentation software used for?$tr$, $tr$["Making slides", "Typing documents", "Organizing in cells", "Only drawing"]$tr$::jsonb),
('a2c4741d-ed5d-4d37-abaa-818a2ca02f7d', $tr$You want the flyer's title to stand out. Use:$tr$, $tr$["WordArt", "Margins", "Undo", "Esc"]$tr$::jsonb),
('a2dea067-9034-46a7-b0f8-94b976c3d718', $tr$Why do we put pictures on a slide?$tr$, $tr$["The idea is easier to understand", "To make the report longer", "To make the text disappear", "To make it messy"]$tr$::jsonb),
('a35f8017-54f3-4335-a6c4-65c7f6fb5b9a', $tr$What is the last step in the sample algorithm?$tr$, $tr$["Eat it", "Get some bread", "Add the filling", "Close the sandwich"]$tr$::jsonb),
('a462841c-97d3-44c6-9631-b47c296cf2ec', $tr$What is the right way to turn off a computer?$tr$, $tr$["Shutting down", "Unplugging it right away", "Dropping it on the floor", "There is no right way"]$tr$::jsonb),
('a4b2bbeb-e88a-43d5-9598-17f44ff361e8', $tr$What is one part of a good presentation?$tr$, $tr$["Clear text", "Too much text on one slide", "No pictures", "No organization"]$tr$::jsonb),
('a541cdd8-37c7-4674-b820-857c9ccbc894', $tr$What is a double-click?$tr$, $tr$["Clicking twice quickly", "Clicking once", "Dragging the mouse", "Scrolling"]$tr$::jsonb),
('a5955ee0-bcb4-448d-9e85-0630c9343490', $tr$Where do you type the URL in a web browser?$tr$, $tr$["Status Bar", "Address Bar", "Scroll Bar"]$tr$::jsonb),
('a5d64ebb-6826-452f-a4af-6b85269e11d8', $tr$You want to add a shadow to the title. Use:$tr$, $tr$["Text Effects", "Text Fill", "New Slide", "Margins"]$tr$::jsonb),
('a73b52f1-b44d-4359-9318-31430a1706e5', $tr$What should you do after getting feedback on a project?$tr$, $tr$["Make changes based on the feedback", "Just forget the feedback you got", "Close the project right away", "Submit it right away even without changes"]$tr$::jsonb),
('a742785d-596e-4fbb-9d1e-234285864445', $tr$Why teach block coding?$tr$, $tr$["To introduce logical thinking", "No purpose", "Just to entertain kids", "Not related to ICT"]$tr$::jsonb),
('a7e2bd84-ad3d-4fb0-9df5-e98390a47677', $tr$Which is an example of a desktop publishing program?$tr$, $tr$["Microsoft Publisher", "Calculator", "Notepad", "File Explorer"]$tr$::jsonb),
('a84c53e3-c664-4c9b-91ba-6cdd2fec234d', $tr$What is a double-click?$tr$, $tr$["Clicking twice quickly", "Clicking once", "Dragging the mouse", "Scrolling"]$tr$::jsonb),
('a87ed5f7-281c-4dc2-b1ea-6c84df9a3a00', $tr$Where do you choose an animation effect?$tr$, $tr$["Animations tab", "Transitions tab", "Only the Insert tab", "File tab"]$tr$::jsonb),
('a8b3c532-ec70-4feb-bf81-5bf4389414e9', $tr$How should you sit while using a computer?$tr$, $tr$["Up straight", "Bent over", "Lying down", "Far from the chair"]$tr$::jsonb),
('aa0f529d-3e30-44af-a5b9-7311f026c871', $tr$What can you do with data organized in a spreadsheet?$tr$, $tr$["Make a table or line graph", "Nothing at all", "Just forget it", "Hide it forever"]$tr$::jsonb),
('aa1a58ed-15ec-4975-8037-fcb5ed35c9e0', $tr$What should you do before believing information you found online?$tr$, $tr$["Post it right away", "Verify it first", "Don't read it"]$tr$::jsonb),
('aa1ecf1c-64a9-4017-a963-3f03c2bde09f', $tr$What is one part of a good presentation?$tr$, $tr$["Clear text", "Too much text on a slide", "No pictures", "No organization"]$tr$::jsonb),
('ac7e5035-baad-4354-bb92-85ec2904867f', $tr$What should you do if you see doubtful information?$tr$, $tr$["Check it first before sharing", "Share it with everyone right away", "Believe it right away", "Ignore the warning"]$tr$::jsonb),
('acaeff36-5b74-4aef-91ae-e502a58fd6ef', $tr$Your classmate said that a picture in your brochure is blurry. What is the right thing to do?$tr$, $tr$["Replace the picture with a clearer version", "Just ignore the feedback", "Remove the whole brochure", "Get angry at the classmate who gave the feedback"]$tr$::jsonb),
('accd7a50-cc77-4f0b-86c5-09a1a365241c', $tr$What is a template?$tr$, $tr$["A ready-made design that you can change", "Only a kind of picture", "Only a kind of font", "Only a kind of color"]$tr$::jsonb),
('acdf9725-fbe3-4e5c-bb41-6b04aa1fdfce', $tr$Why do we study the word processor?$tr$, $tr$["To make neat documents", "Just to play", "To ruin files", "No reason"]$tr$::jsonb),
('acfc43b7-1115-4b88-8bd3-c7edef4e3dcb', $tr$What should you do if you see doubtful information online?$tr$, $tr$["Check it first before sharing or believing it", "Share it with everyone right away", "Believe it right away", "Ignore all warnings"]$tr$::jsonb),
('adb11298-e1d5-4876-93f3-aa115a061f46', $tr$Which keys are the home row?$tr$, $tr$["ASDF, JKL;", "QWER, UIOP", "ZXCV, NM,.", "1234, 5678"]$tr$::jsonb),
('adcd4ba0-b89d-4d17-a5e0-b903a767b3fa', $tr$What should you do every day?$tr$, $tr$["Practice with the mouse and keyboard", "Stay away from the computer", "Nothing", "Only watch others use it"]$tr$::jsonb),
('add753b1-375e-45f6-b3c5-febc03f05d7b', $tr$Which software would you use to present in front of the class?$tr$, $tr$["Presentation", "Only spreadsheet", "Only word processing", "Only desktop publishing"]$tr$::jsonb),
('ae113d38-6e4d-4712-a9f0-aa29e64b797f', $tr$Which part of the screen shows the list of pages?$tr$, $tr$["Pages pane", "Title bar", "Cursor", "Scroll bar"]$tr$::jsonb),
('ae1b2768-6946-488b-a70d-5f147db1c45f', $tr$What is important when using online tools?$tr$, $tr$["Safety and responsibility", "Only speed", "No use", "Nothing"]$tr$::jsonb),
('ae74967f-e343-464b-94e6-020ad8f959a7', $tr$Read two email replies to a teacher's request for permission slip forms: Reply A: "Good afternoon Ma'am, attached is my permission slip. Thank you!" Reply B: "here". Why is Reply A better email etiquette?$tr$, $tr$["It uses a polite greeting, clear message, and courteous closing appropriate for a teacher", "It is shorter, so it saves time", "It uses more exclamation points", "Reply B is actually better because it is faster"]$tr$::jsonb),
('ae84fcbb-5490-4fa0-a287-99f269b528e1', $tr$Which shortcut makes text italic?$tr$, $tr$["Ctrl + I", "Ctrl + B", "Ctrl + Z", "Ctrl + P"]$tr$::jsonb),
('ae913395-7f4b-4a30-b2ad-aa744ac9c60f', $tr$A student was asked why they changed the layout of their brochure. What should they answer?$tr$, $tr$["The reason, based on the feedback they got", "There is no need to answer the question", "Say they don't know the reason", "Just put off answering"]$tr$::jsonb),
('ae9dab1f-2c5b-499e-b8e9-eb6196bd2b7d', $tr$Why do we need to be careful about what we share online?$tr$, $tr$["It can stay forever even if deleted", "It has no effect", "All posts disappear right away", "It is not a real issue"]$tr$::jsonb),
('aed9e95b-3d94-4210-8a4a-d281105cf5a0', $tr$Why is it important for a project's layout to be clear?$tr$, $tr$["So it is easy to read and understand", "So it is hard to read", "It has nothing to do with reading", "Just to make the file bigger"]$tr$::jsonb),
('aefac4db-5dcb-4690-bb54-c012bb328721', $tr$What will we study next term?$tr$, $tr$["Word processing and presentation software", "No more topics", "Just something else", "Nothing"]$tr$::jsonb),
('af93bbde-2b18-4038-8c71-7aacaa4e82af', $tr$What should you avoid when collecting data?$tr$, $tr$["Information you don't need", "All information", "Nothing to avoid", "Only names"]$tr$::jsonb),
('b0ba6369-bf63-4fbf-9773-e61664a036b5', $tr$Why is it important to review your own project?$tr$, $tr$["It helps you find what needs to be improved", "It is useless for the project", "It only makes the work harder", "It is only done for a grade"]$tr$::jsonb),
('b0fd2839-35b4-420c-bbdb-d5d249e7d542', $tr$What should you say about the purpose of each project?$tr$, $tr$["Why it was made that way", "Only the price of the computer", "Only the start time", "Nothing, it does not need to be explained"]$tr$::jsonb),
('b12d2761-da00-46a3-9ef2-fa368a4105b3', $tr$You want both sides of the paragraph to be even. Use:$tr$, $tr$["Justify", "Center", "Bold", "Underline"]$tr$::jsonb),
('b1c32816-716e-4301-9820-639731eabf8d', $tr$Which kind of computing device can you carry anywhere?$tr$, $tr$["Smartphone", "Only the desktop", "Printer", "Monitor"]$tr$::jsonb),
('b221f104-4e0d-46a7-a366-2635bf668760', $tr$What is peer feedback?$tr$, $tr$["Comments from a classmate or teacher about your work", "A kind of computer file", "Only a kind of picture", "Only a part of a brochure"]$tr$::jsonb),
('b22d9b6c-0d16-4516-b3cc-4d77ad779bad', $tr$Where do you add audio or video?$tr$, $tr$["Insert tab", "Animations tab", "Transitions tab", "Only the Design tab"]$tr$::jsonb),
('b31e07d9-92fd-4521-bcba-18f661a9188d', $tr$What is the first step in making a poster with a template?$tr$, $tr$["Choose a poster template", "Print right away", "Delete everything", "Close the program"]$tr$::jsonb),
('b343b421-d446-401b-a999-873ec14ed3ff', $tr$Why is it important to organize files well?$tr$, $tr$["It makes the work easier", "No reason", "Only for a grade", "It is useless"]$tr$::jsonb),
('b36741fd-4f38-4561-b3c3-6b2ce9e9532f', $tr$Why are the online tools we learned important?$tr$, $tr$["They help with learning and communication", "They have no use", "Only for a grade", "They are useless"]$tr$::jsonb),
('b3685ee3-f35b-4ab4-a8f9-3aea98912e0f', $tr$What will we do with our portfolio this week?$tr$, $tr$["Show it to the class", "Delete it", "Forget it", "Just close the program"]$tr$::jsonb),
('b37bbfcd-4236-4024-bd51-f44623bf6cbb', $tr$Which kind of computing device can you carry anywhere?$tr$, $tr$["Smartphone", "Only the desktop", "Printer", "Monitor"]$tr$::jsonb),
('b3ef6eec-38d0-4e47-9dfc-b596a096b776', $tr$What should you ask when checking information online?$tr$, $tr$["Who made it, when it was published, and is there proof", "Only the website's color", "The font size", "Nothing, just believe it right away"]$tr$::jsonb),
('b45445f1-b464-41c4-bfe7-014f749c7bbd', $tr$What kinds of questions can you add to a form?$tr$, $tr$["Multiple choice, short answer, checkbox", "Only one kind", "None", "Only pictures"]$tr$::jsonb),
('b473f2d4-01a8-447d-8954-f60a5b11d7e7', $tr$What should you do if there is something you don't understand?$tr$, $tr$["Ask the teacher for help", "Just don't do it", "Cry", "Run outside"]$tr$::jsonb),
('b4f1a4a1-fd37-4706-bedd-1c415f54bfc0', $tr$What should you include in a flyer for a school event?$tr$, $tr$["Headline, date, location, and a picture", "Only a random picture", "No text, only a picture", "Only a blank page"]$tr$::jsonb),
('b54c3dae-acb6-44cd-8f86-916c5cab10e5', $tr$How should you organize folders?$tr$, $tr$["By topic or date", "Just randomly", "With no order", "Only by color"]$tr$::jsonb),
('b56b0a8f-578c-49db-bfb5-56ec9f54349f', $tr$What is important when using online tools?$tr$, $tr$["Safety and responsibility", "Only speed", "No use", "Nothing"]$tr$::jsonb),
('b5a45983-d82d-4ae8-83bf-ac1fc6120f8f', $tr$What is an example of personal information?$tr$, $tr$["Address", "Favorite color", "Favorite game", "Favorite food"]$tr$::jsonb),
('b5f904a3-ba3a-4487-960f-75676170fd61', $tr$A student was asked why they changed the layout of their brochure. What should they answer?$tr$, $tr$["The reason, based on the feedback they got", "There is no need to answer the question", "Say they don't know the reason", "Just put off answering"]$tr$::jsonb),
('b6d9eff4-6593-401d-a76c-a9fb90fdc1a1', $tr$Why is proper computer practice important?$tr$, $tr$["It helps you be a responsible and safe user", "No reason", "Only for grades", "It has no purpose"]$tr$::jsonb),
('b71872c0-2391-4b80-80db-17f76431f29f', $tr$What is a slide transition?$tr$, $tr$["An effect when moving from one slide to the next", "Movement of text inside a slide", "An embedded sound", "The background color"]$tr$::jsonb),
('b74f8362-0ff4-4dcd-bfab-d61f0781a59a', $tr$Why is it important to follow the right order in an algorithm?$tr$, $tr$["So the problem is solved or the task is done successfully", "The order doesn't matter", "Any order is correct", "The order has no effect"]$tr$::jsonb),
('b7931c7c-ca06-4c11-9867-667f5449bee7', $tr$Why do we use a flowchart?$tr$, $tr$["It is a picture of the process", "It is useless", "Only for pictures", "Not used in ICT"]$tr$::jsonb),
('b7e38f89-3bd2-4665-82d2-aea77a4eebb3', $tr$You will report to the class using slides. Which program?$tr$, $tr$["Presentation software", "Only a word processor", "Calculator", "Music player"]$tr$::jsonb),
('b84b8155-2d9f-4f51-a408-088b4176afef', $tr$You used ten colors and five fonts. What is the advice?$tr$, $tr$["Keep it simple so it's easy to read", "Add even more colors", "Make the letters smaller", "Delete the title"]$tr$::jsonb),
('b87eb3fc-8d7c-48b1-b99d-c7ae632e52c7', $tr$Why is it important to learn spreadsheets in Grade 4?$tr$, $tr$["It is a basic skill for organizing information", "No need to learn it", "It is only for adults", "It has no use in school"]$tr$::jsonb),
('b8a8efac-eed8-4212-9f21-bcdc9c31fa20', $tr$Which layout has no boxes?$tr$, $tr$["Blank", "Title Slide", "Title and Content", "Two Content"]$tr$::jsonb),
('b8ace126-cbfc-4888-98f1-91b938df2451', $tr$In which tab can you find Bold and Center?$tr$, $tr$["Home", "Layout", "Insert", "Review"]$tr$::jsonb),
('b9c68552-f171-4f08-8d61-7490d2a88caa', $tr$Which command is for a fancy title?$tr$, $tr$["WordArt", "Margins", "Save", "Esc"]$tr$::jsonb),
('b9d50fe2-b402-4f99-9f90-266180e0ebde', $tr$What will we study next term?$tr$, $tr$["Productivity software", "No more topics", "Just something else", "Nothing"]$tr$::jsonb),
('bb16d50a-e111-4d92-9efb-bbabbece3865', $tr$In which tab do you change the font size of a textbox?$tr$, $tr$["Home", "Design", "Transitions", "View"]$tr$::jsonb),
('bb504c66-6a55-4442-83b8-4408dd4d5568', $tr$What is a search engine?$tr$, $tr$["It helps you find information on the Internet using keywords", "A kind of game", "A kind of computer", "A kind of printer"]$tr$::jsonb),
('bbddb993-29c9-4e6b-9315-9163175cd685', $tr$Which shortcut takes back a mistake?$tr$, $tr$["Ctrl + Z", "Ctrl + S", "Ctrl + C", "Ctrl + A"]$tr$::jsonb),
('bc2d62ed-693c-472c-a8eb-04ee3ec12fc8', $tr$You want to put words inside a star. How?$tr$, $tr$["Click the shape and type", "It's not possible", "Make a new slide", "Press F5"]$tr$::jsonb),
('bc5efb56-3c65-498c-a6b5-f60a358efaf3', $tr$Why teach kids about the digital footprint?$tr$, $tr$["To be responsible for their online presence", "No purpose", "To get them to post without thinking", "Not part of ICT"]$tr$::jsonb),
('bcaebc2c-213b-420f-ac92-aeb0f0e63d34', $tr$What should you NOT share online?$tr$, $tr$["Personal information", "A picture of your favorite animal", "Your favorite color", "The name of a country"]$tr$::jsonb),
('bd6d54d7-c97d-49c9-bd2b-bf0e69b466a2', $tr$How are spreadsheets related to Math?$tr$, $tr$["The data can be used to make graphs, like we learned in Math", "The two have no connection", "Math does not use data", "Spreadsheets have nothing to do with graphs"]$tr$::jsonb),
('bd8c2276-7e93-4dfd-bcb1-8b065eee2623', $tr$What is a presentation?$tr$, $tr$["Slides that show ideas", "A kind of letter", "A computer game", "A song"]$tr$::jsonb),
('bd96e067-d6ff-4c9c-906a-2971954655e8', $tr$What is an example of a form you can make?$tr$, $tr$["A form about favorite hobbies", "No example", "Only a picture", "Only a video"]$tr$::jsonb),
('bdb0a9f9-b00b-49df-87df-2877631d1adc', $tr$Why is proof important for information?$tr$, $tr$["It shows that what is said is true", "It doesn't matter", "It's not needed", "It's always right even without proof"]$tr$::jsonb),
('bf8a7201-4659-4e52-b637-ef16650d3f0b', $tr$What is included in multimedia in a presentation?$tr$, $tr$["Photos, sounds, or videos", "Only text", "Nothing", "Only numbers"]$tr$::jsonb),
('bfcc8800-e45d-4102-96d7-f6e6a1053671', $tr$A shape is covering the title. What will you do to the shape?$tr$, $tr$["Send Backward", "Bring Forward", "Make it even bigger", "Copy it"]$tr$::jsonb),
('c02659d8-8ea8-4233-a0a2-b5299f8055a0', $tr$How far should the screen be from your eyes?$tr$, $tr$["About an arm's length away", "Very close", "Very far", "There is no right distance"]$tr$::jsonb),
('c04b7cd5-2077-4bf5-930c-1daf5b9039fe', $tr$Why are computer room rules important?$tr$, $tr$["They protect the equipment and keep everyone safe", "So we can play more", "They have no use", "So we don't use anything"]$tr$::jsonb),
('c16140e6-1517-4dc4-b433-f1fc5629672d', $tr$What is digital citizenship?$tr$, $tr$["Using technology responsibly and safely", "Using a computer carelessly", "Sharing all information online", "Having no rules on the Internet"]$tr$::jsonb),
('c1e4a740-4de5-422c-8032-d0deddded5b9', $tr$What does the title bar show?$tr$, $tr$["The file name", "The number of words", "The page color", "Pictures"]$tr$::jsonb),
('c2dd6b3c-f880-48f9-8e04-b6e10f9796a3', $tr$Which alignment fits a title?$tr$, $tr$["Center", "Align Left", "Align Right", "Justify"]$tr$::jsonb),
('c347438f-05e1-4d6f-9090-524962e6f45f', $tr$What skill can you mention about the presentation?$tr$, $tr$["Animation and slide transitions", "Only cooking", "Only farming", "Only sewing"]$tr$::jsonb),
('c3653e92-af70-47b2-aea1-0823cf2e9241', $tr$Why learn to make algorithms in Grade 4?$tr$, $tr$["It teaches logical thinking", "No use in real life", "Only for adults", "No need to learn it"]$tr$::jsonb),
('c38518fd-84de-4724-89e4-cc4cfd2d5b8a', $tr$What should you do with a suspicious message?$tr$, $tr$["Tell a parent or teacher", "Reply right away", "Share it with everyone", "Ignore it"]$tr$::jsonb),
('c39f447c-93b7-4bd2-b93e-44f2b6c346fe', $tr$What do you call a vertical line of cells in a spreadsheet?$tr$, $tr$["Column", "Row", "Only a cell", "Only a sheet"]$tr$::jsonb),
('c3ce3532-8691-4021-a1d5-dae485d05a22', $tr$You found a nice picture online, but it is not free. What is right?$tr$, $tr$["Look for a free picture", "Use it without asking", "Erase the owner's name", "Copy it and keep it"]$tr$::jsonb),
('c41de1e5-a024-4cb0-8252-1ff019bfad57', $tr$Which is an example of an animation effect?$tr$, $tr$["Fade In", "Push", "Wipe", "Common Time"]$tr$::jsonb),
('c4babe76-c564-4f6b-84d5-372342f63c02', $tr$What will you do in the digital project?$tr$, $tr$["Make a document that shows what you learned", "Nothing", "Only watch a video", "Only play games"]$tr$::jsonb),
('c4e9097e-3233-465f-bebf-ddbf9e8b1ae7', $tr$What is used to make a document attractive?$tr$, $tr$["Borders and accents", "Only random numbers", "Only blank space", "Only one color"]$tr$::jsonb),
('c52a4651-8e0f-4463-9f40-a3d9c2eceb68', $tr$What does 'process' mean in an algorithm?$tr$, $tr$["Each step that needs to be done", "Only the final result", "Only the last step", "It has no meaning"]$tr$::jsonb),
('c54b6f74-b387-43e5-8201-422b92667812', $tr$Why is it important to organize data in a spreadsheet?$tr$, $tr$["The information becomes easier to check and understand", "It doesn't matter", "It only gets messier", "It is not used in real life"]$tr$::jsonb),
('c5b3d717-9b9d-48d9-980c-96550deab031', $tr$Where are the commands grouped into tabs?$tr$, $tr$["Ribbon", "Title bar", "Scroll bar", "Cursor"]$tr$::jsonb),
('c6644cb9-9af4-430b-b922-72ae502741e5', $tr$Where do you change the paper size?$tr$, $tr$["Layout, Size", "Insert, Picture", "Home, Bold", "View, Zoom"]$tr$::jsonb),
('c80d2d11-822d-48a6-aa16-9320833f632a', $tr$The textbox is too small and the words don't fit. What will you do?$tr$, $tr$["Drag the handles to make it bigger", "Press Esc", "Change the theme", "Close the file"]$tr$::jsonb),
('c830d0e4-03b9-4539-8803-dbb4c6cb7233', $tr$What do you make with desktop publishing?$tr$, $tr$["Posters and flyers", "A spreadsheet of grades", "Songs", "Videos"]$tr$::jsonb),
('c8f22e6e-579f-433c-9483-52c5ca6aa368', $tr$What should we be when using the Internet?$tr$, $tr$["Responsible", "Careless", "Reckless", "Rude"]$tr$::jsonb),
('c97a42be-728c-4a65-a002-998e07a5534d', $tr$How should you handle a cable?$tr$, $tr$["Avoid bending or pulling it", "Pull it hard", "Crumple it up", "There is no right way"]$tr$::jsonb),
('c9e043d2-6aa0-443a-8bd6-cccd3bb523b0', $tr$What do you call the place where a row and a column meet?$tr$, $tr$["Cell", "Sheet", "Tab", "Formula"]$tr$::jsonb),
('ca8d1c51-9bbb-4a56-9fa2-dd679e8c8bc0', $tr$Why is it important to make different kinds of documents in ICT?$tr$, $tr$["To learn to choose the right tool for each task", "Only to make it hard for students", "It is useless", "It is only done for fun"]$tr$::jsonb),
('caaa7bf9-141b-40e1-bc70-704282f365eb', $tr$What do you use to give other people access?$tr$, $tr$["Share button", "Delete button", "Print button", "No button"]$tr$::jsonb),
('cac8e3f3-6978-44e9-9c66-2bc58052fba4', $tr$Why should you know who wrote an article?$tr$, $tr$["It helps you tell if it can be trusted", "It doesn't matter", "No need to know", "The author is always the same"]$tr$::jsonb),
('cb44b624-bebf-4bbb-a900-26ff3e72eac3', $tr$Why is good posture important?$tr$, $tr$["To avoid body pain", "No effect", "No need to think about it", "Only for adults"]$tr$::jsonb),
('cbd3ff08-4420-499a-a512-b987caa43722', $tr$Why is proof important for information?$tr$, $tr$["It shows that what is said is true", "It doesn't matter", "Proof is not needed", "It's always right even without proof"]$tr$::jsonb),
('cc25714c-dc57-472f-a56a-2555dc6b700b', $tr$Why is it important to use the right keywords when searching?$tr$, $tr$["To make the internet slower", "To get fast and correct results", "To delete files"]$tr$::jsonb),
('cc9f9afc-2a60-4bf8-a426-ad801bf09ea7', $tr$Which text is easiest to read?$tr$, $tr$["A clear font and a dark color", "Lots of effects and colors", "Very tiny letters", "Light yellow on white"]$tr$::jsonb),
('ce38d90b-821e-4984-87d8-07086cef20e2', $tr$How should you handle computer equipment?$tr$, $tr$["Carefully", "Roughly", "With wet hands", "Quickly"]$tr$::jsonb),
('ce4c107d-9c24-4093-8cb9-fadc561b4ac9', $tr$What does presenting your finished portfolio show?$tr$, $tr$["All the ICT skills we learned this term", "Carelessness in the work", "No interest in ICT", "Only a lack of time"]$tr$::jsonb),
('ce55a5aa-0810-4c19-858f-400840ba3e00', $tr$What should you do if you don't understand something?$tr$, $tr$["Ask your teacher for help", "Just don't do it", "Cry", "Run outside"]$tr$::jsonb),
('ce573e31-f3b9-4ae7-808e-dba23461af48', $tr$Where do you write where the picture came from?$tr$, $tr$["Under the picture or on the last slide", "No need to", "In a different file", "In the teacher's name"]$tr$::jsonb),
('ce73ac7d-482c-48fd-8d7c-22268e8b85bb', $tr$What should you check from time to time?$tr$, $tr$["The list of people who have access", "Nothing", "The color of the file", "The price of the file"]$tr$::jsonb),
('ce9cd525-58a0-442a-a738-67a20988317b', $tr$In which tab do you set the page size and margin?$tr$, $tr$["Layout", "Insert", "Home", "View"]$tr$::jsonb),
('cff177a4-ce29-4005-bf8b-47581f20e586', $tr$You want the title to be colorful and stand out. Use:$tr$, $tr$["WordArt", "Margin", "Slide pane", "Esc"]$tr$::jsonb),
('d090caf6-5e61-4d81-b2c7-0a4729c9e39a', $tr$What should you do if there is something you don't understand?$tr$, $tr$["Ask the teacher for help", "Just don't do it", "Cry", "Run outside"]$tr$::jsonb),
('d1449feb-0295-4398-ba95-f28569228b48', $tr$What is important when using the mouse?$tr$, $tr$["Accuracy", "Only speed", "Noise", "Color"]$tr$::jsonb),
('d162529a-5d40-4422-a7cb-4362b4e89e57', $tr$Who benefits when a project is uploaded properly?$tr$, $tr$["You and your teacher", "No one benefits", "Only strangers", "Nobody"]$tr$::jsonb),
('d17ee78a-66cf-4ccc-93fe-4a11b8c16919', $tr$Which keys are the home row?$tr$, $tr$["ASDF, JKL;", "QWER, UIOP", "ZXCV, NM,.", "1234, 5678"]$tr$::jsonb),
('d1ca5300-0aaf-4970-8a77-21f539093c18', $tr$What did we learn about cloud storage?$tr$, $tr$["Storing and sharing files", "Nothing", "Only one thing", "We learned nothing"]$tr$::jsonb),
('d1d10f7d-86ca-4306-9a52-1f63ca009acf', $tr$How do we choose the right device?$tr$, $tr$["It depends on the task", "Just randomly", "Only by color", "Only by price"]$tr$::jsonb),
('d1e64e81-ebef-4be4-92c0-23c044afe776', $tr$Why is data ethics important?$tr$, $tr$["It protects people's privacy", "No reason", "Only for a grade", "It is useless"]$tr$::jsonb),
('d22aae8d-a2af-44e2-bcd5-40cf064e4d0f', $tr$What is a digital footprint?$tr$, $tr$["The trail left on the Internet", "A kind of game", "Just a kind of photo", "A kind of computer"]$tr$::jsonb),
('d26d685b-616e-4ec9-9a77-361e59a8090c', $tr$Where can you find Orientation?$tr$, $tr$["Layout tab", "Insert tab", "Home tab", "Review tab"]$tr$::jsonb),
('d29b7fea-3db3-4333-ae6d-eee2fc7237e3', $tr$What makes a password strong?$tr$, $tr$["A mix of letters, numbers, symbols", "Only a name", "Only numbers", "One word"]$tr$::jsonb),
('d2e2d3c7-7f40-4a07-9826-5b58f4ffc894', $tr$Why should you think before posting anything online?$tr$, $tr$["A post can affect your reputation in the future", "Posting has no consequences", "Once it's said, it's done", "Thinking is not important"]$tr$::jsonb),
('d379c38d-fcb1-469c-8f49-db88b9cb6026', $tr$Which orientation fits a certificate?$tr$, $tr$["Landscape", "Portrait", "Upright", "Tall"]$tr$::jsonb),
('d3837b3d-7938-4fce-9c09-4e50e357c292', $tr$Where will the next letter you type appear?$tr$, $tr$["Where the cursor is", "In the title bar", "In the ribbon", "In the scroll bar"]$tr$::jsonb),
('d3dd9934-49b9-4b2c-ab5a-5f0ec625fa71', $tr$What makes a password strong?$tr$, $tr$["A mix of letters, numbers, and symbols", "Only a name", "Only numbers", "Only one word"]$tr$::jsonb),
('d3f89c22-9ca9-4fc3-8644-4c607384cf5e', $tr$What is word processing used for?$tr$, $tr$["Typing and formatting documents", "Organizing data in cells", "Making slides", "Only drawing"]$tr$::jsonb),
('d40e1e87-34f6-4390-9b0f-5c6cd2e16500', $tr$What is a benefit of a spreadsheet over paper?$tr$, $tr$["Easier to fix and turn into a graph", "No benefit", "Harder to use", "Cannot be changed"]$tr$::jsonb),
('d43cfa9f-d9f8-4422-bbed-5eb2fec5a3b9', $tr$Which orientation fits a letter?$tr$, $tr$["Portrait", "Landscape", "Banner", "Sideways"]$tr$::jsonb),
('d47c1328-f1ca-4280-a8c2-cd45c3d0cf0a', $tr$Who or what checks the web pages for a search engine?$tr$, $tr$["Crawler", "Keyboard", "Monitor"]$tr$::jsonb),
('d4ad33e7-89aa-4307-9f5c-ecdbc5063aa7', $tr$What is a margin?$tr$, $tr$["The blank space around the page", "The file name", "The color of the letters", "A picture on the page"]$tr$::jsonb),
('d55774b7-08be-4476-8a55-435b92491de8', $tr$Which closing line is most appropriate for an email to your school principal?$tr$, $tr$["Respectfully yours, Juan Dela Cruz, Grade 5", "maybe later", "bye bye take care hope u dont get mad", "k thanks"]$tr$::jsonb),
('d557c213-9d75-4394-a691-8a8536e6efdd', $tr$What is an algorithm?$tr$, $tr$["Solving a problem step by step", "A kind of game", "A kind of toy", "A kind of food"]$tr$::jsonb),
('d5f0023b-37b7-4a80-b735-68f4aa63ae73', $tr$What should you do before sharing information you found online?$tr$, $tr$["Post it right away", "Verify it first", "Don't read it"]$tr$::jsonb),
('d5faa87d-6016-40dc-ae8a-a51859c56f60', $tr$Why should you not use too much animation?$tr$, $tr$["It distracts from the message", "It is faster to make", "There is no reason", "It always looks better"]$tr$::jsonb),
('d6cdbe49-97a8-4299-bcbc-f7b5acd9b52d', $tr$You will make a wide timeline. Which orientation?$tr$, $tr$["Landscape", "Portrait", "Upright", "Normal"]$tr$::jsonb),
('d70d7cb7-680e-4143-b4b0-a9cd0375c2d9', $tr$How often should you take a break?$tr$, $tr$["Every 20-30 minutes", "Once a year", "No need", "Every 5 hours"]$tr$::jsonb),
('d890f28f-76fb-4534-8b46-3b276f5d24c4', $tr$What is desktop publishing used for?$tr$, $tr$["Creating posters or newsletters", "Organizing data", "Typing letters", "Making slides"]$tr$::jsonb),
('d89ffc65-c13b-4c7a-bf76-085f13551a62', $tr$You want the title in the middle. Which button?$tr$, $tr$["Center", "Align Left", "Align Right", "Only Bold"]$tr$::jsonb),
('d8ff89ac-c961-4c8e-ad18-aaa048978452', $tr$What is the main lesson about the digital footprint?$tr$, $tr$["Think before you post, stay positive", "Post anything", "What you leave online doesn't matter", "No danger online"]$tr$::jsonb),
('da47061f-75d9-4fdc-a51f-9d1006838ff8', $tr$Why focus on one clear message per slide?$tr$, $tr$["So the audience doesn't get confused", "It doesn't matter", "As long as there is lots of information, it's okay", "Not important"]$tr$::jsonb),
('da956c66-fa82-4f80-bb34-1c1701f77e5c', $tr$What is a flowchart?$tr$, $tr$["Symbols and arrows that show a process", "Just a kind of data graph", "A kind of photo", "A kind of song"]$tr$::jsonb),
('dac57222-268d-43c1-8988-d94322549125', $tr$Why should you check before believing?$tr$, $tr$["Not everything on the Internet is true", "Everything is always true", "No need to check", "False information has no effect"]$tr$::jsonb),
('db6d1abb-a7a1-4fc1-ae6f-0e652a948e1f', $tr$What is a peripheral device?$tr$, $tr$["A device you connect to the computer", "Only the main computer", "A kind of software", "A kind of internet"]$tr$::jsonb),
('db80844b-bf99-434d-9b60-658a53c700dd', $tr$Why learn to care for it from a young age?$tr$, $tr$["To be responsible online as you grow up", "No need to learn it", "Only for adults", "No effect"]$tr$::jsonb),
('dbf1aa2a-4622-454c-938b-063162fdaf40', $tr$What is digital citizenship?$tr$, $tr$["Using technology responsibly and safely", "Using it carelessly", "Sharing everything", "Having no rules"]$tr$::jsonb),
('dc5162b2-51ca-4605-99c5-ea3ac4be6f9f', $tr$What should you do before using the equipment?$tr$, $tr$["Clean your hands", "Eat first", "Run", "Drink"]$tr$::jsonb),
('dc7c9dad-0131-4b1c-a1c1-4af7e5009135', $tr$What does right-click do?$tr$, $tr$["Shows a menu of options", "Opens a file right away", "Turns off the computer", "Nothing"]$tr$::jsonb),
('dd2f0a79-8181-4623-81ed-f7a831ae654e', $tr$What happens when people believe fake news?$tr$, $tr$["Wrong knowledge and decisions", "No effect", "Always positive", "It only makes you stronger"]$tr$::jsonb),
('de18f3b4-f9b9-4db0-9e68-14db4fd73a9f', $tr$Which command lets you write anywhere?$tr$, $tr$["Text Box", "Theme", "Crop", "F5"]$tr$::jsonb),
('de3911ce-3824-45d5-9c71-cef24b11306c', $tr$What is animation in a presentation?$tr$, $tr$["Movement of text or a picture on a slide", "Moving from one slide to another", "An embedded sound", "An embedded video"]$tr$::jsonb),
('de3a6bb8-99e7-459a-8f2d-6e2aeac44a5e', $tr$What is important when using the mouse?$tr$, $tr$["Accuracy", "Only speed", "Noise", "Color"]$tr$::jsonb),
('df998744-73b5-430f-abbe-13d3d29eb350', $tr$Times New Roman is a:$tr$, $tr$["font type", "font size", "alignment", "orientation"]$tr$::jsonb),
('dfa989da-9e0f-48ec-93d5-0bf3e0116ab2', $tr$What kinds of questions can you add to a form?$tr$, $tr$["Multiple choice, short answer, checkbox", "Only one kind", "None", "Only pictures"]$tr$::jsonb),
('dfab5894-304b-40d5-a767-b4649702357f', $tr$Why is it important for a project's layout to be clear?$tr$, $tr$["So it is easy to read and understand", "So it is hard to read", "It has nothing to do with reading", "Just to make the file bigger"]$tr$::jsonb),
('dfc0e4d1-6a0e-445f-a8e4-91ce6a61a958', $tr$What is an example of a phishing message?$tr$, $tr$["An email that suddenly asks for your password", "A normal news story", "A letter from your teacher", "An offer of a free book"]$tr$::jsonb),
('dfdeec78-57a4-48d6-921d-92098fba6206', $tr$Why is it important to accept feedback from others about your project?$tr$, $tr$["It helps improve the quality of the work", "It has nothing to do with the quality of the work", "You should be ashamed of it and avoid it", "You should not listen to feedback from others"]$tr$::jsonb),
('e00677bf-2e88-451d-a338-0cbe16eda9e4', $tr$What is a search engine?$tr$, $tr$["It helps you find information using keywords", "A kind of game", "A kind of computer", "A kind of printer"]$tr$::jsonb),
('e013bfe0-dbfc-4227-a482-0a6d4d80aa20', $tr$Which margin is usually used?$tr$, $tr$["Normal", "None", "Very wide", "Upside down"]$tr$::jsonb),
('e0b79631-2819-4e15-a68e-e29c17f52eb1', $tr$Why is it important to keep personal information private online?$tr$, $tr$["To avoid danger from people with bad intentions", "There is no danger", "It must be shared with everyone", "It is safe to share"]$tr$::jsonb),
('e0fc019a-b291-4e2e-95e1-5eb54169781b', $tr$Which of these is an example of a web browser?$tr$, $tr$["Microsoft Word", "Google Chrome", "Calculator"]$tr$::jsonb),
('e1041c14-3157-4fc9-bc45-ab3a38423e93', $tr$What will we study next term?$tr$, $tr$["Word processing and presentation software", "No more topics", "Just something else", "Nothing"]$tr$::jsonb),
('e1601ba9-5ce5-4aea-aabf-fab4901d4a60', $tr$What is booting?$tr$, $tr$["The process of starting the computer", "The process of turning it off", "A kind of game", "Nothing"]$tr$::jsonb),
('e16dfa32-26fc-44c2-966a-5f6e00ba055d', $tr$What should you choose before sharing a file?$tr$, $tr$["Whether to give view only or edit access", "Nothing", "A random option", "Only color"]$tr$::jsonb),
('e1902b43-ca67-456c-bcec-2427480e7f93', $tr$Why teach presentations in ICT?$tr$, $tr$["To learn how to share ideas with others", "No purpose", "Only for adults", "Not related to ICT"]$tr$::jsonb),
('e1b6b52a-bd3c-4625-8270-4d6a4da5297c', $tr$Who should you ask for help if you are confused?$tr$, $tr$["Teacher", "Stranger", "No one", "Only a classmate"]$tr$::jsonb),
('e1c747b8-e80f-4ec8-ae15-e94b582c0e71', $tr$What is the first step in the sample sandwich algorithm?$tr$, $tr$["Get some bread", "Eat it", "Close the sandwich", "Add the filling"]$tr$::jsonb),
('e1e7b03a-b5ec-4842-9efc-fc433b1f9610', $tr$Ctrl + U is for:$tr$, $tr$["underline", "bold", "italic", "save"]$tr$::jsonb),
('e219d9be-16bd-4543-9847-338e84629287', $tr$What should you put on a poster for an event?$tr$, $tr$["Title, date, and place", "All your Math lessons", "Your password", "Nothing"]$tr$::jsonb),
('e2dfcae6-607d-4ab8-b7a9-2a691bf435d6', $tr$What is the scroll bar used for?$tr$, $tr$["Moving up or down the page", "Saving a file", "Choosing a font", "Deleting a file"]$tr$::jsonb),
('e315556b-8263-4335-bf95-ce0963abc818', $tr$Where can you find Pictures and Shapes?$tr$, $tr$["Insert tab", "Design tab", "Home tab", "View tab"]$tr$::jsonb),
('e37cb617-18e7-4279-9c4f-48007d3b1034', $tr$What is Text Fill?$tr$, $tr$["The color inside the letters", "The edge of the letters", "The size of the slide", "The file name"]$tr$::jsonb),
('e3a95e86-c70e-4fc7-9fd4-c54afa3c7910', $tr$Why is data ethics important?$tr$, $tr$["It protects people's privacy", "No reason", "Only for a grade", "It is useless"]$tr$::jsonb),
('e48a744f-29e1-45d0-9ce5-01dffcde6fd5', $tr$Why should you use a checklist when reviewing a project?$tr$, $tr$["To make sure all the important parts are covered", "Only to make the whole task faster", "There is no real reason for it", "Only to avoid editing"]$tr$::jsonb),
('e539ba45-baf3-41aa-860b-1ab2434711d4', $tr$What is the main use of a search engine?$tr$, $tr$["To store food", "To search for information on the web", "To print pictures"]$tr$::jsonb),
('e56521eb-ab1b-4e41-8281-9c84b412cad0', $tr$Why are computer room rules important?$tr$, $tr$["They protect the equipment and keep everyone safe", "So we can play more", "They have no use", "So we don't use anything"]$tr$::jsonb),
('e5dc2a80-e651-47f3-a272-ca6f6a53dd6f', $tr$Why use only a few transitions?$tr$, $tr$["To avoid being distracting", "To make it messier", "It doesn't matter", "Many are required"]$tr$::jsonb),
('e6d6ae45-4626-4e54-97ab-6ae3cbbe8f23', $tr$Why should the margin not be too small?$tr$, $tr$["The text might get cut off when printing", "The letters will get bigger", "It will become colorful", "The file will disappear"]$tr$::jsonb),
('e7136c6a-bacc-4fe3-80fd-f4cb39842c7d', $tr$There isn't enough space on the page for your text. Which margin should you try?$tr$, $tr$["Narrow", "Wide", "Bigger", "No change"]$tr$::jsonb),
('e923ede1-285c-4acc-85ce-6fe43df81497', $tr$What can you do with data in a spreadsheet?$tr$, $tr$["Make a table or graph", "Nothing at all", "Just forget it", "Hide it"]$tr$::jsonb),
('e984997d-385a-4a9b-9211-299c13650f10', $tr$In which tab do you choose a theme?$tr$, $tr$["Design", "Home", "Insert", "View"]$tr$::jsonb),
('e98528a1-aa92-46d0-98d4-45717062f93c', $tr$What is Shape Outline?$tr$, $tr$["The color of a shape's edge", "The color inside a shape", "A kind of font", "The number of slides"]$tr$::jsonb),
('e98b64fb-cb7b-4597-a47f-29fe01e02306', $tr$Who benefits when a project is uploaded properly?$tr$, $tr$["You and your teacher", "No one benefits", "Only strangers", "Nobody"]$tr$::jsonb),
('e9cab404-7d31-45ac-bf14-d1de514c73a6', $tr$What is peer feedback?$tr$, $tr$["Comments from a classmate or teacher about your work", "A kind of computer file", "Only a kind of picture", "Only a part of a brochure"]$tr$::jsonb),
('ea6ab830-d309-4cb2-90fe-986a022e70ee', $tr$What is a placeholder?$tr$, $tr$["A box that says Click to add title", "The background color", "The file name", "A kind of font"]$tr$::jsonb),
('eab482d9-981d-49dd-9ffe-9306c6d77385', $tr$Why is organizing files important?$tr$, $tr$["It helps you work productively", "No reason", "Only for a grade", "It is useless"]$tr$::jsonb),
('eb4af61e-9e0d-48ac-b11b-c2fd369abbf5', $tr$Which of the following is an example of a polite greeting to open an email to a teacher?$tr$, $tr$["Good day, Ma'am/Sir,", "Hey you!", "Don't you dare ignore me, ok", "Yo dude,"]$tr$::jsonb),
('eb80e005-c77c-48cd-8ad8-02469f6ff3f1', $tr$Why should you not use the same password for every account?$tr$, $tr$["If one gets hacked, not all of them are affected", "It's easier with the same password", "It has no effect", "You are required to do it"]$tr$::jsonb),
('eb846a24-63a0-4b47-bcfe-27dbd5637960', $tr$What should you check from time to time?$tr$, $tr$["The list of people who have access", "Nothing", "The color of the file", "The price of the file"]$tr$::jsonb),
('ebbc78dc-562a-45c1-83d8-9890000e37d0', $tr$Why should the font in a brochure be clear?$tr$, $tr$["So the information is easy to read", "Only so it looks nicer", "So the work is finished quickly", "There is no reason"]$tr$::jsonb),
('ebbd2737-6d49-4277-8c99-bf429480c271', $tr$A student used lots of animation on every word in their slide. What is the problem?$tr$, $tr$["It becomes messy and distracting", "There is no problem", "It looks more professional", "It makes the presentation faster"]$tr$::jsonb),
('ec433d11-bb80-48ca-8c4e-442e9827a985', $tr$Which should you NOT do in a presentation?$tr$, $tr$["Put in way too much text", "Use fitting pictures", "Keep the message clear", "Use few transitions"]$tr$::jsonb),
('ec5d274c-448d-4e02-8a6d-8bb4203c6cf0', $tr$What font size is usual for text?$tr$, $tr$["12", "2", "72", "100"]$tr$::jsonb),
('ecac7141-b469-45c6-aff1-e53b27dc5a44', $tr$How should you sit while using a computer?$tr$, $tr$["Up straight", "Bent over", "Lying down", "Far from the chair"]$tr$::jsonb),
('ecce59b4-0ebf-432d-8e76-53b4fd41803e', $tr$Which is an example of a peripheral device?$tr$, $tr$["Printer", "Only the CPU", "Only the monitor", "There is no example"]$tr$::jsonb),
('ecdff91d-76ac-4a14-acba-5f783ef00256', $tr$What is an example of data you can record in a spreadsheet?$tr$, $tr$["Spending for one week", "A poem", "A letter", "A news story"]$tr$::jsonb),
('ed112d75-fbbe-49d7-b929-05d77ffb0641', $tr$Where can you see the file name?$tr$, $tr$["Title bar", "Scroll bar", "Document area", "Cursor"]$tr$::jsonb),
('ed923409-f97d-4c6d-8604-d0e7ffbb2746', $tr$How is the digital footprint related to checking information online?$tr$, $tr$["Both are part of using the Internet responsibly", "The two have no connection", "One is only about science", "One is only about math"]$tr$::jsonb),
('edc24cb9-896a-45e7-b633-582a77ef6c97', $tr$Why is it important to watch your screen time?$tr$, $tr$["Too much can be bad for your health", "It has no effect on health", "Long screen time is always good", "No need to watch it"]$tr$::jsonb),
('edfe0f9f-5ad7-422c-a4af-55557c4d4ad3', $tr$You want each point on a list to appear one at a time. What will you use?$tr$, $tr$["Animation", "Only a slide transition", "Only audio", "Only video"]$tr$::jsonb),
('eee9f3fe-ba2c-445f-933d-d77152164133', $tr$Why are these online tools important?$tr$, $tr$["They help with learning and communication", "They have no use", "Only for a grade", "They are useless"]$tr$::jsonb),
('eeee3b29-c5b2-48a1-b0c1-fd7e4a579b58', $tr$What do good manners in a video call show?$tr$, $tr$["Respect for others", "Disrespect", "Carelessness", "No use"]$tr$::jsonb),
('ef71a527-e9a9-4f8f-9e6b-857d62327cd4', $tr$What did we learn about the parts of a computer?$tr$, $tr$["Monitor, keyboard, mouse, CPU, speakers", "Nothing", "Only one part", "We learned nothing"]$tr$::jsonb),
('efde692b-cffd-443d-b15b-4872fd6e3072', $tr$What two kinds of access can you give?$tr$, $tr$["View and edit", "Delete and print", "No kinds", "Only one"]$tr$::jsonb),
('f058b091-6a48-4a45-9611-5f09f763b2d4', $tr$A student got feedback that the text on their poster is too small. What should they do?$tr$, $tr$["Make the text bigger so it is easier to read", "Ignore the feedback and change nothing", "Remove all the text on the poster", "Close the whole project right away"]$tr$::jsonb),
('f120df18-956f-46d3-94dd-a3d184eba7db', $tr$What is the main lesson about online security?$tr$, $tr$["Be careful and protect your personal information", "Share all your information", "No need to be careful", "There is no danger online"]$tr$::jsonb),
('f17cdc4d-b35f-4623-9630-ff94064e3ba3', $tr$Why should you not eat near the computer?$tr$, $tr$["So the equipment doesn't get damaged", "So you get full", "No reason", "So it tastes good"]$tr$::jsonb),
('f1a02d53-e8a9-4873-b2c1-9b0b523a2fb8', $tr$What is used to make a document attractive?$tr$, $tr$["Borders and accents", "Only random numbers", "Only blank space", "Only one color"]$tr$::jsonb),
('f1ec32a2-d7a4-407b-b5a7-ea6f4b24dadc', $tr$Why should you use a checklist when reviewing a project?$tr$, $tr$["To make sure all the important parts are covered", "Only to make the whole task faster", "There is no real reason for it", "Only to avoid editing"]$tr$::jsonb),
('f220d1e9-e593-41c4-89c4-a11d0b29f534', $tr$What is a task that can become an algorithm?$tr$, $tr$["Getting ready for school", "Nothing can become an algorithm", "Something with no steps", "A random thought"]$tr$::jsonb),
('f300f536-6d32-4e60-bcbe-e75ec8e40c8a', $tr$Why should you give a file a clear name?$tr$, $tr$["So it is easy to find", "No reason", "Only to make it look nice", "It is useless"]$tr$::jsonb),
('f34b345e-cbf9-4ecf-aec9-716417bf9b61', $tr$What are handles?$tr$, $tr$["Small circles on the edges of a box", "Tabs on the ribbon", "Slides on the left", "Fonts"]$tr$::jsonb),
('f3501d55-d86d-442c-94b1-f44b42a7db6a', $tr$What will we study next term?$tr$, $tr$["Productivity software", "No more topics", "Just something else", "Nothing"]$tr$::jsonb),
('f3828dd9-d676-4610-8ede-8b1e61b64dba', $tr$Why teach online security?$tr$, $tr$["To stay protected from dangers online", "No purpose", "To get people to be careless", "Not part of ICT"]$tr$::jsonb),
('f4d2c892-3483-4121-a86f-3863e090d8ef', $tr$How do you move to the bottom part of a long document?$tr$, $tr$["Use the scroll bar", "Press Ctrl + S", "Close the file", "Press Esc"]$tr$::jsonb),
('f5306057-2998-44db-8820-25c0a7f534f7', $tr$What does a printer do?$tr$, $tr$["Makes a paper copy", "Takes a picture", "Processes information", "Shows photos"]$tr$::jsonb),
('f59fd7af-ce8f-4c44-aef8-f6e9634d748e', $tr$Why should you keep a brochure simple?$tr$, $tr$["So the reader does not get confused", "So it takes longer to make", "So the text is longer", "There is no reason"]$tr$::jsonb),
('f5c72d70-54d2-4be5-9f9d-5c28f34f8f00', $tr$Why are computer room rules important?$tr$, $tr$["They protect the equipment and keep everyone safe", "So you can play more", "They are useless", "So no one uses the computers"]$tr$::jsonb),
('f6d2e8d7-89b2-49b7-966f-f5f9568ce229', $tr$You are making a banner for sports day. Which orientation?$tr$, $tr$["Landscape", "Portrait", "Upright", "Small"]$tr$::jsonb),
('f78d19ad-51bd-4c53-9968-15ed3a06098f', $tr$Why is online security important?$tr$, $tr$["To protect personal information", "It doesn't matter", "Not a real issue", "Only for adults"]$tr$::jsonb),
('f86014b9-37db-43a0-8b9c-d937c4aad794', $tr$Which alignment is usual for a paragraph?$tr$, $tr$["Align Left", "Center", "Align Right", "Upside down"]$tr$::jsonb),
('fa05709d-41f6-419a-ada0-2de73c4fd8a2', $tr$In which tab do you change the font?$tr$, $tr$["Home", "Layout", "Insert", "View"]$tr$::jsonb),
('fa1e9c18-035d-4be8-8b99-0d75421b6b05', $tr$Which software is for a report with a table?$tr$, $tr$["Spreadsheet", "Presentation", "Word processing", "Desktop publishing"]$tr$::jsonb),
('fa6a743c-6c0e-440d-8664-87f10c405dad', $tr$What is animation in a presentation?$tr$, $tr$["Movement of text or a picture on a slide", "Moving from one slide to another", "An embedded sound", "An embedded video"]$tr$::jsonb),
('faae820e-a395-4f27-a584-3c84a1b56450', $tr$Which one is small, always carried around, and can call and text?$tr$, $tr$["Smartphone", "Desktop", "Printer", "Monitor"]$tr$::jsonb),
('faf06684-0ea2-48ea-9755-4757e29b9988', $tr$What do you use to keep files organized?$tr$, $tr$["Folders", "Nothing", "Only color", "Only font"]$tr$::jsonb),
('fba73c8e-521f-406b-a4f1-f26d7422ab87', $tr$What do you use to give other people access?$tr$, $tr$["Share button", "Delete button", "Print button", "No button"]$tr$::jsonb),
('fbd3b326-04cb-4261-a510-c1e1263bf5d9', $tr$Why should you not eat near the computer?$tr$, $tr$["So the equipment doesn't get damaged", "So you get full", "So it tastes good", "No reason"]$tr$::jsonb),
('fbefd4e6-e428-4516-b3a8-92dab82f79a1', $tr$A teacher emails the class: "Please email me your project topics by Friday." Which student response best follows email etiquette from greeting to closing?$tr$, $tr$["'Good day, Ma'am, my project topic is about recycling. Thank you. - Maria, Grade 5'", "'my topic recycling'", "Replying All with just the topic and no greeting", "Not replying because the deadline is still far"]$tr$::jsonb),
('fc0fcf56-b22c-484e-adc8-acb1dd24f70d', $tr$How can you keep a positive digital footprint?$tr$, $tr$["Think before you post", "Just post", "Share everything", "Say hurtful words"]$tr$::jsonb),
('fc2f1687-9844-4dcd-b0bf-1bb1dd0b897a', $tr$Who should you ask for permission before downloading?$tr$, $tr$["Parent", "A stranger", "No one", "An online friend"]$tr$::jsonb),
('fc454eb1-048f-4ca3-9eec-20ae32ecf7bf', $tr$Why learn to spot phishing?$tr$, $tr$["So you don't get tricked", "It is useless", "Not a real danger", "Not related to online safety"]$tr$::jsonb),
('fc989aff-5001-423e-9f94-72fd9aa008fa', $tr$How should you handle a cable?$tr$, $tr$["Avoid bending or pulling it", "Pull it hard", "Crumple it up", "There is no right way"]$tr$::jsonb),
('fcfca09f-3ffb-4474-b220-c7a14a27aa7a', $tr$Where do you work on the slide you are editing?$tr$, $tr$["Slide area", "Slide pane", "Status bar", "Title bar"]$tr$::jsonb),
('fd6be1fc-db98-4a41-bf88-9e7044984862', $tr$Which is an example of a shape?$tr$, $tr$["Star", "Arial", "A4", "F5"]$tr$::jsonb),
('fd80d7b9-22e9-4960-99a6-948d788aaa74', $tr$What is a keyword when searching online?$tr$, $tr$["An important word used for searching", "A kind of password", "A kind of virus", "A kind of file"]$tr$::jsonb),
('fdc25050-3441-48e1-9c20-ddc167b3f2b4', $tr$What is desktop publishing?$tr$, $tr$["Making professional documents", "Only making a spreadsheet", "Only playing a computer game", "Only writing an email"]$tr$::jsonb),
('fe050097-7c3e-4a55-96e5-dc15ff1c5320', $tr$What is a benefit of using a spreadsheet instead of just paper?$tr$, $tr$["Data is easier to arrange, change, and turn into a graph", "No benefit", "It is harder to use", "It cannot be changed"]$tr$::jsonb),
('fe632d88-c35a-4d5a-a9bc-b256f051636b', $tr$Why not use the same password for everything?$tr$, $tr$["So all accounts aren't opened if one gets hacked", "It's easier", "No effect", "Required to do"]$tr$::jsonb),
('ffd32e56-fc08-4129-97ca-be49550d839e', $tr$Why review your ICT skills?$tr$, $tr$["To strengthen what you know before learning something new", "No need to review", "It is useless", "Just to entertain the teacher"]$tr$::jsonb),
('ffdb8256-b604-4882-8a1b-a2883d98d728', $tr$You will make a poster for Filipino Language Month. What kind of task is this?$tr$, $tr$["Desktop publishing", "Spreadsheet", "Calculating", "Listening"]$tr$::jsonb),
('ffde651c-f39b-43be-b83d-2436576a1805', $tr$The power went out and your work was lost. What habit would help?$tr$, $tr$["Saving often", "Making the font bigger", "Using colors", "Scrolling"]$tr$::jsonb),
('fffb3a63-ff91-4494-a7c6-bd282a75f1e2', $tr$What should you avoid online?$tr$, $tr$["Suspicious links", "Safe websites", "School lessons", "Educational games"]$tr$::jsonb);

insert into _ict_boss values
('01747d15-c2e5-4ceb-8016-00c6923bcffc', $tr$What is used to make a document attractive?$tr$, $tr$["Borders and accents", "Random numbers only", "Blank space only", "One color only"]$tr$::jsonb, $tr$Creating Brochures and Flyers$tr$),
('01b455b3-63fb-4cc6-8d7a-4b8f5831fcdf', $tr$Why should you use a fitting picture?$tr$, $tr$["It supports the message", "It has no use", "It only makes things messy", "It is not needed"]$tr$::jsonb, $tr$Review: Presentation and Multimedia$tr$),
('0383db02-58b6-4f74-84b2-741637628f56', $tr$Why should you avoid hurtful words online?$tr$, $tr$["They can hurt others and stay forever", "They have no effect", "They are safe to post online", "You are required to use them"]$tr$::jsonb, $tr$Digital Footprint Awareness$tr$),
('03af0249-c250-42eb-9a8f-03fc4dcede8a', $tr$Which key ends a slide show?$tr$, $tr$["Esc", "F5", "Space", "Shift"]$tr$::jsonb, $tr$Getting to Know Presentation Software$tr$),
('04bc8d1a-6a6c-417f-a78a-200cec92c7ff', $tr$Your classmate says one picture in your brochure is blurry. What is the right thing to do?$tr$, $tr$["Replace the picture with a clearer version", "Just ignore the feedback", "Remove the whole brochure", "Get angry at the classmate who gave the feedback"]$tr$::jsonb, $tr$Editing and Improving the Digital Portfolio$tr$),
('04bcbfc6-3fad-4712-adc6-47b3c9fdbc36', $tr$Which alignment fits a title?$tr$, $tr$["Center", "Align Left", "Align Right", "Justify"]$tr$::jsonb, $tr$Font and Text Alignment$tr$),
('05bde190-ed92-418a-b6f2-1d53ca2a3330', $tr$Why should you review the presentation skills you learned?$tr$, $tr$["To make your knowledge strong before starting a new project", "You don't need to review them", "It has no use", "Just to entertain the teacher"]$tr$::jsonb, $tr$Review: Presentation and Multimedia$tr$),
('05eaddae-5c56-4f5a-ac3a-53bc8608ef79', $tr$Where can you see all the slides at once?$tr$, $tr$["Slide pane", "Slide area", "Title bar", "Placeholder"]$tr$::jsonb, $tr$Getting to Know Presentation Software$tr$),
('06c19475-e2f8-49ef-b65c-a0211bcdbf16', $tr$Why should you learn to take care of it from a young age?$tr$, $tr$["To be responsible with your online presence as you grow up", "You don't need to learn it", "It is only for grown-ups", "It has no effect"]$tr$::jsonb, $tr$Digital Footprint Awareness$tr$),
('06dc9382-355c-4710-abff-f1c94f7be1b5', $tr$What does Send Backward do?$tr$, $tr$["Puts it behind other objects", "Deletes the shape", "Makes the shape bigger", "Adds a slide"]$tr$::jsonb, $tr$Shapes and Images in Presentations$tr$),
('07fcffd5-159c-46f8-b9e4-6348c7fc8a8c', $tr$Which is an example of data you can record?$tr$, $tr$["Expenses for one week", "A poem", "A letter", "A news story"]$tr$::jsonb, $tr$Introduction to Simple Spreadsheet Data$tr$),
('09005e8c-040b-4704-9362-60e60f44e391', $tr$Why should you review your ICT skills?$tr$, $tr$["To make your knowledge strong before learning something new", "You don't need to review them", "It has no use", "Just to entertain the teacher"]$tr$::jsonb, $tr$Review: Digital Citizenship and Software$tr$),
('09143032-8c0f-4443-9504-146948a8cc1c', $tr$Why is it important to learn to use a spreadsheet in Grade 4?$tr$, $tr$["It is a basic skill for organizing information", "You don't need to learn it", "It is only for grown-ups", "It has no use in school"]$tr$::jsonb, $tr$Introduction to Simple Spreadsheet Data$tr$),
('0a2b1d4c-fc4e-46cc-8b7a-4c0f61756d97', $tr$Which key starts a slide show?$tr$, $tr$["F5", "Esc", "Enter", "Tab"]$tr$::jsonb, $tr$Getting to Know Presentation Software$tr$),
('0a576aec-c49f-4a93-8ff2-5fa6cb06e41f', $tr$What matters most for the text on a slide?$tr$, $tr$["Easy to read", "The most colors", "The smallest letters", "The most effects"]$tr$::jsonb, $tr$Textbox and WordArt in Presentations$tr$),
('0a8242d1-42a8-4a30-af1f-9043dec3ca66', $tr$Why is it important to learn to spot phishing?$tr$, $tr$["So you don't get tricked online", "It has no use", "Phishing is not a real danger", "It is not related to online safety"]$tr$::jsonb, $tr$Review: Online Security$tr$),
('0ae6f3f1-ab25-493a-b3a5-5688b8ec9757', $tr$Why is proof important for information?$tr$, $tr$["It shows that what is said is true", "It has no importance", "It is no longer needed", "It is always right even without proof"]$tr$::jsonb, $tr$Responsible Use of Search Engines$tr$),
('0ae727d2-0083-4f5d-8c60-e9a7a9f9e73c', $tr$A student is asked why she changed the layout of her brochure. What should she answer?$tr$, $tr$["The reason, based on the feedback she got", "She does not need to answer the question", "Say she does not know the reason", "Just put off answering"]$tr$::jsonb, $tr$Presenting My Finished Digital Portfolio$tr$),
('0ba2eaac-3d37-44a1-9d96-205aaa41fd5c', $tr$Why should you check before you believe?$tr$, $tr$["Not everything on the Internet is true", "Everything is always true", "You don't need to check", "Wrong information has no effect"]$tr$::jsonb, $tr$Responsible Use of Search Engines$tr$),
('0bbf2234-a483-4d6c-89bf-75a6d55a8f88', $tr$What is a digital footprint?$tr$, $tr$["The traces we leave on the Internet", "A kind of game", "Just a kind of photo", "A kind of computer"]$tr$::jsonb, $tr$Digital Footprint Awareness$tr$),
('0bc1ccff-7d2b-4463-a2e0-e6c082fa84c7', $tr$What is a presentation?$tr$, $tr$["Slides used to show ideas", "A kind of letter", "A computer game", "A song"]$tr$::jsonb, $tr$Getting to Know Presentation Software$tr$),
('0c5c14ca-ec86-48d8-a63d-e134d1a08694', $tr$What is presentation software used for?$tr$, $tr$["Making slides", "Typing documents", "Organizing data in cells", "Drawing only"]$tr$::jsonb, $tr$Review: Digital Citizenship and Software$tr$),
('0c6f81e0-a0e8-42e0-9e3c-d9ae811ada75', $tr$You want to start showing your slides. Press:$tr$, $tr$["F5", "Esc", "Ctrl + Z", "Delete"]$tr$::jsonb, $tr$Getting to Know Presentation Software$tr$),
('0cdb801b-deb6-4dd5-b973-46bee03b9007', $tr$What is a benefit of a spreadsheet over paper?$tr$, $tr$["Easier to organize and turn into a graph", "No benefit", "Harder to use", "Cannot be changed"]$tr$::jsonb, $tr$Introduction to Simple Spreadsheet Data$tr$),
('0eb85e93-d0c6-4839-9e5e-7c6a755ff079', $tr$Which is an example of a word processor?$tr$, $tr$["Microsoft Word", "Calculator", "Paint", "Music player"]$tr$::jsonb, $tr$Getting to Know the Word Processor$tr$),
('0fe7de88-62a6-4043-97bb-b40749dbde6d', $tr$What is a placeholder?$tr$, $tr$["A box that says Click to add title", "The background color", "The file name", "A type of font"]$tr$::jsonb, $tr$Getting to Know Presentation Software$tr$),
('1081df53-468b-4a91-b604-15eec33d34ca', $tr$A shape is covering the title. What should you do to the shape?$tr$, $tr$["Send Backward", "Bring Forward", "Make it even bigger", "Copy it"]$tr$::jsonb, $tr$Shapes and Images in Presentations$tr$),
('116a671f-de9c-47cb-9e6a-f43e48799c24', $tr$How do sound or video help?$tr$, $tr$["They make the presentation more interesting", "They don't help", "They make it harder", "They are not needed"]$tr$::jsonb, $tr$Review: Presentation and Multimedia$tr$),
('11eabbc5-0d7f-4d10-91ea-b2b9ce296a30', $tr$Why should each slide focus on one clear message?$tr$, $tr$["So the audience doesn't get confused", "It is not important", "As long as there is lots of information, it's okay", "Being clear doesn't matter"]$tr$::jsonb, $tr$Review: Presentation and Multimedia$tr$),
('1244eefe-6821-46e0-9bed-bfb98c84a7f6', $tr$You have little time to make a card. What will help?$tr$, $tr$["Use a template", "Start from a blank page", "Don't make one at all", "Use a calculator"]$tr$::jsonb, $tr$Introduction to Desktop Publishing$tr$),
('138c8988-2edc-489c-b09a-ab3988d4ee47', $tr$How many sides does a margin have?$tr$, $tr$["Four: top, bottom, left, right", "Only one", "Only two", "None"]$tr$::jsonb, $tr$Page Size, Orientation and Margin$tr$),
('13996b3b-4639-44e0-9b87-96ede3ddbf0b', $tr$What is a layout?$tr$, $tr$["How the elements are arranged on the page", "Only the color of the document", "Only the number of pages", "Only the font type"]$tr$::jsonb, $tr$Creating Brochures and Flyers$tr$),
('13d52870-22ab-4148-a77f-d0ced0dc264a', $tr$Which part of the screen shows the list of pages?$tr$, $tr$["Pages pane", "Title bar", "Cursor", "Scroll bar"]$tr$::jsonb, $tr$Introduction to Desktop Publishing$tr$),
('150a41f0-7350-4c2d-9c98-b12d873366f5', $tr$A student used lots of animation on every word in his slide. What is the problem?$tr$, $tr$["It becomes messy and distracting", "There is no problem", "It looks more professional", "It makes the presentation faster"]$tr$::jsonb, $tr$Creating Presentation Slides$tr$),
('154420c1-a327-4524-bcb5-48b95527be21', $tr$What is phishing?$tr$, $tr$["A trick to get your personal information", "A kind of game", "A kind of software", "Just a harmless kind of email"]$tr$::jsonb, $tr$Review: Online Security$tr$),
('15ca00f3-0124-4007-9c26-232089de2023', $tr$Why is a good presentation important?$tr$, $tr$["It helps share the message clearly", "It has no importance", "It is only for decoration", "It is not needed"]$tr$::jsonb, $tr$Review: Presentation and Multimedia$tr$),
('1608af3e-e69b-4cae-ba9c-1247797853a6', $tr$Which of these should you NOT do in a good presentation?$tr$, $tr$["Put way too much text on each slide", "Use fitting pictures", "Keep the message clear", "Use only a few transitions"]$tr$::jsonb, $tr$Review: Presentation and Multimedia$tr$),
('170787f8-61eb-43db-aba1-ce269e926b54', $tr$What is a keyword when searching online?$tr$, $tr$["An important word used to search for information", "A kind of password", "A kind of virus", "A kind of file"]$tr$::jsonb, $tr$Responsible Use of Search Engines$tr$),
('1791a447-1ec3-4a32-8b80-aaf05e73f899', $tr$Why is it important to keep personal information private online?$tr$, $tr$["To avoid danger from people with bad intentions", "There is no danger in it", "You must share it with everyone", "It is safe to share"]$tr$::jsonb, $tr$Digital Footprint Awareness$tr$),
('1799b579-aa02-4b2a-871c-340637295571', $tr$Why keep personal information private?$tr$, $tr$["To avoid danger from bad intentions", "There is no danger", "You must share it", "It is safe to share"]$tr$::jsonb, $tr$Digital Footprint Awareness$tr$),
('17c55a59-971b-41ce-9c24-69d6dcb38973', $tr$What is an element of a good presentation?$tr$, $tr$["Clear text", "Way too much text on a slide", "No pictures", "No organization"]$tr$::jsonb, $tr$Review: Presentation and Multimedia$tr$),
('18a5bb80-5ff5-4e14-b15a-3c8975f0a139', $tr$What do you need to do before presenting a portfolio?$tr$, $tr$["Check it and prepare your explanation", "Show it right away with no preparation", "Delete it before presenting", "Nothing, no need to prepare"]$tr$::jsonb, $tr$Presenting My Finished Digital Portfolio$tr$),
('18ea2767-16ee-4701-8efb-5906e19cdb18', $tr$Why is it important to watch your screen time?$tr$, $tr$["Too much can be bad for your health", "It has no effect on health", "Long screen time is always good", "You don't need to watch it"]$tr$::jsonb, $tr$Review: Digital Citizenship and Software$tr$),
('194e2fc1-8864-489d-bdb3-9ab4f625e09c', $tr$What is the first step in the sample sandwich algorithm?$tr$, $tr$["Get the bread", "Eat it", "Close the sandwich", "Add the filling"]$tr$::jsonb, $tr$Review: Block Coding and Algorithms$tr$),
('19861303-cb2a-4bb5-b635-44b829844e96', $tr$You will make a poster for Filipino Language Month. What kind of task is this?$tr$, $tr$["Desktop publishing", "Spreadsheet", "Calculating", "Listening"]$tr$::jsonb, $tr$Introduction to Desktop Publishing$tr$),
('1a1dee0a-9e9e-49ba-915f-5321c850dae7', $tr$What should you ask when checking information online?$tr$, $tr$["Who made it, when it was published, and is there proof", "Only the color of the website", "The font size", "Nothing, just believe it right away"]$tr$::jsonb, $tr$Responsible Use of Search Engines$tr$),
('1ac79a20-c269-4e1b-94a1-e8a5e92fb260', $tr$What is a vertical line of cells in a spreadsheet?$tr$, $tr$["Column", "Row", "Only a cell", "Only a sheet"]$tr$::jsonb, $tr$Introduction to Simple Spreadsheet Data$tr$),
('1b0d5b17-7e75-4a0a-a717-0bc3e44e00eb', $tr$Why is it important to organize data in a spreadsheet?$tr$, $tr$["The information becomes easier to check and understand", "It has no importance", "It only makes it messier", "It is not used in real life"]$tr$::jsonb, $tr$Introduction to Simple Spreadsheet Data$tr$),
('1b86fc96-df6b-4353-84f7-767cc62f2bb8', $tr$What is an algorithm?$tr$, $tr$["A step-by-step way to solve a problem", "A kind of game", "A kind of toy", "A kind of food"]$tr$::jsonb, $tr$Review: Block Coding and Algorithms$tr$),
('1bd4ec2b-c065-4fa7-bc6f-6dd9be700a93', $tr$What is spreadsheet software used for?$tr$, $tr$["Organizing data in cells", "Making slides", "Typing letters", "Drawing only"]$tr$::jsonb, $tr$Review: Digital Citizenship and Software$tr$),
('1bf3e0ab-788b-43e8-9468-a339caf4efdb', $tr$A classmate sent a group email asking for volunteers for a Filipino Language Month program. Which response shows good email etiquette?$tr$, $tr$["'Good day! I would like to volunteer for the poster-making part. Thank you!'", "'dont care bout language month'", "Replying all with just 'k'", "Not reading the email at all"]$tr$::jsonb, $tr$Appropriate tone$tr$),
('1c03eff9-a91e-44e3-89f9-e78ba9e6494d', $tr$What is a theme?$tr$, $tr$["A ready-made design with a background, colors, and fonts", "Just one slide", "The number of slides", "A keyboard shortcut"]$tr$::jsonb, $tr$Getting to Know Presentation Software$tr$),
('1c3907f1-2cae-456d-9e3d-5c82f4e1b2b3', $tr$Which is NOT usually made with desktop publishing?$tr$, $tr$["Calculating a budget", "Poster", "Flyer", "Certificate"]$tr$::jsonb, $tr$Introduction to Desktop Publishing$tr$),
('1db5caee-9f59-4574-ab61-aa944f78e8c6', $tr$Why should you know who wrote an article?$tr$, $tr$["It helps you tell if it can be trusted", "It doesn't matter", "You don't need to know", "The author is always the same"]$tr$::jsonb, $tr$Responsible Use of Search Engines$tr$),
('1e448e7c-67da-49a5-92eb-86c882e5ffc5', $tr$Which of the following is part of online safety?$tr$, $tr$["Keep personal information private", "Share your password with everyone", "Answer everyone who asks for information", "Stop being careful online"]$tr$::jsonb, $tr$Review: Digital Citizenship and Software$tr$),
('1eb6851e-03f6-4f29-969f-add94598a8d4', $tr$Which shortcut makes text italic?$tr$, $tr$["Ctrl + I", "Ctrl + B", "Ctrl + Z", "Ctrl + P"]$tr$::jsonb, $tr$Font and Text Alignment$tr$),
('1ee28c20-7222-4bb4-ae8f-abdbb94ecfbd', $tr$Which layout has no boxes?$tr$, $tr$["Blank", "Title Slide", "Title and Content", "Two Content"]$tr$::jsonb, $tr$Getting to Know Presentation Software$tr$),
('1efe4841-43ff-4367-ba60-3716b064bf69', $tr$Why be careful about what you share online?$tr$, $tr$["It can stay forever", "It has no effect", "It disappears right away", "It is not a real issue"]$tr$::jsonb, $tr$Digital Footprint Awareness$tr$),
('20950d4d-7b47-4ad0-ad66-61172c7de4b9', $tr$What does presenting a finished portfolio show?$tr$, $tr$["All our ICT skills from this term", "Being careless with the work right now", "Having no interest in ICT", "Only a lack of time"]$tr$::jsonb, $tr$Presenting My Finished Digital Portfolio$tr$),
('2187d2a8-4bea-4ead-b900-669c6f80823f', $tr$Why shouldn't you use the same password for everything?$tr$, $tr$["So all your accounts can't be opened if one gets hacked", "It is easier", "It has no effect", "You are required to"]$tr$::jsonb, $tr$Review: Online Security$tr$),
('22100e83-672f-4626-9233-c6cc3b37d9e5', $tr$Why is making presentations taught in EPP (ICT)?$tr$, $tr$["To learn to share ideas in front of others", "It has no purpose", "It is only for grown-ups", "It is not related to ICT"]$tr$::jsonb, $tr$Review: Presentation and Multimedia$tr$),
('2243c47e-25b6-4210-b118-0965ef021252', $tr$What is an example of a fake phishing message?$tr$, $tr$["An email that suddenly asks for your password", "A normal news story", "A letter from your teacher", "An offer of a free book"]$tr$::jsonb, $tr$Review: Online Security$tr$),
('22bc0875-9fce-4280-90f8-5ca649dd82e0', $tr$WordArt is good for:$tr$, $tr$["the slide title", "a long paragraph", "all the bullets", "speaker notes"]$tr$::jsonb, $tr$Textbox and WordArt in Presentations$tr$),
('23de4a79-d244-43ee-b224-d98e60b94f62', $tr$You want to show step 1 going to step 2. Which shape?$tr$, $tr$["Arrow", "Heart", "Circle", "Star"]$tr$::jsonb, $tr$Shapes and Images in Presentations$tr$),
('24272b30-9952-48f6-a2d9-f7ea48701ceb', $tr$How is a spreadsheet connected to Math?$tr$, $tr$["The data can be used to make graphs like you learned in Math", "The two have no connection", "Math does not use data", "A spreadsheet has nothing to do with graphs"]$tr$::jsonb, $tr$Introduction to Simple Spreadsheet Data$tr$),
('251e89b8-9142-474d-b395-bf2d4fc0b168', $tr$What is the last step in the sample algorithm?$tr$, $tr$["Eat it", "Get the bread", "Add the filling", "Close the sandwich"]$tr$::jsonb, $tr$Review: Block Coding and Algorithms$tr$),
('287f7897-6c1e-4aa6-b686-975fa1d1e92a', $tr$Where do you change the paper size?$tr$, $tr$["Layout, Size", "Insert, Picture", "Home, Bold", "View, Zoom"]$tr$::jsonb, $tr$Page Size, Orientation and Margin$tr$),
('2886428c-c510-4700-9903-d5c7227fd603', $tr$Why shouldn't the margin be too small?$tr$, $tr$["The text might get cut off when printing", "The letters will get bigger", "It will become colorful", "The file will disappear"]$tr$::jsonb, $tr$Page Size, Orientation and Margin$tr$),
('28ed45c6-b17b-4b5a-9807-3d6e6eac259e', $tr$Why do we write where a picture came from?$tr$, $tr$["To respect the owner", "To make the file bigger", "To make the slide faster", "No reason"]$tr$::jsonb, $tr$Shapes and Images in Presentations$tr$),
('2aaeaa4f-b092-4997-b6bf-1998acecb747', $tr$What is peer feedback?$tr$, $tr$["Comments from a classmate or teacher about your work", "A type of computer file", "Only a type of picture", "Only a part of a brochure"]$tr$::jsonb, $tr$Editing and Improving the Digital Portfolio$tr$),
('2c9f9e78-c4db-47dc-8ace-0d67faa60972', $tr$Where should you use WordArt?$tr$, $tr$["In the title", "In all the text", "In every bullet", "In the speaker notes"]$tr$::jsonb, $tr$Textbox and WordArt in Presentations$tr$),
('2cd2ee66-a862-4421-bb30-ac341670be63', $tr$Why shouldn't you use the same password for all your accounts?$tr$, $tr$["If one gets hacked, the others stay safe", "It is easier with the same password", "It has no effect", "You are required to"]$tr$::jsonb, $tr$Review: Online Security$tr$),
('2cdb00b3-16c0-4005-bb7b-63ec5db6beb9', $tr$You want to add a note in the bottom corner of the slide. Use:$tr$, $tr$["Text Box", "Theme", "New Slide", "F5"]$tr$::jsonb, $tr$Textbox and WordArt in Presentations$tr$),
('2cde4335-36ff-4df4-bd36-d090b48975fc', $tr$Why is it important to check information before believing it?$tr$, $tr$["Not everything on the Internet is true", "Everything online is always true", "You don't need to check anymore", "Wrong information has no effect"]$tr$::jsonb, $tr$Responsible Use of Search Engines$tr$),
('2d057c08-a4e7-4711-ae3a-cc37f854d6d8', $tr$What is part of a digital footprint?$tr$, $tr$["Photos, messages, and comments shared online", "Only things at home", "Cooking tools", "Only toys"]$tr$::jsonb, $tr$Digital Footprint Awareness$tr$),
('2d2dee7b-633e-4a9b-bd99-681b005c27e3', $tr$What is the first step in making a textbox?$tr$, $tr$["Insert, Text Box", "Design, Themes", "Home, New Slide", "File, Save"]$tr$::jsonb, $tr$Textbox and WordArt in Presentations$tr$),
('2d315f1f-848b-4432-a77a-ed02e67451da', $tr$Why should you use a checklist when reviewing a project?$tr$, $tr$["To make sure all the important parts are covered", "Only to finish the whole task faster", "There is no real reason for it", "Only to avoid editing"]$tr$::jsonb, $tr$Editing and Improving the Digital Portfolio$tr$),
('2d5aae1f-0ac0-42c1-8b6c-46470f714d38', $tr$What is a way to keep a positive digital footprint?$tr$, $tr$["Think before you post", "Just post anything", "Share everything", "Say hurtful words"]$tr$::jsonb, $tr$Digital Footprint Awareness$tr$),
('2d7e26b5-9c16-496d-9828-34cddd510b2f', $tr$What happens if you posted something negative before?$tr$, $tr$["It can still be seen even if deleted", "It disappears right away", "It has no effect now", "It is not saved anywhere"]$tr$::jsonb, $tr$Digital Footprint Awareness$tr$),
('2e48f441-46f4-441b-bbd5-ea31845613ef', $tr$What is Text Outline?$tr$, $tr$["The edge of the letters", "The background color", "The number of slides", "A type of layout"]$tr$::jsonb, $tr$Textbox and WordArt in Presentations$tr$),
('2e5818ae-8d15-4efb-b36b-38c764e5f134', $tr$What is part of multimedia in a presentation?$tr$, $tr$["Photos, sound, or video", "Text only", "Nothing", "Numbers only"]$tr$::jsonb, $tr$Review: Presentation and Multimedia$tr$),
('2e61081d-6dd7-4c7f-a523-6d0893899435', $tr$Which is an example of a desktop publishing program?$tr$, $tr$["Microsoft Publisher", "Calculator", "Notepad", "File Explorer"]$tr$::jsonb, $tr$Introduction to Desktop Publishing$tr$),
('2e79b330-e428-4e8f-8f2f-58c672adab22', $tr$Why do we put pictures on a slide?$tr$, $tr$["The idea is easier to understand", "To make the report longer", "To make the text disappear", "To make it messy"]$tr$::jsonb, $tr$Shapes and Images in Presentations$tr$),
('2ee41a4d-fd06-4c53-89e1-d92e83e1d6fa', $tr$A student made a flyer full of text that is hard to understand. What is the problem?$tr$, $tr$["Too much information, not enough clarity", "The design is too simple", "There is no problem", "The paper is too small"]$tr$::jsonb, $tr$Creating Brochures and Flyers$tr$),
('2f8fae60-6a6b-4ebd-bf31-d611f3b6d0d1', $tr$Why follow the correct order?$tr$, $tr$["To finish the task successfully", "It doesn't matter", "Any order is fine", "It has no effect"]$tr$::jsonb, $tr$Review: Block Coding and Algorithms$tr$),
('2facb29b-dd1c-4583-8189-270d1df1ac53', $tr$You deleted a word by mistake. What will you do?$tr$, $tr$["Press Ctrl + Z", "Close the file", "Press Ctrl + P", "Turn off the computer"]$tr$::jsonb, $tr$Getting to Know the Word Processor$tr$),
('30ba0c36-c87f-418d-ac10-86a1de0e7672', $tr$You are writing an essay for your teacher. Which orientation?$tr$, $tr$["Portrait", "Landscape", "Lying sideways", "Banner"]$tr$::jsonb, $tr$Page Size, Orientation and Margin$tr$),
('329019ee-d8f3-4e97-8bc5-f28f5f368900', $tr$Which key do you use to start a new paragraph?$tr$, $tr$["Enter", "Delete", "Esc", "Shift"]$tr$::jsonb, $tr$Getting to Know the Word Processor$tr$),
('329dfc93-1d4c-4402-9dda-9436855cb224', $tr$What are handles?$tr$, $tr$["Small circles on the edges of a box", "Tabs on the ribbon", "Slides on the left", "Fonts"]$tr$::jsonb, $tr$Textbox and WordArt in Presentations$tr$),
('36731474-ba3b-463a-b983-4986c370999c', $tr$You are making a banner for sports day. Which orientation?$tr$, $tr$["Landscape", "Portrait", "Standing up", "Small"]$tr$::jsonb, $tr$Page Size, Orientation and Margin$tr$),
('36e426d4-c024-4a6a-bd0c-e72d5e3d6ba7', $tr$Why do we study the word processor?$tr$, $tr$["To make neat documents", "Just to play", "To break files", "No reason"]$tr$::jsonb, $tr$Getting to Know the Word Processor$tr$),
('3765a3c6-ef29-435f-abae-e0d728fbf11f', $tr$Why should a presentation have only a few transitions?$tr$, $tr$["To avoid making it distracting", "To make it messier", "It is not important", "Many transitions are required"]$tr$::jsonb, $tr$Review: Presentation and Multimedia$tr$),
('38a4c61d-591f-4603-8545-135bf08bfcc6', $tr$What does the title bar show?$tr$, $tr$["The file name", "The word count", "The page color", "Pictures"]$tr$::jsonb, $tr$Getting to Know the Word Processor$tr$),
('39ce7995-3faa-45da-b749-32449d6e771f', $tr$Why is online security important?$tr$, $tr$["It helps protect personal information", "It has no importance", "It is not a real issue", "It is only for grown-ups"]$tr$::jsonb, $tr$Review: Online Security$tr$),
('39eb08d7-ca22-4e4f-a9f9-2d3554eafdce', $tr$Why should you avoid saying hurtful words online?$tr$, $tr$["They can hurt others and stay forever", "It has no effect", "It is safe to do online", "You are required to do it"]$tr$::jsonb, $tr$Digital Footprint Awareness$tr$),
('3b1d9c69-c452-4793-918e-627444075e5c', $tr$What should you set up first in a new document?$tr$, $tr$["Page setup", "Font color", "Pictures", "The teacher's name"]$tr$::jsonb, $tr$Page Size, Orientation and Margin$tr$),
('3b2c6c2e-6828-437c-bac3-170bde50446f', $tr$What is Text Fill?$tr$, $tr$["The color inside the letters", "The edge of the letters", "The slide size", "The file name"]$tr$::jsonb, $tr$Textbox and WordArt in Presentations$tr$),
('3bc207ef-651c-405b-b990-b3c7cd56895f', $tr$You will make a wide timeline. Which orientation?$tr$, $tr$["Landscape", "Portrait", "Standing up", "Normal"]$tr$::jsonb, $tr$Page Size, Orientation and Margin$tr$),
('3bcc2926-452c-4138-a329-1d0ce8984521', $tr$Where do you type your writing?$tr$, $tr$["Document area", "Title bar", "Ribbon", "Scroll bar"]$tr$::jsonb, $tr$Getting to Know the Word Processor$tr$),
('3bfb5fd2-fbe0-4d8f-bc0d-ed245fcee400', $tr$What is a template?$tr$, $tr$["A ready-made design that you can change", "Only a type of picture", "Only a type of font", "Only a type of color"]$tr$::jsonb, $tr$Creating Brochures and Flyers$tr$),
('3c940e54-82d6-4915-9549-392082b150fb', $tr$What should you do if you find doubtful information online?$tr$, $tr$["Check it first before sharing or believing it", "Share it with everyone right away", "Believe it right away", "Ignore all warnings"]$tr$::jsonb, $tr$Responsible Use of Search Engines$tr$),
('3d6c4583-2d0f-41c9-bf5e-abaa7560dbf5', $tr$What is one way to keep a positive digital footprint?$tr$, $tr$["Think before you post", "Just post without thinking", "Share all your personal information", "Say hurtful words"]$tr$::jsonb, $tr$Digital Footprint Awareness$tr$),
('3dc5f663-d311-4c0b-b2df-d8f67b1eacaf', $tr$Why learn to make algorithms in Grade 4?$tr$, $tr$["It teaches logical thinking", "It has no use in real life", "It is only for grown-ups", "You don't need to learn it"]$tr$::jsonb, $tr$Review: Block Coding and Algorithms$tr$),
('3dd31768-c613-4254-ace3-af2b1ac51030', $tr$What is the effect of believing fake news?$tr$, $tr$["Wrong knowledge and decisions", "No effect", "Always positive", "It only makes you stronger"]$tr$::jsonb, $tr$Responsible Use of Search Engines$tr$),
('3e39eb37-b449-464c-9cd6-182b67b59b77', $tr$How do you add a new slide?$tr$, $tr$["Home, New Slide", "Layout, Margins", "File, Close", "View, Zoom"]$tr$::jsonb, $tr$Getting to Know Presentation Software$tr$),
('3efdb4ba-1290-4a6f-beea-404a8d199d76', $tr$The face in your picture looks stretched. What went wrong?$tr$, $tr$["A side handle was used, not a corner one", "The font is too small", "The theme is wrong", "There is no transition"]$tr$::jsonb, $tr$Shapes and Images in Presentations$tr$),
('3f61e1d3-3a70-46af-95d0-c5802249b34f', $tr$Put the date on the right side of the letter. Use:$tr$, $tr$["Align Right", "Center", "Align Left", "Italic"]$tr$::jsonb, $tr$Font and Text Alignment$tr$),
('3fa50906-f83c-471b-b69b-875382206015', $tr$Canva can be used for:$tr$, $tr$["desktop publishing", "calculating", "listening to music", "typing code only"]$tr$::jsonb, $tr$Introduction to Desktop Publishing$tr$),
('407221fe-a0a3-41d2-88d5-99f9fb5006c3', $tr$Why is it good to use a template?$tr$, $tr$["It saves time and gives a neat layout", "It only makes the work harder", "It is useless here", "It makes the project more difficult"]$tr$::jsonb, $tr$Creating Brochures and Flyers$tr$),
('40f3a62f-ce0b-4836-bb66-a5a5b73b63ea', $tr$Which key makes a new line?$tr$, $tr$["Enter", "Shift", "Esc", "Tab"]$tr$::jsonb, $tr$Getting to Know the Word Processor$tr$),
('419788b8-2f4f-4bdc-b089-5b54f3b99d98', $tr$Why use only one theme?$tr$, $tr$["So all the slides look the same", "To delete the slide", "To make the letters smaller", "To slow down the computer"]$tr$::jsonb, $tr$Getting to Know Presentation Software$tr$),
('425e6da5-fb67-4570-993b-49eed5bc3960', $tr$What is a slide?$tr$, $tr$["A 'page' of a presentation", "A type of sound", "Only a type of picture", "A type of document"]$tr$::jsonb, $tr$Creating Presentation Slides$tr$),
('44f062a2-3222-4676-a634-b0ebc1f0d552', $tr$Why is it important to explain the changes you made based on feedback?$tr$, $tr$["To show how we improved", "It is useless", "It is only done for a grade", "It only confuses the audience"]$tr$::jsonb, $tr$Presenting My Finished Digital Portfolio$tr$),
('45425382-ecaf-4fc7-a085-1fe10dd88b0f', $tr$Why review the skills you learned?$tr$, $tr$["To make your knowledge strong before a new project", "You don't need to review them", "It has no use", "Just to entertain the teacher"]$tr$::jsonb, $tr$Review: Presentation and Multimedia$tr$),
('461a922b-b8c8-4e7c-9619-a83c0b0521d1', $tr$You want a red edge on a circle. Use:$tr$, $tr$["Shape Outline", "Shape Fill", "Crop", "Theme"]$tr$::jsonb, $tr$Shapes and Images in Presentations$tr$),
('463879a4-f07c-4c95-8d64-12efb24d646b', $tr$Why avoid too much text on a slide?$tr$, $tr$["It will be hard to read and understand", "It has no effect", "More text is better", "It is required"]$tr$::jsonb, $tr$Review: Presentation and Multimedia$tr$),
('46aebc77-38b1-4749-8850-886b254b0704', $tr$Which everyday task can be turned into an algorithm?$tr$, $tr$["Getting ready for school", "None, tasks can't be turned into algorithms", "Something with no steps", "A random thought"]$tr$::jsonb, $tr$Review: Block Coding and Algorithms$tr$),
('46e75541-ed87-4ec7-91bf-fdc60e0147eb', $tr$What happens if you posted something negative online in the past?$tr$, $tr$["It can still be seen even if you deleted it", "It disappears right away", "It has no effect now", "It is not saved anywhere"]$tr$::jsonb, $tr$Digital Footprint Awareness$tr$),
('4887e2ed-0e7b-45a6-8740-27f44769a871', $tr$Each slide has a different color and it looks messy. What should you do?$tr$, $tr$["Use one theme", "Add a slide", "Press Esc", "Delete the title"]$tr$::jsonb, $tr$Getting to Know Presentation Software$tr$),
('49462c57-b24a-4bd4-a575-6b7876884f23', $tr$Why are kids taught to check online sources?$tr$, $tr$["To be responsible Internet users", "It has no purpose", "Just for fun", "It is not part of ICT"]$tr$::jsonb, $tr$Responsible Use of Search Engines$tr$),
('4b9ebc73-e53d-4a1e-90a8-97d18fd9b2bc', $tr$Why is the spreadsheet taught in ICT?$tr$, $tr$["To learn to organize data well", "It has no purpose", "It is only for grown-ups", "It is not related to ICT"]$tr$::jsonb, $tr$Introduction to Simple Spreadsheet Data$tr$),
('4c7dfa8e-dfd6-463b-ae1e-d03a2fe2867f', $tr$Why do we need to be careful about what we share online?$tr$, $tr$["It can stay forever even if deleted", "It has no effect", "All posts disappear right away", "It is not a real issue"]$tr$::jsonb, $tr$Digital Footprint Awareness$tr$),
('4deaf6e8-3af8-45f4-8794-b028a74a7d5b', $tr$Why is block coding taught to kids?$tr$, $tr$["To introduce the basics of logical thinking", "It has no purpose", "Just to entertain kids", "It is not related to ICT"]$tr$::jsonb, $tr$Review: Block Coding and Algorithms$tr$),
('4e27f57c-db2d-419e-85ab-34aa38158d4f', $tr$Why set up the page first before writing?$tr$, $tr$["So the document looks neat", "To make the computer faster", "To make the file disappear", "No reason"]$tr$::jsonb, $tr$Page Size, Orientation and Margin$tr$),
('4ed5e566-76bb-4503-92d5-1539a1a26013', $tr$What is a horizontal line of cells in a spreadsheet?$tr$, $tr$["Row", "Column", "Only a cell", "Only a sheet"]$tr$::jsonb, $tr$Introduction to Simple Spreadsheet Data$tr$),
('4f12a630-830f-460e-8fc7-bea32162dc53', $tr$Read two email replies to a teacher's request for permission slip forms: Reply A: "Good afternoon Ma'am, attached is my permission slip. Thank you!" Reply B: "here". Why is Reply A better email etiquette?$tr$, $tr$["It uses a polite greeting, clear message, and courteous closing appropriate for a teacher", "It is shorter, so it saves time", "It uses more exclamation points", "Reply B is actually better because it is faster"]$tr$::jsonb, $tr$Comparing tone in emails$tr$),
('50f9cf19-1a10-4e2a-a414-a965082fc0a5', $tr$You want to add a shadow to the title. Use:$tr$, $tr$["Text Effects", "Text Fill", "New Slide", "Margins"]$tr$::jsonb, $tr$Textbox and WordArt in Presentations$tr$),
('529c83b5-c16a-4743-89d0-31ac56f73c5a', $tr$Which shortcut saves your work?$tr$, $tr$["Ctrl + S", "Ctrl + Z", "Ctrl + P", "Ctrl + B"]$tr$::jsonb, $tr$Getting to Know the Word Processor$tr$),
('52c9a105-76e3-44c7-886f-b5b3d24a9caf', $tr$Why check the date it was published?$tr$, $tr$["Old information may no longer be correct", "It has no effect", "All dates are the same", "You don't need to check"]$tr$::jsonb, $tr$Responsible Use of Search Engines$tr$),
('52e168a8-d155-4d7e-a324-e02bfd49b608', $tr$Why is online security taught to kids?$tr$, $tr$["To protect themselves from dangers online", "It has no purpose", "To encourage careless use", "It is not part of ICT"]$tr$::jsonb, $tr$Review: Online Security$tr$),
('546d139b-361d-4c05-badb-cef07361f8c3', $tr$What is Justify?$tr$, $tr$["Even on both the left and right", "Only in the middle", "Lined up on the right only", "Bold letters"]$tr$::jsonb, $tr$Font and Text Alignment$tr$),
('552d63a0-cc72-4698-8073-40d30843babd', $tr$What can you make with a word processor?$tr$, $tr$["Letters and essays", "Cooking", "Singing", "Running"]$tr$::jsonb, $tr$Getting to Know the Word Processor$tr$),
('55882208-9223-48f7-8f08-163ddeecda79', $tr$Which is the longer paper?$tr$, $tr$["Legal", "A4", "Letter", "Card"]$tr$::jsonb, $tr$Page Size, Orientation and Margin$tr$),
('55f042fd-c468-4095-b982-38505c5e6aaa', $tr$A student got feedback that the text on her poster is too small. What should she do?$tr$, $tr$["Make the text bigger so it is easier to read", "Ignore the feedback and change nothing", "Remove all the text on the poster", "Close the whole project right away"]$tr$::jsonb, $tr$Editing and Improving the Digital Portfolio$tr$),
('56343b56-1e9f-411f-900b-4bc2885bbc0a', $tr$Which tab has Bold and Center?$tr$, $tr$["Home", "Layout", "Insert", "Review"]$tr$::jsonb, $tr$Font and Text Alignment$tr$),
('56977c51-d86d-4b1f-bb23-2f05c4993565', $tr$Why is it important to learn to make simple algorithms in Grade 4?$tr$, $tr$["It teaches logical, step-by-step thinking", "It has no use in real life", "It is only for grown-ups", "You don't need to learn it"]$tr$::jsonb, $tr$Review: Block Coding and Algorithms$tr$),
('569f0509-e963-400e-9c14-22760935de95', $tr$What do you call written work made in a word processor?$tr$, $tr$["Document", "Slide", "Spreadsheet", "Picture"]$tr$::jsonb, $tr$Getting to Know the Word Processor$tr$),
('56d35990-9192-4205-ab51-f0c663690255', $tr$Which software is for a report with a table?$tr$, $tr$["Spreadsheet", "Presentation", "Word processing", "Desktop publishing"]$tr$::jsonb, $tr$Review: Digital Citizenship and Software$tr$),
('57c8218b-9311-4474-977c-ef464d197d80', $tr$What is one element of a good presentation?$tr$, $tr$["Clear text", "Way too much text on one slide", "No pictures", "No organization"]$tr$::jsonb, $tr$Review: Presentation and Multimedia$tr$),
('57d92f65-eaf0-4b3d-9a11-8bffbdebe582', $tr$Why is it important to follow the correct order in an algorithm?$tr$, $tr$["To successfully solve the problem or do the task", "The order is not important", "Any order is fine", "The order has no effect"]$tr$::jsonb, $tr$Review: Block Coding and Algorithms$tr$),
('584b9082-1947-46f6-80f5-f5fd8e261e09', $tr$You want both sides of a paragraph to be even. Use:$tr$, $tr$["Justify", "Center", "Bold", "Underline"]$tr$::jsonb, $tr$Font and Text Alignment$tr$),
('59045d0b-6ac9-46ac-9042-a8043943662e', $tr$Why teach kids about digital footprints?$tr$, $tr$["To be responsible with their online presence", "No purpose", "To encourage posting without thinking", "It is not part of ICT"]$tr$::jsonb, $tr$Digital Footprint Awareness$tr$),
('595d9e56-4789-4c44-9847-614b2f529861', $tr$Why is proof important for a piece of information?$tr$, $tr$["It shows that what is said is true", "It has no importance", "Proof is no longer needed", "It is always right even without proof"]$tr$::jsonb, $tr$Responsible Use of Search Engines$tr$),
('59fdfde9-e1d0-4ae2-a756-423ed79b84a7', $tr$Why is it important to accept other people's feedback about your project?$tr$, $tr$["It helps improve the quality of the work", "It has nothing to do with the quality of the work", "You should be ashamed of it and avoid it", "You should not listen to other people's feedback"]$tr$::jsonb, $tr$Editing and Improving the Digital Portfolio$tr$),
('5aad906b-765d-46e5-8f6d-2af0e2e59c94', $tr$How do you move a textbox to another spot?$tr$, $tr$["Drag its edge", "Type it again on another slide", "Press F5", "Press Delete"]$tr$::jsonb, $tr$Textbox and WordArt in Presentations$tr$),
('5b2bbbee-d207-4d28-827a-4fcbf9fde175', $tr$The power went out and your work was lost. Which habit will help?$tr$, $tr$["Saving often", "Making the font bigger", "Using colors", "Scrolling"]$tr$::jsonb, $tr$Getting to Know the Word Processor$tr$),
('5bd57bda-f16c-418b-bf3d-18b4fc04dba5', $tr$Which is an example of data you can record in a spreadsheet?$tr$, $tr$["Expenses for one week", "A poem", "A letter", "A news story"]$tr$::jsonb, $tr$Introduction to Simple Spreadsheet Data$tr$),
('5bfa6ddb-d278-4185-899c-1653c7f791be', $tr$Why should you log out after using an account?$tr$, $tr$["So others can't get into your account", "You don't need to do it", "It has no effect", "It only slows things down"]$tr$::jsonb, $tr$Review: Online Security$tr$),
('5bfc2304-f3b0-4b12-bc47-759dacb7bf3b', $tr$What is the effect of believing fake news?$tr$, $tr$["It can lead to wrong knowledge and decisions", "It has no effect", "The result is always positive", "It only makes your knowledge stronger"]$tr$::jsonb, $tr$Responsible Use of Search Engines$tr$),
('5d9f3701-2689-46f6-aa14-05baf6435f63', $tr$How is a digital footprint connected to checking information?$tr$, $tr$["Both are part of responsible Internet use", "No connection", "One is about science", "One is about math"]$tr$::jsonb, $tr$Responsible Use of Search Engines$tr$),
('5de2ab41-e682-4a75-8169-1eeb04d664b3', $tr$You want to put words inside a star. How?$tr$, $tr$["Click the shape and type", "It is not possible", "Make a new slide", "Press F5"]$tr$::jsonb, $tr$Shapes and Images in Presentations$tr$),
('5e6efd6a-d5b0-404d-a04d-6f0f9497eabd', $tr$What should you do with a suspicious link?$tr$, $tr$["Don't click it", "Click it right away", "Share it with others", "Reply to it with personal information"]$tr$::jsonb, $tr$Review: Online Security$tr$),
('5e8791ca-1762-44ee-91ba-90a7f900f6eb', $tr$Which tab do you use to choose a theme?$tr$, $tr$["Design", "Home", "Insert", "View"]$tr$::jsonb, $tr$Getting to Know Presentation Software$tr$),
('5f085776-a61f-417d-ac2d-9224cc5d371a', $tr$You made all the text WordArt and now it looks messy. What is the advice?$tr$, $tr$["Use WordArt only for the title", "Add even more WordArt", "Make all the letters smaller", "Delete the slide"]$tr$::jsonb, $tr$Textbox and WordArt in Presentations$tr$),
('601dc06f-bbdf-4b36-83ac-c6d975b18732', $tr$Where can you see small pictures of all the slides?$tr$, $tr$["Slide pane", "Slide area", "Title bar", "Cursor"]$tr$::jsonb, $tr$Getting to Know Presentation Software$tr$),
('6164e156-eab9-4f7a-925b-95426bbc7981', $tr$What does 'process' mean in an algorithm?$tr$, $tr$["Each step that needs to be done", "Only the total result", "Only the last step", "It has no meaning"]$tr$::jsonb, $tr$Review: Block Coding and Algorithms$tr$),
('640dce99-58e8-4dd1-ae36-c1426cf0bc36', $tr$Which orientation fits a certificate?$tr$, $tr$["Landscape", "Portrait", "Standing up", "Tall"]$tr$::jsonb, $tr$Page Size, Orientation and Margin$tr$),
('646ccb17-02b3-4235-9e60-5de3d382220c', $tr$What should you answer when someone asks about a project?$tr$, $tr$["Its purpose and how you made it", "The price of the computer", "Only the class schedule", "Nothing, no need to answer"]$tr$::jsonb, $tr$Presenting My Finished Digital Portfolio$tr$),
('64f73964-564f-4c3c-96ac-bdfc15cf1aed', $tr$What is part of multimedia in a presentation?$tr$, $tr$["Photos, sound, or a short video", "Text only", "Nothing", "Numbers only"]$tr$::jsonb, $tr$Review: Presentation and Multimedia$tr$),
('653ce5e9-3f79-436c-9b7d-413568053f9c', $tr$What is WordArt?$tr$, $tr$["Colorful, fancy text", "A table", "A sound", "A slide pane"]$tr$::jsonb, $tr$Textbox and WordArt in Presentations$tr$),
('6634556c-54fa-4910-81e7-ec1b59005551', $tr$You found a nice picture online, but it is not free. What is the right thing to do?$tr$, $tr$["Look for a free picture", "Use it without asking", "Erase the owner's name", "Copy it and keep it"]$tr$::jsonb, $tr$Shapes and Images in Presentations$tr$),
('6652ad45-78a7-4dfc-9c2f-732d1c1ad6f1', $tr$What is an example of how a spreadsheet is used?$tr$, $tr$["Recording grades in a subject", "Only drawing pictures", "Watching videos", "Playing computer games"]$tr$::jsonb, $tr$Introduction to Simple Spreadsheet Data$tr$),
('66d5a241-b13b-4b40-8861-c58aa116301c', $tr$What is the difference between portrait and landscape?$tr$, $tr$["Portrait is upright, landscape is sideways", "They are the same", "Landscape is a color", "Portrait is a font"]$tr$::jsonb, $tr$Page Size, Orientation and Margin$tr$),
('67d8f48c-8100-4e6f-8d21-daa85528c3fb', $tr$Which of the following is an example of a polite greeting to open an email to a teacher?$tr$, $tr$["Good day, Ma'am/Sir,", "Hey!", "Don't ignore me, ok", "Yo dude,"]$tr$::jsonb, $tr$Greetings and tone$tr$),
('67d8ffd9-898b-476b-a1db-4c78830b4336', $tr$What is a template?$tr$, $tr$["A ready-made design you fill with your own content", "A type of font", "A shortcut", "A sound"]$tr$::jsonb, $tr$Introduction to Desktop Publishing$tr$),
('68542c45-5c9c-4a4c-8c4a-696663f77696', $tr$A matching background, colors, and fonts is called a:$tr$, $tr$["theme", "margin", "cursor", "slide pane"]$tr$::jsonb, $tr$Getting to Know Presentation Software$tr$),
('69afaa9d-2946-4668-9b6a-78d2fabd0a9c', $tr$In a template, what do you replace?$tr$, $tr$["The words and pictures, with your own content", "The whole program", "The keyboard", "Nothing"]$tr$::jsonb, $tr$Introduction to Desktop Publishing$tr$),
('69e2e030-8627-4a19-bcf3-c80ea5e425ee', $tr$What is the last step?$tr$, $tr$["Eat it", "Get the bread", "Add the filling", "Close it"]$tr$::jsonb, $tr$Review: Block Coding and Algorithms$tr$),
('6a9cd837-9dec-4747-89d4-31bc1a8cd470', $tr$What is the main lesson about digital footprints?$tr$, $tr$["Think before you post, keep it positive", "Post anything", "What you leave online doesn't matter", "There is no danger online"]$tr$::jsonb, $tr$Digital Footprint Awareness$tr$),
('6aab97b5-21fb-4b90-8aa8-0c22c7dbe3d4', $tr$What is a flowchart?$tr$, $tr$["Symbols and arrows that show a process", "Just a kind of data graph", "A kind of photo", "A kind of song"]$tr$::jsonb, $tr$Review: Block Coding and Algorithms$tr$),
('6ac7226c-891c-4678-ae69-2e4845d8981c', $tr$Why use a template?$tr$, $tr$["The design is faster and neater", "To make the file disappear", "To have no color", "So you can't print"]$tr$::jsonb, $tr$Introduction to Desktop Publishing$tr$),
('6adb548b-cdee-4a53-ab11-2f54fbbf9350', $tr$How text is lined up is called:$tr$, $tr$["alignment", "orientation", "margin", "size"]$tr$::jsonb, $tr$Font and Text Alignment$tr$),
('6ae1c998-9589-43ab-86d8-b6177d31974d', $tr$What does a 'process' mean in an algorithm?$tr$, $tr$["Each step that needs to be done", "Only the total result", "Only the last step", "A process has no meaning"]$tr$::jsonb, $tr$Review: Block Coding and Algorithms$tr$),
('6b274fb5-68d2-4020-a2ed-731cf873a090', $tr$Where can you find Text Box?$tr$, $tr$["Insert tab", "Design tab", "Layout tab", "View tab"]$tr$::jsonb, $tr$Textbox and WordArt in Presentations$tr$),
('6be13c68-10b1-4a2f-861b-11b629455771', $tr$What should you do before changing the font of a word?$tr$, $tr$["Select the text first", "Close the file", "Press Enter", "Delete the word"]$tr$::jsonb, $tr$Font and Text Alignment$tr$),
('6daa3caf-ef9e-45a7-a33f-95203266adfc', $tr$Which tab do you use to change the font size of a textbox?$tr$, $tr$["Home", "Design", "Transitions", "View"]$tr$::jsonb, $tr$Textbox and WordArt in Presentations$tr$),
('6e146cb3-905e-4c36-ae6c-b83df00c454d', $tr$Which is an example of a shape?$tr$, $tr$["Star", "Arial", "A4", "F5"]$tr$::jsonb, $tr$Shapes and Images in Presentations$tr$),
('6e861703-605a-4482-bc1c-e3520bedf3b8', $tr$What is desktop publishing used for?$tr$, $tr$["Making posters or newsletters", "Organizing data", "Typing letters", "Making slides"]$tr$::jsonb, $tr$Review: Digital Citizenship and Software$tr$),
('6ed0afdc-ad35-49e2-9138-39bfaa55a873', $tr$What is desktop publishing?$tr$, $tr$["Making professional documents", "Only making a spreadsheet", "Only playing a computer game", "Only writing an email"]$tr$::jsonb, $tr$Creating Brochures and Flyers$tr$),
('6f047174-dd65-40cb-9c11-4087801893db', $tr$Ten students received an email from their adviser asking who wants extra Math tutorials. One student clicks Reply All and writes "Me, please!" What problem does this cause, and what should the student have done instead?$tr$, $tr$["It sends an unnecessary message to all 10 people; the student should have replied only to the adviser", "There is no problem, Reply All is always correct", "It automatically deletes the adviser's email", "It sends the message as spam to the whole school"]$tr$::jsonb, $tr$Reply vs Reply All reasoning$tr$),
('71d969b2-1f0b-4cd8-ab98-ce8274f31c30', $tr$Which tab do you look in to find Margins?$tr$, $tr$["Layout", "Insert", "Home", "Design"]$tr$::jsonb, $tr$Page Size, Orientation and Margin$tr$),
('72ae8311-2cac-4807-97fa-92310eba5cb0', $tr$What is spreadsheet software used for?$tr$, $tr$["Organizing data in cells", "Only making slides", "Only typing letters", "Only drawing"]$tr$::jsonb, $tr$Review: Digital Citizenship and Software$tr$),
('73cb09da-454e-48f7-8fef-0025cbe02400', $tr$What is written in the title placeholder?$tr$, $tr$["Click to add title", "Ctrl + S", "Page 1", "DRAFT"]$tr$::jsonb, $tr$Getting to Know Presentation Software$tr$),
('73ef4a7c-58c3-4064-9792-6b37251797bf', $tr$Which software would you use to make a report with a data table?$tr$, $tr$["Spreadsheet", "Presentation only", "Word processing only", "Desktop publishing only"]$tr$::jsonb, $tr$Review: Digital Citizenship and Software$tr$),
('7491c8e5-a1ed-4b90-9de4-5e08b4ee5d99', $tr$What is the first step in the sample algorithm for making a sandwich?$tr$, $tr$["Get the bread", "Eat it", "Close the sandwich", "Add the filling"]$tr$::jsonb, $tr$Review: Block Coding and Algorithms$tr$),
('74bd669e-c684-4888-a4b2-c47a0013db34', $tr$Which of the following is an example of a flowchart symbol?$tr$, $tr$["A rectangle for a step", "A notebook", "A pencil", "Scissors"]$tr$::jsonb, $tr$Review: Block Coding and Algorithms$tr$),
('75feb35d-506c-409b-9e17-7d124c9a37fe', $tr$What is the scroll bar used for?$tr$, $tr$["Moving up or down the page", "Saving the file", "Choosing a font", "Deleting the file"]$tr$::jsonb, $tr$Getting to Know the Word Processor$tr$),
('77397f39-86f1-453e-b9e8-61109bd83681', $tr$Why is it important to check the date it was published?$tr$, $tr$["Old information may no longer be correct", "The date has no effect", "All dates matter the same", "You don't need to check it"]$tr$::jsonb, $tr$Responsible Use of Search Engines$tr$),
('77a96337-1ed9-4175-bbc6-ead9819f1a4f', $tr$Where will the next letter you type appear?$tr$, $tr$["Wherever the cursor is", "In the title bar", "In the ribbon", "In the scroll bar"]$tr$::jsonb, $tr$Getting to Know the Word Processor$tr$),
('77d3c7a7-0914-4b06-8a05-6a6b22f9bbe6', $tr$What should you include in a flyer for a school event?$tr$, $tr$["Headline, date, place, and picture", "Only one random picture", "No text, only a picture", "Only a blank page"]$tr$::jsonb, $tr$Creating Brochures and Flyers$tr$),
('782a87e5-6c8e-4f04-9570-a8b31e481702', $tr$Can you type inside a shape?$tr$, $tr$["Yes", "Never", "Only in a picture", "Only in a theme"]$tr$::jsonb, $tr$Shapes and Images in Presentations$tr$),
('78b0454d-8934-4a34-8e3e-5b2d1b340dec', $tr$What do you call a vertical line of cells in a spreadsheet?$tr$, $tr$["Column", "Row", "Only a cell", "Only a sheet"]$tr$::jsonb, $tr$Introduction to Simple Spreadsheet Data$tr$),
('78d6f9fc-a47d-49c2-b561-631cd16406a9', $tr$You want to add a picture of your school. Go to:$tr$, $tr$["Insert, Pictures", "Home, Bold", "View, Zoom", "File, Close"]$tr$::jsonb, $tr$Introduction to Desktop Publishing$tr$),
('7967d62e-e02b-4757-8e4b-14a405fc37d9', $tr$You will report to the class using slides. Which program?$tr$, $tr$["Presentation software", "Word processor only", "Calculator", "Music player"]$tr$::jsonb, $tr$Getting to Know Presentation Software$tr$),
('79e2b3e2-e412-4c0c-9cb9-001a1e579643', $tr$What should you do if you find doubtful information?$tr$, $tr$["Check it first before sharing", "Share it with everyone right away", "Believe it right away", "Ignore the warning"]$tr$::jsonb, $tr$Responsible Use of Search Engines$tr$),
('7a724e99-917d-4b5c-b586-0626caabae48', $tr$What should you do after getting feedback on a project?$tr$, $tr$["Make changes based on the feedback", "Just forget the feedback you got", "Close the project right away", "Submit it right away even with no changes"]$tr$::jsonb, $tr$Editing and Improving the Digital Portfolio$tr$),
('7a9db4c0-e7f8-43ce-8beb-b83f60954c67', $tr$What is part of a digital footprint?$tr$, $tr$["Photos, messages, comments online", "Only things at home", "Cooking tools", "Only toys"]$tr$::jsonb, $tr$Digital Footprint Awareness$tr$),
('7ab2345b-e2e8-484a-870e-4e7adbca7dba', $tr$Why is it important for a project to have a clear layout?$tr$, $tr$["So it is easy to read and understand", "Only so it is hard to read", "It has nothing to do with reading", "Only to make the file bigger"]$tr$::jsonb, $tr$Editing and Improving the Digital Portfolio$tr$),
('7b242d8d-38e2-4c68-a7ef-9b97a7ab278f', $tr$What is the blinking line that shows where a letter will appear?$tr$, $tr$["Cursor", "Ribbon", "Tab", "Margin"]$tr$::jsonb, $tr$Getting to Know the Word Processor$tr$),
('7bae443c-8f97-466f-b250-0109c3058a7f', $tr$What happens if you don't follow the correct order in an algorithm?$tr$, $tr$["The task may not succeed", "The result will still always be right", "It has no effect on the result", "The result will be even faster"]$tr$::jsonb, $tr$Review: Block Coding and Algorithms$tr$),
('7c5b8058-7dd3-49ef-9045-efafc000f9dd', $tr$Why is good posture important?$tr$, $tr$["To avoid body pain", "It has no effect", "You don't need to think about it", "It is only for grown-ups"]$tr$::jsonb, $tr$Review: Digital Citizenship and Software$tr$),
('7cfcad80-fb83-448d-8ad8-a3c0355fcc01', $tr$What can you do with data organized in a spreadsheet?$tr$, $tr$["Make a table or line graph", "Nothing can be done with it", "Just forget it", "Hide it forever"]$tr$::jsonb, $tr$Introduction to Simple Spreadsheet Data$tr$),
('7d7575e0-98b6-4e62-a836-13a972e6c1e7', $tr$You need one more slide. Go to:$tr$, $tr$["Home, New Slide", "Design, Themes", "View, Zoom", "Layout, Size"]$tr$::jsonb, $tr$Getting to Know Presentation Software$tr$),
('7ea12b66-832e-4f5c-b9b0-ff91c21617c8', $tr$How is a digital footprint connected to checking information online?$tr$, $tr$["Both are part of using the Internet responsibly", "The two have no connection", "One is only about science", "One is only about math"]$tr$::jsonb, $tr$Responsible Use of Search Engines$tr$),
('7eac2d5d-ed90-4a85-9f6f-6487a282f863', $tr$Your teacher sent an important announcement to the whole class mailing list. Which is the MOST mindful way to thank her?$tr$, $tr$["Reply only to the teacher with a short thank-you message", "Reply All with a long personal story", "Send a separate email to every classmate individually", "Forward it to relatives who are not part of the class"]$tr$::jsonb, $tr$Being mindful of recipients$tr$),
('7ebef175-e932-4220-98c8-c978912bc88a', $tr$You used ten colors and five fonts. What is the advice?$tr$, $tr$["Keep it simple so it is easy to read", "Add even more colors", "Make the letters smaller", "Delete the title"]$tr$::jsonb, $tr$Font and Text Alignment$tr$),
('7ed24010-c71d-406f-b983-a1fec40c4ccb', $tr$Which alignment is usual for a paragraph?$tr$, $tr$["Align Left", "Center", "Align Right", "Upside down"]$tr$::jsonb, $tr$Font and Text Alignment$tr$),
('7f5f3c2f-54a9-4273-a9db-a26342a72f6a', $tr$What is the main lesson about online security?$tr$, $tr$["Be careful and protect your information", "Share everything", "You don't need to be careful", "There is no danger online"]$tr$::jsonb, $tr$Review: Online Security$tr$),
('7f665fa9-d9c2-4e7f-ba70-ddcaa6ada086', $tr$Why should the font in a brochure be clear?$tr$, $tr$["So the information is easy to read", "Only so it looks nicer", "So the work gets done fast", "There is no reason"]$tr$::jsonb, $tr$Creating Brochures and Flyers$tr$),
('802d4e71-a7f6-4cb9-8fec-884f7ba6189c', $tr$Which command is for a fancy title?$tr$, $tr$["WordArt", "Margins", "Save", "Esc"]$tr$::jsonb, $tr$Introduction to Desktop Publishing$tr$),
('809e43b9-472b-4e30-ae9e-c8cd117a884e', $tr$There is not enough space on the page for the text. Which margin should you try?$tr$, $tr$["Narrow", "Wide", "Bigger", "No change"]$tr$::jsonb, $tr$Page Size, Orientation and Margin$tr$),
('809edf70-d1c9-4951-81ac-538299d15c2e', $tr$Why teach checking online sources?$tr$, $tr$["To be responsible Internet users", "No purpose", "Just for fun", "It is not part of ICT"]$tr$::jsonb, $tr$Responsible Use of Search Engines$tr$),
('80aa4e02-4728-407e-a243-7d4bd697943e', $tr$You want an important word to look thicker. Use:$tr$, $tr$["Bold", "Italic", "Center", "Justify"]$tr$::jsonb, $tr$Font and Text Alignment$tr$),
('8176696f-bdb2-444d-8285-a3747bc5e9de', $tr$Where are tabs like Home and Insert?$tr$, $tr$["On the Ribbon", "On the Scroll bar", "On the Cursor", "In the Document area"]$tr$::jsonb, $tr$Getting to Know the Word Processor$tr$),
('8196fe8d-c6ac-421c-bf02-9faea3a14717', $tr$What is the last step after the design?$tr$, $tr$["Save and print", "Delete the template", "Close without saving", "Change the language"]$tr$::jsonb, $tr$Introduction to Desktop Publishing$tr$),
('83ec7084-a4f7-4b61-b40a-1ada587d7254', $tr$Which command lets you write anywhere?$tr$, $tr$["Text Box", "Theme", "Crop", "F5"]$tr$::jsonb, $tr$Introduction to Desktop Publishing$tr$),
('866bd61b-f6e6-4c4f-abed-520f013cd0cf', $tr$Which is easy to read?$tr$, $tr$["Black letters on white paper", "Yellow letters on white paper", "White letters on white paper", "Gray on gray"]$tr$::jsonb, $tr$Font and Text Alignment$tr$),
('8844c93a-9d8d-4649-9132-e13287776678', $tr$What is digital citizenship?$tr$, $tr$["Using technology responsibly and safely", "Using the computer carelessly", "Sharing all information online", "Having no rules on the Internet"]$tr$::jsonb, $tr$Review: Digital Citizenship and Software$tr$),
('89c18474-e21c-45ed-86b7-694f715e65e2', $tr$Where do you write where a picture came from?$tr$, $tr$["Below the picture or on the last slide", "It is not needed", "In a different file", "In the teacher's name"]$tr$::jsonb, $tr$Shapes and Images in Presentations$tr$),
('8a30f65c-8cd3-4a9d-9fe8-f8889f5ee351', $tr$What is an example of how a spreadsheet is used?$tr$, $tr$["Recording grades", "Only drawing", "Watching videos", "Playing games"]$tr$::jsonb, $tr$Introduction to Simple Spreadsheet Data$tr$),
('8a6f0354-f00f-4a2c-996f-7bcff687c989', $tr$Which should you NOT do in a presentation?$tr$, $tr$["Put way too much text", "Use fitting pictures", "Keep the message clear", "Use only a few transitions"]$tr$::jsonb, $tr$Review: Presentation and Multimedia$tr$),
('8b7ef734-a699-4bc5-a1e9-161a49b90668', $tr$Why is it important to review your own project?$tr$, $tr$["It helps you find what needs to be improved", "It is useless for the project", "It only makes the work harder", "It is only done for a grade"]$tr$::jsonb, $tr$Editing and Improving the Digital Portfolio$tr$),
('8e0cc51d-83b3-4074-9a70-31e469156055', $tr$Which software would you use to present in front of the class?$tr$, $tr$["Presentation", "Spreadsheet only", "Word processing only", "Desktop publishing only"]$tr$::jsonb, $tr$Review: Digital Citizenship and Software$tr$),
('8e27ed4b-cf3a-478f-a188-9abf047d1077', $tr$What happens if a slide has too much text?$tr$, $tr$["The audience will find it hard to read", "It will be clearer", "No effect", "It will be easier to understand"]$tr$::jsonb, $tr$Review: Presentation and Multimedia$tr$),
('8f7c4d6e-c16c-4c1b-8142-dcf850efae4a', $tr$What should you include in the contact info of a flyer?$tr$, $tr$["A way to get in touch", "The color of your clothes", "The price of the paper", "The type of printer"]$tr$::jsonb, $tr$Creating Brochures and Flyers$tr$),
('8fb6179c-6a09-42b7-804b-d3f147c19fb2', $tr$Why use slides when giving a report?$tr$, $tr$["So the listeners understand better", "So you don't have to talk anymore", "To make the report longer", "No reason"]$tr$::jsonb, $tr$Getting to Know Presentation Software$tr$),
('90920e5a-dc07-406e-8129-2326c3cf42b5', $tr$Why focus on one clear message per slide?$tr$, $tr$["So the audience doesn't get confused", "It is not important", "As long as there is lots of information, it's okay", "It doesn't matter"]$tr$::jsonb, $tr$Review: Presentation and Multimedia$tr$),
('92f42c65-b0eb-48e2-afff-4f3673a7c2d3', $tr$The title should be bigger than the text. What will you change?$tr$, $tr$["Font size", "Margin", "Orientation", "Page size"]$tr$::jsonb, $tr$Font and Text Alignment$tr$),
('9360097b-b483-40ab-b570-f58fb0469875', $tr$Why should you think before posting anything online?$tr$, $tr$["A post can affect your reputation in the future", "Posting has no consequences", "Once it's said, it's done", "Thinking doesn't matter"]$tr$::jsonb, $tr$Digital Footprint Awareness$tr$),
('94eff35a-19d0-485d-bf73-6ccf70effe9b', $tr$You want the flyer's title to stand out. Use:$tr$, $tr$["WordArt", "Margins", "Undo", "Esc"]$tr$::jsonb, $tr$Introduction to Desktop Publishing$tr$),
('95f672eb-c88b-4e65-90a2-7a54219cf1e6', $tr$Why shouldn't you share your password?$tr$, $tr$["It can be used to get into your account", "It is safe to share", "You must share it", "There is no danger"]$tr$::jsonb, $tr$Review: Online Security$tr$),
('975ad09c-d509-4cfe-86d1-815ccb00e26a', $tr$Which is an example of Text Effects?$tr$, $tr$["Shadow and glow", "Page size", "Margin", "Orientation"]$tr$::jsonb, $tr$Textbox and WordArt in Presentations$tr$),
('99f64c51-b525-4f52-8739-dc81deb9ab34', $tr$Google Docs is a:$tr$, $tr$["word processor", "game", "spreadsheet", "music player"]$tr$::jsonb, $tr$Getting to Know the Word Processor$tr$),
('9a7e7812-4c5d-404a-ac58-142b9be09765', $tr$What do you call the place where a row and a column meet?$tr$, $tr$["Cell", "Sheet", "Tab", "Formula"]$tr$::jsonb, $tr$Introduction to Simple Spreadsheet Data$tr$),
('9b9cfe1d-d3e9-486f-b556-ab4eb43f2527', $tr$Why are kids taught about digital footprints?$tr$, $tr$["To be responsible with their online presence", "It has no purpose", "To encourage them to post without thinking", "It is not part of ICT"]$tr$::jsonb, $tr$Digital Footprint Awareness$tr$),
('9bd6fc7a-35a6-4a9d-9bee-5fa07be740aa', $tr$Why is it important to learn to take care of your digital footprint from a young age?$tr$, $tr$["To be responsible with your online presence as you grow up", "You don't need to learn it", "It is only for grown-ups", "It has no effect"]$tr$::jsonb, $tr$Digital Footprint Awareness$tr$),
('9cb90303-a52b-446a-aebf-39f1af966ee3', $tr$Why is it important to make different kinds of documents in ICT?$tr$, $tr$["To learn to choose the right tool for each task", "Only to make it hard for the student", "It is useless", "It is only done for fun"]$tr$::jsonb, $tr$Presenting My Finished Digital Portfolio$tr$),
('9e5a8676-c4cb-4496-abed-8e6ae8eee53d', $tr$Your poster is done. What should you do?$tr$, $tr$["Save and print", "Delete it right away", "Close without saving", "Change everything"]$tr$::jsonb, $tr$Introduction to Desktop Publishing$tr$),
('9ee06e1f-6832-4b09-9cf3-5608dad342b1', $tr$Which shortcut makes text bold?$tr$, $tr$["Ctrl + B", "Ctrl + I", "Ctrl + U", "Ctrl + S"]$tr$::jsonb, $tr$Font and Text Alignment$tr$),
('9efa27b0-77fe-4045-8719-c11151081ddd', $tr$What is an example of a phishing message?$tr$, $tr$["An email that suddenly asks for your password", "A normal news story", "A letter from your teacher", "An offer of a free book"]$tr$::jsonb, $tr$Review: Online Security$tr$),
('9fa2a006-7e00-4ae5-a539-aed55daa857e', $tr$What is a tri-fold reading material called?$tr$, $tr$["Brochure", "Flyer", "Poster", "Letter"]$tr$::jsonb, $tr$Creating Brochures and Flyers$tr$),
('a27c738c-0987-4938-9b81-ddcaf9b2f311', $tr$What is desktop publishing used for?$tr$, $tr$["Making posters or newsletters", "Only organizing data", "Only typing letters", "Only making slides"]$tr$::jsonb, $tr$Review: Digital Citizenship and Software$tr$),
('a3d25c2b-44d5-49f5-9e72-cb092e3d210f', $tr$Why teach block coding?$tr$, $tr$["To introduce logical thinking", "No purpose", "Just to entertain kids", "It is not related to ICT"]$tr$::jsonb, $tr$Review: Block Coding and Algorithms$tr$),
('a4ea3d6e-9fcf-4a8f-97e0-459f48713566', $tr$Why organize data?$tr$, $tr$["It is easier to check and understand", "It has no importance", "It only gets messier", "It is not used in real life"]$tr$::jsonb, $tr$Introduction to Simple Spreadsheet Data$tr$),
('a50a603c-16a4-489b-a245-aa9905759804', $tr$What is the headline on a flyer?$tr$, $tr$["Big text at the top", "Small text at the bottom", "Only a picture", "Only a contact number"]$tr$::jsonb, $tr$Creating Brochures and Flyers$tr$),
('a5a5ec61-3524-47ae-ba34-597f90768937', $tr$You want a smooth effect when moving from slide 1 to slide 2. What will you use?$tr$, $tr$["Slide transition", "Animation only", "Audio only", "Video only"]$tr$::jsonb, $tr$Creating Presentation Slides$tr$),
('a6d2fb0d-4e9c-45b8-88b7-d07bad24c968', $tr$Why is it important to save often?$tr$, $tr$["So your work doesn't get lost", "To make the letters bigger", "To make the colors nicer", "To make the internet faster"]$tr$::jsonb, $tr$Getting to Know the Word Processor$tr$),
('a72591e8-e635-4683-9875-b10a7b76f8f8', $tr$Which is an example of a font type?$tr$, $tr$["Arial", "Bold", "Center", "A4"]$tr$::jsonb, $tr$Font and Text Alignment$tr$),
('a8476313-29a1-4dc8-9d87-25f4c9c6c162', $tr$The textbox is too small and the words don't fit. What should you do?$tr$, $tr$["Drag the handles to make it bigger", "Press Esc", "Change the theme", "Close the file"]$tr$::jsonb, $tr$Textbox and WordArt in Presentations$tr$),
('a8afbb45-1577-401e-a966-1a1823856b47', $tr$Why learn to use a spreadsheet in Grade 4?$tr$, $tr$["It is a basic skill for organizing", "You don't need to learn it", "It is only for grown-ups", "It has no use"]$tr$::jsonb, $tr$Introduction to Simple Spreadsheet Data$tr$),
('a952a11f-1e4a-45d7-91e6-08a76b6e2565', $tr$Which closing line is most appropriate for an email to your school principal?$tr$, $tr$["Respectfully yours, Juan Dela Cruz, Grade 5", "maybe later", "bye bye take care hope u dont get mad", "k thanks"]$tr$::jsonb, $tr$Signature conventions$tr$),
('a9fcd6e5-e288-491b-add7-ad2829ef0ac2', $tr$The picture has an extra part you don't want. Use:$tr$, $tr$["Crop", "Shape Fill", "New Slide", "Esc"]$tr$::jsonb, $tr$Shapes and Images in Presentations$tr$),
('aa454a18-785f-4a78-9472-f83050b2ac42', $tr$Which shortcut underlines text?$tr$, $tr$["Ctrl + U", "Ctrl + B", "Ctrl + I", "Ctrl + A"]$tr$::jsonb, $tr$Font and Text Alignment$tr$),
('aa54c169-785f-4148-a536-b8448af0ab96', $tr$What is landscape orientation?$tr$, $tr$["Paper turned sideways and wide", "Paper standing up and tall", "Paper with no margin", "Paper with color"]$tr$::jsonb, $tr$Page Size, Orientation and Margin$tr$),
('aaffbed4-11e2-40f6-a888-1cf9b7f14337', $tr$Where can you see the file name?$tr$, $tr$["Title bar", "Scroll bar", "Document area", "Cursor"]$tr$::jsonb, $tr$Getting to Know the Word Processor$tr$),
('abd7245b-5e9b-4d44-b5c1-ba1a762bb99e', $tr$Where is Pictures?$tr$, $tr$["Insert tab", "Design tab", "Home tab", "Slide Show tab"]$tr$::jsonb, $tr$Shapes and Images in Presentations$tr$),
('ac003840-aa7e-4ef6-b49a-166288af34d7', $tr$Which shortcut undoes a mistake?$tr$, $tr$["Ctrl + Z", "Ctrl + S", "Ctrl + C", "Ctrl + A"]$tr$::jsonb, $tr$Getting to Know the Word Processor$tr$),
('adfa8c47-906a-427e-9a70-07f040af87a3', $tr$Why should you avoid too much text on a slide?$tr$, $tr$["The audience will find it hard to read and understand", "It has no effect", "More text is better", "Too much text is required"]$tr$::jsonb, $tr$Review: Presentation and Multimedia$tr$),
('ae349366-b257-43f7-88e8-1d3dfecb58cd', $tr$What does reviewing and improving a project show?$tr$, $tr$["Professionalism and hard work", "Being careless with the work", "Having no interest in the project", "Only a lack of time"]$tr$::jsonb, $tr$Editing and Improving the Digital Portfolio$tr$),
('af63636c-3a5d-41f3-b721-4052718be8dc', $tr$Which margin setting gives more space for text?$tr$, $tr$["Narrow", "Wide", "Large", "Double"]$tr$::jsonb, $tr$Page Size, Orientation and Margin$tr$),
('afb28849-0dc7-4e9b-8415-b6eef6ddaf06', $tr$Who is responsible for keeping a positive digital footprint?$tr$, $tr$["Each one of us", "Only the computer", "Only the internet provider", "No one"]$tr$::jsonb, $tr$Digital Footprint Awareness$tr$),
('b15c06a0-3765-43ef-a3be-1103ad2be381', $tr$What skill can you mention about the presentation?$tr$, $tr$["Animation and slide transitions", "Only cooking", "Only farming", "Only sewing here"]$tr$::jsonb, $tr$Presenting My Finished Digital Portfolio$tr$),
('b328ef87-4baf-473e-bfae-5893f7c78d4f', $tr$What is a slide transition?$tr$, $tr$["An effect when moving from one slide to the next", "Text moving inside a slide", "An embedded sound", "The background color"]$tr$::jsonb, $tr$Creating Presentation Slides$tr$),
('b505ff53-ad0a-4a74-8b35-4df105edab30', $tr$Ctrl + U is for:$tr$, $tr$["underline", "bold", "italic", "save"]$tr$::jsonb, $tr$Font and Text Alignment$tr$),
('b52ac665-383a-45ab-9f29-7f71df566700', $tr$What is a textbox?$tr$, $tr$["A box you can write in anywhere on the slide", "A kind of theme", "A picture", "A transition"]$tr$::jsonb, $tr$Textbox and WordArt in Presentations$tr$),
('b63ec533-e86f-48e7-abe5-9b76c714e6ab', $tr$Who is responsible for a positive digital footprint?$tr$, $tr$["Each one of us", "Only the computer", "Only the internet provider", "No one"]$tr$::jsonb, $tr$Digital Footprint Awareness$tr$),
('b68e6a0b-acb0-4441-b46c-9139bd8019f7', $tr$How do you make a textbox bigger?$tr$, $tr$["Drag the handles", "Press F5", "Press Esc", "Change the theme"]$tr$::jsonb, $tr$Textbox and WordArt in Presentations$tr$),
('b6e3fcca-52c1-4f4f-a8a1-dc164001c816', $tr$Where are the commands that are grouped into tabs?$tr$, $tr$["Ribbon", "Title bar", "Scroll bar", "Cursor"]$tr$::jsonb, $tr$Getting to Know the Word Processor$tr$),
('b6f2b864-b6d3-45a9-9eab-017ba289a092', $tr$A teacher emails the class: "Please email me your project topics by Friday." Which student response best follows email etiquette from greeting to closing?$tr$, $tr$["'Good day, Ma'am, my project topic is about recycling. Thank you very much. - Maria, Grade 5'", "'my topic recycling'", "Replying All with just the topic and no greeting", "Not replying because the deadline is still far"]$tr$::jsonb, $tr$Applying full etiquette conventions$tr$),
('b76f8c11-acc2-4670-b7d2-0c0b7b9d8e0f', $tr$Which task can become an algorithm?$tr$, $tr$["Getting ready for school", "Nothing can be made into an algorithm", "Something with no steps", "A random thought"]$tr$::jsonb, $tr$Review: Block Coding and Algorithms$tr$),
('b7ff5747-ff16-4fcc-8b74-4101c9fb2b2a', $tr$What is word processing used for?$tr$, $tr$["Typing and formatting documents", "Organizing in cells", "Making slides", "Drawing only"]$tr$::jsonb, $tr$Review: Digital Citizenship and Software$tr$),
('bad5bb9e-a740-490e-8ad5-f71b83d85ac4', $tr$What is a margin?$tr$, $tr$["The blank space around the page", "The file name", "The font color", "A picture on the page"]$tr$::jsonb, $tr$Page Size, Orientation and Margin$tr$),
('badcb73e-6451-4d40-a360-0b09cc57eb70', $tr$Yellow letters on white paper are hard to read. What is better?$tr$, $tr$["Black or a dark color", "A lighter yellow", "White letters", "Gray letters"]$tr$::jsonb, $tr$Font and Text Alignment$tr$),
('baedf7ba-d9f5-4b0b-bdfc-ac189c7253cc', $tr$Which tab do you use to change the font?$tr$, $tr$["Home", "Layout", "Insert", "View"]$tr$::jsonb, $tr$Font and Text Alignment$tr$),
('baf7936b-b75d-4ebb-a30b-074ecd5600e2', $tr$What does checking if the pictures fit the content make sure of?$tr$, $tr$["That the pictures are relevant to the project", "The price of the pictures", "Only the file size", "The number of letters used"]$tr$::jsonb, $tr$Editing and Improving the Digital Portfolio$tr$),
('bc0e3d82-b4e5-41df-a5aa-099ba9c9f1cd', $tr$What does checking the spelling and grammar in a project make sure of?$tr$, $tr$["That the project looks professional", "How fast the project gets finished", "The price of the project", "Only the file size"]$tr$::jsonb, $tr$Editing and Improving the Digital Portfolio$tr$),
('bc6689d1-7728-4cc8-93c9-7f733770eda8', $tr$Where are Text Box and WordArt?$tr$, $tr$["Insert tab", "Home tab", "Design tab", "View tab"]$tr$::jsonb, $tr$Textbox and WordArt in Presentations$tr$),
('bdce4afd-c0a2-4636-a3c8-9306ee70eb9e', $tr$Why shouldn't you share your password?$tr$, $tr$["It can be used to get into your account", "It is safe to share", "You must share it with friends", "There is no danger in it"]$tr$::jsonb, $tr$Review: Online Security$tr$),
('be15c903-30e3-4e6f-a879-c142b732a7e0', $tr$Which pictures can you use?$tr$, $tr$["Your own pictures or ones free to use", "Any picture without asking", "A picture with the owner's name erased", "Someone else's picture with no credit"]$tr$::jsonb, $tr$Shapes and Images in Presentations$tr$),
('be581f40-40da-4e53-83b3-beadb8ffee98', $tr$What is an example of a change you can make after reviewing?$tr$, $tr$["Changing the font or adding a picture", "Deleting the whole project", "Closing the program without saving", "Only writing a new name"]$tr$::jsonb, $tr$Editing and Improving the Digital Portfolio$tr$),
('be7a536c-facb-47c1-83ef-5996cc993da5', $tr$What is fake news?$tr$, $tr$["False information that spreads online", "Only true news", "A kind of game", "An official document"]$tr$::jsonb, $tr$Responsible Use of Search Engines$tr$),
('be91292b-8619-4d46-abca-560432873081', $tr$You want to write a letter on the computer. Which program?$tr$, $tr$["Word processor", "Calculator", "Music player", "Web browser only"]$tr$::jsonb, $tr$Getting to Know the Word Processor$tr$),
('bf72ff5c-4341-4aab-9916-5be4b5663549', $tr$Which layout is for the first slide?$tr$, $tr$["Title Slide", "Blank", "Two Content", "Comparison"]$tr$::jsonb, $tr$Getting to Know Presentation Software$tr$),
('bfb05094-8a0d-4d56-b42f-e4f923871fb9', $tr$What is the main lesson about digital footprints?$tr$, $tr$["Think before you post and keep your online presence positive", "Just post anything", "What you leave online doesn't matter", "There is no danger on the Internet"]$tr$::jsonb, $tr$Digital Footprint Awareness$tr$),
('bfc241d0-0bc9-41bc-ad30-b82fc5d83f3c', $tr$What skill can you mention about the brochure?$tr$, $tr$["Layout and page design", "Only cooking", "Only sewing", "Only farming"]$tr$::jsonb, $tr$Presenting My Finished Digital Portfolio$tr$),
('c242b2f8-3cdd-4736-be7e-0b4f1e3d1d09', $tr$What is animation in a presentation?$tr$, $tr$["Text or pictures moving on a slide", "Moving from one slide to another", "An embedded sound", "An embedded video"]$tr$::jsonb, $tr$Creating Presentation Slides$tr$),
('c264c18b-0b5c-42a1-a81b-9ed0aa886ff2', $tr$What is Shape Fill?$tr$, $tr$["The color inside the shape", "The edge of the shape", "The slide size", "The file name"]$tr$::jsonb, $tr$Shapes and Images in Presentations$tr$),
('c310dea2-47ee-485f-9057-d6a9caa227e4', $tr$What is an example of an animation effect?$tr$, $tr$["Fade In", "Push", "Wipe", "Common Time"]$tr$::jsonb, $tr$Creating Presentation Slides$tr$),
('c4233200-cd87-4113-8451-1abf655160cc', $tr$What should you do after typing an important report?$tr$, $tr$["Save it", "Delete it", "Close it without saving", "Forget it"]$tr$::jsonb, $tr$Getting to Know the Word Processor$tr$),
('c5af72ed-46c6-49fc-93cc-091666902947', $tr$Why should you not use too much animation?$tr$, $tr$["It can distract from the message", "It is faster to make", "There is no reason", "It always looks better"]$tr$::jsonb, $tr$Creating Presentation Slides$tr$),
('c6f49227-6bc1-4368-97bd-3e10014bb3ee', $tr$What is a word processor?$tr$, $tr$["A program for writing documents", "A program only for drawing", "A program for watching videos", "A program for playing games"]$tr$::jsonb, $tr$Getting to Know the Word Processor$tr$),
('c78fd4d9-e465-43f5-a59c-7037b10606db', $tr$What is the place where a row and column meet called?$tr$, $tr$["Cell", "Sheet", "Tab", "Formula"]$tr$::jsonb, $tr$Introduction to Simple Spreadsheet Data$tr$),
('c7f14a2a-5bea-449e-bc0c-00792cdcd2ca', $tr$Which software is for presenting to the class?$tr$, $tr$["Presentation", "Spreadsheet", "Word processing", "Desktop publishing"]$tr$::jsonb, $tr$Review: Digital Citizenship and Software$tr$),
('c8504dac-5833-4dbe-ac66-aac80942ceca', $tr$What is desktop publishing?$tr$, $tr$["Making documents with designs", "Playing on the computer", "Calculating numbers", "Listening to music"]$tr$::jsonb, $tr$Introduction to Desktop Publishing$tr$),
('c87a5481-374f-4f12-8225-dadde01a31ca', $tr$Where do you edit the slide you are working on?$tr$, $tr$["Slide area", "Slide pane", "Status bar", "Title bar"]$tr$::jsonb, $tr$Getting to Know Presentation Software$tr$),
('ca295dd1-931b-4a1c-9971-d15af020d2ee', $tr$What will we do with our portfolio this week?$tr$, $tr$["Show it to the class", "Delete it", "Forget it", "Just close the program"]$tr$::jsonb, $tr$Presenting My Finished Digital Portfolio$tr$),
('ca40b07a-7d71-4579-b123-f0d4ee64431c', $tr$Which text is the easiest to read?$tr$, $tr$["A clear font and a dark color", "Lots of effects and colors", "Very small letters", "Light yellow on white"]$tr$::jsonb, $tr$Textbox and WordArt in Presentations$tr$),
('cb0ad360-080b-4290-8259-537a1dc4bf04', $tr$What is made with desktop publishing?$tr$, $tr$["Posters and flyers", "A spreadsheet of grades", "Songs", "Videos"]$tr$::jsonb, $tr$Introduction to Desktop Publishing$tr$),
('cc172209-9919-4900-9e35-8d60aba58a93', $tr$The font doesn't change even after you press Bold. What is missing?$tr$, $tr$["You didn't select the text", "The margin is wrong", "The paper is landscape", "There is no internet"]$tr$::jsonb, $tr$Font and Text Alignment$tr$),
('cc9ed2dd-5417-43b4-a6cc-751b3a1b2148', $tr$What is presentation software used for?$tr$, $tr$["Making slides", "Only typing documents", "Organizing data in cells", "Drawing only"]$tr$::jsonb, $tr$Review: Digital Citizenship and Software$tr$),
('cd2f39cf-f75e-445d-a69e-889ae3f1ee62', $tr$Why use only a few transitions?$tr$, $tr$["To avoid making it distracting", "To make it messier", "It is not important", "Many are required"]$tr$::jsonb, $tr$Review: Presentation and Multimedia$tr$),
('ce0e9538-c73a-4d4d-9157-724fb80df939', $tr$Why is good posture important while using a computer?$tr$, $tr$["It helps prevent body pain", "Posture has no effect", "You don't need to think about it", "It is only for grown-ups"]$tr$::jsonb, $tr$Review: Digital Citizenship and Software$tr$),
('ce475811-f4c1-4661-afc9-616f0b898e7b', $tr$You want the title in the middle. Which button?$tr$, $tr$["Center", "Align Left", "Align Right", "Bold only"]$tr$::jsonb, $tr$Font and Text Alignment$tr$),
('cf063b56-87da-4b8b-b075-28f22efcfd08', $tr$You want each point in a list to appear one at a time. What will you use?$tr$, $tr$["Animation", "Slide transition only", "Audio only", "Video only"]$tr$::jsonb, $tr$Creating Presentation Slides$tr$),
('d063f0db-a655-4d4a-881f-72c030d3a81f', $tr$What should you put on a poster for an event?$tr$, $tr$["Title, date, and place", "All your Math lessons", "Your password", "Nothing"]$tr$::jsonb, $tr$Introduction to Desktop Publishing$tr$),
('d099272c-cd82-4aab-b31d-5d80d77a3a2d', $tr$Times New Roman is a:$tr$, $tr$["font type", "font size", "alignment", "orientation"]$tr$::jsonb, $tr$Font and Text Alignment$tr$),
('d25e97e3-8c4f-4318-85bf-5dbc430a4721', $tr$Where do you choose a slide transition effect?$tr$, $tr$["Transitions tab", "Animations tab", "Insert tab only", "File tab"]$tr$::jsonb, $tr$Creating Presentation Slides$tr$),
('d2715573-0092-4dd3-8d66-adc646e645d6', $tr$A4, Letter, and Legal are examples of:$tr$, $tr$["page size", "orientation", "font", "color"]$tr$::jsonb, $tr$Page Size, Orientation and Margin$tr$),
('d2feb3b7-a25e-4926-a278-b02033a72de4', $tr$What makes a strong password?$tr$, $tr$["A mix of letters, numbers, symbols", "Just a name", "Just numbers", "One word"]$tr$::jsonb, $tr$Review: Online Security$tr$),
('d33568c5-e92e-43f2-bdb7-e49d926afcac', $tr$Why teach online security?$tr$, $tr$["To protect you from dangers online", "No purpose", "To encourage careless use", "It is not part of ICT"]$tr$::jsonb, $tr$Review: Online Security$tr$),
('d43638c2-bc61-45d6-ab13-5e41f81a53d3', $tr$What should you think about when choosing audio or video?$tr$, $tr$["It should be related to the topic", "It should be the longest one", "It should just be random", "It should not be related to the topic"]$tr$::jsonb, $tr$Creating Presentation Slides$tr$),
('d47ab1aa-cc34-4448-b697-2a26a3356b5c', $tr$Where do you add audio or video?$tr$, $tr$["Insert tab", "Animations tab", "Transitions tab", "Design tab only"]$tr$::jsonb, $tr$Creating Presentation Slides$tr$),
('d5237b44-0d58-47ea-950b-df8ccbaa2cb2', $tr$Why teach presentations in ICT?$tr$, $tr$["To learn to share ideas with others", "No purpose", "It is only for grown-ups", "It is not related to ICT"]$tr$::jsonb, $tr$Review: Presentation and Multimedia$tr$),
('d5642b77-c808-4b39-a14b-538132c8d3cb', $tr$What should you do if you get a suspicious message?$tr$, $tr$["Tell a parent or teacher", "Reply right away", "Share it with everyone", "Just ignore it"]$tr$::jsonb, $tr$Review: Online Security$tr$),
('d5a84eb9-94e3-41b8-ab96-c38751e438e7', $tr$What is a benefit of using a spreadsheet instead of just paper?$tr$, $tr$["It is easier to organize, change, and turn data into a graph", "No benefit", "It is harder to use", "It cannot be changed"]$tr$::jsonb, $tr$Introduction to Simple Spreadsheet Data$tr$),
('d5d7a6e5-7fb0-4edd-9087-43ddb765eb0a', $tr$What should you do with a suspicious link?$tr$, $tr$["Don't click it", "Click it right away", "Share it with others", "Reply to it"]$tr$::jsonb, $tr$Review: Online Security$tr$),
('d69584c5-c2cc-46ec-b6a3-4304dff90279', $tr$Your report is done. How do you stop the slide show?$tr$, $tr$["Press Esc", "Press F5", "Turn off the computer", "Press Enter"]$tr$::jsonb, $tr$Getting to Know Presentation Software$tr$),
('d78a65c6-3d55-4728-b8f3-32ba49a09211', $tr$What should you say about the purpose of each project?$tr$, $tr$["Why it was made that way", "Only the price of the computer", "Only the starting time", "Nothing, no need to explain"]$tr$::jsonb, $tr$Presenting My Finished Digital Portfolio$tr$),
('d7db32a1-1eab-4753-a6dc-e0a8a7443b44', $tr$Which tab has Themes?$tr$, $tr$["Design", "Home", "Insert", "Slide Show"]$tr$::jsonb, $tr$Getting to Know Presentation Software$tr$),
('d840ff3c-9f30-4e06-86f1-b53267c54547', $tr$What is the right way to make a picture smaller?$tr$, $tr$["Drag a corner handle inward", "Delete it and start over", "Change the theme", "Crop everything"]$tr$::jsonb, $tr$Shapes and Images in Presentations$tr$),
('d84a8b55-b243-44df-8be5-dcbb1a28b850', $tr$Why is it important to show the whole process of each project, not just the result?$tr$, $tr$["It shows your growth and know-how in making it", "The process is never important", "Only the result matters", "It gives no benefit to the presentation"]$tr$::jsonb, $tr$Presenting My Finished Digital Portfolio$tr$),
('d8b0a89f-ca5f-4554-a124-ba2f65badf88', $tr$Where can you find Orientation?$tr$, $tr$["Layout tab", "Insert tab", "Home tab", "Review tab"]$tr$::jsonb, $tr$Page Size, Orientation and Margin$tr$),
('d8b1b008-168c-4222-aae6-0b60177bb612', $tr$What should you do with a suspicious message?$tr$, $tr$["Tell a parent or teacher", "Reply right away", "Share it with everyone", "Ignore it"]$tr$::jsonb, $tr$Review: Online Security$tr$),
('d96a689e-735c-46a9-9b86-1b9065742917', $tr$Why do we use a flowchart?$tr$, $tr$["It is a picture that shows a process", "It has no use", "Only for pictures", "It is not used in ICT"]$tr$::jsonb, $tr$Review: Block Coding and Algorithms$tr$),
('d97b0926-4935-4af8-baea-913c3d34d713', $tr$Where can you find Pictures and Shapes?$tr$, $tr$["Insert tab", "Design tab", "Home tab", "View tab"]$tr$::jsonb, $tr$Shapes and Images in Presentations$tr$),
('d9e3a4a7-5ba5-45bf-aa3f-d60fc3f7961c', $tr$What is word processing used for?$tr$, $tr$["Typing and formatting documents", "Organizing data in cells", "Making slides", "Drawing only"]$tr$::jsonb, $tr$Review: Digital Citizenship and Software$tr$),
('dc1d5273-4e09-436f-8fcf-8a133c93535a', $tr$How do you move to the bottom part of a long document?$tr$, $tr$["Use the scroll bar", "Press Ctrl + S", "Close the file", "Press Esc"]$tr$::jsonb, $tr$Getting to Know the Word Processor$tr$),
('ddb7f677-6dcf-4765-81fe-b38fc83a5223', $tr$Where do you put the design?$tr$, $tr$["Page area", "Title bar", "Status bar", "Taskbar"]$tr$::jsonb, $tr$Introduction to Desktop Publishing$tr$),
('de7d59eb-8b94-4f10-8fd8-17f481496051', $tr$What is an example of a flowchart symbol?$tr$, $tr$["A rectangle for a step", "Notebook", "Pencil", "Scissors"]$tr$::jsonb, $tr$Review: Block Coding and Algorithms$tr$),
('ded96cde-b719-448a-b464-bf57f2017c7d', $tr$Why are pictures important in a presentation?$tr$, $tr$["They help with understanding", "They replace talking", "They make the report longer", "They have no use"]$tr$::jsonb, $tr$Shapes and Images in Presentations$tr$),
('dfcaf8c7-62c0-4f1d-bf04-2193998305b9', $tr$What is part of online safety?$tr$, $tr$["Keep personal information private", "Share your password", "Answer everyone", "Stop being careful"]$tr$::jsonb, $tr$Review: Digital Citizenship and Software$tr$),
('e0048ae3-e354-4224-863f-cf78c4f92368', $tr$What is Crop?$tr$, $tr$["Removing parts of a picture you don't need", "Coloring a picture", "Copying a slide", "Saving a file"]$tr$::jsonb, $tr$Shapes and Images in Presentations$tr$),
('e3eb4714-3a89-41e6-8939-34a209fc2c9d', $tr$How do you make a picture bigger without stretching it?$tr$, $tr$["Drag a corner handle", "Drag only the side", "Press F5", "Change the theme"]$tr$::jsonb, $tr$Shapes and Images in Presentations$tr$),
('e44e0f26-c485-4b5b-a2d2-15b9f6aaad8d', $tr$Compare two emails: Email A says "Hi, just a reminder that the project deadline is tomorrow. - Teacher Rose" from a known school email. Email B says "URGENT!!! Your account will be DELETED unless you click this link and enter your password NOW!" Which is more likely phishing, and why?$tr$, $tr$["Email B, because it uses urgency, threats, and asks for a password", "Email A, because it mentions a deadline", "Both are phishing because they are both emails", "Neither is phishing since both use exclamation marks"]$tr$::jsonb, $tr$Comparing phishing indicators$tr$),
('e4941921-d0e1-4d03-9229-e358934be134', $tr$Why not share personal information?$tr$, $tr$["People with bad intentions can use it", "It is always safe to do", "You are required to", "There is no danger"]$tr$::jsonb, $tr$Review: Digital Citizenship and Software$tr$),
('e4f0ffa4-7929-4ac3-b257-6b86b555956e', $tr$You want the title to be colorful and eye-catching. Use:$tr$, $tr$["WordArt", "Margin", "Slide pane", "Esc"]$tr$::jsonb, $tr$Textbox and WordArt in Presentations$tr$),
('e4fdfab9-b42c-4295-87af-163488284dd5', $tr$You want to make the inside of a box blue. Use:$tr$, $tr$["Shape Fill", "Shape Outline", "Crop", "Text Box"]$tr$::jsonb, $tr$Shapes and Images in Presentations$tr$),
('e5c79150-85d0-4219-8351-97439e4e9bdc', $tr$Where do you choose an animation effect?$tr$, $tr$["Animations tab", "Transitions tab", "Insert tab only", "File tab"]$tr$::jsonb, $tr$Creating Presentation Slides$tr$),
('e6a2e0b4-66fe-4884-9d2f-4495a907bf08', $tr$Why shouldn't you share personal information online?$tr$, $tr$["People with bad intentions may use it", "It is always safe to do", "You are required to do it", "There is no danger in it"]$tr$::jsonb, $tr$Review: Digital Citizenship and Software$tr$),
('e7ee40ca-2160-4ebf-9a42-a50b0fecc179', $tr$Which greeting-and-closing pair best fits a formal email to your school's guidance counselor?$tr$, $tr$["'Good day, Ma'am' ... 'Respectfully yours'", "'Hey!' ... 'Okay, let's go'", "no greeting ... no closing", "'Yo!' ... 'Peace out'"]$tr$::jsonb, $tr$Greetings and tone$tr$),
('e8800033-d578-47bf-a940-41aeaa090a59', $tr$What is a search engine?$tr$, $tr$["It helps you find information on the Internet using keywords", "A kind of game", "A kind of computer", "A kind of printer"]$tr$::jsonb, $tr$Responsible Use of Search Engines$tr$),
('e94b2bd4-746a-453f-9f08-6420cb9afa95', $tr$Why is it important to know who wrote an article online?$tr$, $tr$["It helps you tell if the information can be trusted", "It has nothing to do with the truth", "You don't need to know it", "All authors are always the same"]$tr$::jsonb, $tr$Responsible Use of Search Engines$tr$),
('ea4d6a20-96c5-402c-bd11-e17d614e943b', $tr$A flyer is used to:$tr$, $tr$["give an announcement or information", "calculate", "listen to music", "play games"]$tr$::jsonb, $tr$Introduction to Desktop Publishing$tr$),
('ea8fc8a8-2803-41d6-93ef-bde82b04a350', $tr$Your teacher emailed the whole class about a project. You only have a question for the teacher, not the whole class. What should you do?$tr$, $tr$["Click Reply (not Reply All) and send your question only to the teacher", "Click Reply All so everyone can see your question", "Ignore the email completely", "Forward the email to your group of friends"]$tr$::jsonb, $tr$Reply vs Reply All$tr$),
('eb4180e5-27de-42df-81f2-724c3dec72f0', $tr$Which shape shows direction?$tr$, $tr$["Arrow", "Circle", "Star", "Heart"]$tr$::jsonb, $tr$Shapes and Images in Presentations$tr$),
('ebb9300f-c543-4ff3-91a3-b299dfce6cfb', $tr$Which one is presentation software?$tr$, $tr$["PowerPoint", "Calculator", "Notepad", "Music player"]$tr$::jsonb, $tr$Getting to Know Presentation Software$tr$),
('ebbe0ddc-27b8-4d8f-971c-078163a02739', $tr$Why shouldn't you use too many fonts?$tr$, $tr$["The document becomes messy", "The computer gets faster", "The paper gets bigger", "The file disappears"]$tr$::jsonb, $tr$Font and Text Alignment$tr$),
('ec787896-a978-4d05-90ef-4c41d2b80831', $tr$How do sound or video help a presentation?$tr$, $tr$["They make the presentation more interesting and fun to watch", "They don't help", "They only make it harder to make", "They are not needed"]$tr$::jsonb, $tr$Review: Presentation and Multimedia$tr$),
('eeec8639-9bf7-4b44-a596-e4be210d3b2b', $tr$What is Shape Outline?$tr$, $tr$["The color of the shape's edge", "The color inside the shape", "A type of font", "The number of slides"]$tr$::jsonb, $tr$Shapes and Images in Presentations$tr$),
('ef17ae13-a023-4613-a8bd-d0ece8c05cef', $tr$How is a spreadsheet connected to Math?$tr$, $tr$["The data can be used to make graphs", "No connection", "Math does not use data", "It has nothing to do with graphs"]$tr$::jsonb, $tr$Introduction to Simple Spreadsheet Data$tr$),
('efdb1a69-98f8-4e59-bfa0-fbea86dbd592', $tr$Your poster is missing the date and place. What will you add?$tr$, $tr$["A Text Box with the date and place", "A new theme", "A smaller title", "A new file"]$tr$::jsonb, $tr$Introduction to Desktop Publishing$tr$),
('f00dea44-59c1-4829-a1bb-701e60750d59', $tr$What makes a password strong?$tr$, $tr$["A mix of letters, numbers, and symbols", "Just a name", "Just numbers", "Just one word"]$tr$::jsonb, $tr$Review: Online Security$tr$),
('f062821b-47bd-4bec-aed7-d6121827b4ae', $tr$Why is a template good for beginners?$tr$, $tr$["The colors and fonts are already set up nicely", "You don't have to think anymore", "It has no use", "It slows down your work"]$tr$::jsonb, $tr$Introduction to Desktop Publishing$tr$),
('f0deff38-0c0f-4934-b93c-658808af09ac', $tr$Why learn to spot phishing?$tr$, $tr$["So you don't get tricked", "It has no use", "It is not a real danger", "It is not related to online safety"]$tr$::jsonb, $tr$Review: Online Security$tr$),
('f0fae79b-621b-4955-b67f-d58602d6268e', $tr$Why should a brochure be kept simple?$tr$, $tr$["So the reader does not get confused", "So it takes longer to make", "So the text is longer", "There is no reason"]$tr$::jsonb, $tr$Creating Brochures and Flyers$tr$),
('f14f1633-ea98-41ba-b123-b061c11d9195', $tr$What can you do with data in a spreadsheet?$tr$, $tr$["Make a table or graph", "Nothing can be done with it", "Just forget it", "Hide it"]$tr$::jsonb, $tr$Introduction to Simple Spreadsheet Data$tr$),
('f194d681-64bc-4315-b5db-1f7f83b1c1e0', $tr$Which margin is usually used?$tr$, $tr$["Normal", "None", "Very wide", "Upside down"]$tr$::jsonb, $tr$Page Size, Orientation and Margin$tr$),
('f2ba13e7-173f-40ee-9a4c-a157b9c17397', $tr$What is the first step in making a poster with a template?$tr$, $tr$["Choose a poster template", "Print it right away", "Delete everything", "Close the program"]$tr$::jsonb, $tr$Introduction to Desktop Publishing$tr$),
('f432d10e-e360-46c5-bef8-aa9e6362cdc2', $tr$The blank part around the page is called the:$tr$, $tr$["margin", "font", "cursor", "ribbon"]$tr$::jsonb, $tr$Page Size, Orientation and Margin$tr$),
('f464eebd-a903-4f8f-b63f-94f4c34f9601', $tr$Why think before you post?$tr$, $tr$["It can affect your reputation in the future", "There are no consequences", "Once it's said, it's done", "It doesn't matter"]$tr$::jsonb, $tr$Digital Footprint Awareness$tr$),
('f4a901b0-c4aa-47c0-8b1f-bef06728082b', $tr$Which tab do you use to set the page size and margin?$tr$, $tr$["Layout", "Insert", "Home", "View"]$tr$::jsonb, $tr$Page Size, Orientation and Margin$tr$),
('f51329d9-1d4a-426e-9a96-14f1d1243f26', $tr$Which orientation fits a letter?$tr$, $tr$["Portrait", "Landscape", "Banner", "Lying sideways"]$tr$::jsonb, $tr$Page Size, Orientation and Margin$tr$),
('f55bb2dd-9131-4907-b95b-264bcc2940e5', $tr$Why is it important to review the skills you learned in ICT?$tr$, $tr$["To make your knowledge strong before learning something new", "You don't need to review them", "It has no use", "Just to entertain the teacher"]$tr$::jsonb, $tr$Review: Digital Citizenship and Software$tr$),
('f58428ea-4092-4a39-9c39-e33cec89413e', $tr$You want to change the color inside the WordArt letters. Use:$tr$, $tr$["Text Fill", "Text Outline", "Theme", "Layout"]$tr$::jsonb, $tr$Textbox and WordArt in Presentations$tr$),
('f5a90576-a6dd-4607-b7b8-6a890b9bd708', $tr$The edge or outline of the letters is changed with:$tr$, $tr$["Text Outline", "Text Fill", "Font size", "Theme"]$tr$::jsonb, $tr$Textbox and WordArt in Presentations$tr$),
('f85d87c4-cb83-4209-9287-9078190cfc6a', $tr$Why use fitting pictures in a presentation?$tr$, $tr$["They support the message", "Pictures have no use", "They only make it messier", "Pictures are not needed"]$tr$::jsonb, $tr$Review: Presentation and Multimedia$tr$),
('f8aab302-8abf-4d88-a1ea-ca761419b51a', $tr$How do you move a textbox?$tr$, $tr$["Drag the edge of the box", "Press Esc", "Delete it and start over", "Change the theme"]$tr$::jsonb, $tr$Textbox and WordArt in Presentations$tr$),
('f8d74c2f-adeb-44a8-9f0c-526d794f3401', $tr$What happens if the order is wrong?$tr$, $tr$["The task may not succeed", "It will always be right", "No effect", "The result is faster"]$tr$::jsonb, $tr$Review: Block Coding and Algorithms$tr$),
('fa65d236-9c15-4722-856a-9ccb09795de3', $tr$Why teach spreadsheets in ICT?$tr$, $tr$["To learn to organize data", "No purpose", "It is only for grown-ups", "It is not related to ICT"]$tr$::jsonb, $tr$Introduction to Simple Spreadsheet Data$tr$),
('fabf5c29-c1ef-42ba-87d8-566f192c589b', $tr$What is the main lesson about online security?$tr$, $tr$["Be careful and protect your personal information", "Share all your information", "You don't need to be careful", "There is no danger online"]$tr$::jsonb, $tr$Review: Online Security$tr$),
('fad47e58-648e-4402-b1e4-a1b2b6739758', $tr$What font size is usual for text?$tr$, $tr$["12", "2", "72", "100"]$tr$::jsonb, $tr$Font and Text Alignment$tr$),
('fae161aa-b7b2-448d-af96-7f44a9c08b65', $tr$What is the usual paper size in school?$tr$, $tr$["A4", "Legal only", "Poster", "Card"]$tr$::jsonb, $tr$Page Size, Orientation and Margin$tr$),
('fbaf4730-7563-4166-b3aa-c7b550c5b191', $tr$What happens if there is too much text on one slide?$tr$, $tr$["The audience will find it hard to read and understand", "It will be clearer", "No effect", "It will be easier to understand"]$tr$::jsonb, $tr$Review: Presentation and Multimedia$tr$),
('fc0d0bfd-c640-493c-ad4a-c3645bc13d36', $tr$Why log out after using an account?$tr$, $tr$["So others can't get in", "You don't need to", "No effect", "It only slows things down"]$tr$::jsonb, $tr$Review: Online Security$tr$),
('fc429336-a9aa-4faa-af1d-cb86712763c0', $tr$What is a spreadsheet?$tr$, $tr$["A program with a grid of rows and columns", "A kind of game", "A kind of photo", "A kind of song"]$tr$::jsonb, $tr$Introduction to Simple Spreadsheet Data$tr$),
('fc633b14-686a-4c1d-8262-f4cab19945fa', $tr$Why is a flowchart used to plan a task?$tr$, $tr$["It gives a picture of the process", "It has no use", "It is only used for pictures", "It is not used in ICT"]$tr$::jsonb, $tr$Review: Block Coding and Algorithms$tr$),
('fd3c7fe3-319f-45ad-b0a8-92f832fa10d5', $tr$What is portrait orientation?$tr$, $tr$["Paper standing up and tall", "Paper turned sideways and wide", "Round paper", "Small paper"]$tr$::jsonb, $tr$Page Size, Orientation and Margin$tr$),
('fee80e84-a47f-4601-ab00-a6a6f1202f46', $tr$What do you call a horizontal line of cells in a spreadsheet?$tr$, $tr$["Row", "Column", "Only a cell", "Only a sheet"]$tr$::jsonb, $tr$Introduction to Simple Spreadsheet Data$tr$),
('ff12f1ca-87be-4eab-bdb0-8be2fdcf0aa3', $tr$Google Slides is a:$tr$, $tr$["presentation software", "word processor", "spreadsheet", "game"]$tr$::jsonb, $tr$Getting to Know Presentation Software$tr$),
('ffaa96dd-4b60-4d4b-8981-2ec2e5717f3f', $tr$What three documents did we make this term?$tr$, $tr$["Word document, presentation, and brochure", "Only one spreadsheet", "Only one email here", "Only one video now"]$tr$::jsonb, $tr$Presenting My Finished Digital Portfolio$tr$),
('ffe829e2-1025-4253-819b-4c1b5a756abe', $tr$Why watch your screen time?$tr$, $tr$["Too much can be bad for your health", "No effect", "It is always good", "You don't need to watch it"]$tr$::jsonb, $tr$Review: Digital Citizenship and Software$tr$);

insert into _ict_draft_summary values
('493532d6-93f9-4c50-8e07-627d08000072', $tr$## Email Etiquette: Being Polite and Professional Online

- **Email etiquette** is the set of polite manners and unwritten rules for writing emails — it helps your message sound respectful and clear, especially to teachers, elders, or people you don't know well.
- Every polite email usually has three parts: a **greeting** (e.g., "Good day, Ma'am/Sir,"), the **message body** written in a calm and clear tone, and a **closing/signature** (e.g., "Respectfully yours, Juan Dela Cruz, Grade 5").
- Using a **professional tone** means avoiding ALL CAPS (which can look like shouting), too many exclamation points, or slang — even when you're in a hurry or annoyed.
- **Reply** sends your message only to the original sender, while **Reply All** sends it to everyone who received the email. Example: if your teacher emails the whole class and you only have a personal question, use **Reply**, not Reply All, so you don't bother 30 classmates with a message meant for one person.
- Being **mindful of recipients** also means double-checking the To/Cc list before sending, so a private message (like a birthday invite) doesn't accidentally go to people it wasn't meant for.

| Situation | Reply | Reply All |
|---|---|---|
| Personal question to teacher | Correct choice | Bothers everyone |
| Group project update for the whole team | Sometimes too limited | Correct choice |

- Good etiquette shows respect for the reader's time and feelings — a well-mannered email leaves a good impression, just like greeting someone politely in person.$tr$);

do $$
declare
  v_bad int;
begin
  select count(*) into v_bad
  from _ict_question t join public.content_questions cq on cq.id = t.id
  where jsonb_array_length(cq.options) <> jsonb_array_length(t.options)
     or not exists (select 1 from jsonb_array_elements_text(cq.options) o where o = cq.correct_answer);
  if v_bad > 0 then
    raise exception 'EPP (ICT) translation: % main-quest question(s) do not line up with their translation', v_bad;
  end if;

  select count(*) into v_bad
  from _ict_boss t join public.draft_questions dq on dq.id = t.id
  where jsonb_array_length(dq.options) <> jsonb_array_length(t.options)
     or not exists (select 1 from jsonb_array_elements_text(dq.options) o where o = dq.correct_answer);
  if v_bad > 0 then
    raise exception 'EPP (ICT) translation: % boss question(s) do not line up with their translation', v_bad;
  end if;
end $$;

update public.content_quizzes cq
set summary_markdown = t.summary_markdown
from _ict_quiz t
where cq.id = t.id and cq.subject = 'EPP (ICT)';

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
from _ict_question t
where cq.id = t.id
  and exists (select 1 from public.content_quizzes z where z.id = cq.content_quiz_id and z.subject = 'EPP (ICT)');

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
from _ict_boss t
where dq.id = t.id and dq.subject = 'EPP (ICT)';

update public.draft_summaries ds
set summary_markdown = t.summary_markdown
from _ict_draft_summary t
where ds.id = t.id and ds.subject = 'EPP (ICT)';

drop table if exists _ict_quiz, _ict_question, _ict_boss, _ict_draft_summary;
