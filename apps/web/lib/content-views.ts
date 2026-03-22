const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ??
  process.env.API_URL?.replace(/\/$/, '') ??
  'http://localhost:4000';

export type ContentViewResponse = {
  counted: boolean;
  viewCount: number;
};

async function postView(path: string): Promise<ContentViewResponse | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/public${path}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      cache: 'no-store',
      keepalive: true,
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as ContentViewResponse;
  } catch {
    return null;
  }
}

export function trackPromptView(promptId: string) {
  return postView(`/prompts/${encodeURIComponent(promptId)}/view`);
}

export function trackPostView(postId: string) {
  return postView(`/posts/${encodeURIComponent(postId)}/view`);
}
