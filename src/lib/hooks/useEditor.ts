import { useCallback, useEffect, useRef } from "react";
import { Editor } from "@tiptap/react";
import { debounce } from "lodash";
import { FileService } from "../utils/filesystem/fileService";
import { AUTO_SAVE_DELAY } from "../constants";

interface UseEditorProps {
  editor: Editor | null;
  currentFile: string;
  onSaveStart: () => void;
  onSaveEnd: () => void;
}

export function useEditor({
  editor,
  currentFile,
  onSaveStart,
  onSaveEnd,
}: UseEditorProps) {
  const debouncedSaveRef = useRef(
    debounce(
      async (filePath: string, content: string, isRename: boolean = false) => {
        if (!filePath) return;

        try {
          onSaveStart();

          await FileService.writeFile(filePath, content);

          if (isRename) {
            await FileService.loadFiles();
          }
        } catch (error) {
          console.error("Error saving file:", {
            error,
            filePath,
            fullPath: FileService.getFullPath(filePath),
          });
        } finally {
          onSaveEnd();
        }
      },
      AUTO_SAVE_DELAY
    )
  );

  const handleUpdate = useCallback(async () => {
    if (!editor || !currentFile) return;

    // Just do a normal save, no automatic renaming
    debouncedSaveRef.current(currentFile, editor.getHTML());
  }, [editor, currentFile]);

  useEffect(() => {
    if (!editor) return;

    let updateTimeout: NodeJS.Timeout;
    const debouncedUpdate = () => {
      clearTimeout(updateTimeout);
      updateTimeout = setTimeout(handleUpdate, 500);
    };

    editor.on("update", debouncedUpdate);

    return () => {
      clearTimeout(updateTimeout);
      editor.off("update", debouncedUpdate);
    };
  }, [editor, handleUpdate]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      debouncedSaveRef.current.cancel();
    };
  }, []);

  return {
    handleUpdate,
  };
} 