import { PropsWithChildren } from 'react';
import { View } from 'react-native';

type CardProps = PropsWithChildren<{
  padded?: boolean;
}>;

export function Card({ children, padded = true }: CardProps) {
  return (
    <View className={`rounded-2xl border border-[#e4e8ef] bg-white ${padded ? 'p-4' : ''}`}>
      {children}
    </View>
  );
}
