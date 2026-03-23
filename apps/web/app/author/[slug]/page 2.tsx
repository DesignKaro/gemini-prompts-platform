import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PromptCardUI } from '../../components/prompt-listing';
import {
  formatDisplayDate,
  getAuthorDetail,
  getPostCategoryName,
  getPostList,
  getPromptList,
} from '../../../lib/public-content';

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams?: Promise<{
    promptPage?: string;
    blogPage?: string;
  }>;
};

const PROMPT_PAGE_SIZE = 8;
const BLOG_PAGE_SIZE = 6;

export default async function AuthorDetailPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const resolvedSearchParams = await searchParams;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'http://localhost:30001';
  const author = await getAuthorDetail(slug);

  if (!author) {
    notFound();
  }

  const promptPage = Math.max(1, Number.parseInt(resolvedSearchParams?.promptPage ?? '1', 10) || 1);
  const blogPage = Math.max(1, Number.parseInt(resolvedSearchParams?.blogPage ?? '1', 10) || 1);

  const [promptsResponse, postsResponse] = await Promise.all([
    getPromptList({
      author: author.handle ?? author.slug,
      take: PROMPT_PAGE_SIZE,
      skip: (promptPage - 1) * PROMPT_PAGE_SIZE,
      sort: 'latest',
    }),
    getPostList({
      author: author.handle ?? author.slug,
      take: BLOG_PAGE_SIZE,
      skip: (blogPage - 1) * BLOG_PAGE_SIZE,
      sort: 'latest',
    }),
  ]);

  const promptTotalPages = Math.max(1, Math.ceil(promptsResponse.total / PROMPT_PAGE_SIZE));
  const blogTotalPages = Math.max(1, Math.ceil(postsResponse.total / BLOG_PAGE_SIZE));

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${baseUrl}/` },
      { '@type': 'ListItem', position: 2, name: 'Authors', item: `${baseUrl}/author` },
      {
        '@type': 'ListItem',
        position: 3,
        name: author.name,
        item: `${baseUrl}/author/${author.slug}`,
      },
    ],
  };

  return (
    <main className="bg-white px-4 pb-20 pt-12 font-normal sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <div className="mx-auto max-w-[1300px] space-y-12">
        <div className="rounded-[32px] border border-[#e2e6ee] bg-white p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-5 sm:flex-nowrap sm:justify-between">
            <div className="flex items-center gap-4">
              <div
                className="h-16 w-16 rounded-[22px] bg-cover bg-center"
                style={{
                  backgroundImage: `url(${
                    author.avatarUrl ||
                    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=80&w=400'
                  })`,
                }}
              />
              <div>
                <p className="text-[1.4rem] leading-[1.1] text-[#0f1116] sm:text-[1.6rem]">
                  {author.name}
                </p>
                <p className="mt-1 text-[0.92rem] text-[#6a7280] sm:text-[0.98rem]">
                  {author.profileTitle || 'Prompt creator'}
                </p>
                {author.handle ? (
                  <p className="mt-1 text-[0.82rem] text-[#9aa1ae]">@{author.handle}</p>
                ) : null}
              </div>
            </div>
            <div className="rounded-full border border-[#e2e6ee] px-4 py-2 text-[0.82rem] text-[#606874]">
              {author.promptCount ?? 0} prompt{author.promptCount === 1 ? '' : 's'}
            </div>
          </div>

          {author.bio ? (
            <p className="mt-5 max-w-[40rem] text-[0.95rem] leading-7 text-[#606874]">
              {author.bio}
            </p>
          ) : null}
        </div>

        <section className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-[1.4rem] text-[#0f1116] sm:text-[1.6rem]">Prompt library</h2>
              <p className="mt-1 text-[0.92rem] text-[#6a7280]">
                Public prompt packs shared by this creator.
              </p>
            </div>
            <Link
              href={`/author/${author.slug}/archive`}
              className="text-[0.95rem] font-medium text-[#111111] transition-colors hover:text-[#4b5563]"
            >
              View all prompts
            </Link>
          </div>

          {promptsResponse.items.length === 0 ? (
            <div className="rounded-[18px] border border-dashed border-[#d6dbe5] px-6 py-8 text-[0.9rem] text-[#7a8292]">
              No public prompts yet.
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {promptsResponse.items.map((prompt) => (
                <PromptCardUI key={prompt.id} prompt={prompt} />
              ))}
            </div>
          )}

          {promptTotalPages > 1 ? (
            <div className="flex flex-wrap items-center gap-2">
              {Array.from({ length: promptTotalPages }, (_, index) => index + 1).map(
                (pageNumber) => (
                  <Link
                    key={`prompt-page-${pageNumber}`}
                    href={`/author/${author.slug}?promptPage=${pageNumber}${blogPage > 1 ? `&blogPage=${blogPage}` : ''}`}
                    className={`h-9 w-9 rounded-full border text-center text-[0.9rem] leading-[2.2rem] ${
                      pageNumber === promptPage
                        ? 'border-[#111111] bg-[#111111] text-white'
                        : 'border-[#d8dce2] text-[#101010] hover:border-[#101010]'
                    }`}
                  >
                    {pageNumber}
                  </Link>
                ),
              )}
            </div>
          ) : null}
        </section>

        <section className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-[1.4rem] text-[#0f1116] sm:text-[1.6rem]">Blog posts</h2>
              <p className="mt-1 text-[0.92rem] text-[#6a7280]">
                Long-form posts and guides from this author.
              </p>
            </div>
            <Link
              href="/blog"
              className="text-[0.95rem] font-medium text-[#111111] transition-colors hover:text-[#4b5563]"
            >
              View all posts
            </Link>
          </div>

          {postsResponse.items.length === 0 ? (
            <div className="rounded-[18px] border border-dashed border-[#d6dbe5] px-6 py-8 text-[0.9rem] text-[#7a8292]">
              No posts yet.
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {postsResponse.items.map((post) => (
                <article
                  key={post.id}
                  className="flex h-full flex-col overflow-hidden rounded-[22px] border border-[#e6e9f2] bg-white"
                >
                  <Link href={`/blog/${post.slug}`}>
                    <div
                      role="img"
                      aria-label={`${post.title} cover`}
                      className="relative aspect-video w-full bg-cover bg-center"
                      style={{
                        backgroundImage: `url(${
                          post.image ||
                          'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&fm=jpg&ixlib=rb-4.1.0&q=80&w=1400'
                        })`,
                      }}
                    >
                      <span className="absolute left-4 top-4 rounded-full bg-[#d5ea52] px-4 py-2 text-[0.85rem] text-black">
                        {getPostCategoryName(post)}
                      </span>
                    </div>
                  </Link>
                  <div className="flex flex-1 flex-col px-5 py-5">
                    <h3 className="text-[1.15rem] leading-[1.3] text-[#0b0f18]">{post.title}</h3>
                    <div className="mt-4 flex flex-wrap items-center gap-2 text-[0.9rem] text-[#6b7382]">
                      <span>{formatDisplayDate(post.publishedAt || post.updatedAt)}</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          {blogTotalPages > 1 ? (
            <div className="flex flex-wrap items-center gap-2">
              {Array.from({ length: blogTotalPages }, (_, index) => index + 1).map((pageNumber) => (
                <Link
                  key={`blog-page-${pageNumber}`}
                  href={`/author/${author.slug}?blogPage=${pageNumber}${promptPage > 1 ? `&promptPage=${promptPage}` : ''}`}
                  className={`h-9 w-9 rounded-full border text-center text-[0.9rem] leading-[2.2rem] ${
                    pageNumber === blogPage
                      ? 'border-[#111111] bg-[#111111] text-white'
                      : 'border-[#d8dce2] text-[#101010] hover:border-[#101010]'
                  }`}
                >
                  {pageNumber}
                </Link>
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
