import { PromptPageShell } from '../components/prompt-listing';
import { getPromptList } from '../../lib/public-content';

export const metadata = {
  title: 'Exclusive Prompts — Gemini Prompts',
  description: 'Premium and members-only prompt collections published on Gemini Prompts.',
};

export default async function ExclusivePromptsPage() {
  const prompts = await getPromptList({
    take: 72,
    sort: 'latest',
    visibility: 'EXCLUSIVE',
  });

  return (
    <PromptPageShell
      title="Exclusive Prompts"
      description="Premium prompt collections, advanced frameworks, and gated prompt packs from the dashboard."
      badge="Members collection"
      breadcrumb="Exclusive"
      breadcrumbHref="/exclusive"
      defaultSort="newest"
      prompts={prompts.items}
    />
  );
}
