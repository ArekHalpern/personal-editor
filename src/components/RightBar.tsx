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
  Loader2,
} from "lucide-react";
import { cn } from "../lib/utils/cn";
import { Editor } from "@tiptap/react";
import { ResizeHandle } from "./ui/resize-handle";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { getDisplayName } from "../lib/utils/string";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isLoading?: boolean;
}

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
  currentFile?: string;
}

interface ChatResponse {
  message: string;
  enhancedText?: {
    lines: Array<{
      content: string;
      type: string;
      id: string;
      number: number;
      timestamp: number;
      lastModified: number;
      aiEnhanced: boolean;
    }>;
  };
}

export function RightBar({
  className,
  isCollapsed,
  onToggle,
  editor,
  enhancementHistory,
  onEnhance,
  onWidthChange,
  currentFile = "untitled.html",
}: RightBarProps) {
  const [prompt, setPrompt] = React.useState("");
  const [isEnhancing, setIsEnhancing] = React.useState(false);
  const [width, setWidth] = React.useState(400);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const handleResize = (delta: number) => {
    const newWidth = Math.max(300, Math.min(800, width - delta));
    setWidth(newWidth);
    onWidthChange?.(newWidth);
  };

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const stripHtml = (html: string) => {
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  };

  const handleSendMessage = async () => {
    if (!prompt.trim() || isEnhancing) return;

    setIsEnhancing(true);
    try {
      // Add user message immediately
      const userMessage: Message = {
        role: "user",
        content: stripHtml(prompt),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);

      // Add loading message for assistant
      const loadingMessage: Message = {
        role: "assistant",
        content: "",
        timestamp: new Date(),
        isLoading: true,
      };
      setMessages((prev) => [...prev, loadingMessage]);

      // Get the current document state
      const selection = editor.state.selection;
      const from = selection.from;
      const to = selection.to;
      const selectedText = editor.state.doc.textBetween(from, to);
      const fullContent = editor.getHTML();
      const lineMetadata = editor.storage.lineTracker.lines;

      // Call the chat endpoint
      const response = await fetch("http://localhost:3001/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: prompt,
          lineMetadata: Array.from(lineMetadata.values()),
          selectedText,
          fullContent,
          filename: getDisplayName(currentFile),
        }),
      });

      if (!response.ok) throw new Error("Failed to get response");

      const data = (await response.json()) as ChatResponse;

      // Remove loading message and add actual response
      setMessages((prev) =>
        prev.slice(0, -1).concat({
          role: "assistant",
          content: stripHtml(data.message),
          timestamp: new Date(),
        })
      );

      // Update editor content if there are changes
      if (data.enhancedText?.lines) {
        const originalContent = selectedText || fullContent;
        const enhancedContent = data.enhancedText.lines
          .map((line) => line.content)
          .join("\n");

        // Update enhancement history
        onEnhance(originalContent, enhancedContent, prompt);

        // Update editor content
        editor.commands.setContent("");
        data.enhancedText.lines.forEach((line) => {
          const nodeType = line.type === "heading1" ? "heading" : line.type;
          const attrs = line.type.startsWith("heading")
            ? { level: parseInt(line.type.slice(-1)) }
            : {};

          editor
            .chain()
            .focus()
            .insertContent([
              {
                type: nodeType,
                attrs,
                content: [
                  {
                    type: "text",
                    text: line.content,
                  },
                ],
              },
            ])
            .run();
        });
      }

      setPrompt("");
    } catch (error) {
      console.error("Error during chat:", error);
      // Remove loading message and add error message
      setMessages((prev) =>
        prev.slice(0, -1).concat({
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
          timestamp: new Date(),
        })
      );
    } finally {
      setIsEnhancing(false);
    }
  };

  return (
    <div
      className={cn(
        "group relative flex flex-col border-l",
        "bg-muted/50 dark:bg-muted/50 backdrop-blur supports-[backdrop-filter]:bg-muted/50",
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
      {!isCollapsed && (
        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue="chat" className="h-full">
            <div className="flex items-center border-b px-1">
              <TabsList className="h-10 p-1 gap-1">
                <TabsTrigger value="chat" className="flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5" />
                  Chat
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

            <TabsContent
              value="chat"
              className="flex flex-col h-[calc(100%-2.5rem)]"
            >
              <ScrollArea ref={scrollRef} className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.map((message, index) => (
                    <div
                      key={index}
                      className={cn(
                        "flex flex-col",
                        message.role === "assistant"
                          ? "items-start"
                          : "items-end"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                          message.role === "assistant"
                            ? "bg-muted text-muted-foreground"
                            : "bg-primary text-primary-foreground"
                        )}
                      >
                        {message.isLoading ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span>Thinking...</span>
                          </div>
                        ) : (
                          message.content
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-1">
                        {message.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="p-4 border-t">
                <div className="relative">
                  <Input
                    placeholder="How can I help edit?"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (
                        e.key === "Enter" &&
                        !e.shiftKey &&
                        prompt &&
                        !isEnhancing
                      ) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    className="pr-8"
                    disabled={isEnhancing}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    className={cn(
                      "absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0",
                      (!prompt || isEnhancing) &&
                        "opacity-50 pointer-events-none"
                    )}
                    onClick={handleSendMessage}
                    disabled={!prompt || isEnhancing}
                  >
                    {isEnhancing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CornerDownLeft className="h-4 w-4" />
                    )}
                  </Button>
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
                          {item.timestamp.toLocaleString()}
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
      )}
    </div>
  );
}
