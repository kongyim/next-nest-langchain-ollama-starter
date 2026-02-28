# AI Chatbot + Admin Starter (Next.js + NestJS + PostgreSQL)

Production-oriented starter kit with:
- User chat app with ChatGPT-style session history
- Admin panel for user management and model-training data operations
- JWT auth for user/admin flows
- NestJS backend + Next.js frontend + PostgreSQL (Prisma)

## Tech Stack

- Frontend: Next.js 14 (App Router), React 18, MUI 7
- Backend: NestJS 10, LangChain, SSE streaming
- Database: PostgreSQL + Prisma
- AI providers: Ollama (default), OpenAI, Anthropic

## Features

- User auth with signup + login (`/auth/register`, `/auth/login`)
- Chat sessions and messages persisted in Postgres
- Chat sidebar history (select session to load full conversation)
- Delete chat session
- Streaming response via SSE (`/chat/stream`)
- Training-aware responses (chat injects top matching training snippets as context)
- Admin login at `/admin`
- Admin user management:
  - List users (with last login)
  - Create user
  - Reset user password
  - Delete user
- Admin training section:
  - Create/list/delete training entries
  - Upload files (`.txt`, `.md`, `.csv`, `.json`, max 2MB)
  - Queue training jobs
  - View run/job history
  - Eval console

## Project Structure

```text
.
├── .env.example
├── docker-compose.yml
├── package.json
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   └── src/
│       ├── auth/
│       ├── chat/
│       ├── admin/
│       ├── training/
│       └── prisma/
└── frontend/
    ├── app/
    │   ├── page.tsx
    │   └── admin/page.tsx
    ├── components/
    └── hooks/
```

## Prerequisites

- Node.js 20+ (LTS recommended)
- npm 10+
- Docker + Docker Compose (for Postgres)
- Ollama installed locally if using default provider

If using Ollama:

```bash
ollama pull llama3.1
```

## Environment Setup

1. Copy env file:

```bash
cp .env.example .env
```

2. Set required values in `.env`:

- `DATABASE_URL`
- `JWT_SECRET`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `ADMIN_JWT_SECRET`
- `CORS_ORIGIN` (comma-separated allowed origins for backend CORS)
- `NEXT_PUBLIC_API_URL`

Example admin login values:

```env
ADMIN_USERNAME=your-admin-username
ADMIN_PASSWORD=your-strong-admin-password
```

Generate long random values for `JWT_SECRET` and `ADMIN_JWT_SECRET` and avoid default admin credentials before sharing or deploying.

## Install Dependencies

From project root:

```bash
npm install
```

## Run Locally

1. Start full stack with Docker (quickest test):

```bash
docker compose up -d --build
```

Apps:
- Frontend: `http://localhost:3000`
- Admin: `http://localhost:3000/admin`
- Backend: `http://localhost:3001`

Default quick-test admin credentials (Docker mode): `admin` / `admin`

Optional Docker overrides use `DOCKER_*` env vars (for example `DOCKER_ADMIN_PASSWORD`, `DOCKER_AI_PROVIDER`, `DOCKER_NEXT_PUBLIC_API_URL`).

2. Or run manually (without Docker app containers):

Start Postgres:

```bash
docker compose up -d db
```

Generate Prisma client + apply migrations:

```bash
npm run prisma:generate -w backend
npx prisma migrate deploy --schema backend/prisma/schema.prisma
```

3. Start frontend + backend:

```bash
npm run dev
```

Apps:
- Frontend: `http://localhost:3000`
- Admin: `http://localhost:3000/admin`
- Backend: `http://localhost:3001`

## API Overview

### Auth

- `POST /auth/register` body: `{ "email": "...", "password": "..." }`
- `POST /auth/login` body: `{ "email": "...", "password": "..." }`
- `GET /auth/me` with `Authorization: Bearer <token>`

### Chat (user token required)

- `GET /chat/sessions`
- `POST /chat/sessions`
- `GET /chat/sessions/:sessionId/messages`
- `DELETE /chat/sessions/:sessionId`
- `GET /chat/stream?message=<text>&sessionId=<id>` (SSE)

### Admin

- `POST /admin/login` body: `{ "username": "...", "password": "..." }`
- `GET /admin/users`
- `POST /admin/users`
- `POST /admin/users/:userId/reset-password`
- `DELETE /admin/users/:userId`

### Training (admin token required)

- `GET /admin/training/entries`
- `POST /admin/training/entries`
- `POST /admin/training/upload` (`multipart/form-data`, field name: `file`)
- `DELETE /admin/training/entries/:entryId`
- `POST /admin/training/run`
- `GET /admin/training/runs`
- `GET /admin/training/jobs`
- `POST /admin/training/eval`

## Notes on Data Storage

- User/chat/session/message data is persisted in PostgreSQL via Prisma.
- Training data currently uses file storage at:
  - `backend/data/training-store.json`
- Current training retrieval is keyword-based and injected into chat context.

For production, consider moving training data/jobs to database + queue workers.

## Useful Commands

```bash
# run both apps
npm run dev

# run app separately
npm run dev:backend
npm run dev:frontend

# build all
npm run build

# backend only
npm run build -w backend

# frontend only
npm run build -w frontend

# lint frontend (CI-friendly, non-interactive)
npm run lint -w frontend

# backend unit tests
npm run test -w backend
```

## Troubleshooting

- `EADDRINUSE: 3001`
  - Another backend process is already running on port `3001`.
- Prisma error: `The table public.User does not exist`
  - Run migrations:
  - `npx prisma migrate deploy --schema backend/prisma/schema.prisma`
- Frontend `Module not found: @mui/material`
  - Install workspace deps from root:
  - `npm install`
- Admin login fails
  - Confirm `.env` values for `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_JWT_SECRET`
  - Restart backend after changing `.env`
- Chat sends but no response shown
  - Check backend logs and AI provider config (`AI_PROVIDER`, model availability)

## Production Hardening Checklist

- Keep strict rate limits for auth/chat/admin endpoints
- Add audit log for admin actions
- Add input/file scanning and stricter file validation for training upload
- Move training jobs to persistent queue workers
- Expand automated tests (integration + e2e)
- Add CI pipeline and deployment documentation
- Rotate secrets and use secret manager in deployment

## Selling This Starter

- Gumroad launch playbook (pricing, copy, screenshots, FAQ): `docs/GUMROAD_LAUNCH.md`
