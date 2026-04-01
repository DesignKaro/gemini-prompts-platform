import { useQuery } from '@tanstack/react-query';
import { Pressable, Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { getMembershipSummary } from '../../../api/auth';
import { Screen } from '../../../components/ui/screen';
import { Card } from '../../../components/ui/card';
import { buildMembershipWebUrl } from '../../../utils/deep-links';
import { useAuthStore } from '../../../store/auth-store';
import { appQueryClient } from '../../../providers/app-providers';

export function MembershipScreen() {
  const session = useAuthStore((state) => state.session);

  const membershipQuery = useQuery({
    queryKey: ['membership', 'summary'],
    queryFn: () => getMembershipSummary(),
    enabled: Boolean(session),
  });

  return (
    <Screen>
      <Text className="text-2xl font-semibold text-[#0f1116]">Membership</Text>
      <Text className="mt-2 text-sm text-[#6b7280]">Web checkout handoff for V1 mobile release.</Text>

      <Card>
        <Text className="text-sm text-[#6b7280]">Current plan</Text>
        <Text className="mt-1 text-xl font-semibold text-[#0f1116]">
          {session ? membershipQuery.data?.plan ?? 'FREE' : 'Guest'}
        </Text>
        <Text className="mt-2 text-sm text-[#6b7280]">
          {session ? membershipQuery.data?.status ?? 'Unknown' : 'Login to view your membership status.'}
        </Text>

        <Pressable
          onPress={async () => {
            await WebBrowser.openBrowserAsync(buildMembershipWebUrl());
            await appQueryClient.invalidateQueries({ queryKey: ['membership', 'summary'] });
          }}
          className="mt-5 self-start rounded-full bg-[#d5ea52] px-4 py-2"
        >
          <Text className="text-xs font-semibold text-[#0f1116]">Open membership checkout</Text>
        </Pressable>
      </Card>
    </Screen>
  );
}
