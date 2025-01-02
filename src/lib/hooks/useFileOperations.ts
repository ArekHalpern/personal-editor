import { useState } from "react";
import { FileService } from "../utils/filesystem/fileService";
import { FileItem } from "../types/file";
import { ask } from "@tauri-apps/plugin-dialog";
import { getDisplayName } from "../utils/string";
import { Editor } from "@tiptap/react";

interface UseFileOperationsProps {
  onFileSelect: (content: string, filename?: string) => void;
  onFilesLoaded: (files: FileItem[]) => void;
  editor: Editor | null;
  activeFile?: string;
}

export function useFileOperations({
  onFileSelect,
  onFilesLoaded,
  editor,
  activeFile,
}: UseFileOperationsProps) {
  const [recentFiles, setRecentFiles] = useState<FileItem[]>([]);
  const [editingFile, setEditingFile] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const loadFiles = async () => {
    try {
      const files = await FileService.loadFiles();
      setRecentFiles(files);
      onFilesLoaded(files);
    } catch (error) {
      console.error("Error loading files:", error);
    }
  };

  const handleFileSelect = async (file: FileItem) => {
    if (file.path === activeFile) return;

    try {
      const content = await FileService.readFile(file.path);
      onFileSelect(content, file.path);
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
        await FileService.deleteFile(path);
        await loadFiles();

        // If we're deleting the active file, clear the editor
        if (path === activeFile && editor) {
          editor.commands.clearContent();
          // Load the most recent file if available
          const files = await FileService.loadFiles();
          if (files.length > 0) {
            const content = await FileService.readFile(files[0].path);
            onFileSelect(content, files[0].path);
          } else {
            // If no files left, clear the editor and notify parent
            onFileSelect("", "untitled.html");
          }
        }
      } catch (error) {
        console.error("Error deleting file:", error);
      }
    }
  };

  const handleRename = (file: FileItem) => {
    setEditingFile(file.path);
    setEditingName(getDisplayName(file.name));
  };

  const handleRenameSubmit = async (file: FileItem, newDisplayName: string) => {
    try {
      const result = await FileService.renameFile(
        file.path,
        newDisplayName,
        editor,
        file.path === activeFile
      );

      if (result.success) {
        setEditingFile(null);
        setEditingName("");
        await loadFiles();
        
        // If this is the active file, update the current file name
        if (file.path === activeFile) {
          onFileSelect(editor?.getHTML() || "", result.fileName);
        }
      }
    } catch (error) {
      console.error("Error renaming file:", error);
    }
  };

  return {
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
  };
} 