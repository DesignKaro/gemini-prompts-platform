import type { Metadata } from 'next';
import { cache } from 'react';
import {
  DEFAULT_SEO_INTEGRATION_SETTINGS,
  normalizeSeoIntegrationSettings,
  resolveSeoIntegrationScope,
  type SeoIntegrationSettings,
} from './seo-integrations';

const FALLBACK_BASE_URL = 'http://localhost:30001';
const FALLBACK_API_BASE_URL = 'http://localhost:4000';
const DEFAULT_OG_IMAGE_PATH = '/icon.svg';

export const SITE_NAME = 'Gemini Prompts';
export const SITE_TITLE_DEFAULT = 'Gemini Prompts';
export const SITE_DESCRIPTION =
  'Discover curated AI prompts, practical workflows, creator guides, and weekly prompt drops.';
export const AI_BOT_USER_AGENTS = [
  'GPTBot',
  'ChatGPT-User',
  'ClaudeBot',
  'CCBot',
  'PerplexityBot',
  'Bytespider',
  'anthropic-ai',
] as const;

export type SeoSettings = {
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
  sitemapIncludePrompts: boolean;
  sitemapIncludePages: boolean;
  sitemapIncludePosts: boolean;
  sitemapIncludeNewsletter: boolean;
  sitemapIncludeTags: boolean;
  sitemapIncludeCategories: boolean;
  sitemapIncludeAuthors: boolean;
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
  integrations: SeoIntegrationSettings;
};

export const DEFAULT_SEO_SETTINGS: SeoSettings = {
  siteTitle: SITE_TITLE_DEFAULT,
  titleSeparator: '|',
  defaultMetaDescription: SITE_DESCRIPTION,
  homepageTitle: null,
  homepageDescription: null,
  defaultOgImageUrl: null,
  defaultOgImageAlt: null,
  twitterCardType: 'summary_large_image',
  schemaOrganizationEnabled: true,
  schemaWebsiteEnabled: true,
  schemaWebPageEnabled: true,
  schemaFaqEnabled: true,
  schemaCollectionEnabled: true,
  schemaArticleEnabled: true,
  schemaProfileEnabled: true,
  schemaBreadcrumbEnabled: true,
  schemaPromptEnabled: true,
  schemaSearchEnabled: true,
  robotsSiteIndex: true,
  robotsSiteFollow: true,
  robotsBlockAiBots: false,
  robotsDisallowPaths: ['/dashboard', '/login', '/profile', '/membership/manage'],
  robotsAdditionalRules: [],
  sitemapIncludePrompts: true,
  sitemapIncludePages: true,
  sitemapIncludePosts: true,
  sitemapIncludeNewsletter: true,
  sitemapIncludeTags: true,
  sitemapIncludeCategories: true,
  sitemapIncludeAuthors: true,
  canonicalBaseUrl: null,
  googleSiteVerification: null,
  bingSiteVerification: null,
  organizationName: null,
  organizationLogoUrl: null,
  organizationSameAs: [],
  noindexSearchPages: true,
  noindexPaginatedArchives: true,
  noindexAuthorPages: false,
  noindexTagPages: false,
  noindexCategoryPages: false,
  noindexBlogArchivePages: false,
  noindexBlogPostPages: false,
  noindexStaticPages: false,
  integrations: DEFAULT_SEO_INTEGRATION_SETTINGS,
};

function normalizeBaseUrlCandidate(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    return `${url.origin}${url.pathname}`.replace(/\/$/, '');
  } catch {
    return null;
  }
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);
}

function normalizeSlashPaths(value: unknown): string[] {
  const normalized = normalizeStringArray(value).map((path) =>
    path.startsWith('/') ? path : `/${path}`,
  );
  return Array.from(new Set(normalized));
}

function normalizeSeoPayload(payload: Partial<SeoSettings> | null | undefined): SeoSettings {
  if (!payload || typeof payload !== 'object') {
    return DEFAULT_SEO_SETTINGS;
  }

  const normalizedDisallowPaths = normalizeSlashPaths(payload.robotsDisallowPaths);
  const schemaWebsiteEnabled =
    typeof payload.schemaWebsiteEnabled === 'boolean'
      ? payload.schemaWebsiteEnabled
      : DEFAULT_SEO_SETTINGS.schemaWebsiteEnabled;
  const schemaBreadcrumbEnabled =
    typeof payload.schemaBreadcrumbEnabled === 'boolean'
      ? payload.schemaBreadcrumbEnabled
      : DEFAULT_SEO_SETTINGS.schemaBreadcrumbEnabled;
  const schemaArticleEnabled =
    typeof payload.schemaArticleEnabled === 'boolean'
      ? payload.schemaArticleEnabled
      : DEFAULT_SEO_SETTINGS.schemaArticleEnabled;

  return {
    ...DEFAULT_SEO_SETTINGS,
    ...payload,
    schemaWebPageEnabled:
      typeof payload.schemaWebPageEnabled === 'boolean'
        ? payload.schemaWebPageEnabled
        : schemaWebsiteEnabled,
    schemaFaqEnabled:
      typeof payload.schemaFaqEnabled === 'boolean' ? payload.schemaFaqEnabled : schemaWebsiteEnabled,
    schemaCollectionEnabled:
      typeof payload.schemaCollectionEnabled === 'boolean'
        ? payload.schemaCollectionEnabled
        : schemaBreadcrumbEnabled,
    schemaPromptEnabled:
      typeof payload.schemaPromptEnabled === 'boolean'
        ? payload.schemaPromptEnabled
        : schemaArticleEnabled,
    schemaSearchEnabled:
      typeof payload.schemaSearchEnabled === 'boolean'
        ? payload.schemaSearchEnabled
        : schemaBreadcrumbEnabled,
    robotsDisallowPaths:
      normalizedDisallowPaths.length > 0
        ? normalizedDisallowPaths
        : DEFAULT_SEO_SETTINGS.robotsDisallowPaths,
    robotsAdditionalRules: normalizeStringArray(payload.robotsAdditionalRules),
    organizationSameAs: normalizeStringArray(payload.organizationSameAs),
    canonicalBaseUrl: normalizeBaseUrlCandidate(payload.canonicalBaseUrl) ?? null,
    integrations: normalizeSeoIntegrationSettings(
      payload.integrations,
      resolveSeoIntegrationScope(process.env.SITE_CONFIG_ENV, process.env.NODE_ENV),
    ),
  };
}

