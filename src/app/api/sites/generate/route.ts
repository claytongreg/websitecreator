import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { generatePageWithAI } from "../route";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    name,
    description,
    businessType,
    pages,
    inspirations,
    style,
    model: requestedModel,
  } = body;
  const model = requestedModel || "gpt-4o-mini";

  // Generate subdomain from name
  const subdomain = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30);

  const existing = await db.site.findUnique({ where: { subdomain } });
  const finalSubdomain = existing
    ? `${subdomain}-${Date.now().toString(36)}`
    : subdomain;

  // Find or create demo user
  let user = await db.user.findFirst();
  if (!user) {
    user = await db.user.create({
      data: { email: "demo@echowebo.com", name: "Demo User" },
    });
  }

  // Normalize pages
  interface FlatPageInput {
    slug: string;
    title: string;
    parentSlug: string | null;
    order: number;
  }

  let flatPages: FlatPageInput[];
  if (!pages || pages.length === 0) {
    flatPages = [{ slug: "home", title: "Home", parentSlug: null, order: 0 }];
  } else if (typeof pages[0] === "string") {
    flatPages = (pages as string[]).map((slug: string, i: number) => ({
      slug,
      title: slug.charAt(0).toUpperCase() + slug.slice(1),
      parentSlug: null,
      order: i,
    }));
  } else {
    flatPages = pages as FlatPageInput[];
  }

  // Build nav links
  const topLevel = flatPages.filter((p) => !p.parentSlug);

  function buildNavItem(page: FlatPageInput): string {
    const href = page.slug === "home" ? "/" : `/${page.slug}`;
    const children = flatPages.filter((p) => p.parentSlug === page.slug);
    if (children.length === 0) {
      return `<a href="${href}">${page.title}</a>`;
    }
    const childLinks = children.map((c) => buildNavItem(c)).join("");
    return `<div class="dropdown"><a href="${href}">${page.title}</a><div class="dropdown-menu">${childLinks}</div></div>`;
  }

  const navLinks = topLevel.map((page) => buildNavItem(page)).join(" | ");
  const totalPages = flatPages.length;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(data: Record<string, unknown>) {
        controller.enqueue(encoder.encode(JSON.stringify(data) + "\n"));
      }

      try {
        const pageData = [];
        let totalInputTokens = 0;
        let totalOutputTokens = 0;

        for (let i = 0; i < flatPages.length; i++) {
          const fp = flatPages[i];
          const pageSlug =
            fp.slug === "home" ? "index" : fp.slug.replace(/\//g, "-");

          // Send progress before generating each page
          send({
            type: "progress",
            page: fp.title,
            current: i + 1,
            total: totalPages,
          });

          const result = await generatePageWithAI({
            slug: fp.slug,
            pageTitle: fp.title,
            siteName: name,
            description,
            businessType,
            style,
            inspirations,
            navLinks,
            allPages: flatPages.map((p) => p.title),
            model,
          });

          totalInputTokens += result.inputTokens;
          totalOutputTokens += result.outputTokens;

          pageData.push({
            slug: pageSlug,
            title: fp.title,
            html: result.html,
            order: i,
          });
        }

        // Finalizing — save to database
        send({ type: "finalizing" });

        const site = await db.site.create({
          data: {
            userId: user.id,
            name,
            subdomain: finalSubdomain,
            pages: { create: pageData },
            inspirations: {
              create: (inspirations ?? []).map(
                (insp: {
                  url: string;
                  style: {
                    colors: string[];
                    fonts: unknown[];
                    layout: string;
                    mood: string;
                  };
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

        // Calculate cost from actual token usage
        const { estimateCost, getModel } = await import("@/lib/ai");
        const modelInfo = getModel(model);
        const costCents = estimateCost(model, totalInputTokens, totalOutputTokens);

        if (user) {
          await db.usageRecord.create({
            data: {
              userId: user.id,
              provider: modelInfo?.provider ?? "unknown",
              model,
              inputTokens: totalInputTokens,
              outputTokens: totalOutputTokens,
              costCents,
              action: "generate_site",
            },
          });
        }

        send({
          type: "complete",
          siteId: site.id,
          costCents,
          inputTokens: totalInputTokens,
          outputTokens: totalOutputTokens,
        });
      } catch (err) {
        send({
          type: "error",
          message: err instanceof Error ? err.message : "Generation failed",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
      "Cache-Control": "no-cache",
    },
  });
}
