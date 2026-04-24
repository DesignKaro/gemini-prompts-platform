# AdSense rollout

This project uses a hybrid AdSense setup:

- the global AdSense loader is already injected on public pages only
- private routes stay ad-free
- manual units are reserved for high-intent content pages

## Manual slot env vars

This repo now ships with your current recommended defaults already mapped:

- prompt/blog/newsletter inline article ads: `9399622723`
- prompt/blog/newsletter multiplex ads: `9910239098`

If you want to override them later without a code change, set these public environment variables:

```bash
NEXT_PUBLIC_ADSENSE_SLOT_PROMPT_INLINE=
NEXT_PUBLIC_ADSENSE_SLOT_PROMPT_MULTIPLEX=
NEXT_PUBLIC_ADSENSE_SLOT_POST_INLINE=
NEXT_PUBLIC_ADSENSE_SLOT_POST_MULTIPLEX=
```

If a slot is missing, the corresponding manual unit stays hidden.

Additional available inventory from your AdSense account, intentionally held back for later testing:

- display ad: `6769589953`
- in-feed ad: `9419284505`

## Launch settings in AdSense

Start with Auto ads enabled only for:

- `Anchor ads`
- `Vignette ads`
- `Multiplex ads`
- optional `Side rail ads` on wide desktop after visual review

Keep these off at launch:

- `Ad intents`
- aggressive in-page insertions

Recommended initial vignette frequency:

- `10 minutes`

## Pages intentionally kept ad-light or ad-free

Keep these out of the rollout:

- `/`
- `/dashboard/*`
- `/profile/*`
- `/login`
- `/membership/manage`

The global loader already excludes the private routes above. Use AdSense `Excluded pages` to reinforce the same boundaries, and exclude `/` too if Auto ads place anything too aggressively there.

## Manual placements in code

Current manual placements are limited to:

- prompt detail pages:
  - one in-content ad after the main prompt section
  - one end-of-content multiplex block before related prompts
- blog posts:
  - one in-article ad after the hero/intro area and before the deep article body
  - one end-of-content multiplex block before related posts
- newsletter issues:
  - one in-article ad after the hero/intro area and before the deep article body
  - one end-of-content multiplex block before related issues

Manual units are intentionally skipped on locked premium content so they do not compete with membership conversion.

## Excluded areas to configure in AdSense

Use AdSense `Excluded areas` to block ads near:

- the sticky header and primary navigation
- newsletter signup blocks
- membership upsell cards
- prompt action buttons such as save, like, copy, and unlock
- comments and comment submission UI
- profile, dashboard, and account management screens

## What is still needed from the business side

Before we can fully tune revenue vs UX, collect:

- top landing pages
- mobile vs desktop split
- top countries
- average session duration or scroll depth
- pages with strongest membership or affiliate conversion

That data will tell us whether to keep the homepage ad-free permanently and whether desktop side rails are worth enabling.
