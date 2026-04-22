import type { SeoIntegrationScope } from '@/lib/seo-integrations';

export type DashboardSeoSettings = {
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
  updatedAt?: string;
};

export type DashboardSeoSettingsUpdateInput = Omit<DashboardSeoSettings, 'updatedAt'>;

export type DashboardSeoIntegrationSettings = {
  scope: SeoIntegrationScope;
  googleSiteVerification: string | null;
  bingSiteVerification: string | null;
  gaMeasurementId: string | null;
  googleAdsTagId: string | null;
  adsensePublisherId: string | null;
  clarityProjectId: string | null;
  customHeadScriptUrls: string[];
  customHeadInlineScript: string | null;
  customHeadInlineStyle: string | null;
  customBodyStartInlineScript: string | null;
  customBodyEndInlineScript: string | null;
  updatedByUserId: string | null;
  updatedAt?: string;
};

export type DashboardSeoIntegrationSettingsUpdateInput = Omit<
  DashboardSeoIntegrationSettings,
  'scope' | 'updatedAt' | 'updatedByUserId'
>;

export type SeoSection =
  | 'overview'
  | 'settings'
  | 'robots'
  | 'sitemap'
  | 'social'
  | 'redirects'
  | 'custom-code'
  | 'integrations';

export type RedirectRule = {
  id: string;
  sourcePath: string;
  destinationPath: string;
  isPermanent: boolean;
  isActive: boolean;
  hitCount: number;
  lastHitAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};
