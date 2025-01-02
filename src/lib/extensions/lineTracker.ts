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
                const nodeType = node.type.name;
                
                const lineMetadata: LineMetadata = {
                  id: existingLine?.id || uuidv4(),
                  number: lineNumber,
                  content: node.textContent,
                  type: nodeType === 'heading' 
                    ? node.attrs.level === 1 
                      ? 'heading1'
                      : 'heading2'
                    : nodeType === 'paragraph' 
                    ? 'paragraph' 
                    : 'list-item',
                  timestamp: existingLine?.timestamp || new Date(),
                  lastModified: existingLine?.content !== node.textContent 
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
