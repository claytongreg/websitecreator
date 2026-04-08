"use client";

import { SectionWrapper, CSSValueInput, PropertyRow } from "./shared";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface EffectsSectionProps {
  computedStyle: Record<string, string>;
  onStyleChange: (styles: Record<string, string>) => void;
  onCommit: () => void;
  onStart: () => void;
}

export function EffectsSection({
  computedStyle,
  onStyleChange,
  onCommit,
  onStart,
}: EffectsSectionProps) {
  const opacity = computedStyle.opacity ?? "1";

  return (
    <SectionWrapper title="Effects" defaultOpen={false}>
      <div className="flex items-center gap-2">
        <Label className="text-xs w-20 shrink-0">Opacity</Label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={opacity}
          onInput={(e) => {
            onStart();
            onStyleChange({ opacity: (e.target as HTMLInputElement).value });
          }}
          onMouseUp={onCommit}
          className="flex-1 h-1.5 accent-primary"
        />
        <Input
          value={opacity}
          onChange={(e) => {
            onStart();
            onStyleChange({ opacity: e.target.value });
          }}
          onBlur={onCommit}
          className="h-7 w-14 text-xs font-mono text-center"
        />
      </div>
      <PropertyRow label="Shadow">
        <Input
          value={computedStyle.boxShadow === "none" ? "" : (computedStyle.boxShadow ?? "")}
          placeholder="none"
          onChange={(e) => {
            onStart();
            onStyleChange({ boxShadow: e.target.value || "none" });
          }}
          onBlur={onCommit}
          className="h-7 text-xs font-mono"
        />
      </PropertyRow>
    </SectionWrapper>
  );
}
