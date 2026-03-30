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
    title: 'Latest Prompts',
    description:
      'The most recently published prompts on Gemini Prompts. Updated daily with fresh prompt ideas for builders, creators, and teams.',
    path: '/latest',
    noIndex: settings.noindexStaticPages,
  });
}

function LatestPageFallback() {
  return (
    <PromptPageShell
      title="Latest Prompts"
      description="Fresh prompt ideas added daily. Browse the most recently published prompts for builders, creators, and teams."
      badge="Updated daily"
      breadcrumb="Latest"
      breadcrumbHref="/latest"
      defaultSort="newest"
      prompts={[]}
      isLoading
    />
  );
}

async function LatestPageContent() {
  const [prompts, settings] = await Promise.all([
    getPromptList({ take: 72, sort: 'latest' }),
    getSeoSettings(),
  ]);
  const baseUrl = getNormalizedBaseUrl(settings);
  const pageUrl = `${baseUrl}/latest`;
  const schemaItems = [
    {
      family: 'webpage' as const,
      schema: buildWebPageSchema({
        url: pageUrl,
        name: 'Latest Prompts',
        description:
          'The most recently published prompts on Gemini Prompts. Updated daily with fresh prompt ideas for builders, creators, and teams.',
      }),
    },
    {
      family: 'breadcrumb' as const,
      schema: buildBreadcrumbSchema(
        [
          { name: 'Home', item: `${baseUrl}/` },
          { name: 'Latest', item: pageUrl },
        ],
        pageUrl,
      ),
    },
    {
      family: 'collection' as const,
      schema: buildCollectionPageSchema({
        url: pageUrl,
        name: 'Latest prompts',
        description: 'Fresh prompt ideas added daily.',
      }),
    },
    {
      family: 'collection' as const,
      schema: buildItemListSchema({
        url: pageUrl,
        name: 'Latest prompt list',
        idSuffix: 'latest-prompts',
        items: buildPromptItemListEntries(prompts.items, baseUrl),
      }),
    },
  ].filter((entry) => Boolean(entry.schema));

  return (
    <>
      <SeoSchemaScripts items={schemaItems} noIndex={settings.noindexStaticPages} />
      <PromptPageShell
        title="Latest Prompts"
        description="Fresh prompt ideas added daily. Browse the most recently published prompts for builders, creators, and teams."
        badge="Updated daily"
        breadcrumb="Latest"
        breadcrumbHref="/latest"
        defaultSort="newest"
        prompts={prompts.items}
      />
    </>
  );
}

export default function LatestPage() {
  return (
    <Suspense fallback={<LatestPageFallback />}>
      <LatestPageContent />
    </Suspense>
  );
}
