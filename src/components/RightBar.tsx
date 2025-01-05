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
import { aiService } from "../lib/services/aiService";
import { FileService } from "../lib/utils/filesystem/fileService";
import { FileGenerationCollectedInfo } from "../lib/types/assistant";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isLoading?: boolean;
  loadingSteps?: {
    step: string;
    status: "pending" | "complete" | "error";
    detail?: string;
  }[];
}

type FileGenerationInfo = FileGenerationCollectedInfo;

interface FileGenerationState {
  inProgress: boolean;
  collectedInfo?: FileGenerationInfo;
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
  onFileChange?: (filename: string) => void;
}

function hasGeneratedFilePath(
  info: any
): info is { generatedFilePath: string } {
  return (
    info &&
    typeof info.generatedFilePath === "string" &&
    info.generatedFilePath.length > 0
  );
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
  onFileChange,
}: RightBarProps) {
  const [prompt, setPrompt] = React.useState("");
  const [isEnhancing, setIsEnhancing] = React.useState(false);
  const [width, setWidth] = React.useState(400);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [fileGenerationState, setFileGenerationState] =
    React.useState<FileGenerationState | null>(null);

  const scrollToBottom = React.useCallback(() => {
    if (scrollRef.current) {
      // Get the ScrollArea viewport
      const viewport = scrollRef.current.closest(
        "[data-radix-scroll-area-viewport]"
      );
      if (viewport) {
        // Force immediate scroll to bottom
        viewport.scrollTop = viewport.scrollHeight;

        // Then smooth scroll to ensure it's visible
        requestAnimationFrame(() => {
          viewport.scrollTo({
            top: viewport.scrollHeight,
            behavior: "smooth",
          });
        });
      }
    }
  }, []);

  // Scroll when messages change
  React.useEffect(() => {
    // Immediate scroll for new messages
    scrollToBottom();
    // Double-check scroll after a short delay to ensure content is rendered
    const timeoutId = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timeoutId);
  }, [messages, scrollToBottom]);

  // Scroll when the right bar is toggled
  React.useEffect(() => {
    if (!isCollapsed) {
      const timeoutId = setTimeout(scrollToBottom, 150);
      return () => clearTimeout(timeoutId);
    }
  }, [isCollapsed, scrollToBottom]);

  const handleResize = (delta: number) => {
    const newWidth = Math.max(250, Math.min(800, width - delta));
    setWidth(newWidth);
    onWidthChange?.(newWidth);
  };

  const stripHtml = (html: string) => {
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
  };

  const handleSendMessage = async () => {
    if (!prompt.trim() || isEnhancing) return;

    setIsEnhancing(true);
    try {
      console.log("Starting chat request:", {
        prompt,
        currentFile,
        hasSelection: editor.state.selection.from !== editor.state.selection.to,
      });

      // Add user message immediately
      const userMessage: Message = {
        role: "user",
        content: stripHtml(prompt),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);

      // Add loading message with steps
      const loadingMessage: Message = {
        role: "assistant",
        content: "",
        timestamp: new Date(),
        isLoading: true,
        loadingSteps: [
          { step: "Analyzing request", status: "pending" },
          { step: "Determining document structure", status: "pending" },
          { step: "Generating content", status: "pending" },
          { step: "Creating file", status: "pending" },
        ],
      };
      setMessages((prev) => [...prev, loadingMessage]);

      // Update loading steps as we progress
      const updateLoadingStep = (
        stepIndex: number,
        status: "complete" | "error",
        detail?: string
      ) => {
        setMessages((prev) => {
          const messages = [...prev];
          const loadingMessage = messages[messages.length - 1];
          if (loadingMessage.loadingSteps) {
            loadingMessage.loadingSteps[stepIndex].status = status;
            if (detail) {
              loadingMessage.loadingSteps[stepIndex].detail = detail;
            }
          }
          return messages;
        });
      };

      // Get the current document state
      const selection = editor.state.selection;
      const from = selection.from;
      const to = selection.to;
      const selectedText = editor.state.doc.textBetween(from, to);
      const fullContent = editor.getHTML();
      const lineMetadata = editor.storage.lineTracker.lines;

      updateLoadingStep(0, "complete");

      // Call the AI service with file generation context if needed
      const data = await aiService.chat({
        message: prompt,
        lineMetadata: Array.from(lineMetadata.values()),
        selectedText,
        fullContent,
        filename: getDisplayName(currentFile),
        context: fileGenerationState ? { fileGenerationState } : undefined,
      });

      updateLoadingStep(1, "complete");

      // Update file generation state if needed
      if (data.fileGeneration) {
        setFileGenerationState({
          inProgress: !data.fileGeneration.shouldGenerate,
          collectedInfo: {
            ...fileGenerationState?.collectedInfo,
            ...data.fileGeneration.collectedInfo,
          },
        });

        updateLoadingStep(2, "complete");

        // If a file was generated, refresh the sidebar and open the file
        if (
          data.fileGeneration.shouldGenerate &&
          data.fileGeneration.collectedInfo &&
          hasGeneratedFilePath(data.fileGeneration.collectedInfo)
        ) {
          const filePath = data.fileGeneration.collectedInfo.generatedFilePath;
          // Find and refresh the sidebar
          const sidebarElement = document.querySelector("[data-sidebar-ref]");
          if (sidebarElement) {
            const loadFilesFunction = (sidebarElement as any).__loadFiles;
            if (loadFilesFunction) {
              await loadFilesFunction();

              // Read and load the generated file
              try {
                const content = await FileService.readFile(filePath);
                editor.commands.setContent(content);
                updateLoadingStep(3, "complete", filePath);
                // Notify parent about the file change
                onFileChange?.(filePath);
              } catch (error) {
                console.error("Error loading generated file:", error);
                updateLoadingStep(3, "error", "Failed to load generated file");
              }
            }
          }
        }
      }

      console.log("Received AI response:", {
        hasMessage: !!data.message,
        hasEnhancedText: !!data.enhancedText,
        numberOfLines: data.enhancedText?.lines.length,
      });

      // Remove loading message and add actual response
      setMessages((prev) =>
        prev.slice(0, -1).concat({
          role: "assistant",
          content: stripHtml(data.message),
          timestamp: new Date(),
        })
      );

      // If we're not in file generation mode, handle normal editor updates
      if (!data.fileGeneration && data.enhancedText?.lines) {
        const originalContent = selectedText || fullContent;
        const enhancedContent = data.enhancedText.lines
          .map((line) => line.content)
          .join("\n");

        // Update enhancement history
        onEnhance(originalContent, enhancedContent, prompt);

        // Update editor content
        editor.commands.setContent("");
        data.enhancedText.lines.forEach((line) => {
          editor
            .chain()
            .focus()
            .insertContent([
              {
                type: "paragraph",
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
      // Update all remaining pending steps to error
      setMessages((prev) => {
        const messages = [...prev];
        const loadingMessage = messages[messages.length - 1];
        if (loadingMessage.loadingSteps) {
          loadingMessage.loadingSteps.forEach((step) => {
            if (step.status === "pending") {
              step.status = "error";
            }
          });
        }
        return messages;
      });
      // Add error message
      setMessages((prev) =>
        prev.slice(0, -1).concat({
          role: "assistant",
          content:
            error instanceof Error && error.message.includes("API key")
              ? "Please configure your OpenAI API key in settings."
              : "Sorry, I encountered an error. Please try again.",
          timestamp: new Date(),
        })
      );
    } finally {
      setIsEnhancing(false);
    }
  };

  const renderLoadingSteps = (steps: Message["loadingSteps"]) => {
    if (!steps) return null;

    return (
      <div className="space-y-2">
        {steps.map((step, index) => (
          <div key={index} className="flex items-center gap-2">
            {step.status === "pending" ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : step.status === "complete" ? (
              <div className="h-3 w-3 rounded-full bg-green-500" />
            ) : (
              <div className="h-3 w-3 rounded-full bg-red-500" />
            )}
            <span className="text-sm">{step.step}</span>
            {step.detail && (
              <span className="text-xs text-muted-foreground">
                ({step.detail})
              </span>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div
      className={cn(
        "group/rightbar relative flex flex-col border-l",
        "bg-muted/50 dark:bg-muted/50 backdrop-blur supports-[backdrop-filter]:bg-muted/50",
        isCollapsed ? "w-14" : "",
        className
      )}
      style={!isCollapsed ? { width: `${width}px` } : undefined}
    >
      {!isCollapsed && (
        <ResizeHandle
          className="left-0 right-auto z-50"
          onResize={handleResize}
        />
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
        <div className="flex-1 overflow-hidden flex flex-col">
          <Tabs defaultValue="chat" className="flex-1 flex flex-col h-full">
            <div className="flex-none flex items-center justify-between border-b px-1">
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
              className="flex-1 flex flex-col overflow-hidden data-[state=active]:flex-1"
            >
              <div className="flex-1 flex flex-col min-h-0">
                <ScrollArea>
                  <div className="flex flex-col p-4 space-y-4" ref={scrollRef}>
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
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-2">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                <span>Generating document...</span>
                              </div>
                              {renderLoadingSteps(message.loadingSteps)}
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
                    <div className="h-4 flex-none" />
                  </div>
                </ScrollArea>
              </div>

              <div className="flex-none p-4 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/95">
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

            <TabsContent
              value="history"
              className="p-4 mt-0 flex-1 overflow-auto"
            >
              <ScrollArea className="h-full">
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
