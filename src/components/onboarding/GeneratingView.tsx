"use client";

import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";

interface Props {
  siteName: string;
  pages: string[];
}

export function GeneratingView({ siteName, pages }: Props) {
  const [progress, setProgress] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    // Simulate progress based on pages being generated
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) {
          clearInterval(interval);
          return 95;
        }
        const increment = Math.random() * 8 + 2;
        const next = Math.min(prev + increment, 95);

        // Update which page we're "generating"
        const pageProgress = Math.floor((next / 100) * pages.length);
        setCurrentPage(Math.min(pageProgress, pages.length - 1));

        return next;
      });
    }, 500);

    return () => clearInterval(interval);
  }, [pages.length]);

  return (
    <div className="text-center py-16 max-w-md mx-auto">
      <Loader2 className="w-12 h-12 animate-spin mx-auto mb-6 text-muted-foreground" />
      <h2 className="text-2xl font-bold mb-2">
        Generating {siteName}
      </h2>
      <p className="text-muted-foreground mb-8">
        Creating {pages.length} pages with your chosen style...
      </p>

      <Progress value={progress} className="mb-4" />

      <p className="text-sm text-muted-foreground">
        {progress < 95 ? (
          <>
            Generating{" "}
            <span className="font-medium">
              {pages[currentPage]?.charAt(0).toUpperCase()}
              {pages[currentPage]?.slice(1)}
            </span>{" "}
            page...
          </>
        ) : (
          "Finalizing your site..."
        )}
      </p>
    </div>
  );
}
