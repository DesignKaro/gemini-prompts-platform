import Link from 'next/link';
import { PromptCardUI } from '../components/prompt-listing';
import { getPromptList } from '../../lib/public-content';

export const metadata = {
  title: 'Prompts — Gemini Prompts',
  description: 'Browse published prompts from the Gemini Prompts dashboard.',
};

const PAGE_SIZE = 24;

type PageProps = {
  searchParams?: Promise<{
    page?: string;
  }>;
};

export default async function PromptsArchivePage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const page = Math.max(1, Number.parseInt(resolvedSearchParams?.page ?? '1', 10) || 1);
  const skip = (page - 1) * PAGE_SIZE;
  const response = await getPromptList({ take: PAGE_SIZE, skip, sort: 'latest' });
  const totalPages = Math.max(1, Math.ceil(response.total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

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
          <div className="rounded-full border border-[#e1e5ee] bg-[#f8fafc] px-4 py-2 text-[0.95rem] text-[#4b525e]">
            {response.total} live prompts
          </div>
        </div>

        <div className="site-section-sub grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {response.items.map((prompt) => (
            <PromptCardUI key={prompt.id} prompt={prompt} />
          ))}
        </div>

        {totalPages > 1 ? (
          <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
            <Link
              href={`/prompt?page=${Math.max(1, safePage - 1)}`}
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
                href={`/prompt?page=${pageNumber}`}
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
              href={`/prompt?page=${Math.min(totalPages, safePage + 1)}`}
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
      </div>
    </main>
  );
}
