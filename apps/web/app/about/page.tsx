import Link from 'next/link';
import { Suspense } from 'react';
import { AnimatedCounter } from '../components/animated-counter';
import { AuthorAvatar } from '../components/author-avatar';
import { ProgressiveImage } from '../components/progressive-image';
import { SeoSchemaScripts } from '../components/seo-schema-script';
import { Skeleton } from '../components/ui/skeleton';
import { getAuthorList, type PublicAuthor } from '../../lib/public-content';
import { buildMetadata, getNormalizedBaseUrl, getSeoSettings } from '../../lib/seo';
import { buildBreadcrumbSchema, buildWebPageSchema } from '../../lib/structured-data';

export async function generateMetadata() {
  const settings = await getSeoSettings();

  return buildMetadata({
    title: 'About',
    description:
      'Learn about Gemini Prompts, our curation philosophy, and how we help creators ship faster with practical AI workflows.',
    path: '/about',
    noIndex: settings.noindexStaticPages,
  });
}

function AboutTrendingAuthorsFallback() {
  return (
    <>
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <article
            key={`about-author-skeleton-${index}`}
            className="flex items-center gap-4 rounded-[22px] border border-[#e6e9f2] bg-white p-5"
          >
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="min-w-0 flex-1">
              <Skeleton className="h-5 w-28 rounded-full" />
              <Skeleton className="mt-2 h-4 w-20 rounded-full" />
            </div>
            <Skeleton className="h-9 w-16 rounded-full" />
          </article>
        ))}
      </div>

      <div className="mt-8 flex justify-center">
        <Link
          href="/author"
          className="rounded-full border border-[#d8dce2] bg-white px-6 py-3 text-[0.95rem] text-[#101010] transition-colors hover:border-[#101010] hover:bg-[#101010] hover:text-white"
        >
          View more authors
        </Link>
      </div>
    </>
  );
}

async function AboutTrendingAuthorsSection() {
  let trendingAuthors: PublicAuthor[] = [];

  try {
    const authorResponse = await getAuthorList({
      take: 8,
      sort: 'popular',
    });
    trendingAuthors = authorResponse.items.slice(0, 8);
  } catch {
    trendingAuthors = [];
  }

  return (
    <>
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {trendingAuthors.map((author) => {
          const articleCount =
            author.totalCount ?? (author.promptCount ?? 0) + (author.postCount ?? 0);

          return (
            <article
              key={author.id}
              className="flex items-center gap-4 rounded-[22px] border border-[#e6e9f2] bg-white p-5"
            >
              <AuthorAvatar
                name={author.name}
                avatarUrl={author.avatarUrl}
                avatarUpdatedAt={author.avatarUpdatedAt}
                className="h-12 w-12"
                initialClassName="text-[0.82rem]"
              />
              <div className="min-w-0">
                <h3 className="truncate text-[1.05rem] font-medium text-[#111118]">{author.name}</h3>
                <p className="truncate text-[0.92rem] text-[#6a7280]">
                  {articleCount} article{articleCount === 1 ? '' : 's'}
                </p>
              </div>
              <Link
                href={`/u/${author.slug}`}
                className="ml-auto rounded-full border border-[#e1e5ee] bg-[#f8fafc] px-4 py-2 text-[0.9rem] text-[#4b525e] transition-colors hover:bg-white"
              >
                View
              </Link>
            </article>
          );
        })}
      </div>

      {trendingAuthors.length === 0 ? (
        <p className="mt-4 text-[0.95rem] text-[#6a7280]">No authors available right now.</p>
      ) : null}

      <div className="mt-8 flex justify-center">
        <Link
          href="/author"
          className="rounded-full border border-[#d8dce2] bg-white px-6 py-3 text-[0.95rem] text-[#101010] transition-colors hover:border-[#101010] hover:bg-[#101010] hover:text-white"
        >
          View more authors
        </Link>
      </div>
    </>
  );
}

