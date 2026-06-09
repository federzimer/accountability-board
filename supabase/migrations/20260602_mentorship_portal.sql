-- ============================================================
-- Builder's Assembly — mentorship portal schema
-- Extends the existing board: renames `cards` -> `tactics` and
-- adds members / cycles / goals / weekly_checkins around it.
-- Safe to run once. No data loss (0 cards currently).
-- ============================================================

-- ---------- 1. tactic status enum ----------
-- NOTE: keeps the existing value `working_on` (the KanbanBoard column id),
-- NOT `working`, so the current board keeps working untouched.
do $$ begin
  create type public.tactic_status as enum ('committed','working_on','completed','blocked');
exception when duplicate_object then null; end $$;

-- ---------- 2. members ----------
create table if not exists public.members (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null unique references auth.users(id) on delete cascade,
  name        text not null default '',
  email       text not null,
  avatar_url  text,
  role        text not null default 'member',   -- 'member' | 'admin'
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ---------- 3. cycles (90-day periods) ----------
create table if not exists public.cycles (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  start_date  date not null,
  end_date    date not null,
  is_current  boolean not null default false,
  created_at  timestamptz not null default now()
);
-- at most one current cycle
create unique index if not exists cycles_one_current
  on public.cycles (is_current) where is_current;

-- ---------- 4. goals ----------
create table if not exists public.goals (
  id            uuid primary key default gen_random_uuid(),
  member_id     uuid not null references public.members(id) on delete cascade,
  cycle_id      uuid not null references public.cycles(id) on delete cascade,
  title         text not null,
  why           text not null default '',
  target_metric text not null default '',
  target_value  numeric,
  current_value numeric not null default 0,
  status        text not null default 'active',  -- 'active' | 'achieved' | 'missed'
  created_at    timestamptz not null default now()
);
create index if not exists goals_member_cycle_idx on public.goals (member_id, cycle_id);

-- ---------- 5. tactics (rename of `cards` + new columns) ----------
alter table if exists public.cards rename to tactics;

alter table public.tactics add column if not exists goal_id     uuid references public.goals(id)   on delete set null;
alter table public.tactics add column if not exists member_id   uuid references public.members(id) on delete cascade;
alter table public.tactics add column if not exists week_number integer;

-- convert status text -> enum (safe: 0 rows / all values already valid)
alter table public.tactics alter column status drop default;
alter table public.tactics alter column status type public.tactic_status using status::public.tactic_status;
alter table public.tactics alter column status set default 'committed';

-- ---------- 6. weekly_checkins ----------
create table if not exists public.weekly_checkins (
  id                uuid primary key default gen_random_uuid(),
  member_id         uuid not null references public.members(id) on delete cascade,
  cycle_id          uuid not null references public.cycles(id) on delete cascade,
  week_number       integer not null,
  tactics_committed integer not null default 0,
  tactics_completed integer not null default 0,
  score             numeric,                 -- completed / committed * 100
  reflection        text not null default '',
  created_at        timestamptz not null default now(),
  unique (member_id, cycle_id, week_number)
);

-- ============================================================
-- Helper functions
-- ============================================================

-- admin check (federico is seeded as admin below; role-based thereafter)
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.members m
    where m.user_id = auth.uid() and m.role = 'admin'
  );
$$;

-- auto-fill tactics.member_id from the owning member (keeps existing
-- KanbanBoard insert — which sets only user_id — working unchanged)
create or replace function public.set_tactic_member_id()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.member_id is null then
    select id into new.member_id from public.members where user_id = new.user_id;
  end if;
  return new;
end; $$;

drop trigger if exists tactics_set_member on public.tactics;
create trigger tactics_set_member
  before insert or update on public.tactics
  for each row execute function public.set_tactic_member_id();

-- auto-provision a member row whenever a new auth user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.members (user_id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(nullif(split_part(new.email,'@',1),''), 'Member'),
    case when new.email = 'federico@blackbirdhm.com' then 'admin' else 'member' end
  )
  on conflict (user_id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- Row Level Security
--   read: any authenticated user can SEE everyone (directory/leaderboard)
--   write: members edit only their own; admin (federico) edits all
-- ============================================================
alter table public.members         enable row level security;
alter table public.cycles          enable row level security;
alter table public.goals           enable row level security;
alter table public.tactics         enable row level security;
alter table public.weekly_checkins enable row level security;

-- members
create policy members_select on public.members for select to authenticated using (true);
create policy members_insert on public.members for insert to authenticated with check (user_id = auth.uid() or public.is_admin());
create policy members_update on public.members for update to authenticated using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());
create policy members_delete on public.members for delete to authenticated using (public.is_admin());

-- cycles (admin-managed; everyone reads)
create policy cycles_select on public.cycles for select to authenticated using (true);
create policy cycles_admin  on public.cycles for all   to authenticated using (public.is_admin()) with check (public.is_admin());

-- goals
create policy goals_select on public.goals for select to authenticated using (true);
create policy goals_write  on public.goals for all to authenticated
  using (public.is_admin() or exists (select 1 from public.members m where m.id = goals.member_id and m.user_id = auth.uid()))
  with check (public.is_admin() or exists (select 1 from public.members m where m.id = goals.member_id and m.user_id = auth.uid()));

-- tactics  (REPLACES the old own-only SELECT: now everyone sees all boards)
drop policy if exists "Users can view their own cards"   on public.tactics;
drop policy if exists "Users can insert their own cards" on public.tactics;
drop policy if exists "Users can update their own cards" on public.tactics;
drop policy if exists "Users can delete their own cards" on public.tactics;
create policy tactics_select on public.tactics for select to authenticated using (true);
create policy tactics_insert on public.tactics for insert to authenticated with check (user_id = auth.uid() or public.is_admin());
create policy tactics_update on public.tactics for update to authenticated using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());
create policy tactics_delete on public.tactics for delete to authenticated using (user_id = auth.uid() or public.is_admin());

-- weekly_checkins
create policy checkins_select on public.weekly_checkins for select to authenticated using (true);
create policy checkins_write  on public.weekly_checkins for all to authenticated
  using (public.is_admin() or exists (select 1 from public.members m where m.id = weekly_checkins.member_id and m.user_id = auth.uid()))
  with check (public.is_admin() or exists (select 1 from public.members m where m.id = weekly_checkins.member_id and m.user_id = auth.uid()));

-- ============================================================
-- Seed: backfill existing users + current cycle
-- ============================================================
insert into public.members (user_id, email, name, role)
select u.id, u.email,
       coalesce(nullif(split_part(u.email,'@',1),''),'Member'),
       case when u.email = 'federico@blackbirdhm.com' then 'admin' else 'member' end
from auth.users u
on conflict (user_id) do nothing;

insert into public.cycles (name, start_date, end_date, is_current)
select 'Q2 2026', date '2026-04-01', date '2026-06-30', true
where not exists (select 1 from public.cycles);
