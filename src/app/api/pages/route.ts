import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// PUT /api/pages — save page HTML
export async function PUT(req: NextRequest) {
  const { siteId, slug, html, css } = await req.json();

  const page = await db.page.findUnique({
    where: { siteId_slug: { siteId, slug } },
  });

  if (!page) {
    return NextResponse.json({ error: "Page not found" }, { status: 404 });
  }

  // Save current version before overwriting
  await db.pageVersion.create({
    data: {
      pageId: page.id,
      html: page.html,
      css: page.css,
    },
  });

  // Update the page
  const updated = await db.page.update({
    where: { id: page.id },
    data: {
      html,
      ...(css !== undefined ? { css } : {}),
      updatedAt: new Date(),
    },
  });

  return NextResponse.json({ page: updated });
}
