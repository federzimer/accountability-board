-- ============================================================
-- Builder's Assembly — Ventures (projects) restructure
-- Introduces a top-level "venture" (business) per member. Goals,
-- the board, and the readiness checklist now all live INSIDE a
-- venture. Each venture runs its own 90-day sprint from start_date.
--   • Leaderboard / weekly check-ins stay PER-PERSON (unchanged).
--   • Existing data is trivial (0 goals, 3 orphan tactics) — backfilled.
-- ============================================================

-- ---------- 1. ventures (projects) ----------
create table if not exists public.projects (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null references public.members(id) on delete cascade,
  name        text not null,
  description text not null default '',
  color       text not null default 'plum',   -- key into goalColors palette
  start_date  date not null default current_date,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists projects_member_idx on public.projects (member_id);

-- ---------- 2. goals belong to a venture ----------
alter table public.goals add column if not exists project_id uuid references public.projects(id) on delete cascade;
create index if not exists goals_project_idx on public.goals (project_id);
-- cycle_id stays (per-person check-in cadence) but is no longer required
alter table public.goals alter column cycle_id drop not null;

-- ---------- 3. tactics belong to a venture ----------
alter table public.tactics add column if not exists project_id uuid references public.projects(id) on delete set null;
create index if not exists tactics_project_idx on public.tactics (project_id);

-- keep tactics.project_id in sync with its goal's venture on insert/update
create or replace function public.set_tactic_project_id()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.goal_id is not null then
    select project_id into new.project_id from public.goals where id = new.goal_id;
  end if;
  return new;
end; $$;

drop trigger if exists tactics_set_project on public.tactics;
create trigger tactics_set_project
  before insert or update on public.tactics
  for each row execute function public.set_tactic_project_id();

-- ---------- 4. readiness is per-venture ----------
alter table public.readiness_items add column if not exists project_id uuid references public.projects(id) on delete cascade;
-- re-key uniqueness from (member, item) -> (venture, item)
alter table public.readiness_items drop constraint if exists readiness_items_member_id_item_key_key;
create unique index if not exists readiness_project_item_uniq
  on public.readiness_items (project_id, item_key);

-- ---------- 5. RLS for ventures ----------
-- Mirrors the rest of the portal: everyone authenticated reads all
-- (directory / accountability); members write own, admin writes all.
alter table public.projects enable row level security;

drop policy if exists projects_select on public.projects;
drop policy if exists projects_write  on public.projects;

create policy projects_select on public.projects
  for select to authenticated using (true);

create policy projects_write on public.projects
  for all to authenticated
  using (
    public.is_admin() or exists (
      select 1 from public.members m
      where m.id = projects.member_id and m.user_id = auth.uid()
    )
  )
  with check (
    public.is_admin() or exists (
      select 1 from public.members m
      where m.id = projects.member_id and m.user_id = auth.uid()
    )
  );

-- ---------- 6. Backfill: give any member with orphan tactics a default venture ----------
insert into public.projects (member_id, name)
select distinct t.member_id, 'My Business'
from public.tactics t
where t.member_id is not null
  and not exists (select 1 from public.projects p where p.member_id = t.member_id);

update public.tactics t
set project_id = p.id
from public.projects p
where t.member_id = p.member_id
  and t.project_id is null;
