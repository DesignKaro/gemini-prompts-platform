import Link from 'next/link';
import { PostCardUI } from '../components/post-card';
import { estimateReadTime, getPostList } from '../../lib/public-content';

export const metadata = {
  title: 'Blog — Gemini Prompts',
  description: 'Long-form posts and guides powered by the Gemini Prompts dashboard.',
};

const PAGE_SIZE = 12;

type PageProps = {
  searchParams?: Promise<{
    page?: string;
  }>;
};

export default async function BlogArchivePage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'http://localhost:30001';
  const page = Math.max(1, Number.parseInt(resolvedSearchParams?.page ?? '1', 10) || 1);
  const skip = (page - 1) * PAGE_SIZE;
  const response = await getPostList({
    take: PAGE_SIZE,
    skip,
    sort: 'latest',
    includeContent: 1,
  });

  const totalPages = Math.max(1, Math.ceil(response.total / PAGE_SIZE));
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
        name: 'Blog',
        item: `${baseUrl}/blog`,
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
                <li className="font-medium text-[#101010]">Blog</li>
              </ol>
            </nav>

            <h1 className="section-heading-medium mt-4 text-[2.2rem] leading-[1.05] tracking-[-0.04em] text-[#111118] sm:text-[2.8rem] lg:text-[3.1rem]">
              Explore blog posts
            </h1>
            <p className="mt-4 max-w-[680px] text-[1.05rem] leading-[1.7] text-[#5f6773]">
              A live archive of strategy, workflows, and prompt tooling — synced from the
              dashboard.
            </p>
          </div>

          <div className="rounded-full border border-[#e1e5ee] bg-[#f8fafc] px-4 py-2 text-[0.95rem] text-[#4b525e]">
            {response.total} total posts
          </div>
        </div>

        <div className="site-section-sub grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {response.items.map((post) => (
            <PostCardUI
              key={post.id}
              href={`/blog/${post.slug}`}
              imageUrl={post.image}
              readTime={estimateReadTime(post.excerpt || post.content)}
              title={post.title}
              titleTag="h2"
            />
          ))}
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
      </div>
    </main>
  );
}
