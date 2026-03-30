import type { Metadata } from 'next';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { PromptPageShell } from '../../../components/prompt-listing';
import { SeoSchemaScripts } from '../../../components/seo-schema-script';
import { getAuthorDetail, getPromptList } from '../../../../lib/public-content';
import { buildMetadata, getNormalizedBaseUrl, getSeoSettings } from '../../../../lib/seo';
import {
  buildBreadcrumbSchema,
  buildCollectionPageSchema,
  buildItemListSchema,
  buildProfileSchemas,
  buildPromptItemListEntries,
  buildWebPageSchema,
} from '../../../../lib/structured-data';

type PageProps = {
  params: Promise<{
    handle: string;
  }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { handle } = await params;
  const [author, settings] = await Promise.all([getAuthorDetail(handle), getSeoSettings()]);

  if (!author) {
    return buildMetadata({
      title: 'Author Not Found',
      description: 'The requested author profile could not be found.',
      path: '/author',
      noIndex: true,
    });
  }

  return buildMetadata({
    title: `${author.name}'s prompts`,
    description: author.bio || 'A full archive of published prompts from this author.',
    path: `/u/${author.handle || author.slug}/archive`,
    image: author.avatarUrl,
    type: 'profile',
    noIndex: settings.noindexAuthorPages || settings.noindexPaginatedArchives,
  });
}

function AuthorPromptArchiveFallback() {
  return (
    <PromptPageShell
      title="Author prompts"
      description="A full archive of published prompts from this author."
      badge="Loading prompts..."
      badgeNoBorder
      breadcrumb="Author"
      breadcrumbHref="/prompts"
      defaultSort="newest"
      prompts={[]}
      isLoading
    />
  );
}

async function AuthorPromptArchiveContent({ params }: PageProps) {
  const { handle } = await params;
  const [author, prompts, seoSettings] = await Promise.all([
    getAuthorDetail(handle),
    getPromptList({
      author: handle,
      take: 72,
      sort: 'latest',
    }),
    getSeoSettings(),
  ]);

  if (!author) {
    notFound();
  }

  const baseUrl = getNormalizedBaseUrl(seoSettings);
  const authorPath = author.handle || author.slug;
  const profileUrl = `${baseUrl}/u/${authorPath}`;
  const pageUrl = `${profileUrl}/archive`;
  const shouldNoIndex = seoSettings.noindexAuthorPages || seoSettings.noindexPaginatedArchives;
  const schemaItems = [
    {
      family: 'webpage' as const,
      schema: buildWebPageSchema({
        url: pageUrl,
        name: `${author.name}'s prompts`,
        description: author.bio || 'A full archive of published prompts from this author.',
      }),
    },
    {
      family: 'breadcrumb' as const,
      schema: buildBreadcrumbSchema(
        [
          { name: 'Home', item: `${baseUrl}/` },
          { name: author.name, item: profileUrl },
          { name: 'Archive', item: pageUrl },
        ],
        pageUrl,
      ),
    },
    ...buildProfileSchemas({
      profileUrl,
      personName: author.name,
      description: author.bio,
      image: author.avatarUrl,
      jobTitle: author.profileTitle,
    }),
    {
      family: 'collection' as const,
      schema: buildCollectionPageSchema({
        url: pageUrl,
        name: `${author.name} prompt archive`,
        description: author.bio || undefined,
      }),
    },
    {
      family: 'collection' as const,
      schema: buildItemListSchema({
        url: pageUrl,
        name: `${author.name} prompt list`,
        idSuffix: 'author-archive-prompts',
        items: buildPromptItemListEntries(prompts.items, baseUrl),
      }),
    },
  ].filter(
    (
      entry,
    ): entry is
      | { family: 'webpage' | 'breadcrumb' | 'collection'; schema: Record<string, unknown> }
      | { family: 'profile'; schema: Record<string, unknown> } => Boolean(entry.schema),
  );

  return (
    <>
      <SeoSchemaScripts items={schemaItems} noIndex={shouldNoIndex} />
      <PromptPageShell
        title={`${author.name}'s prompts`}
        description={author.bio || 'A full archive of published prompts from this author.'}
        badge={`${prompts.total} prompts`}
        badgeNoBorder
        breadcrumb={author.name}
        breadcrumbHref={`/u/${author.slug}`}
        defaultSort="newest"
        prompts={prompts.items}
        followAuthorId={author.id}
        followInitialFollowerCount={author.followerCount ?? 0}
      />
    </>
  );
}

export default function AuthorPromptArchivePage({ params }: PageProps) {
  return (
    <Suspense fallback={<AuthorPromptArchiveFallback />}>
      <AuthorPromptArchiveContent params={params} />
    </Suspense>
  );
}
