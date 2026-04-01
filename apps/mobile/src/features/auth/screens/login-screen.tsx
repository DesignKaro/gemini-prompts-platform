import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, Text, TextInput, View } from 'react-native';
import { z } from 'zod';
import { login } from '../../../api/auth';
import { Screen } from '../../../components/ui/screen';
import { useAuthStore } from '../../../store/auth-store';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginScreen() {
  const setSession = useAuthStore((state) => state.setSession);

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const submit = form.handleSubmit(async (values) => {
    const payload = await login(values);
    await setSession({
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken,
      user: payload.user,
    });
    router.replace('/(tabs)/profile');
  });

  return (
    <Screen>
      <Text className="text-2xl font-semibold text-[#0f1116]">Login</Text>
      <Text className="mt-2 text-sm text-[#6b7280]">Use your existing backend auth.</Text>

      <View className="mt-5 gap-3">
        <Controller
          control={form.control}
          name="email"
          render={({ field }) => (
            <TextInput
              placeholder="Email"
              autoCapitalize="none"
              keyboardType="email-address"
              className="rounded-2xl border border-[#d7dde8] bg-white px-4 py-3 text-[#0f1116]"
              value={field.value}
              onChangeText={field.onChange}
            />
          )}
        />

        <Controller
          control={form.control}
          name="password"
          render={({ field }) => (
            <TextInput
              placeholder="Password"
              secureTextEntry
              className="rounded-2xl border border-[#d7dde8] bg-white px-4 py-3 text-[#0f1116]"
              value={field.value}
              onChangeText={field.onChange}
            />
          )}
        />

        <Pressable onPress={() => void submit()} className="rounded-full bg-[#0f1116] px-5 py-3">
          <Text className="text-center text-sm font-semibold text-white">Login</Text>
        </Pressable>

        <Pressable onPress={() => router.push('/auth/register')} className="self-center">
          <Text className="text-sm text-[#4b5563]">Need an account? Register</Text>
        </Pressable>
      </View>
    </Screen>
  );
}
