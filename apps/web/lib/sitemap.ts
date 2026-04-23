import {
  getAuthorList,
  getCategoryList,
  getPostList,
  getPromptList,
  getTagList,
} from './public-content';
import { absoluteUrl, getBaseUrl, getSeoSettingsFresh, type SeoSettings } from './seo';

const XML_CONTENT_TYPE = 'application/xml; charset=utf-8';
const XML_CACHE_CONTROL = 'private, no-store, max-age=0';
const MAX_SITEMAP_FETCH_SIZE = 5000;
const SITEMAP_PAGE_SIZE = 200;
const SITEMAP_AUTHOR_PAGE_SIZE = 100;

const CORE_STATIC_ROUTES = ['/', '/prompt', '/prompts', '/trending'];
const STATIC_SITE_ROUTES = [
  '/about',
  '/contact',
  '/membership',
  '/newsletter',
  '/help',
  '/privacy-policy',
  '/terms',
  '/disclaimer',
  '/code-of-conduct',
  '/refund-and-return-policy',
  '/exclusive',
  '/latest',
  '/most-popular',
  '/popular-tags',
];

export const SITEMAP_CHILDREN = [
  { key: 'page', path: '/page-sitemap.xml' },
  { key: 'prompt', path: '/prompt-sitemap.xml' },
  { key: 'post', path: '/post-sitemap.xml' },
  { key: 'category', path: '/category-sitemap.xml' },
  { key: 'tag', path: '/tag-sitemap.xml' },
  { key: 'author', path: '/author-sitemap.xml' },
  { key: 'newsletter', path: '/newsletter-sitemap.xml' },
] as const;

export type SitemapSectionKey = (typeof SITEMAP_CHILDREN)[number]['key'];

export type SitemapUrlEntry = {
  loc: string;
  lastmod?: string;
};

export type SitemapSection = {
  key: SitemapSectionKey;
  path: string;
  url: string;
  enabled: boolean;
  entries: SitemapUrlEntry[];
  lastmod?: string;
};

type SitemapSectionDefinition = {
  path: string;
  isEnabled: (settings: SeoSettings) => boolean;
  loadEntries: (settings: SeoSettings, baseUrl: string) => Promise<SitemapUrlEntry[]>;
};

function normalizeLastModified(value?: string | null) {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date.toISOString();
}

function uniqueEntries(entries: SitemapUrlEntry[]): SitemapUrlEntry[] {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    if (seen.has(entry.loc)) {
      return false;
    }
    seen.add(entry.loc);
    return true;
  });
}

function getLatestLastModified(entries: SitemapUrlEntry[]) {
  return entries.reduce<string | undefined>((latest, entry) => {
    if (!entry.lastmod) {
      return latest;
    }
    if (!latest) {
      return entry.lastmod;
    }
    return entry.lastmod > latest ? entry.lastmod : latest;
  }, undefined);
}

