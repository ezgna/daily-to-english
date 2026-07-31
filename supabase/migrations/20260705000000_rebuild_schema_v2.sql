do $$
declare
  routine record;
begin
  for routine in
    select p.oid::regprocedure::text as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'save_practice_draft',
        'claim_practice_generation',
        'complete_practice_generation',
        'fail_practice_generation',
        'discard_practice_generation',
        'set_translation_card_learning_status',
        'restore_translation_card_learning_progress',
        'get_backend_schema_generation',
        'set_backend_schema_generation',
        'touch_updated_at',
        'handle_new_user'
      )
  loop
    execute 'drop function if exists ' || routine.signature || ' cascade';
  end loop;
end $$;

drop table if exists public.review_events cascade;
drop table if exists public.usage_events cascade;
drop table if exists public.cards cascade;
drop table if exists public.generations cascade;
drop table if exists public.entries cascade;
drop table if exists public.profiles cascade;
drop table if exists public.translation_cards cascade;
drop table if exists public.practice_generations cascade;
drop table if exists public.diary_entries cascade;
drop table if exists public.backend_schema_generation cascade;

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null check (source in ('voice', 'text')),
  raw_text text not null,
  clean_text text not null,
  is_edited boolean not null default false,
  summary jsonb not null default '[]'::jsonb check (jsonb_typeof(summary) = 'array'),
  transcript jsonb not null default '[]'::jsonb check (jsonb_typeof(transcript) = 'array'),
  waveform jsonb not null default '[]'::jsonb check (jsonb_typeof(waveform) = 'array'),
  content_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id)
);

create table public.generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entry_id uuid not null,
  idempotency_key text not null,
  split_policy text not null check (split_policy in ('meaning_unit', 'small_steps')),
  translation_style text not null default 'simple' check (translation_style in ('native', 'simple')),
  status text not null default 'split' check (status in ('split', 'translating', 'completed', 'failed', 'discarded')),
  error jsonb,
  model_info jsonb not null default '{}'::jsonb,
  claimed_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id),
  unique (user_id, idempotency_key),
  foreign key (user_id, entry_id) references public.entries (user_id, id) on delete cascade
);

create table public.cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  generation_id uuid not null,
  position integer not null,
  ja text not null,
  en text,
  word_start integer,
  word_end integer,
  audio_start_sec double precision,
  audio_end_sec double precision,
  srs_status text not null default 'new' check (srs_status in ('new', 'learning', 'known')),
  review_count integer not null default 0,
  success_streak integer not null default 0,
  last_reviewed_at timestamptz,
  due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id),
  unique (generation_id, position),
  foreign key (user_id, generation_id) references public.generations (user_id, id) on delete cascade,
  check (word_start is null or word_end is null or word_start <= word_end),
  check (audio_start_sec is null or audio_end_sec is null or audio_start_sec <= audio_end_sec)
);

create table public.review_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id uuid not null,
  rating text not null check (rating in ('again', 'good')),
  reviewed_at timestamptz not null default now(),
  undone_at timestamptz,
  foreign key (user_id, card_id) references public.cards (user_id, id) on delete cascade
);

create table public.usage_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('transcribe', 'clean', 'split', 'translate')),
  model text not null,
  input_tokens integer,
  output_tokens integer,
  audio_seconds double precision,
  created_at timestamptz not null default now()
);

create index entries_user_created_idx on public.entries (user_id, created_at desc, id desc);
create index generations_user_status_idx on public.generations (user_id, status, updated_at desc);
create index generations_user_entry_idx on public.generations (user_id, entry_id, created_at desc);
create index cards_user_due_idx on public.cards (user_id, due_at nulls first, id) where en is not null;
create index cards_generation_idx on public.cards (generation_id, position);
create index cards_user_generation_idx on public.cards (user_id, generation_id);
create index review_events_card_idx on public.review_events (card_id, reviewed_at desc);
create index review_events_user_idx on public.review_events (user_id, reviewed_at desc);
create index usage_events_user_day_idx on public.usage_events (user_id, created_at desc);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at
before update on public.profiles
for each row execute function public.touch_updated_at();

create trigger entries_touch_updated_at
before update on public.entries
for each row execute function public.touch_updated_at();

create trigger generations_touch_updated_at
before update on public.generations
for each row execute function public.touch_updated_at();

create trigger cards_touch_updated_at
before update on public.cards
for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.entries enable row level security;
alter table public.generations enable row level security;
alter table public.cards enable row level security;
alter table public.review_events enable row level security;
alter table public.usage_events enable row level security;

create policy profiles_select_own on public.profiles
for select to authenticated
using ((select auth.uid()) = user_id);

create policy entries_select_own on public.entries
for select to authenticated
using ((select auth.uid()) = user_id);

create policy generations_select_own on public.generations
for select to authenticated
using ((select auth.uid()) = user_id);

create policy cards_select_own on public.cards
for select to authenticated
using ((select auth.uid()) = user_id);

create policy review_events_select_own on public.review_events
for select to authenticated
using ((select auth.uid()) = user_id);

create policy usage_events_select_own on public.usage_events
for select to authenticated
using ((select auth.uid()) = user_id);

grant usage on schema public to authenticated;
grant select on
  public.profiles,
  public.entries,
  public.generations,
  public.cards,
  public.review_events,
  public.usage_events
to authenticated;

create or replace view public.daily_usage
with (security_invoker = true) as
select
  user_id,
  date_trunc('day', created_at) as usage_day,
  kind,
  count(*) as call_count,
  sum(coalesce(input_tokens, 0)) as input_tokens,
  sum(coalesce(output_tokens, 0)) as output_tokens,
  sum(coalesce(audio_seconds, 0)) as audio_seconds
from public.usage_events
group by user_id, date_trunc('day', created_at), kind;

grant select on public.daily_usage to authenticated;
