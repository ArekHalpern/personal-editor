import { LineMetadata } from "./editor";

export type EditOperation = 
  | 'inline_edit'
  | 'multi_line_edit'
  | 'continue_text'
  | 'summarize_text'
  | 'analyze_text'
  | 'delete_text'
  | 'generate_file';

export interface BaseResponse {
  operation: EditOperation;
  message: string;
}

export interface InlineEditResponse extends BaseResponse {
  operation: 'inline_edit';
  changes: Array<{
    lineNumber: number;
    content: string;
    type: 'paragraph';
  }>;
}

export interface MultiLineEditResponse extends BaseResponse {
  operation: 'multi_line_edit';
  changes: Array<{
    lineNumber: number;
    content: string;
    type: 'paragraph';
  }>;
}

export interface ContinueTextResponse extends BaseResponse {
  operation: 'continue_text';
  newLines: Array<{
    content: string;
    type: 'paragraph';
  }>;
  afterLine: number;
}

export interface SummarizeTextResponse extends BaseResponse {
  operation: 'summarize_text';
  summary: string;
}

export interface AnalyzeTextResponse extends BaseResponse {
  operation: 'analyze_text';
  analysis: {
    filename: string;
    summary: string;
    purpose: string;
    keyComponents: string[];
    technicalDetails: string;
  };
}

export interface DeleteTextResponse extends BaseResponse {
  operation: 'delete_text';
  linesToDelete: number[];
}

export interface GenerateFileRequest extends FileGenerationCollectedInfo {
  filename: string;
  description: string;
  content?: string;
}

export interface GenerateFileResponse extends BaseResponse {
  operation: 'generate_file';
  filename: string;
  content: string;
}

export type AssistantResponse = 
  | InlineEditResponse 
  | MultiLineEditResponse 
  | ContinueTextResponse 
  | SummarizeTextResponse 
  | AnalyzeTextResponse
  | DeleteTextResponse
  | GenerateFileResponse;

export interface AssistantRequest {
  message: string;
  lineMetadata: LineMetadata[];
  selectedText?: string;
  fullContent: string;
  filename: string;
}

export interface EnhanceRequest {
  selectedText: string;
  prompt: string;
  context?: string;
  filename?: string;
}

export interface EnhanceResponse {
  enhancedText: string;
  explanation: string;
  changes: {
    type: 'addition' | 'deletion' | 'modification';
    description: string;
  }[];
}

export interface FileGenerationCollectedInfo {
  filename?: string;
  description?: string;
  outline?: string;
  requirements?: string[];
  generatedFilePath?: string;
}

export interface ChatResponse {
  message: string;
  enhancedText?: {
    lines: LineMetadata[];
  };
  analysis?: {
    filename: string;
    summary: string;
    purpose: string;
    keyComponents: string[];
    technicalDetails: string;
  };
  error?: boolean;
  fileGeneration?: {
    shouldGenerate: boolean;
    collectedInfo?: FileGenerationCollectedInfo;
  };
} 