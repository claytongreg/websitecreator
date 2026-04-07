"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageTreeBuilder } from "@/components/onboarding/PageTreeBuilder";
import type { PageNode } from "@/types";

const BUSINESS_TYPES = [
  "Portfolio / Personal",
  "Restaurant / Food & Drink",
  "Retail / E-Commerce",
  "Agency / Services",
  "Blog / Media",
  "Nonprofit / Community",
  "Real Estate",
  "Health & Wellness",
  "Education",
  "Technology / SaaS",
  "Other",
];

interface Props {
  siteName: string;
  onSiteNameChange: (name: string) => void;
  description: string;
  onDescriptionChange: (desc: string) => void;
  businessType: string;
  onBusinessTypeChange: (type: string) => void;
  pages: PageNode[];
  onPagesChange: (pages: PageNode[]) => void;
}

export function DescriptionStep({
  siteName,
  onSiteNameChange,
  description,
  onDescriptionChange,
  businessType,
  onBusinessTypeChange,
  pages,
  onPagesChange,
}: Props) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-2">Describe your vision</h2>
        <p className="text-muted-foreground">
          Tell us about your website. The more detail you give, the better the
          starting point will be.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="siteName">Site Name</Label>
        <Input
          id="siteName"
          placeholder="My Awesome Website"
          value={siteName}
          onChange={(e) => onSiteNameChange(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">What is your website for?</Label>
        <Textarea
          id="description"
          placeholder="A boutique coffee roaster in Nelson. Warm, earthy tones. Minimal and clean. Should feel artisanal and handcrafted..."
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          rows={4}
        />
        <p className="text-xs text-muted-foreground">
          Include details about your brand, target audience, preferred colors,
          mood, or any specific features you want.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Business Type</Label>
        <Select value={businessType} onValueChange={(v) => v && onBusinessTypeChange(v)}>
          <SelectTrigger>
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            {BUSINESS_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <Label>Site pages</Label>
        <p className="text-xs text-muted-foreground -mt-1">
          Add pages and drag them to set order. Drag right onto another page to nest it.
        </p>
        <PageTreeBuilder pages={pages} onPagesChange={onPagesChange} />
      </div>
    </div>
  );
}
