import Link from 'next/link';
import { getCategoryList } from '../../lib/public-content';

const PAGE_SIZE = 12;

type PageProps = {
  searchParams?: Promise<{
    page?: string;
  }>;
};

export const metadata = {
  title: 'Categories — Gemini Prompts',
  description: 'Browse categories powered by the Gemini Prompts dashboard.',
};

export default async function CategoriesArchivePage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'http://localhost:30001';
  const page = Math.max(1, Number.parseInt(resolvedSearchParams?.page ?? '1', 10) || 1);
  const skip = (page - 1) * PAGE_SIZE;

  const categoriesResponse = await getCategoryList({ take: PAGE_SIZE, skip });
  const totalPages = Math.max(1, Math.ceil(categoriesResponse.total / PAGE_SIZE));
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
        name: 'Categories',
        item: `${baseUrl}/category`,
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
                <li className="font-medium text-[#101010]">Categories</li>
              </ol>
            </nav>
            <h1 className="section-heading-medium mt-4 text-[2.6rem] leading-[1.05] tracking-[-0.04em] text-[#111118] sm:text-[3.4rem] lg:text-[4rem]">
              Explore every category
            </h1>
            <p className="mt-4 max-w-[620px] text-[1.05rem] leading-[1.7] text-[#5f6773]">
              Browse the live catalog of categories and dive into curated collections of prompts
              and posts.
            </p>
          </div>
          <div className="rounded-full bg-[#f1f4f8] px-4 py-2 text-[0.95rem] text-[#4b525e]">
            {categoriesResponse.total} total categories
          </div>
        </div>

        <div className="site-section-sub mt-8 grid gap-6 sm:mt-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {categoriesResponse.items.map((category) => (
            <article
              key={category.id}
              className="flex flex-col items-center rounded-[28px] border border-[#e7e7ee] bg-white p-6 text-center"
            >
              <div
                className="h-[120px] w-[120px] rounded-full border border-[#e3e3e3] bg-cover bg-center"
                style={{
                  backgroundImage: `url(${
                    category.imageUrl ||
                    'https://images.unsplash.com/photo-1487058792275-0ad4aaf24ca7?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=80&w=900'
                  })`,
                }}
              />
              <h2 className="mt-5 text-[1.2rem] font-medium text-[#141414]">
                {category.name}
              </h2>
              <p className="mt-2 text-[0.95rem] text-[#6a7280]">
                {category.totalCount} items
              </p>
              <Link
                href={`/category/${category.slug}`}
                className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#d8dce2] px-4 py-2 text-[0.9rem] text-[#101010] transition-colors duration-300 hover:border-[#101010] hover:bg-[#101010] hover:text-white"
              >
                View category
              </Link>
            </article>
          ))}
        </div>

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
      </div>
    </main>
  );
}
