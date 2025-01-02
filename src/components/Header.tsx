import React, { useState, useEffect, useCallback } from "react";
import { Editor } from "@tiptap/react";
import { getDisplayName } from "../lib/utils/string";

interface HeaderProps {
  editor: Editor;
  onTitleChange?: (title: string) => void;
  currentFile: string;
}

export function Header({ editor, onTitleChange, currentFile }: HeaderProps) {
  const [title, setTitle] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const updateTitleFromDocument = useCallback(() => {
    // First try to get title from first heading
    const firstHeading = editor.state.doc.firstChild;
    if (firstHeading && firstHeading.type.name === "heading") {
      const displayName = getDisplayName(firstHeading.textContent);
      if (!isEditing) {
        setTitle(displayName);
      }
      return;
    }

    // If no heading, use the currentFile name
    if (currentFile && !isEditing) {
      const displayName = getDisplayName(currentFile);
      setTitle(displayName);
    }
  }, [editor.state.doc, currentFile, isEditing]);

  // Update title when currentFile or editor content changes
  useEffect(() => {
    updateTitleFromDocument();
  }, [currentFile, editor.state.doc, updateTitleFromDocument]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
  };

  const handleTitleBlur = () => {
    setIsEditing(false);
    // Only trigger title change if the value has actually changed
    if (title !== getDisplayName(currentFile)) {
      onTitleChange?.(title);
    }
  };

  const handleTitleFocus = () => {
    setIsEditing(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    } else if (e.key === "Escape") {
      setIsEditing(false);
      updateTitleFromDocument();
    }
  };

  return (
    <div className="pt-8">
      <input
        type="text"
        value={title}
        onChange={handleTitleChange}
        onBlur={handleTitleBlur}
        onFocus={handleTitleFocus}
        onKeyDown={handleKeyDown}
        placeholder="Untitled"
        className="w-full px-4 py-2 text-2xl font-bold bg-transparent border-none outline-none focus:ring-0 pl-[3.5rem]"
      />
    </div>
  );
}
