"use client";

import { useState, useEffect, useRef } from "react";
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

  // Local state for shadow input so typing isn't clobbered by re-renders
  const externalShadow = computedStyle.boxShadow === "none" ? "" : (computedStyle.boxShadow ?? "");
  const [shadowLocal, setShadowLocal] = useState(externalShadow);
  const isFocusedRef = useRef(false);

  // Sync from computed style when not actively editing
  useEffect(() => {
    if (!isFocusedRef.current) {
      setShadowLocal(externalShadow);
    }
  }, [externalShadow]);

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
          value={shadowLocal}
          placeholder="none"
          onFocus={() => { isFocusedRef.current = true; }}
          onChange={(e) => {
            const val = e.target.value;
            setShadowLocal(val);
            onStart();
            onStyleChange({ boxShadow: val || "none" });
          }}
          onBlur={() => {
            isFocusedRef.current = false;
            onCommit();
          }}
          className="h-7 text-xs font-mono"
        />
      </PropertyRow>
    </SectionWrapper>
  );
}
