# Just Speak It 全面再設計提案書

- 作成日: 2026-07-05
- 対象リポジトリ: `just-speak-it-app`(Expo SDK 56 / React Native 0.85 / Supabase)
- 前提: 開発中(`version: 1.0.0`)であり、既存データ・既存コードとの互換性は一切考慮しない。ゼロから作り直す場合の「あるべき形」を定義する。
- 想定読者: この文書だけを見て再実装を進める開発者。現行コードの事前知識は不要なように書いてある。
- 方針はオーナー決定済み(§9)。特に「録音音声は端末内のみ」「Web 対応はしない」は確定であり、実装者が再確認する必要はない。

---

## 目次

1. [プロダクトの要約(何を作っているアプリか)](#1-プロダクトの要約)
2. [現状の点検結果](#2-現状の点検結果)
3. [再設計の原則](#3-再設計の原則)
4. [ターゲットアーキテクチャ全体像](#4-ターゲットアーキテクチャ全体像)
5. [バックエンド再設計](#5-バックエンド再設計)
6. [フロントエンド再設計](#6-フロントエンド再設計)
7. [横断的関心事(テスト・CI/CD・観測性・セキュリティ)](#7-横断的関心事)
8. [実行計画(フェーズ分割と受け入れ基準)](#8-実行計画)
9. [確定済みの決定事項](#9-確定済みの決定事項)
10. [付録: 新旧対応表](#10-付録-新旧対応表)

---

## 1. プロダクトの要約

日本語で「話す・書く」だけで、(a) 読み返せる日記と (b) 自分の言葉に基づく英語練習カードが自動生成されるモバイルアプリ。

コアのユーザーフロー:

```
話す(録音) ──▶ 文字起こし ──▶ 整形(フィラー除去) ──▶ 日本語カード分割 ──▶ 英訳 ──▶ フラッシュカード復習(SRS)
書く(入力) ─────────────────────────────▶ 分割(下書き確認あり) ──▶ 英訳 ──▶ 同上
```

- 音声入力は録音停止後に全段が**自動**で進む。テキスト入力は分割後に下書き確認を挟む。
- 復習は「もう一度 / 言えた」の 2 択で、間隔反復(SRS: 1日 → 3 → 7 → 14 → 30 → 60日)によって出題される。
- 録音音声は端末内にのみ保存され、カードごとに該当区間(word timestamp)を再生できる。
- タブ構成: 今日(入力+埋め込み復習)/ 日記 / 英語(カード一覧)/ 設定。

この価値提案・UX 設計・DB の基本概念(entry → generation → cards)は良くできており、**再設計でも維持する**。作り直すのは「実装の骨格」である。

---

## 2. 現状の点検結果

### 2.1 維持すべき良い点

| 項目 | 内容 |
|---|---|
| 書き込み経路の防御姿勢 | クライアントの RLS は select のみ。insert/update は SECURITY DEFINER の RPC / Edge Function 経由。この姿勢は正しいので継承する。 |
| 冪等性設計 | `client_request_id` による生成ジョブの重複防止。継承する(名称は `idempotency_key` に変更)。 |
| 生成のステータス機械 | `draft → translating → completed / failed / discarded` を DB に持ち、アプリ再起動時に復元できる。概念は継承する。 |
| 生成メタデータの記録 | model / prompt_version / schema_version をジョブに記録している。継承する(jsonb に集約)。 |
| ローカル録音の retention モデル | `persistent / retry` の 2 区分と diary_entry へのリンク。継承する。 |
| 音声再生の排他制御 | `playback-coordinator` による TTS と録音クリップの排他。継承する。 |
| LLM プロンプトの質 | 検閲禁止・要約と分割の役割分離など、ドメイン知見が濃い。**プロンプト文面は資産としてそのまま移植する**。 |
| 開発中の破壊的マイグレーション運用 | `1.0.0` の間は完全リフレッシュで作り直す方針(AGENTS.md)。本再設計もこの方針に乗る。 |

### 2.2 問題点(重要度順)

#### P1: 「今日」画面が暗黙のステートマシンを 40 個の boolean で表現している

`src/app/(tabs)/index.tsx`(1,390 行)は、`isRecordingBusy` / `recordingIntentActive` / `isStoppingRecording` / `isTranscribing` / `isPreparingDraft` / `isCompletingPractice` / `shouldKeepVoiceFlowVisible` / `shouldShowEmbeddedReview` … といった **20 超の useState と 30 超の派生 boolean** の組み合わせでフローを制御している。

- 状態の組み合わせ爆発により、新しい表示条件を 1 つ足すたびに全 boolean の整合を人間が検証する必要がある(直近コミット群がまさにその修正の積み重ねになっている)。
- 実際には `idle → recording → transcribing → splitting → translating → completed / error` という**一直線のフェーズ遷移**であり、判別可能 union + reducer で表現すべき典型例。
- `useAudioRecorderState(recorder, 100ms)` が録音中 10Hz でこの巨大コンポーネント全体を再レンダーしている(性能問題)。

#### P2: サーバー状態管理の手作り実装

`use-translation-card-groups.ts` + `practice-refresh.ts` は、`isMountedRef` / `queuedSyncVersion` / モジュールレベル pub-sub による手製のキャッシュ・再取得機構で、TanStack Query が解決済みの問題を不完全に再発明している。キャッシュ無し・重複排除は自前・画面間の整合はグローバル通知頼み。

#### P3: 型と契約が 3 箇所に重複している

同じ行型(`TranslationCardRow` 等)と select 文字列が、
1. `supabase/functions/*` (Edge Functions 内、しかも関数ごとに重複)
2. `src/lib/backend/practice.ts`(クライアント、手書き)
3. `src/lib/supabase/database.types.ts`(自動生成、ほぼ未使用)

に三重定義され、`supabase as any` / `(supabase.rpc as any)` で型検査が無効化されている箇所もある。snake_case → camelCase のマッピング関数群(約 200 行)が手書きで、契約変更のたびに 3 箇所を人手で同期している。

#### P4: SRS(間隔反復)ロジックの二重実装と「なんでも書ける」復元 RPC

- 間隔テーブル(1/3/7/14/30/60 日)が **TypeScript(`card-learning-statuses.ts`)と plpgsql(`set_translation_card_learning_status`)に二重実装**されており、乖離すると楽観的 UI とサーバーの次回出題日がずれる。
- Undo 用の `restore_translation_card_learning_progress` は、クライアントが `review_count` / `next_review_at` を**任意値で上書きできる** RPC で、サーバー権威の原則を破っている。
- 復習履歴が残らない(現在値の上書きのみ)ため、将来のアルゴリズム変更(FSRS 等)や統計表示ができない。

#### P5: スタイリング基盤が二重化し、どちらも中途半端

- `tailwindcss` / `nativewind`(**v5 preview 版**)/ `postcss` / `react-native-css` / `tw` ラッパーが導入済みだが、実画面のスタイルは **ほぼ全部 StyleSheet + `constants/theme.ts` + `useDailyPalette()`**。
- 一方で `english.tsx` の空状態パネル等に `#111111` などの**ハードコード hex がテーマを迂回して散在**(ダークモード非対応箇所)。
- preview 版依存(nativewind 5.0.0-preview.4)+ `lightningcss` の版固定 + `patch-expo-cli.js` postinstall パッチと、ビルド基盤に不安定要素が積まれている。

#### P6: 実験用画面・試作コードが製品コードと同居

`design-lab.tsx`(2,125 行)、`diary-display-prototype-gallery.tsx`(1,318 行)、`workbench.tsx`、`prototype-room.tsx`、`transcription-model-comparison-lab.tsx` 等、**合計約 5,700 行(製品コードの 1/4 超)が試作品**で、ルートとして本番バンドルに含まれる(設定画面からの導線は `__DEV__` ガードのみで、ルート自体は残る)。製品コンポーネントの名前にも実験の痕跡が残っている(`SlackFlashcardLab` が本番の復習 UI)。

#### P7: 一覧取得がスケールしない

- `listTranslationCardGroups()` は**全 completed 世代 + 全カード**を 3 回の round trip で取得(ページング無し)。毎日使うアプリなので数ヶ月で数百世代・数千カードになり、起動毎に全量転送する。
- `getLatestPracticeDraft()` は `limit(10)` して JS 側でフィルタするヒューリスティック。
- 「復習が必要なカード」の抽出もクライアント側の全量フィルタ。

#### P8: テスト・CI・観測性がゼロ

- テストコードが 1 行もない(SRS 計算・波形正規化・契約パースなど純関数が多いのに)。
- CI 無し。lint / tsc も手動。
- クラッシュレポート・エラー追跡・利用分析・LLM コスト計測が無い。OpenAI 呼び出しは無制限(匿名ユーザーが無限にカード生成できる=コスト事故のリスク)。

#### P9: 匿名認証のみでアカウント永続性がない

匿名セッションが失われる(端末変更・再インストール・`schema-generation` による強制サインアウト)と全データにアクセス不能になる。提案書(milestone-1)にはアカウント機能が明記されているが未実装。

#### P10: クライアントがパイプラインのオーケストレーターになっている

音声フローでは、クライアントが `transcribe → prepare-practice-draft → complete-practice` の 3 つの Edge Function を**順番に呼ぶ責任**を持つ。途中でアプリが落ちた場合の復元ロジック(10 分ロック、restorable 判定)がクライアントに漏れ出しており、P1 の複雑さの一因になっている。

---

## 3. 再設計の原則

1. **状態はデータで表す**: boolean の組み合わせではなく、判別可能 union / DB の status 列で。UI は状態の写像に徹する。
2. **契約は一箇所で定義し、両側から import する**: Zod スキーマを共有パッケージに置き、クライアント・Edge Functions・テストが同じ定義を使う。手書きマッパー禁止。
3. **サーバー権威**: 学習状態・生成状態を変えられるのはサーバー API のみ。クライアントは「イベント」を送るだけ。楽観的更新は共有パッケージの同一純関数で行う。
4. **標準品を使う**: サーバー状態キャッシュ = TanStack Query、契約検証 = Zod、ルーティング = expo-router。手製の pub-sub・キャッシュ・再試行機構を持たない。
5. **製品コードと実験コードを物理的に分離する**: 本番バンドルに試作品を含めない。
6. **1 ファイル 300 行を超えたら分割を検討する**: 画面 = 状態フック + 表示コンポーネント群に分ける。
7. **課金される外部呼び出し(LLM)は必ず計測・制限する**。
8. **破壊的リビルドは `1.0.0` の間のみ**: 本文書のスキーマ v2 を最後の「作り直し」とし、以後は積み上げ式マイグレーションに移行する。
9. **対象プラットフォームは iOS / Android ネイティブのみ**(確定): Web はビルド対象から外し、`.web.tsx` 等の分岐ファイルを一切持たない。
10. **録音音声は端末内で完結させる**(確定): クラウドには保存しない。音声がネットワークを通るのは文字起こしのための一時送信のみで、サーバー側に永続化しない。

---

## 4. ターゲットアーキテクチャ全体像

### 4.1 リポジトリ構成(npm workspaces モノレポ)

Expo アプリはルートに維持しつつ、契約と純粋ロジックを共有パッケージとして切り出す。

```
just-speak-it/
├── package.json                  # Expo アプリ兼 workspaces ルート
├── app/                          # expo-router(ルーティングのみ、薄く)
├── features/                     # 機能単位のコード(§6.1)
├── shared/                       # ui / audio / theme / api クライアント
├── labs/                         # 実験コード退避場所(本番から import 禁止)
├── packages/
│   ├── contract/                 # ★ Zod による API 契約(両側から import)
│   └── core/                     # ★ 純粋ロジック(SRS計算・波形・テキスト整形)
├── supabase/
│   ├── migrations/               # スキーマ v2(単一リビルド SQL)
│   ├── functions/
│   │   ├── api/                  # ★ 単一 Edge Function(Hono ルーター)
│   │   └── _shared/              # OpenAI クライアント・認証ヘルパー
│   └── config.toml
├── docs/                         # 本文書ほか設計文書
└── .github/workflows/            # CI(§7.2)
```

- Edge Functions(Deno)は npm import に対応しているため、`packages/contract` と `packages/core` を**アプリと関数の両方から** import できる。これが三重定義(P3)と SRS 二重実装(P4)の根治策。
- `outputs/`(授業成果物)と `tasks/`(タスクメモ)は `docs/` 配下へ移動。

### 4.2 データフロー(ターゲット)

```
┌─────────── mobile(Expo)───────────┐      ┌──────── Supabase ────────┐
│                                      │      │                           │
│ features/capture                     │      │  Edge Function: api       │
│   useCaptureFlow(reducer/状態機械)  │─────▶│   POST /transcriptions    │──▶ OpenAI STT+整形
│                                      │      │   POST /generations       │──▶ OpenAI 分割
│ features/review                      │      │   POST /generations/:id/  │──▶ OpenAI 英訳
│   useReviewQueue(TanStack Query)   │─────▶│        translate           │
│   復習イベント送信                   │      │   POST /cards/:id/reviews │──▶ SRS計算(packages/core)
│                                      │      │                           │
│ shared/api                           │      │  PostgREST(select のみ) │
│   supabase-js + QueryClient          │◀─────│   RLS: user_id = uid()    │
│                                      │      │                           │
│ 端末内: MMKV(設定・録音index)     │      │  Postgres                 │
│         FileSystem(録音 .m4a)      │      │   entries / generations /  │
└──────────────────────────────────────┘      │   cards / review_events / │
                                              │   usage_events            │
                                              └───────────────────────────┘
```

読み取りは現行どおり PostgREST(RLS select)を使い、書き込み・LLM 呼び出しはすべて単一の `api` Function に集約する。DB 内の SECURITY DEFINER RPC 群は廃止し、ロジックは TypeScript(関数内 + `packages/core`)へ移す。

---

## 5. バックエンド再設計

### 5.1 DB スキーマ v2

命名を短く正規化し(`practice_generations` → `generations` 等)、復習をイベントログ化する。以下が新スキーマの全体像(実 SQL はこの通りに書き起こす)。

```sql
-- ユーザープロフィール(アカウント連携の受け皿。匿名でも作る)
create table public.profiles (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 日記エントリ(音声・テキスト入力の原稿)
create table public.entries (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  source        text not null check (source in ('voice', 'text')),
  raw_text      text not null,        -- 文字起こし原文 or 入力原文
  clean_text    text not null,        -- 整形済み本文(表示・生成の入力)
  is_edited     boolean not null default false,  -- 文字起こしをユーザーが修正したか
  summary       jsonb not null default '[]'::jsonb   -- 箇条書き(string[])
                check (jsonb_typeof(summary) = 'array'),
  transcript    jsonb not null default '[]'::jsonb   -- word timestamps(voice のみ)
                check (jsonb_typeof(transcript) = 'array'),
  waveform      jsonb not null default '[]'::jsonb
                check (jsonb_typeof(waveform) = 'array'),
  content_hash  text not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, id)                -- 複合 FK 用
);

-- カード生成ジョブ(1 エントリに複数世代がありうる)
create table public.generations (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  entry_id           uuid not null,
  idempotency_key    text not null,
  split_policy       text not null check (split_policy in ('meaning_unit', 'small_steps')),
  translation_style  text not null default 'simple'
                     check (translation_style in ('native', 'simple')),
  status             text not null default 'split'
                     check (status in ('split', 'translating', 'completed', 'failed', 'discarded')),
  error              jsonb,            -- { step: 'split'|'translate', message: text, at: timestamptz }
  model_info         jsonb not null default '{}'::jsonb,
                     -- { split: {model, promptVersion, schemaVersion},
                     --   translate: {model, promptVersion, schemaVersion} }
  claimed_at         timestamptz,      -- translating の再入防止ロック
  completed_at       timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (user_id, id),
  unique (user_id, idempotency_key),
  foreign key (user_id, entry_id) references public.entries (user_id, id) on delete cascade
);

-- 練習カード(SRS の導出状態を非正規化して持つ)
create table public.cards (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  generation_id    uuid not null,
  position         integer not null,
  ja               text not null,
  en               text,               -- 英訳完了までは null
  word_start       integer,            -- transcript 内の対応 word index(両端 inclusive)
  word_end         integer,
  audio_start_sec  double precision,
  audio_end_sec    double precision,
  -- ▼ SRS 導出状態(review_events から API が更新する。直接更新禁止)
  srs_status       text not null default 'new' check (srs_status in ('new', 'learning', 'known')),
  review_count     integer not null default 0,
  success_streak   integer not null default 0,
  last_reviewed_at timestamptz,
  due_at           timestamptz,        -- null = new(常に出題対象)
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (user_id, id),
  unique (generation_id, position),
  foreign key (user_id, generation_id) references public.generations (user_id, id) on delete cascade,
  check (word_start is null or word_end is null or word_start <= word_end),
  check (audio_start_sec is null or audio_end_sec is null or audio_start_sec <= audio_end_sec)
);

-- 復習イベント(追記専用。Undo・統計・将来のアルゴリズム変更の基盤)
create table public.review_events (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references auth.users(id) on delete cascade,
  card_id      uuid not null,
  rating       text not null check (rating in ('again', 'good')),  -- もう一度 / 言えた
  reviewed_at  timestamptz not null default now(),
  undone_at    timestamptz,             -- Undo は物理削除でなく打ち消し
  foreign key (user_id, card_id) references public.cards (user_id, id) on delete cascade
);

-- LLM 使用量ログ(コスト計測とレート制限の基盤)
create table public.usage_events (
  id            bigint generated always as identity primary key,
  user_id       uuid not null references auth.users(id) on delete cascade,
  kind          text not null check (kind in ('transcribe', 'clean', 'split', 'translate')),
  model         text not null,
  input_tokens  integer,
  output_tokens integer,
  audio_seconds double precision,
  created_at    timestamptz not null default now()
);

-- インデックス
create index entries_user_created_idx      on public.entries (user_id, created_at desc);
create index generations_user_status_idx   on public.generations (user_id, status, updated_at desc);
create index generations_user_entry_idx    on public.generations (user_id, entry_id, created_at desc);
create index cards_user_due_idx            on public.cards (user_id, due_at nulls first) where en is not null;
create index cards_generation_idx          on public.cards (generation_id, position);
create index review_events_card_idx        on public.review_events (card_id, reviewed_at desc);
create index usage_events_user_day_idx     on public.usage_events (user_id, created_at desc);
```

設計判断のポイント:

- **status から `draft` を廃し `split` に改名**: 「分割済み・英訳待ち」という実態に名前を合わせる。初期状態は常に分割完了後に行が作られる(分割前の中間状態を DB に持たない)。
- **`error` / `model_info` を jsonb に集約**: 現行の 8 本のバージョン管理列(`draft_model`, `draft_prompt_version`, …)を 1 列に。スキーマ変更なしでステップを追加できる。
- **SRS 導出状態は cards に非正規化**して一覧クエリを 1 発にしつつ、真実は `review_events`。Undo は `undone_at` を立てて直近の状態を再計算する(任意値の書き戻し RPC は廃止)。
- **RLS は select のみ**(現行踏襲)。`review_events` と `usage_events` も select 可(自分の統計を見られるように)。すべての書き込みは service-role を使う Edge Function 経由。
- **plpgsql の業務ロジックは全廃**。`save_practice_draft` 等の巨大 RPC は、Edge Function 内のトランザクション的処理(単一関数内で順に insert し、失敗時は generation を failed に落とす)+ 冪等キーで置き換える。DB 側は制約(check / unique / FK)による防衛に徹する。

### 5.2 生成パイプラインの再設計

現行の課題(P10)は「クライアントが 3 つの関数を順に呼ぶ」こと。再設計では**クライアントの呼び出しを最大 2 回に固定**する。

```
音声フロー(自動):
  1. POST /transcriptions            音声 → { rawText, cleanText, words }(DB 保存なし)
  2. POST /generations {mode:'auto'} 分割 + 英訳まで一気にサーバー内で実行
                                     → completed の全データを返す

テキストフロー(下書き確認あり):
  1. POST /generations {mode:'split'} 分割まで実行 → status='split' で返す
  2. POST /generations/:id/translate  英訳を実行 → completed で返す
```

- `mode: 'auto'` は関数内で split → translate を直列実行する。LLM 2 呼び出しで合計 5〜20 秒程度、Edge Functions の実行上限(wall clock 400s)内に十分収まる。**中間状態(split 完了)を DB に書いてから translate に進む**ため、途中失敗しても `status='split'` + `error.step='translate'` として残り、再開エンドポイント(translate)を叩くだけで続きから復旧できる。
- 冪等性: `POST /generations` は `idempotencyKey` 必須。既存キーに一致したら現在の状態をそのまま返す(進行中なら進行中と返す)。
- ロック: `translate` 開始時に `claimed_at = now()` を条件付き UPDATE(`status='split' or (status='translating' and claimed_at < now() - interval '10 minutes')`)で奪取。現行の 10 分ヒューリスティックを踏襲しつつ、判定をサーバーに一元化する(クライアントの restorable 判定コードは削除)。
- 復元: アプリ起動時は `GET /generations/latest?policy=` 相当(PostgREST select でも可)で `status in ('split','translating','failed')` の最新 1 件を取得して UI 状態を復元する。

**採用しなかった代替案**: pgmq / pg_cron によるジョブキュー + Realtime 通知。ユーザー数 1〜少数の現段階では、同期実行 + 冪等キーのほうが部品が少なく、失敗モードも単純。ジョブキュー化は「生成に 30 秒以上かかるモデルに変える」「プッシュ通知で完了を知らせる」要件が出た時点で再検討する。

### 5.3 API 設計(単一 Edge Function + Hono)

4 つの個別 Function(transcribe / prepare-practice-draft / complete-practice / compare-transcriptions)を、**1 つの `api` Function + Hono ルーター**に統合する。

```
supabase/functions/api/
├── index.ts          # Hono app、認証ミドルウェア、エラーハンドラ
├── routes/
│   ├── transcriptions.ts   # POST /transcriptions
│   ├── generations.ts      # POST /generations, POST /:id/translate, POST /:id/discard
│   └── reviews.ts          # POST /cards/:id/reviews, POST /cards/:id/reviews/undo
├── llm/
│   ├── openai.ts           # Responses API ラッパー(structured output)
│   └── prompts.ts          # ★ 現行プロンプト文面をバージョン付きで移植
└── db.ts                   # service-role クライアント、typed クエリヘルパー
```

- ルート一覧と入出力スキーマは **`packages/contract` の Zod 定義が唯一の真実**。例:

```ts
// packages/contract/src/generations.ts
export const createGenerationRequest = z.object({
  idempotencyKey: z.string().min(1),
  mode: z.enum(['auto', 'split']),
  source: z.enum(['voice', 'text']),
  rawText: z.string().min(1),
  cleanText: z.string().min(1),
  isEdited: z.boolean().default(false),
  splitPolicy: z.enum(['meaning_unit', 'small_steps']),
  translationStyle: z.enum(['native', 'simple']),
  transcript: z.array(transcriptWord).default([]),
  waveform: z.array(z.number()).default([]),
});
export const generationResponse = z.object({
  generation: generationSchema,   // camelCase。DB 行との変換はサーバー内 db.ts のみが知る
  entry: entrySchema,
  cards: z.array(cardSchema),
});
export type CreateGenerationRequest = z.infer<typeof createGenerationRequest>;
```

- **API の外部表現は camelCase に統一**。snake_case ↔ camelCase の変換はサーバーの `db.ts` 1 箇所だけで行い、クライアントの手書きマッパー約 200 行を全廃する。
- エラーは全ルート共通の封筒 `{ error: { code, message, userMessage } }`。`userMessage` は日本語のユーザー向け文言、`message` は開発者向け。クライアントの `UserFacingBackendError` はこの封筒をパースするだけになる。
- 認証ミドルウェア: JWT 検証 → `userId` をコンテキストに注入。未認証は 401。
- 統合の利点: コールドスタートが 1 関数分に、認証・CORS・エラー処理・使用量記録が 1 箇所に、デプロイが `supabase functions deploy api` 1 コマンドになる。
- `compare-transcriptions`(実験用)は `api` に含めず**廃止**(labs 側で必要になったら別関数として復活させる)。

### 5.4 SRS(間隔反復)の一元化

アルゴリズム本体を `packages/core/src/srs.ts` の**純関数 1 つ**にする:

```ts
// packages/core/src/srs.ts
export type SrsState = {
  status: 'new' | 'learning' | 'known';
  reviewCount: number;
  successStreak: number;
  lastReviewedAt: string | null;
  dueAt: string | null;
};
export type Rating = 'again' | 'good';

const IntervalsDays = [3, 7, 14, 30, 60];   // good の連続回数 → 間隔
const AgainIntervalDays = 1;

export function applyReview(state: SrsState, rating: Rating, now: Date): SrsState { ... }
export function replayReviews(events: { rating: Rating; reviewedAt: string }[], now: Date): SrsState { ... }
export function isDue(state: SrsState, now: Date): boolean { ... }
```

- **サーバー**(`POST /cards/:id/reviews`): `review_events` に追記 → `applyReview` で新状態を計算 → `cards` の導出列を更新 → 新状態をレスポンスで返す。
- **Undo**(`POST /cards/:id/reviews/undo`): 直近の未取消イベントに `undone_at` を立て、残イベントを `replayReviews` で再計算して `cards` を更新。クライアントから任意の状態値を受け取らない(P4 の権限穴を閉じる)。
- **クライアントの楽観的更新**: 同じ `applyReview` を import して即座に UI へ反映し、レスポンスの確定値で上書きする。**二重実装が構造的に不可能になる**。
- 「今日の復習キュー」はサーバー側クエリで取る: `en is not null and (due_at is null or due_at <= now())`(`cards_user_due_idx` が効く)。

### 5.5 認証・アカウント

- 初回起動は現行どおり**匿名サインイン**(摩擦ゼロを維持)。
- Phase 5 で **Sign in with Apple / Google を `linkIdentity()` による「アカウント引き上げ」**として追加する(新規サインインではなく匿名ユーザーへの連携なので、既存データがそのまま残る)。設定画面に「データを引き継ぐ」導線を置く。
- 録音音声は端末内のみ(§9 決定)のため、アカウント連携しても**音声ファイルは他端末へ移行されない**。移行されるのはテキスト・カード・学習状態のみ。この旨を連携画面の説明文に明記する。
- `schema-generation`(スキーマ世代が変わったら端末状態を全消しして匿名セッションを捨てる仕組み)は開発期の道具として維持するが、**アカウント連携済みユーザーには signOut を適用しない**ガードを入れる。
- 放置された匿名ユーザーの掃除: `pg_cron` で「最終アクティビティから 90 日超の匿名ユーザー」を削除するジョブを用意(cascade で全データが消える)。導入は本番運用開始時。

### 5.6 LLM 運用

- **モデル指定は環境変数**(現行踏襲): `OPENAI_TEXT_MODEL`。文字起こしモデルも `OPENAI_STT_MODEL` に環境変数化する(現行は `whisper-1` ハードコード。word timestamp が必要という制約があるため、変更時は timestamp 対応を確認すること)。
- **プロンプトはコード内で定数 + バージョン文字列**(現行踏襲)。`prompts.ts` に `SplitPromptV2`, `TranslatePromptV2`, `CleanPromptV2` として移植し、変更時はバージョンを上げて `model_info` に記録する。
- **使用量の記録**: すべての OpenAI 呼び出し後に `usage_events` へ 1 行 insert(モデル・トークン数・音声秒数)。
- **レート制限**: `POST /transcriptions` と `POST /generations` の冒頭で、その日の `usage_events` 件数を数え、上限(例: 生成 30 回/日、文字起こし 30 回/日。環境変数で調整)を超えたら 429 + ユーザー向け文言を返す。匿名ユーザーによるコスト事故(P8)への最低限の防波堤。
- **入力サイズ上限**: 音声 25MB(OpenAI 上限)/ テキスト 4,000 字を契約(Zod)で強制。

---

## 6. フロントエンド再設計

### 6.1 ディレクトリ構成(feature-based)

```
just-speak-it/
├── app/                          # expo-router。各ファイルは 20 行以下の「配線」のみ
│   ├── _layout.tsx
│   └── (tabs)/
│       ├── _layout.tsx           # タブ定義(今日/日記/英語/設定)
│       ├── index.tsx             # → <CaptureScreen />
│       ├── diary.tsx             # → <DiaryScreen />
│       ├── english.tsx           # → <CardsScreen />
│       └── settings.tsx          # → <SettingsScreen />
├── features/
│   ├── capture/                  # 今日タブ(録音・入力・生成)
│   │   ├── capture-screen.tsx
│   │   ├── use-capture-flow.ts   # ★ reducer ステートマシン(§6.3)
│   │   ├── use-recorder.ts       # expo-audio ラッパー(metering→waveform 含む)
│   │   ├── components/           # RecordButton, TranscriptEditor, DraftCardList, StarterCard...
│   │   └── capture-flow.test.ts
│   ├── review/                   # フラッシュカード復習(今日タブ埋め込み+英語タブ)
│   │   ├── review-deck.tsx       # 旧 SlackFlashcardLab を分割・改名
│   │   ├── use-review-queue.ts   # due カードの取得と並び
│   │   ├── use-review-actions.ts # 評価送信・Undo(楽観的更新)
│   │   └── components/           # CardFace, DecisionOverlay, ProgressRing...
│   ├── diary/
│   ├── cards/                    # 英語タブ(カード一覧)
│   ├── settings/
│   └── recordings/               # ローカル録音の保存・再生(旧 local-recordings + play-button)
├── shared/
│   ├── api/                      # supabase client, QueryClient, api fetch ラッパー, query keys
│   ├── theme/                    # tokens, palette, ThemeProvider(§6.4)
│   ├── ui/                       # GlideButton 等の汎用 UI(命名は §10 で正規化)
│   ├── audio/                    # playback-coordinator(排他制御), tts
│   └── storage/                  # MMKV ラッパー
└── labs/                         # ★ 実験コード。ESLint ルールで features/shared からの import を禁止
```

- **`app/` は配線に徹する**: 画面本体は `features/*/xxx-screen.tsx`。ルートファイルが太る現行問題を構造で防ぐ。
- **labs の隔離**: `design-lab` / `workbench` / `prototype-room` / 各種 gallery は `labs/` へ移動し、ルート登録は `__DEV__` 時のみ行う(`app/_layout.tsx` で条件分岐し、`import` は `require` 遅延にしてバンドルから外す。Metro の tree-shaking を過信しない場合は、開発ビルド専用の `app.dev-labs.tsx` エントリを検討)。最低限「本番バンドル・本番ルートに乗らない」ことを受け入れ基準とする。

### 6.2 サーバー状態: TanStack Query

`@tanstack/react-query` を導入し、以下を**全廃**する: `practice-refresh.ts`(pub-sub)、`use-translation-card-groups.ts`(手製キャッシュ)、各画面の `isMountedRef` / 手動リフレッシュ配線。

```ts
// shared/api/query-keys.ts
export const qk = {
  reviewQueue:   ['cards', 'review-queue'] as const,
  cardGroups:    (cursor?: string) => ['cards', 'groups', cursor] as const,
  diaryEntries:  (cursor?: string) => ['entries', cursor] as const,
  latestPending: (policy: SplitPolicy) => ['generations', 'latest-pending', policy] as const,
};
```

- 生成完了・復習評価などの mutation は `invalidateQueries` で関連一覧を無効化(現行の `notifyPracticeChanged()` の役割)。
- 一覧は **カーソルページング**(`created_at < cursor` + `limit 20`)を最初から入れる(`useInfiniteQuery`)。P7 の全量取得を根治。
- 復習キューはサーバーで due 抽出(§5.4)。件数バッジも同クエリの `count` を使う。

### 6.3 キャプチャフローの明示的ステートマシン

現行 index.tsx の 40 boolean を、**単一の判別可能 union + reducer** に置き換える。これが本再設計で最も効果の大きい変更。

```ts
// features/capture/capture-state.ts
export type CaptureState =
  | { phase: 'idle'; mode: 'voice' | 'write' }
  | { phase: 'recording'; startedAtMs: number }
  | { phase: 'transcribing'; recordingId: string | null }
  | { phase: 'generating'; step: 'split' | 'translate'; input: CaptureInput }   // 音声=自動一括
  | { phase: 'draftReady'; draft: GenerationDraft }                             // 書くモードのみ
  | { phase: 'completed'; result: CompletedGeneration }
  | { phase: 'error'; failed: FailurePoint; message: string; recovery: Recovery };

export type CaptureEvent =
  | { type: 'START_RECORDING' } | { type: 'STOP_RECORDING'; uri: string; waveform: number[] }
  | { type: 'TRANSCRIBED'; transcript: Transcript } | { type: 'TRANSCRIBE_FAILED'; ... }
  | { type: 'EDIT_TEXT'; text: string } | { type: 'SUBMIT_TEXT' }
  | { type: 'SPLIT_DONE'; draft: GenerationDraft } | { type: 'TRANSLATED'; result: ... }
  | { type: 'DISCARD' } | { type: 'RETRY' } | { type: 'SWITCH_MODE'; mode: 'voice' | 'write' } | ...;

export function captureReducer(state: CaptureState, event: CaptureEvent): CaptureState { ... }
```

- **reducer は純関数**なので、遷移表を単体テストで網羅できる(「recording 中に SWITCH_MODE は無視される」等が 1 行のテストになる)。
- 副作用(録音 API・fetch)は `use-capture-flow.ts` 内で phase 遷移を監視して発火する。UI コンポーネントは `state.phase` の switch で描画するだけ。
- 現行の `shouldShowEmbeddedReview` / `shouldKeepVoiceFlowVisible` 等の派生 boolean は、`selectors.ts` の純関数(`canShowEmbeddedReview(state)`)として最小限だけ残す。
- 録音タイマー・metering は `use-recorder.ts` に閉じ、**10Hz の再レンダーを録音インジケーター コンポーネントだけに限定**する(P1 の性能問題を解消)。
- 中断復元: 起動時に `latestPending` クエリの結果を `RESTORE` イベントとして reducer に流す。復元判定ロジックはサーバー(§5.2)に寄せたので、クライアントは返ってきたものを表示するだけ。

採用しなかった代替案: XState。遷移の可視化や並行状態が欲しくなったら移行すればよく、依存を増やさない `useReducer` で始める。

### 6.4 スタイリングの一本化

**決定(§9): Tailwind/NativeWind 系を一切使わず、StyleSheet + 型付きデザイントークンに一本化する。**

理由: 実コードの 9 割超が既に StyleSheet + `theme.ts` トークンで書かれており(Tailwind 側に寄せると全画面の書き直しになる)、NativeWind は v5 の **preview 版**で製品の基盤に据えるべきでなく、`lightningcss` のバージョン固定の原因にもなっている。さらにアニメーション駆動のスタイル(Reanimated の実行時補間)は結局 style オブジェクトでしか書けず、Web 非対応の確定で NativeWind 最大の利点(Web との記述共有)も消えている。

撤去対象の依存とファイルの全リストは §10「依存パッケージの増減」にまとめた。調査済みの補足:

- `src/tw/`(Tailwind ラッパー)と `clsx` / `tailwind-merge` は**現時点でどこからも import されていない死荷重**であり、削除に伴う書き換えは発生しない。
- 実体のある撤去作業は `src/app/_layout.tsx` の `import '@/global.css'` を外すことと、設定ファイル・依存の削除のみ。
- `scripts/patch-expo-cli.js` は **NativeWind とは無関係**(Expo CLI の iOS 実機接続時のログ出力を黙らせるパッチ)なので、**維持する**。

あわせて:

- `shared/theme/tokens.ts`: Spacing / Radius / FontWeight / 色パレット(light・dark)を単一定義。
- `useDailyPalette()`(`just-speak-it-ui.tsx` 内)を `shared/theme/use-palette.ts` に移し、**ハードコード hex の使用を ESLint ルール(`no-restricted-syntax` で hex リテラル検出)で禁止**。現行 `english.tsx` 等のダークモード非対応 hex を全てパレット経由に修正。
- 条件付きスタイルは StyleSheet の配列合成(`[styles.base, isActive && styles.active]`)で書く。クラス名合成ユーティリティは導入しない。

### 6.5 オーディオ層

現行の良い部品を `shared/audio` と `features/recordings` に整理して継承する:

- `playback-coordinator`(TTS と録音クリップの排他)→ `shared/audio/exclusive-playback.ts`。
- 録音 → 波形生成(metering サンプル → peaks 正規化)→ `features/capture/use-recorder.ts` に内包。
- ローカル録音の index(MMKV)+ ファイル(`Paths.document/recordings`)→ `features/recordings/store.ts`。`retention: 'persistent' | 'retry'` モデルは維持。`diaryEntryId` は `entryId` に改名。
- **録音音声は端末内のみ**(§9 決定): クラウド(Supabase Storage)には保存しない。音声がネットワークを通るのは `POST /transcriptions` への一時送信のみで、サーバー側に永続化しない。Web 非対応の確定により `isLocalRecordingSupported()` のようなプラットフォーム判定は廃止し、録音保存は常にサポートされる前提で書く。
- TTS は当面 `expo-speech` を維持。発音品質が課題になったら OpenAI TTS(生成時に音声を作り端末にキャッシュ)を Phase 5 で検討。

### 6.6 画面別の再実装方針

| 画面 | 方針 |
|---|---|
| 今日(capture) | §6.3 のステートマシンで全面書き直し。埋め込み復習(ReviewDeck)は「idle かつキューが空でない」時に表示、という 1 条件に単純化。 |
| 復習 UI(ReviewDeck) | 旧 `SlackFlashcardLab`(1,804 行)を、deck 状態管理 / カード面 / 判定オーバーレイ / ジェスチャの 4 ファイル程度に分割移植。スワイプ・アニメーションの実装品質は高いのでロジックは温存。学習状態の楽観的更新は §5.4 の共有 `applyReview` に差し替え。 |
| 日記 | `useInfiniteQuery` によるページング一覧 + 詳細。旧 `diary.tsx`(1,005 行)から表示コンポーネントを分割移植。 |
| 英語(カード一覧) | 世代グループ単位の一覧をページング化。空状態・エラー状態はパレット準拠に修正。 |
| 設定 | 現行構成を踏襲(テーマ / 分割方針 / 翻訳スタイル / 録音保存)。labs 導線は `__DEV__` のみ(現行どおり)+ Phase 5 で「アカウント連携」セクション追加。 |

### 6.7 Web 対応の撤去(§9 決定)

Web はサポートしない(iOS / Android ネイティブのみ)。以下を Phase 0 で撤去する。

- **依存**: `react-native-web` / `react-dom` を削除。`npm run web` スクリプトと `app.json` の `web` 設定を削除。
- **分岐ファイル**: `*.web.tsx` / `*.web.ts` を全削除(`app-tabs.web.tsx`, `animated-icon.web.tsx`(+ `animated-icon.module.css`), `use-color-scheme.web.ts`, `modules/audio-session-haptics/src/AudioSessionHapticsModule.web.ts` 等)。新規コードでも `.web.*` ファイルと `Platform.OS === 'web'` 分岐を作らない(ESLint の `no-restricted-syntax` で検出する)。
- **アイコン指定**: `GlideButton` 等の `icon: { ios, android, web }` 3 プラットフォーム指定を `{ ios, android }` に簡素化。
- **web 前提のガード**: `isLocalRecordingSupported()`(web 判定)などのプラットフォーム分岐を廃止(§6.5)。
- `expo-web-browser` は**残す**(ネイティブのアプリ内ブラウザとして外部リンクに使うため。Web 対応とは無関係)。

---

## 7. 横断的関心事

### 7.1 テスト戦略

| レイヤ | ツール | 対象(優先順) |
|---|---|---|
| 純関数 | Vitest(`packages/core`, `packages/contract`) | ①SRS `applyReview`/`replayReviews`(全遷移+境界日付) ②capture reducer の遷移表 ③波形正規化 ④テキスト整形・抜粋 ⑤Zod 契約の受理/拒否 |
| Edge Functions | Deno test + OpenAI モック | ①冪等キー再送で同一応答 ②translate のロック奪取 ③レート制限 429 ④エラー封筒の形 |
| コンポーネント | jest-expo + React Native Testing Library | ①CaptureScreen の phase 別描画 ②ReviewDeck の評価→Undo |
| E2E | Maestro | happy path 1 本: テキスト入力 → Split → Make cards → 復習で「言えた」(専用テストプロジェクトの Supabase に対して実行) |

方針: LLM 呼び出しは必ず境界(`llm/openai.ts`)でモック可能にする。カバレッジ目標は設けず、「壊れたら困る純関数と契約」を優先的に固める。

### 7.2 CI/CD(GitHub Actions + EAS)

```
.github/workflows/ci.yml(PR ごと):
  - npm ci
  - lint(expo lint + hex 禁止ルール)
  - tsc --noEmit(ルート Expo アプリ, packages/*)
  - vitest(core, contract)
  - deno test(supabase/functions)
  - 契約整合チェック: supabase start(CI 内 Docker)→ db reset → `supabase gen types` の出力が
    コミット済み database.types.ts と diff ゼロであること

.github/workflows/deploy.yml(main マージ時):
  - supabase db push / functions deploy api(hosted プロジェクトへ)
  - eas update --branch preview(OTA 配信)

タグ push 時:
  - eas build --platform ios --profile production
```

- ローカル Docker Supabase を使わない現行運用(AGENTS.md)は開発者の手元では維持しつつ、**CI 上でだけ** `supabase start` を使ってスキーマ・型・関数の整合を機械検証する。
- `db:types` / `functions:deploy` 等の npm scripts はモノレポのルートに集約。

### 7.3 観測性・分析

- **クラッシュ・エラー**: `@sentry/react-native`(Expo config plugin)+ Edge Functions からも Sentry へ送信。`logBackendError` の console 出力を置き換える。
- **プロダクト分析**: PostHog(RN SDK)。イベントは最小 5 つから: `recording_started`, `generation_completed`(source/policy/style 付き), `review_rated`(rating 付き), `review_undone`, `app_opened`。継続率(D1/D7)と「録音→カード完成」ファネルを見る。
- **LLM コスト**: `usage_events` を日次集計するだけの SQL ビューを用意(`daily_usage`)。ダッシュボードは Supabase Studio で足りる。

### 7.4 エラー設計

- 契約(§5.3)のエラー封筒に統一: `code`(機械可読: `rate_limited` / `no_content` / `llm_failed` / `conflict` …)、`userMessage`(日本語)。
- クライアントは `code` で分岐(再試行可否・文言の出し分け)し、未知の code はフォールバック文言 + Sentry 送信。
- 現行の「ユーザー向け文言 + 開発者向け debugMessage」の 2 層構造は良いので契約に組み込んで継承する。

### 7.5 i18n・アクセシビリティ

- UI 文言は当面日本語ハードコードで構わないが、**`shared/i18n/strings.ts` に文字列定数として集約**しておく(提案書にある Punjabi 対応・多言語化の下準備。ライブラリ導入は不要)。
- accessibilityLabel は現行コードで丁寧に付いている。この水準を維持し、ReviewDeck のジェスチャ操作にはボタン代替(現行 DecisionButton)を必ず残す。

---

## 8. 実行計画

1 人で実装する前提の目安工数。各フェーズは main にマージ可能な単位で区切る。

### Phase 0: 基盤整備(2〜3 日)

- `packages/contract` / `packages/core` を npm workspaces として追加し、Expo アプリはルートに維持する。
- **依存パッケージの整理**: §10「依存パッケージの増減」の削除リストを全てアンインストールし、関連ファイル(`postcss.config.mjs` / `nativewind-env.d.ts` / `src/global.css` / `src/tw/` / `.web.*`)と `package.json` の `overrides.lightningcss` を削除。追加リスト(TanStack Query / Zod / Sentry 等)を導入。
- Tailwind/NativeWind 系の撤去(§6.4)と、撤去後の iOS 実機ビルド確認。
- Web 対応の撤去(§6.7): `react-native-web` / `react-dom` / `.web.*` ファイル / `web` スクリプト・設定の削除。
- CI 骨格(lint / tsc / vitest 空実行)、Sentry 導入。
- **受け入れ基準**: 既存アプリが新構成でビルド・起動し、CI が緑。リポジトリに `.web.*` ファイルと web 依存が残っておらず、`package.json` が §10 の増減一覧と一致している。

### Phase 1: バックエンド v2(4〜6 日)

- スキーマ v2 マイグレーション(§5.1。破壊的リビルド 1 ファイル)。
- `api` Function(Hono)+ 全ルート実装(§5.2, 5.3)。旧 4 関数と旧 RPC 群を削除。
- SRS を `packages/core` に実装し、reviews / undo ルートで使用。
- `usage_events` 記録とレート制限。Deno テスト(冪等性・ロック・429)。
- **受け入れ基準**: curl で「テキスト → auto 生成 → 復習 → Undo」が一連で通り、`review_events` と `cards` の整合がテストで保証されている。

### Phase 2: クライアント基盤(4〜6 日)

- TanStack Query 導入、`shared/api`(契約ベースの fetch ラッパー)、query keys 設計。
- `shared/theme` 一本化(トークン+パレット+hex 禁止 lint)。
- capture reducer(§6.3)実装 + 遷移テスト。`use-recorder` 分離。
- **受け入れ基準**: reducer の遷移表テストが全 phase × 主要イベントを網羅。旧 `practice-refresh` / 手製フックが削除されている。

### Phase 3: 画面再実装(5〜8 日)

- CaptureScreen(今日)/ ReviewDeck / DiaryScreen / CardsScreen / SettingsScreen を feature 構成で移植(§6.6)。
- ページング(無限スクロール)導入。labs 退避と本番バンドル除外。命名正規化(§10)。
- **受け入れ基準**: 現行アプリの全ユーザーフロー(音声自動生成・テキスト下書き・復習・Undo・録音再生・失敗時再試行)が新実装で動作。`app/(tabs)/*.tsx` が各 20 行以下。本番ビルドに labs が含まれない。

### Phase 4: 品質固め(3〜5 日)

- コンポーネントテスト、Maestro E2E 1 本、CI への組み込み(§7.1, 7.2)。
- PostHog イベント実装。EAS ビルドプロファイル整備(development / preview / production)。
- **受け入れ基準**: CI が「lint / 型 / 単体 / 関数 / E2E」を通し、タグ push で TestFlight ビルドが出る。

### Phase 5: 拡張(優先度はオーナー判断)

- アカウント連携(Sign in with Apple / Google、`linkIdentity`)+ 匿名ユーザー掃除ジョブ。
- プッシュ通知(復習リマインダー)。
- 既存 tasks/ にあった構想: ロック画面ウィジェット(Live Activities / WidgetKit、要ネイティブ実装)、イディオム解説カード、下書きカードの編集 UI。
- OpenAI TTS への切り替え、Punjabi 対応、進捗ダッシュボード。

**合計目安: Phase 0〜4 で 18〜28 人日。**

---

## 9. 確定済みの決定事項

以下はオーナー決定済み(2026-07-05)。実装者はこれを前提として進めてよく、着手前の再確認は不要。変更したくなった場合のみオーナーに確認する。

| # | 論点 | 決定 | 実装への影響 |
|---|---|---|---|
| 1 | 録音音声の保存場所 | **端末内のみ。クラウド保存しない** | Storage バケット不要。音声は文字起こし時の一時送信のみで永続化しない(§5.6, §6.5)。機種変更・再インストールで録音再生が失われる点は仕様として許容。アカウント連携でも音声は移行されない(§5.5)。 |
| 2 | Web 対応 | **しない(iOS / Android ネイティブのみ)** | web 依存・`.web.*` 分岐・スクリプトを Phase 0 で撤去(§6.7)。CI・E2E もネイティブのみ。 |
| 3 | 状態機械ライブラリ | **XState は使わず useReducer** | §6.3。並行状態・遷移の可視化が必要になったら移行を再検討。 |
| 4 | 生成パイプライン | **ジョブキュー化しない(同期 + 冪等キー)** | §5.2。生成が 30 秒超になる、完了プッシュ通知が必要になったら pgmq + Realtime を再検討。 |
| 5 | SRS アルゴリズム | **現行間隔テーブル(1/3/7/14/30/60 日)を移植** | §5.4。`review_events` があるため、後から FSRS 等へ全カード再計算で移行可能。 |
| 6 | レート制限の初期値 | **生成 30 回/日・文字起こし 30 回/日(環境変数で調整)** | §5.6。TestFlight 配布前に見直す。 |
| 7 | スタイリング | **Tailwind/NativeWind 系は一切使わない。StyleSheet + 型付きトークンに一本化** | §6.4。関連依存・設定・死コードを Phase 0 でアンインストール(§10「依存パッケージの増減」)。 |
| 8 | サーバー状態管理 | **TanStack Query(React Query)を新規導入** | §6.2。手製のキャッシュ・pub-sub(`practice-refresh.ts` 等)を全廃する。 |

---

## 10. 付録: 新旧対応表

### テーブル・列

| 現行 | 新 | 変更理由 |
|---|---|---|
| `diary_entries` | `entries` | 冗長な接頭辞削除 |
| `diary_entries.original_text / plain_text` | `entries.raw_text / clean_text` | 役割が名前から読めるように |
| `diary_entries.bullet_points / transcript_words / waveform_peaks` | `entries.summary / transcript / waveform` | 簡潔化 |
| `practice_generations` | `generations` | 〃 |
| `practice_generations.client_request_id` | `generations.idempotency_key` | 用途を正しく命名 |
| `practice_generations.draft_* / translation_*` 8 列 | `generations.model_info`(jsonb) | ステップ追加に強く |
| `practice_generations.status='draft'` | `status='split'` | 実態(分割済み)に一致 |
| `translation_cards` | `cards` | 冗長な接頭辞削除 |
| `translation_cards.japanese / english / sort_order` | `cards.ja / en / position` | 簡潔化 |
| `translation_cards.learning_status / success_count` | `cards.srs_status / success_streak` | 意味の明確化 |
| (なし) | `review_events` / `usage_events` / `profiles` | §5.4, 5.6, 5.5 |
| RPC `save_practice_draft` ほか 6 本 | 廃止(api Function 内 TS へ) | plpgsql 業務ロジック全廃 |

### Edge Functions / API

| 現行 | 新 |
|---|---|
| `transcribe` | `api`: `POST /transcriptions` |
| `prepare-practice-draft` | `api`: `POST /generations`(mode: split / auto) |
| `complete-practice` | `api`: `POST /generations/:id/translate` |
| RPC `discard_practice_generation` | `api`: `POST /generations/:id/discard` |
| RPC `set_translation_card_learning_status` | `api`: `POST /cards/:id/reviews` |
| RPC `restore_translation_card_learning_progress` | `api`: `POST /cards/:id/reviews/undo`(任意値書込は廃止) |
| `compare-transcriptions` | 廃止(labs 用途) |

### クライアント主要モジュール

| 現行 | 新 |
|---|---|
| `app/(tabs)/index.tsx`(1,390 行) | `features/capture/`(screen + reducer + components) |
| `components/slack-flashcard-lab.tsx`(1,804 行) | `features/review/review-deck.tsx` ほか分割 |
| `components/just-speak-it-ui.tsx`(palette) | `shared/theme/` |
| `lib/backend/practice.ts`(836 行、手書きマッパー) | `shared/api/` + `packages/contract`(マッパー廃止) |
| `lib/practice-refresh.ts` / `hooks/use-translation-card-groups.ts` | TanStack Query(削除) |
| `lib/card-learning-statuses.ts` + SQL 内 SRS | `packages/core/src/srs.ts`(単一実装) |
| `lib/local-recordings.ts` | `features/recordings/store.ts`(`diaryEntryId`→`entryId`) |
| `app/design-lab.tsx` ほか試作 5 ファイル(約 5,700 行) | `labs/`(本番バンドル外) |
| `components/generated-practice-preview.tsx` | `features/capture/components/draft-card-list.tsx` |
| `components/app-tabs.web.tsx` / `animated-icon.web.tsx` / `hooks/use-color-scheme.web.ts` ほか `.web.*` 一式 | 削除(Web 非対応の確定、§6.7) |
| `react-native-web` / `react-dom` 依存、`npm run web`、`app.json` の `web` 設定 | 削除(§6.7) |

### 依存パッケージの増減(Phase 0 で実施)

使用箇所は 2026-07-05 時点のコードで grep 調査済み。

**アンインストールする(理由付き)**

| パッケージ | 理由 |
|---|---|
| `nativewind` | スタイリング一本化の決定(§9-7)。v5 preview 版。実コードでの使用なし(コメント内の言及のみ) |
| `tailwindcss` / `@tailwindcss/postcss` | 同上。`postcss.config.mjs` / `src/global.css` / `nativewind-env.d.ts` も同時に削除 |
| `react-native-css` | `src/tw/` からのみ参照。`src/tw/` 自体がどこからも import されていない死コードなので同時に削除 |
| `clsx` | どこからも import されていない(未使用) |
| `tailwind-merge` | どこからも import されていない(未使用) |
| `react-native-web` | Web 非対応の決定(§9-2) |
| `react-dom` | 同上 |
| `@expo/ui` | labs(`workbench.tsx`)でのみ使用。labs 退避(§6.1)と同時に本体依存から削除 |
| `expo-glass-effect` | どこからも import されていない(未使用) |
| `expo-device` | どこからも import されていない(未使用) |
| `overrides.lightningcss`(package.json) | Tailwind 系撤去に伴い版固定が不要になる |

**維持する(削除候補に見えるが消してはいけないもの)**

| パッケージ / ファイル | 理由 |
|---|---|
| `scripts/patch-expo-cli.js`(postinstall) | NativeWind とは無関係。Expo CLI の iOS 実機接続時のログ出力を抑えるパッチ |
| `react-native-url-polyfill` | `@supabase/supabase-js` が必要とする |
| `expo-asset` | 直接 import はないが `app.json` の config plugin として使用 |
| `expo-linking` | 直接 import はないが `expo-router` の peer dependency |
| `expo-web-browser` | ネイティブのアプリ内ブラウザ(外部リンク用)。Web 対応とは無関係 |
| `react-native-nitro-modules` / `react-native-worklets` | それぞれ `react-native-mmkv` / `react-native-reanimated` の基盤 |

**新規導入する**

| パッケージ | 用途 | 導入フェーズ |
|---|---|---|
| `@tanstack/react-query` | サーバー状態管理(§6.2、§9-8) | Phase 2 |
| `zod` | API 契約定義(`packages/contract`、§5.3) | Phase 0(雛形)〜1 |
| `hono` | Edge Function `api` のルーター(§5.3。Deno 側依存) | Phase 1 |
| `@sentry/react-native` | クラッシュ・エラー追跡(§7.3) | Phase 0 |
| `posthog-react-native` | プロダクト分析(§7.3) | Phase 4 |
| `vitest` / `@testing-library/react-native` / `jest-expo` | テスト(§7.1。devDependencies) | Phase 0〜4 |

---

以上。実装に着手する場合は Phase 0 から順に進め、各フェーズの受け入れ基準を満たしてから次へ進むこと。方針(§9)はすべて決定済みなので、そのまま着手してよい。
