# Gumroad Launch Kit

Use this as your copy/paste playbook for listing this product on Gumroad.

## 1) Positioning

Target buyer:
- Indie makers
- Solo devs
- Small internal tools builders

Core promise:
- Ship an AI chat app with auth, history, admin panel, and training-aware responses in hours, not weeks.

## 2) Pricing Tiers (Pocket-Money Friendly)

Recommended launch pricing (USD):
- `Starter`: `$19`
- `Pro`: `$39`
- `Supporter`: `$79`

What each tier includes:
- `Starter`: Source code + setup docs
- `Pro`: Starter + future updates for 12 months
- `Supporter`: Pro + priority email support (for example, 48h response target)

Notes:
- If you want faster first sales, start at `$15/$29/$59` for 2-4 weeks, then raise.
- Keep all tiers the same codebase; change support/update terms only.

## 3) Gumroad Product Title Options

- AI Chat + Admin Starter (Next.js + NestJS + Postgres)
- Fullstack AI SaaS Starter (Auth, Chat History, Admin, Training)
- Next.js + NestJS AI Starter Kit (Ollama/OpenAI/Anthropic)

## 4) Product Subtitle

- Production-oriented starter kit with auth, chat sessions, admin tools, and training-aware responses.

## 5) Short Description (Gumroad card)

- Launch an AI chatbot product faster with a fullstack starter: Next.js frontend, NestJS backend, Postgres/Prisma, admin panel, and streaming chat.

## 6) Full Description (Copy/Paste Template)

```md
Build and ship your AI app faster.

This starter gives you a practical base for real products:
- User signup/login with JWT auth
- Chat sessions + persistent history
- Streaming assistant responses (SSE)
- Admin dashboard for users + training data
- Training-aware answers (retrieved snippets injected into prompts)
- PostgreSQL + Prisma data layer
- Multiple model providers (Ollama, OpenAI, Anthropic)

## What you get
- Full source code (frontend + backend)
- Local setup guide
- Dockerized Postgres for quick start
- Clean project structure to customize and extend

## Tech stack
- Next.js 14 + React + MUI
- NestJS 10 + LangChain
- PostgreSQL + Prisma

## Who this is for
- Indie hackers
- SaaS founders validating ideas quickly
- Developers who want a strong base instead of starting from scratch

## Not included
- Hosted deployment
- Custom feature development
- Enterprise SLA

## License
Single product license for your own projects (adjust this section to your exact terms).
```

## 7) Screenshot Checklist

Take 7-9 screenshots max:

1. Login/signup screen
2. Main chat UI with session history sidebar
3. Active streaming response in chat
4. Admin users table
5. Create/reset/delete user actions
6. Training entry create modal
7. File upload for training data
8. Training jobs/runs history
9. Theme toggle (light/dark) optional

Screenshot quality:
- 1440px+ width
- Same browser zoom/font scale across shots
- Use realistic demo text, not lorem ipsum
- Avoid showing secrets/tokens

## 8) Demo Script (60-90 seconds)

1. Show login/signup
2. Send first chat message and show streaming output
3. Open admin panel and create a user
4. Add training data and run training
5. Ask a related query in chat to show training-aware response
6. End with stack and customization note

## 9) Gumroad FAQ Snippets

Q: Is this production ready?  
A: It is production-oriented and includes auth, data persistence, and admin workflows. You should still do final hardening for your deployment and use case.

Q: Which model providers are supported?  
A: Ollama (default), OpenAI, and Anthropic.

Q: Does training data fine-tune a model?  
A: No. It uses retrieval of matching snippets and injects them as context at response time.

Q: Can I use this for commercial projects?  
A: Yes, based on your chosen license terms.

## 10) Launch Checklist

- [ ] Replace all local secrets in `.env`
- [ ] Record 60-90s demo GIF/video
- [ ] Capture 7-9 screenshots
- [ ] Add clear license terms in Gumroad description
- [ ] Add support contact email
- [ ] Publish at launch discount for first buyers
- [ ] Post launch thread on X/Reddit/Indie Hackers

## 11) Post-Launch Conversion Improvements

Week 1:
- Add one “quick deploy” guide (Railway/Render/Fly.io)
- Add 2-3 more tests for core flows
- Add one short changelog entry to show active maintenance

Week 2+:
- Add Stripe billing starter integration
- Add role-based admin permissions
- Add usage analytics page
