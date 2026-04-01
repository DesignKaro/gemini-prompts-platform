import { ActivityIndicator, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../../../components/ui/screen';
import { PromptList } from '../../../components/lists/prompt-list';
import { usePromptsQuery } from '../hooks/use-prompts';

export function PromptsScreen() {
  const promptsQuery = usePromptsQuery({ sort: 'latest' });

  if (promptsQuery.isLoading) {
    return (
      <Screen>
        <View className="min-h-[240px] items-center justify-center">
          <ActivityIndicator size="large" color="#0f1116" />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <Text className="text-2xl font-semibold text-[#0f1116]">Latest prompts</Text>
      <Text className="mt-2 text-sm text-[#6b7280]">Browse recent public prompt drops.</Text>

      <View className="mt-5">
        <PromptList
          items={promptsQuery.data?.items ?? []}
          onPressPrompt={(prompt) => router.push(`/prompt/${prompt.slug}`)}
        />
      </View>
    </Screen>
  );
}
