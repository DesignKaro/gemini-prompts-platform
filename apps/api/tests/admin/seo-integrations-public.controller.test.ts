import { describe, expect, it, vi } from 'vitest';
import { PublicController } from '../../src/modules/public/public.controller';

describe('PublicController seo settings', () => {
  it('returns scoped integrations in seo settings payload', async () => {
    const publicService = {} as ConstructorParameters<typeof PublicController>[0];
    const authService = {} as ConstructorParameters<typeof PublicController>[1];
    const seoSettingsService = {
      getPublicSettings: vi.fn().mockResolvedValue({
        siteTitle: 'Gemini Prompts',
      }),
    } as unknown as ConstructorParameters<typeof PublicController>[2];
    const seoIntegrationsService = {
      getPublicSettings: vi.fn().mockResolvedValue({
        scope: 'staging',
        gaMeasurementId: 'G-TEST1234',
      }),
    } as unknown as ConstructorParameters<typeof PublicController>[3];
    const redirectRulesService = {} as ConstructorParameters<typeof PublicController>[4];

    const controller = new PublicController(
      publicService,
      authService,
      seoSettingsService,
      seoIntegrationsService,
      redirectRulesService,
    );

    const payload = await controller.getSeoSettings({ scope: 'staging' });

    expect(payload).toEqual({
      siteTitle: 'Gemini Prompts',
      integrations: {
        scope: 'staging',
        gaMeasurementId: 'G-TEST1234',
      },
    });
    expect(seoIntegrationsService.getPublicSettings).toHaveBeenCalledWith('staging');
  });
});
