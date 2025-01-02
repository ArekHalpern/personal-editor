import { Editor } from '@tiptap/react';
import { LineMetadata } from '../types/editor';

export function useLineMetadata(editor: Editor) {
  const getLineMetadata = (lineNumber: number): LineMetadata | undefined => {
    return editor.storage.lineTracker.lines.get(lineNumber);
  };

  const getAllLines = (): LineMetadata[] => {
    return Array.from(editor.storage.lineTracker.lines.values());
  };

  const getSelectedLineMetadata = (): LineMetadata | undefined => {
    const { from } = editor.state.selection;
    const pos = editor.state.doc.resolve(from);
    const lineNumber = pos.index(1) + 1;
    return getLineMetadata(lineNumber);
  };

  const updateLineMetadata = (
    lineNumber: number,
    updates: Partial<LineMetadata>
  ) => {
    const line = editor.storage.lineTracker.lines.get(lineNumber);
    if (line) {
      editor.storage.lineTracker.lines.set(lineNumber, {
        ...line,
        ...updates,
        lastModified: new Date(),
      });
    }
  };

  return {
    getLineMetadata,
    getAllLines,
    getSelectedLineMetadata,
    updateLineMetadata,
  };
}