import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { searchPublicContent } from '../../../api/public';
import { Screen } from '../../../components/ui/screen';
import { PromptList } from '../../../components/lists/prompt-list';

export function SearchScreen() {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 350);
    return () => clearTimeout(timeout);
  }, [query]);

  const searchQuery = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: () => searchPublicContent(debouncedQuery),
    enabled: debouncedQuery.length > 1,
  });

  const prompts = useMemo(() => searchQuery.data?.prompts ?? [], [searchQuery.data]);

  return (
    <Screen>
      <Text className="text-2xl font-semibold text-[#0f1116]">Search</Text>
      <Text className="mt-2 text-sm text-[#6b7280]">Find prompts, posts, tags, and authors.</Text>

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search prompts..."
        placeholderTextColor="#9ca3af"
        className="mt-4 rounded-2xl border border-[#d7dde8] bg-white px-4 py-3 text-[#0f1116]"
      />

      {searchQuery.isFetching ? (
        <View className="mt-6 items-center">
          <ActivityIndicator color="#0f1116" />
        </View>
      ) : null}

      {debouncedQuery.length <= 1 ? (
        <View className="mt-6 rounded-2xl border border-dashed border-[#d7dde8] bg-white p-5">
          <Text className="text-sm text-[#6b7280]">Type at least 2 characters to search.</Text>
        </View>
      ) : (
        <View className="mt-6">
          <PromptList
            items={prompts}
            emptyLabel="No prompts matched your query."
            onPressPrompt={(prompt) => router.push(`/prompt/${prompt.slug}`)}
          />
        </View>
      )}
    </Screen>
  );
}
