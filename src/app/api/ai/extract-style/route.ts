import { NextRequest, NextResponse } from "next/server";
import type { ExtractedStyle } from "@/types";

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const FETCH_HEADERS = {
  "User-Agent": BROWSER_UA,
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  "Cache-Control": "no-cache",
};

// POST /api/ai/extract-style — Extract style from a website URL
export async function POST(req: NextRequest) {
  const { url } = await req.json();

  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  try {
    // Fetch the page HTML
    const resp = await fetch(url, {
      headers: FETCH_HEADERS,
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
    });

    if (!resp.ok) {
      return NextResponse.json(
        {
          error: `Could not reach site (HTTP ${resp.status})`,
          style: defaultStyle(),
          fallback: true,
        },
        { status: 200 }
      );
    }

    const html = await resp.text();

    // Build rich context for AI analysis
    const context = buildStyleContext(html, url);

    // Fetch up to 3 external CSS stylesheets for richer color/font data
    const cssUrls = extractCssUrls(html, url).slice(0, 3);
    const cssContents = await fetchExternalCss(cssUrls);
    const externalCss = cssContents.join("\n");

    // Extract styles using AI
    const { generateText } = await import("@/lib/ai");

    const prompt = `You are a design analyst. Analyze this website's visual style data and extract its design system.

METADATA & META TAGS:
${context.meta}

INLINE CSS & STYLE BLOCKS:
${context.inlineCss.slice(0, 6000)}

EXTERNAL CSS (from stylesheets):
${externalCss.slice(0, 6000)}

HTML BODY STRUCTURE (truncated):
${context.bodySnippet.slice(0, 4000)}

Instructions:
- Look at CSS custom properties (--primary, --background, etc.) for the actual color system
- Look at meta theme-color tags for brand colors
- Check font-family declarations, @font-face, and Google Fonts imports
- Identify the primary color palette: background, text, primary brand, secondary, accent
- Return ONLY valid JSON with this exact structure:

{
  "colors": ["#hex1", "#hex2", "#hex3", "#hex4", "#hex5"],
  "fonts": [{"family": "FontName", "usage": "heading"}, {"family": "FontName", "usage": "body"}],
  "layout": "brief layout description",
  "mood": "2-4 word mood description"
}

Rules:
- colors: 5-7 hex codes, ordered: background, text, primary, secondary, accent
- fonts: actual font families found (not generic fallbacks like sans-serif alone)
- Return ONLY the JSON object, no explanation, no code fences.`;

    let result = "";
    for await (const chunk of generateText(prompt, {
      model: "gpt-4o-mini",
      temperature: 0.2,
      maxTokens: 800,
    })) {
      result += chunk;
    }

    // Parse the AI response
    let style: ExtractedStyle;
    let fallback = false;
    try {
      style = parseAiJson(result);
      // Validate the parsed style has reasonable data
      if (!style.colors?.length || !style.fonts?.length) {
        throw new Error("Incomplete style data");
      }
    } catch {
      // Fallback: extract from raw HTML + CSS
      style = extractStyleFromHtmlAndCss(html, externalCss);
      fallback = true;
    }

    return NextResponse.json({ style, fallback });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";

    // Distinguish error types for the frontend
    const isTimeout =
      message.includes("timeout") || message.includes("abort");
    const isNetwork =
      message.includes("ENOTFOUND") ||
      message.includes("ECONNREFUSED") ||
      message.includes("fetch failed");

    let userError = "Failed to extract styles from this site.";
    if (isTimeout) userError = "Site took too long to respond.";
    else if (isNetwork) userError = "Could not connect to this site.";

    console.error("Style extraction failed:", message);

    return NextResponse.json({
      error: userError,
      style: defaultStyle(),
      fallback: true,
    });
  }
}

// ─── Helpers ──────────────────────────────────────────────

function defaultStyle(): ExtractedStyle {
  return {
    colors: ["#ffffff", "#f5f5f5", "#333333", "#0066cc", "#666666"],
    fonts: [{ family: "System default", usage: "body" }],
    layout: "Standard layout",
    mood: "Clean and modern",
  };
}

