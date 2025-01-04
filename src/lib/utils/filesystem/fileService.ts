import {
  readDir,
  remove,
  readTextFile,
  mkdir,
  BaseDirectory,
  writeTextFile,
  exists,
  rename,
} from "@tauri-apps/plugin-fs";

import { appDataDir, join } from '@tauri-apps/api/path';
import { Command } from '@tauri-apps/plugin-shell';
import { DEFAULT_PATH } from "../../constants";
import { FileItem, FileOperationResult, CreateNewFileOptions } from "../../types/file";
import { getDisplayName, getFileName, sanitizeFileName } from "../string";
import { Editor } from "@tiptap/react";

export class FileService {
  private static async findNextAvailableNumber(
    baseNamePattern: RegExp,
    startAtZero: boolean = false
  ): Promise<number> {
    const files = await readDir(DEFAULT_PATH, {
      baseDir: BaseDirectory.AppData,
    });

    const numbers = files
      .map((file) => {
        const match = file.name?.match(baseNamePattern);
        return match ? (match[1] ? parseInt(match[1]) : 0) : -1;
      })
      .filter((num) => num >= 0);

    if (numbers.length === 0) {
      return startAtZero ? 0 : 1;
    }

    return Math.max(...numbers) + 1;
  }

  private static async generateUntitledName(): Promise<string> {
    const baseNamePattern = /^Untitled(?:-(\d+))?\.html$/i;
    const nextNum = await this.findNextAvailableNumber(baseNamePattern);
    
    // If there's already an "Untitled.html", start numbering from 01
    const files = await readDir(DEFAULT_PATH, {
      baseDir: BaseDirectory.AppData,
    });
    
    const hasUntitled = files.some(file => 
      file.name?.toLowerCase() === "untitled.html"
    );

    if (hasUntitled || nextNum > 0) {
      return `Untitled-${String(nextNum).padStart(2, "0")}.html`;
    }
    
    return "Untitled.html";
  }

  static async generateNumberedFileName(baseName: string): Promise<string> {
    const safeName = sanitizeFileName(baseName);
    const baseNamePattern = new RegExp(`^${safeName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-(\\d+)\\.html$`);
    const nextNum = await this.findNextAvailableNumber(baseNamePattern);
    return `${safeName}-${String(nextNum).padStart(2, "0")}.html`;
  }

  private static async generateUntitledFolderName(): Promise<string> {
    const baseNamePattern = /^New Folder(?:-(\d+))?$/i;
    const nextNum = await this.findNextAvailableNumber(baseNamePattern);
    
    // If there's already a "New Folder", start numbering from 01
    const files = await readDir(DEFAULT_PATH, {
      baseDir: BaseDirectory.AppData,
    });
    
    const hasNewFolder = files.some(file => 
      file.name?.toLowerCase() === "new folder"
    );

    if (hasNewFolder || nextNum > 0) {
      return `New Folder-${String(nextNum).padStart(2, "0")}`;
    }
    
    return "New Folder";
  }

  static async ensureDirectory() {
    await mkdir(DEFAULT_PATH, {
      recursive: true,
      baseDir: BaseDirectory.AppData,
    });
  }

