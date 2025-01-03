import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { v4 as uuidv4 } from 'uuid';
import { LineMetadata, EditorLineState } from '../types/editor';

export const LineTracker = Extension.create({
  name: 'lineTracker',

  addStorage() {
    return {
      lines: new Map<number, LineMetadata>(),
      lastLineNumber: 0,
    } as EditorLineState;
  },

  addProseMirrorPlugins() {
    const storage = this.storage;

    return [
      new Plugin({
        key: new PluginKey('lineTracker'),
        view(_editorView) {
          return {
            update(view, _prevState) {
              const doc = view.state.doc;
              const newLines = new Map<number, LineMetadata>();
              let lineNumber = 1;

              doc.forEach((node, _pos) => {
                const existingLine = storage.lines.get(lineNumber);
                
                // Skip empty text nodes
                if (node.type.name === 'text' && (!node.text || node.text.trim().length === 0)) {
                  return;
                }

                // Ensure valid content
                const content = node.textContent || ' ';
                if (content.trim().length === 0) {
                  return;
                }
                
                const lineMetadata: LineMetadata = {
                  id: existingLine?.id || uuidv4(),
                  number: lineNumber,
                  content,
                  type: getLineType(node),
                  attrs: node.type.name === 'heading' ? { level: node.attrs.level } : undefined,
                  timestamp: existingLine?.timestamp || new Date(),
                  lastModified: existingLine?.content !== content 
                    ? new Date() 
                    : existingLine?.lastModified,
                  aiEnhanced: existingLine?.aiEnhanced || false,
                  aiMetadata: existingLine?.aiMetadata,
                };

                newLines.set(lineNumber, lineMetadata);
                lineNumber++;
              });

              storage.lines = newLines;
              storage.lastLineNumber = lineNumber - 1;
            },
          };
        },
      }),
    ];
  },
});

// Get the line type based on node type and attributes
const getLineType = (node: any): LineMetadata['type'] => {
  if (node.type.name === 'bulletList' || node.type.name === 'listItem') {
    return 'list-item';
  }
  return 'paragraph';
};
