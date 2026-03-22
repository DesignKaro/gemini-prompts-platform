# Database Setup (MySQL)

## 1. Create DB and user
Run:
- `db/create_database_and_user.sql`

This script creates:
- Database: `u507572967_gemini_prompts`
- User: `u507572967_gemini_prompts`

## 2. Set API environment
In `apps/api/.env` set:
- `DATABASE_URL=mysql://<user>:<password>@<host>:3306/<database>`

## 3. Apply schema migrations
Apply each SQL migration in order using your MySQL client/tooling:
- `db/migrations/0001_init.sql`
- `db/migrations/0002_auth.sql`
- `db/migrations/0003_profile.sql`
- `db/migrations/0004_avatar.sql`
- `db/migrations/0005_saved_prompts_index.sql`
- `db/migrations/0006_user_handle.sql`
- `db/migrations/0007_dashboard.sql`
- continue sequentially through the latest file in `db/migrations/`
  (currently `0017_comment_like_and_thread_perf.sql`)

Or apply them programmatically (idempotent, safe to re-run):
- `npm run db:migrate:all -w @gemini-prompts/api`

## 4. Generate Prisma client
- `npm run prisma:generate -w @gemini-prompts/api`

## 5. Seed sample data (optional)
- `npm run prisma:seed -w @gemini-prompts/api`
