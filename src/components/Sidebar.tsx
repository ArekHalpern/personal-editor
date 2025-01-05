import React, { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

import {
  PanelLeftClose,
  PanelLeft,
  Search,
  FilePlus,
  FolderPlus,
  Settings,
} from "lucide-react";
import { cn } from "../lib/utils/cn";
import { ResizeHandle } from "./ui/resize-handle";
import { FileItem } from "../lib/types/file";
import { Editor } from "@tiptap/react";
import { useFileOperations } from "../lib/hooks/useFileOperations";
import { useSidebarUI } from "../lib/hooks/useSidebarUI";
import { FileService } from "../lib/utils/filesystem/fileService";
import { FileTreeItem } from "./FileTreeItem";
import { SettingsDialog } from "./ui/settings-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

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
    const [showSettings, setShowSettings] = useState(false);
    const {
      recentFiles,
      editingFile,
      editingName,
      loadFiles,
      handleFileSelect,
      deleteFile,
      handleRename,
      handleRenameSubmit,
      setEditingFile,
      setEditingName,
    } = useFileOperations({
      onFileSelect,
      onFilesLoaded,
      editor,
      activeFile,
    });

    const { searchQuery, width, handleResize, handleSearch } = useSidebarUI({
      onWidthChange,
    });

    // Get all folders for the move operation
    const allFolders = React.useMemo(() => {
      const folders: FileItem[] = [];
      const traverse = (items: FileItem[]) => {
        items.forEach((item) => {
          if (item.isDirectory) {
            folders.push(item);
            if (item.children) {
              traverse(item.children);
            }
          }
        });
      };
      traverse(recentFiles);
      return folders;
    }, [recentFiles]);

    const handleMoveFile = async (sourcePath: string, targetPath: string) => {
      try {
        const fileName = sourcePath.split("/").pop()!;
        const newPath = `${targetPath}/${fileName}`;
        await FileService.moveFile(sourcePath, newPath);
        await loadFiles();
      } catch (error) {
        console.error("Error moving file:", error);
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
        await FileService.createNewFile({
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

    const handleCreateNewFolder = async () => {
      try {
        await FileService.createFolder();
        await loadFiles();
      } catch (error) {
        console.error("Error creating folder:", error);
      }
    };

    const filteredFiles = recentFiles.filter((file) => {
      const searchLower = searchQuery.toLowerCase();
      if (file.isDirectory) {
        return (
          file.name.toLowerCase().includes(searchLower) ||
          file.children?.some((child) =>
            child.name.toLowerCase().includes(searchLower)
          )
        );
      }
      return file.name.toLowerCase().includes(searchLower);
    });

    const [isDragOver, setIsDragOver] = useState(false);

    return (
      <TooltipProvider>
        <div
          className={cn(
            "group/sidebar fixed top-0 left-0 flex h-screen flex-col border-r",
            "bg-muted/50 dark:bg-muted/50 backdrop-blur supports-[backdrop-filter]:bg-muted/50",
            isCollapsed && "w-14 transition-[width] duration-300 ease-in-out",
            className
          )}
          style={!isCollapsed ? { width: `${width}px` } : undefined}
          data-sidebar-ref=""
          ref={(el) => {
            if (el) {
              (el as any).__loadFiles = loadFiles;
            }
          }}
        >
          {!isCollapsed && (
            <ResizeHandle onResize={handleResize} className="bottom-9" />
          )}
          <div className="flex items-center justify-between p-2 border-b">
            {!isCollapsed && (
              <span className="text-xs font-medium px-2">Files</span>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
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
              </TooltipTrigger>
              <TooltipContent>
                {isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              </TooltipContent>
            </Tooltip>
          </div>
          {!isCollapsed && (
            <div className="flex flex-col h-[calc(100%-3.5rem)]">
              <div className="flex items-center gap-2 px-4 py-2">
                <Search className="h-3 w-3 text-muted-foreground" />
                <Input
                  className="h-7 text-xs"
                  placeholder="Search files..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-1 px-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={handleCreateNewFile}
                    >
                      <FilePlus className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>New file</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={handleCreateNewFolder}
                    >
                      <FolderPlus className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>New folder</TooltipContent>
                </Tooltip>
              </div>
              <div className="flex-1 overflow-y-auto">
                <div
                  className={cn(
                    "pb-12 min-h-[200px]",
                    isDragOver && "bg-accent/50 ring-1 ring-primary"
                  )}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log("🟨 Root Drag Enter");
                    setIsDragOver(true);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log("🟨 Root Drag Over");
                    e.dataTransfer.dropEffect = "move";
                    setIsDragOver(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    // Check if we're actually leaving the root element
                    const rect = (
                      e.currentTarget as HTMLElement
                    ).getBoundingClientRect();
                    if (
                      e.clientX < rect.left ||
                      e.clientX >= rect.right ||
                      e.clientY < rect.top ||
                      e.clientY >= rect.bottom
                    ) {
                      console.log("🟨 Root Drag Leave");
                      setIsDragOver(false);
                    }
                  }}
                  onDrop={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDragOver(false);

                    const sourcePath =
                      e.dataTransfer.getData("application/x-file") ||
                      e.dataTransfer.getData("text/plain");
                    console.log("🟩 Root Drop Event:", { sourcePath });
                    if (!sourcePath) {
                      console.log("❌ Root Drop rejected: no source path");
                      return;
                    }

                    try {
                      console.log("✅ Moving file to root:", {
                        from: sourcePath,
                      });
                      await handleMoveFile(sourcePath, "");
                    } catch (error) {
                      console.error("Error moving file to root:", error);
                    }
                  }}
                >
                  {filteredFiles.map((file) => (
                    <FileTreeItem
                      key={file.path}
                      item={file}
                      level={0}
                      activeFile={activeFile}
                      editingFile={editingFile}
                      editingName={editingName}
                      onSelect={handleFileSelect}
                      onDelete={deleteFile}
                      onRename={handleRename}
                      onRenameSubmit={handleRenameSubmit}
                      setEditingFile={setEditingFile}
                      setEditingName={setEditingName}
                      onMoveFile={handleMoveFile}
                      allFolders={allFolders}
                    />
                  ))}
                </div>
              </div>
              <div className="flex-shrink-0 border-t py-1 px-4">
                <div className="flex items-center justify-left">
                  {!isCollapsed && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => setShowSettings(true)}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Settings</TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>
            </div>
          )}

          <SettingsDialog open={showSettings} onOpenChange={setShowSettings} />
        </div>
      </TooltipProvider>
    );
  }
);
