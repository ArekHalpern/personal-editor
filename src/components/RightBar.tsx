import React from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ScrollArea } from "./ui/scroll-area";
import {
  Sparkles,
  PanelRightClose,
  PanelRight,
  History,
  CornerDownLeft,
} from "lucide-react";
import { cn } from "../lib/utils";
import { Editor } from "@tiptap/react";
import { ResizeHandle } from "./ui/resize-handle";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";

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
  const [width, setWidth] = React.useState(400);
  const [isEnhancing, setIsEnhancing] = React.useState(false);
  const [prompt, setPrompt] = React.useState("");

  const handleResize = (delta: number) => {
    const newWidth = Math.max(200, Math.min(640, width - delta));
    setWidth(newWidth);
  };

  const handleEnhance = async () => {
    if (!editor) return;

    const hasSelection = editor.state.selection.content().size > 0;
    const fullContent = editor.getHTML();

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

      if (hasSelection) {
        editor
          .chain()
          .focus()
          .setTextSelection(editor.state.selection)
          .insertContent(enhancedText)
          .run();
      } else {
        editor.commands.setContent(enhancedText);
      }

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
    const lastLineBreak = truncated.lastIndexOf("\n");
    if (lastLineBreak > maxLength * 0.8) {
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

      <div className="flex justify-end border-b px-2 py-1">
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

      {!isCollapsed ? (
        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue="enhance" className="h-full">
            <div className="flex items-center border-b px-1">
              <TabsList className="h-10 p-1 gap-1">
                <TabsTrigger
                  value="enhance"
                  className="flex items-center gap-2"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Agent
                </TabsTrigger>
                <TabsTrigger
                  value="history"
                  className="flex items-center gap-2"
                >
                  <History className="h-3.5 w-3.5" />
                  History
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="enhance" className="p-4 mt-0">
              <div className="space-y-2">
                <div className="relative">
                  <Input
                    placeholder="How can I help edit?"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && prompt && !isEnhancing) {
                        handleEnhance();
                      }
                    }}
                    className="pr-8"
                  />
                  <button
                    className={cn(
                      "absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors",
                      (!prompt || isEnhancing) &&
                        "opacity-50 pointer-events-none"
                    )}
                    onClick={handleEnhance}
                    disabled={!prompt || isEnhancing}
                  >
                    <CornerDownLeft className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </TabsContent>

            <TabsContent
              value="history"
              className="p-4 mt-0 h-[calc(100%-3rem)]"
            >
              <ScrollArea className="h-full pr-4">
                <div className="space-y-4">
                  {enhancementHistory.map((item, index) => (
                    <div
                      key={index}
                      className="p-3 rounded-lg border bg-card text-card-foreground text-sm space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-muted-foreground">
                          {item.timestamp.toLocaleTimeString()}
                        </div>
                        {stripHtmlTags(item.original) ===
                          stripHtmlTags(item.enhanced) && (
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
                      {stripHtmlTags(item.original) !==
                        stripHtmlTags(item.enhanced) && (
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <div className="text-xs font-medium text-muted-foreground">
                              Original:
                            </div>
                            <div className="pl-2 border-l-2 border-muted text-muted-foreground line-through whitespace-pre-line">
                              {formatText(stripHtmlTags(item.original))}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="text-xs font-medium text-muted-foreground">
                              Enhanced:
                            </div>
                            <div className="pl-2 border-l-2 border-muted whitespace-pre-line">
                              {formatText(stripHtmlTags(item.enhanced))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      ) : (
        <div className="flex-1" />
      )}
    </div>
  );
}
