import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { generatePageWithAI } from "../route";
import { GENERATION_MODEL_IDS } from "@/lib/models";

// Allow up to 5 minutes for multi-page generation
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid request body" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const name = body.name as string;
  const description = body.description as string;
  const businessType = body.businessType as string;
  const pages = body.pages as unknown[];
  const inspirations = body.inspirations as {
    url: string;
    style: { colors: string[]; fonts: { family: string; weight?: string; usage?: string }[]; layout: string; mood: string };
  }[] | undefined;
  const style = body.style as { colors?: string[]; fonts?: { heading: string; body: string }; mood?: string } | undefined;
  const model = (body.model as string) || "claude-opus-4-20250514";

  // Only premium-tier models are allowed for initial site generation
  if (!GENERATION_MODEL_IDS.has(model)) {
    return new Response(
      JSON.stringify({ error: "Site generation requires a premium-tier model" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Generate subdomain from name
  const subdomain = (name as string)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30);

  let finalSubdomain: string;
  let user: { id: string; email: string; name: string | null };

  try {
    const existing = await db.site.findUnique({ where: { subdomain } });
    finalSubdomain = existing
      ? `${subdomain}-${Date.now().toString(36)}`
      : subdomain;

    // Find or create demo user
    let found = await db.user.findFirst();
    if (!found) {
      found = await db.user.create({
        data: { email: "demo@echowebo.com", name: "Demo User" },
      });
    }
    user = found;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown database error";
    console.error("Database error during site generation setup:", message);
    return new Response(
      JSON.stringify({
        error: `Database error: ${message}. Make sure DATABASE_URL is set in .env and you have run "npx prisma db push".`,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
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

          // 90s timeout per page to avoid hanging forever
          const result = await Promise.race([
            generatePageWithAI({
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
            }),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error(`Page "${fp.title}" timed out after 90 seconds`)), 90_000)
            ),
          ]);

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
              create: (inspirations ?? []).map((insp) => ({
                sourceUrl: insp.url,
                colors: insp.style.colors,
                fonts: insp.style.fonts,
                layout: insp.style.layout,
                mood: insp.style.mood,
              })),
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
