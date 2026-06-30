export type ContentViewResponse = {
  counted: boolean;
  viewCount: number;
};

const DEFAULT_API_BASE_URLS = ['http://127.0.0.1:4000', 'http://localhost:4000'];
const VIEW_REQUEST_TIMEOUT_MS = 4_000;

function normalizeBaseUrl(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return trimmed.replace(/\/+$/, '');
}

function getApiBaseCandidates(): string[] {
  const candidates = new Set<string>();
  const configured = [
    normalizeBaseUrl(process.env.NEXT_PUBLIC_API_URL),
    normalizeBaseUrl(process.env.API_URL),
  ];

  for (const baseUrl of configured) {
    if (baseUrl) {
      candidates.add(baseUrl);
    }
  }

  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      candidates.add(`${protocol}//${hostname}:4000`);
    }
  }

  for (const fallback of DEFAULT_API_BASE_URLS) {
    candidates.add(fallback);
  }

  return [...candidates];
}

async function postToBase(baseUrl: string, path: string): Promise<Response | null> {
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), VIEW_REQUEST_TIMEOUT_MS);
  try {
    return await fetch(`${baseUrl}/api/public${path}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      cache: 'no-store',
      keepalive: true,
      signal: controller.signal,
    });
  } catch {
    return null;
  } finally {
    globalThis.clearTimeout(timeout);
  }
}

async function postView(path: string): Promise<ContentViewResponse | null> {
  const baseUrls = getApiBaseCandidates();
  for (const baseUrl of baseUrls) {
    const response = await postToBase(baseUrl, path);
    if (!response) {
      continue;
    }

    if (response.ok) {
      return (await response.json()) as ContentViewResponse;
    }

    // Retry with fallback hosts for infra-like failures and wrong-target URLs.
    if (response.status >= 500 || response.status === 404) {
      continue;
    }

    return null;
  }

  return null;
}

export function trackPromptView(promptId: string) {
  return postView(`/prompts/${encodeURIComponent(promptId)}/view`);
}

export function trackPostView(postId: string) {
  return postView(`/posts/${encodeURIComponent(postId)}/view`);
}
