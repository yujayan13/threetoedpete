# Three-Toed Pete

Monorepo for a real-time online implementation of the Three-Toed Pete card game.

## Tech Stack
- Web: Next.js 15 (App Router), React, TypeScript, TailwindCSS
- Server: NestJS (WebSocket Gateway with Socket.io), Prisma (PostgreSQL), Redis adapter
- Game engine: Pure TypeScript package `@threetoedpete/game-core` (deterministic)
- Dev: Turborepo, Jest, Docker Compose

## Repo Layout
- `apps/web`: Next.js client
- `apps/server`: NestJS server (REST lobby + Socket.io gateway)
- `packages/game-core`: Pure game logic and CLI simulator
- `infra`: Docker Compose and deployment scaffolding

## RNG Audit Trail
- Before a shuffle cycle, the server publishes a commitment `sha256(seed)`.
- The deck is shuffled deterministically via Fisher–Yates using a xorshift32 PRNG seeded from the seed string.
- After the cycle ends (deck exhausted), the server reveals the seed so clients can recompute and verify the exact deck order.

## Local Development

### Quick start (recommended)
- **Prerequisites**: Install Node.js 20 and Docker Desktop. Make sure ports `3000` (web) and `4000` (server) are free.

1) **Install dependencies**
   ```bash
   npm install
   ```

2) **Start the full stack with Docker Compose** (Postgres, Redis, Server, Web)
   ```bash
   docker compose -f infra/docker-compose.yml up --build
   ```
   - The first run builds images; subsequent starts are faster.
   - Leave this terminal running; it streams logs for all services.

3) **Open the app**
   - Web UI: `http://localhost:3000`
   - API/WebSocket server: `http://localhost:4000`

How it works:
- `infra/docker-compose.yml` spins up `postgres` and `redis` containers.
- The server container is built from `apps/server/Dockerfile` and exposed on port `4000`.
- The web app runs with `npm run dev -w @threetoedpete/web` and is exposed on port `3000`.
- The web app reads `NEXT_PUBLIC_WS_URL=http://localhost:4000` so it connects to the local server.

### Run without Docker (advanced)
- You can run workspace dev scripts directly if you have local Postgres/Redis set up and environment variables configured.
- To run all dev scripts in parallel (requires each workspace to define a `dev` script):
  ```bash
  npm run dev
  ```
  Or run an individual workspace, for example the game engine simulator below.

## CLI Simulation
Run a fast, deterministic simulation of many hands using the core engine:
```bash
npm run sim -- --players 4 --hands 10000
```
This exercises the core rules and provides a quick sanity check of state transitions.

## Testing

### Run all tests in the monorepo
```bash
npm test
```

### Only the game engine package
```bash
npm run -w @threetoedpete/game-core test
```

### Type-check and lint
```bash
npm run typecheck
npm run lint
```

Tips:
- If you see missing type errors after a fresh clone, run `npm install` and try again.
- To run a single test file in the core package:
  ```bash
  npm run -w @threetoedpete/game-core test -- tests/game.test.ts
  ```

## Notes
- The server is authoritative; clients can only send `choose` and `advance` moves. All state transitions go through `@threetoedpete/game-core`.
- Persistence is stubbed. Prisma schema is provided for Phase 3.
- Next steps: add Redis session pub/sub persistence, reconnection/resync, and Playwright e2e. 