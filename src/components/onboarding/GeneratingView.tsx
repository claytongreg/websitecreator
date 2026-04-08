"use client";

import { useEffect, useRef, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle } from "lucide-react";

export interface GenerationProgress {
  type: "progress" | "finalizing" | "complete" | "error";
  page?: string;
  current?: number;
  total?: number;
  siteId?: string;
  costCents?: number;
  inputTokens?: number;
  outputTokens?: number;
  message?: string;
}

interface Props {
  siteName: string;
  pages: string[];
  progress: GenerationProgress | null;
  onRetry?: () => void;
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

export function GeneratingView({ siteName, pages, progress, onRetry }: Props) {
  const [elapsed, setElapsed] = useState(0);
  const [subProgress, setSubProgress] = useState(0);
  const startTime = useRef(Date.now());

  // Elapsed time counter
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Sub-progress animation: slowly fills between page completions
  // so users see continuous movement during each AI generation
  useEffect(() => {
    setSubProgress(0);
    const interval = setInterval(() => {
      setSubProgress((prev) => {
        if (prev >= 90) return prev;
        // Slow down as it approaches 90%
        const increment = Math.max(0.5, (90 - prev) * 0.03);
        return Math.min(prev + increment, 90);
      });
    }, 300);
    return () => clearInterval(interval);
  }, [progress?.current]);

  const total = progress?.total ?? pages.length;
  const isComplete = progress?.type === "complete";
  const isFinalizing = progress?.type === "finalizing";
  const isError = progress?.type === "error";
  const currentPage = progress?.current ?? 0;
  const completedPages = progress?.type === "progress" ? currentPage - 1 : currentPage;

  // Calculate overall progress:
  // Each page gets an equal slice. Within each slice, sub-progress fills gradually.
  let overallProgress: number;
  if (isComplete) {
    overallProgress = 100;
  } else if (isFinalizing) {
    overallProgress = 95;
  } else if (currentPage > 0) {
    const perPage = 95 / total;
    const completedPortion = Math.max(0, completedPages) * perPage;
    const currentPortion = (subProgress / 100) * perPage;
    overallProgress = Math.min(completedPortion + currentPortion, 95);
  } else {
    overallProgress = 0;
  }

  return (
    <div className="text-center py-16 max-w-lg mx-auto">
      {isComplete ? (
        <CheckCircle className="w-12 h-12 mx-auto mb-6 text-green-500" />
      ) : (
        <Loader2 className="w-12 h-12 animate-spin mx-auto mb-6 text-muted-foreground" />
      )}

      <h2 className="text-2xl font-bold mb-2">
        {isComplete ? `${siteName} is ready!` : `Generating ${siteName}`}
      </h2>

      <p className="text-muted-foreground mb-8">
        {isComplete
          ? "Redirecting to editor..."
          : `Creating ${total} page${total !== 1 ? "s" : ""} with your chosen style`}
      </p>

      <Progress value={overallProgress} className="mb-6" />

      {/* Page progress list */}
      {!isComplete && (
        <div className="space-y-2 mb-6">
          {pages.slice(0, total).map((page, i) => {
            const pageNum = i + 1;
            const isDone = pageNum < currentPage || isFinalizing || isComplete;
            const isActive =
              pageNum === currentPage &&
              progress?.type === "progress";

            return (
              <div
                key={i}
                className={`flex items-center gap-3 text-sm px-4 py-2 rounded-lg transition-all ${
                  isActive
                    ? "text-foreground font-medium"
                    : isDone
                    ? "text-muted-foreground"
                    : "text-muted-foreground/50"
                }`}
              >
                <span className="w-5 flex-shrink-0">
                  {isDone ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : isActive ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <span className="block w-4 h-4 rounded-full border-2 border-current opacity-30" />
                  )}
                </span>
                <span>{page}</span>
              </div>
            );
          })}

          {/* Finalizing step */}
          <div
            className={`flex items-center gap-3 text-sm px-4 py-2 rounded-lg transition-all ${
              isFinalizing
                ? "text-foreground font-medium"
                : isComplete
                ? "text-muted-foreground"
                : "text-muted-foreground/50"
            }`}
          >
            <span className="w-5 flex-shrink-0">
              {isComplete ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : isFinalizing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <span className="block w-4 h-4 rounded-full border-2 border-current opacity-30" />
              )}
            </span>
            <span>Saving your site</span>
          </div>
        </div>
      )}

      {/* Elapsed time */}
      {!isComplete && (
        <p className="text-xs text-muted-foreground/60">
          {formatElapsed(elapsed)} elapsed
        </p>
      )}

      {isError && (
        <div className="mt-4">
          <p className="text-sm text-red-500">
            {progress?.message ?? "Something went wrong. Please try again."}
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-4 px-6 py-2 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              Try Again
            </button>
          )}
        </div>
      )}
    </div>
  );
}
