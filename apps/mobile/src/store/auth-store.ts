import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import type { AuthUser } from '../types/content';

const SESSION_STORAGE_KEY = 'gp.mobile.session.v1';

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};

type AuthState = {
  session: AuthSession | null;
  hydrated: boolean;
  setSession: (session: AuthSession) => Promise<void>;
  clearSession: () => Promise<void>;
  hydrate: () => Promise<void>;
};

async function persistSession(session: AuthSession | null) {
  if (session) {
    await SecureStore.setItemAsync(SESSION_STORAGE_KEY, JSON.stringify(session));
    return;
  }
  await SecureStore.deleteItemAsync(SESSION_STORAGE_KEY);
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  hydrated: false,
  async setSession(session) {
    set({ session });
    await persistSession(session);
  },
  async clearSession() {
    set({ session: null });
    await persistSession(null);
  },
  async hydrate() {
    try {
      const raw = await SecureStore.getItemAsync(SESSION_STORAGE_KEY);
      if (!raw) {
        set({ hydrated: true, session: null });
        return;
      }
      const parsed = JSON.parse(raw) as AuthSession;
      set({ hydrated: true, session: parsed });
    } catch {
      set({ hydrated: true, session: null });
    }
  },
}));
