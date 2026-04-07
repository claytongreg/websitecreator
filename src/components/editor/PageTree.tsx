"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, FileText } from "lucide-react";

interface PageInfo {
  slug: string;
  title: string;
}

interface Props {
  siteId: string;
  pages: PageInfo[];
  currentSlug: string;
  siteName: string;
}

export function PageTree({ siteId, pages, currentSlug, siteName }: Props) {
  return (
    <div className="w-56 border-r flex flex-col">
      <div className="p-3 border-b">
        <h3 className="font-medium text-sm truncate">{siteName}</h3>
        <p className="text-xs text-muted-foreground">Pages</p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {pages.map((page) => (
            <Link
              key={page.slug}
              href={`/editor/${siteId}/${page.slug}`}
              className={`flex items-center gap-2 px-3 py-2 rounded text-sm ${
                page.slug === currentSlug
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              }`}
            >
              <FileText className="w-3 h-3 shrink-0" />
              {page.title}
            </Link>
          ))}
        </div>
      </ScrollArea>

      <div className="p-2 border-t">
        <Button variant="ghost" size="sm" className="w-full justify-start">
          <Plus className="w-3 h-3 mr-2" />
          Add Page
        </Button>
      </div>
    </div>
  );
}
