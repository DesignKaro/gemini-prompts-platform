import { afterEach, describe, expect, it, vi } from 'vitest';
import { trackPostView, trackPromptView } from '../lib/content-views';

describe('content view tracking', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('tracks prompt views with encoded id', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ counted: true, viewCount: 7 }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await trackPromptView('prompt/with spaces');

    expect(result).toEqual({ counted: true, viewCount: 7 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toContain(
      '/api/public/prompts/prompt%2Fwith%20spaces/view',
    );
  });

  it('falls back to secondary api base when primary responds 404', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ counted: true, viewCount: 2 }),
      });
    vi.stubGlobal('fetch', fetchMock);

    const result = await trackPostView('abc123');

    expect(result).toEqual({ counted: true, viewCount: 2 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not keep retrying on validation-style 4xx failures', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await trackPostView('bad-id');

    expect(result).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
