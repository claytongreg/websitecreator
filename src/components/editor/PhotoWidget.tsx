"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ImageModelSelector, IMAGE_MODELS } from "@/components/ui/ModelSelector";
import { useEditorStore } from "@/lib/editor/store";
import { Loader2, ImagePlus, X, Download, Plus } from "lucide-react";

const SAMPLE_PROMPTS = [
  "Professional headshot with soft studio lighting",
  "Modern office workspace, clean and minimal",
  "Aerial city skyline at golden hour",
  "Flat lay product photo on marble surface",
  "Cozy cafe interior with warm lighting",
  "Abstract geometric pattern, vibrant colors",
];

interface Props {
  siteId: string;
}

export function PhotoWidget({ siteId }: Props) {
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState(IMAGE_MODELS[0].id);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [lastCost, setLastCost] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { html, selectedElement, pushAction, addEdit, setPhotoWidgetOpen } =
    useEditorStore();

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setError(null);
    setGeneratedImage(null);

    try {
      const resp = await fetch("/api/ai/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          model,
          siteId,
        }),
      });

      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data.error || "Image generation failed");
      }

      const data = await resp.json();
      setGeneratedImage(data.imageUrl);
      setLastCost(data.costCents);

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
  };

  const handleInsert = () => {
    if (!generatedImage) return;

    const imgTag = `<img src="${generatedImage}" alt="${prompt.slice(0, 100)}" class="w-full max-w-2xl mx-auto rounded-lg" />`;
    const before = html;
    let after: string;

    if (selectedElement) {
      // Insert after selected element
      const idx = html.indexOf(selectedElement.outerHTML);
      if (idx >= 0) {
        const end = idx + selectedElement.outerHTML.length;
        after = html.slice(0, end) + "\n" + imgTag + html.slice(end);
      } else {
        after = html.replace("</body>", imgTag + "\n</body>");
      }
    } else {
      // Append before </body>
      after = html.replace("</body>", imgTag + "\n</body>");
    }

    pushAction({
      type: "insert",
      elementPath: selectedElement?.path ?? "body",
      before,
      after,
      timestamp: Date.now(),
    });

    setGeneratedImage(null);
    setPrompt("");
    setPhotoWidgetOpen(false);
  };

  const handleDownload = () => {
    if (!generatedImage) return;
    const link = document.createElement("a");
    link.href = generatedImage;
    link.download = `generated-${Date.now()}.png`;
    link.click();
  };

  const selectedModel = IMAGE_MODELS.find((m) => m.id === model);

  return (
    <div className="border-t border-b bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <div className="flex items-center gap-2 text-sm font-medium">
          <ImagePlus className="w-4 h-4" />
          Generate Photo
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setPhotoWidgetOpen(false)}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="p-4 space-y-3">
        {/* Model selector */}
        <div className="flex items-center gap-3">
          <ImageModelSelector value={model} onChange={setModel} />
          {selectedModel && (
            <span className="text-xs text-muted-foreground">
              {selectedModel.costPerImage} per image
            </span>
          )}
        </div>

        {/* Sample prompts */}
        <div className="flex flex-wrap gap-1.5">
          {SAMPLE_PROMPTS.map((sample) => (
            <button
              key={sample}
              onClick={() => setPrompt(sample)}
              className="px-2.5 py-1 text-xs border rounded-full hover:bg-muted transition-colors cursor-pointer"
            >
              {sample}
            </button>
          ))}
        </div>

        {/* Prompt input */}
        <Textarea
          placeholder="Describe the photo you want to generate..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          disabled={isGenerating}
        />

        {/* Error */}
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {/* Generate button */}
        <div className="flex items-center gap-3">
          <Button
            onClick={handleGenerate}
            disabled={!prompt.trim() || isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Generating...
              </>
            ) : (
              <>
                <ImagePlus className="w-4 h-4 mr-2" />
                Generate
              </>
            )}
          </Button>
          {lastCost != null && (
            <span className="text-xs text-muted-foreground font-mono">
              Cost: ${(lastCost / 100).toFixed(3)}
            </span>
          )}
        </div>

        {/* Result preview */}
        {generatedImage && (
          <div className="space-y-2">
            <div className="border rounded-lg overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={generatedImage}
                alt="Generated"
                className="w-full max-h-80 object-contain bg-muted"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handleInsert} size="sm">
                <Plus className="w-4 h-4 mr-1" />
                Insert into page
              </Button>
              <Button onClick={handleDownload} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-1" />
                Download
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
