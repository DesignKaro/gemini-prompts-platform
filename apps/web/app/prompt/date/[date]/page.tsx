import { notFound } from 'next/navigation';
import { PromptPageShell } from '../../../components/prompt-listing';
import { getPromptList } from '../../../../lib/public-content';

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

export default async function PromptDateArchivePage({ params }: PageProps) {
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

  return (
    <PromptPageShell
      title={`Prompts on ${dateLabel}`}
      description={`Browse all published prompts archived on ${dateLabel}.`}
      badge={`${allPrompts.length} prompts`}
      breadcrumb={dateLabel}
      breadcrumbHref={`/prompt/date/${date}`}
      defaultSort="newest"
      prompts={allPrompts}
    />
  );
}
