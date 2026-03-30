import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { UpdateSeoSettingsDto } from '../../src/modules/admin/seo/dto/update-seo-settings.dto';

describe('UpdateSeoSettingsDto', () => {
  it('accepts the strong core pack seo fields', () => {
    const dto = plainToInstance(UpdateSeoSettingsDto, {
      canonicalBaseUrl: 'https://example.com',
      googleSiteVerification: 'google-token',
      bingSiteVerification: 'bing-token',
      organizationName: 'Gemini Prompts',
      organizationLogoUrl: 'https://example.com/logo.png',
      organizationSameAs: ['https://x.com/example', 'https://linkedin.com/company/example'],
      robotsBlockAiBots: true,
      robotsAdditionalRules: ['Crawl-delay: 5'],
      sitemapIncludePages: true,
      schemaWebPageEnabled: true,
      schemaFaqEnabled: true,
      schemaCollectionEnabled: true,
      schemaPromptEnabled: true,
      schemaSearchEnabled: true,
    });

    const errors = validateSync(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(errors).toHaveLength(0);
  });

  it('rejects unknown properties like updatedAt in patch payloads', () => {
    const dto = plainToInstance(UpdateSeoSettingsDto, {
      siteTitle: 'Gemini Prompts',
      updatedAt: '2026-03-28T10:09:00.000Z',
    });

    const errors = validateSync(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(errors.some((entry) => entry.property === 'updatedAt')).toBe(true);
  });

  it('parses string booleans without coercing "false" to true', () => {
    const dto = plainToInstance(UpdateSeoSettingsDto, {
      sitemapIncludePages: 'false',
      noindexSearchPages: 'true',
    });

    const errors = validateSync(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(errors).toHaveLength(0);
    expect(dto.sitemapIncludePages).toBe(false);
    expect(dto.noindexSearchPages).toBe(true);
  });

  it('rejects non-array values for array fields', () => {
    const dto = plainToInstance(UpdateSeoSettingsDto, {
      robotsDisallowPaths: '/dashboard',
      robotsAdditionalRules: 123,
      organizationSameAs: 'https://example.com',
    });

    const errors = validateSync(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    const errorProps = new Set(errors.map((error) => error.property));
    expect(errorProps.has('robotsDisallowPaths')).toBe(true);
    expect(errorProps.has('robotsAdditionalRules')).toBe(true);
    expect(errorProps.has('organizationSameAs')).toBe(true);
  });
});
