import '../src/design/global.css';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppProviders } from '../src/providers/app-providers';

export default function RootLayout() {
  return (
    <AppProviders>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#ffffff' },
          headerTitleStyle: { color: '#0f1116' },
          contentStyle: { backgroundColor: '#f7f9fc' },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="prompt/[slug]" options={{ title: 'Prompt' }} />
        <Stack.Screen name="post/[slug]" options={{ title: 'Post' }} />
        <Stack.Screen name="category/[slug]" options={{ title: 'Category' }} />
        <Stack.Screen name="tag/[slug]" options={{ title: 'Tag' }} />
        <Stack.Screen name="author/[slug]" options={{ title: 'Author' }} />
        <Stack.Screen name="membership" options={{ title: 'Membership' }} />
        <Stack.Screen name="auth/login" options={{ title: 'Login' }} />
        <Stack.Screen name="auth/register" options={{ title: 'Register' }} />
      </Stack>
    </AppProviders>
  );
}
