-- Margin: per-student data with row-level security.
-- Each table stores one JSON document per record, owned by auth.users.
-- Run in the Supabase SQL editor (or `supabase db push`).

do $$
declare t text;
begin
  foreach t in array array[
    'courses','assignments','exams','projects','clubs','events','study_sessions','holidays'
  ] loop
    execute format($f$
      create table if not exists public.%1$I (
        id uuid primary key,
        user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
        data jsonb not null,
        updated_at timestamptz not null default now()
      )$f$, t);
    execute format('create index if not exists %1$I on public.%2$I (user_id)', t || '_user_idx', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format($f$
      create policy "own rows" on public.%1$I for all to authenticated
      using (user_id = auth.uid()) with check (user_id = auth.uid())$f$, t);
  end loop;
end $$;

-- One preferences row per student (id = user id).
create table if not exists public.preferences (
  id uuid primary key references auth.users(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  check (id = user_id)
);
alter table public.preferences enable row level security;
drop policy if exists "own prefs" on public.preferences;
create policy "own prefs" on public.preferences for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
