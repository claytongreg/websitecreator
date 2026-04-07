import { NextRequest, NextResponse } from "next/server";
import type { ExtractedStyle } from "@/types";

// POST /api/ai/extract-style — Extract style from a website URL
export async function POST(req: NextRequest) {
  const { url } = await req.json();

  try {
    // Fetch the page HTML
    const resp = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; EchoWebo/1.0; +https://echowebo.com)",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    const html = await resp.text();

    // Extract styles using AI
    const { generateText } = await import("@/lib/ai");

    const prompt = `Analyze this website HTML and extract its visual style. Return a JSON object with:
- colors: array of 5-7 hex color codes representing the main palette (background, text, primary, secondary, accent)
- fonts: array of objects with "family" and "usage" (e.g., "heading", "body")
- layout: brief description of the layout pattern (e.g., "hero section with cards grid below")
- mood: 2-4 word mood description (e.g., "warm and artisanal")

HTML (truncated to first 5000 chars):
${html.slice(0, 5000)}

Return ONLY valid JSON, no explanation or code fences.`;

    let result = "";
    for await (const chunk of generateText(prompt, {
      model: "gpt-4o-mini",
      temperature: 0.3,
      maxTokens: 1000,
    })) {
      result += chunk;
    }

    // Parse the AI response
    let style: ExtractedStyle;
    try {
      // Clean up potential markdown fences
      let json = result.trim();
      if (json.startsWith("```")) {
        json = json.replace(/^```\w*\n?/, "").replace(/\n?```$/, "");
      }
      style = JSON.parse(json);
    } catch {
      // Fallback extraction from HTML
      style = extractStyleFromHtml(html);
    }

    return NextResponse.json({ style });
  } catch (error) {
    console.error("Style extraction failed:", error);
    // Return a basic fallback
    return NextResponse.json({
      style: {
        colors: ["#ffffff", "#f5f5f5", "#333333", "#0066cc", "#666666"],
        fonts: [{ family: "System default", usage: "body" }],
        layout: "Standard layout",
        mood: "Clean and modern",
      } satisfies ExtractedStyle,
    });
  }
}

function extractStyleFromHtml(html: string): ExtractedStyle {
  // Basic regex-based extraction as fallback
  const colorMatches = html.match(/#[0-9a-fA-F]{3,6}/g) ?? [];
  const uniqueColors = [...new Set(colorMatches)].slice(0, 7);

  const fontMatches =
    html.match(/font-family:\s*['"]?([^'";,]+)/gi) ?? [];
  const fonts = [...new Set(fontMatches)].slice(0, 3).map((f) => ({
    family: f.replace(/font-family:\s*['"]?/i, "").trim(),
    usage: "body",
  }));

  return {
    colors: uniqueColors.length > 0 ? uniqueColors : ["#ffffff", "#333333"],
    fonts: fonts.length > 0 ? fonts : [{ family: "System default", usage: "body" }],
    layout: "Standard layout",
    mood: "Modern",
  };
}
