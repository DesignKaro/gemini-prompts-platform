import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { getProfileActivity } from '../../../api/profile';
import { getProfileSummary, logout } from '../../../api/auth';
import { Screen } from '../../../components/ui/screen';
import { Card } from '../../../components/ui/card';
import { StatPill } from '../../../components/ui/stat-pill';
import { useAuthStore } from '../../../store/auth-store';

type ActivityItem = {
  id: string;
  action: string;
  targetTitle: string;
  createdAt: string;
};

export function ProfileScreen() {
  const session = useAuthStore((state) => state.session);
  const clearSession = useAuthStore((state) => state.clearSession);

  const summaryQuery = useQuery({
    queryKey: ['profile', 'summary'],
    queryFn: () => getProfileSummary() as Promise<Record<string, unknown>>,
    enabled: Boolean(session),
  });

  const activityQuery = useQuery({
    queryKey: ['profile', 'activity'],
    queryFn: () => getProfileActivity(0, 10) as Promise<{ items: ActivityItem[] }>,
    enabled: Boolean(session),
  });

  if (!session) {
    return (
      <Screen>
        <Card>
          <Text className="text-lg font-semibold text-[#0f1116]">Your profile</Text>
          <Text className="mt-2 text-sm text-[#6b7280]">Login or register to access saved prompts and activity.</Text>

          <View className="mt-4 flex-row gap-2">
            <Pressable onPress={() => router.push('/auth/login')} className="rounded-full bg-[#0f1116] px-4 py-2">
              <Text className="text-xs font-semibold text-white">Login</Text>
            </Pressable>
            <Pressable onPress={() => router.push('/auth/register')} className="rounded-full border border-[#d7dde8] bg-white px-4 py-2">
              <Text className="text-xs font-semibold text-[#0f1116]">Register</Text>
            </Pressable>
          </View>
        </Card>
      </Screen>
    );
  }

  const summary = summaryQuery.data ?? {};

  return (
    <Screen>
      <Text className="text-2xl font-semibold text-[#0f1116]">Profile</Text>
      <Text className="mt-2 text-sm text-[#6b7280]">Manage identity, membership, and activity.</Text>

      <Card>
        <Text className="text-lg font-semibold text-[#0f1116]">{session.user.name}</Text>
        <Text className="mt-1 text-sm text-[#6b7280]">{session.user.email}</Text>

        <View className="mt-4 flex-row gap-2">
          <StatPill label="Saved" value={String(summary.savedCount ?? 0)} />
          <StatPill label="Likes" value={String(summary.likeCount ?? 0)} />
          <StatPill label="Followers" value={String(summary.followerCount ?? 0)} />
        </View>

        <View className="mt-4 flex-row gap-2">
          <Pressable onPress={() => router.push('/membership')} className="rounded-full bg-[#d5ea52] px-4 py-2">
            <Text className="text-xs font-semibold text-[#0f1116]">Membership</Text>
          </Pressable>

          <Pressable
            onPress={async () => {
              await logout(session.refreshToken);
              await clearSession();
            }}
            className="rounded-full border border-[#d7dde8] bg-white px-4 py-2"
          >
            <Text className="text-xs font-semibold text-[#0f1116]">Logout</Text>
          </Pressable>
        </View>
      </Card>

      <Text className="mt-6 mb-3 text-lg font-semibold text-[#0f1116]">Recent activity</Text>
      <View className="gap-2">
        {(activityQuery.data?.items ?? []).map((item) => (
          <Card key={item.id}>
            <Text className="text-sm font-semibold text-[#0f1116]">{item.action}</Text>
            <Text className="mt-1 text-sm text-[#4b5563]">{item.targetTitle}</Text>
            <Text className="mt-1 text-xs text-[#6b7280]">{new Date(item.createdAt).toLocaleString()}</Text>
          </Card>
        ))}
      </View>
    </Screen>
  );
}
