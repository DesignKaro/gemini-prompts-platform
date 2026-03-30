import { Suspense } from 'react';
import { PromptPageShell } from '../components/prompt-listing';
import { SeoSchemaScripts } from '../components/seo-schema-script';
import { getPromptList } from '../../lib/public-content';
import { buildMetadata, getNormalizedBaseUrl, getSeoSettings } from '../../lib/seo';
import {
  buildBreadcrumbSchema,
  buildCollectionPageSchema,
  buildItemListSchema,
  buildPromptItemListEntries,
  buildWebPageSchema,
} from '../../lib/structured-data';

export async function generateMetadata() {
  const settings = await getSeoSettings();

  return buildMetadata({
    title: 'Most Popular Prompts',
    description:
      'The all-time most popular prompts on Gemini Prompts — ranked by total likes and community engagement.',
    path: '/most-popular',
    noIndex: settings.noindexStaticPages,
  });
}

function MostPopularPageFallback() {
  return (
    <PromptPageShell
      title="Most Popular"
      description="All-time community favourites ranked by likes and engagement. The prompts people keep coming back to."
      badge="All-time best"
      breadcrumb="Most Popular"
      breadcrumbHref="/most-popular"
      defaultSort="most-liked"
      prompts={[]}
      isLoading
    />
  );
}

async function MostPopularPageContent() {
  const [prompts, settings] = await Promise.all([
    getPromptList({ take: 72, sort: 'popular' }),
    getSeoSettings(),
  ]);
  const baseUrl = getNormalizedBaseUrl(settings);
  const pageUrl = `${baseUrl}/most-popular`;
  const schemaItems = [
    {
      family: 'webpage' as const,
      schema: buildWebPageSchema({
        url: pageUrl,
        name: 'Most Popular Prompts',
        description:
          'The all-time most popular prompts on Gemini Prompts — ranked by total likes and community engagement.',
      }),
    },
    {
      family: 'breadcrumb' as const,
      schema: buildBreadcrumbSchema(
        [
          { name: 'Home', item: `${baseUrl}/` },
          { name: 'Most Popular', item: pageUrl },
        ],
        pageUrl,
      ),
    },
    {
      family: 'collection' as const,
      schema: buildCollectionPageSchema({
        url: pageUrl,
        name: 'Most popular prompts',
        description: 'All-time community favorites.',
      }),
    },
    {
      family: 'collection' as const,
      schema: buildItemListSchema({
        url: pageUrl,
        name: 'Most popular prompt list',
        idSuffix: 'most-popular-prompts',
        items: buildPromptItemListEntries(prompts.items, baseUrl),
      }),
    },
  ].filter((entry) => Boolean(entry.schema));

  return (
    <>
      <SeoSchemaScripts items={schemaItems} noIndex={settings.noindexStaticPages} />
      <PromptPageShell
        title="Most Popular"
        description="All-time community favourites ranked by likes and engagement. The prompts people keep coming back to."
        badge="All-time best"
        breadcrumb="Most Popular"
        breadcrumbHref="/most-popular"
        defaultSort="most-liked"
        prompts={prompts.items}
      />
    </>
  );
}

export default function MostPopularPage() {
  return (
    <Suspense fallback={<MostPopularPageFallback />}>
      <MostPopularPageContent />
    </Suspense>
  );
}
