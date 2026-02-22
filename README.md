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
├── backend
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
- npm / pnpm / yarn
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
- `NEXT_PUBLIC_API_URL`: frontend -> backend URL

## 4) Install Dependencies

This scaffold currently includes core source files. Install framework dependencies in each app:

### Backend (example)

```bash
cd backend
npm init -y
npm install @nestjs/common @nestjs/core @nestjs/platform-express reflect-metadata rxjs
npm install @langchain/core @langchain/community langchain @langchain/openai @langchain/anthropic
npm install prisma @prisma/client
npm install -D typescript ts-node @types/node
```

### Frontend (example)

```bash
cd ../frontend
npx create-next-app@latest . --ts --tailwind --app --eslint --use-npm
npm install react-markdown clsx tailwind-merge
```

Then initialize shadcn/ui (required):

```bash
npx shadcn-ui@latest init
```

If prompted, choose the `frontend/components` and `frontend/lib` conventions used here.

## 5) Run with Docker Compose

From repo root:

```bash
docker compose up --build
```

Services:
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:3001`
- Postgres: `localhost:5432`

## 6) Run Locally (without Docker)

Use two terminals.

Terminal A (backend):
```bash
cd backend
npm run start:dev
```

Terminal B (frontend):
```bash
cd frontend
npm run dev
```

## 7) Chat Streaming API

Endpoint:
- `GET /chat/stream?message=<text>&sessionId=<id>`
- Response: Server-Sent Events (`text/event-stream`)

Quick test:

```bash
curl -N "http://localhost:3001/chat/stream?message=Hello&sessionId=test"
```

Expected SSE chunks include token data and final `[DONE]`.

## 8) How Provider Switching Works

`backend/src/chat/providers/chat-model.factory.ts` selects model based on `AI_PROVIDER`:
- `ollama` -> `ChatOllama`
- `openai` -> `ChatOpenAI`
- `anthropic` -> `ChatAnthropic`

No controller changes are needed when switching providers.

## 9) Memory Behavior

`backend/src/chat/chat.service.ts` uses `BufferMemory` per `sessionId`.
- Same `sessionId` = shared short-term chat context
- Different `sessionId` = isolated conversation history

## 10) Next Steps

- Add persistent chat history (Prisma models + repository layer)
- Add auth/session ownership
- Add rate limiting + API key guardrails
- Add unit/integration tests for `AiService` and SSE endpoint
- Add deployment configs (e.g., Fly.io, Railway, Render, ECS)

## 11) Troubleshooting

- No model response:
  - Check Ollama is running and model exists (`ollama list`)
  - Verify `OLLAMA_BASE_URL` and `AI_MODEL_NAME`
- SSE not streaming:
  - Ensure frontend calls backend URL in `NEXT_PUBLIC_API_URL`
  - Confirm backend returns `text/event-stream`
- DB errors:
  - Validate `DATABASE_URL`
  - Confirm Postgres container is healthy

