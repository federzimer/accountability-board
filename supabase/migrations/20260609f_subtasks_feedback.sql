-- ============================================================
-- Subtasks (breakdown inside a board task) + Feedback board.
-- ============================================================

-- ---------- 1. subtasks: a recipe/checklist inside a tactic ----------
create table if not exists public.subtasks (
  id         uuid primary key default gen_random_uuid(),
  tactic_id  uuid not null references public.tactics(id) on delete cascade,
  member_id  uuid references public.members(id) on delete set null,
  title      text not null,
  is_done    boolean not null default false,
  position   integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists subtasks_tactic_idx on public.subtasks (tactic_id, position);

alter table public.subtasks enable row level security;
drop policy if exists subtasks_select on public.subtasks;
drop policy if exists subtasks_write  on public.subtasks;
create policy subtasks_select on public.subtasks
  for select to authenticated using (true);
-- write if you own the parent tactic (or admin)
create policy subtasks_write on public.subtasks
  for all to authenticated
  using (
    public.is_admin() or exists (
      select 1 from public.tactics t where t.id = subtasks.tactic_id and t.user_id = auth.uid()
    )
  )
  with check (
    public.is_admin() or exists (
      select 1 from public.tactics t where t.id = subtasks.tactic_id and t.user_id = auth.uid()
    )
  );

-- ---------- 2. feedback / feature requests (all users) ----------
create table if not exists public.feedback (
  id         uuid primary key default gen_random_uuid(),
  member_id  uuid not null references public.members(id) on delete cascade,
  kind       text not null default 'feature',   -- feature | bug | idea
  title      text not null,
  detail     text not null default '',
  status     text not null default 'open',       -- open | planned | in_progress | done | declined
  created_at timestamptz not null default now()
);
create index if not exists feedback_created_idx on public.feedback (created_at desc);

alter table public.feedback enable row level security;
drop policy if exists feedback_select on public.feedback;
drop policy if exists feedback_insert on public.feedback;
drop policy if exists feedback_update on public.feedback;
drop policy if exists feedback_delete on public.feedback;
create policy feedback_select on public.feedback
  for select to authenticated using (true);
create policy feedback_insert on public.feedback
  for insert to authenticated
  with check (exists (select 1 from public.members m where m.id = feedback.member_id and m.user_id = auth.uid()));
-- owner can edit their own; admins can edit any (e.g. set status)
create policy feedback_update on public.feedback
  for update to authenticated
  using (public.is_admin() or exists (select 1 from public.members m where m.id = feedback.member_id and m.user_id = auth.uid()))
  with check (public.is_admin() or exists (select 1 from public.members m where m.id = feedback.member_id and m.user_id = auth.uid()));
create policy feedback_delete on public.feedback
  for delete to authenticated
  using (public.is_admin() or exists (select 1 from public.members m where m.id = feedback.member_id and m.user_id = auth.uid()));

-- ---------- 3. feedback upvotes (one per member) ----------
create table if not exists public.feedback_votes (
  feedback_id uuid not null references public.feedback(id) on delete cascade,
  member_id   uuid not null references public.members(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (feedback_id, member_id)
);

alter table public.feedback_votes enable row level security;
drop policy if exists feedback_votes_select on public.feedback_votes;
drop policy if exists feedback_votes_write  on public.feedback_votes;
create policy feedback_votes_select on public.feedback_votes
  for select to authenticated using (true);
create policy feedback_votes_write on public.feedback_votes
  for all to authenticated
  using (exists (select 1 from public.members m where m.id = feedback_votes.member_id and m.user_id = auth.uid()))
  with check (exists (select 1 from public.members m where m.id = feedback_votes.member_id and m.user_id = auth.uid()));
