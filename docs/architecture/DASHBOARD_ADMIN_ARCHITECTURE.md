# Dashboard/Admin Architecture

## Goals

- Keep dashboard routes and admin APIs stable while making the codebase domain-first.
- Make dashboard pages thin and move behavior into feature modules.
- Enforce reliability constraints with architecture checks and release gates.

## Web Structure

- Route layer: `apps/web/app/dashboard/**`
  - Route files should only compose a domain screen and route-level wiring.
  - Business logic should live in feature modules.
- Feature layer: `apps/web/features/dashboard/**`
  - Domain modules: `overview`, `analytics`, `activity`, `search`, `categories`, `tags`, `prompts`, `posts`, `media`, `comments`, `users`, `roles`, `profile`.
  - Standard domain contract:
    - `index.ts`
    - `types.ts`
    - `api.ts`
    - `hooks.ts`
    - `state.ts`
    - `components/*`
- Core compatibility layer: `apps/web/features/dashboard/core/**`
  - Re-exports `use-admin-api`, shared error rendering, and bulk helpers.

## API Structure

- Composition module: `apps/api/src/modules/admin/admin.module.ts`
- Domain modules under `apps/api/src/modules/admin/*` (for example `posts/posts.module.ts`).
- Shared admin helpers under `apps/api/src/modules/admin/common/**`.
- Existing endpoint contracts and paths remain unchanged.

## Boundary Rules

- Do not call raw `fetch` in dashboard routes/features. Use the shared admin API runner.
- Do not add duplicate route artifacts such as `page 2.tsx`.
- Keep source trees free of system artifacts such as `.DS_Store`.
- Prefer imports through domain public entrypoints (`index.ts`) instead of cross-domain deep imports.

## Reliability Gate

- Dashboard release gate includes:
  - web/api typecheck
  - web/api lint
  - dashboard architecture checks
  - db check and integrity audit
  - dashboard smoke suite
