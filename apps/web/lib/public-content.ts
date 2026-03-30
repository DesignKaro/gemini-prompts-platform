import { resolveApiBaseUrl } from './utils/api-base-url';

const API_BASE_URL = resolveApiBaseUrl();
const DEFAULT_PUBLIC_REVALIDATE_SECONDS = 600;
const DEV_WARNING_THROTTLE_MS = 15_000;
const DEV_API_UNAVAILABLE_COOLDOWN_MS = 2_500;

let devApiUnavailableUntil = 0;
const devWarningCooldownByKey = new Map<string, number>();

function isDevelopment() {
  return process.env.NODE_ENV !== 'production';
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function markApiTemporarilyUnavailable() {
  if (!isDevelopment()) return;
  devApiUnavailableUntil = Date.now() + DEV_API_UNAVAILABLE_COOLDOWN_MS;
}

function shouldSkipApiRequest() {
  return isDevelopment() && Date.now() < devApiUnavailableUntil;
}

function logFetchWarning(key: string, message: string) {
  if (!isDevelopment()) return;

  const now = Date.now();
  const nextAllowedAt = devWarningCooldownByKey.get(key) ?? 0;
  if (now < nextAllowedAt) return;
  devWarningCooldownByKey.set(key, now + DEV_WARNING_THROTTLE_MS);

  console.warn(message);
}

async function fetchWithRetries(url: string, init: RequestInit): Promise<Response> {
  const attempts = isDevelopment() ? 4 : 1;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fetch(url, init);
    } catch (error) {
      lastError = error;
      if (attempt === attempts) {
        throw error;
      }
      await sleep(120 * attempt);
    }
  }

  throw lastError instanceof Error ? lastError : new Error('fetch failed');
}

export type PublicAuthor = {
  id: string;
  name: string;
  handle: string | null;
  slug: string;
  profileTitle: string | null;
  bio: string | null;
  avatarUrl: string | null;
  avatarUpdatedAt: string | null;
  promptCount?: number;
  postCount?: number;
  followerCount?: number;
  totalCount?: number;
};

export type PublicCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  promptCount: number;
  postCount: number;
  totalCount: number;
};

export type PublicTag = {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  promptCount: number;
  postCount: number;
  usage: number;
  description?: string;
};

export type PublicPrompt = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  promptType: string;
  visibility: 'FREE' | 'EXCLUSIVE';
  image: string | null;
  galleryImages: string[];
  metaTitle?: string | null;
  metaDescription?: string | null;
  publishedAt: string | null;
  updatedAt: string;
  viewCount: number;
  likeCount: number;
  saveCount: number;
  commentCount: number;
  isLocked: boolean;
  requiresMembership: boolean;
  author: PublicAuthor;
  primaryCategory: { id: string; name: string; slug: string } | null;
  categories: Array<{ id: string; name: string; slug: string }>;
  tags: Array<{ id: string; name: string; slug: string }>;
  content?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoFocusKeyword?: string | null;
  seoCanonicalUrl?: string | null;
  seoNoIndex?: boolean;
  relatedPrompts?: PublicPrompt[];
};

export type PublicPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  postType: string;
  postFormat: string;
  visibility: 'FREE' | 'EXCLUSIVE';
  image: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  publishedAt: string | null;
  updatedAt: string;
  viewCount: number;
  commentCount: number;
  isLocked: boolean;
  requiresMembership: boolean;
  author: PublicAuthor;
  primaryCategory: { id: string; name: string; slug: string } | null;
  categories: Array<{ id: string; name: string; slug: string }>;
  tags: Array<{ id: string; name: string; slug: string }>;
  content: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoFocusKeyword?: string | null;
  seoCanonicalUrl?: string | null;
  seoNoIndex?: boolean;
  relatedPosts?: PublicPost[];
};

export type ListResponse<T> = {
  items: T[];
  total: number;
};

export type HomeResponse = {
  categories: PublicCategory[];
  latestPrompts: PublicPrompt[];
  trendingPrompts: PublicPrompt[];
  latestPosts: PublicPost[];
  popularTags: PublicTag[];
};

export type SearchResponse = {
  query: string;
  prompts: PublicPrompt[];
  posts: PublicPost[];
  categories: PublicCategory[];
  tags: PublicTag[];
  authors: PublicAuthor[];
};

type FetchOptions = {
  allow404?: boolean;
  revalidateSeconds?: number;
  noStore?: boolean;
  accessToken?: string | null;
};

