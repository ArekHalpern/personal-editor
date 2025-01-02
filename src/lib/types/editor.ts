import StarterKit from "@tiptap/starter-kit";
import BubbleMenuExtension from "@tiptap/extension-bubble-menu";
import Placeholder from "@tiptap/extension-placeholder";
import { PLACEHOLDER_TEXT } from "../constants";

// Types
export interface EnhancementHistoryItem {
  original: string;
  enhanced: string;
  prompt: string;
  timestamp: Date;
}

export interface EditorNode {
  type: string;
  attrs?: {
    level?: number;
    [key: string]: unknown;
  };
  content?: EditorNode[];
  text?: string;
}

// Editor Configuration
export const editorConfig = {
  extensions: [
    StarterKit.configure({
      heading: {
        levels: [1, 2],
      },
    }),
    BubbleMenuExtension.configure({
      shouldShow: ({ editor }) => {
        return editor.isEditable && !editor.state.selection.empty;
      },
      tippyOptions: {
        duration: 200,
        placement: "top",
      },
    }),
    Placeholder.configure({
      placeholder: ({ node }) => {
        if (node.type.name === "heading") {
          return PLACEHOLDER_TEXT.title;
        }
        return PLACEHOLDER_TEXT.content;
      },
      showOnlyWhenEditable: true,
      showOnlyCurrent: true,
    }),
  ],
  editorProps: {
    attributes: {
      class:
        "prose prose-sm sm:prose-base lg:prose-lg prose-stone dark:prose-invert focus:outline-none p-4 h-full",
    },
    handleDOMEvents: {
      blur: () => {
        return false;
      },
    },
  },
};

// Editor Utilities
export const getFirstHeadingText = (content: EditorNode[]): string | null => {
  const heading = content.find(
    (node) => node.type === "heading" && node.attrs?.level === 1
  );
  return heading?.content?.[0]?.text?.trim() || null;
};

export const isEmptyDocument = (content: EditorNode[]): boolean => {
  return (
    content.length === 0 ||
    (content.length === 1 &&
      content[0].type === "paragraph" &&
      (!content[0].content || content[0].content.length === 0))
  );
}; 