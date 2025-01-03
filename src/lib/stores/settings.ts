import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { UserSettings } from '../types/settings';

interface SettingsStore {
  settings: UserSettings;
  updateSettings: (settings: Partial<UserSettings>) => void;
  updateConfirmation: (key: keyof UserSettings['confirmations'], value: boolean) => void;
}

const DEFAULT_SETTINGS: UserSettings = {
  confirmations: {
    fileDelete: true,
  },
  editor: {
    fontSize: 16,
    lineHeight: 1.5,
  },
  ui: {
    sidebarWidth: 300,
    rightBarWidth: 400,
  },
};

export const useSettings = create<SettingsStore>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,
      updateSettings: (newSettings) =>
        set((state) => ({
          settings: {
            ...state.settings,
            ...newSettings,
          },
        })),
      updateConfirmation: (key, value) =>
        set((state) => ({
          settings: {
            ...state.settings,
            confirmations: {
              ...state.settings.confirmations,
              [key]: value,
            },
          },
        })),
    }),
    {
      name: 'user-settings',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ settings: state.settings }),
      version: 1,
    }
  )
); 