"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight, Minus, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// --- Utilities ---

export function rgbToHex(rgb: string): string {
  if (!rgb || rgb === "transparent" || rgb === "rgba(0, 0, 0, 0)") return "";
  if (rgb.startsWith("#")) return rgb;
  const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return "";
  const r = parseInt(match[1]);
  const g = parseInt(match[2]);
  const b = parseInt(match[3]);
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
}

/** Parse any CSS color string into {hex, alpha} */
export function parseColor(raw: string): { hex: string; alpha: number } {
  if (!raw || raw === "transparent" || raw === "rgba(0, 0, 0, 0)")
    return { hex: "", alpha: 1 };
  if (raw.startsWith("#")) {
    // Handle 8-char hex (#rrggbbaa)
    if (raw.length === 9) {
      const a = parseInt(raw.slice(7, 9), 16) / 255;
      return { hex: raw.slice(0, 7), alpha: Math.round(a * 100) / 100 };
    }
    return { hex: raw, alpha: 1 };
  }
  const match = raw.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (!match) return { hex: "", alpha: 1 };
  const r = parseInt(match[1]);
  const g = parseInt(match[2]);
  const b = parseInt(match[3]);
  const a = match[4] !== undefined ? parseFloat(match[4]) : 1;
  const hex =
    "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
  return { hex, alpha: Math.round(a * 100) / 100 };
}

