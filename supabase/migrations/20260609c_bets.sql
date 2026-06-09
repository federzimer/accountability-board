-- ============================================================
-- Builder's Assembly — Bets (prioritized, persistent)
-- A "bet" is a candidate direction surfaced in the goal wizard's brainstorm.
-- Instead of picking one and discarding the rest, the wizard now shortlists
-- and RANKS several bets, persists all of them, promotes the top one(s) into
-- 90-day goals, and keeps the others as a ranked backlog ("next up").
-- ============================================================

create table if not exists public.bets (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references public.projects(id) on delete cascade,
  member_id      uuid not null references public.members(id) on delete cascade,
  cycle_id       uuid references public.cycles(id) on delete set null,
  title          text not null,
  note           text not null default '',          -- one-sentence bet / context
  rank           integer not null default 0,        -- 1 = top priority
  status         text not null default 'backlog',   -- backlog | promoted | dropped
  source_idea_id uuid references public.ideas(id) on delete set null,
  goal_id        uuid references public.goals(id) on delete set null, -- set when promoted
  created_at     timestamptz not null default now()
);
create index if not exists bets_project_idx on public.bets (project_id, rank);

-- ---------- RLS (same pattern as goals/readiness) ----------
alter table public.bets enable row level security;

drop policy if exists bets_select on public.bets;
drop policy if exists bets_write  on public.bets;

create policy bets_select on public.bets
  for select to authenticated using (true);

create policy bets_write on public.bets
  for all to authenticated
  using (
    public.is_admin() or exists (
      select 1 from public.members m
      where m.id = bets.member_id and m.user_id = auth.uid()
    )
  )
  with check (
    public.is_admin() or exists (
      select 1 from public.members m
      where m.id = bets.member_id and m.user_id = auth.uid()
    )
  );
