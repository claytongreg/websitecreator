// ============================================================
// Core Types for EchoWebo
// ============================================================

// --- AI Provider System ---

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  capabilities: ("text" | "code" | "image")[];
  inputCostPer1k: number; // cost per 1K input tokens in cents
  outputCostPer1k: number; // cost per 1K output tokens in cents
  imageCostCents?: number; // flat cost per image generation in cents (for image models)
  maxTokens: number;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface GenerateOptions {
  model: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  images?: string[]; // base64 data URLs for vision-capable models
  onUsage?: (usage: TokenUsage) => void;
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

// --- Page Tree ---

export interface PageNode {
  id: string;
  title: string;
  slug: string;
  children: PageNode[];
}

export interface FlatPage {
  slug: string;
  title: string;
  parentSlug: string | null;
  order: number;
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
  pages: PageNode[];
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

// --- Theme ---

export interface HeadingStyle {
  size: string;
  weight: string;
  lineHeight: string;
}

export interface ThemeSettings {
  fonts: { heading: string; body: string };
  headingSizes: {
    h1: HeadingStyle;
    h2: HeadingStyle;
    h3: HeadingStyle;
    h4: HeadingStyle;
    h5: HeadingStyle;
    h6: HeadingStyle;
  };
  baseFontSize: string;
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
