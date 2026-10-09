import { create } from 'zustand';
import type { UIDocument } from '@/entities/ui-node/types';
import { emptyDocument } from './editor-commands';
interface EditorState {
  document: UIDocument;
  selectedId: string | null;
  past: UIDocument[];
  future: UIDocument[];
  change: number;
  dirty: boolean;
  initialize: (d: UIDocument) => void;
  select: (id: string | null) => void;
  commit: (fn: (d: UIDocument) => UIDocument) => void;
  undo: () => void;
  redo: () => void;
  markSaved: (document: UIDocument) => void;
}
export const useEditorStore = create<EditorState>((set) => ({
  document: emptyDocument(),
  selectedId: null,
  past: [],
  future: [],
  change: 0,
  dirty: false,
  initialize: (document) =>
    set({ document, selectedId: null, past: [], future: [], dirty: false, change: 0 }),
  select: (selectedId) => set({ selectedId }),
  commit: (fn) =>
    set((s) => {
      const document = fn(s.document);
      if (document === s.document) return {};
      return {
        document,
        past: [...s.past, s.document].slice(-50),
        future: [],
        dirty: true,
        change: s.change + 1,
        selectedId: s.selectedId && document.nodes[s.selectedId] ? s.selectedId : null,
      };
    }),
  undo: () =>
    set((s) => {
      const document = s.past.at(-1);
      return document
        ? {
            document,
            past: s.past.slice(0, -1),
            future: [s.document, ...s.future],
            selectedId: null,
            dirty: true,
            change: s.change + 1,
          }
        : {};
    }),
  redo: () =>
    set((s) => {
      const document = s.future[0];
      return document
        ? {
            document,
            past: [...s.past, s.document].slice(-50),
            future: s.future.slice(1),
            selectedId: null,
            dirty: true,
            change: s.change + 1,
          }
        : {};
    }),
  markSaved: (document) => set((s) => ({ dirty: s.document !== document })),
}));
