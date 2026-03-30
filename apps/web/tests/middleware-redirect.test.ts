import { describe, expect, it } from 'vitest';
import {
  isSameManagedRedirectTarget,
  shouldCheckManagedRedirect,
} from '../lib/utils/middleware-redirect';

describe('middleware redirect helpers', () => {
  it('checks managed redirects for root path', () => {
    expect(shouldCheckManagedRedirect({ pathname: '/' })).toBe(true);
  });

  it('skips managed redirects for excluded paths', () => {
    expect(shouldCheckManagedRedirect({ pathname: '/api/public/home' })).toBe(false);
    expect(shouldCheckManagedRedirect({ pathname: '/_next/static/chunk.js' })).toBe(false);
    expect(shouldCheckManagedRedirect({ pathname: '/dashboard/users' })).toBe(false);
    expect(shouldCheckManagedRedirect({ pathname: '/favicon.ico' })).toBe(false);
  });

  it('detects same-target redirects to prevent loops', () => {
    const destination = new URL('/old?x=1', 'https://geminiprompts.io');
    expect(
      isSameManagedRedirectTarget({
        currentOrigin: 'https://geminiprompts.io',
        currentPathname: '/old',
        currentSearch: '?x=1',
        destinationUrl: destination,
      }),
    ).toBe(true);
  });
});
