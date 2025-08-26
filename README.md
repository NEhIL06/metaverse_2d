# Metaverse (SkyScope)

A real-time 2D virtual office platform enabling presence, spatial interaction, chat, and peer-to-peer voice calls. The codebase is organized as a Turborepo monorepo with separate HTTP (REST) and WebSocket services, and shared packages for database and UI.

## Repository Layout

```
metaverse/
  apps/
    http/                  # Express REST API (auth, spaces, elements, avatars, maps)
    ws/                    # WebSocket signaling + realtime presence/movement
  packages/
    database/              # Prisma schema and generated client
    ui/                    # React UI components (library)
    eslint-config/         # Shared ESLint config
    typescript-config/     # Shared TS config
```

> Note: The actual monorepo root is `metaverse/`. All workspace commands should be run from within that directory unless otherwise noted.

## Tech Stack

- Core
  - Node.js (>= 18), TypeScript, pnpm workspaces, Turborepo
- Services
  - HTTP API: Express 5, esbuild, Zod, JSON Web Tokens (JWT)
  - WebSocket: `ws`, JWT-based auth on join, WebRTC signaling (offer/answer/ICE)
- Data
  - PostgreSQL, Prisma ORM/Client
- UI Library
  - React (packages/ui)
- Tooling
  - ESLint, Prettier, @turbo/gen

## High-Level Design (HLD)

- Components
  - Client (2D office UI): Connects to HTTP for CRUD/auth; connects to WS for realtime presence, movement, chat, and WebRTC signaling.
  - HTTP API (apps/http): Auth (signup/signin), admin CRUD (elements, avatars, maps), spaces CRUD, user metadata; validates with Zod; guards via role-based middleware; persists in PostgreSQL via Prisma.
  - WebSocket Server (apps/ws): Authenticates on `join` using JWT; manages in-memory rooms; broadcasts movement, join/leave, and chat; relays WebRTC signaling (offer/answer/ICE).
  - Database (PostgreSQL): Models include `User`, `Space`, `spaceElements`, `Element`, `Map`, `MapElements`, `Avatar`.

- Typical Flow
  1. User signs up/signs in via HTTP → receives JWT.
  2. Admin creates maps/elements/spaces via HTTP.
  3. Client fetches space and assets via HTTP.
  4. Client opens WS to `ws://localhost:8000` and sends `join` with `{ spaceId, token }`.
  5. Server assigns spawn, returns peers; movement and chat broadcast to room.
  6. For voice, peers exchange WebRTC offers/answers/ICE via WS, then stream media P2P.

- Notes
  - Room state is in-memory per WS instance; for multi-instance scale, add a coordinator (e.g., Redis pub/sub) and partition rooms.
  - HTTP is stateless; horizontal scale behind a load balancer is straightforward.

## Screenshots (Placeholders)

Add images under `docs/images/` and update paths below:

- Landing Page

![Landing Page](docs/images/landing.png)

- Space View (2D Office)

![Space View](docs/images/space.png)

- Admin Dashboard

![Admin Dashboard](docs/images/admin.png)

- Chat and Call Overlay

![Chat and Call](docs/images/chat_call.png)

## Prerequisites

- Node.js >= 18
- pnpm >= 9 (enable via `corepack enable` or install from `https://pnpm.io`)
- PostgreSQL 14+ (local or remote)

## Setup

1) Clone and enter the workspace root

```bash
git clone <repo-url>
cd metaverse
```

2) Install dependencies

```bash
pnpm install
```

3) Configure the database connection

- Update the PostgreSQL URL in `packages/database/prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = "postgresql://postgres:yourPassword@localhost:5432/postgres"
}
```

4) Migrate and generate Prisma client

```bash
# From the monorepo root (metaverse/):
pnpm dlx prisma migrate dev --name init --schema packages/database/prisma/schema.prisma
pnpm dlx prisma generate --schema packages/database/prisma/schema.prisma
```

Alternatively, using workspace execution:

```bash
pnpm --filter @repo/database exec prisma migrate dev --name init
pnpm --filter @repo/database exec prisma generate
```

5) Start development services

```bash
# Runs both services (HTTP and WS) via Turborepo
pnpm dev
```

- HTTP API: `http://localhost:3000`
- WebSocket: `ws://localhost:8000`

If you prefer running apps individually:

```bash
pnpm --filter http dev      # builds with esbuild and starts Express on :3000
pnpm --filter ws dev        # builds with esbuild and starts WebSocket on :8000
```

## Configuration Notes

