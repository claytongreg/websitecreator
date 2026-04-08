"use client";

import { SectionWrapper, ColorInput, CSSValueInput, PropertyRow } from "./shared";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BorderSectionProps {
  computedStyle: Record<string, string>;
  onStyleChange: (styles: Record<string, string>) => void;
  onCommit: () => void;
  onStart: () => void;
}

const BORDER_STYLES = [
  { value: "none", label: "None" },
  { value: "solid", label: "Solid" },
  { value: "dashed", label: "Dashed" },
  { value: "dotted", label: "Dotted" },
  { value: "double", label: "Double" },
];

export function BorderSection({
  computedStyle,
  onStyleChange,
  onCommit,
  onStart,
}: BorderSectionProps) {
  return (
    <SectionWrapper title="Border" defaultOpen={false}>
      <CSSValueInput
        label="Width"
        value={computedStyle.borderTopWidth ?? "0px"}
        onChange={(v) => onStyleChange({ borderWidth: v })}
        onCommit={onCommit}
        onStart={onStart}
      />
      <ColorInput
        label="Color"
        value={computedStyle.borderColor ?? ""}
        onChange={(hex) => onStyleChange({ borderColor: hex })}
        onCommit={onCommit}
        onStart={onStart}
      />
      <PropertyRow label="Style">
        <Select
          value={computedStyle.borderStyle || "none"}
          onValueChange={(v) => {
            if (!v) return;
            onStart();
            onStyleChange({ borderStyle: v });
            onCommit();
          }}
        >
          <SelectTrigger className="h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BORDER_STYLES.map((s) => (
              <SelectItem key={s.value} value={s.value} className="text-xs">
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </PropertyRow>
      <CSSValueInput
        label="Radius"
        value={computedStyle.borderRadius ?? "0px"}
        onChange={(v) => onStyleChange({ borderRadius: v })}
        onCommit={onCommit}
        onStart={onStart}
      />
    </SectionWrapper>
  );
}
