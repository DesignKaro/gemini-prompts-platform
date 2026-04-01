import { Text, View } from 'react-native';

type StatPillProps = {
  label: string;
  value: string | number;
};

export function StatPill({ label, value }: StatPillProps) {
  return (
    <View className="rounded-2xl bg-[#f3f6fb] px-3 py-2">
      <Text className="text-xs text-[#6b7280]">{label}</Text>
      <Text className="mt-0.5 text-sm font-semibold text-[#0f1116]">{value}</Text>
    </View>
  );
}
