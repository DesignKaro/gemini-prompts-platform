import { PromptPageShell } from '../components/prompt-listing';
import { getPromptList } from '../../lib/public-content';

export const metadata = {
  title: 'Trending Prompts — Gemini Prompts',
  description: 'The most-liked and talked-about prompts right now. Curated weekly for builders, creators, and teams.',
};

export default async function TrendingPage() {
  const prompts = await getPromptList({ take: 72, sort: 'trending' });
  return (
    <PromptPageShell
      title="Trending Prompts"
      description="The most-liked and talked-about prompts right now. Curated weekly for builders, creators, and teams."
      badge="Curated weekly"
      breadcrumb="Trending"
      breadcrumbHref="/trending"
      defaultSort="most-liked"
      prompts={prompts.items}
    />
  );
}
