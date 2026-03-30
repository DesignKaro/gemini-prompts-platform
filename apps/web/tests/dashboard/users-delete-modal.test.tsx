import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import UsersPage from '../../app/dashboard/users/_legacy-screen';

const requestMock = vi.fn();

vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: {
      user: {
        id: 'admin_1',
        email: 'admin@example.com',
        permissions: ['users:manage', 'roles:read'],
      },
    },
  }),
}));

vi.mock('../../app/components/dashboard/use-admin-api', () => {
  class DashboardApiError extends Error {
    code?: string;

    constructor(message: string, code?: string) {
      super(message);
      this.name = 'DashboardApiError';
      this.code = code;
    }
  }

  return {
    DashboardApiError,
    useAdminApi: () => ({
      request: requestMock,
      status: 'authenticated',
    }),
  };
});

describe('Users delete transfer modal', () => {
  beforeEach(() => {
    requestMock.mockReset();
    requestMock.mockImplementation(async (path: string, options?: RequestInit) => {
      if (path === '/api/admin/users?take=200') {
        return {
          items: [
            {
              id: 'user_1',
              name: 'Creator User',
              email: 'creator@example.com',
              handle: null,
              role: 'USER',
              plan: 'FREE',
              avatarUrl: null,
              suspendedAt: null,
              createdAt: '2026-03-24T00:00:00.000Z',
              roles: [],
            },
            {
              id: 'user_2',
              name: 'Receiver User',
              email: 'receiver@example.com',
              handle: null,
              role: 'USER',
              plan: 'FREE',
              avatarUrl: null,
              suspendedAt: null,
              createdAt: '2026-03-25T00:00:00.000Z',
              roles: [],
            },
          ],
          total: 2,
        };
      }

      if (path === '/api/admin/roles') {
        return [];
      }

      if (path === '/api/admin/users/user_1/delete-impact') {
        return {
          owned: {
            prompts: 0,
            posts: 0,
            collabs: 0,
            submissions: 1,
            transactions: 0,
            subscriptions: 0,
            total: 1,
          },
          requiresTransfer: true,
        };
      }

      if (path === '/api/admin/users/user_1' && options?.method === 'DELETE') {
        return {};
      }

      throw new Error(`Unhandled request: ${path}`);
    });
  });

  it('lets an admin pick a transfer target before deleting an owning user', async () => {
    render(<UsersPage />);

    await screen.findByText('creator@example.com');
    await screen.findByText('receiver@example.com');

    const deleteButtons = screen.getAllByLabelText('Delete user');
    expect(deleteButtons).toHaveLength(2);
    fireEvent.click(deleteButtons[0]!);

    await screen.findByText('This account owns 1 record that must be transferred before deletion.');

    fireEvent.change(screen.getByLabelText('Transfer owned data to'), {
      target: { value: 'user_2' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Transfer & Delete' }));

    await waitFor(() => {
      expect(requestMock).toHaveBeenCalledWith(
        '/api/admin/users/user_1',
        expect.objectContaining({
          method: 'DELETE',
          body: JSON.stringify({ transferToUserId: 'user_2' }),
        }),
      );
    });

    await waitFor(() => {
      expect(screen.queryByText('creator@example.com')).not.toBeInTheDocument();
    });
  });
});
