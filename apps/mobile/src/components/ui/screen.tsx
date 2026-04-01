import { PropsWithChildren } from 'react';
import { ScrollView, View } from 'react-native';
import { tokens } from '../../design/tokens';

type ScreenProps = PropsWithChildren<{
  scroll?: boolean;
}>;

export function Screen({ children, scroll = true }: ScreenProps) {
  const content = <View className="flex-1 bg-[#f7f9fc] px-4 py-4">{children}</View>;

  if (!scroll) {
    return content;
  }

  return (
    <ScrollView
      className="flex-1 bg-[#f7f9fc]"
      contentContainerStyle={{
        paddingBottom: tokens.spacing.xl,
      }}
      keyboardShouldPersistTaps="handled"
    >
      {content}
    </ScrollView>
  );
}
