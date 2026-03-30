import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from './auth';
import { normalizeAuthCallbackPath } from './lib/utils/auth-callback';
import {
  SCHEMA_REQUEST_PATHNAME_HEADER,
  SCHEMA_REQUEST_SEARCH_HEADER,
} from './lib/schema-route-visibility';
import {
  isSameManagedRedirectTarget,
  shouldCheckManagedRedirect,
} from './lib/utils/middleware-redirect';
import { resolveApiBaseUrl } from './lib/utils/api-base-url';

const API_BASE_URL = resolveApiBaseUrl();
const DEV_WARNING_THROTTLE_MS = 15_000;
const devWarningCooldownByKey = new Map<string, number>();

type NextAuthRequest = NextRequest & {
  auth?: unknown;
};

function logDevelopmentWarning(key: string, error: unknown) {
  if (process.env.NODE_ENV === 'production') return;

  const now = Date.now();
  const nextAllowedAt = devWarningCooldownByKey.get(key) ?? 0;
  if (now < nextAllowedAt) return;
  devWarningCooldownByKey.set(key, now + DEV_WARNING_THROTTLE_MS);

  const message = error instanceof Error ? error.message : String(error);
  console.warn(`[middleware] ${key}: ${message}`);
}

async function fetchApiWithTimeout(
  path: string,
  options: RequestInit = {},
  timeoutMs = 1_200,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

function nextResponseWithRequestContext(req: NextRequest) {
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set(SCHEMA_REQUEST_PATHNAME_HEADER, req.nextUrl.pathname);
  requestHeaders.set(SCHEMA_REQUEST_SEARCH_HEADER, req.nextUrl.search);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

const middleware = auth(async (req: NextAuthRequest): Promise<Response | void> => {
  const { pathname } = req.nextUrl;

  const shouldCheckRedirects = shouldCheckManagedRedirect({ pathname });

  if (shouldCheckRedirects) {
    try {
      const resolvePath = `${pathname}${req.nextUrl.search}`;
      const response = await fetchApiWithTimeout(
        `/api/public/seo/redirects/resolve?path=${encodeURIComponent(resolvePath)}`,
        {
          next: { revalidate: 300 },
        },
      );

      if (response.ok) {
        let rule: { destinationPath?: string; isPermanent?: boolean } | null = null;
        const raw = await response.text();
        if (raw.trim().length > 0) {
          try {
            rule = JSON.parse(raw) as { destinationPath?: string; isPermanent?: boolean } | null;
          } catch {
            rule = null;
          }
        }

        if (rule?.destinationPath && rule.destinationPath !== resolvePath) {
          const isAbsoluteDestination = /^https?:\/\//i.test(rule.destinationPath);
          const destinationUrl = isAbsoluteDestination
            ? new URL(rule.destinationPath)
            : new URL(rule.destinationPath, req.nextUrl.origin);

          if (!isAbsoluteDestination && !destinationUrl.search && req.nextUrl.search) {
            destinationUrl.search = req.nextUrl.search;
          }

          if (
            isSameManagedRedirectTarget({
              currentOrigin: req.nextUrl.origin,
              currentPathname: pathname,
              currentSearch: req.nextUrl.search,
              destinationUrl,
            })
          ) {
            return nextResponseWithRequestContext(req);
          }

          return NextResponse.redirect(destinationUrl, rule.isPermanent ? 301 : 302);
        }
      }
    } catch (error) {
      logDevelopmentWarning('managed redirect lookup skipped', error);
    }
  }

  if (pathname === '/api/auth/signin') {
    const callbackPath = normalizeAuthCallbackPath(req.nextUrl.searchParams.get('callbackUrl'), {
      origin: req.nextUrl.origin,
      fallback: '/',
    });
    const url = req.nextUrl.clone();
    url.pathname = '/';
    url.search = '';
    url.searchParams.set('auth', 'signin');
    url.searchParams.set('callbackUrl', callbackPath);
    return NextResponse.redirect(url);
  }

  // 1. Handle legacy prompt redirects: /prompt/:slug -> /:category/:slug
  if (pathname.startsWith('/prompt/') && !pathname.includes('.')) {
    const slug = pathname.replace('/prompt/', '').split('/')[0];
    if (slug) {
      try {
        // Fetch only the necessary fields to resolve the category slug
        const response = await fetchApiWithTimeout(`/api/public/prompts/${slug}`, {
          next: { revalidate: 3600 },
        });

        if (response.ok) {
          const prompt = await response.json();
          const categorySlug =
            prompt.primaryCategory?.slug || prompt.categories?.[0]?.slug || 'uncategorized';
          const url = req.nextUrl.clone();
          url.pathname = `/${categorySlug}/${slug}`;
          return NextResponse.redirect(url, 301);
        }
      } catch (error) {
        logDevelopmentWarning('legacy prompt redirect lookup skipped', error);
      }
    }
  }

  // 2. Default dashboard auth handling (the original behavior)
  if (pathname.startsWith('/dashboard')) {
    const session = req.auth;
    if (!session) {
      const url = req.nextUrl.clone();
      url.pathname = '/';
      url.searchParams.set('auth', 'signin');
      url.searchParams.set('callbackUrl', `${pathname}${req.nextUrl.search}`);
      return NextResponse.redirect(url);
    }
  }

  return nextResponseWithRequestContext(req);
});

export default middleware as (req: NextRequest) => Promise<Response | void>;

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico).*)'],
};
