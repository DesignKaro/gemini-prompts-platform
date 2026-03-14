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

## 3. Apply schema migration
Initial schema SQL generated at:
- `db/migrations/0001_init.sql`

Apply it via your MySQL client/tooling.

## 4. Generate Prisma client
- `npm run prisma:generate -w @gemini-prompts/api`

## 5. Seed sample data (optional)
- `npm run prisma:seed -w @gemini-prompts/api`
