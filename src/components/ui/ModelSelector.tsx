"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MODELS,
  IMAGE_MODELS,
  MARKUP_MULTIPLIER,
  INPUT_TOKENS_PER_PAGE,
  OUTPUT_TOKENS_PER_PAGE,
  INPUT_TOKENS_PER_EDIT,
  OUTPUT_TOKENS_PER_EDIT,
} from "@/lib/models";
import type { ModelOption } from "@/lib/models";

export type { ModelOption, ImageModelOption } from "@/lib/models";
export { MODELS, GENERATION_MODEL_IDS, IMAGE_MODELS } from "@/lib/models";

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
  /** Restrict which tiers are shown (e.g. ["premium"] for site generation) */
  allowedTiers?: ModelOption["tier"][];
  className?: string;
}

/** Format cost in cents as a dollar string, or "Free" if zero */
function formatCost(cents: number, suffix?: string): string {
  if (cents === 0) return "Free";
  return `~$${(cents / 100).toFixed(3)}${suffix ?? ""}`;
}

export function ModelSelector({ value, onChange, pageCount, allowedTiers, className }: ModelSelectorProps) {
  const visibleModels = allowedTiers
    ? MODELS.filter((m) => allowedTiers.includes(m.tier))
    : MODELS;
  const selected = visibleModels.find((m) => m.id === value);

  // When pageCount is provided (onboarding), show total cost for all pages
  // Otherwise (editor), show per-edit cost with "/edit" suffix
  const costLabel = selected
    ? pageCount != null
      ? formatCost(costPerPage(selected) * pageCount)
      : formatCost(costPerEdit(selected), "/edit")
    : "";

  const visibleTiers = allowedTiers ?? TIERS;

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
          {visibleTiers.map((tier) => {
            const tierModels = visibleModels.filter((m) => m.tier === tier);
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
