import HomePageClient from './home-page-client';
import {
  getAuthorList,
  getHomeContent,
  getPromptList,
  type HomeResponse,
  type ListResponse,
  type PublicAuthor,
  type PublicPrompt,
} from '../lib/public-content';

export default async function HomePage() {
  let initialHomeContent: HomeResponse | null = null;
  let initialLatestPrompts: ListResponse<PublicPrompt> | null = null;
  let initialTrendingAuthors: ListResponse<PublicAuthor> | null = null;

  try {
    initialHomeContent = await getHomeContent();
  } catch {
    initialHomeContent = null;
  }

  try {
    initialLatestPrompts = await getPromptList({
      sort: 'latest',
      take: 8,
      skip: 0,
      includeTags: 1,
    });
  } catch {
    initialLatestPrompts = null;
  }

  try {
    initialTrendingAuthors = await getAuthorList({
      take: 12,
      sort: 'popular',
    });
  } catch {
    initialTrendingAuthors = null;
  }

  return (
    <HomePageClient
      initialHomeContent={initialHomeContent}
      initialLatestPrompts={initialLatestPrompts}
      initialTrendingAuthors={initialTrendingAuthors}
    />
  );
}
