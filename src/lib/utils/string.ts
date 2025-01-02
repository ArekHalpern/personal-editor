export const sanitizeFileName = (text: string): string => {
  // Only remove characters that are strictly forbidden in file systems
  return text.replace(/[<>:"/\\|?*\x00-\x1F]/g, "").trim();
};

export const formatPath = (path: string): string => {
  return path.includes("/") ? path.split("/").pop()! : path;
};

export const getDisplayName = (fileName: string): string => {
  // Remove .html extension
  let name = fileName.replace(/\.html$/, "");

  // Check if it's a local editor file
  if (name.toLowerCase().startsWith("local-editor-")) {
    const number = name.split("-").pop() || "1";
    return `Local Editor ${parseInt(number)}`;
  }

  // Check if it's a numbered format (e.g., "My-File-01")
  const lastHyphenIndex = name.lastIndexOf("-");
  if (lastHyphenIndex !== -1) {
    const possibleNumber = name.slice(lastHyphenIndex + 1);
    if (/^\d{2,}$/.test(possibleNumber)) {
      // It's a numbered file
      const baseName = name.slice(0, lastHyphenIndex);
      const number = parseInt(possibleNumber);
      
      // Preserve the exact baseName, just capitalize first letter of each word
      const formattedName = baseName.split("-")
        .map(part => {
          if (part.length === 0) return part;
          return part.charAt(0).toUpperCase() + part.slice(1);
        })
        .join("-");
      
      return `${formattedName} ${number}`;
    }
  }

  // For simple names, just capitalize first letter of each word
  return name.split("-")
    .map(part => {
      if (part.length === 0) return part;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join("-");
};

export const getFileName = (displayName: string): string => {
  // Keep the exact name, just ensure it's safe for the file system
  const safeName = sanitizeFileName(displayName);
  return safeName ? `${safeName}.html` : "untitled.html";
}; 