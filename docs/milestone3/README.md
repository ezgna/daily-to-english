# Milestone 3 発表資料

Milestone 3 はバックエンド実装の説明が中心です。指定タスク
`019f4484-1ded-7a63-b29c-13c6110bf980` で確認した要件に合わせ、既存資料をこのページから参照できるようにまとめています。

## 必須資料

| 要件 | 使用する資料 | 用途 |
| --- | --- | --- |
| 低レベル設計図 | [`../architecture/just-speak-it-low-level-overview.png`](../architecture/just-speak-it-low-level-overview.png) | システム構成の説明と画面共有 |
| 編集可能な設計図 | [`../architecture/just-speak-it-low-level.drawio`](../architecture/just-speak-it-low-level.drawio) | diagrams.netでの修正 |
| 設計図の説明順 | [`../architecture/README.md`](../architecture/README.md) | 書込、OpenAI連携、読取経路の順に説明 |
| Postmanコレクション | [`../postman/just-speak-it.postman_collection.json`](../postman/just-speak-it.postman_collection.json) | APIのライブデモ |
| Postman環境テンプレート | [`../postman/just-speak-it.postman_environment.json`](../postman/just-speak-it.postman_environment.json) | URLと公開キーの設定 |
| Postman実行手順 | [`../postman/README.md`](../postman/README.md) | リクエストの実行順と確認点 |
| OpenAPI仕様 | [`../openapi.json`](../openapi.json) | API契約とエンドポイント一覧 |
| OpenAPI利用手順 | [`../api-openapi.md`](../api-openapi.md) | Swagger UIまたはRedocでの表示 |

## 発表の流れ

### 1. アプリの目的

Just Speak Itは、日本語のテキストや音声を、実際に話すための英語練習カードへ変換するモバイルアプリです。

### 2. 低レベル設計図

設計図を開き、次の順で説明します。

1. ExpoアプリがSupabase Authで匿名セッションを作る。
2. 書込操作はSupabase Edge Functionの単一APIへ送る。
3. Edge FunctionがJWTを検証し、OpenAI APIで文字起こし、整形、分割、翻訳を行う。
4. Edge Functionがservice roleとユーザーIDを使ってPostgreSQLへ保存する。
5. ExpoアプリはPostgRESTとRLSを通して保存済みデータを読み取る。
6. 音声本体はクラウドへ保存せず、設定時だけ端末内に保存する。

### 3. Postmanライブデモ

時間が限られる場合は、次のテキスト生成フローを優先します。

1. `00 Setup / Create anonymous session`
2. `01 Text - Create cards / 1. Create Japanese draft`
3. レスポンスの`cards[].ja`を確認
4. `01 Text - Create cards / 2. Translate approved draft`
5. レスポンスの`cards[].en`を確認

この流れで、認証、Edge Function、OpenAI、DB保存、レスポンス返却をまとめて示せます。

余裕がある場合は、`03 Voice - Create cards`で音声の文字起こしからカード生成までを見せます。音声ファイルは事前にPostmanの`audio`へ設定します。

### 4. コードウォークスルー

次の順で実コードを開きます。

1. [`../../supabase/functions/api/index.ts`](../../supabase/functions/api/index.ts)
   - `/generations`または`/transcriptions`のルート
   - JWT検証とユーザー特定
   - OpenAI呼び出し
   - DBへの保存とレスポンス返却
2. [`../../packages/contract/src/index.ts`](../../packages/contract/src/index.ts)
   - Zodによるrequest/response契約
3. [`../../shared/api/client.ts`](../../shared/api/client.ts)
   - ExpoアプリからEdge Functionを呼ぶ書込経路
4. [`../../shared/api/read-models.ts`](../../shared/api/read-models.ts)
   - PostgRESTとRLSを使う読取経路

## デモ前チェック

- Postmanへコレクションと環境テンプレートをimportした。
- `supabaseUrl`と`apikey`を選択中の環境へ設定した。
- 実値入りの環境ファイルをexport、commitしていない。
- `Create anonymous session`が成功し、`bearerToken`が環境へ保存された。
- テキスト生成フローを発表前に一度だけ通した。
- 音声デモを行う場合は、日本語音声ファイルを選択済み。
- デモによって実DBのデータが変わることを把握している。
- API障害に備え、低レベル設計図と成功レスポンスの表示状態を残している。

## 補足

- PowerPointは必須ではありません。設計図、Postman、実コードの3画面で要件を満たせます。
- Swagger UIはAPI仕様の補助表示です。実アプリと同じ認証や状態遷移を見せる場合は、専用Postmanコレクションを使います。
- 指定タスクの文字起こしでは、発表日が7月22日と23日で揺れています。最終日程はCanvasのannouncementで確認します。
