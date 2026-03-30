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
    title: 'Trending Prompts',
    description:
      'The most-liked and talked-about prompts right now. Curated weekly for builders, creators, and teams.',
    path: '/trending',
    noIndex: settings.noindexStaticPages,
  });
}

function TrendingPageFallback() {
  return (
    <PromptPageShell
      title="Trending Prompts"
      description="The most-liked and talked-about prompts right now. Curated weekly for builders, creators, and teams."
      badge="Curated weekly"
      breadcrumb="Trending"
      breadcrumbHref="/trending"
      defaultSort="most-liked"
      prompts={[]}
      isLoading
    />
  );
}

async function TrendingPageContent() {
  const [prompts, settings] = await Promise.all([
    getPromptList({ take: 72, sort: 'trending' }),
    getSeoSettings(),
  ]);
  const baseUrl = getNormalizedBaseUrl(settings);
  const pageUrl = `${baseUrl}/trending`;
  const schemaItems = [
    {
      family: 'webpage' as const,
      schema: buildWebPageSchema({
        url: pageUrl,
        name: 'Trending Prompts',
        description:
          'The most-liked and talked-about prompts right now. Curated weekly for builders, creators, and teams.',
      }),
    },
    {
      family: 'breadcrumb' as const,
      schema: buildBreadcrumbSchema(
        [
          { name: 'Home', item: `${baseUrl}/` },
          { name: 'Trending', item: pageUrl },
        ],
        pageUrl,
      ),
    },
    {
      family: 'collection' as const,
      schema: buildCollectionPageSchema({
        url: pageUrl,
        name: 'Trending prompts',
        description: 'Most-liked and talked-about prompts.',
      }),
    },
    {
      family: 'collection' as const,
      schema: buildItemListSchema({
        url: pageUrl,
        name: 'Trending prompt list',
        idSuffix: 'trending-prompts',
        items: buildPromptItemListEntries(prompts.items, baseUrl),
      }),
    },
  ].filter((entry) => Boolean(entry.schema));

  return (
    <>
      <SeoSchemaScripts items={schemaItems} noIndex={settings.noindexStaticPages} />
      <PromptPageShell
        title="Trending Prompts"
        description="The most-liked and talked-about prompts right now. Curated weekly for builders, creators, and teams."
        badge="Curated weekly"
        breadcrumb="Trending"
        breadcrumbHref="/trending"
        defaultSort="most-liked"
        prompts={prompts.items}
      />
    </>
  );
}

export default function TrendingPage() {
  return (
    <Suspense fallback={<TrendingPageFallback />}>
      <TrendingPageContent />
    </Suspense>
  );
}
