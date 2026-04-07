"use client";

import { useEditorStore } from "@/lib/editor/store";
import {
  FONT_OPTIONS,
  FONT_WEIGHT_OPTIONS,
} from "@/lib/editor/theme-css";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

type HeadingLevel = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

const HEADING_LEVELS: HeadingLevel[] = ["h1", "h2", "h3", "h4", "h5", "h6"];

function FontSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (font: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={(v) => v && onChange(v)}>
        <SelectTrigger className="w-full">
          <SelectValue>
            <span style={{ fontFamily: `'${value}', sans-serif` }}>{value}</span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-64">
          {FONT_OPTIONS.map((font) => (
            <SelectItem key={font} value={font}>
              <span style={{ fontFamily: `'${font}', sans-serif` }}>{font}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function HeadingRow({ level }: { level: HeadingLevel }) {
  const theme = useEditorStore((s) => s.theme);
  const setHeadingStyle = useEditorStore((s) => s.setHeadingStyle);
  const style = theme.headingSizes[level];

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold uppercase tracking-wide">
        {level.toUpperCase()}
      </Label>
      <div className="grid grid-cols-3 gap-1.5">
        <div>
          <span className="text-[10px] text-muted-foreground">Size</span>
          <Input
            value={style.size}
            onChange={(e) => setHeadingStyle(level, { size: e.target.value })}
            className="text-xs h-7"
          />
        </div>
        <div>
          <span className="text-[10px] text-muted-foreground">Weight</span>
          <Select
            value={style.weight}
            onValueChange={(v) => v && setHeadingStyle(level, { weight: v })}
          >
            <SelectTrigger className="w-full h-7 text-xs">
              <SelectValue>
                {FONT_WEIGHT_OPTIONS.find((o) => o.value === style.weight)
                  ?.label ?? style.weight}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {FONT_WEIGHT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <span className="text-[10px] text-muted-foreground">Line H.</span>
          <Input
            value={style.lineHeight}
            onChange={(e) =>
              setHeadingStyle(level, { lineHeight: e.target.value })
            }
            className="text-xs h-7"
          />
        </div>
      </div>
    </div>
  );
}

export function ThemePanel() {
  const theme = useEditorStore((s) => s.theme);
  const setThemeFont = useEditorStore((s) => s.setThemeFont);
  const setBaseFontSize = useEditorStore((s) => s.setBaseFontSize);
  const setShowThemePanel = useEditorStore((s) => s.setShowThemePanel);

  return (
    <div className="w-72 border-l flex flex-col h-full bg-background">
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <span className="text-sm font-medium">Theme</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={() => setShowThemePanel(false)}
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-5">
        {/* Fonts */}
        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Fonts
          </h3>
          <FontSelect
            label="Heading Font"
            value={theme.fonts.heading}
            onChange={(f) => setThemeFont("heading", f)}
          />
          <FontSelect
            label="Body Font"
            value={theme.fonts.body}
            onChange={(f) => setThemeFont("body", f)}
          />
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Base Font Size
            </Label>
            <Input
              value={theme.baseFontSize}
              onChange={(e) => setBaseFontSize(e.target.value)}
              className="w-24"
            />
          </div>
        </section>

        {/* Heading Sizes */}
        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Heading Sizes
          </h3>
          {HEADING_LEVELS.map((level) => (
            <HeadingRow key={level} level={level} />
          ))}
        </section>
      </div>
    </div>
  );
}
