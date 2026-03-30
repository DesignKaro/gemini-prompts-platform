// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { DEFAULT_SEO_SETTINGS } from '../lib/seo';
import { shouldDisableSchemaForRoute } from '../lib/schema-route-visibility';

describe('schema route visibility', () => {
  it('disables schema on private routes', () => {
    expect(
      shouldDisableSchemaForRoute({
        pathname: '/profile',
        settings: DEFAULT_SEO_SETTINGS,
      }),
    ).toBe(true);
    expect(
      shouldDisableSchemaForRoute({
        pathname: '/dashboard/users',
        settings: DEFAULT_SEO_SETTINGS,
      }),
    ).toBe(true);
  });

  it('disables schema for auth modal callback URLs', () => {
    expect(
      shouldDisableSchemaForRoute({
        pathname: '/',
        search: '?auth=signin&callbackUrl=%2Fprofile',
        settings: DEFAULT_SEO_SETTINGS,
      }),
    ).toBe(true);
  });

  it('disables schema for configured noindex route families', () => {
    expect(
      shouldDisableSchemaForRoute({
        pathname: '/search',
        settings: { ...DEFAULT_SEO_SETTINGS, noindexSearchPages: true },
      }),
    ).toBe(true);

    expect(
      shouldDisableSchemaForRoute({
        pathname: '/blog/design-trends',
        settings: { ...DEFAULT_SEO_SETTINGS, noindexBlogPostPages: true },
      }),
    ).toBe(true);

    expect(
      shouldDisableSchemaForRoute({
        pathname: '/about',
        settings: { ...DEFAULT_SEO_SETTINGS, noindexStaticPages: true },
      }),
    ).toBe(true);
  });

  it('disables schema for paginated archives when configured', () => {
    expect(
      shouldDisableSchemaForRoute({
        pathname: '/blog',
        search: '?page=2',
        settings: { ...DEFAULT_SEO_SETTINGS, noindexPaginatedArchives: true },
      }),
    ).toBe(true);
  });

  it('keeps schema enabled for indexable public routes', () => {
    expect(
      shouldDisableSchemaForRoute({
        pathname: '/trending',
        settings: { ...DEFAULT_SEO_SETTINGS, noindexStaticPages: false },
      }),
    ).toBe(false);
  });
});
