import React from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { ScrollArea } from "./ui/scroll-area";
import { Sparkles, PanelRightClose, PanelRight } from "lucide-react";
import { cn } from "../lib/utils";
import { Editor } from "@tiptap/react";
import { ResizeHandle } from "./ui/resize-handle";

interface RightBarProps {
  className?: string;
  isCollapsed: boolean;
  onToggle: () => void;
  editor: Editor;
  enhancementHistory: Array<{
    original: string;
    enhanced: string;
    prompt: string;
    timestamp: Date;
  }>;
  onEnhance: (original: string, enhanced: string, prompt: string) => void;
}

export function RightBar({
  className,
  isCollapsed,
  onToggle,
  editor,
  enhancementHistory,
  onEnhance,
}: RightBarProps) {
  const [width, setWidth] = React.useState(400); // Start at a larger width
  const [isEnhancing, setIsEnhancing] = React.useState(false);
  const [prompt, setPrompt] = React.useState("");

  const handleResize = (delta: number) => {
    const newWidth = Math.max(200, Math.min(640, width - delta)); // Min: 200px, Max: 640px
    setWidth(newWidth);
  };

  const handleEnhance = async () => {
    if (!editor) return;

    const hasSelection = editor.state.selection.content().size > 0;
    const fullContent = editor.getHTML();

    // If there's a selection, enhance just that part
    const selectedText = hasSelection
      ? editor.state.doc.textBetween(
          editor.state.selection.from,
          editor.state.selection.to,
          " "
        )
      : fullContent;

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
          prompt,
        }),
      });

      if (!response.ok) throw new Error("Enhancement failed");

      const { enhancedText } = await response.json();

      // If there's a selection, replace just that part
      if (hasSelection) {
        editor
          .chain()
          .focus()
          .setTextSelection(editor.state.selection)
          .insertContent(enhancedText)
          .run();
      } else {
        // Otherwise replace the entire content
        editor.commands.setContent(enhancedText);
      }

      // Update history through parent
      onEnhance(selectedText, enhancedText, prompt);
      setPrompt("");
    } catch (error) {
      console.error("Error enhancing text:", error);
    } finally {
      setIsEnhancing(false);
    }
  };

  const stripHtmlTags = (html: string) => {
    const doc = new DOMParser().parseFromString(html, "text/html");
    return doc.body.textContent?.replace(/\n\s*\n/g, "\n") || "";
  };

  const formatText = (text: string, maxLength: number = 150) => {
    if (text.length <= maxLength) return text;
    const truncated = text.slice(0, maxLength);
    // Find the last line break before maxLength
    const lastLineBreak = truncated.lastIndexOf("\n");
    if (lastLineBreak > maxLength * 0.8) {
      // Only break at newline if it's near the end
      return truncated.slice(0, lastLineBreak) + "...";
    }
    return truncated + "...";
  };

  return (
    <div
      className={cn(
        "group relative flex flex-col border-l bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        isCollapsed ? "w-14" : "",
        className
      )}
      style={!isCollapsed ? { width: `${width}px` } : undefined}
    >
      {!isCollapsed && (
        <ResizeHandle className="left-0 right-auto" onResize={handleResize} />
      )}
      <div className="flex items-center justify-between p-2 border-b">
        {!isCollapsed && (
          <span className="text-sm font-medium px-2">Writing Agent</span>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={onToggle}
        >
          {isCollapsed ? (
            <PanelRight className="h-4 w-4" />
          ) : (
            <PanelRightClose className="h-4 w-4" />
          )}
        </Button>
      </div>

      {!isCollapsed && (
        <div className="flex-1 overflow-hidden">
          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="How can I help edit?"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && prompt && !isEnhancing) {
                      handleEnhance();
                    }
                  }}
                />
                <Button
                  size="icon"
                  disabled={!prompt || isEnhancing}
                  onClick={handleEnhance}
                >
                  <Sparkles className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Editing History</Label>
              <ScrollArea className="h-[calc(100vh-12rem)] pr-4">
                <div className="space-y-4">
                  {enhancementHistory.map((item, index) => {
                    const originalText = stripHtmlTags(item.original);
                    const enhancedText = stripHtmlTags(item.enhanced);
                    return (
                      <div
                        key={index}
                        className="p-3 rounded-lg border bg-card text-card-foreground text-sm space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="text-xs text-muted-foreground">
                            {item.timestamp.toLocaleTimeString()}
                          </div>
                          {originalText === enhancedText && (
                            <div className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">
                              Full Document
                            </div>
                          )}
                        </div>
                        <div className="space-y-1.5">
                          <div className="text-xs font-medium text-muted-foreground">
                            Prompt:
                          </div>
                          <div className="pl-2 border-l-2 border-muted">
                            {item.prompt}
                          </div>
                        </div>
                        {originalText !== enhancedText && (
                          <div className="space-y-3">
                            <div className="space-y-1">
                              <div className="text-xs font-medium text-muted-foreground">
                                Original:
                              </div>
                              <div className="pl-2 border-l-2 border-muted text-muted-foreground line-through whitespace-pre-line">
                                {formatText(originalText)}
                              </div>
                            </div>
                            <div className="space-y-1">
                              <div className="text-xs font-medium text-muted-foreground">
                                Enhanced:
                              </div>
                              <div className="pl-2 border-l-2 border-muted whitespace-pre-line">
                                {formatText(enhancedText)}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>
      )}

      {isCollapsed && (
        <div className="py-2">
          <Button
            variant="ghost"
            size="icon"
            className="w-full h-10"
            disabled={isEnhancing}
            onClick={() => onToggle()}
          >
            <Sparkles className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
