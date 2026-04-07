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
  costPer: string;
}

export const MODELS: ModelOption[] = [
  // Free
  { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B", provider: "Groq", tier: "free", costPer: "Free" },
  { id: "qwen-qwq-32b", name: "Qwen QwQ 32B", provider: "Groq", tier: "free", costPer: "Free" },
  { id: "gemma2-9b-it", name: "Gemma 2 9B", provider: "Groq", tier: "free", costPer: "Free" },
  { id: "mistral-small-latest", name: "Mistral Small", provider: "Mistral", tier: "free", costPer: "Free" },
  { id: "codestral-latest", name: "Codestral", provider: "Mistral", tier: "free", costPer: "Free" },
  // Budget
  { id: "gpt-4o-mini", name: "GPT-4o Mini", provider: "OpenAI", tier: "budget", costPer: "$0.003" },
  { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", provider: "Google", tier: "budget", costPer: "$0.003" },
  { id: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5", provider: "Anthropic", tier: "budget", costPer: "$0.006" },
  // Standard
  { id: "gpt-4o", name: "GPT-4o", provider: "OpenAI", tier: "standard", costPer: "$0.015" },
  { id: "gemini-2.0-pro", name: "Gemini 2.0 Pro", provider: "Google", tier: "standard", costPer: "$0.012" },
  // Premium
  { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4", provider: "Anthropic", tier: "premium", costPer: "$0.024" },
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

/** Parse the numeric cost from a costPer string like "$0.003" */
function parseCost(costPer: string): number {
  if (costPer === "Free") return 0;
  return parseFloat(costPer.replace("$", "")) || 0;
}

export function ModelSelector({ value, onChange, pageCount, className }: ModelSelectorProps) {
  const selected = MODELS.find((m) => m.id === value);

  const costLabel = selected
    ? pageCount != null
      ? selected.costPer === "Free"
        ? "Free"
        : `~$${(parseCost(selected.costPer) * pageCount).toFixed(3)}`
      : selected.costPer
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
                          ? m.costPer === "Free"
                            ? "Free"
                            : `~$${(parseCost(m.costPer) * pageCount).toFixed(3)}`
                          : `${m.costPer}/edit`}
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
