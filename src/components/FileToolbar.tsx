import { Button } from "./ui/button";
import { FileUp, Save, FileJson } from "lucide-react";
import { save, open } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { Editor } from "@tiptap/react";

interface FileToolbarProps {
  editor: Editor | null;
}

export function FileToolbar({ editor }: FileToolbarProps) {
  if (!editor) {
    return null;
  }

  const handleOpen = async (fileType: "html" | "json") => {
    try {
      console.log("Opening file dialog...");
      const selected = await open({
        filters: [
          {
            name: fileType.toUpperCase(),
            extensions: [fileType],
          },
        ],
      });
      console.log("Selected file:", selected);

      if (selected && typeof selected === "string") {
        console.log("Reading file contents...");
        const contents = await readTextFile(selected);
        if (fileType === "json") {
          try {
            const jsonContent = JSON.parse(contents);
            editor.commands.setContent(jsonContent.content || "");
          } catch (e) {
            console.error("Error parsing JSON:", e);
          }
        } else {
          editor.commands.setContent(contents);
        }
        console.log("File loaded successfully");
      }
    } catch (error) {
      console.error("Error opening file:", error);
    }
  };

  const handleSave = async (fileType: "html" | "json") => {
    try {
      console.log("Opening save dialog...");
      const savePath = await save({
        filters: [
          {
            name: fileType.toUpperCase(),
            extensions: [fileType],
          },
        ],
        defaultPath: `document.${fileType}`,
      });
      console.log("Save path selected:", savePath);

      if (savePath) {
        const content = editor.getHTML();
        console.log("Content to save:", content);

        if (fileType === "json") {
          const jsonContent = {
            content,
            metadata: {
              lastModified: new Date().toISOString(),
              version: "1.0",
            },
          };
          console.log("Saving JSON content...");
          await writeTextFile(savePath, JSON.stringify(jsonContent, null, 2));
        } else {
          console.log("Saving HTML content...");
          // Add proper HTML structure
          const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Document</title>
</head>
<body>
${content}
</body>
</html>`;
          await writeTextFile(savePath, fullHtml);
        }
        console.log("File saved successfully");
      }
    } catch (error) {
      console.error("Error saving file:", error);
      // Log detailed error information
      if (error instanceof Error) {
        console.error("Error name:", error.name);
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }
    }
  };

  return (
    <div className="border-b p-2 flex gap-2">
      <div className="flex gap-2 mr-4">
        <Button size="sm" variant="ghost" onClick={() => handleOpen("html")}>
          <FileUp className="h-4 w-4 mr-2" />
          Open HTML
        </Button>
        <Button size="sm" variant="ghost" onClick={() => handleSave("html")}>
          <Save className="h-4 w-4 mr-2" />
          Save HTML
        </Button>
      </div>

      <div className="flex gap-2">
        <Button size="sm" variant="ghost" onClick={() => handleOpen("json")}>
          <FileJson className="h-4 w-4 mr-2" />
          Open JSON
        </Button>
        <Button size="sm" variant="ghost" onClick={() => handleSave("json")}>
          <FileJson className="h-4 w-4 mr-2" />
          Save JSON
        </Button>
      </div>
    </div>
  );
}
