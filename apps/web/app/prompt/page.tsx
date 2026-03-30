import Link from 'next/link';
import { Suspense } from 'react';
import { PromptCardServer } from '../components/prompt-card-server';
import { SeoSchemaScripts } from '../components/seo-schema-script';
import { Skeleton } from '../components/ui/skeleton';
import { getPromptList } from '../../lib/public-content';
import { buildPaginatedMetadata, getNormalizedBaseUrl, getSeoSettings } from '../../lib/seo';
import {
  buildBreadcrumbSchema,
  buildCollectionPageSchema,
  buildItemListSchema,
  buildPromptItemListEntries,
  buildWebPageSchema,
} from '../../lib/structured-data';

const PAGE_SIZE = 24;

type PageProps = {
  searchParams?: Promise<{
    page?: string;
  }>;
};

export async function generateMetadata({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const page = Math.max(1, Number.parseInt(resolvedSearchParams?.page ?? '1', 10) || 1);

  return buildPaginatedMetadata({
    title: 'Prompts',
    description: 'Browse published AI prompts, prompt packs, and reusable templates.',
    basePath: '/prompt',
    page,
  });
}

function PromptArchiveSectionFallback() {
  return (
    <>
      <div className="mt-6">
        <Skeleton className="h-10 w-44 rounded-full" />
      </div>

      <div className="site-section-sub mt-8 grid gap-6 sm:mt-9 sm:grid-cols-2 lg:mt-10 lg:grid-cols-4">
        {Array.from({ length: 12 }).map((_, index) => (
          <article key={`prompt-archive-skeleton-${index}`} className="space-y-3">
            <Skeleton className="aspect-[4/3] w-full rounded-[24px]" />
            <Skeleton className="h-5 w-full rounded-full" />
            <Skeleton className="h-5 w-[82%] rounded-full" />
            <Skeleton className="h-4 w-24 rounded-full" />
          </article>
        ))}
      </div>
    </>
  );
}

async function PromptArchiveSection({
  page,
  baseUrl,
  noIndex,
}: {
  page: number;
  baseUrl: string;
  noIndex: boolean;
}) {
  const skip = (page - 1) * PAGE_SIZE;
  const response = await getPromptList({ take: PAGE_SIZE, skip, sort: 'latest' });
  const totalPages = Math.max(1, Math.ceil(response.total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagePath = safePage > 1 ? `/prompt?page=${safePage}` : '/prompt';
  const pageUrl = `${baseUrl}${pagePath}`;
  const schemaItems = [
    {
      family: 'webpage' as const,
      schema: buildWebPageSchema({
        url: pageUrl,
        name: 'Prompts',
        description: 'Browse published AI prompts, prompt packs, and reusable templates.',
      }),
    },
    {
      family: 'breadcrumb' as const,
      schema: buildBreadcrumbSchema(
        [
          { name: 'Home', item: `${baseUrl}/` },
          { name: 'Prompts', item: `${baseUrl}/prompt` },
        ],
        pageUrl,
      ),
    },
    {
      family: 'collection' as const,
      schema: buildCollectionPageSchema({
        url: pageUrl,
        name: 'Published prompts',
        description: 'Public prompt archive on Gemini Prompts.',
      }),
    },
    {
      family: 'collection' as const,
      schema: buildItemListSchema({
        url: pageUrl,
        name: 'Prompt list',
        idSuffix: 'prompt-archive',
        items: buildPromptItemListEntries(response.items, baseUrl),
      }),
    },
  ].filter((entry) => Boolean(entry.schema));

  return (
    <>
      <SeoSchemaScripts items={schemaItems} noIndex={noIndex} />
      <div className="mt-6 rounded-full border border-[#e1e5ee] bg-[#f8fafc] px-4 py-2 text-[0.95rem] text-[#4b525e] w-fit">
        {response.total} live prompts
      </div>

      <div className="site-section-sub mt-8 grid gap-6 sm:mt-9 sm:grid-cols-2 lg:mt-10 lg:grid-cols-4">
        {response.items.length > 0 ? (
          response.items.map((prompt) => <PromptCardServer key={prompt.id} prompt={prompt} />)
        ) : (
          <div className="col-span-full rounded-[22px] border border-dashed border-[#d8dee8] px-6 py-7 text-center text-[0.96rem] text-[#677386]">
            No prompts available yet.
          </div>
        )}
      </div>

      {totalPages > 1 ? (
        <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={`?page=${Math.max(1, safePage - 1)}`}
            prefetch={true}
            aria-disabled={safePage === 1}
            className={`rounded-full border px-4 py-2 text-[0.95rem] ${
              safePage === 1
                ? 'pointer-events-none cursor-not-allowed border-[#e1e5ee] text-[#c0c6d1]'
                : 'border-[#d8dce2] text-[#101010] hover:border-[#101010]'
            }`}
          >
            Previous
          </Link>

          {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
            <Link
              key={`prompt-page-${pageNumber}`}
              href={`?page=${pageNumber}`}
              prefetch={true}
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
            href={`?page=${Math.min(totalPages, safePage + 1)}`}
            prefetch={true}
            aria-disabled={safePage === totalPages}
            className={`rounded-full border px-4 py-2 text-[0.95rem] ${
              safePage === totalPages
                ? 'pointer-events-none cursor-not-allowed border-[#e1e5ee] text-[#c0c6d1]'
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

export default async function PromptsArchivePage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const page = Math.max(1, Number.parseInt(resolvedSearchParams?.page ?? '1', 10) || 1);
  const seoSettings = await getSeoSettings();
  const baseUrl = getNormalizedBaseUrl(seoSettings);
  const shouldNoIndex = page > 1 && seoSettings.noindexPaginatedArchives;

  return (
    <main className="page-shell bg-white">
      <div className="page-container">
        <nav aria-label="Breadcrumb" className="text-[0.9rem] text-[#8b8f99]">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link href="/" className="transition-colors hover:text-[#101010]">
                Home
              </Link>
            </li>
            <li className="text-[#c0c6d1]">/</li>
            <li className="font-medium text-[#101010]">Prompts</li>
          </ol>
        </nav>

        <div className="mt-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="section-heading-medium text-[2.2rem] leading-[1.05] tracking-[-0.04em] text-[#111118] sm:text-[2.8rem] lg:text-[3.1rem]">
              Published prompts
            </h1>
            <p className="mt-4 max-w-[680px] text-[1.05rem] leading-[1.7] text-[#5f6773]">
              Browse the live prompt archive powered by the dashboard instead of seeded placeholder
              content.
            </p>
          </div>
        </div>

        <Suspense fallback={<PromptArchiveSectionFallback />}>
          <PromptArchiveSection page={page} baseUrl={baseUrl} noIndex={shouldNoIndex} />
        </Suspense>
      </div>
    </main>
  );
}
