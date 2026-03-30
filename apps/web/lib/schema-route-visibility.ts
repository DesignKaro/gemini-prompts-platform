import type { SeoSettings } from './seo';

export const SCHEMA_REQUEST_PATHNAME_HEADER = 'x-gp-pathname';
export const SCHEMA_REQUEST_SEARCH_HEADER = 'x-gp-search';

type SchemaRouteContext = {
  pathname: string;
  search?: string;
  settings: Pick<
    SeoSettings,
    | 'robotsSiteIndex'
    | 'noindexSearchPages'
    | 'noindexPaginatedArchives'
    | 'noindexAuthorPages'
    | 'noindexTagPages'
    | 'noindexCategoryPages'
    | 'noindexBlogArchivePages'
    | 'noindexBlogPostPages'
    | 'noindexStaticPages'
  >;
};

const PRIVATE_ROUTE_PREFIXES = ['/dashboard', '/profile', '/login', '/membership/manage'];
const STATIC_NOINDEX_ROUTE_SET = new Set<string>([
  '/about',
  '/contact',
  '/help',
  '/privacy-policy',
  '/terms',
  '/disclaimer',
  '/code-of-conduct',
  '/refund-and-return-policy',
  '/membership',
  '/latest',
  '/trending',
  '/most-popular',
  '/exclusive',
  '/newsletter',
  '/popular-tags',
]);

function normalizePathname(pathname: string) {
  const withLeadingSlash = pathname.startsWith('/') ? pathname : `/${pathname}`;
  const stripped = withLeadingSlash.replace(/\/+$/, '');
  return stripped.length > 0 ? stripped : '/';
}

function toSearchParams(search?: string) {
  if (!search) return new URLSearchParams();
  return new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
}

function isPaginatedRequest(searchParams: URLSearchParams) {
  const pageParam = searchParams.get('page');
  if (!pageParam) return false;
  const page = Number.parseInt(pageParam, 10);
  return Number.isFinite(page) && page > 1;
}

function hasPrivateOrAuthIntent(pathname: string, searchParams: URLSearchParams) {
  if (PRIVATE_ROUTE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return true;
  }

  if (pathname.startsWith('/api/')) {
    return true;
  }

  if (searchParams.get('auth') === 'signin') {
    return true;
  }

  return searchParams.has('callbackUrl');
}

export function shouldDisableSchemaForRoute({
  pathname,
  search,
  settings,
}: SchemaRouteContext): boolean {
  if (!settings.robotsSiteIndex) {
    return true;
  }

  const normalizedPathname = normalizePathname(pathname);
  const searchParams = toSearchParams(search);

  if (hasPrivateOrAuthIntent(normalizedPathname, searchParams)) {
    return true;
  }

  if (settings.noindexSearchPages && normalizedPathname === '/search') {
    return true;
  }

  if (settings.noindexPaginatedArchives && isPaginatedRequest(searchParams)) {
    return true;
  }

  if (
    settings.noindexAuthorPages &&
    (normalizedPathname === '/author' || normalizedPathname.startsWith('/u/'))
  ) {
    return true;
  }

  if (
    settings.noindexTagPages &&
    (normalizedPathname === '/tag' || normalizedPathname.startsWith('/tag/'))
  ) {
    return true;
  }

  if (
    settings.noindexCategoryPages &&
    (normalizedPathname === '/category' || normalizedPathname.startsWith('/category/'))
  ) {
    return true;
  }

  if (settings.noindexBlogArchivePages && normalizedPathname === '/blog') {
    return true;
  }

  if (settings.noindexBlogPostPages && normalizedPathname.startsWith('/blog/')) {
    return true;
  }

  if (settings.noindexStaticPages && STATIC_NOINDEX_ROUTE_SET.has(normalizedPathname)) {
    return true;
  }

  return false;
}
