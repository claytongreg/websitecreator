import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const maxDuration = 300;

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
  const { name, description, businessType, pages, inspirations, style, model: requestedModel } = body;
  const model = requestedModel || "gpt-4o-mini";

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

  // Normalize pages — accept both string[] (legacy) and FlatPage[]
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
    // Legacy string[] format
    flatPages = (pages as string[]).map((slug: string, i: number) => ({
      slug,
      title: slug.charAt(0).toUpperCase() + slug.slice(1),
      parentSlug: null,
      order: i,
    }));
  } else {
    flatPages = pages as FlatPageInput[];
  }

  // Build hierarchical navigation HTML (supports multi-level nesting)
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

  // Generate each page with AI
  const pageData = [];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  for (let i = 0; i < flatPages.length; i++) {
    const fp = flatPages[i];
    const pageSlug = fp.slug === "home" ? "index" : fp.slug.replace(/\//g, "-");

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

  // Log usage for the generation
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

  return NextResponse.json({
    site,
    costCents,
    inputTokens: totalInputTokens,
    outputTokens: totalOutputTokens,
  });
}

// PATCH /api/sites — update site settings (e.g. themeSettings)
export async function PATCH(req: NextRequest) {
  const { id, themeSettings } = await req.json();

  if (!id) {
    return NextResponse.json({ error: "Site id required" }, { status: 400 });
  }

  const updated = await db.site.update({
    where: { id },
    data: {
      ...(themeSettings !== undefined ? { themeSettings } : {}),
      updatedAt: new Date(),
    },
  });

  return NextResponse.json({ site: updated });
}

// ---------------------------------------------------------------------------
// AI page generation
// ---------------------------------------------------------------------------

export interface PageGenResult {
  html: string;
  inputTokens: number;
  outputTokens: number;
}

export interface PageGenContext {
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
  model: string;
}

export async function generatePageWithAI(ctx: PageGenContext): Promise<PageGenResult> {
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

  const prompt = `Generate a complete, production-ready HTML page for a website. This must look like a premium, high-end theme — the kind you'd see on ThemeForest's top sellers or 10web's AI builder. Rich, polished, modern, and full of content.

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

DESIGN SYSTEM (follow strictly — this creates a premium look):

ICONS:
- Use Lucide icons everywhere — NEVER use emoji icons.
- Usage: <i data-lucide="icon-name" class="w-6 h-6"></i>
- For feature cards use a styled icon wrapper: <div class="w-14 h-14 rounded-2xl bg-[${colors[3]}]/10 flex items-center justify-center mb-5"><i data-lucide="icon-name" class="w-7 h-7 text-[${colors[3]}]"></i></div>
- Common icons: rocket, lightbulb, shield-check, zap, target, star, users, bar-chart-3, check-circle, arrow-right, phone, mail, map-pin, clock, globe, heart, award, trending-up, layers, settings

NAVIGATION:
- Sticky glassmorphic header: sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-200/50 transition-all duration-300
- Logo uses font-bold text-xl with primary color
- Nav links: text-sm font-medium text-gray-600 hover:text-[${colors[3]}] transition-colors
- Include a CTA button in the nav: px-5 py-2 rounded-lg text-sm font-semibold bg-[${colors[3]}] text-white hover:opacity-90 transition

HERO SECTIONS:
- Use min-h-[80vh] flex items-center for hero impact
- Background image with GRADIENT overlay: bg-gradient-to-r from-black/70 via-black/50 to-transparent (not flat bg-black/50)
- Add an eyebrow label above the heading: <span class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur text-sm font-medium text-white/90 mb-6"><i data-lucide="sparkles" class="w-4 h-4"></i> Tagline here</span>
- Hero heading: text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1]
- Hero subtitle: text-lg md:text-xl text-white/80 max-w-2xl
- Hero CTA buttons: primary with shadow-lg shadow-[${colors[3]}]/25, and a ghost variant with border-white/30

SECTIONS:
- Generous spacing: py-20 md:py-32 vertical padding for breathing room
- Container: max-w-7xl mx-auto px-4 sm:px-6 lg:px-8
- Alternate backgrounds: use bg-gradient-to-b from-white to-gray-50/50 and plain ${colors[0]} alternating
- Each section starts with an eyebrow + heading combo:
  <div class="text-center mb-16">
    <span class="text-sm font-semibold tracking-widest uppercase text-[${colors[3]}]">Section Label</span>
    <h2 class="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mt-3">Section Heading</h2>
    <p class="text-lg text-gray-500 max-w-2xl mx-auto mt-4">Subtitle text here.</p>
  </div>
- Add decorative blur blobs behind key sections: <div class="absolute -top-40 -right-40 w-80 h-80 bg-[${colors[3]}]/5 rounded-full blur-3xl pointer-events-none"></div> (parent needs relative overflow-hidden)

CARDS:
- Modern card style: bg-white rounded-2xl border border-gray-100 p-8 hover:shadow-xl hover:shadow-gray-200/50 hover:-translate-y-1 transition-all duration-300 group
- Feature cards: add a colored top border: border-t-4 border-[${colors[3]}] (use on some, not all, for variety)
- Card icon should animate on hover: group-hover:scale-110 transition-transform
- Testimonial cards: add a large quote mark using a styled span: <span class="text-5xl text-[${colors[3]}]/20 font-serif leading-none">"</span>

BUTTONS:
- Primary: px-8 py-3.5 rounded-xl font-semibold bg-[${colors[3]}] text-white shadow-lg shadow-[${colors[3]}]/25 hover:shadow-xl hover:shadow-[${colors[3]}]/30 hover:-translate-y-0.5 transition-all duration-300 inline-flex items-center gap-2
- Add arrow icon to CTA buttons: <i data-lucide="arrow-right" class="w-4 h-4"></i>
- Ghost variant: px-8 py-3.5 rounded-xl font-semibold border-2 border-gray-200 text-gray-700 hover:border-[${colors[3]}] hover:text-[${colors[3]}] transition-all

TYPOGRAPHY:
- All headings: tracking-tight for modern feel
- Body text: text-gray-600 leading-relaxed (not raw ${colors[2]} everywhere — use the text color for headings, gray-600 for body)
- Hero h1: text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight
- Section h2: text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight
- Card h3: text-xl font-semibold
- Small text/labels: text-sm font-medium tracking-wide uppercase

IMAGES:
- Use https://picsum.photos/seed/{unique-seed}/{width}/{height} for ALL images
- Use different seed words per image
- Treatment: rounded-2xl object-cover with subtle ring: ring-1 ring-gray-200/50
- Use aspect-video for landscape images, aspect-square for portraits
- Hero images: no rounding (full-width background)

GRIDS:
- Card grids: grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8
- Two-column content: grid md:grid-cols-2 gap-16 items-center (generous gap)

SECTION DIVIDERS (use 1-2 per page for visual interest):
- Angled section transition using clip-path on a div: <div class="h-24 -mt-1" style="clip-path: polygon(0 0, 100% 60%, 100% 100%, 0 100%); background: ${colors[1]}"></div>
- Or a subtle wave SVG between sections

ANIMATIONS (add to inline <style>):
- @keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
- Apply to sections: style="animation: fadeInUp 0.7s ease-out both; animation-delay: 0.1s"
- Stagger delays on grid children: 0.1s, 0.2s, 0.3s etc.
- html { scroll-behavior: smooth; }

FOOTER:
- Rich multi-column footer with dark background (use ${colors[2]} or a very dark shade)
- 4 columns: Brand description, Quick Links, Services, Contact info
- Add social media icon row using Lucide icons (facebook, twitter, instagram, linkedin)
- Bottom bar with copyright and legal links, separated by border-t border-white/10

CONTENT REQUIREMENTS:
- Write realistic, professional placeholder text — NOT lorem ipsum. Write as if this is a real ${businessType} business.
- Every text paragraph must be 2-3 full sentences minimum.
- Feature/benefit descriptions must be specific and compelling, not generic.
- Include real-sounding names, titles, and testimonials where applicable.

TECHNICAL REQUIREMENTS:
- Return a complete HTML document (<!DOCTYPE html> to </html>)
- Use Tailwind CSS via CDN: <script src="https://cdn.tailwindcss.com"></script>
- Load Lucide Icons: <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.js"></script>
- At the very end of <body>, add: <script>lucide.createIcons();</script>
- Load Google Fonts for "${headingFont}" and "${bodyFont}" via <link> tag if they're not system fonts
- Inline <style> must include: html { scroll-behavior: smooth; } body { font-family: '${bodyFont}', system-ui, sans-serif; color: ${colors[2]}; background: ${colors[0]}; } h1,h2,h3,h4,h5,h6 { font-family: '${headingFont}', system-ui, sans-serif; } plus the @keyframes fadeInUp animation
- Include the glassmorphic sticky header with site name + navigation: ${navLinks}
- Include a rich 4-column dark footer
- Make it fully responsive (mobile-first)
- Use the color palette consistently — backgrounds, text, buttons, accents, borders
- Include at least 5-6 distinct content sections
- Do NOT include any explanation or markdown — ONLY the raw HTML`;

  try {
    const { generateText } = await import("@/lib/ai");

    let pageUsage = { inputTokens: 0, outputTokens: 0 };
    let result = "";
    for await (const chunk of generateText(prompt, {
      model: ctx.model,
      temperature: 0.5,
      maxTokens: 8192,
      onUsage: (usage) => { pageUsage = usage; },
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
      return { html, ...pageUsage };
    }
  } catch (error) {
    console.error(`AI generation failed for page "${slug}":`, error);
  }

  // Fallback if AI fails
  return { html: generateFallbackHtml(ctx), inputTokens: 0, outputTokens: 0 };
}

function getPageGuidance(slug: string, businessType: string): string {
  const guides: Record<string, string> = {
    home: `This is the homepage — the first impression. Must feel premium and high-end. Build with these sections IN ORDER:

1. HERO: Full-width bg image (picsum.photos/seed/hero-home/1400/700) with gradient overlay (from-black/70 via-black/50 to-transparent). Eyebrow badge above heading. Massive heading (text-5xl md:text-6xl lg:text-7xl tracking-tight). 2-sentence subtitle in text-white/80. Two CTA buttons — primary with shadow + arrow-right icon, ghost with border-white/30. Use min-h-[80vh].

2. FEATURES/BENEFITS: Eyebrow label + section heading centered. 3-4 cards in a grid. Each card uses the modern card style with Lucide icon in a styled wrapper div, bold title, and 2-3 sentence description. Example:
   <div class="bg-white rounded-2xl border border-gray-100 p-8 hover:shadow-xl hover:shadow-gray-200/50 hover:-translate-y-1 transition-all duration-300 group" style="animation: fadeInUp 0.7s ease-out both; animation-delay: 0.1s">
     <div class="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-5"><i data-lucide="rocket" class="w-7 h-7 text-primary group-hover:scale-110 transition-transform"></i></div>
     <h3 class="text-xl font-semibold mb-3">Feature Title</h3>
     <p class="text-gray-600 leading-relaxed">Description...</p>
   </div>

3. ABOUT PREVIEW: Two-column layout (gap-16) — image on left (picsum.photos/seed/about-preview/600/400 with rounded-2xl ring-1 ring-gray-200/50), text on right with eyebrow label, heading, 2 paragraphs in text-gray-600, and "Learn More" button with arrow-right icon.

4. SOCIAL PROOF: Eyebrow + heading. 3 testimonial cards with large decorative quote mark (text-5xl text-primary/20 font-serif), quote text, person name, role, and star icons using Lucide star icon.

5. STATS/NUMBERS: Full-width section with subtle gradient bg. 4 stats in a grid, each with a large bold number (text-4xl md:text-5xl font-bold tracking-tight), label text, and a Lucide icon.

6. CTA SECTION: Use clip-path angled top edge. Primary accent background with gradient. Compelling heading, subtitle, big CTA button with arrow-right icon + shadow.`,

    about: `This is the About page. Build with these sections:

1. HERO: Background image (picsum.photos/seed/about-hero/1400/600) with gradient overlay, eyebrow badge, "About Us" title, and mission statement. Use min-h-[60vh].

2. OUR STORY: Two-column (gap-16) — large image (picsum.photos/seed/our-story/600/500 rounded-2xl ring-1 ring-gray-200/50) on one side, eyebrow label + heading + 3 paragraphs on the other. Use real-sounding founding narrative.

3. MISSION & VALUES: Centered eyebrow + heading, then 4 value cards in a 2x2 grid. Each has Lucide icon in a styled wrapper (heart, shield-check, target, users), title, and description. Use border-t-4 accent on cards.

4. TEAM: Centered eyebrow + heading. 3-4 team member cards with square portrait (picsum.photos/seed/person{N}/300/300, rounded-2xl), name, title, short bio, and social icons row (Lucide: twitter, linkedin). Add hover shadow effect.

5. MILESTONES: A modern timeline with left-side dates and right-side content cards, connected by a vertical line in primary color. 4-5 milestones with Lucide icons.

6. CTA: Angled/gradient background. "Want to work with us?" with contact button + arrow-right icon.`,

    services: `This is the Services page. Build with these sections:

1. HERO: Background image (picsum.photos/seed/services-hero/1400/600) with gradient overlay, eyebrow badge, "Our Services" headline + intro. Use min-h-[60vh].

2. SERVICES GRID: Centered eyebrow + heading. 4-6 service cards with Lucide icons (layers, code, palette, megaphone, bar-chart-3, settings) in styled wrappers, titles, descriptions (3 sentences), and "Learn More" links with arrow-right icon. Modern card style with some having border-t-4 accent.

3. HOW IT WORKS: Centered eyebrow + heading. 3-4 numbered steps in a horizontal flow. Each: large number in primary color (text-6xl font-bold text-primary/20 behind), Lucide icon, title, description. Connect visually with a dashed border or gradient line.

4. WHY CHOOSE US: Two-column (gap-16) — image (picsum.photos/seed/why-us/600/400 rounded-2xl ring-1 ring-gray-200/50) + list of 4-5 benefits each with Lucide check-circle icon in primary color, benefit title in font-semibold, and description text.

5. PRICING PREVIEW: 3 pricing tier cards. Middle: ring-2 ring-primary scale-105 "Most Popular" badge. Each: plan name, price (text-4xl font-bold), feature list with Lucide check icons, CTA button. Popular tier gets filled button, others outline.

6. CTA: Gradient/angled section with CTA button + arrow-right icon.`,

    portfolio: `This is the Portfolio page. Build with these sections:

1. HERO: Background image with gradient overlay, eyebrow badge, "Our Work" headline + subtitle. min-h-[60vh].

2. FILTER BAR: A row of category pills (All, Branding, Web Design, Marketing). Active pill gets primary bg, others get bg-gray-100. Use rounded-full px-6 py-2 font-medium.

3. PROJECT GRID: 6-9 project cards in a 3-column grid. Each card: project image (picsum.photos/seed/project{N}/600/400 aspect-video rounded-2xl), overlay with gradient on hover revealing project name + Lucide arrow-up-right icon, category tag badge (rounded-full bg-primary/10 text-primary text-xs px-3 py-1).

4. FEATURED PROJECT: Full-width two-column — large image, project details with eyebrow + heading, description, client name, results stats in a mini-grid.

5. CTA: "Have a project in mind?" with gradient bg and CTA button + arrow-right icon.`,

    blog: `This is the Blog page. Build with these sections:

1. HERO: Centered eyebrow + "Our Blog" heading + subtitle. Clean, no background image. Add decorative blur blob.

2. FEATURED POST: Full-width card with large image (picsum.photos/seed/blog-featured/1200/500 rounded-2xl), category badge (rounded-full bg-primary/10 text-primary), title in text-2xl font-bold, excerpt, author avatar (rounded-full) + name, Lucide calendar icon + date, Lucide clock icon + read time.

3. POST GRID: 6 blog post cards in 3-column grid. Each: image (picsum.photos/seed/blog{N}/600/400 rounded-2xl aspect-video), category badge, title, date with Lucide calendar icon, excerpt, "Read More" with arrow-right icon. Modern card style with hover effects.

4. CATEGORIES: Tag cloud or category list with Lucide tag icons and counts.

5. NEWSLETTER: Gradient background section with Lucide mail icon, heading, description, styled input + subscribe button with Lucide send icon.`,

    contact: `This is the Contact page. Build with these sections:

1. HERO: Centered eyebrow + "Get in Touch" heading + welcoming subtitle. Decorative blur blobs.

2. CONTACT GRID: Two-column (gap-16).
   Left: Modern contact form — inputs with bg-gray-50 border border-gray-200 rounded-xl p-4 focus:ring-2 focus:ring-primary/20 focus:border-primary transition. Fields: Name, Email, Phone, Subject, Message textarea. Submit button with Lucide send icon.
   Right: 4 contact info cards stacked vertically, each with Lucide icon (map-pin, phone, mail, clock) in styled wrapper, label, and value. Modern card style.

3. MAP PLACEHOLDER: Full-width rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 h-80 with Lucide map-pin icon centered and "View on Maps" text.

4. FAQ: Eyebrow + heading. 4-5 questions using styled details/summary with Lucide chevron-down icon, rounded-xl border cards, smooth transitions.`,

    pricing: `This is the Pricing page. Build with these sections:

1. HERO: Centered eyebrow + "Simple, Transparent Pricing" heading + subtitle. Decorative blur blobs.

2. PRICING TOGGLE: Monthly/Annual toggle using styled pills with bg-gray-100 rounded-full container, active state gets bg-white shadow. Visual only.

3. PRICING CARDS: 3 tiers. Middle: ring-2 ring-primary scale-105 relative with "Most Popular" absolute badge. Each: plan name, price (text-5xl font-bold tracking-tight), /month label, feature list with Lucide check icons in primary, CTA button. Popular gets filled primary button with shadow, others get outline.

4. COMPARISON TABLE: Feature table with rounded-2xl overflow-hidden. Header row with tier names. Rows alternate bg. Use Lucide check and x icons for features.

5. FAQ: 6-8 pricing Q&A in accordion cards with Lucide chevron-down icon.

6. CTA: "Need a custom plan?" section with gradient bg, Lucide message-circle icon, and contact button.`,

    faq: `This is the FAQ page. Build with these sections:

1. HERO: Centered eyebrow + "Frequently Asked Questions" heading + subtitle. Lucide help-circle icon. Decorative blur blobs.

2. FAQ CATEGORIES: Category filter pills — All, General, Pricing, Technical. Styled like portfolio filter bar.

3. FAQ ITEMS: 10-12 questions in styled cards (bg-white rounded-2xl border border-gray-100 mb-4). Use details/summary with Lucide chevron-down that rotates on open. Summary: cursor-pointer font-semibold p-6 flex justify-between items-center. Answer: px-6 pb-6 text-gray-600. Write realistic Q&A for a ${businessType} business. 2-3 sentence answers.

4. STILL HAVE QUESTIONS: Gradient bg section with Lucide message-circle icon, heading, and CTA buttons for email + phone with Lucide icons.`,

    testimonials: `This is the Testimonials page. Build with these sections:

1. HERO: Background image with gradient overlay, eyebrow badge, "What Our Clients Say" headline. min-h-[60vh].

2. FEATURED TESTIMONIAL: Large centered card with decorative quote mark (text-6xl text-primary/20 font-serif), big quote text, author photo (picsum.photos/seed/client-featured/100/100 rounded-full ring-4 ring-primary/10), name, title, company, 5 Lucide star icons filled in primary.

3. TESTIMONIAL GRID: 6 cards in 2-3 column grid. Each: decorative quote mark, quote text (2-3 sentences), row of Lucide star icons, author name, role/company, small avatar. Modern card style. Vary quote lengths. Staggered fadeInUp animations.

4. LOGOS: "Trusted By" section — row of company names in text-2xl font-bold text-gray-300 flex items-center justify-center gap-12.

5. CTA: Gradient bg "Join our happy clients" with Lucide heart icon and CTA button.`,

    team: `This is the Team page. Build with these sections:

1. HERO: Background image with gradient overlay, eyebrow badge, "Meet Our Team" headline + subtitle. min-h-[60vh].

2. LEADERSHIP: Centered eyebrow + heading. 2-3 leader cards — portrait (picsum.photos/seed/leader{N}/400/400, rounded-2xl), name, title, 3-sentence bio, social row with Lucide icons (twitter, linkedin, mail). Hover shadow and scale effect.

3. TEAM GRID: 6 cards in 3-column grid. Each: square portrait (picsum.photos/seed/team{N}/300/300 rounded-2xl), name, role, one-line bio. On hover: shadow + overlay with social Lucide icons (twitter, linkedin). Staggered animations.

4. CULTURE: Two-column (gap-16) — team photo (picsum.photos/seed/team-culture/800/500 rounded-2xl ring-1 ring-gray-200/50) + eyebrow + heading + text about culture/values + 3 value highlights with Lucide icons.

5. JOIN US: Gradient bg "We're Hiring" CTA with Lucide briefcase icon, heading, and apply button + arrow-right icon.`,
  };

  return guides[slug] ?? `This is the ${slug} page. Include at least 5 rich content sections with images from picsum.photos, Lucide icons (NEVER emoji), eyebrow labels above headings, modern cards with border and hover effects, gradient overlays on hero, and professional placeholder text for a ${businessType} website. Follow the design system specified above.`;
}

function generateFallbackHtml(ctx: PageGenContext): string {
  const { pageTitle, siteName, description, style, navLinks } = ctx;
  const colors = style?.colors ?? ["#ffffff", "#f5f5f5", "#333333", "#0066cc", "#666666"];
  const headingFont = style?.fonts?.heading ?? "system-ui";
  const bodyFont = style?.fonts?.body ?? "system-ui";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${pageTitle} — ${siteName}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.js"></script>
  <style>
    html { scroll-behavior: smooth; }
    body { font-family: '${bodyFont}', system-ui, sans-serif; color: ${colors[2]}; background: ${colors[0]}; }
    h1, h2, h3, h4, h5, h6 { font-family: '${headingFont}', system-ui, sans-serif; }
    @keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
  </style>
</head>
<body class="min-h-screen flex flex-col">
  <!-- Header -->
  <header class="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-200/50 transition-all duration-300">
    <nav class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
      <a href="/" class="text-xl font-bold" style="color: ${colors[3]}">${siteName}</a>
      <div class="flex items-center gap-8 text-sm font-medium text-gray-600">${navLinks}</div>
      <a href="/contact" class="hidden md:inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white transition hover:opacity-90" style="background: ${colors[3]}">Contact Us <i data-lucide="arrow-right" class="w-4 h-4"></i></a>
    </nav>
  </header>

  <!-- Hero -->
  <section class="relative min-h-[80vh] flex items-center" style="background: url('https://picsum.photos/seed/fallback-hero/1400/700') center/cover no-repeat">
    <div class="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent"></div>
    <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-white">
      <span class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur text-sm font-medium text-white/90 mb-6"><i data-lucide="sparkles" class="w-4 h-4"></i> Welcome to ${siteName}</span>
      <h1 class="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-6">${pageTitle}</h1>
      <p class="text-lg md:text-xl text-white/80 max-w-2xl mb-8">${description ?? `We deliver exceptional results for our clients every day. Experience the difference that expertise and dedication can make.`}</p>
      <div class="flex flex-wrap gap-4">
        <a href="#features" class="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-white transition-all duration-300 hover:-translate-y-0.5" style="background: ${colors[3]}; box-shadow: 0 10px 25px -5px ${colors[3]}40">Get Started <i data-lucide="arrow-right" class="w-4 h-4"></i></a>
        <a href="#about" class="px-8 py-3.5 rounded-xl font-semibold border-2 border-white/30 text-white hover:bg-white/10 transition-all duration-300">Learn More</a>
      </div>
    </div>
  </section>

  <!-- Features -->
  <section id="features" class="relative py-20 md:py-32 overflow-hidden" style="background: linear-gradient(to bottom, ${colors[1]}, ${colors[0]})">
    <div class="absolute -top-40 -right-40 w-80 h-80 rounded-full blur-3xl pointer-events-none" style="background: ${colors[3]}10"></div>
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="text-center mb-16">
        <span class="text-sm font-semibold tracking-widest uppercase" style="color: ${colors[3]}">Why Choose Us</span>
        <h2 class="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mt-3">What We Offer</h2>
        <p class="text-lg text-gray-500 max-w-2xl mx-auto mt-4">Discover the features and services that set us apart from the competition.</p>
      </div>
      <div class="grid md:grid-cols-3 gap-8">
        <div class="bg-white rounded-2xl border border-gray-100 p-8 hover:shadow-xl hover:shadow-gray-200/50 hover:-translate-y-1 transition-all duration-300 group" style="animation: fadeInUp 0.7s ease-out both; animation-delay: 0.1s">
          <div class="w-14 h-14 rounded-2xl flex items-center justify-center mb-5" style="background: ${colors[3]}10"><i data-lucide="zap" class="w-7 h-7 group-hover:scale-110 transition-transform" style="color: ${colors[3]}"></i></div>
          <h3 class="text-xl font-semibold mb-3">Fast & Reliable</h3>
          <p class="text-gray-600 leading-relaxed">Our platform is built for speed and reliability. Experience lightning-fast performance that keeps your business running smoothly around the clock.</p>
        </div>
        <div class="bg-white rounded-2xl border border-gray-100 p-8 hover:shadow-xl hover:shadow-gray-200/50 hover:-translate-y-1 transition-all duration-300 group" style="animation: fadeInUp 0.7s ease-out both; animation-delay: 0.2s; border-top: 4px solid ${colors[3]}">
          <div class="w-14 h-14 rounded-2xl flex items-center justify-center mb-5" style="background: ${colors[3]}10"><i data-lucide="lightbulb" class="w-7 h-7 group-hover:scale-110 transition-transform" style="color: ${colors[3]}"></i></div>
          <h3 class="text-xl font-semibold mb-3">Innovative Solutions</h3>
          <p class="text-gray-600 leading-relaxed">We leverage cutting-edge technology to deliver creative solutions. Our team stays ahead of industry trends to give you a competitive advantage.</p>
        </div>
        <div class="bg-white rounded-2xl border border-gray-100 p-8 hover:shadow-xl hover:shadow-gray-200/50 hover:-translate-y-1 transition-all duration-300 group" style="animation: fadeInUp 0.7s ease-out both; animation-delay: 0.3s">
          <div class="w-14 h-14 rounded-2xl flex items-center justify-center mb-5" style="background: ${colors[3]}10"><i data-lucide="award" class="w-7 h-7 group-hover:scale-110 transition-transform" style="color: ${colors[3]}"></i></div>
          <h3 class="text-xl font-semibold mb-3">Premium Quality</h3>
          <p class="text-gray-600 leading-relaxed">Quality is at the heart of everything we do. From initial concept to final delivery, we maintain the highest standards of excellence.</p>
        </div>
      </div>
    </div>
  </section>

  <!-- About Preview -->
  <section id="about" class="py-20 md:py-32">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="grid md:grid-cols-2 gap-16 items-center">
        <img src="https://picsum.photos/seed/fallback-about/600/400" alt="About us" class="rounded-2xl object-cover w-full ring-1 ring-gray-200/50" style="animation: fadeInUp 0.7s ease-out both" />
        <div style="animation: fadeInUp 0.7s ease-out both; animation-delay: 0.2s">
          <span class="text-sm font-semibold tracking-widest uppercase" style="color: ${colors[3]}">Our Story</span>
          <h2 class="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mt-3 mb-6">About ${siteName}</h2>
          <p class="text-lg text-gray-600 leading-relaxed mb-4">${description ?? `${siteName} was founded with a simple mission: to provide outstanding service and exceptional value to our clients.`}</p>
          <p class="text-lg text-gray-600 leading-relaxed mb-8">With years of experience in the industry, our dedicated team brings expertise, passion, and commitment to every project we undertake.</p>
          <a href="/about" class="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-semibold text-white transition-all duration-300 hover:-translate-y-0.5" style="background: ${colors[3]}; box-shadow: 0 10px 25px -5px ${colors[3]}40">Learn More About Us <i data-lucide="arrow-right" class="w-4 h-4"></i></a>
        </div>
      </div>
    </div>
  </section>

  <!-- Stats -->
  <section class="py-20 md:py-28" style="background: linear-gradient(to bottom, ${colors[1]}, ${colors[0]})">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
        <div style="animation: fadeInUp 0.7s ease-out both; animation-delay: 0.1s">
          <div class="text-4xl md:text-5xl font-bold tracking-tight mb-2" style="color: ${colors[3]}">500+</div>
          <div class="text-gray-500 font-medium">Happy Clients</div>
        </div>
        <div style="animation: fadeInUp 0.7s ease-out both; animation-delay: 0.2s">
          <div class="text-4xl md:text-5xl font-bold tracking-tight mb-2" style="color: ${colors[3]}">10+</div>
          <div class="text-gray-500 font-medium">Years Experience</div>
        </div>
        <div style="animation: fadeInUp 0.7s ease-out both; animation-delay: 0.3s">
          <div class="text-4xl md:text-5xl font-bold tracking-tight mb-2" style="color: ${colors[3]}">99%</div>
          <div class="text-gray-500 font-medium">Satisfaction Rate</div>
        </div>
        <div style="animation: fadeInUp 0.7s ease-out both; animation-delay: 0.4s">
          <div class="text-4xl md:text-5xl font-bold tracking-tight mb-2" style="color: ${colors[3]}">24/7</div>
          <div class="text-gray-500 font-medium">Support Available</div>
        </div>
      </div>
    </div>
  </section>

  <!-- CTA -->
  <div class="h-24 -mb-1" style="clip-path: polygon(0 0, 100% 60%, 100% 100%, 0 100%); background: ${colors[3]}"></div>
  <section class="py-20 md:py-28" style="background: ${colors[3]}">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
      <h2 class="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-4">Ready to Get Started?</h2>
      <p class="text-xl mb-8 text-white/80 max-w-2xl mx-auto">Join hundreds of satisfied clients who have transformed their business with our help.</p>
      <a href="/contact" class="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl font-semibold bg-white transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl" style="color: ${colors[3]}">Contact Us Today <i data-lucide="arrow-right" class="w-4 h-4"></i></a>
    </div>
  </section>

  <!-- Footer -->
  <footer class="py-16" style="background: ${colors[2]}">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="grid md:grid-cols-4 gap-8 text-sm" style="color: ${colors[1]}">
        <div>
          <h4 class="font-bold text-white text-lg mb-4">${siteName}</h4>
          <p class="opacity-70 leading-relaxed">${description ?? 'Delivering exceptional results for our clients.'}</p>
          <div class="flex gap-4 mt-6">
            <a href="#" class="opacity-50 hover:opacity-100 transition"><i data-lucide="facebook" class="w-5 h-5"></i></a>
            <a href="#" class="opacity-50 hover:opacity-100 transition"><i data-lucide="twitter" class="w-5 h-5"></i></a>
            <a href="#" class="opacity-50 hover:opacity-100 transition"><i data-lucide="instagram" class="w-5 h-5"></i></a>
            <a href="#" class="opacity-50 hover:opacity-100 transition"><i data-lucide="linkedin" class="w-5 h-5"></i></a>
          </div>
        </div>
        <div>
          <h4 class="font-bold text-white mb-4">Quick Links</h4>
          <div class="flex flex-col gap-3 opacity-70">
            <a href="/" class="hover:opacity-100 transition">Home</a>
            <a href="/about" class="hover:opacity-100 transition">About Us</a>
            <a href="/services" class="hover:opacity-100 transition">Services</a>
            <a href="/contact" class="hover:opacity-100 transition">Contact</a>
          </div>
        </div>
        <div>
          <h4 class="font-bold text-white mb-4">Services</h4>
          <div class="flex flex-col gap-3 opacity-70">
            <a href="#" class="hover:opacity-100 transition">Consulting</a>
            <a href="#" class="hover:opacity-100 transition">Strategy</a>
            <a href="#" class="hover:opacity-100 transition">Development</a>
            <a href="#" class="hover:opacity-100 transition">Support</a>
          </div>
        </div>
        <div>
          <h4 class="font-bold text-white mb-4">Contact</h4>
          <div class="opacity-70 space-y-3">
            <p class="flex items-center gap-2"><i data-lucide="mail" class="w-4 h-4"></i> hello@${siteName.toLowerCase().replace(/\s+/g, '')}.com</p>
            <p class="flex items-center gap-2"><i data-lucide="phone" class="w-4 h-4"></i> (555) 123-4567</p>
            <p class="flex items-center gap-2"><i data-lucide="map-pin" class="w-4 h-4"></i> 123 Business Ave</p>
          </div>
        </div>
      </div>
      <div class="mt-12 pt-8 text-center text-sm opacity-40" style="color: ${colors[1]}; border-top: 1px solid rgba(255,255,255,0.1)">
        &copy; 2026 ${siteName}. All rights reserved.
      </div>
    </div>
  </footer>

  <script>lucide.createIcons();</script>
</body>
</html>`;
}
