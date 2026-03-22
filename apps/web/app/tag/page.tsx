import Link from 'next/link';
import { getTagList } from '../../lib/public-content';

const PAGE_SIZE = 48;

type PageProps = {
  searchParams?: Promise<{
    page?: string;
  }>;
};

export const metadata = {
  title: 'Tags — Gemini Prompts',
  description: 'Explore tags synced from the Gemini Prompts dashboard.',
};

export default async function TagsArchivePage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'http://localhost:30001';
  const page = Math.max(1, Number.parseInt(resolvedSearchParams?.page ?? '1', 10) || 1);
  const skip = (page - 1) * PAGE_SIZE;
  const tagsResponse = await getTagList({ take: PAGE_SIZE, skip, sort: 'popular' });
  const totalPages = Math.max(1, Math.ceil(tagsResponse.total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: `${baseUrl}/`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Tags',
        item: `${baseUrl}/tag`,
      },
    ],
  };

  return (
    <main className="page-shell bg-white">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

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
            {tagsResponse.total} total tags
          </div>
        </div>

        <div className="site-section-sub overflow-hidden rounded-[22px] border border-[#e1e4ea] bg-white">
          <div className="px-5 py-5 sm:px-7 sm:py-6">
            <div className="flex flex-wrap gap-2.5">
              {tagsResponse.items.map((tag) => (
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
              ))}
            </div>
          </div>

          <div className="border-t border-[#e6e8ee] px-5 py-5 sm:px-7 sm:py-6">
            <h2 className="text-[1.35rem] leading-none text-[#11141a] sm:text-[1.42rem]">
              Search tags
            </h2>
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
      </div>
    </main>
  );
}
