import Link from 'next/link';
import { Suspense } from 'react';
import { SeoSchemaScripts } from '../components/seo-schema-script';
import { Skeleton } from '../components/ui/skeleton';
import { getTagList } from '../../lib/public-content';
import { buildPaginatedMetadata, getNormalizedBaseUrl, getSeoSettings } from '../../lib/seo';
import {
  buildBreadcrumbSchema,
  buildCollectionPageSchema,
  buildItemListSchema,
  buildWebPageSchema,
} from '../../lib/structured-data';

const PAGE_SIZE = 48;

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
    title: 'Tags',
    description: 'Explore tags to find related prompts, posts, formats, and workflow themes.',
    basePath: '/tag',
    page,
    noIndex: settings.noindexTagPages,
  });
}

function TagSearchPanel() {
  return (
    <div className="border-t border-[#e6e8ee] px-5 py-5 sm:px-7 sm:py-6">
      <h2 className="text-[1.35rem] leading-none text-[#11141a] sm:text-[1.42rem]">Search tags</h2>
      <label className="mt-4 flex items-center gap-2 rounded-[12px] border border-[#e0e3e9] bg-[#fcfdff] px-4 py-3">
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 text-[#9aa1ae]">
          <circle cx="11" cy="11" r="6.7" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path
            d="m16 16 4 4"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.8"
          />
        </svg>
        <input
          type="search"
          className="w-full border-0 bg-transparent p-0 text-[1rem] text-[#6f7786] outline-none placeholder:text-[#9aa1ae] sm:text-[1.05rem]"
          placeholder="Innovation, Strategy, Methodology"
        />
      </label>
      <p className="mt-3 text-[0.85rem] text-[#9aa1ae] sm:text-[0.9rem]">
        Tip: pick a tag to explore related prompts and blog posts.
      </p>
    </div>
  );
}

function TagsArchiveSectionFallback() {
  return (
    <>
      <div className="mt-6">
        <Skeleton className="h-10 w-36 rounded-full" />
      </div>

      <div className="site-section-sub mt-3 overflow-hidden rounded-[22px] border border-[#e1e4ea] bg-white">
        <div className="px-5 py-5 sm:px-7 sm:py-6">
          <div className="flex flex-wrap gap-2.5">
            {Array.from({ length: 16 }).map((_, index) => (
              <Skeleton
                key={`tag-archive-skeleton-${index}`}
                className="h-[42px] w-[120px] rounded-full bg-[#f0f2f4]"
              />
            ))}
          </div>
        </div>
        <TagSearchPanel />
      </div>
    </>
  );
}

async function TagsArchiveSection({
  page,
  baseUrl,
  noIndex,
}: {
  page: number;
  baseUrl: string;
  noIndex: boolean;
}) {
  const skip = (page - 1) * PAGE_SIZE;
  const tagsResponse = await getTagList({ take: PAGE_SIZE, skip, sort: 'popular' });
  const totalPages = Math.max(1, Math.ceil(tagsResponse.total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagePath = safePage > 1 ? `/tag?page=${safePage}` : '/tag';
  const pageUrl = `${baseUrl}${pagePath}`;
  const schemaItems = [
    {
      family: 'webpage' as const,
      schema: buildWebPageSchema({
        url: pageUrl,
        name: 'Tags',
        description: 'Explore tags to find related prompts, posts, formats, and workflow themes.',
      }),
    },
    {
      family: 'breadcrumb' as const,
      schema: buildBreadcrumbSchema(
        [
          { name: 'Home', item: `${baseUrl}/` },
          { name: 'Tags', item: `${baseUrl}/tag` },
        ],
        pageUrl,
      ),
    },
    {
      family: 'collection' as const,
      schema: buildCollectionPageSchema({
        url: pageUrl,
        name: 'Prompt and post tags',
        description: 'Tag archive for Gemini Prompts.',
      }),
    },
    {
      family: 'collection' as const,
      schema: buildItemListSchema({
        url: pageUrl,
        name: 'Tag list',
        idSuffix: 'tags',
        items: tagsResponse.items.map((tag) => ({
          name: tag.name,
          url: `${baseUrl}/tag/${tag.slug}`,
        })),
      }),
    },
  ].filter((entry) => Boolean(entry.schema));

  return (
    <>
      <SeoSchemaScripts items={schemaItems} noIndex={noIndex} />
      <div className="mt-6 rounded-full border border-[#e1e5ee] bg-[#f8fafc] px-4 py-2 text-[0.95rem] text-[#4b525e] w-fit">
        {tagsResponse.total} total tags
      </div>

      <div className="site-section-sub mt-3 overflow-hidden rounded-[22px] border border-[#e1e4ea] bg-white">
        <div className="px-5 py-5 sm:px-7 sm:py-6">
          <div className="flex flex-wrap gap-2.5">
            {tagsResponse.items.length > 0 ? (
              tagsResponse.items.map((tag) => (
                <Link
                  key={tag.id}
                  href={`/tag/${tag.slug}`}
                  className="inline-flex w-fit items-center gap-2 whitespace-nowrap rounded-full bg-[#f0f2f4] px-4 py-2 text-[0.92rem] leading-none text-[#3d4654] transition-colors hover:bg-[#e8ebef] sm:px-5 sm:text-[0.95rem]"
                >
                  <span>{tag.name}</span>
                  {tag.usage ? (
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1.5 text-[0.78rem] text-[#3d4654]">
                      {tag.usage}
                    </span>
                  ) : null}
                </Link>
              ))
            ) : (
              <div className="rounded-[16px] bg-[#f8fafc] px-4 py-3 text-[0.95rem] text-[#6f7786]">
                No tags available yet.
              </div>
            )}
          </div>
        </div>

        <TagSearchPanel />
      </div>

      {totalPages > 1 ? (
        <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={`/tag?page=${Math.max(1, safePage - 1)}`}
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
              href={`/tag?page=${pageNumber}`}
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
            href={`/tag?page=${Math.min(totalPages, safePage + 1)}`}
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

export default async function TagsArchivePage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const page = Math.max(1, Number.parseInt(resolvedSearchParams?.page ?? '1', 10) || 1);
  const seoSettings = await getSeoSettings();
  const baseUrl = getNormalizedBaseUrl(seoSettings);
  const shouldNoIndex =
    seoSettings.noindexTagPages || (page > 1 && seoSettings.noindexPaginatedArchives);

  return (
    <main className="page-shell bg-white">
      <div className="page-container">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <nav aria-label="Breadcrumb" className="text-[0.9rem] text-[#8b8f99]">
              <ol className="flex flex-wrap items-center gap-2">
                <li>
                  <Link href="/" className="transition-colors hover:text-[#101010]">
                    Home
                  </Link>
                </li>
                <li className="text-[#c0c6d1]">/</li>
                <li className="font-medium text-[#101010]">Tags</li>
              </ol>
            </nav>

            <h1 className="section-heading-medium mt-4 text-[2.2rem] leading-[1.05] tracking-[-0.04em] text-[#111118] sm:text-[2.8rem] lg:text-[3.1rem]">
              Explore tags
            </h1>
            <p className="mt-4 max-w-[680px] text-[1.05rem] leading-[1.7] text-[#5f6773]">
              Browse every tag to discover prompts and blog posts grouped by theme, format, and
              workflow.
            </p>
          </div>

          <div className="rounded-full border border-[#e1e5ee] bg-[#f8fafc] px-4 py-2 text-[0.95rem] text-[#4b525e]">
            Live archive
          </div>
        </div>

        <Suspense fallback={<TagsArchiveSectionFallback />}>
          <TagsArchiveSection page={page} baseUrl={baseUrl} noIndex={shouldNoIndex} />
        </Suspense>
      </div>
    </main>
  );
}
