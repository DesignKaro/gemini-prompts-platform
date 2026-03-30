import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  resolveSeoIntegrationScope,
  type SeoIntegrationScope,
} from './seo-integration-scope';

export type SeoIntegrationSettingsPayload = {
  scope: SeoIntegrationScope;
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
  updatedAt?: Date;
};

type IntegrationRecord = Record<string, unknown>;

const MAX_INLINE_SCRIPT_LENGTH = 8_000;
const MAX_SCRIPT_URLS = 25;

@Injectable()
export class SeoIntegrationsService {
  constructor(private readonly prisma: PrismaService) {}

  private get integrationsDelegate() {
    return (this.prisma as PrismaService & {
      seoIntegrationSettings: {
        upsert: (args: Record<string, unknown>) => Promise<IntegrationRecord>;
      };
    }).seoIntegrationSettings;
  }

  async getSettings(scopeInput?: string | null): Promise<SeoIntegrationSettingsPayload> {
    const scope = resolveSeoIntegrationScope(
      scopeInput,
      process.env.SITE_CONFIG_ENV ?? process.env.NODE_ENV,
    );
    const record = await this.integrationsDelegate.upsert({
      where: { scope },
      update: {},
      create: { scope },
    });

    return this.mapRecord(record);
  }

  async updateSettings(
    scopeInput: string | null | undefined,
    input: Partial<SeoIntegrationSettingsPayload>,
    updatedByUserId?: string | null,
  ): Promise<SeoIntegrationSettingsPayload> {
    const scope = resolveSeoIntegrationScope(
      scopeInput,
      process.env.SITE_CONFIG_ENV ?? process.env.NODE_ENV,
    );
    const current = await this.getSettings(scope);

    const record = await this.integrationsDelegate.upsert({
      where: { scope },
      update: {
        googleSiteVerification: this.cleanNullableText(
          input.googleSiteVerification,
          current.googleSiteVerification,
          191,
        ),
        bingSiteVerification: this.cleanNullableText(
          input.bingSiteVerification,
          current.bingSiteVerification,
          191,
        ),
        gaMeasurementId: this.normalizeGaMeasurementId(input.gaMeasurementId, current.gaMeasurementId),
        googleAdsTagId: this.normalizeGoogleAdsTagId(input.googleAdsTagId, current.googleAdsTagId),
        adsensePublisherId: this.normalizeAdsensePublisherId(
          input.adsensePublisherId,
          current.adsensePublisherId,
        ),
        clarityProjectId: this.normalizeClarityProjectId(input.clarityProjectId, current.clarityProjectId),
        customHeadScriptUrls: this.normalizeScriptUrls(
          input.customHeadScriptUrls,
          current.customHeadScriptUrls,
        ),
        customHeadInlineScript: this.normalizeInlineScript(
          input.customHeadInlineScript,
          current.customHeadInlineScript,
        ),
        customBodyStartInlineScript: this.normalizeInlineScript(
          input.customBodyStartInlineScript,
          current.customBodyStartInlineScript,
        ),
        customBodyEndInlineScript: this.normalizeInlineScript(
          input.customBodyEndInlineScript,
          current.customBodyEndInlineScript,
        ),
        updatedByUserId: this.cleanNullableText(updatedByUserId, current.updatedByUserId, 191),
      },
      create: {
        scope,
        googleSiteVerification: this.cleanNullableText(
          input.googleSiteVerification,
          current.googleSiteVerification,
          191,
        ),
        bingSiteVerification: this.cleanNullableText(
          input.bingSiteVerification,
          current.bingSiteVerification,
          191,
        ),
        gaMeasurementId: this.normalizeGaMeasurementId(input.gaMeasurementId, current.gaMeasurementId),
        googleAdsTagId: this.normalizeGoogleAdsTagId(input.googleAdsTagId, current.googleAdsTagId),
        adsensePublisherId: this.normalizeAdsensePublisherId(
          input.adsensePublisherId,
          current.adsensePublisherId,
        ),
        clarityProjectId: this.normalizeClarityProjectId(input.clarityProjectId, current.clarityProjectId),
        customHeadScriptUrls: this.normalizeScriptUrls(
          input.customHeadScriptUrls,
          current.customHeadScriptUrls,
        ),
        customHeadInlineScript: this.normalizeInlineScript(
          input.customHeadInlineScript,
          current.customHeadInlineScript,
        ),
        customBodyStartInlineScript: this.normalizeInlineScript(
          input.customBodyStartInlineScript,
          current.customBodyStartInlineScript,
        ),
        customBodyEndInlineScript: this.normalizeInlineScript(
          input.customBodyEndInlineScript,
          current.customBodyEndInlineScript,
        ),
        updatedByUserId: this.cleanNullableText(updatedByUserId, current.updatedByUserId, 191),
      },
    });

    return this.mapRecord(record);
  }