- JWT secret is currently defined in code for development:
  - `apps/http/src/constants.ts` → `JWT_PASSWORD`
  - `apps/ws/src/config.ts` → `JWT_PASSWORD`
  For production, replace these with `process.env.JWT_PASSWORD` and load from an environment file or secret manager.

- CORS for the HTTP API is configured to allow `http://localhost:8080`. Update in `apps/http/src/index.ts` if your frontend runs elsewhere.

## Scripts

Run from `metaverse/`:

- `pnpm dev` — run all apps in dev mode (non-cached, persistent)
- `pnpm build` — build all packages/apps
- `pnpm lint` — lint all workspaces
- `pnpm format` — format codebase with Prettier
- `pnpm check-types` — run TypeScript checks across workspaces

## Database Models (Prisma)

Located at `packages/database/prisma/schema.prisma`.

- `User` (username, password, role, avatar)
- `Space` (name, width, height, thumbnail, creator)
- `spaceElements` (placement of `Element` within a `Space` at x,y)
- `Element` (imageUrl, width, height, static)
- `Map` and `MapElements` (templates for spaces with default elements)
- `Avatar` (name, imageUrl)
- `Role` enum: `Admin` | `User`

## HTTP API

Base URL: `http://localhost:3000/api/v1`

- Auth
  - POST `/signup`
    - body: `{ "username": string, "password": string, "type": "user" | "admin" }`
    - 200: `{ message, username, role, userId }`
  - POST `/signin`
    - body: `{ "username": string, "password": string }`
    - 200: `{ token }`

- Public
  - GET `/elements`
    - 200: `Array<{ id, imageUrl, width, height, static }>`
  - GET `/avatars`
    - 200: `{ avatars: Array<{ id, name, imageUrl }> }`
  - GET `/health`
    - 200: `{ status: "ok" }`

- User (Authorization: `Bearer <JWT>`)
  - POST `/user/metadata`
    - body: `{ "avatarId": string }`
    - 200: `{ message: "Metadata updated" }`
  - GET `/user/metadata/bulk?ids=[id1,id2,...]`
    - 200: `{ avatars: Array<{ userId, avatarId }> }`

- Spaces
  - GET `/space/all` (Admin only)
    - 200: `{ spaces: Array<{ id, name, thumbnail, dimensions }> }`
  - POST `/space` (Admin only)
    - body (empty space): `{ name: string, dimensions: "<width>x<height>" }`
    - body (from map): `{ name: string, dimensions: "<w>x<h>", mapId: string }`
    - 200: `{ spaceId }`
  - GET `/space/:spaceId` (User)
    - 200: `{ dimensions: "<w>x<h>", elements: Array<{ id, elements: { id, imageUrl, width, height, static }, x, y }> }`
  - DELETE `/space/:spaceId` (User; must be creator)
    - 200: `{ message: "Success" }`
  - POST `/space/element` (User; must be creator)
    - body: `{ spaceId: string, elementId: string, x: number, y: number }`
    - 200: `{ message: "Element added" }`
  - DELETE `/space/element` (Admin)
    - body: `{ id: string }` (the spaceElements id)
    - 200: `{ message: "Element deleted" }`

- Admin (Authorization: `Bearer <JWT>` with role `Admin`)
  - POST `/admin/element`
    - body: `{ imageUrl: string, width: number, height: number, static: boolean }`
    - 200: `{ id }`
  - PUT `/admin/element/:elementId`
    - body: `{ imageUrl: string }`
    - 200: `{ message: "Success" }`
  - POST `/admin/avatar`
    - body: `{ name: string, imageUrl: string }`
    - 200: `{ avatarId }`
  - POST `/admin/map`
    - body: `{ name: string, thumbnail: string, dimensions: "<w>x<h>", defaultElements: Array<{ elementId: string, x: number, y: number }> }`
    - 200: `{ id }`

All request payloads and constraints are defined in Zod at `apps/http/src/types`.

## WebSocket Protocol

Endpoint: `ws://localhost:8000`

Upon connection, the client should immediately join a space:

```json
{ "type": "join", "payload": { "spaceId": "<space-id>", "token": "<jwt>" } }
```

- Server → Client: `space-joined`
  - payload: `{ spawn: { x, y }, users: Array<{ id }> }`
- Broadcasts
  - `user-joined` → `{ userId, x, y }`
  - `user-left` → `{ userId }`
- Movement
  - Client → `move` → `{ x, y }` (only single-tile orthogonal steps are accepted)
  - Server → `movement` → `{ x, y }` (broadcast to others)
  - Server → `movement-rejected` → `{ x, y }` (your current position)