export function getBaseUrl(settings?: Pick<SeoSettings, 'canonicalBaseUrl'> | null) {
  const preferred = normalizeBaseUrlCandidate(settings?.canonicalBaseUrl);
  if (preferred) {
    return preferred;
  }
  return normalizeBaseUrlCandidate(process.env.NEXT_PUBLIC_APP_URL) || FALLBACK_BASE_URL;
}

export function getNormalizedBaseUrl(settings?: Pick<SeoSettings, 'canonicalBaseUrl'> | null) {
  return getBaseUrl(settings).replace(/\/$/, '');
}

function getApiBaseUrl() {
  return (
    process.env.API_URL?.replace(/\/$/, '') ??
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ??
    FALLBACK_API_BASE_URL
  ).trim();
}

export function absoluteUrl(path = '/', baseUrl = getBaseUrl()) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return new URL(normalizedPath, baseUrl).toString();
}

export function getDefaultOgImagePath() {
  return DEFAULT_OG_IMAGE_PATH;
}

export function getDefaultOgImage(baseUrl = getBaseUrl()) {
  return absoluteUrl(DEFAULT_OG_IMAGE_PATH, baseUrl);
}

export const getSeoSettings = cache(async (): Promise<SeoSettings> => {
  const scope = resolveSeoIntegrationScope(process.env.SITE_CONFIG_ENV, process.env.NODE_ENV);
  const query = `scope=${encodeURIComponent(scope)}`;
  try {
    const response = await fetch(`${getApiBaseUrl()}/api/public/seo/settings?${query}`, {
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      return DEFAULT_SEO_SETTINGS;
    }

    const payload = (await response.json()) as Partial<SeoSettings> | null;
    return normalizeSeoPayload(payload);
  } catch {
    return DEFAULT_SEO_SETTINGS;
  }
});

export async function getSeoSettingsFresh(): Promise<SeoSettings> {
  const scope = resolveSeoIntegrationScope(process.env.SITE_CONFIG_ENV, process.env.NODE_ENV);
  const query = `scope=${encodeURIComponent(scope)}`;
  try {
    const response = await fetch(`${getApiBaseUrl()}/api/public/seo/settings?${query}`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      return DEFAULT_SEO_SETTINGS;
    }

    const payload = (await response.json()) as Partial<SeoSettings> | null;
    return normalizeSeoPayload(payload);
  } catch {
    return DEFAULT_SEO_SETTINGS;
  }
}

type BuildMetadataOptions = {
  title?: string;
  description?: string;
  path?: string;
  canonicalUrl?: string;
  image?: string | null;
  type?: 'website' | 'article' | 'profile';
  noIndex?: boolean;
};

export async function buildMetadata({
  title,
  description,
  path = '/',
  canonicalUrl,
  image,
  type = 'website',
  noIndex = false,
}: BuildMetadataOptions = {}): Promise<Metadata> {
  const settings = await getSeoSettings();
  const baseUrl = getBaseUrl(settings);
  const url = canonicalUrl || absoluteUrl(path, baseUrl);
  const resolvedTitle = title || settings.siteTitle;
  const resolvedDescription = description || settings.defaultMetaDescription;
  const resolvedImage = image || settings.defaultOgImageUrl || getDefaultOgImage(baseUrl);
  const shouldIndex = noIndex ? false : settings.robotsSiteIndex;
  const shouldFollow = settings.robotsSiteFollow;

  return {
    title: resolvedTitle,
    description: resolvedDescription,
    alternates: {
      canonical: url,
    },
    openGraph: {
      type,
      url,
      title: resolvedTitle,
      description: resolvedDescription,
      siteName: settings.siteTitle,
      images: [
        {
          url: resolvedImage,
          alt: settings.defaultOgImageAlt || resolvedTitle,
        },
      ],
    },
    twitter: {
      card: settings.twitterCardType,
      title: resolvedTitle,
      description: resolvedDescription,
      images: [resolvedImage],
    },
    robots: {
      index: shouldIndex,
      follow: shouldFollow,
      googleBot: {
        index: shouldIndex,
        follow: shouldFollow,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1,
      },
    },
  };
}

export async function buildPaginatedMetadata({
  title,
  description,
  basePath,
  page,
  noIndex = false,
}: {
  title: string;
  description: string;
  basePath: string;
  page: number;
  noIndex?: boolean;
}): Promise<Metadata> {
  const settings = await getSeoSettings();
  const safePage = Math.max(1, page);
  const path = safePage > 1 ? `${basePath}?page=${safePage}` : basePath;

  return buildMetadata({
    title: safePage > 1 ? `${title} - Page ${safePage}` : title,
    description,
    path,
    noIndex: noIndex || (safePage > 1 && settings.noindexPaginatedArchives),
  });
}
