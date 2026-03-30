// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  buildSeoIntegrationScriptBundle,
  normalizeSeoIntegrationSettings,
  resolveSeoIntegrationScope,
} from '../lib/seo-integrations';

describe('seo integrations helpers', () => {
  it('resolves scope with explicit value and node env fallback', () => {
    expect(resolveSeoIntegrationScope('staging', 'production')).toBe('staging');
    expect(resolveSeoIntegrationScope(undefined, 'staging')).toBe('staging');
    expect(resolveSeoIntegrationScope(undefined, 'production')).toBe('production');
    expect(resolveSeoIntegrationScope(undefined, 'development')).toBe('development');
  });

  it('normalizes integrations payload safely', () => {
    const normalized = normalizeSeoIntegrationSettings(
      {
        scope: 'production',
        gaMeasurementId: 'g-test1234',
        customHeadScriptUrls: [
          'https://cdn.example.com/a.js',
          'http://insecure.example.com/a.js',
          'not-a-url',
        ],
      },
      'development',
    );

    expect(normalized.scope).toBe('production');
    expect(normalized.gaMeasurementId).toBe('G-TEST1234');
    expect(normalized.customHeadScriptUrls).toEqual(['https://cdn.example.com/a.js']);
  });

  it('builds gtag script for ga + ads ids', () => {
    const bundle = buildSeoIntegrationScriptBundle({
      scope: 'production',
      googleSiteVerification: 'google-token',
      bingSiteVerification: 'bing-token',
      gaMeasurementId: 'G-AAA111',
      googleAdsTagId: 'AW-222333',
      adsensePublisherId: 'ca-pub-1234567890123456',
      clarityProjectId: 'abc123',
      customHeadScriptUrls: ['https://cdn.example.com/script.js'],
      customHeadInlineScript: 'window.headInline = true;',
      customBodyStartInlineScript: null,
      customBodyEndInlineScript: 'window.bodyEndInline = true;',
    });

    expect(bundle.gtagLoaderSrc).toContain('googletagmanager.com/gtag/js');
    expect(bundle.gtagInitScript).toContain("gtag('config', 'G-AAA111')");
    expect(bundle.gtagInitScript).toContain("gtag('config', 'AW-222333')");
    expect(bundle.adsenseLoaderSrc).toContain('googlesyndication.com/pagead/js/adsbygoogle.js');
    expect(bundle.clarityInitScript).toContain('www.clarity.ms/tag/');
    expect(bundle.clarityInitScript).toContain("'abc123'");
    expect(bundle.googleSiteVerification).toBe('google-token');
    expect(bundle.bingSiteVerification).toBe('bing-token');
  });

  it('sanitizes unsafe inline scripts and insecure script URLs before injection', () => {
    const bundle = buildSeoIntegrationScriptBundle({
      scope: 'production',
      googleSiteVerification: null,
      bingSiteVerification: null,
      gaMeasurementId: null,
      googleAdsTagId: null,
      adsensePublisherId: null,
      clarityProjectId: null,
      customHeadScriptUrls: ['http://bad.example.com/a.js', 'https://cdn.example.com/safe.js'],
      customHeadInlineScript: '<script>window.safe=true;</script>',
      customBodyStartInlineScript: '<iframe src="https://example.com"></iframe>',
      customBodyEndInlineScript: 'console.log("done")',
    });

    expect(bundle.customHeadScriptUrls).toEqual(['https://cdn.example.com/safe.js']);
    expect(bundle.customHeadInlineScript).toBe('window.safe=true;');
    expect(bundle.customBodyStartInlineScript).toBeNull();
    expect(bundle.customBodyEndInlineScript).toBe('console.log("done")');
  });
});
