import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NewsletterSubmissionsScreen } from '../../features/dashboard/newsletter/components/NewsletterSubmissionsScreen';

const requestMock = vi.fn();

vi.mock('../../app/components/dashboard/use-admin-api', () => ({
  useAdminApi: () => ({
    request: requestMock,
    status: 'authenticated',
  }),
}));

describe('NewsletterSubmissionsScreen', () => {
  beforeEach(() => {
    requestMock.mockReset();
    requestMock.mockImplementation(async (path: string) => {
      if (path.includes('source=prompt_sidebar')) {
        return {
          items: [
            {
              id: 'sub_2',
              email: 'sidebar@example.com',
              source: 'prompt_sidebar',
              pagePath: '/prompt/abc',
              createdAt: '2026-03-28T09:00:00.000Z',
            },
          ],
          total: 1,
          sources: ['global_cta', 'prompt_sidebar'],
        };
      }

      return {
        items: [
          {
            id: 'sub_1',
            email: 'first@example.com',
            source: 'global_cta',
            pagePath: '/',
            createdAt: '2026-03-28T08:00:00.000Z',
          },
        ],
        total: 1,
        sources: ['global_cta', 'prompt_sidebar'],
      };
    });
  });

  it('renders submissions and refetches with source filter', async () => {
    render(<NewsletterSubmissionsScreen />);

    await screen.findByText('first@example.com');
    expect(requestMock).toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Source'), {
      target: { value: 'prompt_sidebar' },
    });

    await screen.findByText('sidebar@example.com');

    await waitFor(() => {
      const paths = requestMock.mock.calls.map((call) => String(call[0]));
      expect(paths.some((path) => path.includes('/api/admin/newsletter/submissions'))).toBe(true);
      expect(paths.some((path) => path.includes('source=prompt_sidebar'))).toBe(true);
    });
  });
});
