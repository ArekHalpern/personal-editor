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
  api: {
    openai: {
      models: ['gpt-4o', 'gpt-4o-mini'],
      selectedModel: 'gpt-4o',
    },
  },
  editor: {
    fontSize: 16,
    lineHeight: 1.5,
    fontFamily: 'Roboto',
    fontWeight: 400,
  },
  ui: {
    sidebarWidth: 300,
    rightBarWidth: 400,
  },
};

// Helper function to deeply merge objects
const deepMerge = (target: any, source: any): any => {
  const output = { ...target };
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }
  return output;
};

const isObject = (item: any): item is Record<string, any> => {
  return item && typeof item === 'object' && !Array.isArray(item);
};

export const useSettings = create<SettingsStore>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,
      updateSettings: (newSettings) =>
        set((state) => ({
          settings: deepMerge(state.settings, newSettings),
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
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Ensure default settings are merged with persisted settings
          state.settings = deepMerge(DEFAULT_SETTINGS, state.settings);
        }
      },
    }
  )
); 