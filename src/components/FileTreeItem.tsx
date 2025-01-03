import { useState, useRef } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ChevronRight, Folder, File, MoreVertical } from "lucide-react";
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

  // Filter out the current folder and its children from available move targets
  const availableFolders = allFolders?.filter((folder) => {
    if (item.isDirectory) {
      // Don't allow moving a folder into itself or its children
      return !folder.path.startsWith(item.path);
    }
    return true;
  });

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger ref={contextMenuTriggerRef}>
          <div
            className={cn(
              "w-full text-left group/item flex items-center gap-2 px-4 py-1.5 hover:bg-accent cursor-pointer",
              "transition-colors duration-200 ease-in-out",
              isActive && "bg-accent"
            )}
            style={{ paddingLeft: `${paddingLeft}px` }}
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
              {item.isDirectory ? (
                <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
              ) : (
                <File className="h-4 w-4 shrink-0 text-muted-foreground" />
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
                // Simulate a right-click at the button's position
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
