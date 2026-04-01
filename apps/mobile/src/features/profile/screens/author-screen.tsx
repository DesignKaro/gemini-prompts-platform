import { useQuery } from '@tanstack/react-query';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { getAuthorBySlug, getPrompts } from '../../../api/public';
import { Screen } from '../../../components/ui/screen';
import { PromptList } from '../../../components/lists/prompt-list';
import { Avatar } from '../../../components/ui/avatar';

type AuthorScreenProps = {
  slug?: string;
};

export function AuthorScreen({ slug }: AuthorScreenProps) {
  const authorQuery = useQuery({
    queryKey: ['author', slug],
    queryFn: () => getAuthorBySlug(slug as string),
    enabled: Boolean(slug),
  });

  const promptsQuery = useQuery({
    queryKey: ['author-prompts', slug],
    queryFn: () => getPrompts({ author: slug, take: 20, sort: 'latest' }),
    enabled: Boolean(slug),
  });

  return (
    <Screen>
      {authorQuery.data ? (
        <View className="mb-4 flex-row items-center gap-3">
          <Avatar name={authorQuery.data.name} url={authorQuery.data.avatarUrl} size={44} />
          <View>
            <Text className="text-xl font-semibold text-[#0f1116]">{authorQuery.data.name}</Text>
            <Text className="text-sm text-[#6b7280]">@{authorQuery.data.handle ?? 'author'}</Text>
          </View>
        </View>
      ) : null}

      <PromptList
        items={promptsQuery.data?.items ?? []}
        emptyLabel="No prompts from this author yet."
        onPressPrompt={(prompt) => router.push(`/prompt/${prompt.slug}`)}
      />
    </Screen>
  );
}
