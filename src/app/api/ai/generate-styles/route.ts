import { NextRequest, NextResponse } from "next/server";
import type { InspirationSite, StyleOption } from "@/types";

// POST /api/ai/generate-styles — Generate 3 style options for the onboarding wizard
export async function POST(req: NextRequest) {
  const { inspirations, description, businessType } = (await req.json()) as {
    inspirations: InspirationSite[];
    description: string;
    businessType: string;
  };

  // Build context from inspiration sites
  const inspirationContext =
    inspirations.length > 0
      ? inspirations
          .map(
            (s) =>
              `- ${s.url}: colors [${s.style.colors.join(", ")}], fonts [${s.style.fonts.map((f) => f.family).join(", ")}], mood: ${s.style.mood}`
          )
          .join("\n")
      : "No reference sites provided.";

  const prompt = `You are a professional web designer. Based on the following brief, generate exactly 3 distinct style options for a website.

BUSINESS DESCRIPTION: ${description}
BUSINESS TYPE: ${businessType || "General"}

INSPIRATION SITES:
${inspirationContext}

For each style option, provide:
- id: a kebab-case identifier (e.g. "warm-earth")
- name: a short human-readable name (2-3 words)
- colors: exactly 5 hex color codes [background, surface, text, primary/accent, secondary]
- fonts: an object with "heading" and "body" font family names (use Google Fonts that exist)
- mood: a 3-5 word mood description

The 3 options should be meaningfully different from each other — vary the color temperature, contrast level, and personality. At least one should be light, one could be dark or bold.

If inspiration sites were provided, use their palettes as influence but don't copy them exactly.

Return ONLY a JSON array of 3 objects. No explanation, no markdown fences.

Example format:
[
  {"id":"warm-minimal","name":"Warm Minimal","colors":["#faf8f5","#f0ebe4","#2d2a26","#c67b3c","#8b7355"],"fonts":{"heading":"Playfair Display","body":"Source Sans Pro"},"mood":"Warm, clean, artisanal"},
  ...
]`;

  try {
    const { generateText } = await import("@/lib/ai");

    let result = "";
    for await (const chunk of generateText(prompt, {
      model: "gpt-4o-mini",
      temperature: 0.8,
      maxTokens: 1500,
    })) {
      result += chunk;
    }

    // Parse the JSON response
    let options: StyleOption[];
    try {
      let json = result.trim();
      // Strip markdown fences if present
      if (json.startsWith("```")) {
        json = json.replace(/^```\w*\n?/, "").replace(/\n?```$/, "");
      }
      options = JSON.parse(json);
    } catch {
      // If parsing fails, return fallback styles
      options = getFallbackStyles(description, businessType);
    }

    // Validate and ensure we have 3 options
    if (!Array.isArray(options) || options.length === 0) {
      options = getFallbackStyles(description, businessType);
    }

    return NextResponse.json({ options });
  } catch (error) {
    console.error("Style generation failed:", error);
    return NextResponse.json({
      options: getFallbackStyles(description, businessType),
    });
  }
}

function getFallbackStyles(
  _description: string,
  _businessType: string
): StyleOption[] {
  return [
    {
      id: "modern-light",
      name: "Modern Light",
      colors: ["#ffffff", "#f8f9fa", "#212529", "#0d6efd", "#6c757d"],
      fonts: { heading: "Inter", body: "Inter" },
      mood: "Clean, professional, contemporary",
    },
    {
      id: "warm-earth",
      name: "Warm Earth",
      colors: ["#faf6f1", "#e8ddd3", "#3d2b1f", "#c67b3c", "#8b6f47"],
      fonts: { heading: "Playfair Display", body: "Source Sans Pro" },
      mood: "Warm, artisanal, inviting",
    },
    {
      id: "dark-bold",
      name: "Dark & Bold",
      colors: ["#0a0a0a", "#1a1a2e", "#e0e0e0", "#e94560", "#533483"],
      fonts: { heading: "Space Grotesk", body: "DM Sans" },
      mood: "Bold, dramatic, high-contrast",
    },
  ];
}
