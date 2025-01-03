import { LineMetadata } from "./editor";

export type EditOperation = 
  | 'inline_edit'
  | 'multi_line_edit'
  | 'continue_text'
  | 'summarize_text'
  | 'analyze_text';

export interface BaseResponse {
  operation: EditOperation;
  message: string;
}

export interface InlineEditResponse extends BaseResponse {
  operation: 'inline_edit';
  changes: Array<{
    lineNumber: number;
    content: string;
    type: 'heading' | 'paragraph' | 'list-item';
    attrs?: {
      level?: 1 | 2;
    };
  }>;
}

export interface MultiLineEditResponse extends BaseResponse {
  operation: 'multi_line_edit';
  changes: Array<{
    lineNumber: number;
    content: string;
    type: 'heading' | 'paragraph' | 'list-item';
    attrs?: {
      level?: 1 | 2;
    };
  }>;
}

export interface ContinueTextResponse extends BaseResponse {
  operation: 'continue_text';
  newLines: Array<{
    content: string;
    type: 'heading' | 'paragraph' | 'list-item';
    attrs?: {
      level?: 1 | 2;
    };
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

export type AssistantResponse = 
  | InlineEditResponse 
  | MultiLineEditResponse 
  | ContinueTextResponse 
  | SummarizeTextResponse 
  | AnalyzeTextResponse;

export interface AssistantRequest {
  message: string;
  lineMetadata: LineMetadata[];
  selectedText?: string;
  fullContent: string;
  filename: string;
} 