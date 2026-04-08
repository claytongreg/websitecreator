"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ModelSelector } from "@/components/ui/ModelSelector";
import { useEditorStore } from "@/lib/editor/store";
import { CostReceipt } from "./CostReceipt";
import { Loader2, Send, Undo2, Redo2, ImagePlus, Camera, X } from "lucide-react";
import { PhotoWidget } from "./PhotoWidget";
import { toast } from "sonner";
import { replaceElementByPath } from "@/lib/editor/element-utils";

interface Props {
  siteId: string;
  pageSlug: string;
}

/** Build a lightweight page skeleton preserving tag names + class attributes only. */
function buildPageSkeleton(fullHtml: string): string | null {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(fullHtml, "text/html");

    function skeletonize(el: Element): string {
      const tag = el.tagName.toLowerCase();
      // Skip script/style/meta/link tags
      if (["script", "style", "meta", "link", "noscript"].includes(tag)) return "";

      const cls = el.getAttribute("class");
      const id = el.getAttribute("id");
      const attrs = [
        id ? ` id="${id}"` : "",
        cls ? ` class="${cls}"` : "",
      ].join("");

      const children = Array.from(el.children);
      if (children.length === 0) {
        return `<${tag}${attrs}>...</${tag}>`;
      }
      const inner = children.map(skeletonize).filter(Boolean).join("\n");
      return `<${tag}${attrs}>\n${inner}\n</${tag}>`;
    }

    const body = doc.body;
    if (!body) return null;
    return skeletonize(body);
  } catch {
    return null;
  }
}

export function AIPromptBar({ siteId }: Props) {
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("claude-opus-4-20250514");
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    html,
    selectedElement,
    isAiLoading,
    setAiLoading,
    pushAction,
    addEdit,
    undo,
    redo,
    canUndo,
    canRedo,
    isPhotoWidgetOpen,
    setPhotoWidgetOpen,
    screenshotMode,
    setScreenshotMode,
    screenshotDataUrl: screenshot,
    setScreenshotDataUrl: setScreenshot,
  } = useEditorStore();

  const handleSubmit = async () => {
    if (!prompt.trim() || isAiLoading) return;

    setAiLoading(true);
    const before = html;
    const useElementMode = !!selectedElement;

    try {
      const body: Record<string, unknown> = {
        prompt: prompt.trim(),
        model,
        siteId,
        ...(screenshot ? { screenshot } : {}),
      };

      if (useElementMode && selectedElement) {
        body.editMode = "element";
        body.elementHtml = selectedElement.outerHTML;
        body.selectedElement = {
          path: selectedElement.path,
          tagName: selectedElement.tagName,
        };
        const skeleton = buildPageSkeleton(html);
        if (skeleton) body.context = skeleton;
      } else {
        body.editMode = "page";
        body.currentHtml = html;
        body.selectedElement = null;
      }

      const resp = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || `AI request failed (${resp.status})`);
      }

      const data = await resp.json();

      if (data.html) {
        let finalHtml: string | null = null;

        if (data.editMode === "element" && selectedElement) {
          // Defensive: if AI returned a full document despite element-mode prompt, use it directly
          if (data.html.includes("<!DOCTYPE") || data.html.includes("<html")) {
            finalHtml = data.html;
          } else {
            finalHtml = replaceElementByPath(html, selectedElement.path, data.html);
            if (!finalHtml) {
              toast.error("Could not apply element edit — try again without selection");
              return;
            }
          }
        } else {
          finalHtml = data.html;
        }

        if (!finalHtml) return;
        pushAction({
          type: "edit",
          elementPath: selectedElement?.path ?? "document",
          before,
          after: finalHtml,
          timestamp: Date.now(),
        });
        toast.success("Edit applied");
      } else {
        toast.error("AI returned an empty response — try rephrasing your prompt");
      }

      if (data.costCents != null) {
        addEdit({
          action: selectedElement ? "edit_element" : "edit_page",
          model: data.model ?? model,
          costCents: data.costCents,
          timestamp: Date.now(),
        });
      }

      setPrompt("");
      setScreenshot(null);
    } catch (err) {
      console.error("AI edit failed:", err);
      toast.error(err instanceof Error ? err.message : "AI edit failed — check console for details");
    } finally {
      setAiLoading(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div>
      {/* Photo Widget (expandable panel above prompt bar) */}
      {isPhotoWidgetOpen && <PhotoWidget siteId={siteId} />}

      {/* Main prompt bar */}
      <div className="border-t px-4 py-3 flex items-center gap-3">
        {/* Undo/Redo */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={undo}
            disabled={!canUndo()}
            title="Undo"
          >
            <Undo2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={redo}
            disabled={!canRedo()}
            title="Redo"
          >
            <Redo2 className="w-4 h-4" />
          </Button>
        </div>

        {/* Model picker with pricing */}
        <ModelSelector value={model} onChange={setModel} />

        {/* Photo generation toggle */}
        <Button
          variant={isPhotoWidgetOpen ? "default" : "outline"}
          size="sm"
          onClick={() => setPhotoWidgetOpen(!isPhotoWidgetOpen)}
          title="Generate photo"
        >
          <ImagePlus className="w-4 h-4" />
        </Button>

        {/* Screenshot capture */}
        <Button
          variant={screenshot || screenshotMode ? "default" : "outline"}
          size="sm"
          onClick={() => setScreenshotMode(!screenshotMode)}
          disabled={isAiLoading}
          title="Capture screenshot to send with prompt"
        >
          <Camera className="w-4 h-4" />
        </Button>

        {/* Prompt input with optional screenshot preview */}
        <div className="flex-1 relative flex items-center gap-2">
          {screenshot && (
            <div className="relative flex-shrink-0">
              <img
                src={screenshot}
                alt="Screenshot"
                className="h-8 w-14 object-cover rounded border"
              />
              <button
                onClick={() => setScreenshot(null)}
                className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          <Input
            ref={inputRef}
            placeholder={
              selectedElement
                ? `Edit <${selectedElement.tagName}>... e.g. "make this blue and larger"`
                : 'Describe a change... e.g. "add a testimonials section"'
            }
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            disabled={isAiLoading}
          />
        </div>

        {/* Send */}
        <Button onClick={handleSubmit} disabled={!prompt.trim() || isAiLoading}>
          {isAiLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>

        {/* Session cost receipt */}
        <CostReceipt />
      </div>
    </div>
  );
}
