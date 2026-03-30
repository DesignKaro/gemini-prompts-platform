import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PromptPageShell } from '../../../components/prompt-listing';
import { getPromptList, getTagDetail } from '../../../../lib/public-content';
import { notFound } from 'next/navigation';
import { SeoSchemaScripts } from '../../../components/seo-schema-script';
import { buildMetadata, getNormalizedBaseUrl, getSeoSettings } from '../../../../lib/seo';
import {
  buildBreadcrumbSchema,
  buildCollectionPageSchema,
  buildItemListSchema,
  buildPromptItemListEntries,
  buildWebPageSchema,
} from '../../../../lib/structured-data';

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const [tag, settings] = await Promise.all([getTagDetail(slug), getSeoSettings()]);

  if (!tag) {
    return buildMetadata({
      title: 'Tag Not Found',
      description: 'The requested tag could not be found.',
      path: '/tag',
      noIndex: true,
    });
  }

  return buildMetadata({
    title: `#${tag.name} prompts`,
    description: tag.description || `Every published prompt tagged with ${tag.name}.`,
    path: `/tag/${tag.slug}/archive`,
    noIndex: settings.noindexTagPages || settings.noindexPaginatedArchives,
  });
}

function TagPromptArchiveFallback() {
  return (
    <PromptPageShell
      title="Tag prompts"
      description="Every published prompt for this tag."
      badge="Loading prompts..."
      breadcrumb="Tag"
      breadcrumbHref="/tag"
      defaultSort="newest"
      prompts={[]}
      isLoading
    />
  );
}

async function TagPromptArchiveContent({ params }: PageProps) {
  const { slug } = await params;
  const [tag, seoSettings] = await Promise.all([getTagDetail(slug), getSeoSettings()]);
  if (!tag) {
    notFound();
  }

  const prompts = await getPromptList({ tag: tag.slug, take: 72, sort: 'latest' });
  const baseUrl = getNormalizedBaseUrl(seoSettings);
  const pageUrl = `${baseUrl}/tag/${tag.slug}/archive`;
  const shouldNoIndex = seoSettings.noindexTagPages || seoSettings.noindexPaginatedArchives;
  const schemaItems = [
    {
      family: 'webpage' as const,
      schema: buildWebPageSchema({
        url: pageUrl,
        name: `#${tag.name} prompts`,
        description: tag.description || `Every published prompt tagged with ${tag.name}.`,
      }),
    },
    {
      family: 'breadcrumb' as const,
      schema: buildBreadcrumbSchema(
        [
          { name: 'Home', item: `${baseUrl}/` },
          { name: 'Tags', item: `${baseUrl}/tag` },
          { name: tag.name, item: `${baseUrl}/tag/${tag.slug}` },
          { name: 'Archive', item: pageUrl },
        ],
        pageUrl,
      ),
    },
    {
      family: 'collection' as const,
      schema: buildCollectionPageSchema({
        url: pageUrl,
        name: `${tag.name} prompt archive`,
        description: tag.description || undefined,
      }),
    },
    {
      family: 'collection' as const,
      schema: buildItemListSchema({
        url: pageUrl,
        name: `${tag.name} prompt list`,
        idSuffix: 'tag-archive-prompts',
        items: buildPromptItemListEntries(prompts.items, baseUrl),
      }),
    },
  ].filter((entry) => Boolean(entry.schema));

  return (
    <>
      <SeoSchemaScripts items={schemaItems} noIndex={shouldNoIndex} />
      <PromptPageShell
        title={`#${tag.name} prompts`}
        description={tag.description || `Every published prompt tagged with ${tag.name}.`}
        badge={`${prompts.total} prompts`}
        breadcrumb={tag.name}
        breadcrumbHref={`/tag/${tag.slug}`}
        defaultSort="newest"
        prompts={prompts.items}
      />
    </>
  );
}

export default function TagPromptArchivePage({ params }: PageProps) {
  return (
    <Suspense fallback={<TagPromptArchiveFallback />}>
      <TagPromptArchiveContent params={params} />
    </Suspense>
  );
}
