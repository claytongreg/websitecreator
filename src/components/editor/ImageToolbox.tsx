"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ImageModelSelector, IMAGE_MODELS } from "@/components/ui/ModelSelector";
import { useEditorStore } from "@/lib/editor/store";
import { replaceElementAttribute } from "@/lib/editor/element-utils";
import { Upload, Sparkles, Loader2, ImageIcon } from "lucide-react";

interface ImageToolboxProps {
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  position: { top: number; left: number };
  siteId: string;
}

export function ImageToolbox({ iframeRef, position, siteId }: ImageToolboxProps) {
  const [tab, setTab] = useState<"upload" | "generate">("upload");
  const [preview, setPreview] = useState<string | null>(null);
  const [altText, setAltText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // AI generate state
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState(IMAGE_MODELS[0].id);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { html, selectedElement, pushAction, addEdit } = useEditorStore();

  const currentSrc = selectedElement?.attributes?.src ?? "";
  const currentAlt = selectedElement?.attributes?.alt ?? "";

  // Initialize alt text from current element
  useState(() => {
    setAltText(currentAlt);
  });

  const handleFileSelect = useCallback(() => {
    fileRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setPreview(dataUrl);
      setAltText(file.name.replace(/\.[^.]+$/, ""));
    };
    reader.readAsDataURL(file);
    // Reset so the same file can be re-selected
    e.target.value = "";
  }, []);

  const handleApply = useCallback(() => {
    if (!selectedElement || !preview) return;

    let result = replaceElementAttribute(html, selectedElement.path, "src", preview);
    if (!result) return;

    if (altText) {
      result = replaceElementAttribute(result, selectedElement.path, "alt", altText);
      if (!result) return;
    }

    pushAction({
      type: "edit",
      elementPath: selectedElement.path,
      before: html,
      after: result,
      timestamp: Date.now(),
    });

    setPreview(null);
  }, [selectedElement, preview, altText, html, pushAction]);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setError(null);

    try {
      const resp = await fetch("/api/ai/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim(), model, siteId }),
      });

      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data.error || "Image generation failed");
      }

      const data = await resp.json();
      setPreview(data.imageUrl);
      setAltText(prompt.trim().slice(0, 100));

      if (data.costCents != null) {
        addEdit({
          action: "generate_image",
          model,
          costCents: data.costCents,
          timestamp: Date.now(),
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, model, siteId, isGenerating, addEdit]);

  if (!selectedElement) return null;

  const selectedModel = IMAGE_MODELS.find((m) => m.id === model);

  return (
    <div
      className="fixed z-50 bg-white rounded-lg shadow-xl border p-2 space-y-2"
      style={{ top: position.top + 44, left: position.left, width: 340 }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Tab switcher */}
      <div className="flex gap-0.5 border rounded-md p-0.5">
        <button
          className={`flex-1 text-xs py-1 px-2 rounded transition-colors flex items-center justify-center gap-1 ${
            tab === "upload" ? "bg-foreground text-background" : "hover:bg-muted"
          }`}
          onClick={() => { setTab("upload"); setPreview(null); setError(null); }}
        >
          <Upload className="w-3 h-3" />
          Upload
        </button>
        <button
          className={`flex-1 text-xs py-1 px-2 rounded transition-colors flex items-center justify-center gap-1 ${
            tab === "generate" ? "bg-foreground text-background" : "hover:bg-muted"
          }`}
          onClick={() => { setTab("generate"); setPreview(null); setError(null); }}
        >
          <Sparkles className="w-3 h-3" />
          AI Generate
        </button>
      </div>

      {/* Upload tab */}
      {tab === "upload" && (
        <div className="space-y-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs h-8"
            onClick={handleFileSelect}
          >
            <Upload className="w-3 h-3 mr-1.5" />
            Choose image file
          </Button>
        </div>
      )}

      {/* AI Generate tab */}
      {tab === "generate" && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <ImageModelSelector value={model} onChange={setModel} className="flex-1" />
            {selectedModel && (
              <span className="text-[10px] text-muted-foreground shrink-0">
                {selectedModel.costPerImage}
              </span>
            )}
          </div>
          <Textarea
            placeholder="Describe the image..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={2}
            className="text-xs resize-none"
            disabled={isGenerating}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                handleGenerate();
              }
            }}
          />
          <Button
            size="sm"
            className="w-full text-xs h-8"
            onClick={handleGenerate}
            disabled={!prompt.trim() || isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin mr-1.5" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3 mr-1.5" />
                Generate
              </>
            )}
          </Button>
        </div>
      )}

      {/* Error */}
      {error && <p className="text-xs text-destructive">{error}</p>}

      {/* Preview + Apply */}
      {preview && (
        <div className="space-y-2">
          <div className="border rounded overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Preview"
              className="w-full max-h-40 object-contain bg-muted"
            />
          </div>
          <Input
            value={altText}
            onChange={(e) => setAltText(e.target.value)}
            placeholder="Alt text"
            className="h-7 text-xs"
          />
          <Button size="sm" className="w-full text-xs h-8" onClick={handleApply}>
            <ImageIcon className="w-3 h-3 mr-1.5" />
            Apply to image
          </Button>
        </div>
      )}

      {/* Current src hint */}
      {!preview && currentSrc && (
        <p className="text-[10px] text-muted-foreground truncate" title={currentSrc}>
          Current: {currentSrc.startsWith("data:") ? "embedded image" : currentSrc}
        </p>
      )}
    </div>
  );
}
