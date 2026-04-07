import { create } from "zustand";
import type { ElementSelection, EditorAction } from "@/types";

interface EditorState {
  // Current page HTML
  html: string;
  css: string;

  // Selection
  selectedElement: ElementSelection | null;

  // History (undo/redo)
  history: EditorAction[];
  historyIndex: number;

  // AI prompt
  isAiLoading: boolean;
  aiStreamContent: string;
  sessionCostCents: number;

  // Actions
  setHtml: (html: string) => void;
  setCss: (css: string) => void;
  selectElement: (element: ElementSelection | null) => void;
  pushAction: (action: EditorAction) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  setAiLoading: (loading: boolean) => void;
  setAiStreamContent: (content: string) => void;
  addCost: (cents: number) => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  html: "",
  css: "",
  selectedElement: null,
  history: [],
  historyIndex: -1,
  isAiLoading: false,
  aiStreamContent: "",
  sessionCostCents: 0,

  setHtml: (html) => set({ html }),
  setCss: (css) => set({ css }),
  selectElement: (element) => set({ selectedElement: element }),

  pushAction: (action) => {
    const { history, historyIndex } = get();
    // Truncate any future actions (if we undid and now do something new)
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(action);
    set({
      history: newHistory,
      historyIndex: newHistory.length - 1,
      html: action.after,
    });
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < 0) return;
    const action = history[historyIndex];
    set({ historyIndex: historyIndex - 1, html: action.before });
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex >= history.length - 1) return;
    const action = history[historyIndex + 1];
    set({ historyIndex: historyIndex + 1, html: action.after });
  },

  canUndo: () => get().historyIndex >= 0,
  canRedo: () => get().historyIndex < get().history.length - 1,

  setAiLoading: (loading) => set({ isAiLoading: loading }),
  setAiStreamContent: (content) => set({ aiStreamContent: content }),
  addCost: (cents) =>
    set((s) => ({ sessionCostCents: s.sessionCostCents + cents })),
}));
