import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MembersScreen } from '../../features/dashboard/members/components/MembersScreen';

const requestMock = vi.fn();

vi.mock('../../app/components/dashboard/use-admin-api', () => ({
  useAdminApi: () => ({
    request: requestMock,
  }),
}));

vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: {
      user: {
        email: 'argro.official@gmail.com',
      },
    },
  }),
}));

describe('MembersScreen', () => {
  beforeEach(() => {
    requestMock.mockReset();
    requestMock.mockResolvedValue({
      items: [],
      total: 0,
    });
  });

  it('requests memberships with take <= 200', async () => {
    render(<MembersScreen />);

    await waitFor(() => {
      expect(requestMock).toHaveBeenCalled();
    });

    const path = String(requestMock.mock.calls[0]?.[0] ?? '');
    expect(path).toContain('/api/admin/users/memberships');
    expect(path).toContain('take=200');
  });
});
