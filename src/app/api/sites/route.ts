import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { blankTemplate } from "@/lib/editor/templates";

// GET /api/sites — list all sites or get a specific one
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");

  if (id) {
    // TODO: Add auth - for now return site by ID
    const site = await db.site.findUnique({
      where: { id },
      include: { pages: { orderBy: { order: "asc" } } },
    });
    return NextResponse.json({ site });
  }

  // TODO: Add auth - for now return all sites
  const sites = await db.site.findMany({
    include: { pages: { select: { slug: true } } },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ sites });
}

// POST /api/sites — create a new site
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, description, businessType, pages, inspirations, style } = body;

  // Generate subdomain from name
  const subdomain = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30);

  // Ensure subdomain is unique
  const existing = await db.site.findUnique({ where: { subdomain } });
  const finalSubdomain = existing
    ? `${subdomain}-${Date.now().toString(36)}`
    : subdomain;

  // TODO: Use AI to generate pages based on description, style, and inspirations
  // For now, use the blank template as a starting point
  const template = blankTemplate;

  // Build page data - create pages from selection or template
  const pageData = (pages ?? ["home"]).map((slug: string, i: number) => {
    const templatePage = template.pages.find((p) => p.slug === slug);
    return {
      slug: slug === "home" ? "index" : slug,
      title: slug.charAt(0).toUpperCase() + slug.slice(1),
      html:
        templatePage?.html ??
        generatePlaceholderHtml(
          slug,
          name,
          description,
          style
        ),
      order: i,
    };
  });

  // TODO: Replace with actual user ID from auth
  // For now, find or create a demo user
  let user = await db.user.findFirst();
  if (!user) {
    user = await db.user.create({
      data: {
        email: "demo@websitecreator.com",
        name: "Demo User",
      },
    });
  }

  const site = await db.site.create({
    data: {
      userId: user.id,
      name,
      subdomain: finalSubdomain,
      pages: {
        create: pageData,
      },
      inspirations: {
        create: (inspirations ?? []).map(
          (insp: {
            url: string;
            style: { colors: string[]; fonts: unknown[]; layout: string; mood: string };
          }) => ({
            sourceUrl: insp.url,
            colors: insp.style.colors,
            fonts: insp.style.fonts,
            layout: insp.style.layout,
            mood: insp.style.mood,
          })
        ),
      },
    },
    include: { pages: true },
  });

  return NextResponse.json({ site });
}

function generatePlaceholderHtml(
  slug: string,
  siteName: string,
  description?: string,
  style?: { colors?: string[]; fonts?: { heading: string; body: string }; mood?: string }
): string {
  const title = slug.charAt(0).toUpperCase() + slug.slice(1);
  const primaryColor = style?.colors?.[3] ?? "#000000";
  const bgColor = style?.colors?.[0] ?? "#ffffff";
  const headingFont = style?.fonts?.heading ?? "system-ui";
  const bodyFont = style?.fonts?.body ?? "system-ui";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — ${siteName}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { font-family: '${bodyFont}', system-ui, sans-serif; background: ${bgColor}; }
    h1, h2, h3 { font-family: '${headingFont}', system-ui, sans-serif; }
  </style>
</head>
<body class="min-h-screen">
  <header class="border-b">
    <nav class="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
      <a href="/" class="text-xl font-bold">${siteName}</a>
      <div class="flex gap-6 text-sm">
        <a href="/" class="hover:underline">Home</a>
        <a href="/about" class="hover:underline">About</a>
        <a href="/contact" class="hover:underline">Contact</a>
      </div>
    </nav>
  </header>

  <main class="max-w-6xl mx-auto px-6 py-16">
    <h1 class="text-4xl font-bold mb-4">${title}</h1>
    <p class="text-lg text-gray-600 mb-8">${description ?? `Welcome to the ${title} page of ${siteName}.`}</p>
    <p class="text-gray-500">Click any element to edit it, or use the AI prompt bar below to make changes.</p>
  </main>

  <footer class="border-t mt-auto">
    <div class="max-w-6xl mx-auto px-6 py-8 text-center text-gray-500 text-sm">
      &copy; 2026 ${siteName}. All rights reserved.
    </div>
  </footer>
</body>
</html>`;
}
