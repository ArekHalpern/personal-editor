import React from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ThemeToggle } from "./theme-toggle";
import {
  PanelLeftClose,
  PanelLeft,
  Search,
  Clock,
  FilePlus,
  Trash2,
  Pencil,
} from "lucide-react";
import { cn } from "../lib/utils/cn";
import { createNewFile } from "../lib/utils/filesystem/createNewFile";
import { ResizeHandle } from "./ui/resize-handle";
import {
  readDir,
  remove,
  readTextFile,
  mkdir,
  exists,
  rename,
  BaseDirectory,
  writeTextFile,
} from "@tauri-apps/plugin-fs";
import { ask } from "@tauri-apps/plugin-dialog";
import { DEFAULT_PATH } from "../lib/constants";
import { FileItem } from "../lib/types/file";
import { getDisplayName, getFileName } from "../lib/utils/string";
import { Editor } from "@tiptap/react";
import { Spinner } from "./ui/spinner";

interface SidebarProps {
  className?: string;
  isCollapsed: boolean;
  onToggle: () => void;
  onFileSelect: (content: string, filename?: string) => void;
  onFilesLoaded: (files: FileItem[]) => void;
  ref?: React.RefObject<{ loadFiles: () => Promise<void> }>;
  activeFile?: string;
  editor: Editor | null;
  onWidthChange?: (width: number) => void;
}

export const Sidebar = React.forwardRef<
  { loadFiles: () => Promise<void> },
  SidebarProps
