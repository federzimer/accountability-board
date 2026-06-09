-- ============================================================
-- Builder's Assembly — Business Readiness checklist
-- Per-member checklist of foundational business-setup items.
-- The canonical item list lives in code (src/lib/readiness.ts);
-- this table stores only each member's per-item completion state.
-- ============================================================

create table if not exists public.readiness_items (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null references public.members(id) on delete cascade,
  item_key    text not null,
  is_done     boolean not null default false,
  note        text not null default '',
  updated_at  timestamptz not null default now(),
  unique (member_id, item_key)
);

create index if not exists readiness_member_idx on public.readiness_items (member_id);

-- ---------- Row Level Security ----------
-- Mirrors the rest of the portal: everyone authenticated can SEE all
-- (group accountability); members write only their own rows, admin all.
alter table public.readiness_items enable row level security;

drop policy if exists readiness_select on public.readiness_items;
drop policy if exists readiness_write  on public.readiness_items;

create policy readiness_select on public.readiness_items
  for select to authenticated using (true);

create policy readiness_write on public.readiness_items
  for all to authenticated
  using (
    public.is_admin() or exists (
      select 1 from public.members m
      where m.id = readiness_items.member_id and m.user_id = auth.uid()
    )
  )
  with check (
    public.is_admin() or exists (
      select 1 from public.members m
      where m.id = readiness_items.member_id and m.user_id = auth.uid()
    )
  );
