import { useState } from "react";

interface UseSidebarUIProps {
  onWidthChange?: (width: number) => void;
}

export function useSidebarUI({ onWidthChange }: UseSidebarUIProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [width, setWidth] = useState(250);

  const handleResize = (delta: number) => {
    const newWidth = Math.max(250, width + delta);
    setWidth(newWidth);
    onWidthChange?.(newWidth);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  return {
    searchQuery,
    width,
    handleResize,
    handleSearch,
  };
} 