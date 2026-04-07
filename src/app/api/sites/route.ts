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
  for (let i = 0; i < flatPages.length; i++) {
    const fp = flatPages[i];
    const pageSlug = fp.slug === "home" ? "index" : fp.slug.replace(/\//g, "-");

    const html = await generatePageWithAI({
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

    pageData.push({
      slug: pageSlug,
      title: fp.title,
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
    const { estimateCost, getModel } = await import("@/lib/ai");
    const modelInfo = getModel(model);
    const inputTokens = flatPages.length * 800;
    const outputTokens = flatPages.length * 2000;
    const costCents = estimateCost(model, inputTokens, outputTokens);

    await db.usageRecord.create({
      data: {
        userId: user.id,
        provider: modelInfo?.provider ?? "unknown",
        model,
        inputTokens,
        outputTokens,
        costCents,
        action: "generate_site",
      },
    });
  }

  return NextResponse.json({ site });
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
  model: string;
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

  const prompt = `Generate a complete, production-ready HTML page for a website. This must look like a premium theme — rich, polished, and full of content.

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

DESIGN SYSTEM (follow strictly):
- Sections: use py-16 md:py-24 vertical padding, alternate between background ${colors[0]} and ${colors[1]}
- Container: max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 on every section
- Typography: hero h1 uses text-4xl sm:text-5xl md:text-6xl font-bold, section headings text-3xl md:text-4xl font-bold, subheadings text-xl, body text-lg leading-relaxed
- Cards: bg-white rounded-xl shadow-lg p-6 md:p-8, with hover:shadow-xl hover:-translate-y-1 transition-all duration-300
- Buttons: px-8 py-3 rounded-lg font-semibold with background ${colors[3]} and white text, plus a ghost/outline variant
- Images: use https://picsum.photos/seed/{unique-seed}/{width}/{height} for ALL images. Use different seed words per image (e.g. seed/hero/1200/600, seed/team1/400/400, seed/project1/600/400). Always add rounded-lg or rounded-xl and object-cover classes.
- Grids: use grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 for card layouts
- Hero sections: MUST use a full-width background image from picsum.photos with a dark overlay (bg-black/50) and white text on top. Use min-h-[600px] flex items-center.
- Spacing between elements: use mb-4 for paragraphs, mb-6 for subheadings, mb-12 for section intros
- Icons: use emoji icons (e.g. ✨ 🚀 💡 📊 🎯 ⭐) in feature cards and list items for visual interest

CONTENT REQUIREMENTS:
- Write realistic, professional placeholder text — NOT lorem ipsum. Write as if this is a real ${businessType} business.
- Every text paragraph must be 2-3 full sentences minimum.
- Feature/benefit descriptions must be specific and compelling, not generic.
- Include real-sounding names, titles, and testimonials where applicable.

TECHNICAL REQUIREMENTS:
- Return a complete HTML document (<!DOCTYPE html> to </html>)
- Use Tailwind CSS via CDN (<script src="https://cdn.tailwindcss.com"></script>)
- Load Google Fonts for "${headingFont}" and "${bodyFont}" via <link> tag if they're not system fonts
- Use inline <style> for: body { font-family: '${bodyFont}', system-ui, sans-serif; color: ${colors[2]}; background: ${colors[0]}; } h1,h2,h3,h4,h5,h6 { font-family: '${headingFont}', system-ui, sans-serif; }
- Include a sticky header with site name + navigation: ${navLinks}
- Include a rich footer with multiple columns (links, contact info, copyright)
- Make it fully responsive (mobile-first)
- Use the color palette consistently — backgrounds, text, buttons, accents, borders
- Include at least 5-6 distinct content sections
- Do NOT include any explanation or markdown — ONLY the raw HTML`;

  try {
    const { generateText } = await import("@/lib/ai");

    let result = "";
    for await (const chunk of generateText(prompt, {
      model: ctx.model,
      temperature: 0.5,
      maxTokens: 8192,
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
    home: `This is the homepage — the first impression. Build it with these sections IN ORDER:

1. HERO: Full-width background image (picsum.photos/seed/hero-home/1400/700) with dark overlay. Big headline (text-5xl md:text-6xl), a 2-sentence subheadline, and two CTA buttons (primary filled + secondary outline).

2. FEATURES/BENEFITS: 3-4 cards in a grid. Each card has an emoji icon, bold title, and 2-3 sentence description. Example structure:
   <div class="grid md:grid-cols-3 gap-8">
     <div class="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition-all">
       <span class="text-4xl">🚀</span>
       <h3 class="text-xl font-bold mt-4 mb-2">Feature Title</h3>
       <p class="text-gray-600">Two to three sentences describing this feature...</p>
     </div>
   </div>

3. ABOUT PREVIEW: Two-column layout — image on left (picsum.photos/seed/about-preview/600/400), text on right with heading, 2 paragraphs, and "Learn More" link.

4. SOCIAL PROOF: 3 testimonial cards with quote text, person name, role, and star ratings (use ⭐ emoji).

5. STATS/NUMBERS: A row of 3-4 impressive statistics (e.g., "500+ Clients", "10 Years", "99% Satisfaction") in large bold text.

6. CTA SECTION: Full-width colored background using the primary accent color, compelling headline, subtitle, and big CTA button.`,

    about: `This is the About page. Build with these sections:

1. HERO: Background image (picsum.photos/seed/about-hero/1400/600) with overlay, page title "About Us" and a one-line mission statement.

2. OUR STORY: Two-column — large image (picsum.photos/seed/our-story/600/500) on one side, 3 paragraphs of story text on the other. Use real-sounding founding narrative.

3. MISSION & VALUES: Heading + intro paragraph, then 4 value cards in a 2x2 grid. Each has emoji icon, title, and description.

4. TEAM: 3-4 team member cards. Each with a square portrait image (picsum.photos/seed/person{N}/300/300), name, title, and short bio. Use rounded-full on images.

5. MILESTONES: A timeline or numbered list of 4-5 company milestones with years and descriptions.

6. CTA: "Want to work with us?" section with contact button.`,

    services: `This is the Services page. Build with these sections:

1. HERO: Background image (picsum.photos/seed/services-hero/1400/600) with overlay, "Our Services" headline + brief intro text.

2. SERVICES GRID: 4-6 service cards with emoji icons, titles, descriptions (3 sentences each), and "Learn More" links. Use shadow-lg cards in a responsive grid.

3. HOW IT WORKS: 3-4 numbered steps in a horizontal flow. Each step: number circle, title, description. Connect with a line or arrow visual.

4. WHY CHOOSE US: Two-column layout — image (picsum.photos/seed/why-us/600/400) + list of 4-5 benefits with checkmark emojis.

5. PRICING PREVIEW: 3 pricing tiers in cards. Middle one highlighted with ring-2 and "Most Popular" badge. Each has: plan name, price, feature list, CTA button.

6. CTA: Full-width section encouraging contact.`,

    portfolio: `This is the Portfolio page. Build with these sections:

1. HERO: Background image with overlay, "Our Work" headline + subtitle.

2. FILTER BAR: A row of category buttons (All, Branding, Web Design, Marketing, etc.) styled as pills.

3. PROJECT GRID: 6-9 project cards in a 3-column grid. Each card: project image (picsum.photos/seed/project{N}/600/400), overlay on hover with project name, category tag badge, brief description. Use aspect-video on images.

4. FEATURED PROJECT: Full-width showcase of one project — large image, project name, detailed description, client name, results achieved.

5. CTA: "Have a project in mind?" with contact button.`,

    blog: `This is the Blog page. Build with these sections:

1. HERO: Simple heading "Our Blog" + subtitle, no background image needed.

2. FEATURED POST: Full-width card with large image (picsum.photos/seed/blog-featured/1200/500), category badge, title, excerpt, author avatar + name, date, read time.

3. POST GRID: 6 blog post cards in a 3-column grid. Each: image (picsum.photos/seed/blog{N}/600/400), category badge, title, date, 2-sentence excerpt, "Read More" link.

4. CATEGORIES SIDEBAR or tag cloud section.

5. NEWSLETTER: Email signup section with heading, description, input field + subscribe button.`,

    contact: `This is the Contact page. Build with these sections:

1. HERO: Simple heading "Get in Touch" + welcoming subtitle.

2. CONTACT GRID: Two-column layout.
   Left: Styled contact form with fields (Name, Email, Phone, Subject dropdown, Message textarea, Submit button). Style inputs with border rounded-lg p-3 focus:ring-2.
   Right: Contact info cards — address with 📍, phone with 📞, email with ✉️, business hours with 🕐.

3. MAP PLACEHOLDER: Full-width gray box with "Map" text centered, styled as rounded-xl bg-gray-200 h-64.

4. FAQ: 4-5 common contact-related questions using details/summary elements.`,

    pricing: `This is the Pricing page. Build with these sections:

1. HERO: Heading "Simple, Transparent Pricing" + subtitle about value.

2. PRICING TOGGLE: Monthly/Annual toggle (visual only, use a styled div).

3. PRICING CARDS: 3 tiers side by side. Middle tier: ring-2 ring-primary scale-105 with "Most Popular" badge. Each tier: plan name, price (large text-4xl), billing period, feature list with ✓ checkmarks, CTA button. Use distinct button styles per tier.

4. COMPARISON TABLE: Full feature comparison table with checkmarks/crosses.

5. FAQ: 6-8 pricing-related Q&A in accordion style (details/summary).

6. CTA: "Need a custom plan?" with contact link.`,

    faq: `This is the FAQ page. Build with these sections:

1. HERO: Heading "Frequently Asked Questions" + subtitle.

2. FAQ CATEGORIES: Organize into 2-3 categories (General, Pricing, Technical or similar).

3. FAQ ITEMS: 10-12 questions using <details><summary> elements. Style the summary with cursor-pointer, font-semibold, py-4, border-b. Write realistic Q&A for a ${businessType} business. Each answer should be 2-3 sentences.

4. STILL HAVE QUESTIONS: CTA section with contact options.`,

    testimonials: `This is the Testimonials page. Build with these sections:

1. HERO: Background image with overlay, "What Our Clients Say" headline.

2. FEATURED TESTIMONIAL: Large card with big quote text, author photo (picsum.photos/seed/client-featured/100/100 rounded-full), name, title, company, 5-star rating.

3. TESTIMONIAL GRID: 6 testimonial cards in a 2-3 column grid. Each: quote text (2-3 sentences), star rating with ⭐, author name, role/company, small avatar image. Vary the quote lengths.

4. LOGOS: "Trusted By" section with a row of placeholder company name text or simple styled boxes.

5. CTA: "Join our happy clients" section.`,

    team: `This is the Team page. Build with these sections:

1. HERO: Background image with overlay, "Meet Our Team" headline + subtitle about the team culture.

2. LEADERSHIP: 2-3 leader cards in a larger format. Each: portrait image (picsum.photos/seed/leader{N}/400/400, rounded-full), name, title, 3-sentence bio, social media icon links.

3. TEAM GRID: 6 team member cards in a 3-column grid. Each: square portrait (picsum.photos/seed/team{N}/300/300), name, role, one-line bio. Hover effect to reveal social links.

4. CULTURE: Two-column section — team group photo (picsum.photos/seed/team-culture/800/500) + text about company culture and values.

5. JOIN US: "We're Hiring" CTA section with job openings link.`,
  };

  return guides[slug] ?? `This is the ${slug} page. Include at least 5 rich content sections with images from picsum.photos, emoji icons, and professional placeholder text for a ${businessType} website. Follow the design system specified above.`;
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
  <style>
    body { font-family: '${bodyFont}', system-ui, sans-serif; color: ${colors[2]}; background: ${colors[0]}; }
    h1, h2, h3, h4, h5, h6 { font-family: '${headingFont}', system-ui, sans-serif; }
  </style>
</head>
<body class="min-h-screen flex flex-col">
  <!-- Header -->
  <header class="sticky top-0 z-50 border-b bg-white/95 backdrop-blur">
    <nav class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
      <a href="/" class="text-xl font-bold" style="color: ${colors[3]}">${siteName}</a>
      <div class="flex items-center gap-6 text-sm">${navLinks}</div>
    </nav>
  </header>

  <!-- Hero -->
  <section class="relative min-h-[600px] flex items-center" style="background: url('https://picsum.photos/seed/fallback-hero/1400/700') center/cover no-repeat">
    <div class="absolute inset-0 bg-black/50"></div>
    <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-white">
      <h1 class="text-4xl sm:text-5xl md:text-6xl font-bold mb-6">${pageTitle}</h1>
      <p class="text-xl md:text-2xl mb-8 max-w-2xl opacity-90">${description ?? `Welcome to ${siteName}. We deliver exceptional results for our clients every day.`}</p>
      <div class="flex gap-4">
        <a href="#features" class="px-8 py-3 rounded-lg font-semibold text-white" style="background: ${colors[3]}">Get Started</a>
        <a href="#about" class="px-8 py-3 rounded-lg font-semibold border-2 border-white text-white hover:bg-white/10 transition">Learn More</a>
      </div>
    </div>
  </section>

  <!-- Features -->
  <section id="features" class="py-16 md:py-24" style="background: ${colors[1]}">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="text-center mb-12">
        <h2 class="text-3xl md:text-4xl font-bold mb-4">What We Offer</h2>
        <p class="text-lg max-w-2xl mx-auto" style="color: ${colors[4]}">Discover the features and services that set us apart from the competition.</p>
      </div>
      <div class="grid md:grid-cols-3 gap-8">
        <div class="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
          <span class="text-4xl">🚀</span>
          <h3 class="text-xl font-bold mt-4 mb-2">Fast & Reliable</h3>
          <p style="color: ${colors[4]}">Our platform is built for speed and reliability. Experience lightning-fast performance that keeps your business running smoothly around the clock.</p>
        </div>
        <div class="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
          <span class="text-4xl">💡</span>
          <h3 class="text-xl font-bold mt-4 mb-2">Innovative Solutions</h3>
          <p style="color: ${colors[4]}">We leverage cutting-edge technology to deliver creative solutions. Our team stays ahead of industry trends to give you a competitive advantage.</p>
        </div>
        <div class="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
          <span class="text-4xl">⭐</span>
          <h3 class="text-xl font-bold mt-4 mb-2">Premium Quality</h3>
          <p style="color: ${colors[4]}">Quality is at the heart of everything we do. From initial concept to final delivery, we maintain the highest standards of excellence.</p>
        </div>
      </div>
    </div>
  </section>

  <!-- About Preview -->
  <section id="about" class="py-16 md:py-24">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="grid md:grid-cols-2 gap-12 items-center">
        <img src="https://picsum.photos/seed/fallback-about/600/400" alt="About us" class="rounded-xl shadow-lg object-cover w-full" />
        <div>
          <h2 class="text-3xl md:text-4xl font-bold mb-6">About ${siteName}</h2>
          <p class="text-lg mb-4" style="color: ${colors[4]}">${description ?? `${siteName} was founded with a simple mission: to provide outstanding service and exceptional value to our clients.`}</p>
          <p class="text-lg mb-6" style="color: ${colors[4]}">With years of experience in the industry, our dedicated team brings expertise, passion, and commitment to every project we undertake.</p>
          <a href="/about" class="px-6 py-3 rounded-lg font-semibold text-white inline-block" style="background: ${colors[3]}">Learn More About Us</a>
        </div>
      </div>
    </div>
  </section>

  <!-- CTA -->
  <section class="py-16 md:py-24" style="background: ${colors[3]}">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
      <h2 class="text-3xl md:text-4xl font-bold mb-4">Ready to Get Started?</h2>
      <p class="text-xl mb-8 opacity-90 max-w-2xl mx-auto">Join hundreds of satisfied clients who have transformed their business with our help.</p>
      <a href="/contact" class="px-8 py-3 rounded-lg font-semibold bg-white inline-block" style="color: ${colors[3]}">Contact Us Today</a>
    </div>
  </section>

  <!-- Footer -->
  <footer class="border-t py-12" style="background: ${colors[2]}">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="grid md:grid-cols-3 gap-8 text-sm" style="color: ${colors[1]}">
        <div>
          <h4 class="font-bold text-white mb-4">${siteName}</h4>
          <p class="opacity-75">${description ?? 'Delivering exceptional results for our clients.'}</p>
        </div>
        <div>
          <h4 class="font-bold text-white mb-4">Quick Links</h4>
          <div class="flex flex-col gap-2 opacity-75">
            <a href="/" class="hover:opacity-100">Home</a>
            <a href="/about" class="hover:opacity-100">About</a>
            <a href="/contact" class="hover:opacity-100">Contact</a>
          </div>
        </div>
        <div>
          <h4 class="font-bold text-white mb-4">Contact</h4>
          <div class="opacity-75 space-y-2">
            <p>📧 hello@${siteName.toLowerCase().replace(/\s+/g, '')}.com</p>
            <p>📞 (555) 123-4567</p>
          </div>
        </div>
      </div>
      <div class="border-t mt-8 pt-8 text-center text-sm opacity-50" style="color: ${colors[1]}; border-color: rgba(255,255,255,0.1)">
        &copy; 2026 ${siteName}. All rights reserved.
      </div>
    </div>
  </footer>
</body>
</html>`;
}