async function fetchPublicApi<T>(
  path: string,
  params?: Record<string, string | number | undefined | null>,
  options: FetchOptions = {},
): Promise<T | null> {
  if (shouldSkipApiRequest()) {
    return null;
  }

  const searchParams = new URLSearchParams();

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      searchParams.set(key, String(value));
    });
  }

  const query = searchParams.toString();
  const url = `${API_BASE_URL}/api/public/${path}${query ? `?${query}` : ''}`;
  const shouldBypassCache = options.noStore === true || process.env.NODE_ENV !== 'production';
  const resolvedRevalidate = shouldBypassCache
    ? null
    : Math.max(1, Math.floor(options.revalidateSeconds ?? DEFAULT_PUBLIC_REVALIDATE_SECONDS));

  let response: Response;
  try {
    const requestHeaders = options.accessToken
      ? { authorization: `Bearer ${options.accessToken}` }
      : undefined;
    response = await fetchWithRetries(
      url,
      resolvedRevalidate
        ? { headers: requestHeaders, next: { revalidate: resolvedRevalidate } }
        : { headers: requestHeaders, cache: 'no-store' },
    );
  } catch (error) {
    markApiTemporarilyUnavailable();
    const message = error instanceof Error ? error.message : String(error);
    logFetchWarning(`fetch-failed:${url}`, `[public-content] fetch failed for ${url}: ${message}`);
    return null;
  }

  if (response.status === 404 && options.allow404) {
    return null;
  }

  if (!response.ok) {
    logFetchWarning(
      `non-ok:${url}:${response.status}`,
      `[public-content] non-ok response for ${url}: ${response.status}`,
    );
    return null;
  }

  try {
    return (await response.json()) as T;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logFetchWarning(`invalid-json:${url}`, `[public-content] invalid JSON for ${url}: ${message}`);
    return null;
  }
}

export function formatDisplayDate(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function stripHtml(value?: string | null) {
  if (!value) return '';
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getPromptCategoryName(prompt: PublicPrompt) {
  return prompt.primaryCategory?.name || prompt.categories[0]?.name || 'Uncategorized';
}

export function getPostCategoryName(post: PublicPost) {
  return post.primaryCategory?.name || post.categories[0]?.name || 'Uncategorized';
}

export function estimateReadTime(value?: string | null) {
  const text = stripHtml(value);
  if (!text) return '1 min read';
  const words = text.split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 220));
  return `${minutes} min read`;
}

export async function getHomeContent(options?: FetchOptions) {
  const directHome = await fetchPublicApi<HomeResponse>('home', undefined, options);
  if (directHome) {
    return directHome;
  }

  // Fallback path: compose homepage payload from individual endpoints when
  // `/api/public/home` is temporarily unavailable.
  const [categoriesResponse, latestPromptsResponse, trendingPromptsResponse, latestPostsResponse, popularTagsResponse] =
    await Promise.all([
      fetchPublicApi<ListResponse<PublicCategory>>('categories', { take: 12, sort: 'popular' }, options),
      fetchPublicApi<ListResponse<PublicPrompt>>(
        'prompts',
        { take: 8, sort: 'latest', includeTags: 1 },
        options,
      ),
      fetchPublicApi<ListResponse<PublicPrompt>>(
        'prompts',
        { take: 8, sort: 'trending', includeTags: 1 },
        options,
      ),
      fetchPublicApi<ListResponse<PublicPost>>(
        'posts',
        { take: 6, sort: 'latest', includeTags: 1 },
        options,
      ),
      fetchPublicApi<ListResponse<PublicTag>>('tags', { take: 18, sort: 'popular' }, options),
    ]);

  const fallbackHome: HomeResponse = {
    categories: categoriesResponse?.items ?? [],
    latestPrompts: latestPromptsResponse?.items ?? [],
    trendingPrompts: trendingPromptsResponse?.items ?? [],
    latestPosts: latestPostsResponse?.items ?? [],
    popularTags: popularTagsResponse?.items ?? [],
  };

  const hasAnyData =
    fallbackHome.categories.length > 0 ||
    fallbackHome.latestPrompts.length > 0 ||
    fallbackHome.trendingPrompts.length > 0 ||
    fallbackHome.latestPosts.length > 0 ||
    fallbackHome.popularTags.length > 0;

  return hasAnyData ? fallbackHome : null;
}

export async function getPromptList(
  params?: Record<string, string | number | undefined | null>,
  options?: FetchOptions,
) {
  return (
    (await fetchPublicApi<ListResponse<PublicPrompt>>('prompts', params, options)) ?? {
      items: [],
      total: 0,
    }
  );
}

