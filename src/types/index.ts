// ============================================================
// Core Types for WebsiteCreator
// ============================================================

// --- AI Provider System ---

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  capabilities: ("text" | "code" | "image")[];
  inputCostPer1k: number; // cost per 1K input tokens in cents
  outputCostPer1k: number; // cost per 1K output tokens in cents
  maxTokens: number;
}

export interface GenerateOptions {
  model: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ImageOptions {
  model: string;
  width?: number;
  height?: number;
}

export interface AIProvider {
  id: string;
  name: string;
  models: AIModel[];
  generateText(
    prompt: string,
    options: GenerateOptions
  ): AsyncIterable<string>;
  generateImage?(prompt: string, options: ImageOptions): Promise<string>;
}

// --- Onboarding ---

export interface ExtractedStyle {
  colors: string[]; // hex values
  fonts: { family: string; weight?: string; usage?: string }[];
  layout: string; // description of layout pattern
  mood: string; // AI-described mood/feel
}

export interface InspirationSite {
  url: string;
  style: ExtractedStyle;
  screenshot?: string; // base64 thumbnail
}

export interface OnboardingData {
  inspirations: InspirationSite[];
  description: string;
  businessType: string;
  pages: string[]; // ["home", "about", "contact", ...]
  chosenStyle?: StyleOption;
}

export interface StyleOption {
  id: string;
  name: string;
  colors: string[];
  fonts: { heading: string; body: string };
  mood: string;
  previewHtml?: string;
}

// --- Editor ---

export interface ElementSelection {
  path: string; // CSS selector path to element
  tagName: string;
  textContent?: string;
  attributes: Record<string, string>;
  computedStyle: Record<string, string>;
  boundingRect: { x: number; y: number; width: number; height: number };
  outerHTML: string;
}

export interface EditorAction {
  type: "edit" | "delete" | "insert" | "style" | "move";
  elementPath: string;
  before: string; // HTML before change
  after: string; // HTML after change
  timestamp: number;
}

// --- Billing ---

export interface UsageEstimate {
  provider: string;
  model: string;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  estimatedCostCents: number;
}

export interface UsageSummary {
  totalCostCents: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  byProvider: Record<
    string,
    { costCents: number; inputTokens: number; outputTokens: number }
  >;
  byAction: Record<string, { count: number; costCents: number }>;
}
