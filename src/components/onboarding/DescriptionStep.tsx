"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

const PAGE_OPTIONS = [
  { id: "home", label: "Home" },
  { id: "about", label: "About" },
  { id: "services", label: "Services" },
  { id: "portfolio", label: "Portfolio" },
  { id: "blog", label: "Blog" },
  { id: "contact", label: "Contact" },
  { id: "pricing", label: "Pricing" },
  { id: "faq", label: "FAQ" },
  { id: "testimonials", label: "Testimonials" },
  { id: "team", label: "Team" },
];

interface Props {
  siteName: string;
  onSiteNameChange: (name: string) => void;
  description: string;
  onDescriptionChange: (desc: string) => void;
  businessType: string;
  onBusinessTypeChange: (type: string) => void;
  selectedPages: string[];
  onPagesChange: (pages: string[]) => void;
}

export function DescriptionStep({
  siteName,
  onSiteNameChange,
  description,
  onDescriptionChange,
  businessType,
  onBusinessTypeChange,
  selectedPages,
  onPagesChange,
}: Props) {
  const togglePage = (pageId: string) => {
    if (selectedPages.includes(pageId)) {
      // Don't allow removing the last page
      if (selectedPages.length > 1) {
        onPagesChange(selectedPages.filter((p) => p !== pageId));
      }
    } else {
      onPagesChange([...selectedPages, pageId]);
    }
  };

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
        <Label>Pages to generate</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {PAGE_OPTIONS.map((page) => (
            <label
              key={page.id}
              className="flex items-center gap-2 cursor-pointer"
            >
              <Checkbox
                checked={selectedPages.includes(page.id)}
                onCheckedChange={() => togglePage(page.id)}
              />
              <span className="text-sm">{page.label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
