import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ProfilePage from '../app/profile/page';

const fetchMock = vi.fn();
const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: {
      apiAccessToken: 'token_123',
      apiAccessTokenExpiresAt: '2099-01-01T00:00:00.000Z',
      user: {
        name: 'User',
        email: 'user@example.com',
        handle: 'user',
      },
    },
    status: 'authenticated',
    update: vi.fn(),
  }),
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: () => null,
  }),
}));

vi.mock('../app/components/author-avatar', () => ({
  AuthorAvatar: () => <div data-testid="author-avatar" />,
}));

vi.mock('../lib/utils/session', () => ({
  refreshSession: vi.fn().mockResolvedValue(null),
}));

describe('Profile page links', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    consoleErrorSpy.mockClear();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        observe() {}
        disconnect() {}
        unobserve() {}
      } as unknown as typeof IntersectionObserver,
    );
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    });

    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes('/api/auth/profile/summary')) {
        return new Response(
          JSON.stringify({
            user: {
              name: 'Test User',
              handle: 'test-user',
              profileTitle: '',
              bio: '',
              focusTags: [],
              avatarUrl: null,
              avatarUpdatedAt: null,
            },
            stats: {
              promptCount: 3,
              savedCount: 2,
              likedCount: 2,
              audienceCount: 1,
              plan: 'FREE',
            },
            recentActivity: [
              {
                id: 'activity_1',
                type: 'LIKE',
                targetType: 'PROMPT',
                targetPath: '/prompt/duplicate-title',
                title: 'Duplicate title',
                image: null,
                createdAt: '2026-03-29T10:00:00.000Z',
              },
              {
                id: 'activity_2',
                type: 'VIEW_POST',
                targetType: 'POST',
                targetPath: '/blog/duplicate-title-2',
                title: 'Duplicate title',
                image: null,
                subtitle: 'Blog history',
                createdAt: '2026-03-29T10:00:00.000Z',
              },
            ],
            savedPrompts: [
              {
                id: 'prompt_1',
                title: 'Saved One',
                slug: 'saved-one',
                promptType: 'CONTENT',
                image: null,
                savedAt: '2026-03-29T09:00:00.000Z',
              },
            ],
          }),
          {
            status: 200,
            headers: { 'content-type': 'application/json' },
          },
        );
      }

      return new Response('{}', {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses profile routes for View all and opens saved prompts by slug', async () => {
    render(<ProfilePage />);

    await screen.findByRole('heading', { name: 'Saved prompts' });

    const viewAllLinks = screen
      .getAllByRole('link', { name: 'View all' })
      .map((link) => link.getAttribute('href'));
    expect(viewAllLinks).toContain('/profile/activity');
    expect(viewAllLinks).toContain('/profile/saved');

    const openLinks = screen
      .getAllByRole('link', { name: 'Open' })
      .map((link) => link.getAttribute('href'));
    expect(openLinks).toContain('/prompt/saved-one');
  });

  it('does not emit duplicate key warning for repeated activity labels', async () => {
    render(<ProfilePage />);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    const duplicateKeyWarnings = consoleErrorSpy.mock.calls
      .flatMap((call) => call.map((entry) => String(entry)))
      .filter((message) => message.includes('Encountered two children with the same key'));

    expect(duplicateKeyWarnings).toHaveLength(0);
  });
});
