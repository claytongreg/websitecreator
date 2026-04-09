// ---------------------------------------------------------------------------
// Design archetypes & reference templates for site generation
// ---------------------------------------------------------------------------
// Each archetype defines a distinct visual system. The AI gets archetype-
// specific design instructions + reference HTML snippets so generated sites
// have real variety instead of the same glassmorphic look every time.
// ---------------------------------------------------------------------------

export interface DesignArchetype {
  id: string;
  name: string;
  /** One-line mood description for the AI */
  mood: string;
  /** Design system overrides — replaces the generic instructions */
  designSystem: string;
  /** A short reference HTML snippet showing "premium" quality for a hero + one section */
  referenceSnippet: string;
}

// ---------------------------------------------------------------------------
// Archetype definitions
// ---------------------------------------------------------------------------

const archetypes: Record<string, DesignArchetype> = {
  // ---- 1. Clean / Minimal ------------------------------------------------
  clean: {
    id: "clean",
    name: "Clean Minimal",
    mood: "clean, spacious, modern, and understated — like Apple or Stripe",
    designSystem: `DESIGN DIRECTION: Clean Minimal
Think Apple, Stripe, Linear — maximum whitespace, zero clutter. Every element earns its place.

NAVIGATION:
- Simple white header with generous padding (py-5). No glassmorphism, no blur — just clean white bg-white border-b border-gray-100.
- Logo: font-semibold text-lg text-gray-900. No color on the logo.
- Nav links: text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors. Widely spaced (gap-10).
- CTA in nav: text-sm font-medium text-white bg-gray-900 px-5 py-2 rounded-lg hover:bg-gray-800.

HERO:
- NO background images on heroes. Use white/light bg with massive typography.
- Heading: text-5xl md:text-6xl lg:text-7xl font-semibold tracking-tight text-gray-900 leading-[1.08]. Max 8 words.
- Subtitle: text-xl text-gray-500 max-w-xl leading-relaxed mt-6.
- Generous top padding: pt-32 pb-20. Let the text breathe.
- CTA buttons: primary bg-gray-900 text-white rounded-lg px-6 py-3, secondary text-gray-600 hover:text-gray-900 with arrow →.
- Optional: a large product screenshot or illustration below the text with rounded-2xl shadow-2xl shadow-gray-200/60.

SECTIONS:
- Vertical rhythm: py-24 md:py-32. More space, not less.
- Container: max-w-6xl mx-auto px-6 (narrower than usual for focus).
- NO decorative blobs, NO gradients, NO clip-path dividers. Clean separations via whitespace or a single border-t border-gray-100.
- Section headings: text-sm font-medium text-gray-400 uppercase tracking-widest mb-4 for eyebrow. Then text-3xl md:text-4xl font-semibold tracking-tight text-gray-900.
- Alternate sections with bg-white and bg-gray-50 (very subtle).

CARDS:
- bg-white rounded-xl border border-gray-100 p-8. NO hover shadows. On hover: border-gray-200 transition.
- Or borderless with just spacing — let content create the structure.
- No colored icon backgrounds. Icons are plain: text-gray-400 w-5 h-5.

BUTTONS:
- Primary: bg-gray-900 text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-gray-800 transition.
- Secondary: text-gray-600 hover:text-gray-900 text-sm font-medium inline-flex items-center gap-1.
- NO shadows on buttons. NO gradients.

TYPOGRAPHY:
- Use -tracking-tight on all headings. Body in text-gray-500 (not gray-600).
- Size scale: h1 text-5xl+, h2 text-3xl, h3 text-lg font-semibold, body text-base.
- System font stack preferred — if using Google Fonts, stick to Inter or similar geometric sans.

FOOTER:
- Minimal: bg-gray-50 border-t border-gray-100 py-16. 3-4 columns of small text links.
- No dark footer. Light and airy.`,

    referenceSnippet: `<!-- REFERENCE: Clean minimal hero pattern -->
<section class="pt-32 pb-20">
  <div class="max-w-6xl mx-auto px-6">
    <p class="text-sm font-medium text-gray-400 uppercase tracking-widest mb-4">Digital Solutions</p>
    <h1 class="text-5xl md:text-6xl lg:text-7xl font-semibold tracking-tight text-gray-900 leading-[1.08] max-w-4xl">Build something people actually want</h1>
    <p class="text-xl text-gray-500 max-w-xl leading-relaxed mt-6">We help startups and teams ship beautiful products faster with strategy, design, and engineering that works.</p>
    <div class="flex items-center gap-6 mt-10">
      <a href="#work" class="bg-gray-900 text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-gray-800 transition">See our work</a>
      <a href="#contact" class="text-gray-600 hover:text-gray-900 text-sm font-medium inline-flex items-center gap-1">Get in touch <span aria-hidden="true">&rarr;</span></a>
    </div>
  </div>
</section>`,
  },

  // ---- 2. Bold / Dynamic -------------------------------------------------
  bold: {
    id: "bold",
    name: "Bold Dynamic",
    mood: "bold, high-energy, confident — like Nike, Vercel, or a SaaS launch page",
    designSystem: `DESIGN DIRECTION: Bold Dynamic
Think Vercel, Nike, or a premium SaaS launch — dark surfaces, vibrant accents, strong contrast, confident typography.

NAVIGATION:
- Dark glassmorphic header: sticky top-0 z-50 bg-gray-950/80 backdrop-blur-xl border-b border-white/5.
- Logo: font-bold text-lg text-white.
- Nav links: text-sm font-medium text-gray-400 hover:text-white transition.
- CTA in nav: text-sm font-semibold bg-primary text-white px-5 py-2 rounded-lg.

HERO:
- Dark background: bg-gray-950 or bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950. Use min-h-[90vh].
- Add a subtle radial glow behind the heading: <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-primary/20 rounded-full blur-[120px] pointer-events-none"></div>
- Heading: text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.08].
- Subtitle: text-lg md:text-xl text-gray-400 max-w-2xl.
- Eyebrow: inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6.
- CTA: bg-primary text-white px-8 py-3.5 rounded-xl font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all.
- Secondary CTA: border border-white/10 text-white px-8 py-3.5 rounded-xl hover:bg-white/5 transition.

SECTIONS:
- Alternate between bg-gray-950, bg-gray-900, and bg-white (for contrast sections).
- Use py-24 md:py-32 spacing.
- Section eyebrows: text-primary text-sm font-semibold tracking-widest uppercase.
- Section headings on dark bg: text-white. On light bg: text-gray-900.
- Add subtle grid patterns or dot grids as section backgrounds for texture: use a repeating SVG or gradient.

CARDS:
- On dark bg: bg-gray-900/50 border border-white/5 rounded-2xl p-8 hover:border-primary/30 transition. Backdrop-blur optional.
- On light bg: bg-white rounded-2xl border border-gray-100 p-8 shadow-sm hover:shadow-lg transition.
- Icon wrappers: w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center. Icon: text-primary w-6 h-6.

BUTTONS:
- Primary: bg-primary text-white rounded-xl px-8 py-3.5 font-semibold shadow-lg shadow-primary/25 hover:-translate-y-0.5 transition-all.
- Ghost on dark: border border-white/10 text-white hover:bg-white/5 rounded-xl px-8 py-3.5.

TYPOGRAPHY:
- Bold and confident. Use font-bold for headings (not font-semibold).
- text-gray-400 for body on dark, text-gray-600 on light.
- Consider a display font for hero headings if available.

IMAGES:
- Add subtle rounded-2xl ring-1 ring-white/10 treatment on dark backgrounds.
- Use gradient overlays on images: bg-gradient-to-t from-gray-950 via-gray-950/50 to-transparent.

FOOTER:
- Dark: bg-gray-950 border-t border-white/5 py-16. Text in text-gray-400.`,

    referenceSnippet: `<!-- REFERENCE: Bold dark hero pattern -->
<section class="relative min-h-[90vh] flex items-center bg-gray-950 overflow-hidden">
  <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-blue-500/20 rounded-full blur-[120px] pointer-events-none"></div>
  <div class="relative max-w-7xl mx-auto px-6 lg:px-8 text-center">
    <span class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-8">Now available worldwide</span>
    <h1 class="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.08] max-w-4xl mx-auto">Ship faster with confidence</h1>
    <p class="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mt-6">The platform engineering teams trust to deploy, scale, and monitor at any scale. Built for speed, designed for reliability.</p>
    <div class="flex items-center justify-center gap-4 mt-10">
      <a href="#start" class="bg-blue-500 text-white px-8 py-3.5 rounded-xl font-semibold shadow-lg shadow-blue-500/25 hover:-translate-y-0.5 transition-all inline-flex items-center gap-2">Start building <i data-lucide="arrow-right" class="w-4 h-4"></i></a>
      <a href="#demo" class="border border-white/10 text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-white/5 transition">Watch demo</a>
    </div>
  </div>
</section>`,
  },

  // ---- 3. Warm / Organic --------------------------------------------------
  warm: {
    id: "warm",
    name: "Warm Organic",
    mood: "warm, approachable, handcrafted — like Mailchimp, Notion, or a boutique brand",
    designSystem: `DESIGN DIRECTION: Warm Organic
Think Mailchimp, a boutique hotel, or a craft brand — warm tones, rounded shapes, friendly typography, human feel.

NAVIGATION:
- Warm white header: bg-white/90 backdrop-blur-md border-b border-amber-100/50. Slightly rounded bottom corners optional.
- Logo: font-bold text-lg text-gray-800. Could use a serif font.
- Nav links: text-sm font-medium text-gray-500 hover:text-amber-700 transition-colors.
- CTA in nav: text-sm font-semibold bg-amber-600 text-white px-5 py-2 rounded-full hover:bg-amber-700.

HERO:
- Use a warm bg: bg-amber-50 or bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50. NO dark overlays.
- Or use a split layout: text on left, large rounded image on right.
- Heading: text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-[1.15]. Use a serif heading font if possible (Playfair Display, Lora, etc).
- Subtitle: text-lg text-gray-600 leading-relaxed.
- CTA buttons: rounded-full shapes. Primary: bg-amber-600 text-white px-8 py-3.5 rounded-full font-semibold hover:bg-amber-700 shadow-lg shadow-amber-200.
- Add playful illustrated elements or small decorative shapes (circles, rounded blobs in warm colors).

SECTIONS:
- py-20 md:py-28 spacing.
- Container: max-w-6xl mx-auto px-6.
- Warm backgrounds: bg-white, bg-amber-50/50, bg-orange-50/30 alternating.
- NO clip-path dividers. Use gentle curves via SVG wave or just whitespace.
- Section headings: can mix serif (for display) and sans-serif (for body).

CARDS:
- bg-white rounded-3xl p-8 shadow-sm shadow-amber-100 hover:shadow-md hover:shadow-amber-200/50 transition-all.
- Or bg-amber-50 rounded-3xl p-8 border border-amber-100.
- More rounded: rounded-3xl instead of rounded-2xl.
- Icons: use warm colors — text-amber-600, text-orange-500.

BUTTONS:
- Primary: rounded-full shapes. bg-amber-600 text-white px-8 py-3.5 rounded-full font-semibold shadow-lg shadow-amber-200/50.
- Secondary: text-amber-700 font-semibold hover:text-amber-800 inline-flex items-center gap-2.

TYPOGRAPHY:
- Mix serif headings (Playfair Display, Lora, Merriweather) with sans-serif body (Inter, DM Sans).
- Warmer body text: text-gray-600 not text-gray-500.
- Slightly larger body text: text-base md:text-lg for readability.

IMAGES:
- Very rounded: rounded-3xl. Add ring-4 ring-white shadow-lg for a "photo frame" feel.
- Overlapping image layouts work well — slight negative margins, rotated cards.

FOOTER:
- Warm background: bg-amber-900 or bg-gray-800 (warm-tinted). Text in amber-100/70.
- 3-column layout. Include a small newsletter signup.`,

    referenceSnippet: `<!-- REFERENCE: Warm organic hero pattern -->
<section class="bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 py-24 md:py-32">
  <div class="max-w-6xl mx-auto px-6">
    <div class="grid md:grid-cols-2 gap-16 items-center">
      <div>
        <span class="inline-block px-4 py-1.5 rounded-full bg-amber-100 text-amber-700 text-sm font-semibold mb-6">Handcrafted with care</span>
        <h1 class="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-[1.15]" style="font-family: 'Playfair Display', serif">Where creativity meets craft</h1>
        <p class="text-lg text-gray-600 leading-relaxed mt-6 max-w-lg">We create memorable experiences that connect brands with the people who love them. Thoughtful design, honest work.</p>
        <div class="flex items-center gap-4 mt-10">
          <a href="#work" class="bg-amber-600 text-white px-8 py-3.5 rounded-full font-semibold hover:bg-amber-700 shadow-lg shadow-amber-200/50 transition-all">Explore our work</a>
          <a href="#story" class="text-amber-700 font-semibold hover:text-amber-800 inline-flex items-center gap-2">Our story <i data-lucide="arrow-right" class="w-4 h-4"></i></a>
        </div>
      </div>
      <div class="relative">
        <img src="https://picsum.photos/seed/warm-hero/600/500" alt="Our craft" class="rounded-3xl ring-4 ring-white shadow-xl w-full object-cover" />
      </div>
    </div>
  </div>
</section>`,
  },

  // ---- 4. Editorial / Magazine -------------------------------------------
  editorial: {
    id: "editorial",
    name: "Editorial",
    mood: "sophisticated, editorial, magazine-like — like Squarespace, Medium, or a luxury brand",
    designSystem: `DESIGN DIRECTION: Editorial / Magazine
Think Squarespace templates, luxury brands, architecture firms — strong grid, type-driven, image-forward, refined.

NAVIGATION:
- Thin, elegant header: bg-white border-b border-gray-200 py-4.
- Logo: font-semibold text-sm uppercase tracking-[0.2em] text-gray-900.
- Nav links: text-xs uppercase tracking-[0.15em] font-medium text-gray-500 hover:text-gray-900.
- CTA in nav: text-xs uppercase tracking-[0.15em] font-semibold text-gray-900 border-b-2 border-gray-900 pb-0.5 hover:text-gray-600.

HERO:
- Full-width image hero: min-h-[85vh] with background image covering the entire section.
- Overlay: bg-gradient-to-t from-black/60 via-black/20 to-transparent.
- Content anchored to bottom: absolute bottom-0 left-0 right-0 p-8 md:p-16.
- Heading: text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-[1.1].
- Use a serif or display font for hero headings.
- Subtitle: text-lg text-white/80 max-w-lg mt-4.
- Minimal CTA: text-sm uppercase tracking-[0.15em] font-semibold text-white border-b border-white pb-1 hover:text-white/80 inline-flex items-center gap-3.

SECTIONS:
- py-20 md:py-28. Container: max-w-7xl mx-auto px-8.
- Use asymmetric layouts: 60/40 splits, offset grids, overlapping elements.
- Section headings: text-xs uppercase tracking-[0.2em] text-gray-400 font-medium mb-6 for eyebrow. Then text-3xl md:text-4xl font-bold tracking-tight.
- Content in narrower columns: max-w-prose (65ch) for readability.

CARDS:
- Minimal cards: no border, no shadow. Just image + text with generous spacing.
- Image-first: large image (aspect-[4/5] or aspect-[3/4]) with rounded-lg, then text below.
- On hover: opacity-80 transition on the image, text link underlines.

BUTTONS:
- Understated: text-sm uppercase tracking-[0.15em] font-semibold text-gray-900 border-b-2 border-gray-900 pb-0.5 hover:text-gray-600 transition.
- Or: bg-gray-900 text-white px-8 py-3 text-sm uppercase tracking-wide font-semibold hover:bg-gray-800.
- NO rounded-full. Use rounded-none or rounded-sm for editorial feel.

TYPOGRAPHY:
- Serif headings (Playfair Display, DM Serif Display, or Cormorant) + sans-serif body (Inter, DM Sans).
- Strong hierarchy: h1 is very large, body text is restrained.
- Use uppercase tracking-wide for labels and small text.
- Pullquotes: text-2xl md:text-3xl font-medium leading-relaxed italic in a bordered block.

IMAGES:
- Large, full-bleed images are the star. rounded-lg or no rounding.
- Use aspect ratios deliberately: aspect-[4/5] for portraits, aspect-[16/9] for landscapes.
- Image grids: mix sizes — one large + two small, or mosaic layouts.

FOOTER:
- Minimal: bg-white border-t border-gray-200 py-16. Small text, widely spaced links.
- Or dark: bg-gray-950 text-gray-400 py-16.`,

    referenceSnippet: `<!-- REFERENCE: Editorial hero pattern -->
<section class="relative min-h-[85vh] flex items-end" style="background: url('https://picsum.photos/seed/editorial-hero/1400/900') center/cover no-repeat">
  <div class="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
  <div class="relative max-w-7xl mx-auto px-8 pb-16 md:pb-24 w-full">
    <p class="text-xs uppercase tracking-[0.2em] text-white/60 font-medium mb-4">Award-winning studio</p>
    <h1 class="text-4xl md:text-5xl lg:text-6xl font-bold text-white tracking-tight leading-[1.1] max-w-3xl" style="font-family: 'DM Serif Display', serif">We design spaces that inspire how people live</h1>
    <p class="text-lg text-white/80 max-w-lg mt-6">A multidisciplinary studio crafting architecture, interiors, and brand experiences since 2008.</p>
    <a href="#projects" class="inline-flex items-center gap-3 mt-10 text-sm uppercase tracking-[0.15em] font-semibold text-white border-b border-white pb-1 hover:text-white/80 transition">View projects <i data-lucide="arrow-right" class="w-4 h-4"></i></a>
  </div>
</section>`,
  },

  // ---- 5. Corporate / Professional ---------------------------------------
  corporate: {
    id: "corporate",
    name: "Corporate Professional",
    mood: "trustworthy, structured, professional — like Salesforce, Deloitte, or a law firm",
    designSystem: `DESIGN DIRECTION: Corporate Professional
Think Salesforce, consulting firms, financial services — structured, trustworthy, data-rich, polished.

NAVIGATION:
- Solid header: bg-white shadow-sm py-4. Clean and authoritative.
- Logo: font-bold text-lg text-gray-900.
- Nav links: text-sm font-medium text-gray-600 hover:text-primary transition-colors. Can have dropdowns.
- CTA in nav: bg-primary text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90.

HERO:
- Two-column hero: text on left (55%), image/graphic on right (45%). bg-gradient-to-r from-gray-50 to-white.
- Or: dark hero with bg-gradient-to-r from-gray-900 via-primary/90 to-primary for authority.
- Heading: text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.12].
- Subtitle: text-lg text-gray-600 leading-relaxed max-w-xl.
- Two CTAs: primary filled + outline. Plus a trust signal below: "Trusted by 500+ companies" with small logos.

SECTIONS:
- py-20 md:py-28. Container: max-w-7xl mx-auto px-4 sm:px-6 lg:px-8.
- bg-white, bg-gray-50, bg-primary (for accent sections) alternating.
- Include data/stat sections: big numbers with labels.
- Use two-column layouts frequently: text + image, text + feature list.

CARDS:
- bg-white rounded-xl border border-gray-200 p-8 hover:shadow-lg transition-shadow.
- Feature cards: icon (text-primary) + heading + text + optional "Learn more →" link.
- Pricing cards: structured with clear tiers, feature checklists with check icons.

BUTTONS:
- Primary: bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition.
- Secondary: border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium hover:border-primary hover:text-primary transition.

TYPOGRAPHY:
- Sans-serif throughout (Inter, DM Sans, or similar). Professional, not playful.
- Strong hierarchy but conservative sizing. h1: text-4xl md:text-5xl. h2: text-3xl. h3: text-xl.
- Body: text-gray-600 text-base leading-relaxed.

IMAGES:
- Professional imagery: offices, teams, meetings, data dashboards.
- rounded-xl ring-1 ring-gray-200 treatment.
- Add overlaid stat callouts on images for data-rich feel.

TRUST ELEMENTS (important for corporate):
- Logo bar: "Trusted by" + row of client/partner logos (use text placeholders: company names in text-xl font-bold text-gray-300).
- Certification badges, award mentions.
- Stat counters: "10,000+ clients", "99.9% uptime", "$2B managed".

FOOTER:
- bg-gray-900 text-gray-400 py-16. 4-column layout with organized link groups.
- Include legal links, compliance mentions, certifications.`,

    referenceSnippet: `<!-- REFERENCE: Corporate hero pattern -->
<section class="bg-gradient-to-r from-gray-50 to-white py-24 md:py-32">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="grid lg:grid-cols-2 gap-16 items-center">
      <div>
        <span class="inline-flex items-center gap-2 text-sm font-semibold text-primary mb-4"><i data-lucide="shield-check" class="w-4 h-4"></i> Enterprise-grade platform</span>
        <h1 class="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 leading-[1.12]">Scale your business with confidence</h1>
        <p class="text-lg text-gray-600 leading-relaxed max-w-xl mt-6">Join 10,000+ companies using our platform to streamline operations, reduce costs, and accelerate growth with enterprise security built in.</p>
        <div class="flex items-center gap-4 mt-10">
          <a href="#demo" class="bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition inline-flex items-center gap-2">Request a demo <i data-lucide="arrow-right" class="w-4 h-4"></i></a>
          <a href="#pricing" class="border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium hover:border-primary hover:text-primary transition">View pricing</a>
        </div>
        <div class="mt-10 pt-8 border-t border-gray-200">
          <p class="text-sm text-gray-400 mb-3">Trusted by industry leaders</p>
          <div class="flex items-center gap-8 text-lg font-bold text-gray-300">
            <span>Acme Corp</span><span>Globex</span><span>Initech</span><span>Umbrella</span>
          </div>
        </div>
      </div>
      <div>
        <img src="https://picsum.photos/seed/corporate-hero/700/500" alt="Platform dashboard" class="rounded-xl ring-1 ring-gray-200 shadow-2xl w-full" />
      </div>
    </div>
  </div>
</section>`,
  },
};

