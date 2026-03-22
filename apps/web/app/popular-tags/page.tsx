import Link from 'next/link';
import { getTagList } from '../../lib/public-content';

export const metadata = {
  title: 'Popular Tags — Gemini Prompts',
  description: 'Most used tags across prompts and posts.',
};

export default async function PopularTagsPage() {
  const tagsResponse = await getTagList({ take: 60, sort: 'popular' });

  return (
    <main className="page-shell bg-white">
      <div className="page-container-reading space-y-8">
        <div>
          <h1 className="section-heading-medium text-[2.4rem] leading-[1.05] tracking-[-0.04em] text-[#111118] sm:text-[3rem]">
            Popular tags
          </h1>
          <p className="mt-3 max-w-[620px] text-[1.05rem] leading-[1.7] text-[#5f6773]">
            The most-used tags across published prompts and blog posts.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {tagsResponse.items.map((tag) => (
            <Link
              key={tag.id}
              href={`/tag/${tag.slug}`}
              className="inline-flex items-center gap-2 rounded-full bg-[#f1f3f8] px-4 py-2 text-[0.95rem] text-[#2f3440] transition-colors hover:bg-[#e7ebf2]"
            >
              <span>#{tag.name}</span>
              <span className="rounded-full bg-white px-2 py-0.5 text-[0.75rem] text-[#6b7280]">
                {tag.usage}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
