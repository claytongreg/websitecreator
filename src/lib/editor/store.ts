import { create } from "zustand";
import type { ElementSelection, EditorAction, ThemeSettings, HeadingStyle } from "@/types";
import { DEFAULT_THEME } from "./theme-css";

type HeadingLevel = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

export interface SessionEdit {
  action: string;   // "generate_site" | "edit_page" | "edit_element" | "generate_image"
  model: string;
  costCents: number;
  inputTokens?: number;
  outputTokens?: number;
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

  // Screenshot capture
  screenshotMode: boolean;
  screenshotDataUrl: string | null;

  // Style editing (properties panel)
  styleChangeBeforeHtml: string | null;
  _skipIframeRewrite: boolean;

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
  setScreenshotMode: (on: boolean) => void;
  setScreenshotDataUrl: (url: string | null) => void;
  beginStyleChange: () => void;
  commitStyleChange: (afterHtml: string, elementPath: string, updatedComputedStyle?: Record<string, string>) => void;
}

// Hydrate session cost from sessionStorage so it survives page reloads / navigations
const COST_STORAGE_KEY = "echowebo_session_cost";

function loadPersistedCost(): { sessionCostCents: number; sessionEdits: SessionEdit[] } {
  if (typeof window === "undefined") return { sessionCostCents: 0, sessionEdits: [] };
  try {
    const raw = sessionStorage.getItem(COST_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        sessionCostCents: parsed.sessionCostCents ?? 0,
        sessionEdits: parsed.sessionEdits ?? [],
      };
    }
  } catch { /* ignore */ }
  return { sessionCostCents: 0, sessionEdits: [] };
}

function persistCost(costCents: number, edits: SessionEdit[]) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      COST_STORAGE_KEY,
      JSON.stringify({ sessionCostCents: costCents, sessionEdits: edits })
    );
  } catch { /* quota exceeded — ignore */ }
}

const initialCost = loadPersistedCost();

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
  sessionCostCents: initialCost.sessionCostCents,
  sessionEdits: initialCost.sessionEdits,
  isPhotoWidgetOpen: false,
  screenshotMode: false,
  screenshotDataUrl: null,
  styleChangeBeforeHtml: null,
  _skipIframeRewrite: false,

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
    set((s) => {
      const newCost = s.sessionCostCents + cents;
      persistCost(newCost, s.sessionEdits);
      return { sessionCostCents: newCost };
    }),
  addEdit: (edit) =>
    set((s) => {
      const newCost = s.sessionCostCents + edit.costCents;
      const newEdits = [...s.sessionEdits, edit];
      persistCost(newCost, newEdits);
      return { sessionCostCents: newCost, sessionEdits: newEdits };
    }),
  setPhotoWidgetOpen: (open) => set({ isPhotoWidgetOpen: open }),
  setScreenshotMode: (on) => set({ screenshotMode: on }),
  setScreenshotDataUrl: (url) => set({ screenshotDataUrl: url }),

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
      _skipIframeRewrite: true,
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
