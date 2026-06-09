-- ============================================================
-- Stakeholders (per-venture contact directory) + Calendar ICS feed.
-- ============================================================

-- ---------- 1. stakeholders ----------
create table if not exists public.stakeholders (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  member_id   uuid not null references public.members(id) on delete cascade,
  name        text not null,
  role        text not null default '',         -- e.g. Lender, Real Estate Agent
  helpful_for text not null default '',         -- what they unblock
  email       text not null default '',
  phone       text not null default '',
  notes       text not null default '',
  position    integer not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists stakeholders_project_idx on public.stakeholders (project_id, position);

alter table public.stakeholders enable row level security;
drop policy if exists stakeholders_select on public.stakeholders;
drop policy if exists stakeholders_write  on public.stakeholders;
create policy stakeholders_select on public.stakeholders
  for select to authenticated using (true);
create policy stakeholders_write on public.stakeholders
  for all to authenticated
  using (
    public.is_admin() or exists (
      select 1 from public.members m
      where m.id = stakeholders.member_id and m.user_id = auth.uid()
    )
  )
  with check (
    public.is_admin() or exists (
      select 1 from public.members m
      where m.id = stakeholders.member_id and m.user_id = auth.uid()
    )
  );

-- ---------- 2. per-member calendar feed token ----------
-- Volatile default → each existing row gets its own unique token on add.
alter table public.members add column if not exists calendar_token uuid not null default gen_random_uuid();
create unique index if not exists members_calendar_token_idx on public.members (calendar_token);

-- ---------- 3. calendar feed (security definer; callable by anon) ----------
-- Returns all deadline-bearing items for the member who owns p_token, so the
-- public ICS route can build a feed without exposing the service role key.
create or replace function public.calendar_feed(p_token uuid)
returns table (kind text, item_id uuid, title text, event_date date, venture text, extra text)
language sql
stable
security definer
set search_path = public as $$
  with mem as (
    select id, user_id from public.members where calendar_token = p_token
  )
  select 'task'::text, t.id, t.title, t.deadline, coalesce(p.name, ''), coalesce(g.title, '')
  from public.tactics t
  join mem on mem.user_id = t.user_id
  left join public.projects p on p.id = t.project_id
  left join public.goals g on g.id = t.goal_id
  where t.deadline is not null and t.status <> 'completed'
  union all
  select 'goal'::text, g.id, g.title, g.end_date, coalesce(p.name, ''), coalesce(g.target_metric, '')
  from public.goals g
  join mem on mem.id = g.member_id
  left join public.projects p on p.id = g.project_id
  where g.end_date is not null and g.status = 'active';
$$;

grant execute on function public.calendar_feed(uuid) to anon, authenticated;
