"use client";

import { SectionWrapper, ColorInput, PropertyRow } from "./shared";
import { Input } from "@/components/ui/input";

interface BackgroundSectionProps {
  computedStyle: Record<string, string>;
  onStyleChange: (styles: Record<string, string>) => void;
  onCommit: () => void;
  onStart: () => void;
}

export function BackgroundSection({
  computedStyle,
  onStyleChange,
  onCommit,
  onStart,
}: BackgroundSectionProps) {
  const bgImage = computedStyle.backgroundImage ?? "none";
  // Extract URL from url("...") pattern
  const urlMatch = bgImage.match(/url\(["']?([^"')]+)["']?\)/);
  const imageUrl = urlMatch ? urlMatch[1] : "";

  return (
    <SectionWrapper title="Background">
      <ColorInput
        label="Color"
        value={computedStyle.backgroundColor ?? ""}
        onChange={(hex) => onStyleChange({ backgroundColor: hex })}
        onCommit={onCommit}
        onStart={onStart}
      />
      <PropertyRow label="Image">
        <Input
          value={imageUrl}
          placeholder="Image URL..."
          onChange={(e) => {
            onStart();
            const val = e.target.value;
            onStyleChange({
              backgroundImage: val ? `url("${val}")` : "",
              backgroundSize: val ? "cover" : "",
              backgroundPosition: val ? "center" : "",
            });
          }}
          onBlur={onCommit}
          className="h-7 text-xs font-mono"
        />
      </PropertyRow>
    </SectionWrapper>
  );
}
