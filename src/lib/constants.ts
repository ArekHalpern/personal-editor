// File System
export const DEFAULT_PATH = "ai-editor-files";
export const AUTO_SAVE_DELAY = 1000; // 1 second

// Editor
export const PLACEHOLDER_TEXT = {
  title: "Title...",
  content: "Body...",
} as const;

// UI
export const MIN_SIDEBAR_WIDTH = 180;
export const MAX_SIDEBAR_WIDTH = 576;
export const MIN_RIGHTBAR_WIDTH = 200;
export const MAX_RIGHTBAR_WIDTH = 640;

// File Extensions
export const SUPPORTED_EXTENSIONS = {
  HTML: "html",
  JSON: "json",
} as const; 