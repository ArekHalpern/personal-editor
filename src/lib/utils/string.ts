export const sanitizeFileName = (text: string): string => {
  // Only remove characters that are strictly forbidden in file systems
  return text.replace(/[<>:"/\\|?*\x00-\x1F]/g, "").trim();
};

export const formatPath = (path: string): string => {
  return path.includes("/") ? path.split("/").pop()! : path;
};

export const getDisplayName = (fileName: string): string => {
  // If it's a folder, just return the name
  if (!fileName.endsWith('.html')) {
    return fileName;
  }

  // Remove .html extension
  let name = fileName.replace(/\.html$/, "");

  // If the name is empty or just whitespace, return "Untitled"
  if (!name.trim()) {
    return "Untitled";
  }

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
      
      // If baseName is empty, return just "Untitled" with number
      if (!baseName.trim()) {
        return `Untitled ${number}`;
      }
      
      // Return the exact baseName without any case transformation
      return `${baseName} ${number}`;
    }
  }

  // Return the name exactly as is, just with hyphens replaced by spaces
  return name.replace(/-/g, " ");
};

export const getFileName = (displayName: string): string => {
  // If it's already a .html file, return as is
  if (displayName.toLowerCase().endsWith('.html')) {
    return displayName;
  }

  // Sanitize the display name
  let safeName = sanitizeFileName(displayName);

  // If empty after sanitization, use "Untitled"
  if (!safeName.trim()) {
    safeName = "Untitled";
  }

  // Convert spaces to hyphens but preserve case
  const fileName = safeName
    .trim()
    .replace(/\s+/g, '-');

  return `${fileName}.html`;
}; 