type FetchAllPromptListOptions = {
  pageSize?: number;
  maxPages?: number;
};

export async function getAllPromptList(
  params?: Record<string, string | number | undefined | null>,
  options?: FetchOptions,
  config?: FetchAllPromptListOptions,
) {
  const baseParams = { ...(params ?? {}) };
  const requestedTakeRaw = baseParams.take;
  delete baseParams.take;
  delete baseParams.skip;

  const requestedTake =
    typeof requestedTakeRaw === 'number'
      ? requestedTakeRaw
      : typeof requestedTakeRaw === 'string'
        ? Number.parseInt(requestedTakeRaw, 10)
        : NaN;
  const pageSize = Math.max(
    1,
    Number.isFinite(config?.pageSize)
      ? Number(config?.pageSize)
      : Number.isFinite(requestedTake)
        ? requestedTake
        : 72,
  );
  const maxPages = Math.max(
    1,
    Number.isFinite(config?.maxPages) ? Number(config?.maxPages) : 50,
  );

  const items: PublicPrompt[] = [];
  let total = 0;
  let skip = 0;
  let pagesFetched = 0;

  while (pagesFetched < maxPages) {
    const response = await getPromptList(
      {
        ...baseParams,
        skip,
        take: pageSize,
      },
      options,
    );

    if (pagesFetched === 0) {
      total = response.total;
    }

    if (response.items.length === 0) {
      break;
    }

    items.push(...response.items);
    skip += response.items.length;
    pagesFetched += 1;

    if (items.length >= total || response.items.length < pageSize) {
      break;
    }
  }

  return {
    items: total > 0 ? items.slice(0, total) : items,
    total: total || items.length,
  };
}

export async function getPromptDetail(slug: string, options?: FetchOptions) {
  return fetchPublicApi<PublicPrompt>(`prompts/${encodeURIComponent(slug)}`, undefined, {
    allow404: true,
    revalidateSeconds: options?.revalidateSeconds ?? 1800,
    noStore: options?.noStore,
    accessToken: options?.accessToken,
  });
}

export async function getPostList(
  params?: Record<string, string | number | undefined | null>,
  options?: FetchOptions,
) {
  return (
    (await fetchPublicApi<ListResponse<PublicPost>>('posts', params, options)) ?? {
      items: [],
      total: 0,
    }
  );
}

export async function getPostDetail(slug: string, options?: FetchOptions) {
  return fetchPublicApi<PublicPost>(`posts/${encodeURIComponent(slug)}`, undefined, {
    allow404: true,
    revalidateSeconds: options?.revalidateSeconds ?? 1800,
    noStore: options?.noStore,
    accessToken: options?.accessToken,
  });
}

export async function getCategoryList(
  params?: Record<string, string | number | undefined | null>,
  options?: FetchOptions,
) {
  return (
    (await fetchPublicApi<ListResponse<PublicCategory>>('categories', params, options)) ?? {
      items: [],
      total: 0,
    }
  );
}

export async function getCategoryDetail(slug: string) {
  return fetchPublicApi<PublicCategory>(`categories/${encodeURIComponent(slug)}`, undefined, {
    allow404: true,
  });
}

export async function getTagList(
  params?: Record<string, string | number | undefined | null>,
  options?: FetchOptions,
) {
  return (
    (await fetchPublicApi<ListResponse<PublicTag>>('tags', params, options)) ?? {
      items: [],
      total: 0,
    }
  );
}

export async function getTagDetail(slug: string) {
  return fetchPublicApi<PublicTag>(`tags/${encodeURIComponent(slug)}`, undefined, {
    allow404: true,
  });
}

export async function getAuthorList(
  params?: Record<string, string | number | undefined | null>,
  options?: FetchOptions,
) {
  return (
    (await fetchPublicApi<ListResponse<PublicAuthor>>('authors', params, options)) ?? {
      items: [],
      total: 0,
    }
  );
}

export async function getAuthorDetail(slug: string, options?: FetchOptions) {
  return fetchPublicApi<PublicAuthor>(`authors/${encodeURIComponent(slug)}`, undefined, {
    allow404: true,
    revalidateSeconds: options?.revalidateSeconds,
    noStore: options?.noStore,
  });
}

export async function searchPublicContent(query: string, take = 8) {
  return (
    (await fetchPublicApi<SearchResponse>(
      'search',
      { query, take },
      {
        revalidateSeconds: 30,
      },
    )) ?? {
      query,
      prompts: [],
      posts: [],
      categories: [],
      tags: [],
      authors: [],
    }
  );
}
