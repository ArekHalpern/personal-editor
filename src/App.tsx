import { useEditor, EditorContent } from "@tiptap/react";
import { useState, useEffect, useRef } from "react";
import { Sidebar } from "./components/Sidebar";
import { RightBar } from "./components/RightBar";
import { BubbleMenu } from "./components/BubbleMenu";
import { ThemeProvider } from "./components/theme-provider";
import { writeTextFile, mkdir, BaseDirectory } from "@tauri-apps/plugin-fs";
import "./index.css";
import { SaveIndicator } from "./components/SaveIndicator";
import { debounce } from "lodash";
import { EmptyState } from "./components/EmptyState";
import { createNewFile } from "./lib/utils/filesystem/createNewFile";
import { DEFAULT_PATH, AUTO_SAVE_DELAY } from "./lib/constants";
import { editorConfig, EnhancementHistoryItem } from "./lib/types/editor";
import {
  generateNumberedFileName,
  safeRename,
} from "./lib/utils/filesystem/fileUtils";

function App() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isRightBarCollapsed, setIsRightBarCollapsed] = useState(false);
  const [currentFile, setCurrentFile] = useState<string>("untitled.html");
  const [enhancementHistory, setEnhancementHistory] = useState<
    EnhancementHistoryItem[]
  >([]);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasFiles, setHasFiles] = useState(false);
  const sidebarRef = useRef<{ loadFiles: () => Promise<void> }>(null);

  // Create debounced save function with useRef to maintain reference
  const debouncedSaveRef = useRef(
    debounce(
      async (filePath: string, content: string, isRename: boolean = false) => {
        if (!filePath) return;

        try {
          setIsSaving(true);

          // Create directory if it doesn't exist
          await mkdir(DEFAULT_PATH, {
            recursive: true,
            baseDir: BaseDirectory.AppData,
          });

          // Ensure file path is properly formatted
          const fileName = filePath.includes("/")
            ? filePath.split("/").pop()!
            : filePath;
          const fullPath = `${DEFAULT_PATH}/${fileName}`;

          console.log("Saving file:", {
            fileName,
            fullPath,
            baseDir: "AppData",
            contentLength: content.length,
            isRename,
          });

          // Write the file
          await writeTextFile(fullPath, content, {
            baseDir: BaseDirectory.AppData,
          });

          setLastSaved(new Date());
          console.log("File saved successfully:", fileName);

          // Only refresh sidebar if this was a rename operation
          if (isRename) {
            await sidebarRef.current?.loadFiles();
          }
        } catch (error) {
          console.error("Error saving file:", {
            error,
            filePath,
            fullPath: `${DEFAULT_PATH}/${filePath}`,
          });
        } finally {
          setIsSaving(false);
        }
      },
      AUTO_SAVE_DELAY
    )
  );

  // Initialize the editor
  const editor = useEditor({
    ...editorConfig,
    content: "",
  });

  // Handle editor cleanup
  useEffect(() => {
    return () => {
      if (editor && !editor.isDestroyed) {
        editor.commands.setTextSelection(0);
      }
    };
  }, [editor]);

  // Clear editor content when there are no files
  useEffect(() => {
    if (!editor) return;
    if (!hasFiles) {
      editor.commands.clearContent();
      // Ensure selection is cleared to prevent BubbleMenu errors
      editor.commands.setTextSelection(0);
    }
  }, [editor, hasFiles]);

  // Handle editor updates
  useEffect(() => {
    if (!editor) return;

    const handleUpdate = async () => {
      if (!hasFiles || !currentFile) return;

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
          const sanitizedHeader = headerText
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");
          const newFileName = `${sanitizedHeader}.html`;

          if (newFileName !== currentFile) {
            const oldPath = `${DEFAULT_PATH}/${currentFile}`;
            const newPath = `${DEFAULT_PATH}/${newFileName}`;

            try {
              // Cancel any pending saves
              debouncedSaveRef.current.cancel();

              // Try to rename the file
              const result = await safeRename({
                oldPath,
                newPath,
                content: editor.getHTML(),
                onRename: (fileName) => {
                  setCurrentFile(fileName);
                  debouncedSaveRef.current(fileName, editor.getHTML(), true);
                },
              });

              if (!result.success && result.reason === "file_exists") {
                // If file exists, generate a numbered filename
                const newFileNameWithNumber = await generateNumberedFileName(
                  sanitizedHeader
                );
                const newPathWithNumber = `${DEFAULT_PATH}/${newFileNameWithNumber}`;

                await safeRename({
                  oldPath,
                  newPath: newPathWithNumber,
                  content: editor.getHTML(),
                  onRename: (fileName) => {
                    setCurrentFile(fileName);
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
    };

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
  }, [editor, currentFile, hasFiles]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      debouncedSaveRef.current.cancel();
    };
  }, []);

  // Initialize the documents directory
  useEffect(() => {
    const initDirectory = async () => {
      try {
        await mkdir(DEFAULT_PATH, {
          recursive: true,
          baseDir: BaseDirectory.AppData,
        });
      } catch (error) {
        if (
          !(error instanceof Error) ||
          !error.message.includes("File exists")
        ) {
          console.error("Directory initialization error:", error);
        }
      }
    };
    initDirectory();
  }, []);

  const handleFileSelect = (content: string, filename?: string) => {
    if (editor) {
      editor.commands.setContent(content);
      editor.commands.setTextSelection(1); // Move cursor to start of content
      // Ensure filename is properly formatted
      const fileName = filename?.endsWith(".html")
        ? filename
        : `${filename}.html`;
      console.log("Selected file:", fileName);
      setCurrentFile(fileName);
      setHasFiles(true);
    }
  };

  const handleEnhance = (
    original: string,
    enhanced: string,
    prompt: string
  ) => {
    setEnhancementHistory((prev) => [
      {
        original,
        enhanced,
        prompt,
        timestamp: new Date(),
      },
      ...prev,
    ]);
  };

  // Add createNewFile function
  const handleCreateNewFile = async () => {
    try {
      await createNewFile({
        onSuccess: (content, fileName) => {
          if (editor) {
            editor.commands.setContent(content);
            editor.commands.setTextSelection(1); // Move cursor to start
            setCurrentFile(fileName);
            setHasFiles(true);
          }
        },
        onLoadFiles: async () => {
          await sidebarRef.current?.loadFiles();
        },
      });
    } catch (error) {
      console.error("Error creating file:", error);
    }
  };

  if (!editor) {
    return null;
  }

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <div className="flex h-screen bg-background">
        <Sidebar
          ref={sidebarRef}
          isCollapsed={isSidebarCollapsed}
          onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          onFileSelect={handleFileSelect}
          onFilesLoaded={(files) => setHasFiles(files.length > 0)}
          activeFile={currentFile}
        />
        <main className="flex-1 overflow-hidden">
          <div className="relative h-full">
            {hasFiles ? (
              <>
                <BubbleMenu editor={editor} onEnhance={handleEnhance} />
                <div className="h-full pb-10">
                  <EditorContent
                    editor={editor}
                    className="h-full overflow-y-auto"
                  />
                  <SaveIndicator lastSaved={lastSaved} saving={isSaving} />
                </div>
              </>
            ) : (
              <EmptyState onCreateFile={handleCreateNewFile} />
            )}
          </div>
        </main>
        <RightBar
          editor={editor}
          isCollapsed={isRightBarCollapsed}
          onToggle={() => setIsRightBarCollapsed(!isRightBarCollapsed)}
          enhancementHistory={enhancementHistory}
          onEnhance={handleEnhance}
        />
      </div>
    </ThemeProvider>
  );
}

export default App;
