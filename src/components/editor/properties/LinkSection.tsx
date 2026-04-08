"use client";

import { useState } from "react";
import { SectionWrapper, PropertyRow } from "./shared";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface LinkSectionProps {
  attributes: Record<string, string>;
  onAttributeChange: (attr: string, value: string) => void;
}

export function LinkSection({ attributes, onAttributeChange }: LinkSectionProps) {
  const [href, setHref] = useState(attributes.href ?? "");

  return (
    <SectionWrapper title="Link">
      <PropertyRow label="URL">
        <Input
          value={href}
          placeholder="https://..."
          onChange={(e) => setHref(e.target.value)}
          onBlur={() => {
            if (href !== (attributes.href ?? "")) {
              onAttributeChange("href", href);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onAttributeChange("href", href);
            }
          }}
          className="h-7 text-xs font-mono"
        />
      </PropertyRow>
      <PropertyRow label="Target">
        <Select
          value={attributes.target || "_self"}
          onValueChange={(v) => v && onAttributeChange("target", v)}
        >
          <SelectTrigger className="h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_self">Same tab</SelectItem>
            <SelectItem value="_blank">New tab</SelectItem>
          </SelectContent>
        </Select>
      </PropertyRow>
    </SectionWrapper>
  );
}
