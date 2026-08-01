export const ja = {
  common: {
    cancel: 'キャンセル',
    close: '閉じる',
    delete: '削除',
    loading: '読み込み中',
    reload: '再読み込み',
    retry: '再試行',
    accessibility: {
      optionWithCaption: '{{label}}、{{caption}}',
      segmentedOption: '{{option}}、{{position}}/{{total}}',
      segmentedOptionWithGroup: '{{group}}、{{option}}、{{position}}/{{total}}',
    },
  },
  tabs: {
    home: 'ホーム',
    notes: 'ノート',
    phrases: 'フレーズ',
    settings: 'カスタム',
  },
  capture: {
    actions: {
      makeCards: 'Make cards',
      makingCards: 'Making cards',
      speak: '話す',
      speakIt: 'Speak it',
      splitIt: 'Split it',
      startOver: 'やり直す',
      transcribing: 'Transcribing',
      write: '書く',
    },
    accessibility: {
      generatedJapaneseCards: '作成された日本語カード',
      stopRecording: '録音を停止 {{duration}}',
      switchToVoice: '話すモードに戻る',
      switchToWrite: '書くモードに切り替える',
      writeInJapanese: '今日の日本語を書く',
    },
    errors: {
      emptyText: '日記本文を入力してください。',
      microphonePermission: 'マイク権限がないため録音できません。',
      recordingUnavailable: '録音ファイルを読み込めませんでした。',
    },
    unfinishedDraft: '未完了の下書き',
    writePlaceholder: '今ふと考えていることをなんでも自由に日本語で書く。',
    starter: {
      idle: {
        body: '下の Speak it を押して、今日考えていることをなんでも話してみましょう。短くても大丈夫です。',
        title: '最初のカードを作ろう',
      },
      loading: {
        body: '保存済みの英語カードを読み込んでいます。',
        title: '今日のカードを確認中',
      },
      recording: {
        body: '話し終えたら下のボタンで止めてください。話した内容から英語カードを作れます。',
        title: 'そのまま話してみましょう',
      },
      working: {
        body: '話した内容を整理しています。少しだけ待ってください。',
        title: 'カードの準備中',
      },
    },
  },
  phrases: {
    empty: {
      body: 'ホームで話すか書くと、英語のフレーズがここに表示されます。',
      title: 'フレーズはまだありません',
    },
  },
  notes: {
    accessibility: {
      displayMode: 'ノートの表示方法',
      pauseRecording: '録音の再生を一時停止',
      playRecording: '録音を再生',
      recordingWaveform: '録音の音量波形',
      seekRecording: '録音の再生位置を移動',
      stopRecording: '録音再生を停止',
    },
    displayModes: {
      bullets: '箇条書き',
      original: '原文',
      plain: '本文',
    },
    empty: {
      body: 'ホームで話すか書くと、あなたの言葉がここに積み重なります。',
      title: 'ノートはまだありません',
    },
    errors: {
      load: 'ノートを読み込めませんでした。',
      loadTitle: '読み込めませんでした',
      refreshTitle: '更新できませんでした',
    },
    loading: {
      body: '保存済みのノートを読み込んでいます。',
      title: 'ノートを読み込んでいます',
    },
    noContent: '本文はありません。',
    source: {
      edited: '{{source}} · Edited',
      text: 'Text',
      voice: 'Voice',
    },
  },
  review: {
    accessibility: {
      showEnglish: '英語を表示する',
      showJapanese: '日本語を表示する',
      speakEnglish: '英語を読み上げる',
      undo: '直前の判定を取り消す',
    },
    again: 'もう一回',
    done: {
      body: '次に復習日が来たカードから、この画面にまた出ます。',
      title: '今日の復習は完了です',
    },
    gotIt: '言えた',
    remaining: '残り {{count}}',
  },
  settings: {
    language: {
      description: 'アプリ内の表示言語を切り替えます。',
      english: 'English',
      japanese: '日本語',
      title: '言語',
    },
    appearance: {
      dark: 'ダーク',
      description: 'アプリ全体の明るさを切り替えます。',
      light: 'ライト',
      title: '見た目',
    },
    cardSplit: {
      description: '話した内容を、練習カードへ分ける粒度です。',
      meaningUnit: {
        caption: '話の流れを保って分ける',
        label: '自然なまとまり',
      },
      smallSteps: {
        caption: '短いカードで少しずつ覚える',
        label: '細かく分ける',
      },
      title: 'カードの分け方',
    },
    translationStyle: {
      description: '日本語から作る英語の方向性を選びます。',
      native: {
        caption: '英語らしい自然な表現にする',
        label: '自然さ優先',
      },
      simple: {
        caption: 'やさしい語彙と短い文にする',
        label: '簡単さ優先',
      },
      title: '英語の仕上がり',
    },
    recordings: {
      accessibility: {
        deleteAll: '保存済み録音をすべて削除、{{stats}}',
        saveHint: 'カードから元の音声を再生できるようにします',
        saveLabel: '録音を端末に保存',
      },
      delete: {
        action: '保存済み録音を削除',
        confirmBody: '端末に保存された録音ファイルをすべて削除します。',
        confirmTitle: '保存済み録音を削除',
        errorBody: '一部の録音ファイルが端末に残っています。',
        errorTitle: '削除できませんでした',
      },
      description: '元の音声を端末に残すか、保存済みデータを管理します。',
      keep: {
        caption: 'カードから元の音声を再生できます。',
        label: '端末に残す',
      },
      stats: {
        count_one: '{{count}}件',
        count_other: '{{count}}件',
        withSize: '{{countLabel}} / {{size}}',
      },
      title: '録音とデータ',
    },
    developer: {
      deleteAll: {
        accessibility: 'すべてのデータを削除',
        action: 'すべてのデータを削除',
        confirmBody: '作成した日記・カード・復習履歴・利用履歴・保存済み録音を削除します。設定は残ります。この操作は取り消せません。',
        confirmTitle: 'すべてのデータを削除',
        partialBody: '作成データは削除しましたが、一部の録音ファイルが端末に残っています。',
        partialTitle: '一部削除できませんでした',
        successBody: '作成データと保存済み録音を削除しました。',
        successTitle: '削除しました',
        errorTitle: '削除できませんでした',
      },
      description: '表示や操作を試すための開発用メニューです。',
      lab: {
        accessibility: 'UI実験室を開く',
        action: 'UI実験室を開く',
      },
      title: '開発者向け',
    },
  },
  lab: {
    displayMode: '表示モード',
    preview: {
      bullets: ['帰り道に駅前でコーヒーを買った', '少し遠回りして帰った'],
      date: '7月31日 18:42',
      original: 'えーと、今日は帰り道に駅前でコーヒーを買いました。なんか、少し遠回りして帰りました。',
      plain: '今日は帰り道に駅前でコーヒーを買い、少し遠回りして帰りました。',
    },
    title: '実験室',
  },
  errors: {
    authCreate: '匿名ユーザーの作成に失敗しました。',
    authRefresh: '匿名セッションを更新できませんでした。',
    generic: '処理に失敗しました。',
    network: '通信に失敗しました。',
    recordingDelete: '一部の録音ファイルを削除できませんでした。',
    recordingRead: '録音ファイルを読み込めませんでした。もう一度録音してください。',
    recordingSave: '録音ファイルを保存できませんでした。',
    supabaseConfig: 'Supabaseの公開URLとpublishable keyが未設定です。',
    supabaseConnection: 'Supabaseに接続できません。',
  },
} as const;

export type TranslationShape<T> = {
  [Key in keyof T]: T[Key] extends readonly string[]
    ? readonly string[]
    : T[Key] extends string
      ? string
      : TranslationShape<T[Key]>;
};
