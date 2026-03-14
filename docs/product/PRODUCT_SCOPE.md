# Product Scope (Implementation Baseline)

## Platform Goal
Build a prompt publishing and discovery platform with membership gating, community submissions, and modern high-performance UX.

## Content Model
- Prompt post types:
  - Gemini image prompts
  - Image prompts (normal, recreate)
  - Content prompts
  - Keyword prompts
  - Code prompts
  - Video prompts
  - Website prompts (component, feature)
- Collabs: collections of selected prompts
- Taxonomy: categories + tags
- Visibility: free vs exclusive

## User Roles
- Admin: full platform control
- Editor/Content Manager: create/publish/manage prompts
- Moderator: submission review and approval
- User: browse, submit, like, save, share

## Membership Rules
- Free: ads on, limited saved prompts, public content only
- Premium: ad-free, unlimited saves, exclusive content access

## Core Pages
- Landing page
- Category archive
- Tag archive
- Trending archive
- Latest archive
- Popular tags
- Exclusive archive
- Membership page
- Single prompt page
- Single collab page
- Submit prompt page
- Saved prompts dashboard

## Engagement and Ranking
- Like/save/share/view tracking
- Trending score based on weighted engagement signals

## Technical Baseline
- Frontend: Next.js + TypeScript + Tailwind
- Backend: NestJS/Express + Prisma
- Database: MySQL
- Search: Meilisearch/Elasticsearch
- Cache: Redis
- Payments: Stripe + Razorpay
- Storage: S3/R2

## Non-Goals for Initial Build
- Marketplace payments for creators
- Full AI playground
- Comments and ratings (can be Phase 2 expansion)
