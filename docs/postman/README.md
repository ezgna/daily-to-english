# Postman API Demo

実アプリのユーザーフローに合わせて、Just Speak It APIを手動で確認するためのPostmanコレクションです。

## Import

Postmanで次の2ファイルをImportします。

1. `just-speak-it.postman_collection.json`
2. `just-speak-it.postman_environment.json`

`Just Speak It API - Local Template`環境を選択し、次だけをローカルで設定します。

| 変数 | 値 |
| --- | --- |
| `supabaseUrl` | `EXPO_PUBLIC_SUPABASE_URL`と同じURL |
| `apikey` | Supabase publishable key |

実値を入れた環境ファイルはexportまたはcommitしないでください。認証トークンは`00 Setup`のレスポンスから選択中の環境へ保存されます。

## 実行方法

Collection Runnerで全件を一括実行しません。実アプリと同じ確認点を残すため、各シナリオを個別に`Send`します。

最初に一度だけ実行します。

1. `00 Setup / Create anonymous session`

### テキストからカードを作る

1. `01 Text - Create cards / 1. Create Japanese draft`
2. Bodyの`rawText`と`cleanText`を任意の日本語へ変更して`Send`
3. レスポンスの`cards[].ja`を確認
4. 問題なければ`2. Translate approved draft`を`Send`
5. レスポンスの`cards[].en`を確認

### 下書きを破棄する

1. `02 Text - Discard draft / 1. Create draft to discard`
2. レスポンスの日本語カードを確認
3. `2. Discard draft`を`Send`

### 音声からカードを作る

1. `03 Voice - Create cards / 1. Transcribe Japanese audio`の`audio`に日本語音声ファイルを設定
2. `Send`して`rawText`、`cleanText`、`words`を確認
3. `2. Generate cards from transcription`を`Send`
4. レスポンスの`cards[].ja`と`cards[].en`を確認

Postmanではアプリが収集するwaveform peakを生成しないため、音声デモの`waveform`は空配列です。

### 復習する

カード生成とは別のシナリオです。直近で生成した先頭カードの`reviewCardId`を使用します。

1. `04 Review / Review selected card`
2. 必要な場合だけ`Undo latest review`

レビューのBodyに指定できる`rating`は`good`または`again`です。

## 副作用

すべて実際のSupabase Edge Functionを呼び出します。

- generationはDBへentry、generation、cardを作成します。
- split、translate、transcriptionはOpenAI APIを呼び出します。
- discardは下書きを破棄状態にします。
- reviewとundoは復習履歴とカード状態を更新します。

本番データを変更したくない場合はstaging projectを使用してください。

## 正本

- API実装: `supabase/functions/api/index.ts`
- Zod契約: `packages/contract/src/index.ts`
- OpenAPI: `docs/openapi.json`
- Postman固有の実行順・変数保存・テスト: このディレクトリのcollection JSON

Postman Cloudのworkspace固有ファイルや、実値入りenvironmentはリポジトリで管理しません。
