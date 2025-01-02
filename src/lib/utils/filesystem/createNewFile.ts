import { writeTextFile, mkdir, BaseDirectory } from "@tauri-apps/plugin-fs";
import { DEFAULT_PATH } from "../../constants";
import { generateUntitledName } from "./fileUtils";
import { CreateNewFileOptions } from "../../types/file";

export const createNewFile = async (options: CreateNewFileOptions = {}) => {
  const { onSuccess, onError, onLoadFiles } = options;

  try {
    // Ensure directory exists
    await mkdir(DEFAULT_PATH, {
      recursive: true,
      baseDir: BaseDirectory.AppData,
    });

    const fileName = await generateUntitledName();
    // Empty elements to allow placeholder text to show
    const initialContent = "<h1></h1><p></p>";

    await writeTextFile(`${DEFAULT_PATH}/${fileName}`, initialContent, {
      baseDir: BaseDirectory.AppData,
    });

    // Call success callback with content and filename
    onSuccess?.(initialContent, fileName);
    // Refresh file list if callback provided
    await onLoadFiles?.();

    return { fileName, content: initialContent };
  } catch (error) {
    console.error("Error creating file:", error);
    onError?.(error);
    throw error;
  }
};
