import Link from 'next/link';
import { getPostList } from '../../lib/public-content';
const NEWSLETTER_TAG = 'newsletter';

export default async function NewsletterPage() {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'http://localhost:30001';

  let response = await getPostList({
    take: 1,
    skip: 0,
    sort: 'latest',
    tag: NEWSLETTER_TAG,
    includeContent: 0,
    includeTags: 0,
  });

  if (response.total === 0) {
    response = await getPostList({
      take: 1,
      skip: 0,
      sort: 'latest',
      includeContent: 0,
      includeTags: 0,
    });
  }

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
        name: 'Newsletter',
        item: `${baseUrl}/newsletter`,
      },
    ],
  };

  return (
    <main className="page-shell-tight bg-white">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <div className="mx-auto w-full max-w-[1300px]">
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
                <li className="font-medium text-[#101010]">Newsletter</li>
              </ol>
            </nav>

            <h1 className="section-heading-medium mt-4 text-[2.2rem] leading-[1.05] tracking-[-0.04em] text-[#111118] sm:text-[2.8rem] lg:text-[3.1rem]">
              Weekly newsletter
            </h1>
            <p className="mt-4 max-w-[720px] text-[1.05rem] leading-[1.7] text-[#5f6773]">
              Get a curated set of prompts, collections, and blog reads — once a week. Built
              for creators and teams who want high-signal ideas without the noise.
            </p>
          </div>

          <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto sm:justify-end">
            <div className="rounded-full border border-[#e1e5ee] bg-[#f8fafc] px-4 py-2 text-[0.9rem] text-[#4b525e] sm:text-[0.95rem]">
              Weekly • 1 email
            </div>
            <div className="rounded-full border border-[#e1e5ee] bg-[#f8fafc] px-4 py-2 text-[0.9rem] text-[#4b525e] sm:text-[0.95rem]">
              {response.total} issues
            </div>
          </div>
        </div>

        <section className="relative mt-8 overflow-hidden rounded-[22px] border border-[#e6e9f2] bg-[#d5ea52] sm:mt-10 sm:rounded-[28px]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-[220px] -top-[240px] h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle_at_center,rgba(213,234,82,0.7)_0%,rgba(213,234,82,0)_62%)] blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-[300px] -left-[240px] h-[620px] w-[620px] rounded-full bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.28)_0%,rgba(59,130,246,0)_62%)] blur-3xl"
          />

          <div className="relative grid gap-8 px-4 py-8 sm:gap-10 sm:px-10 sm:py-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-14">
            <div>
              <p className="inline-flex rounded-full bg-black px-4 py-2 text-[0.9rem] text-white">
                Subscribe
              </p>
              <h2 className="section-heading-medium mt-4 text-[1.95rem] leading-[1.05] tracking-[-0.05em] text-black sm:text-[2.25rem] lg:text-[2.65rem]">
                Get the weekly prompt drop.
              </h2>
              <p className="mt-4 max-w-[34rem] text-[1.02rem] leading-[1.7] text-black">
                One email every week with the best prompts and reads we shipped — plus a small
                “prompt of the week” you can reuse instantly.
              </p>
            </div>

            <div className="rounded-[26px] border border-white/70 bg-white/55 p-5 shadow-[0_18px_60px_rgba(16,24,40,0.07)] backdrop-blur sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <label className="sr-only" htmlFor="newsletter-email">
                  Email address
                </label>
                <input
                  id="newsletter-email"
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  className="h-[52px] w-full rounded-full border border-[#d8dce2] bg-white px-5 text-[1rem] text-[#101418] outline-none transition focus:border-[#101010]"
                />
                <button
                  type="button"
                  className="h-[52px] w-full rounded-full bg-black px-6 text-[0.95rem] font-medium text-white transition hover:opacity-90 sm:w-auto"
                >
                  Subscribe
                </button>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-4 text-[0.88rem] text-black">
                <span className="inline-flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/80">
                    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 text-[#111111]">
                      <path
                        d="M6 12.5 10 16l8-8"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.9"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  Unsubscribe anytime
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/80">
                    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 text-[#111111]">
                      <path
                        d="M7.5 10.8V9.4a4.5 4.5 0 0 1 9 0v1.4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.9"
                        strokeLinecap="round"
                      />
                      <rect
                        x="6.2"
                        y="10.8"
                        width="11.6"
                        height="9.6"
                        rx="2.2"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.9"
                      />
                    </svg>
                  </span>
                  We keep your email private
                </span>
              </div>
            </div>
          </div>
        </section>

      </div>
    </main>
  );
}
