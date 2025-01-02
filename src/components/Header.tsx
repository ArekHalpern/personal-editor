import React, { useState, useEffect } from "react";
import { Editor } from "@tiptap/react";
import { getDisplayName } from "../lib/utils/string";

interface HeaderProps {
  editor: Editor;
  onTitleChange?: (title: string) => void;
  currentFile: string;
}

export function Header({ editor, onTitleChange, currentFile }: HeaderProps) {
  const [title, setTitle] = useState("");

  // Update title when currentFile or editor content changes
  useEffect(() => {
    // First try to get title from first heading
    const firstHeading = editor.state.doc.firstChild;
    if (firstHeading && firstHeading.type.name === "heading") {
      const displayName = getDisplayName(firstHeading.textContent);
      setTitle(displayName);
      return;
    }

    // If no heading, use the currentFile name
    if (currentFile) {
      const displayName = getDisplayName(currentFile);
      setTitle(displayName);
    }
  }, [currentFile, editor.state.doc]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    // Pass the raw title to parent for file operations
    onTitleChange?.(newTitle);
  };

  return (
    <div className="pt-8">
      <input
        type="text"
        value={title}
        onChange={handleTitleChange}
        placeholder="Untitled"
        className="w-full px-4 py-2 text-2xl font-bold bg-transparent border-none outline-none focus:ring-0 pl-[3.5rem]"
      />
    </div>
  );
}
