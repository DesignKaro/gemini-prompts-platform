import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const GLOBAL_SEO_SETTINGS_ID = 'global';
const VALID_ROBOTS_DIRECTIVES = new Set([
  'user-agent',
  'allow',
  'disallow',
  'sitemap',
  'host',
  'crawl-delay',
]);

export type SeoSettingsPayload = {
  siteTitle: string;
  titleSeparator: string;
  defaultMetaDescription: string;
  homepageTitle: string | null;
  homepageDescription: string | null;
  defaultOgImageUrl: string | null;
  defaultOgImageAlt: string | null;
  twitterCardType: 'summary' | 'summary_large_image';
  schemaOrganizationEnabled: boolean;
  schemaWebsiteEnabled: boolean;
  schemaWebPageEnabled: boolean;
  schemaFaqEnabled: boolean;
  schemaCollectionEnabled: boolean;
  schemaArticleEnabled: boolean;
  schemaProfileEnabled: boolean;
  schemaBreadcrumbEnabled: boolean;
  schemaPromptEnabled: boolean;
  schemaSearchEnabled: boolean;
  robotsSiteIndex: boolean;
  robotsSiteFollow: boolean;
  robotsBlockAiBots: boolean;
  robotsDisallowPaths: string[];
  robotsAdditionalRules: string[];
  robotsCustomText: string | null;
  sitemapIncludePrompts: boolean;
  sitemapIncludePages: boolean;
  sitemapIncludePosts: boolean;
  sitemapIncludeNewsletter: boolean;
  sitemapIncludeTags: boolean;
  sitemapIncludeCategories: boolean;
  sitemapIncludeAuthors: boolean;
  sitemapCustomXml: string | null;
  canonicalBaseUrl: string | null;
  googleSiteVerification: string | null;
  bingSiteVerification: string | null;
  organizationName: string | null;
  organizationLogoUrl: string | null;
  organizationSameAs: string[];
  noindexSearchPages: boolean;
  noindexPaginatedArchives: boolean;
  noindexAuthorPages: boolean;
  noindexTagPages: boolean;
  noindexCategoryPages: boolean;
  noindexBlogArchivePages: boolean;
  noindexBlogPostPages: boolean;
  noindexStaticPages: boolean;
  updatedAt?: Date;
};

