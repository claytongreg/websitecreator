"use client";

import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEditorStore } from "@/lib/editor/store";
import { FONT_OPTIONS } from "@/lib/editor/theme-css";
import { rgbToHex } from "./properties/shared";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Minus,
  Plus,
} from "lucide-react";

interface TextToolboxProps {
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  position: { top: number; left: number };
}

const FONT_SIZES = [
  "10px","12px","14px","16px","18px","20px","24px","28px","32px","36px","40px","48px","56px","64px","72px","96px",
];

const TRANSFORM_OPTIONS = [
  { value: "none", label: "Aa" },
  { value: "uppercase", label: "AA" },
  { value: "lowercase", label: "aa" },
  { value: "capitalize", label: "Ab" },
];

export function TextToolbox({ iframeRef, position }: TextToolboxProps) {
  const selectedElement = useEditorStore((s) => s.selectedElement);
  const beginStyleChange = useEditorStore((s) => s.beginStyleChange);

  const sendStyle = useCallback(
    (styles: Record<string, string>) => {
      iframeRef.current?.contentWindow?.postMessage(
        { type: "wc_set_style", styles },
        "*"
      );
    },
    [iframeRef]
  );

  const commit = useCallback(() => {
    iframeRef.current?.contentWindow?.postMessage(
      { type: "wc_commit_style" },
      "*"
    );
  }, [iframeRef]);

  const applyStyle = useCallback(
    (styles: Record<string, string>) => {
      beginStyleChange();
      sendStyle(styles);
      commit();
    },
    [beginStyleChange, sendStyle, commit]
  );

  if (!selectedElement) return null;

  const cs = selectedElement.computedStyle;
  const isBold = parseInt(cs.fontWeight ?? "400") >= 700;
  const isItalic = cs.fontStyle === "italic";
  const isUnderline = (cs.textDecorationLine ?? cs.textDecoration ?? "").includes("underline");
  const isStrike = (cs.textDecorationLine ?? cs.textDecoration ?? "").includes("line-through");
  const currentAlign = cs.textAlign ?? "left";
  const currentTransform = cs.textTransform ?? "none";
  const currentSize = cs.fontSize ?? "16px";
  const currentColor = cs.color ?? "#000000";

  // Extract font family - strip fallbacks and quotes
  const rawFont = cs.fontFamily ?? "Inter";
  const currentFont = rawFont.split(",")[0].replace(/['"]/g, "").trim();

  const stepSize = (dir: number) => {
    const num = parseFloat(currentSize);
    if (isNaN(num)) return;
    const newSize = Math.max(1, num + dir);
    applyStyle({ fontSize: `${newSize}px` });
  };

  const toggleBtn = (
    active: boolean,
    icon: React.ReactNode,
    onToggle: () => void,
    title: string
  ) => (
    <Button
      variant={active ? "secondary" : "ghost"}
      size="sm"
      className="h-7 w-7 p-0"
      title={title}
      onClick={onToggle}
    >
      {icon}
    </Button>
  );

  return (
    <div
      className="fixed z-50 bg-white rounded-lg shadow-xl border p-2 space-y-2"
      style={{ top: position.top + 44, left: position.left, minWidth: 380 }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Row 1: Bold/Italic/Underline/Strike + Font family + Font size */}
      <div className="flex items-center gap-1.5">
        <div className="flex gap-0.5">
          {toggleBtn(isBold, <Bold className="w-3.5 h-3.5" />, () =>
            applyStyle({ fontWeight: isBold ? "400" : "700" }), "Bold"
          )}
          {toggleBtn(isItalic, <Italic className="w-3.5 h-3.5" />, () =>
            applyStyle({ fontStyle: isItalic ? "normal" : "italic" }), "Italic"
          )}
          {toggleBtn(isUnderline, <Underline className="w-3.5 h-3.5" />, () =>
            applyStyle({ textDecorationLine: isUnderline ? "none" : "underline" }), "Underline"
          )}
          {toggleBtn(isStrike, <Strikethrough className="w-3.5 h-3.5" />, () =>
            applyStyle({ textDecorationLine: isStrike ? "none" : "line-through" }), "Strikethrough"
          )}
        </div>

        <div className="w-px h-5 bg-border" />

        {/* Font family */}
        <Select
          value={currentFont}
          onValueChange={(v) => applyStyle({ fontFamily: `'${v}', sans-serif` })}
        >
          <SelectTrigger className="h-7 text-xs w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FONT_OPTIONS.map((font) => (
              <SelectItem key={font} value={font} className="text-xs">
                <span style={{ fontFamily: `'${font}', sans-serif` }}>{font}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="w-px h-5 bg-border" />

        {/* Font size stepper */}
        <div className="flex items-center gap-0.5">
          <button
            className="h-7 w-5 flex items-center justify-center text-muted-foreground hover:text-foreground"
            onClick={() => stepSize(-1)}
          >
            <Minus className="w-3 h-3" />
          </button>
          <Select
            value={currentSize}
            onValueChange={(v) => v && applyStyle({ fontSize: v })}
          >
            <SelectTrigger className="h-7 text-xs w-[68px] font-mono">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FONT_SIZES.map((s) => (
                <SelectItem key={s} value={s} className="text-xs font-mono">
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button
            className="h-7 w-5 flex items-center justify-center text-muted-foreground hover:text-foreground"
            onClick={() => stepSize(1)}
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Row 2: Color + Alignment + Transform */}
      <div className="flex items-center gap-1.5">
        {/* Text color */}
        <div className="flex items-center gap-1">
          <input
            type="color"
            value={rgbToHex(currentColor) || "#000000"}
            onChange={(e) => applyStyle({ color: e.target.value })}
            className="w-7 h-7 rounded border border-border cursor-pointer p-0.5"
            title="Text color"
          />
          <Input
            value={rgbToHex(currentColor) || ""}
            placeholder="#000"
            onChange={(e) => {
              if (/^#[0-9a-f]{3,8}$/i.test(e.target.value)) {
                applyStyle({ color: e.target.value });
              }
            }}
            className="h-7 w-[72px] text-xs font-mono"
          />
        </div>

        <div className="w-px h-5 bg-border" />

        {/* Alignment */}
        <div className="flex gap-0.5">
          {(
            [
              { value: "left", icon: AlignLeft },
              { value: "center", icon: AlignCenter },
              { value: "right", icon: AlignRight },
              { value: "justify", icon: AlignJustify },
            ] as const
          ).map(({ value, icon: Icon }) => (
            <Button
              key={value}
              variant={currentAlign === value ? "secondary" : "ghost"}
              size="sm"
              className="h-7 w-7 p-0"
              title={`Align ${value}`}
              onClick={() => applyStyle({ textAlign: value })}
            >
              <Icon className="w-3.5 h-3.5" />
            </Button>
          ))}
        </div>

        <div className="w-px h-5 bg-border" />

        {/* Text transform */}
        <div className="flex gap-0.5">
          {TRANSFORM_OPTIONS.map(({ value, label }) => (
            <Button
              key={value}
              variant={currentTransform === value ? "secondary" : "ghost"}
              size="sm"
              className="h-7 px-1.5 text-xs font-mono"
              title={`Text transform: ${value}`}
              onClick={() => applyStyle({ textTransform: value })}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* Row 3: Line height + Letter spacing + Text shadow */}
      <div className="flex items-center gap-1.5">
        <label className="text-[10px] text-muted-foreground shrink-0">Line H</label>
        <Input
          value={cs.lineHeight ?? ""}
          placeholder="normal"
          onChange={(e) => applyStyle({ lineHeight: e.target.value || "normal" })}
          className="h-7 w-[60px] text-xs font-mono"
        />

        <label className="text-[10px] text-muted-foreground shrink-0">Spacing</label>
        <Input
          value={cs.letterSpacing === "normal" ? "" : (cs.letterSpacing ?? "")}
          placeholder="0px"
          onChange={(e) => applyStyle({ letterSpacing: e.target.value || "normal" })}
          className="h-7 w-[60px] text-xs font-mono"
        />

        <label className="text-[10px] text-muted-foreground shrink-0">Shadow</label>
        <Input
          value={cs.textShadow === "none" ? "" : (cs.textShadow ?? "")}
          placeholder="none"
          onChange={(e) => applyStyle({ textShadow: e.target.value || "none" })}
          className="h-7 flex-1 text-xs font-mono"
        />
      </div>
    </div>
  );
}
