"use client";

import { useCallback, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEditorStore } from "@/lib/editor/store";
import { BackgroundSection } from "./properties/BackgroundSection";
import { TypographySection } from "./properties/TypographySection";
import { SpacingSection } from "./properties/SpacingSection";
import { BorderSection } from "./properties/BorderSection";
import { SizingSection } from "./properties/SizingSection";
import { EffectsSection } from "./properties/EffectsSection";
import { LinkSection } from "./properties/LinkSection";
import { replaceElementAttribute } from "@/lib/editor/element-utils";

interface PropertiesPanelProps {
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
}

export function PropertiesPanel({ iframeRef }: PropertiesPanelProps) {
  const selectedElement = useEditorStore((s) => s.selectedElement);
  const beginStyleChange = useEditorStore((s) => s.beginStyleChange);
  const styleChangeBeforeHtml = useEditorStore((s) => s.styleChangeBeforeHtml);
  const selectElement = useEditorStore((s) => s.selectElement);
  const html = useEditorStore((s) => s.html);
  const pushAction = useEditorStore((s) => s.pushAction);
  const hasPendingRef = useRef(false);

  // Track whether we have pending changes for cleanup
  useEffect(() => {
    hasPendingRef.current = styleChangeBeforeHtml !== null;
  }, [styleChangeBeforeHtml]);

  // Auto-commit on unmount (deselection)
  useEffect(() => {
    return () => {
      if (hasPendingRef.current) {
        iframeRef.current?.contentWindow?.postMessage(
          { type: "wc_commit_style" },
          "*"
        );
      }
    };
  }, [iframeRef]);

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

  const handleAttributeChange = useCallback(
    (attr: string, value: string) => {
      if (!selectedElement) return;
      const result = replaceElementAttribute(html, selectedElement.path, attr, value);
      if (result) {
        pushAction({
          type: "edit",
          elementPath: selectedElement.path,
          before: html,
          after: result,
          timestamp: Date.now(),
        });
      }
    },
    [selectedElement, html, pushAction]
  );

  const handleClose = () => {
    selectElement(null);
    iframeRef.current?.contentWindow?.postMessage(
      { type: "wc_deselect" },
      "*"
    );
  };

  if (!selectedElement) return null;

  const { computedStyle, tagName } = selectedElement;

  const sectionProps = {
    computedStyle,
    onStyleChange: sendStyle,
    onCommit: commit,
    onStart: beginStyleChange,
  };

  return (
    <div className="w-80 border-l bg-background flex flex-col shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-muted-foreground">
            &lt;{tagName}&gt;
          </span>
          <span className="text-xs font-medium">Properties</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={handleClose}
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Sections */}
      <ScrollArea className="flex-1">
        {tagName.toLowerCase() === "a" && (
          <LinkSection
            attributes={selectedElement.attributes}
            onAttributeChange={handleAttributeChange}
          />
        )}
        <BackgroundSection {...sectionProps} />
        <TypographySection {...sectionProps} />
        <SpacingSection {...sectionProps} />
        <BorderSection {...sectionProps} />
        <SizingSection {...sectionProps} />
        <EffectsSection {...sectionProps} />
      </ScrollArea>
    </div>
  );
}
