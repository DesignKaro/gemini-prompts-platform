# Implementation Phases (Step-by-Step)

This roadmap is sequenced to deliver value early while keeping architecture clean and scalable.

## Status Snapshot

- Completed: Phase 1 foundation scaffold (workspace, app bootstraps, lint/typecheck/build baseline)
- Completed (local): Phase 2 schema baseline (Prisma schema + initial migration + seed script)
- Next: Apply migration to remote DB and start Phase 3 auth and RBAC implementation

## Phase 0: Product Lock + Technical Decisions

**Goal:** Freeze scope, stack, and data rules before coding deeply.

- Confirm final backend framework: NestJS (recommended) vs Express.
- Confirm payment providers: Stripe + Razorpay strategy.
- Confirm search engine: Meilisearch first, Elasticsearch later if needed.
- Finalize membership rules (save limit, exclusive access, ad logic).
- Finalize content moderation policy.

**Exit Criteria**

- Product and technical decisions documented in `docs/product`.

---

## Phase 1: Monorepo + Tooling Foundation

**Goal:** Setup engineering foundation.

- Initialize package manager workspace (`pnpm` recommended).
- Initialize `apps/web` with Next.js + TypeScript + Tailwind.
- Initialize `apps/api` with NestJS + TypeScript.
- Add ESLint, Prettier, Husky/lint-staged, commit conventions.
- Setup environment validation for both apps.

**Exit Criteria**

- Both apps boot locally and pass lint/typecheck.

---

## Phase 2: Database + Prisma Core Schema

**Goal:** Create stable schema for prompts and membership logic.

- Configure Prisma for MySQL.
- Create models for:
  - users, roles, sessions
  - prompts, prompt_types, categories, tags
  - collabs and prompt-collab mapping
  - likes, saves, shares, views
  - membership/subscription records
  - submissions and moderation states
- Add migration and seed strategy.

**Exit Criteria**

- Migration runs cleanly and seed data supports UI development.

---

## Phase 3: Auth + RBAC

**Goal:** Secure authentication and role-based permissions.

- Implement login/signup/OAuth.
- Implement user roles: admin, editor, moderator, user.
- Add permission guards on API routes.
- Build admin role-management endpoints.

**Exit Criteria**

- Access control works correctly per role and route.

---

## Phase 4: Prompt Publishing (Core CMS)

**Goal:** Deliver WordPress-like prompt publishing.

- CRUD for prompts with status: draft/scheduled/published.
- Prompt types and website subtypes (component/feature).
- Category/tag management.
- Free vs exclusive visibility control.
- Admin/editor publishing dashboard.

**Exit Criteria**

- Content team can create, manage, and publish prompts.

---

## Phase 5: Frontend Discovery Experience

**Goal:** Build user-facing browsing experience.

- Landing page: hero, trending, latest, tags, categories, collabs.
- Archive pages: category, tag, latest, trending, exclusive.
- Single prompt page with related prompts/collabs.
- Prompt card interactions and quick actions.

**Exit Criteria**

- Core browsing and reading flows are complete.

---

## Phase 6: Submission + Moderation Workflow

**Goal:** Enable community contribution safely.

- Frontend submit form.
- Submission queue in dashboard.
- Moderator review: approve/reject/edit/categorize.
- Audit trail for moderation decisions.

**Exit Criteria**

- End-to-end submission-to-publication flow works.

---

## Phase 7: Engagement + Trending Engine

**Goal:** Build social signals and ranking.

- Likes, saves, shares, view tracking.
- Saved prompts limits by plan.
- Implement weighted trending score.
- Scheduled ranking refresh jobs.

**Exit Criteria**

- Trending and popular content updates automatically.

---

## Phase 8: Membership + Monetization

**Goal:** Turn product into revenue-ready platform.

- Free vs premium entitlements.
- Stripe/Razorpay subscription lifecycle.
- Premium paywall for exclusive content.
- Ads integration only for free users.

**Exit Criteria**

- Membership upgrade/downgrade and paywall logic are production-ready.

---

## Phase 9: Search + Performance + SEO

**Goal:** Improve discovery and scale-readiness.

- Full-text search (title/tag/category/type).
- Optional semantic search extension.
- SSR/ISR strategy, caching with Redis/CDN.
- SEO metadata, OG tags, structured schema.

**Exit Criteria**

- Search is fast and pages are SEO/performance optimized.

---

## Phase 10: QA, Security, Launch, Observability

**Goal:** Production hardening and launch.

- Unit/integration/e2e tests for critical flows.
- Security hardening (rate limit, validation, auth checks).
- Monitoring/logging/alerts setup.
- Staging release then production launch.

**Exit Criteria**

- Platform launch checklist is complete.

---

## Recommended Build Order (Condensed)

1. Foundation + DB schema
2. Auth + RBAC
3. Prompt CMS + discovery pages
4. Submissions + moderation
5. Engagement + trending
6. Membership/payments/ads
7. Search + SEO + performance
8. QA hardening + launch
