# API Specification

`openapi.json` is the OpenAPI specification for the Just Speak It Supabase Edge Function `api`.

This specification only covers the write-side API used directly by the app. Read models are served through Supabase PostgREST and are intentionally out of scope.

## Usage

To open the spec in Swagger UI, run:

```bash
npx --yes swagger-ui-watcher docs/openapi.json --port 8011
```

Then open:

```text
http://127.0.0.1:8011
```

Swagger UI can send real requests with the "Try it out" button. Use a non-production Supabase project if you do not want to mutate real data.

To view the API reference with Redoc, generate a static HTML file and open it in your browser.

```bash
npx --yes @redocly/cli build-docs docs/openapi.json -o /tmp/just-speak-it-api.html
open /tmp/just-speak-it-api.html
```

To lint the OpenAPI file, run:

```bash
npx --yes @redocly/cli lint docs/openapi.json
```

For the app-faithful Postman demo, import the dedicated collection and environment template instead of generating a collection from this file.

```text
docs/postman/just-speak-it.postman_collection.json
docs/postman/just-speak-it.postman_environment.json
```

The dedicated collection includes anonymous auth, scenario-specific variable handoff, and state-transition tests. See `docs/postman/README.md` for the manual run order.

If you import `docs/openapi.json` directly for ad-hoc requests, create an environment with these variables.

| Variable | Value |
| --- | --- |
| `supabaseUrl` | Same value as `EXPO_PUBLIC_SUPABASE_URL` |
| `apikey` | Supabase publishable key |
| `bearerToken` | Supabase Auth access token |

Set these request headers in Postman.

```text
apikey: {{apikey}}
Authorization: Bearer {{bearerToken}}
```

## Swagger UI Authorization

Swagger UI uses the security schemes in `openapi.json`. Click "Authorize" and enter:

| Field | Value |
| --- | --- |
| `SupabaseApiKey` | Supabase publishable key |
| `SupabaseBearer` | Supabase Auth access token |

To create an anonymous Supabase Auth session from the terminal, set these environment variables first:

```bash
export SUPABASE_URL="https://PROJECT_REF.supabase.co"
export SUPABASE_PUBLISHABLE_KEY="..."
```

Then request a session:

```bash
curl -s "$SUPABASE_URL/auth/v1/signup" \
  -H "apikey: $SUPABASE_PUBLISHABLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"data":{}}'
```

Copy the `access_token` from the response and paste it into `SupabaseBearer`.

## Endpoints

| Endpoint | Purpose |
| --- | --- |
| `POST /functions/v1/api/transcriptions` | Transcribe Japanese audio and clean the Japanese text |
| `POST /functions/v1/api/generations` | Split Japanese text, or split and translate it with `mode: auto` |
| `POST /functions/v1/api/generations/:id/translate` | Translate approved Japanese draft cards into English |
| `POST /functions/v1/api/generations/:id/discard` | Discard a draft |
| `POST /functions/v1/api/cards/:id/reviews` | Save a review result |
| `POST /functions/v1/api/cards/:id/reviews/undo` | Undo the latest review |

## Update Policy

The API implementation in `supabase/functions/api/index.ts` and the request / response schemas in `packages/contract/src/index.ts` are the source of truth.

When a route or Zod schema changes, update `openapi.json` in the same change.
