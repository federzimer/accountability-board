# Accountability Board

Part of Fede's private multi-business stack; internal context lives in a private vault — ask Fede.

## What this is
An accountability Kanban board: members track ventures, goals, tactics, and weekly check-ins,
with a leaderboard and an AI coaching endpoint. Pages include the board, goals, calendar,
members, leaderboard, check-in flow, readiness checklist, ventures, and a feedback board.

## Stack
- Next.js 16 (App Router), React 19, TypeScript
- Supabase (`@supabase/ssr` + `@supabase/supabase-js`) for auth + data; row-level security,
  with SQL migrations under `supabase/migrations/`
- Tailwind CSS 4
- `@hello-pangea/dnd` for drag-and-drop Kanban
- `@anthropic-ai/sdk` powers the AI coach route (`src/app/api/coach/route.ts`)

## How to run
- Dev: `npm run dev` (port 3000; needs a `.env.local` with Supabase keys and an Anthropic
  API key for the coach route)
- Build: `npm run build` · Lint: `npm run lint`
- No test suite.

## Layout
- `src/app/*` — App Router pages and `api/*` route handlers
- `src/components/*` — board, goals, ventures, check-in, and feedback UI
- `src/lib/*` — Supabase clients, data access, scoring, sprint/readiness logic, types
- `src/middleware.ts` — session handling
- `supabase/migrations/*` — database schema
