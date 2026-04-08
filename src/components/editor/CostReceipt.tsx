"use client";

import { useEffect, useState } from "react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { useEditorStore, type SessionEdit } from "@/lib/editor/store";
import { Loader2 } from "lucide-react";

interface UsageRecord {
  id: string;
  model: string;
  action: string;
  costCents: number;
  inputTokens: number;
  outputTokens: number;
  createdAt: string;
}

const ACTION_LABELS: Record<string, string> = {
  generate_site: "Site generation",
  edit_page: "Page edit",
  edit_element: "Element edit",
  generate_image: "Image generation",
};

function formatAction(action: string) {
  return ACTION_LABELS[action] ?? action;
}

function formatModel(model: string) {
  // Shorten model IDs to readable names
  const map: Record<string, string> = {
    "llama-3.3-70b-versatile": "Llama 3.3 70B",
    "qwen-qwq-32b": "QwQ 32B",
    "gemma2-9b-it": "Gemma 2 9B",
    "mistral-small-latest": "Mistral Small",
    "codestral-latest": "Codestral",
    "gpt-4o-mini": "GPT-4o Mini",
    "gpt-4o": "GPT-4o",
    "gemini-2.0-flash": "Gemini Flash",
    "gemini-2.0-pro": "Gemini Pro",
    "claude-haiku-4-5-20251001": "Haiku 4.5",
    "claude-sonnet-4-20250514": "Sonnet 4",
  };
  return map[model] ?? model;
}

function formatCents(cents: number) {
  if (cents === 0) return "Free";
  return `$${(cents / 100).toFixed(3)}`;
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Today";
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatTokens(n: number) {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function SessionEditRow({ edit }: { edit: SessionEdit }) {
  const hasTokens = edit.inputTokens || edit.outputTokens;
  return (
    <div className="flex items-center justify-between py-1.5 text-xs">
      <div className="flex flex-col gap-0.5">
        <span>{formatAction(edit.action)}</span>
        <span className="text-muted-foreground">{formatModel(edit.model)}</span>
        {hasTokens && (
          <span className="text-muted-foreground text-[10px]">
            {formatTokens(edit.inputTokens ?? 0)} in · {formatTokens(edit.outputTokens ?? 0)} out
          </span>
        )}
      </div>
      <div className="flex flex-col items-end gap-0.5">
        <span className="font-mono">{formatCents(edit.costCents)}</span>
        <span className="text-muted-foreground">{formatTime(edit.timestamp)}</span>
      </div>
    </div>
  );
}

function HistoryRow({ record }: { record: UsageRecord }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-xs">
      <div className="flex flex-col gap-0.5">
        <span>{formatAction(record.action)}</span>
        <span className="text-muted-foreground">{formatModel(record.model)}</span>
      </div>
      <span className="font-mono">{formatCents(record.costCents)}</span>
    </div>
  );
}

export function CostReceipt() {
  const { sessionCostCents, sessionEdits } = useEditorStore();
  const [history, setHistory] = useState<UsageRecord[] | null>(null);
  const [totalCents, setTotalCents] = useState(0);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open || history !== null) return;
    setLoading(true);
    fetch("/api/usage")
      .then((r) => r.json())
      .then((data) => {
        setHistory(data.records ?? []);
        setTotalCents(data.totalCents ?? 0);
      })
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, [open, history]);

  // Group history by date
  const historyByDate = (history ?? []).reduce<Record<string, UsageRecord[]>>((acc, r) => {
    const key = formatDate(r.createdAt);
    (acc[key] ??= []).push(r);
    return acc;
  }, {});

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className="text-xs text-muted-foreground whitespace-nowrap font-mono cursor-pointer hover:text-foreground transition-colors"
      >
        ${(sessionCostCents / 100).toFixed(3)}
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0 max-h-96 overflow-y-auto">
        {/* Session section */}
        <div className="px-3 pt-3 pb-2">
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-2">
            This session
          </div>
          {sessionEdits.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">No AI actions yet</p>
          ) : (
            <div className="divide-y">
              {sessionEdits.map((edit, i) => (
                <SessionEditRow key={i} edit={edit} />
              ))}
            </div>
          )}
          <div className="flex items-center justify-between pt-2 mt-1 border-t text-xs font-medium">
            <span>Session total</span>
            <span className="font-mono">{formatCents(sessionCostCents)}</span>
          </div>
        </div>

        {/* History section */}
        <div className="border-t px-3 pt-2 pb-3">
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-2">
            History
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          ) : (history ?? []).length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">No usage history</p>
          ) : (
            <>
              {Object.entries(historyByDate).map(([date, records]) => (
                <div key={date} className="mb-2">
                  <div className="text-[10px] text-muted-foreground font-medium mb-1">{date}</div>
                  <div className="divide-y">
                    {records.map((r) => (
                      <HistoryRow key={r.id} record={r} />
                    ))}
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between pt-2 mt-1 border-t text-xs font-medium">
                <span>All-time total</span>
                <span className="font-mono">{formatCents(totalCents)}</span>
              </div>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
