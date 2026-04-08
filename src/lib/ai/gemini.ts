import { GoogleGenAI } from "@google/genai";
import type { AIProvider, GenerateOptions, ImageOptions } from "@/types";
import { registerProvider } from "./provider";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY ?? "" });

const geminiProvider: AIProvider = {
  id: "gemini",
  name: "Google Gemini",
  models: [
    {
      id: "gemini-2.0-flash",
      name: "Gemini 2.0 Flash",
      provider: "gemini",
      capabilities: ["text", "code"],
      inputCostPer1k: 0.01,
      outputCostPer1k: 0.04,
      maxTokens: 16384,
    },
    {
      id: "gemini-2.0-pro",
      name: "Gemini 2.0 Pro",
      provider: "gemini",
      capabilities: ["text", "code"],
      inputCostPer1k: 0.125,
      outputCostPer1k: 0.5,
      maxTokens: 16384,
    },
    {
      id: "imagen-4.0-generate-001",
      name: "Imagen 4.0",
      provider: "gemini",
      capabilities: ["image"],
      inputCostPer1k: 0,
      outputCostPer1k: 0,
      imageCostCents: 4,
      maxTokens: 0,
    },
    {
      id: "gemini-2.5-flash-image",
      name: "Gemini 2.5 Flash Image",
      provider: "gemini",
      capabilities: ["image"],
      inputCostPer1k: 0,
      outputCostPer1k: 0,
      imageCostCents: 1,
      maxTokens: 0,
    },
  ],

  async *generateText(prompt: string, options: GenerateOptions) {
    const userParts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
      { text: prompt },
      ...(options.images ?? []).map((dataUrl) => {
        const match = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
        return {
          inlineData: {
            mimeType: match?.[1] ?? "image/png",
            data: match?.[2] ?? dataUrl,
          },
        };
      }),
    ];

    const response = await ai.models.generateContentStream({
      model: options.model,
      contents: [
        ...(options.systemPrompt
          ? [{ role: "model" as const, parts: [{ text: options.systemPrompt }] }]
          : []),
        { role: "user" as const, parts: userParts },
      ],
      config: {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxTokens ?? 4096,
      },
    });

    for await (const chunk of response) {
      const text = chunk.text;
      if (text) yield text;
    }
  },

  async generateImage(prompt: string, options: ImageOptions) {
    // Primary: Imagen 4.0
    if (options.model === "imagen-4.0-generate-001") {
      const response = await ai.models.generateImages({
        model: "imagen-4.0-generate-001",
        prompt,
        config: {
          numberOfImages: 1,
        },
      });
      const image = response.generatedImages?.[0];
      if (image?.image?.imageBytes) {
        return `data:image/png;base64,${image.image.imageBytes}`;
      }
      throw new Error("No image generated from Imagen 4.0");
    }

    // Fallback: Gemini 2.5 Flash Image via generateContent
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: prompt,
      config: {
        responseModalities: ["IMAGE", "TEXT"],
      },
    });

    const parts = response.candidates?.[0]?.content?.parts ?? [];
    for (const part of parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image generated from Gemini Flash");
  },
};

registerProvider(geminiProvider);

export default geminiProvider;
