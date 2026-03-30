import Link from 'next/link';
import { SeoSchemaScripts } from '../components/seo-schema-script';
import { getTagList } from '../../lib/public-content';
import { buildMetadata, getNormalizedBaseUrl, getSeoSettings } from '../../lib/seo';
import {
  buildBreadcrumbSchema,
  buildCollectionPageSchema,
  buildItemListSchema,
  buildWebPageSchema,
} from '../../lib/structured-data';

export async function generateMetadata() {
  const settings = await getSeoSettings();

  return buildMetadata({
    title: 'Popular Tags',
    description: 'Most used tags across prompts and posts.',
    path: '/popular-tags',
    noIndex: settings.noindexStaticPages,
  });
}

export default async function PopularTagsPage() {
  const settings = await getSeoSettings();
  const baseUrl = getNormalizedBaseUrl();
  const pageUrl = new URL('/popular-tags', baseUrl).toString();
  const tagsResponse = await getTagList({ take: 60, sort: 'popular' });

  const schemaItems = [
    {
      family: 'webpage' as const,
      schema: buildWebPageSchema({
        url: pageUrl,
        name: 'Popular tags | Gemini Prompts',
        description: 'Most used tags across prompts and posts.',
        keywords: ['popular tags', 'gemini prompt tags', 'ai prompt tags'],
      }),
    },
    {
      family: 'breadcrumb' as const,
      schema: buildBreadcrumbSchema(
        [
          { name: 'Home', item: baseUrl },
          { name: 'Popular Tags', item: pageUrl },
        ],
        pageUrl,
      ),
    },
    {
      family: 'collection' as const,
      schema: buildCollectionPageSchema({
        url: pageUrl,
        name: 'Popular tags',
        description: 'Most used tags across prompts and posts.',
        idSuffix: 'popular-tags',
      }),
    },
    {
      family: 'collection' as const,
      schema: buildItemListSchema({
        url: pageUrl,
        name: 'Popular tag list',
        idSuffix: 'popular-tags-items',
        items: tagsResponse.items.map((tag) => ({
          name: `#${tag.name}`,
          url: new URL(`/tag/${tag.slug}`, baseUrl).toString(),
        })),
      }),
    },
  ].filter((entry) => Boolean(entry.schema));

  return (
    <main className="page-shell bg-white">
      <SeoSchemaScripts items={schemaItems} noIndex={settings.noindexStaticPages} />
      <div className="page-container-reading space-y-8">
        <div>
          <h1 className="section-heading-medium text-[2.4rem] leading-[1.05] tracking-[-0.04em] text-[#111118] sm:text-[3rem]">
            Popular tags
          </h1>
          <p className="mt-3 max-w-[620px] text-[1.05rem] leading-[1.7] text-[#5f6773]">
            The most-used tags across published prompts and blog posts.
          </p>
        </div>

        {tagsResponse.items.length === 0 ? (
          <div className="rounded-[16px] bg-[#f8fafc] px-4 py-3 text-[0.95rem] text-[#6f7786]">
            No tags available yet.
          </div>
        ) : (
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
        )}
      </div>
    </main>
  );
}
