import { create } from "zustand";
import type { ElementSelection, EditorAction, ThemeSettings, HeadingStyle } from "@/types";
import { DEFAULT_THEME } from "./theme-css";

type HeadingLevel = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

export interface SessionEdit {
  action: string;   // "generate_site" | "edit_page" | "edit_element" | "generate_image"
  model: string;
  costCents: number;
  timestamp: number;
}

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
  sessionEdits: SessionEdit[];

  // Photo widget
  isPhotoWidgetOpen: boolean;

  // Style editing (properties panel)
  styleChangeBeforeHtml: string | null;

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
  addEdit: (edit: SessionEdit) => void;
  setPhotoWidgetOpen: (open: boolean) => void;
  beginStyleChange: () => void;
  commitStyleChange: (afterHtml: string, elementPath: string, updatedComputedStyle?: Record<string, string>) => void;
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
  sessionEdits: [],
  isPhotoWidgetOpen: false,
  styleChangeBeforeHtml: null,

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
      selectedElement: null,
    });
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < 0) return;
    const action = history[historyIndex];
    set({ historyIndex: historyIndex - 1, html: action.before, selectedElement: null });
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex >= history.length - 1) return;
    const action = history[historyIndex + 1];
    set({ historyIndex: historyIndex + 1, html: action.after, selectedElement: null });
  },

  canUndo: () => get().historyIndex >= 0,
  canRedo: () => get().historyIndex < get().history.length - 1,

  setAiLoading: (loading) => set({ isAiLoading: loading }),
  setAiStreamContent: (content) => set({ aiStreamContent: content }),
  addCost: (cents) =>
    set((s) => ({ sessionCostCents: s.sessionCostCents + cents })),
  addEdit: (edit) =>
    set((s) => ({
      sessionCostCents: s.sessionCostCents + edit.costCents,
      sessionEdits: [...s.sessionEdits, edit],
    })),
  setPhotoWidgetOpen: (open) => set({ isPhotoWidgetOpen: open }),

  beginStyleChange: () => {
    const { styleChangeBeforeHtml, html } = get();
    if (styleChangeBeforeHtml === null) {
      set({ styleChangeBeforeHtml: html });
    }
  },

  commitStyleChange: (afterHtml, elementPath, updatedComputedStyle) => {
    const { styleChangeBeforeHtml, html, history, historyIndex, selectedElement } = get();
    const before = styleChangeBeforeHtml ?? html;
    // No-op if nothing changed
    if (before === afterHtml) {
      set({ styleChangeBeforeHtml: null });
      return;
    }
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({
      type: "style",
      elementPath,
      before,
      after: afterHtml,
      timestamp: Date.now(),
    });
    const updates: Partial<EditorState> = {
      history: newHistory,
      historyIndex: newHistory.length - 1,
      html: afterHtml,
      styleChangeBeforeHtml: null,
    };
    // Preserve selection but update computedStyle if provided
    if (selectedElement && updatedComputedStyle) {
      updates.selectedElement = {
        ...selectedElement,
        computedStyle: { ...selectedElement.computedStyle, ...updatedComputedStyle },
      };
    }
    set(updates);
  },
}));
