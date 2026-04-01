import { ActivityIndicator, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../../../components/ui/screen';
import { PromptList } from '../../../components/lists/prompt-list';
import { Card } from '../../../components/ui/card';
import { TagChip } from '../../../components/ui/tag-chip';
import { useHomeQuery } from '../hooks/use-home';

export function HomeScreen() {
  const homeQuery = useHomeQuery();

  if (homeQuery.isLoading) {
    return (
      <Screen>
        <View className="min-h-[280px] items-center justify-center">
          <ActivityIndicator size="large" color="#0f1116" />
        </View>
      </Screen>
    );
  }

  if (homeQuery.isError || !homeQuery.data) {
    return (
      <Screen>
        <Card>
          <Text className="text-base font-semibold text-[#0f1116]">Could not load home feed</Text>
          <Text className="mt-2 text-sm text-[#6b7280]">Please check API connectivity and try again.</Text>
        </Card>
      </Screen>
    );
  }

  const { data } = homeQuery;

  return (
    <Screen>
      <Text className="text-2xl font-semibold text-[#0f1116]">Discover prompts</Text>
      <Text className="mt-2 text-sm text-[#6b7280]">Live feed from your existing backend APIs.</Text>

      <View className="mt-5 flex-row flex-wrap gap-2">
        {data.popularTags.slice(0, 8).map((tag) => (
          <TagChip key={tag.id} label={tag.name} />
        ))}
      </View>

      <View className="mt-6">
        <Text className="mb-3 text-lg font-semibold text-[#0f1116]">Trending prompts</Text>
        <PromptList
          items={data.trendingPrompts}
          onPressPrompt={(prompt) => router.push(`/prompt/${prompt.slug}`)}
        />
      </View>
    </Screen>
  );
}
