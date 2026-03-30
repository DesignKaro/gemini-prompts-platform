# Dashboard Failure Triage Runbook

## Purpose
- Triage dashboard failures quickly using request correlation metadata.
- Separate user-input issues from platform errors and transient incidents.

## Required Correlation Data
- `x-request-id` from API response headers (also returned in dashboard error payloads when available).
- `x-dashboard-action` from client requests (logged as `clientAction` in API logs).
- Server log fields for dashboard events:
  - `requestId`
  - `actorId`
  - `route`
  - `action`
  - `clientAction`
  - `status`
  - `code`
  - `durationMs`

## Triage Steps
1. Collect the exact user-visible error and request ID.
2. Query dashboard action logs by `requestId`.
3. Confirm whether `status` is:
   - `4xx`: validation, permission, conflict, or not-found.
   - `503`: transient database/infrastructure event.
   - `500`: unexpected failure that needs code-level investigation.
4. Use `clientAction` + `route` to identify the failing page flow.
5. Review mapped error `code`:
   - `VALIDATION_ERROR`, Prisma validation/relationship codes, conflicts, availability codes.
6. If repeated failures exist for the same action:
   - compare actor scope (single user vs multi-user)
   - compare duration and status trends for regression signals.

## Immediate Response Playbook
- If `503` spikes: treat as platform incident, announce degraded mode, and pause dashboard deploys.
- If `400/409` spikes after UI change: treat as client payload regression and rollback/revert relevant frontend action flow.
- If `500` appears for a dashboard action:
  - open high-priority bug with request IDs + action metadata
  - capture last known deploy SHA and recent DB/tooling changes.

## Release Gate Requirements
- `npm run typecheck -w @gemini-prompts/api`
- `npm run typecheck -w @gemini-prompts/web`
- `npm run lint -w @gemini-prompts/api`
- `npm run lint -w @gemini-prompts/web`
- `npm run db:check -w @gemini-prompts/api`
- `npm run db:integrity:audit -w @gemini-prompts/api`
- `npm run dashboard:smoke`

