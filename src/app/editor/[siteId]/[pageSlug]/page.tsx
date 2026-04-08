"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { EditorCanvas } from "@/components/editor/EditorCanvas";
import { FloatingToolbar } from "@/components/editor/FloatingToolbar";
import { AIPromptBar } from "@/components/editor/AIPromptBar";
import { PageTree } from "@/components/editor/PageTree";
import { useEditorStore } from "@/lib/editor/store";
import { ThemePanel } from "@/components/editor/ThemePanel";
import { PropertiesPanel } from "@/components/editor/PropertiesPanel";
import { AddContentPanel } from "@/components/editor/AddContentPanel";
import { generateThemeCss, DEFAULT_THEME } from "@/lib/editor/theme-css";
import type { ThemeSettings } from "@/types";
import { ArrowLeft, Save, Eye, Code, Palette, Undo2, Redo2 } from "lucide-react";
import { toast } from "sonner";

interface SiteData {
  id: string;
  name: string;
  subdomain: string;
  themeSettings: ThemeSettings | null;
  pages: { slug: string; title: string; html: string; css: string | null }[];
}

export default function EditorPage() {
  const params = useParams<{ siteId: string; pageSlug: string }>();
  const { siteId, pageSlug } = params;
  const [site, setSite] = useState<SiteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCode, setShowCode] = useState(false);
  const [saving, setSaving] = useState(false);
  const { html, setHtml, setCss, theme, setTheme, showThemePanel, setShowThemePanel, addEdit, undo, redo } = useEditorStore();
  const canUndo = useEditorStore((s) => s.historyIndex >= 0);
  const canRedo = useEditorStore((s) => s.historyIndex < s.history.length - 1);
  const selectedElement = useEditorStore((s) => s.selectedElement);
  const codeRef = useRef<HTMLTextAreaElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        useEditorStore.getState().undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && e.shiftKey) {
        e.preventDefault();
        useEditorStore.getState().redo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "y") {
        e.preventDefault();
        useEditorStore.getState().redo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Show undo toast after actions
  useEffect(() => {
    const unsub = useEditorStore.subscribe(
      (state, prevState) => {
        if (state.historyIndex > prevState.historyIndex && state.historyIndex >= 0) {
          toast("Action applied", {
            action: {
              label: "Undo",
              onClick: () => useEditorStore.getState().undo(),
            },
            duration: 3000,
          });
        }
      }
    );
    return unsub;
  }, []);

  // Seed session cost from site generation
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cost = params.get("generationCost");
    const genModel = params.get("generationModel");
    if (cost) {
      addEdit({
        action: "generate_site",
        model: genModel ?? "unknown",
        costCents: parseFloat(cost),
        timestamp: Date.now(),
      });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [addEdit]);

  // Fetch site data
  useEffect(() => {
    fetch(`/api/sites?id=${siteId}`)
      .then((r) => r.json())
      .then((data) => {
        setSite(data.site);
        if (data.site?.themeSettings) {
          setTheme(data.site.themeSettings as ThemeSettings);
        }
        const page = data.site?.pages?.find(
          (p: { slug: string }) => p.slug === pageSlug
        );
        if (page) {
          setHtml(page.html);
          setCss(page.css ?? "");
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [siteId, pageSlug, setHtml, setCss]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const themeCss = generateThemeCss(theme);
      await Promise.all([
        fetch("/api/pages", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ siteId, slug: pageSlug, html, css: themeCss }),
        }),
        fetch("/api/sites", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: siteId, themeSettings: theme }),
        }),
      ]);
      toast.success("Page saved");
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleAiEditFocus = () => {
    const input = document.querySelector<HTMLInputElement>(
      '[placeholder*="Edit"], [placeholder*="Describe"]'
    );
    input?.focus();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-muted-foreground">
        Loading editor...
      </div>
    );
  }

  if (!site) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Site not found</p>
          <Link href="/dashboard" className={buttonVariants()}>
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Top toolbar */}
      <header className="border-b px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <span className="font-medium text-sm">{site.name}</span>
          <span className="text-xs text-muted-foreground">
            / {pageSlug}
          </span>
          <div className="w-px h-5 bg-border mx-1" />
          <Button
            variant="ghost"
            size="sm"
            onClick={undo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={redo}
            disabled={!canRedo}
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo2 className="w-4 h-4" />
          </Button>
          <div className="w-px h-5 bg-border mx-1" />
          <AddContentPanel iframeRef={iframeRef} />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={showThemePanel ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setShowThemePanel(!showThemePanel)}
          >
            <Palette className="w-4 h-4 mr-1" />
            Theme
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowCode(!showCode)}
          >
            <Code className="w-4 h-4 mr-1" />
            {showCode ? "Visual" : "Code"}
          </Button>
          <Button variant="ghost" size="sm">
            <Eye className="w-4 h-4 mr-1" />
            Preview
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-1" />
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </header>

      {/* Main editor area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Page tree sidebar */}
        <PageTree
          siteId={siteId}
          pages={site.pages.map((p) => ({ slug: p.slug, title: p.title }))}
          currentSlug={pageSlug}
          siteName={site.name}
        />

        {/* Canvas or code editor */}
        {showCode ? (
          <div className="flex-1 p-4">
            <textarea
              ref={codeRef}
              className="w-full h-full font-mono text-sm p-4 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              spellCheck={false}
            />
          </div>
        ) : (
          <EditorCanvas iframeRef={iframeRef} />
        )}

        {!showCode && selectedElement && <PropertiesPanel iframeRef={iframeRef} />}
        {showThemePanel && <ThemePanel />}
      </div>

      {/* Floating toolbar (positioned near selected element) */}
      {!showCode && (
        <FloatingToolbar iframeRef={iframeRef} onAiEdit={handleAiEditFocus} siteId={siteId} />
      )}

      {/* AI Prompt Bar */}
      <AIPromptBar siteId={siteId} pageSlug={pageSlug} />
    </div>
  );
}
