export interface LineMetadata {
  id: string;
  number: number;
  content: string;
  type: 'paragraph' | 'heading1' | 'heading2' | 'list-item';
  timestamp: Date;
  lastModified?: Date;
  aiEnhanced?: boolean;
  aiMetadata?: {
    lastEnhanced?: Date;
    enhancementPrompt?: string;
    originalContent?: string;
  };
} 