"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, X, Link, ChevronDown, ChevronRight } from "lucide-react";
import { SectionWrapper, ColorInput, PropertyRow } from "./shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEditorStore } from "@/lib/editor/store";
import { extractPageImages } from "@/lib/editor/element-utils";

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
  const fileRef = useRef<HTMLInputElement>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const html = useEditorStore((s) => s.html);

  const bgImage = computedStyle.backgroundImage ?? "none";
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

  return (
    <SectionWrapper title="Background">
      <ColorInput
        label="Color"
        value={computedStyle.backgroundColor ?? ""}
        onChange={(hex) => onStyleChange({ backgroundColor: hex })}
        onCommit={onCommit}
        onStart={onStart}
      />

      {/* Image section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Image</span>
        </div>

        {/* Current image preview */}
        {imageUrl && (
          <div className="relative group rounded-md overflow-hidden border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt=""
              className="w-full h-20 object-cover"
            />
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
            <span className="text-[10px] text-muted-foreground">Page images</span>
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
                  <img
                    src={src}
                    alt=""
                    className="w-full h-full object-cover"
                  />
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
