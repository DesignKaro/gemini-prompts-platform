import Link from 'next/link';
import { AuthorAvatar } from '../components/author-avatar';
import { SeoSchemaScripts } from '../components/seo-schema-script';
import { getAuthorList } from '../../lib/public-content';
import { buildPaginatedMetadata, getNormalizedBaseUrl, getSeoSettings } from '../../lib/seo';
import {
  buildBreadcrumbSchema,
  buildCollectionPageSchema,
  buildItemListSchema,
  buildWebPageSchema,
} from '../../lib/structured-data';

const PAGE_SIZE = 24;
const FETCH_LIMIT = 200;

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
    title: 'Authors',
    description: 'Explore creators publishing prompts, workflow templates, and editorial posts.',
    basePath: '/author',
    page,
    noIndex: settings.noindexAuthorPages,
  });
}

export default async function AuthorsPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const requestedPage = Math.max(1, Number.parseInt(resolvedSearchParams?.page ?? '1', 10) || 1);
  const authorsResponse = await getAuthorList({ take: FETCH_LIMIT, sort: 'popular' });

  const totalAuthors = authorsResponse.items.length;
  const totalPages = Math.max(1, Math.ceil(totalAuthors / PAGE_SIZE));
  const safePage = Math.min(requestedPage, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const visibleAuthors = authorsResponse.items.slice(start, start + PAGE_SIZE);
  const seoSettings = await getSeoSettings();
  const baseUrl = getNormalizedBaseUrl(seoSettings);
  const pagePath = safePage > 1 ? `/author?page=${safePage}` : '/author';
  const pageUrl = `${baseUrl}${pagePath}`;
  const shouldNoIndex =
    seoSettings.noindexAuthorPages || (safePage > 1 && seoSettings.noindexPaginatedArchives);
  const schemaItems = [
    {
      family: 'webpage' as const,
      schema: buildWebPageSchema({
        url: pageUrl,
        name: 'Authors',
        description: 'Explore creators publishing prompts, workflow templates, and editorial posts.',
      }),
    },
    {
      family: 'breadcrumb' as const,
      schema: buildBreadcrumbSchema(
        [
          { name: 'Home', item: `${baseUrl}/` },
          { name: 'Authors', item: `${baseUrl}/author` },
        ],
        pageUrl,
      ),
    },
    {
      family: 'collection' as const,
      schema: buildCollectionPageSchema({
        url: pageUrl,
        name: 'Author directory',
        description: 'Public authors on Gemini Prompts.',
      }),
    },
    {
      family: 'collection' as const,
      schema: buildItemListSchema({
        url: pageUrl,
        name: 'Author list',
        idSuffix: 'authors',
        items: visibleAuthors.map((author) => ({
          name: author.name,
          url: `${baseUrl}/u/${author.slug}`,
          image: author.avatarUrl,
        })),
      }),
    },
  ].filter((entry) => Boolean(entry.schema));

  return (
    <main className="page-shell bg-white">
      <SeoSchemaScripts items={schemaItems} noIndex={shouldNoIndex} />

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
                <li className="font-medium text-[#101010]">Authors</li>
              </ol>
            </nav>
            <h1 className="section-heading-medium mt-4 text-[2.6rem] leading-[1.05] tracking-[-0.04em] text-[#111118] sm:text-[3.2rem]">
              Explore all authors
            </h1>
            <p className="mt-4 max-w-[620px] text-[1.05rem] leading-[1.7] text-[#5f6773]">
              Discover creators sharing high-signal prompts and editorial posts.
            </p>
          </div>

          <div className="rounded-full bg-[#f1f4f8] px-4 py-2 text-[0.95rem] text-[#4b525e]">
            {totalAuthors} total authors
          </div>
        </div>

        <div className="mt-9 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visibleAuthors.length > 0 ? (
            visibleAuthors.map((author) => {
              const totalCount =
                author.totalCount ?? (author.promptCount ?? 0) + (author.postCount ?? 0);

              return (
                <article
                  key={author.id}
                  className="rounded-[24px] border border-[#e6e9f2] bg-white p-6 transition-colors hover:border-[#cfd6e2]"
                >
                  <div className="flex items-center gap-3">
                    <AuthorAvatar
                      name={author.name}
                      avatarUrl={author.avatarUrl}
                      avatarUpdatedAt={author.avatarUpdatedAt}
                      className="h-12 w-12"
                      initialClassName="text-[0.82rem]"
                    />
                    <div className="min-w-0">
                      <h2 className="truncate text-[1.04rem] font-medium text-[#111118]">{author.name}</h2>
                      <p className="truncate text-[0.86rem] text-[#7b8392]">
                        {author.profileTitle || 'Prompt creator'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 text-[0.9rem] text-[#5f6773]">
                    {totalCount} published item{totalCount === 1 ? '' : 's'}
                  </div>

                  <Link
                    href={`/u/${author.slug}`}
                    className="mt-5 inline-flex h-[40px] items-center justify-center rounded-full border border-[#d8dce2] px-4 text-[0.9rem] text-[#101010] transition-colors hover:border-[#101010] hover:bg-[#101010] hover:text-white"
                  >
                    View profile
                  </Link>
                </article>
              );
            })
          ) : (
            <div className="col-span-full rounded-[22px] border border-dashed border-[#d8dee8] px-6 py-7 text-center text-[0.96rem] text-[#677386]">
              No authors available yet.
            </div>
          )}
        </div>

        {totalPages > 1 ? (
          <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
            <Link
              href={`/author?page=${Math.max(1, safePage - 1)}`}
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
                href={`/author?page=${pageNumber}`}
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
              href={`/author?page=${Math.min(totalPages, safePage + 1)}`}
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
      </div>
    </main>
  );
}
