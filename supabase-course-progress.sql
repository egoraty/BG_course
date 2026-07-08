-- Optional Supabase table for account-bound course progress.
-- Run this once in Supabase SQL Editor if you want progress stored in a database table.
-- The site also falls back to Supabase Auth user metadata when this table does not exist.

create table if not exists public.course_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  progress_map jsonb not null default '{}'::jsonb,
  lesson_index integer not null default 0,
  lesson_scroll_map jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.course_progress enable row level security;

drop policy if exists "Users can read own course progress" on public.course_progress;
drop policy if exists "Users can insert own course progress" on public.course_progress;
drop policy if exists "Users can update own course progress" on public.course_progress;
drop policy if exists "Users can delete own course progress" on public.course_progress;

create policy "Users can read own course progress"
on public.course_progress
for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert own course progress"
on public.course_progress
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update own course progress"
on public.course_progress
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own course progress"
on public.course_progress
for delete
to authenticated
using (auth.uid() = user_id);
