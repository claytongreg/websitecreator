import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST /api/ai/generate — Generate or edit HTML using AI
export async function POST(req: NextRequest) {
  const { prompt, model, siteId, currentHtml, selectedElement, screenshot, editMode, elementHtml, context } = await req.json();

  const isElementMode = editMode === "element" && elementHtml;

  // Build the system prompt based on edit mode
  const systemPrompt = isElementMode
    ? `You are an expert web developer. The user is editing a single HTML element in a visual website editor.
You will receive the element's HTML and optionally a page structure skeleton for style context.

Rules:
- Return ONLY the modified element HTML fragment (NOT a full document — no <!DOCTYPE>, <html>, <head>, or <body> tags)
- Do NOT include any explanation, markdown, or code fences
- Keep the element's structure intact unless the user specifically asks to change it
- Use Tailwind CSS classes for styling
- Ensure the HTML is valid and well-formed
- Make the minimum changes necessary to fulfill the request
- Be creative and make it look professional${screenshot ? "\n- The user has attached a screenshot for visual reference" : ""}`
    : `You are an expert web developer. The user is editing a website using a visual editor.
You will receive the current page HTML and optionally a selected element. Your job is to modify the HTML
according to the user's natural language instruction.

Rules:
- Return ONLY the complete modified HTML document (from <!DOCTYPE html> to </html>)
- Do NOT include any explanation, markdown, or code fences
- Keep all existing content intact unless the user specifically asks to change it
- Use Tailwind CSS classes for styling (the page loads Tailwind from CDN)
- Ensure the HTML is valid and well-formed
- Make the minimum changes necessary to fulfill the request
- Be creative and make it look professional${screenshot ? "\n- The user has attached a screenshot of the current page for visual reference. Use it to understand the layout and appearance." : ""}`;

  try {
    // Dynamic import to trigger provider registration
    const { generateText, estimateCost, getModel } = await import("@/lib/ai");
    const modelInfo = getModel(model);

    // Build user prompt based on mode
    let userPrompt: string;
    if (isElementMode) {
      userPrompt = `Element to edit (${selectedElement?.tagName ?? "element"}):\n\`\`\`html\n${elementHtml}\n\`\`\``;
      if (context) {
        userPrompt += `\n\nPage structure (for style context only — do NOT return a full page):\n\`\`\`html\n${context}\n\`\`\``;
      }
      userPrompt += `\n\nUser request: "${prompt}"\n\nReturn only the modified element HTML fragment.`;
    } else {
      const htmlInput = currentHtml ?? "";
      userPrompt = selectedElement
        ? `Current page HTML:\n\`\`\`html\n${htmlInput}\n\`\`\`\n\nSelected element (CSS path: ${selectedElement.path}):\n\`\`\`html\n${selectedElement.outerHTML}\n\`\`\`\n\nUser request: "${prompt}"\n\nModify the HTML to fulfill this request. Focus changes on the selected element. Return the complete modified HTML document.`
        : `Current page HTML:\n\`\`\`html\n${htmlInput}\n\`\`\`\n\nUser request: "${prompt}"\n\nModify the HTML to fulfill this request. Return the complete modified HTML document.`;
    }

    // Groq free tier has a 12K TPM limit — reject if too large
    let maxTokens = modelInfo?.maxTokens ?? 8192;
    if (modelInfo?.provider === "groq") {
      const TOKEN_BUDGET = 12000;
      const RESERVED_OUTPUT = 4096;
      const estimatedInput = Math.ceil((systemPrompt.length + userPrompt.length) / 4);
      const estimatedTotal = estimatedInput + RESERVED_OUTPUT;
      if (estimatedTotal > TOKEN_BUDGET) {
        return NextResponse.json(
          { error: "Page is too large for this free model. Switch to GPT-4o, Claude, or Gemini for larger pages." },
          { status: 400 }
        );
      }
      maxTokens = RESERVED_OUTPUT;
    }

    let result = "";
    for await (const chunk of generateText(userPrompt, {
      model,
      systemPrompt,
      temperature: 0.3,
      maxTokens,
      ...(screenshot ? { images: [screenshot] } : {}),
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

    // Log usage to database
    try {
      const site = siteId
        ? await db.site.findUnique({ where: { id: siteId }, select: { userId: true } })
        : null;
      const userId = site?.userId ?? (await db.user.findFirst())?.id;

      if (userId) {
        await db.usageRecord.create({
          data: {
            userId,
            provider: modelInfo?.provider ?? "unknown",
            model,
            inputTokens,
            outputTokens,
            costCents,
            action: selectedElement ? "edit_element" : "edit_page",
          },
        });
      }
    } catch (logError) {
      console.error("Failed to log usage:", logError);
    }

    return NextResponse.json({
      html,
      editMode: isElementMode ? "element" : "page",
      inputTokens,
      outputTokens,
      costCents,
      model,
    });
  } catch (error) {
    console.error("AI generation failed:", error);
    const message =
      error instanceof Error ? error.message : "AI generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
