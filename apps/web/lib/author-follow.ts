const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ??
  process.env.API_URL?.replace(/\/$/, '') ??
  'http://localhost:4000';

export type AuthorFollowResponse = {
  following: boolean;
  followerCount: number;
};

export type FollowedAuthorSummary = {
  id: string;
  name: string;
  slug: string;
  avatarUrl: string | null;
  avatarUpdatedAt: string | null;
  followedAt: string;
};

export type FollowedAuthorListResponse = {
  items: FollowedAuthorSummary[];
};

export class AuthorApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'AuthorApiError';
    this.status = status;
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'DELETE';
  accessToken: string;
};

async function requestAuthorApi<T>(
  path: string,
  options: RequestOptions,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}/api/public${path}`, {
    method: options.method ?? 'GET',
    headers: {
      authorization: `Bearer ${options.accessToken}`,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message =
      typeof payload === 'object' && payload && 'message' in payload
        ? String((payload as { message?: unknown }).message)
        : 'Author follow request failed.';
    throw new AuthorApiError(response.status, message);
  }

  return (await response.json()) as T;
}

export async function fetchAuthorFollowStatus(authorId: string, accessToken: string) {
  return requestAuthorApi<AuthorFollowResponse>(`/authors/${encodeURIComponent(authorId)}/follow`, {
    method: 'GET',
    accessToken,
  });
}

export async function followAuthor(authorId: string, accessToken: string) {
  return requestAuthorApi<AuthorFollowResponse>(`/authors/${encodeURIComponent(authorId)}/follow`, {
    method: 'POST',
    accessToken,
  });
}

export async function unfollowAuthor(authorId: string, accessToken: string) {
  return requestAuthorApi<AuthorFollowResponse>(`/authors/${encodeURIComponent(authorId)}/follow`, {
    method: 'DELETE',
    accessToken,
  });
}

export async function fetchFollowedAuthors(accessToken: string) {
  return requestAuthorApi<FollowedAuthorListResponse>('/authors/following', {
    method: 'GET',
    accessToken,
  });
}
