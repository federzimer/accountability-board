-- ============================================================
-- Card detail + project color coding
--   goals.color   : palette key, drives card color on the board
--   tactics.notes : free-text notes (card pop-up)
--   tactics.deadline : optional due date (card pop-up)
-- Additive / safe.
-- ============================================================

alter table public.goals   add column if not exists color    text;
alter table public.tactics add column if not exists notes    text not null default '';
alter table public.tactics add column if not exists deadline date;
