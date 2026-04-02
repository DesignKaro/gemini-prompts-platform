import { describe, expect, it } from 'vitest';
import { buildLoginPageUrl, buildSignInModalUrl } from '../lib/utils/auth-redirect';

describe('buildSignInModalUrl', () => {
  it('preserves current path query in callback when not provided', () => {
    const url = new URL(buildSignInModalUrl('https://geminiprompts.io/search?q=seo'));

    expect(url.pathname).toBe('/search');
    expect(url.searchParams.get('auth')).toBe('signin');
    expect(url.searchParams.get('callbackUrl')).toBe('/search?q=seo');
  });

  it('rejects unsafe callback values and falls back to current page', () => {
    const url = new URL(
      buildSignInModalUrl('https://geminiprompts.io/prompt/abc?view=full', '//evil.com'),
    );

    expect(url.searchParams.get('callbackUrl')).toBe('/prompt/abc?view=full');
  });

  it('accepts same-origin absolute callback values', () => {
    const url = new URL(
      buildSignInModalUrl(
        'https://geminiprompts.io/prompts',
        'https://geminiprompts.io/dashboard/content/prompts?take=20',
      ),
    );

    expect(url.searchParams.get('callbackUrl')).toBe('/dashboard/content/prompts?take=20');
  });

  it('rejects api auth callback values and falls back to current page', () => {
    const url = new URL(
      buildSignInModalUrl('https://geminiprompts.io/search?q=x', '/api/auth/signin'),
    );

    expect(url.searchParams.get('callbackUrl')).toBe('/search?q=x');
  });
});

describe('buildLoginPageUrl', () => {
  it('redirects to /login with callback set to current page when callback is missing', () => {
    const url = new URL(buildLoginPageUrl('https://geminiprompts.io/profile?tab=saved'));

    expect(url.pathname).toBe('/login');
    expect(url.searchParams.get('callbackUrl')).toBe('/profile?tab=saved');
  });

  it('normalizes provided same-origin absolute callback values', () => {
    const url = new URL(
      buildLoginPageUrl(
        'https://geminiprompts.io/dashboard/content/posts',
        'https://geminiprompts.io/membership/manage?from=pricing',
      ),
    );

    expect(url.pathname).toBe('/login');
    expect(url.searchParams.get('callbackUrl')).toBe('/membership/manage?from=pricing');
  });

  it('rejects unsafe callback values and falls back to current page', () => {
    const url = new URL(buildLoginPageUrl('https://geminiprompts.io/profile', '//evil.com/phish'));

    expect(url.searchParams.get('callbackUrl')).toBe('/profile');
  });
});
