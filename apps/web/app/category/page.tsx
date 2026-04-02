import Link from 'next/link';
import { Suspense } from 'react';
import { SeoSchemaScripts } from '../components/seo-schema-script';
import { Skeleton } from '../components/ui/skeleton';
import { getCategoryList } from '../../lib/public-content';
import { resolveCategoryImage } from '../../lib/content-image-fallbacks';
import { buildPaginatedMetadata, getNormalizedBaseUrl, getSeoSettings } from '../../lib/seo';
import {
  buildBreadcrumbSchema,
  buildCollectionPageSchema,
  buildItemListSchema,
  buildWebPageSchema,
} from '../../lib/structured-data';

const PAGE_SIZE = 20;
const POPULAR_CATEGORY_LIMIT = 10;

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
    title: 'Categories',
    description: 'Browse topic categories for AI prompts, articles, and creator workflows.',
    basePath: '/category',
    page,
    noIndex: settings.noindexCategoryPages,
  });
}

function CategoriesArchiveSectionFallback() {
  return (
    <>
      <div className="mt-3">
        <Skeleton className="h-9 w-56 rounded-full" />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: POPULAR_CATEGORY_LIMIT }).map((_, index) => (
          <article
            key={`category-popular-skeleton-${index}`}
            className="flex items-center gap-3 rounded-[20px] border border-[#e7ebf1] bg-white px-3 py-2.5"
          >
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-24 rounded-full" />
              <Skeleton className="h-3 w-12 rounded-full" />
            </div>
          </article>
        ))}
      </div>

      <div className="mt-10">
        <Skeleton className="h-9 w-56 rounded-full" />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 10 }).map((_, index) => (
          <article
            key={`category-trending-skeleton-${index}`}
            className="flex items-center gap-3 rounded-[20px] border border-[#e7ebf1] bg-white p-2.5"
          >
            <Skeleton className="h-[68px] w-[132px] rounded-[14px]" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-24 rounded-full" />
              <Skeleton className="h-3 w-16 rounded-full" />
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

function formatCompactCount(value: number) {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

async function CategoriesArchiveSection({
  page,
  baseUrl,
  noIndex,
}: {
  page: number;
  baseUrl: string;
  noIndex: boolean;
}) {
  const skip = (page - 1) * PAGE_SIZE;

  const [popularResponse, categoriesResponse] = await Promise.all([
    getCategoryList({ take: POPULAR_CATEGORY_LIMIT, sort: 'popular' }),
    getCategoryList({ take: PAGE_SIZE, skip, sort: 'popular' }),
  ]);

  const totalPages = Math.max(1, Math.ceil(categoriesResponse.total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const popularItems = popularResponse.items.slice(0, POPULAR_CATEGORY_LIMIT);
  const pagePath = safePage > 1 ? `/category?page=${safePage}` : '/category';
  const pageUrl = `${baseUrl}${pagePath}`;
  const schemaItems = [
    {
      family: 'webpage' as const,
      schema: buildWebPageSchema({
        url: pageUrl,
        name: 'Categories',
        description: 'Browse topic categories for AI prompts, articles, and creator workflows.',
      }),
    },
    {
      family: 'breadcrumb' as const,
      schema: buildBreadcrumbSchema(
        [
          { name: 'Home', item: `${baseUrl}/` },
          { name: 'Categories', item: `${baseUrl}/category` },
        ],
        pageUrl,
      ),
    },
    {
      family: 'collection' as const,
      schema: buildCollectionPageSchema({
        url: pageUrl,
        name: 'Prompt categories',
        description: 'Popular and trending categories on Gemini Prompts.',
      }),
    },
    {
      family: 'collection' as const,
      schema: buildItemListSchema({
        url: pageUrl,
        name: 'Category list',
        idSuffix: 'categories',
        items: categoriesResponse.items.map((category) => ({
          name: category.name,
          url: `${baseUrl}/category/${category.slug}`,
          image: category.imageUrl,
        })),
      }),
    },
  ].filter((entry) => Boolean(entry.schema));

  return (
    <>
      <SeoSchemaScripts items={schemaItems} noIndex={noIndex} />
      <section className="mt-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[2rem] font-medium tracking-[-0.03em] text-[#1a1f2b]">
            Popular Categories
          </h2>
          <div className="rounded-full bg-[#f1f4f8] px-4 py-2 text-[0.9rem] text-[#4b525e]">
            {categoriesResponse.total} total categories
          </div>
        </div>

        {popularItems.length > 0 ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {popularItems.map((category) => (
              <Link
                key={category.id}
                href={`/category/${category.slug}`}
                className="flex items-center gap-3 rounded-[20px] border border-[#e4e8ef] bg-white px-3 py-2.5 transition-colors hover:border-[#cfd6e3] hover:bg-[#fbfcff]"
              >
                <div
                  className="h-11 w-11 shrink-0 rounded-full border border-[#e3e6ee] bg-cover bg-center"
                  style={{
                    backgroundImage: `url(${resolveCategoryImage(category.imageUrl, category.slug || category.id)})`,
                  }}
                />
                <div className="min-w-0">
                  <p className="truncate text-[1.02rem] font-medium text-[#171b24]">{category.name}</p>
                  <p className="text-[0.95rem] text-[#9aa2b0]">{formatCompactCount(category.totalCount)}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-[20px] border border-dashed border-[#d8dee8] px-6 py-7 text-center text-[0.96rem] text-[#677386]">
            No categories available yet.
          </div>
        )}
      </section>

      <section className="mt-14">
        <h2 className="text-[2rem] font-medium tracking-[-0.03em] text-[#1a1f2b]">Trending Categories</h2>

        {categoriesResponse.items.length > 0 ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {categoriesResponse.items.map((category) => (
              <Link
                key={category.id}
                href={`/category/${category.slug}`}
                className="flex items-center gap-3 rounded-[20px] border border-[#e4e8ef] bg-white p-2.5 transition-colors hover:border-[#cfd6e3] hover:bg-[#fbfcff]"
              >
                <div
                  className="h-[72px] w-[138px] shrink-0 rounded-[14px] border border-[#e3e6ee] bg-cover bg-center"
                  style={{
                    backgroundImage: `url(${resolveCategoryImage(category.imageUrl, category.slug || category.id)})`,
                  }}
                />
                <div className="min-w-0">
                  <p className="truncate text-[1.04rem] font-medium text-[#171b24]">{category.name}</p>
                  <p className="text-[0.95rem] text-[#9aa2b0]">
                    {formatCompactCount(category.totalCount)} items
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-[20px] border border-dashed border-[#d8dee8] px-6 py-7 text-center text-[0.96rem] text-[#677386]">
            No categories available yet.
          </div>
        )}
      </section>

      {totalPages > 1 ? (
        <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={`/category?page=${Math.max(1, safePage - 1)}`}
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
              href={`/category?page=${pageNumber}`}
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
            href={`/category?page=${Math.min(totalPages, safePage + 1)}`}
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

export default async function CategoriesArchivePage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const page = Math.max(1, Number.parseInt(resolvedSearchParams?.page ?? '1', 10) || 1);
  const seoSettings = await getSeoSettings();
  const baseUrl = getNormalizedBaseUrl(seoSettings);
  const shouldNoIndex = seoSettings.noindexCategoryPages || (page > 1 && seoSettings.noindexPaginatedArchives);

  return (
    <main className="page-shell-tight bg-white">
      <div className="page-container-wide max-w-[1380px]">
        <h1 className="sr-only">Categories Archive</h1>

        <Suspense fallback={<CategoriesArchiveSectionFallback />}>
          <CategoriesArchiveSection page={page} baseUrl={baseUrl} noIndex={shouldNoIndex} />
        </Suspense>
      </div>
    </main>
  );
}
