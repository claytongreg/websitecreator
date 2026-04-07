import { create } from "zustand";
import type { ElementSelection, EditorAction, ThemeSettings, HeadingStyle } from "@/types";
import { DEFAULT_THEME } from "./theme-css";

type HeadingLevel = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

interface EditorState {
  // Current page HTML
  html: string;
  css: string;

  // Theme
  theme: ThemeSettings;
  showThemePanel: boolean;

  // Selection
  selectedElement: ElementSelection | null;

  // History (undo/redo)
  history: EditorAction[];
  historyIndex: number;

  // AI prompt
  isAiLoading: boolean;
  aiStreamContent: string;
  sessionCostCents: number;

  // Photo widget
  isPhotoWidgetOpen: boolean;

  // Actions
  setHtml: (html: string) => void;
  setCss: (css: string) => void;
  setTheme: (theme: ThemeSettings) => void;
  setThemeFont: (type: "heading" | "body", font: string) => void;
  setHeadingStyle: (level: HeadingLevel, style: Partial<HeadingStyle>) => void;
  setBaseFontSize: (size: string) => void;
  setShowThemePanel: (show: boolean) => void;
  selectElement: (element: ElementSelection | null) => void;
  updateSelectionRect: (rect: { x: number; y: number; width: number; height: number }) => void;
  pushAction: (action: EditorAction) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  setAiLoading: (loading: boolean) => void;
  setAiStreamContent: (content: string) => void;
  addCost: (cents: number) => void;
  setPhotoWidgetOpen: (open: boolean) => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  html: "",
  css: "",
  theme: DEFAULT_THEME,
  showThemePanel: false,
  selectedElement: null,
  history: [],
  historyIndex: -1,
  isAiLoading: false,
  aiStreamContent: "",
  sessionCostCents: 0,
  isPhotoWidgetOpen: false,

  setHtml: (html) => set({ html }),
  setCss: (css) => set({ css }),
  setTheme: (theme) => set({ theme }),
  setThemeFont: (type, font) =>
    set((s) => ({
      theme: { ...s.theme, fonts: { ...s.theme.fonts, [type]: font } },
    })),
  setHeadingStyle: (level, style) =>
    set((s) => ({
      theme: {
        ...s.theme,
        headingSizes: {
          ...s.theme.headingSizes,
          [level]: { ...s.theme.headingSizes[level], ...style },
        },
      },
    })),
  setBaseFontSize: (size) =>
    set((s) => ({ theme: { ...s.theme, baseFontSize: size } })),
  setShowThemePanel: (show) => set({ showThemePanel: show }),
  selectElement: (element) => set({ selectedElement: element }),
  updateSelectionRect: (rect) => {
    const { selectedElement } = get();
    if (selectedElement) {
      set({ selectedElement: { ...selectedElement, boundingRect: rect } });
    }
  },

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
  setPhotoWidgetOpen: (open) => set({ isPhotoWidgetOpen: open }),
}));
