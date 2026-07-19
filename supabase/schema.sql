-- Content Generator: schema for `content_generations`.
-- Run this once in the Supabase SQL editor (Project → SQL Editor → New query).
-- Reuses the same Supabase project as other apps; this table is independent.

create table if not exists public.content_generations (
  id uuid primary key default gen_random_uuid(),
  product_name text not null,
  features text not null,
  tone text not null,
  seo_description text not null,
  social_posts jsonb not null,   -- [{ "label": "Instagram", "text": "..." }, ...]
  source text not null default 'mock' check (source in ('mock', 'anthropic')),
  created_at timestamptz not null default now()
);

create index if not exists content_generations_created_at_idx
  on public.content_generations (created_at desc);

alter table public.content_generations enable row level security;

-- The /history page reads generations with the publishable (anon) key.
drop policy if exists "Public can read generations" on public.content_generations;
create policy "Public can read generations"
  on public.content_generations for select
  to anon
  using (true);

-- Writes happen only in the Server Action using the secret (service-role) key,
-- which bypasses RLS entirely. No insert policy is defined for anon on purpose.


-- Brand voice profiles: reusable tone-of-voice presets a user defines once and
-- selects on the generator form instead of picking a tone by hand.
create table if not exists public.brand_voices (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null,
  example_phrases jsonb not null default '[]'::jsonb,  -- string[]
  avoid_words jsonb not null default '[]'::jsonb,       -- string[]
  created_at timestamptz not null default now()
);

create index if not exists brand_voices_created_at_idx
  on public.brand_voices (created_at desc);

alter table public.brand_voices enable row level security;

-- The generator form and /brand-voice page read profiles with the anon key.
drop policy if exists "Public can read brand voices" on public.brand_voices;
create policy "Public can read brand voices"
  on public.brand_voices for select
  to anon
  using (true);

-- Creating and deleting profiles happens only in Server Actions using the
-- service-role key. No anon insert/delete policy is defined on purpose.