- Chat
  - Group: Client → `groupChat` → `{ groupId, message }` (broadcast within space)
  - Private: Client → `privateChat` → `{ userId, spaceId, message }` (direct to target)
- WebRTC signaling
  - Call: `user:call` → `{ to, offer }` → recipient gets `incomming:call` → `{ from, offer }`
  - Accept: `call:accepted` → `{ to, ans }` → caller gets `call:accepted` → `{ from, ans }`
  - Renegotiation: `peer:nego:needed` / `peer:nego:final`
  - ICE: `ice:candidate` → `{ to, candidate }`

## Security & Production

- Replace hardcoded `JWT_PASSWORD` with a secret loaded from environment.
- Restrict CORS origins appropriately.
- Use a dedicated database and user with least privilege.
- Add HTTPS termination and secure WS (wss) in production.

## Troubleshooting

- Prisma errors: Ensure PostgreSQL is running and the URL in `schema.prisma` is correct; rerun `prisma generate` after schema changes.
- 401/403 from API: Verify `Authorization: Bearer <token>` header and user role when accessing admin routes.
- WS disconnects on join: The join payload must include a valid JWT (from `/signin`) and a real `spaceId`.

## Deploy to Render

You can deploy this monorepo to Render using either the Blueprint (single-click) flow or by creating services manually.

### Option A: Render Blueprint (recommended)

Prereqs: You have pushed this repo to GitHub and have a Render account.

1) Place the Blueprint file at the repo root

- If `render.yaml` is inside `metaverse/`, move it to the repository root as `render.yaml` so Render can detect it.
- The Blueprint defines 3 services and a PostgreSQL database:
  - Web service: HTTP API (`metaverse-http-api`)
  - Web service: WebSocket server (`metaverse-websocket`)
  - Static site: Frontend (`metaverse-frontend`)
  - Database: PostgreSQL (`metaverse-db`)

2) Commit and push the Blueprint

```bash
git add render.yaml
git commit -m "chore: add Render blueprint"
git push
```

3) Create a Blueprint on Render

- In Render: New → Blueprint
- Select your GitHub repo
- Review the services and click Apply.

4) Configure environment variables (Render UI → each service → Environment)

- HTTP API (web service):
  - `NODE_ENV=production`
  - `PORT=3000`
  - `JWT_PASSWORD=<secure-random>`
  - `DATABASE_URL` (auto-wired from the Render PostgreSQL database if using the Blueprint)
- WebSocket (web service):
  - `NODE_ENV=production`
  - `PORT=8000`
  - `JWT_PASSWORD=<same-as-http>`
  - `DATABASE_URL` (auto-wired if using the Blueprint)
- Frontend (static site): after the API/WS deploys, set:
  - `VITE_API_URL=https://<your-http-api>.onrender.com/api/v1`
  - `VITE_WS_URL=wss://<your-websocket>.onrender.com`

5) Deploy and verify

- Render will run `pnpm install && pnpm build` and apply database migrations automatically.
- Visit the frontend URL, sign up, create/join a space, and confirm realtime works.

Notes

- If you keep the Blueprint in the repo root, the paths inside it (build commands, publish directory) are already set to work with the `metaverse/` subfolder.
- If you adjust folder names, update paths accordingly in `render.yaml`.

### Option B: Manual Services (without Blueprint)

Create the following on Render:

1) Database: PostgreSQL (`metaverse-db`). Copy the connection string as `DATABASE_URL`.

2) HTTP API: Web Service
- Build command: `cd metaverse && pnpm install && pnpm build`
- Start command: `cd metaverse && pnpm --filter http start`
- Env vars: `NODE_ENV=production`, `PORT=3000`, `JWT_PASSWORD=<secret>`, `DATABASE_URL=<from-db>`

3) WebSocket: Web Service
- Build command: `cd metaverse && pnpm install && pnpm build`
- Start command: `cd metaverse && pnpm --filter ws start`
- Env vars: `NODE_ENV=production`, `PORT=8000`, `JWT_PASSWORD=<same>`, `DATABASE_URL=<from-db>`

4) Frontend: Static Site
- Build command: `cd metaverse && pnpm install && pnpm --filter nexus-office-env build`
- Publish directory: `apps/nexus-office-env/dist`
- Env vars: set after backend URLs are known
  - `VITE_API_URL=https://<your-http-api>.onrender.com/api/v1`
  - `VITE_WS_URL=wss://<your-websocket>.onrender.com`

5) Migrations

- Migrations run during build (via `postbuild` hook). If needed, run manually from a shell:
```bash
pnpm --filter @repo/database migrate
```

## License

Add your preferred license here.