  async getPublicSettings(scopeInput?: string | null): Promise<SeoIntegrationSettingsPayload> {
    return this.getSettings(scopeInput);
  }

  private mapRecord(record: IntegrationRecord): SeoIntegrationSettingsPayload {
    return {
      scope: resolveSeoIntegrationScope(
        typeof record.scope === 'string' ? record.scope : undefined,
        process.env.SITE_CONFIG_ENV ?? process.env.NODE_ENV,
      ),
      googleSiteVerification: this.cleanNullableText(record.googleSiteVerification, null, 191),
      bingSiteVerification: this.cleanNullableText(record.bingSiteVerification, null, 191),
      gaMeasurementId: this.sanitizeGaMeasurementId(record.gaMeasurementId),
      googleAdsTagId: this.sanitizeGoogleAdsTagId(record.googleAdsTagId),
      adsensePublisherId: this.sanitizeAdsensePublisherId(record.adsensePublisherId),
      clarityProjectId: this.sanitizeClarityProjectId(record.clarityProjectId),
      customHeadScriptUrls: this.sanitizeScriptUrls(record.customHeadScriptUrls),
      customHeadInlineScript: this.sanitizeInlineScript(record.customHeadInlineScript),
      customBodyStartInlineScript: this.sanitizeInlineScript(record.customBodyStartInlineScript),
      customBodyEndInlineScript: this.sanitizeInlineScript(record.customBodyEndInlineScript),
      updatedByUserId: this.cleanNullableText(record.updatedByUserId, null, 191),
      updatedAt: record.updatedAt instanceof Date ? record.updatedAt : undefined,
    };
  }

  private sanitizeGaMeasurementId(value: unknown): string | null {
    try {
      return this.normalizeGaMeasurementId(value, null);
    } catch {
      return null;
    }
  }

  private sanitizeGoogleAdsTagId(value: unknown): string | null {
    try {
      return this.normalizeGoogleAdsTagId(value, null);
    } catch {
      return null;
    }
  }

  private sanitizeAdsensePublisherId(value: unknown): string | null {
    try {
      return this.normalizeAdsensePublisherId(value, null);
    } catch {
      return null;
    }
  }

  private sanitizeClarityProjectId(value: unknown): string | null {
    try {
      return this.normalizeClarityProjectId(value, null);
    } catch {
      return null;
    }
  }

  private sanitizeScriptUrls(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }

