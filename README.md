# AI Chatbot Starter Kit

Production-oriented starter structure for:
- Frontend: Next.js (App Router) + Tailwind + shadcn/ui style components
- Backend: NestJS + LangChain.js + SSE streaming
- AI Provider: Ollama by default (switchable to OpenAI/Anthropic)
- Data: PostgreSQL + Prisma

## 1) Project Structure

```text
.
├── .env.example
├── docker-compose.yml
├── package.json
├── backend
│   ├── package.json
│   ├── nest-cli.json
│   ├── tsconfig.json
│   ├── prisma
│   │   └── schema.prisma
│   └── src
│       ├── app.module.ts
│       ├── main.ts
│       └── chat
│           ├── chat.controller.ts
│           ├── chat.module.ts
│           ├── chat.service.ts
│           └── providers
│               ├── chat-model.factory.ts
│               └── chat-model.provider.ts
└── frontend
    ├── package.json
    ├── next.config.mjs
    ├── tailwind.config.ts
    ├── tsconfig.json
    ├── app
    │   ├── globals.css
    │   ├── layout.tsx
    │   └── page.tsx
    ├── components
    │   ├── chat-box.tsx
    │   └── ui
    │       ├── avatar.tsx
    │       ├── button.tsx
    │       ├── card.tsx
    │       ├── input.tsx
    │       └── scroll-area.tsx
    ├── hooks
    │   └── use-chat-stream.ts
    └── lib
        └── utils.ts
```

## 2) Prerequisites

- Node.js 20+
- npm 10+
- Docker + Docker Compose
- Ollama installed locally (if using default provider)

If using Ollama:
```bash
ollama pull llama3.1
```

## 3) Environment Variables

Copy and edit environment variables:

```bash
cp .env.example .env
```

Important keys:
- `DATABASE_URL`: PostgreSQL connection string
- `OLLAMA_BASE_URL`: default `http://localhost:11434`
- `AI_PROVIDER`: `ollama` (default), `openai`, or `anthropic`
- `AI_MODEL_NAME`: e.g. `llama3.1`, `gpt-4o-mini`, `claude-3-5-sonnet-latest`
- `JWT_SECRET`: required signing key for user JWT
- `ADMIN_USERNAME`: required admin username
- `ADMIN_PASSWORD`: required admin password
- `ADMIN_JWT_SECRET`: required signing key for admin JWT
- `NEXT_PUBLIC_API_URL`: frontend -> backend URL

## 4) Install Dependencies (One Command)

From project root:

```bash
npm install
```

This project uses npm workspaces, so one install command sets up both `backend` and `frontend`.

Optional (if you want to regenerate official shadcn config files):

```bash
cd frontend
npx shadcn-ui@latest init
```

## 5) Run Locally (without Docker)

From project root:

```bash
npm run prisma:generate -w backend
npx prisma migrate deploy --schema backend/prisma/schema.prisma
npm run dev
```

This starts both apps:
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:3001`

You can also run each app separately:

```bash
npm run dev:backend
npm run dev:frontend
```

## 6) Run with Docker Compose

From repo root:

```bash
docker compose up --build
```

Services:
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:3001`
- Postgres: `localhost:5432`

## 7) Auth API

Endpoints:
- `POST /auth/register` with `{ "email": "...", "password": "..." }`
- `POST /auth/login` with `{ "email": "...", "password": "..." }`
- `GET /auth/me` with `Authorization: Bearer <token>`

## 8) Chat API

Endpoints:
- `GET /chat/sessions`
- `POST /chat/sessions`
- `GET /chat/sessions/:sessionId/messages`
- `GET /chat/stream?message=<text>&sessionId=<id>`
- Response: Server-Sent Events (`text/event-stream`)

All chat endpoints require `Authorization: Bearer <token>`.

## 9) Admin API

Endpoints:
- `POST /admin/login` with `{ "username": "<ADMIN_USERNAME>", "password": "<ADMIN_PASSWORD>" }`
- `GET /admin/users`
- `DELETE /admin/users/:userId`

`GET` and `DELETE` require `Authorization: Bearer <admin-token>`.

Quick test:

```bash
curl -N "http://localhost:3001/chat/stream?message=Hello&sessionId=<session-id>" \
  -H "Authorization: Bearer <token>"
```

Expected SSE chunks include token data and final `[DONE]`.

## 10) How Provider Switching Works

`backend/src/chat/providers/chat-model.factory.ts` selects model based on `AI_PROVIDER`:
- `ollama` -> `ChatOllama`
- `openai` -> `ChatOpenAI`
- `anthropic` -> `ChatAnthropic`

No controller changes are needed when switching providers.

## 11) Memory Behavior

Chat history is persisted in PostgreSQL (`ChatSession` + `ChatMessage`) and scoped by authenticated user.
- Same `sessionId` = same conversation thread
- Different `sessionId` = isolated conversation history

## 12) Next Steps

- Add rate limiting + API key guardrails
- Add unit/integration tests for `AiService` and SSE endpoint
- Add deployment configs (e.g., Fly.io, Railway, Render, ECS)

## 13) Troubleshooting

- No model response:
  - Check Ollama is running and model exists (`ollama list`)
  - Verify `OLLAMA_BASE_URL` and `AI_MODEL_NAME`
- SSE not streaming:
  - Ensure frontend calls backend URL in `NEXT_PUBLIC_API_URL`
  - Confirm backend returns `text/event-stream`
- DB errors:
  - Validate `DATABASE_URL`
  - Confirm Postgres container is healthy
