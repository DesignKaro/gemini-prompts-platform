import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SeoScreen } from '../../features/dashboard/seo/components/SeoScreen';

const requestMock = vi.fn();
let sessionEmail = 'argro.official@gmail.com';

vi.mock('../../app/components/dashboard/use-admin-api', () => ({
  useAdminApi: () => ({
    request: requestMock,
  }),
}));

vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: {
      user: {
        email: sessionEmail,
      },
    },
  }),
}));

describe('SeoScreen integrations tab', () => {
  beforeEach(() => {
    requestMock.mockReset();
    requestMock.mockImplementation(async (path: string) => {
      if (path.startsWith('/api/admin/seo/integrations')) {
        return {
          scope: 'production',
          customHeadScriptUrls: [],
        };
      }
      if (path === '/api/admin/seo') {
        return {
          siteTitle: 'Gemini Prompts',
          robotsDisallowPaths: ['/dashboard'],
          robotsAdditionalRules: [],
          organizationSameAs: [],
        };
      }
      if (path.startsWith('/api/admin/seo/redirects')) {
        return {
          items: [],
        };
      }
      return {};
    });
  });

  it('hides integrations tab for non-superadmin users', async () => {
    sessionEmail = 'admin@example.com';

    render(<SeoScreen section="overview" />);

    await waitFor(() => {
      expect(requestMock).toHaveBeenCalled();
    });

    expect(screen.queryByText('Integrations')).not.toBeInTheDocument();
  });

  it('loads integration settings for selected scope when superadmin', async () => {
    sessionEmail = 'argro.official@gmail.com';

    render(<SeoScreen section="integrations" />);

    await waitFor(() => {
      const paths = requestMock.mock.calls.map((call) => String(call[0] ?? ''));
      expect(paths.some((path) => path.includes('/api/admin/seo/integrations?scope=production'))).toBe(
        true,
      );
    });

    const scopeSelect = screen.getByLabelText('Scope');
    fireEvent.change(scopeSelect, { target: { value: 'staging' } });

    await waitFor(() => {
      const paths = requestMock.mock.calls.map((call) => String(call[0] ?? ''));
      expect(paths.some((path) => path.includes('/api/admin/seo/integrations?scope=staging'))).toBe(
        true,
      );
    });
  });
});
