import { Image, Text, View } from 'react-native';

type AvatarProps = {
  name: string;
  url?: string | null;
  size?: number;
};

export function Avatar({ name, url, size = 36 }: AvatarProps) {
  if (url) {
    return (
      <Image
        source={{ uri: url }}
        style={{ width: size, height: size }}
        className="rounded-full bg-[#eef2f7]"
      />
    );
  }

  const initial = name.trim().charAt(0).toUpperCase() || 'U';

  return (
    <View
      style={{ width: size, height: size }}
      className="items-center justify-center rounded-full bg-[#e9eef5]"
    >
      <Text className="text-sm font-semibold text-[#4b5563]">{initial}</Text>
    </View>
  );
}
