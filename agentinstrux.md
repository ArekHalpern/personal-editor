Below is an example of how you could introduce a new AI-driven workflow in your application to generate entire “in-depth” files (e.g., a new PRD). This approach:
Adds a new function (e.g., generateFile) to aiService.ts.
Includes an example of how you might call this function from the UI layer to create or open the generated file.
Demonstrates a new “create_new_file” or “generate_file” operation structure that returns the entire file content.

---

1. Extend aiService.ts
   Below is a rough outline for adding a new method to aiService.ts. This new method, generateFile, will accept user instructions about the desired file and then produce structured content to be used for creating a new file on disk.

import OpenAI from "openai";
import { useSettings } from "../stores/settings";
import { v4 as uuidv4 } from 'uuid';
import { FileService } from "../utils/filesystem/fileService"; // If you have a FileService
// import other necessary types...

export interface GenerateFileRequest {
filename: string;
description: string; // e.g., "A PRD for an agentic workflow to help users book flights."
outline?: string; // optional structured outline or extra context
}

export interface GenerateFileResponse {
filename: string;
content: string;
message: string;
error?: boolean;
}

class AIService {
private openai: OpenAI | null = null;

// ... existing code from your snippet (getClient, chat, enhance, etc.) ...

/\*\*

- Generate a new, in-depth file based on user instructions.
- This is a separate workflow from the line-based editing operations.
  \*/
  async generateFile(request: GenerateFileRequest): Promise<GenerateFileResponse> {
  const client = this.getClient();
  const settings = useSettings.getState().settings;
  const model = settings.api.openai.selectedModel || settings.api.openai.models[0];


    // Construct system and user prompts tailored for file creation.
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content:
          `You are a specialized file generator.
           Your task is to create a complete file with in-depth content based on the user's instructions.
           Respond in JSON with the following structure:

           {
             "filename": string,
             "content": string,
             "message": string
           }

           Requirements:
           1. The 'filename' must match or be shaped by the user's requested file name (adding .md, .txt, etc., if needed).
           2. The 'content' must be the full in-depth text or document body.
           3. The 'message' is a short explanation of what has been generated.

           Important: Do NOT include line numbers or HTML tags unless the user explicitly wants them.`
      },
      {
        role: "user",
        content: `
          Please create a new file named "${request.filename}".
          Description of desired content: "${request.description}"
          Additional outline/context: "${request.outline || "N/A"}"

          Provide the final JSON response with filename, content, and a short message.
        `
      }
    ];

    console.log("📤 Generating new file with prompts:", {
      model,
      request,
      messages
    });

    try {
      const completion = await client.chat.completions.create({
        model,
        messages,
        response_format: { type: "json_object" }
      });

      console.log("📥 Raw AI response:", completion.choices[0].message);

      // Parse the JSON from the AI
      const result = JSON.parse(
        completion.choices[0].message.content || '{"error":true,"message":"No valid response"}'
      ) as GenerateFileResponse;

      if (!result.content || !result.filename) {
        return {
          filename: request.filename,
          content: "",
          message: "Error: Invalid AI response; missing content or filename field.",
          error: true
        };
      }

      // Optionally, write directly to disk using an existing FileService
      await FileService.writeFile(result.filename, result.content);

      return {
        filename: result.filename,
        content: result.content,
        message: result.message || `Generated file: ${result.filename}`,
        error: false
      };
    } catch (error: any) {
      console.error("Error generating file:", error);
      return {
        filename: request.filename,
        content: "",
        message: error.message || "Failed to generate file content.",
        error: true
      };
    }

}
}

export const aiService = new AIService();

Explanation of the key parts:
• generateFile method:
Receives a GenerateFileRequest with filename, description, and optional outline.
Sends a custom system prompt to OpenAI to produce a JSON structure containing a complete file’s text.
Optionally writes the generated file content to disk (using your existing FileService).

---

2. Calling the new method from the UI (RightBar or other component)
   You can add a simple button or flow to RightBar.tsx (or any relevant component) that prompts the user for details about the new file, then calls generateFile. For example:

import React from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { aiService } from "../lib/services/aiService";
// ... other imports ...

export function RightBar(props: RightBarProps) {
const [newFileName, setNewFileName] = React.useState("");
const [description, setDescription] = React.useState("");
const [isGenerating, setIsGenerating] = React.useState(false);

const handleGenerateFile = async () => {
if (!newFileName.trim() || !description.trim()) return;
setIsGenerating(true);

    try {
      const response = await aiService.generateFile({
        filename: newFileName.trim(),
        description: description.trim()
        // outline: optional text
      });

      if (!response.error) {
        console.log("Successfully created file:", response);
        // You could automatically open the file or load it in the editor:
        // editor.commands.setContent(response.content);
      } else {
        console.error("AI responded with an error:", response.message);
      }
    } catch (err) {
      console.error("Failed to generate file:", err);
    } finally {
      setIsGenerating(false);
    }

};

return (
<div className="flex flex-col">
{/_ Existing UI code... _/}

      {/* Simple UI for generating a brand-new file */}
      <div className="border-t p-4">
        <h3 className="text-sm font-semibold mb-2">Generate New File</h3>
        <Input
          placeholder="File Name (e.g. flights-prd.md)"
          value={newFileName}
          onChange={(e) => setNewFileName(e.target.value)}
          className="mb-2"
        />
        <Input
          placeholder="Short description of the desired file content"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mb-2"
        />
        <Button onClick={handleGenerateFile} disabled={isGenerating}>
          {isGenerating ? "Generating..." : "Generate File"}
        </Button>
      </div>
    </div>

);
}

With this new UI, a user types:
• A desired filename (“my-agent-prd.md”, “new-markdown-doc.md”, etc.).
• A short description or request about the file’s desired content.
When the user clicks “Generate File,” your application calls aiService.generateFile, uses the AI to build a full structured file, and (optionally) saves it to disk or loads it directly into the editor.

---

3. Notes on a “Manager/Planner” agent
   If you’d like a more advanced multi-step agentic workflow (e.g., “manager” orchestrates multiple sub-agents for different tasks), the patterns are similar:
   • Create a manager agent that receives user requests and breaks them down (via your planning logic).
   • The manager agent might call aiService.generateFile (to produce an entire new in-depth file) or aiService.chat (to do inline edits), or both, depending on the plan.
   • Once all sub-steps finish, the manager agent can finalize or merge the generated files for the user.

---

Summary
By introducing a new operation (generateFile) in AIService and wiring up a small UI in RightBar (or elsewhere), you can let your users request entire, in-depth files. This complements your existing line-based editing flow with a higher-level file creation flow, enabling more complex agentic plans (like generating new PRDs, configuration files, or any text-based files) while keeping your architecture modular and extendable.
