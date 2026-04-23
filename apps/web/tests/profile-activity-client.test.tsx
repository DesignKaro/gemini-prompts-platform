import React from 'react';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  waitForElementToBeRemoved,
} from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProfileActivityClient } from '../app/profile/activity/activity-client';

const getProfileActivityListMock = vi.fn();

vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: {
      apiAccessToken: 'token_123',
      apiAccessTokenExpiresAt: '2099-01-01T00:00:00.000Z',
    },
    status: 'authenticated',
    update: vi.fn(),
  }),
}));

vi.mock('../lib/profile-lists', () => ({
  getProfileActivityList: (...args: unknown[]) => getProfileActivityListMock(...args),
  ProfileListsError: class ProfileListsError extends Error {
    status: number;

    constructor(status: number, message: string) {
      super(message);
      this.status = status;
    }
  },
}));

vi.mock('../lib/utils/auth-redirect', () => ({
  redirectToSignInModal: vi.fn(),
}));

vi.mock('../lib/utils/session', () => ({
  refreshSession: vi.fn().mockResolvedValue(null),
}));

describe('ProfileActivityClient', () => {
  beforeEach(() => {
    getProfileActivityListMock.mockReset();
    getProfileActivityListMock.mockResolvedValue({
      total: 5,
      items: [
        {
          id: 'view-post-1',
          type: 'VIEW_POST',
          targetType: 'POST',
          targetPath: '/blog/team-workflows',
          title: 'Team workflows',
          image: null,
          subtitle: 'Blog history',
          createdAt: '2026-03-29T12:30:00.000Z',
        },
        {
          id: 'view-post-2',
          type: 'VIEW_POST',
          targetType: 'POST',
          targetPath: '/newsletter/weekly-roundup',
          title: 'Weekly roundup',
          image: null,
          subtitle: 'Newsletter history',
          createdAt: '2026-03-29T12:10:00.000Z',
        },
        {
          id: 'view-prompt-1',
          type: 'VIEW_PROMPT',
          targetType: 'PROMPT',
          targetPath: '/prompt/viral-hooks',
          title: 'Viral hooks',
          image: null,
          subtitle: 'Prompt history',
          createdAt: '2026-03-29T11:50:00.000Z',
        },
        {
          id: 'save-1',
          type: 'SAVE',
          targetType: 'PROMPT',
          targetPath: '/prompt/saved-prompt',
          title: 'Saved prompt',
          image: null,
          createdAt: '2026-03-29T11:40:00.000Z',
        },
        {
          id: 'like-1',
          type: 'LIKE',
          targetType: 'PROMPT',
          targetPath: '/prompt/liked-prompt',
          title: 'Liked prompt',
          image: null,
          createdAt: '2026-03-29T11:20:00.000Z',
        },
      ],
    });
  });

  it('renders mixed prompt and blog history rows and routes correctly', async () => {
    render(<ProfileActivityClient />);

    await waitFor(() => {
      expect(getProfileActivityListMock).toHaveBeenCalled();
    });
    await waitForElementToBeRemoved(() => screen.queryByText('Loading activity...'));

    const openLinks = screen
      .getAllByRole('link', { name: 'Open' })
      .map((item) => item.getAttribute('href'));
    expect(openLinks).toEqual(
      expect.arrayContaining([
        '/blog/team-workflows',
        '/newsletter/weekly-roundup',
        '/prompt/viral-hooks',
      ]),
    );
  });

  it('updates the activity filter control for history and saved states', async () => {
    render(<ProfileActivityClient />);

    await waitFor(() => {
      expect(getProfileActivityListMock).toHaveBeenCalled();
    });
    await waitForElementToBeRemoved(() => screen.queryByText('Loading activity...'));
    const [activitySelect] = screen.getAllByRole('combobox');

    fireEvent.change(activitySelect, {
      target: { value: 'HISTORY' },
    });

    await waitFor(() => {
      expect(activitySelect).toHaveValue('HISTORY');
    });

    fireEvent.change(activitySelect, {
      target: { value: 'SAVE' },
    });

    await waitFor(() => {
      expect(activitySelect).toHaveValue('SAVE');
    });
  });
});
