export interface ModelOption {
  id: string;
  name: string;
  provider: string;
  tier: "free" | "budget" | "standard" | "premium";
  inputCostPer1k: number;  // cents per 1K input tokens (matches provider files)
  outputCostPer1k: number; // cents per 1K output tokens (matches provider files)
}

export interface ImageModelOption {
  id: string;
  name: string;
  provider: string;
  costPerImage: string; // display price after markup e.g. "$0.03"
}

// 200% markup on all API costs (3x base cost) — must match provider.ts
export const MARKUP_MULTIPLIER = 3;
// Rough token estimates per page for site generation — must match /api/sites
export const INPUT_TOKENS_PER_PAGE = 800;
export const OUTPUT_TOKENS_PER_PAGE = 2000;
// Rough token estimates for a single AI edit (system prompt + full page HTML in, full HTML out)
export const INPUT_TOKENS_PER_EDIT = 4000;
export const OUTPUT_TOKENS_PER_EDIT = 3000;

export const MODELS: ModelOption[] = [
  // Free (text)
  { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B", provider: "Groq", tier: "free", inputCostPer1k: 0, outputCostPer1k: 0 },
  { id: "qwen-qwq-32b", name: "Qwen QwQ 32B", provider: "Groq", tier: "free", inputCostPer1k: 0, outputCostPer1k: 0 },
  { id: "gemma2-9b-it", name: "Gemma 2 9B", provider: "Groq", tier: "free", inputCostPer1k: 0, outputCostPer1k: 0 },
  { id: "mistral-small-latest", name: "Mistral Small", provider: "Mistral", tier: "free", inputCostPer1k: 0, outputCostPer1k: 0 },
  { id: "codestral-latest", name: "Codestral", provider: "Mistral", tier: "free", inputCostPer1k: 0, outputCostPer1k: 0 },
  // Budget (text) — rates from src/lib/ai/*.ts
  { id: "gpt-4o-mini", name: "GPT-4o Mini", provider: "OpenAI", tier: "budget", inputCostPer1k: 0.015, outputCostPer1k: 0.06 },
  { id: "gpt-4.1-mini", name: "GPT-4.1 Mini", provider: "OpenAI", tier: "budget", inputCostPer1k: 0.04, outputCostPer1k: 0.16 },
  { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", provider: "Google", tier: "budget", inputCostPer1k: 0.01, outputCostPer1k: 0.04 },
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", provider: "Google", tier: "budget", inputCostPer1k: 0.015, outputCostPer1k: 0.06 },
  { id: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5", provider: "Anthropic", tier: "budget", inputCostPer1k: 0.08, outputCostPer1k: 0.4 },
  // Standard
  { id: "gpt-4o", name: "GPT-4o", provider: "OpenAI", tier: "standard", inputCostPer1k: 0.25, outputCostPer1k: 1.0 },
  { id: "o3-mini", name: "o3 Mini", provider: "OpenAI", tier: "standard", inputCostPer1k: 0.11, outputCostPer1k: 0.44 },
  { id: "gemini-2.0-pro", name: "Gemini 2.0 Pro", provider: "Google", tier: "standard", inputCostPer1k: 0.125, outputCostPer1k: 0.5 },
  // Premium
  { id: "gpt-4.1", name: "GPT-4.1", provider: "OpenAI", tier: "premium", inputCostPer1k: 0.2, outputCostPer1k: 0.8 },
  { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", provider: "Google", tier: "premium", inputCostPer1k: 0.125, outputCostPer1k: 0.5 },
  { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4", provider: "Anthropic", tier: "premium", inputCostPer1k: 0.3, outputCostPer1k: 1.5 },
  { id: "claude-opus-4-20250514", name: "Claude Opus 4", provider: "Anthropic", tier: "premium", inputCostPer1k: 1.5, outputCostPer1k: 7.5 },
];

/** Model IDs allowed for initial site generation (premium tier only) */
export const GENERATION_MODEL_IDS = new Set(
  MODELS.filter((m) => m.tier === "premium").map((m) => m.id)
);

export const IMAGE_MODELS: ImageModelOption[] = [
  // Budget
  { id: "gemini-2.5-flash-image", name: "Gemini 2.5 Flash", provider: "Google", costPerImage: "$0.03" },
  { id: "gpt-image-1-mini", name: "GPT Image 1 Mini", provider: "OpenAI", costPerImage: "$0.03" },
  { id: "grok-imagine-image", name: "Grok Imagine", provider: "xAI", costPerImage: "$0.06" },
  // Standard
  { id: "imagen-4.0-generate-001", name: "Imagen 4.0", provider: "Google", costPerImage: "$0.12" },
  { id: "gpt-image-1", name: "GPT Image 1", provider: "OpenAI", costPerImage: "$0.12" },
  { id: "grok-imagine-image-pro", name: "Grok Imagine Pro", provider: "xAI", costPerImage: "$0.21" },
];
