export const sanitizeFileName = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

export const formatPath = (path: string): string => {
  return path.includes("/") ? path.split("/").pop()! : path;
}; 