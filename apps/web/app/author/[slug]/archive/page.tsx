import { redirect } from 'next/navigation';

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function LegacyAuthorArchiveRedirect({ params }: PageProps) {
  const { slug } = await params;
  redirect(`/u/${encodeURIComponent(slug)}/archive`);
}
