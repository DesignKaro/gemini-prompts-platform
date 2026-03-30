import { afterEach, describe, expect, it, vi } from 'vitest';
import { getAllPromptList } from '../lib/public-content';

const buildPrompt = (id: string) => ({
  id,
  slug: `prompt-${id}`,
  title: `Prompt ${id}`,
  description: null,
  promptType: 'CONTENT',
  visibility: 'EXCLUSIVE',
  image: null,
  galleryImages: [],
  publishedAt: '2026-03-29T10:00:00.000Z',
  updatedAt: '2026-03-29T10:00:00.000Z',
  viewCount: 0,
  likeCount: 0,
  saveCount: 0,
  commentCount: 0,
  isLocked: true,
  requiresMembership: true,
  author: {
    id: 'author_1',
    name: 'Author',
    handle: 'author',
    slug: 'author',
    profileTitle: null,
    bio: null,
    avatarUrl: null,
    avatarUpdatedAt: null,
  },
  primaryCategory: null,
  categories: [],
  tags: [],
});

describe('getAllPromptList', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('aggregates all paginated exclusive prompts', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      const skip = Number.parseInt(url.searchParams.get('skip') ?? '0', 10);

      const pages: Record<number, string[]> = {
        0: ['1', '2'],
        2: ['3', '4'],
        4: ['5'],
      };
      const ids = pages[skip] ?? [];
      const payload = {
        items: ids.map((id) => buildPrompt(id)),
        total: 5,
      };

      return new Response(JSON.stringify(payload), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });

    vi.stubGlobal('fetch', fetchMock);

    const result = await getAllPromptList(
      {
        visibility: 'EXCLUSIVE',
        sort: 'latest',
        take: 2,
      },
      { noStore: true },
      { maxPages: 10 },
    );

    expect(result.total).toBe(5);
    expect(result.items.map((item) => item.id)).toEqual(['1', '2', '3', '4', '5']);
    expect(fetchMock).toHaveBeenCalledTimes(3);

    const skips = fetchMock.mock.calls.map((call) => {
      const url = new URL(String(call[0]));
      return url.searchParams.get('skip');
    });
    expect(skips).toEqual(['0', '2', '4']);
  });
});
