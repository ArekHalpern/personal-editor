import { v4 as uuidv4 } from "uuid";

export const generateFileName = (id?: string) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const fileId = id || uuidv4().slice(0, 8);
  return `${year}-${month}-${day}-${fileId}.html`;
};