export default async function AboutPage() {
  const seoSettings = await getSeoSettings();
  const baseUrl = getNormalizedBaseUrl(seoSettings);
  const pageUrl = `${baseUrl}/about`;
  const shouldNoIndex = seoSettings.noindexStaticPages;
  const schemaItems = [
    {
      family: 'webpage' as const,
      schema: buildWebPageSchema({
        url: pageUrl,
        name: 'About',
        description:
          'Learn about Gemini Prompts, our curation philosophy, and how we help creators ship faster with practical AI workflows.',
      }),
    },
    {
      family: 'breadcrumb' as const,
      schema: buildBreadcrumbSchema(
        [
          { name: 'Home', item: `${baseUrl}/` },
          { name: 'About', item: pageUrl },
        ],
        pageUrl,
      ),
    },
  ].filter((entry) => Boolean(entry.schema));

  const valueCards = [
    {
      title: 'High-signal curation',
      description:
        'We optimize for clarity and repeatability — prompts you can actually reuse, not one-off gimmicks.',
    },
    {
      title: 'Practical templates',
      description:
        'Specs, briefs, reviews, and workflows that help teams ship faster with fewer loops.',
    },
    {
      title: 'Creator-friendly',
      description:
        'Prompts built for makers: hooks, scripts, and structured ideation that still sounds human.',
    },
    {
      title: 'Privacy-first',
      description:
        'We keep things lightweight and respectful: simple pages, no dark patterns, unsubscribe anytime.',
    },
  ];

  const featureCards = [
    {
      title: 'Prompts',
      description:
        'Browse trending prompt packs across technology, business, design, marketing, and more.',
      href: '/prompts',
      cta: 'Explore prompts',
      tone: 'bg-[#f8fafc]',
    },
    {
      title: 'Blog',
      description:
        'Learn how creators and teams use prompts in real projects with strategies and examples.',
      href: '/blog',
      cta: 'Read the blog',
      tone: 'bg-[#f7f7fb]',
    },
    {
      title: 'Tags & Categories',
      description:
        'Dive deeper by theme — curated pages for topics, tags, and collections with pagination.',
      href: '/tag',
      cta: 'Browse tags',
      tone: 'bg-[#f9fafb]',
    },
  ];

  const stats = [
    { label: 'Trending prompts', value: '1.2K+' },
    { label: 'Blog posts', value: '240+' },
    { label: 'Creators', value: '80+' },
    { label: 'Weekly readers', value: '12K+' },
  ];

  return (
    <main className="page-shell-tight bg-white">
      <SeoSchemaScripts items={schemaItems} noIndex={shouldNoIndex} />

      <div className="mx-auto w-full max-w-[1300px]">
        <nav aria-label="Breadcrumb" className="text-[0.9rem] text-[#8b8f99]">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link href="/" className="transition-colors hover:text-[#101010]">
                Home
              </Link>
            </li>
            <li className="text-[#c0c6d1]">/</li>
            <li className="font-medium text-[#101010]">About</li>
          </ol>
        </nav>

        <section className="mt-8 grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <p className="inline-flex rounded-full border border-[#e1e5ee] bg-[#f8fafc] px-4 py-2 text-[0.92rem] text-[#4b525e]">
              About Gemini Prompts
            </p>
            <h1 className="section-heading-medium mt-4 text-[2.3rem] leading-[1.05] tracking-[-0.05em] text-[#111118] sm:text-[3rem] lg:text-[3.4rem]">
              Prompts that help you ship.
            </h1>
            <p className="mt-4 max-w-[42rem] text-[1.05rem] leading-[1.75] text-[#5f6773]">
              Gemini Prompts is a curated library of high-signal prompts and practical workflows. We
              focus on prompts that produce clear outputs — specs, briefs, reviews, launch copy, and
              creator-ready scripts.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href="/prompts"
                className="rounded-full bg-[#111111] px-6 py-3 text-[0.98rem] text-white transition-colors hover:bg-black"
              >
                Explore prompts
              </Link>
              <Link
                href="/blog"
                className="rounded-full border border-[#d8dce2] bg-white px-6 py-3 text-[0.98rem] text-[#101010] transition-colors hover:border-[#101010]"
              >
                Read blog
              </Link>
              <Link
                href="/newsletter"
                className="rounded-full border border-[#e1e5ee] bg-[#f8fafc] px-6 py-3 text-[0.98rem] text-[#4b525e] transition-colors hover:bg-white"
              >
                Newsletter
              </Link>
            </div>
          </div>

          <div className="relative h-[260px] w-full overflow-hidden rounded-[30px] border border-[#e6e9f2] sm:h-[320px] lg:h-[380px]">
            <ProgressiveImage
              src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=80&w=1400"
              alt="Team collaborating around a laptop"
              fill
              sizes="(max-width: 1024px) 100vw, 70vw"
              className="object-cover"
            />
          </div>
        </section>

        <section className="mt-14 grid gap-6 lg:grid-cols-3">
          {featureCards.map((card) => (
            <article
              key={card.title}
              className={`${card.tone} flex h-full flex-col rounded-[26px] border border-[#e6e9f2] p-6 sm:p-8`}
            >
              <h2 className="text-[1.55rem] leading-[1.05] tracking-[-0.04em] text-[#111118]">
                {card.title}
              </h2>
              <p className="mt-4 text-[1.02rem] leading-[1.7] text-[#5f6773]">{card.description}</p>
              <div className="mt-auto pt-7">
                <Link
                  href={card.href}
                  className="inline-flex w-fit items-center gap-2 rounded-full border border-[#d8dce2] bg-white px-5 py-2.5 text-[0.95rem] text-[#101010] transition-colors hover:border-[#101010] hover:bg-[#101010] hover:text-white"
                >
                  {card.cta}
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4">
                    <path
                      d="M9 5.5 15.5 12 9 18.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.9"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M14.5 12h-9"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.9"
                      strokeLinecap="round"
                    />
                  </svg>
                </Link>
              </div>
            </article>
          ))}
        </section>

        <section className="mt-14 relative overflow-hidden rounded-[32px] border border-[#e8ebf1] p-8 sm:p-12">
          {/* Decorative Background Elements */}
          <div className="absolute -right-20 -top-20 z-0 h-[300px] w-[300px] rounded-full bg-gradient-to-br from-[#15a0ff]/20 to-[#6f63ff]/20 blur-[60px]" />
          <div className="absolute -bottom-20 -left-20 z-0 h-[300px] w-[300px] rounded-full bg-gradient-to-tr from-[#ec5b7f]/20 to-[#f5cc4b]/20 blur-[60px]" />

          <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="section-heading-medium text-[1.8rem] leading-[1.05] tracking-[-0.04em] text-[#111118] sm:text-[2.6rem]">
                <span className="bg-gradient-to-r from-[#15a0ff] via-[#6f63ff] to-[#ec5b7f] bg-clip-text text-transparent drop-shadow-sm">
                  What we optimize for
                </span>
              </h2>
              <p className="mt-3 max-w-[46rem] text-[1.05rem] leading-[1.7] text-[#4b525e]">
                Clear prompts, clear outputs. We publish workflows that are easy to adapt, easy to
                share, and easy to ship with.
              </p>
            </div>
            <div className="rounded-full border border-[#d8dbe3] bg-white/70 px-5 py-2.5 text-[0.95rem] font-medium text-[#111118] shadow-sm backdrop-blur-md">
              Updated weekly
            </div>
          </div>

          <div className="relative z-10 mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat, i) => {
              const gradients = [
                'from-[#15a0ff]/10 to-[#6f63ff]/10 border-[#15a0ff]/20',
                'from-[#6f63ff]/10 to-[#ec5b7f]/10 border-[#6f63ff]/20',
                'from-[#ec5b7f]/10 to-[#f5cc4b]/10 border-[#ec5b7f]/20',
                'from-[#22a66f]/10 to-[#15a0ff]/10 border-[#22a66f]/20',
              ];
              const textColors = [
                'text-[#15a0ff]',
                'text-[#6f63ff]',
                'text-[#ec5b7f]',
                'text-[#22a66f]',
              ];

              return (
                <div
                  key={stat.label}
                  className={`relative overflow-hidden rounded-[24px] border bg-gradient-to-br p-6 transition-transform hover:-translate-y-1 ${gradients[i % 4]}`}
                >
                  <AnimatedCounter
                    value={stat.value}
                    className={`text-[1.8rem] font-[500] leading-none tracking-[-0.04em] ${textColors[i % 4]}`}
                  />
                  <p className="mt-3 text-[1rem] font-[450] text-[#4b525e]">{stat.label}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-16">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="section-heading-medium text-[1.8rem] leading-[1.05] tracking-[-0.04em] text-[#111118] sm:text-[2.3rem]">
                Our principles
              </h2>
              <p className="mt-3 max-w-[46rem] text-[1.02rem] leading-[1.7] text-[#5f6773]">
                We keep prompts actionable, the UI clean, and the workflows respectful of your time.
              </p>
            </div>
            <Link
              href="/newsletter"
              className="rounded-full border border-[#d8dce2] bg-white px-5 py-2.5 text-[0.95rem] text-[#101010] transition-colors hover:border-[#101010] hover:bg-[#101010] hover:text-white"
            >
              Get updates
            </Link>
          </div>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {valueCards.map((card) => (
              <article
                key={card.title}
                className="rounded-[24px] border border-[#e6e9f2] bg-white p-6"
              >
                <h3 className="text-[1.15rem] leading-[1.2] tracking-[-0.02em] text-[#111118]">
                  {card.title}
                </h3>
                <p className="mt-3 text-[0.98rem] leading-[1.65] text-[#5f6773]">
                  {card.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-16">
          <div>
            <h2 className="section-heading-medium text-[1.8rem] leading-[1.05] tracking-[-0.04em] text-[#111118] sm:text-[2.3rem]">
              Top trending authors
            </h2>
            <p className="mt-3 max-w-[46rem] text-[1.02rem] leading-[1.7] text-[#5f6773]">
              Fetched live from the backend, sorted by popularity.
            </p>
          </div>
          <Suspense fallback={<AboutTrendingAuthorsFallback />}>
            <AboutTrendingAuthorsSection />
          </Suspense>
        </section>

        <section className="mt-16 overflow-hidden rounded-[30px] border border-[#111111] bg-[#111111] px-7 py-10 text-white sm:px-12 sm:py-12">
          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <h2 className="section-heading-medium text-[2rem] leading-[1.05] tracking-[-0.05em] sm:text-[2.45rem]">
                Ready to find your next prompt?
              </h2>
              <p className="mt-4 max-w-[38rem] text-[1.02rem] leading-[1.7] text-white/80">
                Start with trending prompts, browse tags by theme, or subscribe for the weekly
                prompt drop.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 lg:justify-end">
              <Link
                href="/prompts"
                className="rounded-full bg-white px-6 py-3 text-[0.98rem] text-[#111111] transition-colors hover:bg-[#d5ea52]"
              >
                Explore prompts
              </Link>
              <Link
                href="/tag"
                className="rounded-full border border-white/28 bg-white/10 px-6 py-3 text-[0.98rem] text-white transition-colors hover:bg-white/15"
              >
                Browse tags
              </Link>
              <Link
                href="/newsletter"
                className="rounded-full border border-white/28 bg-white/10 px-6 py-3 text-[0.98rem] text-white transition-colors hover:bg-white/15"
              >
                Newsletter
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
