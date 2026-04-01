import { useEffect } from 'react';
import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { likePrompt, savePrompt, sharePrompt, trackPromptView, unsavePrompt } from '../../../api/public';
import { Screen } from '../../../components/ui/screen';
import { usePromptDetailQuery } from '../hooks/use-prompt-detail';
import { useAuthStore } from '../../../store/auth-store';
import { buildPromptWebUrl } from '../../../utils/deep-links';
import { shareUrl } from '../../../utils/share';

type PromptDetailScreenProps = {
  slug?: string;
};

export function PromptDetailScreen({ slug }: PromptDetailScreenProps) {
  const detailQuery = usePromptDetailQuery(slug);
  const session = useAuthStore((state) => state.session);

  const viewMutation = useMutation({
    mutationFn: (promptId: string) => trackPromptView(promptId),
  });
  const likeMutation = useMutation({ mutationFn: (promptId: string) => likePrompt(promptId) });
  const saveMutation = useMutation({ mutationFn: (promptId: string) => savePrompt(promptId) });
  const unsaveMutation = useMutation({ mutationFn: (promptId: string) => unsavePrompt(promptId) });
  const shareMutation = useMutation({ mutationFn: (promptId: string) => sharePrompt(promptId) });

  useEffect(() => {
    if (detailQuery.data?.id) {
      viewMutation.mutate(detailQuery.data.id);
    }
  }, [detailQuery.data?.id]);

  if (detailQuery.isLoading) {
    return (
      <Screen>
        <View className="min-h-[260px] items-center justify-center">
          <ActivityIndicator size="large" color="#0f1116" />
        </View>
      </Screen>
    );
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <Screen>
        <Text className="text-base text-[#9b1c1c]">Could not load prompt details.</Text>
      </Screen>
    );
  }

  const prompt = detailQuery.data;

  return (
    <Screen>
      <Pressable onPress={() => router.back()} className="mb-3 self-start rounded-full border border-[#d7dde8] bg-white px-3 py-2">
        <Text className="text-xs text-[#4b5563]">Back</Text>
      </Pressable>

      {prompt.image ? (
        <Image source={{ uri: prompt.image }} className="h-56 w-full rounded-2xl bg-[#eef2f7]" resizeMode="cover" />
      ) : null}

      <Text className="mt-4 text-2xl font-semibold text-[#0f1116]">{prompt.title}</Text>
      <Text className="mt-2 text-sm text-[#6b7280]">{prompt.description ?? 'No description available.'}</Text>

      <View className="mt-5 flex-row flex-wrap gap-2">
        <Pressable
          onPress={() => likeMutation.mutate(prompt.id)}
          className="rounded-full bg-[#0f1116] px-4 py-2"
        >
          <Text className="text-xs font-semibold text-white">Like</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            if (!session) return;
            saveMutation.mutate(prompt.id);
          }}
          className="rounded-full border border-[#d7dde8] bg-white px-4 py-2"
        >
          <Text className="text-xs font-semibold text-[#0f1116]">Save</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            if (!session) return;
            unsaveMutation.mutate(prompt.id);
          }}
          className="rounded-full border border-[#d7dde8] bg-white px-4 py-2"
        >
          <Text className="text-xs font-semibold text-[#0f1116]">Unsave</Text>
        </Pressable>

        <Pressable
          onPress={async () => {
            shareMutation.mutate(prompt.id);
            await shareUrl(buildPromptWebUrl(prompt.slug), prompt.title);
          }}
          className="rounded-full bg-[#d5ea52] px-4 py-2"
        >
          <Text className="text-xs font-semibold text-[#0f1116]">Share</Text>
        </Pressable>
      </View>

      {!session ? (
        <Text className="mt-3 text-xs text-[#9b1c1c]">Login required for save/unsave.</Text>
      ) : null}

      {prompt.content ? (
        <View className="mt-6 rounded-2xl border border-[#e4e8ef] bg-white p-4">
          <Text className="text-base leading-6 text-[#17202f]">{prompt.content}</Text>
        </View>
      ) : null}
    </Screen>
  );
}
