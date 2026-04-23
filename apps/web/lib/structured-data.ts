import type { PublicPost, PublicPrompt } from './public-content';

export type SchemaFamily =
  | 'organization'
  | 'website'
  | 'webpage'
  | 'breadcrumb'
  | 'faq'
  | 'collection'
  | 'article'
  | 'profile'
  | 'prompt'
  | 'search';

export type StructuredSchemaEntry = {
  family: SchemaFamily;
  schema: Record<string, unknown>;
};

type BreadcrumbInput = {
  name: string;
  item: string;
};

type WebPageSchemaInput = {
  url: string;
  name: string;
  description?: string | null;
  keywords?: string[] | string | null;
  idSuffix?: string;
};

type FaqItemInput = {
  question: string;
  answer: string;
};

type CollectionPageSchemaInput = {
  url: string;
  name: string;
  description?: string | null;
  idSuffix?: string;
};

type ItemListSchemaInput = {
  url?: string | null;
  name: string;
  items: Array<{
    name: string;
    url: string;
    image?: string | null;
    dateCreated?: string | null;
  }>;
  idSuffix?: string;
};

type ArticleSchemaInput = {
  url: string;
  title: string;
  description?: string | null;
  publishedAt?: string | null;
  updatedAt?: string | null;
  authorName?: string | null;
  image?: string | null;
  idSuffix?: string;
};

type ProfileSchemaInput = {
  profileUrl: string;
  personName: string;
  description?: string | null;
  image?: string | null;
  jobTitle?: string | null;
};

type PromptSchemaInput = {
  url: string;
  title: string;
  description?: string | null;
  publishedAt?: string | null;
  updatedAt?: string | null;
  authorName?: string | null;
  categoryName?: string | null;
  promptType?: string | null;
  visibility?: string | null;
  tags?: string[];
  image?: string | null;
  idSuffix?: string;
};

type SearchSchemaInput = {
  url: string;
  query: string;
  totalResults?: number;
  idSuffix?: string;
};

function normalizeText(value?: string | null) {
  if (typeof value !== 'string') return null;
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeDate(value?: string | null) {
  if (typeof value !== 'string' || value.trim().length === 0) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function normalizeKeywordList(value?: string[] | string | null) {
  if (Array.isArray(value)) {
    const normalized = value
      .map((item) => normalizeText(item))
      .filter((item): item is string => Boolean(item));
    return normalized.length > 0 ? normalized : undefined;
  }
  const single = normalizeText(value ?? null);
  return single ? [single] : undefined;
}

function buildSchemaId(url: string, suffix = 'schema') {
  const safeUrl = url.trim();
  return `${safeUrl}#${suffix}`;
}

function pruneSchemaValue(value: unknown): unknown {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value === 'string') {
    const normalized = normalizeText(value);
    return normalized ?? undefined;
  }
  if (Array.isArray(value)) {
    const normalized = value
      .map((entry) => pruneSchemaValue(entry))
      .filter((entry) => entry !== undefined);
    return normalized.length > 0 ? normalized : undefined;
  }
  if (typeof value === 'object') {
    const next: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      const normalized = pruneSchemaValue(entry);
      if (normalized !== undefined) {
        next[key] = normalized;
      }
    }
    return Object.keys(next).length > 0 ? next : undefined;
  }
  return value;
}

export function sanitizeSchema<T extends Record<string, unknown>>(schema: T): T | null {
  const normalized = pruneSchemaValue(schema);
  if (!normalized || typeof normalized !== 'object' || Array.isArray(normalized)) {
    return null;
  }
  return normalized as T;
}

export function buildBreadcrumbSchema(items: BreadcrumbInput[], pageUrl?: string) {
  const cleanedItems = items
    .map((item, index) => {
      const name = normalizeText(item.name);
      const target = normalizeText(item.item);
      if (!name || !target) return null;
      return {
        '@type': 'ListItem',
        position: index + 1,
        name,
        item: target,
      };
    })
    .filter((item): item is { '@type': 'ListItem'; position: number; name: string; item: string } =>
      Boolean(item),
    );

  if (cleanedItems.length < 2) {
    return null;
  }

  return sanitizeSchema({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    '@id': pageUrl ? buildSchemaId(pageUrl, 'breadcrumb') : undefined,
    itemListElement: cleanedItems,
  });
}

export function buildWebPageSchema(input: WebPageSchemaInput) {
  return sanitizeSchema({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': buildSchemaId(input.url, input.idSuffix || 'webpage'),
    url: input.url,
    name: input.name,
    description: input.description,
    keywords: normalizeKeywordList(input.keywords),
  });
}

export function buildFaqSchema(url: string, items: FaqItemInput[], idSuffix = 'faq') {
  const mainEntity = items
    .map((item) => {
      const question = normalizeText(item.question);
      const answer = normalizeText(item.answer);
      if (!question || !answer) return null;
      return {
        '@type': 'Question',
        name: question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: answer,
        },
      };
    })
    .filter(
      (
        item,
      ): item is {
        '@type': 'Question';
        name: string;
        acceptedAnswer: { '@type': 'Answer'; text: string };
      } => Boolean(item),
    );

  if (mainEntity.length === 0) {
    return null;
  }

  return sanitizeSchema({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': buildSchemaId(url, idSuffix),
    url,
    mainEntity,
  });
}

