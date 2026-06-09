-- ============================================================
-- Goal-setting wizard: brainstorm -> bet -> 90-day goal funnel
-- Adds `ideas` and extends `goals`. Additive / safe.
-- ============================================================

-- ---------- ideas (brainstorm cards, private to owner) ----------
create table if not exists public.ideas (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null references public.members(id) on delete cascade,
  cycle_id    uuid not null references public.cycles(id) on delete cascade,
  content     text not null,
  is_chosen   boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists ideas_member_cycle_idx on public.ideas (member_id, cycle_id);

-- ---------- goals: bet + source idea + end date ----------
alter table public.goals add column if not exists the_bet        text;
alter table public.goals add column if not exists source_idea_id uuid references public.ideas(id) on delete set null;
alter table public.goals add column if not exists end_date       date;

-- ---------- RLS: ideas are PRIVATE to the owner (admin reads all) ----------
alter table public.ideas enable row level security;

create policy ideas_select on public.ideas for select to authenticated
  using (public.is_admin() or exists (
    select 1 from public.members m where m.id = ideas.member_id and m.user_id = auth.uid()
  ));
create policy ideas_write on public.ideas for all to authenticated
  using (public.is_admin() or exists (
    select 1 from public.members m where m.id = ideas.member_id and m.user_id = auth.uid()
  ))
  with check (public.is_admin() or exists (
    select 1 from public.members m where m.id = ideas.member_id and m.user_id = auth.uid()
  ));

-- goals visibility unchanged (group-visible read, own-or-admin write).
