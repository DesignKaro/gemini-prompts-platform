import Link from 'next/link';
import { Suspense } from 'react';
import { PostCardUI } from '../components/post-card';
import { SeoSchemaScripts } from '../components/seo-schema-script';
import { Skeleton } from '../components/ui/skeleton';
import { estimateReadTime, getPostList } from '../../lib/public-content';
import { buildPaginatedMetadata, getNormalizedBaseUrl, getSeoSettings } from '../../lib/seo';
import {
  buildBreadcrumbSchema,
  buildCollectionPageSchema,
  buildItemListSchema,
  buildPostItemListEntries,
  buildWebPageSchema,
} from '../../lib/structured-data';

const PAGE_SIZE = 12;

type PageProps = {
  searchParams?: Promise<{
    page?: string;
  }>;
};

export async function generateMetadata({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const page = Math.max(1, Number.parseInt(resolvedSearchParams?.page ?? '1', 10) || 1);
  const settings = await getSeoSettings();

  return buildPaginatedMetadata({
    title: 'Blog',
    description:
      'Read prompt engineering guides, AI workflow articles, and creator strategy posts.',
    basePath: '/blog',
    page,
    noIndex: settings.noindexBlogArchivePages,
  });
}

function BlogArchiveSectionFallback() {
  return (
    <>
      <div className="mt-6">
        <Skeleton className="h-10 w-40 rounded-full" />
      </div>

      <div className="site-section-sub mt-8 grid gap-6 sm:mt-9 sm:grid-cols-2 lg:mt-10 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <article key={`blog-archive-skeleton-${index}`} className="space-y-3">
            <Skeleton className="aspect-[16/9] w-full rounded-[20px]" />
            <Skeleton className="h-6 w-full rounded-full" />
            <Skeleton className="h-6 w-[82%] rounded-full" />
            <Skeleton className="h-4 w-28 rounded-full" />
          </article>
        ))}
      </div>
    </>
  );
}

async function BlogArchiveSection({
  page,
  baseUrl,
  noIndex,
}: {
  page: number;
  baseUrl: string;
  noIndex: boolean;
}) {
  const skip = (page - 1) * PAGE_SIZE;
  const response = await getPostList({
    take: PAGE_SIZE,
    skip,
    sort: 'latest',
    includeContent: 0,
  });

  const totalPages = Math.max(1, Math.ceil(response.total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagePath = safePage > 1 ? `/blog?page=${safePage}` : '/blog';
  const pageUrl = `${baseUrl}${pagePath}`;
  const schemaItems = [
    {
      family: 'webpage' as const,
      schema: buildWebPageSchema({
        url: pageUrl,
        name: 'Blog',
        description:
          'Read prompt engineering guides, AI workflow articles, and creator strategy posts.',
      }),
    },
    {
      family: 'breadcrumb' as const,
      schema: buildBreadcrumbSchema(
        [
          { name: 'Home', item: `${baseUrl}/` },
          { name: 'Blog', item: `${baseUrl}/blog` },
        ],
        pageUrl,
      ),
    },
    {
      family: 'collection' as const,
      schema: buildCollectionPageSchema({
        url: pageUrl,
        name: 'Blog posts',
        description: 'Latest blog posts on Gemini Prompts.',
      }),
    },
    {
      family: 'collection' as const,
      schema: buildItemListSchema({
        url: pageUrl,
        name: 'Blog post list',
        idSuffix: 'blog-posts',
        items: buildPostItemListEntries(response.items, baseUrl, 'blog'),
      }),
    },
  ].filter((entry) => Boolean(entry.schema));

  return (
    <>
      <SeoSchemaScripts items={schemaItems} noIndex={noIndex} />
      <div className="mt-6 rounded-full border border-[#e1e5ee] bg-[#f8fafc] px-4 py-2 text-[0.95rem] text-[#4b525e] w-fit">
        {response.total} total posts
      </div>

      <div className="site-section-sub mt-8 grid gap-6 sm:mt-9 sm:grid-cols-2 lg:mt-10 lg:grid-cols-4">
        {response.items.length > 0 ? (
          response.items.map((post) => (
            <PostCardUI
              key={post.id}
              href={`/blog/${post.slug}`}
              imageUrl={post.image}
              readTime={estimateReadTime(post.excerpt || post.content)}
              title={post.title}
              titleTag="h2"
            />
          ))
        ) : (
          <div className="col-span-full rounded-[22px] border border-dashed border-[#d8dee8] px-6 py-7 text-center text-[0.96rem] text-[#677386]">
            No posts available yet.
          </div>
        )}
      </div>

      {totalPages > 1 ? (
        <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={`/blog?page=${Math.max(1, safePage - 1)}`}
            aria-disabled={safePage === 1}
            className={`rounded-full border px-4 py-2 text-[0.95rem] ${
              safePage === 1
                ? 'cursor-not-allowed border-[#e1e5ee] text-[#c0c6d1]'
                : 'border-[#d8dce2] text-[#101010] hover:border-[#101010]'
            }`}
          >
            Previous
          </Link>

          {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
            <Link
              key={`page-${pageNumber}`}
              href={`/blog?page=${pageNumber}`}
              className={`h-10 w-10 rounded-full border text-center text-[0.95rem] leading-[2.35rem] ${
                pageNumber === safePage
                  ? 'border-[#111111] bg-[#111111] text-white'
                  : 'border-[#d8dce2] text-[#101010] hover:border-[#101010]'
              }`}
            >
              {pageNumber}
            </Link>
          ))}

          <Link
            href={`/blog?page=${Math.min(totalPages, safePage + 1)}`}
            aria-disabled={safePage === totalPages}
            className={`rounded-full border px-4 py-2 text-[0.95rem] ${
              safePage === totalPages
                ? 'cursor-not-allowed border-[#e1e5ee] text-[#c0c6d1]'
                : 'border-[#d8dce2] text-[#101010] hover:border-[#101010]'
            }`}
          >
            Next
          </Link>
        </div>
      ) : null}
    </>
  );
}

export default async function BlogArchivePage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const page = Math.max(1, Number.parseInt(resolvedSearchParams?.page ?? '1', 10) || 1);
  const seoSettings = await getSeoSettings();
  const baseUrl = getNormalizedBaseUrl(seoSettings);
  const shouldNoIndex =
    seoSettings.noindexBlogArchivePages || (page > 1 && seoSettings.noindexPaginatedArchives);

  return (
    <main className="page-shell bg-white">
      <div className="page-container">
        <div>
          <div>
            <nav aria-label="Breadcrumb" className="text-[0.9rem] text-[#8b8f99]">
              <ol className="flex flex-wrap items-center gap-2">
                <li>
                  <Link href="/" className="transition-colors hover:text-[#101010]">
                    Home
                  </Link>
                </li>
                <li className="text-[#c0c6d1]">/</li>
                <li className="font-medium text-[#101010]">Blog</li>
              </ol>
            </nav>

            <h1 className="section-heading-medium mt-4 text-[2.2rem] leading-[1.05] tracking-[-0.04em] text-[#111118] sm:text-[2.8rem] lg:text-[3.1rem]">
              Explore blog posts
            </h1>
            <p className="mt-4 max-w-[680px] text-[1.05rem] leading-[1.7] text-[#5f6773]">
              A live archive of strategy, workflows, and prompt tooling — synced from the dashboard.
            </p>
          </div>
        </div>

        <Suspense fallback={<BlogArchiveSectionFallback />}>
          <BlogArchiveSection page={page} baseUrl={baseUrl} noIndex={shouldNoIndex} />
        </Suspense>
      </div>
    </main>
  );
}
