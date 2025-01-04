import { useState, useRef } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ChevronRight, MoreVertical } from "lucide-react";
import { cn } from "../lib/utils/cn";
import { FileItem } from "../lib/types/file";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "../components/ui/context-menu";
import { ConfirmDialog } from "./ui/confirm-dialog";
import { useSettings } from "../lib/stores/settings";
import { FileService } from "../lib/utils/filesystem/fileService";

interface FileTreeItemProps {
  item: FileItem;
  level: number;
  activeFile?: string;
  editingFile: string | null;
  editingName: string;
  onSelect: (file: FileItem) => void;
  onDelete: (path: string) => void;
  onRename: (file: FileItem) => void;
  onRenameSubmit: (file: FileItem, newName: string) => void;
  setEditingFile: (path: string | null) => void;
  setEditingName: (name: string) => void;
  onMoveFile?: (sourcePath: string, targetPath: string) => void;
  allFolders?: FileItem[];
}

export function FileTreeItem({
  item,
  level,
  activeFile,
  editingFile,
  editingName,
  onSelect,
  onDelete,
  onRename,
  onRenameSubmit,
  setEditingFile,
  setEditingName,
  onMoveFile,
  allFolders,
}: FileTreeItemProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const contextMenuTriggerRef = useRef<HTMLDivElement>(null);
  const { settings } = useSettings();

  const isActive =
    item.path ===
    (activeFile?.endsWith(".html") ? activeFile : `${activeFile}.html`);
  const paddingLeft = level * 12 + (item.isDirectory ? 0 : 12);

  const handleDelete = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (settings.confirmations.fileDelete) {
      setShowDeleteDialog(true);
    } else {
      onDelete(item.path);
    }
  };

  const handleConfirmDelete = (neverAskAgain: boolean) => {
    if (neverAskAgain) {
      useSettings.setState((state) => ({
        settings: {
          ...state.settings,
          confirmations: {
            ...state.settings.confirmations,
            fileDelete: false,
          },
        },
      }));
    }
    onDelete(item.path);
  };

  const handleRename = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    onRename(item);
  };

  const handleRevealInFinder = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await FileService.revealInFinder(item.path);
    } catch (error) {
      console.error("Error revealing in finder:", error);
    }
  };

  // Filter out the current folder and its children from available move targets
  const availableFolders = allFolders?.filter((folder) => {
    if (item.isDirectory) {
      // Don't allow moving a folder into itself or its children
      return !folder.path.startsWith(item.path);
    }
    return true;
  });

  const handleDragStart = (e: React.DragEvent) => {
    console.log("🟦 Drag Start:", item.path);
    e.stopPropagation();
    setIsDragging(true);
    // Set both data types to ensure compatibility
    e.dataTransfer.setData("application/x-file", item.path);
    e.dataTransfer.setData("text/plain", item.path);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = (e: React.DragEvent) => {
    console.log("🟦 Drag End:", item.path);
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    // Only handle drag over for directories
    if (!item.isDirectory) return;

    e.preventDefault();
    e.stopPropagation();
    console.log("🟨 Drag Over Directory:", item.path);
    e.dataTransfer.dropEffect = "move";
    setIsDragOver(true);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    // Only handle drag enter for directories
    if (!item.isDirectory) return;

    e.preventDefault();
    e.stopPropagation();
    console.log("🟨 Drag Enter Directory:", item.path);
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!item.isDirectory) return;

    e.preventDefault();
    e.stopPropagation();

    // Check if we're actually leaving the element
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    if (
      e.clientX < rect.left ||
      e.clientX >= rect.right ||
      e.clientY < rect.top ||
      e.clientY >= rect.bottom
    ) {
      console.log("🟨 Drag Leave Directory:", item.path);
      setIsDragOver(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    // Try both data types
    const sourcePath =
      e.dataTransfer.getData("application/x-file") ||
      e.dataTransfer.getData("text/plain");
    console.log("🟩 Drop Event:", {
      source: sourcePath,
      target: item.path,
      isDirectory: item.isDirectory,
    });

    // Don't allow dropping onto itself or non-directories
    if (!item.isDirectory || sourcePath === item.path || !sourcePath) {
      console.log("❌ Drop rejected:", {
        reason: !item.isDirectory ? "not a directory" : "same path",
      });
      return;
    }

    // Don't allow dropping a folder into its own child
    if (item.path.startsWith(sourcePath + "/")) {
      console.log("❌ Drop rejected: cannot drop parent into child");
      return;
    }

    try {
      console.log("✅ Moving file:", { from: sourcePath, to: item.path });
      await onMoveFile?.(sourcePath, item.path);
    } catch (error) {
      console.error("Error moving file:", error);
    }
  };

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger ref={contextMenuTriggerRef}>
          <div
            className={cn(
              "w-full text-left group/item flex items-center gap-2 px-4 py-1.5 hover:bg-accent cursor-pointer",
              "transition-colors duration-200 ease-in-out relative",
              isActive && "bg-accent",
              isDragging && "opacity-50",
              isDragOver &&
                item.isDirectory &&
                "bg-accent/50 ring-1 ring-primary",
              item.isDirectory && "font-medium"
            )}
            style={{ paddingLeft: `${paddingLeft}px` }}
            draggable
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => {
              if (item.isDirectory) {
                setIsExpanded(!isExpanded);
              } else {
                onSelect(item);
              }
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === "Space") {
                if (item.isDirectory) {
                  setIsExpanded(!isExpanded);
                } else {
                  onSelect(item);
                }
                e.preventDefault();
              }
            }}
          >
            <div className="flex items-center gap-1 flex-1 min-w-0">
              {item.isDirectory && (
                <ChevronRight
                  className={cn(
                    "h-4 w-4 shrink-0 transition-transform",
                    isExpanded && "rotate-90"
                  )}
                />
              )}
              {editingFile === item.path ? (
                <Input
                  className="h-6 text-xs"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === "Enter") {
                      onRenameSubmit(item, editingName);
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
                <span className="truncate text-xs">{item.name}</span>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover/item:opacity-100 transition-opacity shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                contextMenuTriggerRef.current?.dispatchEvent(
                  new MouseEvent("contextmenu", {
                    bubbles: true,
                    clientX: e.clientX,
                    clientY: e.clientY,
                  })
                );
              }}
            >
              <MoreVertical className="h-3 w-3" />
            </Button>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={handleRename}>Rename</ContextMenuItem>
          <ContextMenuItem onClick={handleDelete}>Delete</ContextMenuItem>
          <ContextMenuItem onClick={handleRevealInFinder}>
            Reveal in Finder
          </ContextMenuItem>
          {availableFolders && availableFolders.length > 0 && (
            <>
              <ContextMenuItem className="font-semibold">
                Move to...
              </ContextMenuItem>
              {availableFolders.map((folder) => (
                <ContextMenuItem
                  key={folder.path}
                  onClick={() => onMoveFile?.(item.path, folder.path)}
                  className="pl-6"
                >
                  {folder.name}
                </ContextMenuItem>
              ))}
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>

      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Confirmation"
        description={`Are you sure you want to delete ${
          item.isDirectory ? "folder" : "file"
        } "${item.name}"?`}
        onConfirm={handleConfirmDelete}
      />

      {item.isDirectory && isExpanded && item.children && (
        <div className="flex flex-col">
          {item.children.map((child) => (
            <FileTreeItem
              key={child.path}
              item={child}
              level={level + 1}
              activeFile={activeFile}
              editingFile={editingFile}
              editingName={editingName}
              onSelect={onSelect}
              onDelete={onDelete}
              onRename={onRename}
              onRenameSubmit={onRenameSubmit}
              setEditingFile={setEditingFile}
              setEditingName={setEditingName}
              onMoveFile={onMoveFile}
              allFolders={allFolders}
            />
          ))}
        </div>
      )}
    </>
  );
}
