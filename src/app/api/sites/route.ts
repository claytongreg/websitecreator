import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/sites — list all sites or get a specific one
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");

  if (id) {
    const site = await db.site.findUnique({
      where: { id },
      include: { pages: { orderBy: { order: "asc" } } },
    });
    return NextResponse.json({ site });
  }

  const sites = await db.site.findMany({
    include: { pages: { select: { slug: true } } },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ sites });
}

// POST /api/sites — create a new site with AI-generated pages
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

  // Find or create demo user (TODO: replace with auth)
  let user = await db.user.findFirst();
  if (!user) {
    user = await db.user.create({
      data: { email: "demo@echowebo.com", name: "Demo User" },
    });
  }

  // Build navigation links from selected pages
  const pageList: string[] = pages ?? ["home"];
  const navLinks = pageList
    .map((slug: string) => {
      const href = slug === "home" ? "/" : `/${slug}`;
      const label = slug.charAt(0).toUpperCase() + slug.slice(1);
      return `<a href="${href}">${label}</a>`;
    })
    .join(" | ");

  // Generate each page with AI
  const pageData = [];
  for (let i = 0; i < pageList.length; i++) {
    const slug = pageList[i];
    const pageSlug = slug === "home" ? "index" : slug;
    const pageTitle = slug.charAt(0).toUpperCase() + slug.slice(1);

    const html = await generatePageWithAI({
      slug,
      pageTitle,
      siteName: name,
      description,
      businessType,
      style,
      inspirations,
      navLinks,
      allPages: pageList,
    });

    pageData.push({
      slug: pageSlug,
      title: pageTitle,
      html,
      order: i,
    });
  }

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

  // Log usage for the generation
  if (user) {
    await db.usageRecord.create({
      data: {
        userId: user.id,
        provider: "openai",
        model: "gpt-4o-mini",
        inputTokens: pageList.length * 800,
        outputTokens: pageList.length * 2000,
        costCents: pageList.length * 0.45, // 3x markup on ~$0.0015 base cost
        action: "generate_site",
      },
    });
  }

  return NextResponse.json({ site });
}

// ---------------------------------------------------------------------------
// AI page generation
// ---------------------------------------------------------------------------

interface PageGenContext {
  slug: string;
  pageTitle: string;
  siteName: string;
  description: string;
  businessType: string;
  style?: {
    colors?: string[];
    fonts?: { heading: string; body: string };
    mood?: string;
  };
  inspirations?: {
    url: string;
    style: { colors: string[]; fonts: { family: string }[]; mood: string };
  }[];
  navLinks: string;
  allPages: string[];
}

async function generatePageWithAI(ctx: PageGenContext): Promise<string> {
  const {
    slug,
    pageTitle,
    siteName,
    description,
    businessType,
    style,
    navLinks,
    allPages,
  } = ctx;

  const colors = style?.colors ?? ["#ffffff", "#f5f5f5", "#333333", "#0066cc", "#666666"];
  const headingFont = style?.fonts?.heading ?? "Inter";
  const bodyFont = style?.fonts?.body ?? "Inter";
  const mood = style?.mood ?? "professional and clean";

  // Build page-specific content guidance
  const pageGuidance = getPageGuidance(slug, businessType);

  const prompt = `Generate a complete, production-ready HTML page for a website.

SITE NAME: ${siteName}
BUSINESS: ${description}
BUSINESS TYPE: ${businessType || "General"}
PAGE: ${pageTitle} (${slug})
OTHER PAGES ON SITE: ${allPages.join(", ")}

STYLE:
- Color palette: background ${colors[0]}, surface ${colors[1]}, text ${colors[2]}, primary accent ${colors[3]}, secondary ${colors[4]}
- Heading font: ${headingFont}
- Body font: ${bodyFont}
- Mood: ${mood}

PAGE CONTENT GUIDANCE:
${pageGuidance}

REQUIREMENTS:
- Return a complete HTML document (<!DOCTYPE html> to </html>)
- Use Tailwind CSS via CDN (<script src="https://cdn.tailwindcss.com"></script>)
- Load Google Fonts for "${headingFont}" and "${bodyFont}" if they're not system fonts
- Use inline <style> for the color palette and font assignments
- Include a header with the site name and navigation links to all pages: ${navLinks}
- Include a footer with copyright
- Make it fully responsive (mobile-first)
- Use the color palette consistently — backgrounds, text colors, buttons, accents
- Generate realistic placeholder content appropriate for a ${businessType} business
- Include at least 3-4 content sections relevant to the page type
- Make it visually polished — proper spacing, hierarchy, visual rhythm
- Do NOT include any explanation or markdown — ONLY the raw HTML`;

  try {
    const { generateText } = await import("@/lib/ai");

    let result = "";
    for await (const chunk of generateText(prompt, {
      model: "gpt-4o-mini",
      temperature: 0.7,
      maxTokens: 4096,
    })) {
      result += chunk;
    }

    // Clean up
    let html = result.trim();
    if (html.startsWith("```html")) html = html.slice(7);
    if (html.startsWith("```")) html = html.slice(3);
    if (html.endsWith("```")) html = html.slice(0, -3);
    html = html.trim();

    // Validate it looks like HTML
    if (html.includes("<!DOCTYPE") || html.includes("<html")) {
      return html;
    }
  } catch (error) {
    console.error(`AI generation failed for page "${slug}":`, error);
  }

  // Fallback if AI fails
  return generateFallbackHtml(ctx);
}

