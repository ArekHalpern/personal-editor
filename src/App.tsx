import { useEditor, EditorContent } from "@tiptap/react";
import { useState, useEffect, useRef } from "react";
import { Sidebar } from "./components/Sidebar";
import { RightBar } from "./components/RightBar";
import { BubbleMenu } from "./components/BubbleMenu";
import { ThemeProvider } from "./components/theme-provider";
import "./index.css";
import { Footer } from "./components/Footer";
import { debounce } from "lodash";
import { EmptyState } from "./components/EmptyState";
import { AUTO_SAVE_DELAY } from "./lib/constants";
import { editorConfig, EnhancementHistoryItem } from "./lib/types/editor";
import { Header } from "./components/Header";
import { FileService } from "./lib/utils/filesystem/fileService";
import { useSettings } from "./lib/stores/settings";

function App() {
  const { settings } = useSettings();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isRightBarCollapsed, setIsRightBarCollapsed] = useState(false);
  const [currentFile, setCurrentFile] = useState<string>("untitled.html");
  const [enhancementHistory, setEnhancementHistory] = useState<
    EnhancementHistoryItem[]
  >([]);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasFiles, setHasFiles] = useState(false);
  const [createdAt, setCreatedAt] = useState<Date | null>(null);
  const [rightBarWidth, setRightBarWidth] = useState(400);
  const [sidebarWidth, setSidebarWidth] = useState(300);
  const sidebarRef = useRef<{ loadFiles: () => Promise<void> }>(null);

  // Load most recent file on startup
  useEffect(() => {
    const loadMostRecentFile = async () => {
      try {
        // Ensure directory exists
        await FileService.ensureDirectory();

        // Get all files
        const files = await FileService.loadFiles();

        // If we have files, load the most recent one
        if (files.length > 0) {
          const content = await FileService.readFile(files[0].path);
          handleFileSelect(content, files[0].path);
        }
      } catch (error) {
        console.error("Error loading most recent file:", error);
      }
    };

    loadMostRecentFile();
  }, []); // Run once on startup

  // Create debounced save function with useRef to maintain reference
  const debouncedSaveRef = useRef(
    debounce(
      async (filePath: string, content: string, isRename: boolean = false) => {
        if (!filePath) return;

        try {
          setIsSaving(true);

          await FileService.writeFile(filePath, content);

          setLastSaved(new Date());
          console.log("File saved successfully:", filePath);

          // Only refresh sidebar if this was a rename operation
          if (isRename) {
            await sidebarRef.current?.loadFiles();
          }
        } catch (error) {
          console.error("Error saving file:", {
            error,
            filePath,
            fullPath: FileService.getFullPath(filePath),
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
    autofocus: "start",
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
      // Just do a normal save
      debouncedSaveRef.current(currentFile, editor.getHTML());
    };

    const debouncedUpdate = debounce(handleUpdate, AUTO_SAVE_DELAY);
    editor.on("update", debouncedUpdate);

    return () => {
      editor.off("update", debouncedUpdate);
      debouncedUpdate.cancel();
    };
  }, [editor, currentFile, hasFiles]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      debouncedSaveRef.current.cancel();
    };
  }, []);

  const handleFileSelect = (content: string, filename?: string) => {
    if (editor) {
      editor.commands.setContent(content);
      // Focus at the end of the content
      editor.commands.focus("end");

      // Ensure filename is properly formatted
      const fileName = filename?.endsWith(".html")
        ? filename
        : `${filename}.html`;
      console.log("Selected file:", fileName);
      setCurrentFile(fileName);
      setHasFiles(true);

      // Extract creation date from filename if it exists, otherwise use current date
      const dateMatch = fileName.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (dateMatch) {
        const [, year, month, day] = dateMatch;
        setCreatedAt(
          new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
        );
      } else {
        setCreatedAt(new Date());
      }
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
      await FileService.createNewFile({
        onSuccess: (content, fileName) => {
          if (editor) {
            editor.commands.setContent(content);
            // Focus at the end of the content
            editor.commands.focus("end");
            setCurrentFile(fileName);
            setHasFiles(true);
            setCreatedAt(new Date());
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

  // Apply editor settings
  useEffect(() => {
    if (settings.editor) {
      document.documentElement.style.setProperty(
        "--editor-font-size",
        `${settings.editor.fontSize}px`
      );
      document.documentElement.style.setProperty(
        "--editor-line-height",
        String(settings.editor.lineHeight)
      );
    }
  }, [settings.editor]);

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
          editor={editor}
          onWidthChange={setSidebarWidth}
        />
        <main
          className="flex-1 overflow-hidden"
          style={{
            marginLeft: isSidebarCollapsed ? "3.5rem" : `${sidebarWidth}px`,
          }}
        >
          <div className="flex flex-col h-full">
            {hasFiles ? (
              <>
                <Header
                  currentFile={currentFile}
                  onTitleChange={async (title) => {
                    if (!currentFile) return;

                    try {
                      const result = await FileService.renameFile(
                        currentFile,
                        title,
                        editor,
                        true
                      );

                      if (result.success && result.fileName) {
                        setCurrentFile(result.fileName);
                        // Reload files to update sidebar
                        sidebarRef.current?.loadFiles();
                      }
                    } catch (error) {
                      console.error("Error during rename:", error);
                    }
                  }}
                />
                <div className="flex-1 min-h-0 relative">
                  <div className="absolute inset-0 overflow-y-auto">
                    <div className="min-h-full pb-[60px]">
                      <BubbleMenu editor={editor} onEnhance={handleEnhance} />
                      <EditorContent editor={editor} className="h-full" />
                    </div>
                  </div>
                </div>
                <Footer
                  lastSaved={lastSaved}
                  saving={isSaving}
                  createdAt={createdAt || undefined}
                  isRightBarCollapsed={isRightBarCollapsed}
                  rightBarWidth={rightBarWidth}
                  isSidebarCollapsed={isSidebarCollapsed}
                  sidebarWidth={sidebarWidth}
                />
              </>
            ) : (
              <EmptyState onCreateFile={handleCreateNewFile} />
            )}
          </div>
        </main>
        <RightBar
          isCollapsed={isRightBarCollapsed}
          onToggle={() => setIsRightBarCollapsed(!isRightBarCollapsed)}
          editor={editor}
          enhancementHistory={enhancementHistory}
          onEnhance={handleEnhance}
          onWidthChange={setRightBarWidth}
          currentFile={currentFile}
        />
      </div>
    </ThemeProvider>
  );
}

export default App;
