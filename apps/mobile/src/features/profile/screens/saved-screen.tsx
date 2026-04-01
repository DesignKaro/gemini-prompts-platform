import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { getProfileSaved } from '../../../api/profile';
import { Screen } from '../../../components/ui/screen';
import { PromptList } from '../../../components/lists/prompt-list';
import { useAuthStore } from '../../../store/auth-store';

export function SavedScreen() {
  const session = useAuthStore((state) => state.session);

  const savedQuery = useQuery({
    queryKey: ['profile', 'saved'],
    queryFn: () => getProfileSaved(0, 30),
    enabled: Boolean(session),
  });

  if (!session) {
    return (
      <Screen>
        <View className="rounded-2xl border border-[#e4e8ef] bg-white p-5">
          <Text className="text-base font-semibold text-[#0f1116]">Saved prompts</Text>
          <Text className="mt-2 text-sm text-[#6b7280]">Login to sync and access saved prompts.</Text>
          <Pressable onPress={() => router.push('/auth/login')} className="mt-4 self-start rounded-full bg-[#0f1116] px-4 py-2">
            <Text className="text-xs font-semibold text-white">Login</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <Text className="text-2xl font-semibold text-[#0f1116]">Saved prompts</Text>
      <Text className="mt-2 text-sm text-[#6b7280]">Your synced list from /api/auth/profile/saved.</Text>

      <View className="mt-5">
        <PromptList
          items={savedQuery.data?.items ?? []}
          emptyLabel="You have no saved prompts yet."
          onPressPrompt={(prompt) => router.push(`/prompt/${prompt.slug}`)}
        />
      </View>
    </Screen>
  );
}
