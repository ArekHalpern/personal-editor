export interface FileItem {
  name: string;
  path: string;
  lastModified: Date;
  isDirectory: boolean;
  children?: FileItem[];
}

export interface FileRenameOptions {
  oldPath: string;
  newPath: string;
  content: string;
  onRename?: (newFileName: string) => void;
}

export interface CreateNewFileOptions {
  onSuccess?: (content: string, fileName: string) => void;
  onError?: (error: unknown) => void;
  onLoadFiles?: () => Promise<void>;
}

export interface FileOperationResult {
  success: boolean;
  reason?: "file_exists" | "error";
  error?: unknown;
  fileName?: string;
} 