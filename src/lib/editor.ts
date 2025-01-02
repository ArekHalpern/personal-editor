import StarterKit from "@tiptap/starter-kit";
import BubbleMenuExtension from "@tiptap/extension-bubble-menu";
import Placeholder from "@tiptap/extension-placeholder";
import { PLACEHOLDER_TEXT } from "./constants";

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