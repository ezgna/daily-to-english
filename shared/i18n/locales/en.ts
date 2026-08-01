import type { ja, TranslationShape } from '@/shared/i18n/locales/ja';

export const en = {
  common: {
    cancel: 'Cancel',
    close: 'Close',
    delete: 'Delete',
    loading: 'Loading',
    reload: 'Reload',
    retry: 'Try again',
    accessibility: {
      optionWithCaption: '{{label}}, {{caption}}',
      segmentedOption: '{{option}}, {{position}} of {{total}}',
      segmentedOptionWithGroup: '{{group}}, {{option}}, {{position}} of {{total}}',
    },
  },
  tabs: {
    home: 'Home',
    notes: 'Notes',
    phrases: 'Phrases',
    settings: 'Settings',
  },
  capture: {
    actions: {
      makeCards: 'Make cards',
      makingCards: 'Making cards',
      speak: 'Speak',
      speakIt: 'Speak it',
      splitIt: 'Split it',
      startOver: 'Start over',
      transcribing: 'Transcribing',
      write: 'Write',
    },
    accessibility: {
      generatedJapaneseCards: 'Generated Japanese cards',
      stopRecording: 'Stop recording, {{duration}}',
      switchToVoice: 'Switch back to voice mode',
      switchToWrite: 'Switch to writing mode',
      writeInJapanese: "Write today's thoughts in Japanese",
    },
    errors: {
      emptyText: 'Write something in Japanese first.',
      microphonePermission: 'Microphone access is required to record your voice.',
      recordingUnavailable: 'The recording could not be loaded.',
    },
    unfinishedDraft: 'Unfinished draft',
    writePlaceholder: 'Write freely in Japanese about whatever is on your mind.',
    starter: {
      idle: {
        body: 'Tap Speak it below and talk about anything on your mind today. Even a short thought is perfect.',
        title: "Let's make your first card",
      },
      loading: {
        body: 'Loading your saved English cards.',
        title: "Checking today's cards",
      },
      recording: {
        body: "When you're finished, tap the button below to stop. We'll turn what you said into English practice cards.",
        title: 'Keep going',
      },
      working: {
        body: "We're organizing what you said. This will only take a moment.",
        title: 'Making your cards',
      },
    },
  },
  phrases: {
    empty: {
      body: 'Speak or write from the Home tab, and your English phrases will appear here.',
      title: 'No phrases yet',
    },
  },
  notes: {
    accessibility: {
      displayMode: 'Note display format',
      pauseRecording: 'Pause recording playback',
      playRecording: 'Play recording',
      recordingWaveform: 'Recording waveform',
      seekRecording: 'Move through the recording',
      stopRecording: 'Stop recording playback',
    },
    displayModes: {
      bullets: 'Bullets',
      original: 'Original',
      plain: 'Cleaned',
    },
    empty: {
      body: 'Your thoughts will collect here as you speak or write from the Home tab.',
      title: 'No notes yet',
    },
    errors: {
      load: "We couldn't load your notes.",
      loadTitle: "Couldn't load your notes",
      refreshTitle: "Couldn't refresh",
    },
    loading: {
      body: 'Loading your saved notes.',
      title: 'Loading notes',
    },
    noContent: 'No text available.',
    source: {
      edited: '{{source}} · Edited',
      text: 'Text',
      voice: 'Voice',
    },
  },
  review: {
    accessibility: {
      showEnglish: 'Show the English side',
      showJapanese: 'Show the Japanese side',
      speakEnglish: 'Read the English aloud',
      undo: 'Undo the last answer',
    },
    again: 'Again',
    done: {
      body: "Cards will reappear here when they're due for review.",
      title: "You're done for today",
    },
    gotIt: 'Got it',
    remaining: '{{count}} left',
  },
  settings: {
    language: {
      description: 'Choose the language used throughout the app.',
      english: 'English',
      japanese: '日本語',
      title: 'Language',
    },
    appearance: {
      dark: 'Dark',
      description: 'Choose a light or dark look for the app.',
      light: 'Light',
      title: 'Appearance',
    },
    cardSplit: {
      description: 'Choose how your thoughts are divided into practice cards.',
      meaningUnit: {
        caption: 'Keep related ideas together',
        label: 'Natural chunks',
      },
      smallSteps: {
        caption: 'Practice with shorter cards',
        label: 'Smaller steps',
      },
      title: 'Card length',
    },
    translationStyle: {
      description: 'Choose the kind of English created from your Japanese.',
      native: {
        caption: 'Use natural, native-sounding expressions',
        label: 'Natural English',
      },
      simple: {
        caption: 'Use simpler words and shorter sentences',
        label: 'Simple English',
      },
      title: 'English style',
    },
    recordings: {
      accessibility: {
        deleteAll: 'Delete all saved recordings, {{stats}}',
        saveHint: 'Lets you play your original audio from a card',
        saveLabel: 'Save recordings on this device',
      },
      delete: {
        action: 'Delete saved recordings',
        confirmBody: 'This will delete every recording saved on this device.',
        confirmTitle: 'Delete saved recordings?',
        errorBody: 'Some recording files are still on this device.',
        errorTitle: "Couldn't delete everything",
      },
      description: 'Choose whether to keep your original audio and manage recordings saved on this device.',
      keep: {
        caption: 'Play your original audio from a card.',
        label: 'Keep on this device',
      },
      stats: {
        count_one: '{{count}} recording',
        count_other: '{{count}} recordings',
        withSize: '{{countLabel}} / {{size}}',
      },
      title: 'Recordings & data',
    },
    developer: {
      deleteAll: {
        accessibility: 'Delete all data',
        action: 'Delete all data',
        confirmBody: 'This will delete your notes, cards, review history, usage history, and saved recordings. Your settings will stay. This cannot be undone.',
        confirmTitle: 'Delete all data?',
        partialBody: 'Your created data was deleted, but some recording files are still on this device.',
        partialTitle: "Couldn't delete everything",
        successBody: 'Your created data and saved recordings have been deleted.',
        successTitle: 'Data deleted',
        errorTitle: "Couldn't delete data",
      },
      description: 'Developer tools for trying out UI and app behavior.',
      lab: {
        accessibility: 'Open the UI lab',
        action: 'Open UI lab',
      },
      title: 'Developer',
    },
  },
  lab: {
    displayMode: 'Display mode',
    preview: {
      bullets: ['Bought coffee by the station on the way home', 'Took a slightly longer route home'],
      date: 'Jul 31, 6:42 PM',
      original: 'Um, I bought coffee by the station on my way home today. I kind of took a slightly longer route home.',
      plain: 'I bought coffee by the station on my way home today and took a slightly longer route home.',
    },
    title: 'UI Lab',
  },
  errors: {
    authCreate: "We couldn't create an anonymous user.",
    authRefresh: "We couldn't refresh your anonymous session.",
    generic: 'Something went wrong.',
    network: 'Check your connection and try again.',
    recordingDelete: "We couldn't delete some recording files.",
    recordingRead: "We couldn't read that recording. Please record it again.",
    recordingSave: "We couldn't save that recording.",
    supabaseConfig: 'The Supabase public URL and publishable key are not configured.',
    supabaseConnection: "We couldn't connect to Supabase.",
  },
} satisfies TranslationShape<typeof ja>;
