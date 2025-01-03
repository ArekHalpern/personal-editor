import { LineMetadata } from "./editor";

export type EditOperation = 
  | 'inline_edit'
  | 'multi_line_edit'
  | 'continue_text'
  | 'summarize_text'
  | 'analyze_text'
  | 'delete_text';

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

export type AssistantResponse = 
  | InlineEditResponse 
  | MultiLineEditResponse 
  | ContinueTextResponse 
  | SummarizeTextResponse 
  | AnalyzeTextResponse
  | DeleteTextResponse;

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