function normalizeCustomSitemapXml(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function xmlEscape(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildPageRoutes(settings: SeoSettings) {
  const routes = [...CORE_STATIC_ROUTES];

  if (!settings.noindexBlogArchivePages) {
    routes.push('/blog');
  }
  if (!settings.noindexAuthorPages) {
    routes.push('/author');
  }
  if (!settings.noindexCategoryPages) {
    routes.push('/category');
  }
  if (!settings.noindexTagPages) {
    routes.push('/tag');
  }
  if (!settings.noindexStaticPages) {
    routes.push(...STATIC_SITE_ROUTES);
  }

  return Array.from(new Set(routes));
}

async function fetchAllSitemapItems<T>(params: {
  pageSize: number;
  fetchPage: (args: { skip: number; take: number }) => Promise<{ items: T[]; total: number }>;
}) {
  const { pageSize, fetchPage } = params;
  const items: T[] = [];
  let skip = 0;
  let total = Number.POSITIVE_INFINITY;

  while (skip < total && items.length < MAX_SITEMAP_FETCH_SIZE) {
    const page = await fetchPage({ skip, take: pageSize });
    const pageItems = page.items ?? [];
    total = Number.isFinite(page.total) ? page.total : pageItems.length;

    if (pageItems.length === 0) {
      break;
    }

    items.push(...pageItems);
    skip += pageItems.length;

    if (pageItems.length < pageSize) {
      break;
    }
  }

  return items.slice(0, MAX_SITEMAP_FETCH_SIZE);
}

const SITEMAP_SECTION_DEFINITIONS: Record<SitemapSectionKey, SitemapSectionDefinition> = {
  page: {
    path: '/page-sitemap.xml',
    isEnabled: (settings) => settings.sitemapIncludePages,
    loadEntries: async (settings, baseUrl) =>
      buildPageRoutes(settings).map((route) => ({
        loc: absoluteUrl(route, baseUrl),
      })),
  },
  prompt: {
    path: '/prompt-sitemap.xml',
    isEnabled: (settings) => settings.sitemapIncludePrompts,
    loadEntries: async (_settings, baseUrl) => {
      const prompts = await fetchAllSitemapItems({
        pageSize: SITEMAP_PAGE_SIZE,
        fetchPage: ({ skip, take }) =>
          getPromptList({ skip, take, sort: 'latest' }, { noStore: true }),
      });
      return prompts
        .filter((prompt) => !prompt.seoNoIndex)
        .map((prompt) => {
          const categorySlug =
            prompt.primaryCategory?.slug || prompt.categories[0]?.slug || 'uncategorized';
          return {
            loc: absoluteUrl(
              `/${encodeURIComponent(categorySlug)}/${encodeURIComponent(prompt.slug)}`,
              baseUrl,
            ),
            lastmod: normalizeLastModified(prompt.updatedAt || prompt.publishedAt),
          };
        });
    },
  },
  post: {
    path: '/post-sitemap.xml',
    isEnabled: (settings) => settings.sitemapIncludePosts && !settings.noindexBlogPostPages,
    loadEntries: async (_settings, baseUrl) => {
      const posts = await fetchAllSitemapItems({
        pageSize: SITEMAP_PAGE_SIZE,
        fetchPage: ({ skip, take }) =>
          getPostList(
            {
              skip,
              take,
              sort: 'latest',
              includeContent: 0,
            },
            { noStore: true },
          ),
      });
      return posts
        .filter((post) => post.postType !== 'NEWSLETTER' && !post.seoNoIndex)
        .map((post) => ({
          loc: absoluteUrl(`/blog/${encodeURIComponent(post.slug)}`, baseUrl),
          lastmod: normalizeLastModified(post.updatedAt || post.publishedAt),
        }));
    },
  },
  category: {
    path: '/category-sitemap.xml',
    isEnabled: (settings) => settings.sitemapIncludeCategories && !settings.noindexCategoryPages,
    loadEntries: async (_settings, baseUrl) => {
      const categories = await fetchAllSitemapItems({
        pageSize: SITEMAP_PAGE_SIZE,
        fetchPage: ({ skip, take }) =>
          getCategoryList({ skip, take, sort: 'popular' }, { noStore: true }),
      });
      return categories.map((category) => ({
        loc: absoluteUrl(`/category/${encodeURIComponent(category.slug)}`, baseUrl),
      }));
    },
  },
  tag: {
    path: '/tag-sitemap.xml',
    isEnabled: (settings) => settings.sitemapIncludeTags && !settings.noindexTagPages,
    loadEntries: async (_settings, baseUrl) => {
      const tags = await fetchAllSitemapItems({
        pageSize: SITEMAP_PAGE_SIZE,
        fetchPage: ({ skip, take }) =>
          getTagList({ skip, take, sort: 'popular' }, { noStore: true }),
      });
      return tags.map((tag) => ({
        loc: absoluteUrl(`/tag/${encodeURIComponent(tag.slug)}`, baseUrl),
      }));
    },
  },
  author: {
    path: '/author-sitemap.xml',
    isEnabled: (settings) => settings.sitemapIncludeAuthors && !settings.noindexAuthorPages,
    loadEntries: async (_settings, baseUrl) => {
      const authors = await fetchAllSitemapItems({
        pageSize: SITEMAP_AUTHOR_PAGE_SIZE,
        fetchPage: ({ skip, take }) =>
          getAuthorList({ skip, take, sort: 'popular' }, { noStore: true }),
      });
      return authors.map((author) => ({
        loc: absoluteUrl(`/u/${encodeURIComponent(author.handle || author.slug)}`, baseUrl),
      }));
    },
  },
  newsletter: {
    path: '/newsletter-sitemap.xml',
    isEnabled: (settings) => settings.sitemapIncludeNewsletter,
    loadEntries: async (_settings, baseUrl) => {
      const posts = await fetchAllSitemapItems({
        pageSize: SITEMAP_PAGE_SIZE,
        fetchPage: ({ skip, take }) =>
          getPostList(
            {
              skip,
              take,
              sort: 'latest',
              includeContent: 0,
            },
            { noStore: true },
          ),
      });
      return posts
        .filter((post) => post.postType === 'NEWSLETTER' && !post.seoNoIndex)
        .map((post) => ({
          loc: absoluteUrl(`/newsletter/${encodeURIComponent(post.slug)}`, baseUrl),
          lastmod: normalizeLastModified(post.updatedAt || post.publishedAt),
        }));
    },
  },
};

async function loadSection(
  key: SitemapSectionKey,
  settings: SeoSettings,
  baseUrl: string,
): Promise<SitemapSection> {
  const definition = SITEMAP_SECTION_DEFINITIONS[key];
  const enabled = definition.isEnabled(settings);
  const sectionUrl = absoluteUrl(definition.path, baseUrl);

  if (!enabled) {
    return {
      key,
      path: definition.path,
      url: sectionUrl,
      enabled: false,
      entries: [],
    };
  }

  try {
    const entries = uniqueEntries(await definition.loadEntries(settings, baseUrl));
    return {
      key,
      path: definition.path,
      url: sectionUrl,
      enabled: true,
      entries,
      lastmod: getLatestLastModified(entries),
    };
  } catch (error) {
    console.warn(`[sitemap] Failed to build ${key}-sitemap.xml`, error);
    return {
      key,
      path: definition.path,
      url: sectionUrl,
      enabled: true,
      entries: [],
    };
  }
}

async function loadAllSections(settings?: SeoSettings) {
  const resolvedSettings = settings ?? (await getSeoSettingsFresh());
  const baseUrl = getBaseUrl(resolvedSettings);
  const keys = SITEMAP_CHILDREN.map((child) => child.key);
  const sections = await Promise.all(
    keys.map((key) => loadSection(key, resolvedSettings, baseUrl)),
  );
  return { baseUrl, sections, settings: resolvedSettings };
}

export async function getSitemapSection(key: SitemapSectionKey): Promise<SitemapSection> {
  const settings = await getSeoSettingsFresh();
  const baseUrl = getBaseUrl(settings);
  return loadSection(key, settings, baseUrl);
}

export async function getSitemapIndexSections(settings?: SeoSettings): Promise<SitemapSection[]> {
  const { sections } = await loadAllSections(settings);
  return sections.filter((section) => section.enabled && section.entries.length > 0);
}

export function buildSitemapIndexXml(
  settings: Pick<SeoSettings, 'sitemapCustomXml'> | null | undefined,
  sections: SitemapSection[],
) {
  const customXml = normalizeCustomSitemapXml(settings?.sitemapCustomXml);
  return customXml ?? renderSitemapIndex(sections);
}

export async function getSitemapIndexXml(): Promise<string> {
  const settings = await getSeoSettingsFresh();
  const customXml = normalizeCustomSitemapXml(settings.sitemapCustomXml);
  if (customXml) {
    return customXml;
  }

  const sections = await getSitemapIndexSections(settings);
  return renderSitemapIndex(sections);
}

export function renderSitemapUrlSet(entries: SitemapUrlEntry[]) {
  const rows = entries
    .map(
      (entry) =>
        `<url><loc>${xmlEscape(entry.loc)}</loc>${
          entry.lastmod ? `<lastmod>${xmlEscape(entry.lastmod)}</lastmod>` : ''
        }</url>`,
    )
    .join('');

  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${rows}</urlset>`
  );
}

export function renderSitemapIndex(sections: SitemapSection[]) {
  const rows = sections
    .map(
      (section) =>
        `<sitemap><loc>${xmlEscape(section.url)}</loc>${
          section.lastmod ? `<lastmod>${xmlEscape(section.lastmod)}</lastmod>` : ''
        }</sitemap>`,
    )
    .join('');

  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${rows}</sitemapindex>`
  );
}

export function createXmlResponse(xml: string) {
  return new Response(xml, {
    headers: {
      'Content-Type': XML_CONTENT_TYPE,
      'Cache-Control': XML_CACHE_CONTROL,
    },
  });
}
