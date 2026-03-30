import { describe, expect, it } from 'vitest';
import {
  buildAuthCallbackFallbackFromHref,
  normalizeAuthCallbackPath,
  resolveAuthCallbackPath,
  stripAuthModalQueryParams,
} from '../lib/utils/auth-callback';

describe('auth callback helpers', () => {
  it('accepts safe relative callbacks', () => {
    expect(
      normalizeAuthCallbackPath('/dashboard?tab=seo', {
        origin: 'https://geminiprompts.io',
        fallback: '/',
      }),
    ).toBe('/dashboard?tab=seo');
  });

  it('accepts same-origin absolute callbacks as relative paths', () => {
    expect(
      normalizeAuthCallbackPath('https://geminiprompts.io/search?q=seo#results', {
        origin: 'https://geminiprompts.io',
        fallback: '/',
      }),
    ).toBe('/search?q=seo#results');
  });

  it('rejects protocol-relative and external callbacks', () => {
    expect(
      normalizeAuthCallbackPath('//evil.com', {
        origin: 'https://geminiprompts.io',
        fallback: '/safe',
      }),
    ).toBe('/safe');
    expect(
      normalizeAuthCallbackPath('https://evil.com/phish', {
        origin: 'https://geminiprompts.io',
        fallback: '/safe',
      }),
    ).toBe('/safe');
  });

  it('rejects malformed and javascript callbacks', () => {
    expect(
      normalizeAuthCallbackPath('javascript:alert(1)', {
        origin: 'https://geminiprompts.io',
        fallback: '/safe',
      }),
    ).toBe('/safe');
    expect(
      normalizeAuthCallbackPath('not a url', {
        origin: 'https://geminiprompts.io',
        fallback: '/safe',
      }),
    ).toBe('/safe');
  });

  it('strips auth modal query params from fallback paths', () => {
    expect(
      stripAuthModalQueryParams('/search?q=prompt&auth=signin&callbackUrl=%2Fdashboard#top'),
    ).toBe('/search?q=prompt#top');
    expect(
      buildAuthCallbackFallbackFromHref(
        'https://geminiprompts.io/search?q=prompt&auth=signin&callbackUrl=%2Fdashboard#top',
      ),
    ).toBe('/search?q=prompt#top');
  });

  it('returns null for unresolved callbacks', () => {
    expect(resolveAuthCallbackPath(undefined, 'https://geminiprompts.io')).toBeNull();
    expect(resolveAuthCallbackPath('', 'https://geminiprompts.io')).toBeNull();
    expect(resolveAuthCallbackPath('//evil.com', 'https://geminiprompts.io')).toBeNull();
  });

  it('rejects auth api callback routes to prevent sign-in loops', () => {
    expect(
      normalizeAuthCallbackPath('/api/auth/signin', {
        origin: 'https://geminiprompts.io',
        fallback: '/safe',
      }),
    ).toBe('/safe');

    expect(
      normalizeAuthCallbackPath('https://geminiprompts.io/api/auth/signin?callbackUrl=%2Fdash', {
        origin: 'https://geminiprompts.io',
        fallback: '/safe',
      }),
    ).toBe('/safe');
  });
});
