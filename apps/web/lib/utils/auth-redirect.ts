import {
  buildAuthCallbackFallbackFromHref,
  normalizeAuthCallbackPath,
} from './auth-callback';

export function buildSignInModalUrl(currentHref: string, callbackUrl?: string): string {
  const currentUrl = new URL(currentHref);
  const fallbackCallback = buildAuthCallbackFallbackFromHref(currentHref);
  const normalizedCallback = normalizeAuthCallbackPath(callbackUrl, {
    origin: currentUrl.origin,
    fallback: fallbackCallback,
  });

  currentUrl.searchParams.set('auth', 'signin');
  currentUrl.searchParams.set('callbackUrl', normalizedCallback);

  return currentUrl.toString();
}

export function redirectToSignInModal(callbackUrl?: string) {
  if (typeof window === 'undefined') {
    return;
  }

  window.location.assign(buildSignInModalUrl(window.location.href, callbackUrl));
}
