# Project Structure

This structure is designed for a scalable, headless app with separate frontend and backend.

```text
Gemini Prompts/
├── README.md
├── apps/
│   ├── web/
│   │   ├── app/
│   │   │   ├── page.tsx
│   │   │   ├── category/[slug]/page.tsx
│   │   │   ├── tag/[slug]/page.tsx
│   │   │   ├── trending/page.tsx
│   │   │   ├── latest/page.tsx
│   │   │   ├── membership/page.tsx
│   │   │   ├── submit/page.tsx
│   │   │   ├── prompt/[slug]/page.tsx
│   │   │   ├── collab/[slug]/page.tsx
│   │   │   ├── dashboard/saved-prompts/page.tsx
│   │   │   ├── exclusive/page.tsx
│   │   │   ├── popular-tags/page.tsx
│   │   │   └── search/page.tsx
│   │   ├── components/
│   │   │   ├── common/
│   │   │   ├── layout/
│   │   │   ├── membership/
│   │   │   └── prompts/
│   │   ├── features/
│   │   │   ├── auth/
│   │   │   ├── collabs/
│   │   │   ├── membership/
│   │   │   ├── prompts/
│   │   │   ├── search/
│   │   │   ├── submission/
│   │   │   └── user/
│   │   ├── hooks/
│   │   ├── lib/
│   │   │   ├── api/
│   │   │   ├── auth/
│   │   │   └── utils/
│   │   ├── public/
│   │   │   └── images/
│   │   ├── styles/
│   │   └── tests/
│   └── api/
│       ├── src/
│       │   ├── common/
│       │   │   ├── decorators/
│       │   │   ├── dto/
│       │   │   ├── filters/
│       │   │   ├── guards/
│       │   │   ├── interceptors/
│       │   │   ├── middlewares/
│       │   │   ├── pipes/
│       │   │   └── utils/
│       │   ├── config/
│       │   └── modules/
│       │       ├── admin/
│       │       ├── analytics/
│       │       ├── auth/
│       │       ├── categories/
│       │       ├── collabs/
│       │       ├── engagement/
│       │       ├── membership/
│       │       ├── prompts/
│       │       ├── search/
│       │       ├── submissions/
│       │       ├── tags/
│       │       └── users/
│       ├── prisma/
│       │   ├── migrations/
│       │   ├── schema.prisma
│       │   └── seeds/
│       └── tests/
├── db/
│   ├── create_database_and_user.sql
│   ├── migrations/
│   └── seeds/
├── docs/
│   ├── api/
│   ├── architecture/
│   │   └── PROJECT_STRUCTURE.md
│   ├── ops/
│   ├── phases/
│   │   └── IMPLEMENTATION_PHASES.md
│   └── product/
├── infra/
│   ├── ci/
│   ├── docker/
│   └── nginx/
├── packages/
│   ├── config-eslint/
│   ├── config-ts/
│   ├── types/
│   └── ui/
└── scripts/
```

## Notes

- `apps/web` and `apps/api` remain decoupled for clean headless architecture.
- `packages` supports reusable shared code and unified tooling.
- `docs/phases` is the execution source of truth.
