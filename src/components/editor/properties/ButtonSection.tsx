"use client";

import { SectionWrapper, ColorInput, CSSValueInput, PropertyRow } from "./shared";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ButtonSectionProps {
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

const WEIGHT_OPTIONS = [
  { value: "100", label: "Thin" },
  { value: "200", label: "Extra Light" },
  { value: "300", label: "Light" },
  { value: "400", label: "Normal" },
  { value: "500", label: "Medium" },
  { value: "600", label: "Semi Bold" },
  { value: "700", label: "Bold" },
  { value: "800", label: "Extra Bold" },
  { value: "900", label: "Black" },
];

export function ButtonSection({
  computedStyle,
  onStyleChange,
  onCommit,
  onStart,
}: ButtonSectionProps) {
  return (
    <SectionWrapper title="Button" defaultOpen={true}>
      <ColorInput
        label="Background"
        value={computedStyle.backgroundColor ?? ""}
        onChange={(hex) => onStyleChange({ backgroundColor: hex })}
        onCommit={onCommit}
        onStart={onStart}
      />
      <ColorInput
        label="Text Color"
        value={computedStyle.color ?? ""}
        onChange={(hex) => onStyleChange({ color: hex })}
        onCommit={onCommit}
        onStart={onStart}
      />
      <CSSValueInput
        label="Radius"
        value={computedStyle.borderRadius ?? "0px"}
        onChange={(v) => onStyleChange({ borderRadius: v })}
        onCommit={onCommit}
        onStart={onStart}
      />
      <CSSValueInput
        label="Border W."
        value={computedStyle.borderTopWidth ?? "0px"}
        onChange={(v) => onStyleChange({ borderWidth: v })}
        onCommit={onCommit}
        onStart={onStart}
      />
      <ColorInput
        label="Border Color"
        value={computedStyle.borderColor ?? ""}
        onChange={(hex) => onStyleChange({ borderColor: hex })}
        onCommit={onCommit}
        onStart={onStart}
      />
      <PropertyRow label="Border Style">
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
        label="Padding H"
        value={computedStyle.paddingLeft ?? "0px"}
        onChange={(v) => onStyleChange({ paddingLeft: v, paddingRight: v })}
        onCommit={onCommit}
        onStart={onStart}
      />
      <CSSValueInput
        label="Padding V"
        value={computedStyle.paddingTop ?? "0px"}
        onChange={(v) => onStyleChange({ paddingTop: v, paddingBottom: v })}
        onCommit={onCommit}
        onStart={onStart}
      />
      <CSSValueInput
        label="Font Size"
        value={computedStyle.fontSize ?? "16px"}
        onChange={(v) => onStyleChange({ fontSize: v })}
        onCommit={onCommit}
        onStart={onStart}
      />
      <PropertyRow label="Weight">
        <Select
          value={computedStyle.fontWeight || "400"}
          onValueChange={(v) => {
            if (!v) return;
            onStart();
            onStyleChange({ fontWeight: v });
            onCommit();
          }}
        >
          <SelectTrigger className="h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {WEIGHT_OPTIONS.map((w) => (
              <SelectItem key={w.value} value={w.value} className="text-xs">
                {w.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </PropertyRow>
      <div className="flex items-center gap-2">
        <Label className="text-xs w-20 shrink-0">Shadow</Label>
        <Input
          value={computedStyle.boxShadow === "none" ? "" : (computedStyle.boxShadow ?? "")}
          placeholder="none"
          onChange={(e) => {
            onStart();
            onStyleChange({ boxShadow: e.target.value || "none" });
          }}
          onBlur={onCommit}
          className="h-7 text-xs font-mono flex-1"
        />
      </div>
    </SectionWrapper>
  );
}