function parseAiJson(raw: string): ExtractedStyle {
  let json = raw.trim();
  // Strip markdown fences
  if (json.startsWith("```")) {
    json = json.replace(/^```\w*\n?/, "").replace(/\n?```$/, "");
  }
  // Find the JSON object if there's surrounding text
  const start = json.indexOf("{");
  const end = json.lastIndexOf("}");
  if (start !== -1 && end !== -1) {
    json = json.slice(start, end + 1);
  }
  return JSON.parse(json);
}

/** Extract key style-relevant data from HTML without sending the entire page */
function buildStyleContext(
  html: string,
  _url: string
): { meta: string; inlineCss: string; bodySnippet: string } {
  // Meta tags
  const metaTags: string[] = [];
  const metaRegex =
    /<meta\s[^>]*(?:name|property|content|charset)[^>]*>/gi;
  let m;
  while ((m = metaRegex.exec(html)) !== null) {
    metaTags.push(m[0]);
  }
  // theme-color
  const themeColor = html.match(
    /<meta[^>]*name=["']theme-color["'][^>]*>/i
  );
  if (themeColor) metaTags.push(themeColor[0]);

  // Title
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (title) metaTags.push(`<title>${title[1].trim()}</title>`);

  // Inline <style> blocks
  const styleBlocks: string[] = [];
  const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  while ((m = styleRegex.exec(html)) !== null) {
    styleBlocks.push(m[1].trim());
  }

  // Inline style attributes (grab a sample)
  const inlineStyles: string[] = [];
  const attrRegex = /style="([^"]{10,})"/gi;
  let count = 0;
  while ((m = attrRegex.exec(html)) !== null && count < 20) {
    inlineStyles.push(m[1]);
    count++;
  }

  // Body snippet: first chunk of body content
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)/i);
  const bodySnippet = bodyMatch ? bodyMatch[1].slice(0, 5000) : html.slice(0, 5000);

  return {
    meta: metaTags.join("\n"),
    inlineCss:
      styleBlocks.join("\n\n") +
      (inlineStyles.length
        ? "\n\n/* Inline styles sample */\n" + inlineStyles.join(";\n")
        : ""),
    bodySnippet,
  };
}

