# Review Arcade - Claude Code Context

## Project Overview
Educational gaming platform with question-gated gameplay. Teachers create review game sessions with questions, students play arcade-style games where correct answers unlock progress. Real-time multiplayer via WebSocket.

## Tech Stack
- Turborepo monorepo (pnpm)
- React 19 + TypeScript
- Vite (build tool)
- Tailwind CSS 4
- @rcnr/theme (CSS tokens)
- Clerk authentication (teacher app)
- Token-based auth (student app)

## Architecture
- **Monorepo structure:**
  - `apps/teacher/` — Teacher dashboard (create sessions, manage questions, monitor live games)
  - `apps/student/` — Student game UI (join sessions, answer questions, play games)
  - `packages/shared/` — Shared hooks, types, API client
- **Backend:** rcnr-realtime-api (REST + WebSocket for live multiplayer)
- **Auth:** Clerk for teacher app, token-based for student app
- **Package Manager:** pnpm

## Design System
- Uses @rcnr/theme: `@import "tailwindcss"; @import "@rcnr/theme";`
- RCNR dark brand: bg-midnight, glass-card, text-brand hierarchy

## Commands
- `pnpm install` — Install all dependencies
- `pnpm dev` — Start all apps in dev mode
- `pnpm --filter teacher dev` — Start teacher app only
- `pnpm --filter student dev` — Start student app only
- `pnpm build` — Build all apps

## Deployment
- Vercel (both apps) — https://review-arcade.rcnr.net
- Backend: rcnr-realtime-api
