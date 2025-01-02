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
import { cn } from "../lib/utils/cn";
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
  onWidthChange?: (width: number) => void;
}

export function RightBar({
  className,
  isCollapsed,
  onToggle,
  editor,
  enhancementHistory,
  onEnhance,
  onWidthChange,
}: RightBarProps) {
  const [prompt, setPrompt] = React.useState("");
  const [isEnhancing, setIsEnhancing] = React.useState(false);
  const [width, setWidth] = React.useState(400);

  const handleResize = (delta: number) => {
    const newWidth = Math.max(200, Math.min(800, width - delta));
    setWidth(newWidth);
    onWidthChange?.(newWidth);
  };

  const handleEnhance = async () => {
    if (!prompt || isEnhancing) return;

    setIsEnhancing(true);
    try {
      const selection = editor.state.selection;
      const from = selection.from;
      const to = selection.to;
      const text = editor.state.doc.textBetween(from, to);

      if (!text) return;

      // Add your enhancement logic here
      const enhanced = text; // Placeholder for actual enhancement
      onEnhance(text, enhanced, prompt);

      // Clear the prompt after successful enhancement
      setPrompt("");
    } catch (error) {
      console.error("Error during enhancement:", error);
    } finally {
      setIsEnhancing(false);
    }
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
          <span className="text-xs font-medium px-2">Assistant</span>
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

            <TabsContent value="history" className="p-4 mt-0">
              <ScrollArea className="h-[calc(100vh-10rem)]">
                <div className="space-y-4">
                  {enhancementHistory.map((item, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {item.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="text-xs space-y-2">
                        <div className="space-y-1">
                          <div className="text-muted-foreground">Original:</div>
                          <div className="pl-2 border-l-2">{item.original}</div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-muted-foreground">Enhanced:</div>
                          <div className="pl-2 border-l-2">{item.enhanced}</div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-muted-foreground">Prompt:</div>
                          <div className="pl-2 border-l-2 text-muted-foreground">
                            {item.prompt}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      ) : null}
    </div>
  );
}
