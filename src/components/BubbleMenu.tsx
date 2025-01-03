import { BubbleMenu as TiptapBubbleMenu, Editor } from "@tiptap/react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Bold,
  Italic,
  Heading2,
  List,
  Sparkles,
  X,
  CornerDownLeft,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { cn } from "../lib/utils/cn";

interface EnhanceResponse {
  enhancedText: string;
  explanation: string;
  changes: Array<{
    type: "addition" | "deletion" | "modification";
    description: string;
  }>;
}

interface BubbleMenuProps {
  editor: Editor;
  onEnhance?: (original: string, enhanced: string, prompt: string) => void;
}

export function BubbleMenu({ editor, onEnhance }: BubbleMenuProps) {
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [prompt, setPrompt] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const selectionRef = useRef<{ from: number; to: number } | null>(null);

  // Store selection when showing prompt
  const handleShowPrompt = () => {
    if (editor.state.selection) {
      const { from, to } = editor.state.selection;
      selectionRef.current = { from, to };

      // Add enhancing class to editor
      const editorElement = document.querySelector(".ProseMirror");
      if (editorElement) {
        editorElement.classList.add("enhancing");
      }

      // Ensure selection is visible
      editor.commands.setTextSelection({ from, to });
    }
    setShowPrompt(true);
  };

  // Restore selection when input is focused
  const handleInputFocus = () => {
    if (selectionRef.current) {
      const { from, to } = selectionRef.current;
      editor.commands.setTextSelection({ from, to });
    }
  };

  const clearSelection = () => {
    // Remove enhancing class from editor
    const editorElement = document.querySelector(".ProseMirror");
    if (editorElement) {
      editorElement.classList.remove("enhancing");
    }
    selectionRef.current = null;
    setShowPrompt(false);
    setPrompt("");
  };

  const handleQuickEnhance = async (customPrompt: string) => {
    if (!editor || !selectionRef.current) return;

    const selectedText = editor.state.doc.textBetween(
      selectionRef.current.from,
      selectionRef.current.to,
      " "
    );

    // Get surrounding context (one paragraph before and after)
    const doc = editor.state.doc;
    const pos = selectionRef.current.from;
    const resolvedPos = doc.resolve(pos);
    const paragraph = resolvedPos.parent;
    const context = paragraph.textContent;

    setIsEnhancing(true);

    try {
      const response = await fetch("http://localhost:3001/enhance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          selectedText,
          prompt: customPrompt,
          context,
          filename: window.location.pathname.split("/").pop() || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`Enhancement failed: ${response.statusText}`);
      }

      const data = (await response.json()) as EnhanceResponse;

      if (!data.enhancedText) {
        throw new Error("No enhanced text received");
      }

      // Restore selection before inserting
      editor.commands.setTextSelection({
        from: selectionRef.current.from,
        to: selectionRef.current.to,
      });

      // Insert the enhanced text
      editor.chain().focus().insertContent(data.enhancedText).run();

      // Update history in the RightBar with explanation
      onEnhance?.(
        selectedText,
        data.enhancedText,
        `${customPrompt}\n\nChanges made:\n${data.changes
          .map((change) => `- ${change.type}: ${change.description}`)
          .join("\n")}`
      );

      // Reset states
      setPrompt("");
      setShowPrompt(false);
      selectionRef.current = null;

      // Remove enhancing class
      const editorElement = document.querySelector(".ProseMirror");
      if (editorElement) {
        editorElement.classList.remove("enhancing");
      }
    } catch (error) {
      console.error("Error enhancing text:", error);
      // You might want to show this error to the user in a toast or notification
    } finally {
      setIsEnhancing(false);
    }
  };

  // Handle escape key globally when prompt is shown
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showPrompt) {
        clearSelection();
      }
    };

    if (showPrompt) {
      window.addEventListener("keydown", handleEscape);
    }

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [showPrompt]);

  // Cleanup enhancing class when component unmounts
  useEffect(() => {
    return () => {
      const editorElement = document.querySelector(".ProseMirror");
      if (editorElement) {
        editorElement.classList.remove("enhancing");
      }
    };
  }, []);

  if (!editor) {
    return null;
  }

  return (
    <TiptapBubbleMenu
      editor={editor}
      tippyOptions={{
        duration: 100,
        placement: "bottom",
        offset: [0, 10],
      }}
      className="bubble-menu flex flex-col overflow-visible rounded-lg"
    >
      <div className="flex">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={cn(
            "hover:bg-accent/50",
            editor.isActive("bold") ? "active-item" : ""
          )}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={cn(
            "hover:bg-accent/50",
            editor.isActive("italic") ? "active-item" : ""
          )}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          className={cn(
            "hover:bg-accent/50",
            editor.isActive("heading", { level: 2 }) ? "active-item" : ""
          )}
        >
          <Heading2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={cn(
            "hover:bg-accent/50",
            editor.isActive("bulletList") ? "active-item" : ""
          )}
        >
          <List className="h-4 w-4" />
        </Button>
        {!showPrompt && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleShowPrompt}
            className={cn("gap-1 hover:bg-accent/50")}
          >
            <Sparkles className="h-4 w-4" />
          </Button>
        )}
      </div>
      {showPrompt && (
        <div className="flex items-center p-1 border-t">
          <Input
            ref={inputRef}
            className="h-7 text-xs bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0"
            placeholder="How should I enhance this?"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onFocus={handleInputFocus}
            onKeyDown={(e) => {
              if (e.key === "Enter" && prompt && !isEnhancing) {
                handleQuickEnhance(prompt);
              }
            }}
            autoFocus
          />
          <Button
            variant="ghost"
            size="sm"
            disabled={isEnhancing}
            onClick={() => {
              if (prompt) handleQuickEnhance(prompt);
            }}
            className="px-2 hover:bg-accent/50"
          >
            <CornerDownLeft className="h-4 w-4" />
            {isEnhancing ? "..." : ""}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSelection}
            className="px-2 hover:bg-accent/50"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </TiptapBubbleMenu>
  );
}
