import { BubbleMenu as TiptapBubbleMenu, Editor } from "@tiptap/react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  List,
  Code,
  Sparkles,
  X,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";

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

  // Add function to check if selection is within H1
  const isWithinH1 = () => {
    return editor.isActive("heading", { level: 1 });
  };

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

    const fullContent = editor.getHTML();
    setIsEnhancing(true);

    try {
      const response = await fetch("http://localhost:3001/enhance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          selectedText,
          fullContent,
          prompt: customPrompt,
        }),
      });

      if (!response.ok) throw new Error("Enhancement failed");

      const { enhancedText } = await response.json();

      // Restore selection before inserting
      editor.commands.setTextSelection({
        from: selectionRef.current.from,
        to: selectionRef.current.to,
      });

      editor.chain().focus().insertContent(enhancedText).run();

      // Update history in the RightBar
      onEnhance?.(selectedText, enhancedText, customPrompt);

      // Reset states
      setPrompt("");
      setShowPrompt(false);
      selectionRef.current = null;
    } catch (error) {
      console.error("Error enhancing text:", error);
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
      className="flex flex-col overflow-visible rounded-lg border bg-background shadow-md"
    >
      <div className="flex">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive("bold") ? "bg-accent" : ""}
          disabled={isWithinH1()}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive("italic") ? "bg-accent" : ""}
          disabled={isWithinH1()}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
          className={
            editor.isActive("heading", { level: 1 }) ? "bg-accent" : ""
          }
        >
          <Heading1 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          className={
            editor.isActive("heading", { level: 2 }) ? "bg-accent" : ""
          }
          disabled={isWithinH1()}
        >
          <Heading2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive("bulletList") ? "bg-accent" : ""}
          disabled={isWithinH1()}
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={editor.isActive("code") ? "bg-accent" : ""}
          disabled={isWithinH1()}
        >
          <Code className="h-4 w-4" />
        </Button>
        {!showPrompt && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleShowPrompt}
            className="gap-1"
            disabled={isWithinH1()}
          >
            <Sparkles className="h-4 w-4" />
          </Button>
        )}
      </div>
      {showPrompt && (
        <div className="flex items-center p-1 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
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
            className="px-2"
          >
            <Sparkles className="h-4 w-4" />
            {isEnhancing ? "..." : ""}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSelection}
            className="px-2"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </TiptapBubbleMenu>
  );
}
