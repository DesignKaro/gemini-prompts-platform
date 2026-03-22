import { notFound } from 'next/navigation';
import { PromptPageShell } from '../../../components/prompt-listing';
import { getAuthorDetail, getPromptList } from '../../../../lib/public-content';

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function AuthorPromptArchivePage({ params }: PageProps) {
  const { slug } = await params;
  const [author, prompts] = await Promise.all([
    getAuthorDetail(slug),
    getPromptList({
      author: slug,
      take: 72,
      sort: 'latest',
    }),
  ]);

  if (!author) {
    notFound();
  }

  return (
    <PromptPageShell
      title={`${author.name}'s prompts`}
      description={author.bio || 'A full archive of published prompts from this author.'}
      badge={`${prompts.total} prompts`}
      badgeNoBorder
      breadcrumb={author.name}
      breadcrumbHref={`/author/${author.slug}`}
      defaultSort="newest"
      prompts={prompts.items}
      followAuthorId={author.id}
      followInitialFollowerCount={author.followerCount ?? 0}
    />
  );
}
