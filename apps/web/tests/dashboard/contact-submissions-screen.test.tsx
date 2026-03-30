import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ContactSubmissionsScreen } from '../../features/dashboard/contact-submissions/components/ContactSubmissionsScreen';

const requestMock = vi.fn();

vi.mock('../../app/components/dashboard/use-admin-api', () => ({
  useAdminApi: () => ({
    request: requestMock,
    status: 'authenticated',
  }),
}));

describe('ContactSubmissionsScreen', () => {
  beforeEach(() => {
    requestMock.mockReset();
    requestMock.mockImplementation(async (path: string, options?: RequestInit) => {
      if (path.startsWith('/api/admin/contact/submissions?')) {
        return {
          items: [
            {
              id: 'contact_1',
              name: 'Alex',
              email: 'alex@example.com',
              subject: 'Need help',
              status: 'NEW',
              source: 'contact_page',
              pagePath: '/contact',
              createdAt: '2026-03-30T12:00:00.000Z',
              reviewedAt: null,
            },
          ],
          total: 1,
          statuses: ['NEW', 'IN_PROGRESS', 'RESOLVED', 'SPAM'],
          sources: ['contact_page'],
        };
      }

      if (path === '/api/admin/contact/submissions/contact_1' && options?.method === 'PATCH') {
        return {
          id: 'contact_1',
          name: 'Alex',
          email: 'alex@example.com',
          subject: 'Need help',
          message: 'Need support for billing',
          status: 'RESOLVED',
          internalNote: 'Resolved via email',
          source: 'contact_page',
          pagePath: '/contact',
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0',
          createdAt: '2026-03-30T12:00:00.000Z',
          updatedAt: '2026-03-30T12:10:00.000Z',
          reviewedAt: '2026-03-30T12:10:00.000Z',
          reviewedBy: {
            id: 'user_1',
            name: 'Admin',
            email: 'admin@example.com',
          },
        };
      }

      if (path === '/api/admin/contact/submissions/contact_1') {
        return {
          id: 'contact_1',
          name: 'Alex',
          email: 'alex@example.com',
          subject: 'Need help',
          message: 'Need support for billing',
          status: 'NEW',
          internalNote: null,
          source: 'contact_page',
          pagePath: '/contact',
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0',
          createdAt: '2026-03-30T12:00:00.000Z',
          updatedAt: '2026-03-30T12:00:00.000Z',
          reviewedAt: null,
          reviewedBy: null,
        };
      }

      throw new Error(`Unexpected request: ${path}`);
    });
  });

  it('renders submissions, opens detail, and updates status', async () => {
    render(<ContactSubmissionsScreen />);

    await screen.findByText('alex@example.com');
    expect(requestMock).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Open' }));

    await waitFor(() => {
      expect(screen.getAllByLabelText('Status').length).toBeGreaterThan(1);
    });

    const statusSelects = screen.getAllByLabelText('Status');
    const detailStatusSelect = statusSelects.at(-1);
    expect(detailStatusSelect).toBeDefined();
    if (!detailStatusSelect) {
      throw new Error('Detail status select was not rendered');
    }
    fireEvent.change(detailStatusSelect, {
      target: { value: 'RESOLVED' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save updates' }));

    await waitFor(() => {
      const patchCall = requestMock.mock.calls.find(
        ([path, options]) =>
          path === '/api/admin/contact/submissions/contact_1' &&
          options &&
          typeof options === 'object' &&
          'method' in options &&
          (options as RequestInit).method === 'PATCH',
      );
      expect(patchCall).toBeTruthy();
    });
  });
});