  static async loadFiles(path: string = DEFAULT_PATH): Promise<FileItem[]> {
    await this.ensureDirectory();

    const entries = await readDir(path, {
      baseDir: BaseDirectory.AppData,
    });

    const items: FileItem[] = [];
    
    for (const entry of entries) {
      if (!entry.name) continue;

      const fullPath = `${path}/${entry.name}`;
      const isDirectory = await exists(`${fullPath}/.`, {
        baseDir: BaseDirectory.AppData,
      });

      items.push({
        name: getDisplayName(entry.name),
        path: fullPath.replace(`${DEFAULT_PATH}/`, ""),
        lastModified: new Date(),
        isDirectory,
        children: isDirectory ? await this.loadFiles(fullPath) : undefined
      });
    }

    // Sort directories first, then by name
    return items.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  static async readFile(path: string): Promise<string> {
    try {
      const fullPath = `${DEFAULT_PATH}/${path}`;
      
      // First check if it's a directory
      const isDirectory = await exists(`${fullPath}/.`, { baseDir: BaseDirectory.AppData });
      if (isDirectory) {
        throw new Error(`Cannot read directory as file: ${path}`);
      }

      // Check if file exists
      const fileExists = await exists(fullPath, { baseDir: BaseDirectory.AppData });
      if (!fileExists) {
        throw new Error(`File does not exist at path: ${fullPath}`);
      }

      return await readTextFile(fullPath, { baseDir: BaseDirectory.AppData });
    } catch (error: any) {
      throw new Error(`Failed to read file as text at path: ${path} with error: ${error?.message || String(error)}`);
    }
  }

  static async writeFile(path: string, content: string): Promise<void> {
    const fullPath = `${DEFAULT_PATH}/${path}`;
    
    // Ensure the parent directory exists
    const parentDir = fullPath.split("/").slice(0, -1).join("/");
    if (parentDir) {
      await mkdir(parentDir, {
        recursive: true,
        baseDir: BaseDirectory.AppData,
      });
    }

    await writeTextFile(fullPath, content, {
      baseDir: BaseDirectory.AppData,
    });
  }

  static async deleteFile(path: string): Promise<void> {
    const fullPath = `${DEFAULT_PATH}/${path}`;
    await remove(fullPath, {
      baseDir: BaseDirectory.AppData,
    });
  }

  static getFullPath(fileName: string): string {
    return `${DEFAULT_PATH}/${fileName}`;
  }

  static async createFolder(parentPath: string = ""): Promise<string> {
    const folderName = await this.generateUntitledFolderName();
    const fullPath = parentPath 
      ? `${DEFAULT_PATH}/${parentPath}/${folderName}`
      : `${DEFAULT_PATH}/${folderName}`;

    await mkdir(fullPath, {
      recursive: true,
      baseDir: BaseDirectory.AppData,
    });

    return folderName;
  }

  static async moveFile(sourcePath: string, targetPath: string): Promise<void> {
    const sourceFullPath = this.getFullPath(sourcePath);
    const targetFullPath = this.getFullPath(targetPath);

    // Ensure target directory exists
    const targetDir = targetPath.split("/").slice(0, -1).join("/");
    if (targetDir) {
      await mkdir(`${DEFAULT_PATH}/${targetDir}`, {
        recursive: true,
        baseDir: BaseDirectory.AppData,
      });
    }

    await rename(sourceFullPath, targetFullPath, {
      oldPathBaseDir: BaseDirectory.AppData,
      newPathBaseDir: BaseDirectory.AppData,
    });
  }

  static async createNewFile(options: CreateNewFileOptions = {}): Promise<{ fileName: string; content: string }> {
    try {
      await this.ensureDirectory();

      const fileName = await this.generateUntitledName();
      const content = "<p></p>";

      await this.writeFile(fileName, content);

      options.onSuccess?.(content, fileName);
      await options.onLoadFiles?.();

      return { fileName, content };
    } catch (error) {
      console.error("Error creating new file:", error);
      options.onError?.(error);
      throw error;
    }
  }

  static async renameFile(
    oldPath: string,
    newDisplayName: string,
    editor: Editor | null,
    isActiveFile: boolean
  ): Promise<FileOperationResult> {
    try {
      const isDirectory = await exists(`${DEFAULT_PATH}/${oldPath}/.`, {
        baseDir: BaseDirectory.AppData,
      });

      if (isDirectory) {
        // For directories, just rename without file extension or content handling
        const newFolderName = sanitizeFileName(newDisplayName);
        const fullOldPath = this.getFullPath(oldPath);
        const fullNewPath = this.getFullPath(newFolderName);

        await rename(fullOldPath, fullNewPath, {
          oldPathBaseDir: BaseDirectory.AppData,
          newPathBaseDir: BaseDirectory.AppData,
        });

        return {
          success: true,
          fileName: newFolderName,
        };
      }

      // For files, proceed with the existing logic
      const newFileName = getFileName(newDisplayName);
      const fullOldPath = this.getFullPath(oldPath);
      const fullNewPath = this.getFullPath(newFileName);

      // Check if target file exists
      const fileExists = await exists(fullNewPath, {
        baseDir: BaseDirectory.AppData,
      });

      if (fileExists && fullNewPath !== fullOldPath) {
        // Try to generate a numbered filename instead
        const numberedFileName = await this.generateNumberedFileName(newDisplayName);
        const numberedPath = this.getFullPath(numberedFileName);
        
        // Get current content
        let content: string;
        if (editor && isActiveFile) {
          content = editor.getHTML();
        } else {
          content = await this.readFile(oldPath);
        }

        // Save content to old location first
        await this.writeFile(oldPath, content);

        // Perform the rename
        await rename(fullOldPath, numberedPath, {
          oldPathBaseDir: BaseDirectory.AppData,
          newPathBaseDir: BaseDirectory.AppData,
        });

        return {
          success: true,
          fileName: numberedFileName,
        };
      }

      // Get current content
      let content: string;
      if (editor && isActiveFile) {
        content = editor.getHTML();
      } else {
        content = await this.readFile(oldPath);
      }

      // Save content to old location first
      await this.writeFile(oldPath, content);

      // Perform the rename
      await rename(fullOldPath, fullNewPath, {
        oldPathBaseDir: BaseDirectory.AppData,
        newPathBaseDir: BaseDirectory.AppData,
      });

      return {
        success: true,
        fileName: newFileName,
      };
    } catch (error) {
      return {
        success: false,
        reason: "error",
        error,
      };
    }
  }

  static async safeRename(options: {
    oldPath: string;
    newPath: string;
    content: string;
    onRename: (fileName: string) => void;
  }): Promise<{ success: boolean; reason?: string }> {
    const { oldPath, newPath, content, onRename } = options;

    try {
      const fileExists = await exists(newPath, {
        baseDir: BaseDirectory.AppData,
      });

      if (fileExists && newPath !== oldPath) {
        return { success: false, reason: "file_exists" };
      }

      // Save content to old location first
      await this.writeFile(oldPath.replace(`${DEFAULT_PATH}/`, ""), content);

      // Perform the rename
      await rename(oldPath, newPath, {
        oldPathBaseDir: BaseDirectory.AppData,
        newPathBaseDir: BaseDirectory.AppData,
      });

      const newFileName = newPath.replace(`${DEFAULT_PATH}/`, "");
      onRename(newFileName);

      return { success: true };
    } catch (error) {
      console.error("Error during safe rename:", error);
      return { success: false, reason: "error" };
    }
  }

  static async revealInFinder(path: string): Promise<void> {
    try {
      console.log('Revealing in finder, input path:', path);
      const fullPath = `${DEFAULT_PATH}/${path}`;
      console.log('Full path:', fullPath);

      // Check if file exists first
      const fileExists = await exists(fullPath, { baseDir: BaseDirectory.AppData });
      console.log('File exists?', fileExists);

      if (!fileExists) {
        throw new Error(`File does not exist: ${fullPath}`);
      }

      // Get the actual system path
      const appDataPath = await appDataDir();
      const systemPath = await join(appDataPath, fullPath);
      console.log('System path:', systemPath);

      // Use the reveal command to show in Finder
      // Note: The -R flag must be part of the same argument string
      console.log('Executing reveal command for:', systemPath);
      const command = Command.create('reveal', ['-R', systemPath]);
      const output = await command.execute();
      
      if (output.code !== 0) {
        throw new Error(`Failed to reveal in Finder: ${output.stderr}`);
      }
      
      console.log('Successfully revealed in Finder');
    } catch (error) {
      console.error('Error revealing in finder:', error);
      throw error;
    }
  }
} 