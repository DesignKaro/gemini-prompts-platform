import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '../../../auth';
import AISummarizeWidget from '../../components/ai-summarize-widget';
import { AuthorAvatar } from '../../components/author-avatar';
import { ContentViewTracker } from '../../components/content-view-tracker';
import { ExclusiveAccessCard } from '../../components/exclusive-access-card';
import { PostCardUI } from '../../components/post-card';
import {
  estimateReadTime,
  formatDisplayDate,
  getPostCategoryName,
  getPostDetail,
  stripHtml,
} from '../../../lib/public-content';

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostDetail(slug);

  if (!post) {
    return {
      title: 'Issue Not Found — Gemini Prompts',
    };
  }

  return {
    title: `${post.seoTitle || post.title} — Gemini Prompts Newsletter`,
    description:
      post.seoDescription ||
      post.excerpt ||
      stripHtml(post.content).slice(0, 160) ||
      'A published newsletter issue synced from the Gemini Prompts dashboard.',
  };
}

export default async function NewsletterIssuePage({ params }: PageProps) {
  const { slug } = await params;
  const session = await auth();
  const post = await getPostDetail(slug, {
    accessToken: session?.apiAccessToken ?? null,
    noStore: Boolean(session?.apiAccessToken),
  });

  if (!post) {
    notFound();
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'http://localhost:30001';
  const canonicalUrl = `${baseUrl}/newsletter/${encodeURIComponent(post.slug)}`;
  const categoryName = getPostCategoryName(post);
  const dateLabel = formatDisplayDate(post.publishedAt || post.updatedAt);
  const readingTime = estimateReadTime(post.content || post.excerpt || '');
  const excerpt = post.excerpt || stripHtml(post.content || '').slice(0, 200);
  const isSignedIn = Boolean(session?.user?.email);

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${baseUrl}/` },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Newsletter',
        item: `${baseUrl}/newsletter`,
      },
      { '@type': 'ListItem', position: 3, name: post.title, item: canonicalUrl },
    ],
  };

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: excerpt,
    datePublished: post.publishedAt || post.updatedAt,
    dateModified: post.updatedAt,
    author: { '@type': 'Person', name: post.author.name },
    mainEntityOfPage: canonicalUrl,
    image: post.image ? [post.image] : undefined,
  };

  return (
    <main className="page-shell bg-white">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <ContentViewTracker target="post" contentId={post.id} />

      <div className="page-container-reading">
        <nav aria-label="Breadcrumb" className="text-[0.9rem] text-[#8b8f99]">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link href="/" className="transition-colors hover:text-[#101010]">
                Home
              </Link>
            </li>
            <li className="text-[#c0c6d1]">/</li>
            <li>
              <Link href="/newsletter" className="transition-colors hover:text-[#101010]">
                Newsletter
              </Link>
            </li>
            <li className="text-[#c0c6d1]">/</li>
            <li className="font-medium text-[#101010]">{post.title}</li>
          </ol>
        </nav>

        <div className="mt-8 grid gap-8 sm:gap-10 lg:grid-cols-[1fr_340px] lg:items-start">
          <article className="min-w-0">
            <div className="flex flex-wrap items-center gap-3 text-[0.95rem] text-[#6b7382]">
              <span className="rounded-full border border-[#e1e5ee] bg-[#f8fafc] px-4 py-2 text-[0.9rem] font-medium text-[#0b0f18]">
                {categoryName}
              </span>
              <span
                className={`rounded-full px-4 py-2 text-[0.82rem] font-medium ${
                  post.visibility === 'EXCLUSIVE'
                    ? 'bg-[#111111] text-white'
                    : 'bg-[#eef2f7] text-[#455065]'
                }`}
              >
                {post.visibility === 'EXCLUSIVE' ? 'Exclusive' : 'Free'}
              </span>
              <span aria-hidden="true" className="text-[#c0c6d1]">
                •
              </span>
              <time dateTime={post.publishedAt || post.updatedAt}>{dateLabel}</time>
              <span aria-hidden="true" className="text-[#c0c6d1]">
                •
              </span>
              <span>{readingTime}</span>
            </div>

            <h1 className="section-heading-medium mt-5 text-[2.3rem] leading-[1.05] tracking-[-0.05em] text-[#111118] sm:text-[2.9rem]">
              {post.title}
            </h1>
            <p className="mt-5 max-w-[46rem] text-[1.08rem] leading-[1.75] text-[#5f6773]">
              {excerpt}
            </p>

            <div className="mt-7 flex flex-wrap items-center justify-between gap-4">
              <Link href={`/author/${post.author.slug}`} className="flex items-center gap-3">
                <AuthorAvatar
                  name={post.author.name}
                  avatarUrl={post.author.avatarUrl}
                  avatarUpdatedAt={post.author.avatarUpdatedAt}
                  className="h-10 w-10"
                  initialClassName="text-[0.88rem]"
                />
                <div>
                  <p className="text-[0.95rem] font-[500] leading-none text-[#0f1118]">
                    {post.author.name}
                  </p>
                  <p className="mt-1 text-[0.86rem] leading-none text-[#6b7280]">
                    {post.author.profileTitle || 'Contributor'}
                  </p>
                </div>
              </Link>

              <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
                <a
                  className="inline-flex h-10 items-center justify-center rounded-full border border-[#d8dce2] bg-white px-4 text-[0.92rem] font-[500] text-[#101010] transition-colors hover:border-[#101010]"
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(canonicalUrl)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Share
                </a>
                <a
                  className="inline-flex h-10 items-center justify-center rounded-full border border-[#d8dce2] bg-white px-4 text-[0.92rem] font-[500] text-[#101010] transition-colors hover:border-[#101010]"
                  href={canonicalUrl}
                >
                  Copy link
                </a>
              </div>
            </div>

            {post.image ? (
              <div className="mt-10 overflow-hidden rounded-[26px] border border-[#e6e9f2]">
                <div
                  role="img"
                  aria-label={`${post.title} cover`}
                  className="relative aspect-[16/9] w-full bg-cover bg-center"
                  style={{ backgroundImage: `url(${post.image})` }}
                />
              </div>
            ) : null}

            {post.isLocked ? (
              <div className="mt-12">
                <ExclusiveAccessCard contentLabel="newsletter issue" isSignedIn={isSignedIn} />
              </div>
            ) : (
              <div className="prose prose-gray mt-12 max-w-none text-[1rem] leading-[1.85] text-[#3f4550]">
                {/* eslint-disable-next-line react/no-danger */}
                <div dangerouslySetInnerHTML={{ __html: post.content || '' }} />
              </div>
            )}

            {post.tags.length > 0 ? (
              <div className="mt-10 flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <Link
                    key={tag.id}
                    href={`/tag/${tag.slug}`}
                    className="rounded-full bg-[#f1f3f8] px-4 py-2 text-[0.88rem] text-[#2f3440] transition-colors hover:bg-[#e7ebf2]"
                  >
                    {tag.name}
                  </Link>
                ))}
              </div>
            ) : null}

            {post.relatedPosts && post.relatedPosts.length > 0 ? (
              <section className="mt-12">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <h2 className="text-[1.55rem] font-medium tracking-[-0.02em] text-[#0b0f18]">
                      Related issues
                    </h2>
                    <p className="mt-2 text-[1rem] leading-[1.75] text-[#5f6773]">
                      More live content from the same category.
                    </p>
                  </div>
                  <Link
                    href="/newsletter"
                    className="text-[0.95rem] font-medium text-[#111111] transition-colors hover:text-[#4b5563]"
                  >
                    View all
                  </Link>
                </div>

                <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {post.relatedPosts.map((item) => (
                    <PostCardUI
                      key={item.id}
                      href={`/newsletter/${item.slug}`}
                      imageUrl={item.image}
                      readTime={estimateReadTime(item.excerpt || item.content)}
                      title={item.title}
                    />
                  ))}
                </div>
              </section>
            ) : null}
          </article>

          <aside className="space-y-5 lg:sticky lg:top-8">
            <div className="rounded-[20px] border border-[#e6e9f2] bg-white p-5">
              <p className="text-[0.92rem] font-medium text-[#0b0f18]">Issue stats</p>
              <div className="mt-4 space-y-3 text-[0.92rem] text-[#4b5563]">
                <div className="flex items-center justify-between gap-3">
                  <span>Views</span>
                  <span className="font-medium text-[#0f1118]">
                    {post.viewCount.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Comments</span>
                  <span className="font-medium text-[#0f1118]">{post.commentCount}</span>
                </div>
              </div>
            </div>

            {post.isLocked ? (
              <ExclusiveAccessCard
                contentLabel="premium newsletter archive"
                isSignedIn={isSignedIn}
                className="p-5"
              />
            ) : (
              <AISummarizeWidget />
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
