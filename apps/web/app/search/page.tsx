import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { PostCardUI } from '../components/post-card';
import { PromptCardServer } from '../components/prompt-card-server';
import { SeoSchemaScripts } from '../components/seo-schema-script';
import { Skeleton } from '../components/ui/skeleton';
import { estimateReadTime, searchPublicContent } from '../../lib/public-content';
import { buildMetadata, getNormalizedBaseUrl, getSeoSettings } from '../../lib/seo';
import {
  buildItemListSchema,
  buildSearchResultsSchema,
  getPromptPath,
} from '../../lib/structured-data';

type PageProps = {
  searchParams?: Promise<{
    q?: string;
  }>;
};

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const resolvedSearchParams = await searchParams;
  const query = resolvedSearchParams?.q?.trim() ?? '';
  const settings = await getSeoSettings();

  return buildMetadata({
    title: query ? `Search: ${query}` : 'Search',
    description: 'Search prompts, posts, categories, tags, and authors.',
    path: query ? `/search?q=${encodeURIComponent(query)}` : '/search',
    noIndex: settings.noindexSearchPages,
  });
}

function SearchResultsFallback({ query }: { query: string }) {
  if (!query) return null;

  return (
    <div className="space-y-12">
      <section>
        <h2 className="text-[1.4rem] font-medium text-[#0f1116]">Prompts</h2>
        <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <article key={`search-prompt-skeleton-${index}`} className="space-y-3">
              <Skeleton className="aspect-[4/3] w-full rounded-[24px]" />
              <Skeleton className="h-5 w-full rounded-full" />
              <Skeleton className="h-5 w-[82%] rounded-full" />
            </article>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-[1.4rem] font-medium text-[#0f1116]">Posts</h2>
        <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <article key={`search-post-skeleton-${index}`} className="space-y-3">
              <Skeleton className="aspect-[16/9] w-full rounded-[20px]" />
              <Skeleton className="h-6 w-full rounded-full" />
              <Skeleton className="h-6 w-[82%] rounded-full" />
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

async function SearchResultsSection({
  query,
  baseUrl,
  noIndex,
}: {
  query: string;
  baseUrl: string;
  noIndex: boolean;
}) {
  if (!query) {
    return null;
  }

  const results = await searchPublicContent(query, 8);
  const pageUrl = `${baseUrl}/search?q=${encodeURIComponent(query)}`;
  const totalResults =
    results.prompts.length +
    results.posts.length +
    results.categories.length +
    results.tags.length +
    results.authors.length;
  const resultItems = [
    ...results.prompts.map((prompt) => ({
      name: prompt.title,
      url: `${baseUrl}${getPromptPath(prompt)}`,
      image: prompt.image,
    })),
    ...results.posts.map((post) => ({
      name: post.title,
      url: `${baseUrl}/blog/${post.slug}`,
      image: post.image,
    })),
    ...results.categories.map((category) => ({
      name: category.name,
      url: `${baseUrl}/category/${category.slug}`,
    })),
    ...results.tags.map((tag) => ({
      name: tag.name,
      url: `${baseUrl}/tag/${tag.slug}`,
    })),
    ...results.authors.map((author) => ({
      name: author.name,
      url: `${baseUrl}/u/${author.slug}`,
      image: author.avatarUrl,
    })),
  ];
  const schemaItems = [
    {
      family: 'search' as const,
      schema: buildSearchResultsSchema({
        url: pageUrl,
        query,
        totalResults,
      }),
    },
    {
      family: 'collection' as const,
      schema: buildItemListSchema({
        url: pageUrl,
        name: `Search results for ${query}`,
        idSuffix: 'search-results',
        items: resultItems,
      }),
    },
  ].filter((entry) => Boolean(entry.schema));

  return (
    <>
      <SeoSchemaScripts items={schemaItems} noIndex={noIndex} />
      <div className="space-y-12">
        {results.prompts.length > 0 ? (
          <section>
            <h2 className="text-[1.4rem] font-medium text-[#0f1116]">Prompts</h2>
            <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {results.prompts.map((prompt) => (
                <PromptCardServer key={prompt.id} prompt={prompt} />
              ))}
            </div>
          </section>
        ) : null}

        {results.posts.length > 0 ? (
          <section>
            <h2 className="text-[1.4rem] font-medium text-[#0f1116]">Posts</h2>
            <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {results.posts.map((post) => (
                <PostCardUI
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  imageUrl={post.image}
                  readTime={estimateReadTime(post.excerpt || post.content)}
                  title={post.title}
                />
              ))}
            </div>
          </section>
        ) : null}

        {results.categories.length > 0 ? (
          <section>
            <h2 className="text-[1.4rem] font-medium text-[#0f1116]">Categories</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {results.categories.map((category) => (
                <Link
                  key={category.id}
                  href={`/category/${category.slug}`}
                  className="rounded-full border border-[#e1e5ee] px-4 py-2 text-[0.9rem] text-[#111111]"
                >
                  {category.name}
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {results.tags.length > 0 ? (
          <section>
            <h2 className="text-[1.4rem] font-medium text-[#0f1116]">Tags</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {results.tags.map((tag) => (
                <Link
                  key={tag.id}
                  href={`/tag/${tag.slug}`}
                  className="rounded-full bg-[#f1f3f8] px-4 py-2 text-[0.9rem] text-[#2f3440]"
                >
                  #{tag.name}
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {results.authors.length > 0 ? (
          <section>
            <h2 className="text-[1.4rem] font-medium text-[#0f1116]">Authors</h2>
            <div className="mt-4 flex flex-wrap gap-3">
              {results.authors.map((author) => (
                <Link
                  key={author.id}
                  href={`/u/${author.slug}`}
                  className="inline-flex items-center gap-2 rounded-full border border-[#e1e5ee] px-4 py-2 text-[0.9rem] text-[#111111]"
                >
                  <span>{author.name}</span>
                  {author.promptCount !== undefined ? (
                    <span className="text-[0.8rem] text-[#6b7280]">
                      {author.promptCount} prompts
                    </span>
                  ) : null}
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </>
  );
}

export default async function SearchPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const query = resolvedSearchParams?.q?.trim() ?? '';
  const settings = await getSeoSettings();
  const baseUrl = getNormalizedBaseUrl(settings);
  const shouldNoIndex = settings.noindexSearchPages;

  return (
    <main className="page-shell bg-white">
      <div className="page-container-reading space-y-10">
        <div className="space-y-4">
          <h1 className="section-heading-medium text-[2.4rem] leading-[1.05] tracking-[-0.04em] text-[#111118] sm:text-[3rem]">
            Search
          </h1>
          <form className="flex w-full flex-col gap-3 sm:flex-row">
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Search prompts, posts, tags..."
              className="w-full rounded-[14px] border border-[#e1e5ee] bg-white px-4 py-3 text-[1rem] text-[#111111] outline-none focus:border-[#111111]"
            />
            <button
              type="submit"
              className="rounded-[14px] bg-[#111111] px-6 py-3 text-[0.95rem] font-medium text-white"
            >
              Search
            </button>
          </form>
          {query ? (
            <p className="text-[0.95rem] text-[#6b7280]">
              Showing results for <span className="font-medium text-[#111111]">{query}</span>
            </p>
          ) : (
            <p className="text-[0.95rem] text-[#6b7280]">
              Start typing to search the live catalog.
            </p>
          )}
        </div>

        <Suspense fallback={<SearchResultsFallback query={query} />}>
          <SearchResultsSection query={query} baseUrl={baseUrl} noIndex={shouldNoIndex} />
        </Suspense>
      </div>
    </main>
  );
}
