import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// PATCH /api/pages — reorder pages
export async function PATCH(req: NextRequest) {
  const { siteId, pages } = await req.json() as {
    siteId: string;
    pages: { slug: string; order: number }[];
  };

  await db.$transaction(
    pages.map((p) =>
      db.page.update({
        where: { siteId_slug: { siteId, slug: p.slug } },
        data: { order: p.order },
      })
    )
  );

  return NextResponse.json({ ok: true });
}

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
