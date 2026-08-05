# Just Speak It Presentation Script

## Slide 1 — Just Speak It

### Short script (existing)

Hello. My final project is Just Speak It. It turns what you want to say into English you can practice.

### Detailed script in simple English

The line under the title means that the app turns your own words into English you can speak. Just Speak It does not start with textbook examples. It starts with something you thought about or experienced today. Your own life becomes your English practice. Today, I will explain why I made the app, how people use it, and how it works behind the screen.

## Slide 2 — The problem

### Short script (existing)

Even if we study English sentences, it can be hard to talk about our own day or feelings. I made this app to make that easier.

### Detailed script in simple English

This slide shows three parts of the problem. On the left are prepared examples from textbooks. They are useful, but they are not always personal. In the middle are the things I really want to say, such as my day, my opinions, and my experiences. On the right is the need to practice those words again later. The problem is not that learners do not study. The problem is that the English they study is often separate from their own life.

## Slide 3 — What the user wants to do

### Short script (existing)

First, the user speaks or writes freely in Japanese. They do not need to think in English first. They can practice what they really want to say.

### Detailed script in simple English

To solve this problem, I used this user story to design the app. First, the user speaks or writes about their day in Japanese. The three points on the right are important. First, the user can make practice material without writing English. Second, the app brings the phrase back when it is time to review it. Third, the original Japanese thought stays as a personal note. These three points connect English practice to the user's real life.

## Slide 4 — Making the cards

### Short script (existing)

The app divides the Japanese message into short parts and changes it into English. The sentences are saved, so the user can practice them again later.

### Detailed script in simple English

This slide shows how one Japanese thought becomes practice cards. In step one, the user speaks or writes in Japanese. In step two, the app turns the audio into text and cleans the text. In step three, it divides the message into short ideas that are easy to say. In step four, it translates them into natural English. In step five, it saves them as phrases and notes. In step six, the user reviews them over time. At the bottom, one long Japanese sentence becomes two short English sentences.

## Slide 5 — The main flow

### Short script (existing)

The flow is simple. Speak in Japanese, make cards, and practice in English. These are the three main steps.

### Detailed script in simple English

Now, look at the four screens from left to right. On the first screen, the user taps Speak it. On the second screen, the user speaks in Japanese. After the user stops, the third screen shows that the app is making the cards. The finished Japanese and English phrases appear on the fourth screen. The main flow has only three parts: capture the idea, generate the cards, and practice them.

## Slide 6 — The four screens

### Short script (existing)

On Home, users speak and make cards. In Notes, they can see the original message. In Phrases, they can check the English. In Settings, they can choose how the cards look and work.

### Detailed script in simple English

The app has four main areas. On Home, users speak or write in Japanese, make cards, and review cards that are due. In Notes, they can see the original Japanese, the cleaned text, and a short bullet-point version. In Phrases, they can see the saved Japanese and English cards. In Settings, they can choose how the app divides their ideas and what kind of English it creates. For example, they can choose natural English or simple English.

## Slide 7 — Practice

### Short script (existing)

During practice, tap Again if you cannot say it. Tap Got it if you can. There are only two choices, so practice is quick and easy.

### Detailed script in simple English

During review, the user first sees the Japanese phrase and tries to say it in English. If the user can say it, they tap the green Got it button. If it is difficult, they tap the red Again button. Again brings the phrase back sooner. Got it makes the review time longer, as shown by the 3, 7, 14, 30, and 60 day bars. Undo fixes an accidental tap. If the internet is not available, the app keeps the result on the phone and sends it later.

## Slide 8 — Behind the app

### Short script (existing)

Behind the app, AI organizes what the user said and makes English cards. The result is saved in the user's account. The original audio is not saved online.

### Detailed script in simple English

This diagram moves from left to right. The Expo app on the left receives the user's voice or text. The Supabase Edge Function in the middle checks who the user is and handles the request safely. The OpenAI API on the right turns speech into text, cleans the text, divides it into short ideas, and translates it. PostgreSQL stores the notes, cards, and review results. The original audio is not saved in the cloud. It stays on the phone only if the user chooses to save it. AI helps with the process, but the main product is the practice loop.

## Slide 9 — Making the app reliable

### Short script (existing)

The app can save practice results even if the internet stops for a short time. It also avoids making the same card twice and keeps each user's data private.

### Detailed script in simple English

This slide shows six ways the app stays reliable. The State Machine keeps track of states such as recording and making cards. Zod Contracts check that the app and the API use the same data format. TanStack Query keeps the data on each screen up to date. Idempotency stops the app from doing the same AI work twice after a retry. The Local Outbox keeps review results and Undo actions when the connection fails, and sends them later. RLS makes sure each user can only see their own data.

## Slide 10 — Demo

### Short script (existing)

Now I will show you the app. I will speak a short sentence in Japanese, make English cards, and practice one card.

### Detailed script in simple English

Now I will show the app. I will follow the three steps on this slide. First, I will say a short thought in Japanese on the Home screen. Next, we will watch the app turn it into English cards. Finally, I will open one card, try to say the English answer, and choose Got it or Again. This demo shows how a small part of daily life can become English practice.

## Slide 11 — The full flow

### Short script (existing)

This slide shows the full flow. Speak, make English cards, and practice them.

### Detailed script in simple English

If the live demo has a problem, this slide shows the same flow. From left to right, step one is speaking. Step two turns the audio into text. Step three organizes the message and makes the cards. Step four shows the finished cards. In step five, the user looks at the Japanese, says the English answer, and chooses a result. The full path from input to review is connected in one flow.

## Slide 12 — How information moves

### Short script (existing)

This diagram shows how information moves through the app. It safely processes the message, then saves the cards and practice results.

### Detailed script in simple English

This detailed diagram has three areas: the phone on the left, Supabase in the middle, and OpenAI on the right. For writing data, the app sends a request through the API client. Supabase checks the login information and the data format. Then it uses OpenAI to turn audio into text and to create the English cards. The results are saved in PostgreSQL. For reading data, PostgREST and RLS make sure the user only gets their own information. Review and Undo actions also go through the Edge Function. Audio files are not saved in the database or cloud storage. They stay on the phone only when the user turns that option on.
