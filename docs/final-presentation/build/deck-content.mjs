export const deckContent = [
  {
    number: 1,
    title: 'Just Speak It',
    subtitle: 'Turn your own words into English you can speak.',
    kicker: 'FINAL PROJECT · MOBILE APP',
    notes: `こんにちは。私の最終プロジェクトは、Just Speak Itです。自分が言いたいことを、話せる英語に変えるアプリです。\n\n[English]\nHello. My final project is Just Speak It. It turns what you want to say into English you can practice.\n\n[Sources]\n- README.md\n- docs/design/app-icon/app-icon-speak-card-v3.png`,
  },
  {
    number: 2,
    title: 'Textbook English is not always what you want to say',
    statement:
      'Learners can memorize useful sentences and still struggle to express their own day, opinions, and experiences.',
    tensions: ['What I study', 'What I want to say', 'How I keep practicing'],
    notes: `英語の例文を覚えても、自分の一日や気持ちを英語で言うのは難しいです。このアプリは、その差を小さくするために作りました。\n\n[English]\nEven if we study English sentences, it can be hard to talk about our own day or feelings. I made this app to make that easier.\n\n[Sources]\n- README.md\n- docs/redesign-proposal.md`,
  },
  {
    number: 3,
    title: 'Speak first. Practice what matters to you.',
    userStory:
      'As an English learner, I want to speak or write about my day in Japanese, so I can practice English based on what I actually want to say.',
    needs: [
      'Create material without writing English first',
      'Review it again when it is due',
      'Keep the original thought as a personal note',
    ],
    notes: `利用者は、まず日本語で自由に話すか書きます。英語を先に考えなくても、自分が本当に言いたいことを練習できます。\n\n[English]\nFirst, the user speaks or writes freely in Japanese. They do not need to think in English first. They can practice what they really want to say.\n\n[Sources]\n- README.md\n- docs/redesign-proposal.md`,
  },
  {
    number: 4,
    title: 'One Japanese thought becomes a reusable speaking exercise',
    steps: [
      'Speak or write',
      'Transcribe & clean',
      'Split into ideas',
      'Translate',
      'Save',
      'Review',
    ],
    japaneseExample:
      '今日は授業のあと、友達とカフェで新しいプロジェクトについて話した。',
    englishExamples: [
      'I went to a café with a friend after class.',
      'We talked about a new project.',
    ],
    notes: `日本語で話した内容を、アプリが短く分けて英語にします。作った文は保存されるので、あとで何度も練習できます。\n\n[English]\nThe app divides the Japanese message into short parts and changes it into English. The sentences are saved, so the user can practice them again later.\n\n[Sources]\n- README.md\n- features/capture/capture-screen.tsx\n- docs/redesign-proposal.md`,
  },
  {
    number: 5,
    title: 'The main flow stays focused from capture to cards',
    stages: ['CAPTURE', 'GENERATE', 'PRACTICE'],
    notes: `使い方は簡単です。日本語で話す、カードができる、英語で練習する。この3つが中心です。\n\n[English]\nThe flow is simple. Speak in Japanese, make cards, and practice in English. These are the three main steps.\n\n[Sources]\n- features/capture/capture-screen.tsx\n- features/capture/draft-card-list.tsx`,
  },
  {
    number: 6,
    title: 'Capture, remember, practice, and customize',
    surfaces: [
      { label: 'HOME', description: 'Speak, write, and review due cards' },
      { label: 'NOTES', description: 'Revisit entries and local recordings' },
      { label: 'PHRASES', description: 'Browse saved Japanese–English cards' },
      { label: 'CUSTOM', description: 'Choose how cards are created and stored' },
    ],
    notes: `Homeで話してカードを作ります。Notesで元の内容を見返し、Phrasesで英語表現を確認します。Settingsでは、カードの作り方や見た目を選べます。\n\n[English]\nOn Home, users speak and make cards. In Notes, they can see the original message. In Phrases, they can check the English. In Settings, they can choose how the cards look and work.\n\n[Sources]\n- app/(tabs)/_layout.tsx\n- features/diary/diary-screen.tsx\n- features/cards/cards-screen.tsx\n- features/settings/settings-screen.tsx`,
  },
  {
    number: 7,
    title: 'Two decisions keep practice fast and repeatable',
    decisions: [
      { label: 'Again', english: 'Again', description: 'Bring the phrase back sooner' },
      { label: 'Got it', english: 'Got it', description: 'Increase the review interval' },
    ],
    support: ['Undo accidental decisions', 'Queue results locally until synchronized'],
    notes: `練習では、言えなければAgain、言えたらGot itを押します。選ぶのはこの2つだけなので、短い時間でも続けやすいです。\n\n[English]\nDuring practice, tap Again if you cannot say it. Tap Got it if you can. There are only two choices, so practice is quick and easy.\n\n[Sources]\n- features/review/slack-flashcard-lab.tsx\n- features/review/review-deck.tsx\n- shared/api/review-outbox.ts\n- packages/core/src/srs.ts`,
  },
  {
    number: 8,
    title: 'AI transforms the content without becoming the product',
    system: [
      'Expo mobile app captures the input',
      'Supabase Edge Function authenticates and coordinates writes',
      'OpenAI transcribes, cleans, splits, and translates',
      'PostgreSQL stores entries, cards, reviews, and usage events',
    ],
    privacy: 'Original audio is not persisted in cloud storage. Optional copies stay on device.',
    notes: `アプリの裏側では、話した内容をAIが整理して、英語カードにします。結果は自分の記録として保存されます。元の音声はインターネット上には保存しません。\n\n[English]\nBehind the app, AI organizes what the user said and makes English cards. The result is saved in the user's account. The original audio is not saved online.\n\n[Sources]\n- docs/architecture/just-speak-it-low-level-overview.png\n- docs/architecture/README.md\n- supabase/functions/api/index.ts\n- supabase/migrations/20260731043000_rebuild_schema_v3.sql`,
  },
  {
    number: 9,
    title: 'Reliability is part of the user experience',
    engineering: [
      ['State machine', 'Predictable capture and generation states'],
      ['Shared contracts', 'The app and API agree on every request and response'],
      ['Idempotency', 'A retry does not create duplicate AI work'],
      ['Review events + outbox', 'Decisions and undo survive temporary failures'],
      ['RLS + API gateway', 'Each user sees only their own data'],
    ],
    notes: `安心して使えるように、通信が途切れても、練習結果をあとから送れるようにしました。同じカードが何度も作られないことや、ほかの人の記録が見えないことも大切にしています。\n\n[English]\nThe app can save practice results even if the internet stops for a short time. It also avoids making the same card twice and keeps each user's data private.\n\n[Sources]\n- features/capture/capture-state.ts\n- packages/contract/src/index.ts\n- shared/api/client.ts\n- shared/api/review-outbox.ts\n- supabase/functions/api/index.ts\n- supabase/migrations/20260731043000_rebuild_schema_v3.sql`,
  },
  {
    number: 10,
    title: 'Now, one thought becomes something I can practice',
    demoSteps: [
      'Speak a short Japanese thought',
      'Watch it become English cards',
      'Open a card and review it',
    ],
    closing: 'Your life becomes your English practice.',
    notes: `ここから、実際にアプリを使います。日本語で短く話して、英語カードができるところと、そのカードを練習するところを見せます。\n\n[English]\nNow I will show you the app. I will speak a short sentence in Japanese, make English cards, and practice one card.\n\n[Sources]\n- README.md\n- features/capture/capture-screen.tsx\n- features/review/review-deck.tsx`,
  },
  {
    number: 11,
    appendix: true,
    title: 'The core flow, end to end',
    stages: ['Speak', 'Transcribe', 'Generate English cards', 'Review'],
    notes: `これは、最初から最後までの流れを1枚にまとめたものです。話す、英語カードを作る、練習する、という流れです。\n\n[English]\nThis slide shows the full flow. Speak, make English cards, and practice them.\n\n[Sources]\n- features/capture/capture-screen.tsx\n- features/capture/draft-card-list.tsx\n- features/cards/cards-screen.tsx\n- features/review/review-deck.tsx`,
  },
  {
    number: 12,
    appendix: true,
    title: 'How requests move through the system',
    notes: `この図は、スマホから送った内容が、英語カードとして戻るまでの流れです。必要な情報だけを安全に処理し、カードと練習の記録を保存します。\n\n[English]\nThis diagram shows how information moves through the app. It safely processes the message, then saves the cards and practice results.\n\n[Sources]\n- docs/architecture/just-speak-it-low-level-overview.png\n- docs/architecture/README.md`,
  },
];
