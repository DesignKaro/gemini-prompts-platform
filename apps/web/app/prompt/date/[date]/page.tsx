import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { PromptPageShell } from '../../../components/prompt-listing';
import { SeoSchemaScripts } from '../../../components/seo-schema-script';
import { getPromptList } from '../../../../lib/public-content';
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
    date: string;
  }>;
};

const PAGE_SIZE = 200;

function isValidDateParam(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function formatArchiveDate(value: string) {
  const parsedDate = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsedDate.getTime())) return value;
  return parsedDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export async function generateMetadata({ params }: PageProps) {
  const { date } = await params;
  if (!isValidDateParam(date)) {
    return buildMetadata({
      title: 'Prompt Archive Not Found',
      description: 'The requested prompt date archive could not be found.',
      path: '/prompt',
      noIndex: true,
    });
  }

  const dateLabel = formatArchiveDate(date);
  return buildMetadata({
    title: `Prompts on ${dateLabel}`,
    description: `Browse all published prompts archived on ${dateLabel}.`,
    path: `/prompt/date/${date}`,
  });
}

function PromptDateArchiveFallback() {
  return (
    <PromptPageShell
      title="Prompts by date"
      description="Browse all prompts published on this date."
      badge="Loading prompts..."
      breadcrumb="Archive date"
      breadcrumbHref="/prompts"
      defaultSort="newest"
      prompts={[]}
      isLoading
    />
  );
}

async function PromptDateArchiveContent({ params }: PageProps) {
  const { date } = await params;
  if (!isValidDateParam(date)) {
    notFound();
  }

  const dateStart = new Date(`${date}T00:00:00.000Z`);
  const dateEnd = new Date(dateStart);
  dateEnd.setUTCDate(dateEnd.getUTCDate() + 1);

  const firstPage = await getPromptList({
    take: PAGE_SIZE,
    skip: 0,
    sort: 'latest',
    publishedFrom: dateStart.toISOString(),
    publishedTo: dateEnd.toISOString(),
  });
  const allPrompts = [...firstPage.items];

  for (let skip = firstPage.items.length; skip < firstPage.total; skip += PAGE_SIZE) {
    const response = await getPromptList({
      take: PAGE_SIZE,
      skip,
      sort: 'latest',
      publishedFrom: dateStart.toISOString(),
      publishedTo: dateEnd.toISOString(),
    });
    allPrompts.push(...response.items);
  }

  const dateLabel = formatArchiveDate(date);
  const seoSettings = await getSeoSettings();
  const baseUrl = getNormalizedBaseUrl(seoSettings);
  const pageUrl = `${baseUrl}/prompt/date/${date}`;
  const shouldNoIndex = seoSettings.noindexPaginatedArchives;
  const schemaItems = [
    {
      family: 'webpage' as const,
      schema: buildWebPageSchema({
        url: pageUrl,
        name: `Prompts on ${dateLabel}`,
        description: `Browse all published prompts archived on ${dateLabel}.`,
      }),
    },
    {
      family: 'breadcrumb' as const,
      schema: buildBreadcrumbSchema(
        [
          { name: 'Home', item: `${baseUrl}/` },
          { name: 'Prompts', item: `${baseUrl}/prompt` },
          { name: dateLabel, item: pageUrl },
        ],
        pageUrl,
      ),
    },
    {
      family: 'collection' as const,
      schema: buildCollectionPageSchema({
        url: pageUrl,
        name: `Prompt archive for ${dateLabel}`,
        description: `Prompts published on ${dateLabel}.`,
      }),
    },
    {
      family: 'collection' as const,
      schema: buildItemListSchema({
        url: pageUrl,
        name: `Prompts on ${dateLabel}`,
        idSuffix: 'date-archive-prompts',
        items: buildPromptItemListEntries(allPrompts, baseUrl),
      }),
    },
  ].filter((entry) => Boolean(entry.schema));

  return (
    <>
      <SeoSchemaScripts items={schemaItems} noIndex={shouldNoIndex} />
      <PromptPageShell
        title={`Prompts on ${dateLabel}`}
        description={`Browse all published prompts archived on ${dateLabel}.`}
        badge={`${allPrompts.length} prompts`}
        breadcrumb={dateLabel}
        breadcrumbHref={`/prompt/date/${date}`}
        defaultSort="newest"
        prompts={allPrompts}
      />
    </>
  );
}

export default function PromptDateArchivePage({ params }: PageProps) {
  return (
    <Suspense fallback={<PromptDateArchiveFallback />}>
      <PromptDateArchiveContent params={params} />
    </Suspense>
  );
}
