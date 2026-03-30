import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { SeoIntegrationsScopeQueryDto } from '../../src/modules/admin/seo/dto/seo-integrations-scope-query.dto';
import { UpdateSeoIntegrationsDto } from '../../src/modules/admin/seo/dto/update-seo-integrations.dto';

describe('SEO integrations DTOs', () => {
  it('accepts valid integration payload fields', () => {
    const dto = plainToInstance(UpdateSeoIntegrationsDto, {
      googleSiteVerification: 'google-token',
      bingSiteVerification: 'bing-token',
      gaMeasurementId: 'G-TEST1234',
      googleAdsTagId: 'AW-1234567',
      adsensePublisherId: 'ca-pub-1234567890123456',
      clarityProjectId: 'abcd12',
      customHeadScriptUrls: ['https://cdn.example.com/script.js'],
      customHeadInlineScript: 'window.featureFlag = true;',
      customBodyStartInlineScript: 'window.bodyStart = 1;',
      customBodyEndInlineScript: 'window.bodyEnd = 1;',
    });

    const errors = validateSync(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(errors).toHaveLength(0);
  });

  it('rejects unknown integration payload fields', () => {
    const dto = plainToInstance(UpdateSeoIntegrationsDto, {
      gaMeasurementId: 'G-TEST1234',
      unknownField: 'nope',
    });

    const errors = validateSync(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(errors.some((entry) => entry.property === 'unknownField')).toBe(true);
  });

  it('validates scope query enum', () => {
    const valid = plainToInstance(SeoIntegrationsScopeQueryDto, {
      scope: 'staging',
    });
    const invalid = plainToInstance(SeoIntegrationsScopeQueryDto, {
      scope: 'qa',
    });

    const validErrors = validateSync(valid, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    const invalidErrors = validateSync(invalid, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(validErrors).toHaveLength(0);
    expect(invalidErrors.length).toBeGreaterThan(0);
  });
});
