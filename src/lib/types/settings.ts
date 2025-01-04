export interface UserSettings {
  confirmations: {
    fileDelete: boolean;
  };
  api: {
    openai: {
      apiKey?: string;
      models: string[];
      selectedModel?: string;
    };
  };
  editor?: {
    fontSize?: number;
    lineHeight?: number;
    fontFamily?: string;
    fontWeight?: number;
  };
  ui?: {
    sidebarWidth?: number;
    rightBarWidth?: number;
  };
}

export type SettingsKey = keyof UserSettings;
export type ConfirmationKey = keyof UserSettings['confirmations']; 