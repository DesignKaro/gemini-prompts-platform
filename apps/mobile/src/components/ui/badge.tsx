import { Text, View } from 'react-native';

type BadgeProps = {
  label: string;
  tone?: 'neutral' | 'primary' | 'dark';
};

export function Badge({ label, tone = 'neutral' }: BadgeProps) {
  const toneClassName =
    tone === 'primary'
      ? 'bg-[#d5ea52] text-[#0f1116]'
      : tone === 'dark'
        ? 'bg-[#0f1116] text-white'
        : 'bg-[#eef2f7] text-[#4b5563]';

  return (
    <View className="self-start rounded-full px-3 py-1">
      <Text className={`text-xs font-semibold ${toneClassName}`}>{label}</Text>
    </View>
  );
}
