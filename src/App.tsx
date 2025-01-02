import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import BubbleMenuExtension from "@tiptap/extension-bubble-menu";
import { useState, useCallback, useEffect } from "react";
import { Sidebar } from "./components/Sidebar";
import { RightBar } from "./components/RightBar";
import { BubbleMenu } from "./components/BubbleMenu";
import { ThemeProvider } from "./components/theme-provider";
import { writeFile, mkdir } from "@tauri-apps/plugin-fs";
import { documentDir } from "@tauri-apps/api/path";
import "./index.css";

// Add custom styles for enhancement selection
const customStyles = `
.ProseMirror.enhancing .ProseMirror-selectionparent::before {
  background-color: rgba(147, 51, 234, 0.2) !important;
  border-radius: 0.125rem;
  content: '';
  position: absolute;
  pointer-events: none;
  z-index: -1;
}

.ProseMirror.enhancing {
  position: relative;
}
`;

const DEFAULT_PATH = "ai-editor-files";
const AUTO_SAVE_DELAY = 1000; // 1 second

function App() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isRightBarCollapsed, setIsRightBarCollapsed] = useState(false);
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [enhancementHistory, setEnhancementHistory] = useState<
    Array<{
      original: string;
      enhanced: string;
      prompt: string;
      timestamp: Date;
    }>
  >([]);

  // Initialize the editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2],
        },
      }),
      BubbleMenuExtension.configure({
        shouldShow: ({ editor }) => {
          return !editor.state.selection.empty;
        },
      }),
    ],
    content:
      "<h1>Welcome to AI Editor</h1><p>This is a minimal, modern editor with AI capabilities.</p><p>Select any text to format it using the bubble menu.</p>",
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose-base lg:prose-lg prose-stone dark:prose-invert focus:outline-none p-4 h-full",
      },
    },
    onUpdate: ({ editor }) => {
      if (currentFile) {
        debouncedSave(currentFile, editor.getHTML());
      }
    },
  });

  // Create debounced save function
  const debouncedSave = useCallback(
    debounce(async (filePath: string, content: string) => {
      try {
        const docDir = await documentDir();
        await writeFile(
          `${docDir}/${DEFAULT_PATH}/${filePath}`,
          new TextEncoder().encode(content)
        );
        console.log("File auto-saved:", filePath);
      } catch (error) {
        console.error("Error auto-saving file:", error);
      }
    }, AUTO_SAVE_DELAY),
    []
  );

  // Initialize the documents directory
  useEffect(() => {
    const initDirectory = async () => {
      try {
        const docDir = await documentDir();
        const dirPath = `${docDir}/${DEFAULT_PATH}`;

        // Create the directory with recursive option
        await mkdir(dirPath, { recursive: true });
      } catch (error) {
        if (
          !(error instanceof Error) ||
          !error.message.includes("File exists")
        ) {
          console.error("Directory initialization error:", error);
        }
      }
    };
    initDirectory();
  }, []);

  const handleFileSelect = (content: string, filename?: string) => {
    if (editor) {
      editor.commands.setContent(content);
      setCurrentFile(filename || null);
    }
  };

  const handleEnhance = (
    original: string,
    enhanced: string,
    prompt: string
  ) => {
    setEnhancementHistory((prev) => [
      {
        original,
        enhanced,
        prompt,
        timestamp: new Date(),
      },
      ...prev,
    ]);
  };

  if (!editor) {
    return null;
  }

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <style>{customStyles}</style>
      <div className="flex h-screen bg-background">
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          onFileSelect={handleFileSelect}
        />
        <main className="flex-1 overflow-hidden">
          <div className="relative h-full">
            <BubbleMenu editor={editor} onEnhance={handleEnhance} />
            <EditorContent editor={editor} className="h-full overflow-y-auto" />
          </div>
        </main>
        <RightBar
          editor={editor}
          isCollapsed={isRightBarCollapsed}
          onToggle={() => setIsRightBarCollapsed(!isRightBarCollapsed)}
          enhancementHistory={enhancementHistory}
          onEnhance={handleEnhance}
        />
      </div>
    </ThemeProvider>
  );
}

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export default App;
