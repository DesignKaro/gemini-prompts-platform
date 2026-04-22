import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SeoScreen } from '../../features/dashboard/seo/components/SeoScreen';

const requestMock = vi.fn();
let sessionEmail = 'argro.official@gmail.com';
let sessionRole: 'SUPERADMIN' | 'ADMIN' = 'SUPERADMIN';
let sessionPermissions: string[] = ['roles:read'];

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
        role: sessionRole,
        permissions: sessionPermissions,
      },
    },
  }),
}));

describe('SeoScreen integrations tab', () => {
  beforeEach(() => {
    requestMock.mockReset();
    sessionRole = 'SUPERADMIN';
    sessionPermissions = ['roles:read'];
    requestMock.mockImplementation(async (path: string) => {
      if (path.startsWith('/api/admin/seo/integrations') || path.startsWith('/api/admin/seo/custom-code')) {
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
    sessionRole = 'ADMIN';
    sessionPermissions = ['roles:read'];

    render(<SeoScreen section="overview" />);

    await waitFor(() => {
      expect(requestMock).toHaveBeenCalled();
    });

    expect(screen.queryByText('Integrations')).not.toBeInTheDocument();
  });

  it('loads integration settings for selected scope when superadmin', async () => {
    sessionEmail = 'argro.official@gmail.com';
    sessionRole = 'SUPERADMIN';
    sessionPermissions = ['roles:read'];

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

  it('loads custom code settings for the custom code tab when admin', async () => {
    sessionEmail = 'admin@example.com';
    sessionRole = 'ADMIN';
    sessionPermissions = ['roles:read'];

    render(<SeoScreen section="custom-code" />);

    await waitFor(() => {
      const paths = requestMock.mock.calls.map((call) => String(call[0] ?? ''));
      expect(paths.some((path) => path.includes('/api/admin/seo/custom-code?scope=production'))).toBe(
        true,
      );
    });
  });

  it('loads overview settings only once on initial render', async () => {
    sessionEmail = 'argro.official@gmail.com';
    sessionRole = 'SUPERADMIN';
    sessionPermissions = ['roles:read'];

    render(<SeoScreen section="overview" />);

    await waitFor(() => {
      const paths = requestMock.mock.calls.map((call) => String(call[0] ?? ''));
      expect(paths.filter((path) => path === '/api/admin/seo')).toHaveLength(1);
    });
  });
});
