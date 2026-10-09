-- ═══════════════════════════════════════════════════════════════════
--  FocusMirror · Supabase schema
--  Run once:  Supabase Dashboard → SQL Editor → New query → Run
--  Safe to re-run (uses IF NOT EXISTS / OR REPLACE throughout).
-- ═══════════════════════════════════════════════════════════════════

-- ─────────────── 1. TABLES ───────────────

-- Public-facing identity. Readable by everyone (the leaderboard needs names).
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text not null default 'Student',
  school        text,                         -- optional: for class leaderboards
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Aggregate progression. Also public — this is what the leaderboard ranks on.
create table if not exists public.user_stats (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  xp             integer not null default 0  check (xp >= 0),
  level          integer not null default 1  check (level >= 1),
  streak         integer not null default 0  check (streak >= 0),
  best_streak    integer not null default 0,
  total_sessions integer not null default 0,
  total_minutes  integer not null default 0,
  best_score     integer not null default 0  check (best_score between 0 and 100),
  badges         jsonb   not null default '[]'::jsonb,
  checkpoints    jsonb   not null default '[]'::jsonb,
  weekly_xp      integer not null default 0,
  week_start     date    not null default date_trunc('week', now())::date,
  updated_at     timestamptz not null default now()
);

-- Individual session history. PRIVATE — only the owner can read their own.
create table if not exists public.sessions (
  id             bigserial primary key,
  user_id        uuid not null references auth.users(id) on delete cascade,
  method         text not null,
  score          integer check (score between 0 and 100),
  duration_min   integer not null default 0 check (duration_min between 0 and 600),
  xp_earned      integer not null default 0 check (xp_earned between 0 and 500),
  fatigue_rating integer check (fatigue_rating between 1 and 5),
  created_at     timestamptz not null default now()
);
alter table public.sessions
  add column if not exists fatigue_rating integer
  check (fatigue_rating between 1 and 5);
create index if not exists sessions_user_idx
  on public.sessions (user_id, created_at desc);
create index if not exists stats_xp_idx
  on public.user_stats (xp desc);
create index if not exists stats_weekly_idx
  on public.user_stats (weekly_xp desc);


-- ─────────────── 2. AUTO-CREATE ROWS ON SIGNUP ───────────────
-- Without this, a new user has no profile/stats row and the app 404s.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'display_name'), ''),
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;

  insert into public.user_stats (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ─────────────── 3. ANTI-CHEAT GUARD ───────────────
-- The browser writes its own XP, so a determined user could POST a fake number.
-- This trigger makes XP monotonic and caps any single jump. It is a DETERRENT,
-- not real security — see the note at the bottom of this file.

create or replace function public.guard_stats_update()
returns trigger
language plpgsql
as $$
begin
  if new.xp < old.xp then
    new.xp := old.xp;                       -- XP may never decrease
  end if;
  if new.xp - old.xp > 500 then
    new.xp := old.xp + 500;                 -- no single write may add > 500 XP
  end if;
  if new.best_score > 100 then
    new.best_score := 100;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists stats_guard on public.user_stats;
create trigger stats_guard
  before update on public.user_stats
  for each row execute function public.guard_stats_update();


-- ─────────────── 4. ROW LEVEL SECURITY ───────────────
-- Without RLS, ANYONE with the (public) anon key can read and overwrite
-- every row in these tables. This section is not optional.

alter table public.profiles   enable row level security;
alter table public.user_stats enable row level security;
alter table public.sessions   enable row level security;

-- profiles ──────────────────────────────────────────
drop policy if exists "profiles public read"   on public.profiles;
drop policy if exists "profiles owner insert"  on public.profiles;
drop policy if exists "profiles owner update"  on public.profiles;

create policy "profiles public read"
  on public.profiles for select
  to anon, authenticated
  using (true);

create policy "profiles owner insert"
  on public.profiles for insert
  to authenticated
  with check ((select auth.uid()) = id);

create policy "profiles owner update"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- user_stats ────────────────────────────────────────
drop policy if exists "stats public read"  on public.user_stats;
drop policy if exists "stats owner insert" on public.user_stats;
drop policy if exists "stats owner update" on public.user_stats;

create policy "stats public read"
  on public.user_stats for select
  to anon, authenticated
  using (true);

create policy "stats owner insert"
  on public.user_stats for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "stats owner update"
  on public.user_stats for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- sessions (private) ────────────────────────────────
drop policy if exists "sessions owner read"   on public.sessions;
drop policy if exists "sessions owner insert" on public.sessions;
drop policy if exists "sessions owner delete" on public.sessions;

create policy "sessions owner read"
  on public.sessions for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "sessions owner insert"
  on public.sessions for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "sessions owner delete"
  on public.sessions for delete
  to authenticated
  using ((select auth.uid()) = user_id);


-- ─────────────── 5. LEADERBOARD VIEW ───────────────
-- A view, not a table: it can't drift out of sync and there's nothing extra
-- to write to. security_invoker means the underlying RLS still applies.

drop view if exists public.leaderboard;
create view public.leaderboard
with (security_invoker = on) as
select
  p.id,
  p.display_name,
  p.school,
  s.xp,
  s.level,
  s.streak,
  s.best_score,
  s.total_sessions,
  s.weekly_xp,
  s.week_start
from public.profiles p
join public.user_stats s on s.user_id = p.id;

grant select on public.leaderboard to anon, authenticated;


-- ─────────────── 6. VERIFY ───────────────
-- Run these after the script; every table must show rowsecurity = true.
--
--   select tablename, rowsecurity from pg_tables
--   where schemaname = 'public'
--     and tablename in ('profiles','user_stats','sessions');
--
--   select * from public.leaderboard order by xp desc limit 10;


-- ═══════════════════════════════════════════════════════════════════
--  HONEST SECURITY NOTE
--  RLS guarantees a user can only write to THEIR OWN row. It does not
--  guarantee the VALUE is truthful — the browser is untrusted, so a user
--  could still write an inflated XP to their own row (the guard above
--  slows this to +500 per request).
--
--  For a leaderboard that is competitively trustworthy (e.g. real school
--  use with prizes), XP must be computed server-side from the `sessions`
--  table via a Postgres function / Edge Function, with user_stats made
--  read-only to clients. Say the word and I'll write that version.
-- ═══════════════════════════════════════════════════════════════════
