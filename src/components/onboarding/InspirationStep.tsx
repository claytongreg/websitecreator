"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { X, Loader2, Link as LinkIcon } from "lucide-react";
import type { InspirationSite } from "@/types";

interface Props {
  inspirations: InspirationSite[];
  onAdd: (site: InspirationSite) => void;
  onRemove: (url: string) => void;
}

export function InspirationStep({ inspirations, onAdd, onRemove }: Props) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAdd = async () => {
    if (!url.trim()) return;

    let normalizedUrl = url.trim();
    if (!normalizedUrl.startsWith("http")) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    // Check for duplicates
    if (inspirations.some((i) => i.url === normalizedUrl)) {
      setError("This site is already added");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const resp = await fetch("/api/ai/extract-style", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: normalizedUrl }),
      });

      if (!resp.ok) throw new Error("Failed to extract styles");

      const data = await resp.json();
      onAdd({
        url: normalizedUrl,
        style: data.style,
      });
      setUrl("");
    } catch {
      // Fallback: add with placeholder style
      onAdd({
        url: normalizedUrl,
        style: {
          colors: ["#000000", "#ffffff", "#666666"],
          fonts: [{ family: "System default" }],
          layout: "Unknown",
          mood: "To be analyzed",
        },
      });
      setUrl("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">Get inspired</h2>
      <p className="text-muted-foreground mb-8">
        Paste URLs of websites you like. We&apos;ll extract their colors, fonts,
        and layout style to inspire your new site. This step is optional — you
        can skip it and describe your vision in the next step.
      </p>

      <div className="flex gap-2 mb-6">
        <Input
          placeholder="https://example.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          disabled={loading}
        />
        <Button onClick={handleAdd} disabled={loading || !url.trim()}>
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            "Add"
          )}
        </Button>
      </div>

      {error && <p className="text-sm text-destructive mb-4">{error}</p>}

      <div className="space-y-3">
        {inspirations.map((site) => (
          <Card key={site.url}>
            <CardContent className="py-4 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <LinkIcon className="w-3 h-3 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium truncate">
                    {site.url}
                  </span>
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <span>Colors:</span>
                    <div className="flex gap-0.5">
                      {site.style.colors.slice(0, 5).map((color, i) => (
                        <span
                          key={i}
                          className="w-4 h-4 rounded border"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                  <span>
                    Fonts:{" "}
                    {site.style.fonts.map((f) => f.family).join(", ")}
                  </span>
                  <span>Mood: {site.style.mood}</span>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemove(site.url)}
              >
                <X className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        ))}

        {inspirations.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm border rounded-lg border-dashed">
            No inspiration sites added yet. Add some URLs above, or skip to the
            next step.
          </div>
        )}
      </div>
    </div>
  );
}
