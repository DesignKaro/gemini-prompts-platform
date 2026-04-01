import { useEffect } from 'react';
import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native';
import { useMutation, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { getPostBySlug, trackPostView } from '../../../api/public';
import { Screen } from '../../../components/ui/screen';

type PostDetailScreenProps = {
  slug?: string;
};

export function PostDetailScreen({ slug }: PostDetailScreenProps) {
  const postQuery = useQuery({
    queryKey: ['post', slug],
    queryFn: () => getPostBySlug(slug as string),
    enabled: Boolean(slug),
  });

  const viewMutation = useMutation({
    mutationFn: (postId: string) => trackPostView(postId),
  });

  useEffect(() => {
    if (postQuery.data?.id) {
      viewMutation.mutate(postQuery.data.id);
    }
  }, [postQuery.data?.id]);

  if (postQuery.isLoading) {
    return (
      <Screen>
        <View className="min-h-[260px] items-center justify-center">
          <ActivityIndicator size="large" color="#0f1116" />
        </View>
      </Screen>
    );
  }

  if (postQuery.isError || !postQuery.data) {
    return (
      <Screen>
        <Text className="text-base text-[#9b1c1c]">Could not load post details.</Text>
      </Screen>
    );
  }

  const post = postQuery.data;

  return (
    <Screen>
      <Pressable onPress={() => router.back()} className="mb-3 self-start rounded-full border border-[#d7dde8] bg-white px-3 py-2">
        <Text className="text-xs text-[#4b5563]">Back</Text>
      </Pressable>

      {post.image ? (
        <Image source={{ uri: post.image }} className="h-56 w-full rounded-2xl bg-[#eef2f7]" resizeMode="cover" />
      ) : null}

      <Text className="mt-4 text-2xl font-semibold text-[#0f1116]">{post.title}</Text>
      <Text className="mt-2 text-sm text-[#6b7280]">{post.excerpt ?? 'No excerpt available.'}</Text>

      <View className="mt-6 rounded-2xl border border-[#e4e8ef] bg-white p-4">
        <Text className="text-base leading-6 text-[#17202f]">{post.content ?? 'No content yet.'}</Text>
      </View>
    </Screen>
  );
}
