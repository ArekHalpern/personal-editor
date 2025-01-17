import StarterKit from "@tiptap/starter-kit";
import BubbleMenuExtension from "@tiptap/extension-bubble-menu";
import Placeholder from "@tiptap/extension-placeholder";
import Heading from "@tiptap/extension-heading";
import { PLACEHOLDER_TEXT } from "../constants";
import { LineTracker } from "../extensions/lineTracker";
import { EditorView } from "prosemirror-view";

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

export interface LineMetadata {
  id: string;
  number: number;
  content: string;
  type: 'paragraph' | 'list-item';
  attrs?: {
    [key: string]: unknown;
  };
  timestamp: Date;
  lastModified?: Date;
  aiEnhanced?: boolean;
  aiMetadata?: {
    lastEnhanced?: Date;
    enhancementPrompt?: string;
    originalContent?: string;
  };
}

export interface EditorLineState {
  lines: Map<number, LineMetadata>;
  lastLineNumber: number;
}

// Editor Configuration
export const editorConfig = {
  extensions: [
    StarterKit.configure({
      heading: false,
    }),
    Heading.configure({
      levels: [2],
    }),
    BubbleMenuExtension.configure({
      shouldShow: ({ editor, state }) => {
        return editor.isEditable && !state.selection.empty;
      },
      tippyOptions: {
        duration: 200,
        placement: "top",
      },
    }),
    Placeholder.configure({
      placeholder: () => {
        return PLACEHOLDER_TEXT.content;
      },
      showOnlyWhenEditable: true,
      showOnlyCurrent: true,
      includeChildren: true,
      emptyEditorClass: 'is-editor-empty',
      emptyNodeClass: 'is-empty',
    }),
    LineTracker,
  ],
  editorProps: {
    attributes: {
      class:
        "prose prose-base prose-stone dark:prose-invert focus:outline-none h-full",
    },
    handleDOMEvents: {
      blur: () => {
        return false;
      },
      focus: (view: EditorView) => {
        // If cursor is not visible, move it to the end of the content
        const editor = (view as any).editor;
        if (editor && editor.state.selection.empty) {
          editor.commands.focus('end');
        }
        return false;
      },
    },
  },
};

// Editor Utilities
export const getFirstHeadingText = (content: EditorNode[]): string | null => {
  if (content.length === 0) return null;
  const firstNode = content[0];
  return firstNode.text || null;
};

export const isEmptyDocument = (content: EditorNode[]): boolean => {
  return (
    content.length === 0 ||
    (content.length === 1 &&
      content[0].type === "paragraph" &&
      (!content[0].content || content[0].content.length === 0))
  );
}; 