"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
const MARKUP_MULTIPLIER = 3;
// Rough token estimates per page for site generation — must match /api/sites
const INPUT_TOKENS_PER_PAGE = 800;
const OUTPUT_TOKENS_PER_PAGE = 2000;
// Rough token estimates for a single AI edit (system prompt + full page HTML in, full HTML out)
const INPUT_TOKENS_PER_EDIT = 4000;
const OUTPUT_TOKENS_PER_EDIT = 3000;

/** Compute cost in cents for a single operation with this model (after markup) */
function costForTokens(m: ModelOption, inputTokens: number, outputTokens: number): number {
  return (
    ((inputTokens / 1000) * m.inputCostPer1k +
      (outputTokens / 1000) * m.outputCostPer1k) *
    MARKUP_MULTIPLIER
  );
}

/** Cost in cents for generating one page during site creation */
function costPerPage(m: ModelOption): number {
  return costForTokens(m, INPUT_TOKENS_PER_PAGE, OUTPUT_TOKENS_PER_PAGE);
}

/** Cost in cents for a single AI edit in the editor */
function costPerEdit(m: ModelOption): number {
  return costForTokens(m, INPUT_TOKENS_PER_EDIT, OUTPUT_TOKENS_PER_EDIT);
}

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

const TIER_LABELS: Record<string, string> = {
  free: "Free",
  budget: "Budget",
  standard: "Standard",
  premium: "Premium",
};

const TIERS = ["free", "budget", "standard", "premium"];

interface ModelSelectorProps {
  value: string;
  onChange: (modelId: string) => void;
  /** When provided, shows total estimated cost for generating N pages */
  pageCount?: number;
  className?: string;
}

/** Format cost in cents as a dollar string, or "Free" if zero */
function formatCost(cents: number, suffix?: string): string {
  if (cents === 0) return "Free";
  return `~$${(cents / 100).toFixed(3)}${suffix ?? ""}`;
}

export function ModelSelector({ value, onChange, pageCount, className }: ModelSelectorProps) {
  const selected = MODELS.find((m) => m.id === value);

  // When pageCount is provided (onboarding), show total cost for all pages
  // Otherwise (editor), show per-edit cost with "/edit" suffix
  const costLabel = selected
    ? pageCount != null
      ? formatCost(costPerPage(selected) * pageCount)
      : formatCost(costPerEdit(selected), "/edit")
    : "";

  return (
    <div className={className}>
      <Select value={value} onValueChange={(v) => v && onChange(v)}>
        <SelectTrigger className="w-56">
          <SelectValue>
            {selected && (
              <span className="flex items-center gap-2">
                <span className="truncate">{selected.name}</span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {costLabel}
                </span>
              </span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="w-72">
          {TIERS.map((tier) => {
            const tierModels = MODELS.filter((m) => m.tier === tier);
            if (tierModels.length === 0) return null;
            return (
              <div key={tier}>
                <div className="px-2 py-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  {TIER_LABELS[tier]}
                </div>
                {tierModels.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    <div className="flex items-center justify-between w-full gap-3">
                      <div className="flex flex-col">
                        <span className="text-sm">{m.name}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {m.provider}
                        </span>
                      </div>
                      <span className="text-xs font-mono text-muted-foreground shrink-0">
                        {pageCount != null
                          ? formatCost(costPerPage(m) * pageCount)
                          : formatCost(costPerEdit(m), "/edit")}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </div>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}

// --- Image Model Selector ---

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

interface ImageModelSelectorProps {
  value: string;
  onChange: (modelId: string) => void;
  className?: string;
}

export function ImageModelSelector({ value, onChange, className }: ImageModelSelectorProps) {
  const selected = IMAGE_MODELS.find((m) => m.id === value);

  return (
    <div className={className}>
      <Select value={value} onValueChange={(v) => v && onChange(v)}>
        <SelectTrigger className="w-64">
          <SelectValue>
            {selected && (
              <span className="flex items-center gap-2">
                <span className="truncate">{selected.name}</span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {selected.costPerImage}/image
                </span>
              </span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="w-72">
          <div className="px-2 py-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Budget
          </div>
          {IMAGE_MODELS.slice(0, 3).map((m) => (
            <SelectItem key={m.id} value={m.id}>
              <div className="flex items-center justify-between w-full gap-3">
                <div className="flex flex-col">
                  <span className="text-sm">{m.name}</span>
                  <span className="text-[10px] text-muted-foreground">{m.provider}</span>
                </div>
                <span className="text-xs font-mono text-muted-foreground shrink-0">
                  {m.costPerImage}/image
                </span>
              </div>
            </SelectItem>
          ))}
          <div className="px-2 py-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Standard
          </div>
          {IMAGE_MODELS.slice(3).map((m) => (
            <SelectItem key={m.id} value={m.id}>
              <div className="flex items-center justify-between w-full gap-3">
                <div className="flex flex-col">
                  <span className="text-sm">{m.name}</span>
                  <span className="text-[10px] text-muted-foreground">{m.provider}</span>
                </div>
                <span className="text-xs font-mono text-muted-foreground shrink-0">
                  {m.costPerImage}/image
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
