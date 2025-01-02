export interface FileItem {
  name: string;
  path: string;
  lastModified: Date;
}

export interface EnhancementHistoryItem {
  original: string;
  enhanced: string;
  prompt: string;
  timestamp: Date;
} 