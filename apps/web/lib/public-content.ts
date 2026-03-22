const API_BASE_URL =
  process.env.API_URL?.replace(/\/$/, '') ??
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ??
  'http://localhost:4000';
const DEFAULT_PUBLIC_REVALIDATE_SECONDS = 600;

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
  const searchParams = new URLSearchParams();

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      searchParams.set(key, String(value));
    });
  }

  const query = searchParams.toString();
  const url = `${API_BASE_URL}/api/public/${path}${query ? `?${query}` : ''}`;
  const resolvedRevalidate =
    options.noStore === true
      ? null
      : Math.max(1, Math.floor(options.revalidateSeconds ?? DEFAULT_PUBLIC_REVALIDATE_SECONDS));

  let response: Response;
  try {
    const requestHeaders = options.accessToken
      ? { authorization: `Bearer ${options.accessToken}` }
      : undefined;
    response = await fetch(
      url,
      resolvedRevalidate
        ? { headers: requestHeaders, next: { revalidate: resolvedRevalidate } }
        : { headers: requestHeaders, cache: 'no-store' },
    );
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[public-content] fetch failed for ${url}: ${message}`);
    }
    return null;
  }

  if (response.status === 404 && options.allow404) {
    return null;
  }

  if (!response.ok) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[public-content] non-ok response for ${url}: ${response.status}`);
    }
    return null;
  }

  try {
    return (await response.json()) as T;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[public-content] invalid JSON for ${url}: ${message}`);
    }
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

export async function getHomeContent() {
  return (
    (await fetchPublicApi<HomeResponse>('home')) ?? {
      categories: [],
      latestPrompts: [],
      trendingPrompts: [],
      latestPosts: [],
      popularTags: [],
    }
  );
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

export async function getCategoryList(params?: Record<string, string | number | undefined | null>) {
  return (
    (await fetchPublicApi<ListResponse<PublicCategory>>('categories', params)) ?? {
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

export async function getTagList(params?: Record<string, string | number | undefined | null>) {
  return (
    (await fetchPublicApi<ListResponse<PublicTag>>('tags', params)) ?? {
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

export async function getAuthorList(params?: Record<string, string | number | undefined | null>) {
  return (
    (await fetchPublicApi<ListResponse<PublicAuthor>>('authors', params)) ?? {
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