>(
  (
    {
      className,
      isCollapsed,
      onToggle,
      onFileSelect,
      onFilesLoaded,
      activeFile,
      editor,
      onWidthChange,
    },
    ref
  ) => {
    const [recentFiles, setRecentFiles] = React.useState<FileItem[]>([]);
    const [searchQuery, setSearchQuery] = React.useState("");
    const [editingFile, setEditingFile] = React.useState<string | null>(null);
    const [editingName, setEditingName] = React.useState("");
    const [width, setWidth] = React.useState(300);
    const [isLoading, setIsLoading] = React.useState(false);
    const [loadingStates, setLoadingStates] = React.useState<{
      [key: string]: boolean;
    }>({});

    const setFileLoading = (path: string, loading: boolean) => {
      setLoadingStates((prev) => ({ ...prev, [path]: loading }));
    };

    const loadFiles = async () => {
      setIsLoading(true);
      try {
        // Ensure directory exists
        await mkdir(DEFAULT_PATH, {
          recursive: true,
          baseDir: BaseDirectory.AppData,
        });

        const files = await readDir(DEFAULT_PATH, {
          baseDir: BaseDirectory.AppData,
        });

        const htmlFiles = files
          .filter((file) => file.name?.endsWith(".html"))
          .map((file) => ({
            name: getDisplayName(file.name!),
            path: file.name!,
            lastModified: new Date(),
          }))
          .sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());

        setRecentFiles(htmlFiles);
        onFilesLoaded(htmlFiles);
      } catch (error) {
        console.error("Error loading files:", error);
      } finally {
        setIsLoading(false);
      }
    };

    // Expose loadFiles through ref
    React.useImperativeHandle(ref, () => ({
      loadFiles,
    }));

    React.useEffect(() => {
      loadFiles();
    }, []);

    const handleCreateNewFile = async () => {
      setIsLoading(true);
      try {
        await createNewFile({
          onSuccess: (content, fileName) => {
            onFileSelect(content, fileName);
          },
          onLoadFiles: loadFiles,
          onError: (error) => {
            console.error("Error creating file:", error);
          },
        });
      } catch (error) {
        console.error("Error creating file:", error);
      } finally {
        setIsLoading(false);
      }
    };

    const handleFileSelect = async (file: FileItem) => {
      if (file.path === activeFile) return; // Don't reload if it's already active

      setFileLoading(file.path, true);
      try {
        const content = await readTextFile(`${DEFAULT_PATH}/${file.path}`, {
          baseDir: BaseDirectory.AppData,
        });
        onFileSelect(content, file.path);
      } catch (error) {
        console.error("Error reading file:", error);
      } finally {
        // Small delay before removing loading state to prevent flicker
        setTimeout(() => {
          setFileLoading(file.path, false);
        }, 300);
      }
    };

    const deleteFile = async (path: string) => {
      setFileLoading(path, true);
      const confirmed = await ask(
        "Are you sure you want to delete this file?",
        {
          title: "Delete File",
        }
      );

      if (confirmed) {
        try {
          await remove(`${DEFAULT_PATH}/${path}`, {
            baseDir: BaseDirectory.AppData,
          });
          await loadFiles();
        } catch (error) {
          console.error("Error deleting file:", error);
        }
      }
      setFileLoading(path, false);
    };

    const handleRename = async (file: FileItem) => {
      // Start editing with the current display name
      setEditingFile(file.path);
      setEditingName(getDisplayName(file.name));
    };

    const handleRenameSubmit = async (
      file: FileItem,
      newDisplayName: string
    ) => {
      try {
        // Keep the original symbols and case when renaming
        const newFileName = getFileName(newDisplayName);
        const oldPath = `${DEFAULT_PATH}/${file.path}`;
        const newPath = `${DEFAULT_PATH}/${newFileName}`;

        // Check if target file already exists
        const fileExists = await exists(newPath, {
          baseDir: BaseDirectory.AppData,
        });
        if (fileExists && newPath !== oldPath) {
          await ask(
            "A file with this name already exists. Please choose a different name.",
            { title: "Error" }
          );
          return;
        }

        // Get current content if this is the active file
        let content = "";
        if (editor && file.path === activeFile) {
          content = editor.getHTML();
        } else {
          content = await readTextFile(`${DEFAULT_PATH}/${file.path}`, {
            baseDir: BaseDirectory.AppData,
          });
        }

        // Save content to old location first
        await writeTextFile(oldPath, content, {
          baseDir: BaseDirectory.AppData,
        });

        // Perform the rename
        await rename(oldPath, newPath, {
          oldPathBaseDir: BaseDirectory.AppData,
          newPathBaseDir: BaseDirectory.AppData,
        });

        // Update the editor's header content if this is the active file
        if (editor && file.path === activeFile) {
          // Find the first heading node and its position
          const firstHeading = editor
            .getJSON()
            .content?.find(
              (node) => node.type === "heading" && node.attrs?.level === 1
            );

          if (firstHeading) {
            // Update existing heading
            editor
              .chain()
              .focus()
              .clearContent()
              .insertContent([
                {
                  type: "heading",
                  attrs: { level: 1 },
                  content: [{ type: "text", text: newDisplayName }],
                },
                { type: "paragraph" },
              ])
              .run();
          } else {
            // Create new heading
            editor
              .chain()
              .focus()
              .clearContent()
              .insertContent([
                {
                  type: "heading",
                  attrs: { level: 1 },
                  content: [{ type: "text", text: newDisplayName }],
                },
                { type: "paragraph" },
              ])
              .run();
          }

          // Save the content to the new location
          await writeTextFile(newPath, editor.getHTML(), {
            baseDir: BaseDirectory.AppData,
          });
        }

        setEditingFile(null);
        setEditingName("");
        await loadFiles();
      } catch (error) {
        console.error("Error renaming file:", error);
      }
    };

    const filteredFiles = recentFiles.filter((file) =>
      file.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleResize = (delta: number) => {
      const newWidth = Math.max(200, Math.min(400, width + delta));
      setWidth(newWidth);
      onWidthChange?.(newWidth);
    };

    return (
      <div
        className={cn(
          "fixed top-0 left-0 flex h-screen flex-col border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-30",
          isCollapsed && "w-14 transition-[width] duration-300 ease-in-out",
          className
        )}
        style={!isCollapsed ? { width: `${width}px` } : undefined}
      >
        {!isCollapsed && (
          <ResizeHandle onResize={handleResize} className="bottom-9" />
        )}
        <div className="flex items-center justify-between p-2 border-b">
          {!isCollapsed && (
            <span className="text-xs font-medium px-2">Files</span>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={onToggle}
          >
            {isCollapsed ? (
              <PanelLeft className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>
        </div>
        {!isCollapsed && (
          <div className="flex flex-col h-[calc(100%-3.5rem)]">
            <div className="flex items-center gap-2 px-4 py-2">
              <Search className="h-3 w-3 text-muted-foreground" />
              <Input
                className="h-7 text-xs"
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 px-4 py-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 text-xs h-7"
                onClick={handleCreateNewFile}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Spinner size="sm" className="mr-2" />
                ) : (
                  <FilePlus className="h-3 w-3" />
                )}
                New File
              </Button>
            </div>
            <div className="flex items-center gap-2 px-4 py-2">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Recent</span>
            </div>
            <div className="flex-1 overflow-y-auto">
              <div className="pb-12">
                {filteredFiles.map((file) => {
                  const isActive =
                    file.path ===
                    (activeFile?.endsWith(".html")
                      ? activeFile
                      : `${activeFile}.html`);
                  const isFileLoading = loadingStates[file.path];

                  return (
                    <div
                      key={file.path}
                      className={cn(
                        "w-full text-left group/item flex items-center gap-2 px-4 py-1.5 hover:bg-accent cursor-pointer",
                        "transition-colors duration-200 ease-in-out",
                        isActive && "bg-accent"
                      )}
                      onClick={() => !isFileLoading && handleFileSelect(file)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (
                          (e.key === "Enter" || e.key === "Space") &&
                          !isFileLoading
                        ) {
                          handleFileSelect(file);
                        }
                      }}
                    >
                      <div className="flex-1 flex items-center min-w-0">
                        {editingFile === file.path ? (
                          <Input
                            className="h-6 text-xs"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => {
                              e.stopPropagation();
                              if (e.key === "Enter") {
                                handleRenameSubmit(file, editingName);
                              } else if (e.key === "Escape") {
                                setEditingFile(null);
                                setEditingName("");
                              }
                            }}
                            onBlur={() => {
                              setEditingFile(null);
                              setEditingName("");
                            }}
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <span
                            className={cn(
                              "truncate text-xs transition-opacity duration-200",
                              isFileLoading && "text-muted-foreground"
                            )}
                          >
                            {isFileLoading ? (
                              <div className="flex items-center gap-2 transition-opacity duration-200">
                                <Spinner size="sm" />
                                {getDisplayName(file.name)}
                              </div>
                            ) : (
                              getDisplayName(file.name)
                            )}
                          </span>
                        )}
                      </div>
                      {!isFileLoading && (
                        <div className="flex opacity-0 group-hover/item:opacity-100 transition-opacity shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRename(file);
                            }}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteFile(file.path);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex-shrink-0 border-t py-2 px-4">
              <ThemeToggle />
            </div>
          </div>
        )}
      </div>
    );
  }
);
