import { FlatList, Text, View } from 'react-native';
import type { PublicPrompt } from '../../types/content';
import { PromptTile } from '../cards/prompt-tile';

type PromptListProps = {
  items: PublicPrompt[];
  emptyLabel?: string;
  onPressPrompt?: (prompt: PublicPrompt) => void;
};

export function PromptList({ items, emptyLabel = 'No prompts found yet.', onPressPrompt }: PromptListProps) {
  if (items.length === 0) {
    return (
      <View className="rounded-2xl border border-dashed border-[#d7dde8] bg-white p-5">
        <Text className="text-sm text-[#6b7280]">{emptyLabel}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      scrollEnabled={false}
      renderItem={({ item }) => (
        <PromptTile prompt={item} onPress={onPressPrompt ? () => onPressPrompt(item) : undefined} />
      )}
    />
  );
}
