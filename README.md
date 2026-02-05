# Review Arcade

Educational gaming platform with question-gated gameplay. A Turborepo monorepo with separate teacher and student apps.

## Structure

```
review-arcade/
├── apps/
│   ├── teacher/          # Teacher dashboard → review-arcade.rcnr.ai
│   └── student/          # Student game UI  → review-arcade.rcnr.net
├── packages/
│   └── shared/           # Shared hooks, types, API client
├── turbo.json
└── pnpm-workspace.yaml
```

## Getting Started

```bash
# Install dependencies
pnpm install

# Run both apps in development
pnpm dev

# Run individual apps
pnpm dev:teacher    # http://localhost:5173
pnpm dev:student    # http://localhost:5174

# Build all
pnpm build
```

## Environment Variables

### Teacher App (`apps/teacher/.env`)
```
VITE_API_URL=https://realtime.rcnr.ai
VITE_WS_URL=wss://realtime.rcnr.ai
VITE_CLERK_PUBLISHABLE_KEY=pk_xxxxx
```

### Student App (`apps/student/.env`)
```
VITE_API_URL=https://realtime.rcnr.ai
VITE_WS_URL=wss://realtime.rcnr.ai
```

## Deployment

Both apps deploy to Vercel from this monorepo:

- **Teacher App**: `review-arcade.rcnr.ai`
- **Student App**: `review-arcade.rcnr.net` (school-friendly domain)

Each app has its own `vercel.json` configuration.

## Backend

Both apps connect to the `rcnr-realtime-api` service:
- REST API: `https://realtime.rcnr.ai/api/reviewarcade/*`
- WebSocket: `wss://realtime.rcnr.ai/ws/reviewarcade/{session_code}`
