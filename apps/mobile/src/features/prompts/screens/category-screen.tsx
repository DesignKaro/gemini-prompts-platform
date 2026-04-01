import { Text } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../../../components/ui/screen';
import { PromptList } from '../../../components/lists/prompt-list';
import { usePromptsQuery } from '../hooks/use-prompts';

type CategoryScreenProps = {
  slug?: string;
};

export function CategoryScreen({ slug }: CategoryScreenProps) {
  const promptsQuery = usePromptsQuery({ category: slug, sort: 'latest' });

  return (
    <Screen>
      <Text className="text-2xl font-semibold text-[#0f1116]">Category: {slug}</Text>
      <Text className="mt-2 text-sm text-[#6b7280]">Prompts filtered from /api/public/prompts.</Text>

      <PromptList
        items={promptsQuery.data?.items ?? []}
        emptyLabel="No prompts in this category yet."
        onPressPrompt={(prompt) => router.push(`/prompt/${prompt.slug}`)}
      />
    </Screen>
  );
}
