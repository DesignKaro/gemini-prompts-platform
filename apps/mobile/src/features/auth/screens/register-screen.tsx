import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, Text, TextInput, View } from 'react-native';
import { z } from 'zod';
import { register } from '../../../api/auth';
import { Screen } from '../../../components/ui/screen';
import { useAuthStore } from '../../../store/auth-store';

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

type RegisterForm = z.infer<typeof registerSchema>;

export function RegisterScreen() {
  const setSession = useAuthStore((state) => state.setSession);

  const form = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
    },
  });

  const submit = form.handleSubmit(async (values) => {
    const payload = await register(values);
    await setSession({
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken,
      user: payload.user,
    });
    router.replace('/(tabs)/profile');
  });

  return (
    <Screen>
      <Text className="text-2xl font-semibold text-[#0f1116]">Register</Text>
      <Text className="mt-2 text-sm text-[#6b7280]">Create account with existing API contracts.</Text>

      <View className="mt-5 gap-3">
        <Controller
          control={form.control}
          name="name"
          render={({ field }) => (
            <TextInput
              placeholder="Full name"
              className="rounded-2xl border border-[#d7dde8] bg-white px-4 py-3 text-[#0f1116]"
              value={field.value}
              onChangeText={field.onChange}
            />
          )}
        />

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
          <Text className="text-center text-sm font-semibold text-white">Register</Text>
        </Pressable>

        <Pressable onPress={() => router.push('/auth/login')} className="self-center">
          <Text className="text-sm text-[#4b5563]">Already have an account? Login</Text>
        </Pressable>
      </View>
    </Screen>
  );
}
