"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Loader2, RefreshCw } from "lucide-react";
import type { StyleOption } from "@/types";

interface Props {
  options: StyleOption[];
  chosen: StyleOption | null;
  onChoose: (option: StyleOption) => void;
  onRegenerate: () => void;
}

export function StylePreview({ options, chosen, onChoose, onRegenerate }: Props) {
  if (options.length === 0) {
    return (
      <div className="text-center py-16">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">Generating style options...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold mb-2">Choose your style</h2>
          <p className="text-muted-foreground">
            Pick the style that best matches your vision. You can always change
            everything later in the editor.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onRegenerate}>
          <RefreshCw className="w-3 h-3 mr-2" />
          Regenerate
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {options.map((option) => {
          const isChosen = chosen?.id === option.id;
          return (
            <Card
              key={option.id}
              className={`cursor-pointer transition-all ${
                isChosen ? "ring-2 ring-foreground" : "hover:border-foreground/30"
              }`}
              onClick={() => onChoose(option)}
            >
              <CardContent className="pt-6">
                {/* Color palette preview */}
                <div className="flex gap-1 mb-4">
                  {option.colors.map((color, i) => (
                    <div
                      key={i}
                      className="flex-1 h-12 rounded first:rounded-l-lg last:rounded-r-lg border"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>

                {/* Font preview */}
                <div className="mb-4 p-3 border rounded">
                  <p
                    className="text-lg font-bold mb-1"
                    style={{ fontFamily: option.fonts.heading }}
                  >
                    {option.name}
                  </p>
                  <p
                    className="text-sm text-muted-foreground"
                    style={{ fontFamily: option.fonts.body }}
                  >
                    {option.mood}
                  </p>
                </div>

                {/* Font names */}
                <div className="text-xs text-muted-foreground mb-4">
                  <span>
                    Heading: {option.fonts.heading} / Body: {option.fonts.body}
                  </span>
                </div>

                {/* Selection indicator */}
                <div className="flex justify-end">
                  {isChosen ? (
                    <span className="flex items-center gap-1 text-sm font-medium">
                      <Check className="w-4 h-4" />
                      Selected
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      Click to select
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
