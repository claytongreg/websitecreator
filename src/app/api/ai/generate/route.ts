import { NextRequest, NextResponse } from "next/server";

// POST /api/ai/generate — Generate or edit HTML using AI
export async function POST(req: NextRequest) {
  const { prompt, model, currentHtml, selectedElement } = await req.json();

  // Build the system prompt for HTML editing
  const systemPrompt = `You are an expert web developer. The user is editing a website using a visual editor.
You will receive the current page HTML and optionally a selected element. Your job is to modify the HTML
according to the user's natural language instruction.

Rules:
- Return ONLY the complete modified HTML document (from <!DOCTYPE html> to </html>)
- Do NOT include any explanation, markdown, or code fences
- Keep all existing content intact unless the user specifically asks to change it
- Use Tailwind CSS classes for styling (the page loads Tailwind from CDN)
- Ensure the HTML is valid and well-formed
- Make the minimum changes necessary to fulfill the request
- Be creative and make it look professional`;

  const userPrompt = selectedElement
    ? `Current page HTML:
\`\`\`html
${currentHtml}
\`\`\`

Selected element (CSS path: ${selectedElement.path}):
\`\`\`html
${selectedElement.outerHTML}
\`\`\`

User request: "${prompt}"

Modify the HTML to fulfill this request. Focus changes on the selected element. Return the complete modified HTML document.`
    : `Current page HTML:
\`\`\`html
${currentHtml}
\`\`\`

User request: "${prompt}"

Modify the HTML to fulfill this request. Return the complete modified HTML document.`;

  try {
    // Dynamic import to trigger provider registration
    const { generateText, estimateCost } = await import("@/lib/ai");

    let result = "";
    for await (const chunk of generateText(userPrompt, {
      model,
      systemPrompt,
      temperature: 0.3,
      maxTokens: 8192,
    })) {
      result += chunk;
    }

    // Clean up the result — strip markdown fences if AI added them
    let html = result.trim();
    if (html.startsWith("```html")) {
      html = html.slice(7);
    }
    if (html.startsWith("```")) {
      html = html.slice(3);
    }
    if (html.endsWith("```")) {
      html = html.slice(0, -3);
    }
    html = html.trim();

    // Rough token estimation (4 chars ≈ 1 token)
    const inputTokens = Math.ceil((systemPrompt.length + userPrompt.length) / 4);
    const outputTokens = Math.ceil(html.length / 4);
    const costCents = estimateCost(model, inputTokens, outputTokens);

    // TODO: Log usage to database

    return NextResponse.json({
      html,
      inputTokens,
      outputTokens,
      costCents,
      model,
    });
  } catch (error) {
    console.error("AI generation failed:", error);
    return NextResponse.json(
      { error: "AI generation failed" },
      { status: 500 }
    );
  }
}
