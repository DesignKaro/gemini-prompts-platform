import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('profile-lists API base URL fallback', () => {
  const originalPublicApiUrl = process.env.NEXT_PUBLIC_API_URL;
  const originalApiUrl = process.env.API_URL;
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_API_URL = originalPublicApiUrl;
    process.env.API_URL = originalApiUrl;
    vi.unstubAllGlobals();
  });

  it('falls back to localhost:4000 when NEXT_PUBLIC_API_URL is empty', async () => {
    process.env.NEXT_PUBLIC_API_URL = '';
    process.env.API_URL = '';

    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ items: [], total: 0 }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    const { getProfileActivityList } = await import('../lib/profile-lists');
    await getProfileActivityList('token_123', { skip: 0, take: 20 });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/api/auth/profile/activity?skip=0&take=20',
      expect.objectContaining({
        method: 'GET',
      }),
    );
  });

  it("falls back to localhost:4000 when NEXT_PUBLIC_API_URL is '/'", async () => {
    process.env.NEXT_PUBLIC_API_URL = '/';
    process.env.API_URL = '';

    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ items: [], total: 0 }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );

    const { getProfileSavedList } = await import('../lib/profile-lists');
    await getProfileSavedList('token_123', { skip: 0, take: 20 });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/api/auth/profile/saved?skip=0&take=20',
      expect.objectContaining({
        method: 'GET',
      }),
    );
  });
});