@Injectable()
export class SeoSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  private get seoSettingsDelegate() {
    return (this.prisma as PrismaService & {
      seoSettings: {
        upsert: (args: Record<string, unknown>) => Promise<Record<string, unknown>>;
      };
    }).seoSettings;
  }

  async getSettings(): Promise<SeoSettingsPayload> {
    const record = await this.seoSettingsDelegate.upsert({
      where: { id: GLOBAL_SEO_SETTINGS_ID },
      update: {},
      create: { id: GLOBAL_SEO_SETTINGS_ID },
    });

    return this.mapRecord(record);
  }

  async updateSettings(input: Partial<SeoSettingsPayload>): Promise<SeoSettingsPayload> {
    const current = await this.getSettings();
    const nextDisallowPaths =
      input.robotsDisallowPaths !== undefined
        ? this.normalizePaths(input.robotsDisallowPaths)
        : current.robotsDisallowPaths;
    const nextAdditionalRobotRules =
      input.robotsAdditionalRules !== undefined
        ? this.normalizeAdditionalRobotRules(input.robotsAdditionalRules)
        : current.robotsAdditionalRules;
    const nextOrganizationSameAs =
      input.organizationSameAs !== undefined
        ? this.normalizeSameAsUrls(input.organizationSameAs)
        : current.organizationSameAs;
    const nextCustomRobotsText =
      input.robotsCustomText !== undefined
        ? this.cleanLongText(input.robotsCustomText, current.robotsCustomText)
        : current.robotsCustomText;
    const nextCustomSitemapXml =
      input.sitemapCustomXml !== undefined
        ? this.cleanLongText(input.sitemapCustomXml, current.sitemapCustomXml)
        : current.sitemapCustomXml;

    const record = await this.seoSettingsDelegate.upsert({
      where: { id: GLOBAL_SEO_SETTINGS_ID },
      update: {
        siteTitle: this.cleanText(input.siteTitle, current.siteTitle),
        titleSeparator: this.cleanText(input.titleSeparator, current.titleSeparator, 10),
        defaultMetaDescription: this.cleanText(
          input.defaultMetaDescription,
          current.defaultMetaDescription,
          512,
        ),
        homepageTitle: this.cleanNullableText(input.homepageTitle, current.homepageTitle, 191),
        homepageDescription: this.cleanNullableText(
          input.homepageDescription,
          current.homepageDescription,
          512,
        ),
        defaultOgImageUrl: this.cleanNullableText(
          input.defaultOgImageUrl,
          current.defaultOgImageUrl,
          4000,
        ),
        defaultOgImageAlt: this.cleanNullableText(
          input.defaultOgImageAlt,
          current.defaultOgImageAlt,
          191,
        ),
        twitterCardType:
          input.twitterCardType === 'summary' ? 'summary' : input.twitterCardType === 'summary_large_image' ? 'summary_large_image' : current.twitterCardType,
        schemaOrganizationEnabled:
          input.schemaOrganizationEnabled ?? current.schemaOrganizationEnabled,
        schemaWebsiteEnabled: input.schemaWebsiteEnabled ?? current.schemaWebsiteEnabled,
        schemaWebPageEnabled: input.schemaWebPageEnabled ?? current.schemaWebPageEnabled,
        schemaFaqEnabled: input.schemaFaqEnabled ?? current.schemaFaqEnabled,
        schemaCollectionEnabled:
          input.schemaCollectionEnabled ?? current.schemaCollectionEnabled,
        schemaArticleEnabled: input.schemaArticleEnabled ?? current.schemaArticleEnabled,
        schemaProfileEnabled: input.schemaProfileEnabled ?? current.schemaProfileEnabled,
        schemaBreadcrumbEnabled: input.schemaBreadcrumbEnabled ?? current.schemaBreadcrumbEnabled,
        schemaPromptEnabled: input.schemaPromptEnabled ?? current.schemaPromptEnabled,
        schemaSearchEnabled: input.schemaSearchEnabled ?? current.schemaSearchEnabled,
        robotsSiteIndex: input.robotsSiteIndex ?? current.robotsSiteIndex,
        robotsSiteFollow: input.robotsSiteFollow ?? current.robotsSiteFollow,
        robotsBlockAiBots: input.robotsBlockAiBots ?? current.robotsBlockAiBots,
        robotsDisallowPaths: nextDisallowPaths,
        robotsAdditionalRules: nextAdditionalRobotRules,
        robotsCustomText: nextCustomRobotsText,
        sitemapIncludePrompts: input.sitemapIncludePrompts ?? current.sitemapIncludePrompts,
        sitemapIncludePages: input.sitemapIncludePages ?? current.sitemapIncludePages,
        sitemapIncludePosts: input.sitemapIncludePosts ?? current.sitemapIncludePosts,
        sitemapIncludeNewsletter:
          input.sitemapIncludeNewsletter ?? current.sitemapIncludeNewsletter,
        sitemapIncludeTags: input.sitemapIncludeTags ?? current.sitemapIncludeTags,
        sitemapIncludeCategories:
          input.sitemapIncludeCategories ?? current.sitemapIncludeCategories,
        sitemapIncludeAuthors: input.sitemapIncludeAuthors ?? current.sitemapIncludeAuthors,
        sitemapCustomXml: nextCustomSitemapXml,
        canonicalBaseUrl: this.cleanNullableText(
          input.canonicalBaseUrl,
          current.canonicalBaseUrl,
          4000,
        ),
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
        organizationName: this.cleanNullableText(
          input.organizationName,
          current.organizationName,
          191,
        ),
        organizationLogoUrl: this.cleanNullableText(
          input.organizationLogoUrl,
          current.organizationLogoUrl,
          4000,
        ),
        organizationSameAs: nextOrganizationSameAs,
        noindexSearchPages: input.noindexSearchPages ?? current.noindexSearchPages,
        noindexPaginatedArchives:
          input.noindexPaginatedArchives ?? current.noindexPaginatedArchives,
        noindexAuthorPages: input.noindexAuthorPages ?? current.noindexAuthorPages,
        noindexTagPages: input.noindexTagPages ?? current.noindexTagPages,
        noindexCategoryPages: input.noindexCategoryPages ?? current.noindexCategoryPages,
        noindexBlogArchivePages:
          input.noindexBlogArchivePages ?? current.noindexBlogArchivePages,
        noindexBlogPostPages: input.noindexBlogPostPages ?? current.noindexBlogPostPages,
        noindexStaticPages: input.noindexStaticPages ?? current.noindexStaticPages,
      },
      create: {
        id: GLOBAL_SEO_SETTINGS_ID,
      },
    });

    return this.mapRecord(record);
  }

  async getPublicSettings() {
    return this.getSettings();
  }

  private mapRecord(record: Record<string, unknown>): SeoSettingsPayload {
    const schemaOrganizationEnabled = this.readBoolean(record.schemaOrganizationEnabled, true);
    const schemaWebsiteEnabled = this.readBoolean(record.schemaWebsiteEnabled, true);
    const schemaArticleEnabled = this.readBoolean(record.schemaArticleEnabled, true);
    const schemaProfileEnabled = this.readBoolean(record.schemaProfileEnabled, true);
    const schemaBreadcrumbEnabled = this.readBoolean(record.schemaBreadcrumbEnabled, true);

    return {
      siteTitle: String(record.siteTitle ?? 'Gemini Prompts'),
      titleSeparator: String(record.titleSeparator ?? '|'),
      defaultMetaDescription: String(record.defaultMetaDescription ?? ''),
      homepageTitle: typeof record.homepageTitle === 'string' ? record.homepageTitle : null,
      homepageDescription:
        typeof record.homepageDescription === 'string' ? record.homepageDescription : null,
      defaultOgImageUrl:
        typeof record.defaultOgImageUrl === 'string' ? record.defaultOgImageUrl : null,
      defaultOgImageAlt:
        typeof record.defaultOgImageAlt === 'string' ? record.defaultOgImageAlt : null,
      twitterCardType: record.twitterCardType === 'summary' ? 'summary' : 'summary_large_image',
      schemaOrganizationEnabled,
      schemaWebsiteEnabled,
      schemaWebPageEnabled: this.readBoolean(record.schemaWebPageEnabled, schemaWebsiteEnabled),
      schemaFaqEnabled: this.readBoolean(record.schemaFaqEnabled, schemaWebsiteEnabled),
      schemaCollectionEnabled: this.readBoolean(
        record.schemaCollectionEnabled,
        schemaBreadcrumbEnabled,
      ),
      schemaArticleEnabled,
      schemaProfileEnabled,
      schemaBreadcrumbEnabled,
      schemaPromptEnabled: this.readBoolean(record.schemaPromptEnabled, schemaArticleEnabled),
      schemaSearchEnabled: this.readBoolean(record.schemaSearchEnabled, schemaBreadcrumbEnabled),
      robotsSiteIndex: Boolean(record.robotsSiteIndex),
      robotsSiteFollow: Boolean(record.robotsSiteFollow),
      robotsBlockAiBots: Boolean(record.robotsBlockAiBots),
      robotsDisallowPaths: this.normalizePaths(record.robotsDisallowPaths),
      robotsAdditionalRules: this.normalizeAdditionalRobotRules(record.robotsAdditionalRules),
      robotsCustomText: typeof record.robotsCustomText === 'string' ? record.robotsCustomText : null,
      sitemapIncludePrompts: Boolean(record.sitemapIncludePrompts),
      sitemapIncludePages: Boolean(record.sitemapIncludePages),
      sitemapIncludePosts: Boolean(record.sitemapIncludePosts),
      sitemapIncludeNewsletter: Boolean(record.sitemapIncludeNewsletter),
      sitemapIncludeTags: Boolean(record.sitemapIncludeTags),
      sitemapIncludeCategories: Boolean(record.sitemapIncludeCategories),
      sitemapIncludeAuthors: Boolean(record.sitemapIncludeAuthors),
      sitemapCustomXml: typeof record.sitemapCustomXml === 'string' ? record.sitemapCustomXml : null,
      canonicalBaseUrl: typeof record.canonicalBaseUrl === 'string' ? record.canonicalBaseUrl : null,
      googleSiteVerification:
        typeof record.googleSiteVerification === 'string' ? record.googleSiteVerification : null,
      bingSiteVerification:
        typeof record.bingSiteVerification === 'string' ? record.bingSiteVerification : null,
      organizationName: typeof record.organizationName === 'string' ? record.organizationName : null,
      organizationLogoUrl:
        typeof record.organizationLogoUrl === 'string' ? record.organizationLogoUrl : null,
      organizationSameAs: this.normalizeSameAsUrls(record.organizationSameAs),
      noindexSearchPages: Boolean(record.noindexSearchPages),
      noindexPaginatedArchives: Boolean(record.noindexPaginatedArchives),
      noindexAuthorPages: Boolean(record.noindexAuthorPages),
      noindexTagPages: Boolean(record.noindexTagPages),
      noindexCategoryPages: Boolean(record.noindexCategoryPages),
      noindexBlogArchivePages: Boolean(record.noindexBlogArchivePages),
      noindexBlogPostPages: Boolean(record.noindexBlogPostPages),
      noindexStaticPages: Boolean(record.noindexStaticPages),
      updatedAt: record.updatedAt instanceof Date ? record.updatedAt : undefined,
    };
  }

  private normalizePaths(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return ['/dashboard', '/login', '/profile'];
    }

    const normalized = value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean)
      .map((path) => (path.startsWith('/') ? path : `/${path}`));

    return Array.from(new Set(normalized));
  }

  private normalizeAdditionalRobotRules(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }

    const normalized = value
      .flatMap((item) =>
        typeof item === 'string' ? item.split(/\r?\n/) : [],
      )
      .map((item) => item.trim())
      .filter(Boolean)
      .filter((line) => {
        if (line.startsWith('#')) return true;
        const separatorIndex = line.indexOf(':');
        if (separatorIndex <= 0) return false;
        const directive = line.slice(0, separatorIndex).trim().toLowerCase();
        return VALID_ROBOTS_DIRECTIVES.has(directive);
      })
      .slice(0, 100);

    return Array.from(new Set(normalized));
  }

  private normalizeSameAsUrls(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }

    const normalized = value
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean)
      .slice(0, 30);

    return Array.from(new Set(normalized));
  }

  private cleanText(value: string | undefined, fallback: string, max = 191) {
    if (typeof value !== 'string') return fallback;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed.slice(0, max) : fallback;
  }

  private cleanNullableText(value: string | null | undefined, fallback: string | null, max = 191) {
    if (value === undefined) return fallback;
    if (value === null) return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed.slice(0, max) : null;
  }

  private cleanLongText(value: string | null | undefined, fallback: string | null) {
    if (value === undefined) return fallback;
    if (value === null) return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private readBoolean(value: unknown, fallback: boolean) {
    return typeof value === 'boolean' ? value : fallback;
  }
}
