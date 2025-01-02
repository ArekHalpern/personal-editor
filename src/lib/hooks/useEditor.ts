import { useCallback, useEffect, useRef } from "react";
import { Editor } from "@tiptap/react";
import { debounce } from "lodash";
import { FileService } from "../utils/filesystem/fileService";
import { AUTO_SAVE_DELAY } from "../constants";
import { getFileName } from "../utils/string";

interface UseEditorProps {
  editor: Editor | null;
  currentFile: string;
  onFileChange: (fileName: string) => void;
  onSaveStart: () => void;
  onSaveEnd: () => void;
}

export function useEditor({
  editor,
  currentFile,
  onFileChange,
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

    // Get the first heading content
    const heading = editor
      .getJSON()
      .content?.find(
        (node) => node.type === "heading" && node.attrs?.level === 1
      );

    if (heading?.content?.[0]?.text) {
      const headerText = heading.content[0].text.trim();
      if (headerText) {
        // Generate new filename from header text
        const newFileName = getFileName(headerText);

        if (newFileName !== currentFile) {
          const oldPath = FileService.getFullPath(currentFile);
          const newPath = FileService.getFullPath(newFileName);

          try {
            // Cancel any pending saves
            debouncedSaveRef.current.cancel();

            // Try to rename the file
            const result = await FileService.safeRename({
              oldPath,
              newPath,
              content: editor.getHTML(),
              onRename: (fileName: string) => {
                onFileChange(fileName);
                debouncedSaveRef.current(fileName, editor.getHTML(), true);
              },
            });

            if (!result.success && result.reason === "file_exists") {
              // If file exists, generate a numbered filename
              const newFileNameWithNumber = await FileService.generateNumberedFileName(
                headerText
              );
              const newPathWithNumber = FileService.getFullPath(
                newFileNameWithNumber
              );

              await FileService.safeRename({
                oldPath,
                newPath: newPathWithNumber,
                content: editor.getHTML(),
                onRename: (fileName: string) => {
                  onFileChange(fileName);
                  debouncedSaveRef.current(fileName, editor.getHTML(), true);
                },
              });
            }

            return;
          } catch (error) {
            console.error("Error during rename:", error);
          }
        }
      }
    }

    // If we didn't do a rename, just do a normal save
    debouncedSaveRef.current(currentFile, editor.getHTML());
  }, [editor, currentFile, onFileChange]);

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