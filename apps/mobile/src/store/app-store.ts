import { create } from 'zustand';

type AppState = {
  isOnline: boolean;
  setOnline: (value: boolean) => void;
};

export const useAppStore = create<AppState>((set) => ({
  isOnline: true,
  setOnline(value) {
    set({ isOnline: value });
  },
}));
