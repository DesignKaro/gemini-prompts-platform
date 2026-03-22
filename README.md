# Gemini Prompts Platform

This repository is scaffolded for building an AI Prompt Sharing and Membership Platform with a headless architecture.

## Stack Direction
- Frontend: Next.js + TypeScript + TailwindCSS
- Backend: NestJS (or Express) + TypeScript
- ORM: Prisma
- Database: MySQL (aligned with your provided remote DB credentials)
- Auth: NextAuth/Auth.js + OAuth
- Payments: Stripe/Razorpay
- Search: Meilisearch/Elasticsearch
- Cache: Redis

## Current Status
- Project directory structure created
- Monorepo tooling foundation completed (npm workspaces + Next.js + NestJS + Prisma setup)
- Prisma schema expanded for prompts, collabs, submissions, memberships, and engagement
- Initial SQL migration generated at `db/migrations/0001_init.sql`
- Seed script created at `apps/api/prisma/seed.ts`
- Workspace `typecheck`, `lint`, and `build` are passing
- MySQL setup SQL available at `db/create_database_and_user.sql`
- Step-by-step implementation phases available at `docs/phases/IMPLEMENTATION_PHASES.md`

## Quick Navigation
- Architecture and folder map: `docs/architecture/PROJECT_STRUCTURE.md`
- Build plan by phase: `docs/phases/IMPLEMENTATION_PHASES.md`
- DB setup: `db/create_database_and_user.sql`
- Env template (root): `.env.mysql.example`

## Next Immediate Step
Apply `db/migrations/0001_init.sql` to your remote MySQL database, run seed data, then move to **Phase 3: Auth + RBAC**.

## Local Setup
1. Install dependencies:
   - `npm install --include-workspace-root`
2. Run both apps in development:
   - `npm run dev`
3. Run quality checks:
   - `npm run typecheck`
   - `npm run lint`
   - `npm run build`

## Google Login Setup (Web)
1. Copy `apps/web/.env.example` to `apps/web/.env.local`.
2. Fill these values:
   - `NEXTAUTH_URL=http://localhost:3000`
   - `NEXTAUTH_SECRET=<long-random-secret>`
   - `AUTH_API_URL=http://127.0.0.1:4000`
   - `NEXT_PUBLIC_API_URL=http://127.0.0.1:4000`
   - `GOOGLE_CLIENT_ID=<google-client-id>`
   - `GOOGLE_CLIENT_SECRET=<google-client-secret>`
3. In Google Cloud OAuth client config for local development:
   - Authorized JavaScript origin: `http://localhost:3000`
   - Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`

Security note: if a client secret has ever been shared in chat/screenshots, rotate/regenerate it in Google Cloud and use the new secret in your local env.

## API Auth Setup
1. Copy `apps/api/.env.example` to `apps/api/.env`.
2. Fill these auth-specific values:
   - `JWT_SECRET=<long-random-secret>`
   - `JWT_ACCESS_TTL_SECONDS=900`
   - `REFRESH_TOKEN_TTL_DAYS=30`
   - `FRONTEND_URL=http://localhost:3000`
   - `GOOGLE_CLIENT_ID=<same-as-web-client-id>`
3. Apply migrations in `db/migrations` (including `0002_auth.sql`), then run `npm run prisma:generate -w @gemini-prompts/api`.
4. Verify DB connectivity + required auth tables:
   - `npm run db:check -w @gemini-prompts/api`
5. Runtime health check endpoint:
   - `GET http://127.0.0.1:4000/api/health`
