-- ============================================================
-- Life Goals — the "why" layer ABOVE ventures (about the person).
-- Vision / Goals / Values. Ventures link (many-to-many) to the life
-- goals they serve, so 90-day work ladders up to broader direction.
-- ============================================================

create table if not exists public.life_goals (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null references public.members(id) on delete cascade,
  kind        text not null default 'goal',   -- vision | goal | value
  title       text not null,
  description text not null default '',
  position    integer not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists life_goals_member_idx on public.life_goals (member_id, kind, position);

alter table public.life_goals enable row level security;
drop policy if exists life_goals_select on public.life_goals;
drop policy if exists life_goals_write  on public.life_goals;
create policy life_goals_select on public.life_goals
  for select to authenticated using (true);
create policy life_goals_write on public.life_goals
  for all to authenticated
  using (public.is_admin() or exists (select 1 from public.members m where m.id = life_goals.member_id and m.user_id = auth.uid()))
  with check (public.is_admin() or exists (select 1 from public.members m where m.id = life_goals.member_id and m.user_id = auth.uid()));

-- ---------- venture ↔ life goal (many-to-many) ----------
create table if not exists public.project_life_goals (
  project_id   uuid not null references public.projects(id) on delete cascade,
  life_goal_id uuid not null references public.life_goals(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (project_id, life_goal_id)
);

alter table public.project_life_goals enable row level security;
drop policy if exists plg_select on public.project_life_goals;
drop policy if exists plg_write  on public.project_life_goals;
create policy plg_select on public.project_life_goals
  for select to authenticated using (true);
-- write if you own the venture being linked (or admin)
create policy plg_write on public.project_life_goals
  for all to authenticated
  using (
    public.is_admin() or exists (
      select 1 from public.projects p join public.members m on m.id = p.member_id
      where p.id = project_life_goals.project_id and m.user_id = auth.uid()
    )
  )
  with check (
    public.is_admin() or exists (
      select 1 from public.projects p join public.members m on m.id = p.member_id
      where p.id = project_life_goals.project_id and m.user_id = auth.uid()
    )
  );
