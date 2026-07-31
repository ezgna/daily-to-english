# Just Speak It

日本語のひとことや日記を、話せる英語の練習カードに変換するモバイルアプリです。

## 機能

- テキスト入力または音声録音から日本語の練習素材を作成
- Supabase Edge Functions と OpenAI API で自然な英語カードを生成
- 生成前の下書きカードを確認してから保存
- 保存した英語カードを復習

## 技術スタック

- Expo
- React Native
- Supabase
- OpenAI API
- TanStack Query
- Zod

## 開発

```bash
npm install
npm run start
```

アプリの環境変数はルートの `.env.local` に設定します。

```bash
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Edge Functions 側には `OPENAI_API_KEY` を設定します。テキスト生成モデルを変える場合は
`OPENAI_TEXT_MODEL`、文字起こしモデルを変える場合は `OPENAI_STT_MODEL` も設定できます。

Supabase の DB 反映は hosted project に対して行います。DB パスワードは repo 外の secret file から環境変数として読み込んでください。

```bash
set -a
source path/to/supabase.env
set +a
supabase db push --yes
```

このプロジェクトは開発中のため、DB schema は破壊的 migration で作り直す運用です。DB を反映したら remote project から型を再生成します。

```bash
npm run db:types
```

Functions を反映するときは次を使います。

```bash
npm run functions:deploy
```

## DB/API 契約

- `entries`: 原文、整形済み本文、箇条書き、音声 word timestamp、waveform を保持します。
- `generations`: Split/Translate の生成単位です。`idempotency_key` と `status` で復元・冪等性・破棄を管理します。
- `cards`: 日本語/英語カード、音声 timestamp、SRS の導出状態を保持します。
- `review_events`: 復習履歴を追記し、Undo は `undone_at` で打ち消します。
- `usage_events`: OpenAI 呼び出しと利用回数制限の基盤です。
- アプリからの insert/update/delete は単一 Edge Function `api` 経由です。通常のクライアント権限は select のみに寄せます。
