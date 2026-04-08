"use client";

import { SectionWrapper, CSSValueInput } from "./shared";

interface SizingSectionProps {
  computedStyle: Record<string, string>;
  onStyleChange: (styles: Record<string, string>) => void;
  onCommit: () => void;
  onStart: () => void;
}

export function SizingSection({
  computedStyle,
  onStyleChange,
  onCommit,
  onStart,
}: SizingSectionProps) {
  return (
    <SectionWrapper title="Sizing" defaultOpen={false}>
      <div className="grid grid-cols-2 gap-x-3 gap-y-2">
        <CSSValueInput
          label="W"
          value={computedStyle.width ?? ""}
          onChange={(v) => onStyleChange({ width: v })}
          onCommit={onCommit}
          onStart={onStart}
        />
        <CSSValueInput
          label="H"
          value={computedStyle.height ?? ""}
          onChange={(v) => onStyleChange({ height: v })}
          onCommit={onCommit}
          onStart={onStart}
        />
        <CSSValueInput
          label="Min W"
          value={computedStyle.minWidth ?? ""}
          onChange={(v) => onStyleChange({ minWidth: v })}
          onCommit={onCommit}
          onStart={onStart}
          placeholder="0px"
        />
        <CSSValueInput
          label="Min H"
          value={computedStyle.minHeight ?? ""}
          onChange={(v) => onStyleChange({ minHeight: v })}
          onCommit={onCommit}
          onStart={onStart}
          placeholder="0px"
        />
        <CSSValueInput
          label="Max W"
          value={computedStyle.maxWidth ?? ""}
          onChange={(v) => onStyleChange({ maxWidth: v })}
          onCommit={onCommit}
          onStart={onStart}
          placeholder="none"
        />
        <CSSValueInput
          label="Max H"
          value={computedStyle.maxHeight ?? ""}
          onChange={(v) => onStyleChange({ maxHeight: v })}
          onCommit={onCommit}
          onStart={onStart}
          placeholder="none"
        />
      </div>
    </SectionWrapper>
  );
}
