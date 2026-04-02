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

export function buildLoginPageUrl(currentHref: string, callbackUrl?: string): string {
  const currentUrl = new URL(currentHref);
  const fallbackCallback = buildAuthCallbackFallbackFromHref(currentHref);
  const normalizedCallback = normalizeAuthCallbackPath(callbackUrl, {
    origin: currentUrl.origin,
    fallback: fallbackCallback,
  });
  const loginUrl = new URL('/login', currentUrl.origin);
  loginUrl.searchParams.set('callbackUrl', normalizedCallback);
  return loginUrl.toString();
}

export function redirectToSignInModal(
  callbackUrl?: string,
  options: {
    replace?: boolean;
  } = {},
) {
  if (typeof window === 'undefined') {
    return;
  }

  const target = buildSignInModalUrl(window.location.href, callbackUrl);
  if (options.replace) {
    window.history.replaceState(null, '', target);
    window.dispatchEvent(new PopStateEvent('popstate'));
    return;
  }
  window.history.pushState(null, '', target);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function redirectToLoginPage(
  callbackUrl?: string,
  options: {
    replace?: boolean;
  } = {},
) {
  if (typeof window === 'undefined') {
    return;
  }

  const target = buildLoginPageUrl(window.location.href, callbackUrl);
  if (options.replace) {
    window.location.replace(target);
    return;
  }
  window.location.assign(target);
}