    const unique = new Set<string>();
    for (const item of value) {
      if (typeof item !== 'string') {
        continue;
      }
      const trimmed = item.trim();
      if (!trimmed) {
        continue;
      }
      try {
        const parsed = new URL(trimmed);
        if (parsed.protocol !== 'https:') {
          continue;
        }
        unique.add(parsed.toString());
        if (unique.size >= MAX_SCRIPT_URLS) {
          break;
        }
      } catch {
        continue;
      }
    }
    return [...unique];
  }

  private sanitizeInlineScript(value: unknown): string | null {
    try {
      return this.normalizeInlineScript(value, null);
    } catch {
      return null;
    }
  }

  private cleanNullableText(
    value: unknown,
    fallback: string | null,
    maxLength = 4_000,
  ): string | null {
    if (value === undefined) {
      return fallback;
    }
    if (value === null) {
      return null;
    }
    if (typeof value !== 'string') {
      return fallback;
    }

    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    return trimmed.slice(0, maxLength);
  }

  private normalizeGaMeasurementId(value: unknown, fallback: string | null): string | null {
    const normalized = this.cleanNullableText(value, fallback, 64);
    if (!normalized) return normalized;
    if (!/^G-[A-Z0-9]+$/i.test(normalized)) {
      throw new BadRequestException('gaMeasurementId must be in the format G-XXXXXXXX.');
    }
    return normalized.toUpperCase();
  }

  private normalizeGoogleAdsTagId(value: unknown, fallback: string | null): string | null {
    const normalized = this.cleanNullableText(value, fallback, 64);
    if (!normalized) return normalized;
    if (!/^AW-\d+$/i.test(normalized)) {
      throw new BadRequestException('googleAdsTagId must be in the format AW-XXXXXXXX.');
    }
    return normalized.toUpperCase();
  }

  private normalizeAdsensePublisherId(value: unknown, fallback: string | null): string | null {
    const normalized = this.cleanNullableText(value, fallback, 64);
    if (!normalized) return normalized;
    if (!/^ca-pub-\d{6,}$/i.test(normalized)) {
      throw new BadRequestException(
        'adsensePublisherId must be in the format ca-pub-XXXXXXXXXXXXXXXX.',
      );
    }
    return normalized.toLowerCase();
  }

  private normalizeClarityProjectId(value: unknown, fallback: string | null): string | null {
    const normalized = this.cleanNullableText(value, fallback, 64);
    if (!normalized) return normalized;
    if (!/^[a-z0-9]+$/i.test(normalized)) {
      throw new BadRequestException('clarityProjectId must be alphanumeric.');
    }
    return normalized;
  }

  private normalizeScriptUrls(value: unknown, fallback: string[] = []): string[] {
    if (value === undefined) {
      return fallback;
    }
    if (!Array.isArray(value)) {
      throw new BadRequestException('customHeadScriptUrls must be an array of URLs.');
    }

    const unique = new Set<string>();
    for (const item of value) {
      if (typeof item !== 'string') {
        continue;
      }
      const trimmed = item.trim();
      if (!trimmed) {
        continue;
      }
      let parsed: URL;
      try {
        parsed = new URL(trimmed);
      } catch {
        throw new BadRequestException(`Invalid script URL: ${trimmed}`);
      }
      if (parsed.protocol !== 'https:') {
        throw new BadRequestException(`Script URL must use https: ${trimmed}`);
      }
      unique.add(parsed.toString());
      if (unique.size > MAX_SCRIPT_URLS) {
        throw new BadRequestException(`customHeadScriptUrls supports up to ${MAX_SCRIPT_URLS} URLs.`);
      }
    }

    return [...unique];
  }

  private normalizeInlineScript(value: unknown, fallback: string | null): string | null {
    if (value === undefined) {
      return fallback;
    }

    const normalized = this.cleanNullableText(value, null, MAX_INLINE_SCRIPT_LENGTH);
    if (!normalized) {
      return null;
    }

    const withoutWrapperTags = normalized
      .replace(/^<script\b[^>]*>/i, '')
      .replace(/<\/script>$/i, '')
      .trim();

    if (!withoutWrapperTags) {
      return null;
    }

    const lower = withoutWrapperTags.toLowerCase();
    const blockedFragments = [
      '<script',
      '</script',
      '<iframe',
      '<object',
      '<embed',
      '<link',
      '<meta',
      'document.write',
      'innerhtml=',
    ];

    if (blockedFragments.some((fragment) => lower.includes(fragment))) {
      throw new BadRequestException('Inline script contains blocked content.');
    }

    return withoutWrapperTags;
  }
}
