import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { logoutApiSession } from '../lib/utils/auth-api';

const originalAuthApiUrl = process.env.AUTH_API_URL;
const originalApiUrl = process.env.API_URL;
const originalPublicApiUrl = process.env.NEXT_PUBLIC_API_URL;

const { fetchMock } = vi.hoisted(() => ({
  fetchMock: vi.fn(),
}));

describe('logoutApiSession', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    process.env.AUTH_API_URL = 'https://auth.internal';
    delete process.env.API_URL;
    process.env.NEXT_PUBLIC_API_URL = 'https://public.example';
  });

  afterEach(() => {
    vi.unstubAllGlobals();

    if (originalAuthApiUrl === undefined) {
      delete process.env.AUTH_API_URL;
    } else {
      process.env.AUTH_API_URL = originalAuthApiUrl;
    }

    if (originalApiUrl === undefined) {
      delete process.env.API_URL;
    } else {
      process.env.API_URL = originalApiUrl;
    }

    if (originalPublicApiUrl === undefined) {
      delete process.env.NEXT_PUBLIC_API_URL;
    } else {
      process.env.NEXT_PUBLIC_API_URL = originalPublicApiUrl;
    }
  });

  it('retries logout against the next configured API base URL after a retryable failure', async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'Temporary failure' }), {
          status: 502,
          headers: { 'content-type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      );

    await expect(logoutApiSession('refresh-token')).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'https://auth.internal/api/auth/logout',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ refreshToken: 'refresh-token' }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'https://public.example/api/auth/logout',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ refreshToken: 'refresh-token' }),
      }),
    );
  });

  it('stops retrying and surfaces non-retryable logout failures', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ message: 'Refresh token is invalid or expired.' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      }),
    );

    await expect(logoutApiSession('refresh-token')).rejects.toMatchObject({
      message: 'Refresh token is invalid or expired.',
      status: 401,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
