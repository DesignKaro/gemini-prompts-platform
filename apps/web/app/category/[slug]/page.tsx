import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PostCardUI } from '../../components/post-card';
import { PromptCardUI } from '../../components/prompt-listing';
import {
  estimateReadTime,
  getCategoryDetail,
  getPostList,
  getPromptList,
} from '../../../lib/public-content';

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function CategoryDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'http://localhost:30001';
  const category = await getCategoryDetail(slug);

  if (!category) {
    notFound();
  }

  const [promptsResponse, postsResponse] = await Promise.all([
    getPromptList({ category: category.slug, take: 12, sort: 'latest' }),
    getPostList({ category: category.slug, take: 6, sort: 'latest' }),
  ]);
  const categoryImageUrl =
    category.imageUrl ||
    'https://images.unsplash.com/photo-1487058792275-0ad4aaf24ca7?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=80&w=1400';

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${baseUrl}/` },
      { '@type': 'ListItem', position: 2, name: 'Categories', item: `${baseUrl}/category` },
      {
        '@type': 'ListItem',
        position: 3,
        name: category.name,
        item: `${baseUrl}/category/${category.slug}`,
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

      <div className="page-container space-y-12">
        <div className="grid gap-8 lg:grid-cols-[60%_1fr] lg:items-center">
          <div className="space-y-5">
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
                    <Link href="/category" className="transition-colors hover:text-[#101010]">
                      Categories
                    </Link>
                  </li>
                  <li className="text-[#c0c6d1]">/</li>
                  <li className="font-medium text-[#101010]">{category.name}</li>
                </ol>
              </nav>
              <h1 className="section-heading-medium mt-4 text-[2.6rem] leading-[1.05] tracking-[-0.04em] text-[#111118] sm:text-[3.2rem]">
                {category.name}
              </h1>
              <p className="mt-3 max-w-full whitespace-pre-line text-[1.05rem] leading-[1.7] text-[#5f6773]">
                {category.description || 'Live prompts and posts curated from the dashboard.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-[0.9rem] text-[#4b525e]">
              <span className="rounded-full bg-[#f1f4f8] px-4 py-2">
                {category.promptCount} prompts
              </span>
              <span className="rounded-full bg-[#f1f4f8] px-4 py-2">
                {category.postCount} posts
              </span>
            </div>
          </div>

          <div
            role="img"
            aria-label={`${category.name} featured image`}
            className="aspect-[4/3] w-full rounded-[28px] bg-cover bg-center shadow-[0_20px_60px_rgba(15,17,22,0.08)]"
            style={{ backgroundImage: `url(${categoryImageUrl})` }}
          />
        </div>

        {promptsResponse.items.length > 0 ? (
          <section>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-[1.6rem] font-medium tracking-[-0.02em] text-[#0b0f18]">
                  Latest prompts
                </h2>
                <p className="mt-2 text-[1rem] leading-[1.7] text-[#5f6773]">
                  Recently published prompts in this category.
                </p>
              </div>
              <Link
                href="/prompt"
                className="inline-flex items-center rounded-full bg-[#d5ea52] px-5 py-2.5 text-[0.95rem] font-medium text-black transition-all hover:translate-y-[-1px] hover:opacity-95"
              >
                View all prompts
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
                  Category posts
                </h2>
                <p className="mt-2 text-[1rem] leading-[1.7] text-[#5f6773]">
                  Editorial posts and guides tied to this category.
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
