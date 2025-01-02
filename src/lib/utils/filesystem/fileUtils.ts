import { readDir, exists, rename, writeTextFile, BaseDirectory } from "@tauri-apps/plugin-fs";
import { DEFAULT_PATH } from "../../constants";
import { FileRenameOptions, FileOperationResult } from "../../types/file";
import { sanitizeFileName } from "../string";

export const findNextAvailableNumber = async (
  baseNamePattern: RegExp,
  startAtZero: boolean = false
): Promise<number> => {
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
};

export const generateUntitledName = async (): Promise<string> => {
  const baseNamePattern = /^Untitled(?:-(\d+))?\.html$/;
  const nextNum = await findNextAvailableNumber(baseNamePattern, true);
  
  return nextNum === 0
    ? "Untitled.html"
    : `Untitled-${String(nextNum).padStart(2, "0")}.html`;
};

export const generateNumberedFileName = async (baseName: string): Promise<string> => {
  const sanitizedName = sanitizeFileName(baseName);
  const baseNamePattern = new RegExp(`^${sanitizedName}(?:-(\\d+))?\\.html$`);
  const nextNum = await findNextAvailableNumber(baseNamePattern);
  
  return `${sanitizedName}-${String(nextNum).padStart(2, "0")}.html`;
};

export const safeRename = async ({
  oldPath,
  newPath,
  content,
  onRename,
}: FileRenameOptions): Promise<FileOperationResult> => {
  try {
    // Check if target file exists
    const fileExists = await exists(newPath, {
      baseDir: BaseDirectory.AppData,
    });

    if (!fileExists || newPath === oldPath) {
      // Save content to old file location
      await writeTextFile(oldPath, content, {
        baseDir: BaseDirectory.AppData,
      });

      // Rename the file
      await rename(oldPath, newPath, {
        oldPathBaseDir: BaseDirectory.AppData,
        newPathBaseDir: BaseDirectory.AppData,
      });

      const newFileName = newPath.split("/").pop()!;
      onRename?.(newFileName);
      return { success: true, fileName: newFileName };
    }

    return { success: false, reason: "file_exists" };
  } catch (error) {
    console.error("Error during rename:", error);
    return { success: false, reason: "error", error };
  }
}; 