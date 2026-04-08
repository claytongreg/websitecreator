"use client";

import { useEffect } from "react";
import {
  SectionWrapper,
  ColorInput,
  CSSValueInput,
  PropertyRow,
} from "./shared";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
} from "lucide-react";
import { FONT_OPTIONS } from "@/lib/editor/theme-css";

const PREVIEW_FONTS_URL = `https://fonts.googleapis.com/css2?${FONT_OPTIONS.map(
  (f) => `family=${f.replace(/ /g, "+")}`
).join("&")}&display=swap`;

interface TypographySectionProps {
  computedStyle: Record<string, string>;
  onStyleChange: (styles: Record<string, string>) => void;
  onCommit: () => void;
  onStart: () => void;
}

const WEIGHT_OPTIONS = [
  { value: "300", label: "Light" },
  { value: "400", label: "Regular" },
  { value: "500", label: "Medium" },
  { value: "600", label: "Semibold" },
  { value: "700", label: "Bold" },
  { value: "800", label: "ExtraBold" },
  { value: "900", label: "Black" },
];

const TRANSFORM_OPTIONS = [
  { value: "none", label: "None" },
  { value: "uppercase", label: "UPPERCASE" },
  { value: "lowercase", label: "lowercase" },
  { value: "capitalize", label: "Capitalize" },
];

const ALIGN_OPTIONS = [
  { value: "left", icon: AlignLeft },
  { value: "center", icon: AlignCenter },
  { value: "right", icon: AlignRight },
  { value: "justify", icon: AlignJustify },
];

export function TypographySection({
  computedStyle,
  onStyleChange,
  onCommit,
  onStart,
}: TypographySectionProps) {
  const currentAlign = computedStyle.textAlign ?? "left";
  const rawFont = computedStyle.fontFamily ?? "";
  const currentFont =
    rawFont.split(",")[0]?.replace(/['"]/g, "").trim() || "Inter";

  useEffect(() => {
    const id = "wc-preview-fonts";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = PREVIEW_FONTS_URL;
    document.head.appendChild(link);
  }, []);

  return (
    <SectionWrapper title="Typography">
      <PropertyRow label="Font">
        <Select
          value={currentFont}
          onValueChange={(v) => {
            if (!v) return;
            onStart();
            onStyleChange({ fontFamily: `'${v}', sans-serif` });
            onCommit();
          }}
        >
          <SelectTrigger className="h-7 text-xs">
            <SelectValue>
              <span style={{ fontFamily: `'${currentFont}', sans-serif` }}>
                {currentFont}
              </span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {FONT_OPTIONS.map((font) => (
              <SelectItem key={font} value={font} className="text-xs">
                <span style={{ fontFamily: `'${font}', sans-serif` }}>
                  {font}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </PropertyRow>
      <CSSValueInput
        label="Font Size"
        value={computedStyle.fontSize ?? ""}
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
      <ColorInput
        label="Color"
        value={computedStyle.color ?? ""}
        onChange={(hex) => onStyleChange({ color: hex })}
        onCommit={onCommit}
        onStart={onStart}
      />
      <CSSValueInput
        label="Line Height"
        value={computedStyle.lineHeight ?? ""}
        onChange={(v) => onStyleChange({ lineHeight: v })}
        onCommit={onCommit}
        onStart={onStart}
      />
      <CSSValueInput
        label="Spacing"
        value={computedStyle.letterSpacing ?? ""}
        onChange={(v) => onStyleChange({ letterSpacing: v })}
        onCommit={onCommit}
        onStart={onStart}
        placeholder="normal"
      />
      <PropertyRow label="Align">
        <div className="flex gap-0.5">
          {ALIGN_OPTIONS.map(({ value, icon: Icon }) => (
            <Button
              key={value}
              variant={currentAlign === value ? "secondary" : "ghost"}
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => {
                onStart();
                onStyleChange({ textAlign: value });
                onCommit();
              }}
            >
              <Icon className="w-3.5 h-3.5" />
            </Button>
          ))}
        </div>
      </PropertyRow>
      <PropertyRow label="Transform">
        <Select
          value={computedStyle.textTransform || "none"}
          onValueChange={(v) => {
            if (!v) return;
            onStart();
            onStyleChange({ textTransform: v });
            onCommit();
          }}
        >
          <SelectTrigger className="h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TRANSFORM_OPTIONS.map((t) => (
              <SelectItem key={t.value} value={t.value} className="text-xs">
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </PropertyRow>
    </SectionWrapper>
  );
}
