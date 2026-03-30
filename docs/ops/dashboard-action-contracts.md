# Dashboard Action Contract Matrix

## Standard Error Contract
- Dashboard-related endpoints return structured errors with:
  - `statusCode` (number)
  - `message` (string or string[])
  - `error` (string)
  - optional `code` (string)
- Request correlation uses the `x-request-id` response header (also mirrored in JSON errors when available).
- Client-to-server action correlation uses `x-dashboard-action` on dashboard/profile requests and is captured in dashboard structured logs.
- Status mapping standards:
  - `400` invalid body/query/param at controller boundary
  - `401` unauthenticated
  - `403` authenticated but insufficient permission
  - `404` missing resource
  - `409` conflict (for example unique collisions)
  - `503` transient infrastructure/database unavailable
  - `500` unexpected/unhandled server errors only

## Dashboard Endpoint Families

| Family | Routes | Primary Actions |
|---|---|---|
| Overview | `/api/admin/analytics`, `/api/admin/activity` | Read overview metrics, read recent activity |
| Search | `/api/admin/search`, `/api/admin/search-suggestions` | Query full results, query typeahead suggestions |
| Categories | `/api/admin/categories`, `/api/admin/categories/:id`, `/api/admin/categories/:id/restore` | List/read/create/update/delete/restore |
| Tags | `/api/admin/tags`, `/api/admin/tags/:id`, `/api/admin/tags/:id/restore` | List/read/create/update/delete/restore |
| Prompts | `/api/admin/prompts`, `/api/admin/prompts/:id`, `/api/admin/prompts/:id/status`, `/api/admin/prompts/:id/restore` | List/read/create/update/status/delete/restore |
| Posts | `/api/admin/posts`, `/api/admin/posts/:id`, `/api/admin/posts/:id/restore` | List/read/create/update/delete/restore |
| Media | `/api/admin/media`, `/api/admin/media/:id`, `/api/admin/media/:id/restore` | List/read/create/update/delete/restore |
| Comments | `/api/admin/comments`, `/api/admin/comments/:id`, `/api/admin/comments/:id/reply` | List/read/create/reply/update/delete |
| Users | `/api/admin/users`, `/api/admin/users/:id`, `/api/admin/users/:id/roles`, `/api/admin/users/:id/suspend`, `/api/admin/users/:id/activate` | List/read/create/update/role-assign/suspend/activate/delete |
| Roles | `/api/admin/roles`, `/api/admin/roles/:id`, `/api/admin/roles/permissions` | List/create/update/delete, list permissions |
| Profile (Dashboard Modal) | `/api/auth/profile/summary`, `/api/auth/profile` | Read summary, update profile |

## Validation and Reliability Guarantees
- All admin query/body inputs use DTO validation with transformation; ad hoc `parseInt` parsing is removed from controllers.
- Services enforce relationship integrity before writes where applicable (for example category/tag/user-role references).
- Prisma errors are mapped into deterministic HTTP contracts instead of leaking generic internal errors.
- Dashboard client mutations use a shared request runner with:
  - duplicate-submit locking for mutations
  - standardized action-scoped errors (action + message + request ID)
  - single retry for transient timeout/`503` cases per request policy
