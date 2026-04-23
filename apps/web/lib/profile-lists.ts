function resolveApiBaseUrl() {
  const normalize = (value?: string) => {
    const trimmed = value?.trim();
    if (!trimmed || trimmed === '/') {
      return null;
    }
    const normalized = trimmed.replace(/\/+$/, '');
    return normalized || null;
  };

  const fromPublic = normalize(process.env.NEXT_PUBLIC_API_URL);
  if (fromPublic) return fromPublic;

  const fromServer = normalize(process.env.API_URL);
  if (fromServer) return fromServer;

  return 'http://localhost:4000';
}

const API_BASE_URL = resolveApiBaseUrl();

export type ProfileActivityItem = {
  id: string;
  type: 'SAVE' | 'LIKE' | 'CREATE' | 'VIEW_PROMPT' | 'VIEW_POST';
  targetType: 'PROMPT' | 'POST';
  targetPath: string | null;
  title: string | null;
  image: string | null;
  subtitle?: string | null;
  createdAt: string;
};

export type ProfileSavedPromptItem = {
  id: string;
  title: string;
  slug: string;
  promptType: string;
  image: string | null;
  savedAt: string;
};

export type ProfileActivityResponse = {
  items: ProfileActivityItem[];
  total: number;
};

export type ProfileSavedResponse = {
  items: ProfileSavedPromptItem[];
  total: number;
};

export class ProfileListsError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ProfileListsError';
    this.status = status;
  }
}

async function requestProfileListsApi<T>(
  path: string,
  accessToken: string,
  query: { skip?: number; take?: number } = {},
): Promise<T> {
  const params = new URLSearchParams();
  if (query.skip !== undefined) {
    params.set('skip', String(query.skip));
  }
  if (query.take !== undefined) {
    params.set('take', String(query.take));
  }
  const endpoint = params.size > 0 ? `${path}?${params.toString()}` : path;
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'GET',
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const message =
      typeof payload === 'object' && payload && 'message' in payload
        ? String((payload as { message?: unknown }).message)
        : 'Failed to load profile list.';
    throw new ProfileListsError(response.status, message);
  }

  return (await response.json()) as T;
}

export function getProfileActivityList(
  accessToken: string,
  query: { skip?: number; take?: number } = {},
) {
  return requestProfileListsApi<ProfileActivityResponse>(
    '/api/auth/profile/activity',
    accessToken,
    query,
  );
}

export function getProfileSavedList(
  accessToken: string,
  query: { skip?: number; take?: number } = {},
) {
  return requestProfileListsApi<ProfileSavedResponse>(
    '/api/auth/profile/saved',
    accessToken,
    query,
  );
}
