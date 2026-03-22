import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PostCardUI } from '../../components/post-card';
import { PromptCardUI } from '../../components/prompt-listing';
import {
  estimateReadTime,
  getPostList,
  getPromptList,
  getTagDetail,
} from '../../../lib/public-content';

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function TagDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'http://localhost:3000';
  const tag = await getTagDetail(slug);

  if (!tag) {
    notFound();
  }

  const [promptsResponse, postsResponse] = await Promise.all([
    getPromptList({ tag: tag.slug, take: 12, sort: 'latest' }),
    getPostList({ tag: tag.slug, take: 6, sort: 'latest' }),
  ]);

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${baseUrl}/` },
      { '@type': 'ListItem', position: 2, name: 'Tags', item: `${baseUrl}/tag` },
      { '@type': 'ListItem', position: 3, name: tag.name, item: `${baseUrl}/tag/${tag.slug}` },
    ],
  };

  return (
    <main className="page-shell bg-white">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <div className="page-container space-y-12">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <nav aria-label="Breadcrumb" className="text-[0.9rem] text-[#8b8f99]">
              <ol className="flex flex-wrap items-center gap-2">
                <li>
                  <Link href="/" className="transition-colors hover:text-[#101010]">
                    Home
                  </Link>
                </li>
                <li className="text-[#c0c6d1]">/</li>
                <li>
                  <Link href="/tag" className="transition-colors hover:text-[#101010]">
                    Tags
                  </Link>
                </li>
                <li className="text-[#c0c6d1]">/</li>
                <li className="font-medium text-[#101010]">{tag.name}</li>
              </ol>
            </nav>

            <h1 className="section-heading-medium mt-4 text-[2.6rem] leading-[1.05] tracking-[-0.04em] text-[#111118] sm:text-[3.2rem]">
              #{tag.name}
            </h1>
            <p className="mt-3 max-w-[620px] text-[1.05rem] leading-[1.7] text-[#5f6773]">
              {tag.description || `Prompts and posts tagged with ${tag.name}.`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[0.9rem] text-[#4b525e]">
            <span className="rounded-full bg-[#f1f4f8] px-4 py-2">
              {tag.promptCount} prompts
            </span>
            <span className="rounded-full bg-[#f1f4f8] px-4 py-2">
              {tag.postCount} posts
            </span>
          </div>
        </div>

        {promptsResponse.items.length > 0 ? (
          <section>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-[1.6rem] font-medium tracking-[-0.02em] text-[#0b0f18]">
                  Tagged prompts
                </h2>
                <p className="mt-2 text-[1rem] leading-[1.7] text-[#5f6773]">
                  Published prompts that carry this tag.
                </p>
              </div>
              <Link
                href={`/tag/${tag.slug}/archive`}
                className="inline-flex items-center rounded-full bg-[#d5ea52] px-5 py-2.5 text-[0.95rem] font-medium text-black transition-all hover:translate-y-[-1px] hover:opacity-95"
              >
                View prompt archive
              </Link>
            </div>

            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {promptsResponse.items.map((prompt) => (
                <PromptCardUI key={prompt.id} prompt={prompt} />
              ))}
            </div>
          </section>
        ) : null}

        {postsResponse.items.length > 0 ? (
          <section>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-[1.6rem] font-medium tracking-[-0.02em] text-[#0b0f18]">
                  Tagged posts
                </h2>
                <p className="mt-2 text-[1rem] leading-[1.7] text-[#5f6773]">
                  Editorial posts and guides with this tag.
                </p>
              </div>
              <Link
                href="/blog"
                className="inline-flex items-center rounded-full bg-[#d5ea52] px-5 py-2.5 text-[0.95rem] font-medium text-black transition-all hover:translate-y-[-1px] hover:opacity-95"
              >
                View all posts
              </Link>
            </div>

            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {postsResponse.items.map((post) => (
                <PostCardUI
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  imageUrl={post.image}
                  readTime={estimateReadTime(post.excerpt || post.content)}
                  title={post.title}
                />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