export function buildCollectionPageSchema(input: CollectionPageSchemaInput) {
  return sanitizeSchema({
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': buildSchemaId(input.url, input.idSuffix || 'collection'),
    url: input.url,
    name: input.name,
    description: input.description,
  });
}

export function buildItemListSchema(input: ItemListSchemaInput) {
  const listItems = input.items
    .map((item, index) => {
      const name = normalizeText(item.name);
      const url = normalizeText(item.url);
      if (!name || !url) return null;
      return {
        '@type': 'ListItem',
        position: index + 1,
        name,
        url,
        item: {
          '@type': 'Thing',
          name,
          url,
          image: normalizeText(item.image),
          dateCreated: normalizeDate(item.dateCreated),
        },
      };
    })
    .filter((item) => Boolean(item));

  if (listItems.length === 0) {
    return null;
  }

  return sanitizeSchema({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    '@id': input.url ? buildSchemaId(input.url, input.idSuffix || 'items') : undefined,
    url: input.url,
    name: input.name,
    numberOfItems: listItems.length,
    itemListElement: listItems,
  });
}

export function buildArticleSchema(input: ArticleSchemaInput) {
  return sanitizeSchema({
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': buildSchemaId(input.url, input.idSuffix || 'article'),
    mainEntityOfPage: input.url,
    headline: input.title,
    description: input.description,
    datePublished: normalizeDate(input.publishedAt),
    dateModified: normalizeDate(input.updatedAt || input.publishedAt),
    author: input.authorName
      ? {
          '@type': 'Person',
          name: input.authorName,
        }
      : undefined,
    image: normalizeText(input.image) ? [normalizeText(input.image)] : undefined,
  });
}

export function buildProfileSchemas(input: ProfileSchemaInput): StructuredSchemaEntry[] {
  const personSchema = sanitizeSchema({
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': buildSchemaId(input.profileUrl, 'person'),
    name: input.personName,
    url: input.profileUrl,
    description: input.description,
    image: input.image,
    jobTitle: input.jobTitle,
  });

  const profilePageSchema = sanitizeSchema({
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    '@id': buildSchemaId(input.profileUrl, 'profile'),
    url: input.profileUrl,
    mainEntity: personSchema
      ? {
          '@type': 'Person',
          '@id': buildSchemaId(input.profileUrl, 'person'),
          name: input.personName,
        }
      : undefined,
  });

  const entries: StructuredSchemaEntry[] = [];
  if (personSchema) {
    entries.push({ family: 'profile', schema: personSchema });
  }
  if (profilePageSchema) {
    entries.push({ family: 'profile', schema: profilePageSchema });
  }
  return entries;
}

export function buildPromptSchema(input: PromptSchemaInput) {
  const keywords = [input.categoryName, input.promptType, input.visibility, ...(input.tags ?? [])]
    .map((value) => normalizeText(value ?? null))
    .filter((value): value is string => Boolean(value));

  const image = normalizeText(input.image) ? [normalizeText(input.image)] : undefined;

  return sanitizeSchema({
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    '@id': buildSchemaId(input.url, input.idSuffix || 'prompt'),
    url: input.url,
    name: input.title,
    headline: input.title,
    description: input.description,
    datePublished: normalizeDate(input.publishedAt),
    dateModified: normalizeDate(input.updatedAt || input.publishedAt),
    genre: 'Prompt',
    keywords: keywords.length > 0 ? keywords : undefined,
    creator: input.authorName
      ? {
          '@type': 'Person',
          name: input.authorName,
        }
      : undefined,
    image,
  });
}

export function buildSearchResultsSchema(input: SearchSchemaInput) {
  return sanitizeSchema({
    '@context': 'https://schema.org',
    '@type': 'SearchResultsPage',
    '@id': buildSchemaId(input.url, input.idSuffix || 'search'),
    url: input.url,
    name: `Search results for "${input.query}"`,
    description: `Search results for ${input.query}`,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${new URL('/search?q={search_term_string}', input.url).toString()}`,
      'query-input': 'required name=search_term_string',
    },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems:
        typeof input.totalResults === 'number' && input.totalResults >= 0
          ? input.totalResults
          : undefined,
    },
  });
}

type PromptPathInput = {
  slug: string;
  primaryCategory?: { slug?: string | null } | null;
  categories?: Array<{ slug?: string | null }> | null;
};

export function getPromptPath(prompt: PromptPathInput) {
  const categorySlug = prompt.primaryCategory?.slug || prompt.categories?.[0]?.slug;
  return categorySlug ? `/${categorySlug}/${prompt.slug}` : `/prompt/${prompt.slug}`;
}

export function getPostPath(
  post: Pick<PublicPost, 'slug'>,
  section: 'blog' | 'newsletter' = 'blog',
) {
  return `/${section}/${post.slug}`;
}

export function buildPromptItemListEntries(prompts: PublicPrompt[], baseUrl: string) {
  return prompts.map((prompt) => ({
    name: prompt.title,
    url: new URL(getPromptPath(prompt), baseUrl).toString(),
    image: prompt.image,
    dateCreated: prompt.publishedAt || prompt.updatedAt,
  }));
}

export function buildPostItemListEntries(
  posts: PublicPost[],
  baseUrl: string,
  section: 'blog' | 'newsletter' = 'blog',
) {
  return posts.map((post) => ({
    name: post.title,
    url: new URL(getPostPath(post, section), baseUrl).toString(),
    image: post.image,
    dateCreated: post.publishedAt || post.updatedAt,
  }));
}
