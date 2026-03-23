import { PromptPageShell } from '../components/prompt-listing';
import { getPromptList } from '../../lib/public-content';

export const metadata = {
  title: 'Most Popular Prompts — Gemini Prompts',
  description:
    'The all-time most popular prompts on Gemini Prompts — ranked by total likes and community engagement.',
};

export default async function MostPopularPage() {
  const prompts = await getPromptList({ take: 72, sort: 'popular' });
  return (
    <PromptPageShell
      title="Most Popular"
      description="All-time community favourites ranked by likes and engagement. The prompts people keep coming back to."
      badge="All-time best"
      breadcrumb="Most Popular"
      breadcrumbHref="/most-popular"
      defaultSort="most-liked"
      prompts={prompts.items}
    />
  );
}
