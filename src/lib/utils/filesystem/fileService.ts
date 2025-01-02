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

      const isDirectory = await exists(`${path}/${entry.name}/.`, {
        baseDir: BaseDirectory.AppData,
      });
      const fullPath = `${path}/${entry.name}`;

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
    return await readTextFile(`${DEFAULT_PATH}/${path}`, {
      baseDir: BaseDirectory.AppData,
    });
  }

  static async writeFile(path: string, content: string): Promise<void> {
    // Ensure the parent directory exists
    const parentDir = path.split("/").slice(0, -1).join("/");
    if (parentDir) {
      await mkdir(`${DEFAULT_PATH}/${parentDir}`, {
        recursive: true,
        baseDir: BaseDirectory.AppData,
      });
    }

    await writeTextFile(`${DEFAULT_PATH}/${path}`, content, {
      baseDir: BaseDirectory.AppData,
    });
  }

  static async deleteFile(path: string): Promise<void> {
    await remove(`${DEFAULT_PATH}/${path}`, {
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
      const content = "<h1></h1><p></p>";

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
} 