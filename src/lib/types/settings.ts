export interface UserSettings {
  confirmations: {
    fileDelete: boolean;
  };
  // Add more setting categories here as needed
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