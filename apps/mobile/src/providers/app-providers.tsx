import type { ReactElement } from 'react';
import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/auth-store';

export const appQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function AuthHydrationBootstrap() {
  useEffect(() => {
    void useAuthStore.getState().hydrate();
  }, []);

  return null;
}

type AppProvidersProps = {
  children?: ReactElement | ReactElement[] | null;
};

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={appQueryClient}>
        <AuthHydrationBootstrap />
        {children as any}
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