// ---------------------------------------------------------------------------
// Archetype selection logic
// ---------------------------------------------------------------------------

/** Maps business types + moods to the best-fitting archetype */
export function selectArchetype(
  businessType: string,
  mood?: string
): DesignArchetype {
  const bt = (businessType || "").toLowerCase();
  const m = (mood || "").toLowerCase();

  // Mood-based overrides (strongest signal)
  if (m.includes("minimal") || m.includes("clean") || m.includes("simple"))
    return archetypes.clean;
  if (m.includes("bold") || m.includes("dynamic") || m.includes("dark") || m.includes("energetic"))
    return archetypes.bold;
  if (m.includes("warm") || m.includes("organic") || m.includes("friendly") || m.includes("playful"))
    return archetypes.warm;
  if (m.includes("editorial") || m.includes("magazine") || m.includes("luxury") || m.includes("elegant") || m.includes("sophisticated"))
    return archetypes.editorial;
  if (m.includes("corporate") || m.includes("professional") || m.includes("enterprise") || m.includes("formal"))
    return archetypes.corporate;

  // Business-type defaults
  if (bt.includes("portfolio") || bt.includes("personal") || bt.includes("creative") || bt.includes("photography"))
    return archetypes.editorial;
  if (bt.includes("saas") || bt.includes("tech") || bt.includes("startup") || bt.includes("software"))
    return archetypes.bold;
  if (bt.includes("ecommerce") || bt.includes("e-commerce") || bt.includes("shop") || bt.includes("store") || bt.includes("retail"))
    return archetypes.warm;
  if (bt.includes("restaurant") || bt.includes("food") || bt.includes("cafe") || bt.includes("bakery") || bt.includes("health") || bt.includes("wellness"))
    return archetypes.warm;
  if (bt.includes("consulting") || bt.includes("finance") || bt.includes("law") || bt.includes("real estate") || bt.includes("agency"))
    return archetypes.corporate;
  if (bt.includes("nonprofit") || bt.includes("education") || bt.includes("community"))
    return archetypes.warm;

  // Default: corporate is the safest for "Other" / unknown
  return archetypes.corporate;
}

