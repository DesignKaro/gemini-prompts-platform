const DUMMY_ORIGIN = 'https://callback.local';

function toRelativePath(url: URL): string {
  const relative = `${url.pathname}${url.search}${url.hash}`;
  return relative.length > 0 ? relative : '/';
}

function isSafeRelativePath(value: string): boolean {
  return value.startsWith('/') && !value.startsWith('//');
}

function isDisallowedCallbackPath(pathname: string): boolean {
  return pathname.startsWith('/api/auth');
}

export function stripAuthModalQueryParams(path: string): string {
  const trimmed = path.trim();
  if (!isSafeRelativePath(trimmed)) {
    return '/';
  }

  try {
    const parsed = new URL(trimmed, DUMMY_ORIGIN);
    parsed.searchParams.delete('auth');
    parsed.searchParams.delete('callbackUrl');
    return toRelativePath(parsed);
  } catch {
    return '/';
  }
}

export function buildAuthCallbackFallbackFromHref(href: string): string {
  try {
    const parsed = new URL(href);
    parsed.searchParams.delete('auth');
    parsed.searchParams.delete('callbackUrl');
    return toRelativePath(parsed);
  } catch {
    return '/';
  }
}

export function buildAuthCallbackFallbackFromPath(
  pathname?: string | null,
  search?: string | null,
  hash?: string | null,
): string {
  const safePathname =
    typeof pathname === 'string' && isSafeRelativePath(pathname.trim()) ? pathname.trim() : '/';
  const safeSearch =
    typeof search === 'string' && search.trim()
      ? search.startsWith('?')
        ? search
        : `?${search}`
      : '';
  const safeHash =
    typeof hash === 'string' && hash.trim() ? (hash.startsWith('#') ? hash : `#${hash}`) : '';

  return stripAuthModalQueryParams(`${safePathname}${safeSearch}${safeHash}`);
}

export function resolveAuthCallbackPath(
  value: string | null | undefined,
  origin?: string | null,
): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith('//')) {
    return null;
  }

  if (isSafeRelativePath(trimmed)) {
    try {
      const parsed = new URL(trimmed, DUMMY_ORIGIN);
      if (isDisallowedCallbackPath(parsed.pathname)) {
        return null;
      }
      return toRelativePath(parsed);
    } catch {
      return null;
    }
  }

  if (!origin) {
    return null;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.origin !== origin) {
      return null;
    }
    if (isDisallowedCallbackPath(parsed.pathname)) {
      return null;
    }
    return toRelativePath(parsed);
  } catch {
    return null;
  }
}

export function normalizeAuthCallbackPath(
  value: string | null | undefined,
  options?: {
    origin?: string | null;
    fallback?: string | null | undefined;
  },
): string {
  const fallback =
    resolveAuthCallbackPath(options?.fallback, options?.origin) ??
    (typeof options?.fallback === 'string' ? stripAuthModalQueryParams(options.fallback) : '/') ??
    '/';

  return resolveAuthCallbackPath(value, options?.origin) ?? fallback;
}

export function getAuthRedirectTarget(options: {
  resultUrl?: string | null;
  callbackUrl?: string | null;
  origin?: string | null;
  fallback?: string;
}): string {
  const resultPath = resolveAuthCallbackPath(options.resultUrl, options.origin);
  const callbackPath = resolveAuthCallbackPath(options.callbackUrl, options.origin);

  return resultPath ?? callbackPath ?? options.fallback ?? '/';
}

export function redirectToAuthPath(path: string) {
  if (typeof window === 'undefined') {
    return;
  }
  window.location.assign(path);
}
