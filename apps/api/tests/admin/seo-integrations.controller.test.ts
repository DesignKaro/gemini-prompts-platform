import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { SeoController } from '../../src/modules/admin/seo/seo.controller';

describe('SeoController integrations access', () => {
  it('blocks integrations access for non-superadmin users', async () => {
    const seoSettingsService = {
      getSettings: vi.fn(),
      updateSettings: vi.fn(),
    } as unknown as ConstructorParameters<typeof SeoController>[0];
    const seoIntegrationsService = {
      getSettings: vi.fn(),
      updateSettings: vi.fn(),
    } as unknown as ConstructorParameters<typeof SeoController>[1];
    const redirectRulesService = {
      list: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    } as unknown as ConstructorParameters<typeof SeoController>[2];

    const controller = new SeoController(
      seoSettingsService,
      seoIntegrationsService,
      redirectRulesService,
    );

    const user = {
      sub: 'user_1',
      email: 'admin@example.com',
      role: 'ADMIN',
    } as unknown as Parameters<typeof controller.getIntegrations>[0];

    expect(() =>
      controller.getIntegrations(user, {
        scope: 'production',
      }),
    ).toThrow(ForbiddenException);
  });

  it('allows integrations access for protected superadmin', async () => {
    const seoSettingsService = {
      getSettings: vi.fn(),
      updateSettings: vi.fn(),
    } as unknown as ConstructorParameters<typeof SeoController>[0];
    const seoIntegrationsService = {
      getSettings: vi.fn().mockResolvedValue({ scope: 'production' }),
      updateSettings: vi.fn(),
    } as unknown as ConstructorParameters<typeof SeoController>[1];
    const redirectRulesService = {
      list: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    } as unknown as ConstructorParameters<typeof SeoController>[2];

    const controller = new SeoController(
      seoSettingsService,
      seoIntegrationsService,
      redirectRulesService,
    );

    const user = {
      sub: 'super_1',
      email: 'argro.official@gmail.com',
      role: 'SUPERADMIN',
    } as unknown as Parameters<typeof controller.getIntegrations>[0];

    await expect(
      controller.getIntegrations(user, {
        scope: 'production',
      }),
    ).resolves.toEqual({ scope: 'production' });
  });
});
