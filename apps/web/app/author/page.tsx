import Link from 'next/link';
import { AuthorAvatar } from '../components/author-avatar';
import { getAuthorList } from '../../lib/public-content';

const PAGE_SIZE = 12;

type PageProps = {
  searchParams?: Promise<{
    page?: string;
  }>;
};

export const metadata = {
  title: 'Authors — Gemini Prompts',
  description: 'Meet the creators publishing prompts and posts via the dashboard.',
};

export default async function AuthorsArchivePage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'http://localhost:30001';
  const page = Math.max(1, Number.parseInt(resolvedSearchParams?.page ?? '1', 10) || 1);
  const skip = (page - 1) * PAGE_SIZE;

  const authorsResponse = await getAuthorList({ take: PAGE_SIZE, skip, sort: 'popular' });
  const totalPages = Math.max(1, Math.ceil(authorsResponse.total / PAGE_SIZE));
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
        name: 'Authors',
        item: `${baseUrl}/author`,
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
                <li className="font-medium text-[#101010]">Authors</li>
              </ol>
            </nav>

            <h1 className="section-heading-medium mt-4 text-[2.2rem] leading-[1.05] tracking-[-0.04em] text-[#111118] sm:text-[2.8rem] lg:text-[3.1rem]">
              Explore authors
            </h1>
            <p className="mt-4 max-w-[680px] text-[1.05rem] leading-[1.7] text-[#5f6773]">
              Meet the creators behind the prompts and blog posts.
            </p>
          </div>

          <div className="rounded-full border border-[#e1e5ee] bg-[#f8fafc] px-4 py-2 text-[0.95rem] text-[#4b525e]">
            {authorsResponse.total} total authors
          </div>
        </div>

        <div className="site-section-sub mt-10 grid gap-6 sm:mt-12 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {authorsResponse.items.map((author) => (
            <article
              key={author.id}
              className="flex h-full flex-col rounded-[24px] border border-[#e6e9f2] bg-white p-6"
            >
              <div className="flex items-center gap-4">
                <AuthorAvatar
                  name={author.name}
                  avatarUrl={author.avatarUrl}
                  avatarUpdatedAt={author.avatarUpdatedAt}
                  className="h-14 w-14"
                  initialClassName="text-[0.92rem]"
                />
                <div className="min-w-0">
                  <h2 className="truncate text-[1.15rem] font-medium text-[#111118]">
                    {author.name}
                  </h2>
                  <p className="truncate text-[0.95rem] text-[#6a7280]">
                    {author.profileTitle || 'Prompt creator'}
                  </p>
                </div>
              </div>

              <p className="mt-4 line-clamp-3 text-[0.98rem] leading-[1.65] text-[#5f6773]">
                {author.bio || 'Publishing prompts and posts on Gemini Prompts.'}
              </p>

              <div className="mt-5 flex flex-wrap gap-2 text-[0.88rem] text-[#6a7280]">
                <Link
                  href={`/author/${author.slug}/archive`}
                  className="rounded-full bg-[#f2f4f7] px-3 py-1.5 transition-colors hover:bg-[#e9edf3]"
                >
                  {author.promptCount ?? 0} prompts
                </Link>
                <span className="rounded-full bg-[#f2f4f7] px-3 py-1.5">
                  {author.postCount ?? 0} blogs
                </span>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link
                  href={`/author/${author.slug}`}
                  className="inline-flex h-[42px] items-center justify-center gap-2 rounded-full border border-[#d8dce2] px-5 text-[0.95rem] text-[#101010] transition-colors duration-300 hover:border-[#101010] hover:bg-[#101010] hover:text-white"
                >
                  View author
                </Link>
              </div>
            </article>
          ))}
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
