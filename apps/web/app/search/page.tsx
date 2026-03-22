import Link from 'next/link';
import { PostCardUI } from '../components/post-card';
import { PromptCardUI } from '../components/prompt-listing';
import { estimateReadTime, searchPublicContent } from '../../lib/public-content';

type PageProps = {
  searchParams?: Promise<{
    q?: string;
  }>;
};

export const metadata = {
  title: 'Search — Gemini Prompts',
  description: 'Search prompts, posts, categories, tags, and authors.',
};

export default async function SearchPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const query = resolvedSearchParams?.q?.trim() ?? '';
  const results = query ? await searchPublicContent(query, 8) : null;

  return (
    <main className="page-shell bg-white">
      <div className="page-container-reading space-y-10">
        <div className="space-y-4">
          <h1 className="section-heading-medium text-[2.4rem] leading-[1.05] tracking-[-0.04em] text-[#111118] sm:text-[3rem]">
            Search
          </h1>
          <form className="flex w-full flex-col gap-3 sm:flex-row">
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Search prompts, posts, tags..."
              className="w-full rounded-[14px] border border-[#e1e5ee] bg-white px-4 py-3 text-[1rem] text-[#111111] outline-none focus:border-[#111111]"
            />
            <button
              type="submit"
              className="rounded-[14px] bg-[#111111] px-6 py-3 text-[0.95rem] font-medium text-white"
            >
              Search
            </button>
          </form>
          {query ? (
            <p className="text-[0.95rem] text-[#6b7280]">
              Showing results for <span className="font-medium text-[#111111]">{query}</span>
            </p>
          ) : (
            <p className="text-[0.95rem] text-[#6b7280]">
              Start typing to search the live catalog.
            </p>
          )}
        </div>

        {results ? (
          <div className="space-y-12">
            {results.prompts.length > 0 ? (
              <section>
                <h2 className="text-[1.4rem] font-medium text-[#0f1116]">Prompts</h2>
                <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  {results.prompts.map((prompt) => (
                    <PromptCardUI key={prompt.id} prompt={prompt} />
                  ))}
                </div>
              </section>
            ) : null}

            {results.posts.length > 0 ? (
              <section>
                <h2 className="text-[1.4rem] font-medium text-[#0f1116]">Posts</h2>
                <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {results.posts.map((post) => (
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

            {results.categories.length > 0 ? (
              <section>
                <h2 className="text-[1.4rem] font-medium text-[#0f1116]">Categories</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {results.categories.map((category) => (
                    <Link
                      key={category.id}
                      href={`/category/${category.slug}`}
                      className="rounded-full border border-[#e1e5ee] px-4 py-2 text-[0.9rem] text-[#111111]"
                    >
                      {category.name}
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}

            {results.tags.length > 0 ? (
              <section>
                <h2 className="text-[1.4rem] font-medium text-[#0f1116]">Tags</h2>
                <div className="mt-4 flex flex-wrap gap-2">
                  {results.tags.map((tag) => (
                    <Link
                      key={tag.id}
                      href={`/tag/${tag.slug}`}
                      className="rounded-full bg-[#f1f3f8] px-4 py-2 text-[0.9rem] text-[#2f3440]"
                    >
                      #{tag.name}
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}

            {results.authors.length > 0 ? (
              <section>
                <h2 className="text-[1.4rem] font-medium text-[#0f1116]">Authors</h2>
                <div className="mt-4 flex flex-wrap gap-3">
                  {results.authors.map((author) => (
                    <Link
                      key={author.id}
                      href={`/author/${author.slug}`}
                      className="inline-flex items-center gap-2 rounded-full border border-[#e1e5ee] px-4 py-2 text-[0.9rem] text-[#111111]"
                    >
                      <span>{author.name}</span>
                      {author.promptCount !== undefined ? (
                        <span className="text-[0.8rem] text-[#6b7280]">
                          {author.promptCount} prompts
                        </span>
                      ) : null}
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        ) : null}
      </div>
    </main>
  );
}