/** Extract stylesheet URLs from <link> tags */
function extractCssUrls(html: string, baseUrl: string): string[] {
  const urls: string[] = [];
  const linkRegex =
    /<link[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi;
  const linkRegex2 =
    /<link[^>]*href=["']([^"']+)["'][^>]*rel=["']stylesheet["'][^>]*>/gi;

  for (const regex of [linkRegex, linkRegex2]) {
    let m;
    while ((m = regex.exec(html)) !== null) {
      try {
        const resolved = new URL(m[1], baseUrl).href;
        if (!urls.includes(resolved)) urls.push(resolved);
      } catch {
        // Skip invalid URLs
      }
    }
  }

  // Also check for Google Fonts links
  const gfRegex = /href=["'](https:\/\/fonts\.googleapis\.com\/[^"']+)["']/gi;
  let m;
  while ((m = gfRegex.exec(html)) !== null) {
    if (!urls.includes(m[1])) urls.push(m[1]);
  }

  return urls;
}

/** Fetch external CSS files, with timeout and size limits */
async function fetchExternalCss(urls: string[]): Promise<string[]> {
  const results = await Promise.allSettled(
    urls.map(async (cssUrl) => {
      const resp = await fetch(cssUrl, {
        headers: { "User-Agent": BROWSER_UA },
        signal: AbortSignal.timeout(5000),
      });
      if (!resp.ok) return "";
      const text = await resp.text();
      // Limit each file to 10KB to avoid overwhelming the AI
      return text.slice(0, 10000);
    })
  );

  return results
    .filter(
      (r): r is PromiseFulfilledResult<string> => r.status === "fulfilled"
    )
    .map((r) => r.value)
    .filter(Boolean);
}

/** Robust fallback extraction from HTML + CSS text */
function extractStyleFromHtmlAndCss(
  html: string,
  css: string
): ExtractedStyle {
  const combined = html + "\n" + css;
  const colors = new Set<string>();

  // CSS custom properties that look like colors
  const varRegex =
    /--[\w-]*(?:color|bg|background|primary|secondary|accent|brand|surface|text|border|foreground)[\w-]*\s*:\s*([^;]+)/gi;
  let m;
  while ((m = varRegex.exec(combined)) !== null) {
    const val = m[1].trim();
    if (val.match(/^#[0-9a-fA-F]{3,8}$/)) colors.add(val);
  }

  // Hex colors
  const hexRegex = /#[0-9a-fA-F]{6}\b/g;
  while ((m = hexRegex.exec(combined)) !== null) {
    colors.add(m[0]);
  }
  // 3-digit hex (less common but valid)
  const hex3Regex = /#[0-9a-fA-F]{3}\b(?![0-9a-fA-F])/g;
  while ((m = hex3Regex.exec(combined)) !== null) {
    colors.add(m[0]);
  }

  // rgb/rgba colors — convert to hex
  const rgbRegex = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/g;
  while ((m = rgbRegex.exec(combined)) !== null) {
    const hex = rgbToHex(+m[1], +m[2], +m[3]);
    colors.add(hex);
  }

  // theme-color meta
  const themeMatch = combined.match(
    /<meta[^>]*name=["']theme-color["'][^>]*content=["']([^"']+)["']/i
  );
  if (themeMatch) colors.add(themeMatch[1]);

  // Deduplicate and pick a reasonable palette
  const uniqueColors = deduplicateColors([...colors]).slice(0, 7);

  // Fonts
  const fonts = new Map<string, string>();

  // @font-face
  const fontFaceRegex = /font-family:\s*['"]?([^'";,}]+)/gi;
  while ((m = fontFaceRegex.exec(combined)) !== null) {
    const family = m[1].trim();
    if (family && !isGenericFont(family) && !fonts.has(family)) {
      fonts.set(family, "body");
    }
  }

  // Google Fonts URL parsing
  const gfMatch = combined.match(
    /fonts\.googleapis\.com\/css2?\?family=([^"'&]+)/i
  );
  if (gfMatch) {
    const families = decodeURIComponent(gfMatch[1]).split("|");
    for (const f of families) {
      const name = f.split(":")[0].replace(/\+/g, " ");
      if (name && !fonts.has(name)) fonts.set(name, "body");
    }
  }

  const fontList = [...fonts.entries()].slice(0, 4).map(([family], i) => ({
    family,
    usage: i === 0 ? "heading" : "body",
  }));

  return {
    colors:
      uniqueColors.length >= 2
        ? uniqueColors
        : ["#ffffff", "#333333", "#0066cc"],
    fonts:
      fontList.length > 0
        ? fontList
        : [{ family: "System default", usage: "body" }],
    layout: "Standard layout",
    mood: "Modern",
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, "0"))
      .join("")
  );
}

function isGenericFont(name: string): boolean {
  const generics = [
    "serif",
    "sans-serif",
    "monospace",
    "cursive",
    "fantasy",
    "system-ui",
    "ui-serif",
    "ui-sans-serif",
    "ui-monospace",
    "inherit",
    "initial",
    "unset",
  ];
  return generics.includes(name.toLowerCase());
}

/** Remove near-duplicate colors (e.g. #fff and #ffffff) */
function deduplicateColors(colors: string[]): string[] {
  const normalized = colors.map((c) => {
    let hex = c.toLowerCase();
    // Expand 3-digit hex
    if (/^#[0-9a-f]{3}$/.test(hex)) {
      hex = `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
    }
    return hex;
  });

  const seen = new Set<string>();
  const result: string[] = [];
  for (const c of normalized) {
    if (!seen.has(c)) {
      seen.add(c);
      result.push(c);
    }
  }
  return result;
}
