export interface LineMetadata {
  id: string;
  number: number;
  content: string;
  type: 'paragraph';
  timestamp: Date;
  lastModified?: Date;
  aiEnhanced?: boolean;
  aiMetadata?: {
    lastEnhanced?: Date;
    enhancementPrompt?: string;
    originalContent?: string;
  };
} 