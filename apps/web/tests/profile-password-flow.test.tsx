import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ProfilePage from '../app/profile/page';

const fetchMock = vi.fn();
const sessionUpdateMock = vi.fn();

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
    update: sessionUpdateMock,
  }),
}));

vi.mock('../lib/utils/session', () => ({
  refreshSession: vi.fn().mockResolvedValue(null),
}));

vi.mock('../app/components/author-avatar', () => ({
  AuthorAvatar: () => <div data-testid="author-avatar" />,
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: () => null,
  }),
}));

function buildSummaryPayload(hasPassword: boolean) {
  return {
    user: {
      name: 'Test User',
      handle: 'test-user',
      profileTitle: 'Creator',
      bio: '',
      focusTags: [],
      avatarUrl: null,
      avatarUpdatedAt: null,
      hasPassword,
    },
    stats: {
      promptCount: 3,
      savedCount: 2,
      likedCount: 2,
      audienceCount: 1,
      plan: 'FREE',
    },
    recentActivity: [],
    savedPrompts: [],
  };
}

describe('Profile page password update payload', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    sessionUpdateMock.mockReset();
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
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('submits previous+new password fields when user already has password', async () => {
    let patchBody: Record<string, unknown> | null = null;
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
      if (url.includes('/api/auth/profile/summary')) {
        return new Response(JSON.stringify(buildSummaryPayload(true)), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }

      if (url.includes('/api/auth/profile') && init?.method === 'PATCH') {
        patchBody = JSON.parse((init.body as string) ?? '{}') as Record<string, unknown>;
        return new Response(JSON.stringify({ user: buildSummaryPayload(true).user }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }

      return new Response('{}', {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });

    const { unmount } = render(<ProfilePage />);
    await screen.findByText('Test User');
    fireEvent.click(screen.getByRole('button', { name: 'Edit profile' }));
    await screen.findByLabelText('Previous password');

    fireEvent.change(screen.getByLabelText('Previous password'), {
      target: { value: 'old-password-123' },
    });
    fireEvent.change(screen.getByLabelText('New password'), {
      target: { value: 'new-password-123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => {
      expect(patchBody).not.toBeNull();
    });

    expect(patchBody).toMatchObject({
      previousPassword: 'old-password-123',
      newPassword: 'new-password-123',
    });
    expect(patchBody).not.toHaveProperty('confirmPassword');
    unmount();
  });

  it('submits new+confirm password fields when user has no password', async () => {
    let patchBody: Record<string, unknown> | null = null;
    fetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
      if (url.includes('/api/auth/profile/summary')) {
        return new Response(JSON.stringify(buildSummaryPayload(false)), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }

      if (url.includes('/api/auth/profile') && init?.method === 'PATCH') {
        patchBody = JSON.parse((init.body as string) ?? '{}') as Record<string, unknown>;
        return new Response(
          JSON.stringify({
            user: {
              ...buildSummaryPayload(false).user,
              hasPassword: true,
            },
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

    const { unmount } = render(<ProfilePage />);
    await screen.findByText('Test User');
    fireEvent.click(screen.getByRole('button', { name: 'Edit profile' }));
    await screen.findByLabelText('Confirm password');

    fireEvent.change(screen.getByLabelText('New password'), {
      target: { value: 'new-password-123' },
    });
    fireEvent.change(screen.getByLabelText('Confirm password'), {
      target: { value: 'new-password-123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => {
      expect(patchBody).not.toBeNull();
    });

    expect(patchBody).toMatchObject({
      newPassword: 'new-password-123',
      confirmPassword: 'new-password-123',
    });
    expect(patchBody).not.toHaveProperty('previousPassword');
    unmount();
  });
});
