import { resolveApiBaseUrls } from './api-base-url';

export class AuthApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'AuthApiError';
    this.status = status;
  }
}

function getAuthErrorMessage(payload: unknown): string {
  if (!payload || typeof payload !== 'object' || !('message' in payload)) {
    return 'Authentication request failed.';
  }

  const message = (payload as { message?: string | string[] }).message;
  if (Array.isArray(message)) {
    return message[0] || 'Authentication request failed.';
  }

  return message || 'Authentication request failed.';
}

async function authFetch(url: string, body: Record<string, unknown>): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);

  try {
    return await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function logoutApiSession(refreshToken: string): Promise<void> {
  const normalizedToken = refreshToken.trim();
  if (!normalizedToken) {
    return;
  }

  let lastError: AuthApiError | null = null;

  try {
    for (const baseUrl of resolveApiBaseUrls()) {
      try {
        const response = await authFetch(`${baseUrl}/api/auth/logout`, {
          refreshToken: normalizedToken,
        });
        const payload = await response.json().catch(() => null);

        if (response.ok) {
          return;
        }

        const apiError = new AuthApiError(getAuthErrorMessage(payload), response.status);
        if (response.status === 404 || response.status >= 500) {
          lastError = apiError;
          continue;
        }

        throw apiError;
      } catch (error) {
        if (error instanceof AuthApiError) {
          throw error;
        }

        lastError = new AuthApiError('Auth service is unavailable.');
      }
    }

    throw lastError ?? new AuthApiError('Auth service is unavailable.');
  } catch (error) {
    if (error instanceof AuthApiError) {
      throw error;
    }

    throw new AuthApiError('Auth service is unavailable.');
  }
}
