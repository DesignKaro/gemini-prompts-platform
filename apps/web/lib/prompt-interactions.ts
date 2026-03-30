const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ??
  process.env.API_URL?.replace(/\/$/, '') ??
  'http://localhost:4000';

export type PromptInteractionStatusRequest = {
  promptIds: string[];
};

export type PromptInteractionStatusItem = {
  promptId: string;
  likedByIp: boolean;
  savedByUser: boolean;
};

export type PromptInteractionStatusResponse = {
  items: PromptInteractionStatusItem[];
};

export type PromptLikeResponse = {
  liked: true;
  alreadyLiked: boolean;
  likeCount: number;
};

export type PromptSaveResponse = {
  saved: boolean;
  saveCount: number;
};

export type PromptCommentCreateRequest = {
  content: string;
  parentId?: string;
};

export type PromptCommentCreateResponse = {
  submitted: true;
  status: 'PENDING';
  parentId: string | null;
};

export type PublicCommentStatus = 'APPROVED' | 'PENDING';

export type PromptCommentReplySummary = {
  id: string;
  content: string;
  createdAt: string;
  status: PublicCommentStatus;
  likeCount: number;
  likedByViewer: boolean;
  author: {
    id: string;
    name: string;
    slug: string;
    avatarUrl: string | null;
    avatarUpdatedAt: string | null;
  } | null;
};

export type PromptCommentSummary = {
  id: string;
  content: string;
  createdAt: string;
  status: PublicCommentStatus;
  likeCount: number;
  likedByViewer: boolean;
  replyCount: number;
  author: {
    id: string;
    name: string;
    slug: string;
    avatarUrl: string | null;
    avatarUpdatedAt: string | null;
  } | null;
  replies: PromptCommentReplySummary[];
};

export type PromptCommentListResponse = {
  items: PromptCommentSummary[];
  total: number;
};

export type PromptCommentLikeResponse = {
  liked: boolean;
  likeCount: number;
};

export class PromptApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'PromptApiError';
    this.status = status;
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'DELETE';
  body?: unknown;
  accessToken?: string | null;
};

function buildHeaders(body: unknown, accessToken?: string | null) {
  const headers: Record<string, string> = {};

  if (body !== undefined) {
    headers['content-type'] = 'application/json';
  }

  if (accessToken) {
    headers.authorization = `Bearer ${accessToken}`;
  }

  return headers;
}

async function requestPromptApi<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}/api/public${path}`, {
    method: options.method ?? 'GET',
    headers: buildHeaders(options.body, options.accessToken),
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    cache: 'no-store',
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message =
      typeof payload === 'object' && payload && 'message' in payload
        ? String((payload as { message?: unknown }).message)
        : 'Prompt interaction request failed.';
    throw new PromptApiError(response.status, message);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return (await response.json()) as T;
}

export async function fetchPromptInteractionStatus(
  request: PromptInteractionStatusRequest,
  accessToken?: string | null,
) {
  return requestPromptApi<PromptInteractionStatusResponse>('/prompts/interactions/status', {
    method: 'POST',
    body: request,
    accessToken,
  });
}

export async function likePrompt(promptId: string, accessToken?: string | null) {
  return requestPromptApi<PromptLikeResponse>(`/prompts/${encodeURIComponent(promptId)}/like`, {
    method: 'POST',
    accessToken,
  });
}

export async function savePrompt(promptId: string, accessToken: string) {
  return requestPromptApi<PromptSaveResponse>(`/prompts/${encodeURIComponent(promptId)}/save`, {
    method: 'POST',
    accessToken,
  });
}

export async function trackPromptShare(promptId: string, accessToken?: string | null) {
  return requestPromptApi<{ tracked: boolean }>(`/prompts/${encodeURIComponent(promptId)}/share`, {
    method: 'POST',
    accessToken,
  });
}

export async function unsavePrompt(promptId: string, accessToken: string) {
  return requestPromptApi<PromptSaveResponse>(`/prompts/${encodeURIComponent(promptId)}/save`, {
    method: 'DELETE',
    accessToken,
  });
}

export async function fetchPromptComments(
  promptId: string,
  options?: { skip?: number; take?: number },
  accessToken?: string | null,
) {
  const params = new URLSearchParams();
  if (typeof options?.skip === 'number') {
    params.set('skip', String(options.skip));
  }
  if (typeof options?.take === 'number') {
    params.set('take', String(options.take));
  }

  const query = params.toString();
  return requestPromptApi<PromptCommentListResponse>(
    `/prompts/${encodeURIComponent(promptId)}/comments${query ? `?${query}` : ''}`,
    {
      accessToken,
    },
  );
}

export async function fetchPostComments(
  postId: string,
  options?: { skip?: number; take?: number },
  accessToken?: string | null,
) {
  const params = new URLSearchParams();
  if (typeof options?.skip === 'number') {
    params.set('skip', String(options.skip));
  }
  if (typeof options?.take === 'number') {
    params.set('take', String(options.take));
  }

  const query = params.toString();
  return requestPromptApi<PromptCommentListResponse>(
    `/posts/${encodeURIComponent(postId)}/comments${query ? `?${query}` : ''}`,
    {
      accessToken,
    },
  );
}

export async function createPromptComment(
  promptId: string,
  request: PromptCommentCreateRequest,
  accessToken: string,
) {
  return requestPromptApi<PromptCommentCreateResponse>(
    `/prompts/${encodeURIComponent(promptId)}/comments`,
    {
      method: 'POST',
      body: request,
      accessToken,
    },
  );
}

export async function createPostComment(
  postId: string,
  request: PromptCommentCreateRequest,
  accessToken: string,
) {
  return requestPromptApi<PromptCommentCreateResponse>(
    `/posts/${encodeURIComponent(postId)}/comments`,
    {
      method: 'POST',
      body: request,
      accessToken,
    },
  );
}

export async function likeComment(commentId: string, accessToken?: string | null) {
  return requestPromptApi<PromptCommentLikeResponse>(
    `/comments/${encodeURIComponent(commentId)}/like`,
    {
      method: 'POST',
      accessToken,
    },
  );
}
