import React from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "./ui/hover-card";
import {
  PanelLeftClose,
  PanelLeft,
  FileText,
  Search,
  Clock,
  FilePlus,
  Trash2,
  Pencil,
} from "lucide-react";
import { cn } from "../lib/utils";
import { ResizeHandle } from "./ui/resize-handle";
import {
  readDir,
  writeFile,
  remove,
  readFile,
  mkdir,
  exists,
  rename,
} from "@tauri-apps/plugin-fs";
import { documentDir } from "@tauri-apps/api/path";
import { ask } from "@tauri-apps/plugin-dialog";

interface SidebarProps {
  className?: string;
  isCollapsed: boolean;
  onToggle: () => void;
  onFileSelect: (content: string, filename?: string) => void;
}

interface FileItem {
  name: string;
  path: string;
  lastModified: Date;
}

const DEFAULT_PATH = "ai-editor-files";

export function Sidebar({
  className,
  isCollapsed,
  onToggle,
  onFileSelect,
}: SidebarProps) {
  const [recentFiles, setRecentFiles] = React.useState<FileItem[]>([]);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [editingFile, setEditingFile] = React.useState<string | null>(null);
  const [editingName, setEditingName] = React.useState("");
  const [width, setWidth] = React.useState(180); // Start at minimum width

  const loadFiles = async () => {
    try {
      const docDir = await documentDir();
      const fullPath = `${docDir}/${DEFAULT_PATH}`;

      // Ensure directory exists
      try {
        await mkdir(fullPath, { recursive: true });
      } catch (error) {
        if (
          !(error instanceof Error) ||
          !error.message.includes("File exists")
        ) {
          console.error("Error creating directory:", error);
          return;
        }
      }

      const files = await readDir(fullPath);
      const fileItems: FileItem[] = files
        .filter((file) => file.name !== null)
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
              path: `${fullPath}/${file.name}`,
              lastModified: new Date(),
            };
          }
          return {
            name,
            path: `${fullPath}/${file.name}`,
            lastModified: new Date(),
          };
        });
      setRecentFiles(fileItems);
    } catch (error) {
      console.error("Error loading files:", error);
    }
  };

  React.useEffect(() => {
    loadFiles();
  }, []);

  const createNewFile = async () => {
    try {
      const docDir = await documentDir();
      const fullPath = `${docDir}/${DEFAULT_PATH}`;

      // Get current date in EST
      const now = new Date();
      const estFormatter = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/New_York",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });

      const parts = estFormatter.formatToParts(now).reduce((acc, part) => {
        if (part.type !== "literal") {
          acc[part.type] = part.value;
        }
        return acc;
      }, {} as Record<string, string>);

      const shortDate = `${parts.year}-${parts.month}-${parts.day}`;

      // Try to find an available filename
      let counter = 1;
      let fileName;
      let filePath;

      while (true) {
        fileName = counter === 1 ? shortDate : `${shortDate}-${counter}`;
        filePath = `${fullPath}/${fileName}.html`;

        // Check if file exists
        try {
          const fileExists = await exists(filePath);
          if (!fileExists) {
            break;
          }
          counter++;
        } catch (error) {
          // If error checking existence, assume file doesn't exist
          break;
        }
      }

      const initialContent =
        "<h1>New Document</h1><p>Start writing here...</p>";
      await writeFile(filePath, new TextEncoder().encode(initialContent));
      await loadFiles();
      onFileSelect(initialContent, fileName);
    } catch (error) {
      console.error("Error creating file:", error);
    }
  };

  const handleFileSelect = async (file: FileItem) => {
    try {
      const content = new TextDecoder().decode(await readFile(file.path));
      onFileSelect(content, file.name);
    } catch (error) {
      console.error("Error reading file:", error);
    }
  };

  const deleteFile = async (path: string) => {
    const confirmed = await ask("Are you sure you want to delete this file?", {
      title: "Delete File",
    });

    if (confirmed) {
      try {
        await remove(path);
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

  const handleRenameSubmit = async (file: FileItem, newDisplayName: string) => {
    try {
      const docDir = await documentDir();
      const fullPath = `${docDir}/${DEFAULT_PATH}`;

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
      const newPath = `${fullPath}/${newFileName}.html`;

      // Check if target file already exists
      const fileExists = await exists(newPath);
      if (fileExists && newPath !== file.path) {
        await ask(
          "A file with this name already exists. Please choose a different name.",
          {
            title: "Error",
          }
        );
        return;
      }

      await rename(file.path, newPath);
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
          <span className="text-sm font-medium px-2">Files</span>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 sidebar-transition"
          onClick={onToggle}
        >
          {isCollapsed ? (
            <PanelLeft className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </Button>
      </div>

      <div className={cn("flex-1 overflow-hidden", isCollapsed && "hidden")}>
        <div className="p-3">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search files..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 px-3 sidebar-scroll overflow-y-auto">
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium">Documents</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={createNewFile}
                >
                  <FilePlus className="h-4 w-4" />
                </Button>
              </div>
              {filteredFiles.map((file) => (
                <HoverCard key={file.path}>
                  <HoverCardTrigger asChild>
                    <div className="flex items-center">
                      <Button
                        variant="ghost"
                        className="flex-1 justify-start gap-2 px-2 sidebar-transition min-w-0"
                        onClick={() => handleFileSelect(file)}
                      >
                        <FileText className="h-4 w-4 flex-shrink-0" />
                        {editingFile === file.path ? (
                          <Input
                            className="h-6 py-1"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleRenameSubmit(file, editingName);
                              } else if (e.key === "Escape") {
                                setEditingFile(null);
                                setEditingName("");
                              }
                            }}
                            onBlur={() => {
                              if (editingName !== file.name) {
                                handleRenameSubmit(file, editingName);
                              }
                              setEditingFile(null);
                              setEditingName("");
                            }}
                            autoFocus
                          />
                        ) : (
                          <span className="truncate min-w-0">{file.name}</span>
                        )}
                      </Button>
                      <div className="flex flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleRename(file)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => deleteFile(file.path)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </HoverCardTrigger>
                  <HoverCardContent side="right" align="start" className="w-72">
                    <div className="space-y-2">
                      <h5 className="font-medium">{file.name}</h5>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Clock className="mr-1 h-4 w-4" />
                        {file.lastModified.toLocaleDateString()}
                      </div>
                      <div className="text-sm text-muted-foreground truncate">
                        {file.path}
                      </div>
                    </div>
                  </HoverCardContent>
                </HoverCard>
              ))}
            </div>
          </div>
        </div>
      </div>

      {isCollapsed && (
        <div className="py-2">
          <Button
            variant="ghost"
            size="icon"
            className="w-full h-10 sidebar-transition"
            onClick={createNewFile}
          >
            <FilePlus className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
