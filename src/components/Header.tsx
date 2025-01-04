import React, { useState, useEffect } from "react";
import { getDisplayName } from "../lib/utils/string";

interface HeaderProps {
  onTitleChange?: (title: string) => void;
  currentFile: string;
}

export function Header({ onTitleChange, currentFile }: HeaderProps) {
  const [title, setTitle] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  // Only update title from currentFile
  useEffect(() => {
    if (!isEditing && currentFile) {
      // Get just the file name without the directory path
      const pathParts = currentFile.split("/");
      const fileName = pathParts[pathParts.length - 1];
      const displayName = getDisplayName(fileName);
      setTitle(displayName);
    }
  }, [currentFile, isEditing]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
  };

  const handleTitleBlur = () => {
    setIsEditing(false);
    // Only trigger title change if the value has actually changed
    const pathParts = currentFile.split("/");
    const fileName = pathParts[pathParts.length - 1];
    if (title !== getDisplayName(fileName)) {
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
      if (currentFile) {
        const pathParts = currentFile.split("/");
        const fileName = pathParts[pathParts.length - 1];
        setTitle(getDisplayName(fileName));
      }
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
        className="w-full px-4 py-2 text-2xl font-bold bg-transparent border-none outline-none focus:ring-0 pl-[3.5rem] header-title"
      />
    </div>
  );
}
