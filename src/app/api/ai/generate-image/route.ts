import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST /api/ai/generate-image — Generate an image using AI
export async function POST(req: NextRequest) {
  const { prompt, model, siteId } = await req.json();

  if (!prompt || !model) {
    return NextResponse.json(
      { error: "prompt and model are required" },
      { status: 400 }
    );
  }

  try {
    const { generateImage, estimateImageCost, getModel } = await import(
      "@/lib/ai"
    );

    const imageUrl = await generateImage(prompt, { model });
    const costCents = estimateImageCost(model);

    // Log usage
    try {
      const site = siteId
        ? await db.site.findUnique({
            where: { id: siteId },
            select: { userId: true },
          })
        : null;
      const userId = site?.userId ?? (await db.user.findFirst())?.id;

      if (userId) {
        const modelInfo = getModel(model);
        await db.usageRecord.create({
          data: {
            userId,
            provider: modelInfo?.provider ?? "unknown",
            model,
            inputTokens: 0,
            outputTokens: 0,
            costCents,
            action: "generate_image",
          },
        });
      }
    } catch (logError) {
      console.error("Failed to log image usage:", logError);
    }

    return NextResponse.json({ imageUrl, costCents, model });
  } catch (error) {
    console.error("Image generation failed:", error);
    return NextResponse.json(
      { error: "Image generation failed" },
      { status: 500 }
    );
  }
}