// ---------------------------------------------------------------------------
// System prompt for site generation
// ---------------------------------------------------------------------------

export function getSiteGenSystemPrompt(): string {
  return `You are a world-class web designer and front-end developer. You create websites that look like premium ThemeForest best-sellers or award-winning agency portfolio sites.

YOUR DESIGN PRINCIPLES:
1. VISUAL HIERARCHY — Guide the eye. The most important element on every screen should be unmistakable. Use size, weight, color, and spacing to create clear levels of importance.
2. WHITESPACE IS DESIGN — Space is not empty, it's intentional. Generous padding and margins separate content into digestible groups. Never cram elements together.
3. CONSISTENCY — Every page of a site must feel like it belongs together. Same header, same footer, same typographic scale, same color usage patterns, same button styles.
4. CONVERSION-FOCUSED — Every page should guide visitors toward action. Place CTAs above the fold and after key content sections. Use trust signals (stats, testimonials, logos) near decision points.
5. CONTENT-FIRST — Write compelling, specific copy for the business. Generic filler destroys credibility. Every heading should make the visitor want to read the next line.

CONVERSION BEST PRACTICES:
- Hero section: clear value proposition, specific benefit, and CTA above the fold
- Social proof early: stats, client count, or testimonial near the top
- Feature/benefit sections: lead with the outcome, not the feature
- Trust signals near CTAs: testimonials, guarantees, security badges
- Multiple CTA placements: after hero, mid-page, and bottom
- Contact info visible: phone/email in header or hero for service businesses
- Urgency/scarcity when appropriate: "Limited availability", "Free consultation"

OUTPUT RULES:
- Return ONLY raw HTML. No markdown fences, no explanation, no commentary.
- The HTML must be a complete document from <!DOCTYPE html> to </html>.
- Use Tailwind CSS via CDN and Lucide icons. Never use emoji as icons.
- Write realistic, compelling copy — not lorem ipsum. Write as if this is a real business.
- Every page must have at least 5-6 distinct content sections.
- Make it fully responsive (mobile-first).`;
}

// ---------------------------------------------------------------------------
// Build inspiration context for the prompt
// ---------------------------------------------------------------------------

export function buildInspirationContext(
  inspirations?: {
    url: string;
    style: { colors: string[]; fonts: { family: string }[]; mood: string };
  }[]
): string {
  if (!inspirations || inspirations.length === 0) return "";

  const lines = inspirations.map((insp, i) => {
    const colors = insp.style.colors?.slice(0, 5).join(", ") || "not extracted";
    const fonts =
      insp.style.fonts?.map((f) => f.family).join(", ") || "not extracted";
    const mood = insp.style.mood || "not extracted";
    return `  ${i + 1}. ${insp.url}
     Colors: ${colors}
     Fonts: ${fonts}
     Mood/Feel: ${mood}`;
  });

  return `
INSPIRATION SITES (the user chose these as visual references — match their quality and feel):
${lines.join("\n")}
Study these sites' design patterns: their layout rhythm, section ordering, whitespace usage, and overall sophistication level. Your output should feel like it belongs alongside these references.
`;
}
