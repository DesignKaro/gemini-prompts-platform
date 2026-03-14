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
