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
import { cn } from "../lib/utils";
import { createNewFile } from "../lib/utils/createNewFile";
import { ResizeHandle } from "./ui/resize-handle";
import {
  readDir,
  remove,
  readTextFile,
  mkdir,
  exists,
  rename,
  BaseDirectory,
} from "@tauri-apps/plugin-fs";
import { ask } from "@tauri-apps/plugin-dialog";
import { DEFAULT_PATH } from "../lib/constants";
import { FileItem } from "../lib/types";

interface SidebarProps {
  className?: string;
  isCollapsed: boolean;
  onToggle: () => void;
  onFileSelect: (content: string, filename?: string) => void;
  onFilesLoaded: (files: FileItem[]) => void;
  ref?: React.RefObject<{ loadFiles: () => Promise<void> }>;
  activeFile?: string;
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
    },
    ref
  ) => {
    const [recentFiles, setRecentFiles] = React.useState<FileItem[]>([]);
    const [searchQuery, setSearchQuery] = React.useState("");
    const [editingFile, setEditingFile] = React.useState<string | null>(null);
    const [editingName, setEditingName] = React.useState("");
    const [width, setWidth] = React.useState(180); // Start at minimum width

    const loadFiles = async () => {
      try {
        // Ensure directory exists
        await mkdir(DEFAULT_PATH, {
          recursive: true,
          baseDir: BaseDirectory.AppData,
        });

        const files = await readDir(DEFAULT_PATH, {
          baseDir: BaseDirectory.AppData,
        });

        const fileItems: FileItem[] = files
          .filter((file) => file.name !== null && file.name.endsWith(".html"))
          .map((file) => {
            // Extract date from filename (assumes YYYY-MM-DD format)
            const name = file.name!.replace(".html", "");
            const dateParts = name.split("-");
            if (dateParts.length >= 3) {
              const [year, month, day, ...rest] = dateParts;
              const displayDate = `${parseInt(month)}/${parseInt(day)}/${year}`;
              const suffix = rest.length > 0 ? `-${rest.join("-")}` : "";
              return {
                name: displayDate + suffix,
                path: file.name!,
                lastModified: new Date(),
              };
            }
            return {
              name,
              path: file.name!,
              lastModified: new Date(),
            };
          })
          .sort((a, b) => {
            // Sort by date (newest first) and then by suffix number if dates are the same
            const aDate = a.path.split("-").slice(0, 3).join("-");
            const bDate = b.path.split("-").slice(0, 3).join("-");

            if (aDate === bDate) {
              // If dates are the same, sort by suffix number
              const aNum = parseInt(a.path.split("-")[3] || "0");
              const bNum = parseInt(b.path.split("-")[3] || "0");
              return bNum - aNum;
            }

            // Sort by date in reverse chronological order
            return bDate.localeCompare(aDate);
          });

        setRecentFiles(fileItems);
        onFilesLoaded(fileItems);
      } catch (error) {
        console.error("Error loading files:", error);
        onFilesLoaded([]);
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
      }
    };

    const handleFileSelect = async (file: FileItem) => {
      try {
        const content = await readTextFile(`${DEFAULT_PATH}/${file.path}`, {
          baseDir: BaseDirectory.AppData,
        });
        onFileSelect(content, file.path);
      } catch (error) {
        console.error("Error reading file:", error);
      }
    };

    const deleteFile = async (path: string) => {
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
    };

    const handleRename = async (file: FileItem) => {
      // Start editing with the current display name
      setEditingFile(file.path);
      setEditingName(file.name);
    };

    const handleRenameSubmit = async (
      file: FileItem,
      newDisplayName: string
    ) => {
      try {
        // Convert display name (M/D/YYYY) back to file format (YYYY-MM-DD)
        let newFileName = newDisplayName;
        const dateParts = newDisplayName.split("/");
        if (dateParts.length === 3) {
          const [month, day, year] = dateParts;
          newFileName = `${year}-${month.padStart(2, "0")}-${day.padStart(
            2,
            "0"
          )}`;
        }

        // Add back the .html extension
        const oldPath = `${DEFAULT_PATH}/${file.path}`;
        const newPath = `${DEFAULT_PATH}/${newFileName}.html`;

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

        await rename(oldPath, newPath, {
          oldPathBaseDir: BaseDirectory.AppData,
          newPathBaseDir: BaseDirectory.AppData,
        });
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
      const newWidth = Math.max(180, Math.min(576, width + delta)); // Min: 180px, Max: 576px
      setWidth(newWidth);
    };

    return (
      <div
        className={cn(
          "group relative flex flex-col border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
          isCollapsed ? "w-14" : "",
          className
        )}
        style={!isCollapsed ? { width: `${width}px` } : undefined}
      >
        {!isCollapsed && <ResizeHandle onResize={handleResize} />}
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
              >
                <FilePlus className="h-3 w-3" />
                New File
              </Button>
            </div>
            <div className="flex items-center gap-2 px-4 py-2">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Recent</span>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0">
              <div className="pb-12">
                {filteredFiles.map((file) => {
                  const isActive =
                    file.path ===
                    (activeFile?.endsWith(".html")
                      ? activeFile
                      : `${activeFile}.html`);
                  return (
                    <div
                      key={file.path}
                      className={cn(
                        "w-full text-left group/item flex items-center gap-2 px-4 py-1.5 hover:bg-accent cursor-pointer",
                        isActive && "bg-accent"
                      )}
                      onClick={() => handleFileSelect(file)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === "Space") {
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
                          <span className="truncate text-xs">{file.name}</span>
                        )}
                      </div>
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
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-2 px-4">
              <ThemeToggle />
            </div>
          </div>
        )}
      </div>
    );
  }
);
