import { PromptPageShell } from '../components/prompt-listing';
import { getPromptList } from '../../lib/public-content';

export const metadata = {
  title: 'Latest Prompts — Gemini Prompts',
  description:
    'The most recently published prompts on Gemini Prompts. Updated daily with fresh prompt ideas for builders, creators, and teams.',
};

export default async function LatestPage() {
  const prompts = await getPromptList({ take: 72, sort: 'latest' });
  return (
    <PromptPageShell
      title="Latest Prompts"
      description="Fresh prompt ideas added daily. Browse the most recently published prompts for builders, creators, and teams."
      badge="Updated daily"
      breadcrumb="Latest"
      breadcrumbHref="/latest"
      defaultSort="newest"
      prompts={prompts.items}
    />
  );
}
