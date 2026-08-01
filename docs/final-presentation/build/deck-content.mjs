export const deckContent = [
  {
    number: 1,
    title: 'Just Speak It',
    subtitle: 'Turn your own words into English you can speak.',
    kicker: 'FINAL PROJECT · MOBILE APP',
    notes: `Just Speak It is a mobile app for practicing the English you personally want to say. Instead of starting with textbook sentences, the learner starts with a real thought from their own day. The app turns that thought into short English cards that can be reviewed again later.\n\n[Sources]\n- README.md\n- docs/design/app-icon/app-icon-speak-card-v3.png`,
  },
  {
    number: 2,
    title: 'Textbook English is not always what you want to say',
    statement:
      'Learners can memorize useful sentences and still struggle to express their own day, opinions, and experiences.',
    tensions: ['What I study', 'What I want to say', 'How I keep practicing'],
    notes: `The problem is not that learning material has no value. The problem is the gap between prepared examples and the learner’s own life. Creating personal examples takes time, translating them is difficult, and a sentence is easy to forget after using it once. Just Speak It is designed around closing that gap.\n\n[Sources]\n- README.md\n- docs/redesign-proposal.md`,
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
    notes: `This is the main user story behind the product. The user should not need to prepare English before using it. Speaking or writing in Japanese is enough. The result must remain useful after generation, so the same input becomes both a personal note and material for repeated speaking practice.\n\n[Sources]\n- README.md\n- docs/redesign-proposal.md`,
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
    notes: `This is the complete product loop. Voice input is transcribed and cleaned, then divided into ideas that are short enough to practice speaking. Each idea is translated, saved as a phrase, and scheduled for later review. Text input follows the same path but allows the learner to confirm the Japanese split before translation.\n\n[Sources]\n- README.md\n- features/capture/capture-screen.tsx\n- docs/redesign-proposal.md`,
  },
  {
    number: 5,
    title: 'The main flow stays focused from capture to cards',
    stages: ['CAPTURE', 'GENERATE', 'PRACTICE'],
    notes: `The home screen keeps the main journey in one place. In the voice path, the learner starts speaking, then the app transcribes the recording and generates cards automatically. Text input uses the same learning loop but adds a confirmation step before translation. The demo follows the voice path shown here.\n\n[Sources]\n- features/capture/capture-screen.tsx\n- features/capture/draft-card-list.tsx`,
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
    notes: `The product has four tabs, but they are not separate experiences. Home creates and reviews material. Notes preserves the original entry and, when enabled, its local recording. Phrases provides a browsable library of generated cards. Custom lets the learner choose card size, translation style, theme, and whether recordings remain on the device.\n\n[Sources]\n- app/(tabs)/_layout.tsx\n- features/diary/diary-screen.tsx\n- features/cards/cards-screen.tsx\n- features/settings/settings-screen.tsx`,
  },
  {
    number: 7,
    title: 'Two decisions keep practice fast and repeatable',
    decisions: [
      { label: 'もう一回', english: 'Again', description: 'Bring the phrase back sooner' },
      { label: '言えた', english: 'I said it', description: 'Increase the review interval' },
    ],
    support: ['Undo accidental decisions', 'Queue results locally until synchronized'],
    notes: `Review uses only two decisions. If the learner cannot say the phrase, “Again” brings it back sooner. If they can say it, the interval grows. This keeps the interaction fast enough for daily practice. Undo handles accidental decisions, while a local outbox keeps pending review events safe until synchronization succeeds.\n\n[Sources]\n- features/review/slack-flashcard-lab.tsx\n- features/review/review-deck.tsx\n- shared/api/review-outbox.ts\n- packages/core/src/srs.ts`,
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
    notes: `The mobile app does not call the model as an unstructured shortcut. An authenticated Supabase Edge Function validates the request, coordinates the OpenAI operations, and stores structured results. The database keeps entries, generations, cards, review events, and usage events. The original audio is never persisted in cloud storage; an optional copy can remain on the learner’s device.\n\n[Sources]\n- docs/architecture/just-speak-it-low-level-overview.png\n- docs/architecture/README.md\n- supabase/functions/api/index.ts\n- supabase/migrations/20260731043000_rebuild_schema_v3.sql`,
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
    notes: `These choices are technical, but their purpose is user-facing. The capture state machine prevents contradictory screens. Shared Zod contracts keep the app and backend aligned. Idempotency prevents duplicate generations if a request is retried. Review events and the local outbox make the two-button review flow reliable. Row Level Security restricts reads to the current user, while every write passes through the authenticated API.\n\n[Sources]\n- features/capture/capture-state.ts\n- packages/contract/src/index.ts\n- shared/api/client.ts\n- shared/api/review-outbox.ts\n- supabase/functions/api/index.ts\n- supabase/migrations/20260731043000_rebuild_schema_v3.sql`,
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
    notes: `I will now demonstrate one complete user flow. I will speak a short thought in Japanese, show how the app turns it into English cards, and then practice one of those cards. This is the core promise of Just Speak It: your own life becomes the material for your English practice.\n\n[Sources]\n- README.md\n- features/capture/capture-screen.tsx\n- features/review/review-deck.tsx`,
  },
  {
    number: 11,
    appendix: true,
    title: 'The core flow, end to end',
    stages: ['Speak', 'Transcribe', 'Generate English cards', 'Review'],
    notes: `This appendix preserves the complete voice journey as static evidence. It can support questions about the flow or provide a visual reference if the live demo environment becomes unavailable. Text input follows the same learning loop with an additional split-confirmation step before generation.\n\n[Sources]\n- features/capture/capture-screen.tsx\n- features/capture/draft-card-list.tsx\n- features/cards/cards-screen.tsx\n- features/review/review-deck.tsx`,
  },
  {
    number: 12,
    appendix: true,
    title: 'How requests move through the system',
    notes: `This detailed architecture view shows the two main paths. Authenticated writes and all AI work go through the single Edge Function. Read models use PostgREST with Row Level Security. Optional audio copies stay on the device, while cloud storage contains structured text and learning state.\n\n[Sources]\n- docs/architecture/just-speak-it-low-level-overview.png\n- docs/architecture/README.md`,
  },
];
