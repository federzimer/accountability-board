-- ============================================================
-- Deleting a venture should remove its board tasks too (not orphan them).
-- Change tactics.project_id FK from ON DELETE SET NULL -> ON DELETE CASCADE.
-- Tasks with no venture (project_id null, e.g. quick-captured on the global
-- board) are unaffected.
-- ============================================================

alter table public.tactics drop constraint if exists tactics_project_id_fkey;
alter table public.tactics
  add constraint tactics_project_id_fkey
  foreign key (project_id) references public.projects(id) on delete cascade;
