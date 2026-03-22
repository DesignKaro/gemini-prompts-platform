import { PromptPageShell } from '../../../components/prompt-listing';
import { getPromptList, getTagDetail } from '../../../../lib/public-content';
import { notFound } from 'next/navigation';

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function TagPromptArchivePage({ params }: PageProps) {
  const { slug } = await params;
  const tag = await getTagDetail(slug);
  if (!tag) {
    notFound();
  }

  const prompts = await getPromptList({ tag: tag.slug, take: 72, sort: 'latest' });

  return (
    <PromptPageShell
      title={`#${tag.name} prompts`}
      description={tag.description || `Every published prompt tagged with ${tag.name}.`}
      badge={`${prompts.total} prompts`}
      breadcrumb={tag.name}
      breadcrumbHref={`/tag/${tag.slug}`}
      defaultSort="newest"
      prompts={prompts.items}
    />
  );
}