function getPageGuidance(slug: string, businessType: string): string {
  const guides: Record<string, string> = {
    home: `This is the homepage — the first impression.
- Hero section with a compelling headline and call-to-action button
- Brief overview of what the business does (2-3 sentences)
- 3-4 feature/benefit cards or highlights
- Social proof section (testimonials or trust indicators)
- Final call-to-action section`,

    about: `This is the About page — tell the story.
- Hero with a page title and brief intro
- The story/mission of the business (2-3 paragraphs)
- Team section or founder story
- Values or principles (3-4 items)
- Timeline or milestones if relevant`,

    services: `This is the Services page — what the business offers.
- Page title and overview
- 3-6 service cards with titles, descriptions, and icons/emojis
- Pricing hints or "starting from" if appropriate
- Process section (how it works — 3-4 steps)
- Call-to-action to get in touch`,

    portfolio: `This is the Portfolio page — showcase work.
- Page title
- Grid of 6-9 project cards with placeholder images (use colored rectangles via Tailwind)
- Each card: project name, brief description, category tag
- Filter categories at the top`,

    blog: `This is the Blog page — content hub.
- Page title
- 4-6 blog post cards in a grid
- Each card: title, date, excerpt, read more link
- Sidebar or categories section`,

    contact: `This is the Contact page — how to reach the business.
- Page title and friendly intro
- Contact form with fields: Name, Email, Subject, Message, Submit button
- Contact information (address, phone, email)
- Business hours
- Map placeholder (a colored rectangle with "Map" text)`,

    pricing: `This is the Pricing page — plans and costs.
- Page title
- 3 pricing tier cards (Basic, Pro, Enterprise or similar)
- Each tier: name, price, feature list, CTA button
- Highlight the recommended tier
- FAQ section below`,

    faq: `This is the FAQ page — common questions.
- Page title
- 8-10 question/answer pairs relevant to a ${businessType} business
- Accordion-style layout (use details/summary HTML elements)
- Contact CTA at the bottom`,

    testimonials: `This is the Testimonials page — social proof.
- Page title
- 6-8 testimonial cards
- Each: quote text, person name, title/company, star rating
- Mix of short and longer testimonials`,

    team: `This is the Team page — the people.
- Page title and intro
- 4-6 team member cards
- Each: placeholder avatar (colored circle), name, role, brief bio
- Grid layout, responsive`,
  };

  return guides[slug] ?? `This is the ${slug} page. Include relevant content sections for a ${businessType} website.`;
}

function generateFallbackHtml(ctx: PageGenContext): string {
  const { pageTitle, siteName, description, style } = ctx;
  const bgColor = style?.colors?.[0] ?? "#ffffff";
  const textColor = style?.colors?.[2] ?? "#333333";
  const headingFont = style?.fonts?.heading ?? "system-ui";
  const bodyFont = style?.fonts?.body ?? "system-ui";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${pageTitle} — ${siteName}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { font-family: '${bodyFont}', system-ui, sans-serif; background: ${bgColor}; color: ${textColor}; }
    h1, h2, h3 { font-family: '${headingFont}', system-ui, sans-serif; }
  </style>
</head>
<body class="min-h-screen flex flex-col">
  <header class="border-b">
    <nav class="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
      <a href="/" class="text-xl font-bold">${siteName}</a>
    </nav>
  </header>
  <main class="flex-1 max-w-6xl mx-auto px-6 py-16">
    <h1 class="text-4xl font-bold mb-4">${pageTitle}</h1>
    <p class="text-lg mb-8">${description ?? `Welcome to the ${pageTitle} page.`}</p>
    <p>Click any element to edit, or use the AI prompt bar below.</p>
  </main>
  <footer class="border-t">
    <div class="max-w-6xl mx-auto px-6 py-8 text-center text-sm opacity-60">
      &copy; 2026 ${siteName}
    </div>
  </footer>
</body>
</html>`;
}
