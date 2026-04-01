import { Text, View } from 'react-native';

type TagChipProps = {
  label: string;
};

export function TagChip({ label }: TagChipProps) {
  return (
    <View className="rounded-full border border-[#e4e8ef] bg-white px-3 py-1">
      <Text className="text-xs text-[#4b5563]">{label}</Text>
    </View>
  );
}
