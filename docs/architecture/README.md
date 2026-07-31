# Just Speak It low-level diagrams

`just-speak-it-low-level.drawio` が編集用の正本です。diagrams.netで開くと、Low-level Diagramが1ページだけ入っています。

## 発表時の順番

1. ExpoからSupabaseへ入る書込経路を説明する。
2. Edge FunctionからOpenAIとPostgreSQLへ進む処理を説明する。
3. Expoの読取がPostgRESTとRLSを通る別経路であることを説明する。

図は2026-07-14時点のworking treeを基準にしている。

## 実装上の正本

- Write API: `supabase/functions/api/index.ts`
- Client API: `shared/api/client.ts`
- Read models: `shared/api/read-models.ts`
- Contract: `packages/contract/src/index.ts`
- Database: `supabase/migrations/20260705000000_rebuild_schema_v2.sql`
