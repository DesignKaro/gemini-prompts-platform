import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { SeoIntegrationsService } from '../../src/modules/seo/seo-integrations.service';

type IntegrationRecord = {
  id: string;
  scope: string;
  googleSiteVerification: string | null;
  bingSiteVerification: string | null;
  gaMeasurementId: string | null;
  googleAdsTagId: string | null;
  adsensePublisherId: string | null;
  clarityProjectId: string | null;
  customHeadScriptUrls: string[];
  customHeadInlineScript: string | null;
  customBodyStartInlineScript: string | null;
  customBodyEndInlineScript: string | null;
  updatedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function createService() {
  const records = new Map<string, IntegrationRecord>();

  const prisma = {
    seoIntegrationSettings: {
      upsert: async ({
        where,
        update,
        create,
      }: {
        where: { scope: string };
        update: Partial<IntegrationRecord>;
        create: Partial<IntegrationRecord>;
      }) => {
        const scope = where.scope;
        const now = new Date();
        const current = records.get(scope);

        if (current) {
          const next = {
            ...current,
            ...update,
            scope,
            updatedAt: now,
          } as IntegrationRecord;
          records.set(scope, next);
          return next;
        }

        const created = {
          id: `integration_${scope}`,
          scope,
          googleSiteVerification: null,
          bingSiteVerification: null,
          gaMeasurementId: null,
          googleAdsTagId: null,
          adsensePublisherId: null,
          clarityProjectId: null,
          customHeadScriptUrls: [],
          customHeadInlineScript: null,
          customBodyStartInlineScript: null,
          customBodyEndInlineScript: null,
          updatedByUserId: null,
          createdAt: now,
          updatedAt: now,
          ...create,
        } as IntegrationRecord;

        records.set(scope, created);
        return created;
      },
    },
  } as unknown as ConstructorParameters<typeof SeoIntegrationsService>[0];

  return {
    service: new SeoIntegrationsService(prisma),
    records,
  };
}

describe('SeoIntegrationsService', () => {
  it('uses SITE_CONFIG_ENV as default scope when no scope query is provided', async () => {
    const previousScopeEnv = process.env.SITE_CONFIG_ENV;
    process.env.SITE_CONFIG_ENV = 'staging';
    try {
      const { service } = createService();
      const payload = await service.getSettings();
      expect(payload.scope).toBe('staging');
    } finally {
      process.env.SITE_CONFIG_ENV = previousScopeEnv;
    }
  });

  it('keeps settings isolated by scope', async () => {
    const { service } = createService();

    await service.updateSettings(
      'production',
      {
        gaMeasurementId: 'G-PROD1234',
      },
      'user_prod',
    );

    const production = await service.getSettings('production');
    const staging = await service.getSettings('staging');

    expect(production.gaMeasurementId).toBe('G-PROD1234');
    expect(staging.gaMeasurementId).toBeNull();
  });

  it('sanitizes inline script wrappers', async () => {
    const { service } = createService();

    const payload = await service.updateSettings(
      'development',
      {
        customHeadInlineScript: '<script>window.gpInline = true;</script>',
      },
      'user_dev',
    );

    expect(payload.customHeadInlineScript).toBe('window.gpInline = true;');
  });

  it('rejects non-https custom script urls', async () => {
    const { service } = createService();

    await expect(
      service.updateSettings('staging', {
        customHeadScriptUrls: ['http://cdn.example.com/script.js'],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('sanitizes malformed stored values on read', async () => {
    const { service, records } = createService();
    await service.getSettings('production');

    const record = records.get('production');
    if (!record) {
      throw new Error('Expected seeded record for production scope.');
    }

    (record as unknown as { gaMeasurementId: unknown }).gaMeasurementId = 'not-ga-id';
    (record as unknown as { customHeadScriptUrls: unknown }).customHeadScriptUrls = [
      'http://insecure.example.com/script.js',
      'https://cdn.example.com/ok.js',
    ];
    (record as unknown as { customHeadInlineScript: unknown }).customHeadInlineScript =
      '<iframe src="https://evil.example.com"></iframe>';

    const payload = await service.getSettings('production');
    expect(payload.gaMeasurementId).toBeNull();
    expect(payload.customHeadScriptUrls).toEqual(['https://cdn.example.com/ok.js']);
    expect(payload.customHeadInlineScript).toBeNull();
  });
});
