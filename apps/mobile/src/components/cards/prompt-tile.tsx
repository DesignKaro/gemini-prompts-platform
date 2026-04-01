import { Image, Pressable, Text, View } from 'react-native';
import type { PublicPrompt } from '../../types/content';
import { Avatar } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { formatDate } from '../../utils/format';

type PromptTileProps = {
  prompt: PublicPrompt;
  onPress?: () => void;
};

export function PromptTile({ prompt, onPress }: PromptTileProps) {
  return (
    <Pressable onPress={onPress} className="mb-3 overflow-hidden rounded-2xl border border-[#e4e8ef] bg-white">
      {prompt.image ? (
        <Image source={{ uri: prompt.image }} className="h-40 w-full bg-[#eef2f7]" resizeMode="cover" />
      ) : null}

      <View className="gap-3 p-4">
        <View className="flex-row items-center justify-between">
          <Badge label={prompt.promptType} />
          <Text className="text-xs text-[#6b7280]">{formatDate(prompt.publishedAt)}</Text>
        </View>

        <Text className="text-base font-semibold text-[#0f1116]" numberOfLines={2}>
          {prompt.title}
        </Text>

        <View className="flex-row items-center gap-2">
          <Avatar name={prompt.author.name} url={prompt.author.avatarUrl} size={28} />
          <Text className="text-sm text-[#4b5563]" numberOfLines={1}>
            {prompt.author.name}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
