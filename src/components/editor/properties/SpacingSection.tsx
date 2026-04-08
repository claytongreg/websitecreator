"use client";

import { useState } from "react";
import { SectionWrapper } from "./shared";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link, Unlink } from "lucide-react";

interface SpacingSectionProps {
  computedStyle: Record<string, string>;
  onStyleChange: (styles: Record<string, string>) => void;
  onCommit: () => void;
  onStart: () => void;
}

function SpacingInput({
  value,
  onChange,
  onBlur,
  onFocus,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  onFocus: () => void;
  className?: string;
}) {
  // Strip "px" for display, show just the number
  const display = value.replace("px", "");
  return (
    <Input
      value={display}
      placeholder="0"
      onChange={(e) => {
        const v = e.target.value;
        onChange(v ? `${v}px` : "0px");
      }}
      onBlur={onBlur}
      onFocus={onFocus}
      className={`h-6 w-12 text-[10px] font-mono text-center p-0 ${className ?? ""}`}
    />
  );
}

export function SpacingSection({
  computedStyle,
  onStyleChange,
  onCommit,
  onStart,
}: SpacingSectionProps) {
  const [linkedMargin, setLinkedMargin] = useState(false);
  const [linkedPadding, setLinkedPadding] = useState(false);

  const handleMargin = (side: string, value: string) => {
    onStart();
    if (linkedMargin) {
      onStyleChange({
        marginTop: value,
        marginRight: value,
        marginBottom: value,
        marginLeft: value,
      });
    } else {
      onStyleChange({ [side]: value });
    }
  };

  const handlePadding = (side: string, value: string) => {
    onStart();
    if (linkedPadding) {
      onStyleChange({
        paddingTop: value,
        paddingRight: value,
        paddingBottom: value,
        paddingLeft: value,
      });
    } else {
      onStyleChange({ [side]: value });
    }
  };

  return (
    <SectionWrapper title="Spacing">
      {/* Margin box */}
      <div className="relative border border-dashed border-orange-300 rounded p-1">
        <div className="text-[9px] text-muted-foreground uppercase absolute top-0.5 left-1.5">
          margin
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-0 right-0 h-5 w-5 p-0"
          onClick={() => setLinkedMargin(!linkedMargin)}
          title={linkedMargin ? "Unlink margins" : "Link margins"}
        >
          {linkedMargin ? (
            <Link className="w-2.5 h-2.5" />
          ) : (
            <Unlink className="w-2.5 h-2.5 text-muted-foreground" />
          )}
        </Button>
        <div className="flex flex-col items-center gap-1 pt-3">
          <SpacingInput
            value={computedStyle.marginTop ?? "0px"}
            onChange={(v) => handleMargin("marginTop", v)}
            onBlur={onCommit}
            onFocus={onStart}
          />
          <div className="flex items-center gap-1">
            <SpacingInput
              value={computedStyle.marginLeft ?? "0px"}
              onChange={(v) => handleMargin("marginLeft", v)}
              onBlur={onCommit}
              onFocus={onStart}
            />
            {/* Padding box */}
            <div className="relative border border-dashed border-blue-300 rounded p-1 min-w-[100px]">
              <div className="text-[9px] text-muted-foreground uppercase absolute top-0.5 left-1.5">
                padding
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-0 right-0 h-5 w-5 p-0"
                onClick={() => setLinkedPadding(!linkedPadding)}
                title={linkedPadding ? "Unlink padding" : "Link padding"}
              >
                {linkedPadding ? (
                  <Link className="w-2.5 h-2.5" />
                ) : (
                  <Unlink className="w-2.5 h-2.5 text-muted-foreground" />
                )}
              </Button>
              <div className="flex flex-col items-center gap-1 pt-3">
                <SpacingInput
                  value={computedStyle.paddingTop ?? "0px"}
                  onChange={(v) => handlePadding("paddingTop", v)}
                  onBlur={onCommit}
                  onFocus={onStart}
                />
                <div className="flex items-center gap-1">
                  <SpacingInput
                    value={computedStyle.paddingLeft ?? "0px"}
                    onChange={(v) => handlePadding("paddingLeft", v)}
                    onBlur={onCommit}
                    onFocus={onStart}
                  />
                  <div className="w-8 h-6 bg-muted rounded" />
                  <SpacingInput
                    value={computedStyle.paddingRight ?? "0px"}
                    onChange={(v) => handlePadding("paddingRight", v)}
                    onBlur={onCommit}
                    onFocus={onStart}
                  />
                </div>
                <SpacingInput
                  value={computedStyle.paddingBottom ?? "0px"}
                  onChange={(v) => handlePadding("paddingBottom", v)}
                  onBlur={onCommit}
                  onFocus={onStart}
                />
              </div>
            </div>
            <SpacingInput
              value={computedStyle.marginRight ?? "0px"}
              onChange={(v) => handleMargin("marginRight", v)}
              onBlur={onCommit}
              onFocus={onStart}
            />
          </div>
          <SpacingInput
            value={computedStyle.marginBottom ?? "0px"}
            onChange={(v) => handleMargin("marginBottom", v)}
            onBlur={onCommit}
            onFocus={onStart}
          />
        </div>
      </div>
    </SectionWrapper>
  );
}
