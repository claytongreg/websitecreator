"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import { Upload, X, Link, ChevronDown, ChevronRight } from "lucide-react";
import {
  SectionWrapper,
  ColorInputWithAlpha,
  PropertyRow,
  parseColor,
  parseGradient,
  hexAlphaToRgba,
} from "./shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEditorStore } from "@/lib/editor/store";
import { extractPageImages } from "@/lib/editor/element-utils";

interface BackgroundSectionProps {
  computedStyle: Record<string, string>;
  onStyleChange: (styles: Record<string, string>) => void;
  onCommit: () => void;
  onStart: () => void;
}

const GRADIENT_DIRECTIONS = [
  { value: "to bottom", label: "Top to Bottom" },
  { value: "to right", label: "Left to Right" },
  { value: "to bottom right", label: "Diagonal" },
  { value: "to top", label: "Bottom to Top" },
  { value: "to left", label: "Right to Left" },
] as const;

type BgMode = "solid" | "gradient";

export function BackgroundSection({
  computedStyle,
  onStyleChange,
  onCommit,
  onStart,
}: BackgroundSectionProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const html = useEditorStore((s) => s.html);

  // Detect current mode from computed styles
  const bgImage = computedStyle.backgroundImage ?? "none";
  const hasGradient =
    bgImage.includes("linear-gradient") || bgImage.includes("radial-gradient");

  const [mode, setMode] = useState<BgMode>(hasGradient ? "gradient" : "solid");

  // Gradient state
  const parsed = hasGradient ? parseGradient(bgImage) : null;
  const [gradType, setGradType] = useState<"linear" | "radial">(
    parsed?.type ?? "linear"
  );
  const [gradDirection, setGradDirection] = useState(
    parsed?.direction ?? "to bottom"
  );
  const [gradStart, setGradStart] = useState(
    parsed?.stops[0]
      ? hexAlphaToRgba(parsed.stops[0].hex || "#000000", parsed.stops[0].alpha)
      : "rgb(0, 0, 0)"
  );
  const [gradEnd, setGradEnd] = useState(
    parsed?.stops[1]
      ? hexAlphaToRgba(parsed.stops[1].hex || "#ffffff", parsed.stops[1].alpha)
      : "rgba(0, 0, 0, 0)"
  );

  // Sync gradient state when computed style changes externally
  useEffect(() => {
    if (hasGradient && parsed) {
      setMode("gradient");
      setGradType(parsed.type);
      setGradDirection(parsed.direction);
      if (parsed.stops[0]) {
        setGradStart(
          hexAlphaToRgba(
            parsed.stops[0].hex || "#000000",
            parsed.stops[0].alpha
          )
        );
      }
      if (parsed.stops[1]) {
        setGradEnd(
          hexAlphaToRgba(
            parsed.stops[1].hex || "#ffffff",
            parsed.stops[1].alpha
          )
        );
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bgImage]);

  // Image handling
  const urlMatch = bgImage.match(/url\(["']?([^"')]+)["']?\)/);
  const imageUrl = urlMatch ? urlMatch[1] : "";
  const pageImages = extractPageImages(html);

  const applyImage = useCallback(
    (url: string) => {
      onStart();
      onStyleChange({
        backgroundImage: url ? `url("${url}")` : "",
        backgroundSize: url ? "cover" : "",
        backgroundPosition: url ? "center" : "",
      });
      onCommit();
    },
    [onStart, onStyleChange, onCommit]
  );

  const clearImage = useCallback(() => {
    onStart();
    onStyleChange({
      backgroundImage: "",
      backgroundSize: "",
      backgroundPosition: "",
    });
    onCommit();
  }, [onStart, onStyleChange, onCommit]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        applyImage(reader.result as string);
      };
      reader.readAsDataURL(file);
      e.target.value = "";
    },
    [applyImage]
  );

  // Build and apply gradient
  const applyGradient = useCallback(
    (
      type: "linear" | "radial",
      dir: string,
      start: string,
      end: string
    ) => {
      const grad =
        type === "radial"
          ? `radial-gradient(circle, ${start}, ${end})`
          : `linear-gradient(${dir}, ${start}, ${end})`;
      onStyleChange({
        backgroundColor: "",
        backgroundImage: grad,
      });
    },
    [onStyleChange]
  );

  // Mode switch handler
  const handleModeSwitch = (newMode: BgMode) => {
    if (newMode === mode) return;
    onStart();
    setMode(newMode);
    if (newMode === "gradient") {
      // Switch from solid to gradient — use current bg color as start
      const currentBg = computedStyle.backgroundColor ?? "";
      const { hex, alpha } = parseColor(currentBg);
      const startColor = hex
        ? hexAlphaToRgba(hex, alpha)
        : "rgb(0, 0, 0)";
      setGradStart(startColor);
      setGradEnd("rgba(0, 0, 0, 0)");
      applyGradient("linear", "to bottom", startColor, "rgba(0, 0, 0, 0)");
    } else {
      // Switch from gradient to solid — use gradient start as solid color
      onStyleChange({
        backgroundImage: "",
        backgroundColor: gradStart,
      });
    }
    onCommit();
  };

  return (
    <SectionWrapper title="Background">
      {/* Mode toggle: Solid / Gradient */}
      <div className="flex items-center gap-2 mb-1">
        <Label className="text-xs w-20 shrink-0">Fill</Label>
        <div className="flex flex-1 rounded border border-border overflow-hidden">
          <button
            className={`flex-1 text-[11px] py-1 transition-colors ${
              mode === "solid"
                ? "bg-foreground text-background font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => handleModeSwitch("solid")}
          >
            Solid
          </button>
          <button
            className={`flex-1 text-[11px] py-1 transition-colors ${
              mode === "gradient"
                ? "bg-foreground text-background font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => handleModeSwitch("gradient")}
          >
            Gradient
          </button>
        </div>
      </div>

      {mode === "solid" ? (
        /* ── Solid Color + Opacity ── */
        <ColorInputWithAlpha
          label="Color"
          value={computedStyle.backgroundColor ?? ""}
          onChange={(rgba) => onStyleChange({ backgroundColor: rgba })}
          onCommit={onCommit}
          onStart={onStart}
        />
      ) : (
        /* ── Gradient Controls ── */
        <div className="space-y-2">
          {/* Type toggle: Linear / Radial */}
          <div className="flex items-center gap-2">
            <Label className="text-xs w-20 shrink-0">Type</Label>
            <div className="flex flex-1 rounded border border-border overflow-hidden">
              <button
                className={`flex-1 text-[11px] py-1 transition-colors ${
                  gradType === "linear"
                    ? "bg-foreground text-background font-medium"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => {
                  onStart();
                  setGradType("linear");
                  applyGradient("linear", gradDirection, gradStart, gradEnd);
                  onCommit();
                }}
              >
                Linear
              </button>
              <button
                className={`flex-1 text-[11px] py-1 transition-colors ${
                  gradType === "radial"
                    ? "bg-foreground text-background font-medium"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => {
                  onStart();
                  setGradType("radial");
                  applyGradient("radial", "circle", gradStart, gradEnd);
                  onCommit();
                }}
              >
                Radial
              </button>
            </div>
          </div>

          {/* Direction (only for linear) */}
          {gradType === "linear" && (
            <PropertyRow label="Direction">
              <select
                value={gradDirection}
                onChange={(e) => {
                  onStart();
                  const dir = e.target.value;
                  setGradDirection(dir);
                  applyGradient("linear", dir, gradStart, gradEnd);
                  onCommit();
                }}
                className="w-full h-7 text-xs rounded border border-border bg-background px-2"
              >
                {GRADIENT_DIRECTIONS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </PropertyRow>
          )}

          {/* Start color */}
          <ColorInputWithAlpha
            label="From"
            value={gradStart}
            onChange={(rgba) => {
              setGradStart(rgba);
              applyGradient(
                gradType,
                gradType === "radial" ? "circle" : gradDirection,
                rgba,
                gradEnd
              );
            }}
            onCommit={onCommit}
            onStart={onStart}
          />

          {/* End color */}
          <ColorInputWithAlpha
            label="To"
            value={gradEnd}
            onChange={(rgba) => {
              setGradEnd(rgba);
              applyGradient(
                gradType,
                gradType === "radial" ? "circle" : gradDirection,
                gradStart,
                rgba
              );
            }}
            onCommit={onCommit}
            onStart={onStart}
          />
        </div>
      )}

      {/* Image section */}
      <div className="space-y-2 pt-1 mt-1 border-t border-border/50">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            Image
          </span>
        </div>

        {/* Current image preview */}
        {imageUrl && (
          <div className="relative group rounded-md overflow-hidden border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="" className="w-full h-20 object-cover" />
            <button
              onClick={clearImage}
              className="absolute top-1 right-1 p-0.5 rounded bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Hidden file input */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Upload button */}
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs h-7"
          onClick={() => fileRef.current?.click()}
        >
          <Upload className="w-3 h-3 mr-1.5" />
          Upload image
        </Button>

        {/* Available images from page */}
        {pageImages.length > 0 && (
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground">
              Page images
            </span>
            <div className="flex gap-1 flex-wrap max-h-24 overflow-y-auto">
              {pageImages.map((src, i) => (
                <button
                  key={i}
                  onClick={() => applyImage(src)}
                  className={`w-10 h-10 rounded border overflow-hidden shrink-0 hover:ring-2 hover:ring-foreground/30 transition-all ${
                    imageUrl === src ? "ring-2 ring-foreground" : ""
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* URL input toggle */}
        <button
          onClick={() => setShowUrlInput(!showUrlInput)}
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
        >
          {showUrlInput ? (
            <ChevronDown className="w-2.5 h-2.5" />
          ) : (
            <ChevronRight className="w-2.5 h-2.5" />
          )}
          <Link className="w-2.5 h-2.5" />
          Paste URL
        </button>

        {showUrlInput && (
          <Input
            value={imageUrl}
            placeholder="https://..."
            title=""
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
        )}
      </div>
    </SectionWrapper>
  );
}