/** Convert hex + alpha to rgba() string */
export function hexAlphaToRgba(hex: string, alpha: number): string {
  if (!hex) return "";
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  if (alpha >= 1) return `rgb(${r}, ${g}, ${b})`;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Parse a CSS gradient string into its parts */
export function parseGradient(bg: string): {
  type: "linear" | "radial";
  direction: string;
  stops: Array<{ hex: string; alpha: number }>;
} | null {
  // linear-gradient(to bottom, rgba(...), rgba(...))
  const linearMatch = bg.match(
    /linear-gradient\(([^,]+),\s*(.+)\)/
  );
  if (linearMatch) {
    const direction = linearMatch[1].trim();
    const stopsRaw = linearMatch[2];
    const stops = stopsRaw.split(/,\s*(?=[#rgba])/).map((s) => parseColor(s.trim()));
    return { type: "linear", direction, stops };
  }
  const radialMatch = bg.match(
    /radial-gradient\(([^,]*),\s*(.+)\)/
  );
  if (radialMatch) {
    const direction = radialMatch[1].trim() || "circle";
    const stopsRaw = radialMatch[2];
    const stops = stopsRaw.split(/,\s*(?=[#rgba])/).map((s) => parseColor(s.trim()));
    return { type: "radial", direction, stops };
  }
  return null;
}

export function parseInlineStyles(cssText: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!cssText) return result;
  cssText.split(";").forEach((decl) => {
    const [prop, ...valParts] = decl.split(":");
    if (prop && valParts.length) {
      const camel = prop
        .trim()
        .replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      result[camel] = valParts.join(":").trim();
    }
  });
  return result;
}

// --- Components ---

interface SectionWrapperProps {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

export function SectionWrapper({
  title,
  defaultOpen = true,
  children,
}: SectionWrapperProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border">
      <button
        className="flex items-center justify-between w-full px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => setOpen(!open)}
      >
        {title}
        {open ? (
          <ChevronDown className="w-3.5 h-3.5" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5" />
        )}
      </button>
      {open && <div className="px-4 pb-3 space-y-2.5">{children}</div>}
    </div>
  );
}

interface ColorInputProps {
  label: string;
  value: string; // computed rgb/hex value
  onChange: (hex: string) => void;
  onCommit: () => void;
  onStart?: () => void;
}

export function ColorInput({
  label,
  value,
  onChange,
  onCommit,
  onStart,
}: ColorInputProps) {
  const hex = rgbToHex(value) || "#000000";
  return (
    <div className="flex items-center gap-2">
      <Label className="text-xs w-20 shrink-0">{label}</Label>
      <input
        type="color"
        value={hex}
        onInput={(e) => {
          onStart?.();
          onChange((e.target as HTMLInputElement).value);
        }}
        onChange={(e) => {
          onChange(e.target.value);
          onCommit();
        }}
        className="w-7 h-7 rounded border border-border cursor-pointer p-0.5"
      />
      <Input
        value={rgbToHex(value) || ""}
        placeholder="none"
        onChange={(e) => {
          onStart?.();
          onChange(e.target.value);
        }}
        onBlur={onCommit}
        className="h-7 text-xs font-mono flex-1"
      />
    </div>
  );
}

interface ColorInputWithAlphaProps {
  label: string;
  value: string; // computed rgb/rgba/hex value
  onChange: (rgba: string) => void;
  onCommit: () => void;
  onStart?: () => void;
}

export function ColorInputWithAlpha({
  label,
  value,
  onChange,
  onCommit,
  onStart,
}: ColorInputWithAlphaProps) {
  const { hex, alpha } = parseColor(value);
  const displayHex = hex || "#000000";
  const pct = Math.round(alpha * 100);

  const emitChange = (h: string, a: number) => {
    onChange(hexAlphaToRgba(h || "#000000", a));
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <Label className="text-xs w-20 shrink-0">{label}</Label>
        <input
          type="color"
          value={displayHex}
          onInput={(e) => {
            onStart?.();
            emitChange((e.target as HTMLInputElement).value, alpha);
          }}
          onChange={(e) => {
            emitChange(e.target.value, alpha);
            onCommit();
          }}
          className="w-7 h-7 rounded border border-border cursor-pointer p-0.5"
        />
        <Input
          value={hex || ""}
          placeholder="none"
          onChange={(e) => {
            onStart?.();
            const v = e.target.value;
            if (v.match(/^#[0-9a-fA-F]{6}$/)) {
              emitChange(v, alpha);
            } else {
              onChange(v);
            }
          }}
          onBlur={onCommit}
          className="h-7 text-xs font-mono flex-1"
        />
      </div>
      {/* Alpha / opacity slider */}
      <div className="flex items-center gap-2">
        <Label className="text-xs w-20 shrink-0">Opacity</Label>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={pct}
          onInput={(e) => {
            onStart?.();
            const a = parseInt((e.target as HTMLInputElement).value) / 100;
            emitChange(displayHex, a);
          }}
          onMouseUp={onCommit}
          onTouchEnd={onCommit}
          className="flex-1 h-1.5 accent-primary"
        />
        <Input
          value={`${pct}%`}
          onChange={(e) => {
            onStart?.();
            const num = parseInt(e.target.value.replace("%", ""));
            if (!isNaN(num)) {
              emitChange(displayHex, Math.min(100, Math.max(0, num)) / 100);
            }
          }}
          onBlur={onCommit}
          className="h-7 w-14 text-xs font-mono text-center"
        />
      </div>
    </div>
  );
}

interface CSSValueInputProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  onCommit: () => void;
  onStart?: () => void;
  placeholder?: string;
}

export function CSSValueInput({
  label,
  value,
  onChange,
  onCommit,
  onStart,
  placeholder,
}: CSSValueInputProps) {
  const step = (dir: number) => {
    onStart?.();
    const num = parseFloat(value);
    if (isNaN(num)) {
      onChange(dir > 0 ? "1px" : "0px");
    } else {
      const unit = value.replace(/[\d.-]+/, "") || "px";
      onChange(`${num + dir}${unit}`);
    }
    onCommit();
  };

  return (
    <div className="flex items-center gap-2">
      <Label className="text-xs w-20 shrink-0">{label}</Label>
      <div className="flex items-center flex-1 gap-0.5">
        <Input
          value={value}
          placeholder={placeholder ?? "auto"}
          onChange={(e) => {
            onStart?.();
            onChange(e.target.value);
          }}
          onBlur={onCommit}
          className="h-7 text-xs font-mono flex-1"
        />
        <div className="flex flex-col">
          <button
            className="h-3.5 px-1 text-muted-foreground hover:text-foreground"
            onClick={() => step(1)}
            tabIndex={-1}
          >
            <Plus className="w-2.5 h-2.5" />
          </button>
          <button
            className="h-3.5 px-1 text-muted-foreground hover:text-foreground"
            onClick={() => step(-1)}
            tabIndex={-1}
          >
            <Minus className="w-2.5 h-2.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

interface PropertyRowProps {
  label: string;
  children: ReactNode;
}

export function PropertyRow({ label, children }: PropertyRowProps) {
  return (
    <div className="flex items-center gap-2">
      <Label className="text-xs w-20 shrink-0">{label}</Label>
      <div className="flex-1">{children}</div>
    </div>
  );
}
