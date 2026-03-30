import { Suspense } from 'react';
import { PromptPageShell } from '../components/prompt-listing';
import { SeoSchemaScripts } from '../components/seo-schema-script';
import { getAllPromptList } from '../../lib/public-content';
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
    title: 'Exclusive Prompts',
    description: 'Premium and members-only prompt collections published on Gemini Prompts.',
    path: '/exclusive',
    noIndex: settings.noindexStaticPages,
  });
}

function ExclusivePromptsPageFallback() {
  return (
    <PromptPageShell
      title="Exclusive Prompts"
      description="Premium prompt collections, advanced frameworks, and gated prompt packs from the dashboard."
      badge="Members collection"
      breadcrumb="Exclusive"
      breadcrumbHref="/exclusive"
      defaultSort="newest"
      prompts={[]}
      isLoading
    />
  );
}

async function ExclusivePromptsPageContent() {
  const [prompts, settings] = await Promise.all([
    getAllPromptList(
      {
        sort: 'latest',
        visibility: 'EXCLUSIVE',
      },
      undefined,
      { pageSize: 72, maxPages: 40 },
    ),
    getSeoSettings(),
  ]);
  const baseUrl = getNormalizedBaseUrl(settings);
  const pageUrl = `${baseUrl}/exclusive`;
  const schemaItems = [
    {
      family: 'webpage' as const,
      schema: buildWebPageSchema({
        url: pageUrl,
        name: 'Exclusive Prompts',
        description: 'Premium and members-only prompt collections published on Gemini Prompts.',
      }),
    },
    {
      family: 'breadcrumb' as const,
      schema: buildBreadcrumbSchema(
        [
          { name: 'Home', item: `${baseUrl}/` },
          { name: 'Exclusive', item: pageUrl },
        ],
        pageUrl,
      ),
    },
    {
      family: 'collection' as const,
      schema: buildCollectionPageSchema({
        url: pageUrl,
        name: 'Exclusive prompts',
        description: 'Members-only prompt collection.',
      }),
    },
    {
      family: 'collection' as const,
      schema: buildItemListSchema({
        url: pageUrl,
        name: 'Exclusive prompt list',
        idSuffix: 'exclusive-prompts',
        items: buildPromptItemListEntries(prompts.items, baseUrl),
      }),
    },
  ].filter((entry) => Boolean(entry.schema));

  return (
    <>
      <SeoSchemaScripts items={schemaItems} noIndex={settings.noindexStaticPages} />
      <PromptPageShell
        title="Exclusive Prompts"
        description="Premium prompt collections, advanced frameworks, and gated prompt packs from the dashboard."
        badge="Members collection"
        breadcrumb="Exclusive"
        breadcrumbHref="/exclusive"
        defaultSort="newest"
        prompts={prompts.items}
      />
    </>
  );
}

export default function ExclusivePromptsPage() {
  return (
    <Suspense fallback={<ExclusivePromptsPageFallback />}>
      <ExclusivePromptsPageContent />
    </Suspense>
  );
}
